import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { Session } from '../dist/session/index.js';
import { createHandler, createWebHandler } from '../dist/session/server.js';

async function fixture(t) {
  const root = await mkdtemp(new URL('../fixtures/.burst-', import.meta.url).pathname);
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../fixtures/spacing', import.meta.url), root, { recursive: true });
  await mkdir(join(root, 'src/bulk'));
  await Promise.all(Array.from({ length: 1000 }, (_, i) => writeFile(join(root, `src/bulk/File${i}.tsx`),
    `export const Item${i} = () => (\n<div className="gap-[13px]" />\n);`)));
  return root;
}
test('1000-file Session: 300 overlapping reads share reconciliation and leave health responsive', { timeout: 30000 }, async t => {
  const root = await fixture(t);
  const session = await Session.create({ root, watch: false, readQueueMs: 5000 }); t.after(() => session.close());
  const server = createServer(createHandler(session));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const health = `http://127.0.0.1:${server.address().port}/__plumb/health`;
  await fetch(health).then(r => r.json());
  const calls = Array.from({ length: 30 }, (_, i) => {
    const file = `src/bulk/File${Math.floor(i / 3)}.tsx`;
    if (i % 3 === 0) return () => session.site(file, 2, 1);
    if (i % 3 === 1) return () => session.resolveSource(file, 2, 1, { tag: 'div', snapshot: true });
    return () => session.edits(file, 2, 1);
  });
  const sequential = [];
  for (const call of calls) sequential.push(await call());
  // An unrelated save must not change results at queried sites.
  await writeFile(join(root, 'src/bulk/File999.tsx'), 'export const Item999 = () => <div className="gap-[17px]" />;');
  const reconciliations = (await session.health()).work.reconciliations;
  const start = performance.now();
  const burst = Promise.all(Array.from({ length: 300 }, (_, i) => calls[i % calls.length]().then(value => {
    assert.deepEqual(value, sequential[i % calls.length]);
  })));
  await delay(5);
  for (let i = 0; i < 3; i++) {
    const at = performance.now(), response = await fetch(health), value = await response.json();
    assert.equal(response.status, 200); assert.equal(value.status, 'ready');
    assert.ok(performance.now() - at < 50, `health blocked ${performance.now() - at}ms`);
  }
  await burst;
  assert.ok((await session.health()).work.reconciliations - reconciliations <= 2, 'burst uses at most two overlapping cohorts, not 300 reconciliations');
  assert.ok(performance.now() - start < 5000, `burst took ${performance.now() - start}ms`);
  assert.ok((await session.site('src/bulk/File999.tsx', 1)).declarations.some(d => d.value === '17px'));
});

test('expired read admission returns busy on Node and Web routes, while health bypasses admission', async t => {
  const root = await mkdtemp(new URL('../fixtures/.busy-', import.meta.url).pathname);
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../fixtures/spacing', import.meta.url), root, { recursive: true });
  const session = await Session.create({ root, watch: false, readQueueMs: 0 }); t.after(() => session.close());
  const server = createServer(createHandler(session)); await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}/__plumb/`;
  const response = await fetch(base + 'site?file=src/App.tsx&line=1');
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { status: 'busy' });
  const web = createWebHandler(session, { peerAddress: '127.0.0.1' });
  const expired = await web(new Request(base + 'resolve?source=src/App.tsx'));
  assert.equal(expired.status, 503); assert.deepEqual(await expired.json(), { status: 'busy' });
  assert.equal((await fetch(base + 'health')).status, 200);
  assert.equal((await web(new Request(base + 'health'))).status, 200);
});

test('positive queue budget expires during real configuration reload and recovers afterwards', async t => {
  const root = await mkdtemp(new URL('../fixtures/.busy-reload-', import.meta.url).pathname);
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../fixtures/spacing', import.meta.url), root, { recursive: true });
  const config = join(root, 'reload.config.mjs');
  await writeFile(config, 'export default { css: "src/styles.css" };');
  const session = await Session.create({ root, config, watch: false, readQueueMs: 50 }); t.after(() => session.close());
  const web = createWebHandler(session, { peerAddress: '127.0.0.1' });
  const base = 'http://127.0.0.1/__plumb/';
  const original = await session.site('src/App.tsx', 1);
  // Real config module evaluation stalls the analysis worker, not the host.
  await writeFile(config, 'await new Promise(resolve => setTimeout(resolve, 300)); export default { css: "src/styles.css" };');
  const reload = session.refresh();
  const at = performance.now(), waiting = web(new Request(base + 'site?file=src/App.tsx&line=1'));
  const healthAt = performance.now(), health = await web(new Request(base + 'health'));
  assert.equal(health.status, 200); assert.ok(performance.now() - healthAt < 50);
  const expired = await waiting;
  assert.equal(expired.status, 503); assert.deepEqual(await expired.json(), { status: 'busy' });
  assert.ok(performance.now() - at < 250, 'expired read must not wait for config evaluation');
  await reload;
  assert.deepEqual(await session.site('src/App.tsx', 1), original);
});

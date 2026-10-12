import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { fork } from 'node:child_process';
import { once } from 'node:events';
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
  const calls = Array.from({ length: 40 }, (_, i) => {
    const file = `src/bulk/File${Math.floor(i / 4)}.tsx`;
    if (i % 4 === 0) return () => session.site(file, 2, 1);
    if (i % 4 === 1) return () => session.resolveSource(file, 2, 1, { tag: 'div', snapshot: true });
    if (i % 4 === 2) return () => session.edits(file, 2, 1);
    return () => session.classes(file, 2, 1, 'gap-[13px]');
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

test('HTTP: health stays under 100ms during 300 large site/edits reads, preserving Node/Web JSON bytes', { timeout: 60000 }, async t => {
  const root = await fixture(t);
  const classes = Array.from({ length: 128 }, (_, i) => `gap-[${(13 + i / 1000).toFixed(3)}px]`).join(' ');
  await writeFile(join(root, 'src/bulk/Large.tsx'), `export const Large = () => (\n<div className="${classes}" />\n);`);
  const child = fork(new URL('./helpers/session-http-host.mjs', import.meta.url), [root], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let errors = '', id = 0;
  child.stderr.on('data', chunk => { errors += chunk; });
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    child.on('message', message => {
      if (message.ready) resolve(message.origin);
      else {
        const call = pending.get(message.id); pending.delete(message.id);
        if (message.error) call?.reject(new Error(message.error)); else call?.resolve(message.result);
      }
    });
    child.on('error', reject);
    child.on('exit', code => {
      const error = new Error(`HTTP host exited (${code}): ${errors}`);
      reject(error); for (const call of pending.values()) call.reject(error); pending.clear();
    });
  });
  const command = (type, values = {}) => new Promise((resolve, reject) => {
    const request = ++id; pending.set(request, { resolve, reject }); child.send({ id: request, type, ...values });
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.send({ type: 'close' }); await exited; }
    assert.equal(errors, '');
  });
  const origin = await ready;
  const queries = ['site', 'edits'].map(method => ({ method, args: ['src/bulk/Large.tsx', 2, 1],
    route: `/__plumb/${method}?file=src/bulk/Large.tsx&line=2&column=1` }));
  queries.push(
    { method: 'classes', args: ['src/bulk/Large.tsx', 2, 1, 'gap-[13.000px]'], route: '/__plumb/classes?file=src/bulk/Large.tsx&line=2&column=1&classes=gap-[13.000px]' },
    { method: 'resolveSource', args: ['src/bulk/Large.tsx', 2, 1], route: '/__plumb/resolve?source=src/bulk/Large.tsx&line=2&column=1' },
    { method: 'report', args: [], route: '/__plumb/report' },
    { method: 'decisions', args: [], route: '/__plumb/decisions' },
    { method: 'why', args: ['src/bulk/Large.tsx', 2], route: '/__plumb/why?file=src/bulk/Large.tsx&line=2' },
  );
  const baseline = await command('baseline', { queries });
  for (const [i, result] of baseline.entries()) {
    if (i < 2) {
      assert.equal(result.object, true, 'programmatic Session reads still return objects');
      assert.ok(Buffer.byteLength(result.body) > 65536, 'each burst read carries at least 64 KiB');
    }
    assert.equal(result.web, result.body, 'Web response matches programmatic JSON byte for byte');
    const response = await fetch(origin + queries[i].route);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), result.body, 'Node response matches programmatic JSON byte for byte');
  }
  await fetch(origin + '/__plumb/health').then(response => response.text());
  if (process.env.PLUMB_BURST_PROFILE) await command('profile-start');
  let settled = 0;
  const burst = Promise.all(Array.from({ length: 300 }, (_, i) => fetch(origin + queries[i % 2].route)
    .then(async response => {
      assert.equal(response.status, 200);
      assert.equal(await response.text(), baseline[i % 2].body);
    }).finally(() => { settled++; })));
  // Attach rejection handler while probes run; still await the complete burst below.
  burst.catch(() => {});
  const probes = [];
  for (let i = 0; i < 3; i++) {
    const outstanding = 300 - settled, start = performance.now();
    const response = await fetch(origin + '/__plumb/health'), body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.status, 'ready');
    probes.push({ ms: performance.now() - start, outstanding });
    if (i < 2) await delay(5);
  }
  await burst;
  if (process.env.PLUMB_BURST_PROFILE) await command('profile-stop', { path: process.env.PLUMB_BURST_PROFILE });
  t.diagnostic(JSON.stringify({ bytes: baseline.slice(0, 2).map(result => Buffer.byteLength(result.body)), probes }));
  assert.ok(probes.every(probe => probe.outstanding > 0), 'all health probes overlap reads');
  for (const probe of probes) assert.ok(probe.ms < 100, `health blocked ${probe.ms.toFixed(2)}ms with ${probe.outstanding} reads outstanding`);
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
  for (const classes of [await fetch(base + 'classes?file=src/App.tsx&line=1&column=1&classes=gap-[13px]'),
    await web(new Request(base + 'classes?file=src/App.tsx&line=1&column=1&classes=gap-[13px]'))]) {
    assert.equal(classes.status, 503); assert.equal(classes.headers.get('Retry-After'), '1');
    assert.deepEqual(await classes.json(), { status: 'busy' });
  }
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

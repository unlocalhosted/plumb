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
import { startEventLoopMeasurement, finishEventLoopMeasurement } from './helpers/event-loop.mjs';

async function fixture(t) {
  const root = await mkdtemp(new URL('../fixtures/.burst-', import.meta.url).pathname);
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../fixtures/spacing', import.meta.url), root, { recursive: true });
  await mkdir(join(root, 'src/bulk'));
  await Promise.all(Array.from({ length: 1000 }, (_, i) => writeFile(join(root, `src/bulk/File${i}.tsx`),
    `export const Item${i} = () => (\n<div className="gap-[13px]" />\n);`)));
  return root;
}

// a busy answer carries its code beside its status, like every refusal (docs/invariants/api-contract.md)
test('expired read admission returns busy on Node and Web routes, while health bypasses admission', async t => {
  const root = await mkdtemp(new URL('../fixtures/.busy-', import.meta.url).pathname);
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../fixtures/spacing', import.meta.url), root, { recursive: true });
  const session = await Session.create({ root, watch: false, readQueueMs: 0 }); t.after(() => session.close());
  const server = createServer(createHandler(session)); await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}/__plumb/`;
  const response = await fetch(base + 'site?file=src/App.tsx&line=1');
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { status: 'busy', code: 'busy' });
  const web = createWebHandler(session, { peerAddress: '127.0.0.1' });
  const expired = await web(new Request(base + 'resolve?source=src/App.tsx'));
  assert.equal(expired.status, 503); assert.deepEqual(await expired.json(), { status: 'busy', code: 'busy' });
  for (const classes of [await fetch(base + 'classes?file=src/App.tsx&line=1&column=1&classes=gap-[13px]'),
    await web(new Request(base + 'classes?file=src/App.tsx&line=1&column=1&classes=gap-[13px]'))]) {
    assert.equal(classes.status, 503); assert.equal(classes.headers.get('Retry-After'), '1');
    assert.deepEqual(await classes.json(), { status: 'busy', code: 'busy' });
  }
  assert.equal((await fetch(base + 'health')).status, 200);
  assert.equal((await web(new Request(base + 'health'))).status, 200);
});

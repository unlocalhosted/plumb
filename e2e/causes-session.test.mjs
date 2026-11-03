// Causes through the session server's HTTP API, the way the overlay and the project page ask for them: the same
// model `plumber check --json` prints, answered by GET /__plumb/causes, and a cause's `fixes` taken in one request
// by the existing POST apply-all.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serve } from '../dist/session/server.js';
import { check, project } from './helpers/causes-project.mjs';

async function api(t, root) {
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  return async (method, params = {}, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
}
const summary = (causes) => causes.map(c => ({ id: c.id, count: c.count, rendersNothing: c.rendersNothing, suggestion: c.suggestion?.name, fixes: c.fixes }));

test('GET causes answers with the same causes the CLI prints, white first among them as one', { timeout: 90000 }, async (t) => {
  const root = await project(t);
  const call = await api(t, root);
  const answer = await call('causes');
  assert.equal(answer.status, 200, JSON.stringify(answer.body));
  assert.ok(Array.isArray(answer.body), JSON.stringify(answer.body).slice(0, 200));
  const white = answer.body.find(c => c.id === 'value:color:#ffffff');
  assert.equal(white.count, 6); assert.equal(white.rendersNothing, 2); assert.equal(white.suggestion.name, 'on-accent');
  assert.deepEqual(summary(answer.body), summary(check(root).causes));
});

test('a cause is taken in one request: its fixes go to apply-all, the dead class and the copies move to on-accent together, in one request', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const call = await api(t, root);
  const before = (await call('causes')).body.find(c => c.id === 'value:color:#ffffff');
  const file = 'src/App.tsx';
  const applied = await call('apply-all', { swaps: before.fixes.map(cause => ({ cause })) }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.ok(applied.body.results.swaps.every(swap => swap.ok), JSON.stringify(applied.body.results.swaps));
  const source = await readFile(join(root, file), 'utf8');
  assert.ok(!/\bbg-white\b/.test(source.replace('text-white/15', '')), source);
  assert.match(source, /className="bg-on-accent text-on-accent px-s4"/);
  assert.match(source, /className="bg-on-accent bg-on-accent text-ink"/);
  assert.match(source, /text-white\/15 text-on-accent/);
  // what remains of white is only what a class swap cannot reach: the inline style
  const after = (await call('causes')).body.find(c => c.id === 'value:color:#ffffff');
  assert.equal(after.rendersNothing, 0);
  assert.ok(after.count < before.count, `${before.count} -> ${after.count}`);
  assert.ok(after.places.every(p => p.text.startsWith('background:')), JSON.stringify(after.places.map(p => p.text)));
});

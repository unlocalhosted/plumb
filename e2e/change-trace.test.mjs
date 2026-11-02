import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

// Every change a write makes is traced on its own: read back with its group and meta, and undone alone, in any order,
// after later writes to the same file; a place edited by hand refuses its undo; the trace outlives the session.
const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
export const App = () => <>
  <div id="a" className="p-4 gap-2" />
  <div id="b" className="p-[13px]" />
  <div id="c" className="mt-[10px]" />
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.trace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), source);
  let server;
  const start = async () => { server = await serve({ root, watch: false }); };
  await start();
  t.after(() => server.close());
  const call = async (method, params = {}, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const read = () => readFile(join(root, 'src/App.tsx'), 'utf8');
  const hash = async () => (await call('props', { file: 'src/App.tsx', line: 3, column: 3 })).body.hash;
  const swaps = async (edits, trace) => {
    const r = await call('swaps', { file: 'src/App.tsx', hash: await hash(), edits: edits.map(([line, from, to]) => ({ line, column: 3, from, to })), ...(trace ? { trace } : {}) }, 'POST');
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.refused ?? [], []);
    return r.body;
  };
  const trace = async (params) => { const r = await call('trace', params); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.changes; };
  const restart = async () => { await server.close(); await start(); };
  return { root, call, read, swaps, trace, restart };
}
const by = (changes, to) => changes.find(c => c.to === to);

test('a batch is one group of single changes; any one undoes alone, even after a later write to the same file, and the trace outlives the session', async t => {
  const api = await project(t);
  await api.swaps([[3, 'gap-2', 'gap-3'], [4, 'p-[13px]', 'p-3'], [5, 'mt-[10px]', 'mt-2.5']], { group: 'layer-spacing', meta: { layer: 'spacing', law: 'proximity' } });
  const first = await api.trace({ group: 'layer-spacing' });
  assert.deepEqual(first.map(c => [c.from, c.to, c.line, c.state]).sort(), [['gap-2', 'gap-3', 3, 'live'], ['mt-[10px]', 'mt-2.5', 5, 'live'], ['p-[13px]', 'p-3', 4, 'live']]);
  assert.ok(first.every(c => c.file === 'src/App.tsx' && c.group === 'layer-spacing' && c.meta.law === 'proximity' && !Number.isNaN(Date.parse(c.at))), JSON.stringify(first));

  // the middle one alone
  const middle = await api.call('undo-change', { id: by(first, 'p-3').id }, 'POST');
  assert.equal(middle.status, 200, JSON.stringify(middle.body));
  assert.equal(await api.read(), source.replace('gap-2', 'gap-3').replace('mt-[10px]', 'mt-2.5'));
  const afterMiddle = await api.trace({ group: 'layer-spacing' });
  assert.equal(by(afterMiddle, 'p-3').state, 'undone');
  assert.equal(by(afterMiddle, 'gap-3').state, 'live');

  // a later write on the same line, then the first batch's first change: still found, still undone alone
  await api.swaps([[3, 'p-4', 'p-5']]);
  const early = await api.call('undo-change', { id: by(first, 'gap-3').id }, 'POST');
  assert.equal(early.status, 200, JSON.stringify(early.body));
  assert.match(await api.read(), /id="a" className="p-5 gap-2"/);
  const all = await api.trace();
  assert.equal(all[0].undoes?.[0], by(first, 'gap-3').id, 'the undo is itself a change, newest first');
  assert.equal(by(all, 'p-5').state, 'live');
  assert.notEqual(by(all, 'p-5').group, 'layer-spacing', 'an untagged write gets a group of its own');

  // a new session reads the same trace
  await api.restart();
  const again = await api.trace();
  assert.deepEqual(again.map(c => [c.id, c.state]), all.map(c => [c.id, c.state]));
  assert.equal((await api.call('undo-change', { id: by(first, 'p-3').id }, 'POST')).status, 400, 'already undone');
});

test('a place edited by hand refuses its undo and leaves the file alone; a whole group undoes all or nothing', async t => {
  const api = await project(t);
  await api.swaps([[3, 'gap-2', 'gap-3'], [4, 'p-[13px]', 'p-3'], [5, 'mt-[10px]', 'mt-2.5']], { group: 'tidy' });
  const changes = await api.trace({ group: 'tidy' });
  const typed = (await api.read()).replace('mt-2.5', 'mt-6');
  await writeFile(join(api.root, 'src/App.tsx'), typed);
  assert.equal(by(await api.trace({ group: 'tidy' }), 'mt-2.5').state, 'changed');
  const refused = await api.call('undo-change', { id: by(changes, 'mt-2.5').id }, 'POST');
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /no longer holds what it wrote; it was edited outside React Plumber/);
  const group = await api.call('undo-group', { group: 'tidy' }, 'POST');
  assert.equal(group.status, 400, 'one changed place refuses the group');
  assert.equal(await api.read(), typed, 'nothing written');

  // put the hand edit back: the group undoes whole
  await writeFile(join(api.root, 'src/App.tsx'), typed.replace('mt-6', 'mt-2.5'));
  const undone = await api.call('undo-group', { group: 'tidy' }, 'POST');
  assert.equal(undone.status, 200, JSON.stringify(undone.body));
  assert.equal(await api.read(), source);
  assert.ok((await api.trace({ group: 'tidy' })).every(c => c.state === 'undone'));
  assert.equal((await api.call('undo-group', { group: 'tidy' }, 'POST')).status, 400, 'nothing left to undo');
});

test('a file-level undo takes its changes out of the trace', async t => {
  const api = await project(t);
  const written = await api.swaps([[4, 'p-[13px]', 'p-3']], { group: 'one' });
  assert.equal((await api.trace({ group: 'one' })).length, 1);
  assert.equal((await api.call('undo', { id: written.undo.id }, 'POST')).status, 200);
  assert.equal(await api.read(), source);
  assert.deepEqual(await api.trace({ group: 'one' }), []);
});

test('an old record never finds its place on the next element down: crafting-ui\'s h2 and p share `className="mt-2 font-re`', async t => {
  // found on crafting-ui (docs/qa/timeline-crafting-ui.md): an undo's record (mt-3 → mt-2 on the h2) read as live after
  // the h2 went back to mt-3, matched on the <p className="mt-2 font-read …"> below it; Go back to here would have
  // written to that p
  const api = await project(t);
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(api.root, 'src'), { recursive: true });
  const FILE = 'src/pages/MotionStandardsPage.tsx', page = () => readFile(join(api.root, FILE), 'utf8');
  const line = (await page()).split('\n').findIndex(l => l.includes('<h2 id=')) + 1, column = (await page()).split('\n')[line - 1].indexOf('<') + 1;
  const h2 = async (from, to) => {
    const { hash } = (await api.call('props', { file: FILE, line, column })).body;
    const r = await api.call('swaps', { file: FILE, hash, edits: [{ line, column, from, to }] }, 'POST');
    assert.equal(r.status, 200, JSON.stringify(r.body));
  };
  await h2('mt-2', 'mt-3');
  const first = (await api.trace()).find(c => c.to === 'mt-3');
  assert.equal((await api.call('undo-change', { id: first.id }, 'POST')).status, 200);
  const undo = (await api.trace()).find(c => c.undoes?.includes(first.id));
  await h2('mt-2', 'mt-3');
  const before = await page();
  assert.match(before.split('\n')[line], /<p className="mt-2 font-read/, 'the p below still has its mt-2');
  assert.equal((await api.trace()).find(c => c.id === undo.id).state, 'changed', 'the undo\'s place no longer holds mt-2');
  assert.equal((await api.call('undo-change', { id: undo.id }, 'POST')).status, 400);
  assert.equal(await page(), before, 'nothing written, the p least of all');
});

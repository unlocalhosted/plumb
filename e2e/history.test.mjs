import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
export const App = () => <>
  <h1 id="title">Welcome back</h1>
  <p id="note">Read the notes</p>
  <div className="py-[10px] p-0" />
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.history-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const read = () => readFile(join(root, 'src/App.tsx'), 'utf8');
  const text = async (line, from, to) => {
    const found = (await call('text-at', { file: 'src/App.tsx', line, column: 3, text: from })).body;
    return call('apply-text-at', { file: found.file, hash: found.hash, id: found.id, from, to }, 'POST');
  };
  return { root, call, read, text };
}

test('every write returns a handle; history lists them newest first; undo restores the file and a handle works once', async t => {
  const api = await project(t);
  const first = await api.text(3, 'Welcome back', 'Hello again');
  assert.equal(first.status, 200, JSON.stringify(first));
  assert.deepEqual(Object.keys(first.body.undo).sort(), ['file', 'id', 'label']);
  assert.equal(first.body.undo.file, 'src/App.tsx');
  const second = await api.text(4, 'Read the notes', 'Skim the notes');
  assert.equal(second.status, 200, JSON.stringify(second));
  const history = (await api.call('history')).body.writes;
  assert.deepEqual(history.map(w => [w.id, w.file, w.line, w.label]), [
    [second.body.undo.id, 'src/App.tsx', 4, '“Read” → “Skim”'],
    [first.body.undo.id, 'src/App.tsx', 3, '“Welcome back” → “Hello again”'],
  ]);
  assert.ok(history.every(w => !Number.isNaN(Date.parse(w.at))));
  // The older write sits under a newer one: refused until the newer is undone.
  const early = await api.call('undo', { id: first.body.undo.id }, 'POST');
  assert.equal(early.status, 400);
  assert.match(early.body.error, /changed since/);
  const undone = await api.call('undo', { id: second.body.undo.id }, 'POST');
  assert.equal(undone.status, 200, JSON.stringify(undone));
  assert.equal(undone.body.undone, second.body.undo.id);
  assert.ok(undone.body.file.endsWith('/src/App.tsx'));
  assert.equal(undone.body.hash, first.body.hash);
  assert.equal((await api.call('undo', { id: first.body.undo.id }, 'POST')).status, 200);
  assert.equal(await api.read(), source);
  assert.equal((await api.call('history')).body.writes.length, 0);
  const again = await api.call('undo', { id: first.body.undo.id }, 'POST');
  assert.equal(again.status, 400);
  assert.match(again.body.error, /not in the history/);
});

test('a token write is undoable, and a hand edit after it refuses the undo and leaves the file alone', async t => {
  const api = await project(t);
  const edits = (await api.call('edits', { file: 'src/App.tsx', line: 5 })).body;
  const edit = edits.edits.find(e => e.from === 'py-[10px]');
  assert.ok(edit, JSON.stringify(edits));
  const applied = await api.call('apply', { file: 'src/App.tsx', hash: edits.hash, edits: [{ id: edit.id }] }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied));
  assert.match(await api.read(), new RegExp(`className="${edit.to} p-0"`));
  assert.equal(applied.body.undo.label, `py-[10px] → ${edit.to}`);
  const typed = (await api.read()).replace('Welcome back', 'Typed by hand');
  await writeFile(join(api.root, 'src/App.tsx'), typed);
  const refused = await api.call('undo', { id: applied.body.undo.id }, 'POST');
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /changed since/);
  assert.equal(await api.read(), typed);
  // Restore the hand edit and the write undoes cleanly.
  await writeFile(join(api.root, 'src/App.tsx'), typed.replace('Typed by hand', 'Welcome back'));
  assert.equal((await api.call('undo', { id: applied.body.undo.id }, 'POST')).status, 200);
  assert.equal(await api.read(), source);
});

test('history keeps the last 20 writes', async t => {
  const api = await project(t);
  let from = 'Welcome back', ids = [];
  for (let i = 0; i < 22; i++) {
    const to = `Title ${i}`;
    const written = await api.text(3, from, to);
    assert.equal(written.status, 200, JSON.stringify(written));
    ids.push(written.body.undo.id); from = to;
  }
  const writes = (await api.call('history')).body.writes;
  assert.equal(writes.length, 20);
  assert.equal(writes[0].id, ids[21]);
  assert.equal((await api.call('undo', { id: ids[0] }, 'POST')).status, 400);
});

test('a file changed outside React Plumber marks its writes stale in history; undo still refuses them', async t => {
  const api = await project(t);
  const first = await api.text(3, 'Welcome back', 'Hello again');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const before = (await api.call('history')).body.writes;
  assert.deepEqual(before.map(w => [w.id, w.stale]), [[first.body.undo.id, undefined]]);
  // an editor saves the file: the write is still listed, but can no longer be undone
  await writeFile(join(api.root, 'src/App.tsx'), (await api.read()).replace('Hello again', 'Hello again, friend'));
  const after = (await api.call('history')).body.writes;
  assert.deepEqual(after.map(w => [w.id, w.stale]), [[first.body.undo.id, true]]);
  const refused = await api.call('undo', { id: first.body.undo.id }, 'POST');
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /changed since/);
  // a long caption: the label names only the words that changed
  const long = await api.text(4, 'Read the notes', 'Read the notes again');
  assert.equal(long.status, 200, JSON.stringify(long.body));
  assert.equal(long.body.undo.label, '“” → “again”');
  assert.equal((await api.call('history')).body.writes.find(w => w.id === long.body.undo.id).stale, undefined);
});

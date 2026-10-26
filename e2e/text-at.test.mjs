import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const files = {
  'src/App.tsx': `import { items } from './data.js';
import { SyncRow } from './SyncRow.jsx';
export const App = ({ name }) => <>
  <h1 id="jsx">Welcome back</h1>
  <SyncRow title="Sync calendar" />
  <SyncRow title='Say "hi" &amp; wave' />
  {items.map(item => <li key={item.id}>{item.title}</li>)}
  <p id="expression">{name}</p>
  <p id="translation">{t('welcome')}</p>
</>;
`,
  'src/SyncRow.jsx': `export const SyncRow = ({ title }) => <h3 id="row">{title}</h3>;\n`,
  'src/data.js': `export const items = [
  { id: 'a', title: 'Export all rows' },
  { id: 'b', title: 'Twin words' },
  { id: 'c', title: "Twin words" },
  { id: 'd', title: 'Rename card' },
];\n`,
};
const at = (source, anchor, file) => {
  const start = source.indexOf(anchor); assert.ok(start >= 0, anchor);
  const prefix = source.slice(0, start);
  return { file, line: prefix.split('\n').length, column: start - prefix.lastIndexOf('\n') };
};
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.text-at-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  for (const [name, source] of Object.entries(files)) await writeFile(join(root, name), source);
  return serving(t, root, name => readFile(join(root, name), 'utf8'));
}
async function serving(t, root, read) {
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  // The question the overlay asks on a double-click: the element's position, its words, its owners innermost first.
  const ask = (anchor, file, text, ...owners) => call('text-at', { ...at(files[file], anchor, file), text, owners: owners.map(([name, from]) => { const p = at(files[name], from, name); return `${name}:${p.line}:${p.column}`; }).join(',') });
  const write = (found, to) => call('apply-text-at', { file: found.file, hash: found.hash, id: found.id, from: found.from, to }, 'POST');
  return { root, call, ask, write, read };
}

test('text-at finds JSX text in the element, and writes it back', async t => {
  const api = await project(t);
  const found = (await api.ask('<h1 id="jsx"', 'src/App.tsx', 'Welcome back')).body;
  assert.deepEqual({ ...found, hash: undefined, id: undefined }, { editable: true, hash: undefined, file: 'src/App.tsx', line: 4, column: 16, kind: 'jsx', id: undefined, from: 'Welcome back' });
  const written = await api.write(found, 'Hello again');
  assert.equal(written.status, 200, JSON.stringify(written));
  assert.match(await api.read('src/App.tsx'), /<h1 id="jsx">Hello again<\/h1>/);
});

test('text-at follows words rendered through a prop to the attribute at the use site', async t => {
  const api = await project(t);
  const found = (await api.ask('<h3 id="row"', 'src/SyncRow.jsx', 'Sync calendar', ['src/App.tsx', '<SyncRow title="Sync'])).body;
  assert.equal(found.editable, true, JSON.stringify(found));
  assert.deepEqual([found.kind, found.file, found.line, found.from], ['attribute', 'src/App.tsx', 5, 'Sync calendar']);
  assert.equal((await api.write(found, 'Sync my calendar')).status, 200);
  assert.match(await api.read('src/App.tsx'), /<SyncRow title="Sync my calendar" \/>/);
});

test('text-at finds the one string literal in a data module and keeps its quote style, escaping a quote', async t => {
  const api = await project(t);
  const found = (await api.ask('<li key', 'src/App.tsx', 'Export all rows', ['src/App.tsx', '<li key'])).body;
  assert.deepEqual([found.editable, found.kind, found.file, found.line, found.from], [true, 'literal', 'src/data.js', 2, 'Export all rows']);
  const card = (await api.ask('<li key', 'src/App.tsx', 'Rename card')).body;
  assert.equal(card.kind, 'literal');
  const written = await api.write(card, `It's "done"`);
  assert.equal(written.status, 200, JSON.stringify(written));
  assert.match(await api.read('src/data.js'), /title: 'It\\'s "done"' \}/);
  // double-quoted attribute: the quote is an entity, since JSX attributes have no backslashes
  const attribute = (await api.ask('<h3 id="row"', 'src/SyncRow.jsx', 'Say "hi" & wave', ['src/App.tsx', `<SyncRow title='Say`])).body;
  assert.deepEqual([attribute.kind, attribute.from], ['attribute', 'Say "hi" & wave']);
  assert.equal((await api.write(attribute, `Say 'bye' & "go"`)).status, 200);
  assert.match(await api.read('src/App.tsx'), /<SyncRow title='Say &apos;bye&apos; & "go"' \/>/);
});

test('text-at refuses two identical strings, pointing at one', async t => {
  const api = await project(t);
  const found = (await api.ask('<li key', 'src/App.tsx', 'Twin words')).body;
  assert.equal(found.editable, false);
  assert.match(found.reason, /2 strings in source say these words/);
  assert.deepEqual(found.where, { file: 'src/data.js', line: 3 });
});

test('text-at refuses an expression it cannot trace and a translation', async t => {
  const api = await project(t);
  const expression = (await api.ask('<p id="expression"', 'src/App.tsx', 'Ada')).body;
  assert.equal(expression.editable, false);
  assert.match(expression.reason, /expression/);
  assert.deepEqual(expression.where, { file: 'src/App.tsx', line: 8 });
  const translation = (await api.ask('<p id="translation"', 'src/App.tsx', 'Welcome')).body;
  assert.equal(translation.editable, false);
  assert.match(translation.reason, /translation/);
});

test('apply-text-at refuses a stale hash and words that moved on', async t => {
  const api = await project(t);
  const found = (await api.ask('<h1 id="jsx"', 'src/App.tsx', 'Welcome back')).body;
  const moved = await api.write({ ...found, from: 'Welcome' }, 'Hi');
  assert.equal(moved.status, 400); assert.match(moved.body.error, /changed since/);
  await writeFile(join(api.root, 'src/App.tsx'), files['src/App.tsx'] + '// edited\n');
  const stale = await api.write(found, 'Hi');
  assert.equal(stale.status, 400); assert.match(stale.body.error, /changed since/);
  assert.match(await api.read('src/App.tsx'), /Welcome back/);
});

test('text-at resolves a Relay card title to its literal in data.js, read only', async t => {
  const root = join(repo, 'examples/relay');
  const api = await serving(t, root, name => readFile(join(root, name), 'utf8'));
  const found = (await api.call('text-at', { file: 'src/screens/Board.jsx', line: 1, column: 1, text: 'Export board as CSV', owners: '' })).body;
  assert.equal(found.editable, true, JSON.stringify(found));
  assert.deepEqual([found.kind, found.file, found.from], ['literal', 'src/data.js', 'Export board as CSV']);
  const data = await readFile(join(root, 'src/data.js'), 'utf8');
  assert.equal(data.split('\n')[found.line - 1].includes('Export board as CSV'), true);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
const cn = (...parts) => parts.filter(Boolean).join(' ');
export function App({ cls, on }) {
  return <>
    <div className="p-s3 rounded-card flex gap-s2" />
    <section className={cn('text-brand', on && 'font-medium')} />
    <aside />
    <div className={cls} />
    <div style={{ padding: 10 }} />
    <img src="a.png" className="object-cover" />
  </>;
}
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.props-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await appendFile(join(root, 'src/styles.css'), '@theme { --radius-card: 12px; --color-brand: #12805c; }\n');
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const call = async (method, params, verb = 'GET') => {
    const url = new URL(`/__plumb/${method}`, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const props = async line => { const r = await call('props', { file: 'src/App.tsx', line, column: 6 }); assert.equal(r.status, 200, JSON.stringify(r)); return r.body; };
  const prop = (body, key) => body.props.find(p => p.key === key);
  const set = (body, line, key, token) => call('set', { file: 'src/App.tsx', hash: body.hash, line, column: 6, key, token }, 'POST');
  return { call, props, prop, set, read: () => readFile(join(root, 'src/App.tsx'), 'utf8') };
}

test('props lists every family for an element, set or not, with the theme steps', async t => {
  const api = await project(t);
  const body = await api.props(5);
  assert.equal(body.kind, 'layout');
  assert.equal(body.props.length, 21);
  assert.deepEqual(['padding', 'padding-x', 'radius', 'background', 'gap'].map(k => api.prop(body, k).source), ['class', 'none', 'class', 'none', 'class']);
  const padding = api.prop(body, 'padding');
  assert.deepEqual([padding.value, padding.token, padding.class, padding.family], ['12px', 's3', 'p-s3', 'spacing']);
  assert.deepEqual(padding.steps.filter(s => ['s2', 's3', 's4'].includes(s.token)).map(s => [s.token, s.value, s.label]), [['s2', '8px', 's2'], ['s3', '12px', 's3'], ['s4', '16px', 's4']]);
  assert.deepEqual([api.prop(body, 'radius').token, api.prop(body, 'radius').value], ['card', '12px']);
  assert.deepEqual(api.prop(body, 'flex-direction').steps.map(s => s.token), ['row', 'col', 'row-reverse', 'col-reverse']);
  assert.equal((await api.props(10)).kind, 'media');
});

test('set replaces the class that sets the property, adds one where none does, and is undoable', async t => {
  const api = await project(t);
  const body = await api.props(5);
  const replaced = await api.set(body, 5, 'padding', 's4');
  assert.equal(replaced.status, 200, JSON.stringify(replaced));
  assert.match(await api.read(), /className="p-s4 rounded-card flex gap-s2"/);
  assert.equal(replaced.body.undo.label, 'padding: s3 → s4');
  const again = await api.props(5);
  const added = await api.set(again, 5, 'background', 'brand');
  assert.equal(added.status, 200, JSON.stringify(added));
  assert.match(await api.read(), /className="p-s4 rounded-card flex gap-s2 bg-brand"/);
  assert.equal((await api.call('undo', { id: added.body.undo.id }, 'POST')).status, 200);
  assert.equal((await api.call('undo', { id: replaced.body.undo.id }, 'POST')).status, 200);
  assert.equal(await api.read(), source);
});

test('set writes into cn(...)s first string, creates a className, and edits a static inline value', async t => {
  const api = await project(t);
  assert.equal((await api.set(await api.props(6), 6, 'font-weight', 'semibold')).status, 200);
  assert.equal(api.prop(await api.props(6), 'color').class, 'text-brand');
  assert.equal((await api.set(await api.props(7), 7, 'radius', 'card')).status, 200);
  const inline = await api.props(9);
  assert.deepEqual([api.prop(inline, 'padding').source, api.prop(inline, 'padding').value], ['inline', '10px']);
  assert.equal((await api.set(inline, 9, 'padding', 's3')).status, 200);
  const text = await api.read();
  assert.match(text, /cn\('text-brand font-semibold', on && 'font-medium'\)/);
  assert.match(text, /<aside className="rounded-card" \/>/);
  assert.match(text, /style=\{\{ padding: "var\(--spacing-s3\)" \}\}/);
});

test('set refuses a className built at runtime, an unknown step and a stale hash, writing nothing', async t => {
  const api = await project(t);
  const dynamic = await api.props(8);
  assert.match(api.prop(dynamic, 'padding').dynamic, /built at runtime/);
  const refused = await api.set(dynamic, 8, 'padding', 's3');
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /built at runtime/);
  const body = await api.props(5);
  assert.equal((await api.set(body, 5, 'padding', 'nope')).status, 400);
  const stale = await api.call('set', { file: 'src/App.tsx', hash: 'deadbeef', line: 5, column: 6, key: 'padding', token: 's4' }, 'POST');
  assert.equal(stale.status, 400);
  assert.match(stale.body.error, /changed since/);
  assert.equal(await api.read(), source);
});

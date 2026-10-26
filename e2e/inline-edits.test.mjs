import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
const BOX = { padding: 10 };
export function App({ w }: { w: number }) {
  return <>
    <div style={{ padding: 10, background: 'oklch(0.6 0.2 250)' }} />
    <div style={BOX} />
    <div style={{ padding: w * 2 }} />
    <div style={{ padding: \`\${w}px\` }} />
  </>;
}
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.inline-edits-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await appendFile(join(root, 'src/styles.css'), '@theme { --color-brand: oklch(0.6 0.2 250); }\n');
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const call = async (method, params, verb = 'GET') => {
    const url = new URL(`/__plumb/${method}`, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  return { call, read: () => readFile(join(root, 'src/App.tsx'), 'utf8') };
}

test('static inline values offer token edits (colours too) and apply as an undoable write', async t => {
  const api = await project(t);
  const found = (await api.call('edits', { file: 'src/App.tsx', line: 5 })).body;
  const spacing = found.edits.find(e => e.from === 'padding: 10');
  const colour = found.edits.find(e => e.from === "background: 'oklch(0.6 0.2 250)'");
  assert.equal(spacing.to, 'padding: "var(--spacing-s2)"');
  assert.deepEqual([colour.to, colour.token], ['background: "var(--color-brand)"', '--color-brand']);
  const applied = await api.call('apply', { file: 'src/App.tsx', hash: found.hash, edits: [{ id: colour.id }] }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied));
  assert.match(await api.read(), /style=\{\{ padding: 10, background: "var\(--color-brand\)" \}\}/);
  assert.equal((await api.call('undo', { id: applied.body.undo.id }, 'POST')).status, 200);
  assert.equal(await api.read(), source);
});

test('values no edit can write come back with a reason', async t => {
  const api = await project(t);
  const reasons = async line => (await api.call('edits', { file: 'src/App.tsx', line })).body;
  const bound = await reasons(6);
  assert.deepEqual(bound.edits, []);
  assert.match(bound.refused[0].reason, /shared style object/);
  assert.equal(bound.refused[0].text, 'padding: 10');
  const scaled = await reasons(7);
  assert.match(scaled.refused[0].reason, /No token is close/);
  const runtime = await reasons(8);
  assert.equal(runtime.refused[0].rule, 'provenance/opaque-inline');
  assert.match(runtime.refused[0].reason, /^Computed at runtime/);
});

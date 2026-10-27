// The class swap (POST swap), the write behind every craft suggestion, through the session server's real HTTP
// boundary: whatever the className looks like, the file is edited only where the named classes stand, it always
// parses afterwards, and anything it can't write safely is refused with the file untouched.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'oxc-parser';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
const cn = (...parts) => parts.filter(Boolean).join(' ');
const Card = (props) => <div {...props} />;
export const App = ({ on }) => <>
  <div id="quoted" className={cn('before:content-[\\'→\\'] px-4', on && 'opacity-50')} />
  <span id="caps" className={cn('text-xs uppercase', on && 'font-bold')}>sign-in</span>
  <div id="multi" className={\`
    px-4
    py-2
  \`} />
  <Card id="comp" />
  <p id="plain" className="px-4 py-2">x</p>
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.swap-'));
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
  const lineOf = async (id) => (await read()).split('\n').findIndex((l) => l.includes(`id="${id}"`)) + 1;
  const swap = async (id, from, to, hash) => {
    const line = await lineOf(id);
    const props = await call('props', { file: 'src/App.tsx', line, column: 3 });
    return call('swap', { file: 'src/App.tsx', hash: hash ?? props.body.hash, line, column: 3, from, to }, 'POST');
  };
  return { root, call, read, swap };
}
const parses = (text) => parseSync('App.tsx', text).errors.length === 0;

test('an escaped quote in a single-quoted cn() string stays escaped; only px-4 changes', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const result = await api.swap('quoted', 'px-4', 'px-6');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const text = await api.read();
  assert.ok(text.includes(`className={cn('before:content-[\\'→\\'] px-6', on && 'opacity-50')}`), text.split('\n')[4]);
  assert.ok(parses(text));
});

test('a class carrying a quote goes into a single-quoted string with its quotes turned, and the file parses', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const result = await api.swap('caps', '', "[font-feature-settings:'case']");
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const text = await api.read();
  assert.ok(text.includes(`className={cn('text-xs uppercase [font-feature-settings:"case"]', on && 'font-bold')}`), text.split('\n')[5]);
  assert.ok(parses(text));
});

test('a multi-line template className keeps its lines and indentation', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const result = await api.swap('multi', 'px-4', 'px-6');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok((await api.read()).includes('className={`\n    px-6\n    py-2\n  `}'));
});

test('several classes out and in, in the place of the first, on a plain attribute', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const result = await api.swap('plain', 'px-4', 'pl-5 pr-6');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok((await api.read()).includes('<p id="plain" className="pl-5 pr-6 py-2">x</p>'));
});

test('refused, file untouched: an insert on a component, a class that cannot sit in the string, a stale hash', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const before = await api.read();
  const component = await api.swap('comp', '', 'tabular-nums');
  assert.notEqual(component.status, 200);
  assert.match(component.body.error ?? component.body.message ?? JSON.stringify(component.body), /component/i);
  const tick = await api.swap('multi', 'px-4', 'px-[1px]` + `');
  assert.notEqual(tick.status, 200);
  const props = await api.call('props', { file: 'src/App.tsx', line: 12, column: 3 });
  await writeFile(join(api.root, 'src/App.tsx'), before.replace('py-2">x', 'py-3">x'));
  const stale = await api.swap('plain', 'px-4', 'px-6', props.body.hash);
  assert.notEqual(stale.status, 200);
  assert.match(JSON.stringify(stale.body), /changed since/i);
  assert.equal(await api.read(), before.replace('py-2">x', 'py-3">x'));
});

test('swaps: several elements of one file in one write, the file parses, a stale hash refuses all of them', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const text = await api.read();
  const lineOf = (id) => text.split('\n').findIndex((l) => l.includes(`id="${id}"`)) + 1;
  const props = await api.call('props', { file: 'src/App.tsx', line: lineOf('plain'), column: 3 });
  const edits = [{ line: lineOf('plain'), column: 3, from: 'px-4', to: 'px-6' }, { line: lineOf('multi'), column: 3, from: 'py-2', to: 'py-3' }, { line: lineOf('plain'), column: 3, from: 'px-4', to: 'px-6' }];
  const result = await api.call('swaps', { file: 'src/App.tsx', hash: props.body.hash, edits }, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const after = await api.read();
  assert.ok(after.includes('<p id="plain" className="px-6 py-2">x</p>'));
  assert.ok(after.includes('className={`\n    px-4\n    py-3\n  `}'));
  assert.ok(parses(after));
  const stale = await api.call('swaps', { file: 'src/App.tsx', hash: props.body.hash, edits: [{ line: lineOf('plain'), column: 3, from: 'px-6', to: 'px-8' }] }, 'POST');
  assert.notEqual(stale.status, 200);
  assert.equal(await api.read(), after);
});

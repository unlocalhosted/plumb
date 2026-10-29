// Where a class is written decides where it is edited, through the session server's real HTTP boundary: a template
// literal's fixed parts take a swap; a class read through a variable is reported at the element but edited at its
// literal; and a batch of swaps writes every place it can and names the places it can't, each with its reason.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
const pad = 'p-[9px]';
const Card = (props) => <div {...props} />;
export const App = ({ on, size }) => <>
  <div id="tpl" className={\`relative p-[9px] \${on ? 'x' : 'y'} text-\${size}\`} />
  <div id="var" className={\`flex \${pad}\`} />
  <Card id="comp" />
  <p id="plain" className="p-[9px]">x</p>
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.edits-places-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
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
  const hash = async () => (await call('props', { file: 'src/App.tsx', line: await lineOf('plain'), column: 3 })).body.hash;
  return { root, call, read, lineOf, hash };
}

test('a swap lands in the fixed part of a template literal with expressions; a class glued to an expression is not one of its classes', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const line = await api.lineOf('tpl');
  const glued = await api.call('swap', { file: 'src/App.tsx', hash: await api.hash(), line, column: 3, from: 'text', to: 'text-sm' }, 'POST');
  assert.equal(glued.status, 400, JSON.stringify(glued.body));
  assert.match(glued.body.error, /text is not written on this element/);
  const result = await api.call('swap', { file: 'src/App.tsx', hash: await api.hash(), line, column: 3, from: 'p-[9px]', to: 'p-small' }, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok((await api.read()).includes("className={`relative p-small ${on ? 'x' : 'y'} text-${size}`}"), await api.read());
});

test('a class read through a variable is reported at the element with where it is defined, and edited at its literal', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const line = await api.lineOf('var');
  const site = await api.call('site', { file: 'src/App.tsx', line, column: 3 });
  assert.equal(site.status, 200, JSON.stringify(site.body));
  const used = site.body.declarations.filter(d => d.site.text === 'p-[9px]');
  assert.ok(used.length, JSON.stringify(site.body.declarations.map(d => d.site.text)));
  for (const d of used) assert.deepEqual({ line: d.site.line, defined: d.site.defined }, { line, defined: { file: join(api.root, 'src/App.tsx'), line: 2, column: source.split('\n')[1].indexOf('p-[9px]') + 1 } });
  const finding = site.body.findings.find(f => f.sites.some(s => s.text === 'p-[9px]'));
  assert.ok(finding, JSON.stringify(site.body.findings.map(f => f.title)));
  assert.equal(finding.sites.find(s => s.text === 'p-[9px]').defined.line, 2);
  const edits = await api.call('edits', { file: 'src/App.tsx', line, column: 3 });
  assert.equal(edits.status, 200, JSON.stringify(edits.body));
  const edit = edits.body.edits.find(e => e.from === 'p-[9px]' && e.to === 'p-small');
  assert.ok(edit, JSON.stringify(edits.body));
  assert.equal(edit.line, 2);
  assert.ok(!edits.body.refused.some(r => r.text === 'p-[9px]'), JSON.stringify(edits.body.refused));
  const applied = await api.call('apply', { file: 'src/App.tsx', hash: edits.body.hash, edits: [{ id: edit.id }] }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  const text = await api.read();
  assert.ok(text.includes("const pad = 'p-small';"), text);
  assert.ok(text.includes('className={`flex ${pad}`}'), text);
});

test('swaps writes every place it can and refuses the rest one by one, with reasons; a stale hash writes nothing', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const [tpl, variable, comp, plain] = await Promise.all(['tpl', 'var', 'comp', 'plain'].map(api.lineOf));
  const edits = [
    { line: tpl, column: 3, from: 'p-[9px]', to: 'p-small' },
    { line: variable, column: 3, from: 'p-[9px]', to: 'p-small' },
    { line: comp, column: 3, from: '', to: 'p-small' },
    { line: plain, column: 3, from: 'p-[9px]', to: 'p-small' },
  ];
  const before = await api.read();
  const stale = await api.call('swaps', { file: 'src/App.tsx', hash: 'a'.repeat(12), edits }, 'POST');
  assert.equal(stale.status, 400, JSON.stringify(stale.body));
  assert.equal(await api.read(), before);
  const result = await api.call('swaps', { file: 'src/App.tsx', hash: await api.hash(), edits }, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(result.body.applied, [`swap:${tpl}:3`, `swap:${plain}:3`]);
  assert.deepEqual(result.body.refused.map(r => [r.line, r.reason]), [
    [variable, 'p-[9px] is not written on this element; read it again.'],
    [comp, '<Card> is a component; add the class inside it, by hand.'],
  ]);
  const text = await api.read();
  assert.ok(text.includes("className={`relative p-small ${on ? 'x' : 'y'} text-${size}`}"), text);
  assert.ok(text.includes('<p id="plain" className="p-small">x</p>'), text);
  assert.ok(text.includes("const pad = 'p-[9px]';") && text.includes('className={`flex ${pad}`}') && text.includes('<Card id="comp" />'), text);
  // nothing writable: an error, and the file as it was
  const none = await api.call('swaps', { file: 'src/App.tsx', hash: result.body.hash, edits: [edits[1], edits[2]] }, 'POST');
  assert.equal(none.status, 400, JSON.stringify(none.body));
  assert.match(none.body.error, /^None of these changes could be written: p-\[9px\] is not written on this element; read it again\. <Card> is a component/);
  assert.equal(await api.read(), text);
});

test('a dead class offers each suggested class as a choice with an exact edit; taking one writes it, variants kept', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  await writeFile(join(api.root, 'src/App.tsx'), `import './styles.css';\nexport const App = () => <p id="dead" className="hover:p-smal! text-sm">x</p>;\n`);
  const line = 2, column = 'export const App = () => '.length + 1;
  const site = await api.call('site', { file: 'src/App.tsx', line, column });
  assert.equal(site.status, 200, JSON.stringify(site.body));
  const dead = site.body.findings.find(f => f.rule === 'existence/dead-class');
  assert.ok(dead, JSON.stringify(site.body.findings.map(f => f.rule)));
  const names = [...dead.action.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  assert.ok(names.length >= 2, dead.action);
  assert.deepEqual(dead.choices.map(c => [c.name, c.use.class]), names.map(name => [name, name]));
  const edits = await api.call('edits', { file: 'src/App.tsx', line, column });
  assert.equal(edits.status, 200, JSON.stringify(edits.body));
  const offered = edits.body.edits.filter(e => e.rule === 'existence/dead-class');
  assert.deepEqual(offered.map(e => [e.from, e.to, e.token]), names.map(name => ['hover:p-smal!', `hover:${name}!`, name]));
  const applied = await api.call('apply', { file: 'src/App.tsx', hash: edits.body.hash, edits: [{ id: offered[0].id }] }, 'POST');
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.ok((await api.read()).includes(`className="hover:${names[0]}! text-sm"`), await api.read());
});

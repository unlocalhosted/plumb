// The class-site method (docs/research/engine-review.md item 1; docs/qa/element-card-retest.md N-02, N-03, N-04), over real
// HTTP on a project made here. GET /__plumb/class-site answers where each class of an element is written: the plain string
// that holds it (the element's own, a ternary's branch, a template's fixed part, a variable, or a usage up the component
// chain), with the line written and the branch. The writers (swaps) follow it: a class changes in the string it is in, and
// is never added into the other branch. No unit tests: each case asks what a caller of the endpoint can observe.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const app = `import { Link } from './Link';
const look = 'px-2.5 py-1 rounded';
function Panel({ className, children }) { return <div className={\`rounded-card bg-surface \${className}\`}>{children}</div>; }
function Row({ to, ...props }) { return <a href={to} {...props} />; }
function Card({ gapClass, children }) { return <div className={\`flex \${gapClass}\`}>{children}</div>; }
export function A({ on, tone, here, cls }) {
  return (
    <section>
      <div id="tern" className={tone ? 'flex gap-s2 p-s3 rounded-card bg-surface' : 'grid'}>x</div>
      <div id="tpl" className={\`group/cell relative flex px-2 pt-5 pb-4 \${here ? 'text-draw' : 'text-faint'}\`}>x</div>
      <a id="look" className={\`\${look} flex \${on ? '' : 'hover:bg-x active:bg-y'}\`}>x</a>
      <div
        id="multi"
        className="flex
          gap-2 p-3"
      >x</div>
      <Panel className="p-4 flex gap-2"><span id="p">panel</span></Panel>
      <Card gapClass="gap-3"><span id="c">card</span></Card>
      <Link id="lk" className="flex gap-2 p-3">hi</Link>
      <Link id="tab" className={\`\${look} flex \${on ? '' : 'hover:bg-x active:bg-y'}\`}>tab</Link>
      <Row id="row" to="/one" className="flex gap-2 p-3">row</Row>
      <div id="built" className={cls}>x</div>
      <div id="glued" className={'flex ' + cls}>x</div>
      <div id="cond" className={tone ? 'flex' : cls}>x</div>
    </section>
  );
}
`;
const files = {
  'package.json': '{ "name": "fx-site", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n',
  'plumber.config.ts': `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,js,jsx,css}'] };\n`,
  'src/styles.css': '@import "tailwindcss";\n\n@theme {\n  --spacing-s2: 8px;\n  --spacing-s3: 12px;\n  --spacing-s4: 16px;\n}\n',
  'src/App.tsx': app,
  'src/Link.tsx': 'export function Link({ className, ...props }) { return <a className={`inline-flex ${className}`} {...props} />; }\n',
};

async function open(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.class-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const headers = { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' };
  const get = async (method, params) => {
    const url = new URL('/__plumb/' + method, base); url.search = new URLSearchParams(params);
    const response = await fetch(url, { headers }); return { status: response.status, body: await response.json() };
  };
  const post = async (method, params) => { const response = await fetch(new URL('/__plumb/' + method, base), { method: 'POST', headers, body: JSON.stringify(params) }); return { status: response.status, body: await response.json() }; };
  const read = () => readFile(join(root, 'src/App.tsx'), 'utf8');
  const original = await read();
  // the 1-based line and column of the first character of a needle in App.tsx
  const at = (needle, from = 0) => {
    const offset = original.indexOf(needle, from); assert.ok(offset >= 0, needle);
    const before = original.slice(0, offset);
    return { file: 'src/App.tsx', line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
  };
  const atIn = async (file, needle) => {
    const text = await readFile(join(root, file), 'utf8'), offset = text.indexOf(needle); assert.ok(offset >= 0, needle);
    const before = text.slice(0, offset);
    return { file, line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
  };
  const site = async (needle, classes, extra = {}) => { const r = await get('class-site', { ...at(needle), classes, ...extra }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const byToken = (body) => Object.fromEntries(body.classes.map((c) => [c.class, c]));
  return { root, server, get, post, read, original, at, atIn, site, byToken };
}

test('N-04: a className that is a plain string under a ternary is written at that string, with the branch it is in', async (t) => {
  const o = await open(t);
  const body = await o.site('<div id="tern"', 'flex gap-s2 p-s3 grid');
  const c = o.byToken(body);
  const here = o.at('<div id="tern"').line;
  assert.equal(body.refused, undefined);
  for (const token of ['flex', 'gap-s2', 'p-s3']) {
    assert.equal(c[token].sites.length, 1, token);
    const s = c[token].sites[0];
    assert.deepEqual([s.kind, s.prop, s.line], ['own', 'className', here], token);
    assert.deepEqual(s.branch, { condition: 'tone', which: 'then' }, token);
    assert.equal(s.string.text, 'flex gap-s2 p-s3 rounded-card bg-surface');
  }
  // the column is the class itself
  const flex = c.flex.sites[0];
  assert.equal(o.original.split('\n')[flex.line - 1].slice(flex.column - 1, flex.column - 1 + 4), 'flex');
  assert.deepEqual(c.grid.sites[0].branch, { condition: 'tone', which: 'else' });
  assert.equal(c.grid.sites[0].string.text, 'grid');
  // every string is under a condition: nothing is written for a class that is not there, and it says why
  assert.equal(body.add, null);
  assert.match(body.addRefused, /condition|only some|one case/i);
});

test('N-04: the fixed parts of a template hold classes as plainly as a literal; a ternary in a hole is its own branch', async (t) => {
  const o = await open(t);
  const body = await o.site('<div id="tpl"', 'group/cell px-2 text-draw text-faint');
  const c = o.byToken(body);
  assert.equal(body.refused, undefined);
  assert.equal(c['px-2'].sites[0].branch, undefined, 'the fixed part applies always');
  assert.equal(c['group/cell'].sites[0].branch, undefined);
  assert.deepEqual(c['text-draw'].sites[0].branch, { condition: 'here', which: 'then' });
  assert.deepEqual(c['text-faint'].sites[0].branch, { condition: 'here', which: 'else' });
  // a class added with none to change goes where it always applies
  assert.equal(body.add.string.text.trim(), 'group/cell relative flex px-2 pt-5 pb-4');
  assert.deepEqual([body.add.kind, body.add.prop, body.add.string.line], ['own', 'className', o.at('<div id="tpl"').line]);
});

test('N-02: a class held by a variable is reported where the variable writes it; one under a branch says so; an added class has an unconditional place', async (t) => {
  const o = await open(t);
  const body = await o.site('<a id="look"', 'px-2.5 py-1 flex hover:bg-x active:bg-y');
  const c = o.byToken(body);
  const defined = o.at("const look = 'px-2.5").line;
  assert.deepEqual([c['px-2.5'].sites[0].kind, c['px-2.5'].sites[0].line, c['px-2.5'].sites[0].variable, c['px-2.5'].sites[0].prop], ['variable', defined, 'look', 'className']);
  assert.equal(c['px-2.5'].sites[0].element.line, o.at('<a id="look"').line, 'the element that reads the variable');
  assert.equal(o.original.split('\n')[defined - 1].slice(c['px-2.5'].sites[0].column - 1, c['px-2.5'].sites[0].column - 1 + 6), 'px-2.5');
  assert.deepEqual(c['active:bg-y'].sites[0].branch, { condition: 'on', which: 'else' });
  assert.equal(c.flex.sites[0].branch, undefined);
  // never into the other branch: the place to add is the string that always applies
  assert.equal(body.add.string.text.trim(), 'flex');
});

test('N-03: the line reported is the line the class is written on, not the line the tag opens on', async (t) => {
  const o = await open(t);
  const body = await o.site('<div\n        id="multi"', 'flex gap-2 p-3');
  const c = o.byToken(body);
  const opens = o.at('<div\n        id="multi"').line;
  assert.equal(c.flex.sites[0].line, opens + 2);
  assert.equal(c['gap-2'].sites[0].line, opens + 3);
  assert.equal(c['p-3'].sites[0].line, opens + 3);
  assert.equal(c['gap-2'].sites[0].element.line, opens, 'the element it belongs to is the one that opens above');
});

test('the component chain: a class passed in is written at the usage that passes it, in the prop it travels by', async (t) => {
  const o = await open(t);
  const usage = o.at('<Panel className');
  const body = await o.site('<div className={`rounded-card', 'rounded-card bg-surface p-4 flex gap-2', { chain: JSON.stringify([usage]) });
  const c = o.byToken(body);
  assert.deepEqual([c['rounded-card'].sites[0].kind, c['rounded-card'].sites[0].line], ['own', o.at('<div className={`rounded-card').line]);
  for (const token of ['p-4', 'flex', 'gap-2']) {
    assert.equal(c[token].sites.length, 1, token);
    const s = c[token].sites[0];
    assert.deepEqual([s.kind, s.prop, s.line, s.element.tag, s.element.line], ['usage', 'className', usage.line, 'Panel', usage.line], token);
  }
  // `flex` is also written elsewhere in the file; only the usage on the chain counts
  // a class added goes where it changes this Panel only: the usage, not the component every Panel draws from (N-03)
  assert.deepEqual([body.add.kind, body.add.prop, body.add.element.line, body.add.string.text], ['usage', 'className', usage.line, 'p-4 flex gap-2']);

  // a prop that is not className
  const card = o.at('<Card gapClass');
  const gap = await o.site('<div className={`flex ${gapClass}`}', 'flex gap-3', { chain: JSON.stringify([card]) });
  const g = o.byToken(gap)['gap-3'].sites[0];
  assert.deepEqual([g.kind, g.prop, g.line, g.element.tag], ['usage', 'gapClass', card.line, 'Card']);
});

test('classes built in code, and no plain string anywhere, are refused in plain words; nothing is written for them', async (t) => {
  const o = await open(t);
  const built = await o.site('<div id="built"', 'p-3');
  assert.deepEqual(built.classes[0].sites, []);
  assert.match(built.classes[0].refused, /built in code/);
  assert.match(built.refused, /built in code/);
  // glued to an expression: the plain part of a sum is not a string a class can be changed in
  const glued = await o.site('<div id="glued"', 'flex');
  assert.match(glued.refused ?? '', /built in code/);
  // part of the classes are written, part are not: no refusal as a whole
  const cond = await o.site('<div id="cond"', 'flex p-3');
  assert.equal(cond.refused, undefined);
  assert.equal(o.byToken(cond).flex.sites.length, 1);
  assert.match(o.byToken(cond)['p-3'].refused, /built in code/);
});

test('without the classes asked for, every class of the plain strings is reported', async (t) => {
  const o = await open(t);
  const r = await o.get('class-site', o.at('<div id="tern"'));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.classes.map((c) => c.class).sort(), ['bg-surface', 'flex', 'gap-s2', 'grid', 'p-s3', 'rounded-card']);
});

test('the writers follow it: a class changes in the branch it is in; an added class never goes into one; a pinned string takes the change', async (t) => {
  const o = await open(t);
  const hash = (await o.site('<div id="tern"', 'flex')).hash;
  const tern = o.at('<div id="tern"');

  // change in place, in the then branch
  const changed = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...tern, from: 'p-s3', to: 'p-s2' }] });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.ok((await o.read()).includes(`className={tone ? 'flex gap-s2 p-s2 rounded-card bg-surface' : 'grid'}`));
  assert.equal((await o.post('undo', { id: changed.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);

  // add a class where every string is under a condition: refused, nothing written
  const added = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...tern, from: '', to: 'pt-2' }] });
  assert.equal(added.status, 400, JSON.stringify(added.body));
  assert.match(added.body.error ?? added.body.message ?? JSON.stringify(added.body), /condition/i);
  assert.equal(await o.read(), o.original);

  // add where a string always applies: it goes there, not into the ternary after it
  const tpl = o.at('<div id="tpl"');
  const placed = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...tpl, from: '', to: 'pl-3' }] });
  assert.equal(placed.status, 200, JSON.stringify(placed.body));
  assert.ok((await o.read()).includes('className={`group/cell relative flex px-2 pt-5 pb-4 pl-3 ${here ?'), await o.read());
  assert.equal((await o.post('undo', { id: placed.body.undo.id })).status, 200);

  // px-2.5 lives in the variable: not on the element's own strings, so a swap without the string refuses, and with it writes there
  const look = o.at('<a id="look"');
  const site = o.byToken(await o.site('<a id="look"', 'px-2.5')) ['px-2.5'].sites[0];
  const without = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...look, from: 'px-2.5', to: 'px-3' }] });
  assert.equal(without.status, 400, JSON.stringify(without.body));
  assert.equal(await o.read(), o.original);
  const pinned = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...look, from: 'px-2.5', to: 'px-3', at: { line: site.string.line, column: site.string.column } }] });
  assert.equal(pinned.status, 200, JSON.stringify(pinned.body));
  assert.ok((await o.read()).includes("const look = 'px-3 py-1 rounded';"), await o.read());
  assert.equal((await o.post('undo', { id: pinned.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('N-02 across files: the Link draws its padding from a variable at its usage; the change lands there, an added class in the part that always applies', async (t) => {
  const o = await open(t);
  const own = await o.atIn('src/Link.tsx', '<a className');
  const usage = o.at('<Link id="tab"');
  const r = await o.get('class-site', { ...own, classes: 'inline-flex px-2.5 flex active:bg-y', chain: JSON.stringify([usage]) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const c = o.byToken(r.body);
  assert.deepEqual([c['inline-flex'].sites[0].kind, c['inline-flex'].sites[0].file], ['own', 'src/Link.tsx']);
  const pad = c['px-2.5'].sites[0];
  assert.deepEqual([pad.kind, pad.file, pad.variable, pad.prop, pad.element.tag, pad.element.line, pad.line], ['variable', 'src/App.tsx', 'look', 'className', 'Link', usage.line, o.at("const look = 'px-2.5").line]);
  assert.equal(c.flex.sites.filter((s) => s.file === 'src/App.tsx').length, 1);
  assert.deepEqual(c['active:bg-y'].sites[0].branch, { condition: 'on', which: 'else' });
  // the hash of each file a site is in, for the write
  assert.deepEqual(Object.keys(r.body.hashes).sort(), ['src/App.tsx', 'src/Link.tsx']);
  // an added class goes into the usage's part that always applies (` flex `), never into the `on ? '' : …` branch
  assert.deepEqual([r.body.add.kind, r.body.add.file, r.body.add.element.line, r.body.add.string.text.trim()], ['usage', 'src/App.tsx', usage.line, 'flex']);

  // the writer: px-2.5 → px-3 where the variable writes it; pl-3 added where the add points
  const hash = r.body.hashes['src/App.tsx'];
  const changed = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: pad.element.line, column: pad.element.column, from: 'px-2.5', to: 'px-3', at: { line: pad.string.line, column: pad.string.column } }] });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.ok((await o.read()).includes("const look = 'px-3 py-1 rounded';"));
  assert.equal((await o.post('undo', { id: changed.body.undo.id })).status, 200);
  const add = r.body.add;
  const added = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: add.element.line, column: add.element.column, from: '', to: 'pl-3', at: { line: add.string.line, column: add.string.column } }] });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.ok((await o.read()).includes("className={`${look} flex pl-3 ${on ? '' : 'hover:bg-x active:bg-y'}`}"), await o.read());
  assert.equal((await o.post('undo', { id: added.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('a class written in both branches is not changed in one of them without the string named', async (t) => {
  const o = await open(t);
  const hash = (await o.site('<div id="cond"', 'flex')).hash;
  // `flex` is in the then branch only here; a class written for both cases is refused unpinned
  const both = o.at('<div id="tern"');
  const r = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...both, from: 'grid', to: 'flex' }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const again = await o.post('swaps', { file: 'src/App.tsx', hash: r.body.hash, edits: [{ ...both, from: 'flex', to: 'block' }] });
  assert.equal(again.status, 400, JSON.stringify(again.body));
  assert.match(JSON.stringify(again.body), /more than one place.*tone/);
  assert.equal((await o.post('undo', { id: r.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('F1-01: an element that spreads its props in is written where its usage passes className', async (t) => {
  const o = await open(t);
  const usage = o.at('<Row id="row"');
  // the <a> has no className of its own: `{...props}` is the rest of Row's props, so its classes are the usage's
  const body = await o.site('<a href={to} {...props}', '', { chain: JSON.stringify([usage]) });
  const c = o.byToken(body);
  assert.deepEqual(Object.keys(c).sort(), ['flex', 'gap-2', 'p-3']);
  assert.deepEqual([c['p-3'].sites[0].kind, c['p-3'].sites[0].prop, c['p-3'].sites[0].line, c['p-3'].sites[0].element.line], ['usage', 'className', usage.line, usage.line]);
  assert.equal(body.add.kind, 'usage');
  // without the chain nothing is followed: still the plain refusal
  const alone = await o.site('<a href={to} {...props}', '');
  assert.match(alone.addRefused ?? alone.refused ?? '', /spreads props|built in code/);
  // the writer changes it at the usage, only there
  const s = c['p-3'].sites[0];
  const r = await o.post('swaps', { file: 'src/App.tsx', hash: body.hashes['src/App.tsx'], edits: [{ line: s.element.line, column: s.element.column, from: 'p-3', to: 'p-s4', at: { line: s.string.line, column: s.string.column } }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok((await o.read()).includes('<Row id="row" to="/one" className="flex gap-2 p-s4">'));
  assert.equal((await o.post('undo', { id: r.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

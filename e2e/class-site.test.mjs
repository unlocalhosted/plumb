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

async function open(t, set = files) {
  const root = await mkdtemp(join(repo, 'fixtures/.class-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(set)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
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

// ---------------------------------------------------------------- engine review 2 (docs/research/engine-review-2.md)
// A second project, the shapes the review found read or written wrong: a pinned write the server did not check (B6), a
// rest spread that kept className (B1), memo(function Inner) (B2), a branch read as worn (B3), an object prop read by
// path (B4/D3), clsx's identifier keys (B5), a shared variable as the place to add (R3), a same-named component on the
// chain (R4), a usage that spreads its props on (R5).
const review = {
  'package.json': '{ "name": "fx-r2", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0", "clsx": "^2" } }\n',
  'plumber.config.ts': `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,js,jsx,css}'] };\n`,
  'src/styles.css': '@import "tailwindcss";\n\n@theme {\n  --spacing-s2: 8px;\n  --spacing-s3: 12px;\n  --spacing-s4: 16px;\n}\n',
  'src/ui/Card.tsx': 'export function Card({ className, children }) { return <div className={`border ${className}`}>{children}</div>; }\n',
  'src/list/Card.tsx': "import { Card as Base } from '../ui/Card';\nexport function Card({ children }) { return <Base className=\"p-6\">{children}</Base>; }\n",
  'src/App.tsx': `import { memo } from 'react';
import clsx from 'clsx';
import { Card } from './list/Card';
const look = 'px-2.5 py-1 rounded';
const Panel = memo(function Inner({ className, children }) { return <div className={\`rounded-card \${className}\`}>{children}</div>; });
function Row({ className, ...rest }) { return <div className={className}><a {...rest} /></div>; }
function Row2(props) { const { className, ...rest } = props; return <div className={className}><b {...rest} /></div>; }
function Box({ styles }) { return <div className={styles.root}>b</div>; }
function Outer(props) { return <Panel {...props} />; }
export function A({ on, tone, open, bad, active }) {
  return (
    <section>
      <div id="obj" className={clsx('flex', { hidden: !open, 'text-red': bad, active })}>x</div>
      <Panel className="p-4 flex gap-2"><span id="p">panel</span></Panel>
      <Row id="row" href="/one" className="flex gap-2 p-3">row</Row>
      <Row2 id="row2" href="/two" className="flex p-3">row</Row2>
      <Box styles={{ 'root': 'p-4 flex' }} />
      <Box id="box2" styles={{ root: 'p-5 grid' }} />
      <div id="v1" className={look}>x</div>
      <div id="v2" className={look}>x</div>
      <div id="tern" className={tone ? 'flex gap-s2 p-s3' : 'grid'}>x</div>
      <div id="both" className={tone ? 'p-s3' : 'p-s2'}>x</div>
      <Outer className="p-2 m-1">o</Outer>
      <Card className="m-2">c</Card>
    </section>
  );
}
`,
};
const message = (r) => r.body.error ?? r.body.message ?? JSON.stringify(r.body);

test('B6: a pinned write is checked against the strings the element reaches: an add into a branch, a pin into a non-class string or into another element\'s string is refused', async (t) => {
  const o = await open(t, review);
  const body = await o.site('<div id="tern"', 'grid p-s3');
  const hash = body.hashes['src/App.tsx'];
  const grid = o.byToken(body).grid.sites[0], then = o.byToken(body)['p-s3'].sites[0];
  // an add pinned into the else branch: one case only
  const branch = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: grid.element.line, column: grid.element.column, from: '', to: 'pt-2', at: { line: grid.string.line, column: grid.string.column } }] });
  assert.equal(branch.status, 400, JSON.stringify(branch.body));
  assert.match(message(branch), /condition/i);
  // a pin into the href of <Row>: not a string of its classes
  const href = o.at('"/one"');
  const wrong = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...o.at('<Row id="row"'), from: '', to: 'pt-2', at: { line: href.line, column: href.column + 1 } }] });
  assert.equal(wrong.status, 400, JSON.stringify(wrong.body));
  // a pin into another element's string (#both's), sent with #tern
  const other = o.at("tone ? 'p-s3' : 'p-s2'");
  const stray = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...o.at('<div id="tern"'), from: 'p-s3', to: 'p-s4', at: { line: other.line, column: other.column + 8 } }] });
  assert.equal(stray.status, 400, JSON.stringify(stray.body));
  // the single swap says the same
  const single = await o.post('swap', { file: 'src/App.tsx', hash, ...o.at('<Row id="row"'), from: '', to: 'pt-2', at: { line: href.line, column: href.column + 1 } });
  assert.equal(single.status, 400, JSON.stringify(single.body));
  assert.equal(await o.read(), o.original);
  // a pin into the string the class is in still writes, in that case only
  const ok = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: then.element.line, column: then.element.column, from: 'p-s3', to: 'p-s4', at: { line: then.string.line, column: then.string.column } }] });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.ok((await o.read()).includes(`className={tone ? 'flex gap-s2 p-s4' : 'grid'}`));
  assert.equal((await o.post('undo', { id: ok.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('B1: a rest spread that the component took className out of carries no className: the usage\'s classes are not the inner element\'s', async (t) => {
  const o = await open(t, review);
  const usage = o.at('<Row id="row"');
  const body = await o.site('<a {...rest}', '', { chain: JSON.stringify([usage]) });
  assert.deepEqual(body.classes.map((c) => c.class), []);
  assert.notEqual(body.add?.kind, 'usage', JSON.stringify(body.add));
  // the same with the rest taken in the body: const { className, ...rest } = props
  const usage2 = o.at('<Row2 id="row2"');
  const body2 = await o.site('<b {...rest}', '', { chain: JSON.stringify([usage2]) });
  assert.deepEqual(body2.classes.map((c) => c.class), []);
  assert.notEqual(body2.add?.kind, 'usage', JSON.stringify(body2.add));
});

test('B2: memo(function Inner) assigned to Panel is the component Panel; without its usage, an add into the component is said to be shared', async (t) => {
  const o = await open(t, review);
  const usage = o.at('<Panel className');
  const body = await o.site('<div className={`rounded-card', 'rounded-card p-4', { chain: JSON.stringify([usage]) });
  const p4 = o.byToken(body)['p-4'];
  assert.deepEqual([p4.sites[0]?.kind, p4.sites[0]?.element.tag, p4.sites[0]?.line], ['usage', 'Panel', usage.line], JSON.stringify(p4));
  assert.deepEqual([body.add.kind, body.add.element.line], ['usage', usage.line]);
  // no chain: the class comes in from a usage that was not found, so an add into the component's own string changes every Panel
  const alone = await o.site('<div className={`rounded-card', 'rounded-card');
  assert.equal(alone.add?.shared, true, JSON.stringify(alone.add));
});

test('B4 + D3: an object prop read by path (styles.root) is followed to the value at that path; its keys are never classes', async (t) => {
  const o = await open(t, review);
  const usage = o.at('<Box styles');
  const element = o.at('<div className={styles.root}');
  const body = await o.site('<div className={styles.root}', '', { chain: JSON.stringify([usage]) });
  assert.deepEqual(body.classes.map((c) => c.class).sort(), ['flex', 'p-4']);
  const s = o.byToken(body)['p-4'].sites[0];
  assert.deepEqual([s.kind, s.prop, s.line, s.string.text, s.branch], ['usage', 'styles', usage.line, 'p-4 flex', undefined]);
  // an identifier key reads the same
  const usage2 = o.at('<Box id="box2"');
  const body2 = await o.site('<div className={styles.root}', '', { chain: JSON.stringify([usage2]) });
  assert.deepEqual(body2.classes.map((c) => c.class).sort(), ['grid', 'p-5']);
  // the write, pinned and sent with the element and chain it was read through
  const hash = body.hashes['src/App.tsx'];
  const edit = { line: s.element.line, column: s.element.column, from: 'p-4', to: 'p-6', at: { line: s.string.line, column: s.string.column } };
  const r = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ ...edit, of: { ...element, chain: [usage] } }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok((await o.read()).includes(`<Box styles={{ 'root': 'p-6 flex' }} />`), await o.read());
  assert.equal((await o.post('undo', { id: r.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('B5: the identifier keys of a clsx object are classes, under their condition; a write re-quotes a key that is not an identifier', async (t) => {
  const o = await open(t, review);
  const body = await o.site('<div id="obj"', '');
  const c = o.byToken(body);
  assert.deepEqual(Object.keys(c).sort(), ['active', 'flex', 'hidden', 'text-red']);
  assert.deepEqual(c.hidden.sites[0].branch, { condition: '!open', which: 'then' });
  assert.equal(c.flex.sites[0].branch, undefined);
  const hash = body.hashes['src/App.tsx'];
  const pin = (s, from, to) => ({ line: s.element.line, column: s.element.column, from, to, at: { line: s.string.line, column: s.string.column } });
  const hidden = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [pin(c.hidden.sites[0], 'hidden', 'sr-only')] });
  assert.equal(hidden.status, 200, JSON.stringify(hidden.body));
  assert.ok((await o.read()).includes(`clsx('flex', { 'sr-only': !open, 'text-red': bad, active })`), await o.read());
  assert.equal((await o.post('undo', { id: hidden.body.undo.id })).status, 200);
  // a shorthand key keeps its value
  const active = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [pin(c.active.sites[0], 'active', 'is-active')] });
  assert.equal(active.status, 200, JSON.stringify(active.body));
  assert.ok((await o.read()).includes(`clsx('flex', { hidden: !open, 'text-red': bad, 'is-active': active })`), await o.read());
  assert.equal((await o.post('undo', { id: active.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('R3: a variable other elements read is never where a class is added; a class in it can still be changed, and says how many read it', async (t) => {
  const o = await open(t, review);
  const body = await o.site('<div id="v1"', 'px-2.5');
  assert.equal(body.add, null, JSON.stringify(body.add));
  assert.match(body.addRefused ?? '', /look/);
  const s = o.byToken(body)['px-2.5'].sites[0];
  assert.equal(s.readers, 2);
  const hash = body.hashes['src/App.tsx'];
  const added = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: s.element.line, column: s.element.column, from: '', to: 'pl-3', at: { line: s.string.line, column: s.string.column } }] });
  assert.equal(added.status, 400, JSON.stringify(added.body));
  assert.equal(await o.read(), o.original);
  const changed = await o.post('swaps', { file: 'src/App.tsx', hash, edits: [{ line: s.element.line, column: s.element.column, from: 'px-2.5', to: 'px-3', at: { line: s.string.line, column: s.string.column } }] });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.equal((await o.post('undo', { id: changed.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('B3: a class in one branch is not read as worn by the props card, and is set only with its string named', async (t) => {
  const o = await open(t, review);
  const tern = o.at('<div id="tern"');
  const p = await o.get('props', tern);
  assert.equal(p.status, 200, JSON.stringify(p.body));
  const padding = p.body.props.find((x) => x.key === 'padding');
  assert.notEqual(padding.source, 'class', JSON.stringify(padding));
  assert.deepEqual([padding.class, padding.branch], ['p-s3', { condition: 'tone', which: 'then' }], JSON.stringify(padding));
  const unpinned = await o.post('set', { file: 'src/App.tsx', hash: p.body.hash, ...tern, key: 'padding', token: 's4' });
  assert.equal(unpinned.status, 400, JSON.stringify(unpinned.body));
  assert.match(message(unpinned), /tone/);
  assert.equal(await o.read(), o.original);
  const string = o.at("'flex gap-s2 p-s3'");
  const pinned = await o.post('set', { file: 'src/App.tsx', hash: p.body.hash, ...tern, key: 'padding', token: 's4', at: { line: string.line, column: string.column + 1 } });
  assert.equal(pinned.status, 200, JSON.stringify(pinned.body));
  assert.ok((await o.read()).includes(`className={tone ? 'flex gap-s2 p-s4' : 'grid'}`), await o.read());
  assert.equal((await o.post('undo', { id: pinned.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

test('R5: a usage that spreads its props on is followed up the chain to where className is passed', async (t) => {
  const o = await open(t, review);
  const spread = o.at('<Panel {...props}'), outer = o.at('<Outer className');
  const body = await o.site('<div className={`rounded-card', 'rounded-card p-2', { chain: JSON.stringify([spread, outer]) });
  const s = o.byToken(body)['p-2'].sites[0];
  assert.deepEqual([s?.kind, s?.prop, s?.line, s?.element.tag], ['usage', 'className', outer.line, 'Outer'], JSON.stringify(body));
});

test('R4: a usage named like the component but imported from another file is not its usage', async (t) => {
  const o = await open(t, review);
  const own = await o.atIn('src/ui/Card.tsx', '<div className');
  const base = await o.atIn('src/list/Card.tsx', '<Base className');
  const app = o.at('<Card className="m-2"');
  // the full chain: the ui Card is used as <Base> in list/Card.tsx
  const full = await o.get('class-site', { ...own, chain: JSON.stringify([base, app]) });
  assert.equal(full.status, 200, JSON.stringify(full.body));
  assert.deepEqual(full.body.classes.map((c) => c.class).sort(), ['border', 'p-6']);
  // a chain that skips it: App's <Card> is list/Card's Card, not this one, so m-2 is not this element's
  const skipped = await o.get('class-site', { ...own, chain: JSON.stringify([app]) });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.body));
  assert.deepEqual(skipped.body.classes.map((c) => c.class), ['border'], JSON.stringify(skipped.body.classes));
});

// ---------------------------------------------------------------- re-review (docs/research/engine-review-2.md, "Re-review")
// A third project: the import shapes a usage reaches its component through. A barrel (an index that re-exports), two hops
// with `export *` and a rename, a tsconfig `paths` entry and a vite alias that are not `@/` or `~/`, a default export
// wrapped in memo() or written as `export { Card as default }` (N1, N4); and the shapes that must not match: a same-named
// component declared in another file without an import (N2), a scoped package whose last segment is the file's name (N3).
const modules = {
  'package.json': '{ "name": "fx-rr2", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n',
  'plumber.config.ts': `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,js,jsx,css}'] };\n`,
  'tsconfig.json': '{ "compilerOptions": { "jsx": "react-jsx", "baseUrl": ".", "paths": { "ui-kit": ["./src/ui/index.ts"] } } }\n',
  'vite.config.ts': "import { fileURLToPath, URL } from 'node:url';\nexport default { resolve: { alias: { kit: fileURLToPath(new URL('./src/ui', import.meta.url)) } } };\n",
  'src/styles.css': '@import "tailwindcss";\n',
  'src/ui/card.tsx': 'export function Card({ className, children }) { return <div className={`border ${className}`}>{children}</div>; }\n',
  'src/ui/index.ts': "export { Card } from './card';\n",
  'src/more/index.ts': "export * from './tile';\n",
  'src/more/tile.ts': "export { Card as Tile } from '../ui';\n",
  'src/ui/dcard.tsx': "import { memo } from 'react';\nfunction Card({ className }) { return <div className={className}>x</div>; }\nexport default memo(Card);\n",
  'src/ui/ecard.tsx': 'function Card({ className }) { return <i className={className}>x</i>; }\nexport { Card as default };\n',
  'src/Barrel.tsx': "import { Card } from './ui';\nexport const B = () => <Card className=\"p-6\">b</Card>;\n",
  'src/Hops.tsx': "import { Tile } from './more';\nexport const H = () => <Tile className=\"p-3\">h</Tile>;\n",
  'src/Paths.tsx': "import { Card } from 'ui-kit';\nexport const P = () => <Card className=\"p-2\">p</Card>;\n",
  'src/Vite.tsx': "import { Card } from 'kit/card';\nexport const V = () => <Card className=\"p-1\">v</Card>;\n",
  'src/Local.tsx': 'function Card({ children }) { return <div>{children}</div>; }\nexport const L = () => <Card className="p-9">l</Card>;\n',
  'src/Scoped.tsx': "import { Card } from '@acme/card';\nexport const S = () => <Card className=\"p-7\">s</Card>;\n",
  'src/Deflt.tsx': "import Card from './ui/dcard';\nexport const D = () => <Card className=\"p-5\">d</Card>;\n",
  'src/Deflt2.tsx': "import Card from './ui/ecard';\nexport const E = () => <Card className=\"p-4\">e</Card>;\n",
  'src/App.tsx': `const look = 'a b';
const o = { look };
function Row3({ className: c, ...rest }) { const { className } = rest; return <a className={className}>r</a>; }
export function A() {
  return (
    <section>
      <div id="rd" className={look}>x</div>
      <Row3 id="r3" className="p-8">r</Row3>
    </section>
  );
}
`,
};

test('N1: a usage that imports its component through a barrel, two re-export hops, a tsconfig path or a vite alias is its usage', async (t) => {
  const o = await open(t, modules);
  const card = await o.atIn('src/ui/card.tsx', '<div className');
  const cases = [['src/Barrel.tsx', '<Card className', 'p-6'], ['src/Hops.tsx', '<Tile className', 'p-3'], ['src/Paths.tsx', '<Card className', 'p-2'], ['src/Vite.tsx', '<Card className', 'p-1']];
  const seen = [];
  for (const [file, needle, cls] of cases) {
    const usage = await o.atIn(file, needle);
    const r = await o.get('class-site', { ...card, chain: JSON.stringify([usage]) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const s = r.body.classes.find((c) => c.class === cls)?.sites[0];
    seen.push([file, s?.kind, s?.element.file, r.body.add?.kind, r.body.add?.shared ?? false]);
  }
  assert.deepEqual(seen, cases.map(([file]) => [file, 'usage', file, 'usage', false]));
});

test('N2 + N3: a same-named component declared in another file, or imported from a scoped package, is not the usage', async (t) => {
  const o = await open(t, modules);
  const card = await o.atIn('src/ui/card.tsx', '<div className');
  for (const [file, cls] of [['src/Local.tsx', 'p-9'], ['src/Scoped.tsx', 'p-7']]) {
    const usage = await o.atIn(file, '<Card className');
    const r = await o.get('class-site', { ...card, chain: JSON.stringify([usage]) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.classes.map((c) => c.class), ['border'], `${file}: ${JSON.stringify(r.body.classes.map((c) => [c.class, c.sites.map((s) => s.element.file)]))}`);
    assert.ok(!r.body.classes.some((c) => c.class === cls));
  }
});

test('N4: export default memo(Card) and export { Card as default } are default exports: a default import of either is the usage', async (t) => {
  const o = await open(t, modules);
  for (const [own, file, needle, cls] of [['src/ui/dcard.tsx', 'src/Deflt.tsx', '<div className', 'p-5'], ['src/ui/ecard.tsx', 'src/Deflt2.tsx', '<i className', 'p-4']]) {
    const el = await o.atIn(own, needle), usage = await o.atIn(file, '<Card className');
    const r = await o.get('class-site', { ...el, classes: cls, chain: JSON.stringify([usage]) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const s = r.body.classes[0].sites[0];
    assert.deepEqual([s?.kind, s?.element.file], ['usage', file], `${file}: ${JSON.stringify(r.body.classes[0])}`);
  }
});

test('N8: a shorthand property reads its variable once', async (t) => {
  const o = await open(t, modules);
  const rd = await o.site('<div id="rd"', 'a');
  assert.equal(o.byToken(rd).a.sites[0].readers, 2, JSON.stringify(rd.classes));
});

test('N9: a key taken out of a rest is not read from it', async (t) => {
  const o = await open(t, modules);
  const usage = o.at('<Row3 id="r3"');
  const r3 = await o.site('<a className={className}', '', { chain: JSON.stringify([usage]) });
  assert.deepEqual(r3.classes.map((c) => c.class), [], JSON.stringify(r3.classes));
});

test('N5: a swap that only adds a class beside one it keeps is an add: never into a variable other elements read', async (t) => {
  const o = await open(t, review);
  const body = await o.site('<div id="v1"', 'px-2.5');
  const s = o.byToken(body)['px-2.5'].sites[0];
  assert.equal(s.readers, 2);
  const beside = await o.post('swaps', { file: 'src/App.tsx', hash: body.hashes['src/App.tsx'], edits: [{ line: s.element.line, column: s.element.column, from: 'px-2.5', to: 'px-2.5 pl-3', at: { line: s.string.line, column: s.string.column } }] });
  assert.equal(beside.status, 400, JSON.stringify(beside.body));
  assert.match(message(beside), /look/);
  assert.equal(await o.read(), o.original);
  // beside a class in a branch it stays with the class it overrides (the branch's condition is its own)
  const tern = await o.site('<div id="tern"', 'p-s3');
  const b = o.byToken(tern)['p-s3'].sites[0];
  const inBranch = await o.post('swaps', { file: 'src/App.tsx', hash: tern.hashes['src/App.tsx'], edits: [{ line: b.element.line, column: b.element.column, from: 'p-s3', to: 'p-s3 pl-s4', at: { line: b.string.line, column: b.string.column } }] });
  assert.equal(inBranch.status, 200, JSON.stringify(inBranch.body));
  assert.ok((await o.read()).includes(`className={tone ? 'flex gap-s2 p-s3 pl-s4' : 'grid'}`), await o.read());
  assert.equal((await o.post('undo', { id: inBranch.body.undo.id })).status, 200);
  assert.equal(await o.read(), o.original);
});

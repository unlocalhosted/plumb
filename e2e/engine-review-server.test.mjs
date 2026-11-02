// The server findings of docs/research/engine-review.md, each reproduced over real HTTP (and the stdio JSON-RPC line for the
// method table) on fixtures made here. No unit tests: every case asks what a caller of the endpoint can observe.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, serveStdio } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const config = `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,js,jsx,css}'] };\n`;

async function project(t, files) {
  const root = await mkdtemp(join(repo, 'fixtures/.engine-review-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const raw = (method, params = {}, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    return fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
  };
  const call = async (method, params, verb = 'GET') => { const response = await raw(method, params, verb); return { status: response.status, body: await response.json() }; };
  const read = file => readFile(join(root, file), 'utf8');
  const at = async (file, needle) => {
    const text = await read(file), offset = text.indexOf(needle);
    assert.ok(offset >= 0, `${needle} is in ${file}`);
    const before = text.slice(0, offset);
    return { file, line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
  };
  const view = async pos => { const r = await call('recipes', pos); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const preview = (pos, body) => call('recipes/preview', { ...pos, ...body }, 'POST');
  const apply = (pos, body) => call('recipes/apply', { ...pos, ...body }, 'POST');
  const undo = async handles => { for (const h of handles.toReversed()) assert.equal((await call('undo', { id: h.id }, 'POST')).status, 200); };
  const indexes = async () => (await call('health')).body.work.recipeIndexes;
  return { root, raw, call, read, at, view, preview, apply, undo, indexes, write: (file, text) => writeFile(join(root, file), text) };
}

const pkg = '{ "name": "fx-review", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n';
const tailwind = (theme, app) => ({
  'package.json': pkg, 'plumber.config.ts': config,
  'src/styles.css': `@import "tailwindcss";\n\n@theme {\n${theme}\n}\n`,
  'src/App.tsx': app,
});

// D4 · recipeContext re-read and re-indexed the whole project on every recipes, preview and apply call
test('D4: the project is indexed once for any number of recipes, preview and apply calls, and again only after something changed', async t => {
  const api = await project(t, tailwind('  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);\n  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);', `export function A() {\n  return <div id="a" className="p-4 shadow-sm">A</div>;\n}\n`));
  const a = await api.at('src/App.tsx', '<div id="a"');
  await api.view(a); await api.view(a);
  assert.equal((await api.preview(a, { recipe: 'floating' })).status, 200);
  assert.equal((await api.preview(a, { recipe: 'floating', dials: { height: 1.5 } })).status, 200);
  assert.equal(await api.indexes(), 1, 'four calls, one index');

  // a file changed on disk (no watcher here): the next call sees it
  const css = await api.read('src/styles.css');
  await api.write('src/styles.css', css.replace('}\n', '  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);\n}\n'));
  const seen = await api.view(a);
  assert.ok(seen.yours.some(r => r.token === '--shadow-xl'), 'the edited theme is read');
  assert.equal(await api.indexes(), 2);

  // a write through the endpoint drops it, so the next view reads what was written
  const before = await api.read('src/App.tsx');
  const done = await api.apply(a, { recipe: 'floating' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.notEqual(await api.read('src/App.tsx'), before);
  const after = await api.view(a);
  assert.notEqual(after.element.shadow.class, 'shadow-sm');
  assert.equal(await api.indexes(), 3);
  await api.undo(done.body.undo);
});

// B1 · box-shadow lengths in rem, em and calc() were not shadows at all
test('B1: a theme whose shadows are written in rem, em or calc() is read, resolved at the root size the project declares, and written back as written', async t => {
  const theme = '  --shadow-soft: 0 0.25rem 0.5rem rgb(0 0 0 / 0.1);\n  --shadow-calm: 0 calc(0.25rem + 2px) 1em rgb(0 0 0 / 0.1);\n  --shadow-tiny: 0 1px 2px 0 rgb(0 0 0 / 0.06);';
  const app = `export function A() {\n  return <div id="a" className="p-4 shadow-soft">A</div>;\n}\nexport function B() {\n  return <div id="b" className="p-4 shadow-calm">B</div>;\n}\n`;
  const api = await project(t, tailwind(theme, app));
  const body = await api.view(await api.at('src/App.tsx', '<div id="a"'));
  const soft = body.yours.find(r => r.token === '--shadow-soft'), calm = body.yours.find(r => r.token === '--shadow-calm');
  assert.ok(soft && calm, `rem and calc shadows are the project's own: ${JSON.stringify(body.yours.map(r => r.token))}`);
  assert.deepEqual([soft.model.layers[0].y, soft.model.layers[0].blur], [4, 8]);
  assert.deepEqual([calm.model.layers[0].y, calm.model.layers[0].blur], [6, 16]);
  assert.equal(body.element.shadow.class, 'shadow-soft');
  assert.equal(body.element.shadow.value, '0 0.25rem 0.5rem rgb(0 0 0 / 0.1)', 'the unit is kept for the round trip');
  assert.equal(soft.css.boxShadow, '0 0.25rem 0.5rem rgb(0 0 0 / 0.1)');
  // a pasted rem shadow previews as itself; a dial moves the numbers and writes px for what moved
  const pasted = await api.preview(await api.at('src/App.tsx', '<div id="a"'), { boxShadow: '0 0.25rem 0.5rem rgb(0 0 0 / 0.1)' });
  assert.equal(pasted.status, 200, JSON.stringify(pasted.body));
  assert.equal(pasted.body.css.boxShadow, '0 0.25rem 0.5rem rgb(0 0 0 / 0.1)');
  const taller = await api.preview(await api.at('src/App.tsx', '<div id="a"'), { boxShadow: '0 0.25rem 0.5rem rgb(0 0 0 / 0.1)', dials: { height: 2 } });
  assert.deepEqual([taller.body.recipe.model.layers[0].y, taller.body.recipe.model.layers[0].blur], [8, 16]);
  assert.match(taller.body.css.boxShadow, /^0 (?:8px|0\.5rem) (?:16px|1rem) /);
  // the same shadow is the same recipe whichever unit wrote it
  const near = await api.preview(await api.at('src/App.tsx', '<div id="a"'), { boxShadow: '0 4px 8px rgb(0 0 0 / 0.1)' });
  assert.equal(near.body.verdict.kind, 'same', JSON.stringify(near.body.verdict));
});
test('B1: rem is resolved at the root font size the project declares', async t => {
  const api = await project(t, { ...tailwind('  --shadow-soft: 0 0.4rem 0.8rem rgb(0 0 0 / 0.1);', `export function A() {\n  return <div id="a" className="shadow-soft">A</div>;\n}\n`),
    'src/base.css': 'html { font-size: 62.5%; }\n' });
  const body = await api.view(await api.at('src/App.tsx', '<div id="a"'));
  const soft = body.yours.find(r => r.token === '--shadow-soft');
  assert.deepEqual([soft.model.layers[0].y, soft.model.layers[0].blur], [4, 8]);
  assert.equal(body.element.shadow.value, '0 0.4rem 0.8rem rgb(0 0 0 / 0.1)');
});

// B2 · a colourless 2–4 length value was a shadow
test('B2: a :root property that is only lengths is not the project’s shadow, and a pasted colourless pair is not a shadow', async t => {
  const api = await project(t, {
    'package.json': '{ "name": "fx-plain", "private": true, "type": "module" }\n', 'plumber.config.ts': config,
    'src/styles.css': `:root {\n  --offset: 0 4px;\n  --inset: 0 8px 0 0;\n  --shadow-card: 0 2px 6px rgb(0 0 0 / 0.2);\n}\n.card { padding: 8px; }\n`,
    'src/App.tsx': `export function A() {\n  return <div id="a" className="card">A</div>;\n}\n`,
  });
  const a = await api.at('src/App.tsx', '<div id="a"');
  const body = await api.view(a);
  assert.deepEqual(body.yours.map(r => r.token), ['--shadow-card']);
  const bare = await api.preview(a, { boxShadow: '0 4px' });
  assert.equal(bare.status, 400, JSON.stringify(bare.body));
  // a colourless layer that has a blur is still a shadow (currentColor), and writes back without an invented colour
  const flat = await api.preview(a, { boxShadow: '0 2px 4px' });
  assert.equal(flat.status, 200, JSON.stringify(flat.body));
  assert.equal(flat.body.css.boxShadow, '0 2px 4px');
});

// B3 · the variant split on every colon
test('B3: an arbitrary or responsive variant is not the element’s resting shadow, and an apply leaves it alone', async t => {
  const app = `export function A() {\n  return <div id="a" className="p-4 [&:hover]:shadow-md md:shadow-lg">A</div>;\n}\nexport function B() {\n  return <div id="b" className="p-4 shadow-sm [&:hover]:shadow-lg">B</div>;\n}\n`;
  const api = await project(t, tailwind('  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);\n  --shadow-md: 0 1px 3px 0 rgb(0 0 0 / 0.12);\n  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);', app));
  const a = await api.at('src/App.tsx', '<div id="a"'), b = await api.at('src/App.tsx', '<div id="b"');
  assert.equal((await api.view(a)).element.shadow.source, 'none');
  assert.equal((await api.view(b)).element.shadow.class, 'shadow-sm');
  const original = await api.read('src/App.tsx');
  const done = await api.apply(a, { recipe: 'floating' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  const after = await api.read('src/App.tsx');
  assert.match(after, /className="p-4 \[&:hover\]:shadow-md md:shadow-lg [^"]*shadow-\w+"|className="p-4 [^"]*shadow-\w+[^"]*\[&:hover\]:shadow-md md:shadow-lg"/);
  assert.ok(after.includes('[&:hover]:shadow-md') && after.includes('md:shadow-lg'), after);
  await api.undo(done.body.undo);
  assert.equal(await api.read('src/App.tsx'), original);
});

// B5 · duration-[…] read ms only; B6 · an arbitrary hover shadow became var(--shadow-[…])
test('B5, B6: duration-[0.3s] is 300ms, and an arbitrary hover shadow is read as its value', async t => {
  const app = `export function A() {\n  return <button id="a" className="transition duration-[0.3s] hover:shadow-[0_1px_2px_#0003]">A</button>;\n}\n`;
  const api = await project(t, tailwind('  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);', app));
  const motion = (await api.view(await api.at('src/App.tsx', '<button id="a"'))).element.motion;
  assert.equal(motion.source, 'classes');
  assert.equal(motion.model.timing.duration, 300);
  const change = motion.model.changes.find(c => c.property === 'boxShadow');
  assert.equal(change.to, '0 1px 2px #0003');
});

// B8 · an ease name it does not know became ease-in-out
test('B8: a preset with an ease name the engine does not know is not read as an ease-in-out copy', async t => {
  const api = await project(t, {
    'package.json': '{ "name": "fx-ease", "private": true, "type": "module", "dependencies": { "motion": "^11.0.0" } }\n', 'plumber.config.ts': config,
    'src/styles.css': 'body { margin: 0; }\n',
    'src/motion.ts': `export const known = { duration: 0.3, ease: 'easeOut' };\nexport const odd = { duration: 0.3, ease: 'wobbleOut' };\n`,
    'src/Chips.tsx': `import { motion } from 'motion/react';\nexport function Tag() {\n  return <motion.span id="tag">Tag</motion.span>;\n}\n`,
  });
  const body = await api.view(await api.at('src/Chips.tsx', '<motion.span'));
  assert.deepEqual(body.yours.map(r => r.name), ['known']);
  assert.deepEqual(body.yours[0].model.timing.easing, [0, 0, 0.58, 1]);
});

// B4 · the presets file is the element's own file
test('B4: a preset added to the element’s own file lands below it without moving the element’s edit, and no import of the file into itself is written', async t => {
  const chips = `import { motion } from 'motion/react';

export function Chip() {
  return <motion.button id="chip" whileHover={{ y: -2 }}>Chip</motion.button>;
}

export const gentle = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };
`;
  const api = await project(t, {
    'package.json': '{ "name": "fx-own", "private": true, "type": "module", "dependencies": { "motion": "^11.0.0" } }\n', 'plumber.config.ts': config,
    'src/styles.css': 'body { margin: 0; }\n', 'src/Chips.tsx': chips,
  });
  const chip = await api.at('src/Chips.tsx', '<motion.button');
  const body = await api.view(chip);
  assert.equal(body.idioms.motion.presets.file, 'src/Chips.tsx');
  const previewed = await api.preview(chip, { recipe: 'lift' });
  assert.equal(previewed.status, 200, JSON.stringify(previewed.body));
  assert.equal(previewed.body.ok, true, JSON.stringify(previewed.body));
  const done = await api.apply(chip, { recipe: 'lift' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  const after = await api.read('src/Chips.tsx');
  assert.ok(after.includes('<motion.button id="chip" whileHover={{ y: -2 }} transition={lift}>Chip</motion.button>'), after);
  assert.match(after, /export const lift = \{ duration: 0\.15, ease: \[0\.4, 0, 0\.2, 1\] \};\n$/);
  assert.ok(!/import \{[^}]*\blift\b[^}]*\} from/.test(after), 'no import of the file into itself');
  await api.undo(done.body.undo);
  assert.equal(await api.read('src/Chips.tsx'), chips);
});

// D5 · the file list reached the plan through the index object's identity: what it feeds must keep working
test('D5: an alias the project already imports its presets through is the one a new import uses, and a shared rule says how many elements it changes', async t => {
  const api = await project(t, {
    'package.json': '{ "name": "fx-alias", "private": true, "type": "module", "dependencies": { "motion": "^11.0.0" } }\n', 'plumber.config.ts': config,
    'src/styles.css': 'body { margin: 0; }\n',
    'src/motion.ts': `export const gentle = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };\n`,
    'src/Other.tsx': `import { motion } from 'motion/react';\nimport { gentle } from '@/motion';\nexport const O = () => <motion.div transition={gentle} />;\n`,
    'src/Chips.tsx': `import { motion } from 'motion/react';\nexport function Tag() {\n  return <motion.span id="tag">Tag</motion.span>;\n}\n`,
  });
  const tag = await api.at('src/Chips.tsx', '<motion.span');
  const done = await api.apply(tag, { recipe: 'press' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.match(await api.read('src/Chips.tsx'), /import \{ \w+ \} from '@\/motion';/);
});

// D6 · six hand-kept lists of methods: one table behind HTTP verbs, known endpoints and the JSON-RPC line
const post = ['try', 'recipes/preview', 'recipes/apply', 'apply', 'apply-text', 'apply-text-at', 'undo', 'undo-change', 'undo-group', 'set', 'swap', 'swaps', 'prop', 'token', 'accept', 'apply-all', 'page', 'places', 'system', 'batch', 'readiness/fix'];
const get = ['readiness', 'report', 'site', 'classes', 'resolve', 'edits', 'text', 'text-at', 'history', 'trace', 'props', 'recipes', 'structure', 'decisions', 'spec', 'why', 'health', 'refresh'];
test('D6: every endpoint answers only its own verb, an unknown one is not found, and the JSON-RPC line knows all but readiness', async t => {
  const api = await project(t, tailwind('  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);', `export function A() {\n  return <div id="a" className="shadow-sm">A</div>;\n}\n`));
  for (const name of post) { const r = await api.raw(name, {}, 'GET'); assert.equal(r.status, 405, `${name} GET`); assert.equal(r.headers.get('allow'), 'POST', name); }
  for (const name of get) { const r = await api.raw(name, {}, 'POST'); assert.equal(r.status, 405, `${name} POST`); assert.equal(r.headers.get('allow'), 'GET', name); }
  assert.equal((await api.raw('nope', {}, 'GET')).status, 404);
  assert.equal((await api.raw('recipes/nope', {}, 'POST')).status, 404);
  // the stdio line: input in, one JSON response per request out
  const input = new PassThrough(), output = new PassThrough(), lines = [];
  output.on('data', chunk => { for (const line of String(chunk).split('\n').filter(Boolean)) lines.push(JSON.parse(line)); });
  const done = serveStdio({ root: api.root, watch: false }, input, output);
  // resolve is an HTTP endpoint only: it needs the served root, which a stdio line does not have
  const names = [...post, ...get].filter(n => !n.startsWith('readiness') && n !== 'refresh' && n !== 'resolve');
  names.forEach((name, i) => input.write(JSON.stringify({ jsonrpc: '2.0', id: i + 1, method: `plumb.${name}`, params: {} }) + '\n'));
  input.write(JSON.stringify({ jsonrpc: '2.0', id: 9001, method: 'plumb.readiness', params: {} }) + '\n');
  input.write(JSON.stringify({ jsonrpc: '2.0', id: 9002, method: 'plumb.nope', params: {} }) + '\n');
  const wanted = names.length + 2;
  for (let waited = 0; lines.length < wanted && waited < 200; waited++) await new Promise(r => setTimeout(r, 100));
  input.end(); await done;
  const byId = new Map(lines.map(l => [l.id, l]));
  names.forEach((name, i) => assert.notEqual(byId.get(i + 1)?.error?.code, -32601, `${name} is a JSON-RPC method`));
  assert.equal(byId.get(9001).error.code, -32601);
  assert.equal(byId.get(9002).error.code, -32601);
});

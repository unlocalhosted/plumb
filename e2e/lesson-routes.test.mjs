// @tier cli
// What the project page's lesson asks of the local server (overlay/src/lesson.js, docs/design/onboarding.md "The
// lesson"), through HTTP as the page asks it: the page data it draws from, the system written to the token file as
// one undoable write, and Set it up writing your rules and remembering today's state. Each test is a failure seen on
// 2026-11-14 (docs/journey.md, entry 34).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { serve } from '../dist/session/server.js';
import { fixture } from './helpers/layouts.mjs';

const TOKENS = `:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --gap-sm: 6px; --gap-md: 16px; --gap-lg: 24px; --gap-xl: 32px;
  --radius-sm: 6px; --radius-md: 12px;
  --ink: #1d1b17; --pink: #f24a9f; --text-primary: #1d1b17;
}
`;
const STYLES = `@import "./tokens.css";
.card { padding: var(--space-4); gap: var(--space-3); border-radius: var(--radius-md); color: var(--text-primary); }
.row { gap: var(--gap-md); padding: var(--gap-sm) var(--gap-lg); margin-top: var(--gap-xl); }
.note { padding: 10px; border-radius: 9px; }
`;

async function page(t) {
  const project = await fixture(t, {
    'package.json': { name: 'lesson-app', private: true, dependencies: { react: '19.0.0' } },
    'src/tokens.css': TOKENS, 'src/card.css': STYLES,
    'src/main.jsx': "import './card.css';\nexport default function App() { return <section className=\"card\" />; }\n",
  });
  const server = await serve({ root: project.root, watch: false, page: true }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`, headers = { 'x-plumb-token': server.info.token };
  const get = path => fetch(base + path, { headers }).then(r => r.json());
  const post = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  return { root: project.root, base, get, post, tokens: () => readFile(join(project.root, 'src/tokens.css'), 'utf8') };
}

test('the page data carries each token as written, and the gaps typed by hand', { timeout: 90000 }, async (t) => {
  const { get } = await page(t);
  const data = await get('/__plumb/system');
  const colour = data.reading.find(k => k.family === 'color'), all = colour.groups.flatMap(g => g.tokens);
  assert.ok(all.some(t => t.name === '--text-primary' && t.raw === '#1d1b17'), 'a colour named --text-primary is a colour, with its written value');
  assert.deepEqual(data.spacing.strays.map(s => s.px).sort((a, b) => a - b), [10], 'the 10px padding typed by hand');
  assert.ok(data.spacing.steps.some(s => s.px === 16), 'the spacing steps, whatever they are named');
  assert.ok(data.radius.steps.length >= 2 && data.radius.strays.some(s => s.px === 9), 'corners too');
});

test('a chosen system is written as aliases and added steps, in order, and one Undo puts the file back byte for byte', { timeout: 90000 }, async (t) => {
  // before: added steps landed in reverse order
  const { post, tokens } = await page(t);
  const before = await tokens();
  const files = [{ file: 'src/tokens.css',
    set: [{ name: '--space-1', value: 'var(--spacing-1)' }, { name: '--space-2', value: 'var(--spacing-2)' }, { name: '--gap-sm', value: 'var(--spacing-2)' }, { name: '--gap-xl', value: 'var(--spacing-8)' }],
    add: [{ after: '--space-1', name: '--spacing-1', value: '4px' }, { after: '--space-1', name: '--spacing-2', value: '8px' }, { after: '--space-1', name: '--spacing-8', value: '32px' }] }];
  const wrote = await post('/__plumb/system-apply', { files, label: 'Your system' });
  assert.equal(wrote.status, 200, JSON.stringify(wrote.body));
  const after = await tokens();
  assert.match(after, /--space-1: var\(--spacing-1\);/);
  assert.match(after, /--gap-sm: var\(--spacing-2\);/);
  const order = ['--spacing-1:', '--spacing-2:', '--spacing-8:'].map(name => after.indexOf(name));
  assert.ok(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], `in order: ${order}`);
  assert.ok(after.includes('--radius-md: 12px') && after.includes('--pink: #f24a9f'), 'the rest of the file is untouched');
  const undone = await post('/__plumb/undo', { id: wrote.body.undo.id });
  assert.equal(undone.status, 200, JSON.stringify(undone.body));
  assert.equal(await tokens(), before);
});

test('a system write naming a token that isn\'t there is refused, and nothing is written', { timeout: 90000 }, async (t) => {
  const { post, tokens } = await page(t);
  const before = await tokens();
  const refused = await post('/__plumb/system-apply', { files: [{ file: 'src/tokens.css', set: [{ name: '--space-1', value: 'var(--spacing-1)' }, { name: '--space-99', value: '1px' }], add: [] }] });
  assert.notEqual(refused.status, 200);
  assert.match(JSON.stringify(refused.body), /--space-99 isn't in src\/tokens\.css/);
  assert.equal(await tokens(), before, 'the first edit did not land either');
});

test('Set it up writes your rules as the config and remembers what is already wrong, so only new problems count', { timeout: 120000 }, async (t) => {
  const { root, post } = await page(t);
  const set = await post('/__plumb/setup', { decisions: { spacing: { from: ['css:src/tokens.css#--space-*', 'css:src/tokens.css#--gap-*'] }, radius: { from: ['css:src/tokens.css#--radius-*'] }, color: { from: ['css:src/tokens.css'] } } });
  assert.equal(set.status, 200, JSON.stringify(set.body));
  const config = await readFile(join(root, 'plumber.config.ts'), 'utf8');
  assert.match(config, /"css:src\/tokens\.css#--space-\*"/);
  assert.match(config, /"css:src\/tokens\.css#--gap-\*"/);
  assert.match(config, /"css:src\/tokens\.css#--radius-\*"/);
  assert.match(config, /"color": \{\s*"from": \[\s*"css:src\/tokens\.css"/);
  const ledger = (await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const debt = ledger.filter(entry => entry.kind === 'debt');
  assert.equal(set.body.recorded, debt.length);
  assert.ok(debt.some(entry => /10px|9px/.test(JSON.stringify(entry))), 'the values typed by hand are remembered');
});

test('Set it up refuses sources that are not css: or theme: lines', { timeout: 90000 }, async (t) => {
  const { post } = await page(t);
  const refused = await post('/__plumb/setup', { decisions: { spacing: { from: ['../../etc/passwd'] } } });
  assert.notEqual(refused.status, 200);
});

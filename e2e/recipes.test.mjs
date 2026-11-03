// The recipe engine (docs/briefs/recipe-engine.md): any source in, the project's own idiom out. Real server, real HTTP,
// on three fixtures made here: Tailwind v4 with cn(), plain CSS custom properties, motion/react with a presets file.
// Each proves reuse before adding, the project's own naming and placement, a diff before the write, a plain refusal
// where it cannot write safely, and undo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { link, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const config = `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,css}'] };\n`;

async function project(t, files) {
  const root = await mkdtemp(join(repo, 'fixtures/.recipes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const read = file => readFile(join(root, file), 'utf8');
  // the line and column of the element a needle opens
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
  return { root, call, read, at, view, preview, apply, undo };
}

const tailwind = {
  'package.json': '{ "name": "fx-tailwind", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n',
  'plumber.config.ts': config,
  'src/styles.css': `@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --shadow-md: 0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.12);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
}
`,
  'src/lib/cn.ts': `export function cn(...parts: (string | undefined | false)[]) { return parts.filter(Boolean).join(' '); }\n`,
  'src/main.tsx': `import { createRoot } from 'react-dom/client';\nimport { Card } from './App';\nimport './styles.css';\ncreateRoot(document.getElementById('root')!).render(<Card />);\n`,
  'src/App.tsx': `import { cn } from './lib/cn';

export function Card({ tone }: { tone?: string }) {
  return <div id="card" className={cn('rounded-lg bg-white p-4 shadow-sm', tone)}>Card</div>;
}
export function Panel() {
  return <section id="panel" className="rounded-lg p-4">Panel</section>;
}
export function Button() {
  return <button id="btn" className="rounded px-3 py-1 transition duration-300 ease-snappy hover:bg-gray-100">Go</button>;
}
export function Dynamic({ className }: { className?: string }) {
  return <div id="dyn" className={className}>Dynamic</div>;
}
`,
};

test('Tailwind v4 with cn(): the project’s own shadows and easings come first, a pack recipe is mapped onto them, and applying reuses, moves or adds in the theme’s own shape', async t => {
  const api = await project(t, tailwind);
  const card = await api.at('src/App.tsx', '<div id="card"'), panel = await api.at('src/App.tsx', '<section id="panel"'), btn = await api.at('src/App.tsx', '<button id="btn"');
  const original = { app: await api.read('src/App.tsx'), css: await api.read('src/styles.css') };

  // what the project has, listed first, in its own naming
  const body = await api.view(panel);
  assert.equal(body.idioms.tailwind.themeFile, 'src/styles.css');
  assert.equal(body.idioms.classes, 'cn');
  assert.deepEqual(body.yours.filter(r => r.kind === 'shadow').map(r => [r.token, r.class]), [['--shadow-sm', 'shadow-sm'], ['--shadow-md', 'shadow-md'], ['--shadow-lg', 'shadow-lg']]);
  assert.deepEqual(body.yours.filter(r => r.kind === 'motion').map(r => r.token), ['--ease-snappy']);
  assert.deepEqual(body.yours.map(r => r.kind), ['shadow', 'shadow', 'shadow', 'motion']);
  assert.equal(body.yours[1].derived.layers, 2);
  // a pack recipe is mapped onto the project's own: close, same or new, in plain words
  const raised = body.packs.find(p => p.recipe.id === 'raised');
  assert.equal(raised.verdict.kind, 'close');
  assert.equal(raised.nearest.token, '--shadow-md');
  assert.match(raised.verdict.text, /^close to your shadow-md: .*alpha 0\.1, yours 0\.12/);
  assert.equal(body.packs.find(p => p.recipe.id === 'floating').verdict.kind, 'same'); // Tailwind's lg is the project's lg
  assert.equal(body.packs.find(p => p.recipe.id === 'overlay').verdict.kind, 'new');
  assert.deepEqual(body.element.shadow, { source: 'none' });
  assert.equal((await api.view(card)).element.shadow.class, 'shadow-sm');
  // a recipe that needs a library is shown, marked, never written
  const reorder = body.packs.find(p => p.recipe.id === 'reorder');
  assert.match(reorder.recipe.blocked, /needs motion\/react/);
  assert.equal((await api.apply(panel, { recipe: 'reorder' })).status, 400);

  // use: the project's own class goes on the element (inside cn(), in place of the one it had); nothing is added to the theme
  const previewed = await api.preview(card, { recipe: 'raised' });
  assert.equal(previewed.status, 200, JSON.stringify(previewed.body));
  assert.deepEqual([previewed.body.ok, previewed.body.choice, previewed.body.uses.class], [true, 'use', 'shadow-md']);
  assert.deepEqual(previewed.body.writes.map(w => w.file), ['src/App.tsx']);
  assert.match(previewed.body.writes[0].diff, /^- .*shadow-sm/m);
  assert.match(previewed.body.writes[0].diff, /^\+ .*cn\('rounded-lg bg-white p-4 shadow-md', tone\)/m);
  assert.equal(await api.read('src/App.tsx'), original.app); // a preview writes nothing
  const used = await api.apply(card, { recipe: 'raised' });
  assert.equal(used.status, 200, JSON.stringify(used.body));
  assert.ok((await api.read('src/App.tsx')).includes(`cn('rounded-lg bg-white p-4 shadow-md', tone)`));
  assert.equal(await api.read('src/styles.css'), original.css);
  await api.undo(used.body.undo);
  assert.equal(await api.read('src/App.tsx'), original.app);

  // move: the project's token takes the recipe's value (with its credit), the element wears it
  const moved = await api.apply(panel, { recipe: 'raised', choice: 'move' });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  const css = await api.read('src/styles.css');
  assert.match(css, /\/\* Tailwind CSS default theme, \(c\) Tailwind Labs, Inc\., MIT https:\/\/github\.com\/tailwindlabs\/tailwindcss\/blob\/main\/packages\/tailwindcss\/theme\.css \*\/\n  --shadow-md: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.1\), 0 1px 2px -1px rgb\(0 0 0 \/ 0\.1\);/);
  assert.ok((await api.read('src/App.tsx')).includes('<section id="panel" className="rounded-lg p-4 shadow-md">'));
  assert.equal(moved.body.undo.length, 1, 'two files, one write: one undo (N5)');
  await api.undo(moved.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);

  // add: new to the project, so a token under its naming (--shadow-*, after the last of them, in its indentation), credited, used on the element
  const added = await api.apply(panel, { recipe: 'overlay' });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const after = await api.read('src/styles.css');
  assert.match(after, /  --shadow-lg: [^\n]*\n  \/\* [^\n]*MIT https:\/\/github\.com\/tailwindlabs[^\n]*\*\/\n  --shadow-overlay: 0 25px 50px -12px rgb\(0 0 0 \/ 0\.25\);\n\n  --ease-snappy/);
  assert.ok((await api.read('src/App.tsx')).includes('<section id="panel" className="rounded-lg p-4 shadow-overlay">'));
  // again: nothing is duplicated, nothing else is touched
  const again = await api.apply(panel, { recipe: 'overlay' });
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.equal(again.body.applied.length, 0);
  assert.equal((await api.read('src/styles.css')).match(/--shadow-overlay:/g).length, 1);
  await api.undo(added.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);

  // refuse where it cannot write safely, with the reason, as POST set does
  const dyn = await api.at('src/App.tsx', '<div id="dyn"');
  const refused = await api.preview(dyn, { recipe: 'raised' });
  assert.equal(refused.body.ok, false);
  assert.match(refused.body.refused, /className/);
  const refusedApply = await api.apply(dyn, { recipe: 'raised' });
  assert.equal(refusedApply.status, 400);
  assert.match(refusedApply.body.error, /className/);
  // a stale hash writes nothing
  assert.equal((await api.apply(panel, { recipe: 'overlay', hash: '0'.repeat(16) })).status, 400);
  assert.equal(await api.read('src/App.tsx'), original.app);

  // motion in the same idiom: the easing is looked up in the project's own first and Tailwind's after (lift's curve is Tailwind's
  // ease-in-out, which the project has not changed), and the element's transition classes are replaced in place
  const lifted = await api.preview(btn, { recipe: 'lift' });
  assert.equal(lifted.status, 200, JSON.stringify(lifted.body));
  assert.deepEqual([lifted.body.ok, lifted.body.choice, lifted.body.uses.class, lifted.body.verdict.kind], [true, 'use', 'ease-in-out', 'same']);
  assert.deepEqual(lifted.body.writes.map(w => w.file), ['src/App.tsx']);
  const ran = await api.apply(btn, { recipe: 'lift' });
  assert.equal(ran.status, 200, JSON.stringify(ran.body));
  assert.ok((await api.read('src/App.tsx')).includes('className="rounded px-3 py-1 transition-transform duration-150 ease-in-out hover:-translate-y-0.5 hover:bg-gray-100"'), await api.read('src/App.tsx'));
  await api.undo(ran.body.undo);
  assert.equal(await api.read('src/App.tsx'), original.app);
  // a curve close to the project's own easing uses the project's token, by its name
  const mine = await api.apply(btn, { transition: { duration: 0.2, ease: [0.2, 0, 0.05, 1] } });
  assert.equal(mine.status, 200, JSON.stringify(mine.body));
  assert.match(mine.body.verdict.text, /^close to your ease-snappy/);
  assert.ok((await api.read('src/App.tsx')).includes('className="rounded px-3 py-1 transition duration-200 ease-snappy hover:bg-gray-100"'), await api.read('src/App.tsx'));
  await api.undo(mine.body.undo);
  // a curve that is nobody's is added as an --ease-* token next to the project's, and used
  const odd = await api.apply(btn, { transition: { duration: 0.2, ease: [0.7, 0.8, 0.3, 1.4] }, name: 'sharp' });
  assert.equal(odd.status, 200, JSON.stringify(odd.body));
  assert.match(await api.read('src/styles.css'), /--ease-snappy: [^\n]*\n  --ease-sharp: cubic-bezier\(0\.7, 0\.8, 0\.3, 1\.4\);/);
  assert.ok((await api.read('src/App.tsx')).includes('transition duration-200 ease-sharp'));
  await api.undo(odd.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);
  // an entrance with nothing to drive its exit is written as an entrance only, and says so
  const entered = await api.apply(panel, { recipe: 'fade-rise' });
  assert.equal(entered.status, 200, JSON.stringify(entered.body));
  assert.ok(entered.body.notes.some(n => /Entrance only/.test(n)));
  const themed = await api.read('src/styles.css');
  assert.match(themed, /--animate-fade-rise: fade-rise 300ms cubic-bezier\(0\.05, 0\.7, 0\.1, 1\) both;/);
  assert.match(themed, /@keyframes fade-rise \{/);
  assert.ok(!/--animate-fade-rise-out/.test(themed));
  assert.ok((await api.read('src/App.tsx')).includes('<section id="panel" className="rounded-lg p-4 animate-fade-rise">'));
  await api.undo(entered.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);
});

test('plain CSS custom properties: tokens are added to :root under the project’s names, the element’s own rule points at them, and a shared rule says who else changes', async t => {
  const api = await project(t, {
    'package.json': '{ "name": "fx-plain", "private": true, "type": "module" }\n',
    'plumber.config.ts': config,
    'src/styles.css': `:root {
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.12);
  --shadow-pop: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --ease-soft: cubic-bezier(0.2, 0, 0, 1);
}
.card { padding: 16px; box-shadow: var(--shadow-card); }
.tile { padding: 8px; }
`,
    'src/App.tsx': `export function A() {
  return <div>
    <div id="card" className="card">Card</div>
    <div id="tile" className="tile">Tile</div>
    <div id="tile-b" className="tile">Tile B</div>
  </div>;
}
`,
  });
  const tile = await api.at('src/App.tsx', '<div id="tile"');
  const original = { app: await api.read('src/App.tsx'), css: await api.read('src/styles.css') };
  const body = await api.view(tile);
  assert.equal(body.idioms.tailwind, null);
  assert.deepEqual(body.idioms.cssVariables, { files: ['src/styles.css'], shadowPrefix: '--shadow-' });
  assert.deepEqual(body.yours.map(r => r.token), ['--shadow-card', '--shadow-pop', '--ease-soft']);
  assert.equal(body.packs.find(p => p.recipe.id === 'raised').verdict.kind, 'close');
  assert.equal(body.packs.find(p => p.recipe.id === 'raised').nearest.token, '--shadow-card');
  assert.equal(body.packs.find(p => p.recipe.id === 'floating').verdict.kind, 'same');

  // use theirs: the rule that styles the element gets the declaration; the class is shared, and that is said
  const used = await api.apply(tile, { recipe: 'floating' });
  assert.equal(used.status, 200, JSON.stringify(used.body));
  assert.match(await api.read('src/styles.css'), /\.tile \{ padding: 8px; \}|\.tile \{\n  padding: 8px;\n  box-shadow: var\(--shadow-pop\);/);
  assert.ok((await api.read('src/styles.css')).includes('box-shadow: var(--shadow-pop);'));
  assert.ok(used.body.notes.some(n => /\.tile is used by 2 elements/.test(n)), JSON.stringify(used.body.notes));
  assert.equal(await api.read('src/App.tsx'), original.app); // the element's line is not touched: its rule is the convention
  await api.undo(used.body.undo);
  assert.equal(await api.read('src/styles.css'), original.css);

  // add: a new token after the last --shadow-* in :root, and the rule points at it
  const added = await api.apply(tile, { recipe: 'overlay' });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const css = await api.read('src/styles.css');
  assert.match(css, /  --shadow-pop: [^\n]*\n  \/\* [^\n]*MIT [^\n]*\*\/\n  --shadow-overlay: 0 25px 50px -12px rgb\(0 0 0 \/ 0\.25\);\n  --ease-soft/);
  assert.ok(css.includes('box-shadow: var(--shadow-overlay);'));
  assert.equal((css.match(/--shadow-overlay:/g) ?? []).length, 1);
  await api.undo(added.body.undo);
  assert.equal(await api.read('src/styles.css'), original.css);
  // a component with no static class has nothing to find a rule by: refused
  assert.equal((await api.preview(await api.at('src/App.tsx', '<div>\n'), { recipe: 'overlay' })).body.ok, false);
});

test('motion/react with a presets file: a close preset is reused by name and imported; a new one is added to the presets file in its style; a computed transition is refused', async t => {
  const api = await project(t, {
    'package.json': '{ "name": "fx-motion", "private": true, "type": "module", "dependencies": { "motion": "^11.0.0" } }\n',
    'plumber.config.ts': config,
    'src/styles.css': 'body { margin: 0; }\n',
    'src/motion.ts': `export const snappy = { type: 'spring', stiffness: 500, damping: 30 };
export const gentle = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };
`,
    'src/Chips.tsx': `import { motion } from 'motion/react';
import { gentle } from './motion';

export function Chip() {
  return <motion.button id="chip" whileHover={{ y: -2 }} transition={gentle}>Chip</motion.button>;
}
export function Tag() {
  return <motion.span id="tag">Tag</motion.span>;
}
export function Hold({ t }: { t: object }) {
  return <motion.div id="hold" transition={t}>Hold</motion.div>;
}
export function Plain() {
  return <div id="plain">Plain</div>;
}
`,
  });
  const chip = await api.at('src/Chips.tsx', '<motion.button'), tag = await api.at('src/Chips.tsx', '<motion.span'), hold = await api.at('src/Chips.tsx', '<motion.div'), plain = await api.at('src/Chips.tsx', '<div id="plain"');
  const original = { chips: await api.read('src/Chips.tsx'), presets: await api.read('src/motion.ts') };
  const body = await api.view(tag);
  assert.deepEqual([body.idioms.motion.installed, body.idioms.motion.from, body.idioms.motion.presets], [true, 'motion/react', { file: 'src/motion.ts', names: ['snappy', 'gentle'] }]);
  assert.deepEqual(body.yours.map(r => r.name), ['snappy', 'gentle']);
  assert.equal(body.packs.find(p => p.recipe.id === 'press').verdict.kind, 'close');
  assert.match(body.packs.find(p => p.recipe.id === 'press').verdict.text, /^close to your snappy: damping 25, yours 30/);
  assert.equal(body.packs.find(p => p.recipe.id === 'lift').verdict.kind, 'new');
  const read = await api.view(chip);
  assert.equal(read.element.motion.preset, 'gentle');
  assert.deepEqual(read.element.motion.props.sort(), ['transition', 'whileHover']);

  // reuse: the project's own preset by name, an import in the file's style, the press prop; the presets file is untouched
  const used = await api.apply(tag, { recipe: 'press' });
  assert.equal(used.status, 200, JSON.stringify(used.body));
  const chips = await api.read('src/Chips.tsx');
  assert.ok(chips.includes(`import { gentle, snappy } from './motion';`), chips);
  assert.ok(chips.includes(`<motion.span id="tag" transition={snappy} whileTap={{ scale: 0.97 }}>Tag</motion.span>`), chips);
  assert.equal(await api.read('src/motion.ts'), original.presets);
  await api.undo(used.body.undo);
  assert.equal(await api.read('src/Chips.tsx'), original.chips);

  // add: new to the project, so it joins the presets file in its own style (credited) and the existing import grows
  const added = await api.preview(chip, { recipe: 'lift' });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.deepEqual(added.body.writes.map(w => [w.role, w.file]), [['presets', 'src/motion.ts'], ['element', 'src/Chips.tsx']]);
  assert.match(added.body.writes[0].diff, /^\+ export const lift = \{ duration: 0\.15, ease: \[0\.4, 0, 0\.2, 1\] \};/m);
  const wrote = await api.apply(chip, { recipe: 'lift' });
  assert.equal(wrote.status, 200, JSON.stringify(wrote.body));
  assert.match(await api.read('src/motion.ts'), /export const gentle = [^\n]*\n\/\/ Tailwind CSS default theme[^\n]*MIT [^\n]*\nexport const lift = \{ duration: 0\.15, ease: \[0\.4, 0, 0\.2, 1\] \};\n/);
  const after = await api.read('src/Chips.tsx');
  assert.ok(after.includes(`import { gentle, lift } from './motion';`));
  assert.ok(after.includes('<motion.button id="chip" whileHover={{ y: -2 }} transition={lift}>Chip</motion.button>'), after);
  await api.undo(wrote.body.undo);
  assert.deepEqual([await api.read('src/Chips.tsx'), await api.read('src/motion.ts')], [original.chips, original.presets]);

  // refuse: a transition computed at runtime, an element that is not a motion element, a recipe that needs the library on one that has none
  const computed = await api.apply(hold, { recipe: 'press' });
  assert.equal(computed.status, 400);
  assert.match(computed.body.error, /computed at runtime/);
  const notMotion = await api.preview(plain, { recipe: 'reorder' });
  assert.equal(notMotion.body.ok, false);
  assert.match(notMotion.body.refused, /not a motion element/);
});

test('any source reads into the one model and writes back as itself; the dials move every layer of an imported shadow together', async t => {
  const api = await project(t, { ...tailwind });
  const panel = await api.at('src/App.tsx', '<section id="panel"');
  // a pasted box-shadow → model → the same string
  for (const pasted of ['0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', '0 4px 6px rgba(0, 0, 0, 0.1)', 'inset 0 1px 0 #ffffff80, 0 0 0 1px #11223344', '0 25px 50px -12px rgb(0 0 0 / 0.25)']) {
    const r = await api.preview(panel, { boxShadow: pasted });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.css.boxShadow, pasted);
  }
  assert.equal((await api.preview(panel, { boxShadow: 'not a shadow' })).status, 400);
  // dials on an imported 3-layer shadow scale every layer together: offsets, blur and alpha
  const three = '0 1px 1px rgb(0 0 0 / 0.1), 0 2px 2px rgb(0 0 0 / 0.1), 0 4px 4px rgb(0 0 0 / 0.1)';
  const doubled = await api.preview(panel, { boxShadow: three, dials: { height: 2 } });
  assert.deepEqual(doubled.body.recipe.model.layers.map(l => [l.y, l.blur]), [[2, 2], [4, 4], [8, 8]]);
  assert.deepEqual(doubled.body.recipe.model.layers.map(l => l.color.a), [0.141, 0.141, 0.141]);
  assert.equal(doubled.body.recipe.derived.height, 8);
  // and back: the dial inverts
  const back = await api.preview(panel, { boxShadow: doubled.body.css.boxShadow, dials: { height: 0.5 } });
  assert.equal(back.body.css.boxShadow, '0 1px 1px rgb(0 0 0 / 0.1), 0 2px 2px rgb(0 0 0 / 0.1), 0 4px 4px rgb(0 0 0 / 0.1)');
  // softness moves only the blur; light turns every offset around one light
  const soft = await api.preview(panel, { boxShadow: three, dials: { softness: 2 } });
  assert.deepEqual(soft.body.recipe.model.layers.map(l => [l.y, l.blur]), [[1, 2], [2, 4], [4, 8]]);
  const lit = await api.preview(panel, { boxShadow: '0 10px 20px rgb(0 0 0 / 0.2), 0 4px 8px rgb(0 0 0 / 0.2)', dials: { light: 30 } });
  const [a, b] = lit.body.recipe.model.layers;
  assert.ok(Math.abs(a.x + 5) < 0.02 && Math.abs(a.y - 8.66) < 0.02, JSON.stringify(a));
  assert.ok(Math.abs(b.x + 2) < 0.02 && Math.abs(b.y - 3.46) < 0.02, JSON.stringify(b));
  // a W3C design token (shadow and cubicBezier) and a motion/react transition read into the same models
  const tokens = { time: { $type: 'duration', quick: { $value: '120ms' } }, shadow: { $type: 'shadow', card: { $value: { offsetX: '0px', offsetY: '4px', blur: '8px', spread: '0px', color: 'rgb(0 0 0 / 0.2)' } } }, ease: { $type: 'cubicBezier', out: { $value: [0, 0, 0.2, 1] } } };
  const dtcg = await api.preview(panel, { designTokens: tokens, recipe: 'shadow-card' });
  assert.equal(dtcg.body.css.boxShadow, '0 4px 8px 0 rgb(0 0 0 / 0.2)');
  const dEase = await api.preview(btnOf(panel), { designTokens: tokens, recipe: 'ease-out' });
  assert.equal(dEase.body.recipe.model.timing.easing.join(), '0,0,0.2,1');
  const dTime = await api.preview(panel, { designTokens: tokens, recipe: 'time-quick' });
  assert.equal(dTime.body.recipe.model.timing.duration, 120);
  const spring = await api.preview(panel, { transition: { type: 'spring', stiffness: 400, damping: 20 } });
  assert.deepEqual(spring.body.recipe.model.timing, { type: 'spring', stiffness: 400, damping: 20 });
  assert.match(spring.body.css.transitionTimingFunction, /^linear\(0, /); // a spring shown without a library
  // motion dials: speed, bounce, distance
  const fast = await api.preview(panel, { transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }, dials: { speed: 2, bounce: 0.2 } });
  assert.deepEqual(fast.body.recipe.model.timing, { type: 'curve', duration: 150, easing: [0.4, 0, 0.2, 1.3] });
  const far = await api.preview(panel, { recipe: 'lift', dials: { distance: 2 } });
  assert.deepEqual(far.body.recipe.model.changes, [{ property: 'y', from: 0, to: -4 }]);
});
const btnOf = pos => pos;

test('GET /__plumb/recipes has one shape', async t => {
  const api = await project(t, tailwind);
  const body = await api.view(await api.at('src/App.tsx', '<section id="panel"'));
  assert.deepEqual(Object.keys(body).sort(), ['column', 'element', 'file', 'hash', 'idioms', 'line', 'packs', 'yours']);
  assert.deepEqual(Object.keys(body.idioms).sort(), ['classes', 'cssVariables', 'dataState', 'evidence', 'motion', 'tailwind']);
  assert.deepEqual(Object.keys(body.packs[0]).sort(), ['nearest', 'recipe', 'verdict']);
  assert.deepEqual(Object.keys(body.packs[0].verdict).sort(), ['differs', 'kind', 'text']);
  for (const r of body.yours) for (const key of ['id', 'name', 'kind', 'source', 'model', 'derived', 'css']) assert.ok(key in r, `${r.id} has ${key}`);
});

// docs/qa/element-card-retest.md N-01, N-12, N-13, on a project shaped like crafting-ui: shadow tokens that differ only in
// their colour token, a prototype stylesheet under public/ that names the same easing, and a duration utility of its own.
const drafted = {
  'package.json': '{ "name": "fx-drafted", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n',
  'plumber.config.ts': config,
  'src/styles.css': `@import "tailwindcss";

@theme {
  --shadow-1: 0 0 0 1px var(--line);
  --shadow-2: 0 0 0 1px var(--line-strong);
  --ease-*: initial;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --default-transition-duration: 140ms;
}
@utility duration-fast { transition-duration: 140ms; }
`,
  'public/prototypes/kit.css': ':root {\n  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);\n  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.2);\n}\n',
  'src/App.tsx': `export function Nav() {
  return <nav><a id="tab" className="rounded px-2.5 py-1 transition-colors duration-fast hover:bg-gray-100">Motion</a><a id="slow" className="rounded px-2 duration-300 hover:bg-gray-100">Slow</a></nav>;
}
`,
};

test('N-01: two shadows that differ only in their colour token are not the same; the one picked is the one written', async t => {
  const api = await project(t, drafted);
  const tab = await api.at('src/App.tsx', '<a id="tab"');
  const body = await api.view(tab);
  const preview = await api.preview(tab, { recipe: '--shadow-2' });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.equal(preview.body.nearest.token, '--shadow-2', JSON.stringify(preview.body.nearest));
  assert.equal(preview.body.verdict.kind, 'same');
  assert.equal(preview.body.uses.class, 'shadow-2');
  assert.match(preview.body.writes[0].diff, /^\+ .*shadow-2/m);
  assert.doesNotMatch(preview.body.writes[0].diff, /shadow-1/);
  // against each other: close, and the colour is what differs
  const one = body.yours.find(r => r.token === '--shadow-1');
  const asked = await api.preview(tab, { boxShadow: '0 0 0 1px var(--line-strong)', name: 'drawn' });
  assert.equal(asked.status, 200, JSON.stringify(asked.body));
  assert.equal(asked.body.nearest.token, '--shadow-2');
  const pack = body.packs.find(p => p.recipe.kind === 'shadow');
  assert.ok(pack, 'a pack shadow is mapped');
  assert.ok(one, 'shadow-1 is the project’s');
  const across = await api.preview(tab, { boxShadow: '0 0 0 1px var(--line)', name: 'drawn' });
  assert.equal(across.body.nearest.token, '--shadow-1');
  const between = await api.preview(tab, { boxShadow: '0 0 0 1px var(--line-other)', name: 'drawn' });
  assert.equal(between.body.verdict.kind, 'close', JSON.stringify(between.body.verdict));
  assert.match(between.body.verdict.text, /colour var\(--line-other\), yours var\(--line/);
});

test('N-12: a token named in two stylesheets is one option, the app’s own; N-13: a timing equal to a duration of the project’s is written as its class', async t => {
  const api = await project(t, drafted);
  const tab = await api.at('src/App.tsx', '<a id="tab"'), slow = await api.at('src/App.tsx', '<a id="slow"');
  const original = await api.read('src/App.tsx');
  const body = await api.view(tab);
  const keys = body.yours.map(r => `${r.kind}:${r.id}`);
  assert.deepEqual(keys, [...new Set(keys)], 'no option twice');
  const easeOut = body.yours.filter(r => r.id === 'ease-out');
  assert.equal(easeOut.length, 1);
  assert.equal(easeOut[0].source.file, 'src/styles.css');
  assert.equal(body.yours.find(r => r.id === '1').source.file, 'src/styles.css');

  // the project's ease-out at its default 140ms: duration-fast stays, never duration-150
  const kept = await api.preview(tab, { recipe: '--ease-out' });
  assert.equal(kept.status, 200, JSON.stringify(kept.body));
  const keptDiff = kept.body.writes.find(w => w.file === 'src/App.tsx').diff;
  assert.match(keptDiff, /^\+ .*id="tab" className="[^"]*duration-fast/m);
  assert.doesNotMatch(keptDiff, /duration-150|duration-140/);
  assert.ok(!kept.body.notes.some(n => /replaced/.test(n)), JSON.stringify(kept.body.notes));
  // 140ms on an element written at 300: the project's class, not duration-140
  const reused = await api.preview(slow, { recipe: '--ease-out' });
  assert.equal(reused.status, 200, JSON.stringify(reused.body));
  assert.match(reused.body.writes.find(w => w.file === 'src/App.tsx').diff, /^\+ .*duration-fast/m);
  // a pick at another timing replaces the project's class, and says so
  const other = await api.preview(tab, { recipe: '--ease-out', dials: { speed: 2 } });
  assert.equal(other.status, 200, JSON.stringify(other.body));
  assert.doesNotMatch(other.body.writes.find(w => w.file === 'src/App.tsx').diff, /^\+ .*id="tab" className="[^"]*duration-fast/m);
  assert.ok(other.body.notes.some(n => /duration-fast \(140ms\) is replaced/.test(n)), JSON.stringify(other.body.notes));
  assert.equal(await api.read('src/App.tsx'), original);
});

// docs/research/engine-review.md B7: a pack's { light, dark } and a project's dark override are both read; the dark value
// moves with the dials, is shown, and is written under the project's own dark selector, never assumed.
test('B7: a shadow’s dark value is read from the pack and the project, moves with the dials, and is written where the project keeps its dark values', async t => {
  const darkTheme = { ...tailwind, 'src/styles.css': tailwind['src/styles.css'] + `
.dark {
  --shadow-md: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4);
}
` };
  const api = await project(t, darkTheme);
  const panel = await api.at('src/App.tsx', '<section id="panel"');
  const original = { app: await api.read('src/App.tsx'), css: await api.read('src/styles.css') };
  const body = await api.view(panel);
  // the pack's dark value rides on its recipe, with the CSS to show it
  const raised = body.packs.find(p => p.recipe.id === 'raised').recipe;
  assert.equal(raised.dark.layers.length, 2);
  assert.equal(raised.dark.layers[0].color.a, 0.3);
  assert.match(raised.cssDark.boxShadow, /rgb\(0 0 0 \/ 0\.3\)/);
  // the project's dark override is its token's dark, not a recipe of its own
  const md = body.yours.filter(r => r.token === '--shadow-md');
  assert.equal(md.length, 1);
  assert.equal(md[0].dark.layers[0].color.a, 0.4);
  assert.equal(md[0].model.layers[0].color.a, 0.12);

  // the dials move the dark value with the light one
  const tall = await api.preview(panel, { recipe: 'raised', dials: { height: 2 } });
  assert.equal(tall.status, 200, JSON.stringify(tall.body));
  assert.equal(tall.body.recipe.dark.layers[0].y, raised.dark.layers[0].y * 2);
  assert.equal(tall.body.recipe.model.layers[0].y, raised.model.layers[0].y * 2);

  // add: the light value in @theme, the dark one in the project's .dark block
  const added = await api.apply(panel, { recipe: 'raised', choice: 'add' });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  const css = await api.read('src/styles.css');
  assert.match(css, /@theme \{[\s\S]*--shadow-raised: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.1\)[\s\S]*\}\n\n\.dark \{[\s\S]*--shadow-raised: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.3\), 0 1px 2px -1px rgb\(0 0 0 \/ 0\.3\);\n\}/);
  assert.equal(css.match(/--shadow-raised:/g).length, 2);
  await api.undo(added.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);

  // move: the project's own dark value takes the recipe's dark
  const moved = await api.apply(panel, { recipe: 'raised', choice: 'move' });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.match(await api.read('src/styles.css'), /\.dark \{\n  --shadow-md: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.3\), 0 1px 2px -1px rgb\(0 0 0 \/ 0\.3\);\n\}/);
  await api.undo(moved.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);
});

test('B7: with no dark block in the project, only the light value is written, and that is said', async t => {
  const api = await project(t, tailwind);
  const panel = await api.at('src/App.tsx', '<section id="panel"');
  const preview = await api.preview(panel, { recipe: 'raised', choice: 'add' });
  assert.equal(preview.status, 200, JSON.stringify(preview.body));
  assert.ok(preview.body.notes.some(n => /dark value .* is not written/.test(n)), JSON.stringify(preview.body.notes));
  assert.doesNotMatch(preview.body.writes.find(w => w.file === 'src/styles.css').diff, /\.dark/);
});

// docs/research/engine-review.md N5: a recipe that writes several files is one write in the history, taken back by one undo;
// one that fails part way leaves nothing behind, in the files, the history or the trace.
test('N5: a recipe’s writes are one history entry and one undo; a batch that fails half way leaves no entry and no change', async t => {
  const api = await project(t, tailwind);
  const panel = await api.at('src/App.tsx', '<section id="panel"');
  const original = { app: await api.read('src/App.tsx'), css: await api.read('src/styles.css') };
  const added = await api.apply(panel, { recipe: 'overlay' });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.applied.length, 2);
  assert.equal(added.body.undo.length, 1);
  const history = (await api.call('history')).body.writes;
  assert.equal(history.length, 1, JSON.stringify(history));
  assert.deepEqual([history[0].id, history[0].files.toSorted()], [added.body.undo[0].id, ['src/App.tsx', 'src/styles.css']]);
  assert.match(history[0].label, /shadow-overlay/);
  // the timeline sees the same one step: one group for both files
  const groups = new Set((await api.call('trace')).body.changes.map(c => c.group));
  assert.equal(groups.size, 1);
  await api.undo(added.body.undo);
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);
  assert.equal((await api.call('history')).body.writes.length, 0);

  // the element's file is hard-linked, so its write is refused after the theme's landed: the theme goes back, and nothing is listed
  await link(`${api.root}/src/App.tsx`, `${api.root}/src/App.copy.tsx`);
  const failed = await api.apply(panel, { recipe: 'overlay' });
  assert.equal(failed.status, 400, JSON.stringify(failed.body));
  assert.deepEqual([await api.read('src/App.tsx'), await api.read('src/styles.css')], [original.app, original.css]);
  assert.equal((await api.call('history')).body.writes.length, 0);
  assert.ok((await api.call('trace')).body.changes.every(c => c.state === 'undone' || !/shadow-overlay/.test(JSON.stringify(c))), 'no live change of the failed batch');
});

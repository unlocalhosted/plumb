import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(dir, args = []) {
  const result = spawnSync(process.execPath, [cli, '--root', dir, ...args, '--json'], { encoding: 'utf8', timeout: 15_000 });
  assert.ifError(result.error); return result;
}
function report(dir, args = []) { const result = run(dir, args); assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout); return JSON.parse(result.stdout); }
const breaks = (r, id) => r.findings.filter(f => f.rule === `habits/${id}`);
const owners = (r, id) => breaks(r, id).map(f => f.declaration.owner.name);
async function project(t, css, jsx = '', config = { habits: ['hover-gate'] }) {
  const dir = await mkdtemp(join(root, 'fixtures/.habits-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'src'));
  await writeFile(join(dir, 'package.json'), '{"type":"module"}');
  await writeFile(join(dir, 'src/styles.css'), css);
  await writeFile(join(dir, 'src/App.tsx'), jsx);
  await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify(config)};`);
  return dir;
}

test('every built-in and custom DSL run through CLI over fixture, with conservative passes', () => {
  const r = report(join(root, 'fixtures/habits'));
  for (const id of ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in', 'logical-inline', 'viewport-dynamic', 'safe-area-fallback', 'overflow-clip', 'overscroll-contain', 'no-fixed-heights-on-text', 'pseudo-media']) assert.ok(breaks(r, id).length, id);
  assert.equal(breaks(r, 'transition-named').length, 2);
  assert.equal(breaks(r, 'no-ease-in').length, 2);
  assert.equal(breaks(r, 'logical-inline').length, 6);
  assert.equal(breaks(r, 'viewport-dynamic').length, 2);
  assert.equal(breaks(r, 'safe-area-fallback').length, 2);
  assert.deepEqual(owners(r, 'overflow-clip'), ['.decor']);
  assert.deepEqual(owners(r, 'overscroll-contain'), ['.scroll', '.scroll-wrong-axis', '.scroll-auto']);
  for (const name of ['.gated:hover', '.half:hover', '.negated:hover', '.nested:hover', '.rest:not(:hover)', '.plain', '.escaped\\:hover', '.nested-rest:not(:is(:hover))']) assert.ok(!owners(r, 'hover-gate').includes(name), name);
  for (const name of ['.ungated:hover', '.alternative:hover', '.mixed:hover', '.deep:is(:hover, :focus)']) assert.ok(owners(r, 'hover-gate').includes(name), name);
  for (const name of ['.restored', '.field', '.focus-good:focus-visible', '.focus-layer:focus-visible:before']) assert.ok(!owners(r, 'focus-outline').includes(name), name);
  assert.equal(breaks(r, 'no-fixed-heights-on-text')[0].severity, 'warn');
  assert.equal(breaks(r, 'pseudo-media')[0].severity, 'info');
  assert.ok(r.habits.every(h => h.reason.length > 20));
  assert.ok(!r.findings.some(f => ['habits/z-named', 'habits/motion-tokens'].includes(f.rule)));
});

test('zero config/disabled habits judge nothing; habits command counts all built-ins and exits zero', async t => {
  const dir = await project(t, '.a:hover { transition: all 1s ease-in; }', '', {});
  await rm(join(dir, 'plumber.config.ts'));
  const r = report(dir);
  assert.equal(r.findings.filter(f => f.rule.startsWith('habits/')).length, 0);
  assert.ok(r.habits.every(h => h.breaks === null && !h.enabled));
  const result = run(dir, ['habits']); assert.equal(result.status, 0); assert.equal(result.stderr, '');
  const list = JSON.parse(result.stdout);
  assert.equal(list.find(h => h.id === 'hover-gate').breaks, 1);
  assert.equal(list.find(h => h.id === 'transition-named').breaks, 1);
  assert.equal(list.length, 11);
  const text = spawnSync(process.execPath, [cli, 'habits', '--root', dir], { encoding: 'utf8' });
  assert.match(text.stdout, /hover-gate\s+1 break\s/);
});

test('Tailwind oracle finds alternate custom variant, honors cache invalidation, and falls back to declaration', async t => {
  const dir = await project(t, '@import "tailwindcss"; @custom-variant hover (&:hover); @custom-variant fine-hover { &:hover { @media (hover: hover) and (pointer: fine) { @slot; } } }', '<button className="hover:opacity-50 fine-hover:opacity-50" />;');
  const first = report(dir);
  const f = breaks(first, 'hover-gate'); assert.equal(f.length, 1); assert.match(f[0].edits[0].text, /Use fine-hover:/);
  const warm = report(dir); assert.deepEqual(warm.findings, first.findings); assert.equal(warm.timing.cacheMisses, 0);
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @custom-variant hover (&:hover); @custom-variant fine-hover { &:hover { @media (pointer: coarse) { @slot; } } }');
  assert.ok(breaks(report(dir), 'hover-gate').every(f => f.edits.some(e => e.text.includes('@custom-variant pointer-hover'))));
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @custom-variant hover (&:hover); @custom-variant pointer-hover { &:hover { @media (hover: hover) and (pointer: fine) { @slot; } } }');
  await writeFile(join(dir, 'src/App.tsx'), '<button className="hover:opacity-50 pointer-hover:opacity-50" />;');
  assert.match(breaks(report(dir), 'hover-gate')[0].edits[0].text, /Use pointer-hover:/);
});

test('class companions respect element, branch and media; source globs alone are judged', async t => {
  const dir = await project(t, '@import "tailwindcss";', `<div className="overflow-y-auto overscroll-y-contain rounded-lg overflow-x-hidden" />;
<div className="overflow-y-auto" />;<div className="overscroll-contain" />;
<div className="overflow-y-auto focus:overscroll-y-contain" />;
<div className="overflow-y-auto md:overscroll-y-contain" />;
<div className={ready ? 'overflow-y-auto' : 'overscroll-y-contain'} />;
<button className="outline-none focus-visible:outline-2 focus-visible:outline-solid" />;
<button className="outline-none" />;`, { habits: ['overscroll-contain', 'focus-outline', 'overflow-clip'] });
  const r = report(dir);
  assert.equal(r.habits.find(h => h.id === 'overscroll-contain').breaks, 4);
  assert.equal(breaks(r, 'focus-outline').length, 1);
  assert.equal(breaks(r, 'overflow-clip').length, 0);
  await mkdir(join(dir, 'other')); await writeFile(join(dir, 'other/imported.css'), '.outside:hover { opacity: .5; }');
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @import "../other/imported.css"; .inside:hover { opacity: .5; }');
  await writeFile(join(dir, 'plumber.config.ts'), "export default { css: 'src/styles.css', source: ['src/**/*.css'], habits: ['hover-gate'] };");
  assert.deepEqual(owners(report(dir), 'hover-gate'), ['.inside:hover']);
});

test('closed DSL rejects unknown predicates, names, regex, callbacks and severity as usage errors', async t => {
  const dir = await project(t, '.a { opacity: .5; }');
  for (const habits of [ ['unknown'], ['hover-gate', 'hover-gate'], [{ id: 'x', when: { mystery: true }, message: 'x' }], [{ id: 'x', when: { value: '[' }, message: 'x' }], [{ id: 'x', when: { when: { has: { supports: 'x' } } }, message: 'x' }], [{ id: 'x', when: {}, message: 'x', severity: 'fatal' }], [{ id: 'hover-gate', when: {}, message: 'x' }] ]) {
    await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify({ habits })}`);
    const result = run(dir); assert.equal(result.status, 2, result.stdout); assert.match(result.stderr, /habits\[/); assert.equal(result.stdout, '');
  }
  await writeFile(join(dir, 'plumber.config.ts'), "export default { habits: [{ id: 'x', when: { value: () => true }, message: 'x' }] }");
  assert.equal(run(dir).status, 2);
});

test('quoted selectors, nested negations, nested declaration runs and group fixes survive lowering', async t => {
  const dir = await project(t, `@import "tailwindcss";
@custom-variant hover (&:hover);
@custom-variant pointer-hover { &:hover { @media (hover: hover) and (pointer: fine) { @slot; } } }
@utility nested-check { opacity: 1; &[data-open] { opacity: .5; } transition: all 1s EASE-IN; }
.quoted[data-label="abc"]:not(:not(:hover)):hover { opacity: .5; }
.rest[data-label="abc"]:not(:not(:hover)) { opacity: .5; }
.parent { color: red; &:focus { color: blue; } transition-property: ALL; }
@keyframes sample { from { height: 12px; } to { height: 13px; } }`, `<div className="nested-check group-hover/test:opacity-50 peer-hover:opacity-50" />;`, { habits: ['hover-gate', 'transition-named', 'no-ease-in', { id: 'frame-height', when: { origin: ['keyframes'], prop: 'height', value: '^12px$' }, message: 'Frame height rule.', severity: 'info' }] });
  const r = report(dir);
  assert.ok(breaks(r, 'transition-named').some(f => f.sites.some(site => site.text === 'nested-check')));
  assert.ok(breaks(r, 'transition-named').some(f => f.declaration.owner.name === '.parent'));
  assert.ok(breaks(r, 'no-ease-in').length);
  assert.ok(breaks(r, 'hover-gate').some(f => f.declaration.owner.name.startsWith('.quoted')));
  assert.ok(!breaks(r, 'hover-gate').some(f => f.declaration.owner.name.startsWith('.rest')));
  assert.ok(breaks(r, 'hover-gate').some(f => f.edits.some(e => e.text.includes('group-pointer-hover/test:'))));
  assert.ok(breaks(r, 'hover-gate').some(f => f.edits.some(e => e.text.includes('peer-pointer-hover:'))));
  assert.equal(breaks(r, 'frame-height').length, 1);
});

test('pointer-only custom variant cannot gate legacy hover; plugin variants are discovered', async t => {
  const dir = await project(t, '@import "tailwindcss"; @custom-variant hover (&:hover); @custom-variant fine-input (@media (pointer: fine));', '<button className="hover:opacity-50 group-hover/card:opacity-50" />;');
  const r = report(dir);
  assert.equal(breaks(r, 'hover-gate').length, 2);
  assert.ok(breaks(r, 'hover-gate').every(f => f.edits.some(e => e.text.includes('@custom-variant pointer-hover'))));
  await writeFile(join(dir, 'plugin.mjs'), 'export default function({addVariant}) { addVariant("mouse-over", "@media (hover: hover) and (pointer: fine) { &:hover }") }');
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @custom-variant hover (&:hover); @plugin "../plugin.mjs";');
  await writeFile(join(dir, 'src/App.tsx'), '<button className="hover:opacity-50 group-hover/card:opacity-50" />;');
  const plugin = breaks(report(dir), 'hover-gate');
  assert.ok(plugin.length);
  assert.ok(plugin.every(f => f.edits.some(e => /mouse-over/.test(e.text))));
});

test('focus restoration must cover branches and media; scroll containment covers each scrolling axis', async t => {
  const dir = await project(t, `@import "tailwindcss";
.both { overflow: auto; overscroll-behavior-x: contain; overscroll-behavior-y: none; }
.one { overflow: auto hidden; overscroll-behavior: contain auto; }
.wrong { overflow: hidden auto; overscroll-behavior: contain auto; }
.vertical { writing-mode: vertical-rl; overflow-y: auto; overscroll-behavior-inline: contain; }
.forced { outline: none; }
@media (forced-colors: active) { .forced:focus-visible { outline: 2px solid transparent; } }
.responsive { outline: none; }
@media (width > 800px) { .responsive:focus-visible { outline: 2px solid; } }`, `<button className={cn('outline-none', ready && 'focus-visible:outline-solid')} />;
<button className="outline-none md:focus-visible:outline-solid" />;
<button className="outline-none hover:focus-visible:outline-solid" />;`, { habits: ['focus-outline', 'overscroll-contain'] });
  const r = report(dir);
  assert.equal(r.habits.find(h => h.id === 'focus-outline').breaks, 4);
  assert.deepEqual(owners(r, 'overscroll-contain'), ['.wrong']);
});

test('legacy z-named and motion-tokens names delegate to provenance without duplicate habit findings', async t => {
  const dir = await project(t, '.a { z-index: 10; transition-duration: 200ms; }', '', { habits: ['z-named', 'motion-tokens'] });
  const r = report(dir);
  assert.ok(r.findings.some(f => f.rule === 'config/no-tokens' && f.family === 'z'));
  assert.ok(r.findings.some(f => f.rule === 'config/no-tokens' && f.family === 'motion'));
  assert.ok(!r.findings.some(f => f.rule.startsWith('habits/')));
});

test('tracking-em (#47): px letter spacing is marked in classes and stylesheets; em and Tailwind tracking are not', async t => {
  const dir = await project(t, `@import "tailwindcss";
.caps { letter-spacing: 2px; }
.label { letter-spacing: 0.08em; }
.reset { letter-spacing: 0px; }`, `<><h1 className="tracking-[3px]">A</h1><h2 className="tracking-tight">B</h2><p className="tracking-[0.02em]">C</p></>;`, { habits: ['tracking-em'] });
  const r = report(dir);
  const found = breaks(r, 'tracking-em');
  assert.deepEqual(found.map(f => f.declaration.value).sort(), ['2px', '3px']);
  assert.ok(found.every(f => /em/.test(f.action) && f.severity === 'warn'));
});

test('color-scheme (#58): a dark theme with no color-scheme is one finding; scheme-dark or color-scheme clears it; no dark theme, no finding', async t => {
  const dark = await project(t, '@import "tailwindcss";', '<main className="bg-white text-black dark:bg-black dark:text-white">A</main>;', { habits: ['color-scheme'] });
  const found = breaks(report(dark), 'color-scheme');
  assert.equal(found.length, 1);
  assert.match(found[0].title, /color-scheme/);

  const set = await project(t, '@import "tailwindcss";', '<main className="bg-white dark:bg-black dark:scheme-dark">A</main>;', { habits: ['color-scheme'] });
  assert.equal(breaks(report(set), 'color-scheme').length, 0);

  const css = await project(t, `@import "tailwindcss";
:root { color-scheme: light dark; }
@media (prefers-color-scheme: dark) { .card { background: black; } }`, '', { habits: ['color-scheme'] });
  assert.equal(breaks(report(css), 'color-scheme').length, 0);

  const selector = await project(t, `@import "tailwindcss";
.dark .card { background: black; }`, '', { habits: ['color-scheme'] });
  assert.equal(breaks(report(selector), 'color-scheme').length, 1);

  const light = await project(t, '@import "tailwindcss";', '<main className="bg-white text-black">A</main>;', { habits: ['color-scheme'] });
  assert.equal(breaks(report(light), 'color-scheme').length, 0);
});

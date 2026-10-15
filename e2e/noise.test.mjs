import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const root = fileURLToPath(new URL('../', import.meta.url));
async function project(t, css, jsx = '', config = {}) {
  const dir = await mkdtemp(join(root, 'fixtures/.noise-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'src'));
  await writeFile(join(dir, 'package.json'), '{"type":"module"}');
  await writeFile(join(dir, 'src/styles.css'), css);
  await writeFile(join(dir, 'src/App.tsx'), jsx);
  await writeFile(join(dir, 'plumber.config.ts'), `export default ${JSON.stringify(config)};`);
  return dir;
}
function run(dir, args = [], json = true) {
  const r = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', dir, ...args, ...(json ? ['--json'] : [])], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(r.error); assert.equal(r.stderr, ''); assert.ok([0, 1].includes(r.status), r.stdout);
  return json ? JSON.parse(r.stdout) : r.stdout;
}
const findings = (r, rule) => r.findings.filter(f => f.rule === rule);
const sites = fs => fs.flatMap(f => f.sites.map(s => [s.file, s.line, s.column, s.text])).sort();

test('equal literals warn once per family; every site has its own token, verbose/config/agent restore individual values', async t => {
  const css = '@import "tailwindcss"; @theme { --*: initial; --color-brand: #123456; --color-ink: #654321; --duration-feedback: 123ms; } .a { color: #123456; } .b { background-color: #654321; } .c { color: #123456; transition-duration: 123ms; }';
  const dir = await project(t, css, '<div className="bg-[#123456]" />;');
  const r = run(dir), color = findings(r, 'provenance/color/by-value');
  assert.equal(color.length, 1); assert.equal(color[0].severity, 'warn');
  assert.equal(color[0].title, "4 colour values match tokens but don't use them");
  assert.equal(color[0].sites.length, 4); assert.equal(color[0].edits.length, 4);
  for (const edit of color[0].edits) {
    const expected = edit.site.text.includes('#654321') ? '--color-ink' : '--color-brand';
    assert.equal(edit.token, expected); assert.ok(edit.text.includes(expected) || edit.text.includes('bg-brand'));
    assert.ok(color[0].action.includes(`src/styles.css:${edit.site.line}:${edit.site.column}`) || color[0].action.includes(`src/App.tsx:${edit.site.line}:${edit.site.column}`));
  }
  const expanded = run(dir, ['--verbose']), each = findings(expanded, 'provenance/color/by-value');
  assert.equal(each.length, 2); assert.deepEqual(sites(color), sites(each));
  assert.ok(each.every(f => f.severity === 'warn' && f.choices.length === 1));
  assert.deepEqual(color[0].ledgerKeys.sort(), each.flatMap(f => f.ledgerKeys).sort());
  const text = run(dir, ['--all'], false);
  assert.ok(!color[0].action.includes(dir)); assert.match(text, /matches a token; uses a copy/);
  assert.match(text, /→ bg-brand \(/);
  assert.match(text, /→ var\(--color-ink\) \(/);
  assert.doesNotMatch(text, /Use the matching token at each site/);
  assert.ok(color[0].edits.every(e => text.includes(`src/${e.site.file.split('/src/')[1]}:${e.site.line}`)));
  const agent = run(dir, ['--agent'], false);
  assert.ok(!agent.includes('values in your color')); assert.match(agent, /background-color: var\(--color-ink\)/);
  await writeFile(join(dir, 'plumber.config.ts'), "export default { decisions: { color: { byValue: 'each' } } };");
  const configured = run(dir);
  assert.deepEqual(sites(findings(configured, 'provenance/color/by-value')), sites(color));
  assert.equal(findings(configured, 'provenance/color/by-value').length, 2);
  assert.equal(findings(configured, 'provenance/motion/by-value').length, 1);
  const schema = JSON.parse(await readFile(join(root, 'schema/config.schema.json')));
  assert.deepEqual(schema.$defs.decisionSource.properties.byValue.enum, ['group', 'each']);
});

test('RTL habit ignores symmetric sides and direction selectors, retains asymmetric sides and branch/media gaps', async t => {
  const dir = await project(t, `@import "tailwindcss";
.symmetric { left: 2px; right: 2px; padding-left: 4px; padding-right: 4px; border-left-width: 1px; border-right-width: 1px; }
.shorthand { padding: 1px 2px 3px 2px; margin: 1px 2px; inset: 2px 4px; }
.asymmetric { padding: 1px 2px 3px 4px; margin-left: 2px; margin-right: 4px; border-left-width: 2px; float: left; clear: right; text-align: left; }
[dir="rtl"] .specific { left: 2px; text-align: right; }
.specific:dir(ltr) { padding-right: 2px; }
.alternative:is([dir="rtl"], .any) { margin-left: 3px; }
.descendant:has([dir="rtl"]) { margin-left: 3px; }
.both:where([dir="rtl"], [dir="ltr"]) { margin-left: 3px; }
:not([dir="rtl"]) .negative { padding-left: 3px; }
[dir=rtl] .mixed, .unconstrained { margin-left: 2px; }
.conditional { margin-left: 2px; } @media (width > 800px) { .conditional { margin-right: 2px; } }
`, `<div className="px-4 mx-2 inset-x-2 left-2 right-2 border-l-2 border-r-2 rounded-tl-lg rounded-tr-lg" />;
<div className="pl-2 hover:pr-2" />;
<div className={ready ? 'ml-2' : 'mr-2'} />;
<div className="ltr:pl-2 rtl:pr-2" />;`, { habits: ['logical-inline'] });
  const r = run(dir), fs = findings(r, 'habits/logical-inline');
  const texts = fs.flatMap(f => f.sites.map(s => s.text));
  for (const text of ['px-4', 'mx-2', 'inset-x-2', 'left-2', 'right-2', 'border-l-2', 'border-r-2', 'rounded-tl-lg', 'rounded-tr-lg', 'ltr:pl-2', 'rtl:pr-2']) assert.ok(!texts.includes(text), text);
  assert.ok(!fs.some(f => ['.symmetric', '.shorthand', '[dir="rtl"] .specific', '.specific:dir(ltr)'].includes(f.declaration.owner.name)));
  for (const text of ['pl-2', 'hover:pr-2', 'ml-2', 'mr-2', 'float: left', 'clear: right', 'text-align: left', 'padding: 1px 2px 3px 4px']) assert.ok(texts.includes(text), text);
  for (const name of ['.conditional', ':not([dir="rtl"]) .negative', '.unconstrained']) assert.ok(fs.some(f => f.declaration.owner.name === name), name);
  for (const name of ['.alternative', '.descendant']) assert.ok(fs.some(f => f.declaration.owner.name.startsWith(name)), name);
  assert.ok(!fs.some(f => f.declaration.owner.name.startsWith('.both')));
});

test('outline suppression accepts visible focus-visible/focus-within and same-element ring utilities, but requires branch/media/element coverage', async t => {
  const dir = await project(t, `@import "tailwindcss";
.css { outline: none; } .css:focus-visible { box-shadow: 0 0 0 2px #123456; }
.field { outline: none; } .field:focus-within { box-shadow: 0 0 0 2px #123456; }
.shadow-only:focus-visible { box-shadow: 0 2px 4px #123456; }
.transparent { outline: none; } .transparent:focus-visible { box-shadow: 0 0 0 2px transparent; }
.zero { outline: none; } .zero:focus-visible { box-shadow: 0 0 0 0px #123456; }
`, `<button className="outline-none focus-visible:ring-2" />;
<button className="outline-none focus-within:ring-2" />;
<button className="outline-none ring-2" />;
<button className="outline-none ring-0" />;
<button className="outline-none" />;<button className="focus-visible:ring-2" />;
<button className="outline-none md:focus-visible:ring-2" />;
<button className={cn('outline-none', ready && 'focus-visible:ring-2')} />;
<button className="outline-none hover:focus-visible:ring-2" />;
<button className="outline-none before:focus-visible:ring-2" />;
<button className="outline-none focus-visible:ring-transparent" />;
<button className="outline-none ring-2 ring-transparent" />;
<button className="outline-none ring-transparent ring-2" />;`, { habits: ['focus-outline'] });
  const r = run(dir), fs = findings(r, 'habits/focus-outline');
  assert.equal(fs.flatMap(f => f.sites).filter(s => s.file.endsWith('App.tsx')).length, 9);
  assert.deepEqual(fs.filter(f => f.sites.some(s => s.file.endsWith('styles.css'))).map(f => f.declaration.owner.name).sort(), ['.transparent', '.zero']);
  assert.ok(!fs.some(f => f.declaration.prop === 'box-shadow'));
  const cold = sites(fs), warm = sites(findings(run(dir), 'habits/focus-outline'));
  assert.deepEqual(cold, warm);
});

test('elevation without named tokens gives one no-fit line per finding; semantic-token families retain normal messages', async t => {
  const dir = await project(t, '@import "tailwindcss"; @theme { --*: initial; --shadow-low: 0 1px 2px #123456; } .a { box-shadow: 0 4px 8px #123456; } .b { box-shadow: 0 4px 8px #123456; }');
  const r = run(dir), fs = findings(r, 'provenance/elevation');
  assert.equal(fs.length, 1); assert.equal(fs[0].sites.length, 2);
  assert.equal(fs[0].action, 'No tokens fit: your theme has no named shadow tokens. Pick one with the design owner, or add one to the theme.');
  assert.equal(fs[0].fix, fs[0].action);
  const text = run(dir, ['--all'], false);
  assert.equal(text.split('No tokens fit:').length - 1, 1); assert.ok(!text.includes('NEEDS-DECISION'));
  await writeFile(join(dir, 'src/styles.css'), '@import "tailwindcss"; @theme { --*: initial; --shadow-low: 0 1px 2px #123456; --shadow-card: var(--shadow-low); } .a { box-shadow: 0 4px 8px #123456; }');
  const named = findings(run(dir), 'provenance/elevation');
  assert.equal(named.length, 1); assert.ok(!named[0].action.includes('no named')); assert.match(named[0].action, /^No token is close to/);
});

test('type hint explains individual-token checks with a supported source selector, retaining real drift', async t => {
  const dir = await project(t, '@import "tailwindcss"; @theme { --*: initial; --text-body: 16px; } .a { font-size: 17px; font-weight: 500; }');
  const r = run(dir);
  assert.match(r.configHints.type, /type values are checked individually/);
  assert.match(r.configHints.type, /decisions.type.from.*theme:--text-\*/);
  assert.ok(!r.configHints.type.includes('utility:'));
  assert.equal(findings(r, 'provenance/type').length, 2);
  const text = run(dir, ['--all'], false);
  assert.equal((text.match(/Setup\s+type:/g) ?? []).length, 1);
  await writeFile(join(dir, 'plumber.config.ts'), "export default { decisions: { type: { from: 'theme:--text-*' } } };");
  assert.equal(findings(run(dir), 'provenance/type').length, 2);
  const schema = JSON.parse(await readFile(join(root, 'schema/report.schema.json')));
  assert.equal(schema.properties.configHints.properties.type.type, 'string');
});

test('init selects four roadmap habits; other habits stay available by explicit opt-in', async t => {
  const dir = await project(t, '.a:hover { transition: all 200ms ease-in; } .b { outline: none; margin-left: 2px; height: 100vh; }');
  await rm(join(dir, 'plumber.config.ts'));
  run(dir, ['init']);
  const config = await import(`file://${join(dir, 'plumber.config.ts')}`);
  assert.deepEqual(config.default.habits, ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in']);
  const proposed = run(dir);
  assert.ok(!findings(proposed, 'habits/logical-inline').length);
  await writeFile(join(dir, 'plumber.config.ts'), "export default { habits: ['logical-inline', 'viewport-dynamic'] };");
  const explicit = run(dir);
  assert.equal(findings(explicit, 'habits/logical-inline').length, 1);
  assert.equal(findings(explicit, 'habits/viewport-dynamic').length, 1);
});

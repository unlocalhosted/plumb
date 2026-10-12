import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(root, 'fixtures/.attribution-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/attribution'), dir, { recursive: true });
  return dir;
}
function run(dir) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', dir, '--json'], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error); assert.equal(result.stderr, ''); assert.equal(result.status, 1);
  return JSON.parse(result.stdout);
}

test('nondecision literals belong to one source definition per family with distinct transitive consumer counts', async t => {
  const dir = await fixture(t), report = run(dir);
  const well = report.findings.filter(f => f.variable?.name === '--well');
  assert.deepEqual(well.map(f => f.family).sort(), ['color', 'elevation']);
  for (const f of well) {
    assert.deepEqual(f.variable, { name: '--well', useCount: 3 });
    assert.deepEqual(f.sites.map(({ ledger, ...site }) => site), [{ file: join(dir, 'src/styles.css'), line: 5, column: 3, text: '--well: 0 2px 4px rgba(60,55,40,.11)' }]);
    assert.equal(f.sites[0].ledger.status, 'new');
    assert.ok(f.ledgerKeys.includes(f.sites[0].ledger.key));
    assert.ok(f.sites[0].ledger.key.includes(':--well:--well:'));
    assert.ok(f.occurrences.every(d => d.prop === '--well' && d.origin === 'custom-property'));
    assert.equal(f.declaration.origin, 'custom-property'); assert.equal(f.declaration.prop, '--well');
    assert.equal(f.declaration.value, '0 2px 4px rgba(60,55,40,.11)'); assert.ok(f.sites[0].text.includes('--well'));
    assert.ok(f.decisions.every(d => d.use.css.startsWith('--well:')));
  }
  assert.ok(!report.findings.some(f => f.sites.some(s => /box-shadow: var\(--well|boxShadow:/.test(s.text))));
  assert.ok(!report.findings.some(f => f.variable?.name === '--well-alias'));
  assert.ok(report.findings.some(f => f.variable?.name === '--tint' && f.variable.useCount === 1));
  assert.ok(report.findings.some(f => f.sites.some(s => s.text.startsWith('background: linear-gradient(var(--tint)'))));
  const tier = report.findings.find(f => f.rule === 'provenance/color/tier');
  assert.ok(tier.sites.some(s => s.text === 'color: var(--color-brand)')); assert.equal(tier.variable, undefined);
  assert.ok(!report.findings.some(f => f.sites.some(s => s.text === 'color: var(--color-text-muted)')));
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z']) {
    const c = report.coverage[family]; assert.equal(c.total, c.fromDecisions + c.findings);
  }
  assert.deepEqual(run(dir).findings, report.findings);
  // Warm source edits refresh values, keys and counts without cache clearing.
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css'; export const App = () => null;");
  const warm = run(dir); assert.equal(warm.findings.find(f => f.variable?.name === '--well').variable.useCount, 2);
  const css = await readFile(join(dir, 'src/styles.css'), 'utf8');
  await writeFile(join(dir, 'src/styles.css'), css.replace('rgba(60,55,40,.11)', 'rgba(80,75,60,.12)'));
  assert.notEqual(run(dir).findings.find(f => f.variable?.name === '--well').key, well[0].key);
});

test('outside-source and package nondecisions prove existence but produce no use-site provenance', async t => {
  const dir = await fixture(t);
  await mkdir(join(dir, 'node_modules/palette'), { recursive: true });
  await writeFile(join(dir, 'node_modules/palette/package.json'), '{"style":"./theme.css"}');
  await writeFile(join(dir, 'node_modules/palette/theme.css'), '.scope { --package-well: 0 1px 9px #123456; --package-ink: #123456; }');
  const css = await readFile(join(dir, 'src/styles.css'), 'utf8');
  await writeFile(join(dir, 'src/styles.css'), `@import 'palette';\n${css}\n.package { box-shadow: var(--package-well); color: var(--package-ink); }`);
  const report = run(dir);
  assert.ok(!report.findings.some(f => f.rule === 'existence/dead-var'));
  assert.ok(!report.findings.some(f => f.sites.some(s => /^(?:box-shadow|color): var\(--(?:vendor|package)-/.test(s.text))));
  assert.ok(!report.findings.some(f => f.variable?.name.startsWith('--vendor-') || f.variable?.name.startsWith('--package-')));
  assert.ok(report.findings.some(f => f.sites.some(s => s.text === 'background: linear-gradient(var(--vendor-ink), #ff00ff)')));
  // Changing the source boundary makes the exact same authored vendor values
  // reviewable at their definitions; package CSS remains framework-owned.
  await writeFile(join(dir, 'plumb.config.ts'), "export default { source: ['src/**/*.{tsx,css}', 'vendor/*.css'] };");
  const included = run(dir);
  for (const name of ['--vendor-well', '--vendor-ink']) {
    const f = included.findings.find(f => f.variable?.name === name);
    assert.ok(f, name); assert.ok(f.sites.every(s => s.file === join(dir, 'vendor/theme.css')));
  }
  assert.ok(!included.findings.some(f => f.variable?.name.startsWith('--package-')));
});

test('definition attribution covers every judged family, compiled classes, inline and embedded CSS', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/styles.css'), `@import 'tailwindcss'; @theme { --spacing-control: 12px; --radius-control: 12px; --text-body: 16px; --duration-quick: 120ms; --z-dialog: 50; --shadow-float: 0 1px 2px var(--color-brand); --color-brand: #000; }
    :root { --gap: 13px; --round: 13px; --text: 17px; --time: 123ms; --depth: 51; --local-shadow: 0 2px 5px #123456; }
    .uses { padding: var(--gap); border-radius: var(--round); font-size: var(--text); transition-duration: var(--time); z-index: var(--depth); }
    .again { margin: var(--gap); border-top-left-radius: var(--round); line-height: var(--text); animation-duration: var(--time); z-index: var(--depth); }
    .inline-consumer { color: var(--inline-ink); }
    .embedded-consumer { color: var(--embedded-ink); }`);
  await writeFile(join(dir, 'src/App.tsx'), `import './styles.css';
    <div className="shadow-[var(--local-shadow)]" />;
    <div style={{ boxShadow: 'var(--local-shadow)', '--inline-ink': '#fedcba' }} />;
    <style>{'.embedded { --embedded-ink: #abcdef; }'}</style>;`);
  const report = run(dir);
  for (const [name, family] of [['--gap', 'spacing'], ['--round', 'radius'], ['--text', 'type'], ['--depth', 'z']]) {
    const fs = report.findings.filter(f => f.variable?.name === name && f.family === family);
    assert.equal(fs.length, 1, name); assert.equal(fs[0].sites.length, 1); assert.equal(fs[0].variable.useCount, 2);
    assert.equal(fs[0].declaration.prop, name); assert.ok(!fs[0].rule.startsWith('provenance/arbitrary'));
  }
  assert.ok(report.decisions.some(d => d.name === '--time' && d.family === 'motion' && d.origin === 'project'));
  assert.ok(!report.findings.some(f => f.family === 'motion' && f.rule.startsWith('provenance/')));
  assert.deepEqual(report.coverage.motion, { fromDecisions: 2, total: 2, findings: 0 });
  for (const family of ['color', 'elevation']) {
    const f = report.findings.find(f => f.variable?.name === '--local-shadow' && f.family === family);
    assert.ok(f, family); assert.equal(f.variable.useCount, 2); assert.equal(f.sites.length, 1);
  }
  for (const name of ['--inline-ink', '--embedded-ink']) {
    const f = report.findings.find(f => f.variable?.name === name);
    assert.ok(f, name); assert.equal(f.variable.useCount, 1); assert.equal(f.sites[0].file, join(dir, 'src/App.tsx'));
    assert.ok(f.sites[0].text.includes(name));
  }
  assert.ok(!report.findings.some(f => f.sites.some(s => s.text === 'shadow-[var(--local-shadow)]' || /^(?:padding|margin|border-radius|font-size|transition-duration|z-index): var\(--/.test(s.text))));
});

test('scoped and conditional literals retain distinct definitions without consumer findings', async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, 'src/styles.css'), `:root { --color-brand: #000; --alias: var(--scoped); --conditional: #fedcba; }
    .one { --scoped: #123456; }
    .two { --scoped: #abcdef; }
    @media (min-width: 600px) { :root { --conditional: #123456; } }
    .uses { color: var(--alias); background-color: var(--conditional); }
    .again { border-color: var(--alias); outline-color: var(--conditional); }`);
  await writeFile(join(dir, 'src/App.tsx'), "import './styles.css';");
  const r = run(dir);
  for (const name of ['--scoped', '--conditional']) {
    const fs = r.findings.filter(f => f.variable?.name === name);
    assert.equal(fs.length, 2, name);
    assert.ok(fs.every(f => f.sites.length === 1 && f.variable.useCount === 2));
    assert.notEqual(fs[0].key, fs[1].key);
  }
  assert.ok(r.findings.filter(f => !f.rule.startsWith('dead/')).every(f => f.declaration.origin === 'custom-property'));
  assert.ok(!r.findings.some(f => f.variable?.name === '--alias'));
  assert.deepEqual(r.coverage.color, { fromDecisions: 0, total: 4, findings: 4 });
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(directory, args = []) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, ...args, '--json'], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
const fixture = name => join(root, 'fixtures', name);
async function copy(t, name) {
  const directory = await mkdtemp(join(root, 'fixtures/.layer3-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(fixture(name), directory, { recursive: true });
  return directory;
}

test('decision inspection preserves Tailwind origin, source and semantic tier, and namespace resets', async t => {
  const records = run(fixture('tailwind-min'), ['decisions']);
  const byName = new Map(records.map(record => [record.name, record]));
  assert.equal(byName.get('--color-brand').origin, 'project');
  assert.equal(byName.get('--color-red-500').origin, 'framework');
  assert.ok(byName.get('--color-red-500').source.file.includes('/node_modules/tailwindcss/'));
  assert.equal(byName.get('--color-text-muted').tier, 'semantic');
  assert.equal(byName.get('--color-text-muted').resolved, '#2563eb');
  assert.ok(!byName.has('--spacing'));
  assert.ok(run(fixture('tailwind-min'), ['decisions', '--family', 'color']).every(record => record.family === 'color'));
  const reset = run(fixture('tailwind-reset'), ['decisions', '--family', 'color']);
  assert.deepEqual(reset.map(record => record.name), ['--color-brand']);
  const directory = await copy(t, 'tailwind-reset');
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @theme { --*: initial; --color-brand: #123456; }');
  assert.deepEqual(run(directory, ['decisions']).map(record => record.name), ['--color-brand']);
  // Theme loading must work even when there are no candidates to compile.
  await writeFile(join(directory, 'src/App.tsx'), "import './styles.css'; export const App = () => null;");
  assert.equal(run(directory, ['decisions'])[0].value, '#123456');
  await mkdir(join(directory, 'node_modules/palette'), { recursive: true });
  await writeFile(join(directory, 'node_modules/palette/package.json'), '{"style":"./theme.css"}');
  await writeFile(join(directory, 'node_modules/palette/theme.css'), '@theme { --color-package: #abcdef; }');
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @import "palette"; @theme { --color-brand: #123456; }');
  assert.equal(run(directory, ['decisions']).find(record => record.name === '--color-package').origin, 'framework');
});

test('spacing slice judges all origins, resolves chains/calc, groups fixes and names nearest reasons', () => {
  const report = run(fixture('spacing'));
  const arbitrary = report.findings.find(f => f.rule === 'provenance/arbitrary');
  assert.deepEqual(arbitrary.decisions.map(d => d.resolved), ['12px', '16px']);
  assert.match(arbitrary.fix, /gap-s3.*between label and control/);
  assert.match(arbitrary.fix, /gap-s4.*breathing room for a group/);
  const ten = report.findings.filter(f => f.rule === 'provenance/spacing' && f.declaration.resolved === '10px');
  assert.equal(ten.length, 1);
  assert.equal(ten[0].sites.length, 2);
  assert.ok(ten[0].sites.some(site => site.text === 'padding: 10'));
  assert.ok(ten[0].sites.some(site => site.text === 'margin: 10px'));
  const chain = report.decisions.find(d => d.name === '--spacing-chain');
  assert.equal(chain.resolved, '12px');
  assert.ok(report.declarations.some(d => d.value === 'calc(var(--middle-step) + 4px)' && d.resolved === '16px'));
  for (const value of ['var(--cycle-a)', 'var(--dark-step)']) {
    assert.ok(report.findings.some(f => f.declaration.value === value && f.declaration.resolved === undefined));
  }
  // Both authored media-step definitions use the ladder. Their unresolved
  // consumer is no longer a separate provenance obligation.
  assert.ok(!report.findings.some(f => f.declaration.value === 'var(--media-step)'));
  assert.ok(!report.findings.some(f => f.sites.some(site => /gap-s2|gap-12|-m-12|space-x-12/.test(site.text))));
  assert.equal(report.findings.find(f => f.rule === 'provenance/opaque-inline').severity, 'info');
  assert.equal(report.coverage.spacing.total, report.coverage.spacing.fromDecisions + report.coverage.spacing.findings);
  assert.ok(report.declarations.some(d => d.origin === 'keyframes' && d.value === '13px'));
  assert.ok(!report.findings.filter(f => !f.rule.startsWith('dead/')).some(f => f.declaration.origin === 'keyframes' || f.declaration.sourceOrigin === 'framework' || f.declaration.prop.startsWith('--')));
  const warm = run(fixture('spacing'));
  assert.deepEqual(warm.findings, report.findings);
  assert.deepEqual(warm.decisions, report.decisions);
});

test('imported project CSS outside source globs proves existence without spacing judgement', async t => {
  const directory = await copy(t, 'spacing');
  const outside = join(directory, 'packages/ui/theme.css');
  const inside = join(directory, 'src/styles.css');
  await mkdir(join(directory, 'packages/ui'), { recursive: true });
  await writeFile(outside, '.outside { margin: 13px; }');
  await writeFile(inside, '@import "tailwindcss"; @theme { --spacing: 1px; --spacing-small: 12px; } .inside { margin: 13px; }');
  await writeFile(join(directory, 'src/App.tsx'), "import './styles.css'; import '../packages/ui/theme.css'; <div className='outside inside' />;");
  await writeFile(join(directory, 'plumber.config.ts'), "export default { source: ['src/**/*.{tsx,css}'] };");
  const report = run(directory);
  assert.ok(report.stylesheets.some(sheet => sheet.file === outside && sheet.sourceOrigin === 'project'));
  assert.ok(!report.findings.some(f => f.rule.startsWith('existence/')), 'outside CSS still proves class existence');
  assert.ok(!report.declarations.some(d => d.site.file === outside));
  const spacing = report.findings.filter(f => f.family === 'spacing' && !f.rule.startsWith('dead/'));
  assert.equal(spacing.length, 1);
  assert.equal(spacing[0].rule, 'provenance/spacing');
  assert.equal(spacing[0].declaration.resolved, '13px');
  assert.deepEqual(spacing[0].sites.map(site => site.file), [inside]);
  assert.deepEqual(report.coverage.spacing, { fromDecisions: 0, total: 1, findings: 1 });
});

test('spacing policies enforce origin, tier and reference identity and refresh on warm config/source edits', async t => {
  const directory = await copy(t, 'spacing');
  await writeFile(join(directory, 'src/styles.css'), `@import "tailwindcss";
    @theme { --spacing: 1px; --spacing-base: 12px; --spacing-related: var(--spacing-base);
      /* why: intent despite literal tier: semantic */ --spacing-intent: 16px; }
    :root { --spacing-root: 8px; } .applied { @apply gap-base; } .literal { margin-inline: 12px; }`);
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css'; <div className="gap-base gap-related gap-intent gap-12" style={{ scrollMargin: '12px', gap: 'var(--spacing-root)' }} />;`);
  await writeFile(join(directory, 'plumber.config.ts'), 'export default {};');
  let report = run(directory);
  assert.ok(report.findings.some(f => f.rule === 'provenance/spacing/tier' && f.sites.some(s => s.text === 'gap-base')));
  assert.ok(report.findings.some(f => f.rule === 'provenance/spacing/tier' && f.sites.some(s => s.text.includes('@apply'))));
  assert.equal(report.decisions.find(d => d.name === '--spacing-intent').tier, 'semantic');
  await writeFile(join(directory, 'plumber.config.ts'), "export default { decisions: { spacing: { from: ['theme:--spacing-*', 'css:src/styles.css'], callers: ['primitive', 'semantic'], identity: 'reference' } } };");
  report = run(directory);
  assert.ok(report.findings.some(f => f.rule === 'provenance/spacing/by-value' && f.severity === 'warn'));
  assert.ok(!report.findings.some(f => f.rule.endsWith('/tier')));
  await writeFile(join(directory, 'node_modules-scale.css'), '@theme { --spacing-scale: 12px; }');
  await mkdir(join(directory, 'node_modules/scale'), { recursive: true });
  await writeFile(join(directory, 'node_modules/scale/package.json'), '{"style":"./theme.css"}');
  await writeFile(join(directory, 'node_modules/scale/theme.css'), '@theme { --spacing-scale: 12px; }');
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @import "scale";');
  await writeFile(join(directory, 'src/App.tsx'), "import './styles.css'; <div className='gap-scale' />;");
  assert.equal(run(directory).findings[0].rule, 'config/no-tokens');
  await writeFile(join(directory, 'plumber.config.ts'), "export default { decisions: { spacing: { from: 'theme:--spacing-*', origins: ['project', 'framework'] } } };");
  assert.deepEqual(run(directory).findings, []);
});

test('DTCG and preset readers carry source reasons, references and tier overrides through CLI', () => {
  const records = run(fixture('dtcg'), ['decisions']);
  assert.equal(records.find(d => d.name === 'space.alias').resolved, '12px');
  assert.equal(records.find(d => d.name === 'space.alias').tier, 'semantic');
  assert.equal(records.find(d => d.name === 'space.intent').tier, 'semantic');
  assert.equal(records.find(d => d.name === 'space.small').tier, 'primitive');
  const finding = run(fixture('dtcg')).findings[0];
  assert.deepEqual(finding.decisions.map(d => d.resolved), ['12px', '16px']);
  assert.ok(finding.decisions.every(d => d.why && d.source.line > 1));
  const preset = run(fixture('preset'));
  assert.deepEqual(preset.findings[0].decisions.map(d => d.why), ['preset related parts', 'preset separate groups']);
  assert.equal(preset.coverage.spacing.fromDecisions, 1);
});

test('numeric spacing coverage includes JSX props, joined arrays and bounded template/const branches', async t => {
  const directory = await copy(t, 'spacing');
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css';
    export function App({ compact }) {
      const rows = compact ? 'gap-12' : 'gap-16';
      return <Host play={{ node: <div className='gap-13' /> }} more={<div className={['p-13', compact ? 'm-12' : 'm-16'].join(' ')} />}>
        <div className={\`flex \${compact ? 'gap-12' : 'gap-16'} \${rows}\`} />
      </Host>;
    }`);
  const report = run(directory);
  assert.ok(report.findings.some(f => f.sites.some(s => s.text === 'gap-13')));
  assert.ok(report.findings.some(f => f.sites.some(s => s.text === 'p-13')));
  for (const text of ['gap-12', 'gap-16', 'm-12', 'm-16']) assert.ok(report.declarations.some(d => d.site.text === text && d.resolved));
  assert.ok(!report.findings.some(f => f.rule === 'existence/dynamic-class'));
});

test('bounded static resolution and per-property fixes keep nondecision units separate from ladder identity', async t => {
  const directory = await copy(t, 'spacing');
  const aliases = Array.from({ length: 10 }, (_, index) => `--alias-${index}: ${index === 9 ? '12px' : `var(--alias-${index + 1})`};`).join('\n');
  await writeFile(join(directory, 'src/styles.css'), `@import "tailwindcss"; @theme { --spacing: 1px; --spacing-small: 12px; --spacing-large: 16px; --spacing-roomy: 24px; }
    :root { ${aliases} --tw-measure: 12px; }
    .resolved { padding: calc((var(--alias-8) + 4px) * 1); margin: var(--tw-measure); }
    .bounded { padding: var(--alias-0); margin: calc(12px + 1rem); }
    .drift { padding-top: 13px; column-gap: 13px; scroll-margin-inline-start: 13px; }`);
  await writeFile(join(directory, 'src/App.tsx'), "import './styles.css'; <div className='gap-[12px] gap-[13px]' />;");
  const report = run(directory);
  assert.ok(report.declarations.some(d => d.value === 'calc((var(--alias-8) + 4px) * 1)' && d.resolved === '16px'));
  assert.ok(report.declarations.some(d => d.value === 'var(--tw-measure)' && d.resolved === '12px'));
  assert.ok(report.findings.some(f => f.declaration.value === 'var(--alias-0)' && f.declaration.resolved === undefined));
  assert.ok(report.declarations.some(d => d.value === 'calc(12px + 1rem)' && d.resolved === '28px'));
  const drift = report.findings.find(f => f.rule === 'provenance/spacing' && f.declaration.resolved === '13px');
  assert.match(drift.fix, /pt-small/);
  assert.match(drift.fix, /gap-x-small/);
  assert.match(drift.fix, /scroll-ms-small/);
  assert.ok(!report.findings.some(f => f.sites.some(s => s.text === 'gap-[12px]')));
});

test('spacing judges authored candidate values and utility definitions, never static utility uses', async t => {
  const directory = await copy(t, 'spacing');
  await writeFile(join(directory, 'src/styles.css'), `@import "tailwindcss";
    @theme { --spacing: 1px; --spacing-small: 12px; --spacing-large: 16px; --spacing-roomy: 24px; }
    @utility custom-spacing { margin: 13px; }
    @utility unused-spacing { padding: 15px; }`);
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css';
    <div className="sr-only hover:sr-only truncate container mt-auto inset-ring custom-spacing hover:custom-spacing" />;
    <div className="custom-spacing mt-[13px] mt-13 mt-small left-1/2 [padding:13px]" />;`);
  const cold = run(directory), warm = run(directory);
  const spacing = cold.findings.filter(f => f.family === 'spacing');
  assert.ok(cold.declarations.some(d => d.site.text === 'sr-only' && d.prop === 'margin' && d.value === '-1px'));
  for (const text of ['sr-only', 'hover:sr-only', 'truncate', 'container', 'mt-auto', 'inset-ring', 'custom-spacing', 'hover:custom-spacing']) {
    assert.ok(!spacing.some(f => f.sites.some(s => s.text === text)), text);
    assert.ok(cold.declarations.filter(d => d.site.text === text).every(d => d.authoredValue === false), text);
  }
  for (const text of ['mt-[13px]', 'mt-13', '[padding:13px]']) assert.ok(spacing.some(f => f.sites.some(s => s.text === text)), text);
  assert.ok(!spacing.some(f => f.sites.some(s => s.text === 'mt-small' || s.text === 'left-1/2')));
  const definitions = cold.declarations.filter(d => d.origin === 'stylesheet' && d.sourceOrigin === 'project' && ['margin', 'padding'].includes(d.prop));
  assert.deepEqual(definitions.map(d => [d.site.text, d.site.line]), [['margin: 13px', 3], ['padding: 15px', 4]]);
  assert.ok(spacing.some(f => f.sites.some(s => s.text === 'margin: 13px')));
  assert.ok(spacing.some(f => f.sites.some(s => s.text === 'padding: 15px')));
  assert.deepEqual(cold.coverage.spacing, { fromDecisions: 2, total: 7, findings: 5 });
  assert.equal(warm.timing.cacheMisses, 0);
  assert.deepEqual(warm.declarations, cold.declarations);
  assert.deepEqual(warm.findings, cold.findings);
});

test('fully opaque inline declarations remain inline counts while only known dynamic spacing warns', async t => {
  const directory = await copy(t, 'spacing');
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing: 1px; --spacing-small: 12px; }');
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css';
    export function App({ styles, measured, property }) { return <>
      <div style={styles} />
      <div style={{ ...styles }} />
      <div style={{ [property]: measured }} />
      <div style={{ opacity: measured }} />
    </>; }`);
  const opaque = run(directory);
  assert.deepEqual(opaque.findings.filter(f => !f.rule.startsWith('dead/')), []);
  assert.deepEqual(opaque.coverage.spacing, { fromDecisions: 0, total: 0, findings: 0 });
  assert.deepEqual(opaque.coverage.inline, { sites: 4, literalSites: 0, opaque: 4, fullyOpaque: 3, spreads: 3 });
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css';
    export function App({ styles, measured }) { return <div style={{ ...styles, padding: measured, gap: measured, opacity: measured }} />; }`);
  const report = run(directory);
  assert.deepEqual(report.coverage.spacing, { fromDecisions: 0, total: 2, findings: 2 });
  assert.deepEqual(report.coverage.inline, { sites: 1, literalSites: 0, opaque: 4, fullyOpaque: 1, spreads: 1 });
  const finding = report.findings[0];
  assert.equal(finding.rule, 'provenance/opaque-inline');
  assert.deepEqual(finding.sites.map(s => s.text), ['padding: measured', 'gap: measured']);
  const text = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--verbose'], { encoding: 'utf8' });
  assert.equal(text.status, 0, 'known runtime values are warnings');
  assert.match(text.stdout, /4 opaque declarations \(1 fully opaque\)/);
});

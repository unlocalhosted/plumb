import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Session } from '../dist/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(directory, args = []) {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, ...args, '--json'], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
async function project(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.inline-values-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/spacing'), directory, { recursive: true });
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing: 1px; /* why: between label and control */ --spacing-s3: 12px; /* why: breathing room for a group */ --spacing-s4: 16px; }');
  await writeFile(join(directory, 'src/tokens.ts'), 'export const BASE = 4;\nexport const GAP = { sm: BASE * 3, lg: 16 };\n');
  return directory;
}
const app = `import './styles.css';
import { GAP, BASE } from './tokens';
import type { FC } from 'react';
const STAGGER = 4;
type Size = 'sm' | 'lg';
const base = { gap: BASE * 3 };
const boxed = { ...base, padding: 'var(--spacing-s4)' };
export function App({ items, size, tight = false, n }: { items: string[]; size: Size; tight?: boolean; n: number }) {
  return items.map((item, k) => (
    <div key={item}>
      <div style={{ gap: \`\${k * STAGGER * 2}px\` }} />
      <div style={{ gap: 'var(--spacing-s3)' }} />
      <div style={{ gap: \`calc(var(--spacing-s3) * \${k})\` }} />
      <div style={{ gap: STAGGER * 3 }} />
      <div style={{ gap: GAP[size] }} />
      <div style={{ gap: GAP.lg }} />
      <div style={{ gap: tight ? 12 : 16 }} />
      <div style={{ ...boxed, margin: size === 'sm' ? 12 : 13 }} />
      <div style={{ gap: \`var(--spacing-\${size})\` }} />
      <div style={{ gap: k * 13 }} />
      <div style={{ gap: n }} />
      <div style={{ gap: Math.round(BASE * 2.6) }} />
      <div style={{ gap: \`\${n}px\` }} />
      <div style={tight ? base : { gap: 16 }} />
    </div>
  ));
}
export const Card: FC<{ size: Size }> = ({ size }) => <div style={{ padding: size === 'sm' ? 12 : 16 }} />;
`;

test('runtime style values are read symbolically, and only what source cannot decide stays opaque', async t => {
  const directory = await project(t);
  await writeFile(join(directory, 'src/App.tsx'), app);
  const report = run(directory);
  const inline = report.declarations.filter(d => d.origin === 'inline');
  const at = line => inline.filter(d => d.site.line === line);
  const row = line => at(line).map(d => [d.value, d.dynamic?.kind ?? d.opaque ?? 'literal', d.when.map(c => c.text).join(' & ')]);
  const findingsAt = line => report.findings.filter(f => f.sites.some(s => s.file.endsWith('App.tsx') && s.line === line)).map(f => [f.rule, f.title]);

  // A constant times a runtime number is a step; the step is judged, with the multiplier named.
  assert.deepEqual(row(11), [['8px', 'step', '']]);
  assert.deepEqual(findingsAt(11), [['provenance/spacing', "gap steps by 8px × k, and 8px isn't on your spacing scale"]]);
  assert.equal(at(11)[0].dynamic.by, 'k');
  // A token reference in a string or beside a runtime hole is provenance by reference.
  assert.deepEqual(row(12), [['var(--spacing-s3)', 'literal', '']]);
  assert.deepEqual(row(13), [['calc(var(--spacing-s3) * ${k})', 'reference', '']]);
  assert.deepEqual(at(13)[0].refs, ['--spacing-s3']);
  assert.equal(at(13)[0].resolved, undefined);
  assert.deepEqual(findingsAt(12), []); assert.deepEqual(findingsAt(13), []);
  // Module constants fold, locally and across an import, through arithmetic and member access.
  assert.deepEqual(row(14), [['12px', 'literal', '']]);
  assert.deepEqual(row(16), [['16px', 'literal', '']]);
  // A table read by a typed key is every row, each under its branch.
  assert.deepEqual(row(15), [['12px', 'literal', 'size === "sm"'], ['16px', 'literal', 'size === "lg"']]);
  assert.deepEqual(row(17), [['12px', 'literal', 'tight'], ['16px', 'literal', '!(tight)']]);
  assert.deepEqual(findingsAt(14), []); assert.deepEqual(findingsAt(15), []); assert.deepEqual(findingsAt(16), []); assert.deepEqual(findingsAt(17), []);
  // Spreads of readable objects bring their properties, nested; only the off-scale branch is a finding.
  assert.deepEqual(row(18).sort(), [['12px', 'literal', ''], ['13px', 'literal', "!(size === 'sm')"], ['12px', 'literal', "size === 'sm'"], ['var(--spacing-s4)', 'literal', '']].sort());
  assert.deepEqual(findingsAt(18), [['provenance/spacing', "margin 13px isn't on your spacing scale"]]);
  assert.deepEqual(report.findings.find(f => f.sites.some(s => s.line === 18)).declaration.when, [{ kind: 'branch', text: "!(size === 'sm')" }]);
  // A hole inside a variable name is read through its finite domain, so each name is checked for existence.
  assert.deepEqual(row(19), [['var(--spacing-sm)', 'literal', 'size === "sm"'], ['var(--spacing-lg)', 'literal', 'size === "lg"']]);
  assert.deepEqual(findingsAt(19).map(f => f[0]).sort(), ['existence/dead-var', 'existence/dead-var', 'provenance/spacing', 'provenance/spacing']);
  // A bare step takes React's px rule.
  assert.deepEqual(row(20), [['13px', 'step', '']]);
  assert.deepEqual(findingsAt(20), [['provenance/spacing', "gap steps by 13px × k, and 13px isn't on your spacing scale"]]);
  // An untyped runtime number stays opaque, bare or in a template, at info level.
  assert.deepEqual(row(21), [['dynamic-value', 'dynamic-value', '']]);
  assert.deepEqual(row(23), [['dynamic-value', 'dynamic-value', '']]);
  assert.deepEqual(findingsAt(21), [['provenance/opaque-inline', "This gap is computed at runtime, so it can't be checked"]]);
  // Math on constants folds.
  assert.deepEqual(row(22), [['10px', 'literal', '']]);
  assert.deepEqual(findingsAt(22), [['provenance/spacing', "gap 10px isn't on your spacing scale"]]);
  // A branch between whole style objects reads both.
  assert.deepEqual(row(24), [['12px', 'literal', 'tight'], ['16px', 'literal', '!(tight)']]);
  // FC<Props> types the first parameter through the variable.
  assert.deepEqual(row(28), [['12px', 'literal', "size === 'sm'"], ['16px', 'literal', "!(size === 'sm')"]]);
  assert.deepEqual(findingsAt(28), []);
  assert.equal(report.coverage.inline.sites, 15);
  assert.equal(report.coverage.inline.opaque, 2);
  assert.equal(report.coverage.inline.literalSites, 13);
  assert.equal(run(directory).timing.cacheMisses, 0, 'symbolic reads are cached with the source');
});

test('a step keeps its multiplier when the token is written: the token becomes the step', async t => {
  const directory = await project(t);
  await writeFile(join(directory, 'src/App.tsx'), "import './styles.css';\nexport const App = ({ items }: { items: string[] }) => items.map((item, k) => <div key={item} style={{ gap: k * 13 }} />);\n");
  const session = await Session.create({ root: directory, watch: false });
  t.after(() => session.close());
  const result = await session.edits('src/App.tsx', 2);
  const edit = result.edits.find(edit => edit.token === '--spacing-s3');
  assert.ok(edit, JSON.stringify(result.edits));
  assert.equal(edit.from, 'gap: k * 13');
  assert.equal(edit.to, 'gap: `calc(var(--spacing-s3) * ${k})`');
  await session.apply({ file: result.file, hash: result.hash, edits: [{ id: edit.id }] });
  const after = run(directory);
  assert.deepEqual(after.declarations.filter(d => d.origin === 'inline').map(d => [d.value, d.dynamic?.kind]), [['calc(var(--spacing-s3) * ${k})', 'reference']]);
  assert.deepEqual(after.findings.filter(f => f.rule.startsWith('provenance/')), []);
});

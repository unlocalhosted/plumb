// Run from repo root: npm run build && node scripts/docs/record-judged.mjs
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = resolve(repo, 'fixtures/docs-judged');
const cache = await mkdtemp(resolve(tmpdir(), 'plumb-docs-judged-'));
let report, exitCode;
try {
  const run = spawnSync(process.execPath, ['dist/cli.js', 'check', '--root', 'fixtures/docs-judged', '--json'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, PLUMB_CACHE_DIR: cache },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
  if (run.error) throw run.error;
  if (![0, 1].includes(run.status)) throw new Error(`CLI failed (${run.status}): ${run.stderr}`);
  report = JSON.parse(run.stdout);
  exitCode = run.status;
} finally {
  await rm(cache, { recursive: true, force: true });
}

if (!report.tailwind.version?.startsWith('4.')) throw new Error('Fixture must use Tailwind v4.');
if (report.findings.some(f => f.rule.startsWith('config/'))) throw new Error('Fixture has config diagnostics.');

// Keep report fields verbatim except file paths, made relative to fixture root.
// No extra compiler/resolver calls and no CSS values inferred from source text.
function portable(value, key) {
  if (Array.isArray(value)) return value.map(item => portable(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, portable(v, k)]));
  if (typeof value === 'string' && ['file', 'entry'].includes(key)) return relative(root, value).replaceAll('\\', '/');
  return value;
}
const definitions = [
  { id: 'arbitrary-class', file: 'src/Judged.tsx', text: 'gap-[13px]', authored: 'className="gap-[13px]"', origin: 'arbitrary', rule: 'provenance/arbitrary' },
  { id: 'apply', file: 'src/styles.css', text: '@apply gap-[13px];', authored: '@apply gap-[13px];', origin: 'apply', rule: 'provenance/spacing' },
  { id: 'inline', file: 'src/Judged.tsx', text: 'gap: 13', authored: 'style={{ gap: 13 }}', origin: 'inline', rule: 'provenance/spacing' },
  { id: 'plain-css', file: 'src/styles.css', text: 'gap: 13px', authored: 'gap: 13px;', origin: 'stylesheet', rule: 'provenance/spacing' },
  { id: 'on-scale', file: 'src/Judged.tsx', text: 'gap-3', authored: 'className="gap-3"', origin: 'class', rule: null },
];
const atSite = (a, b) => a.file === b.file && a.line === b.line && a.column === b.column && a.text === b.text;
const cases = [];
for (const item of definitions) {
  const file = resolve(root, item.file);
  const declarations = report.declarations.filter(d => d.site.file === file && d.site.text === item.text && d.origin === item.origin && d.prop === 'gap');
  if (declarations.length !== 1) throw new Error(`${item.id}: expected one reported gap declaration.`);
  const declaration = declarations[0];
  const matches = report.findings.filter(f => f.sites.some(s => atSite(s, declaration.site)));
  if (matches.length !== (item.rule ? 1 : 0) || (item.rule && matches[0].rule !== item.rule)) throw new Error(`${item.id}: unexpected CLI verdict.`);
  const finding = matches[0] ?? null;
  if (declaration.resolved !== (item.rule ? '13px' : '12px')) throw new Error(`${item.id}: unexpected reported resolution.`);
  if (finding && (finding.severity !== 'error' || JSON.stringify(finding.choices?.map(d => [d.name, d.value, d.resolved])) !== JSON.stringify([['--spacing-3', '12px', '12px'], ['--spacing-4', '16px', '16px']]))) throw new Error(`${item.id}: unexpected CLI choices.`);
  const line = (await readFile(file, 'utf8')).split('\n')[declaration.site.line - 1];
  if (!line?.includes(item.authored)) throw new Error(`${item.id}: authored text missing at reported line.`);
  cases.push({
    id: item.id,
    authored: { text: item.authored, file: item.file, line: declaration.site.line, column: line.indexOf(item.authored) + 1, site: portable(declaration.site) },
    declarations: portable(declarations),
    compiledDeclarations: item.origin === 'inline' ? null : declarations.map(d => ({ prop: d.prop, value: d.value, refs: d.refs, when: d.when })),
    resolved: declaration.resolved ?? null,
    finding: portable(finding),
    stageNotes: item.origin === 'inline' ? 'Inline style is collected directly, never sent through Tailwind. CLI exposes its normalized declaration, not a compiled stage.' : 'Declaration fields come from the final CLI report; no separate pre-judgement compiler snapshot is exposed.',
  });
}
const usedFindings = new Set(cases.map(c => c.finding?.key));
const output = resolve(repo, 'site/src/docs/recordings/judged.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({
  schemaVersion: 1,
  fixture: 'fixtures/docs-judged/',
  command: 'node dist/cli.js check --root fixtures/docs-judged --json',
  regenerate: 'npm run build && node scripts/docs/record-judged.mjs',
  cliExitCode: exitCode,
  tool: report.tool,
  tailwind: portable(report.tailwind),
  fieldNotes: {
    authored: 'Text checked against fixture source at the reported line; authored.column locates the complete spelling. authored.site is the raw declaration site.',
    declarations: 'Raw report.declarations matched by file, site.text, origin and property; file paths only normalized relative to fixture root.',
    compiledDeclarations: 'Raw prop/value/refs/when projected from declarations; null for inline because there is no compiler stage. Plain CSS in this entry also passes through the stylesheet compiler.',
    resolved: 'Raw declaration.resolved or null; no reconstruction or pixel conversion.',
    finding: 'Raw matching report.findings entry or null. Full grouped sites/occurrences retained: apply, inline and plain-css share one finding. Message fields are title/because/action/why/fix; choices retain name/value/resolved/why/use.',
    unexposed: 'Intermediate ASTs, complete generated CSS, per-part comparison values and numeric distances are not CLI report fields and are not reconstructed.',
  },
  cases,
  otherFindings: portable(report.findings.filter(f => !usedFindings.has(f.key))),
}, null, 2) + '\n');
console.log(`Recorded ${cases.length} CLI cases: ${relative(repo, output)}`);

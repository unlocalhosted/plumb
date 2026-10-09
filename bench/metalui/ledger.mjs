// Layer 6 acceptance runs only against a disposable copy of the docs tree.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = '/Users/vijaysingh/unlocalhosted/metalui';
const directory = await mkdtemp(join(tmpdir(), 'plumb-layer6-metalui-'));
const cache = resolve(root, 'bench/metalui/.cache/layer6');
const config = resolve(root, 'bench/metalui/plumb.config.ts');
const sourceHead = spawnSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const result = { sourceHead, copiedDocs: true, sourceReadOnly: true, cache, counts: {}, checks: {}, acceptance: {} };
function run(args = [], status = 0, json = true) {
  const start = performance.now();
  const child = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--config', config, ...args, ...(json ? ['--json'] : [])], {
    cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60_000, env: { ...process.env, PLUMB_CACHE_DIR: cache },
  });
  assert.ifError(child.error);
  assert.equal(child.status, status, child.stderr || child.stdout.slice(-3000));
  return { wallMs: performance.now() - start, data: json ? JSON.parse(child.stdout) : child.stdout };
}
const errors = report => report.findings.filter(f => f.severity === 'error');
try {
  await mkdir(join(directory, 'apps'), { recursive: true });
  await cp(join(source, 'apps/docs'), join(directory, 'apps/docs'), { recursive: true,
    filter: path => !['node_modules', 'dist', '.cache', '.plumb-cache'].includes(basename(path)) });
  // Resolution uses existing installations; no packages are copied or installed.
  await cp(join(source, 'package.json'), join(directory, 'package.json'));
  await symlink(join(source, 'node_modules'), join(directory, 'node_modules'), 'dir');
  await mkdir(join(directory, 'packages'), { recursive: true });
  await symlink(join(source, 'packages/metalui'), join(directory, 'packages/metalui'), 'dir');
  const baseline = run(['baseline']);
  const entries = baseline.data.entries;
  const byKind = {}, byRule = {}, byDecisionFamily = {};
  for (const entry of entries) {
    byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
    if (entry.kind === 'debt') byRule[entry.rule] = (byRule[entry.rule] ?? 0) + 1;
    if (entry.kind === 'decision') byDecisionFamily[entry.family] = (byDecisionFamily[entry.family] ?? 0) + 1;
  }
  result.counts = { total: entries.length, byKind: { debt: 0, exception: 0, decision: 0, ...byKind }, byRule, byDecisionFamily,
    debtSites: entries.filter(e => e.kind === 'debt').reduce((n, e) => n + e.count, 0) };
  result.checks.baseline = { wallMs: baseline.wallMs, exitCode: 0 };
  for (const label of ['first', 'warm']) {
    const checked = run();
    assert.deepEqual(errors(checked.data), []);
    assert.equal(checked.data.ledger.new, 0);
    result.checks[label] = { wallMs: checked.wallMs, exitCode: 0, timing: checked.data.timing, ledger: checked.data.ledger };
  }
  const added = join(directory, 'apps/docs/src/LedgerAcceptance.tsx');
  await writeFile(added, 'export function LedgerAcceptance() { return <div className="gap-10" />; }\n');
  const drift = run([], 1).data;
  assert.equal(errors(drift).length, 1);
  assert.equal(errors(drift)[0].sites.length, 1);
  result.acceptance.oneGap10 = { exitCode: 1, newFindings: errors(drift).length, newSites: drift.ledger.new };
  await rm(added);
  const ledgerFile = join(directory, '.plumb/ledger.jsonl');
  const baselineText = await readFile(ledgerFile, 'utf8');
  await writeFile(ledgerFile, baselineText + JSON.stringify({ key: 'handwritten-no-why', kind: 'exception' }) + '\n');
  const noWhy = run([], 1).data;
  assert.equal(errors(noWhy).filter(f => f.rule === 'ledger/no-why').length, 1);
  result.acceptance.missingWhy = { exitCode: 1, rule: 'ledger/no-why' };
  await writeFile(ledgerFile, baselineText);
  const theme = join(directory, 'apps/docs/src/styles.css');
  const originalTheme = await readFile(theme, 'utf8');
  await writeFile(theme, originalTheme.replace('@theme inline {', '@theme inline {\n  --spacing-13: 13px;'));
  const decision = run([], 1).data;
  assert.equal(errors(decision).filter(f => f.rule === 'decisions/unaccepted').length, 1);
  assert.match(errors(decision)[0].why, /--spacing-13/);
  result.acceptance.newDecision = { exitCode: 1, rule: 'decisions/unaccepted', decision: '--spacing-13' };
  await writeFile(theme, originalTheme);
  const entry = entries.find(e => e.kind === 'debt' && e.path.endsWith('.tsx') && e.path.includes('/pages/'));
  assert.ok(entry);
  const from = join(directory, entry.path), to = from.replace(/\.tsx$/, '.ledger-renamed.tsx');
  await rename(from, to);
  const rebased = run(['ledger', '--rebase'], 0, false).data;
  assert.match(rebased, /Moved /);
  assert.ok(rebased.includes(entry.key));
  assert.deepEqual(errors(run().data), []);
  result.acceptance.rename = { exitCode: 0, file: entry.path, moves: rebased.split('\n').filter(line => line.startsWith('Moved ')).length, printed: true };
  await writeFile(join(root, 'bench/metalui/layer6.run.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}

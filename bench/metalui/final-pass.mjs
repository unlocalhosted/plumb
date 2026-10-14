import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
const repo = resolve('.');
const live = process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui';
const commit = 'faa2036e4634e4f6c8d49feaa2dac87a77559501';
const cache = resolve('bench/metalui/.cache/final-check');
const snapshot = resolve(cache, 'snapshot');
const configDirectory = resolve(cache, 'config');
const config = resolve(configDirectory, 'all.config.ts');
function command(binary, args, options = {}) {
  const start = performance.now();
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, ...options });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout.slice(0, 1000));
  return { result, wallMs: performance.now() - start };
}
mkdirSync(cache, { recursive: true });
if (!existsSync(resolve(snapshot, 'package.json'))) {
  mkdirSync(snapshot, { recursive: true });
  const archive = command('git', ['-C', live, 'archive', commit, 'package.json', 'apps/docs/src', 'apps/docs/tsconfig.json', 'apps/docs/package.json', 'packages/metalui/src', 'packages/metalui/package.json', 'tokens'], { encoding: null }).result.stdout;
  command('tar', ['-xf', '-', '-C', snapshot], { input: archive });
}
if (!existsSync(resolve(snapshot, 'node_modules'))) symlinkSync(resolve(live, 'node_modules'), resolve(snapshot, 'node_modules'), 'dir');
mkdirSync(configDirectory, { recursive: true });
// Adapt every preset input to the archive, including source metadata; no live
// token reads or package-source symlinks participate in rule discovery.
for (const file of ['plumber.config.ts', 'families.ts', 'ownership.config.ts', 'imitation.config.ts', 'layer5-habits.ts']) {
  let text = readFileSync(resolve('bench/metalui', file), 'utf8');
  text = text.replaceAll("'../../dist/", `'${repo}/dist/`)
    .replace("new URL('../../../metalui/', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(snapshot + '/').href)})`)
    .replace("new URL('../../../metalui/tokens/tokens.json', import.meta.url)", `new URL(${JSON.stringify(pathToFileURL(resolve(snapshot, 'tokens/tokens.json')).href)})`);
  writeFileSync(resolve(configDirectory, file), text);
}
writeFileSync(config, "import config from './imitation.config.ts';\nimport { habits } from './layer5-habits.ts';\nexport default { ...config, habits };\n");
const env = { ...process.env, PLUMB_CACHE_DIR: resolve(cache, 'compiler') };
const mode = process.argv[2] ?? 'before';
const comparison = process.argv[3] ?? (mode === 'after' ? 'before' : undefined);
const warmLimitMs = 2000;
if (mode === 'setup') {
  const baseline = command(process.execPath, ['dist/cli.js', 'baseline', '--force', '--root', snapshot, '--config', resolve(configDirectory, 'imitation.config.ts')], { env });
  const checked = command(process.execPath, ['dist/cli.js', 'check', '--root', snapshot, '--config', resolve(configDirectory, 'imitation.config.ts')], { env });
  writeFileSync(resolve(cache, 'baseline-check.json'), JSON.stringify({ commit, baseline: { exit: baseline.result.status, wallMs: baseline.wallMs, text: baseline.result.stdout }, check: { exit: checked.result.status, wallMs: checked.wallMs } }, null, 2));
  console.log(JSON.stringify({ baselineExit: 0, checkExit: 0 }));
} else {
  // Warm up all rules, then baseline the temporary copy with all habits on.
  command(process.execPath, ['dist/cli.js', 'baseline', '--force', '--root', snapshot, '--config', config], { env });
  const worker = resolve(cache, 'worker.mjs');
  writeFileSync(worker, `import {check} from ${JSON.stringify(pathToFileURL(resolve('dist/index.js')).href)};
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
const report=await check({root:process.argv[2],config:process.argv[3]});
writeFileSync(process.argv[4],JSON.stringify(report));
console.log(JSON.stringify({timing:report.timing,marks:performance.getEntriesByType('measure').filter(m=>m.name.startsWith('plumb:')).map(m=>({name:m.name,ms:m.duration}))}));\n`);
  const runs = [];
  for (let index = 0; index < 3; index++) {
    const result = command(process.execPath, [worker, snapshot, config, resolve(cache, `${mode}.report.json`)], { env });
    runs.push({ wallMs: result.wallMs, ...JSON.parse(result.result.stdout) });
  }
  const profiled = command(process.execPath, ['--cpu-prof', `--cpu-prof-dir=${cache}`, `--cpu-prof-name=${mode}.cpuprofile`, worker, snapshot, config, resolve(cache, `${mode}.profile-report.json`)], { env: { ...env, PLUMB_PROFILE: '1' } });
  const text = command(process.execPath, ['dist/cli.js', 'check', '--root', snapshot, '--config', config], { env });
  const json = command(process.execPath, ['dist/cli.js', 'check', '--root', snapshot, '--config', config, '--json'], { env });
  const report = JSON.parse(readFileSync(resolve(cache, `${mode}.report.json`), 'utf8'));
  const totals = {};
  for (const finding of report.findings) {
    const entry = totals[finding.rule] ??= { findings: 0, sites: 0 };
    entry.findings++; entry.sites += finding.sites.length;
  }
  const receipt = { commit, snapshot, config, runs, profile: { wallMs: profiled.wallMs, ...JSON.parse(profiled.result.stdout) }, textWallMs: text.wallMs, totals, ledger: report.ledger };
  const fields = ['findings', 'coverage', 'declarations', 'decisions'];
  const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  receipt.hashes = Object.fromEntries([...fields, 'ledgerKeys'].map(field => [field, fingerprint(field === 'ledgerKeys' ? report.findings.flatMap(f => f.ledgerKeys) : report[field])]));
  receipt.baselineCheck = JSON.parse(readFileSync(resolve(cache, 'baseline-check.json'), 'utf8'));
  if (comparison !== undefined) {
    const before = JSON.parse(readFileSync(resolve(cache, `${comparison}.report.json`), 'utf8'));
    for (const field of fields) assert.deepEqual(report[field], before[field], field);
    assert.deepEqual(report.findings.flatMap(f=>f.ledgerKeys), before.findings.flatMap(f=>f.ledgerKeys));
    assert.deepEqual(report.ledger, before.ledger);
    receipt.deepEqual = ['findings', 'coverage', 'ledgerKeys', 'declarations', 'decisions', 'ledger'];
    const coldCache = resolve(cache, 'cold-after');
    rmSync(coldCache, { recursive: true, force: true });
    const cold = command(process.execPath, [worker, snapshot, config, resolve(cache, 'cold-after.report.json')], { env: { ...env, PLUMB_CACHE_DIR: coldCache } });
    const coldReport = JSON.parse(readFileSync(resolve(cache, 'cold-after.report.json'), 'utf8'));
    for (const field of fields) assert.deepEqual(coldReport[field], report[field], `cold ${field}`);
    assert.deepEqual(coldReport.ledger, report.ledger);
    receipt.cold = { wallMs: cold.wallMs, ...JSON.parse(cold.result.stdout) };
  }
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  receipt.warm = { reportMedianMs: median(runs.map(run => run.timing.totalMs)), processMedianMs: median(runs.map(run => run.wallMs)), textWallMs: text.wallMs, jsonWallMs: json.wallMs, limitMs: warmLimitMs };
  assert.deepEqual(JSON.parse(json.result.stdout).findings, report.findings, 'JSON CLI findings');
  writeFileSync(resolve('bench/metalui', `final-${mode}.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
  assert.ok(runs.every(run => run.wallMs < warmLimitMs), `every warm process under ${warmLimitMs} ms`);
  assert.ok(text.wallMs < warmLimitMs, `warm text CLI under ${warmLimitMs} ms`);
  assert.ok(json.wallMs < warmLimitMs, `warm JSON CLI under ${warmLimitMs} ms`);
}

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';

const root = '/Users/vijaysingh/unlocalhosted/metalui';
const cache = resolve('bench/metalui/.cache/layer10');
const env = { ...process.env, PLUMB_CACHE_DIR: cache };
const config = resolve('bench/metalui/plumb.config.ts');
const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
function run(args, input, configPath = config) {
  const start = performance.now();
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args, '--root', root, '--config', configPath, '--json'],
    { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  const wallMs = performance.now() - start;
  return { report: JSON.parse(result.stdout), wallMs, exit: result.status };
}
const check = run(['check']);
const warm = run(['check']);
assert.deepEqual(check.report.deadDecisions, warm.report.deadDecisions);
const published = run(['check'], undefined, resolve('bench/metalui/dead-try.config.ts'));
const attempts = [];
for (let index = 0; index < 3; index++) {
  const result = run(['try', '--as', 'apps/docs/src/__plumb_try__.tsx'], '<div className="gap-mu-related" />');
  assert.equal(result.exit, 0);
  assert.deepEqual(result.report.findings, []);
  attempts.push({ wallMs: result.wallMs, totalMs: result.report.timing.totalMs, phases: result.report.timing.phases });
}
const bad = run(['try', '--as', 'apps/docs/src/__plumb_try__.tsx'], '<div className="gap-10" />');
assert.equal(bad.exit, 1);
assert.ok(bad.report.findings[0].decisions.length);
assert.equal(spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), head, 'MetalUI HEAD must remain pinned during the benchmark');
const inventory = f => ({ family: f.family, decisions: f.decisions.map(({ name, value, refs, source, tier }) => ({ name, value, refs, source, tier })) });
const result = { head, cache, scope: 'apps/docs/src', counts: check.report.deadDecisions, publishedCounts: published.report.deadDecisions,
  dead: check.report.findings.filter(f => f.rule.startsWith('dead/')).map(inventory),
  remainingPublishedDead: published.report.findings.filter(f => f.rule.startsWith('dead/')).map(inventory),
  check: { wallMs: warm.wallMs, totalMs: warm.report.timing.totalMs }, tryWarm: attempts,
  invalidTry: { wallMs: bad.wallMs, totalMs: bad.report.timing.totalMs, findings: bad.report.findings } };
writeFileSync('bench/metalui/layer10.run.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ head, counts: result.counts, publishedCounts: result.publishedCounts, tryWarm: attempts.map(({ wallMs, totalMs }) => ({ wallMs, totalMs })) }, null, 2));

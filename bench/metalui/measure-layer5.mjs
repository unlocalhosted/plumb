import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
const root = process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui';

const runs = {};
for (const slice of ['docs', 'package']) {
  const cache = resolve(`bench/metalui/.cache/layer5-${slice}`);
  rmSync(cache, { recursive: true, force: true });
  let cold;
  for (const temperature of ['cold', 'warm']) {
    const start = performance.now();
    const result = spawnSync(process.execPath, ['dist/cli.js', '--root', root, '--config', resolve(`bench/metalui/layer5${slice === 'package' ? '-package' : ''}.config.ts`), '--json'], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024, env: { ...process.env, PLUMB_CACHE_DIR: cache } });
    assert.ifError(result.error); assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status));
    const report = JSON.parse(result.stdout);
    if (temperature === 'cold') cold = report;
    else for (const field of ['findings', 'declarations', 'habits']) assert.deepEqual(report[field], cold[field], `${slice}: ${field} cold/warm parity`);
    writeFileSync(`bench/metalui/layer5.${slice}.${temperature}.json`, result.stdout);
    runs[`${slice}.${temperature}`] = { cache, wallMs: performance.now() - start, exitCode: result.status, timing: report.timing, habits: report.habits, moduleGraph: report.moduleGraph };
  }
}
const own = spawnSync(process.execPath, ['scripts/lint-css-habits.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
assert.ifError(own.error);
writeFileSync('bench/metalui/layer5.native.txt', own.stdout + own.stderr);
runs.native = { exitCode: own.status, output: own.stdout + own.stderr };
const parityDir = resolve('bench/metalui/.cache/layer5/parity');
mkdirSync(parityDir, { recursive: true });
const compiled = spawnSync(resolve(root, 'node_modules/.bin/tailwindcss'), ['-i', 'styles.input.css', '-o', resolve(parityDir, 'styles.css')], { cwd: resolve(root, 'packages/metalui'), encoding: 'utf8' });
assert.ifError(compiled.error); assert.equal(compiled.status, 0, compiled.stderr);
const parityStart = performance.now();
const parityRun = spawnSync(process.execPath, ['dist/cli.js', '--root', root, '--config', resolve('bench/metalui/layer5-parity.config.ts'), '--json'], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024, env: { ...process.env, PLUMB_CACHE_DIR: resolve('bench/metalui/.cache/layer5') } });
assert.ifError(parityRun.error); assert.equal(parityRun.stderr, ''); assert.ok([0, 1].includes(parityRun.status));
writeFileSync('bench/metalui/layer5.parity.json', parityRun.stdout);
const parityReport = JSON.parse(parityRun.stdout);
runs.parity = { wallMs: performance.now() - parityStart, exitCode: parityRun.status, timing: parityReport.timing, habits: parityReport.habits };
writeFileSync('bench/metalui/layer5.run.json', JSON.stringify(runs, null, 2) + '\n');
console.log(JSON.stringify(runs, null, 2));

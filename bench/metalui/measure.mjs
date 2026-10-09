import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
const label = process.argv[2] ?? 'review';
const cache = resolve(`bench/metalui/.cache/${label}-${Date.now()}`);
const runs = {};
for (const temperature of ['cold', 'warm']) {
  const start = performance.now();
  const result = spawnSync(process.execPath, ['dist/cli.js', '--root', '/Users/vijaysingh/unlocalhosted/metalui', '--config', resolve('bench/metalui/plumb.config.ts'), '--json'], { encoding: 'utf8', env: { ...process.env, PLUMB_CACHE_DIR: cache } });
  if (result.error || result.stderr || result.status !== 1) throw new Error(result.stderr || String(result.error ?? result.status));
  const wallMs = performance.now() - start;
  const report = JSON.parse(result.stdout);
  writeFileSync(`bench/metalui/${label}.${temperature}.json`, result.stdout);
  runs[temperature] = { wallMs, exitCode: result.status, timing: report.timing };
}
writeFileSync(`bench/metalui/${label}.run.json`, JSON.stringify(runs, null, 2) + '\n');
console.log(JSON.stringify(runs));

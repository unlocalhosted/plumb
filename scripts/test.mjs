import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const burst = 'e2e/session-burst.test.mjs';
const native = (await readdir(new URL('../e2e/', import.meta.url))).filter(file => file.endsWith('.test.mjs')).sort().map(file => `e2e/${file}`).filter(file => file !== burst);
// Keep browser/build tests on normal V8 settings. The retained-result burst
// needs a bounded nursery so its latency gate measures reads, not nursery growth.
for (const [files, watch, polling, flags] of [
  [native, '1', '0', []],
  [[burst], '1', '0', ['--max-semi-space-size=8']],
  [['e2e/serve.test.mjs'], '1', '1', []],
  [['e2e/serve.test.mjs'], '0', '0', []],
]) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...flags, '--test', '--test-concurrency=1', ...files], {
      cwd: root, env: { ...process.env, PLUMBER_WATCH: watch, PLUMBER_POLLING: polling }, stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  if (code !== 0) process.exit(code);
}

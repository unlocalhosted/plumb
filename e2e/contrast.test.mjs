// The colour system's pairings, checked the way a person runs it: `node scripts/contrast.mjs` reads the token file and
// every pairing the system allows (overlay/src/pairs.js), and must judge every one of them in both schemes and pass.
// A pairing it can't judge (a renamed rule, a value it can't read) is a failure too: that is how the check went blind
// to half the pairs once (docs/journey.md, chapter 21).
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('every colour pairing the system allows is judged and passes, in light and dark', async () => {
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/contrast.mjs'], { cwd: repo });
  const sum = stdout.trim().split('\n').pop();
  const [, total, ok, fail, unjudged] = sum.match(/^(\d+) pairs: (\d+) ok, (\d+) fail, (\d+) not judged$/) ?? [];
  assert.ok(total, `a summary line: ${sum}`);
  assert.equal(Number(fail), 0, 'no pairing fails');
  assert.equal(Number(unjudged), 0, 'every pairing is judged');
  assert.equal(Number(ok), Number(total));
  assert.match(stdout, / light /, 'light is checked'); assert.match(stdout, / dark /, 'dark is checked');
});

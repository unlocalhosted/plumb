import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'dist/cli.js');
const run = env => spawnSync(process.execPath, [cli, '--json', '--root', join(root, 'fixtures/tailwind-min')], { encoding: 'utf8', env: { ...process.env, ...env, PLUMB_CACHE_DIR: join(root, 'fixtures/.cache-direct', env.PLUMB_TAILWIND_DIRECT ? 'direct' : 'node') } });

test('a project with tailwindcss but no @tailwindcss/node gets the same report', () => {
  const viaNode = run({});
  const direct = run({ PLUMB_TAILWIND_DIRECT: '1' });
  assert.equal(direct.stderr, '', direct.stderr);
  const strip = report => JSON.parse(report).findings.map(({ key, rule, sites }) => ({ key, rule, sites: sites.map(({ file, line, column, text }) => ({ file, line, column, text })) }));
  assert.deepEqual(strip(direct.stdout), strip(viaNode.stdout));
  assert.equal(direct.status, viaNode.status);
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('build output runs through a linked plumber bin with its shebang', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.linked-bin-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'node_modules/.bin'), { recursive: true });
  await symlink(join(repo, 'dist/cli.js'), join(root, 'node_modules/.bin/plumber'));
  assert.match(await readFile(join(repo, 'dist/cli.js'), 'utf8'), /^#!\/usr\/bin\/env node\n/);
  const result = spawnSync(join(root, 'node_modules/.bin/plumber'), ['--help'], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /plumber/);
});

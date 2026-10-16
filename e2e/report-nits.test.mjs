import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reportFixture } from './report-fixture.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const strip = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replaceAll('\r', '');
async function adoption(t) {
  const root = await mkdtemp(join(tmpdir(), 'plumb-report-nits-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/adoption'), root, { recursive: true });
  for (const file of ['plumber.config.ts', '.plumber']) await rm(join(root, file), { recursive: true, force: true });
  return root;
}
function run(root, args = [], columns = 80, tty = false) {
  const env = { ...process.env, CI: '1', COLUMNS: String(columns), PLUMBER_CACHE_DIR: join(root, '.cache') };
  delete env.NO_COLOR;
  const command = [process.execPath, cli, 'check', '--root', root, ...args];
  const result = tty
    ? spawnSync('python3', [join(repo, 'e2e/helpers/cli-pty.py')], { encoding: 'utf8', timeout: 20000,
      input: JSON.stringify({ command, cwd: repo, env, columns, stdoutTTY: true }) })
    : spawnSync(command[0], command.slice(1), { encoding: 'utf8', timeout: 20000, cwd: repo, env });
  assert.ifError(result.error);
  if (tty) assert.equal(result.status, 0, result.stderr);
  const output = tty ? JSON.parse(result.stdout) : result;
  assert.ok([0, 1].includes(output.status), output.stderr);
  assert.equal(output.stderr, '');
  return strip(output.stdout);
}

test('Fix first reasons stay whole in pipes and PTYs; narrow tables omit reasons', async t => {
  const root = await adoption(t);
  for (const tty of [false, true]) {
    const rows = run(root, [], 80, tty).split('Fix first\n')[1].split('\n\n')[0].split('\n').filter(line => line.includes('plumber check'));
    assert.equal(rows.length, 2);
    assert.match(rows[0], /tokens missing\s+plumber check --rule config$/);
    assert.match(rows[1], /most in spacing\s+plumber check --rule provenance$/);
    assert.ok(rows.every(row => !row.trim().split(/ {2,}/)[1].includes('…')), rows.join('\n'));
  }
  const narrow = run(root, [], 60, true).split('Fix first\n')[1].split('\n\n')[0];
  assert.doesNotMatch(narrow, /tokens missing|most in/);
  assert.ok(narrow.split('\n').filter(line => line.includes('plumber check')).every(line => line.trim().split(/ {2,}/).length === 2));
  assert.match(narrow, /plumber check --rule config\n/);
  assert.match(narrow, /plumber check --rule provenance/);
});

test('top declarations and classes mark counts with × in pipes and PTYs', async t => {
  const root = await adoption(t), classes = await reportFixture(t);
  await writeFile(join(classes, 'src/Many.tsx'), `export const Many = () => <>${'<div className="font-mono text-xs" />'.repeat(1024)}</>;`);
  for (const tty of [false, true]) {
    assert.match(run(root, [], 80, tty), /gap: 10px ×1 · margin-left: 10px ×1/);
    const output = run(classes, [], 140, tty);
    assert.match(output, /font-mono ×1,056/);
    assert.match(output, /text-xs ×1,056/, 'size and line-height count each authored class site once');
  }
});

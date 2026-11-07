// `plumber baseline` refuses debt growth over a ledger that exists, unless --force. A `.baseline-pending` file (written by
// the two-step init that `plumber init` replaced; nothing writes it now) must not open that guard: a stray one, left in
// a project from that time, let every new finding into the ledger as known debt without review.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repo = fileURLToPath(new URL('../', import.meta.url)), cli = join(repo, 'dist/cli.js');
const run = (directory, args) => spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: 'utf8', timeout: 20_000,
  env: { ...process.env, PLUMB_CACHE_DIR: join(directory, '.cache'), GIT_CEILING_DIRECTORIES: tmpdir() } });

test('a stray .baseline-pending does not let baseline take new debt without --force', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'plumb-baseline-guard-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/adoption'), directory, { recursive: true });
  const accepted = run(directory, ['accept-decisions']);
  assert.equal(accepted.status, 0, accepted.stderr);
  const ledger = await readFile(join(directory, '.plumber/ledger.jsonl'), 'utf8');
  assert.ok(ledger.trim() && ledger.split('\n').filter(Boolean).every(line => JSON.parse(line).kind === 'decision'), ledger);
  await mkdir(join(directory, 'src'), { recursive: true });
  await writeFile(join(directory, 'src/new.css'), '.new { gap: 13px; }');
  await writeFile(join(directory, '.plumber/.baseline-pending'), 'Run plumb baseline to record current debt.\n');
  const refused = run(directory, ['baseline']);
  assert.notEqual(refused.status, 0, refused.stdout);
  assert.match(refused.stderr, /refuses debt growth/);
  assert.equal(await readFile(join(directory, '.plumber/ledger.jsonl'), 'utf8'), ledger);
  assert.equal(run(directory, ['baseline', '--force']).status, 0);
});

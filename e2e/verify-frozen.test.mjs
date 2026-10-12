import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { freezeApp, git } from '../bench/apps/frozen.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('frozen dev server retains dirty and untracked inputs while its scratch original moves', async t => {
  const temporary = join(repo, 'fixtures/.verify-frozen');
  await mkdir(temporary, { recursive: true });
  const scratch = await mkdtemp(join(temporary, 'e2e-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const original = join(scratch, 'original');
  await mkdir(original);
  const metadata = join(scratch, 'metadata');
  // Reuse existing history: no commits, worktrees, or writes in the source repository.
  execFileSync('git', ['clone', '--quiet', '--bare', '--depth', '2', 'file://' + repo, metadata]);
  await rename(metadata, join(original, '.git'));
  git(original, 'config', '--local', 'core.bare', 'false');
  git(original, 'read-tree', 'HEAD');
  const relativeFile = 'fixtures/spacing/src/App.tsx';
  const source = join(original, relativeFile);
  await mkdir(join(original, 'fixtures/spacing/src'), { recursive: true });
  await writeFile(join(original, 'package.json'), '{"type":"module"}');
  await writeFile(source, 'export default "dirty before snapshot";');
  await writeFile(join(original, 'fixtures/spacing/src/new.css'), ':root { --untracked: 13px; }');
  await symlink(join(repo, 'node_modules'), join(original, 'node_modules'));
  await symlink(join(repo, 'node_modules'), join(original, 'fixtures/spacing/node_modules'));
  await writeFile(join(original, 'fixtures/spacing/vite.config.mjs'), 'export default { server: { watch: null } };');
  const frozen = await freezeApp({ name: 'fixture', root: original, app: join(original, 'fixtures/spacing') }, join(scratch, 'run'));
  // Use the real guarded loader, including Vite's native import of its generated config bundle.
  const run = join(scratch, 'run');
  const child = fork(join(repo, 'bench/apps/verify.mjs'), ['--serve', JSON.stringify(frozen.app), run], {
    cwd: frozen.app.app, execArgv: ['--import', join(repo, 'bench/apps/readonly.mjs')],
    env: { ...process.env, PLUMB_VERIFY_BASELINE: '1', PLUMB_VERIFY_APP: JSON.stringify(frozen.app), PLUMB_VERIFY_SCRATCH: run,
      PLUMB_CACHE_DIR: join(run, 'plumb'), TMPDIR: run }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let logs = '';
  child.stderr.on('data', chunk => logs += chunk);
  const exited = new Promise(resolveExit => child.once('exit', resolveExit));
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (child.connected) child.send({ type: 'close' }); else child.kill('SIGTERM');
    await Promise.race([exited, delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
  });
  let timer;
  const { origin } = await new Promise((resolveReady, reject) => {
    timer = setTimeout(() => reject(new Error('Frozen dev server startup timed out: ' + logs)), 30_000);
    child.on('error', reject);
    child.on('message', event => {
      if (event.type === 'listening') resolveReady(event);
      if (event.type === 'error') reject(new Error(event.error));
    });
    child.once('exit', () => reject(new Error('Frozen dev server exited: ' + logs)));
  }).finally(() => clearTimeout(timer));
  const served = async () => (await fetch(origin + '/src/App.tsx?raw')).text();
  assert.match(await served(), /dirty before snapshot/);
  assert.match(await readFile(join(frozen.app.app, 'src/new.css'), 'utf8'), /--untracked: 13px/);
  await writeFile(source, 'export default "original moved";');
  git(original, 'update-ref', 'HEAD', git(original, 'rev-parse', 'HEAD^').trim());
  assert.match(await served(), /dirty before snapshot/);
  assert.equal(await frozen.finish(), true);
  assert.equal(frozen.snapshot.repositories[0].originalMoved, true);
  // A second edit to a dirty copied file must fail integrity; porcelain alone misses it.
  await writeFile(join(frozen.app.app, 'src/App.tsx'), 'export default "copy changed";');
  assert.equal(await frozen.finish(), false);
});

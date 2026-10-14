import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('packed release rebuilds stale dist and installs the shipped CLI', { timeout: 300000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.packaging-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const candidate = join(root, 'candidate'), consumer = join(root, 'consumer');
  await mkdir(candidate);
  await mkdir(consumer);
  for (const path of ['package.json', 'tsconfig.json', 'scripts', 'src', 'overlay', 'schema', 'action.yml', 'LICENSE', 'README.md', 'skills']) {
    await cp(join(repo, path), join(candidate, path), { recursive: true });
  }
  await symlink(join(repo, 'node_modules'), join(candidate, 'node_modules'), 'dir');
  await mkdir(join(candidate, 'dist/hosts'), { recursive: true });
  for (const path of ['hosts/next-loader.cjs', 'hosts/next-loader.d.ts', 'hosts/source-attributes.js', 'hosts/source-attributes.d.ts', 'cli.js']) {
    await writeFile(join(candidate, 'dist', path), 'obsolete build\n');
  }
  const env = { ...process.env, npm_config_cache: join(repo, 'node_modules/.cache/release-packaging/npm'), npm_config_update_notifier: 'false' };
  function command(cwd, executable, args, timeout = 180000) {
    const result = spawnSync(executable, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
    return result.stdout;
  }
  const packed = JSON.parse(command(candidate, 'npm', ['pack', '--json', '--pack-destination', root]))[0];
  const tarball = join(root, packed.filename);
  const files = command(root, 'tar', ['-tzf', tarball]).trim().split('\n').map(path => path.replace(/^package\//, ''));
  assert.ok(files.includes('dist/cli.js'));
  for (const path of files.filter(path => path.startsWith('dist/'))) {
    assert.match(path, /(?:\.d\.ts|\.js)$/);
    const source = path.replace(/^dist\//, 'src/').replace(/(?:\.d\.ts|\.js)$/, '.ts');
    await assert.doesNotReject(readFile(join(candidate, source)), `${path} must have source ${source}`);
  }
  await writeFile(join(consumer, 'package.json'), '{"name":"packed-consumer","private":true,"type":"module"}\n');
  command(consumer, 'npm', ['install', '--ignore-scripts', '--omit=peer', '--no-audit', '--no-fund', tarball]);
  const installed = join(consumer, 'node_modules/@unlocalhosted/react-plumber');
  assert.match(command(consumer, process.execPath, [join(installed, 'dist/cli.js'), '--help']), /plumber/);
});

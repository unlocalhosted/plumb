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
  const readme = await readFile(join(installed, 'README.md'), 'utf8');
  const links = [...readme.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)|^\[[^\]]+\]:\s*(\S+)/gm)].map(match => match[1] ?? match[2]);
  for (const link of links.filter(link => !/^(?:[a-z][a-z\d+.-]*:|#)/i.test(link))) {
    const path = link.split(/[?#]/)[0].replace(/^\.\//, '');
    assert.ok(files.includes(path), `README link ${link} must exist in the tarball`);
    assert.fail(`Repository README link ${link} must use an absolute repository URL`);
  }
  assert.match(command(consumer, process.execPath, [join(installed, 'dist/cli.js'), '--help']), /plumber/);
  const cli = join(installed, 'dist/cli.js');
  const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(metadata.gitHead, undefined, 'exercise the released-tag fallback');
  command(consumer, 'git', ['init', '--quiet']);
  command(consumer, process.execPath, [cli, 'install', '--ci']);
  const workflow = await readFile(join(consumer, '.github/workflows/plumb.yml'), 'utf8');
  assert.equal(metadata.version, '0.1.0');
  assert.ok(workflow.includes(`uses: unlocalhosted/plumb@v${metadata.version}\n`));
  assert.doesNotMatch(workflow, /@main\b/);
  const action = await readFile(join(installed, 'action.yml'), 'utf8');
  for (const [, pin] of action.matchAll(/uses:\s+[^\s@]+@([^\s]+)/g)) {
    assert.match(pin, /^(?:v\d+\.\d+\.\d+|[a-f\d]{40})$/);
  }
  const releasedCommit = '1234567890abcdef1234567890abcdef12345678';
  await writeFile(join(installed, 'package.json'), JSON.stringify({ ...metadata, gitHead: releasedCommit }));
  await rm(join(consumer, '.github/workflows/plumb.yml'));
  command(consumer, process.execPath, [cli, 'install', '--ci']);
  assert.ok((await readFile(join(consumer, '.github/workflows/plumb.yml'), 'utf8')).includes(`uses: unlocalhosted/plumb@${releasedCommit}\n`));
});

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';

const repo = resolve('.'), cli = join(repo, 'dist/cli.js');
async function fixture(t, name = 'ledger') {
  const root = await mkdtemp(join(repo, 'fixtures/.rename-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures', name), root, { recursive: true });
  return root;
}
function run(root, args, extra = {}) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', root], {
    encoding: 'utf8', timeout: 30000, env: { ...process.env, ...extra },
  });
  assert.ifError(result.error);
  assert.ok([0, 1].includes(result.status), result.stderr);
  return result;
}
const exists = file => stat(file).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
const notice = stderr => stderr.trim().split('\n').filter(Boolean);
for (const extension of ['ts', 'mts', 'js', 'mjs']) {
  for (const legacy of [false, true]) test(`${legacy ? 'legacy' : 'new'} ${extension} config keeps baseline and acceptance in one state directory`, async t => {
    const root = await fixture(t), prefix = legacy ? 'plumb' : 'plumber', directory = legacy ? '.plumb' : '.plumber';
    await rename(join(root, 'plumber.config.ts'), join(root, 'original.config.ts'));
    await writeFile(join(root, `${prefix}.config.${extension}`), "export default { source: ['src/**/*.{ts,tsx,css}'], css: 'src/styles.css' };\n");
    if (legacy) await mkdir(join(root, directory));
    const baseline = run(root, ['baseline']);
    assert.equal(baseline.status, 0, baseline.stdout);
    if (legacy) {
      assert.equal(notice(baseline.stderr).length, 1);
      assert.ok(baseline.stderr.includes(`mv plumb.config.${extension} plumber.config.${extension}`));
      assert.match(baseline.stderr, /mv \.plumb \.plumber/);
    } else assert.equal(baseline.stderr, '');
    const checked = run(root, ['check', '--json']);
    assert.equal(JSON.parse(checked.stdout).ledger.new, 0);
    const accepted = run(root, ['accept-decisions', '--why', 'migration test']);
    assert.equal(accepted.status, 0);
    const entries = (await readFile(join(root, directory, 'ledger.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(entries.some(entry => entry.kind === 'decision' && entry.why === 'migration test'));
    assert.equal(await exists(join(root, legacy ? '.plumber' : '.plumb')), false);
  });
}
test('init creates new names and force init preserves legacy config and state', async t => {
  const root = await fixture(t, 'adoption');
  let output = run(root, ['init']);
  assert.equal(output.stderr, '');
  assert.equal(await exists(join(root, 'plumber.config.ts')), true);
  assert.equal(await exists(join(root, '.plumber/ledger.jsonl')), true);
  await rename(join(root, 'plumber.config.ts'), join(root, 'plumb.config.ts'));
  await rename(join(root, '.plumber'), join(root, '.plumb'));
  output = run(root, ['init', '--force']);
  assert.equal(output.status, 0, output.stdout);
  assert.equal(notice(output.stderr).length, 1);
  assert.equal(await exists(join(root, 'plumber.config.ts')), false);
  assert.equal(await exists(join(root, '.plumber')), false);
  assert.match(output.stdout, /in \.plumb\/ledger.jsonl/);
});
test('new names win when both exist without changing legacy files', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'plumb.config.ts'), 'throw new Error("legacy must not load");\n');
  await mkdir(join(root, '.plumb'));
  await writeFile(join(root, '.plumb/ledger.jsonl'), 'legacy sentinel\n');
  await mkdir(join(root, '.plumber'));
  const baseline = run(root, ['baseline']);
  assert.equal(baseline.status, 0);
  assert.equal(baseline.stderr, '');
  assert.equal(await readFile(join(root, '.plumb/ledger.jsonl'), 'utf8'), 'legacy sentinel\n');
  assert.equal(JSON.parse(run(root, ['check', '--json']).stdout).ledger.new, 0);
});
for (const legacy of [false, true]) test(`${legacy ? 'legacy' : 'new'} daemon discovery and client reuse keep state together`, async t => {
  const root = await fixture(t), directory = legacy ? '.plumb' : '.plumber';
  if (legacy) {
    await rename(join(root, 'plumber.config.ts'), join(root, 'plumb.config.ts'));
    await mkdir(join(root, directory));
  }
  run(root, ['baseline']);
  const child = spawn(process.execPath, [cli, 'serve', '--root', root, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => stdout += chunk);
  child.stderr.on('data', chunk => stderr += chunk);
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); } });
  const discovery = join(root, directory, 'serve.json');
  for (let index = 0; !await exists(discovery) && index < 300; index++) {
    assert.equal(child.exitCode, null, stderr); await delay(20);
  }
  const info = JSON.parse(await readFile(discovery, 'utf8'));
  const response = await fetch(`http://127.0.0.1:${info.port}/health`, { headers: { 'x-plumb-token': info.token } });
  assert.equal(response.status, 200);
  // Server-only response proves CLI reused discovery rather than running a cold check.
  const { serverRequest } = await import('../dist/session/client.js');
  assert.equal((await serverRequest('health', {}, { root })).pid, child.pid);
  assert.equal(JSON.parse(run(root, ['check', '--json']).stdout).ledger.new, 0);
  assert.equal(notice(stderr).length, legacy ? 1 : 0);
  assert.match(stdout, /React Plumber is listening/);
  assert.equal(await exists(join(root, legacy ? '.plumber' : '.plumb')), false);
  child.kill(); await once(child, 'exit');
  assert.equal(await exists(discovery), false);
});
test('PLUMBER cache override takes precedence; PLUMB remains fallback', async t => {
  const root = await fixture(t), modern = join(root, 'modern-cache'), legacy = join(root, 'legacy-cache');
  run(root, ['check', '--json'], { PLUMBER_CACHE_DIR: modern, PLUMB_CACHE_DIR: legacy });
  assert.equal(await exists(modern), true);
  assert.equal(await exists(legacy), false);
  run(root, ['check', '--json'], { PLUMBER_CACHE_DIR: undefined, PLUMB_CACHE_DIR: legacy });
  assert.equal(await exists(legacy), true);
});
test('git comparison preserves debt across config and ledger migration', async t => {
  const root = await fixture(t);
  await rename(join(root, 'plumber.config.ts'), join(root, 'plumb.config.ts'));
  await mkdir(join(root, '.plumb'));
  run(root, ['baseline']);
  const git = args => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  await writeFile(join(root, '.gitignore'), '.plumb/cache/\n.plumber/cache/\n');
  git(['init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Rename Test', '-c', 'user.email=rename@example.test', 'commit', '-qm', 'legacy baseline']);
  await rename(join(root, 'plumb.config.ts'), join(root, 'plumber.config.ts'));
  await rename(join(root, '.plumb'), join(root, '.plumber'));
  const result = run(root, ['check', '--base', 'HEAD', '--json']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ledger.new, 0);
  assert.equal(report.ledger.growth, 0);
  assert.equal(result.stderr, '');
});
test('packed install exposes only plumber and resolves renamed package exports', { timeout: 180000 }, async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'package.json'), '{"name":"rename-consumer","private":true,"type":"module"}\n');
  const env = { ...process.env, npm_config_cache: join(repo, 'node_modules/.cache/release-setup/npm'), npm_config_update_notifier: 'false' };
  const npm = (cwd, args) => {
    const result = spawnSync('npm', args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  const packed = JSON.parse(npm(repo, ['pack', '--ignore-scripts', '--json', '--pack-destination', root]))[0];
  assert.equal(packed.name, '@unlocalhosted/react-plumber');
  npm(root, ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(root, packed.filename)]);
  const metadata = JSON.parse(await readFile(join(root, 'node_modules/@unlocalhosted/react-plumber/package.json'), 'utf8'));
  assert.deepEqual(metadata.bin, { plumber: './dist/cli.js' });
  assert.equal(await exists(join(root, 'node_modules/.bin/plumber')), true);
  assert.equal(await exists(join(root, 'node_modules/.bin/plumb')), false);
  const command = spawnSync(join(root, 'node_modules/.bin/plumber'), ['check', '--json'], { cwd: root, env: { ...env, PLUMBER_CACHE_DIR: join(root, '.cache') }, encoding: 'utf8' });
  assert.ifError(command.error); assert.equal(command.status, 1, command.stderr);
  assert.equal(JSON.parse(command.stdout).tool.name, 'react-plumber');
  const imports = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const root = await import('@unlocalhosted/react-plumber');
    const vite = await import('@unlocalhosted/react-plumber/vite');
    assert.equal(typeof root.defineConfig, 'function');
    assert.equal(typeof vite.plumb, 'function');
    assert.ok(import.meta.resolve('@unlocalhosted/react-plumber/next'));
    assert.ok(import.meta.resolve('@unlocalhosted/react-plumber/next/config'));
  `], { cwd: root, env, encoding: 'utf8' });
  assert.ifError(imports.error); assert.equal(imports.status, 0, imports.stderr);
});

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('packed release rebuilds stale dist and installs the shipped CLI', { timeout: 300000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.packaging-'));
  let daemon;
  t.after(async () => {
    if (daemon && daemon.exitCode === null && daemon.signalCode === null) { daemon.kill(); await once(daemon, 'exit'); }
    await rm(root, { recursive: true, force: true });
  });
  const candidate = join(root, 'candidate'), consumer = join(root, 'consumer');
  await mkdir(candidate);
  await mkdir(consumer);
  for (const path of ['package.json', 'tsconfig.json', 'scripts', 'src', 'overlay', 'schema', 'action.yml', 'LICENSE', 'README.md', 'skills']) {
    await cp(join(repo, path), join(candidate, path), { recursive: true });
  }
  await symlink(join(repo, 'node_modules'), join(candidate, 'node_modules'), 'dir');
  // A stale client bundle must not replace audited modules or drop notices.
  await mkdir(join(candidate, 'overlay/dist'), { recursive: true });
  await writeFile(join(candidate, 'overlay/dist/client.js'), 'unlicensed stale bundle\n');
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
  assert.ok(files.includes('THIRD_PARTY_NOTICES'));
  assert.ok(!files.some(path => path.startsWith('overlay/dist/')));
  const notices = await readFile(join(installed, 'THIRD_PARTY_NOTICES'), 'utf8');
  command(candidate, process.execPath, ['scripts/third-party-notices.mjs', '--check']);
  for (const copyright of [/Copyright[^\n]*Aiden Bai/, /Copyright[^\n]*Justin Ridgewell/]) {
    await writeFile(join(candidate, 'THIRD_PARTY_NOTICES'), notices.replace(copyright, 'MISSING COPYRIGHT'));
    const missing = spawnSync(process.execPath, ['scripts/third-party-notices.mjs', '--check'], { cwd: candidate, env, encoding: 'utf8' });
    assert.equal(missing.status, 1, 'the release gate rejects missing vendor or embedded license text');
    assert.match(missing.stderr, /THIRD_PARTY_NOTICES is stale/);
  }
  command(candidate, 'npm', ['run', 'notices']);
  assert.equal(await readFile(join(candidate, 'THIRD_PARTY_NOTICES'), 'utf8'), notices);
  const { overlayModules } = await import(pathToFileURL(join(installed, 'dist/hosts/client.js')));
  const require = createRequire(join(installed, 'package.json'));
  const vendors = new Set(overlayModules.map(path => /^vendor\/((?:@[^/]+\/)?[^/]+)\//.exec(path)?.[1]).filter(Boolean));
  assert.ok(vendors.has('bippy'));
  for (const vendor of vendors) {
    const packageRoot = join(require.resolve(`${vendor}/package.json`), '..');
    const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    assert.ok(notices.includes(`${vendor}@${metadata.version}`));
    const licenses = (await readdir(packageRoot)).filter(path => /^(?:licen[cs]e|copying|notice)(?:[.-]|$)/i.test(path));
    assert.ok(licenses.length, `${vendor} has license text`);
    for (const license of licenses) assert.ok(notices.includes((await readFile(join(packageRoot, license), 'utf8')).trim()), `${vendor}/${license} is included in full`);
  }
  assert.ok(notices.includes((await readFile(join(repo, 'node_modules/react/LICENSE'), 'utf8')).trim()));
  assert.ok(notices.includes((await readFile(join(repo, 'node_modules/@jridgewell/sourcemap-codec/LICENSE'), 'utf8')).trim()));
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
  await writeFile(join(consumer, 'plumber.config.ts'), 'export default { source: ["src/**/*.tsx"], css: "src/styles.css" };\n');
  await mkdir(join(consumer, 'src'));
  await writeFile(join(consumer, 'src/styles.css'), '.plain { padding: 8px; }\n');
  await writeFile(join(consumer, 'src/App.tsx'), '<div className="plain" />;\n');
  daemon = spawn(process.execPath, [cli, 'serve', '--overlay', '--origin', 'http://localhost:5555', '--port', '0'], { cwd: consumer, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  daemon.stderr.on('data', chunk => errors += chunk);
  let info;
  for (let attempt = 0; attempt < 300 && !info; attempt++) {
    assert.equal(daemon.exitCode, null, errors);
    try { info = JSON.parse(await readFile(join(consumer, '.plumber/serve.json'), 'utf8')); }
    catch { await delay(20); }
  }
  assert.ok(info, errors || 'packed overlay daemon did not start');
  const url = `http://127.0.0.1:${info.port}/__plumb/`;
  const noticeResponse = await fetch(url + 'THIRD_PARTY_NOTICES');
  assert.equal(noticeResponse.status, 200);
  assert.equal(noticeResponse.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await noticeResponse.text(), notices);
  for (const module of overlayModules.filter(path => path.startsWith('vendor/'))) {
    const response = await fetch(url + module);
    assert.equal(response.status, 200);
    const code = await response.text();
    assert.match(code, /@license bippy/);
    assert.match(code, /Copyright \(c\) Aiden Bai/);
    assert.ok(code.startsWith('/*!\n' + notices));
    assert.ok(code.endsWith(await readFile(join(require.resolve('bippy/source'), '..', module.split('/').at(-1)), 'utf8')), `${module} preserves upstream output and headers`);
  }
  assert.equal(await (await fetch(url + 'client.js')).text(), await readFile(join(installed, 'overlay/client.js'), 'utf8'));
});

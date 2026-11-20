// Release walkthrough: an actual packed install, untouched app, CLI adoption,
// its own dev server, and a user-authored overlay write backed by JSX stamping.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const scratch = join(repo, 'node_modules/.cache/release-setup');
await mkdir(join(scratch, 'tmp'), { recursive: true });
const env = { ...process.env, TMPDIR: join(scratch, 'tmp'), npm_config_cache: join(scratch, 'npm'),
  npm_config_update_notifier: 'false', PLUMB_WATCH: '1', PLUMB_POLLING: '0' };
// Playwright creates its profile and artifacts before passing browser env.
process.env.TMPDIR = env.TMPDIR;
async function fixture(t) {
  // Node refuses native .ts config loading under node_modules.
  const root = await mkdtemp(join(repo, 'fixtures/.setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root }); // its own repository: stamps name files from the repository root
  return root;
}
async function file(root, path, text) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), text);
}
function command(root, executable, args, status = 0, timeout = 30000) {
  const result = spawnSync(executable, args, { cwd: root, env: { ...env, PLUMB_CACHE_DIR: join(root, '.plumb-cache') }, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, status, `${executable} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}
const install = (root, status = 0) => command(root, process.execPath, [cli, 'install', '--overlay', '--write'], status);

test('real overlay installer refuses file and missing-route escapes with win32 relative paths', async t => {
  const boundary = await fixture(t), outside = await fixture(t);
  const preload = join(boundary, 'win32-boundary.mjs'), receipt = join(boundary, 'paths.jsonl');
  // Keep real filesystem I/O and installer code; adapt only node:path.relative
  // at the OS boundary so POSIX CI exercises Windows separator semantics.
  await writeFile(preload, `import path from 'node:path';
import { appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
path.relative = (from, to) => {
  const windows = value => 'C:' + value.replaceAll('/', '\\\\');
  const result = path.win32.relative(windows(from), windows(to));
  appendFileSync(${JSON.stringify(receipt)}, JSON.stringify(result) + '\\n');
  return result;
};
syncBuiltinESMExports();
`);
  const run = (root, status) => {
    const result = spawnSync(process.execPath, ['--import', preload, cli, 'install', '--overlay', '--write'], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
    assert.ifError(result.error);
    assert.equal(result.status, status, result.stderr);
    return result;
  };
  const valid = await fixture(t);
  await file(valid, 'package.json', '{"dependencies":{"vite":"*"}}');
  await file(valid, 'vite.config.mjs', 'export default {};\n');
  assert.match(run(valid, 0).stdout, /Wrote vite.config.mjs/);
  for (const host of ['vite', 'next']) {
    const root = await fixture(t), original = 'export default {};\n';
    await file(root, 'package.json', JSON.stringify({ dependencies: { [host]: '*' } }));
    if (host === 'vite') {
      await file(outside, 'config.mjs', original);
      await symlink(join(outside, 'config.mjs'), join(root, 'vite.config.mjs'));
    } else {
      await file(root, 'next.config.mjs', original);
      await file(root, 'app/layout.jsx', 'export default () => <body></body>;\n');
      await symlink(outside, join(root, 'app/%5F_plumb'));
    }
    assert.match(run(root, 2).stderr, /resolves outside the project root/);
    assert.equal(await readFile(join(host === 'vite' ? outside : root, host === 'vite' ? 'config.mjs' : 'next.config.mjs'), 'utf8'), original);
    if (host === 'next') {
      assert.doesNotMatch(await readFile(join(root, 'app/layout.jsx'), 'utf8'), /PlumbOverlay/);
      await assert.rejects(readFile(join(outside, '[...path]/route.plumb.ts')), { code: 'ENOENT' });
    }
  }
  assert.ok((await readFile(receipt, 'utf8')).trim().split('\n').map(JSON.parse).some(path => path.startsWith('..\\')), 'installer actually crossed win32 boundary');
});

test('overlay installer edits supported configs in place and refuses ambiguous or escaping files before writes', { timeout: 90000 }, async t => {
  for (const [extension, source] of [
    ['ts', "// Keep header.\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react'; // Keep import note.\nexport default defineConfig({\n  // Keep plugin note.\n  plugins: [react()],\n  server: { port: 4311 },\n});\n"],
    ['mts', "import { defineConfig as config } from 'vite'\nconst options = { plugins: [], base: '/' } satisfies import('vite').UserConfig\nexport default config(options)\n"],
    ['js', "export default { /* keep this */ server: { port: 4311 } };\n"],
    ['mjs', "import { plumb as inspect } from '@unlocalhosted/react-plumber/vite';\nexport default { plugins: [react(), /* keep late note */ inspect({ watch: false }) /* keep tail */] };\n"],
    ['ts', 'import react from "@vitejs/plugin-react"; /* Keep multiline\r\nimport note. */\r\nexport default {\r\n  plugins: [react()],\r\n  server: { port: 4311 },\r\n};\r\n'],
  ]) {
    const root = await fixture(t);
    await file(root, 'package.json', '{"devDependencies":{"vite":"*"}}');
    await file(root, `vite.config.${extension}`, source);
    assert.match(command(root, process.execPath, [cli, 'install', '--overlay']), /first.*before react/);
    assert.equal(await readFile(join(root, `vite.config.${extension}`), 'utf8'), source);
    assert.match(install(root), /--- vite.config/);
    const after = await readFile(join(root, `vite.config.${extension}`), 'utf8');
    assert.match(after, /plugins:\s*\[\s*(plumb\(\)|inspect\(\{ watch: false \}\))/);
    for (const comment of source.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ?? []) assert.ok(after.includes(comment), comment);
    assert.ok(after.includes(extension === 'mts' ? "base: '/'" : 'server: { port: 4311 }') || extension === 'mjs');
    assert.match(install(root), /already set up/);
    assert.equal(await readFile(join(root, `vite.config.${extension}`), 'utf8'), after);
  }

  for (const [extension, source, app] of [
    ['mjs', "// Keep Next options.\nconst nextConfig = { pageExtensions: ['tsx', 'ts'], output: 'export' };\nexport default nextConfig;\n", 'src/app'],
    ['ts', "import type { NextConfig } from 'next';\nexport default { reactStrictMode: true } satisfies NextConfig;\n", 'app'],
    ['cjs', "const nextConfig = { reactStrictMode: true };\nmodule.exports = nextConfig;\n", 'app'],
  ]) {
    const root = await fixture(t);
    await file(root, 'package.json', '{"dependencies":{"next":"*"}}');
    await file(root, `next.config.${extension}`, source);
    const layout = "// Keep layout.\nexport default function Layout({ children }) { return <html lang=\"en\"><body className=\"shell\">{children}</body></html>; }\n";
    await file(root, `${app}/layout.jsx`, layout);
    assert.match(install(root), /Wrote .*route.plumb.ts/);
    const config = await readFile(join(root, `next.config.${extension}`), 'utf8');
    assert.match(config, /withPlumb\(/);
    assert.match(config, /@unlocalhosted\/react-plumber\/next\/config/);
    assert.ok(config.includes(source.split('\n')[0]));
    const nextLayout = await readFile(join(root, `${app}/layout.jsx`), 'utf8');
    assert.match(nextLayout, /<body className="shell">\{children\}<PlumbOverlay \/><\/body>/);
    assert.match(await readFile(join(root, `${app}/%5F_plumb/[...path]/route.plumb.ts`), 'utf8'), /export const \{ GET, POST \} = createPlumbRoute\(\);/);
    assert.match(install(root), /already set up/);
    assert.equal(await readFile(join(root, `next.config.${extension}`), 'utf8'), config);
    assert.equal(await readFile(join(root, `${app}/layout.jsx`), 'utf8'), nextLayout);
    const legacyLayout = nextLayout.replace('/next/overlay', '/next');
    await file(root, `${app}/layout.jsx`, legacyLayout);
    assert.match(install(root), /already set up/);
    assert.equal(await readFile(join(root, `${app}/layout.jsx`), 'utf8'), legacyLayout);
  }

  for (const [host, config] of [
    ['vite', 'export default defineConfig(() => ({ plugins: [react()] }));\n'],
    ['vite', 'export default { ...shared, plugins: [react()] };\n'],
    ['vite', 'export default { plugins: [...plugins, react()] };\n'],
    ['vite', 'export default { plugins: getPlugins() };\n'],
    ['vite', 'export default importedConfig;\n'],
    ['next', 'export default () => ({ reactStrictMode: true });\n'],
    ['next', 'export default { ...shared };\n'],
  ]) {
    const root = await fixture(t);
    await file(root, 'package.json', JSON.stringify({ dependencies: { [host]: '*' } }));
    await file(root, `${host}.config.mjs`, config);
    const result = spawnSync(process.execPath, [cli, 'install', '--overlay', '--write'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /refused.*\n  No install files changed/);
    assert.match(result.stderr, new RegExp(`import \\{ ${host === 'vite' ? 'plumb' : 'withPlumb'} \\}`));
    assert.equal(await readFile(join(root, `${host}.config.mjs`), 'utf8'), config);
  }

  // The "outside" targets still live inside React Plumber, but outside this project root.
  const outside = await fixture(t), root = await fixture(t);
  const original = 'export default { plugins: [react()] };\n';
  await file(outside, 'config.mjs', original);
  await file(root, 'package.json', '{"dependencies":{"vite":"*"}}');
  await symlink(join(outside, 'config.mjs'), join(root, 'vite.config.mjs'));
  install(root, 2);
  assert.equal(await readFile(join(outside, 'config.mjs'), 'utf8'), original);
  const dangling = await fixture(t);
  await file(dangling, 'package.json', '{"dependencies":{"vite":"*"}}');
  await symlink(join(outside, 'missing.mjs'), join(dangling, 'vite.config.mjs'));
  install(dangling, 2);
  await assert.rejects(readFile(join(outside, 'missing.mjs')), { code: 'ENOENT' });
  const nextRoot = await fixture(t);
  const nextConfig = 'export default {};\n';
  await file(nextRoot, 'package.json', '{"dependencies":{"next":"*"}}');
  await file(nextRoot, 'next.config.mjs', nextConfig);
  await file(nextRoot, 'app/layout.jsx', 'export default function Layout({children}) { return <body>{children}</body>; }');
  await symlink(outside, join(nextRoot, 'app/%5F_plumb'));
  install(nextRoot, 2);
  assert.equal(await readFile(join(nextRoot, 'next.config.mjs'), 'utf8'), nextConfig, 'route escape refuses before config write');
  assert.doesNotMatch(await readFile(join(nextRoot, 'app/layout.jsx'), 'utf8'), /PlumbOverlay/);
  for (const flags of [['install', '--write'], ['check', '--write'], ['install', '--overlay', '--write', '--list']]) command(root, process.execPath, [cli, ...flags], 2);
});

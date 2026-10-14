// Release walkthrough: an actual packed install, untouched app, CLI adoption,
// its own dev server, and a user-authored overlay write backed by JSX stamping.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
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
    assert.match(result.stderr, /refused.*\nNo install files changed/);
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

test('packed setup: advisory drift, init baseline, install, stamped Alt-hover and a written token fix', { timeout: 300000 }, async t => {
  let server, browser;
  t.after(async () => {
    await browser?.close();
    if (!server || server.exitCode !== null) return;
    const closed = new Promise(resolve => server.once('exit', resolve));
    process.kill(-server.pid, 'SIGTERM');
    await closed;
  });
  const root = await fixture(t);
  const metadata = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8'));
  const names = ['react', 'react-dom', 'vite', '@vitejs/plugin-react', 'tailwindcss', '@tailwindcss/vite'];
  const dependencies = Object.fromEntries(names.map(name => [name, metadata.devDependencies[name]]));
  await file(root, 'package.json', JSON.stringify({ name: 'calendar-settings', private: true, type: 'module', scripts: { dev: 'vite' }, dependencies }, null, 2) + '\n');
  const config = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\n\nexport default defineConfig({\n  // React owns refresh; Tailwind compiles the app theme.\n  plugins: [react(), tailwindcss()],\n});\n";
  await file(root, 'vite.config.mjs', config);
  await file(root, 'index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Calendar settings</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n');
  await file(root, 'src/main.jsx', "import { createRoot } from 'react-dom/client';\nimport { App } from './App.jsx';\nimport './styles.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n");
  const source = `function CalendarRow() {
  return <div id="calendar-row" className="flex items-center gap-[10px] rounded-[14px] bg-white px-s4 py-s3">
    <span className="flex-1">Calendar sync</span>
    <span className="text-ink-muted">Every 15 minutes</span>
    <button className="rounded-control bg-accent px-s3 py-s2 text-white">Run now</button>
  </div>;
}
export function App() {
  return <main className="mx-auto flex max-w-xl flex-col gap-s4 px-s4 py-s6">
    <header><h1 className="text-xl font-semibold">Connected calendars</h1><p className="text-ink-muted">Manage when your team calendars update.</p></header>
    <CalendarRow />
    <p className="text-sm text-ink-muted">Last updated four minutes ago.</p>
  </main>;
}
`;
  await file(root, 'src/App.jsx', source);
  await file(root, 'src/styles.css', `@import "tailwindcss";
@theme {
  /* why: icon to its label */
  --spacing-s1: 4px;
  /* why: compact related items */
  --spacing-s2: 8px;
  /* why: between label and control */
  --spacing-s3: 12px;
  /* why: breathing room for a group */
  --spacing-s4: 16px;
  /* why: between sections */
  --spacing-s6: 24px;
  /* why: controls you press */
  --radius-control: 8px;
  /* why: rows holding controls */
  --radius-card: 12px;
  /* why: page background */
  --color-ground: #f3f4f6;
  /* why: body text */
  --color-ink: #15181b;
  /* why: secondary text */
  --color-ink-muted: #5b6370;
  /* why: primary action */
  --color-accent: #2f5bd3;
}
body { background: var(--color-ground); color: var(--color-ink); font-family: system-ui, sans-serif; }
`);
  const packed = JSON.parse(command(repo, 'npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', root]))[0];
  command(root, 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(root, packed.filename)], 0, 180000);
  const plumb = (...args) => command(root, 'npx', ['--no-install', 'plumber', ...args]);
  assert.match(plumb(), /gap-\[10px\]/);
  const first = JSON.parse(plumb('--json'));
  const gapFinding = first.findings.find(finding => finding.sites.some(site => site.text.includes('gap-[10px]')));
  assert.ok(gapFinding, 'first config-free check reports this drift site');
  assert.match(plumb('init'), /Baseline:/);
  assert.match(await readFile(join(root, 'plumber.config.ts'), 'utf8'), /Inferred by React Plumber/);
  assert.ok((await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8')).length);
  const baseline = JSON.parse(plumb('check', '--json'));
  assert.equal(baseline.ledger.new, 0);
  const protectedFiles = ['plumber.config.ts', '.plumber/ledger.jsonl'];
  const protectedBefore = await Promise.all(protectedFiles.map(path => readFile(join(root, path), 'utf8')));
  assert.match(plumb('install', '--overlay', '--write'), /--- vite.config.mjs/);
  const wired = await readFile(join(root, 'vite.config.mjs'), 'utf8');
  assert.equal(wired, "import { plumb } from '@unlocalhosted/react-plumber/vite';\n" + config.replace('plugins: [react()', 'plugins: [plumb(), react()'));
  assert.match(plumb('install', '--overlay', '--write'), /already set up/);
  assert.equal(await readFile(join(root, 'vite.config.mjs'), 'utf8'), wired);

  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let logs = '';
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture dev server timed out:\n' + logs)), 30000);
    const append = chunk => {
      logs += chunk.toString();
      const match = /http:\/\/127\.0\.0\.1:\d+\//.exec(logs);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    };
    server.stdout.on('data', append); server.stderr.on('data', append);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Fixture server exited ${code}: ${logs}`)); });
  });
  browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined, env });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  assert.doesNotMatch(logs, /Source stamping is off/);
  assert.match(await page.locator('#calendar-row').getAttribute('data-plumb-source'), /^src\/App.jsx:2:\d+#[a-f\d]{12}$/);
  const located = await page.$eval('#calendar-row', element => window.__plumb.locate(element));
  assert.equal(located.via, 'stamp'); assert.equal(located.file, 'src/App.jsx'); assert.equal(located.line, 2);
  const overlay = page.locator('plumb-overlay'), box = await page.locator('#calendar-row').boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + 3 };
  await page.keyboard.down('Alt'); await page.mouse.move(point.x, point.y);
  // Init accepted today's drift as debt: the tag need not call it "new/off".
  await overlay.locator('.tag .el').filter({ hasText: /^div$/ }).waitFor();
  await page.mouse.click(point.x, point.y); await page.keyboard.up('Alt');
  const reading = overlay.getByRole('dialog', { name: /^React Plumber reading for div/ });
  await reading.waitFor();
  const pinnedLocation = (await reading.locator('.top .file').getAttribute('title')).split(' · ')[0];
  assert.equal(pinnedLocation, `${located.file}:${located.line}:${located.column}`);
  assert.match(await reading.locator('.read .t').first().innerText(), /gap-\[10px\]/);
  await reading.locator('.opt[data-pick]').filter({ hasText: 'compact related items' }).click();
  assert.equal(await page.locator('#calendar-row').evaluate(element => getComputedStyle(element).gap), '8px');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), source, 'preview has not changed disk');
  await reading.getByRole('button', { name: 'Write 1 edit' }).click();
  await overlay.locator('.synced .state').filter({ hasText: 'Wrote 1 edit to src/App.jsx' }).waitFor({ timeout: 15000 });
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), source.replace('gap-[10px]', 'gap-s2'), 'exactly the chosen token edit');
  const checked = JSON.parse(plumb('check', '--json'));
  const sourceSite = site => site.file === join(root, 'src/App.jsx');
  assert.ok(!checked.findings.some(finding => finding.sites.some(site => sourceSite(site) && site.text === 'gap-[10px]')), 'written source site no longer reported');
  assert.ok(checked.findings.some(finding => finding.sites.some(site => sourceSite(site) && site.text === 'rounded-[14px]')), 'unrelated drift remains visible');
  assert.ok(checked.ledger.stale > 0, 'paid debt remains a ledger warning until owner ratchets it');
  assert.equal(checked.ledger.new, 0);
  assert.deepEqual(await Promise.all(protectedFiles.map(path => readFile(join(root, path), 'utf8'))), protectedBefore, 'fix source without changing config or baseline');
  assert.deepEqual(errors, []);
  t.diagnostic('Packed install; config-free drift; init + green baseline; idempotent host edits; JSX stamp; Alt-hover/pin; token preview; exact source write; clean checked site.');
});

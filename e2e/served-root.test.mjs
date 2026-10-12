import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/plumb/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `"use client";
import React from 'react';
export default function App() {
  return <button id="served" className="gap-[13px]">Served app</button>;
}
`;
const at = { line: 4, column: 10 };
async function project(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.served-root-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  const config = await readFile(join(root, 'plumb.config.ts'), 'utf8');
  await writeFile(join(root, 'plumb.config.ts'), config.replace('export default {', "export default { source: ['src/**/*.{jsx,js,ts,tsx,css}', 'apps/**/*.{jsx,js,ts,tsx,css}', '!apps/**/src/Untracked.jsx'],"));
  await rm(join(root, 'src/App.tsx'));
  // Identical JSX/hash/coordinates make accidental selection of the repo file observable.
  await writeFile(join(root, 'src/App.jsx'), source);
  await writeFile(join(root, 'src/Fallback.jsx'), source);
  const servedRoot = join(root, 'apps', app);
  await mkdir(join(servedRoot, 'src'), { recursive: true });
  await writeFile(join(servedRoot, 'src/App.jsx'), source);
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  await writeFile(join(servedRoot, 'package.json'), JSON.stringify({ type: 'module', dependencies: { next: '^16.4.0', react: '^19.3.0', 'react-dom': '^19.3.0' } }));
  await symlink(join(repo, 'src/index.ts'), join(servedRoot, 'src/Escape.ts'));
  await symlink(join(root, 'src/App.jsx'), join(servedRoot, 'src/Alias.jsx'));
  for (const name of ['Untracked', 'Alias']) await writeFile(join(root, `src/${name}.jsx`), source);
  await writeFile(join(servedRoot, 'src/Untracked.jsx'), source);
  return { root, servedRoot, file: `apps/${app}/src/App.jsx` };
}
async function ready(url, headers = {}) {
  for (let i = 0; i < 1500; i++) {
    const health = await (await fetch(url + '/__plumb/health', { headers })).json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); return health; }
    await delay(20);
  }
  assert.fail('Session did not become ready');
}
async function vite(t, fixture) {
  const { root, servedRoot } = fixture;
  await writeFile(join(servedRoot, 'index.html'), '<html><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await writeFile(join(servedRoot, 'src/entry.jsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App />);
`);
  // Deliberately unstamped host: exercise owner-stack fallback; stamp.test.mjs covers dev stamps.
  const server = await createServer({ root: servedRoot, cacheDir: join(servedRoot, '.vite-cache'), configFile: false, plugins: [plumb({ root, watch: false, stamp: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    // No hot reload here. Without a watcher, macOS's late report of the fixture's own writes (fs.watch delivers a
    // modification made just before a file is watched) cannot reload the page mid-test.
    logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { url: `http://127.0.0.1:${server.httpServer.address().port}`, headers: {} };
}
async function child(t, args, cwd) {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WATCHPACK_POLLING: 'true' }; delete env.NODE_ENV;
  const spawned = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; spawned.stdout.on('data', chunk => output += chunk); spawned.stderr.on('data', chunk => output += chunk);
  const done = once(spawned, 'exit');
  t.after(async () => { if (spawned.exitCode === null && spawned.signalCode === null) { spawned.kill('SIGTERM'); await done; } });
  return { process: spawned, output: () => output };
}
async function next(t, fixture) {
  const { root, servedRoot } = fixture;
  const installed = join(root, 'node_modules/@unlocalhosted/plumb');
  await mkdir(installed, { recursive: true });
  for (const name of ['dist', 'overlay', 'package.json']) await cp(join(repo, name), join(installed, name), { recursive: true });
  const route = join(servedRoot, 'app/%5F_plumb/[...path]'); await mkdir(route, { recursive: true });
  await writeFile(join(route, 'route.plumb.ts'), `import { createPlumbRoute } from '@unlocalhosted/plumb/next';
export const runtime = 'nodejs';
export const { GET, POST } = createPlumbRoute({ root: ${JSON.stringify(root)}, watch: false });
`);
  await writeFile(join(servedRoot, 'app/layout.jsx'), `import { PlumbOverlay } from '@unlocalhosted/plumb/next';
export default function Layout({ children }) { return <html><body>{children}<PlumbOverlay /></body></html>; }
`);
  await writeFile(join(servedRoot, 'app/page.jsx'), `import App from '../src/App.jsx'; export default function Page() { return <App />; }\n`);
  await writeFile(join(servedRoot, 'next.config.mjs'), `import { withPlumb } from '@unlocalhosted/plumb/next/config';
export default withPlumb({ watchOptions: { pollIntervalMs: 100 }, turbopack: { root: ${JSON.stringify(servedRoot)} } });
`);
  const running = await child(t, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '0'], servedRoot);
  let url;
  for (let i = 0; i < 600; i++) {
    assert.equal(running.process.exitCode, null, running.output());
    const match = /http:\/\/127\.0\.0\.1:(\d+)/.exec(running.output());
    if (match && /Ready in/.test(running.output())) { url = match[0]; break; }
    await delay(50);
  }
  assert.ok(url, running.output());
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) }); assert.equal(response.status, 200, running.output());
  const token = /data-plumb-token="([a-f0-9]{64})"/.exec(await response.text())?.[1]; assert.ok(token, running.output());
  return { url, headers: { 'x-plumb-token': token } };
}
async function resolves(fixture, host) {
  const { root, servedRoot, file } = fixture, { url, headers } = host;
  const resolve = (source, params = {}) => fetch(url + '/__plumb/resolve?' + new URLSearchParams({ source, ...params }), { headers: { ...headers, Origin: url } });
  const snapshot = await (await resolve('src/App.jsx', { snapshot: '1' })).json();
  assert.equal(snapshot.file, file); assert.ok(snapshot.hash);
  for (const spelling of ['/src/App.jsx', 'src/App.jsx', url + '/src/App.jsx?t=123',
    'webpack://_N_E/./src/App.jsx', 'webpack-internal:///(app-pages-browser)/./src/App.jsx', 'webpack-internal:///(app-pages-browser)/src/App.jsx',
    'webpack-internal:///(custom-layer)/src/App.jsx', 'webpack-internal:///(custom-layer)/./src/App.jsx', '[project]/src/App.jsx [app-client] (ecmascript)',
    '/@fs/' + join(servedRoot, 'src/App.jsx'), pathToFileURL(join(servedRoot, 'src/App.jsx')).href, join(servedRoot, 'src/App.jsx'), file]) {
    const response = await resolve(spelling, { ...at, tag: 'button', hash: snapshot.hash });
    assert.equal(response.status, 200, spelling + ': ' + JSON.stringify(await response.clone().json()));
    assert.deepEqual(await response.json(), { file, ...at });
  }
  // Absolute evidence names exactly that file, even when servedRoot has a namesake.
  for (const spelling of ['/@fs/' + join(root, 'src/App.jsx'), pathToFileURL(join(root, 'src/App.jsx')).href, join(root, 'src/App.jsx')]) {
    assert.deepEqual(await (await resolve(spelling)).json(), { file: 'src/App.jsx' });
  }
  for (const spelling of ['src/Fallback.jsx', '/src/Fallback.jsx', url + '/src/Fallback.jsx']) {
    assert.deepEqual(await (await resolve(spelling)).json(), { file: 'src/Fallback.jsx' });
  }
  // Browser paths need not start with src/ or app/.
  await mkdir(join(servedRoot, 'components'), { recursive: true });
  await writeFile(join(servedRoot, 'components/Control.jsx'), source);
  assert.deepEqual(await (await resolve('/components/Control.jsx')).json(), { file: file.replace('src/App.jsx', 'components/Control.jsx') });
  for (const spelling of ['src/Escape.ts', 'src/Alias.jsx', 'src/Untracked.jsx', 'src/Missing.jsx', 'node_modules/react/index.js',
    '/@fs/' + join(repo, 'src/index.ts'), pathToFileURL(join(repo, 'src/index.ts')).href,
    'webpack://_N_E/../../../src/index.ts', '%2e%2e/%2e%2e/%2e%2e/src/index.ts']) {
    const response = await resolve(spelling); assert.equal(response.status, 200, spelling);
    const result = await response.json(); assert.equal(result.library, true, spelling); assert.equal(result.file, undefined, spelling);
  }
  assert.equal((await resolve('/src/App.jsx', { ...at, tag: 'span' })).status, 400);
  assert.equal((await resolve('/src/App.jsx', { ...at, hash: 'stale' })).status, 400, 'never try repo namesake after failed served evidence');
  return { file, ...at };
}
async function edit(fixture, host, location) {
  const { root, servedRoot } = fixture, { url } = host;
  const headers = { ...host.headers, Origin: url, 'Content-Type': 'application/json' };
  const choices = await (await fetch(url + '/__plumb/edits?' + new URLSearchParams(location), { headers })).json();
  const edit = choices.edits.find(edit => edit.from === 'gap-[13px]'); assert.ok(edit, JSON.stringify(choices));
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers,
    body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: edit.id }] }) });
  assert.equal(applied.status, 200, await applied.text());
  assert.equal(await readFile(join(servedRoot, 'src/App.jsx'), 'utf8'), source.replace('gap-[13px]', edit.to));
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), source, 'repo namesake is untouched');
}
for (const [name, start] of [['Vite apps/web', vite], ['Next apps/site webpack', next]]) {
  test(`${name}: monorepo resolve and writes use served root through real HTTP`, { timeout: 120000 }, async t => {
    const fixture = await project(t, name.startsWith('Vite') ? 'web' : 'site');
    const host = await start(t, fixture);
    assert.equal((await ready(host.url, host.headers)).root, fixture.root);
    await edit(fixture, host, await resolves(fixture, host));
  });
}
test('Vite handlers sharing a repository Session retain their own served roots', async t => {
  const fixture = await project(t, 'web'), first = await vite(t, fixture);
  await ready(first.url);
  const servedRoot = join(fixture.root, 'apps/other');
  await mkdir(join(servedRoot, 'src'), { recursive: true });
  await writeFile(join(servedRoot, 'src/App.jsx'), source);
  const second = await vite(t, { ...fixture, servedRoot });
  await ready(second.url);
  for (const [host, file] of [[first, fixture.file], [second, 'apps/other/src/App.jsx'], [first, fixture.file]]) {
    const response = await fetch(host.url + '/__plumb/resolve?source=/src/App.jsx');
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { file });
  }
});
test('serve --overlay --served-root resolves relative to CLI cwd while --root owns source writes', { timeout: 30000 }, async t => {
  const fixture = await project(t, 'web');
  const running = await child(t, [join(repo, 'dist/cli.js'), 'serve', '--overlay', '--origin', 'http://localhost:5555',
    '--served-root', 'apps/web', '--root', fixture.root, '--port', '0'], fixture.root);
  let info;
  for (let i = 0; i < 1000; i++) {
    assert.equal(running.process.exitCode, null, running.output());
    try { info = JSON.parse(await readFile(join(fixture.root, '.plumb/serve.json'), 'utf8')); break; } catch {}
    await delay(20);
  }
  assert.ok(info, running.output());
  const url = `http://127.0.0.1:${info.port}`, headers = { 'x-plumb-token': info.token, Origin: info.origin };
  const response = await fetch(url + '/__plumb/resolve?source=/src/App.jsx&line=4&column=10&tag=button', { headers });
  assert.equal(response.status, 200); const location = await response.json();
  assert.deepEqual(location, { file: fixture.file, ...at });
  const choices = await (await fetch(url + '/__plumb/edits?' + new URLSearchParams(location), { headers })).json();
  const edit = choices.edits.find(edit => edit.from === 'gap-[13px]'); assert.ok(edit);
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: edit.id }] }) });
  assert.equal(applied.status, 200, await applied.text());
  assert.equal(await readFile(join(fixture.servedRoot, 'src/App.jsx'), 'utf8'), source.replace('gap-[13px]', edit.to));
  assert.equal(await readFile(join(fixture.root, 'src/App.jsx'), 'utf8'), source);
});
async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMB_CHROMIUM || undefined });
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
for (const [name, start] of [['Vite apps/web', vite], ['Next apps/site webpack', next]]) {
  test(`${name}: browser fibers locate served JSX and Node applies exact edit`, { timeout: 120000 }, async t => {
    const launched = await browser(t); if (!launched) return;
    const fixture = await project(t, name.startsWith('Vite') ? 'web' : 'site'), host = await start(t, fixture);
    const page = await launched.newPage();
    await page.goto(host.url, { timeout: 60000 });
    await page.waitForFunction(() => window.__plumb && document.getElementById('served'));
    assert.equal((await page.evaluate(() => window.__plumb.ready())).status, 'ready');
    const result = await page.$eval('#served', async element => ({ location: await window.__plumb.locate(element, { explain: true }), site: await window.__plumb.site(element) }));
    const link = { file: fixture.file, ...at, component: 'App' };
    assert.deepEqual(result.location, { ...link, tag: 'button', via: 'owner-stack', chain: [link], index: 0 }, JSON.stringify(result));
    assert.deepEqual(result.site.declarations.map(d => d.site.text), ['gap-[13px]']);
    await edit(fixture, host, { file: result.location.file, line: result.location.line, column: result.location.column });
  });
}

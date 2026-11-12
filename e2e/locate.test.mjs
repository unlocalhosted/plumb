import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { Session } from '../dist/session/index.js';
import { plumb } from '@unlocalhosted/react-plumber/vite';

// These regressions deliberately exercise owner-stack locate without stamps.
function unstamped(options) {
  const plugin = plumb(options);
  delete plugin.transform;
  return plugin;
}

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `"use client";
import React from 'react';
function Inner() {
  return <span id="nested" className="gap-[13px]">Nested</span>;
}
function Forward({ className }) {
  return <button id="forward" className={className} style={{ padding: 14 }}>Forward</button>;
}
export default function App() {
  return <main>
    <section id="parent" className="py-[10px]"><Inner /><b id="sibling" className="gap-[17px]">Sibling</b></section>
    {[1, 2].map(n => <i key={n} id={'item-' + n} className="gap-[19px]">{n}</i>)}
    <><em id="fragment" className="gap-[23px]">Fragment</em></>
    <Forward className="gap-[29px]" />
    <div id="multiline"
      className="gap-[31px]"
      style={{ padding: 10 }}
    ><small id="child" className="gap-[37px]">Child</small></div>
    <aside id="explicit" data-plumb-source="src/App.jsx:19:5" className="gap-[41px]">Explicit</aside>
    <div id="prop-parent" children={<span id="prop-child" className="gap-[43px]" />} className="py-[10px]" />
    <section id="helper-parent" className="py-[10px]" children={renderLeaf()} />
  </main>;
}
import { renderLeaf } from './react-dom-helper.jsx';
`;
const anchors = {
  nested: ['<span', 'Inner', 'gap-[13px]'], sibling: ['<b id=', 'App', 'gap-[17px]'],
  parent: ['<section', 'App', 'py-[10px]'], 'item-1': ['<i key=', null, 'gap-[19px]'],
  'item-2': ['<i key=', null, 'gap-[19px]'], fragment: ['<em', 'App', 'gap-[23px]'],
  forward: ['<button', 'Forward', null], multiline: ['<div id="multiline"', 'App', 'gap-[31px]'],
  'prop-parent': ['<div id="prop-parent"', 'App', 'py-[10px]'], 'prop-child': ['<span id="prop-child"', 'App', 'gap-[43px]'],
  child: ['<small', 'App', 'gap-[37px]'], explicit: ['<aside', 'App', 'gap-[41px]'],
};
function position(fragment) {
  const offset = source.indexOf(fragment), before = source.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}
async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
async function project(t, beforeCleanup = async () => {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.locate-'));
  t.after(async () => { await beforeCleanup(); await rm(root, { recursive: true, force: true }); });
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.jsx'), source);
  await writeFile(join(root, 'src/react-dom-helper.jsx'), 'export function renderLeaf() { return <span id="helper-leaf" className="gap-[13px]">leaf</span>; }');
  await rm(join(root, 'src/App.tsx'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { next: '^16.4.0', react: '^19.3.0', 'react-dom': '^19.3.0' } }));
  return root;
}
async function ready(url) {
  for (let i = 0; i < 1500; i++) {
    const health = await (await fetch(url + '/__plumb/health')).json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); return; }
    await delay(20);
  }
  assert.fail('Session did not become ready');
}
function expectedLocation(id, fragment, component, tag, version = 19) {
  if (version === 18 && id.startsWith('item-')) component = 'App';
  const chain = [{ file: 'src/App.jsx', ...position(fragment), component }];
  if (id === 'nested' || id === 'forward') chain.push({
    file: 'src/App.jsx', ...position(id === 'nested' ? '<Inner />' : '<Forward className='),
    component: id === 'nested' ? 'Inner' : 'Forward',
  });
  if (version === 18) chain.push({ file: 'src/entry.jsx', line: 4, column: 71, component: 'App' });
  return { ...chain[0], tag, via: 'owner-stack', chain, index: 0 };
}
async function assertions(page, version = 19) {
  await page.waitForFunction(async () => {
    const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
    const response = await fetch('/__plumb/health', { headers: token ? { 'x-plumb-token': token } : {} });
    return (await response.json()).status === 'ready';
  });
  await page.waitForFunction(() => window.__plumb && document.querySelector('#nested')?.[Object.keys(document.querySelector('#nested')).find(key => key.startsWith('__reactFiber$'))]);
  await page.evaluate(() => window.__plumb.ready());
  for (const [id, [fragment, component, token]] of Object.entries(anchors)) {
    const location = await page.$eval('#' + id, element => window.__plumb.locate(element));
    const debug = await page.$eval('#' + id, element => {
      const fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
      return { stack: fiber?._debugStack?.stack, source: fiber?._debugSource };
    });
    assert.deepEqual(location, expectedLocation(id, fragment, component, await page.$eval('#' + id, element => element.localName), version), JSON.stringify({ id, debug }));
    const site = await page.$eval('#' + id, element => window.__plumb.site(element));
    assert.ok(site, id);
    if (token) {
      assert.ok(site.findings.length > 0, id + ': findings');
      assert.ok(site.declarations.some(d => d.site.text === token), id + ': declarations');
      assert.ok(site.declarations.every(d => d.site.text === token || id === 'multiline' && d.origin === 'inline'), id + ': isolated attributes');
    } else { assert.ok(site.findings.length, id); assert.deepEqual(site.declarations.map(d => d.site.text), ['padding: 14']); }
  }
  const leaf = await page.$eval('#helper-leaf', element => window.__plumb.locate(element));
  const leafLink = { file: 'src/react-dom-helper.jsx', line: 1, column: 39, component: version === 18 ? 'App' : 'renderLeaf' };
  const leafChain = [leafLink, ...(version === 18 ? [{ file: 'src/entry.jsx', line: 4, column: 71, component: 'App' }] : [])];
  assert.deepEqual(leaf, { ...leafLink, tag: 'span', via: 'owner-stack', chain: leafChain, index: 0 }, 'authored react-dom filename is not runtime');
  const leafSite = await page.$eval('#helper-leaf', element => window.__plumb.site(element));
  assert.deepEqual(leafSite.declarations.map(d => d.site.text), ['gap-[13px]']);
  const imperative = await page.evaluate(async () => {
    const element = document.createElement('div'); document.querySelector('#parent').append(element);
    return { location: await window.__plumb.locate(element), site: await window.__plumb.site(element) };
  });
  assert.deepEqual(imperative.location, expectedLocation('parent', '<section', 'App', 'div', version), 'imperative child resolves to nearest rendered ancestor');
  assert.deepEqual(imperative.site?.declarations.map(d => d.site.text), ['py-[10px]']);
  assert.equal(await page.evaluate(() => window.__plumb.locate(null)), null);
  assert.deepEqual(await page.evaluate(() => window.__plumb.locate(null, { explain: true })), { location: null, reason: 'no-fiber', detail: { step: 'invalid-element' } });
  assert.equal(await page.evaluate(async () => {
    const element = document.createElement('div'); document.body.append(element);
    return window.__plumb.site(element);
  }), null);
  // The request goes through the host's auth/origin core, never a mocked resolver.
  for (const source of [join(repo, 'src/index.ts'), 'node_modules/react/index.js', 'untracked.jsx', 'webpack://_N_E/../../src/index.ts']) {
    const result = await page.evaluate(async source => {
      const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
      return (await fetch('/__plumb/resolve?' + new URLSearchParams({ source }), { headers: token ? { 'x-plumb-token': token } : {} })).json();
    }, source);
    assert.equal(result.library, true, source);
    assert.equal(result.file, undefined, source);
  }
  for (const source of ['webpack://_N_E/./src/App.jsx', '/src/App.jsx', 'src/App.jsx', '[project]/src/App.jsx [app-client] (ecmascript)']) {
    const resolved = await page.evaluate(async source => {
      const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
      return (await fetch('/__plumb/resolve?' + new URLSearchParams({ source }), { headers: token ? { 'x-plumb-token': token } : {} })).json();
    }, source);
    assert.deepEqual(resolved, { file: 'src/App.jsx' });
  }
}

async function editSlice(page, root) {
  const location = await page.$eval('#multiline', element => window.__plumb.locate(element));
  const origin = new URL(page.url()).origin;
  const token = await page.evaluate(() => document.querySelector('script[data-plumb-token]')?.dataset.plumbToken);
  const headers = { Origin: origin, 'Content-Type': 'application/json', ...(token ? { 'x-plumb-token': token } : {}) };
  const query = new URLSearchParams({ file: location.file, line: location.line, column: location.column });
  const choices = await (await fetch(origin + '/__plumb/edits?' + query, { headers })).json();
  const edit = choices.edits.find(edit => edit.from === 'gap-[31px]'); assert.ok(edit, JSON.stringify({ choices, location }));
  // Source writes can reload the document. Keep both requests in Node.
  const response = await fetch(origin + '/__plumb/apply', { method: 'POST', headers,
    body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: edit.id }] }) });
  assert.equal(response.status, 200, await response.text());
  const text = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.ok(text.includes(edit.to)); assert.ok(!text.includes('gap-[31px]'));
}
// Turbopack's inline map for a hot-updated module is a line off; React Plumber refuses it rather than name the wrong line, and
// a reload, which runs the rebuilt chunk, locates exactly.
async function current(page, bundler) {
  const explain = await page.$eval('#nested', element => window.__plumb.locate(element, { explain: true }));
  if (explain.location !== null || bundler !== 'turbopack') return explain;
  assert.deepEqual([explain.reason, explain.detail.step], ['map', 'hot-update-map'], JSON.stringify(explain));
  await page.reload(); await page.waitForFunction(() => window.__plumb?.locate);
  return page.$eval('#nested', element => window.__plumb.locate(element, { explain: true }));
}
async function hmrAssertions(page, root, vite, bundler) {
  const snapshot = () => page.evaluate(async () => {
    const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
    return (await fetch('/__plumb/resolve?source=src/App.jsx&snapshot=1', { headers: token ? { 'x-plumb-token': token } : {} })).json();
  });
  const oldSnapshot = await snapshot();
  await page.$eval('#nested', element => {
    window.oldPlumbElement = element;
    const fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
    window.oldPlumbStack = fiber._debugStack;
    return window.__plumb.locate(element);
  });
  await writeFile(join(root, 'src/App.jsx'), source.replace('Nested</span>', 'Updated</span>'));
  // Save race must refuse the old source snapshot even when its JSX tag/position still exists.
  const stale = await page.evaluate(async () => {
    const element = window.oldPlumbElement, fiber = element[Object.keys(element).find(key => key.startsWith('__reactFiber$'))];
    const sameEvidence = fiber._debugStack === window.oldPlumbStack, text = element.textContent;
    const explain = await window.__plumb.locate(element, { explain: true });
    return { sameEvidence, text, location: explain?.location === null ? null : explain, explain };
  });
  // The DOM key may retain the alternate after React has already committed HMR.
  if (stale.sameEvidence && stale.text === 'Nested') {
    assert.equal(stale.location, null, 'source mismatch never corrects an old location: ' + JSON.stringify(stale.explain));
    assert.equal(stale.explain.reason, 'source-mismatch', JSON.stringify(stale.explain));
    assert.notEqual(stale.explain.detail.mapHash, stale.explain.detail.currentHash);
    assert.notEqual(oldSnapshot.hash, (await snapshot()).hash, 'stale and current source snapshots differ');
  }
  await page.waitForFunction(() => document.querySelector('#nested')?.textContent === 'Updated', null, { polling: vite ? 1 : 'raf' });
  if (vite) {
  }
  // First Next module-version query may invalidate old stable-URL evidence;
  // retry uses the fresh module snapshot, not the obsolete coordinate.
  let fresh = await page.$eval('#nested', element => window.__plumb.locate(element));
  if (!fresh) fresh = await current(page, bundler);
  if (fresh?.location === null) fresh = null;
  const explain = fresh ? undefined : await page.$eval('#nested', element => window.__plumb.locate(element, { explain: true }));
  assert.deepEqual(fresh, expectedLocation('nested', '<span', 'Inner', 'span'), JSON.stringify({ explain }));
  // Also refresh without a save-race lookup to invalidate caches beforehand.
  await writeFile(join(root, 'src/App.jsx'), source.replace('Nested</span>', 'Again</span>'));
  await page.waitForFunction(() => document.querySelector('#nested')?.textContent === 'Again');
  const committed = await current(page, bundler);
  assert.deepEqual(committed, expectedLocation('nested', '<span', 'Inner', 'span'), JSON.stringify(committed));
}
async function warmBudget(page, t) {
  // CDP measures CPU on the renderer main thread, excluding fetch/worker waits.
  await page.$eval('#nested', element => window.__plumb.locate(element));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value;
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const start = await metric();
    const location = await page.$eval('#nested', element => window.__plumb.locate(element));
    assert.ok(location); samples.push((await metric() - start) * 1000);
  }
  await cdp.detach();
  t.diagnostic('warm Next locate main-thread ms: ' + samples.map(ms => ms.toFixed(2)).join(', '));
  assert.ok(Math.max(...samples) < 16, 'warm Next locate main-thread ms: ' + samples.join(', '));
}

for (const [version, polling] of [[19, false], [19, true], [18, false]]) test(`Vite React ${version}${polling ? ' (polling watcher)' : ''}: real fibers locate exact JSX sites`, { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const root = await project(t);
  if (version === 18) {
    await cp(join(repo, 'fixtures/react18/node_modules'), join(root, 'node_modules'), { recursive: true });
  }
  const html = '<html><head></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>';
  await writeFile(join(root, 'index.html'), html);
  await writeFile(join(root, 'src/entry.jsx'), `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\nconst root = createRoot(document.getElementById('root')); root.render(<App />);\nif (import.meta.hot) import.meta.hot.accept('./App.jsx', module => root.render(React.createElement(module.default)));\n`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [unstamped({ watch: false })],
    // The JSX runtime and React DOM must share the initial bundle. Late discovery on
    // a cold React 18 start can change common chunks and reload during locate().
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0,
      watch: version === 19 ? {
        // Exercise the documented Docker/WSL fallback at Chokidar's default interval.
        // Keep polling above Chokidar's internal 5ms input throttle.
        ...(polling ? { useFsEvents: false, usePolling: true, interval: 100 } : {}),
        // Chokidar otherwise drops a second save inside its 50ms change throttle.
        // Emit after the write settles, including truncate/write events from writeFile.
        awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
      } : {
        // FSEvents can replay construction writes after this watcher starts.
        // Vite buffers the HTML reload for the first WebSocket. Native fs.watch
        // observes saves from subscription onward; HMR remains enabled.
        useFsEvents: false,
      },
    } });
  t.after(() => server.close()); await server.listen();
  const page = await launched.newPage();
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await assertions(page, version);
  assert.equal(navigations, 1, 'dependency optimization must not reload the document during locate');
  if (version === 19) {
    await hmrAssertions(page, root, true);
    assert.equal(navigations, 1, 'source updates must use HMR without reloading the document');
  } else {
    // Keep the native watcher and real reload path exercised: an HTML save
    // after startup must reload, unlike the fixture's initial publication.
    const reloaded = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame() });
    await writeFile(join(root, 'index.html'), html.replace('<body>', '<body data-saved="true">'));
    await reloaded;
    await page.waitForFunction(() => document.body?.dataset.saved === 'true' && window.__plumb && document.querySelector('#nested'));
    await page.evaluate(() => window.__plumb.ready());
    assert.equal(navigations, 2, 'a real HTML save still reloads through the native watcher');
  }
  await editSlice(page, root);
});

for (const bundler of ['webpack', 'turbopack']) test(`Next 16 ${bundler}: installed route.plumb.ts locates exact JSX sites`, { timeout: 120000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  let stop = async () => {};
  // after hooks run in registration order. Stop Next before removing its live
  // Turbopack cache, rather than letting fixture removal race background writes.
  const root = await project(t, () => stop());
  await writeFile(join(root, 'src/Large.jsx'), '"use client"; export default function Large() { return <div hidden>' + Array.from({ length: 4000 }, (_, i) => `<span className="gap-[13px]">${i}</span>`).join('') + '</div>; }');
  const installed = join(root, 'node_modules/@unlocalhosted/react-plumber');
  await mkdir(installed, { recursive: true });
  for (const name of ['dist', 'overlay', 'package.json', 'THIRD_PARTY_NOTICES']) await cp(join(repo, name), join(installed, name), { recursive: true });
  const route = join(root, 'app/%5F_plumb/[...path]'); await mkdir(route, { recursive: true });
  await writeFile(join(route, 'route.plumb.ts'), `import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';\nexport const runtime = 'nodejs';\nexport const { GET, POST } = createPlumbRoute({ watch: false });\n`);
  await writeFile(join(root, 'app/layout.jsx'), `import { PlumbOverlay } from '@unlocalhosted/react-plumber/next';\nexport default function Layout({children}) { return <html><body>{children}<PlumbOverlay /></body></html>; }\n`);
  await writeFile(join(root, 'app/page.jsx'), `import App from '../src/App.jsx'; import Large from '../src/Large.jsx'; export default function Page() { return <><App /><Large /></>; }\n`);
  await writeFile(join(root, 'next.config.mjs'), `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, watchOptions: { pollIntervalMs: 100 }, turbopack: { root: ${JSON.stringify(repo)} } });\n`);
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WATCHPACK_POLLING: 'true' }; delete env.NODE_ENV;
  const grouped = process.platform !== 'win32';
  const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--' + bundler, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, detached: grouped, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  const done = once(child, 'exit');
  stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const signal = value => {
      try { if (grouped) process.kill(-child.pid, value); else child.kill(value); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    signal('SIGTERM');
    const fallback = setTimeout(() => signal('SIGKILL'), 5000);
    try { await done; } finally { clearTimeout(fallback); }
  };
  let url;
  for (let i = 0; i < 600; i++) {
    assert.equal(child.exitCode, null, output);
    const match = /http:\/\/127\.0\.0\.1:(\d+)/.exec(output);
    if (match && /Ready in/.test(output)) { url = match[0]; break; }
    await delay(50);
  }
  assert.ok(url, output);
  const page = await launched.newPage();
  page.on('pageerror', error => output += '\n' + error.message);
  await page.goto(url, { timeout: 60000 });
  try { await assertions(page); await warmBudget(page, t); await hmrAssertions(page, root, false, bundler); await editSlice(page, root); } catch (error) { error.message += '\n' + output; throw error; }
});

test('resolve validates tracked source identity and site queries select only exact JSX attributes', async t => {
  const root = await project(t);
  await writeFile(join(root, 'untracked.jsx'), 'export default () => <div />;');
  await writeFile(join(root, 'index.html'), '<html><head></head><body>Host</body></html>');
  await symlink(join(repo, 'src/index.ts'), join(root, 'src/escape.ts'));
  await mkdir(join(root, 'node_modules/local'), { recursive: true });
  await writeFile(join(root, 'node_modules/local/index.jsx'), 'export default () => <div />;');
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [unstamped({ watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/__plumb/`;
  await ready(new URL(url).origin);
  const html = await (await fetch(new URL('../', url))).text();
  assert.doesNotMatch(html, /html-proxy|vite-ignore/);
  assert.equal((await fetch(new URL('../__plumb/src/sourcemap.js', url))).status, 200);
  const resolve = (source, params = {}, init) => fetch(url + 'resolve?' + new URLSearchParams({ source, ...params }), init);
  for (const source of [join(root, 'src/App.jsx'), pathToFileURL(join(root, 'src/App.jsx')).href, '/@fs/' + join(root, 'src/App.jsx'), 'webpack://_N_E/./src/App.jsx', 'webpack-internal:///(app-pages-browser)/./src/App.jsx', 'webpack-internal:///(app-pages-browser)/src/App.jsx', 'webpack-internal:///(custom-layer)/src/App.jsx', 'webpack-internal:///(custom-layer)/./src/App.jsx', '/src/App.jsx', 'src/App.jsx']) {
    const response = await resolve(source); assert.equal(response.status, 200, source); assert.deepEqual(await response.json(), { file: 'src/App.jsx' });
    const atTag = await resolve(source, { ...position('<span'), column: position('<span').column + 1 });
    assert.equal(atTag.status, 200); assert.deepEqual(await atTag.json(), { file: 'src/App.jsx', ...position('<span') });
  }
  for (const component of ['Inner', 'Forward']) {
    const at = position('<' + component);
    const response = await resolve('src/App.jsx', { ...at, column: at.column + 1 });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { file: 'src/App.jsx', ...at, component });
  }
  assert.equal((await resolve('src/App.jsx', { ...position('<section'), tag: 'span' })).status, 400, 'span cannot resolve to caller section');
  for (const source of [join(repo, 'src/index.ts'), pathToFileURL(join(repo, 'src/index.ts')).href, 'file:///src/App.jsx', 'node_modules/local/index.jsx', '/@fs/' + join(root, 'node_modules/local/index.jsx'), 'untracked.jsx', 'src/escape.ts', 'webpack://_N_E/../../src/index.ts', '%2e%2e/%2e%2e/src/index.ts', 'webpack://_N_E/./node_modules/local/index.jsx']) {
    const response = await resolve(source); assert.equal(response.status, 200, source);
    const result = await response.json(); assert.equal(result.library, true, source); assert.equal(result.file, undefined, source);
  }
  // Not JSX, and what is there instead: a caller's call can have rendered an element; past the text or on no call it can't.
  for (const [params, at] of [[{ line: 9999, column: 1 }, 'outside'], [{ line: 1, column: 1 }, 'other'], [{ line: 4, column: 99999 }, 'outside'],
    [position('</span>'), 'other'], [position('renderLeaf()}'), 'call']]) {
    const response = await resolve('src/App.jsx', params);
    assert.equal(response.status, 200, JSON.stringify(params));
    assert.deepEqual(await response.json(), { refused: 'not-jsx', at }, JSON.stringify(params));
  }
  for (const params of [{ line: 4 }, { column: 10 }, { line: 0, column: 1 }]) assert.equal((await resolve('src/App.jsx', params)).status, 400, JSON.stringify(params));
  assert.equal((await resolve('src/App.jsx', {}, { headers: { Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await resolve('src/App.jsx', {}, { method: 'POST', headers: { Origin: new URL(url).origin } })).status, 405);
  for (const [id, [fragment, , token]] of Object.entries(anchors)) {
    const response = await fetch(url + 'site?' + new URLSearchParams({ file: 'src/App.jsx', ...position(fragment) }));
    assert.equal(response.status, 200, id);
    const site = await response.json();
    if (token) {
      assert.ok(site.findings.length, id);
      assert.ok(site.declarations.some(d => d.site.text === token), id);
      assert.ok(site.declarations.every(d => d.site.text === token || id === 'multiline' && d.origin === 'inline'), id);
    } else { assert.ok(site.findings.length); assert.deepEqual(site.declarations.map(d => d.site.text), ['padding: 14'], 'forwarded props must not guess their caller'); }
  }
  const location = await (await resolve('src/App.jsx', { ...position('<div id="multiline"'), tag: 'div' })).json();
  const choices = await (await fetch(url + 'edits?' + new URLSearchParams(location))).json();
  const choice = choices.edits.find(edit => edit.from === 'gap-[31px]'); assert.ok(choice, 'opening anchor offers own multiline edits');
  const applied = await fetch(url + 'apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(url).origin }, body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: choice.id }] }) });
  assert.equal(applied.status, 200, await applied.text());
  assert.ok((await readFile(join(root, 'src/App.jsx'), 'utf8')).includes(choice.to));
  assert.ok(!(await readFile(join(root, 'src/App.jsx'), 'utf8')).includes('gap-[31px]'));
  // Reconciliation must keep multiline attributes intact after the warm source changes.
  await writeFile(join(root, 'src/App.jsx'), source.replace('gap-[31px]', 'gap-[33px]'));
  const updated = await (await fetch(url + 'site?' + new URLSearchParams({ file: 'src/App.jsx', ...position('<div id="multiline"') }))).json();
  assert.deepEqual(updated.declarations.map(d => d.site.text).sort(), ['gap-[33px]', 'padding: 10']);
  assert.equal((await resolve('src/App.jsx')).status, 200);
  await rm(join(root, 'src/App.jsx'));
  assert.deepEqual(await (await resolve('src/App.jsx')).json(), { library: true, untracked: 'src/App.jsx' }, 'deleted source is no longer tracked');
});

test('review 5: watch-disabled target judgement refreshes theme, config imports, preset and empty DTCG inputs', async t => {
  const root = await project(t), tokens = join(root, 'tokens/empty.json');
  await mkdir(join(root, 'tokens')); await writeFile(tokens, '{}');
  const preset = join(root, 'preset.mjs'), rules = join(root, 'rules.mjs');
  await writeFile(preset, 'export default { name: "query-preset", decisions: {} };');
  const config = identity => `export default { css: 'src/styles.css', presets: ['./preset.mjs'], decisions: { spacing: { identity: '${identity}', from: 'dtcg:tokens/*.json' } } };`;
  await writeFile(rules, config('value'));
  await writeFile(join(root, 'plumber.config.ts'), "import settings from './rules.mjs'; export default settings;");
  const session = await Session.create({ root, watch: false }); t.after(() => session.close());
  const parity = async () => {
    const actual = await session.site('src/App.jsx', 4, 10);
    const fresh = await Session.create({ root, watch: false });
    try { assert.deepEqual(actual, await fresh.site('src/App.jsx', 4, 10)); } finally { await fresh.close(); }
    return actual;
  };
  await parity();
  await writeFile(tokens, JSON.stringify(Object.fromEntries([['small', 8], ['step', 12], ['large', 16]].map(([name, value]) => [name, { $type: 'dimension', $value: { value, unit: 'px' } }]))));
  const dtcg = await parity();
  assert.ok(dtcg.findings.some(f => [...f.decisions, ...f.choices ?? []].some(d => d.name === 'step')), 'previously empty glob input is statted without events: ' + JSON.stringify(dtcg.findings));
  await writeFile(rules, config('reference')); await parity();
  const theme = join(root, 'src/styles.css');
  await writeFile(theme, (await readFile(theme, 'utf8')).replace('--spacing-s3: 12px', '--spacing-s3: 20px')); await parity();
  const before = (await session.edits('src/App.jsx', 4, 10)).revision;
  await writeFile(preset, 'export default { name: "updated-query-preset", decisions: {} };');
  await parity();
  assert.ok((await session.edits('src/App.jsx', 4, 10)).revision > before, 'preset file is part of query reconciliation');
});

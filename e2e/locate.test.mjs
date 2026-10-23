import { Session as EngineSession } from '../dist/session/engine.js';
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
  const before = await page.evaluate(async () => (await import('/__plumb/src/sourcemap.js')).sourceMapVersion());
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
    const after = await page.evaluate(async () => (await import('/__plumb/src/sourcemap.js')).sourceMapVersion());
    assert.ok(after > before, 'Vite host HMR boundary invalidates map caches');
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
  const hotModule = /<script[^>]*src="([^"]*html-proxy[^"]*)"/.exec(html);
  assert.ok(hotModule, 'Vite transforms overlay HMR hook as a module');
  const hotCode = await (await fetch(new URL(hotModule[1].replaceAll('&amp;', '&'), url))).text();
  assert.match(hotCode, /createHotContext/); assert.match(hotCode, /vite:afterUpdate/);
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

test('script maps resolve through real HTTP: inline data, relative URLs, sourceRoot, nested index sections and unmapped spans', async t => {
  const { mapFrame } = await import('../overlay/src/sourcemap.js');
  const root = await project(t), requests = new Map();
  const basic = { version: 3, sources: ['App.jsx'], sourceRoot: 'webpack://_N_E/./src/', names: [], sourcesContent: [source], mappings: 'AAGU' };
  const assets = new Map([
    ['inline.js', '//# sourceMappingURL=data:application/json;base64,' + Buffer.from(JSON.stringify(basic)).toString('base64')],
    ['percent.js', '//# sourceMappingURL=data:application/json,' + encodeURIComponent(JSON.stringify({ ...basic, sourceRoot: '/src/' }))],
    ['relative.js', '//# sourceMappingURL=relative.js.map'],
    ['relative.js.map', JSON.stringify({ ...basic, sourceRoot: '', sources: ['../src/App.jsx'] })],
    ['index.js', '//# sourceMappingURL=index.js.map'],
    ['index.js.map', JSON.stringify({ version: 3, sections: [{ offset: { line: 2, column: 7 }, map: { version: 3, sections: [{ offset: { line: 0, column: 0 }, url: 'section.map' }] } }, { offset: { line: 100000, column: 0 }, url: 'unrelated.map' }] })],
    ['unrelated.map', JSON.stringify({ ...basic, mappings: 'AAGU,' + 'CAAA,'.repeat(300000).slice(0, -1) })],
    ['section.map', JSON.stringify({ ...basic, mappings: 'AAGU;AAAA' })],
    ['unmapped.js', '//# sourceMappingURL=unmapped.map'],
    ['unmapped.map', JSON.stringify({ ...basic, mappings: 'AAGU,K' })],
    ['lazy-row.js', '//# sourceMappingURL=lazy-row.map'],
    ['lazy-row.map', JSON.stringify({ ...basic, mappings: 'AAGU;!' })],
    ['broken.js', '//# sourceMappingURL=broken.map'],
    ['broken.map', JSON.stringify({ ...basic, mappings: '!' })],
    ['missing.js', 'export const plain = true;'],
  ]);
  const maps = { name: 'fixture-script-maps', configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const name = new URL(request.url, 'http://fixture').pathname.slice('/maps/'.length);
      if (!request.url.startsWith('/maps/') || !assets.has(name)) return next();
      requests.set(name, (requests.get(name) ?? 0) + 1);
      response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'application/json'); response.end(assets.get(name));
    });
  } };
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [maps, unstamped({ watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  await ready(url);
  for (const [name, line, column] of [['inline.js', 1, 1], ['percent.js', 1, 1], ['relative.js', 1, 1], ['index.js', 3, 8], ['index.js', 4, 1]]) {
    const mapped = await mapFrame(url + '/maps/' + name, line, column); assert.ok(mapped, name);
    const response = await fetch(url + '/__plumb/resolve?' + new URLSearchParams(mapped));
    assert.equal(response.status, 200, name);
    const location = await response.json(); assert.deepEqual(location, { file: 'src/App.jsx', ...position('<span') });
    const site = await (await fetch(url + '/__plumb/site?' + new URLSearchParams(location))).json();
    assert.deepEqual(site.declarations.map(d => d.site.text), ['gap-[13px]']);
    assert.ok(site.findings.length);
    assert.deepEqual(await mapFrame(url + '/maps/' + name, line, column), mapped);
    assert.equal(requests.get(name), 1, 'script URL cache: ' + name);
  }
  assert.ok(await mapFrame(url + '/maps/lazy-row.js', 1, 1), 'unrequested rows remain undecoded');
  assert.equal(await mapFrame(url + '/maps/lazy-row.js', 2, 1), null, 'malformed requested row refuses');
  for (const [name, line, column] of [['unmapped.js', 1, 6], ['broken.js', 1, 1], ['missing.js', 1, 1], ['index.js', 3, 7]]) assert.equal(await mapFrame(url + '/maps/' + name, line, column), null, name);
  assert.equal(requests.get('relative.js.map'), 1); assert.equal(requests.get('section.map'), 1);
  assert.equal(requests.get('unrelated.map'), undefined, 'unselected index-map section never fetched/decoded');
});

test('review 2: stable module/map URLs invalidate together and reject mismatched source snapshots', async t => {
  const { mapFrame, invalidateSourceMaps } = await import('../overlay/src/sourcemap.js');
  const root = await project(t), requests = new Map();
  const old = 'export const A = () => <div className="py-[10px]" />;\nexport const B = () => <div className="gap-[13px]" />;';
  const next = old.replace('py-[10px]', 'py-[12px]');
  await writeFile(join(root, 'src/Version.jsx'), old);
  let content = old, mappings = 'AAAuB', available = false;
  const plugin = { name: 'versioned-maps', configureServer(server) {
    server.middlewares.use((req, res, proceed) => {
      if (!['/version.js', '/version.map'].includes(req.url)) return proceed();
      requests.set(req.url, (requests.get(req.url) ?? 0) + 1);
      if (!available) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'application/json');
      res.end(req.url.endsWith('.js') ? '//# sourceMappingURL=version.map' : JSON.stringify({ version: 3, sources: ['/src/Version.jsx'], sourcesContent: [content], names: [], mappings }));
    });
  } };
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plugin, unstamped({ watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  await ready(url);
  assert.equal(await mapFrame(url + '/version.js', 1, 1), null);
  available = true;
  const initial = await mapFrame(url + '/version.js', 1, 1);
  assert.ok(initial?.hash, 'cached failures recover without an HMR event');
  const resolve = value => fetch(url + '/__plumb/resolve?' + new URLSearchParams({ ...value, tag: 'div' }));
  const first = await resolve(initial); assert.equal(first.status, 200, JSON.stringify({ initial, body: await first.json() }));
  await writeFile(join(root, 'src/Version.jsx'), next);
  content = next; mappings = 'AACuB';
  assert.equal((await resolve(initial)).status, 400, 'old div position is valid JSX but obsolete source is refused');
  invalidateSourceMaps();
  const updated = await mapFrame(url + '/version.js', 1, 1);
  assert.equal(updated.line, 2); assert.notEqual(updated.hash, initial.hash);
  assert.equal((await resolve(updated)).status, 200);
  assert.equal(requests.get('/version.map'), 2, 'external maps invalidated with script/decoded caches');
});

test('Next stable chunks refresh eval indexes and maps through HTTP and compare current disk hashes', async t => {
  const { SourceMapStore } = await import('../overlay/src/sourcemap.js');
  const { createHash } = await import('node:crypto');
  const root = await project(t), requests = [];
  const updated = source.replace('Nested</span>', 'Updated</span>');
  const moduleURL = 'webpack-internal:///(app-pages-browser)/./src/App.jsx';
  const chunk = '/_next/static/chunks/app/page.js', external = '/_next/static/chunks/app/page.map';
  let changed = false;
  const map = text => ({ version: 3, sources: ['webpack://_N_E/./src/App.jsx'], sourcesContent: [text], names: [], mappings: 'AAGS' });
  const plugin = { name: 'next-stable-chunks', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, 'http://fixture');
      if (!url.pathname.startsWith('/_next/static/')) return next();
      requests.push({ path: url.pathname, version: url.searchParams.get('__plumb_version'), cache: req.headers['cache-control'] });
      const content = changed && url.searchParams.has('__plumb_version') ? updated : source;
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'application/json');
      if (url.pathname === chunk) {
        const body = '//# sourceMappingURL=page.map\n//# sourceURL=' + moduleURL;
        return res.end('eval(__webpack_require__.ts(' + JSON.stringify(body) + '))');
      }
      if (url.pathname === external) return res.end(JSON.stringify(map(content)));
      if (url.pathname.endsWith('/direct.js')) return res.end('//# sourceMappingURL=data:application/json;base64,' + Buffer.from(JSON.stringify(map(content))).toString('base64'));
      if (url.pathname.endsWith('/no-query.js')) {
        if (url.search) { res.statusCode = 400; return res.end('Queries unsupported'); }
        return res.end('//# sourceMappingURL=data:application/json;base64,' + Buffer.from(JSON.stringify(map(changed ? updated : source))).toString('base64'));
      }
      if (url.pathname.endsWith('/no-map.js')) return res.end('export const plain = true;');
      res.statusCode = 404; res.end('Missing script');
    });
  } };
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plugin, unstamped({ watch: false })], logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`, store = new SourceMapStore();
  await ready(url);
  const locate = () => store.mapFrame(moduleURL, 1, 1, [url + chunk]);
  const resolve = mapped => fetch(url + '/__plumb/resolve?' + new URLSearchParams({ ...mapped, tag: 'span' }));
  const initial = await locate(); assert.ok(initial?.hash);
  assert.deepEqual(await (await resolve(initial)).json(), { file: 'src/App.jsx', ...position('<span') });
  changed = true; await writeFile(join(root, 'src/App.jsx'), updated);
  assert.equal((await resolve(initial)).status, 400, 'pre-edit sourcesContent never resolves after save');
  const snapshot = await (await fetch(url + '/__plumb/resolve?' + new URLSearchParams({ source: moduleURL, snapshot: '1' }))).json();
  assert.equal(snapshot.hash, createHash('sha256').update(await readFile(join(root, 'src/App.jsx'))).digest('hex'));
  assert.notEqual(snapshot.hash, initial.hash);
  store.invalidate();
  const fresh = await locate(); assert.equal(fresh?.hash, snapshot.hash);
  assert.deepEqual(await (await resolve(fresh)).json(), { file: 'src/App.jsx', ...position('<span') });
  assert.deepEqual(await locate(), fresh, 'warm fresh lookup stays cached');
  for (const path of [chunk, external]) {
    const loads = requests.filter(request => request.path === path);
    assert.equal(loads.length, 2, path); assert.ok(loads[1].version, path + ': version-busted');
    assert.equal(loads[1].cache, 'no-cache', path + ': no-store reaches HTTP');
  }
  assert.equal((await store.mapFrame(url + '/_next/static/direct.js', 1, 1))?.hash, snapshot.hash, 'Turbopack-style direct chunk refreshes too');
  assert.equal((await store.mapFrame(url + '/_next/static/no-query.js', 1, 1))?.hash, snapshot.hash, 'query-refusing host retries with no-store');
  const explain = name => store.mapFrame(url + '/_next/static/' + name, 1, 1, [], () => false, { explain: true });
  const missing = await explain('missing.js');
  assert.equal(missing.location, null); assert.equal(missing.reason, 'script-fetch'); assert.equal(missing.detail.status, 404);
  const noMap = await explain('no-map.js'); assert.equal(noMap.reason, 'map'); assert.equal(noMap.detail.step, 'missing-source-mapping-url');
});

test('review 5: target requests stat bounded dependencies without watchers; report/decisions retain full reconciliation', async t => {
  const root = await project(t);
  await Promise.all(Array.from({ length: 240 }, (_, i) => writeFile(join(root, `src/Unrelated${i}.jsx`), `export const A${i} = () => <div className="gap-[17px]" />;`)));
  await writeFile(join(root, 'src/Producer.jsx'), 'export const size = "gap-[13px]";');
  await writeFile(join(root, 'src/Consumer.jsx'), 'import { size } from "./Producer"; export const C = () => <div className={size} />;');
  const session = await EngineSession.create({ root, watch: false }); t.after(() => session.close());
  const { default: fs } = await import('node:fs/promises');
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs.lstat, originalRead = fs.readFile; let stats = [], reads = [];
  fs.lstat = (path, ...args) => { stats.push(String(path)); return original(path, ...args); };
  fs.readFile = (path, ...args) => { reads.push(String(path)); return originalRead(path, ...args); };
  syncBuiltinESMExports();
  t.after(() => { fs.lstat = original; fs.readFile = originalRead; syncBuiltinESMExports(); });
  const bounded = async (run, limit = 20) => {
    stats = []; reads = []; const result = await run();
    assert.ok(stats.length < limit, `target stat count ${stats.length}`);
    assert.ok(!stats.some(path => /Unrelated\d/.test(path)), 'unrelated files never statted by target read');
    return result;
  };
  await bounded(() => session.resolveSource('src/App.jsx', 4, 10));
  await bounded(() => session.resolveSource('src/App.jsx', 4, 10));
  assert.ok(!reads.includes(join(root, 'src/App.jsx')), 'unchanged resolve reuses snapshot/AST');
  await bounded(() => session.site('src/App.jsx', 4, 10));
  const edits = await bounded(() => session.edits('src/App.jsx', 4, 10)); assert.ok(edits.edits.length);
  await bounded(() => session.apply({ file: 'src/App.jsx', hash: edits.hash, edits: [{ id: edits.edits[0].id }] }), 64); // Includes repeated target reconciliation and anti-alias checks.
  await writeFile(join(root, 'src/Producer.jsx'), 'export const size = "gap-[19px]";');
  const consumer = await bounded(() => session.site('src/Consumer.jsx', 1));
  assert.ok(consumer.declarations.some(d => d.site.text === 'gap-[19px]'), 'producer edits visible without callbacks');
  await writeFile(join(root, 'src/New.jsx'), 'export const New = () => <div className="gap-[37px]" />;');
  assert.deepEqual(await session.resolveSource('src/New.jsx', 1, 26), { file: 'src/New.jsx', line: 1, column: 26 });
  await rm(join(root, 'src/New.jsx'));
  assert.deepEqual(await session.resolveSource('src/New.jsx'), { library: true, untracked: 'src/New.jsx' });
  stats = []; await session.decisions(); assert.ok(stats.some(path => path.endsWith('Unrelated239.jsx')));
  await writeFile(join(root, 'src/Unrelated239.jsx'), 'export const Other = () => <div className="gap-[71px]" />;');
  const report = await session.report(); assert.ok(report.declarations.some(d => d.site.text === 'gap-[71px]'));
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

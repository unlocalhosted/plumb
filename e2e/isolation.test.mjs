// Cross-origin isolation and worker failure must preserve authored source evidence.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { overlayModules } from '../dist/hosts/client.js';
import { createWebHandler } from '../dist/session/server.js';
import { mapFrame, invalidateSourceMaps } from '../overlay/src/sourcemap.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import React from 'react';
export default function App() {
  return <main><button id="first" className="gap-[13px]">First</button><button id="second" className="gap-[17px]">Second</button></main>;
}
`;
async function fixture(t, policy, blocked = '') {
  const root = await mkdtemp(join(repo, 'fixtures/.isolation-'));
  let server;
  t.after(async () => { try { await server?.close(); } finally { await rm(root, { recursive: true, force: true }); } });
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'src/App.tsx'));
  await writeFile(join(root, 'src/App.jsx'), source);
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  await writeFile(join(root, 'index.html'), '<html><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await writeFile(join(root, 'src/entry.jsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App />);
`);
  const requests = new Map();
  const maps = { name: 'isolation-maps', configureServer(host) {
    host.middlewares.use((request, response, next) => {
      const path = new URL(request.url, 'http://fixture').pathname;
      if (blocked === 'error' && path === '/__plumb/src/sourcemap-worker.js') {
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        return response.end('throw new Error("fixture worker failed");');
      }
      if (!path.startsWith('/maps/')) return next();
      requests.set(path, (requests.get(path) ?? 0) + 1);
      response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'application/json');
      // Lazy sections/rows and long rows exercise the yielding decoder over HTTP.
      const map = { version: 3, sources: ['/src/App.jsx'], sourcesContent: [source], names: [], mappings: 'AAES,' + 'CAAA,'.repeat(150000).slice(0, -1) + ';AAAA' };
      const body = path.endsWith('.js') ? '//# sourceMappingURL=shared.map' : path === '/maps/shared.map'
        ? JSON.stringify({ version: 3, sections: [{ offset: { line: 0, column: 0 }, map }, { offset: { line: 10, column: 0 }, url: 'unselected.map' }] }) : '{}';
      setTimeout(() => response.end(body), 30);
    });
  } };
  // Deliberately unstamped host: exercise owner-stack fallback; stamp.test.mjs covers dev stamps.
  server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [maps, plumb({ watch: false, stamp: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    // These tests never edit source. Without a watcher, macOS's late report of the fixture's own writes (fs.watch
    // delivers a modification made just before a file is watched) cannot reload the page mid-test.
    logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0, headers: {
      'Cross-Origin-Embedder-Policy': policy, 'Cross-Origin-Opener-Policy': 'same-origin',
      ...(blocked === 'csp' ? { 'Content-Security-Policy': "worker-src 'none'" } : {}),
    } } });
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}`, requests };
}
async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close()); return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
for (const policy of ['credentialless', 'require-corp']) {
  test(`isolation ${policy}: Vite and Fetch transports serve compatible overlay headers`, async t => {
    const { url } = await fixture(t, policy);
    const pending = new Promise(() => {});
    const web = createWebHandler(pending, { client: true, token: 'fixture' });
    for (const module of overlayModules) {
      for (const response of [await fetch(url + '/__plumb/' + module), await web(new Request(url + '/__plumb/' + module))]) {
        assert.equal(response.status, 200, module);
        assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin', module);
        assert.equal(response.headers.get('Cross-Origin-Embedder-Policy'), 'require-corp', module);
      }
    }
    for (const response of [await fetch(url + '/__plumb/health'), await web(new Request(url + '/__plumb/health')),
      await web(new Request(url + '/__plumb/site', { headers: { 'x-plumb-token': 'fixture' } }))]) {
      assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
      await response.json();
    }
  });
}

test('concurrent map callers share HTTP evidence; abort and invalidation leave independent callers intact', async t => {
  const { url, requests } = await fixture(t, 'credentialless');
  for (let attempt = 0; ; attempt++) {
    const health = await (await fetch(url + '/__plumb/health')).json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready'); break; }
    assert.ok(attempt < 1500, 'Session did not become ready'); await delay(20);
  }
  const script = url + '/maps/shared.js';
  invalidateSourceMaps();
  const controller = new AbortController();
  const abandoned = mapFrame(script, 1, 1, { signal: controller.signal, explain: true });
  const retained = mapFrame(script, 1, 1);
  const otherRow = mapFrame(script, 2, 1);
  controller.abort();
  assert.equal((await abandoned).detail.step, 'cancelled');
  const [first, second] = await Promise.all([retained, otherRow]);
  assert.ok(first?.hash); assert.deepEqual(second, first);
  assert.equal(requests.get('/maps/shared.js'), 1);
  assert.equal(requests.get('/maps/shared.map'), 1);
  assert.equal(requests.get('/maps/unselected.map'), undefined);
  const resolved = await (await fetch(url + '/__plumb/resolve?' + new URLSearchParams({ ...first, tag: 'main' }))).json();
  assert.deepEqual(resolved, { file: 'src/App.jsx', line: 3, column: 10 });
  const discarded = mapFrame(url + '/maps/discarded.js', 1, 1, { explain: true });
  invalidateSourceMaps();
  assert.equal((await discarded).detail.step, 'invalidated');
  assert.ok(await mapFrame(script, 1, 1));
});

for (const [policy, blocked] of [['credentialless', ''], ['require-corp', ''], ['credentialless', 'csp'],
  ['require-corp', 'error'], ['credentialless', 'throw'], ['credentialless', 'unavailable']]) {
  test(`isolation ${policy}${blocked ? ' ' + blocked : ''}: concurrent locates preserve authored evidence`, { timeout: 90000 }, async t => {
    const launched = await browser(t); if (!launched) return;
    const { url, requests } = await fixture(t, policy, blocked);
    const page = await launched.newPage();
    const errors = []; page.on('pageerror', error => {
      if (blocked !== 'error' || error.message !== 'fixture worker failed') errors.push(error.message);
    });
    if (blocked === 'throw' || blocked === 'unavailable') await page.addInitScript(mode => {
      if (mode === 'unavailable') window.Worker = undefined;
      else window.Worker = class { constructor() { throw new DOMException('fixture CSP', 'SecurityError'); } };
    }, blocked);
    await page.goto(url);
    await page.waitForFunction(() => window.__plumb && document.getElementById('second'));
    assert.equal((await page.evaluate(() => window.__plumb.ready())).status, 'ready');
    assert.equal(await page.evaluate(() => crossOriginIsolated), true);
    const locations = await page.evaluate(async () => {
      const first = document.getElementById('first'), second = document.getElementById('second');
      const controller = new AbortController();
      const abandoned = window.__plumb.locate(first, { explain: true, signal: controller.signal });
      const retained = window.__plumb.locate(first, { explain: true });
      const independent = window.__plumb.locate(second, { explain: true });
      controller.abort();
      return Promise.all([abandoned, retained, independent]);
    });
    assert.deepEqual(locations[0], { location: null, reason: 'map', detail: { step: 'cancelled' } });
    for (const [i, location] of locations.slice(1).entries()) {
      const offset = source.indexOf('<button id="' + ['first', 'second'][i] + '"');
      const link = { file: 'src/App.jsx', line: 3, column: offset - source.lastIndexOf('\n', offset), component: 'App' };
      assert.deepEqual(location, { ...link, tag: 'button', via: 'owner-stack', chain: [link], index: 0 });
    }
    assert.notEqual(locations[1].column, locations[2].column);
    const decoded = await page.evaluate(async () => {
      const maps = await import('/__plumb/src/sourcemap.js');
      const script = location.origin + '/maps/shared.js', controller = new AbortController();
      const abandoned = maps.mapFrame(script, 1, 1, { signal: controller.signal, explain: true });
      const retained = maps.mapFrame(script, 1, 1, { explain: true });
      const row = maps.mapFrame(script, 2, 1, { explain: true });
      controller.abort();
      return Promise.all([abandoned, retained, row]);
    });
    assert.equal(decoded[0].detail.step, 'cancelled');
    assert.ok(decoded[1].location?.hash); assert.deepEqual(decoded[1], decoded[2]);
    assert.equal(requests.get('/maps/shared.js'), 1); assert.equal(requests.get('/maps/shared.map'), 1);
    assert.equal(requests.get('/maps/unselected.map'), undefined);
    const repeated = await page.$eval('#first', element => window.__plumb.locate(element, { explain: true }));
    assert.deepEqual(repeated, locations[1], 'owner chain remains stable when workers are blocked');
    // Keep every source write in Node: HMR can replace the document immediately.
    const query = new URLSearchParams({ file: locations[1].file, line: locations[1].line, column: locations[1].column });
    const edits = await (await fetch(url + '/__plumb/edits?' + query)).json();
    const edit = edits.edits.find(edit => edit.from === 'gap-[13px]'); assert.ok(edit);
    const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: locations[1].file, hash: edits.hash, edits: [{ id: edit.id }] }) });
    assert.equal(applied.status, 200, await applied.text());
    assert.deepEqual(errors, []);
  });
}

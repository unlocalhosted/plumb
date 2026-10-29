import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const board = version => `'use client';
export default function Board() {
  return <ul id="board">{Array.from({ length: 216 }, (_, n) => <li key={n} className="card" style={{ paddingInline: '13px' }}>Issue {n} ${version}</li>)}</ul>;
}\n`;
const stable = `'use client'; export default function Stable() { return <header id="stable" style={{ padding: '13px' }}>Relay</header>; }`;
async function host(t, kind) {
  const root = await mkdtemp(join(repo, 'fixtures/.blueprint-speed-'));
  let stop = async () => {};
  t.after(async () => { await stop(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  await mkdir(join(root, 'app'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { next: '^16.4.0', react: '^19.3.0', 'react-dom': '^19.3.0' } }));
  await writeFile(join(root, 'app/Board.jsx'), board('before'));
  await writeFile(join(root, 'app/Stable.jsx'), stable);
  await writeFile(join(root, 'app/styles.css'), ':root { --space-3: 12px; --space-4: 16px; } body { margin: 8px; } ul { display: grid; grid-template-columns: repeat(4, 1fr); list-style: none; margin: 0; padding: 0; } .card { box-sizing: border-box; height: 12px; font-size: 8px; }');
  await writeFile(join(root, 'plumber.config.mjs'), "export default { css: 'app/styles.css', source: ['app/**'], decisions: { spacing: { from: 'css:app/styles.css' } } };\n");
  await writeFile(join(root, 'app/page.jsx'), "'use client'; import Board from './Board.jsx'; import Stable from './Stable.jsx'; export default function App() { return <main><Stable /><Board /></main>; }\n");
  if (kind === 'vite') {
    await writeFile(join(root, 'index.html'), '<div id="root"></div><script type="module" src="/app/entry.jsx"></script>');
    await writeFile(join(root, 'app/entry.jsx'), "import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './page.jsx'; import './styles.css'; createRoot(document.getElementById('root')).render(<App />);");
    const server = await createServer({ root, configFile: false, plugins: [plumb({ watch: false })], oxc: { jsx: { runtime: 'automatic', development: true } }, resolve: { dedupe: ['react', 'react-dom'] }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: null } });
    stop = () => server.close(); await server.listen(); return { root, url: `http://127.0.0.1:${server.httpServer.address().port}` };
  }
  await mkdir(join(root, 'node_modules/@unlocalhosted'), { recursive: true });
  await symlink(repo, join(root, 'node_modules/@unlocalhosted/react-plumber'));
  const route = join(root, 'app/%5F_plumb/[...path]'); await mkdir(route, { recursive: true });
  await writeFile(join(route, 'route.plumb.ts'), "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next'; export const runtime = 'nodejs'; export const { GET, POST } = createPlumbRoute({ watch: false });");
  await writeFile(join(root, 'app/layout.jsx'), "import { PlumbOverlay } from '@unlocalhosted/react-plumber/next'; import './styles.css'; export default function Layout({ children }) { return <html><body>{children}<PlumbOverlay /></body></html>; }");
  await writeFile(join(root, 'next.config.mjs'), `import { withPlumb } from '@unlocalhosted/react-plumber/next/config'; export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(repo)} } });`);
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
  const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const done = once(child, 'exit'); let logs = '';
  child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
  stop = async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await done; } };
  for (let i = 0; i < 600; i++) { assert.equal(child.exitCode, null, logs); const url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (/Ready in/.test(logs) && url) return { root, url }; await delay(50); }
  assert.fail(logs);
}
function traffic(page) {
  const requests = [];
  page.on('request', request => requests.push({ url: request.url(), request }));
  return requests;
}
function counts(requests) {
  const assets = requests.filter(({ url }) => /\.(?:js|jsx|map)(?:\?|$)/.test(url) && !url.includes('/__plumb/'));
  return { traces: requests.filter(r => r.url.endsWith('/__nextjs_original-stack-frames')).map(r => r.request.postDataJSON()), assets: Object.fromEntries([...new Set(assets.map(r => r.url))].map(url => [url, assets.filter(r => r.url === url).length])), batches: requests.filter(r => r.url.endsWith('/__plumb/batch')).length };
}
async function sweep(page, requests) {
  requests.length = 0;
  const start = performance.now(); await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.total > 200 && p.read === p.total; }, null, { timeout: 60000 });
  const elapsedMs = performance.now() - start;
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit').length === window.__plumb.overlay.progress.drift);
  const reading = await page.evaluate(() => ({ progress: window.__plumb.overlay.progress, labels: [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map(el => el.getAttribute('aria-label')).sort() }));
  return { elapsedMs, ...reading, ...counts(requests) };
}
test('Next unstamped 216-card blueprint shares module reads, batches waves and isolates HMR', { timeout: 180000 }, async t => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM }); t.after(() => browser.close());
  const results = {};
  for (const kind of ['vite', 'next']) {
    const { root, url } = await host(t, kind);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(url); await page.waitForFunction(() => window.__plumb && document.querySelectorAll('.card').length === 216); await page.evaluate(() => window.__plumb.ready());
    if (kind === 'next') assert.equal(await page.locator('[data-plumb-source]').count(), 0);
    const requests = traffic(page);
    results[kind] = await sweep(page, requests);
    assert.ok(results[kind].progress.checked >= 216, JSON.stringify(results[kind]));
    assert.equal(results[kind].progress.drift, 217);
    if (kind === 'next') {
      assert.deepEqual(results.next.labels, results.vite.labels, 'same readings and label multiplicity as stamped source');
      // Each card also agrees with its authored site, rather than merely both hosts agreeing on a wrong count.
      const locations = await page.evaluate(() => Promise.all([...document.querySelectorAll('.card')].map(el => window.__plumb.locate(el, { batch: true }))));
      assert.ok(locations.every(at => at?.file === 'app/Board.jsx' && at.line === 3 && at.column === 64), JSON.stringify(locations.slice(0, 3)));
      if (!process.env.PLUMB_SPEED_BASELINE) {
        assert.ok(results.next.elapsedMs <= Math.max(results.vite.elapsedMs * 2, 500), JSON.stringify({ viteMs: results.vite.elapsedMs, nextMs: results.next.elapsedMs }));
        assert.ok(results.next.batches <= 8, JSON.stringify({ batches: results.next.batches }));
        for (const [url, count] of Object.entries(results.next.assets)) assert.equal(count, 1, 'one chunk/map fetch per version: ' + url);
      }
      await page.keyboard.press('Alt+B');
      requests.length = 0;
      results.hmr = [];
      for (const [version, extra] of [['after', ''], ['again', '\n\n']]) {
        requests.length = 0;
        await writeFile(join(root, 'app/Board.jsx'), board(version).replace('export default', extra + 'export default'));
        await page.waitForFunction(version => document.querySelector('.card')?.textContent.includes(version), version, { timeout: 30000 });
        const after = await page.evaluate(async () => ({
          cards: await Promise.all([...document.querySelectorAll('.card')].map(el => window.__plumb.locate(el, { explain: true, batch: true }))),
          stable: await window.__plumb.locate(document.querySelector('#stable'), { explain: true }),
        }));
        assert.ok(after.cards.every(at => at.file === 'app/Board.jsx' && at.line === (extra ? 5 : 3) && at.column === 64), JSON.stringify(after.cards.slice(0, 3)));
        assert.equal(after.stable.file, 'app/Stable.jsx', JSON.stringify(after.stable));
        const hmr = counts(requests); results.hmr.push({ ...hmr, card: after.cards[0], stable: after.stable });
        if (!process.env.PLUMB_SPEED_BASELINE) {
          const reads = Object.keys(hmr.assets).filter(url => !url.includes('.hot-update.') && !url.includes('?id='));
          assert.ok(reads.every(url => !Object.keys(results.next.assets).includes(url)), 'unchanged module assets must stay cached: ' + JSON.stringify(hmr));
          assert.ok(hmr.traces.length === 1, 'changed module traced once with all frames: ' + JSON.stringify(hmr));
          for (const trace of hmr.traces) assert.ok(trace.frames.every(frame => frame.file.includes('Board.jsx')), 'only changed module is retraced');
        }
      }
    }
    await page.close();
  }
  if (process.env.PLUMB_SPEED_OUTPUT) await writeFile(process.env.PLUMB_SPEED_OUTPUT, JSON.stringify(results, null, 2));
  t.diagnostic(JSON.stringify(Object.fromEntries(Object.entries(results).map(([key, value]) => [key, Array.isArray(value) ? value.map(item => ({ traces: item.traces.length, frames: item.traces.flatMap(trace => trace.frames).length, assets: item.assets, batches: item.batches, card: item.card })) : { elapsedMs: value.elapsedMs, progress: value.progress, assets: value.assets, batches: value.batches }]))));
});

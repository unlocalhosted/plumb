import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';
import { fingerprint } from '../bench/apps/frozen.mjs';
import { writeGate, writeInteraction, restoreWrite } from '../bench/apps/write.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('frozen overlay Write proves exact source, automatic reload, current reading, CLI and original integrity', { timeout: 90_000 }, async t => {
  const temporary = join(repo, 'fixtures/.verify-frozen');
  await mkdir(temporary, { recursive: true });
  const scratch = await mkdtemp(join(temporary, 'write-e2e-'));
  const original = join(scratch, 'original'), root = join(scratch, 'source');
  await mkdir(join(original, 'src'), { recursive: true });
  await writeFile(join(original, 'package.json'), '{"type":"module"}');
  await writeFile(join(original, 'index.html'), `<div id="root"></div><script type="module">
    import React from 'react'; import { createRoot } from 'react-dom/client'; import { App } from '/src/App.jsx';
    createRoot(document.getElementById('root')).render(React.createElement(App));</script>`);
  await writeFile(join(original, 'src/App.jsx'), `import './styles.css';
    export function App() { return <div id="target" className="flex gap-[9px]"><span>A</span><span>B</span></div>; }\n`);
  await writeFile(join(original, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing-s2: 8px; }');
  await writeFile(join(original, 'plumb.config.ts'), "export default { source: ['src/**/*.jsx'], css: 'src/styles.css' };");
  await cp(original, root, { recursive: true });
  const originalBefore = await fingerprint([original]), copyBefore = await fingerprint([root]);
  const priorTemp = process.env.TMPDIR;
  const priorCache = process.env.PLUMB_CACHE_DIR;
  process.env.TMPDIR = scratch;
  process.env.PLUMB_CACHE_DIR = join(scratch, 'plumb');
  let server, browser, written;
  t.after(async () => {
    await browser?.close(); await server?.close();
    if (priorTemp === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = priorTemp;
    if (priorCache === undefined) delete process.env.PLUMB_CACHE_DIR; else process.env.PLUMB_CACHE_DIR = priorCache;
    await rm(scratch, { recursive: true, force: true });
  });
  server = await createServer({ root, cacheDir: join(scratch, 'vite'), configFile: false,
    plugins: [tailwindcss(), plumb({ root, watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLUMB_CHROMIUM });
  const context = await browser.newContext();
  const failures = [], gate = writeGate(origin, failures);
  await context.route('**/__plumb/**', route => gate.route(route));
  const page = await context.newPage();
  let injectedBusy = false;
  await page.route('**/__plumb/**', route => {
    if (gate.consumed === 1 && !injectedBusy && new URL(route.request().url()).pathname === '/__plumb/edits') {
      injectedBusy = true;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'busy' }) });
    }
    return route.fallback();
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const row = await page.evaluate(async () => {
    const element = document.querySelector('#target');
    window.__plumbVerification = { elements: [element] };
    return { i: 0, reading: await window.__plumb.overlay.read(element, true) };
  });
  const app = { root, app: root };
  const result = await writeInteraction(page, [row], app, scratch, gate, write => { written = write; });
  assert.equal(result.status, 'passed', result.error ?? result.note);
  assert.equal(result.from, 'gap-[9px]'); assert.equal(result.to, 'gap-s2');
  assert.equal(result.changesStyle, true); assert.deepEqual(result.current.values, ['8px']);
  assert.equal(gate.consumed, 1); assert.deepEqual(failures, []);
  assert.equal(injectedBusy, true);
  assert.equal(result.busyReads.length, 1); assert.equal(result.busyReads[0].recovered, true);
  assert.equal(await fingerprint([original]), originalBefore);
  assert.ok((await readFile(join(root, 'src/App.jsx'), 'utf8')).includes('gap-s2'));
  await browser.close(); browser = undefined;
  await server.close(); server = undefined;
  await restoreWrite(written);
  assert.equal(await fingerprint([root]), copyBefore, 'Whole-copy guard passes only after the proven edit is restored');
});

// Blueprint opened the moment the page is ready, before the app has mounted (a resume after Apply reopens it 120 ms
// after a reload): the nearly empty page must never count as done, and the panel must never give an all-clear
// for it. Real Vite, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const late = `import { useEffect, useState } from 'react';
import { App } from './App.jsx';
export function Late() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 500); return () => clearTimeout(t); }, []);
  return mounted ? <App /> : null;
}
`;

test('Blueprint opened before the app mounts is never done, and never says there is nothing to fix', { timeout: 120000 }, async t => {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.late-mount-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/Late.jsx'), late);
  const entry = await readFile(join(root, 'src/entry.jsx'), 'utf8');
  await writeFile(join(root, 'src/entry.jsx'), entry.replace(/import \{ App \} from '\.\/App(?:\.jsx)?';?/, "import { Late as App } from './Late.jsx';"));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 800 } });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  // what the reader says and what the panel says, sampled from the moment Blueprint opens, with when the app mounted
  await page.evaluate(() => {
    window.__samples = []; window.__panel = []; window.__mountedAt = null;
    const shadow = document.querySelector('plumb-overlay').shadowRoot;
    new MutationObserver(() => { if (!window.__mountedAt && document.getElementById('root').children.length) window.__mountedAt = performance.now(); }).observe(document.getElementById('root'), { childList: true, subtree: true });
    new MutationObserver(() => { const fx = shadow.querySelector('.fx'); const text = fx?.innerText ?? ''; if (text !== window.__panel.at(-1)?.text) window.__panel.push({ t: performance.now(), text }); }).observe(shadow, { childList: true, subtree: true, characterData: true });
    window.__timer = setInterval(() => { const p = window.__plumb.overlay.progress; if (p) window.__samples.push({ t: performance.now(), done: p.done, total: p.total, drift: p.drift }); }, 25);
  });
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => window.__mountedAt && window.__plumb.overlay.progress?.done === true && window.__plumb.overlay.progress.total > 1, null, { timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 400));
  const { samples, panel, mountedAt } = await page.evaluate(() => { clearInterval(window.__timer); return { samples: window.__samples, panel: window.__panel, mountedAt: window.__mountedAt }; });
  const early = samples.filter(s => s.t < mountedAt);
  assert.ok(early.length > 3, `sampled before the app mounted: ${JSON.stringify(early)}`);
  assert.deepEqual(early.filter(s => s.done), [], 'never done before the app mounted');
  assert.ok(!panel.some(p => p.t < mountedAt + 300 && /nothing to fix|everything matches/i.test(p.text)), JSON.stringify(panel));
  const last = samples.at(-1);
  assert.ok(last.done && last.total > 1 && last.drift > 0, JSON.stringify(last));
  t.diagnostic(JSON.stringify({ mountedAt: Math.round(mountedAt), firstDone: Math.round(samples.find(s => s.done)?.t ?? -1), last }));
});

// Blueprint's count is a function of the page's source, not of the viewport or the clock
// (docs/briefs/deterministic-detection.md). One tall page, read under every condition that used to change the
// numbers: first opening, reopening, scrolled to the bottom, a short and a tall window, a window too small to show
// anything, and after an edit that is reverted. The same problems, the same fix list, every time.
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
const rows = (n, cls) => Array.from({ length: n }, (_, i) => `      <li id="row-${cls}-${i}" className="${cls}">${i}</li>`).join('\n');
const tall = `import { Badge } from './Badge';
export function Tall() {
  return <main className="p-[13px]">
    <ul className="gap-[7px]">
${rows(40, 'px-[9px] mt-[11px]')}
    </ul>
    <ul>
${rows(30, 'rounded-[5px] text-[15px]')}
    </ul>
    <Badge className="tracking-[0.1em]">pass-through</Badge>
    <Badge className="tracking-[0.2em]">pass-through too</Badge>
  </main>;
}
`;
const badge = `export function Badge({ className, children }) { return <span className={className}>{children}</span>; }\n`;

async function site(t) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.determinism-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/Tall.jsx'), tall);
  await writeFile(join(root, 'src/Badge.jsx'), badge);
  // the demo's entry mounts its App; this page mounts the tall one instead
  const entry = await readFile(join(root, 'src/entry.jsx'), 'utf8');
  await writeFile(join(root, 'src/entry.jsx'), entry.replace(/import \{ App \} from '\.\/App(?:\.jsx)?';?/, "import { Tall as App } from './Tall.jsx';"));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } } });
  t.after(() => server.close());
  await server.listen();
  return { browser, root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

// one opening: Alt+B, wait until the whole page is read, take the numbers and the fix list, Alt+B off
async function opening(page) {
  await page.keyboard.press('Alt+B');
  try { await page.waitForFunction(() => { const p = window.__plumb?.overlay?.progress; return p?.done === true && p.total > 0; }, null, { timeout: 60000 }); }
  catch (error) { throw new Error(`${error.message}\nprogress: ${JSON.stringify(await page.evaluate(() => window.__plumb.overlay.progress))}`); }
  await new Promise((resolve) => setTimeout(resolve, 300)); // the theme's decisions arrive late and judge again
  const result = await page.evaluate(() => {
    const p = window.__plumb.overlay.progress;
    const items = window.__plumb.overlay.blueprintReader.items;
    const fixes = items.flatMap((i) => i.marks.filter((m) => m.family !== 'craft' && m.ledger === 'new').map((m) => `${m.rule} ${m.text} ${m.file}:${m.line}:${m.column}`)).sort();
    return { problems: p.drift, fixes, notes: p.notes, total: p.total, read: p.read, list: [...new Set(fixes)] };
  });
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden !== false);
  return result;
}
async function fresh(browser, url, viewport) {
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors };
}

test('the same page gives the same problems, fixes and notes under every viewport, scroll, visibility and after a reverted edit', { timeout: 300000 }, async (t) => {
  const s = await site(t); if (!s) return;
  const runs = {};
  const { page, errors } = await fresh(s.browser, s.url, { width: 1200, height: 800 });
  runs.first = await opening(page);
  assert.ok(runs.first.problems > 100, JSON.stringify(runs.first));
  assert.equal(runs.first.read, runs.first.total);
  runs.reopen = await opening(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  runs.scrolledToBottom = await opening(page);
  await page.setViewportSize({ width: 1200, height: 400 });
  runs.short = await opening(page);
  await page.setViewportSize({ width: 1200, height: 1200 });
  runs.tallWindow = await opening(page);
  // no frames: a window too small to show the page, never scrolled, with the document hidden to the page's eyes
  const { page: hidden } = await fresh(s.browser, s.url, { width: 320, height: 120 });
  await hidden.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  runs.hidden = await opening(hidden);
  // an edit, then its revert: the page is read again and lands on the same numbers
  const file = join(s.root, 'src/Tall.jsx');
  let loads = 0; page.on('load', () => loads++);
  const shows = async (text) => {
    try { await page.waitForFunction((text) => document.querySelector('[id^="row-rounded"]')?.className.includes(text), text, { timeout: 30000 }); }
    catch (error) { throw new Error(`${error.message}\nrows: ${await page.evaluate(() => document.querySelector('[id^="row-rounded"]')?.className ?? document.body.innerHTML.slice(0, 300))}\nloads: ${loads}`); }
    // a reload mounts the overlay anew
    await page.waitForFunction(() => window.__plumb?.overlay);
    await page.evaluate(() => window.__plumb.ready());
  };
  await writeFile(file, tall.replaceAll('className="rounded-[5px] text-[15px]"', 'className="rounded-[5px] text-[17px]"'));
  await shows('text-[17px]');
  await writeFile(file, tall);
  await shows('text-[15px]');
  runs.afterRevertedEdit = await opening(page);
  for (const [name, run] of Object.entries(runs)) {
    assert.deepEqual({ problems: run.problems, notes: run.notes, fixes: run.list }, { problems: runs.first.problems, notes: runs.first.notes, fixes: runs.first.list }, name);
    assert.equal(run.read, run.total, name);
  }
  // every row is a place: the forty and the thirty, read whether or not they were ever in view
  assert.ok(runs.first.list.filter((f) => f.includes('px-[9px]')).length >= 1 && runs.first.problems >= 70 * 2 + 2, JSON.stringify(runs.first));
  assert.deepEqual(errors, []);
  t.diagnostic(JSON.stringify(Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, { problems: v.problems, notes: v.notes, total: v.total }]))));
});

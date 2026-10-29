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
const tall = `import { useEffect, useRef, useState } from 'react';
import { Badge } from './Badge';
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
    <Row n={0} /><Row n={1} /><Row n={2} /><Row n={3} /><Row n={4} /><Row n={5} /><Row n={6} /><Row n={7} />
    <Lazy />
  </main>;
}
// one place in the source, rendered many times
export function Row({ n }) { return <p id={'repeat-' + n} className="leading-[1.02] pb-[3px]">{n}</p>; }
// a section that mounts only once it has been scrolled into view
export function Lazy() {
  const [shown, setShown] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setShown(true); }); io.observe(ref.current); return () => io.disconnect(); }, []);
  return <section ref={ref} id="lazy" style={{ minHeight: 40 }}>{shown ? <Below /> : null}</section>;
}
export function Below() { return <ul>{[0, 1, 2].map((n) => <li key={n} id={'below-' + n} className="mb-[21px] rounded-[9px]">{n}</li>)}</ul>; }
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
    const fixes = window.__plumb.overlay.places.filter((m) => m.ledger === 'new').map((m) => `${m.rule} ${m.text} ${m.file}:${m.line}:${m.column}`).sort();
    return { problems: p.drift, fixes, notes: p.notes, total: p.total, read: p.read, places: p.places, unrendered: p.unrendered, lazyMounted: !!document.getElementById('below-0'), list: [...new Set(fixes)] };
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
  assert.ok(runs.first.problems > 10 && runs.first.places >= runs.first.problems, JSON.stringify(runs.first));
  assert.equal(runs.first.read, runs.first.total);
  // the lazy section has not mounted at the top; its places are counted all the same
  assert.equal(runs.first.lazyMounted, false);
  assert.ok(runs.first.unrendered >= 2, JSON.stringify(runs.first));
  assert.ok(runs.first.list.some((f) => f.includes('mb-[21px]')) && runs.first.list.some((f) => f.includes('rounded-[9px]')), JSON.stringify(runs.first.list));
  runs.reopen = await opening(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForSelector('#below-0');
  runs.scrolledToBottom = await opening(page);
  assert.equal(runs.scrolledToBottom.lazyMounted, true);
  assert.equal(runs.scrolledToBottom.unrendered, runs.first.unrendered - 2, 'the mounted section’s places are now rendered');
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
    // the same places and problems whether the lazy section mounted or not; notes are per element and follow the page
    assert.deepEqual({ problems: run.problems, places: run.places, fixes: run.list }, { problems: runs.first.problems, places: runs.first.places, fixes: runs.first.list }, name);
    assert.equal(run.read, run.total, name);
  }
  // a place is a site in the source, however many elements render it: eight Rows are two places, forty rows two
  assert.equal(runs.first.list.filter((f) => f.includes('leading-[1.02]')).length, 1);
  assert.equal(runs.first.list.filter((f) => f.includes('px-[9px]')).length, 40);
  assert.deepEqual(errors, []);
  t.diagnostic(JSON.stringify(Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, { problems: v.problems, notes: v.notes, total: v.total }]))));
});

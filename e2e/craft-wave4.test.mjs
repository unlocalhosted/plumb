// The hard rules' layer 0 (docs/craft/rules.md #48 #40 #49 #21/52 #56 #25 #33; docs/briefs/craft-hard-rules.md): each rule
// against an element that breaks it beside one that follows it, as a person sees it: a mark on the one, nothing on the
// other. Rules the browser can't judge here (no corner-shape, no optical-size axis) are skipped, not faked.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=';

async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close());
    return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}
async function fixture(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.craft4-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
async function open(t, launched, url, dpr = 1) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 2200 }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 }); // the fix panel: every element read
  return { page, errors, overlay };
}
// the craft marks of one rule, as boxes on the page
const marksOf = async (page, rule) => {
  await page.waitForTimeout(400);
  return page.evaluate((rule) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')]
    .filter((h) => h.dataset.id.includes(`:craft/${rule}`) || (h.dataset.also ?? '').split(' ').includes(`craft/${rule}`)).map((h) => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: h.getAttribute('aria-label') }; }), rule);
};
const within = (page, id, m, slack = 16) => page.evaluate(([id, m, slack]) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(), right = Math.max(r.right, r.left + el.scrollWidth); return m.x >= r.left - slack && m.x <= right + slack && m.y >= r.top - slack && m.y <= r.bottom + slack; }, [id, m, slack]);

// the page is the demo's own (open /?rules=4 in the demo app): what is proved here is what you can try there
const PAGE = await readFile(new URL('../overlay/demo/src/rules/wave4.jsx', import.meta.url), 'utf8');

const RULES = ['text-wrap-role', 'continuous-corners', 'optical-sizing', 'tinted-shadow', 'eased-scrim', 'pure-black-white', 'content-size'];

test('Wave four: each rule marks the element that breaks it and leaves the one beside it that follows it', { timeout: 240000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const can = await page.evaluate(() => ({ corners: CSS.supports('corner-shape', 'squircle') }));
  const failed = [], skipped = [];
  for (const rule of RULES) {
    const marks = await marksOf(page, rule);
    const bad = [], good = [];
    for (const m of marks) { if (await within(page, `${rule}-bad`, m, 20)) bad.push(m); if (await within(page, `${rule}-good`, m, 20)) good.push(m); }
    if (!bad.length && ((rule === 'continuous-corners' && !can.corners) || rule === 'optical-sizing')) { skipped.push(rule); continue; }
    if (!bad.length) failed.push(`${rule}: no mark on the bad one (${marks.length} marks: ${marks.map((m) => m.label).join(' | ')})`);
    if (good.length) failed.push(`${rule}: marked the good one: ${good.map((m) => m.label).join(' | ')}`);
  }
  if (skipped.length) t.diagnostic(`not judged in this browser: ${skipped.join(', ')}`);
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
});

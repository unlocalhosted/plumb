// Motion, layout, performance and counts (docs/briefs/qa-fixes.md, cause 7; docs/qa/element-card-results.md F8-01 to
// F8-05). The curve dragged is the curve written; a responsive grid's columns are read from the class that applies, and
// changed there; an entrance whose exit nothing triggers says so; a very large element opens its strip fast, its copies
// small enough to see whole; one reading of a cause never gives two counts that disagree.
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

async function open(t, edit = (s) => s) {
  let launched;
  try { launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => launched.close());
  const root = await mkdtemp(join(repo, 'fixtures/.motion-layout-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const file = join(root, 'src/App.jsx');
  await writeFile(file, edit(await readFile(file, 'utf8')));
  // dependencies found up front: a discovery mid-test would reload the page
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), card = overlay.locator('.ec');
  const alt = async (sel, at = { x: 4, y: 4 }) => {
    await page.locator(sel).scrollIntoViewIfNeeded();
    const b = await page.locator(sel).boundingBox();
    await page.keyboard.down('Alt');
    await page.mouse.move(b.x + at.x, b.y + at.y);
    await page.mouse.click(b.x + at.x, b.y + at.y);
    await page.keyboard.up('Alt');
    await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  };
  return { page, overlay, card, alt, read: () => readFile(file, 'utf8'), errors };
}
const writes = (card) => card.locator('.writes').innerText();

test('The curve dragged past the top line is the curve Writes shows (F8-01); an entrance whose exit nothing triggers says so (F8-03)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, errors } = o;
  await alt('#relative', { x: 200, y: 50 });
  await card.locator('.drill[data-open="motion"]').click();
  await overlay.locator('.ec-strip .shot[data-key="p:lift"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  const before = await writes(card);
  // the second handle, dragged 40px above the top line: it overshoots
  const h2 = await card.locator('[data-h="2"]').boundingBox(), top = await card.locator('.curve .top').boundingBox();
  await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
  await page.mouse.down();
  await page.mouse.move(h2.x + h2.width / 2, top.y - 40, { steps: 6 });
  await page.mouse.up();
  await card.locator('.curve text').filter({ hasText: 'overshoots' }).waitFor();
  await page.waitForFunction((was) => (document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .writes')?.innerText ?? was) !== was, before, { timeout: 20000 });
  const after = await writes(card);
  assert.doesNotMatch(after, /ease-in-out/, after);
  assert.match(after, /cubic-bezier\([^)]*,1\.\d+\)|cubic-bezier\([^)]*,\s*1\.\d+\)|1\.\d+\)?\]/, `the overshoot is written: ${after}`);

  // an entrance: its exit plays only when something sets data-state="closed" on the element, and nothing here does
  await card.locator('[data-tab="enter"]').click();
  await overlay.locator('.ec-strip .shot[data-key="p:fade-rise"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  const entrance = await writes(card);
  if (/data-\[state=closed\]/.test(entrance)) assert.match(entrance, /data-state/i, `the exit is said to need data-state: ${entrance}`);
  assert.deepEqual(errors, []);
});

test('A responsive grid’s columns are read from the class that applies, and changed there (F8-02)', { timeout: 120000 }, async (t) => {
  const o = await open(t, (s) => s.replace('<div id="dense" className="grid grid-cols-6 gap-[5px]">', '<div id="dense" className="grid grid-cols-2 sm:grid-cols-[40px_1fr_auto] gap-[5px]">')); if (!o) return;
  const { page, card, alt, errors } = o;
  // a cell's words, then ⌥↑ to the cell, ⌥↑ to the grid
  await alt('#dense > span:first-child', { x: 2, y: 2 });
  await o.overlay.locator('.tc').waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowUp');
  await card.locator('.drill').first().waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowUp');
  await page.waitForFunction(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), d = document.getElementById('dense').getBoundingClientRect(); return Math.abs(r.width - 12 - d.width) < 1; }, null, { timeout: 20000 });
  await card.locator('.drill[data-open="layout"]').waitFor({ timeout: 20000 });
  assert.match(await card.locator('.drill[data-open="layout"]').innerText(), /3 columns/);
  await card.locator('.drill[data-open="layout"]').click();
  assert.deepEqual(await card.locator('.lay-tk[data-tk]').allInnerTexts(), ['40px', '1fr', 'auto']);
  await card.locator('.lay-tk[data-tk="2"]').click(); // auto → 1fr
  const w = await writes(card);
  assert.match(w, /- sm:grid-cols-\[40px_1fr_auto\][\s\S]*\+ sm:grid-cols-\[40px_1fr_1fr\]/, w);
  assert.doesNotMatch(w, /- grid-cols-2/, w);
  assert.deepEqual(errors, []);
});

test('A very large element: its strip opens in under 300ms, copies capped and shown whole (F8-04)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, errors } = o;
  // a section of 1,200 more elements, drawn into the page as it is
  await page.evaluate(() => {
    const host = document.getElementById('corners'), box = document.createElement('div');
    box.id = 'big'; box.className = 'grid grid-cols-6 gap-[5px]';
    for (let i = 0; i < 400; i++) { const r = document.createElement('div'); r.className = 'flex gap-[3px] rounded-[3px] bg-ground p-[2px]'; r.innerHTML = '<span class="text-[9px]">a</span><span class="text-[9px]">b</span>'; box.append(r); }
    host.append(box);
  });
  // #corners is filled by what's in it: reached from #wrapper, one level up
  await alt('#wrapper');
  await card.locator('.drill').first().waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowUp');
  await page.waitForFunction(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), d = document.getElementById('corners').getBoundingClientRect(); return Math.abs(r.width - 12 - d.width) < 1; }, null, { timeout: 20000 });
  await card.locator('.drill[data-open="shadow"]').waitFor({ timeout: 20000 });
  assert.ok(await page.locator('#corners *').count() > 1200);
  const ms = await page.evaluate(async () => {
    const root = document.querySelector('plumb-overlay').shadowRoot, t0 = performance.now();
    root.querySelector('.ec .drill[data-open="shadow"]').click();
    while (!root.querySelector('.ec-strip .shot .copy')) await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    return performance.now() - t0;
  });
  assert.ok(ms < 300, `the strip opened in ${Math.round(ms)}ms`);
  const shown = await page.evaluate(() => {
    const root = document.querySelector('plumb-overlay').shadowRoot, reel = root.querySelector('.ec-strip .reel').getBoundingClientRect();
    return [...root.querySelectorAll('.ec-strip .shot .copy')].map((c) => ({ nodes: c.querySelectorAll('*').length, w: c.getBoundingClientRect().width, reel: reel.width }));
  });
  for (const s of shown) { assert.ok(s.nodes <= 400, `a copy holds ${s.nodes} elements`); assert.ok(s.w <= s.reel, `a copy ${Math.round(s.w)}px wide fits the strip ${Math.round(s.reel)}px`); }
  // pointing at an option and taking it stay quick
  const point = await page.evaluate(async () => {
    const root = document.querySelector('plumb-overlay').shadowRoot, shot = root.querySelectorAll('.ec-strip .shot')[2], t0 = performance.now();
    shot.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  assert.ok(point < 200, `pointing took ${Math.round(point)}ms`);
  assert.equal(await overlay.locator('.ec-strip').isVisible(), true);
  assert.deepEqual(errors, []);
});

test('One reading, one count: the places a fix changes are said as here, never "on the page" beside another page count (F8-05)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, errors } = o;
  // the list: four rows drawn by one line, read alone; '.' puts the rows' cause in hand
  const [r1, r2] = await page.locator('#rows li').evaluateAll((ls) => ls.slice(0, 2).map((l) => l.getBoundingClientRect().toJSON()));
  const b = await page.locator('#rows').boundingBox();
  await alt('#rows', { x: 30, y: (r1.bottom + r2.top) / 2 - b.y });
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  await page.keyboard.press('.');
  await overlay.locator('.fx .cause').waitFor({ timeout: 20000 });
  const what = await overlay.locator('.fx .cause .what').innerText();
  assert.doesNotMatch(what, /on the page/, what);
  if (/· \d+/.test(what)) assert.match(what, /\d+ here/, what);
  assert.deepEqual(errors, []);
});

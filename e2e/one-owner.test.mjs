// One owner of the screen (docs/briefs/qa-fixes.md, cause 3; docs/qa/element-card-results.md F3-01 to F3-06). While an
// element card is open the fix panel holds no cause and shows one line; Esc closes the card, the next Esc leaves.
// The card, the strip, the spacing bubble, the hint and the fix bar never cover each other, at any width or scroll.
// The strip scrolls to every option and says where it is. A write the page reloads for twice still comes back said,
// with its Undo.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}

async function open(t, viewport = { width: 1280, height: 900 }) {
  const launched = await browser(t); if (!launched) return null;
  const root = await mkdtemp(join(repo, 'fixtures/.one-owner-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  // dependencies found up front: a discovery mid-test would reload the page
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const file = join(root, 'src/App.jsx'), original = await readFile(file, 'utf8');
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), card = overlay.locator('.ec');
  const alt = async (sel, at = { x: 4, y: 4 }, block = 'center') => {
    await page.locator(sel).evaluate((n, b) => n.scrollIntoView({ block: b }), block);
    await page.keyboard.down('Alt');
    await page.locator(sel).click({ modifiers: ['Alt'], position: at });
    await page.keyboard.up('Alt');
    await card.locator('.drill').first().waitFor({ timeout: 20000 });
    await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  };
  return { page, overlay, card, alt, file, original, read: () => readFile(file, 'utf8'), errors };
}

// every overlay surface on screen, and the pairs that cover each other
const covering = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  const seen = [['card', '.ec'], ['strip', '.ec-strip'], ['bubble', '.sp-bub'], ['bar', '.fx'], ['hint', '.tip'], ['setup', '.rd-callout'], ['text card', '.tc']]
    .map(([name, sel]) => [name, root.querySelector(sel)]).filter(([, el]) => el && !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0')
    .map(([name, el]) => [name, el.getBoundingClientRect()]);
  const out = [];
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
    const [a, r] = seen[i], [b, s] = seen[j];
    if (r.left < s.right - 0.5 && s.left < r.right - 0.5 && r.top < s.bottom - 0.5 && s.top < r.bottom - 0.5) out.push(`${a} over ${b}`);
  }
  return { on: seen.map(([n]) => n), out };
});

test('A card open owns the screen: no cause in hand, the panel is one line; Esc closes the card, the next Esc leaves; . hands over to the fix (F3-01, F3-06)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, errors } = o;
  // #wrapper has causes of its own (gap-[9px], p-[13px])
  const given = await page.locator('#wrapper').getAttribute('class');
  await alt('#wrapper');
  await page.waitForTimeout(1200);
  assert.equal(await overlay.locator('.fx .cause').count(), 0, 'no cause in hand while the card is open');
  assert.equal(await overlay.locator('.fx .specimens').count(), 0);
  assert.equal(await overlay.locator('.fx .line').count(), 1, 'the panel is its one line');
  assert.equal(await page.locator('#wrapper').getAttribute('class'), given, 'no fix is tried on the element');

  await page.keyboard.press('Escape');
  await card.waitFor({ state: 'hidden', timeout: 5000 });
  await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 5000 });

  // . hands the screen to the fix panel: the card goes, a cause comes in hand
  await alt('#wrapper');
  await page.keyboard.press('.');
  await overlay.locator('.fx .cause').waitFor({ timeout: 10000 });
  assert.equal(await card.isHidden(), true);
  assert.deepEqual(errors, []);
});

test('The card, the bubble, the hint and the fix bar never cover each other, at two widths and three scrolls (F3-01, F3-04, F3-05)', { timeout: 300000 }, async (t) => {
  for (const viewport of [{ width: 820, height: 700 }, { width: 1280, height: 900 }]) {
    const o = await open(t, viewport); if (!o) return;
    const { page, overlay, alt, errors } = o;
    for (const sel of ['#wrapper', '#relative', '#scroller', '#rows', '#fields', 'main']) for (const block of ['start', 'center', 'end']) {
      await alt(sel, { x: 4, y: 4 }, block).catch((e) => { throw new Error(`${viewport.width}px ${sel} ${block}: ${e.message}`); });
      const opened = await covering(page);
      assert.deepEqual(opened.out, [], `${viewport.width}px ${sel} ${block}: ${opened.on.join(', ')}`);
      // the spacing bubble by the element's right edge, where the card is
      const r = await page.locator(sel).boundingBox();
      await page.mouse.move(r.x + r.width - 3, r.y + Math.min(r.height / 2, 20));
      await page.mouse.move(r.x + r.width - 2, r.y + Math.min(r.height / 2, 20));
      const pointed = await covering(page);
      assert.deepEqual(pointed.out, [], `${viewport.width}px ${sel} ${block}, pointing: ${pointed.on.join(', ')}`);
      // pointing at the fix bar is pointing at the bar, never at the element under it
      const bar = await overlay.locator('.fx').boundingBox();
      await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
      await page.mouse.move(bar.x + bar.width / 2 + 1, bar.y + bar.height / 2);
      assert.equal(await overlay.locator('.sp-bub').isHidden(), true, `${viewport.width}px ${sel} ${block}: a bubble over the bar`);
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
  }
});

test('The strip scrolls to every option, by pointer and by keys, and says where it is (F3-02, F3-03)', { timeout: 120000 }, async (t) => {
  const o = await open(t, { width: 1280, height: 720 }); if (!o) return;
  const { page, overlay, card, alt, errors } = o;
  await alt('#relative', { x: 200, y: 50 }, 'end');
  await card.locator('.drill[data-open="shadow"]').click();
  const strip = overlay.locator('.ec-strip'), reel = strip.locator('.reel');
  await strip.locator('.shot').first().waitFor();
  // where it is: its side as drawn, and the words never say "beside" when it isn't
  const where = await page.evaluate(() => {
    const st = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-strip'), s = st.getBoundingClientRect(), e = document.getElementById('relative').getBoundingClientRect();
    return { side: st.dataset.side, drawn: s.bottom <= e.top + 0.5 ? 'above' : s.top >= e.bottom - 0.5 ? 'below' : 'beside' };
  });
  assert.equal(where.side, where.drawn);
  if (where.side !== 'beside') assert.doesNotMatch(await card.innerText(), /beside/);
  assert.deepEqual((await covering(page)).out, []);

  // by pointer: the reel scrolls until the last option is in view, and pointing at it tries it
  const shots = await strip.locator('.shot').count();
  const last = strip.locator('.shot').nth(shots - 1), rb = await reel.boundingBox();
  for (let i = 0; i < 20; i++) {
    const inView = await last.evaluate((n) => { const r = n.getBoundingClientRect(), p = n.closest('.reel').getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && r.left >= p.left - 1 && r.right <= p.right + 1; });
    if (inView) break;
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(80);
  }
  const box = await last.boundingBox();
  assert.ok(box.y >= rb.y - 1 && box.y + box.height <= rb.y + rb.height + 1 && box.x >= rb.x - 1 && box.x + box.width <= rb.x + rb.width + 1, `the last of ${shots} options is reachable: ${JSON.stringify({ box, rb })}`);
  // by keys: ↓ to the end, the option in hand is always in view
  for (let i = 0; i < shots; i++) {
    await page.keyboard.press('ArrowDown');
    const ok = await page.evaluate(() => { const root = document.querySelector('plumb-overlay').shadowRoot, n = root.querySelector('.ec-strip .shot[aria-current]'), p = root.querySelector('.ec-strip .reel').getBoundingClientRect(), r = n.getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1; });
    assert.ok(ok, `option ${i + 1} in hand is in view`);
  }
  assert.deepEqual(errors, []);
});

test('A write the page reloads for twice still comes back said, with its Undo; Undo restores the file', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, original, read, errors } = o;
  await alt('#wrapper');
  const b = await page.locator('#wrapper').boundingBox();
  await page.mouse.move(b.x + 5, b.y + b.height / 2);
  await page.mouse.move(b.x + 4, b.y + b.height / 2);
  await page.waitForFunction(() => /padding left/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub')?.innerText ?? ''));
  await page.mouse.wheel(0, -100);
  await overlay.locator('.fx .said').filter({ hasText: /padding left \d+px/ }).waitFor({ timeout: 20000 });
  assert.notEqual(await read(), original);
  // the page goes twice more before it settles: the write is still said, with its Undo
  await page.reload(); await page.waitForFunction(() => window.__plumb?.overlay);
  await page.reload(); await page.waitForFunction(() => window.__plumb?.overlay);
  await overlay.locator('.fx .said .undo').waitFor({ timeout: 20000 });
  assert.match(await overlay.locator('.fx .said').innerText(), /padding left \d+px/);
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.wt:not([hidden]), .fx .said')?.textContent ?? ''), null, { timeout: 30000 });
  assert.equal(await read(), original);
  // settled, the record is gone: a reload after it comes back to the page as it is
  await page.waitForFunction(() => sessionStorage.getItem('plumb:resume') === null, null, { timeout: 15000 });
  await page.reload(); await page.waitForFunction(() => window.__plumb?.overlay);
  await page.waitForTimeout(1500);
  assert.equal(await overlay.locator('.fx .said').count(), 0, 'nothing said again after the page settled');
  assert.deepEqual(errors, []);
});

// Reaching an element (docs/briefs/qa-fixes.md, cause 4; docs/qa/element-card-results.md F4-01 to F4-08). Any pointer
// event that carries Alt is an Alt+click, with or without a keydown before it. In Blueprint, Alt+click on words opens
// their card (never a cause) and Alt+scroll walks the tree, never the page. An icon is reached as its <svg>. The card's
// header names the levels above it: a click there, or ⌥↑, moves the card up; ⌥↓ comes back down. From words, ⌥↑ is
// the element that holds them (a button's Shadow and Layout).
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

async function open(t) {
  let launched;
  try { launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => launched.close());
  const root = await mkdtemp(join(repo, 'fixtures/.reach-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  // dependencies found up front: a discovery mid-test would reload the page
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.httpServer.address().port}/?corners`;
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  return { page, overlay, url, errors };
}
const ready = (page) => page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
// the element the card is open on: the one its ring is drawn around
const ringed = (page) => page.evaluate(() => {
  const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), x = r.left + 6, y = r.top + 4, w = r.width - 12, h = r.height - 8;
  const hit = [...document.querySelectorAll('[id]')].find((el) => { const b = el.getBoundingClientRect(); return Math.abs(b.left - x) < 1 && Math.abs(b.top - y) < 1 && Math.abs(b.width - w) < 1 && Math.abs(b.height - h) < 1; });
  return hit?.id ?? null;
});
// pointer, mouse and click events with Alt set and no keydown before them, at a point of an element
const altEvents = (page, sel, dx = 4, dy = 4) => page.locator(sel).evaluate((el, [dx, dy]) => {
  const b = el.getBoundingClientRect(), at = { clientX: b.left + dx, clientY: b.top + dy, altKey: true, bubbles: true, composed: true, cancelable: true, view: window, button: 0 };
  const under = document.elementFromPoint(at.clientX, at.clientY);
  under.dispatchEvent(new PointerEvent('pointermove', at));
  under.dispatchEvent(new PointerEvent('pointerdown', at)); under.dispatchEvent(new MouseEvent('mousedown', at));
  under.dispatchEvent(new PointerEvent('pointerup', at)); under.dispatchEvent(new MouseEvent('mouseup', at)); under.dispatchEvent(new MouseEvent('click', at));
}, [dx, dy]);

test('Alt on the pointer event is enough: no keydown before it, or Alt held since before the page loaded (F4-01, F4-02)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, url, errors } = o;
  await page.locator('#wrapper').scrollIntoViewIfNeeded();
  await altEvents(page, '#wrapper');
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  assert.equal(await ringed(page), 'wrapper');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });

  // Alt held down before the page loaded: the page never saw its keydown
  await page.keyboard.down('Alt');
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.locator('#relative').scrollIntoViewIfNeeded();
  const b = await page.locator('#relative').boundingBox();
  await page.mouse.move(b.x + 200, b.y + 50);
  await page.mouse.click(b.x + 200, b.y + 50);
  await page.keyboard.up('Alt');
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  assert.equal(await ringed(page), 'relative');
  assert.deepEqual(errors, []);
});

test('In Blueprint, Alt+click on words opens their card, never a cause; Alt+scroll walks the tree and the page stays (F4-05, F4-06)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, errors } = o;
  await page.keyboard.press('Alt+KeyB');
  await ready(page);
  // #tiny: words with a drift mark of their own (text-[9px])
  const tiny = page.locator('#tiny');
  await tiny.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  // a person's pointer: the drift drawn over the words is under it, so the click is aimed by place
  const tb = await tiny.boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.keyboard.up('Alt');
  await overlay.locator('.tc').waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.fx .cause').count(), 0, 'no cause in hand');
  await page.keyboard.press('Escape');
  await overlay.locator('.tc').waitFor({ state: 'hidden', timeout: 5000 });

  // Alt+scroll over words: the path walks up, the page doesn't move
  const prose = await page.locator('#prose').boundingBox();
  const y0 = await page.evaluate(() => scrollY);
  await page.keyboard.down('Alt');
  await page.mouse.move(prose.x + 20, prose.y + 8);
  await page.mouse.move(prose.x + 22, prose.y + 8);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => scrollY), y0, 'the page stays');
  assert.equal(await overlay.locator('.tag .path').count(), 1, 'the tag shows the path walked');
  await page.keyboard.up('Alt');
  assert.deepEqual(errors, []);
});

test('An icon is reached as its <svg> (F4-07)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, errors } = o;
  const icon = page.locator('#icon');
  await icon.scrollIntoViewIfNeeded();
  const b = await icon.boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(b.x + 4, b.y + 8);
  await page.mouse.click(b.x + 4, b.y + 8); // on the circle
  await page.keyboard.up('Alt');
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  assert.equal(await ringed(page), 'icon');
  assert.match(await overlay.locator('.ec .hd .n').innerText(), /\bsvg$/, 'named as the svg, not a part of it');
  assert.deepEqual(errors, []);
});

test('The card names the levels above it; a click or ⌥↑ moves it up, ⌥↓ back down; from words ⌥↑ is their element (F4-03, F4-04, F4-08)', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, errors } = o;
  const card = overlay.locator('.ec');
  await page.locator('#wrapper').scrollIntoViewIfNeeded();
  await page.keyboard.down('Alt');
  await page.locator('#wrapper').click({ modifiers: ['Alt'], position: { x: 4, y: 4 } });
  await page.keyboard.up('Alt');
  await card.locator('.drill').first().waitFor({ timeout: 20000 });
  await ready(page);
  // the levels above it, named; the nearest one goes up a level
  const up = card.locator('.hd .up');
  assert.ok(await up.count() >= 2, 'two or three levels above it');
  await card.locator('.hd .up[data-up="1"]').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .drill'), null, { timeout: 20000 });
  await page.waitForFunction(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), c = document.getElementById('corners').getBoundingClientRect(); return Math.abs(r.width - 12 - c.width) < 1; }, null, { timeout: 20000 });
  assert.equal(await ringed(page), 'corners');
  // ⌥↓ comes back down the way it went; ⌥↑ goes up again
  await page.keyboard.press('Alt+ArrowDown');
  await page.waitForFunction(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), c = document.getElementById('wrapper').getBoundingClientRect(); return Math.abs(r.width - 12 - c.width) < 1; }, null, { timeout: 20000 });
  assert.equal(await ringed(page), 'wrapper');
  await card.locator('.drill').first().waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowUp');
  await page.waitForFunction(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec-ring').getBoundingClientRect(), c = document.getElementById('corners').getBoundingClientRect(); return Math.abs(r.width - 12 - c.width) < 1; }, null, { timeout: 20000 });

  // a button whose label is its own words: Alt+click opens the words; ⌥↑ is the button itself, with its Shadow
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.locator('#nested-button').scrollIntoViewIfNeeded();
  await page.keyboard.down('Alt');
  await page.locator('#nested-button').click({ modifiers: ['Alt'] });
  await page.keyboard.up('Alt');
  await overlay.locator('.tc').waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowUp');
  await card.locator('.drill[data-open="shadow"]').waitFor({ timeout: 20000 });
  assert.equal(await ringed(page), 'nested-button');
  assert.equal(await overlay.locator('.tc').isHidden(), true);
  assert.deepEqual(errors, []);
});

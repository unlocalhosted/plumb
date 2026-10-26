// The dock as a person meets it: bottom right, it says what React Plumber is doing; Select picks an element without Alt.
// Real Vite, real React, real Chromium, the overlay's own demo app.
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

async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close()); return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.dock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}

const dockOf = page => page.locator('plumb-overlay').getByRole('toolbar', { name: 'Plumb' });
const read = page => page.evaluate(() => {
  const dock = document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock');
  const pick = dock.querySelector('.pick'), box = dock.getBoundingClientRect();
  return { state: dock.dataset.state, folded: dock.hasAttribute('data-fold'), say: dock.querySelector('.say').textContent,
    pressed: pick.getAttribute('aria-pressed'), cursor: document.documentElement.style.cursor,
    right: innerWidth - box.right, bottom: innerHeight - box.bottom, background: getComputedStyle(dock).backgroundColor };
});

test('the dock says React Plumber is ready, folds away, and Select picks an element without Alt', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const page = await launched.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());

  // Ready: bottom right, one line, the status announced politely.
  const dock = dockOf(page);
  await dock.waitFor();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').dataset.state === 'ready');
  let s = await read(page);
  assert.equal(s.say, 'React Plumber · Alt to inspect');
  assert.ok(s.right >= 12 && s.right <= 20 && s.bottom >= 12 && s.bottom <= 20, `bottom right with a 16px inset: ${s.right}, ${s.bottom}`);
  assert.equal(await dock.locator('[role="status"]').getAttribute('aria-live'), 'polite');

  // After four seconds the line folds away; the mark and Select stay.
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').hasAttribute('data-fold'), null, { timeout: 8000 });
  assert.equal(await dock.locator('.say').isVisible(), false);
  assert.equal(await dock.getByRole('button', { name: 'Select an element' }).isVisible(), true);

  // Select arms the reticle and stays on when Alt is let go; the page is not clickable while it is on.
  await dock.getByRole('button', { name: 'Select an element' }).click();
  s = await read(page);
  assert.deepEqual([s.state, s.pressed, s.cursor, s.folded, s.say], ['select', 'true', 'crosshair', false, 'Pick an element · Esc']);
  await page.keyboard.down('Alt'); await page.keyboard.up('Alt');
  assert.equal((await read(page)).state, 'select', 'letting go of Alt does not end Select');

  // Picking pins the reading and ends Select; the dock names the pinned file.
  const row = await page.locator('#sync-row').boundingBox();
  await page.mouse.move(row.x + row.width / 2, row.y + 3);
  await page.mouse.click(row.x + row.width / 2, row.y + 3);
  const reading = page.locator('plumb-overlay').getByRole('dialog');
  await reading.waitFor();
  s = await read(page);
  assert.deepEqual([s.state, s.pressed, s.cursor], ['ready', 'false', '']);
  assert.match(s.say, /^App\.jsx:\d+$/);

  // Esc closes the reading; Select then Esc leaves without picking.
  await page.keyboard.press('Escape');
  await reading.waitFor({ state: 'hidden' });
  await dock.getByRole('button', { name: 'Select an element' }).click();
  assert.equal((await read(page)).state, 'select');
  await page.keyboard.press('Escape');
  s = await read(page);
  assert.deepEqual([s.state, s.pressed, s.cursor], ['ready', 'false', '']);
  assert.equal(await reading.isVisible(), false, 'Esc out of Select pins nothing');
  assert.deepEqual(errors, []);
});

test('the dock reads on dark pages and is still under reduced motion', { timeout: 60000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const backgrounds = {};
  for (const scheme of ['light', 'dark']) {
    const page = await launched.newPage({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForFunction(() => window.__plumb?.overlay);
    await dockOf(page).waitFor();
    backgrounds[scheme] = (await read(page)).background;
    // While starting, the mark breathes; with reduced motion it is still.
    const animation = await page.evaluate(() => {
      const dock = document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock');
      dock.dataset.state = 'starting';
      return getComputedStyle(dock.querySelector('.bob')).animationName;
    });
    assert.equal(animation, 'none', `${scheme}: no breathing under reduced motion`);
    await page.close();
  }
  assert.notEqual(backgrounds.light, backgrounds.dark, 'the dock takes the dark paper on dark pages');
  const page = await launched.newPage({ reducedMotion: 'no-preference' });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await dockOf(page).waitFor();
  assert.equal(await page.evaluate(() => {
    const dock = document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock');
    dock.dataset.state = 'starting';
    return getComputedStyle(dock.querySelector('.bob')).animationName;
  }), 'pl-breathe', 'the mark breathes while React Plumber reads the project');
});

test('the dock never sits on the page\'s own controls: a button in its corner sends it to the other one, and back', { timeout: 60000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const page = await launched.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').dataset.state === 'ready');
  const side = () => page.evaluate(() => { const b = document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').getBoundingClientRect(); return b.left < innerWidth / 2 ? 'start' : 'end'; });
  assert.equal(await side(), 'end');
  // the app puts a button in the bottom-right corner
  await page.evaluate(() => { const b = document.createElement('button'); b.id = 'corner'; b.textContent = 'Send feedback'; b.onclick = () => { b.dataset.pressed = 'yes'; }; b.style.cssText = 'position:fixed;right:16px;bottom:16px;width:200px;height:36px;z-index:5'; document.body.append(b); dispatchEvent(new Event('resize')); });
  await page.waitForFunction(() => document.querySelector('plumb-overlay').getAttribute('data-side') === 'start', null, { timeout: 5000 });
  assert.equal(await side(), 'start', 'the dock moved to the other corner');
  await page.locator('#corner').click();
  assert.equal(await page.locator('#corner').getAttribute('data-pressed'), 'yes', 'the page\'s button is reachable');
  // the punch list rises from the dock's corner too
  await page.keyboard.press('Alt+B');
  await page.locator('plumb-overlay').locator('.dock .list').click();
  const list = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.pl').getBoundingClientRect().left);
  assert.ok(list < 40, `the list rises on the dock's side: ${list}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // the button goes: the dock returns to its corner
  await page.evaluate(() => { document.getElementById('corner').remove(); dispatchEvent(new Event('resize')); });
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').hasAttribute('data-side'), null, { timeout: 5000 });
  assert.equal(await side(), 'end');
  assert.deepEqual(errors, []);
});

test('with something to press in both bottom corners, the dock sits in the middle', { timeout: 60000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const page = await launched.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').dataset.state === 'ready');
  await page.evaluate(() => { for (const side of ['left', 'right']) { const b = document.createElement('button'); b.textContent = side; b.style.cssText = `position:fixed;${side}:16px;bottom:16px;width:260px;height:36px`; document.body.append(b); } dispatchEvent(new Event('resize')); });
  await page.waitForFunction(() => document.querySelector('plumb-overlay').getAttribute('data-side') === 'center', null, { timeout: 5000 });
  const box = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').getBoundingClientRect().toJSON());
  assert.ok(Math.abs(box.left + box.width / 2 - 600) < 2, `centred: ${JSON.stringify(box)}`);
});

test('every gesture is one ? away, and each mode says what to do the first time only', { timeout: 60000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const page = await launched.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  // ? opens the sheet, Esc closes it; the dock's button does the same
  await page.keyboard.press('?');
  const sheet = overlay.getByRole('dialog', { name: 'React Plumber gestures' });
  await sheet.waitFor();
  const text = await sheet.innerText();
  for (const gesture of [/Alt \+ double-click/, /J\s+K/, /Space/, /Alt \+ B/, /1–9/]) assert.match(text, gesture);
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'hidden' });
  await overlay.getByRole('button', { name: 'Gestures' }).click();
  await sheet.waitFor();
  await overlay.getByRole('button', { name: 'Gestures' }).click();
  await sheet.waitFor({ state: 'hidden' });
  // the first Alt says how inspecting goes on; the second says nothing
  const hint = overlay.locator('.tip:not([hidden])');
  await page.keyboard.down('Alt'); await page.keyboard.up('Alt');
  await hint.filter({ hasText: /double-click words to edit/ }).waitFor();
  await page.mouse.click(600, 300); // any click takes it away
  await hint.waitFor({ state: 'hidden' });
  // blueprint's first time says J K and Space
  await page.keyboard.press('Alt+B');
  await hint.filter({ hasText: /J K move between causes/ }).waitFor({ timeout: 20000 });
  await page.keyboard.press('j'); // the next key takes the tip away, and still does its own work
  await hint.waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  // once said, never again on this browser: a reload and another Alt say nothing
  await page.reload();
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.keyboard.down('Alt'); await page.keyboard.up('Alt');
  await page.waitForTimeout(500);
  assert.equal(await overlay.locator('.tip:not([hidden])').count(), 0, 'the hint is said once');
  assert.deepEqual(errors, []);
});

// Blueprint mode as a person uses it: Alt+B turns the app into its blueprint with every drift in view drawn where it
// lives; a mark opens the reading; leaving puts the page back exactly. Real Vite, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/plumb/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMB_CHROMIUM || undefined });
    t.after(() => browser.close());
    return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}

async function demo(t, { html } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.blueprint-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  if (html) await writeFile(join(root, 'index.html'), html((await readFile(join(root, 'index.html'), 'utf8'))));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t, launched, url, { motion = false } = {}) {
  const page = await launched.newPage({ reducedMotion: motion ? 'no-preference' : 'reduce', viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors, overlay: page.locator('plumb-overlay') };
}

// Everything blueprint mode could leave on the host page: <html>'s attributes, every inline style, every Plumb
// attribute on an element, and Plumb's stylesheets.
const footprint = (page) =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter((e) => !e.closest('plumb-overlay'));
    return JSON.stringify({
      html: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value}`).sort(),
      styles: all.filter((e) => e.hasAttribute('style')).map((e) => e.getAttribute('style')),
      plumb: all.filter((e) => [...e.attributes].some((a) => a.name.startsWith('data-plumb-') && a.name !== 'data-plumb-source')).length,
      sheets: document.querySelectorAll('style[data-plumb]').length,
    });
  });

const say = (overlay) => overlay.locator('.dock .say');
const hits = (overlay) => overlay.locator('.bp .hit');

test('Alt+B draws every drift in view where it lives, and the dock counts them', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);

  await page.keyboard.press('Alt+B');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plumb-blueprint')), true);
  // the page is re-inked: fills cleared, words white
  const row = await page.locator('#sync-row').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  assert.equal(row.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(row.color, 'rgb(255, 255, 255)');
  // reading, then the count
  await say(overlay).filter({ hasText: /\d+ off in view · Alt\+B/ }).waitFor({ timeout: 20000 });
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  for (const drift of ['gap-[10px]', 'py-[10px]', 'px-[14px]', 'rounded-[14px]', 'text-[13.5px]', 'gap-[3px]', 'rounded-[5px]']) assert.ok(labels.some((l) => l.includes(drift)), `a mark for ${drift}`);
  const count = Number((await say(overlay).innerText()).match(/(\d+) off/)[1]);
  assert.equal(count, labels.filter((l) => l.startsWith('Drift:')).length, 'the dock counts the drift marks drawn');
  // every mark is a button you can name and reach
  for (const rect of await hits(overlay).all()) {
    assert.equal(await rect.getAttribute('role'), 'button');
    assert.equal(await rect.getAttribute('tabindex'), '0');
  }
  // the gap's mark sits in the gap, between the avatar and the text column
  const gap = await page.evaluate(() => {
    const row = document.getElementById('sync-row');
    const [a, b] = [...row.children].map((c) => c.getBoundingClientRect());
    const hit = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].find((r) => r.getAttribute('aria-label').includes('gap-[10px]'));
    const r = hit.getBoundingClientRect();
    return { mid: r.left + r.width / 2, from: a.right, to: b.left };
  });
  assert.ok(gap.mid >= gap.from - 2 && gap.mid <= gap.to + 2, `the gap mark is in the gap (${JSON.stringify(gap)})`);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []);
});

test('Leaving puts the page back exactly, and nothing keeps listening', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view|all true/ }).waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));

  assert.equal(await footprint(page), before, 'no attribute, inline style or stylesheet is left behind');
  assert.equal(await hits(overlay).count(), 0);
  assert.match(await say(overlay).innerText(), /Plumb · Alt to inspect/);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'false');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await hits(overlay).count(), 0, 'scrolling draws nothing once the mode is off');
  // Esc also leaves
  await page.keyboard.press('Alt+B');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.equal(await footprint(page), before);
  assert.deepEqual(errors, []);
});

test('A mark opens its reading; writing the fix removes the mark and keeps the mode on', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);

  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });
  const before = Number((await say(overlay).innerText()).match(/(\d+) off/)[1]);
  const gapMark = hits(overlay).and(overlay.locator('[aria-label*="gap-[10px]"]'));
  await gapMark.click();
  const reading = overlay.getByRole('dialog', { name: 'Plumb reading for div in SyncRow' });
  await reading.waitFor();
  // the card lays the choices out as a list or as the scale's ladder; either way the token is named s2
  await reading.locator('.opt[data-pick]').filter({ hasText: /s2/ }).first().click();
  await reading.getByRole('button', { name: 'Write 1 edit' }).click();
  await overlay.locator('.synced .state').filter({ hasText: 'Wrote 1 edit to src/App.jsx' }).waitFor({ timeout: 15000 });
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /gap-s2 py-\[10px\]/);

  // the written element is read again: its gap mark goes, its other marks stay, the count drops by one
  await page.waitForFunction(() => ![...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((r) => r.getAttribute('aria-label').includes('gap-[10px]')), null, { timeout: 15000 });
  assert.ok(await overlay.locator('.bp .hit[aria-label*="py-[10px]"]').count(), 'the row’s other drift is still marked');
  // while a reading is pinned the dock names its file; closing it brings the count back, one fewer
  await page.keyboard.press('Escape');
  await reading.waitFor({ state: 'hidden' });
  await say(overlay).filter({ hasText: `${before - 1} off in view` }).waitFor({ timeout: 15000 });
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plumb-blueprint')), true, 'closing the reading keeps blueprint on');
});

test('Keyboard: Tab reaches a mark, Enter opens its reading', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });
  let label = null;
  for (let i = 0; i < 40 && !label; i++) {
    await page.keyboard.press('Tab');
    label = await page.evaluate(() => {
      const a = document.querySelector('plumb-overlay').shadowRoot.activeElement;
      return a?.classList.contains('hit') ? a.getAttribute('aria-label') : null;
    });
  }
  assert.ok(label, 'Tab reaches a mark');
  await page.keyboard.press('Enter');
  await overlay.getByRole('dialog').waitFor();
});

test('The field shows on a page that paints both html and body, and both come back after', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t, { html: (s) => s.replace('</head>', '<style>html{background:#111}body{background:#fff;min-height:100vh}</style></head>') });
  const { page } = await open(t, launched, url);
  const original = await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]);
  await page.keyboard.press('Alt+B');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
  // an empty spot of the page shows the blueprint's blue
  const shot = (await page.screenshot({ clip: { x: 1190, y: 400, width: 1, height: 1 } })).toString('base64');
  const [r, g, b] = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    c.drawImage(img, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data];
  }, shot);
  assert.ok(b > 140 && r < 80, `the field is blue there (rgb ${r},${g},${b})`);
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]), original, 'html and body paint what they painted before');
});

test('With motion: turning around mid-sweep and removing the overlay both leave nothing behind', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url, { motion: true });
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await page.waitForTimeout(200);
  await page.keyboard.press('Alt+B'); // turn around mid-sweep
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'), null, { timeout: 5000 });
  assert.equal(await footprint(page), before, 'a reversed sweep leaves nothing behind');

  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-developing'), null, { timeout: 5000 });
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).color), 'rgb(255, 255, 255)', 'the sweep finished re-inking');
  assert.equal(await overlay.locator('.bp .scan').isHidden(), true);

  await page.evaluate(() => document.querySelector('plumb-overlay').remove());
  assert.equal(await footprint(page), before, 'removing the overlay mid-mode leaves nothing behind');
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
});

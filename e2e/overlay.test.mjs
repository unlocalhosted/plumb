// The overlay as a person uses it: hold Alt, point at an element, click to pin, pick a token, see the page change,
// write it, and find the source changed and the reading current. Real Vite, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
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
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.overlay-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

// The row's own padding band: a point on the row itself, not on one of its children.
async function onRow(page) {
  const b = await page.locator('#sync-row').boundingBox();
  return { x: b.x + b.width / 2, y: b.y + 3 };
}

test('Alt-hover reads an element, a click pins it, a pick previews it, Write puts it in source', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await demo(t);
  const page = await launched.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');

  // Idle: nothing is drawn until Alt is held.
  await assert.rejects(overlay.locator('.tag').waitFor({ state: 'visible', timeout: 300 }));

  // Armed: the tag names the element, its component and how many places are off.
  const point = await onRow(page);
  await page.keyboard.down('Alt');
  await page.mouse.move(point.x, point.y);
  await overlay.locator('.tag').filter({ hasText: 'SyncRow' }).filter({ hasText: 'off' }).waitFor();

  // Pinned: the click is swallowed by the overlay and opens the reading for that element.
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Alt');
  const reading = overlay.getByRole('dialog', { name: 'Plumb reading for div in SyncRow' });
  await reading.waitFor();
  assert.match(await reading.locator('.top').innerText(), /App\.jsx:4/);
  assert.match(await reading.locator('.top .file').getAttribute('title'), /^src\/App\.jsx:4:/);
  assert.match(await reading.locator('.read .t').innerText(), /gap-\[10px\] hardcodes 10px/);
  // Two tokens fit 10px equally; nothing is picked for the person, so nothing can be synced or written yet.
  assert.match(await reading.locator('.read .edit').innerText(), /2 tokens fit/);

  // Preview: picking a token row changes the page at once, and only inline styles carry it.
  await reading.locator('.opt[data-pick]').filter({ hasText: 'compact related items' }).click();
  assert.equal(await page.locator('#sync-row').evaluate(el => getComputedStyle(el).gap), '8px');
  await reading.locator('.read .edit').filter({ hasText: /gap-\[10px\]\s*→\s*gap-s2/ }).waitFor();
  await reading.locator('.synced .state').filter({ hasText: 'Preview: 1 on system' }).waitFor();

  // Before shows the page as it is in source; After puts the preview back.
  await reading.getByRole('button', { name: 'Before' }).click();
  assert.equal(await page.locator('#sync-row').evaluate(el => getComputedStyle(el).gap), '10px');
  await reading.getByRole('button', { name: 'Before' }).click();
  assert.equal(await page.locator('#sync-row').evaluate(el => getComputedStyle(el).gap), '8px');

  // Write: the edit lands in source, the dev server reloads, and the reading comes back current.
  const before = await readFile(join(root, 'src/App.jsx'), 'utf8');
  await reading.getByRole('button', { name: 'Write 1 edit' }).click();
  await overlay.locator('.synced .state').filter({ hasText: 'Wrote 1 edit to src/App.jsx' }).waitFor({ timeout: 15000 });
  const after = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.equal(after, before.replace('gap-[10px] py-[10px]', 'gap-s2 py-[10px]'), 'exactly the previewed edit, nothing else');
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null, 'the preview is lifted once the page carries the change');
  assert.equal(await page.locator('#sync-row').evaluate(el => getComputedStyle(el).gap), '8px');
  assert.doesNotMatch(await overlay.locator('.read .t').innerText(), /gap-\[10px\]/);

  // Escape closes the reading and leaves the page exactly as source has it.
  await page.keyboard.press('Escape');
  await overlay.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
});

test('Undo lifts every preview; closing never leaves a preview behind; unplaced elements say so', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await demo(t);
  const page = await launched.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  await page.evaluate(() => window.__plumb.overlay.pin(document.getElementById('beta-chip')));
  const reading = overlay.getByRole('dialog', { name: 'Plumb reading for span in Chip' });
  await reading.waitFor();

  // Sync applies every mark that has exactly one fitting token; the rest wait for a pick.
  const sync = reading.getByRole('button', { name: /^Sync \d+ to system$/ });
  await sync.click();
  assert.notEqual(await page.locator('#beta-chip').getAttribute('style'), null);
  await reading.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await page.locator('#beta-chip').getAttribute('style'), null);

  await sync.click();
  await page.keyboard.press('Escape');

  await overlay.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#beta-chip').getAttribute('style'), null, 'closing lifts an unwritten preview');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written without Write');

  // Runtime DOM outside React's rendered tree has no authored ancestor to read.
  await page.evaluate(() => { const d = document.createElement('div'); d.id = 'runtime'; d.textContent = 'Runtime'; document.body.append(d); return window.__plumb.overlay.pin(d); });
  assert.equal(await page.$eval('#runtime', element => window.__plumb.locate(element)), null);
  assert.deepEqual(await page.$eval('#runtime', element => window.__plumb.locate(element, { explain: true })), { location: null, reason: 'no-fiber', detail: {} });
  await overlay.getByRole('dialog').filter({ hasText: 'wasn’t rendered by React' }).waitFor();
});

// The overlay as a person uses it: hold Alt, point at an element, Alt+click opens blueprint on it with its cause in
// the fix panel (taking and writing a cause: fixpanel.test.mjs). Real Vite, real React 19, real Chromium.
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

test('Alt-hover names an element; Alt+click opens blueprint with that element\'s cause in hand, and no card', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await demo(t);
  const page = await launched.newPage({ reducedMotion: 'reduce' });
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
  await overlay.locator('.tag').filter({ hasText: 'SyncRow' }).filter({ hasText: /\d+ problems?/ }).waitFor();

  // Alt+click: one interface. Blueprint opens on the row and the fix panel holds one of the row's own causes, not a
  // cause of the page around it (the page's wrappers are read first).
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Alt');
  const held = overlay.locator('.fx .cause .cls');
  await held.waitFor({ timeout: 20000 });
  const own = await page.locator('#sync-row').getAttribute('class');
  assert.ok(own.split(/\s+/).includes((await held.innerText()).trim()), `held ${await held.innerText()}, the row has ${own}`);
  // the 10-10 reading card is not opened, and nothing is written
  assert.equal(await overlay.getByRole('dialog', { name: /React Plumber reading/ }).count(), 0);
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'));

  // Esc puts the cause down, Esc again leaves blueprint, and the page is as source has it.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null);
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
  const reading = overlay.getByRole('dialog', { name: 'React Plumber reading for Chip (span)' });
  await reading.waitFor();

  // Preview applies every mark that has exactly one fitting token; the rest wait for a pick.
  const sync = reading.getByRole('button', { name: /^Preview \d+ fix(es)?$/ });
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
  await overlay.getByRole('dialog').filter({ hasText: 'Not drawn by React' }).waitFor();
});

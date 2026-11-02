// Alt+click reads one element and what's inside it, never the whole page: the page stays as it is, and its card opens
// beside it. The card owns the screen (docs/briefs/qa-fixes.md, cause 3): the fix panel holds nothing and is one line
// while the card is open; '.' hands over to the fixes: the element's own cause in hand, with the other places the same
// line of code draws. Alt+B widens to the page.
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
  const root = await mkdtemp(join(repo, 'fixtures/.element-only-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

const fx = (page) => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText ?? '');
const progress = (page) => page.evaluate(() => window.__plumb.overlay.progress);

test('Alt+click reads only that element and what is inside it; the fix says where else its code draws; Alt+B widens to the page; a click outside leaves', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await demo(t);
  const page = await launched.newPage({ reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');

  // the first of four rows one line of code draws: only it and its two words are read
  const row = page.locator('#rows li').first();
  const inside = await row.evaluate((el) => 1 + el.querySelectorAll('*').length);
  const rowClasses = (await row.getAttribute('class')).split(/\s+/).concat(...await row.locator('*').evaluateAll((els) => els.map((el) => (el.getAttribute('class') ?? '').split(/\s+/))));
  await row.click({ modifiers: ['Alt'], position: { x: 2, y: 2 } });
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.done; }, null, { timeout: 20000 });
  // the card owns the screen: nothing in hand, the panel its one line; the card says where else the code draws
  await page.waitForTimeout(600);
  assert.equal(await overlay.locator('.fx .cause').count(), 0, 'no cause in hand while the card is open');
  assert.match(await overlay.locator('.ec .reach').innerText(), /The same code draws 3 other places on this page/);
  // '.' hands over: the card goes, the element's own cause comes in hand
  await page.keyboard.press('.');
  await overlay.locator('.fx .cause .cls').waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.ec').isHidden(), true);
  const one = await progress(page);
  assert.equal(one.total, inside, `read ${one.total} elements, the row holds ${inside}: ${JSON.stringify(one)}`);
  assert.equal(one.unrendered, 0, 'no place the page does not render is counted');
  const held = await fx(page);
  assert.match(held, /The same code draws 3 other places on this page\. The fix changes them too\./, held);
  assert.doesNotMatch(held, /styles would cover it|Name them\?/, 'the text styles are a whole-page proposal');
  // the cause in hand is the row's own
  assert.ok(rowClasses.includes((await overlay.locator('.fx .cause .cls').innerText()).trim()), held);

  // Alt+B: the whole page is read from here
  await page.keyboard.press('Alt+KeyB');
  await page.waitForFunction((n) => { const p = window.__plumb.overlay.progress; return p?.done && p.total > n; }, inside, { timeout: 20000 });
  const all = await progress(page);
  assert.ok(all.total > inside * 10, JSON.stringify(all));

  // back to one element: a list fine in itself puts the first problem inside it in hand
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });
  // read before the click: the fix in hand previews on the page at once
  const list = await page.locator('#rows').evaluate((el) => [...el.querySelectorAll('*')].flatMap((c) => (c.getAttribute('class') ?? '').split(/\s+/)));
  await page.evaluate(() => window.__plumb.overlay.pin(document.getElementById('rows')));
  await overlay.locator('.fx .cause .cls').waitFor({ timeout: 20000 });
  assert.ok(list.includes((await overlay.locator('.fx .cause .cls').innerText()).trim()), await fx(page));
  assert.equal((await progress(page)).total, await page.locator('#rows').evaluate((el) => 1 + el.querySelectorAll('*').length));

  // a plain click outside the element read is done with it, and nothing was written
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });
  await page.locator('#beta-chip').click({ modifiers: ['Alt'] });
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.done; }, null, { timeout: 20000 });
  const chip = await page.locator('#beta-chip').evaluate((el) => 1 + el.querySelectorAll('*').length);
  assert.equal((await progress(page)).total, chip);
  await page.mouse.click(5, 5);
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written');
  assert.deepEqual(errors, []);
});

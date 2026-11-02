// The hierarchy on the text card's scale (overlay/src/hierarchy.js, docs/research/hierarchy.md): opening a value marks
// the step that fits the element's place among its peers and quiets the steps that would break the order, with the
// reason in plain words. Nothing is enforced: a step that breaks the order can still be picked.
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

test('Opening a value marks the step that fits its place and quiets the ones that break the order, saying why', { timeout: 120000 }, async (t) => {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; return t.skip('Playwright Chromium missing'); }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.hierarchy-marks-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/hierarchy'), root, { recursive: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');

  // the body, written in place, 15px: off the theme's scale (14, 16, 17, 19), between the subtitle (17) and the meta (11)
  await page.locator('#a-body').click({ modifiers: ['Alt'] });
  const size = overlay.locator('.tc .fld[data-key="font-size"]');
  await size.waitFor({ timeout: 20000 });
  await size.click();
  await overlay.locator('.tc .rail .fit').waitFor({ timeout: 20000 });
  const ticks = await overlay.locator('.tc .rail .tk[data-i]').evaluateAll((els) => els.map((t) => ({ n: t.textContent.trim(), fit: t.hasAttribute('data-fit'), breaks: t.hasAttribute('data-breaks') })));
  // the nearest steps that keep the order are marked; the subtitle's size and above break it
  assert.deepEqual(ticks.filter((t) => t.fit).map((t) => t.n), ['14', '16'], JSON.stringify(ticks));
  for (const n of ['17', '19']) assert.ok(ticks.find((t) => t.n === n)?.breaks, `${n} reaches the subtitle: it breaks the order ${JSON.stringify(ticks)}`);
  assert.match(await overlay.locator('.tc .rail .fit').innerText(), /^Fits as the body, below the subtitle \(17px\) and above the meta \(11px\)\.$/);
  // marks, never a wall: a step that breaks the order can still be previewed and put back
  const before = await page.locator('#a-body').evaluate((el) => getComputedStyle(el).fontSize);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('#a-body').evaluate((el) => getComputedStyle(el).fontSize), before);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#a-body').evaluate((el) => getComputedStyle(el).fontSize), before);
  assert.deepEqual(errors, []);
});

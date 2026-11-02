// Alt+click on an element that isn't words opens its card beside it (docs/briefs/element-card-overlay.md, layer 1):
// Shadow › and Motion › drill into editors built on the recipe engine. The options are live copies of the element in a
// strip; pointing at one tries it on the real element and puts it back; a click takes it and Writes shows the engine's
// exact edit, written by nothing; the light pad and the timeline tune it; Write it applies it, said with Undo, and Undo
// restores every file exactly.
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
  const root = await mkdtemp(join(repo, 'fixtures/.element-card-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

// #relative: a surface (no words of its own) wearing the theme's shadow-rest
async function open(t) {
  const launched = await browser(t); if (!launched) return null;
  const { root, url } = await demo(t);
  const files = { app: join(root, 'src/App.jsx'), css: join(root, 'src/styles.css') };
  const original = { app: await readFile(files.app, 'utf8'), css: await readFile(files.css, 'utf8') };
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), el = page.locator('#relative');
  const box = await el.boundingBox();
  await el.click({ modifiers: ['Alt'], position: { x: box.width - 12, y: box.height - 6 } });
  await overlay.locator('.ec .drill[data-open="shadow"]').waitFor({ timeout: 20000 });
  // the element read: whatever Blueprint puts in hand has been put there before the card is worked in
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  const read = async () => ({ app: await readFile(files.app, 'utf8'), css: await readFile(files.css, 'utf8') });
  return { page, overlay, el, root, original, read, errors };
}
const shadowOf = (el) => el.evaluate((n) => getComputedStyle(n).boxShadow);

test('Shadow ›: the strip tries each shadow on the element, a pick shows the engine’s edit, the light pad tunes it, Write it writes it, Undo restores both files', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, el, original, read, errors } = o;
  const card = overlay.locator('.ec');

  // at rest: named for the element, its shadow by the project's own name, nothing tried on it
  assert.equal(await overlay.getByRole('dialog', { name: /^Edit / }).count(), 1, 'the card is named for the element');
  assert.match(await card.locator('.drill[data-open="shadow"]').innerText(), /Shadow[\s\S]*shadow-rest/);
  assert.match(await card.locator('.drill[data-open="motion"]').innerText(), /Motion[\s\S]*None/);
  const rest = await shadowOf(el);

  // Shadow ›: the strip opens with yours first, in hand, and the pack's lined up against it
  await card.locator('.drill[data-open="shadow"]').click();
  const strip = overlay.locator('.ec-strip');
  await strip.locator('.shot').first().waitFor();
  assert.equal(await strip.locator('.shot').first().getAttribute('data-key'), 'y:rest', 'the one it wears comes first');
  assert.equal(await strip.locator('.shot[aria-current]').getAttribute('data-key'), 'y:rest');
  assert.ok(await strip.locator('.shot[data-key="p:raised"]').count(), 'the pack is offered');
  assert.match(await strip.locator('.shot[data-key="p:raised"] .v').innerText(), /new/);
  await card.locator('.writes .note').filter({ hasText: /Nothing to write/ }).waitFor({ timeout: 20000 });
  assert.equal(await card.locator('.use').isDisabled(), true, 'nothing to write: Write it waits');

  // pointing at a copy tries it on the real element; leaving puts it back exactly
  await strip.locator('.shot[data-key="p:floating"]').hover();
  await page.waitForFunction(() => /10px 15px -3px/.test(getComputedStyle(document.getElementById('relative')).boxShadow));
  await card.hover();
  await page.waitForFunction((was) => getComputedStyle(document.getElementById('relative')).boxShadow === was, rest);
  assert.equal(await el.evaluate((n) => n.getAttribute('style') ?? ''), '', 'no inline style left behind');

  // a click takes Raised: Writes shows the engine's edit (a new shadow in the theme, the class on the line); nothing is written
  await strip.locator('.shot[data-key="p:raised"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  const writes = await card.locator('.writes').innerText();
  assert.match(writes, /src\/styles\.css[\s\S]*\+\s+--shadow-raised: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.1\)/, writes);
  assert.match(writes, /src\/App\.jsx[\s\S]*\+.*id="relative".*shadow-raised/, writes);
  assert.deepEqual(await read(), original, 'a preview writes nothing');
  assert.match(await shadowOf(el), /0px 1px 3px 0px/, 'the element wears the one in hand');

  // the light pad: the sun dragged to the right turns the light; the element and the edit follow
  const sun = card.locator('[data-sun]'), s = await sun.boundingBox();
  const readout = await card.locator('.pad-read').innerText();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 30, s.y + s.height / 2 - 10, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => !/^0°/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .pad-read')?.textContent ?? '0°'), null, { timeout: 10000 });
  assert.notEqual(await card.locator('.pad-read').innerText(), readout);
  // lit from the right: the first layer falls to the left
  await page.waitForFunction(() => /^rgba?\([^)]*\) -\d/.test(getComputedStyle(document.getElementById('relative')).boxShadow), null, { timeout: 20000 });
  await page.waitForFunction(() => /--shadow-raised: -/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .writes')?.textContent ?? ''), null, { timeout: 20000 });

  // Write it: both files written in one go, said with Undo
  await page.evaluate(() => { window.__before = true; });
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /uses Raised now · wrote styles\.css, App\.jsx/ }).waitFor({ timeout: 20000 });
  const after = await read();
  assert.match(after.css, /--shadow-raised: -/);
  assert.match(after.app, /id="relative" className="relative h-16 rounded-card bg-surface shadow-raised"/);
  assert.equal(await strip.isHidden(), true, 'the strip goes with the drill');
  // a new theme value reloads the page here: Blueprint comes back saying what was written, with its Undo
  await page.waitForFunction(() => !window.__before, null, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => window.__plumb?.overlay);
  await overlay.locator('.fx .said').filter({ hasText: /uses Raised now/ }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => /0px 1px 3px 0px|-\d/.test(getComputedStyle(document.getElementById('relative')).boxShadow), null, { timeout: 20000 });

  // Undo: every file back exactly
  await overlay.locator('.fx .said .undo').click();
  // (undoing the theme reloads the page again; the files are the proof)
  for (let i = 0; i < 40 && JSON.stringify(await read()) !== JSON.stringify(original); i++) await new Promise((r) => setTimeout(r, 250));
  assert.deepEqual(await read(), original);
  assert.deepEqual(errors, []);
});

test('Motion ›: hover and press options play on copies, a pick shows its edit, the timeline changes its time, Esc goes back and puts the element back, Write it and Undo', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, el, original, read, errors } = o;
  const card = overlay.locator('.ec'), strip = overlay.locator('.ec-strip');

  await card.locator('.drill[data-open="motion"]').click();
  await strip.locator('.shot').first().waitFor();
  const keys = await strip.locator('.shot').evaluateAll((s) => s.map((x) => x.dataset.key));
  assert.ok(keys.includes('p:lift') && keys.includes('p:press'), keys.join());
  assert.ok(!keys.includes('p:fade-rise'), 'entrances are under their own tab');
  assert.match(await card.locator('.note').innerText(), /Pick a motion/);
  assert.equal(await card.locator('.use').isDisabled(), true);

  // Entrance: its own options
  await card.locator('[data-tab="enter"]').click();
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.ec-strip .shot')].some((s) => s.dataset.key === 'p:fade-rise'));
  await card.locator('[data-tab="hover"]').click();
  await strip.locator('.shot[data-key="p:lift"]').waitFor();

  // a click takes Lift: its edit is the transition and the hover move on its line
  await strip.locator('.shot[data-key="p:lift"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  assert.match(await card.locator('.writes').innerText(), /\+.*id="relative".*transition-transform duration-150 ease-in-out hover:-translate-y-0\.5/);
  assert.equal(await card.locator('.tl-ms').innerText(), '150ms');
  assert.deepEqual(await read(), original);

  // the timeline: dragged to about 300ms, the edit follows
  const tl = await card.locator('[data-tl]').boundingBox(), h = await card.locator('[data-tlh]').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(tl.x + tl.width * 0.5, h.y + h.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => /duration-300/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .writes')?.textContent ?? ''), null, { timeout: 20000 });
  assert.equal(await card.locator('.tl-ms').innerText(), '300ms');

  // Esc goes back to the card at rest; nothing written, nothing left on the element
  await page.keyboard.press('Escape');
  await card.locator('.drill[data-open="motion"]').waitFor();
  assert.equal(await strip.isHidden(), true);
  assert.equal(await el.evaluate((n) => n.getAttribute('style') ?? ''), '');
  assert.deepEqual(await read(), original);

  // again, by keys: back from Motion, Motion is the field in hand; ↓ keeps it, Enter opens it; ↓ takes the first option, Enter writes it
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await strip.locator('.shot').first().waitFor();
  await page.keyboard.press('ArrowDown');
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  const picked = await strip.locator('.shot[aria-current]').getAttribute('data-key');
  await page.keyboard.press('Enter');
  await overlay.locator('.fx .said').filter({ hasText: /uses .* now/ }).waitFor({ timeout: 20000 });
  assert.notEqual((await read()).app, original.app, `${picked} was written`);
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 20000 });
  assert.deepEqual(await read(), original);

  // Esc closes the card
  await page.keyboard.press('Escape');
  await card.waitFor({ state: 'hidden', timeout: 5000 });
  assert.deepEqual(errors, []);
});

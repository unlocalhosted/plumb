// Alt+click on words opens a card beside them: what the text is now, as values (docs/design/text-editor.md, direction
// D). A value off the scale reads coral; opening it shows the scale with the value where it falls; ← → preview a step
// on the element and Esc puts it back; Enter writes it to the element's line with Undo. A drag on the field moves
// through the steps and writes on release; Esc during it changes nothing.
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
  const root = await mkdtemp(join(repo, 'fixtures/.text-editor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t) {
  const launched = await browser(t); if (!launched) return null;
  const { root, url } = await demo(t);
  const original = await readFile(join(root, 'src/App.jsx'), 'utf8');
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), tiny = page.locator('#tiny');
  await tiny.click({ modifiers: ['Alt'] });
  await overlay.locator('.tc .fld[data-key="font-size"]').waitFor({ timeout: 20000 });
  return { page, overlay, tiny, root, original, errors };
}
const size = (tiny) => tiny.evaluate((el) => getComputedStyle(el).fontSize);
const written = (root) => readFile(join(root, 'src/App.jsx'), 'utf8');

test('Alt+click on words opens their values; an off-scale size opens its scale, ← → preview, Esc puts back, Enter writes with Undo', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, tiny, root, original, errors } = o;
  const field = overlay.locator('.tc .fld[data-key="font-size"]');

  // at rest: what the text is now, read at once; 9px is off the scale; the weight nobody set is the page's
  assert.equal(await overlay.getByRole('dialog', { name: /^Edit / }).count(), 1, 'the card is named for the element');
  assert.equal(await field.getAttribute('data-off'), '', '9px is off the scale');
  assert.match(await field.innerText(), /^9\s*px$/);
  assert.match(await field.getAttribute('title'), /9px isn’t in your scale\. Nearest: 12px\./);
  assert.match(await overlay.locator('.tc .fld[data-key="font-weight"]').innerText(), /400\s*Regular/);
  assert.equal(await overlay.locator('.tc .fld[data-key="font-weight"]').getAttribute('data-unset'), '');
  assert.equal(await overlay.locator('.tc .rail').count(), 0, 'no scale at rest');
  assert.doesNotMatch(await overlay.locator('.fx').innerText(), /Nothing to fix/);

  // a click opens it: the scale shows, 9 coral where it falls, nothing changes yet
  await field.click();
  await overlay.locator('.tc .rail .tk[data-off]').waitFor();
  assert.equal(await size(tiny), '9px');
  // → previews the first step on the element; Esc puts it back
  await page.keyboard.press('ArrowRight');
  assert.equal(await size(tiny), '12px');
  assert.match(await field.innerText(), /12[\s\S]*9/, 'the field reads the new value, the old one struck through');
  await page.keyboard.press('Escape');
  assert.equal(await size(tiny), '9px', 'Esc puts it back');
  assert.equal(await tiny.evaluate((el) => el.getAttribute('style') ?? ''), '');
  assert.equal(await overlay.locator('.tc .rail').count(), 0, 'and closes the scale');

  // open, →, Enter: written to its line, said with Undo; the field reads 12 and is no longer off
  await field.click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await overlay.locator('.fx .said').filter({ hasText: /Changed size to 12px on / }).waitFor({ timeout: 20000 });
  assert.match(await written(root), /id="tiny" className="text-small text-ink-muted"/, 'text-[9px] became text-small on its line');
  await page.waitForFunction(() => { const f = document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .fld[data-key="font-size"]'); return f && !f.hasAttribute('data-off') && /^12/.test(f.innerText); }, null, { timeout: 20000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tiny')).fontSize === '12px', null, { timeout: 20000 });

  // Undo restores the file exactly, and the card reads the element again
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 20000 });
  assert.equal(await written(root), original);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .fld[data-key="font-size"]')?.hasAttribute('data-off'), null, { timeout: 20000 });

  // Esc closes the card; the next Esc leaves
  await page.keyboard.press('Escape');
  await overlay.locator('.tc').waitFor({ state: 'hidden', timeout: 5000 });
  await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 10000 });
  assert.deepEqual(errors, []);
});

test('A drag on a value field moves through the steps under the hand and writes on release; Esc mid-drag changes nothing', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, tiny, root, original, errors } = o;
  const box = await overlay.locator('.tc .fld[data-key="font-size"]').boundingBox();
  const x = box.x + 40, y = box.y + box.height / 2;

  // a drag right: the scale opens with the thumb under the hand, the element previews the step it reaches
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 6, y, { steps: 2 });
  await overlay.locator('.tc .rail .thumb').waitFor({ state: 'attached' });
  await page.mouse.move(x + 40, y, { steps: 6 });
  assert.notEqual(await size(tiny), '9px', 'the element previews the step under the hand');
  // Esc mid-drag: nothing changes, the scale goes, the card stays
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await overlay.locator('.tc .rail').waitFor({ state: 'detached', timeout: 5000 });
  assert.equal(await size(tiny), '9px');
  assert.equal(await written(root), original, 'Esc wrote nothing');
  assert.equal(await overlay.locator('.tc').isVisible(), true, 'the card stays open');

  // a short drag right and let go: the first step, written
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 6, y, { steps: 2 });
  await overlay.locator('.tc .rail .thumb').waitFor({ state: 'attached' });
  const first = await overlay.locator('.tc .rail .tk[data-i="0"]').boundingBox();
  const off = await overlay.locator('.tc .rail .tk[data-off]').boundingBox();
  await page.mouse.move(x + (first.x - off.x) + 2, y, { steps: 6 });
  await page.mouse.up();
  await overlay.locator('.fx .said').filter({ hasText: /Changed size to 12px on / }).waitFor({ timeout: 20000 });
  assert.match(await written(root), /id="tiny" className="text-small text-ink-muted"/);
  assert.deepEqual(errors, []);
});

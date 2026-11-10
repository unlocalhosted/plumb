// Alt+click on words opens the text card: a visual editor's panel (docs/journey.md, chapter 17). The text style and the
// four type values are token pickers; case is four buttons; colour is a small field that opens the colour picker
// (nearest tokens first, every colour by role). A change previews on the words at once and is held; one Write saves
// every held change to the element's line, each with its Undo; Esc puts things back. The card stays light on any page
// and any computer scheme. (The style following the values is tested where the app has a text style: text-card-qa.)
//
// One browser for the file, a fresh page (and a fresh copy of the demo app) per test.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

let launched;
async function browser(t) {
  if (launched) return launched;
  try {
    launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
after(() => launched?.close());

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

// the demo app, its card open on the words chosen (#tiny: a hard-coded 9px in a token colour; #prose: on the Body style)
async function open(t, id = 'tiny', { colorScheme = 'light' } = {}) {
  const b = await browser(t); if (!b) return null;
  const { root, url } = await demo(t);
  const original = await readFile(join(root, 'src/App.jsx'), 'utf8');
  const context = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 }, colorScheme });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), words = page.locator(`#${id}`);
  await words.click({ modifiers: ['Alt'] });
  await overlay.locator('.tc .pk .row[aria-label="Font size"]').waitFor({ timeout: 20000 });
  return { page, overlay, words, root, original, errors };
}
const size = (el) => el.evaluate((e) => getComputedStyle(e).fontSize);
const written = (root) => readFile(join(root, 'src/App.jsx'), 'utf8');
const field = (overlay, name) => overlay.locator(`.tc .pk .row[aria-label="${name}"]`);
const shown = (row) => row.locator('.slot:not(.gone)').innerText();
const writeButton = (overlay) => overlay.locator('.tc [data-do="write"]');

test('Alt+click on words opens the panel: the text style, the four type values, case and colour; a hard-coded size reads so', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { overlay, errors } = o;
  // (the demo app defines no text styles, so there is no style picker here; the QA file's app has one)
  for (const name of ['Font size', 'Line height', 'Letter spacing', 'Weight']) assert.equal(await field(overlay, name).count(), 1, `${name} is a picker`);
  assert.equal(await overlay.locator('.tc .pk [data-case]').count(), 4, 'case is four buttons');
  assert.equal(await overlay.locator('.tc .pk .cf').count(), 1, 'colour is a field');
  // 9px is on none of your tokens: it reads as itself, hard-coded
  const sizeRow = field(overlay, 'Font size');
  assert.equal(await sizeRow.locator('.val').evaluate((v) => v.classList.contains('on-hard')), true);
  assert.match(await shown(sizeRow), /9px/);
  // nothing is held yet, so there is nothing to write
  assert.equal(await writeButton(overlay).isDisabled(), true);
  assert.match(await writeButton(overlay).innerText(), /^Write/);
  assert.deepEqual(errors, []);
});

test('A value moved with the keys previews on the words and is counted; Esc puts it back; Write saves it with Undo', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, words, root, original, errors } = o;
  await field(overlay, 'Font size').locator('.val').focus();

  // ↑: the next size up, on the words at once, held and counted
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tiny')).fontSize !== '9px');
  assert.ok(parseFloat(await size(words)) > 9, 'the words take a bigger size');
  assert.match(await writeButton(overlay).innerText(), /Write 1 change/);
  assert.equal(await written(root), original, 'nothing is written until Write');

  // Esc: every held value goes back
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('tiny')).fontSize === '9px');
  assert.match(await writeButton(overlay).innerText(), /^Write\s*↵?$/);

  // ↑ again, then Write: the file gets a token in place of text-[9px], said with Undo
  await field(overlay, 'Font size').locator('.val').focus();
  await page.keyboard.press('ArrowUp');
  await writeButton(overlay).click();
  await overlay.locator('.fx .said').filter({ hasText: /Changed size to / }).waitFor({ timeout: 20000 });
  const after1 = await written(root);
  assert.doesNotMatch(after1, /id="tiny" className="text-\[9px\]/, 'the hard-coded size is gone from its line');
  assert.match(after1, /id="tiny" className="text-[a-z0-9-]+ text-ink-muted"/, 'a token is in its place');

  // Undo: the file exactly as it was
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.wt:not([hidden]), .fx .said')?.textContent ?? ''), null, { timeout: 20000 });
  assert.equal(await written(root), original);
  assert.deepEqual(errors, []);
});

test('Two changes, one Write: case and colour both land on the line', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { overlay, words, root, errors } = o;

  // case: upper, shown on the words at once
  await overlay.locator('.tc .pk [data-case="uppercase"]').click();
  assert.equal(await words.evaluate((e) => getComputedStyle(e).textTransform), 'uppercase');
  // colour: open the field, take the first of the nearest tokens
  await overlay.locator('.tc .pk .cf').click();
  const nearest = overlay.locator('.tc .cp .opt:not(.mine)').first();
  const token = (await nearest.locator('b').innerText()).trim();
  await nearest.click();
  assert.match(await writeButton(overlay).innerText(), /Write 2 changes/);

  await writeButton(overlay).click();
  // each change is written after the one before it has been read back
  const line = async () => (await written(root)).match(/<span id="tiny" className="([^"]*)"/)?.[1] ?? '';
  for (let i = 0; i < 100 && !(/\buppercase\b/.test(await line()) && new RegExp(`\\btext-${token}\\b`).test(await line())); i++) await new Promise((r) => setTimeout(r, 200));
  assert.match(await line(), /\buppercase\b/, 'the case is on the line');
  assert.match(await line(), new RegExp(`\\btext-${token}\\b`), `the colour ${token} is on the line`);
  assert.deepEqual(errors, []);
});

test('The colour picker leads with your colour and the nearest tokens, opens every colour by role, and Esc folds it', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, errors } = o;
  const picker = overlay.locator('.tc .cp');
  assert.equal(await picker.isVisible(), false, 'folded at rest');

  await overlay.locator('.tc .pk .cf').click();
  await picker.waitFor();
  assert.match(await picker.locator('.opt.mine').innerText(), /ink-muted/, 'your colour first: the token the words use');
  assert.equal(await picker.locator('.opt:not(.mine)').count(), 3, 'then the three nearest');
  for (const word of await picker.locator('.opt:not(.mine) span').allInnerTexts()) assert.match(word, /^(looks the same|close|near|far)$/, 'closeness said in words');

  await picker.locator('.all').click();
  assert.ok(await picker.locator('.roles [data-role]').count() >= 2, 'every colour, by what it is for');
  assert.ok(await picker.locator('.shades .shade').count() >= 1);

  // Esc folds every colour away, then the picker
  await page.keyboard.press('Escape');
  await picker.locator('.every').waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  await picker.waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
});

test('The card stays light on a computer set to dark', { timeout: 120000 }, async (t) => {
  const o = await open(t, 'tiny', { colorScheme: 'dark' }); if (!o) return;
  const { page, overlay, errors } = o;
  assert.equal(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches), true);
  const card = overlay.locator('.tc');
  await card.evaluate((c) => c.querySelectorAll('*').forEach((e) => { e.style.transition = 'none'; }));
  const [r, g, b] = (await card.evaluate((c) => getComputedStyle(c).backgroundColor)).match(/[\d.]+/g).map(Number);
  // the glass is white (oklab or rgb): light enough either way
  assert.ok(r > 0.9 || (r > 230 && g > 230 && b > 230), `the card is light (${r} ${g} ${b})`);
  assert.equal(await overlay.locator('.tc .pk section > b').first().evaluate((e) => getComputedStyle(e).color), 'rgb(107, 102, 92)', 'labels in the light secondary ink');
  assert.equal(await field(overlay, 'Weight').locator('.slot:not(.gone) b').evaluate((e) => getComputedStyle(e).color) !== 'rgb(244, 243, 239)', true, 'values are not lettered for a dark card');
  assert.deepEqual(errors, []);
});

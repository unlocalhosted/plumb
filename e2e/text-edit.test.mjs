// Editing words like a CMS (docs/briefs/text-editing.md): double-click any words on the page, type, Enter, and the
// source file has them; Esc puts them back; clicking away saves; Undo writes them back; words that can't be edited say
// why. Real Vite, real React 19, real Chromium, the overlay's own demo.
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
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close());
    return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.text-edit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { source: join(root, 'src/App.jsx'), url: `http://127.0.0.1:${server.httpServer.address().port}/?corners` };
}

async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1500 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors, overlay: page.locator('plumb-overlay') };
}

// a double-click on the middle of an element's words
const dblclickWords = async (page, selector) => {
  const box = await page.locator(selector).evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el.firstChild); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await page.mouse.dblclick(box.x, box.y);
};
const editable = (page, selector) => page.waitForFunction((s) => document.querySelector(s).getAttribute('contenteditable') === 'plaintext-only', selector, { timeout: 10000 });
const fileHas = async (file, text, ms = 10000) => { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if ((await readFile(file, 'utf8')).includes(text)) return true; return false; };

test('a double-click edits the words in place; Enter writes them to source; Undo puts them back', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);

  await dblclickWords(page, '#tiny');
  await editable(page, '#tiny');
  // the words are edited where they are, with a ring and a tag saying where they are written
  await overlay.locator('.tx-tag').filter({ hasText: /App\.jsx:\d+/ }).waitFor();
  assert.equal(await overlay.locator('.tx-ring').isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'tiny', 'the caret is in the words');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('small print');
  assert.equal(await page.locator('#tiny').textContent(), 'small print', 'the page shows the words as they are typed');
  await page.keyboard.press('Enter');
  assert.ok(await fileHas(source, '>small print</span>'), 'Enter wrote the words to source');
  assert.ok(!(await readFile(source, 'utf8')).includes('tiny print'));
  assert.equal(await page.locator('#tiny').getAttribute('contenteditable'), null, 'the element is put back');
  // the toast says what was written, even when the dev server reloads the page after the write
  const toast = overlay.locator('.wt');
  await toast.filter({ hasText: /Wrote “small print” to App\.jsx/ }).waitFor();
  // Undo writes the old words back
  await toast.getByRole('button', { name: 'Undo' }).click();
  assert.ok(await fileHas(source, '>tiny print</span>'), 'Undo wrote the old words back');
  assert.deepEqual(errors, []);
});

test('Esc puts the words back and writes nothing; clicking away saves', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors } = await open(t, launched, url);
  const was = await readFile(source, 'utf8');

  await dblclickWords(page, '#tiny');
  await editable(page, '#tiny');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('never kept');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#tiny').textContent(), 'tiny print', 'Esc put the words back');
  await page.waitForTimeout(500);
  assert.equal(await readFile(source, 'utf8'), was, 'nothing was written');

  await dblclickWords(page, '#tiny');
  await editable(page, '#tiny');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('fine print');
  await page.mouse.click(1100, 1400); // somewhere else on the page
  assert.ok(await fileHas(source, '>fine print</span>'), 'clicking away saved');
  assert.deepEqual(errors, []);
});

test('words beside other elements are edited over their own line; a prop is edited where it is passed; an expression says why it can\'t be', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);

  // "Plain words," sits beside a <b> and an <em>: a textarea over its line, the page re-flowing behind it
  await dblclickWords(page, '#prose');
  const area = overlay.locator('.tx-area');
  await area.waitFor({ timeout: 10000 });
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Simple words,');
  assert.match(await page.locator('#prose').textContent(), /^Simple words, bold words/);
  await page.keyboard.press('Enter');
  assert.ok(await fileHas(source, '>Simple words, <b'), 'the run was written beside its siblings');
  assert.equal(await area.count(), 0);

  // once the page has settled after the write: the sync row's title is a prop where the row is used, and is edited
  // there; a grid cell's number is an expression ({i + 1}), and says why it can't be
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.evaluate(() => window.scrollTo(0, 0));
  await dblclickWords(page, '#sync-row > div > span:first-child');
  await editable(page, '#sync-row > div > span:first-child');
  await overlay.locator('.tx-tag').filter({ hasText: /App\.jsx:\d+/ }).waitFor();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Sync the calendar');
  await page.keyboard.press('Enter');
  assert.ok(await fileHas(source, 'title="Sync the calendar"'), 'the prop was written where the row is used');
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.locator('#dense').scrollIntoViewIfNeeded();
  await dblclickWords(page, '#dense span:first-child');
  const tag = overlay.locator('.tx-tag[data-kind="refused"]');
  await tag.waitFor({ timeout: 10000 });
  assert.match(await tag.innerText(), /expression/i);
  assert.equal(await page.locator('#dense span').first().getAttribute('contenteditable'), null);
  assert.deepEqual(errors, []);
});

test('in blueprint, a double-click edits words through the glass, and the keys reach them', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock .say').filter({ hasText: /problems? in view|nothing to fix/ }).waitFor({ timeout: 30000 });

  await dblclickWords(page, '#tiny');
  await editable(page, '#tiny');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('fine words'); // Space and letters reach the words, not the glass
  await page.keyboard.press('Enter');
  assert.ok(await fileHas(source, '>fine words</span>'), 'written from blueprint');
  // Enter saved, it did not leave blueprint; a dev server that reloads the page brings blueprint back with it
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.bp-toggle')?.getAttribute('aria-pressed') === 'true', null, { timeout: 10000 });
  assert.deepEqual(errors, []);
});

test('words in something clickable: a plain double-click leaves them be; Alt + double-click edits them and presses nothing', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const button = '#sync-row button';
  await page.locator(button).evaluate((b) => { b.dataset.pressed = '0'; b.addEventListener('click', () => { b.dataset.pressed = String(+b.dataset.pressed + 1); }); });
  // plain: the button takes its clicks, as it would for anyone; nothing is edited
  await dblclickWords(page, button);
  await page.waitForTimeout(800);
  assert.equal(await page.locator(button).getAttribute('contenteditable'), null, 'a plain double-click does not edit a button');
  assert.equal(await page.locator(button).getAttribute('data-pressed'), '2');
  // Alt: the clicks stay off the page, no card is left open, the words are edited
  await page.keyboard.down('Alt');
  await dblclickWords(page, button);
  await page.keyboard.up('Alt');
  await editable(page, button);
  assert.equal(await page.locator(button).getAttribute('data-pressed'), '2', 'Alt kept the clicks off the button');
  assert.equal(await overlay.locator('.w:not([hidden]) .card').count(), 0, 'no reading card is left pinned');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Run it now');
  assert.equal(await page.locator(button).textContent(), 'Run it now');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(button).getAttribute('data-pressed'), '2', 'Space typed a space; it did not press the button');
  assert.ok(await fileHas(source, 'action="Run it now"'), 'the prop was written where the row is used');
  assert.deepEqual(errors, []);
});

test('every write is in the dock\'s history, newest first, and each can be undone from there', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const was = await readFile(source, 'utf8');
  const write = async (words) => {
    await page.waitForFunction(() => window.__plumb?.overlay);
    await page.evaluate(() => window.__plumb.ready());
    await dblclickWords(page, '#tiny');
    await editable(page, '#tiny');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(words);
    await page.keyboard.press('Enter');
    assert.ok(await fileHas(source, `>${words}</span>`));
    await page.waitForTimeout(1500); // the demo's dev server reloads the page after a write
  };
  await write('first words');
  await write('second words');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await overlay.getByRole('button', { name: 'Recent writes' }).click();
  const list = overlay.getByRole('dialog', { name: 'Recent writes' });
  await list.locator('.row').nth(1).waitFor();
  const labels = await list.locator('.row .label').allInnerTexts();
  assert.match(labels[0], /second words/, `newest first: ${labels}`);
  assert.match(labels[1], /first words/);
  // the newest is undone from the list, then the older one: the file is as it was
  await list.locator('.row').first().getByRole('button', { name: 'Undo' }).click();
  assert.ok(await fileHas(source, '>first words</span>'), 'the newest write was undone');
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await overlay.getByRole('button', { name: 'Recent writes' }).click();
  await list.locator('.row').filter({ hasText: 'first words' }).getByRole('button', { name: 'Undo' }).click();
  for (let i = 0; i < 100 && (await readFile(source, 'utf8')) !== was; i++) await page.waitForTimeout(100);
  assert.equal(await readFile(source, 'utf8'), was, 'both undone: the file is exactly as it was');
  assert.deepEqual(errors, []);
});

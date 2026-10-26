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
  const toast = overlay.locator('.tx-toast');
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

test('words mixed with other elements are edited over their own line; words from a prop say why they can\'t be', { timeout: 120000 }, async (t) => {
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

  // the sync row's title is a prop of the row: it says why, and where (once the page has settled after the write)
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.evaluate(() => window.scrollTo(0, 0));
  await dblclickWords(page, '#sync-row > div > span:first-child');
  const tag = overlay.locator('.tx-tag[data-kind="refused"]');
  await tag.waitFor({ timeout: 10000 });
  assert.match(await tag.innerText(), /expression|prop|not written/i);
  assert.equal(await page.locator('#sync-row > div > span:first-child').getAttribute('contenteditable'), null);
  assert.deepEqual(errors, []);
});

test('in blueprint, a double-click edits words through the glass, and the keys reach them', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, source } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock .say').filter({ hasText: /off in view|all true/ }).waitFor({ timeout: 30000 });

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

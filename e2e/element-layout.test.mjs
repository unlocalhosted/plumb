// The element card's second layer (docs/briefs/element-card-overlay.md, layer 2). The spacing grammar on the element:
// point near an edge and that side's padding shows; one wheel notch is one step of the spacing scale; ⌘ lights and
// changes every side; it writes when the hand stops, Esc puts it back; a drag across a gap steps per 10px; pointing
// inside a child edits the child. Layout ›: Flex | Grid, and "Rows follow these columns" writes subgrid on the rows'
// own line. Every write is said with Undo, and Undo restores the file exactly.
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
  const root = await mkdtemp(join(repo, 'fixtures/.element-layout-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t, id, at) {
  const launched = await browser(t); if (!launched) return null;
  const { root, url } = await demo(t);
  const file = join(root, 'src/App.jsx'), original = await readFile(file, 'utf8');
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}?corners`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), el = page.locator(id);
  await el.scrollIntoViewIfNeeded();
  await el.click({ modifiers: ['Alt'], position: await at(el) });
  await overlay.locator('.ec .drill[data-open="shadow"]').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  const read = () => readFile(file, 'utf8');
  // a write to this file may make the dev server reload the page: wait for that to be over (Blueprint and the card come
  // back on their own), so the next step isn't cut off by it
  const settle = async (mark) => {
    if (await page.waitForFunction(() => !window.__mark, null, { timeout: 2500 }).then(() => true, () => false)) {
      await page.waitForFunction(() => window.__plumb?.overlay && !document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.ec')?.hidden, null, { timeout: 20000 });
      await page.waitForTimeout(300);
    }
    void mark;
  };
  const marked = () => page.evaluate(() => { window.__mark = true; });
  const undo = async () => {
    await marked();
    await overlay.locator('.fx .said .undo').click();
    await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 30000 });
    assert.equal(await read(), original, 'Undo restores the file exactly');
    await settle();
  };
  return { page, overlay, el, original, read, undo, errors, settle, marked };
}
const bub = (page) => page.evaluate(() => { const b = document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : ''; });
const bands = (page, kind) => page.evaluate((k) => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll(`.sp-band.${k}`).length, kind);
// the rows follow the list's columns: a row's second thing starts where the list's second column does
const follows = (page) => page.evaluate(() => {
  const ul = document.getElementById('rows'), cs = getComputedStyle(ul), w = parseFloat(cs.gridTemplateColumns), x = ul.getBoundingClientRect().left + w + parseFloat(cs.columnGap || 0);
  return [...ul.querySelectorAll('li')].every((li) => Math.abs(li.children[1].getBoundingClientRect().left - x) < 1.5);
});
const said = (overlay, re) => overlay.locator('.fx .said').filter({ hasText: re }).waitFor({ timeout: 20000 });

test('Spacing on the element: point at an edge, scroll a step, Esc puts back; ⌘ lights every side and writes them all; a drag across a gap steps per 10px; a child is edited through', { timeout: 150000 }, async (t) => {
  // #wrapper: flex flex-col gap-[9px] p-[13px], its rows inside it
  const o = await open(t, '#wrapper', async () => ({ x: 4, y: 4 })); if (!o) return;
  const { page, overlay, el, original, read, undo, errors, settle, marked } = o;
  const box = await el.boundingBox(), left = { x: box.x + 5, y: box.y + box.height / 2 };

  // pointing near the left edge: that side's padding, 13 off the scale, the hierarchy rule in words
  await page.mouse.move(left.x, left.y);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sp-band.pad').length === 1);
  assert.match(await bub(page), /^13 padding left/);
  assert.equal(await page.evaluate(() => !!document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub b.off')), true, '13 is off the scale');
  assert.match(await bub(page), /Around: at least the gap between \(9\)/);

  // one notch up is one step: 16 · s4 on the element at once; Esc puts it back, nothing written
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('wrapper')).paddingLeft === '16px');
  assert.match(await bub(page), /^16 · s4 padding left/);
  assert.equal(await el.evaluate((n) => getComputedStyle(n).paddingTop), '13px', 'one side only');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('wrapper')).paddingLeft === '13px');
  assert.equal(await el.evaluate((n) => n.getAttribute('style') ?? ''), '');
  await page.waitForTimeout(900);
  assert.equal(await read(), original, 'Esc wrote nothing');

  // ⌘ held: every side lights; a notch up and the hand stops: all four written as one class
  await page.mouse.move(left.x, left.y + 2);
  await marked();
  await page.keyboard.down('Meta');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sp-band.pad').length === 4);
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Meta');
  await said(overlay, /padding all sides 16px/);
  await settle();
  assert.match(await read(), /id="wrapper" className="flex flex-col gap-\[9px\] rounded-card bg-surface p-s4 shadow-rest"/);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('wrapper')).paddingTop === '16px', null, { timeout: 20000 });
  assert.equal(await el.evaluate((n) => n.getAttribute('style') ?? ''), '', 'the preview is lifted once written');
  await undo();

  // a drag down across the gap between two rows: a step per 10px (9 → 12 → 16), written on release
  const a = await page.locator('#dense').boundingBox(), b = await page.locator('#rows').boundingBox();
  const gap = { x: a.x + a.width / 2, y: (a.y + a.height + b.y) / 2 };
  await page.mouse.move(gap.x, gap.y);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sp-band.gap').length > 0);
  assert.match(await bub(page), /^9 gap/);
  await marked();
  await page.mouse.down();
  await page.mouse.move(gap.x, gap.y + 22, { steps: 6 });
  assert.match(await bub(page), /^16 · s4 gap/);
  await page.mouse.up();
  await said(overlay, /gap 16px/);
  assert.match(await read(), /id="wrapper" className="flex flex-col gap-s4 rounded-card/);
  await settle();
  assert.equal(await overlay.locator('.ec').isVisible(), true, 'the drag never counts as a click outside');
  await undo();

  // inside a child: the child's own padding, edited through (its box drawn, not the element's); the page is scrolled so
  // the child is clear of the fix bar (pointing at the bar is pointing at the bar)
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(200);
  const nb = await page.locator('#nested-button').boundingBox();
  await page.mouse.move(nb.x + 3, nb.y + nb.height / 2);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sp-band.pad').length === 1);
  const drawn = await page.evaluate(() => { const r = document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-box').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  assert.deepEqual(drawn, [Math.round(nb.width), Math.round(nb.height)]);
  assert.match(await bub(page), /^12 · s3 padding left/);
  assert.deepEqual(errors, []);
});

test('Layout ›: Flex | Grid, the layouts strip, and "Rows follow these columns" writes subgrid on the rows’ own line; Undo restores it', { timeout: 150000 }, async (t) => {
  // #rows: a list (flex flex-col gap-s1) of four rows drawn by one line; Alt+click in the gap between two of them
  const o = await open(t, '#rows', async (el) => { const [r1, r2] = await el.locator('li').evaluateAll((ls) => ls.slice(0, 2).map((l) => l.getBoundingClientRect().toJSON())); const b = await el.boundingBox(); return { x: 30, y: (r1.bottom + r2.top) / 2 - b.y }; }); if (!o) return;
  const { page, overlay, el, read, undo, errors, settle, marked } = o;
  const card = overlay.locator('.ec'), strip = overlay.locator('.ec-strip');
  assert.match(await card.locator('.drill[data-open="layout"]').innerText(), /Layout[\s\S]*Flex · Stacked/);

  await card.locator('.drill[data-open="layout"]').click();
  await strip.locator('.shot').first().waitFor();
  assert.equal(await strip.locator('.shot[aria-current]').getAttribute('data-key'), 'l:stack', 'the layout it has comes first');
  assert.ok(await strip.locator('.shot[data-key="l:lined"]').count(), 'rows with things in them can line up');
  assert.match(await card.locator('.writes').innerText(), /how it’s written now/);
  // pointing at a layout tries it on the element; leaving puts it back
  await strip.locator('.shot[data-key="l:two"]').hover();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('rows')).display === 'grid');
  await card.hover();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('rows')).display === 'flex');

  // Grid: the columns as chips, lines on the element; the rows follow them
  await card.locator('[data-lmode="grid"]').click();
  await card.locator('.lay-tk').first().waitFor();
  assert.deepEqual(await card.locator('.lay-tk[data-tk]').allInnerTexts(), ['auto', '1fr']);
  assert.equal(await el.evaluate((n) => getComputedStyle(n).display), 'grid');
  assert.equal(await overlay.locator('.lay-line').count(), 1, 'one line between two columns');
  await card.locator('[data-lsub]').click();
  assert.equal(await card.locator('[data-lsub]').getAttribute('aria-checked'), 'true');
  assert.equal(await follows(page), true, 'each row follows the two columns');
  const writes = await card.locator('.writes').innerText();
  assert.match(writes, /- flex flex-col[\s\S]*\+ grid grid-cols-\[auto_1fr\]/, writes);
  assert.match(writes, /4 like it, one line of code[\s\S]*- flex[\s\S]*\+ col-span-full grid grid-cols-subgrid/, writes);

  await marked();
  await card.locator('.use').click();
  await said(overlay, /is a grid now, its rows follow its columns/);
  await settle();
  const now = await read();
  assert.match(now, /id="rows" className="grid grid-cols-\[auto_1fr\] gap-s1"/);
  assert.match(now, /<li key=\{word\} className="col-span-full grid grid-cols-subgrid items-center justify-between/);
  for (let i = 0; i < 40 && !(await follows(page)); i++) await page.waitForTimeout(250);
  assert.equal(await follows(page), true, 'written, the rows still follow the columns');
  await undo();
  assert.deepEqual(errors, []);
});

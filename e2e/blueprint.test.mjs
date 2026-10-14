// Blueprint mode as a person uses it: Alt+B turns the app into its blueprint with every drift in view drawn where it
// lives; a mark opens its chooser, picks preview on the page and Write puts them in source; leaving puts the page back exactly. Real Vite, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
    t.after(() => browser.close());
    return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}

async function demo(t, { html } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.blueprint-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  if (html) await writeFile(join(root, 'index.html'), html((await readFile(join(root, 'index.html'), 'utf8'))));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t, launched, url, { motion = false } = {}) {
  const page = await launched.newPage({ reducedMotion: motion ? 'no-preference' : 'reduce', viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors, overlay: page.locator('plumb-overlay') };
}

// Everything blueprint mode could leave on the host page: <html>'s attributes, every inline style, every Plumb
// attribute on an element, and Plumb's stylesheets.
const footprint = (page) =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter((e) => !e.closest('plumb-overlay'));
    return JSON.stringify({
      html: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value}`).sort(),
      styles: all.filter((e) => e.hasAttribute('style')).map((e) => e.getAttribute('style')),
      plumb: all.filter((e) => [...e.attributes].some((a) => a.name.startsWith('data-plumb-') && a.name !== 'data-plumb-source')).length,
      sheets: document.querySelectorAll('style[data-plumb]').length,
    });
  });

const say = (overlay) => overlay.locator('.dock .say');
const hits = (overlay) => overlay.locator('.bp .hit');

test('Alt+B draws every drift in view where it lives, and the dock counts them', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);

  await page.keyboard.press('Alt+B');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plumb-blueprint')), true);
  // the page is re-inked: fills cleared, words white
  const row = await page.locator('#sync-row').evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  assert.equal(row.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(row.color, 'rgb(255, 255, 255)');
  // reading, then the count
  await say(overlay).filter({ hasText: /\d+ off in view · Alt\+B/ }).waitFor({ timeout: 20000 });
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  for (const drift of ['gap-[10px]', 'py-[10px]', 'px-[14px]', 'rounded-[14px]', 'text-[13.5px]', 'gap-[3px]', 'rounded-[5px]']) assert.ok(labels.some((l) => l.includes(drift)), `a mark for ${drift}`);
  const count = Number((await say(overlay).innerText()).match(/(\d+) off/)[1]);
  assert.equal(count, labels.filter((l) => l.startsWith('Drift:')).length, 'the dock counts the drift marks drawn');
  // every mark is a button you can name and reach
  for (const rect of await hits(overlay).all()) {
    assert.equal(await rect.getAttribute('role'), 'button');
    assert.equal(await rect.getAttribute('tabindex'), '0');
  }
  // the gap's mark sits in the gap, between the avatar and the text column
  const gap = await page.evaluate(() => {
    const row = document.getElementById('sync-row');
    const [a, b] = [...row.children].map((c) => c.getBoundingClientRect());
    const hit = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].find((r) => r.getAttribute('aria-label').includes('gap-[10px]'));
    const r = hit.getBoundingClientRect();
    return { mid: r.left + r.width / 2, from: a.right, to: b.left };
  });
  assert.ok(gap.mid >= gap.from - 2 && gap.mid <= gap.to + 2, `the gap mark is in the gap (${JSON.stringify(gap)})`);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []);
});

test('Leaving puts the page back exactly, and nothing keeps listening', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view|all true/ }).waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));

  assert.equal(await footprint(page), before, 'no attribute, inline style or stylesheet is left behind');
  assert.equal(await hits(overlay).count(), 0);
  assert.match(await say(overlay).innerText(), /Plumb · Alt to inspect/);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'false');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await hits(overlay).count(), 0, 'scrolling draws nothing once the mode is off');
  // Esc also leaves
  await page.keyboard.press('Alt+B');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.equal(await footprint(page), before);
  assert.deepEqual(errors, []);
});

const chooser = (overlay) => overlay.locator('.ch .card[role="dialog"]');
const markFor = (overlay, text) => hits(overlay).and(overlay.locator(`[aria-label*="${text}"]`));
// a real click on the mark's box (Playwright's click would scroll the page to reach a fixed SVG rect, moving every mark)
async function clickMark(page, overlay, text) {
  const mark = markFor(overlay, text);
  await mark.waitFor();
  const b = await mark.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const dock = (overlay) => overlay.locator('.dock');
// pick a step by the token it names, in whichever form the family uses
const pickStep = (overlay, token) => chooser(overlay).locator('.cmp .opt[data-pick]').filter({ hasText: token }).first().click();
const noMark = (page, text) => page.waitForFunction((t) => ![...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((r) => r.getAttribute('aria-label').includes(t)), text, { timeout: 15000 });

test('A mark opens its chooser; a pick previews on the page; Write puts it in source and the mark goes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);

  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });
  const before = Number((await say(overlay).innerText()).match(/(\d+) off/)[1]);
  await clickMark(page, overlay, 'gap-[10px]');
  // the chooser, beside the row, names the finding and offers the family's steps; nothing opens the reading card
  const ch = chooser(overlay);
  await ch.waitFor();
  assert.match(await ch.getAttribute('aria-label'), /Choose a token for gap-\[10px\] hardcodes 10px/);
  assert.equal(await overlay.locator('.w:not([hidden])').count(), 0, 'the reading card stays closed');
  const row = await page.locator('#sync-row').boundingBox(), box = await ch.boundingBox();
  assert.ok(box.x >= row.x + row.width || box.x + box.width <= row.x || box.y >= row.y + row.height || box.y + box.height <= row.y, 'the chooser stands beside the element, never over it');
  await ch.locator('.read .edit').filter({ hasText: /2 tokens fit/ }).waitFor();

  // pointing at a step previews it on the page; leaving puts it back
  const s2 = ch.locator('.cmp .opt[data-pick]').filter({ hasText: /s2/ }).first();
  await s2.hover();
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px');
  await page.mouse.move(5, 5);
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '10px');

  // picking keeps the preview; the mark says what it becomes; the dock counts the pick and offers Write
  await s2.click();
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px');
  await overlay.locator('.bp .hit[aria-label*="gap-[10px]"][aria-label*="Picked gap-s2"]').waitFor();
  await say(overlay).filter({ hasText: `${before} off · 1 picked` }).waitFor();
  await ch.locator('.change').filter({ hasText: /gap-s2/ }).waitFor();

  // Write: one edit lands in source, the preview lifts once the page carries it, the mark leaves, the count drops
  await dock(overlay).getByRole('button', { name: 'Write 1' }).click();
  await say(overlay).filter({ hasText: 'Wrote 1 edit to App.jsx' }).waitFor({ timeout: 15000 });
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /gap-s2 py-\[10px\]/);
  await noMark(page, 'gap-[10px]');
  await page.waitForFunction(() => document.getElementById('sync-row').getAttribute('style') === null, null, { timeout: 15000 });
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the page carries the change from source');
  await overlay.locator('.bp .hit[aria-label*="py-[10px]"]').waitFor({ timeout: 15000 }); // the row’s other drift is still marked
  await say(overlay).filter({ hasText: `${before - 1} off in view` }).waitFor({ timeout: 15000 });
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plumb-blueprint')), true, 'blueprint stays on');
  assert.deepEqual(errors, []);
});

test('Several drifts are picked from their marks and written together, one apply per file', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });

  await clickMark(page, overlay, 'rounded-[14px]');
  await chooser(overlay).locator('.cmp').waitFor();
  const radius = await chooser(overlay).locator('.cmp .opt[data-pick]').first();
  const token = (await radius.getAttribute('aria-label')).split(',')[0];
  await radius.click();
  await chooser(overlay).locator('.nav').waitFor();
  await clickMark(page, overlay, 'gap-[3px]');
  await chooser(overlay).filter({ hasText: /gap-\[3px\]/ }).waitFor();
  await pickStep(overlay, /s1/);
  await say(overlay).filter({ hasText: /2 picked/ }).waitFor();
  assert.notEqual(await page.locator('#sync-row').getAttribute('style'), null);
  assert.notEqual(await page.locator('#beta-chip').getAttribute('style'), null);

  await chooser(overlay).getByRole('button', { name: 'Write 2 edits' }).click();
  await say(overlay).filter({ hasText: 'Wrote 2 edits to App.jsx' }).waitFor({ timeout: 15000 });
  const source = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.match(source, new RegExp(`px-\\[14px\\] ${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} bg-white`));
  assert.match(source, /gap-s1 rounded-\[5px\]/);
  await noMark(page, 'rounded-[14px]');
  await noMark(page, 'gap-[3px]');
  await page.waitForFunction(() => document.getElementById('sync-row').getAttribute('style') === null && document.getElementById('beta-chip').getAttribute('style') === null, null, { timeout: 15000 });
  assert.deepEqual(errors, []);
});

test('Undo lifts every pick; a pressed step unpicks; leaving blueprint leaves nothing previewed', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  const before = await footprint(page);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });

  await clickMark(page, overlay, 'gap-[10px]');
  await pickStep(overlay, /s2/);
  await say(overlay).filter({ hasText: /1 picked/ }).waitFor();
  // the pressed step, clicked again, unpicks
  await chooser(overlay).locator('.cmp .opt[aria-pressed="true"]').click();
  await say(overlay).filter({ hasText: /off in view · Alt\+B/ }).waitFor();
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null);
  // Undo from the dock lifts picks on more than one element
  await pickStep(overlay, /s2/);
  await clickMark(page, overlay, 'gap-[3px]');
  await pickStep(overlay, /s1/);
  await say(overlay).filter({ hasText: /2 picked/ }).waitFor();
  await dock(overlay).getByRole('button', { name: 'Undo' }).click();
  await say(overlay).filter({ hasText: /off in view · Alt\+B/ }).waitFor();
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null);
  assert.equal(await page.locator('#beta-chip').getAttribute('style'), null);
  // picks pending when the mode is left are lifted with it
  await pickStep(overlay, /s1/);
  await page.keyboard.press('Escape'); // closes the chooser
  await chooser(overlay).waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape'); // leaves blueprint
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.equal(await footprint(page), before, 'nothing is left on the page');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written');
});

test('A write the server refuses as stale is said so; Read again recovers the pick and writes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'gap-[10px]');
  await pickStep(overlay, /s2/);
  await say(overlay).filter({ hasText: /1 picked/ }).waitFor();

  // The first apply is answered as the server answers a file that changed since it was read (changing the file on
  // disk here would make the dev server reload the page); the next apply reaches the real server.
  let refused = 0;
  await page.route('**/apply', (route) => {
    if (refused++) return route.continue();
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'The file changed since the overlay read it. Read it again.' }) });
  });
  const file = join(root, 'src/App.jsx');
  await dock(overlay).getByRole('button', { name: 'Write 1' }).click();
  await say(overlay).filter({ hasText: 'App.jsx changed since Plumb read it' }).waitFor({ timeout: 15000 });
  assert.match(await readFile(file, 'utf8'), /gap-\[10px\] py-\[10px\]/, 'nothing was written');
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the preview stays');
  await overlay.locator('.bp .hit[aria-label*="Picked gap-s2"]').waitFor();
  await dock(overlay).getByRole('button', { name: 'Read again' }).click();
  await dock(overlay).getByRole('button', { name: 'Write 1' }).waitFor({ timeout: 15000 });
  await dock(overlay).getByRole('button', { name: 'Write 1' }).click();
  await say(overlay).filter({ hasText: 'Wrote 1 edit to App.jsx' }).waitFor({ timeout: 15000 });
  assert.match(await readFile(file, 'utf8'), /gap-s2 py-\[10px\]/);
  assert.equal(refused, 2);
});

test('Keyboard only: Tab reaches a mark, Enter opens its chooser, a digit picks, Enter writes, Esc returns to the mark', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view/ }).waitFor({ timeout: 20000 });
  const active = () => page.evaluate(() => { const a = document.querySelector('plumb-overlay').shadowRoot.activeElement; return a ? { cls: a.className.baseVal ?? a.className, label: a.getAttribute('aria-label') } : null; });
  let label = null;
  for (let i = 0; i < 40 && !label; i++) {
    await page.keyboard.press('Tab');
    const a = await active();
    label = a?.cls === 'hit' && a.label.includes('gap-[3px]') ? a.label : null;
  }
  assert.ok(label, 'Tab reaches the chip’s gap mark');
  await page.keyboard.press('Enter');
  await chooser(overlay).locator('.cmp .opt').first().waitFor();
  // focus lands on a step; 1 picks the first live step
  assert.match((await active())?.cls ?? '', /opt/);
  await page.keyboard.press('1');
  await say(overlay).filter({ hasText: /1 picked/ }).waitFor();
  assert.equal(await chooser(overlay).locator('.cmp .opt[aria-pressed="true"]').count(), 1);
  // Esc closes the chooser and puts focus back on the mark
  await page.keyboard.press('Escape');
  await chooser(overlay).waitFor({ state: 'hidden' });
  assert.equal((await active())?.cls, 'hit');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plumb-blueprint')), true, 'one Esc closes the chooser only');
  // Enter reopens it; Enter in the chooser writes the queue
  await page.keyboard.press('Enter');
  await chooser(overlay).locator('.cmp .opt').first().waitFor();
  await page.keyboard.press('Enter');
  await say(overlay).filter({ hasText: /Wrote 1 edit to App\.jsx/ }).waitFor({ timeout: 15000 });
  assert.notEqual(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'));
});

test('The field shows on a page that paints both html and body, and both come back after', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t, { html: (s) => s.replace('</head>', '<style>html{background:#111}body{background:#fff;min-height:100vh}</style></head>') });
  const { page } = await open(t, launched, url);
  const original = await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]);
  await page.keyboard.press('Alt+B');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
  // an empty spot of the page shows the blueprint's blue
  const shot = (await page.screenshot({ clip: { x: 1190, y: 400, width: 1, height: 1 } })).toString('base64');
  const [r, g, b] = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    c.drawImage(img, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data];
  }, shot);
  assert.ok(b > 140 && r < 80, `the field is blue there (rgb ${r},${g},${b})`);
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]), original, 'html and body paint what they painted before');
});

test('With motion: turning around mid-sweep and removing the overlay both leave nothing behind', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url, { motion: true });
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await page.waitForTimeout(200);
  await page.keyboard.press('Alt+B'); // turn around mid-sweep
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'), null, { timeout: 5000 });
  assert.equal(await footprint(page), before, 'a reversed sweep leaves nothing behind');

  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-developing'), null, { timeout: 5000 });
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).color), 'rgb(255, 255, 255)', 'the sweep finished re-inking');
  assert.equal(await overlay.locator('.bp .scan').isHidden(), true);

  await page.evaluate(() => document.querySelector('plumb-overlay').remove());
  assert.equal(await footprint(page), before, 'removing the overlay mid-mode leaves nothing behind');
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
});

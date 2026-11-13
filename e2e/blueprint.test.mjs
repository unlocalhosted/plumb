// Blueprint mode as a person uses it: Alt+B turns the app into its blueprint with every drift in view drawn where it
// lives as heat; a glow puts its cause in hand in the fix panel (overlay/src/fixpanel.js), options preview on every place
// of it, Enter takes and A writes them in source; leaving puts the page back exactly. Real Vite, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  // React is pre-bundled up front: Vite's optimizer would otherwise find it on first load and reload the page mid-test
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
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

// Everything blueprint mode could leave on the host page: <html>'s attributes, every inline style, every React Plumber
// attribute on an element, and React Plumber's stylesheets.
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

// blueprint is off once its layer is put away
const off = (page) => page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden !== false);
// the outline drawn for an element, matched by its box
const outlineOf = (page, id) => page.evaluate((id) => {
  const r = document.getElementById(id).getBoundingClientRect();
  const rect = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .outlines rect')].find((o) => Math.abs(+o.getAttribute('x') - r.left - 0.75) < 1 && Math.abs(+o.getAttribute('y') - r.top - 0.75) < 1);
  return rect ? { cls: rect.getAttribute('class'), stroke: getComputedStyle(rect).stroke } : null;
}, id);

test('Leaving puts the page back exactly, and nothing keeps listening', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await page.keyboard.press('Alt+B');
  await off(page);

  assert.equal(await footprint(page), before, 'no attribute, inline style or stylesheet is left behind');
  assert.equal(await hits(overlay).count(), 0);
  assert.match(await say(overlay).innerText(), /Hold Alt to inspect/);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await hits(overlay).count(), 0, 'scrolling draws nothing once the mode is off');
  // Esc also leaves
  await page.keyboard.press('Alt+B');
  await page.keyboard.press('Escape');
  await off(page);
  assert.equal(await footprint(page), before);
  assert.deepEqual(errors, []);
});


const panel = (overlay) => overlay.locator('.fx');
const inHand = (overlay) => overlay.locator('.fx .cause .cls');
const shown = (page, sel) => page.evaluate((sel) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'), sel);

// what the last fix written changed, said above the panel with its Undo
const said = (overlay) => panel(overlay).locator('.said .t');
const markFor = (overlay, text) => hits(overlay).and(overlay.locator(`[aria-label*="${text}"]`));
// a real click on the mark's zone, the way a person makes it: the pointer arrives first, then presses (Playwright's
// click would scroll the page to reach a fixed SVG rect, moving every mark)
async function clickMark(page, overlay, text) {
  const mark = markFor(overlay, text).first();
  await mark.waitFor();
  const [x, y] = (await mark.getAttribute('data-at')).split(',').map(Number); // where the zone is aimed at (its first piece)
  await page.mouse.move(x, y);
  await page.waitForTimeout(250);
  await page.mouse.click(x, y);
}
// the cause named `cls` is put in hand by a click on its glow, with its options read
async function hold(page, overlay, text, cls) {
  // a write may have reloaded the page: Blueprint is back and the page read before a glow is clicked
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  // another cause may be in hand (a take hands on the next one): put it down first
  if (await panel(overlay).locator('.cause').count()) { await page.keyboard.press('Escape'); await panel(overlay).locator('.line').waitFor({ timeout: 5000 }); }
  await clickMark(page, overlay, text);
  await inHand(overlay).filter({ hasText: cls }).waitFor({ timeout: 10000 }).catch(async (e) => { throw new Error(`${e.message}\npanel: ${(await panel(overlay).innerText()).replace(/\s+/g, ' ')}\nmarks: ${(await hits(overlay).evaluateAll((h) => h.map((x) => x.getAttribute('aria-label')))).slice(0, 12).join(' | ')}`); });
}
// pick an option of the cause in hand by the token it names; the page previews it on every place
const pickStep = (overlay, token) => panel(overlay).locator('button.sp', { has: overlay.page().locator('.tk', { hasText: new RegExp(`^${token}$`) }) }).click();
// Enter takes the cause in hand once its exact edit is read, and it is written at once: the panel says what changed
async function take(page, overlay) {
  const before = await said(overlay).innerText({ timeout: 200 }).catch(() => '');
  await panel(overlay).locator('.take:not([disabled])').waitFor({ timeout: 10000 });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 150 && (await said(overlay).innerText({ timeout: 200 }).catch(() => '')) === before; i++) await page.waitForTimeout(100);
  const now = await said(overlay).innerText();
  assert.notEqual(now, before, 'the panel says what the fix changed');
  return now;
}
const dock = (overlay) => overlay.locator('.dock');
// no mark names the text (an applied change reloads the page when the dev server can't hot-swap it: read through it)
async function noMark(page, text) {
  for (let i = 0; ; i++) {
    try { return await page.waitForFunction((t) => { const r = document.querySelector('plumb-overlay')?.shadowRoot; return !!r && !r.querySelector('.bp').hidden && ![...r.querySelectorAll('.bp .hit')].some((h) => h.getAttribute('aria-label').includes(t)); }, text, { timeout: 15000 }); }
    catch (error) { if (i > 3 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
}

test('A glow puts its cause in hand; an option previews on the page; Enter writes it at once, says so, and the mark goes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await hold(page, overlay, 'gap-[10px]', 'gap-[10px]');
  assert.equal(await shown(page, '.ch:not([hidden]) .card[role="dialog"]'), false, 'no card');
  assert.equal(await overlay.locator('.w:not([hidden])').count(), 0, 'the reading card stays closed');
  // the theme's steps are offered; picking one previews it on the page
  await pickStep(overlay, 's2');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('sync-row')).gap === '8px', null, { timeout: 5000 });
  // Enter writes it: the panel says what changed, and offers Undo
  assert.match(await take(page, overlay), /^Changed gap-\[10px\] to gap-s2 at 1 place$/);
  assert.equal(await panel(overlay).locator('.said .undo').count(), 1);
  assert.equal(await panel(overlay).locator('.apply').count(), 0, 'there is no second button to write with');
  for (let i = 0; i < 100 && !/gap-s2 py-\[10px\]/.test(await readFile(join(root, 'src/App.jsx'), 'utf8')); i++) await page.waitForTimeout(100);
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /gap-s2 py-\[10px\]/);
  await noMark(page, 'gap-[10px]');
  await overlay.locator('.bp .hit[aria-label*="py-[10px]"]').waitFor({ timeout: 15000 }); // the row\u2019s other drift is still marked
  assert.deepEqual(errors, []);
});

test('Each cause is written the moment it is taken: two causes, two guarded writes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await hold(page, overlay, 'rounded-[14px]', 'rounded-[14px]');
  await take(page, overlay);
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await pickStep(overlay, 's1');
  await take(page, overlay);
  const file = join(root, 'src/App.jsx');
  for (let i = 0; i < 100 && /gap-\[3px\]/.test(await readFile(file, 'utf8')); i++) await page.waitForTimeout(100);
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /rounded-\[14px\]/);
  assert.match(source, /gap-s1 rounded-\[5px\]/);
  assert.equal(writes, 2, 'one write per fix');
  await noMark(page, 'rounded-[14px]');
  await noMark(page, 'gap-[3px]');
  assert.deepEqual(errors, []);
});

test('Leaving blueprint with causes tried but not taken leaves nothing previewed and nothing written', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  const before = await footprint(page);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await hold(page, overlay, 'gap-[10px]', 'gap-[10px]');
  await pickStep(overlay, 's2');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('sync-row')).gap === '8px', null, { timeout: 5000 });
  // a second cause in hand, tried, and left untaken
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await pickStep(overlay, 's1');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('beta-chip')).gap === '4px', null, { timeout: 5000 });
  // Esc puts the cause in hand down: what was tried is lifted, and the first cause tried is as it was too
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('beta-chip')).gap === '3px', null, { timeout: 5000 });
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '10px', 'a step only tried is not kept');
  for (let i = 0; i < 4 && await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden === false); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await off(page);
  assert.equal(await footprint(page), before, 'nothing is left on the page');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written');
});

test('A write the server refuses as stale writes nothing: the fix comes back in hand and says why', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  await hold(page, overlay, 'gap-[10px]', 'gap-[10px]');
  await pickStep(overlay, 's2');
  // The write is answered as the server answers a file that changed since it was read (changing the file on disk
  // here would make the dev server reload the page).
  let refused = 0;
  await page.route('**/swaps', (route) => {
    refused++;
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'The file changed since the overlay read it. Read it again.' }) });
  });
  const file = join(root, 'src/App.jsx');
  await panel(overlay).locator('.take:not([disabled])').waitFor({ timeout: 10000 });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 50 && !refused; i++) await page.waitForTimeout(100);
  assert.equal(refused, 1, 'the write was sent, once');
  // the same fix is back in hand, saying why, ready to try again
  await panel(overlay).locator('.say.err').filter({ hasText: 'This file changed after we checked it' }).waitFor({ timeout: 15000 });
  await inHand(overlay).filter({ hasText: 'gap-[10px]' }).waitFor({ timeout: 5000 });
  assert.equal(await panel(overlay).locator('.said').count(), 0, 'nothing is said to have changed');
  assert.equal(await readFile(file, 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing was written');
});

// The fix panel's phases (fixpanel.js): a write in flight is a fact of its own, so leaving while it runs never loses
// it. Esc mid-write leaves Blueprint at once; the write still lands, and its Undo goes to History's toast.
test('Esc while a fix is being written leaves Blueprint; the write still lands and History offers its Undo', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await hold(page, overlay, 'gap-[10px]', 'gap-[10px]');
  await pickStep(overlay, 's2');
  // the write is held for a moment, as a slow disk or a busy dev server would
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route('**/swaps', async (route) => { await held; await route.continue(); });
  await panel(overlay).locator('.take:not([disabled])').waitFor({ timeout: 10000 });
  await page.keyboard.press('Enter');
  await panel(overlay).locator('.writing').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await off(page);
  release();
  // the write lands even though the panel is gone, and History says it with its Undo
  const file = join(root, 'src/App.jsx');
  for (let i = 0; i < 100 && !/gap-s2 py-\[10px\]/.test(await readFile(file, 'utf8')); i++) await page.waitForTimeout(100);
  assert.match(await readFile(file, 'utf8'), /gap-s2 py-\[10px\]/);
  // the demo's dev server reloads the page for this write; the page it brings back is as the person left it: out of
  // Blueprint, with the write said by History
  await page.waitForFunction(() => performance.getEntriesByType('navigation')[0]?.type === 'reload', null, { timeout: 15000 });
  await overlay.locator('.wt:not([hidden]) .undo').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500); // the resume step runs 120 ms after load: time for it to turn Blueprint on, if it would
  assert.equal(await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden !== false), true, 'Blueprint stays off');
  // back in Blueprint, the panel is at rest: nothing is still "writing"
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  assert.equal(await panel(overlay).locator('.writing').count(), 0, 'the panel is not stuck writing');
  assert.deepEqual(errors, []);
});

// Tab to the glow whose line names `text`; returns the label
async function tabTo(page, text) {
  const active = () => page.evaluate(() => { const a = document.querySelector('plumb-overlay').shadowRoot.activeElement; return a ? { cls: a.className.baseVal ?? a.className, label: a.getAttribute('aria-label') } : null; });
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const a = await active();
    if (a?.cls === 'hit' && a.label.includes(text)) return a.label;
  }
  return null;
}

test('Keyboard only: Tab reaches a glow, Enter puts a cause in hand, → walks to the one wanted, arrows pick, Enter writes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  assert.ok(await tabTo(page, 'gap-[3px]'), 'Tab reaches the chip\u2019s gap glow');
  await page.keyboard.press('Enter');
  await inHand(overlay).waitFor({ timeout: 10000 });
  // → walks the causes until the chip\u2019s gap is in hand
  for (let i = 0; i < 30 && !/gap-\[3px\]/.test(await inHand(overlay).first().innerText().catch(() => '')); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); }
  await inHand(overlay).filter({ hasText: 'gap-[3px]' }).waitFor({ timeout: 5000 });
  await panel(overlay).locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  await page.keyboard.press('ArrowUp');
  await take(page, overlay);
  const file = join(root, 'src/App.jsx');
  const was = await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8');
  for (let i = 0; i < 100 && (await readFile(file, 'utf8')) === was; i++) await page.waitForTimeout(100);
  assert.notEqual(await readFile(file, 'utf8'), was);
});

test('Undo takes the fix just written back: the file is as it was and the fix is offered again', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await take(page, overlay);
  const file = join(root, 'src/App.jsx');
  const was = await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8');
  for (let i = 0; i < 60 && (await readFile(file, 'utf8')) === was; i++) await page.waitForTimeout(100);
  assert.notEqual(await readFile(file, 'utf8'), was, 'written at once');
  await panel(overlay).locator('.said .undo').click();
  await overlay.locator('.wt:not([hidden]), .fx .said .t').filter({ hasText: 'Undone' }).first().waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && (await readFile(file, 'utf8')) !== was; i++) await page.waitForTimeout(100);
  assert.equal(await readFile(file, 'utf8'), was, 'the file is back as it was');
  // the fix is offered again
  await overlay.locator('.bp .hit[aria-label*="gap-[3px]"]').waitFor({ state: 'attached', timeout: 15000 }).catch(async (e) => {
    const dump = await page.evaluate(() => ({ chip: document.getElementById('beta-chip')?.className, hits: [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => h.getAttribute('aria-label')).slice(0, 30), panel: document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText }));
    throw new Error(`${e.message}\n${JSON.stringify(dump, null, 1)}`);
  });
});

test('Enter on a glow that has focus puts that glow\u2019s cause in hand', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  const label = await tabTo(page, 'gap-[3px]');
  assert.ok(label, 'Tab reaches the chip\u2019s gap glow');
  await page.keyboard.press('Enter');
  await inHand(overlay).waitFor({ timeout: 10000 });
  assert.equal(await inHand(overlay).first().innerText(), 'gap-[3px]', 'Enter on the focused glow holds its own cause, not the first cause');
});

// One pixel of the rendered page, as [r, g, b].
const pixel = async (page, x, y) => {
  const shot = (await page.screenshot({ clip: { x, y, width: 1, height: 1 } })).toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    c.drawImage(img, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, shot);
};

test('Registration keeps the page as it is: a coloured spot is its own pixel under blueprint, and after', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t, { html: (s) => s.replace('</head>', '<style>html{background:#111}body{background:#fff;min-height:100vh}</style></head>').replace('</body>', '<div style="position:fixed;right:0;top:300px;width:40px;height:200px;background:#2f5bd3"></div></body>') });
  const { page } = await open(t, launched, url);
  const paint = () => page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]);
  const original = await paint();
  const [r0, g0, b0] = await pixel(page, 1190, 400);
  assert.ok(b0 > 180 && r0 < 80, `the page is blue there (rgb ${r0},${g0},${b0})`);
  await page.keyboard.press('Alt+B');
  await page.locator('plumb-overlay').locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  assert.deepEqual(await paint(), original, 'html and body keep their own paint');
  assert.deepEqual(await pixel(page, 1190, 400), [r0, g0, b0], 'nothing is dimmed or tinted where nothing is off');
  await page.keyboard.press('Alt+B');
  await off(page);
  assert.deepEqual(await paint(), original);
  assert.deepEqual(await pixel(page, 1190, 400), [r0, g0, b0], 'the pixel is as it was');
});

test('A weight is never said as pixels: the cause in hand names it and says it in words', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  assert.doesNotMatch(await markFor(overlay, 'font-semibold').first().getAttribute('aria-label'), /\d\s*px/);
  await hold(page, overlay, 'font-semibold', 'font-semibold');
  const words = await panel(overlay).innerText();
  assert.match(words, /font-semibold/);
  assert.doesNotMatch(words, /\b[1-9]00\s*px/, `a weight is not a length: ${words}`);
  for (const v of await panel(overlay).locator('.sp .v').allInnerTexts()) assert.doesNotMatch(v, /px$/, 'a weight option carries no unit');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

test('While blueprint is on the page is read, not used: clicks, hovers and keys stay out, scroll works, Space lets the page through', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const bench = `<div id="bench" style="position:fixed;left:12px;top:320px;width:220px;background:#fff">
    <button id="poke" onclick="this.dataset.n = +(this.dataset.n || 0) + 1">Poke</button>
    <input id="field">
    <div id="box" style="height:80px;overflow:auto"><div style="height:600px">tall</div></div>
  </div><div style="height:3000px"></div>`;
  const { url } = await demo(t, { html: (s) => s.replace('</body>', `${bench}</body>`) });
  const { page, errors } = await open(t, launched, url);
  const before = await footprint(page);
  const centre = async (sel) => { const b = await page.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const pokes = () => page.locator('#poke').evaluate((el) => +(el.dataset.n || 0));

  await page.locator('#field').focus();
  await page.keyboard.press('Alt+B');
  assert.equal(await page.evaluate(() => document.activeElement?.id ?? ''), '', 'what had focus on the page lets go of it');

  // a click on a button, and a hover over it, never reach it
  const poke = await centre('#poke');
  await page.mouse.move(...poke);
  assert.equal(await page.locator('#poke').evaluate((el) => el.matches(':hover')), false, 'the page shows no hover');
  await page.mouse.click(...poke);
  assert.equal(await pokes(), 0, 'the click did not press the button');
  // typing lands nowhere on the page
  await page.mouse.click(...(await centre('#field')));
  await page.keyboard.type('abc');
  assert.equal(await page.locator('#field').inputValue(), '', 'no key reached the field');

  // the wheel scrolls what is under it: the inner box first, then the page
  // (measured from where the page is now: the keys typed above go to Blueprint, which may have brought a fix into view)
  await page.mouse.move(...(await centre('#box')));
  const top = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(() => document.querySelector('#box').scrollTop > 0, null, { timeout: 3000 });
  assert.equal(await page.evaluate(() => scrollY), top, 'the inner box took the wheel, not the page');
  await page.mouse.move(600, 300);
  await page.mouse.wheel(0, 400);
  await page.waitForFunction((top) => scrollY > top, top, { timeout: 3000 });

  // holding Space lets the page through, for as long as it's held
  await page.keyboard.down('Space');
  await page.mouse.click(...poke);
  assert.equal(await pokes(), 1, 'with Space held the click pressed the button');
  // an element with a glow on it too: the glow lets the click through while Space is held
  await page.locator('#sync-row').evaluate((el) => el.addEventListener('click', () => { el.dataset.n = +(el.dataset.n || 0) + 1; }));
  await page.evaluate(() => document.getElementById('sync-row').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => { const r = document.getElementById('sync-row').getBoundingClientRect(), hit = document.querySelector('plumb-overlay').shadowRoot.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit?.classList?.contains('hit') || hit?.closest?.('.bp') || true; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.mouse.click(...(await centre('#sync-row')));
  assert.equal(await page.locator('#sync-row').evaluate((el) => +(el.dataset.n || 0)), 1, 'with Space held a click on a glowing element reaches it');
  await page.keyboard.up('Space');
  await page.mouse.click(...poke);
  assert.equal(await pokes(), 1, 'letting go of Space makes the page inert again');

  // leaving gives the page back, and leaves nothing behind
  await page.keyboard.press('Alt+B');
  await off(page);
  await page.mouse.click(...poke);
  assert.equal(await pokes(), 2, 'after leaving, the page is used as normal');
  await page.locator('#field').focus();
  await page.keyboard.type('ok');
  assert.equal(await page.locator('#field').inputValue(), 'ok');
  await page.evaluate(() => scrollTo(0, 0));
  assert.equal(await footprint(page), before);
  assert.deepEqual(errors, []);
});

test('Alt-click while blueprint is on opens that element\'s card, and . puts its own cause in hand', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  const b = await page.locator('#sync-row').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(b.x + 4, b.y + b.height / 2);
  await page.mouse.click(b.x + 4, b.y + b.height / 2);
  await page.keyboard.up('Alt');
  // the card owns the screen (docs/briefs/qa-fixes.md, cause 3): nothing in hand while it is open; '.' hands over
  const overlay = page.locator('plumb-overlay');
  await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.fx .cause').count(), 0, 'no cause in hand while the card is open');
  await page.keyboard.press('.');
  const held = overlay.locator('.fx .cause .cls');
  await held.waitFor({ timeout: 20000 });
  assert.ok((await page.locator('#sync-row').getAttribute('class')).split(/\s+/).includes((await held.innerText()).trim()), 'the row\'s own cause is in hand');
});

test('Drawn only where it can be seen: a drawer over part of an element cuts its heat back; over all of it, nothing is drawn or clickable', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const row = await page.locator('#sync-row').boundingBox();
  // a drawer from the left edge to the middle of the row, over the page
  const drawer = (width) => page.evaluate((width) => { let d = document.getElementById('drawer'); if (!d) { d = document.createElement('div'); d.id = 'drawer'; d.style.cssText = 'position:fixed;left:0;top:0;bottom:0;background:#fff;z-index:10'; document.body.append(d); } d.style.width = `${width}px`; }, width);
  await drawer(row.x + row.width / 2);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  // the row's own radius mark glows along its edge: only the half the drawer leaves
  const radius = () => page.evaluate(() => { const h = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].find((x) => x.getAttribute('aria-label').includes('rounded-[14px]')); if (!h) return null; const r = h.getBoundingClientRect(); return { x: r.left, w: r.width }; });
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((x) => x.getAttribute('aria-label').includes('rounded-[14px]')), null, { timeout: 5000 });
  const half = await radius();
  assert.ok(Math.abs(half.x - (row.x + row.width / 2)) < 1.5, `the heat starts at the drawer's edge: ${JSON.stringify(half)} row ${JSON.stringify(row)}`);
  assert.ok(Math.abs(half.x + half.w - (row.x + row.width)) < 1.5, 'and ends at the row\'s own edge');
  // the whole row covered: no heat, and nothing under the drawer can be clicked
  await drawer(row.x + row.width + 20);
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.waitForFunction(() => ![...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((x) => x.getAttribute('aria-label').includes('rounded-[14px]')), null, { timeout: 5000 });
  const under = await hits(overlay).evaluateAll((rects, row) => rects.filter((h) => { const r = h.getBoundingClientRect(); return r.left + r.width / 2 > row.x && r.left + r.width / 2 < row.x + row.width && r.top + r.height / 2 > row.y && r.top + r.height / 2 < row.y + row.height; }).length, row);
  assert.equal(under, 0, 'nothing under the drawer can be clicked');
  assert.deepEqual(errors, []);
});

test('One cause, fixed everywhere: 36 cells from one JSX line are one cause; one take, one write', { timeout: 150000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, root } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, `${url}?corners`);
  const source = join(root, 'src/App.jsx');
  const was = await readFile(source, 'utf8');
  assert.equal(was.match(/rounded-\[3px\]/g).length, 1, 'the cells are written once, on one line');
  await page.locator('#dense').scrollIntoViewIfNeeded();
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  // a click on one cell\u2019s glow: the cause is the class, one place in the code drawn 36 times
  await hold(page, overlay, 'rounded-[3px]', 'rounded-[3px]');
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /1 place in your code · 36 on the page$/);
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await take(page, overlay);
  for (let i = 0; i < 100 && /rounded-\[3px\]/.test(await readFile(source, 'utf8')); i++) await page.waitForTimeout(100);
  const now = await readFile(source, 'utf8');
  assert.equal((now.match(/rounded-\[3px\]/g) ?? []).length, 0, 'the line no longer carries the drift');
  assert.equal(now.split('\n').length, was.split('\n').length, 'one line changed in place');
  assert.equal(writes, 1, 'one write');
  assert.deepEqual(errors, []);
});

test('A cause counts every place on the page, not just the view', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t, { html: (s) => s.replace('</body>', '<div id="more"></div></body>') });
  // forty rows from one JSX line, most of them below the fold
  await writeFile(join(root, 'src/Rows.jsx'), `export function Rows() {\n  return <section className="mt-[600px]">{Array.from({ length: 40 }, (_, i) => <div key={i} id={'row-' + i} className="h-24 p-[10px]">Row {i}</div>)}</section>;\n}\n`);
  await writeFile(join(root, 'src/entry.jsx'), (await readFile(join(root, 'src/entry.jsx'), 'utf8')) + `import { Rows } from './Rows.jsx';\ncreateRoot(document.getElementById('more')).render(<Rows />);\n`);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  // the fix panel's count grows past the view as the rest of the page is read, and settles once every element is read
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 30000 });
  const inView = await page.evaluate(() => [...document.querySelectorAll('[id^="row-"]')].filter((r) => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }).length);
  assert.ok(inView < 40, `most rows are off-screen: ${inView} in view`);
  // the biggest cause is held first: one line of code, all forty rows on the page
  await page.keyboard.press('Enter');
  await inHand(overlay).filter({ hasText: 'p-[10px]' }).waitFor({ timeout: 10000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /1 place in your code · 40 on the page$/);
  assert.deepEqual(errors, []);
});

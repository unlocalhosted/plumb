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

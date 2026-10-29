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

test('Alt+B registers the page against the system: no dim, no boxes; heat only where it is off, hottest first; the dock counts them', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const look = () => page.locator('#sync-row').evaluate((el) => { const title = el.querySelectorAll('span')[1]; return { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(title).color, title: title.textContent }; });
  const before = await look();

  await page.keyboard.press('Alt+B');
  // the page is itself: its paint untouched and nothing dimmed over it
  assert.deepEqual(await look(), before, 'the page keeps its own paint');
  assert.equal(await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.shade').hidden), true, 'no dim');
  // reading, then the count
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  const expected = ['gap-[10px]', 'py-[10px]', 'px-[14px]', 'rounded-[14px]', 'text-[13.5px]', 'gap-[3px]', 'rounded-[5px]'];
  await page.waitForFunction((drifts) => {
    const labels = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((r) => r.getAttribute('aria-label'));
    return drifts.every((d) => labels.some((l) => l.includes(d)));
  }, expected, { timeout: 5000 }).catch(() => {});
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  for (const drift of expected) assert.ok(labels.some((l) => l.includes(drift)), `a mark for ${drift}`);
  const count = Number(await overlay.locator('.dock').getAttribute('data-in-view'));
  // the dock counts problems in the page's code (a place drawn many times is one), not the marks drawn
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  assert.equal(Number(await overlay.locator('.dock').getAttribute('data-in-view')), await page.evaluate(() => window.__plumb.overlay.progress.drift), 'the dock counts the problems in the page’s code');
  assert.ok(count > 0 && (await hits(overlay).count()) > 0, 'problems are counted and marks are drawn');
  // no boxes and no class names on the page at rest: one zone of heat per mark, nothing else
  const rest = await page.evaluate(() => { const sr = document.querySelector('plumb-overlay').shadowRoot; return { labels: sr.querySelectorAll('.bp .lbl').length, outlines: sr.querySelectorAll('.bp .outlines rect').length, zones: sr.querySelectorAll('.bp .heat .zone').length, hits: sr.querySelectorAll('.bp .hit').length, stages: [...new Set([...sr.querySelectorAll('.bp .heat .zone')].map((z) => z.dataset.stage))] }; });
  assert.equal(rest.labels, 0, 'no labels at rest');
  assert.equal(rest.outlines, 0, 'no outlines at rest');
  assert.equal(rest.zones, rest.hits, 'a zone for every mark');
  assert.deepEqual(rest.stages, ['resting'], 'every zone rests until something is pointed at');
  // Tab walks the hottest first
  const heats = await hits(overlay).evaluateAll((rects) => rects.map((r) => +r.dataset.heat));
  assert.deepEqual(heats, [...heats].sort((x, y) => y - x), `hottest first: ${heats}`);
  // every mark is a button you can name and reach
  for (const rect of await hits(overlay).all()) {
    assert.equal(await rect.getAttribute('role'), 'button');
    assert.equal(await rect.getAttribute('tabindex'), '0');
  }
  // the gap's zone sits in the gap, between the avatar and the text column
  const gap = await page.evaluate(() => {
    const row = document.getElementById('sync-row');
    const [a, b] = [...row.children].map((c) => c.getBoundingClientRect());
    const hit = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].find((r) => r.getAttribute('aria-label').includes('gap-[10px]'));
    return { mid: +hit.dataset.at.split(',')[0], from: a.right, to: b.left };
  });
  assert.ok(gap.mid >= gap.from - 2 && gap.mid <= gap.to + 2, `the gap's zone is in the gap (${JSON.stringify(gap)})`);
  // pointing at a zone: one pill by the pointer, the class and the token it becomes; its cause lights, the rest go quiet
  const hint = overlay.locator('.bp .bp-hint[data-on]');
  const gapMark = hits(overlay).and(overlay.locator('[aria-label*="gap-[10px]"]'));
  const gb = await (async (h) => { const [x, y] = (await h.getAttribute('data-at')).split(',').map(Number); return { x: x - 0.5, y: y - 0.5, width: 1, height: 1 }; })(gapMark); // where the zone is aimed at (its first piece), not its bounding box
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await hint.waitFor({ timeout: 3000 });
  assert.match(await hint.innerText(), /gap-\[10px\]\s*→\s*s\d/);
  assert.equal(await hint.count(), 1, 'one pill at a time');
  const hb = await hint.boundingBox();
  assert.ok(Math.abs(hb.x - (gb.x + gb.width / 2 + 14)) < 40 && Math.abs(hb.y - (gb.y + gb.height / 2 + 18)) < 40, 'the pill is by the pointer');
  const stages = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone')].map((z) => z.dataset.stage));
  assert.ok(stages.includes('pointed') && stages.includes('quiet'), `the pointed zone, the others quiet: ${stages}`);
  await page.mouse.move(5, 700);
  await overlay.locator('.bp .bp-hint:not([data-on])').waitFor({ timeout: 3000 });
  // focus is pointing too
  await gapMark.evaluate((hit) => hit.focus());
  await hint.waitFor({ timeout: 3000 });
  assert.match(await hint.innerText(), /gap-\[10px\]/);
  await gapMark.evaluate((hit) => hit.blur());
  await overlay.locator('.bp .bp-hint:not([data-on])').waitFor({ timeout: 3000 });
  // a click on a zone puts its cause in hand; Esc puts it down, still in blueprint
  await page.mouse.click(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'gap-[10px]' }).waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []);
});

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

test('Only drift is drawn, and the fix panel counts it by cause: one line at rest, the biggest cause first when held, its places lit; the old pieces stay out of sight', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  // once the last reading lands, the dock says the problems in the page's code
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.done && Number(document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock').dataset.inView) === p.drift; }, null, { timeout: 20000 });
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  assert.ok(!labels.some((l) => /gap-s\d/.test(l)), 'a gap on the system has no mark');
  assert.equal(await overlay.locator('.bp :is(.structure, .rails, svg.wash, svg.greek, .badge, .scan, .sheet)').count(), 0, 'the retired layers are gone');
  for (const sel of ['.bpp', '.cg', '.sel']) assert.equal(await shown(page, sel), false, `${sel} is not shown`);
  // at rest the fix panel is one line: the problems on the page (more than the view holds, once it is read), in causes
  await panel(overlay).locator('.line').filter({ hasText: /^\d+ problems? · \d+ fix(es)?/ }).waitFor({ timeout: 10000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  const drift = await hits(overlay).evaluateAll((rects) => rects.filter((r) => r.dataset.ledger === 'new').length);
  const [, places, causes] = (await panel(overlay).locator('.line .count').innerText()).match(/^(\d+) problems? · (\d+) fix(?:es)?/).map(Number);
  assert.ok(drift > 0, 'marks are drawn');
  assert.equal(places, await page.evaluate(() => window.__plumb.overlay.progress.drift), 'the line and the dock say the same number');
  assert.ok(causes >= 3 && causes <= places, `several causes: ${causes}`);
  assert.equal(await panel(overlay).locator('.cause').count(), 0, 'nothing is in hand at rest');
  // Enter: the cause with the most places is in hand, its class named, its places counted, and lit on the page
  await page.keyboard.press('Enter');
  await inHand(overlay).waitFor({ timeout: 10000 });
  const what = await panel(overlay).locator('.cause .what').innerText();
  const inCause = Number(what.match(/(\d+) places?$/)[1]);
  const byLine = {};
  for (const l of labels) byLine[l] = (byLine[l] ?? 0) + 1;
  assert.ok(inCause >= Math.max(...Object.values(byLine)), `the first cause is the biggest: ${what} against ${JSON.stringify(byLine)}`);
  assert.match(await panel(overlay).locator('.cause .nav').innerText(), new RegExp(`1 of ${causes}`));
  const lit = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone[data-stage="lit"], .bp .heat .zone[data-stage="pointed"]').length);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone[data-stage="lit"], .bp .heat .zone[data-stage="pointed"]').length > 0, null, { timeout: 3000 });
  // the page changes and is read again: the cause in hand stays lit
  await page.evaluate(() => document.body.append(Object.assign(document.createElement('p'), { textContent: 'late' })));
  await page.waitForTimeout(1200);
  assert.ok((await lit()) > 0, 'its places stay lit after the page is read again');
  // Esc puts it down and the panel is one line again; blueprint stays
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line .count').waitFor({ timeout: 5000 });
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint', exact: true }).getAttribute('aria-pressed'), 'true');
  // D is an ordinary key now: nothing on the page changes
  await page.keyboard.down('d');
  await page.waitForTimeout(150);
  assert.deepEqual(await page.locator('#sync-row').evaluate((el) => ({ gap: getComputedStyle(el).gap, style: el.getAttribute('style') })), { gap: '10px', style: null });
  await page.keyboard.up('d');
  await page.keyboard.press('Alt+B');
  await off(page);
  assert.equal(await overlay.locator('.bp .outlines rect, .bp .lbl').count(), 0);
  assert.equal(await panel(overlay).isHidden(), true);
  assert.equal(await footprint(page), before, 'everything lives in the overlay; the page is untouched');
  assert.deepEqual(errors, []);
});

const badge = (overlay) => panel(overlay).locator('.apply .badge');
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
  // another cause may be in hand (a take hands on the next one): put it down first
  if (await panel(overlay).locator('.cause').count()) { await page.keyboard.press('Escape'); await panel(overlay).locator('.line').waitFor({ timeout: 5000 }); }
  await clickMark(page, overlay, text);
  await inHand(overlay).filter({ hasText: cls }).waitFor({ timeout: 10000 });
}
// pick an option of the cause in hand by the token it names; the page previews it on every place
const pickStep = (overlay, token) => panel(overlay).locator('button.sp', { has: overlay.page().locator('.tk', { hasText: new RegExp(`^${token}$`) }) }).click();
// Enter takes the cause in hand once its exact edit is read: the count on Apply goes up
async function take(page, overlay) {
  const before = Number(await badge(overlay).innerText().catch(() => '0'));
  await panel(overlay).locator('.take:not([disabled])').waitFor({ timeout: 10000 });
  await page.keyboard.press('Enter');
  await badge(overlay).filter({ hasText: new RegExp(`^${before + 1}$`) }).waitFor({ timeout: 5000 });
}
const dock = (overlay) => overlay.locator('.dock');
// no mark names the text (an applied change reloads the page when the dev server can't hot-swap it: read through it)
async function noMark(page, text) {
  for (let i = 0; ; i++) {
    try { return await page.waitForFunction((t) => { const r = document.querySelector('plumb-overlay')?.shadowRoot; return !!r && !r.querySelector('.bp').hidden && ![...r.querySelectorAll('.bp .hit')].some((h) => h.getAttribute('aria-label').includes(t)); }, text, { timeout: 15000 }); }
    catch (error) { if (i > 3 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
}

test('A glow puts its cause in hand; an option previews on the page; Enter takes it, A puts it in source and the mark goes', { timeout: 120000 }, async (t) => {
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
  // Enter takes it: Apply counts one; A writes it
  await take(page, overlay);
  await page.keyboard.press('a');
  for (let i = 0; i < 100 && !/gap-s2 py-\[10px\]/.test(await readFile(join(root, 'src/App.jsx'), 'utf8')); i++) await page.waitForTimeout(100);
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /gap-s2 py-\[10px\]/);
  await noMark(page, 'gap-[10px]');
  await overlay.locator('.bp .hit[aria-label*="py-[10px]"]').waitFor({ timeout: 15000 }); // the row\u2019s other drift is still marked
  assert.deepEqual(errors, []);
});

test('Several causes are applied together, one write per file', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await hold(page, overlay, 'rounded-[14px]', 'rounded-[14px]');
  await take(page, overlay);
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await pickStep(overlay, 's1');
  await take(page, overlay);
  assert.equal(await badge(overlay).innerText(), '2');
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await page.keyboard.press('a');
  const file = join(root, 'src/App.jsx');
  for (let i = 0; i < 100 && /gap-\[3px\]/.test(await readFile(file, 'utf8')); i++) await page.waitForTimeout(100);
  const source = await readFile(file, 'utf8');
  assert.doesNotMatch(source, /rounded-\[14px\]/);
  assert.match(source, /gap-s1 rounded-\[5px\]/);
  assert.equal(writes, 1, 'one write for the file');
  await noMark(page, 'rounded-[14px]');
  await noMark(page, 'gap-[3px]');
  assert.deepEqual(errors, []);
});

test('Leaving blueprint with causes taken or tried leaves nothing previewed and nothing written', { timeout: 120000 }, async (t) => {
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
  await take(page, overlay);
  // a second cause in hand, tried, and left untaken
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await pickStep(overlay, 's1');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('beta-chip')).gap === '4px', null, { timeout: 5000 });
  // Esc puts the cause in hand down: the untaken one is as it was, the taken one keeps its step until written
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('beta-chip')).gap === '3px', null, { timeout: 5000 });
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the taken change stays on the page');
  // leaving lifts what was taken too
  for (let i = 0; i < 4 && await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden === false); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await off(page);
  assert.equal(await footprint(page), before, 'nothing is left on the page');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written');
});

test('A write the server refuses as stale writes nothing: the file is as it was and the page keeps what was tried', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  await hold(page, overlay, 'gap-[10px]', 'gap-[10px]');
  await pickStep(overlay, 's2');
  await take(page, overlay);
  // The first write is answered as the server answers a file that changed since it was read (changing the file on
  // disk here would make the dev server reload the page).
  let refused = 0;
  await page.route('**/swaps', (route) => {
    refused++;
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'The file changed since the overlay read it. Read it again.' }) });
  });
  const file = join(root, 'src/App.jsx');
  await page.keyboard.press('a');
  for (let i = 0; i < 50 && !refused; i++) await page.waitForTimeout(100);
  assert.equal(refused, 1, 'the write was sent, once');
  await panel(overlay).locator('.line').waitFor({ timeout: 15000 }); // the panel folds back to one line
  assert.equal(await readFile(file, 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing was written');
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the page keeps what was tried');
  // GAP: the refusal is only in the hidden Changes sidebar (.cg): nothing in the fix panel or the dock says "This file
  // changed after we checked it", and the panel has forgotten the cause it took, so A cannot write it again.
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

test('Keyboard only: Tab reaches a glow, Enter puts a cause in hand, → walks to the one wanted, arrows pick, Enter takes, Tab reaches Apply, Enter writes', { timeout: 120000 }, async (t) => {
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
  // A applies, from wherever the keys are
  await page.keyboard.press('a');
  const file = join(root, 'src/App.jsx');
  const was = await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8');
  for (let i = 0; i < 100 && (await readFile(file, 'utf8')) === was; i++) await page.waitForTimeout(100);
  assert.notEqual(await readFile(file, 'utf8'), was);
});

test('Enter on the Apply button that has focus writes the taken causes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.dock[data-in-view]').waitFor({ state: 'attached', timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  await hold(page, overlay, 'gap-[3px]', 'gap-[3px]');
  await take(page, overlay);
  // put the cause handed on down, then Tab on to Apply
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  let onApply = false;
  for (let i = 0; i < 80 && !onApply; i++) { await page.keyboard.press('Tab'); onApply = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.activeElement?.classList.contains('apply') ?? false); }
  assert.ok(onApply, 'Tab reaches Apply');
  await page.keyboard.press('Enter');
  const file = join(root, 'src/App.jsx');
  const was = await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8');
  for (let i = 0; i < 60 && (await readFile(file, 'utf8')) === was; i++) await page.waitForTimeout(100);
  assert.notEqual(await readFile(file, 'utf8'), was, 'Enter on the focused Apply button wrote nothing (the key went to the panel\u2019s own Enter instead)');
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

test('With motion: the zones pulse in, then rest; turning around mid-arrival and removing the overlay leave nothing behind', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url, { motion: true });
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone').length > 0, null, { timeout: 20000 });
  // a zone's opacity, every frame for 1.2s: it pulses (rises above where it rests and falls back)
  const seen = await page.evaluate(() => new Promise((done) => { const out = [], t0 = performance.now(); const tick = () => { const z = document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp .heat .zone'); if (z) out.push([+getComputedStyle(z).opacity, +z.style.opacity]); if (performance.now() - t0 < 1200) requestAnimationFrame(tick); else done(out); }; requestAnimationFrame(tick); }));
  assert.ok(seen.some(([o, rest]) => o > rest + 0.05), `the zone pulses above its rest: ${seen.slice(0, 12).map(([o]) => o.toFixed(2))}`);
  await page.keyboard.press('Alt+B'); // turn around mid-arrival
  await off(page);
  assert.equal(await footprint(page), before, 'a reversed arrival leaves nothing behind');
  // once arrived, every zone rests still
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone').length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(2800);
  const still = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone')].every((z) => z.getAnimations().length === 0));
  assert.ok(still, 'no zone moves at rest');
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint', exact: true }).getAttribute('aria-pressed'), 'true');

  await page.evaluate(() => document.querySelector('plumb-overlay').remove());
  assert.equal(await footprint(page), before, 'removing the overlay mid-mode leaves nothing behind');
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
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

test('Alt-click while blueprint is on puts that element\'s cause in hand', { timeout: 90000 }, async (t) => {
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
  const held = page.locator('plumb-overlay').locator('.fx .cause .cls');
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
  await take(page, overlay);
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await page.keyboard.press('a');
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

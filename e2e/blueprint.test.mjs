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

test('Alt+B dims the page and lifts every drift in view where it lives; one label per drifted thing; the dock counts them', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const look = () => page.locator('#sync-row').evaluate((el) => { const title = el.querySelectorAll('span')[1]; return { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(title).color, title: title.textContent }; });
  const before = await look();

  await page.keyboard.press('Alt+B');
  // the page itself is untouched: its fills and words are what they were; the dim is the overlay's
  assert.deepEqual(await look(), before, 'the page keeps its own paint');
  const shade = await page.evaluate(() => { const s = document.querySelector('plumb-overlay').shadowRoot.querySelector('.shade'); const cs = getComputedStyle(s); return { hidden: s.hidden, filter: cs.backdropFilter, bg: cs.backgroundColor }; });
  assert.equal(shade.hidden, false);
  assert.equal(shade.filter, 'grayscale(1)', 'the page gives its colour up under the dim');
  assert.match(shade.bg, /rgba\(20, 20, 22, 0\.46\)/);
  // reading, then the count
  await say(overlay).filter({ hasText: /\d+ problems? in view.* · Alt\+B/ }).waitFor({ timeout: 20000 });
  const expected = ['gap-[10px]', 'py-[10px]', 'px-[14px]', 'rounded-[14px]', 'text-[13.5px]', 'gap-[3px]', 'rounded-[5px]'];
  await page.waitForFunction((drifts) => {
    const labels = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((r) => r.getAttribute('aria-label'));
    return drifts.every((d) => labels.some((l) => l.includes(d)));
  }, expected, { timeout: 5000 }).catch(() => {});
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  for (const drift of expected) assert.ok(labels.some((l) => l.includes(drift)), `a mark for ${drift}`);
  const count = Number((await say(overlay).innerText()).match(/(\d+) problems?/)[1]);
  assert.equal(count, await hits(overlay).evaluateAll((rects) => rects.filter((r) => r.dataset.ledger === 'new').length), 'the dock counts the drift marks drawn');
  // the sync row is cut out of the dim at its own radius, and outlined in the drift ink
  const clip = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.shade').style.clipPath);
  const row = await page.locator('#sync-row').boundingBox();
  assert.ok(clip.includes(`A 14 14`) && clip.includes(` ${Math.round(row.y * 10) / 10}`), `the row is cut out of the dim: ${clip.slice(0, 160)}`);
  const outline = await outlineOf(page, 'sync-row');
  assert.ok(outline && !/inner/.test(outline.cls) && /k-off/.test(outline.cls), `the row is outlined as a region: ${JSON.stringify(outline)}`);
  // one label per region, on its top edge: the first drift's class and +n for the rest, its title's included
  const label = await page.evaluate(() => {
    const row = document.getElementById('sync-row').getBoundingClientRect();
    const found = [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .lbl')].map((l) => ({ text: l.textContent, r: l.getBoundingClientRect() }))
      .filter(({ r }) => r.left >= row.left - 1 && r.left < row.left + 40 && Math.abs(r.top + r.height / 2 - row.top) < 2);
    return found.map((f) => f.text);
  });
  assert.equal(label.length, 1, `one label on the row's top edge: ${label}`);
  // the row's own five, its title's size, and whatever its button carries
  const [, first, more] = label[0].match(/^(.+?)\+(\d+)$/) ?? [];
  assert.ok(['gap-[10px]', 'py-[10px]', 'px-[14px]', 'rounded-[14px]'].includes(first) && +more >= 5, `the label names the first drift and counts the rest: ${label[0]}`);
  // at rest no break is drawn; pointing at the row draws its breaks and nobody else's
  const shown = () => page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.break[data-show]')].map((g) => g.nextElementSibling.getAttribute('aria-label')));
  assert.deepEqual(await shown(), [], 'no break at rest');
  await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.break[data-show]').length > 0, null, { timeout: 3000 });
  const lit = await shown();
  assert.ok(lit.some((l) => l.includes('gap-[10px]')) && lit.some((l) => l.includes('text-[13.5px]')), `the row's breaks, its title's included: ${lit}`);
  assert.ok(!lit.some((l) => l.includes('gap-[3px]')), 'not the chip\'s');
  await page.mouse.move(5, 700);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.break[data-show]').length === 0, null, { timeout: 3000 });
  // pointing at a break shows one note in words: the finding, the nearest tokens, what a click does
  const hint = overlay.locator('.bp .bp-hint[data-on]');
  const gapMark = hits(overlay).and(overlay.locator('[aria-label*="gap-[10px]"]'));
  const gb = await gapMark.boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await hint.waitFor({ timeout: 3000 });
  assert.match(await hint.innerText(), /gap-\[10px\] hardcodes 10px\s+nearest s\d 8 · s\d 12\s+click to fix/);
  assert.equal(await hint.count(), 1, 'one note at a time');
  await page.mouse.move(5, 700);
  await overlay.locator('.bp .bp-hint:not([data-on])').waitFor({ timeout: 3000 });
  // focus shows the note, and the focused break's region draws its breaks
  await gapMark.evaluate((hit) => hit.focus());
  await hint.waitFor({ timeout: 3000 });
  assert.match(await hint.innerText(), /gap-\[10px\]/);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.break[data-show]').length > 0, null, { timeout: 3000 });
  await gapMark.evaluate((hit) => hit.blur());
  await overlay.locator('.bp .bp-hint:not([data-on])').waitFor({ timeout: 3000 });
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
  // a label is a shortcut: a click selects its element, its first drift current
  await overlay.locator('.bp .lbl').first().click();
  await selected(overlay).waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await selected(overlay).waitFor({ state: 'detached', timeout: 5000 });
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
  await say(overlay).filter({ hasText: /problems? in view|nothing to fix/ }).waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+B');
  await off(page);

  assert.equal(await footprint(page), before, 'no attribute, inline style or stylesheet is left behind');
  assert.equal(await hits(overlay).count(), 0);
  assert.match(await say(overlay).innerText(), /Hold Alt to inspect/);
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'false');
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

const panel = (overlay) => overlay.locator('.bpp');
const rowsOf = (overlay) => panel(overlay).locator('.row');

test('Only drift is drawn, and the panel groups it by cause: places most first; pointing or J/K lights a cause on the page', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);

  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /\d+ problems? in view.* · Alt\+B/ }).waitFor({ timeout: 20000 });
  // the count and the drawn marks agree once the last reading lands
  await page.waitForFunction(() => { const root = document.querySelector('plumb-overlay').shadowRoot; const n = Number(root.querySelector('.dock .say').innerText.match(/(\d+) problems?/)?.[1]); return n === [...root.querySelectorAll('.bp .hit')].filter((h) => h.dataset.ledger === 'new').length; }, null, { timeout: 5000 });
  const labels = await hits(overlay).evaluateAll((rects) => rects.map((r) => r.getAttribute('aria-label')));
  assert.ok(!labels.some((l) => /gap-s\d/.test(l)), 'a gap on the system has no mark');
  assert.equal(await overlay.locator('.bp :is(.structure, .rails, svg.wash, svg.greek, .badge, .scan, .sheet)').count(), 0, 'the retired layers are gone');
  // the panel: docked on the right, its header counts the drift and the causes
  await page.waitForFunction(() => getComputedStyle(document.querySelector('plumb-overlay').shadowRoot.querySelector('.bpp')).opacity === '1');
  const drift = await hits(overlay).evaluateAll((rects) => rects.filter((r) => r.dataset.ledger === 'new').length);
  await panel(overlay).locator('.meta').filter({ hasText: /^\d+ problems? on this page · \d+ fix(es)?( · |$)/ }).waitFor({ timeout: 5000 });
  // at rest it is one line in the top-right corner, so the page stays in view
  const rest = await panel(overlay).boundingBox();
  assert.ok(rest.x + rest.width > 1200 - 24 && rest.y < 24 && rest.height < 48 && rest.width < 260, `folded to one line: ${JSON.stringify(rest)}`);
  assert.equal(await panel(overlay).locator('.head').getAttribute('aria-expanded'), 'false');
  // a click opens it, only as tall as its rows
  await panel(overlay).locator('.head').click();
  const unfolded = await panel(overlay).boundingBox();
  const fits = await panel(overlay).evaluate((p) => { const rows = p.querySelector('.rows'); return rows.scrollHeight <= rows.clientHeight + 1 || p.getBoundingClientRect().bottom >= innerHeight - 16 - 22 - 24; });
  assert.ok(unfolded.height > rest.height && fits && unfolded.y + unfolded.height <= 800 - 16 - 22 - 10, `open to its rows, never onto the dock: ${JSON.stringify(unfolded)}`);
  // one row per cause, most places first; every drift mark is in exactly one row
  const counts = (await rowsOf(overlay).locator('.n').allInnerTexts()).map(Number);
  assert.ok(counts.length >= 3 && counts.every((n, i) => i === 0 || n <= counts[i - 1]), `causes by places: ${counts}`);
  // the rows count the whole page, read beyond the view: at least every drift in view, each in one row
  const pageOff = Number((await panel(overlay).locator('.meta').innerText()).match(/^(\d+) problems?/)[1]);
  assert.ok(pageOff >= drift, `the page holds at least what is in view: ${pageOff} >= ${drift}`);
  assert.equal(counts.reduce((a, b) => a + b, 0) + Number((await panel(overlay).locator('.meta').innerText()).match(/(\d+) set in code/)?.[1] ?? 0), pageOff, 'every drift on the page is in one row');
  const texts = await rowsOf(overlay).locator('code').allInnerTexts();
  assert.ok(texts.includes('gap-[10px]') && texts.includes('rounded-[14px]'), `rows name the class: ${texts}`);
  assert.match(await rowsOf(overlay).filter({ hasText: 'gap-[10px]' }).locator('.what').innerText(), /^spacing off the scale · 1 place$/);
  // pointing at a row outlines its places; going back to the page puts it out and folds the list
  await rowsOf(overlay).first().hover();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect').length > 0, null, { timeout: 3000 });
  await page.mouse.move(5, 300);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect').length === 0, null, { timeout: 3000 });
  await page.mouse.move(400, 500);
  assert.equal(await panel(overlay).locator('.head').getAttribute('aria-expanded'), 'false', 'back on the page, the list folds');
  // J opens the list, selects the first cause and lights it; K stays at the top; J again moves on; Esc folds it
  await page.keyboard.press('j');
  assert.equal(await panel(overlay).locator('.head').getAttribute('aria-expanded'), 'true');
  assert.equal(await rowsOf(overlay).first().getAttribute('aria-current'), 'true');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect').length > 0, null, { timeout: 3000 });
  await page.keyboard.press('k');
  assert.equal(await rowsOf(overlay).first().getAttribute('aria-current'), 'true');
  await page.keyboard.press('j');
  assert.equal(await rowsOf(overlay).nth(1).getAttribute('aria-current'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await panel(overlay).locator('.head').getAttribute('aria-expanded'), 'false');
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'true', 'the first Esc only folds the list');
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

const chooser = (overlay) => overlay.locator('.ch .card[role="dialog"]');
// the fix in place (select.js): the selected element, its options, the Changes sidebar
const selected = (overlay) => overlay.locator('.sel .ring');
const option = (overlay, token) => overlay.locator(`.sel .stair .opt[data-i][title="${token}"]`).first();
const sidebar = (overlay) => overlay.locator('.cg:not([hidden])');
// pick an option on the selected element and take it: Enter puts it in Changes once its exact edit is read
async function take(page, overlay, token) {
  await overlay.locator('.sel .stair').waitFor({ timeout: 10000 });
  // a staircase or swatches: the option by its token; a single target: it is the one
  if (token && await overlay.locator('.sel .stair .opt[data-i]').count()) { const o = option(overlay, token); await o.waitFor({ timeout: 10000 }); await o.click(); }
  const before = await overlay.locator('.cg:not([hidden]) .chg').count();
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); if (await overlay.locator('.cg:not([hidden]) .chg').count() > before) return; }
  throw new Error('the option was not taken');
}
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
// no mark names the text (an applied change reloads the page when the dev server can't hot-swap it: read through it)
async function noMark(page, text) {
  for (let i = 0; ; i++) {
    try { return await page.waitForFunction((t) => { const r = document.querySelector('plumb-overlay')?.shadowRoot; return !!r && !r.querySelector('.bp').hidden && ![...r.querySelectorAll('.bp .hit')].some((h) => h.getAttribute('aria-label').includes(t)); }, text, { timeout: 15000 }); }
    catch (error) { if (i > 3 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
}

test('A mark selects its element; an option previews on the page; Enter and Apply put it in source and the mark goes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'gap-[10px]');
  // the element is selected with that drift current; nothing opens over it
  await selected(overlay).waitFor();
  assert.equal(await chooser(overlay).count(), 0, 'no card');
  assert.equal(await overlay.locator('.w:not([hidden])').count(), 0, 'the reading card stays closed');
  // the theme's steps are offered on the element; picking one previews it on the page
  await option(overlay, 's2').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('sync-row')).gap === '8px', null, { timeout: 5000 });
  // Enter takes it: the Changes sidebar has it; Apply writes it
  await take(page, overlay);
  assert.match(await sidebar(overlay).innerText(), /Apply 1 change/);
  await sidebar(overlay).locator('.ok').click();
  for (let i = 0; i < 100 && !/gap-s2 py-\[10px\]/.test(await readFile(join(root, 'src/App.jsx'), 'utf8')); i++) await page.waitForTimeout(100);
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /gap-s2 py-\[10px\]/);
  await noMark(page, 'gap-[10px]');
  await overlay.locator('.bp .hit[aria-label*="py-[10px]"]').waitFor({ timeout: 15000 }); // the row’s other drift is still marked
  assert.deepEqual(errors, []);
});

test('Several elements’ changes are applied together, one write per file', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'rounded-[14px]');
  await take(page, overlay);
  await clickMark(page, overlay, 'gap-[3px]');
  await take(page, overlay, 's1');
  assert.match(await sidebar(overlay).innerText(), /2 elements · 2 changes/);
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await sidebar(overlay).locator('.ok').click();
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

test('Backspace drops a change; Discard all drops the rest; leaving blueprint leaves nothing previewed and nothing written', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  const before = await footprint(page);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'gap-[10px]');
  await take(page, overlay, 's2');
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px');
  await page.keyboard.press('Backspace');
  await sidebar(overlay).waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  assert.equal(await overlay.locator('.cg:not([hidden])').count(), 0);
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null);
  // two elements, then Discard all
  await take(page, overlay, 's2');
  await clickMark(page, overlay, 'gap-[3px]');
  await take(page, overlay, 's1');
  await sidebar(overlay).locator('.all').click();
  assert.equal(await overlay.locator('.cg:not([hidden])').count(), 0);
  assert.equal(await page.locator('#sync-row').getAttribute('style'), null);
  assert.equal(await page.locator('#beta-chip').getAttribute('style'), null);
  // changes pending when the mode is left are lifted with it
  await clickMark(page, overlay, 'gap-[10px]');
  await take(page, overlay, 's2');
  // Esc lets go of what has focus, then the element, then leaves blueprint
  for (let i = 0; i < 4 && await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden === false); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await off(page);
  assert.equal(await footprint(page), before, 'nothing is left on the page');
  assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8'), 'nothing written');
});

test('A write the server refuses as stale is said so on its row; Apply again reads the file again and writes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'gap-[10px]');
  await take(page, overlay, 's2');
  // The first write is answered as the server answers a file that changed since it was read (changing the file on
  // disk here would make the dev server reload the page); the next reaches the real server.
  let refused = 0;
  await page.route('**/swaps', (route) => {
    if (refused++) return route.continue();
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'The file changed since the overlay read it. Read it again.' }) });
  });
  const file = join(root, 'src/App.jsx');
  await sidebar(overlay).locator('.ok').click();
  await sidebar(overlay).locator('.why').filter({ hasText: 'This file changed after we checked it. Check again.' }).waitFor({ timeout: 15000 });
  assert.match(await readFile(file, 'utf8'), /gap-\[10px\] py-\[10px\]/, 'nothing was written');
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the preview stays');
  await sidebar(overlay).locator('.ok').click();
  for (let i = 0; i < 100 && !/gap-s2 py-\[10px\]/.test(await readFile(file, 'utf8')); i++) await page.waitForTimeout(100);
  assert.match(await readFile(file, 'utf8'), /gap-s2 py-\[10px\]/);
  assert.equal(refused, 2);
});

test('Keyboard only: Tab reaches a mark, Enter selects its element, arrows pick, Enter takes, Tab reaches Apply, Enter writes', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t);
  const { page, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  const active = () => page.evaluate(() => { const a = document.querySelector('plumb-overlay').shadowRoot.activeElement; return a ? { cls: a.className.baseVal ?? a.className, label: a.getAttribute('aria-label') } : null; });
  let label = null;
  for (let i = 0; i < 40 && !label; i++) {
    await page.keyboard.press('Tab');
    const a = await active();
    label = a?.cls === 'hit' && a.label.includes('gap-[3px]') ? a.label : null;
  }
  assert.ok(label, 'Tab reaches the chip’s gap mark');
  await page.keyboard.press('Enter');
  await selected(overlay).waitFor();
  await overlay.locator('.sel .stair').waitFor();
  await page.keyboard.press('ArrowUp');
  for (let i = 0; i < 40 && !(await overlay.locator('.cg:not([hidden])').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  assert.equal(await overlay.locator('.cg:not([hidden])').count(), 1, `the change is taken: ${await page.evaluate(() => { const r = document.querySelector('plumb-overlay').shadowRoot; return JSON.stringify({ sel: r.querySelectorAll('.sel .ring').length, stair: r.querySelector('.sel .stair')?.innerHTML.slice(0, 200), tag: r.querySelector('.sel .pl-tag')?.textContent, active: r.activeElement?.getAttribute('aria-label') }); })}`);
  // Tab to Apply, Enter writes
  let onApply = false;
  for (let i = 0; i < 60 && !onApply; i++) { await page.keyboard.press('Tab'); onApply = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.activeElement?.classList.contains('ok') ?? false); }
  assert.ok(onApply, 'Tab reaches Apply');
  await page.keyboard.press('Enter');
  const file = join(root, 'src/App.jsx');
  const was = await readFile(join(repo, 'overlay/demo/src/App.jsx'), 'utf8');
  for (let i = 0; i < 100 && (await readFile(file, 'utf8')) === was; i++) await page.waitForTimeout(100);
  assert.notEqual(await readFile(file, 'utf8'), was);
});

test('The Changes sidebar: a row per element changed; a click on a row selects it; × drops just that one', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await clickMark(page, overlay, 'gap-[10px]');
  await take(page, overlay, 's2');
  await clickMark(page, overlay, 'gap-[3px]');
  await take(page, overlay, 's1');
  const rows = sidebar(overlay).locator('.el');
  assert.equal(await rows.count(), 2);
  // a click on the first row selects its element again
  await rows.first().locator('.name').click();
  await selected(overlay).waitFor();
  // × on the second drops it and puts that element back
  await rows.nth(1).locator('.x').click();
  assert.equal(await sidebar(overlay).locator('.el').count(), 1);
  assert.equal(await page.locator('#beta-chip').getAttribute('style'), null);
  assert.equal(await page.locator('#sync-row').evaluate((el) => getComputedStyle(el).gap), '8px', 'the other change stays');
  assert.deepEqual(errors, []);
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

test('The dim takes a coloured page to grey and darker, the page keeps its own paint, and both come back after', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t, { html: (s) => s.replace('</head>', '<style>html{background:#111}body{background:#fff;min-height:100vh}</style></head>').replace('</body>', '<div style="position:fixed;right:0;top:300px;width:40px;height:200px;background:#2f5bd3"></div></body>') });
  const { page } = await open(t, launched, url);
  const paint = () => page.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).backgroundColor]);
  const original = await paint();
  const [r0, g0, b0] = await pixel(page, 1190, 400);
  assert.ok(b0 > 180 && r0 < 80, `the page is blue there (rgb ${r0},${g0},${b0})`);
  await page.keyboard.press('Alt+B');
  await say(page.locator('plumb-overlay')).filter({ hasText: /problems? in view|nothing to fix/ }).waitFor({ timeout: 20000 });
  assert.deepEqual(await paint(), original, 'html and body keep their own paint under the dim');
  const [r, g, b] = await pixel(page, 1190, 400);
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 3, `an empty spot is grey under the dim (rgb ${r},${g},${b})`);
  assert.ok(r + g + b < r0 + g0 + b0, 'and darker than it was');
  await page.keyboard.press('Alt+B');
  await off(page);
  assert.deepEqual(await paint(), original, 'html and body paint what they painted before');
  assert.deepEqual(await pixel(page, 1190, 400), [r0, g0, b0], 'the pixel is back');
});

test('With motion: turning around mid-fade and removing the overlay both leave nothing behind', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url, { motion: true });
  const before = await footprint(page);
  const shade = () => page.evaluate(() => { const s = document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.shade'); return s ? { hidden: s.hidden, opacity: +getComputedStyle(s).opacity } : null; });

  // the dim's opacity, sampled every frame for the first 300ms after Alt+B: it passes through the middle
  const fading = page.evaluate(() => new Promise((done) => { const seen = [], t0 = performance.now(); const tick = () => { const s = document.querySelector('plumb-overlay').shadowRoot.querySelector('.shade'); if (s && !s.hidden) seen.push(+getComputedStyle(s).opacity); if (performance.now() - t0 < 300) requestAnimationFrame(tick); else done(seen); }; requestAnimationFrame(tick); }));
  await page.keyboard.press('Alt+B');
  const seen = await fading;
  assert.ok(seen.some((o) => o > 0 && o < 1), `the dim fades in: ${seen.map((o) => o.toFixed(2))}`);
  await page.keyboard.press('Alt+B'); // turn around mid-fade
  await off(page);
  assert.deepEqual(await shade(), { hidden: true, opacity: 0 });
  assert.equal(await footprint(page), before, 'a reversed fade leaves nothing behind');

  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => +getComputedStyle(document.querySelector('plumb-overlay').shadowRoot.querySelector('.shade')).opacity === 1, null, { timeout: 5000 });
  assert.equal(await overlay.getByRole('button', { name: 'Blueprint mode' }).getAttribute('aria-pressed'), 'true');

  await page.evaluate(() => document.querySelector('plumb-overlay').remove());
  assert.equal(await footprint(page), before, 'removing the overlay mid-mode leaves nothing behind');
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
});

test('A weight reads as a number on the element, never as pixels', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  const mark = markFor(overlay, 'font-semibold').first();
  await mark.waitFor();
  const b = await mark.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await selected(overlay).waitFor();
  // pointing at its words says the weight as a number
  const el = await page.evaluate(() => { const r = [...document.querySelectorAll('[class*="font-semibold"]')][0].getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
  await page.mouse.move(el.x, el.y);
  await overlay.locator('.bm-at').waitFor({ timeout: 3000 });
  const pill = await overlay.locator('.bm-at').innerText();
  assert.match(pill, /weight 600/);
  assert.doesNotMatch(pill, /600px/);
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
  await page.mouse.move(...(await centre('#box')));
  await page.mouse.wheel(0, 120);
  await page.waitForFunction(() => document.querySelector('#box').scrollTop > 0, null, { timeout: 3000 });
  assert.equal(await page.evaluate(() => scrollY), 0, 'the inner box took the wheel, not the page');
  await page.mouse.move(600, 300);
  await page.mouse.wheel(0, 400);
  await page.waitForFunction(() => scrollY > 0, null, { timeout: 3000 });

  // holding Space lets the page through, for as long as it's held
  await page.keyboard.down('Space');
  await page.mouse.click(...poke);
  assert.equal(await pokes(), 1, 'with Space held the click pressed the button');
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

test('Alt-select still picks an element while blueprint is on', { timeout: 90000 }, async (t) => {
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
  await page.waitForFunction(() => { const el = window.__plumb.overlay.pinnedElement; return !!el && document.querySelector('#sync-row').contains(el); }, null, { timeout: 10000 });
});

test('Drawn only where it can be seen: a drawer over part of an element cuts its outline back; over all of it, nothing is drawn or clickable', { timeout: 90000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const row = await page.locator('#sync-row').boundingBox();
  // a drawer from the left edge to the middle of the row, over the page
  const drawer = (width) => page.evaluate((width) => { let d = document.getElementById('drawer'); if (!d) { d = document.createElement('div'); d.id = 'drawer'; d.style.cssText = 'position:fixed;left:0;top:0;bottom:0;background:#fff;z-index:10'; document.body.append(d); } d.style.width = `${width}px`; }, width);
  await drawer(row.x + row.width / 2);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view|nothing to fix/ }).waitFor({ timeout: 20000 });
  const outline = () => page.evaluate((y) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .outlines rect')].map((o) => ({ x: +o.getAttribute('x'), y: +o.getAttribute('y'), w: +o.getAttribute('width') })).find((o) => Math.abs(o.y - 0.75 - y) < 1), row.y);
  await page.waitForFunction((y) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .outlines rect')].some((o) => Math.abs(+o.getAttribute('y') - 0.75 - y) < 1), row.y, { timeout: 5000 });
  const half = await outline();
  assert.ok(Math.abs(half.x - 0.75 - (row.x + row.width / 2)) < 1.5, `the outline starts at the drawer's edge: ${JSON.stringify(half)} row ${JSON.stringify(row)}`);
  assert.ok(Math.abs(half.x + half.w + 0.75 - (row.x + row.width)) < 1.5, 'and ends at the row\'s own edge');
  // the whole row covered: no outline, and no break under the drawer can be clicked
  await drawer(row.x + row.width + 20);
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.waitForFunction((y) => ![...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .outlines rect')].some((o) => Math.abs(+o.getAttribute('y') - 0.75 - y) < 1), row.y, { timeout: 5000 });
  const under = await hits(overlay).evaluateAll((rects, row) => rects.filter((h) => { const r = h.getBoundingClientRect(); return r.left + r.width / 2 > row.x && r.left + r.width / 2 < row.x + row.width && r.top + r.height / 2 > row.y && r.top + r.height / 2 < row.y + row.height; }).length, row);
  assert.equal(under, 0, 'nothing under the drawer can be clicked');
  assert.deepEqual(errors, []);
});

test('One cause, fixed everywhere: 36 cells from one JSX line are one row; Enter selects them all, one take, one write', { timeout: 150000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url, root } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, `${url}?corners`);
  const source = join(root, 'src/App.jsx');
  const was = await readFile(source, 'utf8');
  assert.equal(was.match(/rounded-\[3px\]/g).length, 1, 'the cells are written once, on one line');
  await page.locator('#dense').scrollIntoViewIfNeeded();
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await panel(overlay).locator('.head').click(); // the list opens from its one line
  const row = rowsOf(overlay).filter({ has: page.locator('code', { hasText: /^rounded-\[3px\]/ }) });
  await row.waitFor({ timeout: 10000 });
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bpp .row')].some((r) => /^rounded-\[3px\]/.test(r.querySelector('code').textContent) && r.querySelector('.n').textContent === '36'), null, { timeout: 10000 });
  await row.click();
  assert.equal(await row.getAttribute('aria-current'), 'true');
  // Enter: one cell selected, the other 35 go with it
  await page.keyboard.press('Enter');
  await selected(overlay).waitFor();
  assert.match(await overlay.locator('.sel .pl-tag').innerText(), /×36/);
  await take(page, overlay);
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await sidebar(overlay).locator('.ok').click();
  for (let i = 0; i < 100 && /rounded-\[3px\]/.test(await readFile(source, 'utf8')); i++) await page.waitForTimeout(100);
  const now = await readFile(source, 'utf8');
  assert.equal((now.match(/rounded-\[3px\]/g) ?? []).length, 0, 'the line no longer carries the drift');
  assert.equal(now.split('\n').length, was.split('\n').length, 'one line changed in place');
  assert.equal(writes, 1, 'one write');
  assert.deepEqual(errors, []);
});

test('A cause counts every place on the page, not just the view, and N walks them one by one', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await demo(t, { html: (s) => s.replace('</body>', '<div id="more"></div></body>') });
  // forty rows from one JSX line, most of them below the fold
  await writeFile(join(root, 'src/Rows.jsx'), `export function Rows() {\n  return <section className="mt-[600px]">{Array.from({ length: 40 }, (_, i) => <div key={i} id={'row-' + i} className="h-24 p-[10px]">Row {i}</div>)}</section>;\n}\n`);
  await writeFile(join(root, 'src/entry.jsx'), (await readFile(join(root, 'src/entry.jsx'), 'utf8')) + `import { Rows } from './Rows.jsx';\ncreateRoot(document.getElementById('more')).render(<Rows />);\n`);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view/ }).waitFor({ timeout: 20000 });
  await panel(overlay).locator('.head').click();
  const row = rowsOf(overlay).filter({ has: page.locator('code', { hasText: /^p-\[10px\]/ }) });
  // the panel's count grows past the view as the rest of the page is read
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bpp .row')].some((r) => /^p-\[10px\]/.test(r.querySelector('code').textContent) && r.querySelector('.n').textContent === '40'), null, { timeout: 20000 });
  assert.match(await row.locator('.what').innerText(), /40 places · 1 line$/);
  const inView = await page.evaluate(() => [...document.querySelectorAll('[id^="row-"]')].filter((r) => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }).length);
  assert.ok(inView < 40, `most rows are off-screen: ${inView} in view`);
  // select it; N walks place by place, scrolling the page, and the row says where you are
  await row.click();
  const y0 = await page.evaluate(() => scrollY);
  await page.keyboard.press('n');
  await row.locator('.next').filter({ hasText: /^2 of 40/ }).waitFor();
  for (let i = 0; i < 20; i++) await page.keyboard.press('n');
  await row.locator('.next').filter({ hasText: /^22 of 40/ }).waitFor();
  await page.waitForFunction((y) => scrollY > y + 500, y0, { timeout: 5000 });
  const at = await page.evaluate(() => { const r = document.getElementById('row-21').getBoundingClientRect(); return r.top + r.height / 2; });
  assert.ok(Math.abs(at - 800 / 2) < 80, `the 22nd row is brought to the middle: ${at}`);
  await page.keyboard.press('N'); // Shift+N goes back
  await row.locator('.next').filter({ hasText: /^21 of 40/ }).waitFor();
  assert.deepEqual(errors, []);
});

// The blueprint against every corner a real page has (docs/briefs/blueprint-corners.md): mixed and wrapped text,
// plates, hidden things, nesting and density, positioning and clipping, runtime values, mutation, and the budgets.
// Real Vite, real React 19, real Chromium.
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
  const root = await mkdtemp(join(repo, 'fixtures/.corners-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1500 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url + '?corners');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors, overlay: page.locator('plumb-overlay') };
}
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
// everything the blueprint drew, measured in the page: bars, hits (with their labels), badges, washes, rails
const drawn = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('plumb-overlay').shadowRoot;
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
    return {
      bars: [...root.querySelectorAll('.bp svg.greek rect')].map((r) => ({ ...box(r), opacity: +r.getAttribute('fill-opacity') })),
      hits: [...root.querySelectorAll('.bp .hit')].map((h) => ({ ...box(h), label: h.getAttribute('aria-label') })),
      badges: [...root.querySelectorAll('.bp .badge circle')].map(box),
      washes: [...root.querySelectorAll('.bp svg.wash rect')].map((w) => ({ ...box(w), heat: +w.dataset.heat })),
      rails: [...root.querySelectorAll('.bp .rails g')].map((g) => g.querySelector('text').textContent),
      sheet: root.querySelector('.bp .sheet')?.innerText.replace(/\s+/g, ' ') ?? '',
    };
  });
const rectOf = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const inside = (p, r, slack = 1) => p.cx >= r.x - slack && p.cx <= r.right + slack && p.cy >= r.y - slack && p.cy <= r.bottom + slack;
const within = (p, r, slack = 1) => p.x >= r.x - slack && p.x + p.w <= r.right + slack && p.y >= r.y - slack && p.y + p.h <= r.bottom + slack;

async function on(page, overlay) {
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /off in view|all true/ }).waitFor({ timeout: 30000 });
  // the marks are drawn on the frame after the count
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit').length > 100, null, { timeout: 10000 });
}

test('words: mixed weights, wrapping, truncation, controls, editable, pseudo, svg text, tiny print', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  const prose = await rectOf(page, '#prose'), bold = await rectOf(page, '#prose b');
  const proseBars = d.bars.filter((b) => within(b, prose));
  const lines = new Set(proseBars.map((b) => Math.round(b.cy)));
  assert.ok(lines.size >= 3, `a bar per line box of the wrapped paragraph: ${lines.size} lines`);
  const boldBar = proseBars.find((b) => Math.abs(b.x - bold.x) < 2);
  const plainBar = proseBars.find((b) => b.x < bold.x - 2 && Math.abs(b.cy - boldBar.cy) < 2);
  assert.ok(boldBar && plainBar && boldBar.opacity > plainBar.opacity, 'the bold run is a heavier bar on the same line');
  const truncated = await rectOf(page, '#truncated');
  const cut = d.bars.filter((b) => within(b, truncated));
  assert.equal(cut.length, 1);
  assert.ok(cut[0].w <= truncated.w + 1, 'a truncated label is barred to its visible box, not its string');
  const field = await rectOf(page, '#field');
  assert.equal(d.bars.filter((b) => within(b, field)).length, 0, 'a control has no bar');
  assert.equal(await page.locator('#field').evaluate((el) => getComputedStyle(el).color), 'rgb(255, 255, 255)', "a control's own text stays white");
  const editable = await rectOf(page, '#editable');
  assert.equal(d.bars.filter((b) => within(b, editable)).length, 1, 'editable words are barred');
  assert.equal(await page.locator('#editable').evaluate((el) => getComputedStyle(el).caretColor), 'rgb(255, 255, 255)');
  assert.equal(await page.locator('#pseudo').evaluate((el) => getComputedStyle(el, '::before').color), 'rgba(0, 0, 0, 0)', 'pseudo-element words are painted out');
  const pseudo = await rectOf(page, '#pseudo');
  assert.equal(d.bars.filter((b) => within(b, pseudo)).length, 0, 'a pseudo-element is not a text node, so no bar');
  const logo = await rectOf(page, '#logo');
  assert.equal(d.bars.filter((b) => within(b, logo)).length, 0, 'svg text has no bar');
  const tiny = await rectOf(page, '#tiny');
  const tinyBar = d.bars.find((b) => within(b, tiny));
  assert.ok(tinyBar && tinyBar.h >= 3, `tiny print keeps a 3px bar: ${JSON.stringify(tinyBar)}`);
  assert.deepEqual(errors, []);
});

test('plates: svg in a button, a standalone svg, an image, a canvas, a background image; nothing inside an svg is read', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  const styles = await page.evaluate(() => {
    const cs = (sel) => getComputedStyle(document.querySelector(sel));
    return { logoBg: cs('#logo').backgroundImage, logoOutline: cs('#logo').outlineStyle, pathVis: getComputedStyle(document.querySelector('#logo path')).visibility, iconVis: getComputedStyle(document.querySelector('#icon circle')).visibility,
      buttonShadow: cs('#icon-button').boxShadow, photo: cs('#photo').opacity, chart: cs('#chart').opacity, hero: cs('#hero').backgroundImage };
  });
  assert.match(styles.logoBg, /repeating-linear-gradient/, 'an svg is a hatched plate');
  assert.equal(styles.logoOutline, 'solid');
  assert.equal(styles.pathVis, 'hidden'); assert.equal(styles.iconVis, 'hidden');
  assert.match(styles.buttonShadow, /inset/, 'the icon button keeps its outline');
  assert.equal(styles.photo, '0.18'); assert.equal(styles.chart, '0.18');
  assert.equal(styles.hero, 'none', 'a background image is cleared');
  const logo = await rectOf(page, '#logo'), icon = await rectOf(page, '#icon');
  assert.equal(d.hits.filter((h) => inside(h, logo)).length, 0, 'nothing inside the logo is marked');
  assert.equal(d.hits.filter((h) => inside(h, icon)).length, 0, 'nothing inside the icon is marked');
  assert.ok(!d.hits.some((h) => /fill|stroke/.test(h.label)), `no svg attribute is read as drift: ${d.hits.map((h) => h.label).filter((l) => /fill|stroke/.test(l))}`);
  assert.deepEqual(errors, []);
});

test('hidden and empty: display none, visibility hidden, a closed details, a lone child, an info-level value draw nothing', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  const invisible = await rectOf(page, '#invisible');
  assert.equal(d.bars.filter((b) => within(b, invisible)).length + d.hits.filter((h) => inside(h, invisible)).length + d.washes.filter((w) => within(w, invisible)).length, 0, '#invisible draws nothing');
  // the three hidden things share their 11px classes; none of them is a break, a bar or a wash
  assert.equal(d.hits.filter((h) => /(gap|p)-\[11px\]/.test(h.label)).length, 0, `hidden elements are never marked: ${d.hits.filter((h) => /(gap|p)-\[11px\]/.test(h.label)).map((h) => h.label)}`);
  // a closed details keeps its words out of the drawing; opening it brings their bar and their breaks
  const barsClosed = d.bars.length;
  await page.evaluate(() => { document.getElementById('folded').open = true; }); // a toggle, not a pointer click that a mark above the summary might take
  await page.waitForFunction((n) => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp svg.greek rect').length > n, barsClosed, { timeout: 3000 });
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => /(gap|p)-\[11px\]/.test(h.getAttribute('aria-label'))), null, { timeout: 10000 });
  assert.ok(!d.hits.some((h) => /computed at runtime/.test(h.label)), 'an info-level finding is not a break');
  assert.ok(!/runtime/.test(d.sheet), 'nor a cause');
  const lonely = await rectOf(page, '#lonely');
  const lone = d.hits.filter((h) => inside(h, lonely) && /gap-\[6px\]/.test(h.label));
  assert.equal(lone.length, 1, 'a gap with one child is still a break, drawn as a dot');
  assert.ok(lone[0].w <= 20 && lone[0].h <= 20, `a dot, not a dimension: ${JSON.stringify(lone[0])}`);
  assert.deepEqual(errors, []);
});

test('nesting and density: a dense grid, repeated rows from one site, a nested button, a page-sized wrapper, and the rails', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.evaluate(() => { performance.clearResourceTimings(); performance.setResourceTimingBufferSize(4000); });
  await on(page, overlay);
  const d = await drawn(page);
  const dense = await rectOf(page, '#dense');
  const cells = d.hits.filter((h) => inside(h, dense) && /rounded-\[3px\]/.test(h.label));
  assert.equal(cells.length, 36, `every cell's corner is a break: ${cells.length}`);
  const cellRects = await page.evaluate(() => [...document.querySelectorAll('#dense span')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; }));
  const perCell = cellRects.map((c) => d.badges.filter((b) => inside(b, c, 10)).length);
  assert.ok(perCell.every((n) => n >= 1), `every cell carries a badge: ${perCell}`);
  assert.ok(d.rails.length <= 40, `the rails carry one tick per distinct span, not one per cell: ${d.rails.length}`);
  assert.ok(d.rails.filter((r) => r === '5').length <= 2, `the grid's repeated 5px gap is one tick per rail: ${d.rails.filter((r) => r === '5').length}`);
  // the four rows come from one JSX site: one reading, four sets of marks
  const rows = await rectOf(page, '#rows');
  const rowHits = d.hits.filter((h) => inside(h, rows) && /rounded-\[5px\]/.test(h.label));
  assert.equal(rowHits.length, 4, `four rows, four corner breaks: ${JSON.stringify(rowHits.map((h) => [h.label.slice(0, 40), Math.round(h.cx), Math.round(h.cy)]))} rows=${JSON.stringify(rows)}`);
  const rowReads = await page.evaluate(() => window.__plumb.overlay.readsFor(document.querySelector('#rows li').getAttribute('data-plumb-source').split('#')[0]));
  assert.equal(rowReads, 1, 'the row site is read once for four rows');
  // the nested button is washed only if warmer than the wrapper; the wrapper, under 60% of the view, is washed
  const wrapper = await rectOf(page, '#wrapper'), nested = await rectOf(page, '#nested-button');
  assert.ok(d.washes.some((w) => Math.abs(w.x - wrapper.x) < 1 && Math.abs(w.y - wrapper.y) < 1), 'the wrapper is washed');
  const wrapperHeat = d.washes.find((w) => Math.abs(w.x - wrapper.x) < 1 && Math.abs(w.y - wrapper.y) < 1).heat;
  const nestedWash = d.washes.find((w) => Math.abs(w.x - nested.x) < 1 && Math.abs(w.y - nested.y) < 1);
  assert.ok(!nestedWash || nestedWash.heat > wrapperHeat, 'a nested element is washed only when warmer than what holds it');
  assert.ok(d.badges.filter((b) => inside(b, nested, 12)).length >= 1);
  assert.deepEqual(errors, []);
});

test('position and clipping: an absolute badge, a scaled element, an inner scroll container', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  const badge = await rectOf(page, '#corner-badge');
  assert.ok(d.hits.some((h) => inside(h, badge, 14) && /text-\[11px\]/.test(h.label)), 'the absolute badge is marked where it sits');
  const scaled = await rectOf(page, '#scaled');
  assert.ok(d.hits.some((h) => inside(h, scaled, 14) && /rounded-\[9px\]/.test(h.label)), 'the scaled element is marked at its transformed box');
  const scroller = await rectOf(page, '#scroller');
  const lineHits = d.hits.filter((h) => /rounded-\[4px\]/.test(h.label));
  assert.ok(lineHits.length >= 3 && lineHits.length < 12, `only the lines that intersect the view are read: ${lineHits.length}`);
  assert.ok(lineHits.every((h) => inside(h, scroller, 2)), 'no mark for a line scrolled out of its container is drawn outside it');
  assert.deepEqual(errors, []);
});

test('runtime values and the peek: a step is a break, an opaque width is not; D moves only what has a token', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  assert.ok(d.hits.some((h) => /steps by 13px/.test(h.label)), `the stagger's margin is a step break: ${d.hits.map((h) => h.label).filter((l) => /margin/.test(l))}`);
  const before = await page.evaluate(() => ({ cell: getComputedStyle(document.querySelector('#dense span')).borderRadius, pad: getComputedStyle(document.querySelector('#wrapper')).paddingTop, stagger: getComputedStyle(document.querySelector('#stagger-2')).marginLeft, width: getComputedStyle(document.querySelector('#stagger-2')).width }));
  await page.keyboard.down('d');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-plumb-peek'));
  const held = await page.evaluate(() => ({ cell: getComputedStyle(document.querySelector('#dense span')).borderRadius, pad: getComputedStyle(document.querySelector('#wrapper')).paddingTop, stagger: getComputedStyle(document.querySelector('#stagger-2')).marginLeft, width: getComputedStyle(document.querySelector('#stagger-2')).width }));
  assert.ok(['6px', '8px'].includes(held.cell), `a cell's corner takes a token: ${held.cell}`);
  assert.ok(['12px', '16px'].includes(held.pad), `the wrapper's padding takes a token: ${held.pad}`);
  assert.equal(held.width, before.width, 'an opaque width does not move');
  await page.keyboard.up('d');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-peek'));
  const after = await page.evaluate(() => ({ cell: getComputedStyle(document.querySelector('#dense span')).borderRadius, pad: getComputedStyle(document.querySelector('#wrapper')).paddingTop, stagger: getComputedStyle(document.querySelector('#stagger-2')).marginLeft, width: getComputedStyle(document.querySelector('#stagger-2')).width, residue: [...document.querySelectorAll('#corners [style]')].map((e) => e.getAttribute('style')).filter((s) => /important/.test(s)).length }));
  assert.deepEqual({ ...after, residue: undefined }, { ...before, residue: undefined });
  assert.equal(after.residue, 0, 'no preview is left behind');
  assert.deepEqual(errors, []);
});

test('the page changes while on: a removed element takes its marks; an added one is inked, barred and read', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const rowsRect = await rectOf(page, '#rows');
  const rowsBefore = (await drawn(page)).hits.filter((h) => inside(h, rowsRect) && /rounded-\[5px\]/.test(h.label)).length;
  assert.equal(rowsBefore, 4);
  const rowHits = () => page.evaluate(() => { const r = document.getElementById('rows').getBoundingClientRect(); return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].filter((h) => { const q = h.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2; return cx >= r.left - 1 && cx <= r.right + 1 && cy >= r.top - 1 && cy <= r.bottom + 1 && /rounded-\[5px\]/.test(h.getAttribute('aria-label')); }).length; });
  await page.evaluate(() => document.querySelector('#rows li').remove());
  await page.waitForFunction(async () => true);
  for (let i = 0; i < 100 && (await rowHits()) !== 3; i++) await page.waitForTimeout(50);
  assert.equal(await rowHits(), 3, 'a removed row takes its break');
  await page.evaluate(() => { const li = document.querySelector('#rows li').cloneNode(true); li.id = 'added'; li.querySelector('span').textContent = 'added words'; document.querySelector('#rows').append(li); });
  await page.waitForFunction(() => document.getElementById('added').hasAttribute('data-plumb-ink'), null, { timeout: 2000 });
  await page.waitForFunction(() => { const r = document.getElementById('added').getBoundingClientRect(); return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp svg.greek rect')].some((b) => { const q = b.getBoundingClientRect(); return q.top >= r.top && q.bottom <= r.bottom && q.left >= r.left; }); }, null, { timeout: 2000 });
  for (let i = 0; i < 200 && (await rowHits()) !== 4; i++) await page.waitForTimeout(50);
  assert.equal(await rowHits(), 4, 'an added row is read and gets its break');
  assert.deepEqual(errors, []);
});

test('budgets and the way back: entry under budget, no long frame after the first, and the page put back exactly', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const before = await footprint(page);
  await page.evaluate(() => { performance.clearMeasures(); window.__frames = []; let last = performance.now(); const tick = (t) => { window.__frames.push(t - last); last = t; if (window.__frames.length < 600) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const t0 = Date.now();
  await on(page, overlay);
  const toCount = Date.now() - t0;
  const measures = await page.evaluate(() => { const by = {}; for (const m of performance.getEntriesByType('measure')) if (m.name.startsWith('plumb:')) { const b = (by[m.name] ??= []); b.push(Math.round(m.duration)); } return { by, frames: window.__frames.map(Math.round) }; });
  const marks = measures.by['plumb:marks'] ?? [];
  assert.ok(toCount < 15000, `entry to count: ${toCount}ms`);
  assert.ok(marks[0] < 400, `the first marks frame: ${marks[0]}ms`);
  assert.ok(Math.max(...marks.slice(1)) < 150, `a marks frame after the first: ${Math.max(...marks.slice(1))}ms`);
  assert.ok((measures.by['plumb:greek-measure'] ?? [0]).every((d) => d < 60), `greek measure: ${measures.by['plumb:greek-measure']}`);
  const long = measures.frames.slice(5).filter((d) => d > 500);
  assert.equal(long.length, 0, `frames over 500ms after entry: ${long}`);
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-plumb-field'));
  assert.equal(await footprint(page), before, 'every attribute, inline style and stylesheet is put back');
  assert.deepEqual(errors, []);
});

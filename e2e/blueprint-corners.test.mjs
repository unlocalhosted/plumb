// The blueprint against every corner a real page has (docs/briefs/blueprint-corners.md): mixed and wrapped text,
// plates, hidden things, nesting and density, positioning and clipping, runtime values, mutation, and the budgets.
// Blueprint holds the page under one dim and lifts drift out of it (docs/briefs/blueprint-v2.md, layer 2): the page
// itself is never restyled, so each corner is checked for what is drawn over it and for the page keeping its paint.
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
// everything the blueprint drew, measured in the page: hits (with their labels), outlines, labels, the dim's cuts
const drawn = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('plumb-overlay').shadowRoot;
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
    return {
      hits: [...root.querySelectorAll('.bp .hit')].map((h) => ({ ...box(h), label: h.getAttribute('aria-label') })),
      // registration: an element is marked when it has heat; the zone says whose it is (data-box). One inside another
      // marked element is inner. No labels, no dim
      outlines: (() => { const boxes = [...new Set([...root.querySelectorAll('.bp .heat .zone')].map((z) => z.dataset.box))].map((b) => { const [x, y, w, h] = b.split(',').map(Number); return { x, y, w, h }; }); return boxes.map((o) => ({ ...o, inner: boxes.some((p) => p !== o && p.x <= o.x + 1 && p.y <= o.y + 1 && p.x + p.w >= o.x + o.w - 1 && p.y + p.h >= o.y + o.h - 1 && p.w * p.h > o.w * o.h) })); })(),
      labels: [...root.querySelectorAll('.bp .lbl')].map((l) => ({ ...box(l), text: l.textContent })),
      clip: root.querySelector('.shade')?.style.clipPath ?? '',
      sheet: root.querySelector('.bp .sheet')?.innerText.replace(/\s+/g, ' ') ?? '',
    };
  });
// the outline drawn at an element's box
const outlineAt = (d, r) => d.outlines.find((o) => Math.abs(o.x - r.x) < 1.5 && Math.abs(o.y - r.y) < 1.5 && Math.abs(o.w - r.w) < 2);
// the page's own paint for a few properties, to prove blueprint never restyles it
const paint = (page, selector, pseudo) => page.locator(selector).first().evaluate((el, pseudo) => { const cs = getComputedStyle(el, pseudo); return { color: cs.color, bg: cs.backgroundColor, image: cs.backgroundImage, shadow: cs.boxShadow, opacity: cs.opacity, outline: cs.outlineStyle, caret: cs.caretColor, visibility: cs.visibility }; }, pseudo ?? null);
const rectOf = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const inside = (p, r, slack = 1) => p.cx >= r.x - slack && p.cx <= r.right + slack && p.cy >= r.y - slack && p.cy <= r.bottom + slack;
const within = (p, r, slack = 1) => p.x >= r.x - slack && p.x + p.w <= r.right + slack && p.y >= r.y - slack && p.y + p.h <= r.bottom + slack;

async function on(page, overlay) {
  await page.keyboard.press('Alt+B');
  await say(overlay).filter({ hasText: /problems? in view|nothing to fix/ }).waitFor({ timeout: 30000 });
  // the marks are drawn on the frame after the count
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit').length > 100, null, { timeout: 10000 });
}

test('words: mixed weights, wrapping, truncation, controls, editable, pseudo, svg text and tiny print keep their own paint', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const sels = ['#prose', '#prose b', '#truncated', '#field', '#editable', '#tiny', '#logo text'];
  const before = await Promise.all([...sels.map((s) => paint(page, s)), paint(page, '#pseudo', '::before')]);
  await on(page, overlay);
  const after = await Promise.all([...sels.map((s) => paint(page, s)), paint(page, '#pseudo', '::before')]);
  assert.deepEqual(after, before, 'every word on the page is drawn as the page draws it');
  // the words are not drawn over: no outline or label sits on a paragraph with no drift
  const d = await drawn(page);
  const prose = await rectOf(page, '#prose');
  assert.equal(d.outlines.filter((o) => Math.abs(o.x - prose.x) < 1 && Math.abs(o.y - prose.y) < 1).length, 0, 'a paragraph on the system has no heat');
  const tiny = await rectOf(page, '#tiny');
  assert.ok(outlineAt(d, tiny), 'tiny print off the scale has heat where it sits');
  assert.deepEqual(errors, []);
});

test('plates: svg in a button, a standalone svg, an image, a canvas, a background image keep their paint; nothing inside an svg is read', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  const sels = ['#logo', '#logo path', '#icon circle', '#icon-button', '#photo', '#chart', '#hero'];
  const before = await Promise.all(sels.map((s) => paint(page, s)));
  await on(page, overlay);
  assert.deepEqual(await Promise.all(sels.map((s) => paint(page, s))), before, 'a plate is drawn as the page draws it');
  const d = await drawn(page);
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
  assert.equal(d.hits.filter((h) => inside(h, invisible)).length + d.outlines.filter((o) => within(o, invisible)).length + d.labels.filter((l) => within(l, invisible)).length, 0, '#invisible draws nothing');
  // the three hidden things share their 11px classes; none of them is a break, an outline or a label
  assert.equal(d.hits.filter((h) => /(gap|p)-\[11px\]/.test(h.label)).length, 0, `hidden elements are never marked: ${d.hits.filter((h) => /(gap|p)-\[11px\]/.test(h.label)).map((h) => h.label)}`);
  // a closed details keeps its body out of the drawing; opening it brings its breaks
  await page.evaluate(() => { document.getElementById('folded').open = true; }); // a toggle, not a pointer click that a mark above the summary might take
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => /(gap|p)-\[11px\]/.test(h.getAttribute('aria-label'))), null, { timeout: 10000 });
  assert.ok(!d.hits.some((h) => /computed at runtime/.test(h.label)), 'an info-level finding is not a break');
  assert.ok(!/runtime/.test(d.sheet), 'nor a cause');
  const lonely = await rectOf(page, '#lonely');
  const lone = d.hits.filter((h) => inside(h, lonely) && /gap-\[6px\]/.test(h.label));
  assert.equal(lone.length, 1, 'a gap with one child is still a break, drawn as a dot');
  assert.ok(lone[0].w <= 20 && lone[0].h <= 20, `a dot, not a dimension: ${JSON.stringify(lone[0])}`);
  assert.deepEqual(errors, []);
});

test('nesting and density: a dense grid, repeated rows from one site, a nested button, a wrapper holding them all', { timeout: 120000 }, async (t) => {
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
  // the wrapper holds the grid, the rows and the button: each drifted element has its own heat, the inner ones inside
  // the wrapper's; nothing is labelled and nothing is dimmed
  const wrapper = await rectOf(page, '#wrapper'), nested = await rectOf(page, '#nested-button');
  const top = outlineAt(d, wrapper);
  assert.ok(top && !top.inner, `the wrapper has its own heat: ${JSON.stringify(top)}`);
  const cellRects = await page.evaluate(() => [...document.querySelectorAll('#dense span')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; }));
  const cellOutlines = cellRects.map((c) => outlineAt(d, c));
  assert.ok(cellOutlines.every((o) => o?.inner), `every cell has heat, inside the wrapper's: ${cellOutlines.filter((o) => !o?.inner).length} not`);
  assert.ok(outlineAt(d, nested)?.inner, 'the nested button has heat inside its wrapper');
  assert.equal(d.labels.length, 0, 'no labels');
  assert.equal(d.clip, '', 'no dim');
  // the four rows come from one JSX site: one reading, four sets of marks
  const rows = await rectOf(page, '#rows');
  const rowHits = d.hits.filter((h) => inside(h, rows) && /rounded-\[5px\]/.test(h.label));
  assert.equal(rowHits.length, 4, `four rows, four corner breaks: ${JSON.stringify(rowHits.map((h) => [h.label.slice(0, 40), Math.round(h.cx), Math.round(h.cy)]))} rows=${JSON.stringify(rows)}`);
  const rowReads = await page.evaluate(() => window.__plumb.overlay.readsFor(document.querySelector('#rows li').getAttribute('data-plumb-source').split('#')[0]));
  assert.equal(rowReads, 1, 'the row site is read once for four rows');
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

test('runtime values: a step is a break, an opaque width is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await demo(t);
  const { page, errors, overlay } = await open(t, launched, url);
  await on(page, overlay);
  const d = await drawn(page);
  assert.ok(d.hits.some((h) => /steps by 13px/.test(h.label)), `the stagger's margin is a step break: ${d.hits.map((h) => h.label).filter((l) => /margin/.test(l))}`);
  assert.ok(!d.hits.some((h) => /computed at runtime/.test(h.label)), 'an opaque width is not a break');
  assert.deepEqual(errors, []);
});

test('the page changes while on: a removed element takes its marks; an added one is read and gets its heat', { timeout: 120000 }, async (t) => {
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
  for (let i = 0; i < 200 && (await rowHits()) !== 4; i++) await page.waitForTimeout(50);
  assert.equal(await rowHits(), 4, 'an added row is read and gets its break');
  const added = await rectOf(page, '#added');
  await page.waitForFunction((r) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone')].some((z) => { const [x, y] = z.dataset.box.split(',').map(Number); return Math.abs(x - r.x) < 1.5 && Math.abs(y - r.y) < 1.5; }), added, { timeout: 3000 });
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
  const long = measures.frames.slice(5).filter((d) => d > 500);
  assert.equal(long.length, 0, `frames over 500ms after entry: ${long}`);
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp').hidden);
  assert.equal(await footprint(page), before, 'nothing was written to the page, so nothing is left on it');
  assert.deepEqual(errors, []);
});

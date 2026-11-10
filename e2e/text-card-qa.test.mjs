// The text card's QA findings (docs/qa/element-card-results.md, group 6, and docs/briefs/qa-fixes.md, cause 5), each
// reproduced on a copy of overlay/demo with a few more words: a fluid (clamp) title, words whose className is built in
// code, words whose classes come from a component's usage, and words that wear a text style but measure otherwise.
// The card reads values as the page shows them, says what it can't change at rest, writes where the classes are
// written, keeps clear of the fix bar, names the levels above it, and can be used from the keyboard.
// Ported to the panel (token pickers, a colour picker, one Write; docs/journey.md chapter 17). Two findings belonged to
// the old card's scale and have no place in the panel; two are open gaps (typing a number, a style not measured
// here), kept and skipped with their reason so they are not lost.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

const EXTRA = `
      <section id="qa" className="flex flex-col gap-s3">
        <h2 id="qa-clamp" className="text-[clamp(1rem,2vw,1.25rem)] font-semibold">Clamped title</h2>
        <p id="qa-dyn" className={'text-body font-semibold ' + tone}>Words built in code</p>
        <Box id="qa-box" className="text-[9px] text-ink-muted">box words</Box>
        <p id="qa-styled" className="type-body-medium" style={{ fontSize: 14 }}>Styled words</p>
        <p id="qa-onstyle" className="type-body-medium">Words on a style</p>
        <p id="qa-semi" className="text-title font-semibold">Semibold words</p>
        <div style={{ color: 'oklab(0.5 0.1 0.05 / 0.5)' }}><p id="qa-oklab" className="text-body">Words in a mixed colour</p></div>
        <div style={{ color: 'color-mix(in oklab, #15181b, #15181b)' }}><p id="qa-inkmix" className="text-body">Words in ink, mixed</p></div>
      </section>
`;
const HEAD = `const tone = 'text-ink';
function Box({ id, className, children }) {
  return <p id={id} className={className}>{children}</p>;
}
`;

let shared = null, cleanup = null;
after(() => cleanup?.());
async function setup(t) {
  if (shared) return shared;
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  const root = await mkdtemp(join(repo, 'fixtures/.text-card-qa-'));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const app = join(root, 'src/App.jsx');
  const source = await readFile(app, 'utf8');
  const anchor = "      {new URLSearchParams(location.search).has('corners') && <Corners />}";
  assert.ok(source.includes(anchor));
  await writeFile(app, HEAD + source.replace(anchor, EXTRA + anchor));
  // a text style the project defines (Body medium: 16 / 1.6), and its class
  const css = join(root, 'src/styles.css'), styles = await readFile(css, 'utf8');
  await writeFile(css, styles.replace('  --text-body: 14px;', '  --text-body: 14px;\n  --text-body-medium: 16px;\n  --text-body-medium--line-height: 1.6;')
    + '\n@utility type-body-medium { font-size: var(--text-body-medium); line-height: var(--text-body-medium--line-height); }\n');
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  cleanup = async () => { await browser.close(); await server.close(); await rm(root, { recursive: true, force: true }); };
  shared = { browser, root, app, url: `http://127.0.0.1:${server.httpServer.address().port}/?corners` };
  return shared;
}

async function open(t, selector, { viewport = { width: 1280, height: 900 }, before } = {}) {
  const s = await setup(t); if (!s) return null;
  const page = await s.browser.newPage({ reducedMotion: 'reduce', viewport });
  t.after(() => page.close());
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(s.url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), el = page.locator(selector);
  await before?.(page, el);
  await el.click({ modifiers: ['Alt'] });
  await overlay.locator('.tc .pk .row[aria-label="Font size"]').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .ph'), null, { timeout: 20000 });
  return { page, overlay, el, card: overlay.locator('.tc'), errors, root: s.root, app: s.app };
}
// the panel's pieces: a value's picker, what it shows now, its button, the colour field, the one Write
const row = (card, name) => card.locator(`.pk .row[aria-label="${name}"]`);
const shows = async (r) => (await r.locator('.slot:not(.gone)').innerText()).replace(/\s+/g, ' ').trim();
const VALUES = ['Font size', 'Line height', 'Letter spacing', 'Weight'];
const css = (el, prop) => el.evaluate((n, p) => getComputedStyle(n).getPropertyValue(p), prop);
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const overlaps = (a, b) => a && b && a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

// F6-01, F6-02: a fluid size is said plainly (its px now, and that it is fluid), never in the colour field; the colour
// list's swatches are big enough to point at and pick
test('F6-01, F6-02: a clamp() size reads as its px and fluid; the colour field reads a colour; colours can be pointed at and picked', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-clamp'); if (!o) return;
  const { card, el, errors } = o;
  const color = card.locator('.pk .cf');
  assert.doesNotMatch(await text(color), /clamp/, 'the colour field never shows a size');
  assert.match(await text(color), /ink|rgb|#|oklch/, `a colour: ${await text(color)}`);
  const px = Math.round(parseFloat(await css(el, 'font-size')));
  assert.match(await shows(row(card, 'Font size')), new RegExp(`^${px}px fluid$`), 'the size it measures now, said fluid');
  assert.match(await text(card.locator('[role="note"]')), /clamp\(1rem, ?2vw, ?1\.25rem\)/, 'its fluid value, said at rest');
  // every colour: big enough to point at, and pointing at one shows it on the words
  await color.click(); await card.locator('.cp .all').click();
  const shades = card.locator('.cp .shades .shade');
  await shades.first().waitFor();
  const boxes = await shades.evaluateAll((els) => els.map((b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }));
  for (const [w, h] of boxes) assert.ok(w >= 20 && h >= 20, `a colour is ${w}×${h}`);
  const before = await css(el, 'color');
  await shades.last().hover();
  await o.page.waitForFunction((b) => getComputedStyle(document.getElementById('qa-clamp')).color !== b, before, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

// F6-03: the leading is a ratio of the size: a size previewed never changes what the leading field reads
test('F6-03: leading reads the same while a size is previewed', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, el, errors } = o;
  const leading = row(card, 'Line height');
  const was = await shows(leading);
  const ratio = Math.round((parseFloat(await css(el, 'line-height')) / parseFloat(await css(el, 'font-size'))) * 100) / 100;
  assert.match(was, new RegExp(`^${ratio}\\b`), `the leading it measures, as a ratio: ${was}`);
  await row(card, 'Font size').locator('.val').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await css(el, 'font-size'), '12px');
  assert.equal(await shows(leading), was, 'the leading field is not recomputed against the previewed size');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

// F6-04: words whose className is built in code are locked at rest, with the reason in plain words; keys change nothing
test('F6-04: a className built in code: every field locked, the reason said at rest, nothing previewed or written', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-dyn'); if (!o) return;
  const { page, card, el, app, errors } = o;
  const file = await readFile(app, 'utf8');
  for (const k of VALUES) assert.equal(await row(card, k).evaluate((r) => r.classList.contains('locked')), true, `${k} is locked`);
  assert.match(await text(card.locator('[role="note"]')), /built in code/);
  const before = await css(el, 'font-size');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  assert.equal(await css(el, 'font-size'), before, 'nothing previewed');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  assert.equal(await readFile(app, 'utf8'), file, 'nothing written');
  assert.deepEqual(errors, []);
});

// F6-05: digits typed with a field in hand open it, and the step they reach is previewed as they are typed; the
// sentence never puts the words below a level of their own size
test('F6-05: typed digits preview the step they reach; Esc puts it back; the sentence is consistent', { timeout: 120000, skip: 'the new text panel takes no typed numbers yet (open gap)' }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, el, errors } = o;
  // the field in hand: size (the first value after the style)
  while ((await card.locator('.fld[data-at]').getAttribute('data-key')) !== 'font-size') await page.keyboard.press('ArrowDown');
  await page.keyboard.type('12');
  assert.equal(await css(el, 'font-size'), '12px', 'previewed as typed');
  assert.match(await text(card.locator('.fld[data-key="font-size"]')), /^12/);
  await page.keyboard.press('Escape');
  assert.equal(await css(el, 'font-size'), '14px');
  const fit = card.locator('.rail .fit');
  await card.locator('.fld[data-key="font-size"]').click();
  if (await fit.count()) {
    const said = await text(fit);
    const own = parseFloat(await css(el, 'font-size'));
    assert.doesNotMatch(said, new RegExp(`(below|above) the \\w+ \\(${own}px\\)`), `never below or above its own size: ${said}`);
  }
  assert.deepEqual(errors, []);
});

// F6-06: a style worn but not measured (Body medium is 16 / 1.6; these words measure 14): the field says so
test('F6-06: the Style field marks a style whose values the words do not have', { timeout: 120000, skip: 'the new text panel does not yet mark a style the words do not measure (open gap)' }, async (t) => {
  const o = await open(t, '#qa-styled'); if (!o) return;
  const { card, errors } = o;
  const style = card.locator('.fld[data-menu="style"]');
  assert.match(await text(style), /Body/);
  assert.equal(await style.getAttribute('data-off'), '', 'marked as not its values');
  assert.match(await text(style), /14px here/);
  assert.deepEqual(errors, []);
});

// F6-07, F6-08 (the old scale's drag, retired with it): a drag on a value moves through your tokens under the hand,
// each one on the words at once, and lands on one when let go; it is held, not written
test('a drag on a value moves through the tokens under the hand and lands on one, held for Write', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, el, app, errors } = o;
  const file = await readFile(app, 'utf8');
  const box = await row(card, 'Font size').locator('.val').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y - 40, { steps: 8 });
  assert.ok(parseFloat(await css(el, 'font-size')) > 14, 'up is bigger, shown on the words as it goes');
  await page.mouse.up();
  assert.match(await text(card.locator('[data-do="write"]')), /Write 1 change/, 'held, counted');
  assert.equal(await readFile(app, 'utf8'), file, 'not written until Write');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

// F6-09: the card takes focus when it opens; each value is a button reached with Tab, named with its value
test('F6-09: focus moves into the card; the values are reached with Tab and say their value', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, errors } = o;
  const active = () => page.evaluate(() => { const a = document.querySelector('plumb-overlay').shadowRoot.activeElement; return a ? (a.closest('.row')?.getAttribute('aria-label') ?? a.className) : null; });
  assert.notEqual(await active(), null, 'focus is in the card');
  for (const k of VALUES) assert.match(await row(card, k).locator('.val').getAttribute('aria-label'), new RegExp(`^${k}: .+`), `${k} says its value`);
  const seen = [];
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); seen.push(await active()); }
  for (const k of VALUES) assert.ok(seen.includes(k), `Tab reaches ${k}: ${seen.join(', ')}`);
  assert.deepEqual(errors, []);
});

// placement: the card keeps clear of the fix bar (geometry.js clearOf), as the element card does
test('the text card never covers the fix bar', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#tiny', { before: async (page, el) => {
    // the words near the bottom of the screen, just above the fix bar's line
    await el.evaluate((n) => { const r = n.getBoundingClientRect(); scrollBy(0, r.top - (innerHeight - 150)); });
  } }); if (!o) return;
  const { overlay, card, errors } = o;
  const bar = await overlay.locator('.fx').boundingBox(), c = await card.boundingBox();
  assert.ok(bar && c, 'both shown');
  assert.ok(!overlaps(bar, c), `the card ${JSON.stringify(c)} clear of the bar ${JSON.stringify(bar)}`);
  assert.deepEqual(errors, []);
});

// levels: the header names the levels above the words; ⌥↑ moves to the box that holds them
test('the header names the levels above; ⌥↑ moves up to the box that holds the words', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#tiny'); if (!o) return;
  const { page, overlay, card, errors } = o;
  const ups = card.locator('.hd .ups .up');
  assert.ok(await ups.count() >= 2, 'the levels above, named');
  assert.match(await text(card.locator('.hd .ups')), /div/);
  assert.match(await text(card.locator('.hd .ups')), /⌥↑/);
  await page.keyboard.press('Alt+ArrowUp');
  await overlay.locator('.ec').waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.tc').isVisible(), false);
  assert.deepEqual(errors, []);
});

// where it writes: classes passed in by a component's usage are written at that usage, not on the component's line
test('words whose classes come from a usage are written at that usage; Undo restores the file', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-box'); if (!o) return;
  const { page, overlay, card, app, errors } = o;
  const original = await readFile(app, 'utf8');
  assert.match(await text(card.locator('.hd .at')), new RegExp(`App\\.jsx:${original.split('\n').findIndex((l) => l.includes('id="qa-box"')) + 1}$`), 'the header names the usage');
  const size = row(card, 'Font size');
  assert.equal(await size.locator('.val').evaluate((v) => v.classList.contains('on-hard')), true, '9px is hard-coded');
  await size.locator('.val').focus();
  await page.keyboard.press('ArrowUp');
  await card.locator('[data-do="write"]').click();
  await overlay.locator('.fx .said').filter({ hasText: /Changed size to 12px/ }).waitFor({ timeout: 20000 });
  const now = await readFile(app, 'utf8');
  assert.match(now, /<Box id="qa-box" className="text-small text-ink-muted">/);
  assert.match(now, /<p id=\{id\} className=\{className\}>/, 'the component’s own line is untouched');
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.wt:not([hidden]), .fx .said')?.textContent ?? ''), null, { timeout: 20000 });
  assert.equal(await readFile(app, 'utf8'), original);
  assert.deepEqual(errors, []);
});

// ── round 2 (docs/briefs/qa-fixes-2.md, the text card) ──

// F5-01: the weight reads whole: its number and its name, never cut off
test('F5-01: the weight reads 600 semibold, its number never cut off', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-semi'); if (!o) return;
  const { card, errors } = o;
  const weight = row(card, 'Weight');
  assert.match(await shows(weight), /^600 semibold$/i);
  const cut = await weight.evaluate((f) => [...f.querySelectorAll('.slot:not(.gone) b')].map((s) => [s.className, s.scrollWidth, s.clientWidth]).filter(([, sw, cw]) => sw > cw));
  assert.deepEqual(cut, [], 'no part of the weight is cut off');
  assert.deepEqual(errors, []);
});

// F5-03: a colour is said as the project's token when it is one, else as a plain hex or rgb; never oklab
test('F5-03: colours read as a token or hex/rgb, never oklab', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-oklab'); if (!o) return;
  const color = o.card.locator('.pk .cf b');
  const said = await text(color);
  assert.doesNotMatch(said, /oklab|oklch|color-mix/, `plain: ${said}`);
  assert.match(said, /^(#[0-9a-f]{6}|rgb\(\d+ \d+ \d+ \/ 0?\.\d+\))/, `hex or rgb: ${said}`);
  assert.deepEqual(o.errors, []);
  const ink = await open(t, '#qa-inkmix');
  assert.match(await text(ink.card.locator('.pk .cf b')), /^ink\b/, 'the token it equals');
  assert.deepEqual(ink.errors, []);
});

// F6-01: every colour of a role is laid out as a grid, each one reachable (none under another part of the card)
test('F6-01: every colour in the colour picker is reachable, laid out as a grid', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { card, errors } = o;
  await card.locator('.pk .cf').click(); await card.locator('.cp .all').click();
  // the role with the most colours
  let most = null, n = 0;
  for (const b of await card.locator('.cp .roles [data-role]').all()) { await b.click(); const c = await card.locator('.cp .shades .shade').count(); if (c > n) { n = c; most = b; } }
  await most.click();
  const shades = card.locator('.cp .shades .shade');
  const seen = await shades.evaluateAll((els) => els.map((b) => { b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(), hit = b.getRootNode().elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { top: Math.round(r.top), w: r.width, h: r.height, hit: !!hit && b.contains(hit) }; }));
  assert.deepEqual(seen.filter((s) => !s.hit), [], 'each colour is what is under the pointer at its middle');
  if (seen.length > 4) assert.ok(new Set(seen.map((s) => s.top)).size < seen.length, 'several to a row (a grid, not a column)');
  for (const s of seen) assert.ok(s.w >= 20 && s.h >= 20, `a colour is ${s.w}×${s.h}`);
  assert.deepEqual(errors, []);
});

// F6-05: digits typed say the step Enter will use when they aren't one, and that step is what the words show
test('F6-05: typing a size that is not a step previews the nearest and says it', { timeout: 120000, skip: 'the new text panel takes no typed numbers yet (open gap)' }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, el, app, errors } = o;
  const file = await readFile(app, 'utf8');
  while ((await card.locator('.fld[data-at]').getAttribute('data-key')) !== 'font-size') await page.keyboard.press('ArrowDown');
  await page.keyboard.type('11');
  assert.equal(await css(el, 'font-size'), '12px', '11 previews 12, the nearest step');
  const field = card.locator('.fld[data-key="font-size"]');
  assert.match(await text(field), /^11 → 12$/, `the field says where it lands: ${await text(field)}`);
  assert.equal(await card.locator('.rail .tk[data-at]').getAttribute('data-i') !== null, true);
  assert.match(await text(card.locator('.rail .tk[data-at]')), /^12$/);
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.type('20');
  assert.equal(await css(el, 'font-size'), '16px', '20 previews 16, the nearest step');
  assert.match(await text(field), /^20 → 16$/);
  assert.match(await text(card.locator('.rail .hint')), /20px isn’t a step\. Enter uses 16px, the nearest\./);
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.type('14.4');
  assert.equal(await css(el, 'font-size'), '14px', '14.4 previews 14');
  assert.match(await text(field), /^14\.4 → 14$/);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  assert.equal(await readFile(app, 'utf8'), file, '14 is what it is already: nothing written');
  assert.deepEqual(errors, []);
});

// N-06: a fluid size (clamp) is locked and said at rest; keys preview nothing and Enter writes nothing, nor does a style
test('N-06: a clamp() size is locked and said; → and Enter change nothing', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-clamp'); if (!o) return;
  const { page, card, el, app, errors } = o;
  const file = await readFile(app, 'utf8');
  const size = row(card, 'Font size');
  assert.equal(await size.evaluate((r) => r.classList.contains('locked')), true, 'the size is locked');
  assert.match(await text(card.locator('[role="note"]')), /Fluid: clamp\(1rem, 2vw, 1\.25rem\)/, 'said at rest');
  const style = row(card, 'Text style');
  if (await style.count()) assert.equal(await style.evaluate((r) => r.classList.contains('locked')), true, 'a style would write a fixed size over it');
  const before = await css(el, 'font-size');
  await size.locator('.val').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await css(el, 'font-size'), before, 'nothing previewed');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  assert.equal(await readFile(app, 'utf8'), file, 'nothing written');
  assert.deepEqual(errors, []);
});

// N-10: a size between whole pixels reads rounded; a colour the theme doesn't name still reads a colour
test('N-10: a fluid size reads whole pixels; a colour field is never blank', { timeout: 120000 }, async (t) => {
  // 955px wide: 2vw is 19.1px
  const o = await open(t, '#qa-clamp', { viewport: { width: 955, height: 900 } }); if (!o) return;
  assert.equal(await css(o.el, 'font-size'), '19.1px');
  assert.equal(await shows(row(o.card, 'Font size')), '19px fluid');
  assert.deepEqual(o.errors, []);
  const semi = await open(t, '#qa-semi');
  const color = await text(semi.card.locator('.pk .cf b'));
  assert.match(color, /^(ink|#[0-9a-f]{6})/, `a colour: "${color}"`);
  assert.deepEqual(semi.errors, []);
});

// N-09: the levels in the header start at the words' own box, so the nearest level and ⌥↑ go to the same place
test('N-09: ⌥↑ and the nearest level both open the words’ own box; the next level is its parent', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#tiny'); if (!o) return;
  const { page, overlay, card, app, errors } = o;
  const lines = (await readFile(app, 'utf8')).split('\n'), own = lines.findIndex((l) => l.includes('id="tiny"')) + 1;
  const first = card.locator('.hd .ups .up').last();
  assert.equal(await first.getAttribute('data-up'), '0', 'the nearest level is its own box');
  assert.equal(await text(first), 'span');
  await page.keyboard.press('Alt+ArrowUp');
  await overlay.locator('.ec .hd .at').filter({ hasText: new RegExp(`App\\.jsx:${own}$`) }).waitFor({ timeout: 20000 });
  await page.keyboard.press('Alt+ArrowDown');
  await overlay.locator('.tc .pk .row[aria-label="Font size"]').waitFor({ timeout: 20000 });
  await card.locator('.hd .ups .up[data-up="0"]').click();
  await overlay.locator('.ec .hd .at').filter({ hasText: new RegExp(`App\\.jsx:${own}$`) }).waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.tc').isVisible(), false);
  assert.deepEqual(errors, []);
});

// a level named in the header: a click moves the card up to it
test('a click on a level in the header opens that level’s card', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#tiny'); if (!o) return;
  const { overlay, card, app, errors } = o;
  const line = (await readFile(app, 'utf8')).split('\n').findIndex((l) => l.includes('id="fields"')) + 1;
  await card.locator('.hd .ups .up[data-up="1"]').click();
  await overlay.locator('.ec .hd .at').filter({ hasText: new RegExp(`App\\.jsx:${line}$`) }).waitFor({ timeout: 20000 });
  assert.equal(await overlay.locator('.tc').isVisible(), false);
  assert.deepEqual(errors, []);
});

// the style follows the values: a size moved off the words' text style reads No style; moved back, the style again,
// with nothing left to write
test('the style follows the values: a size moved off the text style leaves it, and back again the style', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-onstyle'); if (!o) return;
  const { page, card, errors } = o;
  const style = row(card, 'Text style');
  const before = await shows(style);
  assert.match(before, /Body/, `the words are on the Body medium style: ${before}`);
  const now = () => page.evaluate(() => (document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .pk .row[aria-label="Text style"] .slot:not(.gone)')?.innerText ?? '').replace(/\s+/g, ' ').trim());
  await row(card, 'Font size').locator('.val').focus();
  // a size up: the words no longer make Body medium (No style, or the style that size makes)
  const sizeBefore = await shows(row(card, 'Font size'));
  await page.keyboard.press('ArrowUp');
  const state = async () => `size ${sizeBefore} → ${await shows(row(card, 'Font size'))} (${await row(card, 'Font size').getAttribute('class')}); style ${await now()}; write ${await text(card.locator('[data-do="write"]'))}`;
  await page.waitForFunction((was) => (document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .pk .row[aria-label="Text style"] .slot:not(.gone)')?.innerText ?? '').replace(/\s+/g, ' ').trim() !== was, before, { timeout: 5000 })
    .catch(async () => assert.fail(`the style did not follow: ${await state()}`));
  assert.doesNotMatch(await now(), /Body/, `off the style: ${await now()}`);
  // back down: Body medium again, nothing left to write
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((was) => (document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .pk .row[aria-label="Text style"] .slot:not(.gone)')?.innerText ?? '').replace(/\s+/g, ' ').trim() === was, before, { timeout: 5000 });
  assert.match(await text(card.locator('[data-do="write"]')), /^Write\s*↵?$/, 'back where it started, nothing to write');
  assert.deepEqual(errors, []);
});

// The text card's QA findings (docs/qa/element-card-results.md, group 6, and docs/briefs/qa-fixes.md, cause 5), each
// reproduced on a copy of overlay/demo with a few more words: a fluid (clamp) title, words whose className is built in
// code, words whose classes come from a component's usage, and words that wear a text style but measure otherwise.
// The card reads values as the page shows them, says what it can't change at rest, writes where the classes are
// written, keeps clear of the fix bar, names the levels above it, and can be used from the keyboard.
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
  await overlay.locator('.tc .fld[data-key="font-size"]').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.tc .ph'), null, { timeout: 20000 });
  return { page, overlay, el, card: overlay.locator('.tc'), errors, root: s.root, app: s.app };
}
const css = (el, prop) => el.evaluate((n, p) => getComputedStyle(n).getPropertyValue(p), prop);
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const overlaps = (a, b) => a && b && a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

// F6-01, F6-02: a fluid size is said plainly (its px now, and that it is fluid), never in the colour field; the colour
// list's swatches are big enough to point at and pick
test('F6-01, F6-02: a clamp() size reads as its px and fluid; the colour field reads a colour; swatches can be clicked', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-clamp'); if (!o) return;
  const { overlay, el, card, errors } = o;
  const color = card.locator('.fld[data-menu="color"]');
  assert.doesNotMatch(await text(color), /clamp/, 'the colour field never shows a size');
  assert.match(await text(color), /ink|rgb|#|oklch/, `a colour: ${await text(color)}`);
  const size = card.locator('.fld[data-key="font-size"]'), px = parseFloat(await css(el, 'font-size'));
  assert.match(await text(size), new RegExp(`^${Math.round(px * 100) / 100} px$`), `the size it measures now: ${await text(size)}`);
  assert.match(await size.getAttribute('title'), /clamp\(1rem, ?2vw, ?1\.25rem\)/, 'its fluid value, said');
  assert.match(await size.getAttribute('title'), /fluid/i);
  await color.click();
  const swatches = card.locator('.menu .ch[data-key="color"]');
  await swatches.first().waitFor();
  const boxes = await swatches.evaluateAll((els) => els.map((b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }));
  assert.ok(boxes.length > 3, `${boxes.length} swatches`);
  for (const [w, h] of boxes) assert.ok(w >= 20 && h >= 20, `a swatch is ${w}×${h}`);
  // the one under the pointer is a swatch, and pointing at it previews it on the words
  const before = await css(el, 'color');
  await card.locator('.menu .ch[data-key="color"][aria-checked="false"]').last().hover();
  await o.page.waitForFunction((b) => getComputedStyle(document.getElementById('qa-clamp')).color !== b, before, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

// F6-03: the leading is a ratio of the size: a size previewed never changes what the leading field reads
test('F6-03: leading reads the same while a size is previewed', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, el, errors } = o;
  const leading = card.locator('.fld[data-key="line-height"]');
  const was = await text(leading);
  const ratio = Math.round((parseFloat(await css(el, 'line-height')) / parseFloat(await css(el, 'font-size'))) * 100) / 100;
  assert.equal(was, String(ratio), 'the leading it measures, as a ratio');
  await card.locator('.fld[data-key="font-size"]').click();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await css(el, 'font-size'), '12px');
  assert.equal(await text(leading), was, 'the leading field is not recomputed against the previewed size');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

// F6-04: words whose className is built in code are locked at rest, with the reason in plain words; keys change nothing
test('F6-04: a className built in code: every field locked, the reason said at rest, nothing previewed or written', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-dyn'); if (!o) return;
  const { page, card, el, app, errors } = o;
  const file = await readFile(app, 'utf8');
  for (const k of ['font-size', 'line-height', 'letter-spacing', 'font-weight']) assert.equal(await card.locator(`.fld[data-key="${k}"]`).getAttribute('aria-disabled'), 'true', `${k} is locked`);
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
test('F6-05: typed digits preview the step they reach; Esc puts it back; the sentence is consistent', { timeout: 120000 }, async (t) => {
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
test('F6-06: the Style field marks a style whose values the words do not have', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#qa-styled'); if (!o) return;
  const { card, errors } = o;
  const style = card.locator('.fld[data-menu="style"]');
  assert.match(await text(style), /Body/);
  assert.equal(await style.getAttribute('data-off'), '', 'marked as not its values');
  assert.match(await text(style), /14px here/);
  assert.deepEqual(errors, []);
});

// F6-07, F6-08: on a short scale a short drag reaches the next step; the value pill stays whole past the end
test('F6-07, F6-08: a short drag reaches the next step on a short scale; the pill is never cut off', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, overlay, card, el, errors } = o;
  const box = await card.locator('.fld[data-key="font-size"]').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x - 6, y, { steps: 2 });
  await overlay.locator('.tc .rail .thumb').waitFor({ state: 'attached' });
  await page.mouse.move(x - 60, y, { steps: 6 });
  assert.equal(await css(el, 'font-size'), '12px', 'a 60px drag reaches the step below');
  // far past the top end: the pill is inside the card, whole
  await page.mouse.move(x + 400, y, { steps: 10 });
  await page.waitForTimeout(100);
  const pill = await overlay.locator('.tc .bub').boundingBox(), c = await card.boundingBox();
  assert.ok(pill.x >= c.x && pill.x + pill.width <= c.x + c.width, `the pill ${JSON.stringify(pill)} inside the card ${JSON.stringify(c)}`);
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.deepEqual(errors, []);
});

// F6-09: the card takes focus when it opens; its values are spinbuttons reached with Tab, with their value
test('F6-09: focus moves into the card; the value fields are reached with Tab and carry aria-valuenow', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#prose'); if (!o) return;
  const { page, card, errors } = o;
  const active = () => page.evaluate(() => { const a = document.querySelector('plumb-overlay').shadowRoot.activeElement; return a ? (a.dataset.key ?? a.dataset.menu ?? a.className) : null; });
  assert.notEqual(await active(), null, 'focus is in the card');
  for (const k of ['font-size', 'line-height', 'letter-spacing', 'font-weight']) {
    const f = card.locator(`.fld[data-key="${k}"]`);
    assert.equal(await f.getAttribute('tabindex'), '0', `${k} is reached with Tab`);
    assert.ok(Number.isFinite(+(await f.getAttribute('aria-valuenow'))), `${k} has aria-valuenow`);
  }
  const seen = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); seen.push(await active()); }
  for (const k of ['font-size', 'line-height', 'letter-spacing', 'font-weight']) assert.ok(seen.includes(k), `Tab reaches ${k}: ${seen.join(', ')}`);
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
  const size = card.locator('.fld[data-key="font-size"]');
  assert.equal(await size.getAttribute('data-off'), '', '9px is off the scale');
  await size.click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await overlay.locator('.fx .said').filter({ hasText: /Changed size to 12px/ }).waitFor({ timeout: 20000 });
  const now = await readFile(app, 'utf8');
  assert.match(now, /<Box id="qa-box" className="text-small text-ink-muted">/);
  assert.match(now, /<p id=\{id\} className=\{className\}>/, 'the component’s own line is untouched');
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 20000 });
  assert.equal(await readFile(app, 'utf8'), original);
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

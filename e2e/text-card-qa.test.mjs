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

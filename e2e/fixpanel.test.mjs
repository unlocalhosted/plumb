// The fix panel (overlay/src/fixpanel.js; its drawing: overlay/demo/fix-flow.html): one place to act. A cause (one class,
// every place it is used) is put in hand, its options are tried on every place at once, taken, and applied in one
// guarded write per file. The page shows only heat. Proved through real Vite, React and Chromium, the source read back.
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
async function fixture(t, app, css = '') {
  const root = await mkdtemp(join(repo, 'fixtures/.fixpanel-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  if (css) await writeFile(join(root, 'src/styles.css'), (await readFile(join(root, 'src/styles.css'), 'utf8')) + css);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  return { page, errors, overlay };
}

// Two cards share one off-scale padding (one cause, two places); a heading's weight has no step on the theme
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <section id="a" className="rounded-card bg-surface p-[18px] text-body">One</section>
      <section id="b" className="rounded-card bg-surface p-[18px] text-body">Two</section>
    </main>
  );
}
`;
const panel = (overlay) => overlay.locator('.fx');
const padding = (page, id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).paddingTop);
const visible = (page, sel) => page.evaluate((sel) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'), sel);

test('At rest one line counts problems and causes; Enter puts a cause in hand and tries its fix on every place; ↑ ↓ move every place; Take, then A writes them all', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const source = () => readFile(join(root, 'src/App.jsx'), 'utf8');
  // rest: one line, nothing else of the old flow drawn
  await panel(overlay).locator('.line').filter({ hasText: /2 problems · 1 fix/ }).waitFor({ timeout: 10000 });
  for (const sel of ['.bpp', '.cg', '.sel']) assert.equal(await visible(page, sel), false, `${sel} is not shown`);
  // Enter: the cause in hand, its options as specimens, the suggestion tried at both places
  await page.keyboard.press('Enter');
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /2 places/);
  await panel(overlay).locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  const picked = Number.parseFloat(await panel(overlay).locator('.sp[aria-pressed="true"] .v').innerText());
  await page.waitForFunction((n) => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === `${n}px`), picked, { timeout: 5000 });
  // the value it has now is shown, greyed out, not a choice
  assert.match(await panel(overlay).locator('.sp.off .v').innerText(), /^18px$/);
  // ↑: both places move to the next step
  await page.keyboard.press('ArrowUp');
  const next = Number.parseFloat(await panel(overlay).locator('.sp[aria-pressed="true"] .v').innerText());
  assert.ok(next > picked, `↑ picks a bigger step: ${picked} → ${next}`);
  await page.waitForFunction((n) => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === `${n}px`), next, { timeout: 5000 });
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((n) => getComputedStyle(document.getElementById('a')).paddingTop === `${n}px`, picked, { timeout: 5000 });
  // Take: kept; nothing else is left, so the panel rests with Apply 1
  for (let i = 0; i < 40 && !(await panel(overlay).locator('.apply .badge').filter({ hasText: '1' }).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await panel(overlay).locator('.apply .badge').filter({ hasText: '1' }).waitFor({ timeout: 5000 });
  assert.equal(await padding(page, 'b'), `${picked}px`, 'the other place keeps the taken value');
  // A: one write; both places carry the step in source
  await page.keyboard.press('a');
  for (let i = 0; i < 100 && (await source()).includes('p-[18px]'); i++) await page.waitForTimeout(100);
  const after = await source();
  assert.doesNotMatch(after, /p-\[18px\]/, 'both places written');
  assert.equal((after.match(/className="rounded-card bg-surface p-s\d text-body"/g) ?? []).length, 2, after);
  assert.deepEqual(errors, []);
});

test('A glow clicked puts its cause in hand; → skips to the next cause, ← back; Esc puts it down and the page is as it was', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE.replace('<section id="b"', '<p id="w" className="text-body font-[650]">Weight</p>\n      <section id="b"'));
  const { page, errors, overlay } = await open(t, launched, url);
  await panel(overlay).locator('.line').filter({ hasText: /problems? · 2 fixes/ }).waitFor({ timeout: 10000 });
  // a click on the second card's glow (its zone's own point) holds the padding cause
  const at = await overlay.locator('.bp .hit[aria-label*="18px"]').first().getAttribute('data-at');
  const [x, y] = at.split(',').map(Number);
  await page.mouse.click(x, y);
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  // →: the other cause; ←: back to the padding
  await page.keyboard.press('ArrowRight');
  await panel(overlay).locator('.cause .cls').filter({ hasNotText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  await page.keyboard.press('ArrowLeft');
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  // Esc: put down; the cards are back at 18px, the panel is one line
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  await page.waitForFunction(() => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === '18px'), null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

// A cause whose fix is relative to the text (a line height of 1.5 × the size) is previewed per place: each place at
// its own size, written as px, never one place's number dropped unitless onto all of them (19.5 read as 19.5 × 13px).
// A one-line control's height is not three lines of text, so it is not in the cause.
test('Trying a line-height fix previews each place at its own size, in px', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p id="small" className="max-w-sm text-[13px] leading-none">Thirteen pixel words that run long enough to wrap onto a second line and a third line of their own here. More words follow so the paragraph runs to four or five lines at this measure, as body text does on a real page.</p>
      <button id="btn" className="inline-flex h-9 items-center rounded-control px-s3 text-[13px] leading-none">One line</button>
      <p id="large" className="max-w-sm text-[14px] leading-none">Fourteen pixel words that run long enough to wrap onto a second line and a third line of their own here. More words follow so the paragraph runs to four or five lines at this measure, as body text does on a real page.</p>
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const lh = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).lineHeight);
  assert.deepEqual([await lh('small'), await lh('large')], ['13px', '14px']);
  // hold the line-height cause: Enter takes the first, → walks to it
  await page.keyboard.press('Enter');
  for (let i = 0; i < 8 && !/line-height|leading/.test(await panel(overlay).locator('.cause .cls').innerText()); i++) await page.keyboard.press('ArrowRight');
  assert.match(await panel(overlay).locator('.cause .cls').innerText(), /line-height|leading/);
  await page.waitForFunction(() => ['small', 'large'].every((id) => document.getElementById(id).style.lineHeight), null, { timeout: 5000 });
  const small = parseFloat(await lh('small')), large = parseFloat(await lh('large'));
  assert.ok(small > 13 && small < 13 * 2, `13px text previewed at ${small}px`);
  assert.ok(large > 14 && large < 14 * 2, `14px text previewed at ${large}px`);
  assert.ok(Math.abs(small / 13 - large / 14) < 0.01, 'the same ratio at each size');
  assert.match(await page.locator('#small').getAttribute('style'), /line-height: [\d.]+px/);
  // a one-line control is not body text with lines too close: its height is not its line count
  assert.equal(await page.locator('#btn').evaluate((el) => el.style.lineHeight), '');
  // Esc puts it down and the page is as it was
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => ['small', 'large'].every((id) => !document.getElementById(id).style.lineHeight), null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

// A copy of a token's value (duration-150 where :root has --dur-calm: 150ms, and the theme sets its own default
// timing, as crafting-ui does) has its token per place, not a list of
// choices: Blueprint reads marks without edits, so the page finds the token by value and offers it, drawn as a time.
// Taking it moves to the next cause on the same element with that cause's own view, never the taken one's. The class
// sits in a template literal with an expression: its fixed text is written, the expression is left as it is.
test('A token copy offers its token, drawn as a time; Take moves on to the next cause on that element; A writes into a template literal', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, `
const tone = 'bg-surface';
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <button id="go" className={\`px-s4 duration-150 rounded-[13px] \${tone}\`}>Go</button>
    </main>
  );
}
`, '\n:root { --dur-calm: 150ms; }\n@theme { --default-transition-duration: 140ms; }\n');
  const { page, errors, overlay } = await open(t, launched, url);
  const source = () => readFile(join(root, 'src/App.jsx'), 'utf8');
  await page.keyboard.press('Enter');
  await panel(overlay).locator('.cause .cls').waitFor({ timeout: 10000 });
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const now = await panel(overlay).locator('.cause').innerText(); seen.push(now.replace(/\s+/g, ' '));
    if (/duration-150/.test(now)) break;
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
  seen.push((await panel(overlay).locator('.cause').innerText()).replace(/\s+/g, ' '));
  assert.match(seen.at(-1), /duration-150/, seen.join(' | '));
  // its token, as a time
  const option = panel(overlay).locator('.sp[aria-pressed="true"]');
  await option.waitFor({ timeout: 10000 });
  assert.equal(await option.locator('.v').innerText(), '150ms');
  assert.match(await option.locator('.tk').innerText(), /dur-calm/);
  // Take: the next cause on the button is in hand, with its own view
  for (let i = 0; i < 40 && !(await panel(overlay).locator('.apply .badge').filter({ hasText: '1' }).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'rounded-[13px]' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500); // a re-read of the page comes in meanwhile
  assert.match(await panel(overlay).locator('.cause .cls').innerText(), /rounded-\[13px\]/);
  assert.equal(await panel(overlay).locator('.sp .tk').filter({ hasText: 'dur-calm' }).count(), 0, 'the taken cause\'s option is not shown on the next one');
  // A: written into the template literal's fixed text; the expression stays
  await panel(overlay).locator('.apply').click();
  for (let i = 0; i < 100 && !(await source()).includes('duration-(--dur-calm)'); i++) await page.waitForTimeout(100);
  assert.match(await source(), /className=\{`px-s4 duration-\(--dur-calm\) rounded-\[13px\] \$\{tone\}`\}/);
  assert.deepEqual(errors, []);
});

// A component that only passes className through (a router Link, a Button wrapper) writes none of its classes: the
// code that uses it does. Alt+click reads it there, so its cause is in hand, named by what it is about (letter spacing,
// not "text size or weight"). Reading the page again never says everything matches before every element is read.
test('Alt+click on a pass-through component holds the cause where its classes are written; the panel never says all clear mid-read', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, `
function Link({ className, children }) { return <a href="#" className={className}>{children}</a>; }
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <Link className="text-body tracking-[0.1em]">Open the first entry</Link>
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  // reopened: what the panel says from the first frame until it has read the page again
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const fx = document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx');
    window.__said = [];
    new MutationObserver(() => window.__said.push(fx.innerText)).observe(fx, { subtree: true, childList: true, characterData: true });
  });
  await page.keyboard.press('Alt+B');
  await panel(overlay).locator('.line').filter({ hasText: /problem/ }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  assert.ok(!(await page.evaluate(() => window.__said)).some((s) => /Nothing to fix/.test(s)), 'no all clear while reading');
  // Alt+click the link: its cause, from the JSX that wrote it
  const b = await page.getByText('Open the first entry').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(b.x + 4, b.y + b.height / 2);
  await page.mouse.click(b.x + 4, b.y + b.height / 2);
  await page.keyboard.up('Alt');
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'tracking-[0.1em]' }).waitFor({ timeout: 20000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /Letter spacing not in your theme/);
  assert.deepEqual(errors, []);
});

// Every cause ends in one action. Nothing on the theme is close (tracking-[0.1em]): Add to theme, named in a field
// whose keys are its own (typing "a" or "k" neither applies nor keeps), every place takes the new class. A Tailwind
// default (leading-relaxed): Make it yours, the variable goes into the theme and no source line changes. Intended
// (p-[13px]): Keep it, with why, recorded in the ledger. One Apply writes all three.
test('Add to theme, Make it yours and Keep it: each a cause\'s one action, all written by one Apply', { timeout: 180000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p id="t1" className="text-body tracking-[0.1em]">Eyebrow</p>
      <p id="t2" className="text-body tracking-[0.1em]">Eyebrow two</p>
      <p id="l" className="text-body leading-relaxed">Relaxed</p>
      <section id="k" className="rounded-card bg-surface p-[13px] text-body">Kept</section>
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const source = () => readFile(join(root, 'src/App.jsx'), 'utf8');
  const theme = () => readFile(join(root, 'src/styles.css'), 'utf8');
  const cls = () => panel(overlay).locator('.cause .cls').innerText();
  const hold = async (re) => {
    if (!(await panel(overlay).locator('.cause').count())) await page.keyboard.press('Enter');
    for (let i = 0; i < 8 && !re.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
    assert.match(await cls(), re);
  };
  // Add to theme: named in the field; the class it becomes is said as it is typed
  await hold(/tracking-\[0\.1em\]/);
  assert.match(await panel(overlay).locator('.note').innerText(), /no letter spacing of 0\.1em/);
  assert.ok(await panel(overlay).locator('.take').isDisabled(), 'no name, nothing to take');
  await panel(overlay).locator('input[name="token"]').fill('');
  await panel(overlay).locator('input[name="token"]').pressSequentially('track-ak');
  await panel(overlay).locator('.hint').filter({ hasText: 'tracking-track-ak' }).waitFor({ timeout: 5000 });
  assert.equal(await panel(overlay).locator('.apply .badge').innerText(), '0', 'typing a or k neither applies nor keeps');
  await page.keyboard.press('Enter');
  // Make it yours
  await hold(/leading-relaxed/);
  await panel(overlay).locator('.take').filter({ hasText: 'Add to theme' }).waitFor({ timeout: 5000 });
  assert.match(await panel(overlay).locator('.note').innerText(), /Nothing in your code changes/);
  assert.match(await panel(overlay).locator('.hint').innerText(), /--leading-relaxed: 1\.625/);
  await page.keyboard.press('Enter');
  // Keep it
  await hold(/p-\[13px\]/);
  await page.keyboard.press('k');
  await panel(overlay).locator('input[name="why"]').pressSequentially('a brand inset, kept');
  await page.keyboard.press('Enter');
  await panel(overlay).locator('.apply .badge').filter({ hasText: '3' }).waitFor({ timeout: 5000 });
  // one Apply: the theme, the source, the ledger
  await panel(overlay).locator('.apply').click();
  // what the person waits for: the panel says all three landed
  await panel(overlay).locator('.done').filter({ hasText: '3 changes applied' }).waitFor({ timeout: 20000 });
  assert.match(await theme(), /--tracking-track-ak:\s*0\.1em/);
  assert.match(await theme(), /--leading-relaxed:\s*1\.625/);
  const after = await source();
  assert.equal((after.match(/tracking-track-ak/g) ?? []).length, 2, after);
  assert.doesNotMatch(after, /tracking-\[0\.1em\]/);
  assert.match(after, /className="text-body leading-relaxed"/, 'make it yours changes no source line');
  assert.match(after, /p-\[13px\]/, 'kept stays as written');
  assert.match(await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8'), /a brand inset, kept/);
  assert.deepEqual(errors, []);
});

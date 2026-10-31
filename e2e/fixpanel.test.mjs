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
  // React is pre-bundled up front: Vite's optimizer would otherwise find it on first load and reload the page mid-test
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
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
// what the last fix written changed, said above the panel with its Undo
const said = (overlay) => panel(overlay).locator('.said .t');
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
  // Enter: written at once, at both places; the panel says so
  for (let i = 0; i < 40 && !(await said(overlay).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await said(overlay).filter({ hasText: /^Changed p-\[18px\] to p-s\d at 2 places$/ }).waitFor({ timeout: 10000 });
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
  // a glow says its place in the panel's words, to a screen reader too: never the rule's own wording
  const labels = await overlay.locator('.bp .hit').evaluateAll((hits) => [...new Set(hits.map((h) => h.getAttribute('aria-label')))]);
  assert.ok(labels.includes('p-[18px]. 18px is typed by hand.'), labels.join(' | '));
  assert.ok(labels.every((l) => !/hardcodes/.test(l)), labels.join(' | '));
  assert.equal(await overlay.locator('svg[role="group"]').first().getAttribute('aria-label'), 'Problems on this page');
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
test('A token copy offers its token, drawn as a time; taking it writes into a template literal and moves on to the next cause on that element', { timeout: 150000 }, async (t) => {
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
  // Enter: written at once; the next cause on the button is in hand, with its own view
  for (let i = 0; i < 40 && !(await said(overlay).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'rounded-[13px]' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500); // a re-read of the page comes in meanwhile
  assert.match(await panel(overlay).locator('.cause .cls').innerText(), /rounded-\[13px\]/);
  assert.equal(await panel(overlay).locator('.sp .tk').filter({ hasText: 'dur-calm' }).count(), 0, 'the taken cause\'s option is not shown on the next one');
  // written into the template literal's fixed text; the expression stays
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
      <div id="g" className="flex gap-[7px] text-body"><span>a</span><span>b</span></div>
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
  // a first name is there, so one Enter is enough; it is edited freely
  assert.equal(await panel(overlay).locator('input[name="token"]').inputValue(), 'wide');
  assert.ok(await panel(overlay).locator('.take').isEnabled(), 'a named step can be taken at once');
  await panel(overlay).locator('input[name="token"]').fill('');
  await panel(overlay).locator('input[name="token"]').pressSequentially('track-ak');
  await panel(overlay).locator('.hint').filter({ hasText: 'tracking-track-ak' }).waitFor({ timeout: 5000 });
  assert.equal(await said(overlay).count(), 0, 'typing a or k neither writes nor keeps');
  await page.keyboard.press('Enter');
  await said(overlay).filter({ hasText: 'Added --tracking-track-ak to styles.css and used tracking-track-ak at 2 places' }).waitFor({ timeout: 20000 });
  // Make it yours
  await hold(/leading-relaxed/);
  await panel(overlay).locator('.take').filter({ hasText: 'Add to theme' }).waitFor({ timeout: 5000 });
  assert.match(await panel(overlay).locator('.note').innerText(), /Nothing in your code changes/);
  assert.match(await panel(overlay).locator('.hint').innerText(), /--leading-relaxed: 1\.625/);
  await page.keyboard.press('Enter');
  await said(overlay).filter({ hasText: 'Added --leading-relaxed to styles.css' }).waitFor({ timeout: 20000 });
  // Keep it
  await hold(/p-\[13px\]/);
  await page.keyboard.press('k');
  await panel(overlay).locator('input[name="why"]').pressSequentially('a brand inset, kept');
  await page.keyboard.press('Enter');
  // what the person waits for: each one said as it landed; a keep has nothing to undo
  await said(overlay).filter({ hasText: /^Kept as is at 1 place/ }).waitFor({ timeout: 20000 });
  assert.equal(await panel(overlay).locator('.said .undo').count(), 0);
  assert.match(await theme(), /--tracking-track-ak:\s*0\.1em/);
  assert.match(await theme(), /--leading-relaxed:\s*1\.625/);
  const after = await source();
  assert.equal((after.match(/tracking-track-ak/g) ?? []).length, 2, after);
  assert.doesNotMatch(after, /tracking-\[0\.1em\]/);
  assert.match(after, /className="text-body leading-relaxed"/, 'make it yours changes no source line');
  assert.match(after, /p-\[13px\]/, 'kept stays as written');
  assert.match(await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8'), /a brand inset, kept/);
  // the page comes back read in full: the three are gone and only the cause nobody touched is left
  await page.waitForFunction(() => document.getElementById('t1')?.className.includes('tracking-track-ak'), null, { timeout: 20000 });
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  // the panel has moved on to the one fix left
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'gap-[7px]' }).waitFor({ timeout: 20000 }).catch(async (e) => { throw new Error(`${e.message}\npanel: ${(await panel(overlay).innerText()).replace(/\s+/g, ' ')}\ntheme: ${(await theme()).match(/--(tracking|leading)[^;]*;/g)}`); });
  assert.match(await panel(overlay).locator('.cause .nav').innerText(), /1 of 1/);
  assert.deepEqual(errors, []);
});

// One Apply that writes the theme reloads the page, which can cut the server's answer short. The dev server says the
// whole result first, so what did not land is said after the reload, not a count that was only hoped for.
test('After an Apply that reloads the page, the panel says what did not land and why', { timeout: 180000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const app = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p id="t1" className="text-body tracking-[0.1em]">Eyebrow</p>
      <p id="l" className="text-body leading-relaxed">Relaxed</p>
    </main>
  );
}
`;
  // the theme already has --tracking-loose at another value: a new step by that name is refused on write
  const { root, url } = await fixture(t, app, '\n@theme { --tracking-loose: 0.3em; }\n');
  const { page, errors, overlay } = await open(t, launched, url);
  const cls = () => panel(overlay).locator('.cause .cls').innerText();
  const hold = async (re) => {
    if (!(await panel(overlay).locator('.cause').count())) await page.keyboard.press('Enter');
    for (let i = 0; i < 8 && !re.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
    assert.match(await cls(), re);
  };
  await hold(/tracking-\[0\.1em\]/);
  await panel(overlay).locator('input[name="token"]').fill('loose');
  await page.keyboard.press('Enter');
  // refused: the same fix is back in hand, saying why; nothing is said to have changed
  await panel(overlay).locator('.say.err').filter({ hasText: /--tracking-loose is already 0\.3em/ }).waitFor({ timeout: 20000 });
  assert.match(await cls(), /tracking-\[0\.1em\]/);
  assert.equal(await said(overlay).count(), 0);
  await hold(/leading-relaxed/);
  await panel(overlay).locator('.take').filter({ hasText: 'Add to theme' }).waitFor({ timeout: 5000 });
  await page.keyboard.press('Enter');
  await said(overlay).filter({ hasText: 'Added --leading-relaxed to styles.css' }).waitFor({ timeout: 20000 });
  assert.match(await readFile(join(root, 'src/styles.css'), 'utf8'), /--leading-relaxed:\s*1\.625/);
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /tracking-\[0\.1em\]/, 'the refused step left the source as it was');
  assert.deepEqual(errors, []);
});

// A cause is counted from your code, so a place inside something closed counts too. Held, the panel says why nothing
// on screen is pointed at, and that fixing it still changes your code.
test('A fix whose only place is inside something closed is counted, and held it says where it is', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p id="seen" className="text-body tracking-[0.1em]">Seen</p>
      <details><summary className="text-body">More</summary><p id="shut" className="text-body p-[13px]">Inside</p></details>
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const cls = () => panel(overlay).locator('.cause .cls').innerText();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6 && !/p-\[13px\]/.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
  assert.match(await cls(), /p-\[13px\]/, 'the closed place is counted');
  await panel(overlay).locator('.say').filter({ hasText: 'You can’t see this place right now. It’s inside something closed' }).waitFor({ timeout: 5000 });
  // a cause with a place on screen says nothing of the kind
  for (let i = 0; i < 6 && !/tracking-\[0\.1em\]/.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
  assert.equal(await panel(overlay).getByText('You can’t see').count(), 0);
  assert.deepEqual(errors, []);
});

// A place is a spot in your code: one rendered many times is one place, and one the page doesn't render right now
// (a branch not taken) is counted too. Held, it says why nothing is lit, and Keep still records it.
test('A place the page does not render is counted once, held it says so, and Keep records it', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, `
function Row({ label }) { return <li className="text-body tracking-[0.1em]">{label}</li>; }
export function App({ open = false }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <ul>{['a', 'b', 'c', 'd'].map((x) => <Row key={x} label={x} />)}</ul>
      {open ? <p id="never" className="text-body p-[13px]">Only sometimes</p> : null}
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const cls = () => panel(overlay).locator('.cause .cls').innerText();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6 && !/tracking-\[0\.1em\]/.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /1 place/, 'four rows from one line of code are one place');
  for (let i = 0; i < 6 && !/p-\[13px\]/.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
  assert.match(await cls(), /p-\[13px\]/, 'the branch not taken is counted');
  await panel(overlay).locator('.say').filter({ hasText: 'Nothing on the page shows this place right now' }).waitFor({ timeout: 5000 });
  await page.keyboard.press('k');
  await panel(overlay).locator('input[name="why"]').pressSequentially('only in the open state');
  await page.keyboard.press('Enter');
  await said(overlay).filter({ hasText: /^Kept as is/ }).waitFor({ timeout: 20000 });
  assert.match(await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8'), /only in the open state/);
  assert.deepEqual(errors, []);
});

// A place the page does not render still has its theme's options, read from the code: the panel draws them, one is
// picked with the keys, and taking it writes it in the source, though no element was ever on the page.
test('A place the page does not render offers its theme options, and the one picked is written', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, `
export function App({ open = false }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p className="text-body">Always here</p>
      {open ? <p id="never" className="text-body p-[13px]">Only sometimes</p> : null}
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const cls = () => panel(overlay).locator('.cause .cls').innerText();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6 && !/p-\[13px\]/.test(await cls()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
  assert.match(await cls(), /p-\[13px\]/);
  await panel(overlay).locator('.say').filter({ hasText: 'Nothing on the page shows this place right now' }).waitFor({ timeout: 5000 });
  const take = panel(overlay).locator('.take');
  await take.filter({ hasText: /^Use p-s/ }).waitFor({ timeout: 10000 });
  const values = await panel(overlay).locator('.specimens .sp .v').allInnerTexts();
  assert.ok(values.includes('12px') && values.includes('16px') && values.includes('13px'), `the steps either side and the value now: ${values}`);
  assert.equal(await panel(overlay).getByText('your theme has nothing close').count(), 0, 'it never says the theme has nothing close');
  // the other step is picked with the keys; nothing on the page moves, the panel says which
  const first = await take.innerText();
  await page.keyboard.press(/p-s3/.test(first) ? 'ArrowUp' : 'ArrowDown');
  await take.filter({ hasText: /p-s4/.test(first) ? 'p-s3' : 'p-s4' }).waitFor({ timeout: 5000 });
  const chosen = /p-s4/.test(first) ? 'p-s3' : 'p-s4';
  await page.keyboard.press('Enter');
  await said(overlay).filter({ hasText: `Changed p-[13px] to ${chosen} at 1 place` }).waitFor({ timeout: 20000 });
  const source = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.match(source, new RegExp(`className="text-body ${chosen}"`), 'the class picked is written where it was typed');
  assert.doesNotMatch(source, /p-\[13px\]/);
  assert.deepEqual(errors, []);
});

// Two Links render the same <a> (one stamp), but each is styled where it is used. A reading made at one caller is
// that element's alone: the clean Link never borrows the other's problem, on the first opening or any after it.
test('Links from one component are each read at their own caller: the count is the same on every opening', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, `
function Link({ className, children }) { return <a href="#" className={className}>{children}</a>; }
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <Link className="text-body tracking-[0.1em]">Spaced</Link>
      <Link className="text-body">Plain one</Link>
      <Link className="text-body">Plain two</Link>
    </main>
  );
}
`);
  const { page, errors, overlay } = await open(t, launched, url);
  const counts = [];
  for (let i = 0; i < 3; i++) {
    if (i) { await page.keyboard.press('Alt+B'); await page.keyboard.press('Alt+B'); await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 }); await page.waitForTimeout(500); }
    counts.push((await panel(overlay).locator('.line .count').innerText()).replace(/\s+/g, ' '));
  }
  assert.equal(new Set(counts).size, 1, `the same count every time: ${counts.join(' | ')}`);
  assert.match(counts[0], /^1 problem · 1 fix/, counts[0]);
  assert.deepEqual(errors, []);
});

// Tailwind 4 writes colours as oklch(): the panel reads the page's ground the way the browser paints it, so a
// near-white oklch page gets a light panel and a near-black one a dark panel (reading the numbers as rgb took
// oklch(0.987 0 0) for black).
test('The panel follows an oklch page ground: light on a light page, dark on a dark one', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const scheme = async (ground) => {
    await page.keyboard.press('Alt+B');
    await page.evaluate((g) => { document.body.style.background = g; document.documentElement.style.background = 'transparent'; }, ground);
    await page.keyboard.press('Alt+B');
    await panel(overlay).locator('.line').waitFor({ timeout: 10000 });
    return panel(overlay).getAttribute('data-scheme');
  };
  assert.equal(await scheme('oklch(0.987 0 0)'), 'light');
  assert.equal(await scheme('oklch(0.18 0.01 260)'), 'dark');
  assert.deepEqual(errors, []);
});

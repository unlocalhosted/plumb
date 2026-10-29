// The craft engine as a person meets it (docs/briefs/craft-engine.md): blueprint on, and the mentor's rules read on the
// rendered page. For each first-wave rule: the element that breaks it carries a mark and, held in the fix panel, a cause with the right
// suggestion; the element beside it that follows the rule carries nothing; a well-built page yields no craft finding.
// Real Vite with the plugin on a fixture page, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { applyFix, cause, engineMark, litNow, openMark, same } from './helpers/fix.mjs';

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

// The demo's theme and host, with this page as its App.
async function fixture(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.craft-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  if (app) await writeFile(join(root, 'src/App.jsx'), app);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  // a cold dev server may reload the page once while it optimises dependencies: wait that reload out
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  return { page, errors, overlay: page.locator('plumb-overlay') };
}

// Blueprint on, and the view read to the end (the panel's header stops counting readings).
async function blueprint(page, overlay) {
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 }); // the fix panel: every element read
}

// Every craft mark drawn, by its rule and the element it is on: the hit's id names the mark's key.
const craftMarks = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return [...root.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.includes(':craft/')).map((h) => { const r = h.getBoundingClientRect(); return { id: h.dataset.id, rule: h.dataset.id.split(':craft/')[1].split('@')[0], label: h.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
});
const rectOf = (page, id) => page.locator(`#${id}`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });

// One page per rule: the element that breaks it beside the one that follows it, on the demo's theme
// (radius tag 6, control 8, card 12; spacing s1 4, s2 8, s3 12, s4 16, s6 24; colours ink, ink-muted, …).
// the page is the demo's own (open /?rules=1 in the demo app): what is proved here is what you can try there
const PAGE = await readFile(new URL('../overlay/demo/src/rules/wave1.jsx', import.meta.url), 'utf8');

// The same page built right: every rule followed.
const GOOD = `
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <div className="rounded-card bg-surface p-s1 shadow-rest"><div className="rounded-control bg-ground p-s3 text-small">Concentric</div></div>
      <div className="rounded-card bg-surface p-s1 shadow-rest"><img alt="" width="40" height="40" className="rounded-control bg-ground" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" /></div>
      <section className="flex flex-col gap-s4">
        <div className="flex flex-col gap-s2 text-small"><span>one</span><span>two</span></div>
        <div className="flex items-center gap-s3 text-small"><span className="size-8 rounded-full bg-ground" /><span>a row's gap is not the gap between rows</span></div>
      </section>
      <p className="text-body text-ink-muted">Coloured with a token</p>
      <button disabled className="rounded-control px-s3 text-small opacity-50">Disabled is another rule</button>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 34 }}>even</span>
        <span className="absolute left-s3 top-s1 origin-top-left scale-75 text-small">scaled</span>
      </div>
    </main>
  );
}
`;

test('Concentric corners (#8/#41): a 12px child in 4px padding of a 12px corner is marked, its row suggests rounded-control; the 8px one beside it is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => h.dataset.id.includes(':craft/concentric-radius')), null, { timeout: 10000 });
  const marks = (await craftMarks(page)).filter((m) => m.rule === 'concentric-radius');
  assert.equal(marks.length, 1, `one concentric mark: ${JSON.stringify(marks)}`);
  assert.match(marks[0].label, /^This 12px corner sits 4px inside a 12px corner\. Use 8px\./);
  // the mark sits on the child's top-left corner
  const child = await rectOf(page, 'cc-bad-child');
  assert.ok(Math.abs(marks[0].x - child.x) < 8 && Math.abs(marks[0].y - child.y) < 8, `the arc is at the corner: ${JSON.stringify({ mark: marks[0], child })}`);
  // the mark's note says the change; a click puts the cause in hand: its class, its noun, one place, the finding's line
  const suggested = (await engineMark(page, 'cc-bad-child', 'craft/concentric-radius')).suggest.to;
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /rounded-card → rounded-control/);
  assert.match(words.line, /^This 12px corner sits 4px inside a 12px corner\. Use 8px\./);
  assert.deepEqual([words.cls, words.what], ['rounded-card', 'Corner doesn’t match its parent · 1 place']);
  // the cause lights the breaking child, not the good one
  const glow = words.glow;
  assert.ok(glow.some((g) => same(g, child)), `the cause lights the child: ${JSON.stringify(glow)}`);
  const good = await rectOf(page, 'cc-good-child');
  assert.ok(!glow.some((g) => same(g, good)), 'and not the concentric one');
  // the engine's suggestion is the one target
  assert.equal(suggested, 'rounded-control', 'the suggestion is the one target');
  assert.deepEqual(errors, []);
});

test('Inner ≤ outer spacing (#7): groups 8px apart with 16px inside are marked (two places, one row) and told gap-s2; the inverse beside them is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.includes(':craft/inner-outer-spacing')).length === 2, null, { timeout: 10000 });
  const marks = (await craftMarks(page)).filter((m) => m.rule === 'inner-outer-spacing');
  assert.equal(marks.length, 2);
  for (const m of marks) assert.match(m.label, /^Items here are 16px apart, but the groups are only 8px apart\./);
  // each mark lies in the gap of its own group, between its two words
  for (const id of ['io-bad-a', 'io-bad-b']) {
    const [a, b] = await page.locator(`#${id} > span`).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom));
    assert.ok(marks.some((m) => m.y + m.h / 2 > a - 2 && m.y + m.h / 2 < b + 20 && m.y >= a - 2), `a mark in ${id}'s gap: ${JSON.stringify(marks)} between ${a} and ${b}`);
  }
  // one cause for both places, in hand from a click on either glow
  const suggested = (await engineMark(page, 'io-bad-a', 'craft/inner-outer-spacing')).suggest.to;
  const [badA, badB, goodA] = await Promise.all(['io-bad-a', 'io-bad-b', 'io-good-a'].map((id) => rectOf(page, id))); // before the cause is tried on them
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /gap-s4 → gap-s2/);
  assert.match(words.line, /^Items here are 16px apart, but the groups are only 8px apart\./);
  assert.deepEqual([words.cls, words.what], ['gap-s4', 'Group falls apart · 2 places']);
  const glow = words.glow;
  assert.ok(glow.some((g) => same(g, badA)) && glow.some((g) => same(g, badB)), `both groups light: ${JSON.stringify(glow)} against ${JSON.stringify([badA, badB])}`);
  assert.ok(!glow.some((g) => same(g, goodA)), 'the well-spaced group does not');
  assert.equal(suggested, 'gap-s2');
  assert.deepEqual(errors, []);
});

test('Text colour via opacity (#57): faded text is marked and told the token it looks like; text coloured with a token is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => h.dataset.id.includes(':craft/text-opacity')), null, { timeout: 10000 });
  const marks = (await craftMarks(page)).filter((m) => m.rule === 'text-opacity');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.match(marks[0].label, /^This text uses opacity 0\.65\. Use ink-muted, the colour it shows as\./);
  const bad = await rectOf(page, 'op-bad');
  assert.ok(marks[0].x >= bad.x - 2 && marks[0].x <= bad.right + 12 && marks[0].y >= bad.y - 4 && marks[0].y <= bad.bottom, `the bracket is at the words: ${JSON.stringify({ mark: marks[0], bad })}`);
  // the cause in hand: its class, its noun, one place; the faded paragraph lights, the coloured one does not
  const suggested = (await engineMark(page, 'op-bad', 'craft/text-opacity')).suggest.to;
  const words = await openMark(page, overlay, marks[0].id);
  assert.deepEqual([words.cls, words.what], ['opacity-65', 'Faded with opacity · 1 place']);
  const glow = words.glow;
  const good = await rectOf(page, 'op-good');
  assert.ok(glow.some((g) => same(g, bad)) && !glow.some((g) => same(g, good)), `the faded paragraph lights, the coloured one does not: ${JSON.stringify(glow)}`);
  // the suggestion names the theme colour the faded text actually shows here: ink at 65% over the ground is ink-muted
  assert.match(words.hinted, /opacity-65 → text-ink-muted/);
  assert.equal(suggested, 'text-ink-muted');
  assert.match(words.line, /^This text uses opacity 0\.65\. Use ink-muted, the colour it shows as\./);
  assert.deepEqual(errors, []);
});

test('Half pixels (#37): a 33px label translated −50% lands on −16.5px and is marked with the even size to use; the 34px one is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => h.dataset.id.includes(':craft/half-pixel')), null, { timeout: 10000 });
  const marks = (await craftMarks(page)).filter((m) => m.rule === 'half-pixel');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.match(marks[0].label, /^Moved by -16\.5px, 0px, so it lands between pixels\./);
  const bad = await rectOf(page, 'hp-bad');
  assert.ok(Math.abs(marks[0].x - bad.x) < 2 && Math.abs(marks[0].y - bad.y) < 2, `the box is on the label: ${JSON.stringify({ mark: marks[0], bad })}`);
  const words = await openMark(page, overlay, marks[0].id);
  assert.deepEqual([words.cls, words.what], ['-translate-x-1/2', 'Blurry text · 1 place']);
  const glow = words.glow;
  const good = await rectOf(page, 'hp-good');
  assert.ok(glow.some((g) => same(g, bad)) && !glow.some((g) => same(g, good)), `the odd label lights, the even one does not: ${JSON.stringify(glow)}`);
  assert.match(words.hinted, /Make it 34px wide, so half of it is a whole number\./);
  // advice: the sentence is all there is; nothing to pick, nothing to take
  assert.equal((await engineMark(page, 'hp-bad', 'craft/half-pixel')).suggest.kind, 'advice');
  assert.equal(words.target, null, 'advice: nothing to pick');
  assert.equal(await overlay.locator('.fx .take').count(), 0, 'advice: nothing to take');
  assert.match(`${words.line} ${words.say}`, /Moved by -16\.5px, 0px, so it lands between pixels\..* Make it 34px wide, so half of it is a whole number\./);
  assert.deepEqual(errors, []);
});

test('Noise: a well-built page yields no craft finding; the demo with every corner case yields only its real ones', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  // the demo breaks three rules for real: its cut-off label has no title (#35), its icon button pads the icon side like
  // the text side (#10), its 12px field zooms iOS (#70). Anything else would be noise.
  const known = { GOOD: [], demo: ['icon-side', 'input-zoom', 'truncate-intent'] };
  for (const [app, query] of [[GOOD, ''], [null, '?corners']]) {
    const { url } = await fixture(t, app);
    const { page, errors, overlay } = await open(t, launched, url + query);
    await blueprint(page, overlay);
    await page.waitForTimeout(500); // the rest of the page is read off-screen after the view
    await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.hasAttribute('data-settled'), null, { timeout: 10000 });
    // and where scrollbars take no width (a Mac, a phone), its short scrolling list has nothing to say it scrolls (#75)
    const overlayBars = await page.evaluate(() => { const d = Object.assign(document.createElement('div'), { style: 'overflow:scroll;width:50px;height:50px;position:absolute' }); document.body.append(d); const w = d.offsetWidth - d.clientWidth; d.remove(); return w === 0; });
    const want = [...known[app ? 'GOOD' : 'demo'], ...(!app && overlayBars ? ['scroll-cue'] : [])].sort();
    const marks = await craftMarks(page);
    assert.deepEqual([...new Set(marks.map((m) => m.rule))].sort(), want, `craft marks on ${app ? 'the well-built page' : 'the demo'}: ${JSON.stringify(marks.map((m) => m.label))}`);
    // the fix panel agrees: nothing to fix on the well-built page; on the demo at least one cause for each rule
    const line = (await overlay.locator('.fx .line').innerText()).replace(/\s+/g, ' ');
    if (app) assert.match(line, /Nothing to fix|^0 problems/, `the well-built page has nothing to fix: ${line}`);
    else assert.ok(Number(line.match(/(\d+) fix(?:es)?/)?.[1] ?? 0) + Number(line.match(/(\d+) notes?/)?.[1] ?? 0) >= want.length, `a fix or a note for every rule: ${line}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('A suggestion is written in one pick: the concentric corner previews rounded-control, Write swaps the class in source, Undo puts it back', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="cc-bad-child"'));
  assert.match(await line(), /className="rounded-card /);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => h.dataset.id.includes(':craft/concentric-radius')), null, { timeout: 10000 });
  const [mark] = (await craftMarks(page)).filter((m) => m.rule === 'concentric-radius');
  // a click on the glow puts the cause in hand, and the suggestion is tried at once: the child wears the suggested class
  const [mx, my] = (await overlay.locator(`.bp .hit[data-id="${mark.id}"]`).getAttribute('data-at')).split(',').map(Number);
  await page.mouse.move(mx, my);
  await page.waitForTimeout(250);
  await page.mouse.click(mx, my);
  await page.waitForFunction(() => document.getElementById('cc-bad-child').classList.contains('rounded-control'), null, { timeout: 3000 });
  assert.equal(await page.locator('#cc-bad-child').evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '8px');
  // and it can be taken: trying it must not make the finding (and with it the cause\u2019s plan) vanish; applyFix says if it did
  await applyFix(page, overlay);
  for (let i = 0; i < 100 && !/rounded-control/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-control bg-ground/, 'the class is swapped where it was, in source');
  assert.doesNotMatch(await line(), /rounded-card/);
  // the write is in the history: Undo puts the source back
  await overlay.locator('.wt').filter({ hasText: /Applied rounded-control/ }).waitFor({ timeout: 20000 });
  await overlay.locator('.wt').getByRole('button', { name: 'Undo' }).click();
  for (let i = 0; i < 100 && !/rounded-card/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-card bg-ground/);
  assert.deepEqual(errors, []);
});

test('Alt+click on the non-concentric child opens blueprint with its craft cause in hand, named with its suggestion', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const fx = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText ?? '');
  await page.locator('#cc-bad-child').click({ modifiers: ['Alt'] });
  await page.waitForFunction(() => /Corner doesn’t match its parent/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.textContent ?? ''), null, { timeout: 20000 });
  assert.match(await fx(), /rounded-card/);
  // the concentric one beside it carries no craft finding
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.locator('#cc-good-child').click({ modifiers: ['Alt'] });
  await page.waitForTimeout(3000);
  assert.doesNotMatch(await fx(), /Corner doesn’t match its parent/);
  assert.deepEqual(errors, []);
});

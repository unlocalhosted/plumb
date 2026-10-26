// The craft engine as a person meets it (docs/briefs/craft-engine.md): blueprint on, and the mentor's rules read on the
// rendered page. For each first-wave rule: the element that breaks it carries a mark and a panel row with the right
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
  await overlay.locator('.bpp .meta').filter({ hasText: /off on this page|All on the system|not checked/ }).waitFor({ timeout: 20000 });
}

// Every craft mark drawn, by its rule and the element it is on: the hit's id names the mark's key.
const craftMarks = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return [...root.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.includes(':craft/')).map((h) => { const r = h.getBoundingClientRect(); return { id: h.dataset.id, rule: h.dataset.id.split(':craft/')[1].split('@')[0], label: h.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
});
// The panel's craft rows: [{ rule, text, what }].
const craftRows = (overlay) => overlay.locator('.bpp .row[data-key^="craft/"]').evaluateAll((rows) => rows.map((r) => ({ key: r.dataset.key, rule: r.dataset.key.split('|')[0], text: r.querySelector('code').textContent, what: r.querySelector('.what').textContent })));
const rectOf = (page, id) => page.locator(`#${id}`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
// the elements a row lights when pointed at, as boxes
const lit = (page) => page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect')].map((o) => ({ x: +o.getAttribute('x') - 0.75, y: +o.getAttribute('y') - 0.75, w: +o.getAttribute('width') + 1.5, h: +o.getAttribute('height') + 1.5 })));
const same = (a, b) => Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;

// Points at a row, and says which page elements light up.
async function pointRow(page, overlay, key) {
  await overlay.locator('.bpp .head').click();
  await overlay.locator(`.bpp .row[data-key^="${key}"]`).first().hover();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect').length > 0, null, { timeout: 3000 });
  return lit(page);
}
// Opens a mark's chooser by a real click on its box, and returns the words it shows.
async function openMark(page, overlay, id) {
  const hit = overlay.locator(`.bp .hit[data-id="${id}"]`);
  const b = await hit.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  const hint = overlay.locator('.bp .bp-hint[data-on]');
  await hint.waitFor({ timeout: 3000 });
  const hinted = await hint.innerText();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  const ch = overlay.locator('.ch .card[role="dialog"]');
  await ch.waitFor({ timeout: 5000 });
  await ch.locator('.read .note').waitFor({ timeout: 5000 });
  return { hinted, title: await ch.getAttribute('aria-label'), note: await ch.locator('.read .note').innerText(), because: await ch.locator('.read .because').innerText(), steps: await ch.locator('.cmp .opt').count() };
}

// One page per rule: the element that breaks it beside the one that follows it, on the demo's theme
// (radius tag 6, control 8, card 12; spacing s1 4, s2 8, s3 12, s4 16, s6 24; colours ink, ink-muted, …).
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <section id="cc" className="flex flex-col gap-s6">
        <div id="cc-bad" className="rounded-card bg-surface p-s1 shadow-rest">
          <div id="cc-bad-child" className="rounded-card bg-ground p-s3 text-small">Not concentric: 12px inside 4px of a 12px corner</div>
        </div>
        <div id="cc-good" className="rounded-card bg-surface p-s1 shadow-rest">
          <div id="cc-good-child" className="rounded-control bg-ground p-s3 text-small">Concentric: 8px inside 4px of a 12px corner</div>
        </div>
      </section>
      <section id="io-bad" className="flex flex-col gap-s2">
        <div id="io-bad-a" className="flex flex-col gap-s4 text-small"><span>one</span><span>two</span></div>
        <div id="io-bad-b" className="flex flex-col gap-s4 text-small"><span>three</span><span>four</span></div>
      </section>
      <section id="io-good" className="flex flex-col gap-s4">
        <div id="io-good-a" className="flex flex-col gap-s2 text-small"><span>one</span><span>two</span></div>
        <div id="io-good-b" className="flex flex-col gap-s2 text-small"><span>three</span><span>four</span></div>
      </section>
      <p id="op-bad" className="text-body opacity-65">Faded through opacity</p>
      <p id="op-good" className="text-body text-ink-muted">Coloured with a token</p>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span id="hp-bad" className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 33 }}>odd</span>
      </div>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span id="hp-good" className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 34 }}>even</span>
      </div>
    </main>
  );
}
`;

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
  // the panel: one row for the cause, its class, its noun, one place
  const rows = (await craftRows(overlay)).filter((r) => r.rule === 'craft/concentric-radius');
  assert.deepEqual(rows.map((r) => [r.text, r.what]), [['rounded-card', 'Corner doesn’t match its parent · 1 place']]);
  // pointing at the row lights the breaking child, not the good one
  const glow = await pointRow(page, overlay, 'craft/concentric-radius');
  assert.ok(glow.some((g) => same(g, child)), `the row lights the child: ${JSON.stringify(glow)}`);
  const good = await rectOf(page, 'cc-good-child');
  assert.ok(!glow.some((g) => same(g, good)), 'and not the concentric one');
  await page.mouse.move(5, 5);
  // the mark's note says the change; the chooser says why and what to do, and offers no scale to pick from
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /rounded-card → rounded-control/);
  assert.match(words.title, /^This 12px corner sits 4px inside a 12px corner/);
  assert.match(words.note, /Change rounded-card to rounded-control: 8px: 12px minus 4px\./);
  assert.match(words.because, /Inner radius = outer radius minus the padding/);
  assert.equal(words.steps, 1, "the suggestion is the one choice");
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
  const rows = (await craftRows(overlay)).filter((r) => r.rule === 'craft/inner-outer-spacing');
  assert.deepEqual(rows.map((r) => [r.text, r.what]), [['gap-s4', 'Group falls apart · 2 places']]);
  const glow = await pointRow(page, overlay, 'craft/inner-outer-spacing');
  const [badA, badB, goodA] = await Promise.all(['io-bad-a', 'io-bad-b', 'io-good-a'].map((id) => rectOf(page, id)));
  assert.ok(glow.some((g) => same(g, badA)) && glow.some((g) => same(g, badB)), `both groups light: ${JSON.stringify(glow)}`);
  assert.ok(!glow.some((g) => same(g, goodA)), 'the well-spaced group does not');
  await page.mouse.move(5, 5);
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /gap-s4 → gap-s2/);
  assert.match(words.note, /Change gap-s4 to gap-s2: 8px, tighter than the 8px between groups\./);
  assert.match(words.because, /close together as one group/);
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
  const rows = (await craftRows(overlay)).filter((r) => r.rule === 'craft/text-opacity');
  assert.deepEqual(rows.map((r) => [r.text, r.what]), [['opacity-65', 'Faded with opacity · 1 place']]);
  const glow = await pointRow(page, overlay, 'craft/text-opacity');
  const good = await rectOf(page, 'op-good');
  assert.ok(glow.some((g) => same(g, bad)) && !glow.some((g) => same(g, good)), `the faded paragraph lights, the coloured one does not: ${JSON.stringify(glow)}`);
  await page.mouse.move(5, 5);
  // the suggestion names the theme colour the faded text actually shows here: ink at 65% over the ground is ink-muted
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /opacity-65 → text-ink-muted/);
  assert.match(words.note, /Change opacity-65 to text-ink-muted: the colour it shows as now\./);
  assert.match(words.because, /Opacity changes with whatever is behind/);
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
  const rows = (await craftRows(overlay)).filter((r) => r.rule === 'craft/half-pixel');
  assert.deepEqual(rows.map((r) => [r.text, r.what]), [['-translate-x-1/2', 'Blurry text · 1 place']]);
  const glow = await pointRow(page, overlay, 'craft/half-pixel');
  const good = await rectOf(page, 'hp-good');
  assert.ok(glow.some((g) => same(g, bad)) && !glow.some((g) => same(g, good)), `the odd label lights, the even one does not: ${JSON.stringify(glow)}`);
  await page.mouse.move(5, 5);
  const words = await openMark(page, overlay, marks[0].id);
  assert.match(words.hinted, /Make it 34px wide, so half of it is a whole number\./);
  assert.match(words.note, /Make it 34px wide, so half of it is a whole number\./);
  assert.match(words.because, /blur when they sit between two pixels/);
  assert.deepEqual(errors, []);
});

test('Noise: a well-built page yields no craft finding; the demo with every corner case yields only its three real ones', { timeout: 120000 }, async (t) => {
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
    await page.waitForFunction(() => /off on this page|All on the system|not checked/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.bpp .meta').textContent), null, { timeout: 10000 });
    const want = known[app ? 'GOOD' : 'demo'];
    const marks = await craftMarks(page);
    assert.deepEqual([...new Set(marks.map((m) => m.rule))].sort(), want, `craft marks on ${app ? 'the well-built page' : 'the demo'}: ${JSON.stringify(marks.map((m) => m.label))}`);
    assert.deepEqual([...new Set((await craftRows(overlay)).map((r) => r.rule.replace('craft/', '')))].sort(), want, `craft rows on ${app ? 'the well-built page' : 'the demo'}`);
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
  await openMark(page, overlay, mark.id);
  const ch = overlay.locator('.ch .card[role="dialog"]');
  const step = ch.locator('.cmp .opt', { hasText: 'rounded-control' });
  // pointing previews: the child wears the suggested class on the page
  await step.hover();
  await page.waitForFunction(() => document.getElementById('cc-bad-child').classList.contains('rounded-control'), null, { timeout: 3000 });
  assert.equal(await page.locator('#cc-bad-child').evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '8px');
  await step.click();
  await overlay.locator('.dock .write').click();
  for (let i = 0; i < 100 && !/rounded-control/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-control bg-ground/, 'the class is swapped where it was, in source');
  assert.doesNotMatch(await line(), /rounded-card/);
  // the write is in the history: Undo puts the source back
  await overlay.locator('.wt').filter({ hasText: /Wrote rounded-control/ }).waitFor({ timeout: 10000 });
  await overlay.locator('.wt').getByRole('button', { name: 'Undo' }).click();
  for (let i = 0; i < 100 && !/rounded-card/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-card bg-ground/);
  assert.deepEqual(errors, []);
});

test('The Alt card shows craft findings too: pinning the non-concentric child names the rule and its suggestion', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await page.locator('#cc-bad-child').click({ modifiers: ['Alt'] });
  const card = overlay.locator('.w:not([hidden]) .card');
  await card.waitFor({ timeout: 10000 });
  await page.waitForFunction(() => /sits 4px inside a 12px corner/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.w:not([hidden]) .card')?.textContent ?? ''), null, { timeout: 10000 });
  assert.match(await card.innerText(), /rounded-card/);
  // the concentric one beside it carries no craft finding
  await page.keyboard.press('Escape');
  await page.locator('#cc-good-child').click({ modifiers: ['Alt'] });
  await card.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);
  assert.doesNotMatch(await card.innerText(), /sits 4px inside a 12px corner/);
  assert.deepEqual(errors, []);
});

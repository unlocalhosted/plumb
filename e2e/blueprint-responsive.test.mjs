// Blueprint open on a page that moves (docs/briefs/engine-foundations.md). With Blueprint open and idle, crafting-ui
// scrolled at 7 frames a second (57 alone): every frame asked the browser what covers every marked element in view.
// Positions are now measured only when the page may have moved, only for what is lit while it scrolls, and what is
// covered is confirmed a moment after the frame. And reading a page froze it: every element was judged in one block;
// it is judged in slices now. What must still be true for a person:
//   a zone is where its element is after a scroll, and pointing at it lights it
//   an element that gets covered loses its zone, and gets it back when uncovered
//   a page too big for one slice is read whole: the same findings, once for every row
// Real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { built, fixture } from './helpers/craft-headless.mjs';

const PAGE = `export function App() {
  const n = Number(new URLSearchParams(location.search).get('n') ?? 0);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 px-s4 pb-s6 text-body text-ink">
      <p id="first" className="p-[9px]">Kiln one is firing</p>
      <div className="h-[900px]" />
      <p id="second" className="m-[7px]">Kiln two is cooling</p>
      <div className="h-[900px]" />
      <ul className="flex flex-col gap-s2">
        {Array.from({ length: n }, (_, i) => <li key={i} className="rounded-[12px] bg-surface p-[8px]"><div className="h-[20px] rounded-[12px] bg-ink" /></li>)}
      </ul>
    </main>
  );
}
`;

async function open(t) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => browser.close());
  const { url } = await fixture(t, PAGE);
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 800 } });
  return { page, url };
}
const ready = async (page, url) => {
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
};
// the zones Blueprint has drawn, each with the box of the element it belongs to, and where to aim at it
const zones = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return { boxes: [...root.querySelectorAll('.bp g.zone')].map((g) => g.dataset.box), lit: [...root.querySelectorAll('.bp g.zone')].filter((g) => Number(g.style.opacity) > 0).length,
    aims: [...root.querySelectorAll('.bp .hit')].filter((h) => h.getAttribute('d')).map((h) => h.dataset.at.split(',').map(Number)), hint: root.querySelector('.bp-hint')?.hasAttribute('data-on') ?? false };
});
const boxOf = (page, id) => page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { key: `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`, left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }, id);
const within = (aim, box) => aim[0] >= box.left - 8 && aim[0] <= box.right + 8 && aim[1] >= box.top - 8 && aim[1] <= box.bottom + 8;

test('with Blueprint open, a zone is where its element is after a scroll, steps aside while the page moves, and lights when pointed at; a covered element loses its zone and gets it back', { timeout: 120000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const opened = await open(t); if (!opened) return;
  const { page, url } = opened;
  await ready(page, url);
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done === true && window.__plumb.overlay.progress.drift > 0, null, { timeout: 60000 });
  const first = await boxOf(page, 'first');
  await page.waitForFunction((key) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.zone')].some((g) => g.dataset.box === key), first.key, { timeout: 10000 });

  // scroll the second paragraph into view; note whether the hit areas stepped aside while the page moved
  await page.evaluate(() => {
    const bp = document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp');
    window.__moved = false;
    new MutationObserver(() => { if (bp.querySelector('svg[data-moving]')) window.__moved = true; }).observe(bp, { attributes: true, subtree: true, attributeFilter: ['data-moving'] });
  });
  await page.mouse.move(600, 400);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 150); await new Promise((r) => setTimeout(r, 30)); }
  await page.waitForFunction(() => scrollY >= 850 && !document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp svg[data-moving]'), null, { timeout: 10000 });
  const second = await boxOf(page, 'second');
  await page.waitForFunction((key) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.zone')].some((g) => g.dataset.box === key), second.key, { timeout: 10000 });
  assert.equal(await page.evaluate(() => window.__moved), true, 'the hit areas stepped aside while the page scrolled');
  const after = await zones(page);
  assert.ok(!after.boxes.includes(first.key), `the first paragraph scrolled away and its zone with it: ${JSON.stringify(after.boxes)}`);
  const aim = after.aims.find((a) => within(a, second));
  assert.ok(aim, `a hit area sits on the second paragraph where it is now: ${JSON.stringify({ second, aims: after.aims })}`);
  assert.equal(after.lit, 0, 'nothing is lit at rest');

  // pointing at it lights it and says what it is
  await page.mouse.move(aim[0], aim[1]);
  await page.waitForFunction(() => { const root = document.querySelector('plumb-overlay').shadowRoot; return root.querySelector('.bp-hint')?.hasAttribute('data-on') && [...root.querySelectorAll('.bp g.zone')].some((g) => Number(g.style.opacity) > 0); }, null, { timeout: 5000 });
  await page.mouse.move(600, 20);

  // something is put over the whole page: the paragraph under it has no zone left, so a click on the cover never lands on it
  await page.evaluate(() => { const cover = document.createElement('div'); cover.id = 'cover'; cover.style.cssText = 'position:fixed;inset:0;background:white;z-index:50'; document.body.append(cover); });
  await page.waitForFunction((key) => ![...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.zone')].some((g) => g.dataset.box === key), second.key, { timeout: 10000 });
  const covered = await zones(page);
  assert.ok(!covered.aims.some((a) => within(a, second)), `nothing to aim at under the cover: ${JSON.stringify(covered.aims)}`);
  await page.evaluate(() => document.getElementById('cover').remove());
  await page.waitForFunction((key) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp g.zone')].some((g) => g.dataset.box === key), second.key, { timeout: 10000 });
});

test('a page of 900 rows is read whole: the same findings as a page of 3, each once for every row', { timeout: 180000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const opened = await open(t); if (!opened) return;
  const { page, url } = opened;
  const read = async (n) => {
    await ready(page, `${url}?n=${n}`);
    await page.waitForFunction((n) => document.querySelectorAll('li').length === n, n);
    const result = await page.evaluate(() => window.__plumb.craft({ timeout: 120000 }));
    assert.equal(result.complete, true, `read to the end with ${n} rows`);
    // what was found on the rows: rule → how many elements carry it
    return Object.fromEntries(result.findings.filter((f) => f.tag === 'li' || f.tag === 'div' && /rounded-\[12px\]/.test(JSON.stringify(f))).map((f) => [`${f.rule}|${f.text}`, f.count]).sort());
  };
  const small = await read(3), big = await read(900);
  assert.ok(Object.keys(small).length > 0, `the rows have something to find: ${JSON.stringify(small)}`);
  assert.deepEqual(Object.keys(big), Object.keys(small));
  for (const key of Object.keys(small)) assert.equal(big[key], small[key] * 300, `${key}: ${small[key]} on 3 rows, ${big[key]} on 900`);
  t.diagnostic(JSON.stringify({ small, big }));
});

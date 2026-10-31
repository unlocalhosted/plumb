// The craft hierarchy, layer 1 (docs/briefs/craft-hierarchy.md): when rules meet on one facet of one element, one mark
// is kept by (refines, tier, confidence) and the others ride on it as quiet "also" findings (the glow's data-also, the
// engine's mark). Proved as a person sees it: one mark on the element, the kept rule's words, its cause in the fix panel.
// Real Vite, React, Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { applyFix, cause, engineMark, openMark } from './helpers/fix.mjs';

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
  const root = await mkdtemp(join(repo, 'fixtures/.craft-hier-'));
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
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s6">
        <p id="faded" className="text-body text-ink opacity-30">Faded words nobody can read</p>
        <p id="faded-ok" className="text-body text-ink opacity-65">Faded words that still read</p>
        <div><button id="off" disabled className="rounded-control bg-accent px-s4 py-s2 text-body text-surface opacity-40">Pay now</button></div>
        <div><button id="off-ok" disabled className="rounded-control bg-ground px-s4 py-s2 text-body text-ink-muted">Pay now</button></div>
        <p id="path" className="w-40 truncate text-body">src/components/forms/inputs/TextField.tsx</p>
        <p id="sentence" className="w-40 truncate text-body">A sentence far too long for its box</p>
        <div><button id="pair" className="flex items-center gap-s2 rounded-control bg-surface px-s3 py-s3 text-body"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>Save</button></div>
        <div><button id="pair-ok" className="flex items-center gap-s2 rounded-control bg-surface pl-s4 pr-s6 py-s3 text-body"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>Save</button></div>
        <div id="rows" className="flex flex-col items-start gap-s2">{['a', 'b', 'c'].map((n) => <button key={n} className="rounded-control bg-surface px-s2 py-s2 text-body">Go {n}</button>)}</div>
      </div>
    </main>
  );
}
`;

// the craft marks whose box sits on one element
const on = async (page, id) => {
  const r = await page.evaluate((id) => { const el = document.getElementById(id); const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: Math.max(b.right, b.left + el.scrollWidth), b: b.bottom }; }, id);
  return (await craftMarks(page)).filter((m) => m.x + m.w / 2 >= r.l - 2 && m.x + m.w / 2 <= r.r + 20 && m.y + m.h / 2 >= r.t - 2 && m.y + m.h / 2 <= r.b + 2);
};

// the rules folded under a glow, as the glow carries them
const alsoOn = (overlay, id) => overlay.locator(`.bp .hit[data-id="${id}"]`).getAttribute('data-also');

test('Colour trio: faded text that cannot be read is one contrast mark with the fade folded under it; a disabled control faded to nothing is judged by the disabled rule alone', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(500);
  const faded = await on(page, 'faded');
  assert.deepEqual(faded.map((m) => m.rule), ['contrast'], JSON.stringify(faded));
  // the kept mark speaks in its own words; the fade rides under it
  assert.match(faded[0].label, /^Contrast \d+ at 14px\./);
  assert.equal(await alsoOn(overlay, faded[0].id), 'craft/text-opacity');
  const folded = (await engineMark(page, 'faded', 'craft/contrast')).also;
  assert.deepEqual(folded.map((a) => a.rule), ['craft/text-opacity']);
  assert.match(folded[0].title, /^This text uses opacity 0\.3/);
  // a click on it puts the one cause in hand
  const words = await openMark(page, overlay, faded[0].id);
  assert.equal(words.line, faded[0].label);
  await page.keyboard.press('Escape');
  await overlay.locator('.fx .line').waitFor({ timeout: 5000 });
  // the one that still reads keeps the polish finding alone
  assert.deepEqual((await on(page, 'faded-ok')).map((m) => m.rule), ['text-opacity']);
  const off = await on(page, 'off');
  assert.deepEqual(off.map((m) => m.rule), ['disabled-contrast'], JSON.stringify(off));
  // inside its scope the disabled rule is the only judge: no fade or contrast finding is even made, so nothing folds
  assert.equal(await alsoOn(overlay, off[0].id), '');
  assert.deepEqual((await engineMark(page, 'off', 'craft/disabled-contrast')).also, []);
  assert.deepEqual(await on(page, 'off-ok'), []);
  assert.deepEqual(errors, []);
});

test('Truncation pair: a cut-off path is judged by middle-truncate alone; a cut-off sentence is one truncate-intent mark', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(500);
  const path = await on(page, 'path');
  assert.deepEqual(path.map((m) => m.rule), ['middle-truncate'], JSON.stringify(path));
  assert.equal(await alsoOn(overlay, path[0].id), '', 'nothing folds under the path');
  assert.deepEqual((await on(page, 'sentence')).map((m) => m.rule), ['truncate-intent']);
  // one cause per kept finding: the folded one makes none, so each rule is held once on the page
  const rules = (await craftMarks(page)).map((m) => m.rule);
  assert.equal(rules.filter((r) => r === 'middle-truncate').length, 1);
  assert.equal(rules.filter((r) => r === 'truncate-intent').length, 1);
  assert.deepEqual(errors, []);
});

test('Padding pair: square padding on an icon button is one mark whose one edit answers both rules (wider across, less on the icon side); written, the button is quiet', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(500);
  const pair = await on(page, 'pair');
  assert.deepEqual(pair.map((m) => m.rule), ['button-padding'], JSON.stringify(pair));
  assert.deepEqual(await on(page, 'pair-ok'), []);
  // the icon-side rule rides under it
  assert.equal(await alsoOn(overlay, pair[0].id), 'craft/icon-side');
  const folded = (await engineMark(page, 'pair', 'craft/button-padding')).also;
  assert.match(folded[0].title, /The icon side has the same/);
  // the composed edit: button-padding's 24px across, then icon-side run on that page takes 4px off the icon side
  const words = await openMark(page, overlay, pair[0].id, { options: true });
  assert.equal(words.target, 's6', `the pick is 24px across: ${JSON.stringify(words)}`);
  await applyFix(page, overlay);
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="pair"'));
  for (let i = 0; i < 100 && !/pl-s4 pr-s6/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="flex items-center gap-s2 rounded-control bg-surface pl-s4 pr-s6 py-s3 text-body"/);
  // the page as written: neither rule has anything left to say about the button
  await page.reload();
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await blueprint(page, overlay);
  await page.waitForTimeout(500);
  assert.deepEqual(await on(page, 'pair'), []);
  assert.deepEqual(errors, []);
});

test('Rows from one JSX line: the cause is picked once from the panel and written once, every row with it, nothing refused', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(500);
  // a click on one row's glow: the cause is the class, all three places, one line
  const rows = (await craftMarks(page)).filter((m) => m.rule === 'button-padding');
  const mine = await page.evaluate(() => [...document.querySelectorAll('#rows > button')].map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
  const onRow = rows.find((m) => mine.some((r) => m.x + m.w / 2 >= r.l - 2 && m.x + m.w / 2 <= r.r + 20 && m.y + m.h / 2 >= r.t - 2 && m.y + m.h / 2 <= r.b + 2));
  assert.ok(onRow, `a button-padding glow on a row: ${JSON.stringify(rows)}`);
  const words = await openMark(page, overlay, onRow.id, { options: true });
  assert.equal(words.cls, 'px-s2');
  assert.match(words.what, /1 place in your code · 3 on the page$/, 'rows from one JSX line are one place, drawn three times');
  let writes = 0;
  await page.route('**/swaps', (route) => { writes++; route.continue(); });
  await applyFix(page, overlay);
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="rows"'));
  for (let i = 0; i < 100 && !/px-s4/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-control bg-surface px-s4 py-s2 text-body">Go \{n\}/);
  await page.waitForTimeout(500);
  assert.equal(writes, 1, 'one write');
  assert.deepEqual(errors, []);
});

// The history timeline, layer 1 (docs/briefs/time-travel.md): the dock's history button grows into a strip with one
// tick per change and one segment per step; the playhead points at a change; Undo change and Undo step take back
// exactly that, in the file; a change edited by hand says why it can't be undone. Real Vite, React and Chromium.
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
const APP = `export function App() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <div id="a" className="p-4 gap-2">One</div>
      <div id="b" className="p-[13px]">Two</div>
      <div id="c" className="mt-[10px]">Three</div>
    </main>
  );
}
`;

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.timeline-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), APP);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const call = async (method, params = {}, verb = 'GET') => {
    const at = new URL('__plumb/' + method, url);
    if (verb === 'GET') at.search = new URLSearchParams(params);
    const response = await fetch(at, { method: verb, headers: { 'Content-Type': 'application/json', Origin: new URL(url).origin, 'Sec-Fetch-Site': 'same-origin' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const read = () => readFile(join(root, 'src/App.jsx'), 'utf8');
  const swaps = async (edits, trace) => {
    const hash = (await call('props', { file: 'src/App.jsx', line: 4, column: 7 })).body.hash;
    const r = await call('swaps', { file: 'src/App.jsx', hash, edits: edits.map(([line, from, to]) => ({ line, column: 7, from, to })), ...(trace ? { trace } : {}) }, 'POST');
    assert.equal(r.status, 200, JSON.stringify(r.body));
  };
  return { root, url, read, swaps };
}
async function browser(t) {
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close()); return launched;
}
const overlay = (page) => page.locator('plumb-overlay');
// what the strip shows: steps with their ticks, the pointed one, the pill, the slider's words, the actions
const strip = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot, tt = root.querySelector('.tt');
  if (!tt || tt.hidden) return null;
  const track = tt.querySelector('.tt-track');
  return {
    steps: [...tt.querySelectorAll('.tt-seg')].map((s) => ({ name: s.querySelector('.tt-name').textContent, ticks: [...s.querySelectorAll('.tt-tick')].map((k) => k.dataset.state + (k.hasAttribute('data-undo') ? '+undo' : '')) })),
    pointed: tt.querySelector('.tt-tick[aria-current="true"]')?.dataset.i ?? null,
    pill: tt.querySelector('.tt-pill:not([hidden])')?.textContent ?? null, warn: tt.querySelector('.tt-pill')?.dataset.kind ?? '',
    valuetext: track?.getAttribute('aria-valuetext') ?? null, focused: root.activeElement === track,
    change: tt.querySelector('[data-act="change"]')?.disabled ?? null, step: tt.querySelector('[data-act="step"]')?.disabled ?? null,
    say: tt.querySelector('.tt-say')?.textContent ?? null,
    // drawn where they belong: every tick inside the strip, oldest to newest left to right; the playhead and the pill over the pointed one
    laidOut: (() => { const box = tt.getBoundingClientRect(), xs = [...tt.querySelectorAll('.tt-tick[data-i]')].sort((a, b) => a.dataset.i - b.dataset.i).map((k) => k.getBoundingClientRect());
      return xs.every((r) => r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom) && xs.every((r, i) => i === 0 || r.left > xs[i - 1].left); })(),
    headOnTick: (() => { const k = tt.querySelector('.tt-tick[aria-current="true"]'), h = tt.querySelector('.tt-head'); if (!k || !h) return null; const a = k.getBoundingClientRect(), b = h.getBoundingClientRect(); return Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < 2; })(),
  };
});

test('the timeline shows each change as a tick in its step, and undoes one change, then the rest of the step, in the file', { timeout: 120000 }, async (t) => {
  const app = await demo(t), launched = await browser(t), page = await launched.newPage();
  await page.goto(app.url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 60000 });

  // empty before anything is written
  await overlay(page).locator('.dock .history').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tt .tt-say'));
  assert.equal((await strip(page)).say, 'Nothing changed yet. What you write shows up here.');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tt').hidden);

  await app.swaps([[4, 'gap-2', 'gap-3'], [5, 'p-[13px]', 'p-3'], [6, 'mt-[10px]', 'mt-2.5']], { group: 'spacing-1', meta: { step: 'Spacing', laws: [{ id: 'proximity', name: 'Law of proximity' }] } });
  await overlay(page).locator('.dock .history').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length === 3);
  let s = await strip(page);
  assert.deepEqual(s.steps, [{ name: 'Spacing', ticks: ['live', 'live', 'live'] }]);
  assert.equal(s.pointed, '2', 'opens at Now: the newest change');
  assert.equal(s.pill, 'mt-[10px] → mt-2.5Law of proximity');
  assert.ok(s.focused, 'the slider has focus');
  assert.ok(s.laidOut, 'ticks drawn in the strip, in order');

  // ← points at the middle change; ⌫ takes back exactly it
  await page.keyboard.press('ArrowLeft');
  s = await strip(page);
  assert.equal(s.valuetext, 'Change 2 of 3, Spacing: p-[13px] to p-3, Law of proximity');
  assert.equal(s.change, false);
  await page.waitForTimeout(300); // the playhead travels
  assert.ok((await strip(page)).headOnTick, 'the playhead is over the pointed tick');
  await page.keyboard.press('Backspace');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length === 4);
  assert.equal(await app.read(), APP.replace('gap-2', 'gap-3').replace('mt-[10px]', 'mt-2.5'));
  s = await strip(page);
  assert.deepEqual(s.steps, [{ name: 'Spacing', ticks: ['live', 'undone', 'live'] }, { name: 'Undo', ticks: ['live+undo'] }]);
  assert.equal(s.pointed, '3', 'back at Now: the undo is the newest change');
  assert.equal(s.pill, 'Undop-3 → p-[13px]');

  // Home, then ⇧⌫: the rest of the step goes, the file is as it started
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+Backspace');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length === 6);
  assert.equal(await app.read(), APP);
  assert.deepEqual((await strip(page)).steps[0], { name: 'Spacing', ticks: ['undone', 'undone', 'undone'] });

  // Esc closes and hands focus back to the history button
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tt').hidden);
  assert.ok(await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.activeElement?.classList.contains('history')));
});

test('a change edited by hand is hatched, its Undo change is off, and ⌫ says why instead of writing', { timeout: 120000 }, async (t) => {
  const app = await demo(t), launched = await browser(t), page = await launched.newPage();
  await page.goto(app.url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 60000 });
  await app.swaps([[5, 'p-[13px]', 'p-3']]);
  const typed = (await app.read()).replace('p-3', 'p-8');
  await writeFile(join(app.root, 'src/App.jsx'), typed);
  await overlay(page).locator('.dock .history').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length === 1);
  let s = await strip(page);
  assert.deepEqual(s.steps, [{ name: 'App.jsx', ticks: ['changed'] }]);
  assert.equal(s.change, true, 'Undo change is off');
  await page.keyboard.press('Backspace');
  s = await strip(page);
  assert.equal(s.warn, 'warn');
  assert.equal(s.pill, 'Edited outside React Plumber, so it can’t be undone here. Undo it in your editor.');
  assert.equal(await app.read(), typed, 'nothing written');
});

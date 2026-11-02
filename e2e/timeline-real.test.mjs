// The timeline on crafting-ui's own standards page (fixtures/crafting-ui-standards, frozen from crafting-ui), one test
// per failure its QA found (docs/qa/timeline-crafting-ui.md): a class written where a component is used, a class
// compile that takes seconds, a component rendered once per entry, and a cache folder git would have picked up.
// Real Vite with hot updates, React, Tailwind and Chromium.
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
const FILE = 'src/pages/MotionStandardsPage.tsx';

async function standards(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.timeline-real-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const ready = () => page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  await page.goto(url); await ready();
  const source = await readFile(join(root, FILE), 'utf8');
  const columnOf = (line) => source.split('\n')[line - 1].indexOf('<') + 1;
  // a write as a panel makes it, same origin; the page may reload for it (this one does, as crafting-ui does)
  const call = async (method, params, verb = 'GET') => {
    const at = new URL('__plumb/' + method, url); if (verb === 'GET') at.search = new URLSearchParams(params);
    return (await fetch(at, { method: verb, headers: { 'Content-Type': 'application/json', Origin: new URL(url).origin, 'Sec-Fetch-Site': 'same-origin' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) })).json();
  };
  const swap = async (line, from, to, trace) => {
    const column = columnOf(line), { hash } = await call('props', { file: FILE, line, column });
    return call('swaps', { file: FILE, hash, edits: [{ line, column, from, to }], ...(trace ? { trace } : {}) }, 'POST');
  };
  const open = async (n) => {
    await page.locator('plumb-overlay').locator('.dock .history').click();
    await page.waitForFunction((k) => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length === k, n, { timeout: 20000 });
  };
  const marks = () => page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt-marks:not([hidden]) .tt-mark')].map((m) => { const r = m.getBoundingClientRect(); return [r.left + 4, r.top + 4, r.width - 8, r.height - 8].map(Math.round); }));
  const boxes = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }), sel);
  const pill = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tt-pill:not([hidden])')?.textContent ?? null);
  return { root, page, errors, ready, swap, open, marks, boxes, pill };
}
const near = (a, b) => a.length === b.length && a.every((box, i) => box.every((v, k) => Math.abs(v - b[i][k]) <= 1));

test('a class written where a component is used: its element is outlined, the pill reads cleanly, the past shows it without', { timeout: 150000 }, async (t) => {
  const s = await standards(t);
  assert.deepEqual((await s.swap(62, 'mt-2', 'mt-3')).refused ?? [], []);
  // <Lettering className="enter"> on line 20: the class lands on the <p> Lettering draws
  assert.deepEqual((await s.swap(20, 'enter', 'enter mt-6')).refused ?? [], []);
  const lettering = 'main header > p.measure';
  await s.page.waitForFunction((sel) => { const el = document.querySelector(sel); return el && getComputedStyle(el).marginTop === '24px'; }, lettering, { timeout: 30000 });
  await s.ready();
  await s.open(2);
  await s.page.waitForTimeout(400);
  assert.ok(near(await s.marks(), await s.boxes(lettering)), `outlined: ${JSON.stringify(await s.marks())}, Lettering: ${JSON.stringify(await s.boxes(lettering))}`);
  assert.equal(await s.pill(), '∅ → mt-6', 'no stray space before the class');
  await s.page.keyboard.press('ArrowLeft');
  await s.page.waitForFunction((sel) => getComputedStyle(document.querySelector(sel)).marginTop === '0px', lettering, { timeout: 10000 });
  await s.page.keyboard.press('End');
  await s.page.waitForFunction((sel) => getComputedStyle(document.querySelector(sel)).marginTop === '24px', lettering, { timeout: 10000 });
  assert.deepEqual(s.errors, []);
});

test('the strip draws its ticks while the class compile is still running, and shows the past once it lands', { timeout: 150000 }, async (t) => {
  const s = await standards(t);
  await s.swap(36, 'mt-2', 'mt-3');
  await s.swap(62, 'mt-2', 'mt-4');
  await s.page.waitForFunction(() => { const h = document.querySelector('main li h3'); return h && getComputedStyle(h).marginTop === '16px'; }, null, { timeout: 30000 });
  await s.ready();
  // crafting-ui's compile took a second; here it takes three
  await s.page.route('**/__plumb/try', async (route) => { await new Promise((r) => setTimeout(r, 3000)); await route.continue(); });
  const opened = Date.now();
  await s.open(2);
  assert.ok(Date.now() - opened < 2000, `ticks after ${Date.now() - opened}ms`);
  assert.equal(await s.page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick.ghost').length), 0, 'no ghosts once the trace is in');
  await s.page.keyboard.press('ArrowLeft');
  await s.page.waitForFunction(() => getComputedStyle(document.querySelector('main li h3')).marginTop === '8px', null, { timeout: 10000 });
  assert.deepEqual(s.errors, []);
});

test('a component rendered once per entry outlines every entry, and the session leaves a cache folder git ignores', { timeout: 150000 }, async (t) => {
  const s = await standards(t);
  await s.swap(66, 'pt-[5px]', 'pt-1');
  await s.page.waitForFunction(() => { const d = document.querySelector('main dt'); return d && getComputedStyle(d).paddingTop === '4px'; }, null, { timeout: 30000 });
  await s.ready();
  await s.open(1);
  await s.page.waitForTimeout(400);
  const whys = await s.boxes('main li[id] dl > dt:first-of-type');
  assert.equal(whys.length, 4, 'four entries on the page');
  assert.ok(near(await s.marks(), whys), 'each entry\'s "Why" is outlined');
  assert.match(await readFile(join(s.root, '.plumber/cache/.gitignore'), 'utf8'), /^\*$/m);
  assert.deepEqual(s.errors, []);
});

test('history reset by hand (a git checkout) collapses into one tick that says so, and the live step after it stays', { timeout: 150000 }, async (t) => {
  // crafting-ui's QA left 10 records behind its resets: 4 hatched ticks, mixed in with live ones (QA issue 5)
  const s = await standards(t);
  const original = await readFile(join(s.root, FILE), 'utf8');
  await s.swap(36, 'mt-2', 'mt-3', { group: 'spacing-1', meta: { step: 'Spacing' } });
  await s.swap(62, 'mt-2', 'mt-3', { group: 'spacing-1', meta: { step: 'Spacing' } });
  await s.swap(66, 'pt-[5px]', 'pt-1');
  await writeFile(join(s.root, FILE), original); // git checkout -- the page
  const typed = await s.swap(62, 'mt-2', 'mt-4', { meta: { step: 'Type' } });
  assert.deepEqual(typed.refused ?? [], [], JSON.stringify(typed));
  await s.page.waitForFunction(() => { const h = document.querySelector('main li h3'); return h && getComputedStyle(h).marginTop === '16px'; }, null, { timeout: 30000 });
  await s.ready();
  await s.open(3);
  const strip = await s.page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt-seg')].map((g) => `${g.querySelector('.tt-name').textContent}: ${[...g.querySelectorAll('.tt-tick')].map((k) => k.dataset.state).join(' ')}`));
  assert.deepEqual(strip, ['Changed since: changed', 'Edited outside: changed', 'Type: live'], 'Spacing touched later by Type; the untagged step only by hand');
  await s.page.keyboard.press('Home');
  await s.page.waitForTimeout(300);
  assert.equal(await s.pill(), '2 changes changed again by later ones. Undo those first.');
  await s.page.keyboard.press('ArrowRight');
  await s.page.waitForTimeout(300);
  assert.equal(await s.pill(), 'A change edited outside React Plumber since. Undo it in your editor.');
  assert.deepEqual(await s.marks(), [], 'nothing outlined for them');
  assert.equal(await s.page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('[data-act="change"]').disabled), true);
  assert.deepEqual(s.errors, []);
});

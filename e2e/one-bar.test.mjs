// Blueprint's one bar (docs/design/one-bar.md), on crafting-ui's standards page: the first thing Blueprint shows was
// three surfaces at once (the fix panel, a hint pill, the dock), its line wrapped ("Clean up this page" over two lines, its
// key floating loose), the hint explained another flow, and the dock showed five icons at rest. Now: at rest the dock is
// its mark alone and its tools come out when pointed at; in Blueprint there is one bar, one line at 1440 and 375 wide,
// one count with the rest one point away, each key on the action it presses, the tools behind ···, and Close.
// Real Vite, React, Tailwind, the real CLI and Chromium.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);
const FILE = 'src/pages/MotionStandardsPage.tsx';
// every source file's text, to say a write left nothing behind once undone
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));

// the stage page on crafting-ui (src/pages/sloppy/SloppyIssuesPage.tsx:36): a nav whose size class sits in a template
// string beside a weight switched by an expression, so one of the text pass's swaps can't be written
async function standards(t, { nav = false } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  if (nav) await writeFile(join(root, 'src/Nav.jsx'), NAV);
  await writeFile(join(root, 'src/App.jsx'), nav
    ? `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nimport { Nav } from './Nav.jsx';\nexport function App() { return <><Nav /><MotionStandardsPage /></>; }\n`
    : `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
  const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
  // the page's text as drawn: every stamped element's size, in order
  const sizes = `[...document.querySelectorAll('[data-plumb-source]')].map((e) => getComputedStyle(e).fontSize).join()`;
  const h1 = () => page.evaluate(sizes);
  // Blueprint on, the fixes read, then C: the text pass, ready to apply
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up/);
    await page.keyboard.press('c');
    await until(/Apply to this page/);
  };
  return { root, page, errors, panel, until, h1, sizes, begin };
}

const inRoot = (fn) => `(() => { const r = document.querySelector('plumb-overlay').shadowRoot; return (${fn})(r); })()`;
const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
// the bar's measure: its height, and any piece of it that wraps or spills past its edges
const measure = inRoot(`(r) => { const bar = r.querySelector('.fx[data-rest] .bar'); if (!bar) return null; const b = bar.getBoundingClientRect();
  const out = [...bar.querySelectorAll('button, .count, .quiet-line, .notice')].filter((e) => { const q = e.getBoundingClientRect(); return q.width && (q.right > b.right + 0.5 || q.left < b.left - 0.5 || q.height > 36); }).map((e) => e.className || e.tagName);
  return { height: Math.round(b.height), out, dock: getComputedStyle(r.querySelector('.dock')).display, tip: [...r.querySelectorAll('.tip')].some((t) => t.hasAttribute('data-on')) }; }`);

for (const width of [1440, 375]) test(`one bar at ${width} wide: one surface, one line, each key on its action`, { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  await s.page.setViewportSize({ width, height: 860 });
  // at rest: the dock is its mark; its tools come out when it is pointed at
  // a tool is out when it is drawn: some width, not transparent (folded tools stay in the tab order at zero width)
  const tools = () => s.page.evaluate(inRoot(`(r) => [...r.querySelectorAll('.dock > button')].filter((b) => b.getBoundingClientRect().width > 1 && getComputedStyle(b).opacity !== '0').length`));
  assert.equal(await tools(), 0, 'at rest the dock shows its mark alone');
  await s.page.locator('plumb-overlay').locator('.dock').hover();
  await s.page.waitForTimeout(300); // the tools pop out on the design system's 260ms pop
  // its four tools, and the setup note readiness adds when a step is left
  const all = await s.page.evaluate(inRoot(`(r) => r.querySelectorAll('.dock > button').length`));
  assert.ok(all >= 4 && await tools() === all, `pointed at, every tool comes out (${await tools()} of ${all})`);
  await s.page.mouse.move(5, 5);
  // Blueprint: one bar
  await s.page.keyboard.press('Alt+B');
  await s.until(/problems|notes|Nothing/, 90000);
  await s.page.waitForTimeout(600);
  const m = await s.page.evaluate(measure);
  assert.ok(m, 'the bar is there');
  assert.ok(m.height <= 52, `one line: ${m.height}px`);
  assert.deepEqual(m.out, [], `nothing wraps or spills out of the bar: ${m.out}`);
  assert.equal(m.dock, 'none', 'the dock steps aside: its tools are in the bar');
  assert.equal(m.tip, false, 'no hint pill');
  // the line as seen: the readout is one point away, not in the line
  const line = await s.page.evaluate(inRoot(`(r) => { const b = r.querySelector('.fx .bar').cloneNode(true); b.querySelector('.readout')?.remove(); return b.textContent.replace(/\\s+/g, ' '); }`));
  assert.doesNotMatch(line, /fixes ·|Click anything/, `one count in the line: ${line}`);
  // the rest of the count is one point (or one Tab) away
  // once the page is read (the bar redraws while it checks, and a redraw under a still pointer isn't hovered until it moves)
  await s.page.waitForFunction(() => !/checking/i.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .status')?.getAttribute('aria-description') ?? ''), null, { timeout: 90000 });
  await s.page.locator('plumb-overlay').locator('.fx .status').hover();
  await s.page.waitForTimeout(250);
  const readout = await s.page.evaluate(inRoot(`(r) => { const e = r.querySelector('.fx .readout'); return e ? getComputedStyle(e).opacity + '|' + e.textContent : null; }`));
  if (readout) assert.match(readout, /^1\|.*fix/, `the readout shows the other counts: ${readout}`);
  // each action says its key, and the key works: C opens the clean-up, Esc ends it
  const keys = await s.page.evaluate(inRoot(`(r) => [...r.querySelectorAll('.fx .bar .pl-act')].map((b) => b.getAttribute('aria-keyshortcuts'))`));
  assert.deepEqual(keys, ['c', 'Enter'], `each action carries its key: ${keys}`);
  await s.page.keyboard.press('c');
  await s.until(/Apply to this page|already uses/);
  await s.page.keyboard.press('Escape');
  await s.until(/problems|notes|Nothing/);
  // ··· shows the tools in the bar, and they are the dock's: History opens the history
  if (width > 560) {
    await s.page.locator('plumb-overlay').locator('.fx .bar .more').click();
    assert.equal(await s.page.evaluate(inRoot(`(r) => r.querySelectorAll('.fx .bar .tool').length`)), 3, 'three tools behind ···');
    assert.deepEqual((await s.page.evaluate(measure)).out, [], 'the bar still fits with its tools out');
    await s.page.locator('plumb-overlay').locator('.fx .bar .tool[data-tool="history"]').click();
    await s.page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .history')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
    await s.page.keyboard.press('Escape');
  }
  // Close ends Blueprint, and the dock is back as its mark
  await s.page.locator('plumb-overlay').locator('.fx .bar .bar-close').click();
  await s.page.waitForFunction(() => !document.querySelector('plumb-overlay').hasAttribute('data-blueprint'), null, { timeout: 10000 });
  assert.equal(await s.page.evaluate(inRoot(`(r) => getComputedStyle(r.querySelector('.dock')).display`)), 'flex', 'the dock is back');
  if (width === 1440 && process.env.SHOT) await s.page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(s.errors, []);
});

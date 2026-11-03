// "Clean up this page", the colour pass, in the panel: the third pass after text and spacing, on a page made of
// crafting-ui's own colour drift (a card written white by hand, bg-[#ffffff], stage-shell.tsx; a fourth grey,
// text-[#55555C], stage-shell.tsx:163) and the video's purple gradient panel, which is refused, not moved. Preview plays
// the show and the page takes the tokens' colours; held Space shows it as it was; Apply writes the classes as one
// "Colour" step; Undo puts every file back. Real Vite, React, Tailwind, the real CLI and Chromium.
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
const FILE = 'src/Dashboard.jsx';
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));

// crafting-ui's theme (src/index.css:19-80, `@theme inline`), as e2e/colour-read.test.mjs has it
const THEME = `@import "tailwindcss";
:root {
  --bg: oklch(98.7% 0 0); --bg-sunken: oklch(97% 0 0); --surface: oklch(100% 0 0);
  --fg: oklch(13% 0 0); --fg-muted: oklch(0% 0 0 / 0.62); --fg-faint: oklch(0% 0 0 / 0.42);
  --line: oklch(0% 0 0 / 0.12); --line-strong: oklch(0% 0 0 / 0.32);
  --draw: oklch(50.6% 0.289 264.8); --draw-hover: oklch(44% 0.27 264.8); --draw-soft: oklch(50.6% 0.289 264.8 / 0.1);
  --accent: oklch(57% 0.2 28); --fg-on-accent: oklch(100% 0 0);
  color-scheme: light;
}
@theme inline {
  --color-*: initial;
  --color-transparent: transparent; --color-current: currentColor;
  --color-bg: var(--bg); --color-sunken: var(--bg-sunken); --color-surface: var(--surface);
  --color-line: var(--line); --color-line-strong: var(--line-strong);
  --color-fg: var(--fg); --color-muted: var(--fg-muted); --color-faint: var(--fg-faint); --color-on-accent: var(--fg-on-accent);
  --color-accent: var(--accent); --color-draw: var(--draw); --color-draw-hover: var(--draw-hover); --color-draw-soft: var(--draw-soft);
}
body { margin: 0; background: var(--bg); color: var(--fg); }
`;

const DASHBOARD = `export function Dashboard() {
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <h1 className="text-fg">Overview</h1>
      <section className="mt-6 grid grid-cols-2 gap-4">
        <div id="written" className="bg-[#ffffff] p-4"><p className="text-fg">Revenue</p><p id="fourth" className="text-[#55555C]">Up on last week</p></div>
        <div className="bg-surface p-4"><p className="text-fg">Orders</p><p className="text-muted">Flat</p></div>
      </section>
      <div id="promo" className="mt-6 bg-linear-to-b from-[#7c3aed] to-[#4c1d95] p-6"><p className="text-on-accent">Upgrade</p></div>
      <p className="mt-6 text-faint">Updated a minute ago</p>
    </main>
  )
}`;

async function dashboard(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-colour-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), THEME);
  await writeFile(join(root, FILE), DASHBOARD);
  await writeFile(join(root, 'src/App.jsx'), `import { Dashboard } from './Dashboard.jsx';\nexport function App() { return <Dashboard />; }\n`);
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
  // what the two drifted places paint: the card's background and the fourth grey's ink
  const painted = () => page.evaluate(() => [getComputedStyle(document.getElementById('written')).backgroundColor, getComputedStyle(document.getElementById('fourth')).color]);
  // the muted token as painted, for the fourth grey to become
  const muted = () => page.evaluate(() => { const p = Object.assign(document.createElement('p'), { className: 'text-muted' }); document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
  // Blueprint on, C, then on past text and spacing to the colour pass
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up this page/);
    await page.keyboard.press('c');
    await until(/Apply to this page|already|Next/);
    for (let i = 0; i < 3 && !/different colours|colours on this page are already/.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500); }
    await until(/different colours/);
  };
  return { root, page, errors, panel, until, painted, muted, begin };
}

test('the colour pass moves the written white and the fourth grey onto the theme; Preview plays them, held Space compares, Esc puts them back', { timeout: 300000 }, async (t) => {
  const s = await dashboard(t);
  await s.begin();
  const said = await s.panel();
  assert.match(said, /#ffffff → surface/, said);
  assert.match(said, /55555C → muted/i, said);
  assert.doesNotMatch(said, /7c3aed|4c1d95/, 'the gradient panel is not offered');
  const before = await s.painted(), muted = await s.muted();
  assert.notEqual(before[1], muted, 'the fourth grey paints its own grey before');
  await s.page.keyboard.press('p');
  await s.page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sh-chip')].every((c) => c.hasAttribute('data-done')), null, { timeout: 30000 });
  assert.equal((await s.painted())[1], muted, 'previewing, the fourth grey paints the muted token');
  await s.page.keyboard.down(' ');
  await s.page.waitForFunction((was) => getComputedStyle(document.getElementById('fourth')).color === was, before[1], { timeout: 5000 });
  await s.page.keyboard.up(' ');
  await s.page.waitForFunction((m) => getComputedStyle(document.getElementById('fourth')).color === m, muted, { timeout: 5000 });
  await s.page.keyboard.press('Escape');
  await s.page.waitForFunction((was) => getComputedStyle(document.getElementById('fourth')).color === was, before[1], { timeout: 5000 });
  assert.equal(await s.page.evaluate(() => document.getElementById('fourth').getAttribute('style')), null, 'no inline colour left behind');
  assert.deepEqual(s.errors, []);
});

test('Apply writes the token classes where the colours are, as one Colour step; Undo puts every file back', { timeout: 300000 }, async (t) => {
  const s = await dashboard(t);
  const all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  await s.until(/now use your colours/, 120000);
  const file = await readFile(join(s.root, FILE), 'utf8');
  assert.match(file, /id="written" className="bg-surface p-4"/, file);
  assert.match(file, /id="fourth" className="text-muted"/, file);
  assert.match(file, /from-\[#7c3aed\] to-\[#4c1d95\]/, 'the gradient is left as it is');
  let done = '';
  for (let i = 0; i < 4 && !done; i++) { try { await s.until(/now use your colours/, 60000); await new Promise((r) => setTimeout(r, 1500)); done = await s.panel(); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  assert.match(done, /Colour/, done);
  assert.match(done, /Undo/, done);
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  assert.deepEqual(s.errors, []);
});

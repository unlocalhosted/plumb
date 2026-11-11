// Colour roles by name (docs/design/token-spec.md §3, §5): plumber reads a theme however its colours are named, offers
// to rename them onto its own role names only when asked, writes that rename everywhere with one Undo, and builds a
// whole colour system from one brand colour. Real Vite, React, Tailwind, the real CLI and Chromium.
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
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));

// crafting-ui's theme shape: short role names, `bg` for the page, `surface-pressed` for the press state, a second ink
const FLAT = `@import "tailwindcss";
:root {
  --bg: oklch(98.7% 0 0); --surface: oklch(100% 0 0); --surface-pressed: oklch(95.6% 0.008 265);
  --fg: oklch(13% 0 0); --fg-muted: oklch(0% 0 0 / 0.62); --line: oklch(0% 0 0 / 0.12);
  --draw: oklch(50.6% 0.289 264.8); --draw-soft: oklch(50.6% 0.289 264.8 / 0.1); --accent: oklch(57% 0.2 28);
}
@theme inline {
  --color-*: initial;
  --color-transparent: transparent; --color-current: currentColor;
  --color-bg: var(--bg); --color-surface: var(--surface); --color-surface-pressed: var(--surface-pressed);
  --color-fg: var(--fg); --color-muted: var(--fg-muted); --color-line: var(--line);
  --color-accent: var(--accent); --color-draw: var(--draw); --color-draw-soft: var(--draw-soft);
}
body { margin: 0; background: var(--bg); color: var(--fg); }
`;
const FLAT_PAGE = `export function Dashboard() {
  return (
    <main id="page" className="min-h-screen bg-bg p-8 text-fg">
      <h1 className="text-fg">Overview</h1>
      <div id="card" className="mt-6 border border-line bg-surface p-4 active:bg-surface-pressed"><p className="text-muted">Orders</p></div>
      <button id="go" className="mt-6 bg-accent px-3 py-2 text-surface">Go</button>
      <p id="ink" className="mt-6 text-draw">A drawing label</p>
    </main>
  )
}`;

// a theme named by job paths, BoardUI's way: category, role, state
const PATHS = `@import "tailwindcss";
@theme inline {
  --color-*: initial;
  --color-transparent: transparent; --color-current: currentColor;
  --color-background-full: oklch(98.7% 0 0); --color-background-primary-default: oklch(100% 0 0);
  --color-text-primary: oklch(13% 0 0); --color-text-secondary: oklch(0% 0 0 / 0.62);
  --color-border-default: oklch(0% 0 0 / 0.12); --color-accent-default: oklch(57% 0.2 28);
}
body { margin: 0; background: var(--color-background-full); color: var(--color-text-primary); }
`;
const PATHS_PAGE = `export function Dashboard() {
  return (
    <main className="min-h-screen bg-background-full p-8 text-text-primary">
      <h1 className="text-text-primary">Overview</h1>
      <div id="written" className="mt-6 border border-border-default bg-[#ffffff] p-4"><p className="text-text-secondary">Revenue</p></div>
    </main>
  )
}`;

async function site(t, theme, dashboard) {
  const root = await mkdtemp(join(repo, 'fixtures/.colour-names-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), theme);
  await writeFile(join(root, 'src/Dashboard.jsx'), dashboard);
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
  const panel = async () => { for (let i = 0; ; i++) { try { return await page.evaluate(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? ''); } catch (e) { if (i > 40 || !/context was destroyed|navigation/.test(e.message)) throw e; await page.waitForTimeout(500); } } };
  const until = async (re, timeout = 60000) => { const end = Date.now() + timeout; for (;;) { if (re.test(await panel())) return; if (Date.now() > end) throw new Error(`panel never said ${re}: ${await panel()}`); await page.waitForTimeout(400); } };
  const click = (act) => page.locator('plumb-overlay').locator(`[data-cu="${act}"]`).click();
  // what the page paints, by id: text, background and border colour
  const painted = async (ids) => { for (let i = 0; ; i++) { try { return await page.evaluate((ids) => Object.fromEntries(ids.map((id) => { const c = getComputedStyle(document.getElementById(id)); return [id, [c.color, c.backgroundColor, c.borderTopColor].join(' ')]; })), ids); } catch (e) { if (i > 40 || !/context was destroyed|navigation|null/.test(e.message)) throw e; await page.waitForTimeout(500); } } };
  // Blueprint on, C, then on past text and spacing to the colour pass
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up/);
    await page.keyboard.press('c');
    await until(/Apply to this page|already|Next/);
    // the colour step says how it reads colours: by the job each does
    for (let i = 0; i < 4 && !/read by the job it does/.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500); }
    await until(/read by the job it does/);
  };
  return { root, page, errors, panel, until, click, painted, begin };
}

test('renaming waits behind one entry; asked, it lists plumber\'s role names, writes them everywhere with the colours unchanged, and Undo puts every file back', { timeout: 360000 }, async (t) => {
  const s = await site(t, FLAT, FLAT_PAGE);
  const all = await snapshot(s.root), ids = ['page', 'card', 'go', 'ink'];
  const before = await s.painted(ids);
  await s.begin();
  // only when asked: the colour step shows one quiet entry, not the plan
  const resting = await s.panel();
  assert.match(resting, /Rename my colours…/, resting);
  assert.doesNotMatch(resting, /was bg/, 'the plan is not shown until asked');
  await s.click('names-open');
  const plan = await s.panel();
  // our role names, each with what it was; the second ink keeps the project's own name
  assert.match(plan, /2 of your colour names can take Plumber’s role names/, plan);
  assert.match(plan, /ground was bg/, plan);
  assert.match(plan, /surface-active was surface-pressed/, plan);
  assert.match(plan, /draw/, 'the second ink is named as kept');
  assert.doesNotMatch(plan, /text-primary|background-/, 'no names from outside plumber');
  await s.click('names-go');
  // the write reloads the page; the panel comes back on the colour step, done, with its Undo
  await s.until(/Renamed 2 colour names in \d+ files?\. Every colour looks the same\./, 180000);
  const theme = await readFile(join(s.root, 'src/styles.css'), 'utf8'), page = await readFile(join(s.root, 'src/Dashboard.jsx'), 'utf8');
  assert.match(theme, /--color-ground: var\(--bg\);/); assert.match(theme, /--color-surface-active: var\(--surface-pressed\);/);
  assert.match(theme, /--color-draw: var\(--draw\);/, 'the second ink keeps its name');
  assert.match(page, /bg-ground/); assert.match(page, /active:bg-surface-active/); assert.doesNotMatch(page, /\bbg-bg\b|surface-pressed/);
  assert.deepEqual(await s.painted(ids), before, 'every colour paints as it did');
  await s.click('names-undo');
  for (let i = 0; i < 120 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  await s.until(/Rename my colours…/, 60000);
  assert.deepEqual(s.errors, []);
});

test('a theme named by job paths is read by role: a white written by hand folds onto that theme\'s own surface, and renaming is only offered', { timeout: 300000 }, async (t) => {
  const s = await site(t, PATHS, PATHS_PAGE);
  await s.begin();
  const said = await s.panel();
  assert.match(said, /#ffffff → background-primary-default/, said);
  assert.doesNotMatch(said, /→ accent/, '"primary" in a path name is not the accent');
  assert.match(said, /Rename my colours…/, 'its names can take plumber\'s role names, offered quietly');
  assert.deepEqual(s.errors, []);
});

test('one brand colour builds the whole system: it lands on 500 as chosen, a light brand gets dark words, and dark mode re-points every role', { timeout: 300000 }, async (t) => {
  const s = await site(t, FLAT, FLAT_PAGE);
  const read = (brand) => s.page.evaluate(async (brand) => {
    const { colourSystem } = await import('/__plumb/src/colour-system.js');
    const sys = colourSystem({ accent: brand });
    const style = Object.assign(document.createElement('style'), { textContent: sys.css }); document.head.append(style);
    const box = document.createElement('div'); document.body.append(box);
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgb = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data; return `rgb(${r}, ${g}, ${b})`; };
    const paint = (dark) => { box.className = dark ? 'dark' : ''; box.innerHTML = '<button style="background:var(--color-accent);color:var(--color-on-accent)">Go</button><div style="background:var(--color-surface)">x</div>'; const [b, d] = box.children; const cb = getComputedStyle(b), cd = getComputedStyle(d); return { accent: rgb(cb.backgroundColor), words: rgb(cb.color), surface: rgb(cd.backgroundColor) }; };
    const light = paint(false), dark = paint(true);
    style.remove(); box.remove();
    const chosen = Object.assign(document.createElement('i'), { style: `color:${brand}` }); document.body.append(chosen); const c = rgb(getComputedStyle(chosen).color); chosen.remove();
    return { light, dark, chosen: c, words: sys.accent.onAccent.text, adjusted: sys.accent.adjusted, roles: Object.keys(sys.light) };
  }, brand);
  const toRgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map((n) => Math.round(Number(n)));
  const near = (a, b) => toRgb(a).every((v, i) => Math.abs(v - toRgb(b)[i]) <= 2);
  const yellow = await read('#facc15'), red = await read('#e5484d');
  // our role names, with the fixed state words
  for (const role of ['ground', 'surface', 'surface-hover', 'surface-active', 'surface-2', 'fg', 'muted', 'faint', 'on-accent', 'line', 'line-strong', 'accent', 'accent-hover', 'accent-active', 'accent-soft']) assert.ok(red.roles.includes(role), role);
  // the brand paints as chosen; a light one keeps its colour and takes dark words, a strong one white
  assert.ok(near(yellow.light.accent, yellow.chosen), `${yellow.light.accent} vs ${yellow.chosen}`);
  assert.deepEqual([yellow.words, yellow.adjusted], ['dark', null]);
  assert.ok(toRgb(yellow.light.words).every((v) => v < 90), `dark words on yellow: ${yellow.light.words}`);
  assert.ok(near(red.light.accent, red.chosen) && red.words === 'white' && near(red.light.words, 'rgb(255, 255, 255)'), JSON.stringify(red));
  // dark mode is one block: the same roles paint differently under .dark
  assert.notEqual(red.dark.surface, red.light.surface);
  assert.ok(toRgb(red.dark.surface).every((v) => v < 60), `a dark surface: ${red.dark.surface}`);
  assert.deepEqual(s.errors, []);
});

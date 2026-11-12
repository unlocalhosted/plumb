// "Clean up this page", the colour pass, case by case, as a person meets it: the panel says what changes, Apply writes
// it, and what the pass must leave alone is still in the file afterwards. Each page holds one case and one ordinary
// drift beside it, so Apply always has something to write and the case is checked against a real write.
//   role wins over distance: a #f5f5f5 page ground becomes bg, not the sunken surface it matches exactly; #666666 words
//     become muted; a purple button and a purple gradient card are kept (docs/research/colour-system.md §6.2)
//   a second blue with no colour of yours near it is kept
//   content is left alone: inline-styled swatches and a drawing inside an svg
//   a page already on its tokens offers nothing
//   the site's palette is served over HTTP, every route, with the class at each place
// crafting-ui's theme and classes (src/index.css `@theme inline`, stage-shell.tsx, stickers.tsx). Real Vite, React,
// Tailwind, the real CLI (`plumber census`) and Chromium.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);

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

const PAGES = {
  worked: `export function Worked() {
  return (
    <main id="ground" className="min-h-screen bg-[#f5f5f5] p-8 text-fg">
      <p id="text" className="text-[#666666]">Quiet words</p>
      <button id="button" className="mt-4 bg-[#7c3aed] px-3 py-1 text-on-accent">Upgrade</button>
      <div id="card" className="mt-4 bg-linear-to-b from-[#7c3aed] to-[#4c1d95] p-6"><p className="text-on-accent">Pro plan</p></div>
    </main>
  )
}`,
  blue: `export function Blue() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <p id="draw" className="text-draw">Draw blue</p>
      <p id="second" className="text-[#2F64F0]">The second blue</p>
      <p className="text-fg">Ink</p>
      <p className="text-muted">Muted</p>
      <p id="fourth" className="text-[#55555C]">Fourth grey</p>
    </main>
  )
}`,
  content: `const swatches = ['rgb(31,58,95)', 'rgb(47,100,240)', 'rgb(207,63,117)', 'rgb(43,43,51)']
export function Content() {
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <ul id="swatches" className="flex gap-2">{swatches.map((c) => <li key={c} className="size-8" style={{ background: c }} />)}</ul>
      <svg id="drawing" width="120" height="60"><foreignObject width="120" height="60"><div className="bg-[#ffffff] text-[#55555C] p-2">In a drawing</div></foreignObject></svg>
      <div id="card" className="bg-[#ffffff] p-4"><p className="text-fg">A card</p></div>
    </main>
  )
}`,
  clean: `export function Clean() {
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <div className="grid gap-3 border border-line bg-surface p-4">
        <h2 className="text-fg">Title</h2>
        <p className="text-muted">Body words</p>
        <p className="text-faint">Hint</p>
        <a className="text-draw" href="#x">A link</a>
        <button className="bg-accent px-3 py-1 text-on-accent">Act</button>
      </div>
    </main>
  )
}`,
};
const fn = (name) => PAGES[name].match(/export function (\w+)/)[1];

let s;
const cleanups = [];
before(async () => {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-colour-cases-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), THEME);
  for (const [name, code] of Object.entries(PAGES)) await writeFile(join(root, `src/${name}.jsx`), code);
  await writeFile(join(root, 'src/App.jsx'), `${Object.keys(PAGES).map((n) => `import { ${fn(n)} } from './${n}.jsx'`).join('\n')}
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4 text-fg">${Object.keys(PAGES).map((n) => `<a href="/${n}">${n}</a>`).join('')}</nav>
      ${Object.keys(PAGES).map((n) => `{path === '/${n}' ? <${fn(n)} /> : null}`).join('\n      ')}
    </>
  );
}
`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  cleanups.unshift(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  const routes = JSON.parse(census.stdout).routes.map((r) => r.route);
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  cleanups.unshift(() => browser.close());
  s = { root, url, routes, browser };
});
after(async () => { for (const c of cleanups) await c(); });

// a page at a route, with the clean-up opened on its colour pass
async function colourPass(name) {
  const page = await s.browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(new URL(name, s.url).href);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '').catch(() => '');
  const until = async (re, timeout = 60000) => { for (const end = Date.now() + timeout; Date.now() < end;) { if (re.test(await panel())) return panel(); await page.waitForTimeout(150); } throw new Error(`timeout ${re}: ${await panel()}`); };
  const pass = /This page uses \d+ (different )?colours|colours on this page are already your own/;
  await page.keyboard.press('Alt+B'); await until(/Clean up/);
  await page.keyboard.press('c'); await until(/Apply to this page|already|Next/);
  for (let i = 0; i < 4 && !pass.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500); }
  const said = await until(pass);
  // Apply, and wait for the write to be said (the write reloads the page it changed)
  const apply = async () => {
    await page.keyboard.press('Enter');
    for (let i = 0; i < 4; i++) {
      try { return await until(/now uses? your colours/, 120000); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; }
    }
    throw new Error(`no write was said: ${await panel()}`);
  };
  return { page, errors, said, apply, file: () => readFile(join(s.root, `src/${name}.jsx`), 'utf8') };
}

test('role wins over distance: the page ground becomes bg, not sunken; grey words become muted; the purple button and the gradient card are kept', { timeout: 300000 }, async () => {
  const p = await colourPass('worked');
  assert.match(p.said, /f5f5f5 → bg\b/i, p.said);
  assert.match(p.said, /666666 → muted/i, p.said);
  assert.doesNotMatch(p.said, /→ sunken/, 'the page ground is never the sunken surface');
  assert.doesNotMatch(p.said, /7c3aed|4c1d95/i, 'the purple button and the gradient card are not offered');
  await p.apply();
  const file = await p.file();
  assert.match(file, /id="ground" className="min-h-screen bg-bg /, file);
  assert.match(file, /id="text" className="text-muted"/, file);
  assert.match(file, /id="button" className="mt-4 bg-\[#7c3aed\] /, 'the purple button keeps its colour');
  assert.match(file, /from-\[#7c3aed\] to-\[#4c1d95\]/, 'the gradient card is left as it is');
  assert.deepEqual(p.errors, []);
});

test('a second blue with no colour of yours near it is kept, while the fourth grey beside it moves', { timeout: 300000 }, async () => {
  const p = await colourPass('blue');
  assert.match(p.said, /55555C → muted/i, p.said);
  assert.doesNotMatch(p.said, /2F64F0/i, 'the second blue is not offered');
  await p.apply();
  const file = await p.file();
  assert.match(file, /id="fourth" className="text-muted"/, file);
  assert.match(file, /id="second" className="text-\[#2F64F0\]"/, 'the second blue is kept');
  assert.deepEqual(p.errors, []);
});

test('content is left alone: the swatches drawn by inline style and the words in a drawing keep their colours; the card beside them moves', { timeout: 300000 }, async () => {
  const p = await colourPass('content');
  assert.match(p.said, /#ffffff → surface/i, p.said);
  assert.doesNotMatch(p.said, /55555C|rgb\(/i, 'nothing in the drawing or on a swatch is offered');
  const before = await p.file();
  await p.apply();
  const file = await p.file();
  assert.match(file, /id="card" className="bg-surface p-4"/, file);
  assert.match(file, /<div className="bg-\[#ffffff\] text-\[#55555C\] p-2">In a drawing/, 'the drawing is untouched');
  assert.equal(file.match(/const swatches = .*/)[0], before.match(/const swatches = .*/)[0], 'the swatches are untouched');
  assert.deepEqual(p.errors, []);
});

test('a page already on its tokens says so, and Enter writes nothing', { timeout: 300000 }, async () => {
  const p = await colourPass('clean');
  assert.match(p.said, /The colours on this page are already your own/, p.said);
  const before = await p.file();
  await p.page.keyboard.press('Enter');
  await p.page.waitForTimeout(2000);
  assert.equal(await p.file(), before, 'nothing was written');
  assert.deepEqual(p.errors, []);
});

test('the site palette is served over HTTP from the census: every route, each place with its class', { timeout: 120000 }, async () => {
  const page = await s.browser.newPage();
  await page.goto(new URL('clean', s.url).href);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const palette = await page.evaluate(async () => {
    const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
    const r = await fetch('/__plumb/palette', { headers: token ? { 'x-plumb-token': token } : {} });
    return { status: r.status, body: await r.json() };
  });
  assert.equal(palette.status, 200, JSON.stringify(palette.body));
  const p = palette.body;
  assert.equal(p.routes, s.routes.length, 'every route the census read');
  assert.ok(p.colours.every((c) => ['text', 'bg', 'border'].includes(c.prop) && typeof c.route === 'string'));
  assert.ok(p.colours.some((c) => c.route === '/blue' && c.cls === 'text-[#2F64F0]'), 'the second blue is in the site palette with its class');
  assert.equal(p.colours.some((c) => c.route === '/content' && c.cls === 'text-[#55555C]'), false, 'the drawing is content, not the site\'s');
});

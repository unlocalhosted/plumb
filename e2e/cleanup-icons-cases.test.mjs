// "Clean up this page", the icon pass, case by case, as a person meets it: the panel says what changes, Apply writes
// the class edits, and what the pass must never write is still in the file afterwards (docs/research/icon-system.md;
// a component or mark swap is listed, never written; §9.1: never invent a mark). Pages that test a "left alone" case
// carry one ordinary drift (an icon at 18px among 20px) so Apply always has something real to write.
//   an inline svg drawn at stroke 2 among the family's 1.5 takes the family's stroke, as a class on the svg
//   an icon+label row that rides the top of its line is aligned to the label
//   an icon-only control under 24px gets the padding that makes it 24px
//   emoji are never swapped or removed: not in a nav, not in prose, not a status circle, not one the renderer has a mark for
//   a brand logo and an illustration are left as they are
//   with Lucide as the family, an icon from another library and emoji stay; no import is written
//   a page already on its system offers nothing
//   the site's icons are served over HTTP, every route
// The renderer has the shape of crafting-ui's `Icon` (20 grid, stroke 1.5, square caps, size-5). Real Vite, React,
// Tailwind, the real CLI (`plumber census`) and Chromium.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

const STYLES = `@import "tailwindcss";
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
`;
const ICONS = `export const PATHS = { box: 'M4 4h12v12H4z', bell: 'M5 14V9a5 5 0 0 1 10 0v5l1 1H4z', check: 'M4 10l4 4 8-8', arrow: 'M4 10h12M11 5l5 5-5 5' }
export function Icon({ name, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" className={'block shrink-0 overflow-visible ' + className}>
      <path d={PATHS[name] ?? PATHS.box} />
    </svg>
  )
}
// the shape lucide-react 1.7.0 draws (viewBox 24, stroke 2, round caps and joins, class "lucide lucide-<name>")
export function Lucide({ name, className = 'size-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={'lucide lucide-' + name + ' ' + className}>
      <path d="M4 4h16v16H4z" />
    </svg>
  )
}
// the shape a Heroicons 24 outline icon draws (data-slot="icon", viewBox 24, stroke 1.5)
export function BellIcon({ className = 'size-5' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true" data-slot="icon" className={className}><path d="M5 17V10a7 7 0 0 1 14 0v7l1 1H4z" /></svg>
}
export function Cog8ToothIcon({ className = 'size-5' }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true" data-slot="icon" className={className}><circle cx="12" cy="12" r="4" /></svg>
}
`;
const row = (id, label, cls = 'size-5', name = 'box') => `<a id="${id}" href="#${id}" className="flex items-center gap-2 text-sm"><Icon name="${name}" className="${cls}" />${label}</a>`;
const rows = (prefix, n) => Array.from({ length: n }, (_, i) => row(`${prefix}${i + 1}`, `Item ${i + 1}`)).join('\n        ');
// the ordinary drift beside a "left alone" case: one icon at 18px among 20px
const drift = (prefix) => `${rows(prefix, 5)}\n        ${row(`${prefix}-odd`, 'Odd one', 'size-[18px]', 'arrow')}`;

const PAGES = {
  stroke: `export function Stroke() {
  return (
    <nav className="grid w-60 gap-1 p-4">
        ${rows('k', 9)}
        <a id="k10" href="#k10" className="flex items-center gap-2 text-sm"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" className="size-5 shrink-0"><path d="M4 4h12v12H4z" /></svg>Item 10</a>
    </nav>
  )
}`,
  align: `export function Align() {
  return (
    <nav className="grid w-60 gap-1 p-4">
        ${rows('a', 4)}
        <a id="a5" href="#a5" className="flex items-start gap-2 text-sm leading-6"><Icon name="box" className="size-5" />Item 5</a>
    </nav>
  )
}`,
  target: `export function Target() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${rows('t', 6)}
      </nav>
      <button id="tiny" aria-label="Close" className="mt-4 p-0.5"><Icon name="check" className="size-4" /></button>
    </main>
  )
}`,
  emoji: `export function Emoji() {
  return (
    <main className="p-4">
      <div id="head" className="flex items-center gap-2 text-sm"><Icon name="bell" className="size-5" />Notifications</div>
      <nav className="mt-4 grid w-60 gap-1">
        ${drift('d')}
        <a id="e-home" href="#e1" className="flex items-center gap-2 text-sm"><span>🏠</span> Home</a>
        <a id="e-inbox" href="#e2" className="flex items-center gap-2 text-sm"><span>📥</span> Archive</a>
        <a id="e-search" href="#e4" className="flex items-center gap-2 text-sm">🔍 Search</a>
        <a id="e-bell" href="#e5" className="flex items-center gap-2 text-sm"><span>🔔</span> Alerts</a>
        <a id="e-face" href="#e6" className="flex items-center gap-2 text-sm"><span>😀</span> Feedback</a>
      </nav>
      <p id="prose" className="mt-4 text-sm">We shipped it 🚀 today after a very long week of work on the launch.</p>
      <span id="live" className="mt-2 inline-flex items-center gap-1 text-sm"><span>🟢</span> Live</span>
    </main>
  )
}`,
  art: `const many = Array.from({ length: 16 }, (_, i) => <path key={i} d={'M' + i * 8 + ' 0v100'} />)
export function Art() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${drift('r')}
      </nav>
      <a id="brand" href="/" className="mt-4 flex items-center gap-2 text-sm"><svg aria-label="Acme logo" viewBox="0 0 32 32" className="size-8"><path fill="#e11d48" d="M2 2h14v28H2z" /><path fill="#2563eb" d="M16 2h14v28H16z" /></svg>Acme</a>
      <figure id="drawing" className="mt-4"><svg viewBox="0 0 128 100" width="160" height="125" fill="none" stroke="currentColor">{many}</svg><figcaption className="text-sm">A drawing</figcaption></figure>
    </main>
  )
}`,
  lucide: `export function LucidePage() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${['settings', 'user', 'mail', 'star', 'trash-2', 'plus', 'x'].map((n, i) => `<a id="l${i + 1}" href="#l${i + 1}" className="flex items-center gap-2 text-sm"><Lucide name="${n}" />Item ${i + 1}</a>`).join('\n        ')}
        <a id="l-odd" href="#l8" className="flex items-center gap-2 text-sm"><Lucide name="check" className="size-[18px]" />Odd one</a>
        <a id="l-bell" href="#l9" className="flex items-center gap-2 text-sm"><BellIcon className="size-5" />Alerts</a>
        <a id="l-cog" href="#l10" className="flex items-center gap-2 text-sm"><Cog8ToothIcon className="size-5" />Machine</a>
        <a id="l-home" href="#l11" className="flex items-center gap-2 text-sm"><span>🏠</span> Home</a>
        <a id="l-receipt" href="#l12" className="flex items-center gap-2 text-sm"><span>🧾</span> Receipts</a>
      </nav>
    </main>
  )
}`,
  clean: `export function Clean() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${rows('c', 6)}
      </nav>
      <button aria-label="Done" className="mt-4 p-1"><Icon name="check" className="size-5" /></button>
    </main>
  )
}`,
};
const fn = (name) => PAGES[name].match(/export function (\w+)/)[1];

let s;
const cleanups = [];
before(async () => {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-icons-cases-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), STYLES);
  await writeFile(join(root, 'src/icons.jsx'), ICONS);
  // the project says it uses lucide-react and has it installed: a stand-in for the package's layout
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'icon-fixture', private: true, dependencies: { 'lucide-react': '^1.7.0', '@heroicons/react': '^2.2.0' } }));
  await mkdir(join(root, 'node_modules/lucide-react/dist/esm/icons'), { recursive: true });
  await writeFile(join(root, 'node_modules/lucide-react/package.json'), JSON.stringify({ name: 'lucide-react', version: '1.7.0' }));
  for (const n of ['bell', 'house', 'search', 'inbox', 'settings', 'check', 'x', 'plus', 'menu', 'user', 'mail', 'star', 'trash-2']) await writeFile(join(root, `node_modules/lucide-react/dist/esm/icons/${n}.js`), 'export default null;\n');
  for (const [name, code] of Object.entries(PAGES)) await writeFile(join(root, `src/${name}.jsx`), `import { Icon, Lucide, BellIcon, Cog8ToothIcon } from './icons.jsx'\nvoid Icon, Lucide, BellIcon, Cog8ToothIcon\n${code}`);
  await writeFile(join(root, 'src/App.jsx'), `${Object.keys(PAGES).map((n) => `import { ${fn(n)} } from './${n}.jsx'`).join('\n')}
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4 text-sm">${Object.keys(PAGES).map((n) => `<a href="/${n}">${n}</a>`).join('')}</nav>
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

// a page at a route, with the clean-up opened on its icon pass
async function iconPass(name) {
  const page = await s.browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(new URL(name, s.url).href);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '').catch(() => '');
  const until = async (re, timeout = 60000) => { for (const end = Date.now() + timeout; Date.now() < end;) { if (re.test(await panel())) return panel(); await page.waitForTimeout(150); } throw new Error(`timeout ${re}: ${await panel()}`); };
  const pass = /off your icon system|already follow your icon system/;
  await page.keyboard.press('Alt+B'); await until(/Clean up/);
  await page.keyboard.press('c'); await until(/Apply to this page|already|Next/);
  for (let i = 0; i < 6 && !pass.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1800); }
  const said = await until(pass);
  const apply = async () => {
    await page.keyboard.press('Enter');
    for (let i = 0; i < 4; i++) {
      try { return await until(/now follows? your icon system/, 120000); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; }
    }
    throw new Error(`no write was said: ${await panel()}`);
  };
  return { page, errors, said, apply, file: () => readFile(join(s.root, `src/${name}.jsx`), 'utf8') };
}
const line = (file, id) => file.split('\n').find((l) => l.includes(`id="${id}"`)) ?? '';

test('an inline svg drawn at stroke 2 among the family\'s 1.5 takes the family\'s stroke, written as a class on the svg', { timeout: 300000 }, async () => {
  const p = await iconPass('stroke');
  assert.match(p.said, /1 icon is off your icon system/, p.said);
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'k10'), /<svg [^>]*className="[^"]*\[stroke-width:1\.5\]/, line(file, 'k10'));
  assert.equal(await p.page.evaluate(() => getComputedStyle(document.querySelector('#k10 svg')).strokeWidth), '1.5px', 'the page draws it at 1.5');
  assert.deepEqual(p.errors, []);
});

test('an icon+label row riding the top of its line is aligned to its label', { timeout: 300000 }, async () => {
  const p = await iconPass('align');
  assert.match(p.said, /Off its label/, p.said);
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'a5'), /className="flex items-center gap-2 text-sm leading-6"/, line(file, 'a5'));
  // on the page: the icon's middle sits on the middle of the label's line
  const off = await p.page.evaluate(() => { const a = document.getElementById('a5'), i = a.querySelector('svg').getBoundingClientRect(), r = a.getBoundingClientRect(); return Math.abs((i.top + i.bottom) / 2 - (r.top + r.bottom) / 2); });
  assert.ok(off <= 1, `the icon is ${off}px off the row's middle`);
  assert.deepEqual(p.errors, []);
});

test('an icon-only control under 24px gets the padding that brings it to 24px', { timeout: 300000 }, async () => {
  const p = await iconPass('target');
  assert.match(p.said, /1 icon is off your icon system/, p.said);
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'tiny'), /className="mt-4 p-1"/, line(file, 'tiny'));
  const box = await p.page.evaluate(() => { const r = document.getElementById('tiny').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  assert.deepEqual(box, [24, 24]);
  assert.deepEqual(p.errors, []);
});

test('emoji are never swapped or removed: in a nav, in prose, a status circle, or one the renderer has a mark for; the icon beside them is fixed', { timeout: 300000 }, async () => {
  const p = await iconPass('emoji');
  assert.match(p.said, /emoji stays?: your icons have no mark for/, p.said);
  const before = await p.file();
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'd-odd'), /<Icon name="arrow" className="size-5" \/>/, line(file, 'd-odd'));
  for (const id of ['e-home', 'e-inbox', 'e-search', 'e-bell', 'e-face', 'prose', 'live']) assert.equal(line(file, id), line(before, id), `${id} is as it was`);
  assert.deepEqual(p.errors, []);
});

test('a brand logo and an illustration are left as they are; the icon beside them is fixed', { timeout: 300000 }, async () => {
  const p = await iconPass('art');
  assert.match(p.said, /1 icon is off your icon system/, 'only the odd icon, never the logo or the drawing');
  const before = await p.file();
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'r-odd'), /className="size-5"/, line(file, 'r-odd'));
  assert.equal(line(file, 'brand'), line(before, 'brand'));
  assert.equal(line(file, 'drawing'), line(before, 'drawing'));
  assert.deepEqual(p.errors, []);
});

test('with Lucide as the family, an icon from another library and the emoji stay as they are, and no import is written', { timeout: 300000 }, async () => {
  const p = await iconPass('lucide');
  const before = await p.file();
  await p.apply();
  const file = await p.file();
  assert.match(line(file, 'l-odd'), /<Lucide name="check" className="size-5" \/>/, line(file, 'l-odd'));
  for (const id of ['l-bell', 'l-cog', 'l-home', 'l-receipt']) assert.equal(line(file, id), line(before, id), `${id} is as it was`);
  assert.doesNotMatch(file, /from ['"]lucide-react['"]/, 'no import of a package is written');
  assert.deepEqual(p.errors, []);
});

test('a page already on its icon system says so, and Enter writes nothing', { timeout: 300000 }, async () => {
  const p = await iconPass('clean');
  assert.match(p.said, /The icons on this page already follow your icon system/, p.said);
  const before = await p.file();
  await p.page.keyboard.press('Enter');
  await p.page.waitForTimeout(2000);
  assert.equal(await p.file(), before, 'nothing was written');
  assert.deepEqual(p.errors, []);
});

test('the site\'s icons are served over HTTP from the census: every route, with the installed sets', { timeout: 120000 }, async () => {
  const page = await s.browser.newPage();
  await page.goto(new URL('clean', s.url).href);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const got = await page.evaluate(async () => {
    const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
    const r = await fetch('/__plumb/icons', { headers: token ? { 'x-plumb-token': token } : {} });
    return { status: r.status, body: await r.json() };
  });
  assert.equal(got.status, 200, JSON.stringify(got.body));
  const r = got.body;
  assert.equal(r.routes, s.routes.length, 'every route the census read');
  assert.ok(r.icons.some((x) => x.route === '/emoji' && x.kind === 'emoji' && x.emoji === '🏠'), 'an emoji in a nav is one of the site\'s icons');
  assert.equal(r.icons.some((x) => x.route === '/art' && x.size > 48), false, 'the illustration is not the site\'s');
  const lucide = r.installed.find((x) => x.pkg === 'lucide-react');
  assert.deepEqual({ version: lucide.version, installed: lucide.installed }, { version: '1.7.0', installed: true });
  const hero = r.installed.find((x) => x.pkg === '@heroicons/react');
  assert.equal(hero.installed, false, 'in package.json but not installed');
});

// "Clean up this page", the text pass, as a whole site's pass (docs/briefs/cleanup-proofs.md, file 1). Three proofs the
// text pass's brief (docs/briefs/page-cleanup.md, "Layer 1: type") promises:
//   1 one site, one ladder: /motion/standards and /stickers once proposed different ladders (problem 1); with the
//     ladder project-wide the panel lists the same styles on both routes
//   2 the pass never adds a size: the page has no more distinct text sizes after Apply than before
//   3 one step in the history: Apply is one "Text" step with its law on it, and Undo puts every file back byte for byte
// Fixture: crafting-ui's own standards page (fixtures/crafting-ui-standards) and a second route, /stickers, with the text
// classes of crafting-ui's StickersPage (src/pages/StickersPage.tsx, lines quoted below), under one nav both draw.
// Real Vite, React, Tailwind, the real CLI (`plumber census`) and Chromium, the overlay driven by keys and clicks.
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

// crafting-ui's StickersPage text, class for class (src/pages/StickersPage.tsx: h1 line 38, lede 39, palette button 46,
// style row 52-56, section title 68, note 69, category title 76, sticker name 198); the words are shorter, the sizes are its own
const STICKERS = `export function StickersPage() {
  return (
    <main className="mx-auto max-w-wide px-[clamp(1rem,4vw,2.5rem)] pt-7 pb-16">
      <header className="mt-14 grid max-w-[46rem] gap-4">
        <h1 className="font-read text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-medium tracking-[-0.025em]">Stickers</h1>
        <p className="font-read text-[1.3125rem] leading-[1.45] tracking-[-0.01em] text-fg">Every drawing made for this site, free to use. Pick a palette and a style, then copy a sticker as SVG or download it.</p>
      </header>
      <div className="mt-10 grid gap-4 py-4">
        <div role="radiogroup" aria-label="Palette" className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" role="radio" aria-checked="true" className="press inline-flex items-center gap-2 font-read text-[0.875rem]"><span className="font-semibold text-fg">Flat</span></button>
          <button type="button" role="radio" aria-checked="false" className="press inline-flex items-center gap-2 font-read text-[0.875rem]"><span className="text-muted">Collage</span></button>
        </div>
        <div role="radiogroup" aria-label="Drawing style" className="flex flex-wrap items-baseline gap-x-5 gap-y-2 font-read text-[0.9375rem]">
          <span className="label">Style</span>
          <button type="button" role="radio" aria-checked="true" className="press font-semibold text-fg">Detailed <span className="measure text-[11px] text-faint">12</span></button>
          <button type="button" role="radio" aria-checked="false" className="press text-muted">Simple <span className="measure text-[11px] text-faint">9</span></button>
        </div>
      </div>
      <section className="mt-14">
        <div className="grid max-w-[46rem] gap-2 border-t border-fg pt-5">
          <h2 className="font-read text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.1] font-medium tracking-[-0.02em]">For animation</h2>
          <p className="font-read text-[1.0625rem] leading-[1.55] text-muted">Parts for moving scenes: things that move, the paths they move along, and the thin things that stand in front of them.</p>
        </div>
        <div className="mt-8">
          <h3 className="font-read text-[1.125rem] font-medium">Things that move</h3>
          <ul className="mt-4 grid grid-cols-3 gap-x-6 gap-y-10 py-8">
            <li><span className="font-read text-[0.9375rem] leading-tight font-semibold">Paper plane</span></li>
            <li><span className="font-read text-[0.9375rem] leading-tight font-semibold">Comet</span></li>
            <li><span className="font-read text-[0.9375rem] leading-tight font-semibold">Balloon</span></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
`;
// a header both routes draw, so the crawl from `/` finds both (as crafting-ui's SiteHeader does)
const APP = `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';
import { StickersPage } from './pages/StickersPage.jsx';
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4"><a href="/motion/standards">Standards</a><a href="/stickers">Stickers</a></nav>
      {path === '/motion/standards' ? <MotionStandardsPage /> : path === '/stickers' ? <StickersPage /> : null}
    </>
  );
}
`;

async function site(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/pages/StickersPage.jsx'), STICKERS);
  await writeFile(join(root, 'src/App.jsx'), APP);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  const read = JSON.parse(census.stdout).routes.map((r) => r.route);
  assert.ok(read.includes('/motion/standards') && read.includes('/stickers'), `the census read both routes: ${read}`);
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const errors = [];
  // a person on one route: the overlay ready, Blueprint on, the fixes read, then C: the text pass, ready to apply
  const visit = async (route) => {
    const page = await launched.newPage({ viewport: { width: 1280, height: 860 } });
    page.on('pageerror', (e) => errors.push(`${route}: ${e.message}`));
    await page.goto(new URL(route.slice(1), url).href);
    await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
    const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
    const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
    // the distinct computed font sizes among stamped elements, sorted (read in the page)
    const sizes = () => page.evaluate(() => [...new Set([...document.querySelectorAll('[data-plumb-source]')].map((e) => getComputedStyle(e).fontSize))].sort());
    const begin = async () => { await page.keyboard.press('Alt+B'); await until(/Clean up/); await page.keyboard.press('c'); await until(/Apply to this page/); };
    // the ladder as the panel lists it: its sentence, and each row's name with its numbers
    const ladder = () => page.evaluate(() => {
      const fx = document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx');
      return { head: fx.querySelector('.head').innerText.replace(/\s+/g, ' '), rows: [...fx.querySelectorAll('.ladder li .nm')].map((n) => [n.firstChild.textContent.trim(), n.querySelector('small').textContent.replace(/\s+/g, ' ').trim()]) };
    });
    return { page, panel, until, sizes, begin, ladder };
  };
  return { root, errors, visit };
}

test('one site, one ladder: /motion/standards and /stickers list the same text styles with the same sizes', { timeout: 400000 }, async (t) => {
  const s = await site(t);
  const seen = {};
  for (const route of ['/motion/standards', '/stickers']) {
    const v = await s.visit(route);
    await v.begin();
    seen[route] = await v.ladder();
    await v.page.close();
  }
  const [a, b] = [seen['/motion/standards'], seen['/stickers']];
  const show = JSON.stringify(seen, null, 1);
  if (process.env.SHOW) console.log(show);
  // the failure: each page proposed its own ladder, so the site's sentence and the styles' sizes differed by page
  assert.equal(a.head, b.head, `the panel says the same about the site on both routes\n${show}`);
  const nums = new Map(a.rows);
  const shared = b.rows.filter(([name]) => nums.has(name));
  assert.ok(a.rows.length >= 2 && b.rows.length >= 2, `both routes list styles\n${show}`);
  assert.ok(shared.length >= 2, `the two routes share styles to compare\n${show}`);
  for (const [name, sizes] of shared) assert.equal(sizes, nums.get(name), `${name} is the same size on both routes\n${show}`);
  // a style the two routes both list under one size is never two styles: no size is listed under two names
  const byNums = new Map(); for (const [name, sizes] of [...a.rows, ...b.rows]) { const set = byNums.get(sizes) ?? new Set(); set.add(name); byNums.set(sizes, set); }
  for (const [sizes, names] of byNums) assert.equal(names.size, 1, `${sizes} is one style, not ${[...names]}\n${show}`);
  assert.deepEqual(s.errors, []);
});

test('the pass never adds a size: the page draws no more distinct text sizes after Apply than before', { timeout: 400000 }, async (t) => {
  const s = await site(t);
  const v = await s.visit('/motion/standards');
  const original = await readFile(join(s.root, FILE), 'utf8');
  const before = await v.sizes();
  await v.begin();
  await v.page.keyboard.press('Enter');
  await v.until(/Undo/, 120000);
  // the write lands: the page's own places are swapped, the page reloaded, and the sizes settle
  for (let i = 0; i < 60 && (await readFile(join(s.root, FILE), 'utf8')) === original; i++) await new Promise((r) => setTimeout(r, 500));
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), original, 'the write landed in the page\'s file');
  await v.page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  let after = await v.sizes();
  for (let last = ''; last !== after.join(); ) { last = after.join(); await v.page.waitForTimeout(600); after = await v.sizes(); }
  assert.ok(after.length <= before.length, `distinct sizes before ${before.length} (${before}) → after ${after.length} (${after})`);
  assert.deepEqual(s.errors, []);
});


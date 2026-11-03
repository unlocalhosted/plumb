// The icon pass, layer 1 (docs/briefs/icons-l1.md; docs/research/icon-system.md §3, §4 at scope keep): what the pass reads and proposes,
// and the site's icons from the census.
//   a  one icon at size-[18px] among size-5 peers becomes size-5 (I2), with the class its peers wear
//   b  one inline svg at stroke 2 among 1.5 becomes the family stroke (I1), written as a class on the svg
//   c  an icon+label row off the cap middle by 2px is aligned (I4), the write predicted and then proved by applying it
//   d  emoji in nav labels with no matching mark are listed "no mark yet" and never swapped; one with a mark in the renderer is a swap
//   e  a brand logo and an illustration are refused, with their reasons
//   f  a page already on its system has nothing to do
//   g  a stray gap (I5) and a hit region under 24px (I9)
//   h  Lucide as the family: an emoji with a name in the installed package becomes an import; a name it lacks is listed; a second
//      library's icon maps by name (I6); nothing is swapped into a package that is not installed
//   i  the site's icons are served over HTTP from the census, every route, with the installed sets
// The pages are made of a renderer of their own (the shape of crafting-ui's `Icon`: 20 grid, stroke 1.5, square caps, `size-5`). Real Vite,
// React, Tailwind, the real CLI (`plumber census`), Chromium; the reader is called in the page the way the overlay calls it.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

const STYLES = `@import "tailwindcss";
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
`;

// the renderer: 20 grid, 1.5 stroke, square caps, size-5 by default (crafting-ui src/language/Icon.tsx)
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
const row = (id, name, label, extra = '') => `<a id="${id}" href="#${id}" className="flex items-center gap-2 text-sm${extra}"><Icon name="${name}" className="size-5" />${label}</a>`;
const rows = (n, name = 'box') => Array.from({ length: n }, (_, i) => row(`r${i + 1}`, name, `Item ${i + 1}`)).join('\n        ');

const PAGES = {
  // (a) one of six at 18px
  '/size': `export function Size() {
  return (
    <nav className="grid w-60 gap-1 p-4">
      ${[1, 2, 3].map((i) => row(`s${i}`, 'box', `Item ${i}`)).join('\n      ')}
      <a id="s4" href="#s4" className="flex items-center gap-2 text-sm"><Icon name="arrow" className="size-[18px]" />Item 4</a>
      ${[5, 6].map((i) => row(`s${i}`, 'box', `Item ${i}`)).join('\n      ')}
    </nav>
  )
}`,
  // (b) nine on the renderer's 1.5 and one inline svg at 2
  '/stroke': `export function Stroke() {
  return (
    <nav className="grid w-60 gap-1 p-4">
      ${Array.from({ length: 9 }, (_, i) => row(`k${i + 1}`, 'box', `Item ${i + 1}`)).join('\n      ')}
      <a id="k10" href="#k10" className="flex items-center gap-2 text-sm"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" className="size-5 shrink-0"><path d="M4 4h12v12H4z" /></svg>Item 10</a>
    </nav>
  )
}`,
  // (c) one row with items-start and a tall line: the icon rides the top
  '/align': `export function Align() {
  return (
    <nav className="grid w-60 gap-1 p-4">
      ${[1, 2, 3, 4].map((i) => row(`a${i}`, 'box', `Item ${i}`)).join('\n      ')}
      <a id="a5" href="#a5" className="flex items-start gap-2 text-sm leading-6"><Icon name="box" className="size-5" />Item 5</a>
    </nav>
  )
}`,
  // (d) emoji in a nav, a bell mark in the renderer, a status circle, prose, an unmapped face
  '/emoji': `export function Emoji() {
  return (
    <main className="p-4">
      <div id="head" className="flex items-center gap-2 text-sm"><Icon name="bell" className="size-5" />Notifications</div>
      <nav className="mt-4 grid w-60 gap-1">
        <a id="e-home" href="#e1" className="flex items-center gap-2 text-sm"><span>🏠</span> Home</a>
        <a id="e-inbox" href="#e2" className="flex items-center gap-2 text-sm"><span>📥</span> Archive</a>
        <a id="e-reports" href="#e3" className="flex items-center gap-2 text-sm"><span>📊</span> Reports</a>
        <a id="e-search" href="#e4" className="flex items-center gap-2 text-sm">🔍 Search</a>
        <a id="e-bell" href="#e5" className="flex items-center gap-2 text-sm"><span>🔔</span> Alerts</a>
        <a id="e-face" href="#e6" className="flex items-center gap-2 text-sm"><span>😀</span> Feedback</a>
        <a id="e-only" href="#e7" className="text-sm"><span>🏠</span></a>
      </nav>
      <p id="prose" className="mt-4 text-sm">We shipped it 🚀 today after a very long week of work on the launch.</p>
      <span id="live" className="mt-2 inline-flex items-center gap-1 text-sm"><span>🟢</span> Live</span>
    </main>
  )
}`,
  // (e) the logo and an illustration among eight icons
  '/art': `const many = Array.from({ length: 16 }, (_, i) => <path key={i} d={'M' + i * 8 + ' 0v100'} />)
export function Art() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${rows(8)}
      </nav>
      <a id="brand" href="/" className="mt-4 flex items-center gap-2 text-sm"><svg aria-label="Acme logo" viewBox="0 0 32 32" className="size-8"><path fill="#e11d48" d="M2 2h14v28H2z" /><path fill="#2563eb" d="M16 2h14v28H16z" /></svg>Acme</a>
      <figure id="drawing" className="mt-4"><svg viewBox="0 0 128 100" width="160" height="125" fill="none" stroke="currentColor">{many}</svg><figcaption className="text-sm">A drawing</figcaption></figure>
    </main>
  )
}`,
  // (f) everything on the system: six rows, an icon-only control big enough
  '/clean': `export function Clean() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${rows(6)}
      </nav>
      <button aria-label="Done" className="mt-4 p-1"><Icon name="check" className="size-5" /></button>
    </main>
  )
}`,
  // (g) one gap-4 among five gap-2, and an icon-only control at 20px
  '/gap': `export function Gap() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${[1, 2, 3, 4, 5].map((i) => row(`g${i}`, 'box', `Item ${i}`)).join('\n        ')}
        <a id="g6" href="#g6" className="flex items-center gap-4 text-sm"><Icon name="box" className="size-5" />Item 6</a>
      </nav>
      <button id="tiny" aria-label="Close" className="mt-4 p-0.5"><Icon name="check" className="size-4" /></button>
    </main>
  )
}`,
  // (h) lucide as the family
  '/lucide': `export function LucidePage() {
  return (
    <main className="p-4">
      <nav className="grid w-60 gap-1">
        ${['settings', 'user', 'mail', 'star', 'trash-2', 'plus', 'x', 'check'].map((n, i) => `<a id="l${i + 1}" href="#l${i + 1}" className="flex items-center gap-2 text-sm"><Lucide name="${n}" />Item ${i + 1}</a>`).join('\n        ')}
        <a id="l-bell" href="#l9" className="flex items-center gap-2 text-sm"><BellIcon className="size-5" />Alerts</a>
        <a id="l-cog" href="#l10" className="flex items-center gap-2 text-sm"><Cog8ToothIcon className="size-5" />Machine</a>
        <a id="l-home" href="#l11" className="flex items-center gap-2 text-sm"><span>🏠</span> Home</a>
        <a id="l-receipt" href="#l12" className="flex items-center gap-2 text-sm"><span>🧾</span> Receipts</a>
      </nav>
    </main>
  )
}`,
};
const NEEDS = { '/lucide': ['Lucide', 'BellIcon', 'Cog8ToothIcon'] };

async function site(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.icon-read-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), STYLES);
  await writeFile(join(root, 'src/icons.jsx'), ICONS);
  // the project says it uses lucide-react, and has it installed: a stand-in for the package's layout (dist/esm/icons/<name>.js, version in package.json)
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'icon-fixture', private: true, dependencies: { 'lucide-react': '^1.7.0', '@heroicons/react': '^2.2.0' } }));
  await mkdir(join(root, 'node_modules/lucide-react/dist/esm/icons'), { recursive: true });
  await writeFile(join(root, 'node_modules/lucide-react/package.json'), JSON.stringify({ name: 'lucide-react', version: '1.7.0' }));
  for (const n of ['bell', 'house', 'search', 'inbox', 'settings', 'check', 'x', 'plus', 'menu', 'user', 'mail', 'star', 'trash-2']) await writeFile(join(root, `node_modules/lucide-react/dist/esm/icons/${n}.js`), `export default null;\n`);
  const names = {};
  for (const [route, code] of Object.entries(PAGES)) {
    const file = route.slice(1) + '.jsx', fn = code.match(/export function (\w+)/)[1];
    names[route] = fn;
    await writeFile(join(root, 'src', file), `import { Icon, ${(NEEDS[route] ?? []).join(', ')}${NEEDS[route] ? ', ' : ''}PATHS } from './icons.jsx'\nvoid PATHS\n${code}`);
  }
  await writeFile(join(root, 'src/App.jsx'), `${Object.entries(names).map(([r, fn]) => `import { ${fn} } from './${r.slice(1)}.jsx'`).join('\n')}
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4 text-sm">${Object.keys(names).map((r) => `<a href="${r}">${r.slice(1)}</a>`).join('')}</nav>
      ${Object.entries(names).map(([r, fn]) => `{path === '${r}' ? <${fn} /> : null}`).join('\n      ')}
    </>
  );
}
`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  const routes = JSON.parse(census.stdout).routes.map((r) => r.route);
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const errors = [];
  const open = async (route) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    t.after(() => page.close());
    page.on('pageerror', (e) => errors.push(`${route}: ${e.message}`));
    await page.goto(new URL(route.slice(1), url).href);
    await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
    return page;
  };
  // the icon pass's answer on a route, as the overlay asks it: the site's icons, this page's places, the family, keep's proposal
  const visit = async (route, { site = true } = {}) => {
    const page = await open(route);
    const answer = await page.evaluate(async (siteIcons) => {
      const m = await import('/__plumb/src/icons.js');
      const { request } = await import('/__plumb/src/api.js');
      const site = await request('icons', {});
      const census = siteIcons ? site : { installed: site.installed };
      const places = m.readIcons();
      const family = m.familyOf(places, census);
      const p = m.proposeIcons(places, family, { scope: 'keep' });
      const id = (el) => el.id || el.closest('[id]')?.id || el.localName;
      const flat = (v) => JSON.parse(JSON.stringify(v));
      return {
        places: places.map((x) => ({ id: id(x.el), kind: x.kind, origin: x.origin, name: x.name, via: x.via, size: x.size, stroke: x.stroke, cap: x.cap, join: x.join, style: x.style, gap: x.gap, offset: x.offset, emoji: x.emoji, key: x.key, label: x.label?.text, at: x.at, props: x.props })),
        family: { id: family.id, origin: family.origin, mixed: family.mixed, share: family.share, count: family.count, total: family.total, strokes: family.strokes, sizes: family.sizes, gaps: family.gaps, cap: family.cap, join: family.join, grid: family.grid, renderer: family.renderer, marks: family.marks ? [...family.marks] : null, marksFrom: family.marksFrom, reason: family.reason, pkg: family.pkg },
        moves: p.moves.map((x) => ({ id: id(x.el), rule: x.rule, law: x.law, from: flat(x.from), to: flat(x.to), write: flat(x.write), label: x.label, warn: x.warn })),
        listed: p.kept.listed.map((x) => ({ id: id(x.el), kind: x.kind, rule: x.rule, why: x.why, emoji: x.emoji, key: x.key, warn: x.warn })),
        refused: p.refused.map((x) => ({ id: id(x.el), kind: x.kind, rule: x.rule, category: x.category, why: x.why })),
        kept: { count: p.kept.count, onSystem: p.kept.onSystem, family: p.kept.family }, measure: p.measure, content: p.content,
      };
    }, site);
    return { answer, page };
  };
  const icons = async () => {
    const page = await open('/clean');
    return page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('icons', {}); });
  };
  return { routes, visit, icons, errors, url, root, open };
}

test('icon read: the reading, the keep proposals and the site icons, through the real CLI, Vite, Tailwind and Chromium', { timeout: 900000 }, async (t) => {
  const s = await site(t);
  assert.ok(Object.keys(PAGES).every((r) => s.routes.includes(r)), `every page was read (${s.routes.join(' ')})`);

  await t.test('a one icon at size-[18px] among size-5 becomes size-5, with the class its peers wear', async () => {
    const { answer: a } = await s.visit('/size');
    assert.equal(a.family.id, 'app:Icon', JSON.stringify(a.family));
    assert.equal(a.family.grid, 20);
    assert.equal(a.family.strokes.regular.value, 1.5);
    assert.equal(a.family.cap, 'square');
    assert.equal(a.family.join, 'miter');
    assert.equal(a.family.sizes['14'].px, 20, 'the app\'s icon size for 14px text is 20');
    const m = a.moves.find((x) => x.id === 's4' && x.rule === 'I2');
    assert.ok(m, `I2 on the 18px icon (${JSON.stringify(a.moves)})`);
    assert.equal(m.from.cls, 'size-[18px]');
    assert.equal(m.to.cls, 'size-5');
    assert.equal(m.to.size, 20);
    assert.equal(m.write.cls, 'size-5');
    assert.equal(m.write.from, 'size-[18px]');
    assert.equal(m.law, 'similarity');
    assert.equal(a.moves.length, 1, `nothing else moves (${JSON.stringify(a.moves)} ${JSON.stringify(a.refused)})`);
    assert.deepEqual(a.measure.sizes, [2, 1], 'two sizes become one');
  });

  await t.test('b one inline svg at stroke 2 among 1.5 becomes the family stroke, as a class on the svg', async () => {
    const { answer: a } = await s.visit('/stroke');
    const m = a.moves.find((x) => x.id === 'k10' && x.rule === 'I1');
    assert.ok(m, `I1 on the inline svg (${JSON.stringify(a.moves)})`);
    assert.equal(m.from.stroke, 2);
    assert.equal(m.to.stroke, 1.5);
    assert.equal(m.write.cls, '[stroke-width:1.5]');
    assert.equal(a.places.find((x) => x.id === 'k10').origin, 'inline');
    assert.equal(a.moves.length, 1, JSON.stringify(a.moves));
    assert.deepEqual(a.measure.strokes, [2, 1]);
  });

  await t.test('c an icon+label row off the cap middle is aligned: the write is predicted, then applied, and the icon sits on the cap middle', async () => {
    const { answer: a, page } = await s.visit('/align');
    const odd = a.places.find((x) => x.id === 'a5');
    assert.ok(Math.abs(odd.offset) > 1, `the odd row is off by ${odd.offset}px`);
    for (const id of ['a1', 'a2', 'a3', 'a4']) assert.ok(Math.abs(a.places.find((x) => x.id === id).offset) <= 1, `${id} is on the cap middle (${a.places.find((x) => x.id === id).offset})`);
    const m = a.moves.find((x) => x.id === 'a5');
    assert.ok(m && m.rule === 'I4', JSON.stringify(a.moves));
    assert.equal(m.law, 'aesthetic-usability');
    assert.equal(m.write.cls, 'items-center', JSON.stringify(m.write));
    assert.equal(m.write.on, 'row');
    assert.equal(m.write.from, 'items-start');
    assert.equal(a.moves.length, 1);
    // apply the write on the page and read it again
    const after = await page.evaluate(async () => {
      const m = await import('/__plumb/src/icons.js');
      const row = document.getElementById('a5');
      row.classList.remove('items-start'); row.classList.add('items-center');
      return m.readIcons().find((x) => x.row.id === 'a5').offset;
    });
    assert.ok(Math.abs(after) <= 1, `after the write the icon is ${after}px off the cap middle`);
  });

  await t.test('d emoji with no matching mark are listed "no mark yet" and never swapped; one with a mark in the renderer is a swap', async () => {
    const { answer: a } = await s.visit('/emoji');
    for (const id of ['e-home', 'e-inbox', 'e-reports', 'e-search']) {
      const l = a.listed.find((x) => x.id === id && x.kind === 'emoji');
      assert.ok(l, `${id} is listed (${JSON.stringify(a.listed)})`);
      assert.equal(l.why, 'no mark yet');
      assert.equal(a.moves.some((x) => x.id === id), false, `${id} is not swapped`);
    }
    assert.equal(a.listed.find((x) => x.id === 'e-inbox').key, 'archive', 'the label beside 📥 says archive, so archive is the meaning looked for');
    const bell = a.moves.find((x) => x.id === 'e-bell');
    assert.ok(bell && bell.rule === 'I8', `the bell has a mark (${JSON.stringify(a.moves)})`);
    assert.equal(bell.write.component, 'Icon');
    assert.equal(bell.write.prop.name, 'bell');
    assert.equal(bell.write.cls, 'size-5 shrink-0');
    assert.equal(bell.write.aria, 'aria-hidden');
    assert.equal(bell.write.remove, '🔔');
    assert.equal(bell.law, 'similarity, Jakob, aesthetic-usability');
    assert.equal(a.moves.some((x) => x.write.import), false, 'no import is written: the project has no set to import from on this page');
    const only = a.listed.find((x) => x.id === 'e-only');
    assert.ok(only && /aria-label/.test(only.why), `an emoji alone needs an aria-label (${JSON.stringify(only)})`);
    const dot = a.moves.find((x) => x.id === 'live');
    assert.deepEqual(dot?.to, { dot: 'green' }, 'a status circle becomes a dot, not an icon');
    const face = a.refused.find((x) => x.id === 'e-face');
    assert.ok(face && face.category === 'unmapped', `the face has no table entry (${JSON.stringify(a.refused)})`);
    const prose = a.refused.find((x) => x.id === 'prose');
    assert.ok(prose && prose.category === 'content' && /middle of words/.test(prose.why), JSON.stringify(a.refused));
    assert.deepEqual(a.measure.emoji, [a.places.filter((x) => x.kind === 'emoji').length, a.places.filter((x) => x.kind === 'emoji').length - 2], 'the bell and the dot are the emoji that go');
  });

  await t.test('e a brand logo and an illustration are refused, with their reasons; the icons around them are not', async () => {
    const { answer: a } = await s.visit('/art');
    const logo = a.refused.find((x) => x.id === 'brand');
    assert.ok(logo && logo.category === 'logo', JSON.stringify(a.refused));
    assert.match(logo.why, /logo/);
    const art = a.refused.find((x) => x.id === 'drawing');
    assert.ok(art && art.category === 'illustration', JSON.stringify(a.refused));
    assert.match(art.why, /illustration/);
    assert.equal(a.moves.length, 0, `nothing moves (${JSON.stringify(a.moves)})`);
    assert.equal(a.places.filter((x) => x.kind === 'svg').length, 8, 'only the eight icons are places');
    assert.equal(a.places.some((x) => x.id === 'brand' || x.id === 'drawing'), false);
  });

  await t.test('f a page already on its system has nothing to do', async () => {
    const { answer: a } = await s.visit('/clean');
    assert.equal(a.moves.length, 0, JSON.stringify(a.moves));
    assert.equal(a.listed.length, 0, JSON.stringify(a.listed));
    assert.equal(a.refused.length, 0, JSON.stringify(a.refused));
    assert.equal(a.kept.onSystem, 7, 'six rows and the control');
    assert.deepEqual(a.measure.strokes, [1, 1]);
    assert.deepEqual(a.measure.sizes, [1, 1]);
    assert.deepEqual(a.measure.emoji, [0, 0]);
  });

  await t.test('g a stray gap goes to the app\'s gap, and an icon-only control under 24px gets padding', async () => {
    const { answer: a } = await s.visit('/gap');
    const g = a.moves.find((x) => x.id === 'g6');
    assert.ok(g && g.rule === 'I5', JSON.stringify(a.moves));
    assert.equal(g.from.cls, 'gap-4');
    assert.equal(g.to.cls, 'gap-2');
    assert.equal(g.write.on, 'row');
    assert.equal(g.from.gap, 16);
    assert.equal(g.to.gap, 8);
    const h = a.moves.find((x) => x.rule === 'I9');
    assert.ok(h, JSON.stringify(a.moves));
    assert.equal(h.from.target, 20);
    assert.equal(h.write.cls, 'p-1');
    assert.equal(h.write.from, 'p-0.5');
    assert.equal(h.law, 'Fitts');
  });

  await t.test('h Lucide as the family: a name in the installed package is an import, a name it lacks is listed, a second library maps by name', async () => {
    const { answer: a } = await s.visit('/lucide', { site: false });
    assert.equal(a.family.id, 'lucide', JSON.stringify(a.family));
    assert.equal(a.family.pkg.version, '1.7.0');
    assert.ok(a.family.marks.includes('house') && !a.family.marks.includes('receipt'), 'the marks are the installed package\'s files');
    const home = a.moves.find((x) => x.id === 'l-home');
    assert.ok(home && home.rule === 'I8', JSON.stringify(a.moves));
    assert.deepEqual(home.write.import, { from: 'lucide-react', name: 'House' });
    assert.equal(home.write.aria, 'aria-hidden');
    const receipt = a.listed.find((x) => x.id === 'l-receipt');
    assert.ok(receipt && /lucide-react@1\.7\.0 has no receipt/.test(receipt.why), JSON.stringify(a.listed));
    assert.equal(a.moves.some((x) => x.id === 'l-receipt'), false);
    const bell = a.moves.find((x) => x.id === 'l-bell' && x.rule === 'I6');
    assert.equal(a.moves.filter((x) => x.id === 'l-bell').length, 1, 'an icon being swapped is not also tuned');
    assert.ok(bell && bell.rule === 'I6', `BellIcon is Lucide's Bell (${JSON.stringify(a.moves)})`);
    assert.deepEqual(bell.write.import, { from: 'lucide-react', name: 'Bell' });
    assert.equal(bell.write.replaces, 'BellIcon');
    const cog = a.listed.find((x) => x.id === 'l-cog');
    assert.ok(cog && cog.rule === 'I6', `no mapping for Cog8ToothIcon, so it is listed (${JSON.stringify(a.listed)})`);
  });

  await t.test('i the site\'s icons are served over HTTP from the census, every route, with the installed sets', async () => {
    const r = await s.icons();
    assert.equal(r.routes, s.routes.length);
    assert.ok(r.icons.length > 60, `${r.icons.length} places`);
    assert.ok(r.icons.every((x) => ['svg', 'emoji'].includes(x.kind) && typeof x.route === 'string' && typeof x.size === 'number'));
    assert.ok(r.icons.some((x) => x.route === '/size' && x.kind === 'svg' && x.origin === 'app:Icon' && x.cls === 'size-[18px]'), 'the 18px icon is in the site with its class');
    assert.ok(r.icons.some((x) => x.route === '/emoji' && x.kind === 'emoji' && x.emoji === '🏠' && x.key === 'house'));
    assert.equal(r.icons.some((x) => x.route === '/art' && x.size > 48), false, 'the illustration is not the site\'s');
    const lucide = r.installed.find((p) => p.pkg === 'lucide-react');
    assert.deepEqual({ version: lucide.version, installed: lucide.installed, has: lucide.marks.includes('house') }, { version: '1.7.0', installed: true, has: true });
    const hero = r.installed.find((p) => p.pkg === '@heroicons/react');
    assert.deepEqual({ installed: hero.installed, marks: hero.marks }, { installed: false, marks: null }, 'in package.json but not in node_modules, and its names unknown');
  });

  assert.deepEqual(s.errors, [], 'no page error');
});

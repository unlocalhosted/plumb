// The colour pass, layer 1 (docs/briefs/colour-l1.md; the keep rows of docs/briefs/pass-colour.md "E2E tests"):
// what the pass reads and proposes at scope keep, and the site's palette from the census.
//   1 an arbitrary white folds into the surface token (the colour on screen does not change)
//   2 a fourth grey folds into the nearest of the three, and the words keep their contrast
//   3 the second blue is kept: no colour of yours is near it
//   4 content is left alone: svg and inline-styled swatches are not proposed and not in the measure
//   5 a gradient on a surface is refused, not moved
//   6 a page already on tokens has nothing to do
//   7 the site's palette is served over HTTP from the census
// The theme is crafting-ui's own (src/index.css:19-80: `@theme inline`, so no `--color-*` variable exists on the page),
// the pages are made of crafting-ui's classes (bg-[#ffffff], bg-[#F0F0F0], text-[#55555C], text-[#2F64F0] from
// src/motion/examples/stage-shell.tsx and src/motion/stickers.tsx). Real Vite, React, Tailwind, the real CLI
// (`plumber census`), Chromium; the reader is called in the page the way the overlay calls it.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

const lines = (n, cls, label) => Array.from({ length: n }, (_, i) => `<p key="${label}${i}" className="${cls}">${label} ${i + 1}</p>`).join('\n        ');
const PAGES = {
  // stage-shell.tsx:153: bg-[#F4F4F6] (made #F0F0F0 here: a little off the sunken surface, past the measure's 0.01) beside the app's own sunken surface; white written by hand beside bg-surface
  '/fold': `export function Fold() {
  return (
    <main className="min-h-screen p-8 text-fg">
      <section className="grid gap-4">
        <div id="plain" className="bg-surface p-4"><p className="text-fg">Plain surface</p></div>
        <div id="white" className="bg-[#ffffff] p-4"><p className="text-fg">Written white</p></div>
        <div id="sunk" className="bg-sunken p-4"><p className="text-fg">Sunken</p></div>
        <div id="f4" className="bg-[#F0F0F0] p-4"><p className="text-fg">Off-white grey</p></div>
      </section>
    </main>
  )
}`,
  // stage-shell.tsx:163 text-[#55555C] among fg, muted and faint: four greys, 24 lines
  '/grey': `export function Grey() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <section id="lines" className="grid gap-1 text-[14px]">
        ${lines(10, 'text-fg', 'Ink')}
        ${lines(6, 'text-muted', 'Muted')}
        ${lines(5, 'text-faint', 'Faint')}
        <p id="fourth" className="text-[#55555C]">Fourth grey</p>
        <p id="fifth" className="text-[#6F6F78]">Fifth grey</p>
      </section>
    </main>
  )
}`,
  // stickers.tsx:14 ink '#2F64F0' beside text-draw
  '/blue': `export function Blue() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <p id="draw" className="text-draw">Draw blue</p>
      <p id="second" className="text-[#2F64F0]">The second blue</p>
      <p className="text-fg">Ink</p>
    </main>
  )
}`,
  // src/stickers/palette.ts:13 rgb(31,58,95): swatches drawn by inline style, and a drawing in an svg
  '/content': `const swatches = ['rgb(31,58,95)', 'rgb(47,100,240)', 'rgb(207,63,117)', 'rgb(43,43,51)']
export function Content() {
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <ul id="swatches" className="flex gap-2">{swatches.map((c) => <li key={c} className="size-8" style={{ background: c }} />)}</ul>
      <svg id="drawing" width="120" height="60"><foreignObject width="120" height="60"><div className="bg-[#ffffff] text-[#55555C] p-2">In a drawing</div></foreignObject></svg>
      <div id="card" className="bg-surface p-4"><p className="text-fg">A card</p></div>
    </main>
  )
}`,
  // the video's purple gradient on a panel
  '/gradient': `export function Gradient() {
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <div id="panel" className="bg-linear-to-b from-[#7c3aed] to-[#4c1d95] p-8"><p className="text-on-accent">Upgrade</p></div>
      <div id="card" className="bg-surface p-4"><p className="text-fg">A card</p></div>
    </main>
  )
}`,
  // everything on tokens
  '/clean': `export function Clean() {
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

async function site(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.colour-read-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), THEME);
  const names = {};
  for (const [route, code] of Object.entries(PAGES)) {
    const file = route.slice(1) + '.jsx', fn = code.match(/export function (\w+)/)[1];
    names[route] = fn;
    await writeFile(join(root, 'src', file), code);
  }
  await writeFile(join(root, 'src/App.jsx'), `${Object.entries(names).map(([r, fn]) => `import { ${fn} } from './${r.slice(1)}.jsx'`).join('\n')}
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4 text-fg">${Object.keys(names).map((r) => `<a href="${r}">${r.slice(1)}</a>`).join('')}</nav>
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
  // the colour pass's answer on a route, as the overlay asks it: read the places, propose at keep
  const visit = async (route) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    t.after(() => page.close());
    page.on('pageerror', (e) => errors.push(`${route}: ${e.message}`));
    await page.goto(new URL(route.slice(1), url).href);
    await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
    const answer = await page.evaluate(async () => {
      const m = await import('/__plumb/src/colours.js');
      const palette = await m.loadPalette();
      const places = m.readColours();
      const p = m.proposeColours(places, palette, { scope: 'keep' });
      const id = (el) => el.id || el.closest('[id]')?.id || el.localName;
      // a colour as painted: through a canvas pixel, so oklch and #hex compare as what is seen
      const pixel = (c) => { const x = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
      return {
        tokens: palette.map((t) => `${t.short}:${t.role}`),
        moves: p.moves.map((x) => ({ prop: x.prop, id: id(x.el), from: x.from, to: x.to, de: x.de, rule: x.rule,
          shown: pixel(getComputedStyle(x.el)[{ text: 'color', bg: 'backgroundColor', border: 'borderTopColor' }[x.prop]]), becomes: pixel(x.to.css) })),
        refused: p.refused.map((x) => ({ prop: x.prop, id: id(x.el), why: x.why, css: x.css })),
        kept: p.kept, content: p.content, measure: p.measure,
      };
    });
    return answer;
  };
  const palette = async () => {
    const page = await browser.newPage();
    t.after(() => page.close());
    await page.goto(new URL('clean', url).href);
    await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
    return page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return request('palette', {}); });
  };
  return { routes, visit, palette, errors, url, root };
}

test('colour read: the reading, the keep proposals and the site palette, through the real CLI, Vite, Tailwind and Chromium', { timeout: 600000 }, async (t) => {
  const s = await site(t);
  assert.ok(Object.keys(PAGES).every((r) => s.routes.includes(r)), `every page was read (${s.routes.join(' ')})`);

  await t.test('1 an arbitrary white folds into the surface token, and what is shown does not change', async () => {
    const a = await s.visit('/fold');
    assert.ok(a.tokens.includes('surface:surface') && a.tokens.includes('sunken:surface') && a.tokens.includes('muted:text'), `the theme's tokens are found without a variable per token on the page (${a.tokens.join(' ')})`);
    const white = a.moves.find((m) => m.id === 'white' && m.prop === 'bg');
    assert.ok(white, `bg-[#ffffff] has a move (${JSON.stringify(a.moves)})`);
    assert.equal(white.from.cls, 'bg-[#ffffff]');
    assert.equal(white.to.cls, 'bg-surface');
    assert.equal(white.rule, 'arbitrary-fold');
    assert.ok(white.de < 0.001, `white to white is ΔE ${white.de}`);
    assert.deepEqual(white.shown, white.becomes, 'the token paints the colour the place shows now');
    const grey = a.moves.find((m) => m.id === 'f4');
    assert.equal(grey?.to.cls, 'bg-sunken', 'bg-[#F0F0F0] is the sunken surface, a little off');
    assert.ok(grey.de > 0 && grey.de <= 0.03, `ΔE ${grey?.de}`);
    assert.equal(a.moves.some((m) => m.id === 'plain' || m.id === 'sunk'), false, 'the places already on a token are not moved');
    assert.equal(a.measure.bg[1], a.measure.bg[0] - 1, `the off-white and the sunken surface become one colour (${a.measure.bg})`);
    assert.ok(a.kept.onToken >= 4, 'places on tokens are counted as kept');
  });

  await t.test('2 a fourth grey folds into the nearest of the three, and its contrast stays above the floor', async () => {
    const a = await s.visit('/grey');
    const fourth = a.moves.find((m) => m.id === 'fourth');
    assert.ok(fourth, `text-[#55555C] has a move (${JSON.stringify(a.moves)} refused ${JSON.stringify(a.refused)} hues ${JSON.stringify(a.kept.hues)})`);
    assert.equal(fourth.from.cls, 'text-[#55555C]');
    assert.equal(fourth.to.cls, 'text-muted');
    assert.equal(fourth.rule, 'grey-levels');
    const lc = (x) => {
      const y = ([r, g, b]) => { const l = (c) => Math.pow(c / 255, 2.4); const v = 0.2126729 * l(r) + 0.7151522 * l(g) + 0.072175 * l(b); return v < 0.022 ? v + Math.pow(0.022 - v, 1.414) : v; };
      const yb = y([251.7, 251.7, 251.7]), yt = y(x), c = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
      return Math.abs((c - 0.027) * 100);
    };
    // the token painted over the page (muted is black at 62%): the page is oklch(98.7%) = 252
    const over = fourth.becomes.slice(0, 3).map((v, i) => v * fourth.becomes[3] / 255 + 252 * (1 - fourth.becomes[3] / 255));
    assert.ok(lc(over) >= 60, `Lc ${Math.round(lc(over))} is above the small-text floor of 60`);
    assert.equal(a.moves.filter((m) => ['text-fg', 'text-muted', 'text-faint'].includes(m.from.cls)).length, 0, 'the three greys are not moved');
    assert.ok(a.measure.text[1] < a.measure.text[0], `fewer text colours after (${a.measure.text})`);
  });

  await t.test('3 the second blue is kept, and the page says no colour of yours is near it', async () => {
    const a = await s.visit('/blue');
    assert.equal(a.moves.length, 0, `nothing moves (${JSON.stringify(a.moves)})`);
    const blue = a.kept.hues.find((h) => h.cls === 'text-[#2F64F0]');
    assert.ok(blue, `it is listed (${JSON.stringify(a.kept.hues)})`);
    assert.equal(blue.why, 'no colour of yours is near it');
    assert.equal(blue.nearest.token, 'draw', 'the nearest of yours is the draw blue');
    assert.ok(blue.nearest.de > 0.03, `ΔE ${blue.nearest.de} is beyond keep's 0.03`);
    assert.deepEqual(a.measure.text, [3, 3], 'the measure does not move');
  });

  await t.test('4 content is left alone: a drawing and inline-styled swatches are not proposed or measured', async () => {
    const a = await s.visit('/content');
    assert.equal(a.moves.filter((m) => m.id !== 'card').length, 0, `no move inside the drawing or on a swatch (${JSON.stringify(a.moves)})`);
    assert.ok(a.content >= 1, `the drawing's colours are counted as content (${a.content})`);
    const inline = a.refused.filter((r) => r.why === 'set by an inline style' && r.prop === 'bg');
    assert.equal(inline.length, 4, `each swatch is listed as inline, not written (${JSON.stringify(a.refused)})`);
    assert.deepEqual(a.measure.bg, [2, 2], 'only the page and the card are in the measure');
  });

  await t.test('5 a gradient on a surface is refused, not moved', async () => {
    const a = await s.visit('/gradient');
    const g = a.refused.find((r) => r.id === 'panel' && r.prop === 'bg');
    assert.ok(g, `the panel is refused (${JSON.stringify(a.refused)})`);
    assert.equal(g.why, 'a gradient');
    assert.equal(a.moves.some((m) => m.id === 'panel' && m.prop === 'bg'), false, 'and not moved');
  });

  await t.test('6 a page already on tokens has nothing to do', async () => {
    const a = await s.visit('/clean');
    assert.equal(a.moves.length, 0);
    assert.equal(a.kept.hues.length, 0);
    assert.equal(a.refused.length, 0, JSON.stringify(a.refused));
    assert.ok(a.kept.onToken >= 8, `places on tokens: ${a.kept.onToken}`);
    assert.deepEqual(a.measure.text.map((n) => n), [a.measure.text[0], a.measure.text[0]]);
  });

  await t.test('7 the site palette is served over HTTP from the census, every route, with the class at each place', async () => {
    const p = await s.palette();
    assert.equal(p.routes, s.routes.length, 'routes read');
    assert.ok(p.colours.length > 40, `${p.colours.length} places`);
    assert.ok(p.colours.every((c) => ['text', 'bg', 'border'].includes(c.prop) && c.oklab.length === 3 && typeof c.route === 'string'));
    assert.ok(p.colours.some((c) => c.route === '/blue' && c.cls === 'text-[#2F64F0]'), 'the second blue is in the site palette with its class');
    assert.ok(p.colours.some((c) => c.route === '/fold' && c.cls === 'bg-[#F0F0F0]'));
    assert.equal(p.colours.some((c) => c.route === '/content' && c.cls === 'bg-[#ffffff]'), false, 'the drawing is content, not the site\'s');
    const distinct = (prop) => { const seen = []; for (const c of p.colours) if (c.prop === prop && !seen.some((s) => Math.hypot(s[0] - c.oklab[0], s[1] - c.oklab[1], s[2] - c.oklab[2]) <= 0.01)) seen.push(c.oklab); return seen.length; };
    assert.ok(distinct('text') >= 4, `distinct text colours on the site: ${distinct('text')}`);
  });

  assert.deepEqual(s.errors, [], 'no page error');
});

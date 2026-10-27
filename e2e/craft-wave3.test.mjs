// The craft engine's third wave (docs/craft/rules.md #9 #10 #13 #14 #15 #16 #18 #20 #23 #24 #26 #27 #34 #35 #36 #42 #45
// #46 #55 #70 #73 #76), each rule against an element that breaks it beside one that follows it, as a person sees it: a
// mark on the one, nothing on the other. One page, one browser, real Vite, real React 19, real Chromium, the demo's theme.
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
const WHITE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=';

async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close());
    return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}
async function fixture(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.craft3-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), app);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
async function open(t, launched, url, dpr = 1) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 2200 }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.bpp .meta').filter({ hasText: /on this page|Everything matches your system|not checked/ }).waitFor({ timeout: 20000 });
  return { page, errors, overlay };
}
// the craft marks of one rule, as boxes on the page
const marksOf = async (page, rule) => {
  await page.waitForTimeout(400);
  return page.evaluate((rule) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')]
    .filter((h) => h.dataset.id.includes(`:craft/${rule}`) || (h.dataset.also ?? '').split(' ').includes(`craft/${rule}`)).map((h) => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: h.getAttribute('aria-label') }; }), rule);
};
const within = (page, id, m, slack = 16) => page.evaluate(([id, m, slack]) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(), right = Math.max(r.right, r.left + el.scrollWidth); return m.x >= r.left - slack && m.x <= right + slack && m.y >= r.top - slack && m.y <= r.bottom + slack; }, [id, m, slack]);

const PAGE = `
const LONG = 'Reading text that runs the full width of a wide column makes the eye travel a long way back to find the start of the next line, and readers lose their place; a measure of forty-five to seventy-five characters keeps the return sweep short and the reading easy, which is why books and good sites hold it. Reading text that runs the full width of a wide column makes the eye travel a long way back to find the start of the next line, and readers lose their place; a measure of forty-five to seventy-five characters keeps the return sweep short and the reading easy, which is why books and good sites hold it.';
const PATH = 'src/components/forms/inputs/TextField.tsx';
const ICON = <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
const rows = (id, odd) => (
  <ul id={odd ? undefined : id} className="flex flex-col gap-s2">
    {[0, 1, 2, 3].map((i) => <li key={i} className="flex items-center gap-s2 text-body"><img id={odd && i === 2 ? id : undefined} src="${WHITE}" alt="" className={odd && i === 2 ? 'size-9' : 'size-8'} />Name {i}</li>)}
  </ul>
);
const table = (good) => (
  <table><tbody>{['1,204.50', '87.10', '12.00'].map((n, i) => <tr key={n}><td id={i === 0 ? (good ? 'tabular-nums-good' : 'tabular-nums-bad') : undefined} className={good ? 'tabular-nums' : ''}>{n}</td></tr>)}</tbody></table>
);

export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 pb-s6">
      <header className="sticky top-0 h-12 w-full bg-surface" />
      <div className="grid grid-cols-2 gap-s6">
        <div><button id="button-padding-bad" className="rounded-control bg-surface p-s2 text-body">Save</button></div>
        <div><button id="button-padding-good" className="rounded-control bg-surface px-s4 py-s2 text-body">Save</button></div>
        <div><button id="icon-side-bad" className="flex items-center gap-s2 rounded-control bg-surface px-s4 py-s2 text-body">{ICON}Add</button></div>
        <div><button id="icon-side-good" className="flex items-center gap-s2 rounded-control bg-surface pl-s3 pr-s4 py-s2 text-body">{ICON}Add</button></div>
        <div><h2 id="leading-bad" className="text-[40px] leading-[1.6]">Big</h2></div>
        <div><h2 id="leading-good" className="text-[40px] leading-tight">Big</h2></div>
        <div><span id="tracking-bad" className="text-[11px] uppercase">Status</span></div>
        <div><span id="tracking-good" className="text-[11px] uppercase tracking-wider">Status</span></div>
        <div>{table(false)}</div>
        <div>{table(true)}</div>
        <div><h3 id="heading-widow-bad" className="w-[9ch] font-mono text-[20px]">aaaa bbbb cccc</h3></div>
        <div><h3 id="heading-widow-good" className="w-[9ch] font-mono text-[20px] text-balance">aaaa bbbb cccc</h3></div>
        <div><div id="one-light-bad" className="h-12 w-32 bg-surface shadow-[0_-4px_8px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="one-light-good" className="h-12 w-32 bg-surface shadow-[0_4px_8px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="border-on-shadow-bad" className="h-12 w-32 border border-rule bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="border-on-shadow-good" className="h-12 w-32 border border-black/10 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]" /></div>
        <div><span id="contrast-bad" className="text-[12px] text-[#b8bcc2]">faint words</span></div>
        <div><span id="contrast-good" className="text-[12px] text-ink">clear words</span></div>
        <div><button id="disabled-contrast-bad" disabled className="rounded-control bg-accent px-s4 py-s2 text-body text-surface opacity-40">Pay</button></div>
        <div><button id="disabled-contrast-good" disabled className="rounded-control bg-ground px-s4 py-s2 text-body text-ink-muted">Pay</button></div>
        <div><button id="hit-target-bad" aria-label="Close" className="size-4 bg-surface" /></div>
        <div><button id="hit-target-good" aria-label="Close" className="size-6 bg-surface" /></div>
        <div>{rows('media-size-bad', true)}</div>
        <div>{rows('media-size-good', false)}</div>
        <div><p id="truncate-intent-bad" className="w-40 truncate text-body">A sentence far too long for its box</p></div>
        <div><p id="truncate-intent-good" title="A sentence far too long for its box" className="w-40 truncate text-body">A sentence far too long for its box</p></div>
        <div><div id="scrollbar-gutter-bad" className="h-[220px] w-[300px] overflow-y-auto bg-surface"><div className="h-[400px]" /></div></div>
        <div><div id="scrollbar-gutter-good" className="h-[220px] w-[300px] overflow-y-auto bg-surface [scrollbar-gutter:stable]"><div className="h-[400px]" /></div></div>
        <div><span id="bold-hover-bad" className="hover:font-bold">Docs</span></div>
        <div><span id="bold-hover-good" className="hover:text-accent">Docs</span></div>
        <div><blockquote><p id="hanging-quote-bad">“Make it work, then make it right.”</p></blockquote></div>
        <div><blockquote><p id="hanging-quote-good" style={{ textIndent: '-0.45em' }}>“Make it work, then make it right.”</p></blockquote></div>
        <div><span id="caps-case-bad" className="uppercase">sign-in (beta)</span></div>
        <div><span id="caps-case-good" className="uppercase [font-feature-settings:'case']">sign-in (beta)</span></div>
        <div><div id="gradient-space-bad" className="h-12 w-48" style={{ backgroundImage: 'linear-gradient(to right, rgb(255, 0, 0), rgb(0, 0, 255))' }} /></div>
        <div><div id="gradient-space-good" className="h-12 w-48" style={{ backgroundImage: 'linear-gradient(in oklch to right, rgb(255, 0, 0), rgb(0, 0, 255))' }} /></div>
        <div><input id="input-zoom-bad" className="h-8 bg-surface text-sm" /></div>
        <div><input id="input-zoom-good" className="h-8 bg-surface text-base" /></div>
        <nav className="flex gap-s3 text-small"><a href="#anchor-offset-bad">Section one</a><a href="#anchor-offset-good">Section two</a></nav><div />
        <div><h4 id="anchor-offset-bad" className="text-body">Section one</h4></div>
        <div><h4 id="anchor-offset-good" className="scroll-mt-12 text-body">Section two</h4></div>
        <div><p id="middle-truncate-bad" className="w-40 truncate text-body">{PATH}</p></div>
        <div><p id="middle-truncate-good" title={PATH} className="w-96 truncate text-body">src/…/TextField.tsx</p></div>
      </div>
      <p id="measure-bad" className="text-body">{LONG}</p>
      <p id="measure-good" className="max-w-prose text-body">{LONG}</p>
    </main>
  );
}
`;

const RULES = ['button-padding', 'icon-side', 'measure', 'leading', 'tracking', 'tabular-nums', 'heading-widow', 'one-light', 'border-on-shadow', 'contrast',
  'disabled-contrast', 'hit-target', 'media-size', 'truncate-intent', 'scrollbar-gutter', 'bold-hover', 'hanging-quote', 'caps-case', 'gradient-space',
  'input-zoom', 'anchor-offset', 'middle-truncate'];

test('Wave three: each rule marks the element that breaks it and leaves the one beside it that follows it', { timeout: 240000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const failed = [];
  for (const rule of RULES) {
    const marks = await marksOf(page, rule);
    const bad = [], good = [];
    for (const m of marks) { if (await within(page, `${rule}-bad`, m, 20)) bad.push(m); if (await within(page, `${rule}-good`, m, 20)) good.push(m); }
    if (!bad.length) failed.push(`${rule}: no mark on the bad one (${marks.length} marks: ${marks.map((m) => `${Math.round(m.x)},${Math.round(m.y)} ${m.label}`).join(' | ')}) bad at ${JSON.stringify(await page.evaluate((id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r && [r.left, r.top, r.right, r.bottom].map(Math.round); }, `${rule}-bad`))}`);
    if (good.length) failed.push(`${rule}: marked the good one: ${good.map((m) => m.label).join(' | ')}`);
  }
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
});

// What a real site taught the rules (the React Plumber site, 2026-10-27): none of these is a finding.
const QUIET = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <style>{'@keyframes reveal { from { opacity: 0 } to { opacity: 1 } }'}</style>
      <span className="inline-flex rounded-full bg-surface p-[6px]"><span id="pill-in-pill" className="rounded-full bg-accent px-s2 text-small text-surface">Pro</span></span>
      <div className="overflow-hidden rounded-card bg-surface"><div id="flush-clipped" className="h-12 bg-ground" /><p className="p-s3 text-body">Card</p></div>
      <section style={{ opacity: 0 }}><p id="unrevealed" className="text-body">Waiting to be revealed</p></section>
      <section style={{ animation: 'reveal 60s linear both' }}><p id="revealing" className="text-body">Being revealed</p></section>
      <div className="rounded-control bg-[#8ba3ff] px-s3 py-s1"><span id="bold-label" className="text-[14px] font-semibold text-[#121314]">Install</span></div>
    </main>
  );
}
`;

test('Quiet on what a real site does: a pill in a pill, a flush child in a clipping corner, text not yet or still being revealed, bold 14px at Lc 56', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, QUIET);
  const { page, errors } = await open(t, launched, url);
  const found = [];
  for (const rule of ['concentric-radius', 'contrast']) for (const m of await marksOf(page, rule)) found.push(`${rule}: ${m.label}`);
  assert.deepEqual(found, []);
  assert.deepEqual(errors, []);
});

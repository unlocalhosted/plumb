// The hard rules' layer 1, font metrics (docs/craft/rules.md #6 #4 #5; docs/briefs/craft-hard-rules.md): each rule
// against an element that breaks it beside one that follows it, as a person sees it. Real Vite, React, Chromium.
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft5-'));
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
const Dot = ({ id }) => <svg id={id} width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s6">
        <div><div id="baseline-align-bad" className="flex items-center gap-s2"><span className="text-[28px]">Total</span><span className="text-[12px]">USD</span></div></div>
        <div id="baseline-align-good" className="flex flex-col gap-s4"><div className="flex items-baseline gap-s2"><span className="text-[28px]">Total</span><span className="text-[12px]">USD</span></div><div className="flex items-center gap-s2"><span className="text-[14px] font-semibold">Integrations</span><span className="rounded-[5px] bg-accent/10 px-[7px] py-[2px] text-[11px]">Beta</span></div></div>
        <div><div id="icon-cap-bad" className="flex items-center gap-s2"><Dot /><span className="pt-[10px] text-[20px]">Title</span></div></div>
        <div><div id="icon-cap-good" className="flex items-center gap-s2"><Dot /><span className="text-[20px] leading-[20px]">Title</span></div></div>
        <div><span id="trim-leading-bad" className="inline-block bg-surface px-s2 py-s2 text-[14px] leading-[32px]">Label</span></div>
        <div><span id="trim-leading-good" className="inline-block bg-surface px-s2 py-s2 text-[14px] leading-none">Label</span></div>
      </div>
    </main>
  );
}
`;

const RULES = ['baseline-align', 'icon-cap', 'trim-leading'];

test('Wave five: each metrics rule marks the element that breaks it and leaves the one beside it that follows it', { timeout: 240000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const failed = [];
  for (const rule of RULES) {
    const marks = await marksOf(page, rule);
    const bad = [], good = [];
    for (const m of marks) { if (await within(page, `${rule}-bad`, m, 20)) bad.push(m); if (await within(page, `${rule}-good`, m, 20)) good.push(m); }
    if (!bad.length) failed.push(`${rule}: no mark on the bad one (${marks.length} marks: ${marks.map((m) => m.label).join(' | ')})`);
    if (good.length) failed.push(`${rule}: marked the good one: ${good.map((m) => m.label).join(' | ')}`);
  }
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
});

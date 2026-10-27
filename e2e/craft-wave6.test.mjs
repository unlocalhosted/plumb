// The hard rules' layer 2, the page's own habits (docs/craft/rules.md #17 #12; docs/briefs/craft-hard-rules.md): an
// element is judged against this page's majority, not a universal number. A page with many words and stacks, one odd
// weight, one odd grey and one off-rhythm stack among them. Real Vite, React, Chromium.
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft6-'));
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
const words = Array.from({ length: 8 }, (_, i) => 'Item ' + i);
const Stack = ({ id, gap }) => <div id={id} className={'flex flex-col ' + gap}>{['a', 'b', 'c'].map((n) => <span key={n} className="text-body text-ink">{n}</span>)}</div>;
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-4 gap-s4">
        {words.map((w) => <p key={'r' + w} className="text-body font-normal text-ink">{w}</p>)}
        {words.map((w) => <p key={'s' + w} className="text-body font-semibold text-ink-muted">{w}</p>)}
        {words.map((w) => <p key={'b' + w} className="text-body font-bold text-[#8a8f98]">{w}</p>)}
        <p id="weight-levels-bad" className="text-body font-light text-ink">Light</p>
        <p id="weight-levels-good" className="text-body font-normal text-ink">Normal</p>
        <p id="grey-levels-bad" className="text-body font-normal text-[#c4c7cc]">Pale</p>
        <p id="grey-levels-good" className="text-body font-normal text-ink">Ink</p>
      </div>
      <div className="grid grid-cols-4 gap-s4">
        <Stack gap="gap-s4" /><Stack gap="gap-s4" /><Stack gap="gap-s4" /><Stack gap="gap-s4" />
        <Stack gap="gap-s2" /><Stack gap="gap-s2" />
        <Stack id="rhythm-bad" gap="gap-[20px]" />
        <Stack id="rhythm-good" gap="gap-s4" />
      </div>
    </main>
  );
}
`;

const RULES = ['weight-levels', 'grey-levels', 'rhythm'];

test('Wave six: an element off the page’s own habits is marked; one on them is not', { timeout: 240000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const failed = [];
  for (const rule of RULES) {
    const marks = await marksOf(page, rule);
    const bad = [], good = [];
    for (const m of marks) { if (await within(page, `${rule}-bad`, m, 6)) bad.push(m); if (await within(page, `${rule}-good`, m, 6)) good.push(m); }
    if (!bad.length) failed.push(`${rule}: no mark on the bad one (${marks.length} marks: ${marks.map((m) => m.label).join(' | ')})`);
    if (good.length) failed.push(`${rule}: marked the good one: ${good.map((m) => m.label).join(' | ')}`);
  }
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
});

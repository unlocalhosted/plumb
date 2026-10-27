// The hard rules' layer 3, ink and the static halves of motion (docs/craft/rules.md #2 #3 #50 #75 #31 #68 #64; docs/briefs/craft-hard-rules.md): each rule
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft7-'));
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
  await page.waitForTimeout(1500); // an icon's ink lands in idle time, then the page is judged again
  return page.evaluate((rule) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')]
    .filter((h) => h.dataset.id.includes(`:craft/${rule}`) || (h.dataset.also ?? '').split(' ').includes(`craft/${rule}`)).map((h) => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: h.getAttribute('aria-label') }; }), rule);
};
const within = (page, id, m, slack = 16) => page.evaluate(([id, m, slack]) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(), right = Math.max(r.right, r.left + el.scrollWidth); return m.x >= r.left - slack && m.x <= right + slack && m.y >= r.top - slack && m.y <= r.bottom + slack; }, [id, m, slack]);

const PAGE = `
const Play = () => <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 1 L14 8 L2 15 Z" /></svg>;
const Square = ({ s = 16 }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x={(16 - s) / 2} y={(16 - s) / 2} width={s} height={s} /></svg>;
const Round = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" /></svg>;
const Line = ({ w = 1.5, size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} aria-hidden="true"><path d="M4 12h16M12 4v16" /></svg>;
const rows = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam', 'Trash', 'Starred', 'Snoozed'];
const tall = Array.from({ length: 12 }, (_, i) => <p key={i} className="text-body">Row {i + 1}</p>);
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s8">
        <div><button id="optical-centre-bad" className="flex size-10 items-center justify-center rounded-control bg-surface"><Play /></button></div>
        <div><button id="optical-centre-good" className="flex size-10 items-center justify-center rounded-control bg-surface"><Square s={14} /></button></div>
        <div id="overshoot-bad" className="flex gap-s2"><Square /><Square /><Round /></div>
        <div id="overshoot-good" className="flex gap-s2"><Square s={15} /><Square s={15} /><Round /></div>
        <ul className="flex flex-col gap-s1">
          {rows.map((r) => <li key={r} className="flex items-center gap-s2 text-body"><Line />{r}</li>)}
          <li id="stroke-weight-bad" className="flex items-center gap-s2 text-body"><Line w={2.5} />Heavy</li>
        </ul>
        <ul className="flex flex-col gap-s1">
          <li id="stroke-weight-good" className="flex items-center gap-s2 text-body"><Line />Even</li>
        </ul>
        <div id="scroll-cue-bad" className="h-24 overflow-y-auto [scrollbar-width:none]">{tall}</div>
        <div id="scroll-cue-good" className="h-24 overflow-y-auto [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">{tall}</div>
        <div className="flex gap-s2">
          <button className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Save</button>
          <button className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Share</button>
          <button id="press-feedback-bad" className="rounded-control bg-surface px-s3 py-s2 text-body">Copy</button>
        </div>
        <div><button id="press-feedback-good" className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Move</button></div>
        <div><div id="exit-faster-bad" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0">Menu</div></div>
        <div><div id="exit-faster-good" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:duration-150">Menu</div></div>
        <div><div id="interruptible-bad" data-state="open" className="rounded-card bg-surface p-s4 text-body data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-150">Popover</div></div>
        <div><div id="interruptible-good" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:duration-150">Popover</div></div>
      </div>
    </main>
  );
}
`;

const RULES = ['optical-centre', 'overshoot', 'stroke-weight', 'scroll-cue', 'press-feedback', 'exit-faster', 'interruptible'];

test('Wave seven: each ink and motion rule marks the element that breaks it and leaves the one beside it that follows it', { timeout: 240000 }, async (t) => {
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

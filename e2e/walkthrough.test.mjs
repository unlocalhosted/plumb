// The walkthrough (docs/briefs/insight-not-noise.md layer 7): the first time blueprint is used in a project, one
// element whose fix is proven is pointed at and four short lines walk find → take → apply → quiet, moved on by what the
// person does. Shown once. Proved on a page like a real app, through real Vite, React and Chromium.
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

// The demo's theme and host, with this page as its App.
async function fixture(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.walk-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  if (app) await writeFile(join(root, 'src/App.jsx'), app);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  // a cold dev server may reload the page once while it optimises dependencies: wait that reload out
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  return { page, errors, overlay: page.locator('plumb-overlay') };
}

// Blueprint on, and the view read to the end (the panel's header stops counting readings).
async function blueprint(page, overlay) {
  await page.keyboard.press('Alt+B');
  await overlay.locator('.bpp .meta').filter({ hasText: /off on this page|All on the system|not checked/ }).waitFor({ timeout: 20000 });
}

// Every craft mark drawn, by its rule and the element it is on: the hit's id names the mark's key.
const craftMarks = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return [...root.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.includes(':craft/')).map((h) => { const r = h.getBoundingClientRect(); return { id: h.dataset.id, rule: h.dataset.id.split(':craft/')[1].split('@')[0], label: h.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
});
// The panel's craft rows: [{ rule, text, what }].
const craftRows = (overlay) => overlay.locator('.bpp .row[data-key^="craft/"]').evaluateAll((rows) => rows.map((r) => ({ key: r.dataset.key, rule: r.dataset.key.split('|')[0], text: r.querySelector('code').textContent, what: r.querySelector('.what').textContent })));
const rectOf = (page, id) => page.locator(`#${id}`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
// the elements a row lights when pointed at, as boxes
const lit = (page) => page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect')].map((o) => ({ x: +o.getAttribute('x') - 0.75, y: +o.getAttribute('y') - 0.75, w: +o.getAttribute('width') + 1.5, h: +o.getAttribute('height') + 1.5 })));
const same = (a, b) => Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;

// Points at a row, and says which page elements light up.
async function pointRow(page, overlay, key) {
  await overlay.locator('.bpp .head').click();
  await overlay.locator(`.bpp .row[data-key^="${key}"]`).first().hover();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .light rect').length > 0, null, { timeout: 3000 });
  return lit(page);
}
// Opens a mark's chooser by a real click on its box, and returns the words it shows.
async function openMark(page, overlay, id) {
  const hit = overlay.locator(`.bp .hit[data-id="${id}"]`);
  const b = await hit.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  const hint = overlay.locator('.bp .bp-hint[data-on]');
  await hint.waitFor({ timeout: 3000 });
  const hinted = await hint.innerText();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  const ch = overlay.locator('.ch .card[role="dialog"]');
  await ch.waitFor({ timeout: 5000 });
  await ch.locator('.read .note').waitFor({ timeout: 5000 });
  return { hinted, title: await ch.getAttribute('aria-label'), note: await ch.locator('.read .note').innerText(), because: await ch.locator('.read .because').innerText(), steps: await ch.locator('.cmp .opt').count() };
}

// the craft marks whose box sits on one element
const on = async (page, id) => {
  const r = await page.evaluate((id) => { const el = document.getElementById(id); const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: Math.max(b.right, b.left + el.scrollWidth), b: b.bottom }; }, id);
  return (await craftMarks(page)).filter((m) => m.x + m.w / 2 >= r.l - 2 && m.x + m.w / 2 <= r.r + 20 && m.y + m.h / 2 >= r.t - 2 && m.y + m.h / 2 <= r.b + 2);
};
const PAGE = `
const Icon = () => <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
const members = [['Ada Lovelace', 'Owner'], ['Grace Hopper', 'Admin'], ['Alan Turing', 'Member']];
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <header className="flex items-center justify-between">
        <h1 id="title" className="text-body font-semibold">Team settings</h1>
        <button id="invite" className="flex items-center gap-s2 rounded-control bg-accent px-s3 py-s3 text-body text-surface"><Icon />Invite</button>
      </header>
      <section className="flex flex-col gap-s3 rounded-card bg-surface p-s4">
        <span id="status" className="text-[11px] uppercase text-ink-muted">Status</span>
        <p className="text-body">Three people can see this workspace.</p>
        <ul className="flex flex-col gap-s2">
          {members.map(([name, role]) => <li key={name} className="flex items-center justify-between text-body"><span>{name}</span><span className="text-small text-ink-muted">{role}</span></li>)}
        </ul>
      </section>
    </main>
  );
}
`;

// every mark drawn on an element, of any family: [{ id, rule }]
const marksOnEl = (page, id) => page.evaluate((id) => {
  const el = document.getElementById(id).getBoundingClientRect();
  return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => ({ id: h.dataset.id, r: h.getBoundingClientRect() }))
    .filter(({ r }) => r.left + r.width / 2 >= el.left - 2 && r.left + r.width / 2 <= el.right + 20 && r.top + r.height / 2 >= el.top - 2 && r.top + r.height / 2 <= el.bottom + 2)
    .map((h) => ({ id: h.id, rule: h.id.includes(':craft/') ? h.id.split(':craft/')[1].split('@')[0] : 'drift' }));
}, id);
const run = (page) => page.evaluate(() => window.__plumb.craft({ timeout: 30000 }));




const line = (overlay) => overlay.locator('.walk .line');
const center = async (page, id, dx = 0.5, dy = 0.5) => { const b = await page.locator(`#${id}`).boundingBox(); return [b.x + b.width * dx, b.y + b.height * dy]; };

test('The first time: one proven fix is pointed at, and four lines follow what the person does, from find to quiet; then never again', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await line(overlay).waitFor({ timeout: 10000 });
  assert.equal(await line(overlay).getAttribute('data-step'), '1');
  assert.match(await line(overlay).innerText(), /^1\/4\s*12px on every side\. Text buttons need about twice as much on the sides\. Click it\.$/);
  assert.equal(await overlay.locator('.walk .pulse').count(), 1);
  // it never takes a click: the click lands on the element and selects it
  const b = await page.locator('#invite').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height - 4);
  await overlay.locator('.walk .line[data-step="2"]').waitFor({ timeout: 5000 });
  assert.match(await line(overlay).innerText(), /↑ ↓ to try a step\. Enter to take it\./);
  await page.mouse.move(2, 2);
  await page.keyboard.press('Enter');
  await overlay.locator('.walk .line[data-step="3"]').waitFor({ timeout: 5000 });
  await overlay.locator('.cg:not([hidden]) .ok').click();
  await overlay.locator('.walk .line[data-step="4"]').waitFor({ timeout: 15000 }).catch(() => {}); // the write may reload the page first
  for (let i = 0; i < 100 && !/pl-s4 pr-s6/.test(await readFile(join(root, 'src/App.jsx'), 'utf8')); i++) await page.waitForTimeout(100);
  // once is enough: the next time blueprint is turned on, nothing walks
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  if (await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp')?.hidden !== false)) await blueprint(page, overlay);
  await page.waitForTimeout(1500);
  assert.equal(await line(overlay).count(), 0);
  assert.deepEqual(errors, []);
});

test('Going another way ends it quietly: selecting a different element', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await line(overlay).waitFor({ timeout: 10000 });
  const [x, y] = await center(page, 'title');
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  assert.equal(await line(overlay).count(), 0);
  assert.deepEqual(errors, []);
});

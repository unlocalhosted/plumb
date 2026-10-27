// The fix in the fix panel (overlay/src/fixpanel.js): a cause is put in hand, ↑ ↓ try a step on the page, Enter takes
// it, A writes the taken causes as one class edit per line, and the element comes back quiet. (The ghost, the ringed
// stair, the Changes sidebar and dragging a band through the scale are gone.) Proved on a page like a real app,
// through real Vite, React, Chromium.
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
  const root = await mkdtemp(join(repo, 'fixtures/.inplace-'));
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
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 }); // the fix panel: every element read
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
const lit = (page) => page.evaluate(() => [...new Set([...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone[data-stage="lit"], .bp .heat .zone[data-stage="pointed"]')].map((z) => z.dataset.box))].map((b) => { const [x, y, w, h] = b.split(',').map(Number); return { x, y, w, h }; }));
const same = (a, b) => Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;

// Points at a row, and says which page elements light up.
async function pointRow(page, overlay, key) {
  await overlay.locator('.bpp .head').click();
  await overlay.locator(`.bpp .row[data-key^="${key}"]`).first().hover();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone[data-stage="lit"], .bp .heat .zone[data-stage="pointed"]').length > 0, null, { timeout: 3000 });
  return lit(page);
}
// Opens a mark's chooser by a real click on its box, and returns the words it shows.
async function openMark(page, overlay, id) {
  const hit = overlay.locator(`.bp .hit[data-id="${id}"]`);
  const b = await (async (h) => { const [x, y] = (await h.getAttribute('data-at')).split(',').map(Number); return { x: x - 0.5, y: y - 0.5, width: 1, height: 1 }; })(hit); // where the zone is aimed at (its first piece), not its bounding box
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



const panel = (overlay) => overlay.locator('.fx');
const inHand = (overlay) => overlay.locator('.fx .cause .cls');
const center = async (page, id, dx = 0.5, dy = 0.5) => { const b = await page.locator(`#${id}`).boundingBox(); return [b.x + b.width * dx, b.y + b.height * dy]; };
// a click the way a person makes it: the pointer arrives first (the nearest glow takes it), then presses
const click = async (page, x, y) => { await page.mouse.move(x, y); await page.waitForTimeout(250); await page.mouse.click(x, y); };
// the glow of a line (its zone's own point) clicked: the cause it belongs to is in hand
const glow = async (page, overlay, text) => {
  const [x, y] = (await overlay.locator(`.bp .hit[aria-label*="${text}"]`).first().getAttribute('data-at')).split(',').map(Number);
  await click(page, x, y);
};
const padding = (page, id, side) => page.locator(`#${id}`).evaluate((el, side) => getComputedStyle(el)[`padding${side}`], side);
const badge = (overlay) => panel(overlay).locator('.apply .badge');
const taken = async (overlay) => Number(await badge(overlay).innerText().catch(() => '0'));
// walk the causes with → until `cls` is in hand and its exact edit is read, then Enter takes it
async function take(page, overlay, cls) {
  const before = await taken(overlay);
  for (let i = 0; i < 12; i++) {
    if (await inHand(overlay).first().innerText().catch(() => null) === cls) {
      await panel(overlay).locator('.take:not([disabled])').waitFor({ timeout: 10000 });
      await page.keyboard.press('Enter');
      await badge(overlay).filter({ hasText: String(before + 1) }).waitFor({ timeout: 5000 }).catch(async () => { throw new Error(`taking ${cls} did not count it: ${(await panel(overlay).innerText()).replace(/\s+/g, ' ')}`); });
      return;
    }
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
  }
  throw new Error(`${cls} was not reached`);
}
// the blueprint comes back after a write reloads the page; marks drawn on one element
async function reopen(page, overlay) {
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  try { await blueprint(page, overlay); } catch { await page.keyboard.press('Escape'); await page.waitForTimeout(500); await blueprint(page, overlay); }
  await page.waitForTimeout(600);
}
const marksOn = (page, id) => page.evaluate((id) => {
  const el = document.getElementById(id).getBoundingClientRect();
  return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => ({ id: h.dataset.id, r: h.getBoundingClientRect() }))
    .filter(({ r }) => r.left + r.width / 2 >= el.left - 2 && r.left + r.width / 2 <= el.right + 20 && r.top + r.height / 2 >= el.top - 2 && r.top + r.height / 2 <= el.bottom + 2).map((h) => h.id);
}, id);

test('The fix is tried on the page from the panel: the cause in hand shows the theme’s steps with the suggestion picked and tried; ↑ ↓ move the page to another step', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  await glow(page, overlay, '12px on every side');
  await inHand(overlay).filter({ hasText: /^px-s3$/ }).waitFor({ timeout: 10000 });
  await panel(overlay).locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  // the suggestion is picked and already on the page: s4 on the left, s6 on the right
  assert.equal(await panel(overlay).locator('.sp[aria-pressed="true"] .tk').innerText(), 's6');
  await page.waitForFunction(() => { const c = getComputedStyle(document.getElementById('invite')); return c.paddingLeft === '16px' && c.paddingRight === '24px'; }, null, { timeout: 5000 });
  assert.equal(await padding(page, 'invite', 'Top'), '12px', 'only the sides move');
  // ↓ tries the next step down: the page previews it
  await page.keyboard.press('ArrowDown');
  await panel(overlay).locator('.sp[aria-pressed="true"] .tk').filter({ hasText: /^s4$/ }).waitFor({ timeout: 5000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('invite')).paddingRight === '16px', null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

test('Enter takes the fix; A writes it as one class edit; after the reload the button is quiet in every family', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  await glow(page, overlay, '12px on every side');
  await inHand(overlay).filter({ hasText: /^px-s3$/ }).waitFor({ timeout: 10000 });
  await take(page, overlay, 'px-s3');
  await page.keyboard.press('a');
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="invite"'));
  for (let i = 0; i < 100 && !/pl-s4 pr-s6/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="flex items-center gap-s2 rounded-control bg-accent pl-s4 pr-s6 py-s3 text-body text-surface"/);
  await reopen(page, overlay);
  assert.deepEqual(await marksOn(page, 'invite'), [], 'quiet');
  assert.deepEqual(errors, []);
});

test('Two problems in two families on one label: each taken with Enter, one A writes both, and the label is quiet', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  // a theme with a letter-spacing step, so both fixes are on the theme
  await writeFile(join(root, 'src/styles.css'), (await readFile(join(root, 'src/styles.css'), 'utf8')).replace('@theme {', '@theme {\n  --tracking-wide: 0.05em;'));
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await click(page, x, y);
  await inHand(overlay).waitFor({ timeout: 10000 });
  // the label's two causes: its capitals take the theme's tracking-wide, its size takes a type step
  await take(page, overlay, 'letter-spacing');
  await take(page, overlay, 'text-[11px]');
  assert.equal(await taken(overlay), 2);
  await page.keyboard.press('a');
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="status"'));
  for (let i = 0; i < 100 && /text-\[11px\]/.test(await line()); i++) await page.waitForTimeout(100);
  const written = /className="([^"]+)"/.exec(await line())[1].split(' ').sort();
  assert.deepEqual(written, ['text-ink-muted', 'text-small', 'tracking-wide', 'uppercase']);
  await reopen(page, overlay);
  const marks = await marksOn(page, 'status');
  assert.deepEqual(marks, [], `quiet: ${JSON.stringify(marks)}`);
  assert.deepEqual(errors, []);
});

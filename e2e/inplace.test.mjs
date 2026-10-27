// The fix in place (docs/briefs/insight-not-noise.md layer 2 and 3): a selected element's verified fix is drawn on it
// (a ghost, the scale with the target ringed, the reason) and taken there: arrows preview a step, Enter makes it the
// element's change in the Changes sidebar, Apply writes it as one class edit, and the element comes back quiet.
// A band can be dragged through the scale too. Proved on a page like a real app, through real Vite, React, Chromium.
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
  await overlay.locator('.bpp .meta').filter({ hasText: /on this page|Everything matches your system|not checked/ }).waitFor({ timeout: 20000 });
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



const sel = (overlay) => overlay.locator('.sel');
const center = async (page, id, dx = 0.5, dy = 0.5) => { const b = await page.locator(`#${id}`).boundingBox(); return [b.x + b.width * dx, b.y + b.height * dy]; };
const drawn = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return { ring: !!root.querySelector('.sel .ring'), tag: root.querySelector('.sel .pl-tag')?.textContent ?? null, dot: !!root.querySelector('.sel .pl-tag .dot'),
    rail: [...root.querySelectorAll('.sel .pl-tag .rail i')].map((i) => i.classList.contains('on')), off: root.querySelectorAll('.sel .bm > .off').length,
    current: root.querySelectorAll('.sel .bm > .off[data-current]').length, chooser: !!root.querySelector('.ch .card[role="dialog"]:not([hidden])') && !root.querySelector('.ch').hidden };
});


const fixOf = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return { ghost: !!root.querySelector('.sel .ghost'), stair: !!root.querySelector('.sel .stair'), reason: !!root.querySelector('.sel .reason'),
    picked: root.querySelector('.sel .stair .opt[data-picked]')?.getAttribute('title') ?? null, state: root.querySelector('.sel')?.dataset.state ?? null,
    changes: root.querySelector('.cg:not([hidden])')?.innerText.replace(/\s+/g, ' ') ?? null };
});
const select = async (page, overlay, id) => {
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, id, 0.5, 0.85);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  await page.mouse.move(5, 5);
};
const padding = (page, id, side) => page.locator(`#${id}`).evaluate((el, side) => getComputedStyle(el)[`padding${side}`], side);

test('The fix is drawn on the selected element: a ghost, the scale with the target ringed, the reason; arrows preview a step', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await select(page, overlay, 'invite');
  let f = await fixOf(page);
  assert.equal(f.ghost && f.stair && f.reason, true, JSON.stringify(f));
  assert.equal(f.picked, "s6");
  assert.equal(await padding(page, 'invite', 'Right'), '12px', 'nothing changes on the page until a step is pointed at');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  f = await fixOf(page);
  assert.equal(f.picked, "s4");
  assert.equal(await padding(page, 'invite', 'Right'), '16px', 'the page previews the step');
  assert.deepEqual(errors, []);
});

test('Enter makes the fix the element’s change; Apply writes it as one class edit; after the reload the button is quiet in every family', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await select(page, overlay, 'invite');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const f = await fixOf(page);
  assert.equal(f.state, 'accepted');
  assert.match(f.changes, /left padding 12 → 16 \(s4\) .*right padding 12 → 24 \(s6\)/);
  assert.match(f.changes, /Apply 2 changes/);
  await overlay.locator('.cg .ok').click();
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="invite"'));
  for (let i = 0; i < 100 && !/pl-s4 pr-s6/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="flex items-center gap-s2 rounded-control bg-accent pl-s4 pr-s6 py-s3 text-body text-surface"/);
  // the write reloads the page by itself; let that land, then read the page again
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  try { await blueprint(page, overlay); } catch { await page.keyboard.press('Escape'); await page.waitForTimeout(500); await blueprint(page, overlay); }
  await page.waitForTimeout(600);
  const marks = await page.evaluate(() => {
    const el = document.getElementById('invite').getBoundingClientRect();
    return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => ({ id: h.dataset.id, r: h.getBoundingClientRect() }))
      .filter(({ r }) => r.left + r.width / 2 >= el.left - 2 && r.left + r.width / 2 <= el.right + 20 && r.top + r.height / 2 >= el.top - 2 && r.top + r.height / 2 <= el.bottom + 2).map((h) => h.id);
  });
  assert.deepEqual(marks, [], 'quiet');
  assert.deepEqual(errors, []);
});

test('Backspace drops the change and the element is back as it was; dragging a band through the scale makes a change too', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await select(page, overlay, 'invite');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.equal(await padding(page, 'invite', 'Right'), '24px');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);
  assert.equal((await fixOf(page)).changes, null);
  assert.equal(await padding(page, 'invite', 'Right'), '12px', 'back as it was');
  // drag the right padding two steps (22px each) to the right: s3 → s4 → s6
  const b = await page.locator('#invite').boundingBox();
  await page.mouse.move(b.x + b.width - 5, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 5 + 23, b.y + b.height / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width - 5 + 46, b.y + b.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  assert.match((await fixOf(page)).changes ?? '', /right padding 12 → 24 \(s6\)/);
  assert.deepEqual(errors, []);
});

test('Two problems in two families on one label: each taken in place with Enter, one Apply writes both, and the label is quiet', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  // a theme with a letter-spacing step, so both fixes are on the theme
  await writeFile(join(root, 'src/styles.css'), (await readFile(join(root, 'src/styles.css'), 'utf8')).replace('@theme {', '@theme {\n  --tracking-wide: 0.05em;'));
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await page.mouse.click(x, y);
  await page.waitForTimeout(400);
  await page.mouse.move(5, 5);
  // the first problem's fix is drawn; Enter takes it and the next one becomes current
  await page.waitForFunction(() => !!document.querySelector('plumb-overlay').shadowRoot.querySelector('.sel .stair'), null, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  // the theme's text sizes for the second: its exact edit is read, then Enter takes it
  await page.waitForFunction(() => !!document.querySelector('plumb-overlay').shadowRoot.querySelector('.sel .stair'), null, { timeout: 5000 })
;
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); if (/2 changes/.test(await overlay.locator('.cg').innerText().catch(() => ''))) break; }
  const sidebar = (await overlay.locator('.cg').innerText()).replace(/\s+/g, ' ');
  assert.match(sidebar, /letter spacing .*→ tracking-wide/, sidebar);
  assert.match(sidebar, /text size .*→ small/, sidebar);
  assert.match(sidebar, /Apply 2 changes/);
  await overlay.locator('.cg .ok').click();
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="status"'));
  for (let i = 0; i < 100 && /text-\[11px\]/.test(await line()); i++) await page.waitForTimeout(100);
  const written = /className="([^"]+)"/.exec(await line())[1].split(' ').sort();
  assert.deepEqual(written, ['text-ink-muted', 'text-small', 'tracking-wide', 'uppercase']);
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  try { await blueprint(page, overlay); } catch { await page.keyboard.press('Escape'); await page.waitForTimeout(500); await blueprint(page, overlay); }
  await page.waitForTimeout(600);
  const marks = await page.evaluate(() => {
    const el = document.getElementById('status').getBoundingClientRect();
    return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => ({ id: h.dataset.id, r: h.getBoundingClientRect() }))
      .filter(({ r }) => r.left + r.width / 2 >= el.left - 2 && r.left + r.width / 2 <= el.right + 20 && r.top + r.height / 2 >= el.top - 2 && r.top + r.height / 2 <= el.bottom + 2).map((h) => h.id);
  });
  assert.deepEqual(marks, [], `quiet: ${JSON.stringify(marks)}`);
  assert.deepEqual(errors, []);
});

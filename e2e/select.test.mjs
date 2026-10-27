// The element is the way to a cause (the fix panel, overlay/src/fixpanel.js): with blueprint on, a click on an element
// that has a problem puts its cause in hand in the fix panel; a quiet element holds nothing. The ring, the name tag, the
// box-model bands and the why line of the old selection are gone. Proved on a page like a real app, through real Vite,
// React and Chromium.
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
  const root = await mkdtemp(join(repo, 'fixtures/.select-'));
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
        <p id="quiet" className="text-body">Three people can see this workspace.</p>
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
const center = async (page, id, dx = 0.5, dy = 0.5) => { const b = await page.locator(`#${id}`).boundingBox(); return [b.x + b.width * dx, b.y + b.height * dy]; };
const padding = (page, id, side) => page.locator(`#${id}`).evaluate((el, side) => getComputedStyle(el)[`padding${side}`], side);
// a click the way a person makes it: the pointer arrives first (the nearest glow takes it), then presses
const click = async (page, x, y) => { await page.mouse.move(x, y); await page.waitForTimeout(250); await page.mouse.click(x, y); };
const inHand = (overlay) => overlay.locator('.fx .cause .cls');
const shown = (page, sel) => page.evaluate((sel) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'), sel);

test('A click on an element with a problem puts a cause of it in hand: the class, its places, the options drawn as specimens with the suggestion tried on the page; no card, nothing else drawn', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  assert.equal(await inHand(overlay).count(), 0, 'at rest nothing is in hand');
  // a click on the button holds a cause the button is a place of (the biggest one it is in)
  const [x, y] = await center(page, 'invite', 0.5, 0.85);
  await click(page, x, y);
  await inHand(overlay).waitFor({ timeout: 10000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /\d+ places?$/);
  for (const sel of ['.sel', '.cg', '.bpp', '.ch:not([hidden]) .card[role="dialog"]']) assert.equal(await shown(page, sel), false, `${sel} is not shown`);
  // the glow on the button's own padding holds the padding cause: its options are specimens, the suggestion is tried
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line .count').waitFor({ timeout: 5000 });
  const at = await overlay.locator('.bp .hit[aria-label*="12px on every side"]').getAttribute('data-at');
  const [gx, gy] = at.split(',').map(Number);
  await click(page, gx, gy);
  await inHand(overlay).filter({ hasText: /^px-s3$/ }).waitFor({ timeout: 10000 });
  await panel(overlay).locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /^Sides too tight · 1 place$/);
  // the theme's steps are the options, each with its token; the suggestion (wider on the sides) is the pick
  assert.deepEqual(await panel(overlay).locator('.sp .tk').allInnerTexts(), ['s1', 's2', 's3', 's4', 's6']);
  const picked = await panel(overlay).locator('.sp[aria-pressed="true"] .v').innerText();
  assert.equal(picked, '24px');
  // the pick is tried on the page: s4 on the left, s6 on the right; the top and bottom stay
  await page.waitForFunction(() => { const c = getComputedStyle(document.getElementById('invite')); return c.paddingLeft === '16px' && c.paddingRight === '24px'; }, null, { timeout: 5000 });
  assert.equal(await padding(page, 'invite', 'Top'), '12px', 'only the sides move');
  assert.equal(await shown(page, '.ch:not([hidden]) .card[role="dialog"]'), false, 'no card opens');
  assert.deepEqual(errors, []);
});

test('An element with two problems is in two causes: a click holds one of them, → and ← walk to the other and back', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  // the status label has two problems: its size is off the type scale, its capitals are set tight
  const forStatus = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => h.getAttribute('aria-label')));
  assert.ok(forStatus.some((l) => /text-\[11px\]/.test(l)), JSON.stringify(forStatus));
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await click(page, x, y);
  await inHand(overlay).waitFor({ timeout: 10000 });
  const first = await inHand(overlay).innerText();
  // walk every cause with →: each is reached once, and the label's size and its capitals are both among them
  const place = async () => (await panel(overlay).locator('.cause .nav').innerText()).match(/(\d+) of (\d+)/).slice(1).map(Number);
  const [from, total] = await place();
  const seen = [first];
  for (let i = 1; i < total; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((k) => /(\d+) of \d+/.exec(document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .cause .nav')?.textContent ?? '')?.[1] === String(k), ((from - 1 + i) % total) + 1, { timeout: 5000 });
    seen.push(await inHand(overlay).innerText());
  }
  assert.equal(new Set(seen).size, total, `every cause is reached once: ${seen}`);
  assert.ok(seen.some((c) => /text-\[11px\]/.test(c)) && seen.some((c) => /letter-spacing/.test(c)), `the label\u2019s size and its capitals are both causes: ${seen}`);
  // ←: back to the cause before
  await page.keyboard.press('ArrowLeft');
  await inHand(overlay).filter({ hasText: seen.at(-2) }).waitFor({ timeout: 5000 });
  assert.deepEqual(errors, []);
});

test('The cause in hand stays the cause in hand while the reader looks at the page again: its name, its options and the count of causes do not move under it', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await inHand(overlay).waitFor({ timeout: 10000 });
  const state = () => overlay.locator('.fx').evaluate((e) => ({ cls: e.querySelector('.cls')?.textContent, nav: e.querySelector('.nav')?.textContent.replace(/[^\d of]/g, '').trim(), what: e.querySelector('.what')?.textContent }));
  const first = await state();
  // the page is read again while the fix is tried on it (a tried place stops being a problem): the cause must hold still
  await page.waitForTimeout(2500);
  assert.deepEqual(await state(), first, 'the cause in hand changed under the person while its fix was tried');
  // and walking on, each cause shows its own options: a size has type steps, a padding has spacing steps, capitals a new token
  const own = { 'text-[11px]': ['now', 'small', 'body'], 'px-s3': ['s1', 's2', 's3', 's4', 's6'], 'letter-spacing': ['new token'] };
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(1200);
    const now = await state();
    const tokens = await overlay.locator('.fx .sp .tk').allInnerTexts();
    seen.add(now.cls);
    if (own[now.cls]) assert.deepEqual(tokens, own[now.cls], `the options belong to ${now.cls}: ${JSON.stringify({ now, tokens })}`);
    await page.keyboard.press('ArrowRight');
  }
  assert.ok(seen.size >= 4, `walking → reaches the causes one by one: ${[...seen]}`);
  assert.deepEqual(errors, []);
});

test('A quiet element holds nothing; Esc puts a cause down before it leaves blueprint', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [hx, hy] = await center(page, 'quiet', 0.3);
  await click(page, hx, hy);
  await page.waitForTimeout(400);
  assert.equal(await inHand(overlay).count(), 0, 'a quiet element puts nothing in hand');
  // a cause in hand; Esc puts it down, blueprint stays; the next Esc leaves blueprint
  const [ix, iy] = await center(page, 'invite', 0.5, 0.85);
  await click(page, ix, iy);
  await inHand(overlay).waitFor({ timeout: 10000 });
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line .count').waitFor({ timeout: 5000 });
  assert.equal(await inHand(overlay).count(), 0, 'Esc puts the cause down');
  assert.equal(await page.evaluate(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp').hidden), true, 'blueprint is still on');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp').hidden, null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

test('A click on the empty page lets go of the cause in hand', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [ix, iy] = await center(page, 'invite', 0.5, 0.85);
  await click(page, ix, iy);
  await inHand(overlay).waitFor({ timeout: 10000 });
  const { width } = page.viewportSize();
  const [ex, ey] = [width - 30, 40];
  const under = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).filter((e) => !e.closest('plumb-overlay')).map((e) => e.localName + (e.id ? '#' + e.id : '')).join(' > '), [ex, ey]);
  await click(page, ex, ey);
  await page.waitForTimeout(500);
  assert.equal(await inHand(overlay).count(), 0, `a click on the empty page (under it: ${under}) lets go of the cause; the fix panel still holds it while the page shows the original`);
  assert.deepEqual(errors, []);
});

test('No step the theme has: the cause is a new token; the panel says what taking it adds, and the engine carries the token that fills it', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  // the suggestion is a token the theme can add (docs/briefs/craft-spec.md §4 c)
  const suggestion = () => page.evaluate(() => { const i = window.__plumb.overlay.blueprintReader.items.find((x) => x.el.id === 'status'); return i.marks.find((m) => m.rule === 'craft/tracking')?.craft.suggest; });
  await page.waitForFunction(() => window.__plumb.overlay.blueprintReader.items.find((x) => x.el.id === 'status')?.marks.find((m) => m.rule === 'craft/tracking')?.craft.suggest?.kind === 'token', null, { timeout: 10000 }).catch(() => {});
  const suggest = await suggestion();
  assert.equal(suggest.kind, 'token');
  assert.deepEqual([suggest.name, suggest.value, suggest.then.to], ['--tracking-caps', '0.06em', 'tracking-caps']);
  // walk the causes to the one with no step: a note, one new-token specimen, nothing else to pick
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await click(page, x, y);
  await inHand(overlay).waitFor({ timeout: 10000 });
  for (let i = 0; i < 12 && !(await panel(overlay).locator('.note').count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); }
  const note = await panel(overlay).locator('.note').innerText();
  assert.match(note, /--tracking-caps: 0\.06em/);
  assert.match(note, /tracking-caps/);
  assert.equal(await panel(overlay).locator('.sp').count(), 1);
  assert.match(await panel(overlay).locator('.sp .tk').innerText(), /new token/);
  // Enter takes it: the panel counts one change ready to apply; nothing is written until A
  await page.keyboard.press('Enter');
  for (let i = 0; i < 30 && !(await panel(overlay).locator('.apply .badge').filter({ hasText: /^[1-9]/ }).count()); i++) { await page.waitForTimeout(150); if (await panel(overlay).locator('.take').count()) await page.keyboard.press('Enter'); }
  await panel(overlay).locator('.apply .badge').filter({ hasText: /^[1-9]/ }).waitFor({ timeout: 5000 });
  assert.deepEqual(errors, []);
});

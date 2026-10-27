// The element is the target (docs/briefs/insight-not-noise.md layer 1): with blueprint on, a click anywhere on an
// element selects it and draws it: a ring, its name, its box model with the bands its problems claim in coral, one pill
// for the band pointed at. No card opens. Proved on a page like a real app, through real Vite, React and Chromium.
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



const sel = (overlay) => overlay.locator('.sel');
const center = async (page, id, dx = 0.5, dy = 0.5) => { const b = await page.locator(`#${id}`).boundingBox(); return [b.x + b.width * dx, b.y + b.height * dy]; };
const drawn = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return { ring: !!root.querySelector('.sel .ring'), tag: root.querySelector('.sel .pl-tag')?.textContent ?? null, dot: !!root.querySelector('.sel .pl-tag .dot'),
    rail: [...root.querySelectorAll('.sel .pl-tag .rail i')].map((i) => i.classList.contains('on')), off: root.querySelectorAll('.sel .bm > .off').length,
    current: root.querySelectorAll('.sel .bm > .off[data-current]').length, chooser: !!root.querySelector('.ch .card[role="dialog"]:not([hidden])') && !root.querySelector('.ch').hidden };
});

test('A click anywhere on an element selects it: ring, name, its claimed bands coral, one pill for the band pointed at; no card', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'invite', 0.5, 0.85);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  const d = await drawn(page);
  assert.equal(d.ring, true);
  assert.match(d.tag, /button/);
  assert.equal(d.dot, true, 'tied to a line of the code');
  assert.ok(d.off >= 2, `the side paddings are claimed: ${JSON.stringify(d)}`);
  assert.equal(d.chooser, false, 'no card opens');
  // its label steps aside: the selection draws it now
  const labels = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .lbl')].map((l) => l.textContent));
  assert.ok(!labels.includes('px-s3'), JSON.stringify(labels));
  // pointing at the right padding: one pill, the property, the number, the token
  const b = await page.locator('#invite').boundingBox();
  await page.mouse.move(b.x + b.width - 4, b.y + b.height / 2);
  await overlay.locator('.bm-at').waitFor({ timeout: 3000 });
  assert.equal(await overlay.locator('.bm-at').innerText(), 'right padding 12 (s3)');
  assert.equal(await overlay.locator('.bm-at').count(), 1);
  assert.deepEqual(errors, []);
});

test('An element with two problems shows both: a dot each in its name, the current one filled; . steps to the next', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  assert.deepEqual((await drawn(page)).rail, [true, false]);
  await page.keyboard.press('.');
  await page.waitForTimeout(200);
  assert.deepEqual((await drawn(page)).rail, [false, true]);
  // a second click on it steps too
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
  assert.deepEqual((await drawn(page)).rail, [true, false]);
  assert.deepEqual(errors, []);
});

test('A quiet element selects with nothing coral; a click on the empty page lets go; Esc lets go before it leaves blueprint', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [hx, hy] = await center(page, 'title');
  await page.mouse.click(hx, hy);
  await page.waitForTimeout(300);
  let d = await drawn(page);
  assert.equal(d.ring, true);
  assert.equal(d.off, 0, `nothing claimed on a quiet element: ${JSON.stringify(d)}`);
  // the empty page, far from everything
  const { width, height } = page.viewportSize();
  const [ex, ey] = [width - 30, height - 120];
  const under = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).filter((e) => !e.closest('plumb-overlay')).map((e) => e.localName + (e.id ? '#' + e.id : '')).join(' > '), [ex, ey]);
  await page.mouse.click(ex, ey);
  await page.waitForTimeout(200);
  assert.equal((await drawn(page)).ring, false, `under the click: ${under}`);
  // Esc: first the selection, then blueprint
  await page.mouse.click(hx, hy);
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert.equal((await drawn(page)).ring, false);
  assert.equal(await page.evaluate(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.bp').hidden), true, 'blueprint is still on');
  assert.deepEqual(errors, []);
});

test('Why, as a drawing and on demand: the reason sits at the element’s side; i shows the one line, then what is folded under it, then hides', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'invite', 0.5, 0.85);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  const why = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.sel .why')?.textContent ?? null);
  assert.equal(await overlay.locator('.sel .reason').count(), 1);
  assert.equal(await why(), null, 'no words at rest');
  await page.keyboard.press('i');
  assert.match(await why(), /^12px on every side\. Text buttons need about twice as much on the sides\. · also 1$/);
  assert.ok((await why()).length <= 90);
  await page.keyboard.press('i');
  assert.match(await why(), /The icon side has the same/);
  await page.keyboard.press('i');
  assert.equal(await why(), null);
  assert.deepEqual(errors, []);
});

test('No fix the theme can take: the scale shows a hollow bar where the step would be, and i says what to add', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const [x, y] = await center(page, 'status', 0.3, 0.5);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
  // step to the letter-spacing problem: this theme has no letter-spacing steps
  for (let i = 0; i < 3 && !(await overlay.locator('.sel .stair[data-kind="no-step"]').count()); i++) { await page.keyboard.press('.'); await page.waitForTimeout(200); }
  assert.equal(await overlay.locator('.sel .stair[data-kind="no-step"] .gap').count(), 1);
  await page.keyboard.press('i');
  assert.match(await overlay.locator('.sel .why').innerText(), /Your theme has no letter-spacing step for this\. Add one, then use it here\./);
  // Enter takes nothing
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.equal(await overlay.locator('.cg:not([hidden])').count(), 0);
  assert.deepEqual(errors, []);
});

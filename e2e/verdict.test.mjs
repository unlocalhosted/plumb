// One element, one verdict (docs/briefs/insight-not-noise.md layer 0), on a page like a real app's, not a page of
// bad/good pairs: every fix offered lands on the theme's own steps, an element with two problems carries both, and a
// fix applied leaves its element quiet after the reload, in every family. Real Vite, React, Chromium, the demo theme.
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
  const root = await mkdtemp(join(repo, 'fixtures/.verdict-'));
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
        <h1 className="text-body font-semibold">Team settings</h1>
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


test('Every fix offered lands on the theme: no numeric or arbitrary spacing step is ever suggested where the theme names its steps', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const { findings } = await run(page);
  const offered = findings.filter((f) => f.suggest?.kind === 'class').flatMap((f) => f.suggest.to.split(/\s+/));
  assert.ok(offered.length, 'something is offered');
  const off = offered.filter((c) => /^-?(?:[pm][xytrblse]?|gap(?:-[xy])?|scroll-mt|size|w|h|rounded(?:-[trblse]{1,2})?)-(?:\d|\[)/.test(c));
  assert.deepEqual(off, [], JSON.stringify(findings.map((f) => [f.rule, f.suggest])));
  assert.deepEqual(errors, []);
});

test('The STATUS label carries both of its problems: its size is off the type scale, and its capitals are set tight', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const status = await marksOnEl(page, 'status');
  const rules = status.map((m) => m.rule);
  assert.ok(rules.includes('tracking'), JSON.stringify(status));
  assert.ok(status.some((m) => !m.id.includes(':craft/')), `the drift mark on its size stays: ${JSON.stringify(status)}`);
  assert.deepEqual(errors, []);
});

test('The icon button: one fix on the theme’s steps (pl-s4 pr-s6, never pl-5); applied, the button is quiet in every family', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  const invite = await on(page, 'invite');
  const pad = invite.filter((m) => m.rule === 'button-padding');
  assert.equal(pad.length, 1, JSON.stringify(invite));
  const words = await openMark(page, overlay, pad[0].id);
  assert.match(words.note, /Change px-s3 to pl-s4 pr-s6/);
  const ch = overlay.locator('.ch .card[role="dialog"]');
  await ch.locator('.cmp .opt', { hasText: 'pl-s4 pr-s6' }).click();
  await overlay.locator('.dock .write').click();
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="invite"'));
  for (let i = 0; i < 100 && !/pl-s4 pr-s6/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /rounded-control bg-accent pl-s4 pr-s6 py-s3/);
  await page.reload();
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await blueprint(page, overlay);
  await page.waitForTimeout(600);
  // quiet: no mark of any family is drawn on it
  const after = await page.evaluate(() => {
    const el = document.getElementById('invite').getBoundingClientRect();
    return [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].map((h) => ({ id: h.dataset.id, r: h.getBoundingClientRect() }))
      .filter(({ r }) => r.left + r.width / 2 >= el.left - 2 && r.left + r.width / 2 <= el.right + 20 && r.top + r.height / 2 >= el.top - 2 && r.top + r.height / 2 <= el.bottom + 2).map((h) => h.id);
  });
  assert.deepEqual(after, []);
  assert.deepEqual(errors, []);
});

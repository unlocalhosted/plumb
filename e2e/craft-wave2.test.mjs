// The craft engine's second wave (docs/craft/rules.md #1, #38, #39, #51, #63, #74), each rule against an element that
// breaks it beside one that follows it, as a person sees it: a mark on the one, nothing on the other. Real Vite, real
// React 19, real Chromium, the demo's theme.
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft2-'));
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
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1400 }, deviceScaleFactor: dpr });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.bpp .meta').filter({ hasText: /off on this page|All on the system|not checked/ }).waitFor({ timeout: 20000 });
  return { page, errors, overlay };
}
// the craft marks of one rule, as boxes on the page
const marksOf = async (page, rule) => {
  await page.waitForTimeout(400);
  return page.evaluate((rule) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')]
    .filter((h) => h.dataset.id.includes(`:craft/${rule}`) || (h.dataset.also ?? '').split(' ').includes(`craft/${rule}`)).map((h) => { const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: h.getAttribute('aria-label') }; }), rule);
};
const within = async (page, id, m, slack = 16) => page.locator(`#${id}`).evaluate((el, [m, slack]) => { const r = el.getBoundingClientRect(); return m.x >= r.left - slack && m.x <= r.right + slack && m.y >= r.top - slack && m.y <= r.bottom + slack; }, [m, slack]);

const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <style>{'@keyframes pop-zero { from { transform: scale(0) } to { transform: scale(1) } } @keyframes pop-near { from { transform: scale(0.95) } to { transform: scale(1) } }'}</style>
      <ul id="list-bad" className="flex flex-col">
        <li className="py-s1 text-small">Inbox</li>
        <li id="row-bad" className="rounded-control bg-surface px-s3 py-s1 text-small">Board</li>
        <li className="py-s1 text-small">Issues</li>
        <li className="py-s1 text-small">Automations</li>
      </ul>
      <ul id="list-good" className="flex flex-col">
        <li className="py-s1 text-small">Inbox</li>
        <li id="row-good" className="-mx-s3 rounded-control bg-surface px-s3 py-s1 text-small">Board</li>
        <li className="py-s1 text-small">Issues</li>
        <li className="py-s1 text-small">Automations</li>
      </ul>
      <div className="flex gap-s4">
        <img id="img-bad" src="${WHITE}" width="64" height="64" alt="" />
        <img id="img-good" src="${WHITE}" width="64" height="64" alt="" className="outline outline-1 -outline-offset-1 outline-black/10" />
      </div>
      <div className="flex gap-s4">
        <div id="shadow-bad" className="h-16 w-32 rounded-card bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.18)]" />
        <div id="shadow-good" className="h-16 w-32 rounded-card bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,0,0,0.06)]" />
      </div>
      <div className="flex gap-s4">
        <div id="pop-bad" className="h-10 w-24 rounded-control bg-surface text-small" style={{ animation: 'pop-zero 1ms both' }}>from zero</div>
        <div id="pop-good" className="h-10 w-24 rounded-control bg-surface text-small" style={{ animation: 'pop-near 1ms both' }}>from 0.95</div>
      </div>
      <div className="relative flex gap-s4">
        <div id="z-bad" className="relative z-[999] h-10 w-24 bg-surface text-small">z 999</div>
        <div id="z-good" className="relative z-10 h-10 w-24 bg-surface text-small">z 10</div>
      </div>
      <div className="flex flex-col gap-s2">
        <div id="rule-bad" className="h-px w-48 bg-ink-muted" />
        <div className="h-4" />
      </div>
    </main>
  );
}
`;

test('Content alignment (#1): a filled row among plain rows whose words fall off the column is marked and told to bleed; the bleeding one is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const marks = await marksOf(page, 'content-align');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.ok(await within(page, 'row-bad', marks[0]), 'on the row that does not bleed');
  assert.match(marks[0].label, /words start 12px in from the others/);
  // its fix is one pick: -mx-s3 is added where it was written, and the words land on the column
  const line = async () => (await readFile(join(root, 'src/App.jsx'), 'utf8')).split('\\n').find((l) => l.includes('id="row-bad"'));
  assert.match(await line(), /className="rounded-control/);
  assert.deepEqual(errors, []);
});

test('Image outline (#39): an image whose edge matches the page is marked; the outlined one is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const marks = await marksOf(page, 'image-outline');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.ok(await within(page, 'img-bad', marks[0]));
  assert.deepEqual(errors, []);
});

test('Layered shadow (#51): one big blur is marked; the layered one is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const marks = await marksOf(page, 'layered-shadow');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.ok(await within(page, 'shadow-bad', marks[0]));
  assert.deepEqual(errors, []);
});

test('Scale from zero (#63): an entrance from scale(0) is marked; one from 0.95 is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const marks = await marksOf(page, 'scale-from-zero');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.ok(await within(page, 'pop-bad', marks[0], 40));
  assert.match(marks[0].label, /pop-zero/);
  assert.deepEqual(errors, []);
});

test('z-index war (#74): a 999 in the flow is marked; a 10 is not', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const { page, errors } = await open(t, launched, url);
  const marks = await marksOf(page, 'z-index-war');
  assert.equal(marks.length, 1, JSON.stringify(marks));
  assert.ok(await within(page, 'z-bad', marks[0]));
  assert.deepEqual(errors, []);
});

test('Hairline (#38): a 1px divider is marked on a 2× screen and not on a 1× screen', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE);
  const one = await open(t, launched, url, 1);
  assert.equal((await marksOf(one.page, 'hairline')).length, 0, 'nothing at 1×');
  const two = await open(t, launched, url, 2);
  const marks = await marksOf(two.page, 'hairline');
  assert.equal(marks.length, 1, `marked at 2×: ${JSON.stringify(marks)}`);
  assert.ok(await within(two.page, 'rule-bad', marks[0]));
  assert.deepEqual([...one.errors, ...two.errors], []);
});


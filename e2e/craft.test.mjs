// The craft engine as a person meets it (docs/briefs/craft-engine.md): blueprint on, and the mentor's rules read on the
// rendered page. For each first-wave rule: the element that breaks it carries a mark and, held in the fix panel, a cause with the right
// suggestion; the element beside it that follows the rule carries nothing; a well-built page yields no craft finding.
// Real Vite with the plugin on a fixture page, real React 19, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { applyFix, cause, engineMark, litNow, openMark, same } from './helpers/fix.mjs';

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
  const root = await mkdtemp(join(repo, 'fixtures/.craft-'));
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
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 }); if (await overlay.locator('.fx .review').count()) { await overlay.page().keyboard.press('Escape'); await overlay.locator('.fx .review').waitFor({ state: 'detached', timeout: 5000 }); } /* the text styles are offered first: put down, the fixes come next */ // the fix panel: every element read
}

// Every craft mark drawn, by its rule and the element it is on: the hit's id names the mark's key.
const craftMarks = (page) => page.evaluate(() => {
  const root = document.querySelector('plumb-overlay').shadowRoot;
  return [...root.querySelectorAll('.bp .hit')].filter((h) => h.dataset.id.includes(':craft/')).map((h) => { const r = h.getBoundingClientRect(); return { id: h.dataset.id, rule: h.dataset.id.split(':craft/')[1].split('@')[0], label: h.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
});
const rectOf = (page, id) => page.locator(`#${id}`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });

// One page per rule: the element that breaks it beside the one that follows it, on the demo's theme
// (radius tag 6, control 8, card 12; spacing s1 4, s2 8, s3 12, s4 16, s6 24; colours ink, ink-muted, …).
// the page is the demo's own (open /?rules=1 in the demo app): what is proved here is what you can try there
const PAGE = await readFile(new URL('../overlay/demo/src/rules/wave1.jsx', import.meta.url), 'utf8');

// The same page built right: every rule followed.
const GOOD = `
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <div className="rounded-card bg-surface p-s1 shadow-rest"><div className="rounded-control bg-ground p-s3 text-small">Concentric</div></div>
      <div className="rounded-card bg-surface p-s1 shadow-rest"><img alt="" width="40" height="40" className="rounded-control bg-ground" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" /></div>
      <section className="flex flex-col gap-s4">
        <div className="flex flex-col gap-s2 text-small"><span>one</span><span>two</span></div>
        <div className="flex items-center gap-s3 text-small"><span className="size-8 rounded-full bg-ground" /><span>a row's gap is not the gap between rows</span></div>
      </section>
      <p className="text-body text-ink-muted">Coloured with a token</p>
      <button disabled className="rounded-control px-s3 text-small opacity-50">Disabled is another rule</button>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 34 }}>even</span>
        <span className="absolute left-s3 top-s1 origin-top-left scale-75 text-small">scaled</span>
      </div>
    </main>
  );
}
`;

test('A suggestion is written in one pick: the concentric corner previews rounded-control, taking it swaps the class in source, Undo puts it back', { timeout: 120000 }, async (t) => {
  const launched = await browser(t);
  if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const source = join(root, 'src/App.jsx');
  const line = async () => (await readFile(source, 'utf8')).split('\n').find((l) => l.includes('id="cc-bad-child"'));
  assert.match(await line(), /className="rounded-card /);
  await blueprint(page, overlay);
  await page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit')].some((h) => h.dataset.id.includes(':craft/concentric-radius')), null, { timeout: 10000 });
  const [mark] = (await craftMarks(page)).filter((m) => m.rule === 'concentric-radius');
  // a click on the glow puts the cause in hand, and the suggestion is tried at once: the child wears the suggested class
  const [mx, my] = (await overlay.locator(`.bp .hit[data-id="${mark.id}"]`).getAttribute('data-at')).split(',').map(Number);
  await page.mouse.move(mx, my);
  await page.waitForTimeout(250);
  await page.mouse.click(mx, my);
  await page.waitForFunction(() => document.getElementById('cc-bad-child').classList.contains('rounded-control'), null, { timeout: 3000 });
  assert.equal(await page.locator('#cc-bad-child').evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '8px');
  // and it can be taken: trying it must not make the finding (and with it the cause\u2019s plan) vanish; applyFix says if it did
  await applyFix(page, overlay);
  for (let i = 0; i < 100 && !/rounded-control/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-control bg-ground/, 'the class is swapped where it was, in source');
  assert.doesNotMatch(await line(), /rounded-card/);
  // the panel says what was written, with Undo: it puts the source back
  await overlay.locator('.fx .said .t').filter({ hasText: /^Changed rounded-card to rounded-control at 1 place$/ }).waitFor({ timeout: 20000 });
  await overlay.locator('.fx .said .undo').click();
  for (let i = 0; i < 100 && !/rounded-card/.test(await line()); i++) await page.waitForTimeout(100);
  assert.match(await line(), /className="rounded-card bg-ground/);
  assert.deepEqual(errors, []);
});

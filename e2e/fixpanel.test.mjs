// The fix panel (overlay/src/fixpanel.js; its drawing: overlay/demo/fix-flow.html): one place to act. A cause (one class,
// every place it is used) is put in hand, its options are tried on every place at once, taken, and applied in one
// guarded write per file. The page shows only heat. Proved through real Vite, React and Chromium, the source read back.
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
async function fixture(t, app) {
  const root = await mkdtemp(join(repo, 'fixtures/.fixpanel-'));
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
async function open(t, launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  return { page, errors, overlay };
}

// Two cards share one off-scale padding (one cause, two places); a heading's weight has no step on the theme
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <section id="a" className="rounded-card bg-surface p-[18px] text-body">One</section>
      <section id="b" className="rounded-card bg-surface p-[18px] text-body">Two</section>
    </main>
  );
}
`;
const panel = (overlay) => overlay.locator('.fx');
const padding = (page, id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).paddingTop);
const visible = (page, sel) => page.evaluate((sel) => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'), sel);

test('At rest one line counts problems and causes; Enter puts a cause in hand and tries its fix on every place; ↑ ↓ move every place; Take, then A writes them all', { timeout: 150000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { root, url } = await fixture(t, PAGE);
  const { page, errors, overlay } = await open(t, launched, url);
  const source = () => readFile(join(root, 'src/App.jsx'), 'utf8');
  // rest: one line, nothing else of the old flow drawn
  await panel(overlay).locator('.line').filter({ hasText: /2 problems · 1 cause/ }).waitFor({ timeout: 10000 });
  for (const sel of ['.bpp', '.cg', '.sel']) assert.equal(await visible(page, sel), false, `${sel} is not shown`);
  // Enter: the cause in hand, its options as specimens, the suggestion tried at both places
  await page.keyboard.press('Enter');
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  assert.match(await panel(overlay).locator('.cause .what').innerText(), /2 places/);
  await panel(overlay).locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  const picked = Number.parseFloat(await panel(overlay).locator('.sp[aria-pressed="true"] .v').innerText());
  await page.waitForFunction((n) => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === `${n}px`), picked, { timeout: 5000 });
  // the value it has now is shown, greyed out, not a choice
  assert.match(await panel(overlay).locator('.sp.off .v').innerText(), /^18px$/);
  // ↑: both places move to the next step
  await page.keyboard.press('ArrowUp');
  const next = Number.parseFloat(await panel(overlay).locator('.sp[aria-pressed="true"] .v').innerText());
  assert.ok(next > picked, `↑ picks a bigger step: ${picked} → ${next}`);
  await page.waitForFunction((n) => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === `${n}px`), next, { timeout: 5000 });
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((n) => getComputedStyle(document.getElementById('a')).paddingTop === `${n}px`, picked, { timeout: 5000 });
  // Take: kept; nothing else is left, so the panel rests with Apply 1
  for (let i = 0; i < 40 && !(await panel(overlay).locator('.apply .badge').filter({ hasText: '1' }).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await panel(overlay).locator('.apply .badge').filter({ hasText: '1' }).waitFor({ timeout: 5000 });
  assert.equal(await padding(page, 'b'), `${picked}px`, 'the other place keeps the taken value');
  // A: one write; both places carry the step in source
  await page.keyboard.press('a');
  for (let i = 0; i < 100 && (await source()).includes('p-[18px]'); i++) await page.waitForTimeout(100);
  const after = await source();
  assert.doesNotMatch(after, /p-\[18px\]/, 'both places written');
  assert.equal((after.match(/className="rounded-card bg-surface p-s\d text-body"/g) ?? []).length, 2, after);
  assert.deepEqual(errors, []);
});

test('A glow clicked puts its cause in hand; → skips to the next cause, ← back; Esc puts it down and the page is as it was', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await fixture(t, PAGE.replace('<section id="b"', '<p id="w" className="text-body font-[650]">Weight</p>\n      <section id="b"'));
  const { page, errors, overlay } = await open(t, launched, url);
  await panel(overlay).locator('.line').filter({ hasText: /problems? · 2 causes/ }).waitFor({ timeout: 10000 });
  // a click on the second card's glow (its zone's own point) holds the padding cause
  const at = await overlay.locator('.bp .hit[aria-label*="18px"]').first().getAttribute('data-at');
  const [x, y] = at.split(',').map(Number);
  await page.mouse.click(x, y);
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  // →: the other cause; ←: back to the padding
  await page.keyboard.press('ArrowRight');
  await panel(overlay).locator('.cause .cls').filter({ hasNotText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  await page.keyboard.press('ArrowLeft');
  await panel(overlay).locator('.cause .cls').filter({ hasText: 'p-[18px]' }).waitFor({ timeout: 10000 });
  // Esc: put down; the cards are back at 18px, the panel is one line
  await page.keyboard.press('Escape');
  await panel(overlay).locator('.line').waitFor({ timeout: 5000 });
  await page.waitForFunction(() => ['a', 'b'].every((id) => getComputedStyle(document.getElementById(id)).paddingTop === '18px'), null, { timeout: 5000 });
  assert.deepEqual(errors, []);
});

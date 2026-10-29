// Values read in one unit everywhere (overlay/src/value.js): px at the root the project's CSS sets (the browser's own
// default font size does not move them), whole when the scale is whole, the token beneath. A theme written in rem is
// the case: crafting-ui's minor-third type scale from 16px. The browser runs with an 18px default font size (Chrome's
// own profile setting), so the live root and the CSS's root differ. Proved through real Vite, React and Chrome.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

// crafting-ui's type scale, as written there (src/index.css)
const SCALE = `
  --text-*: initial;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
`;
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <p id="lede" className="text-[1.1875rem] text-ink">A store of the small decisions that make an interface feel right.</p>
      <p id="body" className="text-md text-ink">Body copy on the scale.</p>
    </main>
  );
}
`;

async function fixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.units-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const css = await readFile(join(root, 'src/styles.css'), 'utf8');
  await writeFile(join(root, 'src/styles.css'), css.replace(/\s*\/\* why: secondary text \*\/\s*--text-small: 12px;\s*\/\* why: row titles \*\/\s*--text-body: 14px;/, SCALE));
  await writeFile(join(root, 'src/App.jsx'), PAGE);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}

// Chrome with an 18px default font size, set the way a person sets it: in the profile's preferences
async function browser(t) {
  const profile = await mkdtemp(join(repo, 'fixtures/.units-profile-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  await mkdir(join(profile, 'Default'), { recursive: true });
  await writeFile(join(profile, 'Default/Preferences'), JSON.stringify({ webkit: { webprefs: { default_font_size: 18 } } }));
  try {
    const context = await chromium.launchPersistentContext(profile, { headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined,
      reducedMotion: 'reduce', viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    t.after(() => context.close());
    return context;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}

async function open(context, url) {
  const page = context.pages()[0] ?? await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  return { page, errors, overlay: page.locator('plumb-overlay') };
}
const fontSize = (page, id) => page.locator(`#${id}`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

test('A rem type scale reads in whole px at the CSS root in the fix panel; trying a step previews the step itself', { timeout: 150000 }, async (t) => {
  const context = await browser(t); if (!context) return;
  const { url } = await fixture(t);
  const { page, errors, overlay } = await open(context, url);
  // the premise: this browser's root is 18px, the CSS sets none (so the system is drawn at 16px)
  assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)), 18);
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  const hit = overlay.locator('.bp .hit[aria-label^="text-[1.1875rem]"]').first();
  await hit.focus(); await page.keyboard.press('Enter');
  const fx = overlay.locator('.fx');
  await fx.locator('.cause .cls').filter({ hasText: 'text-[1.1875rem]' }).waitFor({ timeout: 10000 });
  await fx.locator('.sp[aria-pressed="true"]').waitFor({ timeout: 10000 });
  const read = () => fx.locator('.sp').evaluateAll((s) => s.map((b) => ({ v: b.querySelector('.v').textContent, tk: b.querySelector('.tk').textContent, off: b.classList.contains('off') })));
  const shown = await read();
  // the steps around 19px, in whole px at 16px a rem, each with its token; the value now is 19px, greyed
  const steps = shown.filter((s) => !s.off);
  for (const s of steps) assert.match(s.v, /^\d+px$/, `whole px: ${JSON.stringify(shown)}`);
  assert.ok(steps.some((s) => s.v === '18px' && s.tk === 'lg'), `lg is 18px: ${JSON.stringify(shown)}`);
  assert.ok(steps.every((s) => ({ '16px': 'md', '18px': 'lg', '22px': 'xl' })[s.v] === s.tk), `each step at 16px a rem: ${JSON.stringify(shown)}`);
  assert.deepEqual(shown.filter((s) => s.off).map((s) => `${s.v} ${s.tk}`), ['19px now']);
  // the pick is tried on the page as the step itself: lg is 1.125rem, so 20.25px in this 18px browser (never 1px)
  const picked = await fx.locator('.sp[aria-pressed="true"] .tk').innerText();
  const rem = { md: 1, lg: 1.125, xl: 1.375 }[picked];
  await page.waitForFunction((n) => Math.abs(parseFloat(getComputedStyle(document.getElementById('lede')).fontSize) - n) < 0.05, rem * 18, { timeout: 5000 });
  // Esc puts it back as written
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.getElementById('lede')).fontSize) - 1.1875 * 18) < 0.05, null, { timeout: 5000 });
  assert.equal(await fontSize(page, 'body'), 18);
  assert.deepEqual(errors, []);
});

test('Alt+click on the element reads the same numbers in the fix panel: 19px now, whole px steps', { timeout: 120000 }, async (t) => {
  const context = await browser(t); if (!context) return;
  const { url } = await fixture(t);
  const { page, errors, overlay } = await open(context, url);
  const box = await page.locator('#lede').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.click(box.x + 20, box.y + box.height / 2);
  await page.keyboard.up('Alt');
  const fx = overlay.locator('.fx');
  await fx.locator('.cause .cls').filter({ hasText: 'text-[1.1875rem]' }).waitFor({ timeout: 20000 });
  await fx.locator('.sp').first().waitFor({ timeout: 10000 });
  const shown = await fx.locator('.sp').evaluateAll((s) => s.map((b) => ({ v: b.querySelector('.v').textContent, tk: b.querySelector('.tk').textContent, off: b.classList.contains('off') })));
  // the size it renders at, read at the CSS's root: 19px (this browser draws it at 21.38px)
  assert.deepEqual(shown.filter((s) => s.off).map((s) => s.v), ['19px'], JSON.stringify(shown));
  for (const s of shown) assert.match(s.v, /^\d+px$/, JSON.stringify(shown));
  assert.deepEqual(errors, []);
});

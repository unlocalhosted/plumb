// Tidy's QA findings (docs/qa/element-card-results.md, group 7, and docs/briefs/qa-fixes.md, cause 6), on a copy of
// overlay/demo: a round avatar (rounded-full) and controls inside rounded cards, a card padded 10px by 14px, and two
// Box cards beside two cards of another kind. Tidy proposes only a change with a clear step on the theme's scale:
// a shape (a circle, a pill) is never "fixed", a control's corner is never flattened, a padding change changes only the
// sides it lists, and "like the cards beside it" means cards of the same kind, on a step of the theme.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const HEAD = `function Box({ id, className, children }) {
  return <div id={id} className={className}>{children}</div>;
}
`;
const EXTRA = `
      <section id="qa-boxes" className="flex flex-col gap-s3">
        <Box id="qa-box-a" className="flex flex-col gap-s1 rounded-card bg-surface p-s3"><span className="text-body font-semibold">Title A</span><span id="qa-detail-a" className="text-small">detail A</span></Box>
        <Box id="qa-box-b" className="flex flex-col gap-s1 rounded-card bg-surface p-s3"><span className="text-body font-semibold">Title B</span><span className="text-small">detail B</span></Box>
        <div className="flex flex-col gap-s1 rounded-tag bg-ground p-s2"><span className="text-[16px]">Other one</span><span className="text-[16px]">other line</span></div>
        <div className="flex flex-col gap-s1 rounded-tag bg-ground p-s2"><span className="text-[16px]">Other two</span><span className="text-[16px]">other line</span></div>
      </section>
`;

let shared = null, cleanup = null;
after(() => cleanup?.());
async function setup(t) {
  if (shared) return shared;
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  const root = await mkdtemp(join(repo, 'fixtures/.tidy-qa-'));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const app = join(root, 'src/App.jsx'), source = await readFile(app, 'utf8');
  const anchor = "      {new URLSearchParams(location.search).has('corners') && <Corners />}";
  assert.ok(source.includes(anchor));
  await writeFile(app, HEAD + source.replace(anchor, EXTRA + anchor));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  cleanup = async () => { await browser.close(); await server.close(); await rm(root, { recursive: true, force: true }); };
  shared = { browser, app, url: `http://127.0.0.1:${server.httpServer.address().port}/?corners` };
  return shared;
}

async function tidyOf(t, selector) {
  const s = await setup(t); if (!s) return null;
  const page = await s.browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  t.after(() => page.close());
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(s.url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), card = overlay.locator('.ec');
  await page.locator(selector).click({ modifiers: ['Alt'], position: { x: 6, y: 14 } });
  await card.locator('.tidy-go').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  await card.locator('.tidy-go').click();
  await card.locator('.tidy-row, .note[role="status"]').first().waitFor({ timeout: 20000 });
  const rows = (await card.locator('.tidy-row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
  return { page, overlay, card, rows, app: s.app, errors };
}

test('F7-01, F7-02, F7-03: the avatar circle and the Run now button keep their corners; the padding change keeps the sides it doesn’t list', { timeout: 150000 }, async (t) => {
  const o = await tidyOf(t, '#sync-row'); if (!o) return;
  const { page, overlay, card, rows, app, errors } = o;
  assert.ok(!rows.some((r) => /33554400|Corner of span/.test(r)), `a circle is never fixed:\n${rows.join('\n')}`);
  assert.ok(!rows.some((r) => /Corner of “Run now”/.test(r)), `a control's corner is never flattened:\n${rows.join('\n')}`);
  assert.ok(!rows.some((r) => /→ 0px/.test(r)), rows.join('\n'));
  const pad = rows.find((r) => /^Padding of the card/.test(r));
  assert.ok(pad, `the padding change is listed:\n${rows.join('\n')}`);
  assert.match(pad, /10px → 12px/);
  // written: only the sides it lists (top and bottom) change; the 14px sides stay as written
  const original = await readFile(app, 'utf8');
  await card.locator('.use:not([disabled])').waitFor({ timeout: 20000 });
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /Tidied/ }).waitFor({ timeout: 20000 });
  const line = (await readFile(app, 'utf8')).split('\n').find((l) => l.includes('id="sync-row"'));
  assert.match(line, /px-\[14px\]/, line);
  assert.match(line, /py-s3/, line);
  assert.doesNotMatch(line, /rounded-\[0px\]|\bp-s3\b/, line);
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 30000 });
  assert.equal(await readFile(app, 'utf8'), original);
  assert.deepEqual(errors, []);
});

test('F7-02: the nested button inside the wrapper keeps its corner', { timeout: 150000 }, async (t) => {
  const o = await tidyOf(t, '#wrapper'); if (!o) return;
  const { rows, errors } = o;
  assert.ok(!rows.some((r) => /Corner of “Nested”/.test(r) && /→ 0px/.test(r)), rows.join('\n'));
  assert.ok(!rows.some((r) => /→ 0px/.test(r)), rows.join('\n'));
  assert.deepEqual(errors, []);
});

test('F7-04: "like the cards beside it" never takes a line to a size off the theme’s scale', { timeout: 150000 }, async (t) => {
  const o = await tidyOf(t, '#qa-box-a'); if (!o) return;
  const { rows, errors } = o;
  assert.ok(!rows.some((r) => /“detail A”.*12px → 16px/.test(r)), rows.join('\n'));
  assert.ok(!rows.some((r) => /Size of/.test(r) && /→ 16px/.test(r)), rows.join('\n'));
  assert.deepEqual(errors, []);
});

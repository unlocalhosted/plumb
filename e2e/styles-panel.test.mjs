// The text styles in the fix panel (overlay/src/typesystem.js; docs/design/system-proposal.md): Blueprint opens on the
// handful of styles the code is reaching for, before the fixes. Proved on fixtures/type-roles through real Vite, React
// and Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

async function open(t) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.styles-panel-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/type-roles'), root, { recursive: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 30000 });
  return { root, page, errors, overlay, fx: overlay.locator('.fx') };
}

test('Blueprint offers the text styles first; Review opens the ladder with each style, its places and what moving costs; Esc goes on to the fixes', { timeout: 150000 }, async (t) => {
  const s = await open(t); if (!s) return;
  const { page, fx, errors } = s;
  // at rest: the styles are offered before the fixes, in plain words
  const line = fx.locator('.line').filter({ has: page.locator('.review') });
  await line.waitFor({ timeout: 60000 });
  assert.match(await line.locator('.count').innerText(), /^(Your text uses \d+ sizes?\. \d+ styles would cover it\.|Your text has \d+ styles, typed by hand at \d+ places\. Name them\?)$/);
  assert.equal(await fx.locator('.start').count(), 0, 'one action at a time: the fixes come after');
  // Review (Enter): the ladder, largest first, every style with its numbers, places and cost; one sentence of cost
  await page.keyboard.press('Enter');
  const rows = fx.locator('.ladder [role="option"]');
  await rows.first().waitFor({ timeout: 5000 });
  const proposal = await page.evaluate(async () => (await (await fetch('/__plumb/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ census: [...document.body.querySelectorAll('[data-plumb-source]')].filter((el) => !el.closest('plumb-overlay') && [...el.childNodes].some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue))).map((el) => { const cs = getComputedStyle(el); return { stamp: el.getAttribute('data-plumb-source'), tag: el.localName, list: !!el.closest('li, ul, ol, dl'), computed: { size: parseFloat(cs.fontSize), lineHeight: parseFloat(cs.lineHeight) || null, letterSpacing: parseFloat(cs.letterSpacing) || 0, weight: parseInt(cs.fontWeight, 10), transform: cs.textTransform } }; }) }) })).json()).proposal);
  assert.equal(await rows.count(), proposal.roles.length, 'one row per style');
  const names = await rows.locator('.name').allInnerTexts();
  assert.ok(names.every((n) => /^(Display|Headline|Title|Body|Label)( small(er)?)?$/.test(n)), `named in plain words, never role codes: ${names}`);
  assert.equal(new Set(names).size, names.length, `each style has its own name: ${names}`);
  const sizes = await rows.locator('.nums').allInnerTexts();
  const px = sizes.map((x) => Number.parseFloat(x));
  assert.deepEqual(px, [...px].sort((a, b) => b - a), `largest first: ${sizes}`);
  for (const label of await rows.evaluateAll((rs) => rs.map((r) => r.getAttribute('aria-label')))) assert.match(label, /^[A-Z][a-z]+( small(er)?)?, [\d.–]+px( · [\d.]+ line height)?( · weight \d+)?, \d+ places?, \d+ unchanged\.$/);
  assert.match(await fx.locator('.styles .cost').innerText(), /stays? as|move/);
  assert.match(await fx.locator('.styles .outside').innerText(), /^1 place left out/, 'the excluded specimen is said, never proposed');
  assert.equal(await page.locator('#eyebrow').evaluate((el) => el.className), 'text-[12px] tracking-[0.08em] uppercase', 'looking changes nothing');
  // ↑ ↓ walk the ladder
  assert.equal(await rows.nth(0).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowDown');
  assert.equal(await rows.nth(1).getAttribute('aria-selected'), 'true');
  // Esc: put down; the fixes come next, and the styles aren't offered again on this page
  await page.keyboard.press('Escape');
  await fx.locator('.start').waitFor({ timeout: 5000 });
  assert.equal(await fx.locator('.review').count(), 0);
  assert.deepEqual(errors, []);
});

test('A style pointed at rings its places; Preview shows the page in the styles and puts it back; Use writes them all, says so, and Undo restores every file', { timeout: 180000 }, async (t) => {
  const s = await open(t); if (!s) return;
  const { root, page, fx, overlay, errors } = s;
  const { readFile } = await import('node:fs/promises');
  const files = ['src/App.tsx', 'src/Labels.tsx', 'src/styles.css'];
  const before = await Promise.all(files.map((f) => readFile(join(root, f), 'utf8')));
  await fx.locator('.review').waitFor({ timeout: 60000 });
  await page.keyboard.press('Enter');
  await fx.locator('.ladder [role="option"]').first().waitFor({ timeout: 5000 });
  // pointing: the style's places in view are ringed, and every problem's heat is quiet
  const rings = overlay.locator('.ts-light i');
  await rings.first().waitFor({ state: 'attached', timeout: 5000 });
  const first = await rings.count();
  assert.ok(first > 0, 'the first style’s places are ringed');
  assert.match(await fx.locator('.where').innerText(), /in view/);
  assert.equal(await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone')].filter((z) => z.dataset.stage === 'lit' || z.dataset.stage === 'lead').length), 0, 'no problem is lit while the styles are looked at');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  assert.ok(await rings.count() > 0, 'the next style’s places are ringed');
  // Preview (P): the page takes the styles; P again puts it back exactly
  const style = () => page.locator('#eyebrow').evaluate((el) => el.getAttribute('style'));
  assert.equal(await style(), null);
  await page.keyboard.press('p');
  await page.waitForFunction(() => document.getElementById('eyebrow').getAttribute('style')?.includes('font-size'), null, { timeout: 5000 });
  assert.equal(await fx.locator('.preview').getAttribute('aria-pressed'), 'true');
  assert.match(await fx.locator('.line .count').innerText(), /^Previewing your page in \d+ text styles$/, 'the card steps aside to one line');
  assert.equal(await fx.locator('.ladder').count(), 0);
  await page.keyboard.press('p');
  await page.waitForFunction(() => document.getElementById('eyebrow').getAttribute('style') === null, null, { timeout: 5000 });
  // Use these styles (Enter): one write; the panel says what it added and where, with Undo
  await page.keyboard.press('Enter');
  const said = fx.locator('.said .t');
  for (let i = 0; i < 120 && !(await said.count()); i++) await page.waitForTimeout(250);
  assert.match(await said.innerText(), /^Added \d+ text styles to styles\.css and used them at \d+ places$/);
  const after = await Promise.all(files.map((f) => readFile(join(root, f), 'utf8')));
  assert.notEqual(after[2], before[2], 'the theme has the styles');
  assert.match(after[0], /type-[a-z]+-[a-z]+/, 'the places use the style classes');
  // Undo: every file back as it was
  await fx.locator('.said .undo').click();
  for (let i = 0; i < 120; i++) { const now = await Promise.all(files.map((f) => readFile(join(root, f), 'utf8'))); if (now.every((x, k) => x === before[k])) break; await page.waitForTimeout(250); }
  const restored = await Promise.all(files.map((f) => readFile(join(root, f), 'utf8')));
  const differ = files.filter((f, k) => restored[k] !== before[k]);
  assert.deepEqual(differ, [], `Undo restores every file; still changed: ${differ}; panel: ${(await fx.innerText()).replace(/\s+/g, ' ')}; store: ${await page.evaluate(() => JSON.stringify({ resume: sessionStorage.getItem('plumb:resume'), undoing: sessionStorage.getItem('plumb:undoing'), bp: !!document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.bp:not([hidden])') }))}`);
  assert.deepEqual(errors.filter((e) => !/context was destroyed|navigation/i.test(e)), []);
});

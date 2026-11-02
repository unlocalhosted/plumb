// Tidy this card (docs/briefs/element-card-overlay.md, layer 3) on fixtures/hierarchy: three cards in a list, 24px
// apart. Card B's subtitle outweighs the subtitles beside it and its inside gap equals the gap between cards: Tidy
// lists both in plain words, previews them on the card at once (held Space shows it as it was), and one Write it writes
// them as one batch with one Undo that restores the file exactly. Card A is tidy: it says so.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

async function open(t, id) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.element-tidy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/hierarchy'), root, { recursive: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), file = join(root, 'src/Cards.tsx'), original = await readFile(file, 'utf8');
  // Alt+click on the card itself (its padding), not on its words
  await page.locator(id).click({ modifiers: ['Alt'], position: { x: 6, y: 6 } });
  await overlay.locator('.ec .tidy-go').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  return { page, overlay, card: overlay.locator('.ec'), file, original, read: () => readFile(file, 'utf8'), errors };
}
const css = (page, id, prop) => page.evaluate(([i, p]) => getComputedStyle(document.getElementById(i)).getPropertyValue(p), [id, prop]);

test('Card B: Tidy lists the subtitle’s weight and the inside gap, previews both (Space shows it as it was), writes them in one go, and one Undo restores the file', { timeout: 150000 }, async (t) => {
  const o = await open(t, '#b'); if (!o) return;
  const { page, overlay, card, original, read, errors } = o;
  assert.equal(await card.locator('.tidy-go').innerText(), 'Tidy this card');
  await card.locator('.tidy-go').click();
  await card.locator('.tidy-row').first().waitFor({ timeout: 20000 });

  // the changes, in plain words: what, from → to, the rule as a sentence (never a rule id)
  const rows = (await card.locator('.tidy-row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
  assert.equal(rows.length, 2, rows.join('\n'));
  assert.ok(rows.some((r) => /^Weight of “A subtitle under it” Bold → Regular Like the same line in the cards beside it\.$/.test(r)), rows.join('\n'));
  assert.ok(rows.some((r) => /^Space inside of the card 24px → 20px Space inside the card is less than the space between cards\.$/.test(r)), rows.join('\n'));
  assert.doesNotMatch(await card.innerText(), /\b[TSL]\d\b/, 'no rule ids');
  assert.match(await card.locator('.lab').first().innerText(), /2 changes[\s\S]*Hold Space/i);

  // every change on the card at once; held Space shows it as it was
  assert.deepEqual([await css(page, 'b-subtitle', 'font-weight'), await css(page, 'b', 'row-gap')], ['400', '20px']);
  assert.equal(await css(page, 'b-title', 'font-weight'), '600', 'the title’s bundle is never touched');
  await page.keyboard.down('Space');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('b-subtitle')).fontWeight === '700');
  assert.equal(await css(page, 'b', 'row-gap'), '24px');
  assert.match(await card.locator('.lab').first().innerText(), /As it was/i);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('b-subtitle')).fontWeight === '400');

  // one Write it: both edits, at the place that passes the classes in (card B's own usage), nothing else
  await card.locator('.use:not([disabled])').waitFor({ timeout: 20000 });
  await page.evaluate(() => { window.__mark = true; });
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /Tidied .*: 2 changes/ }).waitFor({ timeout: 20000 });
  const now = await read();
  assert.match(now, /<Card id="b" title="A heavy subtitle" subtitleClass="text-\[17px\] font-normal" gapClass="gap-5" \/>/);
  assert.equal(now.replace('subtitleClass="text-[17px] font-normal" gapClass="gap-5"', 'subtitleClass="text-[17px] font-bold" gapClass="gap-6"'), original, 'only card B’s usage changed');
  // (the page may reload for the write: wait for it to be back)
  if (await page.waitForFunction(() => !window.__mark, null, { timeout: 2500 }).then(() => true, () => false)) await page.waitForFunction(() => window.__plumb?.overlay && document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx .said'), null, { timeout: 20000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('b')).rowGap === '20px' && getComputedStyle(document.getElementById('b-subtitle')).fontWeight === '400', null, { timeout: 20000 });
  assert.equal(await page.locator('#b').evaluate((n) => n.getAttribute('style') ?? ''), '', 'the preview is lifted once written');

  // one Undo takes both back
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx .said')?.textContent ?? ''), null, { timeout: 30000 });
  assert.equal(await read(), original);
  assert.deepEqual(errors, []);
});

test('Card A: Tidy says there is nothing to tidy and offers no write', { timeout: 120000 }, async (t) => {
  const o = await open(t, '#a'); if (!o) return;
  const { card, original, read, errors } = o;
  await card.locator('.tidy-go').click();
  await card.locator('.note[role="status"]').waitFor({ timeout: 20000 });
  assert.equal(await card.locator('.note[role="status"]').innerText(), 'Nothing to tidy. This card already keeps its own order.');
  assert.equal(await card.locator('.use').count(), 0);
  assert.equal(await read(), original);
  assert.deepEqual(errors, []);
});

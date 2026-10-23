// Your setup, as a person meets it in the overlay: the dock names what the setup costs, the panel opens once by itself
// without taking focus and steps aside when work starts, ticks choose what to fix, and Copy for agent hands the ticked
// causes over as one instruction. Real Vite, real React, real Chromium, the overlay's own demo app.
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

async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close()); return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}

// The demo without React's Fast Refresh plugin: a setup that limits Write in place.
async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.ready-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}

const state = page => page.evaluate(() => {
  const r = document.querySelector('plumb-overlay').shadowRoot, panel = r.querySelector('.rd');
  return {
    note: r.querySelector('.dock .ready')?.textContent.trim() ?? null,
    open: !!panel,
    focusInPanel: !!panel && panel.contains(r.activeElement),
    causes: [...(panel?.querySelectorAll('.req[data-status="missing"] .what') ?? [])].map(e => e.textContent),
    ticked: [...(panel?.querySelectorAll('input.box') ?? [])].filter(b => b.checked).length,
    count: panel?.querySelector('.foot .count')?.textContent ?? null,
    chips: [...(panel?.querySelectorAll('.req .chip') ?? [])].map(e => e.textContent),
  };
});

test('your setup: the note, a first open that steps aside, ticks, and Copy for agent', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const context = await launched.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());

  // First visit: the panel opens by itself, names the Fast Refresh cause first, and leaves focus on the page.
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  let s = await state(page);
  assert.equal(s.open, true);
  assert.equal(s.focusInPanel, false, 'a panel that opened by itself does not take focus');
  assert.ok(s.causes.some(c => /Fast Refresh/.test(c)), JSON.stringify(s.causes));
  assert.ok(s.chips.some(c => /Write in place/i.test(c)), JSON.stringify(s.chips));
  assert.ok(s.note, 'the dock names the biggest loss');
  assert.equal(s.ticked, s.causes.length, 'every cause starts ticked');
  assert.equal(s.count, `${s.causes.length} selected`);
  // No cause is listed twice (Write needs Locate is not its own row).
  assert.equal(new Set(s.causes).size, s.causes.length);

  // Starting work steps it aside: holding Alt closes it, and focus didn't move into the overlay.
  await page.keyboard.down('Alt'); await page.keyboard.up('Alt');
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  assert.ok((await state(page)).note, 'the note stays as the way back');

  // Reloading doesn't open it again; the note does, and then it takes focus (the person asked for it).
  await page.reload();
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .ready'));
  assert.equal((await state(page)).open, false, 'it opens by itself only once per project');
  await page.locator('plumb-overlay').locator('.dock .ready').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  s = await state(page);
  assert.equal(s.focusInPanel, true);

  // Untick one: the count follows, and Copy for agent hands over only what's ticked.
  const boxes = page.locator('plumb-overlay').locator('.rd input.box');
  const first = await page.locator('plumb-overlay').locator('.rd .req[data-status="missing"] .what').first().textContent();
  await boxes.first().uncheck();
  s = await state(page);
  assert.equal(s.ticked, s.causes.length - 1);
  assert.equal(s.count, `${s.causes.length - 1} selected`);
  await page.locator('plumb-overlay').locator('.rd [data-act="copy-all"]').click();
  await page.locator('plumb-overlay').locator('.rd [data-act="copy-all"]', { hasText: 'Copied' }).waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /^React Plumber found \d+ setup problems? in this project/);
  assert.ok(!copied.includes(first), 'an unticked cause is not handed over');
  assert.match(copied, /Why: /);
  assert.match(copied, /Check: run `npx plumber doctor`/);

  // Nothing ticked: both actions are off.
  for (const box of await boxes.all()) await box.uncheck();
  assert.equal((await state(page)).count, 'Nothing selected');
  assert.equal(await page.locator('plumb-overlay').locator('.rd [data-act="copy-all"]').isDisabled(), true);
  assert.equal(await page.locator('plumb-overlay').locator('.rd [data-act="apply"]').isDisabled(), true);

  // Escape closes it and returns focus to the note.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  assert.equal(await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.activeElement?.className), 'ready');
  assert.deepEqual(errors, []);
});

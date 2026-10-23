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

test('your setup: the note, a first-time callout that stays out of the way, ticks, and Copy for agent', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const context = await launched.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());

  // First visit: a one-line callout beside the dock names the cost; the panel itself does not open, and focus stays.
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd-callout'));
  let s = await state(page);
  assert.equal(s.open, false, 'the panel never opens by itself: it would cover the page');
  assert.ok(s.note, 'the dock names the biggest loss');
  const callout = await page.evaluate(() => { const r = document.querySelector('plumb-overlay').shadowRoot, c = r.querySelector('.rd-callout'), b = c.getBoundingClientRect();
    return { text: c.textContent.replace(/\s+/g, ' ').trim(), focus: c.contains(r.activeElement), height: b.height }; });
  assert.match(callout.text, /^\d+ setup gaps? · /);
  assert.equal(callout.focus, false, 'the callout does not take focus');
  assert.ok(callout.height < 64, `the callout stays small (${callout.height}px)`);

  // Starting work puts it away: holding Alt removes the callout; the note stays as the way back.
  await page.keyboard.down('Alt'); await page.keyboard.up('Alt');
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd-callout'));
  assert.ok((await state(page)).note);

  // Once per project: after a reload there's no callout; the note opens the panel, which then takes focus.
  await page.reload();
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .ready'));
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => !!document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd-callout')), false);
  await page.locator('plumb-overlay').locator('.dock .ready').click();
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  s = await state(page);
  assert.equal(s.focusInPanel, true);
  assert.ok(s.causes.some(c => /Fast Refresh/.test(c)), JSON.stringify(s.causes));
  assert.ok(s.chips.some(c => /Write in place/i.test(c)), JSON.stringify(s.chips));
  assert.equal(s.ticked, s.causes.length, 'every cause starts ticked');
  assert.equal(s.count, `${s.causes.length} selected`);
  assert.equal(new Set(s.causes).size, s.causes.length, 'no cause is listed twice');

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

// Apply, through a real click: a project whose vite.config turns hot updates off. The panel shows the change, Apply
// writes it to the file on disk, the row says so, and nothing else in the config moves.
test('your setup: Apply writes the ticked change to the project config, shown first', { timeout: 120000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const root = await mkdtemp(join(repo, 'fixtures/.ready-apply-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const { writeFile, readFile } = await import('node:fs/promises');
  await writeFile(join(root, 'package.json'), '{"name":"ready-apply","private":true,"type":"module"}\n');
  const before = `import tailwindcss from '@tailwindcss/vite';\nimport { plumb } from '${join(repo, 'dist/hosts/vite.js')}';\n\nexport default {\n  plugins: [plumb({ watch: false }), tailwindcss()],\n  oxc: { jsx: { runtime: 'automatic', development: true } },\n  server: { watch: null, host: '127.0.0.1', port: 0, hmr: false },\n};\n`;
  await writeFile(join(root, 'vite.config.mjs'), before);
  const server = await createServer({ root, configFile: join(root, 'vite.config.mjs'), cacheDir: join(root, '.vite-cache'), logLevel: 'silent' });
  t.after(() => server.close()); await server.listen();
  const page = await launched.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  await overlay.locator('.dock .ready').click();
  await overlay.locator('.rd').waitFor();

  const row = overlay.locator('.rd .req[data-id="write.hmr"]');
  await row.waitFor();
  assert.match(await row.locator('.what').textContent(), /Hot updates are off/);
  // Show the change first: the diff removes hmr: false.
  await row.locator('[data-act="show"]').click();
  assert.match(await row.locator('pre').textContent(), /-.*hmr: false/);
  // Tick only this one, so Apply writes exactly it.
  for (const box of await overlay.locator('.rd input.box').all()) if (await box.getAttribute('data-id') !== 'write.hmr') await box.uncheck();
  const apply = overlay.locator('.rd [data-act="apply"]');
  assert.equal((await apply.textContent()).trim(), 'Apply 1');
  await apply.click();
  await row.locator('.chip', { hasText: 'Fixed' }).waitFor();
  const after = await readFile(join(root, 'vite.config.mjs'), 'utf8');
  assert.doesNotMatch(after, /hmr: false/);
  assert.equal(after.replace(/,\s*hmr: false/, ''), before.replace(/,\s*hmr: false/, ''), 'nothing else in the config moved');
  assert.deepEqual(errors, []);
});

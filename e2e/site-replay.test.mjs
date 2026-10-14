// One feature slice: stamped static build, real overlay writes in different orders, untouched source.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('homepage guards dev writes and replays static overlay fixes in any order', { timeout: 180000 }, async t => {
  const sourceFile = resolve(repo, 'site/src/hero/DriftedCard.jsx');
  const before = await readFile(sourceFile, 'utf8');
  const fixture = JSON.parse(await readFile(resolve(repo, 'site/src/hero/replay.json'), 'utf8'));
  assert.equal(fixture.source, before, 'Re-record after changing the hero');
  await build({ configFile: resolve(repo, 'site/vite.config.mjs'), logLevel: 'silent' });
  const root = resolve(repo, 'site/dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  const server = createServer(async (request, response) => {
    const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + '/')) return response.writeHead(404).end();
    try {
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  let browser, dev;
  t.after(async () => {
    await browser?.close();
    await dev?.close();
    await new Promise(done => server.close(done));
  });
  browser = await chromium.launch({ executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  const drifts = fixture.groups.flatMap(group => group.drifts);
  assert.equal(drifts.length, 6);
  dev = await createViteServer({ configFile: resolve(repo, 'site/vite.config.mjs'),
    logLevel: 'error', server: { port: 0, watch: null } });
  await dev.listen();
  const staticBase = `http://127.0.0.1:${server.address().port}`;
  const devBase = `http://127.0.0.1:${dev.httpServer.address().port}`;
  const runs = [
    { base: devBase, order: [0, 1, 2, 3, 4, 5], dev: true },
    { base: staticBase, order: [0, 1, 2, 3, 4, 5] },
    { base: staticBase, order: [5, 4, 3, 2, 1, 0], alternate: true },
    { base: staticBase, order: [1, 4, 2, 0, 5, 3] },
  ];
  for (const run of runs) {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/__plumb/')) requests.push(request.url()); });
    await page.addInitScript(() => { window.demoWrites = []; addEventListener('plumb:demo-applied', event => window.demoWrites.push(event.detail)); });
    await page.goto(run.base);
    await page.waitForFunction(() => window.__plumb?.overlay && document.querySelector('[data-drift="card"]'));
    await page.evaluate(() => window.__plumb.ready());
    // Close the development tuner through its own header before using the hero.
    if (run.dev) await page.locator('.dialkit-root .dialkit-panel-header').filter({ hasText: 'DialKit' }).click();
    assert.equal(await page.locator('vite-error-overlay').count(), 0);
    const overlay = page.locator('plumb-overlay');
    assert.equal(await overlay.count(), 1);
    for (const index of run.order) {
      const drift = drifts[index];
      const control = page.getByRole('button', { name: new RegExp(`^${index + 1}:`) });
      // Hero controls pin the actual element in React Plumber; all choices and writes happen inside the real overlay.
      await control.evaluate(node => node.scrollIntoView({ block: 'center' }));
      // The hover label widens the button over neighboring marks; click its visible nut.
      await control.click({ position: { x: 12, y: 12 } });
      const dialog = overlay.getByRole('dialog'); await dialog.waitFor();
      const markButton = dialog.getByRole('button', { name: new RegExp(drift.bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
      if (await markButton.isVisible()) await markButton.click();
      await dialog.locator('.read .t').filter({ hasText: drift.bad }).waitFor();
      const preferred = ['rounded-lg', 'p-6', 'gap-3', 'text-base', 'px-3', 'rounded-sm'];
      const alternatives = ['rounded-md', 'p-5', 'gap-4', 'text-base', 'px-4', 'rounded-sm'];
      const desired = (run.alternate ? alternatives : preferred)[index];
      await dialog.getByRole('button', { name: new RegExp(`^${desired}(?:,|$)`) }).click();
      await dialog.getByRole('button', { name: 'Write 1 edit', exact: true }).click();
      await overlay.locator('.synced .state').filter({ hasText: /^Wrote 1 edit to/ }).waitFor();
      await page.waitForFunction(({ part, bad }) => !document.querySelector(`[data-drift="${part}"]`).classList.contains(bad), drift);
      assert.equal(await page.locator(`[data-drift="${drift.part}"]`).evaluate((node, token) => node.classList.contains(token), desired), true);
      assert.doesNotMatch(await dialog.locator('.read .t').innerText(), new RegExp(drift.bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(await readFile(sourceFile, 'utf8'), before);
      await dialog.getByRole('button', { name: 'Close the reading' }).click();
    }
    for (const drift of drifts) assert.equal(await page.locator(`[data-drift="${drift.part}"]`).evaluate((node, token) => node.classList.contains(token), drift.bad), false);
    // Verify compiled fixes, including the alternate spacing/radius choices, through their rendered CSS.
    const css = await page.evaluate(() => {
      const read = part => getComputedStyle(document.querySelector(`[data-drift="${part}"]`));
      const spacing = getComputedStyle(document.documentElement).getPropertyValue('--spacing').trim();
      const unit = parseFloat(spacing) * (spacing.endsWith('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
      return { unit, radius: read('card').borderRadius, padding: read('card').paddingTop,
        gap: read('header').gap, type: read('name').fontSize,
        buttonPadding: read('button').paddingLeft, buttonRadius: read('button').borderRadius };
    });
    assert.deepEqual(css, { unit: css.unit, radius: run.alternate ? '8px' : '12px', padding: `${css.unit * (run.alternate ? 5 : 6)}px`,
      gap: `${css.unit * (run.alternate ? 4 : 3)}px`, type: '17px', buttonPadding: `${css.unit * (run.alternate ? 4 : 3)}px`,
      buttonRadius: '5px' });
    for (const group of fixture.groups) {
      const index = drifts.findIndex(drift => drift.bad === group.drifts[0].bad);
      const control = page.getByRole('button', { name: new RegExp(`^${index + 1}:`) });
      await control.evaluate(node => node.scrollIntoView({ block: 'center' }));
      await control.click({ position: { x: 12, y: 12 } });
      await overlay.getByRole('dialog').getByText(/^(on system|on the scale)$/).waitFor();
      await overlay.getByRole('button', { name: 'Close the reading' }).click();
    }
    assert.equal(await page.evaluate(() => window.demoWrites.length), 6);
    if (!run.dev) assert.deepEqual(requests, [], 'Static deployment must not need overlay HTTP routes');
    assert.deepEqual(errors, []);
    await page.close();
    t.diagnostic(`${run.dev ? 'dev guard' : 'static replay'}: ${run.order.join(',')} — six writes, four on-system readings, source unchanged`);
  }
  assert.equal(await readFile(sourceFile, 'utf8'), before);
});

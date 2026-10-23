// Run against Relay's ready Vite/Next dev hosts. Fresh contexts, matched viewport, Alt+B through completed reader.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM });
const results = [];
try {
  for (const [host, url] of [['vite', 'http://127.0.0.1:4320/#/board'], ['next', 'http://127.0.0.1:4321/#/board']]) {
    // Compile route and initialize analysis outside measurement, as in findings-4.
    const warm = await browser.newPage(); await warm.goto(url); await warm.waitForFunction(() => window.__plumb); await warm.evaluate(() => window.__plumb.ready()); await warm.close();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const browserErrors = []; page.on('pageerror', error => browserErrors.push(error.message));
    await page.goto(url); await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready());
    const requests = [];
    page.on('request', request => requests.push(request));
    const start = performance.now(); await page.keyboard.press('Alt+B');
    await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.total === 260 && p.read === p.total; }, null, { timeout: 120000 });
    const elapsedMs = performance.now() - start;
    await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .hit').length === window.__plumb.overlay.progress.drift);
    const state = await page.evaluate(() => { const root = document.querySelector('plumb-overlay').shadowRoot; return { progress: window.__plumb.overlay.progress, sourceStamps: document.querySelectorAll('[data-plumb-source]').length, labels: [...root.querySelectorAll('.bp .hit')].map(el => el.getAttribute('aria-label')).sort(), dock: root.querySelector('.dock .say').textContent, marksDrawingMs: performance.getEntriesByName('plumb:marks').reduce((sum, entry) => sum + entry.duration, 0) }; });
    const traffic = {}, repeated = new Map();
    for (const request of requests) {
      const url = new URL(request.url()); const group = url.pathname.endsWith('/batch') ? 'Plumber batches' : url.pathname.startsWith('/__plumb/') ? 'Plumber other' : /\.map$/.test(url.pathname) ? 'source maps' : /\.(?:js|jsx|ts|tsx)$/.test(url.pathname) ? 'script/chunk reads' : 'other';
      const row = traffic[group] ??= { requests: 0, maxRequestMs: 0 }; row.requests++;
      const timing = request.timing(); row.maxRequestMs = Math.max(row.maxRequestMs, timing.responseEnd > 0 ? timing.responseEnd - timing.requestStart : 0);
      repeated.set(url.pathname + url.search, (repeated.get(url.pathname + url.search) ?? 0) + 1);
    }
    const result = { host, elapsedMs, ...state, traffic, repeatedRequests: [...repeated].filter(([, n]) => n > 1).map(([path, requests]) => ({ path, requests })).sort((a, b) => b.requests - a.requests), browserErrors };
    results.push(result); console.log(JSON.stringify({ host, elapsedMs, progress: state.progress, traffic, repeatedRequests: result.repeatedRequests }));
    if (process.env.PLUMB_RELAY_SCREENSHOTS) await page.screenshot({ path: `${process.env.PLUMB_RELAY_SCREENSHOTS}.${host}.png` });
    await context.close();
  }
  assert.deepEqual(results[0].labels, results[1].labels, 'identical drift labels including multiplicity');
  for (const r of results) { assert.equal(r.progress.read, 260); assert.equal(r.progress.drift, 79); assert.equal(r.progress.notChecked, 0); assert.deepEqual(r.browserErrors, []); }
  const output = { route: '#/board', viewport: { width: 1440, height: 900 }, browser: 'Google Chrome headless', reducedMotion: true, method: 'Warm development hosts/session ready; fresh browser contexts; Alt+B through read === total. Overlapping request durations are not additive.', sameDriftLabelsIncludingMultiplicity: true, results };
  await writeFile(process.argv[2] ?? '/tmp/relay-blueprint.measurements.json', JSON.stringify(output, null, 2) + '\n');
  if (process.env.PLUMB_RELAY_BUDGET) assert.ok(results[1].elapsedMs <= results[0].elapsedMs * 2, `Next ${results[1].elapsedMs}ms > 2x Vite ${results[0].elapsedMs}ms`);
} finally { await browser.close(); }

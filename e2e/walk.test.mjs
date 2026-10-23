// Walking the tree with two fingers: hold Alt over an element, move fingers up (positive deltaY, natural scrolling) to
// widen to its parents and down to come back, see the path in the tag with components named, and click to pin the
// level walked to. The page itself doesn't scroll meanwhile.
// Real Vite, real React, real Chromium (real wheel events), the overlay's own demo app.
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

async function demo(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.walk-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}

// What the reticle is around, by the element's identity in the page.
const around = page => page.evaluate(() => {
  const r = document.querySelector('plumb-overlay').shadowRoot, tick = r.querySelector('.tick[data-c="tl"]');
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(tick.style.transform);
  const el = document.elementFromPoint(Number(m[1]) + 1, Number(m[2]) + 1);
  return { at: [Number(m[1]), Number(m[2])], here: r.querySelector('.tag .path .here')?.textContent ?? null, tag: r.querySelector('.tag').textContent.replace(/\s+/g, ' ').trim(), scrollY, el: el?.id || el?.localName };
});

test('two-finger scroll walks the tree under Alt: up to parents, down back, the path in the tag, a click pins the level', { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const url = await demo(t);
  const page = await launched.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  // Out of the way: the setup panel may open once on a fresh project.
  await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd .close')?.click());

  const button = page.getByRole('button', { name: 'Run now' });
  const box = await button.boundingBox();
  const row = await page.locator('#sync-row').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag').hidden);
  let s = await around(page);
  assert.equal(s.here, null, 'no path before walking');
  assert.deepEqual(s.at.map(Math.round), [Math.round(box.x), Math.round(box.y)], 'the reticle starts on the button');

  // One notch up: the reticle widens to the button's parent row, and the path names it by its component, SyncRow.
  await page.mouse.wheel(0, 48);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag .path .here'));
  s = await around(page);
  assert.equal(s.here, 'SyncRow');
  assert.deepEqual(s.at.map(Math.round), [Math.round(row.x), Math.round(row.y)], 'the reticle is around the row');
  assert.equal(s.scrollY, 0, 'the page did not scroll');

  // Small trackpad deltas add up: a 20px nudge doesn't move a level; the rest of the step does.
  await page.mouse.wheel(0, 20);
  await page.waitForTimeout(60);
  assert.equal((await around(page)).here, 'SyncRow');
  await page.mouse.wheel(0, 28);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag .path .here')?.textContent === 'section');

  // Down retraces the path: back to the row, then to the button, where the path goes away.
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, -48);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag .path .here')?.textContent === 'SyncRow');
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, -48);
  await page.waitForFunction(() => !document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag .path'));
  // Past the element under the pointer there's nowhere further down.
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(60);
  assert.equal((await around(page)).here, null);

  // Walk up to the row again and click: the row is pinned, not the button under the pointer.
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 48);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.tag .path .here')?.textContent === 'SyncRow');
  await page.mouse.down(); await page.mouse.up();
  await page.keyboard.up('Alt');
  const card = page.locator('plumb-overlay').locator('.w .card[role="dialog"]');
  await card.waitFor();
  assert.match(await card.getAttribute('aria-label'), /SyncRow \(div\)/, 'the walked level is pinned');
  assert.equal(await page.evaluate(() => scrollY), 0);
  assert.deepEqual(errors, []);
});

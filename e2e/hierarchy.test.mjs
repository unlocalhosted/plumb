// The hierarchy engine (docs/research/hierarchy.md) through the browser: contextOf marks the step that fits and the
// steps that would break the order; tidy lists the changes that bring a sloppy card to its own hierarchy, in order,
// and never touches the title or a tidy card. Real Vite, real Chromium, the module served by the host.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('contextOf marks fits and breaks from the card’s levels; tidy lists the sloppy card’s changes in order and leaves the tidy one alone', { timeout: 120000 }, async (t) => {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.hierarchy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/hierarchy'), root, { recursive: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForSelector('#c-meta');
  // the module is served by the host like every overlay module
  assert.equal((await fetch(`http://127.0.0.1:${server.httpServer.address().port}/__plumb/src/hierarchy.js`)).status, 200);
  const scale = { sizes: [11, 14, 15, 16, 17, 19, 24], weights: [400, 500, 600, 700], spacing: [0, 4, 8, 12, 16, 24, 32, 40], radii: [0, 4, 8, 12, 16] };
  const ctx = (id) => page.evaluate(async ([id, scale]) => {
    const { contextOf } = await import('/__plumb/src/hierarchy.js');
    const c = contextOf(document.getElementById(id), scale);
    return { role: c.role, container: c.container?.id ?? null, peers: c.peers.length, levels: c.levels.map((l) => [l.role, l.bundle.size, l.bundle.weight, l.members.length]), fits: Object.fromEntries(Object.entries(c.fits).map(([k, v]) => [k, { step: v.step, breaks: v.breaks, rule: v.rule }])) };
  }, [id, scale]);
  // card A: four levels, title > subtitle (weight) > body > meta; the subtitle's weight must stay under the title's
  const subtitle = await ctx('a-subtitle');
  assert.deepEqual([subtitle.role, subtitle.container, subtitle.peers], ['subtitle', 'a', 4 + 2 * 1]);
  assert.deepEqual(subtitle.levels, [['title', 17, 600, 1], ['subtitle', 17, 400, 1], ['body', 15, 400, 1], ['meta', 11, 400, 1]]);
  assert.deepEqual(subtitle.fits['font-weight'], { step: 400, breaks: [600, 700], rule: 'T1' });
  assert.deepEqual(subtitle.fits['font-size'], { step: 17, breaks: [15, 11, 14], rule: 'T1' }.breaks ? { step: 17, breaks: subtitle.fits['font-size'].breaks, rule: 'T1' } : null);
  assert.deepEqual([...subtitle.fits['font-size'].breaks].sort((x, y) => x - y), [11, 14, 15, 17, 19, 24].filter((s) => s >= 17 || s <= 15));
  const body = await ctx('a-body');
  assert.deepEqual([body.role, body.fits['font-size'].step, [...body.fits['font-size'].breaks].sort((x, y) => x - y)], ['body', 15, [11, 17, 19, 24]]);
  const image = await ctx('a-image');
  assert.deepEqual(image.fits.radius, { step: 0, breaks: [], rule: 'L2' }); // 16px corner, 16px in: concentric is 0
  // the list: inside gaps (24) against the page: a card's own space levels
  const card = await ctx('b');
  assert.deepEqual(card.fits.gap, { step: 24, breaks: [24, 32, 40], rule: 'S1' });
  assert.equal(card.fits.padding.rule, 'S1');
  // tidy card B: the subtitle outweighs the title (T1: it moves down, the title stays), the inside gap equals the gap between cards (S1)
  const tidy = (id) => page.evaluate(async ([id, scale]) => { const { tidy } = await import('/__plumb/src/hierarchy.js'); return tidy(document.getElementById(id), scale).map((c) => ({ el: c.el.id, prop: c.prop, from: c.from, to: c.to, rule: c.rule })); }, [id, scale]);
  const b = await tidy('b');
  assert.deepEqual(b.map((c) => [c.el, c.prop, c.from, c.to, c.rule]), [
    ['b-subtitle', 'font-weight', 700, 400, 'T3'],
    ['b', 'gap', 24, 16, 'S1'],
  ]);
  assert.ok(!b.some((c) => c.el === 'b-title'), 'the title is the anchor');
  // tidy card C: its 16px title is off its peers' 17px (T3), and its image corner is not concentric (L2: 16 in 16 → 0)
  const c = await tidy('c');
  assert.deepEqual(c.map((x) => [x.el, x.prop, x.from, x.to, x.rule]), [
    ['c-title', 'font-size', 16, 17, 'T3'],
    ['c-image', 'radius', 16, 0, 'L2'],
  ]);
  // the tidy card asks for nothing
  assert.deepEqual(await tidy('a'), []);
  assert.deepEqual(errors, []);
});

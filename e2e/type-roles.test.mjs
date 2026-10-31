// The type system a codebase is reaching for (docs/research/type-roles.md): the proposal from POST system, its
// write through apply-all, undo, exclusions and the stale-hash guard. Real Vite, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function site(t) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.type-roles-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/type-roles'), root, { recursive: true });
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.waitForFunction(async () => (await (await fetch('/__plumb/health')).json()).status === 'ready', null, { timeout: 60000, polling: 300 });
  // the census the overlay would take: every element with its own text, its computed type values, in a list or not
  const census = () => page.evaluate(() => [...document.body.querySelectorAll('*')].filter((el) => !el.closest('plumb-overlay') && [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue)) && el.getAttribute('data-plumb-source')).map((el) => {
    const cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
    return { stamp: el.getAttribute('data-plumb-source'), tag: el.localName, list: !!el.closest('li, ul, ol, dl'), computed: { size, lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), weight: parseInt(cs.fontWeight, 10), transform: cs.textTransform } };
  }));
  // a session still warming up answers 503 starting: asked again, as the overlay does
  const post = async (method, body) => {
    for (let i = 0; ; i++) {
      const r = await page.evaluate(async ([method, body]) => { const r = await fetch(`/__plumb/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; }, [method, body]);
      if (r.status !== 503 || i > 60) return r;
      await page.waitForTimeout(1000);
    }
  };
  // a theme write reloads the page: a read that lands mid-reload is asked again once the page is back
  const styleOf = async (id) => {
    for (let i = 0; ; i++) {
      try { return await page.evaluate((id) => { const cs = getComputedStyle(document.getElementById(id)); return { size: cs.fontSize, lh: cs.lineHeight, ls: cs.letterSpacing, weight: cs.fontWeight, transform: cs.textTransform, cls: document.getElementById(id).className }; }, id); }
      catch (error) { if (i > 60 || !/Execution context was destroyed|Target closed|navigation/.test(error.message)) throw error; await page.waitForTimeout(500); }
    }
  };
  // the page has stopped reloading: two reads 800 ms apart both land
  const settle = async () => { for (let i = 0; i < 60; i++) { try { await page.evaluate(() => document.title); await page.waitForTimeout(800); await page.evaluate(() => document.title); return; } catch { await page.waitForTimeout(500); } } };
  return { root, page, errors, census, post, styleOf, settle, read: (file) => readFile(join(root, file), 'utf8') };
}

test('the proposal names the roles the code reaches for, with members, cost and the write; apply makes them the system; undo restores every file', { timeout: 180000 }, async (t) => {
  const s = await site(t); if (!s) return;
  const before = { label: await s.styleOf('eyebrow'), small: await s.styleOf('small-b'), prose: await s.styleOf('prose-a'), row: await s.styleOf('row-body-1'), h2: await s.styleOf('h2'), specimen: await s.styleOf('specimen-label') };
  const first = await s.post('system', { census: await s.census() });
  assert.equal(first.status, 200, JSON.stringify(first.body).slice(0, 400));
  const { proposal } = first.body;
  assert.deepEqual([proposal.rule, proposal.kind, proposal.family], ['system/type-roles', 'system', 'type']);
  // four roles: the 24px headings, 16px body (prose 1.6, lists compact 1.4), 12px caps labels, 11px caps labels
  assert.deepEqual(proposal.roles.map((r) => [r.name, r.places, r.bundle.size, r.bundle.lineHeight, r.bundle.letterSpacing, r.bundle.weight, r.bundle.transform, r.variants?.compact?.lineHeight ?? null]), [
    ['headline-small', 2, 24, 1.5, -0.02, 500, 'none', null], // 1.5: the page's inherited leading, measured
    ['body-large', 4, 16, 1.6, 0, 400, 'none', 1.4],
    ['label-medium', 3, 12, 1.5, 0.08, 400, 'uppercase', null],
    ['label-small', 3, 11, 1.5, 0.08, 400, 'uppercase', null],
  ].map((r) => r));
  const body = proposal.roles.find((r) => r.name === 'body-large');
  assert.deepEqual(body.members.map((m) => [m.tag, m.variant ?? '-', m.delta.size, m.delta.lineHeight]).sort(), [['p', '-', 0, 0], ['p', '-', 0, 0], ['p', '-', 0, 0], ['span', 'compact', 0, 0]].sort());
  // the row label's 0.1em moves to the role's 0.08em: -0.24px at 12px, said in its delta
  const rowLabel = proposal.roles.find((r) => r.name === 'label-medium').members.find((m) => m.tag === 'span' && m.classes.includes('tracking-[0.1em]'));
  assert.deepEqual([rowLabel.delta.letterSpacing, rowLabel.elements, rowLabel.confidence], [-0.24, 4, 'ok']);
  // the specimen is outside by config, never proposed
  assert.deepEqual(proposal.outside.map((o) => [o.site.file, o.why]), [['src/specimen/Specimen.tsx', 'excluded by config: src/specimen']]);
  assert.equal(proposal.cost.places, 12);
  assert.deepEqual([proposal.cost.sizesBefore, proposal.cost.sizesAfter, proposal.cost.classesRemoved], [4, 4, 32]);
  // the write: tokens in the theme's own shape, one utility per role (and the compact body), swaps at every member
  assert.ok(proposal.write.tokens.some((k) => k.name === '--text-label-medium' && k.value === '0.75rem') && proposal.write.tokens.some((k) => k.name === '--text-body-large-compact--line-height' && k.value === '1.4'));
  assert.match(proposal.write.css[0].css, /@utility type-label-medium \{[^}]*text-transform: uppercase;/);
  assert.match(proposal.write.css[0].css, /@utility type-body-large-compact \{[^}]*line-height: var\(--text-body-large-compact--line-height\);/);
  assert.deepEqual(proposal.write.swaps.map((w) => [w.file, w.edits.length]).sort(), [['src/App.tsx', 8], ['src/Labels.tsx', 4]]);
  assert.ok(proposal.write.swaps.every((w) => /^[a-f0-9]{64}$/.test(w.hash)) && proposal.write.tokens.every((k) => k.file === 'src/styles.css' && k.hash));
  // a second reading is the same proposal
  const again = await s.post('system', { census: await s.census() });
  assert.deepEqual(again.body.proposal, proposal);
  // a stale hash writes nothing
  const stale = await s.post('apply-all', { tokens: proposal.write.tokens.map((k) => ({ ...k, hash: 'a'.repeat(64) })) });
  assert.equal(stale.status, 200);
  assert.ok(stale.body.results.tokens.every((r) => !r.ok && /changed since/.test(r.error)), JSON.stringify(stale.body.results.tokens[0]));
  assert.equal(await s.read('src/styles.css'), await readFile(join(repo, 'fixtures/type-roles/src/styles.css'), 'utf8'));
  // apply: the theme, the utilities, every swap; one undo per written file
  const applied = await s.post('apply-all', { tokens: proposal.write.tokens, css: proposal.write.css, swaps: proposal.write.swaps });
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 600));
  assert.ok(applied.body.results.tokens.every((r) => r.ok), JSON.stringify(applied.body.results.tokens));
  assert.deepEqual(applied.body.results.css.map((r) => [r.ok, r.written]), [[true, true]]);
  assert.deepEqual(applied.body.results.swaps.map((r) => [r.file, r.ok, r.applied.length, r.refused.length]).sort(), [['src/App.tsx', true, 8, 0], ['src/Labels.tsx', true, 4, 0]]);
  assert.deepEqual([...new Set(applied.body.undo.map((u) => u.file))].sort(), ['src/App.tsx', 'src/Labels.tsx', 'src/styles.css']);
  const theme = await s.read('src/styles.css');
  assert.match(theme, /--text-label-small: 0\.6875rem;/); assert.match(theme, /@utility type-headline-small \{/);
  const app = await s.read('src/App.tsx');
  assert.match(app, /id="eyebrow" className="type-label-medium"/); assert.match(app, /className="type-body-large-compact"/); assert.doesNotMatch(app, /tracking-\[0\.1em\]/);
  assert.match(await s.read('src/Labels.tsx'), /id="small-b" className="type-label-small"/);
  // the page renders the system (the theme write reloads it): every member's computed bundle is its role's
  for (let i = 0; i < 120; i++) { await s.page.waitForTimeout(500); if ((await s.styleOf('eyebrow')).cls === 'type-label-medium') break; }
  await s.page.waitForTimeout(1500);
  const after = { label: await s.styleOf('eyebrow'), small: await s.styleOf('small-b'), prose: await s.styleOf('prose-a'), row: await s.styleOf('row-body-1'), h2: await s.styleOf('h2'), specimen: await s.styleOf('specimen-label') };
  assert.deepEqual([after.label.size, after.label.transform, after.label.ls], ['12px', 'uppercase', '0.96px']);
  assert.deepEqual([after.small.size, after.small.ls], ['11px', '0.88px']); // 0.1em → 0.08em: the reported -0.22px
  assert.deepEqual([after.prose.size, after.prose.lh, after.row.lh], ['16px', '25.6px', '22.4px']);
  assert.deepEqual([after.h2.size, after.h2.weight, after.h2.ls], [before.h2.size, before.h2.weight, before.h2.ls]);
  assert.deepEqual(after.specimen, before.specimen, 'outside the system, untouched');
  // undo every handle: every file back as it was
  for (const handle of [...applied.body.undo].reverse()) { await s.settle(); const undone = await s.post('undo', { id: handle.id }); assert.equal(undone.status, 200, JSON.stringify(undone.body)); }
  await s.settle();
  for (const file of ['src/styles.css', 'src/App.tsx', 'src/Labels.tsx']) assert.equal(await s.read(file), await readFile(join(repo, 'fixtures/type-roles', file), 'utf8'), file);
  assert.deepEqual(s.errors, []);
});

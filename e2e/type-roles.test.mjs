// The type system a codebase is reaching for (docs/research/type-roles.md): the proposal from POST system, its
// write through apply-all, undo, exclusions and the stale-hash guard. Real Vite, real Chromium.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  // this test's own decisions and page (the fixture is shared): the owner's prose leading, and a code block, which is never reading text
  await writeFile(join(root, 'plumber.config.ts'), "export default { css: 'src/styles.css', source: ['src/**/*.{tsx,css}'], system: { exclude: ['src/specimen'], type: { roles: { prose: { lineHeight: 1.6 } } } } };\n");
  const app = join(root, 'src/App.tsx');
  await writeFile(app, (await readFile(app, 'utf8')).replace('      <Labels />', '      <pre id="code" className="text-[13px] leading-[1.6] font-mono">npm run dev</pre>\n      <Labels />'));
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
  // a session still warming up answers 503 starting: asked again, as the overlay does. Sent from the test, as the page's
  // own origin would, so a reload a theme write causes never cuts a request off
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const post = async (method, body) => {
    for (let i = 0; ; i++) {
      const r = await fetch(`${origin}/__plumb/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify(body) });
      const out = { status: r.status, body: await r.json() };
      if (out.status !== 503 || i > 60) return out;
      await new Promise((res) => setTimeout(res, 1000));
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

// docs/design/token-spec.md §2: roles worked out from the code, decided by size alone; another weight is Tailwind's
// font-* class beside the role; reading text keeps its leading with leading-prose; colour is never in a style
test('roles come from the code, one per size; weight and reading leading ride beside the role; apply renders it; undo restores every file', { timeout: 180000 }, async (t) => {
  const s = await site(t); if (!s) return;
  const ids = ['eyebrow', 'small-b', 'lead', 'prose-a', 'inherit', 'row-body-1', 'card-title-a', 'card-lead-a', 'h2', 'code', 'specimen-label'];
  const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await s.styleOf(id)])));
  const original = Object.fromEntries(await Promise.all(['src/styles.css', 'src/App.tsx', 'src/Labels.tsx'].map(async (f) => [f, await s.read(f)])));
  const first = await s.post('system', { census: await s.census() });
  assert.equal(first.status, 200, JSON.stringify(first.body).slice(0, 400));
  const { proposal } = first.body;
  // the sizes the code uses, one role each, named on our scheme; no scale from outside the code. The 13px code block
  // lands on the theme's own 14px step (--text-sm), within 1px of it
  assert.deepEqual(proposal.roles.map((r) => [r.name, r.bundle.size, r.sizeFrom]), [['headline-small', 24, 'mode'], ['title-medium', 17, 'mode'], ['body-large', 16, 'mode'], ['body-small', 14, 'theme'], ['label-medium', 12, 'mode'], ['label-small', 11, 'mode']]);
  // a 17px title and a 17px lead are one role at two weights: the usual one is the role's, the other rides beside it
  const title = proposal.roles.find((r) => r.name === 'title-medium');
  assert.deepEqual([title.places, title.weights.length], [4, 1]);
  const edits = Object.fromEntries(proposal.write.swaps.flatMap((w) => w.edits).map((e) => [e.from, e.to]));
  assert.equal(edits['text-[17px] font-semibold'] === 'type-title-medium font-semibold' || edits['text-[17px]'] === 'type-title-medium font-normal', true, JSON.stringify(edits));
  // reading text keeps the owner's leading beside its role; list bodies take the role's own; code is never reading text
  assert.deepEqual(proposal.prose, { lineHeight: 1.6, places: 3, from: 'decision' });
  assert.equal(edits['text-[1rem] leading-[1.6]'], 'type-body-large leading-prose');
  assert.equal(edits['text-[1rem] leading-[1.4]'], 'type-body-large');
  assert.equal(edits['text-[13px] leading-[1.6]'], 'type-body-small');
  // a style never carries a colour
  assert.doesNotMatch(proposal.write.css[0].css, /(^|[^-])color:/m);
  assert.ok(proposal.write.tokens.some((k) => k.name === '--leading-prose' && k.value === '1.6'));
  assert.deepEqual(proposal.outside.map((o) => [o.site.file, o.why]), [['src/specimen/Specimen.tsx', 'excluded by config: src/specimen']]);
  // a second reading is the same proposal
  assert.deepEqual((await s.post('system', { census: await s.census() })).body.proposal, proposal);
  // apply: every write lands, one undo per file
  const applied = await s.post('apply-all', { tokens: proposal.write.tokens, css: proposal.write.css, swaps: proposal.write.swaps });
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 600));
  for (const r of [...applied.body.results.tokens, ...applied.body.results.css, ...applied.body.results.swaps]) assert.ok(r.ok && !(r.refused?.length), JSON.stringify(r));
  assert.deepEqual([...new Set(applied.body.undo.map((u) => u.file))].sort(), ['src/App.tsx', 'src/Labels.tsx', 'src/styles.css']);
  // the page renders the system (the theme write reloads it)
  for (let i = 0; i < 120; i++) { await s.page.waitForTimeout(500); if (/type-label-medium/.test((await s.styleOf('eyebrow')).cls)) break; }
  await s.page.waitForTimeout(1500);
  const after = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await s.styleOf(id)])));
  // weight kept where the code set it: titles semibold, leads regular, under one role
  assert.deepEqual([after['card-title-a'].weight, after['card-lead-a'].weight, after['card-title-a'].size, after['card-lead-a'].size], ['600', '400', '17px', '17px']);
  // reading text at the owner's 1.6, lists at the role's 1.4, a paragraph that set none takes the role's
  assert.deepEqual([after['prose-a'].lh, after.lead.lh, after['row-body-1'].lh, after.inherit.lh], ['25.6px', '25.6px', '22.4px', '22.4px']);
  // caps labels keep their tracking; a heading looks as it did
  assert.deepEqual([after.eyebrow.size, after.eyebrow.transform, after.eyebrow.ls], ['12px', 'uppercase', '0.96px']);
  assert.deepEqual([after.h2.size, after.h2.weight, after.h2.ls], [before.h2.size, before.h2.weight, before.h2.ls]);
  assert.deepEqual(after['specimen-label'], before['specimen-label'], 'outside the system, untouched');
  // undo every handle: every file back as it was
  for (const handle of [...applied.body.undo].reverse()) { await s.settle(); const undone = await s.post('undo', { id: handle.id }); assert.equal(undone.status, 200, JSON.stringify(undone.body)); }
  await s.settle();
  for (const file of ['src/styles.css', 'src/App.tsx', 'src/Labels.tsx']) assert.equal(await s.read(file), original[file], file);
  assert.deepEqual(s.errors, []);
});

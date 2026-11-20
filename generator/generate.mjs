// The organism generator, end to end, for one product:
//   match     library parts that do each slot's job with content the product really has (match.mjs)
//   install   the ones with an adapter, from their registries (playground/install.mjs)
//   bridge    their variables answered by the product's tokens; in a slot, the look of the house part (bridge.mjs)
//   build     every variant in the product's real component, in the playground (OfferCard.jsx)
//   judge     plumber's craft engine on each card: a variant that adds a note the house card hasn't got is dropped
//   case      for each survivor: what is weak now, what changes, why, and proof
//   sheet     generator/shots/generate-<product>.png, and generator/generated/<product>.json
//   node generator/generate.mjs craftingattention
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { match } from './match.mjs';
import { bridge } from './bridge.mjs';
import { installPart } from './playground/install.mjs';
import { MOLECULES } from './molecules.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const id = process.argv[2] ?? 'craftingattention';
const { product } = await import(`./products/${id}.mjs`);
const PORT = 4399, URL_ = `http://localhost:${PORT}/`;
const say = (s) => console.log(`· ${s}`);

// 1. match, and keep the candidates the playground can place (an adapter says how the content becomes props)
const adapters = await readFile(`${here}playground/adapters.jsx`, 'utf8');
const placeable = (p) => adapters.includes(`'${p.lib}/${p.name}'`);
const matched = await match(product, { per: 12 });
const bySlot = {}, unplaced = {};
for (const [slot, m] of Object.entries(matched)) {
  bySlot[slot] = m.candidates.filter(placeable);
  unplaced[slot] = m.candidates.filter((p) => !placeable(p)).map((p) => `${p.lib}/${p.name}`);
  say(`${slot}: ${bySlot[slot].map((p) => `${p.lib}/${p.name}`).join(', ') || 'nothing placeable'}${unplaced[slot].length ? `  (${unplaced[slot].length} more matched, no adapter yet)` : ''}`);
}

// 2. install, 3. bridge (with the house part's look in each slot, from the specimen's sidecar)
const parts = [];
for (const p of Object.values(bySlot).flat()) parts.push({ ...p, files: (await installPart(p)) ?? [] });
const sidecar = JSON.parse(await readFile(`${here}sidecars/${product.organism.specimen}.json`, 'utf8')).sidecar;
const looks = {}; const ps = sidecar.slots.price;
if (ps) looks.price = { font: `"${ps.fontFamily}", var(--font-mono)`, size: ps.fontSize, color: 'var(--color-accent-solid)' };
const b = await bridge(product, parts.map((p) => ({ dir: `${here}playground`, files: p.files })), { scope: '[data-variant]', slotLooks: looks });
await writeFile(`${here}playground/bridge.generated.css`, b.css);
say(`bridge: ${b.answered} variables answered by ${product.name}'s tokens; it already defines ${b.own.length}; unanswered: ${b.missed.join(' ') || 'none'}`);

// 4. variants: the house card, each part alone, and each pairing across slots
const variants = [{ id: 'house', parts: {} }];
const slots = Object.keys(bySlot).filter((s) => bySlot[s].length);
for (const s of slots) for (const p of bySlot[s]) variants.push({ id: `${p.name}`, parts: { [s]: `${p.lib}/${p.name}` } });
if (slots.length > 1) {
  const [a, c] = slots;
  for (const p of bySlot[a]) for (const q of bySlot[c]) variants.push({ id: `${p.name}+${q.name}`, parts: { [a]: `${p.lib}/${p.name}`, [c]: `${q.lib}/${q.name}` } });
}
await writeFile(`${here}playground/variants.generated.json`, JSON.stringify(variants, null, 1));
say(`${variants.length - 1} variants written`);

// 5. build and judge in the playground
execFileSync(`${process.env.HOME}/.claude/bin/dev-server`, [`${here}playground`, `${product.root}/node_modules/.bin/vite`, '--config', 'vite.config.mjs', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const engine = (await readFile(`${here}reads/craft.iife.js`, 'utf8')).replaceAll('{}.url', '"http://plumb.invalid/overlay/src/craft.js"');
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  for (let i = 0; i < 40; i++) { try { await page.goto(URL_, { waitUntil: 'networkidle', timeout: 30000 }); break; } catch { await page.waitForTimeout(1500); } }
  await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
  await page.waitForTimeout(2500);
  await page.addScriptTag({ content: engine });
  await mkdir(`${here}shots/generate`, { recursive: true });
  for (const v of variants) {
    const card = page.locator(`[data-variant="${v.id}"] .lifetime-offer`).first();
    await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(1800); // a count-up or roll lands
    const path = `${here}shots/generate/${id}-${v.id.replace(/\W+/g, '-')}.png`;
    await card.screenshot({ path });
    const notes = await page.evaluate((vid) => {
      const card = document.querySelector(`[data-variant="${vid}"] .lifetime-offer`);
      const els = [card, ...card.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const craft = new PlumbCraft.Craft({ theme: new PlumbCraft.Theme({ decisions: () => [] }) });
      const out = craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'variant', line: 1, column: 1 })));
      return out.flatMap((i) => i.marks.filter((m) => m.family === 'craft').map((m) => ({ rule: m.rule, what: m.what ?? '', title: m.title ?? '', slot: i.el.closest('[data-slot]')?.dataset.slot ?? null })));
    }, v.id);
    results.push({ ...v, path, notes });
  }
} finally { await browser.close(); execFileSync(`${process.env.HOME}/.claude/bin/dev-server`, ['--stop', `${here}playground`], { stdio: 'ignore' }); }

// 6. judge and make the case
// only the card's own notes count: page-wide ones (a page with no main heading, a font still loading) are about the
// playground page around it, and the same for every variant
const PAGE = /heading-missing|page-heading|font-swap|font-load|landmark|^a11y\/(skip|lang)/;
for (const r of results) r.notes = r.notes.filter((n) => !PAGE.test(n.rule) && !/^Page with|while its font/.test(n.what));
const house = results.find((r) => r.id === 'house');
const key = (n) => `${n.rule}|${n.slot ?? ''}`;
const had = new Set(house.notes.map(key));
const A = await import(`${here}playground/adapters.jsx`).catch(() => null); // jsx can't load in node: read the `does` lines instead
const does = Object.fromEntries([...adapters.matchAll(/'([a-z]+\/[a-z0-9-]+)': \{ slot: '[a-z]+', does: '([^']+)'/g)].map((m) => [m[1], m[2]]));
const isOf = (slot) => MOLECULES.find((m) => m.specimen === product.organism.specimen && m.job === slot)?.is ?? '';
for (const r of results) {
  const added = r.notes.filter((n) => !had.has(key(n)));
  const removed = house.notes.filter((n) => !r.notes.some((x) => key(x) === key(n)));
  r.verdict = r.id === 'house' ? 'house' : added.length ? 'dropped' : 'kept';
  r.case = r.id === 'house' ? null : {
    now: house.notes.length ? house.notes.map((n) => n.what || n.title).filter(Boolean).join('; ') : 'plumber finds nothing wrong with the card as it is',
    change: Object.entries(r.parts).map(([s, p]) => `${s}: ${does[p] ?? p} (${p})`).join(' · '),
    why: Object.keys(r.parts).map((s) => isOf(s) || `the ${s} has no part on the live page to learn from (it is in the product's source only)`).join(' '),
    proof: `${house.notes.length} notes before, ${r.notes.length} after; ${added.length} added${added.length ? ` (${added.map((n) => n.what || n.rule).join(', ')})` : ''}, ${removed.length} resolved`,
  };
}
await mkdir(`${here}generated`, { recursive: true });
await writeFile(`${here}generated/${id}.json`, JSON.stringify({ product: product.name, matched: Object.fromEntries(Object.entries(bySlot).map(([s, l]) => [s, l.map((p) => `${p.lib}/${p.name}`)])), unplaced, bridge: { answered: b.answered, own: b.own, missed: b.missed }, results: results.map(({ path, ...r }) => r) }, null, 1));
for (const r of results) say(`${r.verdict.padEnd(7)} ${r.id}${r.case ? `  — ${r.case.proof}` : `  (${r.notes.length} notes)`}`);

// 7. the sheet
const img = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const cell = async (r) => `<figure class="${r.verdict}"><img src="${await img(r.path)}"><figcaption><b>${r.id === 'house' ? 'As it is (house parts)' : r.id}</b><i>${r.verdict}</i>${r.case ? `<dl><dt>Now</dt><dd>${r.case.now}</dd><dt>Change</dt><dd>${r.case.change}</dd><dt>Why</dt><dd>${r.case.why}</dd><dt>Proof</dt><dd>${r.case.proof}</dd></dl>` : ''}</figcaption></figure>`;
const order = [house, ...results.filter((r) => r.verdict === 'kept'), ...results.filter((r) => r.verdict === 'dropped')];
const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:13px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:19px;margin:0 0 4px}h1+p{margin:0 0 18px;color:#555}main{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start}figure{margin:0;background:#fff;border-radius:12px;padding:12px}figure.dropped{opacity:.55}img{width:100%;border-radius:6px}figcaption{margin-top:8px}figcaption i{margin-left:8px;font-style:normal;color:#1a9460}.dropped i{color:#bf3a1e}dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:8px 0 0}dt{color:#888}dd{margin:0}</style>
  <h1>${product.name}: the offer card, generated from library parts</h1><p>${variants.length - 1} variants built in the product's own component; ${results.filter((r) => r.verdict === 'kept').length} kept, ${results.filter((r) => r.verdict === 'dropped').length} dropped by plumber's eye. Bridge: ${b.answered} variables answered by the product's tokens.</p><main>${(await Promise.all(order.map(cell))).join('')}</main>`;
const browser2 = await chromium.launch(); const sp = await browser2.newPage({ viewport: { width: 1600, height: 900 } });
await sp.setContent(html); await sp.waitForTimeout(300); await sp.screenshot({ path: `${here}shots/generate-${id}.png`, fullPage: true }); await browser2.close();
say(`sheet: generator/shots/generate-${id}.png`);

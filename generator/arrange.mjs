// The first real test of the generator (brief, layer 3, on a house component): crafting attention's own parts,
// rearranged on its own live page into the structure of a kept reference, so every font, colour and space is the
// product's and nothing is redrawn. Each variant replaces the offer card in place; the section around it stays.
//   node generator/arrange.mjs   → generator/shots/arrange-<id>.png and arrange-sheet.png (local)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('./', import.meta.url));
// parts by name → the real element on the shipped card (generator/molecules.mjs names the same ones)
const PARTS = `({
  header: card.querySelector('.lifetime-offer-top'),
  headline: card.querySelector('.lifetime-offer-copy h3'),
  price: card.querySelector('.lifetime-price'),
  pass: card.querySelector('svg.lifetime-art'),
  note: [...card.querySelectorAll('.lifetime-offer-copy p')].find((p) => /parity|price/i.test(p.innerText) && !/Instant/.test(p.innerText)),
  button: card.querySelector('.home-button.primary'),
  reassure: [...card.querySelectorAll('*')].find((e) => /^Instant lifetime access/.test((e.innerText || '').trim()) && e.childElementCount < 4),
  benefits: section.querySelector('.pricing-included ul'),
})`;
// each variant: whose structure it borrows, and its parts top to bottom. A row is [a, b]; 'divider' is a rule in the
// card's own edge colour. `benefits` moves the list into the card and lets the card take the section's width.
const VARIANTS = [
  { id: 'original', from: 'as shipped', order: null },
  { id: 'arc-lifetime', from: 'Arc’s lifetime card: outcome headline, a price that dominates, a rule, the list, then the button',
    order: ['header', 'headline', 'price', 'note', 'divider', 'benefits', 'button', 'reassure'] },
  { id: 'supabase-order', from: 'Supabase’s order: what it is for and the button first, the price after',
    order: ['header', 'headline', 'button', 'reassure', 'divider', ['price', 'pass'], 'note', 'benefits'] },
  { id: 'bencho', from: 'Bencho’s card: the deal at the top, the list, the button held at the bottom with its note',
    order: ['header', ['price', 'pass'], 'headline', 'benefits', 'spacer', 'button', 'reassure'] },
  { id: 'control', from: 'no reference: only the placement rules (identity, price, proof, action)',
    order: ['header', 'headline', 'price', 'benefits', 'note', 'button', 'reassure'] },
];

const browser = await chromium.launch();
const shots = [];
try {
  for (const v of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, bypassCSP: true });
    await page.goto('https://craftingattention.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.evaluate(({ order, PARTS }) => {
      for (const e of document.querySelectorAll('body *')) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') e.style.setProperty('display', 'none', 'important'); }
      const section = document.querySelector('#pricing'), card = section.querySelector('.lifetime-offer');
      section.scrollIntoView({ block: 'start' });
      if (!order) return;
      const parts = new Function('card', 'section', `return ${PARTS}`)(card, section);
      const cs = getComputedStyle(card), copy = card.querySelector('.lifetime-offer-copy');
      const gap = parseFloat(getComputedStyle(copy).rowGap) || 20;
      const edge = cs.borderTopColor;
      // the card keeps its own element and classes, so its ground, edge, corner and padding are the product's
      const next = card.cloneNode(false), body = copy.cloneNode(false);
      Object.assign(body.style, { display: 'flex', flexDirection: 'column', gap: `${gap}px`, flex: '1' });
      Object.assign(next.style, { display: 'flex', flexDirection: 'column', gap: `${gap}px` });
      const take = (name) => {
        if (name === 'divider') { const hr = document.createElement('div'); hr.style.cssText = `height:0;border-top:1px solid ${edge};margin:4px 0`; return hr; }
        if (name === 'spacer') { const s = document.createElement('div'); s.style.cssText = 'flex:1;min-height:8px'; return s; }
        const el = parts[name]; if (!el) return null;
        const c = el.cloneNode(true);
        if (name === 'benefits') { const wrap = section.querySelector('.pricing-included').cloneNode(false); wrap.append(c); wrap.style.margin = '0'; return wrap; }
        return c;
      };
      const header = order[0] === 'header' ? take('header') : null;
      if (header) next.append(header);
      for (const item of order.slice(header ? 1 : 0)) {
        if (Array.isArray(item)) {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px';
          for (const n of item) { const c = take(n); if (c) row.append(c); }
          body.append(row);
        } else { const c = take(item); if (c) body.append(c); }
      }
      next.append(body);
      card.replaceWith(next);
      // the list moved into the card: the column it came from goes, and the card takes the section's width
      if (order.includes('benefits')) { section.querySelector('.pricing-details')?.style.setProperty('display', 'none'); next.style.gridColumn = '1 / -1'; next.style.maxWidth = '620px'; }
    }, { order: v.order, PARTS });
    await page.waitForTimeout(800);
    const path = `${here}shots/arrange-${v.id}.png`;
    await page.locator('#pricing .pricing-layout').screenshot({ path });
    shots.push({ ...v, path });
    console.log(`${v.id.padEnd(16)} done`);
    await page.close();
  }
  const fig = async (v) => `<figure><img src="data:image/png;base64,${(await readFile(v.path)).toString('base64')}"><figcaption><b>${v.id === 'original' ? 'As shipped' : v.id.replace(/-/g, ' ')}</b><span>${v.from}</span></figcaption></figure>`;
  const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:19px;margin:0 0 18px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}figure{margin:0;background:#fff;border-radius:12px;padding:12px}img{width:100%;border-radius:6px}figcaption{display:flex;flex-direction:column;gap:2px;margin-top:8px}figcaption b{text-transform:capitalize}span{color:#555}</style><h1>Crafting attention’s pricing, rearranged from its own parts</h1><main>${(await Promise.all(shots.map(fig))).join('')}</main>`;
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.setContent(html); await page.waitForTimeout(300);
  await page.screenshot({ path: `${here}shots/arrange-sheet.png`, fullPage: true });
} finally { await browser.close(); }

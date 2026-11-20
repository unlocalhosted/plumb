// The directions sheet: a product's organism as shipped beside each whole-card direction the composer drew from a kept
// reference, each with the one idea behind it. Needs the product's playground running on 4399.
//   node generator/directions-sheet.mjs craftingattention
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const id = process.argv[2] ?? 'craftingattention';
const { product } = await import(`./products/${id}.mjs`);
const dirs = JSON.parse(await readFile(`${here}playground/${id}/directions.generated.json`, 'utf8'));
// the idea of each direction, the way a designer would put it to a client
const IDEA = {
  'bencho-forever': 'The deal first. A dark card holds the price and what you get together, and the button sits at the end, where the reading stops.',
  'linear-basic': 'No card at all. The name and the price open a plain column and the list does the selling. Quiet, for a page that is already busy.',
  'supabase-pro': 'Who it is for, and the button, straight away. The price and the list come after, for the people who read on.',
  'uiarc-free': 'One line: the pass, the name and the price side by side. For a page where pricing is a footnote rather than a section.',
  'uiarc-lifetime': 'The price as the hero: a founding chip, one big figure, a rule, then the list and the button.',
};
await mkdir(`${here}shots/directions`, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4399/directions.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const shots = [];
const shoot = async (sel, name) => { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); const p = `${here}shots/directions/${id}-${name}.png`; await el.screenshot({ path: p }); return p; };
shots.push({ id: 'As shipped', idea: 'The card on the live page today, from its own source.', path: await shoot(`[data-variant="shipped"] ${product.organism.card}`, 'shipped') });
for (const d of dirs) shots.push({ id: `From ${d.id}`, idea: IDEA[d.id] ?? '', path: await shoot(`[data-variant="${d.id}"] [data-direction]`, d.id) });
const img = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:20px;margin:0 0 18px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}figure{margin:0;background:#fff;border-radius:12px;padding:14px}.img{display:grid;place-items:center;background:#faf9f7;border-radius:8px;padding:14px}img{max-width:100%}figcaption{margin-top:10px}b{display:block;margin-bottom:2px}</style><h1>${product.name}: ${product.organism.name}, in whole-card directions</h1><main>${(await Promise.all(shots.map(async (s) => `<figure><div class="img"><img src="${await img(s.path)}"></div><figcaption><b>${s.id}</b>${s.idea}</figcaption></figure>`))).join('')}</main>`;
const sp = await b.newPage({ viewport: { width: 1600, height: 900 } });
await sp.setContent(html); await sp.waitForTimeout(300);
await sp.screenshot({ path: `${here}shots/directions-${id}.png`, fullPage: true });
await b.close();
console.log(`shots/directions-${id}.png`);

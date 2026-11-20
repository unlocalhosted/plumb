// The atoms sheet: each form of a product's atom twice, at rest and in the middle of its gesture (half-slid, half-held,
// opened, answering), since what differs between forms is how you use them. Needs the playground running on 4399.
//   node generator/atoms-sheet.mjs craftingattention
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const id = process.argv[2] ?? 'craftingattention';
// the gesture that shows each form at work, and what the second picture is
const GESTURE = {
  house: ['hover', 'pointed at'], 'beui/slide-action-button': ['slide', 'slid two thirds across'], 'beui/hold-action-button': ['hold', 'held half way'],
  'arc/hold-to-confirm': ['hold', 'held half way'], 'arc/confirm-morph': ['click', 'pressed: it asks'], 'beui/button-stateful': ['click', 'pressed: it answers'],
  'beui/button-magnetic': ['near', 'the pointer nearby'],
};
await mkdir(`${here}shots/atoms`, { recursive: true });
const b = await chromium.launch();
const shots = [];
for (const [form, [g, says]] of Object.entries(GESTURE)) {
  const page = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4399/atoms.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000);
  const card = page.locator(`[data-form="${form}"]`), stage = card.locator('.atom-stage');
  await stage.scrollIntoViewIfNeeded();
  const name = form.replace(/\W+/g, '-');
  const rest = `${here}shots/atoms/${id}-${name}-rest.png`; await stage.screenshot({ path: rest });
  const box = await stage.boundingBox(), target = stage.locator('button, [role="button"]').first(), t = await target.boundingBox();
  const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
  if (g === 'hover') { await page.mouse.move(cx, cy); await page.waitForTimeout(400); }
  if (g === 'near') { await page.mouse.move(t.x + t.width * 0.8, t.y - 18, { steps: 6 }); await page.waitForTimeout(500); }
  if (g === 'click') { await page.mouse.click(cx, cy); await page.waitForTimeout(form === 'arc/confirm-morph' ? 700 : 350); }
  if (g === 'hold') { await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(550); }
  if (g === 'slide') { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + box.width * 0.55, cy, { steps: 12 }); await page.waitForTimeout(250); }
  const mid = `${here}shots/atoms/${id}-${name}-mid.png`; await stage.screenshot({ path: mid });
  const [title, why] = await card.evaluate((c) => [c.querySelector('h3').textContent, c.querySelector('p').textContent]);
  shots.push({ form, title, why, rest, mid, says });
  await page.close();
}
const img = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const row = async (s) => `<figure><div class="pair"><div><img src="${await img(s.rest)}"><i>at rest</i></div><div><img src="${await img(s.mid)}"><i>${s.says}</i></div></div><figcaption><b>${s.title}</b> ${s.why} <code>${s.form === 'house' ? 'shipped' : s.form}</code></figcaption></figure>`;
const html = `<style>body{margin:0;padding:28px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:20px;margin:0 0 18px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#fff;border-radius:12px;padding:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pair div{background:#f6f4fb;border-radius:8px;padding:6px;display:grid;justify-items:center}img{max-width:100%}i{font-style:normal;font-size:12px;color:#888;margin-top:2px}figcaption{margin-top:10px;color:#444}figcaption b{color:#1d1b17;margin-right:4px}code{display:block;font:11px ui-monospace,monospace;color:#999;margin-top:4px}</style><h1>Crafting attention's buy button: one job, seven ways to do it, all in its own skin</h1><main>${(await Promise.all(shots.map(row))).join('')}</main>`;
const sp = await b.newPage({ viewport: { width: 1500, height: 900 } });
await sp.setContent(html); await sp.waitForTimeout(300);
await sp.screenshot({ path: `${here}shots/atoms-${id}.png`, fullPage: true });
await b.close();
console.log(`shots/atoms-${id}.png`);

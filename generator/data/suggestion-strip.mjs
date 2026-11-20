// A filmstrip of a real click on each of our suggestions, for the owner: at rest, pointed at, pressed, just after, and
// a second on, side by side, one row per suggestion.
//   node generator/data/suggestion-strip.mjs <out.png>   (the playground on 4399)
import { chromium } from 'playwright';
const FORMS = process.argv[3] ? process.argv[3].split(',') : ['native/pour', 'native/lead', 'native/answer', 'native/sheen'];
const b = await chromium.launch(); const rows = [];
for (const f of FORMS) {
  const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => { window.__judging = true; });
  await p.goto('http://localhost:4399/atoms.html?atom=buy', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  // plumber's own bar sits at the bottom of the window: the pictures are of the button, not the tool
  await p.addStyleTag({ content: 'plumb-overlay { display: none !important; }' });
  const stage = p.locator(`[data-form="${f}"] .atom-stage button`).first(); await stage.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  const r = await stage.boundingBox(), clip = { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 };
  const name = await p.evaluate((f) => document.querySelector(`[data-form="${f}"] h3`).textContent, f);
  const shots = [];
  await p.mouse.move(r.x + r.width * 0.3, r.y - 120); await p.waitForTimeout(200); shots.push(await p.screenshot({ clip }));
  await p.mouse.move(r.x + r.width * 0.3, r.y + r.height / 2, { steps: 4 }); await p.waitForTimeout(220); shots.push(await p.screenshot({ clip }));
  await p.mouse.down(); await p.waitForTimeout(150); shots.push(await p.screenshot({ clip }));
  await p.mouse.up(); await p.waitForTimeout(200); shots.push(await p.screenshot({ clip }));
  await p.waitForTimeout(900); shots.push(await p.screenshot({ clip }));
  rows.push({ name, shots, w: clip.width }); await p.close();
}
const cols = ['at rest', 'pointed at', 'pressed', 'let go', 'a second on'];
const html = `<body style="margin:0;background:#fff;font:15px system-ui;padding:24px;color:#222">
<div style="display:grid;grid-template-columns:200px repeat(5, ${rows[0].w * 0.62}px);gap:10px 12px;align-items:center">
<span></span>${cols.map((c) => `<b style="font-weight:600;color:#666">${c}</b>`).join('')}
${rows.map((r) => `<b style="font-weight:700">${r.name}</b>${r.shots.map((s) => `<img style="width:100%" src="data:image/png;base64,${s.toString('base64')}">`).join('')}`).join('')}</div></body>`;
const q = await b.newPage({ viewport: { width: 200 + rows[0].w * 0.62 * 5 + 120, height: 100 }, deviceScaleFactor: 2 }); await q.setContent(html);
await q.screenshot({ path: process.argv[2], fullPage: true }); await b.close();

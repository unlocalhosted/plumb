// A realistic gesture on one form of the atoms page with a prototype on (?proto=), and a picture of its card after.
//   node generator/data/proto-shot.mjs scrub beui/slide-action-button   → shots/proto-<name>-<form>.png
import { chromium } from 'playwright';
const [proto = 'scrub', form = 'beui/slide-action-button'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
await p.goto(`http://localhost:4399/atoms.html?atom=buy&proto=${proto}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
const card = p.locator(`[data-form="${form}"]`); await card.locator('.atom-stage').evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
const g = await p.evaluate((form) => { const s = document.querySelector(`[data-form="${form}"]`); const st = s.querySelector('.atom-stage'); const e = st.querySelector('button,[role=button]') ?? st.firstElementChild; const r = e.getBoundingClientRect(), W = st.firstElementChild.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: W.width, gesture: s.dataset.gesture }; }, form);
await p.mouse.move(g.x, g.y - 80); await p.mouse.move(g.x, g.y, { steps: 6 }); await p.waitForTimeout(250);
await p.mouse.down();
if (g.gesture === 'slide') { for (let i = 1; i <= 30; i++) { await p.mouse.move(g.x + (g.w * 0.5 * i) / 30, g.y); await p.waitForTimeout(25); } await p.waitForTimeout(proto === 'thermal' ? 250 : 700); }
else await p.waitForTimeout(g.gesture === 'hold' ? 700 : 150);
const out = `shots/proto-${proto}-${form.replace(/\W+/g, '-')}.png`;
// a prototype that shows something while the button is in use (thermal) gets a picture mid-gesture too
if (proto === 'thermal') await card.screenshot({ path: out.replace('.png', '-held.png') });
await p.mouse.up(); await p.waitForTimeout(2000);
// the dial: hover it first so pointed-at is caught, then turn it to the first state plumber finds wrong (or mid-gesture)
if (proto === 'dial') { await p.mouse.move(g.x, g.y - 200); await p.waitForTimeout(200); await p.mouse.move(g.x, g.y, { steps: 4 }); await p.waitForTimeout(500); await p.mouse.move(g.x, g.y + 400); await p.waitForTimeout(300);
  await card.screenshot({ path: out.replace('.png', '-live.png') });
  const pip = card.locator('.dial-pip.bad').first(); await ((await pip.count()) ? pip : card.locator('.dial-pip').nth(3)).click(); await p.waitForTimeout(500); }
await card.screenshot({ path: out }); await b.close(); console.log(out);

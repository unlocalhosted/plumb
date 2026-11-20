import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4399/atoms.html?atom=buy', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
const btn = p.locator('[data-form="native/pour"] .pour'); await btn.scrollIntoViewIfNeeded(); const r = await btn.boundingBox();
const clip = { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 };
const shots = [];
await p.mouse.move(r.x + r.width * 0.25, r.y + r.height / 2); await p.waitForTimeout(300);
shots.push(await p.screenshot({ clip }));
await p.mouse.down();
for (const t of [90, 180, 300]) { await p.waitForTimeout(t === 90 ? 90 : t === 180 ? 90 : 120); shots.push(await p.screenshot({ clip })); }
await p.mouse.up(); await p.waitForTimeout(450); shots.push(await p.screenshot({ clip }));
const html = `<body style="margin:0;background:#fff;font:600 22px system-ui;padding:20px">${shots.map((s, i) => `<div style="display:flex;align-items:center;gap:20px;margin-bottom:8px"><span style="width:220px;color:#555">${['at rest', 'pressed, 0.1 s', 'pressed, 0.2 s', 'pressed, 0.3 s', 'let go'][i]}</span><img style="width:${clip.width}px" src="data:image/png;base64,${s.toString('base64')}"></div>`).join('')}</body>`;
const q = await b.newPage({ viewport: { width: clip.width + 300, height: 100 }, deviceScaleFactor: 2 }); await q.setContent(html);
await q.screenshot({ path: process.argv[2], fullPage: true }); await b.close();

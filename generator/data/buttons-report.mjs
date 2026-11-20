// What the button data holds: every harvested button read into recipe fields (data/buttons.json), laid out so a person
// can see the shape of it: how buttons commit, what they do with their words, their tricks, their springs' physics,
// what they hard-code, and a gallery of the ones that aren't plain presses.
//   node generator/data/buttons-report.mjs   → generator/shots/buttons.html and buttons.png
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const d = JSON.parse(await readFile(`${here}buttons.json`, 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const count = (f) => { const c = {}; for (const r of d) for (const v of [].concat(f(r))) c[v] = (c[v] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]); };
const bars = (title, rows, note = '') => { const max = Math.max(...rows.map((r) => r[1])); return `<section class="bars"><h3>${title}</h3>${note ? `<p class="note">${note}</p>` : ''}${rows.map(([k, n]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join('')}</section>`; };
// the springs, as dots: damping ratio across, settle time up
const S = d.flatMap((r) => r.springs.map((s) => ({ z: s.zeta, t: parseInt(s.settle), id: r.id })));
const W = 520, H = 260, px = (z) => 40 + Math.min(z, 2) / 2 * (W - 60), py = (t) => H - 30 - Math.min(t, 1000) / 1000 * (H - 50);
const scatter = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect x="${px(0)}" y="10" width="${px(0.6) - px(0)}" height="${H - 40}" fill="#fdf0e8"/><rect x="${px(0.97)}" y="10" width="${px(2) - px(0.97)}" height="${H - 40}" fill="#eaf4ee"/>
  ${S.map((s) => `<circle cx="${px(s.z).toFixed(1)}" cy="${py(s.t).toFixed(1)}" r="2.4" fill="#5b3fd1" fill-opacity=".35"/>`).join('')}
  <line x1="40" y1="${H - 30}" x2="${W - 20}" y2="${H - 30}" stroke="#bbb"/><line x1="40" y1="10" x2="40" y2="${H - 30}" stroke="#bbb"/>
  ${[0, 0.5, 1, 1.5, 2].map((z) => `<text x="${px(z)}" y="${H - 12}" font-size="10" text-anchor="middle" fill="#888">${z}</text>`).join('')}
  ${[0, 250, 500, 750, 1000].map((t) => `<text x="34" y="${py(t) + 3}" font-size="10" text-anchor="end" fill="#888">${t}</text>`).join('')}
  <text x="${px(0.3)}" y="24" font-size="10" text-anchor="middle" fill="#b0603a">bouncy</text><text x="${px(1.4)}" y="24" font-size="10" text-anchor="middle" fill="#2f8a57">no bounce</text>
  <text x="${W / 2}" y="${H}" font-size="10" text-anchor="middle" fill="#888">damping ratio</text></svg>`;
const odd = d.filter((r) => r.found === 'named' && r.driver !== 'press').sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0)).slice(0, 24);
const card = (r) => `<article><b>${esc(r.name)}</b><code>${esc(r.id)}</code><p>${esc(r.description).slice(0, 140)}</p><div class="tags"><span>${r.driver}</span><span>${r.commitRule}</span>${r.secondsToCommit != null && r.commitRule !== 'press' ? `<span>${r.secondsToCommit}s</span>` : ''}<span>words ${r.wordsDuringAction}</span>${r.tricks.map((t) => `<span class="t">${t}</span>`).join('')}${r.springs[0] ? `<span class="s">ζ ${r.springs[0].zeta} · ${r.springs[0].settle}</span>` : ''}</div></article>`;
const named = d.filter((r) => r.found === 'named').length;
const html = `<!doctype html><meta charset="utf-8"><title>Buttons, as data</title><style>
body{margin:0;padding:32px;background:#f4f2ee;font:14px/1.5 -apple-system,system-ui;color:#1d1b17;max-width:1200px}h1{font-size:22px;margin:0 0 4px}h1+p{color:#555;margin:0 0 22px;max-width:860px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}section{background:#fff;border-radius:14px;padding:18px 20px}h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#888;margin:0 0 10px}
.note{margin:-4px 0 10px;color:#666;font-size:12.5px}.bar{display:grid;grid-template-columns:150px 1fr 48px;align-items:center;gap:8px;margin:3px 0;font-size:12.5px}.bar i{display:block;height:9px;border-radius:5px;background:#5b3fd1;opacity:.75}.bar b{font-weight:500;color:#555;text-align:right}
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}article{background:#fff;border-radius:12px;padding:14px}article b{display:block}article code{font:10.5px ui-monospace,monospace;color:#999}article p{margin:6px 0;color:#555;font-size:12.5px}
.tags span{display:inline-block;font-size:11px;background:#efeae2;border-radius:99px;padding:1px 8px;margin:0 4px 4px 0}.tags .t{background:#f1ecfb;color:#5b3fd1}.tags .s{background:#eaf4ee;color:#2f8a57}
</style><h1>${d.length.toLocaleString()} buttons, as data</h1><p>Every button-like part in ${new Set(d.map((r) => r.registry)).size} public component registries, read from its source into the recipe fields (${named.toLocaleString()} are named as buttons; the rest describe one). Duplicates across registries are folded in and examples set aside. Fields are read by program with the line each came from; the feel is estimated by rules and is not a rating.</p>
<div class="grid">${bars('How it commits', count((r) => r.commitRule), 'Almost every button is a press. The deliberate forms (hold, confirm, slide, countdown) are rare, which is why they are worth knowing.')}
${bars('What drives it', count((r) => r.driver))}
${bars('Tricks', count((r) => (r.tricks.length ? r.tricks : 'none')), 'The visual idea on top of the press. A part can have several.')}
${bars('The words while it acts', count((r) => r.wordsDuringAction))}
<section><h3>Springs, worked out (${S.length})</h3><p class="note">Each dot is one spring a part states. Left of 0.6 it bounces visibly; right of 0.97 it arrives without bouncing.</p>${scatter}</section>
${bars('Animation library', count((r) => r.animationLib))}
${bars('Care', [['states reduced motion', d.filter((r) => r.reducedMotion).length], ['handles the keyboard', d.filter((r) => r.keyboard).length], ['needs hover', d.filter((r) => r.needsHover).length], ['hard-codes colours', d.filter((r) => r.hardcodedColours.length).length]], 'Hard-coded colours are what re-skinning would have to replace.')}
${bars('Registries with the most', count((r) => r.registry).slice(0, 10))}</div>
<h1 style="margin-top:28px">The ones that aren’t plain presses</h1><p>Named buttons whose driver is a drag, a hold, the pointer’s distance or a state, from the best-ranked registries.</p><div class="gallery">${odd.map(card).join('')}</div>`;
await writeFile(`${here}../shots/buttons.html`, html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.setContent(html); await p.waitForTimeout(200); await p.screenshot({ path: `${here}../shots/buttons.png`, fullPage: true }); await b.close();
console.log('shots/buttons.html, shots/buttons.png');

// The recipes page: every collected part taken apart (generator/recipes.mjs), with the primitives it is made of, how its
// colours move, its springs worked out into what they feel like, the feel it gives off, and where it belongs.
//   node generator/recipes-page.mjs   → generator/shots/recipes.html and recipes.png
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PRIMITIVES, RECIPES, NUANCE, physics } from './recipes.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const list = (a) => a?.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="none">none</p>';
const spring = (s) => { const p = physics(s); return `<tr><td>${esc(s.use)}</td><td>${s.k ? `k ${s.k} · c ${s.c} · m ${s.m}` : `${s.visualDuration}s, bounce ${s.bounce}`}</td><td>${p.zeta}</td><td>${p.overshoot}</td><td>${p.settle}</td><td>${esc(p.feels)}</td></tr>`; };
const card = (r) => { const n = NUANCE[r.id] ?? {};
  return `<article><header><h2>${esc(r.name)}</h2><code>${r.id}</code><span class="job">${r.job}</span></header>
  <p class="concept">${esc(r.concept)}</p>
  ${n.feel ? `<div class="feel">${n.feel.character.map((c) => `<b>${c}</b>`).join('')}<p>${esc(n.feel.emotion)}</p><small>from ${esc(n.feel.from)}</small></div>` : ''}
  <div class="grid">
    <section><h3>What drives it</h3><p>${esc(r.driver)}</p><h3>Worked out from it</h3>${list(r.derived)}<h3>How it commits</h3><p>${esc(r.commit ?? 'It doesn’t: it shows a change.')}</p><h3>States</h3><p>${r.states.join(' → ')}</p></section>
    <section><h3>How its colours move</h3>${list(n.colour)}<h3>Motion</h3>${list([...(r.motion ?? []), ...(n.timing ?? [])])}<h3>Care</h3>${list(r.care)}</section>
  </div>
  ${n.springs?.length ? `<h3>Springs, worked out</h3><table><tr><th>for</th><th>given as</th><th>damping ratio</th><th>overshoot</th><th>settles in</th><th>feels</th></tr>${n.springs.map(spring).join('')}</table>` : ''}
  <div class="grid"><section><h3>Where it fits</h3>${list(n.fits)}</section><section><h3>Where it doesn’t</h3>${list(n.misfits)}</section></div>
  <p class="prims">${r.primitives.map((p) => `<a href="#${p}">${esc(PRIMITIVES[p].name)}</a>`).join('')}</p>
  <p class="choose"><b>Choose it</b> ${esc(r.choose)}</p></article>`; };
const html = `<!doctype html><meta charset="utf-8"><title>Recipes</title><style>
body{margin:0;padding:32px;background:#f4f2ee;font:14px/1.5 -apple-system,system-ui;color:#1d1b17;max-width:1180px}
h1{font-size:22px;margin:0 0 4px}h1+p{color:#555;margin:0 0 24px;max-width:780px}
article{background:#fff;border-radius:14px;padding:22px 24px;margin-bottom:18px}
header{display:flex;align-items:baseline;gap:10px}h2{font-size:18px;margin:0}code{font:11px ui-monospace,monospace;color:#999}.job{margin-left:auto;font:11px ui-monospace,monospace;background:#efeae2;padding:2px 8px;border-radius:99px}
.concept{font-size:15px;margin:8px 0 12px;max-width:820px}
.feel{background:#f7f3fb;border-radius:10px;padding:10px 14px;margin-bottom:12px}.feel b{display:inline-block;background:#5b3fd1;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;margin-right:6px}.feel p{margin:6px 0 2px}.feel small{color:#777}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}h3{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#888;margin:12px 0 4px}ul{margin:0;padding-left:18px}li{margin:2px 0}p{margin:0}.none{color:#aaa}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #eee;vertical-align:top}th{color:#888;font-weight:500}
.prims{margin-top:14px}.prims a{display:inline-block;font-size:12px;color:#2d5f9a;background:#eef3fa;border-radius:6px;padding:2px 8px;margin:0 6px 6px 0;text-decoration:none}
.choose{margin-top:6px;color:#333}.choose b{margin-right:4px}
#primitives article{padding:14px 20px}#primitives h2{font-size:15px}
</style><h1>How the parts we collected are built</h1><p>${RECIPES.length} parts from Arc and beUI, taken apart from their source into the ideas they are made of. The springs are worked out from their own numbers; the feel is judgement and says what it rests on. The ${Object.keys(PRIMITIVES).length} primitives at the end are the vocabulary: each part is a combination of them.</p>
${RECIPES.map(card).join('')}<div id="primitives"><h1>The primitives</h1><p>Each idea once, and the parts that use it.</p>${Object.entries(PRIMITIVES).map(([k, p]) => `<article id="${k}"><h2>${esc(p.name)}</h2><p>${esc(p.says)}</p><p class="prims">${RECIPES.filter((r) => r.primitives.includes(k)).map((r) => `<a>${esc(r.name)}</a>`).join('') || '<span class="none">no part yet</span>'}</p></article>`).join('')}</div>`;
await writeFile(`${here}shots/recipes.html`, html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1260, height: 900 } });
await p.setContent(html); await p.waitForTimeout(200); await p.screenshot({ path: `${here}shots/recipes.png`, fullPage: true }); await b.close();
console.log('shots/recipes.html, shots/recipes.png');

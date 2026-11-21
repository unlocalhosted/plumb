// The proof of layer 1: the style model drawn as a sheet a designer can check against the product. Its colour families
// as ramps (each step with its tokens), its neutrals, the ink it puts on each surface (drawn with the product's own
// words), its shadows redrawn from their parsed layers, its corners and its type; light and dark side by side.
//   node generator/style/sheet.mjs [product]   → web/public/research/style-<product>.html
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const [product = 'craftingattention'] = process.argv.slice(2);
const M = { light: JSON.parse(await readFile(`${here}${product}.light.json`, 'utf8')), dark: JSON.parse(await readFile(`${here}${product}.dark.json`, 'utf8')) };
const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ink = (l) => (l > 0.62 ? '#111' : '#fff');
const ramp = (steps) => `<div class="ramp">${steps.map((s) => `<div class="sw" style="background:${s.value};color:${ink(s.l)}" title="${e(s.tokens.join(', '))}"><b>${s.l.toFixed(2)}</b><span>${e(s.tokens[0])}</span>${s.tokens.length > 1 ? `<i>+${s.tokens.length - 1}</i>` : ''}</div>`).join('')}</div>`;
const shadowCss = (sh) => sh.layers.map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color ?? 'transparent'}`).join(', ');
const side = (m) => `<section class="side" style="--page:${m.page}">
  <h3>${m.mode === 'dark' ? 'Dark' : 'Light'} <small>page ${e(m.page)}</small></h3>
  <h4>Colour families</h4>
  ${m.families.map((f) => `<p class="fam">${f.name} <small>hue ${f.hue}° · ${f.steps.length} steps</small></p>${ramp(f.steps)}`).join('')}
  <h4>Neutrals <small>${m.neutrals.length}</small></h4>${ramp(m.neutrals)}
  <h4>Ink on surface, as the product pairs them</h4>
  <div class="pairs">${m.pairs.map((p) => { const u = p.uses[0]; return `<div class="pair" style="background:${p.surface};color:${p.ink}"><span style="font-size:${Math.min(u.size, 28)}px;font-weight:${u.weight}">${e(u.text)}</span>
    <small style="color:${p.ink}">${e(p.inkToken ?? p.ink)} on ${e(p.surfaceToken ?? p.surface)} · ${p.uses.length}×, ${[...new Set(p.uses.map((x) => `${x.size}/${x.weight}`))].slice(0, 3).join(', ')}</small></div>`; }).join('')}</div>
  <h4>Shadows</h4>
  <div class="shadows">${m.shadows.map((s) => `<div class="sh-wrap"><div class="sh" style="background:${s.surface};box-shadow:${shadowCss(s)}"></div><small>${e(s.on)}: ${s.layers.map((l) => `${l.x} ${l.y} ${l.blur} ${l.spread} ${l.token ?? l.color}`).join(' + ')}</small></div>`).join('')}</div>
  <h4>Corners and type</h4>
  <p class="meta">Radii: ${m.radii.map((r) => `${r.radius}px (${r.count})`).join(', ')}</p>
  <p class="meta">${m.type.slice(0, 8).map((t) => `${e(t.family)} ${t.size}/${t.weight} (${t.count})`).join(' · ')}</p>
</section>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${product === 'craftingattention' ? 'Crafting Attention' : product} Style Model</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&family=Geist:wght@400..700&display=swap">
<style>
:root { --paper:#fff; --ink:#121212; --gray:#5a5a5a; --rule:#e2e2e2; --sans:"Libre Franklin",Arial,sans-serif; --serif:"Source Serif 4",Georgia,serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper:#121212; --ink:#ececec; --gray:#a3a3a3; --rule:#333; color-scheme:dark; } }
:root[data-theme="dark"] { --paper:#121212; --ink:#ececec; --gray:#a3a3a3; --rule:#333; color-scheme:dark; }
* { box-sizing:border-box; } body { margin:0; background:var(--paper); color:var(--ink); font-family:var(--serif); padding:0 16px 72px; }
main { max-width:1280px; margin:0 auto; }
.kicker { font:700 12px/1 var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--gray); margin:48px 0 12px; }
h1 { font:700 clamp(30px,5vw,44px)/1.1 var(--serif); margin:0; }
.dek { font:400 18px/1.5 var(--serif); color:var(--gray); max-width:760px; margin:12px 0 24px; }
.sides { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr)); gap:20px; }
.side { background:var(--page); border-radius:12px; padding:20px; color:${'#888'}; font-family:var(--sans); }
.side h3 { margin:0 0 8px; font:700 18px var(--sans); color:#888; } .side h3 small, .side h4 small, .fam small { font-weight:400; }
.side h4 { margin:22px 0 8px; font:700 12px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:#888; }
.fam { margin:10px 0 4px; font:600 13px var(--sans); color:#888; }
.ramp { display:flex; flex-wrap:wrap; gap:3px; }
.sw { width:68px; height:56px; border-radius:6px; padding:5px; display:flex; flex-direction:column; justify-content:space-between; font:10px/1.2 var(--sans); position:relative; overflow:hidden; }
.sw b { font-weight:700; } .sw span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:.85; } .sw i { position:absolute; top:5px; right:5px; font-style:normal; opacity:.7; }
.pairs { display:grid; gap:6px; } .pair { border-radius:8px; padding:12px 14px; display:grid; gap:4px; font-family:Geist,var(--sans); box-shadow:inset 0 0 0 1px rgba(128,128,128,.18); }
.pair span { line-height:1.15; } .pair small { font:11px var(--sans); opacity:.75; }
.shadows { display:flex; flex-wrap:wrap; gap:28px 24px; padding:6px 0 4px; } .sh-wrap { display:grid; gap:12px; width:240px; }
.sh { height:56px; border-radius:6px; } .sh-wrap small, .meta { font:12px/1.45 var(--sans); color:#888; margin:0; }
</style></head><body><main>
<p class="kicker">Procedural style · layer 1 · the style model</p>
<h1>${product === 'craftingattention' ? 'Crafting attention' : product}, as a style model</h1>
<p class="dek">Read off the running product, not one element: every colour token grouped into hue families and ordered by lightness, the ink it puts on each surface in its own pricing card, its shadows parsed into layers and redrawn, its corners and its type. Light and dark, read ${M.light.read}. This is what every suggestion’s colours, words, edges and shadows will be drawn from.</p>
<div class="sides">${side(M.light)}${side(M.dark)}</div>
</main></body></html>`;
await writeFile(fileURLToPath(new URL(`../../web/public/research/style-${product}.html`, import.meta.url)), html);
console.log(`web/public/research/style-${product}.html`);

// Layer 1 of procedural style (docs/briefs/procedural-style.md): the style reader. It reads a product's style as a
// model, not one element's paint: its colour tokens grouped into hue families with their lightness steps, the ink it
// puts on each surface (from its own shipped component), its shadows parsed into layers, its corners and its type.
//   node generator/style/read.mjs [product] [light|dark]   (the product's playground on 4399, started if needed)
//     → generator/style/<product>.<mode>.json
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const here = fileURLToPath(new URL('./', import.meta.url));
const require = createRequire(`${here}../playground/package.json`);
const { parse, converter, differenceCiede2000 } = require('culori');
const toOklch = converter('oklch');
const [product = 'craftingattention', mode = 'light'] = process.argv.slice(2);

const DEV = `${process.env.HOME}/.claude/bin/dev-server`, PG = `${here}../playground/${product}`;
const up = async () => { try { return (await fetch('http://localhost:4399/')).ok; } catch { return false; } };
if (!(await up())) {
  const root = { algorecall: '/Users/vijaysingh/unlocalhosted/algorecall' }[product] ?? '/Users/vijaysingh/unlocalhosted/craftingattention/app';
  execFileSync(DEV, [PG, `${root}/node_modules/.bin/vite`, '--config', 'vite.config.mjs', '--port', '4399', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 750));
}

// ── in the page: every token that is a colour, and how the shipped component uses them ──────────────────────────────
const READ = () => {
  const scope = document.querySelector('.atoms-page') ?? document.body; // the product's wrapper classes are on it
  // a token is a colour when it paints the same under two different inherited colours: one that isn't a colour (a
  // font, a size) is thrown out at computed time and the probe falls back to whatever it inherits
  const host = document.createElement('b'); const probe = document.createElement('i'); host.appendChild(probe); scope.appendChild(host);
  const tokens = {};
  const walk = (rules) => { for (const r of rules) { if (r.cssRules) walk(r.cssRules); if (!r.style) continue;
    for (const p of r.style) if (p.startsWith('--') && !(p in tokens)) tokens[p] = r.style.getPropertyValue(p).trim(); } };
  // only the product's own stylesheets: the playground's (its atoms page, our suggestions) and plumber's overlay are not it
  const ours = (sheet) => /\/(generator\/playground\/(atoms|page)|overlay\/src)\//.test(sheet.ownerNode?.dataset?.viteDevId ?? sheet.href ?? '');
  for (const s of document.styleSheets) { if (ours(s)) continue; try { walk(s.cssRules); } catch {} }
  const colours = {};
  for (const [name, raw] of Object.entries(tokens)) {
    probe.style.color = `var(${name})`;
    host.style.color = 'rgb(1, 2, 3)'; const a = getComputedStyle(probe).color;
    host.style.color = 'rgb(4, 5, 6)'; const b = getComputedStyle(probe).color;
    if (a === b) colours[name] = { raw, value: a, alias: (raw.match(/^var\((--[\w-]+)\)$/) ?? [])[1] ?? null };
  }
  host.remove();
  // how the product's own component paints: words on surfaces, edges, shadows, corners, type
  const root = document.querySelector('.atoms-shipped') ?? document.body;
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return { color: b, on: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') }; }
    return { color: getComputedStyle(document.documentElement).backgroundColor, on: 'page' }; };
  const pairs = [], edges = [], shadows = [], radii = [], type = [];
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own) { const bg = bgOf(el); pairs.push({ ink: cs.color, surface: bg.color, surfaceIs: bg.on, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, text: el.textContent.trim().slice(0, 30) });
      type.push({ family: cs.fontFamily.split(',')[0].replace(/"/g, ''), size: parseFloat(cs.fontSize), weight: +cs.fontWeight, line: cs.lineHeight, tracking: cs.letterSpacing }); }
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') { edges.push({ color: cs[`border${side}Color`], width: parseFloat(cs[`border${side}Width`]), surface: bgOf(el).color }); break; }
    if (cs.boxShadow !== 'none') shadows.push({ shadow: cs.boxShadow, surface: cs.backgroundColor, on: bgOf(el.parentElement ?? el).color, tag: el.tagName.toLowerCase() });
    if (parseFloat(cs.borderTopLeftRadius) > 0) radii.push(parseFloat(cs.borderTopLeftRadius));
  }
  return { colours, pairs, edges, shadows, radii, type, page: getComputedStyle(document.documentElement).backgroundColor };
};

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto(`http://localhost:4399/atoms.html?atom=buy${mode === 'dark' ? '&mode=dark' : ''}`, { waitUntil: 'load' });
await p.waitForTimeout(3000);
const raw = await p.evaluate(READ); await b.close();

// ── the model ───────────────────────────────────────────────────────────────────────────────────────────────────────
const L = (c) => { const o = toOklch(parse(c)); return o ? { l: +(o.l ?? 0).toFixed(3), c: +(o.c ?? 0).toFixed(3), h: o.h == null ? null : +o.h.toFixed(1), a: o.alpha ?? 1 } : null; };
const round = (o) => `oklch(${o.l} ${o.c} ${o.h ?? 0}${o.a < 1 ? ` / ${+o.a.toFixed(2)}` : ''})`;
// every distinct colour value, with the token names that give it (an alias shares its target's value)
const byValue = new Map();
for (const [name, t] of Object.entries(raw.colours)) { const o = L(t.value); if (!o || o.a === 0) continue; const k = round(o);
  if (!byValue.has(k)) byValue.set(k, { ...o, value: k, tokens: [] }); byValue.get(k).tokens.push(name); }
const values = [...byValue.values()];
// families: chromatic colours grouped by hue (a gap of 12° between neighbours starts a new family: a brand ramp drifts a few degrees, a chart colour sits further off); low chroma is neutral
const chromatic = values.filter((v) => v.c >= 0.04 && v.a > 0.5).sort((a, b) => a.h - b.h);
const families = []; for (const v of chromatic) { const f = families.at(-1); if (f && v.h - f.at(-1).h < 12) f.push(v); else families.push([v]); }
if (families.length > 1 && families[0][0].h + 360 - families.at(-1).at(-1).h < 12) families[0].unshift(...families.pop()); // hue wraps at 360
const fam = families.map((f) => { const steps = f.sort((a, b) => b.l - a.l); const h = steps.reduce((s, v) => s + v.h, 0) / steps.length;
  return { hue: Math.round(h), name: hueName(h), steps: steps.map(({ l, c, h, value, tokens }) => ({ l, c, h, value, tokens })) }; });
const neutrals = values.filter((v) => v.c < 0.04 && v.a > 0.5).sort((a, b) => b.l - a.l).map(({ l, c, h, value, tokens }) => ({ l, c, h, value, tokens }));
const translucent = values.filter((v) => v.a <= 0.5).map(({ l, c, h, a, value, tokens }) => ({ l, c, h, a, value, tokens }));
function hueName(h) { return [[20, 'red'], [50, 'orange'], [85, 'amber'], [110, 'yellow'], [140, 'lime'], [165, 'green'], [190, 'teal'], [220, 'cyan'], [255, 'blue'], [285, 'indigo'], [315, 'purple'], [345, 'pink'], [361, 'red']].find(([m]) => h < m)[1]; }
// the nearest token to a painted colour (CIEDE2000 under 2: the same colour to the eye)
const de = differenceCiede2000();
// several tokens can hold one colour (near-black is both the page's ink and "on lime"): name it by the token whose name
// says the role it plays here, words or surface
const ROLE = { ink: /ink|text|fg|foreground|muted|on-(accent|surface|paper)|heading|body/, surface: /paper|surface|bg|background|canvas|card|fill|solid|accent-500/ };
const nearest = (c, role) => { const o = parse(c); if (!o) return null; let best = null;
  for (const v of values) { const d = de(o, parse(v.value)); if (!best || d < best.d) best = { d, v }; }
  if (!best || best.d >= 2) return null;
  return (role && best.v.tokens.find((t) => ROLE[role].test(t))) ?? best.v.tokens[0]; };
const pairKey = (x) => `${round(L(x.ink))} on ${round(L(x.surface))}`;
const pairs = Object.values(raw.pairs.reduce((m, x) => { const k = pairKey(x); (m[k] ??= { ink: round(L(x.ink)), surface: round(L(x.surface)), inkToken: nearest(x.ink, 'ink'), surfaceToken: nearest(x.surface, 'surface'), surfaceIs: x.surfaceIs, uses: [] }).uses.push({ size: x.size, weight: x.weight, text: x.text }); return m; }, {}))
  .sort((a, b) => b.uses.length - a.uses.length);
// shadows: each layer's offset, blur, spread and colour, so a shadow can be redrawn for another surface and height
const layersOf = (s) => s.split(/,(?![^(]*\))/).map((part) => { const color = (part.match(/(oklch|oklab|rgba?|color|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/i) ?? [])[0];
  const nums = part.replace(color ?? '', '').match(/-?[\d.]+px|\b0\b/g)?.map((n) => parseFloat(n)) ?? [];
  return { x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0, inset: /inset/.test(part), color: color ? round(L(color)) : null, token: color ? nearest(color) : null }; });
const shadows = Object.values(raw.shadows.reduce((m, x) => { (m[x.shadow] ??= { on: x.tag, surface: round(L(x.surface) ?? L(x.on)), layers: layersOf(x.shadow), count: 0 }).count++; return m; }, {}));
const count = (arr, key) => Object.entries(arr.reduce((m, x) => { const k = key(x); m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
const model = { product, mode, read: new Date().toISOString().slice(0, 10), page: round(L(raw.page)),
  families: fam, neutrals, translucent, pairs,
  edges: Object.values(raw.edges.reduce((m, e) => { const k = `${round(L(e.color))} ${e.width}`; (m[k] ??= { color: round(L(e.color)), token: nearest(e.color), width: e.width, on: round(L(e.surface)), count: 0 }).count++; return m; }, {})),
  shadows, radii: count(raw.radii, (r) => r).map(([r, n]) => ({ radius: +r, count: n })),
  type: count(raw.type, (t) => `${t.family}|${t.size}|${t.weight}`).map(([k, n]) => { const [family, size, weight] = k.split('|'); return { family, size: +size, weight: +weight, count: n }; }) };
await mkdir(here, { recursive: true });
await writeFile(`${here}${product}.${mode}.json`, JSON.stringify(model, null, 1));
console.log(`${product} (${mode}): ${values.length} colours from ${Object.keys(raw.colours).length} colour tokens · ${fam.length} families (${fam.map((f) => `${f.name} ${f.steps.length}`).join(', ')}) · ${neutrals.length} neutrals · ${pairs.length} ink-on-surface pairs · ${shadows.length} shadows · radii ${model.radii.map((r) => r.radius).join('/')}`);

// Layer 3 of procedural style: the shadow engine. A product's shadows are a recipe, not values: how far each layer
// falls, whether it blurs, and how its colour relates to the surface it is under. The engine learns the recipe from
// the product's own control and redraws it for any surface and any height, so a new state (pressed, a poured shade, a
// dark face) gets the shadow the product would have given it.
//   hard   the product's layers are solid offsets with no blur (crafting attention's lip): each layer keeps its offset
//          per unit of height, and its colour keeps its relation to the surface (lightness step, chroma share, hue)
//   soft   blurred layers: Josh W. Comeau's layered method (joshwcomeau.com/css/designing-shadows), offsets doubling
//          per layer, blur twice the offset, one light from above, the colour taken from the surface's hue at low
//          lightness and opacity, never grey on colour
//   node generator/style/shadow.mjs [product] [light|dark]   → adds `shadow` to <product>.<mode>.engine.json
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, converter, formatHex, toGamut, differenceCiede2000 } from 'culori';
const here = fileURLToPath(new URL('./', import.meta.url));
const [product = 'craftingattention', mode = 'light'] = process.argv.slice(2);
const M = JSON.parse(await readFile(`${here}${product}.${mode}.json`, 'utf8'));
const E = JSON.parse(await readFile(`${here}${product}.${mode}.engine.json`, 'utf8'));
const oklch = converter('oklch'), de = differenceCiede2000(), gamut = toGamut('rgb', 'oklch');
const O = (c) => oklch(typeof c === 'string' ? parse(c) : c);
const css = (o) => { const g = O(formatHex(gamut(o))); return `oklch(${g.l.toFixed(3)} ${g.c.toFixed(3)} ${(o.h ?? g.h ?? 0).toFixed(1)}${(o.alpha ?? 1) < 1 ? ` / ${+o.alpha.toFixed(3)}` : ''})`; };

// the product's own control and its shadow: the button's, read by layer 1
const brand = O(E.brand.value);
const own = M.shadows.find((s) => s.on === 'a' || s.on === 'button') ?? M.shadows[0];
const hard = own.layers.every((l) => l.blur === 0);
// height: the rest state is 1; the recipe is each layer's offset per unit of height and its colour's relation to the surface
const relation = own.layers.map((l) => { const c = O(l.color);
  return { y: l.y, x: l.x, blur: l.blur, spread: l.spread, dl: +(c.l - brand.l).toFixed(3), cShare: +(c.c / brand.c).toFixed(3), dh: +((c.h ?? brand.h) - brand.h).toFixed(1), alpha: +(c.alpha ?? 1).toFixed(3), token: l.token }; });

// Comeau's layered soft shadow, for a product whose shadows blur
const comeau = (surface, height) => { const s = O(surface); const n = 4;
  return Array.from({ length: n }, (_, i) => { const off = Math.round(height * 2 ** i * 0.75 * 10) / 10;
    return { x: 0, y: off, blur: off * 2, spread: 0, color: css({ mode: 'oklch', l: Math.max(0.12, s.l * 0.35), c: s.c * 0.5, h: s.h, alpha: 0.12 + 0.04 * (n - i) / n }) }; }); };
// the product's own recipe, redrawn for a surface at a height
const redraw = (surface, height) => { if (!hard) return comeau(surface, height);
  const s = O(surface);
  return relation.map((r) => ({ x: r.x * height, y: +(r.y * height).toFixed(1), blur: r.blur, spread: r.spread,
    color: css({ mode: 'oklch', l: Math.min(0.99, Math.max(0, s.l + r.dl)), c: s.c * r.cShare, h: (s.h ?? 0) + r.dh, alpha: r.alpha }) })); };
const text = (layers) => layers.map((l) => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`).join(', ');

// heights for the states a control goes through: it rests on its lip, rises a little when pointed at, sits on its lip
// when pressed (a third of its height left, as crafting attention's own :active does)
const HEIGHT = { rest: 1, 'pointed at': 1, pressed: 1 / 3 };
const states = Object.fromEntries(Object.entries(E.states).map(([k, v]) => [k, { height: HEIGHT[k], shadow: text(redraw(v.fill.value, HEIGHT[k])) }]));
// proof: the recipe redrawn for the product's own fill at rest must give back the product's own shadow
const back = redraw(E.brand.value, 1);
const reproduces = own.layers.map((l, i) => ({ own: `${l.y}px ${l.color}`, redrawn: `${back[i].y}px ${back[i].color}`, colourDiff: +de(parse(l.color), parse(back[i].color)).toFixed(2), sameOffset: l.y === back[i].y }));
E.shadow = { method: hard ? 'the product’s own hard lip, learned from its button' : 'Josh W. Comeau’s layered soft shadow', own: own.layers, relation, states, reproduces,
  forSurface: { note: 'redraw(surface, height) for any new surface: the same relation applied', examples: {} } };
// the surfaces the suggestions will need a shadow for: the solid's ramp steps 9–12 and the darkest neutral face
for (const r of E.ramp.slice(8)) E.shadow.forSurface.examples[`step ${r.step}`] = text(redraw(r.value, 1));
await writeFile(`${here}${product}.${mode}.engine.json`, JSON.stringify(E, null, 1));
console.log(`${product} (${mode}): ${E.shadow.method} · reproduces the product's own: ${reproduces.map((r) => `${r.sameOffset ? 'offset ok' : 'offset off'}, colour ΔE ${r.colourDiff}`).join(' | ')} · pressed ${states.pressed.shadow}`);

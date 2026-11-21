// Layer 2 of procedural style (docs/briefs/procedural-style.md): the shade engine and the role grammar, run on the
// tools designers use for each job, never on a hand mix:
//   ramp       Radix Colors' custom palette generator (vendor/radix-generate.mjs): twelve steps, each with its job
//   contrast   Leonardo: a step of the brand's hue placed at a target contrast against the page
//   ink        APCA (apca-w3): the words a surface can carry, by size and weight (its font lookup table)
//   gamut      culori's CSS Color 4 gamut mapping, as oklch.com shows it
//   states     Material's state layers: the ink over the solid at 8% when pointed at, 10% when pressed
//   harmony    Adobe Color's rules on the artist's (red, yellow, blue) wheel, kept at the brand's lightness and chroma
// Every value is matched back to the product's own tokens: a token within a just-noticeable difference is used and
// named; anything else is marked derived, with the tool that made it.
//   node generator/style/engine.mjs [product] [light|dark]   → generator/style/<product>.<mode>.engine.json
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, converter, formatHex, toGamut, differenceCiede2000, interpolate } from 'culori';
import { APCAcontrast, sRGBtoY, fontLookupAPCA } from 'apca-w3';
import { Theme, Color, BackgroundColor } from '@adobe/leonardo-contrast-colors';
import { generateRadixColors } from './vendor/radix-generate.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const [product = 'craftingattention', mode = 'light'] = process.argv.slice(2);
const M = JSON.parse(await readFile(`${here}${product}.${mode}.json`, 'utf8'));
const oklch = converter('oklch'), rgb = converter('rgb'), de = differenceCiede2000(), inGamut = toGamut('rgb', 'oklch');
const P = (c) => (typeof c === 'string' ? parse(c) : c); // a colour as text or as culori's object
const hex = (c) => formatHex(inGamut(P(c)));
const okStr = (c) => { const o = oklch(parse(c)); return `oklch(${o.l.toFixed(3)} ${o.c.toFixed(3)} ${(o.h ?? 0).toFixed(1)})`; };

// the product's tokens, flat, to name what the tools produce
const tokens = [...M.families.flatMap((f) => f.steps), ...M.neutrals];
const name = (c) => { const p = parse(c); if (!p) throw new Error(`not a colour: ${c}`); let best = null; for (const t of tokens) { const d = de(p, parse(t.value)); if (!best || d < best.d) best = { d, t }; }
  return best && best.d < 2 ? { token: best.t.tokens[0], d: +best.d.toFixed(2) } : null; };
const mark = (c, tool) => { const n = name(c); return { value: hex(c), oklch: okStr(c), ...(n ? { token: n.token } : { derived: tool }) }; };

// the brand: the solid the product's own button is painted with, and the page it sits on
const button = M.pairs.find((p) => /accent|primary|brand|button/.test(`${p.surfaceToken} ${p.uses.map((u) => u.text).join(' ')}`) && oklch(parse(p.surface)).c > 0.08) ?? M.pairs.at(-1);
const brand = button.surface, page = M.page, gray = M.neutrals.find((n) => n.l > 0.45 && n.l < 0.6)?.value ?? '#8b8d98';

// ── ramp: Radix ──
const R = generateRadixColors({ appearance: mode, accent: hex(brand), gray: hex(gray), background: hex(page) });
const JOBS = ['app background', 'subtle background', 'component at rest', 'component pointed at', 'component pressed or selected', 'subtle border', 'border and focus ring', 'border pointed at', 'solid', 'solid pointed at', 'low-contrast words', 'high-contrast words'];
const ramp = R.accentScale.map((c, i) => ({ step: i + 1, job: JOBS[i], ...mark(c, 'Radix custom palette') }));
const grays = R.grayScale.map((c, i) => ({ step: i + 1, job: JOBS[i], ...mark(c, 'Radix custom palette') }));

// ── ink: APCA, by the button's own size and weight ──
const Y = (c) => { const { r, g, b } = rgb(inGamut(parse(c))); return sRGBtoY([r * 255, g * 255, b * 255]); };
const lc = (ink, surface) => +APCAcontrast(Y(ink), Y(surface)).toFixed(1);
const use = button.uses[0]; // the size and weight the product sets its button words in
// APCA's table gives the smallest size that reads at a contrast, for weights 100 to 900; a weight between two (550) is
// read between them
const reads = (ink, surface, size = use.size, weight = use.weight) => { const t = fontLookupAPCA(Math.abs(lc(ink, surface))), w = Math.min(9, Math.max(1, weight / 100));
  const lo = Math.floor(w), hi = Math.ceil(w), need = +(t[lo] + (t[hi] - t[lo]) * (w - lo)).toFixed(1);
  return { lc: lc(ink, surface), needPx: need, ok: size >= need, shortBy: size >= need ? 0 : +(need - size).toFixed(1) }; };
// the candidates: the product's own inks first (its pairs), then its lightest and darkest neutrals
const inks = [...new Set([button.ink, ...M.pairs.map((p) => p.ink), M.neutrals[0].value, M.neutrals.at(-1).value])];
const inkFor = (surface) => { const ranked = inks.map((i) => ({ ink: i, ...reads(i, surface) })).sort((a, b) => (b.ok - a.ok) || (inks.indexOf(a.ink) - inks.indexOf(b.ink)));
  const pick = ranked[0]; return { ...mark(pick.ink, 'APCA'), lc: pick.lc, needPx: pick.needPx, shortBy: pick.shortBy, readsAt: `${use.size}px/${use.weight}`, ok: pick.ok }; };

// ── states: Material's state layers over the solid ──
const layer = (over, ink, a) => hex(interpolate([over, ink], 'rgb')(a));
const solid = R.accentScale[8];
const states = {
  rest: { fill: mark(solid, 'Radix step 9') },
  'pointed at': { fill: mark(R.accentScale[9], 'Radix step 10'), alsoMaterial: mark(layer(solid, button.ink, 0.08), 'Material state layer 8%') },
  pressed: { fill: mark(layer(solid, button.ink, 0.10), 'Material state layer 10%') },
};
for (const s of Object.values(states)) s.ink = inkFor(s.fill.value);

// ── contrast-placed steps: Leonardo, for a part that must be told apart from the solid (a fill growing over it) ──
let leo = null;
try {
  const bg = new BackgroundColor({ name: 'page', colorKeys: [hex(page)], ratios: [1] });
  const c = new Color({ name: 'brand', colorKeys: [hex(brand)], ratios: [1.5, 3, 4.5, 7], colorSpace: 'OKLCH' });
  const theme = new Theme({ colors: [bg, c], backgroundColor: bg, lightness: Math.round(oklch(parse(page)).l * 100) });
  leo = theme.contrastColors.find((x) => x.name === 'brand').values.map((v) => ({ ratioToPage: v.contrast, ...mark(v.value, 'Leonardo') }));
} catch (e) { leo = { error: String(e.message ?? e) }; }

// ── harmony: Adobe Color's rules on the artist's wheel ──
// the RYB wheel as Itten and Adobe Color draw it, against the RGB hue it maps to (piecewise linear between the primaries)
const RYB = [[0, 0], [60, 35], [120, 60], [180, 120], [240, 240], [300, 277], [360, 360]];
const map = (h, from, to) => { h = ((h % 360) + 360) % 360; for (let i = 1; i < RYB.length; i++) if (h <= RYB[i][from]) { const [a, b] = [RYB[i - 1], RYB[i]]; return a[to] + ((h - a[from]) / (b[from] - a[from])) * (b[to] - a[to]); } return h; };
const hsvHue = (c) => converter('hsv')(parse(c)).h ?? 0;
const atHue = (rgbHue) => { const b = oklch(parse(brand)); const hsv = converter('hsv')(parse(brand)); const candidate = { mode: 'hsv', h: rgbHue, s: hsv.s, v: hsv.v };
  const o = oklch(candidate); return hex({ mode: 'oklch', l: b.l, c: b.c, h: o.h }); }; // the partner's hue, at the brand's own lightness and chroma
const ryb = map(hsvHue(brand), 1, 0);
const partner = (deg) => atHue(map(ryb + deg, 0, 1));
const harmony = { complementary: [partner(180)], analogous: [partner(-30), partner(30)], 'split complementary': [partner(150), partner(210)], triad: [partner(120), partner(240)] };
for (const k of Object.keys(harmony)) harmony[k] = harmony[k].map((c) => mark(c, 'Adobe Color rule'));

const out = { product, mode, brand: mark(brand, 'product'), page: mark(page, 'product'), buttonWords: `${use.size}px/${use.weight}`, ramp, grays, states, leonardo: leo, harmony };
await writeFile(`${here}${product}.${mode}.engine.json`, JSON.stringify(out, null, 1));
const tok = ramp.filter((s) => s.token).length;
console.log(`${product} (${mode}): brand ${out.brand.oklch}${out.brand.token ? ` (${out.brand.token})` : ''} · ramp ${tok}/12 steps are the product's own tokens · rest ink ${states.rest.ink.token ?? states.rest.ink.value} Lc ${states.rest.ink.lc} (${states.rest.ink.ok ? 'reads' : 'too faint'} at ${out.buttonWords}) · pressed ${states.pressed.fill.value} ink Lc ${states.pressed.ink.lc}`);

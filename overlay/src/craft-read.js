/* ─────────────────────────────────────────────────────────
 * CRAFT READ · React Plumber overlay
 *
 * The small reads every craft module shares (colours, an element's classes, the utility that sets a property), in a
 * module of their own so craft.js, craft-rules.js and verdict.js import them without a cycle.
 * ───────────────────────────────────────────────────────── */

import { resolveSpec, specFor } from './craft-spec.js';
import { activeVariants, prefixesInForce, splitVariant } from './variants.js';

// The spec in effect on this page (docs/briefs/craft-spec.md): the standard until the project's own arrives from the
// server (craft.js asks for it), then that. `rule(id)` is the resolved entry for one rule: { enabled, tier, …values }.
// A rule asks for its entry on every element it is shown (over a million times for a big page), so the entry is
// found once per spec, not searched for each time. Entries are read, never written.
let entries = new Map(), entriesOf = null;
export const SPEC = { value: resolveSpec(), loaded: false, rule(id) {
  if (entriesOf !== SPEC.value) { entries = new Map(); entriesOf = SPEC.value; }
  let entry = entries.get(id);
  if (!entry) entries.set(id, (entry = specFor(SPEC.value, id) ?? { enabled: true }));
  return entry;
} };

// A colour as it appears inside a computed value (a shadow layer, a gradient stop), in every space rgb() reads
export const COLOUR = /(?:rgba?|oklch|oklab|color)\([^)]*\)/g;

// A computed colour → [r, g, b, a] in sRGB 0–255; null for anything else (a colour the page never resolved). Chromium
// keeps a colour in the space it was written in: rgb()/rgba(), oklch() (Tailwind v4's palette), oklab() (color-mix in
// oklab) and color(srgb …) all come back from getComputedStyle as they are, so all of them are read here.
export function rgb(s) {
  const m = String(s ?? '').trim().match(/^(rgba?|oklch|oklab|color)\(([^)]+)\)$/);
  if (!m) return null;
  const [space, body] = [m[1], m[2]];
  const [main, slash] = body.split('/');
  const words = main.trim().split(/[\s,]+/).filter(Boolean);
  if (space === 'color' && words.shift() !== 'srgb') return null; // display-p3 and the rest are not judged
  const num = (w, whole = 1) => (w === 'none' ? 0 : w.endsWith('%') ? (parseFloat(w) / 100) * whole : parseFloat(w));
  const alphaWord = slash?.trim() ?? (space === 'rgba' || (space === 'rgb' && words.length === 4) ? words.pop() : undefined);
  const a = alphaWord === undefined ? 1 : num(alphaWord);
  if (words.length < 3) return null;
  let out;
  if (space === 'rgb' || space === 'rgba') out = words.slice(0, 3).map((w) => num(w, 255));
  else if (space === 'color') out = words.slice(0, 3).map((w) => num(w) * 255);
  else {
    const L = num(words[0]);
    let A, B;
    if (space === 'oklch') { const C = num(words[1], 0.4), h = (num(words[2]) * Math.PI) / 180; A = C * Math.cos(h); B = C * Math.sin(h); }
    else { A = num(words[1], 0.4); B = num(words[2], 0.4); }
    // OKLab → linear sRGB (Björn Ottosson's matrices) → the sRGB transfer curve
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, ss = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss];
    out = lin.map((x) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(0, x) ** (1 / 2.4) - 0.055));
  }
  out = out.map((x) => Math.max(0, Math.min(255, x)));
  if (out.some((n) => !Number.isFinite(n)) || !Number.isFinite(a)) return null;
  return [out[0], out[1], out[2], a];
}

// How high a computed box-shadow lifts its element: the blur of its softest outer layer, 0 for none (a ring of
// spread only, an inset, or a see-through layer lifts nothing). The census's shadow levels and the elevation ladder
// read it the same way.
export function elevation(value) {
  if (!value || value === 'none') return 0;
  let most = 0;
  for (const layer of value.split(/,(?![^(]*\))/)) {
    const colour = layer.match(COLOUR)?.[0];
    if (/inset/.test(layer) || (colour && rgb(colour)?.[3] === 0)) continue;
    const nums = layer.replace(COLOUR, '').replace(/#[0-9a-f]+/gi, '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    most = Math.max(most, nums[2] ?? 0);
  }
  return most;
}

// An element's classes as the rules read them: its own, or the ones a suggestion would give it while the arbitration
// re-runs a rule on the page as it will be (Facts.with). Set and cleared in one synchronous call; never written.
export const VIRTUAL = new WeakMap();
export const classesOf = (el) => VIRTUAL.get(el) ?? el.getAttribute('class') ?? '';

// The utility in a class list that sets a property, by its Tailwind prefix: 'rounded-card' for /^rounded(-|$)/.
// The one showing now (variants.js): the most particular variant in force that writes one (md:rounded-xl at a medium
// window, dark: while dark), else the base; a variant not in force (hover:rounded-lg, not held) is never it. A write
// changes the class this returns, so every other class stays as written. Side and corner forms are excluded by `not`.
export function utility(el, prefix, { not } = {}) {
  const list = classesOf(el).split(/\s+/).filter(Boolean);
  for (const p of [...prefixesInForce(list, activeVariants(el))].reverse()) {
    for (const c of list) {
      const v = splitVariant(c);
      if (v.prefix !== p) continue;
      const base = v.base.replace(/^!/, '').replace(/!$/, '').replace(/^-/, '');
      if (base !== prefix && !base.startsWith(prefix + '-')) continue;
      const suffix = base === prefix ? '' : base.slice(prefix.length + 1);
      if (not && not.test(suffix)) continue;
      return c;
    }
  }
  return null;
}


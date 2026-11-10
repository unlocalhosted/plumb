/* ─────────────────────────────────────────────────────────
 * ACCENT RAMP · React Plumber overlay (docs/design/token-spec.md §3.4 rule 4)
 *
 * One chosen colour in, eleven stops out (50 … 950). The colour lands on 500 exactly; the lighter stops climb toward
 * near-white and the darker ones fall toward near-black along the lightness curve of Tailwind's OKLCH ramps, at the
 * colour's own hue, with chroma tapered toward both ends the same way. Every stop is kept inside sRGB by lowering its
 * chroma, never its lightness or hue.
 *
 * Guard: the accent carries words (primary buttons), and they must reach APCA Lc 60 (body text) on 500. White when it
 * reads; else the ramp's own 950, so a light brand keeps its colour; only when neither reads is the colour darkened in
 * small lightness steps for white words, and the result says so (`adjusted`).
 * ───────────────────────────────────────────────────────── */

import { apca } from './craft-rules.js';

export const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Tailwind v4's blue ramp in OKLCH: its lightness curve and its chroma relative to 500 are the shape every ramp takes
const SHAPE_L = { 50: 0.97, 100: 0.932, 200: 0.882, 300: 0.809, 400: 0.707, 500: 0.623, 600: 0.546, 700: 0.488, 800: 0.424, 900: 0.379, 950: 0.282 };
const SHAPE_C = { 50: 0.014, 100: 0.032, 200: 0.062, 300: 0.114, 400: 0.176, 500: 0.214, 600: 0.245, 700: 0.243, 800: 0.199, 900: 0.155, 950: 0.091 };
const TOP = 0.975, BOTTOM = 0.27; // the lightness the ends reach, whatever the colour
export const MIN_LC = 60;         // white words on 500: APCA body text

// ── OKLCH ↔ sRGB ─────────────────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function toOklch([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, Bb), h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
}
// sRGB 0–255, unclamped (a channel outside 0–255 means the colour is outside sRGB)
function rgbOf({ l, c, h }) {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [gam(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S), gam(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S), gam(-0.0041960863 * L - 0.7034186147 * M + 1.707815049 * S)];
}
const inGamut = (rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5);
// the most chroma up to `c` that stays in sRGB, by bisection
function fit({ l, c, h }) {
  if (inGamut(rgbOf({ l, c, h }))) return { l, c, h };
  let lo = 0, hi = c;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(rgbOf({ l, c: mid, h }))) lo = mid; else hi = mid; }
  return { l, c: lo, h };
}
const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
export const hexOf = (rgb) => '#' + rgb.map((v) => clamp8(v).toString(16).padStart(2, '0')).join('');
const r3 = (n) => Math.round(n * 1000) / 1000;
export const cssOf = ({ l, c, h }) => `oklch(${Math.round(l * 1000) / 10}% ${r3(c)} ${r3(c) === 0 ? 0 : Math.round(h * 10) / 10})`;

/** A colour as `#rrggbb`, `[r, g, b]` or `{ l, c, h }` (OKLCH, l 0–1) → `{ l, c, h }`. */
export function parse(colour) {
  if (Array.isArray(colour)) return toOklch(colour);
  if (typeof colour === 'object' && colour && 'l' in colour) return { l: colour.l, c: colour.c, h: colour.h };
  const m = /^#?([\da-f]{6})$/i.exec(String(colour).trim());
  if (!m) throw new Error(`Not a colour: ${colour}`);
  const n = parseInt(m[1], 16);
  return toOklch([n >> 16, (n >> 8) & 255, n & 255]);
}


function build(base) {
  const out = {};
  for (const s of STOPS) {
    let l;
    if (s === 500) l = base.l;
    else if (s < 500) l = base.l + (SHAPE_L[s] - SHAPE_L[500]) / (SHAPE_L[50] - SHAPE_L[500]) * (TOP - base.l);
    else l = base.l - (SHAPE_L[500] - SHAPE_L[s]) / (SHAPE_L[500] - SHAPE_L[950]) * (base.l - BOTTOM);
    const c = s === 500 ? base.c : base.c * SHAPE_C[s] / SHAPE_C[500];
    const p = fit({ l, c, h: base.h });
    out[s] = { ...p, css: cssOf(p), hex: hexOf(rgbOf(p)) };
  }
  return out;
}

const lcOn = (text, base) => Math.abs(apca(text, rgbOf(fit(base)).map(clamp8)));

/**
 * The accent ramp for one chosen colour, and the words that sit on it (owner, 2026-11-10: keep the brand, change the text).
 * White words when they reach Lc 60 on the colour; else the ramp's own 950, else a near-black of the same hue, so a
 * light brand (yellow, lime) keeps its colour. A mid-tone neither reads on (teal, sky, orange) moves the shorter way: lighter
 * under the near-black, or darker under white.
 * → { stops: { 50: { l, c, h, css, hex }, … }, onAccent: { text: 'white' | 'dark', css, hex }, lc: |APCA| of those words
 *   on 500, adjusted: null | { from, to, lcBefore } }
 */
export function rampOf(colour) {
  const chosen = fit(parse(colour));
  const white = { text: 'white', css: '#fff', hex: '#ffffff', rgb: [255, 255, 255] };
  if (lcOn(white.rgb, chosen) >= MIN_LC) return done(build(chosen), white, chosen, null);
  const stops = build(chosen), dark = stops[950], darkRgb = rgbOf(dark).map(clamp8);
  if (lcOn(darkRgb, chosen) >= MIN_LC) return done(stops, { text: 'dark', css: dark.css, hex: dark.hex, rgb: darkRgb }, chosen, null);
  // the ramp's 950 not dark enough on a mid-tone colour: a near-black of the same hue
  const ink = fit({ l: 0.18, c: Math.min(chosen.c * 0.25, 0.03), h: chosen.h }), inkRgb = rgbOf(ink).map(clamp8);
  if (lcOn(inkRgb, chosen) >= MIN_LC) return done(stops, { text: 'dark', css: cssOf(ink), hex: hexOf(inkRgb), rgb: inkRgb }, chosen, null);
  // neither reads (a mid-tone): move the colour the shorter way, lighter under the near-black or darker under white, and
  // say so; the brand moves as little as it can
  const shift = (text, dir) => { let b = chosen, n = 0; while (lcOn(text, b) < MIN_LC && n < 120) { b = fit({ ...b, l: b.l + dir * 0.005, c: chosen.c }); n++; } return { b, n }; };
  const up = shift(inkRgb, +1), down = shift(white.rgb, -1);
  const lcBefore = Math.round(Math.max(lcOn(white.rgb, chosen), lcOn(inkRgb, chosen)) * 10) / 10;
  if (up.n <= down.n) { const ink2 = fit({ ...ink }); return done(build(up.b), { text: 'dark', css: cssOf(ink2), hex: hexOf(inkRgb), rgb: inkRgb }, up.b, { from: cssOf(chosen), to: cssOf(up.b), lcBefore }); }
  return done(build(down.b), white, down.b, { from: cssOf(chosen), to: cssOf(down.b), lcBefore });
}
const done = (stops, on, base, adjusted) => ({ stops, onAccent: { text: on.text, css: on.css, hex: on.hex }, lc: Math.round(lcOn(on.rgb, base) * 10) / 10, adjusted });

/** The ramp as CSS custom properties, `--color-accent-50: oklch(…);` one per line, and the words on it. */
export const rampCss = (ramp, name = 'accent') => [...STOPS.map((s) => `--color-${name}-${s}: ${ramp.stops[s].css};`), `--color-text-on-${name}: ${ramp.onAccent.css};`].join('\n');

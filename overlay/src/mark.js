/* ─────────────────────────────────────────────────────────
 * MARK · React Plumber's mark, one source for every place it is drawn (the site's bar, the overlay's dock, the films)
 *
 * The mark (chosen by the owner 2026-11-13; docs/design/comps/logo-guides.html, docs/journey.md "React Plumber gets a
 * mark"): a pink stem and a violet bowl with exactly the gap between them on a 120 grid. The space between them is a
 * decision, and it makes the P. Its guardrail (guides on the stem, cap and foot, and the 4 measured across the gap) is
 * drawn only at hero size.
 *
 *  STEM, BOWL       the two parts, as paths on the 120 grid (drawn area 24..96 × 18..102, so 72 × 84)
 *  VIEW             the drawn area as a viewBox: the mark with no margin, 6:7
 *  markMono()       the P alone, one colour. Kept for the record of the first mark; nothing draws it now
 *  markLit(id)      the P alone, pink and violet, each lit from the top. Kept for the same reason
 *
 * The R (chosen by the owner 2026-11-13; docs/design/comps/logo-r.html, logo-stress.html, the design site's Logo page,
 * docs/journey.md "A solid P inside a drawn R"): the P gains the one part it lacks to be an R, its leg, and reads as
 * both letters. The rules:
 *   1. The P is solid. The leg is only ever drawn (an outline with a breath of tint), never a solid part.
 *   2. The leg is plumber's tool blue everywhere, the colour of its guardrails; in one colour it takes that colour.
 *   3. Detail drops away as the mark shrinks (the DOM tree, then the dashes). The leg itself never goes.
 *   4. Guardrails and points are for the hero only.
 *  LEG, TREE, JOINTS  the leg (the stem's shoulder again: a quarter round, radius 24) and the DOM tree inside it
 *  markR(opts)        the R, at the drawing its size calls for (see LEVELS)
 * ───────────────────────────────────────────────────────── */

// a box with its own corner radii [top-left, top-right, bottom-right, bottom-left], scaled down together when they don't
// fit their side (as CSS scales border-radius), so no arc overshoots
export function box(x, y, w, h, radii) {
  const f = Math.min(1, w / (radii[0] + radii[1] || 1), w / (radii[3] + radii[2] || 1), h / (radii[0] + radii[3] || 1), h / (radii[1] + radii[2] || 1));
  const [a, b, c, d] = radii.map((r) => +(r * f).toFixed(3));
  return `M${x + a} ${y}H${x + w - b}${b ? `A${b} ${b} 0 0 1 ${x + w} ${y + b}` : ''}V${y + h - c}${c ? `A${c} ${c} 0 0 1 ${x + w - c} ${y + h}` : ''}H${x + d}${d ? `A${d} ${d} 0 0 1 ${x} ${y + h - d}` : ''}V${y + a}${a ? `A${a} ${a} 0 0 1 ${x + a} ${y}` : ''}Z`;
}

// the stem: 34 wide, the full height; the bowl: 34 wide, two thirds of it, its right side one round curve; 4 between
export const STEM = box(24, 18, 34, 84, [24, 5, 10, 10]);
export const BOWL = box(62, 18, 34, 56, [5, 28, 28, 5]);
export const VIEW = '24 18 72 84';

export const markMono = () => `<svg viewBox="${VIEW}" aria-hidden="true"><path d="${STEM}" fill="currentColor"/><path d="${BOWL}" fill="currentColor"/></svg>`;

export const markLit = (id = 'rp') => `<svg viewBox="${VIEW}" aria-hidden="true"><defs>
<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ac0"/><stop offset=".55" stop-color="#f24a9f"/><stop offset="1" stop-color="#d0287f"/></linearGradient>
<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7dff"/><stop offset=".55" stop-color="#7356f0"/><stop offset="1" stop-color="#5232d4"/></linearGradient>
<linearGradient id="${id}-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<path d="${STEM}" fill="url(#${id}-s)"/><path d="${STEM}" fill="url(#${id}-l)" style="mix-blend-mode:soft-light"/>
<path d="${BOWL}" fill="url(#${id}-b)"/><path d="${BOWL}" fill="url(#${id}-l)" style="mix-blend-mode:soft-light"/></svg>`;

// ── the R ──
// the leg: under the bowl, 4 below it, the stem's shoulder turned over (a quarter round of radius 24), corners of 5
export const LEG = 'M72 78A24 24 0 0 1 96 102H67A5 5 0 0 1 62 97V83A5 5 0 0 1 67 78Z';
// inside the leg, a small DOM tree: three nodes, each a child of the one above (a step down, a step in), and the pipe
// elbows that join them
export const TREE = [[66, 83], [71.5, 89], [77, 95]];
export const JOINTS = 'M68 87V90A1 1 0 0 0 69 91H71.5M73.5 93V96A1 1 0 0 0 74.5 97H77';
// under 40px the gaps are opened so they do not close up: 4 to 7 between stem and bowl, 4 to 5 above the leg
const STEM_S = box(24, 18, 32, 84, [24, 5, 10, 10]);
const BOWL_S = box(63, 18, 33, 56, [5, 28, 28, 5]);
const LEG_S = 'M73 79A23 23 0 0 1 96 102H67A4 4 0 0 1 63 98V83A4 4 0 0 1 67 79Z';
// the points the hero shows: where a real curve starts or ends
const POINTS = [[48, 18], [58, 92], [48, 102], [34, 102], [24, 92], [24, 42], [68, 18], [96, 46], [68, 74], [72, 78], [96, 102]];
// the drawing a size gets. The mark has a margin of 2 here (viewBox 22 16 76 88) so the leg's line is not cut
export const LEVELS = [
  { level: 3, name: 'hero', from: null, says: 'guardrails, points, the dashed leg, the DOM tree inside it' },
  { level: 2, name: 'large', from: 96, says: 'the dashed leg, the DOM tree inside it' },
  { level: 1, name: 'mid', from: 40, says: 'the leg as one plain outline' },
  { level: 0, name: 'small', from: 0, says: 'wider gaps; the leg as a tinted shape with a drawn edge' },
];
export const BLUE = '#2f86dc', BLUE_NIGHT = '#6db0f5';

/** The R. h: its height in px (it picks the drawing); level: force a drawing (3 is the hero, asked for by name);
 *  mono: draw it in one colour (currentColor); dark: on a dark ground; leg: the leg's colour, when a page has its own
 *  (a CSS variable that follows the scheme); id keeps its gradients apart from another copy's. */
export function markR({ h = 64, level = null, mono = false, dark = false, leg = null, id = 'rp' } = {}) {
  const L = level ?? (h >= 96 ? 2 : h >= 40 ? 1 : 0);
  const a = mono ? 'currentColor' : `url(#${id}-s)`, b = mono ? 'currentColor' : `url(#${id}-b)`;
  const lc = mono ? 'currentColor' : leg ?? (dark ? BLUE_NIGHT : BLUE);
  const defs = mono ? '' : `<defs>
<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7ac0"/><stop offset=".55" stop-color="#f24a9f"/><stop offset="1" stop-color="#d0287f"/></linearGradient>
<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7dff"/><stop offset=".55" stop-color="#7356f0"/><stop offset="1" stop-color="#5232d4"/></linearGradient>
<linearGradient id="${id}-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  const lit = (d) => (mono ? '' : `<path d="${d}" fill="url(#${id}-l)" style="mix-blend-mode:soft-light"/>`); // each part lit from the top
  const size = L === 3 ? `height="${h}" width="${h}"` : `height="${h}" width="${(h * 76 / 88).toFixed(1)}"`;
  if (L === 0) return `<svg viewBox="22 16 76 88" ${size} aria-hidden="true">${defs}<clipPath id="${id}-c"><path d="${LEG_S}"/></clipPath>
<path d="${STEM_S}" fill="${a}"/>${lit(STEM_S)}<path d="${BOWL_S}" fill="${b}"/>${lit(BOWL_S)}
<path d="${LEG_S}" fill="${lc}" fill-opacity=".34" stroke="${lc}" stroke-width="${Math.min(9, 2 * 1.1 * 88 / h).toFixed(2)}" clip-path="url(#${id}-c)"/></svg>`;
  const u = (L === 3 ? 120 : 88) / h; // user units per px: the leg's line never falls under about 1.2px
  const sw = L === 3 ? .6 : L === 1 ? Math.min(3, Math.max(1, 1.7 * u)) : Math.min(2.4, Math.max(.8, 1.2 * u));
  const dash = L >= 2 ? ` stroke-dasharray="${(L === 3 ? 1.2 : sw * 1.7).toFixed(2)} ${(L === 3 ? 1.2 : sw * 1.5).toFixed(2)}"` : '';
  const tw = L === 3 ? .42 : Math.max(.5, .9 * u);
  const tree = L >= 2 ? `<path d="${JOINTS}" fill="none" stroke="${lc}" stroke-width="${tw.toFixed(2)}"/>${TREE.map(([x, y]) => `<rect x="${x}" y="${y}" width="10" height="4" rx="1.4" fill="none" stroke="${lc}" stroke-width="${tw.toFixed(2)}"/>`).join('')}` : '';
  const body = `<path d="${STEM}" fill="${a}"/>${lit(STEM)}<path d="${BOWL}" fill="${b}"/>${lit(BOWL)}
<path d="${LEG}" fill="${lc}" fill-opacity="${L === 1 ? .2 : .1}" stroke="${lc}" stroke-width="${sw.toFixed(2)}" stroke-linejoin="round"${dash}/>${tree}`;
  if (L < 3) return `<svg viewBox="22 16 76 88" ${size} aria-hidden="true">${defs}${body}</svg>`;
  return `<svg viewBox="0 0 120 120" ${size} aria-hidden="true">${defs}
<path d="M6 18H114M6 102H114M24 2V118M96 2V118" fill="none" stroke="${lc}" stroke-width=".4" stroke-dasharray="1.2 1.8" stroke-linecap="round" opacity=".85"/>
<path d="M22.6 18H25.4M24 16.6V19.4M94.6 18H97.4M96 16.6V19.4M22.6 102H25.4M24 100.6V103.4M94.6 102H97.4M96 100.6V103.4" fill="none" stroke="${lc}" stroke-width=".5" stroke-linecap="round"/>
${body}
${POINTS.map(([x, y]) => `<rect x="${x - 1.1}" y="${y - 1.1}" width="2.2" height="2.2" rx=".55" fill="#fff" stroke="${lc}" stroke-width=".42"/>`).join('')}</svg>`;
}

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
 *  markMono()       one colour (currentColor): takes whatever colour it is given, for a state or a small place
 *  markLit(id)      pink and violet, each lit from the top; `id` keeps its gradients apart from another copy's
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

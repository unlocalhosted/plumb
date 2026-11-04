/* ─────────────────────────────────────────────────────────
 * MOTION · React Plumber overlay (docs/design/page-primitives.md, "Motion")
 *
 * What a page's parts share so they move the same way. Durations live in tokens.css (--pl-stagger, --pl-dur-build,
 * --pl-dur-arrive); this module reads them and holds the two physics springs, which CSS can't express.
 *
 *  springs   only for marks you pull or that fall into place; everything else uses the CSS springs in tokens.css
 *              settle   k 300, c 30: a mark coming home
 *              detent   k 600, c 35: a mark pulled into a step
 *  stagger   things arriving in sequence: --pl-stagger apart, and never past 400ms in all, so a long list shares it
 *  reduced   the tokens go to 0 (fades stay at 120ms or less); callers place marks at once instead of springing
 * ───────────────────────────────────────────────────────── */

export const SETTLE = { k: 300, c: 30 };
export const DETENT = { k: 600, c: 35 };
export const SEQUENCE_MAX = 400;

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// one step of a spring, per frame, in seconds: a = −k(x − target) − c·v, on both axes
export function spring(p, tx, ty, { k, c }, dt) {
  p.vx += (-k * (p.x - tx) - c * p.vx) * dt;
  p.vy += (-k * (p.y - ty) - c * p.vy) * dt;
  p.x += p.vx * dt; p.y += p.vy * dt;
}

// a motion token in ms, read where it applies (the reduced-motion values come with it)
export const ms = (el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;

// when the i-th of n things arrives
export const stagger = (el, i, n) => i * Math.min(ms(el, '--pl-stagger'), SEQUENCE_MAX / Math.max(1, n - 1));

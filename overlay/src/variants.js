/* ─────────────────────────────────────────────────────────
 * VARIANTS IN FORCE · React Plumber overlay
 *
 * One rule for every write that changes a class (owner, 2026-11-13: "our apply should never cause loss of behaviour,
 * it should be smart and should only change the behavior on which we are operating upon"):
 *
 *   a change is made in the class that is showing now, and every other class is left exactly as written.
 *
 * A value on the page can come from several classes of one family: the base (`p-4`), a breakpoint (`md:p-6`), the
 * dark theme (`dark:p-5`), a state (`hover:p-8`), or a mix (`md:dark:p-6`). The one showing is the most particular one
 * whose every variant is in force: breakpoints by the window's width, `dark` while the page is dark, a state only while
 * Plumber holds it (`held`). A change to `p-4 md:p-6` seen at a medium window changes `md:p-6`; seen at a narrow one,
 * `p-4`; `hover:p-8` is never touched unless hover is held.
 *
 *   splitVariant('md:hover:p-6')       → { prefix: 'md:hover:', base: 'p-6', parts: ['md', 'hover'] }
 *   activeVariants(el, { held })       → Set of the variant names in force for this element now
 *   prefixesInForce(classes, active)   → the prefixes written on it that are in force, least particular first ('' first)
 *   swapInForce(classes, isFamily, to, active) → { from, to } replacing the family's class showing now with `to`
 *                                        (carrying its prefix), or adding `to` with no prefix when none is written
 * ───────────────────────────────────────────────────────── */

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl'];
const WIDTH = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

/** A class's variant prefix and its bare utility, split at the last top-level colon (not inside [ ] arbitrary values). */
export function splitVariant(cls) {
  // every top-level colon: the variants are what lies between them (`[&:hover]` and `supports-[display:grid]` are one
  // variant each, their colons inside [ ])
  let depth = 0;
  const colons = [];
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === '[') depth++;
    else if (cls[i] === ']') depth--;
    else if (cls[i] === ':' && depth === 0) colons.push(i);
  }
  const last = colons.at(-1) ?? -1, prefix = cls.slice(0, last + 1);
  const parts = colons.map((c, i) => cls.slice(i ? colons[i - 1] + 1 : 0, c));
  return { prefix, base: cls.slice(last + 1), parts };
}

// the width of a breakpoint: the theme's --breakpoint-* when the page defines it, else Tailwind's
function widthOf(name) {
  if (typeof document === 'undefined') return WIDTH[name];
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--breakpoint-${name}`).trim();
  const n = parseFloat(v);
  return n ? n * (/rem$/.test(v) ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 1) : WIDTH[name];
}
// dark is in force when the element sits under a dark class or attribute, or the system is dark and the page hasn't
// chosen light
let systemDark = null; // one media query, kept: its answer follows the system
function isDark(el) {
  if (typeof document === 'undefined') return false;
  const at = el?.closest?.('.dark, .light, [data-theme], [data-mode], [data-color-scheme]');
  if (at) return at.classList.contains('dark') || ['dark'].includes(at.getAttribute('data-theme') ?? at.getAttribute('data-mode') ?? at.getAttribute('data-color-scheme'));
  systemDark ??= typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
  return !!systemDark?.matches;
}

// the breakpoints the window has reached, worked out once per width (the craft rules ask for every element, many
// times; ten style reads each time was most of a page's judging)
let reached = { w: -1, list: [] };
function breakpointsNow() {
  if (typeof matchMedia === 'undefined') return [];
  if (reached.w !== innerWidth) reached = { w: innerWidth, list: BREAKPOINTS.filter((b) => matchMedia(`(min-width: ${widthOf(b)}px)`).matches) };
  return reached.list;
}

/** The variant names in force for an element now: breakpoints that apply, 'dark' if dark, and any states held. */
export function activeVariants(el, { held = [] } = {}) {
  const on = new Set(held);
  for (const b of breakpointsNow()) on.add(b);
  if (isDark(el)) on.add('dark');
  return on;
}

// how particular a prefix is, in Tailwind's own order: more variants is more particular; states (hover:, focus:) come
// before dark:, and breakpoints after both, the wider one last (md over sm)
const rank = (parts) => parts.length * 10 + (parts.includes('dark') ? 0.5 : 0) + Math.max(0, ...parts.map((p) => BREAKPOINTS.indexOf(p) + 1));

/** The prefixes written on these classes whose every variant is in force, least particular first (the base first). */
export function prefixesInForce(classes, active) {
  const seen = new Map([['', []]]);
  for (const c of classes) { const { prefix, parts } = splitVariant(c); if (prefix && !seen.has(prefix) && parts.every((p) => active.has(p))) seen.set(prefix, parts); }
  return [...seen].sort((a, b) => rank(a[1]) - rank(b[1])).map(([p]) => p);
}

/** One prefix's own classes, the prefix taken off (the base's: those with no variant at all). */
export const bareOf = (classes, prefix) => classes.map(splitVariant).filter((s) => s.prefix === prefix).map((s) => s.base);

/**
 * The swap that changes a one-class family (gap, rounded, text size, a width) where it shows: the most particular
 * prefix in force that writes a class of the family has those classes replaced by `to` with the same prefix; with none
 * written, `to` is added bare. Null when nothing would change.
 */
export function swapInForce(classes, isFamily, to, active) {
  const prefixes = prefixesInForce(classes, active);
  const prefix = [...prefixes].reverse().find((p) => bareOf(classes, p).some(isFamily)) ?? '';
  const from = bareOf(classes, prefix).filter(isFamily).map((b) => prefix + b), next = prefix + to;
  if (from.length === 1 && from[0] === next) return null;
  return { from: from.join(' '), to: next };
}

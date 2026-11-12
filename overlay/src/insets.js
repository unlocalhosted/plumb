/* ─────────────────────────────────────────────────────────
 * INSETS · React Plumber overlay (layer 1: read and propose; not in the panel yet)
 *
 * The spacing the stack reader (stacks.js) cannot see: the padding inside a box and the gap between things in a row.
 * They are spacing like any other, so they sit on the same scale: the theme's own steps when it names a scale, else
 * the scale the app's spaces follow (stacks.js spacingScale; docs/VISION.md: "The design system leads").
 *
 *  read     readInsets() → [{ el, cls, prefix, px, control }]: one per spacing class on a stamped element that sets
 *           padding all round or on both sides of an axis (p, px, py) or a gap between columns (gap, gap-x), with the
 *           size it draws. A padding on one side alone (pt-[5px]) is an adjustment, not the box's spacing: not read. A side a
 *           more exact class also sets is that class's (p-4 pt-2: the top is pt-2's). A class whose sides draw unequal
 *           sizes is not read (something else is setting one of them)
 *  propose  proposeInsets(insets, scale, { unit, steps }) → { moves, kept }: a size off the scale goes to the nearest
 *           step when one is within a quarter of it; further than that it is a size of its own and stays (the stack
 *           pass's rule, pass-spacing.md: "a step further than a quarter of the distance away is another level")
 *           With no scale named in the theme, a framework step class (px-2.5) is on the system; only a hand-written
 *           size (p-[18px]) is judged. Not moved: a control's top and bottom padding (its height is the control's size: control-size.js), a
 *           size under 1px, a class under a variant (hover:, md:)
 *           each move: { el, from: { px, cls }, to: { px, cls }, rule: 'spacing/inset' }
 *
 * Nothing here writes. No number of its own.
 * ───────────────────────────────────────────────────────── */
import { classesOf } from './craft-read.js';
import { controlKind } from './roles.js';

const SIDES = { p: ['Top', 'Right', 'Bottom', 'Left'], px: ['Left', 'Right'], py: ['Top', 'Bottom'], pt: ['Top'], pr: ['Right'], pb: ['Bottom'], pl: ['Left'] };
const NEAR_SHARE = 0.25; // stacks.js: a step further than a quarter of the distance away is another level
const px = (v) => parseFloat(v) || 0;

/** Every padding and column-gap class on a stamped element, with the size it draws. */
export function readInsets(root = document.body) {
  const out = [];
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay') || el.closest('svg')) continue;
    const found = [];
    for (const c of classesOf(el).split(/\s+/)) {
      // (a padding on one side alone is an adjustment, often an optical one: `pt-[5px]` lines a label up with the first
      // line beside it. It is not the box's spacing, and snapping it would undo the alignment. It still counts when
      // working out which sides a wider class sets)
      const m = /^(p[xytrbl]?|gap(?:-x)?)-(\[[^\]]+\]|[a-z0-9.]+)$/.exec(c); // no variant, no negative, no important
      // a hand-written size is judged only when it is a plain length: one in a relative unit or a formula
      // (gap-[1cqw], p-[calc(...)], p-[var(--x)]) is worked out by the page, and is never rewritten
      if (m && (!m[2].startsWith('[') || /^\[\d+(?:\.\d+)?(?:px|rem)\]$/.test(m[2]))) found.push({ cls: c, prefix: m[1] });
    }
    if (!found.length) continue;
    const s = getComputedStyle(el), control = !!controlKind(el, s);
    const has = new Set(found.map((f) => f.prefix));
    for (const f of found) {
      if (/^p[trbl]$/.test(f.prefix)) continue;
      let sizes, sides = null;
      if (f.prefix.startsWith('gap')) {
        // a gap between columns: only where the element lays its children out in a row
        if (!(/flex/.test(s.display) && !/column/.test(s.flexDirection)) && !/grid/.test(s.display)) continue;
        sizes = [px(s.columnGap)];
      } else {
        // the sides this class sets that no more exact class on the element sets
        const mine = SIDES[f.prefix].filter((side) => !Object.entries(SIDES).some(([p2, sides]) => p2 !== f.prefix && has.has(p2) && sides.length < SIDES[f.prefix].length && sides.includes(side)));
        sizes = mine.map((side) => px(s[`padding${side}`])); sides = mine;
      }
      if (!sizes.length || new Set(sizes.map((v) => Math.round(v * 10))).size > 1 || sizes[0] < 1) continue;
      // a control's own height is its size (control-size.js): its top and bottom padding is not a spacing decision
      const vertical = control && ['p', 'py', 'pt', 'pb'].includes(f.prefix);
      out.push({ el, cls: f.cls, prefix: f.prefix, px: Math.round(sizes[0] * 10) / 10, control, vertical, props: sides ? sides.map((side) => `padding-${side.toLowerCase()}`) : ['column-gap'] });
    }
  }
  return out;
}

/** Each size off the scale to the nearest step within a quarter of it. */
export function proposeInsets(insets, scale, { unit = 4, steps = [] } = {}) {
  const moves = [], kept = [];
  const on = (d) => Math.abs(d - Math.round(d)) <= 0.5 && (scale.positions.includes(Math.round(d)) || (scale.halves ?? []).includes(Math.round(d)));
  // the class for a size: the theme's own name for it, else a step of the unit, else the size itself
  const classFor = (prefix, v) => { const own = steps.find((x) => Math.abs(x.px - v) < 0.5); if (own) return `${prefix}-${own.short}`; const n = v / unit; return `${prefix}-${Number.isInteger(n * 2) ? n : `[${v}px]`}`; };
  for (const i of insets) {
    // with no scale named in the theme, the framework's numeric steps are the system (verdict.js: "no named steps: the
    // numeric scale is the system"): px-2.5 is a step; only a hand-written size (p-[18px]) can be off it
    if (i.vertical || on(i.px) || (scale.kind !== 'theme' && !i.cls.includes('['))) { kept.push(i); continue; }
    const to = scale.near(i.px, i.px);
    if (to == null || Math.abs(to - i.px) > i.px * NEAR_SHARE || Math.abs(to - i.px) <= 0.5) { kept.push({ ...i, own: true }); continue; }
    moves.push({ el: i.el, from: { px: i.px, cls: i.cls }, to: { px: to, cls: classFor(i.prefix, to) }, prefix: i.prefix, props: i.props, rule: 'spacing/inset' });
  }
  return { moves, kept };
}

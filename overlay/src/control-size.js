/* ─────────────────────────────────────────────────────────
 * CONTROL SIZE · React Plumber overlay (layer 1: read and propose; no panel yet)
 *
 * A control's height is a decision of the system, not a by-product of its padding. Primer names one fixed height per
 * control size (24, 28, 32, 40, 48px: primer.style/product/primitives/size, read 2026-11-12), and controls that sit in
 * one row share a height so they line up (said by several systems' form-sizing guidance; read second-hand, see
 * docs/references.md). Generated code misses it in small ways: a border added to one button of a pair makes it 2px
 * taller than its neighbour.
 *
 *  read     readControls() → [{ el, h, cls, tag }]: every stamped control drawn on the page (a button, a field, a
 *           select, something with the button role), its drawn height, the class that sets a height on it if one does.
 *           A field with no box of its own (transparent, no border) is not read: the box round it is the control;
 *           nor is a button whose words have wrapped onto a second line (its height is the window's doing)
 *  rows     controls with the same parent whose middles sit on one line
 *  propose  proposeControlSizes(controls, { unit }) → { moves, said, kept }: in a row whose controls differ in height,
 *           the height that sits on the project's spacing unit is the row's (a height off the unit is the accident: a
 *           border on top of padding, a stray line height); the others go to it. When no single height in the row is
 *           on the unit, plumber says the row is uneven and proposes nothing: it has no ground to pick one. Several
 *           heights that are each on the unit are a set of sizes shown on purpose, and are left without a word
 *           A control whose own height is off the unit goes onto it ('control/off-unit'): to its height without its
 *           border when that sits on the unit (the border was added on top of a box already sized: the pair's other
 *           button has none), else to the nearest step of the unit; a tie between two steps is said, not moved. A
 *           control only stretched to an off-unit row-mate needs no change of its own
 *           each move: { el, from: { h, cls }, to: { h, cls }, row, rule }
 *
 * Nothing here writes. No number of its own: half a pixel is the overlay's "same value", the unit is the project's.
 * ───────────────────────────────────────────────────────── */
import { utility } from './craft-read.js';

const CONTROL = 'button, select, textarea, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]), [role=button]';
const px = (v) => parseFloat(v) || 0;
const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
const boxed = (s) => alpha(s.backgroundColor) > 0 || s.backgroundImage !== 'none' || px(s.borderTopWidth) > 0 || s.boxShadow !== 'none';

/** Every stamped control drawn on the page, with its height. */
export function readControls(root = document.body) {
  const out = [];
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (!el.matches(CONTROL) || el.closest('plumb-overlay') || el.closest('svg')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (el.matches('input, select, textarea') && !boxed(s)) continue; // the box round it is the control
    if (!boxed(s) && !(px(s.paddingTop) + px(s.paddingBottom) > 0)) continue; // a bare icon or word you can press has no box to size
    // a label that has wrapped onto a second line makes the control as tall as its words: that is the window being
    // narrow, not the control's size (more than one line box inside it)
    const tops = new Set(), walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { if (!/\S/.test(n.nodeValue)) continue; const range = document.createRange(); range.selectNodeContents(n); for (const q of range.getClientRects()) if (q.width > 1) tops.add(Math.round(q.top)); }
    if (tops.size > 1) continue;
    out.push({ el, tag: el.localName, h: Math.round(r.height * 2) / 2, top: r.top, border: px(s.borderTopWidth) + px(s.borderBottomWidth), cls: utility(el, 'h') ?? utility(el, 'size') });
  }
  return out;
}

// controls with the same parent whose middles sit on one line (within half the shorter one's height)
function rowsOf(controls) {
  const byParent = new Map();
  for (const c of controls) { const p = c.el.parentElement; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(c); }
  const rows = [];
  for (const group of byParent.values()) {
    const left = [...group];
    while (left.length) {
      const a = left.shift(), mid = (c) => c.top + c.h / 2;
      const row = [a, ...left.filter((b) => Math.abs(mid(a) - mid(b)) <= Math.min(a.h, b.h) / 2)];
      for (const b of row.slice(1)) left.splice(left.indexOf(b), 1);
      if (row.length > 1) rows.push(row);
    }
  }
  return rows;
}

/** Each uneven row: its controls to the height that sits on the spacing unit, or said when none does. */
export function proposeControlSizes(controls, { unit = 4, steps = [] } = {}) {
  const moves = [], said = [], kept = [];
  const onUnit = (h) => Math.abs(h / unit - Math.round(h / unit)) < 1e-6;
  // the class for a height: the theme's own name for that size when it names one, else the step of the unit
  const classFor = (h) => { const own = steps.find((x) => Math.abs(x.px - h) < 0.5); return `h-${own ? own.short : h / unit}`; };
  // a control's own height, off the unit
  const rows = rowsOf(controls), rowOf = new Map(rows.flatMap((row) => row.map((c) => [c, row])));
  const moved = new Set();
  for (const c of controls) {
    if (onUnit(c.h)) continue;
    const row = rowOf.get(c) ?? [c];
    const inner = c.h - c.border, lo = Math.floor(c.h / unit) * unit, hi = lo + unit;
    // stretched to a row-mate that has a border of its own to answer for: it follows when that one is put right
    if (!c.border && row.some((x) => x !== c && x.h === c.h && x.border && onUnit(x.h - x.border))) { kept.push(c); continue; }
    const to = c.border && onUnit(inner) ? inner : c.h - lo < hi - c.h ? lo : hi - c.h < c.h - lo ? hi : null;
    if (to === null) { said.push({ row: [c.el], heights: [c.h], why: `it sits halfway between ${lo}px and ${hi}px` }); continue; }
    moves.push({ el: c.el, from: { h: c.h, cls: c.cls }, to: { h: to, cls: classFor(to) }, row: row.map((x) => x.el), rule: 'control/off-unit', ...(c.border && to === inner ? { why: 'its border was added on top of its height' } : {}) });
    moved.add(c);
  }
  for (const row of rows) {
    if (row.some((c) => moved.has(c))) continue; // already answered above
    const heights = [...new Set(row.map((c) => c.h))];
    if (heights.length < 2) { kept.push(...row); continue; }
    const fits = heights.filter(onUnit);
    // several heights, each on the unit, side by side: a set of sizes shown on purpose (small, medium, large), not a slip
    if (fits.length > 1) { kept.push(...row); continue; }
    if (!fits.length) { said.push({ row: row.map((c) => c.el), heights, why: 'none of their heights sits on your spacing unit' }); continue; }
    const to = fits[0];
    for (const c of row) {
      if (c.h === to) continue;
      moves.push({ el: c.el, from: { h: c.h, cls: c.cls }, to: { h: to, cls: classFor(to) }, row: row.map((x) => x.el), rule: 'control/row-height' });
    }
  }
  return { moves, said, kept };
}

/* Drift grouped by cause, for the fix panel (fixpanel.js) and the reader (blueprint-reader.js).
 *
 *  group      one group per cause: the same class under the same rule (p-[10px] off the spacing scale), with its
 *             places and how many source lines they come from; groups run by places, most first (groupsOf)
 *  in code    drift the overlay can't fix here (an inline style, a value from config) is counted, not grouped (inCode)
 *  note       a craft finding with nothing to write is a note (isNote)
 *
 * The docked panel that once drew these rows is gone (the fix panel took its place); PANEL_CSS is still part of the
 * overlay's stylesheet and has not been pruned.
 */
import { FIX } from './words.js';

export const PANEL_CSS = `
  .bpp { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-start: var(--pl-space-6); max-height: calc(100vh - 2 * var(--pl-space-6) - var(--pl-tag-h) - 18px);
    width: 300px; max-width: calc(100vw - 2 * var(--pl-space-6)); display: flex; flex-direction: column; box-sizing: border-box; pointer-events: auto;
    opacity: 0; translate: 8px 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out), translate var(--pl-dur-undim) var(--pl-ease-out); }
  .bpp[hidden] { display: none; }
  .bpp[data-side="start"] { inset-inline-end: auto; inset-inline-start: var(--pl-space-6); }
  .bpp[data-away] { visibility: hidden; }
  .bpp[data-on] { opacity: 1; translate: 0 0; transition-duration: var(--pl-dur-card); }
  @media (prefers-reduced-motion: reduce) { .bpp { transition: none; translate: 0 0; } }
  .bpp .head { all: unset; flex: none; display: flex; align-items: center; gap: var(--pl-space-4); box-sizing: border-box; padding: var(--pl-space-4) var(--pl-space-5); cursor: pointer; border-radius: var(--pl-radius-card); }
  .bpp .head:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -2px; }
  .bpp .head .title { font: var(--pl-card-title); }
  .bpp .head .meta { font: var(--pl-card-meta); color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bpp .head .chev { margin-inline-start: auto; width: 10px; height: 10px; color: var(--pl-icon-secondary); transition: rotate var(--pl-dur-feedback) var(--pl-ease-out); }
  /* folded: one line, as wide as its words */
  .bpp:not([data-open]) { width: auto; }
  .bpp:not([data-open]) :is(.rows, .foot, .head .title, .head .more) { display: none; }
  .bpp[data-open] .head { flex-wrap: wrap; row-gap: var(--pl-space-1); border-bottom: 1px solid var(--pl-border-default); border-radius: var(--pl-radius-card) var(--pl-radius-card) 0 0; }
  .bpp[data-open] .head .title { flex: 1 0 auto; }
  .bpp[data-open] .head .meta { order: 3; flex-basis: 100%; }
  .bpp[data-open] .head .chev { rotate: 180deg; }
  @media (hover: hover) and (pointer: fine) { .bpp:not([data-open]) .head:hover { background: var(--pl-bg-surface-hover); } }
  .bpp .head .meta .off { color: var(--pl-off); font-weight: 600; }
  .bpp .rows { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--pl-space-2); margin: 0; list-style: none; }
  .bpp .row { all: unset; display: grid; grid-template-columns: 8px 1fr auto; column-gap: var(--pl-space-4); row-gap: 1px; align-items: baseline;
    width: 100%; box-sizing: border-box; padding: var(--pl-space-3) var(--pl-space-4); border-radius: var(--pl-radius-row); cursor: pointer; }
  .bpp .row .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pl-off); align-self: center; }
  .bpp .row .dot.soft { background: var(--pl-soft); } .bpp .row .dot.picked { background: var(--pl-on); }
  .bpp .row code { font: var(--pl-card-code); color: var(--pl-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .bpp .row code .to { color: var(--pl-on); }
  .bpp .row .n { font: var(--pl-card-code); color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; }
  .bpp .row .what { grid-column: 2 / -1; font: var(--pl-card-meta); color: var(--pl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (hover: hover) and (pointer: fine) { .bpp .row:hover { background: var(--pl-bg-surface-hover); } }
  .bpp .row:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -2px; }
  .bpp .row:active { background: var(--pl-bg-inset); }
  .bpp .row[aria-current="true"] { background: var(--pl-bg-inset); box-shadow: inset 2px 0 0 var(--pl-instrument); }
  .bpp .row .acts { grid-column: 2 / -1; display: none; gap: var(--pl-space-3); margin-top: var(--pl-space-3); }
  .bpp .row[aria-current="true"] .acts { display: flex; }
  .bpp .row .acts span { font: var(--pl-card-label); letter-spacing: var(--pl-tracking-label); padding: 3px var(--pl-space-4); border-radius: var(--pl-radius-tag); }
  .bpp .row .acts .fix { background: var(--pl-action-soft); color: var(--pl-on-action); }
  .bpp .row .acts .next { color: var(--pl-text-secondary); box-shadow: inset 0 0 0 1px var(--pl-border-default); }
  .bpp .empty { padding: var(--pl-space-6) var(--pl-space-5); font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .bpp .empty b { display: block; font: var(--pl-card-title); color: var(--pl-text-primary); margin-bottom: var(--pl-space-1); }
  .bpp .foot { flex: none; display: flex; align-items: center; gap: var(--pl-space-5); padding: var(--pl-space-4) var(--pl-space-5); border-top: 1px solid var(--pl-border-default); font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .bpp .foot .code { margin-inline-end: auto; }
  .bpp .foot .code[hidden] + .keys { margin-inline-start: auto; }
  .bpp .foot kbd { font: 500 10px/13px var(--pl-mono); color: var(--pl-text-secondary); }
`;

// What is wrong with a class, in words: the kind of finding in its family.
// What is wrong with a class, in words (words.js: one voice)
const whatOf = (mark) => FIX.what(mark);
const soft = (mark) => /framework|tier|by-value|matches/.test(mark.rule);
// What a problem is, said once for every count on screen (the dock, the fix panel's line, the reader's progress):
// a new mark that is neither written in code the overlay can't reach (inCode) nor a note. A note is what a craft rule
// measured on the page with no exact fix (advice); a craft finding that suggests an edit is a problem like any other.
export const inCode = (mark) => /opaque-inline|^config\//.test(mark.rule);
export const isNote = (mark) => mark.family === 'craft' && (!mark.craft?.suggest || mark.craft.suggest.kind === 'advice');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Whether some container (or the page) could scroll an element into the free area: a fixed header's avatar can't.
function movable(el, free) {
  const r = el.getBoundingClientRect();
  const dx = r.left + r.width / 2 - (free.left + free.right) / 2, dy = r.top + r.height / 2 - (free.top + free.bottom) / 2;
  const page = document.scrollingElement ?? document.documentElement;
  let x = Math.abs(dx) < 1 || (r.left > free.left && r.right < free.right), y = Math.abs(dy) < 1 || (r.top > free.top && r.bottom < free.bottom);
  for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement && !(x && y); a = a.parentElement) {
    if (getComputedStyle(a).position === 'fixed') return x && y;
    x ||= scrolls(a, 'x'); y ||= scrolls(a, 'y');
  }
  return (x || page.scrollWidth > page.clientWidth) && (y || page.scrollHeight > page.clientHeight);
}
// The place to show for a cause: one already seen, else one that can be scrolled into view, else the first.
const placeOf = (members, free) => members.find((m) => inFree(m.el, free)) ?? members.find((m) => movable(m.el, free)) ?? members[0];

// The part of the view the page can be seen in: left of the panel.
const freeOf = (panel) => ({ left: 0, top: 0, right: panel ? panel.left - 8 : innerWidth, bottom: innerHeight });
const inFree = (el, free) => { const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return r.width > 0 && cx > free.left && cx < free.right && cy > free.top && cy < free.bottom; };
const scrolls = (el, axis) => { const s = getComputedStyle(el); const o = axis === 'x' ? s.overflowX : s.overflowY; return /(auto|scroll|overlay)/.test(o) && (axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight); };

// The drift in items grouped by cause: [{ key, text, what, soft, members: [{ el, mark, id, item }], lines }], most
// places first, and how many are set in code.
export function groupsOf(items) {
  const groups = new Map();
  let code = 0;
  for (const item of items) item.marks.forEach((mark, k) => {
    if (mark.ledger !== 'new') return;
    if (inCode(mark)) { code++; return; }
    const text = mark.text ?? mark.props?.join(' ') ?? mark.rule;
    const key = `${mark.rule}|${text}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, text, what: whatOf(mark), soft: soft(mark), members: [], stamps: new Set() }));
    g.members.push({ el: item.el, mark, id: `${item.id}:${k}:${mark.key}`, item });
    g.stamps.add(item.el?.getAttribute('data-plumb-source')?.split('#')[0] ?? item.site?.file ?? `${item.id}`);
  });
  const list = [...groups.values()].sort((a, b) => b.members.length - a.members.length || a.text.localeCompare(b.text));
  for (const g of list) g.lines = g.stamps.size;
  return { groups: list, code };
}

/* ─────────────────────────────────────────────────────────
 * LAYOUT AND SPACING · the element card's second layer (elementcard.js)
 *
 * docs/design/prototypes/element-cards.html, the `── layout` and `── the measuring layer` blocks.
 *
 *  Layout ›   Flex | Grid. Flex: direction and wrap. Grid: the columns as chips (a click gives the next size; + and −),
 *             their lines drawn on the element and dragged there (fr stays fr, re-weighted; a fixed size becomes px),
 *             and "Rows follow these columns": every row's own columns follow the grid's (subgrid on the children).
 *             The options are the element itself laid out each way, in the strip. Writes lists the exact class
 *             changes, line by line, before anything is written; Write it writes them in one go, one Undo.
 *  Spacing    on the element while its card is open, any view: point near an edge and that side's padding shows
 *             inside it (green) or its margin outside (amber); between children the gap shows (violet). Pointing
 *             inside a child shows the child's own (it is edited through). One wheel notch, or ~40px of trackpad, is one
 *             step of the spacing scale, with a detent; a drag across the band is a step per 10px. ⇧ is the pair, ⌘
 *             every side; the bands that will change light up while the key is held. The value and its step float by
 *             the pointer ("16 · s4", coral off the scale) over the scale around it, the step that keeps the hierarchy
 *             marked (inside < between ≤ around) with the rule in words. It writes when the hand stops (or Enter); Esc
 *             puts it back.
 * Writes are class changes on an element ({ el, from, to }): the card writes each where the element's classes are
 * written (locate.js classSiteOf: its own line, or the usage that passes them in), and refuses one written nowhere.
 * ───────────────────────────────────────────────────────── */
import { activeVariants, swapInForce } from './variants.js';
import { boxEditOf } from './inplace.js';
import { esc } from './choices.js';
import { FIX } from './words.js';
import { clearOf } from './geometry.js';
import { STAMP_ATTRIBUTE, placeOf, atPlace } from './stamp.js';
import { Claims, LEVEL } from './claims.js';

const W = FIX.card;
const STILL = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SIDES = ['top', 'right', 'bottom', 'left'];
const PAIR = { top: ['top', 'bottom'], bottom: ['top', 'bottom'], left: ['left', 'right'], right: ['left', 'right'] };
const ZONE = 12;            // px outside the element that point at its margin
const NOTCH = 40;           // px of trackpad travel per step
const IDLE = 700;           // ms without a step before a scroll writes
const NEXT_TRACK = { auto: '1fr', '1fr': '2fr', '2fr': '160px', '160px': 'auto' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const num = (v) => parseFloat(v) || 0;
const kids = (el) => [...el.children].filter((k) => { const r = k.getBoundingClientRect(); return r.width || r.height; });
// the classes the element is written with (variants like hover: are never this layer's)
const classesOf = (el) => [...el.classList].filter((c) => !c.includes(':'));

export const LAYOUT_CSS = `
  /* the spacing layer: bands where the spacing lives, the value by the pointer */
  .sp-layer { position: fixed; inset: 0; z-index: 3; pointer-events: none; }
  .sp-band { position: fixed; border-radius: 2px; }
  .sp-band.pad { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mark-padding) 35%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-padding) 10%, transparent) 1.5px 5px); }
  .sp-band.mar { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mark-margin) 40%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-margin) 10%, transparent) 1.5px 5px); }
  .sp-band.gap { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mark-gap) 40%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-gap) 10%, transparent) 1.5px 5px); }
  .sp-box { position: fixed; border-radius: 6px; box-shadow: 0 0 0 1px color-mix(in oklab, var(--pl-mark-padding) 55%, transparent); }
  .sp-box em { position: absolute; left: 0; top: -18px; font: 600 10px/1 ui-monospace, monospace; font-style: normal; color: var(--pl-state-written-text); background: var(--pl-bg-surface); padding: 2px 5px; border-radius: 4px; white-space: nowrap; box-shadow: 0 0 0 .5px rgb(26 158 98 / .4); }
  .sp-bub { position: fixed; z-index: 6; pointer-events: none; display: grid; gap: 4px; padding: 7px 9px 8px; border-radius: 10px; background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: 0 8px 24px -8px rgb(0 0 0 / .4); font: 11px/1.3 var(--pl-sans, system-ui), sans-serif; max-width: 240px; }
  .sp-bub[hidden] { display: none; }
  .sp-bub b { font: 600 13px/1 ui-monospace, monospace; } .sp-bub b.off { color: var(--pl-text-hard-coded); } .sp-bub > span { color: var(--pl-text-secondary); }
  .sp-bub .scale { display: flex; gap: 3px; } .sp-bub .scale i { font: 500 10px/1 ui-monospace, monospace; font-style: normal; padding: 3px 4px; border-radius: 4px; color: var(--pl-text-secondary); }
  .sp-bub .scale i.fit { color: var(--pl-mint); } .sp-bub .scale i.breaks { color: var(--pl-text-disabled); text-decoration: line-through; } .sp-bub .scale i.at { background: var(--pl-sky-soft); color: var(--pl-sky-ink); text-decoration: none; }
  .sp-bub small { color: var(--pl-text-secondary); font-size: 10.5px; }
  :host([data-spacing="ns"]), :host([data-spacing="ns"]) * { cursor: ns-resize !important; } :host([data-spacing="ew"]), :host([data-spacing="ew"]) * { cursor: ew-resize !important; }
  /* the layout drill */
  .ec .lay-mode { display: flex; margin: 2px 12px 8px; padding: 2px; border-radius: 9px; background: var(--pl-bg-inset); }
  .ec .lay-mode button { flex: 1; height: 28px; border-radius: 7px; font: 600 12.5px/1 var(--pl-sans, system-ui); color: var(--pl-text-secondary); transition: background 120ms, box-shadow 120ms, color 120ms; }
  .ec .lay-mode button[aria-checked="true"] { background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: 0 1px 2px rgb(0 0 0 / .1), 0 0 0 .5px rgb(0 0 0 / .06); }
  .ec .lay-row { display: grid; grid-template-columns: 70px 1fr; align-items: center; gap: 8px; margin: 0 12px 6px; }
  .ec .lay-row .k { font-size: 11.5px; color: var(--pl-text-secondary); }
  .ec .lay-row .seg { margin: 0; }
  .ec .lay-lab { display: flex; justify-content: space-between; gap: 8px; margin: 6px 14px 6px; font: 600 10.5px/1 var(--pl-sans, system-ui); letter-spacing: .06em; text-transform: uppercase; color: var(--pl-text-secondary); }
  .ec .lay-lab span { font: 500 11px/1 var(--pl-sans, system-ui); letter-spacing: 0; text-transform: none; }
  .ec .lay-tracks { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 12px 8px; }
  .ec .lay-tk { height: 28px; padding: 0 9px; border-radius: 8px; background: var(--pl-bg-inset); font: 600 11.5px/1 ui-monospace, monospace; color: var(--pl-state-on-token-text); transition: background 120ms, scale 140ms; }
  @media (hover: hover) and (pointer: fine) { .ec .lay-tk:hover { background: rgb(0 0 0 / .07); } }
  .ec .lay-tk:active { scale: .96; } .ec .lay-tk.add { color: var(--pl-text-secondary); min-width: 28px; }
  .ec .lay-sub { display: flex; align-items: center; gap: 8px; width: calc(100% - 24px); margin: 0 12px 6px; height: 32px; padding: 0 9px; border-radius: 9px; background: var(--pl-bg-inset); text-align: left; }
  .ec .lay-sub[disabled] { opacity: .45; cursor: default; }
  .ec .lay-sub .val { font-weight: 550; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ec .lay-sub .lay-subtag { margin-left: auto; font: 500 10.5px/1 ui-monospace, monospace; color: var(--pl-text-secondary); }
  .ec .lay-sw { width: 28px; height: 16px; border-radius: 8px; background: rgb(0 0 0 / .15); position: relative; flex: none; transition: background 160ms; }
  .ec .lay-sw i { position: absolute; left: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--pl-bg-surface); box-shadow: 0 1px 2px rgb(0 0 0 / .2); transition: translate 220ms cubic-bezier(.2, .9, .25, 1.2); }
  .ec .lay-sub[aria-checked="true"] .lay-sw { background: var(--pl-border-focus); } .ec .lay-sub[aria-checked="true"] .lay-sw i { translate: 12px 0; }
  .ec .say { margin: 0 14px 8px; font-size: 11.5px; color: var(--pl-text-secondary); }
  .ec .keys { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 14px 10px; font-size: 11px; color: var(--pl-text-secondary); } .ec .keys b { color: var(--pl-text-primary); font-weight: 600; }
  .ec .putback { height: 26px; padding: 0 9px; border-radius: 8px; color: var(--pl-text-secondary); font-weight: 550; } .ec .putback:hover { background: var(--pl-bg-surface-hover); }
  /* column lines and track names on the element */
  .lay-h { position: fixed; inset: 0; z-index: 3; pointer-events: none; }
  .lay-line { position: fixed; width: 10px; margin-left: -5px; pointer-events: auto; cursor: col-resize; }
  .lay-line::before { content: ''; position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; border-radius: 1px; background: color-mix(in oklab, var(--pl-border-focus) 35%, transparent); transition: background 120ms, width 120ms, left 120ms; }
  .lay-line:hover::before, .lay-line[data-held]::before { background: var(--pl-border-focus); width: 3px; left: 3.5px; }
  .lay-track { position: fixed; height: 16px; display: flex; justify-content: center; pointer-events: none; }
  .lay-track b { font: 600 10px/16px ui-monospace, monospace; padding: 0 6px; border-radius: 5px; background: var(--pl-bg-selected); color: var(--pl-state-on-token-text); white-space: nowrap; }
  @media (prefers-reduced-motion: reduce) { .ec .lay-sw, .ec .lay-sw i { transition: none; } }
`;

// the colour the element sits on: the first ancestor that paints a background
export function groundOf(el) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && c !== 'transparent' && !/rgba?\(.*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c)) return c;
  }
  return '#fff';
}
// the element as it looks now, its styles written onto a copy (the strip is outside the page's stylesheets): no ids, no
// source stamps (the page's lookups never find a copy), no transitions, sat where the strip puts it. Every computed
// property is written on the element itself; inside it, the ones that draw a box and its words (reading all ~350 of
// every node made a large element's strip take seconds), and at most COPY_NODES of them: a copy shows the element, not
// all of a page section's content
const COPY_NODES = 300;
const DRAWN = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items', 'justify-self', 'order', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'overflow-x', 'overflow-y', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-clip',
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line', 'text-overflow', 'white-space', 'word-break', 'vertical-align', 'list-style-type',
  'opacity', 'visibility', 'box-shadow', 'transform', 'transform-origin', 'object-fit', 'aspect-ratio', 'fill', 'stroke', 'stroke-width', 'isolation', 'filter'];
export function freeze(el) {
  const copy = el.cloneNode(true), from = [el, ...el.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((s, i) => {
    const d = to[i];
    if (i > COPY_NODES) { d.remove(); return; } // past the cap: left out of the copy (its descendants come later, and go too)
    const cs = getComputedStyle(s);
    let css = '';
    if (i === 0) for (const p of cs) css += `${p}:${cs.getPropertyValue(p)};`;
    else for (const p of DRAWN) { const v = cs.getPropertyValue(p); if (v) css += `${p}:${v};`; }
    d.setAttribute('style', css);
    d.removeAttribute('id'); d.removeAttribute(STAMP_ATTRIBUTE); d.removeAttribute('contenteditable');
    d.setAttribute('inert', '');
  });
  Object.assign(copy.style, { position: 'relative', inset: 'auto', margin: '0', transform: 'none', transition: 'none', animation: 'none', pointerEvents: 'none' });
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}
// a copy in the strip: shrunk to its width, so it is seen side to side; a tall one shows its top (a page section shrunk
// to its height would be a sliver)
export const COPY_FIT = { w: 480, h: 260 };
export function fitCopy(copy, el) {
  const r = el.getBoundingClientRect(), k = Math.min(1, COPY_FIT.w / Math.max(1, r.width));
  if (k < 1) copy.style.zoom = String(Math.round(k * 1000) / 1000);
  if (r.height * k > COPY_FIT.h) Object.assign(copy.style, { maxHeight: `${Math.round(COPY_FIT.h / k)}px`, overflow: 'hidden' });
  return copy;
}
// inline values put on an element and taken off exactly
class Inline {
  #claims; // claims.js keeps what the page had
  constructor(level) { this.#claims = new Claims(level); }
  set(el, props) {
    for (const [p, v] of Object.entries(props)) { if (v === null) this.#claims.unset(el, p); else this.#claims.set(el, p, v); }
  }
  clear() { this.#claims.clear(); }
  get on() { return this.#claims.size > 0; }
}
// the line an element is written on (a list's rows share one): its stamp
const matesOf = (el) => { const s = placeOf(el); return s ? [...document.querySelectorAll(atPlace(s))].filter((x) => x !== el).length : 0; };

// ── the spacing grammar ──────────────────────────────────
// host: { release(), target() → el | null, name(el) → words, scale() → [{ px, token }] (0 first), write([{ el, from, to }],
//   said) → Promise, refused(text), locked(el) → words | null (its classes can't be written), mates(el) → n | null (the
//   others drawn from its class site), held() → bool (a card handle is held), ours(event) → bool, avoid() → [rect] (the
//   card, its strip, the fix bar: never pointed through, never covered by the bubble) }
export class Spacing {
  #host; #layer; #bub; #root;
  #on = false; #hover = null; #act = null; #at = [0, 0];
  #mods = { shift: false, meta: false };
  #inline = new Inline(LEVEL.drag);
  #swallow = false;

  constructor(root, host) {
    this.#host = host; this.#root = root;
    this.#layer = Object.assign(document.createElement('div'), { className: 'sp-layer' });
    this.#bub = Object.assign(document.createElement('div'), { className: 'sp-bub pl-dark', hidden: true });
    this.#bub.setAttribute('role', 'status');
    root.append(this.#layer, this.#bub);
  }
  get active() { return !!this.#act; }
  #unhand = null; // the band drag's listeners, let go however the drag ends (up, cancel, Esc, off)
  on() {
    if (this.#on) return;
    this.#on = true;
    addEventListener('pointermove', this.#move, { capture: true, passive: true });
    addEventListener('wheel', this.#wheel, { capture: true, passive: false });
    addEventListener('pointerdown', this.#down, { capture: true });
    addEventListener('click', this.#click, { capture: true });
    addEventListener('keydown', this.#keys, { capture: true });
    addEventListener('keyup', this.#keys, { capture: true });
  }
  off() {
    if (!this.#on) return;
    this.#unhand?.();
    this.#end(false);
    this.#on = false; this.#hover = null; this.#draw();
    removeEventListener('pointermove', this.#move, { capture: true });
    removeEventListener('wheel', this.#wheel, { capture: true });
    removeEventListener('pointerdown', this.#down, { capture: true });
    removeEventListener('click', this.#click, { capture: true });
    removeEventListener('keydown', this.#keys, { capture: true });
    removeEventListener('keyup', this.#keys, { capture: true });
  }
  // Enter writes the change in hand, Esc puts it back
  key(k) {
    if (!this.#act) return false;
    if (k === 'Escape') { this.#end(false); return true; }
    if (k === 'Enter') { this.#end(true); return true; }
    return false;
  }

  #modsOf(e) {
    const m = { shift: !!e.shiftKey, meta: !!(e.metaKey || e.ctrlKey) };
    if (m.shift !== this.#mods.shift || m.meta !== this.#mods.meta) { this.#mods = m; return true; }
    return false;
  }
  #keys = (e) => { if (this.#modsOf(e) && (this.#hover || this.#act)) this.#draw(); };
  #move = (e) => {
    if (!this.#on || this.#act?.drag) return;
    const changed = this.#modsOf(e);
    this.#at = [e.clientX, e.clientY];
    let b = this.#host.held?.() || this.#host.ours?.(e) || this.#onSurface(e.clientX, e.clientY) ? null : this.#find(e.clientX, e.clientY);
    // an element whose classes can't be written (the card says why, once) has no bands: nothing offered, nothing taken
    if (b && this.#host.locked?.(b.el)) b = null;
    if (!this.#act && (changed || !same(b, this.#hover))) {
      // pointing at the element's spacing is working in the card: a cause the fix panel holds (and previews) is put down
      if (b && !this.#hover) this.#host.release?.();
      this.#hover = b;
    }
    this.#draw();
  };
  // scroll: one notch (or ~40px of trackpad) is one step; the page doesn't scroll under a band
  #wheel = (e) => {
    // Alt+scroll walks the tree (widget.js), never a spacing step
    if (!this.#on || e.altKey) return;
    const b = this.#act?.band ?? this.#hover;
    // a locked element takes no wheel: the page scrolls as it would
    if (!b || this.#host.ours?.(e) || (!this.#act && this.#host.locked?.(b.el))) return;
    e.preventDefault(); e.stopPropagation();
    this.#modsOf(e);
    if (!this.#act) this.#start(b);
    const a = this.#act, d = e.deltaY || e.deltaX, notch = e.deltaMode === 1 || Math.abs(d) >= 50;
    a.acc += notch ? Math.sign(d) * NOTCH : d;
    while (Math.abs(a.acc) >= NOTCH) { this.#step(a.acc < 0 ? 1 : -1); a.acc -= Math.sign(a.acc) * NOTCH; }
    this.#at = [e.clientX, e.clientY];
    this.#draw();
    clearTimeout(a.idle); a.idle = setTimeout(() => this.#end(true), IDLE);
  };
  // drag across a band: a step per 10px, outward is more
  #down = (e) => {
    if (!this.#on || e.button !== 0 || !this.#hover || this.#act || this.#host.ours?.(e)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (this.#lockedSay(this.#hover)) return;
    const b = this.#hover, vertical = b.kind === 'gap' ? b.axis === 'y' : b.side === 'top' || b.side === 'bottom';
    const sign = b.kind === 'gap' ? 1 : b.side === 'top' || b.side === 'left' ? -1 : 1; // outward is more
    this.#modsOf(e);
    this.#start(b, true);
    const p0 = vertical ? e.clientY : e.clientX;
    let done = 0;
    const stop = () => { removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); if (this.#unhand === stop) this.#unhand = null; };
    const move = (ev) => {
      if (!this.#act) return stop(); // ended under the drag (Esc): its listeners go with it
      this.#modsOf(ev);
      const want = Math.trunc((((vertical ? ev.clientY : ev.clientX) - p0) * sign) / 10);
      while (done !== want) { const dir = want > done ? 1 : -1; this.#step(dir); done += dir; }
      this.#at = [ev.clientX, ev.clientY];
      this.#draw();
    };
    const up = () => { stop(); this.#swallow = true; setTimeout(() => { this.#swallow = false; }, 0); this.#end(true); };
    // the browser took the pointer: the band goes back, as Esc does
    const cancel = () => { stop(); this.#end(false); };
    this.#unhand = stop;
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true);
  };
  // the pointer on one of the overlay's own surfaces (the fix bar over a large element) points at it, not at the page
  #onSurface(x, y) { return (this.#host.avoid?.() ?? []).some((r) => r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom); }
  // an element whose classes can't be written: said once, nothing is tried on it
  #lockedSay(b) { const why = this.#host.locked?.(b.el); if (why) this.#host.refused?.(why); return !!why; }
  // the click a drag ends with is the drag's, never the page's (or Blueprint's "click outside")
  #click = (e) => { if (this.#swallow || this.#act?.drag) { e.preventDefault(); e.stopImmediatePropagation(); this.#swallow = false; } };

  // ── which band is under the pointer: inside a child, that child's padding (edited through); inside the element, its
  // padding or the gap between children; just outside, its margin ──
  #find(px, py) {
    const t = this.#host.target?.(); if (!t?.isConnected) return null;
    const hit = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    const sideOf = (r) => Object.entries({ top: py - r.top, bottom: r.bottom - py, left: px - r.left, right: r.right - px }).sort((a, c) => Math.abs(a[1]) - Math.abs(c[1]))[0];
    const padOf = (el, side) => num(getComputedStyle(el)[`padding${cap(side)}`]);
    const r = t.getBoundingClientRect();
    if (hit(r, px, py)) {
      for (const el of kids(t)) {
        const k = el.getBoundingClientRect();
        if (!hit(k, px, py)) continue;
        const [side, d] = sideOf(k);
        return d <= Math.max(6, padOf(el, side)) ? { el, kind: 'pad', side } : null;
      }
      const ks = kids(t).map((k) => k.getBoundingClientRect());
      for (let i = 1; i < ks.length; i++) {
        const a = ks[i - 1], c = ks[i];
        if (c.top >= a.bottom - 0.5 && py >= a.bottom && py <= c.top && px >= r.left && px <= r.right) return { el: t, kind: 'gap', axis: 'y' };
        if (Math.abs(c.top - a.top) < 2 && c.left >= a.right - 0.5 && px >= a.right && px <= c.left) return { el: t, kind: 'gap', axis: 'x' };
      }
      const [side, d] = sideOf(r);
      return d <= Math.max(6, padOf(t, side)) + 1 ? { el: t, kind: 'pad', side } : null;
    }
    const out = { left: r.left - ZONE, right: r.right + ZONE, top: r.top - ZONE, bottom: r.bottom + ZONE };
    if (hit(out, px, py)) return { el: t, kind: 'mar', side: px < r.left ? 'left' : px > r.right ? 'right' : py < r.top ? 'top' : 'bottom' };
    return null;
  }
  // the sides a gesture changes, with the keys held
  #sides(b, mods = this.#mods) { return b.kind === 'gap' ? [] : mods.meta ? SIDES : mods.shift ? PAIR[b.side] : [b.side]; }
  #valueOf(el, kind, side) {
    const cs = getComputedStyle(el);
    if (kind === 'gap') return num(cs.rowGap === 'normal' ? cs.columnGap : cs.rowGap) || num(cs.columnGap);
    return num(cs[`${kind === 'pad' ? 'padding' : 'margin'}${cap(side)}`]);
  }

  // ── a gesture ──
  #start(b, drag = false) {
    this.#act = { band: b, drag, acc: 0, idle: 0, value: this.#valueOf(b.el, b.kind, b.side ?? 'top'), from: this.#valueOf(b.el, b.kind, b.side ?? 'top'), sides: this.#sides(b), moved: false };
    this.#hover = b;
  }
  #step(dir) {
    const a = this.#act, scale = this.#host.scale?.() ?? [];
    if (!scale.length) return;
    const ns = scale.map((s) => s.px), v = a.value;
    const i = ns.findIndex((n) => Math.abs(n - v) < 0.5);
    const j = i >= 0 ? i + dir : dir > 0 ? ns.findIndex((n) => n > v) : ns.length - 1 - [...ns].reverse().findIndex((n) => n < v);
    if (j < 0 || j >= ns.length || (i < 0 && (dir > 0 ? !ns.some((n) => n > v) : !ns.some((n) => n < v)))) return;
    a.value = ns[j]; a.moved = true; a.sides = this.#sides(a.band);
    this.#preview();
    if (!STILL()) this.#bub.animate([{ transform: `translateY(${dir > 0 ? -3 : 3}px)` }, { transform: 'none' }], { duration: 140, easing: 'cubic-bezier(.19, 1, .22, 1)' });
  }
  #preview() {
    const a = this.#act, b = a.band;
    this.#inline.clear();
    if (b.kind === 'gap') this.#inline.set(b.el, { gap: `${a.value}px` });
    else this.#inline.set(b.el, Object.fromEntries(a.sides.map((s) => [`${b.kind === 'pad' ? 'padding' : 'margin'}-${s}`, `${a.value}px`])));
  }
  async #end(keep) {
    const a = this.#act; if (!a) return;
    clearTimeout(a.idle);
    this.#act = null;
    if (!keep || !a.moved || Math.abs(a.value - a.from) < 0.5 && a.sides.length === 1) { this.#inline.clear(); this.#draw(); return; }
    const b = a.band, scale = this.#host.scale?.() ?? [], step = scale.find((s) => Math.abs(s.px - a.value) < 0.5);
    if (!step) { this.#inline.clear(); this.#draw(); return; }
    // all its classes, variants too: the change is made in the one showing now (variants.js), the rest kept
    const swap = edit(b, a.sides, step.token, [...b.el.classList], activeVariants(b.el));
    this.#draw();
    if (!swap) { this.#inline.clear(); return; }
    const mates = this.#host.mates?.(b.el) ?? matesOf(b.el), what = W.what(b.kind, a.sides.map((s) => W.sides[s]));
    const said = W.spaced(this.#host.name?.(b.el) ?? b.el.localName, what, a.value, mates);
    try {
      await this.#host.write([{ el: b.el, ...swap }], said);
    } catch (error) { this.#host.refused?.(error?.message ?? String(error)); }
    finally { this.#inline.clear(); this.#draw(); }
  }

  // ── drawing: the bands that change, the element whose they are, the value by the pointer ──
  #draw() {
    const b = this.#act?.band ?? this.#hover;
    const host = this.#root.host;
    if (!b || !this.#on) { this.#layer.innerHTML = ''; this.#bub.hidden = true; host?.removeAttribute('data-spacing'); return; }
    host?.setAttribute('data-spacing', (b.kind === 'gap' ? b.axis === 'y' : b.side === 'top' || b.side === 'bottom') ? 'ns' : 'ew');
    const el = b.el, r = el.getBoundingClientRect(), cs = getComputedStyle(el), parts = [];
    const band = (cls, x, y, w, h) => parts.push(`<span class="sp-band ${cls}" style="left:${x}px;top:${y}px;width:${Math.max(2, w)}px;height:${Math.max(2, h)}px"></span>`);
    const sides = this.#act ? this.#act.sides : this.#sides(b);
    const bw = { top: num(cs.borderTopWidth), right: num(cs.borderRightWidth), bottom: num(cs.borderBottomWidth), left: num(cs.borderLeftWidth) };
    if (b.kind === 'pad') for (const s of sides) {
      const p = num(cs[`padding${cap(s)}`]);
      const x = s === 'right' ? r.right - bw.right - p : r.left + bw.left, y = s === 'bottom' ? r.bottom - bw.bottom - p : r.top + bw.top;
      band('pad', x, y, s === 'left' || s === 'right' ? p : r.width - bw.left - bw.right, s === 'top' || s === 'bottom' ? p : r.height - bw.top - bw.bottom);
    }
    if (b.kind === 'mar') for (const s of sides) {
      const m = num(cs[`margin${cap(s)}`]);
      band('mar', s === 'right' ? r.right : s === 'left' ? r.left - m : r.left, s === 'bottom' ? r.bottom : s === 'top' ? r.top - m : r.top, s === 'left' || s === 'right' ? m : r.width, s === 'top' || s === 'bottom' ? m : r.height);
    }
    if (b.kind === 'gap') {
      const ks = kids(el).map((k) => k.getBoundingClientRect());
      for (let i = 1; i < ks.length; i++) {
        const p = ks[i - 1], c = ks[i];
        if (c.top >= p.bottom - 0.5 && c.top - p.bottom > 0.5) band('gap', r.left + 4, p.bottom, r.width - 8, c.top - p.bottom);
        else if (Math.abs(c.top - p.top) < 2 && c.left - p.right > 0.5) band('gap', p.right, Math.min(p.top, c.top), c.left - p.right, Math.max(p.height, c.height));
      }
    }
    const mates = this.#host.mates?.(el) ?? matesOf(el), name = this.#host.name?.(el) ?? el.localName;
    parts.push(`<span class="sp-box" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"><em>${esc(name)}${mates ? ` · ${esc(W.mates(mates))}` : ''}</em></span>`);
    this.#layer.innerHTML = parts.join('');
    this.#bubble(b, sides);
  }
  #bubble(b, sides) {
    const scale = this.#host.scale?.() ?? [], [px, py] = this.#at;
    const v = this.#act ? this.#act.value : this.#valueOf(b.el, b.kind, b.side ?? 'top');
    const step = scale.find((s) => Math.abs(s.px - v) < 0.5), round = Math.round(v * 100) / 100;
    const fit = this.#fit(b), ns = scale.map((s) => s.px);
    let i = ns.findIndex((n) => n >= v - 0.5); if (i < 0) i = ns.length - 1;
    const win = scale.slice(Math.max(0, i - 3), i + 4);
    this.#bub.innerHTML = `<b class="${step ? '' : 'off'}">${round}${step && step.token !== '0' ? ` · ${esc(step.token)}` : ''}</b><span>${esc(W.what(b.kind, sides.map((s) => W.sides[s])))}</span>`
      + `<div class="scale">${win.map((s) => `<i class="${Math.abs(s.px - v) < 0.5 ? 'at' : ''} ${fit ? (fit.ok(s.px) ? 'fit' : 'breaks') : ''}">${s.px}</i>`).join('')}</div>${fit ? `<small>${esc(fit.say)}</small>` : ''}`;
    this.#bub.hidden = false;
    // by the pointer, clear of the card, its strip and the fix bar
    const w = this.#bub.offsetWidth, h = this.#bub.offsetHeight, at = clearOf(px + 16, py + 14, w, h, this.#host.avoid?.() ?? [], { edge: 8 });
    Object.assign(this.#bub.style, { left: `${at.x}px`, top: `${at.y}px` });
  }
  // the hierarchy for spacing (docs/research/hierarchy.md): inside < between ≤ around
  #fit(b) {
    const t = this.#host.target?.(); if (!t) return null;
    const minPad = (el) => { const cs = getComputedStyle(el); return Math.min(...SIDES.map((s) => num(cs[`padding${cap(s)}`]))); };
    const gapOf = (el) => kids(el).length > 1 ? this.#valueOf(el, 'gap') : 0;
    if (b.kind === 'gap') {
      const inside = Math.min(...kids(b.el).map(minPad).filter((n) => n > 0), Infinity), around = minPad(b.el);
      const lo = Number.isFinite(inside) ? inside : 0;
      return { ok: (n) => n >= lo - 0.1 && (!around || n <= around + 0.1), say: W.fitBetween(lo, around) };
    }
    if (b.kind === 'pad' && b.el === t && gapOf(t)) { const g = gapOf(t); return { ok: (n) => n >= g - 0.1, say: W.fitAround(g) }; }
    if (b.kind === 'pad' && b.el !== t && gapOf(t)) { const g = gapOf(t); return { ok: (n) => n <= g + 0.1, say: W.fitInside(g) }; }
    return null;
  }
}
const same = (a, b) => (!a && !b) || (!!a && !!b && a.el === b.el && a.kind === b.kind && a.side === b.side && a.axis === b.axis);

// the class swap for a spacing change, made where it shows: padding and margin side by side through the box edit (each
// side in the class that sets it now, md:px-6 at a medium window), a gap in the gap class in force; every other class,
// other breakpoints, dark:, hover:, kept as written
function edit(b, sides, token, classes, active) {
  if (b.kind === 'gap') return swapInForce(classes, (c) => /^gap(-[xy])?-/.test(c), `gap-${token}`, active);
  const family = b.kind === 'pad' ? 'padding' : 'margin';
  return boxEditOf(classes, sides.map((side) => ({ prop: `${family}-${side}`, to: { token } })), active);
}

// ── layout ───────────────────────────────────────────────
const OPTIONS = [
  { id: 'stack', s: { mode: 'flex', dir: 'column', wrap: 'nowrap' } },
  { id: 'row', s: { mode: 'flex', dir: 'row', wrap: 'wrap' } },
  { id: 'two', s: { mode: 'grid', cols: ['1fr', '1fr'], sub: false } },
  { id: 'lined', s: { mode: 'grid', cols: null, sub: true } },
  { id: 'fit', s: { mode: 'grid', cols: ['repeat(auto-fit,minmax(200px,1fr))'], sub: false } },
];
const LAYOUT_CLASS = /^(?:block|inline-block|flex|inline-flex|grid|inline-grid|flex-(?:row|col|row-reverse|col-reverse)|flex-(?:wrap|nowrap|wrap-reverse)|grid-cols-.+)$/;
const ROW_CLASS = /^(?:block|flex|inline-flex|grid|inline-grid|col-span-.+|grid-cols-.+)$/;
const colsClass = (cols) => cols.every((c) => c === '1fr') ? `grid-cols-${cols.length}` : `grid-cols-[${cols.join('_').replace(/\s+/g, '_')}]`;
const BREAKPOINTS = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:'];
const colsLabel = (c) => c.replace('repeat(auto-fit,minmax(200px,1fr))', 'fit · min 200px');

// the element's layout as it is now: read from the page, its columns from its own class when it says them
function readLayout(el) {
  const cs = getComputedStyle(el), cls = classesOf(el), rows = kids(el);
  const mode = /grid/.test(cs.display) ? 'grid' : /flex/.test(cs.display) ? 'flex' : 'block';
  // the columns as written: the grid-cols class that applies now (a breakpoint's, sm:grid-cols-[10rem_1fr_auto], over the
  // base), known by having as many tracks as the grid draws; else as many equal columns as it draws
  let cols = null, colsFrom = null, colsVariant = '';
  if (mode === 'grid') {
    const drawn = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    const parse = (v) => { const n = /^(\d+)$/.exec(v)?.[1], arb = /^\[(.+)\]$/.exec(v)?.[1]; return n ? Array(+n).fill('1fr') : arb ? arb.split('_') : null; };
    const found = [...el.classList].map((x) => /^((?:(?:sm|md|lg|xl|2xl):)?)grid-cols-(.+)$/.exec(x)).filter(Boolean)
      .map((m) => ({ cls: m[0], variant: m[1], cols: parse(m[2]) })).filter((f) => f.cols?.length === drawn)
      .sort((a, b) => BREAKPOINTS.indexOf(b.variant) - BREAKPOINTS.indexOf(a.variant))[0];
    if (found) ({ cols, cls: colsFrom, variant: colsVariant } = found);
    else cols = Array(drawn).fill('1fr');
  }
  const sub = mode === 'grid' && rows.length > 0 && rows.every((r) => classesOf(r).includes('grid-cols-subgrid'));
  return { mode, dir: cs.flexDirection.startsWith('column') ? 'column' : 'row', wrap: cs.flexWrap === 'wrap' ? 'wrap' : 'nowrap', cols, colsFrom, colsVariant, sub };
}
// columns for "lined up": as many as the first row has things in it (a row of a few things, never a grid of its own), the
// second taking the room; else two equal columns
const rowParts = (el) => { const r = kids(el)[0]; return r ? kids(r).length : 0; };
const linesUp = (el) => rowParts(el) >= 2 && rowParts(el) <= 6;
const linedCols = (el) => linesUp(el) ? Array.from({ length: rowParts(el) }, (_, i) => (i === 1 ? '1fr' : 'auto')) : ['1fr', '1fr'];

// host: { target() → el, redraw(), restrip() }
export class Layout {
  #host; #layer; #from = null; #s = null; #inline = new Inline(LEVEL.card); #peek = null; #line = null;
  constructor(root, host) {
    this.#host = host;
    this.#layer = Object.assign(document.createElement('div'), { className: 'lay-h' });
    root.append(this.#layer);
    this.#layer.addEventListener('pointerdown', (e) => { const l = e.target.closest('.lay-line'); if (l && e.button === 0) this.#dragLine(e, l); });
  }
  get state() { return this.#s; }
  open() { const t = this.#host.target(); this.#from = readLayout(t); this.#s = structuredClone(this.#from); this.#show(); }
  close() { this.#inline.clear(); this.#layer.innerHTML = ''; this.#from = this.#s = null; this.#peek = null; }
  // the element as the layout in hand (or the one pointed at in the strip) would leave it
  #show(s = this.#peek ?? this.#s) {
    const t = this.#host.target(); if (!t?.isConnected || !s) return;
    this.#inline.clear();
    if (!sameLayout(s, this.#from)) layOut(t, s, this.#inline);
    this.#lines();
  }
  #changed() { this.#show(); this.#host.redraw(); this.#host.restrip?.(); }
  html() {
    const s = this.#s, t = this.#host.target(), rows = kids(t).length;
    if (!s) return '';
    const mode = `<div class="lay-mode" role="radiogroup" aria-label="${esc(W.layout)}">${[['flex', W.flex], ['grid', W.grid]].map(([k, l]) => `<button type="button" role="radio" aria-checked="${s.mode === k}" data-lmode="${k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (s.mode === 'flex') {
      const seg = (label, key, opts) => `<div class="lay-row"><span class="k">${esc(label)}</span><div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-pressed="${s[key] === v}" aria-checked="${s[key] === v}" data-l${key}="${v}">${esc(l)}</button>`).join('')}</div></div>`;
      body = seg(W.direction, 'dir', [['row', W.sideBySide], ['column', W.stacked]]) + seg(W.wrap, 'wrap', [['nowrap', W.oneLine], ['wrap', W.wraps]]);
    } else if (s.mode === 'grid') {
      body = `<div class="lay-lab">${W.columns}<span>${W.columnsHint}</span></div><div class="lay-tracks" role="group" aria-label="${W.columns}">`
        + s.cols.map((c, i) => `<button type="button" class="lay-tk" data-tk="${i}" title="${esc(W.nextTrack)}">${esc(colsLabel(c))}</button>`).join('')
        + `<button type="button" class="lay-tk add" data-tkadd title="${esc(W.addColumn)}" aria-label="${esc(W.addColumn)}">+</button>${s.cols.length > 1 ? `<button type="button" class="lay-tk add" data-tkdel title="${esc(W.removeColumn)}" aria-label="${esc(W.removeColumn)}">−</button>` : ''}</div>`
        + `<button type="button" class="lay-sub" role="switch" aria-checked="${s.sub}" data-lsub${rows ? '' : ' disabled'}><span class="val">${W.follow}</span><span class="lay-subtag">${W.followTag}</span><span class="lay-sw" aria-hidden="true"><i></i></span></button>`
        + `<div class="say">${esc(!rows ? W.noRows : s.sub ? W.followOn : W.followOff)}</div>`;
    }
    const keys = `<div class="lay-lab">${W.spacing}<span>${W.spacingHint}</span></div><div class="keys">${W.spacingKeys.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>`;
    return mode + body + keys;
  }
  // the edits, line by line: [{ el, from, to }] (rows that share a line are one edit)
  edits() {
    const s = this.#s, f = this.#from, t = this.#host.target(); if (!s || sameLayout(s, f)) return [];
    const out = [];
    // columns read from a breakpoint's class are changed there; the base's own columns are left as they are
    const v = f.colsVariant ?? '';
    let mine = classesOf(t).filter((c) => LAYOUT_CLASS.test(c));
    if (v) mine = [...mine.filter((c) => !/^grid-cols-/.test(c)), f.colsFrom];
    const to = s.mode === 'grid' ? ['grid', v + colsClass(s.cols)] : s.mode === 'flex' ? ['flex', s.dir === 'column' ? 'flex-col' : '', s.wrap === 'wrap' ? 'flex-wrap' : ''].filter(Boolean) : mine;
    const gone = mine.filter((c) => !to.includes(c)), add = to.filter((c) => !mine.includes(c));
    if (gone.length || add.length) out.push({ el: t, from: gone.join(' '), to: add.join(' ') || 'block' });
    const subNow = s.mode === 'grid' && s.sub, subWas = f.mode === 'grid' && f.sub;
    if (subNow !== subWas) {
      const seen = new Set();
      for (const r of kids(t)) {
        const key = placeOf(r) ?? r; if (seen.has(key)) continue; seen.add(key);
        const has = classesOf(r).filter((c) => ROW_CLASS.test(c)), want = subNow ? ['col-span-full', 'grid', 'grid-cols-subgrid'] : ['flex'];
        const g = has.filter((c) => !want.includes(c)), a = want.filter((c) => !has.includes(c));
        if (g.length || a.length) out.push({ el: r, from: g.join(' '), to: a.join(' '), rows: kids(t).filter((x) => (placeOf(x) ?? x) === key).length });
      }
    }
    return out;
  }
  // the class changes to write, one per element (the card writes each where its classes are written)
  writes() { return this.edits().map((e) => ({ el: e.el, from: e.from, to: e.to })); }
  // a click on the layout drill: true when it was the layout's
  click(b) {
    const s = this.#s; if (!s) return false;
    const d = b.dataset;
    if (d.lmode) { if (d.lmode !== s.mode) Object.assign(s, d.lmode === 'grid' ? { mode: 'grid', cols: s.cols ?? linedCols(this.#host.target()), sub: s.sub } : { mode: 'flex', sub: false }); }
    else if (d.ldir) s.dir = d.ldir;
    else if (d.lwrap) s.wrap = d.lwrap;
    else if (d.tk !== undefined) s.cols = s.cols.map((c, k) => (k === +d.tk ? NEXT_TRACK[c] ?? 'auto' : c));
    else if (d.tkadd !== undefined) s.cols = [...s.cols, '1fr'];
    else if (d.tkdel !== undefined) s.cols = s.cols.slice(0, -1);
    else if (d.lsub !== undefined) s.sub = !s.sub;
    else if (b.classList.contains('putback')) this.#s = structuredClone(this.#from);
    else return false;
    this.#changed();
    return true;
  }
  // the strip: the element laid out each way
  options() {
    const t = this.#host.target();
    return OPTIONS.map((o) => ({ ...o, s: { ...this.#s, ...o.s, cols: o.s.cols ?? (o.s.mode === 'grid' ? linedCols(t) : this.#s.cols) } }))
      .filter((o) => o.id !== 'lined' || linesUp(t));
  }
  fill(reel, frozen) {
    const cur = this.options().find((o) => sameLayout(o.s, this.#s))?.id;
    const opts = this.options().sort((a, b) => (b.id === cur) - (a.id === cur));
    for (const o of opts) {
      const shot = document.createElement('button');
      shot.type = 'button'; shot.className = 'shot'; shot.dataset.key = `l:${o.id}`; shot.setAttribute('role', 'option'); shot.setAttribute('aria-selected', String(o.id === cur));
      shot.setAttribute('aria-label', W.options[o.id]);
      if (o.id === cur) shot.setAttribute('aria-current', 'true');
      const copy = frozen.cloneNode(true); copy.classList.add('copy');
      const inline = { set: (el, props) => { for (const [p, v] of Object.entries(props)) if (v !== null) el.style.setProperty(p, String(v)); } };
      // the copy grows with its new layout (its frozen height was the old one's)
      inline.set(copy, { height: 'auto', 'min-height': '0', 'max-height': 'none' });
      layOut(copy, o.s, inline);
      fitCopy(copy, this.#host.target());
      const frame = document.createElement('span'); frame.className = 'frame'; frame.append(copy); shot.append(frame);
      shot.insertAdjacentHTML('beforeend', `<span class="cap"><b>${esc(W.options[o.id])}</b><em class="v ${o.id === cur ? 'now' : 'yours'}">${esc(o.s.mode === 'grid' ? (o.s.sub ? W.kinds.sub : W.kinds.grid) : W.kinds.flex)}</em></span>`);
      reel.append(shot);
    }
  }
  peek(key) { const o = this.options().find((x) => `l:${x.id}` === key); this.#peek = o ? o.s : null; this.#show(); }
  unpeek() { this.#peek = null; this.#show(); }
  take(key) { const o = this.options().find((x) => `l:${x.id}` === key); if (!o) return; this.#peek = null; this.#s = structuredClone(o.s); this.#changed(); }
  // a grid's column lines on the element: one handle per inner line, the tracks named along its top
  #lines() {
    const t = this.#host.target(), s = this.#peek ?? this.#s;
    if (!t?.isConnected || s?.mode !== 'grid') { this.#layer.innerHTML = ''; return; }
    const r = t.getBoundingClientRect(), cs = getComputedStyle(t), tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter(Number.isFinite), gap = num(cs.columnGap);
    let x = r.left + num(cs.paddingLeft) + num(cs.borderLeftWidth);
    const parts = [], named = s.cols?.length === tracks.length;
    tracks.forEach((w, i) => {
      if (named) parts.push(`<span class="lay-track" style="left:${x}px;top:${r.top - 22}px;width:${w}px"><b>${esc(colsLabel(s.cols[i]))}</b></span>`);
      x += w;
      if (i < tracks.length - 1) { if (named && !this.#peek) parts.push(`<span class="lay-line" data-line="${i}" role="separator" aria-label="${esc(W.line(i + 1))}" style="left:${x + gap / 2}px;top:${r.top - 6}px;height:${r.height + 12}px"></span>`); x += gap; }
    });
    this.#layer.innerHTML = parts.join('');
  }
  follow() { this.#lines(); }
  // a column line: the two tracks either side share the width; fr stays fr (re-weighted), a fixed size becomes px
  #dragLine(e, l) {
    e.preventDefault(); e.stopPropagation();
    const i = +l.dataset.line, t = this.#host.target(), widths = getComputedStyle(t).gridTemplateColumns.split(' ').map(parseFloat), cols0 = [...this.#s.cols], x0 = e.clientX;
    l.setAttribute('data-held', '');
    const fr = (c) => /fr$/.test(c);
    const move = (ev) => {
      const dx = ev.clientX - x0, a = Math.max(24, widths[i] + dx), b = Math.max(24, widths[i + 1] - dx), cols = [...cols0];
      if (fr(cols0[i]) && fr(cols0[i + 1])) { const sum = parseFloat(cols0[i]) + parseFloat(cols0[i + 1]); cols[i] = `${+(sum * a / (a + b)).toFixed(1)}fr`; cols[i + 1] = `${+(sum * b / (a + b)).toFixed(1)}fr`; }
      else { if (!fr(cols0[i])) cols[i] = `${Math.round(a / 4) * 4}px`; if (!fr(cols0[i + 1])) cols[i + 1] = `${Math.round(b / 4) * 4}px`; }
      this.#s.cols = cols; this.#show();
    };
    const stop = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', cancel); l.removeAttribute('data-held'); };
    const up = () => { stop(); this.#changed(); };
    // the browser took the pointer: the columns go back as they were
    const cancel = () => { stop(); this.#s.cols = cols0; this.#show(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', cancel);
  }
}
const sameLayout = (a, b) => !!a && !!b && a.mode === b.mode && (a.mode !== 'flex' || (a.dir === b.dir && a.wrap === b.wrap)) && (a.mode !== 'grid' || (JSON.stringify(a.cols) === JSON.stringify(b.cols) && !!a.sub === !!b.sub));
// the element (and its rows) laid out as s, inline
function layOut(t, s, inline) {
  const rows = kids(t);
  if (s.mode === 'grid') inline.set(t, { display: 'grid', 'grid-template-columns': s.cols.join(' ').replace(/,/g, ', '), 'flex-direction': null, 'flex-wrap': null });
  else if (s.mode === 'flex') inline.set(t, { display: 'flex', 'flex-direction': s.dir, 'flex-wrap': s.wrap, 'grid-template-columns': null });
  for (const r of rows) inline.set(r, s.mode === 'grid' && s.sub ? { 'grid-column': '1 / -1', display: 'grid', 'grid-template-columns': 'subgrid' } : { 'grid-column': null, display: null, 'grid-template-columns': null });
}

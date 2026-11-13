/* ─────────────────────────────────────────────────────────
 * SIZE · the element card's size handles (elementcard.js hosts it, beside the spacing layer in layoutcard.js)
 *
 *  grips     while the card is open, the element wears eight grips: one on each edge (width or height) and one on
 *            each corner (both). Soft white knobs ringed in the instrument's sky, lit when pointed at, filled when held.
 *  drag      press a grip and drag anywhere on screen. The held edge follows the pointer; the element is resized live
 *            (inline, never written yet). Where the element grows from its middle (centred) or from its far side, the
 *            pull is measured once at the start, so the edge stays under the hand.
 *  scale     while dragging, a ruler runs from the element across the page along the drag, one tick per size in your
 *            theme (the width/height steps plumber reads: the spacing ladder, your named sizes, the container sizes,
 *            full). Near a tick the edge snaps onto it; the tick's hairline crosses the whole page.
 *  pill      the value rides by the pointer: sky with the class once on a step ("w-80 · 320"), coral between steps.
 *  land      letting go springs the edge onto the nearest step (a drag never ends between steps) and writes that class
 *            where the element's classes are written, the way a spacing drag does: one change, one Undo.
 *  refused   a size the layout decides (a stretched flex child) or the element's own style sets is said, not tried.
 *  keys      Esc while dragging puts the size back.
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { FIX } from './words.js';
import { Inline } from './layoutcard.js';
import { LEVEL } from './claims.js';
import { reduced, spring, DETENT } from './motion.js';
import { clearOf } from './geometry.js';
import { burst } from './burst.js';

const W = FIX.card;
const GRIPS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const SNAP = 10;        // px on screen within which a step holds the edge
const PROBE = 40;       // px the size is pushed once at the start, to see how the held edge moves
const MIN_EDGE = 36;    // an edge shorter than this has no grip in its middle (the corners still do)
const LABEL_GAP = 34;   // px between labelled ticks on the ruler
// Tailwind v4's container sizes (w-md is var(--container-md)), used when the page doesn't define its own
const LADDER = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
const CONTAINERS = [['3xs', 16], ['2xs', 18], ['xs', 20], ['sm', 24], ['md', 28], ['lg', 32], ['xl', 36], ['2xl', 42], ['3xl', 48], ['4xl', 56], ['5xl', 64], ['6xl', 72], ['7xl', 80]];
const CURSOR = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
const num = (v) => parseFloat(v) || 0;
const classesOf = (el) => [...el.classList].filter((c) => !c.includes(':'));
const PRE = { width: 'w', height: 'h' };

export const SIZE_CSS = `
  .sz-layer { position: fixed; inset: 0; z-index: 5; pointer-events: none; }
  .sz-grip { position: fixed; box-sizing: border-box; pointer-events: auto; touch-action: none;
    background: #fff; border-radius: 99px;
    box-shadow: 0 0 0 1.5px var(--pl-sky), 0 1px 2px rgb(0 0 0 / .18), inset 0 1px 0 rgb(255 255 255 / .9);
    transition: scale 160ms cubic-bezier(.3, 1.35, .5, 1), background-color 120ms ease-out; }
  .sz-grip::before { content: ''; position: absolute; inset: -7px; }
  .sz-grip[data-g="e"], .sz-grip[data-g="w"] { width: 6px; height: 22px; margin: -11px 0 0 -3px; }
  .sz-grip[data-g="n"], .sz-grip[data-g="s"] { width: 22px; height: 6px; margin: -3px 0 0 -11px; }
  .sz-grip[data-g$="e"]:not([data-g="e"]), .sz-grip[data-g$="w"]:not([data-g="w"]) { width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 3.5px; }
  @media (hover: hover) and (pointer: fine) { .sz-grip:hover { scale: 1.3; background: #c5e6fd; } }
  .sz-grip[data-held] { scale: 1.3; background: var(--pl-sky); box-shadow: 0 0 0 1.5px var(--pl-sky), 0 2px 6px color-mix(in oklab, var(--pl-sky) 45%, transparent); }
  /* while a size is dragged the card steps aside: nothing covers the element or its scale */
  :host([data-sizing]) .ec, :host([data-sizing]) .ec-strip, :host([data-sizing]) .ec-caret { opacity: 0; pointer-events: none; transition: opacity 120ms ease-out; }
  .sz-layer[data-dragging] .sz-grip:not([data-held]) { opacity: 0; transition: opacity 120ms ease-out; }

  /* the scale: a ruler from the element across the page, one tick per size in your theme */
  .sz-rule { position: fixed; z-index: 5; pointer-events: none; }
  .sz-rule .band { position: absolute; border-radius: 4px; background: rgb(255 255 255 / .86);
    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 0 0 .5px color-mix(in oklab, var(--pl-sky) 40%, transparent), 0 1px 3px rgb(0 0 0 / .08); }
  .sz-rule .tk { position: absolute; background: color-mix(in oklab, var(--pl-sky) 55%, transparent); border-radius: 1px; transition: background-color 120ms ease-out; }
  .sz-rule .tk.named { background: var(--pl-sky); }
  .sz-rule .lb { position: absolute; font: 500 9.5px/1 var(--pl-mono); font-variant-numeric: tabular-nums; color: #0b3554; white-space: nowrap; opacity: .7; }
  .sz-rule .lb.named { font-weight: 650; opacity: 1; }
  .sz-rule .tk.at { background: var(--pl-sky); }
  .sz-rule .hl { position: absolute; background: color-mix(in oklab, var(--pl-sky) 70%, transparent); }
  .sz-rule .hl.from { background: color-mix(in oklab, var(--pl-sky) 30%, transparent); }
  .sz-rule .span { position: absolute; background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-sky) 30%, transparent) 0 1px, transparent 1px 6px); }
  .sz-rule .hand { position: absolute; background: var(--pl-coral); border-radius: 1px; }
  .sz-rule[data-on] .hand { background: var(--pl-sky); }
  .sz-pill { position: fixed; z-index: 6; pointer-events: none; height: 24px; padding: 0 9px; font-size: 12px; gap: 6px;
    box-shadow: 0 2px 8px -2px rgb(0 0 0 / .25); animation: sz-pop 200ms cubic-bezier(.3, 1.35, .5, 1) both; }
  .sz-pill[hidden] { display: none; }
  .sz-pill b { font-weight: 700; } .sz-pill em { font-style: normal; opacity: .7; font-weight: 500; }
  @keyframes sz-pop { from { opacity: 0; scale: .92; } }
  @media (prefers-reduced-motion: reduce) { .sz-grip, .sz-rule .tk { transition: none; } .sz-pill { animation: none; } }
`;

// host: { target() → el | null, steps(dim) → [{ token, value, css }], write([{ el, from, to }], said) → Promise,
//   name(el) → words, mates(el) → n | null, locked(el) → words | null, refused(text), avoid() → [rect], moved() }
export class Size {
  #host; #root; #layer; #rule; #pill;
  #on = false; #act = null; #inline = new Inline(LEVEL.drag); #swallow = false; #frame = 0;

  constructor(root, host) {
    this.#host = host; this.#root = root;
    this.#layer = Object.assign(document.createElement('div'), { className: 'sz-layer' });
    this.#rule = Object.assign(document.createElement('div'), { className: 'sz-rule' });
    this.#pill = Object.assign(document.createElement('span'), { className: 'pl-pill sz-pill', hidden: true });
    this.#pill.setAttribute('role', 'status');
    root.append(this.#layer, this.#rule, this.#pill);
    this.#layer.addEventListener('pointerdown', (e) => { const g = e.target.closest('.sz-grip'); if (g && e.button === 0) this.#start(e, g); });
  }
  get active() { return !!this.#act; }
  on() {
    if (this.#on) return;
    this.#on = true;
    addEventListener('click', this.#click, { capture: true });
    this.follow();
  }
  off() {
    if (!this.#on) return;
    this.#cancel();
    this.#on = false;
    removeEventListener('click', this.#click, { capture: true });
    this.#layer.innerHTML = '';
  }
  // the element moved or changed size (a scroll, a write): the grips follow it
  follow() {
    if (!this.#on || this.#act) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#grips());
  }
  key(k) {
    if (!this.#act) return false;
    if (k === 'Escape') { this.#cancel(); return true; }
    return false;
  }
  #click = (e) => { if (this.#swallow || this.#act) { e.preventDefault(); e.stopImmediatePropagation(); this.#swallow = false; } };

  #grips(held = null) {
    const t = this.#host.target?.();
    if (!this.#on || !t?.isConnected || this.#host.locked?.(t)) { this.#layer.innerHTML = ''; return; }
    const r = t.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) { this.#layer.innerHTML = ''; return; }
    const at = { n: [r.left + r.width / 2, r.top], s: [r.left + r.width / 2, r.bottom], e: [r.right, r.top + r.height / 2], w: [r.left, r.top + r.height / 2],
      ne: [r.right, r.top], se: [r.right, r.bottom], sw: [r.left, r.bottom], nw: [r.left, r.top] };
    this.#layer.innerHTML = GRIPS.filter((g) => g.length === 2 || ((g === 'e' || g === 'w') ? r.height : r.width) >= MIN_EDGE)
      .map((g) => `<span class="sz-grip" data-g="${g}" role="slider" aria-label="${esc(W.sizeGrip[g])}" title="${esc(W.sizeGrip[g])}" style="left:${at[g][0]}px;top:${at[g][1]}px;cursor:${CURSOR[g]}"${g === held ? ' data-held' : ''}></span>`).join('');
    this.#layer.toggleAttribute('data-dragging', !!held);
    this.#root.host?.toggleAttribute('data-sizing', !!held);
  }

  // ── the theme's sizes for a dimension, in px on this page, one per size (the project's own name first) ──
  #stops(el, dim) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const px = (v) => { const m = /^(-?[\d.]+)(px|rem)?$/.exec(String(v ?? '').trim()); return m ? +m[1] * (m[2] === 'rem' ? rem : 1) : NaN; };
    const steps = this.#host.steps?.(dim) ?? [];
    const out = [];
    for (const s of steps) {
      if (s.token === 'full') { const p = el.parentElement; if (dim === 'width' && p) { const cs = getComputedStyle(p); out.push({ token: 'full', px: p.clientWidth - num(cs.paddingLeft) - num(cs.paddingRight), named: true }); } continue; }
      const v = px(s.value);
      if (Number.isFinite(v) && v > 0) out.push({ token: s.token, px: v, named: !/^[\d.]+$/.test(s.token) });
    }
    // Tailwind v4's multiplier (w-80 is 80 × --spacing) works in every v4 project, named steps or not: its usual
    // multiples are sizes too. The theme's --spacing says it is v4 and how big a step is
    const unit = px(getComputedStyle(document.documentElement).getPropertyValue('--spacing'));
    const v4 = Number.isFinite(unit) && unit > 0;
    if (v4 && !steps.some((s) => /var\(--spacing\)/.test(s.css ?? ''))) for (const n of LADDER) out.push({ token: String(n), px: n * unit, named: false });
    // the container sizes (w-md): Tailwind v4 has them for width; the page's own values when it defines them
    if (dim === 'width' && v4) {
      const root = getComputedStyle(document.documentElement);
      for (const [name, r] of CONTAINERS) { const own = px(root.getPropertyValue(`--container-${name}`)); out.push({ token: name, px: Number.isFinite(own) ? own : r * rem, named: true }); }
    }
    return out.sort((a, b) => a.px - b.px || b.named - a.named).filter((s, i, all) => !i || Math.abs(s.px - all[i - 1].px) >= 0.5);
  }

  // ── a drag ──
  #start(e, grip) {
    const el = this.#host.target?.(); if (!el?.isConnected) return;
    e.preventDefault(); e.stopPropagation();
    const g = grip.dataset.g;
    const why = this.#host.locked?.(el); if (why) { this.#host.refused?.(why); return; }
    const want = [...(/[ew]/.test(g) ? ['width'] : []), ...(/[ns]/.test(g) ? ['height'] : [])];
    const r0 = el.getBoundingClientRect(), axes = [];
    for (const dim of want) {
      if (el.style.getPropertyValue(dim)) { this.#host.refused?.(W.sizeInStyle(dim)); continue; }
      const side = dim === 'width' ? (g.includes('w') ? 'left' : 'right') : (g.includes('n') ? 'top' : 'bottom');
      const out = side === 'left' || side === 'top' ? -1 : 1;   // which way the held edge goes as the size grows
      const v0 = dim === 'width' ? r0.width : r0.height;
      // push the size once to see how the held edge moves: 1 when the element grows from its other side, ½ from its
      // middle, 0 when it grows the other way (the pointer then drives the size itself); nothing moves when the layout
      // decides the size
      this.#inline.set(el, { transition: 'none', [dim]: `${v0 + PROBE}px` });
      const r1 = el.getBoundingClientRect();
      this.#inline.clear();
      const grew = (dim === 'width' ? r1.width : r1.height) - v0;
      if (grew < PROBE / 4) { this.#host.refused?.(W.sizeFixed(dim)); continue; }
      const moved = (r1[side] - r0[side]) * out;
      axes.push({ dim, side, out, v0, edge0: r0[side], ratio: moved > PROBE * 0.15 ? moved / grew : 1, stops: this.#stops(el, dim), v: v0, step: null, from: classesOf(el).filter((c) => new RegExp(`^${PRE[dim]}-`).test(c)) });
    }
    if (!axes.length) return;
    try { grip.setPointerCapture?.(e.pointerId); } catch {}
    this.#act = { el, g, grip, axes, x0: e.clientX, y0: e.clientY, at: [e.clientX, e.clientY], pointer: e.pointerId };
    for (const a of axes) a.step = a.stops.find((s) => Math.abs(s.px - a.v0) < 0.5) ?? null;
    this.#grips(g);
    const move = (ev) => { if (ev.pointerId !== this.#act?.pointer) return; this.#move(ev); };
    const up = (ev) => { if (ev.pointerId !== this.#act?.pointer) return; done(); this.#land(); };
    const done = () => { removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); };
    const cancel = () => { done(); this.#cancel(); };
    this.#act.done = done;
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true);
    this.#draw();
  }
  #move(ev) {
    const a = this.#act; if (!a) return;
    a.at = [ev.clientX, ev.clientY];
    for (const x of a.axes) {
      const d = (x.dim === 'width' ? ev.clientX - a.x0 : ev.clientY - a.y0) * x.out;
      const raw = Math.max(1, x.v0 + d / x.ratio);
      // the nearest step, measured on screen: within SNAP it holds the edge
      const near = x.stops.reduce((best, s) => (!best || Math.abs(s.px - raw) < Math.abs(best.px - raw) ? s : best), null);
      const snapped = near && Math.abs(near.px - raw) * x.ratio <= SNAP;
      x.v = snapped ? near.px : raw; x.step = snapped ? near : null; x.near = near;
    }
    this.#preview();
    this.#draw();
  }
  #preview() {
    const a = this.#act;
    this.#inline.clear();
    this.#inline.set(a.el, { transition: 'none', ...Object.fromEntries(a.axes.map((x) => [x.dim, `${Math.round(x.v * 100) / 100}px`])) });
    this.#host.moved?.();
  }
  #cancel() {
    const a = this.#act; if (!a) return;
    a.done?.(); this.#act = null;
    this.#inline.clear(); this.#host.moved?.();
    this.#clearDraw(); this.follow();
  }
  // letting go: the edge springs onto the nearest step, then that class is written
  async #land() {
    const a = this.#act; if (!a) return;
    this.#swallow = true; setTimeout(() => { this.#swallow = false; }, 0);
    for (const x of a.axes) if (!x.step) x.step = x.near ?? x.stops.reduce((best, s) => (!best || Math.abs(s.px - x.v) < Math.abs(best.px - x.v) ? s : best), null);
    const landing = a.axes.filter((x) => x.step);
    if (!landing.length) return this.#cancel();
    await this.#settle(a, landing);
    if (this.#act !== a) return;
    const edits = [], parts = [], el = a.el;
    for (const x of landing) {
      const to = `${PRE[x.dim]}-${x.step.token}`;
      if (x.from.length === 1 && x.from[0] === to) continue;
      edits.push({ from: x.from.join(' '), to });
      parts.push(`${x.dim} ${to} · ${Math.round(x.step.px)}px`);
    }
    this.#clearDraw(); this.#grips(a.g);
    if (!edits.length) { this.#act = null; this.#inline.clear(); this.#host.moved?.(); this.follow(); return; }
    // both sizes in one change at the element's class site: one write, one Undo
    const one = { el, from: edits.map((x) => x.from).filter(Boolean).join(' '), to: edits.map((x) => x.to).join(' ') };
    const said = W.sized(this.#host.name?.(el) ?? el.localName, parts, this.#host.mates?.(el) ?? 0);
    const g = a.grip.getBoundingClientRect();
    try {
      await this.#host.write([one], said);
      burst(this.#root, g.left + g.width / 2, g.top + g.height / 2, { pieces: 16 });
    } catch (error) { this.#host.refused?.(error?.message ?? String(error)); }
    finally { this.#act = null; this.#inline.clear(); this.#host.moved?.(); this.follow(); }
  }
  // the spring from where the hand let go onto the step (reduced motion: there at once)
  #settle(a, landing) {
    if (reduced()) { for (const x of landing) x.v = x.step.px; this.#preview(); return Promise.resolve(); }
    const p = { x: landing[0].v, y: landing[1]?.v ?? 0, vx: 0, vy: 0 }, tx = landing[0].step.px, ty = landing[1]?.step.px ?? 0;
    let last = performance.now();
    return new Promise((done) => {
      const tick = (now) => {
        if (this.#act !== a) return done();
        const dt = Math.min(0.032, (now - last) / 1000); last = now;
        spring(p, tx, ty, DETENT, dt);
        landing[0].v = p.x; if (landing[1]) landing[1].v = p.y;
        this.#preview(); this.#draw(false);
        if (Math.abs(p.x - tx) < 0.3 && Math.abs(p.y - ty) < 0.3 && Math.abs(p.vx) + Math.abs(p.vy) < 5) { landing[0].v = tx; if (landing[1]) landing[1].v = ty; this.#preview(); return done(); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ── drawing: the ruler along each axis held, the hairline of the step in hand, the value by the pointer ──
  #clearDraw() { this.#rule.innerHTML = ''; this.#rule.removeAttribute('data-on'); this.#pill.hidden = true; }
  #draw(pill = true) {
    const a = this.#act; if (!a) return this.#clearDraw();
    const r = a.el.getBoundingClientRect(), parts = [];
    for (const x of a.axes) parts.push(this.#ruler(x, r));
    this.#rule.innerHTML = parts.join('');
    this.#rule.toggleAttribute('data-on', a.axes.every((x) => x.step));
    this.#grips(a.g);
    if (pill) this.#say(a);
  }
  // one ruler: a band beside the element along the axis, from the anchored edge across the page
  #ruler(x, r) {
    const H = x.dim === 'width', vw = innerWidth, vh = innerHeight, out = [];
    const at = (v) => x.edge0 + (v - x.v0) * x.ratio * x.out;     // where the held edge is when the size is v
    const along = H ? vw : vh;
    // the band sits outside the element, on the side with room (above, else below; left, else right)
    const T = 22, cross = H ? (r.top - T - 6 >= 4 ? r.top - T - 6 : r.bottom + 6) : (r.left - T - 6 >= 4 ? r.left - T - 6 : r.right + 6);
    const lo = x.out > 0 ? Math.max(4, at(0)) : 4, hi = x.out > 0 ? along - 4 : Math.min(along - 4, at(0));
    const box = (cls, a0, a1, c0, c1, extra = '') => out.push(`<span class="${cls}" style="${H ? `left:${a0}px;width:${Math.max(1, a1 - a0)}px;top:${c0}px;height:${Math.max(1, c1 - c0)}px` : `top:${a0}px;height:${Math.max(1, a1 - a0)}px;left:${c0}px;width:${Math.max(1, c1 - c0)}px`}${extra}">`);
    box('band', lo, hi, cross, cross + T); out.push('</span>');
    // the span the element covers now, hatched along the band
    const e0 = H ? (x.out > 0 ? r.left : r.right) : (x.out > 0 ? r.top : r.bottom), e1 = H ? (x.out > 0 ? r.right : r.left) : (x.out > 0 ? r.bottom : r.top);
    box('span', Math.min(e0, e1), Math.max(e0, e1), cross + T - 5, cross + T); out.push('</span>');
    const ticks = x.stops.map((s) => ({ s, p: at(s.px) })).filter(({ p }) => p >= lo - 0.5 && p <= hi + 0.5);
    for (const { s, p } of ticks) {
      const on = x.step === s, len = s.named || on ? 10 : 6;
      box(`tk${s.named ? ' named' : ''}${on ? ' at' : ''}`, p - (on ? 1 : 0.5), p + (on ? 1 : 0.5), cross + T - len, cross + T); out.push('</span>');
    }
    // the names: your named sizes first, then the numbers where there is room (the step in hand is named by the pill)
    const placed = [x.step ? at(x.step.px) : -Infinity];
    for (const { s, p } of [...ticks.filter((t) => t.s.named), ...ticks.filter((t) => !t.s.named)]) {
      if (s === x.step || placed.some((q) => Math.abs(q - p) < LABEL_GAP)) continue;
      placed.push(p);
      out.push(H ? `<span class="lb${s.named ? ' named' : ''}" style="left:${p}px;top:${cross + 3}px;translate:-50% 0">${esc(s.token)}</span>`
        : `<span class="lb${s.named ? ' named' : ''}" style="top:${p}px;left:${cross + 3}px;translate:0 -50%">${esc(s.token)}</span>`);
    }
    // the hairlines across the page: the anchored edge, faint; the step in hand (or the hand), bright
    const held = at(x.v);
    const line = (cls, p) => out.push(H ? `<span class="hl ${cls}" style="left:${p - 0.5}px;top:0;width:1px;height:${vh}px"></span>` : `<span class="hl ${cls}" style="top:${p - 0.5}px;left:0;height:1px;width:${vw}px"></span>`);
    line('from', H ? (x.out > 0 ? r.left : r.right) : (x.out > 0 ? r.top : r.bottom));
    if (x.step) line('to', held);
    else { box('hand', held - 1, held + 1, cross + 2, cross + T - 2); out.push('</span>'); }
    return out.join('');
  }
  #say(a) {
    const one = (x) => x.step ? `<b>${esc(PRE[x.dim])}-${esc(x.step.token)}</b><em>${Math.round(x.step.px)}</em>` : `<b>${Math.round(x.v)}</b><em>${esc(x.near ? `→ ${PRE[x.dim]}-${x.near.token}` : 'px')}</em>`;
    this.#pill.innerHTML = a.axes.map(one).join('<em>×</em>');
    this.#pill.dataset.hue = a.axes.every((x) => x.step) ? 'sky' : 'coral';
    this.#pill.hidden = false;
    const [px, py] = a.at, w = this.#pill.offsetWidth, h = this.#pill.offsetHeight;
    const at = clearOf(px + 16, py + 16, w, h, this.#host.avoid?.() ?? [], { edge: 8 });
    Object.assign(this.#pill.style, { left: `${at.x}px`, top: `${at.y}px` });
  }
}

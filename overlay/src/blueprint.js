/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MODE · React Plumber overlay
 *
 * The page as it is, held under the instrument: dimmed and without its colour, so the only colour left is drift.
 * Every drifted element in view is cut out of the dim and outlined where it lives, with one short label; nothing
 * else is drawn (docs/briefs/blueprint-v2.md, layer 2). Instead of Alt-hovering one element at a time, you see the
 * whole view's drift at once and act on any of it.
 *
 *  off → entering → on → leaving → off      Alt+B or the dock's button toggles; Esc leaves
 *
 *  entering  the dim fades in (--pl-dur-dim); the page goes inert under the glass (blueprint-glass.js) and the
 *            Reader starts reading what's in view; elements light up as their readings arrive
 *  on        the MarkLayer cuts each drifted element out of the dim, outlines it in its ink and labels it; its breaks
 *            open the chooser (blueprint-fix.js), which picks, previews and writes. The panel on the right
 *            (blueprint-panel.js) holds the same drift grouped by cause: J/K move between causes, Enter fixes one
 *            everywhere it appears
 *  leaving   the page is usable again at once; the dim fades out (--pl-dur-undim)
 *  reduced motion: no fade
 *
 * Host-page footprint: none. No stylesheet, attribute or inline style is written to the host page; everything is
 * drawn in the overlay's shadow root, so leaving has nothing to restore.
 * ───────────────────────────────────────────────────────── */
import { Reader } from './blueprint-reader.js';
import { MarkLayer, MARKS_CSS } from './blueprint-marks.js';
import { Glass, GLASS_CSS } from './blueprint-glass.js';
import { Panel, PANEL_CSS } from './blueprint-panel.js';
import { Craft } from './craft.js'; // craft: the mentor's rules, read on the page and joined to the reader's items
import { Selection, SELECT_CSS } from './select.js'; // the element is the target: a click anywhere on it selects it
import { Changes, CHANGES_CSS } from './changes.js'; // what was changed on the page, per element, until it is applied
import { elementEdit } from './inplace.js';
import { post, request } from './api.js';
import { locate } from './locate.js';

const FADE_IN = 160, FADE_OUT = 120; // ms, the same as --pl-dur-dim and --pl-dur-undim

// Each part of the layer fades on its own, never the layer: an ancestor below full opacity would cut the dim's
// backdrop-filter off from the page, and the grey would arrive only when the fade ended.
const LAYER_CSS = `
  .bp > :is(.labels, svg) { opacity: 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out); }
  .bp[data-on] > :is(.labels, svg) { opacity: 1; transition-duration: var(--pl-dur-dim); }
  @media (prefers-reduced-motion: reduce) { .bp > :is(.labels, svg) { transition: none; } }
`;
export const BLUEPRINT_CSS = GLASS_CSS + MARKS_CSS + LAYER_CSS + PANEL_CSS + SELECT_CSS + CHANGES_CSS;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Blueprint {
  #host; #layer; #marks; #reader; #glass; #onState; #onProgress;
  #state = 'off';
  #timer = 0;
  #panel; #craft; #items = []; #selection; #changes;

  // host: the overlay element (readMarks, pin, pinnedElement, occluders); root: its shadow root;
  // theme: { decisions() } for the craft engine's scales (craft.js)
  constructor(host, root, { onState, onProgress, theme } = {}) {
    this.#host = host;
    this.#onState = onState;
    this.#onProgress = onProgress;
    this.#craft = new Craft({ theme });
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    root.appendChild(this.#layer);
    this.#glass = new Glass(root, host);
    this.#changes = new Changes(root, { onAccept: (batch) => this.#apply(batch), onSelect: (el) => this.#selection.select(el, this.#itemOf(el)) });
    this.#selection = new Selection(root, { tokenOf: (family, n) => this.#craft.theme.nearest(family, n, 0.5)?.short ?? null, health: () => host.health, onChange: (el) => this.#marks.select(el),
      changes: this.#changes, read: (el) => host.read(el), steps: (family) => this.#craft.theme.scale(family).filter((x) => Number.isFinite(x.px)).map((x) => ({ token: x.short, n: x.px })).sort((a, b) => a.n - b.n) });
    this.#glass.onPress = (e) => this.#selection.press(e);
    this.#glass.onClick = this.#click;
    this.#marks = new MarkLayer(this.#layer, { onPick: (el, mark, id) => host.choose(el, mark, id), occluders: () => host.occluders?.() ?? [], state: (el, mark) => host.fixState?.(el, mark) ?? null, onOrder: () => host.ordered?.() });
    this.#panel = new Panel(root, { host, marks: this.#marks });
    this.#reader = new Reader(host, { onChange: (items) => { this.#items = items; this.#marks.set(items); this.#panel.set(items); this.#selection.refresh(this.#itemOf(this.#selection.el)); }, onProgress: (p) => { this.#panel.progress(p); this.#onProgress?.(p); }, enrich: (items) => this.#craft.enrich(items) });
  }

  // A key while blueprint is on (the widget asks only when nothing is pinned or being typed): true when used.
  key(key) {
    if (!this.active) return false;
    if (this.#selection.key(key)) return true;
    // with an element selected, . and , step through its problems
    if (this.#selection.el && (key === '.' || key === ',')) return this.#selection.step(key === '.' ? 1 : -1) || true;
    return this.#panel.key(key);
  }
  // The queue changed: the panel says what each cause becomes.
  refresh() {
    if (this.active) this.#panel.render();
  }
  // Through the glass, for a hit test; and the glass's part while words are edited in place.
  through(fn) {
    return this.#glass.through(fn);
  }
  editing(on, rect) {
    if (this.active) this.#glass.editing(on, rect);
  }
  yieldInput(on) {
    this.#glass.yieldTo(on);
  }
  get state() {
    return this.#state;
  }
  get marks() {
    return this.#marks;
  }
  get active() {
    return this.#state === 'entering' || this.#state === 'on';
  }

  toggle(options) {
    this.active ? this.leave(options) : this.enter(options);
  }

  enter({ instant = false } = {}) {
    if (this.active) return;
    if (this.#host.health === 'failed') return this.#set('refused');
    clearTimeout(this.#timer);
    if (this.#state === 'off') {
      const t0 = performance.now();
      this.#layer.hidden = false;
      this.#reader.start();
      performance.measure('plumb:reader-start', { start: t0 });
      addEventListener('scroll', this.#invalidate, { passive: true, capture: true });
      addEventListener('resize', this.#invalidate);
      addEventListener('resize', this.#remeasure); // craft: a new layout is measured again
      addEventListener('pointermove', this.#point, { passive: true });
      document.addEventListener('pointerleave', this.#unpoint);
    } else this.#reader.refresh(); // turned back on while fading out: draw what's already read
    this.#glass.on();
    this.#panel.show(true);
    this.#set('entering');
    if (instant || still()) return this.#on();
    // one frame at opacity 0 before the fade, so the transition has somewhere to start
    this.#marks.dim('shown');
    requestAnimationFrame(() => { if (this.#state === 'entering') this.#layer.setAttribute('data-on', ''), this.#marks.dim('on'); });
    this.#timer = setTimeout(() => this.#on(), FADE_IN);
  }

  leave({ instant = false } = {}) {
    if (!this.active) return;
    clearTimeout(this.#timer);
    this.#glass.off(); // the page is usable again the moment blueprint is let go, not after the fade
    this.#selection.clear();
    this.#layer.removeAttribute('data-on');
    this.#marks.dim('shown');
    this.#marks.clear();
    this.#panel.show(false);
    this.#set('leaving');
    if (instant || still()) return this.#off();
    this.#timer = setTimeout(() => this.#off(), FADE_OUT);
  }

  // Remove everything at once, from any state (the overlay is going away).
  destroy() {
    clearTimeout(this.#timer);
    this.#teardown();
    this.#set('off');
  }

  invalidate(change) {
    this.#craft.invalidate(); // craft: a written file changes what the page measures
    if (this.active) this.#reader.invalidate(change);
  }

  // craft: measured again on the next hand-off (a resize moved everything)
  #remeasure = () => this.#craft.invalidate();
  // craft: the theme's decisions arrived (or changed): suggestions name its tokens, so everything is judged again
  themeChanged() {
    this.#craft.invalidate();
    if (this.active) this.#reader.refresh();
  }
  get craft() {
    return this.#craft;
  }
  // everything read on the page, with its craft marks, and whether the reader has nothing left to read (the headless run)
  get items() {
    return this.#items;
  }
  get settled() {
    return this.active && this.#reader.settled;
  }

  healthChanged(status) {
    if (this.active) this.#reader.healthChanged(status);
  }

  #invalidate = () => { this.#marks.invalidate(); this.#selection.draw(); };
  // the page element under the pointer, looking through the glass and the overlay's own marks
  #under = (x, y) => document.elementsFromPoint(x, y).find((el) => !el.closest('plumb-overlay')) ?? null;
  #point = (e) => { this.#panel.fold(); this.#marks.point(this.#under(e.clientX, e.clientY)); this.#selection.point(e.clientX, e.clientY); this.#glass.cursor(this.#selection.cursor(e.clientX, e.clientY)); };
  // the reader's reading of an element, or of the nearest ancestor it read
  #itemOf(el) { return el ? this.#items.find((i) => i.el === el) ?? null : null; }
  // A click on the page: the innermost element under it that the reader read (else the element itself) is selected;
  // a click on nothing lets go.
  #click = (e) => {
    const hit = this.#under(e.clientX, e.clientY);
    if (!hit || hit === document.body || hit === document.documentElement) { this.#selection.clear(); return; }
    let el = hit;
    while (el && el !== document.body && !this.#itemOf(el)) el = el.parentElement;
    if (!el || el === document.body) {
      // nothing read up the chain: a quiet element is selected as it is, but a wrapper holding read elements (the app's
      // root, a page section) is the page's background, and a click there lets go
      if (this.#items.some((i) => hit.contains(i.el))) { this.#selection.clear(); return; }
      el = hit;
    }
    this.#selection.select(el, this.#itemOf(el));
  };
  // Apply in the Changes sidebar: each element's changes written as one class edit on its own line (POST swap), the
  // hash read now; the page reloads and the element is read again
  async #apply(batch) {
    const out = [];
    for (const b of batch) {
      // every change on the element as one class edit against its classes as written
      const edit = elementEdit(b.classes, b.writes ?? [], b.props);
      if (!edit) { out.push({ el: b.el, ok: false, why: 'This change can’t be written as classes here.' }); continue; }
      try {
        const at = await locate(b.el);
        if (!at?.file) throw new Error('Can’t reach this in your code.');
        const props = await request('props', { file: at.file, line: at.line, column: at.column });
        if (!props?.hash) throw new Error('Can’t read this element.');
        const result = await post('swap', { file: at.file, hash: props.hash, line: props.line ?? at.line, column: props.column ?? at.column, from: edit.from, to: edit.to });
        this.#host.wrote?.(result, `Applied ${edit.to} in ${at.file.split('/').pop()}`);
        this.invalidate({ file: at.file });
        out.push({ el: b.el, ok: true });
      } catch (error) { out.push({ el: b.el, ok: false, why: /changed since/i.test(error?.message ?? '') ? 'This file changed after we checked it. Check again.' : error?.message ?? 'Couldn’t apply.' }); }
    }
    return out;
  }
  // Esc lets go of the selection before it leaves blueprint; true when there was one
  deselect() { return this.#selection.clear(); }
  get selected() { return this.#selection.el; }
  #unpoint = () => this.#marks.point(null);

  #on() {
    if (this.#state !== 'entering') return;
    this.#layer.setAttribute('data-on', '');
    this.#marks.dim('on');
    this.#set('on');
    this.#marks.invalidate();
  }

  #off() {
    if (this.#state !== 'leaving') return;
    this.#teardown();
    this.#set('off');
  }

  // The panel's box, for marks that must not sit under it.
  panelRect() {
    return this.active ? this.#panel.rect : null;
  }

  #set(state) {
    if (state !== 'refused') this.#state = state;
    this.#onState?.(state);
  }

  #teardown() {
    this.#selection.clear();
    this.#glass.off();
    this.#reader.stop();
    this.#marks.clear();
    removeEventListener('scroll', this.#invalidate, { capture: true });
    removeEventListener('resize', this.#invalidate);
    removeEventListener('resize', this.#remeasure);
    this.#craft.invalidate();
    removeEventListener('pointermove', this.#point);
    document.removeEventListener('pointerleave', this.#unpoint);
    this.#layer.removeAttribute('data-on');
    this.#marks.dim('off');
    this.#panel.show(false);
    this.#layer.hidden = true;
  }
}

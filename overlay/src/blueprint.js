/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MODE · Plumb overlay
 *
 * The host page, re-inked as its own blueprint, with every drift Plumb finds drawn where it lives. Instead of Alt-
 * hovering one element at a time, you see the whole view's findings at once and act on any of them.
 *
 *  off → entering → on → leaving → off      Alt+B or the dock's button toggles; Esc leaves
 *
 *  entering  a scan line crosses the view left to right (SPAN); a deep blue field is laid under the page behind it
 *            (html::before), and each element re-inks to white line as the line reaches its column (DEVELOP each)
 *  on        the Reader reads what's in view through Plumb; the MarkLayer draws each finding where it lives; a mark
 *            opens the chooser (blueprint-fix.js), which picks, previews and writes
 *  leaving   the line runs right to left and takes the blueprint with it
 *  reverse   toggling mid-sweep turns the same line around from where it is; there is never more than one sweep
 *  restore   leaving removes everything it added: the stylesheet, the attributes on <html> and on elements. It
 *            never writes an inline style on a host element, so nothing is left in a style attribute
 *  reduced motion: no sweep; the mode changes at once
 *
 * Host-page footprint while on: one <style data-plumb="blueprint"> in <head>; on <html> data-plumb-blueprint (ink),
 * data-plumb-field (the blue field), and, during a sweep, data-plumb-developing, data-plumb-dir and three custom
 * properties; on elements data-plumb-drawn (keep an outline once the fill is cleared) and, during a sweep,
 * data-plumb-col (which column the line reaches it in).
 * ───────────────────────────────────────────────────────── */
import { Reader } from './blueprint-reader.js';
import { MarkLayer, MARKS_CSS } from './blueprint-marks.js';

const SPAN = 520; // ms for the line to cross the view
const DEVELOP = 240; // ms for one element to re-ink
const COLS = 24; // the view's columns; an element re-inks as the line reaches its column
const FIELD = '#1f3fa6'; // blueprint paper: white line on it is 9.1:1, the drift amber 5.1:1

const cols = Array.from({ length: COLS }, (_, k) => k);
const HOST_CSS = `
html[data-plumb-field]::before { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background-color: ${FIELD};
  background-image: linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px);
  background-size: 8px 8px;
  clip-path: inset(0 var(--plumb-field-r, 0%) 0 0); }
html[data-plumb-blueprint] body { background: transparent none !important; }
html[data-plumb-blueprint] body * {
  color: #fff !important; background-color: transparent !important; background-image: none !important;
  border-color: rgb(255 255 255 / 0.55) !important; outline-color: rgb(255 255 255 / 0.55) !important;
  box-shadow: none !important; text-shadow: none !important; caret-color: #fff !important; }
html[data-plumb-blueprint] body [data-plumb-drawn] { box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.6) !important; }
html[data-plumb-blueprint] body :is(img, video, canvas, picture, iframe) { opacity: 0.18 !important; }
${cols.map((k) => `html[data-plumb-dir="in"] body [data-plumb-col="${k}"] { --plumb-k: ${k}; } html[data-plumb-dir="out"] body [data-plumb-col="${k}"] { --plumb-k: ${COLS - 1 - k}; }`).join('\n')}
html[data-plumb-developing] body [data-plumb-col] {
  transition: color ${DEVELOP}ms ease-out, background-color ${DEVELOP}ms ease-out, border-color ${DEVELOP}ms ease-out, box-shadow ${DEVELOP}ms ease-out, opacity ${DEVELOP}ms ease-out !important;
  transition-delay: calc(var(--plumb-k, 0) * var(--plumb-step) - var(--plumb-shift, 0ms)) !important; }
`;

export const BLUEPRINT_CSS = MARKS_CSS;

const visible = (r) => r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
const drawn = (cs) => cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hostElements = () => [...document.body.querySelectorAll('*')].filter((el) => !el.closest('plumb-overlay') && el.localName !== 'script' && el.localName !== 'style');

export class Blueprint {
  #host; #layer; #scan; #style = null; #marks; #reader; #onState; #onProgress;
  #state = 'off';
  #sweep = null; // { dir: 'in' | 'out', p: 0..1 line progress along dir, t0, token, cols: Element[] }
  #token = 0;
  #vars = null; // a tiny <style> holding the sweep's custom properties, so no host element gets an inline style

  // host: the overlay element (readMarks, pin, pinnedElement, occluders); root: its shadow root
  constructor(host, root, { onState, onProgress } = {}) {
    this.#host = host;
    this.#onState = onState;
    this.#onProgress = onProgress;
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    this.#scan = Object.assign(document.createElement('i'), { className: 'scan', hidden: true });
    this.#layer.append(this.#scan);
    root.appendChild(this.#layer);
    this.#marks = new MarkLayer(this.#layer, { onPick: (el, mark, id) => host.choose(el, mark, id), occluders: () => host.occluders?.() ?? [], state: (el, mark) => host.fixState?.(el, mark) ?? null, onOrder: () => host.ordered?.() });
    this.#reader = new Reader(host, { onChange: (items) => this.#marks.set(items), onProgress: (p) => this.#onProgress?.(p) });
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
    const html = document.documentElement;
    if (this.#state === 'off') {
      // read pass, then write pass: no style or layout is invalidated between reads
      const els = hostElements();
      const marks = els.map((el) => drawn(getComputedStyle(el)));
      els.forEach((el, i) => marks[i] && el.setAttribute('data-plumb-drawn', ''));
      this.#style = Object.assign(document.createElement('style'), { textContent: HOST_CSS });
      this.#style.dataset.plumb = 'blueprint';
      document.head.appendChild(this.#style);
      this.#vars = Object.assign(document.createElement('style'), {});
      this.#vars.dataset.plumb = 'blueprint-vars';
      document.head.appendChild(this.#vars);
      this.#layer.hidden = false;
      html.setAttribute('data-plumb-field', '');
      this.#reader.start();
      addEventListener('scroll', this.#invalidate, { passive: true, capture: true });
      addEventListener('resize', this.#invalidate);
    } else this.#reader.refresh(); // turned back on mid-sweep: draw what's already read
    html.setAttribute('data-plumb-blueprint', '');
    this.#set('entering');
    this.#run('in', instant);
  }

  leave({ instant = false } = {}) {
    if (!this.active) return;
    document.documentElement.removeAttribute('data-plumb-blueprint');
    this.#set('leaving');
    this.#marks.clear();
    this.#run('out', instant);
  }

  // Remove everything at once, from any state (the overlay is going away).
  destroy() {
    this.#token++;
    this.#sweep = null;
    this.#teardown();
    this.#set('off');
  }

  invalidate(change) {
    if (this.active) this.#reader.invalidate(change);
  }

  healthChanged(status) {
    if (this.active) this.#reader.healthChanged(status);
  }

  #invalidate = () => this.#marks.invalidate();

  #set(state) {
    if (state !== 'refused') this.#state = state;
    this.#onState?.(state);
  }

  // One sweep. A second toggle while it runs turns it around from where the line is.
  #run(dir, instant) {
    const html = document.documentElement;
    const token = ++this.#token;
    if (instant || still()) {
      this.#finish(dir, token, this.#sweep?.cols ?? []);
      return;
    }
    let cols = this.#sweep?.cols;
    const turned = !!this.#sweep;
    const p = turned ? 1 - this.#sweep.p : 0; // keep the line where it is
    if (!cols) {
      // read pass, then write pass
      const els = hostElements();
      const rects = els.map((el) => el.getBoundingClientRect());
      cols = [];
      els.forEach((el, i) => {
        if (!visible(rects[i])) return;
        const at = Math.min(1, Math.max(0, (rects[i].left + rects[i].width / 2) / innerWidth));
        el.setAttribute('data-plumb-col', String(Math.min(COLS - 1, Math.floor(at * COLS))));
        cols.push(el);
      });
    }
    html.setAttribute('data-plumb-dir', dir);
    const vars = { step: `${SPAN / (COLS - 1)}ms`, shift: `${p * SPAN}ms`, field: '100%' };
    this.#setVars(vars);
    html.setAttribute('data-plumb-developing', '');
    this.#scan.hidden = false;
    const t0 = performance.now() - p * SPAN;
    this.#sweep = { dir, p, t0, token, cols };
    const step = (now) => {
      if (token !== this.#token) return;
      const s = this.#sweep;
      s.p = Math.min(1, Math.max(0, (now - t0) / SPAN));
      const x = dir === 'in' ? s.p : 1 - s.p; // the line, 0 at the left edge
      this.#scan.style.left = `${x * 100}%`;
      this.#setVars({ ...vars, field: `${(1 - x) * 100}%` });
      if (s.p < 1) return requestAnimationFrame(step);
      this.#scan.hidden = true;
      setTimeout(() => this.#finish(dir, token, cols), DEVELOP); // the last column finishes re-inking
    };
    requestAnimationFrame(step);
  }

  #finish(dir, token, cols) {
    if (token !== this.#token) return;
    const html = document.documentElement;
    this.#sweep = null;
    this.#scan.hidden = true;
    html.removeAttribute('data-plumb-developing');
    html.removeAttribute('data-plumb-dir');
    this.#setVars(null);
    for (const el of cols) el.removeAttribute('data-plumb-col');
    if (dir === 'in') return this.#set('on'), this.#marks.invalidate();
    this.#teardown();
    this.#set('off');
  }

  // The sweep's custom properties, written into our own stylesheet rather than onto <html>.
  #setVars(v) {
    if (!this.#vars) return;
    this.#vars.textContent = v ? `html { --plumb-step: ${v.step}; --plumb-shift: ${v.shift}; --plumb-field-r: ${v.field}; }` : '';
  }

  #teardown() {
    const html = document.documentElement;
    this.#reader.stop();
    this.#marks.clear();
    removeEventListener('scroll', this.#invalidate, { capture: true });
    removeEventListener('resize', this.#invalidate);
    for (const name of ['data-plumb-blueprint', 'data-plumb-field', 'data-plumb-developing', 'data-plumb-dir']) html.removeAttribute(name);
    this.#setVars(null);
    for (const el of document.querySelectorAll('[data-plumb-drawn], [data-plumb-col]')) el.removeAttribute('data-plumb-drawn'), el.removeAttribute('data-plumb-col');
    this.#style?.remove();
    this.#vars?.remove();
    this.#style = this.#vars = null;
    this.#scan.hidden = true;
    this.#layer.hidden = true;
  }
}

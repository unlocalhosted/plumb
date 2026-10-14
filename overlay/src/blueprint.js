/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MODE · Plumb overlay
 *
 * The host page, re-inked as its own blueprint, with every drift Plumb finds drawn where it lives. Instead of Alt-
 * hovering one element at a time, you see the whole view's findings at once and act on any of them.
 *
 *  off → entering → on → leaving → off      Alt+B or the dock's button toggles; Esc leaves
 *
 *  entering  a scan line crosses the view left to right (SPAN); a deep blue field is laid under the page behind it
 *            (html::before, revealed by one clip-path transition, never a per-frame style write: a custom property
 *            changed on <html> every frame would restyle every element every frame), and each element re-inks to
 *            white line as the line reaches its column (DEVELOP each). Everything the entry needs to read from the
 *            page is read before anything is written, so the page's style is recomputed once, not three times;
 *            words go transparent and, once the line has crossed, the Greek layer draws a bar per line of text, so
 *            the drawing shows structure and rhythm, not copy
 *  on        the Reader reads what's in view through Plumb; the MarkLayer draws each finding as a break in the
 *            drawing where it lives, with one badge per element counting them, and each gap on the system as a quiet
 *            dimension named by its token; a break opens the chooser (blueprint-fix.js),
 *            which picks, previews and writes; each element with drift is washed amber by how far it sits from the
 *            system, lifting under the pointer. A title block in the corner names the sheet: the route, the viewport
 *            and its breakpoint, the tally of what is drawn (on the system, off), and the causes of the drift by
 *            count, so the decision that closes the most is the first line; pointing at a cause outlines the
 *            elements it touches
 *  peek      D held: every drift in view takes its nearest token at once (the fixer's previews), the page re-lays
 *            out as it would after the fixes, and the ink turns mint; the breaks, badges and wash go, since there is
 *            no drift to show. Release puts it back. A pick keeps its pick
 *  leaving   the line runs right to left and takes the blueprint with it
 *  reverse   toggling mid-sweep turns the same line around from where it is; there is never more than one sweep
 *  restore   leaving removes everything it added: the stylesheet, the attributes on <html> and on elements. It
 *            never writes an inline style on a host element, so nothing is left in a style attribute
 *  reduced motion: no sweep; the mode changes at once
 *
 * Host-page footprint while on: one <style data-plumb="blueprint"> in <head> and one <style data-plumb="blueprint-vars">
 * (the field's clip and each column's delay); on <html> data-plumb-blueprint (ink) and data-plumb-field (the blue
 * field), both set in the same task as the stylesheet so the page is restyled once; on elements data-plumb-drawn
 * (keep an outline once the fill is cleared), data-plumb-ink on every element in or near view (fills, borders and
 * shadows cleared) with data-plumb-text on those that hold words (their colour cleared),
 * and, during a sweep, data-plumb-col (which column the line reaches it in). Nothing on <html> changes during a
 * sweep, and no rule reaches every element.
 * ───────────────────────────────────────────────────────── */
import { Reader } from './blueprint-reader.js';
import { MarkLayer, MARKS_CSS } from './blueprint-marks.js';
import { Greek, GREEK_CSS } from './blueprint-greek.js';

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
  clip-path: inset(0 100% 0 0); transition: clip-path 0ms linear; }
html[data-plumb-blueprint] body { background: transparent none !important; }
/* The ink goes on element by element, in two parts, and never through an inherited property on a container:
   changing \`color\` on the page's root box restyles every element under it, which on a page of fifteen thousand
   is most of a second, however few elements were touched. So data-plumb-ink carries only properties that do not
   inherit (fills, borders, shadows) and goes on every element in or near view, and data-plumb-text carries the
   inherited ones (color, text shadow, caret) and goes only on elements that hold text themselves. The rest are
   inked as they arrive. */
[data-plumb-ink] {
  background-color: transparent !important; background-image: none !important;
  border-color: rgb(255 255 255 / 0.55) !important; outline-color: rgb(255 255 255 / 0.55) !important;
  box-shadow: none !important; }
[data-plumb-text] { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: #fff !important; }
[data-plumb-ink]::before, [data-plumb-ink]::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }
[data-plumb-ink][data-plumb-drawn] { box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.6) !important; }
[data-plumb-ink]:is(img, video, canvas, picture, iframe) { opacity: 0.18 !important; }
/* an image or an icon is a plate: its outline and a hatch, never its picture */
[data-plumb-ink]:is(input, textarea, select) { color: #fff !important; -webkit-text-fill-color: #fff !important; }
svg[data-plumb-ink] { outline: 1px solid rgb(255 255 255 / 0.45) !important; outline-offset: -1px !important;
  background: repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.14) 5px 6px) !important; }
/* an icon's drawing goes, its plate stays; named tags rather than *, so adding this sheet re-matches only them */
svg[data-plumb-ink] :is(path, g, rect, circle, ellipse, line, polyline, polygon, text, tspan, use, image, defs, symbol, foreignObject, mask, pattern, clipPath) { visibility: hidden !important; }
html[data-plumb-peek] body [data-plumb-ink][data-plumb-drawn] { box-shadow: inset 0 0 0 1px rgb(168 240 198 / 0.75) !important; }
html[data-plumb-peek] body [data-plumb-ink] { border-color: rgb(168 240 198 / 0.6) !important; outline-color: rgb(168 240 198 / 0.6) !important; }
/* the sweep's state lives on the elements it reaches, never on <html>: an attribute flipped on <html> restyles
   every element on the page, and a page of fifteen thousand pays half a second for each flip */
[data-plumb-ink][data-plumb-col] {
  transition: color ${DEVELOP}ms ease-out, background-color ${DEVELOP}ms ease-out, border-color ${DEVELOP}ms ease-out, box-shadow ${DEVELOP}ms ease-out, opacity ${DEVELOP}ms ease-out !important; }
`;

// The title block: a drawing's corner stamp, in the blueprint's own ink on its own field.
const SHEET_CSS = `
  .bp .sheet { position: fixed; inset-inline-start: 16px; inset-block-end: 16px; display: grid; grid-template-columns: max-content 1fr; column-gap: 12px; row-gap: 3px;
    padding: 7px 10px 8px; max-width: calc(100vw - 32px); box-sizing: border-box; pointer-events: none; white-space: nowrap;
    font: 500 11px/14px var(--pl-mono); color: #fff; background: rgb(31 63 166 / 0.94); border: 1px solid rgb(255 255 255 / 0.7); box-shadow: 0 0 0 4px rgb(31 63 166 / 0.55);
    opacity: 0; transition: opacity ${DEVELOP}ms ease-out; }
  .bp .sheet[data-on] { opacity: 1; }
  .bp .sheet .key { color: rgb(255 255 255 / 0.62); font-size: 9px; line-height: 14px; letter-spacing: 0.1em; text-transform: uppercase; }
  .bp .sheet .route { overflow: hidden; text-overflow: ellipsis; max-width: 40vw; }
  .bp .sheet .tally[data-reading] { color: rgb(255 255 255 / 0.72); }
  .bp .sheet .off { color: #ffb347; }
  .bp .sheet .causes { grid-column: 1 / -1; display: grid; grid-template-columns: auto 1fr; column-gap: 12px; row-gap: 2px; margin-top: 4px; padding-top: 5px; border-top: 1px solid rgb(255 255 255 / 0.25); max-width: 360px; white-space: normal; }
  .bp .sheet .causes:empty { display: none; }
  .bp .sheet .cause { display: contents; pointer-events: auto; cursor: default; }
  .bp .sheet .cause .n { color: #ffb347; text-align: right; }
  .bp .sheet .cause .what { color: rgb(255 255 255 / 0.9); overflow-wrap: normal; hyphens: none; }
  .bp .sheet .cause .cls { white-space: nowrap; }
  .bp .sheet .cause:hover .what { color: #fff; text-decoration: underline; text-decoration-color: #ffb347; text-underline-offset: 2px; }
  .bp .sheet .cause .more { color: rgb(255 255 255 / 0.55); }
  @media (prefers-reduced-motion: reduce) { .bp .sheet { transition: none; } }
  .bp[data-peek] svg.greek rect { fill: #a8f0c6; }
  .bp[data-peek] svg[role="group"], .bp[data-peek] svg.wash, .bp[data-peek] .bp-hint { visibility: hidden; }
  .bp[data-peek] .sheet { border-color: #a8f0c6; }
  .bp[data-peek] .sheet .tally { color: #a8f0c6; }
`;
export const BLUEPRINT_CSS = MARKS_CSS + SHEET_CSS + GREEK_CSS;

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The drift in view grouped by what would fix it: a kind of finding in a family. Each cause knows how many marks it
// holds, which elements, and a few of the classes written, so a person can find them.
const NOUN = { spacing: 'spacing values off the scale', radius: 'corners off the scale', type: 'text sizes or weights off the scale', color: 'raw colours', elevation: 'hand-written shadows', shadow: 'hand-written shadows', z: 'z-indexes off the scale', motion: 'timings off the scale' };
function causesOf(items) {
  const groups = new Map();
  for (const item of items) for (const mark of item.marks) {
    if (mark.ledger !== 'new' || /opaque-inline|^config\//.test(mark.rule)) continue;
    const kind = /framework/.test(mark.rule) ? 'default' : /tier/.test(mark.rule) ? 'tier' : /by-value|matches/.test(mark.rule) ? 'near' : /existence/.test(mark.rule) ? 'missing' : 'off';
    const key = `${kind}|${kind === 'off' ? mark.family : ''}`;
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { kind, family: mark.family, count: 0, elements: new Set(), texts: new Set() }));
    group.count++;
    group.elements.add(item.el);
    if (mark.text) group.texts.add(mark.text);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count).map((g) => {
    const what = g.kind === 'default' ? `Tailwind default${g.count === 1 ? '' : 's'}, not your theme` : g.kind === 'tier' ? `raw token${g.count === 1 ? '' : 's'} where a named one is wanted`
      : g.kind === 'near' ? `match${g.count === 1 ? 'es' : ''} a token without using it` : g.kind === 'missing' ? `undefined variable${g.count === 1 ? '' : 's'}` : (NOUN[g.family] ?? `${g.family} values off the scale`);
    const texts = [...g.texts];
    return { what, count: g.count, elements: [...g.elements], examples: [...texts.slice(0, 3), ...(texts.length > 3 ? [`+${texts.length - 3}`] : [])] };
  });
}

// Tailwind's breakpoints, the names a designer switches between.
const BREAKPOINTS = [['2xl', 1536], ['xl', 1280], ['lg', 1024], ['md', 768], ['sm', 640]];
const breakpointOf = (width) => BREAKPOINTS.find(([, min]) => width >= min)?.[0] ?? 'base';

const visible = (r) => r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
// an element that holds words itself (a text node child), so its colour is its own to clear
const holdsText = (el) => { for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; };
// in view or within one screen of it: inked before it can be seen
const near = (r) => r.bottom > -innerHeight && r.top < innerHeight * 2 && r.right > -innerWidth && r.left < innerWidth * 2 && (r.width > 0 || r.height > 0);
const drawn = (cs) => cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hostElements = () => [...document.body.querySelectorAll('*')].filter((el) => !el.ownerSVGElement && !el.closest('plumb-overlay') && el.localName !== 'script' && el.localName !== 'style');

export class Blueprint {
  #host; #layer; #scan; #style = null; #marks; #reader; #onState; #onProgress;
  #state = 'off';
  #sweep = null; // { dir: 'in' | 'out', p: 0..1 line progress along dir, t0, token, cols: Element[] }
  #cols = null; // [[element, column]] measured before the ink goes on, reused by both sweeps
  #inked = new Set(); // host elements carrying data-plumb-ink
  #inkTimer = 0; #inkObserver = null;
  #fieldReady = false;
  #token = 0;
  #vars = null; // a tiny <style> holding the sweep's custom properties, so no host element gets an inline style
  #sheet; #progress = null; #greek; #items = []; #causes = []; #peeking = false;

  // host: the overlay element (readMarks, pin, pinnedElement, occluders); root: its shadow root
  constructor(host, root, { onState, onProgress } = {}) {
    this.#host = host;
    this.#onState = onState;
    this.#onProgress = onProgress;
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    this.#scan = Object.assign(document.createElement('i'), { className: 'scan', hidden: true });
    this.#sheet = document.createElement('div');
    this.#sheet.className = 'sheet';
    this.#sheet.setAttribute('role', 'note');
    this.#sheet.setAttribute('aria-label', 'Blueprint sheet');
    this.#sheet.innerHTML = '<span class="key">Sheet</span><span class="route"></span><span class="key">View</span><span class="view"></span><span class="key">Tally</span><span class="tally"></span><div class="causes"></div>';
    // pointing at a cause outlines what it touches
    this.#sheet.addEventListener('pointerover', (e) => { const row = e.target.closest?.('.cause'); if (row) this.#marks.spotlight(this.#causes[+row.dataset.k]?.elements ?? []); });
    this.#sheet.addEventListener('pointerout', (e) => { if (e.target.closest?.('.cause') && !e.relatedTarget?.closest?.('.cause')) this.#marks.spotlight([]); });
    this.#layer.append(this.#scan, this.#sheet);
    root.appendChild(this.#layer);
    this.#greek = new Greek(this.#layer);
    this.#marks = new MarkLayer(this.#layer, { onPick: (el, mark, id) => host.choose(el, mark, id), occluders: () => host.occluders?.() ?? [], state: (el, mark) => host.fixState?.(el, mark) ?? null, onOrder: () => host.ordered?.() });
    this.#reader = new Reader(host, { onChange: (items) => { this.#items = items; this.#marks.set(items); this.#stamp(); }, onProgress: (p) => { this.#progress = p; this.#stamp(); this.#onProgress?.(p); } });
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
      const t0 = performance.now();
      // read pass, then write pass: no style or layout is invalidated between reads, and the sweep's columns are
      // measured here too, so the sweep never has to read the page after the ink is on
      const els = hostElements();
      const rects = els.map((el) => el.getBoundingClientRect());
      const inView = rects.map(near);
      const marks = els.map((el, i) => inView[i] && drawn(getComputedStyle(el)));
      this.#cols = [];
      els.forEach((el, i) => { if (visible(rects[i])) this.#cols.push([el, Math.min(COLS - 1, Math.floor(Math.min(1, Math.max(0, (rects[i].left + rects[i].width / 2) / innerWidth)) * COLS))]); });
      els.forEach((el, i) => { if (inView[i]) { el.setAttribute('data-plumb-ink', ''); if (holdsText(el)) el.setAttribute('data-plumb-text', ''); this.#inked.add(el); if (marks[i]) el.setAttribute('data-plumb-drawn', ''); } });
      this.#inkObserver = new MutationObserver(() => this.#inkLater());
      this.#inkObserver.observe(document.body, { subtree: true, childList: true });
      this.#style = Object.assign(document.createElement('style'), { textContent: HOST_CSS });
      this.#style.dataset.plumb = 'blueprint';
      document.head.appendChild(this.#style);
      this.#vars = Object.assign(document.createElement('style'), {});
      this.#vars.dataset.plumb = 'blueprint-vars';
      document.head.appendChild(this.#vars);
      this.#layer.hidden = false;
      html.setAttribute('data-plumb-field', '');
      this.#setVars({ field: '100%', ms: 0 }); // clipped, ready for the sweep to carry it
      performance.measure('plumb:enter-ink', { start: t0 });
      const t1 = performance.now();
      this.#reader.start();
      performance.measure('plumb:reader-start', { start: t1 });
      addEventListener('scroll', this.#invalidate, { passive: true, capture: true });
      addEventListener('scroll', this.#inkLater, { passive: true, capture: true });
      addEventListener('resize', this.#invalidate);
      addEventListener('resize', this.#inkLater);
      addEventListener('pointermove', this.#point, { passive: true });
      document.addEventListener('pointerleave', this.#unpoint);
    } else this.#reader.refresh(); // turned back on mid-sweep: draw what's already read
    html.setAttribute('data-plumb-blueprint', '');
    this.#set('entering');
    this.#run('in', instant);
  }

  leave({ instant = false } = {}) {
    if (!this.active) return;
    this.peek(false);
    document.documentElement.removeAttribute('data-plumb-blueprint');
    this.#sheet.removeAttribute('data-on');
    this.#greek.stop(); // the words are back the moment the ink goes
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

  #invalidate = () => { this.#marks.invalidate(); this.#stamp(); };
  // Elements that scrolled or rendered into view since the entry are inked when the movement settles: one rect
  // pass over the page (cheap when its layout is clean), then attributes on the newcomers only.
  #inkLater = () => {
    if (this.#inkTimer || this.#state === 'off') return;
    this.#inkTimer = setTimeout(() => { this.#inkTimer = 0; this.#inkMore(); }, 120);
  };
  #inkMore() {
    if (this.#state === 'off') return;
    const t0 = performance.now();
    const fresh = hostElements().filter((el) => !this.#inked.has(el));
    const rects = fresh.map((el) => el.getBoundingClientRect());
    const marks = fresh.map((el, i) => near(rects[i]) && drawn(getComputedStyle(el)));
    fresh.forEach((el, i) => { if (near(rects[i])) { el.setAttribute('data-plumb-ink', ''); if (holdsText(el)) el.setAttribute('data-plumb-text', ''); this.#inked.add(el); if (marks[i]) el.setAttribute('data-plumb-drawn', ''); } });
    performance.measure('plumb:ink-more', { start: t0 });
  }
  // the element under the pointer, looking through the overlay's own marks: its wash lifts
  #point = (e) => this.#marks.lift(document.elementsFromPoint(e.clientX, e.clientY).find((el) => !el.closest('plumb-overlay')) ?? null);
  #unpoint = () => this.#marks.lift(null);

  // The title block's text: where this sheet is, how wide, and what is drawn on it.
  #stamp() {
    const p = this.#progress;
    const route = location.pathname + (location.search.length > 1 && location.search.length < 24 ? location.search : '');
    const view = `${innerWidth} × ${innerHeight} · ${breakpointOf(innerWidth)}`;
    const tally = this.#peeking ? 'as designed · release D' : !p || !p.total ? 'reading…' : p.read < p.total ? `reading ${p.read} of ${p.total}…`
      : `${p.on} on system · ${p.drift ? `<span class="off">${p.drift} off</span>` : 'all true'}`;
    const reading = !p || !p.total || p.read < p.total;
    const [r, v, t] = ['.route', '.view', '.tally'].map((sel) => this.#sheet.querySelector(sel));
    if (r.textContent !== route) r.textContent = route;
    if (v.textContent !== view) v.textContent = view;
    if (t.innerHTML !== tally) t.innerHTML = tally;
    t.toggleAttribute('data-reading', reading);
    // the causes: one line per kind of drift in view, most first; the first line is the decision that closes the most
    this.#causes = causesOf(this.#items);
    const rows = this.#causes.slice(0, 4).map((c, k) => `<span class="cause" data-k="${k}"><span class="n">${c.count}</span><span class="what">${esc(c.what)}${c.examples.length ? ` <span class="more">· ${c.examples.map((t) => `<span class="cls">${esc(t)}</span>`).join(' ')}</span>` : ''}</span></span>`).join('')
      + (this.#causes.length > 4 ? `<span class="cause"><span class="n"></span><span class="what more">${this.#causes.length - 4} more kinds</span></span>` : '');
    const box = this.#sheet.querySelector('.causes');
    if (box.innerHTML !== rows) box.innerHTML = rows;
  }

  // Held: the view as designed. The host takes every drift to its nearest token; the ink turns mint.
  peek(on) {
    if (on === this.#peeking || (on && this.#state !== 'on')) return;
    this.#peeking = on;
    if (on) { this.#host.peekAll?.(this.#items); document.documentElement.setAttribute('data-plumb-peek', ''); this.#layer.setAttribute('data-peek', ''); }
    else { this.#host.unpeekAll?.(); document.documentElement.removeAttribute('data-plumb-peek'); this.#layer.removeAttribute('data-peek'); }
    this.#stamp();
    this.#marks.invalidate();
    this.#greek.invalidate();
  }

  // The title block's box, for marks that must not sit under it.
  sheetRect() {
    return this.#sheet.hasAttribute('data-on') ? this.#sheet.getBoundingClientRect() : null;
  }

  #set(state) {
    if (state !== 'refused') this.#state = state;
    this.#onState?.(state);
  }

  // One sweep. A second toggle while it runs turns it around from where the line is.
  #run(dir, instant) {
    const html = document.documentElement;
    const token = ++this.#token;
    if (instant || still()) {
      if (dir === 'in') this.#setVars({ field: '0%', ms: 0 });
      this.#finish(dir, token, this.#sweep?.cols ?? []);
      return;
    }
    // the field's ::before needs one frame at its clipped start before a transition can carry it
    if (!this.#sweep && dir === 'in' && !this.#fieldReady) { this.#fieldReady = true; requestAnimationFrame(() => { if (token === this.#token) this.#run(dir, instant); }); return; }
    let cols = this.#sweep?.cols;
    const turned = !!this.#sweep;
    const p = turned ? 1 - this.#sweep.p : 0; // keep the line where it is
    if (!cols) {
      const t0 = performance.now();
      // the columns were measured before the ink went on; a leaving sweep reuses them, so nothing is read here
      cols = [];
      // a leaving sweep runs the columns the other way
      for (const [el, k] of this.#cols ?? []) if (el.isConnected) el.setAttribute('data-plumb-col', String(dir === 'in' ? k : COLS - 1 - k)), cols.push(el);
      performance.measure('plumb:sweep-cols', { start: t0 });
    }
    // written once, into our own stylesheet: each column's delay, and the field's clip target, which one
    // transition then carries. Only [data-plumb-col] elements and the field's pseudo-element are restyled
    const per = SPAN / (COLS - 1), shift = p * SPAN;
    this.#setVars({ field: dir === 'in' ? '0%' : '100%', ms: Math.round(SPAN * (1 - p)), delays: Array.from({ length: COLS }, (_, k) => Math.round(k * per - shift)) });
    this.#scan.hidden = false;
    const t0 = performance.now() - p * SPAN;
    this.#sweep = { dir, p, t0, token, cols };
    const step = (now) => {
      if (token !== this.#token) return;
      const s = this.#sweep;
      s.p = Math.min(1, Math.max(0, (now - t0) / SPAN));
      const x = dir === 'in' ? s.p : 1 - s.p; // the line, 0 at the left edge
      this.#scan.style.left = `${x * 100}%`; // the only per-frame write, on the overlay's own element
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
    for (const el of cols) el.removeAttribute('data-plumb-col');
    if (dir === 'in') return this.#setVars({ field: '0%', ms: 0 }), this.#stamp(), this.#sheet.setAttribute('data-on', ''), this.#greek.start(), this.#set('on'), this.#marks.invalidate();
    this.#setVars(null);
    this.#teardown();
    this.#set('off');
  }

  // The sweep's stylesheet: the field's clip target and duration on its own pseudo-element, and one delay rule per
  // column. No custom property on <html>: an inherited property changed there restyles every element.
  #setVars(v) {
    if (!this.#vars) return;
    const delays = v?.delays ? Array.from({ length: COLS }, (_, k) => `[data-plumb-ink][data-plumb-col="${k}"] { transition-delay: ${v.delays[k] ?? Math.round(k * SPAN / (COLS - 1))}ms !important; }`).join('\n') : '';
    this.#vars.textContent = v ? `html[data-plumb-field]::before { clip-path: inset(0 ${v.field} 0 0) !important; transition-duration: ${v.ms}ms !important; }\n${delays}` : '';
  }

  #teardown() {
    const html = document.documentElement;
    this.peek(false);
    this.#reader.stop();
    this.#marks.clear();
    removeEventListener('scroll', this.#invalidate, { capture: true });
    removeEventListener('scroll', this.#inkLater, { capture: true });
    removeEventListener('resize', this.#invalidate);
    removeEventListener('resize', this.#inkLater);
    clearTimeout(this.#inkTimer); this.#inkTimer = 0;
    this.#inkObserver?.disconnect(); this.#inkObserver = null;
    for (const el of this.#inked) el.removeAttribute('data-plumb-ink'), el.removeAttribute('data-plumb-text');
    this.#inked.clear();
    removeEventListener('pointermove', this.#point);
    document.removeEventListener('pointerleave', this.#unpoint);
    for (const name of ['data-plumb-blueprint', 'data-plumb-field', 'data-plumb-peek']) html.removeAttribute(name);
    this.#setVars(null);
    for (const el of document.querySelectorAll('[data-plumb-drawn], [data-plumb-col], [data-plumb-ink], [data-plumb-text]')) for (const name of ['data-plumb-drawn', 'data-plumb-col', 'data-plumb-ink', 'data-plumb-text']) el.removeAttribute(name);
    this.#style?.remove();
    this.#vars?.remove();
    this.#style = this.#vars = null;
    this.#cols = null;
    this.#fieldReady = false;
    this.#scan.hidden = true;
    this.#greek.stop();
    this.#sheet.removeAttribute('data-on');
    this.#progress = null;
    this.#layer.hidden = true;
  }
}

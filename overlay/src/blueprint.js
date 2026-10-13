/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MODE · Plumb overlay
 *
 * The host page, re-inked as its own blueprint, with every drift Plumb finds drawn where it lives. Instead of Alt-
 * hovering one element at a time, you see the whole view's findings at once and click a mark to fix it.
 *
 * Nothing here is inferred from computed styles: every mark is a finding from Plumb's engine (the same reading the
 * Alt card shows, via the widget's read()), drawn at the geometry of the property it names.
 *
 *  enter     Alt+B or the dock's blueprint button. A scan line crosses the view left to right; the blue field is laid
 *            behind it (html::before, under the page) and each element re-inks to white line as the line reaches it.
 *  read      every visible element is read through Plumb (cached by the widget), a few at a time; marks appear as
 *            readings arrive. New drift in the drift colour, recorded debt in dashed white, exceptions not at all.
 *  marks     a dimension across a gap, padding or margin; an arc on a corner; a bracket at the words for type; a tag
 *            at the corner for colour, shadow, motion, z; a dashed outline for habits and existence findings.
 *  click     a mark pins the element's reading, as Alt+click does: pick a token, preview, Write.
 *  live      geometry follows scroll and resize every frame; a changed element (a write, a reload) is read again.
 *  leave     Alt+B again: the line runs right to left and takes the blueprint with it. The page is exactly as it was.
 *  reduced motion: no sweep; the mode changes at once
 * ───────────────────────────────────────────────────────── */

const SWEEP = 700; // ms for the scan line to cross the view
const CONCURRENT = 6; // readings in flight at once
const CAP = 260; // elements read per view, so a huge page stays quick
const INK = { line: '#ffffff', drift: '#ffe1db', debt: 'rgb(255 255 255 / 0.55)' };

// The host page, re-inked. Everything is scoped to the attribute, so removing it restores the page exactly; the
// transitions exist only while a sweep is running, so the host's own transitions are never touched otherwise.
const HOST_CSS = `
html[data-plumb-field]::before { content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background-color: #2f5be0;
  background-image: linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px);
  background-size: 8px 8px;
  clip-path: inset(0 var(--plumb-field-r, 0%) 0 var(--plumb-field-l, 0%)); }
html[data-plumb-blueprint] body *:not(plumb-overlay) {
  color: #fff !important; background-color: transparent !important; background-image: none !important;
  border-color: rgb(255 255 255 / 0.55) !important; outline-color: rgb(255 255 255 / 0.55) !important;
  box-shadow: none !important; text-shadow: none !important; caret-color: #fff !important; }
html[data-plumb-blueprint] body [data-plumb-drawn] { box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.6) !important; }
html[data-plumb-blueprint] body :is(img, video, canvas, picture, iframe) { opacity: 0.18 !important; }
html[data-plumb-developing] body *:not(plumb-overlay) {
  transition: color 240ms ease-out, background-color 240ms ease-out, border-color 240ms ease-out, box-shadow 240ms ease-out, opacity 240ms ease-out !important;
  transition-delay: var(--plumb-develop, 0ms) !important; }
`;

// The overlay's own drawing of the marks, inside its shadow root.
export const BLUEPRINT_CSS = `
  .bp { position: fixed; inset: 0; pointer-events: none; }
  .bp svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .bp .hit { pointer-events: auto; cursor: pointer; }
  .bp text { font: 500 10px/1 var(--pl-mono); paint-order: stroke; stroke: #2f5be0; stroke-width: 3px; stroke-linejoin: round; }
  .bp .scan { position: fixed; inset-block: 0; width: 1px; background: #fff; box-shadow: 0 0 24px 4px rgb(255 255 255 / 0.6); }
`;

const visible = (r) => r.width > 1 && r.height > 1 && r.bottom > -80 && r.top < innerHeight + 80 && r.right > 0 && r.left < innerWidth;
const drawn = (cs) => cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Where a mark's property lives on the element, in viewport coordinates.
function geometryOf(el, mark) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const prop = mark.props[0] ?? '';
  const n = (v) => parseFloat(v) || 0;
  if (/^(column-|row-)?gap$/.test(prop)) {
    const kids = [...el.children].map((c) => c.getBoundingClientRect()).filter((k) => k.width > 0 && k.height > 0);
    const column = cs.flexDirection?.startsWith('column') || prop === 'row-gap';
    if (kids.length > 1) {
      const [a, b] = kids;
      return column
        ? { kind: 'v', x: Math.max(a.left, b.left) - 7, y1: a.bottom, y2: b.top }
        : { kind: 'h', x1: a.right, x2: b.left, y: Math.min(a.top, b.top) - 7 };
    }
  }
  if (/^padding/.test(prop)) {
    if (/(top|bottom|block)/.test(prop) || prop === 'padding-y') return { kind: 'v', x: r.left + r.width / 2, y1: r.top, y2: r.top + n(cs.paddingTop) };
    return { kind: 'h', x1: r.left, x2: r.left + n(cs.paddingLeft), y: r.top + r.height / 2, under: r.height < 48 ? r.bottom + 12 : null };
  }
  if (/^margin/.test(prop)) {
    if (/(top|bottom|block)/.test(prop)) return { kind: 'v', x: r.left + 12, y1: r.top - n(cs.marginTop), y2: r.top };
    return { kind: 'h', x1: r.left - n(cs.marginLeft), x2: r.left, y: r.top + r.height / 2 };
  }
  if (/radius/.test(prop)) return { kind: 'arc', x: r.left, y: r.top, r: Math.min(n(cs.borderTopLeftRadius), r.width / 2, r.height / 2) };
  if (/^(font-size|line-height|letter-spacing|font-weight)$/.test(prop)) {
    const words = [...el.childNodes].find((c) => c.nodeType === 3 && c.textContent.trim());
    if (words) {
      const range = document.createRange();
      range.selectNodeContents(words);
      const t = range.getClientRects()[0];
      if (t) return { kind: 'type', x: t.right + 4, y1: t.top + 2, y2: t.bottom - 2 };
    }
  }
  if (/^(width|min-width|max-width)$/.test(prop)) return { kind: 'h', x1: r.left, x2: r.right, y: r.top - 7 };
  if (/^(height|min-height|max-height)$/.test(prop)) return { kind: 'v', x: r.left - 7, y1: r.top, y2: r.bottom };
  if (mark.glyph === 'habit' || mark.glyph === 'existence' || mark.glyph === 'ownership' || mark.glyph === 'imitation' || !prop) return { kind: 'box', x: r.left, y: r.top, w: r.width, h: r.height };
  return { kind: 'tag', x: r.left, y: r.top };
}

const short = (prop) => ({ 'border-radius': 'r', 'font-size': 'text', 'padding-left': 'pl', 'padding-right': 'pr', 'padding-top': 'pt', 'padding-bottom': 'pb', 'padding-inline': 'px', 'padding-block': 'py', 'column-gap': 'gap', 'row-gap': 'gap-y', 'background-color': 'bg', 'border-color': 'border', 'box-shadow': 'shadow', 'z-index': 'z' })[prop] ?? prop;
const labelOf = (mark) => {
  const prop = mark.props[0];
  if (!prop) return mark.rule.split('/').pop();
  const v = mark.n !== undefined ? Math.round(mark.n * 10) / 10 : String(mark.value ?? '').slice(0, 18);
  return `${short(prop)} ${v}`;
};

// One mark, drawn in SVG. Returns markup; the hit area carries the element's index so a click can pin it.
function drawMark(g, mark, i) {
  const ink = mark.ledger === 'new' ? INK.drift : INK.debt;
  const dash = mark.ledger === 'new' ? '' : ' stroke-dasharray="3 3"';
  const text = labelOf(mark);
  const wide = text.length * 6 + 6;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const label = (x, y, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${ink}">${esc(text)}</text>`;
  const hit = (x, y, w, h) => `<rect class="hit" data-i="${i}" x="${x}" y="${y}" width="${Math.max(12, w)}" height="${Math.max(12, h)}" fill="transparent"><title>${esc(mark.title)}</title></rect>`;
  const T = 3;
  let body = '';
  let box;
  if (g.kind === 'h') {
    const len = g.x2 - g.x1;
    body = `<line x1="${g.x1}" y1="${g.y}" x2="${g.x2}" y2="${g.y}"/><line x1="${g.x1}" y1="${g.y - T}" x2="${g.x1}" y2="${g.y + T}"/><line x1="${g.x2}" y1="${g.y - T}" x2="${g.x2}" y2="${g.y + T}"/>`;
    if (len >= wide) (body += label((g.x1 + g.x2) / 2, g.y - 5, 'middle')), (box = [g.x1, g.y - 16, len, 20]);
    else if (g.under) (body += `<line x1="${g.x1}" y1="${g.y + T}" x2="${g.x1}" y2="${g.under - 9}" stroke-opacity="0.6"/>` + label(g.x1, g.under)), (box = [g.x1 - 2, g.y - 6, wide, g.under - g.y + 8]);
    else (body += label(g.x1 - 5, g.y + 3.5, 'end')), (box = [g.x1 - wide - 5, g.y - 8, wide + len + 5, 16]);
  } else if (g.kind === 'v') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/><line x1="${g.x - T}" y1="${g.y1}" x2="${g.x + T}" y2="${g.y1}"/><line x1="${g.x - T}" y1="${g.y2}" x2="${g.x + T}" y2="${g.y2}"/>` + label(g.x + 6, (g.y1 + g.y2) / 2 + 3.5);
    box = [g.x - 4, g.y1, wide + 10, Math.max(16, g.y2 - g.y1)];
  } else if (g.kind === 'arc') {
    const k = 1 - Math.SQRT1_2;
    body = `<path d="M${g.x} ${g.y + g.r} A${g.r} ${g.r} 0 0 1 ${g.x + g.r} ${g.y}" stroke-width="1.5" fill="none"/><line x1="${g.x + g.r * k}" y1="${g.y + g.r * k}" x2="${g.x - 10}" y2="${g.y - 10}"/>` + label(g.x - 13, g.y - 12, 'end');
    box = [g.x - wide - 13, g.y - 22, wide + 13 + g.r, 22 + g.r];
  } else if (g.kind === 'type') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/><line x1="${g.x - 2}" y1="${g.y1}" x2="${g.x}" y2="${g.y1}"/><line x1="${g.x - 2}" y1="${g.y2}" x2="${g.x}" y2="${g.y2}"/>` + label(g.x + 4, (g.y1 + g.y2) / 2 + 3.5);
    box = [g.x - 2, g.y1, wide + 8, g.y2 - g.y1];
  } else if (g.kind === 'box') {
    body = `<rect x="${g.x + 0.5}" y="${g.y + 0.5}" width="${g.w - 1}" height="${g.h - 1}" fill="none" stroke-dasharray="4 3"/>` + label(g.x, g.y - 5);
    box = [g.x, g.y - 16, Math.max(wide, g.w), 18];
  } else {
    body = `<circle cx="${g.x}" cy="${g.y}" r="2.5" fill="${ink}"/>` + label(g.x + 6, g.y - 4);
    box = [g.x - 3, g.y - 14, wide + 10, 18];
  }
  return `<g stroke="${ink}" stroke-width="1"${dash}>${body}</g>${hit(...box)}`;
}

export class Blueprint {
  #host; #layer; #svg; #scan; #style; #active = false; #items = new Map(); #queue = []; #inflight = 0; #frame = 0; #observer = null; #dirty = 0; #onCount;

  // host: the overlay element (read(el, fresh), pin(el)); root: its shadow root; onCount(n): how many drifts are shown
  constructor(host, root, onCount) {
    this.#host = host;
    this.#onCount = onCount;
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    this.#layer.innerHTML = '<svg aria-hidden="true"></svg><i class="scan" hidden></i>';
    root.appendChild(this.#layer);
    this.#svg = this.#layer.querySelector('svg');
    this.#scan = this.#layer.querySelector('.scan');
    this.#svg.addEventListener('click', (e) => {
      const hit = e.target.closest('.hit');
      if (!hit) return;
      e.stopPropagation();
      const item = [...this.#items.values()][Number(hit.dataset.i.split(':')[0])];
      if (item) this.#host.pin(item.el);
    });
  }

  get active() {
    return this.#active;
  }

  toggle() {
    this.#active ? this.#leave() : this.#enter();
  }

  #enter() {
    this.#active = true;
    if (!this.#style) {
      this.#style = Object.assign(document.createElement('style'), { textContent: HOST_CSS });
      this.#style.dataset.plumb = 'blueprint';
      document.head.appendChild(this.#style);
    }
    // parts that are drawn (a fill, a border, a shadow) keep an outline once their fill is cleared
    for (const el of document.body.querySelectorAll('*')) if (el.localName !== 'plumb-overlay' && drawn(getComputedStyle(el))) el.setAttribute('data-plumb-drawn', '');
    this.#sweep(true, () => {});
    this.#layer.hidden = false;
    this.#discover();
    this.#observer = new MutationObserver(() => {
      clearTimeout(this.#dirty);
      this.#dirty = setTimeout(() => this.#discover(true), 300);
    });
    this.#observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    addEventListener('scroll', this.#onScroll, { passive: true, capture: true });
    addEventListener('resize', this.#onScroll);
    this.#loop();
  }

  #leave() {
    this.#active = false;
    this.#observer?.disconnect();
    removeEventListener('scroll', this.#onScroll, { capture: true });
    removeEventListener('resize', this.#onScroll);
    cancelAnimationFrame(this.#frame);
    this.#svg.innerHTML = '';
    this.#items.clear();
    this.#queue = [];
    this.#onCount?.(null);
    this.#sweep(false, () => {
      for (const el of document.querySelectorAll('[data-plumb-drawn]')) el.removeAttribute('data-plumb-drawn');
      this.#layer.hidden = true;
    });
  }

  // The scan line crosses the view; the field follows it and each element re-inks as the line reaches it. Into the
  // blueprint it runs left to right; back out, right to left, each element changing back as the line passes.
  #sweep(into, done) {
    const html = document.documentElement;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touched = [];
    if (!still)
      for (const el of document.body.querySelectorAll('*')) {
        if (el.localName === 'plumb-overlay') continue;
        const r = el.getBoundingClientRect();
        if (!visible(r)) continue;
        const at = Math.min(1, Math.max(0, (r.left + r.width / 2) / innerWidth));
        el.style.setProperty('--plumb-develop', `${Math.round((into ? at : 1 - at) * SWEEP)}ms`);
        touched.push(el);
      }
    if (!still) html.setAttribute('data-plumb-developing', '');
    html.setAttribute('data-plumb-field', '');
    html.toggleAttribute('data-plumb-blueprint', into);
    const finish = () => {
      this.#scan.hidden = true;
      html.removeAttribute('data-plumb-developing');
      html.style.removeProperty('--plumb-field-r');
      if (!into) html.removeAttribute('data-plumb-field');
      for (const el of touched) el.style.removeProperty('--plumb-develop');
      done();
    };
    if (still) return finish();
    this.#scan.hidden = false;
    this.#layer.hidden = false;
    const start = performance.now();
    const step = (now) => {
      const t = ease(Math.min(1, (now - start) / SWEEP));
      const x = into ? t : 1 - t; // where the line is, 0 at the left edge
      this.#scan.style.left = `${x * 100}%`;
      html.style.setProperty('--plumb-field-r', `${(1 - x) * 100}%`);
      if (t < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }

  #onScroll = () => {
    clearTimeout(this.#dirty);
    this.#dirty = setTimeout(() => this.#discover(), 200);
  };

  // Find the elements in view and read the ones not read yet (or changed, after a write or a reload).
  #discover(changed = false) {
    if (!this.#active) return;
    const stamped = document.querySelectorAll('[data-plumb-source]');
    const pool = stamped.length ? stamped : document.body.querySelectorAll('*');
    let n = 0;
    for (const el of pool) {
      if (n >= CAP) break;
      if (el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
      if (!visible(el.getBoundingClientRect())) continue;
      n++;
      const known = this.#items.get(el);
      const sig = el.getAttribute('class') + '|' + el.getAttribute('style')?.replace(/--plumb-develop:[^;]*;?/, '');
      if (known && known.sig === sig) continue;
      this.#items.set(el, { el, sig, marks: known?.marks ?? [] });
      this.#queue.push({ el, fresh: changed && !!known });
    }
    for (const el of this.#items.keys()) if (!el.isConnected) this.#items.delete(el);
    this.#pump();
  }

  #pump() {
    while (this.#active && this.#inflight < CONCURRENT && this.#queue.length) {
      const { el, fresh } = this.#queue.shift();
      this.#inflight++;
      this.#host
        .read(el, fresh)
        .then((state) => {
          const item = this.#items.get(el);
          if (item) item.marks = state?.status === 'ready' ? state.marks.filter((m) => m.ledger !== 'exception') : [];
        })
        .catch(() => {})
        .finally(() => {
          this.#inflight--;
          this.#pump();
        });
    }
  }

  // Draw every frame while active: geometry follows scrolling, resizing and anything that moves.
  #loop = () => {
    if (!this.#active) return;
    let out = '';
    let count = 0;
    let i = 0;
    for (const item of this.#items.values()) {
      if (item.marks.length && item.el.isConnected) {
        const r = item.el.getBoundingClientRect();
        if (visible(r))
          item.marks.forEach((m, k) => {
            out += drawMark(geometryOf(item.el, m), m, `${i}:${k}`);
            if (m.ledger === 'new') count++;
          });
      }
      i++;
    }
    if (this.#svg.innerHTML !== out) this.#svg.innerHTML = out;
    this.#onCount?.(count);
    this.#frame = requestAnimationFrame(this.#loop);
  };
}

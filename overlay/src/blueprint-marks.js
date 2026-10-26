/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MARKS · React Plumber overlay
 *
 * The page held under one dim, and every drifted element in view lifted out of it where it lives
 * (docs/briefs/blueprint-v2.md, layer 2). Colour means drift; nothing else on the sheet has any.
 *
 *  dim        one layer over the view: the page greyed (--pl-dim-filter) under a scrim (--pl-scrim). Drifted elements
 *             are cut out of it, at their own corner radius, so they show in full colour. Only the outermost drifted
 *             element cuts: a drifted child is already lit. A page-sized wrapper never cuts, or the whole view would
 *  outline    each drifted element in view, 1.5px in its ink (1px for one inside another), with no halo: it sits on
 *             the edge between the dim and the lit cut, which already sets it apart: --pl-off for drift off the system, --pl-soft
 *             when all it has is softer (a Tailwind default, the wrong tier)
 *  seen       everything is drawn from where an element can be seen, not from its box: cut to the view and to its
 *             scroll containers, with whatever the page paints over it (a drawer, a sticky header, a dialog) cut away
 *             (visibleBox). An element nothing of which shows draws nothing: no cut, outline, label or hit area
 *  label      one per drifted thing (an element at least LABEL_MIN tall: a card, a row, a column), set on its top edge
 *             like a legend, or inside its top-left corner when that edge is cut away or lies on something else: the
 *             first drift's class and +n for the rest. A drifted part (an avatar, a chip, a date) counts toward the
 *             thing that holds it and has a label of its own only while it is looked at, when nothing holds it. A label
 *             never lies on another, and never runs wider than its element. A click opens the first drift's chooser
 *  breaks     each finding drawn where it lives, in the element's ink on a halo: a dimension across a gap, padding or
 *             margin, an arc on a corner, a bracket at the words, a dot or a dashed box for the rest. Geometry comes
 *             from geometry.js (dimensionsFor), the same places the Alt card uses. Breaks are drawn only for the
 *             drifted element being pointed at (and everything drifted inside it), the one holding focus, and any
 *             break that is being chosen for or is picked: at rest the sheet shows outlines and labels, nothing
 *             more. Recorded debt is dashed and quiet (--pl-ink-3); the mark being chosen for is the accent; a
 *             picked or written one is --pl-on. Every break keeps its hit area, so Tab and a click still reach it
 *  note       pointing at a break, or reaching it with Tab, shows one note on the overlay's card surface: what is off,
 *             the tokens nearest to it, and that a click fixes it. One at a time
 *  spotlight  the panel's causes point back at the page: the outline of every element a cause touches is drawn again
 *             in the accent, over its drift ink
 *  act        every break's hit area is a button in document order: Tab reaches it, Enter or a click opens its chooser
 *  resolve    a break whose fix was written fades once the re-read drops it
 *  occlusion  a break under the chooser, the reading card or the dock is not clickable there
 *
 *  retained   one <g> per break, keyed by a stable id, redrawn only when its geometry changes
 *  measure    one batch per frame, only when invalidated (scroll, resize, a reading arriving, a fix changing state):
 *             every rect and style first, then every write
 * ───────────────────────────────────────────────────────── */
import { dimensionsFor } from './geometry.js';

const TICK = 3;
const TAG_H = 18; // a label's height: the code face's line and a pixel each side
const CH = 6.7; // px per character of the label's 11px code face, for placing labels without measuring them

export const MARKS_CSS = `
  .bp { position: fixed; inset: 0; pointer-events: none; }
  /* the dim lives at the start of the shadow root, beside the glass, so the dock, the card and the chooser stay
     above it at full colour */
  .shade { position: fixed; inset: 0; pointer-events: none; opacity: 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out); background: var(--pl-scrim); -webkit-backdrop-filter: var(--pl-dim-filter); backdrop-filter: var(--pl-dim-filter); }
  .shade[hidden] { display: none; }
  .shade[data-on] { opacity: 1; transition-duration: var(--pl-dur-dim); }
  @media (prefers-reduced-motion: reduce) { .shade { transition: none; } }
  .bp svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .bp .halo { stroke: var(--pl-halo); fill: none; }
  .bp .halo circle { fill: var(--pl-halo); }
  .bp .ink { fill: none; }
  .bp .ink circle { fill: currentColor; stroke: none; }
  .bp .k-off { color: var(--pl-off); stroke: var(--pl-off); }
  .bp .k-soft { color: var(--pl-soft); stroke: var(--pl-soft); }
  .bp .k-debt { color: var(--pl-ink-3); stroke: var(--pl-ink-3); }
  .bp .k-current { color: var(--pl-accent); stroke: var(--pl-accent); }
  .bp .k-picked { color: var(--pl-on); stroke: var(--pl-on); }
  .bp .outlines rect { stroke-width: 1.5px; }
  .bp .outlines rect.inner { stroke-width: 1px; }
  .bp .light rect { fill: none; stroke: var(--pl-accent); stroke-width: 2px; }
  .bp svg.under { pointer-events: none; }
  .bp .labels { position: absolute; inset: 0; }
  .bp svg[role="group"] { pointer-events: none; }
  .bp .lbl { position: absolute; display: flex; align-items: center; gap: var(--pl-space-2); height: ${TAG_H}px; padding: 0 var(--pl-space-3); box-sizing: border-box;
    border-radius: var(--pl-radius-tag); font: 500 11px/1 var(--pl-mono); white-space: nowrap; pointer-events: auto; cursor: pointer;
    color: var(--pl-on-accent); background: var(--pl-off); box-shadow: 0 0 0 1px var(--pl-halo); }
  .bp .lbl.k-soft { background: var(--pl-soft); }
  .bp .lbl.k-picked { background: var(--pl-on); }
  .bp .lbl .more { opacity: 0.8; }
  .bp .lbl[data-under] { pointer-events: none; }
  .bp .bp-hint { position: fixed; max-width: 280px; padding: var(--pl-space-4) var(--pl-space-5); box-sizing: border-box; pointer-events: none; z-index: 1;
    font: var(--pl-card-meta); color: var(--pl-ink); background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card);
    opacity: 0; transition: opacity var(--pl-dur-feedback) ease-out; }
  .bp .bp-hint[data-on] { opacity: 1; }
  .bp .bp-hint .near { color: var(--pl-ink-2); display: block; }
  .bp .bp-hint .act { color: var(--pl-accent); display: block; font: var(--pl-text-label); margin-top: var(--pl-space-1); }
  .bp .hit { pointer-events: auto; cursor: pointer; fill: transparent; outline: none; }
  .bp .hit:focus-visible { stroke: var(--pl-accent); stroke-width: 2px; }
  .bp .hit[data-under] { pointer-events: none; }
  .bp g.break { transition: opacity var(--pl-dur-feedback) ease-out; opacity: 0; }
  .bp g.break[data-show] { opacity: 1; }
  .bp g.break.gone { opacity: 0; transition-duration: 240ms; }
  @media (prefers-reduced-motion: reduce) { .bp g.break, .bp .bp-hint { transition: none; } }
`;

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SHORT = { 'border-radius': 'r', 'font-size': 'text', 'line-height': 'leading', 'letter-spacing': 'tracking', 'padding-left': 'pl', 'padding-right': 'pr', 'padding-top': 'pt', 'padding-bottom': 'pb', 'padding-inline': 'px', 'padding-block': 'py', 'column-gap': 'gap', 'row-gap': 'gap-y', 'background-color': 'bg', 'border-color': 'border', 'box-shadow': 'shadow', 'z-index': 'z' };

export function labelOf(mark, fix) {
  const prop = mark.props[0];
  const base = !prop ? mark.rule.split('/').pop() : `${/radius/.test(prop) ? 'r' : (SHORT[prop] ?? prop)} ${mark.n !== undefined ? Math.round(mark.n * 10) / 10 : String(mark.value ?? '').slice(0, 18)}`;
  return fix?.to ? `${base} → ${fix.to}` : base;
}

// Drift that counts: new, and something a person can act on here.
const counts = (mark) => mark.ledger === 'new' && !/opaque-inline|^config\//.test(mark.rule);
// Softer drift: a Tailwind default, the wrong tier, a value that matches a token without using it.
const soft = (mark) => /framework|tier|by-value|matches/.test(mark.rule);
const inkOf = (mark, fix) => fix?.kind === 'picked' || fix?.kind === 'written' ? 'picked' : fix?.kind === 'current' ? 'current' : mark.ledger !== 'new' ? 'debt' : soft(mark) ? 'soft' : 'off';

// What a break says when asked: its finding in words, the tokens nearest to it, and what a click does.
function hintOf(mark, fix) {
  const title = String(mark.title ?? '').replace(/`/g, '');
  const near = (mark.choices ?? []).slice(0, 3).map((c) => `${c.label}${c.n !== undefined ? ` ${Math.round(c.n * 10) / 10}` : ''}`).join(' · ');
  const act = fix?.kind === 'picked' ? `picked ${fix.to} · click to change` : fix?.kind === 'current' ? 'choosing…' : near ? 'click to fix' : 'click to accept or add a token';
  return `${esc(title)}<span class="near">${near ? `nearest ${esc(near)}` : 'no token is close'}</span><span class="act">${esc(act)}</span>`;
}

// A break and its hit box, as markup and a rect, from its geometry: drawn twice, a halo under the ink, so it reads on
// any page.
function draw(g, mark, fix = null) {
  const ink = inkOf(mark, fix);
  const w = ink === 'debt' ? 1 : 2;
  const ticks = (pts) => pts.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('');
  let body = '';
  let box;
  if (g.kind === 'h') {
    body = `<line x1="${g.x1}" y1="${g.y}" x2="${g.x2}" y2="${g.y}"/>` + ticks([[g.x1, g.y - TICK, g.x1, g.y + TICK], [g.x2, g.y - TICK, g.x2, g.y + TICK]]);
    box = [g.x1, g.y - 7, Math.max(4, g.x2 - g.x1), 14];
  } else if (g.kind === 'v') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/>` + ticks([[g.x - TICK, g.y1, g.x + TICK, g.y1], [g.x - TICK, g.y2, g.x + TICK, g.y2]]);
    box = [g.x - 7, g.y1, 14, Math.max(4, g.y2 - g.y1)];
  } else if (g.kind === 'arc') {
    const { cx, cy, dx, dy, rad } = g;
    const sweep = dx * dy > 0 ? 1 : 0;
    body = `<path d="M${cx} ${cy + dy * rad} A${rad} ${rad} 0 0 ${sweep} ${cx + dx * rad} ${cy}"/>`;
    box = [Math.min(cx, cx + dx * rad) - 3, Math.min(cy, cy + dy * rad) - 3, rad + 6, rad + 6];
  } else if (g.kind === 'type') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/>` + ticks([[g.x - 3, g.y1, g.x, g.y1], [g.x - 3, g.y2, g.x, g.y2]]);
    box = [g.x - 4, g.y1, 10, Math.max(14, g.y2 - g.y1)];
  } else if (g.kind === 'box') {
    body = `<rect x="${g.x + 0.5}" y="${g.y + 0.5}" width="${Math.max(0, g.w - 1)}" height="${Math.max(0, g.h - 1)}" stroke-dasharray="4 3"/>`;
    box = [g.x, g.y, Math.max(14, g.w), Math.min(Math.max(14, g.h), 24)];
  } else {
    body = `<circle cx="${g.x}" cy="${g.y}" r="3"/>`;
    box = [g.x - 7, g.y - 7, 14, 14];
  }
  const dash = ink === 'debt' ? ' stroke-dasharray="3 3"' : '';
  return { markup: `<g class="halo" stroke-width="${w + 2}" aria-hidden="true">${body}</g><g class="ink k-${ink}" stroke-width="${w}"${dash} aria-hidden="true">${body}</g>`, box };
}

// A rounded rectangle as a path, for a cut in the dim.
function roundRect(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const f = (n) => Math.round(n * 10) / 10;
  if (!r) return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}
// Where an element can actually be seen: its box, cut to the view and to every scroll container around it, then with
// whatever the page paints over it cut away. The page is sampled at five points; at a point where something else is on
// top (a drawer, a sticky header, a dialog), the branch of the page that covers it is found, and when it spans a whole
// side of the box that side is pulled in past it. Null when nothing of the element shows. Reads only; rects and
// styles are memoised for the frame.
const LABEL_MIN = 32; // an element shorter than this is a part (an avatar, a chip, a date) and its drift counts toward what holds it
function visibleBox(el, r, view, memo) {
  const rect = (e) => { let v = memo.rects.get(e); if (!v) memo.rects.set(e, (v = e.getBoundingClientRect())); return v; };
  const style = (e) => { let v = memo.styles.get(e); if (!v) memo.styles.set(e, (v = getComputedStyle(e))); return v; };
  const b = { left: Math.max(r.left, 0), top: Math.max(r.top, 0), right: Math.min(r.right, view.w), bottom: Math.min(r.bottom, view.h) };
  for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    const s = style(a);
    const x = s.overflowX !== 'visible', y = s.overflowY !== 'visible';
    if (x || y) {
      const ar = rect(a);
      if (x) (b.left = Math.max(b.left, ar.left)), (b.right = Math.min(b.right, ar.right));
      if (y) (b.top = Math.max(b.top, ar.top)), (b.bottom = Math.min(b.bottom, ar.bottom));
    }
    if (s.position === 'fixed') break;
  }
  if (b.right - b.left < 2 || b.bottom - b.top < 2) return null;
  let seen = false;
  for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) {
    if (b.right - b.left < 2 || b.bottom - b.top < 2) return null;
    const px = b.left + (b.right - b.left) * fx, py = b.top + (b.bottom - b.top) * fy;
    const hit = document.elementsFromPoint(px, py).find((e) => !e.closest('plumb-overlay'));
    if (!hit || el.contains(hit) || hit.contains(el)) { seen = true; continue; }
    let cover = hit;
    while (cover.parentElement && !cover.parentElement.contains(el)) cover = cover.parentElement;
    const c = rect(cover);
    const spansY = c.top <= b.top + 1 && c.bottom >= b.bottom - 1, spansX = c.left <= b.left + 1 && c.right >= b.right - 1;
    if (spansY && c.left <= b.left + 1 && c.right < b.right) b.left = c.right;
    else if (spansY && c.right >= b.right - 1 && c.left > b.left) b.right = c.left;
    else if (spansX && c.top <= b.top + 1 && c.bottom < b.bottom) b.top = c.bottom;
    else if (spansX && c.bottom >= b.bottom - 1 && c.top > b.top) b.bottom = c.top;
    else if (spansX && spansY) return null;
  }
  if (!seen || b.right - b.left < 2 || b.bottom - b.top < 2) return null;
  return { ...b, width: b.right - b.left, height: b.bottom - b.top, clipped: b.top > r.top + 0.5 || b.left > r.left + 0.5 || b.right < r.right - 0.5 || b.bottom < r.bottom - 0.5, topCut: b.top > r.top + 0.5 };
}

// A label says which class, not all of it: a long arbitrary value is cut with an ellipsis (the note and the chooser
// carry the rest).
const LABEL_CHARS = 20;
const short = (text) => (text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS - 1)}…` : text);

const within = (a, b) => a.left >= b.left - 1 && a.top >= b.top - 1 && a.right <= b.right + 1 && a.bottom <= b.bottom + 1;

export class MarkLayer {
  #dim; #dimPath = ''; #svg; #anchor; #outlines; #outlineMarkup = ''; #labels; #labelMarkup = ''; #hint; #hinted = null; #light; #lit = []; #lightMarkup = ''; #nodes = new Map(); #items = []; #pointed = null; #focused = null; #order = []; #orderKey = ''; #scheduled = 0; #onPick; #occluders; #state; #onOrder;

  // onPick(element, mark, id) opens the chooser; occluders() → rects that marks must not sit under;
  // state(element, mark) → null | { kind: 'current' | 'picked' | 'written', to } says how the mark is drawn;
  // onOrder() is told when the set of drawn marks changes (the punch list follows it)
  constructor(layer, { onPick, occluders, state, onOrder }) {
    // paint order: the dim under everything the overlay draws; in the layer, the labels, then the outlines and
    // breaks (so a break's hit area wins over a label lying across it, the way the smaller target wins a click),
    // then the note
    this.#dim = Object.assign(document.createElement('div'), { className: 'shade', hidden: true });
    this.#dim.setAttribute('aria-hidden', 'true');
    layer.getRootNode().prepend(this.#dim);
    // the outlines and the spotlight sit under the labels, so no line runs through a label's words
    const under = document.createElementNS(NS, 'svg');
    under.setAttribute('class', 'under');
    under.setAttribute('aria-hidden', 'true');
    this.#outlines = document.createElementNS(NS, 'g');
    this.#outlines.setAttribute('class', 'outlines');
    under.appendChild(this.#outlines);
    this.#light = document.createElementNS(NS, 'g');
    this.#light.setAttribute('class', 'light');
    under.appendChild(this.#light);
    this.#svg = document.createElementNS(NS, 'svg');
    this.#svg.setAttribute('role', 'group');
    this.#svg.setAttribute('aria-label', 'Drift on this view');
    // the breaks' anchor: they are inserted after it, in document order
    this.#anchor = document.createElementNS(NS, 'g');
    this.#svg.appendChild(this.#anchor);
    this.#labels = Object.assign(document.createElement('div'), { className: 'labels' });
    this.#labels.setAttribute('aria-hidden', 'true'); // the breaks are the buttons; a label is a shortcut for the pointer
    layer.prepend(under, this.#labels, this.#svg);
    this.#onPick = onPick;
    this.#occluders = occluders;
    this.#state = state;
    this.#onOrder = onOrder;
    // Where hit boxes overlap (a long break over a short one), a click goes to the smallest box under the pointer: the
    // one the eye aimed at. Enter goes to the focused box.
    const pick = (e) => {
      let hit = e.target.closest?.('.hit');
      if (!hit) return;
      if (e.type === 'click' && Number.isFinite(e.clientX)) {
        let best = null, area = Infinity;
        for (const node of this.#nodes.values()) {
          if (node.hit.hasAttribute('data-under')) continue;
          const r = node.hit.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
          if (r.width * r.height < area) (area = r.width * r.height), (best = node.hit);
        }
        hit = best ?? hit;
      }
      this.#open(hit.dataset.id, e);
    };
    this.#svg.addEventListener('click', (e) => { this.#showHint(null); pick(e); });
    this.#svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.#showHint(null), pick(e); });
    // a label opens its element's first drift
    this.#labels.addEventListener('click', (e) => { const lbl = e.target.closest?.('.lbl'); if (lbl) this.#open(lbl.dataset.id, e); });
    // the note: on the break under the pointer, or the one that has focus
    this.#hint = document.createElement('div');
    this.#hint.className = 'bp-hint';
    this.#hint.setAttribute('role', 'tooltip');
    layer.append(this.#hint);
    const over = (e) => { const hit = e.target.closest?.('.hit'); if (hit) this.#showHint(hit.dataset.id); };
    this.#svg.addEventListener('pointerover', over);
    this.#svg.addEventListener('pointerout', (e) => { if (e.target.closest?.('.hit') && !e.relatedTarget?.closest?.('.hit')) this.#showHint(null); });
    this.#svg.addEventListener('focusin', (e) => { over(e); const node = this.#nodes.get(e.target.closest?.('.hit')?.dataset.id); this.#focused = node?.el ?? null; this.invalidate(); });
    this.#svg.addEventListener('focusout', () => { this.#showHint(null); this.#focused = null; this.invalidate(); });
  }

  // The dim goes on (shown, then faded in with on) and off with the mode.
  dim(state) {
    this.#dim.hidden = state === 'off';
    this.#dim.toggleAttribute('data-on', state === 'on');
  }

  #open(id, e) {
    const node = this.#nodes.get(id);
    if (!node) return;
    e.preventDefault();
    e.stopPropagation();
    this.#onPick(node.el, node.mark, id);
  }

  // items: [{ id, el, marks, dims, file }] in document order. Nodes are kept for marks that persist and made for new ones.
  set(items) {
    this.#items = items;
    const want = new Set();
    for (const item of items) item.marks.forEach((m, k) => want.add(`${item.id}:${k}:${m.key}`));
    for (const [id, node] of this.#nodes) if (!want.has(id)) this.#drop(id, node);
    this.invalidate();
  }

  // One note at a time, beside the break: to its right, else to its left, else under it; never off the view.
  #showHint(id) {
    const node = id ? this.#nodes.get(id) : null;
    this.#hinted = node ? id : null;
    if (!node) { this.#hint.removeAttribute('data-on'); return; }
    this.#hint.innerHTML = hintOf(node.mark, node.fix);
    const r = node.hit.getBoundingClientRect(), w = this.#hint.offsetWidth || 200, h = this.#hint.offsetHeight || 48;
    let x = r.right + 8, y = r.top + r.height / 2 - h / 2;
    if (x + w > innerWidth - 8) x = r.left - 8 - w;
    if (x < 8) (x = Math.max(8, Math.min(innerWidth - w - 8, r.left))), (y = r.bottom + 8);
    y = Math.max(8, Math.min(innerHeight - h - 8, y));
    this.#hint.style.left = `${x}px`;
    this.#hint.style.top = `${y}px`;
    this.#hint.setAttribute('data-on', '');
  }

  // The page element under the pointer (looked for through the glass): its drifted region shows its breaks.
  point(el) {
    if (el === this.#pointed) return;
    this.#pointed = el;
    this.invalidate();
  }

  // Elements a cause touches, outlined while the cause is pointed at.
  spotlight(elements) {
    this.#lit = elements ?? [];
    this.invalidate();
  }

  // Marks in document order, as last drawn: [{ id, el, mark, file }].
  order() {
    return this.#order;
  }
  boxOf(id) {
    const node = this.#nodes.get(id);
    if (!node || !node.hit.isConnected) return null;
    return node.hit.getBoundingClientRect();
  }
  idOf(el, mark) {
    for (const [id, node] of this.#nodes) if (node.el === el && node.mark?.key === mark.key) return id;
    return null;
  }
  focus(id) {
    this.#nodes.get(id)?.hit.focus({ preventScroll: true });
  }

  // A written mark resolves: it fades before its group leaves; anything else leaves at once.
  #drop(id, node) {
    if (this.#hinted === id) this.#showHint(null);
    this.#nodes.delete(id);
    node.hit.remove();
    if (node.fix?.kind === 'written') {
      node.g.classList.add('gone');
      setTimeout(() => node.g.remove(), 260);
    } else node.g.remove();
  }

  clear() {
    this.#items = [];
    for (const node of this.#nodes.values()) node.g.remove(), node.hit.remove();
    this.#nodes.clear();
    this.#outlines.innerHTML = '';
    this.#outlineMarkup = '';
    this.#labels.innerHTML = '';
    this.#labelMarkup = '';
    this.#dim.style.removeProperty('clip-path');
    this.#dimPath = '';
    this.#lit = [];
    this.#pointed = this.#focused = null;
    this.#light.innerHTML = '';
    this.#lightMarkup = '';
    this.#showHint(null);
    this.#order = [];
  }

  invalidate() {
    if (this.#scheduled) return;
    this.#scheduled = requestAnimationFrame(() => {
      this.#scheduled = 0;
      this.#render();
    });
  }

  // One frame: every measurement first, then every write.
  #render() {
    const t0 = performance.now();
    try { this.#frame(); } finally { performance.measure('plumb:marks', { start: t0 }); }
  }
  #frame() {
    const view = { w: innerWidth, h: innerHeight };
    const tOcc = performance.now();
    const under = this.#occluders?.() ?? [];
    performance.measure('plumb:marks-occluders', { start: tOcc });
    const tRead = performance.now();
    // READS. Every rect, geometry and style the frame needs is measured here, before a single write, so the
    // page's layout is computed once per frame however many marks there are.
    const plan = [], lifted = [];
    const memo = { rects: new Map(), styles: new Map() };
    const tVis = performance.now();
    for (const item of this.#items) {
      if (!item.el.isConnected) continue;
      const r = item.el.getBoundingClientRect();
      // in view, and visible: an element with visibility hidden has a box and is read, but there is nothing to see
      const painted = item.el.checkVisibility ? item.el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }) : getComputedStyle(item.el).visibility !== 'hidden';
      const near = r.bottom > 0 && r.top < view.h && r.right > 0 && r.left < view.w && r.width > 0 && r.height > 0 && painted;
      // seen: what of it shows past its scroll containers and whatever the page paints over it. A covered element
      // draws nothing, not even a hit area, so a click on the drawer over it never opens its chooser
      const box = near && item.marks.length ? visibleBox(item.el, r, view, memo) : null;
      item.marks.forEach((mark, k) => plan.push({ id: `${item.id}:${k}:${mark.key}`, item, mark, g: box ? dimensionsFor(item.el, mark.props) : null }));
      const drift = item.marks.filter(counts);
      if (box && drift.length) lifted.push({ item, r: box, drift, radius: box.clipped ? 0 : parseFloat(getComputedStyle(item.el).borderTopLeftRadius) || 0 });
    }
    performance.measure('plumb:marks-visible', { start: tVis });
    const litSet = new Set(this.#lit);
    performance.measure('plumb:marks-read', { start: tRead });
    // regions: the outermost drifted elements, largest first; each holds the drifted elements inside it
    const regions = [];
    for (const l of [...lifted].sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)) {
      const host = regions.find((g) => g.top.item.el.contains(l.item.el) && within(l.r, g.top.r));
      if (host) host.inner.push(l); else regions.push({ top: l, inner: [] });
    }
    // labels: every drifted element tall enough to be a thing (a card, a row, a column) carries one; a part (an
    // avatar, a chip, a date) counts toward the nearest labelled thing that holds it, and carries its own label only
    // while it is being looked at, when nothing holds it
    const things = lifted.filter((l) => l.r.height >= LABEL_MIN);
    const tally = new Map(things.map((l) => [l, l.drift.length - 1]));
    const loose = [];
    for (const l of lifted) {
      if (tally.has(l)) continue;
      let holder = null;
      for (const t of things) if (t.item.el.contains(l.item.el) && (!holder || holder.item.el.contains(t.item.el))) holder = t;
      if (holder) tally.set(holder, tally.get(holder) + l.drift.length); else loose.push(l);
    }
    // the region being looked at: the one holding the pointed or focused element
    const looking = [this.#focused, this.#pointed].filter(Boolean);
    const active = new Set();
    for (const g of regions) if (looking.some((el) => g.top.item.el.contains(el))) { active.add(g.top.item.el); for (const l of g.inner) active.add(l.item.el); }
    // WRITES, from here on.
    const tWrite = performance.now();
    let after = null; // keeps hit rects in document order for Tab
    const order = [];
    for (const { id, item, mark, g } of plan) {
      let node = this.#nodes.get(id);
      if (!g) {
        if (node) this.#drop(id, node);
        continue;
      }
      const fix = this.#state?.(item.el, mark) ?? null;
      const { markup, box } = draw(g, mark, fix);
      if (!node) {
        const group = document.createElementNS(NS, 'g');
        group.setAttribute('class', 'break');
        const hit = document.createElementNS(NS, 'rect');
        hit.setAttribute('class', 'hit');
        hit.setAttribute('tabindex', '0');
        hit.setAttribute('role', 'button');
        hit.dataset.id = id;
        node = { g: group, hit, el: item.el, mark, fix: null, markup: '' };
        this.#nodes.set(id, node);
      }
      node.mark = mark;
      node.fix = fix;
      if (node.markup !== markup) (node.g.innerHTML = markup), (node.markup = markup);
      node.g.toggleAttribute('data-show', active.has(item.el) || !!fix);
      node.hit.setAttribute('aria-label', `${mark.ledger === 'new' ? 'Drift' : 'Recorded'}: ${mark.title}.${fix?.to ? ` Picked ${fix.to}.` : ''} Choose a token.`);
      node.hit.toggleAttribute('aria-current', fix?.kind === 'current');
      order.push({ id, el: item.el, mark, file: item.file ?? null });
      const [x, y, w, h] = box;
      node.hit.setAttribute('x', x);
      node.hit.setAttribute('y', y);
      node.hit.setAttribute('width', Math.max(14, w));
      node.hit.setAttribute('height', Math.max(14, h));
      node.hit.toggleAttribute('data-under', under.some((o) => x < o.right && o.left < x + w && y < o.bottom && o.top < y + h));
      // document order: each pair follows the previous one, after the outlines
      const anchor = after ? after.nextSibling : this.#anchor.nextSibling;
      if (node.g !== anchor) this.#svg.insertBefore(node.g, anchor);
      if (node.hit !== node.g.nextSibling) this.#svg.insertBefore(node.hit, node.g.nextSibling);
      after = node.hit;
    }
    performance.measure('plumb:marks-write-marks', { start: tWrite });
    const tRest = performance.now();
    // the cuts: each region's outermost element, never one the size of the page
    const cuts = regions.map((g) => g.top).filter((l) => l.r.width * l.r.height < view.w * view.h * 0.6);
    const path = cuts.length ? `path(evenodd, "M0 0H${view.w}V${view.h}H0Z ${cuts.map(({ r, radius }) => roundRect(r.left, r.top, r.width, r.height, radius)).join(' ')}")` : '';
    if (path !== this.#dimPath) { if (path) this.#dim.style.setProperty('clip-path', path); else this.#dim.style.removeProperty('clip-path'); this.#dimPath = path; }
    // the outlines, every drifted element; the labels, one per region on its top edge
    let outlines = '', labels = '';
    const taken = [];
    const free = (x, y, w) => !taken.some(([a, b, c]) => x < a + c + 4 && a < x + w + 4 && y < b + TAG_H && b < y + TAG_H);
    const inkFor = (l) => { const fix = this.#state?.(l.item.el, l.drift[0]) ?? null; return inkOf(l.drift[0], fix) === 'picked' ? 'picked' : l.drift.every(soft) ? 'soft' : 'off'; };
    for (const { top, inner } of regions) {
      for (const l of [top, ...inner]) {
        const { r, radius } = l;
        const rx = Math.min(radius, r.width / 2, r.height / 2).toFixed(1);
        const rect = `x="${(r.left + 0.75).toFixed(1)}" y="${(r.top + 0.75).toFixed(1)}" width="${Math.max(0, r.width - 1.5).toFixed(1)}" height="${Math.max(0, r.height - 1.5).toFixed(1)}" rx="${rx}"`;
        const cls = l === top ? '' : 'inner ';
        outlines += `<rect class="${cls}ink k-${inkFor(l)}" ${rect}/>`;
      }
    }
    // a label's place: on the element's top edge like a legend, unless that edge is cut away or what is above it is
    // something else (another card, a header): then inside its top-left corner. Never on another label: it moves along
    // the edge, else it is not drawn
    const related = (el, x, y) => { const hit = document.elementsFromPoint(x, y).find((e) => !e.closest('plumb-overlay')); return !hit || el.contains(hit) || hit.contains(el); };
    const labelled = [...things.map((l) => [l, tally.get(l)]), ...loose.filter((l) => active.has(l.item.el)).map((l) => [l, l.drift.length - 1])];
    for (const [l, more] of labelled) {
      const { item, r, drift } = l;
      const first = drift[0];
      const fix = this.#state?.(item.el, first) ?? null;
      const ink = inkFor(l);
      const text = short(fix?.to ? `${first.text ?? labelOf(first)} → ${fix.to}` : (first.text ?? labelOf(first)));
      const w = (text.length + (more ? String(more).length + 1 : 0)) * CH + 12 + (more ? 4 : 0);
      if (w > r.width + 40) continue; // a label wider than its element would cover its neighbours
      const x0 = Math.max(2, Math.min(view.w - w - 2, r.left + Math.max(6, Math.min(12, l.radius))));
      const legend = !r.topCut && r.top - TAG_H / 2 >= 2 && related(item.el, x0 + w / 2, r.top - TAG_H / 2 + 2);
      let x = x0, y = legend ? r.top - TAG_H / 2 : r.top + 3;
      for (let step = 0; step < 4 && !free(x, y, w); step++) x += w + 6;
      if (!free(x, y, w) || x + w > r.right + 2) continue;
      taken.push([x, y, w]);
      const id = `${item.id}:${item.marks.indexOf(first)}:${first.key}`;
      const hidden = under.some((o) => x < o.right && o.left < x + w && y < o.bottom && o.top < y + TAG_H);
      labels += `<span class="lbl k-${ink}" data-id="${esc(id)}"${hidden ? ' data-under' : ''} style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">${esc(text)}${more ? `<span class="more">+${more}</span>` : ''}</span>`;
    }
    if (outlines !== this.#outlineMarkup) (this.#outlines.innerHTML = outlines), (this.#outlineMarkup = outlines);
    if (labels !== this.#labelMarkup) (this.#labels.innerHTML = labels), (this.#labelMarkup = labels);
    // the spotlight: a lit element's outline, drawn again in the accent over its drift ink (one line, not two)
    let light = '';
    for (const l of lifted) {
      if (!litSet.has(l.item.el)) continue;
      const { r, radius } = l;
      light += `<rect x="${(r.left + 0.75).toFixed(1)}" y="${(r.top + 0.75).toFixed(1)}" width="${Math.max(0, r.width - 1.5).toFixed(1)}" height="${Math.max(0, r.height - 1.5).toFixed(1)}" rx="${Math.min(radius, r.width / 2, r.height / 2).toFixed(1)}"/>`;
    }
    if (light !== this.#lightMarkup) (this.#light.innerHTML = light), (this.#lightMarkup = light);
    performance.measure('plumb:marks-write-rest', { start: tRest });
    this.#order = order;
    const key = order.map((o) => o.id).join(',');
    const tOrder = performance.now();
    if (key !== this.#orderKey) (this.#orderKey = key), this.#onOrder?.();
    performance.measure('plumb:marks-order', { start: tOrder });
  }
}

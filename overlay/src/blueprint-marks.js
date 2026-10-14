/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MARKS · Plumb overlay
 *
 * Draws each finding where it lives, as a break in the drawing: a dimension across a gap, padding or margin, an arc
 * on a corner, a bracket at the words, a dot or a dashed box for the rest. No words at rest: the break's shape says
 * what kind of thing is off, and one badge per element counts its breaks. Geometry comes from geometry.js
 * (dimensionsFor, built on regionFor), the same places the Alt card uses. What a break says in words is the
 * chooser's job, on click or Enter.
 *
 *  ghost      beside each numeric break, the nearest token drawn once more in mint, dashed: the corner at the token's
 *             radius, the bracket at the token's width, the text bracket at the token's size. The eye compares 14
 *             against 12 in place; no number is written. A break with no numeric token near it has no ghost
 *  wash       each element with drift is tinted red by how far it sits from the system, in three stops, under the bars
 *             and the breaks: a numeric drift counts by its distance as a fraction of the nearest token, a raw colour
 *             or hand-written shadow as a full step, a Tailwind default as half, an info note as nothing. Pointing at
 *             an element lifts its wash and its ancestors', so the breaks there read clean
 *
 *  retained   one <g> per mark, keyed by a stable id; a mark is redrawn only when its geometry changes
 *  measure    one batch per frame, only when invalidated (scroll, resize, a reading arriving, the reader's changes)
 *  ink        new drift in amber, heavier, with solid ticks; recorded debt in dashed white; exceptions never drawn;
 *             the mark being chosen for is white; a picked mark is mint and its label says what it becomes
 *  structure  a gap on the system is a quiet dimension in faint white named by its token (s3), drawn after every mark
 *             and left out where a mark's label already sits. Dimensions are not buttons; there is nothing to do
 *  tag        pointing at a break, or reaching it with Tab, shows one note in plain words beside it: what is off, the
 *             tokens nearest to it, and that a click fixes it. One at a time; it goes when the pointer leaves, the
 *             focus moves, or the chooser opens
 *  rails      the rhythm, read off the margins: every vertical gap in view is a tick pair on a rail at the left
 *             edge, every horizontal one on a rail along the top, named by its token in white or, off the scale, by
 *             its number in amber. The same gap in several rows is one tick. A glance down the rail says whether
 *             the page keeps one rhythm
 *  spotlight  the sheet's causes point back at the page: the elements a cause touches get an amber outline while
 *             it is pointed at
 *  act        every mark's hit area is a button in document order: Tab reaches it, Enter or a click opens its chooser
 *  resolve    a mark whose fix was written leaves with a short fade once the re-read drops it
 *  occlusion  a mark under the chooser, the reading card or the dock is not clickable there
 * ───────────────────────────────────────────────────────── */
import { dimensionsFor } from './geometry.js';

const INK = { drift: '#ffb347', debt: 'rgb(255 255 255 / 0.7)', current: '#ffffff', picked: '#a8f0c6', on: 'rgb(255 255 255 / 0.55)' };
const TICK = 3;
const CH = 6.6; // px per character of the 11px label

export const MARKS_CSS = `
  .bp .rails line { stroke: rgb(255 255 255 / 0.45); }
  .bp .rails .rail { stroke: rgb(255 255 255 / 0.3); }
  .bp .rails .off line { stroke: #ffb347; stroke-width: 1.5; }
  .bp .rails text { fill: rgb(255 255 255 / 0.75); font-size: 10px; }
  .bp .rails .off text { fill: #ffb347; }
  .bp .light rect { fill: none; stroke: #ffb347; stroke-width: 1.5; }
  .bp .bp-hint { position: fixed; max-width: 280px; padding: 6px 9px 7px; box-sizing: border-box; pointer-events: none; z-index: 1;
    font: 500 11px/15px var(--pl-mono); color: #fff; background: rgb(15 36 102 / 0.96); border: 1px solid #ffb347; border-radius: 3px;
    opacity: 0; transition: opacity 120ms ease-out; }
  .bp .bp-hint[data-on] { opacity: 1; }
  .bp .bp-hint .near { color: rgb(255 255 255 / 0.72); display: block; }
  .bp .bp-hint .act { color: #ffb347; display: block; }
  @media (prefers-reduced-motion: reduce) { .bp .bp-hint { transition: none; } }
  .bp svg.wash { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
  .bp svg.wash rect { fill: #ff4a5c; transition: fill-opacity 160ms ease-out; } /* a red tint, not the marks' amber: heat is not a mark */
  @media (prefers-reduced-motion: reduce) { .bp svg.wash rect { transition: none; } }
  .bp .badge text { stroke: none; fill: #1f3fa6; font: 600 10px/1 var(--pl-mono); }
  .bp { position: fixed; inset: 0; pointer-events: none; }
  .bp svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .bp text { font: 500 11px/1 var(--pl-mono); paint-order: stroke; stroke: rgb(31 63 166 / 0.72); stroke-width: 3px; stroke-linejoin: round; } /* a halo that sits on the wash without boxing it */
  .bp .hit { pointer-events: auto; cursor: pointer; fill: transparent; outline: none; }
  .bp .hit:focus-visible { stroke: #fff; stroke-width: 2px; }
  .bp .hit[data-under] { pointer-events: none; }
  .bp g { transition: opacity 240ms ease-out; }
  .bp g.gone { opacity: 0; }
  .bp g.dimension { animation: bp-dimension-in 240ms ease-out both; }
  @keyframes bp-dimension-in { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .bp g { transition: none; } .bp g.dimension { animation: none; } }
  .bp .scan { position: fixed; inset-block: 0; width: 1px; background: #fff; box-shadow: 0 0 24px 4px rgb(255 255 255 / 0.6); }
`;

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SHORT = { 'border-radius': 'r', 'font-size': 'text', 'line-height': 'leading', 'letter-spacing': 'tracking', 'padding-left': 'pl', 'padding-right': 'pr', 'padding-top': 'pt', 'padding-bottom': 'pb', 'padding-inline': 'px', 'padding-block': 'py', 'column-gap': 'gap', 'row-gap': 'gap-y', 'background-color': 'bg', 'border-color': 'border', 'box-shadow': 'shadow', 'z-index': 'z' };

export function labelOf(mark, fix) {
  const prop = mark.props[0];
  const base = !prop ? mark.rule.split('/').pop() : `${/radius/.test(prop) ? 'r' : (SHORT[prop] ?? prop)} ${mark.n !== undefined ? Math.round(mark.n * 10) / 10 : String(mark.value ?? '').slice(0, 18)}`;
  return fix?.to ? `${base} → ${fix.to}` : base;
}

// The nearest token's size for a numeric mark, in the same unit as the mark, else undefined.
const px = (value) => /^-?[\d.]+(px)?$/.test(String(value ?? '').trim());
function ghostOf(mark) {
  if (mark.n === undefined || !px(mark.value)) return undefined;
  const fit = (mark.choices ?? []).filter((c) => c.n !== undefined && px(c.value));
  if (!fit.length) return undefined;
  const chosen = mark.pick !== null && mark.pick !== undefined ? fit[mark.pick] : fit.reduce((best, c) => (Math.abs(c.n - mark.n) < Math.abs(best.n - mark.n) ? c : best));
  return chosen && chosen.n !== mark.n ? chosen.n : undefined;
}

// How far an element's drift sits from the system, summed over its new marks, as one of three stops of wash.
const STOPS = [[0.5, 0.12], [1.5, 0.26], [Infinity, 0.42]];
function warmth(marks) {
  let sum = 0;
  for (const mark of marks) {
    if (mark.ledger !== 'new' || /opaque-inline|^config\//.test(mark.rule)) continue;
    if (/framework/.test(mark.rule)) { sum += 0.5; continue; }
    if (/by-value|matches/.test(mark.rule)) { sum += 0.25; continue; }
    const ghost = ghostOf(mark);
    sum += mark.n !== undefined && ghost ? Math.min(1, Math.abs(mark.n - ghost) / ghost) : 1;
  }
  return sum ? STOPS.find(([limit]) => sum <= limit)[1] : 0;
}

// What a break says when asked: its finding in words, the tokens nearest to it, and what a click does.
function hintOf(mark, fix) {
  const title = String(mark.title ?? '').replace(/`/g, '');
  const near = (mark.choices ?? []).slice(0, 3).map((c) => `${c.label}${c.n !== undefined ? ` ${Math.round(c.n * 10) / 10}` : ''}`).join(' · ');
  const act = fix?.kind === 'picked' ? `picked ${fix.to} · click to change` : fix?.kind === 'current' ? 'choosing…' : near ? 'click to fix' : 'click to accept or add a token';
  return `${esc(title)}<span class="near">${near ? `nearest ${esc(near)}` : 'no token is close'}</span><span class="act">${esc(act)}</span>`;
}

// A mark's break and its hit box, as markup and a rect, from its geometry. No label: the shape is the message.
function draw(g, mark, fix = null) {
  const ink = fix?.kind === 'picked' || fix?.kind === 'written' ? INK.picked : fix?.kind === 'current' ? INK.current : mark.ledger === 'new' ? INK.drift : INK.debt;
  const heavy = mark.ledger === 'new' || !!fix;
  const ticks = (pts) => pts.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${heavy ? 2 : 1}"/>`).join('');
  // the ghost: the same shape at the nearest token's size, mint and dashed, offset so both read
  const ghost = fix?.kind === 'picked' || fix?.kind === 'written' ? undefined : ghostOf(mark);
  const mint = (inner) => `<g stroke="${INK.picked}" stroke-width="1" stroke-dasharray="3 2" fill="none">${inner}</g>`;
  let body = '';
  let box;
  if (g.kind === 'h') {
    body = `<line x1="${g.x1}" y1="${g.y}" x2="${g.x2}" y2="${g.y}" stroke-width="${heavy ? 2 : 1}"/>` + ticks([[g.x1, g.y - TICK, g.x1, g.y + TICK], [g.x2, g.y - TICK, g.x2, g.y + TICK]]);
    if (ghost !== undefined) { const y = g.y + 7; body += mint(`<line x1="${g.x1}" y1="${y}" x2="${g.x1 + ghost}" y2="${y}"/><line x1="${g.x1}" y1="${y - TICK}" x2="${g.x1}" y2="${y + TICK}"/><line x1="${g.x1 + ghost}" y1="${y - TICK}" x2="${g.x1 + ghost}" y2="${y + TICK}"/>`); }
    box = [g.x1, g.y - 7, Math.max(4, g.x2 - g.x1), 14];
  } else if (g.kind === 'v') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}" stroke-width="${heavy ? 2 : 1}"/>` + ticks([[g.x - TICK, g.y1, g.x + TICK, g.y1], [g.x - TICK, g.y2, g.x + TICK, g.y2]]);
    if (ghost !== undefined) { const x = g.x + 7; body += mint(`<line x1="${x}" y1="${g.y1}" x2="${x}" y2="${g.y1 + ghost}"/><line x1="${x - TICK}" y1="${g.y1}" x2="${x + TICK}" y2="${g.y1}"/><line x1="${x - TICK}" y1="${g.y1 + ghost}" x2="${x + TICK}" y2="${g.y1 + ghost}"/>`); }
    box = [g.x - 7, g.y1, 14, Math.max(4, g.y2 - g.y1)];
  } else if (g.kind === 'arc') {
    const { cx, cy, dx, dy, rad } = g;
    const sweep = dx * dy > 0 ? 1 : 0;
    body = `<path d="M${cx} ${cy + dy * rad} A${rad} ${rad} 0 0 ${sweep} ${cx + dx * rad} ${cy}" stroke-width="${heavy ? 2.5 : 1.5}" fill="none"/>`;
    if (ghost !== undefined) { const r = Math.max(1, ghost); body += mint(`<path d="M${cx} ${cy + dy * r} A${r} ${r} 0 0 ${sweep} ${cx + dx * r} ${cy}"/>`); }
    box = [Math.min(cx, cx + dx * rad) - 3, Math.min(cy, cy + dy * rad) - 3, rad + 6, rad + 6];
  } else if (g.kind === 'type') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}" stroke-width="${heavy ? 2 : 1}"/>` + ticks([[g.x - 3, g.y1, g.x, g.y1], [g.x - 3, g.y2, g.x, g.y2]]);
    // the text bracket spans the line box; the ghost scales it by the token's size over the authored one
    if (ghost !== undefined && mark.n) { const x = g.x + 6, h = (g.y2 - g.y1) * ghost / mark.n, y1 = (g.y1 + g.y2) / 2 - h / 2; body += mint(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y1 + h}"/><line x1="${x}" y1="${y1}" x2="${x + 3}" y2="${y1}"/><line x1="${x}" y1="${y1 + h}" x2="${x + 3}" y2="${y1 + h}"/>`); }
    box = [g.x - 4, g.y1, 10, Math.max(14, g.y2 - g.y1)];
  } else if (g.kind === 'box') {
    body = `<rect x="${g.x + 0.5}" y="${g.y + 0.5}" width="${Math.max(0, g.w - 1)}" height="${Math.max(0, g.h - 1)}" fill="none" stroke-dasharray="4 3"/>`;
    box = [g.x, g.y, Math.max(14, g.w), Math.min(Math.max(14, g.h), 24)];
  } else {
    body = `<circle cx="${g.x}" cy="${g.y}" r="3" fill="${ink}" stroke="none"/>`;
    box = [g.x - 7, g.y - 7, 14, 14];
  }
  return { markup: `<g stroke="${ink}" stroke-width="${fix ? 1.5 : 1}"${heavy ? '' : ' stroke-dasharray="3 3"'} aria-hidden="true">${body}</g>`, box };
}

// One badge per element: how many breaks it has, on its top right corner. A tall element carries it inside the
// corner; a short one (a chip, a button) carries it astride the corner, so it never covers what it counts. Badges
// never sit on each other: a later one steps left along its edge until it is clear.
const BADGE = 9;
function badge(rect, count, view, taken) {
  const inside = rect.height >= 40;
  let cx = inside ? rect.right - BADGE - 4 : rect.right, cy = inside ? rect.top + BADGE + 4 : rect.top;
  cx = Math.min(view.w - BADGE - 2, Math.max(BADGE + 2, cx));
  cy = Math.min(view.h - BADGE - 2, Math.max(BADGE + 2, cy));
  for (let step = 0; step < 6 && taken.some(([x, y]) => Math.hypot(x - cx, y - cy) < BADGE * 2 + 2); step++) cx -= BADGE * 2 + 4;
  taken.push([cx, cy]);
  return `<circle cx="${cx}" cy="${cy}" r="${BADGE}" fill="${INK.drift}" stroke="#1f3fa6" stroke-width="1.5"/><text x="${cx}" y="${cy + 3.5}" text-anchor="middle">${count}</text>`;
}

// A gap on the system: the same dimension line, faint, lettered with its token, with no box to click.
function drawDim(g, token) {
  const text = token, wide = text.length * CH + 6, ink = INK.on;
  const label = (x, y, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${ink}" stroke-width="3">${esc(text)}</text>`;
  const ticks = (pts) => pts.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('');
  let body, box;
  if (g.kind === 'h') {
    const len = g.x2 - g.x1, mid = (g.x1 + g.x2) / 2;
    if (len < 2) return null;
    body = `<line x1="${g.x1}" y1="${g.y}" x2="${g.x2}" y2="${g.y}"/>` + ticks([[g.x1, g.y - TICK, g.x1, g.y + TICK], [g.x2, g.y - TICK, g.x2, g.y + TICK]]);
    if (len >= wide) (body += label(mid, g.y - 5, 'middle')), (box = [g.x1, g.y - 16, len, 20]);
    else (body += `<line x1="${mid}" y1="${g.y - TICK}" x2="${mid}" y2="${g.y - 9}" stroke-opacity="0.6"/>` + label(mid, g.y - 12, 'middle')), (box = [mid - wide / 2, g.y - 24, wide, 28]);
  } else if (g.kind === 'v') {
    if (g.y2 - g.y1 < 2) return null;
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/>` + ticks([[g.x - TICK, g.y1, g.x + TICK, g.y1], [g.x - TICK, g.y2, g.x + TICK, g.y2]]) + label(g.x + 6, (g.y1 + g.y2) / 2 + 4);
    box = [g.x - 4, g.y1, wide + 10, Math.max(16, g.y2 - g.y1)];
  } else return null;
  return { markup: `<g class="dimension" stroke="${ink}" stroke-width="1" aria-hidden="true">${body}</g>`, box };
}

export class MarkLayer {
  #svg; #structure; #badges; #badgeMarkup = ''; #wash; #washMarkup = ''; #lifted = null; #hint; #hinted = null; #light; #lit = []; #lightMarkup = ''; #rails; #railsMarkup = ''; #nodes = new Map(); #dims = new Map(); #items = []; #order = []; #orderKey = ''; #scheduled = 0; #onPick; #occluders; #state; #onOrder;

  // onPick(element, mark, id) opens the chooser; occluders() → rects that marks must not sit under;
  // state(element, mark) → null | { kind: 'current' | 'picked' | 'written', to } says how the mark is drawn;
  // onOrder() is told when the set of drawn marks changes (the punch list follows it)
  constructor(layer, { onPick, occluders, state, onOrder }) {
    this.#svg = document.createElementNS(NS, 'svg');
    this.#svg.setAttribute('role', 'group');
    this.#svg.setAttribute('aria-label', 'Drift on this view');
    // the structure paints first, under every mark
    this.#structure = document.createElementNS(NS, 'g');
    this.#structure.setAttribute('class', 'structure');
    this.#svg.appendChild(this.#structure);
    // the badges paint last, over everything
    this.#badges = document.createElementNS(NS, 'g');
    this.#badges.setAttribute('class', 'badges');
    this.#badges.setAttribute('aria-hidden', 'true');
    this.#svg.appendChild(this.#badges);
    this.#rails = document.createElementNS(NS, 'g');
    this.#rails.setAttribute('class', 'rails');
    this.#rails.setAttribute('aria-hidden', 'true');
    this.#svg.appendChild(this.#rails);
    this.#light = document.createElementNS(NS, 'g');
    this.#light.setAttribute('class', 'light');
    this.#light.setAttribute('aria-hidden', 'true');
    this.#svg.appendChild(this.#light);
    // paint order in the layer: the wash, then the greek bars, then the marks
    const greek = layer.querySelector('svg.greek');
    if (greek) greek.after(this.#svg); else layer.prepend(this.#svg);
    this.#wash = document.createElementNS(NS, 'svg');
    this.#wash.setAttribute('class', 'wash');
    this.#wash.setAttribute('aria-hidden', 'true');
    layer.prepend(this.#wash);
    this.#onPick = onPick;
    this.#occluders = occluders;
    this.#state = state;
    this.#onOrder = onOrder;
    // Where hit boxes overlap (a long label over a short one), a click goes to the smallest box under the pointer: the
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
      const node = this.#nodes.get(hit.dataset.id);
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      this.#onPick(node.el, node.mark, hit.dataset.id);
    };
    this.#svg.addEventListener('click', (e) => { this.#showHint(null); pick(e); });
    this.#svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.#showHint(null), pick(e); });
    // the note: on the break under the pointer, or the one that has focus
    this.#hint = document.createElement('div');
    this.#hint.className = 'bp-hint';
    this.#hint.setAttribute('role', 'tooltip');
    layer.append(this.#hint);
    const over = (e) => { const hit = e.target.closest?.('.hit'); if (hit) this.#showHint(hit.dataset.id); };
    this.#svg.addEventListener('pointerover', over);
    this.#svg.addEventListener('pointerout', (e) => { if (e.target.closest?.('.hit') && !e.relatedTarget?.closest?.('.hit')) this.#showHint(null); });
    this.#svg.addEventListener('focusin', over);
    this.#svg.addEventListener('focusout', () => this.#showHint(null));
  }

  // items: [{ id, el, marks, dims, file }] in document order. Nodes are kept for marks that persist and made for new ones.
  set(items) {
    this.#items = items;
    const want = new Set(), keep = new Set();
    for (const item of items) {
      item.marks.forEach((m, k) => want.add(`${item.id}:${k}:${m.key}`));
      (item.dims ?? []).forEach((d) => keep.add(`${item.id}:${d.key}`));
    }
    for (const [id, node] of this.#nodes) if (!want.has(id)) this.#drop(id, node);
    for (const [id, node] of this.#dims) if (!keep.has(id)) node.g.remove(), this.#dims.delete(id);
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

  // Elements a cause touches, outlined while the cause is pointed at.
  spotlight(elements) {
    this.#lit = elements ?? [];
    this.invalidate();
  }

  // The element under the pointer: its wash, and its ancestors', lift so its breaks read clean.
  lift(el) {
    if (el === this.#lifted) return;
    this.#lifted = el;
    this.invalidate();
  }

  // The dimensions drawn, as last rendered: [{ id, el, token }].
  dims() {
    return [...this.#dims.entries()].filter(([, n]) => n.g.isConnected).map(([id, n]) => ({ id, el: n.el, token: n.token }));
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
    for (const node of this.#dims.values()) node.g.remove();
    this.#nodes.clear();
    this.#dims.clear();
    this.#badges.innerHTML = '';
    this.#badgeMarkup = '';
    this.#wash.innerHTML = '';
    this.#washMarkup = '';
    this.#lifted = null;
    this.#lit = [];
    this.#light.innerHTML = '';
    this.#lightMarkup = '';
    this.#rails.innerHTML = '';
    this.#railsMarkup = '';
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
    const view = { w: innerWidth, h: innerHeight };
    const under = this.#occluders?.() ?? [];
    const plan = [];
    const spans = { v: new Map(), h: new Map() }; // the rails: `${a}:${b}` → { a, b, text, off }
    const span = (g, text, off) => {
      if (g.kind === 'v' && g.y2 - g.y1 >= 2) { const key = `${Math.round(g.y1)}:${Math.round(g.y2)}`; if (!spans.v.has(key) || off) spans.v.set(key, { a: g.y1, b: g.y2, text, off }); }
      if (g.kind === 'h' && g.x2 - g.x1 >= 2) { const key = `${Math.round(g.x1)}:${Math.round(g.x2)}`; if (!spans.h.has(key) || off) spans.h.set(key, { a: g.x1, b: g.x2, text, off }); }
    };
    for (const item of this.#items) {
      if (!item.el.isConnected) continue;
      const r = item.el.getBoundingClientRect();
      const shown = r.bottom > -40 && r.top < view.h + 40 && r.right > 0 && r.left < view.w && r.width > 0;
      item.marks.forEach((mark, k) => {
        const g = shown ? dimensionsFor(item.el, mark.props) : null;
        plan.push({ id: `${item.id}:${k}:${mark.key}`, item, mark, g });
        if (g && mark.ledger === 'new' && mark.n !== undefined && /^(gap|row-gap|column-gap|padding|margin)/.test(mark.props[0] ?? '')) span(g, String(Math.round(mark.n * 10) / 10), true);
      });
    }
    let after = null; // keeps hit rects in document order for Tab
    const placed = [], order = [];
    const overlaps = ([x, y, w, h]) => placed.some(([a, b, c, d]) => x < a + c && a < x + w && y < b + d && b < y + h);
    for (const { id, item, mark, g } of plan) {
      let node = this.#nodes.get(id);
      if (!g) {
        if (node) this.#drop(id, node);
        continue;
      }
      const fix = this.#state?.(item.el, mark) ?? null;
      const { markup, box } = draw(g, mark, fix);
      placed.push(box);
      if (!node) {
        const group = document.createElementNS(NS, 'g');
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
      node.hit.setAttribute('aria-label', `${mark.ledger === 'new' ? 'Drift' : 'Recorded'}: ${mark.title}.${fix?.to ? ` Picked ${fix.to}.` : ''} Choose a token.`);
      node.hit.toggleAttribute('aria-current', fix?.kind === 'current');
      order.push({ id, el: item.el, mark, file: item.file ?? null });
      const [x, y, w, h] = box;
      node.hit.setAttribute('x', x);
      node.hit.setAttribute('y', y);
      node.hit.setAttribute('width', Math.max(14, w));
      node.hit.setAttribute('height', Math.max(14, h));
      node.hit.toggleAttribute('data-under', under.some((o) => x < o.right && o.left < x + w && y < o.bottom && o.top < y + h));
      // document order: each pair follows the previous one
      const anchor = after ? after.nextSibling : this.#structure.nextSibling;
      if (node.g !== anchor) this.#svg.insertBefore(node.g, anchor);
      if (node.hit !== node.g.nextSibling) this.#svg.insertBefore(node.hit, node.g.nextSibling);
      after = node.hit;
    }
    if (this.#badges !== this.#svg.lastChild) this.#svg.appendChild(this.#badges);
    // one badge per element with new drift in view
    let badges = '';
    const taken = [];
    for (const item of this.#items) {
      const n = item.marks.filter((m) => m.ledger === 'new').length;
      if (!n || !item.el.isConnected) continue;
      const r = item.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > view.h || r.right < 0 || r.left > view.w || !r.width) continue;
      badges += `<g class="badge">${badge(r, n, view, taken)}</g>`;
    }
    for (const [x, y] of taken) placed.push([x - BADGE, y - BADGE, BADGE * 2, BADGE * 2]);
    if (badges !== this.#badgeMarkup) (this.#badges.innerHTML = badges), (this.#badgeMarkup = badges);
    // the wash, per element, lifted where the pointer is. An element inside a washed one is washed only when it is
    // warmer than what surrounds it, so nesting does not read as heat
    let wash = '';
    const heats = new Map();
    for (const item of this.#items) heats.set(item.el, warmth(item.marks));
    for (const item of this.#items) {
      let heat = heats.get(item.el);
      if (!heat || !item.el.isConnected) continue;
      for (let a = item.el.parentElement; a && heat; a = a.parentElement) if (heats.get(a) >= heat) heat = 0;
      if (!heat) continue;
      const r = item.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > view.h || r.right < 0 || r.left > view.w || !r.width || !r.height) continue;
      const lifted = this.#lifted && item.el.contains(this.#lifted);
      const radius = Math.min(parseFloat(getComputedStyle(item.el).borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
      wash += `<rect x="${r.left.toFixed(1)}" y="${r.top.toFixed(1)}" width="${r.width.toFixed(1)}" height="${r.height.toFixed(1)}" rx="${radius.toFixed(1)}" fill-opacity="${lifted ? 0 : heat}" data-heat="${heat}"/>`;
    }
    if (wash !== this.#washMarkup) (this.#wash.innerHTML = wash), (this.#washMarkup = wash);
    let light = '';
    for (const el of this.#lit) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > view.h) continue;
      light += `<rect x="${(r.left - 2).toFixed(1)}" y="${(r.top - 2).toFixed(1)}" width="${(r.width + 4).toFixed(1)}" height="${(r.height + 4).toFixed(1)}" rx="3"/>`;
    }
    if (light !== this.#lightMarkup) (this.#light.innerHTML = light), (this.#lightMarkup = light);
    if (this.#light !== this.#svg.lastChild) this.#svg.appendChild(this.#light);
    this.#order = order;
    const key = order.map((o) => o.id).join(',');
    if (key !== this.#orderKey) (this.#orderKey = key), this.#onOrder?.();
    // the structure, after every mark has its place: a dimension yields to any label already there, and to the
    // chooser, the card, the dock and the sheet
    for (const item of this.#items) {
      for (const dim of item.dims ?? []) {
        const id = `${item.id}:${dim.key}`;
        let node = this.#dims.get(id);
        const r = item.el.isConnected ? item.el.getBoundingClientRect() : null;
        const shown = r && r.bottom > -40 && r.top < view.h + 40 && r.right > 0 && r.left < view.w && r.width > 0;
        const dg = shown ? dimensionsFor(item.el, dim.props) : null;
        if (dg) span(dg, dim.token, false);
        const d = dg ? drawDim(dg, dim.token) : null;
        const hidden = !d || overlaps(d.box) || under.some((o) => d.box[0] < o.right && o.left < d.box[0] + d.box[2] && d.box[1] < o.bottom && o.top < d.box[1] + d.box[3]);
        if (hidden) {
          if (node) node.g.remove(), this.#dims.delete(id);
          continue;
        }
        placed.push(d.box);
        if (!node) {
          node = { g: document.createElementNS(NS, 'g'), el: item.el, token: dim.token, markup: '' };
          this.#dims.set(id, node);
        }
        if (node.markup !== d.markup) (node.g.innerHTML = d.markup), (node.markup = d.markup);
        if (!node.g.isConnected) this.#structure.appendChild(node.g);
      }
    }
    // the rails: the left one from the top down to whatever sits in the corner (the sheet), the top one across
    const sheetTop = Math.min(view.h, ...under.filter((o) => o.left < 60 && o.bottom > view.h - 200).map((o) => o.top));
    const left = 14, top = 14;
    let rails = '';
    const vs = [...spans.v.values()].filter((s) => s.a >= 24 && s.b <= sheetTop - 10).sort((x, y) => x.a - y.a).slice(0, 48);
    const hs = [...spans.h.values()].filter((s) => s.a >= 40 && s.b <= view.w - 24).sort((x, y) => x.a - y.a).slice(0, 48);
    if (vs.length) rails += `<line class="rail" x1="${left}" y1="24" x2="${left}" y2="${sheetTop - 10}"/>`;
    if (hs.length) rails += `<line class="rail" x1="40" y1="${top}" x2="${view.w - 24}" y2="${top}"/>`;
    let lastY = -Infinity;
    for (const sp of vs) {
      let ly = (sp.a + sp.b) / 2 + 3.5;
      if (ly - lastY < 12) ly = lastY + 12;
      lastY = ly;
      rails += `<g${sp.off ? ' class="off"' : ''}><line x1="${left - 3}" y1="${sp.a}" x2="${left + 3}" y2="${sp.a}"/><line x1="${left - 3}" y1="${sp.b}" x2="${left + 3}" y2="${sp.b}"/><line x1="${left}" y1="${sp.a}" x2="${left}" y2="${sp.b}"/><text x="${left + 7}" y="${ly}">${esc(sp.text)}</text></g>`;
    }
    let lastX = -Infinity;
    for (const sp of hs) {
      let lx = (sp.a + sp.b) / 2;
      const wide = sp.text.length * CH;
      if (lx - wide / 2 - lastX < 6) lx = lastX + 6 + wide / 2;
      lastX = lx + wide / 2;
      rails += `<g${sp.off ? ' class="off"' : ''}><line x1="${sp.a}" y1="${top - 3}" x2="${sp.a}" y2="${top + 3}"/><line x1="${sp.b}" y1="${top - 3}" x2="${sp.b}" y2="${top + 3}"/><line x1="${sp.a}" y1="${top}" x2="${sp.b}" y2="${top}"/><text x="${lx}" y="${top + 15}" text-anchor="middle">${esc(sp.text)}</text></g>`;
    }
    if (rails !== this.#railsMarkup) (this.#rails.innerHTML = rails), (this.#railsMarkup = rails);
  }
}

/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MARKS · Plumb overlay
 *
 * Draws each finding where it lives, as a drawing marks a measurement: a dimension across a gap, padding or margin,
 * an arc on a corner, a bracket at the words, a tag or a dashed box for the rest. Geometry comes from geometry.js
 * (dimensionsFor, built on regionFor), the same places the Alt card uses.
 *
 *  retained   one <g> per mark, keyed by a stable id; a mark is redrawn only when its geometry changes
 *  measure    one batch per frame, only when invalidated (scroll, resize, a reading arriving, the reader's changes)
 *  ink        new drift in amber, heavier, with solid ticks; recorded debt in dashed white; exceptions never drawn;
 *             the mark being chosen for is white; a picked mark is mint and its label says what it becomes
 *  act        every mark's hit area is a button in document order: Tab reaches it, Enter or a click opens its chooser
 *  resolve    a mark whose fix was written leaves with a short fade once the re-read drops it
 *  occlusion  a mark under the chooser, the reading card or the dock is not clickable there
 * ───────────────────────────────────────────────────────── */
import { dimensionsFor } from './geometry.js';

const INK = { drift: '#ffb347', debt: 'rgb(255 255 255 / 0.7)', current: '#ffffff', picked: '#a8f0c6' };
const TICK = 3;
const CH = 6.6; // px per character of the 11px label

export const MARKS_CSS = `
  .bp { position: fixed; inset: 0; pointer-events: none; }
  .bp svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .bp text { font: 500 11px/1 var(--pl-mono); paint-order: stroke; stroke: #1f3fa6; stroke-width: 3px; stroke-linejoin: round; }
  .bp .hit { pointer-events: auto; cursor: pointer; fill: transparent; outline: none; }
  .bp .hit:focus-visible { stroke: #fff; stroke-width: 2px; }
  .bp .hit[data-under] { pointer-events: none; }
  .bp g { transition: opacity 240ms ease-out; }
  .bp g.gone { opacity: 0; }
  @media (prefers-reduced-motion: reduce) { .bp g { transition: none; } }
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

// A mark's drawing and its hit box, as markup and a rect, from its geometry. `nudge` steps the label (and its box)
// away from labels already placed: up for a label above its mark, down for one under or beside it; negative, the other way.
function draw(g, mark, nudge = 0, fix = null) {
  const ink = fix?.kind === 'picked' || fix?.kind === 'written' ? INK.picked : fix?.kind === 'current' ? INK.current : mark.ledger === 'new' ? INK.drift : INK.debt;
  const heavy = mark.ledger === 'new' || !!fix;
  const text = labelOf(mark, fix);
  const wide = text.length * CH + 6;
  const step = (g.under || g.kind === 'v' || g.kind === 'type' ? 1 : -1) * 14 * nudge;
  const label = (x, y, anchor = 'start') => `<text x="${x}" y="${y + step}" text-anchor="${anchor}" fill="${ink}" stroke-width="3">${esc(text)}</text>`;
  const ticks = (pts) => pts.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${heavy ? 1.5 : 1}"/>`).join('');
  let body = '';
  let box;
  if (g.kind === 'h') {
    const len = g.x2 - g.x1;
    body = `<line x1="${g.x1}" y1="${g.y}" x2="${g.x2}" y2="${g.y}"/>` + ticks([[g.x1, g.y - TICK, g.x1, g.y + TICK], [g.x2, g.y - TICK, g.x2, g.y + TICK]]);
    if (len >= wide) (body += label((g.x1 + g.x2) / 2, g.y - 5, 'middle')), (box = [g.x1, g.y - 16, len, 20]);
    else if (g.under) (body += `<line x1="${g.x1}" y1="${g.y + TICK}" x2="${g.x1}" y2="${g.under - 10}" stroke-opacity="0.6"/>` + label(g.x1, g.under)), (box = [g.x1 - 2, g.y - 6, wide, g.under - g.y + 8]);
    // too short to letter inside, and no room under it: lettered above the line, centred, over the padding
    else (body += `<line x1="${(g.x1 + g.x2) / 2}" y1="${g.y - TICK}" x2="${(g.x1 + g.x2) / 2}" y2="${g.y - 9}" stroke-opacity="0.6"/>` + label((g.x1 + g.x2) / 2, g.y - 12, 'middle')), (box = [(g.x1 + g.x2) / 2 - wide / 2, g.y - 24, wide, 28]);
  } else if (g.kind === 'v') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/>` + ticks([[g.x - TICK, g.y1, g.x + TICK, g.y1], [g.x - TICK, g.y2, g.x + TICK, g.y2]]) + label(g.x + 6, (g.y1 + g.y2) / 2 + 4);
    box = [g.x - 4, g.y1, wide + 10, Math.max(16, g.y2 - g.y1)];
  } else if (g.kind === 'arc') {
    const { cx, cy, dx, dy, rad } = g;
    const k = 1 - Math.SQRT1_2; // where the arc crosses its diagonal
    const sweep = dx * dy > 0 ? 1 : 0;
    body =
      `<path d="M${cx} ${cy + dy * rad} A${rad} ${rad} 0 0 ${sweep} ${cx + dx * rad} ${cy}" stroke-width="${heavy ? 2 : 1.5}" fill="none"/>` +
      `<line x1="${cx + dx * rad * k}" y1="${cy + dy * rad * k}" x2="${cx - dx * 10}" y2="${cy - dy * 10}"/>` +
      label(cx - dx * 13, cy - dy * 13 + (dy > 0 ? 0 : 8), dx > 0 ? 'end' : 'start');
    box = [dx > 0 ? cx - wide - 13 : cx - rad, dy > 0 ? cy - 24 : cy - rad, wide + 13 + rad, 24 + rad];
  } else if (g.kind === 'type') {
    body = `<line x1="${g.x}" y1="${g.y1}" x2="${g.x}" y2="${g.y2}"/>` + ticks([[g.x - 2, g.y1, g.x, g.y1], [g.x - 2, g.y2, g.x, g.y2]]) + label(g.x + 4, (g.y1 + g.y2) / 2 + 4);
    box = [g.x - 2, g.y1, wide + 8, Math.max(14, g.y2 - g.y1)];
  } else if (g.kind === 'box') {
    body = `<rect x="${g.x + 0.5}" y="${g.y + 0.5}" width="${Math.max(0, g.w - 1)}" height="${Math.max(0, g.h - 1)}" fill="none" stroke-dasharray="4 3"/>` + label(g.x, g.y - 5);
    box = [g.x, g.y - 17, Math.max(wide, g.w), 19];
  } else {
    body = `<circle cx="${g.x}" cy="${g.y}" r="2.5" fill="${ink}" stroke="none"/>` + label(g.x + 6, g.y - 4);
    box = [g.x - 3, g.y - 15, wide + 10, 19];
  }
  box = [box[0], box[1] + step, box[2], box[3]];
  return { markup: `<g stroke="${ink}" stroke-width="${fix ? 1.5 : 1}"${heavy ? '' : ' stroke-dasharray="3 3"'} aria-hidden="true">${body}</g>`, box };
}

export class MarkLayer {
  #svg; #nodes = new Map(); #items = []; #order = []; #orderKey = ''; #scheduled = 0; #onPick; #occluders; #state; #onOrder;

  // onPick(element, mark, id) opens the chooser; occluders() → rects that marks must not sit under;
  // state(element, mark) → null | { kind: 'current' | 'picked' | 'written', to } says how the mark is drawn;
  // onOrder() is told when the set of drawn marks changes (the punch list follows it)
  constructor(layer, { onPick, occluders, state, onOrder }) {
    this.#svg = document.createElementNS(NS, 'svg');
    this.#svg.setAttribute('role', 'group');
    this.#svg.setAttribute('aria-label', 'Drift on this view');
    layer.prepend(this.#svg);
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
    this.#svg.addEventListener('click', pick);
    this.#svg.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && pick(e));
  }

  // items: [{ id, el, marks, file }] in document order. Nodes are kept for marks that persist and made for new ones.
  set(items) {
    this.#items = items;
    const want = new Set();
    for (const item of items) item.marks.forEach((m, k) => want.add(`${item.id}:${k}:${m.key}`));
    for (const [id, node] of this.#nodes) if (!want.has(id)) this.#drop(id, node);
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
    for (const item of this.#items) {
      if (!item.el.isConnected) continue;
      const r = item.el.getBoundingClientRect();
      const shown = r.bottom > -40 && r.top < view.h + 40 && r.right > 0 && r.left < view.w && r.width > 0;
      item.marks.forEach((mark, k) => plan.push({ id: `${item.id}:${k}:${mark.key}`, item, mark, g: shown ? dimensionsFor(item.el, mark.props) : null }));
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
      // the label steps away from labels already placed: its own way (over empty space) first, then the other way
      // (into the element), never out of the view; when every step collides it keeps the nearest in-view one
      let drawn = null, first = null;
      for (const n of [0, 1, 2, 3, -1, -2, 4, -3, -4]) {
        const d = draw(g, mark, n, fix);
        if (d.box[1] < 0 || d.box[1] + d.box[3] > view.h) continue;
        first ??= d;
        if (!overlaps(d.box)) { drawn = d; break; }
      }
      drawn ??= first ?? draw(g, mark, 0, fix);
      const { markup, box } = drawn;
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
      const anchor = after ? after.nextSibling : this.#svg.firstChild;
      if (node.g !== anchor) this.#svg.insertBefore(node.g, anchor);
      if (node.hit !== node.g.nextSibling) this.#svg.insertBefore(node.hit, node.g.nextSibling);
      after = node.hit;
    }
    this.#order = order;
    const key = order.map((o) => o.id).join(',');
    if (key !== this.#orderKey) (this.#orderKey = key), this.#onOrder?.();
  }
}

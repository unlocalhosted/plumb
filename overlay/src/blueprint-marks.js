/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MARKS · React Plumber overlay
 *
 * Registration (overlay/demo/registration.html): the page against its system. The page is never dimmed or boxed;
 * only what is off glows, as much as it is off.
 *
 *  zone       one per mark, where the mark lives: the band of space between where the page puts an edge and where
 *             the system would (padding, margin, each gap), the words of a type value that is off, or a soft glow
 *             along the element's edge for anything without a place of its own (a colour, a radius, a shadow).
 *             Magenta heat for too much; cyan dots for space that is missing (it reads without colour, and on a
 *             coloured surface)
 *  heat       how far off: |is − should| against the step, HEAT.min (a 1px error is still seen) to 1; hotter is
 *             brighter and spreads further. Softer drift (a Tailwind default) rests at the minimum
 *  arrival    turning blueprint on, every zone pulses in twice, worst first, then rests still
 *  point      pointing at a zone (or focusing it, or coming within MAGNET px of a thin one) pulses it, lights every
 *             zone of the same cause, quiets the rest, and shows one pill by the pointer: class → token (×n places)
 *  spotlight  the panel's causes point back at the page: their zones light the same way
 *  act        every zone's hit area is its own pieces (each gap, not the box around them), a button: Tab walks
 *             them hottest first, Enter or a click selects the element
 *  seen       a zone is cut to where its element can be seen (a drawer over half a row leaves heat on the other
 *             half); nothing covered is drawn or clickable
 *  all clear  the last problem fixed: four registration marks spring onto the corners, hold, and go
 *  measure    one batch per frame, only when invalidated: every rect and style first, then every write
 * ───────────────────────────────────────────────────────── */

import { pxOf } from './value.js';

const TAG_H = 18; // a label's height: the code face's line and a pixel each side

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
  /* registration: heat where the page is off, no boxes at rest */
  .bp { --pl-heat: #ff1f8f; --pl-sys: #00a3ff; }
  @media (prefers-color-scheme: dark) { .bp { --pl-heat: #ff4fa7; --pl-sys: #2bb8ff; } }
  .bp .heat .warm rect { fill: var(--pl-heat); }
  .bp .heat .dots rect { fill: url(#pl-dot); }
  svg.all-clear { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 2147483647; }
  svg.all-clear .mark { stroke: #00a3ff; stroke-width: 1.5px; fill: none; transform-box: fill-box; transform-origin: center; }
  @media (prefers-color-scheme: dark) { svg.all-clear .mark { stroke: #2bb8ff; } }
  .bp .heat .warm rect.edge { fill: none; stroke: var(--pl-heat); stroke-width: 3px; }
  .bp .heat .zone { transition: opacity 220ms ease-out; }
  .bp .bp-hint.pill { max-width: none; padding: 0 var(--pl-space-3); height: 24px; display: inline-flex; align-items: center; gap: 6px; border-radius: 7px; white-space: nowrap;
    font: 600 11.5px/1 var(--pl-mono); color: #fff; background: #1c1b19; box-shadow: 0 2px 10px rgb(0 0 0 / .2); }
  .bp .bp-hint.pill .line { white-space: pre; }
  .bp .bp-hint.pill .from { color: #ff7ab8; font-weight: 600; } .bp .bp-hint.pill .to { color: #6fd0ff; font-weight: 600; }
  .bp .bp-hint.pill .arr, .bp .bp-hint.pill .n { opacity: .6; } .bp .bp-hint.pill .say { font: 500 12px/1.3 var(--pl-sans); white-space: normal; max-width: 300px; }
  .bp .bp-hint.pill:has(.say) { height: auto; padding: 6px 10px; }
  .bp .hit { pointer-events: auto; cursor: pointer; fill: transparent; outline: none; }
  .bp .hit:focus-visible { stroke: var(--pl-accent); stroke-width: 2px; }
  .bp .hit[data-under], .bp svg[data-through] .hit { pointer-events: none; }
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

// Where an element can actually be seen: its box, cut to the view and to every scroll container around it, then with
// whatever the page paints over it cut away. The page is sampled at five points; at a point where something else is on
// top (a drawer, a sticky header, a dialog), the branch of the page that covers it is found, and when it spans a whole
// side of the box that side is pulled in past it. Null when nothing of the element shows. Reads only; rects and
// styles are memoised for the frame.
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
  // a hairline (a 1px rule) is seen: only a box with no width or no height is not
  if (b.right - b.left < 0.5 || b.bottom - b.top < 0.5) return null;
  let seen = false;
  for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) {
    if (b.right - b.left < 0.5 || b.bottom - b.top < 0.5) return null;
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
  if (!seen || b.right - b.left < 0.5 || b.bottom - b.top < 0.5) return null;
  return { ...b, width: b.right - b.left, height: b.bottom - b.top, clipped: b.top > r.top + 0.5 || b.left > r.left + 0.5 || b.right < r.right - 0.5 || b.bottom < r.bottom - 0.5, topCut: b.top > r.top + 0.5 };
}




// ── registration (docs: overlay/demo/registration.html) ──────────────────────────────────────────────────────────
// A mark is drawn as heat where it is off, not as a box around its element: the band of space between where the page
// puts an edge and where the system would (padding, margin, gap), the words of a type value that is off, or, for
// anything without a place of its own (a colour, a radius, a shadow), a soft glow along the element's edge. Heat says
// how far off: |is − should| against the step, from HEAT.min (a 1px error is still seen) to 1.
export const HEAT = {
  min: 0.3, gain: 2.2,            // heat = min + gain × |is − should| / should
  rest: 0.62, lit: 0.28, quiet: 0.28, // opacity at heat 1; added when its cause is pointed; kept for other causes
  blur: [2.4, 4.2],               // blur at heat 0 → 1: hotter spreads further
  thin: 1.5,                      // a band thinner than this is drawn this thick, around its centre
  pulse: 700, arrival: 2, stagger: 60, // the arrival: two pulses each, worst first
};
const SIDES = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };
const sidesOf = (prop) => {
  const m = /^(padding|margin)(?:-(top|right|bottom|left|inline|block))?$/.exec(prop);
  if (!m) return null;
  const which = !m[2] ? ['top', 'right', 'bottom', 'left'] : m[2] === 'inline' ? ['left', 'right'] : m[2] === 'block' ? ['top', 'bottom'] : [m[2]];
  return { box: m[1], sides: which };
};
const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
// what the system would have for one property: the fix's own value when it says (a craft suggestion's sets), else the
// nearest token offered
function shouldOf(mark, prop) {
  const sets = mark.craft?.suggest?.sets ?? {};
  for (const k of [camel(prop), camel(prop.replace(/-(top|right|bottom|left)$/, '')), camel(prop.replace(/-(top|bottom)$/, '-block')), camel(prop.replace(/-(left|right)$/, '-inline'))]) {
    const n = parseFloat(sets[k]);
    if (Number.isFinite(n)) return n;
  }
  const c = (mark.choices ?? []).find((x) => Number.isFinite(pxOf(x.value, null, prop) ?? x.n));
  if (c) return pxOf(c.value, null, prop) ?? c.n;
  // a class suggestion names its token: gap-s2 is --spacing-s2 on the page, p-[18px] is 18, gap-4 is 4 × --spacing
  const to = String(mark.craft?.suggest?.to ?? '').split(/\s+/).find((k) => /^-?(p|m|gap|space)[xytrblse]?(-[xy])?-/.test(k));
  const t = to && /-(\[[^\]]+\]|[\w.]+)$/.exec(to)?.[1];
  if (!t) return null;
  if (t.startsWith('[')) return parseFloat(t.slice(1)) || null;
  const root = getComputedStyle(document.documentElement), unit = (v) => (/rem$/.test(v) ? parseFloat(v) * parseFloat(root.fontSize) : parseFloat(v));
  if (/^[\d.]+$/.test(t)) { const base = unit(root.getPropertyValue('--spacing')); return Number.isFinite(base) ? base * +t : null; }
  const v = unit(root.getPropertyValue(`--spacing-${t}`));
  return Number.isFinite(v) ? v : null;
}
const TYPE = new Set(['font-size', 'font-weight', 'line-height', 'letter-spacing']);
// A mark's zone: { bands: [[x, y, w, h, tooMuch]], words: [[x, y, w, h]], edge: rect|null, off, box: [x, y, w, h] }.
// Reads only.
function zoneOf(el, mark, r, style) {
  const s = style(el), px = (v) => parseFloat(v) || 0;
  const bands = [], words = [];
  let off = null, edge = null;
  for (const prop of mark.props ?? []) {
    const sd = sidesOf(prop);
    if (sd) {
      const want = shouldOf(mark, prop.replace(/-(inline|block)$/, ''));
      if (want === null) continue;
      const is = (side) => px(s[`${sd.box}${SIDES[side]}`]);
      for (const side of sd.sides) {
        const a = is(side), d = Math.abs(a - want);
        if (d < 0.25) continue;
        off = Math.max(off ?? 0, d / Math.max(want, 4));
        const more = a > want;
        if (sd.box === 'padding') {
          const pl = Math.min(is('left'), sd.sides.includes('left') ? want : is('left')), pr = Math.min(is('right'), sd.sides.includes('right') ? want : is('right'));
          const pt = Math.min(is('top'), sd.sides.includes('top') ? want : is('top')), pb = Math.min(is('bottom'), sd.sides.includes('bottom') ? want : is('bottom'));
          if (side === 'top') bands.push([r.left + pl, r.top + pt, r.width - pl - pr, d, more]);
          if (side === 'bottom') bands.push([r.left + pl, r.bottom - pb - d, r.width - pl - pr, d, more]);
          if (side === 'left') bands.push([r.left + pl, r.top + pt, d, r.height - pt - pb, more]);
          if (side === 'right') bands.push([r.right - pr - d, r.top + pt, d, r.height - pt - pb, more]);
        } else {
          if (side === 'top') bands.push([r.left, r.top - d, r.width, d, more, true]);
          if (side === 'bottom') bands.push([r.left, r.bottom, r.width, d, more, true]);
          if (side === 'left') bands.push([r.left - d, r.top, d, r.height, more, true]);
          if (side === 'right') bands.push([r.right, r.top, d, r.height, more, true]);
        }
      }
      continue;
    }
    if (/^(gap|row-gap|column-gap)$/.test(prop)) {
      const want = shouldOf(mark, prop);
      if (want === null) continue;
      const kids = [...el.children].map((k) => k.getBoundingClientRect()).filter((k) => k.width > 0 && k.height > 0);
      const column = /column/.test(s.flexDirection) || (s.display.includes('grid') && prop === 'row-gap');
      // one child: no gap shows yet; a small spot where it would start, just after the child
      if (kids.length < 2) { const k = kids[0]; bands.push(column ? [r.left + r.width / 2 - 3, Math.min(k ? k.bottom : r.bottom - 7, r.bottom - 7), 6, 6, true] : [Math.min(k ? k.right : r.right - 7, r.right - 7), r.top + r.height / 2 - 3, 6, 6, true]); off = Math.max(off ?? 0, 0); continue; }
      const a = px(column ? s.rowGap : s.columnGap), d = a - want;
      if (Math.abs(d) < 0.25) continue;
      off = Math.max(off ?? 0, Math.abs(d) / Math.max(want, 4));
      for (let i = 0; i + 1 < kids.length; i++) {
        if (column) bands.push([r.left, kids[i + 1].top - Math.abs(d), r.width, Math.abs(d), d > 0]);
        else bands.push([kids[i + 1].left - Math.abs(d), r.top, Math.abs(d), r.height, d > 0]);
      }
      continue;
    }
    if (TYPE.has(prop)) {
      const want = shouldOf(mark, prop), a = px(s[camel(prop)]);
      if (want !== null) off = Math.max(off ?? 0, Math.abs(a - want) / (prop === 'font-weight' ? 400 : Math.max(want, 1)));
      if (!words.length) {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const q of [...range.getClientRects()].slice(0, 8)) if (q.width > 1) words.push([q.left, q.top, q.width, q.height]);
      }
      continue;
    }
  }
  if (!bands.length && !words.length) edge = r;
  return { bands, words, edge, off, radius: px(s.borderTopLeftRadius) };
}
// A zone cut to where its element can be seen (a drawer over half a row leaves heat on the other half only)
function cutTo(zone, v) {
  // a margin lies outside its element: it is cut to the view, everything else to where the element shows
  const view = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const cut = ([x, y, w, h, more, outside]) => { const c = outside ? view : v; const l = Math.max(x, c.left), t = Math.max(y, c.top), rr = Math.min(x + w, c.right), b = Math.min(y + h, c.bottom); return rr - l > 0.25 && b - t > 0.25 ? [l, t, rr - l, b - t, more, outside] : null; };
  const bands = zone.bands.map(cut).filter(Boolean), words = zone.words.map(cut).filter(Boolean);
  let edge = zone.edge ? cut([zone.edge.left, zone.edge.top, zone.edge.width, zone.edge.height]) : null;
  if (zone.edge && !edge) return null;
  if (!zone.edge && !bands.length && !words.length) return null;
  if (edge) edge = { left: edge[0], top: edge[1], width: edge[2], height: edge[3] };
  const r = edge;
  const all = [...bands.map(([x, y, w, h]) => [x, y, w, h]), ...words, ...(edge ? [[r.left, r.top, r.width, r.height]] : [])];
  const x0 = Math.min(...all.map((b) => b[0])), y0 = Math.min(...all.map((b) => b[1]));
  const x1 = Math.max(...all.map((b) => b[0] + b[2])), y1 = Math.max(...all.map((b) => b[1] + b[3]));
  return { ...zone, bands, words, edge, box: [x0, y0, x1 - x0, y1 - y0], radius: v.clipped ? 0 : zone.radius };
}
const heatOf = (mark, zone) => (soft(mark) || mark.soft ? HEAT.min : zone.off === null ? 0.5 : Math.min(1, HEAT.min + zone.off * HEAT.gain));
const causeOf = (mark) => `${mark.rule}|${mark.text ?? ''}`;
// What the pill says: the class and what it becomes (×n when the cause has more places), or the advice in words
function pillOf(mark, n) {
  const s = mark.craft?.suggest;
  const line = (inner) => `<span class="line">${inner}</span>`;
  if (s?.kind === 'class') return line(`<b class="from">${esc(s.from || mark.text || '')}</b> <span class="arr">→</span> <b class="to">${esc(s.to)}</b>${n > 1 ? ` <span class="n">×${n}</span>` : ''}`);
  if (s?.kind === 'advice' || mark.family === 'craft') return `<span class="say">${esc(String(s?.text ?? mark.title ?? '').replace(/`/g, ''))}</span>`;
  const c = (mark.choices ?? [])[0];
  return line(`<b class="from">${esc(mark.text ?? labelOf(mark))}</b> ${c ? `<span class="arr">→</span> <b class="to">${esc(c.label ?? c.name ?? '')}</b>` : '<span class="say">no token is close</span>'}${n > 1 ? ` <span class="n">×${n}</span>` : ''}`);
}
// One zone, drawn: magenta heat where there is too much, cyan dots where space is missing, blurred by its heat level
function heatMarkup(zone, level) {
  let warm = '', dots = '';
  for (const [x, y, w, h, more] of zone.bands) {
    const tw = Math.max(w, HEAT.thin), th = Math.max(h, HEAT.thin), tx = x - (tw - w) / 2, ty = y - (th - h) / 2;
    if (more) warm += `<rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}"/>`;
    else dots += `<rect x="${(tx - 2).toFixed(1)}" y="${(ty - 2).toFixed(1)}" width="${(tw + 4).toFixed(1)}" height="${(th + 4).toFixed(1)}"/>`;
  }
  for (const [x, y, w, h] of zone.words) warm += `<rect x="${x.toFixed(1)}" y="${(y + h * 0.15).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 0.7).toFixed(1)}" rx="${(h * 0.35).toFixed(1)}"/>`;
  if (zone.edge) { const r = zone.edge; warm += `<rect class="edge" x="${(r.left + 2).toFixed(1)}" y="${(r.top + 2).toFixed(1)}" width="${Math.max(0, r.width - 4).toFixed(1)}" height="${Math.max(0, r.height - 4).toFixed(1)}" rx="${Math.max(0, zone.radius - 2).toFixed(1)}"/>`; }
  return (warm ? `<g class="warm" filter="url(#pl-heat-${level})">${warm}</g>` : '') + (dots ? `<g class="dots" filter="url(#pl-dots)">${dots}</g>` : '');
}

export class MarkLayer {
  #heat; #hand = null; #cause = null; #arrive = 0; #pulsed = new Set();
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
    // the heat: one zone per mark, blurred by its heat level; missing space as dots
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = [0, 1, 2, 3, 4].map((l) => `<filter id="pl-heat-${l}" filterUnits="userSpaceOnUse" x="-50" y="-50" width="20000" height="20000"><feGaussianBlur stdDeviation="${(HEAT.blur[0] + ((HEAT.blur[1] - HEAT.blur[0]) * l) / 4).toFixed(2)}"/><feComponentTransfer><feFuncA type="linear" slope="1.3"/></feComponentTransfer></filter>`).join('')
      + '<filter id="pl-dots" filterUnits="userSpaceOnUse" x="-50" y="-50" width="20000" height="20000"><feGaussianBlur stdDeviation=".45"/></filter>'
      + '<pattern id="pl-dot" width="3.5" height="3.5" patternUnits="userSpaceOnUse"><circle cx="1.75" cy="1.75" r=".95" fill="var(--pl-sys)" stroke="#fff" stroke-width=".6"/></pattern>';
    under.prepend(defs);
    this.#heat = document.createElementNS(NS, 'g');
    this.#heat.setAttribute('class', 'heat');
    under.appendChild(this.#heat);
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
        const pt = new DOMPoint(e.clientX, e.clientY);
        for (const node of this.#nodes.values()) {
          if (node.hit.hasAttribute('data-under') || !node.hit.isPointInFill?.(pt)) continue;
          const r = node.hit.getBoundingClientRect();
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
    this.#hint.className = 'bp-hint pill';
    this.#hint.setAttribute('role', 'tooltip');
    layer.append(this.#hint);
    const over = (e) => { const hit = e.target.closest?.('.hit'); if (hit) this.#showHint(hit.dataset.id); };
    this.#svg.addEventListener('pointerover', over);
    // the pill sits by the pointer, where the eye already is
    this.#svg.addEventListener('pointermove', (e) => { this.#hand = { x: e.clientX, y: e.clientY }; if (this.#hinted) this.#placeHint(); });
    this.#svg.addEventListener('pointerout', (e) => { if (e.target.closest?.('.hit') && !e.relatedTarget?.closest?.('.hit')) (this.#hand = null), this.#showHint(null); });
    this.#svg.addEventListener('focusin', (e) => { over(e); const node = this.#nodes.get(e.target.closest?.('.hit')?.dataset.id); this.#focused = node?.el ?? null; this.invalidate(); });
    this.#svg.addEventListener('focusout', () => { this.#showHint(null); this.#focused = null; this.invalidate(); });
  }

  // The dim goes on (shown, then faded in with on) and off with the mode.
  // registration: the page is never dimmed; turning on starts the arrival (each zone pulses in, worst first)
  dim(state) {
    this.#dim.hidden = true;
    if (state === 'on' || state === 'entering') { if (!this.#arrive) (this.#arrive = performance.now()), (this.#pulsed = new Set()); }
    else this.#arrive = 0;
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

  // One pill at a time: the pointed zone's class and what it becomes (or its advice), by the pointer; from the keyboard,
  // at the zone. Its cause lights with it.
  #showHint(id) {
    const node = id ? this.#nodes.get(id) : null;
    this.#hinted = node ? id : null;
    const cause = node ? causeOf(node.mark) : null;
    if (cause !== this.#cause) { this.#cause = cause; this.invalidate(); }
    if (!node) { this.#hint.removeAttribute('data-on'); return; }
    const n = [...this.#nodes.values()].filter((x) => causeOf(x.mark) === cause).length;
    this.#hint.innerHTML = pillOf(node.mark, n);
    this.#placeHint();
    this.#hint.setAttribute('data-on', '');
  }
  #placeHint() {
    const node = this.#nodes.get(this.#hinted);
    if (!node) return;
    const w = this.#hint.offsetWidth || 160, h = this.#hint.offsetHeight || 24, [ax, ay] = (node.hit.dataset.at ?? '0,0').split(',').map(Number);
    let x = this.#hand ? this.#hand.x + 14 : ax, y = this.#hand ? this.#hand.y + 18 : ay - h - 12;
    x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(8, Math.min(innerHeight - h - 8, y));
    this.#hint.style.left = `${x}px`;
    this.#hint.style.top = `${y}px`;
  }

  // Run fn with the marks' hit areas out of the way of hit tests (a caret looked up under a double-click on words that have a glow).
  through(fn) {
    this.#svg.toggleAttribute('data-through', true);
    try { return fn(); } finally { this.#svg.toggleAttribute('data-through', false); }
  }

  // The page element under the pointer (looked for through the glass): its drifted region shows its breaks.
  // The selected element (select.js) draws itself: its label steps aside.
  #selected = null;
  select(el) {
    if (el === this.#selected) return;
    this.#selected = el;
    this.invalidate();
  }
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

  // Magnetism: a pointer near a zone (within MAGNET px of its hit box, on nothing else) points at it, so a thin band
  // is easy to reach; a click then takes that zone's element. Returns the element, or null.
  #magnet = null;
  near(x, y) {
    const MAGNET = 18;
    let best = null, dist = MAGNET;
    for (const [id, node] of this.#nodes) {
      // only thin zones pull: a zone the size of its element is reached by pointing at the element
      if (!node.thin || !node.hit.isConnected || node.hit.hasAttribute('data-under')) continue;
      const r = node.hit.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d < dist) (dist = d), (best = id);
    }
    if (best) { this.#hand = { x, y }; if (this.#hinted !== best) this.#showHint(best); else this.#placeHint(); }
    else if (this.#magnet && this.#hinted === this.#magnet) this.#showHint(null);
    this.#magnet = best;
    return best ? this.#nodes.get(best).el : null;
  }
  get magnet() { return this.#magnet ? this.#nodes.get(this.#magnet)?.el ?? null : null; }

  // The all-clear: the last problem on the page was just fixed. Four registration marks come in turned and loose, then
  // spring onto their pins at the corners of the view, hold, and go. A quiet "done", no words.
  allClear() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const m = 28, size = 22, svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'all-clear');
    svg.setAttribute('aria-hidden', 'true');
    const corners = [[m, m, -1, -1], [innerWidth - m, m, 1, -1], [m, innerHeight - m, -1, 1], [innerWidth - m, innerHeight - m, 1, 1]];
    svg.innerHTML = corners.map(([x, y]) => `<g transform="translate(${x} ${y})"><g class="mark"><circle r="${size / 3}"/><path d="M${-size / 2} 0H${size / 2}M0 ${-size / 2}V${size / 2}"/></g></g>`).join('');
    this.#svg.getRootNode().append(svg); // above the dock and the panel: the moment is the page's, nothing covers it
    [...svg.querySelectorAll('.mark')].forEach((g, i) => {
      const [, , dx, dy] = corners[i];
      // the spring is the arrival's alone (onto the pins); the hold and the fade run straight
      g.animate([{ opacity: 0, transform: `translate(${dx * 14}px, ${dy * 14}px) rotate(${dx * dy * 50}deg) scale(.7)`, easing: 'cubic-bezier(.3, 1.4, .5, 1)' }, { opacity: 1, transform: 'none', offset: 0.35 }, { opacity: 1, transform: 'none', offset: 0.8, easing: 'ease-in' }, { opacity: 0, transform: 'scale(.92)' }],
        { duration: 1700, delay: i * 45, easing: 'linear', fill: 'both' });
    });
    setTimeout(() => svg.remove(), 1900);
  }

  // Where the heat is, hottest first: the chrome keeps clear of it (a panel parked on the worst problem hides it)
  zones() {
    return [...this.#nodes.values()].filter((n) => n.hit.isConnected).sort((a, b) => +b.hit.dataset.heat - +a.hit.dataset.heat).map((n) => n.hit.getBoundingClientRect());
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
    const plan = [];
    const memo = { rects: new Map(), styles: new Map() };
    const styleOf = (e) => { let v = memo.styles.get(e); if (!v) memo.styles.set(e, (v = getComputedStyle(e))); return v; };
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
      // registration: what is off is drawn as a zone of heat (counted drift, and craft, advisories included)
      item.marks.forEach((mark, k) => { const zone = box && (counts(mark) || mark.family === 'craft') ? cutTo(zoneOf(item.el, mark, r, styleOf), box) : null; plan.push({ id: `${item.id}:${k}:${mark.key}`, item, mark, zone, er: r, heat: zone ? heatOf(mark, zone) : 0 }); });
    }
    performance.measure('plumb:marks-visible', { start: tVis });
    performance.measure('plumb:marks-read', { start: tRead });
    // WRITES, from here on.
    const tWrite = performance.now();
    // the cause pointed at (a zone's pill, or a cause in the panel): its zones light, the others go quiet
    const lit = new Set(this.#lit);
    const lighting = this.#cause || lit.size;
    const isLit = (item, mark) => (this.#cause ? causeOf(mark) === this.#cause : lit.has(item.el));
    // Tab walks the hottest first: hit boxes go in by heat, the drawn order (the panel's) stays the page's
    const byHeat = [...plan].filter((p) => p.zone).sort((a, b) => b.heat - a.heat);
    const rank = new Map(byHeat.map((p, i) => [p.id, i]));
    const now = performance.now(), arriving = this.#arrive && now - this.#arrive < 2600;
    let after = null;
    const order = [];
    for (const { id, item, mark, zone, er, heat } of plan) {
      let node = this.#nodes.get(id);
      if (!zone) {
        if (node) this.#drop(id, node);
        continue;
      }
      const fix = this.#state?.(item.el, mark) ?? null;
      const level = Math.max(0, Math.min(4, Math.round(((heat - HEAT.min) / (1 - HEAT.min)) * 4)));
      const markup = heatMarkup(zone, level);
      if (!node) {
        const group = document.createElementNS(NS, 'g');
        group.setAttribute('class', 'zone');
        const hit = document.createElementNS(NS, 'path');
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
      node.g.dataset.cause = causeOf(mark);
      node.g.dataset.box = `${Math.round(er.left)},${Math.round(er.top)},${Math.round(er.width)},${Math.round(er.height)}`; // the element it belongs to
      // how warm it rests, brighter when its cause is pointed, quiet when another cause is
      const stage = this.#hinted === id ? 'pointed' : lighting ? (isLit(item, mark) ? 'lit' : 'quiet') : 'resting';
      const rest = heat * HEAT.rest, o = stage === 'quiet' ? rest * HEAT.quiet : stage === 'resting' ? rest : Math.min(1, rest + HEAT.lit);
      if (node.g.dataset.stage !== stage || node.g.style.opacity !== String(o)) { node.g.dataset.stage = stage; node.g.style.opacity = String(o); }
      if (node.g.parentNode !== this.#heat) this.#heat.appendChild(node.g);
      // the pointed zone breathes; on arrival every zone pulses twice, worst first
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!still) {
        if (stage === 'pointed' && !node.breath) node.breath = node.g.animate([{ opacity: o }, { opacity: 1 }, { opacity: o }], { duration: HEAT.pulse * 1.6, iterations: Infinity, easing: 'ease-in-out' });
        if (stage !== 'pointed' && node.breath) node.breath.cancel(), (node.breath = null);
        if (arriving && !this.#pulsed.has(id)) {
          this.#pulsed.add(id);
          node.g.animate([{ opacity: 0 }, { opacity: Math.min(1, o + 0.4) }, { opacity: o }], { duration: HEAT.pulse, delay: rank.get(id) * HEAT.stagger, iterations: HEAT.arrival, easing: 'ease-in-out', fill: 'backwards' });
        }
      }
      // what a screen reader hears: the line itself, then what is picked; no internal words (docs/copy/voice.md)
      const said = mark.title.replace(/`/g, '').replace(/\.?$/, '.');
      node.hit.setAttribute('aria-label', `${mark.ledger === 'new' ? '' : 'Known, recorded. '}${said}${fix?.to ? ` Picked ${fix.to}.` : ''}`);
      node.hit.dataset.ledger = mark.soft && mark.family === 'craft' ? 'soft' : mark.ledger; // an advisory is shown, not counted
      node.hit.dataset.also = (mark.also ?? []).map((x) => x.rule).join(' ');
      node.hit.dataset.heat = heat.toFixed(2);
      node.hit.toggleAttribute('aria-current', fix?.kind === 'current');
      order.push({ id, el: item.el, mark, file: item.file ?? null });
      // the hit box: the zone, with room to aim at a thin band
      // the hit area is the zone's own pieces (each gap, each band, the words, or the element), not their bounding
      // box: a gap's hit never covers the children between the gaps. A thin piece gets room around it to aim at
      const pieces = zone.edge ? [[zone.edge.left, zone.edge.top, zone.edge.width, zone.edge.height]] : [...zone.bands, ...zone.words].map(([px0, py0, pw, ph]) => [px0, py0, pw, ph]);
      const [x, y, w, h] = zone.box;
      node.thin = Math.min(w, h) < 14 || pieces.every(([, , pw, ph]) => Math.min(pw, ph) < 14);
      const grown = pieces.map(([px0, py0, pw, ph]) => { const pad = Math.min(pw, ph) < 14 ? 6 : 0; const gw = Math.max(14, pw + 2 * pad), gh = Math.max(14, ph + 2 * pad); return [px0 + pw / 2 - gw / 2, py0 + ph / 2 - gh / 2, gw, gh]; });
      const d = grown.map(([gx, gy, gw, gh]) => `M${gx.toFixed(1)} ${gy.toFixed(1)}h${gw.toFixed(1)}v${gh.toFixed(1)}h${(-gw).toFixed(1)}Z`).join('');
      if (node.hit.getAttribute('d') !== d) node.hit.setAttribute('d', d);
      // where to aim (a click, focus's pill): the middle of its first piece
      node.hit.dataset.at = `${(grown[0][0] + grown[0][2] / 2).toFixed(1)},${(grown[0][1] + grown[0][3] / 2).toFixed(1)}`;
      node.hit.toggleAttribute('data-under', grown.every(([gx, gy, gw, gh]) => under.some((o2) => gx < o2.right && o2.left < gx + gw && gy < o2.bottom && o2.top < gy + gh)));
      void x; void y;
    }
    // hottest first, for Tab: the smaller of two overlapping boxes still wins a click (pick, above)
    for (const p of byHeat) {
      const node = this.#nodes.get(p.id);
      if (!node) continue;
      const anchor = after ? after.nextSibling : this.#anchor.nextSibling;
      if (node.hit !== anchor) this.#svg.insertBefore(node.hit, anchor);
      after = node.hit;
    }
    performance.measure('plumb:marks-write-marks', { start: tWrite });
    const tRest = performance.now();
    // registration draws no dim, outlines, labels or spotlight boxes: the heat says it all
    if (this.#outlineMarkup) (this.#outlines.innerHTML = ''), (this.#outlineMarkup = '');
    if (this.#labelMarkup) (this.#labels.innerHTML = ''), (this.#labelMarkup = '');
    if (this.#lightMarkup) (this.#light.innerHTML = ''), (this.#lightMarkup = '');
    if (this.#dimPath) (this.#dim.style.removeProperty('clip-path'), (this.#dimPath = ''));
    performance.measure('plumb:marks-write-rest', { start: tRest });
    this.#order = order;
    const key = order.map((o) => o.id).join(',');
    const tOrder = performance.now();
    if (key !== this.#orderKey) (this.#orderKey = key), this.#onOrder?.();
    performance.measure('plumb:marks-order', { start: tOrder });
  }
}

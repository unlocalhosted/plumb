/* ─────────────────────────────────────────────────────────
 * BOX MODEL · React Plumber overlay
 *
 * The DOM's building blocks drawn in the visual language (docs/briefs/visual-language.md, "The DOM's building
 * blocks"): one pattern per block, the hue from the verdict. Read from the element's live layout, drawn in the
 * overlay, never on the page.
 *
 *  margin      the dot dither outside the border, per side, with a pill on each non-zero side
 *  border      a band its own width; one pill at the top-left corner
 *  padding     the 45° hatch between the border and the content, per side, a pill centred on each non-zero side
 *  content     a 1px outline; size pills at the bottom-right: W Fill 500 · H Hug 64 · W 240
 *  radius      `r 10` beside the top-left corner
 *  gap         stripes across each gap between the children, one pill in the first
 *  typography  each line box as a faint band, its baseline dashed, one pill at the first line: Aa 14/20 · 500
 *  name        a lilac tag above the top-left corner
 *
 *  verdict     tokenOf(family, px) names the step a value sits on (`s3`), or returns null: a value with no step is
 *              off the scale and draws coral. Without tokenOf every value is drawn as a plain measurement in sky
 *  pills       few, and never on the content: padding's sit on the element's edge (top and bottom near its right
 *              end, left and right at its middle, as in the reference); margin is labelled only when it is off the
 *              scale; a border only when it is thicker than 1; a radius only when it is off the scale; the type pill
 *              sits beside the name tag. A pill that would sit on another moves away from the element's centre
 *  rules       zero draws nothing
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

export const BOXMODEL_CSS = `
  .bm { position: fixed; inset: 0; pointer-events: none; }
  .bm > * { position: fixed; box-sizing: border-box; }
  .bm .m { --c: var(--pl-sky); background-image: radial-gradient(color-mix(in oklab, var(--c) 70%, transparent) 0.8px, transparent 1px); background-size: 4px 4px; }
  .bm .p { --c: var(--pl-sky); background-image: repeating-linear-gradient(45deg, color-mix(in oklab, var(--c) 55%, transparent) 0 1px, transparent 1px 6px);
    background-color: color-mix(in oklab, var(--c) 8%, transparent); }
  .bm .g { --c: var(--pl-sky); background-image: repeating-linear-gradient(90deg, color-mix(in oklab, var(--c) 60%, transparent) 0 1px, transparent 1px 4px); }
  .bm .g.col { background-image: repeating-linear-gradient(0deg, color-mix(in oklab, var(--c) 60%, transparent) 0 1px, transparent 1px 4px); }
  .bm .off { --c: var(--pl-coral); }
  .bm .b { border: solid color-mix(in oklab, var(--pl-sky) 75%, transparent); }
  .bm .c { box-shadow: 0 0 0 1px var(--pl-sky); }
  .bm .line { background: color-mix(in oklab, var(--pl-lilac) 12%, transparent); }
  .bm .base { height: 0; border-top: 1px dashed color-mix(in oklab, var(--pl-lilac) 80%, transparent); }
  .bm .pl-pill, .bm .pl-tag { translate: -50% -50%; }
  .bm .pl-tag, .bm .head .pl-pill { translate: none; }
  .bm .head { align-items: center; }
  .bm .pill-tl, .bm .pill-br { translate: 0 0; }
`;

const SIDES = ['top', 'right', 'bottom', 'left'];
const px = (v) => parseFloat(v) || 0;
const r1 = (n) => Math.round(n * 10) / 10;
const box = (cls, x, y, w, h, extra = '') => (w > 0.5 && h > 0.5 ? `<div class="${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${extra}"></div>` : '');

// How the element sizes along one axis: it fills its container, hugs its content, or is a fixed number.
function sizing(el, cs, axis) {
  const parent = el.parentElement;
  const r = el.getBoundingClientRect();
  const size = axis === 'w' ? r.width : r.height;
  if (!parent) return `${Math.round(size)}`;
  const ps = getComputedStyle(parent), pr = parent.getBoundingClientRect();
  const inner = axis === 'w' ? pr.width - px(ps.paddingLeft) - px(ps.paddingRight) - px(ps.borderLeftWidth) - px(ps.borderRightWidth)
    : pr.height - px(ps.paddingTop) - px(ps.paddingBottom) - px(ps.borderTopWidth) - px(ps.borderBottomWidth);
  const flex = /flex/.test(ps.display), row = !/column/.test(ps.flexDirection);
  const main = flex && ((axis === 'w') === row);
  if ((main && px(cs.flexGrow) > 0) || Math.abs(size - inner) < 1.5) return `Fill ${Math.round(size)}`;
  if (/inline/.test(cs.display) || (flex && main && px(cs.flexGrow) === 0 && cs.flexBasis === 'auto')) return `Hug ${Math.round(size)}`;
  return `${Math.round(size)}`;
}

// The gaps between an element's laid-out children, along its flow.
function gaps(el, cs) {
  const g = px(cs.columnGap === 'normal' ? 0 : cs.columnGap), rg = px(cs.rowGap === 'normal' ? 0 : cs.rowGap);
  if (!/flex|grid/.test(cs.display) || (!g && !rg)) return [];
  const kids = [...el.children].map((k) => k.getBoundingClientRect()).filter((k) => k.width || k.height);
  const out = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1], b = kids[i];
    if (b.left - a.right >= 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) out.push({ x: a.right, y: Math.min(a.top, b.top), w: b.left - a.right, h: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top), n: b.left - a.right, col: false });
    else if (b.top - a.bottom >= 1 && Math.min(a.right, b.right) > Math.max(a.left, b.left)) out.push({ x: Math.min(a.left, b.left), y: a.bottom, w: Math.max(a.right, b.right) - Math.min(a.left, b.left), h: b.top - a.bottom, n: b.top - a.bottom, col: true });
  }
  return out;
}

// The line boxes of the element's own words.
function lines(el) {
  const out = [];
  for (const node of el.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE || !node.data.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) if (rect.width > 1) out.push(rect);
  }
  return out;
}

/**
 * The box model of `el` as overlay markup (fixed, viewport coordinates).
 * options: { name, tokenOf(family, px) → token | null }
 */
export function boxModel(el, { name, tokenOf } = {}) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const m = SIDES.map((s) => px(cs[`margin-${s}`] ?? cs.getPropertyValue(`margin-${s}`)));
  const b = SIDES.map((s) => (cs.getPropertyValue(`border-${s}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s}-width`))));
  const p = SIDES.map((s) => px(cs.getPropertyValue(`padding-${s}`)));
  const [mt, mr, mb, ml] = m, [bt, br, bb, bl] = b, [pt, pr, pb, pl] = p;
  // a value's verdict: its step, or off the scale (coral) when the scale has none for it
  const verdict = (family, n) => { if (!tokenOf || !n) return { label: `${r1(n)}`, off: false }; const t = tokenOf(family, n); return t ? { label: `${t} · ${r1(n)}`, off: false } : { label: `${r1(n)}`, off: true }; };
  const layers = [], pills = [];
  const pill = (x, y, v, cls = '') => pills.push({ x, y, html: `<span class="pl-pill ${cls}"${v.off ? ' data-hue="coral"' : ''} style="left:${r1(x)}px;top:${r1(y)}px">${esc(v.label)}</span>` });

  // margin, outside the border
  const mv = m.map((n) => verdict('spacing', n));
  layers.push(box(`m${mv[0].off ? ' off' : ''}`, r.left - ml, r.top - mt, r.width + ml + mr, mt), box(`m${mv[2].off ? ' off' : ''}`, r.left - ml, r.bottom, r.width + ml + mr, mb),
    box(`m${mv[3].off ? ' off' : ''}`, r.left - ml, r.top, ml, r.height), box(`m${mv[1].off ? ' off' : ''}`, r.right, r.top, mr, r.height));
  // margin speaks only when it is off the scale, at its outer edge
  if (mt && mv[0].off) pill(r.left + r.width / 2, r.top - mt, mv[0]);
  if (mb && mv[2].off) pill(r.left + r.width / 2, r.bottom + mb, mv[2]);
  if (ml && mv[3].off) pill(r.left - ml, r.top + r.height / 2, mv[3]);
  if (mr && mv[1].off) pill(r.right + mr, r.top + r.height / 2, mv[1]);

  // padding, inside the border
  const ix = r.left + bl, iy = r.top + bt, iw = r.width - bl - br, ih = r.height - bt - bb;
  const pv = p.map((n) => verdict('spacing', n));
  layers.push(box(`p${pv[0].off ? ' off' : ''}`, ix, iy, iw, pt), box(`p${pv[2].off ? ' off' : ''}`, ix, iy + ih - pb, iw, pb),
    box(`p${pv[3].off ? ' off' : ''}`, ix, iy + pt, pl, ih - pt - pb), box(`p${pv[1].off ? ' off' : ''}`, ix + iw - pr, iy + pt, pr, ih - pt - pb));
  // padding's pills on the element's own edge, straddling it: off the content, next to the side they measure
  const endX = r.right - Math.min(36, r.width / 4);
  if (pt) pill(endX, r.top, pv[0]);
  if (pb) pill(endX, r.bottom, pv[2]);
  // left and right sit just outside the edge: a side band is often thinner than half a pill
  if (pl) pill(r.left - 16, r.top + r.height / 2, pv[3]);
  if (pr) pill(r.right + 16, r.top + r.height / 2, pv[1]);

  // gaps between the children
  const gs = gaps(el, cs);
  gs.forEach((g, i) => {
    const v = verdict('spacing', g.n);
    layers.push(box(`g${g.col ? ' col' : ''}${v.off ? ' off' : ''}`, g.x, g.y, g.w, g.h));
    // a gap is often too narrow to hold its pill: it sits on the element's top edge, above the gap
    if (i === 0) pill(g.x + g.w / 2, g.col ? g.y + g.h / 2 : r.top, g.col ? { ...v } : v);
  });

  // the words: line boxes and their baselines
  const ls = lines(el);
  const fs = px(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.2 : px(cs.lineHeight);
  for (const l of ls) {
    layers.push(box('line', l.left, l.top, l.width, l.height));
    const base = l.top + (l.height + fs * 0.68) / 2; // the alphabetic baseline, near enough for a system face
    layers.push(box('base', l.left, base, l.width, 1));
  }
  const t = ls.length ? tokenOf?.('type', fs) : null;
  const type = ls.length ? `<span class="pl-pill" data-hue="lilac">Aa ${esc(t ? `${t} · ` : '')}${r1(fs)}/${r1(lh)} · ${esc(cs.fontWeight)}</span>` : '';

  // the border band, and the content outline
  if (bt || br || bb || bl) {
    layers.push(box('b', r.left, r.top, r.width, r.height, `border-width:${bt}px ${br}px ${bb}px ${bl}px;border-radius:${cs.borderRadius}`));
    if (Math.max(...b) > 1) pill(r.left + 14, r.top, { label: `${Math.max(...b)}`, off: false });
  }
  layers.push(box('c', ix + pl, iy + pt, iw - pl - pr, ih - pt - pb, `border-radius:${Math.max(0, px(cs.borderTopLeftRadius) - Math.max(pl, pt))}px`));
  const rad = px(cs.borderTopLeftRadius);
  if (rad) { const v = verdict('radius', rad); if (v.off) pill(r.left, r.top, { ...v, label: `r ${v.label}` }); }

  // size, at the bottom-right; the name, above the top-left
  const size = `<span class="pl-pill pill-br" style="left:${r1(r.right - 4)}px;top:${r1(r.bottom + mb + 6)}px;translate:-100% 0">W ${esc(sizing(el, cs, 'w'))} · H ${esc(sizing(el, cs, 'h'))}</span>`;
  // the name, and the type beside it, in one row above the top-left corner
  const tag = `<div class="head" style="left:${r1(r.left - ml)}px;top:${r1(r.top - mt - 30)}px;display:flex;gap:6px"><span class="pl-tag">${esc(name ?? el.localName)}</span>${type}</div>`;

  // pills never sit on each other: a later one moves away from the element's centre
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const placed = [];
  const html = pills.map((p) => {
    let { x, y } = p, step = 0;
    const dx = Math.sign(x - cx) || 1, dy = Math.sign(y - cy) || 1;
    const vertical = Math.abs(y - cy) >= Math.abs(x - cx) * (r.height / Math.max(1, r.width));
    while (step < 6 && placed.some(([a, c]) => Math.abs(a - x) < 40 && Math.abs(c - y) < 20)) { if (vertical) y += 20 * dy; else x += 44 * dx; step++; }
    placed.push([x, y]);
    return p.html.replace(/top:[\d.-]+px/, `top:${r1(y)}px`).replace(/left:[\d.-]+px/, `left:${r1(x)}px`);
  }).join('');
  return `<div class="bm" aria-hidden="true">${layers.join('')}${html}${tag}${size}</div>`;
}

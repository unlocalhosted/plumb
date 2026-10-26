/* ─────────────────────────────────────────────────────────
 * BOX MODEL · React Plumber overlay
 *
 * The DOM's building blocks drawn in the visual language (docs/briefs/visual-language.md, "The DOM's building
 * blocks"): one pattern per block, the hue from the verdict. Read from the element's live layout, drawn in the
 * overlay, never on the page.
 *
 *  margin      the dot dither outside the border, per side
 *  border      a band its own width, at the element's own radius
 *  padding     the 45° hatch between the border and the content, per side
 *  content     a 1px outline
 *  gap         stripes across each gap between the children
 *  typography  each line box as a faint band, its baseline dashed
 *  name        a lilac tag above the top-left corner: the only words at rest
 *
 *  verdict     the hue: sky when the value sits on a step of the scale (tokenOf names it), coral when it is off it.
 *              Without tokenOf everything is sky
 *  pointing    no labels at rest (docs/briefs/visual-language.md: visual, not labels). pointAt(bands, x, y) gives one
 *              small pill for the one band under the pointer: its token and number (`s3 · 12`), the type of a line
 *              (`Aa sm · 14/20 · 500`), the content's size (`W Fill 500 · H Hug 64`), the border's width and radius
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
  /* off the scale: coral, and stronger than sky, so the one wrong side is what the eye finds first */
  .bm .off { --c: var(--pl-coral); }
  .bm .p.off { background-image: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-coral) 85%, transparent) 0 1.5px, transparent 1.5px 5px);
    background-color: color-mix(in oklab, var(--pl-coral) 22%, transparent); }
  .bm .m.off { background-image: radial-gradient(var(--pl-coral) 1px, transparent 1.2px); background-color: color-mix(in oklab, var(--pl-coral) 12%, transparent); }
  .bm .g.off { background-color: color-mix(in oklab, var(--pl-coral) 18%, transparent); }
  .bm .b { border: solid color-mix(in oklab, var(--pl-sky) 75%, transparent); }
  .bm .c { box-shadow: 0 0 0 1px var(--pl-sky); }
  .bm .line { background: color-mix(in oklab, var(--pl-lilac) 12%, transparent); }
  .bm .base { height: 0; border-top: 1px dashed color-mix(in oklab, var(--pl-lilac) 80%, transparent); }
  .bm .pl-tag, .bm .bm-at { translate: none; }
  .bm .bm-at { animation: pl-pop 200ms var(--pl-spring-pop) both; }
  @media (prefers-reduced-motion: reduce) { .bm .bm-at { animation: none; } }
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
 * The box model of `el`: { html, bands }. The html is the drawing (fixed, viewport coordinates): patterns and colour
 * only, and the element's name. `bands` are the drawn parts with their values, for pointAt.
 * options: { name, tokenOf(family, px) → token | null }
 */
export function boxModel(el, { name, tokenOf } = {}) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const val = (s) => px(cs.getPropertyValue(s));
  const [mt, mr, mb, ml] = SIDES.map((s) => val(`margin-${s}`));
  const [bt, br, bb, bl] = SIDES.map((s) => (cs.getPropertyValue(`border-${s}-style`) === 'none' ? 0 : val(`border-${s}-width`)));
  const [pt, pr, pb, pl] = SIDES.map((s) => val(`padding-${s}`));
  // a value's verdict: the step it sits on, else off the scale (coral); without a scale, a plain measurement
  const verdict = (family, n) => { const t = tokenOf && n ? tokenOf(family, n) : undefined; return { label: t ? `${t} · ${r1(n)}` : `${r1(n)}`, off: !!tokenOf && !!n && !t }; };
  const bands = [];
  const band = (kind, what, family, n, x, y, w, h, extra = {}) => { if (w > 0.5 && h > 0.5 && n !== 0) bands.push({ kind, what, x, y, w, h, ...verdict(family, n), ...extra }); };

  // margin, outside the border; padding, inside it; per side
  band('m', 'margin top', 'spacing', mt, r.left - ml, r.top - mt, r.width + ml + mr, mt);
  band('m', 'margin bottom', 'spacing', mb, r.left - ml, r.bottom, r.width + ml + mr, mb);
  band('m', 'margin left', 'spacing', ml, r.left - ml, r.top, ml, r.height);
  band('m', 'margin right', 'spacing', mr, r.right, r.top, mr, r.height);
  const ix = r.left + bl, iy = r.top + bt, iw = r.width - bl - br, ih = r.height - bt - bb;
  band('p', 'padding top', 'spacing', pt, ix, iy, iw, pt);
  band('p', 'padding bottom', 'spacing', pb, ix, iy + ih - pb, iw, pb);
  band('p', 'padding left', 'spacing', pl, ix, iy + pt, pl, ih - pt - pb);
  band('p', 'padding right', 'spacing', pr, ix + iw - pr, iy + pt, pr, ih - pt - pb);
  for (const g of gaps(el, cs)) band(g.col ? 'g col' : 'g', 'gap', 'spacing', g.n, g.x, g.y, g.w, g.h);
  // the words: a band per line, its baseline dashed; pointing at one says the type
  const fs = px(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.2 : px(cs.lineHeight);
  const type = tokenOf?.('type', fs);
  for (const l of lines(el)) bands.push({ kind: 'line', what: 'type', x: l.left, y: l.top, w: l.width, h: l.height, label: `Aa ${type ? `${type} · ` : ''}${r1(fs)}/${r1(lh)} · ${cs.fontWeight}`, off: !!tokenOf && !type, base: l.top + (l.height + fs * 0.68) / 2 });

  const layers = bands.map((b) => (b.kind === 'line'
    ? `${box('line', b.x, b.y, b.w, b.h)}${box('base', b.x, b.base, b.w, 1)}`
    : box(`${b.kind}${b.off ? ' off' : ''}`, b.x, b.y, b.w, b.h)));
  // the border band and the content outline; the radius shows in the shape itself
  if (bt || br || bb || bl) layers.push(box('b', r.left, r.top, r.width, r.height, `border-width:${bt}px ${br}px ${bb}px ${bl}px;border-radius:${cs.borderRadius}`));
  const content = { x: ix + pl, y: iy + pt, w: iw - pl - pr, h: ih - pt - pb };
  layers.push(box('c', content.x, content.y, content.w, content.h, `border-radius:${Math.max(0, px(cs.borderTopLeftRadius) - Math.max(pl, pt))}px`));
  // pointing at the content says its size; at the border, its width and radius
  bands.push({ kind: 'c', what: 'size', ...content, label: `W ${sizing(el, cs, 'w')} · H ${sizing(el, cs, 'h')}`, off: false, under: true });
  const rad = px(cs.borderTopLeftRadius);
  if (bt || rad) bands.push({ kind: 'b', what: 'border', x: r.left, y: r.top, w: r.width, h: Math.max(bt, 3), label: [bt ? `border ${Math.max(bt, br, bb, bl)}` : '', rad ? `r ${verdict('radius', rad).label}` : ''].filter(Boolean).join(' · '), off: rad ? verdict('radius', rad).off : false });

  // the only words at rest: the element's name above its top-left corner
  const tag = `<span class="pl-tag" style="left:${r1(r.left - ml)}px;top:${r1(r.top - mt - 28)}px">${esc(name ?? el.localName)}</span>`;
  return { html: `<div class="bm" aria-hidden="true">${layers.join('')}${tag}</div>`, bands };
}

/** The one band under a point (bands drawn on top first), or null. */
export function bandAt(bands, x, y) {
  return [...bands].reverse().filter((b) => !b.under).find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
    ?? bands.find((b) => b.under && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null;
}

/**
 * The pill for the band under the pointer, kept in `host` (an element the caller owns): it pops in when the pointer
 * reaches a new band, follows the pointer while it stays on that band, and goes when it leaves every band.
 */
export function pointAt(host, bands, x, y) {
  const hit = bandAt(bands, x, y);
  const key = hit ? `${hit.what}|${hit.label}|${Math.round(hit.x)}|${Math.round(hit.y)}` : '';
  if (!hit) { host.replaceChildren(); host.dataset.key = ''; return null; }
  if (host.dataset.key !== key) {
    host.dataset.key = key;
    host.innerHTML = `<div class="bm" aria-hidden="true"><span class="pl-pill bm-at"${hit.off ? ' data-hue="coral"' : hit.kind === 'line' ? ' data-hue="lilac"' : ''}>${esc(hit.label)}</span></div>`;
  }
  const pill = host.querySelector('.bm-at');
  pill.style.left = `${r1(x + 14)}px`;
  pill.style.top = `${r1(y - 28)}px`;
  return hit;
}

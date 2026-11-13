/* ─────────────────────────────────────────────────────────
 * X-RAY · React Plumber overlay (prototype, 2026-11-13)
 *
 * The owner: "show the x-ray version of the current selected element / component … and other info whatever we can
 * expose in a very delightful manner", in place of the whole page's heat. Decided with the owner: it follows the
 * element under the pointer (a click pins it); it shows space, shape and size, type and colour, and where it comes
 * from; it will be changed in place (next layer); the heat goes, the list stays.
 *
 * Two parts, drawn over the page, never on it:
 *  on the element   its space in the visual language's patterns: padding hatched, margin dotted, gaps striped; the
 *                   colour is the verdict (mint on your scale, coral off it, sky when there is no scale to judge by).
 *                   Its corners traced where they round; its width and height as rulers just outside it.
 *  beside it        the X-ray card: the part's toy, its name, its file and line; its box drawn small (margin, padding,
 *                   content with each side's value and token); then corner, gap, type and colour, one row each, with
 *                   the verdict on every value. Rows arrive one after another.
 *
 *   import { XRAY_CSS, xray } from './xray.js';
 *   layer.innerHTML = xray(el, { tokenOf, origin, room, source })
 *
 *   tokenOf(family, px) → token name | null (off your scale); leave it out and nothing is judged
 *   origin   { left, top } of the layer in the viewport (0, 0 for a fixed layer)
 *   room     { left, top, right, bottom } the card must stay inside (the viewport by default)
 * ───────────────────────────────────────────────────────── */
import { gaps, sizing } from './boxmodel.js';
import { toyOf } from './toys.js';
import { esc } from './choices.js';
import { placeOf, atPlace } from './stamp.js';

const SIDES = ['top', 'right', 'bottom', 'left'];
const px = (v) => parseFloat(v) || 0;
const r1 = (n) => Math.round(n * 10) / 10;
const CARD_W = 292;

export const XRAY_CSS = `
  .xr { position: absolute; inset: 0; pointer-events: none; }
  .xr svg.xr-on { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .xr .xr-draw { animation: xr-in 260ms var(--pl-ease-out) both; }
  @keyframes xr-in { from { opacity: 0; } }
  .xr .xr-zone { animation: xr-in 160ms var(--pl-ease-out) both; }
  .xr-say { position: absolute; translate: -50% 0; z-index: 2; display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 5px 0 9px; border-radius: 99px; white-space: nowrap;
    background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: var(--pl-shadow-tag); font: 500 11.5px/1 var(--pl-mono); font-variant-numeric: tabular-nums; animation: pl-pop 220ms var(--pl-spring-pop) both; }
  .xr-say b { font: 600 11.5px/1 var(--pl-sans); }
  .xr-say i { font: 600 10.5px/1 var(--pl-sans); font-style: normal; padding: 3px 6px; border-radius: 99px; }
  .xr-say i.on { background: var(--pl-mint-soft); color: var(--pl-mint-ink); } .xr-say i.off { background: var(--pl-coral-soft); color: var(--pl-coral-ink); }
  .xr-say kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 3px; border-radius: 6px; font: 600 11px/1 var(--pl-sans); background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default), 0 0 0 1px var(--pl-border-default); }
  .xr .ruler { font: 600 10.5px/1 var(--pl-mono); font-variant-numeric: tabular-nums; }
  .xr .ruler-pill { position: absolute; translate: -50% -50%; padding: 3px 6px; border-radius: 99px; background: var(--pl-sky-ink); color: #fff;
    font: 600 10.5px/1 var(--pl-mono); font-variant-numeric: tabular-nums; white-space: nowrap; box-shadow: 0 0 0 2px var(--pl-bg-surface); animation: pl-pop 260ms var(--pl-spring-pop) 80ms both; }

  /* the card: paper, lifted, travelling to its element on the overlay's spring */
  .xr-card { position: absolute; left: 0; top: 0; width: ${CARD_W}px; box-sizing: border-box; padding: 14px 14px 12px; border-radius: 18px;
    background: var(--pl-bg-surface); color: var(--pl-text-primary); box-shadow: var(--pl-shadow-card); font: 500 12px/16px var(--pl-sans);
    transition: transform 420ms var(--pl-spring); }
  .xr-card[data-fresh] { transition: none; }
  .xr-head { display: grid; grid-template-columns: 30px 1fr; gap: 0 10px; align-items: center; }
  .xr-head .toy { grid-row: span 2; width: 30px; height: 30px; }
  .xr-head .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .xr-head b { font: 700 14px/18px var(--pl-sans); letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr-head code { font: 500 11px/14px var(--pl-mono); color: var(--pl-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
  .xr-head code.none { color: var(--pl-text-tertiary, var(--pl-text-secondary)); direction: ltr; }

  /* the box, drawn small: each ring in its pattern, each side's value on it */
  .xr-box { position: relative; margin: 12px 0 4px; height: 148px; border-radius: 14px; background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); }
  .xr-box .ring { position: absolute; border-radius: 12px; }
  .xr-box .m { inset: 8px; border: 1.5px dashed color-mix(in oklab, var(--pl-butter) 85%, var(--pl-text-primary)); background: radial-gradient(color-mix(in oklab, var(--pl-butter) 70%, transparent) 1px, transparent 1.4px) 0 0 / 6px 6px; }
  .xr-box .p { inset: 30px 38px; border-radius: 10px; background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--c) 55%, transparent) 0 2px, transparent 2px 5px), color-mix(in oklab, var(--c) 10%, var(--pl-bg-surface)); box-shadow: 0 0 0 1.5px var(--c); }
  .xr-box .c { inset: 56px 70px; border-radius: 6px; display: grid; place-items: center; background: var(--pl-bg-surface); box-shadow: 0 1px 2px rgb(0 0 0 / .12); font: 600 10.5px/1 var(--pl-mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .xr-box .v { position: absolute; translate: -50% -50%; display: inline-flex; gap: 3px; align-items: baseline; padding: 2px 5px; border-radius: 99px; white-space: nowrap;
    font: 600 10.5px/1.1 var(--pl-mono); font-variant-numeric: tabular-nums; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px color-mix(in oklab, var(--c) 45%, transparent); color: var(--pl-text-primary); }
  .xr-box .v i { font-style: normal; color: var(--c); }
  .xr-box .v.zero { box-shadow: 0 0 0 1px var(--pl-border-default); color: var(--pl-text-secondary); }
  .xr-box .lab { position: absolute; font: 600 9.5px/1 var(--pl-sans); letter-spacing: .02em; text-transform: uppercase; color: var(--pl-text-secondary); }

  .xr-rows { display: grid; gap: 2px; margin-top: 8px; }
  .xr-row { display: grid; grid-template-columns: 22px 58px 1fr; gap: 8px; align-items: center; min-height: 30px; padding: 0 4px; border-radius: 10px; animation: xr-row 360ms var(--pl-ease-out) both; }
  .xr-row .toy { width: 22px; height: 22px; } .xr-row .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .xr-row .k { color: var(--pl-text-secondary); font-weight: 600; }
  .xr-row .val { display: flex; flex-wrap: nowrap; white-space: nowrap; gap: 4px 6px; align-items: center; font: 500 12px/16px var(--pl-mono); font-variant-numeric: tabular-nums; }
  @keyframes xr-row { from { opacity: 0; translate: 0 4px; } }
  .xr-tok { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 99px; font: 600 11px/1 var(--pl-sans); }
  .xr-tok.on { background: var(--pl-mint-soft); color: var(--pl-mint-ink); }
  .xr-tok.off { background: var(--pl-coral-soft); color: var(--pl-coral-ink); }
  /* a number you can change: it looks pressable, lifts under the pointer, and says how (drag sideways) */
  .xr-card .ch { cursor: ew-resize; touch-action: none; user-select: none; -webkit-user-select: none; transition: background-color 140ms var(--pl-ease-out), box-shadow 140ms var(--pl-ease-out), scale 220ms var(--pl-spring-pop); }
  .xr-card .ch.n { display: inline-grid; place-items: center; min-width: 28px; height: 22px; padding: 0 6px; border-radius: 7px; background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default); }
  .xr-card .ch:hover { background: var(--pl-sky-soft); scale: 1.06; }
  .xr-card .ch[data-held] { background: var(--pl-sky); color: #fff; scale: 1.1; }
  .xr-card .ch[data-held] i { color: #fff; }
  .xr-card .ch[data-changed]:not([data-held]) { box-shadow: 0 0 0 1.5px var(--pl-pink); }
  .xr-chip { display: inline-grid; place-items: center; width: 30px; height: 20px; border-radius: 6px; font-size: 12px; line-height: 1; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .12); }
  .xr-sw { display: inline-block; width: 16px; height: 16px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); vertical-align: -3px; }
  .xr-aa { font-family: var(--pl-sans); font-weight: 700; }
  /* the same element, another part pointed at: nothing arrives again; only what changed is redrawn, still */
  .xr[data-still] .xr-draw, .xr[data-still] .ruler-pill, .xr-card[data-still] .xr-row { animation: none; }
  @media (prefers-reduced-motion: reduce) { .xr .xr-draw, .xr .ruler-pill, .xr-row { animation: none; } .xr-card { transition: none; } }
`;

// what kind of part an element is, by its tag and role: the toy at the head of its card
function partOf(el) {
  const t = el.localName, role = el.getAttribute('role');
  if (t === 'button' || role === 'button') return 'button';
  if (t === 'a') return 'link';
  if (t === 'img' || t === 'picture') return 'image';
  if (t === 'svg') return 'icon';
  if (t === 'input') return el.type === 'checkbox' ? 'checkbox' : 'input';
  if (/^h[1-6]$/.test(t)) return 'heading';
  if (t === 'ul' || t === 'ol') return 'list';
  if (t === 'nav') return 'navigation';
  if (t === 'header') return 'header';
  if (t === 'p' || t === 'span' || t === 'li') return 'text';
  const cs = getComputedStyle(el);
  if (/flex|grid/.test(cs.display) && cs.flexDirection !== 'column' && el.children.length > 1 && !/column/.test(cs.gridAutoFlow)) return 'row';
  return 'card';
}

// a colour as the eye reads it, and the first painted background behind an element
const rgbOf = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
const hex = ([r, g, b]) => `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
function backdrop(el) {
  for (let e = el; e; e = e.parentElement) { const c = rgbOf(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c; }
  return [255, 255, 255];
}
const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** The X-ray of one element: the drawing on it and the card beside it, as html for a positioned layer. */
export function xray(el, { tokenOf, origin = { left: 0, top: 0 }, room, source, name, fresh = false, zone = null, lit = [] } = {}) {
  const cs = getComputedStyle(el), R = el.getBoundingClientRect();
  const r = { left: R.left - origin.left, top: R.top - origin.top, right: R.right - origin.left, bottom: R.bottom - origin.top, width: R.width, height: R.height };
  room ??= { left: 8, top: 8, right: innerWidth - origin.left - 8, bottom: innerHeight - origin.top - 8 };
  // a value's verdict: on the scale (its token), off it, or not judged
  const judge = (family, n) => {
    if (!n) return { n: 0, c: 'var(--pl-icon-tick, #bbb)', zero: true };
    if (!tokenOf) return { n: r1(n), c: 'var(--pl-sky)' };
    const t = tokenOf(family, n);
    return t ? { n: r1(n), t, on: true, c: 'var(--pl-mint)' } : { n: r1(n), off: true, c: 'var(--pl-coral)' };
  };
  const m = SIDES.map((s) => px(cs.getPropertyValue(`margin-${s}`)));
  const b = SIDES.map((s) => (cs.getPropertyValue(`border-${s}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s}-width`))));
  const p = SIDES.map((s) => px(cs.getPropertyValue(`padding-${s}`)));
  const pj = p.map((n) => judge('spacing', n)), mj = m.map((n) => judge('spacing', n));
  const G = gaps(el, cs).map((g) => ({ ...g, x: g.x - origin.left, y: g.y - origin.top }));
  const gj = G.length ? judge('spacing', G[0].n) : null;
  const rad = px(cs.borderTopLeftRadius), rj = judge('radius', rad);
  const fs = px(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.2 : px(cs.lineHeight), tj = judge('type', fs);
  const anyOff = [...pj, ...mj, gj, rj, tj].some((v) => v?.off);
  const ink = anyOff ? 'var(--pl-coral)' : tokenOf ? 'var(--pl-mint)' : 'var(--pl-sky)';

  // ── on the element ──
  const pat = (id, c, body) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"${id.includes('h') ? ' patternTransform="rotate(45)"' : ''}>${body(c)}</pattern>`;
  const hues = { mint: 'var(--pl-mint)', coral: 'var(--pl-coral)', sky: 'var(--pl-sky)', tick: 'var(--pl-icon-tick, #bbb)' };
  const defs = Object.entries(hues).map(([k, c]) => pat(`xrh-${k}`, c, (h) => `<rect width="2" height="5" fill="${h}" opacity=".75"/>`)
    + pat(`xrd-${k}`, c, (h) => `<circle cx="2.5" cy="2.5" r="1" fill="${h}"/>`)
    + pat(`xrs-${k}`, c, (h) => `<rect width="1.6" height="5" fill="${h}" opacity=".8"/>`)).join('');
  const key = (v) => (v.zero ? 'tick' : v.off ? 'coral' : v.on ? 'mint' : 'sky');
  const rect = (x, y, w, h, fill, extra = '') => (w > 0.5 && h > 0.5 ? `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fill}" ${extra}/>` : '');
  const ix = r.left + b[3], iy = r.top + b[0], iw = r.width - b[1] - b[3], ih = r.height - b[0] - b[2];
  const tint = (v) => `color-mix(in oklab, ${v.c} 12%, transparent)`;
  let draw = '';
  // margin, dotted, outside the border
  [[r.left - m[3], r.top - m[0], r.width + m[1] + m[3], m[0]], [r.right, r.top, m[1], r.height], [r.left - m[3], r.bottom, r.width + m[1] + m[3], m[2]], [r.left - m[3], r.top, m[3], r.height]]
    .forEach(([x, y, w, h], i) => { if (m[i]) draw += rect(x, y, w, h, `url(#xrd-${key(mj[i])})`); });
  // padding, hatched, inside it
  [[ix, iy, iw, p[0]], [ix + iw - p[1], iy + p[0], p[1], ih - p[0] - p[2]], [ix, iy + ih - p[2], iw, p[2]], [ix, iy + p[0], p[3], ih - p[0] - p[2]]]
    .forEach(([x, y, w, h], i) => { if (p[i]) draw += rect(x, y, w, h, tint(pj[i])) + rect(x, y, w, h, `url(#xrh-${key(pj[i])})`); });
  // gaps, striped
  for (const g of G) draw += rect(g.x, g.y, g.w, g.h, tint(gj)) + rect(g.x, g.y, g.w, g.h, `url(#xrs-${key(gj)})`);
  // the content, a faint dashed line; the element's own edge at its own corners, coral and dashed while anything's off
  draw += rect(ix + p[3], iy + p[0], iw - p[1] - p[3], ih - p[0] - p[2], 'none', `stroke="var(--pl-sky)" stroke-opacity=".55" stroke-dasharray="3 3" rx="${Math.max(0, rad - Math.max(p[0], p[3]))}"`);
  draw += rect(r.left, r.top, r.width, r.height, 'none', `stroke="${ink}" stroke-width="1.5" rx="${Math.min(rad, r.width / 2, r.height / 2)}"${anyOff ? ' stroke-dasharray="4 3"' : ''}`);
  // corners: where it rounds, the arc traced thick in its verdict
  if (rad > 1) {
    const k = Math.min(rad, r.width / 2, r.height / 2);
    const arcs = [[r.left, r.top + k, r.left + k, r.top, 1], [r.right - k, r.top, r.right, r.top + k, 1], [r.right, r.bottom - k, r.right - k, r.bottom, 1], [r.left + k, r.bottom, r.left, r.bottom - k, 1]];
    draw += arcs.map(([x1, y1, x2, y2]) => `<path d="M${r1(x1)} ${r1(y1)}A${r1(k)} ${r1(k)} 0 0 1 ${r1(x2)} ${r1(y2)}" fill="none" stroke="${rj.c}" stroke-width="3" stroke-linecap="round"/>`).join('');
  }
  // rulers: width above, height to the right, just clear of the margin
  const above = r.top - m[0] - 12, beside = r.right + m[1] + 12;
  const tick = 'stroke="var(--pl-sky)" stroke-width="1.25"';
  draw += `<path d="M${r1(r.left)} ${r1(above)}H${r1(r.right)}M${r1(r.left)} ${r1(above - 4)}v8M${r1(r.right)} ${r1(above - 4)}v8M${r1(beside)} ${r1(r.top)}V${r1(r.bottom)}M${r1(beside - 4)} ${r1(r.top)}h8M${r1(beside - 4)} ${r1(r.bottom)}h8" ${tick} fill="none"/>`;
  // the part in hand: drawn stronger, with one pill that says it and the key that changes it
  let said = '';
  if (zone) {
    const zj = judge(zone.family, zone.n), zx = zone.x - origin.left, zy = zone.y - origin.top;
    if (zj.zero) zj.c = 'var(--pl-sky)';
    draw += `<rect class="xr-zone" x="${r1(zx)}" y="${r1(zy)}" width="${r1(zone.w)}" height="${r1(zone.h)}" rx="${zone.family === 'radius' ? 4 : 2}" fill="color-mix(in oklab, ${zj.c} 22%, transparent)" stroke="${zj.c}" stroke-width="2"${zj.zero ? ' stroke-dasharray="4 3"' : ''}/>`;
    said = `<span class="xr-say" style="left:${r1(zx + zone.w / 2)}px;top:${r1(zy + zone.h + 8)}px"><b>${esc(zone.said)}</b> ${zone.family === 'radius' && zone.n > 500 ? '' : zj.n}${zj.t ? ` <i class="on">${esc(zj.t)}</i>` : zj.off ? ' <i class="off">off scale</i>' : ''}</span>`;
  }
  // parts in hand while a picker has them: drawn strong, no pill (the picker says it)
  for (const lz of lit) { const lj = judge(lz.family, lz.n); draw += `<rect class="xr-zone" x="${r1(lz.x - origin.left)}" y="${r1(lz.y - origin.top)}" width="${r1(lz.w)}" height="${r1(lz.h)}" rx="2" fill="color-mix(in oklab, ${lj.c} 22%, transparent)" stroke="${lj.c}" stroke-width="2"/>`; }
  const wSz = sizing(el, cs, 'w'), hSz = sizing(el, cs, 'h');
  // the rulers' numbers carry their verdict too: deep coral off your sizes, deep mint on one (with its name)
  const sz = (n) => { const v = judge('size', n); return v.off ? 'background:var(--pl-coral-ink)' : v.on ? 'background:var(--pl-mint-ink)' : ''; };
  const named = (txt, n) => { const v = judge('size', n); return v.on ? `${txt} · ${v.t}` : txt; };
  const pills = `<span class="ruler-pill" style="left:${r1(r.left + r.width / 2)}px;top:${r1(above)}px;${sz(r.width)}">${esc(named(wSz, r.width))}</span>`
    + `<span class="ruler-pill" style="left:${r1(beside)}px;top:${r1(r.top + r.height / 2)}px;${sz(r.height)}">${esc(named(hSz, r.height))}</span>` + said;

  // ── the card ──
  const tok = (v) => (v.zero ? '' : v.on ? `<span class="xr-tok on">${esc(v.t)}</span>` : v.off ? '<span class="xr-tok off">off scale</span>' : '');
  // every number is a control: data-prop names the property it changes (drag it, scroll on it, click it for a list)
  const side = (v, x, y, prop) => `<span class="v ch${v.zero ? ' zero' : ''}" data-prop="${prop}" style="--c:${v.c};left:${x};top:${y}">${v.n}${v.t ? `<i>${esc(v.t)}</i>` : ''}</span>`;
  const chip = (prop, v, txt = v.n) => `<span class="ch n" data-prop="${prop}">${txt}</span>`;
  const pc = pj.some((v) => v.off) ? 'var(--pl-coral)' : tokenOf ? 'var(--pl-mint)' : 'var(--pl-sky)';
  const box = `<div class="xr-box">
      <span class="ring m"></span><span class="lab" style="left:14px;top:13px">margin</span>
      <span class="ring p" style="--c:${pc}"></span><span class="lab" style="left:44px;top:35px">padding</span>
      <span class="ring c">${Math.round(r.width - b[1] - b[3] - p[1] - p[3])} × ${Math.round(r.height - b[0] - b[2] - p[0] - p[2])}</span>
      ${side(mj[0], '50%', '19px', 'margin-top')}${side(mj[1], 'calc(100% - 23px)', '50%', 'margin-right')}${side(mj[2], '50%', 'calc(100% - 19px)', 'margin-bottom')}${side(mj[3], '23px', '50%', 'margin-left')}
      ${side(pj[0], '50%', '43px', 'padding-top')}${side(pj[1], 'calc(100% - 54px)', '50%', 'padding-right')}${side(pj[2], '50%', 'calc(100% - 43px)', 'padding-bottom')}${side(pj[3], '54px', '50%', 'padding-left')}
    </div>`;
  const fg = rgbOf(cs.color), bg = backdrop(el), ratio = contrast(fg, bg), big = fs >= 24 || (fs >= 18.66 && px(cs.fontWeight) >= 700);
  const pass = ratio >= (big ? 3 : 4.5);
  const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const rows = [
    ['size', 'Size', `${chip('width', judge('size', r.width), Math.round(r.width))}<span style="color:var(--pl-text-secondary)">×</span>${chip('height', judge('size', r.height), Math.round(r.height))}`],
    ['corner', 'Corner', `${chip('border-radius', rj, rad > 500 ? 'full' : rj.n)}${tok(rj)}`],
    gj ? ['gap', 'Gap', `${chip('gap', gj)}${tok(gj)}`] : null,
    ['type', 'Type', `${chip('font-size', tj, r1(fs))}<span style="color:var(--pl-text-secondary)">/${r1(lh)} · ${cs.fontWeight}</span>${tok(tj)}`],
    ['text colour', 'Colour', `<span class="xr-chip" style="color:${hex(fg)};background:${hex(bg)};font-family:${esc(cs.fontFamily)};font-weight:${cs.fontWeight}" title="${hex(fg)} on ${hex(bg)}">Aa</span>${ratio.toFixed(1)}<span class="xr-tok ${pass ? 'on' : 'off'}"><span class="xr-aa">${pass ? 'AA' : 'Below AA'}</span></span>`],
  ].filter(Boolean);
  const card = `<div class="xr-head"><i class="toy">${toyOf(partOf(el))}</i><b>${esc(name ?? el.localName)}</b>${source ? `<code>${esc(source)}</code>` : '<code class="none">not tied to a line yet</code>'}</div>
    ${box}
    <div class="xr-rows">${rows.map(([t, k, v], i) => `<div class="xr-row" style="animation-delay:${60 + i * 45}ms"><i class="toy">${toyOf(t)}</i><span class="k">${k}</span><span class="val">${v}</span></div>`).join('')}</div>`;
  // beside the element where there's room, else the other side, else below; always inside the room
  const H = 196 + rows.length * 32;
  let cx = r.right + m[1] + 36;
  if (cx + CARD_W > room.right) cx = r.left - m[3] - 24 - CARD_W;
  let cy = r.top;
  if (cx < room.left) { cx = Math.min(Math.max(room.left, r.left), room.right - CARD_W); cy = r.bottom + m[2] + 24; }
  cy = Math.max(room.top, Math.min(cy, room.bottom - H));
  return {
    page: `<svg class="xr-on" aria-hidden="true"><defs>${defs}</defs><g class="xr-draw">${draw}</g></svg>${pills}`,
    card, at: { x: Math.round(cx), y: Math.round(cy) }, fresh,
  };
}

/* The parts of an element you can point at, each a property you can change: a padding side, a gap, a corner, the
 * words. Viewport rects, smallest first, so the pointer finds the most particular one. */
export function zonesOf(el) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const b = SIDES.map((s) => (cs.getPropertyValue(`border-${s}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s}-width`))));
  const p = SIDES.map((s) => px(cs.getPropertyValue(`padding-${s}`)));
  const ix = r.left + b[3], iy = r.top + b[0], iw = r.width - b[1] - b[3], ih = r.height - b[0] - b[2];
  const out = [];
  const add = (z) => { if (z.w > 0.5 && z.h > 0.5) out.push(z); };
  const rad = px(cs.borderTopLeftRadius);
  if (rad > 1) { const k = Math.max(10, Math.min(rad, r.width / 2, r.height / 2)); [[r.left, r.top], [r.right - k, r.top], [r.right - k, r.bottom - k], [r.left, r.bottom - k]].forEach(([x, y]) => add({ prop: 'border-radius', family: 'radius', toy: 'corner', said: 'Corner', n: rad, x, y, w: k, h: k })); }
  const pad = [[ix, iy, iw, p[0]], [ix + iw - p[1], iy + p[0], p[1], ih - p[0] - p[2]], [ix, iy + ih - p[2], iw, p[2]], [ix, iy + p[0], p[3], ih - p[0] - p[2]]];
  pad.forEach(([x, y, w, h], i) => add({ prop: `padding-${SIDES[i]}`, side: SIDES[i], box: 'padding', family: 'spacing', toy: 'padding', said: `Padding ${SIDES[i]}`, n: p[i], x, y, w, h }));
  for (const g of gaps(el, cs)) add({ prop: g.col ? 'row-gap' : 'column-gap', family: 'spacing', toy: 'gap', said: 'Gap', n: g.n, x: g.x, y: g.y, w: g.w, h: g.h, col: g.col });
  // margin, outside each side: always a band to take hold of, even at 0 (then a thin one, 10px)
  const m = SIDES.map((s) => px(cs.getPropertyValue(`margin-${s}`))), M = m.map((n) => Math.max(n, 10));
  [[r.left, r.top - M[0], r.width, M[0]], [r.right, r.top, M[1], r.height], [r.left, r.bottom, r.width, M[2]], [r.left - M[3], r.top, M[3], r.height]]
    .forEach(([x, y, w, h], i) => add({ prop: `margin-${SIDES[i]}`, side: SIDES[i], box: 'margin', family: 'spacing', toy: 'margin', said: `Margin ${SIDES[i]}`, n: m[i], x, y, w, h, outside: true }));
  // width and height: their rulers, just clear of the margin (where the X-ray draws them)
  const above = r.top - m[0] - 12, beside = r.right + m[1] + 12;
  add({ prop: 'width', family: 'size', toy: 'width', said: 'Width', n: r.width, x: r.left, y: above - 9, w: r.width, h: 18, outside: true });
  add({ prop: 'height', family: 'size', toy: 'height', said: 'Height', n: r.height, x: beside - 9, y: r.top, w: 18, h: r.height, outside: true });
  const words = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  if (words) add({ prop: 'font-size', family: 'type', toy: 'type', said: 'Text size', n: px(cs.fontSize), x: ix + p[3], y: iy + p[0], w: iw - p[1] - p[3], h: ih - p[0] - p[2] });
  return out;
}
export const zoneAt = (zones, x, y) => zones.filter((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h).sort((a, b) => a.w * a.h - b.w * b.h)[0] ?? null;

/* The grips on the page: one per value you can change, always visible while the element is shown, each where its
 * value lives. Padding inside its side, margin outside it (even at 0), width and height on the right and bottom
 * edges, the corner on its arc, a gap in its middle. Along a side they never stack: padding at 35%, the edge at 50%,
 * margin at 65%. `sign(dx, dy)` turns a drag into px of the value (inward grows padding, outward grows margin). */
export function gripsOf(el) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const p = SIDES.map((s) => px(cs.getPropertyValue(`padding-${s}`))), m = SIDES.map((s) => px(cs.getPropertyValue(`margin-${s}`)));
  const out = [];
  const along = (side, f) => (side === 'top' || side === 'bottom' ? [r.left + r.width * f, side === 'top' ? r.top : r.bottom] : [side === 'left' ? r.left : r.right, r.top + r.height * f]);
  const IN = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };
  SIDES.forEach((side, i) => {
    const [ux, uy] = IN[side], flat = side === 'top' || side === 'bottom';
    let [x, y] = along(side, 0.35);
    out.push({ prop: `padding-${side}`, box: 'padding', side, family: 'spacing', n: p[i], x: x + ux * Math.max(p[i] / 2, 5), y: y + uy * Math.max(p[i] / 2, 5), flat, sign: (dx, dy) => dx * ux + dy * uy });
    [x, y] = along(side, 0.65);
    out.push({ prop: `margin-${side}`, box: 'margin', side, family: 'spacing', n: m[i], x: x - ux * Math.max(m[i] / 2, 7), y: y - uy * Math.max(m[i] / 2, 7), flat, sign: (dx, dy) => -(dx * ux + dy * uy) });
  });
  out.push({ prop: 'width', family: 'size', n: r.width, x: r.right, y: r.top + r.height / 2, flat: false, edge: true, sign: (dx) => dx });
  out.push({ prop: 'height', family: 'size', n: r.height, x: r.left + r.width / 2, y: r.bottom, flat: true, edge: true, sign: (dx, dy) => dy });
  const rad = px(cs.borderTopLeftRadius), k = Math.min(rad, r.width / 2, r.height / 2);
  out.push({ prop: 'border-radius', family: 'radius', n: rad, x: r.left + Math.max(k * 0.29, 6), y: r.top + Math.max(k * 0.29, 6), dot: true, sign: (dx, dy) => (dx + dy) / 2 });
  const g = gaps(el, cs)[0];
  if (g) out.push({ prop: 'gap', family: 'spacing', n: g.n, x: g.x + g.w / 2, y: g.y + g.h / 2, flat: !g.col ? false : true, gap: true, sign: g.col ? (dx, dy) => dy : (dx) => dx });
  return out;
}

/* A repeated part (the rows of a list, a grid of cards, every avatar in them) is one part of your code drawn in many
 * places; a change to it is a change to that line, so by default it reaches every place (owner, 2026-11-13: "when we
 * have these repetitive elements the default behaviour should be to apply the changes to all the components not just
 * one"). The places are found by the element's place in your code, its stamp: every element the same line draws.
 * keyOf/all: another way to tell the places (the design site's demo uses its own labels). Alt as a change starts
 * changes only the one pointed at. */
export function peersOf(el, keyOf = placeOf, all = (k) => document.querySelectorAll(atPlace(k))) {
  const k = keyOf(el);
  const found = k ? [...all(k)] : [];
  return found.includes(el) ? found : [el];
}

/* Where the card goes: beside its element, never on it. `box` is the element with its margin and rulers (in the
 * card's coordinates), `size` the card's own measured size, `room` where it must stay. Right of the element, else
 * left, else below, else above: the first side where the whole card fits. Along that side it slides to stay in the
 * room, but it never crosses onto the element. If no side fits, the side with the most room, clear of the element. */
export function placeCard(box, size, room, gap = 16) {
  const { w, h } = size, clampY = (y) => Math.max(room.top, Math.min(y, room.bottom - h)), clampX = (x) => Math.max(room.left, Math.min(x, room.right - w));
  const sides = [
    { fit: room.right - (box.right + gap), need: w, at: () => ({ x: box.right + gap, y: clampY(box.top) }) },
    { fit: box.left - gap - room.left, need: w, at: () => ({ x: box.left - gap - w, y: clampY(box.top) }) },
    { fit: room.bottom - (box.bottom + gap), need: h, at: () => ({ x: clampX(box.left), y: box.bottom + gap }) },
    { fit: box.top - gap - room.top, need: h, at: () => ({ x: clampX(box.left), y: box.top - gap - h }) },
  ];
  const side = sides.find((s) => s.fit >= s.need) ?? sides.reduce((a, b) => (b.fit / b.need > a.fit / a.need ? b : a));
  const at = side.at();
  return { x: Math.round(at.x), y: Math.round(at.y) };
}

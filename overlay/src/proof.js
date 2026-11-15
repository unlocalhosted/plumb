/* ─────────────────────────────────────────────────────────
 * PROOF · React Plumber overlay
 *
 * What a finding draws on the page when it is the one in hand in Blueprint, so you see the fault yourself instead of
 * taking the words for it: the way a designer breaks a screen down for an engineer (owner, 2026-11-15: "its essential
 * to show lines and breaking things to user otherwise he wont believe us"). The lines the good siblings share, run
 * across all of them and a little past; the break in coral; its size in one pill, placed where it covers no words.
 *
 *  proofSvg(el, proof, { pill }) → SVG markup in viewport coordinates, or '' for a finding with no proof
 *    edge     the column's edge, 3px out in the gutter (a line on a text's edge would touch every letter), broken
 *             wherever it would still pass words or an icon; the gap shaded; "5px right"
 *    height   the top and bottom every other one sits between, across the row; the part past them shaded; "+4px"
 *    corners  every sibling's corners traced in sky, the odd one's in coral; "3px → full"
 *    icon     through every row, the line its icon sits on, stopping before the words; the odd one's in coral; "2px low"
 *
 * Colours are the overlay's: --pl-instrument (sky) for what agrees, --pl-off (coral) for what breaks. Reads only.
 * ───────────────────────────────────────────────────────── */

const OVER = 14, GUTTER = 3;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const SKY = 'var(--pl-instrument)', CORAL = 'var(--pl-off)', HALO = 'var(--pl-halo)';
const seg = (x1, y1, x2, y2, c = SKY) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${HALO}" stroke-width="3" fill="none"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="1.25" fill="none" stroke-linecap="round"/>`;
const shade = (x, y, w, h) => (w > 0.3 && h > 0.3 ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${CORAL}" fill-opacity=".22"/>` : '');

// what words and pictures are on screen, for the pill to keep clear of
function busy() {
  const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.trim() && !t.parentElement?.closest('[data-plumb-layer], plumb-overlay') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  for (let t = w.nextNode(); t && out.length < 600; t = w.nextNode()) {
    const r = document.createRange(); r.selectNodeContents(t);
    for (const b of r.getClientRects()) if (b.width && b.bottom > 0 && b.top < innerHeight) out.push(b);
  }
  for (const i of document.querySelectorAll('svg, img')) { const b = i.getBoundingClientRect(); if (b.width && b.bottom > 0 && b.top < innerHeight && !i.closest('[data-plumb-layer], plumb-overlay') && !i.parentElement?.closest('svg')) out.push(b); }
  return out;
}
function pill(r, y, text, taken) {
  const w = text.length * 6.6 + 14, h = 20, cx = (r.left + r.right) / 2 - w / 2;
  const spots = [[r.right + 10, y - h / 2], [r.left - 10 - w, y - h / 2]];
  for (let k = 0; k < 6; k++) spots.push([cx, r.top - 8 - h - k * 14], [cx, r.bottom + 8 + k * 14]);
  spots.sort((a, b) => Math.hypot(a[0] + w / 2 - (r.left + r.right) / 2, a[1] + h / 2 - y) - Math.hypot(b[0] + w / 2 - (r.left + r.right) / 2, b[1] + h / 2 - y));
  const covered = ([x, t]) => (x < 4 || t < 4 || x + w > innerWidth - 4 || t + h > innerHeight - 4 ? Infinity
    : taken.reduce((s, b) => s + Math.max(0, Math.min(b.right + 2, x + w) - Math.max(b.left - 2, x)) * Math.max(0, Math.min(b.bottom + 2, t + h) - Math.max(b.top - 2, t)), 0));
  const [x, t] = spots.reduce((best, sp) => (covered(sp) < covered(best) ? sp : best), spots[0]);
  return `<rect x="${x}" y="${t}" width="${w}" height="${h}" rx="7" fill="var(--pl-coral-soft)" stroke="${HALO}"/><text x="${x + w / 2}" y="${t + 14}" text-anchor="middle" fill="var(--pl-coral-ink)" style="font: 600 11px var(--pl-mono); font-variant-numeric: tabular-nums">${esc(text)}</text>`;
}
function corners(b, rr, c) {
  const o = 2.5, R = Math.min(rr, b.height / 2, b.width / 2) + o, L = b.left - o, T = b.top - o, Rt = b.right + o, B = b.bottom + o, k = Math.max(R, 7);
  const arc = (x, y, sx, sy) => (R > o + 0.5 ? `M${x} ${y + sy * k}V${y + sy * R}A${R} ${R} 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * R} ${y}H${x + sx * k}` : `M${x} ${y + sy * k}V${y}H${x + sx * k}`);
  const d = [arc(L, T, 1, 1), arc(Rt, T, -1, 1), arc(L, B, 1, -1), arc(Rt, B, -1, -1)].join('');
  return `<path d="${d}" stroke="${HALO}" stroke-width="3.5" fill="none"/><path d="${d}" stroke="${c}" stroke-width="1.5" fill="none"/>`;
}
const radiusOf = (el) => { const b = el.getBoundingClientRect(); return Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.height / 2); };
const radiusWord = (el) => { const b = el.getBoundingClientRect(), r = radiusOf(el); return r >= b.height / 2 - 0.5 ? 'full' : `${Math.round(r)}px`; };
const firstWords = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) }); const t = w.nextNode(); if (!t) return null; const r = document.createRange(); r.selectNodeContents(t); return r.getClientRects()[0] ?? null; };
const iconOf = (el) => [...el.querySelectorAll('svg, img')].find((i) => !i.parentElement.closest('svg') && i.getBoundingClientRect().height > 0) ?? null;

export function proofSvg(el, proof) {
  if (!el?.isConnected || !proof) return '';
  const r = el.getBoundingClientRect(), others = (proof.others ?? []).filter((o) => o.isConnected), os = others.map((o) => o.getBoundingClientRect());
  const taken = busy(), lines = [], breaks = [];
  if (proof.kind === 'edge') {
    // the column's edge in the gutter beside it, from the first row to the last and a little past, cut at words
    const x = Math.round((proof.x - GUTTER) * 2) / 2, all = [r, ...os];
    const top = Math.min(...all.map((b) => b.top)) - OVER, bottom = Math.max(...all.map((b) => b.bottom)) + OVER;
    const cuts = taken.filter((b) => b.left - 3 < x && b.right + 3 > x && b.bottom > top && b.top < bottom).map((b) => [b.top - 3, b.bottom + 3]).sort((a, b) => a[0] - b[0]);
    let y = top;
    for (const [a, b] of cuts) { if (a > y + 2) lines.push(seg(x, y, x, a)); y = Math.max(y, b); }
    if (bottom > y + 2) lines.push(seg(x, y, x, bottom));
    lines.push(`<path d="M${x - 4} ${top}h8" stroke="${SKY}" stroke-width="1.5"/>`);
    const w = firstWords(el) ?? proof.words, ex = w.left - GUTTER;
    breaks.push(shade(Math.min(ex, x), w.top - 4, Math.abs(ex - x), w.bottom - w.top + 8));
    breaks.push(seg(ex, w.top - 4, ex, w.bottom + 4, CORAL));
  } else if (proof.kind === 'height') {
    const top = median(os.map((b) => b.top)), bottom = median(os.map((b) => b.bottom)), all = [r, ...os];
    const x0 = Math.min(...all.map((b) => b.left)) - OVER, x1 = Math.max(...all.map((b) => b.right)) + OVER;
    lines.push(seg(x0, top, x1, top), seg(x0, bottom, x1, bottom));
    breaks.push(shade(r.left, Math.min(r.top, top), r.width, Math.abs(r.top - top)), shade(r.left, Math.min(r.bottom, bottom), r.width, Math.abs(r.bottom - bottom)));
    breaks.push(seg(r.left, r.top, r.right, r.top, CORAL), seg(r.left, r.bottom, r.right, r.bottom, CORAL));
    const was = proof.rect?.height ?? r.height;
  } else if (proof.kind === 'corners') {
    // the corners as found, not as previewed: Blueprint may already be showing the fix on the element
    const word = (rad, h) => (rad >= h / 2 - 0.5 ? 'full' : `${Math.round(rad)}px`);
    for (const o of others) lines.push(corners(o.getBoundingClientRect(), radiusOf(o), SKY));
    breaks.push(corners(r, proof.mineR ?? radiusOf(el), CORAL));
  } else if (proof.kind === 'icon') {
    const across = (row, y) => { const i = iconOf(row)?.getBoundingClientRect(), t = firstWords(row); return i && t ? [i.left - 6, y, Math.max(i.right + 2, t.left - 3), y] : null; };
    for (const o of others) { const i = iconOf(o)?.getBoundingClientRect(), a = i && across(o, (i.top + i.bottom) / 2); if (a) lines.push(seg(...a)); }
    const icon = proof.icon?.isConnected ? proof.icon : iconOf(el), b = icon?.getBoundingClientRect();
    if (b) {
      const now = (b.top + b.bottom) / 2, want = now - proof.by, a = across(el, want);
      if (a) lines.push(seg(...a));
      breaks.push(shade(b.left, Math.min(now, want), b.width, Math.abs(proof.by)));
      if (a) breaks.push(seg(a[0], now, a[2], now, CORAL));
    }
  }
  return lines.join('') + breaks.join('');
}

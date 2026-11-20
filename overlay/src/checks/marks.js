// What the Anti-slop and Words examples share: words that change in place, a line that folds away, and a dashed
// box on exactly the words or mark the check is about (it shrinks with them as they go).
import { at, make, box, pillOver, pillUnder } from '../check-kit.js';

export const scene = (s, html, bg = '') => { s.innerHTML = `<div class="ck-scene"${bg ? ` style="background:${bg}"` : ''}>${html}</div>`; };
// a phrase that becomes another, in the run of a line: both sit in one cell, the cell's width moves between theirs
export const phrase = (a, b = '', cls = '') => `<span class="ph ${cls}" style="display:inline-grid;vertical-align:bottom;white-space:nowrap;overflow:hidden"><span class="pa" style="grid-area:1/1;justify-self:start">${a}</span><span class="pb" style="grid-area:1/1;justify-self:start;opacity:0">${b}</span></span>`;
// widths are measured each time it changes, not once: a web font that arrives late changes them
export const wirePhrase = (el) => {
  const a = el.querySelector('.pa'), b = el.querySelector('.pb'), w = (n) => (n.textContent ? n.getBoundingClientRect().width : 0);
  el.style.width = `${w(a)}px`;
  return (p) => { el.style.width = `${p ? w(b) : w(a)}px`; a.style.opacity = p ? 0 : 1; b.style.opacity = p ? 1 : 0; };
};
// a whole line that folds away: its height, gap and ink go to nothing
export const fold = (el) => {
  const cs = getComputedStyle(el), h = el.getBoundingClientRect().height, m = cs.marginBottom, [pt, pb] = [cs.paddingTop, cs.paddingBottom];
  el.style.height = `${h}px`; el.style.overflow = 'hidden'; el.style.boxSizing = 'border-box';
  // its padding folds too, so nothing of it is left once it is gone
  return (p) => { el.style.height = p ? '0px' : `${h}px`; el.style.opacity = p ? 0 : 1; el.style.marginBottom = p ? '0px' : m; el.style.paddingTop = p ? '0px' : pt; el.style.paddingBottom = p ? '0px' : pb; };
};
// dashed boxes on the marks the check is about, and the pill; they fade as the marks fold to nothing
export const marked = (s, els, labels, { under = false, right = false, dy = 18, pad = 4, round = 6, anchor } = {}) => {
  const boxes = els.map(() => make(s, 'sq')), pill = make(s, 'pill');
  return { labels, guides: [...boxes.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
    track: () => { els.forEach((e, i) => { const b = box(e, s), seen = Math.min(1, b.w / 8, b.h / 6); at(boxes[i], `left:${b.l - pad}px;top:${b.t - pad}px;width:${b.w + pad * 2}px;height:${b.h + pad * 2}px;border-radius:${round}px;border-style:dashed;visibility:${seen < 0.25 ? 'hidden' : 'visible'}`); }); // visibility, not opacity: the guides' own fade owns opacity
      if (right) { const b = box(anchor ?? els[0], s); at(pill, `left:${b.r + 14}px;top:${b.t + b.h / 2}px;translate:0 -50%`); } else (under ? pillUnder : pillOver)(pill, anchor ?? els[0], s, dy); } };
};

// ── what can't be seen, drawn ──────────────────────────────────
// What a screen reader says, as a caption under the thing: the words change with the fix.
export const voice = (said) => `<div class="vo" style="display:flex;align-items:center;gap:8px;padding:7px 11px;border-radius:10px;background:#111827;color:#f9fafb;font:500 12px system-ui;white-space:nowrap"><svg viewBox="0 0 24 24" width="14" height="14" style="flex:none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#a5b4fc"/><path d="M16 9a4 4 0 010 6" stroke="#a5b4fc" stroke-width="2" fill="none" stroke-linecap="round"/></svg>${phrase(said[0], said[1], 'said')}</div>`;
export const spoken = ({ ui, said, labels, mark = '.m', also, code, note, bg = '', under = false }) => ({ code, note, scene: (s) => {
  scene(s, `<div style="display:grid;gap:14px;justify-items:center">${ui}${voice(said)}</div>`, bg);
  const m = [...s.querySelectorAll(mark)], set = wirePhrase(s.querySelector('.said'));
  also?.(s, 0);
  return { ...marked(s, m.length ? m : [s.querySelector('.vo')], labels, { under, dy: 18 }), at: (p) => { set(p); also?.(s, p); } };
} });
// Where Tab goes: a numbered stop on each place focus lands, in order; with the fix the stops move to where they belong.
export const stops = ({ ui, before, after, labels, also, code, note, bg = '' }) => ({ code, note, scene: (s) => {
  scene(s, ui, bg);
  const root = s.querySelector('.ck-scene'), n = Math.max(before.length, after.length);
  const dots = Array.from({ length: n }, (_, i) => { const d = document.createElement('b'); d.textContent = i + 1; d.style.cssText = 'position:absolute;z-index:5;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c);color:#fff;font:700 10px system-ui;box-shadow:0 1px 3px rgb(0 0 0 / .3);translate:-50% -50%'; root.append(d); return d; });
  const place = (list) => { const R = root.getBoundingClientRect(); dots.forEach((d, i) => { const el = list[i] && s.querySelector(list[i]); if (!el) { d.style.scale = '0'; return; } const r = el.getBoundingClientRect(); d.style.scale = '1'; d.style.left = `${r.left - R.left + 2}px`; d.style.top = `${r.top - R.top + 2}px`; }); };
  also?.(s, 0); place(before);
  return { ...marked(s, [root.firstElementChild], labels, { pad: 6, round: 12 }), at: (p) => { also?.(s, p); place(p ? after : before); } };
} });
// Time, drawn: a row per thing on one axis in ms; the fix moves and resizes the bars.
export const bars = ({ rows, max, labels, code, note, marks = [], from, to, unit = 'ms', name = '' }) => ({ code, note, scene: (s) => {
  const W = 220;
  scene(s, `<div style="display:grid;gap:8px;width:${W + 70}px;font:600 11px system-ui;color:#4b5563">${rows.map((r, i) => `<div style="display:grid;grid-template-columns:62px ${W}px;align-items:center;gap:8px"><span>${r.label}</span><span style="position:relative;height:14px;border-radius:7px;background:#f3f4f6"><i class="bar b${i}" style="position:absolute;top:0;bottom:0;border-radius:7px;background:${r.ink ?? '#818cf8'}"></i></span></div>`).join('')}<div style="display:grid;grid-template-columns:62px ${W}px;gap:8px"><span></span><span style="display:flex;justify-content:space-between;font:500 10px system-ui;color:#9ca3af"><span>0</span><span>${max} ms</span></span></div></div>`);
  const els = rows.map((_, i) => s.querySelector(`.b${i}`));
  const set = (p) => rows.forEach((r, i) => { const [a, b] = p ? r.after : r.before; els[i].style.left = `${(a / max) * 100}%`; els[i].style.width = `${(Math.max(0, b - a) / max) * 100}%`; els[i].style.opacity = b > a ? 1 : 0; });
  set(0);
  const m = marks.map((i) => els[i]);
  return { ...marked(s, m.length ? m : [els[0]], labels, { pad: 3, round: 8 }), ...(from != null ? { from, to, unit, name, step: 10, labels: undefined } : {}), at: set };
} });
// A line of markup with the part the check is about boxed; the fix removes or changes that part.
// (pre, a, b, post are plain text: they are shown as written)
const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'), nb = (t) => escHtml(t).replace(/ /g, '&nbsp;');
export const markup = ({ pre, a, b = '', post = '', labels, code, note, also, ui = '' }) => ({ code: code ?? [`${pre}${a}${post}`, `${pre}${b}${post}`], note, scene: (s) => {
  scene(s, `<div style="display:grid;gap:14px;justify-items:center">${ui}<code style="padding:10px 14px;border-radius:10px;background:#111827;color:#e5e7eb;font:500 12.5px/1.5 ui-monospace,Menlo,monospace;white-space:pre">${escHtml(pre)}${phrase(nb(a), nb(b), 'att')}${escHtml(post)}</code></div>`);
  const att = s.querySelector('.att'), set = wirePhrase(att);
  also?.(s, 0);
  return { ...marked(s, [att], labels, { pad: 3, round: 5 }), at: (p) => { set(p); also?.(s, p); } };
} });

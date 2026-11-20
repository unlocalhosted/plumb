// What the Anti-slop and Words examples share: words that change in place, a line that folds away, and a dashed
// box on exactly the words or mark the check is about (it shrinks with them as they go).
import { at, make, box, pillOver, pillUnder } from '../check-kit.js';

export const scene = (s, html, bg = '') => { s.innerHTML = `<div class="ck-scene"${bg ? ` style="background:${bg}"` : ''}>${html}</div>`; };
// a phrase that becomes another, in the run of a line: both sit in one cell, the cell's width moves between theirs
export const phrase = (a, b = '', cls = '') => `<span class="ph ${cls}" style="display:inline-grid;vertical-align:bottom;white-space:nowrap;overflow:hidden"><span class="pa" style="grid-area:1/1">${a}</span><span class="pb" style="grid-area:1/1;opacity:0">${b}</span></span>`;
export const wirePhrase = (el) => {
  const a = el.querySelector('.pa'), b = el.querySelector('.pb'), wa = a.getBoundingClientRect().width, wb = b.textContent ? b.getBoundingClientRect().width : 0;
  el.style.width = `${wa}px`;
  return (p) => { el.style.width = `${p ? wb : wa}px`; a.style.opacity = p ? 0 : 1; b.style.opacity = p ? 1 : 0; };
};
// a whole line that folds away: its height, gap and ink go to nothing
export const fold = (el) => {
  const h = el.getBoundingClientRect().height, m = getComputedStyle(el).marginBottom;
  el.style.height = `${h}px`; el.style.overflow = 'hidden';
  return (p) => { el.style.height = p ? '0px' : `${h}px`; el.style.opacity = p ? 0 : 1; el.style.marginBottom = p ? '0px' : m; };
};
// dashed boxes on the marks the check is about, and the pill; they fade as the marks fold to nothing
export const marked = (s, els, labels, { under = false, dy = 18, pad = 4, round = 6, anchor } = {}) => {
  const boxes = els.map(() => make(s, 'sq')), pill = make(s, 'pill');
  return { labels, guides: [...boxes.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
    track: () => { els.forEach((e, i) => { const b = box(e, s), seen = Math.min(1, b.w / 8, b.h / 6); at(boxes[i], `left:${b.l - pad}px;top:${b.t - pad}px;width:${b.w + pad * 2}px;height:${b.h + pad * 2}px;border-radius:${round}px;border-style:dashed;visibility:${seen < 0.25 ? 'hidden' : 'visible'}`); }); // visibility, not opacity: the guides' own fade owns opacity
      (under ? pillUnder : pillOver)(pill, anchor ?? els[0], s, dy); } };
};

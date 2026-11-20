// The pieces a check's example is drawn with (check-motion.js and the scenes in checks/): the guides made in its
// stage, and where they go. Nothing here touches the page until a scene is built.
export const lerp = (a, b, p) => a + (b - a) * p;
export const at = (el, css) => { el.style.cssText = css; };
export const make = (s, cls) => { const el = document.createElement('i'); el.className = `g ${cls}`; s.append(el); return el; };
export const ringAround = (ring, el, s, pad = 7) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); at(ring, `left:${r.left - S.left - pad}px;top:${r.top - S.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:${(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8) + pad}px`); };
export const pillOver = (pill, el, s, dy = 16) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); at(pill, `left:${r.left - S.left + r.width / 2}px;top:${r.top - S.top - dy}px`); };
export const pillUnder = (pill, el, s, dy = 22) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); at(pill, `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + dy}px`); };
export const pillLeft = (pill, y, x) => { at(pill, `left:${x}px;top:${y}px`); };
// a measured gap between two y's: two hairlines across, an I-beam at x, the pill ending just left of it
export const gapY = (s, [t, u, beam, pill], y1, y2, x) => { at(t, `top:${y1}px;left:0;right:0`); at(u, `top:${y2}px;left:0;right:0`); at(beam, `left:${x - 4}px;top:${y1}px;height:${Math.max(0, y2 - y1)}px`); at(pill, `left:${x - 10}px;top:${(y1 + y2) / 2}px;translate:-100% -50%`); };
// a measured gap between two x's: two lines down, a sideways I-beam at y, the pill over it
export const gapX = (s, [l, m, beam, pill], x1, x2, y) => { at(l, `left:${x1}px;top:0;bottom:0`); at(m, `left:${x2}px;top:0;bottom:0`); at(beam, `top:${y}px;left:${Math.min(x1, x2)}px;width:${Math.abs(x2 - x1)}px`); pillLeft(pill, y - 18, (x1 + x2) / 2); };
export const box = (el, s) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); return { l: r.left - S.left, t: r.top - S.top, r: r.right - S.left, b: r.bottom - S.top, w: r.width, h: r.height }; };

// Fills the hero comps: the shared head, the screens, Plumber's marks measured from them, and the before → after counts
// read from the two rendered screens.
import { screen, marks } from './screen.js';

const head = document.getElementById('head');
for (const slot of document.querySelectorAll('[data-head]')) slot.replaceWith(head.content.cloneNode(true));
for (const layer of document.querySelectorAll('[data-screen]')) layer.innerHTML = screen(layer.dataset.screen);

function count(kind) {
  const root = document.querySelector(`[data-screen="${kind}"] .app`);
  const text = new Set(), space = new Set();
  for (const el of root.querySelectorAll('[data-mark]')) {
    const css = getComputedStyle(el);
    if (el.dataset.mark === 'text') text.add(parseFloat(css.fontSize));
    else if (el.dataset.mark === 'pad') ['paddingTop', 'paddingRight'].forEach(p => space.add(parseFloat(css[p])));
    else { space.add(parseFloat(css.columnGap)); space.add(parseFloat(css.paddingTop)); }
  }
  return { text: text.size, space: [...space].filter(v => v > 0).length };
}

function draw() {
  for (const layer of document.querySelectorAll('[data-marks]')) {
    layer.querySelector('.h-marks')?.remove();
    const app = layer.querySelector('.app');
    const wrap = document.createElement('div');
    wrap.className = 'h-marks';
    wrap.innerHTML = marks(app, layer.dataset.marks);
    app.append(wrap);
  }
  const m = count('messy'), c = count('clean');
  const set = (k, v) => document.querySelectorAll(`[data-count="${k}"]`).forEach(n => { n.textContent = v; });
  set('text-before', m.text); set('text-after', c.text); set('space-before', m.space); set('space-after', c.space);
  // C: the clicked element, cut out of the dimmed page
  const frame = document.querySelector('.h-one'), pixel = frame.querySelector('[data-pixel]'), spot = frame.querySelector('.h-spot');
  const f = frame.getBoundingClientRect(), p = pixel.getBoundingClientRect();
  Object.assign(spot.style, { left: `${p.left - f.left}px`, top: `${p.top - f.top}px`, width: `${p.width}px`, height: `${p.height}px` });
  const cursor = frame.querySelector('.h-cursor');
  Object.assign(cursor.style, { left: `${p.left - f.left + p.width * 0.62}px`, top: `${p.top - f.top + p.height * 0.55}px` });
}
document.fonts.ready.then(draw);
addEventListener('resize', () => requestAnimationFrame(draw));

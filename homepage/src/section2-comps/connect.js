// Draws the comps' marks from the real layout, so they sit exactly on the spaces they name: each [data-space] inside a
// [data-connect] board gets its band (padding inside the edge, or the gap between two children), and each
// [data-from] line of the theme is drawn to the space whose [data-to] matches. Redrawn on resize and on a scheme switch.
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.append(n); return n; };

function band(node, box) {
  const r = node.getBoundingClientRect(), css = getComputedStyle(node);
  const x = r.left - box.left, y = r.top - box.top;
  const kind = node.dataset.space;
  if (kind === 'gap') {
    const [a, z] = [...node.children].map(k => k.getBoundingClientRect());
    return z.top >= a.bottom - 1
      ? { kind, rects: [[x, a.bottom - box.top, r.width, z.top - a.bottom]] }
      : { kind, rects: [[a.right - box.left, y, z.left - a.right, r.height]] };
  }
  const t = parseFloat(css.paddingTop), rt = parseFloat(css.paddingRight), b = parseFloat(css.paddingBottom), l = parseFloat(css.paddingLeft);
  if (kind === 'padx') return { kind, rects: [[x, y, l, r.height], [x + r.width - rt, y, rt, r.height]] };
  return { kind, outer: [x, y, r.width, r.height], inner: [x + l, y + t, r.width - l - rt, r.height - t - b], radius: parseFloat(css.borderTopLeftRadius) };
}

function draw(board) {
  let svg = board.querySelector(':scope > svg.marks');
  if (!svg) { svg = el('svg', { class: 'marks', 'aria-hidden': 'true' }, board); }
  svg.replaceChildren();
  const box = board.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const spaces = {};
  for (const node of board.querySelectorAll('[data-space]')) {
    const m = band(node, box), on = node.dataset.tone === 'on' || node.dataset.to === 'card';
    const cls = `band ${on ? 'band-on' : ''}`;
    if (m.outer) {
      const [x, y, w, h] = m.outer, [ix, iy, iw, ih] = m.inner, rr = m.radius;
      el('path', { class: cls, 'fill-rule': 'evenodd',
        d: `M${x + rr} ${y}h${w - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}v${h - 2 * rr}a${rr} ${rr} 0 0 1 -${rr} ${rr}h-${w - 2 * rr}a${rr} ${rr} 0 0 1 -${rr} -${rr}v-${h - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} -${rr}z M${ix} ${iy}h${iw}v${ih}h-${iw}z` }, svg);
      el('rect', { class: 'band-edge', x: ix, y: iy, width: iw, height: ih }, svg);
      // where 21px of padding put the edge: the same content, 5px further out
      if (node.dataset.ghost) {
        const grow = +node.dataset.ghost - (ix - x);
        el('rect', { class: 'ghost', x: x - grow, y: y - grow, width: w + 2 * grow, height: h + 2 * grow, rx: rr + grow }, svg);
      }
      spaces[node.dataset.to] = { x, y: y + (iy - y) / 2, w };
    } else {
      for (const [x, y, w, h] of m.rects) el('rect', { class: cls, x, y, width: w, height: h, rx: 1.5 }, svg);
      const [x, y, , h] = m.rects[0];
      spaces[node.dataset.to] = { x, y: y + h / 2 };
    }
    if (node.dataset.label) {
      const [x, y, w] = m.outer ?? m.rects[0];
      const g = el('g', { class: 'tag-on' }, svg);
      const t = el('text', { x: x + w - 12, y: y - 12, 'text-anchor': 'end' }, g);
      t.textContent = node.dataset.label;
    }
  }
  // the theme's lines, each drawn to the space that uses its step
  const theme = board.querySelector('.b-theme');
  if (!theme) return;
  const right = theme.getBoundingClientRect().right - box.left;
  for (const row of board.querySelectorAll('[data-from]')) {
    const to = spaces[row.dataset.from];
    if (!to) continue;
    const rr = row.getBoundingClientRect(), y1 = rr.top - box.top + rr.height / 2, x1 = right + 10;
    const on = row.dataset.from === 'card';
    const dx = Math.max(40, (to.x - x1) * 0.5);
    el('path', { class: `link ${on ? 'link-on' : ''}`, d: `M${x1} ${y1} C ${x1 + dx} ${y1}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}` }, svg);
    el('circle', { class: `link-dot ${on ? 'link-on' : ''}`, cx: x1, cy: y1, r: 3 }, svg);
    el('circle', { class: `link-dot ${on ? 'link-on' : ''}`, cx: to.x, cy: to.y, r: 3 }, svg);
  }
}

const boards = [...document.querySelectorAll('[data-connect]')];
const all = () => boards.forEach(draw);
document.fonts.ready.then(all);
addEventListener('resize', () => requestAnimationFrame(all));

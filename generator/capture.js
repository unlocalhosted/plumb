// Reads one organism off a live page into a sidecar (absolute values) and the measured parts of a specimen
// (ratios to body size, visual weight, ranks, lead strength). Pasted into the page by hand during layer 1;
// the capture layer (4–5) will run it from a browser script.
//
//   captureOrganism(root, { identity: el, price: el, proof: [el, el], action: el, ... }, { body: el })
//
// Visual weight follows the brief: (size ÷ body) × √(weight ÷ 400) × √(contrast ÷ body text contrast);
// a filled control uses its fill's contrast against the ground. Within 10% shares a rank.
function captureOrganism(root, slots, opts = {}) {
  // any CSS colour (rgb, oklch, named) to [r, g, b, a] through a 1×1 canvas
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = (s) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = s; cv.fillRect(0, 0, 1, 1); const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // the colour behind an element; a gradient or image ground can't be read, so it is recorded and treated as unknown
  const unread = new Set();
  const groundOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && rgb(cs.backgroundColor)[3] < 0.5) { unread.add(e === root ? 'root' : e.tagName.toLowerCase()); } const c = rgb(cs.backgroundColor); if (c[3] > 0.5) return c; } return [255, 255, 255]; };
  // a control's fill may sit on a wrapper: the nearest opaque background between the element and the card
  const fillOf = (el) => { for (let e = el; e && e !== root; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c[3] > 0.5) return { c, css: getComputedStyle(e).backgroundColor, on: e }; } return null; };
  const rootBox = root.getBoundingClientRect();
  const firstText = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim() ? 1 : 2 }); const n = w.nextNode(); return n ? n.parentElement : el; };
  const read = (el) => {
    const t = firstText(el), cs = getComputedStyle(t), own = getComputedStyle(el), b = el.getBoundingClientRect();
    const f = fillOf(t), filled = !!f;
    const ground = groundOf(f ? f.on.parentElement : root);
    return {
      box: { x: Math.round(b.left - rootBox.left), y: Math.round(b.top - rootBox.top), w: Math.round(b.width), h: Math.round(b.height) },
      text: (el.innerText || '').trim().split('\n')[0].slice(0, 60), words: (el.innerText || '').trim().split(/\s+/).filter(Boolean).length,
      fontSize: t === el && !(el.innerText || '').trim() ? Math.round(b.height) : parseFloat(cs.fontSize), fontWeight: Number(cs.fontWeight), fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
      color: cs.color, background: filled ? f.css : null, radius: own.borderRadius, border: own.borderTopWidth !== '0px' ? `${own.borderTopWidth} ${own.borderTopColor}` : null,
      contrast: +(filled ? contrast(f.c, ground) : contrast(rgb(cs.color), groundOf(t))).toFixed(2), filled,
    };
  };
  const out = {};
  for (const [job, v] of Object.entries(slots)) {
    const els = Array.isArray(v) ? v : [v];
    out[job] = els.length > 1 ? { count: els.length, items: els.map(read), ...read(els[0]), box: union(els) } : read(els[0]);
  }
  function union(els) { const bs = els.map((e) => e.getBoundingClientRect()); const l = Math.min(...bs.map((b) => b.left)), t = Math.min(...bs.map((b) => b.top)), r = Math.max(...bs.map((b) => b.right)), btm = Math.max(...bs.map((b) => b.bottom)); return { x: Math.round(l - rootBox.left), y: Math.round(t - rootBox.top), w: Math.round(r - l), h: Math.round(btm - t) }; }
  const bodyEl = opts.body ? firstText(opts.body) : null;
  const body = bodyEl ? parseFloat(getComputedStyle(bodyEl).fontSize) : 16;
  const bodyContrast = bodyEl ? contrast(rgb(getComputedStyle(bodyEl).color), groundOf(bodyEl)) : 7;
  const weightOf = (s) => (s.fontSize / body) * Math.sqrt(s.fontWeight / 400) * Math.sqrt(s.contrast / bodyContrast);
  // visual weight is defined for text; a slot with no text (an icon, an image) is left out of the ranks (open decision)
  const order = Object.entries(out).filter(([, s]) => s.words > 0).map(([job, s]) => ({ job, w: +weightOf(s).toFixed(2) })).sort((a, b) => b.w - a.w);
  let rank = 0, prev = null; for (const o of order) { if (!prev || o.w < prev * 0.9) { rank++; prev = o.w; } o.rank = rank; }
  const top = order.filter((o) => o.rank === 1), second = order.find((o) => o.rank === 2);
  const leadRatio = second ? top[0].w / second.w : null;
  // reading order: rows first (parts whose boxes overlap vertically by half the shorter one share a row), then left to right
  const byY = Object.entries(out).sort((a, b) => a[1].box.y - b[1].box.y); const rows = [];
  for (const e of byY) { const r = rows.find((row) => row.some(([, s]) => { const lo = Math.max(s.box.y, e[1].box.y), hi = Math.min(s.box.y + s.box.h, e[1].box.y + e[1].box.h); return hi - lo >= Math.min(s.box.h, e[1].box.h) / 2; })); r ? r.push(e) : rows.push([e]); }
  const reading = rows.flatMap((row) => row.sort((a, b) => a[1].box.x - b[1].box.x).map(([j]) => j));
  const rowOf = Object.fromEntries(rows.flatMap((row, i) => row.map(([j]) => [j, i])));
  const gaps = []; for (let i = 1; i < reading.length; i++) { const a = out[reading[i - 1]].box, b = out[reading[i]].box; if (rowOf[reading[i]] === rowOf[reading[i - 1]]) { gaps.push({ between: `${reading[i - 1]}→${reading[i]}`, row: true, px: Math.round(b.x - (a.x + a.w)), ratio: +((b.x - (a.x + a.w)) / body).toFixed(2) }); continue; } gaps.push({ between: `${reading[i - 1]}→${reading[i]}`, px: Math.round(b.y - (a.y + a.h)), ratio: +((b.y - (a.y + a.h)) / body).toFixed(2) }); }
  const cs = getComputedStyle(root);
  return {
    sidecar: { url: location.href, unreadGrounds: [...unread], captured: new Date().toISOString().slice(0, 10), viewport: [innerWidth, innerHeight], root: { w: Math.round(rootBox.width), h: Math.round(rootBox.height), background: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth !== '0px' ? `${cs.borderTopWidth} ${cs.borderTopColor}` : null, shadow: cs.boxShadow !== 'none' ? cs.boxShadow : null, padding: cs.padding }, body: { fontSize: body, contrast: +bodyContrast.toFixed(2) }, slots: out },
    measured: { widthRatio: +(rootBox.width / body).toFixed(1), reading, rows: rows.map((row) => row.map(([j]) => j)), weights: order, lead: leadRatio == null ? 'n/a' : leadRatio < 1.25 ? 'flat' : leadRatio <= 2 ? 'clear' : 'strong', leadRatio: leadRatio && +leadRatio.toFixed(2), gaps },
  };
}

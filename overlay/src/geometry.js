// Where a CSS property lives on a real element, measured from the live box.
//
// A mark is about a property, so its place is the part of the box that property paints: padding is the band between
// the border and the content, a gap is the space between two children, a radius is a corner, a shadow falls below.
// Rects are in viewport coordinates. `edge` is where the skeleton sets the mark into its outline.

const px = v => parseFloat(v) || 0;

function box(element) {
  const b = element.getBoundingClientRect(), cs = getComputedStyle(element);
  return {
    x: b.left, y: b.top, w: b.width, h: b.height, cs,
    pt: px(cs.paddingTop), pr: px(cs.paddingRight), pb: px(cs.paddingBottom), pl: px(cs.paddingLeft),
    bt: px(cs.borderTopWidth), br: px(cs.borderRightWidth), bb: px(cs.borderBottomWidth), bl: px(cs.borderLeftWidth),
  };
}

const visibleChildren = element => [...element.children].filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

function gapRect(element, b, axis) {
  const kids = visibleChildren(element);
  if (kids.length < 2) return null;
  const [a, c] = kids.map(k => k.getBoundingClientRect());
  // Children side by side measure a column gap; stacked children measure a row gap.
  const across = axis ? axis === 'x' : c.left >= a.right - 0.5;
  if (across) return { x: a.right, y: b.y + b.bt + b.pt, w: Math.max(0, c.left - a.right), h: b.h - b.bt - b.bb - b.pt - b.pb, axis: 'x' };
  return { x: b.x + b.bl + b.pl, y: a.bottom, w: b.w - b.bl - b.br - b.pl - b.pr, h: Math.max(0, c.top - a.bottom), axis: 'y' };
}

// The first rect is the anchor; the others are the same property's other places (both padding bands).
export function regionFor(element, props) {
  const b = box(element), inner = { x: b.x + b.bl, y: b.y + b.bt, w: b.w - b.bl - b.br, h: b.h - b.bt - b.bb };
  const band = side => ({
    top: { x: inner.x + b.pl, y: inner.y, w: inner.w - b.pl - b.pr, h: b.pt },
    bottom: { x: inner.x + b.pl, y: inner.y + inner.h - b.pb, w: inner.w - b.pl - b.pr, h: b.pb },
    left: { x: inner.x, y: inner.y + b.pt, w: b.pl, h: inner.h - b.pt - b.pb },
    right: { x: inner.x + inner.w - b.pr, y: inner.y + b.pt, w: b.pr, h: inner.h - b.pt - b.pb },
  })[side];
  const has = p => props.some(q => q === p);
  const any = re => props.some(q => re.test(q));
  if (has('padding-block') || has('padding-top') || has('padding')) return { kind: 'pad', axis: 'y', edge: 'top', rects: [band('top'), ...(has('padding-top') ? [] : [band('bottom')])] };
  if (has('padding-bottom')) return { kind: 'pad', axis: 'y', edge: 'bottom', rects: [band('bottom')] };
  if (any(/^padding-(inline|left|right|inline-start|inline-end)$/)) {
    const one = has('padding-left') || has('padding-inline-start') ? ['left'] : has('padding-right') || has('padding-inline-end') ? ['right'] : ['left', 'right'];
    return { kind: 'pad', axis: 'x', edge: one[0], rects: one.map(band) };
  }
  if (any(/^(gap|column-gap|row-gap)$/)) {
    const r = gapRect(element, b, has('row-gap') ? 'y' : has('column-gap') ? 'x' : undefined);
    if (r) return { kind: 'gap', axis: r.axis, edge: 'bottom', rects: [r] };
    return { kind: 'gap', axis: 'x', edge: 'bottom', rects: [{ ...inner, w: 0, h: 0 }] };
  }
  if (any(/radius/)) {
    const corner = has('border-top-left-radius') || has('border-start-start-radius') ? 'tl' : has('border-bottom-left-radius') ? 'bl' : has('border-bottom-right-radius') ? 'br' : 'tr';
    const r = Math.max(4, px(b.cs[{ tl: 'borderTopLeftRadius', tr: 'borderTopRightRadius', bl: 'borderBottomLeftRadius', br: 'borderBottomRightRadius' }[corner]]));
    const x = corner[1] === 'r' ? b.x + b.w - r * 2 : b.x, y = corner[0] === 'b' ? b.y + b.h - r * 2 : b.y;
    return { kind: 'corner', corner, edge: corner[0] === 'b' ? 'bottom' : 'top', rects: [{ x, y, w: Math.min(r * 2, b.w), h: Math.min(r * 2, b.h), ring: true }] };
  }
  if (any(/shadow/)) return { kind: 'shadow', edge: 'bottom', rects: [{ x: b.x, y: b.y + b.h, w: b.w, h: 6 }] };
  if (any(/^margin/)) {
    const m = { t: px(b.cs.marginTop), r: px(b.cs.marginRight), b: px(b.cs.marginBottom), l: px(b.cs.marginLeft) };
    return { kind: 'margin', edge: 'top', rects: [{ x: b.x, y: b.y - m.t, w: b.w, h: m.t }, { x: b.x, y: b.y + b.h, w: b.w, h: m.b }].filter(r => r.h > 0) };
  }
  if (any(/^(font|line-height|letter-spacing|color$|text-)/)) {
    const range = document.createRange(); range.selectNodeContents(element);
    const t = range.getBoundingClientRect();
    const r = t.width ? { x: t.left, y: t.top, w: t.width, h: t.height } : { ...inner };
    return { kind: 'text', edge: r.y + r.h / 2 < b.y + b.h / 2 ? 'top' : 'bottom', rects: [r] };
  }
  if (any(/^(background|fill|border-color|outline)/)) return { kind: 'fill', edge: 'bottom', rects: [{ x: inner.x + b.pl, y: inner.y + b.pt, w: inner.w - b.pl - b.pr, h: inner.h - b.pt - b.pb }] };
  return { kind: 'box', edge: 'bottom', rects: [{ x: b.x, y: b.y, w: b.w, h: b.h }] };
}

export function outlineOf(element) {
  const b = box(element);
  return { x: b.x, y: b.y, w: b.w, h: b.h, radius: { tl: px(b.cs.borderTopLeftRadius), tr: px(b.cs.borderTopRightRadius), bl: px(b.cs.borderBottomLeftRadius), br: px(b.cs.borderBottomRightRadius) } };
}

// The element's children as the skeleton draws them: boxes for boxes, rules for lines of text.
export function childrenOf(element) {
  // Text the element holds itself (a chip's label) is drawn as text rules too.
  const own = [...element.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).map(n => {
    const range = document.createRange(); range.selectNodeContents(n);
    const t = range.getBoundingClientRect();
    return { x: t.left, y: t.top, w: t.width, h: t.height, round: 0, lines: [{ x: t.left, y: t.top, w: t.width, h: t.height }], text: true };
  }).filter(t => t.w > 0);
  return [...own, ...visibleChildren(element).slice(0, 24).map(child => {
    const r = child.getBoundingClientRect(), cs = getComputedStyle(child);
    const lines = [];
    const textOnly = [...child.childNodes].every(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && getComputedStyle(n).display === 'inline'));
    const leaves = textOnly ? [child] : [...child.children].filter(c => c.children.length === 0 && c.textContent.trim());
    for (const leaf of leaves.slice(0, 4)) {
      const range = document.createRange(); range.selectNodeContents(leaf);
      const t = range.getBoundingClientRect();
      if (t.width && leaf.textContent.trim()) lines.push({ x: t.left, y: t.top, w: t.width, h: t.height });
    }
    const round = cs.borderRadius;
    // A child with its own surface (fill, border, shadow) is drawn as a box even when it only holds text: a button.
    const fill = cs.backgroundColor.match(/[\d.]+/g)?.map(Number);
    const surface = (fill && (fill[3] ?? 1) > 0.05) || cs.boxShadow !== 'none' || px(cs.borderTopWidth) > 0 || px(cs.borderLeftWidth) > 0;
    return { x: r.left, y: r.top, w: r.width, h: r.height, round: round.includes('%') || px(round) >= Math.min(r.width, r.height) / 2 ? 'full' : px(round), lines, text: textOnly && !surface };
  })];
}

// The overlay follows the page underneath it: a light reading over a light page, a dark one over a dark page.
export function hostIsDark(node) {
  for (let n = node; n && n.nodeType === Node.ELEMENT_NODE; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g)?.map(Number);
    if (c && (c[3] ?? 1) > 0.5) {
      const [r, g, bl] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl < 0.2;
    }
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function hostGround(node) {
  for (let n = node?.parentElement; n; n = n.parentElement) {
    const c = getComputedStyle(n).backgroundColor, a = c.match(/[\d.]+/g)?.map(Number);
    if (a && (a[3] ?? 1) > 0.5) return c;
  }
  return getComputedStyle(document.body).backgroundColor || '#ffffff';
}

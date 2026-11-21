// The skin of an atom, read off the running page: what the original is drawn with (its fill, the ink on it, its edge,
// its lip, its corner, its height and face), and the one colour every form of it needs that the original doesn't show
// at rest: a stronger fill for the part already done (a hold's liquid, a slide's trail). That colour is picked from the
// product's own tokens, the closest in hue to the fill that stands 3:1 apart from it (WCAG 1.4.11: a control's states
// must tell apart) and keeps the ink on it at 4.5:1 (WCAG 1.4.3). Only when no token qualifies is a step of the fill
// itself mixed toward black, and the skin says so.

const probe = () => (probe.ctx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }));
// a CSS colour as the screen draws it, or null when it isn't a colour
export function rgb(value) {
  const g = probe(); g.fillStyle = '#010203'; g.fillStyle = value;
  if (g.fillStyle === '#010203' && !/^#010203$/i.test(String(value).trim())) return null;
  g.clearRect(0, 0, 1, 1); g.fillRect(0, 0, 1, 1); const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data;
  return a < 250 ? null : [r, gg, b];
}
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// hue in OKLab, to keep a stronger fill the same colour, only deeper
const oklab = ([r, g, b]) => { const [R, G, B] = [r, g, b].map(lin); const l = Math.cbrt(0.4122 * R + 0.5363 * G + 0.0514 * B), m = Math.cbrt(0.2119 * R + 0.6807 * G + 0.1074 * B), s = Math.cbrt(0.0883 * R + 0.2817 * G + 0.6299 * B); return [0.2105 * l + 0.7936 * m - 0.0041 * s, 1.978 * l - 2.4286 * m + 0.4506 * s, 0.0259 * l + 0.7828 * m - 0.8087 * s]; };
const hueGap = (a, b) => { const [, a1, b1] = oklab(a), [, a2, b2] = oklab(b); return Math.abs(Math.atan2(b1, a1) - Math.atan2(b2, a2)) + Math.abs(Math.hypot(a1, b1) - Math.hypot(a2, b2)) * 4; };

// every colour token the page defines on its root
function colourTokens() {
  const names = new Set();
  for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => { for (const r of list) { if (r.cssRules) walk(r.cssRules); if (r.style && /(:root|html)/.test(r.selectorText ?? '')) for (const p of r.style) if (p.startsWith('--')) names.add(p); } };
    walk(rules); }
  const cs = getComputedStyle(document.documentElement);
  return [...names].map((n) => ({ name: n, value: rgb(cs.getPropertyValue(n).trim()) })).filter((t) => t.value);
}

export function readSkin(el) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  // the words are set by the element that holds them, not by the button: algorecall's slab is a regular-weight button
  // whose pattern name is semibold, and a suggestion that copied the button drew its words lighter than shipped
  const words = [el, ...el.querySelectorAll('*')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ?? el, ws = getComputedStyle(words);
  const fill = rgb(cs.backgroundColor) ?? [0, 0, 0], ink = rgb(cs.color) ?? [255, 255, 255];
  const edge = cs.borderTopWidth !== '0px' ? cs.borderTopColor : `color-mix(in oklab, ${cs.backgroundColor} 70%, black)`;
  // the stronger fill: a token that passes both checks, closest in hue
  // only a token of the same family counts (a deeper shade is the same colour, deeper): a far hue or a grey that passes
  // the numbers would read as a different thing
  // the words over the done part: the original's ink when it still reads there, else the fill's own colour (a light
  // button with dark words deepens into a dark shade, and its words turn light where the fill has passed)
  const onOf = (c) => contrast(ink, c) >= 4.5 ? cs.color : contrast(fill, c) >= 4.5 ? cs.backgroundColor : null;
  const fit = colourTokens().filter((t) => hueGap(t.value, fill) < 0.3 && contrast(t.value, fill) >= 3 && onOf(t.value)).sort((a, b) => hueGap(a.value, fill) - hueGap(b.value, fill))[0];
  let deep = fit ? `var(${fit.name})` : null, onDeep = fit ? onOf(fit.value) : null, deepFrom = fit ? `the product's ${fit.name}` : null;
  if (!deep) for (let k = 15; k <= 85; k += 5) { const mix = `color-mix(in oklab, ${cs.backgroundColor} ${100 - k}%, black)`, c = rgb(mix); if (contrast(c, fill) >= 3 && onOf(c)) { deep = mix; onDeep = onOf(c); deepFrom = `its own fill, ${k}% deeper (no token of the same colour stands 3:1 from it)`; break; } }
  if (!deep) deepFrom = 'none: no shade of its colour stands 3:1 from it with words that still read';
  return {
    vars: {
      '--atom-fill': cs.backgroundColor, '--atom-on-fill': cs.color, '--atom-edge': edge, '--atom-deep': deep ?? edge, '--atom-on-deep': onDeep ?? cs.color,
      '--atom-lip': cs.boxShadow === 'none' ? `0 2px 0 ${edge}` : cs.boxShadow, '--atom-radius': cs.borderTopLeftRadius,
      '--atom-height': `${Math.round(r.height)}px`, '--atom-font': ws.fontFamily, '--atom-size': ws.fontSize, '--atom-weight': ws.fontWeight,
      // the words' case and spacing too: React Plumber's Copy is set in capitals, tracked 0.1em
      '--atom-case': ws.textTransform, '--atom-tracking': ws.letterSpacing,
    },
    deepFrom, measured: { fill, ink, height: Math.round(r.height), width: Math.round(r.width) },
  };
}

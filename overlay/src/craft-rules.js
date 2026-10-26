/* ─────────────────────────────────────────────────────────
 * CRAFT RULES · React Plumber overlay
 *
 * The first wave of the mentor's rules (docs/craft/rules.md), each a plain object the craft engine (craft.js) runs
 * over measured facts. A rule reads facts, never the DOM; it returns findings with evidence, a confidence, a one-line
 * why and a suggestion: a class change where one is safe, advice with the numbers where none is.
 *
 *  concentric-radius   #8/#41  a rounded child at a rounded, padded parent's corner has radius R − p
 *  inner-outer-spacing #7      the gap inside a group is no wider than the gap between groups
 *  text-opacity        #57     text is coloured, not faded through opacity
 *  half-pixel          #37     a translation never lands text or a hairline between device pixels
 *
 * Wave two:
 *  hairline            #38     a 1px divider on a 2× screen is twice as heavy as meant: 0.5px
 *  image-outline       #39     an image whose edge matches the ground it sits on needs a faint inner outline
 *  layered-shadow      #51     one large single-layer blur is a smudge: stack a few layers
 *  scale-from-zero     #63     an entrance never starts at scale(0)
 *  z-index-war         #74     a large z-index on an element in the flow wants its own stacking context
 *  content-align       #1      a filled, padded row whose words fall off its column bleeds out by its padding
 *
 * Thresholds live on the rule, so noise is tuned in one place. Every rule says nothing when its evidence is
 * ambiguous: unequal insets, a running animation, a disabled control, a scale or rotation.
 * ───────────────────────────────────────────────────────── */
import { rgb, utility } from './craft.js';

const px = (v) => parseFloat(v) || 0;
const fmt = (n) => `${Math.round(n * 10) / 10}px`;
const hex = ([r, g, b]) => '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
const uniform = (s, prop, r) => ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].every((c) => Math.abs(px(s[`border${c}Radius`]) - r) < 0.5);
const REPLACED = new Set(['img', 'video', 'canvas', 'iframe', 'picture', 'svg']);
// side and corner forms of rounded-* (rounded-t-lg) are their own properties, never the whole radius
const SIDE_RADIUS = /^(?:[trblse]|tl|tr|bl|br|ss|se|es|ee)(?:-|$)/;

// Whether an element's corner can be seen at all: a fill, a border, a shadow, a clip, or replaced content.
function cornerShows(el, s) {
  if (REPLACED.has(el.localName)) return true;
  const bg = rgb(s.backgroundColor);
  if (bg && bg[3] > 0) return true;
  if (s.backgroundImage !== 'none') return true;
  if (px(s.borderTopWidth) > 0 || px(s.borderLeftWidth) > 0) return true;
  if (s.boxShadow !== 'none') return true;
  return s.overflow !== 'visible' && s.overflow !== '';
}

// #8 / #41. Nested radius = outer radius − padding, never below 0.
export const concentricRadius = {
  id: 'craft/concentric-radius', family: 'craft', number: [8, 41], reads: ['rect', 'style', 'parent'],
  threshold: { tolerance: 1.5, minParentRadius: 4 },
  check({ el, facts }, theme) {
    const { tolerance, minParentRadius } = this.threshold;
    const s = facts.style(el);
    const r = px(s.borderTopLeftRadius);
    if (!uniform(s, 'radius', r) || !cornerShows(el, s)) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return [];
    const ps = facts.style(parent);
    const R = px(ps.borderTopLeftRadius);
    if (R < minParentRadius || !uniform(ps, 'radius', R)) return [];
    const pr = facts.rect(parent), cr = facts.rect(el), b = facts.box(parent);
    // the corner the child sits at: its edges on the parent's content edges, both sides
    const corners = [
      { name: 'tl', prop: 'border-top-left-radius', at: Math.abs(cr.left - (pr.left + b.bl + b.pl)) < 1 && Math.abs(cr.top - (pr.top + b.bt + b.pt)) < 1, ix: cr.left - pr.left, iy: cr.top - pr.top },
      { name: 'tr', prop: 'border-top-right-radius', at: Math.abs(pr.right - b.br - b.pr - cr.right) < 1 && Math.abs(cr.top - (pr.top + b.bt + b.pt)) < 1, ix: pr.right - cr.right, iy: cr.top - pr.top },
      { name: 'bl', prop: 'border-bottom-left-radius', at: Math.abs(cr.left - (pr.left + b.bl + b.pl)) < 1 && Math.abs(pr.bottom - b.bb - b.pb - cr.bottom) < 1, ix: cr.left - pr.left, iy: pr.bottom - cr.bottom },
      { name: 'br', prop: 'border-bottom-right-radius', at: Math.abs(pr.right - b.br - b.pr - cr.right) < 1 && Math.abs(pr.bottom - b.bb - b.pb - cr.bottom) < 1, ix: pr.right - cr.right, iy: pr.bottom - cr.bottom },
    ];
    const c = corners.find((k) => k.at);
    if (!c) return [];
    // unequal insets would want an elliptical corner: say nothing
    if (Math.abs(c.ix - c.iy) > 0.5) return [];
    const p = c.ix;
    // the parent's curve ends before the child's edge: no relation to keep
    if (p >= R - 0.5) return [];
    const wanted = Math.max(0, R - p);
    if (Math.abs(r - wanted) <= tolerance) return [];
    const cls = utility(el, 'rounded', { not: SIDE_RADIUS });
    const step = theme.nearest('radius', wanted, tolerance) ?? (wanted <= tolerance ? { short: 'none', px: 0 } : null);
    const text = cls ?? 'border-radius';
    const suggest = step && cls ? { kind: 'class', from: cls, to: `rounded-${step.short}`, why: `${step.short} is ${fmt(step.px)}, the concentric radius here (${fmt(R)} − ${fmt(p)})` }
      : step ? { kind: 'advice', text: `Set border-radius to ${fmt(step.px)} (rounded-${step.short}): the parent's ${fmt(R)} corner minus ${fmt(p)} of inset.` }
      : { kind: 'advice', text: `No radius token is near ${fmt(wanted)}. Add one, or inset this by ${fmt(R - r)} instead of ${fmt(p)} so ${text} stays concentric.` };
    return [{
      key: `${this.id}@${c.name}`, what: 'corners not concentric', text, props: [c.prop], value: `${r}px`, n: r,
      title: `\`${text}\` is not concentric: ${fmt(p)} inside a ${fmt(R)} corner wants ${fmt(wanted)}, not ${fmt(r)}`,
      because: 'A nested radius is the outer radius minus the padding; otherwise the two curves have different centres and the corner looks pinched or bulged.',
      evidence: { parentRadius: R, inset: p, radius: r, wanted, corner: c.name }, confidence: 0.92, suggest,
    }];
  },
};

// Which way a container lays its children out: 'x', 'y', or 'both' for a grid; null when it is not a flow container.
function flowAxis(s) {
  if (/grid/.test(s.display)) return 'both';
  if (/flex/.test(s.display)) return /column/.test(s.flexDirection) ? 'y' : 'x';
  return null;
}
const gapOf = (s, axis) => axis === 'x' ? px(s.columnGap) : axis === 'y' ? px(s.rowGap) : Math.max(px(s.rowGap), px(s.columnGap));

// #7. Inner spacing ≤ outer spacing: the gap inside a group is smaller than the gap between groups.
export const innerOuterSpacing = {
  id: 'craft/inner-outer-spacing', family: 'craft', number: [7], reads: ['style', 'kids', 'parent'],
  threshold: { min: 0.5 },
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const axis = flowAxis(s);
    if (!axis) return [];
    const g = gapOf(s, axis);
    if (g <= 0 || facts.kids(el).length < 2) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return [];
    const ps = facts.style(parent);
    const paxis = flowAxis(ps);
    if (!paxis) return [];
    // the same direction only: a row's gap between an avatar and its words is not the gap between the rows
    if (paxis !== 'both' && axis !== 'both' && paxis !== axis) return [];
    const G = gapOf(ps, paxis);
    if (G <= 0 || facts.kids(parent).length < 2) return [];
    if (g <= G + this.threshold.min) return [];
    const cls = utility(el, 'gap', { not: /^[xy](?:-|$)/ });
    const step = theme.floor('spacing', G);
    const text = cls ?? 'gap';
    const suggest = step && cls ? { kind: 'class', from: cls, to: `gap-${step.short}`, why: `${step.short} is ${fmt(step.px)}, no wider than the ${fmt(G)} between groups` }
      : { kind: 'advice', text: step ? `Bring the gap down to ${fmt(step.px)} (gap-${step.short}) or less, under the ${fmt(G)} between groups.` : `Bring the gap under ${fmt(G)}, the space between groups, or widen that space.` };
    return [{
      key: this.id, what: 'inner gap wider than outer', text, props: ['gap'], value: `${g}px`, n: g,
      title: `\`${text}\` is wider than the space around its group: ${fmt(g)} inside, ${fmt(G)} between groups`,
      because: 'Proximity is how people read grouping: the gap inside a group must be smaller than the gap between groups, or the groups dissolve.',
      evidence: { inner: g, outer: G, axis }, confidence: 0.9, suggest,
    }];
  },
};

// #57. color-mix instead of opacity for text colour.
export const textOpacity = {
  id: 'craft/text-opacity', family: 'craft', number: [57], reads: ['style', 'text', 'ground'],
  threshold: { within: 32 },
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const o = parseFloat(s.opacity);
    if (!(o > 0 && o < 1) || !facts.text(el) || REPLACED.has(el.localName)) return [];
    if (s.animationName !== 'none') return []; // mid-fade is not a colour decision
    if (el.matches('[disabled], [aria-disabled="true"], :disabled') || el.closest('[disabled], [aria-disabled="true"]')) return []; // #26's territory
    const color = rgb(s.color);
    if (!color) return [];
    const ground = facts.ground(el);
    const mixed = [0, 1, 2].map((i) => Math.round(color[i] * o + ground[i] * (1 - o)));
    const cls = utility(el, 'opacity');
    const near = theme.nearestColor(mixed, this.threshold.within);
    const text = cls ?? 'opacity';
    const suggest = near && cls ? { kind: 'class', from: cls, to: `text-${near.short}`, why: `${near.short} is the colour this text shows here (${hex(mixed)}), without the layer` }
      : { kind: 'advice', text: near ? `Replace opacity ${o} with the colour ${near.short}: it is what this text shows here (${hex(mixed)}).` : `Replace opacity ${o} with a colour: color-mix(in oklab, currentColor ${Math.round(o * 100)}%, transparent), or a muted text token near ${hex(mixed)}.` };
    return [{
      key: this.id, what: 'text faded by opacity', text, props: ['color'], value: String(o), n: o,
      title: `\`${text}\` fades text through a layer: its colour then depends on what is behind it`,
      because: 'Opacity varies with the ground and composites a layer; a mixed colour (color-mix, or a muted token) is stable and cheaper to paint.',
      evidence: { opacity: o, color: hex(color), ground: hex(ground), mixed: hex(mixed) }, confidence: 0.9, suggest,
    }];
  },
};

// #37. Never land on half pixels: a pure translation whose offset is fractional in device pixels blurs text and lines.
export const halfPixel = {
  id: 'craft/half-pixel', family: 'craft', number: [37], reads: ['style', 'rect', 'text'],
  threshold: { slack: 0.05 },
  check({ el, facts }) {
    const s = facts.style(el);
    const r = facts.rect(el);
    // the whole translation: the transform matrix plus the individual `translate` (Tailwind v4's -translate-x-1/2),
    // whose percentages are of the element's own box
    let e = 0, f = 0;
    if (s.transform && s.transform !== 'none') {
      const m = /^matrix\(([^)]+)\)$/.exec(s.transform);
      if (!m) return [];
      const [a, b, c, d, mx, my] = m[1].split(',').map(Number);
      if (a !== 1 || b !== 0 || c !== 0 || d !== 1) return []; // a scale or rotation: fractions are inherent
      e += mx; f += my;
    }
    if (s.translate && s.translate !== 'none') {
      const [tx = '0px', ty = '0px'] = s.translate.split(/\s+/);
      const len = (v, size) => v.endsWith('%') ? (parseFloat(v) / 100) * size : parseFloat(v) || 0;
      e += len(tx, r.width); f += len(ty, r.height);
    }
    if ((s.scale && s.scale !== 'none' && !/^1(?:\s+1)?$/.test(s.scale)) || (s.rotate && s.rotate !== 'none' && parseFloat(s.rotate) !== 0)) return [];
    if (e === 0 && f === 0) return [];
    if (s.animationName !== 'none') return [];
    const hairline = r.width <= 1.01 || r.height <= 1.01;
    if (!facts.text(el) && !hairline) return [];
    const dpr = devicePixelRatio || 1, { slack } = this.threshold;
    const off = (v) => { const dv = Math.abs(v * dpr - Math.round(v * dpr)); return dv > slack && dv < 1 - slack; };
    const fx = off(e), fy = off(f);
    if (!fx && !fy) return [];
    const cls = utility(el, 'translate');
    const text = cls ?? 'transform';
    const half = cls && /1\/2$/.test(cls);
    const size = fx ? r.width : r.height, even = Math.ceil(size / 2) * 2;
    const suggest = { kind: 'advice', text: half
      ? `Give it an even size: it is ${fmt(size)} ${fx ? 'wide' : 'tall'}, so −50% is ${fmt(fx ? e : f)}; at ${even}px the shift lands on a pixel. Or translate by whole pixels.`
      : `Translate by whole pixels: ${fmt(e)}, ${fmt(f)} puts ${hairline ? 'this line' : 'this text'} between device pixels.` };
    return [{
      key: this.id, what: 'lands on a half pixel', text, props: ['transform'], value: `${e}px ${f}px`, n: fx ? e : f,
      title: `\`${text}\` lands on a half pixel: shifted ${fmt(e)}, ${fmt(f)}, so ${hairline ? 'the line' : 'its text'} blurs`,
      because: 'Fractional transforms rasterise text and 1px lines between device pixels, which smears them.',
      evidence: { x: e, y: f, dpr, width: r.width, height: r.height }, confidence: 0.9, suggest,
    }];
  },
};

// #38. Hairlines are 0.5px on a 2× screen: a divider drawn 1px wide there is twice as heavy as it means to be.
export const hairline = {
  id: 'craft/hairline', family: 'craft', number: [38], reads: ['style', 'rect'],
  threshold: { minDpr: 2 },
  check({ el, facts }) {
    if ((devicePixelRatio || 1) < this.threshold.minDpr) return [];
    const s = facts.style(el), r = facts.rect(el);
    // a divider: a 1px rule (an <hr>, or a box one pixel tall or wide), or a box drawn by one 1px side only
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((k) => s[`border${k}Style`] !== 'none' && Math.abs(px(s[`border${k}Width`]) - 1) < 0.01);
    const rule = (r.height <= 1.01 && r.width > 8) || (r.width <= 1.01 && r.height > 8);
    const oneSide = sides.length === 1;
    if (!rule && !oneSide) return [];
    if (rule && !(rgb(s.backgroundColor)?.[3] > 0) && !sides.length) return [];
    const cls = oneSide ? utility(el, `border-${sides[0][0].toLowerCase()}`) ?? utility(el, 'border') : utility(el, 'h') ?? utility(el, 'w');
    const text = cls ?? (oneSide ? `border-${sides[0].toLowerCase()}` : 'divider');
    return [{
      key: this.id, what: '1px divider on a 2× screen', text, props: oneSide ? [`border-${sides[0].toLowerCase()}-width`] : ['height'], value: '1px', n: 1,
      title: `\`${text}\` is a 1px line on a ${devicePixelRatio}× screen: twice as heavy as a hairline`,
      because: 'On a retina screen 1 CSS pixel is 2 device pixels; a divider meant to be a hairline reads as a heavy rule.',
      evidence: { dpr: devicePixelRatio, sides, rule }, confidence: 0.82,
      suggest: { kind: 'advice', text: oneSide ? `Draw it as a hairline: border-${sides[0].toLowerCase()}-width: 0.5px (or a 0.5px box-shadow), and keep 1px where the screen is 1×.` : 'Make the divider 0.5px tall (height: 0.5px, or transform: scaleY(0.5)) on 2× screens.' },
    }];
  },
};

// #39. An image gets a faint inner outline, so a light picture doesn't bleed into a light page (or dark into dark).
export const imageOutline = {
  id: 'craft/image-outline', family: 'craft', number: [39], reads: ['style', 'rect', 'ground'],
  threshold: { minSize: 20, sameGround: 0.12 },
  check({ el, facts }) {
    if (el.localName !== 'img' || !el.complete || !el.naturalWidth) return [];
    const r = facts.rect(el), s = facts.style(el);
    if (r.width < this.threshold.minSize || r.height < this.threshold.minSize) return [];
    if (s.outlineStyle !== 'none' && px(s.outlineWidth) > 0) return [];
    if (s.boxShadow !== 'none' || (px(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none')) return [];
    // the picture's edge, sampled small; a cross-origin picture can't be read, so it says nothing
    let edge;
    try {
      const c = Object.assign(document.createElement('canvas'), { width: 8, height: 8 }).getContext('2d', { willReadFrequently: true });
      c.drawImage(el, 0, 0, 8, 8);
      const d = c.getImageData(0, 0, 8, 8).data, at = (x, y) => (y * 8 + x) * 4;
      const ring = [];
      for (let i = 0; i < 8; i++) ring.push(at(i, 0), at(i, 7), at(0, i), at(7, i));
      edge = [0, 1, 2].map((k) => ring.reduce((n, o) => n + d[o + k], 0) / ring.length);
      if (ring.some((o) => d[o + 3] < 200)) return []; // a transparent edge is drawn on purpose
    } catch { return []; }
    const lum = ([r0, g0, b0]) => (0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0) / 255;
    const ground = facts.ground(el);
    if (Math.abs(lum(edge) - lum(ground)) > this.threshold.sameGround) return [];
    const dark = lum(ground) < 0.5;
    return [{
      key: this.id, what: 'image edge lost in the page', text: 'img', props: ['outline'], value: 'none', n: 0,
      title: `This image's edge is the same tone as the page around it, so its shape is lost`,
      because: 'A light picture on a light page (or dark on dark) has no edge; a faint inner outline gives it one without a visible border.',
      evidence: { edge: hex(edge), ground: hex(ground) }, confidence: 0.85,
      suggest: { kind: 'class', from: '', to: `outline outline-1 -outline-offset-1 ${dark ? 'outline-white/10' : 'outline-black/10'}`, why: 'a 1px inner outline at 10%, the hairline every image keeps' },
    }];
  },
};

// The layers of a computed box-shadow: [{ x, y, blur, spread, inset }].
function shadows(value) {
  if (!value || value === 'none') return [];
  return value.split(/,(?![^(]*\))/).map((layer) => {
    const nums = layer.replace(/rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]+/gi, '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return { x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0, inset: /inset/.test(layer) };
  });
}

// #51. Layered shadows: one big blur reads as a smudge; a few layers read as ambient and direct light.
export const layeredShadow = {
  id: 'craft/layered-shadow', family: 'craft', number: [51, 53], reads: ['style'],
  threshold: { blur: 16 },
  check({ el, facts }) {
    const s = facts.style(el);
    const layers = shadows(s.boxShadow).filter((l) => !l.inset && (l.blur > 0 || l.x || l.y));
    if (layers.length !== 1 || layers[0].blur < this.threshold.blur) return [];
    const l = layers[0];
    const cls = utility(el, 'shadow');
    const text = cls ?? 'box-shadow';
    const b = l.blur, y = Math.max(1, Math.round(l.y || b / 4));
    const stack = [[0.5, 1], [1, 2], [2, 4], [4, 8]].map(([k, m]) => `0 ${Math.round(y * k / 4 * 10) / 10}px ${Math.round(b * m / 8)}px rgb(0 0 0 / ${(0.04 * (5 - m / 2)).toFixed(2)})`).join(', ');
    return [{
      key: this.id, what: 'one big shadow layer', text, props: ['box-shadow'], value: s.boxShadow, n: b,
      title: `\`${text}\` is one ${fmt(b)} blur: a smudge rather than a lift`,
      because: 'Real shadows are ambient and direct light together; three to five stacked layers, blur and offset growing as opacity falls, read as height.',
      evidence: { blur: b, x: l.x, y: l.y }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Stack layers instead, e.g. box-shadow: ${stack}; keep the y-offset to blur ratio the same across your elevation steps.` },
    }];
  },
};

// The keyframes of an animation by name, from the page's own (readable) stylesheets.
function keyframes(name) {
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => { for (const r of list) { if (r.type === CSSRule.KEYFRAMES_RULE && r.name === name) return r; if (r.cssRules) { const k = walk(r.cssRules); if (k) return k; } } return null; };
    const k = walk(rules);
    if (k) return k;
  }
  return null;
}

// #63. Never scale from 0: an entrance from nothing looks like it came from nowhere.
export const scaleFromZero = {
  id: 'craft/scale-from-zero', family: 'craft', number: [63], reads: ['style'],
  threshold: {},
  check({ el, facts }) {
    const s = facts.style(el);
    if (!s.animationName || s.animationName === 'none') return [];
    const found = [];
    for (const name of s.animationName.split(',').map((n) => n.trim())) {
      const k = keyframes(name);
      if (!k) continue;
      const from = [...k.cssRules].find((r) => /(^|,)\s*(from|0%)\s*(,|$)/.test(r.keyText));
      if (!from) continue;
      const t = `${from.style.transform} ${from.style.scale}`;
      if (!/scale\(\s*0(\.0+)?\s*(,\s*0(\.0+)?\s*)?\)|scale3d\(\s*0\s*,\s*0|(^|\s)0(\s|$)/.test(t)) continue;
      found.push(name);
    }
    if (!found.length) return [];
    return [{
      key: this.id, what: 'entrance from scale 0', text: `@keyframes ${found[0]}`, props: ['animation'], value: '0', n: 0,
      title: `\`${found[0]}\` starts at scale(0): it appears from nowhere`,
      because: 'Starting at 0 makes an element look like it grew out of a point; 0.9–0.97 with a fade reads as arriving, and transform-origin at the trigger makes it grow out of its button.',
      evidence: { keyframes: found }, confidence: 0.9,
      suggest: { kind: 'advice', text: `Start ${found[0]} at scale(0.95) with opacity 0, and set transform-origin where it comes from (the trigger).` },
    }];
  },
};

// #74. A large z-index on an element in the flow is a z-index war: give its component its own stacking context.
export const zIndexWar = {
  id: 'craft/z-index-war', family: 'craft', number: [74], reads: ['style'],
  threshold: { above: 100 },
  check({ el, facts }) {
    const s = facts.style(el);
    const z = parseInt(s.zIndex, 10);
    if (!(z > this.threshold.above) || s.position === 'fixed') return [];
    // a top-level overlay (a direct child of body, or a dialog) is allowed its height
    if (el.parentElement === document.body || el.matches('dialog, [role="dialog"], [popover]')) return [];
    const cls = utility(el, 'z');
    const text = cls ?? `z-index: ${z}`;
    return [{
      key: this.id, what: 'z-index escalation', text, props: ['z-index'], value: String(z), n: z,
      title: `\`${text}\` climbs to ${z} inside the page: a z-index war`,
      because: 'Ever-higher numbers fight other components; isolation: isolate on the component gives it its own stacking context so small numbers work inside it.',
      evidence: { zIndex: z, position: s.position }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: 'z-10', why: 'a small number inside the component, with isolation: isolate on the component itself' } : { kind: 'advice', text: 'Put isolation: isolate on the component and use a small z-index inside it.' },
    }];
  },
};

// The left edge of an element's content: its first words, else its first visible child.
function contentLeft(el, facts) {
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE && n.data.trim()) { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width) return b.left; }
    if (n.nodeType === Node.ELEMENT_NODE) { const b = facts.rect(n); if (b.width && b.height) return b.left; }
  }
  return null;
}

// #1. Align content, not boxes: a filled, padded row whose words fall off the column its siblings' words share bleeds
// out by its padding (-mx-p px-p) so its fill escapes the column and its words stay on the line.
export const contentAlign = {
  id: 'craft/content-align', family: 'craft', number: [1], reads: ['style', 'rect', 'kids', 'parent'],
  threshold: { min: 4, siblings: 2 },
  check({ el, facts }, theme) {
    const parent = el.parentElement;
    if (!parent || parent === document.body) return [];
    const ps = facts.style(parent);
    if (!/flex/.test(ps.display) || !/column/.test(ps.flexDirection)) return [];
    const s = facts.style(el);
    const pl = px(s.paddingLeft);
    const filled = (rgb(s.backgroundColor)?.[3] ?? 0) > 0 || s.boxShadow !== 'none';
    if (!filled || pl < this.threshold.min) return [];
    const r = facts.rect(el), pr = facts.rect(parent);
    const column = pr.left + px(ps.borderLeftWidth) + px(ps.paddingLeft);
    if (Math.abs(r.left - column) > 0.5) return []; // the row already bleeds, or sits elsewhere
    // the pattern is a highlighted row among rows like it (a selected item in a list), not a card in a column of
    // mixed things: peers are siblings of the same kind and about the same height, at least one of them unfilled
    const isFilled = (k) => { const ks = facts.style(k); return (rgb(ks.backgroundColor)?.[3] ?? 0) > 0 || ks.boxShadow !== 'none'; };
    const peers = facts.kids(parent).filter((k) => k !== el && k.localName === el.localName && facts.rect(k).height >= r.height * 0.5 && facts.rect(k).height <= r.height * 2);
    if (!peers.some((k) => !isFilled(k))) return [];
    // the edge its peers' words share
    const edges = peers.filter((k) => !isFilled(k)).map((k) => contentLeft(k, facts)).filter((x) => x !== null);
    if (edges.length < this.threshold.siblings) return [];
    const onColumn = edges.filter((x) => Math.abs(x - column) < 1).length;
    if (onColumn < Math.ceil(edges.length * 0.6)) return [];
    const mine = contentLeft(el, facts);
    if (mine === null || Math.abs(mine - column - pl) > 1) return [];
    const step = theme.nearest('spacing', pl, 0.5);
    const cls = utility(el, 'px') ?? utility(el, 'pl') ?? utility(el, 'p');
    const suggest = step && cls ? { kind: 'class', from: '', to: `-mx-${step.short}`, why: `bleeds the fill out by its ${fmt(pl)} padding, so the words sit on the column` }
      : { kind: 'advice', text: `Pull the row out by its padding (margin-inline: -${fmt(pl)}) so its fill bleeds and its words line up with the column.` };
    return [{
      key: this.id, what: 'content off its column', text: cls ?? 'padding-left', props: ['margin-left'], value: `${pl}px`, n: pl,
      title: `This row's words sit ${fmt(pl)} in from the column its siblings' words share`,
      because: 'The eye follows letters, not boxes: a filled row should bleed out by its padding so its words stay on the line.',
      evidence: { column, content: mine, padding: pl, siblings: edges.length }, confidence: 0.86, suggest,
    }];
  },
};

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel, hairline, imageOutline, layeredShadow, scaleFromZero, zIndexWar, contentAlign];

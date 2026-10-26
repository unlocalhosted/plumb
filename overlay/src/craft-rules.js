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
 * Wave three:
 *  button-padding      #9      a text button is about twice as wide in padding as it is tall
 *  icon-side           #10     the side of a button with an icon takes less padding
 *  measure             #13     reading text runs 45–75 characters a line
 *  leading             #14     line height falls as type grows
 *  tracking            #15     small capitals are spaced out, large type is drawn in
 *  tabular-nums        #16     numbers in a column line up
 *  heading-widow       #18     a heading never ends on one word alone
 *  one-light           #20     shadows fall down, from one light
 *  border-on-shadow    #23     an elevated surface has a translucent border, not a solid grey one
 *  contrast            #24     small text has enough perceptual contrast (APCA)
 *  disabled-contrast   #26     disabled is not just lower opacity
 *  hit-target          #27     a control is at least 24px to hit
 *  media-size          #34     one avatar and icon size per list
 *  truncate-intent     #35     cut-off text shows its full value on hover
 *  scrollbar-gutter    #36     a large scroll area keeps room for its scrollbar
 *  bold-hover          #42     bold on hover does not move the row
 *  hanging-quote       #45     an opening quote hangs outside the column
 *  caps-case           #46     capitals get the case feature
 *  gradient-space      #55     a gradient between saturated colours runs in oklch
 *  input-zoom          #70     an input's text is at least 16px so iOS does not zoom
 *  anchor-offset       #73     an anchor target clears the sticky header
 *  middle-truncate     #76     a path or id is cut in the middle, not at the end
 *
 * Thresholds live on the rule, so noise is tuned in one place. Every rule says nothing when its evidence is
 * ambiguous: unequal insets, a running animation, a disabled control, a scale or rotation.
 * ───────────────────────────────────────────────────────── */
import { rgb, utility, classesOf } from './craft-read.js';
import { TIER } from './craft-facets.js';

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
  id: 'craft/concentric-radius', family: 'craft', number: [8, 41], tier: TIER.craft, owns: ['radius'], once: 'ancestor', reads: ['rect', 'style', 'parent'],
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
    // the radius a browser draws is at most half the box: a pill is its height over two, not 9999px
    const drawnR = Math.min(R, pr.width / 2, pr.height / 2), drawnr = Math.min(r, cr.width / 2, cr.height / 2);
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
    // flush in a corner the parent clips: the parent's own curve is the corner, the child's radius is never seen
    if (p < 0.5 && ps.overflow !== 'visible') return [];
    // the parent's curve ends before the child's edge: no relation to keep
    if (p >= drawnR - 0.5) return [];
    const wanted = Math.max(0, drawnR - p);
    if (Math.abs(drawnr - wanted) <= tolerance) return [];
    const cls = utility(el, 'rounded', { not: SIDE_RADIUS });
    const step = theme.nearest('radius', wanted, tolerance) ?? (wanted <= tolerance ? { short: 'none', px: 0 } : null);
    const text = cls ?? 'border-radius';
    const suggest = step && cls ? { kind: 'class', from: cls, to: `rounded-${step.short}`, why: `${step.short} is ${fmt(step.px)}, the concentric radius here (${fmt(R)} − ${fmt(p)})` }
      : step ? { kind: 'advice', text: `Set border-radius to ${fmt(step.px)} (rounded-${step.short}): the parent's ${fmt(R)} corner minus ${fmt(p)} of inset.` }
      : { kind: 'advice', text: `No radius token is near ${fmt(wanted)}. Add one, or inset this by ${fmt(R - r)} instead of ${fmt(p)} so ${text} stays concentric.` };
    return [{
      key: `${this.id}@${c.name}`, what: 'corners not concentric', text, props: [c.prop], value: `${r}px`, n: r,
      title: `\`${text}\` is not concentric: ${fmt(p)} inside a ${fmt(drawnR)} corner wants ${fmt(wanted)}, not ${fmt(drawnr)}`,
      because: 'A nested radius is the outer radius minus the padding; otherwise the two curves have different centres and the corner looks pinched or bulged.',
      evidence: { parentRadius: drawnR, inset: p, radius: drawnr, wanted, corner: c.name }, confidence: 0.92, suggest,
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
  id: 'craft/inner-outer-spacing', family: 'craft', number: [7], tier: TIER.craft, owns: ['gap'], once: 'ancestor', reads: ['style', 'kids', 'parent'],
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
  id: 'craft/text-opacity', family: 'craft', number: [57], tier: TIER.craft, owns: ['color'], once: 'ancestor', reads: ['style', 'text', 'ground'],
  threshold: { within: 32 },
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const o = parseFloat(s.opacity);
    if (!(o > 0 && o < 1) || !facts.text(el) || REPLACED.has(el.localName)) return [];
    if (s.animationName !== 'none') return []; // mid-fade is not a colour decision
    const color = rgb(s.color);
    if (!color) return [];
    const ground = facts.ground(el);
    const mixed = [0, 1, 2].map((i) => Math.round(color[i] * o + ground[i] * (1 - o)));
    const cls = utility(el, 'opacity');
    const near = theme.nearestColor(mixed, this.threshold.within);
    const text = cls ?? 'opacity';
    // the colour it replaces goes too: two text colours on one element are decided by Tailwind's order, not the edit
    const own = colourClass(el, 'text', theme);
    const suggest = near && cls ? { kind: 'class', from: [cls, own].filter(Boolean).join(' '), to: `text-${near.short}`, why: `${near.short} is the colour this text shows here (${hex(mixed)}), without the layer` }
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
  id: 'craft/half-pixel', family: 'craft', number: [37], tier: TIER.craft, owns: ['transform'], once: 'ancestor', reads: ['style', 'rect', 'text'],
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
  id: 'craft/hairline', family: 'craft', number: [38], tier: TIER.craft, owns: ['border'], once: 'ancestor', reads: ['style', 'rect'],
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
  id: 'craft/image-outline', family: 'craft', number: [39], tier: TIER.craft, owns: ['border'], once: 'ancestor', reads: ['style', 'rect', 'ground'],
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
  id: 'craft/layered-shadow', family: 'craft', number: [51, 53], tier: TIER.craft, owns: ['shadow'], once: 'ancestor', reads: ['style'],
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
  id: 'craft/scale-from-zero', family: 'craft', number: [63], tier: TIER.craft, owns: ['transform'], once: 'ancestor', reads: ['style'],
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
  id: 'craft/z-index-war', family: 'craft', number: [74], tier: TIER.craft, owns: ['stacking'], once: 'ancestor', reads: ['style'],
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
  id: 'craft/content-align', family: 'craft', number: [1], tier: TIER.craft, owns: ['margin-x'], once: 'ancestor', reads: ['style', 'rect', 'kids', 'parent'],
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


// ── wave three ──────────────────────────────────────────────

const CONTROL = 'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"], summary';
const disabled = (el) => el.matches(':disabled, [aria-disabled="true"]') || !!el.closest('[disabled], [aria-disabled="true"]');
const words = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const alpha = (c) => c?.[3] ?? 0;
// a over b, both [r, g, b, a]
const over = (a, b) => [0, 1, 2].map((i) => a[i] * alpha(a) + b[i] * (1 - alpha(a))).concat(1);
// a spacing utility for a px value: the theme's named step when one is that close, else Tailwind's numeric step
const space = (theme, value, prefix) => { const t = theme.nearest('spacing', value, 0.5); return t ? `${prefix}-${t.short}` : numeric(theme, value, prefix); };
// a numeric Tailwind step (`size-9`) when the project's --spacing unit divides the value, else the exact length
function numeric(theme, value, prefix) {
  const unit = theme.unit?.();
  const n = unit ? value / unit : NaN;
  return Number.isFinite(n) && Math.abs(n - Math.round(n * 4) / 4) < 0.01 ? `${prefix}-${Math.round(n * 4) / 4}` : `${prefix}-[${fmt(value)}]`;
}
const PALETTE = /^(?:black|white|transparent|current|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/[\d.]+)?$|^\[(?:#|rgb|hsl|oklch|oklab|color-mix|var\(--color)/;
// whether `prefix-rest` names a colour: one of the theme's, Tailwind's palette, or an arbitrary colour
const isColour = (rest, theme) => PALETTE.test(rest) || (theme?.colors?.() ?? []).some((c) => rest === c.short || rest.startsWith(`${c.short}/`));
// the classes of an element whose prefix sets a colour, e.g. border-ink-muted (not border, border-2, border-t)
function colourClass(el, prefix, theme) {
  for (const c of classesOf(el).split(/\s+/)) {
    if (!c.startsWith(prefix + '-') || c.includes(':')) continue;
    const rest = c.slice(prefix.length + 1);
    if (/^(?:\d|\[\d|[trblxyse]$|[trblxyse]-|solid|dashed|dotted|double|none|hidden|collapse|separate|spacing)/.test(rest)) continue;
    // text-body is a size, text-ink a colour: only a name the theme or the palette knows as a colour counts
    if (theme && !isColour(rest, theme)) continue;
    return c;
  }
  return null;
}
// The elements with a running or paused animation or transition, read once per pass.
const animatedMemo = new WeakMap();
function animated(facts) {
  let v = animatedMemo.get(facts);
  if (!v) animatedMemo.set(facts, (v = new Set(document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'paused').map((a) => a.effect?.target).filter(Boolean))));
  return v;
}
// The rows of a table, counted once per pass.
const rowsMemo = new WeakMap();
function rowsOf(facts, table) {
  let m = rowsMemo.get(facts);
  if (!m) rowsMemo.set(facts, (m = new Map()));
  if (!m.has(table)) m.set(table, table.querySelectorAll('tr, [role="row"]').length);
  return m.get(table);
}

// APCA 0.0.98G lightness contrast of text on ground, both [r, g, b]; positive for dark on light
function apca(text, ground) {
  const y = ([r, g, b]) => { const l = (c) => Math.pow(c / 255, 2.4); const v = 0.2126729 * l(r) + 0.7151522 * l(g) + 0.072175 * l(b); return v < 0.022 ? v + Math.pow(0.022 - v, 1.414) : v; };
  const yt = y(text), yb = y(ground);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) { const c = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14; return c < 0.1 ? 0 : (c - 0.027) * 100; }
  const c = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14; return c > -0.1 ? 0 : (c + 0.027) * 100;
}
// the line boxes of an element's own words
function lineCount(el, facts) {
  const s = facts.style(el), lh = px(s.lineHeight) || px(s.fontSize) * 1.2;
  const r = facts.rect(el), b = facts.box(el);
  return Math.round((r.height - b.pt - b.pb - b.bt - b.bb) / lh);
}

// #9. Equal padding isn't equal: a text button wants about twice as much padding across as down.
export const buttonPadding = {
  id: 'craft/button-padding', family: 'craft', number: [9], tier: TIER.craft, owns: ['padding-x'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  threshold: { ratio: 1.5, maxHeight: 56 },
  check({ el, facts }, theme) {
    if (!el.matches(CONTROL) || el.matches('a[href]') && !utility(el, 'px') && !utility(el, 'p')) return [];
    if (!/[\p{L}\p{N}]/u.test(words(el))) return [];
    const b = facts.box(el), r = facts.rect(el), s = facts.style(el);
    if (r.height > this.threshold.maxHeight || b.pt < 2 || Math.abs(b.pt - b.pb) > 0.5 || Math.abs(b.pl - b.pr) > 0.5) return [];
    if (Math.abs(r.width - r.height) < 2 && px(s.borderTopLeftRadius) >= r.height / 2 - 1) return []; // a round button
    if (b.pl / b.pt >= this.threshold.ratio) return [];
    const want = b.pt * 2;
    const cls = utility(el, 'px') ?? utility(el, 'p', { not: /^[trblxyse](?:-|$)/ });
    const to = cls?.startsWith('p-') ? `${space(theme, want, 'px')} ${space(theme, b.pt, 'py')}` : space(theme, want, 'px');
    return [{
      key: this.id, what: 'square padding on a text button', text: cls ?? 'padding', props: ['padding-left', 'padding-right'], value: `${b.pl}px`, n: b.pl,
      title: `\`${cls ?? 'padding'}\` pads this button ${fmt(b.pl)} across and ${fmt(b.pt)} down: words want about twice as much across`,
      because: 'Words are wide and short; the same padding all round looks cramped at the sides. Text buttons take about 2:1, icon buttons stay square.',
      evidence: { across: b.pl, down: b.pt }, confidence: 0.86,
      suggest: cls ? { kind: 'class', from: cls, to, why: `${fmt(want)} across to ${fmt(b.pt)} down`, sets: { paddingLeft: want, paddingRight: want } } : { kind: 'advice', text: `Pad it ${fmt(want)} across and ${fmt(b.pt)} down.` },
    }];
  },
};

// #10. The icon side gets less padding: a glyph box carries its own whitespace.
export const iconSide = {
  id: 'craft/icon-side', family: 'craft', number: [10], tier: TIER.craft, owns: ['padding-x'], once: 'ancestor', after: ['craft/button-padding'], reads: ['style', 'kids', 'text'],
  threshold: { min: 8, less: 2 },
  check({ el, facts }, theme) {
    if (!el.matches(CONTROL)) return [];
    const kids = facts.kids(el);
    const icon = (k) => k && (k.localName === 'svg' || k.localName === 'img' || k.matches('[data-icon], [aria-hidden="true"]') && !/\S/.test(k.textContent ?? '') || k.querySelector?.('svg') && !/\S/.test(k.textContent ?? ''));
    const text = /[\p{L}\p{N}]/u.test(words(el));
    if (!text || kids.length < 1) return [];
    const lead = icon(kids[0]) && !(kids.length === 1 && !facts.text(el)), tail = kids.length > 0 && icon(kids.at(-1)) && !lead;
    if (!lead && !tail) return [];
    const b = facts.box(el);
    if (b.pl < this.threshold.min || Math.abs(b.pl - b.pr) > 0.5) return [];
    const side = lead ? 'l' : 'r', other = lead ? 'r' : 'l';
    const less = b.pl - 4 >= 4 ? b.pl - 4 : b.pl - this.threshold.less;
    const cls = utility(el, 'px');
    return [{
      key: this.id, what: 'icon side padded like the text side', text: cls ?? 'padding', props: [lead ? 'padding-left' : 'padding-right'], value: `${b.pl}px`, n: b.pl,
      title: `The ${lead ? 'leading' : 'trailing'} icon side is padded ${fmt(b.pl)}, the same as the text side`,
      because: 'An icon carries whitespace inside its glyph box, so the same padding looks wider on its side; take 2–4px off it.',
      evidence: { padding: b.pl, side: lead ? 'left' : 'right' }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: `${space(theme, less, `p${side}`)} ${space(theme, b.pl, `p${other}`)}`, why: `${fmt(less)} on the icon side, ${fmt(b.pl)} on the text side`, sets: { [lead ? 'paddingLeft' : 'paddingRight']: less } } : { kind: 'advice', text: `Pad the icon side ${fmt(less)}, the text side ${fmt(b.pl)}.` },
    }];
  },
};

// #13. 45–75 characters a line for reading text.
export const measure = {
  id: 'craft/measure', family: 'craft', number: [13], tier: TIER.legibility, owns: ['size'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  threshold: { max: 90, chars: 240 },
  check({ el, facts }) {
    if (!el.matches('p, li, dd, blockquote') || !facts.text(el)) return [];
    const text = words(el);
    if (text.length < this.threshold.chars) return [];
    const s = facts.style(el), r = facts.rect(el), b = facts.box(el);
    const fs = px(s.fontSize), width = r.width - b.pl - b.pr;
    // the average glyph of running text is about half an em wide
    const perLine = width / (fs * 0.5);
    if (perLine <= this.threshold.max || lineCount(el, facts) < 3) return [];
    const cls = utility(el, 'max-w');
    return [{
      key: this.id, what: 'lines too long to read', text: cls ?? 'max-width', props: ['max-width'], value: `${Math.round(perLine)}ch`, n: Math.round(perLine),
      title: `About ${Math.round(perLine)} characters a line: past 75, the eye loses the start of the next line`,
      because: 'Long lines lose the return sweep; 45–75 characters keeps reading easy.',
      evidence: { perLine: Math.round(perLine), width, fontSize: fs }, confidence: 0.84,
      suggest: { kind: 'class', from: cls ?? '', to: 'max-w-prose', why: 'about 65 characters a line' },
    }];
  },
};

// #14. Line height shrinks as size grows: body about 1.5, headings 1.1–1.25.
export const leading = {
  id: 'craft/leading', family: 'craft', number: [14], tier: TIER.legibility, owns: ['line-height'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  threshold: { large: 30, loose: 1.4, small: 18, tight: 1.3 },
  check({ el, facts }) {
    if (!facts.text(el)) return [];
    const s = facts.style(el), fs = px(s.fontSize), lh = px(s.lineHeight);
    if (!lh || !fs) return [];
    const ratio = lh / fs, lines = lineCount(el, facts);
    const big = fs >= this.threshold.large && ratio > this.threshold.loose && lines >= 1;
    const cramped = fs <= this.threshold.small && ratio < this.threshold.tight && lines >= 3;
    if (!big && !cramped) return [];
    const cls = utility(el, 'leading');
    const to = big ? 'leading-tight' : 'leading-normal';
    return [{
      key: `${this.id}@${big ? 'loose' : 'tight'}`, what: big ? 'loose leading on large type' : 'tight leading on body text', text: cls ?? 'line-height', props: ['line-height'], value: ratio.toFixed(2), n: ratio,
      title: big ? `${fmt(fs)} type at ${ratio.toFixed(2)} line height: the lines drift apart` : `${fmt(fs)} running text at ${ratio.toFixed(2)} line height: the lines crowd`,
      because: 'Leading falls as size grows: body text reads at about 1.5, headings at 1.1–1.25; big type with loose leading looks like separate lines.',
      evidence: { fontSize: fs, lineHeight: lh, ratio, lines }, confidence: 0.83,
      suggest: { kind: 'class', from: cls ?? '', to, why: big ? '1.25 for large type' : '1.5 for running text' },
    }];
  },
};

// #15. Tighten large type; space out small capitals.
export const tracking = {
  id: 'craft/tracking', family: 'craft', number: [15], tier: TIER.legibility, owns: ['letter-spacing'], once: 'ancestor', reads: ['style', 'text'],
  threshold: { caps: 14, large: 36 },
  check({ el, facts }) {
    if (!facts.text(el)) return [];
    const s = facts.style(el), fs = px(s.fontSize);
    const ls = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing);
    const caps = s.textTransform === 'uppercase' && fs <= this.threshold.caps && ls / fs < 0.02;
    const large = fs >= this.threshold.large && ls > 0;
    if (!caps && !large) return [];
    const cls = utility(el, 'tracking');
    return [{
      key: `${this.id}@${caps ? 'caps' : 'large'}`, what: caps ? 'small capitals set tight' : 'large type spaced out', text: cls ?? 'letter-spacing', props: ['letter-spacing'], value: s.letterSpacing, n: ls,
      title: caps ? `${fmt(fs)} capitals with no added tracking: they crowd` : `${fmt(fs)} type with positive tracking: large letters already look loose`,
      because: 'Large letters look loose and want −0.01 to −0.03em; small capitals look cramped and want +0.04 to +0.08em.',
      evidence: { fontSize: fs, letterSpacing: ls, uppercase: s.textTransform === 'uppercase' }, confidence: 0.84,
      suggest: { kind: 'class', from: cls ?? '', to: caps ? 'tracking-wider' : 'tracking-tight', why: caps ? '+0.05em for small capitals' : '−0.025em for large type' },
    }];
  },
};

// #16. Tabular numbers where numbers line up: a column of figures in a table.
export const tabularNums = {
  id: 'craft/tabular-nums', family: 'craft', number: [16], tier: TIER.legibility, owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  threshold: { rows: 3 },
  check({ el, facts }) {
    if (!el.matches('td, th, [role="cell"], [role="gridcell"]')) return [];
    const text = words(el);
    if (!/^[\s$€£¥₹+\-−–.,:%()\d]+$/.test(text) || (text.match(/\d/g) ?? []).length < 2) return [];
    const table = el.closest('table, [role="table"], [role="grid"]');
    if (!table || rowsOf(facts, table) < this.threshold.rows) return [];
    const s = facts.style(el);
    if (/tabular-nums/.test(s.fontVariantNumeric) || /"tnum"/.test(s.fontFeatureSettings)) return [];
    if (/mono/i.test(s.fontFamily)) return [];
    return [{
      key: this.id, what: 'proportional figures in a column', text: 'font-variant-numeric', props: ['font-variant-numeric'], value: s.fontVariantNumeric, n: 0,
      title: 'Numbers in this column use proportional figures, so they don\'t line up',
      because: 'Proportional digits have different widths: columns misalign and counters jitter. Tabular figures are all one width.',
      evidence: { text }, confidence: 0.88,
      suggest: { kind: 'class', from: '', to: 'tabular-nums', why: 'every digit one width' },
    }];
  },
};

// #18. No widows in headings: balance the lines.
export const headingWidow = {
  id: 'craft/heading-widow', family: 'craft', number: [18], tier: TIER.legibility, owns: ['text-flow'], once: 'ancestor', reads: ['style', 'text'],
  threshold: { words: 3 },
  check({ el, facts }) {
    if (!el.matches('h1, h2, h3') || !facts.text(el)) return [];
    const s = facts.style(el);
    if (/balance|pretty/.test(`${s.textWrap ?? ''} ${s.textWrapStyle ?? ''}`)) return [];
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && /\S/.test(n.data));
    const last = nodes.at(-1);
    if (!last || words(el).split(' ').length < this.threshold.words) return [];
    const m = /(\S+)(\s+)(\S+)\s*$/.exec(last.data);
    if (!m) return [];
    const at = (start, end) => { const r = document.createRange(); r.setStart(last, start); r.setEnd(last, end); return r.getClientRects()[0]; };
    const end = m.index + m[0].trimEnd().length;
    const lastWord = at(end - m[3].length, end), before = at(m.index, m.index + m[1].length);
    if (!lastWord || !before || lastWord.top <= before.top + 1) return [];
    return [{
      key: this.id, what: 'one word alone on the last line', text: 'text-wrap', props: ['text-wrap'], value: m[3], n: 1,
      title: `This heading ends with "${m[3]}" alone on its last line`,
      because: 'A single word on the last line of a heading looks broken; balanced wrapping evens the lines.',
      evidence: { word: m[3] }, confidence: 0.88,
      suggest: { kind: 'class', from: '', to: 'text-balance', why: 'lines of even length' },
    }];
  },
};

// #20. One light source: shadows fall the same way, down.
export const oneLight = {
  id: 'craft/one-light', family: 'craft', number: [20], tier: TIER.craft, owns: ['shadow'], once: 'ancestor', reads: ['style'],
  threshold: { blur: 2 },
  check({ el, facts }) {
    const s = facts.style(el);
    if (s.position === 'fixed') return []; // a drawer may cast to its side
    const off = shadows(s.boxShadow).filter((l) => !l.inset && l.blur >= this.threshold.blur && (l.y < 0 || Math.abs(l.x) > Math.abs(l.y) + 2));
    if (!off.length) return [];
    const l = off[0], cls = utility(el, 'shadow');
    return [{
      key: this.id, what: 'shadow cast from another light', text: cls ?? 'box-shadow', props: ['box-shadow'], value: `${l.x}px ${l.y}px`, n: l.y,
      title: `\`${cls ?? 'box-shadow'}\` falls ${l.y < 0 ? 'upward' : 'sideways'} (${fmt(l.x)}, ${fmt(l.y)}): another light than the rest of the page`,
      because: 'All shadows on a page come from one light, usually above; one cast another way looks pasted in.',
      evidence: { x: l.x, y: l.y }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Cast it down: x 0, y ${fmt(Math.max(1, Math.abs(l.y) || Math.abs(l.x)))}, the same direction as your elevation scale.` },
    }];
  },
};

// #23. Translucent borders on elevated surfaces.
export const borderOnShadow = {
  id: 'craft/border-on-shadow', family: 'craft', number: [23], tier: TIER.craft, owns: ['border'], once: 'ancestor', reads: ['style', 'ground'],
  threshold: { blur: 4, grey: 24 },
  check({ el, facts }, theme) {
    const s = facts.style(el);
    if (!shadows(s.boxShadow).some((l) => !l.inset && l.blur >= this.threshold.blur)) return [];
    if (!['Top', 'Right', 'Bottom', 'Left'].every((k) => px(s[`border${k}Width`]) >= 1 && s[`border${k}Style`] !== 'none')) return [];
    const c = rgb(s.borderTopColor);
    if (!c || c[3] < 1) return [];
    if (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > this.threshold.grey) return []; // a coloured border is a decision
    const dark = (0.2126 * facts.ground(el)[0] + 0.7152 * facts.ground(el)[1] + 0.0722 * facts.ground(el)[2]) / 255 < 0.5;
    const cls = colourClass(el, 'border', theme);
    const to = dark ? 'border-white/10' : 'border-black/10';
    return [{
      key: this.id, what: 'solid border fighting a shadow', text: cls ?? 'border-color', props: ['border-color'], value: hex(c), n: 0,
      title: `\`${cls ?? 'border-color'}\` is a solid ${hex(c)} edge on a raised surface: it fights the shadow`,
      because: 'An opaque grey border draws a hard line around a soft shadow; a translucent one darkens the ground and sits inside the light.',
      evidence: { border: hex(c) }, confidence: 0.83,
      suggest: { kind: 'class', from: cls ?? '', to, why: 'a 10% edge that takes the colour of what is behind it' },
    }];
  },
};

// #24. Perceptual contrast for small text (APCA).
export const contrast = {
  id: 'craft/contrast', family: 'craft', number: [24], tier: TIER.access, owns: ['color'], once: 'ancestor', reads: ['style', 'text', 'ground'],
  threshold: { small: 60, bold: 50, large: 45 },
  check({ el, facts }, theme) {
    if (!facts.text(el) || el.closest('[aria-hidden="true"]')) return [];
    const s = facts.style(el);
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const ns = facts.style(n); if (ns.backgroundImage !== 'none') return []; if (alpha(rgb(ns.backgroundColor)) > 0.5) break; }
    const ground = facts.ground(el), c = rgb(s.color);
    if (!c) return [];
    // the text as it shows: its own alpha and every fade on the way up
    let fade = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      // a fade still running (an entrance, a reveal on scroll) is a moment, not the text's colour: judge it at rest
      if (animated(facts).has(n)) return [];
      fade *= parseFloat(facts.style(n).opacity) || 0;
    }
    if (fade < 0.05) return []; // not shown at all (waiting to be revealed): there is nothing to read yet
    const text = over([c[0], c[1], c[2], alpha(c) * fade], ground);
    const fs = px(s.fontSize), w = parseInt(s.fontWeight, 10) || 400;
    // APCA reads weight as size: a heavier stroke reads like a larger one, so the floor falls with both
    const large = fs >= 24 || fs >= 18 && w >= 600;
    const need = large ? this.threshold.large : fs >= 14 && w >= 600 ? this.threshold.bold : this.threshold.small;
    const lc = Math.abs(apca(text, ground));
    if (lc >= need) return [];
    return [{
      key: this.id, what: 'too little contrast to read', text: colourClass(el, 'text', theme) ?? 'color', props: ['color'], value: `Lc ${Math.round(lc)}`, n: Math.round(lc),
      title: `${fmt(fs)} text at APCA Lc ${Math.round(lc)} on its ground: ${need} is the floor for ${large ? 'large' : need === this.threshold.bold ? 'bold small' : 'small'} text`,
      because: 'Perceptual contrast (APCA) predicts what people can read better than WCAG 2 ratios, most of all on dark themes and small sizes.',
      evidence: { lc: Math.round(lc), need, color: hex(text), ground: hex(ground), fontSize: fs, weight: w }, confidence: 0.85,
      suggest: { kind: 'advice', text: `Darken${(0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2]) / 255 < 0.5 ? ' (here: lighten)' : ''} the text until Lc reaches ${need}, or set it larger or bolder.` },
    }];
  },
};

// #26. Disabled is not just lower opacity: a faded coloured control loses its words.
export const disabledContrast = {
  id: 'craft/disabled-contrast', family: 'craft', number: [26], tier: TIER.access, owns: ['color'], once: 'ancestor', refines: ['craft/contrast', 'craft/text-opacity'],
  // an inactive control (and the words inside it) is judged by this rule alone, whether it passes or not: WCAG 1.4.3
  // exempts it from text contrast, and its opacity is a state, not a colour choice
  scope: ({ el }) => disabled(el), reads: ['style', 'ground'],
  threshold: { min: 45 },
  check({ el, facts }) {
    if (!el.matches(':disabled, [aria-disabled="true"]') || !el.matches('button, [role="button"], input, a')) return [];
    const s = facts.style(el), o = parseFloat(s.opacity);
    if (!(o < 1)) return [];
    const parentGround = el.parentElement ? facts.ground(el.parentElement) : [255, 255, 255, 1];
    const fill = rgb(s.backgroundColor), c = rgb(s.color);
    if (!c) return [];
    const base = alpha(fill) > 0 ? over(fill, parentGround) : parentGround;
    const shownText = over([...over(c, base).slice(0, 3), o], parentGround), shownFill = over([...base.slice(0, 3), o], parentGround);
    const lc = Math.abs(apca(shownText, shownFill));
    if (lc >= this.threshold.min) return [];
    const cls = utility(el, 'disabled:opacity') ?? utility(el, 'opacity');
    return [{
      key: this.id, what: 'disabled by opacity alone', text: cls ?? 'opacity', props: ['opacity'], value: String(o), n: o,
      title: `Disabled by fading to ${o}: its words drop to Lc ${Math.round(lc)}`,
      because: 'Opacity on a coloured control fades the words with the fill until they can\'t be read, and the control just looks broken.',
      evidence: { opacity: o, lc: Math.round(lc) }, confidence: 0.84,
      suggest: { kind: 'advice', text: 'Give disabled its own colours (a muted fill and muted text tokens, still readable) and cursor: not-allowed, rather than opacity.' },
    }];
  },
};

// #27. Hit targets at least 24px, even when the drawing is smaller.
export const hitTarget = {
  id: 'craft/hit-target', family: 'craft', number: [27], tier: TIER.access, owns: ['size', 'padding-y'], once: 'ancestor', reads: ['rect', 'style', 'text'],
  threshold: { min: 24, long: 64 },
  check({ el, facts }) {
    if (!el.matches('button, [role="button"], a[href], input:not([type="hidden"]), select, summary, [role="checkbox"], [role="switch"], [role="tab"]') || disabled(el)) return [];
    // a link inside a sentence is as tall as the line, and that is right
    if (el.matches('a[href]') && el.parentElement && facts.text(el.parentElement) && facts.style(el).display === 'inline') return [];
    if (el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) return []; // its label is the target
    const r = facts.rect(el), { min, long } = this.threshold;
    // a wide, short row (a summary across the page) is easy to hit along its length
    if (r.width >= min && r.height >= min || r.width === 0 || r.height === 0 || Math.max(r.width, r.height) >= long) return [];
    const short = Math.min(r.width, r.height);
    return [{
      key: this.id, what: 'too small to hit', text: el.localName, props: ['width', 'height'], value: `${Math.round(r.width)}×${Math.round(r.height)}`, n: short,
      title: `This control is ${Math.round(r.width)}×${Math.round(r.height)}px to hit: under ${min}px, people miss it`,
      because: 'Small targets miss, most of all on touch: a control is at least 24px to hit (44 on touch), even when what it draws is smaller.',
      evidence: { width: r.width, height: r.height }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Grow its hit area to ${min}px: padding, min-h-6 min-w-6, or an absolutely placed ::before at inset -${fmt((min - short) / 2)}.` },
    }];
  },
};

// #34. One avatar and icon size per list.
export const mediaSize = {
  id: 'craft/media-size', family: 'craft', number: [34], tier: TIER.craft, owns: ['size'], once: 'ancestor', reads: ['rect', 'kids'],
  threshold: { min: 12, near: 12 },
  check({ el, facts }, theme) {
    if (!el.matches('img, svg, [data-avatar]')) return [];
    const r = facts.rect(el);
    if (r.width < this.threshold.min) return [];
    // the row it sits in: the nearest ancestor (three levels up at most) with siblings of its own kind
    let row = el.parentElement;
    for (let i = 0; row && i < 3; i++, row = row.parentElement) {
      const sibs = row.parentElement ? [...row.parentElement.children].filter((k) => k.localName === row.localName && k.className === row.className) : [];
      if (sibs.length >= 3) break;
    }
    if (!row || !row.parentElement) return [];
    const path = []; for (let n = el; n !== row; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
    const peers = [...row.parentElement.children].filter((k) => k.localName === row.localName && k.className === row.className);
    if (peers.length < 3) return [];
    const sizes = peers.map((p) => { let n = p; for (const i of path) n = n?.children[i]; return n && n.localName === el.localName ? Math.round(facts.rect(n).width) : null; }).filter((w) => w !== null);
    const count = new Map(); for (const w of sizes) count.set(w, (count.get(w) ?? 0) + 1);
    const [mode, times] = [...count].sort((a, b) => b[1] - a[1])[0] ?? [];
    const mine = Math.round(r.width);
    if (!mode || mine === mode || times < 2 || times <= sizes.length / 2 || Math.abs(mine - mode) > this.threshold.near) return [];
    const cls = utility(el, 'size') ?? utility(el, 'w');
    return [{
      key: this.id, what: 'one size off in a list', text: cls ?? 'size', props: ['width'], value: `${mine}px`, n: mine,
      title: `This one is ${mine}px where the rest of the list is ${mode}px`,
      because: 'Media of one list are one size; 32 next to 36 looks like a mistake, not a choice.',
      evidence: { mine, mode, of: sizes.length }, confidence: 0.86,
      suggest: cls ? { kind: 'class', from: cls, to: numeric(theme, mode, cls.replace(/^!|!$/g, '').split('-')[0]), why: `${mode}px like the others` } : { kind: 'advice', text: `Make it ${mode}px like the others.` },
    }];
  },
};

const truncated = (el, s) => s.textOverflow === 'ellipsis' && s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1;
const pathLike = (t) => /^\S+$/.test(t) && ((t.match(/[/\\]/g) ?? []).length >= 2 || /^[0-9a-f]{16,}$/i.test(t) || /^[\w-]+(?:\.[\w-]+){2,}$/.test(t));

// #35. Truncate with intent: what is cut off shows in full on hover.
export const truncateIntent = {
  id: 'craft/truncate-intent', family: 'craft', number: [35], tier: TIER.legibility, owns: ['text-flow'], once: 'ancestor', reads: ['style'],
  threshold: {},
  check({ el, facts }) {
    const s = facts.style(el);
    if (!truncated(el, s)) return [];
    for (let n = el, i = 0; n && i < 3; n = n.parentElement, i++) if (n.hasAttribute('title') || n.hasAttribute('aria-label') || n.hasAttribute('data-tooltip')) return [];
    return [{
      key: this.id, what: 'cut off with no way to read it', text: utility(el, 'truncate') ?? 'text-overflow', props: ['text-overflow'], value: 'ellipsis', n: 0,
      title: 'This text is cut off and nothing shows the rest',
      because: 'Truncation hides words; the full value belongs on hover (a title or a tooltip), with min-width: 0 on its flex parent.',
      evidence: { text: words(el).slice(0, 80) }, confidence: 0.85,
      suggest: { kind: 'advice', text: 'Show the full value on hover: title={value} on this element (or a tooltip).' },
    }];
  },
};

// #36. A large scroll area keeps room for its scrollbar, so its content doesn't shift when one appears.
export const scrollbarGutter = {
  id: 'craft/scrollbar-gutter', family: 'craft', number: [36], tier: TIER.legibility, owns: ['scroll'], once: 'ancestor', reads: ['style', 'rect'],
  threshold: { width: 280, height: 200 },
  check({ el, facts }) {
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el);
    if (!/auto/.test(s.overflowY) || s.scrollbarGutter !== 'auto') return [];
    const r = facts.rect(el);
    if (r.width < this.threshold.width || r.height < this.threshold.height) return [];
    return [{
      key: this.id, what: 'layout shifts when it scrolls', text: utility(el, 'overflow-y') ?? utility(el, 'overflow') ?? 'overflow', props: ['scrollbar-gutter'], value: 'auto', n: 0,
      title: 'This scroll area\'s content moves sideways when its scrollbar appears',
      because: 'With classic scrollbars the content narrows the moment it overflows; a stable gutter keeps the room.',
      evidence: { width: r.width, height: r.height }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: '[scrollbar-gutter:stable]', why: 'room for the scrollbar kept from the start' },
    }];
  },
};

// The hover rules of the page's readable stylesheets that set font-weight, as selectors without the :hover; kept a second.
let hoverMemo = { at: 0, list: [] };
function hoverWeights() {
  if (performance.now() - hoverMemo.at < 1000) return hoverMemo.list;
  const list = [];
  const walk = (rules) => { for (const r of rules) { if (r.selectorText && /:hover/.test(r.selectorText) && r.style?.fontWeight) list.push(r.selectorText.replace(/:hover/g, '')); if (r.cssRules) walk(r.cssRules); } };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch {} }
  return (hoverMemo = { at: performance.now(), list }).list;
}

// #42. Bold on hover must not shift layout.
export const boldHover = {
  id: 'craft/bold-hover', family: 'craft', number: [42], tier: TIER.legibility, owns: ['font-weight'], once: 'ancestor', reads: ['style'],
  threshold: {},
  check({ el, facts }) {
    if (!facts.text(el)) return [];
    const cls = classesOf(el).split(/\s+/).find((c) => /(?:^|:)(?:group-)?hover:font-(?!mono|sans|serif)/.test(c));
    const css = !cls && hoverWeights().some((sel) => { try { return sel && el.matches(sel); } catch { return false; } });
    if (!cls && !css) return [];
    const after = getComputedStyle(el, '::after').content;
    if (after && after !== 'none' && after !== 'normal') return []; // a reserved bold copy
    return [{
      key: this.id, what: 'hover weight moves the row', text: cls ?? 'font-weight', props: ['font-weight'], value: facts.style(el).fontWeight, n: 0,
      title: `\`${cls ?? ':hover font-weight'}\` widens the words on hover, so the row jumps`,
      because: 'A heavier weight is wider; without its width reserved the neighbours shift every time the pointer passes.',
      evidence: { hover: cls ?? 'stylesheet' }, confidence: 0.85,
      suggest: { kind: 'advice', text: 'Reserve the bold width: a hidden bold copy in ::after (content: attr(data-text); font-weight: bold; height: 0; visibility: hidden; display: block), or change colour instead of weight.' },
    }];
  },
};

// #45. Hanging punctuation: an opening quote hangs outside the text edge.
export const hangingQuote = {
  id: 'craft/hanging-quote', family: 'craft', number: [45], tier: TIER.craft, owns: ['text-flow'], once: 'ancestor', reads: ['style', 'text'],
  threshold: {},
  check({ el, facts }) {
    if (!el.matches('blockquote, blockquote > p, q, p') || !facts.text(el)) return [];
    const first = [...el.childNodes].find((n) => n.nodeType === 3 && /\S/.test(n.data));
    if (!first || !/^\s*["“‘'«]/.test(first.data) || first !== el.firstChild && el.firstChild?.nodeType !== 3) return [];
    const s = facts.style(el);
    if (px(s.textIndent) < 0 || /first/.test(s.hangingPunctuation ?? '')) return [];
    if (el.matches('blockquote > p') && el.parentElement && el.parentElement.firstElementChild !== el) return [];
    return [{
      key: this.id, what: 'quote mark inside the column', text: 'text-indent', props: ['text-indent'], value: s.textIndent, n: 0,
      title: 'The opening quote sits inside the column, so the letters start a mark-width in',
      because: 'Letters, not marks, should line up with the column: the opening quote hangs outside it.',
      evidence: { first: first.data.trim()[0] }, confidence: 0.82,
      suggest: { kind: 'advice', text: 'Hang it: text-indent: -0.45em on this block (Safari also takes hanging-punctuation: first).' },
    }];
  },
};

// #46. Capitals get the case feature, so hyphens, brackets and @ sit at their height.
export const capsCase = {
  id: 'craft/caps-case', family: 'craft', number: [46], tier: TIER.craft, owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  threshold: {},
  check({ el, facts }) {
    if (!facts.text(el)) return [];
    const s = facts.style(el);
    if (s.textTransform !== 'uppercase' && !/^[^a-z]*[A-Z]{3}[^a-z]*$/.test(words(el))) return [];
    if (!/[-()@\[\]{}:—–·]/.test(words(el)) || /"case"/.test(s.fontFeatureSettings)) return [];
    return [{
      key: this.id, what: 'marks set low among capitals', text: 'font-feature-settings', props: ['font-feature-settings'], value: s.fontFeatureSettings, n: 0,
      title: 'Capitals with hyphens or brackets, and no case feature: the marks sit at lowercase height',
      because: 'Punctuation is drawn for lowercase; the case feature raises hyphens, brackets and @ to sit with capitals.',
      evidence: { text: words(el).slice(0, 40) }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: "[font-feature-settings:'case']", why: 'marks raised to capital height' },
    }];
  },
};

// The colour stops of a computed gradient, as rgb arrays.
const stops = (bg) => [...bg.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0])).filter(Boolean);
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, sat, l];
}

// #55. Interpolate gradients in OKLCH/OKLab: sRGB goes grey between saturated colours.
export const gradientSpace = {
  id: 'craft/gradient-space', family: 'craft', number: [55], tier: TIER.craft, owns: ['background'], once: 'ancestor', reads: ['style'],
  threshold: { saturation: 0.45, hue: 60 },
  check({ el, facts }) {
    const bg = facts.style(el).backgroundImage;
    if (!/gradient\(/.test(bg) || /\bin (?:oklab|oklch|lab|lch|hsl|display-p3)/.test(bg)) return [];
    const c = stops(bg).filter((x) => alpha(x) > 0.5).map(hsl);
    if (c.length < 2) return [];
    const [a, b] = [c[0], c.at(-1)];
    const dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0]));
    if (a[1] < this.threshold.saturation || b[1] < this.threshold.saturation || dh < this.threshold.hue) return [];
    const cls = classesOf(el).split(/\s+/).find((k) => /^bg-(?:linear|gradient)-to-[a-z]+$/.test(k));
    return [{
      key: this.id, what: 'gradient greys out in the middle', text: cls ?? 'background-image', props: ['background-image'], value: 'srgb', n: dh,
      title: `This gradient runs between two saturated colours ${Math.round(dh)}° apart in sRGB: it goes grey in the middle`,
      because: 'sRGB interpolation passes through desaturated mixes; OKLCH keeps the chroma between saturated stops.',
      evidence: { from: hex(stops(bg)[0]), to: hex(stops(bg).at(-1)), hue: Math.round(dh) }, confidence: 0.84,
      suggest: cls ? { kind: 'class', from: cls, to: `${cls.replace('bg-gradient-', 'bg-linear-')}/oklch`, why: 'interpolated in OKLCH' } : { kind: 'advice', text: 'Interpolate it in OKLCH: linear-gradient(in oklch to right, …).' },
    }];
  },
};

// #70. Inputs at least 16px, or iOS Safari zooms the page on focus.
export const inputZoom = {
  id: 'craft/input-zoom', family: 'craft', number: [70], tier: TIER.access, owns: ['font-size'], once: 'ancestor', reads: ['style'],
  threshold: { min: 16 },
  check({ el, facts }) {
    if (!el.matches('input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="hidden"], [type="button"], [type="submit"], [type="reset"], [type="image"]), textarea, select') || disabled(el)) return [];
    const fs = px(facts.style(el).fontSize);
    if (fs >= this.threshold.min) return [];
    // only a class known to be a size under 16px is swapped; a theme's own size name (text-small) gets advice
    const cls = classesOf(el).split(/\s+/).find((c) => /^text-(?:xs|sm)$/.test(c) || (/^text-\[(\d+(?:\.\d+)?)px\]$/.exec(c)?.[1] ?? 99) < 16);
    return [{
      key: this.id, what: 'zooms the page on iOS', text: cls ?? 'font-size', props: ['font-size'], value: `${fs}px`, n: fs,
      title: `This field's text is ${fmt(fs)}: iOS Safari zooms the page when it's focused`,
      because: 'Safari on iPhone zooms in on any field under 16px and leaves the page zoomed.',
      evidence: { fontSize: fs }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: `text-base md:${cls}`, why: '16px on phones, your size from md up' } : { kind: 'advice', text: `Give the field 16px text on phones (text-base), keeping ${fmt(fs)} from md up.` },
    }];
  },
};

// The sticky or fixed header across the top of the page, measured once per pass.
const headers = new WeakMap();
function stickyHeader(facts) {
  if (headers.has(facts)) return headers.get(facts);
  let found = null;
  for (const el of document.querySelectorAll('header, nav, [role="banner"], body > div > *:first-child, body > *')) {
    if (el.closest('plumb-overlay')) continue;
    const s = facts.style(el);
    if (s.position !== 'sticky' && s.position !== 'fixed') continue;
    const r = facts.rect(el);
    if (px(s.top) > 0.5 || r.width < innerWidth * 0.6 || r.height < 32 || r.height > 160) continue;
    found = r.height; break;
  }
  headers.set(facts, found);
  return found;
}

// #73. scroll-margin-top on anchor targets, so the sticky header doesn't cover the heading you jumped to.
export const anchorOffset = {
  id: 'craft/anchor-offset', family: 'craft', number: [73], tier: TIER.legibility, owns: ['scroll'], once: 'ancestor', reads: ['style'],
  threshold: {},
  check({ el, facts }, theme) {
    if (!el.id || !el.matches('h1, h2, h3, h4, section, article, [id]:is(h5, h6)')) return [];
    const h = stickyHeader(facts);
    if (!h) return [];
    const s = facts.style(el);
    if (px(s.scrollMarginTop) >= h - 0.5) return [];
    const parentMargin = [...document.querySelectorAll('html, body')].some((n) => px(facts.style(n).scrollPaddingTop) >= h - 0.5);
    if (parentMargin) return [];
    const to = numeric(theme, Math.ceil(h), 'scroll-mt');
    return [{
      key: this.id, what: 'jump lands under the header', text: utility(el, 'scroll-mt') ?? 'scroll-margin-top', props: ['scroll-margin-top'], value: s.scrollMarginTop, n: px(s.scrollMarginTop),
      title: `#${el.id} lands under the ${fmt(h)} sticky header when linked to`,
      because: 'A jump scrolls the target to the very top, where the sticky header covers it; scroll-margin-top leaves room.',
      evidence: { header: h, margin: px(s.scrollMarginTop) }, confidence: 0.85,
      suggest: { kind: 'class', from: utility(el, 'scroll-mt') ?? '', to, why: `${fmt(Math.ceil(h))}, the header's height` },
    }];
  },
};

// #76. Truncate paths and ids in the middle: their ends carry the meaning.
export const middleTruncate = {
  id: 'craft/middle-truncate', family: 'craft', number: [76], tier: TIER.legibility, owns: ['text-flow'], once: 'ancestor', refines: ['craft/truncate-intent'],
  scope: ({ el, facts }) => truncated(el, facts.style(el)) && pathLike(words(el)), reads: ['style'],
  threshold: {},
  check({ el, facts }) {
    const s = facts.style(el);
    const t = words(el);
    if (!truncated(el, s) || !pathLike(t)) return [];
    return [{
      key: this.id, what: 'path cut at its end', text: utility(el, 'truncate') ?? 'text-overflow', props: ['text-overflow'], value: 'ellipsis', n: 0,
      title: `\`${t.length > 40 ? t.slice(0, 37) + '…' : t}\` is cut at its end, where the name is`,
      because: 'A path\'s or an id\'s end is its meaning (the file, the last digits); cut the middle instead.',
      evidence: { text: t }, confidence: 0.84,
      suggest: { kind: 'advice', text: 'Cut it in the middle: keep the start and the end (e.g. src/…/Button.tsx) and put the whole value in title.' },
    }];
  },
};

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel, hairline, imageOutline, layeredShadow, scaleFromZero, zIndexWar, contentAlign,
  buttonPadding, iconSide, measure, leading, tracking, tabularNums, headingWidow, oneLight, borderOnShadow, contrast, disabledContrast, hitTarget, mediaSize,
  truncateIntent, scrollbarGutter, boldHover, hangingQuote, capsCase, gradientSpace, inputZoom, anchorOffset, middleTruncate];

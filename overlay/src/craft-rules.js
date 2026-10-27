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
import { say } from './words.js';

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
    const suggest = step && cls ? { kind: 'class', from: cls, to: `rounded-${step.short}`, why: `${fmt(step.px)}: ${fmt(drawnR)} minus ${fmt(p)}` }
      : step ? { kind: 'advice', text: `Use ${fmt(step.px)} (rounded-${step.short}).` }
      : { kind: 'advice', text: `None of your radius steps is near ${fmt(wanted)}. Add one, or change the padding.` };
    return [{
      ...say(this.id, { r: drawnr, p, R: drawnR, wanted }),
      key: `${this.id}@${c.name}`, text, props: [c.prop], value: `${r}px`, n: r,
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
    const suggest = step && cls ? { kind: 'class', from: cls, to: `gap-${step.short}`, why: `${fmt(step.px)}, tighter than the ${fmt(G)} between groups` }
      : { kind: 'advice', text: step ? `Make the gap ${fmt(step.px)} (gap-${step.short}) or less.` : `Make the gap smaller than ${fmt(G)}.` };
    return [{
      ...say(this.id, { g, G }),
      key: this.id, text, props: ['gap'], value: `${g}px`, n: g,
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
    const suggest = near && cls ? { kind: 'class', from: [cls, own].filter(Boolean).join(' '), to: `text-${near.short}`, why: 'the colour it shows as now' }
      : { kind: 'advice', text: near ? `Use the colour ${near.short} instead of opacity ${o}.` : `Use a colour instead of opacity ${o}: color-mix(in oklab, currentColor ${Math.round(o * 100)}%, transparent), or a muted text token near ${hex(mixed)}.` };
    return [{
      ...say(this.id, { o, near: near?.short }),
      key: this.id, text, props: ['color'], value: String(o), n: o,
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
      ? `Make it ${even}px ${fx ? 'wide' : 'tall'}, so half of it is a whole number.`
      : 'Move it by whole pixels.' };
    return [{
      ...say(this.id, { x: e, y: f, line: hairline }),
      key: this.id, text, props: ['transform'], value: `${e}px ${f}px`, n: fx ? e : f,
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
      ...say(this.id, { dpr: devicePixelRatio }),
      key: this.id, text, props: oneSide ? [`border-${sides[0].toLowerCase()}-width`] : ['height'], value: '1px', n: 1,
      evidence: { dpr: devicePixelRatio, sides, rule }, confidence: 0.82,
      suggest: { kind: 'advice', text: oneSide ? `Use a 0.5px border on 2× screens.` : 'Make it 0.5px tall on 2× screens.' },
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
      ...say(this.id, {}),
      key: this.id, text: 'img', props: ['outline'], value: 'none', n: 0,
      evidence: { edge: hex(edge), ground: hex(ground) }, confidence: 0.85,
      suggest: { kind: 'class', from: '', to: `outline outline-1 -outline-offset-1 ${dark ? 'outline-white/10' : 'outline-black/10'}`, why: 'a faint 1px outline inside the edge' },
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
      ...say(this.id, { blur: b }),
      key: this.id, text, props: ['box-shadow'], value: s.boxShadow, n: b,
      evidence: { blur: b, x: l.x, y: l.y }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Try: box-shadow: ${stack}` },
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
      ...say(this.id, { name: found[0] }),
      key: this.id, text: `@keyframes ${found[0]}`, props: ['animation'], value: '0', n: 0,
      evidence: { keyframes: found }, confidence: 0.9,
      suggest: { kind: 'advice', text: 'Start at scale(0.95) with opacity 0, from the button that opens it.' },
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
      ...say(this.id, { z }),
      key: this.id, text, props: ['z-index'], value: String(z), n: z,
      evidence: { zIndex: z, position: s.position }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: 'z-10', why: 'a small number, with isolation: isolate on the component' } : { kind: 'advice', text: 'Add isolation: isolate to the component and use a small z-index inside it.' },
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
    const suggest = step && cls ? { kind: 'class', from: '', to: `-mx-${step.short}`, why: `pulls the row out by its ${fmt(pl)} padding` }
      : { kind: 'advice', text: `Pull the row out by ${fmt(pl)} (margin-inline: -${fmt(pl)}).` };
    return [{
      ...say(this.id, { pl }),
      key: this.id, text: cls ?? 'padding-left', props: ['margin-left'], value: `${pl}px`, n: pl,
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
  id: 'craft/button-padding', family: 'craft', round: { '*': 'up' }, number: [9], tier: TIER.craft, owns: ['padding-x'], once: 'ancestor', reads: ['style', 'rect', 'text'],
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
      ...say(this.id, { side: b.pl }),
      key: this.id, text: cls ?? 'padding', props: ['padding-left', 'padding-right'], value: `${b.pl}px`, n: b.pl,
      evidence: { across: b.pl, down: b.pt }, confidence: 0.86,
      suggest: cls ? { kind: 'class', from: cls, to, why: `${fmt(want)} on the sides, ${fmt(b.pt)} on top`, sets: { paddingLeft: want, paddingRight: want } } : { kind: 'advice', text: `Use ${fmt(want)} on the sides and ${fmt(b.pt)} on top.` },
    }];
  },
};

// #10. The icon side gets less padding: a glyph box carries its own whitespace.
export const iconSide = {
  id: 'craft/icon-side', family: 'craft', round: { '*': 'down' }, number: [10], tier: TIER.craft, owns: ['padding-x'], once: 'ancestor', after: ['craft/button-padding'], reads: ['style', 'kids', 'text'],
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
      ...say(this.id, { side: b.pl, less }),
      key: this.id, text: cls ?? 'padding', props: [lead ? 'padding-left' : 'padding-right'], value: `${b.pl}px`, n: b.pl,
      evidence: { padding: b.pl, side: lead ? 'left' : 'right' }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: `${space(theme, less, `p${side}`)} ${space(theme, b.pl, `p${other}`)}`, why: `${fmt(less)} by the icon, ${fmt(b.pl)} by the text`, sets: { [lead ? 'paddingLeft' : 'paddingRight']: less } } : { kind: 'advice', text: `Pad the icon side ${fmt(less)}, the text side ${fmt(b.pl)}.` },
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
      ...say(this.id, { chars: Math.round(perLine) }),
      key: this.id, text: cls ?? 'max-width', props: ['max-width'], value: `${Math.round(perLine)}ch`, n: Math.round(perLine),
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
      ...say(this.id, { big, size: fs, ratio: ratio.toFixed(2) }),
      key: `${this.id}@${big ? 'loose' : 'tight'}`, text: cls ?? 'line-height', props: ['line-height'], value: ratio.toFixed(2), n: ratio,
      evidence: { fontSize: fs, lineHeight: lh, ratio, lines }, confidence: 0.83,
      suggest: { kind: 'class', from: cls ?? '', to, why: big ? 'line height 1.25' : 'line height 1.5' },
    }];
  },
};

// #15. Tighten large type; space out small capitals.
export const tracking = {
  id: 'craft/tracking', family: 'craft', number: [15], tier: TIER.legibility, owns: ['letter-spacing'], once: 'ancestor', reads: ['style', 'text'],
  threshold: { caps: 14, large: 36 },
  check({ el, facts }, theme) {
    if (!facts.text(el)) return [];
    const s = facts.style(el), fs = px(s.fontSize);
    const ls = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing);
    const caps = s.textTransform === 'uppercase' && fs <= this.threshold.caps && ls / fs < 0.02;
    const large = fs >= this.threshold.large && ls > 0;
    if (!caps && !large) return [];
    const cls = utility(el, 'tracking');
    return [{
      ...say(this.id, { caps, size: fs }),
      key: `${this.id}@${caps ? 'caps' : 'large'}`, text: cls ?? 'letter-spacing', props: ['letter-spacing'], value: s.letterSpacing, n: ls,
      evidence: { fontSize: fs, letterSpacing: ls, uppercase: s.textTransform === 'uppercase' }, confidence: 0.84,
      suggest: { kind: 'class', from: cls ?? '', to: trackingStep(theme, caps), why: caps ? '0.05em more letter spacing' : '0.025em less letter spacing', sets: { letterSpacing: fs * (caps ? 0.05 : -0.025) } },
    }];
  },
};

// The letter-spacing step to suggest: the project's own when its theme names one (wide for small capitals, tight for
// large type), else Tailwind's name (which the verdict withdraws when the theme lacks it).
function trackingStep(theme, caps) {
  const names = caps ? ['wider', 'wide', 'widest'] : ['tight', 'tighter'];
  const own = names.find((n) => theme?.has?.(`--tracking-${n}`));
  return `tracking-${own ?? names[0]}`;
}

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
      ...say(this.id, {}),
      key: this.id, text: 'font-variant-numeric', props: ['font-variant-numeric'], value: s.fontVariantNumeric, n: 0,
      evidence: { text }, confidence: 0.88,
      suggest: { kind: 'class', from: '', to: 'tabular-nums', why: 'every digit the same width', sets: { fontVariantNumeric: 'tabular-nums' } },
    }];
  },
};

// #18. No widows in headings: balance the lines.
export const headingWidow = {
  id: 'craft/heading-widow', family: 'craft', number: [18], tier: TIER.legibility, owns: ['text-flow'], once: 'ancestor', refines: ['craft/text-wrap-role'], reads: ['style', 'text'],
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
      ...say(this.id, { word: m[3] }),
      key: this.id, text: 'text-wrap', props: ['text-wrap'], value: m[3], n: 1,
      evidence: { word: m[3] }, confidence: 0.88,
      suggest: { kind: 'class', from: '', to: 'text-balance', why: 'even lines', sets: { textWrap: 'balance', textWrapStyle: 'balance' } },
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
      ...say(this.id, { up: l.y < 0 }),
      key: this.id, text: cls ?? 'box-shadow', props: ['box-shadow'], value: `${l.x}px ${l.y}px`, n: l.y,
      evidence: { x: l.x, y: l.y }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Make it fall down: x 0, y ${fmt(Math.max(1, Math.abs(l.y) || Math.abs(l.x)))}.` },
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
      ...say(this.id, { color: hex(c) }),
      key: this.id, text: cls ?? 'border-color', props: ['border-color'], value: hex(c), n: 0,
      evidence: { border: hex(c) }, confidence: 0.83,
      suggest: { kind: 'class', from: cls ?? '', to, why: 'a 10% see-through border' },
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
      ...say(this.id, { lc: Math.round(lc), size: fs, need, large }),
      key: this.id, text: colourClass(el, 'text', theme) ?? 'color', props: ['color'], value: `Lc ${Math.round(lc)}`, n: Math.round(lc),
      evidence: { lc: Math.round(lc), need, color: hex(text), ground: hex(ground), fontSize: fs, weight: w }, confidence: 0.85,
      suggest: { kind: 'advice', text: `${(0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2]) / 255 < 0.5 ? 'Lighten' : 'Darken'} the text, or make it bigger or bolder.` },
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
      ...say(this.id, { o, lc: Math.round(lc) }),
      key: this.id, text: cls ?? 'opacity', props: ['opacity'], value: String(o), n: o,
      evidence: { opacity: o, lc: Math.round(lc) }, confidence: 0.84,
      suggest: { kind: 'advice', text: 'Give disabled its own muted colours instead of opacity.' },
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
      ...say(this.id, { w: Math.round(r.width), h: Math.round(r.height), min }),
      key: this.id, text: el.localName, props: ['width', 'height'], value: `${Math.round(r.width)}×${Math.round(r.height)}`, n: short,
      evidence: { width: r.width, height: r.height }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Make the tap area ${min}px: more padding, or min-h-6 min-w-6.` },
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
      ...say(this.id, { mine, mode }),
      key: this.id, text: cls ?? 'size', props: ['width'], value: `${mine}px`, n: mine,
      evidence: { mine, mode, of: sizes.length }, confidence: 0.86,
      suggest: cls ? { kind: 'class', from: cls, to: numeric(theme, mode, cls.replace(/^!|!$/g, '').split('-')[0]), why: `${mode}px, like the rest` } : { kind: 'advice', text: `Make it ${mode}px, like the rest.` },
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
      ...say(this.id, {}),
      key: this.id, text: utility(el, 'truncate') ?? 'text-overflow', props: ['text-overflow'], value: 'ellipsis', n: 0,
      evidence: { text: words(el).slice(0, 80) }, confidence: 0.85,
      suggest: { kind: 'advice', text: 'Add title={value} so the full text shows on hover.' },
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
      ...say(this.id, {}),
      key: this.id, text: utility(el, 'overflow-y') ?? utility(el, 'overflow') ?? 'overflow', props: ['scrollbar-gutter'], value: 'auto', n: 0,
      evidence: { width: r.width, height: r.height }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: '[scrollbar-gutter:stable]', why: 'keeps room for the scrollbar' },
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
      ...say(this.id, {}),
      key: this.id, text: cls ?? 'font-weight', props: ['font-weight'], value: facts.style(el).fontWeight, n: 0,
      evidence: { hover: cls ?? 'stylesheet' }, confidence: 0.85,
      suggest: { kind: 'advice', text: 'Reserve the bold width with a hidden bold copy, or change the colour instead.' },
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
      ...say(this.id, {}),
      key: this.id, text: 'text-indent', props: ['text-indent'], value: s.textIndent, n: 0,
      evidence: { first: first.data.trim()[0] }, confidence: 0.82,
      suggest: { kind: 'advice', text: 'Add text-indent: -0.45em.' },
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
      ...say(this.id, {}),
      key: this.id, text: 'font-feature-settings', props: ['font-feature-settings'], value: s.fontFeatureSettings, n: 0,
      evidence: { text: words(el).slice(0, 40) }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: "[font-feature-settings:'case']", why: 'lifts the punctuation' },
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
      ...say(this.id, {}),
      key: this.id, text: cls ?? 'background-image', props: ['background-image'], value: 'srgb', n: dh,
      evidence: { from: hex(stops(bg)[0]), to: hex(stops(bg).at(-1)), hue: Math.round(dh) }, confidence: 0.84,
      suggest: cls ? { kind: 'class', from: cls, to: `${cls.replace('bg-gradient-', 'bg-linear-')}/oklch`, why: 'mixed in OKLCH' } : { kind: 'advice', text: 'Mix it in OKLCH: linear-gradient(in oklch to right, …).' },
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
      ...say(this.id, { size: fs }),
      key: this.id, text: cls ?? 'font-size', props: ['font-size'], value: `${fs}px`, n: fs,
      evidence: { fontSize: fs }, confidence: 0.82,
      suggest: cls ? { kind: 'class', from: cls, to: `text-base md:${cls}`, why: '16px on phones, yours from md up' } : { kind: 'advice', text: `Use 16px on phones (text-base) and ${fmt(fs)} from md up.` },
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
  id: 'craft/anchor-offset', family: 'craft', round: { '*': 'up' }, number: [73], tier: TIER.legibility, owns: ['scroll'], once: 'ancestor', reads: ['style'],
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
      ...say(this.id, { id: el.id, header: h }),
      key: this.id, text: utility(el, 'scroll-mt') ?? 'scroll-margin-top', props: ['scroll-margin-top'], value: s.scrollMarginTop, n: px(s.scrollMarginTop),
      evidence: { header: h, margin: px(s.scrollMarginTop) }, confidence: 0.85,
      suggest: { kind: 'class', from: utility(el, 'scroll-mt') ?? '', to, why: `the header’s ${fmt(Math.ceil(h))}` },
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
      ...say(this.id, { text: t.length > 40 ? t.slice(0, 37) + '…' : t }),
      key: this.id, text: utility(el, 'truncate') ?? 'text-overflow', props: ['text-overflow'], value: 'ellipsis', n: 0,
      evidence: { text: t }, confidence: 0.84,
      suggest: { kind: 'advice', text: 'Keep the start and end, like src/…/Button.tsx, and put the full path in title.' },
    }];
  },
};

// ── hard rules, layer 0: decisions about noise, no new primitive (docs/briefs/craft-hard-rules.md) ─────────

// sRGB → OKLab [L, a, b] and chroma
function oklab([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}
const chroma = (rgbv) => { const [, a, b] = oklab(rgbv); return Math.hypot(a, b); };
const hueOf = (rgbv) => { const [, a, b] = oklab(rgbv); return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360; };

// #48. text-wrap by role: headings balance, running text pretty.
export const textWrapRole = {
  id: 'craft/text-wrap-role', family: 'craft', number: [48], tier: TIER.legibility, owns: ['text-flow'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  threshold: { width: 300 },
  check({ el, facts }) {
    if (!facts.text(el)) return [];
    const s = facts.style(el);
    if (/balance|pretty|nowrap/.test(`${s.textWrap ?? ''} ${s.textWrapStyle ?? ''} ${s.textWrapMode ?? ''}`) || s.whiteSpace === 'nowrap' || s.textOverflow === 'ellipsis') return [];
    const body = px(facts.style(document.body).fontSize) || 16, fs = px(s.fontSize);
    const heading = el.matches('h1, h2, h3, h4') || fs >= body * 1.5;
    // the lines as drawn: their widths, from the words' own boxes
    const range = document.createRange(); range.selectNodeContents(el);
    const rows = new Map();
    for (const q of range.getClientRects()) { if (q.width < 1) continue; const k = Math.round(q.top); const row = rows.get(k) ?? { l: Infinity, r: -Infinity }; row.l = Math.min(row.l, q.left); row.r = Math.max(row.r, q.right); rows.set(k, row); }
    const widths = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w.r - w.l);
    const lines = widths.length;
    if (lines < 2) return [];
    const ratio = widths.at(-1) / Math.max(...widths.slice(0, -1));
    // a heading whose last line is less than half the others: visibly uneven; running text whose last line is a
    // near-orphan (under 15% of the others), only on a wide block
    const uneven = heading && ratio < 0.5;
    const block = !heading && el.matches('p, li, dd, blockquote') && lines >= 3 && facts.rect(el).width >= this.threshold.width && ratio < 0.15;
    if (!uneven && !block) return [];
    const to = heading ? 'text-balance' : 'text-pretty';
    return [{
      ...say(this.id, { heading, lines }),
      key: this.id, text: 'text-wrap', props: ['text-wrap'], value: s.textWrap ?? 'wrap', n: lines,
      evidence: { lines, heading, ratio: Math.round(ratio * 100) / 100 }, confidence: 0.82,
      suggest: { kind: 'class', from: '', to, why: heading ? 'even lines' : 'no lonely last word', sets: { textWrap: heading ? 'balance' : 'pretty', textWrapStyle: heading ? 'balance' : 'pretty' } },
    }];
  },
};

// #40. Continuous corners, where the browser draws them: an advisory (taste), on large surfaces only.
export const continuousCorners = {
  id: 'craft/continuous-corners', family: 'craft', number: [40], tier: TIER.advisory, owns: ['radius'], once: 'ancestor', reads: ['style', 'rect'],
  threshold: { size: 160, radius: 16 },
  check({ el, facts }) {
    if (!globalThis.CSS?.supports?.('corner-shape', 'squircle')) return [];
    const s = facts.style(el), r = facts.rect(el);
    const rad = px(s.borderTopLeftRadius);
    if (r.width < this.threshold.size || r.height < this.threshold.size || rad < this.threshold.radius) return [];
    // a plain round corner computes as superellipse(1); anything else is already shaped on purpose
    if (!/^(round|superellipse\(1\))?$/.test(s.getPropertyValue('corner-shape').trim())) return [];
    if (!((rgb(s.backgroundColor)?.[3] ?? 0) > 0 || s.boxShadow !== 'none')) return [];
    return [{
      ...say(this.id, { r: rad }),
      key: this.id, tier: TIER.advisory, text: utility(el, 'rounded') ?? 'border-radius', props: ['border-radius'], value: `${rad}px`, n: rad,
      evidence: { radius: rad, width: r.width, height: r.height }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: '[corner-shape:squircle]', why: 'a smoother curve at the same size', sets: { cornerShape: 'squircle' } },
    }];
  },
};

// #49. Optical sizing on, when the font has the axis.
export const opticalSizing = {
  id: 'craft/optical-sizing', family: 'craft', number: [49], tier: TIER.craft, owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  threshold: {},
  check({ el, facts }, theme) {
    if (!facts.text(el)) return [];
    const s = facts.style(el);
    const off = s.fontOpticalSizing === 'none' || /"opsz"/.test(s.fontVariationSettings ?? '');
    if (!off) return [];
    // the axis is only judged where this element itself turns it off (not where it inherits it)
    const parent = el.parentElement && facts.style(el.parentElement);
    if (parent && parent.fontOpticalSizing === s.fontOpticalSizing && parent.fontVariationSettings === s.fontVariationSettings) return [];
    const family = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (!theme.hasOpsz?.(family)) return [];
    const cls = classesOf(el).split(/\s+/).find((c) => /^\[font-(optical-sizing|variation-settings):/.test(c));
    return [{
      ...say(this.id, { family }),
      key: this.id, text: cls ?? 'font-optical-sizing', props: ['font-optical-sizing'], value: s.fontOpticalSizing, n: 0,
      evidence: { family, settings: s.fontVariationSettings }, confidence: 0.84,
      suggest: { kind: 'advice', text: cls ? `Remove ${cls} so the font picks its optical size.` : 'Remove font-optical-sizing: none (or the fixed "opsz") so the font picks its optical size.' },
    }];
  },
};

// #21 + #52. A grey shadow on a coloured ground: tint it.
export const tintedShadow = {
  id: 'craft/tinted-shadow', family: 'craft', number: [21, 52], tier: TIER.craft, owns: ['shadow'], once: 'ancestor', reads: ['style', 'ground'],
  threshold: { ground: 0.03, shadow: 0.01, alpha: 0.1 },
  check({ el, facts }) {
    const s = facts.style(el);
    if (s.boxShadow === 'none' || !el.parentElement) return [];
    const layers = s.boxShadow.split(/,(?![^(]*\))/).filter((l) => !/inset/.test(l));
    const colours = layers.map((l) => rgb((/rgba?\([^)]*\)/.exec(l) ?? [])[0])).filter((c) => c && c[3] > this.threshold.alpha);
    if (!colours.length) return [];
    const ground = facts.ground(el.parentElement);
    if (chroma(ground) <= this.threshold.ground || !colours.every((c) => chroma(c) < this.threshold.shadow)) return [];
    const h = Math.round(hueOf(ground)), a = Math.max(...colours.map((c) => c[3]));
    return [{
      ...say(this.id, { ground: hex(ground) }),
      key: this.id, text: utility(el, 'shadow') ?? 'box-shadow', props: ['box-shadow'], value: s.boxShadow, n: a,
      evidence: { ground: hex(ground), hue: h }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Tint the shadow: oklch(0.3 0.05 ${h} / ${a.toFixed(2)}) in place of its grey.` },
    }];
  },
};

// #56. A two-stop scrim over an image: ease it.
export const easedScrim = {
  id: 'craft/eased-scrim', family: 'craft', number: [56], tier: TIER.craft, owns: ['background'], once: 'ancestor', reads: ['style', 'rect'],
  threshold: { length: 80 },
  check({ el, facts }) {
    const s = facts.style(el);
    if (!/^linear-gradient\(/.test(s.backgroundImage) || /,\s*linear-gradient/.test(s.backgroundImage) || s.position !== 'absolute') return [];
    const stops = [...s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0]));
    if (stops.length !== 2) return [];
    const clear = stops.find((c) => c[3] === 0), dark = stops.find((c) => c[3] >= 0.5 && oklab(c)[0] < 0.2);
    if (!clear || !dark) return [];
    const r = facts.rect(el);
    if (Math.max(r.width, r.height) < this.threshold.length) return [];
    // over media: an image, a video or a picture beside it or around it, covering half of it or more
    const media = [...(el.parentElement?.querySelectorAll('img, video, picture') ?? [])].find((m) => {
      const q = m.getBoundingClientRect();
      const w = Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)), h = Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
      return w * h >= r.width * r.height * 0.5;
    });
    if (!media) return [];
    const c = `rgb(${dark.slice(0, 3).join('_')}`;
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'background-image', props: ['background-image'], value: 'linear', n: 2,
      evidence: { dark: hex(dark) }, confidence: 0.83,
      suggest: { kind: 'advice', text: `Ease it: bg-[linear-gradient(to_top,${c}/${dark[3]})_0%,${c}/${(dark[3] * 0.6).toFixed(2)})_30%,${c}/${(dark[3] * 0.25).toFixed(2)})_60%,transparent_100%)].` },
    }];
  },
};

// #25. No pure black or white on large areas (white only where the theme's surfaces are tinted; else it is taste).
export const pureBlackWhite = {
  id: 'craft/pure-black-white', family: 'craft', number: [25], tier: TIER.craft, owns: ['background'], once: 'ancestor', reads: ['style', 'rect'],
  threshold: { share: 0.25, area: 200000 },
  check({ el, facts }, theme) {
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el), c = rgb(s.backgroundColor);
    if (!c || c[3] < 1) return [];
    const black = c[0] === 0 && c[1] === 0 && c[2] === 0, white = c[0] === 255 && c[1] === 255 && c[2] === 255;
    if (!black && !white) return [];
    const r = facts.rect(el), area = r.width * r.height;
    if (area < this.threshold.area && area < innerWidth * innerHeight * this.threshold.share) return [];
    // a colour the theme names (bg-surface that happens to be white) is the project's decision, not an escape
    const own = colourClass(el, 'bg', theme);
    if (own && theme.colors().some((t) => own === `bg-${t.short}`)) return [];
    const tinted = theme.colors().find((t) => /surface|paper|ground|background/.test(t.short) && !(t.rgb[0] === 255 && t.rgb[1] === 255 && t.rgb[2] === 255) && Math.min(...t.rgb) > 220);
    const near = black ? theme.nearestColor([20, 20, 22], 40) : tinted;
    const tier = black || tinted ? TIER.craft : TIER.advisory;
    return [{
      ...say(this.id, { black }),
      key: this.id, tier, text: own ?? 'background-color', props: ['background-color'], value: hex(c), n: area,
      evidence: { colour: hex(c), area: Math.round(area) }, confidence: 0.8,
      suggest: near && own ? { kind: 'class', from: own, to: `bg-${near.short}`, why: black ? 'a near-black from your theme' : 'your tinted surface' } : { kind: 'advice', text: black ? 'Use a tinted near-black, 2–3% toward your brand hue.' : 'Tint it 2–3% toward your brand hue, or use your surface colour.' },
    }];
  },
};

// #33. A fixed width that crushes its words: let it fit them.
export const contentSize = {
  id: 'craft/content-size', family: 'craft', number: [33], tier: TIER.craft, owns: ['size'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  threshold: { slack: 0.2 },
  check({ el, facts }) {
    if (!el.matches('button, a, [role="button"], span, label') || el.matches('input, td, th, img')) return [];
    if (!facts.text(el)) return [];
    const parent = el.parentElement && facts.style(el.parentElement);
    if (parent && /grid/.test(parent.display)) return [];
    const cls = classesOf(el).split(/\s+/).find((c) => /^w-(\[\d+(\.\d+)?px\]|\d+(\.\d+)?)$/.test(c));
    if (!cls) return [];
    const s = facts.style(el), b = facts.box(el), r = facts.rect(el);
    const inner = r.width - b.pl - b.pr - b.bl - b.br;
    const range = document.createRange(); range.selectNodeContents(el);
    const need = Math.max(...[...range.getClientRects()].map((q) => q.right), 0) - Math.min(...[...range.getClientRects()].map((q) => q.left), Infinity);
    const overflow = el.scrollWidth > el.clientWidth + 1 || lineCount(el, facts) > 1 && s.whiteSpace !== 'normal';
    if (!(overflow || (need > 0 && (inner - need) / inner < this.threshold.slack && lineCount(el, facts) > 1))) return [];
    return [{
      ...say(this.id, { w: r.width, need: Math.ceil(need + b.pl + b.pr) }),
      key: this.id, text: cls, props: ['width'], value: `${r.width}px`, n: r.width,
      evidence: { width: r.width, need }, confidence: 0.82,
      suggest: { kind: 'class', from: cls, to: 'w-auto', why: 'fits its words', sets: { width: 'auto' } },
    }];
  },
};

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel, hairline, imageOutline, layeredShadow, scaleFromZero, zIndexWar, contentAlign,
  buttonPadding, iconSide, measure, leading, tracking, tabularNums, headingWidow, oneLight, borderOnShadow, contrast, disabledContrast, hitTarget, mediaSize,
  truncateIntent, scrollbarGutter, boldHover, hangingQuote, capsCase, gradientSpace, inputZoom, anchorOffset, middleTruncate,
  textWrapRole, continuousCorners, opticalSizing, tintedShadow, easedScrim, pureBlackWhite, contentSize];

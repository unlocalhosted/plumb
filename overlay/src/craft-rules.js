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
 *  flex-min            —       a flex item that holds text may shrink, so a long name is cut off, not pushed out
 *  image-ground        —       words over a picture have a colour behind them for when it doesn't arrive
 *  image-fit           —       a picture in a box of another shape is cropped, never stretched
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
 * Every number a rule compares against lives in the spec (craft-spec.js, docs/briefs/craft-spec.md): a rule reads
 * `theme.spec(this.id)` and never holds a threshold, a target or a tier of its own. Every rule says nothing when its
 * evidence is ambiguous: unequal insets, a running animation, a disabled control, a scale or rotation.
 * ───────────────────────────────────────────────────────── */
import { rgb, utility, classesOf, elevation, COLOUR } from './craft-read.js';
import { TIER } from './craft-facets.js';
import { say } from './words.js';
import { RUN_RULES } from './craft-headless.js';
import { recommend, recommendColour } from './craft-recommend.js';

// a class candidate where no class sets the property (the value comes from a stylesheet) is said, not written
const asAdvice = (rec, said) => (rec.kind === 'class' ? { kind: 'advice', text: said(rec) } : rec);
const RADII = (v) => ({ borderRadius: v, borderTopLeftRadius: v, borderTopRightRadius: v, borderBottomLeftRadius: v, borderBottomRightRadius: v });

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

// a corner drawn only by borders shows only where a border meets it: a top border draws no bottom corner
const SIDES = { tl: ['Top', 'Left'], tr: ['Top', 'Right'], bl: ['Bottom', 'Left'], br: ['Bottom', 'Right'] };
function drawsCorner(el, s, corner) {
  const bg = rgb(s.backgroundColor);
  if (REPLACED.has(el.localName) || (bg && bg[3] > 0) || s.backgroundImage !== 'none' || (s.overflow !== 'visible' && s.overflow !== '')) return true;
  // a hairline drawn as an inset shadow on one side is a border on that side: it draws only that side's corners
  const lines = lineSides(s.boxShadow);
  if (lines === true) return true;
  return SIDES[corner].some((side) => px(s[`border${side}Width`]) > 0 || lines.has(side));
}

// the sides a box-shadow draws as plain lines (inset, unblurred, offset on one axis), or true when any layer draws a
// whole box (a ring, a drop shadow). Transparent layers draw nothing
function lineSides(value) {
  const sides = new Set(), raw = value && value !== 'none' ? value.split(/,(?![^(]*\))/) : [];
  for (const [i, l] of shadows(value).entries()) {
    if (alpha(rgb(raw[i].match(COLOUR)?.[0])) === 0) continue;
    if (!l.inset || l.blur || l.spread || (l.x !== 0) === (l.y !== 0)) return true;
    sides.add(l.y > 0 ? 'Top' : l.y < 0 ? 'Bottom' : l.x > 0 ? 'Left' : 'Right');
  }
  return sides;
}

// #8 / #41. Nested radius = outer radius − padding, never below 0.
export const concentricRadius = {
  id: 'craft/concentric-radius', family: 'craft', number: [8, 41], owns: ['radius'], once: 'ancestor', reads: ['rect', 'style', 'parent'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const { tolerance, minParentRadius } = T;
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
    // a circle has no corner to nest in: what sits at its box's corner (a presence dot on an avatar) overlaps the
    // circle's edge, it isn't inside a curve
    if (drawnR >= Math.min(pr.width, pr.height) / 2 - 0.5 && Math.abs(pr.width - pr.height) < 1) return [];
    // the corner the child sits at: its edges on the parent's content edges, both sides
    const corners = [
      { name: 'tl', prop: 'border-top-left-radius', at: Math.abs(cr.left - (pr.left + b.bl + b.pl)) < 1 && Math.abs(cr.top - (pr.top + b.bt + b.pt)) < 1, ix: cr.left - pr.left, iy: cr.top - pr.top },
      { name: 'tr', prop: 'border-top-right-radius', at: Math.abs(pr.right - b.br - b.pr - cr.right) < 1 && Math.abs(cr.top - (pr.top + b.bt + b.pt)) < 1, ix: pr.right - cr.right, iy: cr.top - pr.top },
      { name: 'bl', prop: 'border-bottom-left-radius', at: Math.abs(cr.left - (pr.left + b.bl + b.pl)) < 1 && Math.abs(pr.bottom - b.bb - b.pb - cr.bottom) < 1, ix: cr.left - pr.left, iy: pr.bottom - cr.bottom },
      { name: 'br', prop: 'border-bottom-right-radius', at: Math.abs(pr.right - b.br - b.pr - cr.right) < 1 && Math.abs(pr.bottom - b.bb - b.pb - cr.bottom) < 1, ix: pr.right - cr.right, iy: pr.bottom - cr.bottom },
    ];
    const c = corners.find((k) => k.at && drawsCorner(el, s, k.name));
    if (!c) return [];
    // unequal insets would want an elliptical corner: say nothing
    if (Math.abs(c.ix - c.iy) > 0.5) return [];
    const p = c.ix;
    // flush in a corner the parent clips: the parent's own curve is the corner, the child's radius is never seen. A
    // clip follows the inside of the parent's border, so a child whose only inset is that border is flush too
    if (p - Math.max(b.bl, b.br, b.bt, b.bb) < 0.5 && ps.overflow !== 'visible') return [];
    // the parent's curve ends before the child's edge: no relation to keep
    if (p >= drawnR - 0.5) return [];
    const wanted = Math.max(0, drawnR - p);
    if (Math.abs(drawnr - wanted) <= tolerance) return [];
    const cls = utility(el, 'rounded', { not: SIDE_RADIUS });
    const text = cls ?? 'border-radius';
    const rec = wanted <= tolerance && !theme.nearest('radius', wanted, tolerance) ? { kind: 'class', from: cls ?? '', to: 'rounded-none', why: `0px: ${fmt(drawnR)} minus ${fmt(p)}` }
      : recommend({ family: 'radius', prefix: 'rounded', job: 'nested', want: { min: wanted - tolerance, max: wanted + tolerance, target: wanted }, exact: tolerance, from: cls ?? '', sets: RADII, theme,
        label: 'this corner wants', advice: () => `None of your radius steps is near ${fmt(wanted)}. Add one, or change the padding.` });
    // the step taken can differ from the exact answer by the tolerance; say so instead of writing false arithmetic
    const taken = theme.scale('radius').find((s) => `rounded-${s.short}` === rec.to)?.px ?? wanted;
    if (rec.kind === 'class') rec.why = Math.abs(taken - wanted) < 0.5 ? `${fmt(taken)}: ${fmt(drawnR)} minus ${fmt(p)}` : `${fmt(taken)}, your nearest step to ${fmt(drawnR)} minus ${fmt(p)} (${fmt(wanted)})`;
    const suggest = cls ? rec : asAdvice(rec, (r) => `Use ${fmt(wanted)} (${r.to}).`);
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
  id: 'craft/inner-outer-spacing', family: 'craft', number: [7], owns: ['gap'], once: 'ancestor', reads: ['style', 'kids', 'parent'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const axis = flowAxis(s);
    if (!axis) return [];
    const g = gapOf(s, axis);
    // a group's items: its elements and its bare words (<label>Date of birth<input /></label> is two things)
    const items = facts.kids(el).length + [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).length;
    if (g <= 0 || items < 2) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return [];
    const ps = facts.style(parent);
    const paxis = flowAxis(ps);
    if (!paxis) return [];
    // the same direction only: a row's gap between an avatar and its words is not the gap between the rows
    if (paxis !== 'both' && axis !== 'both' && paxis !== axis) return [];
    const G = gapOf(ps, paxis);
    if (G <= 0 || facts.kids(parent).length < 2) return [];
    if (g <= G + T.min) return [];
    const cls = utility(el, 'gap', { not: /^[xy](?:-|$)/ });
    const text = cls ?? 'gap';
    // tighter than the gap between groups, not equal to it: equal leaves a label exactly between its input and the one
    // above, which is the confusion itself; aim at half the outer gap
    const rec = recommend({ family: 'spacing', prefix: 'gap', job: 'inner', want: { min: 0, max: G - 1, target: G / 2 }, round: 'down', from: cls ?? '', token: false, theme,
      sets: (v) => ({ rowGap: v, columnGap: v }),
      advice: () => `Make the gap smaller than ${fmt(G)}.` });
    if (rec.kind === 'class') rec.why = `${rec.why.split(' (')[0]}, tighter than the ${fmt(G)} between groups`;
    const suggest = cls ? rec : asAdvice(rec, (r) => `Make the gap ${r.why.split(',')[0]} (${r.to}) or less.`);
    return [{
      ...say(this.id, { g, G }),
      key: this.id, text, props: ['gap'], value: `${g}px`, n: g,
      evidence: { inner: g, outer: G, axis }, confidence: 0.9, suggest,
    }];
  },
};

// #57. color-mix instead of opacity for text colour.
export const textOpacity = {
  id: 'craft/text-opacity', family: 'craft', number: [57], owns: ['color'], once: 'ancestor', reads: ['style', 'text', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const o = parseFloat(s.opacity);
    if (!(o > 0 && o < 1) || !facts.text(el) || REPLACED.has(el.localName)) return [];
    if (s.animationName !== 'none') return []; // mid-fade is not a colour decision
    const color = rgb(s.color);
    if (!color) return [];
    const ground = facts.ground(el);
    const mixed = [0, 1, 2].map((i) => Math.round(color[i] * o + ground[i] * (1 - o)));
    const cls = utility(el, 'opacity');
    const near = theme.nearestColor(mixed, T.within);
    const text = cls ?? 'opacity';
    // the colour it replaces goes too: two text colours on one element are decided by Tailwind's order, not the edit
    const own = colourClass(el, 'text', theme);
    const rec = recommendColour({ rgb: mixed, prefix: 'text', from: [cls, own].filter(Boolean).join(' '), within: T.within, theme, why: 'the colour it shows as now',
      advice: `Use a colour instead of opacity ${o}: color-mix(in oklab, currentColor ${Math.round(o * 100)}%, transparent), or a muted text token near ${hex(mixed)}.` });
    const suggest = cls ? rec : asAdvice(rec, () => `Use the colour ${near.short} instead of opacity ${o}.`);
    return [{
      ...say(this.id, { o, near: near?.short }),
      key: this.id, text, props: ['color'], value: String(o), n: o,
      evidence: { opacity: o, color: hex(color), ground: hex(ground), mixed: hex(mixed) }, confidence: 0.9, suggest,
    }];
  },
};

// #37. Never land on half pixels: a pure translation whose offset is fractional in device pixels blurs text and lines.
export const halfPixel = {
  id: 'craft/half-pixel', family: 'craft', number: [37], owns: ['transform'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
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
    // a translation moves everything inside: a box holding words (a tooltip of two lines) blurs them all
    if (!facts.text(el) && !el.textContent?.trim() && !hairline) return [];
    const T = theme.spec(this.id);
    const dpr = devicePixelRatio || 1, { slack } = T;
    const off = (v) => { const dv = Math.abs(v * dpr - Math.round(v * dpr)); return dv > slack && dv < 1 - slack; };
    // words are placed across at sub-pixel precision anyway, so only a fraction down blurs them (measured: grey fringe
    // 0.44 → 0.60 at 1×); a hairline blurs either way
    const fx = hairline && off(e), fy = off(f);
    if (!fx && !fy) return [];
    const cls = utility(el, 'translate');
    const text = cls ?? 'transform';
    const half = cls && /1\/2$/.test(cls);
    const size = fx ? r.width : r.height, even = Math.ceil(size / 2) * 2;
    // centred down by half its own height (top-1/2 -translate-y-1/2): centre it by layout instead, which lands on whole
    // pixels: pinned top and bottom, auto margins, its own height
    const own = classesOf(el).split(/\s+/);
    const pinned = fy && /absolute|fixed/.test(s.position) && own.includes('top-1/2') && own.includes('-translate-y-1/2');
    const suggest = pinned
      ? { kind: 'class', from: 'top-1/2 -translate-y-1/2', to: 'inset-y-0 my-auto h-fit', why: 'centred by layout, on whole pixels', sets: { top: '0px', bottom: '0px', marginTop: 'auto', marginBottom: 'auto', height: 'fit-content', translate: 'none' }, moves: true }
      : { kind: 'advice', text: half
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
  id: 'craft/hairline', family: 'craft', number: [38], owns: ['border'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if ((devicePixelRatio || 1) < T.minDpr) return [];
    const s = facts.style(el), r = facts.rect(el);
    // a divider: a 1px rule (an <hr>, or a box one pixel tall or wide), or a box drawn by one 1px side only
    // solid only: a dashed or dotted side (a tear line) can't be drawn thinner, a shadow has no dashes
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((k) => s[`border${k}Style`] === 'solid' && Math.abs(px(s[`border${k}Width`]) - 1) < 0.01);
    // exactly one CSS pixel: a rule already drawn at half of one is the fix, not the mistake
    const one = (v) => Math.abs(v - 1) < 0.05;
    const rule = (one(r.height) && r.width > 8) || (one(r.width) && r.height > 8);
    const oneSide = sides.length === 1;
    if (!rule && !oneSide) return [];
    if (rule && !(rgb(s.backgroundColor)?.[3] > 0) && !sides.length) return [];
    const cls = oneSide ? utility(el, `border-${sides[0][0].toLowerCase()}`) ?? utility(el, 'border') : utility(el, 'h') ?? utility(el, 'w');
    const text = cls ?? (oneSide ? `border-${sides[0].toLowerCase()}` : 'divider');
    return [{
      ...say(this.id, { dpr: devicePixelRatio }),
      key: this.id, text, props: oneSide ? [`border-${sides[0].toLowerCase()}-width`] : ['height'], value: '1px', n: 1,
      evidence: { dpr: devicePixelRatio, sides, rule }, confidence: 0.82,
      // one device pixel. A side can't be a thinner border: Chrome rounds a border's width down to whole CSS pixels,
      // never under 1, so border-b-[0.5px] still draws two. The side becomes an inset shadow 1/dpr tall in the border's
      // colour, laid over any shadow it had. A 1px-tall rule is a box, and a box can be half as tall.
      suggest: ((side) => oneSide
        ? ((k, d) => {
          const w = `${Math.round(1000 / devicePixelRatio) / 1000}px`, c = s[`border${side}Color`];
          const [x, y] = { Top: ['0', w], Bottom: ['0', `-${w}`], Left: [w, '0'], Right: [`-${w}`, '0'] }[side];
          const line = `inset ${x} ${y} 0 ${c}`, shadow = s.boxShadow && s.boxShadow !== 'none' ? `${line}, ${s.boxShadow}` : line;
          return { kind: 'class', from: cls && new RegExp(`^border-${k}(?:-px|-1|-\\[0\\.5px\\])?$`).test(cls) ? cls : '', to: `border-${k}-0 ${arbitrary('shadow', shadow)}`, why: 'one device pixel', sets: { [`border${side}Width`]: '0px', boxShadow: shadow } };
        })(side[0].toLowerCase())
        : one(r.height) ? { kind: 'class', from: cls && /^h-(px|\[1px\])$/.test(cls) ? cls : '', to: 'h-[0.5px]', why: 'one device pixel', sets: { height: '0.5px' }, moves: true }
          : { kind: 'class', from: cls && /^w-(px|\[1px\])$/.test(cls) ? cls : '', to: 'w-[0.5px]', why: 'one device pixel', sets: { width: '0.5px' }, moves: true })(sides[0]),
    }];
  },
};

// #39. An image gets a faint inner outline, so a light picture doesn't bleed into a light page (or dark into dark).
export const imageOutline = {
  id: 'craft/image-outline', family: 'craft', number: [39], owns: ['border'], once: 'ancestor', reads: ['style', 'rect', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el.localName !== 'img' || !el.complete || !el.naturalWidth) return [];
    const r = facts.rect(el), s = facts.style(el);
    if (r.width < T.minSize || r.height < T.minSize) return [];
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
    if (Math.abs(lum(edge) - lum(ground)) > T.sameGround) return [];
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
    const nums = layer.replace(COLOUR, '').replace(/#[0-9a-f]+/gi, '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return { x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0, inset: /inset/.test(layer) };
  });
}

// #51. Layered shadows: one big blur reads as a smudge; a few layers read as ambient and direct light.
export const layeredShadow = {
  id: 'craft/layered-shadow', family: 'craft', number: [51, 53], owns: ['shadow'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const raw = s.boxShadow.split(/,(?![^(]*\))/);
    const layers = shadows(s.boxShadow).map((l, i) => ({ ...l, colour: rgb(raw[i].match(COLOUR)?.[0]) })).filter((l) => !l.inset && (l.blur > 0 || l.x || l.y));
    if (layers.length !== 1 || layers[0].blur < T.blur) return [];
    const l = layers[0];
    // the layers keep the shadow's own colour (a tinted shadow stays tinted); only its alpha is spread across them
    const [r, g, bl] = l.colour ?? [0, 0, 0];
    const cls = utility(el, 'shadow');
    const text = cls ?? 'box-shadow';
    const b = l.blur, y = Math.max(1, Math.round(l.y || b / 4));
    const stack = [[0.5, 1], [1, 2], [2, 4], [4, 8]].map(([k, m]) => `0 ${Math.round(y * k / 4 * 10) / 10}px ${Math.round(b * m / 8)}px rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(bl)} / ${(0.04 * (5 - m / 2)).toFixed(2)})`).join(', ');
    return [{
      ...say(this.id, { blur: b }),
      key: this.id, text, props: ['box-shadow'], value: s.boxShadow, n: b,
      evidence: { blur: b, x: l.x, y: l.y }, confidence: 0.84,
      // four layers whose blur and offset double from one to the next: a contact shadow and a soft, wide one
      suggest: { kind: 'class', from: cls ?? '', to: arbitrary('shadow', stack), why: 'layered like real light', sets: { boxShadow: stack } },
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
  id: 'craft/scale-from-zero', family: 'craft', number: [63], owns: ['transform'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const s = facts.style(el);
    // an entrance written as a transition from its starting style (Tailwind's starting:, @starting-style): a class to swap
    const start = classesOf(el).split(/\s+/).find((c) => /^starting:scale-(?:0|\[0(?:\.0+)?\])$/.test(c));
    if (start) {
      return [{
        ...say(this.id, { name: start }),
        key: this.id, text: start, props: ['scale'], value: '0', n: 0,
        evidence: { starting: start }, confidence: 0.9,
        suggest: { kind: 'class', from: start, to: 'starting:scale-95', why: 'it grows from nearly its size, not from a point', sets: {} },
      }];
    }
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
  id: 'craft/z-index-war', family: 'craft', number: [74], owns: ['stacking'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const z = parseInt(s.zIndex, 10);
    if (!(z > T.above) || s.position === 'fixed') return [];
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

// #1. Align content, not boxes: a filled, padded row or panel whose words fall off the column its siblings' words share
// bleeds out by its padding (-mx-p px-p) so its fill escapes the column and its words stay on the line.
export const contentAlign = {
  id: 'craft/content-align', family: 'craft', number: [1], owns: ['margin-x'], once: 'ancestor', reads: ['style', 'rect', 'kids', 'parent'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const parent = el.parentElement;
    if (!parent || parent === document.body) return [];
    const ps = facts.style(parent);
    if (!/flex/.test(ps.display) || !/column/.test(ps.flexDirection)) return [];
    const s = facts.style(el);
    const pl = px(s.paddingLeft);
    const filled = (rgb(s.backgroundColor)?.[3] ?? 0) > 0 || s.boxShadow !== 'none';
    if (!filled || pl < T.min) return [];
    const r = facts.rect(el), pr = facts.rect(parent);
    const column = pr.left + px(ps.borderLeftWidth) + px(ps.paddingLeft);
    if (Math.abs(r.left - column) > 0.5) return []; // the row already bleeds, or sits elsewhere
    // a highlighted row among rows like it (a selected item in a list), or an edgeless tint among the sections of a page
    // (a note between a profile and its invoices): either way its words should share the edge its unfilled siblings'
    // words share. A card with a shadow or a border is an object with an edge, and objects line up by their edges, so
    // only rows like it count as its peers; an edgeless tint is compared with siblings of any kind and height
    const isFilled = (k) => { const ks = facts.style(k); return (rgb(ks.backgroundColor)?.[3] ?? 0) > 0 || ks.boxShadow !== 'none'; };
    const edged = s.boxShadow !== 'none' || px(s.borderLeftWidth) > 0 || px(s.borderTopWidth) > 0;
    const peers = facts.kids(parent).filter((k) => k !== el && facts.rect(k).height > 0
      && (!edged || (k.localName === el.localName && facts.rect(k).height >= r.height * 0.5 && facts.rect(k).height <= r.height * 2)));
    if (!peers.some((k) => !isFilled(k))) return [];
    // the edge its peers' words share
    const edges = peers.filter((k) => !isFilled(k)).map((k) => contentLeft(k, facts)).filter((x) => x !== null);
    if (edges.length < T.siblings) return [];
    const onColumn = edges.filter((x) => Math.abs(x - column) < 1).length;
    if (onColumn < Math.ceil(edges.length * 0.6)) return [];
    const mine = contentLeft(el, facts);
    if (mine === null || Math.abs(mine - column - pl) > 1) return [];
    const cls = utility(el, 'px') ?? utility(el, 'pl') ?? utility(el, 'p');
    // what the bleed sets, so a preview can show it (and a project that hasn't generated the class yet still sees it)
    const rec = recommend({ family: 'spacing', prefix: '-mx', job: 'bleed', want: { min: pl - 0.5, max: pl + 0.5, target: pl }, from: '', token: false, theme,
      sets: (v) => ({ marginLeft: -v, marginRight: -v }),
      advice: () => `Pull the row out by ${fmt(pl)} (margin-inline: -${fmt(pl)}).` });
    if (rec.kind === 'class') { rec.why = `pull the panel out by its ${fmt(pl)} padding`; rec.moves = true; } // a bleed moves layout: tried by asking again
    const suggest = cls && rec.kind === 'class' ? rec : { kind: 'advice', text: `Pull the row out by ${fmt(pl)} (margin-inline: -${fmt(pl)}).` };
    return [{
      ...say(this.id, { pl }),
      key: this.id, text: cls ?? 'padding-left', props: ['margin-left'], value: `${pl}px`, n: pl,
      evidence: { column, content: mine, padding: pl, siblings: edges.length }, confidence: 0.86, suggest,
    }];
  },
};


// ── wave three ──────────────────────────────────────────────

const GREY = 0.7; // the grey band: measured, but too close to the line to stand behind alone (the headless judge decides)
const CONTROL = 'button, [role="button"], a[href], input[type="button"], input[type="submit"], input[type="reset"], summary';
const disabled = (el) => el.matches(':disabled, [aria-disabled="true"]') || !!el.closest('[disabled], [aria-disabled="true"]');
// the words a person reads in an element: its text, never what an svg, a style or a script carries (an animated icon
// brings its own styles)
const UNREAD = new Set(['svg', 'style', 'script', 'template']);
function textNodes(el) {
  const out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeType === 1 && UNREAD.has(n.localName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeType === 3) out.push(n);
  return out;
}
// the eased scrim's darkness at thirteen even stops, from the dark end (1) to clear (0)
const EASED = [1, 0.738, 0.541, 0.382, 0.278, 0.194, 0.126, 0.075, 0.042, 0.021, 0.008, 0.002, 0];
// a CSS value as a Tailwind arbitrary class: shadow-[0_1px_2px_rgb(0_0_0/0.1)]
const arbitrary = (prefix, value) => `${prefix}-[${value.trim().replace(/\s*,\s*/g, ',').replace(/\s+/g, '_')}]`;
let textCtx;
const words = (el) => textNodes(el).map((n) => n.nodeValue).join('').replace(/\s+/g, ' ').trim();
const alpha = (c) => c?.[3] ?? 0;
// a over b, both [r, g, b, a]
const over = (a, b) => [0, 1, 2].map((i) => a[i] * alpha(a) + b[i] * (1 - alpha(a))).concat(1);
const PALETTE = /^(?:black|white|transparent|current|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/[\d.]+)?$|^\[(?:#|rgb|hsl|oklch|oklab|color-mix|var\(--color)/;
// whether `prefix-rest` names a colour: one of the theme's, Tailwind's palette, or an arbitrary colour
const isColour = (rest, theme) => PALETTE.test(rest) || (theme?.colors?.() ?? []).some((c) => rest === c.short || rest.startsWith(`${c.short}/`));
// the classes of an element whose prefix sets a colour, e.g. border-ink-muted (not border, border-2, border-t)
export function colourClass(el, prefix, theme) {
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
export function apca(text, ground) {
  const y = ([r, g, b]) => { const l = (c) => Math.pow(c / 255, 2.4); const v = 0.2126729 * l(r) + 0.7151522 * l(g) + 0.072175 * l(b); return v < 0.022 ? v + Math.pow(0.022 - v, 1.414) : v; };
  const yt = y(text), yb = y(ground);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) { const c = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14; return c < 0.1 ? 0 : (c - 0.027) * 100; }
  const c = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14; return c > -0.1 ? 0 : (c + 0.027) * 100;
}
// the line boxes of an element's own words: the rows its text is laid out on, measured, not its height over its line
// height (a 36px control holding one line of 13px words is one line, not three)
function lineCount(el) {
  const tops = [], range = document.createRange();
  for (const n of el.childNodes) {
    if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
    range.selectNodeContents(n);
    for (const q of range.getClientRects()) if (q.width > 0 && !tops.some((t) => Math.abs(t - q.top) < q.height / 2)) tops.push(q.top);
  }
  return tops.length;
}

// #9. Equal padding isn't equal: a text button wants about twice as much padding across as down.
export const buttonPadding = {
  id: 'craft/button-padding', family: 'craft', round: { '*': 'up' }, number: [9], owns: ['padding-x'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches(CONTROL) || el.matches('a[href]') && !utility(el, 'px') && !utility(el, 'p')) return [];
    if (!/[\p{L}\p{N}]/u.test(words(el))) return [];
    const b = facts.box(el), r = facts.rect(el), s = facts.style(el);
    if (r.height > T.maxHeight || b.pt < 2 || Math.abs(b.pt - b.pb) > 0.5 || Math.abs(b.pl - b.pr) > 0.5) return [];
    if (Math.abs(r.width - r.height) < 2 && px(s.borderTopLeftRadius) >= r.height / 2 - 1) return []; // a round button
    if (b.pl / b.pt >= T.ratio) return [];
    const want = b.pt * T.want.ratio;
    const cls = utility(el, 'px') ?? utility(el, 'p', { not: /^[trblxyse](?:-|$)/ });
    // the sides: a step at least the ratio asks, nearest twice the top; with `p-` the top keeps its own step
    const sides = recommend({ family: 'spacing', prefix: 'px', job: 'button', want: { min: b.pt * T.ratio, target: want }, round: 'up', from: cls ?? '', token: false, sets: (v) => ({ paddingLeft: v, paddingRight: v }), theme });
    const top = cls?.startsWith('p-') ? recommend({ family: 'spacing', prefix: 'py', job: 'button', want: { min: b.pt - 0.5, max: b.pt + 0.5, target: b.pt }, from: '', token: false, sets: (v) => ({ paddingTop: v, paddingBottom: v }), theme }) : null;
    const to = sides.kind === 'class' ? `${sides.to}${top?.kind === 'class' ? ` ${top.to}` : ''}` : null;
    const sets = { ...(sides.sets ?? { paddingLeft: want, paddingRight: want }), ...(top?.kind === 'class' ? top.sets : {}) };
    return [{
      ...say(this.id, { side: b.pl }),
      key: this.id, text: cls ?? 'padding', props: ['padding-left', 'padding-right'], value: `${b.pl}px`, n: b.pl,
      evidence: { across: b.pl, down: b.pt }, confidence: 0.86,
      suggest: cls && to ? { kind: 'class', from: cls, to, why: `${fmt(want)} on the sides, ${fmt(b.pt)} on top`, sets, ...(sides.alternatives ? { alternatives: sides.alternatives } : {}) } : { kind: 'advice', text: `Use ${fmt(want)} on the sides and ${fmt(b.pt)} on top.` },
    }];
  },
};

// #10. The icon side gets less padding: a glyph box carries its own whitespace.
export const iconSide = {
  id: 'craft/icon-side', family: 'craft', round: { '*': 'down' }, number: [10], owns: ['padding-x'], once: 'ancestor', after: ['craft/button-padding'], reads: ['style', 'kids', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches(CONTROL)) return [];
    const kids = facts.kids(el);
    const icon = (k) => k && (k.localName === 'svg' || k.localName === 'img' || k.matches('[data-icon], [aria-hidden="true"]') && !/\S/.test(k.textContent ?? '') || k.querySelector?.('svg') && !/\S/.test(k.textContent ?? ''));
    const text = /[\p{L}\p{N}]/u.test(words(el));
    if (!text || kids.length < 1) return [];
    const lead = icon(kids[0]) && !(kids.length === 1 && !facts.text(el)), tail = kids.length > 0 && icon(kids.at(-1)) && !lead;
    if (!lead && !tail) return [];
    // an icon beside the words, in a row: a cover or a picture above them (a media tile) is not an icon side
    const es = facts.style(el), mark = facts.rect(lead ? kids[0] : kids.at(-1));
    if ((/flex/.test(es.display) && /column/.test(es.flexDirection)) || mark.height > 32 || mark.width > 32) return [];
    // a full-width row (a menu item, a list row) whose content sits at its start isn't a centred button: its sides
    // aren't seen against each other
    // (the content's span, bare words included)
    const span = document.createRange(); span.selectNodeContents(el);
    const b0 = facts.box(el);
    if (!/center/.test(es.justifyContent) && facts.rect(el).width - b0.pl - b0.pr > span.getBoundingClientRect().width + 24) return [];
    const b = facts.box(el);
    if (b.pl < T.min || Math.abs(b.pl - b.pr) > 0.5) return [];
    const side = lead ? 'l' : 'r', other = lead ? 'r' : 'l';
    const less = b.pl - T.want.less >= 4 ? b.pl - T.want.less : b.pl - T.less;
    const cls = utility(el, 'px');
    const iconSide = recommend({ family: 'spacing', prefix: `p${side}`, job: 'icon', want: { max: b.pl - T.less, target: less }, round: 'down', from: cls ?? '', token: false, sets: (v) => ({ [lead ? 'paddingLeft' : 'paddingRight']: v }), theme });
    const textSide = recommend({ family: 'spacing', prefix: `p${other}`, job: 'text', want: { min: b.pl - 0.5, max: b.pl + 0.5, target: b.pl }, from: '', token: false, theme });
    const to = iconSide.kind === 'class' && textSide.kind === 'class' ? `${iconSide.to} ${textSide.to}` : null;
    return [{
      ...say(this.id, { side: b.pl, less }),
      key: this.id, text: cls ?? 'padding', props: [lead ? 'padding-left' : 'padding-right'], value: `${b.pl}px`, n: b.pl,
      evidence: { padding: b.pl, side: lead ? 'left' : 'right' }, confidence: 0.82,
      suggest: cls && to ? { kind: 'class', from: cls, to, why: `${fmt(less)} by the icon, ${fmt(b.pl)} by the text`, sets: iconSide.sets ?? { [lead ? 'paddingLeft' : 'paddingRight']: less } } : { kind: 'advice', text: `Pad the icon side ${fmt(less)}, the text side ${fmt(b.pl)}.` },
    }];
  },
};

// #13. 45–75 characters a line for reading text.
export const measure = {
  id: 'craft/measure', family: 'craft', number: [13], owns: ['size'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('p, li, dd, blockquote') || !facts.text(el)) return [];
    const text = words(el);
    if (text.length < T.chars) return [];
    const s = facts.style(el);
    // the characters actually on a line, counted from the words (an estimate of half an em a character overcounts the
    // width a line holds and undercounts what a reader sees): the first full line, and the width its characters take
    const t = textNodes(el).find((n) => n.nodeValue.trim().length > 40);
    if (!t) return [];
    const range = document.createRange();
    let top = null, chars = 0, left = Infinity, right = -Infinity;
    for (let i = 0; i < Math.min(t.length, 400); i++) {
      range.setStart(t, i); range.setEnd(t, i + 1);
      const q = range.getClientRects()[0];
      if (!q) continue;
      top ??= q.top;
      if (q.top > top + q.height / 2) break;
      chars = i + 1; left = Math.min(left, q.left); right = Math.max(right, q.right);
    }
    if (chars <= T.max || lineCount(el) < 3) return [];
    // the fix sized from this font: the width of T.want.target characters, in the font's own ch (its zero)
    textCtx ??= document.createElement('canvas').getContext('2d');
    textCtx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const avg = (right - left) / chars, zero = textCtx.measureText('0').width || px(s.fontSize) * 0.55;
    const ch = Math.round((T.want.target * avg) / zero);
    const cls = utility(el, 'max-w');
    return [{
      ...say(this.id, { chars }),
      key: this.id, text: cls ?? 'max-width', props: ['max-width'], value: `${chars}ch`, n: chars,
      evidence: { perLine: chars, width: right - left, fontSize: px(s.fontSize) }, confidence: 0.84,
      // narrowing reflows the lines, which the verdict's virtual trial can't do: left untried, proved by asking again
      suggest: { kind: 'class', from: cls ?? '', to: `max-w-[${ch}ch]`, why: `about ${T.want.target} characters a line`, sets: { maxWidth: `${ch}ch` }, moves: true },
    }];
  },
};

// #14. Line height shrinks as size grows: body about 1.5, headings 1.1–1.25.
/** The design size of text whose size class multiplies a fixed px by a variable (calc(var(--z)*15px) or calc(15px*var(--z))), else null. */
function scaledSize(el) {
  for (const c of el.classList ?? []) {
    const m = /^(?:[\w-]+:)*text-\[(?:length:)?calc\((?:var\(--[\w-]+\)\s*\*\s*([\d.]+)px|([\d.]+)px\s*\*\s*var\(--[\w-]+\))\)\]$/.exec(c);
    if (m) return Number(m[1] ?? m[2]);
  }
  return null;
}
export const leading = {
  id: 'craft/leading', family: 'craft', number: [14], owns: ['line-height'], once: 'ancestor', reads: ['style', 'rect', 'text', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el)) return [];
    const s = facts.style(el), fs = px(s.fontSize), lh = px(s.lineHeight);
    if (!lh || !fs) return [];
    const ratio = lh / fs, lines = lineCount(el);
    // a size written as a zoom of a design size (`text-[length:calc(var(--z)*15px)]`, a scaled mockup) is that design
    // size: 15px body text drawn at 2.4×, not 36px display text
    const designed = scaledSize(el) ?? fs;
    const big = designed >= T.large && ratio > T.loose && lines >= 1;
    const cramped = fs <= T.small && ratio < T.tight && lines >= 3;
    if (!big && !cramped) return [];
    const cls = utility(el, 'leading');
    const want = big ? T.want.display : T.want.body;
    // what the page's other text of this kind is set at: big text for big text, paragraphs of small text for a cramped one
    const used = facts.used?.(`leading:${big ? 'display' : 'body'}`, (x) => {
      if (!facts.text(x)) return null;
      const xs = facts.style(x), xf = px(xs.fontSize), xl = px(xs.lineHeight);
      if (!xf || !xl || xl / xf < want.min || xl / xf > want.max) return null;
      return (big ? (scaledSize(x) ?? xf) >= T.large : xf <= T.small && lineCount(x) >= 2) ? { v: xl / xf, cls: utility(x, 'leading') } : null;
    });
    return [{
      ...say(this.id, { big, size: fs, ratio: ratio.toFixed(2) }),
      key: `${this.id}@${big ? 'loose' : 'tight'}`, text: cls ?? 'line-height', props: ['line-height'], value: ratio.toFixed(2), n: ratio,
      evidence: { fontSize: fs, lineHeight: lh, ratio, lines }, confidence: 0.83,
      suggest: recommend({ family: 'leading', prefix: 'leading', job: big ? 'display' : 'body', want: { ...want, of: fs }, from: cls ?? '', sets: (v) => ({ lineHeight: v * fs }), theme, used, usedOn: big ? 'headings' : 'paragraphs',
        label: big ? 'big text wants' : 'body text wants', advice: (v) => `Use a line height of ${v} here.` }),
    }];
  },
};

// #15. Tighten large type; space out small capitals.
export const tracking = {
  id: 'craft/tracking', family: 'craft', number: [15], owns: ['letter-spacing'], once: 'ancestor', reads: ['style', 'text', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el)) return [];
    const s = facts.style(el), fs = px(s.fontSize);
    const ls = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing);
    const caps = s.textTransform === 'uppercase' && fs <= T.caps && ls / fs < 0.02;
    const large = fs >= T.large && ls > 0;
    if (!caps && !large) return [];
    const cls = utility(el, 'tracking');
    const want = caps ? T.want.caps : T.want.display;
    // what the page's other small capitals (or its other big text) are spaced at
    const used = facts.used?.(`tracking:${caps ? 'caps' : 'display'}`, (x) => {
      if (!facts.text(x)) return null;
      const xs = facts.style(x), xf = px(xs.fontSize);
      if (!xf || xs.letterSpacing === 'normal') return null;
      return (caps ? xs.textTransform === 'uppercase' && xf <= T.caps : xf >= T.large) ? { v: px(xs.letterSpacing) / xf, cls: utility(x, 'tracking') } : null;
    });
    return [{
      ...say(this.id, { caps, size: fs }),
      key: `${this.id}@${caps ? 'caps' : 'large'}`, text: cls ?? 'letter-spacing', props: ['letter-spacing'], value: s.letterSpacing, n: ls,
      evidence: { fontSize: fs, letterSpacing: ls, uppercase: s.textTransform === 'uppercase' }, confidence: 0.84,
      suggest: recommend({ family: 'tracking', prefix: 'tracking', job: caps ? 'caps' : 'display', want: { ...want, of: fs }, from: cls ?? '', sets: (v) => ({ letterSpacing: v * fs }), theme, used, usedOn: caps ? 'labels' : 'headings',
        label: caps ? 'small capitals need' : 'big text wants', advice: (v) => `Use ${v}em of letter spacing here.` }),
    }];
  },
};

// #16. Tabular numbers where numbers line up: a column of figures in a table, or down the rows of a list.
export const tabularNums = {
  id: 'craft/tabular-nums', family: 'craft', number: [16], owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const cell = el.matches('td, th, [role="cell"], [role="gridcell"]');
    // a figure on its own in a row of a list (a timesheet's durations, an order list's totals) stacks just like a cell
    if (!cell && (el.children.length || !el.closest('li, [role="listitem"]'))) return [];
    const text = words(el);
    if (!/^[\s$€£¥₹+\-−–.,:%()\d]+$/.test(text) || (text.match(/\d/g) ?? []).length < 2) return [];
    if (cell) {
      const table = el.closest('table, [role="table"], [role="grid"]');
      if (!table || rowsOf(facts, table) < T.rows) return [];
    } else {
      const list = el.closest('li, [role="listitem"]').parentElement;
      if (!list || list.children.length < T.rows) return [];
    }
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
  id: 'craft/heading-widow', family: 'craft', number: [18], owns: ['text-flow'], once: 'ancestor', refines: ['craft/text-wrap-role'], reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('h1, h2, h3') || !facts.text(el)) return [];
    const s = facts.style(el);
    if (/balance|pretty/.test(`${s.textWrap ?? ''} ${s.textWrapStyle ?? ''}`)) return [];
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && /\S/.test(n.data));
    const last = nodes.at(-1);
    if (!last || words(el).split(' ').length < T.words) return [];
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
      suggest: { kind: 'class', from: '', to: 'text-balance', why: 'even lines', sets: { textWrap: 'balance', textWrapStyle: 'balance' }, moves: true },
    }];
  },
};

// #20. One light source: shadows fall the same way, down.
// The page's light, as its shadows say it: the direction most cast shadows fall (degrees, 0 = straight down, positive =
// to the right), and how many agree. Read once per pass.
const castOf = (l) => ({ d: Math.hypot(l.x, l.y), a: (Math.atan2(l.x, l.y) * 180) / Math.PI });
function pageLight(facts, T) {
  if (facts.light !== undefined) return facts.light;
  const angles = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('plumb-overlay') || !el.getClientRects().length) continue;
    const v = getComputedStyle(el).boxShadow;
    if (!v || v === 'none') continue;
    const cast = shadows(v).filter((l) => !l.inset && l.blur >= T.blur && Math.hypot(l.x, l.y) >= 1).map(castOf).sort((p, q) => q.d - p.d)[0];
    if (cast) angles.push(cast.a);
  }
  // the light most shadows agree on: the angle with the most others within 15° of it
  let best = null;
  for (const a of angles) { const n = angles.filter((b) => Math.abs(b - a) <= 15).length; if (!best || n > best.n) best = { a, n }; }
  facts.light = best && best.n >= 3 && best.n / angles.length >= 0.6 ? best : null;
  return facts.light;
}

export const oneLight = {
  id: 'craft/one-light', family: 'craft', number: [20], owns: ['shadow'], once: 'ancestor', reads: ['style', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (s.position === 'fixed') return []; // a drawer may cast to its side
    const cast = shadows(s.boxShadow).filter((l) => !l.inset && l.blur >= T.blur && Math.hypot(l.x, l.y) >= 1);
    if (!cast.length) return [];
    const light = pageLight(facts, T), cls = utility(el, 'shadow');
    // the page has a light (most of its shadows fall one way): a shadow that falls another way has a second light.
    // The fix turns it to the page's direction at its own length, blur and colour
    if (light) {
      const odd = cast.map((l) => ({ l, ...castOf(l) })).find((c) => Math.abs(c.a - light.a) > 25);
      if (!odd) return [];
      const r = (light.a * Math.PI) / 180, x = Math.round(odd.d * Math.sin(r) * 10) / 10, y = Math.round(odd.d * Math.cos(r) * 10) / 10;
      // the shadow's own layers: not Tailwind's empty ones, nor a ring (no offset, no blur: ring-* draws it, not shadow-*)
      const layers = s.boxShadow.split(/,(?![^(]*\))/).map((v) => v.trim()).filter((v) => { const c = shadows(v)[0]; return c && !(c.x === 0 && c.y === 0 && c.blur === 0); });
      const turned = layers.map((v) => { const c = shadows(v)[0]; if (!c || c.inset || Math.hypot(c.x, c.y) < 1) return v; const d = Math.hypot(c.x, c.y), px = Math.round(d * Math.sin(r) * 10) / 10, py = Math.round(d * Math.cos(r) * 10) / 10; return v.replace(/(-?[\d.]+)px (-?[\d.]+)px/, `${px}px ${py}px`); }).join(', ');
      return [{
        ...say(this.id, { odd: Math.round(odd.a), light: Math.round(light.a) }),
        key: this.id, text: cls ?? 'box-shadow', props: ['box-shadow'], value: `${odd.l.x}px ${odd.l.y}px`, n: Math.round(odd.a - light.a),
        evidence: { angle: Math.round(odd.a), light: Math.round(light.a), agree: light.n }, confidence: 0.84,
        suggest: { kind: 'class', from: cls ?? '', to: `shadow-[${turned.replace(/ /g, '_')}]`, why: `falling the way the page's other ${light.n} shadows do`, sets: { boxShadow: turned } },
      }];
    }
    // too few shadows to say where the light is: one that falls up or sideways still has none overhead
    const off = cast.filter((l) => l.y < 0 || Math.abs(l.x) > Math.abs(l.y) + 2);
    if (!off.length) return [];
    const l = off[0];
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
  id: 'craft/border-on-shadow', family: 'craft', number: [23], owns: ['border'], once: 'ancestor', reads: ['style', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (!shadows(s.boxShadow).some((l) => !l.inset && l.blur >= T.blur)) return [];
    if (!['Top', 'Right', 'Bottom', 'Left'].every((k) => px(s[`border${k}Width`]) >= 1 && s[`border${k}Style`] !== 'none')) return [];
    const c = rgb(s.borderTopColor);
    if (!c || c[3] < 1) return [];
    if (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > T.grey) return []; // a coloured border is a decision
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
  id: 'craft/contrast', family: 'craft', number: [24], owns: ['color'], once: 'ancestor', reads: ['style', 'text', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el) || el.closest('[aria-hidden="true"]')) return [];
    const s = facts.style(el);
    // words on a picture: a background image on the way up, or a photo laid under them (an <img> the words sit over, as
    // on a card with a scrim). What the eye reads them against isn't a colour plumber knows, so it says nothing. A picture
    // counts when it is drawn, visible, and covers most of the words' box
    const box = el.getBoundingClientRect(), under = (m) => {
      const q = m.getBoundingClientRect(), ms = getComputedStyle(m);
      if (q.width < 8 || q.height < 8 || ms.visibility === 'hidden' || ms.display === 'none') return false;
      const w = Math.min(q.right, box.right) - Math.max(q.left, box.left), h = Math.min(q.bottom, box.bottom) - Math.max(q.top, box.top);
      return w > 0 && h > 0 && w * h >= box.width * box.height * 0.5;
    };
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const ns = facts.style(n);
      if (ns.backgroundImage !== 'none') return [];
      if (n !== el && [...n.querySelectorAll('img, video, picture, canvas')].some((m) => !el.contains(m) && under(m))) return [];
      if (alpha(rgb(ns.backgroundColor)) > 0.5) break;
    }
    const ground = facts.ground(el), c = rgb(s.color);
    if (!c) return [];
    // the text as it shows: its own alpha and every fade on the way up
    let fade = 1, muted = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      // a fade still running (an entrance, a reveal on scroll) is a moment, not the text's colour: judge it at rest
      if (animated(facts).has(n)) return [];
      const o = parseFloat(facts.style(n).opacity) || 0;
      fade *= o;
      // an ancestor's line of words muted by opacity (#57 marks it there): its fade is that finding's, not this one's
      if (n !== el && o > 0 && o < 1 && facts.text(n)) muted *= o;
    }
    if (fade < 0.05) return []; // not shown at all (waiting to be revealed): there is nothing to read yet
    const text = over([c[0], c[1], c[2], alpha(c) * fade], ground);
    const fs = px(s.fontSize), w = parseInt(s.fontWeight, 10) || 400;
    // APCA reads weight as size: a heavier stroke reads like a larger one, so the floor falls with both
    const large = fs >= T.largeAt || fs >= T.boldLargeAt && w >= T.boldWeight;
    const need = large ? T.large : fs >= T.boldAt && w >= T.boldWeight ? T.bold : T.small;
    const lc = Math.abs(apca(text, ground));
    if (lc >= need) return [];
    if (muted < 1 && Math.abs(apca(over([c[0], c[1], c[2], alpha(c) * fade / muted], ground), ground)) >= need) return [];
    // rounded down: 59.7 short of 60 must not read as "60, needs 60"
    const shown = Math.floor(lc);
    return [{
      ...say(this.id, { lc: shown, size: fs, need, large }),
      key: this.id, text: colourClass(el, 'text', theme) ?? 'color', props: ['color'], value: `Lc ${shown}`, n: shown,
      evidence: { lc: shown, need, color: hex(text), ground: hex(ground), fontSize: fs, weight: w }, confidence: 0.85,
      suggest: { kind: 'advice', text: `${(0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2]) / 255 < 0.5 ? 'Lighten' : 'Darken'} the text, or make it bigger or bolder.` },
    }];
  },
};

// #26. Disabled is not just lower opacity: a faded coloured control loses its words.
export const disabledContrast = {
  id: 'craft/disabled-contrast', family: 'craft', number: [26], owns: ['color'], once: 'ancestor', refines: ['craft/contrast', 'craft/text-opacity'],
  // an inactive control (and the words inside it) is judged by this rule alone, whether it passes or not: WCAG 1.4.3
  // exempts it from text contrast, and its opacity is a state, not a colour choice
  scope: ({ el }) => disabled(el), reads: ['style', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches(':disabled, [aria-disabled="true"]') || !el.matches('button, [role="button"], input, a')) return [];
    const s = facts.style(el), o = parseFloat(s.opacity);
    if (!(o < 1)) return [];
    const parentGround = el.parentElement ? facts.ground(el.parentElement) : [255, 255, 255, 1];
    const fill = rgb(s.backgroundColor), c = rgb(s.color);
    if (!c) return [];
    const base = alpha(fill) > 0 ? over(fill, parentGround) : parentGround;
    const shownText = over([...over(c, base).slice(0, 3), o], parentGround), shownFill = over([...base.slice(0, 3), o], parentGround);
    const lc = Math.abs(apca(shownText, shownFill));
    if (lc >= T.min) return [];
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
  id: 'craft/hit-target', family: 'craft', number: [27], owns: ['size', 'padding-y'], once: 'ancestor', reads: ['rect', 'style', 'text'],
  check({ el, facts }, theme) {
    if (!el.matches('button, [role="button"], a[href], input:not([type="hidden"]), select, summary, [role="checkbox"], [role="switch"], [role="tab"]') || disabled(el)) return [];
    // a link inside a sentence is as tall as the line, and that is right
    if (el.matches('a[href]') && el.parentElement && facts.text(el.parentElement) && facts.style(el).display === 'inline') return [];
    if (el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) return []; // its label is the target
    const T = theme.spec(this.id);
    const r = facts.rect(el), { min, long } = T;
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
  id: 'craft/media-size', family: 'craft', number: [34], owns: ['size'], once: 'ancestor', reads: ['rect', 'kids'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('img, svg, [data-avatar]')) return [];
    // the size a list shares is the box: a scale drawn on top is an optical correction made on purpose (a round icon's
    // overshoot, #3), so it is taken out before sizes are compared
    const scaleOf = (n) => { const ns = facts.style(n), sc = ns.scale && ns.scale !== 'none' ? parseFloat(ns.scale) : 1, m = /matrix\(([^,]+)/.exec(ns.transform ?? ''); return (sc || 1) * (m ? parseFloat(m[1]) || 1 : 1); };
    const r = facts.rect(el), width = (n) => facts.rect(n).width / scaleOf(n);
    if (r.width < T.min) return [];
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
    const sizes = peers.map((p) => { let n = p; for (const i of path) n = n?.children[i]; return n && n.localName === el.localName ? Math.round(width(n)) : null; }).filter((w) => w !== null);
    const count = new Map(); for (const w of sizes) count.set(w, (count.get(w) ?? 0) + 1);
    const [mode, times] = [...count].sort((a, b) => b[1] - a[1])[0] ?? [];
    const mine = Math.round(width(el));
    if (!mode || mine === mode || times < 2 || times <= sizes.length / 2 || Math.abs(mine - mode) > T.near) return [];
    const cls = utility(el, 'size') ?? utility(el, 'w');
    return [{
      ...say(this.id, { mine, mode }),
      key: this.id, text: cls ?? 'size', props: ['width'], value: `${mine}px`, n: mine,
      evidence: { mine, mode, of: sizes.length }, confidence: 0.86,
      suggest: cls ? { ...recommend({ family: 'spacing', prefix: cls.replace(/^!|!$/g, '').split('-')[0], job: 'media', want: { min: mode - 0.5, max: mode + 0.5, target: mode }, from: cls, token: false, theme, advice: () => `Make it ${mode}px, like the rest.` }), why: `${mode}px, like the rest` } : { kind: 'advice', text: `Make it ${mode}px, like the rest.` },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen). A picture is never stretched: a box whose shape differs from the picture's own crops it (object-fit: cover).
// It is found before it stretches: a picture whose box is set on both sides, with nothing said about fit, is the slip
// whether or not today's photo at today's width happens to be the box's shape. (defensivecss.dev "Image distortion":
// a fixed-size avatar or card cover, then a user uploads another shape, or the card lands on a wider screen.)
export const imageFit = {
  id: 'craft/image-fit', family: 'craft', number: [], owns: ['fit'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el.localName !== 'img' || !el.complete || !el.naturalWidth || !el.naturalHeight) return [];
    const s = facts.style(el);
    if (s.objectFit !== 'fill') return [];
    // the box the picture is drawn in, in layout pixels (a page drawn scaled keeps its shape)
    const w = el.clientWidth - px(s.paddingLeft) - px(s.paddingRight), h = el.clientHeight - px(s.paddingTop) - px(s.paddingBottom);
    if (w < T.min || h < T.min) return [];
    const stretch = (w / h) / (el.naturalWidth / el.naturalHeight); // > 1: drawn wider than it is
    const shows = Math.abs(stretch - 1) > T.off;
    if (!shows) {
      // not stretched today. It can be when the box's shape is set without the picture: a height (or a ratio) and a
      // width both given by classes. A box with one side left to the picture keeps its shape and says nothing; so
      // does a drawing (an svg has no photo to swap in) and anything too small to be a photo (an icon, a logo mark)
      const AUTO = { not: /^(?:auto|fit|min|max)$/ };
      const tall = utility(el, 'h', AUTO) ?? utility(el, 'size', AUTO) ?? utility(el, 'aspect', AUTO);
      const across = utility(el, 'w', AUTO) ?? utility(el, 'size', AUTO) ?? utility(el, 'flex') ?? utility(el, 'grow') ?? utility(el, 'basis');
      if (!tall || !across || w < T.latentMin || h < T.latentMin || Math.min(el.naturalWidth, el.naturalHeight) < T.photo || /\.svg(?:[?#]|$)/i.test(el.currentSrc || el.src)) return [];
    }
    const wide = stretch > 1, by = shows ? Math.round((wide ? stretch - 1 : 1 / stretch - 1) * 100) : 0;
    return [{
      ...say(this.id, { by, wide }),
      key: this.id, text: utility(el, 'object') ?? 'object-fit', props: ['object-fit'], value: 'fill', n: by,
      evidence: { box: [Math.round(w), Math.round(h)], natural: [el.naturalWidth, el.naturalHeight], by, wide }, confidence: shows ? 0.9 : 0.82,
      suggest: { kind: 'class', from: utility(el, 'object') ?? '', to: 'object-cover', why: 'crops the picture to the box instead of stretching it', sets: { objectFit: 'cover' } },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen). A flex item that holds text may shrink: without min-width: 0 it is never narrower than its longest line, so
// `truncate` inside it can never cut anything, and a longer name or a narrower screen pushes the rest of the row out.
// It is found before it breaks: text set to cut off, inside a box that can't shrink, is the slip whether or not this
// name at this width happens to fit. (defensivecss.dev "Minimum content size in CSS flexbox".)
export const flexMin = {
  id: 'craft/flex-min', family: 'craft', number: [], owns: ['size'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const row = el.parentElement;
    if (!row) return [];
    const inRow = (box) => { const bs = facts.style(box); return /flex/.test(bs.display) && !/column/.test(bs.flexDirection); };
    if (!inRow(row) || facts.style(row).flexWrap !== 'nowrap') return [];
    const s = facts.style(el);
    // an item that may not shrink, or that clips, is not held open by its content
    if (s.minWidth !== 'auto' || s.overflowX !== 'visible' || s.flexShrink === '0' || s.position === 'absolute' || s.position === 'fixed') return [];
    const over = Math.max(0, row.scrollWidth - row.clientWidth);
    // the item of a row that a line sits in: the nearest one, never a box further out that the line merely spills from
    const itemOf = (t) => { for (let n = t; n && n.parentElement; n = n.parentElement) if (inRow(n.parentElement)) return n; return null; };
    // the cause: a line in this item that is meant to be cut off (and never can be), or one that may not wrap and is
    // pushing the row out now
    const held = [...el.querySelectorAll('*')].slice(0, T.depth).some((t) => {
      const ts = facts.style(t);
      return (ts.textOverflow === 'ellipsis' || (over > T.over && ts.whiteSpace === 'nowrap')) && itemOf(t) === el;
    });
    if (!held) return [];
    // an item given its own width is never held wider than that width: its floor is the smaller of the two. Until the
    // row runs over, there is nothing waiting to break
    if (over <= T.over && (utility(el, 'w', { not: /^(?:auto|fit|min|max|full)$/ }) || utility(el, 'size') || utility(el, 'basis', { not: /^auto$/ }))) return [];
    return [{
      ...say(this.id, { over: over > T.over ? over : 0 }),
      key: this.id, text: utility(el, 'min-w') ?? 'min-width', props: ['min-width'], value: 'auto', n: over,
      evidence: { over, row: row.clientWidth }, confidence: over > T.over ? 0.9 : 0.84,
      suggest: { kind: 'class', from: utility(el, 'min-w') ?? '', to: 'min-w-0', why: 'lets this part shrink, so its text is cut off instead of pushing the row out', sets: { minWidth: 0 }, moves: true },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen). Words over a picture have a colour behind them. A picture can arrive late or not at all (a slow connection, a
// dead link, a blocked host), and then the words sit on whatever is under it: white words on a white card. It is found
// before it breaks: the picture is read as if it were missing, and the words over it are judged against what is left.
// The finding lands on the picture, where one background colour holds every line. (defensivecss.dev "Text over image".)
export const imageGround = {
  id: 'craft/image-ground', family: 'craft', number: [], owns: ['background'], once: 'ancestor', reads: ['style', 'rect', 'text', 'ground'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el), img = el.localName === 'img';
    if (!img && !/url\(/.test(s.backgroundImage)) return [];
    if (s.display === 'none' || s.visibility === 'hidden' || alpha(rgb(s.backgroundColor)) > 0.5) return [];
    const box = el.getBoundingClientRect();
    if (box.width < T.min || box.height < T.min) return [];
    // the box the picture and its words share: for an <img>, the wrappers around it that are about its own size
    let host = el;
    if (img) {
      host = el.parentElement;
      for (let i = 1; i < T.up && host?.parentElement; i++) {
        const q = host.parentElement.getBoundingClientRect();
        if (q.width * q.height > box.width * box.height * T.wrap) break;
        host = host.parentElement;
      }
    }
    if (!host) return [];
    const inside = [...host.querySelectorAll('*')].slice(0, T.depth).filter((n) => n !== el);
    // how much of a box lies over the picture
    const covers = (n, on = box) => {
      const q = n.getBoundingClientRect();
      if (q.width <= 0 || q.height <= 0) return 0;
      const w = Math.min(q.right, on.right) - Math.max(q.left, on.left), h = Math.min(q.bottom, on.bottom) - Math.max(q.top, on.top);
      return w > 0 && h > 0 ? (w * h) / (q.width * q.height) : 0;
    };
    // what an element paints behind words: its colour, or the strongest stop of a scrim
    const paint = (n) => {
      const ns = facts.style(n), c = rgb(ns.backgroundColor);
      if (alpha(c) > 0.02) return c;
      if (!/gradient\(/.test(ns.backgroundImage)) return null;
      return stops(ns.backgroundImage).sort((a, b) => alpha(b) - alpha(a))[0] ?? null;
    };
    const base = facts.ground(host);
    const self = !img && /gradient\(/.test(s.backgroundImage) ? stops(s.backgroundImage).sort((a, b) => alpha(b) - alpha(a))[0] : null;
    const lost = inside.filter((t) => {
      if (!facts.text(t) || covers(t) < T.cover) return false;
      const ts = facts.style(t), c = rgb(ts.color);
      if (!c || ts.visibility === 'hidden' || (parseFloat(ts.opacity) || 0) < 0.05) return false;
      // without the picture: the ground under the box, then everything painted between it and the words
      let ground = self ? over(self, base) : base;
      for (const n of [...inside, t]) {
        if (n !== t && !n.contains(t) && (t.contains(n) || facts.text(n) || covers(t, n.getBoundingClientRect()) < T.cover)) continue;
        const p = paint(n);
        if (p) ground = over(p, ground);
      }
      return Math.abs(apca(over(c, ground), ground)) < T.lc;
    });
    if (!lost.length) return [];
    const light = (() => { const c = rgb(facts.style(lost[0]).color); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.5; })();
    const broken = img && el.complete && !el.naturalWidth;
    return [{
      ...say(this.id, { n: lost.length, broken }),
      key: this.id, text: utility(el, 'bg') ?? 'background-color', props: ['background-color'], value: 'none', n: lost.length,
      evidence: { lines: lost.length, ground: hex(base), broken }, confidence: broken ? 0.9 : 0.85,
      suggest: { kind: 'class', from: '', to: light ? 'bg-neutral-800' : 'bg-neutral-200', why: 'puts a colour behind the words for when the picture doesn’t arrive', sets: { backgroundColor: light ? 'rgb(38, 38, 38)' : 'rgb(229, 229, 229)' } },
    }];
  },
};

const truncated = (el, s) => s.textOverflow === 'ellipsis' && s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1;
const pathLike = (t) => /^\S+$/.test(t) && ((t.match(/[/\\]/g) ?? []).length >= 2 || /^[0-9a-f]{16,}$/i.test(t) || /^[\w-]+(?:\.[\w-]+){2,}$/.test(t));

// #35. Truncate with intent: what is cut off shows in full on hover.
export const truncateIntent = {
  id: 'craft/truncate-intent', family: 'craft', number: [35], owns: ['text-flow'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
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
  id: 'craft/scrollbar-gutter', family: 'craft', number: [36], owns: ['scroll'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el);
    if (!/auto/.test(s.overflowY) || s.scrollbarGutter !== 'auto') return [];
    const r = facts.rect(el);
    if (r.width < T.width || r.height < T.height) return [];
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
  id: 'craft/bold-hover', family: 'craft', number: [42], owns: ['font-weight'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
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
      // on the class: the hover darkens to the theme's strongest text colour instead of growing heavier, so nothing
      // around it moves (a bold copy reserving the width needs markup, so it stays advice)
      suggest: ((ink) => cls && ink
        ? { kind: 'class', from: cls, to: `${cls.replace(/font-[a-z]+$/, '')}text-${ink.short}`, why: 'a darker colour, the same width' }
        : { kind: 'advice', text: 'Reserve the bold width with a hidden bold copy, or change the colour instead.' })(
        theme.colors().find((t) => t.own !== false && /^(ink|foreground|fg|text|text-primary|content)$/.test(t.short))),
    }];
  },
};

// #45. Hanging punctuation: an opening quote hangs outside the text edge.
export const hangingQuote = {
  id: 'craft/hanging-quote', family: 'craft', number: [45], owns: ['text-flow'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    if (!el.matches('blockquote, blockquote > p, q, p') || !facts.text(el)) return [];
    const first = [...el.childNodes].find((n) => n.nodeType === 3 && /\S/.test(n.data));
    if (!first || !/^\s*["“‘'«]/.test(first.data) || first !== el.firstChild && el.firstChild?.nodeType !== 3) return [];
    const s = facts.style(el);
    if (px(s.textIndent) < 0 || /first/.test(s.hangingPunctuation ?? '')) return [];
    if (el.matches('blockquote > p') && el.parentElement && el.parentElement.firstElementChild !== el) return [];
    const at = first.data.search(/\S/), mark = document.createRange();
    mark.setStart(first, at); mark.setEnd(first, at + 1);
    const em = Math.round((mark.getBoundingClientRect().width / (px(s.fontSize) || 16)) * 100) / 100;
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'text-indent', props: ['text-indent'], value: s.textIndent, n: 0,
      evidence: { first: first.data.trim()[0], hang: em }, confidence: 0.82,
      // hang exactly the opening mark's own width, measured, so the words line up with the lines below
      suggest: { kind: 'class', from: '', to: `-indent-[${em}em]`, why: 'the quote mark hangs in the margin', sets: { textIndent: `-${em}em` } },
    }];
  },
};

// #46. Capitals get the case feature, so hyphens, brackets and @ sit at their height.
export const capsCase = {
  id: 'craft/caps-case', family: 'craft', number: [46], owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    if (!facts.text(el)) return [];
    const s = facts.style(el);
    if (s.textTransform !== 'uppercase' && !/^[^a-z]*[A-Z]{3}[^a-z]*$/.test(words(el))) return [];
    if (!/[-()@\[\]{}:—–·]/.test(words(el)) || /"case"/.test(s.fontFeatureSettings)) return [];
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'font-feature-settings', props: ['font-feature-settings'], value: s.fontFeatureSettings, n: 0,
      evidence: { text: words(el).slice(0, 40) }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: "[font-feature-settings:'case']", why: 'lifts the punctuation', sets: { fontFeatureSettings: '"case"' } },
    }];
  },
};

// a computed linear or radial gradient, mixed in OKLCH: "linear-gradient(90deg, …)" becomes "linear-gradient(90deg in oklch, …)"
const inOklch = (bg) => bg.replace(/(linear|radial|conic)-gradient\(([^,(]*(?:\([^)]*\))?[^,]*?),/, (m, kind, first) =>
  /^\s*(?:to\s|-?[\d.]+(?:deg|turn|rad)|circle|ellipse|at\s)/.test(first) ? `${kind}-gradient(${first} in oklch,` : `${kind}-gradient(in oklch, ${first},`);
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
  // owns how a gradient mixes, not which colours it uses: a token (the theme's answer to "which colours") never settles
  // it, so it stands beside a drift mark on the same background instead of folding under it
  id: 'craft/gradient-space', family: 'craft', number: [55], owns: ['interpolation'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const bg = facts.style(el).backgroundImage;
    if (!/gradient\(/.test(bg) || /\bin (?:oklab|oklch|lab|lch|hsl|display-p3)/.test(bg)) return [];
    // a stop written in a modern space (oklch, oklab, color()) already mixes in Oklab by default: only legacy stops go grey
    if (/\b(?:oklch|oklab|color)\(/.test(bg)) return [];
    const c = stops(bg).filter((x) => alpha(x) > 0.5).map(hsl);
    if (c.length < 2) return [];
    const [a, b] = [c[0], c.at(-1)];
    const dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0]));
    if (a[1] < T.saturation || b[1] < T.saturation || dh < T.hue) return [];
    const cls = classesOf(el).split(/\s+/).find((k) => /^bg-(?:linear|gradient)-to-[a-z]+$/.test(k));
    return [{
      ...say(this.id, {}),
      key: this.id, text: cls ?? 'background-image', props: ['background-image'], value: 'srgb', n: dh,
      evidence: { from: hex(stops(bg)[0]), to: hex(stops(bg).at(-1)), hue: Math.round(dh) }, confidence: 0.84,
      // the same gradient, mixed in OKLCH: a Tailwind gradient class takes /oklch; a written one gets the words added
      suggest: cls ? { kind: 'class', from: cls, to: `${cls.replace('bg-gradient-', 'bg-linear-')}/oklch`, why: 'mixed in OKLCH', sets: { backgroundImage: inOklch(bg) } }
        : { kind: 'class', from: '', to: arbitrary('bg', inOklch(bg)), why: 'mixed in OKLCH', sets: { backgroundImage: inOklch(bg) } },
    }];
  },
};

// #70. Inputs at least 16px, or iOS Safari zooms the page on focus.
export const inputZoom = {
  id: 'craft/input-zoom', family: 'craft', number: [70], owns: ['font-size'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('input:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="hidden"], [type="button"], [type="submit"], [type="reset"], [type="image"]), textarea, select') || disabled(el)) return [];
    const fs = px(facts.style(el).fontSize);
    if (fs >= T.min) return [];
    // the zoom happens on a phone: a field 16px at phone width (text-base, then smaller from md up) is the fix, on any
    // window this page is read in
    const phone = classesOf(el).split(/\s+/).filter((c) => !c.includes(':'));
    if (phone.some((c) => /^text-(?:base|lg|xl|[2-9]xl)$/.test(c) || (/^text-\[(\d+(?:\.\d+)?)px\]$/.exec(c)?.[1] ?? 0) >= T.min)) return [];
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
// The header that stays at the top of what the target scrolls in: the page's, or a pane's own (a docs column, an app
// panel that scrolls by itself), as wide as most of it.
function stickyHeader(facts, target) {
  let pane = null;
  for (let n = target?.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const o = facts.style(n).overflowY;
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 1) { pane = n; break; }
  }
  const memo = headers.get(facts) ?? new Map();
  headers.set(facts, memo);
  if (memo.has(pane)) return memo.get(pane);
  let found = null;
  const wide = pane ? pane.clientWidth : innerWidth;
  const list = pane ? pane.querySelectorAll('header, nav, [role="banner"], :scope > *') : document.querySelectorAll('header, nav, [role="banner"], body > div > *:first-child, body > *');
  for (const el of list) {
    if (el.closest('plumb-overlay')) continue;
    const s = facts.style(el);
    if (s.position !== 'sticky' && s.position !== 'fixed') continue;
    // its layout size (the page may be drawn scaled; the margin it needs is in CSS pixels)
    const w = el.offsetWidth || facts.rect(el).width, h = el.offsetHeight || facts.rect(el).height;
    if (px(s.top) > 0.5 || w < wide * 0.6 || h < 32 || h > 160) continue;
    found = h; break;
  }
  memo.set(pane, found);
  return found;
}

// #73. scroll-margin-top on anchor targets, so the sticky header doesn't cover the heading you jumped to.
export const anchorOffset = {
  id: 'craft/anchor-offset', family: 'craft', round: { '*': 'up' }, number: [73], owns: ['scroll'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    if (!el.id || !el.matches('h1, h2, h3, h4, section, article, [id]:is(h5, h6)')) return [];
    // an id is only a place people land when something links to it (a link on the page, or the address itself)
    facts.linked ??= new Set([...document.querySelectorAll('a[href*="#"]')].map((a) => decodeURIComponent(a.hash.slice(1))).concat(decodeURIComponent(location.hash.slice(1))).filter(Boolean));
    if (!facts.linked.has(el.id)) return [];
    const h = stickyHeader(facts, el);
    if (!h) return [];
    const s = facts.style(el);
    if (px(s.scrollMarginTop) >= h - 0.5) return [];
    const parentMargin = [...document.querySelectorAll('html, body')].some((n) => px(facts.style(n).scrollPaddingTop) >= h - 0.5);
    if (parentMargin) return [];
    // up to a whole step of the spacing scale: 77px becomes 80 (scroll-mt-20), the way it would be written
    const unit = theme.unit?.() || 4, need = Math.ceil(h / unit - 1e-6) * unit;
    const rec = recommend({ family: 'spacing', prefix: 'scroll-mt', job: 'header', want: { min: Math.ceil(h), target: need }, round: 'up', from: utility(el, 'scroll-mt') ?? '', token: false, sets: (v) => ({ scrollMarginTop: v }), theme,
      advice: () => `Give it scroll-margin-top: ${fmt(Math.ceil(h))}, the header’s height.` });
    return [{
      ...say(this.id, { id: el.id, header: h }),
      key: this.id, text: utility(el, 'scroll-mt') ?? 'scroll-margin-top', props: ['scroll-margin-top'], value: s.scrollMarginTop, n: px(s.scrollMarginTop),
      evidence: { header: h, margin: px(s.scrollMarginTop) }, confidence: 0.85,
      suggest: rec.kind === 'class' ? { ...rec, why: `the header’s ${fmt(Math.ceil(h))}` } : rec,
    }];
  },
};

// already cut in the middle: the truncating part is the path's start, and a sibling after it keeps the end whole
// (src/components/… then Checkbox.tsx)
function cutInMiddle(el, facts) {
  const next = el.nextElementSibling;
  return !!next && !!words(next).trim() && !truncated(next, facts.style(next));
}

// #76. Truncate paths and ids in the middle: their ends carry the meaning.
export const middleTruncate = {
  id: 'craft/middle-truncate', family: 'craft', number: [76], owns: ['text-flow'], once: 'ancestor', refines: ['craft/truncate-intent'],
  scope: ({ el, facts }) => truncated(el, facts.style(el)) && pathLike(words(el)) && !cutInMiddle(el, facts), reads: ['style'],
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const t = words(el);
    if (!truncated(el, s) || !pathLike(t) || cutInMiddle(el, facts)) return [];
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
  id: 'craft/text-wrap-role', family: 'craft', number: [48], owns: ['text-flow'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el)) return [];
    const s = facts.style(el);
    if (/balance|pretty|nowrap/.test(`${s.textWrap ?? ''} ${s.textWrapStyle ?? ''} ${s.textWrapMode ?? ''}`) || s.whiteSpace === 'nowrap' || s.textOverflow === 'ellipsis') return [];
    const body = px(facts.style(document.body).fontSize) || 16, fs = px(s.fontSize);
    const heading = el.matches('h1, h2, h3, h4') || fs >= body * 1.5;
    // the lines as drawn: their widths, from the words' own boxes
    const range = document.createRange(), rows = new Map(), boxes = [];
    for (const t of textNodes(el)) { range.selectNodeContents(t); boxes.push(...range.getClientRects()); }
    for (const q of boxes) { if (q.width < 1) continue; const k = Math.round(q.top); const row = rows.get(k) ?? { l: Infinity, r: -Infinity }; row.l = Math.min(row.l, q.left); row.r = Math.max(row.r, q.right); rows.set(k, row); }
    const widths = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w.r - w.l);
    const lines = widths.length;
    if (lines < 2) return [];
    const ratio = widths.at(-1) / Math.max(...widths.slice(0, -1));
    // a heading whose last line is less than half the others: visibly uneven; running text whose last line is a
    // near-orphan (under 15% of the others), only on a wide block
    const uneven = heading && ratio < T.uneven;
    const block = !heading && el.matches('p, li, dd, blockquote') && lines >= 3 && facts.rect(el).width >= T.width && ratio < T.orphan;
    if (!uneven && !block) return [];
    const to = heading ? 'text-balance' : 'text-pretty';
    return [{
      ...say(this.id, { heading, lines }),
      key: this.id, text: 'text-wrap', props: ['text-wrap'], value: s.textWrap ?? 'wrap', n: lines,
      evidence: { lines, heading, ratio: Math.round(ratio * 100) / 100 }, confidence: 0.82,
      // re-breaking lines is a reflow the verdict's virtual trial can't do: left untried, proved by asking again
      suggest: { kind: 'class', from: '', to, why: heading ? 'even lines' : 'no lonely last word', sets: { textWrap: heading ? 'balance' : 'pretty', textWrapStyle: heading ? 'balance' : 'pretty' }, moves: true },
    }];
  },
};

// #40. Continuous corners, where the browser draws them: an advisory (taste), on large surfaces only.
export const continuousCorners = {
  id: 'craft/continuous-corners', family: 'craft', number: [40], owns: ['radius'], once: 'ancestor', reads: ['style', 'rect'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!globalThis.CSS?.supports?.('corner-shape', 'squircle')) return [];
    const s = facts.style(el), r = facts.rect(el);
    const rad = px(s.borderTopLeftRadius);
    if (r.width < T.size * 0.75 || r.height < T.size * 0.75 || rad < T.radius * 0.75) return [];
    const grey = r.width < T.size || r.height < T.size || rad < T.radius;
    // a plain round corner computes as superellipse(1); anything else is already shaped on purpose
    if (!/^(round|superellipse\(1\))?$/.test(s.getPropertyValue('corner-shape').trim())) return [];
    if (!((rgb(s.backgroundColor)?.[3] ?? 0) > 0 || s.boxShadow !== 'none')) return [];
    return [{
      ...say(this.id, { r: rad }),
      key: this.id, tier: T.tier, text: utility(el, 'rounded') ?? 'border-radius', props: ['border-radius'], value: `${rad}px`, n: rad,
      evidence: { radius: rad, width: r.width, height: r.height }, confidence: grey ? GREY : 0.8,
      suggest: { kind: 'class', from: '', to: '[corner-shape:squircle]', why: 'a smoother curve at the same size', sets: { cornerShape: 'squircle' } },
    }];
  },
};

// #49. Optical sizing on, when the font has the axis.
export const opticalSizing = {
  id: 'craft/optical-sizing', family: 'craft', number: [49], owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
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
  id: 'craft/tinted-shadow', family: 'craft', number: [21, 52], owns: ['shadow'], once: 'ancestor', reads: ['style', 'ground'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (s.boxShadow === 'none' || !el.parentElement) return [];
    // a ring (spread alone, no offset or blur: Tailwind's ring-*) is an edge drawn in its own colour, not a shadow
    const layers = s.boxShadow.split(/,(?![^(]*\))/).filter((l) => { const [d] = shadows(l); return !d.inset && (d.x || d.y || d.blur); });
    // Tailwind's shadow-sm…xl are exactly 10% black: at the line counts
    const colours = layers.map((l) => rgb(l.match(COLOUR)?.[0])).filter((c) => c && c[3] >= T.alpha);
    if (!colours.length) return [];
    const ground = facts.ground(el.parentElement);
    // a barely coloured ground (two thirds of the way to the line) is the grey band: is the grey shadow dirty there?
    if (chroma(ground) <= T.ground * 0.66 || !colours.every((c) => chroma(c) < T.shadow)) return [];
    const grey = chroma(ground) <= T.ground;
    const h = Math.round(hueOf(ground)), a = Math.max(...colours.map((c) => c[3]));
    return [{
      ...say(this.id, { ground: hex(ground) }),
      key: this.id, text: utility(el, 'shadow') ?? 'box-shadow', props: ['box-shadow'], value: s.boxShadow, n: a,
      evidence: { ground: hex(ground), hue: h }, confidence: grey ? GREY : 0.82,
      // the same shadow, its grey swapped for a dark tint of the ground's own hue
      suggest: ((v) => ({ kind: 'class', from: utility(el, 'shadow') ?? '', to: arbitrary('shadow', v), why: 'tinted with what it falls on', sets: { boxShadow: v } }))(
        // (Tailwind's empty ring and inset layers, transparent and zero, are left out of the class)
        s.boxShadow.split(/,(?![^(]*\))/).map((l) => l.trim()).filter((l) => !/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(l)).join(', ').replace(new RegExp(COLOUR.source, 'g'), (c) => { const x = rgb(c); return x && x[3] > 0 && chroma(x) < T.shadow ? `oklch(0.3 0.05 ${h} / ${x[3].toFixed(2)})` : c; })),
    }];
  },
};

// #56. A two-stop scrim over an image: ease it.
export const easedScrim = {
  // owns the curve of the fade, not its colour (see gradient-space): it stands beside a drift mark on the same background
  id: 'craft/eased-scrim', family: 'craft', number: [56], owns: ['interpolation'], once: 'ancestor', reads: ['style', 'rect'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (!/^linear-gradient\(/.test(s.backgroundImage) || /,\s*linear-gradient/.test(s.backgroundImage) || s.position !== 'absolute') return [];
    const stops = [...s.backgroundImage.matchAll(COLOUR)].map((m) => rgb(m[0])).filter(Boolean);
    if (stops.length !== 2) return [];
    const clear = stops.find((c) => c[3] === 0), dark = stops.find((c) => c[3] >= 0.5 && oklab(c)[0] < 0.2);
    if (!clear || !dark) return [];
    const r = facts.rect(el);
    if (Math.max(r.width, r.height) < T.length * 0.7) return [];
    const grey = Math.max(r.width, r.height) < T.length; // a short fade: does its edge show?
    // over media: an image, a video or a picture beside it or around it, covering half of it or more
    const media = [...(el.parentElement?.querySelectorAll('img, video, picture') ?? [])].find((m) => {
      const q = m.getBoundingClientRect();
      const w = Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)), h = Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
      return w * h >= r.width * r.height * 0.5;
    });
    if (!media) return [];
    const c = `rgb(${dark.slice(0, 3).join(' ')}`; // real CSS: arbitrary() turns it into a class
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'background-image', props: ['background-image'], value: 'linear', n: 2,
      evidence: { dark: hex(dark) }, confidence: grey ? GREY : 0.83,
      // the same fade on an eased curve (the scrim gradient: thirteen stops whose darkness drops fast, then flattens to
      // nothing), so its end has no edge for the eye to catch
      suggest: ((v) => ({ kind: 'class', from: '', to: arbitrary('bg', v), why: 'an eased fade, no edge', sets: { backgroundImage: v } }))(
        `linear-gradient(to top, ${EASED.map((k, i) => `${c} / ${(dark[3] * k).toFixed(3)}) ${Math.round((i / (EASED.length - 1)) * 1000) / 10}%`).join(', ')})`),
    }];
  },
};

// #25. No pure black or white on large areas (white only where the theme's surfaces are tinted; else it is taste).
export const pureBlackWhite = {
  id: 'craft/pure-black-white', family: 'craft', number: [25], owns: ['background'], once: 'ancestor', reads: ['style', 'rect'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el), c = rgb(s.backgroundColor);
    if (!c || c[3] < 1) return [];
    const black = c[0] === 0 && c[1] === 0 && c[2] === 0, white = c[0] === 255 && c[1] === 255 && c[2] === 255;
    if (!black && !white) return [];
    const r = facts.rect(el), area = r.width * r.height;
    const big = (k) => area >= T.area * k || area >= innerWidth * innerHeight * T.share * k;
    if (!big(0.5)) return [];
    const grey = !big(1); // half the size: is it large enough to glare?
    // a colour the project's theme names (bg-surface that happens to be white) is its decision, not an escape; the
    // framework's own black and white come with every theme, so they decide nothing
    const own = colourClass(el, 'bg', theme);
    if (own && theme.colors().some((t) => t.own !== false && own === `bg-${t.short}`)) return [];
    const tinted = theme.colors().find((t) => /surface|paper|ground|background/.test(t.short) && !(t.rgb[0] === 255 && t.rgb[1] === 255 && t.rgb[2] === 255) && Math.min(...t.rgb) > 220);
    // the project's own near-black first (a dark ink or night colour), else whatever the theme has near it
    const ownDark = theme.colors().filter((t) => t.own !== false && Math.max(...t.rgb) <= 64)
      .map((t) => ({ ...t, distance: Math.hypot(t.rgb[0] - 20, t.rgb[1] - 20, t.rgb[2] - 22) })).filter((t) => t.distance <= T.within * 1.25).sort((a, b) => a.distance - b.distance)[0];
    const near = black ? ownDark ?? theme.nearestColor([20, 20, 22], T.within) : tinted;
    // white outside a tinted theme is taste, unless the spec makes the rule a note already
    const tier = black || tinted ? T.tier : Math.max(T.tier, TIER.advisory);
    return [{
      ...say(this.id, { black }),
      key: this.id, tier, text: own ?? 'background-color', props: ['background-color'], value: hex(c), n: area,
      evidence: { colour: hex(c), area: Math.round(area) }, confidence: grey ? GREY : 0.8,
      suggest: near && own ? { kind: 'class', from: own, to: `bg-${near.short}`, why: black ? 'a near-black from your theme' : 'your tinted surface' } : { kind: 'advice', text: black ? 'Use a tinted near-black, 2–3% toward your brand hue.' : 'Tint it 2–3% toward your brand hue, or use your surface colour.' },
    }];
  },
};

// #33. A fixed width that crushes its words: let it fit them.
export const contentSize = {
  id: 'craft/content-size', family: 'craft', number: [33], owns: ['size'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
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
    const overflow = el.scrollWidth > el.clientWidth + 1 || lineCount(el) > 1 && s.whiteSpace !== 'normal';
    if (!(overflow || (need > 0 && (inner - need) / inner < T.slack && lineCount(el) > 1))) return [];
    return [{
      ...say(this.id, { w: r.width, need: Math.ceil(need + b.pl + b.pr) }),
      key: this.id, text: cls, props: ['width'], value: `${r.width}px`, n: r.width,
      evidence: { width: r.width, need }, confidence: 0.82,
      suggest: { kind: 'class', from: cls, to: 'w-auto', why: 'fits its words', sets: { width: 'auto' } },
    }];
  },
};

// ── hard rules, layer 1: font metrics (facts.metrics) ─────────

// one line of words, owned by this element (its own text, a single line box)
const oneLine = (el, facts) => facts.text(el) && lineCount(el) <= 1;

// #6. Baseline alignment: text of different sizes side by side lines up on its baseline, not its centre.
export const baselineAlign = {
  id: 'craft/baseline-align', family: 'craft', number: [6], owns: ['align'], once: 'ancestor', reads: ['style', 'kids', 'metrics'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (!/flex/.test(s.display) || /column/.test(s.flexDirection) || /baseline/.test(s.alignItems)) return [];
    // a pill, tag or button draws a box, and a box is rightly centred on the words: only bare words share a baseline
    const drawn = (k) => { const ks = facts.style(k); return !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(ks.backgroundColor) || parseFloat(ks.borderTopWidth) > 0 || (ks.boxShadow && ks.boxShadow !== 'none'); };
    const words = facts.kids(el).filter((k) => oneLine(k, facts) && !k.querySelector('svg, img') && !drawn(k));
    if (words.length < 2) return [];
    const sizes = new Set(words.map((k) => px(facts.style(k).fontSize)));
    if (sizes.size < 2) return [];
    const lines = words.map((k) => facts.metrics(k)?.baseline).filter((b) => b !== null && b !== undefined);
    if (lines.length < 2) return [];
    const off = Math.max(...lines) - Math.min(...lines);
    if (off <= T.off) return [];
    const cls = utility(el, 'items');
    return [{
      ...say(this.id, { off }),
      key: this.id, text: cls ?? 'align-items', props: ['align-items'], value: s.alignItems, n: off,
      evidence: { off: Math.round(off * 10) / 10, sizes: [...sizes] }, confidence: 0.86,
      suggest: { kind: 'class', from: cls ?? '', to: 'items-baseline', why: 'one baseline for both sizes', sets: { alignItems: 'baseline' } },
    }];
  },
};

// #4. An icon beside words is centred on the capitals' middle (the first line's, in a row built to wrap), not the line box.
export const iconCap = {
  id: 'craft/icon-cap', family: 'craft', number: [4], owns: ['transform'], once: 'ancestor', reads: ['style', 'kids', 'rect', 'metrics'],
  // judged from the row that holds the icon (the reader doesn't read inside svg), and drawn on that row
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const ps = facts.style(el);
    if (!/flex/.test(ps.display) || /column/.test(ps.flexDirection)) return [];
    // centred on the row (one line of words), or on top of it, the way a list row with a title and a time under it is
    // built so its words can wrap: then the icon belongs on the first line's capitals
    const centred = /center/.test(ps.alignItems), top = /^(?:normal|stretch|start|flex-start)$/.test(ps.alignItems);
    if (!centred && !top) return [];
    const icon = [...el.children].find((k) => k.localName === 'svg');
    if (!icon) return [];
    const parent = el;
    const r = facts.rect(icon);
    if (r.height > T.icon || r.height < 4) return [];
    // the element whose own words make the first line (a title inside a column of title and time). An svg is never the
    // words: icons can carry text of their own (an animated icon's styles), so the search never enters one
    const own = (n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
    const first = (n) => (n.localName === 'svg' ? null : own(n) ? n : [...n.children].reduce((hit, k) => hit ?? first(k), null));
    const host = centred
      ? (facts.text(parent) ? parent : facts.kids(parent).find((k) => k !== icon && facts.text(k)))
      : (own(parent) ? parent : facts.kids(parent).reduce((hit, k) => hit ?? (k === icon ? null : first(k)), null));
    if (!host || (centred && lineCount(host, facts) > 1)) return [];
    const m = facts.metrics(host);
    if (!m?.baseline) return [];
    const off = (r.top + r.height / 2) - (m.baseline - m.capHeight / 2);
    if (Math.abs(off) <= T.off) return [];
    const whole = Math.round(off * (devicePixelRatio || 1)) / (devicePixelRatio || 1);
    return [{
      ...say(this.id, { off }),
      key: this.id, text: 'svg', props: ['align-items'], value: `${Math.round(off * 10) / 10}px`, n: off,
      evidence: { off: Math.round(off * 10) / 10, cap: m.capHeight }, confidence: 0.82,
      suggest: { kind: 'class', from: '', to: `[&>svg]:translate-y-[${-whole}px]`, target: ':scope > svg', why: 'on the capitals’ middle', sets: { translate: `0 ${-whole}px` },
        text: `Nudge it ${whole > 0 ? 'up' : 'down'} by ${fmt(Math.abs(whole))} (translate-y-[${-whole}px]), or size it to the capitals.` },
    }];
  },
};

// #5. Trim the leading: padding next to a single line of words looks bigger than it is.
export const trimLeading = {
  id: 'craft/trim-leading', family: 'craft', number: [5], owns: ['text-box'], once: 'ancestor', reads: ['style', 'metrics'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    // one line of words, with the inline things a line carries (a link, a bold word): a banner or a button as built
    if (el.matches('input, textarea, select') || !oneLine(el, facts) || facts.kids(el).some((k) => !/^inline(?!-(?:block|flex|grid))/.test(facts.style(k).display))) return [];
    const s = facts.style(el);
    if (/trim/.test(s.textBoxTrim ?? s.getPropertyValue('text-box-trim') ?? '')) return [];
    if (!((rgb(s.backgroundColor)?.[3] ?? 0) > 0 || px(s.borderTopWidth) > 0)) return [];
    const m = facts.metrics(el), pt = px(s.paddingTop);
    if (!m || pt <= 0 || m.halfLeading < T.leading) return [];
    // every font has room above its capitals; what a person didn't choose is the line's own extra space
    if (m.halfLeading < pt * T.share) return [];
    const unseen = m.halfLeading + (m.ascent - m.capHeight);
    const trim = globalThis.CSS?.supports?.('text-box-trim', 'trim-both');
    return [{
      ...say(this.id, { pad: pt, seen: pt + unseen }),
      key: this.id, text: 'padding-top', props: ['padding-top'], value: `${pt}px`, n: pt,
      evidence: { padding: pt, unseen: Math.round(unseen * 10) / 10 }, confidence: 0.82,
      suggest: trim ? { kind: 'class', from: '', to: '[text-box:trim-both_cap_alphabetic]', why: 'the padding measured from the letters', sets: { textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' } }
        : { kind: 'advice', text: `Take about ${fmt(Math.round(unseen))} off the top and bottom padding, or trim the text box.` },
    }];
  },
};

// ── spacing against the text it separates (docs/research/video-rules.md) ─────────

const HEADING_TAG = /^h[1-6]$/;
// running text: a paragraph, list, quote or code block (or a container ending in one) more than a line tall; a row of
// chips or a label line that wraps is not (a card's meta row above its heading)
const PROSE = /^(p|ul|ol|dl|blockquote|pre|table)$/;
const bodyText = (el, facts) => {
  const block = PROSE.test(el.localName) ? el : PROSE.test(el.lastElementChild?.localName ?? '') ? el.lastElementChild : null;
  if (!block) return false;
  const s = facts.style(block), lh = px(s.lineHeight) || px(s.fontSize) * 1.4;
  return facts.rect(block).height > lh * 1.8 || facts.rect(el).height > lh * 1.8;
};
const sizeOf = (el, facts) => px(facts.style(el).fontSize);

// hierarchy S6. A heading sits nearer what it introduces than what came before it.
export const headingLead = {
  id: 'craft/heading-lead', family: 'craft', number: [], owns: ['margin-top'], once: 'ancestor', reads: ['style', 'kids', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!HEADING_TAG.test(el.localName) || !facts.text(el) || !el.parentElement) return [];
    const kids = facts.kids(el.parentElement), i = kids.indexOf(el), prev = kids[i - 1], next = kids[i + 1];
    if (!prev || !next || HEADING_TAG.test(prev.localName) || !bodyText(prev, facts)) return [];
    const r = facts.rect(el), above = facts.rect(el).top - facts.rect(prev).bottom, below = facts.rect(next).top - r.bottom;
    if (below <= 0.5 || above >= below * T.lead) return [];
    const want = Math.ceil(below * T.lead);
    return [{
      ...say(this.id, { above, below, want }),
      key: this.id, text: utility(el, 'mt') ?? 'margin-top', props: ['margin-top'], value: `${Math.round(above)}px`, n: above,
      evidence: { above: Math.round(above), below: Math.round(below) }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Give the heading at least ${fmt(want)} above, or less below.` },
    }];
  },
};

// hierarchy S4. A pair of texts is spaced in em of the larger: a subtitle sits nearer its title than the body does
// (order), and a heading isn't further from its own text than the text is tall (detached)
export const pairSpacing = {
  id: 'craft/pair-spacing', family: 'craft', number: [], owns: ['margin-top'], once: 'ancestor', reads: ['style', 'kids', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el) || !el.parentElement) return [];
    const kids = facts.kids(el.parentElement), i = kids.indexOf(el), b = kids[i + 1], c = kids[i + 2];
    if (!b || !facts.text(b)) return [];
    const em = (x, y) => (facts.rect(y).top - facts.rect(x).bottom) / Math.max(sizeOf(x, facts), sizeOf(y, facts));
    const ab = em(el, b);
    // order: title, subtitle, body (sizes going down): the subtitle is the title's, so it sits nearer
    // (a line that introduces what follows, "Run the gate:" before a code block, is not a subtitle: it belongs below)
    // the title is a heading or clearly bigger than the body; the subtitle a short line of text (never a code block, list
    // or table); then running text
    const title = HEADING_TAG.test(el.localName) || sizeOf(el, facts) >= sizeOf(c ?? el, facts) * 1.15;
    if (c && title && !/^(ul|ol|dl|blockquote|pre|table)$/.test(b.localName) && c.localName === 'p' && facts.text(c) && sizeOf(el, facts) > sizeOf(b, facts) && bodyText(c, facts) && !/:\s*$/.test(b.textContent ?? '')) {
      const bc = em(b, c);
      if (ab > 0 && ab >= bc + T.order) return [{
        ...say(this.id, { kind: 'order', ab, bc }),
        key: this.id, text: 'margin-top', props: ['margin-top'], value: `${ab.toFixed(2)}em`, n: ab,
        evidence: { titleToSubtitle: +ab.toFixed(2), subtitleToBody: +bc.toFixed(2) }, confidence: 0.82,
        suggest: { kind: 'advice', text: 'Bring the subtitle closer to the title than the text below it.' },
      }];
    }
    // detached: a heading further from its text than one line of the heading
    if (HEADING_TAG.test(el.localName) && bodyText(b, facts) && ab > T.far) return [{
      ...say(this.id, { kind: 'far', ab }),
      key: this.id, text: 'margin-top', props: ['margin-top'], value: `${ab.toFixed(2)}em`, n: ab,
      evidence: { headingToText: +ab.toFixed(2) }, confidence: 0.8,
      suggest: { kind: 'advice', text: `Bring the text within ${fmt(sizeOf(el, facts) * T.far)} of its heading.` },
    }];
    return [];
  },
};

// A card's top padding measured from the letters: the first line's box carries space above its capitals, so equal
// padding looks taller on top (trim-leading, for a card with more than one line of words)
export const cardOpticalPadding = {
  id: 'craft/card-optical-padding', family: 'craft', number: [], owns: ['padding-top'], once: 'ancestor', reads: ['style', 'kids', 'text', 'metrics'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const kids = facts.kids(el), first = kids[0];
    if (!first || !facts.text(first) || el.matches('input, textarea, select, button')) return [];
    const s = facts.style(el), b = facts.box(el);
    // a card: a filled or bordered box with a card's side padding (a chip's or a row's few pixels are not one)
    if (!(b.pt > 0 && b.pl >= T.side) || !((rgb(s.backgroundColor)?.[3] ?? 0) > 0 || b.bt > 0)) return [];
    // a box that holds its own line of words is trim-leading's (one cause, one finding), and a trimmed box has no
    // leading left to add
    if (facts.text(el) || /trim/.test(s.textBoxTrim ?? '') || /trim/.test(facts.style(first).textBoxTrim ?? '')) return [];
    const m = facts.metrics(first);
    if (!m) return [];
    const letters = b.pt + (facts.rect(first).top - facts.rect(el).top - b.bt - b.pt) + m.halfLeading + (m.ascent - m.capHeight), left = b.pl;
    // the first thing the eye meets at the top: the first letters, or a drawn box beside them that starts higher (a
    // footer's button, a field), measured from the same edge
    const drawn = (k) => k.matches(CONTROL + ', input, select, textarea, img, svg') || (rgb(facts.style(k).backgroundColor)?.[3] ?? 0) > 0 || facts.box(k).bt > 0;
    const boxes = kids.filter(drawn).map((k) => facts.rect(k).top - facts.rect(el).top - b.bt);
    const top = Math.min(letters, ...boxes);
    if (top - left < T.min || top - left < left * T.share) return [];
    return [{
      ...say(this.id, { top, left }),
      key: this.id, text: utility(el, 'pt') ?? utility(el, 'py') ?? utility(el, 'p') ?? 'padding-top', props: ['padding-top'], value: `${b.pt}px`, n: b.pt,
      evidence: { seenTop: Math.round(top), left }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Take about ${fmt(Math.round(top - left))} off the top padding, or trim the first line's box.` },
    }];
  },
};

// ── hard rules, layer 2: the page's own habits (facts.census) ─────────

const WEIGHTS = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };

// #17. Two or three weights: a weight the page barely uses, when it already has three or more.
export const weightLevels = {
  id: 'craft/weight-levels', family: 'craft', number: [17], owns: ['font-weight'], once: 'ancestor', reads: ['style', 'text', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el) || !facts.census) return [];
    const c = facts.census('weights');
    if (c.sample < T.sample || c.clusters.length <= 3) return [];
    const w = Math.round((parseInt(facts.style(el).fontWeight, 10) || 400) / 100) * 100;
    if (c.share(w) > T.minority) return [];
    const majority = c.clusters.slice(0, 3).map((k) => k.value);
    if (majority.includes(w)) return [];
    const near = majority.slice().sort((a, b) => Math.abs(a - w) - Math.abs(b - w))[0];
    const cls = classesOf(el).split(/\s+/).find((k) => /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/.test(k));
    return [{
      ...say(this.id, { w, used: majority.sort((a, b) => a - b).join(', ') }),
      key: this.id, text: cls ?? `font-weight ${w}`, props: ['font-weight'], value: String(w), n: w,
      evidence: { weight: w, majority, sample: c.sample }, confidence: 0.82,
      suggest: cls ? { ...((r) => (r.kind === 'class' ? r : { kind: 'class', from: cls, to: `font-${WEIGHTS[near]}` }))(recommend({ family: 'weight', prefix: 'font', job: 'body', want: { min: near, max: near, target: near }, from: cls, token: false, theme })), why: `${near}, one the page already uses`, sets: { fontWeight: String(near) } } : { kind: 'advice', text: `Use weight ${near}, one the page already uses.` },
    }];
  },
};

// #17. Two or three text greys: a neutral text colour the page barely uses, when it already has three or more.
export const greyLevels = {
  id: 'craft/grey-levels', family: 'craft', number: [17], owns: ['color'], once: 'ancestor', reads: ['style', 'text', 'ground', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el) || !facts.census) return [];
    const c = facts.census('textColors');
    if (c.sample < T.sample || c.clusters.length <= 3) return [];
    const k = c.clusters.find((x) => x.members.includes(el));
    if (!k || k.count / c.sample > T.minority || c.clusters.slice(0, 3).includes(k)) return [];
    const majority = c.clusters.slice(0, 3);
    const near = majority.map((x) => x.value).sort((a, b) => Math.hypot(...a.map((v, i) => v - k.value[i])) - Math.hypot(...b.map((v, i) => v - k.value[i])))[0];
    const cls = colourClass(el, 'text', theme) ?? classesOf(el).split(/\s+/).find((x) => /^text-\[#/.test(x)) ?? null;
    const rec = recommendColour({ rgb: near, prefix: 'text', from: cls ?? '', within: T.within, theme, why: 'a grey the page already uses', advice: `Use ${hex(near)}, a grey the page already uses.` });
    return [{
      ...say(this.id, { used: majority.length }),
      key: this.id, text: cls ?? 'color', props: ['color'], value: hex(k.value), n: k.count,
      evidence: { colour: hex(k.value), majority: majority.map((x) => hex(x.value)) }, confidence: 0.82,
      suggest: cls ? rec : asAdvice(rec, () => `Use ${hex(near)}, a grey the page already uses.`),
    }];
  },
};

// #12. Vertical rhythm: a stack whose gap is off the gaps the page keeps to.
export const rhythm = {
  id: 'craft/rhythm', family: 'craft', number: [12], owns: ['gap'], once: 'ancestor', reads: ['style', 'kids', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.census) return [];
    const s = facts.style(el);
    if (!/flex/.test(s.display) || !/column/.test(s.flexDirection) || facts.kids(el).length < 3) return [];
    const g = px(s.rowGap === 'normal' ? 0 : s.rowGap);
    if (g < 8) return [];
    const c = facts.census('gaps');
    if (c.sample < T.sample) return [];
    // the rhythm: the clusters that together cover most of the page
    const steps = [];
    let covered = 0;
    for (const k of c.clusters) { if (covered / c.sample >= T.majority) break; steps.push(k.value); covered += k.count; }
    // a minority: a tenth of the page or less, and a lone value always (on a small page one place is over a tenth)
    if (steps.some((v) => Math.abs(v - g) <= T.off) || c.share(g) > Math.max(0.1, 1.5 / c.sample)) return [];
    // a stack of stacks spaces groups: its gap is meant to be wider than the gaps inside them (#7), so a wider gap there
    // is the page's structure, not a stray value
    const stacks = facts.kids(el).filter((k) => { const ks = facts.style(k); return /flex|grid/.test(ks.display) && facts.kids(k).length >= 2 && px(ks.rowGap === 'normal' ? 0 : ks.rowGap) > 0; });
    if (stacks.length && g > Math.max(...steps)) return [];
    const near = steps.slice().sort((a, b) => Math.abs(a - g) - Math.abs(b - g))[0];
    const cls = utility(el, 'gap', { not: /^x(?:-|$)/ });
    const rec = recommend({ family: 'spacing', prefix: 'gap', job: 'stack', want: { min: near - 0.5, max: near + 0.5, target: near }, from: cls ?? '', token: false, sets: (v) => ({ rowGap: v, columnGap: v }), theme, advice: () => `Use ${fmt(near)}, the page’s rhythm.` });
    return [{
      ...say(this.id, { g, steps: steps.map((v) => fmt(v)).join(' and ') }),
      key: this.id, text: cls ?? 'gap', props: ['row-gap'], value: `${g}px`, n: g,
      evidence: { gap: g, rhythm: steps, sample: c.sample }, confidence: 0.82,
      suggest: cls && rec.kind === 'class' ? { ...rec, why: `${fmt(near)}, the page’s rhythm` } : { kind: 'advice', text: `Use ${fmt(near)}, the page’s rhythm.` },
    }];
  },
};

// #22. An elevation ladder: each height a clear step from the next. A shadow a hair off a level the page uses more is
// a level of its own nobody can see, and it blurs the ladder: it takes that level's shadow.
export const elevationLadder = {
  id: 'craft/elevation-ladder', family: 'craft', number: [22], owns: ['shadow'], once: 'ancestor', reads: ['style', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.census) return [];
    const b = elevation(facts.style(el).boxShadow);
    if (!b) return [];
    const c = facts.census('shadows');
    if (c.sample < T.sample) return [];
    const own = c.clusters.find((k) => k.members.includes(el));
    if (!own) return [];
    // the level it crowds: one the page uses more, closer than a step
    const near = c.clusters.filter((k) => k !== own && k.count > own.count && Math.max(k.value, b) / Math.min(k.value, b) < T.step)
      .sort((x, y) => Math.abs(x.value - b) - Math.abs(y.value - b))[0];
    if (!near) return [];
    // the class that sets the level, never the one that colours it (shadow-black/5 beside shadow-md)
    const level = (x) => utility(x, 'shadow', { not: { test: (rest) => isColour(rest, theme) } });
    const cls = level(el);
    const to = near.members.map(level).find(Boolean);
    const value = facts.style(near.members[0]).boxShadow;
    return [{
      ...say(this.id, { blur: b, level: near.value }),
      key: this.id, text: cls ?? 'box-shadow', props: ['box-shadow'], value: `${b}px`, n: b,
      evidence: { blur: b, level: near.value, uses: near.count }, confidence: 0.82,
      suggest: cls && to ? { kind: 'class', from: cls, to, why: `the ${fmt(near.value)} level the page already uses` } : { kind: 'advice', text: `Use the page’s ${fmt(near.value)} level: box-shadow: ${value}` },
    }];
  },
};

// ── ink (layer 3): what an icon actually draws ──

const iconOnly = (el, facts) => {
  const kids = facts.kids(el);
  return kids.length === 1 && kids[0].localName === 'svg' && !facts.text(el) && !el.textContent.trim() ? kids[0] : null;
};

// #2. An icon-only control centres the icon's weight, not its box: a play triangle centred by its box looks left.
export const opticalCentre = {
  id: 'craft/optical-centre', family: 'craft', number: [2], owns: ['transform'], once: 'ancestor', reads: ['style', 'kids', 'rect', 'ink'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches(CONTROL)) return [];
    const svg = iconOnly(el, facts);
    if (!svg) return [];
    const r = facts.rect(svg), c = facts.rect(el);
    if (r.width > T.icon || r.height > T.icon) return [];
    const ink = facts.ink(svg);
    if (!ink?.bbox) return [];
    const mid = { x: ink.bbox.x + ink.bbox.w / 2, y: ink.bbox.y + ink.bbox.h / 2 };
    const lean = { x: (ink.centroid.x - mid.x) / ink.bbox.w, y: (ink.centroid.y - mid.y) / ink.bbox.h };
    if (Math.abs(lean.x) < T.lean && Math.abs(lean.y) < T.lean) return []; // a symmetric shape
    // where the eye puts the icon's middle: halfway between its box's middle and its weight
    const seen = { x: r.left + (mid.x + ink.centroid.x) / 2, y: r.top + (mid.y + ink.centroid.y) / 2 };
    const move = { x: c.left + c.width / 2 - seen.x, y: c.top + c.height / 2 - seen.y };
    const axis = Math.abs(move.x) >= Math.abs(move.y) ? 'x' : 'y', by = move[axis];
    if (Math.abs(by) < T.off) return [];
    const whole = Math.round(by), dir = axis === 'x' ? (by > 0 ? 'right' : 'left') : (by > 0 ? 'down' : 'up');
    const cls = `${whole < 0 ? '-' : ''}translate-${axis}-${Math.abs(whole) === 1 ? 'px' : `[${Math.abs(whole)}px]`}`;
    return [{
      ...say(this.id, { by: Math.abs(by), dir }),
      key: this.id, text: 'svg', props: ['translate'], value: `${Math.round(by * 10) / 10}px`, n: by,
      // a nudge of 1 to 1.4px is the grey band: whether the eye sees it depends on the shape (the judge looks)
      evidence: { lean: Math.round(lean[axis] * 100) / 100, move: Math.round(by * 10) / 10, axis }, confidence: Math.abs(by) < T.sure ? GREY : 0.84,
      // the nudge belongs to the icon, so the class that carries it sits on the control and reaches its svg
      suggest: { kind: 'class', from: '', to: `[&>svg]:${cls}`, target: ':scope > svg', why: 'centred by its weight', sets: { translate: axis === 'x' ? `${whole}px 0` : `0 ${whole}px` },
        text: `Nudge the icon ${dir} by ${fmt(Math.abs(whole))}: ${cls} on the svg.` },
    }];
  },
};

// #3. In a set of icons, round ones are drawn a little bigger than square ones, or they look smaller.
export const overshoot = {
  id: 'craft/overshoot', family: 'craft', number: [3], owns: ['size'], once: 'ancestor', reads: ['kids', 'rect', 'ink'],
  judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const svgs = facts.kids(el).map((k) => (k.localName === 'svg' ? k : iconOnly(k, facts))).filter(Boolean);
    if (svgs.length < T.set) return [];
    const w0 = facts.rect(svgs[0]).width;
    if (svgs.some((g) => Math.abs(facts.rect(g).width - w0) > 0.5)) return []; // one set shares one size
    const inks = svgs.map((g) => facts.ink(g));
    if (inks.some((i) => !i?.bbox)) return [];
    const square = (b) => Math.abs(b.w - b.h) / Math.max(b.w, b.h) <= 0.06;
    const round = inks.filter((i) => square(i.bbox) && Math.abs(i.fill - Math.PI / 4) <= 0.05);
    const box = inks.filter((i) => square(i.bbox) && i.fill >= 0.9);
    if (!round.length || !box.length) return [];
    const big = (i) => Math.max(i.bbox.w, i.bbox.h), sq = Math.max(...box.map(big)), rd = Math.min(...round.map(big));
    if (rd >= sq * T.over) return [];
    return [{
      ...say(this.id, { rd, sq }),
      key: this.id, text: 'svg', props: ['width', 'height'], value: fmt(rd), n: rd / sq,
      // drawn the same size as the squares is the mistake itself (the natural one: one box for every logo), and filled
      // shapes are measured exactly, so it is sure; only a round one already a little larger, short of the overshoot, is grey
      evidence: { round: Math.round(rd * 10) / 10, square: Math.round(sq * 10) / 10 }, confidence: rd > sq + 0.5 ? GREY : 0.8,
      // the scale that brings the smallest round one to the squares' size and the overshoot past it, on the round svgs:
      // a set's own svgs (svg:nth-child), or the svg inside a set's icon-only controls (:nth-child > svg), the usual case
      suggest: ((at, k) => {
        const text = `Draw the round icons ${Math.round((k - 1) * 100)}% bigger (scale-[${k}]) so they read the same size.`;
        if (!at.length || at.some((a) => !a.i)) return { kind: 'advice', text };
        const own = at.every((a) => a.own), nth = at.map((a) => `:nth-child(${a.i})`);
        if (!own && at.some((a) => a.own)) return { kind: 'advice', text };
        const pick = nth.length === 1 ? nth[0] : `:is(${nth.join(',')})`;
        return { kind: 'class', from: '', to: own ? `[&>svg${pick}]:scale-[${k}]` : `[&>${pick}>svg]:scale-[${k}]`,
          target: nth.map((n) => (own ? `:scope > svg${n}` : `:scope > ${n} > svg`)).join(', '), why: 'round drawn a touch larger', sets: { scale: String(k) }, text };
      })(svgs.filter((g, i) => round.includes(inks[i])).map((g) => {
        const own = g.parentElement === el, child = own ? g : g.parentElement?.parentElement === el ? g.parentElement : null;
        return { own, i: child ? [...el.children].indexOf(child) + 1 : 0 };
      }), Math.ceil((sq * T.over / rd) * 100) / 100),
    }];
  },
};

// #50. An icon's stroke follows the weight of the words beside it, the way this app pairs them.
const weightBand = (w) => ((parseInt(w, 10) || 400) >= 600 ? 'bold' : 'regular');
const strokePairs = (facts) => {
  const out = [];
  for (const el of facts.items) {
    if (!el.isConnected) continue;
    const svg = facts.kids(el).find((k) => k.localName === 'svg');
    if (!svg) continue;
    const host = facts.text(el) ? el : facts.kids(el).find((k) => k !== svg && facts.text(k));
    const w = host && facts.stroke(svg);
    if (w) out.push({ el, svg, w, band: weightBand(facts.style(host).fontWeight) });
  }
  return out;
};
export const strokeWeight = {
  id: 'craft/stroke-weight', family: 'craft', number: [50], owns: ['border'], once: 'ancestor', reads: ['kids', 'style', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const svg = facts.kids(el).find((k) => k.localName === 'svg');
    const w = svg && facts.stroke(svg);
    if (!w) return [];
    const size = svg.clientWidth || facts.rect(svg).width;
    if (size >= T.big && w > T.heavy) {
      // the stroke stays the width it's drawn at (2 in a 24 box) however big the icon is drawn
      return [{ ...say(this.id, { w, big: true }), key: this.id, text: 'svg', props: ['stroke-width'], value: fmt(w), n: w,
        evidence: { stroke: Math.round(w * 10) / 10, size: Math.round(size) }, confidence: 0.84,
        suggest: { kind: 'class', from: '', to: '[&>svg_*]:[vector-effect:non-scaling-stroke]', target: ':scope > svg *', why: 'the stroke the small icons have', sets: { vectorEffect: 'non-scaling-stroke' } } }];
    }
    const host = facts.text(el) ? el : facts.kids(el).find((k) => k !== svg && facts.text(k));
    if (!host) return [];
    // the app's own pairing, learnt once per pass: for each weight band, the stroke most of its icons use
    facts.strokes ??= strokePairs(facts);
    const band = weightBand(facts.style(host).fontWeight), same = facts.strokes.filter((p) => p.band === band);
    if (same.length < T.sample) return [];
    const counts = new Map();
    for (const p of same) { const k = Math.round(p.w * 4) / 4; counts.set(k, (counts.get(k) ?? 0) + 1); }
    const [usual, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
    const mine = counts.get(Math.round(w * 4) / 4) ?? 0;
    if (Math.abs(w - usual) < T.off || mine / same.length > 0.25 || n / same.length < 0.6) return [];
    return [{
      ...say(this.id, { w, usual }),
      key: this.id, text: 'svg', props: ['stroke-width'], value: fmt(w), n: w,
      evidence: { stroke: Math.round(w * 10) / 10, usual, band, sample: same.length }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Use the ${fmt(usual)} stroke the rest of the app pairs with this weight ([stroke-width:${usual}]).` },
    }];
  },
};

// #75 (static half). A scroll area with no scrollbar shows nothing at its edge: people don't know there is more.
// Scroll shadows drawn in the background (Lea Verou's): a soft shadow at an edge where more is hidden, covered by a
// patch of the ground that scrolls with the content, so it's gone once you reach that end. One class, on the ground's
// own colour.
function scrollShadows(ground) {
  const g = hex(ground);
  const v = `linear-gradient(${g} 30%, transparent) center top / 100% 40px no-repeat local, linear-gradient(transparent, ${g} 70%) center bottom / 100% 40px no-repeat local, radial-gradient(farthest-side at 50% 0, rgb(0 0 0 / 0.12), transparent) center top / 100% 12px no-repeat scroll, radial-gradient(farthest-side at 50% 100%, rgb(0 0 0 / 0.12), transparent) center bottom / 100% 12px no-repeat scroll, ${g}`;
  return { kind: 'class', from: '', to: `[background:${v.replace(/ /g, '_')}]`, why: 'a shadow at the edge while more is hidden', sets: { background: v, backgroundAttachment: 'local, local, scroll, scroll' } };
}
export const scrollCue = {
  id: 'craft/scroll-cue', family: 'craft', number: [75], owns: ['scroll'], once: 'ancestor', reads: ['style', 'box'],
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const y = /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4;
    const x = !y && /auto|scroll/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 4;
    if (!y && !x || el === document.scrollingElement || el === document.body) return [];
    if (facts.other('scrolled')?.cue(el) === true) return []; // headless: scrolled to its end, its edge did change
    const b = facts.box(el);
    const bar = y ? el.offsetWidth - el.clientWidth - b.bl - b.br : el.offsetHeight - el.clientHeight - b.bt - b.bb;
    if (bar > 0) return []; // a scrollbar is the cue
    const faded = (st) => st && (/gradient/.test(st.maskImage ?? '') || /gradient/.test(st.webkitMaskImage ?? ''));
    const layered = /local/.test(s.backgroundAttachment);
    const edge = [el, el.parentElement].filter(Boolean).some((n) => ['::before', '::after'].some((p) => /gradient/.test(getComputedStyle(n, p).backgroundImage)));
    if (faded(s) || layered || edge) return [];
    return [{
      ...say(this.id, { x }),
      key: this.id, text: utility(el, 'overflow') ?? 'overflow', props: [y ? 'overflow-y' : 'overflow-x'], value: y ? s.overflowY : s.overflowX, n: 0,
      evidence: { hidden: Math.round(y ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth) }, confidence: 0.8,
      suggest: y ? scrollShadows(facts.ground(el)) : { kind: 'advice', text: 'Fade the sides where more is hidden: a mask-image gradient, or a background with background-attachment: local.' },
    }];
  },
};

// ── motion, static halves (the headless probes confirm them) ──

// the class list's utilities under one variant, e.g. data-[state=open]:
const variantOf = (el, v) => classesOf(el).split(/\s+/).filter((c) => c.startsWith(v)).map((c) => c.slice(v.length));
const ms = (cls) => { const m = /^duration-(\d+)$/.exec(cls ?? ''); return m ? +m[1] : null; };
const STEPS = [75, 100, 150, 200, 300, 500, 700, 1000];

// #31. A control answers a press within 100ms. Judged against the app: when some of its controls press and this one
// doesn't, the press it uses is the fix (the engine never brings a style the app doesn't have).
const pressIdiom = (facts) => {
  const counts = new Map();
  for (const el of facts.items) {
    if (!el.isConnected || !el.matches(CONTROL)) continue;
    for (const c of classesOf(el).split(/\s+/)) if (c.startsWith('active:')) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return top ? { cls: top[0], n: top[1] } : null;
};
let ACTIVE = null; // selectors with :active in this document's sheets, read once per sheet count
const activeSelectors = () => {
  if (ACTIVE?.n === document.styleSheets.length) return ACTIVE.list;
  const list = [];
  const walk = (rules) => { for (const r of rules) { if (r.selectorText?.includes(':active')) list.push(r.selectorText.replace(/:active/g, '')); else if (r.cssRules) walk(r.cssRules); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
  ACTIVE = { n: document.styleSheets.length, list };
  return list;
};
export const pressFeedback = {
  id: 'craft/press-feedback', family: 'craft', number: [31], owns: ['motion'], once: 'ancestor', reads: ['style', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('button, [role="button"]') || el.matches(':disabled, [aria-disabled="true"], [type="submit"]')) return [];
    if (/(^|\s)active:/.test(classesOf(el)) || el.hasAttribute('aria-pressed')) return [];
    facts.press ??= pressIdiom(facts) ?? false;
    if (!facts.press || facts.press.n < T.idiom) return []; // an app that never presses is a page finding, headless
    if (activeSelectors().some((sel) => { try { return sel.trim() && el.matches(sel); } catch { return false; } })) return [];
    return [{
      ...say(this.id, { idiom: facts.press.cls }),
      key: this.id, text: facts.press.cls, props: ['transform'], value: 'none', n: 0,
      evidence: { idiom: facts.press.cls, uses: facts.press.n }, confidence: 0.82,
      suggest: { kind: 'class', from: '', to: facts.press.cls, why: 'the press the rest of the app uses' },
    }];
  },
};

// #68. A surface leaves faster than it came: the open and closed states share one duration.
export const exitFaster = {
  id: 'craft/exit-faster', family: 'craft', number: [68], owns: ['motion'], once: 'ancestor', reads: ['style'],
  check({ el }, theme) {
    const T = theme.spec(this.id);
    const open = variantOf(el, 'data-[state=open]:'), closed = variantOf(el, 'data-[state=closed]:');
    if (!open.length || !closed.length) return [];
    if (closed.some((c) => ms(c) !== null)) return []; // the exit has its own duration
    const own = classesOf(el).split(/\s+/).map(ms).find((n) => n !== null) ?? open.map(ms).find((n) => n !== null) ?? 150;
    if (own < T.instant) return [];
    const exit = [...STEPS].reverse().find((n) => n <= own * T.ratio);
    if (!exit) return [];
    return [{
      ...say(this.id, { enter: own, exit }),
      key: this.id, text: `data-[state=closed]:duration-${exit}`, props: ['transition-duration'], value: `${own}ms`, n: own,
      evidence: { enter: own, exit }, confidence: 0.8,
      suggest: { kind: 'class', from: '', to: `data-[state=closed]:duration-${exit}`, why: 'leaving is quicker than arriving' },
    }];
  },
};

// #64. Motion that can be interrupted: keyframes on both states restart from their first frame when reversed.
export const interruptible = {
  id: 'craft/interruptible', family: 'craft', number: [64], owns: ['motion'], once: 'ancestor', reads: ['style'],
  check({ el }, theme) {
    const keyframed = (list) => list.some((c) => /^animate-/.test(c));
    if (!keyframed(variantOf(el, 'data-[state=open]:')) || !keyframed(variantOf(el, 'data-[state=closed]:'))) return [];
    return [{
      ...say(this.id),
      key: this.id, text: 'animate', props: ['animation'], value: 'keyframes', n: 0,
      evidence: { keyframes: true }, confidence: 0.8,
      suggest: { kind: 'advice', text: 'Drive open and closed with a transition on the state, so a close midway reverses from where it is.' },
    }];
  },
};

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel, hairline, imageOutline, layeredShadow, scaleFromZero, zIndexWar, contentAlign,
  buttonPadding, iconSide, measure, leading, tracking, tabularNums, headingWidow, oneLight, borderOnShadow, contrast, disabledContrast, hitTarget, mediaSize, imageFit, flexMin, imageGround,
  truncateIntent, scrollbarGutter, boldHover, hangingQuote, capsCase, gradientSpace, inputZoom, anchorOffset, middleTruncate,
  textWrapRole, continuousCorners, opticalSizing, tintedShadow, easedScrim, pureBlackWhite, contentSize,
  baselineAlign, iconCap, trimLeading, headingLead, pairSpacing, cardOpticalPadding,
  weightLevels, greyLevels, rhythm, elevationLadder,
  opticalCentre, overshoot, strokeWeight, scrollCue, pressFeedback, exitFaster, interruptible, ...RUN_RULES];

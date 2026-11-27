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
 *  list-wrap           —       a row drawn from a list wraps when it is full
 *  declared-gap        —       parts of a row are kept apart by a declared gap, not by left-over space
 *  scroll-on-demand    —       a scrollbar shows only when there is more to scroll
 *  snap-rest           —       a row read a part at a time rests on a whole part
 *  snap-strict         —       strict snapping only where every part fits the view
 *  snap-unreachable    —       every part of a strictly snapping area has a place to rest
 *  snap-offset         —       a snapped part clears the bar stuck over it
 *  scroll-chain        —       a panel over the page keeps its scroll to itself
 *  native-accent       —       a browser-drawn control wears the product's colour
 *  row-dead-zone       —       every pixel of a menu belongs to a row
 *  image-broken        —       a picture that was asked for is there
 *  empty-box           —       something that holds nothing takes no room
 *  link-in-text        —       a link in a sentence shows without relying on colour
 *  last-divider        —       a divider sits between two rows, not after the last
 *  box-overflow        —       a box told to fill its parent fits inside it
 *  icon-soft           —       an icon has the pixels a sharp screen needs
 *  css-words           —       words are in the page, not drawn by CSS
 *  type-viewport       —       text grows when the person makes it grow
 *  br-spacing          —       space is set by the layout, not by blank lines
 *  fixed-height        —       a box that holds text sets its least height, not its exact height
 *  sticky-room         —       a sticky side column is not stretched to its row, so it has room to stick
 *  image-fit           —       a picture in a box of another shape is cropped, never stretched
 *  image-stretch       —       a picture in a row keeps its own height, not the row's
 *  background-tile     —       a background photo is drawn once, not tiled
 *  fixed-column        —       a grid with a fixed column has a one-column form for narrow screens
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
import { rgb, inkCss, utility, classesOf, elevation, COLOUR } from './craft-read.js';
import { TIER } from './craft-facets.js';
import { say } from './words.js';
import { ticks } from './live.js';
import { controlAround, controlKind, roleOf } from './roles.js';
import { RUN_RULES } from './craft-headless.js';
import { RANK_RULES } from './craft-ranks.js';
import { rowsOf as cardRows, rowLines as partLines, edgesOf, actionsOf } from './craft-rows.js';
import { recommend, recommendColour } from './craft-recommend.js';
import { STAMP_ATTRIBUTE, placeOf } from './stamp.js';

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
  // a picture, a video or a canvas paints to its corners; an SVG paints only its shapes, so it has a corner only when
  // it is given a fill, a border or a clip like any box (below)
  if (REPLACED.has(el.localName) && el.localName !== 'svg') return true;
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
    // a round child (a dot, a puck, a pill) has no corner of its own to follow the parent's: its curve is its shape
    if (drawnr >= Math.min(cr.width, cr.height) / 2 - 0.5) return [];
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
// how many tracks a grid draws along one direction: 'none' and a single size are one track
const tracks = (v) => (!v || v === 'none' ? 1 : v.replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean).length);
// the directions a container really places its children in: a grid with one column stacks them, whatever its column
// gap says; a flex row that wraps onto more lines uses its row gap too
function placedAxes(s) {
  if (/grid/.test(s.display)) {
    const out = [];
    if (tracks(s.gridTemplateColumns) > 1) out.push('x');
    if (tracks(s.gridTemplateRows) > 1) out.push('y');
    return out.length ? out : ['y'];
  }
  if (/flex/.test(s.display)) {
    const main = /column/.test(s.flexDirection) ? 'y' : 'x';
    return /wrap/.test(s.flexWrap) ? [main, main === 'x' ? 'y' : 'x'] : [main];
  }
  return [];
}

// #7. Inner spacing ≤ outer spacing: the gap inside a group is smaller than the gap between groups.
export const innerOuterSpacing = {
  id: 'craft/inner-outer-spacing', family: 'craft', number: [7], owns: ['gap'], once: 'ancestor', reads: ['style', 'kids', 'parent'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const axis = flowAxis(s);
    if (!axis) return [];
    let g = gapOf(s, axis);
    // a group's items: its elements and its bare words (<label>Date of birth<input /></label> is two things)
    const items = facts.kids(el).length + [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).length;
    if (g <= 0 || items < 2) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return [];
    const ps = facts.style(parent);
    const paxis = flowAxis(ps);
    if (!paxis) return [];
    // the same direction only: a row's gap between an avatar and its words is not the gap between the rows, and a
    // grid's column gutter is not the space between the sections stacked above and below it
    if (facts.kids(parent).length < 2) return [];
    const mine = placedAxes(s), theirs = placedAxes(ps);
    const along = mine.filter((a) => theirs.includes(a)).map((a) => ({ a, g: gapOf(s, a), G: gapOf(ps, a) }))
      // a gap of a pixel or two between groups is a drawn line (gap-px over a coloured ground), not space
      .filter((x) => x.g > 0 && x.G > 2 && x.g > x.G + T.min);
    if (!along.length) return [];
    const worst = along.reduce((p, q) => (q.g - q.G > p.g - p.G ? q : p));
    const G = worst.G;
    g = worst.g;
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
      evidence: { inner: g, outer: G, axis: worst.a }, confidence: 0.9, suggest,
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
    const near = theme.nearestColor(mixed, T.within, 'text');
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
    // a shape inside a drawing is placed in the drawing's own units and scaled with it: its fractions are the
    // drawing's, and the drawing itself is what lands on pixels or not
    if (el.ownerSVGElement) return [];
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
    // a glow (no offset) is light all round, not a lift: one soft blur is what it means; inside a picture it is its own
    if ((!l.x && !l.y) || inPicture(el, facts)) return [];
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
      const zero = (v) => v !== undefined && parseFloat(v) === 0;
      const tf = from.style.transform || '', sc = (from.style.scale || '').trim();
      const m2 = /scale\(\s*([-\d.]+)\s*(?:,\s*([-\d.]+))?\s*\)/.exec(tf), m3 = /scale3d\(\s*([-\d.]+)\s*,\s*([-\d.]+)/.exec(tf);
      const [sx, sy] = sc && sc !== 'none' ? sc.split(/\s+/) : [];
      const point = (m2 && zero(m2[1]) && zero(m2[2] ?? m2[1])) || (m3 && zero(m3[1]) && zero(m3[2])) || (sx !== undefined && zero(sx) && zero(sy ?? sx));
      if (!point) continue;
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
    // a box kept out of sight for screen readers (a 1px clipped announcer, as a select library draws) stacks over nothing
    { const r = facts.rect(el); if (r.width <= 2 || r.height <= 2) return []; }
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
    // a filled box that stops short of the column's far edge (a pill, a callout with a max width) is an object set in
    // the column, and objects line up by their edges; only a row that spans the column bleeds
    const columnRight = pr.right - px(ps.borderRightWidth) - px(ps.paddingRight);
    if (r.right < columnRight - 1) return [];
    // a strip holding its own drawn button (an install command and its Copy) is a component with an edge, like a field
    if ([...el.querySelectorAll('button, [role="button"], input')].some((b) => (rgb(facts.style(b).backgroundColor)?.[3] ?? 0) > 0 || px(facts.style(b).borderTopWidth) > 0)) return [];
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
// something you press, as the shared reading has it (roles.js): a link counts only when it is drawn as a button
const pressed = (el, facts) => { const k = controlKind(el, facts.style(el)); return k === 'button' || k === 'item'; };
// a button proper: what you press to make something happen, not to choose where you are (press feedback, its idiom)
const button = (el, facts) => controlKind(el, facts.style(el)) === 'button';
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
// The pictures drawn inside an element, with their boxes, found once per pass: every line of text asks this of each
// box above it, and the outer ones are the same for the whole page (asked afresh each time, it was half of all the
// time the checks took).
const picturesMemo = new WeakMap();
function picturesIn(facts, box) {
  let m = picturesMemo.get(facts);
  if (!m) picturesMemo.set(facts, (m = new Map()));
  let v = m.get(box);
  if (!v) m.set(box, (v = [...box.querySelectorAll('img, video, picture, canvas')].flatMap((el) => {
    const q = el.getBoundingClientRect(), ms = getComputedStyle(el);
    return q.width < 8 || q.height < 8 || ms.visibility === 'hidden' || ms.display === 'none' ? [] : [{ el, q }];
  })));
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
    if (!pressed(el, facts)) return [];
    if (!/[\p{L}\p{N}]/u.test(words(el))) return [];
    const b = facts.box(el), r = facts.rect(el), s = facts.style(el);
    if (r.height > T.maxHeight || b.pt < 2 || Math.abs(b.pt - b.pb) > 0.5 || Math.abs(b.pl - b.pr) > 0.5) return [];
    if (Math.abs(r.width - r.height) < 2 && px(s.borderTopLeftRadius) >= r.height / 2 - 1) return []; // a round button
    // side padding gives a drawn shape room around its words; a control drawn as words alone (a text tab) has no shape
    if ((rgb(s.backgroundColor)?.[3] ?? 0) === 0 && s.boxShadow === 'none' && px(s.borderLeftWidth) === 0 && px(s.borderTopWidth) === 0) return [];
    // as wide as the column it sits in: a row of a list (a question, a menu item), not a button sized by its words
    const host = el.parentElement;
    if (host && host !== document.body) {
      const hr = facts.rect(host), hb = facts.box(host);
      if (r.width >= hr.width - hb.pl - hb.pr - hb.bl - hb.br - 1) return [];
    }
    if (b.pl / b.pt >= T.ratio) return [];
    const want = b.pt * T.want.ratio;
    const cls = utility(el, 'px') ?? utility(el, 'p', { not: /^[trblxyse](?:-|$)/ });
    // the sides: a step at least the ratio asks, nearest twice the top; with `p-` the top keeps its own step
    const sides = recommend({ family: 'spacing', prefix: 'px', job: 'button', want: { min: b.pt * T.ratio, target: want }, round: 'up', from: cls ?? '', token: false, sets: (v) => ({ paddingLeft: v, paddingRight: v }), theme });
    const top = cls?.startsWith('p-') ? recommend({ family: 'spacing', prefix: 'py', job: 'button', want: { min: b.pt - 0.5, max: b.pt + 0.5, target: b.pt }, from: '', token: false, sets: (v) => ({ paddingTop: v, paddingBottom: v }), theme }) : null;
    const to = sides.kind === 'class' ? `${sides.to}${top?.kind === 'class' ? ` ${top.to}` : ''}` : null;
    const sets = { ...(sides.sets ?? { paddingLeft: want, paddingRight: want }), ...(top?.kind === 'class' ? top.sets : {}) };
    return [{
      ...say(this.id, { side: b.pl, top: b.pt }),
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
    if (!pressed(el, facts)) return [];
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
// Words drawn in an SVG are sized in the drawing's own units: a 48-unit label in a drawing shown at a quarter of its
// size is 12px on the screen. The scale the drawing is shown at, 1 for words laid out by the page.
const drawnScale = (el) => {
  if (typeof SVGGraphicsElement === 'undefined' || !(el instanceof SVGGraphicsElement)) return 1;
  const m = el.getScreenCTM?.();
  return m ? Math.hypot(m.a, m.b) || 1 : 1;
};
// A picture drawn on the page: a canvas laid out in its own units and scaled as one to fit, like a film frame, a phone
// mock or a page shown as a thumbnail. What is inside follows that picture's design (its type, greys, strokes, shadows),
// not the page's, so the checks that hold the page to its own system leave it alone. A canvas is a box with a container
// of its own (sized in cqw) that is scaled, or any box scaled down or up by a third or more; a hover's 1.05 is not one
export const inPicture = (el, facts) => {
  for (let n = el?.parentElement; n && n !== document.body; n = n.parentElement) {
    const s = facts.style(n);
    if (!s.transform || s.transform === 'none') continue;
    const m = s.transform.match(/matrix\(([^,]+),\s*([^,]+)/), k = m ? Math.hypot(parseFloat(m[1]), parseFloat(m[2])) : 1;
    if ((s.containerType && s.containerType !== 'normal' && Math.abs(k - 1) > 0.02) || k <= 0.75 || k >= 1.33) return true;
  }
  return false;
};
// words that hold no letter or figure: a separator dot, a dash, a slash. Nothing to read, so no contrast or weight to judge
// A key named on a keycap (<kbd>/</kbd>) is read, however short
export const marksOnly = (el) => !el.closest('kbd') && !el.querySelector('kbd') && !/[\p{L}\p{N}]/u.test(el.textContent ?? '');
export const leading = {
  id: 'craft/leading', family: 'craft', number: [14], owns: ['line-height'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el)) return [];
    // words in a drawing have no line boxes: SVG text is placed line by line by hand, and line-height does nothing
    if (el.closest('svg') || inPicture(el, facts)) return [];
    const s = facts.style(el), fs = px(s.fontSize), lh = px(s.lineHeight);
    if (!lh || !fs || s.visibility === 'hidden') return [];
    const ratio = lh / fs, lines = lineCount(el);
    // one line placed out of the flow: its line height moves nothing around it, and centring by translate keeps it put
    if (lines <= 1 && /absolute|fixed/.test(s.position)) return [];
    // a size written as a zoom of a design size (`text-[length:calc(var(--z)*15px)]`, a scaled mockup) is that design
    // size: 15px body text drawn at 2.4×, not 36px display text
    const designed = scaledSize(el) ?? fs;
    const big = designed >= T.large && ratio > T.loose && lines >= 1;
    const cramped = fs <= T.small && ratio < T.tight && lines >= 3;
    if (!big && !cramped) return [];
    const cls = utility(el, 'leading');
    const want = big ? T.want.display : T.want.body;
    return [{
      ...say(this.id, { big, size: fs, ratio: ratio.toFixed(2) }),
      key: `${this.id}@${big ? 'loose' : 'tight'}`, text: cls ?? 'line-height', props: ['line-height'], value: ratio.toFixed(2), n: ratio,
      evidence: { fontSize: fs, lineHeight: lh, ratio, lines }, confidence: 0.83,
      suggest: recommend({ family: 'leading', prefix: 'leading', job: big ? 'display' : 'body', want: { ...want, of: fs }, from: cls ?? '', sets: (v) => ({ lineHeight: v * fs }), theme,
        label: big ? 'big text wants' : 'body text wants', advice: (v) => `Use a line height of ${v} here.` }),
    }];
  },
};

// #15. Tighten large type; space out small capitals.
export const tracking = {
  id: 'craft/tracking', family: 'craft', number: [15], owns: ['letter-spacing'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el)) return [];
    // judged at the size a person sees: words in a drawing are scaled with it, and so is their spacing
    const s = facts.style(el), k = drawnScale(el), fs = px(s.fontSize) * k;
    const ls = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing) * k;
    const caps = s.textTransform === 'uppercase' && fs <= T.caps && ls / fs < 0.02;
    // capitals are spaced out at every size; only big lowercase text is tightened
    const large = fs >= T.large && ls > 0 && s.textTransform !== 'uppercase' && /[a-z]/.test(words(el));
    if (!caps && !large) return [];
    const cls = utility(el, 'tracking');
    const want = caps ? T.want.caps : T.want.display;
    return [{
      ...say(this.id, { caps, size: fs }),
      key: `${this.id}@${caps ? 'caps' : 'large'}`, text: cls ?? 'letter-spacing', props: ['letter-spacing'], value: s.letterSpacing, n: ls,
      evidence: { fontSize: fs, letterSpacing: ls, uppercase: s.textTransform === 'uppercase' }, confidence: 0.84,
      suggest: recommend({ family: 'tracking', prefix: 'tracking', job: caps ? 'caps' : 'display', want: { ...want, of: fs }, from: cls ?? '', sets: (v) => ({ letterSpacing: v * fs / k }), theme,
        label: caps ? 'small capitals need' : 'big text wants', advice: (v) => `Use ${v}em of letter spacing here.` }),
    }];
  },
};

// #16. Tabular numbers where numbers line up: a column of figures in a table, or down the rows of a list, and a
// number that changes in place (a running timer, a live counter), whose width jumps with every tick in proportional figures.
export const tabularNums = {
  id: 'craft/tabular-nums', family: 'craft', number: [16], owns: ['font-features'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const cell = el.matches('td, th, [role="cell"], [role="gridcell"]');
    // a number that ticks: the page rewrote its words while plumber watched, or it says it is a timer
    const ticking = !cell && !el.children.length && (ticks(el) >= 2 || !!el.closest('[role="timer"]'));
    // a figure on its own in a row of a list (a timesheet's durations, an order list's totals) stacks just like a cell
    if (!cell && !ticking && (el.children.length || !el.closest('li, [role="listitem"]'))) return [];
    const text = words(el);
    if (!/^[\s$€£¥₹+\-−–.,:%()\d]+$/.test(text) || (text.match(/\d/g) ?? []).length < 2) return [];
    // a figure that stacks needs enough rows to stack in; one that ticks wobbles on its own
    if (cell) {
      const table = el.closest('table, [role="table"], [role="grid"]');
      if (!table || rowsOf(facts, table) < T.rows) return [];
    } else if (!ticking) {
      const row = el.closest('li, [role="listitem"]'), list = row.parentElement;
      if (!list || list.children.length < T.rows) return [];
      // it stacks only when the other rows hold figures in its column: a clock in a picture inside one row doesn't
      const me = facts.rect(el), figure = /^[\s$€£¥₹+\-−–.,:%()\d]+$/;
      const stacked = [...list.children].filter((li) => li !== row && [...li.querySelectorAll('*')].some((n) => !n.children.length
        && /\d/.test(n.textContent) && figure.test(n.textContent.trim())
        && (Math.abs(facts.rect(n).right - me.right) < 2 || Math.abs(facts.rect(n).left - me.left) < 2))).length;
      if (stacked < T.rows - 1) return [];
    }
    const s = facts.style(el);
    if (/tabular-nums/.test(s.fontVariantNumeric) || /"tnum"/.test(s.fontFeatureSettings)) return [];
    if (/mono/i.test(s.fontFamily)) return [];
    return [{
      ...say(this.id, { ticking }),
      key: this.id, text: 'font-variant-numeric', props: ['font-variant-numeric'], value: s.fontVariantNumeric, n: 0,
      evidence: { text, ticking }, confidence: 0.88,
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
    if (!facts.text(el) || el.closest('[aria-hidden="true"]') || marksOnly(el) || inPicture(el, facts)) return [];
    const s = facts.style(el);
    // words kept for a screen reader and cut out of sight (sr-only: a box of a pixel or two, clipped by overflow or by
    // clip-path) are not drawn, so there is nothing to read
    { const r = el.getBoundingClientRect(); if (r.width <= 2 && r.height <= 2 && (s.overflow !== 'visible' || s.clipPath !== 'none')) return []; }
    // words on a picture: a background image on the way up, or a photo laid under them (an <img> the words sit over, as
    // on a card with a scrim). What the eye reads them against isn't a colour plumber knows, so it says nothing. A picture
    // counts when it is drawn, visible, and covers most of the words' box
    const box = el.getBoundingClientRect(), under = ({ q }) => {
      const w = Math.min(q.right, box.right) - Math.max(q.left, box.left), h = Math.min(q.bottom, box.bottom) - Math.max(q.top, box.top);
      return w > 0 && h > 0 && w * h >= box.width * box.height * 0.5;
    };
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const ns = facts.style(n);
      if (ns.backgroundImage !== 'none') return [];
      if (n !== el && picturesIn(facts, n).some((m) => !el.contains(m.el) && under(m))) return [];
      if (alpha(rgb(ns.backgroundColor)) > 0.5) break;
    }
    // the ink as drawn: a fill colour of its own, or none when a gradient paints the words (nothing one colour to judge)
    const ink = inkCss(el, s), ground = facts.ground(el), c = ink && rgb(ink);
    if (!c || alpha(c) === 0) return [];
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

// Words follow their ground (a plain check, no number). A layer that slides, grows or fades in behind words (a slide's
// trail, a hold's fill, a progress bar under a label, a highlight that sweeps across) takes their contrast with it: the
// words were chosen for the surface at rest, and where the layer passes they sit on another colour. Plumber's contrast
// rule reads the ground up the words' own parents and can't see a sibling layer, so this one looks at what is actually
// painted at each part of the words: the positioned, moved or clipped boxes that overlap them, cut to what is visible of
// each (its clip-path and the clipping boxes above it), below the words or over them, in strips 4px wide. Strips that
// read under the contrast floor, or are covered, in a run at least 8px wide, fail.
// (Found on beUI's slide-to-commit and others, 2026-11-20: the trail passes under black words and they stay black.)
const LAYERS = new WeakMap();
// the layers that could pass under words: from the page's list of elements when the runner gives one, else from the
// words' own neighbourhood (their ancestor three levels up), which is where a trail, a fill or a highlight lives
function layersOf(facts, el) {
  const scope = facts.items ? facts : (() => { let a = el; for (let i = 0; i < 3 && a.parentElement; i++) a = a.parentElement; return a; })();
  // one pass over the page: the overlay's facts live for the whole visit, and layers move (a trail that was empty at rest
  // fills while a gesture is held), so a list kept longer than a pass judged the held state with the resting layers
  const kept = LAYERS.get(scope);
  if (kept && performance.now() - kept.at < 50) return kept.all;
  let all = [];
  // layers move (that is what this rule is about), so they are read live from the page, not from facts kept for the
  // visit: the overlay's facts are cached across passes, and a trail read at rest stayed empty while a gesture was held
  // what is seen of a box: cut by every clipping box above it and by its own and its parents' clip-path insets
  const seen = (e) => {
    const r0 = e.getBoundingClientRect(); let b = { l: r0.left, r: r0.right, t: r0.top, b: r0.bottom };
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n), c = n.getBoundingClientRect();
      if (n !== e && cs.overflow !== 'visible') b = { l: Math.max(b.l, c.left), r: Math.min(b.r, c.right), t: Math.max(b.t, c.top), b: Math.min(b.b, c.bottom) };
      const m = /^inset\(([^)]*)\)/.exec(cs.clipPath);
      if (m) { const v = m[1].replace(/round.*/, '').trim().split(/\s+/), [T, R, B, L] = [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]];
        const d = (x, size) => (x.endsWith('%') ? parseFloat(x) / 100 * size : parseFloat(x) || 0);
        b = { l: Math.max(b.l, c.left + d(L, c.width)), r: Math.min(b.r, c.right - d(R, c.width)), t: Math.max(b.t, c.top + d(T, c.height)), b: Math.min(b.b, c.bottom - d(B, c.height)) }; }
    }
    return b.r - b.l > 1 && b.b - b.t > 1 ? b : null;
  };
  for (const e of facts.items ?? scope.querySelectorAll('*')) {
    if (!e.isConnected) continue;
    const cs = getComputedStyle(e), bg = rgb(cs.backgroundColor);
    if (!bg || bg[3] * (parseFloat(cs.opacity) || 0) < 0.5) continue;
    // a layer is placed or moved, not laid out in the flow beside the words
    if (!/^(absolute|fixed|sticky)$/.test(cs.position) && cs.transform === 'none' && cs.clipPath === 'none') continue;
    const v = seen(e); if (v) all.push({ el: e, v, bg, z: zOf(e, facts), pos: cs.position !== 'static' });
  }
  LAYERS.set(scope, { all, at: performance.now() });
  return all;
}
// stacking, roughly: a positioned box's z-index (auto counts as 0), else its nearest positioned parent's
function zOf(e, facts) { for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.position !== 'static') return parseInt(cs.zIndex, 10) || 0; } return -Infinity; }
export const wordsOnLayers = {
  id: 'craft/words-on-layers', family: 'craft', number: [], owns: ['color'], once: 'element', refines: ['craft/contrast'], reads: ['style', 'text', 'rect'],
  check({ el, facts }, theme) {
    // words hidden from a screen reader are still read by everyone who sees them (a slide's label, its name on the thumb)
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').trim();
    if (!facts.text(el) || !/\p{L}{2}/u.test(own)) return [];
    const s = getComputedStyle(el), c = rgb(s.color); if (!c) return [];
    let fade = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) fade *= parseFloat(getComputedStyle(n).opacity) || 0;
    if (fade < 0.05) return []; // not shown: there is nothing to read
    // words clipped out of sight (a screen reader's hint in a 1px box) aren't drawn
    for (let n = el; n && n !== document.body; n = n.parentElement) { const r = n.getBoundingClientRect(), ns = getComputedStyle(n); if ((ns.overflow !== 'visible' || ns.clipPath !== 'none') && (r.width <= 2 || r.height <= 2)) return []; }
    const lines = [], range = document.createRange();
    for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.nodeValue.trim()) continue; range.selectNodeContents(n); for (const q of range.getClientRects()) if (q.width > 2 && q.height > 2) lines.push(q); }
    if (!lines.length) return [];
    // a layer that carries the same words is the second-copy technique (the words redrawn in the layer's own ink and
    // clipped by it): over it, the copy's words are what is read, and they are judged as their own element
    const ownText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').trim();
    const copy = (L) => [...L.el.querySelectorAll('*')].concat(L.el).some((e) => e !== el && ownText(e) === own);
    const layers = layersOf(facts, el).filter((L) => L.el !== el && !L.el.contains(el) && !el.contains(L.el) && lines.some((q) => L.v.r > q.left && L.v.l < q.right && L.v.b > q.top && L.v.t < q.bottom));
    if (!layers.length) return [];
    const T = theme.spec('craft/contrast'), fs = px(s.fontSize), w = parseInt(s.fontWeight, 10) || 400;
    const need = fs >= T.largeAt || fs >= T.boldLargeAt && w >= T.boldWeight ? T.large : fs >= T.boldAt && w >= T.boldWeight ? T.bold : T.small;
    const base = facts.ground(el), mine = zOf(el, facts), positioned = mine !== -Infinity;
    // a layer is over the words when it stacks higher, or when it is placed and the words are in the flow
    const above = (L) => (positioned ? L.z > mine || (L.z === mine && !!(el.compareDocumentPosition(L.el) & Node.DOCUMENT_POSITION_FOLLOWING)) : L.pos && L.z >= 0);
    let bad = 0, onLayer = 0, all = 0, worst = Infinity, covered = 0, what = null, run = 0, longest = 0;
    // where the words fail, as stretches of each line on screen (merged 4px strips), for a picture of the fault
    const spans = [];
    const mark = (x, q) => { const last = spans.at(-1); if (last && last[1] === q.top && Math.abs(last[0] + last[2] - x) < 0.5) last[2] += 4; else spans.push([x, q.top, 4, q.height]); };
    for (const q of lines) for (let x = q.left; x < q.right; x += 4) {
      all++;
      const mid = x + 2, hit = layers.filter((L) => L.v.l <= mid && L.v.r >= mid && Math.min(L.v.b, q.bottom) - Math.max(L.v.t, q.top) >= q.height * 0.6);
      const top = hit.sort((a, b) => a.z - b.z || (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).at(-1);
      let fail = false;
      if (top && above(top)) { if (!copy(top)) { fail = true; covered++; onLayer++; what ??= top.el; } }
      else { const ground = (top ? hit.filter((L) => !above(L)).at(-1)?.bg : null) ?? base; const lc = Math.abs(apca(over([c[0], c[1], c[2], alpha(c) * fade], ground), ground)); if (lc < need) { fail = true; worst = Math.min(worst, lc); if (top) { what ??= top.el; onLayer++; } } }
      if (fail) { bad++; run += 4; longest = Math.max(longest, run); mark(x, q); } else run = 0;
    }
    // only a layer's doing counts here: words that fail on their own ground are the contrast rule's finding
    if (longest < 8 || !what) return [];
    // the layer's share of the words, and whether the words also fail where no layer is (faded, or wrong for their ground)
    const share = Math.round((onLayer / all) * 100), elsewhere = bad > onLayer;
    // the layer by its role, as a person would name it
    // a pressable thing sliding over the words is the slide's thumb, whatever its class says
    const cls = (what.getAttribute('class') ?? '').toLowerCase(), role = /thumb|knob|handle/.test(cls) || what.matches('button, [role=button], [role=slider], [draggable=true]') ? 'thumb' : /trail|progress/.test(cls) ? 'trail' : /highlight|sheen|shine/.test(cls) ? 'highlight' : /overlay|scrim/.test(cls) ? 'overlay' : 'fill';
    return [{
      ...say(this.id, { share, lc: worst === Infinity ? null : Math.floor(worst), need, covered: covered > onLayer / 2, what: role, elsewhere, fade: Math.round(fade * 100) }),
      key: this.id, text: colourClass(el, 'text', theme) ?? 'color', props: ['color'], value: `${share}%`, n: share,
      evidence: { share, worstLc: worst === Infinity ? null : Math.floor(worst), need, covered, color: hex(c), layer: role, fade: Math.round(fade * 100), elsewhere, spans: spans.map((r) => r.map((n) => Math.round(n * 10) / 10)) }, confidence: 0.8,
      suggest: { kind: 'advice', text: covered > onLayer / 2 ? 'Put the words above the layer, or move the layer out from under them.' : 'Flip the words to the layer’s own ink exactly at its edge (a second copy of them, clipped by the layer), or fade them out before the layer reaches them.' },
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
    if (!el.matches(':disabled, [aria-disabled="true"]') || !(controlKind(el, facts.style(el)) || el.matches('a'))) return [];
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
    // a control, or a link standing alone; a link in a sentence is as tall as its line, and that is right (WCAG 2.5.8,
    // the inline exception: roles.js)
    // asked only of links and controls: roleOf looks inside a box, which is too dear for every element
    if (!el.matches('a[href]') && !controlKind(el, facts.style(el))) return [];
    const job = roleOf(el, facts.style(el));
    if (!(job.role === 'control' && job.kind !== 'group' || job.role === 'link' && job.kind === 'nav') || disabled(el)) return [];
    if (el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) return []; // its label is the target
    const T = theme.spec(this.id);
    const r = facts.rect(el), { min, long } = T;
    // a field drawn by the box around it (a select's search input, 4px wide while empty): the drawn box is what is pressed
    if (el.matches('input, textarea')) {
      for (let p = el.parentElement, d = 0; p && d < 4; p = p.parentElement, d++) {
        const ps = facts.style(p), pr = facts.rect(p);
        const drawnBox = (rgb(ps.backgroundColor)?.[3] ?? 0) > 0 || px(ps.borderTopWidth) > 0 || ps.boxShadow !== 'none';
        if (drawnBox && pr.width >= min && pr.height >= min) return [];
      }
    }
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
    // pulled tall by its row (no height of its own, in a stretching flex row): the cause is the row, and image-stretch says so
    if (shows && stretch < 1 && !utility(el, 'h', { not: /^(?:auto|fit|min|max)$/ }) && !utility(el, 'size') && !utility(el, 'aspect') && el.parentElement) {
      const rs = facts.style(el.parentElement), al = /^(?:auto|normal)$/.test(s.alignSelf) ? rs.alignItems : s.alignSelf;
      if (/flex/.test(rs.display) && !/column/.test(rs.flexDirection) && /^(?:normal|stretch)$/.test(al)) return [];
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
    const flexRow = (box) => { const bs = facts.style(box); return /flex/.test(bs.display) && !/column/.test(bs.flexDirection); };
    const isGrid = (box) => /grid/.test(facts.style(box).display);
    // a grid cell has the same floor as a flex item: never narrower than its content unless told it may be
    // (defensivecss.dev "Minimum Content Size In CSS grid")
    const grid = isGrid(row);
    if (!grid && (!flexRow(row) || facts.style(row).flexWrap !== 'nowrap')) return [];
    const s = facts.style(el);
    // an item that may not shrink, or that clips, is not held open by its content
    if (s.minWidth !== 'auto' || s.overflowX !== 'visible' || (!grid && s.flexShrink === '0') || s.position === 'absolute' || s.position === 'fixed') return [];
    // how far it runs past: a flex row's own overflow; in a grid, the cell's box past the grid's content box
    let over;
    if (grid) {
      const rb = row.getBoundingClientRect(), eb = el.getBoundingClientRect(), k = rb.width / (row.offsetWidth || rb.width) || 1, rs = facts.style(row);
      over = Math.max(0, Math.round((eb.right - rb.right) / k + px(rs.paddingRight) + px(rs.borderRightWidth)));
    } else over = Math.max(0, row.scrollWidth - row.clientWidth);
    // the item a thing sits in: the nearest one, never a box further out that it merely spills from
    const itemOf = (t) => { for (let n = t; n && n.parentElement; n = n.parentElement) if (flexRow(n.parentElement) || isGrid(n.parentElement)) return n; return null; };
    // the cause: something in this item that is meant to give way (a line set to cut off, a part set to scroll
    // sideways) and never can, or a line that may not wrap and is pushing out now
    let scrolls = false;
    const held = [...el.querySelectorAll('*')].slice(0, T.depth).some((t) => {
      // a part that scrolls sideways holds its item open only if it can grow: one given its own width (a w-64 column of
      // tabs set to overflow-scroll for up and down) never does (cal.com's event setup, 2026-11-26)
      const ts = facts.style(t), cut = ts.textOverflow === 'ellipsis';
      const scroller = /^(?:auto|scroll)$/.test(ts.overflowX) && !(utility(t, 'w', { not: /^(?:auto|fit|min|max|full)$/ }) || utility(t, 'size'));
      if (!(cut || scroller || (over > T.over && ts.whiteSpace === 'nowrap')) || itemOf(t) !== el) return false;
      scrolls = scroller && !cut;
      return true;
    });
    if (!held) return [];
    // an item given its own width is never held wider than that width: its floor is the smaller of the two. Until the
    // row runs over, there is nothing waiting to break
    if (over <= T.over && (utility(el, 'w', { not: /^(?:auto|fit|min|max|full)$/ }) || utility(el, 'size') || utility(el, 'basis', { not: /^auto$/ }))) return [];
    // a grid column written to go down to nothing (minmax(0, …), which is what Tailwind's grid-cols-2 means) already
    // lets its cell shrink; only a column sized by its content is waiting to break
    if (grid && over <= T.over && classesOf(row).split(/\s+/).some((c) => /(?:^|:)grid-cols-(?:\d+$|.*minmax\(0)/.test(c))) return [];
    return [{
      ...say(this.id, { over: over > T.over ? over : 0, scrolls, grid }),
      key: this.id, text: utility(el, 'min-w') ?? 'min-width', props: ['min-width'], value: 'auto', n: over,
      evidence: { over, row: row.clientWidth, grid, scrolls }, confidence: over > T.over ? 0.9 : 0.84,
      suggest: { kind: 'class', from: utility(el, 'min-w') ?? '', to: 'min-w-0', why: scrolls ? 'lets this part shrink, so what is inside scrolls instead of pushing out' : 'lets this part shrink, so its text is cut off instead of pushing the row out', sets: { minWidth: 0 }, moves: true },
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

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A sticky thing that
// can never stick: a sticky element moves only inside its parent's box, and a grid or flex item is stretched to its
// row's full height unless told otherwise, so it has no room to move and scrolls away with the page. Read from what
// is measured, with no threshold of its own: sticky, in a grid or a flex row, nothing setting its alignment or its
// height, and its box taller than its own content (the row made it so). (defensivecss.dev "Position sticky with CSS Grid".)
export const stickyRoom = {
  id: 'craft/sticky-room', family: 'craft', number: [], owns: ['align'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    const s = facts.style(el);
    if (s.position !== 'sticky') return [];
    const row = el.parentElement;
    if (!row) return [];
    const rs = facts.style(row), grid = /grid/.test(rs.display), flexRow = /flex/.test(rs.display) && !/column/.test(rs.flexDirection);
    if (!grid && !flexRow) return [];
    // its own alignment, or the row's when it has none: anything but the default lets it keep its own height
    const align = /^(?:auto|normal)$/.test(s.alignSelf) ? rs.alignItems : s.alignSelf;
    if (!/^(?:normal|stretch)$/.test(align)) return [];
    if (utility(el, 'h', { not: /^(?:auto|fit|min|max)$/ }) || utility(el, 'size')) return [];
    const box = el.getBoundingClientRect();
    if (box.height <= 0 || !el.childNodes.length) return [];
    const range = document.createRange();
    range.selectNodeContents(el);
    const inner = range.getBoundingClientRect(), k = box.height / (el.offsetHeight || box.height);
    const own = inner.height + (px(s.paddingTop) + px(s.paddingBottom) + px(s.borderTopWidth) + px(s.borderBottomWidth)) * k;
    const spare = Math.round((box.height - own) / k);
    if (spare <= 1) return []; // as tall as its content: nothing stretched it (one pixel for rounding)
    return [{
      ...say(this.id, { spare }),
      key: this.id, text: utility(el, 'self') ?? 'align-self', props: ['align-self'], value: 'stretch', n: spare,
      evidence: { spare, box: Math.round(box.height / k), content: Math.round(own / k) }, confidence: 0.9,
      suggest: { kind: 'class', from: utility(el, 'self') ?? '', to: 'self-start', why: 'lets it keep its own height, so it has room to stick as the page scrolls', sets: { alignSelf: 'start' }, moves: true },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A box that holds text
// sets its least height, never its exact height: text grows downward with a longer sentence or a narrower screen, and
// a set height leaves it running out of the box. Read from what is measured: a height class on a box whose text
// already wraps (so it will wrap further), nothing said about overflow, and not a control, a picture or a scroll area.
// The fix keeps the height as the least. (defensivecss.dev "Fixed sizes"; MDN min-height.)
export const fixedHeight = {
  id: 'craft/fixed-height', family: 'craft', number: [], owns: ['size'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    // the height as written: a step, a length or the screen's; never the parent's (h-full), a share of it, or the content's
    const cls = utility(el, 'h', { not: /^(?:auto|fit|min|max|full|px|\d+\/\d+)$/ });
    if (!cls || /^(?:img|svg|canvas|video|picture|iframe|textarea|input|select|button|pre|table)$/.test(el.localName)) return [];
    if (el.matches('a, summary, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [contenteditable="true"]')) return [];
    const s = facts.style(el);
    if (s.overflowY !== 'visible' || s.display === 'none' || s.position === 'fixed' || /inline$/.test(s.display)) return [];
    if (px(s.minHeight) >= el.offsetHeight - 1 && px(s.minHeight) > 0) return []; // already a least height
    // text that wraps: a line of words in here already runs to a second line, so a longer one runs to a third
    const wraps = [el, ...el.querySelectorAll('*')].slice(0, T.depth).some((t) => facts.text(t) && facts.style(t).whiteSpace !== 'nowrap' && !controlAround(t) && lineCount(t) >= 2);
    if (!wraps) return [];
    const over = Math.max(0, el.scrollHeight - el.clientHeight);
    const shows = over > 1;
    return [{
      ...say(this.id, { over: shows ? over : 0 }),
      key: this.id, text: cls, props: ['height'], value: s.height, n: over,
      evidence: { over, height: el.offsetHeight }, confidence: shows ? 0.9 : 0.84,
      suggest: { kind: 'class', from: cls, to: `min-${cls}`, why: 'keeps this height as the least, and lets the box grow with its text', sets: { height: 'auto', minHeight: `${el.offsetHeight}px` }, moves: true },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A scrollbar says
// "there is more". `overflow: scroll` draws one whether or not anything overflows (MDN overflow); on Windows, and on a
// Mac set to always show scrollbars, the reader sees an empty track beside short content. `auto` draws it only when
// there is more. The page itself is left alone: `overflow-y: scroll` on it is an old way to stop the layout moving when
// a scrollbar arrives. (defensivecss.dev "Scrollbars on demand".)
export const scrollOnDemand = {
  id: 'craft/scroll-on-demand', family: 'craft', number: [], owns: ['scroll'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el);
    // only a scrollbar the page draws: one hidden by the page (no-scrollbar, scrollbar-width: none) takes no room, which
    // is measured as the box's border edge less its inner width (cal.com's side tabs, 2026-11-26)
    const drawn = { y: el.offsetWidth - el.clientWidth - px(s.borderLeftWidth) - px(s.borderRightWidth) > 0, x: el.offsetHeight - el.clientHeight - px(s.borderTopWidth) - px(s.borderBottomWidth) > 0 };
    const axes = [['y', s.overflowY, el.scrollHeight - el.clientHeight], ['x', s.overflowX, el.scrollWidth - el.clientWidth]].filter(([a, v]) => v === 'scroll' && drawn[a]);
    if (!axes.length || s.display === 'none' || el.clientWidth <= 0 || el.clientHeight <= 0) return [];
    // the class that says it: overflow-y-scroll, overflow-x-scroll or overflow-scroll
    const cls = ['overflow-y', 'overflow-x', 'overflow'].map((p) => utility(el, p)).find((c) => c && /(?:^|-)scroll$/.test(c));
    const empty = axes.some(([, , more]) => more <= 1); // an axis with nothing to scroll today shows an empty track now
    const to = cls ? cls.replace(/scroll$/, 'auto') : 'overflow-auto';
    return [{
      ...say(this.id, { empty }),
      key: this.id, text: cls ?? 'overflow', props: axes.map(([a]) => `overflow-${a}`), value: 'scroll', n: axes.length,
      evidence: { axes: axes.map(([a, , more]) => [a, Math.max(0, more)]) }, confidence: empty ? 0.9 : 0.82,
      suggest: { kind: 'class', from: cls ?? '', to, why: 'shows the scrollbar only when there is more to scroll', sets: Object.fromEntries(axes.map(([a]) => [a === 'y' ? 'overflowY' : 'overflowX', 'auto'])) },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). The distance between
// neighbours is a decision. A row whose parts are kept apart only by left-over space (justify-between, or a part
// pushed over with ml-auto) and no gap has none: with a longer title, a translated label or a narrower screen they run
// into each other. Read from what is measured: a flex row, no column gap, its parts spread by the left-over space,
// none of them holding a margin of its own toward its neighbour, and at least one holding words (the part that grows).
// The gap is a single decision from the project: the gap of the nearest layout around it that declares one, else the
// row's own side padding, else the theme's step nearest the row's text size (an invented fallback, to be tuned).
// (defensivecss.dev "Component spacing", "Using space-between".)
// The line of code that draws an element (file:line:column). A part that is the root of a component (a Link) carries the
// component's own line, the same for every Link anywhere: its place is the line that uses the component, read from
// React's tree. Parts with one such line are drawn by one map over data: a list.
const drawnAt = (k) => {
  const key = Object.keys(k).find((x) => x.startsWith('__reactFiber$'));
  for (let f = key ? k[key]?.return : null, n = 0; f && n < 12; f = f.return, n++) {
    if (typeof f.type === 'string') break; // another element in between: this part is not a component's root
    const used = f.memoizedProps?.[STAMP_ATTRIBUTE];
    if (typeof used === 'string') return used.replace(/#.*$/, '');
  }
  return (placeOf(k) ?? '');
};

export const declaredGap = {
  id: 'craft/declared-gap', family: 'craft', number: [], owns: ['gap'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const s = facts.style(el);
    if (!/flex/.test(s.display) || /column/.test(s.flexDirection)) return [];
    const kids = [...el.children].filter((k) => { const ks = facts.style(k); return ks.display !== 'none' && !/^(?:absolute|fixed)$/.test(ks.position) && k.getClientRects().length; });
    if (kids.length < 2) return [];
    // the gap this row should declare: never less than the distance inside its own parts (outer at least inner: a group
    // sits further from its neighbour than its own items sit from each other); else the gap of the layout around it;
    // else half its text size (invented, tuned on crafting-ui: a full em pushed a 106px row's count off it). On the
    // theme's spacing scale, else Tailwind's 4px steps
    const gapFor = () => {
      let want = 0, from = '';
      for (const k of kids) for (const n of [k, ...k.querySelectorAll('*')].slice(0, 30)) { const ns = facts.style(n); if (/flex|grid/.test(ns.display) && !/column/.test(ns.flexDirection) && px(ns.columnGap) > want) { want = px(ns.columnGap); from = 'inside'; } }
      for (let n = el.parentElement, d = 0; n && d < 6 && !want; n = n.parentElement, d++) { const ns = facts.style(n); if (/flex|grid/.test(ns.display) && px(ns.columnGap) > 0) { want = px(ns.columnGap); from = 'around'; } }
      if (!want) { want = (px(s.fontSize) || 16) / 2; from = 'text'; }
      const step = theme.nearest('spacing', want, Math.max(2, want * 0.25));
      const four = Math.max(0.5, Math.round((want / 4) * 2) / 2);
      return { cls: step ? `gap-${step.short}` : `gap-${four}`, px: step?.px ?? four * 4, from };
    };
    // Second form (defensivecss.dev "Using space-between"): a list drawn from data, set to wrap, spread by the left-over
    // space. Each line's spacing then depends on how many items it holds: a last line with fewer is flung to the edges,
    // out of line with the columns above, and a gap does not stop it. Read: wrapping, spread, three or more parts drawn
    // by one line of code. Broken now when it already runs to a second line that holds fewer than the first.
    const spreadAll = /^(?:space-between|space-around|space-evenly)$/.test(s.justifyContent);
    if (spreadAll && s.flexWrap !== 'nowrap' && kids.length >= 3 && !el.closest('[aria-hidden="true"]')) {
      const stamp = drawnAt(kids[0]);
      if (stamp && kids.every((k) => drawnAt(k) === stamp)) {
        const lines = [];
        for (const k of kids) { const top = Math.round(k.getBoundingClientRect().top); const line = lines.find((l) => Math.abs(l.top - top) <= 2); if (line) line.n++; else lines.push({ top, n: 1 }); }
        lines.sort((a, b) => a.top - b.top);
        const ragged = lines.length > 1 && lines.at(-1).n < lines[0].n && lines.at(-1).n >= (s.justifyContent === 'space-between' ? 2 : 1);
        const gap = px(s.columnGap) > 0 ? null : gapFor();
        const to = gap ? `justify-start ${gap.cls}` : 'justify-start';
        return [{
          ...say(this.id, { list: true, ragged, n: kids.length, last: lines.at(-1).n, first: lines[0].n }),
          key: this.id, text: utility(el, 'justify') ?? 'justify-content', props: ['justify-content'], value: s.justifyContent, n: kids.length,
          evidence: { parts: kids.length, lines: lines.map((l) => l.n), stamp, gap: gap?.px ?? px(s.columnGap) }, confidence: ragged ? 0.9 : 0.84,
          suggest: { kind: 'class', from: utility(el, 'justify') ?? '', to, why: 'keeps the same distance between items on every line, however many each holds', sets: { justifyContent: 'flex-start', ...(gap ? { columnGap: gap.px } : {}) }, moves: true },
        }];
      }
    }
    if (px(s.columnGap) > 0) return [];
    const spread = /^(?:space-between|space-around|space-evenly)$/.test(s.justifyContent);
    const pushed = kids.some((k, n) => { const ks = facts.style(k); return (n > 0 && ks.marginLeft === 'auto') || (n < kids.length - 1 && ks.marginRight === 'auto'); });
    if (!spread && !pushed) return [];
    // a margin of their own between neighbours is a declared distance
    if (kids.some((k, n) => { const ks = facts.style(k); return (n > 0 && ks.marginLeft !== 'auto' && px(ks.marginLeft) > 0) || (n < kids.length - 1 && ks.marginRight !== 'auto' && px(ks.marginRight) > 0); })) return [];
    const words = (k) => facts.text(k) || [...k.querySelectorAll('*')].slice(0, 30).some((t) => facts.text(t));
    if (!kids.some(words)) return [];
    // a drawing of a screen (a phone's status bar in a mock-up, hidden from readers) is a picture, not content that varies
    if (el.closest('[aria-hidden="true"]')) return [];
    // how close the neighbours' drawn content is now: what is inside each, not its box (a part that grows to fill the
    // row reaches its neighbour with its box, not with its words)
    const range = document.createRange(), k1 = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    // what each part draws: its words (each run of text, measured where it is laid out) and its leaf boxes (an icon, a
    // dot, a control); a wrapper's own box can be wider than anything in it
    const inkOf = (k) => {
      let l = Infinity, r = -Infinity;
      const add = (q) => { if (q.width > 0 && q.height > 0) { l = Math.min(l, q.left); r = Math.max(r, q.right); } };
      const walker = document.createTreeWalker(k, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walker.currentNode, i = 0; n && i < 80; n = walker.nextNode(), i++) {
        if (n.nodeType === 3) { if (n.nodeValue.trim()) { range.selectNodeContents(n); add(range.getBoundingClientRect()); } }
        else if (!n.firstElementChild && !n.textContent.trim() || /^(?:svg|img|input|button|select|canvas|video)$/.test(n.localName)) add(n.getBoundingClientRect());
      }
      return l < r ? { left: l, right: r, width: r - l } : k.getBoundingClientRect();
    };
    const drawn = kids.map((k) => ({ ...inkOf(k), k })).sort((a, b) => a.left - b.left);
    if (drawn.some((r) => r.width <= 0) || el.clientWidth <= 0) return []; // not laid out (a closed sheet, a hidden tab)
    const apart = drawn.slice(1).map((r, n) => (r.left - drawn[n].right) / k1), at = apart.indexOf(Math.min(...apart));
    const closest = Math.max(0, Math.round(apart[at]));
    // the two parts it is about, by their first words, so the note says between what (U3, 2026-11-20)
    const called = (k) => { const t = (k.textContent ?? '').replace(/\s+/g, ' ').trim(); if (!t) return null; const w = t.split(' '); return w.length > 3 ? `${w.slice(0, 3).join(' ')}…` : t; };
    const a = called(drawn[at].k), b = called(drawn[at + 1].k);
    // the gap: never less than the distance inside its own parts (outer at least inner: a group sits further from its
    // neighbour than its own items sit from each other); else the gap of the layout around it; else its text size.
    // On the theme's spacing scale, else Tailwind's 4px steps
    const gap = gapFor();
    const touching = closest <= 1;
    return [{
      ...say(this.id, { closest, touching, a, b }),
      key: this.id, text: utility(el, 'justify') ?? 'gap', props: ['column-gap'], value: '0px', n: closest,
      evidence: { closest, want: gap.px, from: gap.from }, confidence: touching ? 0.9 : 0.84,
      suggest: { kind: 'class', from: '', to: gap.cls, why: 'keeps a set distance between the parts, whatever is left over', sets: { columnGap: gap.px } },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A list of unknown length
// needs somewhere to go when its row is full: a flex row does not wrap unless told to, so tags, chips or options run
// off a narrow screen. A list is told from a fixed set by where it is written: parts drawn by one line of code (a map
// over data) are a list of whatever length the data has; a toolbar or tabs written out by hand are a fixed set. Read
// from what is measured: a flex row that does not wrap and does not scroll, three or more parts drawn by one line, and
// words in them. Its across gap goes down too. (defensivecss.dev "Flexbox wrapping".)
export const listWrap = {
  id: 'craft/list-wrap', family: 'craft', number: [], owns: ['wrap'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    if (!/flex/.test(s.display) || /column/.test(s.flexDirection) || s.flexWrap !== 'nowrap') return [];
    if (s.overflowX !== 'visible' || el.closest('[aria-hidden="true"]')) return []; // a row set to scroll is a choice
    // so is a row inside a sideways scroller or a clipping viewport just above it, wider than that viewport: a carousel's
    // track (the homepage's examples were told to wrap, 0.6.0)
    for (let p = el.parentElement, d = 0; p && d < 3; p = p.parentElement, d++) {
      if (facts.style(p).overflowX !== 'visible' && el.scrollWidth > p.clientWidth + 1) return [];
    }
    // `flex-nowrap` written out, overriding a wrap, is the author's decision for this row
    if (/(?:^|\s)!?flex-nowrap!?(?:\s|$)/.test(classesOf(el))) return [];
    if (el.matches('[role="tablist"], [role="toolbar"], [role="menubar"], [role="radiogroup"]')) return [];
    const kids = [...el.children].filter((k) => k.getClientRects().length && !/^(?:absolute|fixed)$/.test(facts.style(k).position));
    if (kids.length < (T.least ?? 3)) return [];
    // equal slots sharing the row (flex-1: the days of a week, the steps of a form) are a set laid out to fill it, not a
    // list that grows; each slot narrows as the row does
    if (kids.every((k) => { const ks = facts.style(k); return parseFloat(ks.flexGrow) >= 1 && parseFloat(ks.flexBasis) === 0; })) return [];
    // drawn by one line of code: the same source stamp (file:line:column), so a map over data. A part that is the root of
    // a component (a Link) carries the component's own line, the same for every Link anywhere: its place is the line
    // that uses the component, read from React's tree
    const where = drawnAt;
    const stamp = where(kids[0]);
    if (!stamp || !kids.every((k) => where(k) === stamp)) return [];
    // separate things have space between them; parts set edge to edge (a segmented control, joined tabs) are one control
    // and do not wrap
    if (!(px(s.columnGap) > 0) && !kids.slice(1).some((k) => px(facts.style(k).marginLeft) > 0)) return [];
    // something in them that can be longer: words
    if (!kids.some((k) => facts.text(k) || [...k.querySelectorAll('*')].slice(0, 20).some((t) => facts.text(t)))) return [];
    // a part set to shrink and cut its words off already gives way
    if (kids.every((k) => facts.style(k).minWidth !== 'auto' || [k, ...k.querySelectorAll('*')].slice(0, 10).some((t) => facts.style(t).textOverflow === 'ellipsis'))) return [];
    const over = Math.max(0, el.scrollWidth - el.clientWidth);
    const across = px(s.columnGap), down = px(s.rowGap);
    let to = 'flex-wrap';
    if (across > 0 && !(down > 0)) {
      const step = theme.nearest('spacing', across, Math.max(1, across * 0.25));
      to += ` gap-y-${step ? step.short : Math.max(0.5, Math.round((across / 4) * 2) / 2)}`;
    }
    return [{
      ...say(this.id, { over, n: kids.length }),
      key: this.id, text: utility(el, 'flex-nowrap') ?? 'flex-wrap', props: ['flex-wrap'], value: 'nowrap', n: kids.length,
      evidence: { over, parts: kids.length, stamp }, confidence: over > 1 ? 0.9 : 0.84,
      suggest: { kind: 'class', from: utility(el, 'flex-nowrap') ?? '', to, why: 'lets the list run on to the next line when the row is full', sets: { flexWrap: 'wrap', ...(to.includes('gap-y') ? { rowGap: across } : {}) }, moves: true },
    }];
  },
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A picture keeps its own
// shape; its row's height is not its height. A flex row stretches its items to its full height unless told otherwise,
// and a picture given only a width is an item like any other: when the words beside it wrap to more lines, it is
// pulled tall. Read from what is measured: a picture in a stretching flex row, with no height or ratio of its own, and
// either drawn taller than its shape now, or beside words that can wrap. (defensivecss.dev "Default flexbox stretching".)
export const imageStretch = {
  id: 'craft/image-stretch', family: 'craft', number: [], owns: ['align'], once: 'ancestor', reads: ['style', 'rect', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!/^(?:img|video)$/.test(el.localName)) return [];
    const row = el.parentElement;
    if (!row) return [];
    const s = facts.style(el), rs = facts.style(row);
    if (!/flex/.test(rs.display) || /column/.test(rs.flexDirection) || /^(?:absolute|fixed)$/.test(s.position)) return [];
    const align = /^(?:auto|normal)$/.test(s.alignSelf) ? rs.alignItems : s.alignSelf;
    if (!/^(?:normal|stretch)$/.test(align)) return [];
    // its own height or shape, written: the row can't stretch it
    const AUTO = { not: /^(?:auto|fit|min|max)$/ };
    if (utility(el, 'h', AUTO) || utility(el, 'size', AUTO) || utility(el, 'aspect', AUTO) || utility(el, 'max-h')) return [];
    const w = el.clientWidth, h = el.clientHeight;
    const nw = el.naturalWidth ?? el.videoWidth, nh = el.naturalHeight ?? el.videoHeight;
    if (w < (T.min ?? 16) || !nw || !nh) return [];
    // how much taller than its own shape the row draws it now
    const tall = Math.round(h - (w * nh) / nw);
    const words = [...row.children].some((k) => k !== el && (facts.text(k) || [...k.querySelectorAll('*')].slice(0, 30).some((t) => facts.text(t))));
    if (tall <= 1 && !words) return [];
    return [{
      ...say(this.id, { tall: tall > 1 ? tall : 0 }),
      key: this.id, text: utility(el, 'self') ?? 'align-self', props: ['align-self'], value: 'stretch', n: Math.max(0, tall),
      evidence: { tall, box: [w, h], natural: [nw, nh] }, confidence: tall > 1 ? 0.9 : 0.84,
      suggest: { kind: 'class', from: utility(el, 'self') ?? '', to: 'self-start', why: 'keeps the picture its own height, whatever the words beside it do', sets: { alignSelf: 'flex-start' }, moves: true },
    }];
  },
};

// The size a background picture is drawn at, from its natural size and background-size (auto, contain, a length or a share)
const tileOf = (s, box, nw, nh) => {
  const [a = 'auto', b = 'auto'] = s.backgroundSize.split(',')[0].trim().split(/\s+/);
  if (a === 'contain') { const k = Math.min(box.w / nw, box.h / nh); return [nw * k, nh * k]; }
  const len = (v, whole) => (v === 'auto' ? null : v.endsWith('%') ? (parseFloat(v) / 100) * whole : px(v));
  let w = len(a, box.w), h = len(b, box.h);
  if (w == null && h == null) return [nw, nh];
  if (w == null) w = (h * nw) / nh;
  if (h == null) h = (w * nh) / nw;
  return [w, h];
};
const PICTURES = new Map(); // url → { w, h } once loaded; a picture not yet known is read on the next pass
const pictureSize = (url) => {
  if (PICTURES.has(url)) return PICTURES.get(url);
  const img = new Image();
  PICTURES.set(url, null);
  img.onload = () => PICTURES.set(url, { w: img.naturalWidth, h: img.naturalHeight });
  img.src = url;
  if (img.complete && img.naturalWidth) PICTURES.set(url, { w: img.naturalWidth, h: img.naturalHeight });
  return PICTURES.get(url);
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A photo is one picture;
// repeated, it reads as a fault. A background repeats unless told otherwise, so a hero photo sized to its own pixels
// (or to fit, `contain`) tiles as soon as the box outgrows it: on a wide monitor, or a taller section. A small pattern
// is meant to repeat and is left alone. Read from what is measured: a background picture that is a photo (raster, and
// at least the photo size image-fit uses), set to repeat, not sized to cover; tiling now, or able to once the box grows.
// (defensivecss.dev "Background repeat".)
export const backgroundTile = {
  id: 'craft/background-tile', family: 'craft', number: [], owns: ['background'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el);
    const url = /url\(["']?([^"')]+)["']?\)/.exec(s.backgroundImage)?.[1];
    if (!url || /^data:image\/svg|\.svg(?:[?#]|$)/i.test(url)) return [];
    // which way it repeats: `repeat`, `repeat-x`, `repeat-y`, or two words (across, down); space and round are deliberate
    const rep = s.backgroundRepeat.split(',')[0].trim(), two = rep.split(/\s+/);
    const acrossRep = rep === 'repeat' || rep === 'repeat-x' || (two.length === 2 && two[0] === 'repeat');
    const downRep = rep === 'repeat' || rep === 'repeat-y' || (two.length === 2 && two[1] === 'repeat');
    if (!acrossRep && !downRep) return [];
    if (/^cover/.test(s.backgroundSize)) return [];
    const box = { w: el.clientWidth, h: el.clientHeight };
    if (box.w < (T.min ?? 48) || box.h < (T.min ?? 48)) return [];
    const pic = pictureSize(url);
    if (!pic || Math.min(pic.w, pic.h) < (T.photo ?? 64)) return [];
    const [tw, th] = tileOf(s, box, pic.w, pic.h);
    if (!(tw > 0 && th > 0)) return [];
    // a photo drawn at a fraction of its pixels, small enough to tile many times over, is a texture on purpose
    if (Math.min(tw, th) < (T.photo ?? 64)) return [];
    const x = acrossRep && box.w > tw + 1, y = downRep && box.h > th + 1;
    const now = x || y;
    const repCls = utility(el, 'bg-repeat') ?? '';
    const sized = /^contain/.test(s.backgroundSize);
    const to = sized ? 'bg-no-repeat' : 'bg-no-repeat bg-cover';
    return [{
      ...say(this.id, { now, wide: x }),
      key: this.id, text: repCls || 'background-repeat', props: ['background-repeat'], value: rep, n: now ? 1 : 0,
      evidence: { tile: [Math.round(tw), Math.round(th)], box: [box.w, box.h], natural: [pic.w, pic.h] }, confidence: now ? 0.9 : 0.84,
      suggest: { kind: 'class', from: repCls, to, why: sized ? 'draws the photo once, at the size that fits' : 'draws the photo once, cropped to fill the box at any size', sets: sized ? { backgroundRepeat: 'no-repeat' } : { backgroundRepeat: 'no-repeat', backgroundSize: 'cover' } },
    }];
  },
};

// The widths a grid's columns may never go below, as written: each fixed track (240px, 15rem) and the least of each
// minmax(). null when the columns adapt by themselves (auto-fill, auto-fit) or can't be read.
const fixedTracks = (cols) => {
  if (/auto-(?:fill|fit)/.test(cols)) return null;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const len = (v) => { const m = /^(-?[\d.]+)(px|rem)$/.exec(v); return m ? parseFloat(m[1]) * (m[2] === 'rem' ? rem : 1) : 0; };
  const tracks = [];
  const split = (str) => { const out = []; let d = 0, cur = ''; for (const ch of str) { if (ch === '(') d++; if (ch === ')') d--; if (ch === '_' && !d) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
  for (const t of split(cols)) {
    const rep = /^repeat\((\d+),(.+)\)$/.exec(t);
    if (rep) { for (let i = 0; i < +rep[1]; i++) tracks.push(...split(rep[2]).map((x) => x)); continue; }
    tracks.push(t);
  }
  return tracks.map((t) => { const mm = /^minmax\(([^,]+),/.exec(t); return len(mm ? mm[1] : t); });
};

// Defensive, not a craft rule (no number, no showcase screen; docs/research/defensive-tips.md). A layout with a fixed
// column needs a one-column form for the width where that column no longer fits: written for every width, a 280px
// sidebar keeps its 280px on a phone and squeezes the content beside it, or pushes the page sideways. Read from the
// classes: a grid's columns written without a breakpoint (`grid-cols-[280px_1fr]`), whose fixed widths take at least
// half a narrow phone (360px; an invented line, tuned on real apps), with no breakpoint form of the columns beside it.
// The fix moves the columns behind the smallest breakpoint where the fixed widths take at most half the screen.
// (defensivecss.dev "CSS grid fixed values".)
export const fixedColumn = {
  id: 'craft/fixed-column', family: 'craft', number: [], owns: ['columns'], once: 'ancestor', reads: ['style'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!/grid/.test(facts.style(el).display)) return [];
    const classes = classesOf(el).split(/\s+/);
    const cls = classes.find((c) => /^grid-cols-\[/.test(c));
    if (!cls) return [];
    // a form for another width is already written: md:grid-cols-…, max-md:…, @lg:… (a container's width)
    if (classes.some((c) => /^[^[]*:grid-cols-/.test(c) || /^[^[]*:(?:block|flex|hidden)$/.test(c))) return [];
    const tracks = fixedTracks(cls.slice('grid-cols-['.length, -1));
    if (!tracks || tracks.length < 2) return [];
    const fixed = tracks.reduce((a, b) => a + b, 0);
    const narrow = T.narrow ?? 360;
    if (fixed < narrow * (T.share ?? 0.5)) return [];
    // the smallest breakpoint where the fixed widths take at most half the screen (Tailwind's own widths)
    const bp = [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280]].find(([, w]) => fixed <= w * 0.5) ?? ['2xl', 1536];
    return [{
      ...say(this.id, { fixed: Math.round(fixed), at: bp[1] }),
      key: this.id, text: cls, props: ['grid-template-columns'], value: cls, n: Math.round(fixed),
      evidence: { fixed: Math.round(fixed), tracks }, confidence: 0.86,
      suggest: { kind: 'class', from: cls, to: `${bp[0]}:${cls}`, why: `keeps these columns from ${bp[1]}px up, and one column below`, sets: {}, moves: true },
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
    // asked to scroll sideways only (overflow-x-auto), with no height cap: it grows to what it holds, so it never
    // scrolls down, and its scrollbar runs along the bottom
    const cls = classesOf(el);
    if (/(^|\s)overflow-x-(auto|scroll)(\s|$)/.test(cls) && !/(^|\s)overflow-(y-)?(auto|scroll)(\s|$)/.test(cls) && s.maxHeight === 'none') return [];
    // a strip that scrolls sideways (overflow-x-auto computes overflow-y as auto too) with nothing to scroll down: its
    // scrollbar runs along the bottom and never takes width from what is in it
    if (/auto|scroll/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) return [];
    const r = facts.rect(el);
    if (r.width < T.width || r.height < T.height) return [];
    return [{
      ...say(this.id, {}),
      key: this.id, text: utility(el, 'overflow-y') ?? utility(el, 'overflow') ?? 'overflow', props: ['scrollbar-gutter'], value: 'auto', n: 0,
      evidence: { width: r.width, height: r.height }, confidence: 0.8,
      // sets: what the class does, so a check folded under this one (craft/scroll-cue, the same scroll area) can be
      // judged on the page this fix leaves and its fix stacked on it: one edit answers both (verdict.js compose)
      suggest: { kind: 'class', from: '', to: '[scrollbar-gutter:stable]', why: 'keeps room for the scrollbar', sets: { scrollbarGutter: 'stable' } },
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
    // the feature lifts punctuation to the height of the capitals around it: a lone dot or dash between separate
    // labels has no capitals of its own to sit beside
    if ((words(el).match(/[A-Za-z]/g) ?? []).length < 2) return [];
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
    // a box joins the line its middle falls inside, so a badge set smaller beside the words (its top a few px off
    // theirs) stays on their line instead of counting as a second one
    const range = document.createRange(), rows = [], boxes = [];
    for (const t of textNodes(el)) { range.selectNodeContents(t); boxes.push(...range.getClientRects()); }
    for (const q of boxes) {
      if (q.width < 1) continue;
      const mid = q.top + q.height / 2;
      let row = rows.find((w) => mid >= w.t && mid <= w.b) ?? rows.find((w) => w.t + (w.b - w.t) / 2 >= q.top && w.t + (w.b - w.t) / 2 <= q.bottom);
      if (!row) rows.push(row = { t: q.top, b: q.bottom, l: Infinity, r: -Infinity });
      row.l = Math.min(row.l, q.left); row.r = Math.max(row.r, q.right);
    }
    const widths = rows.sort((a, b) => a.t - b.t).map((w) => w.r - w.l);
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
    // a circle or a pill is all curve, with no corner to smooth (the computed radius of rounded-full is 33554400px)
    if (rad >= Math.min(r.width, r.height) / 2 - 0.5) return [];
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
    // white is the surface when the theme's own surface is white: a page painted from a stylesheet (var(--surface)) has no
    // class to say so, and was told it sat "outside your surface colour" (our homepage, 0.6.0)
    const SURFACE = /surface|paper|ground|background|page|canvas/;
    if (white && theme.colors().some((t) => t.own !== false && SURFACE.test(t.short) && t.rgb[0] === 255 && t.rgb[1] === 255 && t.rgb[2] === 255 && (t.rgb[3] ?? 1) >= 1)) return [];
    const tinted = theme.colors().find((t) => SURFACE.test(t.short) && !(t.rgb[0] === 255 && t.rgb[1] === 255 && t.rgb[2] === 255) && Math.min(...t.rgb) > 220);
    // the project's own near-black first (a dark ink or night colour), else whatever the theme has near it
    const ownDark = theme.colors().filter((t) => t.own !== false && Math.max(...t.rgb) <= 64)
      .map((t) => ({ ...t, distance: Math.hypot(t.rgb[0] - 20, t.rgb[1] - 20, t.rgb[2] - 22) })).filter((t) => t.distance <= T.within * 1.25).sort((a, b) => a.distance - b.distance)[0];
    const near = black ? ownDark ?? theme.nearestColor([20, 20, 22], T.within) : tinted;
    // white outside a tinted theme is taste, unless the spec makes the rule a note already
    const tier = black || tinted ? T.tier : Math.max(T.tier, TIER.advisory);
    return [{
      ...say(this.id, { black, tinted: !!tinted }),
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
    // a fixed width with its words set right or centred, and nothing cut: a column of figures kept in line on purpose
    if (!overflow && /right|end|center/.test(s.textAlign)) return [];
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
    const drawn = (k) => controlKind(k, facts.style(k)) || k.matches('img, svg') || (rgb(facts.style(k).backgroundColor)?.[3] ?? 0) > 0 || facts.box(k).bt > 0;
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


// Words that run into other words (a plain check, no number). Two different texts drawn on top of each other, or on one
// line closer than a word space, or stacked tighter than the smaller one's own size (lines set closer than solid:
// ascenders meet descenders), read as one text or not at all. It usually shows only in one state at one width: a label
// that appears on hover, a readout that grows, a headline that shrinks in a narrow window. Judged on what is drawn now
// (anything transparent is left: texts that take turns in one place are stacked on purpose), from the letters, not the
// boxes: a line's box is taller than its letters, and tight headings overlap their own boxes without touching.
// Two texts are only judged against each other when they sit on the same painted surface (a card stacked on another
// hides the words under it: a pile of toasts is not a collision), and two pieces that share a parent are one text the
// author set side by side ("0:00" and ".00", a unit beside its value): those are the row's business, not this check's.
// So is a word set a glyph at a time: a rolling number draws each digit in its own clipped slot, placed by hand
// (beUI's digit swap), and its digits touch because they are one number. Two pieces that are each a glyph or two,
// touching side by side inside one box a single line tall, are the letters of one text, not two texts meeting
// (found on React Plumber's shares, 2026-11-20; the box can't be told by its display, since an inline box inside a
// grid or flex layout computes as a block). A badge drawn over a label is 'over', not touching, and still collides.
// (Found on crafting-ui's hero, 2026-11-12: a readout touching the hint beside it, two guide labels 9px apart.)
const LINES = new WeakMap();
function textLines(facts) {
  let all = LINES.get(facts);
  if (all) return all;
  all = [];
  const ctx = (textLines.ctx ??= document.createElement('canvas').getContext('2d'));
  const seen = new Map();
  // words kept for a screen reader and cut out of sight (sr-only: a 1px box that clips what is in it) are not drawn
  const clipped = (el, st) => (st.overflow !== 'visible' || st.clipPath !== 'none') && (() => { const r = facts.rect(el); return r.width <= 2 || r.height <= 2; })();
  const shown = (el) => { if (!el || el === document.body) return true; let v = seen.get(el); if (v === undefined) { const st = facts.style(el); v = st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) >= 0.05 && !clipped(el, st) && shown(el.parentElement); seen.set(el, v); } return v; };
  const blockOf = (el) => { for (let n = el; n; n = n.parentElement) { const d = facts.style(n).display; if (!/^inline/.test(d) && d !== 'contents') return n; } return document.body; };
  // the painted thing the words are drawn on: the nearest box with a fill of its own
  const surfaces = new Map();
  const surfaceOf = (el) => { if (!el || el === document.body) return document.body; let v = surfaces.get(el); if (!v) { const st = facts.style(el), bg = rgb(st.backgroundColor); v = (bg && bg[3] > 0.5) || st.backgroundImage !== 'none' ? el : surfaceOf(el.parentElement); surfaces.set(el, v); } return v; };
  // the box the words can be seen in: every box above them that clips, met together (a rolling number's window)
  const clips = new Map();
  const clipOf = (el) => {
    if (!el || el === document.body) return null;
    if (clips.has(el)) return clips.get(el);
    const up = clipOf(el.parentElement), st = facts.style(el);
    let v = up;
    if (st.overflow !== 'visible' || st.clipPath !== 'none') {
      const r = facts.rect(el);
      v = up ? { left: Math.max(r.left, up.left), top: Math.max(r.top, up.top), right: Math.min(r.right, up.right), bottom: Math.min(r.bottom, up.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    clips.set(el, v);
    return v;
  };
  for (const el of facts.items ?? []) {
    if (!el.isConnected || !facts.text(el) || el.closest('svg') || !shown(el)) continue;
    const st = facts.style(el), ink = rgb(st.color);
    if (ink && ink[3] < 0.05) continue;
    const m = facts.metrics(el);
    if (!m) continue;
    ctx.font = st.font || `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const space = ctx.measureText(' ').width, size = px(st.fontSize), block = blockOf(el), surface = surfaceOf(el);
    // laid out by the flow, two pieces in one parent sit where the layout put them (the parts of one number); placed by
    // hand (absolute, fixed), nothing keeps them apart
    const placed = /^(absolute|fixed)$/.test(st.position);
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !/\S/.test(n.nodeValue)) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const clip = clipOf(el);
      for (const q of range.getClientRects()) {
        if (q.width <= 2 || q.height <= 2) continue;
        // more than half of it cut away by a box that clips: not something anyone reads
        if (clip) {
          const w = Math.min(q.right, clip.right) - Math.max(q.left, clip.left), h = Math.min(q.bottom, clip.bottom) - Math.max(q.top, clip.top);
          if (w <= 0 || h <= 0 || w * h < q.width * q.height / 2) continue;
        }
        const base = q.top + (q.height - (m.ascent + m.descent)) / 2 + m.ascent;
        all.push({ el, block, surface, placed, left: q.left, right: q.right, capTop: base - m.capHeight, base, space, size, words: n.nodeValue.trim().replace(/\s+/g, ' ') });
      }
    }
  }
  LINES.set(facts, all);
  return all;
}
// two glyphs of one text: each a character or two, and their nearest shared box is one line tall
function oneWord(a, b, facts) {
  if (a.words.length > 2 || b.words.length > 2) return false;
  let n = a.el.parentElement;
  while (n && !n.contains(b.el)) n = n.parentElement;
  return !!n && n !== document.body && facts.rect(n).height <= 1.6 * Math.max(a.size, b.size);
}
export const textCollision = {
  id: 'craft/text-collision', family: 'craft', number: [], owns: [], once: 'element', reads: ['rect', 'style', 'text', 'metrics', 'census'],
  check({ el, facts }) {
    if (!facts.items || !facts.text(el)) return [];
    const all = textLines(facts), mine = all.filter((l) => l.el === el);
    for (const a of mine) for (const b of all) {
      if (b.el === el || b.block === a.block || b.surface !== a.surface || (b.el.parentElement === el.parentElement && !a.placed && !b.placed) || el.contains(b.el) || b.el.contains(el)) continue;
      // said once, at the text that comes later in the page
      if (!(b.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left), ink = Math.min(a.base, b.base) - Math.max(a.capTop, b.capTop);
      const how = across > 1 && ink > 1 ? 'over' : ink > 1 && across <= 1 && across > -Math.min(a.space, b.space) ? 'run' : across > 1 && Math.abs(a.base - b.base) < Math.min(a.size, b.size) ? 'tight' : null;
      if (!how) continue;
      if (how === 'run' && oneWord(a, b, facts)) continue;
      const other = b.words.length > 28 ? `${b.words.slice(0, 27)}…` : b.words;
      return [{
        ...say(this.id, { how, other }),
        key: this.id, text: 'text', props: [], value: how, n: Math.round(how === 'run' ? Math.max(0, -across) : across),
        evidence: { how, with: other, across: Math.round(across * 10) / 10, baselines: Math.round(Math.abs(a.base - b.base) * 10) / 10 }, confidence: 0.86,
        suggest: { kind: 'advice', text: how === 'run' ? 'Put a gap between them, or let one wrap or hide when the room runs out.' : 'Move one of them, or show only one where they meet.' },
      }];
    }
    return [];
  },
};

// ── hard rules, layer 2: the page's own habits (facts.census) ─────────

const WEIGHTS = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };

// #17. Two or three weights: a weight the page barely uses, when it already has three or more.
export const weightLevels = {
  id: 'craft/weight-levels', family: 'craft', number: [17], owns: ['font-weight'], once: 'ancestor', reads: ['style', 'text', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!facts.text(el) || !facts.census || el.closest('svg') || marksOnly(el) || inPicture(el, facts)) return [];
    // the logo's wordmark (one word in the link home) keeps the weight it was drawn with
    { const home = el.closest('a[href="/"], a[aria-label*="home" i]'); if (home && !/\s/.test((home.textContent ?? '').trim())) return []; }
    // words kept for screen readers only (a 1px clipped box) are never seen, so their weight is no one's choice
    { const r = facts.rect(el); if (r.width <= 2 || r.height <= 2) return []; }
    const c = facts.census('weights');
    if (c.sample < T.sample || c.clusters.length <= 3) return [];
    const w = Math.round((parseInt(facts.style(el).fontWeight, 10) || 400) / 100) * 100;
    if (c.share(w) > T.minority) return [];
    const majority = c.clusters.slice(0, 3).map((k) => k.value);
    if (majority.includes(w)) return [];
    // never up into 800 or 900 from below them: plumber's own tell calls those extra-heavy (U19), and "Use weight 800" was
    // its next finding (our homepage, 0.6.0). A common weight under 800 is the answer when the page has one
    const under = majority.filter((m) => m < 800 || w >= 800);
    const near = (under.length ? under : majority).slice().sort((a, b) => Math.abs(a - w) - Math.abs(b - w))[0];
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
    // the page's own ink is never a stray, however many faint labels outnumber it on one page
    const own = facts.style(el).color;
    if (own === facts.style(document.body).color || inPicture(el, facts)) return [];
    // the ink of a filled control (a button's words on its own fill) is chosen for that fill, not from the page's greys
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (alpha(rgb(facts.style(n).backgroundColor)) > 0.5) { if (n.matches('button, a, [role="button"]') || n.closest('button, [role="button"]')) return []; break; }
    }
    // nor a colour set by one of the theme's colour tokens (text-muted), on this element or the one it inherits from
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n !== el && facts.style(n).color !== own) break;
      const token = classesOf(n).split(/\s+/).find((x) => { if (!x.startsWith('text-') || x.includes(':')) return false; const name = x.slice(5).split('/')[0];
        // the theme's list, or a named colour class the page's own styles define (an inline theme leaves no variable to read)
        return (theme.colors?.() ?? []).some((t) => name === t.short) || (!PALETTE.test(name) && !name.startsWith('[') && colourClasses().has(x)); });
      if (token) return [];
    }
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

// The single-class rules in the page's styles that set a text colour (.text-muted { color: … }), read once per set of
// sheets: a named class there is the project's own colour, a decision, whatever its value.
let COLOUR_CLASSES = null;
function colourClasses() {
  if (COLOUR_CLASSES?.n === document.styleSheets.length) return COLOUR_CLASSES.set;
  const set = new Set();
  const walk = (rules) => { for (const r of rules) {
    if (r.cssRules?.length && !r.selectorText) walk(r.cssRules);
    else if (r.selectorText && r.style?.color) for (const sel of r.selectorText.split(',')) { const m = /^\s*\.((?:\\.|[\w-])+)\s*$/.exec(sel); if (m) set.add(m[1].replace(/\\(.)/g, '$1')); }
  } };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* another origin's sheet */ } }
  COLOUR_CLASSES = { n: document.styleSheets.length, set };
  return set;
}

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
    // a stray is a near miss of the rhythm (18 where the page keeps 16); a gap more than twice the widest step is a
    // break set on purpose (a cover's title standing apart), not a value that drifted
    if (g > 2 * Math.max(...steps)) return [];
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
    // the levels a hair apart form one run (each within a step of the next), and the run is one level: the one the page
    // uses most. Every other level in it takes that one, at once. Told only "the nearest level used more", each fix
    // made the next finding (8px took 10px, then 10px outnumbered 12px and 12px was told to take 10px; our homepage)
    const sorted = c.clusters.slice().sort((x, y) => x.value - y.value), i = sorted.indexOf(own);
    let lo = i, hi = i;
    while (lo > 0 && sorted[lo].value / Math.max(sorted[lo - 1].value, 0.001) < T.step) lo--;
    while (hi < sorted.length - 1 && sorted[hi + 1].value / Math.max(sorted[hi].value, 0.001) < T.step) hi++;
    const near = sorted.slice(lo, hi + 1).sort((x, y) => y.count - x.count || Math.abs(x.value - b) - Math.abs(y.value - b))[0];
    if (!near || near === own || near.count <= own.count) return [];
    // the run can chain levels a step apart each into one, until 18px is told to take 8px: those two are a clear step
    // apart. Said only when the level it is told to take is itself within a step of this one
    if (Math.max(near.value, b) / Math.max(Math.min(near.value, b), 0.001) >= T.step) return [];
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
    if (!pressed(el, facts)) return [];
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
// An icon set beside words is drawn at about their size; an svg more than twice their size is a drawing with a
// caption (a pattern's glyph and its name). So is a small one with words in it or more than 16 shapes (a problem's
// illustration shown at icon size): its strokes say nothing about how the app pairs icons with text
const drawingBeside = (svg, host, facts) => (svg.clientWidth || facts.rect(svg).width) > 2 * (px(facts.style(host).fontSize) || 16)
  || !!svg.querySelector('text, foreignObject') || svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse').length > 16;
// Each kind of icon counts once: a pairing is a decision made where the icon is written, not each time a list draws it.
// Counted per copy, one 7px lock on fifteen locked cards outvoted every other icon on algorecall's tree page and set
// "the usual stroke" at 0.5px (2026-11-26). A kind is the icon (its class, or its first shape) at a size and a weight.
const iconKind = (svg, w, band) => {
  const shape = svg.querySelector('path, circle, rect, line, polyline, polygon, ellipse');
  return `${svg.getAttribute('class') || shape?.getAttribute('d')?.slice(0, 40) || shape?.localName || ''}|${Math.round(svg.clientWidth || 0)}|${Math.round(w * 4)}|${band}`;
};
const strokePairs = (facts) => {
  const out = [], seen = new Set();
  for (const el of facts.items) {
    if (!el.isConnected) continue;
    const svg = facts.kids(el).find((k) => k.localName === 'svg');
    if (!svg) continue;
    const host = facts.text(el) ? el : facts.kids(el).find((k) => k !== svg && facts.text(k));
    const w = host && !drawingBeside(svg, host, facts) && facts.stroke(svg);
    if (!w) continue;
    const band = weightBand(facts.style(host).fontWeight), kind = iconKind(svg, w, band);
    if (seen.has(kind)) continue;
    seen.add(kind);
    out.push({ el, svg, w, band });
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
    if (inPicture(svg, facts)) return [];
    const size = svg.clientWidth || facts.rect(svg).width;
    // filled art with an outline (a sticker, an illustration) is drawn thick on purpose; the check is for line icons
    const filled = () => { const shapes = [...svg.querySelectorAll('path, circle, rect, ellipse, polygon')].slice(0, 40);
      return shapes.filter((p) => { const f = getComputedStyle(p).fill; return f && f !== 'none' && (/url\(/.test(f) || alpha(rgb(f) ?? [0, 0, 0, 0]) > 0); }).length > shapes.length / 2; };
    if (size >= T.big && w > T.heavy && !filled()) {
      // the stroke stays the width it's drawn at (2 in a 24 box) however big the icon is drawn
      return [{ ...say(this.id, { w, big: true }), key: this.id, text: 'svg', props: ['stroke-width'], value: fmt(w), n: w,
        evidence: { stroke: Math.round(w * 10) / 10, size: Math.round(size) }, confidence: 0.84,
        suggest: { kind: 'class', from: '', to: '[&>svg_*]:[vector-effect:non-scaling-stroke]', target: ':scope > svg *', why: 'the stroke the small icons have', sets: { vectorEffect: 'non-scaling-stroke' } } }];
    }
    const host = facts.text(el) ? el : facts.kids(el).find((k) => k !== svg && facts.text(k));
    if (!host || drawingBeside(svg, host, facts)) return [];
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
  // after: on one scroll area this folds under the scrollbar-gutter finding (both own the scroll). Its fix is stacked
  // on that one, so taking the fix does not hand the person a second finding on the same list (found by
  // scripts/proof/fix-undo.mjs, 2026-11-26)
  id: 'craft/scroll-cue', family: 'craft', number: [75], owns: ['scroll'], once: 'ancestor', after: ['craft/scrollbar-gutter'], reads: ['style', 'box'],
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
    if (!el.isConnected || !button(el, facts)) continue;
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
    if (!button(el, facts) || el.matches(':disabled, [aria-disabled="true"], [type="submit"]')) return [];
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

// ── cards side by side: what a designer checks first on a row of plans (craft-rows.js) ──────────
// Measured once per parent per pass: the rules below ask about every element, and a row's cards are its parent's.
const ROWS = new WeakMap(); // facts → Map(parent → lines)
const linesUnder = (parent, facts) => {
  let m = ROWS.get(facts); if (!m) ROWS.set(facts, (m = new Map()));
  if (!m.has(parent)) m.set(parent, parent ? cardRows(parent, facts) : []);
  return m.get(parent);
};
const lineOf = (el, facts) => linesUnder(el.parentElement, facts).find((l) => l.includes(el)) ?? null;
const said = (el) => (el?.innerText || '').trim().split('\n')[0].slice(0, 40);

// Row lines. The mistake: plan cards side by side each stack their own content, so when one plan's description runs a
// line longer or carries a badge, its price, list and button start lower than its neighbours'. Each card was checked
// alone, with mock copy of equal length, and looked right. The principle: plans are compared by reading straight across
// (similarity: the same part in the same place reads as the same kind of thing), so a part that drifts down breaks
// the comparison. Sources: NN/g, "Comparison Tables for Products, Services, and Features" (attributes in a consistent
// place); MDN, "Subgrid" (lining up the parts of cards in a row is the case subgrid exists for).
export const rowLines = {
  id: 'craft/row-lines', family: 'craft', number: [], owns: ['grid-rows'], once: 'element', reads: ['rect', 'style', 'kids', 'text', 'metrics'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const lines = linesUnder(el, facts);
    if (!lines.length) return [];
    const out = [];
    for (const line of lines) {
      const off = partLines(line, facts).filter((p) => p.off > T.off);
      if (!off.length) continue;
      const worst = off.reduce((a, b) => (b.off > a.off ? b : a));
      out.push({
        ...say(this.id, { parts: off.map((p) => p.part), off: worst.off, cards: line.length }),
        key: this.id, text: off.map((p) => p.part).join(', '), props: ['grid-template-rows'], value: `${Math.round(worst.off * 10) / 10}px`, n: worst.off,
        evidence: { cards: line.length, parts: off.map((p) => ({ part: p.part, off: Math.round(p.off * 10) / 10 })) }, confidence: 0.85,
        suggest: { kind: 'advice', text: `Lay the row out as a grid and give each card grid-rows-subgrid over its parts, so a longer description in one plan moves the same line in all of them.` },
      });
    }
    return out;
  },
};

// Shared edges. The mistake: a card is put together from pieces built apart (a header row, a badge, a list, a footer
// with its own inset), so its lines start on two or three different edges. Each piece is aligned within itself, so
// nothing looks wrong until the card is read as a whole. The principle: a card is one column, and everything that
// starts a line starts on its edge; an icon may lead a line, and the words after it hang (Müller-Brockmann, "Grid
// Systems in Graphic Design": one column, one alignment line; Prägnanz: the eye reads one edge as one shape).
// Judged on cards in a row (craft-rows.js), where the comparison makes a second edge plain.
export const sharedEdges = {
  id: 'craft/shared-edges', family: 'craft', number: [], owns: ['margin-x'], once: 'element', reads: ['rect', 'style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!lineOf(el, facts)) return [];
    const { edges } = edgesOf(el, facts);
    if (edges.length <= T.edges) return [];
    const [main, ...extra] = [...edges].sort((a, b) => b.els.length - a.els.length);
    const far = extra.reduce((a, b) => (Math.abs(b.x - main.x) > Math.abs(a.x - main.x) ? b : a));
    const off = Math.round((far.x - main.x) * 10) / 10;
    return [{
      ...say(this.id, { edges: edges.length, off, what: said(far.els[0]) }),
      key: this.id, text: said(far.els[0]) || far.els[0].localName, props: ['margin-left', 'padding-left'], value: `${off}px`, n: Math.abs(off),
      evidence: { edges: edges.map((g) => ({ x: g.x, lines: g.els.length })) }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Start "${said(far.els[0])}" on the card’s edge with the rest: take away the ${Math.abs(off)}px it is ${off > 0 ? 'set in' : 'pulled out'}.` },
    }];
  },
};

// Action fit. The mistake: two solid buttons in one card ("Start trial" and "Contact sales"), because each was the
// most important thing to someone; then nothing leads. And across a row, one plan's button spans its card while the
// next one's fits its label, because each card was built from a different example. The principle: one main action
// per card, drawn as the one solid thing (Hick's law: one choice is quicker than two equal ones; Von Restorff: the one
// thing that differs is the one noticed; Material 3, "Buttons": a filled button for the most important action), and
// the same action drawn the same way across a row (similarity).
export const actionFit = {
  id: 'craft/action-fit', family: 'craft', number: [], owns: ['background-color', 'width'], once: 'element', reads: ['rect', 'style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const out = [];
    if (lineOf(el, facts)) {
      const { filled } = actionsOf(el, facts);
      if (filled.length > T.filled) out.push({
        ...say(this.id, { kind: 'filled', n: filled.length, names: filled.map(said) }),
        key: this.id, text: filled.map(said).join(' · '), props: ['background-color'], value: `${filled.length}`, n: filled.length,
        evidence: { filled: filled.map(said) }, confidence: 0.86,
        suggest: { kind: 'advice', text: `Keep one solid button in the card; draw "${said(filled[0])}" as a quiet one (an outline, or words).` },
      });
    }
    for (const line of linesUnder(el, facts)) {
      const fits = line.map((card) => actionsOf(card, facts)).filter((a) => a.main);
      const full = fits.filter((a) => a.full).length;
      if (fits.length < 2 || full === 0 || full === fits.length) continue;
      out.push({
        ...say(this.id, { kind: 'width', n: fits.length, full }),
        key: this.id, text: 'width', props: ['width'], value: `${full} of ${fits.length}`, n: fits.length - full,
        evidence: { full, cards: fits.length }, confidence: 0.84,
        suggest: { kind: 'advice', text: 'Give every plan’s button the same width: all span their card, or all fit their words.' },
      });
    }
    return out;
  },
};

// ── scroll snapping, scroll chaining, native controls (docs/research/scroll-batch.md, grounds read on MDN 2026-11-26) ──
// Checks from guide advice, with no craft number and no showcase screen (docs/briefs/new-check.md).

const snapOf = (s) => { const [axis = 'none', strict = 'proximity'] = String(s.scrollSnapType || 'none').split(/\s+/); return { axis, strict, on: axis !== 'none', x: /^(?:x|inline|both)$/.test(axis), y: /^(?:y|block|both)$/.test(axis) }; };
// the children a scroll area lays out: drawn, in flow
const flowKids = (el, facts) => [...el.children].filter((k) => k.getClientRects().length && !/^(?:absolute|fixed)$/.test(facts.style(k).position));

// A row that is paged rests on a page. A sideways scroll area of like parts, each at least half as wide as the area,
// is read a part at a time; with no snapping it stops wherever the finger lets go, a part cut in half at each edge.
// (MDN, Basic concepts of scroll snap: snapping is opted into on the scroll container, and each child names where it
// snaps.) Small parts (chips, tags) scroll freely and are left alone. The half is an invented line, to be tuned on real apps.
export const snapRest = {
  id: 'craft/snap-rest', family: 'craft', number: [], owns: ['snap'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el);
    if (!/^(?:auto|scroll)$/.test(s.overflowX) || el.scrollWidth <= el.clientWidth + 4 || snapOf(s).on) return [];
    const kids = flowKids(el, facts);
    if (kids.length < (T.least ?? 3) || !kids.every((k) => k.localName === kids[0].localName)) return [];
    const w = kids[0].offsetWidth, wide = el.clientWidth;
    if (!kids.every((k) => Math.abs(k.offsetWidth - w) <= 2)) return [];
    if (w < wide * (T.share ?? 0.5) || w > wide + 1) return [];
    return [{
      ...say(this.id, { n: kids.length }),
      key: this.id, text: utility(el, 'overflow-x') ?? utility(el, 'overflow') ?? 'overflow-x', props: ['scroll-snap-type'], value: 'none', n: kids.length,
      evidence: { parts: kids.length, part: w, area: wide }, confidence: 0.82,
      // one edit on the row: the row snaps, and each part names its start as the place to rest
      suggest: { kind: 'class', from: '', to: 'snap-x snap-mandatory *:snap-start', why: 'rests on a whole part when the scroll stops', sets: { scrollSnapType: 'x mandatory' } },
    }];
  },
};

// Strict snapping is only safe when every stop fits the view. With `mandatory`, a part taller (or wider) than the
// scroll area can't be read past its first screen: the scroll is pulled to its start or on to the next part.
// (MDN, Basic concepts of scroll snap: never use mandatory when a child's content overflows the container.)
export const snapStrict = {
  id: 'craft/snap-strict', family: 'craft', number: [], owns: ['snap'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const s = facts.style(el), snap = snapOf(s);
    if (!snap.on || snap.strict !== 'mandatory') return [];
    const over = T.over ?? 2;
    let worst = 0;
    for (const k of flowKids(el, facts)) {
      if (facts.style(k).scrollSnapAlign === 'none') continue;
      if (snap.y) worst = Math.max(worst, k.offsetHeight - el.clientHeight);
      if (snap.x) worst = Math.max(worst, k.offsetWidth - el.clientWidth);
    }
    if (worst <= over) return [];
    const cls = /(?:^|\s)(!?snap-mandatory!?)(?:\s|$)/.exec(classesOf(el))?.[1] ?? null;
    return [{
      ...say(this.id, { over: Math.round(worst), x: snap.x && !snap.y }),
      key: this.id, text: cls ?? 'scroll-snap-type', props: ['scroll-snap-type'], value: s.scrollSnapType, n: Math.round(worst),
      evidence: { over: Math.round(worst), axis: snap.axis }, confidence: 0.88,
      suggest: cls ? { kind: 'class', from: cls, to: cls.replace('mandatory', 'proximity'), why: 'snaps when a part is near, and lets a long part be read through', sets: { scrollSnapType: `${snap.axis} proximity` } }
        : { kind: 'advice', text: `Use scroll-snap-type: ${snap.axis} proximity, so a part longer than the view can be read through.` },
    }];
  },
};

// The same ground, its other half: with `mandatory`, a part that names no place to snap can't be brought into view,
// because the scroll is always pulled to a part that does. (MDN, Basic concepts of scroll snap.) Said on the part,
// where the fix is written, and only when its neighbours do snap: with none snapping, nothing is pulled anywhere.
export const snapUnreachable = {
  id: 'craft/snap-unreachable', family: 'craft', number: [], owns: ['snap'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    const area = el.parentElement;
    if (!area) return [];
    const snap = snapOf(facts.style(area));
    if (!snap.on || snap.strict !== 'mandatory') return [];
    const s = facts.style(el);
    if (s.scrollSnapAlign !== 'none' || /^(?:absolute|fixed|sticky)$/.test(s.position) || !el.getClientRects().length || el.offsetWidth < 8 || el.offsetHeight < 8) return [];
    const kids = flowKids(area, facts), first = kids.find((k) => facts.style(k).scrollSnapAlign !== 'none');
    if (!first || kids[0] === el) return []; // nothing snaps, or this is the part the area starts on
    const to = { start: 'snap-start', center: 'snap-center', end: 'snap-end' }[String(facts.style(first).scrollSnapAlign).split(/\s+/)[0]] ?? 'snap-start';
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'scroll-snap-align', props: ['scroll-snap-align'], value: 'none', n: 0,
      evidence: { align: facts.style(first).scrollSnapAlign }, confidence: 0.85,
      suggest: { kind: 'class', from: '', to, why: 'gives it a place to rest, like the parts beside it', sets: { scrollSnapAlign: to.slice(5) } },
    }];
  },
};

// Something brought into view lands where it can be seen whole. A scroll area that snaps, with a bar stuck across its
// top, rests each part under that bar unless the area keeps room for it. (MDN scroll-padding: it makes room for
// fixed toolbars and sidebars that would cover content.) The same fault as #73 (a link target under a sticky header),
// for snapping instead of links.
export const snapOffset = {
  id: 'craft/snap-offset', family: 'craft', round: { '*': 'up' }, number: [], owns: ['scroll-padding'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    if (el === document.body || el === document.documentElement) return [];
    const s = facts.style(el), snap = snapOf(s);
    if (!snap.on || !snap.y) return [];
    const kids = [...el.children].filter((k) => k.getClientRects().length);
    const bar = kids.find((k) => { const ks = facts.style(k); return ks.position === 'sticky' && px(ks.top) <= 0.5 && k.offsetWidth >= el.clientWidth * 0.6 && k.offsetHeight >= 24 && k.offsetHeight <= 160; });
    if (!bar) return [];
    const h = bar.offsetHeight;
    if (px(s.scrollPaddingTop) >= h - 0.5) return [];
    const parts = kids.filter((k) => k !== bar && facts.style(k).scrollSnapAlign !== 'none');
    if (!parts.length || parts.every((k) => px(facts.style(k).scrollMarginTop) >= h - 0.5)) return [];
    const unit = theme.unit?.() || 4, need = Math.ceil(h / unit - 1e-6) * unit;
    const rec = recommend({ family: 'spacing', prefix: 'scroll-pt', job: 'header', want: { min: Math.ceil(h), target: need }, round: 'up', from: utility(el, 'scroll-pt') ?? '', token: false, sets: (v) => ({ scrollPaddingTop: v }), theme,
      advice: () => `Give it scroll-padding-top: ${fmt(Math.ceil(h))}, the bar’s height.` });
    return [{
      ...say(this.id, { bar: h }),
      key: this.id, text: utility(el, 'scroll-pt') ?? 'scroll-padding-top', props: ['scroll-padding-top'], value: s.scrollPaddingTop, n: px(s.scrollPaddingTop),
      evidence: { bar: h, padding: px(s.scrollPaddingTop) }, confidence: 0.85,
      suggest: rec.kind === 'class' ? { ...rec, why: `the bar’s ${fmt(Math.ceil(h))}` } : rec,
    }];
  },
};

// A scroll stays in the thing you are scrolling. A scroll area drawn over the page (a side panel, a menu, a chat
// list: fixed, stuck in place, or positioned out of the page's flow as a popover is) hands the scroll to the page behind once it reaches its end. (MDN
// overscroll-behavior: "scroll chaining", and that it is sometimes not wanted.) A scroll area in the page's own flow
// (a code block, a wide table) is left alone: there, carrying on down the page is what people expect. A dialog is
// components/dialog-scroll-lock's. MDN marks the property as not yet in every widely used browser; a browser without
// it ignores the declaration and behaves as before, so the fix is written (owner, 2026-11-26: "these seems fixable").
export const scrollChain = {
  id: 'craft/scroll-chain', family: 'craft', number: [], owns: ['overscroll'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    if (el === document.body || el === document.documentElement || el === document.scrollingElement) return [];
    const s = facts.style(el);
    if (!/^(?:auto|scroll)$/.test(s.overflowY) || el.scrollHeight <= el.clientHeight + 4) return [];
    if (s.overscrollBehaviorY && s.overscrollBehaviorY !== 'auto') return [];
    const page = document.scrollingElement;
    if (!page || page.scrollHeight <= page.clientHeight + 4) return []; // nothing behind it to move
    // a dialog that locks the page (overflow hidden on the root or the body) has no page behind it to move, and the
    // dialog check speaks there. One that leaves the page free is a layer the hand rests on, and the page moves at its
    // end (found on a real app, 2026-11-27: a command palette, not marked modal, whose list ran on into the page)
    const layer = el.closest('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]');
    const locked = (n) => /^(?:hidden|clip)$/.test(getComputedStyle(n).overflowY);
    if (layer && (locked(document.documentElement) || locked(document.body))) return [];
    // placed out of flow and laid over what is around it: a box placed against the page itself, or one that reaches
    // outside the box it is placed in (a popover hanging below its button). One that sits inside that box (a pane
    // filling a card, the screen of a drawn device) is part of the card, which is in the page's flow
    // (found on a real app, 2026-11-26: the scrolling editor inside a dialog demo)
    const laidOver = (n) => {
      const cb = n.offsetParent;
      if (!cb || cb === document.body || cb === document.documentElement) return true;
      const a = n.getBoundingClientRect(), b = cb.getBoundingClientRect();
      return a.top < b.top - 2 || a.bottom > b.bottom + 2 || a.left < b.left - 2 || a.right > b.right + 2;
    };
    let held = !!layer;
    for (let n = el, d = 0; n && n !== document.body && d < 4; n = n.parentElement, d++) {
      const p = facts.style(n).position;
      // fixed or stuck in place, or laid over the page out of its flow: a menu or list in a popover (maybepratikk, 2026-11-25)
      if (p === 'fixed' || p === 'sticky' || (p === 'absolute' && laidOver(n)) || n.matches('[popover]')) { held = true; break; }
      // an ancestor that scrolls and contains its own overscroll already stops the chain before the page
      if (n !== el && /^(?:auto|scroll)$/.test(facts.style(n).overflowY) && facts.style(n).overscrollBehaviorY !== 'auto') return [];
    }
    // or a side of the page: a column as tall as most of the window, with another column beside it. The hand rests
    // in it as it would in a fixed panel, and at its end the page moves instead (found on a real app, 2026-11-26: a
    // lesson's film-and-drawing column). A tall block with nothing beside it, a code block or a table, is the page's
    // own reading flow, and chaining there is expected
    if (!held) {
      const r = el.getBoundingClientRect();
      if (r.height < innerHeight * 0.6 || !el.parentElement) return [];
      const beside = [...el.parentElement.children].some((k) => {
        if (k === el) return false;
        const b = k.getBoundingClientRect();
        return b.width > 0 && Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > r.height * 0.5 && (b.left >= r.right - 1 || b.right <= r.left + 1);
      });
      if (!beside) return [];
    }
    return [{
      ...say(this.id, {}),
      key: this.id, text: utility(el, 'overflow-y') ?? utility(el, 'overflow') ?? 'overflow-y', props: ['overscroll-behavior'], value: 'auto', n: 0,
      evidence: { more: Math.round(el.scrollHeight - el.clientHeight), page: Math.round(page.scrollHeight - page.clientHeight) }, confidence: 0.82,
      // written: a browser without the property ignores it and scrolls as it does today, so the fix can only help
      suggest: { kind: 'class', from: '', to: 'overscroll-contain', why: 'the scroll stops at this panel’s end', sets: { overscrollBehaviorY: 'contain' } },
    }];
  },
};

// A control looks like it belongs to the product. A checkbox, radio, slider or progress bar still drawn by the
// browser wears the browser's own accent, usually a blue, beside buttons in the product's colour. (MDN accent-color:
// applies to those four; `auto` is the browser's choice.) The product's colour is read from the page: the most used
// strong colour on its buttons. A page with none, or whose colour is already a blue near the browser's, is left alone.
// Written, for the same reason as scroll-chain. The hue distance and the strength are invented lines, to be tuned.
function brandOf(facts) {
  if (facts.brand !== undefined) return facts.brand;
  const seen = new Map();
  for (const b of document.querySelectorAll('button, [role="button"], input[type="submit"], a[class*="bg-"]')) {
    if (b.closest('plumb-overlay') || !b.getClientRects().length) continue;
    const c = rgb(facts.style(b).backgroundColor);
    if (!c || (c[3] ?? 1) < 0.9 || chroma(c) < 0.09) continue;
    const key = c.slice(0, 3).map((v) => Math.round(v)).join(',');
    const had = seen.get(key) ?? { n: 0, cls: null };
    // the class that gives a button this colour, when it is written as one (bg-emerald-600): the project's own name for it
    seen.set(key, { n: had.n + 1, cls: had.cls ?? utility(b, 'bg', { not: /^(?:\[|transparent|inherit|current|none|gradient|linear|radial|conic|clip|origin|fixed|local|scroll|no-repeat|repeat|cover|contain|center|top|bottom|left|right|blend)/ }) });
  }
  const top = [...seen].sort((a, b) => b[1].n - a[1].n)[0];
  return (facts.brand = top ? Object.assign(top[0].split(',').map(Number), { cls: top[1].cls }) : null);
}
const BROWSER_BLUE = [0, 117, 255]; // Chromium's default accent
export const nativeAccent = {
  id: 'craft/native-accent', family: 'craft', number: [], owns: ['accent'], once: 'ancestor', reads: ['style', 'census'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (!el.matches('input[type="checkbox"], input[type="radio"], input[type="range"], progress')) return [];
    const s = facts.style(el);
    if (s.appearance === 'none' || s.webkitAppearance === 'none' || (s.accentColor && s.accentColor !== 'auto') || !el.getClientRects().length) return [];
    // a native input kept for forms behind a control the page draws itself (Base UI, Radix, React Aria: a pixel,
    // clipped, see-through, or hidden from both the eye and the keyboard) is never seen, so its accent is nobody's
    // (found on a real app, 2026-11-26: Base UI's switch, checkbox and slider)
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2 || parseFloat(s.opacity) < 0.05 || s.visibility === 'hidden' || (s.clipPath && s.clipPath !== 'none') || (s.clip && s.clip !== 'auto')
      || (el.getAttribute('aria-hidden') === 'true' && el.tabIndex < 0)) return [];
    if (matchMedia('(forced-colors: active)').matches) return [];
    const brand = brandOf(facts);
    if (!brand) return [];
    const away = Math.abs(((hueOf(brand) - hueOf(BROWSER_BLUE) + 540) % 360) - 180);
    if (away < (T.hue ?? 30)) return [];
    const kind = el.localName === 'progress' ? 'progress bar' : { checkbox: 'checkbox', radio: 'radio button', range: 'slider' }[el.type];
    return [{
      ...say(this.id, { kind }),
      key: this.id, text: 'accent-color', props: ['accent-color'], value: 'auto', n: Math.round(away),
      evidence: { brand: hex(brand), hueAway: Math.round(away) }, confidence: 0.82,
      // written in the project's own words: the colour class its buttons wear, as an accent. A browser without
      // accent-color ignores it and draws the control as it does today
      suggest: { kind: 'class', from: '', to: brand.cls ? brand.cls.replace(/^(!?)bg-/, '$1accent-') : `accent-[${hex(brand)}]`, why: `${brand.cls ? brand.cls.replace(/^!?bg-/, '') : hex(brand)}, the colour of your buttons`, sets: { accentColor: `rgb(${brand.slice(0, 3).join(', ')})` } },
    }];
  },
};

// Every pixel of a menu belongs to a row. Rows kept apart by a small margin or gap leave strips that belong to no row:
// the pointer crossing from one to the next hovers nothing for a moment, the highlight flickers, and a click there
// does nothing. (maybepratikk, 2026-11-18, read from the post and its video: a 4px strip marked "nothing hovered";
// docs/research/harvests/maybepratikk/tips.md. No specification says this; the ground is the hit-testing itself: a
// gap is not part of either box.) Read from the boxes: three or more rows stacked in one column, each a control or
// filled by one, with the same small space between each pair. Rows set well apart are separate things and are left
// alone. The largest gap read as a strip is an invented line, to be tuned on real apps. The fix keeps the look: the
// rows' hit areas are stretched to meet, which is one of the right answers and the only one that moves nothing.
const rowControl = (k) => (k.matches('a[href], button, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"], [tabindex="0"]') ? k
  : (() => { const inner = k.querySelector('a[href], button, [role="menuitem"], [role="option"]'); return inner && inner.offsetWidth >= k.offsetWidth * 0.9 && inner.offsetHeight >= k.offsetHeight * 0.9 ? inner : null; })());
export const rowDeadZone = {
  id: 'craft/row-dead-zone', family: 'craft', number: [], owns: ['row-gap'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const kids = flowKids(el, facts);
    if (kids.length < (T.least ?? 3) || kids.some((k) => !rowControl(k))) return [];
    // a menu is a list of choices: rows that are controls themselves, or items of a list or menu. Blocks that each
    // hold a control (a list of questions, each a heading with a button) are separate things set apart on purpose
    // (found on a real app, 2026-11-26: a page's questions, 8px apart)
    const listed = el.matches('ul, ol, menu, nav, [role="menu"], [role="menubar"], [role="listbox"], [role="tablist"], [role="radiogroup"], [role="list"], [role="group"], [role="toolbar"]');
    if (!listed && kids.some((k) => rowControl(k) !== k)) return [];
    const boxes = kids.map((k) => rowControl(k).getBoundingClientRect());
    // one column: the same left edge and width, each below the last
    if (!boxes.every((b) => Math.abs(b.left - boxes[0].left) <= 1 && Math.abs(b.width - boxes[0].width) <= 2) || boxes[0].height > (T.row ?? 56)) return [];
    const gaps = boxes.slice(1).map((b, i) => b.top - boxes[i].bottom);
    const gap = Math.min(...gaps), most = Math.max(...gaps);
    if (gap < (T.min ?? 1) || most > (T.max ?? 8)) return [];
    // rows that touch, with the space between their controls taken by the rows' own drawn rule: the strip is the
    // divider, part of a row, and a line a pixel wide is not a place anyone aims for (found on a real app, 2026-11-26)
    if (kids.some((k) => rowControl(k) !== k)) {
      const rows = kids.map((k) => k.getBoundingClientRect());
      const touch = rows.slice(1).every((b, i) => b.top - rows[i].bottom <= 0.5);
      const rule = (i) => px(facts.style(kids[i]).borderBottomWidth) + px(facts.style(kids[i + 1]).borderTopWidth);
      if (touch && gaps.every((g, i) => g <= rule(i) + 0.5)) return [];
    }
    // a row whose own ::before or ::after already reaches into the gap owns those pixels: nothing is dead
    const controls = kids.map(rowControl), half = gap / 2;
    const reach = (c) => ['::before', '::after'].some((p) => { const ps = getComputedStyle(c, p); return ps.content !== 'none' && ps.position === 'absolute' && px(ps.top) <= -half + 0.5 && px(ps.bottom) <= -half + 0.5; });
    if (controls.every(reach)) return [];
    // the fix: each row's hit area grows half the gap up and down, through an invisible ::after. The rows then meet in
    // the middle of the strip; nothing moves and the fill is unchanged. Written once, on the list, for all its rows.
    const direct = controls.every((c, i) => c === kids[i]);
    const nested = !direct && controls.every((c, i) => c.parentElement === kids[i] && c.localName === controls[0].localName && kids[i].localName === kids[0].localName);
    const free = controls.every((c) => { const cs = facts.style(c); return cs.overflowY === 'visible' && cs.display !== 'inline' && getComputedStyle(c, '::after').content === 'none' && /^(?:static|relative)$/.test(cs.position); });
    const v = direct ? '*:' : nested ? `[&>${kids[0].localName}>${controls[0].localName}]:` : null;
    const reachPx = Math.ceil(half);
    const written = v && free ? { kind: 'class', from: '', to: `${v}relative ${v}after:absolute ${v}after:inset-x-0 ${v}after:inset-y-[-${reachPx}px]`, why: `each row reaches ${reachPx}px into the gap, so every pixel belongs to a row; nothing moves`, sets: {} } : null;
    const way = px(facts.style(el).rowGap) > 0 ? 'gap' : 'margin';
    return [{
      ...say(this.id, { gap: Math.round(gap * 10) / 10, n: kids.length }),
      key: this.id, text: (way === 'gap' ? utility(el, 'gap-y') ?? utility(el, 'gap') ?? utility(el, 'space-y') : null) ?? way, props: ['row-gap'], value: `${Math.round(gap * 10) / 10}px`, n: gap,
      evidence: { gap: Math.round(gap * 10) / 10, rows: kids.length, by: way }, confidence: 0.84,
      // written when the rows can take an ::after of their own; else the conditions a good answer meets, as advice
      suggest: written ?? { kind: 'advice', text: `Let the rows touch, and keep the space inside them: more padding on each row, or the hover fill drawn inset (a ::before with inset: ${Math.max(1, Math.round(gap / 2))}px 0). Done when no pixel between two rows hovers nothing, and the menu looks the same at rest.` },
    }];
  },
};

// ── from CSS Protips (docs/research/harvests/css-protips/tips.md): nine faults the tips prevent, read on the page ──

const isBitmap = (el) => { const src = el.currentSrc || el.getAttribute('src') || ''; return !!src && !/\.svg(?:[?#]|$)/i.test(src) && !/^data:image\/svg/i.test(src); };

// A picture that did not load is a hole in the page: an empty box, or the browser's broken-image mark and the alt
// words in its place. (The HTML standard's "broken" state of an image: the load finished and there is no picture.)
// Plumber can see it and cannot mend it: the right address is the project's to know.
export const imageBroken = {
  id: 'craft/image-broken', family: 'craft', number: [], on: 'img', owns: ['image-load'], once: 'ancestor', reads: ['style'],
  check({ el }) {
    if (el.localName !== 'img' || !el.complete || el.naturalWidth > 0 || !isBitmap(el) || !el.getClientRects().length) return [];
    const src = el.getAttribute('src') ?? el.currentSrc;
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'src', props: ['src'], value: String(src).slice(-60), n: 0,
      evidence: { src: String(src).slice(0, 200) }, confidence: 0.95,
      suggest: { kind: 'advice', text: `Nothing loads from ${String(src).length > 48 ? `…${String(src).slice(-48)}` : src}. Fix the address, or the file it points to.` },
    }];
  },
};

// Something that holds no content should take no room. An element made to hold words or items (a paragraph, a
// heading, a list, an error line) that is empty still draws its padding, border and background and still keeps its
// margins: a blank chip, or a gap where nothing is. (CSS Protips, "Use :empty to hide empty HTML elements"; MDN :empty.)
// Boxes that are empty by design (a divider, a dot, a spacer, a skeleton) are not these elements and are left alone.
const HOLDS = 'p, h1, h2, h3, h4, h5, h6, ul, ol, dl, blockquote, figcaption, label, legend, caption, [role="alert"], [role="status"]';
export const emptyBox = {
  id: 'craft/empty-box', family: 'craft', number: [], on: 'p,h1,h2,h3,h4,h5,h6,ul,ol,dl,blockquote,figcaption,label,legend,caption,[role="alert"],[role="status"]', owns: ['empty'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    if (!el.matches(HOLDS) || el.children.length || el.textContent.trim() || el.closest('[aria-hidden="true"]')) return [];
    const s = facts.style(el);
    if (s.display === 'none' || s.backgroundImage !== 'none') return [];
    if (['::before', '::after'].some((p) => !/^(?:none|normal)$/.test(getComputedStyle(el, p).content))) return [];
    const r = facts.rect(el);
    // kept for a screen reader and hidden from the eye (sr-only: a pixel, clipped, out of the flow): an empty status
    // line of that kind is waiting to speak, and takes no room (found on a real app, 2026-11-26)
    if ((r.width <= 2 && r.height <= 2) || /^(?:absolute|fixed)$/.test(s.position) || (s.clipPath && s.clipPath !== 'none') || (s.clip && s.clip !== 'auto')) return [];
    // space kept on purpose: an empty box whose own content area still has a height was given one (h-9, a min-height,
    // an aspect ratio) to hold the place of what is still to come, so the page doesn't jump when it arrives. Hiding it
    // would bring the jump back (found on a real app, 2026-11-26: the row of versions under a film)
    if (!/^inline/.test(s.display) && r.height - px(s.paddingTop) - px(s.paddingBottom) - px(s.borderTopWidth) - px(s.borderBottomWidth) > 0.5) return [];
    const room = (r.width >= 1 && r.height >= 1) || px(s.marginTop) + px(s.marginBottom) > 0;
    if (!room) return [];
    const bare = el.childNodes.length === 0; // :empty is true only with nothing inside, not even a space
    return [{
      ...say(this.id, { tag: el.localName }),
      key: this.id, text: el.localName, props: ['display'], value: s.display, n: Math.round(r.height),
      evidence: { height: Math.round(r.height), margin: px(s.marginTop) + px(s.marginBottom) }, confidence: 0.84,
      suggest: bare ? { kind: 'class', from: '', to: 'empty:hidden', why: 'takes no room while it holds nothing', sets: { display: 'none' }, moves: true }
        : { kind: 'advice', text: 'Draw it only when it has something to hold (it has a space inside, so :empty would not match it).' },
    }];
  },
};

// A link in a sentence has to look like a link without relying on colour. One with no underline, no heavier weight
// and no other mark is told from the words around it by colour alone, or not at all. (WCAG 1.4.1 Use of Color, and its
// failure F73: links in text that differ only by colour; read 2026-11-26.) Links in a menu, a list of links or a button are not in a
// sentence and are left alone: the words around a link are what make it need the mark.
export const linkInText = {
  id: 'craft/link-in-text', family: 'craft', number: [], on: 'a', owns: ['text-decoration'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el.localName !== 'a' || !el.hasAttribute('href') || !el.textContent.trim() || !el.getClientRects().length) return [];
    const host = el.parentElement;
    if (!host) return [];
    const around = [...host.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim().length;
    if (around < (T.around ?? 20)) return [];
    const s = facts.style(el), hs = facts.style(host);
    const lined = (st) => /underline/.test(st.textDecorationLine ?? '');
    if (lined(s) || [...el.querySelectorAll('*')].some((n) => lined(facts.style(n)))) return [];
    if (px(s.borderBottomWidth) > 0 || Number(s.fontWeight) - Number(hs.fontWeight) >= 200 || s.fontStyle !== hs.fontStyle) return [];
    const bg = rgb(s.backgroundColor);
    if (bg && (bg[3] ?? 1) > 0.05) return []; // a chip or a highlighted link is marked another way
    // F73 passes a link that is lighter or darker than its sentence by 3:1 or more: lightness is not colour
    const lum = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const lc = rgb(s.color), tc = rgb(hs.color);
    if (lc && tc) { const a = lum(lc), b = lum(tc); if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= (T.lightness ?? 3)) return []; }
    return [{
      ...say(this.id, { same: s.color === hs.color }),
      key: this.id, text: utility(el, 'decoration') ?? 'text-decoration', props: ['text-decoration-line'], value: s.textDecorationLine, n: 0,
      evidence: { color: s.color, around: hs.color }, confidence: 0.85,
      suggest: { kind: 'class', from: /(?:^|\s)(!?no-underline!?)(?:\s|$)/.exec(classesOf(el))?.[1] ?? '', to: 'underline', why: 'a link in a sentence shows without relying on colour', sets: { textDecorationLine: 'underline' } },
    }];
  },
};

// A divider sits between two things. Rows that each carry the same line, the last one too, end on a line that
// separates the last row from nothing: it doubles the box's own edge or runs into its rounded corner. (CSS Protips,
// ":not() to apply/unapply borders". No standard says this; the ground is the word divider.) Said only where the rows
// end flush against the edge of a box (it has a border, a rounded corner or a clip); a free-standing list may end on a rule.
export const lastDivider = {
  // owns the end of the run, not the dividers: tells/divider judges whether rows should be split by lines at all, and
  // both are said. Sharing its facet hid that finding until this one was fixed (found by scripts/proof/on-off.mjs).
  id: 'craft/last-divider', family: 'craft', number: [], owns: ['divider-end'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    const kids = flowKids(el, facts);
    if (kids.length < 3 || !kids.every((k) => k.localName === kids[0].localName)) return [];
    const es = facts.style(el), er = el.getBoundingClientRect(), last = kids.at(-1), lr = last.getBoundingClientRect();
    for (const [Side, short, column] of [['Bottom', 'b', true], ['Right', 'r', false]]) {
      const ks = kids.map((k) => facts.style(k));
      if (!ks.every((st) => px(st[`border${Side}Width`]) > 0 && st[`border${Side}Style`] !== 'none' && st[`border${Side}Color`] === ks[0][`border${Side}Color`])) continue;
      const rects = kids.map((k) => k.getBoundingClientRect());
      const stacked = rects.slice(1).every((r, i) => (column ? r.top >= rects[i].bottom - 1 && Math.abs(r.left - rects[0].left) <= 1 : r.left >= rects[i].right - 1 && Math.abs(r.top - rects[0].top) <= 1));
      if (!stacked) continue;
      const edge = column ? er.bottom - px(es.borderBottomWidth) : er.right - px(es.borderRightWidth);
      if (Math.abs((column ? lr.bottom : lr.right) - edge) > 1) continue; // space after the last row: the line is not on the box's edge
      const boxed = px(es[`border${Side}Width`]) > 0 || px(es.borderBottomRightRadius) > 0 || es.overflowX !== 'visible' || es.overflowY !== 'visible';
      if (!boxed) continue;
      return [{
        ...say(this.id, { n: kids.length, doubled: px(es[`border${Side}Width`]) > 0 }),
        key: this.id, text: `border-${short}`, props: [`border-${Side.toLowerCase()}-width`], value: ks.at(-1)[`border${Side}Width`], n: kids.length,
        evidence: { rows: kids.length, side: Side.toLowerCase() }, confidence: 0.84,
        // written once, on the list: its last row loses the line
        suggest: { kind: 'class', from: '', to: `[&>*:last-child]:border-${short}-0`, why: 'the last row has nothing below it to be divided from', sets: {}, moves: true },
      }];
    }
    return [];
  },
};

// A box told to fill its parent should fit inside it. Sized by its content box, its padding and border are added on
// top of the full width, so it sticks out of its parent by exactly that much. (MDN box-sizing: with content-box, the
// width does not include padding or border.) Read from what is measured: content-box, wider than the room its parent
// gives, by its own padding and border and nothing else.
export const boxOverflow = {
  id: 'craft/box-overflow', family: 'craft', number: [], owns: ['box-sizing'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }) {
    const s = facts.style(el);
    if (s.boxSizing !== 'content-box' || /inline|table|contents|none/.test(s.display) || /^(?:absolute|fixed)$/.test(s.position)) return [];
    if (/^(?:img|svg|video|canvas|iframe|input|textarea|select|button|html|body)$/.test(el.localName)) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.documentElement) return [];
    const ps = facts.style(parent);
    const room = parent.clientWidth - px(ps.paddingLeft) - px(ps.paddingRight);
    const own = px(s.paddingLeft) + px(s.paddingRight) + px(s.borderLeftWidth) + px(s.borderRightWidth);
    const over = el.offsetWidth - room;
    if (own < 2 || room <= 0 || Math.abs(over - own) > 1) return [];
    return [{
      ...say(this.id, { over: Math.round(over) }),
      key: this.id, text: utility(el, 'box') ?? 'box-sizing', props: ['box-sizing'], value: 'content-box', n: Math.round(over),
      evidence: { over: Math.round(over), padding: Math.round(own) }, confidence: 0.9,
      suggest: { kind: 'class', from: utility(el, 'box') ?? '', to: 'box-border', why: 'its padding and border count inside its width', sets: { boxSizing: 'border-box' } },
    }];
  },
};

// An icon is drawn sharp. A small bitmap drawn at more than half its own pixel size has fewer pixels than a sharp
// (2×) screen needs, and reads soft beside vector text. (CSS Protips, "Use SVG for icons".) An image that offers
// another file for sharp screens (srcset) is left alone; the size that counts as an icon is an invented line.
export const iconSoft = {
  id: 'craft/icon-soft', family: 'craft', number: [], on: 'img', owns: ['image-pixels'], once: 'ancestor', reads: ['style', 'rect'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    if (el.localName !== 'img' || !el.complete || !el.naturalWidth || !isBitmap(el) || el.hasAttribute('srcset') || el.closest('picture')) return [];
    const r = facts.rect(el), w = el.offsetWidth || r.width, h = el.offsetHeight || r.height;
    if (w < 8 || w > (T.icon ?? 64) || h > (T.icon ?? 64)) return [];
    if (el.naturalWidth >= w * 2 - 1) return [];
    return [{
      ...say(this.id, { has: el.naturalWidth, drawn: Math.round(w) }),
      key: this.id, text: 'src', props: ['src'], value: `${el.naturalWidth}px`, n: el.naturalWidth,
      evidence: { pixels: el.naturalWidth, drawn: Math.round(w) }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Use an SVG, or a file at least ${Math.round(w * 2)}px wide: it is drawn at ${Math.round(w)}px and a sharp screen needs twice that.` },
    }];
  },
};

// What the page's own stylesheets say that computed style does not keep: words drawn by ::before and ::after, and
// font sizes written in viewport units alone. Read once a second at most; a stylesheet from another origin can't be
// read and is skipped.
const WORDY = /[A-Za-z]{3,}/;
let sheets = { at: -1e9, words: [], fluid: [] };
function sheetFacts() {
  if (performance.now() - sheets.at < 1000) return sheets;
  const words = [], fluid = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r.cssRules?.length) { try { walk(r.cssRules); } catch { /* unreadable */ } }
      if (!r.selectorText || !r.style) continue;
      // any rule that gives a ::before or ::after its content: what it draws is read from the element, since the
      // value is often a variable here (Tailwind writes content: var(--tw-content))
      if (r.style.content && /::?(?:before|after)/.test(r.selectorText)) {
        for (const sel of r.selectorText.split(',')) { const m = /^(.*?)::?(before|after)\s*$/.exec(sel.trim()); if (m) words.push({ sel: m[1].trim() || '*', pseudo: m[2] }); }
      }
      const fs = r.style.fontSize;
      if (fs && /\d(?:vw|vh|vmin|vmax|vi|vb|[sdl]v[wh])\b/.test(fs) && !/\d(?:rem|em|px|pt|%|ch|ex)\b/.test(fs)) fluid.push({ sel: r.selectorText, value: fs });
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* another origin */ } }
  return (sheets = { at: performance.now(), words, fluid });
}
const matchesAny = (el, list) => list.find((x) => { try { return el.matches(x.sel); } catch { return false; } });

// Words belong in the page. Words drawn by CSS (::before, ::after) can't be selected, copied, found by a search of
// the page or translated with the rest, and some readers skip them. (MDN content: generated content is not in the
// DOM.) A mark or a symbol drawn that way is fine; words are said.
export const cssWords = {
  id: 'craft/css-words', family: 'craft', number: [], owns: ['content'], once: 'ancestor', reads: ['style'],
  check({ el }) {
    const list = sheetFacts().words;
    if (!list.length) return [];
    if (!el.getClientRects().length) return [];
    // every pseudo-element a rule gives this element, read as it is drawn: the strings in its content
    let text = '', pseudo = null;
    for (const x of list) {
      let on = false; try { on = el.matches(x.sel); } catch { /* a selector this can't read */ }
      if (!on) continue;
      const c = getComputedStyle(el, `::${x.pseudo}`).content;
      const said = (c.match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((q) => q.slice(1, -1)).join(' ').trim();
      if (WORDY.test(said)) { text = said; pseudo = x.pseudo; break; }
    }
    if (!text) return [];
    return [{
      ...say(this.id, { words: text.slice(0, 40) }),
      key: this.id, text: 'content', props: ['content'], value: text.slice(0, 40), n: text.length,
      evidence: { words: text.slice(0, 80), pseudo }, confidence: 0.82,
      suggest: { kind: 'advice', text: `Write “${text.slice(0, 40)}” in the markup, not in CSS content: drawn by CSS it can’t be selected, copied or translated.` },
    }];
  },
};

// Text grows when the person makes it grow. A font size written in viewport units alone follows the window and
// nothing else: zooming the page leaves it the same size. (WCAG 1.4.4 Resize Text.) A size with a part that follows
// the text size (a rem in a calc or a clamp) is fine. The answer changes how the type scales, so it is advice.
export const typeViewport = {
  id: 'craft/type-viewport', family: 'craft', number: [], owns: ['font-size'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }) {
    const list = sheetFacts().fluid;
    if (!list.length || !facts.text(el)) return [];
    const hit = matchesAny(el, list);
    if (!hit) return [];
    return [{
      ...say(this.id, { value: hit.value }),
      key: this.id, text: utility(el, 'text') ?? 'font-size', props: ['font-size'], value: hit.value, n: 0,
      evidence: { written: hit.value }, confidence: 0.84,
      suggest: { kind: 'advice', text: `Give ${hit.value} a part that follows the text size: clamp(1rem, ${hit.value}, 2.5rem), or calc(1rem + ${hit.value}).` },
    }];
  },
};

// Space is set by the layout. Two line breaks in a row are a gap made of blank lines: no spacing step sets it, it
// can't change with the screen, and a screen reader may say "blank". (CSS Protips, citing Harry Roberts.) Said on the
// first break of the run. The mending is a change of structure (two paragraphs, or a margin), so it is advice.
export const brSpacing = {
  id: 'craft/br-spacing', family: 'craft', number: [], on: 'br', owns: ['line-break'], once: 'ancestor', reads: ['style'],
  check({ el }) {
    if (el.localName !== 'br') return [];
    const beside = (n, dir) => { let x = n[dir]; while (x && x.nodeType === 3 && !x.textContent.trim()) x = x[dir]; return x; };
    const next = beside(el, 'nextSibling'), prev = beside(el, 'previousSibling');
    if (next?.localName !== 'br' || prev?.localName === 'br') return [];
    let n = 1; for (let x = next; x?.localName === 'br'; x = beside(x, 'nextSibling')) n++;
    return [{
      ...say(this.id, { n }),
      key: this.id, text: 'br', props: ['display'], value: `${n} breaks`, n,
      evidence: { breaks: n }, confidence: 0.84,
      suggest: { kind: 'advice', text: 'Make these two paragraphs, or put the space in a margin: the gap then follows your spacing steps.' },
    }];
  },
};

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel, hairline, imageOutline, layeredShadow, scaleFromZero, zIndexWar, contentAlign,
  buttonPadding, iconSide, measure, leading, tracking, tabularNums, headingWidow, oneLight, borderOnShadow, contrast, wordsOnLayers, disabledContrast, hitTarget, mediaSize, imageFit, flexMin, imageGround, stickyRoom, fixedHeight, scrollOnDemand, declaredGap, listWrap, imageStretch, backgroundTile, fixedColumn,
  truncateIntent, scrollbarGutter, boldHover, hangingQuote, capsCase, gradientSpace, inputZoom, anchorOffset, middleTruncate,
  textWrapRole, continuousCorners, opticalSizing, tintedShadow, easedScrim, pureBlackWhite, contentSize,
  baselineAlign, iconCap, trimLeading, headingLead, pairSpacing, cardOpticalPadding, textCollision,
  weightLevels, greyLevels, rhythm, elevationLadder,
  opticalCentre, overshoot, strokeWeight, scrollCue, pressFeedback, exitFaster, interruptible, rowLines, sharedEdges, actionFit,
  snapRest, snapStrict, snapUnreachable, snapOffset, scrollChain, nativeAccent, rowDeadZone,
  imageBroken, emptyBox, linkInText, lastDivider, boxOverflow, iconSoft, cssWords, typeViewport, brSpacing, ...RANK_RULES, ...RUN_RULES];

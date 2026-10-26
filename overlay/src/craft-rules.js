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

export const RULES = [concentricRadius, innerOuterSpacing, textOpacity, halfPixel];

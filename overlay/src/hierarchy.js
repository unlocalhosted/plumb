/* ─────────────────────────────────────────────────────────
 * HIERARCHY · Plumb overlay
 *
 * The rules of docs/research/hierarchy.md, pure: the DOM, computed style and the theme's scales in, data out, no
 * drawing. Nothing here enforces; the editor marks the step that fits and dims the steps that would break an order
 * the group keeps, and un-sloppify previews every change before one Use.
 *
 *  contextOf(el, scale)  → { role, container, peers, levels, fits: { [prop]: { step, reason, breaks } } }
 *  tidy(scope, scale)    → [{ el, prop, from, to, rule, reason }] in the order T3, T1, S2, S1/S3, L2, L3
 *
 *  scale   { sizes: [px…] (the type scale), weights: [n…], spacing: [px…], radii: [px…] }; what is missing is read
 *          from the page's own values (the peers' sizes, 4px spacing multiples), so the module works without a theme
 *  level   a rung within a container: elements with one bundle (size, weight, caps), ordered by size then weight;
 *          the owner's decisions: one theme step between levels (Q1), a weight step at equal size is a level (Q3),
 *          inside < between ≤ around (Q2), the title's bundle stays and lower levels move (Q4), L3 may move a
 *          margin or padding by one step at most (Q5)
 * ───────────────────────────────────────────────────────── */

import { lawsOf } from './laws.js';

const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const letters = (s) => /[\p{L}\p{N}]/u.test(s ?? '');
const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
const containerTags = new Set(['li', 'article', 'section', 'aside', 'header', 'footer', 'figure', 'nav', 'main', 'dialog']);
const DEFAULT_SPACING = [0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96];
const DEFAULT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const isContainer = (el) => {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (containerTags.has(el.localName)) return true;
  const cs = getComputedStyle(el);
  const padded = px(cs.paddingTop) + px(cs.paddingLeft) > 0;
  const bounded = px(cs.borderRadius) > 0 || px(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
  if (padded && bounded) return true;
  return /^(?:flex|inline-flex|grid|inline-grid)$/.test(cs.display) && el.children.length >= 2;
};
/** The nearest ancestor that groups its children. */
export function containerOf(el) {
  for (let n = el?.parentElement; n; n = n.parentElement) if (isContainer(n)) return n;
  return el?.parentElement ?? null;
}

const bundleOf = (el) => {
  const cs = getComputedStyle(el), size = px(cs.fontSize);
  return { size, weight: parseInt(cs.fontWeight, 10) || 400, lineHeight: cs.lineHeight === 'normal' ? null : px(cs.lineHeight), letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing), caps: cs.textTransform === 'uppercase', color: cs.color, muted: /\/\s*0?\.\d+\)$/.test(cs.color) };
};
const key = (b) => `${b.size}|${b.weight}|${b.caps ? 'caps' : ''}`;
// an inline run inside running text (bold or emphasised words in a paragraph) is part of that paragraph, not a level
const inRun = (el) => getComputedStyle(el).display === 'inline' && letters(ownText(el.parentElement ?? el));
const texts = (container) => [...container.querySelectorAll('*')].filter((el) => !el.closest('plumb-overlay') && letters(ownText(el)) && getComputedStyle(el).display !== 'none' && !inRun(el));
// the same kind of thing: drawn by the same line of code (its stamp), else the same tag wearing the same classes
const stampOf = (el) => el.getAttribute('data-plumb-source')?.split('#')[0] ?? null;
const sameKind = (a, b) => { const sa = stampOf(a), sb = stampOf(b); return sa && sb ? sa === sb : a.localName === b.localName && (a.getAttribute('class') ?? '') === (b.getAttribute('class') ?? ''); };
// a shape, not a corner: a circle or a pill (rounded-full reads as a huge radius); never "fixed"
const shaped = (el, r) => { const b = el.getBoundingClientRect(); return r >= Math.min(b.width, b.height) / 2 - 0.5; };
// a control people press or type into: its corner is part of what it is, never flattened
const control = (el) => /^(?:button|input|select|textarea)$/.test(el.localName) || (el.localName === 'a' && el.hasAttribute('href')) || /^(?:button|link|tab|checkbox|switch|menuitem)$/.test(el.getAttribute('role') ?? '');
const mode = (values) => { const counts = new Map(); for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1); return [...counts].sort((a, b) => b[1] - a[1] || (a[0] > b[0] ? 1 : -1))[0]?.[0]; };
const nearest = (steps, value) => steps.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best), steps[0]);
const stepBelow = (steps, value) => [...steps].filter((s) => s < value).at(-1) ?? null;
const stepAbove = (steps, value) => steps.find((s) => s > value) ?? null;

/** The levels of a container: its text elements grouped by bundle, ordered title first (T1), named by position (T2). */
export function levelsOf(container) {
  const members = texts(container).map((el) => ({ el, bundle: bundleOf(el) }));
  const groups = new Map();
  for (const m of members) { const k = key(m.bundle); if (!groups.has(k)) groups.set(k, { bundle: m.bundle, members: [] }); groups.get(k).members.push(m.el); }
  const levels = [...groups.values()].sort((a, b) => b.bundle.size - a.bundle.size || b.bundle.weight - a.bundle.weight || Number(a.bundle.caps) - Number(b.bundle.caps));
  levels.forEach((level, i) => {
    const small = i === levels.length - 1 && levels.length > 1, smallest = level.bundle.size <= (levels[0]?.bundle.size ?? 0) * 0.8;
    level.index = i;
    level.role = i === 0 ? 'title' : level.bundle.caps && smallest ? 'meta' : i === 1 && level.bundle.size === levels[0].bundle.size ? 'subtitle' : small && smallest && level.bundle.muted ? 'meta' : 'body';
  });
  return levels;
}

/** The space of a container: the gaps inside it, the gaps between it and its siblings, and its padding (S1). */
export function spaceOf(container) {
  const kids = [...container.children].filter((k) => !k.closest('plumb-overlay') && k.getBoundingClientRect().height > 0);
  const cs = getComputedStyle(container), vertical = !/^(?:flex|inline-flex)$/.test(cs.display) || cs.flexDirection.startsWith('column');
  const rects = kids.map((k) => k.getBoundingClientRect());
  const inside = rects.slice(1).map((r, i) => Math.round((vertical ? r.top - rects[i].bottom : r.left - rects[i].right) * 100) / 100).filter((g) => g >= 0);
  const siblings = container.parentElement ? [...container.parentElement.children].filter((s) => !s.closest('plumb-overlay') && s.getBoundingClientRect().height > 0) : [];
  const at = siblings.indexOf(container);
  const between = [];
  if (at > 0) between.push(Math.round((container.getBoundingClientRect().top - siblings[at - 1].getBoundingClientRect().bottom) * 100) / 100);
  if (at >= 0 && at < siblings.length - 1) between.push(Math.round((siblings[at + 1].getBoundingClientRect().top - container.getBoundingClientRect().bottom) * 100) / 100);
  const padding = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  return { inside, between: between.filter((g) => g >= 0), padding, around: Math.min(padding.top, padding.bottom, padding.left, padding.right), gap: cs.gap === 'normal' ? null : px(cs.gap) };
}

const scaleFor = (scale, levels) => ({
  sizes: scale?.sizes?.length ? [...scale.sizes].sort((a, b) => a - b) : [...new Set(levels.map((l) => l.bundle.size))].sort((a, b) => a - b),
  weights: scale?.weights?.length ? [...scale.weights].sort((a, b) => a - b) : DEFAULT_WEIGHTS,
  spacing: scale?.spacing?.length ? [...scale.spacing].sort((a, b) => a - b) : DEFAULT_SPACING,
  radii: scale?.radii?.length ? [...scale.radii].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48],
});

/**
 * What the context says about one element: its role among its container's levels, its peers (siblings and
 * cousins), and, per property, the step that fits and the steps that would break the order the group keeps.
 */
export function contextOf(el, scale) {
  const container = containerOf(el);
  if (!container) return { role: null, container: null, peers: [], levels: [], fits: {} };
  const levels = levelsOf(container), s = scaleFor(scale, levels);
  const own = levels.find((l) => l.members.includes(el)) ?? null;
  const siblings = [...container.children].filter((c) => c !== el && !c.closest('plumb-overlay'));
  const index = [...el.parentElement.children].indexOf(el);
  const cousins = container.parentElement ? [...container.parentElement.children].filter((c) => c !== container).map((c) => c.children[index]).filter(Boolean) : [];
  const peers = [...siblings, ...cousins];
  const fits = {};
  if (own) {
    const upper = levels[own.index - 1], lower = levels[own.index + 1];
    // T1/T3: the fit is the level's bundle; sizes at or past a neighbouring level break the order
    const breaksSize = s.sizes.filter((size) => (upper && size >= upper.bundle.size) || (lower && size <= lower.bundle.size && own.bundle.size !== lower.bundle.size));
    fits['font-size'] = { step: own.bundle.size, reason: `${own.role}: level ${own.index + 1} of ${levels.length} in this ${container.localName}${upper ? `, below ${upper.role} at ${upper.bundle.size}px` : ''}${lower ? `, above ${lower.role} at ${lower.bundle.size}px` : ''}`, breaks: breaksSize, rule: 'T1' };
    const sameSizeUpper = upper && upper.bundle.size === own.bundle.size ? upper : null, sameSizeLower = lower && lower.bundle.size === own.bundle.size ? lower : null;
    fits['font-weight'] = { step: own.bundle.weight, reason: sameSizeUpper || sameSizeLower ? `${own.role}: at ${own.bundle.size}px the weight orders the levels (${[sameSizeUpper?.role, sameSizeLower?.role].filter(Boolean).join(', ')})` : `${own.role}: the level's weight`, breaks: s.weights.filter((w) => (sameSizeUpper && w >= sameSizeUpper.bundle.weight) || (sameSizeLower && w <= sameSizeLower.bundle.weight)), rule: 'T1' };
  }
  // S1/S2: an element that is itself a container has its own space levels
  if (isContainer(el)) {
    const space = spaceOf(el), insideFit = space.inside.length ? nearest(s.spacing, mode(space.inside)) : null, betweenFit = space.between.length ? nearest(s.spacing, mode(space.between)) : null;
    if (insideFit !== null) fits.gap = { step: insideFit, reason: `inside this ${el.localName}: ${space.inside.length} gaps, most ${insideFit}px${betweenFit !== null ? `; the gap between ${el.localName}s is ${betweenFit}px` : ''}`, breaks: betweenFit !== null ? s.spacing.filter((g) => g >= betweenFit) : [], rule: 'S1' };
    if (betweenFit !== null) fits.padding = { step: Math.max(nearest(s.spacing, space.around), betweenFit), reason: `around: at or above the ${betweenFit}px between ${el.localName}s`, breaks: s.spacing.filter((g) => g < betweenFit), rule: 'S1' };
  }
  // L2: inside a rounded container, the radius that keeps the corners concentric
  if (container && px(getComputedStyle(container).borderRadius) > 0) {
    const outer = px(getComputedStyle(container).borderRadius), inset = Math.min(spaceOf(container).padding.top, spaceOf(container).padding.left);
    const concentric = nearest(s.radii, Math.max(0, outer - inset));
    fits.radius = { step: concentric, reason: `concentric with the ${container.localName}'s ${outer}px corner, ${inset}px in`, breaks: s.radii.filter((r) => r > outer), rule: 'L2' };
  }
  return { role: own?.role ?? null, container, peers, levels: levels.map((l) => ({ index: l.index, role: l.role, bundle: l.bundle, members: l.members })), fits };
}

/**
 * Un-sloppify: the changes that bring a scope (a card, a container) to its own hierarchy, in order: T3 same level
 * same values, T1 levels a step apart (lower levels move), S2 even gaps, S1/S3 space on its levels, L2 concentric
 * radii, L3 aligned edges (one step at most). Data only; nothing on the page changes. Never the title's bundle,
 * anything outside the scope, a runtime value, a drawing or a colour.
 */
export function tidy(scope, scale) {
  const changes = [];
  const container = isContainer(scope) ? scope : containerOf(scope);
  if (!container) return changes;
  const levels = levelsOf(container), s = scaleFor(scale, levels);
  const add = (el, prop, from, to, rule, reason, extra = {}) => { if (from !== to && to !== null && to !== undefined && !changes.some((c) => c.el === el && c.prop === prop)) changes.push({ el, prop, from, to, rule, reason, laws: lawsOf(`hierarchy/${rule}`), ...extra }); };
  // padding raised to a level: only the sides below it move (a 10px by 14px card raised to 12 keeps its 14px sides)
  const raise = (to) => Object.fromEntries(Object.entries(space.padding).map(([side, v]) => [side, Math.max(v, to)]));
  const runtime = (el) => /var\(--z|calc\(/.test(el.getAttribute('class') ?? '') || el.closest('svg') || el.localName === 'text';
  // T3: cousins at the same level (the same index in sibling containers) share the modal bundle
  // the cards beside it are cards of the same kind (cards of another kind beside it set nothing for it)
  const siblings = container.parentElement ? [...container.parentElement.children].filter((c) => isContainer(c) && c !== container && sameKind(c, container)) : [];
  for (const level of levels) for (const el of level.members) {
    if (runtime(el)) continue;
    const index = [...el.parentElement.children].indexOf(el), depthParent = el.parentElement;
    const cousins = siblings.map((c) => { let p = c; for (const step of pathTo(container, depthParent)) p = p?.children[step]; return p?.children[index]; }).filter((c) => c && c.localName === el.localName && letters(ownText(c))).map(bundleOf);
    if (cousins.length < 2) continue;
    const size = mode(cousins.map((b) => b.size)), weight = mode(cousins.map((b) => b.weight));
    if (cousins.filter((b) => b.size === size).length > cousins.length / 2) add(el, 'font-size', level.bundle.size, size, 'T3', `${level.role}: ${cousins.filter((b) => b.size === size).length} of ${cousins.length} peers are ${size}px`);
    if (cousins.filter((b) => b.weight === weight).length > cousins.length / 2) add(el, 'font-weight', level.bundle.weight, weight, 'T3', `${level.role}: ${cousins.filter((b) => b.weight === weight).length} of ${cousins.length} peers are ${weight}`);
  }
  // T1: adjacent levels at least one step apart; the title stays (Q4), the lower level moves down (Q1, Q3)
  for (let i = 1; i < levels.length; i++) {
    const upper = levels[i - 1], lower = levels[i];
    const sizeApart = upper.bundle.size > lower.bundle.size, weightApart = upper.bundle.size === lower.bundle.size && upper.bundle.weight > lower.bundle.weight;
    if (sizeApart || weightApart) continue;
    for (const el of lower.members) {
      if (runtime(el)) continue;
      if (lower.bundle.size === upper.bundle.size) {
        const below = stepBelow(s.weights, upper.bundle.weight);
        if (below !== null) add(el, 'font-weight', lower.bundle.weight, below, 'T1', `${lower.role} at the ${upper.role}'s size and weight: one weight step down`);
      } else {
        const below = stepBelow(s.sizes, upper.bundle.size);
        if (below !== null) add(el, 'font-size', lower.bundle.size, below, 'T1', `${lower.role} larger than the ${upper.role}: one size step below it`);
      }
    }
  }
  // S2: even gaps inside; S1/S3: the levels of space, the smaller change wins
  const space = spaceOf(container), kids = [...container.children].filter((k) => !k.closest('plumb-overlay') && k.getBoundingClientRect().height > 0);
  if (space.inside.length >= 2 && new Set(space.inside).size > 1) {
    const even = nearest(s.spacing, mode(space.inside));
    add(container, 'gap', space.gap ?? space.inside.join('/'), even, 'S2', `${space.inside.length} gaps of ${[...new Set(space.inside)].join(', ')}px; most ${even}px`);
  }
  if (space.inside.length && space.between.length) {
    const inside = nearest(s.spacing, mode(space.inside)), between = nearest(s.spacing, mode(space.between));
    if (inside >= between) {
      const lowerInside = stepBelow(s.spacing, between), raisePadding = stepAbove(s.spacing, inside);
      const viaGap = lowerInside !== null ? inside - lowerInside : Infinity, viaPadding = raisePadding !== null ? raisePadding - space.around : Infinity;
      if (viaGap <= viaPadding && lowerInside !== null) add(container, 'gap', inside, lowerInside, 'S1', `inside ${inside}px is not below the ${between}px between ${container.localName}s`);
      else if (raisePadding !== null) add(container, 'padding', space.around, raisePadding, 'S1', `around ${space.around}px is not above the ${inside}px inside`, { sides: raise(raisePadding) });
    } else if (space.around < between && space.around > 0) { const to = nearest(s.spacing, between); add(container, 'padding', space.around, to, 'S3', `around ${space.around}px is below the ${between}px between ${container.localName}s`, { sides: raise(to) }); }
  }
  // L2: inner corners concentric with the container's. A shape (a circle, a pill) is what it is, inside a pill or not;
  // a control keeps a corner (never flattened to 0)
  const outer = px(getComputedStyle(container).borderRadius);
  if (outer > 0 && !shaped(container, outer)) for (const kid of kids) {
    const r = px(getComputedStyle(kid).borderRadius);
    if (!r || runtime(kid) || shaped(kid, r)) continue;
    const rect = kid.getBoundingClientRect(), box = container.getBoundingClientRect();
    const inset = Math.round(Math.min(rect.left - box.left, rect.top - box.top) * 100) / 100;
    const want = nearest(s.radii, Math.max(0, outer - inset));
    if (want === 0 && control(kid)) continue;
    if (Math.abs(want - r) >= 1) add(kid, 'radius', r, want, 'L2', `concentric with the ${container.localName}'s ${outer}px corner, ${inset}px in`);
  }
  // L3: edges within one step of the common edge align to it (a margin of one step at most)
  const lefts = kids.map((k) => Math.round(k.getBoundingClientRect().left));
  if (lefts.length >= 2) {
    const common = mode(lefts), step = s.spacing.find((g) => g > 0) ?? 4;
    for (const [i, kid] of kids.entries()) { const off = lefts[i] - common; if (off !== 0 && Math.abs(off) <= step * 2 && !runtime(kid)) add(kid, 'margin-left', px(getComputedStyle(kid).marginLeft), px(getComputedStyle(kid).marginLeft) - off, 'L3', `${Math.abs(off)}px off the group's left edge`); }
  }
  return changes;
}
function pathTo(container, node) {
  const path = [];
  for (let n = node; n && n !== container; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
  return path;
}

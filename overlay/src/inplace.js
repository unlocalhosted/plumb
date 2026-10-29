/* ─────────────────────────────────────────────────────────
 * IN PLACE · React Plumber overlay
 *
 * A verified fix as a plan the selection draws on the element (docs/briefs/insight-not-noise.md §2, layer 2), for the
 * spacing family first: which properties it changes, from which step of the theme's scale to which, the one the
 * staircase follows (the one that moves most), and the box the element will have.
 *
 *  planOf(problem, el, steps, tokenOf)  → { props: [{ prop, from, to, original }], main, steps, at, ghost, edit } | null
 *  classesFor(plan)                       the class edit that writes the plan as it stands (the target may have moved)
 *  GLYPHS                                 the reason drawn small: a ratio of two lengths, for spacing rules
 * ───────────────────────────────────────────────────────── */

import { pxOf } from './value.js';

// The style keys a fix sets, as CSS properties, and the Tailwind prefix that writes each one.
const PROPS = {
  paddingLeft: ['padding-left', 'pl'], paddingRight: ['padding-right', 'pr'], paddingTop: ['padding-top', 'pt'], paddingBottom: ['padding-bottom', 'pb'],
  marginLeft: ['margin-left', 'ml'], marginRight: ['margin-right', 'mr'], marginTop: ['margin-top', 'mt'], marginBottom: ['margin-bottom', 'mb'],
  rowGap: ['row-gap', 'gap-y'], columnGap: ['column-gap', 'gap-x'],
};
export const SPACING_PROPS = new Set(Object.values(PROPS).map(([p]) => p));

const px = (v) => parseFloat(v) || 0;

// The reason as a drawing (docs/briefs/insight-not-noise.md §2.4): one per kind of evidence, so 32 rules need ten.
export const GLYPHS = {
  // a ratio of two lengths: the long side and the short side, as lengths
  ratio: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="3.2" rx="1.6" fill="currentColor"/><rect x="3" y="14.8" width="9" height="3.2" rx="1.6" fill="currentColor" opacity=".55"/></svg>',
  // two corners that should share a centre, and don't
  arcs: '<svg viewBox="0 0 24 24"><path d="M3 21V11a8 8 0 0 1 8-8h10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21v-7a3 3 0 0 1 3-3h10" fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/></svg>',
  // text on its ground, and how far apart they are
  contrast: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="13" height="13" rx="3" fill="currentColor" opacity=".3"/><text x="8.5" y="13" font-size="9" font-weight="700" text-anchor="middle" fill="currentColor">A</text><rect x="2" y="19" width="9" height="2.4" rx="1.2" fill="currentColor"/></svg>',
  // a minimum size drawn against the element
  size: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/><rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor"/></svg>',
  // a line's length against the measure
  measure: '<svg viewBox="0 0 24 24"><path d="M2 8h20M2 13h14M2 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 4v18" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.6 1.6"/></svg>',
  // letters, and the space between them
  letters: '<svg viewBox="0 0 24 24"><text x="12" y="16" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" letter-spacing="2">AB</text><path d="M3 20h18" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/></svg>',
  // off the pixel grid: a line between two rows of pixels
  pixel: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1" opacity=".4"/><path d="M3 9h18" stroke="currentColor" stroke-width="2.4"/></svg>',
  // one light, the shadow under the thing it lights
  light: '<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2.4" fill="currentColor"/><rect x="8" y="9" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="10" y="18.5" width="10" height="2.4" rx="1.2" fill="currentColor" opacity=".45"/></svg>',
  // the same thing, one of them different
  same: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="19.5" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  // a moment: a timeline with a jump
  time: '<svg viewBox="0 0 24 24"><path d="M2 16h8l2-8 2 8h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  // a value between two steps of the scale
  scale: '<svg viewBox="0 0 24 24"><rect x="2" y="15" width="3" height="5" rx="1" fill="currentColor"/><rect x="7" y="12" width="3" height="8" rx="1" fill="currentColor"/><rect x="12" y="9" width="3" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.4"/><rect x="17" y="6" width="3" height="14" rx="1" fill="currentColor"/></svg>',
};
// which drawing a rule's evidence takes
const KIND = { 'button-padding': 'ratio', 'icon-side': 'ratio', 'inner-outer-spacing': 'ratio', 'content-align': 'ratio', 'concentric-radius': 'arcs',
  contrast: 'contrast', 'disabled-contrast': 'contrast', 'text-opacity': 'contrast', 'hit-target': 'size', 'input-zoom': 'size', measure: 'measure', 'heading-widow': 'measure',
  'hanging-quote': 'measure', leading: 'measure', tracking: 'letters', 'caps-case': 'letters', 'tabular-nums': 'same', 'media-size': 'same', 'half-pixel': 'pixel', hairline: 'pixel',
  'one-light': 'light', 'layered-shadow': 'light', 'border-on-shadow': 'light', 'image-outline': 'light', 'gradient-space': 'light', 'bold-hover': 'time', 'scale-from-zero': 'time',
  'truncate-intent': 'measure', 'middle-truncate': 'measure', 'scrollbar-gutter': 'time', 'anchor-offset': 'measure', 'z-index-war': 'same' };
export const glyphOf = (problem) => GLYPHS[problem?.family === 'craft' ? KIND[String(problem.rule).replace(/^craft\//, '')] ?? 'scale' : 'scale'];

/**
 * The plan for a problem whose verified fix sets spacing on `el`. steps: the theme's spacing scale ([{ token, n }],
 * ascending); tokenOf(px) → a step's token or null. Null when there is nothing to draw in place (no fix, not spacing,
 * a fix withdrawn by the verdict).
 */
export function planOf(problem, el, steps, tokenOf) {
  const fix = problem?.craft?.suggest;
  if (fix?.kind !== 'class' || !fix.sets || !steps.length) return null;
  const cs = getComputedStyle(el);
  const props = Object.entries(fix.sets).filter(([k]) => PROPS[k]).map(([k, n]) => {
    const [prop, prefix] = PROPS[k];
    const now = px(cs.getPropertyValue(prop));
    const step = (v) => ({ token: tokenOf(v), n: v });
    return { key: k, prop, prefix, from: step(now), to: step(n), original: [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)] };
  });
  if (!props.length || props.some((p) => !p.to.token)) return null;
  const main = props.reduce((a, b) => (Math.abs(b.to.n - b.from.n) > Math.abs(a.to.n - a.from.n) ? b : a));
  const at = steps.findIndex((s) => s.token === main.to.token);
  return { props, main, steps, at, edit: { from: fix.from, to: fix.to }, ghost: ghostOf(el, props) };
}

// The element's box as the plan leaves it: an inline element grows from its left edge, a block from its top.
function ghostOf(el, props) {
  const r = el.getBoundingClientRect();
  const d = (prop) => { const p = props.find((x) => x.prop === prop); return p ? p.to.n - p.from.n : 0; };
  return { left: r.left - d('margin-left'), top: r.top - d('margin-top'), width: r.width + d('padding-left') + d('padding-right'), height: r.height + d('padding-top') + d('padding-bottom') };
}

// The plan with its main property moved to another step of the scale.
export function moved(plan, by) {
  const at = Math.max(0, Math.min(plan.steps.length - 1, plan.at + by));
  if (at === plan.at) return plan;
  const step = plan.steps[at];
  const props = plan.props.map((p) => (p === plan.main ? { ...p, to: { token: step.token, n: step.n } } : p));
  return { ...plan, at, props, main: props[plan.props.indexOf(plan.main)] };
}

// The class edit that writes the plan as it stands: the fix's own edit, with each property's class at the step the
// plan now points to.
export function classesFor(plan) {
  const out = String(plan.edit.to).split(/\s+/).filter(Boolean).map((cls) => {
    const p = plan.props.find((x) => new RegExp(`^!?-?${x.prefix}-`).test(cls));
    return p ? cls.replace(new RegExp(`^(!?-?${p.prefix}-)[^!]+`), `$1${p.to.token}`) : cls;
  });
  return { from: plan.edit.from, to: out.join(' ') };
}

// The glide: a change to an element's layout or paint (a step tried, a fix taken, a preview put back) moves the page
// there instead of jumping: a short transition on the properties a fix touches, set inline for the move and then
// given back, so the element's own transitions are as they were. The neighbours reflow with it every frame. Off under
// reduced motion. (Figma calls it Smart Animate; in code, a layout transition.)
export const GLIDE = { ms: 360, ease: 'cubic-bezier(.2, .8, .2, 1)',
  props: ['padding', 'margin', 'gap', 'row-gap', 'column-gap', 'width', 'height', 'min-width', 'min-height', 'max-width', 'border-radius', 'border-width', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'translate', 'opacity', 'color', 'background-color', 'border-color', 'box-shadow'] };
const gliding = new WeakMap(); // el → { timer, transition: [value, priority] as it was before the glide }
export function glide(el, change) {
  if (!el?.style || matchMedia('(prefers-reduced-motion: reduce)').matches) return change();
  let g = gliding.get(el);
  if (!g) {
    g = { transition: [el.style.getPropertyValue('transition'), el.style.getPropertyPriority('transition')] };
    gliding.set(el, g);
    el.style.setProperty('transition', GLIDE.props.map((p) => `${p} ${GLIDE.ms}ms ${GLIDE.ease}`).join(', '), 'important');
  }
  change();
  clearTimeout(g.timer);
  g.timer = setTimeout(() => {
    const [v, pr] = g.transition;
    if (v) el.style.setProperty('transition', v, pr); else el.style.removeProperty('transition');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    gliding.delete(el);
  }, GLIDE.ms + 40);
}

// Previews the plan on the element (inline styles the overlay owns), or puts it back.
export function preview(el, plan, on) { glide(el, () => previewNow(el, plan, on)); }
function previewNow(el, plan, on) {
  for (const p of plan.props) {
    if (on) el.style.setProperty(p.prop, `${p.to.n}px`, 'important');
    else { const [v, pr] = p.original; if (v) el.style.setProperty(p.prop, v, pr); else el.style.removeProperty(p.prop); }
  }
  if (!on && !el.getAttribute('style')?.trim()) el.removeAttribute('style');
}

// ── writing ────────────────────────────────────────────────

// The classes that write a box family on an element (padding, margin), as the sides they set, later and narrower
// classes winning, as Tailwind orders them. Variants (hover:, md:) are left alone.
const FAMILY = { padding: 'p', margin: 'm' };
const SIDE = { t: ['top'], r: ['right'], b: ['bottom'], l: ['left'], x: ['left', 'right'], y: ['top', 'bottom'], '': ['top', 'right', 'bottom', 'left'], s: ['left'], e: ['right'] };
function sidesOf(classes, letter) {
  const out = {}, used = [];
  const re = new RegExp(`^(!?)(${letter})([trblxyse]?)-([^\\s:]+?)(!?)$`);
  for (const order of ['', 'x', 'y', 's', 'e', 't', 'r', 'b', 'l']) for (const cls of classes) {
    const m = re.exec(cls);
    if (!m || m[3] !== order) continue;
    used.push(cls);
    for (const side of SIDE[m[3]]) out[side] = m[4];
  }
  return { sides: out, used: [...new Set(used)] };
}
// The fewest classes for four sides: one for all, an x and a y pair, else each side.
function classesOfSides(letter, s) {
  const { top: t, right: r, bottom: b, left: l } = s;
  if (t && t === r && r === b && b === l) return [`${letter}-${t}`];
  const out = [];
  if (l && l === r) out.push(`${letter}x-${l}`); else { if (l) out.push(`${letter}l-${l}`); if (r) out.push(`${letter}r-${r}`); }
  if (t && t === b) out.push(`${letter}y-${t}`); else { if (t) out.push(`${letter}t-${t}`); if (b) out.push(`${letter}b-${b}`); }
  return out;
}
/**
 * The class edit that writes per-property changes ([{ prop, to: { token } }]) on an element whose box family is set by
 * classes: { from, to } for `swap`, or null when a property isn't a box side or a side isn't set by a class.
 */
export function boxEdit(el, props) { return boxEditOf((el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean), props); }
export function boxEditOf(classes, props) {
  let from = [], to = [];
  for (const [family, letter] of Object.entries(FAMILY)) {
    const mine = props.filter((p) => p.prop.startsWith(`${family}-`));
    if (!mine.length) continue;
    const { sides, used } = sidesOf(classes, letter);
    for (const p of mine) sides[p.prop.slice(family.length + 1)] = p.to.token;
    from = from.concat(used);
    to = to.concat(classesOfSides(letter, sides));
  }
  if (props.some((p) => !/^(padding|margin)-/.test(p.prop))) return null;
  const keep = from.filter((c) => to.includes(c));
  from = from.filter((c) => !keep.includes(c)); to = to.filter((c) => !keep.includes(c));
  return to.length ? { from: from.join(' '), to: to.join(' ') } : null;
}

// ── every other family: a choice of class edits ────────────

const word = (v) => String(v ?? '').split(/\s+/).filter(Boolean);
// what a facet is called on the page
export const FACET_SAID = { radius: 'corners', 'font-size': 'text size', 'letter-spacing': 'letter spacing', 'line-height': 'line height', color: 'text colour',
  background: 'fill', border: 'border', shadow: 'shadow', 'font-features': 'figures', 'text-flow': 'wrapping', size: 'size', gap: 'gap', scroll: 'scroll', stacking: 'layer',
  transform: 'motion', 'font-weight': 'weight', 'padding-x': 'side padding', 'padding-y': 'top and bottom padding', 'margin-x': 'side margin', 'margin-y': 'top and bottom margin' };

/**
 * A plan for any problem whose fix is a class edit: a craft fix (its one verified edit) or a drift mark (its theme's
 * choices, each an exact class edit read from the server: `edits(mark)` resolves them). Options are drawn as a
 * staircase (sizes), swatches (colours) or a single target.
 */
export function swapPlanOf(problem) {
  if (problem.family === 'craft') {
    const fix = problem.craft?.suggest;
    if (fix?.kind !== 'class') return null;
    const styles = Object.fromEntries(Object.entries(fix.sets ?? {}).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), typeof v === 'number' ? `${v}px` : v]));
    return { kind: 'swap', facet: problem.facets?.[0], options: [{ token: fix.to, label: fix.to, n: null, write: { from: fix.from ?? '', to: fix.to }, styles }], at: 0, now: null };
  }
  const choices = problem.choices ?? [];
  if (!choices.length) return null;
  // the page previews a choice as the value it stands for, on the properties the mark is about (a token class may not
  // exist in the page's CSS until it is written)
  // (a length as written: `1.125rem` previews as 1.125rem, so the page shows the step itself in this browser; a bare
  // number is px)
  const prop = problem.props?.[0], length = /^(spacing|radius|type|size|layout)$/.test(problem.family) && !/weight/.test((problem.props ?? []).join());
  const styleOf = (c) => { const v = length && pxOf(c.value, null, prop) !== undefined ? (/[a-z]$/.test(String(c.value).trim()) ? String(c.value).trim() : `${pxOf(c.value, null, prop)}px`) : length && Number.isFinite(c.n) ? `${c.n}px` : c.value; return v ? Object.fromEntries((problem.props ?? []).map((p) => [p, v])) : {}; };
  // every number is px at the CSS's root (value.js), so the panel reads the steps and yours alike, in whole px
  const nOf = (value, n) => (length ? pxOf(value, null, prop) ?? n ?? null : n ?? null);
  return { kind: 'swap', facet: problem.facets?.[0], drift: true, options: choices.map((c) => ({ token: c.label ?? c.name, label: c.label ?? c.name, n: nOf(c.value, c.n), swatch: problem.family === 'color' ? c.value : null, write: c.edit ? { from: c.edit.from, to: c.edit.to } : null, styles: styleOf(c) })),
    at: problem.pick ?? 0, now: { label: problem.text ?? String(problem.value ?? ''), n: nOf(problem.value, problem.n), swatch: problem.family === 'color' ? problem.value : null } };
}

// An option previewed on the element (its classes swapped, and the values it stands for as inline styles the overlay
// owns), or put back: the inverse of exactly what was done.
export function swapPreview(el, write, on, memo, styles = {}) { glide(el, () => swapNow(el, write, on, memo, styles)); }
function swapNow(el, write, on, memo, styles) {
  if (on) {
    if (memo.done) swapNow(el, null, false, memo);
    const removed = word(write?.from).filter((c) => el.classList.contains(c)), added = word(write?.to).filter((c) => !el.classList.contains(c));
    for (const c of removed) el.classList.remove(c);
    for (const c of added) el.classList.add(c);
    const had = Object.keys(styles).map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]);
    for (const [p, v] of Object.entries(styles)) el.style.setProperty(p, v, 'important');
    memo.done = { removed, added, had, attr: had.length ? el.getAttribute('style') === null : false };
  } else if (memo.done) {
    for (const c of memo.done.added) el.classList.remove(c);
    for (const c of memo.done.removed) el.classList.add(c);
    for (const [p, v, pr] of memo.done.had) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); }
    if (memo.done.had.length && !el.getAttribute('style')?.trim()) el.removeAttribute('style');
    memo.done = null;
  }
}

// After the source carries an option: the inline styles its preview set are let go; the classes stay (React renders
// them from the source now).
export function swapRelease(el, memo) {
  if (!memo.done) return;
  for (const [p, v, pr] of memo.done.had) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); }
  if (memo.done.had.length && !el.getAttribute('style')?.trim()) el.removeAttribute('style');
  memo.done = null;
}

// a class edit applied to a class list: `from` out, `to` in where the first of `from` stood (else at the end)
export function applied(list, { from, to }) {
  const out = word(from), at = list.findIndex((c) => out.includes(c));
  const kept = list.filter((c) => !out.includes(c));
  const where = at < 0 ? kept.length : list.slice(0, at).filter((c) => !out.includes(c)).length;
  kept.splice(where, 0, ...word(to).filter((c) => !kept.includes(c)));
  return kept;
}
/**
 * Every change on one element as one class edit against its classes as written: class edits applied in order, then the
 * spacing changes as the fewest padding and margin classes. `classes`: the element's classes with every preview put
 * back. Null when a change can't be written as classes.
 */
export function elementEdit(classes, writes, props) {
  let list = [...classes];
  for (const w of writes) { if (!w) return null; list = applied(list, w); }
  if (props.length) {
    const box = boxEditOf(list, props);
    if (!box) return null;
    list = applied(list, box);
  }
  const from = classes.filter((c) => !list.includes(c)), to = list.filter((c) => !classes.includes(c));
  return to.length || from.length ? { from: from.join(' '), to: to.join(' ') } : null;
}

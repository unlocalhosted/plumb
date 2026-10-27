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

// The style keys a fix sets, as CSS properties, and the Tailwind prefix that writes each one.
const PROPS = {
  paddingLeft: ['padding-left', 'pl'], paddingRight: ['padding-right', 'pr'], paddingTop: ['padding-top', 'pt'], paddingBottom: ['padding-bottom', 'pb'],
  marginLeft: ['margin-left', 'ml'], marginRight: ['margin-right', 'mr'], marginTop: ['margin-top', 'mt'], marginBottom: ['margin-bottom', 'mb'],
  rowGap: ['row-gap', 'gap-y'], columnGap: ['column-gap', 'gap-x'],
};
export const SPACING_PROPS = new Set(Object.values(PROPS).map(([p]) => p));

const px = (v) => parseFloat(v) || 0;

export const GLYPHS = {
  // a ratio of two lengths: the long side and the short side, as lengths
  ratio: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="3.2" rx="1.6" fill="currentColor"/><rect x="3" y="14.8" width="9" height="3.2" rx="1.6" fill="currentColor" opacity=".55"/></svg>',
};

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

// Previews the plan on the element (inline styles the overlay owns), or puts it back.
export function preview(el, plan, on) {
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
export function boxEdit(el, props) {
  const classes = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
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

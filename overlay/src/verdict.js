/* ─────────────────────────────────────────────────────────
 * VERDICT · React Plumber overlay
 *
 * One element, one verdict (docs/briefs/insight-not-noise.md §1). Every engine's marks on an element (drift from the
 * server, craft from the page) are merged per facet through the tiers, and a fix is offered only after it has been
 * tried. So "applied" always means the element comes back quiet.
 *
 *  0. scope     (in craft.js, before the rules run) a special case whose `scope` covers the element is its authority,
 *               firing or not: the general rules it `refines` don't run there
 *  1. annotate  every mark gets a tier and facets: a craft mark from its rule, a drift mark from its property (the
 *               theme tier). Recorded marks (debt, exceptions) stand apart and are never merged
 *  2. refines   a special case folds the general rule it names when both fire on one facet
 *  3. rank      the rest by tier (0 access first), then confidence; a mark whose facets meet a kept mark folds into it
 *               as `also`. On a shared facet the theme (drift) outranks craft: its tokens are the allowed answers
 *  4. compose   a folded rule that runs `after` the kept one is run again on the page as the kept edit leaves it
 *               (Facts.with), and its class edit stacks on top: one edit answers both
 *  5. verify    before a craft fix is offered:
 *                 on the theme   every spacing or radius class it writes names one of the theme's steps; a numeric
 *                                or arbitrary one is rewritten to the nearest step in the rule's direction (`round`)
 *                 quiet          the kept rule, run again on the page as the fix leaves it, has nothing left to say
 *                 above          no rule of a higher tier starts firing on that page
 *               A fix that fails is withdrawn: the mark keeps its place and says why not (`whyNot`), with advice
 * ───────────────────────────────────────────────────────── */
import { TIER, facetOf, facetOfClass, tierOf } from './craft-facets.js';
import { classesOf } from './craft-read.js';

const FLOOR = 0.8;
const words = (v) => String(v ?? '').split(/\s+/).filter(Boolean);
// a class edit applied to a class list: `from` out, `to` in where the first of `from` stood (else at the end)
function applied(list, { from, to }) {
  const out = words(from), at = list.findIndex((c) => out.includes(c));
  const kept = list.filter((c) => !out.includes(c));
  // where the first removed class stood, counted among the classes that stay
  const where = at < 0 ? kept.length : list.slice(0, at).filter((c) => !out.includes(c)).length;
  kept.splice(where, 0, ...words(to).filter((c) => !kept.includes(c)));
  return kept;
}

const meets = (a, b) => a.some((f) => b.includes(f));
const folded = (m) => ({ rule: m.rule, what: m.what, title: m.title, because: m.because });
const rank = (m) => (m.family === 'craft' ? m.craft?.confidence ?? 0 : 1);

export function verdicts(items, { rules, facts, theme }) {
  const byId = new Map(rules.map((r) => [r.id, r]));
  return items.map((item) => {
    // recorded drift (debt, exceptions) is the past, kept as it is; only what is new is judged together
    const open = item.marks.filter((m) => m.family === 'craft' || m.ledger === 'new');
    const rest = item.marks.filter((m) => !open.includes(m));
    const marks = open.map((m) => annotate(m, byId));
    const out = new Set();
    for (const m of marks) for (const g of marks) if (m !== g && !out.has(m) && m.refines.includes(g.rule) && meets(m.facets, g.facets)) { out.add(g); m.also.push(folded(g), ...g.also); }
    const kept = [], under = new Map(); // kept mark → the marks folded under it by rank
    for (const m of marks.filter((x) => !out.has(x)).sort((a, b) => a.tier - b.tier || rank(b) - rank(a))) {
      const over = m.facets.length ? kept.find((k) => meets(k.facets, m.facets)) : null;
      if (over) { over.also.push(folded(m), ...m.also); under.get(over).push(m); }
      else { kept.push(m); under.set(m, []); }
    }
    if (facts && theme) for (const k of kept) {
      if (k.family !== 'craft') continue;
      compose(k, under.get(k), item.el, byId, facts, theme);
      verify(k, item.el, byId, rules, facts, theme, marks);
    }
    const keep = new Set(kept);
    return { ...item, marks: [...rest, ...marks.filter((m) => keep.has(m))] };
  });
}

function annotate(m, byId) {
  if (m.facets) return { ...m, also: [...(m.also ?? [])] };
  if (m.family === 'craft') {
    const r = byId.get(m.rule) ?? {};
    return { ...m, tier: r.tier ?? TIER.craft, facets: r.owns ?? [], once: r.once ?? 'ancestor', refines: r.refines ?? [], also: [] };
  }
  // a drift mark is about the property it sets (its class names it when the declaration doesn't)
  const facets = [...new Set([...(m.props ?? []).map(facetOf), facetOfClass(m.text ?? '')].filter(Boolean))].slice(0, 1);
  return { ...m, tier: tierOf(m.rule), facets, once: 'element', refines: [], also: [] };
}

// Runs each folded rule that comes `after` the kept one on the page as the kept edit leaves it, and stacks its edit.
function compose(k, folded, el, byId, facts, theme) {
  let edit = k.craft.suggest;
  // without the values the kept edit sets, the page it leaves can't be read: nothing is stacked on a guess
  if (edit?.kind !== 'class' || !folded.length || !edit.sets || !Object.keys(edit.sets).length) return;
  let list = applied(words(classesOf(el)), edit), sets = { ...(edit.sets ?? {}) };
  const whys = [edit.why].filter(Boolean), composed = [], by = {}; // by: class → the rule that wrote it
  for (const f of folded) {
    const rule = byId.get(f.rule);
    if (!rule?.after?.includes(k.rule)) continue;
    const again = facts.with(el, { sets, classes: list.join(' ') }, (virtual) => { try { return rule.check({ el, facts: virtual }, theme) ?? []; } catch { return []; } })
      .find((x) => (x.confidence ?? 0) >= FLOOR && x.suggest?.kind === 'class' && words(x.suggest.from).every((c) => list.includes(c)));
    const note = k.also.find((a) => a.rule === f.rule);
    if (!again) { if (note) note.settled = true; continue; } // the kept edit already answers it
    list = applied(list, again.suggest);
    sets = { ...sets, ...(again.suggest.sets ?? {}) };
    for (const c of words(again.suggest.to)) by[c] = f.rule;
    if (again.suggest.why) whys.push(again.suggest.why);
    composed.push(f.rule);
    if (note) note.composed = true;
  }
  if (!composed.length) return;
  setEdit(k, el, list, { ...edit, why: whys.join('; '), sets, composed, by });
}

// The kept mark's edit as the difference between the element's classes now and `list`.
function setEdit(k, el, list, edit) {
  const before = words(classesOf(el));
  const from = before.filter((c) => !list.includes(c)).join(' '), to = list.filter((c) => !before.includes(c)).join(' ');
  k.craft = { ...k.craft, suggest: { ...edit, from, to } };
  k.action = `Change \`${from}\` to \`${to}\`: ${edit.why}.`;
}

// ── verify ─────────────────────────────────────────────────

// The spacing and radius utilities a fix can write, the theme family their value comes from, and the style values
// they set (so the page as the fix leaves it can be read).
const SIDES = { p: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'], px: ['paddingLeft', 'paddingRight'], py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'], pr: ['paddingRight'], pb: ['paddingBottom'], pl: ['paddingLeft'], ps: ['paddingLeft'], pe: ['paddingRight'],
  m: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'], mx: ['marginLeft', 'marginRight'], my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'], mr: ['marginRight'], mb: ['marginBottom'], ml: ['marginLeft'], gap: ['rowGap', 'columnGap'], 'gap-x': ['columnGap'], 'gap-y': ['rowGap'],
  'scroll-mt': ['scrollMarginTop'], size: ['width', 'height'], w: ['width'], h: ['height'] };
function utilityOf(cls) {
  const m = /^(!?)(-?)(gap-x|gap-y|scroll-mt|rounded(?:-[trblse]{1,2})?|size|[pm][xytrblse]?|gap|w|h)-(.+?)(!?)$/.exec(cls);
  if (!m) return null;
  const [, bang, neg, prefix, value, tail] = m;
  return { bang, neg, prefix, value, tail, family: prefix.startsWith('rounded') ? 'radius' : 'spacing' };
}
// a utility's value in px: a theme step by name, a numeric step through the project's --spacing, or an arbitrary length
function pxOf(u, theme) {
  const step = theme.scale(u.family).find((s) => s.short === u.value);
  if (step) return { px: step.px, named: true };
  if (/^\d+(\.\d+)?$/.test(u.value) && u.family === 'spacing' && theme.unit?.()) return { px: Number(u.value) * theme.unit(), named: false };
  const a = /^\[(-?\d+(?:\.\d+)?)px\]$/.exec(u.value);
  return a ? { px: Number(a[1]), named: false } : null;
}
// the theme's step for a value, in the direction the rule asks (down for "less", up for "at least", else nearest)
function stepFor(theme, family, px, round = 'nearest') {
  const steps = theme.scale(family).filter((s) => Number.isFinite(s.px));
  if (!steps.length) return null;
  const pick = round === 'down' ? steps.filter((s) => s.px <= px + 0.01).sort((a, b) => b.px - a.px)[0]
    : round === 'up' ? steps.filter((s) => s.px >= px - 0.01).sort((a, b) => a.px - b.px)[0]
    : steps.slice().sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px))[0];
  return pick ?? null;
}

// Tries a craft mark's class fix and keeps it only when it is on the theme, leaves its own rule quiet, and wakes no
// rule of a higher tier. Otherwise the fix is withdrawn and the mark says why not.
function verify(k, el, byId, rules, facts, theme, before) {
  const edit = k.craft?.suggest;
  if (edit?.kind !== 'class') return;
  const rule = byId.get(k.rule);
  // 1. on the theme: a numeric or arbitrary step is rewritten to the theme's own, when the theme names its steps
  let list = applied(words(classesOf(el)), edit), rewritten = false;
  const sets = { ...(edit.sets ?? {}) };
  for (const cls of words(edit.to)) {
    // a type step (letter spacing, line height, text size, weight) must be one the project's own theme names
    const t = /^!?(tracking|leading|text|font)-([a-z0-9]+(?:-[a-z0-9]+)*)!?$/.exec(cls);
    if (t && theme.loaded) {
      const ns = { tracking: ['--tracking-'], leading: ['--leading-'], text: ['--text-'], font: ['--font-weight-'] }[t[1]];
      const said = { tracking: 'letter-spacing', leading: 'line-height', text: 'text size', font: 'weight' }[t[1]];
      const colour = t[1] === 'text' && theme.colors().some((c) => c.short === t[2]);
      if (!colour && !ns.some((n) => theme.has(`${n}${t[2]}`))) return withdraw(k, 'no-step', `Your theme has no ${said} step for this. Add one, then use it here.`);
      continue;
    }
    const u = utilityOf(cls);
    if (!u || !theme.scale(u.family).length) continue; // no named steps: the numeric scale is the system
    const v = pxOf(u, theme);
    if (!v || v.named) continue;
    // rounded the way the rule that wrote this class asks (a composed class keeps its own rule's direction)
    const writer = byId.get(edit.by?.[cls]) ?? rule;
    const step = stepFor(theme, u.family, v.px, writer?.round?.[u.prefix] ?? writer?.round?.['*'] ?? 'nearest');
    if (!step) return withdraw(k, 'no-step', `None of your ${u.family} steps is near ${Math.round(v.px)}px.`);
    const next = `${u.bang}${u.neg}${u.prefix}-${step.short}${u.tail}`;
    list = list.map((c) => (c === cls ? next : c));
    for (const key of SIDES[u.prefix] ?? []) sets[key] = (u.neg ? -1 : 1) * step.px;
    rewritten = true;
  }
  // 2. quiet, and 3. nothing above it wakes: every rule run again on the page as the fix leaves it. A fix that doesn't
  // say what it sets can't be read that way: it is checked against the theme only, and says so in its proof
  const triable = Object.keys(sets).length > 0;
  const after = facts.with(el, { sets, classes: list.join(' ') }, (virtual) => rules.flatMap((r) => {
    if (r.id !== k.rule && !(edit.composed ?? []).includes(r.id) && !((r.tier ?? TIER.craft) < k.tier)) return [];
    try { return (r.check({ el, facts: virtual }, theme) ?? []).filter((f) => (f.confidence ?? 0) >= FLOOR).map((f) => ({ ...f, rule: r.id, tier: r.tier ?? TIER.craft })); } catch { return []; }
  }));
  const was = new Set(before.map((m) => m.rule));
  const woke = after.find((f) => f.tier < k.tier && !was.has(f.rule));
  if (woke) return withdraw(k, 'higher-tier', `That would make it ${woke.what?.toLowerCase() ?? 'worse'}.`, woke.rule);
  if (triable && after.some((f) => f.rule === k.rule || (edit.composed ?? []).includes(f.rule))) return withdraw(k, 'no-step', 'None of your steps settles it.');
  if (rewritten) setEdit(k, el, list, { ...edit, sets, rewritten: true });
  k.proof = { theme: rewritten ? 'rewritten' : 'on', quiet: triable ? true : 'untried', above: triable ? 'clear' : 'untried' };
}

function withdraw(k, whyNot, text, by) {
  k.whyNot = whyNot;
  if (by) k.whyNotBy = by;
  k.craft = { ...k.craft, suggest: { kind: 'advice', text, whyNot } };
  k.action = text;
}

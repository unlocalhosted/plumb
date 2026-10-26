/* ─────────────────────────────────────────────────────────
 * CRAFT ARBITRATION · React Plumber overlay
 *
 * Layer 1 of the rule hierarchy (docs/briefs/craft-hierarchy.md): rules never name each other except through
 * `refines`; the engine decides between them. After the rules run, every craft mark is annotated with its rule's
 * tier and facets, and on each element one mark is kept per facet:
 *
 *  0. scope     (in craft.js, before the rules run) a special case whose `scope` covers the element is its authority,
 *               firing or not: the general rules it `refines` don't run there (a disabled control is judged by
 *               disabled-contrast alone, a cut-off path by middle-truncate alone)
 *  1. refines   a special case folds the general rule it names when both fire on one facet
 *  2. rank      the rest by tier (0 access first), then confidence; a mark whose facets meet a kept mark folds into it
 *
 *  2. compose   a folded rule that runs `after` the kept one is run again on the page as the kept suggestion would leave
 *               it (Facts.with: the values it `sets`, the classes it writes); if it still has something to say, its
 *               class edit is applied on top and the kept mark offers the one composed edit (button-padding, then
 *               icon-side: px-s3 → pl-5 pr-s6)
 *
 * A folded finding is not lost: it rides on the kept mark as `also`, words for the chooser only. Fix-of-fix and the
 * server's marks are later layers.
 * ───────────────────────────────────────────────────────── */
import { TIER } from './craft-facets.js';
import { classesOf } from './craft.js';

const FLOOR = 0.8;
const words = (v) => String(v ?? '').split(/\s+/).filter(Boolean);
// a class edit applied to a class list: `from` out, `to` in where the first of `from` stood (else at the end)
function applied(list, { from, to }) {
  const out = words(from), at = list.findIndex((c) => out.includes(c));
  const kept = list.filter((c) => !out.includes(c));
  kept.splice(at < 0 ? kept.length : Math.min(at, kept.length), 0, ...words(to).filter((c) => !kept.includes(c)));
  return kept;
}

const meets = (a, b) => a.some((f) => b.includes(f));
const folded = (m) => ({ rule: m.rule, what: m.what, title: m.title, because: m.because });

export function arbitrate(items, { rules, facts, theme }) {
  const byId = new Map(rules.map((r) => [r.id, r]));
  return items.map((item) => {
    const craft = item.marks.filter((m) => m.family === 'craft');
    if (craft.length < 2) return { ...item, marks: item.marks.map((m) => m.family === 'craft' ? annotate(m, byId) : m) };
    const marks = craft.map((m) => annotate(m, byId));
    // a special case first, over the general rule it names, on a shared facet
    const out = new Set();
    for (const m of marks) for (const g of marks) if (m !== g && !out.has(m) && m.refines.includes(g.rule) && meets(m.facets, g.facets)) { out.add(g); m.also.push(folded(g), ...g.also); }
    const kept = [], under = new Map(); // kept mark → the marks folded under it by rank
    for (const m of marks.filter((x) => !out.has(x)).sort((a, b) => a.tier - b.tier || (b.craft.confidence ?? 0) - (a.craft.confidence ?? 0))) {
      const over = kept.find((k) => meets(k.facets, m.facets));
      if (over) { over.also.push(folded(m), ...m.also); under.get(over).push(m); }
      else { kept.push(m); under.set(m, []); }
    }
    if (facts && theme) for (const k of kept) compose(k, under.get(k), item.el, byId, facts, theme);
    const keep = new Set(kept);
    // the item's other marks stay where they were; the kept craft marks take the places of the first craft marks
    const rest = item.marks.filter((m) => m.family !== 'craft');
    return { ...item, marks: [...rest, ...marks.filter((m) => keep.has(m))] };
  });
}

function annotate(m, byId) {
  if (m.facets) return { ...m, also: [...m.also] };
  const r = byId.get(m.rule) ?? {};
  return { ...m, tier: r.tier ?? TIER.craft, facets: r.owns ?? [], once: r.once ?? 'ancestor', refines: r.refines ?? [], also: [] };
}

// Runs each folded rule that comes `after` the kept one on the page as the kept edit leaves it, and stacks its edit.
function compose(k, folded, el, byId, facts, theme) {
  let edit = k.craft.suggest;
  if (edit?.kind !== 'class' || !folded.length) return;
  let list = applied(words(classesOf(el)), edit), sets = { ...(edit.sets ?? {}) };
  const whys = [edit.why].filter(Boolean), composed = [];
  for (const f of folded) {
    const rule = byId.get(f.rule);
    if (!rule?.after?.includes(k.rule)) continue;
    const again = facts.with(el, { sets, classes: list.join(' ') }, (virtual) => { try { return rule.check({ el, facts: virtual }, theme) ?? []; } catch { return []; } })
      .find((x) => (x.confidence ?? 0) >= FLOOR && x.suggest?.kind === 'class' && words(x.suggest.from).every((c) => list.includes(c)));
    const note = k.also.find((a) => a.rule === f.rule);
    if (!again) { if (note) note.settled = true; continue; } // the kept edit already answers it
    list = applied(list, again.suggest);
    sets = { ...sets, ...(again.suggest.sets ?? {}) };
    if (again.suggest.why) whys.push(again.suggest.why);
    composed.push(f.rule);
    if (note) note.composed = true;
  }
  if (!composed.length) return;
  // the one edit: what the element loses and what it gains, against its classes now
  const before = words(classesOf(el));
  const from = before.filter((c) => !list.includes(c)).join(' '), to = list.filter((c) => !before.includes(c)).join(' ');
  edit = { ...edit, from, to, why: whys.join('; '), sets, composed };
  k.craft = { ...k.craft, suggest: edit };
  k.action = `Change \`${from}\` to \`${to}\`: ${edit.why}.`;
}

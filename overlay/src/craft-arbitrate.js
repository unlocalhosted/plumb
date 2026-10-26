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
 * A folded finding is not lost: it rides on the kept mark as `also`, words for the chooser only. Composition,
 * fix-of-fix and the server's marks are later layers.
 * ───────────────────────────────────────────────────────── */
import { TIER } from './craft-facets.js';

const meets = (a, b) => a.some((f) => b.includes(f));
const folded = (m) => ({ rule: m.rule, what: m.what, title: m.title, because: m.because });

export function arbitrate(items, { rules }) {
  const byId = new Map(rules.map((r) => [r.id, r]));
  return items.map((item) => {
    const craft = item.marks.filter((m) => m.family === 'craft');
    if (craft.length < 2) return { ...item, marks: item.marks.map((m) => m.family === 'craft' ? annotate(m, byId) : m) };
    const marks = craft.map((m) => annotate(m, byId));
    // a special case first, over the general rule it names, on a shared facet
    const out = new Set();
    for (const m of marks) for (const g of marks) if (m !== g && !out.has(m) && m.refines.includes(g.rule) && meets(m.facets, g.facets)) { out.add(g); m.also.push(folded(g), ...g.also); }
    const kept = [];
    for (const m of marks.filter((x) => !out.has(x)).sort((a, b) => a.tier - b.tier || (b.craft.confidence ?? 0) - (a.craft.confidence ?? 0))) {
      const over = kept.find((k) => meets(k.facets, m.facets));
      if (over) over.also.push(folded(m), ...m.also);
      else kept.push(m);
    }
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

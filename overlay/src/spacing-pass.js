/* ─────────────────────────────────────────────────────────
 * SPACING PASS · React Plumber overlay (docs/briefs/pass-spacing.md)
 *
 * The clean-up's second pass: the space between things in this page's stacks put back on the app's own scale
 * (stacks.js keep, scale.js). Read from this page and the site's census, shown as the clean-up's show, written as
 * class swaps where the class that makes the space is.
 *
 *  read     the site's gaps (GET rhythm), this page's stacks, keep's moves (off the scale, or uneven among siblings);
 *           a class that also makes spaces that stay is left as is; only a move whose class sets one side
 *           (gap, gap-y, mt, mb) is kept: my-2 or m-2 would move the other side too
 *  writes   one per class (a component's mt-4 drawn twelve times is one write, as refine decided): its element, its
 *           class now and the class for the new size (a step of --spacing, or [Npx] when it isn't one)
 *  steps    the show's roles: one per new size, smallest first; its chip is the gap or margin icon and the size most
 *           of its places have now, rolling to the new one; its marks are the spaces themselves (gap stripes, margin
 *           dots); setting it puts the size inline on the elements that make the space, on the overlay's spring
 *  clear    the page as it was: every inline size taken back
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf); a class that can't be reached
 *           is left as is, with its reason
 *  measure  distinct spaces on this page, before → after
 * ───────────────────────────────────────────────────────── */
import { request } from './api.js';
import { BLOCK_ICONS } from './boxmodel.js';
import { classEditsOf } from './locate.js';
import { ease } from './show.js';
import { loadSteps, proposeSpacing, readStacks, rhythmOf, themeSteps, unit } from './stacks.js';

const SIDE = /^(gap|gap-y|mt|mb)$/;
const PROP = { gap: 'row-gap', mt: 'margin-top', mb: 'margin-bottom' };
const prefixOf = (cls) => cls.replace(/-(\[[^\]]+\]|[\d.]+)$/, '');
// the class for a size: a step of the spacing unit (half steps too, as Tailwind has them), else the size itself
// (the theme's own name for it first: gap-s4, when the theme names a step of that size)
const classFor = (prefix, v, step) => { const own = themeSteps().find((x) => Math.abs(x.px - v) < 0.5); if (own) return `${prefix}-${own.short}`; const n = v / step; return `${prefix}-${Number.isInteger(n * 2) ? n : `[${v}px]`}`; };
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];

export class SpacingPass {
  beat = 'all'; // measured all at once, then snapped together (show.js playAll), as the reference does
  #writes = []; #held = new Map(); // el → { prop: [value, priority] } as the page had it
  page = null; // { moves, writes, places, before, after, scale, levels }

  async read() {
    const site = await request('rhythm', {});
    await loadSteps();
    const stacks = readStacks(), rhythm = rhythmOf(site?.distances ?? []);
    // keep: only what is off the app's scale, or the odd one out among its siblings (refine evens out the whole page:
    // an opt-in, never the clean-up's default)
    const p = proposeSpacing(stacks, rhythm, { scope: 'keep', site: site?.gaps ?? null });
    const step = unit(), writes = new Map();
    for (const m of p.moves) {
      const g = m.gap, prefix = prefixOf(g.cls ?? '');
      if (!SIDE.test(prefix) || !g.el) continue;
      const key = `${g.by === 'gap' ? g.el.getAttribute('data-plumb-source') : (g.el.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${g.by}|${g.cls}`;
      if (!writes.has(key)) writes.set(key, { by: g.by, prop: PROP[g.by], cls: g.cls, next: classFor(prefix, m.to, step), to: m.to, gaps: [], els: new Set() });
      const w = writes.get(key);
      w.gaps.push(g); w.els.add(g.el);
    }
    // one class, one write: a class that also makes spaces that stay (the same mt-4 elsewhere on this page) is left as is,
    // or the write would move those too
    const all = new Map();
    for (const g of stacks.flatMap((x) => x.gaps)) if (g.by && g.cls && g.el) { const k = `${g.by === 'gap' ? g.el.getAttribute('data-plumb-source') : (g.el.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${g.by}|${g.cls}`; all.set(k, (all.get(k) ?? 0) + 1); }
    for (const [k, w] of writes) if ((all.get(k) ?? 0) > w.gaps.length || new Set(w.gaps.map((g) => p.moves.find((m) => m.gap === g)?.to)).size > 1) writes.delete(k);
    // a size moves everywhere on this page or nowhere: moving some of the 7s and leaving the rest would add a size, and a
    // pass that adds values is never offered (pass-spacing.md step 8)
    const rowsOf = new Map();
    for (const g of stacks.flatMap((x) => x.gaps)) if (g.d > 0.5 && !g.section) { const k = Math.round(g.d); rowsOf.set(k, (rowsOf.get(k) ?? 0) + 1); }
    for (let changed = true; changed;) {
      changed = false;
      const movedOf = new Map();
      for (const w of writes.values()) for (const g of w.gaps) { const k = Math.round(g.d); movedOf.set(k, (movedOf.get(k) ?? 0) + 1); }
      for (const [k, w] of writes) if (w.gaps.some((g) => (movedOf.get(Math.round(g.d)) ?? 0) < (rowsOf.get(Math.round(g.d)) ?? 0))) { writes.delete(k); changed = true; }
    }
    this.#writes = [...writes.values()];
    // distinct spaces among this page's rows, before and after (the same rows: section breaks and refusals stay)
    const rows = stacks.flatMap((s) => s.gaps).filter((g) => g.d > 0.5 && !g.section), moved = new Map(this.#writes.flatMap((w) => w.gaps.map((g) => [g, w.to])));
    const distinct = (vs) => new Set(vs.map((v) => Math.round(v))).size;
    this.page = { writes: this.#writes.length, places: moved.size, before: distinct(rows.map((g) => g.d)), after: distinct(rows.map((g) => moved.get(g) ?? g.d)), scale: p.scale, routes: site?.routes ?? null };
    return this.page;
  }

  // the show's roles: one per new size, smallest first
  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.to)) by.set(w.to, []); by.get(w.to).push(w); }
    return [...by].sort((a, b) => a[0] - b[0]).map(([to, ws]) => {
      const gaps = ws.flatMap((w) => w.gaps), from = mostOf(gaps.map((g) => Math.round(g.d)));
      const icon = BLOCK_ICONS[mostOf(gaps.map((g) => (g.by === 'gap' ? 'g' : 'm')))];
      return {
        chip: { label: `Space: ${from}px to ${to}px`, name: `${from}px → ${to}px`, icon, from },
        to,
        bands: () => gaps.map((g) => ({ kind: 'measure', to, rect: () => {
          const a = g.above.getBoundingClientRect(), b = g.below.getBoundingClientRect(), left = Math.min(a.left, b.left), right = Math.max(a.right, b.right);
          return { left, right, top: a.bottom, bottom: b.top, width: right - left, height: b.top - a.bottom };
        } })),
        morph: (animate) => { for (const w of ws) for (const el of w.els) this.#set(el, w.prop, `${to}px`, animate); },
      };
    });
  }
  // every role set at once (Space released, a reload's resume)
  show() { for (const s of this.steps()) s.morph(false); }
  #set(el, prop, value, animate) {
    if (!this.#held.has(el)) this.#held.set(el, {});
    const was = this.#held.get(el);
    if (!(prop in was)) was[prop] = [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];
    const set = () => el.style.setProperty(prop, value, 'important');
    if (animate) ease(el, set, { props: [prop] }); else set();
  }
  clear() {
    for (const [el, was] of this.#held) {
      for (const [prop, [v, pr]] of Object.entries(was)) { if (v) el.style.setProperty(prop, v, pr); else el.style.removeProperty(prop); }
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    }
    this.#held.clear();
  }

  // the swaps for apply-all, one guarded write per file; a class that can't be reached is left as is with its reason
  async edits() {
    const files = new Map(), refused = [];
    const read = await Promise.all(this.#writes.map((w) => classEditsOf([...w.els][0], w.cls, w.next).then((edits) => ({ w, edits }), (error) => ({ w, why: error?.message ?? String(error) }))));
    for (const { w, edits, why } of read) {
      if (why) { refused.push({ cls: w.cls, why }); continue; }
      for (const e of edits) {
        if (!files.has(e.file)) files.set(e.file, { file: e.file, hash: e.hash, edits: [] });
        files.get(e.file).edits.push(e.edit);
      }
    }
    return { swaps: [...files.values()], refused };
  }
}

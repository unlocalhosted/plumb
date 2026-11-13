/* ─────────────────────────────────────────────────────────
 * SPACING PASS · React Plumber overlay (docs/briefs/pass-spacing.md)
 *
 * The clean-up's second pass: the space between things in this page's stacks put back on the app's own scale
 * (stacks.js keep, scale.js). Read from this page and the site's census, shown as the clean-up's show, written as
 * class swaps where the class that makes the space is.
 *
 *  read     the site's gaps (GET rhythm), this page's stacks, keep's moves (off the scale, or uneven among siblings);
 *           and the spacing a stack cannot show: padding and the gap between things in a row (insets.js), put on the
 *           same scale. A control's top and bottom padding is left to its size
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
import { placeOf, stampOf } from './stamp.js';
import { loadSteps, proposeSpacing, readStacks, rhythmOf, spacingScale, themeSteps, unit } from './stacks.js';
import { proposeInsets, readInsets } from './insets.js';
import { Claims, LEVEL } from './claims.js';

const SIDE = /^(gap|gap-y|mt|mb)$/;
const PROP = { gap: 'row-gap', mt: 'margin-top', mb: 'margin-bottom' };
const prefixOf = (cls) => cls.replace(/-(\[[^\]]+\]|[\d.]+)$/, '');
// the class for a size: a step of the spacing unit (half steps too, as Tailwind has them), else the size itself
// (the theme's own name for it first: gap-s4, when the theme names a step of that size)
const classFor = (prefix, v, step) => { const own = themeSteps().find((x) => Math.abs(x.px - v) < 0.5); if (own) return `${prefix}-${own.short}`; const n = v / step; return `${prefix}-${Number.isInteger(n * 2) ? n : `[${v}px]`}`; };
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];

export class SpacingPass {
  beat = 'all'; // measured all at once, then snapped together (show.js playAll), as the reference does
  #writes = []; #claims = new Claims(LEVEL.cleanup); // the page's own values are kept by claims.js, not here
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
      const key = `${g.by === 'gap' ? stampOf(g.el) : (placeOf(g.el) ?? '')}|${g.by}|${g.cls}`;
      if (!writes.has(key)) writes.set(key, { by: g.by, prop: PROP[g.by], cls: g.cls, next: classFor(prefix, m.to, step), to: m.to, gaps: [], els: new Set() });
      const w = writes.get(key);
      w.gaps.push(g); w.els.add(g.el);
    }
    // one class, one write: a class that also makes spaces that stay (the same mt-4 elsewhere on this page) is left as is,
    // or the write would move those too
    const all = new Map();
    for (const g of stacks.flatMap((x) => x.gaps)) if (g.by && g.cls && g.el) { const k = `${g.by === 'gap' ? stampOf(g.el) : (placeOf(g.el) ?? '')}|${g.by}|${g.cls}`; all.set(k, (all.get(k) ?? 0) + 1); }
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
    // padding and gaps in rows, on the same scale: one write per class at one place in the source
    const insets = readInsets(), scale = spacingScale(site?.gaps?.length ? site.gaps.map((x) => x.d) : stacks.flatMap((x) => x.gaps.filter((g) => g.d > 0.5 && !g.section).map((g) => g.d)));
    const inner = new Map();
    for (const m of proposeInsets(insets, scale, { unit: step, steps: themeSteps() }).moves) {
      const k = `${(placeOf(m.el) ?? '')}|${m.from.cls}`;
      if (!inner.has(k)) inner.set(k, { inset: m.prefix.startsWith('gap') ? 'row' : 'pad', props: m.props, cls: m.from.cls, next: m.to.cls, from: m.from.px, to: m.to.px, gaps: [], els: new Set() });
      const w = inner.get(k);
      if (w.next !== m.to.cls) w.split = true;
      w.els.add(m.el);
    }
    const insetWrites = [...inner.values()].filter((w) => !w.split);
    this.#writes.push(...insetWrites);
    const insetAfter = new Map(insetWrites.flatMap((w) => [...w.els].map((el) => [`${stampOf(el)}|${w.cls}`, w.to])));
    // distinct spaces among this page's rows, before and after (the same rows: section breaks and refusals stay)
    const rows = stacks.flatMap((s) => s.gaps).filter((g) => g.d > 0.5 && !g.section), moved = new Map(this.#writes.flatMap((w) => w.gaps.map((g) => [g, w.to])));
    const distinct = (vs) => new Set(vs.map((v) => Math.round(v))).size;
    const open = insets.filter((i) => !i.vertical);
    this.page = { writes: this.#writes.length, places: moved.size + insetWrites.reduce((n, w) => n + w.els.size, 0), before: distinct([...rows.map((g) => g.d), ...open.map((i) => i.px)]),
      after: distinct([...rows.map((g) => moved.get(g) ?? g.d), ...open.map((i) => insetAfter.get(`${stampOf(i.el)}|${i.cls}`) ?? i.px)]), scale: p.scale, routes: site?.routes ?? null };
    return this.page;
  }

  // the show's roles: one per new size, smallest first
  steps() {
    const by = new Map();
    for (const w of this.#writes.filter((x) => !x.inset)) { if (!by.has(w.to)) by.set(w.to, []); by.get(w.to).push(w); }
    // padding and gaps in rows: one role per kind and new size, after the stacks' own; the chip is the padding or gap
    // icon, the marks hatch the boxes themselves
    const inner = new Map();
    for (const w of this.#writes.filter((x) => x.inset)) { const k = `${w.inset}|${w.to}`; if (!inner.has(k)) inner.set(k, []); inner.get(k).push(w); }
    const insetSteps = [...inner.values()].sort((a, b) => (a[0].inset === b[0].inset ? a[0].to - b[0].to : a[0].inset === 'pad' ? -1 : 1)).map((ws) => {
      const { inset, to } = ws[0], from = mostOf(ws.flatMap((w) => [...w.els].map(() => Math.round(w.from)))), word = inset === 'pad' ? 'Padding' : 'Gap in a row';
      const els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `${word}: ${from}px to ${to}px`, name: `${word} ${from}px → ${to}px`, icon: BLOCK_ICONS[inset === 'pad' ? 'p' : 'g'], from },
        to,
        bands: () => els.map((el) => ({ kind: 'pad', rect: () => el.getBoundingClientRect() })),
        morph: (animate) => { for (const w of ws) for (const el of w.els) for (const prop of w.props) this.#set(el, prop, `${to}px`, animate); },
      };
    });
    return [...[...by].sort((a, b) => a[0] - b[0]).map(([to, ws]) => {
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
    }), ...insetSteps];
  }
  // every role set at once (Space released, a reload's resume)
  show() { for (const s of this.steps()) s.morph(false); }
  #set(el, prop, value, animate) {
    const set = () => this.#claims.set(el, prop, value);
    if (animate) ease(el, set, { props: [prop] }); else set();
  }
  clear() { this.#claims.clear(); }

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

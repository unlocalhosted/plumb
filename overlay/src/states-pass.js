/* ─────────────────────────────────────────────────────────
 * STATES PASS · React Plumber overlay (states.js; docs/briefs/pass-states.md)
 *
 * The clean-up's ninth pass: every control's disabled look put on one opacity, the theme's or Material's 38% (on the
 * framework's nearest step). Read from this page and the theme, shown as rings round the places (a disabled look is not
 * on screen until a control is disabled), written as a class swap where the opacity's class is, its variant kept.
 *
 *  read     the one disabled opacity, this page's places, the moves; one write per class at one place
 *  steps    one per opacity it comes from; its chip is a faded square; its marks ring the places
 *  clear    nothing to take back: the page is not changed while it is shown
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf)
 *  measure  distinct disabled opacities among the places read, before → after
 * ───────────────────────────────────────────────────────── */
import { classEditsOf } from './locate.js';
import { disabledOpacity, proposeStates, readStates } from './states.js';

const keyOf = (el, cls) => `${(el.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${cls}`;
// the chip: a square, half of it faded
const GLYPH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2.5" y="3.5" width="11" height="9" rx="2"/><path d="M8 3.5v9" /><path d="M10 6v4M12 7v2" opacity=".5"/></svg>';

export class StatesPass {
  #writes = [];
  page = null; // { writes, places, before, after, target }

  async read() {
    const target = await disabledOpacity(), places = readStates(), p = proposeStates(places, target);
    const writes = new Map();
    for (const m of p.moves) {
      const k = keyOf(m.el, m.from.cls);
      if (!writes.has(k)) writes.set(k, { cls: m.from.cls, next: m.to.cls, from: m.from.pct, els: new Set() });
      writes.get(k).els.add(m.el);
    }
    this.#writes = [...writes.values()];
    const moved = new Set(p.moves.map((m) => m.el));
    const distinct = (vs) => new Set(vs.map((v) => Math.round(v))).size;
    this.page = { writes: this.#writes.length, places: moved.size, before: distinct(places.map((x) => x.pct)), after: distinct(places.map((x) => (moved.has(x.el) ? target.pct : x.pct))), target };
    return this.page;
  }

  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.from)) by.set(w.from, []); by.get(w.from).push(w); }
    const to = this.page?.target?.pct;
    return [...by].sort((a, b) => a[0] - b[0]).map(([from, ws]) => {
      const els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `Disabled: ${from}% to ${to}%`, name: `Disabled ${from}% → ${to}%`, icon: GLYPH, from },
        to,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: () => {},
      };
    });
  }
  show() {}
  clear() {}

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

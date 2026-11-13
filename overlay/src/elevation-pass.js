/* ─────────────────────────────────────────────────────────
 * ELEVATION PASS · React Plumber overlay (elevation.js)
 *
 * The clean-up's seventh pass: a shadow put on the step the theme names for what casts it (elevation.js: a card, or
 * something that floats over the page). Read from this page and the theme, shown as the clean-up's show, written as a
 * class swap where the shadow's class is.
 *
 *  read     the theme's shadows, this page's places that cast one, the moves; one write per class at one place
 *  steps    the show's roles: one per job; its chip is a lifted square and the shadow it goes to; its marks ring the
 *           places; setting it eases each shadow to the theme's
 *  clear    the page as it was: every inline shadow taken back
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf)
 *  measure  distinct shadows among the places read, before → after
 * ───────────────────────────────────────────────────────── */
import { classEditsOf } from './locate.js';
import { ease } from './show.js';
import { loadShadows, proposeShadows, readShadows } from './elevation.js';
import { placeOf } from './stamp.js';

const NAME = { card: 'Cards', overlay: 'Floating things' };
const keyOf = (el, cls) => `${(placeOf(el) ?? '')}|${cls}`;
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];
const short = (cls) => String(cls ?? '').replace(/^shadow-?/, '') || 'shadow';
// the chip: a square lifted off the line under it
const GLYPH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3.5" y="2.5" width="9" height="8" rx="2"/><path d="M4.5 13.5h7" opacity=".55"/></svg>';

export class ElevationPass {
  #writes = []; #held = new Map(); // el → [value, priority] as the page had it
  page = null; // { writes, places, before, after, refused }

  async read() {
    const theme = await loadShadows();
    const places = readShadows(), p = proposeShadows(places, theme);
    const writes = new Map();
    for (const m of p.moves) {
      const k = keyOf(m.el, m.from.cls);
      if (!writes.has(k)) writes.set(k, { cls: m.from.cls, next: m.to.cls, role: m.role, token: m.to.token, css: m.to.css, els: new Set() });
      const w = writes.get(k);
      if (w.next !== m.to.cls) w.split = true;
      w.els.add(m.el);
    }
    const all = new Map();
    for (const pl of places) if (pl.cls) { const k = keyOf(pl.el, pl.cls); all.set(k, (all.get(k) ?? 0) + 1); }
    for (const [k, w] of writes) if (w.split || (all.get(k) ?? 0) > w.els.size) writes.delete(k);
    this.#writes = [...writes.values()];
    const after = new Map(this.#writes.flatMap((w) => [...w.els].map((el) => [el, w.next])));
    const distinct = (vs) => new Set(vs).size;
    this.page = { writes: this.#writes.length, places: after.size, before: distinct(places.map((x) => x.cls ?? x.css)), after: distinct(places.map((x) => after.get(x.el) ?? x.cls ?? x.css)), refused: p.refused.length };
    return this.page;
  }

  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.role)) by.set(w.role, []); by.get(w.role).push(w); }
    return [...by].sort((a) => (a[0] === 'card' ? -1 : 1)).map(([role, ws]) => {
      const from = short(mostOf(ws.flatMap((w) => [...w.els].map(() => w.cls)))), to = ws[0].token, els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `${NAME[role]}: shadow ${from} to ${to}`, name: `${NAME[role]} ${from} → ${to}`, icon: GLYPH, from },
        to,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: (animate) => { for (const el of els) this.#set(el, ws[0].css, animate); },
      };
    });
  }
  show() { for (const s of this.steps()) s.morph(false); }

  #set(el, value, animate) {
    if (!this.#held.has(el)) this.#held.set(el, [el.style.getPropertyValue('box-shadow'), el.style.getPropertyPriority('box-shadow')]);
    const set = () => el.style.setProperty('box-shadow', value, 'important');
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) ease(el, set, { props: ['box-shadow'] }); else set();
  }
  clear() {
    for (const [el, [v, pr]] of this.#held) {
      if (v) el.style.setProperty('box-shadow', v, pr); else el.style.removeProperty('box-shadow');
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    }
    this.#held.clear();
  }

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

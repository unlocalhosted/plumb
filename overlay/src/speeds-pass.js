/* ─────────────────────────────────────────────────────────
 * SPEEDS PASS · React Plumber overlay (speeds.js; docs/briefs/pass-motion.md)
 *
 * The clean-up's eighth pass: a duration written by hand put on the theme's named speed it already is (within a fifth:
 * no one watching can tell them apart). Read from this page and the stylesheet, shown as the clean-up's show, written
 * as a class swap where the duration's class is.
 *
 *  read     the theme's speeds, this page's hand-written durations, the moves; one write per class at one place
 *  steps    the show's roles: one per speed, fastest first; its chip is a clock face and the speed; its marks ring the
 *           places; setting it puts the speed on each place (nothing to see until the element moves)
 *  clear    the page as it was: every inline duration taken back
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf)
 *  measure  distinct durations among the places read, before → after
 * ───────────────────────────────────────────────────────── */
import { classEditsOf } from './locate.js';
import { loadSpeeds, proposeMotion, readMotion } from './speeds.js';
import { placeOf } from './stamp.js';

const keyOf = (el, cls) => `${(placeOf(el) ?? '')}|${cls}`;
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];
// the chip: a clock face with its hand moved on
const GLYPH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8.5" r="5.5"/><path d="M8 8.5V5.5M8 8.5l2 1.5M6.5 1.5h3"/></svg>';

export class SpeedsPass {
  #writes = []; #held = new Map(); // el → [value, priority] as the page had it
  page = null; // { writes, places, before, after, twins }

  async read() {
    const speeds = await loadSpeeds(), places = readMotion(), p = proposeMotion(places, speeds);
    const writes = new Map();
    for (const m of p.moves) {
      const k = keyOf(m.el, m.from.cls);
      if (!writes.has(k)) writes.set(k, { cls: m.from.cls, next: m.to.cls, name: m.to.name, ms: m.to.ms, from: [], els: new Set() });
      const w = writes.get(k);
      if (w.next !== m.to.cls) w.split = true;
      w.from.push(m.from.ms); w.els.add(m.el);
    }
    // one class at one place in the source is one write: if its places would go to different speeds, or some of them
    // stay, it is left (a swap there would move the ones that should not)
    const all = new Map();
    for (const pl of places) { const k = keyOf(pl.el, pl.cls); all.set(k, (all.get(k) ?? 0) + 1); }
    for (const [k, w] of writes) if (w.split || (all.get(k) ?? 0) > w.els.size) writes.delete(k);
    this.#writes = [...writes.values()];
    const after = new Map(this.#writes.flatMap((w) => [...w.els].map((el) => [el, w.ms])));
    // the measure: distinct timings written by hand (off the theme's speeds), before → after
    const off = (vs) => new Set(vs.filter((v) => v !== null).map((v) => Math.round(v))).size;
    this.page = { writes: this.#writes.length, places: after.size, before: off(places.map((x) => x.ms)), after: off(places.map((x) => (after.has(x.el) ? null : x.ms))), twins: speeds.twins ?? [] };
    return this.page;
  }

  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.name)) by.set(w.name, []); by.get(w.name).push(w); }
    return [...by].sort((a, b) => a[1][0].ms - b[1][0].ms).map(([name, ws]) => {
      const from = mostOf(ws.flatMap((w) => w.from)), to = ws[0].ms, els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `Timing: ${from}ms to ${name} (${to}ms)`, name: `${from}ms → ${name}`, icon: GLYPH, from },
        to: name,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: () => { for (const el of els) this.#set(el, `${to}ms`); },
      };
    });
  }
  show() { for (const s of this.steps()) s.morph(false); }

  #set(el, value) {
    if (!this.#held.has(el)) this.#held.set(el, [el.style.getPropertyValue('transition-duration'), el.style.getPropertyPriority('transition-duration')]);
    el.style.setProperty('transition-duration', value, 'important');
  }
  clear() {
    for (const [el, [v, pr]] of this.#held) {
      if (v) el.style.setProperty('transition-duration', v, pr); else el.style.removeProperty('transition-duration');
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

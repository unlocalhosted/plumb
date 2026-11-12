/* ─────────────────────────────────────────────────────────
 * CONTROL SIZE PASS · React Plumber overlay (control-size.js)
 *
 * The clean-up's sixth pass: a control's height put on the project's spacing unit (control-size.js: a border added on
 * top of a sized box is taken back in; a height off the unit goes to the nearer step; in a row whose controls differ,
 * the one height on the unit is the row's). Read from this page, shown as the clean-up's show, written as a height
 * class on the control.
 *
 *  read     this page's controls and the moves; one write per class change at one place in the source
 *  steps    the show's roles: one per new height, smallest first; its chip is the height glyph and the height most of
 *           its places have now; its marks ring the controls; setting it eases each control to its height
 *  clear    the page as it was: every inline height taken back
 *  edits    the height class added (or swapped for the one there) through each control's site (locate.js classEditsOf)
 *  measure  distinct control heights on this page, before → after
 * ───────────────────────────────────────────────────────── */
import { classEditsOf } from './locate.js';
import { ease } from './show.js';
import { loadSteps, unit } from './stacks.js';
import { proposeControlSizes, readControls } from './control-size.js';

const keyOf = (el, to) => `${(el.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${to}`;
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];
// the chip: a control seen from the side, with its height marked
const GLYPH = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5.5" y="3.5" width="8" height="9" rx="2"/><path d="M2.5 3.5v9M1.2 5 2.5 3.5 3.8 5M1.2 11l1.3 1.5L3.8 11"/></svg>';

export class ControlSizePass {
  #writes = []; #held = new Map(); // el → [value, priority] as the page had it
  page = null; // { writes, places, before, after, said }

  async read() {
    const controls = readControls(), p = proposeControlSizes(controls, { unit: unit(), steps: await loadSteps() });
    const writes = new Map();
    for (const m of p.moves) {
      const k = keyOf(m.el, m.to.cls);
      if (!writes.has(k)) writes.set(k, { cls: m.from.cls ?? '', next: m.to.cls, to: m.to.h, from: [], els: new Set() });
      const w = writes.get(k);
      w.from.push(m.from.h); w.els.add(m.el);
    }
    this.#writes = [...writes.values()];
    const after = new Map(this.#writes.flatMap((w) => [...w.els].map((el) => [el, w.to])));
    // a control stretched to a row-mate follows it: its height after is the mate's
    const rowAfter = new Map(p.moves.flatMap((m) => m.row.map((el) => [el, m.to.h])));
    const distinct = (vs) => new Set(vs.map((v) => Math.round(v * 2) / 2)).size;
    this.page = { writes: this.#writes.length, places: after.size, before: distinct(controls.map((c) => c.h)),
      after: distinct(controls.map((c) => after.get(c.el) ?? (c.h % unit() ? rowAfter.get(c.el) ?? c.h : c.h))), said: p.said.length };
    return this.page;
  }

  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.to)) by.set(w.to, []); by.get(w.to).push(w); }
    return [...by].sort((a, b) => a[0] - b[0]).map(([to, ws]) => {
      const from = mostOf(ws.flatMap((w) => w.from)), els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `Height: ${from}px to ${to}px`, name: `Height ${from}px → ${to}px`, icon: GLYPH, from },
        to,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: (animate) => { for (const el of els) this.#set(el, `${to}px`, animate); },
      };
    });
  }
  show() { for (const s of this.steps()) s.morph(false); }

  #set(el, value, animate) {
    if (!this.#held.has(el)) this.#held.set(el, [el.style.getPropertyValue('height'), el.style.getPropertyPriority('height')]);
    const set = () => el.style.setProperty('height', value, 'important');
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) ease(el, set, { props: ['height'] }); else set();
  }
  clear() {
    for (const [el, [v, pr]] of this.#held) {
      if (v) el.style.setProperty('height', v, pr); else el.style.removeProperty('height');
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    }
    this.#held.clear();
  }

  async edits() {
    const files = new Map(), refused = [];
    const read = await Promise.all(this.#writes.map((w) => classEditsOf([...w.els][0], w.cls, w.next).then((edits) => ({ w, edits }), (error) => ({ w, why: error?.message ?? String(error) }))));
    for (const { w, edits, why } of read) {
      if (why) { refused.push({ cls: w.next, why }); continue; }
      for (const e of edits) {
        if (!files.has(e.file)) files.set(e.file, { file: e.file, hash: e.hash, edits: [] });
        files.get(e.file).edits.push(e.edit);
      }
    }
    return { swaps: [...files.values()], refused };
  }
}

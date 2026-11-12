/* ─────────────────────────────────────────────────────────
 * RADIUS PASS · React Plumber overlay (radius.js)
 *
 * The clean-up's fifth pass: corners put on the step the theme names for what each thing is (radius.js: a tag, a
 * control, a card). Read from this page and the theme, shown as the clean-up's show, written as class swaps where the
 * class that rounds the corner is. A theme that names its radii by size (sm, md, lg) names no jobs: nothing is offered.
 *
 *  read     the theme's radii (the server's decisions), this page's rounded places, the moves; one class, one write: a
 *           class at one place in the source that also rounds something that stays is left as is
 *  steps    the show's roles: one per job, smallest corner first; its chip is a corner drawn at the radius most of its
 *           places have now, with the job and the size it goes to; its marks ring the places; setting it eases each
 *           corner to the theme's step
 *  clear    the page as it was: every inline radius taken back
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf)
 *  measure  distinct corner sizes among the places read, before → after
 * ───────────────────────────────────────────────────────── */
import { classEditsOf } from './locate.js';
import { ease } from './show.js';
import { loadRadii, proposeRadii, readRadii } from './radius.js';

const NAME = { tag: 'Tags', control: 'Controls', card: 'Cards' };
const keyOf = (el, cls) => `${(el.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${cls}`;
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];
const shown = (n) => Math.round(n * 10) / 10;
// the chip: one corner, drawn at the radius it has now (never larger than the glyph can show)
const glyph = (r) => { const k = Math.min(9, Math.max(0, r * 0.6)); return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 13.5V${3 + k}A${k} ${k} 0 0 1 ${3 + k} 3H13.5"/></svg>`; };

export class RadiusPass {
  #writes = []; #held = new Map(); // el → [value, priority] as the page had it
  page = null; // { writes, places, before, after, refused, sized }

  async read() {
    const theme = await loadRadii();
    const places = readRadii(), p = proposeRadii(places, theme);
    const writes = new Map();
    for (const m of p.moves) {
      const k = keyOf(m.el, m.from.cls);
      if (!writes.has(k)) writes.set(k, { cls: m.from.cls, next: m.to.cls, role: m.role, token: m.to.token, to: m.to.px, from: [], els: new Set() });
      const w = writes.get(k);
      if (w.next !== m.to.cls) w.split = true; // one class read as two jobs can't be one write
      w.from.push(m.from.px); w.els.add(m.el);
    }
    // one class, one write: the same class at the same place rounding something that stays would move that too
    const all = new Map();
    for (const pl of places) if (pl.cls) { const k = keyOf(pl.el, pl.cls); all.set(k, (all.get(k) ?? 0) + 1); }
    for (const [k, w] of writes) if (w.split || (all.get(k) ?? 0) > w.els.size) writes.delete(k);
    this.#writes = [...writes.values()];
    const after = new Map(this.#writes.flatMap((w) => [...w.els].map((el) => [el, w.to])));
    const distinct = (vs) => new Set(vs.map((v) => Math.round(v))).size;
    this.page = { writes: this.#writes.length, places: after.size, before: distinct(places.map((x) => x.px)), after: distinct(places.map((x) => after.get(x.el) ?? x.px)), refused: p.refused.length,
      sized: theme.length > 0 && !theme.some((t) => t.role) }; // a theme named by size: no jobs to go by
    return this.page;
  }

  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.role)) by.set(w.role, []); by.get(w.role).push(w); }
    return [...by].sort((a, b) => a[1][0].to - b[1][0].to).map(([role, ws]) => {
      const from = shown(mostOf(ws.flatMap((w) => w.from))), to = shown(ws[0].to), els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `${NAME[role]}: corners ${from}px to ${to}px`, name: `${NAME[role]} ${from}px → ${to}px`, icon: glyph(from), from },
        to,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: (animate) => { for (const el of els) this.#set(el, `${ws[0].to}px`, animate); },
      };
    });
  }
  show() { for (const s of this.steps()) s.morph(false); }

  #set(el, value, animate) {
    if (!this.#held.has(el)) this.#held.set(el, [el.style.getPropertyValue('border-radius'), el.style.getPropertyPriority('border-radius')]);
    const set = () => el.style.setProperty('border-radius', value, 'important');
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) ease(el, set, { props: ['border-radius'] }); else set();
  }
  clear() {
    for (const [el, [v, pr]] of this.#held) {
      if (v) el.style.setProperty('border-radius', v, pr); else el.style.removeProperty('border-radius');
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

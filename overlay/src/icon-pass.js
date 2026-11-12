/* ─────────────────────────────────────────────────────────
 * ICON PASS · React Plumber overlay (docs/research/icon-system.md)
 *
 * The clean-up's fourth pass: icons put back on the app's own icon system (icons.js, scope keep: one size per text
 * size, the family's stroke, centred on the label's cap middle, the family's gap). Read from this page and the site's
 * icons, shown as the clean-up's show, written as class edits where the class that sets each is.
 *
 *  read     the site's icons (GET icons), this page's places, keep's moves; a move is written here when it is a class
 *           edit on the icon, its row or its control (I1–I5, I9), or a size or stroke passed as a prop (`<Bell size={20} />`:
 *           the number is changed where it is written, at the usage); a component or mark swap (I6–I8) is listed with its reason,
 *           and so is an emoji the family has no mark for (§9.1: never invent a mark)
 *  steps    the show's roles: one per rule (size, stroke, alignment, gap, hit region); its chip is the rule's glyph and the
 *           value most of its places have now, rolling to the family's; its marks are rings round the icons; setting it
 *           eases each icon (or its row) to the family's value
 *  clear    the page as it was: every inline value taken back
 *  edits    the edits for apply-all, through each class's site (locate.js classEditsOf: an empty `from` adds, an empty `to`
 *           removes); a class that can't be reached is left as is, with its reason
 *  measure  distinct icon sizes and strokes on this page, before → after; emoji left
 * ───────────────────────────────────────────────────────── */
import { request } from './api.js';
import { classEditsOf, locate } from './locate.js';
import { ease } from './show.js';
import { familyOf, proposeIcons, readIcons } from './icons.js';

// the rules this pass writes, in the order they play: what changes first is what the eye reads first (the icon's size),
// then its weight, then where it sits
const ORDER = ['I2', 'I1', 'I3', 'I4', 'I5', 'I9'];
const NAME = { I1: 'Stroke', I2: 'Size', I3: 'Stroke', I4: 'Off its label', I5: 'Gap', I9: 'Hit area' };
const UNIT = { I1: '', I2: 'px', I3: '', I4: 'px', I5: 'px', I9: 'px' };
// the rule's glyph in the chip: a square for size, a heavy line for stroke, a baseline for alignment, two bars for a gap
const GLYPH = {
  I2: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="9" height="9" rx="1"/></svg>',
  I1: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M3 12.5 13 3.5" stroke-width="2.5" stroke-linecap="round"/></svg>',
  I4: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="4.5" width="5" height="5" rx="1"/><path d="M9.5 7h4"/><path d="M1.5 7h13" stroke-dasharray="1 2"/></svg>',
  I5: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3v10M11.5 3v10"/><path d="M6.5 8h3" stroke-dasharray="1 1.5"/></svg>',
};
GLYPH.I3 = GLYPH.I1; GLYPH.I9 = GLYPH.I2;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];
const strokeOf = (cls) => Number(/\[stroke-width:([\d.]+)\]/.exec(cls ?? '')?.[1] ?? NaN);
const translateOf = (cls) => { const m = /(-?)translate-y-\[([\d.]+)px\]/.exec(cls ?? ''); return m ? (m[1] ? -1 : 1) * Number(m[2]) : 0; };

export class IconPass {
  #writes = []; #held = new Map(); #timers = [];
  page = null; // { writes, places, before, after, listed, refused, emoji }

  async read() {
    const site = await request('icons', {}).catch(() => null);
    const places = readIcons(document.body), family = familyOf(places, site);
    const p = proposeIcons(places, family, { scope: 'keep' });
    // what this pass writes: a class edit at a place it can name (a translate that comes to nothing is removed, not zeroed)
    this.#writes = p.moves.filter((m) => ORDER.includes(m.rule) && (m.write?.cls !== undefined || m.write?.prop?.value !== undefined) && m.write.on !== 'row+icon').map((m) => {
      // a size or a stroke passed as a prop: written where the number is, at the usage (see edits)
      if (m.write.cls === undefined) return { ...m, on: m.el, prop: m.write.prop };
      const on = m.write.on === 'row' ? m.row : m.write.on === 'control' ? m.control : m.el;
      let cls = m.write.from ?? '', next = m.rule === 'I4' ? m.write.cls.replace(/-?translate-y-\[0px\]/, '').trim() : m.write.cls;
      // a write takes a class to a class: a nudge that comes to nothing is removed by rewriting it with the class written
      // beside it (`size-5 translate-y-[2px]` → `size-5`), never left as translate-y-[0px]
      if (!next && cls) { const kin = m.el.getAttribute('class')?.split(/\s+/).find((c) => c && c !== cls && /^size-|^w-|^h-/.test(c)); if (!kin) return null; next = kin; cls = `${kin} ${cls}`; }
      return { ...m, on, cls, next };
    }).filter((w) => w && w.on && (w.prop || w.cls !== w.next));
    const listed = [...(p.kept?.listed ?? []), ...p.moves.filter((m) => !this.#writes.some((w) => w.el === m.el && w.rule === m.rule) && !ORDER.includes(m.rule))];
    const m = p.measure ?? {}, sum = (k) => (m.sizes?.[k] ?? 0) + (m.strokes?.[k] ?? 0);
    this.page = { writes: this.#writes.length, places: new Set(this.#writes.map((w) => w.el)).size, before: sum(0), after: this.#writes.length ? sum(1) : sum(0),
      listed: listed.length, noMark: listed.filter((l) => l.kind === 'emoji').length, refused: p.refused.length, emoji: m.emoji?.[0] ?? 0, family: family?.id ?? null };
    return this.page;
  }

  // the show's roles: one per rule, in ORDER
  steps() {
    const by = new Map();
    for (const w of this.#writes) { if (!by.has(w.rule)) by.set(w.rule, []); by.get(w.rule).push(w); }
    return [...by].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])).map(([rule, ws]) => {
      const value = (w, side) => (rule === 'I2' ? w[side].size : rule === 'I4' ? Math.abs(w[side].offset ?? 0) : rule === 'I5' ? w[side].gap : rule === 'I9' ? w[side].target : w[side].stroke);
      const from = mostOf(ws.map((w) => Math.round((value(w, 'from') ?? 0) * 10) / 10)), to = mostOf(ws.map((w) => Math.round((value(w, 'to') ?? 0) * 10) / 10));
      return {
        chip: { label: `${NAME[rule]}: ${from}${UNIT[rule]} to ${to}${UNIT[rule]}`, name: `${NAME[rule]} ${from}${UNIT[rule]} → ${to}${UNIT[rule]}`, icon: GLYPH[rule], from },
        to,
        bands: () => ws.map((w) => ({ kind: 'ink', rect: () => w.el.getBoundingClientRect() })),
        morph: (animate) => ws.forEach((w, i) => this.#later(i, animate, () => this.#preview(w, animate))),
      };
    });
  }
  show() { for (const s of this.steps()) s.morph(false); }

  // the icons settle down the list, 40ms apart (§6): one sweep, not a flash
  #later(i, animate, f) { if (!animate || still() || !i) return f(); this.#timers.push(setTimeout(f, Math.min(240, i * 40))); }
  // a write's look, put inline on the element it changes
  #preview(w, animate) {
    if (w.rule === 'I2') { this.#set(w.el, 'width', `${w.to.size}px`, animate); this.#set(w.el, 'height', `${w.to.size}px`, animate); }
    else if (w.rule === 'I1' || w.rule === 'I3') { const s = w.prop ? Number(w.prop.value) : strokeOf(w.next); if (Number.isFinite(s)) this.#set(w.el, 'stroke-width', String(s), animate); }
    else if (w.rule === 'I4') this.#set(w.el, 'translate', `0 ${translateOf(w.next)}px`, animate);
    else if (w.rule === 'I5') this.#set(w.on, w.on === w.el ? 'margin-right' : 'column-gap', `${w.to.gap}px`, animate);
    else if (w.rule === 'I9') this.#set(w.on, 'min-width', `${w.to.target}px`, animate);
  }
  #set(el, prop, value, animate) {
    if (!this.#held.has(el)) this.#held.set(el, {});
    const was = this.#held.get(el);
    if (!(prop in was)) was[prop] = [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];
    const set = () => el.style.setProperty(prop, value, 'important');
    if (animate) ease(el, set, { props: [prop] }); else set();
  }
  clear() {
    for (const t of this.#timers) clearTimeout(t);
    this.#timers = [];
    for (const [el, was] of this.#held) {
      for (const [prop, [v, pr]] of Object.entries(was)) { if (v) el.style.setProperty(prop, v, pr); else el.style.removeProperty(prop); }
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    }
    this.#held.clear();
  }

  // the edits for apply-all, one guarded write per file; a class that can't be reached is left as is with its reason
  // Where a prop's number is written: the usage of the outermost component that was handed it. `<Chart size={16} />`
  // passes its props on to <Icon>, which draws the svg; the 16 is at the Chart, and that is the line a person would change.
  // The components come from React (the ones wrapping this icon alone, their props as given); the line from the icon's
  // own chain of usages. The server refuses a prop that is computed or only spread in, and says so.
  async #propSite(w) {
    const key = Object.keys(w.el).find((k) => k.startsWith('__reactFiber$'));
    let target = null;
    for (let f = key ? w.el[key]?.return : null, n = 0; f && typeof f.type !== 'string' && n < 12; f = f.return, n++) {
      const name = typeof f.type === 'function' ? f.type.displayName || f.type.name : f.type?.displayName ?? f.type?.render?.name ?? null;
      if (name && /^[A-Z]/.test(name) && f.memoizedProps && w.prop.name in f.memoizedProps) target = name;
    }
    if (!target) throw new Error('its size is not passed as a prop where it is used');
    const at = await locate(w.el, { chain: true });
    for (const link of (at?.chain ?? []).slice(1, 9)) {
      if (!link?.file) continue;
      const read = await request('props', { file: link.file, line: link.line, column: link.column }).catch(() => null);
      if (read?.tag === target && read.hash) return { file: read.file ?? link.file, hash: read.hash, line: read.line ?? link.line, column: read.column ?? link.column, name: w.prop.name, value: w.prop.value };
    }
    throw new Error('Plumber couldn’t find where this icon is used');
  }

  async edits() {
    const files = new Map(), refused = [], wrote = new Set(), props = [];
    const read = await Promise.all(this.#writes.map((w) => (w.prop ? this.#propSite(w).then((prop) => ({ w, prop })) : classEditsOf(w.on, w.cls, w.next).then((edits) => ({ w, edits }))).catch((error) => ({ w, why: error?.message ?? String(error) }))));
    for (const { w, edits, prop, why } of read) {
      if (why) { refused.push({ cls: w.cls ?? w.prop?.name, why }); continue; }
      if (prop) { wrote.add(w.el); if (!props.some((x) => x.file === prop.file && x.line === prop.line && x.column === prop.column && x.name === prop.name)) props.push(prop); continue; }
      wrote.add(w.el);
      for (const e of edits) {
        if (!files.has(e.file)) files.set(e.file, { file: e.file, hash: e.hash, edits: [] });
        files.get(e.file).edits.push(e.edit);
      }
    }
    // the icons written, so the saved line counts what landed, not what was planned
    return { swaps: [...files.values()], props, refused, places: wrote.size };
  }
}

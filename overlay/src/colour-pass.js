/* ─────────────────────────────────────────────────────────
 * COLOUR PASS · React Plumber overlay (docs/briefs/pass-colour.md)
 *
 * The clean-up's third pass: colours that are near-misses of the app's own colour tokens put back on them (colours.js,
 * scope keep: a token within ΔE 0.03, a fourth grey, faded text, pure black or white). Read from this page and the
 * site's palette, shown as the clean-up's show, written as class swaps where the class that sets the colour is.
 *
 *  read     the site's colours (GET palette), this page's places, keep's moves; one class, one write: a class that also
 *           sets colours that stay is left as is
 *  steps    the show's roles: one per token moved to (text first, then surfaces, then lines); its chip is a swatch of
 *           the colour most of its places have now, turning to the token's as the token's name takes its place; its
 *           marks are dashed rings round the places (no fill: the colour under them is what's being judged); setting it
 *           eases each place's colour in a short wave down the page
 *  clear    the page as it was: every inline colour taken back
 *  edits    the swaps for apply-all, through each class's site (locate.js classEditsOf)
 *  measure  distinct colours on this page (text, surfaces, lines), before → after; the site's, from the palette
 * ───────────────────────────────────────────────────────── */
import { request } from './api.js';
import { classEditsOf } from './locate.js';
import { ease } from './show.js';
import { loadPalette, paletteOf, proposeColours, readColours } from './colours.js';
import { placeOf } from './stamp.js';

const PROP = { text: 'color', bg: 'background-color', border: 'border-color' };
const ORDER = { text: 0, bg: 1, border: 2 };
const WAVE = 24, WAVE_MAX = 240; // ms between places down the page, and the whole wave's longest delay
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const keyOf = (el, prop, cls) => `${(placeOf(el) ?? '')}|${prop}|${cls}`;
const short = (cls) => (cls ?? '').replace(/^(text|bg|border)-/, '').replace(/^\[(.*)\]$/, '$1');
const mostOf = (vs) => vs.sort((a, b) => vs.filter((v) => v === b).length - vs.filter((v) => v === a).length)[0];

export class ColourPass {
  #writes = []; #held = new Map(); #timers = []; // el → { prop: [value, priority] } as the page had it
  page = null; // { writes, places, before, after, site, refused, content }

  async read() {
    const site = await request('palette', {}).catch(() => null);
    // an `@theme inline` theme leaves no variable per token on the page: the server's decisions name them first
    await loadPalette().catch(() => null);
    const palette = paletteOf(), places = readColours(document.body, { palette });
    const p = proposeColours(places, palette, { scope: 'keep' });
    const writes = new Map();
    for (const m of p.moves) {
      if (!m.el || !m.from?.cls || !m.to?.cls) continue;
      const k = keyOf(m.el, m.prop, m.from.cls);
      if (!writes.has(k)) writes.set(k, { prop: m.prop, cls: m.from.cls, next: m.to.cls, token: m.to.token, css: m.to.css, from: m.from.css, moves: [], els: new Set() });
      const w = writes.get(k);
      if (w.next !== m.to.cls) w.split = true; // one class drawn two ways can't be one write
      w.moves.push(m); w.els.add(m.el);
    }
    // one class, one write: the same class setting a colour that stays (elsewhere on this page) would move that too
    const all = new Map();
    for (const pl of places) for (const [prop, c] of Object.entries(pl.colours ?? {})) if (c?.cls) { const k = keyOf(pl.el, prop, c.cls); all.set(k, (all.get(k) ?? 0) + 1); }
    for (const [k, w] of writes) if (w.split || (all.get(k) ?? 0) > w.moves.length) writes.delete(k);
    this.#writes = [...writes.values()];
    const moved = this.#writes.reduce((n, w) => n + w.moves.length, 0);
    // distinct colours on this page (text, surfaces and lines together), as the proposal measured them; numbers only, as
    // this is kept across a reload
    const sum = (k) => Object.values(p.measure ?? {}).reduce((n, v) => n + (v?.[k] ?? 0), 0);
    this.page = { writes: this.#writes.length, places: moved, before: sum(0), after: moved ? sum(1) : sum(0), refused: p.refused.length, content: p.content ?? 0, routes: site?.routes ?? 0 };
    return this.page;
  }

  // the show's roles: one per token moved to, text first, then surfaces, then lines
  steps() {
    const by = new Map();
    for (const w of this.#writes) { const k = `${w.prop}|${w.token}`; if (!by.has(k)) by.set(k, []); by.get(k).push(w); }
    return [...by.values()].sort((a, b) => ORDER[a[0].prop] - ORDER[b[0].prop]).map((ws) => {
      const { prop, token, css } = ws[0], from = mostOf(ws.map((w) => w.from)), fromName = short(mostOf(ws.map((w) => w.cls)));
      const els = [...new Set(ws.flatMap((w) => [...w.els]))];
      return {
        chip: { label: `Colour: ${fromName} to ${token}`, name: `${fromName} → ${token}`, icon: `<span class="sw" style="--sw:${from};--sw-to:${css}"></span>`, from: fromName, swatch: css },
        to: token,
        bands: () => els.map((el) => ({ kind: 'ink', rect: () => el.getBoundingClientRect() })),
        morph: (animate) => this.#wave(els, PROP[prop], css, animate),
      };
    });
  }
  // every role set at once (Space released, a reload's resume)
  show() { for (const s of this.steps()) s.morph(false); }

  // the places take the token's colour top to bottom: a short wave, so the change reads as one sweep, not a flash
  #wave(els, prop, value, animate) {
    if (!animate || still()) { for (const el of els) this.#set(el, prop, value, false); return; }
    const top = Math.min(...els.map((el) => el.getBoundingClientRect().top)), span = Math.max(1, Math.max(...els.map((el) => el.getBoundingClientRect().top)) - top);
    for (const el of els) {
      const delay = Math.min(WAVE_MAX, Math.round(((el.getBoundingClientRect().top - top) / span) * Math.min(WAVE_MAX, WAVE * els.length)));
      if (!delay) this.#set(el, prop, value, true);
      else this.#timers.push(setTimeout(() => this.#set(el, prop, value, true), delay));
    }
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

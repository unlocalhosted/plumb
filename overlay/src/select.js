/* ─────────────────────────────────────────────────────────
 * SELECT · React Plumber overlay
 *
 * The element is the target (docs/briefs/insight-not-noise.md §3, layer 1). With blueprint on, a click anywhere on an
 * element selects it: not a 14px pin, not a label. The selection is drawn on the element in the overlay's language,
 * from its verdict (verdict.js):
 *
 *  ring      sky around the element; hollow grey when the dev server is down (nothing can be fixed); shimmering while
 *            its verdict is still being read
 *  tag       its name above it (the only words at rest), a dot when it is tied to a line of your code, and one dot per
 *            problem when it has more than one (`.` `,` or a second click step through them; the current one filled)
 *  bands     its box model (boxmodel.js): the bands a problem claims coral, the current one strongest, every other
 *            band faint sky
 *  pill      pointing at a band gives one pill: the property, its number, the token in brackets
 *
 * A click on the page outside every element, or Esc, lets go. Nothing here writes to the page.
 * Motion: the ring, tag and bands pop in on --pl-spring-pop; under reduced motion they appear at once.
 * ───────────────────────────────────────────────────────── */
import { boxModel, pointAt, BOXMODEL_CSS } from './boxmodel.js';
import { LANGUAGE_CSS } from './language.js';
import { facetOf } from './craft-facets.js';

export const SELECT_CSS = `
  ${LANGUAGE_CSS}
  ${BOXMODEL_CSS}
  .sel { position: fixed; inset: 0; pointer-events: none; }
  .sel[hidden] { display: none; }
  .sel .ring { position: fixed; box-sizing: border-box; border-radius: 6px; border: 1.5px solid var(--pl-sky); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .sel .ring[data-state="disabled"] { border: 1.5px dashed color-mix(in oklab, var(--pl-ink) 40%, transparent); }
  .sel .ring[data-state="loading"] { border-color: color-mix(in oklab, var(--pl-sky) 45%, transparent); animation: pl-pop 260ms var(--pl-spring-pop) both, sel-shimmer 1.2s ease-in-out infinite alternate; }
  @keyframes sel-shimmer { to { border-color: var(--pl-sky); } }
  .sel .bm { animation: pl-pop 260ms var(--pl-spring-pop) 40ms both; }
  /* bands the verdict doesn't claim stay faint; the current problem's band is the strongest thing drawn */
  .sel .bm > :is(.m, .p, .g):not(.off) { opacity: .45; }
  .sel .bm > .off[data-current] { --c: var(--pl-coral); filter: saturate(1.2); }
  .sel .pl-tag .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--pill-ink, var(--pl-lilac-ink)); margin-right: 1px; }
  .sel .pl-tag .rail { display: inline-flex; gap: 3px; margin-left: 3px; }
  .sel .pl-tag .rail i { width: 5px; height: 5px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--pill-ink, var(--pl-lilac-ink)); }
  .sel .pl-tag .rail i.on { background: var(--pill-ink, var(--pl-lilac-ink)); }
  @media (prefers-reduced-motion: reduce) { .sel .ring, .sel .bm { animation: none; } }
`;

export class Selection {
  #layer; #pill; #el = null; #item = null; #bands = []; #at = 0;
  #tokenOf; #health; #onChange;

  // tokenOf(family, px) → a step's short name or null; health() → the dev server's state; onChange(el | null) when the
  // selection moves (the mark layer steps aside for it)
  constructor(root, { tokenOf, health, onChange }) {
    this.#tokenOf = tokenOf;
    this.#health = health;
    this.#onChange = onChange;
    this.#layer = Object.assign(document.createElement('div'), { className: 'sel', hidden: true });
    this.#layer.setAttribute('aria-hidden', 'true');
    this.#pill = document.createElement('div');
    root.append(this.#layer, this.#pill);
  }

  get el() { return this.#el; }
  // the problems on the selected element, one per facet, in the verdict's order
  get problems() { return (this.#item?.marks ?? []).filter((m) => m.family === 'craft' || m.ledger === 'new'); }
  get current() { return this.problems[this.#at] ?? null; }

  // Select an element (and its reading, when the reader has one); selecting the selected element steps to its next
  // problem.
  select(el, item) {
    if (el === this.#el) { this.step(1); return; }
    this.#el = el; this.#item = item ?? null; this.#at = 0;
    this.#onChange?.(el);
    this.#layer.hidden = false;
    this.draw(true);
  }
  // The reader read the page again: the selected element's verdict may have changed.
  refresh(item) {
    if (!this.#el) return;
    if (!this.#el.isConnected) return this.clear();
    this.#item = item ?? null;
    this.#at = Math.min(this.#at, Math.max(0, this.problems.length - 1));
    this.draw();
  }
  step(by) {
    const n = this.problems.length;
    if (n < 2) return false;
    this.#at = (this.#at + by + n) % n;
    this.draw();
    return true;
  }
  clear() {
    if (!this.#el) return false;
    this.#el = null; this.#item = null; this.#bands = [];
    this.#onChange?.(null);
    this.#layer.replaceChildren(); this.#layer.hidden = true;
    pointAt(this.#pill, [], 0, 0);
    return true;
  }
  // The pointer moved: one pill for the band under it, while something is selected.
  point(x, y) {
    if (!this.#el) return;
    pointAt(this.#pill, this.#bands, x, y);
  }

  draw(fresh = false) {
    const el = this.#el;
    if (!el) return;
    if (!el.isConnected) { this.clear(); return; }
    const problems = this.problems, current = this.current;
    const claimed = new Set(problems.flatMap((m) => m.facets ?? []));
    const now = new Set(current?.facets ?? []);
    const state = this.#health?.() === 'failed' ? 'disabled' : this.#item ? 'ready' : 'loading';
    const rail = problems.length > 1 ? `<span class="rail">${problems.map((_, i) => `<i${i === this.#at ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
    const bm = boxModel(el, {
      name: el.localName, tokenOf: this.#tokenOf,
      // a band is coral when a problem on this element claims its property
      claimed: (prop) => claimed.has(facetOf(prop)),
      tag: { before: this.#item?.file ? '<span class="dot"></span>' : '', after: rail },
    });
    this.#bands = bm.bands;
    const r = el.getBoundingClientRect();
    const ring = `<div class="ring" data-state="${state}" style="left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px"></div>`;
    this.#layer.innerHTML = ring + bm.html;
    // the current problem's bands draw strongest
    for (const b of this.#layer.querySelectorAll('.bm > .off')) {
      const at = this.#bands.find((x) => x.off && Math.abs(x.x - parseFloat(b.style.left)) < 0.6 && Math.abs(x.y - parseFloat(b.style.top)) < 0.6);
      if (at && now.has(facetOf(at.prop))) b.setAttribute('data-current', '');
    }
    if (!fresh) for (const n of this.#layer.querySelectorAll('.ring, .bm')) n.style.animation = 'none';
  }
}

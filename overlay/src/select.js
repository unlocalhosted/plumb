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
import { PRIMITIVES_CSS, stepper } from './editor-primitives.js';
import { planOf, moved, preview, GLYPHS, SPACING_PROPS } from './inplace.js';
import { scrub, SCRUB_CSS, cursorOf } from './scrub.js';

export const SELECT_CSS = `
  ${LANGUAGE_CSS}
  ${BOXMODEL_CSS}
  ${PRIMITIVES_CSS}
  ${SCRUB_CSS}
  /* the fix, drawn on the element: the ghost of the element as it will be, the scale with the target ringed, the
     reason at the band's end (docs/briefs/insight-not-noise.md §2.1) */
  .sel .ghost { position: fixed; box-sizing: border-box; border: 1.5px dashed var(--pl-sky); border-radius: 8px; animation: pl-pop 260ms var(--pl-spring-pop) 40ms both; }
  .sel .stair { position: fixed; pointer-events: auto; padding: 2px 4px; border-radius: 9px; background: var(--pl-paper); box-shadow: 0 1px 3px rgb(0 0 0 / .18); animation: pl-pop 260ms var(--pl-spring-pop) 80ms both; }
  .sel .reason { position: fixed; width: 20px; height: 20px; padding: 2px; box-sizing: border-box; border-radius: 6px; color: var(--pl-coral-ink); background: var(--pl-coral-soft); }
  .sel .reason svg { display: block; width: 100%; height: 100%; }
  /* accepted, not written: marching ants, the claimed bands mint */
  .sel[data-state="accepted"] .ring { border: 0; background-image: repeating-linear-gradient(90deg, var(--pl-sky) 0 5px, transparent 5px 9px), repeating-linear-gradient(90deg, var(--pl-sky) 0 5px, transparent 5px 9px), repeating-linear-gradient(0deg, var(--pl-sky) 0 5px, transparent 5px 9px), repeating-linear-gradient(0deg, var(--pl-sky) 0 5px, transparent 5px 9px);
    background-size: 100% 1.5px, 100% 1.5px, 1.5px 100%, 1.5px 100%; background-position: 0 0, 0 100%, 0 0, 100% 0; background-repeat: no-repeat; border-radius: 0; animation: sel-march 600ms linear infinite; }
  .sel[data-state="accepted"] .bm > .off { --c: var(--pl-mint); }
  @keyframes sel-march { to { background-position: 9px 0, -9px 100%, 0 -9px, 100% 9px; } }
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
  @media (prefers-reduced-motion: reduce) { .sel .ring, .sel .bm, .sel .ghost, .sel .stair { animation: none !important; } }
`;

export class Selection {
  #layer; #pill; #el = null; #item = null; #bands = []; #at = 0;
  #tokenOf; #health; #onChange; #changes; #steps; #plan = null; #previewing = false;

  // tokenOf(family, px) → a step's short name or null; health() → the dev server's state; onChange(el | null) when the
  // selection moves (the mark layer steps aside for it); changes: the Changes sidebar a fix is accepted into;
  // steps(family) → the theme's scale [{ token, n }]
  constructor(root, { tokenOf, health, onChange, changes, steps }) {
    this.#tokenOf = tokenOf;
    this.#health = health;
    this.#onChange = onChange;
    this.#changes = changes;
    this.#steps = steps;
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
    this.#unpreview();
    this.#el = el; this.#item = item ?? null; this.#at = 0; this.#plan = null;
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
    this.#unpreview();
    this.#at = (this.#at + by + n) % n;
    this.#plan = null;
    this.draw();
    return true;
  }
  clear() {
    if (!this.#el) return false;
    this.#unpreview();
    this.#el = null; this.#item = null; this.#bands = []; this.#plan = null;
    this.#onChange?.(null);
    this.#layer.replaceChildren(); this.#layer.hidden = true;
    pointAt(this.#pill, [], 0, 0);
    return true;
  }
  // A key while an element is selected: ↑ ↓ (→ ←) move the target along the scale and preview it on the page; Enter
  // accepts it into Changes; Backspace drops the element's change. True when used.
  key(key) {
    if (!this.#el) return false;
    if (key === 'Backspace' && this.#changes?.has(this.#el)) { this.#changes.discard(this.#el); this.#plan = null; this.draw(); return true; }
    const plan = this.#plan;
    if (!plan) return false;
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[key];
    if (by) { this.#plan = moved(plan, by); preview(this.#el, this.#plan, true); this.#previewing = true; this.draw(); return true; }
    if (key === 'Enter') { this.accept(); return true; }
    return false;
  }
  // The fix as it stands becomes the element's change in the sidebar (still only on the page: Apply writes it).
  accept() {
    const plan = this.#plan, el = this.#el;
    if (!plan || !el || !this.#changes) return false;
    preview(el, plan, true);
    for (const p of plan.props) this.#changes.set(el, el.localName, p.prop, p.from, p.to, p.original);
    this.#previewing = false; // Changes owns the preview now
    this.draw();
    return true;
  }
  // Pressed on a spacing band of the selected element: drag it through the scale (scrub.js); letting go makes it a
  // change in the sidebar, like accepting a fix. True when the press was taken.
  press(e) {
    if (!this.#el || !this.#changes) return false;
    const band = this.#bands.find((b) => b.prop && SPACING_PROPS.has(b.prop) && e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h);
    if (!band) return false;
    const steps = this.#steps?.('spacing') ?? [];
    if (!steps.length) return false;
    const el = this.#el, prop = band.prop;
    const original = [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];
    const from = { token: this.#tokenOf('spacing', band.n), n: band.n };
    this.#unpreview();
    pointAt(this.#pill, [], 0, 0);
    scrub(e, { el, prop, steps, from: band.n, host: this.#layer, onStep: () => this.draw(), onDone: (step) => {
      if (step) this.#changes.set(el, el.localName, prop, from, step, original);
      this.draw();
    } });
    return true;
  }
  // The cursor over the selected element's bands says what can be dragged.
  cursor(x, y) {
    const band = this.#el && this.#bands.find((b) => b.prop && SPACING_PROPS.has(b.prop) && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    return band ? cursorOf(band.prop) : '';
  }
  #unpreview() {
    if (this.#previewing && this.#el && this.#plan && !this.#changes?.has(this.#el)) preview(this.#el, this.#plan, false);
    this.#previewing = false;
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
    // the fix, in place: only for a problem whose verified fix sets spacing, and only until it is accepted
    const accepted = !!this.#changes?.has(el);
    this.#layer.dataset.state = accepted ? 'accepted' : state;
    let fix = '';
    if (!accepted && current && state === 'ready') {
      this.#plan ??= planOf(current, el, this.#steps?.('spacing') ?? [], (n) => this.#tokenOf('spacing', n));
      const plan = this.#plan;
      if (plan) {
        const g = plan.ghost;
        const stair = stepper(plan.main.prop, { steps: plan.steps, current: plan.main.from.token, picked: plan.steps[plan.at].token });
        fix = `<div class="ghost" style="left:${g.left - 3}px;top:${g.top - 3}px;width:${g.width + 6}px;height:${g.height + 6}px"></div>`
          + `<div class="stair" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + 12}px">${stair}</div>`
          + `<span class="reason" style="left:${g.left + g.width + 10}px;top:${r.top + r.height / 2 - 10}px">${GLYPHS.ratio}</span>`;
      }
    }
    this.#layer.innerHTML = fix + ring + bm.html;
    // the staircase: pointing a step previews it, a click picks it
    for (const opt of this.#layer.querySelectorAll('.stair .opt[data-i]')) opt.addEventListener('click', () => { const i = +opt.dataset.i; this.#plan = moved(this.#plan, i - this.#plan.at); preview(el, this.#plan, true); this.#previewing = true; this.draw(); });
    // the current problem's bands draw strongest
    for (const b of this.#layer.querySelectorAll('.bm > .off')) {
      const at = this.#bands.find((x) => x.off && Math.abs(x.x - parseFloat(b.style.left)) < 0.6 && Math.abs(x.y - parseFloat(b.style.top)) < 0.6);
      if (at && now.has(facetOf(at.prop))) b.setAttribute('data-current', '');
    }
    if (!fresh) for (const n of this.#layer.querySelectorAll('.ring:not(:where([data-state="accepted"]) *), .bm, .ghost, .stair')) n.style.animation = 'none';
    if (accepted) for (const n of this.#layer.querySelectorAll('.ring')) n.style.removeProperty('animation');
  }
}

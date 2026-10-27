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
import { PRIMITIVES_CSS, stepper, swatches } from './editor-primitives.js';
import { esc } from './choices.js';
import { planOf, moved, preview, GLYPHS, SPACING_PROPS, swapPlanOf, swapPreview, swapRelease, FACET_SAID, glyphOf } from './inplace.js';
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
  .sel .reason[data-big] { width: 40px; height: 40px; padding: 6px; }
  .sel .why { position: fixed; max-width: 320px; padding: 5px 10px; border-radius: 10px; font: 500 12px/1.35 var(--pl-sans); background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 3px rgb(0 0 0 / .2); animation: pl-pop 200ms var(--pl-spring-pop) both; }
  .sel .why .more { color: var(--pl-ink-2); }
  /* no verified fix: the scale with a hollow bar where the step would be, or the target struck by a higher rule */
  .sel .stair .gap { display: inline-block; width: 18px; height: 14px; margin: 0 4px; border-radius: 3px; box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-ink) 35%, transparent); vertical-align: middle; }
  .sel .stair .struck { position: relative; display: inline-block; width: 18px; height: 14px; margin: 0 4px; border-radius: 3px; box-shadow: inset 0 0 0 1.5px var(--pl-sky); vertical-align: middle; }
  .sel .stair .struck::after { content: ''; position: absolute; left: -2px; right: -2px; top: 6px; height: 2px; border-radius: 2px; background: var(--pl-coral); rotate: -20deg; }
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
  .sel .pl-tag .places { margin-left: 4px; font-variant-numeric: tabular-nums; }
  .sel .sib { position: fixed; box-sizing: border-box; border-radius: 6px; border: 1px solid color-mix(in oklab, var(--pl-sky) 70%, transparent); }
  .sel .pl-tag .rail i { width: 5px; height: 5px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--pill-ink, var(--pl-lilac-ink)); }
  .sel .pl-tag .rail i.on { background: var(--pill-ink, var(--pl-lilac-ink)); }
  @media (prefers-reduced-motion: reduce) { .sel .ring, .sel .bm, .sel .ghost, .sel .stair { animation: none !important; } }
`;

export class Selection {
  #layer; #pill; #el = null; #item = null; #bands = []; #at = 0;
  #tokenOf; #health; #onChange; #changes; #steps; #read; #plan = null; #previewing = false; #memo = {}; #taken = new Set(); #why = 0; #group = []; #site; // why: 0 hidden, 1 the line, 2.. the folded ones; group: the cause's other places

  // tokenOf(family, px) → a step's short name or null; health() → the dev server's state; onChange(el | null) when the
  // selection moves (the mark layer steps aside for it); changes: the Changes sidebar a fix is accepted into;
  // steps(family) → the theme's scale [{ token, n }]
  // read(el) → the element's full reading (each theme choice's exact class edit)
  // site(el) → { file, line, column, hash } read now (where its changes will be written)
  constructor(root, { tokenOf, health, onChange, changes, steps, read, site }) {
    this.#read = read;
    this.#site = site;
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
  // `chosen`: { key, rule, group } when a pin, a label or a panel row chose one of its problems (and the other places
  // of that problem's cause, [{ el, item, key }])
  select(el, item, chosen = null) {
    if (el === this.#el && !chosen) { this.step(1); return; }
    // chosen again (Enter on its focused mark): the fix shown is taken
    if (el === this.#el && chosen && this.current?.key === chosen.key && this.#plan) { this.accept(); return; }
    this.#unpreview();
    this.#el = el; this.#item = item ?? null; this.#at = 0; this.#plan = null; this.#taken = new Set(); this.#why = 0;
    this.#group = chosen?.group ?? [];
    if (chosen) {
      // the problem chosen by its key; a craft finding folded under another is found through the one it rides on
      let i = this.problems.findIndex((m) => m.key === chosen.key);
      if (i < 0 && String(chosen.rule).startsWith('craft/')) i = this.problems.findIndex((m) => m.rule === chosen.rule || (m.also ?? []).some((a) => a.rule === chosen.rule));
      if (i >= 0) this.#at = i;
    }
    this.#onChange?.(el);
    this.#layer.hidden = false;
    this.draw(true);
  }
  // The reader read the page again: the selected element's verdict may have changed.
  refresh(item) {
    if (!this.#el) return;
    if (!this.#el.isConnected) return this.clear();
    const was = this.current?.key;
    this.#item = item ?? null;
    // the same problem stays current through a re-read (the order can change); else the first one not yet taken
    const same = this.problems.findIndex((m) => m.key === was && !this.#taken.has(m.key));
    const open = this.problems.findIndex((m) => !this.#taken.has(m.key));
    this.#at = same >= 0 ? same : open >= 0 ? open : Math.min(this.#at, Math.max(0, this.problems.length - 1));
    if (this.current?.key !== was) this.#plan = null;
    this.draw();
  }
  step(by) {
    const n = this.problems.length;
    if (n < 2) return false;
    this.#unpreview();
    this.#at = (this.#at + by + n) % n;
    this.#plan = null; this.#why = 0;
    this.draw();
    return true;
  }
  clear() {
    if (!this.#el) return false;
    this.#unpreview();
    this.#el = null; this.#item = null; this.#bands = []; this.#plan = null; this.#group = [];
    this.#onChange?.(null);
    this.#layer.replaceChildren(); this.#layer.hidden = true;
    pointAt(this.#pill, [], 0, 0);
    return true;
  }
  // A key while an element is selected: ↑ ↓ (→ ←) move the target along the scale and preview it on the page; Enter
  // accepts it into Changes; Backspace drops the element's change. True when used.
  key(key) {
    if (!this.#el) return false;
    if (key === 'i') { const n = 2 + (this.current?.also?.length ?? 0); this.#why = (this.#why + 1) % n; this.draw(); return true; }
    if (key === 'Backspace' && this.#changes?.has(this.#el)) { this.#changes.discard(this.#el); this.#taken = new Set(); this.#plan = null; this.draw(); return true; }
    const plan = this.#plan;
    if (!plan) return false;
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[key];
    if (by) { this.#move(by); return true; }
    if (key === 'Enter') { this.accept(); return true; }
    return false;
  }
  // The target moved along the plan's options: the page previews it.
  #move(by) {
    const plan = this.#plan, el = this.#el;
    if (plan.kind === 'swap') {
      const at = Math.max(0, Math.min(plan.options.length - 1, plan.at + by));
      this.#plan = { ...plan, at };
      swapPreview(el, plan.options[at].write, true, this.#memo, plan.options[at].styles);
    } else { this.#plan = moved(plan, by); preview(el, this.#plan, true); }
    this.#previewing = true;
    this.draw();
  }
  // The fix as it stands becomes the element's change in the sidebar (still only on the page: Apply writes it); the
  // element's next problem with a fix becomes current.
  accept() {
    const plan = this.#plan, el = this.#el, problem = this.current;
    if (!plan || !el || !this.#changes || !problem) return false;
    if (plan.kind === 'swap') {
      const opt = plan.options[plan.at];
      if (!opt.write) return false; // its exact edit is still being read
      const memo = this.#memo;
      // the sidebar keeps the classes as written: the preview is put back while it records them, then shown again
      swapPreview(el, null, false, memo);
      this.#changes.put(el, el.localName, problem.key, { label: FACET_SAID[plan.facet] ?? plan.facet ?? 'class', from: plan.now?.label ?? opt.write.from, to: opt.label, write: opt.write, undo: () => swapPreview(el, null, false, memo), release: () => swapRelease(el, memo) });
      swapPreview(el, opt.write, true, memo, opt.styles);
      // the same edit at every other place of the cause whose classes carry it
      for (const g of this.#group) {
        if (!String(opt.write.from).split(/\s+/).filter(Boolean).every((c) => g.el.classList.contains(c))) continue;
        const m = {};
        this.#changes.put(g.el, g.el.localName, g.key ?? problem.key, { label: FACET_SAID[plan.facet] ?? plan.facet ?? 'class', from: plan.now?.label ?? opt.write.from, to: opt.label, write: opt.write, undo: () => swapPreview(g.el, null, false, m), release: () => swapRelease(g.el, m) });
        swapPreview(g.el, opt.write, true, m, opt.styles);
      }
      this.#memo = {};
    } else {
      preview(el, plan, true);
      for (const p of plan.props) this.#changes.set(el, el.localName, p.prop, p.from, p.to, p.original);
      // every other place of the cause takes the same steps
      for (const g of this.#group) for (const p of plan.props) {
        const original = [g.el.style.getPropertyValue(p.prop), g.el.style.getPropertyPriority(p.prop)];
        g.el.style.setProperty(p.prop, `${p.to.n}px`, 'important');
        this.#changes.set(g.el, g.el.localName, p.prop, p.from, p.to, original);
      }
    }
    this.#previewing = false; // Changes owns the preview now
    // the file as it is now, for every element that just took its first change
    for (const at of [el, ...this.#group.map((g) => g.el)]) if (this.#changes.has(at) && !this.#changes.siteOf(at)) this.#site?.(at).then((s) => s && this.#changes.site(at, s)).catch(() => {});
    this.#taken.add(problem.key);
    this.#plan = null;
    const next = this.problems.findIndex((m, i) => i !== this.#at && !this.#taken.has(m.key));
    if (next >= 0) this.#at = next;
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
  // Changes dropped an element's change: whatever this selection previews on it goes too.
  discarded(el) {
    if (el !== this.#el) return;
    this.#unpreview();
    this.#taken = new Set();
    this.#plan = null;
    this.draw();
  }
  // The cursor over the selected element's bands says what can be dragged.
  cursor(x, y) {
    const band = this.#el && this.#bands.find((b) => b.prop && SPACING_PROPS.has(b.prop) && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    return band ? cursorOf(band.prop) : '';
  }
  #unpreview() {
    if (this.#previewing && this.#el && this.#plan) {
      if (this.#plan.kind === 'swap') swapPreview(this.#el, null, false, this.#memo);
      else if (!this.#changes?.has(this.#el)) preview(this.#el, this.#plan, false);
    }
    this.#previewing = false;
  }

  // The pointer moved: one pill for the band under it, while something is selected.
  point(x, y) {
    if (!this.#el) return;
    pointAt(this.#pill, this.#bands, x, y);
  }

  // Everything drawn beside the element stays on the screen: a piece that runs off the right edge comes back in, and
  // the reason, drawn at the element's right, moves to its left. All reads, then all writes.
  #fit(r) {
    const pieces = [...this.#layer.querySelectorAll('.stair, .why, .reason')].map((el) => ({ el, b: el.getBoundingClientRect() }));
    const edge = innerWidth - 4;
    for (const { el, b } of pieces) {
      if (b.right <= edge) continue;
      el.style.left = `${el.classList.contains('reason') ? Math.max(4, r.left - b.width - 10) : Math.max(4, edge - b.width)}px`;
    }
  }
  draw(fresh = false) {
    const el = this.#el;
    if (!el) return;
    if (!el.isConnected) { this.clear(); return; }
    const problems = this.problems, current = this.current;
    const claimed = new Set(problems.flatMap((m) => m.facets ?? []));
    const now = new Set(current?.facets ?? []);
    const state = this.#health?.() === 'failed' ? 'disabled' : this.#item ? 'ready' : 'loading';
    const places = this.#group.length ? `<span class="places">×${this.#group.length + 1}</span>` : '';
    const rail = problems.length > 1 ? `<span class="rail">${problems.map((_, i) => `<i${i === this.#at ? ' class="on"' : ''}></i>`).join('')}</span>` : '';
    const bm = boxModel(el, {
      name: el.localName, tokenOf: this.#tokenOf,
      // a band is coral when a problem on this element claims its property
      claimed: (prop) => claimed.has(facetOf(prop)),
      tag: { before: this.#item?.file ? '<span class="dot"></span>' : '', after: rail + places },
    });
    this.#bands = bm.bands;
    const r = el.getBoundingClientRect();
    const ring = `<div class="ring" data-state="${state}" style="left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px"></div>`;
    // the fix, in place, for the current problem until it is accepted; the element shows ants once it has a change
    const accepted = !!this.#changes?.has(el);
    this.#layer.dataset.state = accepted ? 'accepted' : state;
    let fix = '';
    if (current && !this.#taken.has(current.key) && state === 'ready') {
      this.#plan ??= planOf(current, el, this.#steps?.('spacing') ?? [], (n) => this.#tokenOf('spacing', n)) ?? swapPlanOf(current);
      const plan = this.#plan;
      if (plan?.kind === 'swap') {
        // a theme choice's exact class edit comes from the element's full reading, read once
        if (plan.options.some((o) => !o.write) && !plan.reading && this.#read) {
          plan.reading = true;
          const key = current.key;
          plan.key = key;
          this.#read(el).then((full) => {
            const m = full?.marks?.find((x) => x.key === key);
            // the plan may have moved on (an arrow made a new one): the edits go to whichever plan is current for it
            const now = this.#plan;
            if (!m || !now || now.key !== key || this.#el !== el) return;
            now.options = now.options.map((o) => { const c = m.choices?.find((x) => (x.label ?? x.name) === o.label); return c?.edit ? { ...o, write: { from: c.edit.from, to: c.edit.to } } : o; });
            this.draw();
          }).catch(() => { if (this.#plan?.key === key) this.#plan.reading = false; });
        }
        const o = plan.options;
        const control = o.every((x) => x.swatch) ? swatches(plan.facet ?? 'colour', { steps: o.map((x) => ({ token: x.label, swatch: x.swatch })), current: null, picked: o[plan.at].label, drift: plan.now?.swatch ? { label: plan.now.label, swatch: plan.now.swatch } : undefined })
          : o.every((x) => Number.isFinite(x.n)) && o.length > 1 ? stepper(plan.facet ?? 'value', { steps: o.map((x) => ({ token: x.label, n: x.n })), current: null, picked: o[plan.at].label, drift: Number.isFinite(plan.now?.n) ? { n: plan.now.n, label: String(plan.now.n) } : undefined })
          : `<span class="pl-pill target" data-hue="sky">→ ${esc(o[plan.at].label)}</span>`;
        fix = `<div class="stair" data-kind="swap" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + 12}px">${control}</div>`;
      } else if (plan) {
        const g = plan.ghost;
        const stair = stepper(plan.main.prop, { steps: plan.steps, current: plan.main.from.token, picked: plan.steps[plan.at].token });
        fix = `<div class="ghost" style="left:${g.left - 3}px;top:${g.top - 3}px;width:${g.width + 6}px;height:${g.height + 6}px"></div>`
          + `<div class="stair" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + 12}px">${stair}</div>`
          + `<span class="reason"${this.#why ? " data-big" : ""} style="left:${g.left + g.width + 10}px;top:${r.top + r.height / 2 - (this.#why ? 20 : 10)}px">${glyphOf(current)}</span>`;
      }
    }
    // no verified fix: the reason is still drawn, and the scale says why not (a hollow bar, or a struck target)
    if (current && !fix && state === 'ready' && !this.#taken.has(current.key)) {
      const whyNot = current.whyNot ?? (current.craft?.suggest?.kind === 'advice' ? 'advice' : null);
      if (whyNot === 'no-step') fix = `<div class="stair" data-kind="no-step" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + 12}px"><span class="gap" title="no step"></span></div>`;
      else if (whyNot === 'higher-tier') fix = `<div class="stair" data-kind="higher-tier" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + 12}px"><span class="struck" title="a more important rule says no"></span></div>`;
    }
    // the reason, drawn at the element's side: bigger while its words are shown
    if (current && state === 'ready' && !this.#taken.has(current.key) && !/class="reason"/.test(fix)) fix += `<span class="reason"${this.#why ? ' data-big' : ''} style="left:${r.right + 10}px;top:${r.top + r.height / 2 - (this.#why ? 20 : 10)}px">${glyphOf(current)}</span>`;
    // i: the one line (what is wrong), then each folded finding's; the advice when no fix is offered
    if (current && this.#why) {
      const also = current.also ?? [];
      const text = this.#why === 1 ? `${current.title}${current.craft?.suggest?.kind === 'advice' ? ` ${current.craft.suggest.text}` : ''}` : also[this.#why - 2]?.title ?? '';
      const more = this.#why === 1 && also.length ? ` <span class="more">· also ${also.length}</span>` : '';
      fix += `<div class="why" style="left:${Math.max(4, r.left - 4)}px;top:${r.bottom + (fix.includes('class="stair"') ? 56 : 12)}px">${esc(String(text).replace(/`/g, ''))}${more}</div>`;
    }
    const sibs = this.#group.filter((g) => g.el.isConnected).map((g) => { const q = g.el.getBoundingClientRect(); return `<div class="sib" style="left:${q.left - 2}px;top:${q.top - 2}px;width:${q.width + 4}px;height:${q.height + 4}px"></div>`; }).join('');
    this.#layer.innerHTML = fix + sibs + ring + bm.html;
    this.#fit(r);
    // the control: a click on an option picks it (and previews it)
    for (const opt of this.#layer.querySelectorAll('.stair .opt[data-i]')) opt.addEventListener('click', () => { this.#move(+opt.dataset.i - this.#plan.at); });
    // pointing at the control previews the target on the page; leaving it puts the page back (until it is taken)
    const stair = this.#layer.querySelector('.stair[data-kind="swap"], .stair:not([data-kind])');
    if (stair && this.#plan) {
      // a real move over it, not a redraw under a still pointer
      stair.addEventListener('pointermove', (e) => { if (!this.#previewing && (e.movementX || e.movementY)) this.#move(0); });
      stair.addEventListener('pointerleave', () => { this.#unpreview(); });
    }
    // the current problem's bands draw strongest
    for (const b of this.#layer.querySelectorAll('.bm > .off')) {
      const at = this.#bands.find((x) => x.off && Math.abs(x.x - parseFloat(b.style.left)) < 0.6 && Math.abs(x.y - parseFloat(b.style.top)) < 0.6);
      if (at && now.has(facetOf(at.prop))) b.setAttribute('data-current', '');
    }
    if (!fresh) for (const n of this.#layer.querySelectorAll('.ring:not(:where([data-state="accepted"]) *), .bm, .ghost, .stair')) n.style.animation = 'none';
    if (accepted) for (const n of this.#layer.querySelectorAll('.ring')) n.style.removeProperty('animation');
  }
}

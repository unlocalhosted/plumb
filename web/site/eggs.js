/* ─────────────────────────────────────────────────────────
 * THE EGGS · the real faults behind each toy on the floor (site/Floor.jsx)
 *
 * Nothing is staged. Behind a toy are the faults of its kind that Plumber found on the homepage and that nobody
 * fixed (findings.json). Press it: the page comes to one of them, the toy flies over, the card says what Plumber
 * found and where in the code, and the product's own show plays (overlay/src/show.js): guides in coral, the move on
 * the spring with the value rolling, the landing in sky, the guides go. The rest of that kind are fixed with it, the
 * count falls, and they stay fixed for the visit (fixes.js). Then the page glides back, unless the person moved it.
 *
 * Interrupted (Esc, another toy, leaving): whatever was being fixed is fixed at once, never put back.
 * Reduced motion: fixed at once, with the card and no travel.
 * ───────────────────────────────────────────────────────── */
import { Scope } from '../../overlay/src/scope.js';
import { play, playAll, PageGuides, BEAT, SPRING } from '../../overlay/src/show.js';
import { reduced } from '../../overlay/src/motion.js';
import { ITEMS } from './fixes.js';

// [drawn as, what it was, what it becomes]: the pill's words, for a fix that isn't a number
const DRAWN = {
  'craft/continuous-corners': ['round corners', 'squircle'],
  'craft/text-wrap-role': ['uneven lines', 'balanced'],
  'craft/truncate-intent': ['cut off', 'full text on hover'],
  'tells/eyebrow': ['an extra label', 'gone'],
  'craft/contrast': ['hard to read', 'readable'],
  'craft/text-opacity': ['faded with opacity', 'a real colour'],
  'craft/gradient-space': ['grey in the middle', 'mixed in OKLCH'],
  'craft/layered-shadow': ['one blur', 'layered'],
  'craft/tinted-shadow': ['a grey shadow', 'tinted'],
  'craft/baseline-align': ['two baselines', 'one baseline'],
  'craft/flex-min': ['can’t shrink', 'scrolls inside'],
  'craft/touch-manipulation': ['flashes on tap', 'no flash'],
  'craft/scroll-cue': ['no sign it scrolls', 'fades at the edge'],
  'a11y/label-in-name': ['named differently', 'named as shown'],
  'a11y/nav-unnamed': ['no name', 'named'],
  'a11y/heading-skip': ['skips a level', 'in order'],
  'a11y/svg-name': ['read out', 'hidden'],
};

const px = (el, prop) => Math.round(parseFloat(getComputedStyle(el).getPropertyValue(prop)) || 0);
function drawn(item, el) {
  const css = item.make.css ?? {};
  if (item.rule.startsWith('provenance/motion')) return { from: item.from, to: item.to, unit: 'ms', name: item.token };
  if (item.rule.startsWith('provenance/')) return { from: item.from, to: item.to, unit: 'px', name: item.token };
  if (item.rule === 'craft/card-optical-padding') {
    const from = px(el, 'padding-top');
    return { look: 'pad', from, to: from - Number(css['padding-top'].match(/- (\d+)px/)[1]), unit: 'px' };
  }
  if (item.rule === 'craft/icon-side') { const [prop, to] = Object.entries(css)[0]; return { from: px(el, prop), to: parseFloat(to), unit: 'px' }; }
  if (item.rule === 'craft/hit-target') return { from: Math.round(el.getBoundingClientRect().width), to: parseFloat(css['min-width']), unit: 'px' };
  if (item.rule === 'craft/inner-outer-spacing') return { from: px(el, 'column-gap'), to: parseFloat(css['column-gap']), unit: 'px' };
  const [from, to] = DRAWN[item.rule] ?? ['found', 'fixed'];
  return { from, to };
}

// where a person would see it: drawn, inside the window's width, and not waiting unseen to play
function seen(i) {
  for (const s of ITEMS[i].sel) {
    const el = document.querySelector(s);
    if (!el?.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 2 || r.left < 0 || r.right > innerWidth + 1) continue;
    let hidden = false;
    for (let e = el; e && e !== document.body && !hidden; e = e.parentElement) hidden = getComputedStyle(e).visibility === 'hidden' || Number(getComputedStyle(e).opacity) < 0.15;
    if (!hidden) return { i, el, y: r.top + scrollY, deep: !!el.closest('.ins-x-track, .rv-frame, .session') };
  }
  return null;
}

// none of a kind in plain sight: one in the homepage's own demos, brought into sight. A carousel card is turned to
// by pressing it, as a person would; a demo that plays when it is reached plays as the page comes to it
function reach(list) {
  const all = list.flatMap((i) => ITEMS[i].sel.flatMap((s) => { const el = document.querySelector(s); return el?.getClientRects().length ? [{ i, el, y: el.getBoundingClientRect().top + scrollY, deep: true }] : []; }));
  const found = all.find((p) => !p.el.closest('.ins-x-track')) ?? all[0];
  if (!found) return null;
  const turned = found.el.closest('.ins-card:not([data-active])');
  turned?.click();
  return found;
}

export class Eggs {
  #run = null; #host;
  /**
   * @param host { fixes, lead(toy, point) → release, changed(), card(found | null) }
   */
  constructor(host) { this.#host = host; }

  stop() { this.#run?.end(); this.#run = null; }

  /** One toy's faults, or every one that is left. */
  async play(toy) {
    this.stop();
    const { fixes, lead, changed, card } = this.#host, list = fixes.open(toy);
    if (!list.length) {
      if (toy) card({ title: fixes.of(toy) ? 'These are fixed. They stay that way while you’re here.' : 'This browser can’t draw this fix.', done: true });
      const run = new Scope();
      this.#run = run;
      run.onEnd(() => card(null));
      run.timeout(() => this.stop(), 2200);
      return;
    }
    fixes.ready(list);
    const run = new Scope(), still = reduced(), start = scrollY;
    this.#run = run;
    let moved = false, made = false;
    const make = () => { if (made) return; made = true; fixes.make(list); changed(); };
    // left part way: fixed all the same
    run.onEnd(() => { make(); card(null); });
    run.listen(window, 'keydown', (e) => { if (e.key === 'Escape') this.stop(); });
    for (const type of ['wheel', 'touchmove']) run.listen(window, type, () => { moved = true; }, { passive: true });
    const pause = (ms) => run.wait(new Promise((done) => run.timeout(done, ms)));

    // the one to go to: not inside one of the homepage's own demos if there is another, and the nearest to the floor
    const places = list.map(seen).filter(Boolean).sort((a, b) => a.deep - b.deep || b.y - a.y);
    const main = places[0] ?? (still ? null : reach(list)), said = ITEMS[main?.i ?? list[0]];
    card({ title: said.title, at: said.at, more: list.length - 1 });
    if (!main || still) {
      make();
      await pause(3200);
      return this.stop();
    }

    const rect = () => main.el.getBoundingClientRect();
    run.onEnd(lead(toy ?? said.toy, () => {
      const r = rect(), y = Math.max(48, Math.min(innerHeight - 48, r.top + Math.min(r.height, 140) / 2));
      if (r.right + 100 < innerWidth) return { x: r.right + 56, y: r.bottom < 72 ? 112 : y };
      const x = Math.min(innerWidth - 48, Math.max(48, r.right - 40));
      return r.top > 140 ? { x, y: r.top - 64 } : { x, y: Math.min(r.bottom + 64, innerHeight - 48) };
    }));

    const at = rect(), above = 170, below = innerHeight - 24; // the card hangs under the bar
    if (at.top < above || at.top + Math.min(at.height, 120) > below) {
      scrollBy({ top: at.top - Math.max(above + 40, innerHeight * 0.36), behavior: 'smooth' });
      for (let last = -1, n = 0; n < 24 && last !== scrollY; n++) { last = scrollY; await pause(120); }
    }
    // long enough to read what it found, and for a demo it was brought out of to draw
    await pause(main.deep ? 1300 : 420);

    const near = [main, ...places.filter((p) => p.el !== main.el && p.el.getBoundingClientRect().top > above && p.el.getBoundingClientRect().bottom < below)].slice(0, toy ? 3 : 5);
    const timed = ITEMS[main.i].rule.startsWith('provenance/motion') ? ITEMS[main.i] : null;
    const beat = (ms) => main.el.animate([{ scale: '1' }, { scale: '1.16' }, { scale: '1' }], { duration: ms * 2, iterations: 2, easing: 'ease-out' });
    if (timed) { beat(timed.from); await pause(timed.from * 4); }

    const morph = () => {
      if (made) return;
      // everything that changes eases on the show's spring, through a rule that outweighs the page's own transitions
      const props = [...new Set(list.flatMap((i) => Object.keys(ITEMS[i].make.css ?? {})))].filter((p) => !['display', 'transition-duration'].includes(p));
      const on = list.filter((i) => ITEMS[i].toy !== 'motion').flatMap((i) => ITEMS[i].sel);
      const easing = Object.assign(document.createElement('style'), {
        textContent: props.length && on.length ? `${on.map((s) => `:root:root ${s}`).join(',')} { transition: ${props.map((p) => `${p} ${BEAT.move}ms ${SPRING}`).join(', ')} !important }` : '',
      });
      document.head.append(easing);
      void document.body.offsetHeight;
      make();
      setTimeout(() => easing.remove(), BEAT.move + 80);
      if (timed) beat(timed.to);
    };
    const steps = near.map((p, n) => {
      const d = drawn(ITEMS[p.i], p.el), bands = [{ el: p.el, rect: () => p.el.getBoundingClientRect() }];
      return { look: 'ring', ...d, chip: null, bands: () => bands, morph: n === 0 ? morph : () => {} };
    });
    const guides = new PageGuides(document.body);
    run.onEnd(() => guides.remove());
    await run.wait(steps.length > 1 ? playAll(steps, { guides, signal: run.signal }) : play(steps, { guides, signal: run.signal }));
    await pause(700);
    if (!moved && Math.abs(scrollY - start) > 4) scrollTo({ top: start, behavior: 'smooth' });
    this.stop();
  }
}

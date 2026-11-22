/* ─────────────────────────────────────────────────────────
 * THE EGGS · a fix hidden behind each toy on the floor (site/Floor.jsx)
 *
 * Press a toy and its property slips on a real part of the page, the toy flies over to it, and Plumber fixes it with
 * the product's own show (overlay/src/show.js, the guides of show-motion.js): the page comes to the change, the
 * guides measure it in coral, it moves on the spring as the number rolls, it lands in sky named by its token, the
 * guides go. Then the page glides back to the floor, unless the person has moved it themselves.
 *
 * Nothing is kept: a slip is an inline style, put back exactly when it lands, when another toy is pressed, on Esc
 * and on leaving the page. The fixed value is always read off the page, so a pill never says a number the page isn't.
 * Reduced motion: no slip to watch and no glide, the product's own rule: it changes at once.
 * ───────────────────────────────────────────────────────── */
import { Scope } from '../../overlay/src/scope.js';
import { play, ease, PageGuides, BEAT } from '../../overlay/src/show.js';
import { reduced } from '../../overlay/src/motion.js';

const px = (el, prop) => Math.round(parseFloat(getComputedStyle(el).getPropertyValue(prop)) || 0);
const shown = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const first = (...all) => all.map((s) => [...document.querySelectorAll(s)].find(shown)).find(Boolean);
const whole = (el) => [{ el, rect: () => el.getBoundingClientRect() }];
// words as drawn, not the block they are centred in
const words = (el) => [{ el, rect: () => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); } }];
// all that changes, as one box, for a toy to keep off
const around = (fix) => {
  const all = [...fix.bands.map((b) => b.rect()), ...(fix.covers ?? []).map((el) => el.getBoundingClientRect())];
  const left = Math.min(...all.map((r) => r.left)), top = Math.min(...all.map((r) => r.top));
  return { left, top, right: Math.max(...all.map((r) => r.left + r.width)), bottom: Math.max(...all.map((r) => r.top + r.height)) };
};
// the space between one thing and the next, live
const between = (a, z) => ({
  rect: () => {
    const r = a.getBoundingClientRect(), n = z.getBoundingClientRect();
    return { left: r.left, top: r.bottom, width: r.width, height: Math.max(1, n.top - r.bottom), bottom: Math.max(r.bottom + 1, n.top) };
  },
});
// how a length that is a token on this site is named; any other is just its number
const named = (el, value, tokens) => tokens.find((t) => Math.round(parseFloat(getComputedStyle(el).getPropertyValue(`--pl-${t}`))) === value) ?? '';

// one toy each: what slips ([element, property, value]) and how the show draws its fix
const FIXES = {
  padding() {
    const el = first('.ground-in'); if (!el) return null;
    const to = px(el, 'padding-top');
    return { look: 'pad', from: 13, to, name: named(el, to, ['page-space-1', 'page-space-2', 'page-space-3']), props: ['padding'], slip: [[el, 'padding-top', '13px']], bands: whole(el) };
  },
  margin() {
    const el = first('.foot-by'); if (!el) return null;
    const to = px(el, 'margin-top');
    return { look: 'measure', from: 78, to, name: named(el, to, ['page-space-1']), props: ['margin'], slip: [[el, 'margin-top', '78px']], bands: [between(el.previousElementSibling, el)] };
  },
  gap() {
    const el = first('.foot-map ul'); if (!el) return null;
    const to = px(el, 'row-gap'), rows = [...el.children];
    return { look: 'measure', from: 23, to, name: named(el, to, ['space-2']), props: ['gap', 'row-gap'], slip: [...document.querySelectorAll('.foot-map ul')].map((ul) => [ul, 'row-gap', '23px']), bands: rows.slice(1).map((row, i) => between(rows[i], row)), covers: [...document.querySelectorAll('.foot-map ul')] };
  },
  corner() {
    const el = first('.ground'); if (!el) return null;
    const to = px(el, 'border-top-left-radius');
    // the arc is drawn a quarter of the box it is given, so it is given four times the live corner
    const box = () => {
      const r = el.getBoundingClientRect(), side = 4 * Math.max(6, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
      return { left: r.left + 5, top: r.top, width: side, height: side, bottom: r.top + side };
    };
    return { look: 'arc', from: 5, to, props: ['border-radius', 'border-top-left-radius', 'border-top-right-radius'], slip: [[el, 'border-top-left-radius', '5px'], [el, 'border-top-right-radius', '5px']], bands: [{ el, rect: box }] };
  },
  type() {
    const el = first('main h1', 'main h2', '.floor-title'); if (!el) return null;
    const to = px(el, 'font-size'), from = Math.max(13, Math.round(to * 0.55) | 1);
    return { look: 'text', from, to, unit: 'px', props: ['font-size', 'line-height'], blur: true, slip: [[el, 'font-size', `${from}px`], [el, 'line-height', '1.05']], bands: words(el) };
  },
  fill() {
    const el = first('.ground'); if (!el) return null;
    return { look: 'ring', from: '#a9a7a2', to: 'lilac-face', props: ['background-color'], slip: [[el, 'background-color', '#a9a7a2']], bands: whole(first('.foot-name') ?? el) };
  },
  shadow() {
    const el = first('.floor-act'); if (!el) return null;
    return { look: 'ring', from: 'a hand-made glow', to: 'your shadow', props: ['box-shadow'], slip: [[el, 'box-shadow', '0 0 18px 5px #31d7ff, 0 0 60px 22px rgb(180 70 255 / .6)']], bands: whole(el) };
  },
  motion() {
    const el = first('.bar .name .mark'); if (!el) return null;
    return {
      look: 'ring', from: 900, to: 420, unit: 'ms', props: [], slip: [], bands: whole(el),
      slow: () => el.animate([{ rotate: '0deg' }, { rotate: '-24deg' }, { rotate: '0deg' }], { duration: 1800, iterations: Infinity, easing: 'linear' }),
      quick: () => el.animate([{ rotate: '-24deg', scale: '1.2' }, { rotate: '0deg', scale: '1' }], { duration: 420, easing: getComputedStyle(el).getPropertyValue('--pl-spring-pop') || 'ease-out' }),
    };
  },
  grid() {
    const cols = [...document.querySelectorAll('.foot-map > div')].filter(shown); if (!cols.length) return null;
    const off = ['0px 26px', '14px -12px', '-9px 12px'];
    return { look: 'ring', from: `${cols.length} top edges`, to: '1 top edge', props: ['translate'], slip: cols.map((col, i) => [col, 'translate', off[i % off.length]]), bands: cols.map((col) => whole(col.querySelector('.foot-group'))[0]), covers: cols.map((col) => col.querySelector('.foot-group')) };
  },
  cursor() {
    const el = first('.bar nav [aria-current]', '.floor-act'); if (!el) return null;
    return { look: 'ring', from: 'reads as disabled', to: 'current', props: ['opacity', 'filter'], slip: [[el, 'opacity', '0.28'], [el, 'filter', 'grayscale(1)']], bands: whole(el) };
  },
};

export class Eggs {
  #run = null; #lead;
  /** @param lead (name, point) → release: sends that toy to a point in the viewport until released */
  constructor(lead) { this.#lead = lead; }

  stop() { this.#run?.end(); this.#run = null; }

  /** Plays a toy's fix. Resolves true when it was played to the end. */
  async play(name) {
    this.stop();
    const fix = FIXES[name]?.();
    if (!fix) return false;
    const run = new Scope(), still = reduced(), start = scrollY, undo = new Map();
    this.#run = run;
    let moved = false, slow = null;
    const put = (el, prop, value) => {
      if (!undo.has(el)) undo.set(el, new Map());
      const was = undo.get(el);
      if (!was.has(prop)) was.set(prop, [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop, value, 'important');
    };
    const back = () => {
      for (const [el, was] of undo) for (const [prop, [value, priority]] of was) { if (value) el.style.setProperty(prop, value, priority); else el.style.removeProperty(prop); }
      undo.clear(); slow?.cancel();
    };
    const move = (animate, change) => {
      const els = [...new Set(fix.slip.map(([el]) => el))];
      if (!animate || !els.length) return change();
      els.slice(1).forEach((el) => ease(el, () => {}, { props: fix.props }));
      ease(els[0], change, { props: fix.props, blur: fix.blur });
    };
    run.onEnd(back);
    run.listen(window, 'keydown', (e) => { if (e.key === 'Escape') this.stop(); });
    for (const type of ['wheel', 'touchmove']) run.listen(window, type, () => { moved = true; }, { passive: true });
    const pause = (ms) => run.wait(new Promise((done) => run.timeout(done, ms)));
    const ended = new Promise((done) => run.onEnd(() => done(false)));

    const show = async () => {
      const box = () => fix.bands[0].rect();
      if (!still) {
        // beside all it is fixing and never over it (interaction-principles 10): to its right where there is room,
        // else above it clear of the pill, else below
        run.onEnd(this.#lead(name, () => {
          const r = around(fix);
          if (r.right + 100 < innerWidth) return { x: r.right + 56, y: Math.max((r.top + Math.min(r.bottom, r.top + 140)) / 2, r.bottom < 72 ? 112 : 46) };
          const x = Math.min(innerWidth - 48, Math.max(48, r.right - 40));
          return r.top > 140 ? { x, y: r.top - 64 } : { x, y: Math.min(r.bottom + 64, innerHeight - 48) };
        }));
      }
      const at = box();
      const pinned = fix.bands[0].el?.closest?.('.bar');
      if (!pinned && (at.top < 84 || at.top + Math.min(at.height, 160) > innerHeight - 24)) {
        scrollBy({ top: at.top - innerHeight * 0.33, behavior: still ? 'instant' : 'smooth' });
        // a glide across the whole page takes as long as it takes
        for (let last = -1, n = 0; n < 24 && last !== scrollY; n++) { last = scrollY; await pause(120); }
      }
      move(!still, () => { for (const [el, prop, value] of fix.slip) put(el, prop, value); });
      if (!still) slow = fix.slow?.();
      await pause(still ? 700 : BEAT.move + 220);
      const guides = still ? null : new PageGuides(document.body);
      if (guides) run.onEnd(() => guides.remove());
      await run.wait(play([{
        look: fix.look, from: fix.from, to: fix.to, unit: fix.unit, name: fix.name, chip: null,
        bands: () => fix.bands,
        morph: (animate) => {
          if (!run.open) return;
          move(animate && !still, back);
          if (!still) fix.quick?.();
        },
      }], { guides, signal: run.signal }));
      await pause(260);
      if (!moved && Math.abs(scrollY - start) > 4) scrollTo({ top: start, behavior: still ? 'instant' : 'smooth' });
      return true;
    };
    const played = await Promise.race([show(), ended]);
    if (this.#run === run) this.stop();
    return played;
  }
}

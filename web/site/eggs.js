/* ─────────────────────────────────────────────────────────
 * THE EGGS · the real faults behind each toy on the floor (site/Floor.jsx)
 *
 * Nothing is staged. Behind a toy are the faults of its kind that Plumber found on the homepage and that nobody
 * fixed (findings.json). Press it and the page takes you to each one in turn: a note beside it says what is wrong
 * (note.js), the product's own guides mark it (overlay/src/show.js), it moves to the fixed value, and the count
 * falls. Fixes stay for the visit (fixes.js). The main button does the same for every kind.
 *
 * Interrupted (Esc, scrolling, another toy, leaving): what was fixed stays fixed, the rest waits.
 * Reduced motion: fixed at once, no travel.
 * ───────────────────────────────────────────────────────── */
import { Scope } from '../../overlay/src/scope.js';
import { PageGuides, BEAT, SPRING } from '../../overlay/src/show.js';
import { reduced } from '../../overlay/src/motion.js';
import { ITEMS } from './fixes.js';
import { Note, SAY } from './note.js';

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

// everything drawn on the page, as boxes in page coordinates: words (each line of them), pictures, controls, and
// anything with its own surface. A note is written only where none of these is
function ink() {
  const out = [], range = document.createRange(), wide = innerWidth - 2;
  const add = (r) => { if (r.width > 1 && r.height > 1 && r.right > 0 && r.left < innerWidth) out.push({ left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY }); };
  for (const el of document.querySelectorAll('main *, footer *, .floor *')) {
    if (!el.getClientRects().length) continue;
    if (/^(img|svg|video|canvas|button|input|textarea|select|pre|code)$/i.test(el.tagName)) { add(el.getBoundingClientRect()); continue; }
    if (el.closest('svg')) continue;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) { range.selectNodeContents(n); for (const r of range.getClientRects()) add(r); }
    const r = el.getBoundingClientRect();
    if (r.width >= wide) continue; // a band across the page is the page, not a thing on it
    const c = getComputedStyle(el);
    if (c.backgroundImage !== 'none' || c.boxShadow !== 'none' || parseFloat(c.borderTopWidth) > 0 || !/rgba\(.*, 0\)$|transparent/.test(c.backgroundColor)) add(r);
  }
  return out;
}

// where it is on the page, drawn or still waiting to be revealed: the ride plans its stops from this
function placed(i) {
  for (const s of ITEMS[i].sel) {
    const el = document.querySelector(s);
    if (!el?.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 2 || r.left < 0 || r.right > innerWidth + 1) continue;
    return { i, el, y: r.top + scrollY, h: r.height };
  }
  return null;
}

// everything a list of fixes changes eases on the show's spring, through a rule that outweighs the page's own
// transitions; the rule goes when the move is over
function eased(list) {
  const props = [...new Set(list.flatMap((i) => Object.keys(ITEMS[i].make.css ?? {})))].filter((p) => !['display', 'transition-duration'].includes(p));
  const on = list.filter((i) => ITEMS[i].toy !== 'motion').flatMap((i) => ITEMS[i].sel);
  if (!props.length || !on.length) return;
  const rule = Object.assign(document.createElement('style'), {
    textContent: `${on.map((s) => `:root:root ${s}`).join(',')} { transition: ${props.map((p) => `${p} ${BEAT.move}ms ${SPRING}`).join(', ')} !important }`,
  });
  document.head.append(rule);
  void document.body.offsetHeight;
  setTimeout(() => rule.remove(), BEAT.move + 80);
}

export class Eggs {
  #run = null; #host;
  /**
   * @param host { fixes, lead(toy, point) → release, changed(), done(toy, fixed): a tour ran to its end }
   */
  constructor(host) { this.#host = host; }

  stop() { this.#run?.end(); this.#run = null; }

  /**
   * The tour: one toy's faults, or every fault that is left, one at a time from the top of the page to the bottom.
   * The page comes to each one. A note beside it says what is wrong in plain words (note.js), the piece is marked
   * with what it has, it moves to the fixed value, and the note says what changed. Then the next one. A kind met
   * for the first time is given longer to read; the ones after it go quicker. Scrolling or Esc ends the tour where
   * it is: what was fixed stays fixed and the rest is left for the next press.
   */
  async ride(toy) {
    this.stop();
    const { fixes, lead, changed, done } = this.#host, list = fixes.open(toy);
    if (!list.length) return;
    fixes.ready(list);
    const run = new Scope();
    this.#run = run;
    if (reduced()) { fixes.make(list); changed(); return this.stop(); }
    const note = new Note(), guides = new PageGuides(document.body), start = scrollY;
    let letGo = () => {}, led = null;
    run.onEnd(() => { note.remove(); guides.remove(); letGo(); });
    run.listen(window, 'keydown', (e) => { if (e.key === 'Escape') this.stop(); });
    for (const type of ['wheel', 'touchmove']) run.listen(window, type, () => this.stop(), { passive: true });
    const pause = (ms) => run.wait(new Promise((done) => run.timeout(done, ms)));
    const glide = async (top) => {
      const to = Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
      scrollTo({ top: to, behavior: 'smooth' });
      // there, or stopped short for a second and a half (a long way can be slow to start)
      for (let n = 0, still = 0, last = scrollY; n < 120 && Math.abs(scrollY - to) > 2 && still < 20; n++) { await pause(80); still = scrollY === last ? still + 1 : 0; last = scrollY; }
    };

    // where a note goes: beside the piece, in the emptiest place around it (ink), and never on the piece itself
    const taken = ink(), W = Math.min(372, innerWidth - 32), H = 84;
    const over = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const spot = (r) => {
      const fit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const midY = fit(r.top + Math.min(r.height, 160) / 2 - H / 2, 88, innerHeight - H - 16), x0 = fit(r.left, 16, innerWidth - W - 16);
      const keep = { left: r.left - 14, right: r.right + 14, top: r.top - 40, bottom: r.bottom + 14 };
      const near = taken.filter((k) => k.bottom - scrollY > 0 && k.top - scrollY < innerHeight).map((k) => ({ left: k.left, right: k.right, top: k.top - scrollY, bottom: k.bottom - scrollY }));
      const cost = ([x, y]) => { const box = { left: x - 8, right: x + W + 8, top: y - 8, bottom: y + H + 8 }; return over(box, keep) * 1000 + near.reduce((sum, k) => sum + over(box, k), 0); };
      const tries = [[r.right + 44, midY], [x0, r.bottom + 40], [x0, r.top - H - 64], [r.left - W - 44, midY],
        [innerWidth - W - 16, r.bottom + 40], [16, r.bottom + 40], [innerWidth - W - 16, r.top - H - 64], [16, r.top - H - 64],
        [innerWidth - W - 16, innerHeight - H - 16], [16, innerHeight - H - 16], [innerWidth - W - 16, 88], [16, 88]]
        .filter(([x, y]) => x >= 16 && x + W <= innerWidth - 16 && y >= 88 && y + H <= innerHeight - 16);
      // next to the piece when any place next to it is in the window; a far corner only when none is
      const [x, y] = (tries.length > 4 ? tries.slice(0, -4) : tries).map((t) => [t, cost(t)]).sort((a, b) => a[1] - b[1])[0]?.[0] ?? [16, innerHeight - H - 16];
      return { x, y, w: W, h: H };
    };

    // the place planned on the whole page, before the page comes to the piece: beside it, or the nearest empty
    // band above or below it, with nothing drawn there and the piece left clear. The page then comes to both
    const plan = (el) => {
      const r = el.getBoundingClientRect(), pt = r.top + scrollY, pb = pt + r.height, room = innerHeight - 88 - 24;
      const fit = (v) => Math.max(16, Math.min(innerWidth - W - 16, v));
      const free = (x, y) => x >= 16 && x + W <= innerWidth - 16 && y >= 0
        && !(r.left - 14 < x + W && r.right + 14 > x && pt - 40 < y + H && pb + 14 > y)
        && !taken.some((k) => k.left < x + W + 10 && k.right > x - 10 && k.top < y + H + 10 && k.bottom > y - 10);
      const mid = pt + Math.min(r.height, 160) / 2 - H / 2;
      for (const x of [r.right + 44, r.left - W - 44]) if (free(x, mid)) return { x, y: mid, from: Math.min(pt - 44, mid) };
      const xs = [...new Set([fit(r.left), fit(r.left + r.width / 2 - W / 2), fit(r.right - W)])];
      for (let x = 16; x <= innerWidth - W - 16; x += 48) xs.push(x);
      // no further than leaves a good part of the piece in the window with it
      for (let d = 0, far = Math.max(0, room - H - 64 - 140); d <= far; d += 12) for (const x of xs) {
        const below = pb + 40 + d, above = pt - H - 64 - d;
        if (free(x, below)) return { x, y: below, from: Math.max(pt - 44, below + H - room) };
        if (free(x, above)) return { x, y: above, from: above };
      }
      return null;
    };

    const order = list.map(placed).filter(Boolean).sort((a, b) => a.y - b.y), told = new Set();
    for (const [n, p] of order.entries()) {
      if (!fixes.open().includes(p.i)) continue;
      const item = ITEMS[p.i];
      let r = p.el.getBoundingClientRect();
      const want = plan(p.el), to = Math.max(0, want ? want.from - 88 : r.top + scrollY - Math.max(240, innerHeight * 0.34));
      if (Math.abs(to - scrollY) > 24) { await glide(to); await pause(140); }
      // inside a demo that is not open, or not drawn: fixed without a stop
      const shown = seen(p.i);
      if (!shown) { fixes.make([p.i]); changed(); continue; }
      const el = shown.el, first = !told.has(item.rule);
      told.add(item.rule);
      r = el.getBoundingClientRect();
      const wy = want ? want.y - scrollY : -1, at = want && wy >= 80 && wy + H <= innerHeight - 8 ? { x: want.x, y: wy, w: W, h: H } : spot(r);
      const [wrong, right] = SAY[item.rule] ?? [item.title, 'Fixed.'];
      const slot = note.showAt(el, at, { say: wrong, sub: `${n + 1} of ${order.length}` });
      if (led !== item.toy) { letGo(); letGo = lead(item.toy, slot); led = item.toy; }
      const steps = [{ look: 'ring', ...drawn(item, el), chip: null, bands: () => [{ el, rect: () => el.getBoundingClientRect() }], morph() {} }];
      await run.wait(guides.in(steps, run.signal));
      await pause(first ? 900 : 320);
      eased([p.i]);
      fixes.make([p.i]); changed();
      guides.move();
      await pause(BEAT.move);
      guides.land();
      note.land({ say: right, sub: `${fixes.left} left on the page` });
      await pause(first ? 900 : 420);
      await run.wait(Promise.all([guides.out(run.signal), note.hide()]));
      guides.clear();
    }
    letGo();
    // what has no place on the page as it is drawn now
    const rest = fixes.open(toy);
    if (rest.length) { fixes.make(rest); changed(); }
    // back to the floor: where the press was, or the foot of the page after the whole tour
    const floor = document.querySelector('.floor');
    await glide(toy || !floor ? start : floor.getBoundingClientRect().bottom + scrollY - innerHeight);
    // the toy is home: the ending
    await pause(520);
    done?.(toy, list.length);
    this.stop();
  }
}

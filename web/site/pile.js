/* ─────────────────────────────────────────────────────────
 * THE PILE · the toys on the foot of every page (site/Foot.jsx): what Plumber does, as something you can pick up.
 *
 *  arrival    the first time the floor is on screen the pieces drop in and lie as they fall
 *  point      a piece comes up to the hand and says its name
 *  grab       it follows the hand on a spring, anywhere in the window and over anything; let go, it keeps the
 *             speed it had. The window's sides are the only walls, and there is no ceiling
 *  press      without moving it: it jumps, and its owner is told (a fix is hidden behind each, eggs.js)
 *  led        sent to a point in the window for a while, then let fall or sent home
 *  clean up   the product's beats (interaction-principles 35b): the gaps are marked as the pieces click onto their
 *             places one after another, the number lands in each, the burst rewards it, and the guides go
 *  astray     a piece pulled out and dropped away from its place is out of place; near it, it clicks back
 *  mix up     they hop off their places and fall again
 *  reduced    no fall, no throw, no burst: the pieces are where they would have ended
 *  asleep     no frame runs while nothing moves
 *
 * React draws the pieces and the words; this moves them, writing transforms straight to each piece.
 * ───────────────────────────────────────────────────────── */
import { Scope } from '../../overlay/src/scope.js';
import { burst } from '../../overlay/src/burst.js';
import { spring, reduced, DETENT } from '../../overlay/src/motion.js';

/** @machine */
export const PILE = {
  id: 'site-pile',
  owner: 'Pile',
  field: '#state',
  initial: 'waiting',
  cancel: ['unmount'],
  states: {
    waiting: { on: { seen: 'loose', unmount: 'gone' } },
    loose:   { on: { tidy: 'tidying', unmount: 'gone' } },
    tidying: { on: { landed: 'tidy', mix: 'loose', astray: 'loose', unmount: 'gone' } },
    tidy:    { on: { mix: 'loose', astray: 'loose', unmount: 'gone' } },
    gone:    { on: {}, ignores: ['unmount'] },
  },
};

const G = 2600;        // px/s², gravity
const BOUNCE = 0.34;   // what is kept of a fall
const QUIET = 120;     // under this speed nothing bounces: it lies down
const STEP = 1 / 120;
const IN_HAND = { k: 900, c: 48 };
const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
const between = (a, z) => a + Math.random() * (z - a);

export class Pile {
  #state = 'waiting';
  #scope = new Scope();   // the state's
  #life = new Scope();    // the pile's
  #stage; #tell; #pieces; #guides; #still; #size = 72; #gap = 16; #width = 0; #height = 0; #window = 0; #min = 0; #max = 0; #deep = 0; #poked;
  #running = false; #last = 0; #owed = 0; #quiet = 0; #top = 0;

  /** @param tell called with { state, out } whenever the words should change
   *  @param poked called with a piece's name when it is pressed, not dragged */
  constructor(stage, tell, poked) {
    this.#stage = stage; this.#tell = tell; this.#poked = poked; this.#still = reduced();
    this.#pieces = [...stage.querySelectorAll('[data-piece]')].map((el, i) => ({ el, body: el.firstElementChild, i, x: 0, y: 0, vx: 0, vy: 0, r: 0, lean: 0, slot: { x: 0, y: 0 }, home: false, held: null, led: null, under: false, name: el.dataset.piece, due: 0, landed: false }));
    this.#guides = [...stage.querySelectorAll('[data-guide]')];
    this.#measure(); this.#say();
    for (const p of this.#pieces) this.#life.listen(p.el, 'pointerdown', (e) => this.#grab(p, e));
    const sized = new ResizeObserver(() => this.#resized());
    sized.observe(stage);
    this.#life.onEnd(() => sized.disconnect());
    // the walls are the window's, which can move while the stage's width stays at its most
    this.#life.listen(window, 'resize', () => this.#resized());
    for (const p of this.#pieces) this.#life.listen(p.el, 'click', (e) => { if (e.detail === 0) this.#poked?.(p.name); });
    const seen = new IntersectionObserver(([e]) => { if (e.isIntersecting && this.#send('seen')) { this.#arrive(); seen.disconnect(); } }, { threshold: 0.3 });
    seen.observe(stage);
    this.#scope.onEnd(() => seen.disconnect());
  }

  #send(event) {
    const next = PILE.states[this.#state]?.on?.[event];
    if (next) { this.#state = next; this.#scope.end(); this.#scope = new Scope(); this.#say(); }
    return !!next;
  }

  #say() {
    this.#stage.dataset.state = this.#state;
    this.#tell({ state: this.#state, out: this.#pieces.filter((p) => !p.home).length });
  }

  #measure() {
    const css = getComputedStyle(this.#stage), box = this.#stage.getBoundingClientRect();
    this.#window = document.documentElement.clientWidth;
    this.#min = -box.left; this.#max = this.#window - box.left;
    this.#deep = this.#stage.closest('footer').getBoundingClientRect().bottom - box.top;
    this.#width = this.#stage.clientWidth; this.#height = this.#stage.clientHeight;
    this.#size = parseFloat(css.getPropertyValue('--piece')) || 72;
    this.#gap = parseFloat(css.getPropertyValue('--piece-gap')) || 16;
    const s = this.#size, step = s + this.#gap, n = this.#pieces.length;
    let cols = n;
    while (cols > 1 && cols * step - this.#gap > this.#width) cols = Math.ceil(cols / 2);
    const rows = Math.ceil(n / cols), left = (this.#width - (cols * step - this.#gap)) / 2;
    this.#pieces.forEach((p) => {
      p.slot = { x: left + (p.i % cols) * step + s / 2, y: this.#height - s / 2 - (rows - 1 - Math.floor(p.i / cols)) * step };
    });
    this.#guides.forEach((g, i) => {
      const a = this.#pieces[i].slot, z = this.#pieces[i + 1].slot;
      g.hidden = a.y !== z.y;
      g.style.transform = `translate(${a.x + s / 2}px, ${a.y - s / 2}px)`;
      g.querySelector('b').textContent = this.#gap;
    });
  }

  #resized() {
    if (this.#stage.clientWidth === this.#width && this.#stage.clientHeight === this.#height && document.documentElement.clientWidth === this.#window) return;
    const was = this.#width || 1;
    this.#measure();
    for (const p of this.#pieces) {
      if (p.home) { p.x = p.slot.x; p.y = p.slot.y; p.vx = p.vy = 0; }
      else { p.x = clamp((p.x * this.#width) / was, this.#min + this.#size / 2, this.#max - this.#size / 2); p.y = Math.min(p.y, this.#height - this.#size / 2); }
      this.#place(p);
    }
    if (this.#state !== 'waiting') this.#run();
  }

  #arrive() {
    const n = this.#pieces.length, s = this.#size;
    // they fall as a heap, in no order: narrower than their row, so some have to lie on others
    const wide = Math.min(this.#width, n * s * (this.#still ? 1.04 : 0.6)), from = (this.#width - wide) / 2;
    [...this.#pieces].sort(() => Math.random() - 0.5).forEach((p, i) => {
      p.x = clamp(from + ((i + 0.5) / n) * wide + between(-12, 12), s / 2, this.#width - s / 2);
      p.y = this.#still ? this.#height - s / 2 : -s * 0.5 - i % 3 * s * 1.1 - between(0, 60);
      p.vx = this.#still ? 0 : between(-90, 90); p.vy = 0;
      p.lean = between(12, 36) * (i % 2 ? 1 : -1); p.r = this.#still ? p.lean : between(-70, 70);
    });
    // with no fall to pull them apart, they are pushed apart before they are drawn
    if (this.#still) for (let k = 0; k < 360; k++) this.#physics(STEP);
    for (const p of this.#pieces) this.#place(p);
    this.#stage.dataset.ready = '';
    if (!this.#still) this.#run();
  }

  /** The button: clean them up, or mix them up. */
  press() { if (this.#send('tidy')) this.#tidy(); else if (this.#send('mix')) this.#mix(); }

  #tidy() {
    const from = [...this.#pieces].sort((a, b) => a.slot.x - b.slot.x || a.slot.y - b.slot.y), now = performance.now();
    const every = Math.min(55, 400 / Math.max(1, from.length - 1));
    from.forEach((p, i) => { p.home = true; p.landed = false; p.due = this.#still ? 0 : now + i * every; p.lean = 0; });
    if (this.#still) {
      for (const p of this.#pieces) { p.x = p.slot.x; p.y = p.slot.y; p.vx = p.vy = p.r = 0; this.#place(p); }
      this.#landed();
    } else this.#run();
  }

  #landed() {
    if (!this.#send('landed')) return;
    // the number has landed in each gap; then the guides go
    this.#stage.dataset.measured = '';
    this.#scope.timeout(() => delete this.#stage.dataset.measured, 1500);
    this.#scope.onEnd(() => delete this.#stage.dataset.measured);
    if (this.#still) return;
    const box = this.#stage.getBoundingClientRect();
    burst(document.body, box.left + box.width / 2, box.top + this.#pieces[0].slot.y, { frames: (run) => this.#life.frames(run), pieces: 48 });
  }

  #mix() {
    for (const p of this.#pieces) {
      p.home = false; p.lean = between(8, 22) * (Math.random() < 0.5 ? -1 : 1);
      if (this.#still) { p.x = clamp(p.x + between(-30, 30), this.#size / 2, this.#width - this.#size / 2); p.r = p.lean; }
      else { p.vx = between(-520, 520); p.vy = between(-900, -420); }
    }
    this.#say();
    if (this.#still) { for (let k = 0; k < 360; k++) this.#physics(STEP); for (const p of this.#pieces) this.#place(p); } else this.#run();
  }

  #grab(p, e) {
    if (e.button !== 0 || p.held || this.#state === 'waiting') return;
    p.led = null; p.under = false;
    e.preventDefault();
    const box = this.#stage.getBoundingClientRect(), hand = this.#life.child();
    const at = (ev) => ({ x: ev.clientX - box.left, y: ev.clientY - (this.#stage.getBoundingClientRect().top) });
    const first = at(e), off = { x: p.x - first.x, y: p.y - first.y }, wasHome = p.home;
    let last = { ...first, t: e.timeStamp }, seen = { x: e.clientX, y: e.clientY }, speed = { x: 0, y: 0 }, moved = 0;
    p.held = { x: p.x, y: p.y };
    p.el.dataset.held = ''; p.el.style.zIndex = ++this.#top;
    hand.onEnd(() => { p.held = null; delete p.el.dataset.held; });
    hand.listen(window, 'pointermove', (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const now = at(ev), dt = Math.max(8, ev.timeStamp - last.t) / 1000;
      speed = { x: speed.x * 0.4 + ((now.x - last.x) / dt) * 0.6, y: speed.y * 0.4 + ((now.y - last.y) / dt) * 0.6 };
      moved += Math.abs(now.x - last.x) + Math.abs(now.y - last.y);
      last = { ...now, t: ev.timeStamp };
      seen = { x: ev.clientX, y: ev.clientY };
      p.held = this.#within({ x: now.x + off.x, y: now.y + off.y });
      if (this.#still) { p.x = p.held.x; p.y = p.held.y; this.#place(p); }
    });
    // the page scrolled under the hand: it stays in the hand
    hand.listen(window, 'scroll', () => {
      const now = at({ clientX: seen.x, clientY: seen.y });
      p.held = this.#within({ x: now.x + off.x, y: now.y + off.y });
    }, { passive: true });
    const drop = (ev) => {
      if (ev.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
      const tap = moved < 6, to = tap ? { x: p.x, y: p.y } : p.held;
      const resting = ev.timeStamp - last.t > 90;
      hand.end();
      if (wasHome && Math.hypot(to.x - p.slot.x, to.y - p.slot.y) < this.#size * 0.7) {
        // near its place: it clicks back, with the jump of a thing that was pressed
        p.vx = 0; p.vy = tap && !this.#still ? -420 : 0;
        if (this.#still) { p.x = p.slot.x; p.y = p.slot.y; }
      } else {
        p.home = false; p.lean = between(8, 22) * (Math.random() < 0.5 ? -1 : 1);
        if (this.#still) { p.vx = p.vy = 0; p.r = p.lean; p.y = this.#height - this.#size / 2; }
        else if (tap) { p.vx = between(-120, 120); p.vy = -720; }
        else { p.vx = resting ? 0 : clamp(speed.x, -2200, 2200); p.vy = resting ? 0 : clamp(speed.y, -2200, 2200); }
        this.#lift(p);
        if (wasHome && !this.#send('astray')) this.#say();
      }
      if (tap && ev.type === 'pointerup') this.#poked?.(p.name);
      if (this.#still) { for (let k = 0; k < 240; k++) this.#physics(STEP); for (const q of this.#pieces) this.#place(q); } else this.#run();
    };
    hand.listen(window, 'pointerup', drop);
    hand.listen(window, 'pointercancel', drop);
    hand.listen(window, 'blur', drop);
    if (!this.#still) this.#run();
  }

  // anywhere in the window, and never half out of it
  #within(to) {
    const half = this.#size / 2 + 8, top = this.#stage.getBoundingClientRect().top;
    return { x: clamp(to.x, this.#min + half, this.#max - half), y: clamp(to.y, half - top, Math.min(this.#deep, innerHeight - top) - half) };
  }

  // let go under the floor's line: thrown up high enough to land back on it
  #lift(p) {
    const floor = this.#height - this.#size / 2;
    if (this.#still || p.y <= floor + 4) return;
    p.under = true; p.vy = -Math.sqrt(2 * G * (p.y - floor + 70));
  }

  /** Sends a piece to a point in the window (`point()` is read every frame) until the returned function is called. */
  lead(name, point) {
    const p = this.#pieces.find((q) => q.name === name);
    if (!p || this.#still) return () => {};
    p.led = point; p.under = false; p.el.style.zIndex = ++this.#top; p.el.dataset.acting = '';
    this.#run();
    return () => {
      if (p.led !== point) return;
      delete p.el.dataset.acting;
      p.led = null; p.landed = false; p.due = 0;
      if (!p.home) { p.vx *= 0.2; p.vy = Math.min(0, p.vy); this.#lift(p); }
      this.#run();
    };
  }

  #run() {
    this.#quiet = 0;
    if (this.#running || this.#still) return;
    this.#running = true; this.#last = performance.now(); this.#owed = 0;
    this.#life.frames((now) => this.#frame(now));
  }

  #frame(now) {
    this.#owed += Math.min(0.05, Math.max(0, (now - this.#last) / 1000)); this.#last = now;
    while (this.#owed >= STEP) { this.#physics(STEP, now); this.#owed -= STEP; }
    let moving = false, flying = false;
    for (const p of this.#pieces) {
      this.#place(p);
      if (p.home && !p.landed && now >= p.due && Math.hypot(p.x - p.slot.x, p.y - p.slot.y) < 2) p.landed = true;
      if (p.held || p.led || p.under || p.y < 0) flying = true;
      if (p.held || p.led || p.under || (p.home && now < p.due) || Math.abs(p.vx) + Math.abs(p.vy) > 14) moving = true;
    }
    // off its floor, a piece is over everything, the bar included
    this.#stage.toggleAttribute('data-flying', flying);
    if (this.#state === 'tidying' && this.#pieces.every((p) => p.home && p.landed)) this.#landed();
    this.#quiet = moving || this.#state === 'tidying' ? 0 : this.#quiet + 1;
    if (this.#quiet < 40) return true;
    this.#running = false;
    this.#stage.removeAttribute('data-flying');
    for (const p of this.#pieces) { if (p.home && !p.held) { p.x = p.slot.x; p.y = p.slot.y; p.r = 0; } p.vx = p.vy = 0; this.#place(p); }
    return false;
  }

  #physics(dt, now = Infinity) {
    const s = this.#size, half = s / 2, floor = this.#height - half;
    const left = this.#min + half, right = this.#max - half;
    let box = null;
    for (const p of this.#pieces) {
      if (p.led && !p.held) {
        box ??= this.#stage.getBoundingClientRect();
        const to = p.led();
        spring(p, clamp(to.x - box.left, left, right), to.y - box.top, DETENT, dt);
        p.r += (clamp(p.vx * 0.02, -22, 22) - p.r) * Math.min(1, dt * 14);
      } else if (p.held) {
        spring(p, p.held.x, p.held.y, IN_HAND, dt);
        p.r += (clamp(p.vx * 0.025, -26, 26) - p.r) * Math.min(1, dt * 14);
      } else if (p.home) {
        if (now < p.due) { p.vx = p.vy = 0; continue; }
        spring(p, p.slot.x, p.slot.y, DETENT, dt);
        p.r += (0 - p.r) * Math.min(1, dt * 18);
      } else {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.under && p.y <= floor) p.under = false;
        if (!p.under && p.y > floor) { p.y = floor; p.vy = p.vy > QUIET ? -p.vy * BOUNCE : 0; p.vx *= 1 - Math.min(1, dt * 7); }
        if (p.x < left) { p.x = left; p.vx = Math.abs(p.vx) * 0.5; }
        if (p.x > right) { p.x = right; p.vx = -Math.abs(p.vx) * 0.5; }
        const air = p.y < floor - 1 && Math.abs(p.vy) > QUIET;
        if (air) p.r = clamp(p.r + p.vx * dt * 0.5, -80, 80);
        else p.r += (p.lean - p.r) * Math.min(1, dt * 10);
      }
    }
    // pieces push each other: round enough to roll off, square enough to lie on
    const reach = s * 1.02;
    for (let k = 0; k < 3; k++) for (let i = 0; i < this.#pieces.length; i++) for (let j = i + 1; j < this.#pieces.length; j++) {
      const a = this.#pieces[i], z = this.#pieces[j];
      if (a.home && z.home) continue;
      // one in its place doesn't budge, and what is in the hand passes over it
      if ((a.home && z.held) || (z.home && a.held) || a.led || z.led || a.under || z.under) continue;
      let dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy);
      if (d >= reach) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      // two on the floor, or one squarely on another: the sideways part wins, so no towers stand
      if (Math.abs(dx) < 3) dx = (i % 2 ? 1 : -1) * 3;
      d = Math.hypot(dx, dy);
      const nx = dx / d, ny = dy / d, over = reach - d, ka = a.held || a.home ? 0 : 1, kz = z.held || z.home ? 0 : 1, all = ka + kz;
      if (!all) continue;
      a.x -= nx * over * (ka / all); a.y -= ny * over * (ka / all);
      z.x += nx * over * (kz / all); z.y += ny * over * (kz / all);
      const near = (z.vx - a.vx) * nx + (z.vy - a.vy) * ny;
      if (near < 0) {
        const push = (-(1 + (-near > QUIET ? 0.25 : 0)) * near) / all;
        if (ka) { a.vx -= push * nx; a.vy -= push * ny; }
        if (kz) { z.vx += push * nx; z.vy += push * ny; }
      }
      for (const q of [a, z]) if (!q.held && !q.home) { q.x = clamp(q.x, left, right); q.y = Math.min(q.y, floor); }
    }
  }

  #place(p) {
    p.el.style.transform = `translate3d(${(p.x - this.#size / 2).toFixed(2)}px, ${(p.y - this.#size / 2).toFixed(2)}px, 0)`;
    p.body.style.rotate = `${p.r.toFixed(2)}deg`;
  }

  destroy() { this.#send('unmount'); this.#scope.end(); this.#life.end(); }
}

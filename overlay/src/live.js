/* ─────────────────────────────────────────────────────────
 * LIVE · React Plumber overlay
 *
 * What is moving on the page right now, read once and shared. Something moving has no settled value to judge, and
 * every frame it changes is a change to the page: plumber neither reads it, nor judges it, nor reads the page again
 * because it moved (owner, 2026-11-15: "we have to find a way to ignore animation as its not static so no point in
 * measuring it").
 *
 *  animation  every running CSS animation, transition or Web Animation, read from document.getAnimations() at most
 *             every READ ms. A loop (a spinner, a marquee) moves its target and everything inside it; an animation that
 *             ends also makes the elements holding it wait (they are judged once it has come to rest)
 *  churn      what JavaScript moves frame by frame (a counter, a figure redrawn every frame, a style rewritten by a
 *             motion library) is seen as changes: an element changed CHURN times within WINDOW ms is moving, and stays
 *             so until it has been quiet for REST ms
 *  isLive(el) el is moving: it is, or sits inside, something animating or churning, or it holds an animation that
 *             will end. A walk up its ancestors against sets: no per-animation work per element
 *  quiet(records)  the mutation records that are not motion: the ones a reader should act on
 *  handsBusy()  the person is scrolling or typing (an input within HANDS ms): plumber's heavy work waits
 *  whenIdle(fn) runs fn once the hands have been still for HANDS ms, in the browser's idle time (at most IDLE ms
 *             later): reading and judging the page never competes with the person scrolling it. Calls made while one
 *             is waiting share it
 * ───────────────────────────────────────────────────────── */

const READ = 200, CHURN = 5, WINDOW = 1000, REST = 1500, HANDS = 400, IDLE = 1200;

let readAt = -Infinity;
let moves = new Set();   // targets of running animations: they and everything inside them move
let holds = new Set();   // ancestors of an animation that will end: they wait for it, judged at rest
let loops = new Set();   // targets of animations that never end (a spinner, a pulsing dot): never at rest
const churn = new Map(); // element → { times: [ms], until: ms }
let watching = false;

function readAnimations(now) {
  if (now - readAt < READ) return;
  readAt = now;
  moves = new Set(); holds = new Set(); loops = new Set();
  for (const a of document.getAnimations()) {
    if (a.playState !== 'running') continue;
    const t = a.effect?.target;
    if (!(t instanceof Element)) continue;
    moves.add(t);
    if (a.effect.getComputedTiming?.().iterations === Infinity) loops.add(t);
    else for (let p = t.parentElement; p; p = p.parentElement) holds.add(p);
  }
}

function watch() {
  if (watching || typeof MutationObserver === 'undefined') return;
  watching = true;
  new MutationObserver((records) => {
    const now = performance.now();
    for (const r of records) {
      const el = r.target instanceof Element ? r.target : r.target.parentElement;
      if (!el || el.closest('plumb-overlay, [data-plumb-layer]')) continue;
      let c = churn.get(el);
      if (!c) churn.set(el, (c = { times: [], until: 0 }));
      c.times.push(now);
      while (c.times.length && now - c.times[0] > WINDOW) c.times.shift();
      if (c.times.length >= CHURN) c.until = now + REST;
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
}

const churning = (el, now) => { const c = churn.get(el); return !!c && c.until > now; };

/** Whether el is moving right now (see the header). */
export function isLive(el) {
  if (!el) return false;
  watch();
  const now = performance.now();
  readAnimations(now);
  if (holds.has(el)) return true;
  for (let e = el; e && e !== document.body; e = e.parentElement) if (moves.has(e) || churning(e, now)) return true;
  return false;
}

/** When el is worth looking at again: 0 when it isn't moving, Infinity inside a loop (it never comes to rest),
 *  else when its churn ends, or, moved by an animation that will end, just after the next read of the animations
 *  (what moves is read every READ ms, so an animation that just ended still counts for up to READ ms: U18). */
export function restAt(el) {
  const now = performance.now();
  readAnimations(now);
  let at = 0;
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (loops.has(e)) return Infinity;
    const c = churn.get(e);
    if (c && c.until > now && c.until > at) at = c.until;
    if (moves.has(e) || (e === el && holds.has(e))) at = Math.max(at, readAt + READ + 20);
  }
  return at;
}

/** The records that are not motion: a change inside something moving is not a reason to read the page again. */
export function quiet(records) {
  watch();
  const now = performance.now();
  readAnimations(now);
  return records.filter((r) => {
    const el = r.target instanceof Element ? r.target : r.target?.parentElement;
    if (!el) return true;
    for (let e = el; e && e !== document.body; e = e.parentElement) if (moves.has(e) || churning(e, now)) return false;
    return true;
  });
}

/** Start watching early, so motion is known before it is asked about. */
export const startLive = () => watch();

// ── the person's hands: plumber's heavy work waits while they scroll or type ──
let handsAt = -Infinity, hands = false;
function listenHands() {
  if (hands || typeof addEventListener === 'undefined') return;
  hands = true;
  const on = () => { handsAt = performance.now(); };
  for (const type of ['wheel', 'scroll', 'touchmove', 'keydown']) addEventListener(type, on, { capture: true, passive: true });
}
export function handsBusy() { listenHands(); return performance.now() - handsAt < HANDS; }
const waiting = new Set();
export function whenIdle(fn) {
  listenHands();
  if (waiting.has(fn)) return;
  waiting.add(fn);
  const run = () => { waiting.delete(fn); fn(); };
  const tryRun = () => {
    const left = HANDS - (performance.now() - handsAt);
    if (left > 0) { setTimeout(tryRun, left + 10); return; }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => (handsBusy() ? tryRun() : run()), { timeout: IDLE });
    else setTimeout(run, 0);
  };
  tryRun();
}

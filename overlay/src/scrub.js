/* ─────────────────────────────────────────────────────────
 * SCRUB · React Plumber overlay
 *
 * Direct manipulation of a value on the page, the Bret Victor way: grab the right margin and drag, and the margin on
 * the real element moves through your scale's steps while the page re-flows under your hand.
 *
 *  ready     over a band that can be dragged, the cursor is a resize arrow along the band's axis
 *  grab      pressing locks the pointer where it was pressed (Pointer Lock): the cursor does not travel with the
 *            drag, so the eye stays on the element. A small resize glyph is drawn where the pointer is held, with the
 *            value pill beside it
 *  snap      movement accumulates; every STEP px of it moves one step along the scale (right or down grows a right or
 *            bottom side, left or up grows a left or top side). Each step previews on the element at once, as an
 *            inline style the overlay owns; the pill says the step (`s5 · 20`). The value only ever sits on a step
 *  notch     landing on a step is felt: the value springs a hair past the token and settles on it (NOTCH), and the
 *            grip ticks, like a dial clicking into its detent. Off under reduced motion
 *  release   letting go keeps the step as the element's change (onChange); nothing is written to source here — the
 *            changes bar collects them per element (changes.js)
 *  cancel    Esc during the drag puts the value back as it was and keeps nothing
 *  no lock   where Pointer Lock is refused (an iframe, a browser setting), the drag still works with the visible
 *            cursor moving
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

const STEP = 22; // px of movement per step of the scale
// The notch: an underdamped spring from the last step to the new one (about 10% past it, settled in ~220ms)
const NOTCH = { omega: 34, zeta: 0.5, settle: 240 };

export const SCRUB_CSS = `
  .scrub-at { position: fixed; z-index: 3; pointer-events: none; display: flex; align-items: center; gap: 6px; translate: -9px -9px; }
  .scrub-at .grip { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: var(--pl-sky); color: var(--pl-sky-ink);
    box-shadow: 0 0 0 2px var(--pl-paper), 0 4px 10px -4px rgb(0 0 0 / 0.5); }
  .scrub-at .grip svg { width: 12px; height: 12px; }
  .scrub-at .grip[data-tick] { animation: scrub-tick 180ms cubic-bezier(.3, 1.6, .5, 1); }
  @keyframes scrub-tick { 40% { scale: 1.22; } }
  .scrub-at[data-axis="y"] .grip svg { rotate: 90deg; }
  .scrub-at .pl-pill { animation: none; }
  .scrub-at .pl-pill[data-moved] { animation: pl-pop 180ms var(--pl-spring-pop) both; }
  @media (prefers-reduced-motion: reduce) { .scrub-at .pl-pill[data-moved], .scrub-at .grip[data-tick] { animation: none; } }
`;
const GRIP = '<svg viewBox="0 0 12 12"><path d="M1.5 6h9M3.7 3.8 1.5 6l2.2 2.2M8.3 3.8 10.5 6 8.3 8.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Which way a band moves, and which direction of the pointer grows it.
export function axisOf(prop) {
  if (/-(left|right)$/.test(prop) || prop === 'column-gap') return { axis: 'x', sign: /-left$/.test(prop) ? -1 : 1 };
  return { axis: 'y', sign: /-top$/.test(prop) ? -1 : 1 };
}
export const cursorOf = (prop) => (axisOf(prop).axis === 'x' ? 'ew-resize' : 'ns-resize');

/**
 * Scrub one property of `el` through `steps` ([{ token, n }], ascending). `from` is the current px value.
 * host: the element the overlay draws in (the glyph and pill go there); onStep(step), onDone(step | null).
 */
export function scrub(event, { el, prop, steps, from, host, onStep, onDone }) {
  const { axis, sign } = axisOf(prop);
  const start = { x: event.clientX, y: event.clientY };
  // the step the value starts from: its own, else the nearest (an off-scale value starts between two)
  let at = steps.reduce((best, s, i) => (Math.abs(s.n - from) < Math.abs(steps[best].n - from) ? i : best), 0);
  const first = at;
  const inline = el.style.getPropertyValue(prop), priority = el.style.getPropertyPriority(prop);
  const glyph = document.createElement('div');
  glyph.className = 'scrub-at';
  glyph.dataset.axis = axis;
  Object.assign(glyph.style, { left: `${start.x}px`, top: `${start.y}px` });
  host.append(glyph);
  const show = (moved) => {
    const s = steps[at];
    glyph.innerHTML = `<span class="grip"${moved ? ' data-tick' : ''}>${GRIP}</span><span class="pl-pill"${moved ? ' data-moved' : ''}>${esc(s.token)} · ${Math.round(s.n * 10) / 10}</span>`;
  };
  // the value lands on its step through the notch: x(t) = to + (from − to)·e^(−ζωt)·cos(ω√(1−ζ²)t)
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = from, spring = 0;
  const set = (v) => { shown = v; el.style.setProperty(prop, `${Math.round(v * 100) / 100}px`, 'important'); };
  const apply = () => {
    const to = steps[at].n, was = shown;
    cancelAnimationFrame(spring);
    if (still || was === to) set(to);
    else {
      const t0 = performance.now(), wd = NOTCH.omega * Math.sqrt(1 - NOTCH.zeta ** 2);
      const frame = (now) => {
        const t = (now - t0) / 1000;
        if (t * 1000 >= NOTCH.settle) return set(to), onStep?.(steps[at]);
        set(to + (was - to) * Math.exp(-NOTCH.zeta * NOTCH.omega * t) * Math.cos(wd * t));
        onStep?.(steps[at]);
        spring = requestAnimationFrame(frame);
      };
      spring = requestAnimationFrame(frame);
    }
    onStep?.(steps[at]);
  };
  show(false);
  apply();
  // the pointer stays where it was pressed; only its movement counts
  let travelled = 0, locked = false;
  const target = event.currentTarget instanceof Element ? event.currentTarget : host;
  try { const p = target.requestPointerLock?.({ unadjustedMovement: true }); p?.catch?.(() => {}); } catch {}
  const onLock = () => { locked = document.pointerLockElement != null; };
  document.addEventListener('pointerlockchange', onLock);
  const move = (e) => {
    travelled += (axis === 'x' ? (locked ? e.movementX : e.movementX) : e.movementY) * sign;
    const to = Math.max(0, Math.min(steps.length - 1, first + Math.round(travelled / STEP)));
    if (to !== at) { at = to; apply(); show(true); }
  };
  const end = (keep) => {
    removeEventListener('pointermove', move, true);
    removeEventListener('pointerup', up, true);
    removeEventListener('keydown', key, true);
    document.removeEventListener('pointerlockchange', onLock);
    if (document.pointerLockElement) document.exitPointerLock();
    cancelAnimationFrame(spring);
    if (keep) set(steps[at].n);
    glyph.remove();
    if (!keep) { if (inline) el.style.setProperty(prop, inline, priority); else el.style.removeProperty(prop); if (!el.getAttribute('style')?.trim()) el.removeAttribute('style'); }
    onDone?.(keep ? steps[at] : null);
  };
  const up = (e) => { e.preventDefault(); e.stopPropagation(); end(at !== first || steps[first].n !== from); };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); } };
  addEventListener('pointermove', move, true);
  addEventListener('pointerup', up, true);
  addEventListener('keydown', key, true);
  event.preventDefault();
}

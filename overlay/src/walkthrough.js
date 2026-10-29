/* ─────────────────────────────────────────────────────────
 * WALKTHROUGH · React Plumber overlay
 *
 * The first time blueprint is used in a project (docs/briefs/insight-not-noise.md §6.1): one element whose whole chain
 * is proven (a problem with a fix verified on the theme) is pointed at, and four short lines walk find → fix → applied
 * → quiet, each moved on by what the person does, never by a Next button:
 *
 *  find     a soft pulsing ring on the element and one line under it: what is wrong, then "Click it."
 *  try      once it is selected: "↑ ↓ to try a step. Enter to take it."
 *  apply    once a change is taken: "Apply, in Changes, writes it to your code."
 *  quiet    once it is written: "Done. Nothing left to fix on it." Then it goes, for good.
 *
 * Selecting another element, leaving blueprint, or no candidate on the page ends it quietly. It never takes a click
 * (no pointer events) and is shown once per project (localStorage, wrapped: a private window just shows it again).
 * Words follow docs/copy/voice.md.
 * ───────────────────────────────────────────────────────── */
import { WALK } from './words.js';

export const WALK_CSS = `
  .walk { position: fixed; inset: 0; pointer-events: none; }
  .walk[hidden] { display: none; }
  .walk .pulse { position: fixed; box-sizing: border-box; border-radius: 10px; border: 2px solid var(--pl-pink, var(--pl-accent)); animation: walk-pulse 1.4s ease-in-out infinite; }
  @keyframes walk-pulse { 50% { box-shadow: 0 0 0 6px color-mix(in oklab, var(--pl-pink, var(--pl-accent)) 25%, transparent); } }
  .walk .line { position: fixed; max-width: 300px; padding: 6px 11px; border-radius: 10px; font: 500 12.5px/1.35 var(--pl-sans); background: var(--pl-ink); color: var(--pl-paper); box-shadow: 0 2px 6px rgb(0 0 0 / .25); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .walk .line .n { opacity: .6; margin-right: 6px; font-variant-numeric: tabular-nums; }
  @media (prefers-reduced-motion: reduce) { .walk .pulse, .walk .line { animation: none; } }
`;

const KEY = `plumb:walkthrough:${location.host}`;
const seen = () => { try { return localStorage.getItem(KEY) === 'done'; } catch { return false; } };
const done = () => { try { localStorage.setItem(KEY, 'done'); } catch {} };

export class Walkthrough {
  #layer; #el = null; #step = 0; #line = ''; #timer = 0;
  constructor(root) {
    this.#layer = Object.assign(document.createElement('div'), { className: 'walk', hidden: true });
    this.#layer.setAttribute('aria-live', 'polite');
    root.append(this.#layer);
  }
  get active() { return this.#step > 0; }
  get element() { return this.#el; }

  // The page was read: begin on the first element in view whose problem has a proven fix (once per project).
  offer(items, fixable) {
    if (this.#step || seen()) return;
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
    const pick = items.find((i) => inView(i.el) && fixable(i));
    if (!pick) return;
    this.#el = pick.el;
    const problem = pick.marks.find((m) => m.family === 'craft' || m.ledger === 'new');
    this.#line = String(problem?.title ?? '').replace(/`/g, '');
    this.#go(1);
  }
  // What the person did, from the blueprint: selected an element, took a change, applied.
  selected(el) { if (this.#step === 1 && el === this.#el) this.#go(2); else if (this.#step && el && el !== this.#el) this.end(); }
  taken(el) { if (this.#step === 2 && el === this.#el) this.#go(3); }
  applied(ok) { if (this.#step === 3 && ok) { this.#go(4); clearTimeout(this.#timer); this.#timer = setTimeout(() => this.end(), 3500); } }
  end() {
    if (!this.#step) return;
    clearTimeout(this.#timer);
    this.#step = 0; this.#el = null;
    this.#layer.replaceChildren(); this.#layer.hidden = true;
    done();
  }
  draw() {
    if (!this.#step) return;
    if (!this.#el?.isConnected) { if (this.#step < 4) this.end(); return; }
    const r = this.#el.getBoundingClientRect();
    const words = this.#step === 1 ? WALK[1](this.#line) : WALK[this.#step];
    const below = r.bottom + 120 < innerHeight;
    const top = this.#step === 1 ? r.bottom + 10 : below ? r.bottom + 64 : Math.max(8, r.top - 48);
    this.#layer.innerHTML = `${this.#step === 1 ? `<div class="pulse" style="left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px"></div>` : ''}<div class="line" data-step="${this.#step}" style="left:${Math.max(8, Math.min(r.left, innerWidth - 308))}px;top:${top}px"><span class="n">${this.#step}/4</span>${words.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])}</div>`;
  }
  // from a taken change on, the write may reload the page before the last line shows: it counts as seen from there
  #go(step) { this.#step = step; if (step >= 3) done(); this.#layer.hidden = false; this.draw(); }
}

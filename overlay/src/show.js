/* ─────────────────────────────────────────────────────────
 * SHOW · React Plumber overlay (docs/briefs/page-cleanup.md, "the show")
 *
 * How a clean-up pass plays, on Preview and on Apply: it walks its roles one at a time (a text style, a spacing level, a
 * colour role). For each role: its chip lights, its places on the page are marked in the role's hue with the property's
 * own pattern (visual-language.md: padding hatch, margin dither, gap stripes, text as line bands), its value rolls from
 * what the places have to what the role sets, and the places ease to it underneath. Then the marks lift and the next
 * role starts. Every pass uses this one choreography; only the drawing differs.
 *
 *  chips    chipsHtml(roles): one pill per role, its icon before its value (BLOCK_ICONS / GLYPHS), hues in turn
 *  marks    Marks: a fixed layer in the overlay; bands over each place, re-measured every frame while the page moves
 *  roll     roll(chip, from, to): the value's digits roll like an odometer on the overlay's spring
 *  play     play(steps, { root, marks, signal }): the sequencer; each step { chip, from, to, places(), kind, morph() }
 *
 * Timing (one beat per role, so eight roles play in about five seconds): marks sweep in 240ms, the value rolls and the
 * places ease over 520ms on --pl-spring, a 200ms hold, the marks lift in 160ms. Stop (Esc, Space, Apply) settles at
 * once: every remaining role is set without motion.
 * Reduced motion: no sweep, no roll, no easing: each role's marks show, its value and places change at once.
 * ───────────────────────────────────────────────────────── */

export const HUES = ['sky', 'lilac', 'mint', 'butter', 'pink']; // coral is "off the scale": never a role's hue
export const BEAT = { in: 240, move: 520, hold: 200, out: 160 };
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms, signal) => new Promise((done) => { if (signal?.aborted) return done(); const t = setTimeout(done, ms); signal?.addEventListener('abort', () => { clearTimeout(t); done(); }, { once: true }); });

export const SHOW_CSS = `
  .sh-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  /* a chip is its icon and its value: the pill stays neutral, the icon carries the role's hue once it plays */
  .sh-chip { flex: none; gap: 5px; height: 24px; padding: 0 8px 0 6px; --pill-soft: color-mix(in oklab, currentColor 6%, transparent); --pill-ink: color-mix(in oklab, currentColor 70%, transparent);
    transition: box-shadow 200ms var(--pl-ease-out), background-color 200ms var(--pl-ease-out); }
  .sh-chip i { display: inline-grid; place-items: center; width: 16px; height: 16px; color: color-mix(in oklab, currentColor 45%, transparent); transition: color 200ms var(--pl-ease-out); }
  .sh-chip i svg { width: 14px; height: 14px; display: block; }
  .sh-chip i .ag { font: inherit; font-family: var(--pl-sans); line-height: 1; letter-spacing: -0.02em; }
  /* the chips draw in the ink of the panel they sit in (the clean-up panel keeps its own light colours in either scheme) */
  .sh-chip[data-on], .sh-chip[data-done] { --pill-ink: currentColor; }
  .sh-chip[data-on] i, .sh-chip[data-done] i { color: var(--hue); }
  .sh-chip[data-on] { box-shadow: 0 0 0 1.5px var(--hue); --pill-soft: color-mix(in oklab, var(--hue-soft) 70%, transparent); }
  .sh-chip .v { display: inline-flex; overflow: hidden; height: 11px; line-height: 11px; }
  .sh-chip .d { display: inline-block; height: 11px; overflow: hidden; }
  .sh-chip .d > span { display: flex; flex-direction: column; transition: translate ${BEAT.move}ms var(--pl-spring); }
  .sh-chip .d > span > b { height: 11px; font-weight: inherit; }
  ${HUES.map((h) => `.sh-chip[data-tone="${h}"], .sh-mark[data-tone="${h}"] { --hue: var(--pl-${h}); --hue-soft: var(--pl-${h}-soft); --hue-ink: var(--pl-${h}-ink); }`).join('\n  ')}

  .sh-marks { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
  .sh-mark { position: fixed; box-sizing: border-box; border-radius: 3px; }
  .sh-mark.line { background: color-mix(in oklab, var(--hue) 14%, transparent); box-shadow: inset 0 -1px 0 0 color-mix(in oklab, var(--hue) 70%, transparent); }
  .sh-mark.pad { background-image: repeating-linear-gradient(45deg, color-mix(in oklab, var(--hue) 60%, transparent) 0 1px, transparent 1px 6px); background-color: color-mix(in oklab, var(--hue) 12%, transparent); }
  .sh-mark.gap { background-image: repeating-linear-gradient(90deg, color-mix(in oklab, var(--hue) 55%, transparent) 0 1px, transparent 1px 4px); background-color: color-mix(in oklab, var(--hue) 14%, transparent); }
  .sh-mark.mar { background-image: radial-gradient(color-mix(in oklab, var(--hue) 65%, transparent) 0.75px, transparent 0.9px); background-size: 3px 3px; }
  .sh-marks[data-phase="in"] .sh-mark { animation: sh-sweep ${BEAT.in}ms var(--pl-ease-out) both; }
  .sh-marks[data-phase="out"] .sh-mark { opacity: 0; transition: opacity ${BEAT.out}ms var(--pl-ease-out); }
  @keyframes sh-sweep { from { clip-path: inset(0 100% 0 0); opacity: .4; } }
  @media (prefers-reduced-motion: reduce) {
    .sh-chip, .sh-chip .d > span { transition: none; }
    .sh-marks[data-phase="in"] .sh-mark { animation: none; }
    .sh-marks[data-phase="out"] .sh-mark { transition: none; }
  }
`;

// A value as digits that can roll: each digit a column of 0–9 moved to its place; other characters stand still
const shownOf = (n) => (Number.isFinite(n) ? String(+n.toFixed(1)) : String(n ?? ''));
function digits(text) {
  return [...text].map((c) => (/\d/.test(c) ? `<span class="d"><span style="translate:0 -${+c * 11}px">${'0123456789'.split('').map((k) => `<b>${k}</b>`).join('')}</span></span>` : `<span>${c}</span>`)).join('');
}

export function chipsHtml(roles) {
  return `<div class="sh-chips" role="list">${roles.map((r, i) => `<span class="pl-pill sh-chip" role="listitem" data-i="${i}" data-tone="${HUES[i % HUES.length]}" aria-label="${r.label}">${r.icon ? `<i aria-hidden="true">${r.icon}</i>` : ''}<span class="v">${digits(shownOf(r.from))}</span></span>`).join('')}</div>`;
}

// Roll a chip's value to `to`: same length, each digit column slides; a different length is drawn anew, then rolled
export function roll(chip, to) {
  const v = chip?.querySelector('.v');
  if (!v) return;
  const text = shownOf(to);
  const cols = v.querySelectorAll('.d > span');
  if (still() || v.children.length !== text.length || [...v.children].some((c, i) => !!c.classList.contains('d') !== /\d/.test(text[i]))) {
    v.innerHTML = digits(text.replace(/\d/g, '0'));
    void v.offsetWidth; // the zeroes are drawn before they roll
  }
  let k = 0;
  for (const c of text) if (/\d/.test(c)) { const col = v.querySelectorAll('.d > span')[k++]; if (col) col.style.translate = `0 -${+c * 11}px`; }
  void cols;
}

// The marks: bands over a role's places, kept on them while the page moves under the show
export class Marks {
  #layer; #frame = 0; #bands = [];
  constructor(root) {
    this.#layer = Object.assign(document.createElement('div'), { className: 'sh-marks' });
    this.#layer.setAttribute('aria-hidden', 'true');
    root.append(this.#layer);
  }
  // bands: [{ rect: () => DOMRect-like, kind: 'line'|'pad'|'gap'|'mar' }]
  show(bands, hue) {
    cancelAnimationFrame(this.#frame);
    this.#bands = bands;
    this.#layer.dataset.phase = 'in';
    this.#layer.replaceChildren(...bands.map((b) => Object.assign(document.createElement('i'), { className: `sh-mark ${b.kind}` })));
    for (const el of this.#layer.children) el.dataset.tone = hue;
    const draw = () => {
      this.#bands.forEach((b, i) => {
        const r = b.rect(), el = this.#layer.children[i];
        if (!el) return;
        const off = !r || r.width < 0.5 || r.height < 0.5 || r.bottom < 0 || r.top > innerHeight;
        el.style.cssText = off ? 'display:none' : `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      });
      this.#frame = requestAnimationFrame(draw);
    };
    draw();
  }
  lift() { this.#layer.dataset.phase = 'out'; }
  clear() { cancelAnimationFrame(this.#frame); this.#frame = 0; this.#bands = []; this.#layer.replaceChildren(); delete this.#layer.dataset.phase; }
  remove() { this.clear(); this.#layer.remove(); }
}

// The page's own elements ease on the overlay's spring (the page can't read the overlay's tokens: the curve is written
// out). `blur`: a text change passes through a light blur, so the old and new words read as one change, not a jump
export const SPRING = 'linear(0, 0.21 6%, 0.62 15%, 0.9 25%, 1.01 36%, 1.02 46%, 1 60%, 1)';
const easing = new WeakMap();
export function ease(el, set, { props = ['font-size', 'line-height', 'letter-spacing', 'font-weight', 'padding', 'margin', 'gap', 'row-gap', 'column-gap'], blur = false } = {}) {
  if (still()) return set();
  if (!easing.has(el)) easing.set(el, [el.style.getPropertyValue('transition'), el.style.getPropertyPriority('transition')]);
  el.style.setProperty('transition', props.map((p) => `${p} ${BEAT.move}ms ${SPRING}`).join(', '), 'important');
  set();
  if (blur) el.animate?.([{ filter: 'blur(0)' }, { filter: 'blur(1.5px)', offset: 0.35 }, { filter: 'blur(0)' }], { duration: BEAT.move, easing: 'ease-out' });
  setTimeout(() => {
    const [v, pr] = easing.get(el) ?? [];
    easing.delete(el);
    if (v) el.style.setProperty('transition', v, pr); else el.style.removeProperty('transition');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  }, BEAT.move + 60);
}

// The sequencer. steps: [{ chip, to, bands() → [{ rect, kind }], morph(animate) }]; morph sets the role's places, with
// motion when `animate`. Resolves when every role is set; an aborted signal sets the rest at once.
export async function play(steps, { marks, signal, onStep } = {}) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i], quick = signal?.aborted || still();
    onStep?.(i);
    s.chip?.setAttribute('data-on', '');
    if (!quick) { marks?.show(s.bands(), s.chip?.dataset.tone ?? HUES[i % HUES.length]); await wait(BEAT.in, signal); }
    roll(s.chip, s.to);
    s.morph(!(signal?.aborted || still()));
    if (!signal?.aborted && !still()) { await wait(BEAT.move, signal); await wait(BEAT.hold, signal); marks?.lift(); await wait(BEAT.out, signal); }
    marks?.clear();
    s.chip?.removeAttribute('data-on'); s.chip?.setAttribute('data-done', '');
  }
}

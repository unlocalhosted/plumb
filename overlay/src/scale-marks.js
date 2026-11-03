/* ─────────────────────────────────────────────────────────
 * SCALE MARKS · React Plumber overlay
 *
 * The marks for a scale and the places that use it (docs/design/onboarding.md, "The page": Gravity). Built from the
 * language (language.js, tokens.css): a step is a sky ring named by a lilac tag, a place is a small square mark in its
 * verdict hue, a count rolls like the show's chips.
 *
 *  step     one step of your scale: a ring whose size grows with the places that use it, its name in a lilac tag
 *             rest      sky line, a faint sky fill (how much it's used)
 *             unused    a dashed ink-3 ring, the tag greyed: in your theme, nowhere in your code
 *             pointed   the ring fills with the sky hatch and a sky pill gives its value above it
 *             pulled    places snapped in: the ring takes the mint, its pill counts what it took
 *             off       a value your scale doesn't have: a coral ring with no tag, only its value
 *  place    one place in your code: a 4px square, its hue its verdict
 *             off       coral: a value your scale doesn't have
 *             typed     butter: a value your scale has, typed by hand
 *             on        mint: on your scale (snapped, or written)
 *           and how it shows: rest, dim (another step is pointed at), lit (its step is pointed at), arrive (pops in)
 *  count    a number that rolls to its value digit by digit, on the overlay's spring, with the sentence that says what
 *           it counts beside it
 *
 * Reduced motion: no pop, no roll; values change at once.
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

export const SCALE_CSS = `
  .sc-step { --r: 12px; position: relative; display: inline-grid; justify-items: center; gap: 6px; padding-top: 26px; }
  .sc-step .ring { width: calc(var(--r) * 2); height: calc(var(--r) * 2); border-radius: 50%; box-sizing: border-box;
    box-shadow: inset 0 0 0 1.5px var(--pl-sky); background: color-mix(in oklab, var(--pl-sky) 16%, transparent);
    transition: box-shadow 200ms var(--pl-ease-out), background-color 200ms var(--pl-ease-out), width 420ms var(--pl-spring), height 420ms var(--pl-spring); }
  .sc-step .v { position: absolute; top: 0; left: 50%; translate: -50% 0; opacity: 0; scale: .92; transition: opacity 160ms var(--pl-ease-out), scale 260ms var(--pl-spring-pop); }
  .sc-step[data-state="unused"] .ring { box-shadow: none; background: none; outline: 1.5px dashed var(--pl-ink-3); outline-offset: -1.5px; }
  .sc-step[data-state="unused"] .pl-tag { --pill-soft: var(--pl-paper-2); --pill-ink: var(--pl-ink-3); }
  .sc-step[data-state="pointed"] .ring { box-shadow: inset 0 0 0 2px var(--pl-sky);
    background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-sky) 60%, transparent) 0 1px, transparent 1px 6px), color-mix(in oklab, var(--pl-sky) 12%, transparent); }
  .sc-step[data-state="pointed"] .v, .sc-step[data-state="pulled"] .v, .sc-step[data-state="off"] .v { opacity: 1; scale: 1; }
  .sc-step[data-state="pulled"] .ring { box-shadow: inset 0 0 0 1.5px var(--pl-mint); background: color-mix(in oklab, var(--pl-mint) 30%, transparent); }
  .sc-step[data-state="off"] .ring { box-shadow: inset 0 0 0 1.5px var(--pl-coral); background: color-mix(in oklab, var(--pl-coral) 14%, transparent); }

  .sc-place { display: inline-block; width: 4px; height: 4px; border-radius: 1px; background: var(--pl-coral); transition: opacity 160ms var(--pl-ease-out), scale 260ms var(--pl-spring-pop); }
  .sc-place[data-tone="typed"] { background: var(--pl-butter); }
  .sc-place[data-tone="on"] { background: var(--pl-mint); }
  .sc-place[data-show="dim"] { opacity: .16; }
  .sc-place[data-show="lit"] { scale: 1.5; box-shadow: 0 0 0 1.5px color-mix(in oklab, var(--pl-paper) 90%, transparent); }
  .sc-place[data-show="arrive"] { animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .sc-places { display: inline-flex; flex-direction: column-reverse; gap: 2px; }

  .sc-count { display: inline-flex; align-items: baseline; gap: 10px; }
  .sc-count .n { display: inline-flex; overflow: hidden; height: 1em; font: 700 32px/1 var(--pl-mono); font-variant-numeric: tabular-nums; letter-spacing: -.02em; color: var(--pl-ink); }
  .sc-count .d { display: inline-block; height: 1em; overflow: hidden; }
  .sc-count .d > span { display: flex; flex-direction: column; transition: translate 520ms var(--pl-spring); }
  .sc-count .d b { height: 1em; font-weight: inherit; }
  .sc-count .say { font: var(--pl-card-meta); color: var(--pl-ink-2); }

  @media (prefers-reduced-motion: reduce) {
    .sc-step .ring, .sc-step .v, .sc-place, .sc-count .d > span { transition: none; }
    .sc-place[data-show="arrive"] { animation: none; }
  }
`;

// a step: its ring sized by the places that use it, its name, and the value shown when it's pointed at or pulled
export function step({ name, n, uses = 0, took = 0, state = uses ? 'rest' : 'unused' }) {
  const r = 9 + Math.sqrt(uses + took) * 1.7;
  const value = state === 'pulled' ? `+${took}` : `${+(+n).toFixed(2)}`;
  const hue = state === 'pulled' ? 'mint' : state === 'off' ? 'coral' : 'sky';
  return `<span class="sc-step" data-state="${state}" style="--r:${r.toFixed(1)}px"><span class="pl-pill v" data-hue="${hue}">${esc(value)}</span><span class="ring"></span>${state === 'off' ? '' : `<span class="pl-tag" data-hue="lilac">${esc(name)}</span>`}</span>`;
}

// one place, or a column of them
export const place = (tone = 'off', show = 'rest') => `<span class="sc-place" data-tone="${tone}" data-show="${show}"></span>`;
export const places = (n, tone, show) => `<span class="sc-places">${Array.from({ length: n }, () => place(tone, show)).join('')}</span>`;

// a count: digit columns that roll to the value
const columns = (text) => [...text].map((c) => (/\d/.test(c) ? `<span class="d"><span style="translate:0 -${c}em">${'0123456789'.split('').map((k) => `<b>${k}</b>`).join('')}</span></span>` : `<span>${esc(c)}</span>`)).join('');
export const count = (n, say) => `<span class="sc-count"><span class="n" aria-hidden="true">${columns(new Intl.NumberFormat('en').format(n))}</span><span class="say">${esc(say)}</span></span>`;
export function rollCount(el, n) {
  const box = el.querySelector('.n'), text = new Intl.NumberFormat('en').format(n);
  if (box.children.length !== text.length) { box.innerHTML = columns(text.replace(/\d/g, '0')); void box.offsetWidth; }
  let k = 0; const cols = box.querySelectorAll('.d > span');
  for (const c of text) if (/\d/.test(c)) cols[k++].style.translate = `0 -${c}em`;
}

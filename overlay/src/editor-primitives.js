/* ─────────────────────────────────────────────────────────
 * EDITOR PRIMITIVES · React Plumber overlay
 *
 * The controls every element editor is built from (docs/briefs/element-editors.md, layer 2). One vocabulary for
 * choosing a value on the system, whatever the property: the theme's steps are the only things you can press.
 *
 *  stepper   spacing, size, type: the scale as a row of steps, a window around the current one; ‹ › step the window
 *  swatches  colour: one chip per token, its name on hover and focus
 *  radius    corners: each step drawn as the corner it makes
 *  segments  direction, wrap, fit: two to four options as one segmented control, with glyphs and words
 *  align     align × justify as a 3×3 grid: the dot where the children sit
 *  shadows   elevation: each step as a small raised tile
 *
 * Every control is a radiogroup (role, aria-checked, one tab stop; arrows, Home, End move; Enter or Space picks) and
 * shares the states:
 *  rest       the steps; the current one filled with the accent
 *  hover      a step under the pointer lifts to paper-2 and previews on the page (peek)
 *  focus      a 2px accent ring, keyboard only
 *  pressed    a step pressed down scales to 0.96
 *  picked     a step chosen but not written yet: an accent ring and a dot under it; the current fill stays put
 *  drift      the value sits off the scale: a dashed --pl-off notch where it falls between steps, with its number
 *  disabled   a property set in code (dynamic): the steps quiet, a line saying why, nothing to press
 *  loading    the scale is not read yet: quiet placeholder steps, no hover
 *  empty      the theme has no steps for this family: one line saying so
 *  error      the write was refused: the property's row says why in --pl-off, and the pick stays for a retry
 *
 * Motion: the current fill slides between steps (--pl-dur-travel on --pl-spring); a picked ring fades in
 * (--pl-dur-feedback). Under reduced motion nothing moves; states change at once.
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

export const PRIMITIVES_CSS = `
  .ep-row { display: grid; grid-template-columns: 76px 1fr; align-items: center; column-gap: var(--pl-space-4); row-gap: var(--pl-space-1); padding: var(--pl-space-2) 0; }
  .ep-row > .label { font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-ink-2); }
  .ep-row > .note { grid-column: 2; font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .ep-row > .note.err { color: var(--pl-off); }
  .ep-row > .note code { font: var(--pl-card-code); color: var(--pl-ink); }

  .ep { position: relative; display: flex; align-items: center; gap: 2px; min-width: 0; outline: none; }
  .ep .opt { all: unset; position: relative; z-index: 1; display: grid; place-items: center; box-sizing: border-box; height: 26px; min-width: 30px; padding: 0 var(--pl-space-3);
    border-radius: var(--pl-radius-tag); font: 500 11px/1 var(--pl-mono); color: var(--pl-ink-2); cursor: pointer;
    transition: background var(--pl-dur-feedback) ease-out, color var(--pl-dur-feedback) ease-out, scale var(--pl-dur-feedback) ease-out, box-shadow var(--pl-dur-feedback) ease-out; }
  @media (hover: hover) and (pointer: fine) { .ep .opt:hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .ep .opt:focus-visible { box-shadow: 0 0 0 2px var(--pl-accent); }
  .ep .opt:active { scale: 0.96; }
  .ep .opt[aria-checked="true"] { color: var(--pl-on-accent); }
  .ep .opt[data-picked] { box-shadow: inset 0 0 0 1.5px var(--pl-accent); color: var(--pl-ink); }
  .ep .opt[data-picked]::after { content: ''; position: absolute; bottom: -5px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: var(--pl-accent); }
  /* the current fill: one element that slides to whichever step is current */
  .ep .fill { position: absolute; z-index: 0; top: 0; height: 26px; border-radius: var(--pl-radius-tag); background: var(--pl-accent);
    transition: translate var(--pl-dur-travel) var(--pl-spring), width var(--pl-dur-travel) var(--pl-spring); }
  .ep .fill[hidden] { display: none; }
  /* drift: the off-scale value, a dashed notch between the steps it falls between */
  .ep .notch { position: relative; z-index: 1; display: grid; place-items: center; height: 26px; padding: 0 var(--pl-space-2); font: 500 10px/1 var(--pl-mono); color: var(--pl-off);
    border-inline: 1.5px dashed var(--pl-off); border-radius: 2px; }
  .ep .page { all: unset; display: grid; place-items: center; width: 18px; height: 26px; border-radius: var(--pl-radius-tag); color: var(--pl-ink-3); cursor: pointer; font: 600 12px/1 var(--pl-sans); }
  @media (hover: hover) and (pointer: fine) { .ep .page:not(:disabled):hover { color: var(--pl-ink); background: var(--pl-paper-2); } }
  .ep .page:disabled { visibility: hidden; }
  .ep[aria-disabled="true"] .opt { color: var(--pl-ink-3); cursor: default; pointer-events: none; }
  .ep[aria-disabled="true"] .fill { background: var(--pl-paper-2); }
  .ep[aria-disabled="true"] .opt[aria-checked="true"] { color: var(--pl-ink-2); }
  .ep[aria-busy="true"] .opt { color: transparent; background: var(--pl-paper-2); pointer-events: none; }
  .ep[aria-busy="true"] .fill { display: none; }

  /* swatches */
  .ep.sw .opt { width: 26px; min-width: 26px; padding: 0; }
  .ep.sw .chip { width: 18px; height: 18px; border-radius: 5px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 22%, transparent); }
  .ep.sw .opt[aria-checked="true"] .chip { box-shadow: 0 0 0 2px var(--pl-paper), 0 0 0 3.5px var(--pl-accent); }
  .ep.sw .fill { display: none; }
  .ep.sw .notch { width: 26px; padding: 0; }
  .ep.sw .notch .chip { width: 14px; height: 14px; border-radius: 4px; }

  /* radius: each step is the corner it makes */
  .ep.rad .opt { width: 34px; min-width: 34px; padding: 0; height: 30px; }
  .ep.rad .fill { height: 30px; }
  .ep.rad .corner { width: 14px; height: 14px; border-top: 1.5px solid currentColor; border-left: 1.5px solid currentColor; margin: 4px 0 0 4px; }

  /* segments: glyph and word */
  .ep.seg { background: var(--pl-paper-2); border-radius: calc(var(--pl-radius-tag) + 2px); padding: 2px; width: max-content; }
  .ep.seg .opt { gap: var(--pl-space-2); grid-auto-flow: column; font: var(--pl-text-label); }
  .ep.seg .fill { top: 2px; background: var(--pl-paper); box-shadow: var(--pl-shadow-tag); }
  .ep.seg .opt[aria-checked="true"] { color: var(--pl-ink); }
  .ep.seg svg { width: 12px; height: 12px; }

  /* align: a 3×3 grid of where the children sit */
  .ep.al { display: grid; grid-template-columns: repeat(3, 22px); gap: 2px; padding: 2px; width: max-content; background: var(--pl-paper-2); border-radius: var(--pl-radius-row); }
  .ep.al .opt { width: 22px; min-width: 22px; height: 22px; padding: 0; }
  .ep.al .opt::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--pl-ink-3); }
  .ep.al .opt[aria-checked="true"] { background: var(--pl-accent); }
  .ep.al .opt[aria-checked="true"]::before { width: 10px; height: 4px; border-radius: 2px; background: var(--pl-on-accent); }
  .ep.al .fill { display: none; }

  /* shadows: raised tiles */
  /* a shadow is seen on a page, so the tiles sit on a light ground of their own in either scheme */
  .ep.sh { gap: var(--pl-space-2); padding: 3px; width: max-content; background: #eceae5; border-radius: var(--pl-radius-row); }
  .ep.sh .opt { width: 38px; min-width: 38px; height: 30px; padding: 0; }
  @media (hover: hover) and (pointer: fine) { .ep.sh .opt:hover { background: #e2dfd8; } }
  .ep.sh .fill { display: none; }
  .ep.sh .tile { width: 22px; height: 15px; border-radius: 3px; background: #fff; }
  .ep.sh .opt[aria-checked="true"] { background: #fff0; box-shadow: 0 0 0 1.5px var(--pl-accent); }

  @media (prefers-reduced-motion: reduce) { .ep .opt, .ep .fill { transition: none; } }
`;

const WINDOW = 7; // steps shown at once in a stepper; ‹ › move the window

const GLYPHS = {
  row: '<svg viewBox="0 0 12 12"><path d="M1.5 6h9M7.5 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  column: '<svg viewBox="0 0 12 12"><path d="M6 1.5v9M3 7.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  wrap: '<svg viewBox="0 0 12 12"><path d="M1.5 3h7a2 2 0 0 1 0 4h-4M6 5l-1.5 2L6 9" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  nowrap: '<svg viewBox="0 0 12 12"><path d="M1.5 6h9" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  cover: '<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="currentColor" opacity=".35"/><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  contain: '<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1.5" y="4" width="9" height="4" fill="currentColor" opacity=".35"/></svg>',
};

/** A control's state: { steps: [{ token, label, value, n?, swatch?, shadow?, radius? }], current, picked, drift, disabled, busy } */
const attrs = (s) => `${s.disabled ? ' aria-disabled="true"' : ''}${s.busy ? ' aria-busy="true"' : ''}`;
const opt = (s, step, i, inner) => `<button type="button" class="opt" role="radio" data-i="${i}" aria-checked="${step.token === s.current}"${step.token === s.picked && s.picked !== s.current ? ' data-picked' : ''} tabindex="-1" aria-label="${esc(step.label ?? step.token)}${step.value ? ` ${esc(step.value)}` : ''}" title="${esc(step.token)}${step.value ? ` · ${esc(step.value)}` : ''}">${inner}</button>`;
// the dashed notch where an off-scale value falls between steps
const notch = (drift, inner = esc(drift.label)) => `<span class="notch" title="${esc(drift.label)} is off the scale" aria-hidden="true">${inner}</span>`;
// steps with the drift notch placed between the steps it falls between (by n)
function withNotch(steps, s, render, inner) {
  let out = '', placed = false;
  const mark = () => notch(s.drift, inner?.(s.drift));
  steps.forEach((step, k) => {
    if (s.drift && !placed && s.drift.n !== undefined && step.n !== undefined && s.drift.n < step.n) { out += mark(); placed = true; }
    out += render(step, k);
  });
  if (s.drift && !placed) out += mark();
  return out;
}

export function stepper(name, s) {
  const at = Math.max(0, s.steps.findIndex((x) => x.token === (s.picked ?? s.current)));
  const start = Math.max(0, Math.min(s.steps.length - WINDOW, (s.start ?? at - Math.floor(WINDOW / 2))));
  const shown = s.steps.slice(start, start + WINDOW);
  const body = s.busy ? Array.from({ length: 5 }, (_, i) => `<span class="opt" aria-hidden="true">s${i}</span>`).join('') : withNotch(shown, s, (step, k) => opt(s, step, start + k, esc(step.label ?? step.token)));
  return `<div class="ep st" role="radiogroup" aria-label="${esc(name)}" data-start="${start}"${attrs(s)}><button type="button" class="page prev" aria-label="Smaller steps" ${start <= 0 ? 'disabled' : ''} tabindex="-1">‹</button><span class="fill" aria-hidden="true"></span>${body}<button type="button" class="page next" aria-label="Larger steps" ${start + WINDOW >= s.steps.length ? 'disabled' : ''} tabindex="-1">›</button></div>`;
}
export function swatches(name, s) {
  const chip = (c) => `<span class="chip" style="background:${esc(c)}"></span>`;
  const body = withNotch(s.steps, s, (step, k) => opt(s, step, k, chip(step.swatch ?? step.value)), (d) => chip(d.swatch ?? 'transparent'));
  return `<div class="ep sw" role="radiogroup" aria-label="${esc(name)}"${attrs(s)}>${body}</div>`;
}
export function radius(name, s) {
  const body = withNotch(s.steps, s, (step, k) => opt(s, step, k, `<span class="corner" style="border-top-left-radius:${Math.min(14, step.n ?? 0)}px"></span>`));
  return `<div class="ep rad" role="radiogroup" aria-label="${esc(name)}"${attrs(s)}><span class="fill" aria-hidden="true"></span>${body}</div>`;
}
export function segments(name, s) {
  return `<div class="ep seg" role="radiogroup" aria-label="${esc(name)}"${attrs(s)}><span class="fill" aria-hidden="true"></span>${s.steps.map((step, k) => opt(s, step, k, `${GLYPHS[step.glyph] ?? ''}<span>${esc(step.label ?? step.token)}</span>`)).join('')}</div>`;
}
export function align(name, s) {
  return `<div class="ep al" role="radiogroup" aria-label="${esc(name)}"${attrs(s)}>${s.steps.map((step, k) => opt(s, step, k, '')).join('')}</div>`;
}
export function shadows(name, s) {
  return `<div class="ep sh" role="radiogroup" aria-label="${esc(name)}"${attrs(s)}>${withNotch(s.steps, s, (step, k) => opt(s, step, k, `<span class="tile" style="box-shadow:${esc(step.shadow ?? 'none')}"></span>`))}</div>`;
}

// A labelled row: the property's name, its control, and a note (why it can't be edited, an empty scale, a refusal).
export function row(label, control, note = '', kind = '') {
  return `<div class="ep-row"><span class="label">${esc(label)}</span>${control}${note ? `<span class="note${kind === 'error' ? ' err' : ''}">${note}</span>` : ''}</div>`;
}

// Wire every control under root: hover peeks, a press picks, arrows move focus (roving tabindex), ‹ › page a stepper.
// on: { peek(group, i), unpeek(group), pick(group, i), page(group, start) }; a group is the control's aria-label.
export function bind(root, on = {}) {
  for (const group of root.querySelectorAll('.ep[role="radiogroup"]')) {
    const name = group.getAttribute('aria-label');
    const opts = [...group.querySelectorAll('.opt[role="radio"]')];
    if (!opts.length || group.getAttribute('aria-disabled') === 'true' || group.getAttribute('aria-busy') === 'true') continue;
    const current = opts.find((o) => o.getAttribute('aria-checked') === 'true') ?? opts.find((o) => o.hasAttribute('data-picked')) ?? opts[0];
    current.tabIndex = 0;
    place(group);
    for (const o of opts) {
      const i = +o.dataset.i;
      o.addEventListener('pointerenter', () => on.peek?.(name, i));
      o.addEventListener('pointerleave', () => on.unpeek?.(name));
      o.addEventListener('focus', () => on.peek?.(name, i));
      o.addEventListener('blur', () => on.unpeek?.(name));
      o.addEventListener('click', () => on.pick?.(name, i));
    }
    group.addEventListener('keydown', (e) => {
      const at = opts.indexOf(e.target.closest?.('.opt'));
      if (at < 0) return;
      const grid = group.classList.contains('al') ? 3 : 1;
      const to = { ArrowRight: at + 1, ArrowDown: at + grid, ArrowLeft: at - 1, ArrowUp: at - grid, Home: 0, End: opts.length - 1 }[e.key];
      if (to !== undefined) {
        e.preventDefault();
        const next = opts[Math.max(0, Math.min(opts.length - 1, to))];
        opts.forEach((o) => (o.tabIndex = -1));
        next.tabIndex = 0;
        next.focus();
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.pick?.(name, +opts[at].dataset.i); }
    });
    group.querySelector('.page.prev')?.addEventListener('click', () => on.page?.(name, +group.dataset.start - 1));
    group.querySelector('.page.next')?.addEventListener('click', () => on.page?.(name, +group.dataset.start + 1));
  }
}

// The current fill sits under the current step; it slides there when the current step changes.
export function place(group) {
  const fill = group.querySelector(':scope > .fill');
  const at = group.querySelector('.opt[aria-checked="true"]');
  if (!fill) return;
  if (!at) { fill.hidden = true; return; }
  fill.hidden = false;
  // the first placement lands at once; only a change of step slides
  const first = !fill.dataset.placed;
  if (first) fill.style.transition = 'none';
  fill.style.width = `${at.offsetWidth}px`;
  fill.style.translate = `${at.offsetLeft}px 0`;
  if (first) { void fill.offsetWidth; fill.style.removeProperty('transition'); fill.dataset.placed = ''; }
}

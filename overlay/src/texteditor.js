/* ─────────────────────────────────────────────────────────
 * TEXT CARD · React Plumber overlay
 *
 * Alt+click on words opens a card beside them: what the text is now, as values, and an editor for each (docs/design/
 * text-editor.md, direction D, docs/design/prototypes/text-card.html). The unit is the element; a problem is one
 * state of a value: off the scale.
 *
 *  card      beside the element (right, else left, else below), its caret on the element's middle, the element ringed;
 *            it follows the element through scrolls and resizes and never leaves the screen
 *  rest      Style (the project's text styles, a field that opens a list), then value fields for size, leading,
 *            tracking and weight, then case (segmented) and colour (a chip that opens the swatches). Every value is
 *            read at rest: off the scale coral with a dot; not set, quiet (the page's value); set in code, locked
 *  change    the scale appears under the fields only while a value changes: the steps evenly spaced, the off-scale
 *            value a coral mark where it falls. A field changes by a drag (the whole field is the handle), by ← → or
 *            by typing a number; every change snaps to a step, previews on the element at once, and Enter (or letting
 *            go of a drag) writes it with one POST set, said in the fix panel with Undo. Esc puts it back
 *  drag      past 3px a press is a drag. One spring moves the thumb (transform only, velocity carried); it springs
 *            toward the hand pulled onto the nearest step by a smooth magnet (no jumps: at the midpoint between two
 *            steps the magnet lets go), with a rubber band past the ends. Letting go springs it into its step with a
 *            little overshoot, then writes; Esc or letting go on the value it started on springs it home. The knob
 *            lifts when held, the value rides above it, numbers roll in from the side they came from, the ticks near
 *            it swell. The card is never redrawn while the hand is down
 *  keys      ↑ ↓ the field in hand (stepping when a value is open), ← → step it (previewed), digits type, Enter writes,
 *            Esc puts back, then closes
 *  motion    the card pops in from the element's side; the scale opens out of the fields and folds back faster;
 *            reduced motion: positions only, no spring, roll or swell
 * ───────────────────────────────────────────────────────── */
import { request } from './api.js';
import { locate, componentOf, classSiteOf } from './locate.js';
import { clearOf } from './geometry.js';
import { esc } from './choices.js';
import { namesOf } from './typesystem.js';
import { FIX } from './words.js';
import { contextOf } from './hierarchy.js'; // the element's place among its peers: the step that fits, the ones that break the order
import { Claims, LEVEL } from './claims.js';
import { PICKER_CSS, picker } from './picker.js'; // the panel's fields: the same token picker the design site shows
import { glyph } from './glyphs.js';
import { BUTTON_CSS, button } from './kit.js';
import { COLOUR_PICK_CSS, colourPick, roleOf } from './colourpick.js';

// the panel's names for the values: the CSS names, said plainly (owner: "use correct terminology")
const NAMES = { style: 'Text style', 'font-size': 'Font size', 'line-height': 'Line height', 'letter-spacing': 'Letter spacing', 'font-weight': 'Weight', color: 'Colour' };

const W = FIX.text, WC = FIX.card;
const ORDER = ['style', 'font-size', 'line-height', 'letter-spacing', 'font-weight', 'text-transform', 'color'];
const STYLE_PROPS = ['font-size', 'line-height', 'font-weight', 'letter-spacing', 'text-transform'];
const VALUES = ['font-size', 'line-height', 'letter-spacing', 'font-weight'];
const WIDTH = 276, GAP = 16, EDGE = 12;
const CASE_GLYPH = { none: 'Aa', uppercase: 'AA', lowercase: 'aa', capitalize: 'Ab' };
const WEIGHTS = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
const UNIT = { 'font-size': 'px', 'line-height': '', 'letter-spacing': 'em', 'font-weight': '' };
const ICON = {
  'font-size': '<svg viewBox="0 0 14 14"><path d="M2 3.5h7M5.5 3.5v8M9.5 7h3M11 7v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  'line-height': '<svg viewBox="0 0 14 14"><path d="M4 3h8M4 7h8M4 11h8M1.5 2.5v9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  'letter-spacing': '<svg viewBox="0 0 14 14"><path d="M1.5 2v10M12.5 2v10M4.5 10l2.5-6 2.5 6M5.4 8h3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'font-weight': '<svg viewBox="0 0 14 14"><path d="M4 2.5h3.6a2.2 2.2 0 0 1 0 4.4H4zM4 6.9h4.3a2.3 2.3 0 0 1 0 4.6H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 14 14"><rect x="3" y="6.5" width="8" height="5.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4.8 6.5V5a2.2 2.2 0 0 1 4.4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
};
const STILL = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EXPO = 'cubic-bezier(.19, 1, .22, 1)';
const HOLD = { k: 1400, c: 66 };  // the thumb while held: near critical, quick, no wobble
const SETTLE = { k: 520, c: 25 }; // let go: a little overshoot into the step (a drag's force, spent)
const BAND = 26;                  // px the rubber band gives at most past an end
const SWELL = 18;                 // px around the thumb that ticks swell over
const ATOM = 1 / 240;             // the spring's step, so it moves the same at any frame rate
const PITCH = 40;                 // px of drag per step at most: a short scale is never a long drag
const SPILL = 22;                 // px the value pill may reach past the track's ends (the rail's padding), never the card's edge
// a value the page works out (clamp, var, calc, min, max): fluid, read as what the page shows now
const fluid = (v) => /\(/.test(String(v ?? ''));
const isColor = (v) => { try { return CSS.supports('color', String(v ?? '')); } catch { return false; } };
// a colour as sRGB channels (0–255, alpha 0–1), whatever it is written in (oklab, oklch, color-mix…): drawn once on a
// pixel and read back
let ink = null;
function rgbaOf(v) {
  if (!isColor(v) || /var\(/.test(String(v))) return null; // a var() is a colour only where it is used
  try {
    ink ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    ink.clearRect(0, 0, 1, 1); ink.fillStyle = '#000'; ink.fillStyle = String(v); ink.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ink.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  } catch { return null; }
}
// a colour in plain words: hex when solid, rgb with its alpha when not
function plainColor(v) {
  const c = rgbaOf(v); if (!c) return String(v ?? '');
  if (c.a >= 0.995) return `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return `rgb(${c.r} ${c.g} ${c.b} / ${String(Math.round(c.a * 100) / 100).replace(/^0\./, '.')})`;
}
const sameColor = (a, b) => { const x = rgbaOf(a), y = rgbaOf(b); return !!x && !!y && Math.abs(x.r - y.r) <= 1 && Math.abs(x.g - y.g) <= 1 && Math.abs(x.b - y.b) <= 1 && Math.abs(x.a - y.a) <= 0.01; };
// a size as it reads: whole pixels, or a half (13.5); never 27.06
const pxRound = (n) => Math.round(n * 2) / 2;

// an element whose own words are on the page: a text node with letters among its children
export const hasText = (el) => !!el && el.nodeType === 1 && [...el.childNodes].some((n) => n.nodeType === 3 && /\S/.test(n.textContent));
// where a value sits on the scale: steps evenly spaced (it is the theme's ladder, not a ruler), a value between two
// steps placed between them, in proportion
const posOf = (ns, n) => { const i = ns.findIndex((x) => x >= n - 1e-9); if (i < 0) return 100; if (i === 0 || Math.abs(ns[i] - n) < 1e-9) return ns.length > 1 ? (i / (ns.length - 1)) * 100 : 50; return ((i - 1 + (n - ns[i - 1]) / (ns[i] - ns[i - 1])) / (ns.length - 1)) * 100; };
const round = (n) => Math.round(n * 1000) / 1000;
// a value as a field reads it: size and tracking as numbers (the unit beside them), weight with its name
const fmtOf = (key, n) => !Number.isFinite(n) ? '–' : String(key === 'font-size' ? pxRound(n) : round(n));
// what a field reads beside its number: the unit, or a weight's name
const unitOf = (key, n) => key === 'font-weight' ? WEIGHTS[n] ?? '' : UNIT[key];
const shortOf = (key, n) => key === 'letter-spacing' ? String(round(n)).replace(/^(-?)0\./, '$1.') : fmtOf(key, n);
// roll a number in from the side it came from (up for larger, down for smaller)
function roll(el, text, dir) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  if (!STILL() && dir) el.animate([{ transform: `translateY(${dir > 0 ? 6 : -6}px)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 150, easing: EXPO });
}

export const TEXT_EDITOR_CSS = `
  .tc { position: fixed; z-index: 4; width: ${WIDTH}px; max-height: calc(100vh - ${EDGE * 2}px); overflow: auto; overscroll-behavior: contain; box-sizing: border-box; pointer-events: auto;
    background: rgb(255 255 255 / .9); -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6); border-radius: 16px; color: #1c1b19;
    font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; --sky: #2f6bff; --coral: #e2533a; --ink-3: #8b8a85; --wash: rgb(0 0 0 / .04);
    box-shadow: 0 0 0 .5px rgb(0 0 0 / .1), 0 1px 1px rgb(0 0 0 / .04), 0 10px 24px -10px rgb(0 0 0 / .18), 0 32px 64px -28px rgb(0 0 0 / .22), inset 0 1px 0 rgb(255 255 255 / .9);
    animation: tc-pop 280ms cubic-bezier(.2, .9, .25, 1.15) both; }
  .tc[hidden] { display: none; }
  .tc[data-side="left"] { transform-origin: right center; } .tc[data-side="right"] { transform-origin: left center; } .tc[data-side="below"] { transform-origin: top left; } .tc[data-side="above"] { transform-origin: bottom left; }
  @keyframes tc-pop { from { opacity: 0; scale: .96; } }
  .tc button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; padding: 0; }
  .tc kbd { font: 500 10px/1 ui-monospace, monospace; padding: 2px 4px; border-radius: 4px; background: #fff; box-shadow: 0 0 0 .5px rgb(0 0 0 / .1); color: #55544f; }
  .tc .hd { display: flex; align-items: baseline; gap: 8px; padding: 12px 14px 8px; }
  .tc .hd .n { font: 600 13px/1.2 ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tc .hd .n span { color: var(--ink-3); font-weight: 500; }
  .tc .hd .at { margin-left: auto; font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); white-space: nowrap; }
  .tc .hd { flex-wrap: wrap; }
  /* the levels above the words: a click (or ⌥↑, to their own box first) moves the card up */
  .tc .ups { flex-basis: 100%; display: flex; align-items: center; gap: 1px; min-width: 0; margin: -6px 0 -2px -5px; font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); white-space: nowrap; overflow: hidden; }
  .tc .ups .up { padding: 3px 5px; border-radius: 5px; color: var(--ink-3); max-width: 96px; overflow: hidden; text-overflow: ellipsis; transition: background 120ms, color 120ms; }
  @media (hover: hover) and (pointer: fine) { .tc .ups .up:hover { background: var(--wash); color: #55544f; } }
  .tc .ups .up:focus-visible { outline: 1.5px solid var(--sky); outline-offset: -1px; }
  .tc .ups i { font-style: normal; opacity: .6; } .tc .ups kbd { margin-left: auto; }
  /* what can't be changed here, said at rest */
  .tc .lock { display: flex; gap: 7px; align-items: flex-start; margin: 0 12px 8px; padding: 8px 10px; border-radius: 9px; background: var(--wash); color: #55544f; font-size: 12px; }
  .tc .lock svg { flex: none; width: 14px; height: 14px; margin-top: 1px; color: var(--ink-3); }
  .tc .reach { padding: 0 14px 8px; color: #55544f; font-size: 12px; }
  .tc .down { padding: 4px 14px 14px; color: #c2304f; }
  .tc .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 0 12px 8px; }
  /* a value field: at rest its value; hover lifts; focused or open it is ringed; a drag's handle is the whole field */
  .tc .fld { position: relative; display: flex; align-items: center; gap: 6px; min-width: 0; height: 32px; padding: 0 9px 0 4px; border-radius: 9px; background: var(--wash); outline: none; user-select: none;
    transition: background 120ms ease-out, box-shadow 120ms ease-out, scale 140ms cubic-bezier(.25, .46, .45, .94); }
  .tc .fld[data-key] { cursor: ew-resize; }
  @media (hover: hover) and (pointer: fine) { .tc .fld:hover { background: rgb(0 0 0 / .065); } }
  .tc .fld:active { scale: .985; }
  .tc .fld:focus-visible, .tc .fld[data-at], .tc .fld[data-editing], .tc .seg[data-at] { background: #fff; box-shadow: 0 0 0 1.5px var(--sky), 0 1px 2px rgb(0 0 0 / .06); }
  .tc .fld .ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; color: var(--ink-3); flex: none; font: 600 12px/1 var(--pl-sans, system-ui); }
  .tc .fld .ic svg { width: 14px; height: 14px; }
  .tc .fld .val { display: inline-block; font: 500 13px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; flex: none; white-space: nowrap; }
  .tc .fld.pick .val { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tc .fld .u { font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tc .fld[data-key="font-weight"] .u { font: 500 11px/1 var(--pl-sans, system-ui), sans-serif; margin-left: -2px; }
  /* digits typed that aren't a step: the step Enter uses, beside them */
  .tc .fld .to { font: 500 12px/1 ui-monospace, monospace; color: var(--sky); white-space: nowrap; }
  .tc .fld .was { font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); text-decoration: line-through; margin-left: auto; }
  .tc .fld[data-off] .val { color: #d2462c; }
  .tc .fld[data-off]::after { content: ''; position: absolute; right: 8px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: var(--coral); }
  .tc .fld.pick[data-off]::after { display: none; } .tc .fld.pick[data-off] .sub { color: #d2462c; }
  .tc .fld[data-fluid] .val { color: #1c1b19; }
  .tc .fld[data-off][data-editing]::after, .tc .fld[data-changed]::after { display: none; }
  .tc .fld[data-changed] .val { color: var(--sky); }
  .tc .fld[data-unset]:not([data-changed]) .val { color: var(--ink-3); }
  .tc .fld[aria-disabled="true"] { cursor: default; opacity: .6; }
  .tc .fld.wide { grid-column: 1 / -1; }
  .tc .fld.pick { cursor: pointer; padding-right: 8px; text-align: left; }
  .tc .fld.pick .chev { margin-left: auto; color: var(--ink-3); font-size: 10px; }
  .tc .fld .sub { color: var(--ink-3); font: 500 11.5px/1 var(--pl-sans, system-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tc .fld .chip { width: 16px; height: 16px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .12); flex: none; margin-left: 4px; }
  /* the scale, on demand: out of the fields while a value changes */
  .tc .rail { margin: 0 12px 8px; padding: 9px 10px 8px; border-radius: 10px; background: var(--wash); }
  .tc .rail[data-new] { animation: tc-rail 240ms ${EXPO} both; }
  @keyframes tc-rail { from { clip-path: inset(0 0 100% 0 round 10px); translate: 0 -4px; opacity: .4; } to { clip-path: inset(0 0 0 0 round 10px); } }
  .tc .ticks { position: relative; height: 30px; margin: 14px 8px 0; }
  .tc .ticks::before { content: ''; position: absolute; left: 0; right: 0; top: 8px; height: 2px; border-radius: 1px; background: rgb(0 0 0 / .07); }
  .tc .tk { position: absolute; top: 3px; translate: -50% 0; display: grid; justify-items: center; gap: 5px; font: 500 10px/1 ui-monospace, monospace; color: var(--ink-3); cursor: pointer; padding: 0 2px; border-radius: 5px; transition: color 120ms; }
  .tc .tk i { width: 2px; height: 9px; border-radius: 1px; background: currentColor; opacity: .5; transform-origin: 50% 100%; will-change: transform; }
  .tc .tk b { display: block; font: inherit; }
  /* the hierarchy, on the scale: the step that fits the element's place marked, the steps that break the order quiet */
  .tc .tk[data-fit]::before { content: ''; position: absolute; top: -9px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #1a9e62; box-shadow: 0 0 0 2px rgb(26 158 98 / .18); }
  .tc .tk[data-fit] b { color: #137a4b; }
  .tc .tk[data-breaks]:not([data-at]) { opacity: .38; }
  .tc .tk[data-breaks]:not([data-at]) b { text-decoration: line-through; text-decoration-color: rgb(0 0 0 / .35); }
  .tc .fit { margin-top: 8px; display: flex; gap: 6px; align-items: baseline; font-size: 11.5px; color: #137a4b; }
  .tc .fit::before { content: ''; flex: none; width: 5px; height: 5px; border-radius: 50%; background: #1a9e62; translate: 0 -1px; }
  .tc .tk[data-at] { color: var(--sky); } .tc .tk[data-at] i { height: 11px; width: 3px; opacity: 1; }
  .tc .tk[data-off] { color: #d2462c; cursor: default; } .tc .tk[data-off] i { opacity: 1; height: 11px; width: 3px; background: repeating-linear-gradient(0deg, var(--coral) 0 2px, transparent 2px 3px); }
  @media (hover: hover) and (pointer: fine) { .tc .tk:not([data-off]):hover { color: #1c1b19; } }
  .tc .rail[data-dragging] .tk { cursor: ew-resize; }
  .tc .thumb { position: absolute; left: 0; top: 2px; width: 0; height: 14px; pointer-events: none; will-change: transform; }
  .tc .knob { position: absolute; left: -7px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 .5px rgb(0 0 0 / .15), 0 2px 6px rgb(0 0 0 / .2), inset 0 0 0 3.5px var(--sky); }
  .tc .bub { position: absolute; bottom: calc(100% + 7px); left: 0; translate: -50% 0; padding: 3px 7px; border-radius: 7px; background: #1c1b19; color: #fff; font: 600 10.5px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; white-space: nowrap; transform-origin: 50% 100%; overflow: hidden; }
  .tc .bub span { display: inline-block; }
  .tc .hint { margin-top: 7px; font-size: 11px; color: var(--ink-3); display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .tc .hint .off { color: #d2462c; } .tc .hint .err { color: #c2304f; }
  /* case, and the lists a field opens (styles, colours) */
  .tc .seg { display: flex; margin: 0 12px 8px; padding: 2px; border-radius: 9px; background: var(--wash); }
  .tc .seg .ch { flex: 1; height: 26px; border-radius: 7px; font: 600 12px/1 var(--pl-sans, system-ui); color: #55544f; transition: background 120ms ease-out, box-shadow 120ms ease-out, color 120ms; }
  .tc .seg .ch[aria-checked="true"] { background: #fff; color: #1c1b19; box-shadow: 0 1px 2px rgb(0 0 0 / .1), 0 0 0 .5px rgb(0 0 0 / .06); }
  .tc .seg .ch[data-peek] { box-shadow: inset 0 0 0 1.5px var(--sky); }
  .tc .menu { margin: -2px 12px 8px; padding: 4px; border-radius: 12px; background: #fff; box-shadow: 0 0 0 .5px rgb(0 0 0 / .1), 0 12px 28px -8px rgb(0 0 0 / .25); animation: tc-rail 200ms ${EXPO} both; }
  .tc .menu .ch { position: relative; width: 100%; display: flex; align-items: baseline; gap: 10px; padding: 7px 9px; border-radius: 8px; text-align: left; transition: background 120ms ease-out, box-shadow 120ms; }
  @media (hover: hover) and (pointer: fine) { .tc .menu .ch:hover, .tc .seg .ch:hover { background: rgb(0 0 0 / .04); } }
  .tc .menu .ch[aria-checked="true"] { background: rgb(47 107 255 / .1); color: var(--sky); }
  .tc .menu .ch[data-peek] { box-shadow: inset 0 0 0 1.5px var(--sky); }
  .tc .menu .ag { width: 30px; line-height: 1; }
  .tc .menu .nb { margin-left: auto; font: 500 10.5px/1 ui-monospace, monospace; color: var(--ink-3); }
  .tc .menu .tc-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(24px, 1fr)); gap: 4px; padding: 4px; }
  .tc .menu .tc-swatches .ch { display: block; width: auto; min-width: 24px; height: auto; min-height: 24px; aspect-ratio: 1; padding: 0; border-radius: 6px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
  .tc .menu .tc-swatches .ch[aria-checked="true"] { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px var(--sky); }
  .tc .menu .tc-swatches .ch[data-peek] { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px rgb(47 107 255 / .5); }
  .tc .more { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px; border-top: .5px solid rgb(0 0 0 / .08); color: #55544f; font-size: 12.5px; }
  .tc .more .show { margin-left: auto; height: 26px; padding: 0 9px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; }
  .tc .more .show:hover { background: var(--wash); }
  .tc .ph { height: 32px; border-radius: 9px; background: var(--wash); }
  /* the caret, on the element's middle; the element ringed, glowing while a preview is on it */
  .tc-caret { position: fixed; z-index: 5; width: 12px; height: 12px; rotate: 45deg; background: rgb(255 255 255 / .96); border-radius: 2px; pointer-events: none; }
  .tc-caret[hidden], .tc-ring[hidden] { display: none; }
  .tc-caret[data-side="right"] { box-shadow: -.5px .5px 0 rgb(0 0 0 / .1); } .tc-caret[data-side="left"] { box-shadow: .5px -.5px 0 rgb(0 0 0 / .1); } .tc-caret[data-side="below"] { box-shadow: -.5px -.5px 0 rgb(0 0 0 / .1); }
  .tc-ring { position: fixed; z-index: 3; border-radius: 8px; box-shadow: 0 0 0 1.5px #2f6bff; pointer-events: none; transition: box-shadow 120ms ease-out; }
  .tc-ring[data-peek] { box-shadow: 0 0 0 1.5px #2f6bff, 0 0 0 5px rgb(47 107 255 / .14); }
  :host([data-dragging]), :host([data-dragging]) * { cursor: ew-resize !important; }
  /* ── the panel: the style and the type values as token pickers (picker.js), laid out like a visual editor's panel.
     The picker's rules are nested under the card so they never reach the overlay's other rows and lists ── */
  .tc .pk { ${PICKER_CSS} }
  /* the card is light on any page, so its pickers take the light tokens whatever the computer's scheme */
  .tc { --pl-paper: #ffffff; --pl-paper-2: #f6f6f4; --pl-rule: #e9e8e4; --pl-ink: #1d1b17; --pl-ink-2: #6b665c; --pl-ink-3: #b3ad9f; --pl-sky: #3391ee; --pl-coral: #bf3a1e;
    --pl-mint: #1a9460; --pl-mint-ink: #0b3d26; --pl-mint-on: #ffffff; --pl-pink: #f24a9f; --pl-pink-on: #ffffff; color-scheme: light;
    --pl-shadow-card: 0 0 0 1px var(--pl-rule), 0 1px 2px rgb(28 27 25 / 0.06), 0 14px 32px -14px rgb(28 27 25 / 0.28); }
  .tc { ${BUTTON_CSS} }
  .tc .pk { display: grid; gap: 10px; padding: 2px 12px 10px; }
  .tc .pk section { position: relative; display: grid; gap: 6px; }
  .tc .pk section > b { padding: 0 2px; font: 600 11.5px/1 var(--pl-sans, system-ui); color: var(--ink-3); }
  .tc .pk .grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .tc .pk .one { position: relative; display: grid; }
  .tc .pk .row.compact .slot.hard span { display: none; }
  .tc .pk .style .row.compact { height: 44px; }
  .tc .pk .style .scrub { display: none; }
  .tc .pk .style .row.compact .val { padding-left: 4px; }
  .tc .pk .style .row.compact .val, .tc .pk .style .row.compact .drum { height: 40px; }
  .tc .pk .style .slot b { font: var(--pl-round-w, 600) 15px/1 var(--pl-round, system-ui); }
  .tc .pk .style .slot.hard b { font-family: var(--pl-sans, system-ui); font-size: 13px; }
  .tc .pk .style .slot .smp { display: grid; place-items: center; flex: none; width: 34px; height: 30px; border-radius: 7px; background: var(--pl-paper); color: var(--pl-ink); line-height: 1; font-style: normal; }
  .tc .pk .list { z-index: 6; }
  .tc .pk .list .aa { font-style: normal; width: 22px; text-align: center; line-height: 1; }
  /* not set on this element: the value it gets from above, quiet, until you change it */
  .tc .pk .row.inherited .slot b, .tc .pk .row.inherited .slot span { color: var(--pl-ink-3); font-style: italic; }
  .tc .pk .row.locked { opacity: .62; }
  .tc .pk .row.locked .val, .tc .pk .row.locked .scrub { pointer-events: none; }
  .tc.grabbing, .tc.grabbing * { cursor: ns-resize !important; }
  .tc .pk .seg { margin: 0; }
  .tc .pk { ${COLOUR_PICK_CSS} }
  /* the card scrolls, so a list opens in place under its field (the full width) and pushes the rest down, never cut
     off by the card's edge; a long list scrolls inside itself */
  .tc .pk .list, .tc .pk .row.inline.compact + .list { position: static; grid-column: 1 / -1; max-height: 232px; overflow: auto; overscroll-behavior: contain; box-shadow: 0 0 0 1px var(--pl-rule), 0 6px 16px -8px rgb(28 27 25 / .25); }
  .tc .pk .sw { display: block; width: 16px; height: 16px; border-radius: 5px; background: var(--sw, transparent); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); font-style: normal; }
  .tc .pk .list .sw { width: 14px; height: 14px; }
  .tc .wr { display: flex; justify-content: flex-end; padding: 2px 12px 12px; }
  @media (prefers-reduced-motion: reduce) { .tc, .tc .rail[data-new], .tc .menu { animation: none; } }
`;

// a CSS length as px for the element it is on (rem from the root, em from the element)
function pxOf(v, el) {
  const m = /^(-?[\d.]+)(px|rem|em)?$/.exec(String(v ?? '').trim());
  if (!m) return NaN;
  const n = +m[1];
  if (m[2] === 'rem') return n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  if (m[2] === 'em') return n * (parseFloat(getComputedStyle(el).fontSize) || 16);
  return n;
}
// a step's number on its own row's scale: size in px, leading as a ratio of the size, tracking in em, weight as is
function numOf(key, v, el, size = parseFloat(getComputedStyle(el).fontSize) || 16) {
  if (v === null || v === undefined || v === '') return NaN;
  const s = String(v).trim();
  // the page's word for no change: tracking 0, leading the browser's 1.2
  if (s === 'normal') return key === 'letter-spacing' ? 0 : key === 'line-height' ? 1.2 : key === 'font-weight' ? 400 : NaN;
  if (key === 'font-weight') return parseFloat(s);
  if (key === 'letter-spacing') { const n = parseFloat(s); return /px$/.test(s) ? n / size : n; }
  if (key === 'line-height') { if (/^[\d.]+$/.test(s)) return +s; const px = pxOf(s, el); return Math.round((px / size) * 100) / 100; }
  return pxOf(s, el);
}
// a value in the words people read: sizes in px, the case by its name, normal tracking as 0
const said = (key, v, el) => {
  if (key === 'font-size') { const px = Number.isFinite(+v) ? +v : pxOf(v, el ?? document.documentElement); return Number.isFinite(px) ? `${pxRound(px)}px` : String(v); }
  if (key === 'color') return plainColor(v);
  if (key === 'text-transform') return W.casesSaid[v] ?? String(v);
  if (key === 'letter-spacing' && v === 'normal') return '0em';
  return String(v);
};

export class TextEditor {
  #el; #caret; #ring; #host;
  #target = null; #at = null; #props = null; #state = 'off'; #error = null; #rowError = null;
  #row = 0;            // the field in hand (↑ ↓), an index into the fields shown
  #peek = null;        // { key, i } the choice previewed on the element
  #shown = new Claims(LEVEL.peek); // what a peek shows on the element; claims.js keeps what the page had
  #seq = 0;
  #editing = null;     // { key, at, typed, moved } a value open, its scale shown; null at rest
  #menu = null;        // 'style' | 'color' while its list is open
  #drag = null;        // the drag in progress: { cancel() }
  #dragged = false;    // the press that just ended was a drag, not a click
  #railFor = null;     // the value whose scale is already open (it opens once, not on every step)
  #ctx = null;         // contextOf(target): its role, its container's levels, and per value the step that fits
  #site = null;        // where its classes are written (locate.js classSiteOf): read and written there; refused: locked
  #read0 = null;       // what the page showed when the words were read: { size (px), values: computed per prop }
  #focus = false;      // the card takes focus once it is read (Tab reaches every field)
  #pk = new Map();     // key → its picker in the panel (rebuilt with every draw)
  #held = new Map();   // key → the token picked and not yet written (kept through redraws and re-reads)
  #pend = new Claims(LEVEL.card); // what the held values show on the element until they are written
  #syncing = false;    // a style is setting the type values: they move with it, not as changes of their own
  #queue = null;       // the held values being written, one after another (each write re-reads the file)

  // root: the overlay's shadow root; host: { write(at, key, token, said) → Promise<result>, said(text, undo),
  // problems() → n, show(), closed(), elsewhere(el) → n, dark() → bool, why(el) → Promise<words | null> }
  constructor(root, host) {
    this.#host = host;
    this.#el = Object.assign(document.createElement('div'), { className: 'tc', hidden: true });
    this.#el.setAttribute('role', 'dialog'); // named for the element when it opens ("Edit Lettering")
    this.#caret = Object.assign(document.createElement('div'), { className: 'tc-caret', hidden: true });
    this.#ring = Object.assign(document.createElement('div'), { className: 'tc-ring', hidden: true });
    root.append(this.#ring, this.#el, this.#caret);
    this.#el.addEventListener('pointerdown', (e) => { const f = e.target.closest('.fld[data-key]'); if (f && e.button === 0) this.#press(e, f.dataset.key); });
    this.#el.addEventListener('focusin', (e) => {
      const f = e.target.closest?.('.fld[data-key], .fld[data-menu], .seg'); if (!f || this.#drag) return;
      const k = f.dataset.key ?? f.dataset.menu ?? 'text-transform', keys = this.#state === 'ready' ? this.#fields(this.#rows()) : [];
      const i = keys.indexOf(k); if (i < 0 || i === this.#row) return;
      this.#row = i;
      if (this.#editing && this.#editing.key !== k) return this.#close();
      for (const o of this.#el.querySelectorAll('.fld[data-at], .seg[data-at]')) o.removeAttribute('data-at');
      f.setAttribute('data-at', '');
    });
    this.#el.addEventListener('click', (e) => {
      if (e.target.closest('.show')) return this.#host.show?.();
      if (e.target.closest('[data-do="write"]')) return this.#writeAll();
      const cs = e.target.closest('.pk [data-case]');
      if (cs) return this.#pickCase(cs.dataset.case);
      if (e.target.closest('.pk')) return;
      const up = e.target.closest('.up[data-up]');
      if (up) return this.#climb(+up.dataset.up);
      const f = e.target.closest('.fld[data-key]');
      if (f) { if (this.#dragged) { this.#dragged = false; return; } return this.#open(f.dataset.key); }
      const m = e.target.closest('.fld[data-menu]');
      if (m) return this.#toggleMenu(m.dataset.menu);
      const t = e.target.closest('.tk[data-i]');
      if (t && this.#editing) return this.#write(this.#editing.key, +t.dataset.i);
      const c = e.target.closest('.ch[data-key]');
      if (c) this.#write(c.dataset.key, +c.dataset.i);
    });
    // pointing at a choice (a style, a colour, a case, a step on the scale) previews it; leaving puts back what was shown
    this.#el.addEventListener('pointerover', (e) => {
      if (this.#drag) return;
      const c = e.target.closest('.ch[data-key]'), t = e.target.closest('.tk[data-i]');
      if (c) this.#peekAt(c.dataset.key, +c.dataset.i);
      else if (t && this.#editing) this.#peekAt(this.#editing.key, +t.dataset.i);
    });
    this.#el.addEventListener('pointerout', (e) => {
      if (this.#drag) return;
      const c = e.target.closest('.ch[data-key], .tk[data-i]');
      if (!c || c.contains(e.relatedTarget)) return;
      const ed = this.#editing;
      if (ed?.moved) this.#peekAt(ed.key, ed.at); else this.#unpeek(true);
    });
  }
  get open() { return !!this.#target; }
  get target() { return this.#target; }
  get name() { return this.#at?.chain?.[0]?.component ?? componentOf(this.#target) ?? this.#target?.localName ?? ''; }

  async edit(el) {
    this.#unpeek();
    this.#drag?.cancel();
    this.#pend.clear(); this.#held.clear(); this.#queue = null;
    this.#target = el; this.#at = null; this.#props = null; this.#error = null; this.#rowError = null; this.#row = 0; this.#editing = null; this.#menu = null; this.#railFor = null; this.#ctx = null; this.#site = null; this.#read0 = null; this.#focus = true;
    this.#state = 'loading';
    this.#el.hidden = false; this.#caret.hidden = false; this.#ring.hidden = false;
    // a new element pops in again
    this.#el.style.animation = 'none'; void this.#el.offsetWidth; this.#el.style.removeProperty('animation');
    addEventListener('scroll', this.#follow, { passive: true, capture: true });
    addEventListener('resize', this.#follow);
    this.#draw();
    await this.#read();
  }
  close() {
    this.#seq++; // a read still out lands on a closed card: it is no one's now
    this.#drag?.cancel();
    this.#editing = null; this.#menu = null;
    this.#pend.clear(); this.#held.clear(); this.#queue = null;
    this.#unpeek(); this.#target = null; this.#state = 'off'; this.#props = null;
    this.#el.hidden = true; this.#caret.hidden = true; this.#ring.hidden = true; this.#el.innerHTML = '';
    removeEventListener('scroll', this.#follow, { capture: true });
    removeEventListener('resize', this.#follow);
  }
  // a file was written or undone: the element is read again (a re-render may have replaced it)
  async changed() {
    if (!this.#target) return;
    if (!this.#target.isConnected) {
      const at = this.#stamp;
      const again = at ? document.querySelector(`[data-plumb-source^="${CSS.escape(at)}#"]`) : null;
      if (!again) { this.close(); return this.#host.closed?.(); }
      this.#target = again;
    }
    await this.#read();
    // a Write of several values: each one re-reads the file, then the next is written
    if (this.#queue) this.#next();
  }
  #stamp = null;

  async #read() {
    const el = this.#target, seq = ++this.#seq;
    this.#stamp = el.getAttribute('data-plumb-source')?.split('#')[0] ?? null;
    try {
      const at = this.#at ?? await locate(el);
      if (seq !== this.#seq) return;
      // not placed in the source: why, in the words the fix panel uses (outside the project, or not reachable)
      if (!at?.file) { const why = await this.#host.why?.(el).catch(() => null); if (seq !== this.#seq) return; this.#state = 'error'; this.#error = why ?? W.unreachable; return this.#draw(); }
      this.#at = at;
      const cs = getComputedStyle(el);
      const computed = Object.fromEntries(ORDER.slice(1).map((k) => [k, cs.getPropertyValue(k)]));
      this.#read0 = { size: parseFloat(cs.fontSize) || 16, values: computed };
      // where its classes are written: its own line when the className there holds them, else the usage that passes them
      // in (a file's hash changes with every write: found again each time). Nowhere: the card is locked, and says why
      const site = await classSiteOf(el).catch(() => null);
      if (seq !== this.#seq) return;
      this.#site = site && !site.refused && site.prop !== 'className' ? { refused: W.passedIn(site.prop) } : site;
      const here = site && !site.refused && site.prop === 'className' ? site : at;
      const props = await request('props', { file: here.file, line: here.line, column: here.column, computed: JSON.stringify(computed) });
      if (seq !== this.#seq) return;
      if (!props?.props) { this.#state = 'error'; this.#error = W.unreachable; return this.#draw(); }
      this.#props = props; this.#state = 'ready'; this.#error = null;
      this.#ctx = this.#contextNow();
    } catch (error) {
      if (seq !== this.#seq) return;
      this.#state = 'error';
      // still reading the project, or failed to start, say so in their own words; no answer at all is a server down
      this.#error = error?.starting || error?.failed ? error.message : W.down;
    }
    this.#draw();
  }

  // ── the rows ────────────────────────────────────────────
  #rows() {
    const el = this.#target, props = this.#props?.props ?? [];
    const byKey = new Map(props.map((p) => [p.key, p]));
    const style = byKey.get('style');
    const names = style ? this.#styleNames(style.steps) : new Map();
    const styleName = style?.token ? names.get(style.token) ?? style.token : null;
    const rows = [];
    // a size written as text-[clamp(…)] reads to the server as a colour: it is the size (fluid), and only the code can
    // change it (a step written beside it would fight it)
    const c = byKey.get('color'), misread = c?.source === 'class' && c.value && !isColor(c.value) && c.class ? c : null;
    const fs = byKey.get('font-size'), fluidSize = (fs?.source === 'class' && !fs.token && fluid(fs.value)) || (!!misread && fluid(misread.value) && fs?.source === 'none');
    for (const key of ORDER) {
      let p = byKey.get(key);
      if (!p) continue;
      if (key === 'font-size' && misread && p.source === 'none') p = { ...p, source: 'class', value: misread.value, class: misread.class, token: null, misread: true };
      // a class read as a colour that isn't one (text-[clamp(…)] is a size): not the colour; the colour is the page's
      if (key === 'color' && p.value && !isColor(p.value)) p = { ...p, source: 'none', value: null, token: null, class: null, default: this.#read0?.values.color ?? p.default };
      const label = W.labels[key];
      const numeric = key === 'font-size' || key === 'line-height' || key === 'letter-spacing' || key === 'font-weight';
      let steps = (p.steps ?? []).map((s) => ({ ...s, n: this.#num(key, s.value), label: key === 'text-transform' ? W.cases[s.token] ?? s.label : key === 'style' ? names.get(s.token) ?? s.label : numeric ? said(key, s.value, el) : s.label }));
      if (numeric) {
        steps.sort((a, b) => a.n - b.n);
        // two tokens with one value are one step on the scale (the theme's own name is kept, the first one)
        steps = steps.filter((s, k) => !k || Math.abs(s.n - steps[k - 1].n) > 1e-6 || s.token === p.token);
      }
      const r = { key, label, p, steps, current: p.token ?? null, drift: null, note: '', kind: '' };
      if (this.#locked) { r.disabled = true; r.note = esc(this.#site.refused); }
      else if (p.dynamic) { r.disabled = true; r.note = esc(W.setIn(p.dynamic)); }
      else if (!steps.length) r.note = esc(W.empty(label));
      const same = p.source === 'class' && !p.token && p.value && !fluid(p.value) ? steps.find((s) => Math.abs(s.n - this.#num(key, p.value)) < 1e-6) : null;
      if (numeric && p.source === 'class' && !p.token && fluid(p.value)) {
        // a value the page works out (clamp, var): what it shows now, and the value, said plainly
        const shows = this.#read0?.values[key], n = this.#num(key, shows);
        r.drift = { n, label: said(key, shows, el), fluid: true }; r.kind = 'fluid';
        // what the page works out can only be changed in the code: a step written over it would replace it
        r.disabled = true;
        if (!this.#locked && !p.dynamic) { r.fluidNote = W.fluid(String(p.value).replace(/,\s*/g, ', '), key === 'font-size' ? said(key, shows, el) : fmtOf(key, n)) + ` ${W.inCode}`; r.note = esc(r.fluidNote); }
      } else if (same) {
        // the right value, typed by hand: shown as that step, and picking it names it
        r.current = same.token; r.byHand = true;
        r.note = esc(W.byHand(same.label));
      } else if (p.source === 'class' && !p.token && p.value) {
        const n = this.#num(key, p.value);
        r.drift = { n, label: said(key, p.value, el) };
        const below = [...steps].reverse().find((s) => s.n < n), above = steps.find((s) => s.n > n);
        r.note = esc(W.offScale(said(key, p.value, el), below?.label, above?.label)); r.kind = 'off';
      } else if (key === 'style' && fluidSize && !this.#locked) {
        r.disabled = true; r.note = esc(W.styleFluid);
      } else if (key === 'style' && !p.token) {
        const closest = this.#closestStyle(steps);
        if (closest) r.note = esc(W.closest(closest.label));
      } else if (key !== 'style' && p.source === 'none' && !p.dynamic) {
        // nothing set and nothing to say (text as written): no note
        r.note = esc(styleName && STYLE_PROPS.includes(key) ? W.fromStyle(styleName) : p.default && !(key === 'text-transform' && p.default === 'none') ? W.fromPage(said(key, p.default, el)) : '');
      } else if (key !== 'style' && styleName && STYLE_PROPS.includes(key) && p.source === 'class') r.note = esc(W.notStyle(styleName));
      if (this.#rowError?.key === key) { r.note = esc(this.#rowError.text); r.kind = 'error'; }
      rows.push(r);
    }
    return rows;
  }
  // a value as a number on its row's scale, against the size the words had when they were read (a size previewed never
  // changes what the leading reads)
  #num(key, v) { return numOf(key, v, this.#target, this.#read0?.size); }
  // its classes are written nowhere the card can change them: every value locked, the reason said at rest
  get #locked() { return !!this.#site?.refused; }
  // the words' own box, then the levels above it, nearest last (up to three, never <body>), each a way up: the nearest is
  // where ⌥↑ goes, so the buttons and the key agree
  #upsHtml() {
    const ups = [];
    for (let p = this.#target, i = 0; p && p !== document.body && p !== document.documentElement && i <= 3; p = p.parentElement, i++) ups.unshift([i, p]);
    if (!ups.length) return '';
    return `<div class="ups" role="group" aria-label="${esc(WC.levels)}">${ups.map(([i, p]) => `<button type="button" class="up" data-up="${i}" title="${esc(i ? WC.upTo(p.localName) : W.ownBox)}">${esc(i ? componentOf(p) ?? p.localName : p.localName)}</button>${i ? '<i aria-hidden="true">›</i>' : ''}`).join('')}<kbd title="${esc(W.upBox)}">⌥↑</kbd></div>`;
  }
  // up to the level named: through the host when it climbs (its way back kept), else as ⌥↑ would, once for the words'
  // own box and once per level
  #climb(n) {
    let up = this.#target; for (let i = 0; i < n && up; i++) up = up.parentElement;
    if (!up) return;
    // a level above: through the host, which keeps the way back; the words' own box is ⌥↑'s first stop
    if (this.#host.climb && n > 0) return this.#host.climb(up);
    for (let i = 0; i <= n; i++) dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', altKey: true, bubbles: true, cancelable: true }));
  }
  // the project's text styles in plain words (Body, Title small); a compact variant is the same style for lists
  #styleNames(steps) {
    const base = steps.filter((s) => !/-compact$/.test(s.token));
    const names = namesOf(base.map((s) => ({ name: s.token, bundle: { size: parseFloat(s.size) * (/rem$/.test(s.size) ? 16 : 1) } })));
    for (const s of steps) if (/-compact$/.test(s.token)) names.set(s.token, W.lists(names.get(s.token.replace(/-compact$/, '')) ?? s.label));
    return names;
  }
  #closestStyle(steps) {
    const size = parseFloat(getComputedStyle(this.#target).fontSize);
    let best = null;
    for (const s of steps) { const d = Math.abs(pxOf(s.size, this.#target) - size); if (!best || d < best.d) best = { d, label: s.label }; }
    return best;
  }

  // ── the card ────────────────────────────────────────────
  // the value a field reads now: off the scale, the step it uses, or what the page shows when nothing sets it
  #nowOf(r) {
    if (r.drift) return r.drift.n;
    const step = r.steps.find((s) => s.token === r.current);
    if (step) return step.n;
    return r.p.default ? this.#num(r.key, r.p.default) : NaN;
  }
  // the step a value opens on: its own, else the nearest
  #startOf(r) {
    const now = this.#nowOf(r);
    let at = r.steps.findIndex((s) => s.token === r.current);
    if (at < 0 && Number.isFinite(now)) r.steps.forEach((s, i) => { if (at < 0 || Math.abs(s.n - now) < Math.abs(r.steps[at].n - now)) at = i; });
    return Math.max(0, at);
  }
  #fields(rows) { return rows.filter((r) => r.key !== 'style' || r.steps.length).map((r) => r.key); }
  #valueField(r, at) {
    const ed = this.#editing?.key === r.key ? this.#editing : null, now = this.#nowOf(r);
    const shownN = ed?.moved ? r.steps[ed.at]?.n : now;
    const text = ed?.typed ? ed.typed : fmtOf(r.key, shownN);
    const changed = !!ed?.moved && !ed.typed && shownN !== now;
    const tip = r.note.replace(/<[^>]+>/g, '').replace(/&#39;|&rsquo;/g, '’').replace(/&amp;/g, '&');
    const attrs = `${r.drift && !r.drift.fluid ? ' data-off' : ''}${r.drift?.fluid ? ' data-fluid' : ''}${!r.drift && !r.current ? ' data-unset' : ''}${ed ? ' data-editing' : ''}${changed ? ' data-changed' : ''}${at ? ' data-at' : ''}${r.disabled ? ' aria-disabled="true"' : ''}`;
    const valueNow = Number.isFinite(shownN) ? ` aria-valuenow="${round(shownN)}"` : '';
    const to = ed?.typed && Number.isFinite(Number(ed.typed)) && r.steps[ed.at] && Math.abs(r.steps[ed.at].n - Number(ed.typed)) > 1e-6 ? r.steps[ed.at] : null;
    return `<div class="fld" role="spinbutton" tabindex="0" data-key="${r.key}" aria-label="${esc(r.label)}"${valueNow} aria-valuetext="${esc(fmtOf(r.key, shownN))}${UNIT[r.key]}" title="${esc(tip || `Drag to change ${r.label.toLowerCase()}`)}"${attrs}>`
      + `<span class="ic">${r.disabled ? ICON.lock : ICON[r.key]}</span><span class="val">${esc(text)}</span>${unitOf(r.key, shownN) && !ed?.typed && Number.isFinite(shownN) ? `<span class="u">${unitOf(r.key, shownN)}</span>` : ''}${to ? `<span class="to" title="${esc(W.typedNearest(`${ed.typed}${UNIT[r.key]}`, to.label))}">→ ${esc(shortOf(r.key, to.n))}</span>` : ''}${changed ? `<span class="was">${esc(fmtOf(r.key, now))}</span>` : ''}</div>`;
  }
  // the scale, under the fields while a value changes: steps evenly spaced, the off-scale value where it falls
  #rail(r) {
    const ed = this.#editing, ns = r.steps.map((s) => s.n), now = this.#nowOf(r);
    const marks = r.steps.map((s, i) => ({ n: s.n, i }));
    if (r.drift) marks.push({ n: r.drift.n, off: true });
    marks.sort((a, b) => a.n - b.n);
    const fresh = this.#railFor !== r.key; this.#railFor = r.key;
    const at = ed.moved || !r.drift ? ed.at : -1;
    const fit = this.#ctx?.fits?.[r.key], near = (a, b) => Math.abs(a - b) < 0.01;
    // the step that fits, on this scale: the engine's own when it is a step, else the nearest steps that keep the
    // order (a value off the scale fits between its neighbours, so both are marked when they are as near)
    const keeps = fit ? ns.filter((n) => !fit.breaks.some((b) => near(b, n))) : [];
    const best = keeps.length ? Math.min(...keeps.map((n) => Math.abs(n - fit.step))) : 0;
    const fitting = fit ? (ns.some((n) => near(n, fit.step)) ? [fit.step] : keeps.filter((n) => near(Math.abs(n - fit.step), best))) : [];
    const ticks = marks.map((m) => { const fits = !m.off && fitting.some((n) => near(n, m.n)), breaks = !m.off && fit && !fits && fit.breaks.some((b) => near(b, m.n)); /* the step that fits is never also dimmed */ return `<span class="tk"${m.off ? ' data-off' : ` data-i="${m.i}"`} style="left:${posOf(ns, m.n)}%"${!m.off && m.i === at ? ' data-at' : ''}${fits ? ' data-fit' : ''}${breaks ? ' data-breaks' : ''} title="${esc(fmtOf(r.key, m.n))}${UNIT[r.key]}${fits ? ` · ${esc(W.fitsHere)}` : breaks ? ` · ${esc(W.breaksHere)}` : ''}"><i></i><b>${m.off ? '' : esc(shortOf(r.key, m.n))}</b></span>`; }).join('');
    const why = fit ? this.#fitWords(r.key) : '';
    const typedN = ed.typed ? Number(ed.typed) : NaN, nearest = Number.isFinite(typedN) && r.steps[ed.at] && Math.abs(r.steps[ed.at].n - typedN) > 1e-6 ? r.steps[ed.at] : null;
    const note = this.#rowError?.key === r.key ? `<span class="err">${r.note}</span>` : nearest ? `<span>${esc(W.typedNearest(`${ed.typed}${UNIT[r.key]}`, nearest.label))}</span>` : r.drift && !ed.moved ? `<span class="off">${r.note}</span>` : '';
    const keys = this.#drag ? `<span>${esc(W.letGo)}</span><span><kbd>esc</kbd> ${esc(W.cancel)}</span>` : `<span>${esc(W.dragOr)} <kbd>←</kbd> <kbd>→</kbd></span><span><kbd>↵</kbd> ${esc(W.use)}</span><span><kbd>esc</kbd> ${esc(W.back)}</span>`;
    void now;
    return `<div class="rail" aria-hidden="true"${fresh ? ' data-new' : ''}${this.#drag ? ' data-dragging' : ''}><div class="ticks">${ticks}${this.#drag ? '<span class="thumb"><span class="knob"></span><span class="bub"><span></span></span></span>' : ''}</div>${why ? `<div class="fit">${esc(why)}</div>` : ''}<div class="hint">${note}${keys}</div></div>`;
  }
  #ch(r, i, inner, label, extra = '') {
    const step = r.steps[i];
    return `<button type="button" class="ch" role="radio" data-key="${r.key}" data-i="${i}" aria-checked="${step.token === r.current}" aria-label="${esc(label)}"${r.disabled ? ' disabled' : ''}${extra}>${inner}</button>`;
  }

  #draw() {
    if (!this.#target) return;
    // the place its classes are written (the usage that passes them in, when that's where), else where it is drawn
    const where = this.#site?.file ? this.#site : this.#at;
    const el = this.#target, name = this.name, at = where ? `${where.file.split('/').pop()}:${where.line}` : '';
    let body = '';
    if (this.#state === 'loading') body = `<div class="fields"><div class="ph" style="grid-column:1/-1"></div><div class="ph"></div><div class="ph"></div><div class="ph"></div><div class="ph"></div></div>`;
    else if (this.#state === 'error') body = `<div class="down" role="alert">${esc(this.#error)}</div>`;
    else {
      const rows = this.#rows(), by = new Map(rows.map((r) => [r.key, r])), keys = this.#fields(rows);
      this.#row = Math.max(0, Math.min(keys.length - 1, this.#row));
      const inHand = keys[this.#row];
      const family = esc(getComputedStyle(el).fontFamily);
      void inHand; void family;
      // the panel: style, type values, case and colour. The pickers are mounted once the card is drawn (#mount); case is
      // four buttons. Nothing is written until Write
      const style = by.get('style'), values = VALUES.map((k) => by.get(k)).filter(Boolean), kase = by.get('text-transform'), color = by.get('color');
      // case: what is held, else what is set, else nothing set (the text as written)
      const caseNow = kase && (this.#held.get('text-transform') ?? kase.current ?? (kase.steps.some((s) => s.token === 'none') && (!kase.p.default || kase.p.default === 'none') ? 'none' : null));
      const segHtml = kase?.steps.length ? `<section><b>Case</b><div class="seg" role="radiogroup" aria-label="${esc(kase.label)}">${kase.steps.map((s, k) => `<button type="button" class="ch" role="radio" data-case="${esc(s.token)}" data-i="${k}" aria-checked="${s.token === caseNow}" aria-label="${esc(s.label)}"${kase.disabled ? ' disabled' : ''}>${CASE_GLYPH[s.token] ?? esc(s.label)}</button>`).join('')}</div></section>` : '';
      const any = style?.steps.length || values.length || segHtml || color?.steps.length;
      if (any) body += `<div class="pk">${style?.steps.length ? `<section class="style"><b>Style</b><div class="one"></div></section>` : ''}${values.length ? `<section><b>Type</b><div class="grid"></div></section>` : ''}${segHtml}${color?.steps.length ? `<section class="colour"><b>Colour</b><div class="one"></div></section>` : ''}</div>`;
      const open = this.#editing && by.get(this.#editing.key);
      if (open) body += this.#rail(open); else this.#railFor = null;
      // one button writes every value picked in the panel
      if (any) body += `<div class="wr">${button('Write', { cls: 'sm', key: '↵', attrs: 'data-do="write" disabled' })}</div>`;
    }
    // a write that was refused says why, under the values (the value stays as it was, to try again)
    if (this.#rowError && !this.#editing) body += `<div class="down" role="alert">${esc(this.#rowError.text)}</div>`;
    const reach = this.#state === 'ready' ? this.#host.elsewhere?.(el) ?? 0 : 0;
    const problems = this.#host.problems?.() ?? 0;
    const dark = this.#host.dark?.() ? 'dark' : 'light';
    this.#el.dataset.scheme = dark; this.#caret.dataset.scheme = dark;
    this.#el.setAttribute('aria-label', W.region(name));
    // what can't be changed here, said at rest: the classes written nowhere it can reach, else each fluid value
    const fluids = this.#state === 'ready' && !this.#locked ? this.#rows().filter((r) => r.fluidNote).map((r) => r.fluidNote) : [];
    const lock = this.#state === 'ready' && this.#locked ? `<div class="lock" role="note">${ICON.lock}<span>${esc(this.#site.refused)}</span></div>`
      : fluids.length ? `<div class="lock" role="note">${ICON.lock}<span>${fluids.map(esc).join('<br>')}</span></div>` : '';
    const root = this.#el.getRootNode(), focused = this.#focus || this.#el.contains(root.activeElement);
    this.#el.innerHTML = `<div class="hd">${this.#upsHtml()}<span class="n">${esc(name)}${name !== el.localName ? ` <span>· ${esc(el.localName)}</span>` : ''}</span><span class="at">${esc(at)}</span></div>`
      + (reach && !this.#locked ? `<div class="reach">${esc(W.reach(reach))}</div>` : '') + lock + body
      + (problems ? `<div class="more"><span>${esc(W.problems(problems))}</span><button type="button" class="show">${W.show} <kbd>.</kbd></button></div>` : '');
    this.#mount();
    this.#mark();
    this.#place();
    // focus in the card (once it is read), on the field in hand; kept there through every redraw
    if (focused && this.#state !== 'loading') {
      this.#focus = false;
      const f = this.#el.querySelector('.fld[data-at], .seg[data-at]') ?? this.#el.querySelector('.pk .row:not(.locked) .val') ?? this.#el.querySelector('.fld[tabindex="0"], button.fld, .seg .ch, .up');
      (f?.matches('.seg') ? f.querySelector('.ch[aria-checked="true"]') ?? f.querySelector('.ch') : f)?.focus({ preventScroll: true });
    }
  }

  // beside the element: right when it fits, else left, else below; the caret on the element's middle
  #follow = () => { if (this.#target) requestAnimationFrame(() => this.#place()); };
  #place() {
    const el = this.#target;
    if (!el?.isConnected) return;
    const t = el.getBoundingClientRect(), h = Math.min(this.#el.offsetHeight, innerHeight - EDGE * 2), mid = t.top + t.height / 2;
    let side = t.right + GAP + WIDTH <= innerWidth - EDGE ? 'right' : t.left - GAP - WIDTH >= EDGE ? 'left' : 'below';
    let left, top, cx, cy;
    if (side === 'below') {
      left = Math.max(EDGE, Math.min(innerWidth - WIDTH - EDGE, t.left));
      top = t.bottom + GAP;
      if (top + h > innerHeight - EDGE) top = Math.max(EDGE, t.top - GAP - h), side = 'above';
      cx = Math.max(left + 18, Math.min(left + WIDTH - 18, t.left + Math.min(40, t.width / 2)));
      cy = side === 'above' ? top + h - 6 : top - 6;
    } else {
      left = side === 'right' ? t.right + GAP : t.left - GAP - WIDTH;
      top = Math.max(EDGE, Math.min(innerHeight - h - EDGE, mid - 60));
      cx = side === 'right' ? left - 6 : left + WIDTH - 6;
      cy = Math.max(top + 14, Math.min(top + h - 26, mid - 6));
    }
    // never over the fix bar or another of the overlay's surfaces (and off the words when it can be): moved the least it
    // takes, by the overlay's one placement rule (geometry.js clearOf); the caret follows, or goes when the card is no
    // longer against the words' side
    const root = this.#el.getRootNode(), rect = (n) => (n && !n.hidden && n.isConnected ? n.getBoundingClientRect() : null);
    const others = [this.#host.bar?.() ?? rect(root.querySelector?.('.fx')), ...[...(root.querySelectorAll?.('.ec, .ec-strip') ?? [])].map(rect)];
    let at = clearOf(left, top, WIDTH, h, [...others, t], { edge: EDGE });
    if (at.covered) at = clearOf(left, top, WIDTH, h, others, { edge: EDGE });
    const slid = at.x !== left;
    if (at.y !== top && side !== 'below' && side !== 'above') cy = Math.max(at.y + 14, Math.min(at.y + h - 26, mid - 6));
    else if (at.y !== top) cy += at.y - top;
    left = at.x; top = at.y;
    Object.assign(this.#el.style, { left: `${left}px`, top: `${top}px` });
    Object.assign(this.#caret.style, { left: `${cx}px`, top: `${cy}px` });
    this.#caret.style.display = slid || cy < top - 8 || cy > top + h ? 'none' : '';
    Object.assign(this.#ring.style, { left: `${t.left - 6}px`, top: `${t.top - 4}px`, width: `${t.width + 12}px`, height: `${t.height + 8}px` });
    this.#el.dataset.side = side; this.#caret.dataset.side = side === 'above' ? 'below' : side;
    // the element off screen: the card waits for it
    const gone = t.bottom < 0 || t.top > innerHeight;
    this.#el.style.visibility = this.#caret.style.visibility = this.#ring.style.visibility = gone ? 'hidden' : '';
  }

  // ── preview ─────────────────────────────────────────────
  #valuesOf(key, step) {
    if (key === 'style') return { 'font-size': step.size, 'line-height': step.lineHeight ?? '', 'font-weight': step.weight ?? '', 'letter-spacing': step.letterSpacing ? `${step.letterSpacing}em` : '0em', 'text-transform': step.transform ?? 'none' };
    return { [key]: step.value ?? step.css };
  }
  #peekAt(key, i) {
    const r = this.#rows().find((x) => x.key === key), step = r?.steps[i];
    if (!step || r.disabled) return;
    this.#unpeek();
    this.#peek = { key, i };
    for (const [prop, v] of Object.entries(this.#valuesOf(key, step))) {
      if (v === '' || v === null || v === undefined) continue;
      this.#shown.set(this.#target, prop, v);
    }
    this.#mark();
    this.#ring.setAttribute('data-peek', '');
    this.#follow();
  }
  #unpeek(redraw = false) {
    this.#shown.clear();
    const had = !!this.#peek;
    this.#peek = null;
    this.#ring?.removeAttribute('data-peek');
    if (had) this.#follow();
    if (redraw && had) this.#mark();
  }
  // ── write ───────────────────────────────────────────────
  async #write(key, i) {
    const r = this.#rows().find((x) => x.key === key), step = r?.steps[i];
    if (!step || r.disabled || !this.#props || (step.token === r.current && !r.byHand)) return;
    this.#unpeek();
    this.#rowError = null;
    const name = this.name;
    // a colour is said by its token's name (draw), not its value
    const text = key === 'style' ? W.styled(step.label, name) : W.changed(r.label, key === 'color' ? step.token : said(key, step.value ?? step.label, this.#target), name);
    try {
      // a value written in one branch (a ternary's case) is changed in that string: its position goes with the write
      const result = await this.#host.write({ file: this.#props.file, line: this.#props.line, column: this.#props.column, hash: this.#props.hash, ...(r.p?.at ? { at: r.p.at } : {}) }, key, step.token, text);
      // the write's invalidate reads the element again (changed); the panel says it, with Undo
      this.#host.said?.(text, result?.undo ? [result.undo] : []);
      return true;
    } catch (error) {
      this.#rowError = { key, text: error?.message ?? String(error) };
      this.#queue = null;
      this.#draw();
      return false;
    }
  }

  // ── the panel: the style and the type values as token pickers ──
  // Each picker previews on the element as you move it (held, at the card's level); nothing is written until Write.
  // The card is drawn again on every read, so what is held lives here and the pickers are set back to it.
  #mount() {
    this.#pk.clear();
    const box = this.#el.querySelector('.pk');
    if (!box || this.#state !== 'ready') return;
    this.#mounting = true; // the style field follows the values only once they are all there
    try { this.#build(box); } finally { this.#mounting = false; }
    if ([...this.#held.keys()].some((k) => k !== 'style')) this.#match();
    this.#refresh();
  }
  #mounting = false;
  #restoring = false;
  #colour = null;   // the colour picker in the card, when it has one
  #build(box) {
    const rows = this.#rows(), el = this.#target, none = document.createElement('i');
    const optionsOf = (r) => {
      const opts = r.steps.map((s) => ({ name: s.token, v: s.n, step: s }));
      if (r.drift && !r.drift.fluid) { const at = opts.findIndex((o) => o.v > r.drift.n); opts.splice(at < 0 ? opts.length : at, 0, { name: r.drift.label, v: r.drift.n, hard: true }); }
      // not set here and on none of the tokens (a style's own value): shown as it is, among them, until you pick one
      const now = this.#nowOf(r);
      if (!r.drift && !r.current && Number.isFinite(now) && !opts.some((o) => Math.abs(o.v - now) < 1e-6)) { const at = opts.findIndex((o) => o.v > now); opts.splice(at < 0 ? opts.length : at, 0, { v: now, inherit: true }); }
      return opts;
    };
    const startOf = (r, opts) => {
      if (opts.some((o) => o.hard)) return undefined;
      const i = opts.findIndex((o) => (r.current ? o.step?.token === r.current : o.inherit));
      if (i >= 0) return i;
      const now = this.#nowOf(r); let best = 0;
      if (Number.isFinite(now)) opts.forEach((o, k) => { if (Math.abs(o.v - now) < Math.abs(opts[best].v - now)) best = k; });
      return best;
    };
    const mk = (into, r, spec) => {
      const opts = spec.options ?? optionsOf(r), start = spec.start === undefined && !spec.options ? startOf(r, opts) : spec.start;
      const first = opts[start ?? opts.findIndex((o) => o.hard)];
      const p = picker(box, { into, keys: none, grab: this.#el, compact: true, name: NAMES[r.key], options: opts, start,
        apply: (o) => this.#hold(r.key, o, first), changed: () => this.#refresh(), ...spec });
      if (r.disabled) { p.row.classList.add('locked'); p.row.title = r.note.replace(/<[^>]+>/g, '').replace(/&#39;|&rsquo;/g, '’').replace(/&amp;/g, '&'); }
      // not set on this element: what it gets from above, quiet, until you change it
      if (!r.disabled && r.p.source === 'none' && !r.current && !r.drift) p.row.classList.add('inherited');
      this.#pk.set(r.key, { p, opts, r, first });
      return p;
    };
    const style = rows.find((r) => r.key === 'style');
    if (style?.steps.length) {
      const opts = style.steps.map((s) => ({ name: s.label, v: pxOf(s.size, el), lh: s.lineHeight, fw: s.weight, step: s })).sort((a, b) => a.v - b.v);
      // No style is always there: a value moved off the style lands the field on it
      opts.unshift({ name: W.noStyle, v: 0, hard: true });
      const at = opts.findIndex((o) => o.step?.token === style.current);
      mk(box.querySelector('.style .one'), style, {
        options: opts, start: at < 0 ? undefined : at, toy: glyph('type'),
        format: (o) => (o.hard ? '' : `${Math.round(o.v)} / ${o.lh ?? '–'}`),
        mark: (o) => `<i class="aa" style="font-size:${o.hard ? 13 : Math.min(18, Math.round(10 + o.v * 0.3))}px;font-weight:${o.fw ?? 500}">Ag</i>`,
        lead: (o) => `<i class="smp" style="font-size:${o.hard ? 14 : Math.min(19, Math.round(11 + o.v * 0.25))}px;font-weight:${o.fw ?? 500}">Ag</i>`,
      });
    }
    const grid = box.querySelector('.grid');
    const fmt = { 'font-size': (o) => `${pxRound(o.v)}px`, 'line-height': (o) => String(round(o.v)), 'letter-spacing': (o) => `${round(o.v)}em`, 'font-weight': (o) => String(o.v) };
    const mark = { 'font-size': (o) => `<i class="aa" style="font-size:${Math.min(18, Math.max(9, Math.round(o.v * 0.6)))}px">Aa</i>`, 'line-height': () => '<i class="aa">≡</i>', 'letter-spacing': (o) => `<i class="aa" style="letter-spacing:${Math.max(-0.1, o.v * 2)}em">AV</i>`, 'font-weight': (o) => `<i class="aa" style="font-weight:${o.v}">Aa</i>` };
    // in the half-width fields the value comes first and the token's name after it (names can be long)
    if (grid) for (const k of VALUES) {
      const r = rows.find((x) => x.key === k); if (!r) continue;
      const opts = optionsOf(r); for (const o of opts) if (!o.hard) o.name = fmt[k](o);
      mk(grid, r, { options: opts, start: startOf(r, opts), toy: glyph(k), format: (o) => (o.step ? o.step.token : o.inherit ? 'inherited' : ''), mark: mark[k] });
    }
    // colour: a compact field at rest (the colour as a swatch, its name); a click opens the colour picker inside the
    // card (colourpick.js): your colour, the three tokens nearest it, every colour by what it is for. A pick is held
    // like any value and written by the card's one Write
    const color = rows.find((r) => r.key === 'color'), cbox = box.querySelector('.colour .one');
    if (color?.steps.length && cbox) {
      const shows = this.#read0?.values.color, value = [color.p.value, color.p.default, shows].find((v) => isColor(v));
      const tokens = color.steps.filter((s) => isColor(s.value)).map((s) => ({ name: s.token, role: roleOf(s.token), l: s.value, d: s.value }));
      const hardC = color.p.source === 'class' && !color.p.token && isColor(color.p.value);
      const own = !hardC && (tokens.find((t) => t.name === color.current) ?? (value ? tokens.find((t) => sameColor(t.l, value)) : null));
      const mine = hardC ? { name: plainColor(color.p.value), l: color.p.value }
        : own ? { name: own.name, l: own.l, now: own.name === color.current ? 'now' : 'inherited' }
        : { name: plainColor(value ?? shows ?? ''), l: value ?? shows ?? 'transparent', now: 'inherited' };
      const cp = colourPick(box, { into: cbox, folded: true, tokens, hard: mine, role: roleOf(/\bbg-|background/.test(color.p.class ?? '') ? 'surface' : 'fg'), writes: false,
        apply: (t, { token }) => { if (this.#mounting && !this.#restoring) return; if (!token || t.name === color.current) this.#held.delete('color'); else this.#held.set('color', t.name); this.#showHeld(); this.#refresh(); } });
      if (color.disabled) cp.field.disabled = true;
      this.#colour = cp;
      // a colour held before this draw is picked again (the card is drawn again after every write)
      if (this.#held.has('color')) { this.#restoring = true; try { cp.set(this.#held.get('color')); } finally { this.#restoring = false; } }
    }
    // what was picked before this draw is picked again
    // (the style first, so a value picked after it lands over it)
    for (const [key, token] of [...this.#held].sort(([a], [b]) => (a === 'style' ? -1 : b === 'style' ? 1 : 0))) {
      const f = this.#pk.get(key); if (!f) continue;
      const i = f.opts.findIndex((o) => o.step?.token === token);
      if (i >= 0 && i !== f.p.at()) { this.#restoring = true; try { f.p.set(i); } finally { this.#restoring = false; } }
    }
    this.#refresh();
  }
  // a picker moved: what it holds now (nothing, when it is back where it started or on the hard-coded value)
  #hold(key, o, first) {
    // a field being built shows where it starts: that is no change, and never drops what is held (restored after)
    if (this.#mounting && !this.#restoring) return;
    // the style field moved by the values (it follows them): it says which style they make, and holds nothing itself
    if (this.#syncing && key === 'style') return;
    if (this.#syncing && key !== 'style') { this.#held.delete(key); }
    else if (o === first || o.hard || !o.step) this.#held.delete(key);
    else this.#held.set(key, o.step.token);
    this.#pk.get(key)?.p.row.classList.toggle('inherited', !this.#held.has(key) && this.#pk.get(key).r.p.source === 'none' && !this.#pk.get(key).r.current && !this.#pk.get(key).r.drift);
    // a style moves the type values with it: they show its values, and are written as the style, not one by one
    if (key === 'style' && !this.#syncing && o.step) {
      const s = o.step, want = { 'font-size': pxOf(s.size, this.#target), 'line-height': s.lineHeight != null ? +s.lineHeight : NaN, 'font-weight': s.weight != null ? +s.weight : NaN, 'letter-spacing': s.letterSpacing != null ? +s.letterSpacing : 0 };
      this.#syncing = true;
      for (const [k, n] of Object.entries(want)) {
        const f = this.#pk.get(k); if (!f || f.r.disabled || !Number.isFinite(n)) continue;
        const i = f.opts.findIndex((x) => !x.hard && Math.abs(x.v - n) < 1e-6);
        if (i >= 0) f.p.set(i);
      }
      this.#syncing = false;
    }
    // a value changed by hand: the style field follows, to the style these values make, or No style
    if (key !== 'style' && !this.#syncing && !this.#mounting) this.#match();
    this.#showHeld();
  }
  // which style the type values make now (a locked value is outside the card's say, so it doesn't count against one)
  #match() {
    const s = this.#pk.get('style'); if (!s || s.r.disabled) return;
    const now = {};
    for (const k of VALUES) { const f = this.#pk.get(k); if (f && !f.r.disabled) now[k] = f.opts[f.p.at()]?.v; }
    const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-3;
    const of = (o) => ({ 'font-size': o.v, 'line-height': o.lh != null ? +o.lh : NaN, 'font-weight': o.fw != null ? +o.fw : NaN, 'letter-spacing': o.step?.letterSpacing != null ? +o.step.letterSpacing : 0 });
    let i = s.opts.findIndex((o) => !o.hard && Object.entries(now).every(([k, v]) => { const want = of(o)[k]; return !Number.isFinite(want) || near(want, v); }));
    if (i < 0) i = s.opts.findIndex((o) => o.hard);
    if (i === s.p.at()) return;
    this.#syncing = true; s.p.set(i); this.#syncing = false;
  }
  // case: one of four buttons; held like a picked value (the one it already uses holds nothing)
  #pickCase(token) {
    const r = this.#rows().find((x) => x.key === 'text-transform');
    if (!r || r.disabled || !r.steps.some((s) => s.token === token)) return;
    const was = r.current ?? (!r.p.default || r.p.default === 'none' ? 'none' : null);
    if (token === was) this.#held.delete('text-transform'); else this.#held.set('text-transform', token);
    for (const b of this.#el.querySelectorAll('.pk [data-case]')) b.setAttribute('aria-checked', String(b.dataset.case === token));
    this.#showHeld(); this.#refresh();
  }
  // the held values, shown on the element (the style first, a value picked after it over it)
  #showHeld() {
    const el = this.#target; if (!el) return;
    this.#pend.clear(el);
    const keys = [...this.#held.keys()].sort((a, b) => (a === 'style' ? -1 : b === 'style' ? 1 : 0)), rows = keys.length ? this.#rows() : [];
    for (const key of keys) {
      const step = rows.find((x) => x.key === key)?.steps.find((t) => t.token === this.#held.get(key));
      if (!step) continue;
      for (const [prop, v] of Object.entries(this.#valuesOf(key, step))) if (v !== '' && v !== null && v !== undefined) this.#pend.set(el, prop, v);
    }
    this.#follow();
  }
  // the one button: how many values there are to write
  #refresh() {
    const b = this.#el.querySelector('[data-do="write"]'); if (!b) return;
    const n = this.#held.size, busy = !!this.#queue;
    b.disabled = !n || busy;
    b.toggleAttribute('aria-busy', busy);
    b.querySelector('.lb').textContent = n ? `Write ${n} change${n > 1 ? 's' : ''}` : 'Write';
  }
  // Write: the held values one after another, the style first; each write re-reads the file before the next
  #writeAll() {
    if (!this.#held.size || this.#queue) return;
    this.#queue = [...this.#held.keys()].sort((a, b) => (a === 'style' ? -1 : b === 'style' ? 1 : 0));
    this.#refresh();
    this.#next();
  }
  async #next() {
    const key = this.#queue?.shift();
    if (!key) { this.#queue = null; this.#refresh(); return; }
    const token = this.#held.get(key), r = this.#rows().find((x) => x.key === key), i = r?.steps.findIndex((s) => s.token === token) ?? -1;
    this.#held.delete(key);
    if (i < 0 || (token === r.current && !r.byHand)) return this.#next();
    if (!this.#queue.length) this.#queue = null; // the last one: its re-read ends the Write
    const ok = await this.#write(key, i);
    if (!ok) { this.#held.set(key, token); this.#queue = null; this.#refresh(); }
  }

  // the choice previewed is ringed and the field in hand marked, without drawing the card again
  #mark() {
    for (const o of this.#el.querySelectorAll('[data-peek]')) o.removeAttribute('data-peek');
    if (!this.#peek) return;
    const o = this.#el.querySelector(`.ch[data-key="${this.#peek.key}"][data-i="${this.#peek.i}"]`);
    if (o && o.getAttribute('aria-checked') !== 'true') o.setAttribute('data-peek', '');
  }

  // the element's place, read with the theme's own steps (what props offers for size and weight)
  #contextNow() {
    try {
      const rows = this.#rows(), ns = (k) => rows.find((r) => r.key === k)?.steps.map((s) => s.n).filter(Number.isFinite);
      const scale = {}; const sizes = ns('font-size'), weights = ns('font-weight');
      if (sizes?.length) scale.sizes = sizes; if (weights?.length) scale.weights = weights;
      return contextOf(this.#target, scale);
    } catch { return null; }
  }
  // why a step fits, in plain words: the element's role, and the levels on either side of it in its container
  #fitWords(key) {
    const c = this.#ctx; if (!c?.role) return '';
    const i = c.levels.findIndex((l) => l.role === c.role && l.members?.includes(this.#target));
    const up = c.levels[i - 1], down = c.levels[i + 1];
    const own = c.levels[i]?.bundle.size;
    if (key === 'font-size') return W.fitsSize(c.role, up && { role: up.role, n: up.bundle.size, same: up.bundle.size === own }, down && { role: down.role, n: down.bundle.size, same: down.bundle.size === own });
    if (key === 'font-weight') return W.fitsWeight(c.role, [up, down].filter((l) => l && l.bundle.size === c.levels[i]?.bundle.size).map((l) => l.role));
    return '';
  }

  // ── a value, open ───────────────────────────────────────
  // a click on a value opens it: its scale shows, nothing changes until a step is picked
  #open(key) {
    const rows = this.#rows(), r = rows.find((x) => x.key === key);
    if (!r || r.disabled || !r.steps.length) return;
    this.#menu = null;
    this.#row = this.#fields(rows).indexOf(key);
    if (this.#editing?.key === key) return;
    this.#unpeek();
    this.#editing = { key, at: this.#startOf(r), typed: '', moved: false };
    this.#draw();
  }
  #close() { this.#editing = null; this.#unpeek(); this.#draw(); }
  // a step of the open value: previewed, the field reading it
  #step(at) {
    const r = this.#rows().find((x) => x.key === this.#editing.key);
    this.#editing = { ...this.#editing, at: Math.max(0, Math.min(r.steps.length - 1, at)), typed: '', moved: true };
    this.#peekAt(r.key, this.#editing.at);
    this.#draw();
  }
  // a number typed: the field reads it as typed, and the step nearest it is previewed on the words at once
  #type(r, typed) {
    const n = Number(typed), at = typed && Number.isFinite(n) && r?.steps.length ? r.steps.reduce((b, s, i) => (Math.abs(s.n - n) < Math.abs(r.steps[b].n - n) ? i : b), 0) : -1;
    this.#unpeek();
    this.#editing = { ...this.#editing, typed, ...(at >= 0 ? { at } : {}) };
    if (at >= 0) this.#peekAt(r.key, at);
    this.#draw();
  }
  #commit() {
    const ed = this.#editing, r = this.#rows().find((x) => x.key === ed.key);
    if (ed.typed) { const n = Number(ed.typed); let at = 0; r.steps.forEach((s, i) => { if (Math.abs(s.n - n) < Math.abs(r.steps[at].n - n)) at = i; }); ed.at = at; ed.moved = true; ed.typed = ''; }
    // the step it already uses: nothing to write, the scale folds back
    if (!ed.moved || (r.steps[ed.at]?.token === r.current && !r.byHand)) return this.#close();
    this.#editing = null;
    this.#write(r.key, ed.at);
  }
  #toggleMenu(which) {
    const r = this.#rows().find((x) => x.key === which);
    if (r?.disabled) return;
    this.#editing = null; this.#unpeek();
    this.#menu = this.#menu === which ? null : which;
    const keys = this.#fields(this.#rows());
    if (keys.includes(which)) this.#row = keys.indexOf(which);
    this.#draw();
  }

  // ── the drag ────────────────────────────────────────────
  // The whole field is the handle: past 3px a press is a drag, and the scale opens out of the fields. One spring
  // moves the thumb toward the hand pulled onto the nearest step by a smooth magnet (on the step near it, free at the
  // midpoint, so it never jumps), with a rubber band past the ends. The step nearest the hand is the value: previewed
  // at once, its number rolling in from the side it came from. Letting go springs the thumb into its step, then
  // writes it; Esc (through key()) or letting go on the value it started on springs it home and changes nothing.
  // Nothing is redrawn while the hand is down: the field, the ticks and the thumb are moved in place.
  #press(e, key) {
    const r = this.#rows().find((x) => x.key === key);
    if (!r || r.disabled || !r.steps.length || this.#drag) return;
    const ns = r.steps.map((s) => s.n), origin = this.#nowOf(r), x0 = e.clientX;
    const from = r.steps.findIndex((s) => s.token === r.current && !r.byHand);
    const home = from >= 0 ? from : r.byHand ? r.steps.findIndex((s) => s.token === r.current) : -1; // -1: between steps
    const offHome = home < 0;
    const host = this.#el.getRootNode().host;
    let d = null;
    this.#dragged = false;
    const label = (n) => `${fmtOf(key, n)}${key === 'font-weight' ? '' : UNIT[key]}`;
    const begin = () => {
      this.#dragged = true;
      this.#menu = null;
      this.#row = this.#fields(this.#rows()).indexOf(key);
      this.#editing = { key, at: home >= 0 ? home : this.#startOf(r), typed: '', moved: true };
      this.#drag = { cancel: () => end(false) };
      this.#draw();
      host?.setAttribute('data-dragging', '');
      const track = this.#el.querySelector('.ticks'), w = track.getBoundingClientRect().width;
      const xOf = (n) => (posOf(ns, n) / 100) * w;
      const start = offHome ? xOf(Number.isFinite(origin) ? origin : ns[0]) : xOf(ns[home]);
      // a short scale has far-apart steps: the hand's travel is geared so a step is never more than PITCH px of drag away
      const gain = Math.max(1, (ns.length > 1 ? w / (ns.length - 1) : w) / PITCH);
      d = { track, w, xOf, start, gain, at: home, hand: start, x: start, v: 0, mode: 'hold', last: performance.now(),
        thumb: track.querySelector('.thumb'), knob: track.querySelector('.knob'), bub: track.querySelector('.bub'), num: track.querySelector('.bub span'),
        fld: this.#el.querySelector(`.fld[data-key="${key}"]`), ticks: [...track.querySelectorAll('.tk')].map((t) => ({ i: t.querySelector('i'), x: (parseFloat(t.style.left) / 100) * w })) };
      d.num.textContent = label(offHome ? origin : ns[home]);
      if (!STILL()) {
        d.knob.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }], { duration: 180, easing: EXPO, fill: 'forwards' });
        d.bub.animate([{ transform: 'translateY(4px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: EXPO });
      }
      requestAnimationFrame(frame);
    };
    // where the thumb is drawn: the hand, pulled onto the nearest step (a cubic magnet: firm on it, free at the
    // midpoint); past an end, a rubber band
    const targetOf = (hand) => {
      if (hand < 0) return -BAND * (1 - 1 / (1 + -hand / BAND / 2));
      if (hand > d.w) return d.w + BAND * (1 - 1 / (1 + (hand - d.w) / BAND / 2));
      const xs = ns.map((n) => d.xOf(n)).concat(offHome ? [d.start] : []);
      let s0 = xs[0]; for (const x of xs) if (Math.abs(x - hand) < Math.abs(s0 - hand)) s0 = x;
      const side = xs.filter((x) => (hand >= s0 ? x > s0 : x < s0));
      const other = side.length ? side.reduce((a, x) => (Math.abs(x - s0) < Math.abs(a - s0) ? x : a)) : null;
      const half = other === null ? 24 : Math.abs(other - s0) / 2;
      const u = Math.min(1, Math.abs(hand - s0) / half);
      return s0 + (hand - s0) * u * u * u;
    };
    const choose = (hand) => {
      let at = 0, best = Infinity;
      ns.forEach((n, i) => { const dist = Math.abs(d.xOf(n) - hand); if (dist < best) best = dist, at = i; });
      if (offHome && Math.abs(d.start - hand) < best) at = -1;
      if (at === d.at) return;
      const before = d.at < 0 ? origin : ns[d.at], n = at < 0 ? origin : ns[at];
      const dir = Math.sign(n - before);
      d.at = at;
      if (at >= 0) this.#editing.at = at;
      for (const t of d.track.querySelectorAll('.tk[data-i]')) t.toggleAttribute('data-at', +t.dataset.i === at);
      const changed = at !== home;
      roll(d.num, label(n), dir);
      roll(d.fld.querySelector('.val'), fmtOf(key, n), dir);
      const u = d.fld.querySelector('.u'); if (u) u.textContent = unitOf(key, n);
      d.fld.toggleAttribute('data-changed', changed);
      let was = d.fld.querySelector('.was');
      if (changed && !was) { was = Object.assign(document.createElement('span'), { className: 'was', textContent: fmtOf(key, origin) }); d.fld.append(was); }
      if (!changed) was?.remove();
      if (at >= 0 && changed) this.#peekAt(key, at); else this.#unpeek();
    };
    const frame = (now) => {
      if (!d) return;
      const dt = Math.min(0.05, (now - d.last) / 1000); d.last = now;
      const target = d.mode === 'hold' ? targetOf(d.hand) : (d.at < 0 ? d.start : d.xOf(ns[d.at]));
      const { k, c } = d.mode === 'hold' ? HOLD : SETTLE;
      if (STILL()) { d.x = target; d.v = 0; }
      else for (let t = 0; t < dt; t += ATOM) { const h = Math.min(ATOM, dt - t); d.v += (-k * (d.x - target) - c * d.v) * h; d.x += d.v * h; }
      d.thumb.style.transform = `translateX(${d.x}px)`;
      // the value pill rides over the thumb, but never past the rail: near an end it slides back to stay whole
      const half = d.bub.offsetWidth / 2, lo = -SPILL + half, hi = d.w + SPILL - half;
      d.bub.style.translate = `calc(-50% + ${Math.round((Math.max(lo, Math.min(hi, d.x)) - d.x) * 10) / 10}px) 0`;
      if (!STILL()) for (const tk of d.ticks) tk.i.style.transform = `scaleY(${1 + 0.55 * Math.exp(-(((tk.x - d.x) / SWELL) ** 2))})`;
      if (d.mode !== 'hold' && Math.abs(d.x - target) < 0.15 && Math.abs(d.v) < 4) return d.done();
      requestAnimationFrame(frame);
    };
    const move = (ev) => {
      if (!d) { if (Math.abs(ev.clientX - x0) < 3) return; begin(); }
      d.hand = d.start + (ev.clientX - x0) * d.gain;
      choose(Math.max(0, Math.min(d.w, d.hand)));
    };
    const end = (keep) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', cancel);
      host?.removeAttribute('data-dragging');
      if (!d) return;
      if (!keep) { d.at = home; this.#unpeek(); }
      const at = d.at, wrote = keep && at !== home && at >= 0;
      if (!STILL()) d.knob.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 220, easing: EXPO, fill: 'forwards' });
      d.mode = 'settle';
      d.done = () => {
        const rail = this.#el.querySelector('.rail');
        const finish = () => { d = null; this.#drag = null; this.#editing = null; if (wrote) this.#write(key, at); else { this.#unpeek(); this.#draw(); } };
        // the scale folds back into the fields, quicker than it opened
        if (STILL() || !rail) return finish();
        rail.animate([{ clipPath: 'inset(0 0 0 0 round 10px)', opacity: 1 }, { clipPath: 'inset(0 0 100% 0 round 10px)', opacity: 0.4 }], { duration: 150, easing: 'cubic-bezier(.25, .46, .45, .94)', fill: 'forwards' }).finished.then(finish, finish);
      };
      if (STILL()) d.done();
    };
    const up = () => end(true);
    // the browser took the pointer (a touch turned scroll, a system gesture): the drag is put back, as Esc does
    const cancel = () => end(false);
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', cancel);
  }

  // ── keys ────────────────────────────────────────────────
  // ↑ ↓ the field in hand (a value open steps instead), ← → step it (previewed; on case, a style or a colour list,
  // the choices), digits type a value, Enter writes or opens, Esc puts back, then closes the list, then the card.
  // '.' is the panel's (the problems inside) unless a number is being typed.
  key(k) {
    if (!this.#target) return false;
    if (this.#drag) { if (k === 'Escape') this.#drag.cancel(); return true; }
    // a picker in hand: ← → ↑ ↓ step it, Enter writes what is held, Esc closes its list, then puts every value back
    const a = this.#el.getRootNode().activeElement, inRow = a && this.#el.contains(a) ? a.closest('.pk .row') : null;
    // inside the colour picker its own keys move through the colours and Esc folds it; Enter writes what is held
    if (a && this.#el.contains(a) && a.closest('.pk .cp')) {
      if (k === 'Enter') { this.#writeAll(); return true; }
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(k);
    }
    const f = inRow ? [...this.#pk.values()].find((x) => x.p.row === inRow) : null;
    if (f && !f.r.disabled) {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[k];
      if (d) { f.p.set(f.p.at() + d); return true; }
      if (k === 'Enter') { const open = this.#el.querySelector('.pk .list:not([hidden])'); if (open) { open.hidden = true; return true; } this.#writeAll(); return true; }
      if (k === 'Escape') {
        const open = this.#el.querySelector('.pk .list:not([hidden])');
        if (open) { open.dispatchEvent(new Event('picker:close')); return true; }
        if (this.#held.size) { for (const x of this.#pk.values()) x.p.putBack(); this.#held.clear(); this.#showHeld(); this.#refresh(); return true; }
      }
    }
    if (k === 'Enter' && this.#held.size && !this.#queue) { this.#writeAll(); return true; }
    const rows = this.#state === 'ready' ? this.#rows() : [];
    const keys = this.#fields(rows), r = rows.find((x) => x.key === keys[this.#row]);
    const ed = this.#editing;
    if (ed) {
      const er = rows.find((x) => x.key === ed.key);
      if (/^\d$/.test(k) || (k === '.' && !ed.typed.includes('.')) || (k === '-' && !ed.typed)) { this.#type(er, ed.typed + k); return true; }
      if (k === 'Backspace' && ed.typed) { this.#type(er, ed.typed.slice(0, -1)); return true; }
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[k];
      if (d && er) {
        // from a value between two steps, the first step is the neighbour on that side
        const above = er.drift ? er.steps.findIndex((s) => s.n > er.drift.n) : -1, hi = above < 0 ? er.steps.length : above;
        this.#step((ed.moved || !er.drift ? ed.at : d > 0 ? hi - 1 : hi) + d);
        return true;
      }
      if (k === 'Enter') { this.#commit(); return true; }
      if (k === 'Escape') { this.#close(); return true; }
      return k !== '.';
    }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      if (!keys.length) return true;
      this.#unpeek(); this.#menu = null;
      this.#row = Math.max(0, Math.min(keys.length - 1, this.#row + (k === 'ArrowDown' ? 1 : -1)));
      this.#draw();
      return true;
    }
    // digits with a value in hand open it, typing
    if (/^\d$/.test(k) && r && VALUES.includes(r.key) && !r.disabled && r.steps.length) { this.#open(r.key); return this.key(k); }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && r && !r.disabled && r.steps.length) {
      if (VALUES.includes(r.key)) { this.#open(r.key); return this.key(k); }
      if ((r.key === 'style' || r.key === 'color') && this.#menu !== r.key) { this.#menu = r.key; this.#draw(); }
      const from = this.#peek?.key === r.key ? this.#peek.i : r.steps.findIndex((s) => s.token === r.current);
      const to = from < 0 ? (k === 'ArrowRight' ? 0 : r.steps.length - 1) : Math.max(0, Math.min(r.steps.length - 1, from + (k === 'ArrowRight' ? 1 : -1)));
      this.#peekAt(r.key, to);
      return true;
    }
    if (k === 'Enter') {
      if (this.#peek) { this.#write(this.#peek.key, this.#peek.i); return true; }
      if (r && VALUES.includes(r.key)) { this.#open(r.key); return true; }
      if (r && (r.key === 'style' || r.key === 'color')) { this.#toggleMenu(r.key); return true; }
      return true;
    }
    if (k === 'Escape') {
      if (this.#peek) { this.#unpeek(true); return true; }
      if (this.#menu) { this.#menu = null; this.#draw(); return true; }
      this.close(); this.#host.closed?.(); return true;
    }
    return false;
  }
}

/* ─────────────────────────────────────────────────────────
 * ELEMENT CARD · React Plumber overlay
 *
 * Alt+click on anything that isn't words opens a card beside it (words open the text card, texteditor.js). This first
 * layer holds its effects: Shadow › and Motion ›, each drilled into from the card (docs/design/prototypes/element-
 * cards.html, the `── effects` and `── the views` blocks). Every option, tuning and edit comes from the recipe engine
 * (GET /__plumb/recipes, POST recipes/preview, POST recipes/apply): nothing about a shadow or a motion is worked out here.
 *
 *  card      beside the element (right, else left, else below), its caret on the element's middle, the element ringed;
 *            it follows the element through scrolls and resizes and never leaves the screen (texteditor.js's placement)
 *  rest      the element's name and line, then Shadow › (a tile wearing its shadow, the one it uses) and Motion › (what
 *            it does now)
 *  drill     the card slides over to Shadow or Motion: ‹ back, the option in hand with its verdict against the
 *            project's own, its handles, then Writes: the exact edit the engine would make, before anything is written
 *  strip     the options as live copies of the element at real size, on its own ground, beside the card (else under
 *            it): the project's own first ("yours"), then the pack's lined up against them (= same, ≈ close, new).
 *            Pointing at one tries it on the real element; a click takes it. Motion copies play their trigger on a
 *            loop, with a cursor for hover and press
 *  handles   shadow: the light pad (the sun's angle is the direction, its reach the height, the halo the softness).
 *            motion: the curve's two handles (past the top line overshoots), the duration on a timeline, the travel by
 *            its ghost. Each change asks the engine again and shows on the element; the card isn't redrawn mid-drag
 *  where     every read and write is at the element's class site (locate.js classSiteOf): its own line when its
 *            className is a plain string, else the usage that passes the classes in. The header names it, "N like it"
 *            counts what is drawn from it; classes written nowhere as a plain string lock the card at rest, said once
 *  write     Write it (Enter) applies the same request: said in the fix panel with Undo (every file, newest first)
 *  keys      at rest ↑ ↓ the field, Enter opens it; in a drill ↑ ↓ step through the options, ← → turn the light (or
 *            change the time), R plays the motion, Enter writes, Esc goes back, then closes
 *  motion    the card pops in from the element's side, a drill slides in from the side it came from; reduced motion:
 *            positions only, no loops, no plays
 * ───────────────────────────────────────────────────────── */
import { request, post } from './api.js';
import { locate, componentOf, classSiteOf, classEditsOf, siteMates } from './locate.js';
import { esc } from './choices.js';
import { FIX } from './words.js';
import { clearOf } from './geometry.js';
import { Spacing, Layout, LAYOUT_CSS, freeze, fitCopy, groundOf } from './layoutcard.js';
import { lawsOf } from './laws.js';
import { Tidy } from './tidycard.js'; // layer 3: Tidy this card // layer 2: Layout › and the spacing on the element
import { placeOf, atPlace } from './stamp.js';

const W = FIX.card;
const WIDTH = 276, GAP = 16, EDGE = 12;
const STILL = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EXPO = 'cubic-bezier(.19, 1, .22, 1)';
const PAD = { w: 252, h: 150, reach: 34 };   // the light pad: px of reach per 1× height
const CV = { w: 252, h: 120, pad: 18 };      // the curve
const LOOP = 2400;                           // ms between plays of a motion copy
const LIMITS = { light: [-60, 60], height: [0.25, 3], softness: [0.5, 2], ms: [60, 600] };
const ICON_LAYOUT = '<svg viewBox="0 0 14 14"><rect x="1.5" y="2" width="4.5" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="2" width="4.5" height="4.2" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="7.8" width="4.5" height="4.2" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const ICON_TIDY = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 3.5h6M2 7h10M2 10.5h8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICON_MOTION = '<svg viewBox="0 0 14 14"><path d="M2 11c3 0 4-8 10-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="3" r="1.4" fill="currentColor"/></svg>';
const CURSOR = '<svg viewBox="0 0 16 16"><path d="M2 1.5v11.2l3.1-2.9 2 4.6 2-.9-2-4.5 4.3-.2z" fill="#1c1b19" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const clamp = (n, [lo, hi]) => Math.max(lo, Math.min(hi, n));
const r2 = (n) => Math.round(n * 100) / 100;
// a CSS duration as ms ("150ms", "0.15s")
const msOf = (v) => { const m = /^([\d.]+)(ms|s)$/.exec(String(v ?? '').trim()); return m ? (m[2] === 's' ? +m[1] * 1000 : +m[1]) : NaN; };
const isMotionHover = (t) => t === 'hover' || t === 'press' || t === 'focus';

export const ELEMENT_CARD_CSS = `
  .ec { position: fixed; z-index: 4; width: ${WIDTH}px; max-height: calc(100vh - ${EDGE * 2}px); overflow: auto; overscroll-behavior: contain; box-sizing: border-box; pointer-events: auto;
    background: rgb(255 255 255 / .9); -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6); border-radius: 16px; color: #1c1b19;
    font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; --sky: #2f6bff; --coral: #e2533a; --ink-2: #55544f; --ink-3: #8b8a85; --wash: rgb(0 0 0 / .04);
    box-shadow: 0 0 0 .5px rgb(0 0 0 / .1), 0 1px 1px rgb(0 0 0 / .04), 0 10px 24px -10px rgb(0 0 0 / .18), 0 32px 64px -28px rgb(0 0 0 / .22), inset 0 1px 0 rgb(255 255 255 / .9);
    animation: ec-pop 280ms cubic-bezier(.2, .9, .25, 1.15) both; }
  .ec[hidden], .ec-caret[hidden], .ec-ring[hidden], .ec-strip[hidden] { display: none; }
  .ec[data-side="left"] { transform-origin: right center; } .ec[data-side="right"] { transform-origin: left center; } .ec[data-side="below"] { transform-origin: top left; } .ec[data-side="above"] { transform-origin: bottom left; }
  @keyframes ec-pop { from { opacity: 0; scale: .96; } }
  .ec button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; padding: 0; }
  .ec kbd { font: 500 10px/1 ui-monospace, monospace; padding: 2px 4px; border-radius: 4px; background: #fff; box-shadow: 0 0 0 .5px rgb(0 0 0 / .1); color: var(--ink-2); }
  .ec .hd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; padding: 12px 14px 8px; }
  /* the levels above it: a click (or ⌥↑) moves the card up */
  .ec .ups { flex-basis: 100%; display: flex; align-items: center; gap: 1px; min-width: 0; margin: -6px 0 -2px -5px; font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); white-space: nowrap; overflow: hidden; }
  .ec .ups .up { padding: 3px 5px; border-radius: 5px; color: var(--ink-3); max-width: 96px; overflow: hidden; text-overflow: ellipsis; transition: background 120ms, color 120ms; }
  @media (hover: hover) and (pointer: fine) { .ec .ups .up:hover { background: var(--wash); color: var(--ink-2); } }
  .ec .ups .up:focus-visible { outline: 1.5px solid var(--sky); outline-offset: -1px; }
  .ec .ups i { font-style: normal; opacity: .6; } .ec .ups kbd { margin-left: auto; }
  .ec .hd .n { font: 600 13px/1.2 ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ec .hd .n span { color: var(--ink-3); font-weight: 500; }
  .ec .hd .at { margin-left: auto; font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); white-space: nowrap; }
  .ec .reach { padding: 0 14px 8px; color: var(--ink-2); font-size: 12px; }
  .ec .down { padding: 4px 14px 14px; color: #c2304f; }
  .ec .fields { display: grid; gap: 6px; padding: 0 12px 10px; }
  .ec .ph { height: 32px; border-radius: 9px; background: var(--wash); }
  /* a field that drills into its own editor: the whole row is the button */
  .ec .drill { display: flex; align-items: center; gap: 7px; height: 32px; padding: 0 9px 0 4px; border-radius: 9px; background: var(--wash); text-align: left; outline: none;
    transition: background 120ms ease-out, box-shadow 120ms ease-out, scale 140ms cubic-bezier(.25, .46, .45, .94); }
  @media (hover: hover) and (pointer: fine) { .ec .drill:hover { background: rgb(0 0 0 / .065); } }
  .ec .drill:active { scale: .985; }
  .ec .drill:focus-visible, .ec .drill[data-at] { background: #fff; box-shadow: 0 0 0 1.5px var(--sky), 0 1px 2px rgb(0 0 0 / .06); }
  .ec .drill .ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; color: var(--ink-3); flex: none; }
  .ec .drill .ic svg { width: 14px; height: 14px; }
  .ec .drill .tile { width: 18px; height: 14px; border-radius: 4px; background: #fff; }
  .ec .drill .val { font-weight: 550; }
  .ec .drill .sub { margin-left: auto; min-width: 0; color: var(--ink-3); font: 500 11.5px/1 ui-monospace, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ec .drill .chev { color: var(--ink-3); margin-left: 4px; }
  .ec .drill[disabled] { cursor: default; color: var(--ink-3); } .ec .drill[disabled] .chev { visibility: hidden; }
  .ec .more { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px; border-top: .5px solid rgb(0 0 0 / .08); color: var(--ink-2); font-size: 12.5px; }
  .ec .more .show { margin-left: auto; height: 26px; padding: 0 9px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px; }
  .ec .more .show:hover { background: var(--wash); }
  /* a drill: back, the option in hand, its handles, what it writes */
  .ec .back { display: inline-flex; align-items: center; height: 24px; padding: 0 8px 0 4px; margin-left: -6px; border-radius: 7px; color: var(--ink-2); font-weight: 550; font-size: 12.5px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ec .back:hover { background: var(--wash); }
  .ec .title { font-weight: 600; }
  .ec .body[data-in="fwd"] { animation: ec-fwd 240ms ${EXPO} both; } .ec .body[data-in="back"] { animation: ec-back 240ms ${EXPO} both; }
  @keyframes ec-fwd { from { opacity: 0; transform: translateX(14px); } } @keyframes ec-back { from { opacity: 0; transform: translateX(-14px); } }
  .ec .sec { padding: 4px 12px 8px; }
  .ec .lab { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 4px 2px 6px; font: 600 10.5px/1 var(--pl-sans, system-ui); letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); }
  .ec .lab span { font: 500 11px/1.2 var(--pl-sans, system-ui); letter-spacing: 0; text-transform: none; text-align: right; }
  .ec .note { font-size: 11.5px; color: var(--ink-3); margin: 2px 2px 5px; }
  .ec .refuse { font-size: 12px; color: #b23a1e; margin: 2px; }
  .ec .src { margin: 6px 2px 0; font-size: 11px; color: var(--ink-3); }
  .ec .seg { display: flex; margin: 8px 0 0; padding: 2px; border-radius: 9px; background: var(--wash); }
  .ec .seg button { flex: 1; min-width: 0; height: 26px; padding: 0 6px; border-radius: 7px; font: 600 11.5px/1 var(--pl-sans, system-ui); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background 120ms, box-shadow 120ms, color 120ms; }
  .ec .seg button[aria-pressed="true"] { background: #fff; color: #1c1b19; box-shadow: 0 1px 2px rgb(0 0 0 / .1), 0 0 0 .5px rgb(0 0 0 / .06); }
  .ec .seg.tabs { margin: 0 12px 6px; }
  /* the light pad: a sun dragged around the element; its halo is the softness */
  .ec .pad { position: relative; margin: 2px 0 6px; border-radius: 12px; background: #eceae5; overflow: hidden; touch-action: none; }
  .ec .pad-lines { position: absolute; inset: 0; pointer-events: none; } .ec .pad-lines path { stroke: rgb(0 0 0 / .14); stroke-width: 1; stroke-dasharray: 2 3; fill: none; }
  .ec .pad-el { position: absolute; left: 50%; top: calc(50% + 18px); width: 104px; height: 54px; margin: -27px 0 0 -52px; border-radius: 12px; background: #fff; }
  .ec .sun { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff7d6, #f5b740); box-shadow: 0 0 0 2px #fff, 0 2px 6px rgb(0 0 0 / .25); cursor: grab; outline: none; transition: scale 140ms cubic-bezier(.2, .9, .25, 1.4); }
  .ec .sun:hover, .ec .sun:focus-visible { scale: 1.15; } .ec .sun[data-held] { cursor: grabbing; scale: 1.25; }
  .ec .halo { position: absolute; translate: -50% -50%; border-radius: 50%; background: radial-gradient(circle, rgb(255 214 120 / .45), rgb(255 214 120 / 0) 70%); box-shadow: inset 0 0 0 1px rgb(245 183 64 / .35); cursor: ew-resize; }
  .ec .pad-read { position: absolute; left: 10px; bottom: 7px; font: 500 10.5px/1 ui-monospace, monospace; color: var(--ink-3); }
  /* the curve: two handles, a top line (past it overshoots), the ghost trail; the time; the travel */
  .ec .curve { display: block; margin: 2px 0 6px; border-radius: 12px; background: var(--wash); touch-action: none; overflow: visible; }
  .ec .curve .ax { stroke: rgb(0 0 0 / .14); fill: none; } .ec .curve .top { stroke: rgb(0 0 0 / .1); stroke-dasharray: 2 3; fill: none; }
  .ec .curve .arm { stroke: rgb(47 107 255 / .45); stroke-width: 1.2; fill: none; } .ec .curve .cv { stroke: var(--sky); stroke-width: 2.4; fill: none; stroke-linecap: round; }
  .ec .curve .trail circle { fill: var(--sky); opacity: .35; }
  .ec .curve .hd { fill: #fff; stroke: var(--sky); stroke-width: 2; cursor: grab; transition: r 120ms; } .ec .curve .hd:hover { r: 7.5; }
  .ec .curve text { font: 500 10px ui-monospace, monospace; fill: var(--ink-3); }
  .ec .tl { position: relative; height: 34px; margin: 0 0 6px; border-radius: 9px; background: var(--wash); touch-action: none; }
  .ec .tl-bar { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9px; background: rgb(47 107 255 / .14); }
  .ec .tl-h { position: absolute; top: 4px; bottom: 4px; width: 4px; margin-left: -2px; border-radius: 2px; background: var(--sky); cursor: ew-resize; box-shadow: 0 0 0 3px #fff; }
  .ec .tl-ms { position: absolute; right: 8px; top: 7px; font: 600 11px/1 ui-monospace, monospace; }
  .ec .tl-ticks { position: absolute; left: 6px; right: 6px; bottom: 4px; display: flex; justify-content: space-between; font: 500 8.5px/1 ui-monospace, monospace; color: var(--ink-3); } .ec .tl-ticks i { font-style: normal; }
  .ec .travel { position: relative; height: 64px; margin: 0 0 4px; border-radius: 12px; background: #eceae5; touch-action: none; }
  .ec .tr-el, .ec .tr-ghost { position: absolute; left: 50%; top: 50%; width: 72px; height: 30px; margin: -15px 0 0 -36px; border-radius: 8px; }
  .ec .tr-el { background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / .08); }
  .ec .tr-ghost { border: 1.5px dashed var(--sky); background: rgb(47 107 255 / .06); cursor: ns-resize; box-sizing: border-box; }
  .ec .tr-read { position: absolute; left: 10px; bottom: 6px; font: 500 10.5px/1 ui-monospace, monospace; color: var(--ink-3); }
  /* Writes: the engine's own diff */
  .ec .edit { border-radius: 9px; background: #1c1b19; color: #e9e7e1; padding: 7px 0; margin-bottom: 5px; font: 500 10.5px/1.5 ui-monospace, monospace; overflow-x: auto; max-height: 180px; overflow-y: auto; }
  .ec .file { padding: 0 9px 4px; color: #a7a49c; display: flex; justify-content: space-between; gap: 8px; } .ec .file span { color: #75726b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ec .line { padding: 0 9px; white-space: pre; } .ec .line.add { background: rgb(26 158 98 / .18); color: #b7f0cf; } .ec .line.del { background: rgb(226 83 58 / .16); color: #f6c1b5; }
  .ec .acts { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px; border-top: .5px solid rgb(0 0 0 / .08); }
  .ec .use { height: 30px; padding: 0 12px; border-radius: 10px; background: #1c1b19; color: #fff; font-weight: 550; display: inline-flex; gap: 6px; align-items: center; transition: transform 140ms, opacity 140ms; }
  .ec .use:active { transform: scale(.97); } .ec .use[disabled] { opacity: .3; cursor: default; }
  .ec .use kbd { background: rgb(255 255 255 / .14); color: rgb(255 255 255 / .7); box-shadow: none; }
  .ec .play { height: 26px; padding: 0 8px; border-radius: 8px; color: var(--ink-2); font-weight: 550; display: inline-flex; gap: 5px; align-items: center; } .ec .play:hover { background: var(--wash); }
  .ec .grow { flex: 1; } .ec .hint { color: var(--ink-3); font-size: 11.5px; }
  /* the caret, on the element's middle; the element ringed, glowing while an option is tried on it */
  .ec-caret { position: fixed; z-index: 5; width: 12px; height: 12px; rotate: 45deg; background: rgb(255 255 255 / .96); border-radius: 2px; pointer-events: none; }
  .ec-caret[data-side="right"] { box-shadow: -.5px .5px 0 rgb(0 0 0 / .1); } .ec-caret[data-side="left"] { box-shadow: .5px -.5px 0 rgb(0 0 0 / .1); } .ec-caret[data-side="below"] { box-shadow: -.5px -.5px 0 rgb(0 0 0 / .1); }
  .ec-ring { position: fixed; z-index: 3; border-radius: 8px; box-shadow: 0 0 0 1.5px #2f6bff; pointer-events: none; transition: box-shadow 120ms ease-out; }
  .ec-ring[data-peek] { box-shadow: 0 0 0 1.5px #2f6bff, 0 0 0 5px rgb(47 107 255 / .14); }
  /* the strip: the element, once per option, on its own ground */
  .ec-strip { position: fixed; z-index: 4; box-sizing: border-box; display: flex; flex-direction: column; padding: 12px 0 10px; border-radius: 16px; pointer-events: auto; color: #1c1b19; font: 13px/1.35 var(--pl-sans, system-ui), sans-serif;
    box-shadow: 0 0 0 .5px rgb(0 0 0 / .08), 0 18px 40px -24px rgb(0 0 0 / .25); animation: ec-strip-in 260ms ${EXPO} both; --sky: #2f6bff; --ink-2: #55544f; --ink-3: #8b8a85; }
  @keyframes ec-strip-in { from { opacity: 0; transform: translateY(-6px); } }
  .ec-strip .head { display: grid; gap: 2px; padding: 0 20px 8px; } .ec-strip .head b { font-weight: 600; font-size: 13px; } .ec-strip .head span { color: var(--ink-3); font-size: 12px; }
  .ec-strip .reel { display: flex; gap: 14px; min-height: 0; padding: 10px 20px 6px; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .ec-strip[data-side="beside"] .reel { flex-direction: column; scroll-snap-type: y proximity; }
  .ec-strip[data-side="below"] .reel, .ec-strip[data-side="above"] .reel { scroll-snap-type: x proximity; }
  .ec-strip .shot { flex: none; display: grid; gap: 8px; justify-items: start; scroll-snap-align: start; padding: 0; border: 0; background: none; border-radius: 16px; text-align: left; font: inherit; color: inherit; cursor: pointer; }
  .ec-strip .frame { position: relative; display: block; padding: 18px 18px 26px; border-radius: 16px; transition: background 160ms ease-out, box-shadow 160ms ease-out; }
  @media (hover: hover) and (pointer: fine) { .ec-strip .shot:hover .frame { background: rgb(0 0 0 / .025); } }
  .ec-strip .shot[aria-current] .frame { box-shadow: inset 0 0 0 1.5px var(--sky); background: rgb(47 107 255 / .04); }
  .ec-strip .shot:focus-visible { outline: none; } .ec-strip .shot:focus-visible .frame { box-shadow: inset 0 0 0 2px var(--sky); }
  .ec-strip .cursor { position: absolute; left: 62%; top: 52%; width: 18px; height: 18px; opacity: 0; pointer-events: none; filter: drop-shadow(0 1px 1px rgb(0 0 0 / .25)); }
  .ec-strip .cap { display: flex; align-items: baseline; gap: 8px; padding: 0 18px; } .ec-strip .cap b { font-size: 12.5px; font-weight: 600; }
  .ec .v, .ec-strip .v { font: 600 9.5px/1 ui-monospace, monospace; font-style: normal; padding: 3px 6px; border-radius: 5px; white-space: nowrap; }
  .v.now, .v.yours { background: rgb(0 0 0 / .06); color: var(--ink-2); } .v.same { background: rgb(26 158 98 / .12); color: #137a4b; } .v.close { background: rgb(47 107 255 / .1); color: #2f5bd3; } .v.new { background: #fff3e8; color: #a8551b; } .v.need { background: #fde9e5; color: #b23a1e; }
  :host([data-holding]), :host([data-holding]) * { cursor: grabbing !important; }
  .ec-strip { overflow: hidden; } .ec-strip .reel { flex: 1 1 auto; }
  /* Tidy this card: the button at rest, the list of changes in the drill */
  .ec .tidy-go { display: flex; align-items: center; gap: 7px; width: calc(100% - 24px); margin: 0 12px 10px; height: 32px; padding: 0 10px; border-radius: 9px; background: rgb(47 107 255 / .08); color: #2f5bd3; font-weight: 600; outline: none; transition: background 120ms, box-shadow 120ms, scale 140ms; }
  @media (hover: hover) and (pointer: fine) { .ec .tidy-go:hover { background: rgb(47 107 255 / .13); } }
  .ec .tidy-go:active { scale: .985; } .ec .tidy-go[data-at], .ec .tidy-go:focus-visible { box-shadow: 0 0 0 1.5px var(--sky); }
  .ec .tidy-go svg { width: 14px; height: 14px; }
  .ec .tidy-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .ec .tidy-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 7px 8px; border-radius: 9px; background: var(--wash); }
  .ec .tidy-row .what { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; } .ec .tidy-row .what b { font-weight: 600; }
  .ec .tidy-row .ft { font: 500 11.5px/1.4 ui-monospace, monospace; white-space: nowrap; color: var(--sky); } .ec .tidy-row .ft i { font-style: normal; color: var(--ink-3); }
  .ec .tidy-row small { grid-column: 1 / -1; color: var(--ink-3); font-size: 11px; }
  .ec .lab .was { font-weight: 600; color: #b23a1e; }
  @media (prefers-reduced-motion: reduce) { .ec, .ec .body[data-in], .ec-strip { animation: none; } }
  /* one owner of the screen: while a card is open, Blueprint's pointing pills don't show over it or its bubble (N-11) */
  :host([data-card]) .bp .bp-hint { visibility: hidden; }
` + LAYOUT_CSS;

// one play of a motion: an entrance comes in; hover and press go to their state and back (a cursor arrives on a copy)
function play(el, css, cursor) {
  if (!el || !css || STILL()) return;
  const ms = msOf(css.transitionDuration) || 200, easing = css.transitionTimingFunction || 'ease';
  const rest = { transform: 'none', ...css.rest }, active = { transform: 'none', ...css.active };
  if (css.trigger === 'enter') { el.animate([rest, active], { duration: ms, easing, fill: 'none' }); return; }
  if (cursor) cursor.animate([{ transform: 'translate(70px, 46px)', opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.28 }, { transform: 'none', opacity: 1, offset: 0.72 }, { transform: 'translate(70px, 46px)', opacity: 0 }], { duration: 2000, easing: 'cubic-bezier(.4, 0, .2, 1)' });
  const at = cursor ? 560 : 0, hold = css.trigger === 'press' ? 140 : 620, total = ms * 2 + hold;
  // there and back, each half on the recipe's own curve
  el.animate([{ ...rest, offset: 0, easing }, { ...active, offset: ms / total }, { ...active, offset: (ms + hold) / total, easing }, { ...rest, offset: 1 }], { duration: total, delay: at });
}

export class ElementCard {
  #el; #caret; #ring; #strip; #host;
  #target = null; #at = null; #data = null; #state = 'off'; #error = null; #seq = 0; #stamp = null;
  #row = 0;             // at rest: the field in hand (↑ ↓)
  #view = null;         // null at rest, 'shadow' | 'motion' drilled in
  #dir = '';            // how the body came in: 'fwd' | 'back' | ''
  #tab = 'hover';       // motion: 'hover' (hover and press) | 'enter'
  #pick = null;         // the option in hand, by key ('y:rest', 'p:raised')
  #peek = null;         // the option pointed at in the strip
  #dials = {};          // the engine's dials: height, softness, light; speed, distance, startScale
  #ease = null;         // a dragged curve [x1, y1, x2, y2]
  #ms = null;           // a dragged duration
  #scope = 'one';       // shadow: 'one' (the default) | 'add' | 'move'
  #preview = null;      // the engine's answer for the option in hand as tuned, or { error }
  #pseq = 0; #asking = false; #again = false;
  #hand = null;         // a handle held: the card is moved in place, never redrawn
  #shown = new Map();   // prop → the inline value a preview replaced
  #loops = [];
  #writing = false; #wrong = null;
  #props = null;        // the element's props, read at its class site: that line's hash, and the spacing scale
  #site = null;         // where its classes are written: { file, line, column, hash, usage } or { refused }
  #spacing; #layout; #tidy; #plan = null;

  // root: the overlay's shadow root; host: { apply(at, body, said) → Promise<result>, said(text, undo), problems() → n,
  // show(), closed(), elsewhere(el) → n, dark() → bool, why(el) → Promise<words | null>, release() }
  constructor(root, host) {
    this.#host = host;
    this.#el = Object.assign(document.createElement('div'), { className: 'ec', hidden: true });
    this.#el.setAttribute('role', 'dialog');
    this.#caret = Object.assign(document.createElement('div'), { className: 'ec-caret', hidden: true });
    this.#ring = Object.assign(document.createElement('div'), { className: 'ec-ring', hidden: true });
    this.#strip = Object.assign(document.createElement('div'), { className: 'ec-strip', hidden: true });
    this.#strip.setAttribute('role', 'listbox');
    root.append(this.#ring, this.#strip, this.#el, this.#caret);
    const ours = (e) => e.composedPath().some((n) => n === this.#el || n === this.#strip || n.classList?.contains?.('fx') || n.classList?.contains?.('lay-line'));
    this.#spacing = new Spacing(root, {
      target: () => this.#target, name: (el) => el === this.#target ? this.name : componentOf(el) ?? el.localName,
      scale: () => this.#scale(), held: () => !!this.#hand, ours,
      // a spacing change is a step of its own; it serves proximity (inside < between ≤ around)
      write: (edits, said) => this.#classWrite(edits, said, { step: W.steps.spacing, laws: lawsOf('hierarchy/S1') ?? [] }),
      locked: (el) => (el === this.#target ? this.#site?.refused ?? null : null),
      mates: (el) => (el === this.#target && this.#site && !this.#site.refused ? this.#reach() : null),
      refused: (text) => { if (text === this.#site?.refused) return; this.#wrong = text; this.#draw(); },
      avoid: () => [this.#el, this.#strip].filter((n) => !n.hidden).map((n) => n.getBoundingClientRect()).concat(this.#host.bar?.() ?? []),
      release: () => this.#host.release?.(),
    });
    this.#tidy = new Tidy({ target: () => this.#target, props: () => this.#props, name: (el) => componentOf(el) ?? el.localName });
    // held Space shows a tidied card as it was (before the glass takes Space for the page: this listener is older)
    const space = (e) => {
      if (this.#view !== 'tidy' || e.code !== 'Space' || !this.#tidy.changes.length || e.composedPath()[0]?.matches?.('input, textarea, [contenteditable]')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type === 'keydown' && e.repeat) return;
      this.#tidy.hold(e.type === 'keydown'); this.#draw();
    };
    addEventListener('keydown', space, true); addEventListener('keyup', space, true);
    this.#layout = new Layout(root, {
      target: () => this.#target, redraw: () => this.#draw(), restrip: () => this.#stripDraw(),
    });
    this.#el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.classList.contains('show')) return this.#host.show?.();
      if (b.dataset.up) { let up = this.#target; for (let i = 0; i < +b.dataset.up && up; i++) up = up.parentElement; return up && this.#host.climb?.(up); }
      if (this.#view === 'layout' && this.#layout.click(b)) return;
      if (b.dataset.open) return this.#drill(b.dataset.open);
      if (b.classList.contains('back')) return this.#back();
      if (b.dataset.tab) return this.#setTab(b.dataset.tab);
      if (b.dataset.scope) { this.#scope = b.dataset.scope; this.#ask(); return this.#draw(); }
      if (b.classList.contains('use')) return this.#use();
      if (b.classList.contains('play')) return this.#playNow();
    });
    this.#el.addEventListener('pointerdown', (e) => this.#press(e));
    const lay = () => this.#view === 'layout';
    this.#strip.addEventListener('click', (e) => { const s = e.target.closest('.shot'); if (!s) return; if (lay()) { this.#layout.take(s.dataset.key); } else this.#take(s.dataset.key); });
    this.#strip.addEventListener('pointerover', (e) => { const s = e.target.closest('.shot'); if (!s || s.dataset.key === this.#peek) return; if (lay()) { this.#peek = s.dataset.key; this.#layout.peek(s.dataset.key); } else this.#peekAt(s.dataset.key); });
    // a strip laid out as a row scrolls sideways with an ordinary wheel too: every option can be reached by pointer
    this.#strip.addEventListener('wheel', (e) => {
      const reel = e.target.closest?.('.reel'); if (!reel || reel.scrollWidth <= reel.clientWidth + 1 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const by = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY, room = by > 0 ? reel.scrollWidth - reel.clientWidth - reel.scrollLeft : reel.scrollLeft;
      if (room <= 0) return;
      // one option a notch (the reel snaps to its options: a part of one would snap back)
      const shot = reel.querySelector('.shot'), step = shot ? shot.offsetWidth + (parseFloat(getComputedStyle(reel).columnGap) || 0) : Math.abs(by);
      e.preventDefault(); reel.scrollBy({ left: Math.sign(by) * step, behavior: 'instant' });
    }, { passive: false });
    this.#strip.addEventListener('pointerout', (e) => { const s = e.target.closest('.shot'); if (!s || s.contains(e.relatedTarget)) return; if (lay()) { this.#peek = null; this.#layout.unpeek(); } else this.#unpeekAt(); });
  }
  get open() { return !!this.#target; }
  // placed again (the fix bar it keeps clear of changed size)
  place() { if (this.#target) this.#place(); }
  get target() { return this.#target; }
  get name() { return this.#at?.chain?.[0]?.component ?? componentOf(this.#target) ?? this.#target?.localName ?? ''; }

  async edit(el) {
    this.#reset();
    this.#target = el; this.#at = null; this.#site = null; this.#data = null; this.#error = null; this.#row = 0;
    this.#state = 'loading';
    this.#el.hidden = false; this.#caret.hidden = false; this.#ring.hidden = false;
    this.#el.style.animation = 'none'; void this.#el.offsetWidth; this.#el.style.removeProperty('animation');
    addEventListener('scroll', this.#follow, { passive: true, capture: true });
    addEventListener('resize', this.#follow);
    this.#draw();
    this.#spacing.on();
    await this.#read();
  }
  close() {
    this.#spacing.off();
    this.#reset();
    this.#target = null; this.#state = 'off'; this.#data = null;
    this.#el.hidden = this.#caret.hidden = this.#ring.hidden = true; this.#el.innerHTML = '';
    removeEventListener('scroll', this.#follow, { capture: true });
    removeEventListener('resize', this.#follow);
  }
  #reset() {
    this.#hand?.cancel();
    this.#unshow(); this.#stripClose(); this.#layout.close(); this.#tidy.close(); this.#plan = null;
    this.#view = null; this.#pick = null; this.#peek = null; this.#preview = null; this.#dials = {}; this.#ease = this.#ms = null; this.#scope = 'one'; this.#wrong = null;
  }
  // a file was written or undone: the element is read again (a re-render may have replaced it)
  async changed() {
    if (!this.#target) return;
    if (!this.#target.isConnected) {
      // a re-render may still be under way: the element is looked for again for a moment before the card lets go
      let again = null;
      for (let i = 0; i < 8 && !again && this.#target; i++) {
        again = this.#stamp ? document.querySelector(atPlace(this.#stamp)) : null;
        if (!again) await new Promise((r) => setTimeout(r, 150));
      }
      if (!this.#target) return;
      if (!again) { this.close(); return this.#host.closed?.(); }
      this.#target = again;
    }
    await this.#read();
  }

  async #read() {
    const el = this.#target, seq = ++this.#seq;
    this.#stamp = placeOf(el);
    try {
      const at = this.#at ?? await locate(el);
      if (seq !== this.#seq) return;
      if (!at?.file) { const why = await this.#host.why?.(el).catch(() => null); if (seq !== this.#seq) return; this.#state = 'error'; this.#error = why ?? FIX.text.unreachable; return this.#draw(); }
      this.#at = at;
      // where its classes are written: read and written there (a file's hash changes with every write: read each time).
      // Right after a write the dev server is still taking the file in, and a read can come back empty: tried again
      // a few times before the card says it can't place the element
      let site = null, data = null, props = null;
      for (const wait of [0, 250, 500, 1000]) {
        if (wait) { await new Promise((r) => setTimeout(r, wait)); if (seq !== this.#seq) return; }
        site = await classSiteOf(el);
        if (seq !== this.#seq) return;
        if (!site) continue;
        const here = site.refused ? at : site, pos = { file: here.file, line: here.line, column: here.column };
        [data, props] = await Promise.all([site.refused ? null : request('recipes', { ...pos, ...(site.chain?.length ? { chain: JSON.stringify(site.chain) } : {}) }).catch(() => null), request('props', pos).catch(() => null)]);
        if (seq !== this.#seq) return;
        if (site.refused || data?.element) break;
      }
      if (!site) { this.#state = 'error'; this.#error = FIX.text.unreachable; return this.#draw(); }
      this.#site = site;
      this.#props = props;
      if (!site.refused && !data?.element) { this.#state = 'error'; this.#error = FIX.text.unreachable; return this.#draw(); }
      this.#data = data; this.#state = 'ready'; this.#error = null;
    } catch (error) {
      if (seq !== this.#seq) return;
      this.#state = 'error';
      this.#error = error?.starting || error?.failed ? error.message : FIX.text.down;
    }
    if (this.#view === 'layout') this.#layout.open();
    this.#draw();
    if (this.#view) { this.#stripDraw(); if (this.#pick) this.#ask(); }
  }
  // the spacing scale: 0, then the theme's spacing steps in px
  #scale() {
    const steps = this.#props?.props?.find((p) => p.key === 'padding')?.steps ?? [];
    const px = (v) => { const m = /^(-?[\d.]+)(px|rem)?$/.exec(String(v ?? '').trim()); return m ? +m[1] * (m[2] === 'rem' ? (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) : 1) : NaN; };
    const out = [{ px: 0, token: '0' }, ...steps.map((s) => ({ px: px(s.value), token: s.token })).filter((s) => Number.isFinite(s.px))];
    // one step per size: the project's own name for it (s4) over Tailwind's multiplier for the same px (4)
    const named = (t) => !/^[\d.]+$/.test(t);
    return out.sort((a, b) => a.px - b.px || named(b.token) - named(a.token)).filter((s, i, all) => !i || s.px !== all[i - 1].px);
  }
  get #locked() { return !!this.#site?.refused; }
  // a usage whose className the element was seen wearing (classSiteOf): the recipe engine may add a class there
  #forwards() { return this.#site?.usage && this.#site.prop === 'className' ? { forwards: true } : {}; }
  // what the recipes are asked with besides the place: the usages above it, as class-site was asked (a class passed in
  // is read, and written, there), and the hash of every file that reading saw (a write checks each one it touches)
  #reading() { const s = this.#site; return { ...(s?.chain?.length ? { chain: s.chain } : {}), ...(s?.hashes ? { hashes: s.hashes } : {}) }; }
  // the other elements drawn from its class site
  #reach() { return this.#site?.usage ? siteMates(this.#target, this.#site) : this.#host.elsewhere?.(this.#target) ?? 0; }
  // class changes (layout, spacing: [{ el, from, to }]) written where each element's classes are written, in one go
  // with one Undo, said in the fix panel: a swap on its own line, or the usage's className string rewritten (the classes
  // replaced where the first of them was). A change written nowhere is refused before anything is written.
  async #classWrite(edits, said, meta) {
    this.#wrong = null;
    // each change in the string its classes are written in (locate.js classEditsOf, the server's class site): a class
    // in a ternary's branch is changed in that branch, a class from a variable in the variable, an added class where the
    // server says; a change written nowhere is refused before anything is written
    const steps = [], seen = new Set();
    for (const e of edits) for (const { file, hash, edit } of await classEditsOf(e.el, e.from, e.to)) {
      const k = JSON.stringify([file, edit]); if (seen.has(k)) continue; seen.add(k);
      steps.push({ kind: 'swap', file, hash, ...edit });
    }
    const result = await this.#host.batch(steps, said, meta);
    this.#host.said?.(said, result?.undo ?? [], result?.group ?? null);
    return result;
  }

  // ── the options: the project's own first, then the pack's lined up against them ──
  #options(view = this.#view) {
    const d = this.#data; if (!d) return [];
    if (view === 'layout') return [];
    const mine = d.element?.shadow, kind = view === 'shadow' ? 'shadow' : 'motion';
    const fits = (r) => kind === 'shadow' || (this.#tab === 'enter' ? r.model?.trigger === 'enter' : isMotionHover(r.model?.trigger));
    const yours = d.yours.filter((r) => r.kind === kind && fits(r)).map((r) => {
      const now = kind === 'shadow' && mine?.source === 'class' && (mine.recipe === r.id || (mine.token && mine.token === r.token));
      return { key: `y:${r.id}`, from: 'yours', r, name: r.name, tag: now ? { cls: 'now', text: W.now } : { cls: 'yours', text: W.yours }, now };
    });
    const packs = d.packs.filter((p) => p.recipe.kind === kind && fits(p.recipe)).map(({ recipe: r, nearest, verdict }) => ({
      key: `p:${r.id}`, from: 'pack', r, name: r.name, verdict, nearest,
      tag: r.blocked ? { cls: 'need', text: W.needs } : verdict.kind === 'same' ? { cls: 'same', text: W.same(nearest?.name ?? '') } : verdict.kind === 'close' ? { cls: 'close', text: W.close(nearest?.name ?? '') } : { cls: 'new', text: W.fresh },
    }));
    return [...yours, ...packs];
  }
  #option(key = this.#pick) { return key ? this.#options().find((o) => o.key === key) ?? null : null; }
  #tuned() { return Object.keys(this.#dials).length > 0 || !!this.#ease || this.#ms !== null; }
  // the request for the option in hand as tuned: the same body previews and writes
  #body(o = this.#option()) {
    if (!o) return null;
    const recipe = o.from === 'yours' ? o.r.token ?? o.r.id : o.r.id;
    if (this.#view === 'shadow') {
      const tuned = this.#tuned(), body = { recipe };
      if (tuned) body.dials = { ...this.#dials };
      // reuse before adding: a close pack recipe uses yours unless asked to add it; a tuned one is new, or changes yours
      if (!tuned && o.from === 'pack' && o.verdict?.kind === 'close') body.choice = this.#scope === 'add' ? 'add' : 'use';
      else if (tuned) body.choice = o.from === 'yours' && this.#scope === 'move' ? 'move' : 'add';
      return body;
    }
    const dials = {};
    for (const k of ['distance', 'startScale']) if (this.#dials[k] !== undefined) dials[k] = this.#dials[k];
    if (this.#ease) {
      // a dragged curve: the model is sent whole, its time with it
      const t = o.r.model.timing, ms = this.#ms ?? (t.duration ?? (msOf(o.r.css.transitionDuration) || 200));
      // a curve shaped by hand is its own: added as a new easing, never matched to a near one of yours (an overshoot
      // would be written as the ease-in-out it was dragged from)
      return { model: { ...o.r.model, timing: { type: 'curve', duration: ms, easing: this.#ease } }, kind: 'motion', name: o.r.id, choice: 'add', ...(Object.keys(dials).length ? { dials } : {}) };
    }
    if (this.#ms !== null) dials.speed = r2((msOf(o.r.css.transitionDuration) || this.#ms) / this.#ms);
    return { recipe, ...(Object.keys(dials).length ? { dials } : {}) };
  }

  // ── the engine, asked again whenever the option in hand changes (one question at a time, the newest wins) ──
  #ask() {
    if (!this.#pick || !this.#site || this.#locked) return;
    this.#again = true;
    if (!this.#asking) this.#loop();
  }
  async #loop() {
    this.#asking = true;
    while (this.#again) {
      this.#again = false;
      const seq = ++this.#pseq, body = this.#body(), at = this.#site?.refused ? null : this.#site;
      if (!body || !at) break;
      let answer;
      try { answer = await post('recipes/preview', { file: at.file, line: at.line, column: at.column, ...body, ...this.#forwards(), ...this.#reading() }); }
      catch (error) { answer = { error: error?.message ?? String(error) }; }
      if (seq !== this.#pseq || !this.#target) continue;
      this.#preview = answer;
      this.#wear();
    }
    this.#asking = false;
    if (!this.#hand && this.#target) this.#draw();
  }
  // the option in hand as tuned, on the element, the pad and its copy (the card itself waits for the hand)
  #wear() {
    const css = this.#preview?.css;
    if (!css || this.#peek) return;
    if (this.#view === 'shadow' && css.boxShadow) {
      // the one it wears, as it is: the element is left alone (its own class draws it, exactly)
      if (this.#option()?.now && !this.#tuned()) this.#unshow();
      else this.#show({ 'box-shadow': css.boxShadow });
      const pe = this.#el.querySelector('.pad-el'); if (pe) pe.style.boxShadow = css.boxShadow;
      const copy = this.#strip.querySelector('.shot[aria-current] .copy'); if (copy) copy.style.boxShadow = css.boxShadow;
    }
    // the travel's ghost where the motion now goes
    const ghost = this.#view === 'motion' && this.#el.querySelector('[data-ghost]');
    if (ghost) ghost.style.transform = (css.trigger === 'enter' ? css.rest?.transform : css.active?.transform) ?? 'none';
  }

  // ── previews on the element: inline, put back exactly ──
  #show(props) {
    this.#unshow();
    for (const [prop, v] of Object.entries(props)) {
      this.#shown.set(prop, [this.#target.style.getPropertyValue(prop), this.#target.style.getPropertyPriority(prop)]);
      this.#target.style.setProperty(prop, String(v), 'important');
    }
    this.#ring.setAttribute('data-peek', '');
  }
  #unshow() {
    for (const [prop, [v, pr]] of this.#shown) { if (v) this.#target?.style.setProperty(prop, v, pr); else this.#target?.style.removeProperty(prop); }
    this.#shown.clear();
    this.#ring?.removeAttribute('data-peek');
  }
  #peekAt(key) {
    const o = this.#option(key); if (!o) return;
    this.#peek = key;
    if (this.#view === 'shadow') this.#show({ 'box-shadow': key === this.#pick && this.#preview?.css?.boxShadow ? this.#preview.css.boxShadow : o.r.css.boxShadow });
    else { this.#ring.setAttribute('data-peek', ''); play(this.#target, key === this.#pick ? this.#preview?.css ?? o.r.css : o.r.css); }
  }
  #unpeekAt() {
    if (!this.#peek) return;
    this.#peek = null;
    this.#unshow();
    this.#wear();
  }

  // ── drill in and out ──
  #drill(view) {
    if (this.#state !== 'ready' || this.#locked) return;
    // working on the element puts down a cause the fix panel holds: one thing in hand
    this.#host.release?.();
    this.#view = view; this.#dir = 'fwd'; this.#peek = null; this.#dials = {}; this.#ease = this.#ms = null; this.#scope = 'one'; this.#preview = null; this.#wrong = null;
    this.#pick = view === 'shadow' ? this.#options('shadow').find((o) => o.now)?.key ?? null : null;
    if (view === 'layout') this.#layout.open();
    if (view === 'tidy') this.#planTidy();
    this.#draw();
    this.#stripDraw();
    if (this.#pick) this.#ask();
  }
  #back() {
    this.#hand?.cancel();
    const was = this.#view;
    this.#view = null; this.#dir = 'back'; this.#pick = this.#peek = null; this.#preview = null; this.#wrong = null;
    this.#unshow(); this.#stripClose(); this.#layout.close(); this.#tidy.close(); this.#plan = null;
    this.#row = Math.max(0, this.#fieldsNow().indexOf(was));
    this.#draw();
  }
  #setTab(tab) {
    if (tab === this.#tab) return;
    this.#tab = tab; this.#pick = this.#peek = null; this.#preview = null; this.#dials = {}; this.#ease = this.#ms = null; this.#dir = '';
    this.#unshow(); this.#draw(); this.#stripDraw();
  }
  #take(key) {
    const o = this.#option(key); if (!o) return;
    this.#pick = key; this.#peek = null; this.#dials = {}; this.#ease = this.#ms = null; this.#scope = 'one'; this.#preview = null; this.#dir = ''; this.#wrong = null;
    this.#unshow();
    this.#draw(); this.#stripDraw();
    this.#ask();
    if (this.#view === 'motion') this.#playNow(o.r.css);
  }
  #playNow(css = this.#preview?.css ?? this.#option()?.r.css) {
    if (this.#view !== 'motion' || !css) return;
    play(this.#target, css);
    const shot = this.#strip.querySelector('.shot[aria-current]');
    if (shot) play(shot.querySelector('.copy'), css, shot.querySelector('.cursor'));
  }

  // ── the card ──
  #draw() {
    if (!this.#target || this.#hand) return;
    const el = this.#target, name = this.name, where = !this.#site ? null : this.#site.refused ? this.#at : this.#site;
    // the line said is the line written: the string its classes are in (N-03)
    const at = where ? `${where.file.split('/').pop()}:${where.at ?? where.line}` : '';
    const dark = this.#host.dark?.() ? 'dark' : 'light';
    this.#el.dataset.scheme = dark; this.#caret.dataset.scheme = dark;
    this.#el.setAttribute('aria-label', W.region(name));
    if (this.#view && this.#state === 'ready') { this.#el.innerHTML = this.#drillHtml(name, at); this.#dir = ''; this.#place(); return; }
    let body = '';
    if (this.#state === 'loading') body = '<div class="fields"><div class="ph"></div><div class="ph"></div></div>';
    else if (this.#state === 'error') body = `<div class="down" role="alert">${esc(this.#error)}</div>`;
    else if (this.#locked) {
      // nowhere a plain string: every field locked, the reason said once
      const lock = (k, title) => `<button type="button" class="drill" disabled aria-label="${esc(`${title}: ${W.setInCode}`)}"><span class="ic"></span><span class="val">${title}</span><span class="sub">${esc(W.setInCode)}</span><span class="chev">›</span></button>`;
      body = `<div class="fields" role="group">${lock('shadow', W.shadow)}${lock('motion', W.motion)}${this.#fieldsNow().includes('layout') ? lock('layout', W.layout) : ''}</div><div class="down" role="note">${esc(this.#site.refused)}</div>`;
    } else {
      const e = this.#data.element, s = e.shadow, m = e.motion;
      const shadowSub = s.source === 'class' ? s.class : s.source === 'dynamic' ? W.setInCode : W.none;
      const motionSub = m.source === 'none' ? W.none : W.triggers[m.trigger ?? m.model?.trigger] ?? W.setInCode;
      const cs = getComputedStyle(el).boxShadow;
      const tile = `<span class="ic"><span class="tile" style="box-shadow:${esc(cs && cs !== 'none' ? cs : 'inset 0 0 0 1px rgb(0 0 0 / .12)')}"></span></span>`;
      const fields = this.#fieldsNow(), at = (k) => fields[this.#row] === k ? ' data-at' : '';
      const drill = (k, lead, title, sub) => `<button type="button" class="drill" data-open="${k}" aria-label="${esc(`${title}: ${sub}`)}"${at(k)}>${lead}<span class="val">${title}</span><span class="sub">${esc(sub)}</span><span class="chev">›</span></button>`;
      body = `<div class="fields" role="group">${drill('shadow', tile, W.shadow, shadowSub)}${drill('motion', `<span class="ic">${ICON_MOTION}</span>`, W.motion, motionSub)}`
        + (fields.includes('layout') ? drill('layout', `<span class="ic">${ICON_LAYOUT}</span>`, W.layout, this.#layoutSub()) : '') + `</div>`
        + (fields.includes('tidy') ? `<button type="button" class="tidy-go" data-open="tidy"${at('tidy')}>${ICON_TIDY}${esc(W.tidy.button)}</button>` : '')
        + `<div class="keys" aria-label="${esc(W.spacing)}"><span><b>${esc(W.spacing)}</b> ${esc(W.spacingHint)}</span>${W.spacingKeys.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>`;
    }
    if (this.#wrong && this.#state === 'ready') body += `<div class="down" role="alert">${esc(this.#wrong)}</div>`;
    const reach = this.#state === 'ready' && !this.#locked ? this.#reach() : 0;
    const problems = this.#host.problems?.() ?? 0;
    this.#el.innerHTML = `<div class="hd">${this.#upsHtml()}<span class="n">${esc(name)}${name !== el.localName ? ` <span>· ${esc(el.localName)}</span>` : ''}</span><span class="at">${esc(at)}</span></div>`
      + (reach ? `<div class="reach">${esc(FIX.text.reach(reach))}</div>` : '')
      + `<div class="body"${this.#dir ? ` data-in="${this.#dir}"` : ''}>${body}</div>`
      + (problems ? `<div class="more"><span>${esc(FIX.text.problems(problems))}</span><button type="button" class="show">${FIX.text.show} <kbd>.</kbd></button></div>` : '');
    this.#dir = '';
    this.#place();
  }
  // the levels above the element, nearest last (up to three, never <body>), each a way up; ⌥↑ is the nearest
  #upsHtml() {
    const ups = [];
    for (let p = this.#target?.parentElement, i = 1; p && p !== document.body && p !== document.documentElement && i <= 3; p = p.parentElement, i++) ups.unshift([i, p]);
    if (!ups.length) return '';
    return `<div class="ups" role="group" aria-label="${esc(W.levels)}">${ups.map(([i, p]) => `<button type="button" class="up" data-up="${i}" title="${esc(i === 1 ? W.upOne : W.upTo(p.localName))}">${esc(componentOf(p) ?? p.localName)}</button><i aria-hidden="true">›</i>`).join('')}<kbd title="${esc(W.upOne)}">⌥↑</kbd></div>`;
  }
  // Layout ›: the mode and its controls, the spacing keys, then Writes: the class changes, line by line
  #layoutHtml(name, at) {
    const edits = this.#layout.edits();
    const writes = edits.length
      ? edits.map((e) => `<div class="edit"><div class="file">${esc(e.el === this.#target ? name : componentOf(e.el) ?? e.el.localName)}<span>${esc(e.el === this.#target ? at : e.rows > 1 ? W.mates(e.rows - 1) : e.el.localName)}</span></div>${e.from ? `<div class="line del">- ${esc(e.from)}</div>` : ''}<div class="line add">+ ${esc(e.to)}</div></div>`).join('')
      : `<div class="note">${esc(W.asWritten)}</div>`;
    return `<div class="hd"><button type="button" class="back" aria-label="${esc(`Back to ${name}`)}">‹ ${esc(name)}</button><span class="title">${W.layout}</span><span class="at">${esc(at)}</span></div>`
      + `<div class="body"${this.#dir ? ` data-in="${this.#dir}"` : ''}>${this.#layout.html()}<div class="sec writes"><div class="lab">${W.writes}</div>${writes}${this.#wrong ? `<div class="refuse" role="alert">${esc(this.#wrong)}</div>` : ''}</div></div>`
      + `<div class="acts"><button type="button" class="use"${edits.length && !this.#writing ? '' : ' disabled'}>${W.writeIt} <kbd>↵</kbd></button>${edits.length ? `<button type="button" class="putback">${W.putBack}</button>` : ''}<span class="grow"></span><span class="hint"><kbd>esc</kbd> ${W.back}</span></div>`;
  }
  // Tidy: every change, in words; where each is written is worked out as it opens (a change with nowhere to be written
  // is left alone, and said)
  #planTidy() {
    const changes = this.#tidy.open(), mine = (this.#plan = { reading: !!changes.length, steps: [], left: [] });
    if (!changes.length) return;
    this.#tidy.writes().then((p) => { if (this.#plan === mine) { Object.assign(mine, p, { reading: false }); this.#draw(); } },
      (error) => { if (this.#plan === mine) { mine.reading = false; mine.left = [error?.message ?? String(error)]; this.#draw(); } });
  }
  #tidyHtml(name, at) {
    const p = this.#plan, can = !!p && !p.reading && p.steps.length > 0 && !this.#writing;
    const left = (p?.left ?? []).map((t) => `<div class="note">${esc(t)}</div>`).join('');
    return `<div class="hd"><button type="button" class="back" aria-label="${esc(`Back to ${name}`)}">‹ ${esc(name)}</button><span class="title">${W.tidy.title}</span><span class="at">${esc(at)}</span></div>`
      + `<div class="body"${this.#dir ? ` data-in="${this.#dir}"` : ''}>${this.#tidy.html()}${left ? `<div class="sec">${left}</div>` : ''}${this.#wrong ? `<div class="sec"><div class="refuse" role="alert">${esc(this.#wrong)}</div></div>` : ''}</div>`
      + (this.#tidy.changes.length ? `<div class="acts"><button type="button" class="use"${can ? '' : ' disabled'}>${p?.reading ? W.reading : W.writeIt} <kbd>↵</kbd></button><span class="grow"></span><span class="hint"><kbd>esc</kbd> ${W.back}</span></div>` : `<div class="acts"><span class="grow"></span><span class="hint"><kbd>esc</kbd> ${W.back}</span></div>`);
  }
  async #useTidy() {
    const p = this.#plan;
    if (this.#writing || !p || p.reading || !p.steps.length) return;
    const said = W.tidy.tidied(this.name, this.#tidy.changes.length);
    this.#writing = true; this.#wrong = null; this.#draw();
    try {
      // one step, with the laws its changes serve (hierarchy.js gives each change its rule's laws)
      const result = await this.#host.batch(p.steps, said, { step: W.steps.tidy, laws: this.#tidy.changes.flatMap((c) => c.laws ?? []) });
      this.#writing = false;
      this.#back();
      this.#host.said?.(said, result?.undo ?? [], result?.group ?? null);
    } catch (error) {
      this.#writing = false;
      this.#wrong = error?.message ?? String(error);
      this.#draw();
    }
  }
  // the fields at rest: Layout only for an element with things inside it
  #fieldsNow() { return ['shadow', 'motion', ...(this.#target && [...this.#target.children].length ? ['layout'] : []), ...(this.#target && !this.#locked && Tidy.offered(this.#target) ? ['tidy'] : [])]; }
  #layoutSub() {
    const cs = getComputedStyle(this.#target);
    if (/grid/.test(cs.display)) return W.layoutNow('grid', W.nColumns(cs.gridTemplateColumns.split(' ').filter(Boolean).length));
    if (/flex/.test(cs.display)) return W.layoutNow('flex', cs.flexDirection.startsWith('column') ? W.stacked : W.sideBySide);
    return W.layoutNow('block');
  }
  #drillHtml(name, at) {
    if (this.#view === 'layout') return this.#layoutHtml(name, at);
    if (this.#view === 'tidy') return this.#tidyHtml(name, at);
    const shadow = this.#view === 'shadow', o = this.#option(), p = this.#preview;
    let body = '';
    if (!shadow) body += `<div class="seg tabs" role="group">${['hover', 'enter'].map((t) => `<button type="button" data-tab="${t}" aria-pressed="${this.#tab === t}">${esc(W.tabs[t])}</button>`).join('')}</div>`;
    if (!o) body += `<div class="sec"><div class="note">${esc(shadow ? W.pickShadow : W.pickMotion)}</div></div>`;
    else {
      const say = o.from === 'yours' ? W.yoursSay : o.verdict?.text ?? '';
      body += `<div class="sec"><div class="lab">${esc(o.name)}<span>${esc(say)}</span></div>${shadow ? this.#pad(o) : this.#motionHandles(o)}`;
      const tuned = this.#tuned();
      if (shadow && o.from === 'pack' && !tuned && o.verdict?.kind === 'close') body += `<div class="seg" role="group"><button type="button" data-scope="one" aria-pressed="${this.#scope !== 'add'}">${esc(W.useYours(o.nearest?.name ?? ''))}</button><button type="button" data-scope="add" aria-pressed="${this.#scope === 'add'}">${esc(W.addAnyway(o.name))}</button></div>`;
      if (shadow && o.from === 'yours' && tuned) body += `<div class="seg" role="group"><button type="button" data-scope="one" aria-pressed="${this.#scope !== 'move'}">${esc(W.addOne)}</button><button type="button" data-scope="move" aria-pressed="${this.#scope === 'move'}">${esc(W.everywhere)}</button></div>`;
      const src = o.r.source;
      if (src?.library) body += `<div class="src">${esc(W.from(src.library, src.licence))}</div>`;
      body += `</div><div class="sec writes"><div class="lab">${W.writes}</div>${this.#writesHtml(o, p)}</div>`;
    }
    const can = this.#canUse();
    return `<div class="hd"><button type="button" class="back" aria-label="${esc(`Back to ${name}`)}">‹ ${esc(name)}</button><span class="title">${shadow ? W.shadow : W.motion}</span><span class="at">${esc(at)}</span></div>`
      + `<div class="body"${this.#dir ? ` data-in="${this.#dir}"` : ''}>${body}</div>`
      + `<div class="acts"><button type="button" class="use"${can ? '' : ' disabled'}>${o ? W.writeIt : W.pickOne} <kbd>↵</kbd></button>${!shadow && o ? `<button type="button" class="play">${W.play} <kbd>R</kbd></button>` : ''}<span class="grow"></span><span class="hint"><kbd>esc</kbd> ${W.back}</span></div>`;
  }
  #writesHtml(o, p) {
    if (this.#wrong) return `<div class="refuse" role="alert">${esc(this.#wrong)}</div>`;
    if (o.r.blocked) return `<div class="refuse">${esc(W.blocked)}</div>`;
    if (!p) return `<div class="note">${esc(W.reading)}</div>`;
    if (p.error) return `<div class="refuse" role="alert">${esc(p.error)}</div>`;
    if (!p.ok) return `<div class="refuse">${esc(p.refused ?? '')}</div>`;
    // an exit written as data-[state=closed]: plays only when something sets that state, and nothing on the element does
    const exitIdle = (p.writes ?? []).some((w) => /data-\[state=closed\]:/.test(w.diff ?? '')) && !this.#target?.closest('[data-state]');
    const notes = [...(p.notes ?? []), ...(exitIdle ? [W.exitIdle] : [])].map((n) => `<div class="note">${esc(n)}</div>`).join('');
    if (!p.writes?.length) return `<div class="note">${esc(W.nothing(this.name, p.uses?.class ?? o.name))}</div>${notes}`;
    return p.writes.map((w) => `<div class="edit"><div class="file">${esc(w.file)}<span>${esc(w.role)}</span></div>${String(w.diff ?? '').split('\n').map((l) => `<div class="line ${l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : ''}">${esc(l)}</div>`).join('')}</div>`).join('') + notes;
  }
  #canUse() {
    const o = this.#option(), p = this.#preview;
    return !!o && !o.r.blocked && !this.#writing && !this.#wrong && !!p && !p.error && p.ok && (p.writes?.length ?? 0) > 0;
  }

  // the light pad: the sun at the light's angle, its reach the height; the halo the softness
  #padGeo() {
    const o = this.#option(), d = { light: this.#dials.light ?? o?.r.derived?.light ?? 0, height: this.#dials.height ?? 1, softness: this.#dials.softness ?? 1 };
    const cx = PAD.w / 2, oy = PAD.h / 2 + 18 - 38, th = (d.light * Math.PI) / 180, r = PAD.reach * d.height;
    return { d, cx, oy, sx: cx + Math.sin(th) * r, sy: oy - Math.cos(th) * r, halo: 10 + d.softness * 12 };
  }
  #pad(o) {
    const { d, cx, oy, sx, sy, halo } = this.#padGeo(), css = this.#preview?.css?.boxShadow ?? o.r.css.boxShadow;
    return `<div class="pad" data-pad style="width:${PAD.w}px;height:${PAD.h}px"><svg class="pad-lines" viewBox="0 0 ${PAD.w} ${PAD.h}"><path d="M${cx} ${oy}L${sx} ${sy}"/></svg>`
      + `<span class="pad-el" style="box-shadow:${esc(css)}"></span>`
      + `<span class="halo" data-halo style="left:${sx}px;top:${sy}px;width:${halo * 2}px;height:${halo * 2}px"></span>`
      + `<span class="sun" data-sun style="left:${sx}px;top:${sy}px" role="slider" tabindex="-1" aria-label="${esc(W.sun)}" aria-valuetext="${esc(W.light(Math.round(d.light), r2(d.height), r2(d.softness)))}"></span>`
      + `<span class="pad-read">${esc(W.light(Math.round(d.light), r2(d.height), r2(d.softness)))}</span></div>`;
  }
  // moved in place while the sun is held
  #padMove() {
    const pad = this.#el.querySelector('[data-pad]'); if (!pad) return;
    const { d, cx, oy, sx, sy, halo } = this.#padGeo();
    pad.querySelector('path').setAttribute('d', `M${cx} ${oy}L${sx} ${sy}`);
    Object.assign(pad.querySelector('.halo').style, { left: `${sx}px`, top: `${sy}px`, width: `${halo * 2}px`, height: `${halo * 2}px` });
    Object.assign(pad.querySelector('.sun').style, { left: `${sx}px`, top: `${sy}px` });
    pad.querySelector('.pad-read').textContent = W.light(Math.round(d.light), r2(d.height), r2(d.softness));
  }

  // the motion in hand: its curve, its time, its travel (as tuned)
  #motionNow(o) {
    const model = this.#preview?.recipe?.model ?? o.r.model, css = this.#preview?.css ?? o.r.css, t = model.timing;
    const ease = this.#ease ?? (t.type === 'curve' && Array.isArray(t.easing) ? t.easing : null);
    const ms = this.#ms ?? (msOf(css.transitionDuration) || 200);
    return { model, css, ease, ms };
  }
  #motionHandles(o) {
    const { model, css, ease, ms } = this.#motionNow(o);
    let html = '';
    if (ease) {
      const [x1, y1, x2, y2] = ease, X = (x) => CV.pad + x * (CV.w - CV.pad * 2), Y = (y) => CV.h - CV.pad - y * (CV.h - CV.pad * 2) * 0.78;
      const bez = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
      const dots = Array.from({ length: 11 }, (_, i) => { const t = i / 10; return `<circle cx="${X(bez(t, x1, x2))}" cy="${Y(bez(t, y1, y2))}" r="2"/>`; }).join('');
      html += `<svg class="curve" data-curve viewBox="0 0 ${CV.w} ${CV.h}" width="${CV.w}" height="${CV.h}" aria-hidden="true">`
        + `<path class="ax" d="M${X(0)} ${Y(0)}H${X(1)}M${X(0)} ${Y(0)}V${Y(1.28)}"/><path class="top" d="M${X(0)} ${Y(1)}H${X(1)}"/>`
        + `<path class="arm" d="M${X(0)} ${Y(0)}L${X(x1)} ${Y(y1)}M${X(1)} ${Y(1)}L${X(x2)} ${Y(y2)}"/>`
        + `<path class="cv" d="M${X(0)} ${Y(0)}C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}"/><g class="trail">${dots}</g>`
        + `<circle class="hd" data-h="1" cx="${X(x1)}" cy="${Y(y1)}" r="6"/><circle class="hd" data-h="2" cx="${X(x2)}" cy="${Y(y2)}" r="6"/>`
        + `<text x="${X(1)}" y="${Y(1) - 6}" text-anchor="end">${y2 > 1 || y1 > 1 ? W.overshoots : W.settles}</text></svg>`;
    } else html += `<div class="note">${esc(W.spring)}</div>`;
    const tl = Math.min(1, ms / LIMITS.ms[1]);
    html += `<div class="tl" data-tl><span class="tl-bar" style="width:${tl * 100}%"></span><span class="tl-h" data-tlh style="left:${tl * 100}%"></span><span class="tl-ms">${Math.round(ms)}ms</span><span class="tl-ticks"><i>0</i><i>200</i><i>400</i><i>600</i></span></div>`;
    const y = model.changes.find((c) => c.property === 'y' || c.property === 'x'), sc = model.changes.find((c) => c.property === 'scale');
    if (y || sc) {
      const tf = (model.trigger === 'enter' ? css.rest?.transform : css.active?.transform) ?? 'none';
      const to = model.trigger === 'enter' ? (y ? y.from : null) : y?.to, scale = sc ? (model.trigger === 'enter' ? sc.from : sc.to) : null;
      html += `<div class="travel" data-travel><span class="tr-el"></span><span class="tr-ghost" data-ghost style="transform:${esc(tf)}"></span><span class="tr-read">${[y ? W.moves(to) : '', sc ? W.scales(scale) : ''].filter(Boolean).join(' · ')}</span></div>`;
    }
    return html;
  }

  // ── handles: a press on a handle holds it; the card is moved in place, and drawn once on release ──
  #press(e) {
    if (e.button !== 0) return;
    const h = e.target.closest('[data-sun], [data-halo], [data-h], [data-tlh], [data-ghost]');
    const o = this.#option();
    if (!h || !o) return;
    e.preventDefault();
    const box = h.closest('[data-pad], [data-curve], [data-tl], [data-travel]').getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    const host = this.#el.getRootNode().host;
    const start = { ...this.#dials }, ease0 = this.#view === 'motion' ? this.#motionNow(o).ease : null, kept = { ease: this.#ease, ms: this.#ms };
    let onMove;
    if (h.dataset.sun !== undefined) {
      h.setAttribute('data-held', '');
      const { cx, oy } = this.#padGeo();
      onMove = (x, y) => { const dx = x - cx, dy = oy - y; this.#dials.light = clamp(Math.round((Math.atan2(dx, Math.max(1, dy)) * 180) / Math.PI), LIMITS.light); this.#dials.height = r2(clamp(Math.hypot(dx, dy) / PAD.reach, LIMITS.height)); this.#padMove(); };
    } else if (h.dataset.halo !== undefined) {
      onMove = (x, y, dx) => { this.#dials.softness = r2(clamp((start.softness ?? 1) + dx / 60, LIMITS.softness)); this.#padMove(); };
    } else if (h.dataset.h) {
      const i = h.dataset.h === '1' ? 0 : 2;
      onMove = (x, y) => { const e2 = [...(this.#ease ?? ease0)]; e2[i] = r2(clamp((x - CV.pad) / (CV.w - CV.pad * 2), [0, 1])); e2[i + 1] = r2(clamp((CV.h - CV.pad - y) / ((CV.h - CV.pad * 2) * 0.78), [-0.2, 1.5])); this.#ease = e2; this.#curveMove(); };
    } else if (h.dataset.tlh !== undefined) {
      onMove = (x) => { this.#ms = clamp(Math.round(((x / box.width) * LIMITS.ms[1]) / 10) * 10, LIMITS.ms); this.#timeMove(); };
    } else {
      const { model } = this.#motionNow(o), moves = model.changes.some((c) => c.property === 'y' || c.property === 'x');
      onMove = (x, y, dx, dy) => {
        if (moves) this.#dials.distance = r2(clamp((start.distance ?? 1) + -dy / Math.max(4, o.r.derived?.distance || 8), [0, 3]));
        else { const s0 = start.startScale ?? (o.r.derived?.startScale ?? 1); this.#dials.startScale = r2(clamp(s0 + dy / 400, [0.5, 1.2])); }
      };
    }
    host?.setAttribute('data-holding', '');
    const move = (ev) => { onMove(ev.clientX - box.left, ev.clientY - box.top, ev.clientX - x0, ev.clientY - y0); this.#ask(); };
    const end = (keep) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      host?.removeAttribute('data-holding'); h.removeAttribute('data-held');
      this.#hand = null;
      if (!keep) { this.#dials = start; this.#ease = kept.ease; this.#ms = kept.ms; this.#ask(); }
      this.#draw();
      if (this.#view === 'motion') this.#playNow();
    };
    const up = () => end(true);
    this.#hand = { cancel: () => end(false) };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }
  #curveMove() {
    const svg = this.#el.querySelector('[data-curve]'); if (!svg) return;
    const fresh = document.createElement('div'); fresh.innerHTML = this.#motionHandles(this.#option());
    const n = fresh.querySelector('[data-curve]'); if (n) svg.innerHTML = n.innerHTML;
  }
  #timeMove() {
    const tl = this.#el.querySelector('[data-tl]'); if (!tl) return;
    const f = Math.min(1, this.#ms / LIMITS.ms[1]);
    tl.querySelector('.tl-bar').style.width = `${f * 100}%`; tl.querySelector('.tl-h').style.left = `${f * 100}%`; tl.querySelector('.tl-ms').textContent = `${this.#ms}ms`;
  }

  // ── the strip: the element, once per option ──
  #stripDraw() {
    this.#stopLoops();
    if (!this.#view || this.#view === 'tidy' || this.#state !== 'ready') return this.#stripClose();
    const frozen = freeze(this.#target);
    this.#strip.style.background = groundOf(this.#target);
    if (this.#view === 'layout') {
      this.#strip.setAttribute('aria-label', W.layouts);
      this.#strip.innerHTML = `<div class="head"><b>${esc(W.layouts)}</b><span>${esc(W.layoutsHint)}</span></div><div class="reel"></div>`;
      // laid out from the element as written, not as previewed
      this.#layout.fill(this.#strip.querySelector('.reel'), frozen);
      return this.#stripShow();
    }
    const opts = this.#options(), cur = this.#pick;
    // the current one first, then yours, then the pack's
    opts.sort((a, b) => (b.key === cur) - (a.key === cur));
    const title = this.#view === 'shadow' ? W.strip.shadow : W.strip[this.#tab];
    this.#strip.setAttribute('aria-label', title);
    this.#strip.innerHTML = `<div class="head"><b>${esc(title)}</b><span>${esc(W.stripHint)}</span></div><div class="reel"></div>`;
    const reel = this.#strip.querySelector('.reel');
    for (const o of opts) {
      const shot = document.createElement('button');
      shot.type = 'button'; shot.className = 'shot'; shot.dataset.key = o.key; shot.setAttribute('role', 'option'); shot.setAttribute('aria-selected', String(o.key === cur));
      shot.setAttribute('aria-label', `${o.name}, ${o.tag.text}`);
      if (o.key === cur) shot.setAttribute('aria-current', 'true');
      const copy = fitCopy(frozen.cloneNode(true), this.#target); copy.classList.add('copy');
      const frame = document.createElement('span'); frame.className = 'frame'; frame.append(copy);
      if (this.#view === 'shadow') copy.style.boxShadow = o.key === cur && this.#preview?.css?.boxShadow ? this.#preview.css.boxShadow : o.r.css.boxShadow;
      else {
        const cursor = Object.assign(document.createElement('span'), { className: 'cursor', innerHTML: CURSOR });
        if (o.r.css.trigger !== 'enter') frame.append(cursor);
        if (!STILL()) { const loop = () => play(copy, o.key === cur ? this.#preview?.css ?? o.r.css : o.r.css, cursor); loop(); this.#loops.push(setInterval(loop, LOOP)); }
      }
      shot.append(frame);
      shot.insertAdjacentHTML('beforeend', `<span class="cap"><b>${esc(o.name)}</b><em class="v ${o.tag.cls}"${o.verdict?.text ? ` title="${esc(o.verdict.text)}"` : ''}>${esc(o.tag.text)}</em></span>`);
      reel.append(shot);
    }
    this.#stripShow();
  }
  #stripShow() {
    const fresh = this.#strip.hidden;
    this.#strip.hidden = false;
    if (fresh) { this.#strip.style.animation = 'none'; void this.#strip.offsetWidth; this.#strip.style.removeProperty('animation'); }
    this.#placeStrip();
  }
  #stopLoops() { for (const l of this.#loops) clearInterval(l); this.#loops = []; }
  #stripClose() { this.#stopLoops(); this.#strip.hidden = true; this.#strip.innerHTML = ''; }
  // Beside the card when there is room (a column, scrolling); else under the element, else above it (a row), never over
  // the card or the fix bar and never past the screen: with no room anywhere it takes the larger space and scrolls inside
  #placeStrip() {
    if (this.#strip.hidden || !this.#target?.isConnected) return;
    const t = this.#target.getBoundingClientRect(), c = this.#el.getBoundingClientRect(), bar = this.#host.bar?.(), side = this.#el.dataset.side;
    const st = this.#strip, s = st.style, MIN = 150, need = Math.min(t.width, 480) + 80;
    // the lowest a box spanning x0..x1 may reach: the fix bar's top when the bar is under it, else the screen's bottom
    const floor = (x0, x1) => (bar?.width && bar.left < x1 && bar.right > x0 ? Math.min(innerHeight - EDGE, bar.top - 12) : innerHeight - EDGE);
    // set, then kept clear of the bar and the card by the overlay's one rule (geometry.js clearOf): the bar can sit between
    // the element and the room above or below it
    const put = (where, x0, w, top, max) => {
      st.dataset.side = where; Object.assign(s, { left: `${x0}px`, top: `${Math.max(EDGE, top)}px`, width: `${w}px`, maxHeight: `${Math.max(60, Math.min(max, innerHeight - EDGE * 2))}px` });
      const r = st.getBoundingClientRect(), at = clearOf(r.left, r.top, r.width, r.height, [bar, c], { edge: EDGE });
      if (at.x !== r.left || at.y !== r.top) Object.assign(s, { left: `${at.x}px`, top: `${at.y}px` });
      if (where !== 'beside') st.dataset.side = at.y + r.height <= t.top + 0.5 ? 'above' : at.y >= t.bottom - 0.5 ? 'below' : where;
    };
    const right = innerWidth - c.right - 18 - EDGE, left = c.left - 18 - EDGE;
    if ((side !== 'left' && right >= need) || (side === 'left' && left >= need)) {
      const w = Math.min(side === 'left' ? left : right, need + 40), x0 = side === 'left' ? c.left - 18 - w : c.right + 18, top = Math.max(EDGE, c.top);
      if (floor(x0, x0 + w) - top >= MIN) return put('beside', x0, w, top, floor(x0, x0 + w) - top);
    }
    const beside = side === 'right' || side === 'left';
    const x0 = beside && side === 'left' ? c.right + 18 : EDGE, x1 = beside && side === 'right' ? c.left - 18 : innerWidth - EDGE, w = Math.max(200, Math.min(x1, innerWidth - EDGE) - x0);
    // its own height at this width, to know whether it fits
    st.dataset.side = 'below'; Object.assign(s, { width: `${w}px`, maxHeight: 'none' });
    const h = st.offsetHeight, low = floor(x0, x0 + w);
    const below = { top: (beside ? t.bottom : Math.max(t.bottom, c.bottom)) + 18 }, aboveBottom = (beside ? t.top : Math.min(t.top, c.top)) - 18;
    below.room = low - below.top;
    const aboveRoom = aboveBottom - EDGE;
    if (below.room >= Math.min(h, MIN)) return put('below', x0, w, below.top, below.room);
    if (aboveRoom >= Math.min(h, MIN)) { const hh = Math.min(h, aboveRoom); return put('above', x0, w, aboveBottom - hh, aboveRoom); }
    // no room either side: the larger space, scrolling inside
    if (below.room >= aboveRoom) { const top = Math.min(below.top, low - MIN); return put('below', x0, w, top, low - Math.max(EDGE, top)); }
    return put('above', x0, w, EDGE, aboveRoom);
  }

  // ── placement: texteditor.js's, unchanged ──
  #follow = () => { if (this.#target) requestAnimationFrame(() => { this.#place(); this.#layout.follow(); }); };
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
    // never over the fix bar (and off the element when it can be): moved the least it takes; its caret follows, or goes
    // when the card is no longer against the element's side
    const bar = this.#host.bar?.();
    let at = clearOf(left, top, WIDTH, h, [bar, t]);
    if (at.covered) at = clearOf(left, top, WIDTH, h, [bar]);
    const slid = at.x !== left;
    if (at.y !== top && side !== 'below' && side !== 'above') cy = Math.max(at.y + 14, Math.min(at.y + h - 26, mid - 6));
    else if (at.y !== top) cy += at.y - top;
    left = at.x; top = at.y;
    Object.assign(this.#el.style, { left: `${left}px`, top: `${top}px` });
    Object.assign(this.#caret.style, { left: `${cx}px`, top: `${cy}px` });
    this.#caret.style.display = slid || cy < top - 8 || cy > top + h ? 'none' : '';
    Object.assign(this.#ring.style, { left: `${t.left - 6}px`, top: `${t.top - 4}px`, width: `${t.width + 12}px`, height: `${t.height + 8}px` });
    this.#el.dataset.side = side; this.#caret.dataset.side = side === 'above' ? 'below' : side;
    const gone = t.bottom < 0 || t.top > innerHeight;
    this.#el.style.visibility = this.#caret.style.visibility = this.#ring.style.visibility = this.#strip.style.visibility = gone ? 'hidden' : '';
    this.#placeStrip();
  }

  // ── write: the request previewed, applied; said in the fix panel with Undo ──
  async #use() {
    if (this.#view === 'layout') return this.#useLayout();
    if (this.#view === 'tidy') return this.#useTidy();
    if (!this.#canUse()) return;
    const o = this.#option(), body = this.#body(o), name = this.name;
    const files = [...new Set(this.#preview.writes.map((w) => w.file.split('/').pop()))];
    const text = W.used(name, o.name, files);
    this.#writing = true; this.#draw();
    try {
      const s = this.#site, result = await this.#host.apply({ file: s.file, line: s.line, column: s.column, hash: this.#data.hash }, { ...body, ...this.#forwards(), ...this.#reading() }, text, { step: this.#view === 'shadow' ? W.steps.shadow : W.steps.motion, laws: [] });
      this.#writing = false;
      this.#back();
      this.#host.said?.(text, result?.undo ?? [], result?.group ?? null);
    } catch (error) {
      this.#writing = false;
      this.#wrong = error?.message ?? String(error);
      this.#draw();
    }
  }

  async #useLayout() {
    if (this.#writing || !this.#layout.edits().length) return;
    const s = this.#layout.state, said = W.laidOut(this.name, s.mode, s.sub);
    this.#writing = true; this.#wrong = null; this.#draw();
    try {
      const edits = this.#layout.writes();
      await this.#classWrite(edits, said, { step: W.steps.layout, laws: [] });
      this.#writing = false;
      this.#back();
    } catch (error) {
      this.#writing = false;
      this.#wrong = error?.message ?? String(error);
      this.#draw();
    }
  }

  // ── keys ──
  // at rest: ↑ ↓ the field, Enter (or →) opens it, Esc closes the card. In a drill: ↑ ↓ step through the options,
  // ← → turn the light (shadow) or change the time (motion), R plays, Enter writes, Esc goes back. '.' is the panel's.
  key(k) {
    if (!this.#target) return false;
    if (this.#hand) { if (k === 'Escape') this.#hand.cancel(); return true; }
    // a spacing change in hand on the element: Enter writes it, Esc puts it back
    if (this.#spacing.key(k)) return true;
    if (!this.#view) {
      const fields = this.#fieldsNow();
      if (k === 'ArrowUp' || k === 'ArrowDown') { this.#row = Math.max(0, Math.min(fields.length - 1, this.#row + (k === 'ArrowDown' ? 1 : -1))); this.#draw(); return true; }
      if ((k === 'Enter' || k === 'ArrowRight') && this.#state === 'ready') { this.#drill(fields[this.#row] ?? 'shadow'); return true; }
      if (k === 'Escape') { this.close(); this.#host.closed?.(); return true; }
      return false;
    }
    if (k === 'Escape') { this.#back(); return true; }
    if (k === 'Enter') { this.#use(); return true; }
    if (this.#view === 'layout' || this.#view === 'tidy') return k !== '.';
    if (k === 'r' || k === 'R') { this.#playNow(); return true; }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      const opts = this.#options(); if (!opts.length) return true;
      const i = opts.findIndex((o) => o.key === this.#pick);
      this.#take(opts[Math.max(0, Math.min(opts.length - 1, i < 0 ? 0 : i + (k === 'ArrowDown' ? 1 : -1)))].key);
      return true;
    }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && this.#option()) {
      const by = k === 'ArrowRight' ? 1 : -1;
      if (this.#view === 'shadow') this.#dials.light = clamp((this.#dials.light ?? this.#option().r.derived?.light ?? 0) + by * 3, LIMITS.light);
      else this.#ms = clamp(Math.round(this.#motionNow(this.#option()).ms / 10) * 10 + by * 10, LIMITS.ms);
      this.#ask(); this.#draw();
      return true;
    }
    return k !== '.';
  }
}

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD · Plumb overlay
 *
 *  idle        nothing listens but the Alt key
 *  Alt down    armed: the pointer reads the page; the reticle settles on the element under it
 *    90ms      the element is read; its tag hangs below it: "div · SyncRow · 6 off"
 *  click       pinned: the tag becomes the reading's header in place, the body fades up 4px into it
 *   120ms      the first mark's place lights on the real element
 *  pick a row  the element changes on the page at once (a preview), the mark turns on-system
 *  Write       edits go to source; the preview is lifted as the dev server reloads the real classes
 *  Esc         the reading closes; any unwritten preview is lifted
 *  starting    while Plumb reads the project for the first time, the tag and reading say so and ask again each second
 *  dock        bottom right, always: the mark and one line say what Plumb is doing; Select arms the reticle without Alt
 *    enter     fades up 4px over the card duration once the page has drawn
 *    starting  the mark breathes (opacity only); after 3s the line counts the seconds
 *    ready     "Plumb · Alt to inspect", said once to assistive tech; after 4s the line folds away, back on hover or focus
 *    select    Select pressed or Alt held: the mark takes the instrument colour and the line says how to leave
 *  reduced motion: every step is instant (durations come from tokens that collapse to 0)
 * ───────────────────────────────────────────────────────── */
const WALK = { step: 48, pause: 260 }; // px of scroll per level; ms of stillness that resets the travel
const TIMING = { hoverRead: 90, light: 120, swap: 140, reread: [250, 600, 1200, 2400], starting: 1000, maxDrawing: 160, healthStarting: 1000, healthReady: 10000, dockFold: 4000, dockCount: 3000, side: 3000 };

import { DOCK, TAG } from './words.js'; // the dock's and the hover tag's words
import { locate, componentOf } from './locate.js';
import { request, post, forgetResolved } from './api.js';
import { reading, offCount } from './model.js';
import { regionFor, outlineOf, childrenOf, groundIsDark, hostGround } from './geometry.js';
import { GLYPH_CSS, glyph } from './glyphs.js';
import { Blueprint, BLUEPRINT_CSS } from './blueprint.js';
import { Fixer, FIX_CSS, LIST_ICON } from './blueprint-fix.js';
import { Readiness, READY_CSS } from './readiness.js';
import { TextEditor, TEXT_EDIT_CSS } from './text-edit.js';
import { Help, HELP_CSS, HELP_ICON } from './help.js';
import { History, HISTORY_CSS, HISTORY_ICON } from './history.js';
import { Craft } from './craft.js';
import { setSource } from './craft-headless.js';
import { choicesHtml, bindChoices, whyLine, toPx, fmtPx, esc, code, VALUED, CHOICES_CSS } from './choices.js';

const tokensCss = await (await fetch(new URL('./tokens.css', import.meta.url))).text();
const RESUME = 'plumb:resume';

// One status line for a ready reading, shared by the hover tag and the pinned header.
function status(state, element) {
  const off = offCount(state);
  // nothing declared: a component styles it, its classes are built in code, or it has no style of its own at all
  const bare = element && !element.getAttribute?.('class') && !element.getAttribute?.('style');
  if (!state.marks.length && !state.declared) return { text: state.via === 'owner' ? TAG.styledBy(state.component ?? 'a component') : bare ? TAG.unstyled : TAG.computed, tone: 'quiet' };
  return off ? { text: TAG.off(off), tone: '' } : { text: TAG.clean, tone: 'ok' };
}

// Why an element has no source line, in the person's terms. Plumb never guesses one.
function unplaced(found) {
  const detail = found?.detail ?? {}, response = String(detail.response ?? '');
  if (found?.reason === 'resolve-refusal' && /not a tracked project source/.test(response)) {
    let file = String(detail.file ?? detail.source ?? '');
    if (!detail.file) try { file = decodeURIComponent(new URL(file, location.href).pathname).replace(/^\/@fs/, ''); } catch {}
    return { short: TAG.outside, message: `Written in \`${file}\`, outside this project's source. Add it to \`source\` to check it.` };
  }
  if (found?.reason === 'no-fiber') return { short: TAG.notReact, message: 'Not drawn by React, so it isn’t in your code.' };
  if (found?.reason === 'runtime-only-frames' || found?.reason === 'owner-unproven')
    return { short: TAG.library, message: 'A library drew this, and the line of your code that used it can’t be proven. Point at the component around it.' };
  if (found?.reason === 'map') return { short: TAG.noMap, message: 'Your dev server’s source map doesn’t point back to your code for this.' };
  return { short: TAG.notPlaced, message: 'Can’t reach this in your code.' };
}
// A structural path survives a reload of the same app state; ids and classes may not (the write changes classes).
const pathTo = element => {
  const parts = [];
  for (let n = element; n && n !== document.documentElement; n = n.parentElement) parts.unshift(`${n.localName}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
  return ['html', ...parts].join(' > ');
};
const css = `
  :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: var(--pl-z); font: var(--pl-text-row); color: var(--pl-ink); }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  code { font: var(--pl-text-reading); }

  /* the dock: what Plumb is doing, and Select, bottom right; text cross-fades, size snaps, nothing animates width */
  /* the dock never sits on the page's own controls: when something to press is under its corner it, and everything
     that rises from it (the punch list, the setup callout and card), moves to the other bottom corner (#side) */
  :host([data-side="start"]) :is(.dock, .pl, .rd, .rd-callout, .hp, .tip, .wt, .hl) { inset-inline-end: auto; inset-inline-start: var(--pl-space-6); }
  :host([data-side="center"]) .dock { inset-inline-end: auto; inset-inline-start: 50%; translate: -50% 0; }
  :host([data-side="start"]) .pl .card { transform-origin: 0 100%; }
  .dock { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: var(--pl-space-6); pointer-events: auto;
          display: flex; align-items: center; gap: var(--pl-space-3); height: var(--pl-tag-h); padding-inline: var(--pl-space-4) var(--pl-space-1);
          background: var(--pl-paper); color: var(--pl-ink-2); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-tag);
          font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); white-space: nowrap;
          transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); }
  .dock[data-enter] { opacity: 0; transform: translateY(4px); }
  .dock .bob { display: grid; place-items: center; width: 12px; height: 14px; color: var(--pl-ink-2); transition: color var(--pl-dur-feedback) var(--pl-ease-out); }
  .dock .bob svg { width: 12px; height: 14px; }
  .dock .say { transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .dock .say .count { font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-ink-3); }
  .dock[data-fold] .say { display: none; }
  @media (hover: hover) and (pointer: fine) { .dock[data-fold]:hover .say { display: inline; } }
  .dock[data-fold]:focus-within .say { display: inline; }
  .dock :is(.pick, .bp-toggle, .list, .help, .history) { all: unset; display: grid; place-items: center; width: 18px; height: 18px; border-radius: var(--pl-radius-tag); color: var(--pl-ink-2); cursor: pointer; }
  .dock :is(.pick, .bp-toggle, .list, .help, .history) svg { width: 12px; height: 12px; }
  .dock :is(.pick, .bp-toggle, .list, .help, .history):focus-visible { outline: 1px solid var(--pl-instrument); outline-offset: 1px; }
  @media (hover: hover) and (pointer: fine) { .dock :is(.pick, .bp-toggle, .list, .help, .history):not(:disabled):hover { color: var(--pl-ink); background: var(--pl-paper-2); } }
  .dock :is(.pick, .bp-toggle, .list, .help, .history)[aria-pressed="true"] { color: var(--pl-instrument); background: var(--pl-paper-2); }
  .dock :is(.pick, .bp-toggle, .list, .help, .history):disabled { color: var(--pl-ink-3); cursor: default; }
  .dock .act { all: unset; display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: var(--pl-radius-tag); font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-ink-2); cursor: pointer;
               transition: background var(--pl-dur-feedback), color var(--pl-dur-feedback); }
  .dock .act.write { color: var(--pl-on-action); background: var(--pl-action-soft); }
  @media (hover: hover) and (pointer: fine) { .dock .act.undo:not(:disabled):hover { color: var(--pl-ink); background: var(--pl-paper-2); } .dock .act.write:not(:disabled):hover { background: color-mix(in oklab, var(--pl-action-soft) 85%, var(--pl-action)); } }
  .dock .act:focus-visible { outline: 1px solid var(--pl-instrument); outline-offset: 1px; }
  .dock .act:disabled { opacity: .55; cursor: default; }
  .dock .act[aria-busy="true"]::before { content: ""; width: 9px; height: 9px; margin-inline-end: 5px; border-radius: 50%; border: 1.5px solid currentColor; border-right-color: transparent; animation: pl-spin .7s linear infinite; }
  .dock[data-refused] .say { color: var(--pl-off); }
  .dock[data-state="starting"] .bob { animation: pl-breathe 1.6s ease-in-out infinite; }
  .dock[data-state="select"] .bob { color: var(--pl-instrument); }
  .dock[data-state="failed"] .bob, .dock[data-state="failed"] .say { color: var(--pl-off); }
  .dock[data-state="lost"] { opacity: 0.72; }
  @keyframes pl-breathe { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .dock[data-state="starting"] .bob { animation: none; } }

  /* the reticle: four corner arms that travel to the element under the pointer */
  .tick { position: fixed; left: 0; top: 0; width: var(--pl-tick); height: var(--pl-tick); transition: transform var(--pl-dur-travel) var(--pl-spring); }
  .tick::before, .tick::after { content: ""; position: absolute; background: var(--pl-instrument); box-shadow: 0 0 0 1px var(--pl-halo); }
  .tick::before { width: var(--pl-tick); height: 1px; } .tick::after { width: 1px; height: var(--pl-tick); }

  /* the hover tag: what the pointer is on, before anything is pinned */
  .tag { position: fixed; left: 0; top: 0; height: var(--pl-tag-h); display: flex; align-items: center; gap: 6px; padding-inline: 8px; white-space: nowrap;
         background: var(--pl-paper); border-radius: var(--pl-radius-tag); box-shadow: var(--pl-shadow-tag); font: var(--pl-text-label);
         transition: transform var(--pl-dur-travel) var(--pl-spring), opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .tag .el, .top .el { font-weight: 600; color: var(--pl-ink); }
  .tag .who, .top .who { color: var(--pl-ink-2); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tag .n, .top .n, .top .el, .top .zoom, .top .close { flex: none; }
  .tag .n, .top .n { font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-off); }
  .n.ok { color: var(--pl-on); } .n.quiet { color: var(--pl-ink-2); }
  .tag .path { display: inline-flex; align-items: center; gap: 4px; color: var(--pl-ink-2); font-weight: 500; }
  .tag .path .here { color: var(--pl-ink); font-weight: 600; }
  .tag .path .cmp { color: var(--pl-accent); }
  .tag .path .sep, .tag .path .more { color: var(--pl-ink-3); }

  /* the lit place on the real element: hatching over exactly the region the active mark is about */
  .lit { position: fixed; left: 0; top: 0; border-radius: 2px; opacity: 0; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out);
         background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--pl-off) 55%, transparent) 0 1px, transparent 1px 4px); box-shadow: inset 0 0 0 1px var(--pl-off); }
  .lit.soft { background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--pl-soft) 55%, transparent) 0 1px, transparent 1px 4px); box-shadow: inset 0 0 0 1px var(--pl-soft); }
  .lit.ok { background: none; box-shadow: inset 0 0 0 1px var(--pl-on); }
  .lit.on { opacity: 1; }
  .lit.frame { background: none; }
  .lit.ring { background: none; border-radius: 50%; }

  /* ── the reading card ─────────────────────────────────────────────────────────────────────────────────────
     One job per region, top to bottom: which element (head), which findings (strip), the change and its choices
     (read), what happens next (status + foot). Blue is for actions; red, amber and green are verdicts, always with
     words. Spacing by relationship: 4 inside a group, 8 between parts, 12 between rows, 16 between sections. */
  .w { position: fixed; left: 0; top: 0; pointer-events: auto; }
  .card { background: var(--pl-paper); color: var(--pl-ink); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); overflow: clip;
          transform-origin: 24px 0; transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); }
  .w[data-state="opening"] .card { opacity: 0; transform: translateY(-4px) scale(.985); }
  .card:focus { outline: none; } /* the dialog takes focus so keys reach it; its controls show focus, the card does not */
  button { font: inherit; color: inherit; }
  .card :focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }

  /* head: one line, as before: the element, its count, where it's written, the drawing scale, close */
  .top { display: flex; align-items: center; gap: 6px; height: 32px; padding-inline: 12px 6px; border-bottom: 1px solid var(--pl-rule); font: var(--pl-text-label); white-space: nowrap; }
  .top .el { font-weight: 600; color: var(--pl-ink); }
  .top .file { all: unset; flex: 0 1 auto; min-width: 0; font: var(--pl-card-meta); color: var(--pl-ink-2); margin-inline-start: auto; padding-inline-start: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: copy; }
  @media (hover: hover) and (pointer: fine) { .top .file:hover { color: var(--pl-ink); } }
  .top .n.live { color: var(--pl-instrument); }
  .top .n.won { animation: pl-won 600ms var(--pl-ease-out); }
  @keyframes pl-won { 0% { transform: scale(.9); } 40% { transform: scale(1.1); } 100% { transform: scale(1); } }
  .top .zoom { display: flex; gap: 1px; margin-inline-start: 6px; }
  .top button.z { all: unset; font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-ink-2); padding: 0 4px; height: 18px; line-height: 18px; border-radius: 3px; cursor: pointer; }
  .top button.z[aria-pressed="true"] { color: var(--pl-instrument); background: var(--pl-paper-2); }
  .top button.z:disabled { color: var(--pl-ink-3); cursor: default; }
  .close { all: unset; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 5px; color: var(--pl-ink-2); cursor: pointer; }
  .close svg { width: 10px; height: 10px; }
  @media (hover: hover) and (pointer: fine) { .close:hover { background: var(--pl-paper-2); color: var(--pl-ink); } }

  /* the chain: where this element comes from, outermost usage first; the read link is marked */
  .chain { display: flex; align-items: center; gap: 2px; padding: 6px 12px 0; overflow-x: auto; scrollbar-width: none; overscroll-behavior: contain; }
  .chain .link { all: unset; flex: none; font: var(--pl-card-meta); color: var(--pl-ink-2); padding: 0 6px; height: 22px; line-height: 22px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
  .chain .link[aria-current="true"] { color: var(--pl-ink); background: var(--pl-paper-2); }
  @media (hover: hover) and (pointer: fine) { .chain .link:not([aria-current="true"]):hover { color: var(--pl-ink); } }
  .chain .sep { color: var(--pl-ink-3); font: var(--pl-card-meta); }

  /* the skeleton: the element at its real proportions, marks set into its outline */
  .diagram { position: relative; margin: 10px 12px 0; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }

  /* the words on the element: one row under the drawing */
  .txt { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 10px 12px 0; min-width: 0; }
  .txt[hidden] { display: none; }
  .txt .tk { flex: none; display: grid; place-items: center; width: 16px; height: 16px; border-radius: var(--pl-radius-tag);
             background: var(--pl-paper-2); color: var(--pl-ink-2); font: 600 10.5px/1 Georgia, serif; }
  .txt .run { all: unset; display: inline-flex; align-items: center; gap: 5px; min-width: 0; max-width: 100%; padding: 1px 6px; border-radius: var(--pl-radius-tag);
              font: var(--pl-text-reading); color: var(--pl-ink); box-shadow: inset 0 0 0 1px var(--pl-rule); cursor: text; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              transition: box-shadow var(--pl-dur-feedback) var(--pl-ease-out); }
  .txt .run:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
  @media (hover: hover) and (pointer: fine) { .txt .run:hover { box-shadow: inset 0 0 0 1px var(--pl-instrument); } }
  .txt .run .was { color: var(--pl-ink-2); text-decoration-thickness: 1px; }
  .txt .run .arrow { color: var(--pl-ink-2); }
  .txt .tr { font: var(--pl-text-label); color: var(--pl-ink-2); min-width: 0; }
  .txt .tr.hint { margin-inline-start: auto; }
  /* the editor laid over the words on the page: the page shows through, re-flowing as you type */
  .tedit { all: unset; position: fixed; box-sizing: border-box; pointer-events: auto; padding: 0 2px; color: transparent; caret-color: var(--pl-instrument);
           border-radius: 2px; outline: 1.5px dashed var(--pl-instrument); outline-offset: 2px; background: color-mix(in oklab, var(--pl-instrument) 6%, transparent); }
  .tedit::selection { background: color-mix(in oklab, var(--pl-instrument) 30%, transparent); color: transparent; }
  .diagram.swapping { opacity: 0; }
  .d-child { position: absolute; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink-3) 60%, transparent); }
  .d-child.text { box-shadow: none; }
  .d-child.filled { box-shadow: none; background: color-mix(in oklab, var(--fill) 30%, var(--pl-paper)); }
  .d-child, .d-part { font-style: normal; }
  .d-part { position: absolute; box-shadow: inset 0 0 0 1px var(--pl-ink-3); }
  .d-part.filled { box-shadow: none; background: color-mix(in oklab, var(--fill) 45%, var(--pl-paper)); }
  .d-child b { position: absolute; display: block; white-space: nowrap; overflow: hidden; font-family: var(--pl-sans); color: var(--pl-ink-2); pointer-events: none; }
  .dim { position: absolute; z-index: 1; translate: -50% -50%; padding: 0 3px; border-radius: 3px; font: 600 10px/14px var(--pl-mono); font-variant-numeric: tabular-nums;
         color: var(--pl-paper); background: var(--pl-off); opacity: 0; scale: .9; pointer-events: none; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), scale var(--pl-dur-feedback) var(--pl-ease-out); }
  .dim.left { translate: 0 -50%; } .dim.right { translate: -100% -50%; }
  .dim.soft { background: var(--pl-soft); } .dim.ok { background: var(--pl-on); } .dim.quiet { background: var(--pl-ink-2); }
  .dim[data-active] { opacity: 1; scale: 1; }
  .outline { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
  .outline path { fill: none; stroke: var(--pl-ink-2); stroke-opacity: .55; stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .outline .surface { fill: color-mix(in oklab, var(--fill) 30%, var(--pl-paper)); }
  .outline .surface.bare { fill: none; }
  /* every finding is hatched where it lives; the one being read is hatched strongly */
  .outline .reg { fill: url(#pl-h-off); opacity: .35; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .outline .reg.soft { fill: url(#pl-h-soft); } .outline .reg.ok { fill: url(#pl-h-ok); } .outline .reg.quiet { fill: url(#pl-h-quiet); }
  .outline .reg[data-active] { opacity: 1; }
  .pin { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border: 0; padding: 0; cursor: pointer; background: transparent; color: var(--pl-ink-2);
         display: grid; place-items: center; border-radius: 3px; transition: color var(--pl-dur-feedback) var(--pl-ease-out); }
  .pin .g { width: 13px; height: 13px; transform: var(--orient, none); }
  .pin.on-arc { background: var(--pl-paper); border-radius: 50%; }
  .pin.quiet { color: var(--pl-ink-3); }
  .pin[aria-current="true"] { color: var(--pl-off); }
  .pin.soft[aria-current="true"] { color: var(--pl-soft); }
  .pin.ok, .pin.ok[aria-current="true"] { color: var(--pl-on); }
  .pin:focus-visible { outline: 1px solid var(--pl-instrument); outline-offset: 1px; }
  @media (hover: hover) and (pointer: fine) { .pin:not([aria-current="true"]):hover { color: var(--pl-ink); } }

  /* read: the change first, then the choice, then the reason */
  .read { display: grid; gap: 8px; padding: 10px 12px 12px; align-content: start; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .read.swapping { opacity: 0; }
  .read .t { display: flex; align-items: flex-start; gap: 8px; font: 600 13px/18px var(--pl-sans); text-wrap: pretty; }
  .read .t > .g { flex: none; width: 14px; height: 14px; margin-top: 2px; color: var(--pl-off); }
  .read .t > .g.soft { color: var(--pl-soft); } .read .t > .g.ok { color: var(--pl-on); } .read .t > .g.quiet { color: var(--pl-ink-2); }
  .read .t code { font: var(--pl-card-code); font-size: 12.5px; }
  .read .t .title { flex: 1; min-width: 0; }
  .ledger { flex: none; margin-top: 1px; padding: 2px 6px; border-radius: 4px; font: var(--pl-text-label); letter-spacing: .04em; text-transform: uppercase; }
  .ledger.new { color: var(--pl-off); background: color-mix(in oklab, var(--pl-off) 10%, transparent); }
  .ledger.debt { color: var(--pl-ink-2); background: var(--pl-paper-2); }
  .ledger.exception { color: var(--pl-on); background: color-mix(in oklab, var(--pl-on) 10%, transparent); }

  /* the change: what is written → what it becomes */
  .change { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font: var(--pl-card-code); font-size: 12px; }
  .change .from { padding: 1px 6px; border-radius: 4px; color: var(--pl-off); background: color-mix(in oklab, var(--pl-off) 9%, transparent); text-decoration: line-through; text-decoration-thickness: 1px; overflow-wrap: anywhere; }
  .change .from.soft { color: var(--pl-soft); background: color-mix(in oklab, var(--pl-soft) 11%, transparent); }
  .change .arrow { color: var(--pl-ink-3); }
  .change .to { padding: 1px 6px; border-radius: 4px; color: var(--pl-on); background: color-mix(in oklab, var(--pl-on) 11%, transparent); animation: pl-in var(--pl-dur-move, 200ms) var(--pl-ease-out); }
  .change .to.waiting { color: var(--pl-ink-2); background: none; outline: 1px dashed var(--pl-ink-3); outline-offset: -1px; animation: pl-nudge 900ms var(--pl-ease-out) 700ms 1 both; }
  .change .delta { margin-inline-start: auto; font: var(--pl-card-meta); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; }
  @keyframes pl-in { from { opacity: 0; transform: translateX(-4px); } }
  @keyframes pl-nudge { 0%, 100% { outline-color: var(--pl-ink-3); } 45% { outline-color: var(--pl-instrument); color: var(--pl-instrument); } }

  /* the ask: what to do with the choices */
  .read .edit:empty { display: none; }
  .read .edit { display: flex; align-items: baseline; gap: 8px; font: var(--pl-text-label); letter-spacing: .02em; color: var(--pl-ink-2); }
  .read .edit .hint { flex: 1; text-transform: none; }
  .read .edit code { font: var(--pl-card-meta); color: var(--pl-ink); overflow-wrap: anywhere; }

  .read .because { font: 400 12px/17px var(--pl-sans); color: var(--pl-ink-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .read .empty { margin: 0; font: var(--pl-card-body); color: var(--pl-ink-2); }
  .read.short { padding-block: 14px; }

  .notes { margin: 0 12px 10px; display: grid; gap: 4px; }
  .notes p { margin: 0; font: var(--pl-card-body); font-size: 12px; color: var(--pl-ink-2); display: flex; gap: 8px; align-items: baseline; min-width: 0; }
  .notes p > * { min-width: 0; }
  .notes p::before { content: ""; flex: none; width: 4px; height: 4px; border-radius: 50%; background: var(--pl-ink-3); transform: translateY(-2px); }
  .notes code { font: var(--pl-card-meta); overflow-wrap: anywhere; }

  /* status: what happened, and what's left; then the foot, with one primary action */
  .synced { display: flex; align-items: center; gap: 8px; padding: 8px 12px 0; border-top: 1px solid var(--pl-rule); }
  .synced .state { font: var(--pl-card-body); font-size: 12px; color: var(--pl-ink-2); display: flex; align-items: center; gap: 8px; min-width: 0; }
  .synced .state::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .synced .state.live { color: var(--pl-instrument); } .synced .state.ok { color: var(--pl-on); } .synced .state.warn { color: var(--pl-soft); } .synced .state.err { color: var(--pl-off); }
  .foot { display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 8px; }
  .synced[hidden] + .foot { border-top: 1px solid var(--pl-rule); }
  .btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 0; border-radius: 6px; background: transparent; color: var(--pl-ink-2);
         font: 500 12.5px/1 var(--pl-sans); cursor: pointer; white-space: nowrap; transition: background var(--pl-dur-feedback), color var(--pl-dur-feedback), box-shadow var(--pl-dur-feedback); }
  @media (hover: hover) and (pointer: fine) { .btn.plain:not(:disabled):hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .btn[aria-pressed="true"] { background: var(--pl-ink); color: var(--pl-paper); }
  .btn:disabled { opacity: .4; cursor: default; }
  .btn.copy { margin-inline-start: auto; }
  .btn.primary { color: var(--pl-on-action); background: var(--pl-action-soft); box-shadow: 0 1px 0 rgb(0 0 0 / .08); }
  @media (hover: hover) and (pointer: fine) { .btn.primary:not(:disabled):hover { background: color-mix(in oklab, var(--pl-action-soft) 85%, var(--pl-action)); } }
  .btn.primary:active:not(:disabled) { transform: translateY(1px); }
  .btn.primary:disabled { opacity: 1; color: var(--pl-ink-2); background: transparent; box-shadow: inset 0 0 0 1px var(--pl-ink-3); cursor: default; }
  .btn.primary.done { color: var(--pl-on); background: color-mix(in oklab, var(--pl-on) 12%, transparent); box-shadow: none; }
  .btn[aria-busy="true"]::before { content: ""; width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid currentColor; border-right-color: transparent; animation: pl-spin .7s linear infinite; }
  @keyframes pl-spin { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) { .change .to, .change .to.waiting, .pill.won, .btn[aria-busy="true"]::before { animation: none; } .opt .check { transition: none; } }
`;

const ICON = {
  prev: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  next: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  bob: '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M6 .5v4" stroke="currentColor" stroke-width="1.2"/><path d="M6 4.5 9.25 8.75 6 13.5 2.75 8.75Z" fill="currentColor"/></svg>',
  pick: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="3.25" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M6 .5v2.25M6 9.25v2.25M.5 6h2.25M9.25 6h2.25" stroke="currentColor" stroke-width="1.2"/></svg>',
  check: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 2.9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  blueprint: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M1 4.5h10M1 7.5h10M4.5 1v10M7.5 1v10" stroke="currentColor" stroke-width="0.8" opacity="0.7"/></svg>',
  close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
};

class PlumbOverlay extends HTMLElement {
  #blueprint; #fixer; #bp = { state: 'off', progress: null }; #marksCache = new WeakMap(); #traces = new Map();
  #root; #cache = new WeakMap(); #armed = false; #sticky = false; #health = 'starting'; #healthTimer = 0; #foldTimer = 0; #startedAt = performance.now(); #readyAt = 0; #hover = null; #hoverTimer = 0; #pinned = null; #frame = 0; #focusBack = null; #decisions = null; #decisionsLoading = null; #scales = new Map(); #ready = null;

  connectedCallback() {
    addEventListener('plumb:updated', this.#updated);
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = `<style>${tokensCss}${GLYPH_CSS}${CHOICES_CSS}${css}${BLUEPRINT_CSS}${FIX_CSS}${READY_CSS}${TEXT_EDIT_CSS}${HELP_CSS}${HISTORY_CSS}</style>
      <i class="tick" data-c="tl" hidden></i><i class="tick" data-c="tr" hidden></i><i class="tick" data-c="bl" hidden></i><i class="tick" data-c="br" hidden></i>
      <div class="tag" hidden aria-hidden="true"></div>
      <i class="lit"></i>
      <section class="w" hidden></section>
      <div class="dock" role="toolbar" aria-label="React Plumber" data-state="starting" data-enter>
        <span class="bob">${ICON.bob}</span><span class="say" role="status" aria-live="polite"></span>
        <button class="act undo" type="button" hidden title="${DOCK.undoTitle}">${DOCK.undo}</button>
        <button class="act write" type="button" hidden></button>
        <button class="list" type="button" hidden aria-pressed="false" aria-label="${DOCK.list}" title="${DOCK.listTitle}">${LIST_ICON}</button>
        <button class="history" type="button" aria-pressed="false" aria-label="${DOCK.history}" title="${DOCK.historyTitle}">${HISTORY_ICON}</button>
        <button class="help" type="button" aria-pressed="false" aria-label="${DOCK.help}" title="${DOCK.helpTitle}">${HELP_ICON}</button>
        <button class="bp-toggle" type="button" aria-pressed="false" aria-label="Blueprint" title="${DOCK.blueprintTitle}">${ICON.blueprint}</button>
        <button class="pick" type="button" aria-pressed="false" aria-label="${DOCK.pick}" title="${DOCK.pickTitle}">${ICON.pick}</button>
      </div>
      <span class="announce" aria-live="polite" style="position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></span>`;
    this.#$('.pick').addEventListener('click', () => this.#armed && this.#sticky ? this.#disarm() : this.#arm(true));
    this.#blueprint = new Blueprint(this, this.#root, {
      onState: state => this.#blueprintState(state),
      // a page read through proves the server is ready: the dock says so now, not at the next health poll
      onProgress: progress => { this.#bp.progress = progress; if (progress.total && progress.read === progress.total && this.#health === 'starting') this.#health = 'ready'; this.#dock(); if (progress.total && progress.read === progress.total) this.#announce(this.#blueprintSays()); },
      // craft: the engine measures the theme's tokens from the same decisions the choosers use (asked for on first use)
      theme: { decisions: () => { if (!this.#decisions) this.#scaleOf('spacing'); return this.#decisions; } },
    });
    this.#$('.bp-toggle').addEventListener('click', () => this.#toggleBlueprint());
    this.#fixer = new Fixer(this, this.#root, { marks: this.#blueprint.marks, invalidate: change => this.#blueprint.invalidate(change), scale: family => this.#scaleOf(family) });
    this.#$('.dock .undo').addEventListener('click', () => this.#fixer.undo());
    this.#$('.dock .write').addEventListener('click', () => this.#fixer.write());
    this.#$('.dock .list').addEventListener('click', () => { this.#ready?.close(); this.#fixer.toggleList(); });
    // What this setup costs the person, and its fixes (docs/briefs/readiness.md); shares the punch list's place above the dock.
    // Every gesture, and a word the first time each mode is used.
    this.#help = new Help(this.#root, { button: this.#$('.dock .help') });
    // Every write, undoable: a toast after each one, and the recent ones from the dock.
    this.#history = new History(this.#root, { button: this.#$('.dock .history'), host: { announce: text => this.#announce(text), changed: () => this.#dock() } });
    // Words on the page, edited like a CMS: double-click, type, Enter (docs/briefs/text-editing.md).
    this.#text = new TextEditor(this.#root, { editing: (on, rect) => { if (on) this.#help.hint('words'); this.#blueprint?.editing(on, rect); }, wrote: (result, text) => this.#history.wrote(result, text), announce: text => this.#announce(text), changed: () => this.#dock(),
      inBlueprint: () => !!this.#blueprint?.active, blueprint: () => setTimeout(() => this.#blueprint?.enter({ instant: true }), 120) });
    this.#ready = new Readiness(this.#root, { dock: this.#$('.dock'), onOpen: () => { if (this.#fixer?.listOpen) this.#fixer.closeList(); this.changed?.(); } });
    requestAnimationFrame(() => requestAnimationFrame(() => this.#$('.dock').removeAttribute('data-enter')));
    this.#poll();
    // which bottom corner the dock takes: checked when the view or the route changes, and every few seconds, since a
    // page can render a control into the corner at any time
    addEventListener('resize', this.#sideSoon);
    addEventListener('hashchange', this.#sideSoon);
    addEventListener('popstate', this.#sideSoon);
    this.#sideTimer = setInterval(this.#side, TIMING.side);
    this.#sideSoon();
    addEventListener('keydown', this.#onKeyDown, true);
    addEventListener('keyup', this.#onKeyUp, true);
    addEventListener('blur', this.#disarm);
    addEventListener('dblclick', this.#onDblClick, true);
    addEventListener('pointerdown', this.#onDown, { capture: true, passive: true });
    this.#resume();
  }

  // A write can make the dev server reload the whole page (no fast refresh). The reading picks up where it was: the
  // same element, found by its place in the document and confirmed by its source file, with the write reported.
  async #resume() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); sessionStorage.removeItem(RESUME); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    await new Promise(r => setTimeout(r, 120)); // let the app render first
    if (saved.blueprint) this.#blueprint?.enter({ instant: true });
    if (saved.fix) { this.#blueprint?.resumed?.(saved.fix); return; }
    const element = document.querySelector(saved.path);
    if (!element) return;
    const location = await locate(element);
    if (location?.file !== saved.file || location.tag !== saved.tag) return;
    await this.pin(element);
    if (this.#pinned?.element === element && this.#pinned.state.status === 'ready') { this.#pinned.status = { kind: 'written', text: saved.text }; this.#updateSync(); }
  }

  disconnectedCallback() {
    removeEventListener('plumb:updated', this.#updated);
    this.#blueprint?.destroy();
    this.#ready?.destroy();
    this.#text?.destroy();
    this.close(); this.#disarm();
    removeEventListener('keydown', this.#onKeyDown, true);
    removeEventListener('keyup', this.#onKeyUp, true);
    removeEventListener('blur', this.#disarm);
    removeEventListener('dblclick', this.#onDblClick, true);
    removeEventListener('pointerdown', this.#onDown, { capture: true });
    clearTimeout(this.#healthTimer); clearTimeout(this.#foldTimer);
    removeEventListener('resize', this.#sideSoon);
    removeEventListener('hashchange', this.#sideSoon);
    removeEventListener('popstate', this.#sideSoon);
    clearInterval(this.#sideTimer); clearTimeout(this.#sideSoonTimer);
  }

  // Where along the bottom the dock sits: the end corner, unless the page has something to press under it; then the
  // start corner, then the middle, whichever has nothing to press under it, else whichever has least. Read only: a
  // 3×2 grid of points over the dock's box at each place, through the overlay.
  #sideTimer = 0; #sideSoonTimer = 0;
  #sideSoon = () => { clearTimeout(this.#sideSoonTimer); this.#sideSoonTimer = setTimeout(this.#side, 200); };
  #side = () => {
    const dock = this.#$('.dock');
    if (!dock?.isConnected) return;
    const r = dock.getBoundingClientRect(), inset = 16, pad = 4;
    if (!r.width) return;
    const press = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [role="tab"], [role="switch"], [contenteditable=""], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
    const hits = (left) => {
      let n = 0;
      for (const fx of [0, 0.5, 1]) for (const fy of [0, 1]) {
        const x = left - pad + (r.width + 2 * pad) * fx, y = innerHeight - inset - r.height - pad + (r.height + 2 * pad) * fy;
        const under = document.elementsFromPoint(Math.min(innerWidth - 1, Math.max(0, x)), Math.min(innerHeight - 1, Math.max(0, y))).find(e => !e.closest('plumb-overlay'));
        if (under?.closest(press)) n++;
      }
      return n;
    };
    const places = [[null, innerWidth - inset - r.width], ['start', inset], ['center', (innerWidth - r.width) / 2]].map(([side, left]) => [side, hits(left)]);
    const want = (places.find(([, n]) => n === 0) ?? places.reduce((best, p) => (p[1] < best[1] ? p : best)))[0];
    if (want !== this.getAttribute('data-side')) want ? this.setAttribute('data-side', want) : this.removeAttribute('data-side');
  };

  #toggleBlueprint(options) {
    this.#ready?.dismiss();
    this.#blueprint.toggle(options);
  }

  // What blueprint mode needs from the widget: Plumb's findings for an element (not the card's edits and text, and
  // never in the card's cache), the server's health, the pinned element, and where the card and dock sit.
  // how many times each stamped site was read: the tests prove a list's rows share one reading
  #readCounts = new Map();
  readsFor(stamp) { return this.#readCounts.get(stamp) ?? 0; }
  readMarks(element, fresh = false, { computed = true } = {}) {
    if (!fresh && this.#marksCache.has(element)) return this.#marksCache.get(element);
    const stamp = element.getAttribute?.('data-plumb-source')?.split('#')[0];
    if (stamp) this.#readCounts.set(stamp, this.#readCounts.get(stamp) + 1 || 1);
    const promise = (async () => {
      const found = await locate(element, { explain: true, batch: true });
      if (!found?.file) return { status: 'unplaced', outsideSource: found?.reason === 'resolve-refusal' && !!found.detail?.file, file: found?.detail?.file };
      this.#learnSource(element, found);
      return this.#readAt(found, element, { want: 'marks', computed, batch: true });
    })().catch(error => ({ status: error?.starting ? 'starting' : 'error' }));
    // an answer that still needs its classes traced is not the element's reading yet
    promise.then(state => { if (state?.computed && this.#marksCache.get(element) === promise) this.#marksCache.delete(element); });
    this.#marksCache.set(element, promise);
    promise.then(state => { if (state.status !== 'ready' && this.#marksCache.get(element) === promise) this.#marksCache.delete(element); });
    return promise;
  }
  // The whole page at once (blueprint-reader.js): every stamped element's reading from one POST page, the same reading
  // readMarks builds element by element. Elements that share a stamp and classes share one answer. An element whose
  // classes are passed in by the code that uses its component comes back `caller`: the reader reads it per element.
  async readPage(entries) {
    const keyOf = (e) => `${e.stamp}\0${e.tag}\0${e.classes ?? ''}`;
    const unique = new Map();
    for (const e of entries) if (!unique.has(keyOf(e))) unique.set(keyOf(e), { stamp: e.stamp, tag: e.tag, ...(e.classes ? { classes: e.classes } : {}) });
    let answer;
    try { answer = await post('page', { items: [...unique.values()] }); }
    catch (error) { throw error?.status === 503 ? Object.assign(error, { starting: true }) : error; }
    const keys = [...unique.keys()];
    const byKey = new Map(keys.map((key, i) => [key, answer?.items?.[i]]));
    return entries.map((e) => this.#pageState(e.el, byKey.get(keyOf(e))));
  }
  #pageState(element, entry) {
    if (!entry || entry.status !== 'ready') return { status: 'unplaced', outsideSource: entry?.outsideSource === true, file: entry?.file };
    const at = { file: entry.file, line: entry.line, column: entry.column, component: entry.component ?? null, ...(entry.usage ? { usage: true } : {}) };
    const location = { ...at, tag: element.localName, via: entry.usage ? 'stamp-usage' : 'stamp', chain: [at], index: 0, partial: !entry.usage };
    this.#learnSource(element, location);
    if (entry.traced?.classes) {
      const r = this.#computedReading(location, entry.traced);
      if (!r.traced.attributed && r.traced.unattributed) return { status: 'caller' };
      return { status: 'ready', ...r, perElement: true };
    }
    if (entry.traced?.status === 'pending') return { status: 'pending' };
    return { status: 'ready', ...reading(location, entry.site, undefined) };
  }
  // craft: what the source says about an element (its component, library, handlers), for the rules that judge by it
  // (touch handling, a tooltip provider's delays). Asked only for the elements those rules can judge; when answers
  // land, the page is judged again once.
  #sourced = new WeakSet(); #resourced = 0;
  #learnSource(element, found) {
    if (this.#sourced.has(element) || !Number.isFinite(found.line)) return;
    const candidate = element.matches?.('[role="button"], [data-state], [aria-haspopup]')
      || (!element.matches?.('button, a[href], input, select, textarea, summary, label, option') && getComputedStyle(element).cursor === 'pointer');
    if (!candidate) return;
    this.#sourced.add(element);
    request('structure', { file: found.file, line: found.line, column: found.column }).then((s) => {
      if (!s || s.error) return;
      setSource(element, s);
      clearTimeout(this.#resourced);
      this.#resourced = setTimeout(() => this.#blueprint?.themeChanged(), 120);
    }).catch(() => {});
  }
  get health() { return this.#health; }
  get blueprintReader() { return this.#blueprint; } // the headless craft run (craft-run.js)
  get progress() { return this.#bp.progress; }
  get pinnedElement() { return this.#pinned?.element ?? null; }
  occluders() {
    return [...['.w:not([hidden]) .card', '.dock'].map(sel => this.#root.querySelector(sel)).filter(Boolean).map(el => el.getBoundingClientRect()), ...[this.#blueprint?.panelRect?.()].filter(Boolean), ...(this.#fixer?.occluders() ?? []), ...(this.#help?.occluders() ?? []), ...(this.#history?.occluders() ?? []), ...[this.#ready?.rect()].filter(Boolean)];
  }
  // What the fixer needs: a mark opens its chooser; how a mark is drawn; the dock redrawn; caches dropped after a write.
  // a pin, a label or a panel row: with blueprint on, the element is selected and the fix is taken on it (select.js)
  choose(element, mark, id, options) { if (this.#blueprint?.active) return this.#blueprint.choose(element, mark, options?.group); return this.#fixer.open(element, mark, id, options); }
  fixState(element, mark) { return this.#fixer?.state(element, mark) ?? null; }
  changed() { this.#dock(); this.#blueprint?.refresh(); }
  wrote(result, text) { this.#history?.wrote(result, text); }
  ordered() { this.#fixer?.ordered(); }
  #updated = () => this.forget();
  forget() { this.#cache = new WeakMap(); this.#marksCache = new WeakMap(); this.#traces = new Map(); forgetResolved(); }
  announce(text) { this.#announce(text); }
  // A write can make the dev server reload the whole page: blueprint comes back on, with the write reported.
  remember(text) { try { sessionStorage.setItem(RESUME, JSON.stringify({ at: Date.now(), blueprint: true, fix: text })); } catch {} }
  forgetResume() { try { sessionStorage.removeItem(RESUME); } catch {} }

  #blueprintState(state) {
    if (state === 'refused') return this.#announce('Blueprint waits until React Plumber is running.');
    this.#bp.state = state;
    if (state === 'entering') this.#bp.progress = null;
    // blueprint is the person's own page, dimmed: the overlay's cards keep the scheme they have everywhere else
    if (state === 'on') this.#help?.hint('blueprint');
    const on = state === 'entering' || state === 'on';
    this.#$('.bp-toggle').setAttribute('aria-pressed', String(on));
    // the dock line stays quiet while readings arrive; the mode is announced once, and so is the count when it's in
    this.#$('.say').setAttribute('aria-live', on ? 'off' : 'polite');
    if (state === 'entering') this.#announce('Blueprint on. Reading this view.');
    if (state === 'leaving' || state === 'off') this.#fixer?.leave();
    if (state === 'off') this.#announce('Blueprint off.'), this.#tidyHtml(), requestAnimationFrame(() => this.#tidyHtml());
    this.#dock();
  }

  #announced = '';
  #announce(text) {
    if (text === this.#announced) return;
    this.#announced = text;
    const live = this.#$('.announce');
    if (live) live.textContent = text;
  }

  // ── the dock: what Plumb is doing ─────────────────────────
  // Health never queues behind reads, so asking is cheap: every second while starting or unreachable, then every ten.
  async #poll() {
    let next = this.#health;
    try { const h = await request('health', {}); next = h?.status === 'ready' ? 'ready' : h?.status === 'failed' ? 'failed' : 'starting'; this.#reason = h?.diagnostic ?? h?.error ?? ''; }
    catch (error) { next = error?.failed ? 'failed' : error?.starting ? 'starting' : 'lost'; this.#reason = error?.message ?? ''; }
    if (!this.isConnected) return;
    if (next !== this.#health) this.#blueprint?.healthChanged(next);
    if (next === 'ready' && this.#health !== 'ready') this.#ready?.read();
    this.#health = next; this.#dock();
    this.#healthTimer = setTimeout(() => this.#poll(), next === 'ready' || next === 'failed' ? TIMING.healthReady : TIMING.healthStarting);
  }
  #reason = '';
  #blueprintSays() {
    const p = this.#bp.progress, f = this.#fixer, status = f?.status;
    if (status) return esc(status.text);
    // the fix bar has the count while Blueprint is on: one number, one place
    if (!f?.count) return DOCK.blueprint;
    if (!p || !p.total) return DOCK.checking;
    const unchecked = p.notChecked ? `${p.notChecked} not checked${p.outsideSource ? ' · outside source' : ''}` : '';
    const problems = (n) => `${n} problem${n === 1 ? '' : 's'}`;
    const count = [p.drift ? `${problems(p.drift)} in view` : !p.notChecked ? 'nothing to fix in view' : '', unchecked].filter(Boolean).join(' · ');
    if (f?.count) return `${p.drift ? problems(p.drift) : p.notChecked ? unchecked : 'nothing to fix'} · ${f.count} picked${f.before ? ' · before' : ''}${p.drift && p.notChecked ? ` · ${unchecked}` : ''}`;
    return `${count} · Alt+B`;
  }
  #dock() {
    const dock = this.#$('.dock'); if (!dock) return;
    // how many problems the view holds once it is read: not said (the fix bar has the count), but kept on the dock for
    // scripts and tests that watch the reader read the view first
    const p = this.#blueprint?.active ? this.#bp.progress : null;
    if (p?.total && p.read === p.total) dock.dataset.inView = String(p.drift ?? 0); else delete dock.dataset.inView;
    const say = dock.querySelector('.say'), pick = dock.querySelector('.pick');
    const selecting = this.#armed && this.#health !== 'failed';
    const state = selecting ? 'select' : this.#health;
    const seconds = Math.round((performance.now() - this.#startedAt) / 1000);
    const text = {
      select: DOCK.select,
      starting: `${DOCK.starting}${performance.now() - this.#startedAt > TIMING.dockCount ? ` <span class="count">${seconds}s</span>` : ''}`,
      failed: DOCK.failed,
      lost: 'Reconnecting…',
      ready: this.#pinned?.state?.file ? `<code>${esc(this.#pinned.state.file.split('/').pop())}:${this.#pinned.state.line}</code>` : this.#blueprint?.active ? this.#blueprintSays() : DOCK.idle,
    }[state];
    if (dock.dataset.state !== state || say.innerHTML !== text) { dock.dataset.state = state; say.innerHTML = text; }
    const f = this.#fixer, fs = f?.status;
    dock.title = state === 'failed' ? this.#reason : fs?.title ?? '';
    dock.toggleAttribute('data-refused', !!fs && (fs.kind === 'refused' || fs.kind === 'error'));
    // Undo and Write ride on the dock while the blueprint has picks: the queue spans the view, the dock is always there.
    const undo = dock.querySelector('.undo'), write = dock.querySelector('.write');
    const bp = state === 'ready' && this.#blueprint?.active && !this.#pinned;
    const list = dock.querySelector('.list');
    // one panel: the fix bar steps through every fix, so the old list is not offered (docs: one-surface overlay)
    list.hidden = true;
    list.setAttribute('aria-pressed', String(!!f?.listOpen));
    const writable = f?.edits() ?? 0, writing = fs?.kind === 'writing';
    undo.hidden = !(bp && f.count);
    undo.disabled = writing;
    write.hidden = !(bp && (writable || writing || f.stale));
    write.disabled = writing;
    write.setAttribute('aria-busy', String(writing));
    write.textContent = writing ? DOCK.applying : f?.stale ? DOCK.checkAgain : DOCK.apply(writable);
    pick.disabled = state === 'failed' || state === 'lost';
    pick.setAttribute('aria-pressed', String(selecting));
    // Ready is said once, then the line folds away so the dock stays small; hover or focus brings it back. A pinned
    // reading keeps its file on show.
    if (state === 'ready' && !this.#readyAt) { this.#readyAt = performance.now(); this.#foldTimer = setTimeout(() => this.#dock(), TIMING.dockFold); }
    dock.toggleAttribute('data-fold', state === 'ready' && !this.#pinned && !this.#blueprint?.active && performance.now() - this.#readyAt >= TIMING.dockFold);
    if (state === 'starting') { clearTimeout(this.#countTimer); this.#countTimer = setTimeout(() => this.#dock(), 1000); }
  }
  #countTimer = 0;

  // ── reading an element ────────────────────────────────────
  // One read per element until something is written; the hover tag and the pinned reading share it.
  #craft = null;
  #craftFor(element, marks) {
    this.#craft ??= new Craft({ theme: { decisions: () => { if (!this.#decisions) this.#scaleOf('spacing'); return this.#decisions; } } });
    const [item] = this.#craft.enrich([{ el: element, marks: marks ?? [] }]);
    return item?.marks ?? marks;
  }
  read(element, fresh = false, signal) {
    if (!signal && !fresh && this.#cache.has(element)) return this.#cache.get(element);
    const promise = (async () => {
      const found = await locate(element, { explain: true, signal });
      if (!found?.file) return { status: 'unplaced', tag: element.localName, ...unplaced(found) };
      const state = await this.#readAt(found, element);
      // craft: the mentor's rules read on the element itself join its reading, so the Alt card shows them too. They
      // carry their suggestion in words here; picking and writing one is the blueprint chooser's (POST swap)
      if (state?.status === 'ready') state.marks = this.#craftFor(element, state.marks);
      return state;
    })().catch(error => error?.starting
      ? { status: 'starting', tag: element.localName, message: 'React Plumber is still reading your project…' }
      : error?.failed ? { status: 'error', tag: element.localName, short: 'React Plumber couldn’t start', message: `React Plumber couldn’t start: ${error.message}` }
      : { status: 'error', tag: element.localName, message: error?.message ?? "React Plumber isn't answering." });
    // A pin must not inherit cancellation from an in-flight hover reading.
    if (!signal) this.#cache.set(element, promise);
    // Only a reading is worth keeping. A refusal can be transient (a dev server still pre-bundling, a map mid-reload),
    // so anything else is asked again on the next hover instead of sticking to the element.
    promise.then(state => { if (state.status !== 'ready' && this.#cache.get(element) === promise) this.#cache.delete(element); });
    return promise;
  }

  // The reading of one link in the chain: the JSX at that position, its declarations, findings and edits.
  async #readAt(location, element = this.#pinned?.element, { want = 'full', computed = true, batch = false } = {}) {
    const params = { file: location.file, line: location.line, column: location.column };
    // Its text is read alongside: which runs are plain literals Plumb can write, or why it can't (an older server
    // without the endpoint answers nothing, and the card simply has no text row). Blueprint mode wants the findings
    // only; the edits and text are fetched when a reading is opened.
    const marksOnly = want === 'marks';
    const [site, edits, text] = await Promise.all([request('site', params, { batch }), marksOnly ? null : request('edits', params), marksOnly ? null : request('text', params).catch(() => null)]);
    if (!site) return { status: 'error', tag: location.tag, location, message: "React Plumber couldn't read this element." };
    const rendered = element?.getAttribute('class')?.trim();
    // Nothing written here, but the element has classes: they are built in code. Read them where they are written.
    if (!site.declarations.length && rendered) {
      // Blueprint's first pass does not wait for a trace: it says so, and the reader comes back for it.
      if (!computed) return { status: 'ready', ...reading(location, site, edits), computed: true, text };
      // The server answers 'pending' while it is still reading the modules a class helper lives in; ask again.
      // One trace per JSX line and class list: a list's rows (every Link from one line) share it, in flight too
      const key = `${params.file}:${params.line}:${params.column}:${rendered}`;
      let trace = this.#traces.get(key);
      if (!trace) {
        trace = (async () => {
          let out = null;
          for (let attempt = 0; attempt < 12; attempt++) {
            out = await request('classes', { ...params, classes: rendered }).catch(() => null);
            if (out?.status !== 'pending') break;
            await new Promise(r => setTimeout(r, 250));
          }
          return out;
        })();
        this.#traces.set(key, trace);
        trace.then((out) => { if (!out?.classes) this.#traces.delete(key); });
      }
      const traced = await trace;
      if (traced?.classes) {
        const r = this.#computedReading(location, traced);
        // Nothing is written at this level: every class is passed in by the code that uses the component (a Link, a
        // Button wrapper). That code is where they are written and where a fix lands, so its level is the reading,
        // as Alt+↑ would read it.
        if (!r.traced.attributed && r.traced.unattributed && element) {
          const full = location.chain?.length > 1 ? location : await locate(element, { chain: true, batch }).catch(() => null);
          // the chain couldn't be read yet (a cold source map): not "nothing here", so the reader asks again later
          if (!full?.chain) return { status: 'pending', tag: location.tag, message: 'Still finding where this is written.' };
          const at = full.chain.findIndex(link => link.file === location.file && link.line === location.line && link.column === location.column);
          const up = at >= 0 ? full.chain[at + 1] : null;
          if (up) {
            const caller = await this.#readAt({ ...up, tag: location.tag, via: location.via, chain: full.chain, index: at + 1 }, element, { want, computed, batch });
            // the caller's reading is this element's alone: two Links share their component's stamp, not their callers
            if (caller?.status === 'ready' && (caller.marks.length || caller.declared)) return { ...caller, perElement: true };
          }
        }
        // traced from this element's own rendered classes: two elements with one stamp can carry different ones
        return { status: 'ready', ...r, text, perElement: true };
      }
    }
    return { status: 'ready', ...reading(location, site, edits), text };
  }

  // Classes traced to one literal in this level's file become ordinary marks (their edits write to that file). A class
  // that could come from several literals (a branch Plumb cannot decide) is counted, never guessed; classes from other
  // files, or passed in by the code that uses this component, are pointed at.
  #computedReading(location, traced) {
    const same = site => site.file === location.file || site.file?.endsWith('/' + location.file);
    const findings = new Map(), declarations = [], edits = [];
    let hash, ambiguous = 0;
    const elsewhere = new Set();
    for (const entry of traced.classes) {
      if (entry.ambiguous) { ambiguous++; continue; }
      for (const site of entry.sites) {
        if (!same(site)) { elsewhere.add(site.file.split('/').pop() + ':' + site.line); continue; }
        hash ??= site.hash;
        for (const finding of site.findings ?? []) findings.set(finding.key + '@' + site.line + ':' + site.column, finding);
        declarations.push(...(site.declarations ?? []));
        edits.push(...(site.edits ?? []));
      }
    }
    const r = reading(location, { findings: [...findings.values()], declarations }, { hash, edits });
    const notes = [...r.notes];
    const unattributed = traced.unattributed ?? [];
    if (unattributed.length) notes.push({ title: `\`${unattributed.join(' ')}\` ${unattributed.length === 1 ? 'is' : 'are'} passed in by the code that uses this component. Alt+↑ reads it there.` });
    if (ambiguous) notes.push({ title: `${ambiguous} class${ambiguous === 1 ? '' : 'es'} could come from more than one line, depending on props; React Plumber won’t guess which.` });
    const limited = Array.isArray(traced.limited) ? traced.limited : [];
    if (limited.length) notes.push({ title: `${limited.length} class${limited.length === 1 ? ' is' : 'es are'} built deeper than React Plumber follows (helpers inside helpers); they are not judged here.` });
    if (elsewhere.size) notes.push({ title: `Some classes are written in ${[...elsewhere].slice(0, 3).join(', ')}${elsewhere.size > 3 ? '…' : ''}.` });
    return { ...r, notes, declared: declarations.length || traced.classes.length, traced: { attributed: traced.classes.length, unattributed: unattributed.length, ambiguous } };
  }

  // Step through the chain with the element still pinned: Alt+↑ goes out to the code that uses this component, Alt+↓
  // back in toward the design system's own JSX. Any unwritten preview belongs to the level it was made on, so it lifts.
  async #step(to) {
    const p = this.#pinned, s = p?.state;
    if (!s?.chain?.length || to < 0 || to >= s.chain.length || to === s.index) return;
    this.#restore(p); p.original.clear(); p.before = false; p.status = null;
    const link = s.chain[to];
    const next = await this.#readAt({ ...link, tag: s.tag, via: s.via, chain: s.chain, index: to }, p.element);
    if (this.#pinned !== p) return;
    p.state = structuredClone(next); p.active = 0;
    this.#renderWidget();
  }

  // ── armed: Alt held ──────────────────────────────────────
  #text = null; #help = null; #history = null;
  #onKeyDown = event => {
    if (this.#text?.editing) return; // the words being edited take the keys: Enter saves, Esc cancels
    // a field of the overlay's own (a new token's name, why a cause is kept) takes its keys: Enter and Esc are its
    if (event.composedPath()[0]?.localName === 'input' && this.#root.contains(event.composedPath()[0])) return;
    // ?: every gesture; Esc closes the sheet or a hint before anything else
    if (event.key === '?' && !event.altKey && !event.metaKey && !event.ctrlKey && !this.#typing(event)) { event.preventDefault(); event.stopPropagation(); this.#help.toggle(); return; }
    if (event.key === 'Escape' && (this.#help?.escape() || this.#history?.escape())) { event.preventDefault(); event.stopPropagation(); return; }
    if (this.#pinned && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault(); event.stopPropagation();
      const s = this.#pinned.state;
      if (s?.chain) this.#step(s.index + (event.key === 'ArrowUp' ? 1 : -1));
      return;
    }
    // Alt+B: the whole view as its blueprint, every drift drawn where it lives
    if (event.altKey && event.code === 'KeyB' && !event.repeat) { event.preventDefault(); event.stopPropagation(); this.#disarm(); this.#toggleBlueprint(); return; }
    if (event.key === 'Alt' && !event.repeat) this.#arm();
    else if (event.key === 'Escape' && this.#armed && this.#sticky) { event.preventDefault(); event.stopPropagation(); this.#disarm(); }
    else if (event.key === 'Escape' && this.#fixer?.listOpen) { event.preventDefault(); event.stopPropagation(); this.#fixer.closeList(); }
    else if (event.key === 'Escape' && this.#fixer?.isOpen) { event.preventDefault(); event.stopPropagation(); this.#fixer.close(); }
    // J/K, the arrows, N and Enter: the panel's causes, while blueprint is on and nothing is open or being typed
    // (Enter or Space on a focused control of the overlay, Apply in Changes, presses that control)
    else if (this.#blueprint?.active && !this.#pinned && !this.#fixer?.isOpen && !this.#fixer?.listOpen && !event.altKey && !event.metaKey && !event.ctrlKey && !this.#typing(event)
      && !((event.key === 'Enter' || event.key === ' ') && event.composedPath()[0]?.closest?.('.cg button, .cg [role="listitem"]')) && this.#blueprint.key(event.key)) { event.preventDefault(); event.stopPropagation(); }
    // L: the punch list, when nothing on the page is being typed into
    // L (the old list) is retired: the fix bar is the one panel
    else if (event.key === 'Escape' && this.#pinned) { event.preventDefault(); event.stopPropagation(); this.close(); }
    else if (event.key === 'Escape' && this.#blueprint?.active && this.#blueprint.deselect()) { event.preventDefault(); event.stopPropagation(); }
    else if (event.key === 'Escape' && this.#blueprint?.active) { event.preventDefault(); event.stopPropagation(); this.#toggleBlueprint(); }
  };
  #typing(event) {
    const t = event.composedPath()[0];
    return !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.localName ?? ''));
  }
  // Select stays on until an element is picked or Esc; Alt is held, so letting go ends it.
  #onKeyUp = event => { if (event.key === 'Alt' && !this.#sticky) this.#disarm(); };

  #arm(sticky = false) {
    this.#ready?.dismiss();
    if (this.#armed) { if (sticky) { this.#sticky = true; this.#dock(); } return; }
    this.#armed = true; this.#sticky = sticky;
    this.#help?.hint('inspect');
    this.#blueprint?.yieldInput(true);
    addEventListener('pointermove', this.#onMove, true);
    addEventListener('click', this.#onClick, true);
    addEventListener('pointerdown', this.#swallow, true);
    addEventListener('wheel', this.#onWheel, { capture: true, passive: false });
    this.#htmlStyled = !!document.documentElement.getAttribute('style')?.trim(); // an empty style attribute is no style
    document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
    this.#dock();
  }
  #htmlStyled = false;
  #tidyHtml() {
    const html = document.documentElement;
    if (!this.#htmlStyled && !this.#armed && html.hasAttribute('style') && !html.style.length) html.removeAttribute('style');
  }
  #disarm = () => {
    if (!this.#armed) return;
    this.#armed = false; this.#sticky = false; clearTimeout(this.#hoverTimer);
    this.#blueprint?.yieldInput(false);
    this.#hover?.controller.abort();
    removeEventListener('pointermove', this.#onMove, true);
    removeEventListener('click', this.#onClick, true);
    removeEventListener('pointerdown', this.#swallow, true);
    removeEventListener('wheel', this.#onWheel, { capture: true });
    this.#walk = null;
    document.documentElement.style.removeProperty('cursor');
    // leave no residue: a page whose <html> had no style attribute gets none back, now and once events settle
    this.#tidyHtml();
    requestAnimationFrame(() => this.#tidyHtml());
    this.#hover = null;
    this.#showReticle(this.#pinned?.element ?? null);
    this.#$('.tag').hidden = true;
    this.#follow();
    this.#dock();
  };
  #swallow = event => { if (this.#armed && !this.#ours(event)) { event.preventDefault(); event.stopPropagation(); } };
  #ours = event => event.composedPath().includes(this);

  #onMove = event => {
    if (this.#ours(event)) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    // Walking the tree (two-finger scroll) holds its level while the pointer stays on the element it started from.
    if (this.#walk && under === this.#walk.chain[0]) return;
    this.#walk = null;
    this.#hoverOn(under);
  };
  #hoverOn(element) {
    if (element !== this.#hover?.element) this.#hover?.controller.abort();
    if (element === this.#hover?.element) return;
    if (!element || element === document.documentElement || element === document.body) {
      clearTimeout(this.#hoverTimer); this.#hover = null; return;
    }
    const controller = new AbortController();
    this.#hover = { element, state: null, controller };
    this.#showReticle(element);
    this.#renderTag(element, null);
    clearTimeout(this.#hoverTimer);
    this.#hoverTimer = setTimeout(async () => {
      const state = await this.read(element, false, controller.signal);
      if (this.#hover?.element === element) { this.#hover.state = state; this.#renderTag(element, state); }
    }, TIMING.hoverRead);
    this.#follow();
  }

  /* ── WALKING THE TREE ──────────────────────────────────────
   * With Alt held, two-finger scroll moves the reading up and down the DOM: fingers up widen to the parent, then the
   * grandparent, up to the last element under <body>; fingers down retrace the path back to the element under the
   * pointer. The path names an element by the component it is the outermost element of, where there is one.
   * The page doesn't scroll meanwhile. Scroll adds up and moves one level per STEP of travel, so one swipe of a
   * trackpad doesn't fly ten levels; a pause resets the travel. The tag shows the path while walked. A click pins
   * the walked level. */
  #walk = null; // { chain: [element under the pointer, parent, …], at, travel, last }
  #onWheel = event => {
    if (!this.#armed || this.#ours(event) || event.ctrlKey) return; // ctrl+wheel is the page's pinch zoom
    const base = this.#walk?.chain[0] ?? this.#hover?.element;
    if (!base) return;
    event.preventDefault(); event.stopPropagation();
    if (!this.#walk) {
      const chain = [];
      for (let el = base; el && el !== document.body && el !== document.documentElement; el = el.parentElement) chain.push(el);
      this.#walk = { chain, at: 0, travel: 0, last: 0 };
    }
    const w = this.#walk, now = performance.now();
    if (now - w.last > WALK.pause) w.travel = 0;
    w.last = now;
    // a mouse wheel reports lines or pages; a trackpad reports pixels
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * innerHeight : event.deltaY;
    w.travel += dy;
    let moved = false;
    while (Math.abs(w.travel) >= WALK.step) {
      const up = w.travel > 0, next = w.at + (up ? 1 : -1); // fingers up on a trackpad (natural scrolling) = parent
      w.travel -= Math.sign(w.travel) * WALK.step;
      if (next < 0 || next >= w.chain.length) { w.travel = 0; break; }
      w.at = next; moved = true;
    }
    if (moved) { this.#hover?.controller.abort(); this.#hover = null; this.#hoverOn(w.chain[w.at]); }
  };

  #crumbs() {
    const w = this.#walk;
    if (!w || w.at === 0) return '';
    const tag = el => el.localName + (el.id ? `#${el.id}` : '');
    // two levels above the current one, the current one, and one back toward the element under the pointer
    const from = Math.min(w.chain.length - 1, w.at + 2), to = Math.max(0, w.at - 1), parts = [];
    if (from < w.chain.length - 1) parts.push('<span class="more">…</span>');
    for (let i = from; i >= to; i--) { const c = componentOf(w.chain[i]); parts.push(`<span class="${[i === w.at ? 'here' : '', c ? 'cmp' : ''].join(' ').trim()}" title="${esc(tag(w.chain[i]))}">${esc(c ?? tag(w.chain[i]))}</span>`); }
    if (to > 0) parts.push('<span class="more">…</span>');
    return `<span class="path" title="Two-finger scroll walks up and down the tree">${parts.join('<span class="sep">›</span>')}</span>`;
  }

  #onClick = event => {
    if (this.#ours(event)) return;
    event.preventDefault(); event.stopPropagation();
    // The click's own point decides, not the last hover: a pointer can arrive without moving first.
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const element = this.#walk?.at && under === this.#walk.chain[0] ? this.#walk.chain[this.#walk.at] : under ?? this.#hover?.element;
    this.#walk = null;
    if (element && element !== document.documentElement && element !== document.body) {
      // One interface: the pick opens blueprint on that element, its cause in the fix panel. Alt is let go with it.
      this.#disarm();
      this.#ready?.dismiss();
      this.#blueprint.enterAt(element);
    }
  };

  #renderTag(element, state) {
    const tag = this.#$('.tag');
    if (!this.#blueprint?.active) this.dataset.scheme = groundIsDark(element) ? 'dark' : 'light';
    tag.innerHTML = this.#label(element, state);
    tag.hidden = false;
    this.#placeTag(element);
  }

  #label(element, state) {
    const crumbs = this.#crumbs();
    // One naming rule everywhere (tag, card, path): an element that is a component's outermost element is named by
    // the component, its tag quiet beside it; any other element is its tag and where it's written ("div in App").
    const tag = state?.tag ?? element.localName, root = componentOf(element);
    const name = crumbs || (root ? `<span class="el">${esc(root)}</span><span class="who">${esc(tag)}</span>` : `<span class="el">${esc(tag)}</span>`);
    const owner = state?.component && state.component !== root ? state.component : null;
    const who = owner ? `<span class="who" title="${state.via === 'owner' ? 'Rendered by a library inside this component' : `Written in ${esc(owner)}`}">in ${esc(owner)}</span>` : '';
    if (!state) return `${name}${who}<span class="n quiet">${TAG.checking}</span>`;
    if (state.status === 'unplaced') return `${name}<span class="n quiet">${esc(state.short)}</span>`;
    if (state.status === 'starting') return `${name}<span class="n quiet">${esc(state.message)}</span>`;
    if (state.status === 'error') return `${name}${who}<span class="n">${esc(state.short ?? state.message)}</span>`;
    const st = status(state, element);
    return `${name}${who}<span class="n ${st.tone}">${esc(st.text)}</span>`;
  }

  // ── geometry that follows the page ───────────────────────
  #showReticle(element) {
    const ticks = this.#root.querySelectorAll('.tick');
    if (!element) { ticks.forEach(t => t.hidden = true); return; }
    const b = element.getBoundingClientRect(), s = 8;
    const at = { tl: [b.left, b.top, 1, 1], tr: [b.right - s, b.top, -1, 1], bl: [b.left, b.bottom - s, 1, -1], br: [b.right - s, b.bottom - s, -1, -1] };
    ticks.forEach(t => { const [x, y, a, d] = at[t.dataset.c]; t.hidden = false; t.style.transform = `translate(${x}px, ${y}px) scale(${a}, ${d})`; });
  }

  #placeTag(element) {
    const tag = this.#$('.tag'), b = element.getBoundingClientRect(), w = tag.offsetWidth, h = tag.offsetHeight;
    const below = b.bottom + 6 + h < innerHeight;
    const x = Math.min(Math.max(8, b.left), innerWidth - w - 8), y = below ? b.bottom + 6 : Math.max(8, b.top - h - 6);
    tag.style.transform = `translate(${x}px, ${y}px)`;
  }

  #placeWidget() {
    const p = this.#pinned; if (!p) return;
    const w = this.#$('.w'), b = p.element.getBoundingClientRect(), width = w.offsetWidth, height = w.offsetHeight;
    const x = Math.min(Math.max(8, b.left), Math.max(8, innerWidth - width - 8));
    // The dock owns the bottom-right corner; a card that would reach under it ends above it instead.
    const dock = this.#$('.dock').getBoundingClientRect();
    const floor = x + width > dock.left - 8 ? Math.min(innerHeight, dock.top) - 8 : innerHeight - 8;
    let y = b.bottom + 8;
    if (y + height > floor) y = b.top - height - 8 >= 8 ? b.top - height - 8 : Math.max(8, floor - height);
    w.style.transform = `translate(${x}px, ${y}px)`;
    this.#light();
  }

  // Scroll and resize move the page under the overlay; follow it for as long as something is shown, then stop.
  #follow() {
    const visible = this.#armed || this.#pinned;
    if (visible && !this.#frame) {
      this.#frame = -1;
      const tick = () => {
        if (!(this.#armed || this.#pinned)) { this.#frame = 0; return; }
        if (this.#hover?.element && this.#armed) { this.#showReticle(this.#hover.element); if (!this.#$('.tag').hidden) this.#placeTag(this.#hover.element); }
        else if (this.#pinned) this.#showReticle(this.#pinned.element);
        if (this.#pinned) this.#placeWidget();
        this.#frame = requestAnimationFrame(tick);
      };
      this.#frame = requestAnimationFrame(tick);
    }
  }

  // ── pinned ───────────────────────────────────────────────
  async pin(element) {
    if (this.#pinned?.element === element) return;
    this.#ready?.dismiss();
    this.close();
    this.#fixer?.close({ focus: false });
    this.#focusBack = document.activeElement;
    this.#$('.tag').hidden = true;
    // 1:1 by default; a tiny element opens magnified so its marks have room to sit apart.
    const { width, height } = element.getBoundingClientRect();
    const fit = Math.min((Math.min(480, Math.max(360, width + 24)) - 24) / Math.max(1, width), TIMING.maxDrawing / Math.max(1, height));
    const steps = [1, 2, 4].filter(z => z === 1 || z <= fit);
    const zoom = steps.find(z => width * z >= 160) ?? steps.at(-1);
    const p = this.#pinned = { element, state: null, active: 0, zoom, original: new Map(), texts: new Map(), styleAttr: element.getAttribute('style'), before: false, status: null, peeking: false };
    if (!this.#blueprint?.active) this.dataset.scheme = groundIsDark(element) ? 'dark' : 'light';
    this.#showReticle(element);
    // Picks and previews belong to this pin; the cached reading stays as the server said it.
    p.state = structuredClone(await this.read(element));
    if (this.#pinned !== p) return;
    this.#renderWidget(true);
    this.#follow();
    // The page can follow along (a host might dim around the part being read): which element is pinned, and when not.
    dispatchEvent(new CustomEvent('plumb:pin', { detail: { element } }));
    // The reading opened on its stamp alone; the components above it arrive after, for the chain row and Alt+↑/↓.
    if (p.state.location?.partial) locate(element, { chain: true }).then(full => {
      if (this.#pinned !== p || !full?.chain || p.state.index !== 0) return;
      const at = full.chain.findIndex(link => link.file === p.state.file && link.line === p.state.line && link.column === p.state.column);
      if (at < 0) return;
      p.state.chain = full.chain; p.state.index = at; p.state.location = { ...p.state.location, partial: false };
      this.#renderWidget();
    }).catch(() => {});
    // Pinned during Plumb's first read: say so, and fill the reading in as soon as the project is read.
    while (this.#pinned === p && p.state.status === 'starting') {
      await new Promise(r => setTimeout(r, TIMING.starting));
      if (this.#pinned !== p) return;
      const next = await this.read(element, true);
      if (this.#pinned !== p || next.status === 'starting') continue;
      p.state = structuredClone(next);
      this.#renderWidget();
    }
  }

  close() {
    const p = this.#pinned; if (!p) return;
    this.#restore(p);
    this.#pinned = null;
    dispatchEvent(new CustomEvent('plumb:unpin', { detail: { element: p.element } }));
    this.#$('.w').hidden = true;
    this.#$('.lit').classList.remove('on');
    this.#dock();
    if (!this.#armed) this.#showReticle(null);
    if (this.#focusBack?.isConnected) this.#focusBack.focus?.({ preventScroll: true });
  }

  #renderWidget(opening = false) {
    const p = this.#pinned, s = p.state, w = this.#$('.w'), ready = s.status === 'ready';
    const b = p.element.getBoundingClientRect();
    const width = Math.round(Math.min(480, Math.max(360, b.width + 24)));
    const root = componentOf(p.element);
    const label = root ? `${root} (${ready ? s.tag : p.element.localName})` : ready ? `${s.tag}${s.component ? ' in ' + s.component : ''}` : p.element.localName;
    p.regions = ready ? s.marks.map(m => regionFor(p.element, m.props)) : [];
    w.hidden = false;
    w.style.width = width + 'px';
    w.innerHTML = `<div class="card" tabindex="-1" role="dialog" aria-label="React Plumber reading for ${esc(label)}">
      <div class="top">${this.#label(p.element, s)}
        ${ready ? `<button class="file" title="${esc(s.file)}:${s.line}:${s.column}">${esc(s.file.split('/').pop())}:${s.line}</button>` : ''}
        ${ready ? `<span class="zoom" role="group" aria-label="Drawing scale">${[1, 2, 4].map(z => `<button class="z" data-z="${z}" aria-pressed="${z === p.zoom}">${z}×</button>`).join('')}</span>` : ''}
        <button class="close" aria-label="Close the reading">${ICON.close}</button></div>
      ${ready && s.chain?.length > 1 ? `<nav class="chain" aria-label="Where this element comes from, Alt+↑ and Alt+↓ to step">${s.chain.map((link, i) => i).reverse().map(i => {
        const link = s.chain[i];
        return `<button class="link" data-step="${i}" aria-current="${i === s.index}" title="${esc(link.file)}:${link.line}">${esc(link.component ?? link.file.split('/').pop())}</button>`; }).join('<span class="sep" aria-hidden="true">›</span>')}</nav>` : ''}
      ${ready ? `<div class="diagram"></div><div class="txt" hidden></div><div class="read" aria-live="polite"></div>${this.#notes(s)}
        <div class="synced" hidden><span class="state" role="status"></span></div>
        <div class="foot">
          <button class="btn plain flip" aria-pressed="false" title="Show the page as it is in source">Before</button><button class="btn plain undo" title="Lift every preview">Undo</button>
          <button class="btn plain copy">Copy for agent</button><button class="btn primary write"></button></div>`
        : `<div class="read short"><p class="empty">${s.status === 'unplaced' ? code(s.message) : esc(s.message)}</p></div>`}
    </div>`;
    if (opening) { w.dataset.state = 'opening'; requestAnimationFrame(() => requestAnimationFrame(() => { w.dataset.state = 'open'; })); }
    this.#bindWidget();
    if (ready) { this.#drawDiagram(); this.#render(); this.#renderText(); this.#updateSync(); }
    this.#placeWidget();
    if (opening) { w.querySelector('.card').focus({ preventScroll: true }); setTimeout(() => this.#light(), TIMING.light); }
  }

  #notes(s) {
    if (!s.notes.length) return '';
    return `<div class="notes">${s.notes.map(n => `<p title="${esc(n.because)}"><span>${code(n.title)}</span></p>`).join('')}</div>`;
  }

  #bindWidget() {
    const w = this.#$('.w'), on = (sel, fn) => w.querySelector(sel)?.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    on('.close', () => this.close());
    w.querySelectorAll('.chain .link').forEach(link => link.addEventListener('click', e => { e.stopPropagation(); this.#step(Number(link.dataset.step)); }));
    on('.flip', e => this.#flip(e.currentTarget));
    on('.undo', () => this.#undo());
    on('.write', e => { const d = e.currentTarget.dataset.do; if (d === 'sync') this.#sync(); else if (d === 'write' || d === 'reread') this.#write(); });
    on('.copy', e => this.#copy(e.currentTarget));
    w.querySelectorAll('.z').forEach(z => z.addEventListener('click', e => { e.stopPropagation(); this.#zoom(Number(z.dataset.z)); }));
    on('.file', e => this.#copyText(e.currentTarget, `${this.#pinned.state.file}:${this.#pinned.state.line}:${this.#pinned.state.column}`));
    // Keys: ← → move between findings, 1–9 pick a token, E edits the text, Enter does the primary action.
    w.querySelector('.card').addEventListener('keydown', e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) && !e.target.closest('.opt')) { e.preventDefault(); this.#go(this.#pinned.active + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1)); }
      else if (/^[1-9]$/.test(e.key)) { const opt = this.#root.querySelectorAll('.cmp .opt')[Number(e.key) - 1]; if (opt) { e.preventDefault(); opt.click(); } }
      else if ((e.key === 'e' || e.key === 'E') && this.#pinned.state.text?.editable) { e.preventDefault(); this.#editRun(0); }
      else if (e.key === 'Enter' && !e.target.closest('button')) { const write = this.#$('.write'); if (write && !write.disabled && !write.hidden) { e.preventDefault(); write.click(); } }
    });
  }

  // ── the skeleton ─────────────────────────────────────────
  // The element drawn at 1:1 (or magnified), its children as boxes and text rules, and every mark set into a break in
  // the outline nearest the place it is about, as a technical drawing prints a measurement in the line it measures.
  #drawDiagram() {
    const p = this.#pinned, s = p.state, el = p.element, diagram = this.#$('.diagram');
    const o = outlineOf(el), width = this.#$('.w').offsetWidth || 360;
    // Fit the drawing to the card's width and to a drawing height, so a page-sized element stays a glance.
    const fit = Math.min((width - 24) / Math.max(1, o.w), TIMING.maxDrawing / Math.max(1, o.h));
    const k = Math.min(fit, p.zoom), pad = 12;
    this.#root.querySelectorAll('.z').forEach(z => { const n = Number(z.dataset.z); z.disabled = n > 1 && n > fit; });
    const toD = r => ({ x: (r.x - o.x) * k, y: (r.y - o.y) * k + pad, w: r.w * k, h: r.h * k });
    const H = o.h * k, W = o.w * k;
    diagram.style.height = pad + H + 22 + 'px';
    // The element as it is, drawn as a spec: its children in their own colours (softened), its words as words. It has to
    // read as *this* element at a glance, never as a loading placeholder.
    const shapes = childrenOf(el).map(c => {
      const d = toD(c);
      const lines = c.lines.map(l => {
        const ld = toD(l), size = Math.max(6, Math.min(13, ld.h * 0.74));
        return `<b style="left:${ld.x - d.x}px;top:${ld.y - d.y}px;max-width:${Math.max(4, d.w - (ld.x - d.x))}px;height:${ld.h}px;font-size:${size}px;line-height:${ld.h}px;font-weight:${Math.min(700, Number(l.weight) || 400)}">${esc(l.words ?? '')}</b>`;
      }).join('');
      const parts = (c.parts ?? []).map(q => { const qd = toD(q);
        return `<i class="d-part${q.fill ? ' filled' : ''}" style="${q.fill ? `--fill:${q.fill};` : ''}left:${qd.x - d.x}px;top:${qd.y - d.y}px;width:${qd.w}px;height:${qd.h}px;border-radius:${q.round === 'full' ? '50%' : q.round * k + 'px'}"></i>`; }).join('');
      return `<i class="d-child${c.text ? ' text' : ''}${c.fill ? ' filled' : ''}" style="${c.fill ? `--fill:${c.fill};` : ''}left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px;border-radius:${c.round === 'full' ? '50%' : c.round * k + 'px'}">${parts}${lines}</i>`;
    }).join('');
    const ground = getComputedStyle(el).backgroundColor, grounded = (ground.match(/[\d.]+/g)?.map(Number)?.[3] ?? 1) > 0.05;
    const R = { tl: Math.min(o.radius.tl * k, H / 2, W / 2), tr: Math.min(o.radius.tr * k, H / 2, W / 2), bl: Math.min(o.radius.bl * k, H / 2, W / 2), br: Math.min(o.radius.br * k, H / 2, W / 2) };
    const top = pad, bot = pad + H, GAPW = 9, MIN = 22;
    p.regions = s.marks.map(m => regionFor(el, m.props));
    const marks = s.marks.map((m, i) => {
      const reg = p.regions[i], r = toD(reg.rects[0]);
      const edge = reg.kind === 'pad' && reg.axis === 'x' ? reg.edge : reg.edge;
      const along = edge === 'left' || edge === 'right' ? r.y + r.h / 2 : r.x + r.w / 2;
      return { i, edge, along, kind: reg.kind, corner: reg.corner };
    });
    for (const edge of ['top', 'bottom', 'left', 'right']) {
      const row = marks.filter(m => m.edge === edge && m.kind !== 'corner').sort((a, c) => a.along - c.along);
      const vertical = edge === 'left' || edge === 'right';
      const lo = vertical ? top + Math.max(R.tl, R.bl) : Math.max(R.tl, R.bl), hi = vertical ? bot - Math.max(R.tr, R.br) : W - Math.max(R.tr, R.br);
      let last = -Infinity;
      for (const m of row) { m.along = Math.min(hi - GAPW, Math.max(lo + GAPW, m.along, last + MIN)); last = m.along; }
    }
    const gapsOn = edge => marks.filter(m => m.edge === edge && !['corner', 'shadow'].includes(m.kind)).map(m => [m.along - GAPW, m.along + GAPW]);
    const cut = (a, c, gaps) => { let segs = [[a, c]]; for (const [g0, g1] of gaps) segs = segs.flatMap(([u, v]) => g1 <= u || g0 >= v ? [[u, v]] : [[u, g0], [g1, v]].filter(([x0, x1]) => x1 - x0 > 0.5)); return segs; };
    const h = v => Math.round(v) + 0.5;
    const outline = [
      ...cut(R.tl, W - R.tr, gapsOn('top')).map(([a, c]) => `M${a} ${h(top)}H${c}`),
      ...cut(R.bl, W - R.br, gapsOn('bottom')).map(([a, c]) => `M${a} ${h(bot)}H${c}`),
      ...cut(top + R.tl, bot - R.bl, gapsOn('left')).map(([a, c]) => `M0.5 ${a}V${c}`),
      ...cut(top + R.tr, bot - R.br, gapsOn('right')).map(([a, c]) => `M${W - 0.5} ${a}V${c}`),
      `M0.5 ${top + R.tl}A${R.tl} ${R.tl} 0 0 1 ${R.tl} ${h(top)}M${W - R.tr} ${h(top)}A${R.tr} ${R.tr} 0 0 1 ${W - 0.5} ${top + R.tr}`,
      `M0.5 ${bot - R.bl}A${R.bl} ${R.bl} 0 0 0 ${R.bl} ${h(bot)}M${W - R.br} ${h(bot)}A${R.br} ${R.br} 0 0 0 ${W - 0.5} ${bot - R.br}`,
    ].join('');
    // Glyphs read their context: a radius arc faces its corner and sits on that corner's arc; a spacing mark turns to the
    // axis it measures; a shadow sits below the outline, where the shadow falls.
    const markXY = m => {
      if (m.kind === 'corner') {
        const c = m.corner, r = R[c] || 6, cx = c[1] === 'r' ? W - r : r, cy = c[0] === 't' ? top + r : bot - r, d = r * Math.SQRT1_2;
        return [cx + (c[1] === 'r' ? d : -d), cy + (c[0] === 't' ? -d : d)];
      }
      if (m.kind === 'shadow') return [m.along, bot + 10];
      return m.edge === 'top' ? [m.along, top] : m.edge === 'bottom' ? [m.along, bot] : m.edge === 'left' ? [0, m.along] : [W, m.along];
    };
    const orient = (mark, m) => {
      const reg = p.regions[m.i];
      if (mark.glyph === 'spacing' && reg.axis === 'y') return 'rotate(90deg)';
      if (mark.glyph === 'radius' && reg.corner) return `scale(${reg.corner[1] === 'r' ? -1 : 1}, ${reg.corner[0] === 'b' ? -1 : 1})`;
      return 'none';
    };
    const regionsSvg = s.marks.map((mark, i) => p.regions[i].rects.map(rect => { const r = toD(rect);
      return `<rect class="reg ${this.#tone(mark)}" data-i="${i}" x="${r.x}" y="${r.y}" width="${Math.max(0, r.w)}" height="${Math.max(0, r.h)}" rx="${p.regions[i].kind === 'corner' ? r.w / 4 : 1}"/>`; }).join('')).join('');
    // Each finding's size, written where it is: the padding band says 21px, the corner says 10px.
    const dims = s.marks.map((mark, i) => {
      const shown = p.peekAt?.i === i ? p.peekAt.value : mark.synced && mark.pick !== null ? mark.choices[mark.pick].value : mark.value;
      const reg = p.regions[i], r = toD(reg.rects[0]), v = toPx(shown, el);
      if (v === undefined || !reg.rects[0]) return '';
      const [x, y] = reg.kind === 'corner'
        ? [reg.corner[1] === 'r' ? r.x - 4 : r.x + r.w + 4, reg.corner[0] === 'b' ? r.y : r.y + r.h]
        : reg.kind === 'text' ? [r.x + r.w + 4, r.y + r.h / 2] : [r.x + r.w / 2 + 12, r.y + r.h / 2];
      // beside the mark's glyph (which sits at the band's middle), never on top of it
      const align = reg.kind === 'corner' ? (reg.corner[1] === 'r' ? 'right' : 'left') : 'left';
      return `<span class="dim ${p.peekAt?.i === i ? 'live' : this.#tone(mark)} ${align}" data-i="${i}" style="left:${x}px;top:${y}px">${fmtPx(v)}</span>`;
    }).join('');
    const hatch = (id, tone) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="1.4" height="5" style="fill:var(${tone})"/></pattern>`;
    diagram.innerHTML = `<svg class="outline" width="${W}" height="${pad + H + 22}" aria-hidden="true"><defs>${hatch('pl-h-off', '--pl-off')}${hatch('pl-h-soft', '--pl-soft')}${hatch('pl-h-ok', '--pl-on')}${hatch('pl-h-quiet', '--pl-ink-3')}</defs>` +
      `<rect class="surface${grounded ? '' : ' bare'}" style="--fill:${grounded ? ground : 'transparent'}" x="0.5" y="${top + 0.5}" width="${Math.max(0, W - 1)}" height="${Math.max(0, H - 1)}" rx="${Math.min(R.tl, R.tr, R.bl, R.br)}"/>` +
      `${regionsSvg}<path d="${outline}"/></svg>${shapes}${dims}` +
      marks.map(m => { const mark = s.marks[m.i], [mx, my] = markXY(m);
        return `<button class="pin ${this.#tone(mark)} ${m.kind === 'corner' ? 'on-arc' : ''}" style="left:${mx}px;top:${my}px;--orient:${orient(mark, m)}" data-i="${m.i}" aria-label="${esc(mark.title.replace(/`/g, ''))}">${glyph(mark.glyph)}</button>`; }).join('');
    diagram.querySelectorAll('.pin').forEach(pin => {
      pin.addEventListener('click', e => { e.stopPropagation(); this.#go(Number(pin.dataset.i)); });
      pin.addEventListener('pointerenter', () => this.#light(Number(pin.dataset.i)));
      pin.addEventListener('pointerleave', () => this.#light());
    });
    this.#markCurrent();
  }

  // Off, soft (legal but reached the wrong way), quiet (known debt or an accepted exception), ok (previewed on the system).
  #tone(mark) {
    if (mark.synced && !this.#pinned?.before) return 'ok';
    if (mark.ledger !== 'new') return 'quiet';
    return mark.soft ? 'soft' : '';
  }

  #markCurrent() {
    const p = this.#pinned, i = p.active;
    this.#root.querySelectorAll('.pin').forEach(n => n.setAttribute('aria-current', String(Number(n.dataset.i) === i)));
    this.#root.querySelectorAll('.outline .reg, .diagram .dim').forEach(n => n.toggleAttribute('data-active', Number(n.dataset.i) === i));
  }

  #light(i = this.#pinned?.active) {
    const p = this.#pinned, lit = this.#$('.lit');
    const mark = p?.state?.marks?.[i];
    if (!mark || !p.regions?.[i]) { lit.classList.remove('on'); return; }
    const reg = regionFor(p.element, mark.props), r = reg.rects[0];
    // A region that is most of the screen is outlined, not hatched: the page stays readable under the reading.
    const large = reg.kind === 'box' || r.w * r.h > innerWidth * innerHeight / 3;
    lit.className = `lit on ${reg.kind === 'corner' ? 'ring' : ''} ${large ? 'frame' : ''} ${this.#tone(mark)}`;
    lit.style.width = Math.max(2, r.w) + 'px'; lit.style.height = Math.max(2, r.h) + 'px';
    lit.style.transform = `translate(${r.x}px, ${r.y}px)`;
  }

  #go(i) {
    const p = this.#pinned, n = p.state.marks.length; if (!n) return;
    this.#unpeek();
    p.active = (i + n) % n;
    const read = this.#$('.read');
    read.classList.add('swapping');
    setTimeout(() => { if (this.#pinned !== p) return; this.#render(); read.classList.remove('swapping'); }, TIMING.swap / 2);
    this.#markCurrent(); this.#light();
  }

  #zoom(z) {
    const p = this.#pinned; p.zoom = z;
    this.#root.querySelectorAll('.z').forEach(o => o.setAttribute('aria-pressed', String(Number(o.dataset.z) === z)));
    const d = this.#$('.diagram'); d.classList.add('swapping');
    setTimeout(() => { if (this.#pinned !== p) return; this.#drawDiagram(); d.classList.remove('swapping'); }, TIMING.swap / 2);
  }

  // ── the reading line ─────────────────────────────────────
  #render() {
    const p = this.#pinned, s = p.state, read = this.#$('.read');
    if (!s.marks.length && !s.declared) {
      read.innerHTML = s.via === 'owner'
        ? `<div class="t">${glyph('ownership', 'quiet')}<span class="title">This line uses ${esc(s.component ?? 'a component')} and sets no class or style of its own.</span></div>
          <div class="because">Its look comes from ${esc(s.component ?? 'the component')} and the props passed here. React Plumber checks that component where its styles are written.</div>`
        : `<div class="t">${glyph('existence', 'quiet')}<span class="title">Nothing is written literally at this line.</span></div>
          <div class="because">The classes here are built in code (a variable, a function or a template), so React Plumber reads them where they are written as text. Open ${esc(s.file)} to see those places.</div>`;
      return;
    }
    if (!s.marks.length) {
      read.innerHTML = `<div class="t">${glyph('habit', 'ok')}<span class="title">Every value here comes from your tokens.</span></div>`;
      return;
    }
    const m = s.marks[p.active];
    read.innerHTML = `<div class="t">${glyph(m.glyph, this.#tone(m) || 'off')}<span class="title">${code(m.title)}</span><span class="ledger ${m.ledger}">${{ new: 'new', debt: 'known debt', exception: 'accepted' }[m.ledger] ?? esc(m.ledger)}</span></div>
      ${this.#change(m)}
      <div class="edit">${this.#editLine(m)}</div>
      ${this.#compare(m)}
      ${m.because ? `<div class="because">${esc(m.because)}</div>` : ''}`;
    // Pointing at a token previews it on the page; leaving puts the page back. Choosing is by eye.
    bindChoices(read, m, { pick: j => this.#pick(m, j), peek: j => this.#peek(m, j), unpeek: () => this.#unpeek() });
  }

  // The change, as one line: what is written → what it becomes, or a dashed blank that asks for a choice.
  #change(m) {
    const c = m.pick !== null ? m.choices[m.pick] : null;
    const from = c?.edit?.from ?? m.text;
    const to = c ? `<code class="to">${esc(c.edit?.to ?? c.label)}</code>` : m.choices.length ? '<code class="to waiting">choose below</code>' : '';
    const el = this.#pinned.element, a = toPx(m.value, el), z = c ? toPx(c.value, el) : undefined;
    const show = (v, n) => n !== undefined ? fmtPx(n) : esc(v ?? '');
    const delta = c ? `${show(m.value, a)} → ${show(c.value, z)}` : show(m.value, a);
    return `<div class="change"><code class="from ${m.soft ? 'soft' : ''}">${esc(from)}</code>${to ? `<span class="arrow" aria-hidden="true">→</span>${to}` : ''}<span class="delta">${delta}</span></div>`;
  }

  // The ask: one sentence that says what to do next with this finding.
  #editLine(m) {
    // Value families can be fixed with a token; every other rule (a dead or runtime-built class, an override) says its own fix.
    const valued = VALUED.includes(m.glyph);
    if (!m.choices.length && !valued) return `<span class="hint">How to fix it</span>`;
    if (!m.choices.length) return `<span class="hint">No token is close</span>`;
    if (m.pick === null) return `<span class="hint">${m.choices.length} tokens fit. Pick the one whose reason matches.</span>`;
    const c = m.choices[m.pick];
    if (!c.edit) return `<span class="hint">${esc(c.label)} fits, but React Plumber has no exact edit for this syntax. Copy for agent hands it over.</span>`;
    return '';
  }

  #compare(m) { return choicesHtml(m, { el: this.#pinned.element, scale: f => this.#scaleOf(f) }); }

  // Your theme's whole scale for this family, read once from Plumb's decisions and measured on the page (so a token
  // written as calc(var(--radius) + 4px) is known in px). Fetched lazily; the card redraws when it arrives.
  #scaleOf(family) {
    if (!this.#decisions) {
      // Plumb may still be starting: a failed or empty answer is asked again on the next card, never cached as "no scale".
      this.#decisionsLoading ??= request('decisions', {}).then(d => {
        if (!Array.isArray(d)) throw new Error('no decisions yet');
        this.#decisions = d; this.#scales.clear();
        if (this.#pinned?.state?.status === 'ready') this.#refresh();
        this.#fixer?.refresh();
        this.#blueprint?.themeChanged(); // craft: suggestions can now name the theme's tokens
      }).catch(() => { this.#decisionsLoading = null; });
      return [];
    }
    if (this.#scales.has(family)) return this.#scales.get(family);
    const prop = { radius: 'border-top-left-radius', spacing: 'padding-left', type: 'font-size' }[family];
    const keep = { radius: n => /^--radius-/.test(n), spacing: n => /^--spacing-[\d.]+$/.test(n), type: n => /^--text-[a-z0-9]+$/.test(n) }[family];
    if (!prop) return [];
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    document.body.append(probe);
    // Measure the token's own definition (calc(var(--spacing) * 3)): an inline theme defines no variable per step.
    // Failing that, the variable itself. A definition the browser can't parse is left off the ladder.
    const measure = expr => { probe.style.removeProperty(prop); probe.style.setProperty(prop, expr); return probe.style.getPropertyValue(prop) ? parseFloat(getComputedStyle(probe).getPropertyValue(prop)) : NaN; };
    const steps = this.#decisions.filter(d => d.family === family && keep(d.name)).map(d => {
      let px = measure(d.value);
      if (!Number.isFinite(px)) px = measure(`var(${d.name})`);
      return { name: d.name, short: d.name.replace(/^--(radius|spacing|text)-/, ''), px };
    }).filter(t => Number.isFinite(t.px));
    probe.remove();
    this.#scales.set(family, steps);
    return steps;
  }

  // ── preview: the page itself changes ─────────────────────
  // A preview is inline styles on the real element, remembered so they can be lifted exactly. Nothing is written until
  // Write; nothing ever touches the theme, the config or the ledger.
  #preview(m) {
    const p = this.#pinned, c = m.choices[m.pick]; if (!c) return false;
    for (const prop of m.props) {
      if (!p.original.has(prop)) p.original.set(prop, [p.element.style.getPropertyValue(prop), p.element.style.getPropertyPriority(prop)]);
      p.element.style.setProperty(prop, c.value, 'important');
    }
    m.synced = true;
    return true;
  }

  // Pointing at a token shows it on the page for as long as the pointer stays; nothing is picked or written.
  #peek(m, j) {
    const p = this.#pinned, c = m.choices[j];
    if (!p || !c || p.status?.kind === 'writing' || p.before) return; // the card may have closed under the pointer
    for (const prop of m.props) {
      if (!p.original.has(prop)) p.original.set(prop, [p.element.style.getPropertyValue(prop), p.element.style.getPropertyPriority(prop)]);
      p.element.style.setProperty(prop, c.value, 'important');
    }
    p.peeking = true; p.peekAt = { i: p.state.marks.indexOf(m), value: c.value };
    this.#drawDiagram(); this.#light();
  }
  #unpeek() {
    const p = this.#pinned; if (!p?.peeking) return;
    p.peeking = false; p.peekAt = null; this.#restore(p);
    if (!p.before) this.#reapply();
    this.#drawDiagram(); this.#light();
  }

  #restore(p = this.#pinned) {
    if (!p) return;
    for (const t of p.texts.values()) if (t.node.isConnected) t.node.data = t.lead + t.from + t.trail;
    for (const [prop, [value, priority]] of p.original) value ? p.element.style.setProperty(prop, value, priority) : p.element.style.removeProperty(prop);
    // Leave no residue: an element that had no style attribute gets none back.
    // Chromium writes inline style back to the attribute lazily; read it first so the removal is the last write.
    if (p.styleAttr === null && !p.element.style.length) { p.element.getAttribute('style'); p.element.removeAttribute('style'); }
  }

  #reapply() {
    const p = this.#pinned;
    for (const m of p.state.marks) if (m.synced) this.#preview(m);
    for (const t of p.texts.values()) if (t.node.isConnected) t.node.data = t.lead + t.to + t.trail;
  }

  #pick(m, j) {
    const p = this.#pinned;
    p.peeking = false;
    m.pick = j;
    if (p.status?.kind !== 'writing') p.status = null;
    if (p.before) this.#flip(this.#$('.flip'), false);
    this.#preview(m);
    this.#refresh();
  }

  #sync() {
    const p = this.#pinned;
    if (p.status?.kind !== 'writing') p.status = null;
    for (const m of p.state.marks) if (m.ledger === 'new' && m.pick !== null) this.#preview(m);
    this.#refresh();
  }

  #flip(button, before = button.getAttribute('aria-pressed') !== 'true') {
    const p = this.#pinned; p.before = before;
    button.setAttribute('aria-pressed', String(before));
    before ? this.#restore() : this.#reapply();
    this.#refresh();
  }

  #undo() {
    const p = this.#pinned;
    p.peeking = false;
    this.#restore(); p.original.clear(); p.texts.clear(); p.before = false; p.status = null;
    for (const m of p.state.marks) delete m.synced;
    this.#$('.flip').setAttribute('aria-pressed', 'false');
    this.#refresh();
  }

  #refresh() {
    const p = this.#pinned;
    requestAnimationFrame(() => { if (this.#pinned !== p) return; this.#drawDiagram(); this.#render(); this.#renderText(); this.#updateSync(); this.#light(); });
  }

  #writable() { return this.#pinned.state.marks.filter(m => m.synced && m.choices[m.pick]?.edit); }

  #updateSync() {
    const p = this.#pinned, s = p.state;
    if (s.status !== 'ready') return;
    const kind = p.status?.kind;
    const texts = [...p.texts.values()];
    const previewed = [...s.marks.filter(m => m.synced), ...texts], waiting = s.marks.filter(m => m.ledger === 'new' && !m.synced && m.choices.length > 1 && m.pick === null);
    const stuck = s.marks.filter(m => m.ledger === 'new' && !m.choices.length), writable = [...this.#writable(), ...texts];
    const ready = s.marks.filter(m => m.ledger === 'new' && m.pick !== null && !m.synced);
    const off = offCount(s);

    // The count in the header: one verdict for the element, in words.
    const n = this.#root.querySelector('.top .n');
    const [text, tone] = kind === 'written' && !off && !previewed.length ? [TAG.clean, 'ok won']
      : previewed.length && !p.before ? [TAG.trying, 'live']
      : !s.marks.length ? (s.declared ? [TAG.clean, 'ok'] : [TAG.computed, 'quiet'])
      : off ? [TAG.off(off), '']
      : [TAG.known, 'quiet'];
    if (n) { n.textContent = text; n.className = `n ${tone}`; }

    // The status line: what happened, and what's left.
    const strip = this.#$('.synced'), state = strip.querySelector('.state');
    let say = '', sayTone = '';
    if (kind === 'writing') { say = 'Writing to source…'; sayTone = 'live'; }
    else if (kind === 'written') { say = p.status.text; sayTone = 'ok'; }
    else if (kind === 'error') { say = p.status.text; sayTone = 'err'; }
    else if (previewed.length) {
      const rest = [waiting.length && `${waiting.length} to pick`, stuck.length && `${stuck.length} without a token`].filter(Boolean).join(' · ');
      const fixes = previewed.length - texts.length;
      const what = [fixes && `${fixes} fix${fixes === 1 ? '' : 'es'}`, texts.length && `${texts.length} text change${texts.length === 1 ? '' : 's'}`].filter(Boolean).join(' and ');
      say = `Previewing ${what} on the page${rest ? ' · ' + rest : ''}`; sayTone = rest ? 'warn' : 'live';
    }
    strip.hidden = !say; state.textContent = say; state.className = `state ${sayTone}`;

    // The foot: Before and Undo only while something is previewed; one primary action, named for exactly what it does.
    const flip = this.#$('.flip'), undo = this.#$('.undo'), write = this.#$('.write'), copy = this.#$('.copy');
    flip.hidden = undo.hidden = !previewed.length;
    flip.disabled = undo.disabled = kind === 'writing';
    write.hidden = false; write.disabled = false; write.dataset.do = ''; write.classList.remove('done'); copy.classList.remove('primary');
    write.setAttribute('aria-busy', String(kind === 'writing'));
    if (kind === 'writing') { write.textContent = 'Writing…'; write.disabled = true; }
    else if (kind === 'error' && p.status.stale) { write.textContent = 'Read again'; write.dataset.do = 'reread'; }
    else if (writable.length) { write.textContent = DOCK.applyChanges(writable.length); write.dataset.do = 'write'; }
    else if (ready.length) { write.textContent = `Preview ${ready.length} fix${ready.length === 1 ? '' : 'es'}`; write.dataset.do = 'sync'; }
    else if (kind === 'written') { write.textContent = 'Written'; write.classList.add('done'); write.disabled = true; }
    else if (waiting.length) { write.textContent = 'Pick a token'; write.disabled = true; }
    else { write.hidden = true; if (stuck.length) copy.classList.add('primary'); }
  }

  // ── text: the words on the element ───────────────────────
  // A run is a piece of plain JSX text between tags. Editable runs are shown as they read on the page; one that is
  // being changed reads "from → to". Text Plumb can't write (an expression, a prop, a translation) says where it lives.
  #renderText() {
    const p = this.#pinned, t = p.state.text, row = this.#$('.txt');
    if (!row) return;
    // A container's words belong to its children: say nothing about text unless this element holds some directly.
    const ownText = [...p.element.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.data.trim());
    if (!t || (!t.editable && !ownText)) { row.hidden = true; return; }
    row.hidden = false;
    if (!t.editable) {
      row.innerHTML = `<span class="tk" aria-hidden="true">T</span><span class="tr">${code(t.reason)}</span>`;
      return;
    }
    row.innerHTML = `<span class="tk" aria-hidden="true">T</span>${t.runs.map((r, i) => {
      const e = p.texts.get(r.id);
      return `<button class="run" data-run="${i}" title="Edit this text (E, or double-click it on the page)">${e
        ? `<s class="was">${esc(r.text)}</s><span class="arrow" aria-hidden="true">→</span><span>${esc(e.to)}</span>`
        : esc(r.text)}</button>`;
    }).join('')}${p.texts.size ? '' : '<span class="tr hint">E to edit</span>'}`;
    row.querySelectorAll('.run').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.#editRun(Number(b.dataset.run)); }));
  }

  // The DOM text node that renders a run: a direct child of the element whose words match it.
  #textNode(run) {
    const p = this.#pinned, said = p.texts.get(run.id)?.to ?? run.text, norm = v => v.replace(/\s+/g, ' ').trim();
    return [...p.element.childNodes].find(n => n.nodeType === Node.TEXT_NODE && norm(n.data) === norm(said)) ?? null;
  }

  // A run from the card is edited where it is on the page, the same way a double-click edits it.
  #editRun(i) {
    const p = this.#pinned, run = p?.state.text?.runs?.[i];
    const node = run ? this.#textNode(run) : null;
    if (node) this.#text.start(node);
  }

  // A double-click on words edits them (text-edit.js). Plain, only where it can't have done anything else: both clicks
  // on the same element, and nothing clickable around the words (a card, a button, a link would have opened on the
  // first click). Alt + double-click edits any words: Alt keeps the clicks off the page, and the pin the first
  // Alt-click made is let go. In blueprint the page is inert, so a plain double-click edits any words there.
  #downs = [];
  #onDown = event => { this.#downs = [this.#downs.at(-1), event.composedPath()[0]]; };
  #onDblClick = event => {
    const path = event.composedPath();
    if (path.some(n => n === this) && !this.#blueprint?.active) return;
    if (path[0]?.closest?.('.dock, .w, .ch, .pl, .bpp, .rd, .rd-callout, .tx-toast')) return;
    const free = event.altKey || this.#blueprint?.active;
    if (!free) {
      const [a, b] = this.#downs;
      if (!a || a !== b || a !== path[0]) return;
      if (path[0]?.closest?.('a[href], button, summary, label, select, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"]')) return;
    } else if (event.altKey) {
      this.#disarm();
      if (this.#pinned) this.close();
    }
    this.#blueprint?.through(() => this.#text.dblclick(event)) ?? this.#text.dblclick(event);
  };

  // ── write: the same edits, in source ─────────────────────
  async #write() {
    const p = this.#pinned, s = p.state;
    if (p.status?.kind === 'error' && p.status.stale) return this.#reread(p);
    const ids = this.#writable().map(m => ({ id: m.choices[m.pick].edit.id }));
    const texts = [...p.texts.values()];
    if (!ids.length && !texts.length) return;
    this.#unpeek();
    p.status = { kind: 'writing' }; this.#updateSync();
    const classes = p.element.getAttribute('class');
    const n = ids.length + texts.length;
    const text = `Applied ${n} change${n === 1 ? '' : 's'} in ${s.file}`;
    try { sessionStorage.setItem(RESUME, JSON.stringify({ path: pathTo(p.element), file: s.file, tag: s.tag, text, at: Date.now(), blueprint: !!this.#blueprint?.active })); } catch {}
    try {
      if (ids.length) this.wrote(await post('apply', { file: s.file, hash: s.hash, edits: ids }), `Applied ${ids.length} change${ids.length === 1 ? '' : 's'} in ${s.file.split('/').pop()}`);
      // Each text change is written against the file as it is now: read the runs again, find the one that still says
      // what the person started from, and write only that. The server refuses if it no longer does.
      for (const t of texts) {
        const now = await request('text', { file: s.file, line: s.line, column: s.column });
        const run = now?.editable ? now.runs.find(r => r.text === t.from) : null;
        if (!run) throw new Error(`“${t.from}” changed after we checked it. Check again.`);
        // Lift the preview first: the write is checked against the page as source made it, then the page shows the
        // written words (a dev server's reload, or the homepage's replay). If the write is refused, the preview returns.
        if (t.node.isConnected) t.node.data = t.lead + t.from + t.trail;
        try { this.wrote(await post('apply-text', { file: s.file, hash: now.hash, run: run.id, from: t.from, to: t.to }), `Wrote “${t.to}” to ${s.file.split('/').pop()}`); }
        catch (error) { if (t.node.isConnected) t.node.data = t.lead + t.to + t.trail; throw error; }
      }
      await this.#reread(p, classes, text, texts.length > 0);
    } catch (error) {
      try { sessionStorage.removeItem(RESUME); } catch {}
      const stale = /changed since/i.test(error.message);
      p.status = { kind: 'error', stale, text: stale ? 'The file changed since React Plumber read it.' : error.message };
      this.#updateSync();
    }
  }

  // After a write the dev server reloads the element with its new classes. Lift the preview once the page carries the
  // change itself, then read the element again so the reading reflects source, not the preview.
  async #reread(p, classesBefore, wrote, wroteText = false) {
    const afterWrite = classesBefore !== undefined;
    this.#cache = new WeakMap();
    this.#marksCache = new WeakMap();
    if (afterWrite && p.state?.file) this.#blueprint?.invalidate({ file: p.state.file });
    for (const [n, wait] of (afterWrite ? TIMING.reread : [0]).entries()) {
      await new Promise(r => setTimeout(r, wait));
      if (this.#pinned !== p) return;
      // Until the page carries the new classes, the preview is the only thing showing the change.
      const reloaded = wroteText || p.element.getAttribute('class') !== classesBefore || n === TIMING.reread.length - 1;
      if (afterWrite && !reloaded) continue;
      const next = await this.read(p.element, true);
      if (next.status !== 'ready') continue;
      if (afterWrite && next.hash === p.state.hash) continue;
      p.texts.clear(); // the page now carries the written text itself: don't put the old words back
      this.#restore(p); p.original.clear(); p.before = false;
      p.state = structuredClone(next); p.active = 0; p.status = afterWrite ? { kind: 'written', text: wrote } : null;
      this.#renderWidget();
      return;
    }
    // Source has the edit but the page never reloaded it: keep the preview so the page still shows it, and say so.
    if (afterWrite && this.#pinned === p) { p.status = { kind: 'written', text: `${wrote}. Reload to see it from source.` }; this.#updateSync(); }
  }

  // ── hand-over ────────────────────────────────────────────
  #copy(button) {
    const s = this.#pinned.state;
    const lines = s.marks.filter(m => m.ledger === 'new').map(m => {
      const where = `${s.file}:${m.line}:${m.column}`, c = m.pick !== null ? m.choices[m.pick] : null;
      if (c?.edit) return `- ${where}: replace \`${c.edit.from}\` with \`${c.edit.to}\` (${c.label}${c.why ? ': ' + c.why : ''}).`;
      if (m.choices.length) return `- ${where}: ${m.title.replace(/`/g, '')}. Choose a token by its reason: ${m.choices.map(c => `${c.label}${c.why ? ' (' + c.why + ')' : ''}`).join(', ')}.`;
      return `- ${where}: ${m.title.replace(/`/g, '')}. No token is close: stop and report NEEDS-DECISION with the value you wanted.`;
    });
    const text = [`React Plumber found ${lines.length} thing${lines.length === 1 ? '' : 's'} on <${s.tag}>${s.component ? ' in ' + s.component : ''} (${s.file}:${s.line}).`, ...lines, '',
      'Do not edit the React Plumber config, .plumber/ledger.jsonl or the theme to make these pass. Run `plumber check --changed --agent` after editing.'].join('\n');
    this.#copyText(button, text);
  }

  async #copyText(button, text) {
    const label = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied ✓'; }
    catch { button.textContent = 'Copy failed'; }
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1200);
  }

  #$(selector) { return this.#root.querySelector(selector); }
}

customElements.define('plumb-overlay', PlumbOverlay);

export function mountOverlay() {
  const existing = document.querySelector('plumb-overlay');
  if (existing) return existing;
  const overlay = document.createElement('plumb-overlay');
  document.documentElement.append(overlay);
  return overlay;
}

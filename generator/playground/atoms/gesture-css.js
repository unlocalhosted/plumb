// The look of what went wrong in a gesture (gesture.js), as text, so it can go into a page or into a shadow root (the
// plumber site draws its design pages in one). Every value is plumber's own token (overlay/src/tokens.css).
export const GESTURE_CSS = `
/* What went wrong in a gesture: a filmstrip of the button under it, and one line per fault. Every value is plumber's
   own (overlay/src/tokens.css, under .pl-light): coral for what is wrong, mint for nothing wrong, ink for the chosen
   still. */
.atom-stage { position: relative; }
/* the fault on the real, frozen button: a coral hatch with a coral edge, readable on a light ground and a dark one */
.atom-stage > .scrub-paint { position: absolute; inset: 0; width: auto; pointer-events: none; z-index: 5; }
.scrub-fail { position: absolute; border-radius: 3px; box-shadow: 0 0 0 1.5px var(--pl-coral, #bf3a1e), 0 0 0 3px color-mix(in oklab, white 70%, transparent);
  background: repeating-linear-gradient(135deg, color-mix(in oklab, var(--pl-coral, #bf3a1e) 55%, transparent) 0 3px, transparent 3px 7px); }

.scrub { display: grid; gap: 12px; margin: 14px 0 4px; font-family: var(--pl-sans); color: var(--pl-ink);
  opacity: 0; transform: translateY(-6px); transition: opacity 220ms var(--pl-ease-out, ease-out), transform 220ms var(--pl-spring, ease-out); }
.scrub.open { opacity: 1; transform: none; }
/* the strip: stills of the real button through the gesture, read left to right, top to bottom */
.strip { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 6px; }
.still { display: grid; gap: 4px; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; font: inherit; color: inherit; }
.still-view { position: relative; display: block; overflow: hidden; border-radius: 6px; background: var(--pl-paper-2, #f6f6f4);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 8%, transparent); transition: box-shadow 120ms var(--pl-ease-out, ease-out); }
.still-view > .still-stage, .still-view > .still-paint { position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: none; }
.still-stage { display: grid; place-items: center; min-height: 96px; }
.still-paint i { position: absolute; background: repeating-linear-gradient(135deg, color-mix(in oklab, var(--pl-coral) 70%, transparent) 0 4px, transparent 4px 9px); box-shadow: 0 0 0 2px var(--pl-coral); border-radius: 3px; }
.still.bad .still-view { box-shadow: 0 0 0 2px var(--pl-coral); }
.still.on .still-view { box-shadow: 0 0 0 2px var(--pl-paper), 0 0 0 4px var(--pl-ink); }
.still.bad.on .still-view { box-shadow: 0 0 0 2px var(--pl-coral), 0 0 0 4px var(--pl-ink); }
.still:hover .still-view { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-ink) 35%, transparent); }
.still.bad:hover .still-view { box-shadow: 0 0 0 2px var(--pl-coral), 0 0 0 4px color-mix(in oklab, var(--pl-ink) 35%, transparent); }
.still:focus-visible { outline: none; } .still:focus-visible .still-view { box-shadow: 0 0 0 2px var(--pl-paper), 0 0 0 4px var(--pl-sky, #3391ee); }
.still-t { font: 600 10.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
.still.bad .still-t { color: var(--pl-coral); }
/* one line per fault: what, then the fix */
.atom .scrub .faults { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font: 400 12.5px/1.45 var(--pl-sans); color: var(--pl-ink-2); }
.atom .scrub .faults b { color: var(--pl-coral); font-weight: 600; }
.atom .scrub code { font: 500 11.5px ui-monospace, monospace; color: var(--pl-ink); background: var(--pl-paper-2); padding: 1px 4px; border-radius: 4px; white-space: nowrap; }
/* why a movement is the way it is, when it harms nobody: quiet ink, the source after it */
.atom .scrub .scrub-why { margin: 0; font: 400 12.5px/1.45 var(--pl-sans); color: var(--pl-ink-2); opacity: 1; }
.atom .scrub .scrub-why b { color: var(--pl-ink); font-weight: 600; }
.atom .scrub .scrub-why span { color: var(--pl-ink-3, #b3ad9f); }
/* Keep: a small quiet button at the end of a fault; then a sentence with one blank */
.faults .keep { margin-left: 4px; font: 600 11px/1 var(--pl-sans); border: 0; border-radius: 6px; padding: 4px 7px; background: var(--pl-paper-2, #f6f6f4); color: var(--pl-ink-2); cursor: pointer; }
.faults .keep:hover { color: var(--pl-ink); }
.keep-why { display: block; font: 400 12.5px/1.6 var(--pl-sans); color: var(--pl-ink); }
.keep-why input { font: inherit; border: 0; border-bottom: 1.5px solid var(--pl-ink); background: none; color: var(--pl-ink); padding: 0 2px; min-width: 12em; outline: none; }
.atom .scrub-clean { margin: 0; font: 600 12.5px/1.4 var(--pl-sans); color: var(--pl-mint); opacity: 1; }
/* the fix: a two-way switch, as it is or with the fix; the side that is on is a solid block, the other quiet */
.scrub-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.fix-switch { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--pl-paper-2, #f6f6f4); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-ink) 8%, transparent); }
.fix-switch button { font: 600 12px/1 var(--pl-sans); border: 0; border-radius: 8px; padding: 7px 11px; background: none; color: var(--pl-ink-2); cursor: pointer;
  transition: background-color 120ms var(--pl-ease-out, ease-out), color 120ms var(--pl-ease-out, ease-out); }
.fix-switch button[aria-checked="true"] { background: var(--pl-ink); color: var(--pl-paper); }
.fix-switch button[data-fix="on"][aria-checked="true"] { background: var(--pl-mint); color: var(--pl-mint-on, #fff); }
.fix-switch button:focus-visible { outline: 2px solid var(--pl-sky, #3391ee); outline-offset: 1px; }
.scrub > .fix-switch { justify-self: start; }
.scrub-live { justify-self: start; font: 600 12px var(--pl-sans); border: 0; border-radius: var(--pl-radius-pill, 999px); padding: 5px 10px; background: var(--pl-paper-2, #f6f6f4); color: var(--pl-ink); cursor: pointer; }
.scrub-live kbd { font: 500 10px ui-monospace, monospace; opacity: .6; margin-left: 4px; }
@media (prefers-reduced-motion: reduce) { .scrub, .still-view { transition: none; } }
`;

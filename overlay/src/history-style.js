// The write history's look (history.js): the toast after a write, and the timeline the dock grows into. Kept apart
// from the behaviour so a page can show the pieces without the code that talks to the dev server.
export const HISTORY_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 4.2A4.25 4.25 0 1 1 1.75 6.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M1.6 1.8v2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3.75V6l1.6 1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

export const HISTORY_CSS = `
  .wt { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4));
    display: flex; align-items: center; gap: var(--pl-space-4); max-width: min(440px, calc(100vw - 2 * var(--pl-space-6))); box-sizing: border-box;
    padding: var(--pl-space-3) var(--pl-space-3) var(--pl-space-3) var(--pl-space-5); pointer-events: auto;
    font: var(--pl-card-meta);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .wt[data-on] { opacity: 1; translate: 0 0; }
  .wt .what { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wt .what code { font: var(--pl-card-code); }
  .wt[data-kind="error"] .what { color: var(--pl-off); white-space: normal; }
  .wt button, .tt button { all: unset; cursor: pointer; padding: 6px var(--pl-space-4); border-radius: var(--pl-radius-row); font: var(--pl-card-label); color: var(--pl-text-primary); white-space: nowrap; }
  .wt button { padding: 3px var(--pl-space-4); color: var(--pl-instrument); }
  :is(.wt, .tt) button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 1px; }
  :is(.wt, .tt) button:disabled { color: var(--pl-text-disabled); cursor: default; }
  @media (hover: hover) and (pointer: fine) { :is(.wt, .tt) button:not(:disabled):hover { background: var(--pl-bg-surface-hover); } }

  /* the timeline: the dock grown into a strip, same corner */
  .tt { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: var(--pl-space-6); box-sizing: border-box; pointer-events: auto;
    width: min(760px, calc(100vw - 2 * var(--pl-space-6))); display: flex; align-items: flex-end; gap: var(--pl-space-5);
    padding: var(--pl-space-4) var(--pl-space-4) var(--pl-space-4) var(--pl-space-5); }
  .tt[hidden] { display: none; }
  /* the strip settles where the dock is: the start corner, or the middle when both corners are taken */
  :host([data-side="start"]) .tt { inset-inline-end: auto; inset-inline-start: var(--pl-space-6); }
  :host([data-side="center"]) :is(.tt, .wt) { inset-inline-end: auto; inset-inline-start: 50%; translate: -50% 0; }
  :host([data-side="center"]) .wt:not([data-on]) { translate: -50% 4px; }
  /* in the past: the page isn't current, and the strip says so at its edge */
  .tt[data-past] { box-shadow: var(--pl-shadow-card), 0 0 0 2px color-mix(in oklab, var(--pl-instrument) 55%, transparent); }
  .tt .tt-glyph { flex: none; align-self: center; width: 20px; height: 20px; display: grid; place-items: center; color: var(--pl-text-secondary); }
  .tt .tt-glyph svg, .tt .tt-x svg { width: 14px; height: 14px; }
  .tt .tt-track { position: relative; flex: 0 1 auto; min-width: 0; overflow-x: auto; overflow-y: visible; scrollbar-width: none; outline: none; padding-top: 6px; touch-action: pan-x; cursor: default; }
  .tt .tt-track::-webkit-scrollbar { display: none; }
  /* focus is shown where the keys act: a ring around the playhead's knob */
  .tt .tt-track:focus-visible .tt-head::before { box-shadow: 0 0 0 2px var(--pl-bg-surface), 0 0 0 4px var(--pl-instrument); }
  .tt .tt-steps { position: relative; display: flex; align-items: flex-end; gap: var(--pl-space-6); padding: 0 var(--pl-space-2); width: max-content; }
  .tt .tt-seg { display: flex; flex-direction: column; gap: var(--pl-space-3); }
  .tt .tt-seg .tt-name { font: var(--pl-card-label); color: var(--pl-text-secondary); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .tt .tt-ticks { display: flex; align-items: flex-end; gap: 6px; height: 20px; padding: 0 2px 3px; border-bottom: 1px solid var(--pl-border-default); }
  .tt .tt-tick { flex: none; width: 2px; height: 14px; border-radius: 1px; background: var(--pl-text-primary); transform-origin: bottom;
    transition: height var(--pl-dur-feedback) var(--pl-ease-out), background-color var(--pl-dur-feedback), box-shadow var(--pl-dur-feedback); }
  .tt .tt-tick[data-state="undone"] { width: 4px; background: transparent; box-shadow: inset 0 0 0 1px var(--pl-icon-tick); }
  .tt .tt-tick[data-state="changed"] { width: 4px; background: repeating-linear-gradient(-45deg, var(--pl-soft) 0 1.5px, var(--pl-soft-bg) 1.5px 3px); }
  .tt .tt-tick[data-undo] { position: relative; }
  .tt .tt-tick[data-undo]::before { content: ""; position: absolute; top: -3px; left: -2px; width: 3px; height: 2px; border-top: 1px solid currentColor; border-left: 1px solid currentColor; color: var(--pl-icon-primary); }
  .tt .tt-tick[data-ahead] { width: 4px; background: transparent; box-shadow: inset 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"] { height: 18px; }
  .tt .tt-tick[aria-current="true"]:not([data-state="undone"]):not([data-state="changed"]) { background: var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"][data-state="undone"] { box-shadow: inset 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"][data-state="changed"] { box-shadow: 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick.ghost { background: var(--pl-bg-inset); animation: tt-ghost 1.2s ease-in-out infinite alternate; }
  .tt .tt-tick.busy { animation: tt-ghost 600ms ease-in-out infinite alternate; }
  .tt .tt-tick.shake { animation: tt-shake 160ms ease-in-out 2; }
  .tt .tt-tick.enter { animation: tt-enter 280ms var(--pl-spring-pop) both; }
  @media (hover: hover) and (pointer: fine) { .tt .tt-tick:not(.ghost):hover { height: 16px; } }
  .tt .tt-head { position: absolute; left: 0; bottom: -4px; width: 1px; height: 26px; background: var(--pl-instrument); box-shadow: 0 0 0 1px var(--pl-halo); pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out); }
  .tt .tt-head::before { content: ""; position: absolute; top: -4px; left: -4px; width: 9px; height: 9px; border-radius: 50%; background: var(--pl-instrument); box-shadow: 0 0 0 2px var(--pl-bg-surface); }
  .tt .tt-now { flex: none; margin-inline-end: auto; padding-bottom: 3px; font: var(--pl-card-label); color: var(--pl-text-secondary); }
  .tt .tt-pill { position: absolute; bottom: calc(100% + var(--pl-space-4)); left: 0; max-width: calc(100vw - 2 * var(--pl-space-6)); box-sizing: border-box;
    padding: 4px var(--pl-space-4); border-radius: var(--pl-radius-tag); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-tag);
    font: var(--pl-card-code); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out), opacity var(--pl-dur-feedback); }
  .tt .tt-pill[hidden] { display: none; }
  .tt .tt-pill .tt-kind { font: var(--pl-card-meta); color: var(--pl-text-secondary); margin-inline-end: var(--pl-space-3); }
  .tt .tt-pill .tt-law { font: var(--pl-card-meta); color: var(--pl-lilac); margin-inline-start: var(--pl-space-3); }
  .tt .tt-pill[data-kind="warn"] { font: var(--pl-card-meta); white-space: normal; max-width: min(360px, calc(100vw - 2 * var(--pl-space-6))); box-shadow: 0 0 0 1px var(--pl-soft), 0 2px 6px -2px rgb(28 27 25 / 0.24); }
  .tt .tt-pill[data-kind="error"] { font: var(--pl-card-meta); white-space: normal; color: var(--pl-off); }
  .tt .tt-say { align-self: center; margin-inline-end: auto; font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .tt .tt-acts { flex: none; align-self: center; display: flex; gap: var(--pl-space-2); }
  .tt .tt-acts button[hidden] { display: none; }
  .tt .tt-acts button.primary { background: var(--pl-action-soft); color: var(--pl-on-action); }
  @media (hover: hover) and (pointer: fine) { .tt .tt-acts button.primary:not(:disabled):hover { background: color-mix(in oklab, var(--pl-action-soft) 80%, var(--pl-action)); } }
  .tt .tt-acts kbd { margin-inline-start: var(--pl-space-3); font: 500 10px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  .tt .tt-acts button:disabled kbd { color: var(--pl-text-disabled); }
  @media (pointer: coarse) { .tt .tt-acts kbd { display: none; } }
  .tt .tt-x { flex: none; align-self: center; width: 28px; height: 28px; padding: 0 !important; display: grid; place-items: center; color: var(--pl-text-secondary) !important; }
  /* the pointed change's elements, outlined the way every instrument line is: sky with a halo */
  .tt-marks { position: fixed; inset: 0; pointer-events: none; }
  .tt-marks[hidden] { display: none; }
  .tt-mark { position: fixed; left: 0; top: 0; box-sizing: border-box; border: 1px solid var(--pl-instrument); border-radius: var(--pl-radius-tag);
    box-shadow: 0 0 0 1px var(--pl-halo), inset 0 0 0 1px var(--pl-halo); pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out), width var(--pl-dur-travel) var(--pl-ease-out), height var(--pl-dur-travel) var(--pl-ease-out), opacity var(--pl-dur-feedback); }
  .tt-mark.enter { animation: tt-mark-in var(--pl-dur-card) var(--pl-ease-out) both; }
  .tt .tt-pill .tt-where { font: var(--pl-card-meta); color: var(--pl-text-secondary); margin-inline-start: var(--pl-space-3); }
  @keyframes tt-mark-in { from { opacity: 0; scale: 1.04; } }
  @keyframes tt-ghost { from { opacity: 0.45; } to { opacity: 1; } }
  @keyframes tt-shake { 25% { translate: -2px 0; } 75% { translate: 2px 0; } }
  @keyframes tt-enter { from { transform: scaleY(0.6); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .wt { transition: none; translate: 0 0; }
    .tt .tt-tick, .tt .tt-head, .tt .tt-pill, .tt-mark { transition: none; }
    .tt-mark.enter { animation: none; }
    .tt .tt-tick.shake, .tt .tt-tick.enter, .tt .tt-tick.busy { animation: none; }
  }
`;

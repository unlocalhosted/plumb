// The fix bar's fill-in parts: its two buttons, its note, and the field you type a name or a reason into, with the
// hint under it and the row of actions. The fix bar (fixpanel.js) puts each block back where it always stood in its
// stylesheet, so nothing about it changes; the design site's Inputs page draws the same field from here.
export const SPRING = 'cubic-bezier(.3, 1.35, .5, 1)';
export const FIX_BUTTONS_CSS = `
  .fx .primary { height: 32px; padding: 0 12px 0 14px; border-radius: 11px; background: var(--pl-text-primary); color: var(--pl-bg-surface); font-weight: 550; display: inline-flex; align-items: center; gap: 6px;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / .12), 0 1px 2px rgb(0 0 0 / .2); transition: transform 160ms ${SPRING}, opacity 160ms; }
  .fx .primary:active { transform: scale(.97); } .fx .primary kbd { color: color-mix(in oklab, var(--pl-bg-surface) 55%, transparent); } .fx .primary[disabled] { opacity: .28; cursor: default; }
  .fx .ghost { height: 32px; padding: 0 10px; border-radius: 10px; color: var(--pl-text-secondary); display: inline-flex; align-items: center; gap: 5px; }
  .fx .ghost:hover { background: var(--pl-bg-surface-hover); }`;
export const FIX_NOTE_CSS = `
  .fx .note { margin: 2px 18px 0; padding: 8px 10px; border-radius: 10px; background: var(--pl-bg-inset); color: var(--pl-text-secondary); font-size: 12px; line-height: 1.45; }
  .fx .note code { font: 600 11.5px/1 ui-monospace, monospace; color: var(--pl-text-primary); }
  .fx .say { padding: 8px 18px 14px; color: var(--pl-text-secondary); max-width: 52ch; }
  .fx .say.err { color: var(--pl-text-hard-coded); }`;
export const FIX_FIELD_CSS = `
  .fx .field { display: flex; align-items: center; gap: 0; margin: 8px 18px 2px; height: 34px; padding: 0 10px; border-radius: 10px; background: var(--pl-bg-surface);
    box-shadow: inset 0 0 0 1px var(--pl-border-default); font: 500 12.5px/1 ui-monospace, monospace; color: var(--pl-text-secondary); transition: box-shadow 140ms; }
  .fx .field:focus-within { box-shadow: inset 0 0 0 1.5px var(--pl-text-primary); }
  .fx .field[data-invalid] { box-shadow: inset 0 0 0 1.5px var(--pl-text-hard-coded); }
  .fx .field input { all: unset; min-width: 4ch; color: var(--pl-text-primary); font: inherit; }
  .fx .field.why input { flex: 1; }
  .fx .field input::placeholder { color: var(--pl-text-placeholder); }
  /* the field's own ring says where the caret is; the input inside doesn't draw a second one */
  .fx .field input:focus-visible { outline: none; }
  .fx .field.why { gap: 6px; font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; } .fx .field.why input { font: inherit; }
  .fx .hint { margin: 4px 18px 0; color: var(--pl-text-secondary); font-size: 12px; min-height: 16px; }
  .fx .hint code { font: 600 11.5px/1 ui-monospace, monospace; color: var(--pl-text-primary); }
  .fx .hint.err { color: var(--pl-text-hard-coded); }
  .fx .acts { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; margin-top: 4px; border-top: .5px solid var(--pl-border-default); }`;

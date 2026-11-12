// The fix bar's fill-in parts: its two buttons, its note, and the field you type a name or a reason into, with the
// hint under it and the row of actions, and the few lines that say a field's state. The fix bar (fixpanel.js) puts each
// block where it always stood in its stylesheet; the design site's Inputs page draws the same field from here.
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
// The field is a well: pressed into the bar, the opposite of a soft block, lit on its lower lip. A name's blank is a
// lilac slot (names are lilac) that grows on a spring as it is typed; a good value gets a mint tick that pops in, and
// a bad name turns the slot coral with one small shake when it turns bad (and again when Enter is pressed on it).
export const FIX_FIELD_CSS = `
  .fx .field { position: relative; display: flex; align-items: center; gap: 0; margin: 8px 18px 2px; height: 40px; padding: 0 38px 0 12px; border-radius: var(--pl-radius-card);
    background: var(--pl-bg-inset); box-shadow: inset 0 2px 3px -1px rgb(0 0 0 / .16), inset 0 0 0 1px rgb(0 0 0 / .05), 0 1px 0 rgb(255 255 255 / .7);
    font: 500 12.5px/1 ui-monospace, monospace; color: var(--pl-text-secondary); white-space: nowrap; cursor: text; }
  .fx[data-scheme="dark"] .field, :host([data-scheme="dark"]) .fx:not([data-scheme="light"]) .field {
    box-shadow: inset 0 2px 4px -1px rgb(0 0 0 / .5), inset 0 0 0 1px rgb(255 255 255 / .04), 0 1px 0 rgb(255 255 255 / .06); }
  .fx .field .val { flex: 0 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .fx .field .slot { flex: none; }
  .fx .field input { all: unset; min-width: 1ch; color: var(--pl-text-primary); font: inherit; }
  .fx .field input::placeholder { color: var(--pl-text-placeholder); }
  /* the field's own ring says where the caret is; the input inside doesn't draw a second one */
  .fx .field input:focus-visible { outline: none; }
  /* a name: the blank is a lilac slot that grows with what is typed */
  .fx .field .slot { display: inline-flex; margin: 0 2px; padding: 4px 7px; border-radius: var(--pl-radius-tag); background: var(--pl-lilac-soft); color: var(--pl-lilac-ink);
    transition: background-color 160ms var(--pl-ease-out), color 160ms var(--pl-ease-out), box-shadow 140ms var(--pl-ease-out); }
  .fx .field .slot input { width: var(--w, 6ch); color: inherit; font-weight: 600; caret-color: var(--pl-lilac); transition: width 260ms var(--pl-spring-pop); }
  .fx .field .slot input::placeholder { color: color-mix(in oklab, currentColor 50%, transparent); }
  .fx .field:focus-within .slot { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
  .fx .field[data-invalid] .slot { background: var(--pl-coral-soft); color: var(--pl-coral-ink); }
  .fx .field[data-invalid]:focus-within .slot { box-shadow: 0 0 0 2px color-mix(in oklab, var(--pl-coral) 45%, transparent); }
  .fx .field[data-shake] .slot { animation: pl-field-shake 260ms var(--pl-ease-out); }
  @keyframes pl-field-shake { 25% { translate: -3px 0; } 60% { translate: 2px 0; } }
  /* a reason: the whole well is the blank, in the reading face */
  .fx .field.why { gap: 6px; font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; }
  .fx .field.why input { flex: 1; caret-color: var(--pl-lilac); }
  .fx .field.why:focus-within { outline: 2px solid color-mix(in oklab, var(--pl-lilac) 45%, transparent); outline-offset: 0; }
  /* good to go: a mint tick pops in at the end of the well */
  .fx .field .ok-tick { position: absolute; right: 10px; top: 50%; width: 20px; height: 20px; margin-top: -10px; border-radius: 50%; background: var(--pl-mint); scale: 0; opacity: 0;
    transition: scale 320ms var(--pl-spring-pop), opacity 120ms var(--pl-ease-out); }
  .fx .field .ok-tick::after { content: ''; position: absolute; left: 7px; top: 4px; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; rotate: 45deg; }
  .fx .field[data-ok] .ok-tick { scale: 1; opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .fx .field .slot, .fx .field .slot input, .fx .field .ok-tick { transition: none; } .fx .field[data-shake] .slot { animation: none; } }
  .fx .hint { margin: 4px 18px 0; color: var(--pl-text-secondary); font-size: 12px; min-height: 16px; }
  .fx .hint code { font: 600 11.5px/1 ui-monospace, monospace; color: var(--pl-text-primary); }
  .fx .hint.err { color: var(--pl-text-hard-coded); }
  .fx .acts { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; margin-top: 4px; border-top: .5px solid var(--pl-border-default); }`;


// What a field says about its value, from one place: a mint tick when it is good, a coral slot when it is bad, and one
// small shake the moment it turns bad (not on every key after)
export function fieldSays(field, { ok = false, bad = false } = {}) {
  if (!field) return;
  const was = field.hasAttribute('data-invalid');
  field.toggleAttribute('data-ok', ok);
  field.toggleAttribute('data-invalid', bad);
  if (bad && !was) shake(field);
}
// one shake, again from the start (Enter pressed on a bad name)
export function shake(field) {
  if (!field) return;
  field.removeAttribute('data-shake'); void field.offsetWidth; field.setAttribute('data-shake', '');
}
// a name's slot fits what is typed (mono: one ch a letter), or the example when it is empty
export const fit = (input) => input?.style.setProperty('--w', `${Math.max(2, (input.value || input.placeholder || '').length) + 0.5}ch`);
export const fitFor = (text) => `--w:${Math.max(2, String(text ?? '').length) + 0.5}ch`;

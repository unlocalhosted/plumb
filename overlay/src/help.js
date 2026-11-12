/* ─────────────────────────────────────────────────────────
 * HELP · React Plumber overlay
 *
 * Every gesture in one place, and a word the first time each mode is used, so nobody has to read a brief to find
 * Alt + double-click or J/K (docs/briefs/editor-roadmap.md, DX).
 *
 *  sheet   the dock's ? button, or ? anywhere the page isn't being typed in: a card above the dock listing the gestures
 *          by what you're doing (inspect, edit text, blueprint). Esc or ? again closes it; it rises from the
 *          dock's corner
 *  hint    the first time blueprint is turned on, the first time Alt is held, and the first time words are edited, one
 *          line above the dock says what to do next. Each is said once per browser (localStorage; when storage is
 *          unavailable it is said once per page load) and goes after a few seconds or at the next key or click
 *          anywhere: a tip never stands in the way of what the person does next, so it takes no key, Esc included
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

export const HELP_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M4.6 4.6a1.45 1.45 0 1 1 2 1.35c-.4.18-.6.48-.6.9v.35" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="6" cy="8.85" r=".7" fill="currentColor"/></svg>';

const KEYS = [
  ['Inspect', [
    ['Alt', 'Hold to inspect what’s under the pointer'],
    ['Alt + click', 'Show its problems in Blueprint'],
    ['Alt + two-finger scroll', 'Up to the parent, down to the child'],
  ]],
  ['Edit text', [
    ['Double-click', 'Edit text in place'],
    ['Alt + double-click', 'Edit text in a button, card or link'],
    ['↵ or click away', 'Apply the edit'],
    ['Esc', 'Undo the edit'],
  ]],
  ['Blueprint', [
    ['Alt + B', 'Turn on or off'],
    ['↵', 'Start, then fix it in your code'],
    ['←  →', 'Previous or next fix'],
    ['↑  ↓', 'Try another option'],
    ['K', 'Keep as is'],
    ['Space', 'Hold to use the page'],
  ]],
];

const HINTS = {
  blueprint: 'Click anything to fix it · ← → next fix · hold Space to use the page',
  inspect: 'Click to show its problems · two-finger scroll walks up and down · double-click text to edit it',
  words: '↵ or click away to apply · Esc to undo',
};
const HOLD = 6000;

export const HELP_CSS = `
  .hp { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4)); width: 340px;
    max-width: calc(100vw - 2 * var(--pl-space-6)); max-height: calc(100vh - 2 * var(--pl-space-6) - var(--pl-tag-h) - var(--pl-space-4)); overflow-y: auto; overscroll-behavior: contain;
    pointer-events: auto;
    padding: var(--pl-space-5) var(--pl-space-5) var(--pl-space-4); box-sizing: border-box; opacity: 0; translate: 0 4px;
    transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .hp[data-on] { opacity: 1; translate: 0 0; }
  .hp .title { font: var(--pl-card-title); margin-bottom: var(--pl-space-3); }
  .hp h3 { margin: var(--pl-space-4) 0 var(--pl-space-2); font: var(--pl-card-label); letter-spacing: var(--pl-tracking-caps); text-transform: uppercase; color: var(--pl-text-secondary); }
  .hp dl { display: grid; grid-template-columns: 11.5em 1fr; column-gap: var(--pl-space-5); row-gap: var(--pl-space-2); margin: 0; }
  .hp dt { font: var(--pl-card-code); color: var(--pl-text-primary); white-space: nowrap; }
  .hp dd { margin: 0; font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .tip { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4)); max-width: min(440px, calc(100vw - 2 * var(--pl-space-6)));
    display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-3) var(--pl-space-3) var(--pl-space-3) var(--pl-space-5); box-sizing: border-box; pointer-events: auto;
    font: var(--pl-card-meta);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .tip[data-on] { opacity: 1; translate: 0 0; }
  .tip button { all: unset; cursor: pointer; padding: 3px var(--pl-space-4); border-radius: var(--pl-radius-tag); font: var(--pl-card-label); color: var(--pl-text-secondary); }
  .tip button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 1px; }
  @media (hover: hover) and (pointer: fine) { .tip button:hover { background: var(--pl-bg-surface-hover); color: var(--pl-text-primary); } }
  @media (prefers-reduced-motion: reduce) { .hp, .tip { transition: none; translate: 0 0; } }
`;

const store = {
  seen(key) { try { return localStorage.getItem(`plumb:hint:${key}`) === '1'; } catch { return false; } },
  mark(key) { try { localStorage.setItem(`plumb:hint:${key}`, '1'); } catch {} },
};

export class Help {
  #sheet; #hint; #button; #avoid; #quiet; #said = new Set(); #timer = 0; #fit = 0;

  // button: the dock's ? button
  // avoid() → the rects the hint never covers (the fix bar): it sits above them, as they are now (a bar that appears or
  // grows after the hint is said moves it up); quiet() → true while something else owns the screen (a card): the tip goes
  constructor(root, { button, avoid, quiet }) {
    this.#button = button; this.#avoid = avoid; this.#quiet = quiet;
    this.#sheet = Object.assign(document.createElement('section'), { className: 'hp pl-card', hidden: true });
    this.#sheet.setAttribute('role', 'dialog');
    this.#sheet.setAttribute('aria-label', 'Keyboard shortcuts');
    this.#sheet.tabIndex = -1;
    this.#sheet.innerHTML = `<div class="title">Keyboard shortcuts</div>${KEYS.map(([head, rows]) => `<h3>${esc(head)}</h3><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`).join('')}`;
    this.#hint = Object.assign(document.createElement('div'), { className: 'tip pl-card', hidden: true });
    this.#hint.setAttribute('role', 'status');
    root.append(this.#sheet, this.#hint);
    button.addEventListener('click', () => this.toggle());
    this.#hint.addEventListener('click', (e) => { if (e.target.closest('button')) this.#unhint(); });
  }

  get open() { return !this.#sheet.hidden; }
  occluders() { return [this.#sheet, this.#hint].filter((e) => !e.hidden).map((e) => e.getBoundingClientRect()); }

  toggle(on = !this.open) {
    this.#button.setAttribute('aria-pressed', String(on));
    if (!on) { this.#sheet.removeAttribute('data-on'); this.#sheet.hidden = true; return; }
    this.#unhint();
    this.#sheet.hidden = false;
    requestAnimationFrame(() => this.#sheet.setAttribute('data-on', ''));
    this.#sheet.focus({ preventScroll: true });
  }

  // The first time a mode is used: one line about what to do next.
  hint(key) {
    if (this.#said.has(key) || store.seen(key) || this.open || this.#quiet?.()) return;
    this.#said.add(key);
    store.mark(key);
    clearTimeout(this.#timer);
    this.#hint.innerHTML = `<span>${esc(HINTS[key])}</span><button type="button" aria-label="Dismiss">Got it</button>`;
    this.#hint.hidden = false;
    this.#place();
    // the surfaces it keeps clear of come and go while it shows (Blueprint's bar arrives after the Alt that said it)
    clearInterval(this.#fit); this.#fit = setInterval(() => this.#place(), 120);
    requestAnimationFrame(() => this.#hint.setAttribute('data-on', ''));
    this.#timer = setTimeout(() => this.#unhint(), HOLD);
    // the next thing the person does takes the tip away (after this task, so the key that opened the mode doesn't)
    setTimeout(() => { addEventListener('keydown', this.#unhint, true); addEventListener('pointerdown', this.#unhint, true); }, 0);
  }
  #place() {
    if (this.#hint.hidden) return clearInterval(this.#fit);
    if (this.#quiet?.()) return this.#unhint();
    this.#hint.style.removeProperty('inset-block-end');
    const r = this.#hint.getBoundingClientRect(), over = (this.#avoid?.() ?? []).filter((a) => a?.width && r.left < a.right && a.left < r.right && r.top < a.bottom && a.top < r.bottom);
    if (over.length) this.#hint.style.insetBlockEnd = `${innerHeight - Math.min(...over.map((a) => a.top)) + 8}px`;
  }
  #unhint = () => {
    clearInterval(this.#fit);
    removeEventListener('keydown', this.#unhint, true);
    removeEventListener('pointerdown', this.#unhint, true);
    clearTimeout(this.#timer);
    this.#hint.removeAttribute('data-on');
    this.#hint.hidden = true;
  };

  // Esc closes the sheet first. True when used.
  escape() {
    if (this.open) return this.toggle(false), true;
    return false;
  }
}

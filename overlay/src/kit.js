// The kit's shared parts, in the new visual language (docs/design/visual-language.md): one place for every page of
// the kit to take them from, so no page draws its own. Proposed: beside the demo until approved, then into overlay/src.
//
//   import { BUTTON_CSS, button } from './kit-parts.js';

/** The toy button's styles (see kit-buttons.html for every state). */
export const BUTTON_CSS = `
    /* ── the toy button (proposed; would replace .pl-act) ─────────────────────────────────────────────────────
       A soft block, small (overlay/src/soft.js). Two parts: the side (the button's own darker shade) and the top
       (the solid hue, the label on it). At rest the top sits 4px above the side. Pointed at, it rises to 6. Pressed,
       it goes down onto its side and squashes a hair wider; let go, it springs back as one body. The side never
       moves, so nothing around the button shifts. */
    .tb { --hue: var(--pl-pink-block); --base: color-mix(in oklab, var(--pl-pink-block) 70%, #000); --on: var(--pl-pink-block-on); --lift: 4px; --h: 36px;
      all: unset; position: relative; display: inline-block; box-sizing: border-box; height: calc(var(--h) + 4px); padding-top: 4px; border-radius: 13px; cursor: pointer;
      background: linear-gradient(180deg, transparent 25%, var(--base) 60%); font: var(--pl-round-w2, 700) 13.5px/1 var(--pl-round); letter-spacing: 0.005em; color: var(--on); -webkit-tap-highlight-color: transparent; user-select: none;
      box-shadow: 0 9px 12px -8px color-mix(in oklab, var(--hue) 75%, transparent); transition: box-shadow 240ms var(--pl-ease-out); }
    /* the top is lit from above: a bright rim on its top edge, a darker one on its bottom. It is anchored at its
       bottom edge, because it is pressed down against its side (the press itself: overlay/src/soft.js) */
    .tb .top { display: flex; align-items: center; justify-content: center; gap: 7px; height: var(--h); padding: 0 14px; box-sizing: border-box; border-radius: 13px;
      background: linear-gradient(180deg, color-mix(in oklab, var(--hue) 88%, #fff), var(--hue));
      box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 45%, transparent), inset 0 -2px 0 0 color-mix(in oklab, #000 12%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transform-origin: 50% 100%; transition: transform 300ms var(--pl-spring-pop), background-color 200ms var(--pl-ease-out); white-space: nowrap; will-change: transform; }
    .tb:hover, .tb[data-show="hover"] { --lift: 6px; box-shadow: 0 14px 16px -10px color-mix(in oklab, var(--hue) 75%, transparent); }
    .tb.down, .tb[data-show="pressed"] { box-shadow: 0 3px 5px -4px color-mix(in oklab, var(--hue) 75%, transparent); }
    /* shown pressed, for a page of states: the pose a held button has */
    .tb[data-show="pressed"] .top { transform: translateY(-0.5px) scale(1.031, 0.948); }
    .tb:focus-visible, .tb[data-show="focus"] { outline: 2.5px solid var(--pl-sky); outline-offset: 3px; }
    /* a key on a button is a small key cap: the same top-and-base, pressed in by default so it reads as part of the top */
    .tb kbd { display: inline-grid; place-items: center; min-width: 19px; height: 19px; padding: 0 5px; margin: 0 -4px 0 1px; box-sizing: border-box; border-radius: 6px;
      font: 600 11px/1 var(--pl-mono); background: color-mix(in oklab, var(--on) 22%, transparent); color: var(--on); box-shadow: 0 1.5px 0 0 color-mix(in oklab, var(--base) 70%, transparent); }
    .tb .ic { display: block; width: 16px; height: 16px; margin-left: -3px; flex: none; }
    .tb .ic svg { display: block; width: 100%; height: 100%; }
    /* kinds: what the button is, by hue (the language's table): pink acts, mint is done, coral is wrong, paper is quiet */
    .tb.quiet { --hue: var(--pl-paper); --base: var(--pl-rule); --on: var(--pl-ink); box-shadow: 0 9px 12px -9px rgb(0 0 0 / .28); }
    .tb.quiet .top { background: linear-gradient(180deg, var(--pl-paper), var(--pl-paper-2)); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }
    .tb.quiet kbd { background: var(--pl-paper-2); color: var(--pl-ink-2); box-shadow: 0 1.5px 0 0 var(--pl-rule); }
    .tb.done { --on: var(--pl-mint-block-on); --hue: var(--pl-mint-block); --base: color-mix(in oklab, var(--pl-mint-block) 70%, #000); }
    .tb.wrong { --on: var(--pl-coral-block-on); --hue: var(--pl-coral-block); --base: color-mix(in oklab, var(--pl-coral-block) 70%, #000); }
    /* not there: pale, flat on its base, nothing to press (the language: pale is for what is not there) */
    .tb:disabled, .tb[data-show="disabled"] { --hue: var(--pl-paper-2); --base: transparent; --on: var(--pl-ink-3); --lift: 0px; cursor: not-allowed; box-shadow: none; }
    .tb:disabled .top, .tb[data-show="disabled"] .top { background: var(--pl-paper-2); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }
    /* working: held down, three dots take turns; the button keeps its width */
    .tb[aria-busy="true"] { --lift: 1px; cursor: progress; box-shadow: 0 3px 5px -4px color-mix(in oklab, var(--hue) 75%, transparent); }
    .tb[aria-busy="true"] .lb, .tb[aria-busy="true"] kbd, .tb[aria-busy="true"] .ic { visibility: hidden; }
    .tb-dots { position: absolute; inset: 4px 0 0; display: none; align-items: center; justify-content: center; gap: 4px; translate: 0 -1px; }
    .tb[aria-busy="true"] .tb-dots { display: flex; }
    .tb-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--on); animation: tb-turn 900ms var(--pl-ease-out) infinite; }
    .tb-dots i:nth-child(2) { animation-delay: 150ms; } .tb-dots i:nth-child(3) { animation-delay: 300ms; }
    @keyframes tb-turn { 0%, 60%, 100% { translate: 0 0; opacity: .55; } 30% { translate: 0 -4px; opacity: 1; } }
    /* it worked: the top turns mint and its tick pops */
    .tb.landed .ic { animation: pl-pop 320ms var(--pl-spring-pop) both; }
    /* sizes */
    .tb.sm { --h: 28px; font-size: 12px; border-radius: 10px; } .tb.sm .top { padding: 0 10px; border-radius: 10px; gap: 5px; }
    .tb.lg { --h: 44px; font-size: 15px; border-radius: 14px; } .tb.lg .top { padding: 0 18px; border-radius: 14px; }
    /* a picture alone: a square, with its name one hover away */
    .tb.only .top { padding: 0; width: var(--h); }
    .tb.only .ic { margin: 0; width: 18px; height: 18px; }
    .tb[data-tip]::after { content: attr(data-tip); position: absolute; left: 50%; bottom: calc(100% + 9px); translate: -50% 4px; padding: 4px 8px; border-radius: 8px; background: var(--pl-ink); color: var(--pl-paper);
      font: 600 11px/1.2 var(--pl-sans); white-space: nowrap; opacity: 0; scale: .92; pointer-events: none; transition: opacity 140ms var(--pl-ease-out), scale 220ms var(--pl-spring-pop), translate 220ms var(--pl-spring-pop); }
    .tb[data-tip]:hover::after, .tb[data-tip]:focus-visible::after { opacity: 1; scale: 1; translate: -50% 0; }
    @media (pointer: coarse) { .tb kbd { display: none; } .tb { --h: 44px; } }
    @media (prefers-reduced-motion: reduce) { .tb .top { transition: none; } .tb-dots i { animation: none; } .tb.landed .ic { animation: none; } }

`;

const kbd = (k) => `<kbd>${k}</kbd>`;
/** A toy button: button('Keep', { cls: 'sm quiet', key: 'K' }). cls: quiet | done | wrong, sm | lg, only. */
export const button = (label, { cls = '', attrs = '', icon = '', key = '' } = {}) => `<button type="button" class="tb ${cls}" ${attrs}><span class="top">${icon ? `<i class="ic">${icon}</i>` : ''}${label ? `<span class="lb">${label}</span>` : ''}${key ? kbd(key) : ''}</span></button>`;

/* ─────────────────────────────────────────────────────────
 * FIX PANEL · React Plumber overlay
 *
 * The one place you act (overlay/demo/fix-flow.html is its drawing). The page shows only heat; everything else is
 * here, docked at the bottom centre, never placed against an element, so nothing can collide.
 *
 * The unit is a cause: one class under one rule, every place it is used. One decision, every place moves.
 *
 *  rest       one line: "8 problems · 7 fixes   Fix ↵"
 *  in hand    the cause's class, what is off in words, its places; its options as specimens (the space drawn as
 *             itself: padding green hatch, margin orange dots, gap purple stripes, type as "Ag", colour as a swatch),
 *             the value it has now among them greyed out and struck through, the pick in an ink ring; Take / Skip
 *  trying     ↑ ↓ or a click on an option: every place of the cause glides to it (inplace.js glide), and its heat
 *             shrinks with it: on the scale, the heat is gone
 *  token      nothing on the theme fits: the option is a new token (craft-recommend.js), and the panel says what
 *             taking it adds to which file
 *  new        nothing on the theme is close (tracking-[0.1em]): Add to theme, named in a field, the class it becomes
 *             said as it is typed; every place takes that class
 *  adopt      a Tailwind default (leading-relaxed): Make it yours, the same variable written into the theme, no source
 *             line changes
 *  keep       any cause: Keep it (K) asks why in one line; the places are recorded as intended and leave the count
 *  note       advice with no exact edit: shown after the causes, never counted as a problem
 *  no fix     the sentence, Keep it and Skip
 *  writing    "Writing it to your code…": a fix is written the moment it is taken
 *  said       above the next fix: what the last one changed and where, with Undo (every write of that fix, newest first)
 *  done       the page is clear: every fixed place clicks into place, the page breathes, a ✓ draws and bursts into
 *             confetti made of the overlay's own pieces, then the panel folds back
 *
 * Keys (while blueprint is on): Enter starts or fixes (written at once) · ↑ ↓ try · K keep it · → Tab skip · ← back · Esc put it down
 * ───────────────────────────────────────────────────────── */
import { TextEditor, TEXT_EDITOR_CSS } from './texteditor.js';
import { burst } from './burst.js'; // a fix landing, in pieces of the visual language
import { SPRING, FIX_BUTTONS_CSS, FIX_NOTE_CSS, FIX_FIELD_CSS, fieldSays, shake, fit, fitFor } from './field.js'; // the fill-in parts, shared with the design site
import { errorIs } from './api.js';
import { ElementCard, ELEMENT_CARD_CSS } from './elementcard.js';
import { esc } from './choices.js';
import { groundIsDark } from './geometry.js';
import { FIX, CLEANUP, written } from './words.js'; // every sentence the panel says
import { docsUrl } from './rule-docs.js'; // where a craft rule is read about
import { Cleanup, CLEANUP_CSS } from './cleanup.js'; // "Clean up this page": the passes, one at a time
import { groupsOf, isNote, placeKey } from './blueprint-panel.js';
import { glide } from './inplace.js'; // the text styles the code is reaching for
import { stampOf, parseStamp, sameStamp, stampNames } from './stamp.js';
import { Scope } from './scope.js';
import { Claims, LEVEL } from './claims.js';

const TIMING = { open: 260, next: 180, click: 60, clickGap: 45, breath: 480, check: 600, fold: 2300 };
const CLICK = { drop: 3, over: -1, ms: 420 };
const BREATH = { scale: 1.006, ms: 620 };
const EASE = 'cubic-bezier(.2, .8, .2, 1)';
const SCALE = 0.62; // px of drawing per px of page, for padding specimens

// the bar's tools (the dock's, pressed through the widget), shown only after ··· (docs/design/one-bar.md: tools stay out of
// sight until asked for)
const BAR_ICON = {
  history: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2.5 2.5v2.5H5"/><path d="M8 5v3l2 1.5"/></svg>',
  help: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1"/><path d="M8 11.3v.2"/></svg>',
  pick: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5"/></svg>',
  more: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
  x: '<svg class="x" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
};

export const FIX_CSS = TEXT_EDITOR_CSS + ELEMENT_CARD_CSS + `
  /* the old pieces this panel replaces stay out of sight */
  .bpp, .cg, .sel { display: none !important; }
  .fx { position: fixed; left: 50%; bottom: 72px; translate: -50% 0; width: 520px; max-width: calc(100vw - 32px); box-sizing: border-box; pointer-events: auto; z-index: 2;
    background: color-mix(in oklab, var(--pl-bg-surface) 82%, transparent); -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6);
    border-radius: 18px; color: var(--pl-text-primary); font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; overflow: hidden;
    box-shadow: 0 0 0 .5px rgb(0 0 0 / .09), 0 1px 1px rgb(0 0 0 / .04), 0 8px 20px -8px rgb(0 0 0 / .14), 0 28px 56px -24px rgb(0 0 0 / .18), inset 0 1px 0 rgb(255 255 255 / .9);
    transition: height ${TIMING.open}ms ${SPRING}; }
  .fx[hidden] { display: none; }
  .fx button:not(.pl-act) { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }
  .fx :not(.pl-act) > kbd { font: 500 10.5px/1 ui-monospace, monospace; color: var(--pl-text-secondary); margin-left: 2px; }
  .fx .line { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 7px 0 16px; }
  .fx .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pl-heat); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-heat) 14%, transparent); flex: none; }
  .fx .count { font-weight: 550; } .fx .count span { color: var(--pl-text-secondary); font-weight: 450; }
  .fx .count .err { color: var(--pl-text-hard-coded); font-weight: 550; }
  .fx .grow { flex: 1; }
  /* the bar at rest (docs/design/one-bar.md): one line, one count, each key on its action; it sits where the dock was */
  .fx[data-rest] { width: min(720px, calc(100vw - 32px)); bottom: var(--pl-space-6, 24px); overflow: visible; }
  /* at rest the panel is the bar alone, and is never narrower than the bar's one line: with its tools out on a wider
     system font (Linux) the last control fell off the edge. The window's width is still the limit */
  .fx[data-rest] { min-width: max-content; }
  .fx .bar { gap: 8px; height: 48px; padding: 0 7px 0 16px; }
  .fx .bar .pl-act { flex: none; }
  .fx .status { position: relative; display: inline-flex; align-items: center; gap: 8px; flex: none; padding: 6px 8px; margin-left: -8px; border-radius: 8px; outline: none; }
  .fx .status:hover, .fx .status:focus-visible { background: var(--pl-bg-surface-hover); }
  .fx .status:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
  .fx .readout { position: absolute; left: 0; bottom: calc(100% + 10px); padding: 8px 12px; border-radius: 12px; background: var(--pl-bg-inset); color: var(--pl-text-secondary);
    box-shadow: 0 0 0 1px var(--pl-border-default), 0 8px 20px -10px rgb(28 27 25 / .3); white-space: nowrap; font-weight: 500; opacity: 0; translate: 0 4px; pointer-events: none;
    transition: opacity 120ms ${SPRING}, translate 120ms ${SPRING}; }
  .fx .status:hover .readout, .fx .status:focus-visible .readout { opacity: 1; translate: 0 0; }
  .fx .quiet-line { flex: 1; min-width: 0; color: var(--pl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fx .notice { display: inline-flex; align-items: center; gap: 8px; flex: none; padding-left: 10px; box-shadow: inset 1px 0 0 var(--pl-border-default); white-space: nowrap; }
  .fx .notice b { color: var(--pl-text-soft); font-weight: 600; }
  .fx .notice .setup { color: var(--pl-state-on-token-text); font-weight: 600; font-size: 12px; }
  .fx .bar .more, .fx .bar .tool { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: var(--pl-icon-secondary); flex: none; }
  .fx .bar .more:hover, .fx .bar .tool:hover, .fx .bar .more[aria-expanded="true"] { background: var(--pl-bg-surface-hover); color: var(--pl-text-primary); }
  .fx .bar .more svg, .fx .bar .tool svg { width: 16px; height: 16px; }
  .fx .bar .tools { display: inline-flex; gap: 2px; animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .fx .bar .bar-close { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 6px; border-radius: 8px; color: var(--pl-text-secondary); font-weight: 600; font-size: 12px; flex: none; }
  .fx .bar .bar-close:hover { background: var(--pl-bg-surface-hover); color: var(--pl-text-primary); }
  .fx .bar .bar-close kbd { display: inline-grid; place-items: center; height: 18px; padding: 0 5px; margin: 0; border-radius: 4px; font: 600 11px/1 var(--pl-mono, ui-monospace, monospace);
    background: var(--pl-bg-inset); box-shadow: inset 0 0 0 1px var(--pl-border-default); color: var(--pl-text-secondary); }
  .fx .bar .bar-close .x { display: none; width: 16px; height: 16px; }
  .fx .bar.has-notice .long { display: none; }
  /* the tools out take the room Close's word had: Esc says it */
  .fx .bar:has(.tools) .bar-close .word { display: none; }
  /* with the tools out, the setup note steps aside too: nothing else in the bar can give, and on a system whose
     text runs wider (Linux, Windows) the tools pushed Close past the bar's edge */
  .fx .bar:has(.tools) .notice { display: none; }
  @media (max-width: 560px) {
    .fx .bar { padding: 0 4px 0 12px; gap: 4px; }
    /* a phone's bar keeps the count, its two actions and Close; the tools are on the dock's mark once Blueprint closes */
    .fx .bar .long, .fx .bar .notice, .fx .bar .more, .fx .bar .tools, .fx .bar .bar-close .word, .fx .bar .bar-close kbd { display: none; }
    .fx .bar .pl-act.quiet kbd { display: none; } .fx .bar .pl-act { padding: 0 11px; }
    .fx .bar .bar-close .x { display: block; }
  }
  @media (prefers-reduced-motion: reduce) { .fx .readout { transition: none; } .fx .bar .tools { animation: none; } }
  ${FIX_BUTTONS_CSS}
  /* the last fix written: what it changed and where, with Undo, above whatever the panel holds next */
  .fx .said { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 14px; border-bottom: .5px solid var(--pl-border-default); color: var(--pl-text-primary); animation: fx-rise 220ms ${EASE} both; }
  .fx .said .tick { width: 14px; height: 14px; flex: none; }
  .fx .said .tick path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .fx .said .t { flex: 1; min-width: 0; font-weight: 550; overflow-wrap: anywhere; }
  .fx .said .undo { height: 28px; }
  .fx .cause { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2px 10px; padding: 16px 12px 4px 18px; }
  .fx .cause .cls { font: 600 14px/1.2 ui-monospace, monospace; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fx .cause .what { grid-column: 2; color: var(--pl-text-secondary); }
  .fx .cause .what > span { white-space: nowrap; } /* it wraps between its parts, never inside one */
  .fx .cause .nav { grid-row: span 2; grid-column: 3; display: flex; align-items: center; gap: 2px; color: var(--pl-text-secondary); font: 500 11.5px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .fx .cause .nav button { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: var(--pl-text-secondary); }
  .fx .cause .nav button:hover { background: var(--pl-bg-surface-hover); }
  ${FIX_NOTE_CSS}
  /* the "i" after a craft finding's name: the glyph sits on the text, its 24px target overhangs the line, never moves it */
  .fx .cause .info { display: inline-grid; place-items: center; width: 24px; height: 24px; margin: -6px -3px -6px 1px; vertical-align: middle; border-radius: 50%;
    color: var(--pl-text-secondary); text-decoration: none; transition: color 120ms, background-color 120ms, transform 160ms ${SPRING}; }
  .fx .cause .info svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.3; stroke-linecap: round; }
  .fx .cause .info .tittle { fill: currentColor; stroke: none; }
  .fx .cause .info:hover { color: var(--pl-text-primary); background: var(--pl-bg-surface-hover); }
  .fx .cause .info:active { transform: scale(.88); background: var(--pl-bg-surface-pressed); }
  .fx .cause .info:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: -2px; color: var(--pl-text-primary); }
  @media (prefers-reduced-motion: reduce) { .fx .cause .info { transition: none; } .fx .cause .info:active { transform: none; } }
  .fx .specimens { display: flex; gap: 6px; padding: 10px 14px 6px; }
  .fx .sp { flex: 1 1 0; min-width: 0; max-width: 104px; margin: 0 auto; display: grid; justify-items: center; gap: 6px; padding: 10px 4px 9px; border-radius: 12px; position: relative;
    --hue: 120 120 120; --space: rgb(var(--hue) / .42); --space-line: rgb(var(--hue) / .35); --word: var(--pl-text-secondary); color: var(--pl-text-secondary); transition: box-shadow 180ms, background 180ms; }
  .fx .sp[data-kind="padding"] { --hue: 26 158 98; } .fx .sp[data-kind="margin"] { --hue: 226 128 10; } .fx .sp[data-kind="gap"] { --hue: 122 92 240; }
  .fx .sp svg { width: 52px; height: 40px; overflow: visible; }
  .fx .sp .space-fill { fill: var(--space); } .fx .sp .space-line { stroke: var(--space-line); } .fx .sp .word { fill: var(--word); }
  .fx .sp .v { font: 600 13px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; color: var(--pl-text-secondary); letter-spacing: -.01em; white-space: nowrap; }
  .fx .sp .tk { font: 500 10.5px/1 ui-monospace, monospace; color: var(--pl-text-secondary); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .fx button.sp:not([aria-pressed="true"]):hover { --space: rgb(var(--hue) / .62); --space-line: rgb(var(--hue) / .5); --word: var(--pl-text-primary); }
  .fx button.sp:not([aria-pressed="true"]):hover .v { color: var(--pl-text-primary); }
  .fx .sp[aria-pressed="true"] { background: var(--pl-bg-surface); --space: rgb(var(--hue)); --space-line: rgb(var(--hue)); --word: var(--pl-text-primary); box-shadow: 0 0 0 1.5px var(--pl-text-primary), 0 1px 2px rgb(0 0 0 / .06), 0 6px 14px -6px rgb(0 0 0 / .18); }
  .fx .sp[aria-pressed="true"] .v { color: var(--pl-text-primary); } .fx .sp[aria-pressed="true"] .tk { color: var(--pl-text-secondary); }
  .fx .sp.off { opacity: .45; cursor: not-allowed; --space: var(--pl-icon-disabled); --space-line: var(--pl-border-default); --word: var(--pl-text-disabled); }
  .fx .sp.off .v { text-decoration: line-through; text-decoration-thickness: 1px; }
  .fx .sp .swatch { width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); margin: 7px 0; }
  .fx button:focus-visible, .fx input:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: 2px; }
  ${FIX_FIELD_CSS}
  .fx .body { animation: fx-slide ${TIMING.next}ms ${EASE} both; }
  @keyframes fx-slide { from { opacity: 0; translate: 10px 0; } }
  .fx .writing { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 16px; color: var(--pl-text-secondary); }
  .fx .writing i { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--pl-icon-primary); border-top-color: transparent; animation: fx-spin .7s linear infinite; }
  @keyframes fx-spin { to { rotate: 1turn; } }
  .fx .done { justify-content: center; gap: 8px; padding: 0 16px; }
  .fx .check { width: 18px; height: 18px; }
  .fx .check path { fill: none; stroke: var(--pl-icon-primary); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 16; stroke-dashoffset: 16; animation: fx-draw 340ms ${TIMING.check}ms ${EASE} forwards; }
  .fx .done .words { font-weight: 600; opacity: 0; animation: fx-rise 280ms ${TIMING.check + 160}ms ${EASE} forwards; }
  @keyframes fx-draw { to { stroke-dashoffset: 0; } }
  @keyframes fx-rise { from { opacity: 0; translate: 0 2px; } to { opacity: 1; translate: 0 0; } }
  canvas.fx-burst { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 3; }
  @media (prefers-reduced-motion: reduce) { .fx, .fx .sp { transition: none; } .fx .body { animation: none; } .fx .check path { animation: none; stroke-dashoffset: 0; } .fx .done .words { animation: none; opacity: 1; } }
  /* on a dark page the bar takes the night palette (pl-dark, set with the page's ground); only its shadow is its own */
  .fx.pl-dark { box-shadow: 0 0 0 .5px rgb(255 255 255 / .12), 0 8px 20px -8px rgb(0 0 0 / .5), 0 28px 56px -24px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 255 255 / .06); }
${CLEANUP_CSS}
`;

// What kind of thing a mark's value is, for its specimen
function kindOf(mark) {
  const p = (mark?.props ?? []).join(' ');
  if (/padding/.test(p)) return 'padding';
  if (/margin/.test(p)) return 'margin';
  if (/gap/.test(p)) return 'gap';
  if (/font-size|font-weight|letter-spacing|line-height/.test(p)) return 'type';
  if (/color|background/.test(p) || mark?.family === 'color') return 'colour';
  if (/radius/.test(p)) return 'radius';
  if (/duration|delay/.test(p) || mark?.family === 'motion') return 'time';
  return 'value';
}

let hatchN = 0;
// An option drawn as what it is (overlay/demo/fix-flow.html): the space hatched in its property's own pattern, the
// content blank with words in it; type as "Ag"; colour as a swatch; a radius as a corner
function specimen(kind, mark, n, label, swatch) {
  const id = `fxh${hatchN++}`;
  const words = (x, y, w, h) => { const fit = Math.max(2, w); return h < 9 ? `<rect x="${x}" y="${y + h / 2 - 1}" width="${fit * 0.7}" height="2" rx="1" class="word" opacity=".7"/>` : `<rect x="${x}" y="${y + h / 2 - 3.5}" width="${fit * 0.78}" height="2" rx="1" class="word" opacity=".7"/><rect x="${x}" y="${y + h / 2 + 1.5}" width="${fit * 0.52}" height="2" rx="1" class="word" opacity=".45"/>`; };
  const pattern = kind === 'margin' ? `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" class="space-fill"/></pattern>`
    : kind === 'gap' ? `<pattern id="${id}" width="4" height="2.5" patternUnits="userSpaceOnUse"><rect width="4" height="1" class="space-fill"/></pattern>`
    : `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.1" height="3" class="space-fill"/></pattern>`;
  if (kind === 'colour') return `<span class="swatch" style="background:${esc(swatch ?? 'transparent')}"></span>`;
  if (kind === 'type') {
    const p = (mark.props ?? []).join(' ');
    const style = /weight/.test(p) ? `font: ${Number.isFinite(n) ? n : 500} 22px system-ui, sans-serif` : /letter-spacing/.test(p) ? `font: 600 11px system-ui, sans-serif; letter-spacing: ${esc(label)}` : `font: 500 ${Math.min(28, (n || 13) * 1.7)}px system-ui, sans-serif`;
    return `<svg viewBox="0 0 52 40"><text x="26" y="${/letter-spacing/.test(p) ? 25 : 27}" text-anchor="middle" class="word" style="${style}">${/letter-spacing/.test(p) ? 'CAPS' : 'Ag'}</text></svg>`;
  }
  if (kind === 'radius') {
    const r = Math.min(18, (n || 0) * 0.8);
    return `<svg viewBox="0 0 52 40"><path d="M10 34 V${10 + r} Q10 10 ${10 + r} 10 H42" fill="none" class="space-line" stroke="currentColor" stroke-width="2" style="stroke: var(--word)"/></svg>`;
  }
  // a time: a track, filled as far as the time runs (a second fills it)
  if (kind === 'time' && Number.isFinite(n)) { const w = Math.max(2, Math.min(1, n / 1000) * 36); return `<svg viewBox="0 0 52 40"><rect x="8" y="18" width="36" height="4" rx="2" class="space-fill" opacity=".35"/><rect x="8" y="18" width="${w}" height="4" rx="2" class="space-line" fill="currentColor" style="fill: var(--word)"/><circle cx="${8 + w}" cy="20" r="3" style="fill: var(--word)"/></svg>`; }
  // no amount to draw (a class swap): the element as words; its name is said once, under it
  if (!Number.isFinite(n)) return `<svg viewBox="0 0 52 40">${words(10, 13, 32, 14)}</svg>`;
  if (kind === 'gap' || kind === 'margin') {
    const g = Math.min(n, 26), top = 20 - g / 2 - 7;
    return `<svg viewBox="0 0 52 40"><defs>${pattern}</defs>${words(9, top, 34, 7)}<rect x="9" y="${top + 7}" width="34" height="${g}" rx="1.5" fill="url(#${id})"/>${words(9, top + 7 + g, 34, 7)}</svg>`;
  }
  const W = 50, H = 38, x0 = 1, y0 = 1, r = 6, p = Math.min(n * SCALE, 15);
  const sides = /padding-(left|right|inline)|^px/.test((mark.props ?? []).join(' ') + ' ' + (mark.text ?? '')) && !/padding-(top|bottom)/.test((mark.props ?? []).join(' ')) ? 'x' : 'all';
  const pv = sides === 'x' ? 6 : p, ix = x0 + p, iy = y0 + pv, iw = Math.max(4, W - 2 * p), ih = Math.max(4, H - 2 * pv);
  return `<svg viewBox="0 0 52 40"><defs>${pattern}<clipPath id="${id}c"><rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${r}"/></clipPath></defs><g clip-path="url(#${id}c)"><path fill-rule="evenodd" fill="url(#${id})" d="M${x0} ${y0}h${W}v${H}h${-W}Z M${ix} ${iy}v${ih}h${iw}v${-ih}Z"/></g><rect x="${x0 + .5}" y="${y0 + .5}" width="${W - 1}" height="${H - 1}" rx="${r - .5}" fill="none" class="space-line" stroke-width="1"/><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="1.5" fill="#fff"/>${words(ix + 3, iy, iw - 6, ih)}</svg>`;
}

// the page's ground is dark: the body's paint, else the root's, by its lightness
// the page's ground: the one decision geometry.js makes for the whole overlay (oklch and every other format read right)
const darkGround = () => groundIsDark();
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// advice with no exact edit (a craft rule's words only): a note, shown after the causes and never counted
const noteOf = (g) => g.members.every((m) => isNote(m.mark, fileOf(m)));
// what a cause is called: its class, as written in your code; a craft rule with no class to point at names a tag
// (a tap target, an icon inside it) or a CSS property (gap): those name the element instead, so neither passes for a
// class. (Decided by the name, not the element's classes: a fix being tried has swapped them.)
const nameOf = (g) => {
  const el = g.members.find((m) => m.el)?.el;
  if (g.members[0].mark.family !== 'craft' || !el) return g.text;
  if (/^[a-z][a-z0-9]*$/.test(g.text) && g.text !== el.localName && el.querySelector(g.text)) return `<${g.text}>`;
  return g.text === el.localName || CSS.supports(g.text, 'inherit') ? `<${el.localName}>` : g.text;
};

// on the page and drawn: not inside something closed (display: none, a closed <details>, content-visibility), and not
// of no size
// a place is a spot in your code (file, line, column); the elements that render it are drawn, but counted once
const fileOf = (m) => m.mark.file ?? m.item?.site?.file ?? m.item?.file;
const BRIEF = 600; // a check again this short keeps the last settled line as it was
// the fixes written in this tab a moment ago, by cause key: kept out of the list across a reload, while the readings
// after a theme write may still have them (sessionStorage, a few minutes; a convenience, so every access may fail)
const WRITTEN = 'plumb:written', WRITTEN_FOR = 120000;
const written_ = () => { try { const now = Date.now(); return (JSON.parse(sessionStorage.getItem(WRITTEN) ?? '[]') ?? []).filter((w) => now - w.at < WRITTEN_FOR); } catch { return []; } };
const saveWritten = (list) => { try { sessionStorage.setItem(WRITTEN, JSON.stringify(list)); } catch {} };
const UNDOING = 'plumb:undoing';
const saveUndoing = (rest) => { try { if (rest?.undo?.length || rest?.group) sessionStorage.setItem(UNDOING, JSON.stringify({ ...rest, at: Date.now() })); else sessionStorage.removeItem(UNDOING); } catch {} };
const undoing_ = () => { try { const u = JSON.parse(sessionStorage.getItem(UNDOING) ?? 'null'); return u && Date.now() - u.at < 30000 ? u : null; } catch { return null; } };
const RESUME_WAIT = 4000; // ms a reloaded page's readings may still have the fix just written, before the panel moves on anyway
// the places of a cause: one per file:line:column its members are at (placeKey), none for a member with no place
const placeOfMember = (m) => placeKey(m.mark, fileOf(m));
const placesOf = (g) => new Set(g.members.map(placeOfMember).filter(Boolean)).size;
const drawn = (g) => g.members.some((m) => m.el);
// the other elements on the page drawn by the same line of code as this one (its stamp), outside it
const stampMates = (el) => { const at = stampOf(el); return at ? [...document.querySelectorAll(sameStamp(at))].filter((x) => x !== el && !el.contains(x)).length : 0; };
// an Alt+click reads one element (scope): a fix changes its line of code, so the places outside it that the same line
// draws change too. Counted by stamp, only where the element's stamp is the fix's own line (a caller's classes are not)
// One unit for both counts (F8-05): what the fix's line draws, counted once by its stamp, inside the element read
// ("here") and outside it; a cause whose classes come from a caller (no stamp of its own line) counts its own elements
// A craft finding carries no line of its own: its class is the element's own when the element's class attribute
// holds it, so it is counted by the element's stamp too
const ownClass = (m) => m.mark.line == null && !!m.mark.text && (m.el?.getAttribute('class') ?? '').split(/\s+/).includes(m.mark.text);
const stampsOf = (g) => { const stamps = new Set(); for (const m of g.members) { const stamp = stampOf(m.el), parsed = parseStamp(stamp); if ((parsed && parsed.line === m.mark.line && stampNames(parsed, fileOf(m))) || (parsed && ownClass(m))) stamps.add(stamp); } return stamps; };
const drawnOf = (g, scope) => {
  const stamps = stampsOf(g), own = elsOf(g);
  if (!scope || !stamps.size) return { here: own.length, elsewhere: 0 };
  const drawn = new Set(own);
  for (const stamp of stamps) for (const el of document.querySelectorAll(sameStamp(stamp))) drawn.add(el);
  let here = 0, elsewhere = 0;
  for (const el of drawn) if (scope.contains(el)) here++; else elsewhere++;
  return { here, elsewhere };
};
const elsewhere = (g, scope) => (scope ? drawnOf(g, scope).elsewhere : 0);
const elsOf = (g) => [...new Set(g.members.map((m) => m.el).filter(Boolean))];
const shown = (el) => el?.isConnected && (el.checkVisibility?.({ visibilityProperty: true }) ?? true) && el.getClientRects().length > 0;

// The panel's one machine (docs/state-machines/fixpanel-spec.md, read by `sm`: docs/briefs/state-oracle-spec.md): what
// it shows is its phase; a write or undo running against the server is its flight, kept apart so closing the panel
// mid-write never loses the write. Every move between phases is an event in this table, sent through #send; any other
// is refused and said in the console. Esc is the panel's own only with a cause in hand (`escape`); at rest, or while a
// flight is out, it is Blueprint's, which closes the panel (`close`). Keeping takes `take` too: Enter with the why field
// unfocused writes the fix, as it did before the table.
/** @machine */
export const FIX_PANEL = {
  id: 'fix-panel',
  owner: 'FixPanel',
  field: '#phase',
  token: '#flight',
  initial: 'closed',
  cancel: ['escape', 'close'],
  states: {
    closed:  { on: { open: 'resting', openWriting: 'writing', openUndoing: 'undoing' }, ignores: ['escape', 'close'] }, // opened with a flight in the air: the flight is shown
    resting: { on: { hold: 'holding', undo: 'undoing', close: 'closed' }, ignores: ['escape'] },
    holding: { on: { take: 'writing', keep: 'keeping', release: 'resting', hold: 'holding', undo: 'undoing', escape: 'resting', close: 'closed' } },
    keeping: { on: { keepIt: 'writing', take: 'writing', closeKeep: 'holding', hold: 'holding', release: 'resting', undo: 'undoing', escape: 'resting', close: 'closed' } },
    writing: { flight: 'write', on: { landedNext: 'holding', landedNone: 'resting', close: 'closed' }, ignores: ['escape'] }, // landed: the next cause in hand, or none left
    undoing: { flight: 'undo', on: { landedResting: 'resting', landedHolding: 'holding', landedKeeping: 'keeping', close: 'closed' }, ignores: ['escape'] }, // landed: back where it was
  },
  flights: {
    write: { ifLeft: 'handOff' }, // closed while it ran: History says it, with its Undo
    undo: { ifLeft: 'drop' },
  },
};

export class FixPanel {
  #phase = FIX_PANEL.initial;
  #flight = null; // { kind: 'writing' | 'undoing' } while a write or an undo runs, whether the panel is open or not
  get #on() { return this.#phase !== 'closed'; }
  get #holding() { return this.#phase === 'holding' || this.#phase === 'keeping'; } // a cause is in hand
  get #keeping() { return this.#phase === 'keeping'; } // the why field is open for the cause in hand
  get #writing() { return this.#phase === 'writing'; }
  get #undoing() { return this.#phase === 'undoing'; }
  // the one writer of #phase: the table says what the event does in the phase in hand (nothing, on purpose, when it is
  // in `ignores`; nothing, and a warning, when the table has no answer)
  // What a phase started ends when the phase is left (scope.js): `#scope` is the phase's. `#life` is the panel's own,
  // for what must finish whatever the phase does next (a height put back after it moved, the ✓'s burst).
  #scope = new Scope();
  #life = new Scope();
  #send(event) {
    const next = FIX_PANEL.states[this.#phase]?.on?.[event];
    if (next) { this.#phase = next; this.#scope.end(); this.#scope = new Scope(); }
    else if (!FIX_PANEL.states[this.#phase]?.ignores?.includes(event)) console.warn(`plumb: fix panel can't ${event} while ${this.#phase}`);
    return !!next;
  }
  get phase() { return this.#phase; }
  #el; #host; #groups = []; #code = 0; #at = 0; #held = null; #pending = null; #error = null; #progress = null; #taken = new Map(); #tokens = new Map(); #done = false; #previewed = null; #fixed = []; #fixedCount = 0;
  #unsettledAt = 0; #unsettledTimer = 0;
  #steady = null; #doneText = null; #notice = null; #noticeTimer = 0;   // the last settled count { places, causes, notes }: said while the page is checked again
  #foldTimer = 0;
  #keeps = new Map(); // cause key → { rule, sites, why }: kept as intended, written on Apply
  #why = '';          // its words as typed
  #names = new Map(); // cause key → the new token's name as typed
  #fromCode = new Map(); // cause key → { reading } | { plan, writes, at } | { none }: a cause no element renders, its options read from the code
  #swaps = new Map();    // cause key → { writes }: taken from the code alone
  #last = null;          // the last write: { text, undo: [handle] } (undo empty: nothing to take back), said above the panel
  #writingText = null;   // what is being written, when it isn't a single fix
  #resumeAt = null;      // after a write reloaded the page: { at, key, since }, the place to hold once a reading no longer has the fix written

  // host: { hold(group, lead), release(), view(), pick(i), take(), applyAll(tokens, keeps, total, swaps) → Promise, spotlight(zoneIds, leadId), tokens() → policy,
  //   fromCode(mark, places) → Promise<{ plan, writes } | null> }
  constructor(root, host) {
    this.#host = host;
    this.#el = Object.assign(document.createElement('div'), { className: 'fx', hidden: true });
    this.#el.setAttribute('role', 'region');
    this.#el.setAttribute('aria-label', 'Fix');
    root.append(this.#el);
    // Alt+click on words: a card beside them with their own values, problem or not (texteditor.js)
    let textGroup = null; // the step the card's last write made, until the card says it (the card's own bookkeeping, not the panel's)
    this.#editor = new TextEditor(root, {
      // the text card's write is one step: its group comes back with the answer, and its Undo is that step's
      write: async (at, key, token, said) => { const r = await this.#host.set(at, key, token, said); textGroup = r?.group ?? null; return r; },
      said: (text, undo, group = textGroup) => { textGroup = null; this.#last = { text, undo, group, key: null }; this.#html = ''; this.render(); this.#host.announce?.(text); },
      problems: () => this.#problemsIn(this.#editor.target),
      // the problems inside are the fix panel's: the card steps aside for them
      show: () => this.#handOver(this.#editor),
      // a card closed lets go of its element too: the next Esc leaves Blueprint (F3-06), never a silent deselect
      closed: () => { this.#host.release?.(); this.#html = ''; this.render(); },
      elsewhere: (el) => stampMates(el),
      dark: () => darkGround(),
      why: (el) => this.#host.why?.(el) ?? Promise.resolve(null),
      // the levels above the words (blueprint.js climbTo keeps the way back down); the fix bar it is placed clear of
      climb: (el) => this.#host.climb?.(el),
      bar: () => this.rect,
    });
    // Alt+click on anything else: its own card, Shadow › and Motion › on the recipe engine (elementcard.js)
    this.#card = new ElementCard(root, {
      apply: (at, body, said, meta) => this.#host.recipe(at, body, said, meta),
      swaps: (writes, said, meta) => this.#host.swaps(writes, said, meta),
      batch: (steps, said, meta) => this.#host.batch(steps, said, meta),
      bar: () => this.rect,
      said: (text, undo, group = null) => { this.#last = { text, undo, group, key: null }; this.#html = ''; this.render(); this.#host.announce?.(text); },
      problems: () => this.#problemsIn(this.#card.target),
      show: () => this.#handOver(this.#card),
      // a card closed lets go of its element too: the next Esc leaves Blueprint (F3-06), never a silent deselect
      closed: () => { this.#host.release?.(); this.#html = ''; this.render(); },
      elsewhere: (el) => stampMates(el),
      dark: () => darkGround(),
      why: (el) => this.#host.why?.(el) ?? Promise.resolve(null),
      // working in the card: the cause Blueprint would put in hand once the element is read isn't, and one in hand is put down
      release: () => { this.#host.unwant?.(); this.release(); },
      climb: (el) => this.#host.climb?.(el),
    });
    // the clean-up: while it runs, the panel's body, clicks and keys are its own (cleanup.js)
    this.#cleanup = new Cleanup({
      // while it runs, the problems' heat steps back (nothing lit): the page shows the clean-up's marks, not the fixes'
      render: () => { const on = this.#cleanup.running; if (on !== this.#quiet) { this.#quiet = on; this.#host.spotlight(on ? ['cleanup'] : []); } this.#html = ''; this.render(); },
      announce: (t) => this.#host.announce?.(t),
      // a step written while the panel is open is said above it, with Undo; closed meanwhile, History says it
      wrote: (r, text) => { const last = { text, undo: r?.undo ?? [], group: r?.trace?.group ?? null, key: null }; if (this.#on) this.#last = last; else if (last.undo.length || last.group) this.#host.handOff?.({ undo: last.undo, trace: { group: last.group } }, text); },
      // the one write of text styles (blueprint.js): remembered across the reload it may cause, its files read again
      write: (w, said, meta) => this.#host.applyStyles(w, said, meta),
      rename: (map, said, meta) => this.#host.renameColours(map, said, meta),
      undo: (group) => this.#host.undoGroup(group),
      close: () => this.#cleanup.stop(),
      url: () => location.origin + '/',
    });
    this.#cleanup.mount(this.#el);
    this.#el.addEventListener('click', (e) => {
      if (this.#cleanup.running) { this.#cleanup.click(e.target); return; }
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('start')) this.hold(0);
      else if (b.classList.contains('cleanup')) this.#cleanup.start();
      else if (b.classList.contains('more')) { this.#tools = !this.#tools; this.#html = ''; this.render(); }
      else if (b.classList.contains('tool')) this.#host.tool?.(b.dataset.tool);
      else if (b.classList.contains('bar-close')) this.#host.tool?.('bp-toggle');
      else if (b.classList.contains('setup')) this.#host.openSetup?.();
      else if (b.classList.contains('sp')) this.#pick(+b.dataset.i);
      else if (b.classList.contains('take')) this.take();
      else if (b.classList.contains('skip') || b.classList.contains('next')) this.skip(1);
      else if (b.classList.contains('prev')) this.skip(-1);
      else if (b.classList.contains('undo')) this.#undo();
      else if (b.classList.contains('keep')) this.keep();
      else if (b.classList.contains('keep-yes')) this.#keepIt();
      else if (b.classList.contains('keep-no')) this.#closeKeep();
    });
    // the fields own their keys: Enter does the field's action, Esc closes or leaves it; the page's keys never see them
    this.#el.addEventListener('input', (e) => {
      if (e.target.name === 'token') { this.#names.set(this.#held?.key, e.target.value.trim()); fit(e.target); this.#sayNew(); }
      if (e.target.name === 'why') { this.#why = e.target.value; const ok = this.#why.trim().length >= 3; this.#el.querySelector('.keep-yes')?.toggleAttribute('disabled', !ok); fieldSays(e.target.closest('.field'), { ok }); }
    });
    this.#el.addEventListener('keydown', (e) => {
      if (!e.target.matches?.('input')) return;
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); e.target.name === 'why' ? this.#keepIt() : this.take(); }
      if (e.key === 'Escape') { e.preventDefault(); e.target.name === 'why' ? this.#closeKeep() : e.target.blur(); }
    });
  }
  get rect() { return this.#el.hidden ? null : this.#el.getBoundingClientRect(); }
  #editor; #card; #cleanup; #quiet = false; #tools = false; // #tools: the bar's ··· is open (its tools shown inline)
  // Alt+click on words opens their editor; a cause in hand is put down first
  edit(el) { if (this.#holding) this.release(); this.#card.close(); this.#editor.edit(el); this.#html = ''; this.render(); }
  // Alt+click on anything else opens its card beside it. One owner of the screen: a cause in hand is put down first, and the panel is its one line while the card is open
  card(el) { if (this.#holding) this.release(); this.#editor.close(); this.#card.edit(el); this.#html = ''; this.render(); }
  get carding() { return this.#card.open; }
  // the words' card is open (not an element's)
  get texting() { return this.#editor.open; }
  get editing() { return this.#editor.open ? this.#editor.target : this.#card.open ? this.#card.target : null; }
  // a file was written or undone: the element in the editor (or the card) is read again
  changed() { this.#editor.changed(); this.#card.changed(); }
  get holding() { return this.#holding; }
  // a card hands the screen to the fixes: the element's own cause first, else the first one inside it
  #handOver(card) { const el = card.target; card.close(); if (!el || !this.holdEl(el, 'none')) this.hold(0); }

  // each opening starts unread: the last one's count and its settled mark never stand in for this reading
  show(on) { if (on) { const rest = undoing_(); if (rest) queueMicrotask(() => this.#undo(rest)); this.#el.dataset.scheme = darkGround() ? 'dark' : 'light'; this.#el.classList.toggle('pl-dark', this.#el.dataset.scheme === 'dark'); this.#el.classList.toggle('pl-light', this.#el.dataset.scheme !== 'dark'); for (const w of written_()) if (!this.#taken.has(w.key)) this.#taken.set(w.key, { key: w.key, members: [] }); } if (on !== this.#on) { this.#groups = []; this.#progress = null; this.#steady = null; this.#notice = null; clearTimeout(this.#noticeTimer); this.#el.removeAttribute('data-settled'); this.#send(on ? (this.#flight?.kind === 'undoing' ? 'openUndoing' : this.#flight?.kind === 'writing' ? 'openWriting' : 'open') : 'close'); } this.#el.hidden = !on; if (!on) { this.#editor.close(); this.#card.close(); this.#letGo(false); this.#done = false; const last = this.#last; if (last?.undo?.length || last?.group) this.#host.handOff?.({ undo: last.undo ?? [], trace: { group: last.group ?? null } }, last.text); this.#last = null; this.#resumeAt = null; if (this.#cleanup.running) this.#cleanup.stop(); } else this.#cleanup.resume(); this.render(); }
  // the reader handed on the page: causes, most places first; a cause taken stays taken until it is written
  // While a cause is in hand the page is read as previewed (its fix, and what that fix also mends, gone from it): the
  // causes stay as they were read before, and the new reading is taken when the cause is put down
  set(items) {
    if (this.#holding) { this.#pending = items; return; }
    this.#pending = null;
    ({ groups: this.#groups, code: this.#code } = groupsOf(items));
    if (this.#holding && !this.#live()[this.#at]) this.#at = Math.max(0, this.#live().length - 1);
    this.render();
  }
  // the reader's progress: settled once every element is read (what a script waiting on the page can watch)
  progress(p) {
    this.#progress = p;
    const done = !!p && (p.done ?? p.read === p.total);
    // the page changing for a moment (a tooltip, a ticking clock) is checked again without the line saying so; only a
    // check that takes longer says it is checking
    if (done) { this.#unsettledAt = 0; clearTimeout(this.#unsettledTimer); }
    else if (!this.#unsettledAt) { this.#unsettledAt = performance.now(); this.#unsettledTimer = setTimeout(() => this.render(), BRIEF + 20); }
    this.#settled(done);
    // the page a write reloaded is read again: the panel moves on as it would have, to the fix after the one written
    // (a first reading may still have the fix just written: the theme is read again a moment later; never longer than a few seconds)
    const r = this.#resumeAt;
    if (done && r && !this.#holding && this.#live().length && (!r.key || !this.#groups.some((g) => g.key === r.key) || performance.now() - r.since > RESUME_WAIT)) { this.#resumeAt = null; this.hold(Math.min(r.at, this.#live().length - 1)); return; }
    this.render();
  }
  // put down: the page is back as it was read before (`keep` false), or what was taken is on it now (`keep`: the reading
  // made while it was tried is the page's)
  #letGo(keep) { const p = this.#pending; this.#pending = null; if (keep && p) this.set(p); }
  // "N problems here" on a card (N-08): the bar's unit (a problem is a place in the code), counted for what is drawn on
  // the card's element or inside it, the same in Blueprint over the whole page as over the element alone
  #problemsIn(el) {
    if (!el) return 0;
    let n = 0;
    for (const g of this.#live()) if (!noteOf(g)) n += new Set(g.members.filter((m) => m.el && el.contains(m.el)).map(placeOfMember).filter(Boolean)).size;
    return n;
  }
  #live() { const open = this.#groups.filter((g) => !this.#taken.has(g.key)); return [...open.filter((g) => !noteOf(g)), ...open.filter(noteOf)]; }
  // the cause in hand, by its key: the list shrinks while its own fix is tried (its finding is gone from the page as
  // previewed), so the cause is kept as it was read; its place in the list follows it
  #cause() {
    if (!this.#holding || !this.#held) return null;
    const live = this.#live(), i = live.findIndex((g) => g.key === this.#held.key);
    if (i >= 0) { this.#at = i; this.#held = live[i]; }
    return this.#held;
  }

  // Put a cause in hand: the selection holds its first place with every other place as its group; the panel shows
  // its options and tries the suggested one at once
  // `lead`: the place that was pointed at (a glow, Alt+click) leads the cause; else its first place
  // reveal: 'show' (reached by keys: brought into view), 'uncover' (picked from outside: moved out from under the panel
  // that just opened), 'none' (clicked with the page in view: the page never moves under the pointer)
  hold(i, lead, reveal = lead ? 'none' : 'show') {
    const live = this.#live();
    // nothing is put in hand while a write or an undo is out (the one that lands moves the panel on itself)
    if (!live.length || this.#flight || !this.#send('hold')) return;
    // a cause in hand owns the screen: a card open is closed first
    if (this.#card.open) { this.#card.close(); this.#html = ''; }
    if (this.#editor.open) { this.#editor.close(); this.#html = ''; }
    this.#notice = null;
    this.#at = (i + live.length) % live.length;
    this.#done = false; this.#previewed = null; this.#error = null;
    this.#resumeAt = null; // a fix put in hand (by the person, or the move after a reload) ends the wait to move on
    const g = live[this.#at];
    this.#held = g;
    // the place in hand is one that can be seen: a cause is counted from the source, so some of its places may be
    // inside something closed (a menu, a dialog)
    const el = g.members.some((m) => m.el && m.el === lead) ? lead : (g.members.find((m) => shown(m.el)) ?? g.members.find((m) => m.el))?.el ?? null;
    // a cause with no place on the page right now: nothing to hold or light; its fix comes from the code alone
    if (el) this.#host.hold(g, el); else this.#host.release();
    if (!drawn(g)) this.#readFromCode(g);
    // its own zones light (by id: not the other problems on the same elements), the place in hand strongest
    this.#host.spotlight(g.members.map((m) => m.id), g.members.find((m) => m.el && m.el === el)?.id ?? null);
    this.render(true);
    this.#host.announce?.(FIX.inHand(FIX.position(g, live, noteOf), nameOf(g), FIX.what(g.members[0].mark), placesOf(g)));
    // the place in hand is seen above the panel, never under it (once the panel has its height)
    // (and again once it has opened: held as Blueprint comes on, the panel has no height yet)
    // pointed at (a click, Alt+click): it is where the person looks, so it only moves out from under the panel;
    // reached by keys: it is brought into view wherever it is
    if (el && reveal !== 'none') {
      const covered = reveal === 'uncover';
      // holding's own: put down (or another cause taken up) before they run, and they don't
      const scope = this.#scope;
      scope.frame(() => scope.frame(() => { if (this.#held === g) this.#reveal(el, covered); }));
      scope.timeout(() => { if (this.#held === g) this.#reveal(el, covered); }, TIMING.open + 40);
    }
  }
  #reveal(el, coveredOnly = false) {
    if (!el?.isConnected || !this.#holding) return;
    const panel = this.#el.getBoundingClientRect();
    if (!panel.height) return; // not drawn yet: the later call measures it
    const r = el.getBoundingClientRect(), top = 16, bottom = Math.min(innerHeight, panel.top) - 16;
    if (r.height > bottom - top) return; // taller than the room above the panel: it stays where it is
    // pointed at: moved only when the panel hides all of it (any part above the panel is enough to see it), never when
    // it is off screen
    if (coveredOnly && (r.top < panel.top - 16 || r.top >= innerHeight || r.bottom <= 0)) return;
    const by = r.bottom > bottom ? r.bottom - bottom : r.top < top ? r.top - top : 0;
    if (!by) return;
    let box = el.parentElement;
    while (box && box !== document.body && box !== document.documentElement && !(/(auto|scroll|overlay)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
    (box && box !== document.body && box !== document.documentElement ? box : document.scrollingElement ?? document.documentElement)
      .scrollBy({ top: by, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  // a glow clicked on the page: its cause
  holdMark(el, mark) {
    this.#resumeAt = null; // the person chose: the panel doesn't move on over it
    // the cause already in hand: nothing to do (holding it again would read its own preview as how it is now)
    if (this.#holding && this.#held?.members.some((m) => m.el === el && m.mark.key === mark?.key)) return true;
    const i = this.#live().findIndex((g) => g.members.some((m) => m.el === el && m.mark.key === mark?.key));
    if (i < 0) return false;
    this.hold(i, el);
    return true;
  }
  holdEl(el, reveal = 'none') {
    this.#resumeAt = null;
    if (this.#holding && this.#held?.members.some((m) => m.el === el)) return true;
    const i = this.#live().findIndex((g) => g.members.some((m) => m.el === el));
    if (i < 0) return false;
    this.hold(i, el, reveal);
    return true;
  }
  release() {
    this.#resumeAt = null;
    if (!this.#holding) return false;
    const g = this.#cause();
    this.#send('release');
    this.#putDown(g);
    return true;
  }
  // the cause is out of hand (the phase has moved): its token preview undone, the reading made while it was tried let
  // go, the page's hold and light released
  #putDown(g) {
    if (g) this.#unpreviewToken(g);
    this.#letGo(false);
    this.#host.release();
    this.#host.spotlight([]);
    this.render();
  }
  skip(by) {
    if (!this.#holding) return;
    const g = this.#cause();
    if (g) this.#unpreviewToken(g);
    this.#host.release();
    this.hold(this.#at + by);
  }
  // the selection's view, only when it is about this cause: never another problem's options, shown or taken
  #viewOf(g) {
    const v = g ? this.#host.view() : null;
    if (v && g.members.some((m) => m.mark.key === v.mark?.key && m.mark.rule === v.mark?.rule)) return v;
    // nothing on the page renders it: its options as read from the code, each an exact edit at every place
    const c = g && !drawn(g) ? this.#fromCode.get(g.key) : null, mark = g?.members[0].mark;
    if (c?.reading) return { mark, reading: true };
    if (!c?.plan) return null;
    return { mark, ready: true, kind: 'swap', code: true, options: c.plan.options.map((o, i) => ({ label: o.label, n: o.n, swatch: o.swatch, ok: !!c.writes[i]?.length, cls: o.write?.to ?? null })), at: c.at, now: c.plan.now };
  }
  // a cause no element renders: its theme choices and their exact edits, read once from the code at its places
  #readFromCode(g) {
    const mark = g.members[0].mark;
    if (this.#fromCode.has(g.key) || mark.family === 'craft' || !mark.choices?.length || !this.#host.fromCode) return;
    const places = [...new Map(g.members.map((m) => [`${fileOf(m)}:${m.mark.line}:${m.mark.column}`, { file: fileOf(m), line: m.mark.line, column: m.mark.column }])).values()];
    this.#fromCode.set(g.key, { reading: true });
    const flight = this.#flight; // null: nothing is put in hand while a write or an undo is out
    this.#host.fromCode(mark, places)
      .then((r) => this.#fromCode.set(g.key, r ? { ...r, at: r.plan.at } : { none: true }), () => this.#fromCode.set(g.key, { none: true }))
      // a write or an undo started meanwhile draws the panel itself when it lands
      .finally(() => { if (this.#flight !== flight) return; if (this.#held?.key === g.key) { this.#html = ''; this.render(); } });
  }
  // settled: every element read (the resting line never changes under the person after it)
  #settled(done = !!this.#progress && (this.#progress.done ?? this.#progress.read === this.#progress.total)) {
    this.#el.toggleAttribute('data-settled', done);
  }
  // an option picked: on the page it is tried there; from the code alone it is only chosen
  #pick(i) {
    const g = this.#cause(), v = this.#viewOf(g);
    if (!v?.code) { this.#host.pick(i); return; }
    this.#fromCode.get(g.key).at = Math.max(0, Math.min(v.options.length - 1, i));
    this.#html = ''; this.render();
  }
  take() {
    const g = this.#cause(), v = this.#viewOf(g);
    // a place on the page is read first (its exact options); a cause with none takes its fix from the code alone
    if (!g || (!v && drawn(g))) return;
    if (v?.ready) {
      if (!v.options[v.at]?.ok) return; // its exact edit is still being read
      if (v.code) this.#swaps.set(g.key, { writes: this.#fromCode.get(g.key).writes[v.at] });
      else this.#host.take();
    } else if (v?.reading) {
      return;
    } else if (v?.suggest?.kind === 'token') {
      this.#tokens.set(g.key, { suggest: v.suggest, els: elsOf(g) });
    } else {
      const a = this.#action(g, v);
      if (a?.kind === 'adopt') this.#tokens.set(g.key, { suggest: { kind: 'token', file: a.file, hash: a.hash, name: a.name, value: a.value }, els: [] });
      else if (a?.kind === 'new') {
        // no name yet: the field is where the answer goes
        if (!a.ok) { const f = this.#el.querySelector('input[name="token"]'), fld = f?.closest('.field'); f?.focus(); fieldSays(fld, { bad: !!a.name }); if (a.name) shake(fld); return; }
        this.#tokens.set(g.key, { suggest: { kind: 'token', file: a.file, hash: a.hash, name: a.token, value: a.value, then: { from: g.text, to: a.cls } }, els: elsOf(g), marks: g.members.map((m) => m.mark) });
      } else return;
    }
    this.#taken.set(g.key, g);
    this.#write(this.#saying(g, v), g.key);
  }
  // what a fix changed, in words, worked out before it is written (the panel moves on as it lands)
  #saying(g, v) {
    const n = placesOf(g);
    if (this.#keeps.has(g.key)) return FIX.kept(n);
    if (v?.ready) return FIX.changed(g.text, v.options[v.at]?.cls ?? v.options[v.at]?.label ?? '', n);
    const t = this.#tokens.get(g.key)?.suggest;
    if (!t) return FIX.applied(1);
    return t.then?.to ? FIX.addedUsed(t.name, t.file, t.then.to, n) : FIX.added(t.name, t.file);
  }
  // Keep it: the cause is intended. Its why is asked in one line; every place is recorded as kept on Apply
  keep() {
    const g = this.#cause();
    if (!g || this.#keeping || !this.#send('keep')) return;
    this.#why = ''; this.#html = ''; this.render();
    this.#el.querySelector('input[name="why"]')?.focus();
  }
  #closeKeep() { this.#send('closeKeep'); this.#html = ''; this.render(); }
  #keepIt() {
    const g = this.#cause(), why = this.#why.trim();
    if (!g || why.length < 3) return;
    this.#keeps.set(g.key, { rule: g.members[0].mark.rule, why, els: elsOf(g), sites: g.members.map((m) => ({ file: fileOf(m), line: m.mark.line, column: m.mark.column, text: m.mark.text })) });
    this.#taken.set(g.key, g);
    this.#write(this.#saying(g), g.key, true);
  }
  // What the theme can do for a cause with nothing to swap to: make a Tailwind default yours, or add the step it lacks
  #action(g, v) {
    if (v?.ready || v?.suggest?.kind === 'token') return null;
    const mark = g.members[0].mark, policy = this.#host.tokens?.() ?? {};
    if (policy.create === false || !policy.file) return null;
    if (mark.adopt?.name) return { kind: 'adopt', name: mark.adopt.name, value: String(mark.adopt.value), file: policy.file, hash: policy.hash ?? null };
    const nt = mark.newToken;
    if (!nt?.namespace || !nt.utility) return null;
    const name = this.#names.get(g.key) ?? FIX.nameFor(nt.namespace, String(nt.value)), ok = /^[a-z][a-z0-9-]{0,30}$/.test(name);
    // the class as written at the place keeps its variants and sign: hover:-mx-[…] becomes hover:-mx-<name>
    const lead = /^((?:[^:\[\]]+:)*)(!?-?)/.exec(g.text) ?? ['', '', ''];
    return { kind: 'new', name, ok, value: String(nt.value), token: `${nt.namespace}-${name}`, cls: `${lead[1]}${lead[2]}${nt.utility}-${name}`, namespace: nt.namespace, utility: nt.utility, file: policy.file, hash: policy.hash ?? null };
  }
  // the class the new token becomes, said as it is typed (the field is not drawn again while it has the caret)
  #sayNew() {
    const g = this.#cause(), a = g && this.#action(g, this.#viewOf(g));
    const hint = this.#el.querySelector('.hint'), take = this.#el.querySelector('.take');
    if (!a || a.kind !== 'new' || !hint) return;
    fieldSays(this.#el.querySelector('.field'), { ok: a.ok, bad: !!a.name && !a.ok });
    hint.classList.toggle('err', !!a.name && !a.ok);
    hint.innerHTML = this.#newHint(g, a);
    take?.toggleAttribute('disabled', !a.ok);
  }
  #newHint(g, a) {
    const n = placesOf(g);
    return a.name && !a.ok ? esc(FIX.newStepBad) : a.ok ? `${esc(FIX.becomes(n))} <code>${esc(a.cls)}</code>` : esc(FIX.newStepHint(n));
  }
  // A fix is written the moment it is taken (one guarded write; there is no queue): the panel says what it changed and
  // where, with Undo, and moves on to the next fix. What didn't land comes back in hand, with why.
  async #write(said, key, keep = false) {
    if (!this.#taken.size || this.#flight || !this.#send(keep ? 'keepIt' : 'take')) return;
    const flight = (this.#flight = { kind: 'writing' }); // this write's token; show(true) reads its kind while it is out
    const at = this.#at, g = this.#taken.get(key);
    this.#fixed = g ? elsOf(g) : [];
    this.#fixedCount = 1;
    this.#host.release(); this.#host.spotlight([]);
    this.#html = ''; this.render();
    let left = { count: 0 };
    // the fix is one step of the timeline: named after its cause, with the laws its rule serves
    const meta = { step: g ? nameOf(g) : FIX.card.steps.fix, laws: g ? g.members.flatMap((m) => m.mark?.laws ?? []) : [] };
    try { left = (await this.#host.applyAll([...this.#tokens.values()], [...this.#keeps.values()], 1, [...this.#swaps.values()], said, { at, key, meta })) ?? left; }
    catch (error) { left = { count: 1, why: error?.message }; }
    // replaced while it ran (the table forbids a second flight, so never): the write would be History's alone
    if (this.#flight !== flight) { if (left.undo?.length || left.group) this.#host.handOff?.({ undo: left.undo ?? [], trace: { group: left.group ?? null } }, said); return; }
    // still the panel's: it moves on. Closed while it ran, and not opened again: the write is History's to say, with its Undo
    const mine = this.#phase === 'writing';
    this.#flight = null;
    const ok = !left.count;
    if (ok && this.#steady && g) this.#steady = { ...this.#steady, places: Math.max(0, this.#steady.places - placesOf(g)), causes: Math.max(0, this.#steady.causes - 1) };
    // one fix at a time: written or not, nothing is left waiting
    if (!ok) this.#taken.delete(key);
    else { if (mine) this.#last = { text: said, undo: left.undo ?? [], group: left.group ?? null, key }; else if (left.undo?.length || left.group) this.#host.handOff?.({ undo: left.undo ?? [], trace: { group: left.group ?? null } }, said); saveWritten([...written_().filter((w) => w.key !== key), { key, at: Date.now() }]); }
    this.#tokens.clear(); this.#keeps.clear(); this.#swaps.clear(); this.#fromCode.clear();
    this.#host.announce?.(ok ? said : left.why ?? FIX.couldNot);
    if (!mine) { this.#pending = null; return; }
    // the page as read while the fix was written: the list the panel moves on in
    const p = this.#pending; this.#pending = null;
    if (p) ({ groups: this.#groups, code: this.#code } = groupsOf(p));
    const live = this.#live();
    if (live.length) { this.#send('landedNext'); this.hold(Math.min(at, live.length - 1)); } else { this.#send('landedNone'); this.#letGo(true); this.#html = ''; this.render(); }
    if (!ok) { this.#error = left.why ?? FIX.couldNot; this.#html = ''; this.render(); }
  }
  // Undo: the last fix's writes taken back, newest first; the page is read again and the fix comes back
  async #undo(rest = null) {
    const last = rest ?? this.#last;
    if ((rest ? !last?.undo?.length && !last?.group : !last?.undo?.length) || !this.#on || this.#flight) return;
    const back = this.#phase;
    if (!this.#send('undo')) return;
    const flight = (this.#flight = { kind: 'undoing' }); // this undo's token
    this.#html = ''; this.render();
    let why = null;
    // newest first; what is left is kept in the tab before each one, so an undo that reloads the page (a source file
    // the dev server can't hot-swap) goes on with the rest when the page is back
    // write handles only (a step rebuilt from the trace after a reload lists its changes, which undo-group takes back)
    const handles = (rest ? last.undo ?? [] : [...last.undo ?? []].reverse()).filter((h) => h?.id);
    let leaving = false;
    const leave = () => { leaving = true; };
    addEventListener('pagehide', leave, { once: true });
    // a step the timeline knows (a card's or the panel's write): the step taken back, change by change where each is
    // now (POST undo-group), and said by History. Carried on after a reload, a step already taken back is passed over
    let byGroup = !!last.group;
    if (byGroup) {
      saveUndoing({ group: last.group, undo: [], key: last.key ?? null });
      try { await this.#host.undoGroup(last.group); }
      catch (error) {
        // a write the trace missed (it never fails the write) has only its handles: taken back as before
        if (!rest && errorIs(error, 'nothing-in-group') && handles.length) byGroup = false;
        else if (!rest) why = error?.message ?? '';
      }
    }
    if (!byGroup) for (let i = 0; i < handles.length && !leaving; i++) {
      saveUndoing({ undo: handles.slice(i + 1), key: last.key ?? null });
      // carried on after a reload, a handle the page before already took back is passed over, not a failure
      try { await this.#host.undo(handles[i]); } catch (error) { if (!rest) { why = error?.message ?? ''; break; } }
    }
    removeEventListener('pagehide', leave);
    if (leaving) return; // the page is going: the reloaded one goes on with what's left
    saveUndoing(null);
    if (this.#flight !== flight) return; // replaced while it ran (the table forbids a second flight, so never)
    // still the panel's: back where it was. Closed while it ran: only said
    const mine = this.#phase === 'undoing';
    this.#flight = null;
    if (mine) this.#send(back === 'holding' ? 'landedHolding' : back === 'keeping' ? 'landedKeeping' : 'landedResting');
    // a step undone by its group is said by History's toast, which carries the Undo: the panel says nothing more
    const word = why === null && byGroup ? null : { text: why === null ? FIX.undone : FIX.couldNotUndo(why), undo: [] };
    if (mine) this.#last = word;
    if (word) this.#host.announce?.(word.text);
    // the fix undone is offered again (the others written stay written)
    if (why === null && last.key) { this.#taken.delete(last.key); saveWritten(written_().filter((w) => w.key !== last.key)); }
    this.#html = ''; this.render();
  }

  key(k) {
    // Enter before the page is read again (a write reloaded it) is "start": the wait to hold the next fix goes on, and
    // holds it when the reading lands; any other key is the person's own move and ends the wait
    if (!(k === 'Enter' && !this.#live().length)) this.#resumeAt = null;
    if (!this.#on) return false;
    // a write or an undo out: every key but Esc waits for it (Esc leaves; the flight lands safely without the panel)
    if (this.#writing || this.#undoing) return k !== 'Escape';
    if (this.#cleanup.running) return k === 'Escape' ? this.#cleanup.escape() : this.#cleanup.key(k);
    // Enter on something with focus is that thing's: a button here is pressed (a specimen is already picked, so Enter
    // takes it, as anywhere); a glow on the page, with nothing in hand, holds its own cause (with a cause in hand, the
    // glow a click left focused is that cause's, and Enter takes it)
    if (k === 'Enter') {
      const a = this.#el.getRootNode().activeElement;
      if (a && this.#el.contains(a) && a.matches('button:not(.sp), a[href]')) { a.click(); return true; }
      if (!this.#holding && a?.classList?.contains('hit')) return false;
    }
    if (!this.#holding && this.#editor.open) {
      // the card's keys first: a '.' typed into a number is the number's
      if (this.#editor.key(k)) return true;
      if (k === '.' && this.#live().length) { this.#handOver(this.#editor); return true; }
    }
    if (!this.#holding && this.#card.open) {
      if (this.#card.key(k)) return true;
      if (k === '.' && this.#live().length) { this.#handOver(this.#card); return true; }
    }
    if (!this.#holding) {
      if ((k === 'c' || k === 'C') && !this.#editor.open && !this.#card.open) { this.#cleanup.start(); return true; }
      if (k === 'Enter' && this.#live().length) { this.hold(0); return true; }
      return false;
    }
    const v = this.#viewOf(this.#cause());
    if (k === 'ArrowUp' || k === 'ArrowDown') { if (v?.ready) this.#pick(Math.max(0, Math.min(v.options.length - 1, v.at + (k === 'ArrowUp' ? 1 : -1)))); return true; }
    if (k === 'Enter') { this.take(); return true; }
    if (k === 'k' || k === 'K') { this.keep(); return true; }
    // I: the "i" of a craft finding in hand, its rule's page in a new tab (Tab is the next fix here, so it has a key)
    if (k === 'i' || k === 'I') { const info = this.#el.querySelector('.cause .info'); if (info) { info.click(); return true; } return false; }
    if (k === 'ArrowRight' || k === 'Tab') { this.skip(1); return true; }
    if (k === 'ArrowLeft') { this.skip(-1); return true; }
    if (k === 'Escape') { const g = this.#cause(); this.#send('escape'); this.#putDown(g); return true; }
    return false;
  }

  // a token's preview: the value it would set, on every place, as inline styles the panel owns. A suggestion's `sets`
  // are px for the element its finding is on (a line height is 1.5 × that element's size), so each place is previewed
  // with its own finding's values when it offers the same fix, and a number is written as px (inplace.js does the same)
  #tokenPreview = new Claims(LEVEL.fix); // a new token tried at its places; claims.js keeps what the page had
  #previewToken(g, suggest) {
    if (this.#tokenPreview.size) return;
    const own = new Map(g.members.map((m) => { const s = m.mark?.craft?.suggest; return [m.el, s?.to === suggest.to && s?.sets ? s.sets : null]; }));
    for (const el of elsOf(g)) {
      for (const [k, v] of Object.entries(own.get(el) ?? suggest.sets ?? {})) { const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()); this.#tokenPreview.set(el, prop, typeof v === 'number' ? `${v}px` : v); }
    }
  }
  #unpreviewToken(g) {
    if (this.#tokens.has(g.key)) return; // taken: it stays until it is written
    this.#tokenPreview.clear();
  }

  // a card open owns the screen: the host says so, and Blueprint's pills step aside under it (N-11)
  #cardFlag() { const h = this.#el.getRootNode()?.host, on = !!(this.#editor?.open || this.#card?.open); if (h && h.hasAttribute('data-card') !== on) h.toggleAttribute('data-card', on); }
  render(slide = false) {
    this.#cardFlag();
    if (!this.#on) return;
    const live = this.#live(), taken = this.#taken.size, g = this.#cause(), v = this.#viewOf(g);
    // nothing is said to match until every element on the page has been read
    const settledNow = this.#progress?.done ?? (!!this.#progress?.total && this.#progress.read === this.#progress.total);
    const settled = settledNow || (this.#steady?.path === location.pathname && !!this.#unsettledAt && performance.now() - this.#unsettledAt < BRIEF);
    let html;
    const tidy = `<button class="pl-act quiet cleanup" aria-keyshortcuts="c"><span>${esc(CLEANUP.bar)}<span class="long"> ${esc(CLEANUP.barLong)}</span></span> <kbd>C</kbd></button>`;
    // the bar's end: ··· (its tools, only once asked for) and Close; and the setup steps left, said in the line
    const B = FIX.bar, left = this.#host.setupLeft?.() ?? 0;
    const end = `<button class="more" aria-expanded="${this.#tools}" aria-label="${esc(this.#tools ? B.less : B.more)}" title="${esc(this.#tools ? B.less : B.more)}">${BAR_ICON.more}</button>`
      + (this.#tools ? `<span class="tools">${Object.entries(B.tools).map(([n, label]) => `<button class="tool" data-tool="${n}" aria-label="${esc(label)}" title="${esc(label)}">${BAR_ICON[n]}</button>`).join('')}</span>` : '')
      + `<button class="bar-close" aria-keyshortcuts="Escape" aria-label="${esc(B.close)}"><span class="word">${esc(B.close)}</span> <kbd>Esc</kbd>${BAR_ICON.x}</button>`;
    const notice = left ? `<span class="notice"><b>${esc(B.setup(left))}</b><button class="setup">${esc(B.review)}</button></span>` : '';
    if (this.#cleanup.running) html = this.#cleanup.html();
    else if (this.#writing || this.#undoing) html = `<div class="writing"><i></i>${esc(this.#undoing ? FIX.undoing : this.#writingText ?? FIX.writing)}</div>`;
    else if (this.#done) html = `<div class="line done"><svg class="check" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.8"/></svg><span class="words">${esc(this.#doneText ?? FIX.applied(this.#fixedCount))}</span></div>`;
    // a word about what was just pointed at (why nothing is in hand) comes before any offer
    else if (!g && this.#notice) html = `<div class="line"><span class="count"><span>${esc(this.#notice)}</span></span></div>`;
    else if (!g) {
      // a note (advice, no exact edit) is shown with the fixes but never counted as a problem
      const causesNow = live.filter((x) => !noteOf(x));
      let causes = causesNow.length, notes = live.length - causes, places = causesNow.reduce((n, x) => n + placesOf(x), 0);
      // checking again (after an apply, a page change): the last settled count stands until the new one settles
      if (settledNow) this.#steady = { places, causes, notes, path: location.pathname };
      else if (this.#steady?.path === location.pathname) ({ places, causes, notes } = this.#steady);
      const unchecked = this.#progress?.notChecked ? ` · <span title="${esc(FIX.uncheckedTitle)}">${esc(FIX.unchecked(this.#progress.notChecked))}</span>` : '';
      // one count in the line; the rest of it is one point away, in the count's readout (never in the line)
      const rest = [places && causes ? FIX.fixes(causes) : null, notes && places ? FIX.notes(notes) : null, this.#progress?.notChecked ? FIX.unchecked(this.#progress.notChecked) : null, settled ? null : FIX.stillChecking].filter(Boolean).join(' · ');
      const status = `<span class="status" tabindex="0"${rest ? ` aria-description="${esc(rest)}"` : ''}><i class="dot"></i><span class="count">${places ? FIX.problems(places) : FIX.notes(notes)}</span>${rest ? `<span class="readout" aria-hidden="true">${esc(rest)}</span>` : ''}</span>`;
      void unchecked;
      html = places || notes
        ? `<div class="line bar${notice ? ' has-notice' : ''}">${this.#error ? `<span class="quiet-line err">${esc(this.#error)}</span>` : status}${notice}<span class="grow"></span>${tidy}<button class="pl-act start" aria-keyshortcuts="Enter">${FIX.start} <kbd>↵</kbd></button>${end}</div>`
        : `<div class="line bar${notice ? ' has-notice' : ''}"><span class="quiet-line">${esc(this.#error ?? (!settled ? (this.#host.scope?.() ? FIX.checkingElement : FIX.checking) : this.#progress?.notChecked ? FIX.clearChecked(this.#progress.notChecked) : FIX.clear))}</span>${notice}${settled ? tidy : ''}${end}</div>`;
    } else {
      const mark = g.members[0].mark, kind = kindOf(mark);
      // a craft finding's name carries an "i": its rule's page, where the why is told in full
      const docs = docsUrl(mark.rule), what = FIX.what(mark);
      const info = docs ? `<a class="info" href="${esc(docs)}" target="_blank" rel="noopener" title="${esc(FIX.why)} · I" aria-keyshortcuts="I" aria-label="${esc(FIX.whyLabel(what))}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v4"/><circle class="tittle" cx="8" cy="4.9" r=".9"/></svg></a>` : '';
      const head = `<div class="cause"><i class="dot"></i><span class="cls">${esc(nameOf(g))}</span><span class="nav"><button class="prev" aria-label="Previous fix">‹</button>${esc(FIX.position(g, live, noteOf))}<button class="next" aria-label="Next fix">›</button></span><span class="what">${[what, ...FIX.places(placesOf(g), drawnOf(g, this.#host.scope?.()).here, !!this.#host.scope?.()).split(' · ')].map((part, i) => `<span>${esc(part)}${i ? '' : info}</span>`).join(' · ')}</span></div>`;
      const file = (f) => esc(String(f ?? '').split('/').slice(-2).join('/'));
      const adds = (name, value, f) => `<div class="hint"><code>${esc(name)}: ${esc(value)}</code> in <code>${file(f)}</code></div>`;
      let middle = '', canTake = false;
      const a = !v?.ready && !v?.reading && v?.suggest?.kind !== 'token' ? this.#action(g, v) : null;
      if (v?.ready) {
        // the suggested option is tried the moment the fix is in hand
        if (this.#previewed !== g.key && !v.code) { this.#previewed = g.key; queueMicrotask(() => this.#host.pick(v.at)); }
        const unit = kind === 'time' ? 'ms' : kind === 'type' && /weight/.test((mark.props ?? []).join()) ? '' : 'px';
        const items = v.options.map((o, i) => ({ n: Number.isFinite(o.n) ? o.n : i, html: `<button class="sp" data-kind="${kind}" data-i="${i}" aria-pressed="${v.at === i}">${specimen(kind, mark, o.n, o.label, o.swatch)}<span class="v">${Number.isFinite(o.n) ? `${o.n}${unit}` : esc(o.label)}</span><span class="tk">${Number.isFinite(o.n) ? esc(o.label) : ''}</span></button>` }));
        if (v.now && Number.isFinite(v.now.n) && !v.options.some((o) => o.n === v.now.n)) items.push({ n: v.now.n, html: `<div class="sp off" data-kind="${kind}" aria-disabled="true" title="What it is now">${specimen(kind, mark, v.now.n, v.now.label, v.now.swatch)}<span class="v">${v.now.n}${unit}</span><span class="tk">now</span></div>` });
        if (v.options.every((o) => Number.isFinite(o.n))) items.sort((a, b) => a.n - b.n);
        middle = `<div class="specimens">${items.map((x) => x.html).join('')}</div>`;
        canTake = !!v.options[v.at]?.ok;
      } else if (v?.reading) {
        middle = '';
      } else if (v?.suggest?.kind === 'token') {
        const s = v.suggest, value = String(s.value);
        this.#previewToken(g, s);
        middle = `<div class="note">${esc(FIX.craftToken)}</div>${adds(s.name, value, s.file)}`
          + `<div class="specimens"><button class="sp" data-kind="${kind}" aria-pressed="true">${specimen(kind, mark, parseFloat(value), value)}<span class="v">${esc(value)}</span><span class="tk">new</span></button></div>`;
        canTake = true;
      } else if (a?.kind === 'adopt') {
        middle = `<div class="note">${esc(FIX.adopt)}</div>${adds(a.name, a.value, a.file)}`;
        canTake = true;
      } else if (a?.kind === 'new') {
        middle = `<div class="note">${esc(FIX.newStep(FIX.what(mark).replace(/ not in your theme$/, ''), a.value))}</div>`
          + `<label class="field"${a.name && !a.ok ? ' data-invalid' : a.ok ? ' data-ok' : ''}>${esc(a.namespace)}-<span class="slot"><input name="token" value="${esc(a.name)}" style="${fitFor(a.name || FIX.newStepExample)}" placeholder="${esc(FIX.newStepExample)}" autocomplete="off" spellcheck="false" aria-label="Name of the new ${esc(FIX.what(mark).replace(/ not in your theme$/, '').toLowerCase())}"></span><span class="val" title="${esc(a.value)}">: ${esc(a.value)}</span><i class="ok-tick" aria-hidden="true"></i></label>`
          + `<div class="hint${a.name && !a.ok ? ' err' : ''}">${this.#newHint(g, a)}</div>`;
        canTake = a.ok;
      } else {
        // nothing to swap to or add: say what is there, plainly (a craft rule's own line, else the value typed by hand)
        const said = /dead-class/.test(mark.rule) ? `${FIX.line(mark)} ${String(mark.action ?? '').replace(/`/g, '')}`.trim() : mark.family === 'craft' ? v?.suggest?.text ?? mark.title : mark.family === 'color' && (mark.props ?? []).includes('box-shadow') ? FIX.shadowColour
          : /^provenance\//.test(mark.rule) && !/by-value|matches|tier|framework/.test(mark.rule) && mark.value != null || written(g.text) ? (({ value, worked }) => FIX.typed(String(value), true, worked))(FIX.valueOf(mark, g.text)) : FIX.line(mark, g.text);
        middle = `<div class="say">${esc(String(said ?? '').replace(/`/g, ''))}</div>`;
      }
      const label = v?.ready ? FIX.use(v.options[v.at]?.cls ?? v.options[v.at]?.label ?? '') : v?.suggest?.kind === 'token' || a ? FIX.addToTheme : null;
      const acts = this.#keeping
        ? `<label class="field why"${this.#why.trim().length >= 3 ? ' data-ok' : ''}>${esc(FIX.keepWhy)} <input name="why" value="${esc(this.#why)}" placeholder="${esc(FIX.keepExample)}" maxlength="120" autocomplete="off"><i class="ok-tick" aria-hidden="true"></i></label>`
          + `<div class="acts"><button class="primary keep-yes" ${this.#why.trim().length < 3 ? 'disabled' : ''}>${esc(FIX.keepPlaces(placesOf(g)))} <kbd>↵</kbd></button><button class="ghost keep-no">${FIX.cancel} <kbd>esc</kbd></button><span class="grow"></span></div>`
        : `<div class="acts">${label ? `<button class="primary take" ${canTake ? '' : 'disabled'}>${esc(label)} <kbd>↵</kbd></button>` : ''}<button class="ghost keep">${FIX.keep} <kbd>K</kbd></button><button class="ghost skip">${FIX.skip} <kbd>→</kbd></button><span class="grow"></span></div>`;
      const unseen = g.members.some((m) => shown(m.el)) ? '' : `<div class="say">${esc(drawn(g) ? FIX.unseen(placesOf(g)) : FIX.offPage(placesOf(g)))}</div>`;
      // a write that didn't land: why, on the fix it was for (back in hand, to try again)
      const also = elsewhere(g, this.#host.scope?.()), reach = also ? `<div class="say">${esc(FIX.elsewhere(also))}</div>` : '';
      const failed = this.#error ? `<div class="say err" role="alert">${esc(this.#error)}</div>` : '';
      html = `<div class="body"${slide ? '' : ' style="animation:none"'}>${head}${failed}${unseen}${reach}${middle}${acts}</div>`;
    }
    // the last fix written stays said above, with its Undo, until the next one is written
    if (this.#last && !this.#cleanup.running && !this.#writing && !this.#undoing && !this.#done) html = `<div class="said" role="status"><svg class="tick" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.8"/></svg><span class="t">${esc(this.#last.text)}</span>${this.#last.undo?.length ? `<button class="ghost undo">${FIX.undo}</button>` : ''}</div>${html}`;
    this.#el.toggleAttribute('data-rest', html.includes('class="line bar'));
    if (html === this.#html) return;
    this.#html = html;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, from = this.#el.offsetHeight;
    // a field being typed in keeps its words, caret and focus through a redraw
    const typing = this.#el.getRootNode().activeElement, field = typing?.matches?.('input') && this.#el.contains(typing) ? { name: typing.name, value: typing.value, at: [typing.selectionStart, typing.selectionEnd] } : null;
    this.#el.innerHTML = html;
    if (field) { const f = this.#el.querySelector(`input[name="${field.name}"]`); if (f) { f.value = field.value; f.focus(); f.setSelectionRange(...field.at); } }
    const to = this.#el.scrollHeight;
    if (!still && from && from !== to) { this.#el.style.height = `${from}px`; void this.#el.offsetHeight; this.#el.style.height = `${to}px`; this.#life.timeout(() => (this.#el.style.height = ''), TIMING.open + 20); }
    // the bar changed size: what is placed clear of it is placed again (now, and once its height has moved)
    if (from !== to && this.#card.open) { this.#card.place(); if (!still) this.#life.timeout(() => this.#card.place(), TIMING.open + 40); }
  }
  #html = '';

  // The page celebrates: every fixed place clicks into place, one after another; the page breathes once; the ✓ draws
  // and bursts. Then the panel folds. (Places that a reload replaced are found again by nothing: the breath and the
  // burst still play.)
  // every Apply that lands says so: the ✓ and "n changes applied", the fixed places click, then the panel folds back
  // a line said for a moment at rest: why the element pointed at has nothing in hand
  notice(text) { this.#notice = text; this.#html = ''; this.render(); clearTimeout(this.#noticeTimer); this.#noticeTimer = setTimeout(() => { this.#notice = null; this.#html = ''; this.render(); }, 4000); }
  // after a reload: what the write before it applied, said as if it had just landed
  resumed(text, undo = [], place = null, group = null) { this.#last = { text, undo, group, key: place?.key ?? null }; if (place?.key) this.#taken.set(place.key, { key: place.key, members: [] }); this.#resumeAt = Number.isInteger(place?.at) ? { at: place.at, key: place.key ?? null, since: performance.now() } : null; if (this.#resumeAt) this.#life.timeout(() => { if (this.#resumeAt && this.#progress) this.progress(this.#progress); }, RESUME_WAIT + 50); this.#html = ''; this.render(); this.#host.announce?.(text); }
  celebrate() {
    clearTimeout(this.#foldTimer);
    this.#done = true; this.#html = ''; this.render();
    const fold = () => { this.#foldTimer = setTimeout(() => { this.#done = false; this.#html = ''; this.render(); }, TIMING.fold); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return fold();
    const els = [...new Set(this.#fixed)].filter((el) => el.isConnected).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    els.forEach((el, i) => el.animate(
      [{ translate: '0 0' }, { translate: `0 ${CLICK.drop}px`, offset: 0.28, easing: 'cubic-bezier(.3, 0, .6, 1)' }, { translate: `0 ${CLICK.over}px`, offset: 0.62, easing: 'cubic-bezier(.3, 0, .4, 1)' }, { translate: '0 0' }],
      { duration: CLICK.ms, delay: TIMING.click + i * TIMING.clickGap }));
    const body = document.body;
    body.animate([{ scale: '1' }, { scale: String(BREATH.scale), offset: 0.45, easing: 'cubic-bezier(.3, 0, .2, 1)' }, { scale: '1' }],
      { duration: BREATH.ms, delay: TIMING.click + els.length * TIMING.clickGap + TIMING.breath - CLICK.ms / 2, easing: 'ease-in-out' });
    this.#life.timeout(() => this.#burst(), TIMING.check + 180);
    this.#fixed = [];
    fold();
  }
  #burst() {
    const at = this.#el.querySelector('.check')?.getBoundingClientRect();
    if (!at) return;
    burst(this.#el.getRootNode(), at.left + at.width / 2, at.top + at.height / 2, { frames: (f) => this.#life.frames(f) });
  }
}

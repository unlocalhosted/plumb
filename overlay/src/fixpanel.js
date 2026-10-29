/* ─────────────────────────────────────────────────────────
 * FIX PANEL · React Plumber overlay
 *
 * The one place you act (overlay/demo/fix-flow.html is its drawing). The page shows only heat; everything else is
 * here, docked at the bottom centre, never placed against an element, so nothing can collide.
 *
 * The unit is a cause: one class under one rule, every place it is used. One decision, every place moves.
 *
 *  rest       one line: "8 problems · 7 causes   Fix ↵" (and "Apply n" once something is taken)
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
 *  writing    "Writing n changes to your code"
 *  done       the page celebrates (every fixed place clicks into place, the page breathes), a ✓ draws and bursts
 *             into confetti made of the overlay's own pieces, then the panel folds back
 *
 * Keys (while blueprint is on): Enter starts or takes · ↑ ↓ try · K keep it · → Tab skip · ← back · A apply · Esc put it down
 * Every action is taken first and written with the rest on Apply: one write, one undo.
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { groundIsDark } from './geometry.js';
import { FIX } from './words.js'; // every sentence the panel says
import { groupsOf } from './blueprint-panel.js';

const TIMING = { open: 260, next: 180, click: 60, clickGap: 45, breath: 480, check: 600, fold: 2300 };
const CLICK = { drop: 3, over: -1, ms: 420 };
const BREATH = { scale: 1.006, ms: 620 };
const BURST = { pieces: 40, speed: [380, 760], spread: 1.1, gravity: 1100, spin: 9, life: 1600, size: [7, 11] };
const SPRING = 'cubic-bezier(.3, 1.35, .5, 1)', EASE = 'cubic-bezier(.2, .8, .2, 1)';
const SCALE = 0.62; // px of drawing per px of page, for padding specimens

export const FIX_CSS = `
  /* the old pieces this panel replaces stay out of sight */
  .bpp, .cg, .sel { display: none !important; }
  .fx { position: fixed; left: 50%; bottom: 72px; translate: -50% 0; width: 520px; max-width: calc(100vw - 32px); box-sizing: border-box; pointer-events: auto; z-index: 2;
    background: rgb(255 255 255 / .82); -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6);
    border-radius: 18px; color: #1c1b19; font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; overflow: hidden;
    box-shadow: 0 0 0 .5px rgb(0 0 0 / .09), 0 1px 1px rgb(0 0 0 / .04), 0 8px 20px -8px rgb(0 0 0 / .14), 0 28px 56px -24px rgb(0 0 0 / .18), inset 0 1px 0 rgb(255 255 255 / .9);
    transition: height ${TIMING.open}ms ${SPRING}; }
  .fx[hidden] { display: none; }
  .fx button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }
  .fx kbd { font: 500 10.5px/1 ui-monospace, monospace; color: #8b8a85; margin-left: 2px; }
  .fx .line { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 7px 0 16px; }
  .fx .dot { width: 7px; height: 7px; border-radius: 50%; background: #ff1f8f; box-shadow: 0 0 0 3px rgb(255 31 143 / .14); flex: none; }
  .fx .count { font-weight: 550; } .fx .count span { color: #8b8a85; font-weight: 450; }
  .fx .count .err { color: #c2304f; font-weight: 550; }
  .fx .grow { flex: 1; }
  .fx .primary { height: 32px; padding: 0 12px 0 14px; border-radius: 11px; background: #1c1b19; color: #fff; font-weight: 550; display: inline-flex; align-items: center; gap: 6px;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / .12), 0 1px 2px rgb(0 0 0 / .2); transition: transform 160ms ${SPRING}, opacity 160ms; }
  .fx .primary:active { transform: scale(.97); } .fx .primary kbd { color: rgb(255 255 255 / .55); } .fx .primary[disabled] { opacity: .28; cursor: default; }
  .fx .ghost { height: 32px; padding: 0 10px; border-radius: 10px; color: #55544f; display: inline-flex; align-items: center; gap: 5px; }
  .fx .ghost:hover { background: rgb(0 0 0 / .045); }
  .fx .apply { height: 32px; padding: 0 6px 0 12px; border-radius: 11px; display: inline-flex; align-items: center; gap: 8px; font-weight: 550; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
  .fx .apply .badge { min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: 7px; background: #1c1b19; color: #fff; font: 600 11px/20px ui-monospace, monospace; text-align: center; }
  .fx .apply[disabled] { opacity: .35; cursor: default; } .fx .apply[disabled] .badge { background: rgb(0 0 0 / .12); color: #55544f; }
  .fx .cause { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2px 10px; padding: 16px 12px 4px 18px; }
  .fx .cause .cls { font: 600 14px/1.2 ui-monospace, monospace; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fx .cause .what { grid-column: 2; color: #8b8a85; }
  .fx .cause .nav { grid-row: span 2; grid-column: 3; display: flex; align-items: center; gap: 2px; color: #8b8a85; font: 500 11.5px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .fx .cause .nav button { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: #55544f; }
  .fx .cause .nav button:hover { background: rgb(0 0 0 / .05); }
  .fx .note { margin: 2px 18px 0; padding: 8px 10px; border-radius: 10px; background: rgb(0 0 0 / .035); color: #55544f; font-size: 12px; line-height: 1.45; }
  .fx .note code { font: 600 11.5px/1 ui-monospace, monospace; color: #1c1b19; }
  .fx .say { padding: 8px 18px 14px; color: #55544f; max-width: 52ch; }
  .fx .specimens { display: flex; gap: 6px; padding: 10px 14px 6px; }
  .fx .sp { flex: 1 1 0; min-width: 0; max-width: 104px; margin: 0 auto; display: grid; justify-items: center; gap: 6px; padding: 10px 4px 9px; border-radius: 12px; position: relative;
    --hue: 120 120 120; --space: rgb(var(--hue) / .42); --space-line: rgb(var(--hue) / .35); --word: #8b8a85; color: #b4b3ad; transition: box-shadow 180ms, background 180ms; }
  .fx .sp[data-kind="padding"] { --hue: 26 158 98; } .fx .sp[data-kind="margin"] { --hue: 226 128 10; } .fx .sp[data-kind="gap"] { --hue: 122 92 240; }
  .fx .sp svg { width: 52px; height: 40px; overflow: visible; }
  .fx .sp .space-fill { fill: var(--space); } .fx .sp .space-line { stroke: var(--space-line); } .fx .sp .word { fill: var(--word); }
  .fx .sp .v { font: 600 13px/1 ui-monospace, monospace; font-variant-numeric: tabular-nums; color: #8b8a85; letter-spacing: -.01em; white-space: nowrap; }
  .fx .sp .tk { font: 500 10.5px/1 ui-monospace, monospace; color: #a3a29c; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .fx button.sp:not([aria-pressed="true"]):hover { --space: rgb(var(--hue) / .62); --space-line: rgb(var(--hue) / .5); --word: #55544f; }
  .fx button.sp:not([aria-pressed="true"]):hover .v { color: #55544f; }
  .fx .sp[aria-pressed="true"] { background: #fff; --space: rgb(var(--hue)); --space-line: rgb(var(--hue)); --word: #1c1b19; box-shadow: 0 0 0 1.5px #1c1b19, 0 1px 2px rgb(0 0 0 / .06), 0 6px 14px -6px rgb(0 0 0 / .18); }
  .fx .sp[aria-pressed="true"] .v { color: #1c1b19; } .fx .sp[aria-pressed="true"] .tk { color: #55544f; }
  .fx .sp.off { opacity: .45; cursor: not-allowed; --space: #b4b3ad; --space-line: #c9c8c2; --word: #b4b3ad; }
  .fx .sp.off .v { text-decoration: line-through; text-decoration-thickness: 1px; }
  .fx .sp .swatch { width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); margin: 7px 0; }
  .fx button:focus-visible, .fx input:focus-visible { outline: 2px solid #3b6cff; outline-offset: 2px; }
  .fx .field { display: flex; align-items: center; gap: 0; margin: 8px 18px 2px; height: 34px; padding: 0 10px; border-radius: 10px; background: #fff;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / .12); font: 500 12.5px/1 ui-monospace, monospace; color: #8b8a85; transition: box-shadow 140ms; }
  .fx .field:focus-within { box-shadow: inset 0 0 0 1.5px #1c1b19; }
  .fx .field[data-invalid] { box-shadow: inset 0 0 0 1.5px #c2304f; }
  .fx .field input { all: unset; min-width: 4ch; color: #1c1b19; font: inherit; }
  .fx .field.why input { flex: 1; }
  .fx .field input::placeholder { color: #b4b3ad; }
  .fx .field.why { gap: 6px; font: 13px/1.35 var(--pl-sans, system-ui), sans-serif; } .fx .field.why input { font: inherit; }
  .fx .hint { margin: 4px 18px 0; color: #8b8a85; font-size: 12px; min-height: 16px; }
  .fx .hint code { font: 600 11.5px/1 ui-monospace, monospace; color: #1c1b19; }
  .fx .hint.err { color: #c2304f; }
  .fx .acts { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; margin-top: 4px; border-top: .5px solid rgb(0 0 0 / .08); }
  .fx .body { animation: fx-slide ${TIMING.next}ms ${EASE} both; }
  @keyframes fx-slide { from { opacity: 0; translate: 10px 0; } }
  .fx .writing { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 16px; color: #55544f; }
  .fx .writing i { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid #1c1b19; border-top-color: transparent; animation: fx-spin .7s linear infinite; }
  @keyframes fx-spin { to { rotate: 1turn; } }
  .fx .done { justify-content: center; gap: 8px; padding: 0 16px; }
  .fx .check { width: 18px; height: 18px; }
  .fx .check path { fill: none; stroke: #1c1b19; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 16; stroke-dashoffset: 16; animation: fx-draw 340ms ${TIMING.check}ms ${EASE} forwards; }
  .fx .done .words { font-weight: 600; opacity: 0; animation: fx-rise 280ms ${TIMING.check + 160}ms ${EASE} forwards; }
  @keyframes fx-draw { to { stroke-dashoffset: 0; } }
  @keyframes fx-rise { from { opacity: 0; translate: 0 2px; } to { opacity: 1; translate: 0 0; } }
  canvas.fx-burst { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 3; }
  @media (prefers-reduced-motion: reduce) { .fx, .fx .sp { transition: none; } .fx .body { animation: none; } .fx .check path { animation: none; stroke-dashoffset: 0; } .fx .done .words { animation: none; opacity: 1; } }
  /* dark: the page's own ground decides (as the overlay does), not the operating system */
    .fx[data-scheme="dark"] { background: rgb(30 30 33 / .82); color: #f1f0ec; box-shadow: 0 0 0 .5px rgb(255 255 255 / .12), 0 8px 20px -8px rgb(0 0 0 / .5), 0 28px 56px -24px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 255 255 / .06); }
    .fx[data-scheme="dark"] .primary { background: #f1f0ec; color: #1c1b19; } .fx[data-scheme="dark"] .primary kbd { color: rgb(0 0 0 / .45); }
    .fx[data-scheme="dark"] .apply { box-shadow: inset 0 0 0 1px rgb(255 255 255 / .16); } .fx[data-scheme="dark"] .apply .badge { background: #f1f0ec; color: #1c1b19; }
    .fx[data-scheme="dark"] .ghost { color: #c9c8c2; } .fx[data-scheme="dark"] .note { background: rgb(255 255 255 / .06); color: #c9c8c2; } .fx[data-scheme="dark"] .note code, .fx[data-scheme="dark"] .cause .cls { color: #f1f0ec; }
    .fx[data-scheme="dark"] .sp[aria-pressed="true"] { background: #2a2a2e; --word: #f1f0ec; box-shadow: 0 0 0 1.5px #f1f0ec; } .fx[data-scheme="dark"] .sp[aria-pressed="true"] .v { color: #f1f0ec; }
    .fx[data-scheme="dark"] .say, .fx[data-scheme="dark"] .hint, .fx[data-scheme="dark"] .cause .what, .fx[data-scheme="dark"] .field { color: #a3a29c; }
    .fx[data-scheme="dark"] .field { background: #2a2a2e; box-shadow: inset 0 0 0 1px rgb(255 255 255 / .16); } .fx[data-scheme="dark"] .field input, .fx[data-scheme="dark"] .hint code { color: #f1f0ec; }
    .fx[data-scheme="dark"] .check path { stroke: #f1f0ec; } .fx[data-scheme="dark"] .writing i { border-color: #f1f0ec; border-top-color: transparent; }
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
// what an arbitrary class writes, as written: text-[length:calc(var(--z)*12px)] → calc(var(--z)*12px)
const written = (cls) => { const m = /\[(?:[a-z-]+:)?(.+)\]!?$/.exec(String(cls ?? '')); return m ? m[1].replace(/_/g, ' ') : null; };
const noteOf = (g) => g.members.every((m) => m.mark.family === 'craft' && (!m.mark.craft?.suggest || m.mark.craft.suggest.kind === 'advice'));

// on the page and drawn: not inside something closed (display: none, a closed <details>, content-visibility), and not
// of no size
const shown = (el) => el?.isConnected && (el.checkVisibility?.({ visibilityProperty: true }) ?? true) && el.getClientRects().length > 0;

export class FixPanel {
  #el; #host; #groups = []; #code = 0; #at = 0; #held = null; #pending = null; #error = null; #progress = null; #holding = false; #taken = new Map(); #tokens = new Map(); #writing = false; #done = false; #previewed = null; #fixed = []; #fixedCount = 0; #on = false;
  #steady = null; #doneText = null; #notice = null; #noticeTimer = 0;   // the last settled count { places, causes, notes }: said while the page is checked again
  #foldTimer = 0;
  #keeps = new Map(); // cause key → { rule, sites, why }: kept as intended, written on Apply
  #keeping = false;   // the why field is open for the cause in hand
  #why = '';          // its words as typed
  #names = new Map(); // cause key → the new token's name as typed

  // host: { hold(group, lead), release(), view(), pick(i), take(), applyAll(tokens, keeps) → Promise, spotlight(els), tokens() → policy }
  constructor(root, host) {
    this.#host = host;
    this.#el = Object.assign(document.createElement('div'), { className: 'fx', hidden: true });
    this.#el.setAttribute('role', 'region');
    this.#el.setAttribute('aria-label', 'Fix');
    root.append(this.#el);
    this.#el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('start')) this.hold(0);
      else if (b.classList.contains('sp')) this.#host.pick(+b.dataset.i);
      else if (b.classList.contains('take')) this.take();
      else if (b.classList.contains('skip') || b.classList.contains('next')) this.skip(1);
      else if (b.classList.contains('prev')) this.skip(-1);
      else if (b.classList.contains('apply')) this.apply();
      else if (b.classList.contains('keep')) this.keep();
      else if (b.classList.contains('keep-yes')) this.#keepIt();
      else if (b.classList.contains('keep-no')) this.#closeKeep();
    });
    // the fields own their keys: Enter does the field's action, Esc closes or leaves it; the page's keys never see them
    this.#el.addEventListener('input', (e) => {
      if (e.target.name === 'token') { this.#names.set(this.#held?.key, e.target.value.trim()); e.target.size = Math.max(4, e.target.value.length + 1); this.#sayNew(); }
      if (e.target.name === 'why') { this.#why = e.target.value; this.#el.querySelector('.keep-yes')?.toggleAttribute('disabled', this.#why.trim().length < 3); }
    });
    this.#el.addEventListener('keydown', (e) => {
      if (!e.target.matches?.('input')) return;
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); e.target.name === 'why' ? this.#keepIt() : this.take(); }
      if (e.key === 'Escape') { e.preventDefault(); e.target.name === 'why' ? this.#closeKeep() : e.target.blur(); }
    });
  }
  get rect() { return this.#el.hidden ? null : this.#el.getBoundingClientRect(); }
  get holding() { return this.#holding; }

  // each opening starts unread: the last one's count and its settled mark never stand in for this reading
  show(on) { if (on) this.#el.dataset.scheme = darkGround() ? 'dark' : 'light'; if (on !== this.#on) { this.#groups = []; this.#progress = null; this.#steady = null; this.#notice = null; clearTimeout(this.#noticeTimer); this.#el.removeAttribute('data-settled'); } this.#on = on; this.#el.hidden = !on; if (!on) { this.#letGo(false); this.#done = false; } this.render(); }
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
  progress(p) { this.#progress = p; this.#el.toggleAttribute('data-settled', !!p && (p.done ?? p.read === p.total)); this.render(); }
  // put down: the page is back as it was read before (`keep` false), or what was taken is on it now (`keep`: the reading
  // made while it was tried is the page's)
  #letGo(keep) { this.#holding = false; const p = this.#pending; this.#pending = null; if (keep && p) this.set(p); }
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
    if (!live.length) return;
    this.#notice = null;
    this.#at = (i + live.length) % live.length;
    this.#holding = true; this.#done = false; this.#previewed = null; this.#error = null; this.#keeping = false;
    const g = live[this.#at];
    this.#held = g;
    // the place in hand is one that can be seen: a cause is counted from the source, so some of its places may be
    // inside something closed (a menu, a dialog)
    const el = g.members.some((m) => m.el === lead) ? lead : (g.members.find((m) => shown(m.el)) ?? g.members[0]).el;
    this.#host.hold(g, el);
    this.#host.spotlight([...new Set(g.members.map((m) => m.el))]);
    this.render(true);
    this.#host.announce?.(FIX.inHand(FIX.position(g, live, noteOf), g.text, FIX.what(g.members[0].mark), g.members.length));
    // the place in hand is seen above the panel, never under it (once the panel has its height)
    // (and again once it has opened: held as Blueprint comes on, the panel has no height yet)
    // pointed at (a click, Alt+click): it is where the person looks, so it only moves out from under the panel;
    // reached by keys: it is brought into view wherever it is
    if (reveal !== 'none') {
      const covered = reveal === 'uncover';
      requestAnimationFrame(() => requestAnimationFrame(() => this.#reveal(el, covered)));
      setTimeout(() => { if (this.#held === g) this.#reveal(el, covered); }, TIMING.open + 40);
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
    // the cause already in hand: nothing to do (holding it again would read its own preview as how it is now)
    if (this.#holding && this.#held?.members.some((m) => m.el === el && m.mark.key === mark?.key)) return true;
    const i = this.#live().findIndex((g) => g.members.some((m) => m.el === el && m.mark.key === mark?.key));
    if (i < 0) return false;
    this.hold(i, el);
    return true;
  }
  holdEl(el, reveal = 'none') {
    if (this.#holding && this.#held?.members.some((m) => m.el === el)) return true;
    const i = this.#live().findIndex((g) => g.members.some((m) => m.el === el));
    if (i < 0) return false;
    this.hold(i, el, reveal);
    return true;
  }
  release() {
    if (!this.#holding) return false;
    this.#keeping = false;
    const g = this.#cause();
    if (g) this.#unpreviewToken(g);
    this.#letGo(false);
    this.#host.release();
    this.#host.spotlight([]);
    this.render();
    return true;
  }
  skip(by) {
    if (!this.#holding) return;
    const g = this.#cause();
    if (g) this.#unpreviewToken(g);
    this.#host.release();
    this.#holding = false;
    this.hold(this.#at + by);
  }
  // the selection's view, only when it is about this cause: never another problem's options, shown or taken
  #viewOf(g) { const v = g ? this.#host.view() : null; return v && g.members.some((m) => m.mark.key === v.mark?.key && m.mark.rule === v.mark?.rule) ? v : null; }
  take() {
    const g = this.#cause(), v = this.#viewOf(g);
    if (!g || !v) return;
    if (v.ready) {
      if (!v.options[v.at]?.ok) return; // its exact edit is still being read
      this.#host.take();
    } else if (v.suggest?.kind === 'token') {
      this.#tokens.set(g.key, { suggest: v.suggest, els: [...new Set(g.members.map((m) => m.el))] });
    } else {
      const a = this.#action(g, v);
      if (a?.kind === 'adopt') this.#tokens.set(g.key, { suggest: { kind: 'token', file: a.file, hash: a.hash, name: a.name, value: a.value }, els: [] });
      else if (a?.kind === 'new') {
        // no name yet: the field is where the answer goes
        if (!a.ok) { const f = this.#el.querySelector('input[name="token"]'); f?.focus(); f?.closest('.field')?.toggleAttribute('data-invalid', !!a.name); return; }
        this.#tokens.set(g.key, { suggest: { kind: 'token', file: a.file, hash: a.hash, name: a.token, value: a.value, then: { from: g.text, to: a.cls } }, els: [...new Set(g.members.map((m) => m.el))], marks: g.members.map((m) => m.mark) });
      } else return;
    }
    this.#taken.set(g.key, g);
    this.#host.release();
    this.#host.spotlight([]);
    if (this.#live().length) this.hold(Math.min(this.#at, this.#live().length - 1)); else { this.#letGo(true); this.render(); }
  }
  // Keep it: the cause is intended. Its why is asked in one line; every place is recorded as kept on Apply
  keep() {
    const g = this.#cause();
    if (!g || this.#keeping) return;
    this.#keeping = true; this.#why = ''; this.#html = ''; this.render();
    this.#el.querySelector('input[name="why"]')?.focus();
  }
  #closeKeep() { this.#keeping = false; this.#html = ''; this.render(); }
  #keepIt() {
    const g = this.#cause(), why = this.#why.trim();
    if (!g || why.length < 3) return;
    this.#keeps.set(g.key, { rule: g.members[0].mark.rule, why, els: [...new Set(g.members.map((m) => m.el))], sites: g.members.map((m) => ({ file: m.mark.file, line: m.mark.line, column: m.mark.column, text: m.mark.text })) });
    this.#keeping = false;
    this.#taken.set(g.key, g);
    this.#host.release();
    this.#host.spotlight([]);
    if (this.#live().length) this.hold(Math.min(this.#at, this.#live().length - 1)); else { this.#letGo(true); this.render(); }
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
    this.#el.querySelector('.field')?.toggleAttribute('data-invalid', !!a.name && !a.ok);
    hint.classList.toggle('err', !!a.name && !a.ok);
    hint.innerHTML = this.#newHint(g, a);
    take?.toggleAttribute('disabled', !a.ok);
  }
  #newHint(g, a) {
    const n = g.members.length;
    return a.name && !a.ok ? esc(FIX.newStepBad) : a.ok ? `${esc(FIX.becomes(n))} <code>${esc(a.cls)}</code>` : esc(FIX.newStepHint(n));
  }
  async apply() {
    if (!this.#taken.size || this.#writing) return;
    this.#fixed = [...this.#taken.values()].flatMap((g) => g.members.map((m) => m.el));
    this.#fixedCount = this.#taken.size;
    this.#writing = true; this.#letGo(true); this.#host.release(); this.#host.spotlight([]);
    this.render();
    let left = { count: 0 };
    try { left = (await this.#host.applyAll([...this.#tokens.values()], [...this.#keeps.values()], this.#taken.size)) ?? left; }
    catch (error) { left = { count: this.#taken.size, why: error?.message }; }
    finally {
      this.#writing = false;
      // what didn't land stays taken, with why; A tries again (the file is read again first)
      if (!left.count) {
        if (this.#steady) this.#steady = { ...this.#steady, places: Math.max(0, this.#steady.places - this.#fixed.length), causes: Math.max(0, this.#steady.causes - this.#taken.size) };
        this.#error = null; this.#taken.clear(); this.#tokens.clear(); this.#keeps.clear();
        this.#confirm();
      }
      else {
        this.#error = left.why ?? FIX.couldNot;
        // only tokens were refused: the causes written are done; the refused ones stay taken
        if (left.count === left.refused?.length) {
          const keep = new Set([...this.#tokens].filter(([, t]) => left.refused.includes(t)).map(([k]) => k));
          for (const k of [...this.#taken.keys()]) if (!keep.has(k)) this.#taken.delete(k);
          for (const k of [...this.#tokens.keys()]) if (!keep.has(k)) this.#tokens.delete(k);
          this.#keeps.clear();
        }
      }
      this.#html = ''; this.render();
    }
  }

  key(k) {
    if (!this.#on || this.#writing) return false;
    // Enter on something with focus is that thing's: a button here is pressed (a specimen is already picked, so Enter
    // takes it, as anywhere); a glow on the page, with nothing in hand, holds its own cause (with a cause in hand, the
    // glow a click left focused is that cause's, and Enter takes it)
    if (k === 'Enter') {
      const a = this.#el.getRootNode().activeElement;
      if (a && this.#el.contains(a) && a.matches('button:not(.sp)')) { a.click(); return true; }
      if (!this.#holding && a?.classList?.contains('hit')) return false;
    }
    if ((k === 'a' || k === 'A') && this.#taken.size) { this.apply(); return true; }
    if (!this.#holding) {
      if (k === 'Enter' && this.#live().length) { this.hold(0); return true; }
      return false;
    }
    const v = this.#viewOf(this.#cause());
    if (k === 'ArrowUp' || k === 'ArrowDown') { if (v?.ready) this.#host.pick(Math.max(0, Math.min(v.options.length - 1, v.at + (k === 'ArrowUp' ? 1 : -1)))); return true; }
    if (k === 'Enter') { this.take(); return true; }
    if (k === 'k' || k === 'K') { this.keep(); return true; }
    if (k === 'ArrowRight' || k === 'Tab') { this.skip(1); return true; }
    if (k === 'ArrowLeft') { this.skip(-1); return true; }
    if (k === 'Escape') { this.release(); return true; }
    return false;
  }

  // a token's preview: the value it would set, on every place, as inline styles the panel owns. A suggestion's `sets`
  // are px for the element its finding is on (a line height is 1.5 × that element's size), so each place is previewed
  // with its own finding's values when it offers the same fix, and a number is written as px (inplace.js does the same)
  #tokenPreview = new Map(); // el → [[prop, value, priority]]
  #previewToken(g, suggest) {
    if (this.#tokenPreview.size) return;
    const own = new Map(g.members.map((m) => { const s = m.mark?.craft?.suggest; return [m.el, s?.to === suggest.to && s?.sets ? s.sets : null]; }));
    for (const el of new Set(g.members.map((m) => m.el))) {
      const had = [];
      for (const [k, v] of Object.entries(own.get(el) ?? suggest.sets ?? {})) { const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()); had.push([prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]); el.style.setProperty(prop, typeof v === 'number' ? `${v}px` : String(v), 'important'); }
      this.#tokenPreview.set(el, had);
    }
  }
  #unpreviewToken(g) {
    if (this.#tokens.has(g.key)) return; // taken: it stays until it is written
    for (const [el, had] of this.#tokenPreview) for (const [p, v, pr] of had) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); }
    this.#tokenPreview.clear();
  }

  render(slide = false) {
    if (!this.#on) return;
    const live = this.#live(), taken = this.#taken.size, g = this.#cause(), v = this.#viewOf(g);
    // nothing is said to match until every element on the page has been read
    const settled = this.#progress?.done ?? (!!this.#progress?.total && this.#progress.read === this.#progress.total);
    const apply = `<button class="apply" ${taken ? '' : 'disabled'}>${FIX.apply} <span class="badge">${taken}</span></button>`;
    let html;
    if (this.#writing) html = `<div class="writing"><i></i>${esc(FIX.applying(taken))}</div>`;
    else if (this.#done) html = `<div class="line done"><svg class="check" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.8"/></svg><span class="words">${esc(this.#doneText ?? FIX.applied(this.#fixedCount))}</span></div>`;
    else if (!g && this.#notice) html = `<div class="line"><span class="count"><span>${esc(this.#notice)}</span></span></div>`;
    else if (!g) {
      // a note (advice, no exact edit) is shown with the fixes but never counted as a problem
      const causesNow = live.filter((x) => !noteOf(x));
      let causes = causesNow.length, notes = live.length - causes, places = causesNow.reduce((n, x) => n + x.members.length, 0);
      // checking again (after an apply, a page change): the last settled count stands until the new one settles
      if (settled) this.#steady = { places, causes, notes, path: location.pathname };
      else if (this.#steady?.path === location.pathname) ({ places, causes, notes } = this.#steady);
      const unchecked = this.#progress?.notChecked ? ` · <span title="${esc(FIX.uncheckedTitle)}">${esc(FIX.unchecked(this.#progress.notChecked))}</span>` : '';
      const tail = `${notes ? ` · ${FIX.notes(notes)}` : ''}${unchecked}${settled ? '' : ` · ${FIX.stillChecking}`}`;
      html = places || notes
        ? `<div class="line"><i class="dot"></i><span class="count">${this.#error ? `<span class="err">${esc(this.#error)}</span>` : places ? `${FIX.problems(places)} <span>· ${FIX.fixes(causes)}${tail}</span>` : `<span>${FIX.notes(notes)}${settled ? '' : ` · ${FIX.stillChecking}`}</span>`}</span><span class="grow"></span>${taken ? apply : ''}<button class="primary start">${FIX.start} <kbd>↵</kbd></button></div>`
        : `<div class="line"><span class="count"><span>${esc(this.#error ?? (taken ? FIX.ready(taken) : !settled ? FIX.checking : this.#progress?.notChecked ? FIX.clearChecked(this.#progress.notChecked) : FIX.clear))}</span></span><span class="grow"></span>${taken ? apply : ''}</div>`;
    } else {
      const mark = g.members[0].mark, kind = kindOf(mark);
      const head = `<div class="cause"><i class="dot"></i><span class="cls">${esc(g.text)}</span><span class="nav"><button class="prev" aria-label="Previous fix">‹</button>${esc(FIX.position(g, live, noteOf))}<button class="next" aria-label="Next fix">›</button></span><span class="what">${esc(FIX.what(mark))} · ${esc(FIX.places(g.members.length))}</span></div>`;
      const file = (f) => esc(String(f ?? '').split('/').slice(-2).join('/'));
      const adds = (name, value, f) => `<div class="hint"><code>${esc(name)}: ${esc(value)}</code> in <code>${file(f)}</code></div>`;
      let middle = '', canTake = false;
      const a = !v?.ready && v?.suggest?.kind !== 'token' ? this.#action(g, v) : null;
      if (v?.ready) {
        // the suggested option is tried the moment the fix is in hand
        if (this.#previewed !== g.key) { this.#previewed = g.key; queueMicrotask(() => this.#host.pick(v.at)); }
        const unit = kind === 'time' ? 'ms' : kind === 'type' && /weight/.test((mark.props ?? []).join()) ? '' : 'px';
        const items = v.options.map((o, i) => ({ n: Number.isFinite(o.n) ? o.n : i, html: `<button class="sp" data-kind="${kind}" data-i="${i}" aria-pressed="${v.at === i}">${specimen(kind, mark, o.n, o.label, o.swatch)}<span class="v">${Number.isFinite(o.n) ? `${o.n}${unit}` : esc(o.label)}</span><span class="tk">${Number.isFinite(o.n) ? esc(o.label) : ''}</span></button>` }));
        if (v.now && Number.isFinite(v.now.n) && !v.options.some((o) => o.n === v.now.n)) items.push({ n: v.now.n, html: `<div class="sp off" data-kind="${kind}" aria-disabled="true" title="What it is now">${specimen(kind, mark, v.now.n, v.now.label, v.now.swatch)}<span class="v">${v.now.n}${unit}</span><span class="tk">now</span></div>` });
        if (v.options.every((o) => Number.isFinite(o.n))) items.sort((a, b) => a.n - b.n);
        middle = `<div class="specimens">${items.map((x) => x.html).join('')}</div>`;
        canTake = !!v.options[v.at]?.ok;
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
          + `<label class="field"${a.name && !a.ok ? ' data-invalid' : ''}>${esc(a.namespace)}-<input name="token" value="${esc(a.name)}" size="${Math.max(4, a.name.length + 1)}" placeholder="${esc(FIX.newStepExample)}" autocomplete="off" spellcheck="false" aria-label="Name of the new ${esc(FIX.what(mark).replace(/ not in your theme$/, '').toLowerCase())}">: ${esc(a.value)}</label>`
          + `<div class="hint${a.name && !a.ok ? ' err' : ''}">${this.#newHint(g, a)}</div>`;
        canTake = a.ok;
      } else {
        // nothing to swap to or add: say what is there, plainly (a craft rule's own line, else the value typed by hand)
        const said = /dead-class/.test(mark.rule) ? `${mark.text} makes no CSS, so it does nothing. ${String(mark.action ?? '').replace(/`/g, '')}`.trim() : mark.family === 'craft' ? v?.suggest?.text ?? mark.title : mark.family === 'color' && (mark.props ?? []).includes('box-shadow') ? FIX.shadowColour : /framework/.test(mark.rule) && mark.value ? FIX.tailwinds(g.text, String(mark.value))
          : /^provenance\//.test(mark.rule) && !/by-value|matches|tier/.test(mark.rule) && (written(g.text) ?? mark.value) ? FIX.typed(written(g.text) ?? String(mark.value)) : mark.title;
        middle = `<div class="say">${esc(String(said ?? '').replace(/`/g, ''))}</div>`;
      }
      const label = v?.ready ? FIX.use(v.options[v.at]?.cls ?? v.options[v.at]?.label ?? '') : v?.suggest?.kind === 'token' || a ? FIX.addToTheme : null;
      const acts = this.#keeping
        ? `<label class="field why">${esc(FIX.keepWhy)} <input name="why" value="${esc(this.#why)}" placeholder="${esc(FIX.keepExample)}" maxlength="120" autocomplete="off"></label>`
          + `<div class="acts"><button class="primary keep-yes" ${this.#why.trim().length < 3 ? 'disabled' : ''}>${esc(FIX.keepPlaces(g.members.length))} <kbd>↵</kbd></button><button class="ghost keep-no">${FIX.cancel} <kbd>esc</kbd></button><span class="grow"></span>${apply}</div>`
        : `<div class="acts">${label ? `<button class="primary take" ${canTake ? '' : 'disabled'}>${esc(label)} <kbd>↵</kbd></button>` : ''}<button class="ghost keep">${FIX.keep} <kbd>K</kbd></button><button class="ghost skip">${FIX.skip} <kbd>→</kbd></button><span class="grow"></span>${apply}</div>`;
      const unseen = g.members.some((m) => shown(m.el)) ? '' : `<div class="say">${esc(FIX.unseen(g.members.length))}</div>`;
      html = `<div class="body"${slide ? '' : ' style="animation:none"'}>${head}${unseen}${middle}${acts}</div>`;
    }
    if (html === this.#html) return;
    this.#html = html;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, from = this.#el.offsetHeight;
    // a field being typed in keeps its words, caret and focus through a redraw
    const typing = this.#el.getRootNode().activeElement, field = typing?.matches?.('input') && this.#el.contains(typing) ? { name: typing.name, value: typing.value, at: [typing.selectionStart, typing.selectionEnd] } : null;
    this.#el.innerHTML = html;
    if (field) { const f = this.#el.querySelector(`input[name="${field.name}"]`); if (f) { f.value = field.value; f.focus(); f.setSelectionRange(...field.at); } }
    const to = this.#el.scrollHeight;
    if (!still && from && from !== to) { this.#el.style.height = `${from}px`; void this.#el.offsetHeight; this.#el.style.height = `${to}px`; setTimeout(() => (this.#el.style.height = ''), TIMING.open + 20); }
  }
  #html = '';

  // The page celebrates: every fixed place clicks into place, one after another; the page breathes once; the ✓ draws
  // and bursts. Then the panel folds. (Places that a reload replaced are found again by nothing: the breath and the
  // burst still play.)
  // every Apply that lands says so: the ✓ and "n changes applied", the fixed places click, then the panel folds back
  // a line said for a moment at rest: why the element pointed at has nothing in hand
  notice(text) { this.#notice = text; this.#html = ''; this.render(); clearTimeout(this.#noticeTimer); this.#noticeTimer = setTimeout(() => { this.#notice = null; this.#html = ''; this.render(); }, 4000); }
  // after a reload: what the write before it applied, said as if it had just landed
  resumed(text) { this.#doneText = text; this.#confirm(); }
  #confirm() {
    this.#done = true; this.#html = ''; this.render();
    this.#host.announce?.(this.#doneText ?? FIX.applied(this.#fixedCount));
    clearTimeout(this.#foldTimer);
    this.#foldTimer = setTimeout(() => { this.#done = false; this.#doneText = null; this.#html = ''; this.render(); }, TIMING.fold);
  }
  celebrate() {
    clearTimeout(this.#foldTimer);
    this.#done = true; this.#html = ''; this.render();
    const fold = () => setTimeout(() => { this.#done = false; this.#html = ''; this.render(); }, TIMING.fold);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return fold();
    const els = [...new Set(this.#fixed)].filter((el) => el.isConnected).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    els.forEach((el, i) => el.animate(
      [{ translate: '0 0' }, { translate: `0 ${CLICK.drop}px`, offset: 0.28, easing: 'cubic-bezier(.3, 0, .6, 1)' }, { translate: `0 ${CLICK.over}px`, offset: 0.62, easing: 'cubic-bezier(.3, 0, .4, 1)' }, { translate: '0 0' }],
      { duration: CLICK.ms, delay: TIMING.click + i * TIMING.clickGap }));
    const body = document.body;
    body.animate([{ scale: '1' }, { scale: String(BREATH.scale), offset: 0.45, easing: 'cubic-bezier(.3, 0, .2, 1)' }, { scale: '1' }],
      { duration: BREATH.ms, delay: TIMING.click + els.length * TIMING.clickGap + TIMING.breath - CLICK.ms / 2, easing: 'ease-in-out' });
    setTimeout(() => this.#burst(), TIMING.check + 180);
    this.#fixed = [];
    fold();
  }
  #burst() {
    const at = this.#el.querySelector('.check')?.getBoundingClientRect();
    if (!at) return;
    const ox = at.left + at.width / 2, oy = at.top + at.height / 2, dpr = devicePixelRatio || 1;
    const cv = Object.assign(document.createElement('canvas'), { className: 'fx-burst', width: innerWidth * dpr, height: innerHeight * dpr });
    this.#el.getRootNode().append(cv);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const HUES = { pad: '#1a9e62', gap: '#7a5cf0', mar: '#e2800a', ink: '#1c1b19' }, rand = (a, b) => a + Math.random() * (b - a);
    const kinds = ['pad', 'pad', 'gap', 'gap', 'mar', 'mar', 'ink'];
    const parts = Array.from({ length: BURST.pieces }, (_, i) => { const a = -Math.PI / 2 + rand(-BURST.spread, BURST.spread), v = rand(...BURST.speed); return { kind: kinds[i % kinds.length], x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(0, Math.PI * 2), vr: rand(-BURST.spin, BURST.spin), size: rand(...BURST.size), wobble: rand(0, 6) }; });
    const paint = (p, alpha) => {
      const s = p.size, c = HUES[p.kind];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = alpha; ctx.scale(1, Math.abs(Math.cos(p.r * 0.6 + p.wobble)) * 0.6 + 0.4);
      if (p.kind === 'pad') { ctx.fillStyle = '#fff'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.beginPath(); for (let k = -s; k < s; k += 2.6) { ctx.moveTo(k - s / 2, s / 2); ctx.lineTo(k + s / 2, -s / 2); } ctx.save(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip(); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'gap') { const w = s * 1.5, h = s * 0.62; ctx.fillStyle = c; for (let k = 0; k < 3; k++) ctx.fillRect(-w / 2, -h / 2 + k * (h / 2.5), w, h / 5); }
      else if (p.kind === 'mar') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.globalAlpha = alpha * 0.25; ctx.fill(); ctx.globalAlpha = alpha; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { ctx.beginPath(); ctx.arc(dx * s * 0.2, dy * s * 0.2, 1, 0, Math.PI * 2); ctx.fill(); } }
      else { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(-s * 0.1, s * 0.3); ctx.lineTo(s * 0.45, -s * 0.35); ctx.stroke(); }
      ctx.restore();
    };
    let last = performance.now(); const t0 = last;
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000), t = now - t0; last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) { p.vy += BURST.gravity * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; paint(p, Math.max(0, Math.min(1, (BURST.life - t) / (BURST.life / 3)))); }
      if (t < BURST.life) requestAnimationFrame(tick); else cv.remove();
    };
    requestAnimationFrame(tick);
  }
}

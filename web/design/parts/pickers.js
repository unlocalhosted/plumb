// The design site's page for token pickers: the control that appears on an element when one of its values is
// hard-coded, and moves it onto your tokens.
//
// The direction (owner, 2026-11-10): it is a visual editor, not a scale. Each property gets the control a visual editor
// gives that property, made small: a border radius is changed by its corner, spacing by the space itself, a colour by
// a swatch. It snaps to your tokens and says the token's name; your hard-coded value is where it starts. Little UI: one
// row beside the element, and a handle on the element itself where the property has a natural one.
//
// One property at a time, on a real piece of UI. Border radius, then gap, then padding, then font size. The row, the list, the rolling value, drag
// mode and the tick are one piece (picker() below); each property brings its element, its handle and its list mark.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { PICKER_CSS, picker as pick } from '../../../overlay/src/picker.js';
import { GLYPH_CSS, glyph } from '../../../overlay/src/glyphs.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';
import { COLOUR_PICK_CSS, colourPick } from '../../../overlay/src/colourpick.js';

// someone's colour tokens: each with its role, its light value and its dark value. The button's fill is a hard-coded
// #2f6fed, near the accent but not it
const COLOURS = [
  { name: 'fg', role: 'text', l: '#101828', d: '#f5f5f6' }, { name: 'muted', role: 'text', l: '#475467', d: '#94969c' }, { name: 'faint', role: 'text', l: '#98a2b3', d: '#61646c' },
  { name: 'bg', role: 'surface', l: '#ffffff', d: '#0c111d' }, { name: 'surface', role: 'surface', l: '#f9fafb', d: '#161b26' }, { name: 'sunken', role: 'surface', l: '#f2f4f7', d: '#1f242f' },
  { name: 'line', role: 'line', l: '#eaecf0', d: '#1f242f' }, { name: 'line-strong', role: 'line', l: '#d0d5dd', d: '#333741' },
  { name: 'accent', role: 'accent', l: '#2563eb', d: '#5b8def' }, { name: 'accent-hover', role: 'accent', l: '#1d4ed8', d: '#7aa5f5' }, { name: 'accent-soft', role: 'accent', l: '#dbeafe', d: '#172554' }, { name: 'on-accent', role: 'accent', l: '#ffffff', d: '#ffffff' },
  { name: 'success', role: 'status', l: '#12b76a', d: '#47cd89' }, { name: 'warning', role: 'status', l: '#f79009', d: '#fdb022' }, { name: 'danger', role: 'status', l: '#d92d20', d: '#f97066' },
];

// the options in order of size; the hard-coded value sits among them where it falls, so you can drag back to it
const RADIUS = [{ name: 'none', v: 0 }, { name: '5px', v: 5, hard: true }, { name: 'tag', v: 6 }, { name: 'control', v: 8 }, { name: 'card', v: 12 }, { name: 'full', v: 999 }];
const PADDING = [{ name: 'xs', v: 4 }, { name: 'sm', v: 8 }, { name: 'md', v: 12 }, { name: '14px', v: 14, hard: true }, { name: 'lg', v: 16 }, { name: 'xl', v: 24 }];
const FONT = [{ name: 'sm', v: 14 }, { name: 'base', v: 16 }, { name: 'lg', v: 18 }, { name: '19px', v: 19, hard: true }, { name: 'xl', v: 20 }, { name: '2xl', v: 24 }, { name: '3xl', v: 30 }];
// the text card's four values for a hero heading: two hard-coded, two already on tokens
const HERO_SIZE = [{ name: 'base', v: 16 }, { name: 'lg', v: 18 }, { name: 'xl', v: 20 }, { name: '2xl', v: 24 }, { name: '3xl', v: 30 }, { name: '34px', v: 34, hard: true }, { name: '4xl', v: 36 }, { name: '5xl', v: 48 }];
const LEADING = [{ name: 'none', v: 1 }, { name: '1.2', v: 1.2, hard: true }, { name: 'tight', v: 1.25 }, { name: 'snug', v: 1.375 }, { name: 'normal', v: 1.5 }];
const TRACKING = [{ name: 'tighter', v: -0.05 }, { name: 'tight', v: -0.025 }, { name: 'normal', v: 0 }, { name: 'wide', v: 0.025 }];
// the project's text styles: each one a size, a line height, a weight and a letter spacing together. The heading is on
// none of them (it is hard-coded), so 'No style' sits among them where its size falls
const STYLES = [
  { name: 'body', v: 16, lh: 1.5, fw: 400, ls: 0 },
  { name: 'title', v: 24, lh: 1.375, fw: 600, ls: 0 },
  { name: 'heading', v: 30, lh: 1.25, fw: 600, ls: -0.025 },
  { name: 'No style', v: 34, hard: true },
  { name: 'heading-lg', v: 36, lh: 1.25, fw: 700, ls: -0.025 },
  { name: 'display', v: 48, lh: 1, fw: 700, ls: -0.05 },
];
// font families: the project's three, and the heading's own hard-coded face
const FAMILY = [{ name: 'sans', v: 'system-ui, -apple-system, sans-serif' }, { name: 'Helvetica Neue', v: '"Helvetica Neue", Arial, sans-serif', hard: true }, { name: 'display', v: 'var(--font-round), system-ui, sans-serif' }, { name: 'serif', v: 'Georgia, "Times New Roman", serif' }, { name: 'mono', v: 'ui-monospace, Menlo, monospace' }];
const SCREENS = [['phone', 'Phone', 300], ['tablet', 'Tablet', 340], ['desktop', 'Desktop', 380]];
const LINE = (d) => `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const ALIGN = [['left', LINE('M3 4h10M3 8h6M3 12h8'), 'Left'], ['center', LINE('M3 4h10M5 8h6M4 12h8'), 'Centre'], ['right', LINE('M3 4h10M7 8h6M5 12h8'), 'Right']];
const WRAP = [['wrap', 'Wrap', 'Lines wrap as they fall'], ['balance', 'Balance', 'Lines kept even in length'], ['clamp', '1 line', 'Cut to one line, with an ellipsis']];
const CASES = [['none', '—', 'As written'], ['uppercase', 'AG', 'Uppercase'], ['lowercase', 'ag', 'Lowercase'], ['capitalize', 'Ag', 'Capitalised']];
const WEIGHT = [{ name: 'normal', v: 400 }, { name: 'medium', v: 500 }, { name: 'semibold', v: 600 }, { name: 'bold', v: 700 }];
const MARGIN = [{ name: 'none', v: 0 }, { name: 'sm', v: 8 }, { name: 'md', v: 12 }, { name: 'lg', v: 16 }, { name: '18px', v: 18, hard: true }, { name: 'xl', v: 24 }, { name: '2xl', v: 32 }];
const GAP = [{ name: 'xs', v: 4 }, { name: 'sm', v: 8 }, { name: 'md', v: 12 }, { name: '13px', v: 13, hard: true }, { name: 'lg', v: 16 }, { name: 'xl', v: 24 }];

export function mount(host, root, css) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const px = (v) => `${v}px`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${PICKER_CSS}${GLYPH_CSS}${BUTTON_CSS}${COLOUR_PICK_CSS}
    /* ── the real UI for colour: an invite card, as someone's app draws it, light or dark ── */
    .inv { --bg: #fff; --fg: #101828; --muted: #475467; --line: #eaecf0; --sunken: #f2f4f7; position: relative; width: 320px; padding: 20px; border-radius: 14px; background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); font: 14px/20px system-ui, -apple-system, sans-serif; transition: background-color 240ms, color 240ms; }
    .inv[data-scheme="dark"] { --bg: #0c111d; --fg: #f5f5f6; --muted: #94969c; --line: #1f242f; --sunken: #161b26; box-shadow: 0 12px 32px -14px rgb(0 0 0 / .6), 0 0 0 1px #1f242f; }
    .inv .ah { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .inv .ah b { font: 600 16px/22px system-ui, sans-serif; }
    .inv p { margin: 6px 0 14px; color: var(--muted); }
    .inv .field { padding: 9px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--sunken); color: var(--muted); }
    .inv .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .inv .acts button { padding: 8px 14px; border-radius: 8px; font: 600 14px/20px system-ui, sans-serif; border: 1px solid var(--line); background: var(--bg); color: var(--fg); }
    .inv .acts .go { border-color: transparent; background: var(--btn, #2f6fed); color: #fff; transition: background-color 200ms; }
    .inv .sch { display: inline-grid; grid-auto-flow: column; padding: 2px; border-radius: 8px; background: var(--sunken); }
    .inv .sch button { all: unset; padding: 3px 8px; border-radius: 6px; font: 600 11px/1.2 system-ui, sans-serif; color: var(--muted); cursor: pointer; }
    .inv .sch button[aria-pressed="true"] { background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
    .inv .ring { display: inline-block; border-radius: 10px; outline: 1.5px dashed var(--pl-coral); outline-offset: 3px; transition: outline-color 160ms; }
    .inv .ring.on-token { outline: 1.5px solid var(--pl-sky); }
    .inv .ring.written { outline: 1.5px solid var(--pl-mint); }
    #colour .stage { min-height: 540px; place-items: start start; padding-top: 48px; }
    @media (prefers-reduced-motion: reduce) { .inv, .inv .acts .go, .inv .ring { transition: none; } }
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    .scene { margin: 0 0 40px; }
    .scene h2 { margin: 0 0 4px; }
    .scene > p { margin: 0 0 16px; }
    .stage { position: relative; display: grid; place-items: center start; padding-left: max(24px, calc(50% - 300px)); min-height: 360px; border-radius: 22px; background: var(--pl-paper-2); overflow: hidden; }

    /* ── the real UI: a plan card, as someone's app draws it (its own look, not ours) ── */
    .app { position: relative; width: 300px; padding: 22px; border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 8px 24px -12px rgb(16 24 40 / .18); font: 14px/20px system-ui, -apple-system, sans-serif; color: #101828; }
    .app .top { display: flex; align-items: center; justify-content: space-between; }
    .app h3 { margin: 0; font: 600 18px/24px system-ui, -apple-system, sans-serif; }
    .app .price { margin: 14px 0 4px; font: 700 34px/1 system-ui, -apple-system, sans-serif; letter-spacing: -0.02em; }
    .app .price small { font-size: 14px; font-weight: 500; color: #667085; letter-spacing: 0; }
    .app ul { margin: 14px 0 18px; padding: 0; list-style: none; color: #475467; display: grid; gap: 6px; }
    .app li::before { content: '✓  '; color: #12b76a; font-weight: 700; }
    .app .cta { display: block; width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #101828; color: #fff; font: 600 14px/20px system-ui, sans-serif; }
    /* the element in hand */
    .badge { position: relative; padding: 3px 10px; background: #f4ebff; color: #6941c6; font: 500 12px/18px system-ui, sans-serif; border-radius: var(--r); }
    .badge.held { outline: 1.5px solid var(--pl-coral); outline-offset: 3px; }
    .badge.held.on-token { outline-color: var(--pl-sky); }
    .badge.held.written { outline-color: var(--pl-mint); }

    /* ── the handle: on the element's corner, where a visual editor puts it. Drag it in or out ── */
    .handle { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1.5px var(--pl-coral), 0 1px 3px rgb(0 0 0 / .25); cursor: nwse-resize; touch-action: none; z-index: 3;
      transition: left 220ms var(--pl-spring-pop), top 220ms var(--pl-spring-pop), box-shadow 160ms var(--pl-ease-out), scale 160ms var(--pl-ease-out); }
    .handle:hover, .handle.dragging { scale: 1.25; }
    .handle.on-token { box-shadow: 0 0 0 1.5px var(--pl-sky), 0 1px 3px rgb(0 0 0 / .25); }
    .handle.dragging { transition: none; }

    .list .c { width: 16px; height: 16px; border-top: 2px solid var(--pl-ink-2); border-left: 2px solid var(--pl-ink-2); }
    .list .hard .c { border-color: var(--pl-coral); border-style: dashed; }
    /* ── the real UI for gap: a dialog's footer, as someone's app draws it ── */
    .dlg { position: relative; width: 340px; padding: 20px 20px 18px; border-radius: 14px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); font: 14px/20px system-ui, -apple-system, sans-serif; color: #101828; }
    .dlg h3 { margin: 0 0 6px; font: 600 16px/22px system-ui, -apple-system, sans-serif; }
    .dlg p { margin: 0 0 20px; color: #475467; }
    .dlg .foot { display: flex; justify-content: flex-end; gap: var(--g); }
    .dlg .foot button { padding: 8px 14px; border-radius: 8px; font: 600 14px/20px system-ui, sans-serif; border: 1px solid #d0d5dd; background: #fff; color: #344054; }
    .dlg .foot button.go { border-color: #7f56d9; background: #7f56d9; color: #fff; }
    /* the gap itself is the handle: drawn in the gap's own pattern (lilac stripes), you drag it wider or narrower */
    .gapband { position: absolute; z-index: 3; border-radius: 3px; cursor: ew-resize; touch-action: none;
      background: repeating-linear-gradient(90deg, color-mix(in oklab, var(--pl-lilac) 70%, transparent) 0 2px, transparent 2px 4px);
      outline: 1.5px dashed var(--pl-coral); outline-offset: 3px;
      transition: left 220ms var(--pl-spring-pop), width 220ms var(--pl-spring-pop), scale 160ms var(--pl-ease-out); }
    .gapband.on-token { outline: 1.5px solid var(--pl-sky); }
    .gapband.written { outline: 1.5px solid var(--pl-mint); }
    .gapband:hover, .gapband.dragging { scale: 1 1.08; }
    .gapband.dragging { transition: none; }
    .list .g { display: flex; gap: var(--lg); align-items: center; justify-content: center; width: 20px; }
    .list .g::before, .list .g::after { content: ''; width: 4px; height: 12px; border-radius: 1.5px; background: var(--pl-ink-2); }
    .list .hard .g::before, .list .hard .g::after { background: var(--pl-coral); }

    /* ── the real UI for padding: an alert, as someone's app draws it ── */
    .alert { position: relative; display: flex; gap: 12px; width: 340px; box-sizing: border-box; padding: var(--pt, 14px) var(--pr, 14px) var(--pb, 14px) var(--pl, 14px); border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); border: 1px solid #fecdca; font: 14px/20px system-ui, -apple-system, sans-serif; color: #101828; }
    .alert .ico { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #fee4e2; color: #d92d20; font: 700 16px/1 system-ui, sans-serif; }
    .alert b { display: block; font: 600 14px/20px system-ui, sans-serif; }
    .alert span { color: #475467; }
    .alert a { display: inline-block; margin-top: 8px; color: #b42318; font-weight: 600; text-decoration: none; }
    /* the padding itself is the handle: each side drawn in padding's pattern (mint hatch), each one dragged inward makes
       all four sides bigger */
    .padband { position: absolute; z-index: 3; touch-action: none; pointer-events: auto;
      background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mint) 55%, transparent) 0 2px, transparent 2px 5px);
      transition: left 220ms var(--pl-spring-pop), top 220ms var(--pl-spring-pop), width 220ms var(--pl-spring-pop), height 220ms var(--pl-spring-pop), opacity 160ms; }
    .padband[data-side="top"], .padband[data-side="bottom"] { cursor: ns-resize; }
    .padband[data-side="left"], .padband[data-side="right"] { cursor: ew-resize; }
    .padband:hover, .padband.dragging { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mint) 85%, transparent) 0 2px, transparent 2px 5px); }
    .padband.dragging, .pads.dragging .padband { transition: none; }
    /* one side in hand: its band darker; the row names the sides it moves */
    .padband.here { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mint) 95%, transparent) 0 2px, transparent 2px 5px); }
    .row[hidden], .list[hidden] { display: none; }
    .row .side { padding: 0 2px 0 0; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; }
    /* ── the real UI for margin: a notification feed, as someone's app draws it ── */
    .feed { width: 320px; }
    .notif { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 8px 20px -12px rgb(16 24 40 / .2); font: 13px/18px system-ui, -apple-system, sans-serif; color: #475467; }
    .notif + .notif { margin-top: 12px; }
    .notif.held { margin-top: var(--m, 18px); transition: margin-top 220ms var(--pl-spring-pop); }
    .notif i { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #e9d7fe; }
    .notif b { display: block; color: #101828; font: 600 13px/18px system-ui, sans-serif; }
    /* the margin is the handle: the space it makes, drawn in margin's pattern (butter dots) */
    .mband { position: absolute; z-index: 3; cursor: ns-resize; touch-action: none; border-radius: 3px;
      background: radial-gradient(circle, color-mix(in oklab, var(--pl-butter) 85%, transparent) 1.25px, transparent 1.7px) 0 0 / 6px 6px;
      outline: 1.5px dashed var(--pl-coral); outline-offset: 2px;
      transition: top 220ms var(--pl-spring-pop), height 220ms var(--pl-spring-pop), scale 160ms var(--pl-ease-out); }
    .mband.on-token { outline: 1.5px solid var(--pl-sky); }
    .mband.written { outline: 1.5px solid var(--pl-mint); }
    .mband:hover, .mband.dragging { scale: 1.02 1; }
    .mband.dragging, .feed.dragging .notif.held { transition: none; }
    .list .mg { width: 16px; height: 16px; background: radial-gradient(circle, var(--pl-ink-2) 1px, transparent 1.4px) 0 0 / 4px 4px; border-radius: 3px; }
    .list .hard .mg { background-image: radial-gradient(circle, var(--pl-coral) 1px, transparent 1.4px); }
    .padframe { position: absolute; z-index: 2; pointer-events: none; border-radius: 13px; outline: 1.5px dashed var(--pl-coral); outline-offset: 3px; transition: outline-color 160ms; }
    .padframe.on-token { outline: 1.5px solid var(--pl-sky); outline-offset: 3px; }
    .padframe.written { outline: 1.5px solid var(--pl-mint); outline-offset: 3px; }
    .list .pd { width: 16px; height: 16px; box-sizing: border-box; border-radius: 3px; background: repeating-linear-gradient(45deg, var(--pl-ink-3) 0 1px, transparent 1px 3px); position: relative; }
    .list .pd::after { content: ''; position: absolute; inset: var(--ip); border-radius: 2px; background: var(--pl-paper); box-shadow: inset 0 0 0 1.5px var(--pl-ink-2); }
    .list .hard .pd { background: repeating-linear-gradient(45deg, var(--pl-coral) 0 1px, transparent 1px 3px); }

    /* ── the real UI for font size: an article card, as someone's blog draws it ── */
    .post { position: relative; width: 360px; padding: 20px; border-radius: 14px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); font: 14px/20px system-ui, -apple-system, sans-serif; color: #475467; }
    .post small { display: block; margin-bottom: 8px; color: #6941c6; font: 600 13px/18px system-ui, sans-serif; }
    .post h3 { display: inline-block; margin: 0 0 8px; font: 600 var(--fs)/1.3 system-ui, -apple-system, sans-serif; color: #101828; letter-spacing: -0.01em; cursor: ns-resize; touch-action: none; transition: font-size 220ms var(--pl-spring-pop); }
    .post h3.dragging { transition: font-size 90ms linear; }
    .post p { margin: 0; }
    /* the text itself is the handle: drag it up to make it bigger, down to make it smaller. Two type lines (the top of
       its capitals and its baseline) say it is type and hold the state colour */
    .typelines { position: absolute; z-index: 2; pointer-events: none; transition: left 220ms var(--pl-spring-pop), top 220ms var(--pl-spring-pop), width 220ms var(--pl-spring-pop), height 220ms var(--pl-spring-pop); }
    .typelines::before, .typelines::after { content: ''; position: absolute; left: -10px; right: -10px; height: 0; border-top: 1.5px dashed var(--pl-coral); }
    .typelines::before { top: 0; } .typelines::after { bottom: 0; }
    .typelines.on-token::before, .typelines.on-token::after { border-top: 1.5px solid var(--pl-sky); }
    .typelines.written::before, .typelines.written::after { border-top: 1.5px solid var(--pl-mint); }
    .typelines.dragging { transition: none; }
    .post h3[contenteditable] { cursor: text; outline: 1.5px solid var(--pl-sky); outline-offset: 3px; border-radius: 3px; caret-color: var(--pl-sky); }
    .typelines.editing { opacity: 0; }
    .edittag { position: absolute; z-index: 4; padding: 4px 8px; border-radius: 8px; background: var(--pl-ink); color: var(--pl-paper); font: 600 11px/1.2 var(--pl-sans); white-space: nowrap; pointer-events: none; }
    .edittag[hidden] { display: none; }
    .edittag kbd { font: 600 10.5px/1 var(--pl-mono); opacity: .8; }
    .list .aa { width: 22px; text-align: center; font-family: system-ui, sans-serif; font-weight: 600; line-height: 1; color: var(--pl-ink-2); }
    .list .hard .aa { color: var(--pl-coral); }

    /* ── the text card: laid out like a visual editor's panel, not a list. The text style at the top, as a sample of
       itself; the type values in a two-column grid; case as four buttons; colour as a swatch; one button that writes
       every change. Each field is the same picker as above, made compact ── */
    .hero { width: 380px; padding: 28px 24px; border-radius: 16px; background: #0c111d; color: #f5f5f6; box-shadow: 0 12px 32px -14px rgb(16 24 40 / .45); font: 15px/22px system-ui, -apple-system, sans-serif; }
    .hero h1 { display: inline; margin: 0; font-family: system-ui, -apple-system, sans-serif; font-size: var(--fs); line-height: var(--lh); letter-spacing: var(--ls); font-weight: var(--fw); color: var(--ink, #f0f0f1); text-transform: var(--tt, none); cursor: ns-resize; touch-action: none;
      transition: font-size 220ms var(--pl-spring-pop), letter-spacing 220ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
    .hero h1.dragging { transition: none; }
    .hero h1[contenteditable] { cursor: text; outline: 1.5px solid var(--pl-sky); outline-offset: 3px; border-radius: 3px; caret-color: var(--pl-sky); }
    .hero .h { display: block; }
    .hero p { margin: 14px 0 0; color: #94969c; }
    .hero.held .h { outline: 1.5px dashed var(--pl-coral); outline-offset: 6px; border-radius: 4px; }
    .hero.clean .h { outline: 1.5px solid var(--pl-sky); outline-offset: 6px; border-radius: 4px; }
    .hero.done .h { outline: 1.5px solid var(--pl-mint); outline-offset: 6px; border-radius: 4px; }
    .tcard { position: absolute; z-index: 4; width: 272px; padding: 12px 12px 12px; border-radius: 16px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); display: grid; gap: 12px; }
    .tcard header { display: flex; align-items: baseline; gap: 8px; padding: 0 2px; font: var(--pl-round-w, 600) 15px/1 var(--pl-round); color: var(--pl-ink); }
    .tcard header small { margin-left: auto; font: 500 11.5px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .tcard section { position: relative; display: grid; gap: 6px; }
    .tcard section > b { padding: 0 2px; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .tcard .grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .tcard .one { position: relative; display: grid; }
    .tcard .row.compact .slot.hard span { display: none; }
    /* the style: one tall field that shows the style as a sample of itself */
    .tcard .style .row.compact { height: 44px; }
    .tcard .style .scrub { display: none; }
    .tcard .style .row.compact .val { padding-left: 4px; }
    #textcard .stage { min-height: 520px; }
    .tcard .style .row.compact .val, .tcard .style .row.compact .drum { height: 40px; }
    .tcard .style .slot b { font: var(--pl-round-w, 600) 15px/1 var(--pl-round); }
    .tcard .style .slot.hard b { font-family: var(--pl-sans); font-size: 13px; }
    /* the style's sample belongs to each option, so the one leaving keeps its own size as the next rolls in */
    .tcard .style .slot .smp { display: grid; place-items: center; flex: none; width: 34px; height: 30px; border-radius: 7px; background: var(--pl-paper); color: var(--pl-ink); font-family: system-ui, sans-serif; line-height: 1; font-style: normal; }
    .tcard .style .slot.hard .smp { color: var(--pl-coral); }
    /* case: four buttons, each drawn as what it does */
    .seg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px; border-radius: 9px; background: var(--pl-paper-2); }
    .seg button { all: unset; display: grid; place-items: center; height: 26px; border-radius: 7px; cursor: pointer; font: 600 12.5px/1 system-ui, sans-serif; color: var(--pl-ink-2); transition: background-color 140ms var(--pl-ease-out), color 140ms; }
    .seg button:hover { color: var(--pl-ink); }
    .seg button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .1); }
    .seg button:focus-visible { outline: 2px solid var(--pl-sky); }
    /* colour: the swatch is the field's own icon */
    .sw { display: block; width: 16px; height: 16px; border-radius: 5px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); }
    .tcard .foot { display: flex; justify-content: flex-end; gap: 6px; padding-top: 2px; }
    .tcard .list { z-index: 6; }

    /* more of the card: a full-width font field, toggles, the screen switch, a locked value, a note */
    .tcard .pair { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
    .tg { display: inline-grid; grid-auto-flow: column; gap: 2px; padding: 2px; border-radius: 9px; background: var(--pl-paper-2); }
    .tg button { all: unset; display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 4px; border-radius: 7px; cursor: pointer; font: 600 12.5px/1 system-ui, sans-serif; color: var(--pl-ink-2); }
    .tg button:hover { color: var(--pl-ink); }
    .tg button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .1); }
    .tg button:focus-visible { outline: 2px solid var(--pl-sky); }
    .seg.wrap3 { grid-template-columns: repeat(3, 1fr); }
    .seg.wrap3 button { font: 600 11.5px/1 var(--pl-sans); }
    .tcard section > .lbl { display: flex; align-items: center; gap: 8px; padding: 0 2px; }
    .tcard section > .lbl b { font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .screens { margin-left: auto; display: inline-grid; grid-auto-flow: column; gap: 1px; padding: 2px; border-radius: 8px; background: var(--pl-paper-2); }
    .screens button { all: unset; padding: 4px 7px; border-radius: 6px; cursor: pointer; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .screens button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .1); }
    .tcard .grid .row[hidden] { display: none; }
    .row.inherited .slot b, .row.inherited .slot span { color: var(--pl-ink-2); font-style: italic; }
    .row.locked { opacity: .62; }
    .row.locked .val, .row.locked .scrub { pointer-events: none; }
    .row.locked::after { content: ''; position: absolute; right: 8px; top: 50%; width: 9px; height: 11px; translate: 0 -50%; background: currentColor; color: var(--pl-ink-3);
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 11'%3E%3Cpath d='M2 5V3.5a2.5 2.5 0 0 1 5 0V5' fill='none' stroke='black' stroke-width='1.3'/%3E%3Crect x='.5' y='5' width='8' height='5.5' rx='1.2'/%3E%3C/svg%3E") center / contain no-repeat; }
    .tcard .note { margin: 0; padding: 0 2px; font: 500 11.5px/1.4 var(--pl-sans); color: var(--pl-ink-2); }
    .tcard .note:empty { display: none; }
    .tcard .fam .slot b { font-family: var(--ff); }
    #textcard .stage { min-height: 1000px; }
    .hero { width: var(--hw, 380px); transition: width 320ms var(--pl-spring-pop); }
    .hero h1 { font-family: var(--ff, "Helvetica Neue", Arial, sans-serif) !important; text-align: var(--ta, left); font-style: var(--fst, normal); text-decoration: var(--td, none); text-decoration-thickness: 2px; }
    .hero .h { text-align: var(--ta, left); }
    .hero.balance h1 { text-wrap: balance; }
    .hero.clamp .h { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .hero.clamp h1 { display: inline; }
    .list .sty { width: 30px; text-align: center; font-family: system-ui, sans-serif; line-height: 1; color: var(--pl-ink); }
    .list .hard .sty { color: var(--pl-coral); }
    .list .chip { width: 14px; height: 14px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); }
    .list .lh { width: 16px; height: 14px; display: grid; align-content: center; gap: var(--g); }
    .list .lh::before, .list .lh::after { content: ''; height: 2px; border-radius: 1px; background: var(--pl-ink-2); }
    .list .hard .lh::before, .list .hard .lh::after { background: var(--pl-coral); }
    .list .ls { width: 22px; text-align: center; font: 600 11px/1 system-ui, sans-serif; color: var(--pl-ink-2); }
    .list .wt { width: 22px; text-align: center; font: 13px/1 system-ui, sans-serif; color: var(--pl-ink-2); }
    .hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .hint kbd { font: 600 11px/1 var(--pl-mono); padding: 2px 5px; border-radius: 5px; background: var(--pl-paper); box-shadow: 0 1px 0 var(--pl-rule); }
    @media (prefers-reduced-motion: reduce) { .handle { transition: none; } }
  </style>${TOY_DEFS}
  <section class="scene" id="radius">
    <h2>Border radius</h2>
    <p>The “Popular” badge has a hard-coded 5px. Press on the value and drag up or down, anywhere on the screen: each option rolls into the field and the badge follows. The dot on the badge’s corner and the icon drag the same way. A click on the value opens the list instead. Enter writes it; Esc puts it back.</p>
    <div class="stage" tabindex="0">
      <div class="app">
        <div class="top"><h3>Pro</h3><span class="badge held">Popular</span></div>
        <div class="price">$24<small> / month</small></div>
        <ul><li>Unlimited projects</li><li>Shared themes</li><li>Priority support</li></ul>
        <button type="button" class="cta" tabindex="-1">Upgrade</button>
      </div>
      <i class="handle" role="presentation"></i>
      <p class="hint">drag the value up or down · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="gap">
    <h2>Gap</h2>
    <p>The dialog’s buttons sit 13px apart, hard-coded. The gap itself is drawn in its pattern: drag it wider or narrower, drag the value up or down, or click the value for the list. The buttons move as you go.</p>
    <div class="stage" tabindex="0">
      <div class="dlg">
        <h3>Publish changes?</h3>
        <p>Your edits to the pricing page will be live for everyone.</p>
        <div class="foot"><button type="button" tabindex="-1">Cancel</button><button type="button" class="go" tabindex="-1">Publish</button></div>
      </div>
      <i class="gapband" role="presentation"></i>
      <p class="hint">drag the gap or the value · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="padding">
    <h2>Padding</h2>
    <p>The alert has a hard-coded 14px of padding on every side. Each side is drawn in padding’s pattern and is its own handle: drag a side inward to make it bigger, outward to make it smaller. That side alone changes; hold <kbd>⇧</kbd> as you start to move its pair (top and bottom, or left and right) with it, <kbd>⌘</kbd> to move all four. The row beside the alert says which side is in hand.</p>
    <div class="stage" tabindex="0">
      <div class="alert"><i class="ico">!</i><div><b>Payment failed</b><span>Your card was declined. Update your billing details to keep your plan.</span><br><a href="#" tabindex="-1" onclick="return false">Update billing</a></div></div>
      <i class="padframe" role="presentation"></i>
      ${['top', 'right', 'bottom', 'left'].map((side) => `<i class="padband" data-side="${side}" role="presentation"></i>`).join('')}
      <p class="hint">drag a side · <kbd>⇧</kbd> the pair · <kbd>⌘</kbd> all sides · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="margin">
    <h2>Margin</h2>
    <p>The middle notification has a hard-coded 18px of margin above it; the others sit 12px apart. The margin is drawn in its own pattern, butter dots, in the space it makes outside the card. Drag it down to make it bigger, up to make it smaller.</p>
    <div class="stage" tabindex="0">
      <div class="feed">${[['Maya commented', 'Love the new pricing page.'], ['Deploy finished', 'main · 2 minutes ago'], ['Invoice paid', 'INV-2041 · $480.00']].map(([t, d], i) => `<div class="notif${i === 1 ? ' held' : ''}"><i></i><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
      <i class="mband" role="presentation"></i>
      <p class="hint">drag the margin or the value · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="font">
    <h2>Font size</h2>
    <p>The article’s title is a hard-coded 19px. The text itself is the handle: press on the title and drag up to make it bigger, down to make it smaller. Double-click it to edit the words, as anywhere in React Plumber: Enter or clicking away keeps them, Esc puts them back. Two lines at the top of its capitals and at its baseline say it is type.</p>
    <div class="stage" tabindex="0">
      <div class="post"><small>Design systems</small><h3>Why your spacing drifts</h3><p>Six hard-coded values in one card, and how a theme keeps them in line.</p></div>
      <i class="typelines" role="presentation"></i>
      <span class="edittag" hidden><kbd>↵</kbd> keep · <kbd>Esc</kbd> put back</span>
      <p class="hint">drag the title to resize · double-click to edit the words · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="colour">
    <h2>Colour</h2>
    <p>The button’s fill is a hard-coded #2f6fed. The picker leads with the answer: your colour, then the three of your tokens nearest it, said in words. Point at one to see it on the button; click to pick it; click it again (or Enter) to write it. Every colour is under All colours, by what it is for, opening on Accent because a button’s fill is an accent. Each swatch is its light and its dark value: switch the app to Dark to see a token follow it and a hard-coded colour not.</p>
    <div class="stage" tabindex="0"><div class="inv" data-scheme="light"><div class="ah"><b>Invite your team</b><span class="sch" role="group" aria-label="App scheme"><button type="button" data-s="light" aria-pressed="true">Light</button><button type="button" data-s="dark" aria-pressed="false">Dark</button></span></div><p>Work on the same projects. They get an email with a link.</p><div class="field">name@company.com</div><div class="acts"><button type="button">Copy link</button><span class="ring"><button type="button" class="go">Send invites</button></span></div></div></div>
  </section>
  <section class="scene" id="textcard">
    <h2>Put together: the text card</h2>
    <p>The element’s editor, laid out like a visual editor’s panel. The heading is on no text style: its font, size, line height and colour are hard-coded, in coral. Pick a style and the type values move together. Font size can differ per screen: switch Phone, Tablet, Desktop and the heading resizes to match; Tablet uses the phone size until you change it. Letter spacing is locked: it is set by the Heading component’s props, not here. Case, alignment, decoration and wrap are buttons; colour a swatch. One button writes every change.</p>
    <div class="stage" tabindex="0">
      <div class="hero held"><span class="h"><h1>Keep your app on your theme.</h1></span><p>See every hard-coded value, and move it onto your tokens in one place.</p></div>
      <div class="tcard" role="group" aria-label="Text">
        <header>Text<small>h1</small></header>
        <section class="style"><b>Style</b><div class="one"></div></section>
        <section class="fam"><b>Font</b><div class="one"></div></section>
        <section><div class="lbl"><b>Type</b><span class="screens" role="group" aria-label="Screen size">${SCREENS.map(([k, t], i) => `<button type="button" data-screen="${k}" aria-pressed="${i === 2}">${t}</button>`).join('')}</span></div><div class="grid"></div><p class="note"></p></section>
        <section><b>Case</b><div class="seg" role="group" aria-label="Case">${CASES.map(([v, l, t]) => `<button type="button" data-case="${v}" aria-label="${t}" aria-pressed="${v === 'none'}">${l}</button>`).join('')}</div></section>
        <section><b>Align and decoration</b><div class="pair"><span class="tg" data-set="align" role="group" aria-label="Alignment">${ALIGN.map(([v, svg, t], i) => `<button type="button" data-v="${v}" aria-label="${t}" aria-pressed="${i === 0}">${svg}</button>`).join('')}</span><span class="tg" data-set="deco" role="group" aria-label="Decoration"><button type="button" data-v="italic" aria-label="Italic" aria-pressed="false" style="font-style:italic;font-family:Georgia,serif">I</button><button type="button" data-v="underline" aria-label="Underline" aria-pressed="false" style="text-decoration:underline">U</button><button type="button" data-v="line-through" aria-label="Strikethrough" aria-pressed="false" style="text-decoration:line-through">S</button></span></div></section>
        <section><b>Wrap</b><div class="seg wrap3" data-set="wrap" role="group" aria-label="Wrap">${WRAP.map(([v, l, t], i) => `<button type="button" data-v="${v}" title="${t}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div></section>
        <section class="colour"><b>Colour</b><div class="one"></div></section>
        <div class="foot">${button('Write', { cls: 'sm', key: '↵', attrs: 'data-do="write" disabled' })}</div>
      </div>
      <span class="edittag" hidden><kbd>↵</kbd> keep · <kbd>Esc</kbd> put back</span>
    </div>
  </section>`;

  // the product's picker, with this page's host for the grabbing cursor
  const picker = (stage, spec) => pick(stage, { grab: host, ...spec });
  const rel = (stage, el) => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect(); return { left: b.left - s.left, top: b.top - s.top, right: b.right - s.left, bottom: b.bottom - s.top, width: b.width, height: b.height }; };

  // ── the words: a double-click edits them in place, as the product's text editing does (overlay/src/text-edit.js):
  // the browser's own caret, a ring around the words and a tag under them; Enter or clicking away keeps them, Esc
  // puts them back. While editing, dragging selects text instead of resizing ──
  const words = (stage, el, tag, editing) => {
    let before = null;
    const caretAt = (x, y) => {
      const pos = document.caretPositionFromPoint?.(x, y, { shadowRoots: [root] });
      const sel = root.getSelection ? root.getSelection() : getSelection();
      if (pos && el.contains(pos.offsetNode)) { sel.collapse(pos.offsetNode, pos.offset); return; }
      sel.selectAllChildren(el); sel.collapseToEnd();
    };
    const stop = (keep) => {
      if (before === null) return;
      if (!keep) el.textContent = before;
      before = null; el.removeAttribute('contenteditable'); tag.hidden = true; editing(false);
    };
    el.addEventListener('dblclick', (e) => {
      if (el.isContentEditable) return;
      before = el.textContent;
      el.setAttribute('contenteditable', 'plaintext-only'); el.focus(); caretAt(e.clientX, e.clientY);
      editing(true);
      const r = rel(stage, el); tag.hidden = false; tag.style.left = `${r.left}px`; tag.style.top = `${r.bottom + 10}px`;
    });
    el.addEventListener('keydown', (e) => {
      if (!el.isContentEditable) return;
      if (e.key === 'Enter') { e.preventDefault(); stop(true); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); stop(false); el.blur(); }
    });
    el.addEventListener('blur', () => stop(true));
  };

  // ── border radius: the badge, with a dot on its corner ──
  {
    const stage = root.querySelector('#radius .stage'), badge = stage.querySelector('.badge'), handle = stage.querySelector('.handle'), card = stage.querySelector('.app');
    picker(stage, {
      name: 'Border radius', toy: 'corner', options: RADIUS,
      mark: (t) => `<i class="c" style="border-top-left-radius:${Math.min(t.v, 16)}px"></i>`,
      apply: (o, { token, written }) => { badge.style.setProperty('--r', `${o.v}px`); badge.classList.toggle('on-token', token); badge.classList.toggle('written', written); handle.classList.toggle('on-token', token); },
      place: (row, list, o) => {
        const b = rel(stage, badge), c = rel(stage, card), inset = Math.min(o.v, badge.offsetHeight / 2) * (1 - Math.SQRT1_2);
        handle.style.left = `${b.left + inset}px`; handle.style.top = `${b.top + inset}px`;
        row.style.left = `${c.right + 14}px`; row.style.top = `${b.top + b.height / 2 - 17}px`;
        list.style.left = row.style.left; list.style.top = `${b.top + b.height / 2 + 22}px`;
      },
      // the dot on the corner: pulling it in along the diagonal rounds the corner more
      handles: [{ el: handle, perPx: (dx, dy) => (dx + dy) / 2 / 14 }],
    });
    if (still) handle.style.transition = 'none';
  }

  // ── gap: the dialog's footer, with the gap itself as the handle ──
  {
    const stage = root.querySelector('#gap .stage'), foot = stage.querySelector('.foot'), band = stage.querySelector('.gapband'), dlg = stage.querySelector('.dlg');
    const [a, b] = foot.querySelectorAll('button');
    picker(stage, {
      name: 'Gap', toy: 'gap', options: GAP,
      mark: (t) => `<i class="g" style="--lg:${Math.min(t.v, 12)}px"></i>`,
      apply: (o, { token, written }) => { foot.style.setProperty('--g', `${o.v}px`); band.classList.toggle('on-token', token); band.classList.toggle('written', written); },
      place: (row, list) => {
        const ra = rel(stage, a), rb = rel(stage, b), d = rel(stage, dlg);
        band.style.left = `${ra.right}px`; band.style.width = `${Math.max(2, rb.left - ra.right)}px`; band.style.top = `${ra.top}px`; band.style.height = `${ra.height}px`;
        row.style.left = `${d.right + 14}px`; row.style.top = `${ra.top + ra.height / 2 - 17}px`;
        list.style.left = row.style.left; list.style.top = `${ra.top + ra.height / 2 + 22}px`;
      },
      // the gap: dragging right makes it wider
      handles: [{ el: band, perPx: (dx) => dx / 16 }],
    });
    if (still) band.style.transition = 'none';
  }

  // ── padding: the alert, each side of its padding its own handle. A drag moves that side; ⇧ when it starts moves the
  // pair with it, ⌘ all four (the keys the product's spacing uses). One row shows the side in hand ──
  {
    const stage = root.querySelector('#padding .stage'), el = stage.querySelector('.alert'), frame = stage.querySelector('.padframe');
    const bands = [...stage.querySelectorAll('.padband')], SIDES = ['top', 'right', 'bottom', 'left'];
    const PAIR = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    // dragging a side inward makes the padding bigger
    const inward = { top: (dx, dy) => dy, bottom: (dx, dy) => -dy, left: (dx) => dx, right: (dx) => -dx };
    const sides = {};
    let hand = 'top', link = ['top'];
    const said = () => (link.length === 4 ? 'all sides' : link.length === 2 ? `${link[0]} + ${link[1]}` : hand);
    // the frame: coral while any side is hard-coded, blue when every side is on a token, green once all are written
    const state = () => {
      const all = SIDES.map((k) => sides[k]).filter(Boolean); if (all.length < 4) return;
      const hard = all.some((p) => PADDING[p.at()].hard), written = all.every((p) => p.row.classList.contains('written'));
      frame.classList.toggle('on-token', !hard); frame.classList.toggle('written', written);
    };
    const place = (row, list) => {
      const r = rel(stage, el), cs = getComputedStyle(el), b = 1, p = Object.fromEntries(SIDES.map((k) => [k, parseFloat(cs[`padding${k[0].toUpperCase()}${k.slice(1)}`]) || 0]));
      frame.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      const box = { top: [r.left + b, r.top + b, r.width - 2 * b, p.top], bottom: [r.left + b, r.bottom - b - p.bottom, r.width - 2 * b, p.bottom], left: [r.left + b, r.top + b + p.top, p.left, r.height - 2 * b - p.top - p.bottom], right: [r.right - b - p.right, r.top + b + p.top, p.right, r.height - 2 * b - p.top - p.bottom] };
      for (const band of bands) { const [x, y, w, h] = box[band.dataset.side]; band.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`; }
      row.style.left = `${r.right + 14}px`; row.style.top = `${r.top + 12}px`;
      list.style.left = row.style.left; list.style.top = `${r.top + 51}px`;
    };
    // the side in hand: its row shows (naming the sides it moves), its band darker
    const take = (side, keys = {}) => {
      hand = side; link = keys.metaKey || keys.ctrlKey ? [...SIDES] : keys.shiftKey ? [side, PAIR[side]] : [side];
      for (const k of SIDES) { sides[k].row.hidden = k !== side; if (k !== side) sides[k].row.nextElementSibling.hidden = true; }
      for (const band of bands) band.classList.toggle('here', link.includes(band.dataset.side));
      sides[side].row.querySelector('.side').textContent = said();
      sides[side].layout();
    };
    for (const side of SIDES) {
      const band = bands.find((x) => x.dataset.side === side);
      // the keys are read as the press starts (before the picker's own drag begins)
      band.addEventListener('pointerdown', (e) => take(side, e), { capture: true });
      sides[side] = picker(stage, {
        name: `Padding ${side}`, toy: 'padding', options: PADDING, keys: 'row',
        mark: (t) => `<i class="pd" style="--ip:${Math.min(5, Math.round(t.v / 4))}px"></i>`,
        apply: (o) => { el.style.setProperty(`--p${side[0]}`, `${o.v}px`); state(); },
        // the side in hand moves the sides linked to it
        changed: () => { if (side !== hand) return; for (const k of link) if (k !== side && sides[k].at() !== sides[side].at()) sides[k].set(sides[side].at()); state(); },
        place, handles: [{ el: band, perPx: (dx, dy) => inward[side](dx, dy) / 12 }],
      });
      sides[side].row.querySelector('.scrub').insertAdjacentHTML('afterend', '<span class="side"></span>');
      // the tick (or Enter) writes every side that has a token to write, not just the one shown
      const writeAll = () => { for (const k of SIDES) if (k !== side && sides[k].ready()) sides[k].write(); state(); };
      sides[side].row.querySelector('.ok').addEventListener('click', writeAll);
      sides[side].row.addEventListener('keydown', (e) => { if (e.key === 'Enter') writeAll(); });
    }
    // a drag that ended lets go of the pair or all four: the next change is one side again (the row keeps its name until then)
    addEventListener('pointerup', () => { link = [hand]; });
    take('top');
    new ResizeObserver(() => sides[hand].layout()).observe(el);
  }

  // ── margin: the feed's middle notification, the space above it as the handle ──
  {
    const stage = root.querySelector('#margin .stage'), feed = stage.querySelector('.feed'), note = feed.querySelector('.notif.held'), band = stage.querySelector('.mband');
    picker(stage, {
      name: 'Margin top', toy: 'margin', options: MARGIN,
      mark: (t) => `<i class="mg" style="height:${Math.max(4, Math.min(16, t.v / 2))}px"></i>`,
      apply: (o, { token, written }) => { note.style.setProperty('--m', `${o.v}px`); band.classList.toggle('on-token', token); band.classList.toggle('written', written); },
      place: (row, list) => {
        const n = rel(stage, note), m = parseFloat(getComputedStyle(note).marginTop) || 0;
        band.style.cssText = `left:${n.left}px;top:${n.top - m}px;width:${n.width}px;height:${Math.max(2, m)}px`;
        row.style.left = `${n.right + 14}px`; row.style.top = `${n.top - m / 2 - 17}px`;
        list.style.left = row.style.left; list.style.top = `${n.top - m / 2 + 22}px`;
      },
      // the margin: dragging down makes it bigger
      handles: [{ el: band, perPx: (dx, dy) => dy / 12 }],
    });
    band.addEventListener('pointerdown', () => feed.classList.add('dragging'));
    addEventListener('pointerup', () => feed.classList.remove('dragging'));
    if (still) band.style.transition = 'none';
  }

  // ── font size: the article's title, with the text itself as the handle ──
  {
    const stage = root.querySelector('#font .stage'), title = stage.querySelector('.post h3'), lines = stage.querySelector('.typelines'), post = stage.querySelector('.post');
    const fp = picker(stage, {
      name: 'Font size', toy: 'type', options: FONT,
      mark: (t) => `<i class="aa" style="font-size:${Math.round(10 + (t.v - 14) * 0.45)}px">Aa</i>`,
      apply: (o, { token, written }) => { title.style.setProperty('--fs', `${o.v}px`); lines.classList.toggle('on-token', token); lines.classList.toggle('written', written); },
      place: (row, list, o) => {
        const r = rel(stage, title), c = rel(stage, post), fs = o.v, lh = fs * 1.3;
        // the first line's cap height and baseline, from the font size (system faces: caps about 0.7 of the size)
        const base = r.top + (lh - fs) / 2 + fs * 0.92, cap = base - fs * 0.7;
        lines.style.cssText = `left:${r.left}px;top:${cap}px;width:${r.width}px;height:${base - cap}px`;
        row.style.left = `${c.right + 14}px`; row.style.top = `${r.top + Math.min(r.height, lh) / 2 - 17}px`;
        list.style.left = row.style.left; list.style.top = `${r.top + Math.min(r.height, lh) / 2 + 22}px`;
      },
      // the title: up is bigger
      handles: [{ el: title, perPx: (dx, dy) => -dy / 14, skip: () => title.isContentEditable }],
    });
    // the title changes width as it grows: keep the lines and the row on it
    new ResizeObserver(() => fp.layout()).observe(title);
    title.addEventListener('pointerdown', () => lines.classList.add('dragging'));
    title.addEventListener('pointerup', () => lines.classList.remove('dragging'));
    words(stage, title, stage.querySelector('.edittag'), (on) => { lines.classList.toggle('editing', on); if (!on) fp.layout(); });
  }


  // ── colour: the invite card's button, nearest first, every colour by role ──
  {
    const stage = root.querySelector('#colour .stage'), app = stage.querySelector('.inv'), btn = app.querySelector('.go'), ring = app.querySelector('.ring');
    let now = { l: '#2f6fed', d: '#2f6fed' };
    const paint = () => btn.style.setProperty('--btn', app.dataset.scheme === 'dark' ? now.d : now.l);
    app.querySelector('.sch').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; app.dataset.scheme = b.dataset.s; for (const x of app.querySelectorAll('[data-s]')) x.setAttribute('aria-pressed', String(x === b)); paint(); });
    colourPick(stage, { tokens: COLOURS, hard: { name: '#2f6fed', l: '#2f6fed' }, role: 'accent',
      apply: (t, { token, written }) => { now = t; paint(); ring.classList.toggle('on-token', token); ring.classList.toggle('written', written); },
      place: (box) => { const r = rel(stage, app); box.style.left = `${r.right + 14}px`; box.style.top = `${Math.max(12, r.top + 18)}px`; } });
  }

  // ── the text card: a visual editor's panel for the heading, built from compact pickers. The style moves the four type
  // values together; a change to one of them finds the style it now matches (or "No style"); case and colour; one
  // button writes everything that changed ──
  {
    const stage = root.querySelector('#textcard .stage'), hero = stage.querySelector('.hero'), h1 = hero.querySelector('h1'), card = stage.querySelector('.tcard');
    const styleBox = card.querySelector('.style .one'), grid = card.querySelector('.grid'), colourBox = card.querySelector('.colour .one'), famBox = card.querySelector('.fam .one'), note = card.querySelector('.note');
    const go = card.querySelector('[data-do="write"]');
    const placeCard = () => { const r = rel(stage, hero); card.style.left = `${Math.max(r.right + 16, 440)}px`; card.style.top = '16px'; };
    let caseNow = 'none', caseWritten = 'none', syncing = false, done = false;
    const all = [];
    const field = (into, spec) => { const p = picker(stage, { into, keys: 'row', compact: true, changed: () => refresh(), ...spec }); all.push(p); return p; };

    // the font
    field(famBox, { name: 'Font', toy: glyph('type'), options: FAMILY, format: (o) => (o.hard ? 'hard-coded' : ''),
      mark: (t) => `<i class="sty" style="font-family:${t.v.replaceAll('"', "'")};font-size:14px">Ag</i>`,
      apply: (o) => { h1.style.setProperty('--ff', o.v); famBox.style.setProperty('--ff', o.v); } });

    // font size, one per screen. The heading shows the size of the screen in hand; Tablet takes the phone's size until
    // it is given its own
    const sizes = {}, val = { phone: 24, tablet: 24, desktop: 34 };
    let screen = 'desktop', tabletOwn = false;
    const showSize = () => h1.style.setProperty('--fs', `${val[screen === 'tablet' && !tabletOwn ? 'phone' : screen]}px`);
    for (const [k, t] of SCREENS) {
      const startAt = HERO_SIZE.findIndex((o) => !o.hard && o.v === 24);
      sizes[k] = field(grid, { name: `Font size, ${t.toLowerCase()}`, toy: glyph('font-size'), options: HERO_SIZE, format: (o) => `${o.v}px`, start: k === 'desktop' ? undefined : startAt,
        mark: (o) => `<i class="aa" style="font-size:${Math.round(10 + (o.v - 16) * 0.3)}px">Aa</i>`,
        apply: (o) => { val[k] = o.v; if (k === 'phone' && !tabletOwn) { val.tablet = o.v; } showSize(); },
        changed: () => { if (k === 'tablet') tabletOwn = true; refresh(); },
        handles: [{ el: h1, perPx: (dx, dy) => -dy / 14, skip: () => h1.isContentEditable || screen !== k }] });
    }
    const size = () => sizes[screen];
    const weight = field(grid, { name: 'Weight', toy: glyph('font-weight'), options: WEIGHT, start: 2, format: (o) => String(o.v),
      mark: (t) => `<i class="wt" style="font-weight:${t.v}">Aa</i>`, apply: (o) => h1.style.setProperty('--fw', String(o.v)) });
    const leading = field(grid, { name: 'Line height', toy: glyph('line-height'), options: LEADING, format: (o) => String(o.v),
      mark: (t) => `<i class="lh" style="--g:${Math.round((t.v - 1) * 10)}px"></i>`, apply: (o) => h1.style.setProperty('--lh', String(o.v)) });
    const tracking = field(grid, { name: 'Letter spacing', toy: glyph('letter-spacing'), options: TRACKING, start: 1, format: (o) => `${o.v}em`,
      mark: (t) => `<i class="ls" style="letter-spacing:${t.v * 2}em">AV</i>`, apply: (o) => h1.style.setProperty('--ls', `${o.v}em`) });
    // letter spacing is set by the Heading component's own props, so it is shown but can't be changed here
    tracking.row.classList.add('locked'); tracking.row.title = 'Set by the Heading component’s props (Heading.tsx), not on this element';
    const parts = () => [[size(), HERO_SIZE, 'v'], [leading, LEADING, 'lh'], [weight, WEIGHT, 'fw'], [tracking, TRACKING, 'ls']];
    const pickScreen = (k) => {
      screen = k;
      for (const b of card.querySelectorAll('[data-screen]')) b.setAttribute('aria-pressed', String(b.dataset.screen === k));
      for (const [key] of SCREENS) sizes[key].row.hidden = key !== k;
      hero.style.setProperty('--hw', `${SCREENS.find(([key]) => key === k)[2]}px`);
      showSize(); refresh();
    };
    card.querySelector('.screens').addEventListener('click', (e) => { const b = e.target.closest('[data-screen]'); if (b) pickScreen(b.dataset.screen); });

    // the style: picking one sets the four; it is drawn as a sample of itself ('Ag' at its size and weight)
    // the style's own change never asks which style it matches (that check is for a change to one of the values)
    const style = field(styleBox, { name: 'Text style', toy: glyph('type'), options: STYLES, changed: () => refresh(true),
      format: (o) => (o.hard ? 'hard-coded' : `${o.v} / ${o.lh}`),
      mark: (t) => `<i class="sty" style="font-size:${t.hard ? 13 : Math.round(11 + (t.v - 16) * 0.25)}px;font-weight:${t.fw || 600}">Ag</i>`,
      lead: (o) => `<i class="smp" style="font-size:${o.hard ? 14 : Math.round(12 + (o.v - 16) * 0.15)}px;font-weight:${o.fw || 600}">Ag</i>`,
      apply: (o) => {
        if (syncing || o.hard) return;
        syncing = true;
        for (const [p, opts, key] of parts()) if (!p.row.classList.contains('locked')) p.set(opts.findIndex((t) => !t.hard && t.v === o[key]));
        syncing = false;
      } });
    // a change to one value: the style it now matches, or No style
    const match = () => {
      // a locked value is outside this card's say, so it doesn't count against a style
      const free = parts().filter(([p]) => !p.row.classList.contains('locked'));
      const now = Object.fromEntries(free.map(([p, opts, key]) => [key, opts[p.at()].hard ? null : opts[p.at()].v]));
      const i = STYLES.findIndex((t) => !t.hard && Object.keys(now).every((k) => t[k] === now[k]));
      syncing = true; style.set(i >= 0 ? i : STYLES.findIndex((t) => t.hard)); syncing = false;
    };

    // colour: the same colour picker as the product's card, folded: a small field that opens it in place. The heading's
    // colour is a hard-coded near-white; the theme's text colours are its tokens, each with its light and dark value
    const TEXT_INK = [
      { name: 'fg', role: 'text', l: '#101828', d: '#f5f5f6' }, { name: 'muted', role: 'text', l: '#475467', d: '#94969c' }, { name: 'faint', role: 'text', l: '#98a2b3', d: '#61646c' },
      { name: 'on-accent', role: 'accent', l: '#ffffff', d: '#ffffff' }, { name: 'accent', role: 'accent', l: '#2563eb', d: '#5b8def' },
      { name: 'bg', role: 'surface', l: '#ffffff', d: '#0c111d' }, { name: 'surface', role: 'surface', l: '#f9fafb', d: '#161b26' },
    ];
    // the hero is dark, so the heading shows each colour's dark value
    let inkLive = false; // the card's count is read only once everything in it exists
    const cp = colourPick(stage, { into: colourBox, folded: true, writes: false, tokens: TEXT_INK, hard: { name: '#f0f0f1', l: '#f0f0f1' }, role: 'text', scheme: 'dark',
      apply: (t) => { h1.style.setProperty('--ink', t.d ?? t.l); if (inkLive) refresh(); } });
    // in the card's list of fields: counted by Write, written and put back with the rest, coral while hard-coded
    all.push({ ready: () => cp.ready(), write: () => cp.seal(), putBack: () => cp.putBack(), set: () => {}, at: () => 0, row: Object.assign(cp.field, { hidden: false }), hard: () => cp.at().hard });
    queueMicrotask(() => { inkLive = true; });

    // case, alignment, decoration and wrap: buttons. Each remembers what was written, so a change counts once
    const toggles = { case: { now: 'none', was: 'none' }, align: { now: 'left', was: 'left' }, deco: { now: '', was: '' }, wrap: { now: 'wrap', was: 'wrap' } };
    const showToggles = () => {
      h1.style.setProperty('--tt', toggles.case.now); h1.style.setProperty('--ta', toggles.align.now); hero.style.setProperty('--ta', toggles.align.now);
      const deco = toggles.deco.now.split(' ').filter(Boolean);
      h1.style.setProperty('--fst', deco.includes('italic') ? 'italic' : 'normal');
      h1.style.setProperty('--td', deco.filter((d) => d !== 'italic').join(' ') || 'none');
      hero.classList.toggle('balance', toggles.wrap.now === 'balance'); hero.classList.toggle('clamp', toggles.wrap.now === 'clamp');
      for (const [k, t] of Object.entries(toggles)) {
        const box = k === 'case' ? card.querySelector('.seg:not([data-set])') : card.querySelector(`[data-set="${k}"]`);
        for (const b of box.querySelectorAll('button')) { const v = b.dataset.v ?? b.dataset.case; b.setAttribute('aria-pressed', String(k === 'deco' ? t.now.split(' ').includes(v) : t.now === v)); }
      }
    };
    card.addEventListener('click', (e) => {
      const b = e.target.closest('.seg button, .tg button'); if (!b || done) return;
      const box = b.parentElement, k = b.dataset.case ? 'case' : box.dataset.set, v = b.dataset.v ?? b.dataset.case;
      if (k === 'deco') { const on = new Set(toggles.deco.now.split(' ').filter(Boolean)); on.has(v) ? on.delete(v) : on.add(v); toggles.deco.now = [...on].sort().join(' '); }
      else toggles[k].now = v;
      showToggles(); refresh();
    });

    // the one button: how many changes there are to write, and writing them
    const pending = () => all.filter((p) => p !== style && p.ready()).length + Object.values(toggles).filter((t) => t.now !== t.was).length;
    const lb = () => go.querySelector('.lb');
    function refresh(fromStyle = false) {
      if (!syncing && !fromStyle && all.includes(style)) match();
      const n = pending(), hard = all.some((p) => p !== style && !p.row.hidden && (p.hard ? p.hard() : p.row.querySelector('.val.on-hard')));
      sizes.tablet.row.classList.toggle('inherited', !tabletOwn);
      note.textContent = screen === 'tablet' && !tabletOwn ? 'Tablet uses the phone size until you change it.' : 'Letter spacing is set by the Heading component’s props (Heading.tsx).';
      if (!done) { go.disabled = n === 0; lb().textContent = n ? `Write ${n} change${n > 1 ? 's' : ''}` : 'Write'; }
      // the heading's ring: coral while anything is still hard-coded, blue when it is all on tokens, green once written
      hero.classList.toggle('held', hard); hero.classList.toggle('clean', !hard && !done); hero.classList.toggle('done', !hard && done);
    }
    go.addEventListener('click', () => {
      if (done) { done = false; go.classList.remove('done'); for (const p of all) p.putBack(); tabletOwn = false; for (const t of Object.values(toggles)) t.now = t.was = { case: 'none', align: 'left', deco: '', wrap: 'wrap' }[Object.keys(toggles).find((k) => toggles[k] === t)]; showToggles(); showSize(); refresh(); return; }
      for (const p of all) if (p !== style) p.write();
      for (const t of Object.values(toggles)) t.was = t.now; done = true; go.classList.add('done'); lb().textContent = 'Written · undo'; refresh();
    });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.closest('.row') && !go.disabled) { e.preventDefault(); go.click(); } });
    words(stage, h1, stage.querySelector('#textcard .edittag'), () => {});
    new ResizeObserver(placeCard).observe(stage); pickScreen('desktop'); showToggles(); placeCard(); refresh();
  }
}

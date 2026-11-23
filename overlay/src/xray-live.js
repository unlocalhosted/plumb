/* ─────────────────────────────────────────────────────────
 * X-RAY, LIVE · React Plumber overlay
 *
 * What the X-ray does under the hand, written once: the design site's X-ray page and Plumber's own X-ray (Alt+B) both
 * mount this, each with an adapter that says what its page is (the design page: a demo app with made-up names and a
 * pretend server; Plumber: your app, its stamps, its theme, its server).
 *
 *   point     the element under the pointer is shown: drawn on (xray.js) and said in a card beside it, never on it
 *   a part    the padding side, margin band, ruler, corner, gap or words under the pointer lights with one pill
 *   ⇧         while held, a press-and-drag on the part changes it, snapping to your scale, and two fingers too
 *   the row   the card's token picker row holds the part: two fingers left and right choose where (scope), how (sides,
 *             or fill / fit / fixed) and the value; up and down change the one lit
 *   numbers   every number in the card can be dragged, scrolled or clicked for the list
 *   changes   collect, kept by place in the code and which copy (a re-render can't lose them); Sync (or ↵) writes
 *             them, with a line per change saying where and how, Undo and Retry; Esc puts them back
 *   ↵         with nothing to sync, a note for your agent; ⌘↵ copies it with the file and line
 *
 *   const xr = mountXray({ container, events, root, partAt, name, key, all, component, tokenOf, scale, write, undo })
 *   xr.destroy()
 *
 * The adapter:
 *   container        a positioned element the X-ray draws in (the card, the drawing, the list)
 *   events           where pointer events are heard (the stage; or window)
 *   root             where a burst goes (a shadow root or the document)
 *   partAt(e)        the page's element under the pointer, or null (never the X-ray's own)
 *   name(el)         [its name, its file:line or null]
 *   key(el)          the place in the code it is drawn from; all(key): every element drawn from there, in order
 *   component(el)    { name, file, uses } when a shared component draws it (scope 'everywhere'), else null;
 *                    everywhere(el): the elements on this page that component draws
 *   tokenOf(f, px)   the token name for a px value of a family (spacing, radius, size, type), or null
 *   scale(f)         [[px, name], …] your steps for a family
 *   recipes          { shadow: { read(el, lifted) }, motion: { read(el) } }: your shadows and the moves on offer, and
 *                    what it has (xray-recipes.js; optional: no rows without it). One changed arrives in write() with
 *                    `pick`, the option chosen; layout: { read(el), show(el, id | null) } likewise
 *   write(groups)    → [{ id, state: 'ok' | 'moved' | 'failed', cls, where, why }] for each change written
 *   scopeInfo(el, p) → { scopes, mates, where }: where the part's classes are written and every element that line
 *                    draws (asked once per element; optional)
 *   undo(result)     puts one written change back in your code
 *   watch            the element whose re-renders are watched (default: container); isPage(node): one of the page's
 * ───────────────────────────────────────────────────────── */
import { xray, shadeOf, moveOf, playMotion, layoutOf, zonesOf, zoneAt, placeCard, contextOf } from './xray.js';
import { sizing } from './boxmodel.js';
import { Scope } from './scope.js';
import { SHADOW_PICK, MOTION_PICK, LAYOUT_PICK } from './words.js';
import { picker } from './picker.js';
import { burst } from './burst.js';
import { button, KEEP_ICON } from './kit.js';
import { toyOf } from './toys.js';
import { CONCERNS } from './concerns.js';

export const XRAY_LIVE_CSS = `
  .xr-card[hidden] { display: block; opacity: 0; pointer-events: none; }
  /* the card takes the pointer only once the pointer is over it: until then a click there lands on the page below it */
  .xr-card:not([data-reach]), .xr-card[hidden] { pointer-events: none; }
  .xr-card { opacity: 1; transition: transform 420ms var(--pl-spring), opacity 200ms var(--pl-ease-out); z-index: 6; transform-origin: 0 0; }
  /* the pill's words, carried in as the card's first line */
  .xr-said[hidden] { display: none; }
  /* The card says what is wrong and what to do; the page drawing says what the element is (owner, 2026-11-20: the
     tinted note box, the card inside the card, the developer words and the inspector dump were all wrong). A note is a
     row like any other: its concern's toy, its name in the toy face, one plain sentence; colour comes from the toy,
     never from a panel behind words. The box diagram and the measurement rows are the page's, so the card drops them. */
  /* the measurements (box, size, corner, gap, type, colour) are a fold under the notes: shut when the element has
     notes, open when it has none, and kept the way you last left it (owner, 2026-11-20: "why did you remove all the
     info?"; the page draws the spacing, not the size, type or colour) */
  .xr-card:not([data-details]) :is(.xr-box, .xr-rows) { display: none; }
  .xr-card .xr-box { order: 4; } .xr-card .xr-rows { order: 5; } .xr-card .xr-body > :not(.xr-head, .xr-box, .xr-rows) { order: 6; }
  .xr-more { all: unset; order: 3; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; margin: 10px -2px 0; padding: 0 8px; height: 30px;
    border-radius: 10px; cursor: pointer; font: 600 12px/1 var(--pl-sans); color: var(--pl-text-secondary); }
  .xr-more i { width: 8px; height: 8px; border-right: 1.75px solid currentColor; border-bottom: 1.75px solid currentColor; rotate: 45deg; translate: 0 -2px; transition: rotate 220ms var(--pl-spring-pop, ease-out); }
  .xr-more[aria-expanded="true"] i { rotate: 225deg; translate: 0 2px; }
  @media (hover: hover) and (pointer: fine) { .xr-more:hover { background: var(--pl-bg-inset); color: var(--pl-text-primary); } }
  .xr-more:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
  .xr-said { margin: 2px 0 12px; font: 400 13px/1.4 var(--pl-sans); color: var(--pl-text-primary); }
  .xr-said .nt { display: grid; grid-template-columns: 26px 1fr; gap: 0 10px; align-items: start; }
  .xr-said .nt > i { width: 26px; height: 26px; margin-top: 1px; } .xr-said .nt > i svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .xr-said .nt b { display: block; font: 650 14.5px/1.3 var(--pl-round, var(--pl-sans)); margin-bottom: 2px; }
  .xr-said .nt span { display: block; color: var(--pl-text-secondary); }
  /* the toy and the name share a line; the sentence and the actions take the card's full width under them */
  .xr-said .nt { align-items: center; } .xr-said .nt > div { display: contents; } .xr-said .nt b { margin: 0; }
  .xr-said .nt span { grid-column: 1 / -1; margin-top: 6px; }
  .xr-said .nas { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 12px 0 0; }
  /* a second word beside the pink one is a plain word, not a second raised button: two raised words and Keep ran off
     the card (owner, 2026-11-20) */
  .xr-said .nas .tb.quiet:not(.only) { --lift: 0px; height: 28px; padding-top: 0; background: none; box-shadow: none; }
  .xr-said .nas .tb.quiet:not(.only) .top { height: 28px; padding: 0 6px; background: none; box-shadow: none; transform: none; color: var(--pl-text-secondary); }
  @media (hover: hover) and (pointer: fine) { .xr-said .nas .tb.quiet:not(.only):hover .top { color: var(--pl-text-primary); background: var(--pl-bg-inset); } }
  .xr-said .nas .tb.only { margin-left: auto; }
  .xr-said .xa { margin: 14px 0 0; display: grid; gap: 2px; max-height: 180px; overflow: auto; }
  .xr-said .xn { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: center; min-height: 32px; padding: 4px 6px 4px 3px; border-radius: 10px; cursor: pointer; font: 500 13px/1.3 var(--pl-sans); color: var(--pl-text-secondary); }
  .xr-said .xn > i { width: 20px; height: 20px; } .xr-said .xn > i svg { display: block; width: 100%; height: 100%; overflow: visible; }
  /* a folded issue is still an issue (owner, 2026-11-20: "the card says 2 issues… i only see 1"): its name in the card's
     ink, and the arrow that says it opens */
  .xr-said .xn { width: 100%; grid-template-columns: 20px 1fr 10px; color: var(--pl-text-primary); }
  .xr-said .xn::after { content: ''; width: 6px; height: 6px; border-right: 1.75px solid var(--pl-text-secondary); border-bottom: 1.75px solid var(--pl-text-secondary); rotate: -45deg; }
  .xr-said .xi[data-open] .xn::after { rotate: 45deg; translate: 0 -2px; }
  .xr-said .xn[aria-current] { background: var(--pl-bg-inset); color: var(--pl-text-primary); font-weight: 600; }
  @media (hover: hover) and (pointer: fine) { .xr-said .xn:not([aria-current]):hover { color: var(--pl-text-primary); background: color-mix(in oklab, var(--pl-bg-inset) 60%, transparent); } }
  .xr-said .xn:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
  /* the open issue is one block: its focus ring goes round the whole of it, inside, never round its title alone */
  .xr-said .xi[data-open] .xn:focus-visible { box-shadow: none; }
  .xr-said .xi[data-open]:has(.xn:focus-visible) { box-shadow: inset 0 0 0 2px var(--pl-border-focus); }
  /* An issue reads as one (owner, 2026-11-20: "it appears inside the card like its a note or info but not some issue"):
     coral, the language's only colour for "this is wrong", heads them with the count; each says what is wrong in the
     ink of the card, then what to do, quieter */
  .xr-said .xh { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font: 650 12px/1 var(--pl-sans); color: var(--pl-coral); }
  .xr-said .xh i { width: 16px; height: 16px; } .xr-said .xh i svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .xr-said .wr { display: block; font-style: normal; color: var(--pl-text-primary); }
  .xr-said .td { display: block; margin-top: 4px; font-style: normal; color: var(--pl-text-secondary); }
  /* what an issue is about, one hover away: the concern's name on the small dark label pictures wear */
  .xr-said .cn { position: relative; cursor: default; pointer-events: auto; }
  .xr-said .cn::after { content: attr(data-tip); position: absolute; left: calc(100% + 6px); top: 50%; translate: -3px -50%; padding: 4px 8px; border-radius: 8px;
    background: var(--pl-text-primary); color: var(--pl-bg-surface); font: 600 11px/1.2 var(--pl-sans); font-style: normal; white-space: nowrap; opacity: 0; scale: .92;
    pointer-events: none; transition: opacity 140ms var(--pl-ease-out), scale 220ms var(--pl-spring-pop), translate 220ms var(--pl-spring-pop); z-index: 3; }
  .xr-said .cn:hover::after { opacity: 1; scale: 1; translate: 0 -50%; } /* beside the toy, over the name for a moment: a label above would be clipped by the pages' scroller */
  .xr-said .xh .pgr { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; color: var(--pl-text-secondary); font: 600 11.5px/1 var(--pl-sans); font-variant-numeric: tabular-nums; }
  .xr-said .pg { all: unset; box-sizing: border-box; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; cursor: pointer; }
  .xr-said .pg::before { content: ''; width: 6px; height: 6px; border-left: 1.75px solid currentColor; border-bottom: 1.75px solid currentColor; rotate: 45deg; translate: 1px 0; }
  .xr-said .pg[data-dir="1"]::before { rotate: -135deg; translate: -1px 0; }
  .xr-said .pg:disabled { opacity: .3; cursor: default; }
  @media (hover: hover) and (pointer: fine) { .xr-said .pg:not(:disabled):hover { background: var(--pl-bg-inset); color: var(--pl-text-primary); } }
  .xr-said .pg:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
  /* the pages: side by side, one in view, snapping; the scrollbar is the count above */
  .xr-said .xs { display: grid; grid-auto-flow: column; grid-auto-columns: 100%; align-items: start; overflow-x: auto; overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory; scrollbar-width: none; outline: none; }
  .xr-said .xs::-webkit-scrollbar { display: none; }
  .xr-said .xs { grid-template-rows: auto 1fr auto; padding-bottom: 12px; margin-bottom: -12px; } /* room for the buttons' shadows, which the scroller would cut */
  .xr-said .sl { scroll-snap-align: start; scroll-snap-stop: always; min-width: 0; grid-row: 1 / -1; display: grid; grid-template-rows: subgrid; }
  .xr-said .sl .xsh { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: center; }
  .xr-said .sl .xsh > i { width: 26px; height: 26px; } .xr-said .sl .xsh > i svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .xr-said .sl .xsh b { font: 650 14.5px/1.3 var(--pl-round, var(--pl-sans)); }
  .xr-said .sl .xsw { margin-top: 6px; min-width: 0; } /* named apart: ".sw" is the swatch row elsewhere in the overlay and squeezed this to 18px */ .xr-said .sl .nas { margin-top: 12px; align-self: end; }
  /* the open note in a list: its row, then its sentence and what to do, under its name (no second copy above) */
  .xr-said .xi[data-open] { background: var(--pl-bg-inset); border-radius: 12px; padding-bottom: 10px; }
  .xr-said .xi[data-open] .xn { color: var(--pl-text-primary); font: 650 14px/1.3 var(--pl-round, var(--pl-sans)); background: none; }
  .xr-said .xd { padding: 0 8px 0 9px; color: var(--pl-text-secondary); }
  .xr-said .xd .nas { margin: 10px 0 0; }
  /* the element's name and file lead, one quiet line; the note comes after it, the part in hand last */
  .xr-card { display: flex; flex-direction: column; } .xr-card > .xr-body { display: contents; }
  /* taller than its room, the card itself scrolls: its body has no box to scroll (display: contents) */
  .xr-card[data-short] { max-height: var(--xr-max); overflow: hidden auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .xr-card[data-short] > :not(.beak), .xr-card[data-short] .xr-body > * { flex-shrink: 0; }
  .xr-card[data-short] .xr-body > .xr-pend { position: sticky; bottom: 0; z-index: 2; }
  /* one line: what it is, and where it is written as a small tag (the file and line; the whole path on hover) */
  .xr-card .xr-head { order: -1; display: flex; align-items: center; gap: 8px; margin: 0 0 14px; min-width: 0; }
  .xr-card .xr-head .toy { width: 18px; height: 18px; flex: none; }
  .xr-card .xr-head b { flex: 0 1 auto; min-width: 0; font: 650 13.5px/18px var(--pl-round, var(--pl-sans)); }
  .xr-card .xr-head code { flex: none; margin-left: auto; max-width: 52%; padding: 3px 7px; border-radius: 7px; background: var(--pl-bg-inset); direction: ltr;
    font: 500 11px/14px var(--pl-mono); color: var(--pl-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr-card .xr-head code.none { background: none; padding: 0; }
  .xr-card .xr-head .xr-noteit { all: unset; flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; cursor: pointer; color: var(--pl-text-secondary); }
  .xr-card .xr-head .xr-noteit svg { width: 15px; height: 15px; }
  @media (hover: hover) and (pointer: fine) { .xr-card .xr-head .xr-noteit:hover { background: var(--pl-bg-inset); color: var(--pl-pink); } }
  .xr-card .xr-head .xr-noteit:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
  /* the part in hand: its control, and the words about its keys only while the hand is on it */
  .xr-card .xr-hand { order: 2; margin: 4px -2px 0; }
  /* the words about its keys slide in under the control while the hand is on it, and take no room when it isn't */
  .xr-card .xr-hand .say { max-height: 0; margin-top: 0; opacity: 0; translate: 0 -4px; overflow: hidden;
    transition: max-height 220ms var(--pl-ease-out), margin-top 220ms var(--pl-ease-out), opacity 160ms var(--pl-ease-out), translate 220ms var(--pl-ease-out); }
  .xr-card .xr-hand:is(:hover, :focus-within) .say { max-height: 22px; margin-top: 6px; opacity: 1; translate: 0 0; }
  @media (prefers-reduced-motion: reduce) { .xr-card .xr-hand .say { transition: opacity 120ms linear; translate: none; } }
  /* the value holds still while it changes: the step's name in a column of its own, the number in even figures */
  .xr-hand .slot b { min-width: 5.4ch; } .xr-hand .slot span { font-variant-numeric: tabular-nums; }
  .xr-card .xr-said { order: 1; }
  .xr-card .xr-said .xa { margin-top: 0; }
  .xr-many { display: inline-flex; align-items: center; height: 18px; padding: 0 6px; margin-left: 4px; border-radius: 99px; vertical-align: 2px; background: var(--pl-sky-soft); color: var(--pl-sky-ink); font: 600 11px/1 var(--pl-sans); letter-spacing: 0; }
  .xr-many[data-scope="all"] { background: var(--pl-pink-soft); color: var(--pl-pink-ink); } .xr-many[data-scope="one"] { background: var(--pl-bg-inset); color: var(--xr-label); }
  /* the value in hand, beside the pointer: its number and its token, while you drag or scroll */
  .xr-live { position: absolute; z-index: 8; pointer-events: none; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 6px 0 10px; border-radius: 99px; white-space: nowrap;
    background: var(--pl-text-primary); color: var(--pl-bg-surface); font: 600 12px/1 var(--pl-mono); font-variant-numeric: tabular-nums; box-shadow: 0 6px 16px -6px rgb(0 0 0 / .4); }
  .xr-live[hidden] { display: none; }
  .xr-live .x { font: 600 11px/1 var(--pl-sans); opacity: .7; padding-right: 4px; }
  .xr-live b { font-family: var(--pl-sans); } .xr-live i { font: 700 11px/1 var(--pl-sans); font-style: normal; padding: 4px 7px; border-radius: 99px; background: var(--pl-on); color: #fff; }
  .xr-live i.off { background: var(--pl-off); }
  /* a list, from a click on a number: your sizes in order */
  .xr-list { position: absolute; z-index: 9; display: grid; padding: 4px; min-width: 120px; max-height: 240px; overflow: auto; border-radius: 12px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); animation: pl-pop 200ms var(--pl-spring-pop) both; }
  .xr-list button { display: flex; justify-content: space-between; gap: 12px; padding: 6px 8px; border: 0; border-radius: 8px; background: none; font: 600 12px/1 var(--pl-sans); color: var(--pl-text-primary); cursor: pointer; }
  .xr-list button span { font: 500 11.5px/1 var(--pl-mono); color: var(--xr-label); }
  .xr-list button:hover, .xr-list button[aria-selected="true"] { background: var(--pl-sky-soft); }
  .xr-list button.hard { color: var(--pl-coral-ink); }
  /* the value in hand, as the token picker row at the top of the card: where, how and the value, side by side */
  .xr-hand { margin: -2px -2px 10px; min-height: 34px; }
  .xr-hand:empty::before { content: 'Point at a part or a number'; display: flex; align-items: center; height: 34px; padding: 0 10px; border-radius: 11px; background: var(--pl-bg-inset); font: 500 12px/1 var(--pl-sans); color: var(--xr-label); }
  .xr-hand .row { position: relative; width: 100%; box-sizing: border-box; box-shadow: 0 0 0 1px var(--pl-border-default); }
  .xr-hand .row .ok, .xr-hand .list { display: none; }
  .xr-hand .row .val { flex: 1; min-width: 0; }
  .xr-hand .row .drum { min-width: 0; overflow: hidden; } .xr-hand .row .drum .slot span { overflow: hidden; text-overflow: ellipsis; }
  .xr-hand .side { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 7px; border-radius: 8px; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; transition: background-color 200ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
  /* the thumb behind the place in force: lilac over where and how, sky over the value; it follows the fingers, then snaps */
  .xr-hand .row > :not(.thumb) { position: relative; z-index: 1; }
  .xr-hand .thumb { position: absolute; left: 0; top: 3px; bottom: 3px; z-index: 0; border-radius: 8px; pointer-events: none;
    background: var(--pl-sky-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-sky) 50%, transparent);
    transition: transform 420ms var(--pl-spring), width 420ms var(--pl-spring), background-color 220ms var(--pl-ease-out); }
  .xr-hand .thumb:is([data-on="mode"], [data-on="scope"]) { background: var(--pl-lilac-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-lilac) 50%, transparent); }
  .xr-hand .thumb[data-pulled] { transition: transform 60ms linear, width 60ms linear; }
  .xr-hand .row[data-seg="mode"] [data-s="mode"], .xr-hand .row[data-seg="scope"] [data-s="scope"] { color: var(--pl-lilac-ink); }
  /* the value on its sky thumb is lettered in sky's ink, a pair the contrast check holds (pairs.js); coral on the thumb
     was 1.8:1 at night. "hard-coded" is said by the word beside it (U56) */
  .xr-hand .row[data-seg="value"] .val b, .xr-hand .row:not([data-seg]) .val b { color: var(--pl-sky-ink); }
  .xr-hand [data-s="scope"] { max-width: 92px; overflow: hidden; text-overflow: ellipsis; }
  /* the token picker's own secondary words (the side, the px beside a token) follow the X-ray's label colour */
  .xr-hand :is(.side, .slot span) { color: var(--xr-label); }
  .xr-hand .say { display: flex; gap: 10px; margin: 6px 4px 0; font: 600 11px/1 var(--pl-sans); color: var(--xr-label); }
  .xr-hand .say span[data-on] { color: var(--pl-text-primary); }
  .xr-hand .say .how { margin-left: auto; font-weight: 500; }
  /* the changes, collected at the foot of the card: how many, Sync, and the way back */
  .xr-pend { display: flex; align-items: center; gap: 4px; white-space: nowrap; margin: 10px 0 0; padding: 6px 6px 6px 12px; border-radius: 12px; background: var(--pl-pink-soft); color: var(--pl-pink-ink); font: 600 12px/1 var(--pl-sans); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .xr-pend > span:first-child { min-width: 0; white-space: normal; line-height: 1.25; }
  .xr-pend .sp { flex: 1; min-width: 4px; }
  .xr-pend button { flex: none; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; white-space: nowrap; border: 0; border-radius: 9px; font: 700 12px/1 var(--pl-sans); cursor: pointer; }
  .xr-pend .sync { background: var(--pl-pink); color: var(--pl-pink-on); box-shadow: 0 2px 0 color-mix(in oklab, var(--pl-pink) 60%, #000); }
  .xr-pend .sync[disabled] { opacity: .6; cursor: progress; }
  .xr-pend .back { background: none; color: var(--pl-pink-ink); }
  .xr-pend kbd { font: 600 11px/1 var(--pl-sans); opacity: .8; }
  /* what Sync did, one line per change */
  .xr-res { margin: 10px -2px 0; padding: 8px; border-radius: 12px; background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .xr-res .rh { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 6px 4px; font: 700 12px/1 var(--pl-sans); }
  .xr-res .rx { width: 22px; height: 22px; border: 0; border-radius: 7px; background: none; color: var(--xr-label); cursor: pointer; font-size: 15px; line-height: 1; }
  .xr-res .rr { display: grid; grid-template-columns: 20px 1fr auto; gap: 8px; align-items: start; padding: 7px 6px; border-radius: 9px; background: var(--pl-bg-surface); font: 500 12px/16px var(--pl-sans); }
  .xr-res .rr + .rr { margin-top: 4px; }
  .xr-res .rr > i { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 99px; font: 800 11px/1 var(--pl-sans); font-style: normal; color: #fff; background: var(--pl-on); }
  .xr-res .rr[data-state="moved"] > i { background: color-mix(in oklab, var(--pl-butter) 80%, var(--pl-butter-ink)); }
  .xr-res .rr[data-state="failed"] > i { background: var(--pl-off); }
  .xr-res .rr[data-state="undone"] > i { background: var(--pl-icon-tick, #aaa); }
  .xr-res .rr b { font: 600 12px/16px var(--pl-mono); }
  .xr-res .rr span { display: block; margin-top: 2px; color: var(--xr-label); font: 500 11px/15px var(--pl-mono); word-break: break-word; }
  .xr-res .rr[data-state="failed"] span { font-family: var(--pl-sans); color: var(--pl-coral-ink); }
  .xr-res .rr button { height: 24px; padding: 0 9px; border: 0; border-radius: 8px; background: var(--pl-bg-inset); font: 600 11.5px/1 var(--pl-sans); color: var(--pl-text-primary); cursor: pointer; box-shadow: inset 0 -1px 0 var(--pl-border-default); }
  /* the shadow: each option is drawn as what it makes */
  .xr-shade { flex: none; position: relative; width: 34px; height: 22px; border-radius: 6px; overflow: hidden; }
  .xr-shade > i { position: absolute; left: 50%; top: 4px; width: 40px; height: 22px; border-radius: 8px; translate: -50% 0; transform: scale(.45); transform-origin: 50% 0; }
  .xr-list .xr-shade { width: 48px; height: 32px; }
  .xr-list .xr-shade > i { top: 5px; transform: scale(.65); }
  .xr-card .xr-rows .xr-row button.ch.n.xr-pick { flex-wrap: nowrap; flex-direction: row; padding: 2px 8px 2px 3px; white-space: nowrap; appearance: none; border: 0; margin: 0; display: inline-flex; align-items: center; gap: 6px; max-width: 100%; min-height: 26px; font: inherit; color: inherit; cursor: pointer; touch-action: none; }
  .xr-card .xr-rows .xr-row button.ch.n.xr-pick:not(:has(.xr-shade)) { padding-inline: 8px; }
  .xr-card button.xr-pick > span { font: 600 12px/1 var(--pl-sans); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr-card button.xr-pick.hard > span { color: var(--pl-text-hard-coded); }
  .xr-card .xr-rows .xr-row button.ch.n.xr-pick:is(:hover, [data-held]), .xr-card .xr-rows .xr-row button.ch.n.xr-pick:is(:hover, [data-held]) > span { scale: none; background: var(--pl-sky-soft); color: var(--pl-sky-ink); }
  .xr-card button.xr-pick:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: 1px; }
  .xr-val0 { display: inline-flex; align-items: center; gap: 6px; color: var(--xr-label); }
  .xr-row .val:has(> .xr-why) { flex-wrap: wrap; white-space: normal; }
  .xr-why { flex-basis: 100%; font: 400 11.5px/15px var(--pl-sans); color: var(--xr-label); white-space: normal; text-align: start; }
  .xr-hand .row.shadow-pick .drum { flex: 1 1 auto; width: auto; max-width: none; }
  .xr-hand .row.shadow-pick .slot b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr-hand .row.shadow-pick .slot > span { display: none; }
  .xr-hand .row.shadow-pick .slot.hard > span { display: inline; flex: none; }
  .xr-list.shades { min-width: 196px; max-width: 280px; box-sizing: border-box; overscroll-behavior: contain; }
  .xr-list.shades button { justify-content: flex-start; align-items: center; min-height: 34px; padding-block: 4px; text-align: start; }
  .xr-list.shades button > span { margin-inline-start: auto; }
  .xr-lay { flex: none; display: grid; place-items: center; width: 34px; height: 22px; border-radius: 6px; background: var(--pl-bg-inset); }
  .xr-lay > i { width: 24px; height: 16px; gap: 2px; overflow: hidden; }
  .xr-lay b { display: block; flex: 1 0 var(--w, 4px); min-width: 4px; min-height: 3px; border-radius: 1.5px; background: var(--pl-lilac); }
  .xr-list .xr-lay { width: 48px; height: 32px; } .xr-list .xr-lay > i { width: 34px; height: 22px; gap: 3px; }
  .xr-hand .xr-cols { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 8px 2px 0; }
  .xr-hand .xr-cols .k { margin-inline-end: 4px; font: 600 11px/1 var(--pl-sans); color: var(--xr-label); }
  .xr-hand .xr-cols button { all: unset; box-sizing: border-box; min-width: 26px; height: 24px; padding: 0 7px; border-radius: 7px; text-align: center; cursor: pointer;
    background: var(--pl-bg-inset); font: 600 11px/24px var(--pl-mono); color: var(--pl-text-primary); }
  @media (hover: hover) and (pointer: fine) { .xr-hand .xr-cols button:hover { background: var(--pl-lilac-soft); color: var(--pl-lilac-ink); } }
  .xr-hand .xr-cols button:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: 1px; }
  .xr-list.shades .gh { padding: 8px 8px 4px; font: 600 11px/1 var(--pl-sans); color: var(--xr-label); }
  .xr-list.shades button > b { font: inherit; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr-mo { flex: none; position: relative; display: grid; place-items: center; width: 34px; height: 22px; border-radius: 6px; overflow: hidden; }
  .xr-mo > i { width: 18px; height: 11px; border-radius: 3px; box-shadow: 0 1px 2px rgb(0 0 0 / .18);
    animation: xr-mo calc(var(--d) / .3) var(--e) infinite; }
  .xr-mo.in > i { animation-name: xr-mo-in; }
  .xr-list .xr-mo { width: 48px; height: 32px; } .xr-list .xr-mo > i { width: 26px; height: 16px; }
  @keyframes xr-mo { 0%, 15% { transform: var(--r); opacity: var(--o0); } 45%, 80% { transform: var(--a); opacity: var(--o1); } 100% { transform: var(--r); opacity: var(--o0); } }
  @keyframes xr-mo-in { 0%, 10% { transform: var(--r); opacity: var(--o0); } 40%, 100% { transform: var(--a); opacity: var(--o1); } }
  @media (prefers-reduced-motion: reduce) { .xr-mo > i { animation: none; transform: var(--a); opacity: var(--o1); } }
  .xr-list.shades button:hover { background: var(--pl-bg-surface-hover); }
  .xr-list.shades button[aria-selected="true"] { background: var(--pl-sky-soft); }
  .xr-list.shades button:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: -2px; }
  /* a note for your agent: a well to write in, the place it's about above it */
  .xr-note { position: absolute; z-index: 7; width: 300px; box-sizing: border-box; padding: 12px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); animation: pl-pop 280ms var(--pl-spring-pop) both; transform-origin: 0 0; }
  .xr-note .nh { display: flex; align-items: center; gap: 8px; font: 700 13px/18px var(--pl-sans); }
  .xr-note .nh .toy { width: 22px; height: 22px; } .xr-note .nh .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .xr-note code { display: block; margin: 2px 0 8px 30px; font: 500 11px/14px var(--pl-mono); color: var(--xr-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .xr-note textarea { display: block; width: 100%; box-sizing: border-box; min-height: 84px; resize: none; padding: 10px 12px; border: 0; border-radius: 12px; outline: none; background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); color: var(--pl-text-primary); font: 400 13.5px/20px var(--pl-sans); }
  .xr-note textarea:focus { box-shadow: var(--pl-shadow-well), 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
  .xr-note .nf { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font: 500 11.5px/1 var(--pl-sans); color: var(--xr-label); }
  .xr-note kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin-right: 3px; border-radius: 6px; font: 600 11px/1 var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default), 0 0 0 1px var(--pl-border-default); }
  .xr-note[data-done] textarea { opacity: .5; }
  .xr-note .done { display: none; align-items: center; gap: 6px; color: var(--pl-mint-ink); font-weight: 700; }
  .xr-note[data-done] .done { display: inline-flex; } .xr-note[data-done] .keys { display: none; }
  .xr-note .done i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 99px; background: var(--pl-mint); color: #fff; font-style: normal; font-size: 11px; }
`;

const PAIR = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }, LINKS = ['one', 'pair', 'all'], SIZINGS = ['fixed', 'fill', 'fit'];
const SHADOW = 'box-shadow', MOTION = '--plumb-motion', LAYOUT = '--plumb-layout';
// The values that are recipes, not numbers: what the adapter's `recipes` calls them, how an option is drawn, and how it
// is shown on the page. A shadow stays on the element while it is in hand; a motion plays (its pending mark is a custom
// property of ours, so a re-render finds it again)
const RECIPES = {
  [SHADOW]: { key: 'shadow', words: SHADOW_PICK, choice: 'use', still: true, value: (x) => x.value,
    lead: (el, x) => (x.none ? '' : shadeOf(el, x.css)), show: () => {},
    wear: (t, x, c) => { const v = x ? x.value ?? '' : c?.value ?? ''; if (v) t.style.setProperty(SHADOW, v); else t.style.removeProperty(SHADOW); } },
  [MOTION]: { key: 'motion', words: { ...MOTION_PICK, list: 'Moves for this element' }, value: (x) => x.recipe,
    lead: (el, x) => (x.css ? moveOf(el, x.css) : ''), show: (t, x) => playMotion(t, x.css),
    wear: (t, x) => { if (x?.css) playMotion(t, x.css); } },
  // a layout is shown by the adapter, which holds the element as written and puts it back exactly
  [LAYOUT]: { key: 'layout', toy: 'grid', words: LAYOUT_PICK, value: (x) => x.recipe, applies: (el) => [...el.children].filter((k) => k.getClientRects().length).length >= 2,
    lead: (el, x) => layoutOf(x.s), show: (t, x, o) => o.recipes?.layout?.show?.(t, x),
    wear: (t, x, c, o) => o.recipes?.layout?.show?.(t, x ?? c?.pick ?? null), clear: (t, o) => o.recipes?.layout?.show?.(t, null) },
};
const TOYS = { padding: 'padding', margin: 'margin', width: 'width', height: 'height', 'border-radius': 'corner', gap: 'gap', 'font-size': 'type' };
const PREFIX = { 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml', gap: 'gap', width: 'w', height: 'h', 'border-radius': 'rounded', 'font-size': 'text', flex: 'flex' };
const ICON = { ok: '✓', moved: '↪', failed: '!', undone: '↺' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const familyOf = (prop) => (prop === 'width' || prop === 'height' ? 'size' : prop === 'border-radius' ? 'radius' : prop === 'font-size' ? 'type' : 'spacing');

export function mountXray(o) {
  const C = o.container, E = o.events ?? C, watch = o.watch ?? C;
  C.insertAdjacentHTML('beforeend', '<div class="xr"></div><div class="xr-card" hidden><div class="xr-said" hidden></div><div class="xr-hand"></div><button type="button" class="xr-more" aria-expanded="false"><span>Measurements</span><i aria-hidden="true"></i></button><div class="xr-body"></div></div><div class="xr-live" hidden></div>');
  const layer = C.querySelector(':scope > .xr'), card = C.querySelector(':scope > .xr-card'), body = card.querySelector('.xr-body'), hand = card.querySelector('.xr-hand'), live = C.querySelector(':scope > .xr-live');
  const off = []; // every listener added, taken off by destroy()
  const life = new Scope(); // what the shadow row starts ends with the X-ray
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };
  const box = () => C.getBoundingClientRect();
  const ourUI = (e) => e.composedPath().some((n) => n === card || n.classList?.contains('xr-list') || n.classList?.contains('xr-note'));
  // the card waits for the hand and the page to come to rest (owner, 2026-11-13: "as i am scrolling wait for some time
  // like a second"): while things move, only the drawing on the page follows. Once shown, it stays only while the hand
  // stays or heads for it ("it should disappear again as i start moving, but follow the triangle principle"): a move
  // away of more than a few pixels, or a scroll, puts it away and the wait starts again.
  // owner, 2026-11-20: half a second, and the card grows out of the pill it follows, then shrinks back into it
  const REST = 500, DRIFT = 6;
  let ready = false, restT = 0, ptNow = null, restAt = null;
  // One body under the pointer (owner, 2026-11-20: "the small card itself to expand and shrink into small card"): the
  // card grows from the pill by the pointer (a note's, else the part's) and shrinks back to it; the pill's words become
  // the card's first line, and the pills step aside while it is open (the host's data-grown)
  const said = card.querySelector('.xr-said'), more = card.querySelector('.xr-more');
  // the fold's state: yours once you have opened or shut it, else open only where there are no notes
  let details = null; try { const v = localStorage.getItem('plumb:xray-details'); details = v == null ? null : v === '1'; } catch {}
  const foldNow = () => { const open = details ?? said.hidden; card.toggleAttribute('data-details', open); more.setAttribute('aria-expanded', String(open)); };
  more.addEventListener('click', (e) => { e.stopPropagation(); details = !card.hasAttribute('data-details'); try { localStorage.setItem('plumb:xray-details', details ? '1' : '0'); } catch {} foldNow(); if (shown) draw(shown); });
  let from = null;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pillBox() {
    const root = C.getRootNode(), s = box();
    const p = [...root.querySelectorAll('.bp-hint[data-on], .xr-say')].find((n) => n.getClientRects().length && getComputedStyle(n).display !== 'none');
    if (p) { const r = p.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, html: p.classList.contains('bp-hint') ? p.innerHTML : '' }; }
    return ptNow ? { x: ptNow.x - s.left - 10, y: ptNow.y - s.top - 10, w: 20, h: 20, html: '' } : null;
  }
  // The note at the head of the card (owner, 2026-11-20: "dont we show any suggestion … what could be the actionable
  // step"): on the pink face the pins wear, its name, what to do, and what you can do from here. Words are edited in
  // place; anything else goes to your agent; either way it can be kept as it is.
  // Pinned (an Alt-click), the card says everything plumber has about the element (docs/briefs/concerns-and-two-views.md):
  // every note, grouped by concern; one is picked, and it is the note above with what you can do about it
  let notes = null, notesFor = null, notePick = 0;
  function readNotes(el) {
    notes = null; notesFor = el; notePick = 0;
    Promise.resolve(o.notesOf?.(el)).then((list) => {
      if (notesFor !== el || pinned !== el || !list?.length) return;
      notes = list; syncSaid(el, true); if (shown === el) draw(el);
    }).catch(() => {});
  }
  // the kit's buttons: the one thing to do raised in pink; the second a quiet word; Keep a picture, named on hover
  let curNote = null;
  const actsFor = (n) => {
    const el = notesFor ?? shown, words = n.words && el && [...el.childNodes].some((t) => t.nodeType === 3 && t.data.trim());
    const main = words && o.editWords ? ['edit', 'Edit the words'] : ['agent', 'Ask your agent'];
    return button(main[1], { cls: 'sm na main', attrs: `data-act="${main[0]}"` })
      + (main[0] === 'edit' ? button('Ask your agent', { cls: 'sm quiet na', attrs: 'data-act="agent"' }) : '')
      + (o.keepNote ? button('', { cls: 'sm quiet only na', icon: KEEP_ICON, attrs: 'data-act="keep" aria-label="Keep as is" data-tip="Keep as is"' }) : '');
  };
  // what is wrong, then what to do (an older note without the two parts says its advice)
  const sentence = (n) => n.wrong ? `<i class="wr">${esc(n.wrong)}</i>${n.todo ? `<i class="td">${esc(n.todo)}</i>` : ''}` : esc(n.advice);
  const toyOfConcern = (id) => toyOf(CONCERNS.find((c) => c.id === id)?.toy ?? '');
  // Many issues, one at a time (owner, 2026-11-20: "scroll left to right… if one element has more than 2-3 issues"):
  // each is a page of its own, whole (name, what is wrong, what to do, its actions); swipe, scroll sideways, or the
  // arrows by the count move to the next. The card keeps the height of the tallest, so it holds still as you page.
  function listHtml() {
    // three rows every page shares (subgrid): the name, the sentence, the actions; a short issue leaves room, and its
    // actions stay where the others' are (owner, 2026-11-20: "use sub-grid so that… everything remain at its place")
    return '<div class="xs" tabindex="-1">' + notes.map((n, i) => `<section class="sl" data-i="${i}" data-rule="${esc(n.rule)}" aria-label="Issue ${i + 1} of ${notes.length}">`
      + `<div class="xsh"><i class="cn" data-tip="${esc(n.concernName)}" aria-label="${esc(n.concernName)}" role="img">${toyOfConcern(n.concern)}</i><b>${esc(n.name)}</b></div>`
      + `<div class="xsw">${sentence(n)}</div><div class="nas">${actsFor(n)}</div></section>`).join('') + '</div>';
  }
  function noteHtml(el) {
    // the element's own note, asked of the page's marks; never the pill's words, which may be about the element the
    // hand just passed (U6)
    const all = el && pinned === el && notesFor === el && notes?.length ? notes : null;
    const n = all ? all[notePick] : el && o.noteOf?.(el);
    if (!n?.name) return '';
    const { name, advice, rule } = n;
    // Edit the words leads only a note about the words (an em dash, a stock word); a padding note is your agent's (U30)
    const words = n.words && [...el.childNodes].some((t) => t.nodeType === 3 && t.data.trim());
    curNote = { ...n, words };
    const k = all ? all.length : 1, pager = all && k > 1
      ? `<span class="pgr"><button type="button" class="pg" data-dir="-1" aria-label="Previous issue"${notePick ? '' : ' disabled'}></button><span class="at">${notePick + 1} of ${k}</span><button type="button" class="pg" data-dir="1" aria-label="Next issue"${notePick < k - 1 ? '' : ' disabled'}></button></span>` : '';
    const head = `<div class="xh"><i aria-hidden="true">${toyOf('error')}</i>${k === 1 ? '1 issue' : `${k} issues`}${pager}</div>`;
    if (all && all.length > 1) return head + listHtml();
    const cname = CONCERNS.find((c) => c.id === n.concern)?.short ?? '';
    return `${head}<div class="nt" data-rule="${esc(rule)}"><i class="cn" data-tip="${esc(cname)}" aria-label="${esc(cname)}" role="img">${toyOfConcern(n.concern)}</i><div><b>${esc(name)}</b><span>${sentence(n)}</span></div></div><div class="nas">${actsFor(curNote)}</div>`;
  }
  // The note belongs to the element the card is on. The page's pill goes away as the hand leaves the element for the card;
  // that must not empty the card: a card that lost its note got shorter, was placed again (above, then below), and put
  // the hand back on the element, whose pill came back: it flickered without end (owner, 2026-11-20). So the note changes
  // only when the card moves to another element, or fills in once for this one.
  let saidEl = null;
  function syncSaid(el, force = false) {
    watchHint();
    const html = noteHtml(el);
    if (!force && el === saidEl && (!html || said.dataset.for)) return;
    if (said.dataset.for !== html) { said.innerHTML = html; said.dataset.for = html; const xs = said.querySelector('.xs'); if (xs) requestAnimationFrame(() => { xs.scrollLeft = notePick * xs.clientWidth; }); }
    said.hidden = !html; saidEl = el;
  }
  // the page's pill can come up a moment after the card (it answers its own pointer events): watched, the card's note
  // follows it whenever it changes
  let hintSeen = null;
  function watchHint() {
    const h = C.getRootNode().querySelector('.bp-hint');
    if (!h || h === hintSeen) return;
    hintSeen = h;
    const mo = new MutationObserver(() => { if (!card.hidden && shown) syncSaid(shown); });
    mo.observe(h, { attributes: true, childList: true, subtree: true, characterData: true });
    off.push(() => mo.disconnect());
  }
  card.addEventListener('click', (e) => { if (e.target.closest?.('.xr-noteit')) { e.stopPropagation(); startNote(); } });
  said.addEventListener('click', (e) => {
    const pg = e.target.closest?.('.pg');
    if (pg) { e.stopPropagation(); goTo(notePick + +pg.dataset.dir); return; }
    const sl = e.target.closest?.('.sl');
    if (sl && notes) curNote = { ...notes[+sl.dataset.i] };
    const act = e.target.closest?.('.na')?.dataset.act, el = shown;
    if (!act || !el) return;
    e.stopPropagation();
    const { name = '', advice = '', rule = '' } = curNote ?? {};
    if (act === 'edit') { shrink(); o.editWords?.(el); }
    else if (act === 'agent') startNote(`${name}: ${advice}`);
    else if (act === 'keep') { shrink(); o.keepNote?.(el, rule); }
  });
  // paging: the arrows scroll to an issue; a swipe or a sideways scroll settles on one, and the count follows
  const pagerSay = () => {
    const at = said.querySelector('.at'), [prev, next] = said.querySelectorAll('.pg');
    if (at) at.textContent = `${notePick + 1} of ${notes.length}`;
    if (prev) prev.disabled = notePick === 0; if (next) next.disabled = notePick >= notes.length - 1;
    if (notes?.[notePick]) curNote = { ...notes[notePick] };
  };
  function goTo(i) {
    const xs = said.querySelector('.xs'); if (!xs || !notes) return;
    notePick = Math.max(0, Math.min(notes.length - 1, i)); pagerSay();
    xs.scrollTo({ left: notePick * xs.clientWidth, behavior: still() ? 'instant' : 'smooth' });
  }
  // the count follows where the pages settle, never the positions a smooth scroll passes through (a click on the next
  // arrow read the halfway point and landed one page off)
  let settleT = 0;
  said.addEventListener('scroll', (e) => {
    const xs = e.target; if (!xs.classList?.contains('xs') || !notes) return;
    clearTimeout(settleT);
    settleT = setTimeout(() => { const i = Math.round(xs.scrollLeft / Math.max(1, xs.clientWidth)); if (i !== notePick) { notePick = i; pagerSay(); } }, 140);
  }, true);
  said.addEventListener('keydown', (e) => {
    if (!said.querySelector('.xs') || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.target.closest?.('input, textarea')) return;
    e.preventDefault(); e.stopPropagation(); goTo(notePick + (e.key === 'ArrowRight' ? 1 : -1));
  });
  function grow(el) {
    from = pillBox();
    syncSaid(el);
    C.getRootNode().host?.setAttribute('data-grown', '');
    if (!from || still()) return;
    const cw = card.offsetWidth || 292, ch = card.offsetHeight || 300;
    card.animate([{ transform: `translate(${from.x}px, ${from.y}px) scale(${from.w / cw}, ${from.h / ch})`, opacity: 0.85 }, { transform: `translate(${cardAt.x}px, ${cardAt.y}px) scale(1, 1)`, opacity: 1 }],
      { duration: 340, easing: 'cubic-bezier(.2, .9, .25, 1.04)' });
    for (const part of [said, hand, body]) part.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 340, easing: 'ease-out' });
  }
  function shrink() {
    C.getRootNode().host?.removeAttribute('data-grown');
    if (card.hidden) return;
    const to = from; from = null;
    if (to && !still()) {
      const cw = card.offsetWidth || 292, ch = card.offsetHeight || 300;
      card.animate([{ transform: `translate(${cardAt.x}px, ${cardAt.y}px) scale(1, 1)`, opacity: 1 }, { transform: `translate(${to.x}px, ${to.y}px) scale(${to.w / cw}, ${to.h / ch})`, opacity: 0 }],
        { duration: 220, easing: 'cubic-bezier(.4, 0, .7, .2)' });
    }
    card.hidden = true;
  }
  let lastCard = '', shown = null, shownKey = null, pinned = null, noting = null, held = null, cardAt = { x: 0, y: 0 }, lastOn = null, waiting = 0;

  // ── where a change reaches, and the changes ───────────────
  // a part's places on the page: every element its line of code draws (the rows of a list, the cards of a grid)
  // where a part's classes are written, and every element that line draws (the adapter's scopeInfo, asked once per
  // element when a part comes into hand): { scopes, mates, where }. Until it answers, the copies its stamp shares
  const infos = new WeakMap();
  const peers = (el) => { const i = infos.get(el); if (i) return i.mates; const k = o.key(el); const all = k ? [...o.all(k)] : []; return all.includes(el) ? all : [el]; };
  // the changes not yet synced, by place in the code and which copy ('key#n' → { prop → { before, value, scope } }),
  // never by element: a re-render replaces elements, and the change must find the new one
  const changes = new Map();
  // A change is kept by place: the element's line and its position among everything that line draws, so a re-render
  // that replaces the element finds the new one at the same place. The position is counted in the one list the change
  // is found again by (o.all), never in another (the copies a scope reaches can be listed in another order, or miss the
  // element): two lists put the pointed element at 0, on top of the first copy, and Put back restored that copy twice
  // and left the pointed one changed. An element its line's list doesn't hold is kept by itself.
  const loose = new Map(); let looseN = 0; const looseId = new WeakMap();
  const placeKey = (el) => {
    const k = o.key(el), i = k ? (o.all(k) ?? []).indexOf(el) : -1;
    if (i >= 0) return `${k}#${i}`;
    if (!looseId.has(el)) { looseId.set(el, `${k ?? '?'}#el${++looseN}`); loose.set(looseId.get(el), new WeakRef(el)); }
    return looseId.get(el);
  };
  const elOf = (k) => {
    if (loose.has(k)) { const el = loose.get(k).deref(); return el?.isConnected ? el : null; }
    const i = k.lastIndexOf('#'); const all = o.all(k.slice(0, i)); return all?.[+k.slice(i + 1)] ?? null;
  };
  // which sides move together, kept until changed: 'one', 'pair' or 'all'
  let link = 'one';
  const linkedOf = (prop) => {
    const sided = prop.match(/^(padding|margin)-(top|right|bottom|left)$/); if (!sided) return [prop];
    return link === 'all' ? ['top', 'right', 'bottom', 'left'].map((k) => `${sided[1]}-${k}`) : link === 'pair' ? [prop, `${sided[1]}-${PAIR[sided[2]]}`] : [prop];
  };
  // the card's Sync takes Enter while it owns the screen with changes waiting: the host says so, and the bar's resting ↵
  // steps back (said again wherever the changes or the owner change)
  const markKeys = () => { o.root?.host?.toggleAttribute?.('data-xr-keys', !!count() && !o.paused?.()); keep(); };
  // Changes waiting to sync outlive a reload (a write elsewhere reloads the page; they were lost with it, journey 107):
  // kept for this tab by their place in the code, and drawn again on that page when the X-ray starts. A shadow, motion
  // or layout pick holds the element it was made on, so only plain properties are kept
  const KEPT = 'plumber:xray-changes';
  // the X-ray ending (Blueprint left, by the person or by plumber's own re-read) takes the changes off the page but
  // keeps them: only Sync and Put back end them
  let ending = false;
  const keep = () => {
    if (ending) return;
    try {
      const list = [...changes].filter(([k]) => !loose.has(k)).flatMap(([k, m]) => [...m].filter(([p]) => !RECIPES[p]).map(([p, c]) => [k, p, c.before, c.value, c.scope]));
      if (list.length) sessionStorage.setItem(KEPT, JSON.stringify({ path: location.pathname, list })); else sessionStorage.removeItem(KEPT);
    } catch { /* storage refused: the changes live on the page only, as before */ }
  };
  // drawn on whichever of their places the page has now; a place rendered later is drawn by the next pass
  const redraw = () => { for (const [k, m] of changes) { const el = elOf(k); if (el) for (const [p, c] of m) if (!RECIPES[p] && el.style.getPropertyValue(p) !== c.value) el.style.setProperty(p, c.value); } refresh(); };
  const restore = () => {
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEPT) ?? 'null'); } catch { /* unreadable: nothing kept */ }
    if (!saved?.list?.length || saved.path !== location.pathname) return;
    for (const [k, p, before, value, scope] of saved.list) { if (!changes.has(k)) changes.set(k, new Map()); changes.get(k).set(p, { before, value, scope }); }
    redraw(); life.timeout(redraw, 600); life.timeout(redraw, 2000);
    markKeys();
  };
  const count = () => new Set([...changes].flatMap(([k, m]) => [...m].map(([q, c]) => `${k.slice(0, k.lastIndexOf('#'))}|${q}|${RECIPES[q] ? c.scope : ''}`))).size;
  const reach = () => changes.size;
  const unseen = () => [...changes.keys()].filter((k) => !elOf(k)).length;
  // the scope: 'one' just this; 'page' every place here its line draws; 'all' the component, everywhere it's used
  let scope = 'one';
  const scopesOf = (el) => infos.get(el)?.scopes ?? [...(peers(el).length > 1 ? ['one', 'page'] : ['one']), ...(o.component(el) ? ['all'] : [])];
  const targets = (el) => {
    if (scope === 'all' && o.component(el)) return o.everywhere?.(el) ?? [el];
    return scope === 'page' ? peers(el) : [el];
  };
  // a place in code (`src/a/b.jsx:12` → `b.jsx:12`), or a rule as said (`.title in foundations.css`) kept whole
  const tail = (w) => (!w ? '' : / in /.test(w) ? String(w) : String(w).split('/').pop());
  const scopeSaid = (el) => scope === 'all' ? `all ${o.component(el)?.uses ?? ''}`.trim() : scope === 'page' ? `×${peers(el).length}` : 'this';
  const read = (el, prop) => { const cs = getComputedStyle(el); return prop === 'width' ? el.getBoundingClientRect().width : prop === 'height' ? el.getBoundingClientRect().height : prop === 'gap' ? parseFloat(cs.columnGap) || parseFloat(cs.rowGap) || 0 : parseFloat(cs.getPropertyValue(prop)) || 0; };
  const set = (el, prop, v) => {
    for (const t of targets(el)) {
      const k = placeKey(t), val = typeof v === 'number' ? `${v}px` : v;
      if (!changes.has(k)) changes.set(k, new Map());
      const m = changes.get(k);
      if (!m.has(prop)) m.set(prop, { before: t.style.getPropertyValue(prop) });
      Object.assign(m.get(prop), { value: val, scope });
      t.style.setProperty(prop, val);
    }
    markKeys();
  };
  const optionsFor = (family, n) => {
    const S = (o.scale(family) ?? []).map(([v, name]) => ({ name, v }));
    if (n && !S.some((x) => Math.abs(x.v - n) <= 0.5) && !(family === 'radius' && n > 500)) S.push({ name: `${Math.round(n * 10) / 10}px`, v: n, hard: true });
    if (family === 'spacing' && !S.some((x) => x.v === 0)) S.unshift({ name: '0', v: 0 });
    return S.sort((a, b) => a.v - b.v);
  };
  const nearest = (S, v) => S.reduce((b, x) => (Math.abs(x.v - v) < Math.abs(b.v - v) ? x : b), S[0]);
  const say = (x, px, py) => { const s = box(); live.hidden = false; const n = shown ? targets(shown).length : 1; live.innerHTML = `<b>${x.v}</b>${x.hard ? '<i class="off">off scale</i>' : `<i>${esc(x.name)}</i>`}${n > 1 ? `<span class="x">×${n}</span>` : ''}`; live.style.left = `${px - s.left + 16}px`; live.style.top = `${py - s.top + 14}px`; };

  // ── a shadow or a motion: one of yours, for every element its line of code draws ──
  // what the adapter read for an element ({} until it answers); read when its row is on screen, again after a write
  let shades = { [SHADOW]: new WeakMap(), [MOTION]: new WeakMap(), [LAYOUT]: new WeakMap() }, shadeList = null;
  const forgetNow = () => { linesOff(); shades = { [SHADOW]: new WeakMap(), [MOTION]: new WeakMap(), [LAYOUT]: new WeakMap() }; shadeList?.end(); if (RECIPES[inHand?.prop]) { hand.innerHTML = ''; inHand = null; } };
  // after a write the page takes the new code in a moment later (a hot update or a reload): what is read from the page
  // itself, a layout, is read again once it has
  const forget = () => { forgetNow(); life.timeout(() => { forgetNow(); refresh(); }, 1500); };
  const pickedOn = (el, prop) => changes.get(placeKey(el))?.get(prop);
  const readShade = (el, prop) => {
    const kind = RECIPES[prop], adapter = o.recipes?.[kind.key];
    if (!adapter || shades[prop].has(el) || (kind.applies && !kind.applies(el))) return;
    const asked = {}, table = shades[prop];
    table.set(el, asked);
    const lifted = (fn) => {
      const c = pickedOn(el, prop);
      if (!c) return fn();
      el.style.setProperty(prop, c.before);
      try { return fn(); } finally { el.style.setProperty(prop, c.value); }
    };
    life.wait(adapter.read(el, lifted)).catch((error) => ({ why: error?.message ?? String(error) })).then((s) => {
      if (table.get(el) !== asked) return;
      table.set(el, s);
      if (shown === el) refresh();
    });
  };
  const shadeNow = (el, prop) => {
    const kind = RECIPES[prop], s = o.recipes?.[kind.key] && (!kind.applies || kind.applies(el)) ? shades[prop].get(el) ?? {} : null;
    if (!s?.options) return s;
    const c = pickedOn(el, prop);
    // columns set by hand are a layout of their own, after the row's
    if (c?.pick?.recipe === 'custom') return { ...s, options: [...s.options, { ...c.pick, v: s.options.length }], at: s.options.length };
    const i = c ? s.options.findIndex((x) => x.recipe === c.pick?.recipe) : -1;
    return { ...s, at: i < 0 ? s.start : i };
  };
  // the option in hand on every place it reaches; the one it started with is no change at all
  const setShade = (el, prop, s, i) => {
    const x = s.options[i];
    for (const t of s.mates) {
      if (!t.isConnected) continue;
      const k = placeKey(t), m = changes.get(k) ?? new Map(), was = m.get(prop);
      if (i === s.start) {
        if (!was) continue;
        if (was.before) t.style.setProperty(prop, was.before); else t.style.removeProperty(prop);
        m.delete(prop);
        if (!m.size) changes.delete(k);
      } else if (x.recipe) {
        const value = RECIPES[prop].value(x);
        m.set(prop, { before: was ? was.before : t.style.getPropertyValue(prop), value, scope: s.site, pick: { el, name: x.name, recipe: x.recipe, choice: RECIPES[prop].choice, ...(x.s ? { s: x.s } : {}) } });
        changes.set(k, m);
        t.style.setProperty(prop, value);
      }
      RECIPES[prop].show(t, x, o);
    }
    markKeys();
  };
  function holdShade(el, prop) {
    if (inHand?.el === el && inHand.prop === prop) return;
    const s = shadeNow(el, prop), kind = RECIPES[prop];
    if (!s?.options) return;
    shadeList?.end();
    hand.innerHTML = ''; inHand = null;
    let made = false;
    const p = picker(C, {
      name: kind.words[kind.key], toy: kind.toy ?? kind.key, options: s.options, into: hand, keys: 'row', start: s.start,
      mark: () => '', format: () => '', lead: (x) => kind.lead(el, x, false, s),
      apply: (x) => { if (made && el.isConnected) { setShade(el, prop, s, s.options.indexOf(x)); draw(el); } },
    });
    if (s.mates.length > 1) p.row.querySelector('.scrub').insertAdjacentHTML('afterend', `<span class="side" data-s="scope">×${s.mates.length}</span>`);
    const said = { [SHADOW]: ['value', 'your tokens'], [MOTION]: ['move', 'the moves'], [LAYOUT]: ['layout', 'the layouts'] }[prop];
    hand.insertAdjacentHTML('beforeend', `<div class="say"><span data-s="value" data-on>${said[0]}</span><span class="how">↕ change · click for ${said[1]}</span></div>`);
    p.row.insertAdjacentHTML('afterbegin', '<i class="thumb" aria-hidden="true"></i>');
    p.row.dataset.seg = 'value';
    p.row.classList.add('shadow-pick');
    const val = p.row.querySelector('.val');
    let pressed = null;
    val.addEventListener('pointerdown', (e) => { pressed = { x: e.clientX, y: e.clientY }; val.focus({ preventScroll: true }); });
    val.addEventListener('click', (e) => { if (!e.detail || (pressed && Math.abs(e.clientX - pressed.x) + Math.abs(e.clientY - pressed.y) < 4)) openShades(el, val); });
    inHand = { el, prop, p, S: s.options, sided: false, sized: false, segs: ['value'], scopes: [], seg: 'value', tx: 0, ty: 0, axis: null, idle: 0, shade: s };
    if (s.at !== s.start) p.set(s.at);
    made = true;
    if (prop === LAYOUT) columnsIn(el, s);
    draw(el);
    thumbAt(0, 0, true);
  }
  // A grid's columns, under the layout in hand: one chip per column (a click gives the next size), + and −, and the
  // lines on the element to drag. Columns set by hand are one more layout, pending like the others.
  let linesOn = null;
  const linesOff = () => { if (linesOn) o.recipes?.layout?.lines?.(linesOn, false); linesOn = null; };
  function columnsIn(el, s) {
    const x = s.options[s.at ?? s.start], cols = x?.s?.mode === 'grid' ? x.s.cols ?? [] : null;
    linesOff();
    hand.querySelector('.xr-cols')?.remove();
    if (!cols || !o.recipes?.layout?.step) return;
    const W = o.recipes.layout.words ?? {};
    hand.insertAdjacentHTML('beforeend', `<div class="xr-cols" role="group" aria-label="${esc(W.columns ?? 'Columns')}"><span class="k">${esc(W.columns ?? 'Columns')}</span>`
      + cols.map((c, i) => `<button type="button" data-col="${i}" title="${esc(W.next ?? '')}">${esc(c.replace('repeat(auto-fit,minmax(200px,1fr))', 'fit'))}</button>`).join('')
      + `<button type="button" data-col="add" aria-label="${esc(W.add ?? 'Add a column')}" title="${esc(W.add ?? '')}">+</button>${cols.length > 1 ? `<button type="button" data-col="remove" aria-label="${esc(W.remove ?? 'Remove the last column')}" title="${esc(W.remove ?? '')}">−</button>` : ''}</div>`);
    o.recipes.layout.lines?.(el, true); linesOn = el;
  }
  // a layout of the element's own (its columns changed here, or a line dragged on the page) as the one pending
  const ownLayout = (el, s1) => {
    const s = shadeNow(el, LAYOUT); if (!s?.options) return;
    const own = { name: o.recipes.layout.name?.(s1) ?? 'Columns', recipe: 'custom', s: s1 };
    const base = s.options.filter((x) => x.recipe !== 'custom'), all = { ...s, options: [...base, { ...own, v: base.length }] };
    setShade(el, LAYOUT, all, base.length);
    if (inHand?.prop === LAYOUT) { hand.innerHTML = ''; inHand = null; holdShade(el, LAYOUT); }
    refresh();
  };
  life.listen(hand, 'click', (e) => {
    const b = e.target.closest?.('[data-col]'); if (!b || inHand?.prop !== LAYOUT) return;
    e.stopPropagation();
    const s = shadeNow(inHand.el, LAYOUT), x = s.options[s.at ?? s.start], k = b.dataset.col;
    ownLayout(inHand.el, o.recipes.layout.step(x.s, k === 'add' || k === 'remove' ? k : Number(k)));
  });
  o.recipes?.layout?.dragged?.((el, s1) => { if (el.isConnected) ownLayout(el, s1); });
  // a column line held: the card stays on the layout while the hand crosses the page
  life.listen(C.getRootNode(), 'pointerdown', (e) => {
    if (!e.composedPath().some((n) => n.classList?.contains('lay-line'))) return;
    held = { prop: LAYOUT };
    const drop = life.child();
    drop.listen(window, 'pointerup', () => { held = null; drop.end(); }, true);
    drop.listen(window, 'pointercancel', () => { held = null; drop.end(); }, true);
  }, true);
  // a press on the row: a drag steps through the options, a click lists them
  function pressShade(e, el, at, prop) {
    e.preventDefault(); e.stopPropagation();
    holdShade(el, prop);
    const h = inHand;
    if (h?.prop !== prop) return;
    const x0 = e.clientX, y0 = e.clientY, from = h.p.at(), press = life.child();
    let moved = false;
    held = { prop, chip: true };
    const end = () => { press.end(); held = null; justDragged = false; };
    press.listen(window, 'pointermove', (m) => {
      const dx = m.clientX - x0, dy = m.clientY - y0;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      h.p.set(from + Math.round((dx - dy) / 26));
    }, true);
    press.listen(window, 'pointercancel', end, true);
    press.listen(window, 'pointerup', () => {
      end();
      // the row may have been drawn again under the press
      if (!moved) openShades(el, at.isConnected ? at : body.querySelector(`.xr-pick[data-prop="${prop}"]`));
      else { refresh(); h.p.row.querySelector('.val').focus({ preventScroll: true }); }
    }, true);
  }
  function openShades(el, at) {
    const h = inHand, kind = RECIPES[h?.prop];
    if (!kind || !at) return;
    shadeList?.end();
    C.querySelector(':scope > .xr-list')?.remove();
    const open = shadeList = life.child(), list = document.createElement('div'), s = box(), b = at.getBoundingClientRect();
    list.className = 'xr-list shades'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', kind.words.list ?? `Your ${kind.key} tokens`);
    let group = null;
    list.innerHTML = h.S.map((x, i) => {
      const head = x.group && x.group !== group ? `<div class="gh" role="presentation">${esc(kind.words[group = x.group])}</div>` : '';
      return `${head}<button type="button" role="option" data-i="${i}" class="${x.hard ? 'hard' : ''}" aria-selected="${i === h.p.at()}">${kind.lead(el, x, true, h.shade)}<b>${esc(x.name)}</b>${x.hard ? `<span>${SHADOW_PICK.hard}</span>` : x.tag ? `<span>${esc(x.tag)}</span>` : ''}</button>`;
    }).join('');
    C.append(list);
    const w = list.offsetWidth, tall = list.offsetHeight, below = b.bottom - s.top + 6;
    list.style.left = `${Math.max(8, Math.min(b.left - s.left, s.width - w - 8))}px`;
    list.style.top = `${below + tall > s.height - 8 ? Math.max(8, b.top - s.top - tall - 6) : below}px`;
    // pointed at, an option is on the element at once; leaving puts back the one in hand
    let pointedAt = null;
    const wear = (x) => { for (const t of h.shade.mates) kind.wear(t, x, pickedOn(t, h.prop), o); };
    const point = (e) => { const i = e.target.closest?.('[data-i]')?.dataset.i; if (i !== undefined && i !== pointedAt) { pointedAt = i; wear(h.S[i]); } };
    open.listen(list, 'pointerover', point);
    open.listen(list, 'focusin', point);
    open.listen(list, 'pointerleave', () => { pointedAt = null; wear(null); });
    open.listen(list, 'keydown', (e) => {
      const all = [...list.querySelectorAll('button')], i = all.indexOf(e.target), step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); e.stopPropagation(); all[Math.max(0, Math.min(all.length - 1, i + step))].focus(); }
      else if (e.key === 'Tab') open.end();
    });
    open.listen(list, 'click', (e) => {
      const i = e.target.closest?.('[data-i]')?.dataset.i;
      if (i === undefined) return;
      open.end();
      h.p.set(Number(i));
      h.p.row.querySelector('.val').focus({ preventScroll: true });
    });
    open.listen(window, 'pointerdown', (e) => { if (!e.composedPath().includes(list)) open.end(); }, true);
    open.onEnd(() => { if (kind.still || kind.clear) wear(null); list.remove(); if (shadeList === open) shadeList = null; });
    list.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
  }

  // ── the drawing and the card ───────────────────────────────
  let zone = null, justDragged = false, warm = 0, pending;
  const draw = (el) => {
    if (!el) { shadeList?.end(); linesOff(); layer.innerHTML = ''; shrink(); shown = null; zone = null; ready = false; clearTimeout(restT); return; }
    const s = box(), [name, source] = o.name(el);
    const zs = zonesOf(el), inProp = held?.prop ?? zone?.prop;
    const lit = inProp ? zs.filter((q) => q.prop !== inProp && linkedOf(inProp).includes(q.prop)) : [];
    const z = (zone && zs.find((q) => q.prop === zone.prop)) || zone;
    const x = xray(el, { shadow: shadeNow(el, SHADOW), motion: shadeNow(el, MOTION), layout: shadeNow(el, LAYOUT), tokenOf: o.tokenOf, origin: { left: s.left, top: s.top }, room: { left: 12, top: 12, right: s.width - 12, bottom: s.height - 96 }, name, source, zone: z, lit });
    const same = el === shown;
    if (!same) hold(null);
    layer.toggleAttribute('data-still', same);
    layer.innerHTML = x.page;
    // the other places the change will reach, outlined
    const others = (inHand?.el === el && RECIPES[inHand.prop] ? inHand.shade.mates : targets(el)).filter((t) => t !== el && t.isConnected);
    if (others.length) layer.insertAdjacentHTML('beforeend', `<svg class="xr-on xr-peers" aria-hidden="true">${others.slice(0, 200).map((t) => { const r = t.getBoundingClientRect(), rad = Math.min(parseFloat(getComputedStyle(t).borderTopLeftRadius) || 0, r.height / 2); return `<rect x="${r.left - s.left - 2}" y="${r.top - s.top - 2}" width="${r.width + 4}" height="${r.height + 4}" rx="${rad + 2}" fill="color-mix(in oklab, var(--pl-sky) 7%, transparent)" stroke="var(--pl-sky)" stroke-width="1.5" stroke-dasharray="4 3"/>`; }).join('')}</svg>`);
    card.toggleAttribute('data-still', same);
    const foot = pendHtml();
    if (!same || x.card + foot !== lastCard) { body.innerHTML = x.card + foot; lastCard = x.card + foot; }
    // a note for your agent, about any element: a small button at the end of the head line (owner, 2026-11-20: "i was
    // able to write comment for agent as well that has gone too")
    const headEl = body.querySelector('.xr-head');
    if (headEl && !headEl.querySelector('.xr-noteit')) headEl.insertAdjacentHTML('beforeend', '<button type="button" class="xr-noteit" title="Note for your agent" aria-label="Note for your agent"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 11.5H8l-3 2.5v-2.5H3A1.5 1.5 0 0 1 1.5 10V5A1.5 1.5 0 0 1 3 3.5Z" fill="currentColor"/></svg></button>');
    const where = body.querySelector('.xr-head code:not(.none)');
    if (where && source && where.textContent === source) { where.textContent = tail(source); where.title = source; }
    const head = body.querySelector('.xr-head b');
    head?.querySelector('.xr-many')?.remove();
    const info = infos.get(el);
    const reached = inHand?.el === el && RECIPES[inHand.prop] ? inHand.shade.mates.length : 0;
    if (head && reached > 1) head.insertAdjacentHTML('beforeend', ` <span class="xr-many" data-scope="page">×${reached}</span>`);
    else if (head && !reached && (scopesOf(el).length > 1 || peers(el).length > 1)) head.insertAdjacentHTML('beforeend', ` <span class="xr-many" data-scope="${scope}"${info?.where ? ` title="Written at ${esc(info.where)}"` : ''}>${scope === 'all' ? `everywhere · ${o.component(el)?.uses ?? '?'} uses` : scope === 'page' ? `×${peers(el).length}${info?.where ? ` · ${esc(tail(info.where))}` : ' here'}` : 'just this one'}</span>`);
    for (const ch of card.querySelectorAll('[data-prop]')) {
      ch.toggleAttribute('data-changed', !!changes.get(placeKey(el))?.has(ch.dataset.prop));
      ch.toggleAttribute('data-held', !!held?.chip && held.prop === ch.dataset.prop);
    }
    const first = card.hidden;
    if (first) card.setAttribute('data-fresh', '');
    // beside the element, never on it, the way a tooltip finds its place
    const R = el.getBoundingClientRect(), cs = getComputedStyle(el), mg = (q) => parseFloat(cs.getPropertyValue(`margin-${q}`)) || 0;
    const around = { left: R.left - s.left - mg('left') - 6, top: R.top - s.top - mg('top') - 24, right: R.right - s.left + mg('right') + 28, bottom: R.bottom - s.top + mg('bottom') + 6 };
    const scrolledTo = card.scrollTop;
    card.removeAttribute('data-short'); // measured whole
    const ctx = contextOf(el, o.contextStop ?? watch), Cr = ctx?.getBoundingClientRect();
    const context = Cr && { left: Cr.left - s.left, top: Cr.top - s.top, right: Cr.right - s.left, bottom: Cr.bottom - s.top };
    const room = o.room?.(s) ?? { left: 12, top: 12, right: s.width - 12, bottom: s.height - 12 };
    // the note goes in before the card is measured: put in after, it made the card about 90px taller where it stood,
    // over the bar (U9), and the next placing moved it from under the hand (U12)
    if (el !== saidEl) syncSaid(el);
    foldNow();
    // measured as it will show: a card still hidden measures 0, and the 420 guessed for it was ~140px short of a card
    // with a note, so it ran over the bar (U9)
    const wasHidden = card.hidden;
    if (wasHidden) { card.style.visibility = 'hidden'; card.hidden = false; }
    const size = { w: card.offsetWidth || 292, h: card.offsetHeight || 420 };
    if (wasHidden) { card.hidden = true; card.style.visibility = ''; }
    const at = placeCard(around, size, room, 16, context);
    card.style.transform = `translate(${at.x}px, ${at.y}px)`; cardAt = at;
    card.dataset.side = at.side;
    if (!card.querySelector('.beak')) card.insertAdjacentHTML('afterbegin', '<i class="beak" aria-hidden="true"></i>');
    const beak = card.querySelector('.beak'), mid = { x: (R.left + R.right) / 2 - s.left, y: (R.top + R.bottom) / 2 - s.top };
    const cw = card.offsetWidth, chh = at.maxH ?? card.offsetHeight;
    if (at.side === 'left' || at.side === 'right') { beak.style.top = `${Math.max(14, Math.min(chh - 26, mid.y - at.y - 6))}px`; beak.style.left = ''; }
    else { beak.style.left = `${Math.max(14, Math.min(cw - 26, mid.x - at.x - 6))}px`; beak.style.top = ''; }
    card.toggleAttribute('data-short', !!at.maxH);
    if (at.maxH) { card.style.setProperty('--xr-max', `${at.maxH}px`); card.scrollTop = scrolledTo; }
    // something deliberate (a click, a part held, changes waiting, a note) shows it at once; a pass over the page waits
    const show = ready || !!pinned || !!held || changes.size > 0;
    if (!show) { clearTimeout(restT); restT = setTimeout(() => { ready = true; restAt = ptNow; if (shown?.isConnected && !o.paused?.()) draw(shown); }, REST); }
    if (!!noting || !show) shrink(); else { card.hidden = false; if (card.hasAttribute('data-details')) { readShade(el, SHADOW); readShade(el, MOTION); readShade(el, LAYOUT); } }
    // the value's highlight is measured once the card shows: measured while it was hidden, it sat at the row's start
    if (!card.hidden) thumbAt(0, 0, true);
    if (first && !card.hidden) { card.removeAttribute('data-enter'); void card.offsetWidth; card.setAttribute('data-enter', ''); grow(el); }
    if (first) requestAnimationFrame(() => card.removeAttribute('data-fresh'));
    shown = el; shownKey = o.key(el) ? placeKey(el) : null;
    // the card's first line is the note of the element it is on now, never the one it grew on: the card follows the hand
    // from element to element without closing, and kept the first one's note ("Badge for flavour" on a label that has
    // none). Read once the page's pill has caught up with the pointer (same move, after this draw)
    requestAnimationFrame(() => {
      if (shown !== el || card.hidden) return;
      const h0 = card.offsetHeight; syncSaid(el);
      if (card.offsetHeight !== h0) draw(el); // a note that changed size: placed again, once (the same note keeps)
    });
    cursor();
  };

  // ── ⇧ is the hand: only while it is held do a drag and two fingers change the part pointed at ──
  let shiftDown = false;
  const AXIS = (z) => (!z ? '' : z.side ? (z.side === 'top' || z.side === 'bottom' ? 'ns-resize' : 'ew-resize') : z.prop === 'width' ? 'ew-resize' : z.prop === 'height' ? 'ns-resize' : z.family === 'radius' ? 'nwse-resize' : z.family === 'type' ? 'ns-resize' : z.col ? 'ns-resize' : 'ew-resize');
  function cursor() { (o.cursorOn ?? C).style.cursor = shiftDown && zone && shown ? AXIS(zone) : ''; }
  on(window, 'keydown', (e) => { if (e.key === 'Shift' && !shiftDown) { shiftDown = true; cursor(); } });
  on(window, 'keyup', (e) => { if (e.key === 'Shift') { shiftDown = false; cursor(); } });
  on(window, 'blur', () => { shiftDown = false; cursor(); });

  // ── pointing, and reaching the card ────────────────────────
  const inTri = (p, a, b, c) => { const d = (u, v, w) => (u.x - w.x) * (v.y - w.y) - (v.x - w.x) * (u.y - w.y); const d1 = d(p, a, b), d2 = d(p, b, c), d3 = d(p, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const headingToCard = (pt) => {
    if (!lastOn || card.hidden) return false;
    const c = card.getBoundingClientRect(), near = c.left > lastOn.x ? c.left : c.right;
    return inTri(pt, lastOn, { x: near, y: c.top - 24 }, { x: near, y: c.bottom + 24 });
  };
  // heading for the card: the pointer is inside the shape joining where the hand rested to the whole card (a little
  // wider all round, since a hand wanders as it sets off). That shape is the union of the triangles from the rest point
  // to each of the card's edges, so it holds wherever the card sits: beside, above or below.
  const SLACK = 28;
  const towardCard = (pt) => {
    const c = card.getBoundingClientRect(), l = c.left - SLACK, t = c.top - SLACK, r = c.right + SLACK, b = c.bottom + SLACK;
    if (pt.x >= l && pt.x <= r && pt.y >= t && pt.y <= b) return true;
    const k = [{ x: l, y: t }, { x: r, y: t }, { x: r, y: b }, { x: l, y: b }];
    return k.some((q, i) => inTri(pt, restAt, q, k[(i + 1) % 4]));
  };
  // Where the hand is going (owner, 2026-11-20: "if i am moving towards the card … keep the warmup … if i am going away
  // then understand i might be trying to land somewhere else"): the last few moves, smoothed, against the way to the
  // card's middle. Toward it (or inside the shape that joins the rest point to the card): the card keeps its element as
  // long as the trip takes. Away from it: the element under the hand takes over after a short pause (AWAY), enough that
  // a pass straight through one element on the way to another doesn't stop on it.
  const AWAY = 120;
  let vel = { x: 0, y: 0 }, prevPt = null;
  const heading = (pt) => {
    if (prevPt) vel = { x: vel.x * 0.6 + (pt.x - prevPt.x) * 0.4, y: vel.y * 0.6 + (pt.y - prevPt.y) * 0.4 };
    prevPt = pt;
    if (restAt && towardCard(pt)) return 'toward';
    const c = card.getBoundingClientRect(), to = { x: (c.left + c.right) / 2 - pt.x, y: (c.top + c.bottom) / 2 - pt.y };
    const sp = Math.hypot(vel.x, vel.y), d = Math.hypot(to.x, to.y);
    if (sp < 0.5 || !d) return 'still';
    return (vel.x * to.x + vel.y * to.y) / (sp * d) > 0.5 ? 'toward' : 'away';
  };
  // the thin band X-ray keeps outside an element even at a margin of 0 (so a margin can be added) is not "the part under
  // the hand" when the hand only arrives at the element: the card opened with a cryptic "right 0 0px" row. It counts
  // once the hand is on the element and moves into the band
  const quiet = (z) => (z && z.outside && z.box === 'margin' && !z.n ? null : z);
  const track = (e) => {
    // something else is in hand (a card open in blueprint): the X-ray steps aside first, and takes no pointer
    if (o.paused?.()) { card.removeAttribute('data-reach'); if (shown && !changes.size) draw(null); return; }
    // the card wakes to the pointer when the pointer is over it (with a little margin to reach its edge)
    if (!card.hidden) { const c = card.getBoundingClientRect(), on = e.clientX >= c.left - 4 && e.clientX <= c.right + 4 && e.clientY >= c.top - 4 && e.clientY <= c.bottom + 4; card.toggleAttribute('data-reach', on); if (on) { clearTimeout(waiting); return; } }
    if (held || noting) return;
    // on plumber's own pieces (the bar, its lists, the dock): the X-ray steps aside at once, card and drawing, and
    // takes the pointer back when the hand returns to the page
    if (o.ours?.(e)) { clearTimeout(waiting); if (shown && !pinned && !changes.size) { ready = false; restAt = null; draw(null); } return; }
    const pt = { x: e.clientX, y: e.clientY }; ptNow = pt;
    // Shown, and the hand moves on: the card and its drawing stay with their element until the hand rests on another
    // one (owner, 2026-11-20: going for the card or a ruler's handle crossed other elements, the X-ray jumped to each, and
    // each placed its card elsewhere, so the card flickered and nothing outside the element could be reached). A rest on
    // another element moves the card there; a rest on empty page puts it away. This replaces 2026-11-13's "disappear
    // as I start moving", which is what made the card unreachable.
    if (!card.hidden && ready && !pinned && !changes.size && !ourUI(e)) {
      const there = o.partAt(e), handle = zoneAt(zonesOf(shown).filter((q) => q.outside), pt.x, pt.y), going = heading(pt);
      if (there !== shown && !handle) {
        clearTimeout(waiting);
        // toward the card: hold (a full second, renewed by every move toward it, so a hand that stops short on another
        // element still gets there); still: the usual rest; away: a short pause, then the next element
        waiting = setTimeout(() => {
          if (card.hasAttribute('data-reach') || card.matches(':hover')) return;
          if (!there) { ready = false; restAt = null; draw(null); return; }
          restAt = ptNow; lastOn = ptNow; zone = quiet(zoneAt(zonesOf(there), ptNow.x, ptNow.y)); draw(there); if (zone) hold(there, zone.prop);
        }, going === 'away' ? AWAY : going === 'toward' ? REST * 2 : REST);
        return;
      }
      if (!handle) clearTimeout(waiting);
    }
    if (ourUI(e)) { clearTimeout(waiting); return; }
    const under = o.partAt(e);
    // a ruler's handle, a margin band: the shown element's own, whatever element lies under it on the page
    const outside = shown && !pinned ? zoneAt(zonesOf(shown).filter((q) => q.outside), pt.x, pt.y) : null;
    const el = pinned ?? (outside ? shown : under);
    if (el && el === shown) {
      lastOn = pt; clearTimeout(waiting);
      const z0 = zoneAt(zonesOf(el), pt.x, pt.y), z = card.hidden ? quiet(z0) : z0;
      if (z?.prop === zone?.prop) { clearTimeout(warm); pending = undefined; return; }
      if (z?.prop === pending) return;
      // a warm-up outside the element, where the margin bands and rulers sit side by side; inside, at once
      const take = () => { pending = undefined; zone = z; if (z) hold(el, z.prop); draw(el); };
      clearTimeout(warm); pending = z?.prop ?? null;
      if (z?.outside || zone?.outside) warm = setTimeout(take, 200); else take();
      return;
    }
    if (shown && !pinned && headingToCard(pt)) {
      clearTimeout(waiting);
      waiting = setTimeout(() => { if (card.matches(':hover')) return; lastOn = el ? pt : null; zone = el ? zoneAt(zonesOf(el), pt.x, pt.y) : null; draw(el); if (el && zone) hold(el, zone.prop); }, 450);
      return;
    }
    clearTimeout(waiting);
    lastOn = el ? pt : null;
    zone = el ? quiet(zoneAt(zonesOf(el), pt.x, pt.y)) : null;
    draw(el);
    if (el && zone) hold(el, zone.prop);
  };
  on(E, 'pointermove', track);
  if (E !== window) on(E, 'pointerleave', () => { if (!pinned && !held && !noting && !count()) draw(null); });
  if (o.clicks !== false) on(E, 'click', (e) => {
    if (justDragged) { justDragged = false; e.preventDefault?.(); e.stopPropagation?.(); return; }
    if (noting || ourUI(e)) return;
    const el = o.partAt(e);
    if (o.swallowClicks) { e.preventDefault(); e.stopPropagation(); }
    pinned = pinned || !el ? null : el;
    if (!pinned) { lastOn = null; draw(el); }
  }, true);

  // ── drag: the value follows the hand and snaps to the nearest of your sizes ──
  const drag = (e, el, prop, sign, gain, chip) => {
    e.preventDefault(); e.stopPropagation();
    const fam = familyOf(prop), start = read(el, prop), S = optionsFor(fam, start), linked = linkedOf(prop);
    hold(el, prop);
    const x0 = e.clientX, y0 = e.clientY, at = e.target;
    let moved = false, cur = nearest(S, start);
    held = { prop, chip };
    const move = (m) => {
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 3) return;
      moved = true; justDragged = true;
      const want = Math.max(0, start + sign(m.clientX - x0, m.clientY - y0) * gain), n = nearest(S, want);
      if (n !== cur) { cur = n; for (const q of linked) set(el, q, n.v); draw(el); }
      say(cur, m.clientX, m.clientY);
    };
    const up = () => {
      removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true);
      held = null; live.hidden = true; resync();
      // only the click that ends this drag is swallowed (it comes right after the release), never the next one
      setTimeout(() => { justDragged = false; }, 0);
      if (!moved && chip) openList(el, prop, at); else draw(el);
    };
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true);
  };
  // a keyboard's press on the Shadow row
  life.listen(card, 'click', (e) => { const ch = e.target.closest?.('.xr-pick'); if (ch && !e.detail && shown) { const prop = ch.dataset.prop; holdShade(shown, prop); openShades(shown, body.querySelector(`.xr-pick[data-prop="${prop}"]`)); } });
  const signOf = (z) => {
    const IN = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };
    if (z.side) { const [ux, uy] = IN[z.side], k = z.box === 'margin' ? -1 : 1; return (dx, dy) => k * (dx * ux + dy * uy); }
    if (z.prop === 'width') return (dx) => dx;
    if (z.prop === 'height') return (dx, dy) => dy;
    if (z.family === 'radius') return (dx, dy) => (dx + dy) / 2;
    if (z.family === 'type') return (dx, dy) => -dy / 2;
    return z.col ? (dx, dy) => dy : (dx) => dx;
  };
  on(E, 'pointerdown', (e) => {
    if (!shown || !zone || noting || e.button !== 0 || !e.shiftKey || ourUI(e) || o.paused?.()) return;
    const z = zoneAt(zonesOf(shown), e.clientX, e.clientY) ?? zone, el = shown, x0 = e.clientX, y0 = e.clientY;
    e.preventDefault(); e.stopPropagation();
    const first = (m) => {
      if (Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 2) return;
      removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true);
      drag(e, el, z.prop, signOf(z), 1, false);
    };
    const cancel = () => { removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true); };
    addEventListener('pointermove', first, true); addEventListener('pointerup', cancel, true);
  }, true);
  on(card, 'pointerdown', (e) => {
    if (e.target.closest('.xr-hand')) return;
    const ch = e.target.closest('[data-prop]'); if (!ch || !shown) return;
    if (RECIPES[ch.dataset.prop]) { if (e.button === 0) pressShade(e, shown, ch, ch.dataset.prop); return; }
    drag(e, shown, ch.dataset.prop, (dx) => dx, familyOf(ch.dataset.prop) === 'size' ? 2 : 0.5, true);
  });

  // ── the value in hand: the token picker row at the top of the card ──
  let inHand = null;
  const sidesSaid = (prop) => { const m = prop.match(/^(padding|margin)-(\w+)$/); if (!m) return null; return link === 'all' ? `all ${m[1]}` : link === 'pair' ? `${m[2]} + ${PAIR[m[2]]}` : m[2]; };
  const sizingOf = (el, prop) => { const t = sizing(el, getComputedStyle(el), prop === 'width' ? 'w' : 'h'); return /^Fill/.test(t) ? 'fill' : /^Hug/.test(t) ? 'fit' : 'fixed'; };
  function hold(el, prop) {
    if (inHand && inHand.el === el && inHand.prop === prop) return;
    if (RECIPES[prop]) { if (prop !== LAYOUT) linesOff(); holdShade(el, prop); return; }
    shadeList?.end(); linesOff();
    hand.innerHTML = ''; inHand = null;
    if (!el || !prop) return;
    const sided = sidesSaid(prop) !== null, sized = prop === 'width' || prop === 'height', now = read(el, prop), S = optionsFor(familyOf(prop), now);
    if (!S.length) return;
    const known = infos.get(el);
    scope = known ? (known.scopes.includes('page') ? 'page' : known.scopes[0]) : peers(el).length > 1 ? 'page' : 'one';
    const scopes = scopesOf(el);
    // ask once where this part is written and what else that line draws; the row is made again with the answer
    if (!known && o.scopeInfo) Promise.resolve(o.scopeInfo(el, prop)).then((info) => {
      if (!info || !el.isConnected) return;
      infos.set(el, info);
      if (inHand?.el === el) { const p = inHand.prop; hand.innerHTML = ''; inHand = null; hold(el, p); }
      if (shown === el) { lastCard = ''; draw(el); }
    }, () => {});
    const p = picker(C, {
      name: prop.replace('-', ' '), toy: TOYS[prop.split('-')[0]] ?? TOYS[prop] ?? 'size', options: S, into: hand, keys: 'row', start: S.indexOf(nearest(S, now)),
      mark: () => '', format: (x) => `${x.v}px`,
      apply: (x) => { const qs = linkedOf(prop); if (qs.every((q) => Math.abs(read(el, q) - x.v) < 0.5)) return; for (const q of qs) set(el, q, x.v); if (inHand?.sized) { inHand.sizing = 'fixed'; showSeg(); } draw(el); },
    });
    const segs = [...(scopes.length > 1 ? ['scope'] : []), ...(sided || sized ? ['mode'] : []), 'value'];
    const label = (prop === 'border-radius' ? 'corner' : prop === 'font-size' ? 'text size' : prop);
    p.row.querySelector('.scrub').insertAdjacentHTML('afterend', (segs.includes('scope') ? '<span class="side" data-s="scope"></span>' : '') + `<span class="side" data-s="mode">${label}</span>`);
    hand.insertAdjacentHTML('beforeend', `<div class="say">${segs.includes('scope') ? '<span data-s="scope">where</span>' : ''}${segs.includes('mode') ? `<span data-s="mode">${sided ? 'sides' : 'sizing'}</span>` : ''}<span data-s="value">value</span><span class="how">← → choose · ↕ change</span></div>`);
    p.row.insertAdjacentHTML('afterbegin', '<i class="thumb" aria-hidden="true"></i>');
    inHand = { el, prop, p, S, sided, sized, sizing: sized ? sizingOf(el, prop) : null, scopes, segs, seg: 'value', tx: 0, ty: 0, axis: null, idle: 0 };
    showSeg();
    requestAnimationFrame(() => thumbAt(0, 0, true));
  }
  const showSeg = () => {
    const h = inHand; if (!h) return;
    h.p.row.dataset.seg = h.seg;
    for (const sp of hand.querySelectorAll('.say [data-s]')) sp.toggleAttribute('data-on', sp.dataset.s === h.seg);
    const sc = h.p.row.querySelector('[data-s="scope"]'); if (sc) sc.textContent = scopeSaid(h.el);
    const md = h.p.row.querySelector('[data-s="mode"]');
    if (h.sided) md.textContent = sidesSaid(h.prop); else if (h.sized) md.textContent = h.sizing;
    if (shown && !held) draw(shown);
  };
  const thumbAt = (pull = 0, dir = 0, still = false) => {
    const h = inHand; if (!h) return;
    const row = h.p.row, t = row.querySelector('.thumb');
    // measured in the row's own layout, not on screen: the card grows from the pill with a scale, and a thumb measured
    // mid-grow sat over the label, not the value (U45, 2026-11-20)
    const box1 = (s) => {
      const el = s === 'value' ? row.querySelector('.val') : row.querySelector(`[data-s="${s}"]`);
      let x = 0, n = el;
      for (; n && n !== row; n = n.offsetParent) x += n.offsetLeft;
      if (n !== row) { const r = row.getBoundingClientRect(), b = el.getBoundingClientRect(); return { x: b.left - r.left - 3, w: b.width + 6 }; }
      return { x: x - 3, w: el.offsetWidth + 6 };
    };
    const i = h.segs.indexOf(h.seg), next = h.segs[i + dir];
    const from = box1(h.seg), to = next ? box1(next) : from;
    const k = next ? Math.min(1, Math.max(0, pull)) : 0, lean = next ? 0 : dir * Math.min(6, pull * 18);
    t.style.transition = still ? 'none' : '';
    // inside the row's ring, always: the value reaches the row's end, and its thumb (3px wider on each side) ran past it
    let tx = from.x + (to.x - from.x) * k + lean, tw = from.w + (to.w - from.w) * k;
    const lo = 3, hi = row.clientWidth - 3; if (tx < lo) { tw -= lo - tx; tx = lo; } if (tx + tw > hi) tw = hi - tx;
    t.style.transform = `translateX(${tx.toFixed(1)}px)`; t.style.width = `${Math.max(0, tw).toFixed(1)}px`;
    t.dataset.on = h.seg; t.toggleAttribute('data-pulled', pull !== 0);
  };
  function resync() { if (!inHand || RECIPES[inHand.prop]) return; const i = inHand.S.indexOf(nearest(inHand.S, read(inHand.el, inHand.prop))); if (i !== inHand.p.at()) inHand.p.set(i); }
  // a new scope: the places it takes in get the value; the places it lets go of go back to how they were
  const rescope = (h, next) => {
    const v = h.el.style.getPropertyValue(h.prop) || null, before = new Set(targets(h.el));
    scope = next;
    const after = new Set(targets(h.el)), qs = linkedOf(h.prop);
    for (const t of before) if (!after.has(t) && t !== h.el) for (const q of qs) { const k = placeKey(t), m = changes.get(k); if (m?.has(q)) { const was = m.get(q).before; if (was) t.style.setProperty(q, was); else t.style.removeProperty(q); m.delete(q); if (!m.size) changes.delete(k); } }
    if (v) for (const q of qs) set(h.el, q, h.el.style.getPropertyValue(q) || v);
  };
  // a size's way of sizing: fill its container, fit its content, or a fixed number
  const resize = (h, how) => {
    h.sizing = how;
    const parent = h.el.parentElement, ps = parent && getComputedStyle(parent), main = ps && /flex/.test(ps.display) && (/column/.test(ps.flexDirection) ? h.prop === 'height' : h.prop === 'width');
    if (how === 'fill') { if (main) set(h.el, 'flex', '1 1 0%'); else set(h.el, h.prop, '100%'); }
    else if (how === 'fit') { if (main) set(h.el, 'flex', '0 0 auto'); set(h.el, h.prop, 'fit-content'); }
    else set(h.el, h.prop, Math.round(read(h.el, h.prop)));
  };
  // two fingers: with ⇧ over the element, or on the card's row; left and right choose, up and down change
  on(E, 'wheel', (e) => {
    if (!inHand || !shown || inHand.el !== shown || o.paused?.()) return;
    const onRow = e.composedPath().includes(hand);
    if (!onRow && !(e.shiftKey && (zone || e.composedPath().includes(shown)))) return;
    e.preventDefault(); e.stopPropagation();
    const h = inHand, dx = -(e.deltaMode ? e.deltaX * 16 : e.deltaX), dy = -(e.deltaMode ? e.deltaY * 16 : e.deltaY);
    clearTimeout(h.idle);
    h.idle = setTimeout(() => { h.axis = null; h.ax = h.ay = 0; h.ty = 0; h.switched = false; if (h.tx) { h.tx = 0; thumbAt(0); } }, 200);
    if (!h.axis) { h.ax = (h.ax ?? 0) + dx; h.ay = (h.ay ?? 0) + dy; if (Math.abs(h.ax) + Math.abs(h.ay) < 6) return; h.axis = Math.abs(h.ax) > Math.abs(h.ay) ? 'x' : 'y'; }
    if (h.axis === 'x') {
      if (h.segs.length < 2 || h.switched) return;
      h.tx += dx;
      const dir = Math.sign(h.tx), i = h.segs.indexOf(h.seg), next = h.segs[i + dir];
      if (next && Math.abs(h.tx) >= 44) {
        h.seg = next; h.tx = 0; h.switched = true; showSeg(); thumbAt(0);
        const row = h.p.row;
        row.querySelector('.thumb').animate?.([{ scale: '1.12 0.86' }, { scale: '0.96 1.05', offset: 0.45 }, { scale: '1.01 0.99', offset: 0.75 }, { scale: '1 1' }], { duration: 420, easing: 'ease-out' });
        (h.seg === 'value' ? row.querySelector('.drum') : row.querySelector(`[data-s="${h.seg}"]`))?.animate?.([{ scale: 0.9 }, { scale: 1.06, offset: 0.5 }, { scale: 1 }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      } else thumbAt(next ? 0.36 * (1 - Math.exp(-Math.abs(h.tx) / 22)) : Math.min(1, Math.abs(h.tx) / 60), dir);
      return;
    }
    if (h.axis !== 'y') return;
    h.ty += dy;
    while (Math.abs(h.ty) >= 30) {
      const up = h.ty > 0, step = up ? 1 : -1; h.ty -= Math.sign(h.ty) * 30;
      const bump = (sel) => h.p.row.querySelector(sel)?.animate?.([{ transform: `translateY(${up ? 5 : -5}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      if (h.seg === 'scope') {
        const j = Math.max(0, Math.min(h.scopes.length - 1, h.scopes.indexOf(scope) + step));
        if (h.scopes[j] !== scope) { rescope(h, h.scopes[j]); draw(h.el); showSeg(); bump('[data-s="scope"]'); }
      } else if (h.seg === 'mode' && h.sided) {
        const i = LINKS.indexOf(link), j = Math.max(0, Math.min(2, i + step));
        if (j !== i) { link = LINKS[j]; const v = read(h.el, h.prop); for (const q of linkedOf(h.prop)) if (Math.abs(read(h.el, q) - v) >= 0.5) set(h.el, q, v); draw(h.el); showSeg(); bump('[data-s="mode"]'); }
      } else if (h.seg === 'mode' && h.sized) {
        const j = Math.max(0, Math.min(2, SIZINGS.indexOf(h.sizing) + step));
        if (SIZINGS[j] !== h.sizing) { resize(h, SIZINGS[j]); draw(h.el); showSeg(); resync(); bump('[data-s="mode"]'); }
      } else h.p.set(h.p.at() + step);
    }
  }, { passive: false, capture: true });
  // a click on a number: the list of your sizes
  function openList(el, prop, at) {
    C.querySelector(':scope > .xr-list')?.remove();
    const now = read(el, prop), S = optionsFor(familyOf(prop), now), here = nearest(S, now), s = box(), b = at.getBoundingClientRect();
    const list = document.createElement('div'); list.className = 'xr-list';
    list.innerHTML = S.map((x, i) => `<button type="button" data-i="${i}" class="${x.hard ? 'hard' : ''}" aria-selected="${x === here}">${esc(x.name)}<span>${x.v}</span></button>`).join('');
    list.style.left = `${b.left - s.left}px`; list.style.top = `${b.bottom - s.top + 6}px`;
    C.append(list);
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    list.addEventListener('click', (e) => { const x = S[Number(e.target.closest('[data-i]')?.dataset.i)]; if (!x) return; for (const q of linkedOf(prop)) set(el, q, x.v); list.remove(); draw(el); resync(); });
    const away = (e) => { if (!e.composedPath().includes(list)) { list.remove(); removeEventListener('pointerdown', away, true); } };
    addEventListener('pointerdown', away, true);
  }

  // ── a re-render: the changes find the new elements by place and show on them again ──
  const reapply = () => {
    for (const [k, m] of changes) { const el = elOf(k); if (el) for (const [prop, { value }] of m) if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value); }
    // redrawn only when the element shown was replaced (a live page changes itself all the time; the rest is the same)
    if (shown && !shown.isConnected) { const again = shownKey && elOf(shownKey); if (pinned === shown) pinned = again; shown = null; if (inHand) { inHand = null; hand.innerHTML = ''; } draw(again ?? null); }
  };
  let queued = 0;
  const isPage = o.isPage ?? (() => true);
  const mo = new MutationObserver((list) => { if (changes.size || (shown && !shown.isConnected)) if (list.some((r) => r.type === 'childList' && !C.contains(r.target) && isPage(r))) { clearTimeout(queued); queued = setTimeout(reapply, 0); } });
  mo.observe(watch, { childList: true, subtree: true });
  off.push(() => mo.disconnect());

  // ── Sync, and what came of it, one line per change ─────────
  let results = null, syncing = false;
  const classOf = (prop, value) => {
    if (prop === MOTION || prop === LAYOUT) return value;
    if (prop === SHADOW) return value.match(/^var\(--([\w-]+)/)?.[1] ?? value;
    if (prop === 'flex') return value === '1 1 0%' ? 'flex-1' : 'flex-none';
    if (value === '100%') return `${PREFIX[prop]}-full`;
    if (value === 'fit-content') return `${PREFIX[prop]}-fit`;
    const n = parseFloat(value), t = o.tokenOf(familyOf(prop), n);
    return t ? `${PREFIX[prop]}-${t}` : `${PREFIX[prop]}-[${value}]`;
  };
  function pendHtml() {
    const n = count(), res = results ? resultsHtml() : '';
    markKeys();
    if (!n) return res;
    // ↵ and Esc are the card's only while it owns the screen; with a fix in hand they are the bar's, so the card says none
    const at = reach(), gone = unseen(), keys = !o.paused?.();
    return res + `<div class="xr-pend"><span>${n} change${n > 1 ? 's' : ''}${at > n ? ` · ${at} places` : ''}${gone ? ` · ${gone} not on screen` : ''}</span><span class="sp"></span><button type="button" class="back"${keys ? ' title="Esc"' : ''}>Put back</button><button type="button" class="sync"${syncing ? ' disabled' : ''}>${syncing ? 'Syncing…' : `Sync${keys ? ' <kbd>↵</kbd>' : ''}`}</button></div>`;
  }
  function resultsHtml() {
    const ok = results.filter((r) => r.state === 'ok' || r.state === 'moved').length;
    return `<div class="xr-res"><div class="rh"><b>${ok === results.length ? `Synced ${ok} change${ok > 1 ? 's' : ''}` : `${ok} of ${results.length} synced`}</b><button type="button" class="rx" aria-label="Close">×</button></div>
      ${results.map((r) => `<div class="rr" data-state="${r.state}"><i>${ICON[r.state]}</i><div><b>${esc(r.cls)}</b> on ${esc(r.name)}${r.keys.length > 1 ? ` ×${r.keys.length}` : ''}<span>${esc(r.state === 'failed' ? r.why : r.state === 'undone' ? 'Put back in your code' : `${r.state === 'moved' ? `${r.why} ` : ''}${r.where ?? ''}`)}</span></div>${r.state === 'failed' ? `<button type="button" data-retry="${esc(r.id)}">Retry</button>` : r.state === 'undone' ? '' : `<button type="button" data-undo="${esc(r.id)}">Undo</button>`}</div>`).join('')}</div>`;
  }
  const refresh = () => { lastCard = ''; if (shown) draw(shown); };
  const sync = (only = null) => {
    if (!count() || syncing) return !!count();
    // one change: one property of one part, at one scope, however many places it reaches
    const groups = new Map();
    for (const [k, m] of changes) for (const [prop, c] of m) {
      const part = k.slice(0, k.lastIndexOf('#')), id = `${part}|${prop}|${c.scope}`;
      if (only && !only.includes(id)) continue;
      if (!groups.has(id)) { const el = elOf(k); groups.set(id, { id, part, name: el ? o.name(el)[0] : part, prop, value: c.value, pick: c.pick, scope: c.scope, cls: classOf(prop, c.value), keys: [], befores: [], els: [] }); }
      const g = groups.get(id); g.keys.push(k); g.befores.push(c.before); const el = elOf(k); if (el) g.els.push(el);
    }
    syncing = true; refresh();
    Promise.resolve(o.write([...groups.values()])).catch((error) => [...groups.values()].map((g) => ({ id: g.id, state: 'failed', why: error?.message ?? String(error) }))).then((said) => {
      syncing = false;
      const out = [...groups.values()].map((g) => ({ ...g, ...(said.find((r) => r.id === g.id) ?? { state: 'failed', why: 'No answer for this change.' }) }));
      // the written ones leave the pending list (their inline preview goes: the page now draws them from your code);
      // the failed ones stay pending
      for (const r of out) if (r.state !== 'failed') for (const k of r.keys) { const m = changes.get(k); m?.delete(r.prop); if (m && !m.size) changes.delete(k); if (o.dropPreviewOnWrite) { const el = elOf(k); el?.style.removeProperty(r.prop); } } markKeys();
      // written: what your code says now is read afresh
      if (out.some((r) => r.state !== 'failed')) forget();
      results = [...(results ?? []).filter((r) => !out.some((x) => x.id === r.id)), ...out];
      refresh();
      const firstOk = out.find((r) => r.state !== 'failed'), panel = card.querySelector('.xr-res');
      if (firstOk && panel) { const b = panel.getBoundingClientRect(); burst(o.root, b.left + 24, b.top + 18, { pieces: 18 }); }
    });
    return true;
  };
  const undo = (id) => {
    const r = results?.find((x) => x.id === id); if (!r) return;
    Promise.resolve(o.undo(r)).then(() => { r.state = 'undone'; forget(); refresh(); }, (error) => { r.state = 'failed'; r.why = `Couldn't put it back: ${error?.message ?? error}`; refresh(); });
  };
  const putBack = () => {
    shadeList?.end();
    if (!count()) return false;
    for (const [k, m] of changes) { const el = elOf(k); if (el) for (const [prop, { before }] of m) { if (before) el.style.setProperty(prop, before); else el.style.removeProperty(prop); RECIPES[prop]?.clear?.(el, o); } }
    changes.clear(); markKeys();
    // the row in hand says the value put back, not the one taken away
    if (inHand?.el?.isConnected) { const { el, prop } = inHand; hand.innerHTML = ''; inHand = null; hold(el, prop); }
    refresh();
    return true;
  };
  on(card, 'click', (e) => {
    const t = e.target;
    if (t.closest('.sync')) sync(); else if (t.closest('.back')) putBack();
    else if (t.closest('[data-undo]')) undo(t.closest('[data-undo]').dataset.undo);
    else if (t.closest('[data-retry]')) sync([t.closest('[data-retry]').dataset.retry]);
    else if (t.closest('.rx')) { results = null; refresh(); }
  });

  // ── ↵: a note for your agent ───────────────────────────────
  const startNote = (prefill = '') => {
    const el = shown; if (!el) return;
    pinned = el;
    const [name, source] = o.name(el);
    const note = document.createElement('div');
    note.className = 'xr-note';
    note.innerHTML = `<div class="nh"><i class="toy">${card.querySelector('.xr-head .toy')?.innerHTML ?? ''}</i>Note for your agent</div><code${source ? ` title="${esc(source)}"` : ''}>${esc(name)}${source ? ` · ${esc(tail(source))}` : ''}</code>
      <textarea placeholder="What should change here?" aria-label="Note for your agent about ${esc(name)}"></textarea>
      <div class="nf"><span class="keys"><kbd>⌘</kbd><kbd>↵</kbd>copy for your agent</span><span class="done"><i>✓</i>Copied with its place</span><span><kbd>Esc</kbd></span></div>`;
    note.style.left = `${cardAt.x}px`; note.style.top = `${cardAt.y}px`;
    C.append(note); card.hidden = true;
    const ta = note.querySelector('textarea');
    // asked from a note: what is wrong and what to do, already said; the cursor at the end to add to it
    if (prefill) { ta.value = prefill; queueMicrotask(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }); }
    // while the note is open it is the one thing by the pointer: the page's pill steps aside (the host's data-noting)
    C.getRootNode().host?.setAttribute('data-noting', '');
    const close = () => { note.remove(); noting = null; C.getRootNode().host?.removeAttribute('data-noting'); draw(el); };
    noting = { close };
    draw(el);
    ta.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const said = ta.value.trim(); if (!said) return;
        const text = `${said}\n\nWhere: <${name}> at ${source ?? 'an element with no source line yet'}`;
        try { await navigator.clipboard.writeText(text); } catch { ta.select(); document.execCommand?.('copy'); }
        note.setAttribute('data-done', '');
        const b = note.getBoundingClientRect(); burst(o.root, b.left + 40, b.bottom - 16, { pieces: 16 });
        setTimeout(close, 1400);
      }
    });
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
  };
  // while the X-ray is on, its keys come first, even inside the page's own fields; only its own note and list keep theirs
  // (inside blueprint the host routes them: blueprint's own keys stay blueprint's)
  if (o.keys !== false) on(window, 'keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.composedPath().some((n) => n.classList?.contains('xr-note') || n.classList?.contains('xr-list')) || noting) return;
    if (e.key === 'Enter' && shown) { e.preventDefault(); e.stopPropagation(); if (!sync()) startNote(); }
    else if (e.key === 'Escape' && (count() || pinned || C.querySelector(':scope > .xr-list'))) { e.preventDefault(); e.stopPropagation(); C.querySelector(':scope > .xr-list')?.remove(); if (!putBack() && pinned) { pinned = null; draw(null); } }
  }, true);
  // a scroll or a resize moves what's shown: drawn again once a frame at most
  let frame = 0;
  // a scroll: the card steps out of the way and waits for the page to stop again (it stays while it holds something)
  const scrolled = () => {
    if (shown && ready && !pinned && !held && !changes.size && !noting && !card.matches(':hover')) { ready = false; shrink(); card.removeAttribute('data-reach'); }
    follow();
  };
  const follow = () => { if (frame || !shown) return; frame = requestAnimationFrame(() => { frame = 0; if (shown?.isConnected) draw(shown); }); };
  on(window, 'resize', follow);
  on(window, 'scroll', scrolled, true);

  restore();
  return {
    get pending() { return count(); },
    get pinned() { return !!pinned; },
    // the list of shadows is the top layer while it is open: Esc closes it and nothing else, Enter takes the one in focus
    get listing() { return !!shadeList; },
    listKey(key) {
      const at = C.getRootNode().activeElement, val = RECIPES[inHand?.prop] ? inHand.p.row.querySelector('.val') : null;
      if (key === 'Enter' && at?.closest?.('.xr-list.shades')) { at.click(); return; }
      shadeList?.end();
      val?.focus({ preventScroll: true });
    },
    // a note for your agent about the element the card is on, any element, not only one with an issue
    note() { if (shown && !noting) startNote(); },
    // Alt + scroll walked to another level (the parent, or back down): the card and its drawing follow, not pinned
    peek(el) { if (!el?.isConnected || o.paused?.()) return; lastOn = null; zone = null; ready = true; draw(el); },
    // what the card keeps clear of moved: placed again, once a frame at most
    follow,
    // an element chosen elsewhere (blueprint's list, or a click blueprint took): shown and held
    hold(el) { if (!el?.isConnected || o.paused?.()) return; pinned = el; lastOn = null; readNotes(el); const r = el.getBoundingClientRect(); zone = null; draw(el); void r; },
    // let go (a fix put down, a selection cleared): what was drawn for it goes too, unless changes wait on it
    release() { const was = pinned; pinned = null; if (was && shown === was && !changes.size && !held) { ready = false; draw(null); } },
    // something else took the screen (a card opened): out of the way at once
    hide() { card.removeAttribute('data-reach'); pinned = null; if (!changes.size) draw(null); else refresh(); markKeys(); },
    // results from before a reload (a write the dev server reloaded the page for), said again
    showResults(list) { results = list.map((r) => ({ keys: [], els: [], befores: [], ...r })); lastCard = ''; card.hidden = false; if (shown) draw(shown); else { body.innerHTML = resultsHtml(); lastCard = ''; const s = box(); card.style.transform = `translate(${Math.max(12, s.width - (card.offsetWidth || 292) - 24)}px, 24px)`; } },
    get shown() { return shown; },
    putBack, sync,
    destroy() { ending = true; putBack(); o.root?.host?.removeAttribute?.('data-xr-keys'); linesOff(); life.end(); for (const f of off) f(); clearTimeout(waiting); clearTimeout(warm); clearTimeout(queued); layer.remove(); card.remove(); live.remove(); C.querySelector(':scope > .xr-list')?.remove(); C.querySelector(':scope > .xr-note')?.remove(); },
  };
}

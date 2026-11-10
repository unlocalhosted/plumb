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

// the options in order of size; the hard-coded value sits among them where it falls, so you can drag back to it
const RADIUS = [{ name: 'none', v: 0 }, { name: '5px', v: 5, hard: true }, { name: 'tag', v: 6 }, { name: 'control', v: 8 }, { name: 'card', v: 12 }, { name: 'full', v: 999 }];
const PADDING = [{ name: 'xs', v: 4 }, { name: 'sm', v: 8 }, { name: 'md', v: 12 }, { name: '14px', v: 14, hard: true }, { name: 'lg', v: 16 }, { name: 'xl', v: 24 }];
const FONT = [{ name: 'sm', v: 14 }, { name: 'base', v: 16 }, { name: 'lg', v: 18 }, { name: '19px', v: 19, hard: true }, { name: 'xl', v: 20 }, { name: '2xl', v: 24 }, { name: '3xl', v: 30 }];
const GAP = [{ name: 'xs', v: 4 }, { name: 'sm', v: 8 }, { name: 'md', v: 12 }, { name: '13px', v: 13, hard: true }, { name: 'lg', v: 16 }, { name: 'xl', v: 24 }];

export function mount(host, root, css) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const px = (v) => `${v}px`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
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

    /* ── the row: what a visual editor shows for this property, one line, beside the element ── */
    .row { position: absolute; z-index: 4; display: flex; align-items: center; gap: 2px; height: 34px; padding: 0 4px 0 2px; border-radius: 11px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); font: 500 13px/1 var(--pl-sans); white-space: nowrap; }
    .row .scrub { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: ew-resize; touch-action: none; }
    .row .scrub:hover { background: var(--pl-paper-2); }
    .row .scrub svg { display: block; width: 18px; height: 18px; }
    .row .val { all: unset; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; border-radius: 8px; cursor: pointer; }
    .row .val:hover, .row .val[aria-expanded="true"] { background: var(--pl-paper-2); }
    .row .val:focus-visible { outline: 2px solid var(--pl-sky); }
    .row .val b { font: 600 13px/1 var(--pl-sans); color: var(--pl-ink); }
    .row .val span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .row .val.hard b { color: var(--pl-coral); }
    .row .val .car { width: 8px; height: 8px; margin-left: 2px; border-right: 1.5px solid var(--pl-ink-3); border-bottom: 1.5px solid var(--pl-ink-3); rotate: 45deg; translate: 0 -2px; }
    .row .ok { all: unset; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--pl-ink-3); cursor: pointer; }
    .row .ok:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
    /* the tick answers at once: on one of your tokens it turns green (pale, a pop each time a new token lands);
       written, it is solid green. On the hard-coded value it stays grey: nothing to write */
    .row .ok { transition: background-color 180ms var(--pl-ease-out), color 180ms var(--pl-ease-out); }
    .row .ok[data-ready] { background: color-mix(in oklab, var(--pl-mint) 22%, transparent); color: var(--pl-mint-ink); }
    .row .ok.pop { animation: okpop 320ms cubic-bezier(.34, 1.56, .64, 1); }
    @keyframes okpop { 0% { scale: .8; } 60% { scale: 1.12; } 100% { scale: 1; } }
    .row .ok svg { width: 16px; height: 16px; display: block; }
    .row.written .ok { background: var(--pl-mint); color: var(--pl-mint-on); }

    /* ── the list: your tokens by name, each drawn as the corner it makes ── */
    .list { position: absolute; z-index: 5; min-width: 180px; padding: 5px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
    .list[hidden] { display: none; }
    .list button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 8px; border-radius: 8px; cursor: pointer; font: 500 13px/1 var(--pl-sans); }
    .list button:hover, .list button[aria-selected="true"] { background: var(--pl-paper-2); }
    .list button span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .list .c { width: 16px; height: 16px; border-top: 2px solid var(--pl-ink-2); border-left: 2px solid var(--pl-ink-2); }
    .list .hard { color: var(--pl-coral); }
    .list .hard .c { border-color: var(--pl-coral); border-style: dashed; }
    .list hr { margin: 4px 6px; border: 0; border-top: 1px solid var(--pl-rule); }


    /* ── the value in the field: one option at a time. When it changes, the new one comes in and the old one goes
       out, in the direction you are moving: going up, the new one rises from below and the old one leaves over
       the top; going down, the reverse. Short, eased, a little blur on the way, nothing else on screen ── */
    .row .val { position: relative; padding: 0 6px 0 8px; }
    .drum { position: relative; display: block; width: 112px; height: 28px; overflow: hidden; }
    .slot { position: absolute; inset: 0; display: flex; align-items: center; gap: 6px; will-change: transform, opacity, filter; }
    .slot b { font: 600 13px/1 var(--pl-sans); color: var(--pl-ink); }
    .slot span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .slot.hard b, .slot.hard span { color: var(--pl-coral); }
    .row.dragging .val { cursor: ns-resize; }
    :host(.grabbing) { cursor: ns-resize; }
    /* ── the bar in the field, shown only while you drag: where you are among the options, like a slider. A soft fill grows from the left inside
       the field with a grip at its end, and a dot for each option along the bottom (coral for your hard-coded one).
       It follows the pointer while you drag, gives a little past either end, and springs onto the option when you
       let go ── */
    .row .val { overflow: visible; }
    /* only while dragging: it fades in as the drag starts, and out once the fill has sprung onto the option */
    .track { position: absolute; inset: 2px; border-radius: 7px; pointer-events: none; opacity: 0; transition: opacity 220ms var(--pl-ease-out) 380ms; }
    .row.dragging .track { opacity: 1; transition: opacity 120ms var(--pl-ease-out) 0ms; }
    .track .fill { position: absolute; left: 0; top: 0; bottom: 0; width: calc(12px + var(--f, 0) * (100% - 12px)); border-radius: 7px; background: color-mix(in oklab, var(--pl-sky) 14%, transparent);
      transition: width 420ms cubic-bezier(.34, 1.56, .64, 1), background-color 200ms var(--pl-ease-out); }
    .track .fill::after { content: ''; position: absolute; right: 3px; top: 50%; width: 2.5px; height: 12px; translate: 0 -50%; border-radius: 2px; background: var(--pl-sky); opacity: .75; transition: height 200ms var(--pl-spring-pop), opacity 200ms; }
    .track .dots { position: absolute; left: 8px; right: 6px; bottom: 2px; height: 2px; }
    .track .dots i { position: absolute; top: 0; width: 2px; height: 2px; margin-left: -1px; border-radius: 50%; background: var(--pl-ink-3); opacity: .35; transition: opacity 200ms, scale 240ms var(--pl-spring-pop); }
    .track .dots i.hard { background: var(--pl-coral); opacity: .8; }
    .track .dots i.here { opacity: .9; scale: 1.6; }
    .val.on-hard .fill { background: color-mix(in oklab, var(--pl-coral) 12%, transparent); }
    .val.on-hard .fill::after { background: var(--pl-coral); }
    .row.dragging .fill { transition: width 70ms linear, background-color 200ms; background: color-mix(in oklab, var(--pl-sky) 22%, transparent); }
    .row.dragging .val.on-hard .fill { background: color-mix(in oklab, var(--pl-coral) 18%, transparent); }
    .row.dragging .fill::after { height: 16px; opacity: 1; }
    .row .val:hover { background: none; }
    .drum, .car { position: relative; }

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
    .alert { position: relative; display: flex; gap: 12px; width: 340px; box-sizing: border-box; padding: var(--p); border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); border: 1px solid #fecdca; font: 14px/20px system-ui, -apple-system, sans-serif; color: #101828; }
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
    .list .aa { width: 22px; text-align: center; font-family: system-ui, sans-serif; font-weight: 600; line-height: 1; color: var(--pl-ink-2); }
    .list .hard .aa { color: var(--pl-coral); }
    .hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: var(--pl-ink-3); }
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
    <p>The alert has a hard-coded 14px of padding. The padding itself is drawn in its pattern on all four sides: drag any side inward to make it bigger, outward to make it smaller. The value and the list work as before.</p>
    <div class="stage" tabindex="0">
      <div class="alert"><i class="ico">!</i><div><b>Payment failed</b><span>Your card was declined. Update your billing details to keep your plan.</span><br><a href="#" tabindex="-1" onclick="return false">Update billing</a></div></div>
      <i class="padframe" role="presentation"></i>
      ${['top', 'right', 'bottom', 'left'].map((side) => `<i class="padband" data-side="${side}" role="presentation"></i>`).join('')}
      <p class="hint">drag a side of the padding or the value · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>
  <section class="scene" id="font">
    <h2>Font size</h2>
    <p>The article’s title is a hard-coded 19px. The text itself is the handle: press on the title and drag up to make it bigger, down to make it smaller. Two lines at the top of its capitals and at its baseline say it is type. The value and the list work as before.</p>
    <div class="stage" tabindex="0">
      <div class="post"><small>Design systems</small><h3>Why your spacing drifts</h3><p>Six hard-coded values in one card, and how a theme keeps them in line.</p></div>
      <i class="typelines" role="presentation"></i>
      <p class="hint">drag the title or the value · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>`;

  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const TICK = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ── one picker: the row beside the element (the property's icon, the value that rolls, the tick), its list, drag
  // mode and the keys. A property brings: its options, its icon, the mark each option gets in the list, what an
  // option does to the element, where the row sits, and the element's own handles ──
  function picker(stage, { name, toy, options: S, mark, apply, place, handles = [] }) {
    const last = S.length - 1, HARD = S.findIndex((o) => o.hard);
    stage.insertAdjacentHTML('beforeend', `
      <div class="row" role="group" aria-label="${name}">
        <span class="scrub" title="Drag to change">${toyOf(toy)}</span>
        <button type="button" class="val" aria-haspopup="listbox" aria-expanded="false"><span class="track" aria-hidden="true"><i class="fill"></i><span class="dots"></span></span><span class="drum"></span><i class="car"></i></button>
        <button type="button" class="ok" aria-label="Write it">${TICK}</button>
      </div>
      <div class="list" role="listbox" aria-label="Your ${name.toLowerCase()} tokens" hidden></div>`);
    const row = stage.querySelector('.row'), val = row.querySelector('.val'), ok = row.querySelector('.ok'), list = stage.querySelector('.list');
    const drum = row.querySelector('.drum'), scrub = row.querySelector('.scrub');
    let at = HARD, written = false;
    const layout = () => place(row, list, S[at]);

    // the field: the option in hand. A change rolls it, in the direction of travel
    const slotOf = (o) => { const el = document.createElement('span'); el.className = `slot${o.hard ? ' hard' : ''}`; el.innerHTML = `<b>${o.name}</b><span>${o.hard ? 'hard-coded' : px(o.v)}</span>`; return el; };
    const roll = (from, to) => {
      const dir = Math.sign(to - from) || 1, next = slotOf(S[to]);
      for (const old of drum.querySelectorAll('.slot:not(.gone)')) {
        old.classList.add('gone');
        if (still) { old.remove(); continue; }
        old.animate([{ transform: old.style.transform || 'translateY(0)', opacity: 1, filter: 'blur(0)' }, { transform: `translateY(${-dir * 16}px)`, opacity: 0, filter: 'blur(3px)' }], { duration: 200, easing: EASE, fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
      }
      drum.append(next);
      if (!still) next.animate([{ transform: `translateY(${dir * 16}px)`, opacity: 0, filter: 'blur(3px)' }, { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' }], { duration: 260, easing: EASE });
    };
    // past either end: the one in the field leans a little the way you are pulling, and comes back when you let go
    const lean = (over) => { const el = drum.querySelector('.slot:not(.gone)'); if (el) el.style.transform = over ? `translateY(${(-Math.sign(over) * Math.min(5, Math.abs(over) * 7)).toFixed(1)}px)` : ''; };
    // the bar while dragging: f is where you are, 0 at the smallest option and 1 at the largest
    const fill = (f) => val.style.setProperty('--f', f.toFixed(4));
    val.querySelector('.dots').innerHTML = S.map((o, i) => `<i class="${o.hard ? 'hard' : ''}" style="left:${(i / last) * 100}%"></i>`).join('');
    const dots = [...val.querySelectorAll('.dots i')];
    const draw = () => {
      const o = S[at], token = !o.hard;
      apply(o, { token, written });
      if (token && !written) ok.setAttribute('data-ready', ''); else ok.removeAttribute('data-ready');
      if (token && !still) { ok.classList.remove('pop'); void ok.offsetWidth; ok.classList.add('pop'); }
      list.innerHTML = S.map((t, i) => `<button type="button" role="option" class="${t.hard ? 'hard' : ''}" data-at="${i}" aria-selected="${at === i}">${mark(t)}${t.name}<span>${t.hard ? 'hard-coded' : px(t.v)}</span></button>`).join('');
      val.classList.toggle('on-hard', !!o.hard);
      dots.forEach((d, i) => d.classList.toggle('here', i === at));
      if (!row.classList.contains('dragging')) fill(at / last);
      val.setAttribute('aria-label', `${name}: ${o.hard ? `${o.name}, hard-coded` : `${o.name}, ${px(o.v)}`}`);
      requestAnimationFrame(layout);
    };
    // a new option in hand: the element takes it, and it rolls into the field
    const land = (n) => { if (n === at) return; const from = at; at = n; draw(); roll(from, n); };
    const go = (n) => { if (written) return; land(Math.max(0, Math.min(last, n))); };
    const write = () => { if (written || S[at].hard) return; written = true; row.classList.add('written'); list.hidden = true; draw(); };
    const putBack = () => { written = false; row.classList.remove('written'); list.hidden = true; draw(); go(HARD); };

    // ── drag mode: press and move, anywhere on the screen. Up (or right) is bigger; each option rolls into the
    // field as you pass it. Past either end the one in the field leans a little and comes back when you let go ──
    const drag = (el, e, perPx, done) => {
      if (written) return;
      try { el.setPointerCapture(e.pointerId); } catch {}
      const x0 = e.clientX, y0 = e.clientY, from = at;
      let moved = false;
      const move = (m) => {
        if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 4) return;
        if (!moved) { moved = true; list.hidden = true; val.setAttribute('aria-expanded', 'false'); row.classList.add('dragging'); host.classList.add('grabbing'); }
        const raw = from + perPx(m.clientX - x0, m.clientY - y0);
        const over = raw < -0.5 ? raw + 0.5 : raw > last + 0.5 ? raw - last - 0.5 : 0;
        land(Math.max(0, Math.min(last, Math.round(raw))));
        lean(over);
        fill((Math.max(-0.6, Math.min(last + 0.6, raw < 0 ? raw * 0.3 : raw > last ? last + (raw - last) * 0.3 : raw))) / last);
      };
      const up = () => {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        host.classList.remove('grabbing'); row.classList.remove('dragging');
        fill(at / last); done?.();
        if (!moved) { if (el === val) { list.hidden = !list.hidden; val.setAttribute('aria-expanded', String(!list.hidden)); } return; }
        const cur = drum.querySelector('.slot:not(.gone)');
        if (cur && cur.style.transform) { cur.animate([{ transform: cur.style.transform }, { transform: 'translateY(0)' }], { duration: still ? 0 : 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }); cur.style.transform = ''; }
        requestAnimationFrame(layout);
      };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    };
    const STEP = 26;
    val.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); drag(val, e, (dx, dy) => (dx - dy) / STEP); } });
    scrub.addEventListener('pointerdown', (e) => { e.preventDefault(); drag(scrub, e, (dx, dy) => (dx - dy) / STEP); });
    for (const h of handles) h.el.addEventListener('pointerdown', (e) => { e.preventDefault(); h.el.classList.add('dragging'); drag(h.el, e, h.perPx, () => h.el.classList.remove('dragging')); });
    // a keyboard press on the value still opens the list
    val.addEventListener('click', (e) => { if (e.detail === 0 && !written) { list.hidden = !list.hidden; val.setAttribute('aria-expanded', String(!list.hidden)); } });
    list.addEventListener('click', (e) => { const o = e.target.closest('[data-at]'); if (!o) return; go(Number(o.dataset.at)); list.hidden = true; val.setAttribute('aria-expanded', 'false'); });
    ok.addEventListener('click', () => (written ? putBack() : write()));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); go(at + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); go(at - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); write(); }
      else if (e.key === 'Escape') { e.preventDefault(); putBack(); }
    });
    new ResizeObserver(layout).observe(stage);
    drum.append(slotOf(S[at])); draw();
    return { layout };
  }
  const rel = (stage, el) => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect(); return { left: b.left - s.left, top: b.top - s.top, right: b.right - s.left, bottom: b.bottom - s.top, width: b.width, height: b.height }; };

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

  // ── padding: the alert, with each side of its padding as a handle ──
  {
    const stage = root.querySelector('#padding .stage'), el = stage.querySelector('.alert'), frame = stage.querySelector('.padframe');
    const bands = [...stage.querySelectorAll('.padband')];
    // dragging a side inward makes the padding bigger
    const inward = { top: (dx, dy) => dy, bottom: (dx, dy) => -dy, left: (dx) => dx, right: (dx) => -dx };
    picker(stage, {
      name: 'Padding', toy: 'padding', options: PADDING,
      mark: (t) => `<i class="pd" style="--ip:${Math.min(5, Math.round(t.v / 4))}px"></i>`,
      apply: (o, { token, written }) => { el.style.setProperty('--p', `${o.v}px`); frame.classList.toggle('on-token', token); frame.classList.toggle('written', written); },
      place: (row, list) => {
        const r = rel(stage, el), p = parseFloat(getComputedStyle(el).paddingTop) || 0, b = 1;
        frame.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
        const box = { top: [r.left + b, r.top + b, r.width - 2 * b, p], bottom: [r.left + b, r.bottom - b - p, r.width - 2 * b, p], left: [r.left + b, r.top + b + p, p, r.height - 2 * b - 2 * p], right: [r.right - b - p, r.top + b + p, p, r.height - 2 * b - 2 * p] };
        for (const band of bands) { const [x, y, w, h] = box[band.dataset.side]; band.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`; }
        row.style.left = `${r.right + 14}px`; row.style.top = `${r.top + 12}px`;
        list.style.left = row.style.left; list.style.top = `${r.top + 51}px`;
      },
      handles: bands.map((band) => ({ el: band, perPx: (dx, dy) => inward[band.dataset.side](dx, dy) / 12 })),
    });
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
      handles: [{ el: title, perPx: (dx, dy) => -dy / 14 }],
    });
    // the title changes width as it grows: keep the lines and the row on it
    new ResizeObserver(() => fp.layout()).observe(title);
    title.addEventListener('pointerdown', () => lines.classList.add('dragging'));
    title.addEventListener('pointerup', () => lines.classList.remove('dragging'));
  }
}

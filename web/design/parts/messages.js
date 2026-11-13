// The design site's page for messages: what Plumber says after it writes to your code. Two pieces, both the overlay's
// own (history.js HISTORY_CSS, with its markup and its words from words.js FIX and TIMELINE): the toast by the dock
// after a write, with Undo, and the history strip the dock grows into. Here they stand on the page instead of
// floating in a corner; nothing is written anywhere.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { HISTORY_CSS, HISTORY_ICON } from '../../../overlay/src/history-style.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button as b } from '../../../overlay/src/kit.js';
import { FIX, TIMELINE as T } from '../../../overlay/src/words.js';

const X = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
const HOLD = 6000; // how long a toast stays (history.js)
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const TICK = svg('<path d="M5.5 12.6l4.2 4.2 8.800-10" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>');
const BACK = svg('<path d="M9.5 5 5 9.500 9.500 14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.500h8a5 5 0 0 1 0 10H11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>');
const BANG = svg('<path d="M12 5.500v7.500" fill="none" stroke="currentColor" stroke-width="3.600" stroke-linecap="round"/><circle cx="12" cy="18.200" r="2.100" fill="currentColor"/>');
const UNDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6 5 10.500 9.500 15" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.500h8a5.500 5.500 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"/></svg>';
const c = (name) => `<code>${name}</code>`;

export function mount(host, root, css) {
  // today's toast (history.js): a white card, the sentence, a sky word
  const toast = (text, { undo = false, kind = '' } = {}) => `<div class="wt pl-card" data-on${kind ? ` data-kind="${kind}"` : ''}><span class="what">${text}</span>${undo ? `<button type="button" class="undo" tabindex="-1">${FIX.undo}</button>` : ''}</div>`;

  // the toast as a toy. Its hue says what happened: mint, it is on your tokens now; butter, your own value stays or
  // is back; coral, it went wrong; paper, still working. Its disc carries the one mark; the bar under it is its time
  const DISC = { done: TICK, yours: BACK, wrong: BANG, busy: `<span class="turn">${toyOf('loading')}</span>` };
  const toy = (kind, text, { undo = false, bar = true, still = false } = {}) => `<div class="mt${still ? ' still' : ''}" data-kind="${kind}"><i class="disc">${DISC[kind]}</i><span class="say">${text}</span>${undo ? b(FIX.undo, { cls: 'sm quiet', icon: UNDO, attrs: `data-undo${still ? ' tabindex="-1"' : ''}` }) : ''}${bar && kind !== 'busy' ? '<span class="bar"><i></i></span>' : ''}</div>`;

  // what a write can say, each with the product's own words: [plain, with names set as code, the toy's kind]
  const SAYS = {
    changed: [FIX.changed('gap-[13px]', 'gap-3', 3), FIX.changed(c('gap-[13px]'), c('gap-3'), 3), 'done'],
    added: [FIX.added('--spacing-gutter', 'src/theme.css'), FIX.added(c('--spacing-gutter'), 'src/theme.css'), 'done'],
    kept: [FIX.kept(3), FIX.kept(3), 'yours'],
    failed: [FIX.changedSince, FIX.changedSince, 'wrong'],
  };
  const KINDS = [
    ['Working', 'Paper, the dots turning. No bar and no button: there is nothing to wait out or take back yet.', toy('busy', FIX.writing, { still: true })],
    ['On your tokens', 'Mint, as everything on your scale is. The tick pops; the names are your code’s, set as code.', toy('done', SAYS.changed[1], { undo: true, still: true })],
    ['Your own value', 'Butter, as a value typed by hand is: kept as it is, or back after an Undo.', toy('yours', FIX.undone, { still: true })],
    ['It went wrong', 'Coral, the only place coral appears. As many lines as it needs: what happened, what to do.', toy('wrong', FIX.changedSince, { still: true })],
  ];

  // a history, oldest first: steps of changes, each change in one of the states a tick can have
  const STEPS = [
    ['Spacing', [['gap-[13px]', 'gap-3', 'live'], ['p-[18px]', 'p-4', 'live'], ['mt-[7px]', 'mt-2', 'changed']]],
    ['Card.jsx', [['text-[28px]', 'text-display', 'undone']]],
    [T.undoStepName, [['text-display', 'text-[28px]', 'live', true]]],
    ['Colour', [['bg-[#1b1b1f]', 'bg-primary', 'live'], ['text-[#5b5b66]', 'text-muted', 'live'], ['border-[#e4e4e8]', 'border-default', 'live']]],
  ];
  const FLAT = STEPS.flatMap(([, cs], s) => cs.map(([from, to, state, undoes]) => ({ from, to, state, undoes, s })));
  let n = 0;
  const strip = `<span class="tt-glyph" aria-hidden="true">${HISTORY_ICON}</span><div class="tt-track" role="slider" tabindex="0" aria-label="${T.slider}"><div class="tt-steps">${STEPS.map(([name, cs]) => `<div class="tt-seg"><span class="tt-name">${name}</span><div class="tt-ticks">${cs.map(([, , state, undoes]) => `<span class="tt-tick" data-i="${n++}" data-state="${state}"${undoes ? ' data-undo' : ''}></span>`).join('')}</div></div>`).join('')}<span class="tt-head" aria-hidden="true"></span></div></div>`
    + `<span class="tt-now" aria-hidden="true">${T.now}</span><div class="tt-pill" aria-hidden="true" hidden></div>`
    + `<div class="tt-acts"><button type="button" data-act="change">${T.undoChange}<kbd>⌫</kbd></button><button type="button" data-act="step">${T.undoStep}<kbd>⇧⌫</kbd></button></div><button type="button" class="tt-x" aria-label="${T.close}" tabindex="-1">${X}</button>`;

  // a tick as a toy: a peg standing on a rail. Its hue and its pose say its state; nothing is an outline or a hairline
  const HOOK = '<svg viewBox="0 0 14 22" aria-hidden="true"><path d="M11 19V8a4 4 0 0 0-8 0v2.500" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';
  const peg = (kind) => `<i class="pg" data-kind="${kind}">${kind === 'undo' ? HOOK : ''}</i>`;
  const rail = (kinds, cls = '') => `<span class="rail ${cls}">${kinds.map(peg).join('')}</span>`;
  const TICKS = [
    ['A change', 'A mint peg, standing: it is in your code now, on your tokens. It can be undone.', 'live'],
    ['Undone', 'Pushed down and pale, as what is not there is. Still in the record.', 'undone'],
    ['Edited by hand since', 'Butter, as a value typed by hand is. It can’t be undone alone.', 'hand'],
    ['An undo', 'A peg that turns back on itself: taking something back is a change too.', 'undo'],
    ['Pointed at', 'It comes up to meet you, under a pink knob: pink is what is current.', 'at'],
    ['Says no', 'One small shake in coral, then it is itself again. The words say why.', 'no'],
  ];
  const QUIET = [
    ['Reading', 'Six ghost ticks breathe while the history is read.', `<span class="tt-glyph">${HISTORY_ICON}</span><div class="tt-track"><div class="tt-steps"><div class="tt-seg"><span class="tt-name">&nbsp;</span><div class="tt-ticks">${'<span class="tt-tick ghost"></span>'.repeat(6)}</div></div></div></div>`],
    ['Nothing yet', 'One line that says what will show up here.', `<span class="tt-glyph">${HISTORY_ICON}</span><span class="tt-say">${T.empty}</span>`],
    ['Can’t read it', 'One line: what failed, and what to do.', `<span class="tt-glyph">${HISTORY_ICON}</span><span class="tt-say">${T.error}</span>`],
  ];

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${HISTORY_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .panel { margin-top: 16px; overflow: hidden; }
    .cap { padding: 16px 18px 18px; display: grid; gap: 4px; align-content: start; }
    .cap h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .cap p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }

    /* the pieces stand on the page here; in the product they are fixed to the dock's corner */
    .wt, .tt { position: relative; inset: auto; }
    .tt { width: 100%; max-width: 760px; }
    .stage { position: relative; display: grid; place-items: center; padding: 36px 24px; background: var(--pl-bg-inset); }

    /* ── the toast as a toy (proposed; would replace .wt) ─────────────────────────────────────────────────────
       one body in the hue of what happened, lit from above, on a shadow of its own colour. It is not a button, so it
       has no side to press down onto. A white disc carries the one mark; the bar under it is the time it has left */
    .mt { --h: var(--pl-mint); --f: var(--pl-mint-block); --i: var(--pl-mint-block-on); --s: var(--pl-mint-soft);
      position: relative; display: inline-flex; align-items: center; gap: 10px; max-width: min(460px, 100%); box-sizing: border-box; min-height: 44px; padding: 7px 8px 7px 9px; border-radius: 22px;
      background: linear-gradient(180deg, color-mix(in oklab, var(--f) 88%, #fff), var(--f)); color: var(--i); font: 700 14px/18px var(--pl-sans); text-align: left;
      box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 45%, transparent), inset 0 -2px 0 0 color-mix(in oklab, #000 12%, transparent),
        0 16px 22px -14px color-mix(in oklab, var(--f) 75%, transparent), 0 3px 5px -2px color-mix(in oklab, var(--f) 38%, transparent); }
    .mt[data-kind="yours"] { --h: var(--pl-butter-line); --f: var(--pl-butter); --i: var(--pl-butter-on); --s: var(--pl-butter-soft); }
    :host([data-scheme="dark"]) .mt[data-kind="yours"] { --h: var(--pl-butter); --f: var(--pl-butter-soft); --i: #fff; --s: color-mix(in oklab, var(--pl-butter) 25%, transparent); }
    .mt[data-kind="wrong"] { --h: var(--pl-coral); --f: var(--pl-coral-block); --i: var(--pl-coral-block-on); --s: var(--pl-coral-soft); }
    .mt[data-kind="busy"] { --h: var(--pl-ink-2); --f: var(--pl-paper); --i: var(--pl-ink); font-weight: 600; box-shadow: inset 0 0 0 1.5px var(--pl-border-default), 0 14px 20px -14px rgb(0 0 0 / .3); }
    .mt .disc { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--pl-cut); color: var(--h);
      box-shadow: 0 1.5px 0 0 color-mix(in oklab, #000 18%, transparent); }
    .mt[data-kind="busy"] .disc { background: none; box-shadow: none; }
    .mt .disc svg { display: block; width: 16px; height: 16px; }
    .mt .turn { display: block; animation: mt-turn 900ms steps(8) infinite; } .mt .turn svg { width: 22px; height: 22px; }
    .mt .say { min-width: 0; padding-right: 6px; }
    .mt .say code { font: 600 12px/1 var(--pl-mono); padding: 2px 5px; border-radius: 6px; background: color-mix(in oklab, var(--i) 20%, transparent); white-space: nowrap; }
    .mt .tb { flex: none; }
    .mt .bar { position: absolute; left: 24px; right: 24px; top: calc(100% + 7px); height: 4px; border-radius: 2px; background: var(--s); overflow: hidden; }
    .mt .bar i { display: block; height: 100%; border-radius: 2px; background: var(--h); transform-origin: left; animation: mt-time ${HOLD}ms linear both; }
    .mt:hover .bar i, .mt:focus-within .bar i { animation-play-state: paused; }
    .mt.still .bar i { animation: none; scale: .6 1; }
    /* it arrives from the dock, a little small, and settles; the mark pops a beat later; it leaves by dropping */
    .mt.in { animation: mt-in 420ms var(--pl-spring-pop) both; }
    .mt.in .disc svg { animation: mt-mark 380ms 120ms var(--pl-spring-pop) both; }
    .mt.out { animation: mt-out 180ms var(--pl-ease-out) both; pointer-events: none; }
    @keyframes mt-in { from { opacity: 0; translate: 0 14px; scale: .9; } }
    @keyframes mt-out { to { opacity: 0; translate: 0 8px; scale: .96; } }
    @keyframes mt-mark { from { scale: .2; rotate: -30deg; opacity: 0; } }
    @keyframes mt-time { from { scale: 1 1; } to { scale: 0 1; } }
    @keyframes mt-turn { to { rotate: 1turn; } }
    @media (prefers-reduced-motion: reduce) { .mt.in, .mt.in .disc svg, .mt.out, .mt .turn { animation: none; } }

    /* today and the toy, side by side, in the corner of a page */
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .show { position: relative; display: grid; place-items: end; min-height: 230px; padding: 28px 24px 34px; border-radius: 24px; background: var(--pl-bg-inset); }
    .show > small { position: absolute; left: 22px; top: 18px; font: var(--pl-round-w, 700) 13px/1 var(--pl-round); color: var(--pl-text-secondary); }
    .show .wt:not([data-on]) { pointer-events: none; }
    .ask { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 18px; }

    /* what it is made of: one, large, with its parts named */
    .anat { display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: center; margin-top: 16px; }
    .anat .big { display: grid; place-items: center; padding: 44px 40px 52px; border-radius: 24px; background: var(--pl-bg-inset); }
    .anat .big .mt { zoom: 1.35; }
    .anat ol { margin: 0; padding-left: 20px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); }
    .anat ol li + li { margin-top: 6px; } .anat ol b { color: var(--pl-text-primary); font-weight: 600; }

    .cells { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
    .cell { display: flex; flex-direction: column; gap: 4px; padding: 14px 18px 18px; border-radius: 24px; background: var(--pl-bg-inset); }
    .cell .stage { background: none; min-height: 96px; padding: 14px 0 22px; }
    .cell b { font: 600 15px/20px var(--pl-sans); }
    .cell small { font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }

    /* ── a tick as a toy (proposed; would replace .tt-tick) ───────────────────────────────────────────────────
       a peg on a rail: one solid body, lit from above, on a shadow of its own colour */
    .rail { --u: 1; position: relative; display: inline-flex; align-items: flex-end; gap: calc(5px * var(--u)); height: calc(34px * var(--u)); padding: 0 calc(8px * var(--u)) calc(3px * var(--u)); }
    .rail::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(6px * var(--u)); border-radius: calc(3px * var(--u)); background: color-mix(in oklab, var(--pl-text-primary) 9%, transparent);
      box-shadow: inset 0 calc(1px * var(--u)) 0 0 color-mix(in oklab, var(--pl-text-primary) 8%, transparent); }
    .rail.big { --u: 3; } .rail.x2 { --u: 2; }
    .pg { --f: var(--pl-mint-block); position: relative; flex: none; display: block; width: calc(8px * var(--u)); height: calc(22px * var(--u)); border-radius: calc(4px * var(--u));
      background: linear-gradient(180deg, color-mix(in oklab, var(--f) 82%, #fff), var(--f)); color: var(--f);
      box-shadow: inset 0 calc(1.2px * var(--u)) 0 0 color-mix(in oklab, #fff 50%, transparent), inset 0 calc(-1.5px * var(--u)) 0 0 color-mix(in oklab, #000 14%, transparent), 0 calc(5px * var(--u)) calc(5px * var(--u)) calc(-3px * var(--u)) color-mix(in oklab, var(--f) 80%, transparent);
      transform-origin: 50% 100%; transition: translate 300ms var(--pl-spring-pop), height 300ms var(--pl-spring-pop); }
    .pg[data-kind="undone"] { height: calc(7px * var(--u)); background: color-mix(in oklab, var(--pl-mint-block) 30%, var(--pl-bg-inset)); box-shadow: none; }
    .pg[data-kind="hand"] { --f: var(--pl-butter); }
    .pg[data-kind="undo"] { width: calc(14px * var(--u)); background: none; box-shadow: none; filter: drop-shadow(0 calc(2.5px * var(--u)) calc(2px * var(--u)) color-mix(in oklab, var(--f) 55%, transparent)); }
    .pg[data-kind="undo"] svg { display: block; width: 100%; height: 100%; }
    .pg[data-kind="at"] { translate: 0 calc(-4px * var(--u)); box-shadow: inset 0 calc(1.2px * var(--u)) 0 0 color-mix(in oklab, #fff 50%, transparent), inset 0 calc(-1.5px * var(--u)) 0 0 color-mix(in oklab, #000 14%, transparent), 0 calc(9px * var(--u)) calc(7px * var(--u)) calc(-4px * var(--u)) color-mix(in oklab, var(--f) 80%, transparent); }
    .pg[data-kind="at"]::after { content: ''; position: absolute; left: 50%; bottom: calc(100% + 3px * var(--u)); width: calc(7px * var(--u)); height: calc(7px * var(--u)); margin-left: calc(-3.5px * var(--u)); border-radius: 50%;
      background: var(--pl-pink-block); box-shadow: inset 0 calc(1px * var(--u)) 0 0 color-mix(in oklab, #fff 50%, transparent), 0 calc(2px * var(--u)) calc(3px * var(--u)) calc(-1px * var(--u)) color-mix(in oklab, var(--pl-pink-block) 80%, transparent); }
    .pg[data-kind="no"] { --f: var(--pl-coral-block); animation: pg-no 1600ms ease-in-out infinite; }
    @keyframes pg-no { 0%, 16%, 100% { translate: 0 0; } 4% { translate: calc(-2px * var(--u)) 0; } 8% { translate: calc(2px * var(--u)) 0; } 12% { translate: calc(-1px * var(--u)) 0; } }
    @media (hover: hover) { .pg:not([data-kind="undone"], [data-kind="at"]):hover { translate: 0 calc(-2px * var(--u)); } }
    @media (prefers-reduced-motion: reduce) { .pg { transition: none; } .pg[data-kind="no"] { animation: none; } }
    .pegs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
    .pegs .stage { min-height: 150px; padding: 24px 0 18px; place-items: end center; }
    p.after { margin-top: 22px; }
    .run { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 40px; margin-top: 16px; padding: 34px 30px 30px; border-radius: 24px; background: var(--pl-bg-inset); }

    /* the strip is still today's: a grid of what it does, without boxes drawn round things */
    .panel { box-shadow: none; background: var(--pl-bg-inset); border-radius: 24px; }
    .panel .stage { background: none; }
    .row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
    .row > div { display: grid; grid-template-rows: auto 1fr; min-width: 0; }
    .row .stage { padding: 28px 14px 8px; min-height: 80px; box-sizing: border-box; }
    /* the strip, with room above it for the pill */
    .hist { padding: 64px 24px 28px; }
    .tt.leg { width: auto; display: block; padding: 0; scale: 2; }
    .tt.leg .tt-ticks { border-bottom-color: transparent; }
    .quiet .tt { width: auto; max-width: 100%; align-items: center; }
    .quiet .tt .tt-say { white-space: normal; }
    .open { margin-top: 14px; padding: 16px 20px 16px 38px; border-radius: 24px; background: var(--pl-bg-inset); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 1000px) { .row { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 760px) { .pair, .cells, .row, .anat { grid-template-columns: 1fr; } .pegs { grid-template-columns: 1fr 1fr; } }
  </style>${TOY_DEFS}
  <h2>How the system works</h2>
  <div class="prose">
    <p>Plumber speaks up only after it has <b>written to your code</b>. A fix is written the moment you take it, so the message is not a question: it says what was written and where, and offers one way out, <b>Undo</b>.</p>
    <p>Its colour is the answer before you read it. <b>Mint</b>: it is on your tokens now. <b>Butter</b>: your own value stays, or is back. <b>Coral</b>: it went wrong. Paper: still working.</p>
  </div>

  <h2>Today, and as a toy</h2>
  <p>The same message, twice. Left: what the product shows now, a white card with a blue word. Right: rebuilt as a solid thing in the colour of what happened, with its time running out under it. Take a fix, then press Undo. Point at the right one and its time waits.</p>
  <div class="pair">
    <div class="show"><small>Today</small><div class="wt pl-card" role="status"><span class="what"></span></div></div>
    <div class="show"><small>As a toy</small><div class="slot" role="status"></div></div>
  </div>
  <div class="ask">${b('Take a fix', { attrs: 'data-say="changed"' })}${b('Add a token', { cls: 'quiet', attrs: 'data-say="added"' })}${b('Keep a value', { cls: 'quiet', attrs: 'data-say="kept"' })}${b('A write that fails', { cls: 'quiet', attrs: 'data-say="failed"' })}</div>

  <h2>What a toast is made of</h2>
  <div class="anat"><div class="big">${toy('done', SAYS.changed[1], { undo: true, still: true })}</div>
    <ol>
      <li><b>The body.</b> One solid shape in the full hue, lettered in white like a button’s top, lit from above, on a shadow of its own colour. It has no side under it, because it is not something you press.</li>
      <li><b>The disc.</b> A white hole with one mark in the body’s hue: a tick, a return arrow, an exclamation mark. It pops a beat after the toast lands.</li>
      <li><b>The words.</b> One bold sentence cut out in white. Names from your code are set as code, on a chip, so you can find them with your eye.</li>
      <li><b>Undo.</b> The system’s quiet button, small: it goes down under the finger like every other button.</li>
      <li><b>The time.</b> A bar under the body runs out over six seconds, so the toast never leaves by surprise. Pointing at the toast holds it.</li>
    </ol></div>

  <h2>What it can say</h2>
  <p>Four things, told apart by colour before words.</p>
  <div class="cells">${KINDS.map(([h, p, t]) => `<div class="cell"><div class="stage">${t}</div><b>${h}</b><small>${p}</small></div>`).join('')}</div>

  <h2>The history strip, as it is today</h2>
  <p>Not rebuilt yet; it is the next piece. Time runs left to right, Now at the right end. One tick per change, one group per step, the step’s name the only word at rest. Point at a tick, or use the arrow keys; then undo it.</p>
  <div class="panel"><div class="stage hist"><div class="tt pl-card" data-live>${strip}</div></div>
    <div class="cap"><h3>One change at a time</h3><p>The playhead points at one change and a pill above it says what it was and what it became. Undo change takes back that one; Undo step takes back everything written with it. Try the hatched tick: it was edited again later, so it says no, and says why.</p></div></div>

  <h2>A tick, as a toy</h2>
  <p>Today a change is a hairline, and its states are an outline, a hatch and a notch. Rebuilt: a change is a peg standing on a rail. Its colour and its pose say its state. Drawn at three times their size; point at one.</p>
  <div class="pegs">${TICKS.map(([h, p, k]) => `<div class="cell"><div class="stage">${rail([k], 'big')}</div><b>${h}</b><small>${p}</small></div>`).join('')}</div>
  <p class="after">In a row, at their real size, as a history reads: three changes, one taken back, the undo that did it, one edited by hand, and the newest, pointed at.</p>
  <div class="run">${rail(['live', 'live', 'live', 'undone', 'undo', 'hand', 'live', 'at'])}${rail(['live', 'live', 'live', 'undone', 'undo', 'hand', 'live', 'at'], 'x2')}</div>

  <h2>When there is nothing to show</h2>
  <div class="panel row quiet" style="--n: 3">${QUIET.map(([h, p, t]) => `<div><div class="stage"><div class="tt pl-card">${t}</div></div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>The toy toast is on this page only.</b> The product still shows today’s. Moving it in is a change to the overlay, after you have judged it here.</li>
    <li><b>The strip is not rebuilt.</b> The pegs are drawn on this page; the strip above still has its hairlines, a grey line picture and plain-text buttons.</li>
    <li><b>Butter for “your own value” is my reading of the hue table</b>, used for Kept and for Undone. If Undone should be quiet paper, it is one line.</li>
  </ul>`;

  // the two live toasts answer the same buttons. Today's: says it, holds six seconds, leaves. The toy: arrives, its
  // bar runs out (and waits while it is pointed at), then it drops
  const wt = root.querySelector('.show .wt'), what = wt.querySelector('.what'), slot = root.querySelector('.slot');
  let timer = 0, later = 0;
  const say = (text, { undo = false, kind = '' } = {}) => {
    clearTimeout(timer);
    wt.dataset.kind = kind;
    what.textContent = text;
    wt.querySelector('.undo')?.remove();
    if (undo) wt.insertAdjacentHTML('beforeend', `<button type="button" class="undo">${FIX.undo}</button>`);
    wt.toggleAttribute('data-on', true);
    timer = setTimeout(() => wt.removeAttribute('data-on'), HOLD);
  };
  const show = (kind, text, opts) => {
    slot.innerHTML = toy(kind, text, opts);
    const el = slot.firstElementChild;
    el.classList.add('in');
    el.querySelector('.bar i')?.addEventListener('animationend', () => { el.classList.remove('in'); el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); });
  };
  const after = (fn) => { clearTimeout(later); later = setTimeout(fn, 450); };
  root.querySelector('.ask').addEventListener('click', (e) => {
    const k = e.target.closest('[data-say]')?.dataset.say;
    if (!k) return;
    const [plain, rich, kind] = SAYS[k];
    if (kind === 'wrong') { say(plain, { kind: 'error' }); show(kind, rich); return; }
    say(FIX.writing); show('busy', FIX.writing);
    after(() => { say(plain, { undo: true }); show(kind, rich, { undo: true }); });
  });
  const undone = () => { say(FIX.undoing); show('busy', FIX.undoing); after(() => { say(FIX.undone); show('yours', FIX.undone); }); };
  wt.addEventListener('click', (e) => { if (e.target.closest('.undo')) undone(); });
  slot.addEventListener('click', (e) => { if (e.target.closest('[data-undo]')) undone(); });

  // the strip: the playhead points at one change; the pill says it; an undo hollows the tick, or is refused
  const tt = root.querySelector('.tt[data-live]'), track = tt.querySelector('.tt-track'), head = tt.querySelector('.tt-head'), pill = tt.querySelector('.tt-pill');
  const ticks = [...tt.querySelectorAll('.tt-tick')], [one, step] = tt.querySelectorAll('.tt-acts button');
  let at = FLAT.length - 1, warn = null;
  const point = (i) => {
    at = Math.max(0, Math.min(FLAT.length - 1, i));
    const c = FLAT[at], t = ticks[at];
    for (const x of ticks) x.removeAttribute('aria-current');
    t.setAttribute('aria-current', 'true');
    const steps = tt.querySelector('.tt-steps').getBoundingClientRect(), tr = t.getBoundingClientRect(), sr = tt.getBoundingClientRect();
    head.style.translate = `${tr.left + tr.width / 2 - steps.left}px 0`;
    pill.dataset.kind = warn ? 'warn' : '';
    pill.innerHTML = warn ?? `${c.undoes ? `<span class="tt-kind">${T.undo}</span>` : ''}${c.from} → ${c.to}`;
    pill.hidden = false;
    const w = pill.offsetWidth;
    pill.style.translate = `${Math.max(0, Math.min(sr.width - w, tr.left + tr.width / 2 - sr.left - w / 2))}px 0`;
    one.disabled = c.state === 'undone';
    step.disabled = !FLAT.some((f) => f.s === c.s && f.state === 'live');
    track.setAttribute('aria-valuetext', T.valuetext(at + 1, FLAT.length, STEPS[c.s][0], c.from, c.to, []));
  };
  const undo = (list) => {
    const c = FLAT[at];
    if (c.state === 'changed' && list.length === 1) {
      warn = T.changedLater;
      ticks[at].classList.remove('shake'); void ticks[at].offsetWidth; ticks[at].classList.add('shake');
      point(at); return;
    }
    for (const i of list) if (FLAT[i].state === 'live') { FLAT[i].state = 'undone'; ticks[i].dataset.state = 'undone'; }
    point(at);
  };
  tt.addEventListener('click', (e) => {
    const t = e.target.closest('.tt-tick'), act = e.target.closest('[data-act]')?.dataset.act;
    warn = null;
    if (t) point(+t.dataset.i);
    else if (act === 'change') undo([at]);
    else if (act === 'step') undo(FLAT.map((f, i) => (f.s === FLAT[at].s ? i : -1)).filter((i) => i >= 0));
  });
  track.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (e.key === 'Backspace') { e.preventDefault(); warn = null; one.disabled || one.click(); return; }
    if (!d && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault(); warn = null;
    point(e.key === 'Home' ? 0 : e.key === 'End' ? FLAT.length - 1 : at + d);
  });
  requestAnimationFrame(() => point(at));

  void host;
}

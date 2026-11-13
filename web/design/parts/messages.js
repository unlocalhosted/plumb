// The design site's page for messages: what Plumber says after it writes to your code. Two pieces, both the overlay's
// own (history.js HISTORY_CSS, with its markup and its words from words.js FIX and TIMELINE): the toast by the dock
// after a write, with Undo, and the history strip the dock grows into. Here they stand on the page instead of
// floating in a corner; nothing is written anywhere.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { HISTORY_CSS, HISTORY_ICON } from '../../../overlay/src/history-style.js';
import { FIX, TIMELINE as T } from '../../../overlay/src/words.js';

const X = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
const HOLD = 6000; // how long a toast stays (history.js)

export function mount(host, root, css) {
  const toast = (text, { undo = false, kind = '' } = {}) => `<div class="wt pl-card" data-on${kind ? ` data-kind="${kind}"` : ''}><span class="what">${text}</span>${undo ? `<button type="button" class="undo" tabindex="-1">${FIX.undo}</button>` : ''}</div>`;

  // what a write can say, each with the product's own words
  const SAYS = {
    changed: [FIX.changed('gap-[13px]', 'gap-3', 3), true],
    added: [FIX.added('--spacing-gutter', 'src/theme.css'), true],
    kept: [FIX.kept(3), true],
    failed: [FIX.changedSince, false, 'error'],
  };
  const KINDS = [
    ['While it writes', 'One line, no button. It is there for as long as the write takes, usually too short to read.', toast(FIX.writing)],
    ['Written', 'What changed and at how many places, in your code’s own names. Undo is the only button.', toast(SAYS.changed[0], { undo: true })],
    ['Taken back', 'The same toast answers the Undo: one sentence, then it leaves.', toast(FIX.undone)],
    ['Couldn’t', 'Coral words, on as many lines as they need: what happened and what to do. Nothing was written.', toast(FIX.changedSince, { kind: 'error' })],
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

  const tick = (attrs) => `<span class="tt leg"><span class="tt-ticks"><span class="tt-tick" ${attrs}></span></span></span>`;
  const TICKS = [
    ['A change', 'In your code now. It can be undone.', tick('data-state="live"')],
    ['Undone', 'Hollow: taken back, still in the record.', tick('data-state="undone"')],
    ['Changed since', 'Hatched butter: edited after, so it can’t be undone alone.', tick('data-state="changed"')],
    ['An undo', 'A small return notch: taking something back is a change too.', tick('data-state="live" data-undo')],
    ['Pointed at', 'Taller and sky: the one the playhead is on.', tick('data-state="live" aria-current="true"')],
  ];
  const QUIET = [
    ['Reading', 'Six ghost ticks breathe while the history is read.', `<span class="tt-glyph">${HISTORY_ICON}</span><div class="tt-track"><div class="tt-steps"><div class="tt-seg"><span class="tt-name">&nbsp;</span><div class="tt-ticks">${'<span class="tt-tick ghost"></span>'.repeat(6)}</div></div></div></div>`],
    ['Nothing yet', 'One line that says what will show up here.', `<span class="tt-glyph">${HISTORY_ICON}</span><span class="tt-say">${T.empty}</span>`],
    ['Can’t read it', 'One line: what failed, and what to do.', `<span class="tt-glyph">${HISTORY_ICON}</span><span class="tt-say">${T.error}</span>`],
  ];

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${HISTORY_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .panel { margin-top: 14px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); overflow: hidden; }
    .cap { padding: 16px 18px 18px; display: grid; gap: 4px; align-content: start; }
    .cap h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .cap p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }

    /* the pieces stand on the page here; in the product they are fixed to the dock's corner */
    .wt, .tt { position: relative; inset: auto; }
    .tt { width: 100%; max-width: 760px; }
    .stage { position: relative; display: grid; place-items: center; padding: 36px 24px; background: var(--pl-bg-inset); }

    /* the live toast: a corner of someone's page, the toast where it lands */
    .try { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }
    .corner { min-height: 190px; place-items: end; padding: 24px; }
    .corner .wt:not([data-on]) { pointer-events: none; }
    .hold { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--pl-instrument); transform-origin: left; scale: 0 1; opacity: .5; }
    .hold.run { animation: hold ${HOLD}ms linear both; }
    @keyframes hold { from { scale: 1 1; } to { scale: 0 1; } }
    .ask { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .ask button { all: unset; cursor: pointer; padding: 7px 12px; border-radius: 10px; font: 600 13px/18px var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); }
    .ask button:focus-visible { outline: 2px solid var(--pl-border-focus); outline-offset: 2px; }
    @media (hover: hover) { .ask button:hover { background: var(--pl-bg-surface-hover); } }

    .row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
    .row > div { display: grid; grid-template-rows: auto 1fr; border-left: 1px solid var(--pl-border-default); min-width: 0; }
    .row > div:first-child { border-left: 0; }
    .row .stage { padding: 28px 14px; min-height: 96px; box-sizing: border-box; }
    .row .wt { max-width: 100%; }
    .row .cap { border-top: 1px solid var(--pl-border-default); }
    .row .wt { min-width: 0; }
    .row.two > div:nth-child(n+3) { border-top: 1px solid var(--pl-border-default); } .row.two > div:nth-child(odd) { border-left: 0; }

    /* the strip, with room above it for the pill */
    .hist { padding: 64px 24px 28px; }
    .tt.leg { width: auto; display: block; padding: 0; scale: 2; }
    .tt.leg .tt-ticks { border-bottom-color: transparent; }
    .quiet .tt { width: auto; max-width: 100%; align-items: center; }
    .quiet .tt .tt-say { white-space: normal; }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 1000px) { .row { grid-template-columns: 1fr 1fr; } .row > div:nth-child(odd) { border-left: 0; } .row > div:nth-child(n+3) { border-top: 1px solid var(--pl-border-default); } }
    @media (max-width: 720px) { .try, .row { grid-template-columns: 1fr; } .row > div { border-left: 0; border-top: 1px solid var(--pl-border-default); } .row > div:first-child { border-top: 0; } }
    @media (prefers-reduced-motion: reduce) { .hold { display: none; } }
  </style>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Plumber speaks up only after it has <b>written to your code</b>. A fix is written the moment you take it, so the message is not a question: it says what was written and where, and offers one way out, <b>Undo</b>.</p>
    <p>There are two pieces. The <b>toast</b> sits by the dock for six seconds after a write. The <b>history strip</b> is the dock grown wide: every change you made, as a tick, each one able to be taken back on its own. A refusal is said in the same place as the thing refused, in words that say what to do instead.</p>
  </div>

  <h2>The toast</h2>
  <p>Live, with the product’s own styles and words. Take a fix, then press Undo before it leaves.</p>
  <div class="panel try">
    <div class="stage corner"><div class="wt pl-card" role="status"><span class="what"></span></div><i class="hold" aria-hidden="true"></i></div>
    <div class="cap"><h3>After a write</h3><p>It rises a few pixels by the dock, stays six seconds, and leaves. One sentence, cut with an ellipsis if it is long; the names in it are your code’s. Pointing at it does not hold it: the same Undo is in the history.</p>
      <div class="ask"><button data-say="changed">Take a fix</button><button data-say="added">Add a token</button><button data-say="kept">Keep a value</button><button data-say="failed">A write that fails</button></div></div>
  </div>

  <h2>What it can say</h2>
  <p>Four things, in one shape. Only a finished write has a button.</p>
  <div class="panel row two" style="--n: 2">${KINDS.map(([h, p, t]) => `<div><div class="stage">${t}</div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>The history strip</h2>
  <p>Time runs left to right, Now at the right end. One tick per change, one group per step, the step’s name the only word at rest. Point at a tick, or use the arrow keys; then undo it.</p>
  <div class="panel"><div class="stage hist"><div class="tt pl-card" data-live>${strip}</div></div>
    <div class="cap"><h3>One change at a time</h3><p>The playhead points at one change and a pill above it says what it was and what it became. Undo change takes back that one; Undo step takes back everything written with it. Try the hatched tick: it was edited again later, so it says no, and says why.</p></div></div>

  <h2>A tick, in each state</h2>
  <p>Drawn at twice their size.</p>
  <div class="panel row" style="--n: 5">${TICKS.map(([h, p, t]) => `<div><div class="stage">${t}</div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>When there is nothing to show</h2>
  <div class="panel row quiet" style="--n: 3">${QUIET.map(([h, p, t]) => `<div><div class="stage"><div class="tt pl-card">${t}</div></div><div class="cap"><h3>${h}</h3><p>${p}</p></div></div>`).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>The toast’s Undo is plain text.</b> It is a sky word on the card, not one of the system’s buttons, and it does not go down under the finger.</li>
    <li><b>Nothing shows the six seconds.</b> The toast leaves without warning. The thin line under the corner above is this page’s, not the product’s.</li>
    <li><b>Refusals are words only.</b> The tick shakes and the pill says why; there is no toy for “no”.</li>
  </ul>`;

  // the live toast: says it, holds six seconds, leaves; Undo answers in the same toast
  const wt = root.querySelector('.corner .wt'), what = wt.querySelector('.what'), hold = root.querySelector('.hold');
  let timer = 0;
  const say = (text, { undo = false, kind = '' } = {}) => {
    clearTimeout(timer);
    wt.dataset.kind = kind;
    what.textContent = text;
    wt.querySelector('.undo')?.remove();
    if (undo) wt.insertAdjacentHTML('beforeend', `<button type="button" class="undo">${FIX.undo}</button>`);
    wt.toggleAttribute('data-on', true);
    hold.classList.remove('run'); void hold.offsetWidth; hold.classList.add('run');
    timer = setTimeout(() => { wt.removeAttribute('data-on'); hold.classList.remove('run'); }, HOLD);
  };
  root.querySelector('.ask').addEventListener('click', (e) => {
    const k = e.target.closest('[data-say]')?.dataset.say;
    if (!k) return;
    const [text, undo, kind] = SAYS[k];
    if (kind) { say(text, { kind }); return; }
    say(FIX.writing); hold.classList.remove('run');
    timer = setTimeout(() => say(text, { undo }), 450);
  });
  wt.addEventListener('click', (e) => {
    if (!e.target.closest('.undo')) return;
    say(FIX.undoing); hold.classList.remove('run');
    timer = setTimeout(() => say(FIX.undone), 450);
  });

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

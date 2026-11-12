/* ─────────────────────────────────────────────────────────
 * WRITE HISTORY · React Plumber overlay
 *
 * Every change can be taken back, on its own (docs/briefs/time-travel.md, layer 1). The server traces each change a
 * write makes (GET trace) and undoes one, or a step, where it is found now (POST undo-change, undo-group).
 *
 *  toast     after any write: what was written and where, with Undo, for a few seconds by the dock. Undo takes back
 *            the write's step (the group its answer names), the same step the timeline shows; a write with no step
 *            falls back to restoring its file. A dev server that reloads the page after the write brings it back
 *  timeline  the dock's history button grows the dock into a strip: time runs left to right, Now at the right end;
 *            one tick per change, one segment per step (one write, or one tagged group), the step's name the only
 *            word at rest. A playhead points at one change: one pill holds its from → to and its laws
 *  states    a tick is live (ink), undone (hollow), changed since (hatched butter: edited after, can't be undone
 *            alone) or an undo (a return notch); loading shows ghost ticks; empty and error say so in one line
 *  undo      Undo change (⌫) and Undo step (⇧⌫) act on the pointed change; an undo is itself a tick. A refusal
 *            shakes the tick and says what to do instead
 *  reload    an undo from the timeline that makes the dev server reload the page reopens it there, within 15s
 *  keys      the playhead is a slider: ←/→ one change, ⇧←/⇧→ one step, Home/End; Esc closes, back to the button
 *  page      the pointed change's element is outlined on the page (layer 2): the elements stamped at the JSX that holds
 *            the change's line (every row of a list), scrolled into view when they are all off screen, kept on them as
 *            the page scrolls; a change with nothing on this page says so in the pill
 *  past      the playhead left of Now shows the page as it was there (layer 3), written nowhere: every live change to
 *            its right is undone on its elements, newest first (the class it added comes off, the classes it took off go
 *            on as inline styles from the project's own Tailwind via POST try; a text change swaps its words back). The
 *            strip's edge turns sky, those ticks go hollow, and Go back to here (↵) undoes them all in one write. Esc,
 *            or the playhead back at Now, puts the page back exactly
 * ───────────────────────────────────────────────────────── */
import { errorIs, request, post } from './api.js';
import { esc } from './choices.js';
import { TIMELINE as T } from './words.js';
import { STAMPED, stampOf, parseStamp, stampNames } from './stamp.js';
import { Scope } from './scope.js';
import { Claims, LEVEL } from './claims.js';

export const HISTORY_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 4.2A4.25 4.25 0 1 1 1.75 6.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M1.6 1.8v2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3.75V6l1.6 1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

const HOLD = 6000;
const RESUME = 'plumb:wrote';
// the timeline wrote: a dev server that reloads the page after it brings the timeline back, at Now, and says what was done
const RESUME_TT = 'plumb:timeline';
const short = (file) => String(file ?? '').split('/').pop();
const lawsOf = (c) => (Array.isArray(c?.meta?.laws) ? c.meta.laws : []).map((l) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const HISTORY_CSS = `
  .wt { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4));
    display: flex; align-items: center; gap: var(--pl-space-4); max-width: min(440px, calc(100vw - 2 * var(--pl-space-6))); box-sizing: border-box;
    padding: var(--pl-space-3) var(--pl-space-3) var(--pl-space-3) var(--pl-space-5); pointer-events: auto;
    font: var(--pl-card-meta);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .wt[data-on] { opacity: 1; translate: 0 0; }
  .wt .what { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wt .what code { font: var(--pl-card-code); }
  .wt[data-kind="error"] .what { color: var(--pl-off); white-space: normal; }
  .wt button, .tt button { all: unset; cursor: pointer; padding: 6px var(--pl-space-4); border-radius: var(--pl-radius-row); font: var(--pl-card-label); color: var(--pl-text-primary); white-space: nowrap; }
  .wt button { padding: 3px var(--pl-space-4); color: var(--pl-instrument); }
  :is(.wt, .tt) button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 1px; }
  :is(.wt, .tt) button:disabled { color: var(--pl-text-disabled); cursor: default; }
  @media (hover: hover) and (pointer: fine) { :is(.wt, .tt) button:not(:disabled):hover { background: var(--pl-bg-surface-hover); } }

  /* the timeline: the dock grown into a strip, same corner */
  .tt { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: var(--pl-space-6); box-sizing: border-box; pointer-events: auto;
    width: min(760px, calc(100vw - 2 * var(--pl-space-6))); display: flex; align-items: flex-end; gap: var(--pl-space-5);
    padding: var(--pl-space-4) var(--pl-space-4) var(--pl-space-4) var(--pl-space-5); }
  .tt[hidden] { display: none; }
  /* the strip settles where the dock is: the start corner, or the middle when both corners are taken */
  :host([data-side="start"]) .tt { inset-inline-end: auto; inset-inline-start: var(--pl-space-6); }
  :host([data-side="center"]) :is(.tt, .wt) { inset-inline-end: auto; inset-inline-start: 50%; translate: -50% 0; }
  :host([data-side="center"]) .wt:not([data-on]) { translate: -50% 4px; }
  /* in the past: the page isn't current, and the strip says so at its edge */
  .tt[data-past] { box-shadow: var(--pl-shadow-card), 0 0 0 2px color-mix(in oklab, var(--pl-instrument) 55%, transparent); }
  .tt .tt-glyph { flex: none; align-self: center; width: 20px; height: 20px; display: grid; place-items: center; color: var(--pl-text-secondary); }
  .tt .tt-glyph svg, .tt .tt-x svg { width: 14px; height: 14px; }
  .tt .tt-track { position: relative; flex: 0 1 auto; min-width: 0; overflow-x: auto; overflow-y: visible; scrollbar-width: none; outline: none; padding-top: 6px; touch-action: pan-x; cursor: default; }
  .tt .tt-track::-webkit-scrollbar { display: none; }
  /* focus is shown where the keys act: a ring around the playhead's knob */
  .tt .tt-track:focus-visible .tt-head::before { box-shadow: 0 0 0 2px var(--pl-bg-surface), 0 0 0 4px var(--pl-instrument); }
  .tt .tt-steps { position: relative; display: flex; align-items: flex-end; gap: var(--pl-space-6); padding: 0 var(--pl-space-2); width: max-content; }
  .tt .tt-seg { display: flex; flex-direction: column; gap: var(--pl-space-3); }
  .tt .tt-seg .tt-name { font: var(--pl-card-label); color: var(--pl-text-secondary); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .tt .tt-ticks { display: flex; align-items: flex-end; gap: 6px; height: 20px; padding: 0 2px 3px; border-bottom: 1px solid var(--pl-border-default); }
  .tt .tt-tick { flex: none; width: 2px; height: 14px; border-radius: 1px; background: var(--pl-text-primary); transform-origin: bottom;
    transition: height var(--pl-dur-feedback) var(--pl-ease-out), background-color var(--pl-dur-feedback), box-shadow var(--pl-dur-feedback); }
  .tt .tt-tick[data-state="undone"] { width: 4px; background: transparent; box-shadow: inset 0 0 0 1px var(--pl-icon-tick); }
  .tt .tt-tick[data-state="changed"] { width: 4px; background: repeating-linear-gradient(-45deg, var(--pl-soft) 0 1.5px, var(--pl-soft-bg) 1.5px 3px); }
  .tt .tt-tick[data-undo] { position: relative; }
  .tt .tt-tick[data-undo]::before { content: ""; position: absolute; top: -3px; left: -2px; width: 3px; height: 2px; border-top: 1px solid currentColor; border-left: 1px solid currentColor; color: var(--pl-icon-primary); }
  .tt .tt-tick[data-ahead] { width: 4px; background: transparent; box-shadow: inset 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"] { height: 18px; }
  .tt .tt-tick[aria-current="true"]:not([data-state="undone"]):not([data-state="changed"]) { background: var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"][data-state="undone"] { box-shadow: inset 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick[aria-current="true"][data-state="changed"] { box-shadow: 0 0 0 1px var(--pl-instrument); }
  .tt .tt-tick.ghost { background: var(--pl-bg-inset); animation: tt-ghost 1.2s ease-in-out infinite alternate; }
  .tt .tt-tick.busy { animation: tt-ghost 600ms ease-in-out infinite alternate; }
  .tt .tt-tick.shake { animation: tt-shake 160ms ease-in-out 2; }
  .tt .tt-tick.enter { animation: tt-enter 280ms var(--pl-spring-pop) both; }
  @media (hover: hover) and (pointer: fine) { .tt .tt-tick:not(.ghost):hover { height: 16px; } }
  .tt .tt-head { position: absolute; left: 0; bottom: -4px; width: 1px; height: 26px; background: var(--pl-instrument); box-shadow: 0 0 0 1px var(--pl-halo); pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out); }
  .tt .tt-head::before { content: ""; position: absolute; top: -4px; left: -4px; width: 9px; height: 9px; border-radius: 50%; background: var(--pl-instrument); box-shadow: 0 0 0 2px var(--pl-bg-surface); }
  .tt .tt-now { flex: none; margin-inline-end: auto; padding-bottom: 3px; font: var(--pl-card-label); color: var(--pl-text-secondary); }
  .tt .tt-pill { position: absolute; bottom: calc(100% + var(--pl-space-4)); left: 0; max-width: calc(100vw - 2 * var(--pl-space-6)); box-sizing: border-box;
    padding: 4px var(--pl-space-4); border-radius: var(--pl-radius-tag); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-tag);
    font: var(--pl-card-code); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out), opacity var(--pl-dur-feedback); }
  .tt .tt-pill[hidden] { display: none; }
  .tt .tt-pill .tt-kind { font: var(--pl-card-meta); color: var(--pl-text-secondary); margin-inline-end: var(--pl-space-3); }
  .tt .tt-pill .tt-law { font: var(--pl-card-meta); color: var(--pl-lilac); margin-inline-start: var(--pl-space-3); }
  .tt .tt-pill[data-kind="warn"] { font: var(--pl-card-meta); white-space: normal; max-width: min(360px, calc(100vw - 2 * var(--pl-space-6))); box-shadow: 0 0 0 1px var(--pl-soft), 0 2px 6px -2px rgb(28 27 25 / 0.24); }
  .tt .tt-pill[data-kind="error"] { font: var(--pl-card-meta); white-space: normal; color: var(--pl-off); }
  .tt .tt-say { align-self: center; margin-inline-end: auto; font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .tt .tt-acts { flex: none; align-self: center; display: flex; gap: var(--pl-space-2); }
  .tt .tt-acts button[hidden] { display: none; }
  .tt .tt-acts button.primary { background: var(--pl-action-soft); color: var(--pl-on-action); }
  @media (hover: hover) and (pointer: fine) { .tt .tt-acts button.primary:not(:disabled):hover { background: color-mix(in oklab, var(--pl-action-soft) 80%, var(--pl-action)); } }
  .tt .tt-acts kbd { margin-inline-start: var(--pl-space-3); font: 500 10px/1 var(--pl-mono); color: var(--pl-text-secondary); }
  .tt .tt-acts button:disabled kbd { color: var(--pl-text-disabled); }
  @media (pointer: coarse) { .tt .tt-acts kbd { display: none; } }
  .tt .tt-x { flex: none; align-self: center; width: 28px; height: 28px; padding: 0 !important; display: grid; place-items: center; color: var(--pl-text-secondary) !important; }
  /* the pointed change's elements, outlined the way every instrument line is: sky with a halo */
  .tt-marks { position: fixed; inset: 0; pointer-events: none; }
  .tt-marks[hidden] { display: none; }
  .tt-mark { position: fixed; left: 0; top: 0; box-sizing: border-box; border: 1px solid var(--pl-instrument); border-radius: var(--pl-radius-tag);
    box-shadow: 0 0 0 1px var(--pl-halo), inset 0 0 0 1px var(--pl-halo); pointer-events: none;
    transition: translate var(--pl-dur-travel) var(--pl-ease-out), width var(--pl-dur-travel) var(--pl-ease-out), height var(--pl-dur-travel) var(--pl-ease-out), opacity var(--pl-dur-feedback); }
  .tt-mark.enter { animation: tt-mark-in var(--pl-dur-card) var(--pl-ease-out) both; }
  .tt .tt-pill .tt-where { font: var(--pl-card-meta); color: var(--pl-text-secondary); margin-inline-start: var(--pl-space-3); }
  @keyframes tt-mark-in { from { opacity: 0; scale: 1.04; } }
  @keyframes tt-ghost { from { opacity: 0.45; } to { opacity: 1; } }
  @keyframes tt-shake { 25% { translate: -2px 0; } 75% { translate: 2px 0; } }
  @keyframes tt-enter { from { transform: scaleY(0.6); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .wt { transition: none; translate: 0 0; }
    .tt .tt-tick, .tt .tt-head, .tt .tt-pill, .tt-mark { transition: none; }
    .tt-mark.enter { animation: none; }
    .tt .tt-tick.shake, .tt .tt-tick.enter, .tt .tt-tick.busy { animation: none; }
  }
`;

// The trace, oldest first, cut into steps: consecutive changes of one group
function stepsOf(changes) {
  const steps = [];
  for (const c of [...changes].reverse()) {
    const last = steps.at(-1);
    if (last && last.group === c.group) last.changes.push(c); else steps.push({ group: c.group, changes: [c] });
  }
  for (const s of steps) {
    const first = s.changes[0];
    s.name = first.meta?.step ?? first.meta?.layer ?? (s.changes.every((c) => c.undoes) ? T.undoStepName : short(first.file));
  }
  // steps where nothing can be undone now (every change changed since) collapse, each run of them into one step with
  // one tick, so a history reset by hand doesn't fill the strip: "Edited outside" when no later change here explains
  // it, "Changed since" when later changes did (undo those and the step comes back)
  const kindOf = (s) => (s.changes.every((c) => c.state === 'changed') ? (s.changes.some((c) => c.by?.length) ? 'later' : 'outside') : null);
  const out = [];
  for (const s of steps) {
    const kind = kindOf(s);
    if (!kind) { out.push(s); continue; }
    const last = out.at(-1), first = s.changes[0];
    if (last?.outside === kind) { last.changes[0].count += s.changes.length; continue; }
    out.push({ group: `${kind}:${first.id}`, name: kind === 'later' ? T.changedSince : T.outside, outside: kind, changes: [{ id: `${kind}:${first.id}`, state: 'changed', outside: kind, from: '', to: '', file: first.file, line: first.line, column: first.column, count: s.changes.length }] });
  }
  return out;
}
const live = (c) => c?.state === 'live';
// why a change can't be undone here, in words, from its state
// the server's refusal, in the timeline's words
// why an undo was refused, by the server's code (its old wording from an older server)
const whyNot = (error) => (errorIs(error, 'changed-by-hand') ? T.changedByHand : errorIs(error, 'changed-later') ? T.changedLater : errorIs(error, 'already-undone') ? T.undoneAlready : T.failed(error?.message ?? ''));
const reasonOf = (c) => (c.state === 'undone' ? T.undoneAlready : c.by?.length ? T.changedLater : T.changedByHand);

// The elements on the page drawn by the JSX that holds a change: the last JSX start at or before the change's line and
// column in its file. A className on the third line of a long tag still belongs to that tag; every row a list draws
// from it shares the stamp.
// Only DOM tags carry a stamp. A class written where a component is used (<Lettering className="…">) has no stamp
// of its own: the nearest stamp before it in the file is a sibling or a parent, which does not carry the class. So
// when the stamped elements don't have the change's classes, the change was written at a usage, and its elements
// are the top DOM elements of the component that was passed those classes, near that stamp.
const MARKS = 24;
const fiberOf = (el) => { for (const k in el) if (k.startsWith('__reactFiber$')) return el[k]; return null; };
function placeOf(stamp, c) {
  const parsed = parseStamp(stamp);
  if (!parsed || !stampNames(parsed, c.file)) return null;
  const { line, column } = parsed;
  return line < c.line || (line === c.line && column <= c.column) ? { line, column } : null;
}
// the top DOM elements a fiber renders: its host descendants with no host between
function hostsOf(fiber) {
  const out = [], stack = fiber.child ? [fiber.child] : [];
  while (stack.length) {
    const f = stack.pop();
    if (f.sibling) stack.push(f.sibling);
    if (f.stateNode instanceof Element) out.push(f.stateNode); else if (f.child) stack.push(f.child);
  }
  return out;
}
// Every stamp on the page, read once per playhead move: [stamp, elements] for each stamped element, and the React
// roots they hang from (for changes written at a component's usage). Many changes are matched against one read (the
// past view matches every change to the right).
function pageIndex() {
  const out = [], roots = new Set();
  for (const el of document.querySelectorAll(STAMPED)) {
    if (el.closest('plumb-overlay')) continue;
    out.push([stampOf(el), [el]]);
    if (roots.size < 8) { let f = fiberOf(el); while (f?.return) f = f.return; if (f) roots.add(f); }
  }
  out.roots = roots;
  return out;
}
const words = (text) => String(text ?? '').split(/\s+/).filter(Boolean);
// the top DOM elements of every component that was passed all of these classes, inside `scope`
function usageHosts(tokens, scope, roots) {
  const found = new Set();
  for (const root of roots ?? []) {
    const stack = [root];
    while (stack.length) {
      const f = stack.pop();
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
      const passed = typeof f.type !== 'string' && typeof f.memoizedProps?.className === 'string' ? words(f.memoizedProps.className) : null;
      if (passed && tokens.every((t) => passed.includes(t))) for (const el of hostsOf(f)) if (scope.contains(el)) found.add(el);
    }
  }
  return [...found];
}
function elementsOf(c, index = pageIndex()) {
  if (!c?.file || !/\.[cm]?[jt]sx?$/.test(c.file)) return [];
  const found = [];
  for (const [stamp, els] of index) { const at = els.length && placeOf(stamp, c); if (at) found.push({ ...at, els }); }
  let best = null;
  for (const f of found) if (!best || f.line > best.line || (f.line === best.line && f.column > best.column)) best = f;
  if (!best) return [];
  const stamped = [...new Set(found.filter((f) => f.line === best.line && f.column === best.column).flatMap((f) => f.els))].filter((el) => !el.closest('plumb-overlay'));
  // the classes the page has now from this change: what it wrote while it stands, what it replaced once undone
  const tokens = words(live(c) ? c.to : c.from);
  if (!tokens.length || !stamped.length || stamped.some((el) => tokens.every((t) => el.classList.contains(t)))) return stamped;
  const scope = stamped[0].parentElement ?? document.body;
  const used = usageHosts(tokens, scope, index.roots).filter((el) => !el.closest('plumb-overlay'));
  return used.length ? used : stamped;
}

export class History {
  #toast; #strip; #button; #host; #last = null;
  #steps = []; #flat = []; #at = -1; #busy = false; #status = 'idle'; #warn = null; #seen = new Set(); #press = false;
  #marks; #marked = []; #follow = 0;
  #life = new Scope(); // History's own, for as long as the overlay is on the page
  #loads = 0;          // the read in flight: only the newest one's answer is drawn
  #toastScope = null;  // the toast on screen: its time, and the moment it takes to leave
  #decl = new Map(); #shown = []; #past = false;
  #pastStyles = new Claims(LEVEL.past);

  // button: the dock's history button; host: announce(text), changed()
  constructor(root, { button, host }) {
    this.#button = button;
    this.#host = host;
    this.#toast = Object.assign(document.createElement('div'), { className: 'wt pl-card', hidden: true });
    this.#toast.setAttribute('role', 'status');
    this.#strip = Object.assign(document.createElement('section'), { className: 'tt pl-card', hidden: true });
    this.#strip.setAttribute('role', 'dialog');
    this.#strip.setAttribute('aria-label', T.title);
    this.#marks = Object.assign(document.createElement('div'), { className: 'tt-marks', hidden: true });
    root.append(this.#marks, this.#toast, this.#strip);
    // the marks stay on their elements as the page scrolls or resizes, one read per frame
    const follow = () => { if (this.#follow || !this.#marked.length) return; this.#follow = requestAnimationFrame(() => { this.#follow = 0; this.#place(); }); };
    this.#life.listen(window, 'scroll', follow, { passive: true, capture: true });
    this.#life.listen(window, 'resize', follow, { passive: true });
    button.addEventListener('click', () => this.toggle());
    this.#toast.addEventListener('click', (e) => { if (e.target.closest('.undo') && this.#last) this.undo(this.#last); });
    this.#strip.addEventListener('click', (e) => {
      const act = e.target.closest('button[data-act]')?.dataset.act;
      if (act === 'close') this.toggle(false); else if (act === 'back') this.#goBack(); else if (act) this.#undo(act);
    });
    this.#strip.addEventListener('keydown', (e) => this.#key(e));
    this.#strip.addEventListener('pointerdown', (e) => { const track = e.target.closest('.tt-track'); if (!track || e.button !== 0) return; this.#press = true; track.setPointerCapture(e.pointerId); this.#pointAt(e.clientX); });
    this.#strip.addEventListener('pointermove', (e) => { if (this.#press) this.#pointAt(e.clientX); });
    for (const end of ['pointerup', 'pointercancel']) this.#strip.addEventListener(end, () => { this.#press = false; });
    this.#resume();
  }

  get open() { return !this.#strip.hidden; }
  occluders() { return [this.#toast, this.#strip].filter((e) => !e.hidden).map((e) => e.getBoundingClientRect()); }

  // A write landed: say it, with Undo. `result` is the server's answer (it carries `undo`); `text` says it in words.
  wrote(result, text) {
    const handle = Array.isArray(result?.undo) ? result.undo[0] : result?.undo, group = result?.trace?.group ?? null;
    if (this.open) this.#load();
    if (!handle && !group) return this.#say(text ?? `Wrote ${short(result?.file)}`);
    this.#last = { handle: handle ?? null, group };
    const said = text ?? (Array.isArray(result?.undo) && result.undo.length > 1 ? T.applied(result.undo.length) : `Applied ${handle?.label ?? ''} in ${short(handle?.file ?? result?.file)}`);
    // a dev server may reload the page after the write: the toast comes back after it
    try { sessionStorage.setItem(RESUME, JSON.stringify({ ...this.#last, text: said, at: Date.now() })); } catch {}
    this.#say(said, true);
  }

  // the toast's Undo: the write's step, as the timeline would; a write that names no step restores its file
  async undo(last) {
    try { sessionStorage.removeItem(RESUME); } catch {}
    const { handle, group } = last ?? {};
    try {
      let said;
      if (group) { const done = await post('undo-group', { group }); said = T.undoneStep(done?.undone?.length ?? 1); }
      else { await post('undo', { id: handle.id }); said = `Undone in ${short(handle.file)}`; }
      if (this.#last === last) this.#last = null;
      this.#say(said);
      this.#host.announce?.(said);
    } catch (error) {
      const message = error?.message ?? '';
      this.#say(group ? whyNot(error) : errorIs(error, 'stale-file') ? `${short(handle?.file)} changed after this was applied, so it can’t be undone here. Undo it in your editor.` : T.failed(message || 'Check again.'), false, 'error');
    }
    if (this.open) this.#load();
    this.#host.changed?.();
  }

  toggle(on = !this.open) {
    if (on === this.open) return;
    this.#button.setAttribute('aria-pressed', String(on));
    if (!on) return this.#close();
    this.#strip.hidden = false;
    this.#seen.clear();
    this.#at = -1;
    this.#status = 'loading';
    this.#render();
    this.#grow();
    this.#load();
  }
  // Esc: from the past back to Now first; at Now, close
  escape() {
    if (!this.open) return false;
    if (this.#past && this.#flat.length) { this.#warn = null; this.#point(this.#flat.length - 1); return true; }
    return this.toggle(false), true;
  }

  // the dock grows into the strip: clipped from the dock's box to the strip's, on the spring; still motion fades
  #grow(back = false) {
    const strip = this.#strip, dock = this.#button.closest('.dock')?.getBoundingClientRect();
    const box = strip.getBoundingClientRect(), css = getComputedStyle(strip);
    // keyframes take resolved values: the radius is read, not referenced
    const round = `round ${css.getPropertyValue('--pl-radius-card').trim() || '12px'}`;
    const from = dock && dock.width ? `inset(${Math.max(0, dock.top - box.top)}px ${Math.max(0, box.right - dock.right)}px ${Math.max(0, box.bottom - dock.bottom)}px ${Math.max(0, dock.left - box.left)}px ${round})` : `inset(0px 0px 0px 0px ${round})`;
    const to = `inset(0px 0px 0px 0px ${round})`;
    const motion = still()
      ? strip.animate([{ opacity: back ? 1 : 0 }, { opacity: back ? 0 : 1 }], { duration: 120, easing: 'linear' })
      : strip.animate([{ clipPath: back ? to : from }, { clipPath: back ? from : to }], { duration: back ? 160 : 280, easing: back ? css.getPropertyValue('--pl-ease-out').trim() || 'ease-out' : css.getPropertyValue('--pl-spring').trim() || 'ease-out' });
    for (const child of strip.children) if (!back && !still()) child.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 60, fill: 'backwards' });
    return motion.finished.catch(() => {});
  }
  async #close() {
    const strip = this.#strip;
    try { sessionStorage.removeItem(RESUME_TT); } catch {}
    this.#show(-1);
    this.#mark(null);
    await this.#grow(true);
    strip.hidden = true;
    this.#button.focus({ preventScroll: true });
  }

  async #load(tries = 0) {
    const run = ++this.#loads;
    try {
      const said = await request('trace', {});
      if (run !== this.#loads) return; // a newer read was asked meanwhile: its answer is the one to draw
      this.#steps = stepsOf(said?.changes ?? []);
      this.#flat = this.#steps.flatMap((s) => s.changes.map((c) => ({ ...c, step: s })));
      this.#status = this.#flat.length ? 'ready' : 'empty';
    } catch {
      // reopened after a reload, the server may still be starting: wait for it a little
      if (run !== this.#loads) return;
      if (tries > 0) { this.#life.timeout(() => { if (run === this.#loads) this.#load(tries - 1); }, 500); return; }
      this.#status = 'error';
    }
    if (this.#at < 0 || this.#at >= this.#flat.length) this.#at = this.#flat.length - 1;
    if (!this.open) return;
    this.#render();
    // a render replaces what had focus: the slider takes it back
    this.#strip.querySelector('.tt-track')?.focus({ preventScroll: true });
    // what each class sets only matters to the past view: learnt after the ticks are drawn (a compile can take a
    // second on a real project), and the past shown again once it is known
    if (this.#status === 'ready') this.#learn().then(() => { if (this.open && this.#past) this.#point(this.#at, true); });
  }

  #render() {
    const s = this.#status, x = `<button type="button" class="tt-x" data-act="close" aria-label="${esc(T.close)}">${CLOSE_ICON}</button>`;
    const glyph = `<span class="tt-glyph" aria-hidden="true">${HISTORY_ICON}</span>`;
    if (s === 'empty' || s === 'error') { this.#mark(null); this.#strip.innerHTML = `${glyph}<span class="tt-say"${s === 'error' ? ' role="alert"' : ''}>${esc(s === 'error' ? T.error : T.empty)}</span>${x}`; return; }
    const ghost = s === 'loading';
    const steps = ghost ? `<div class="tt-seg"><span class="tt-name">&nbsp;</span><div class="tt-ticks">${'<span class="tt-tick ghost"></span>'.repeat(6)}</div></div>`
      : this.#steps.map((step) => `<div class="tt-seg" data-group="${esc(step.group)}"><span class="tt-name">${esc(step.name)}</span><div class="tt-ticks">${step.changes.map((c) => {
        const i = this.#flat.findIndex((f) => f.id === c.id), fresh = !this.#seen.has(c.id);
        return `<span class="tt-tick${fresh && this.#seen.size ? ' enter' : ''}" data-i="${i}" data-id="${esc(c.id)}" data-state="${esc(c.state)}"${c.undoes ? ' data-undo' : ''}></span>`;
      }).join('')}</div></div>`).join('');
    for (const c of this.#flat) this.#seen.add(c.id);
    this.#strip.innerHTML = `${glyph}<div class="tt-track" role="slider" tabindex="0" aria-label="${esc(T.slider)}"><div class="tt-steps">${steps}<span class="tt-head" aria-hidden="true"${ghost ? ' hidden' : ''}></span></div></div>`
      + `<span class="tt-now" aria-hidden="true">${esc(T.now)}</span><div class="tt-pill" aria-hidden="true" hidden></div>`
      + `<div class="tt-acts"><button type="button" class="primary" data-act="back" hidden>${esc(T.goBack)}<kbd>↵</kbd></button><button type="button" data-act="change" disabled>${esc(T.undoChange)}<kbd>⌫</kbd></button><button type="button" data-act="step" disabled>${esc(T.undoStep)}<kbd>⇧⌫</kbd></button></div>${x}`;
    if (!ghost) this.#point(this.#at, true);
  }

  // point the playhead at change i: the tick, the head, the pill, the slider's value, the actions
  #point(i, instant = false) {
    const n = this.#flat.length;
    if (!n) return;
    this.#at = Math.max(0, Math.min(n - 1, i));
    const c = this.#flat[this.#at], track = this.#strip.querySelector('.tt-track');
    for (const t of this.#strip.querySelectorAll('.tt-tick[aria-current]')) t.removeAttribute('aria-current');
    const tick = this.#strip.querySelector(`.tt-tick[data-i="${this.#at}"]`);
    tick?.setAttribute('aria-current', 'true');
    // keep it in view: the strip scrolls, the page never does
    if (tick && track) {
      const tr = track.getBoundingClientRect(), r = tick.getBoundingClientRect();
      if (r.left < tr.left + 8) track.scrollLeft -= tr.left + 8 - r.left; else if (r.right > tr.right - 8) track.scrollLeft += r.right - (tr.right - 8);
    }
    const head = this.#strip.querySelector('.tt-head'), steps = this.#strip.querySelector('.tt-steps');
    if (head && tick && steps) {
      if (instant) head.style.transition = 'none';
      head.style.translate = `${tick.offsetLeft + tick.offsetWidth / 2}px 0`; // the tick's offsetParent is .tt-steps
      if (instant) requestAnimationFrame(() => { head.style.transition = ''; });
    }
    const laws = lawsOf(c);
    track?.setAttribute('aria-valuemin', '1'); track?.setAttribute('aria-valuemax', String(n)); track?.setAttribute('aria-valuenow', String(this.#at + 1));
    track?.setAttribute('aria-valuetext', c.outside ? T.valuetextOutside(this.#at + 1, n, c.outside === 'later' ? T.changedRun(c.count) : T.outsideRun(c.count)) : T.valuetext(this.#at + 1, n, c.step.name, c.from.trim(), c.to.trim(), laws));
    // the page as it was here: everything to the right previewed undone; the marks read the page after it. One read
    // of the page's stamps serves both
    const index = pageIndex();
    this.#show(this.#at, index);
    for (const t of this.#strip.querySelectorAll('.tt-tick[data-i]')) t.toggleAttribute('data-ahead', +t.dataset.i > this.#at && live(this.#flat[+t.dataset.i]));
    const els = this.#mark(c, index);
    this.#pill(c, tick, laws, instant, els.length > 0);
    const [back, change, step] = this.#strip.querySelectorAll('.tt-acts button');
    if (back) { back.hidden = !this.#past; back.disabled = this.#busy; }
    if (change) change.disabled = this.#busy || !live(c);
    if (step) { step.hidden = this.#past; step.disabled = this.#busy || !c.step.changes.some(live); }
  }

  #pill(c, tick, laws, instant, onPage = true) {
    const pill = this.#strip.querySelector('.tt-pill');
    if (!pill || !tick) return;
    const warn = this.#warn?.id === c.id ? this.#warn : null;
    pill.dataset.kind = warn?.kind ?? '';
    pill.innerHTML = warn ? esc(warn.text) : c.outside ? esc(c.outside === 'later' ? T.changedRun(c.count) : T.outsideRun(c.count))
      : `${c.undoes ? `<span class="tt-kind">${esc(T.undo)}</span>` : ''}${esc(c.from.trim() || '∅')} → ${esc(c.to.trim() || '∅')}${laws.map((l) => `<span class="tt-law">${esc(l)}</span>`).join('')}${onPage ? '' : `<span class="tt-where">${esc(T.notHere)}</span>`}`;
    pill.hidden = false;
    // centred on the tick, slid along its line to stay whole on screen
    const sr = this.#strip.getBoundingClientRect(), tr = tick.getBoundingClientRect(), w = pill.offsetWidth;
    const centre = tr.left + tr.width / 2, left = Math.max(16, Math.min(innerWidth - 16 - w, centre - w / 2));
    if (instant) pill.style.transition = 'none';
    pill.style.translate = `${left - sr.left}px 0`;
    if (instant) requestAnimationFrame(() => { pill.style.transition = ''; });
  }

  // outline the change's elements; scroll the first into view when none of them can be seen. null clears
  #mark(c, index) {
    const els = c && !c.outside ? elementsOf(c, index).slice(0, MARKS) : [];
    const same = els.length === this.#marked.length && els.every((el, i) => el === this.#marked[i]);
    this.#marked = els;
    if (!els.length) { this.#marks.hidden = true; this.#marks.replaceChildren(); return els; }
    const seen = els.some((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
    if (!seen) els[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: still() ? 'instant' : 'smooth' });
    if (!same) {
      // reuse the boxes already drawn so they travel to the new elements; new ones fade in
      const boxes = [...this.#marks.children];
      while (boxes.length > els.length) boxes.pop().remove();
      while (boxes.length < els.length) { const b = Object.assign(document.createElement('div'), { className: 'tt-mark enter' }); this.#marks.append(b); boxes.push(b); }
    }
    this.#marks.hidden = false;
    this.#place();
    return els;
  }
  // every mark on its element: read all the boxes, then write them
  #place() {
    const rects = this.#marked.map((el) => el.getBoundingClientRect()), boxes = this.#marks.children, pad = 4;
    rects.forEach((r, i) => {
      const b = boxes[i]; if (!b) return;
      // a new box starts on its element; only a box already drawn travels
      const fresh = !b.dataset.placed;
      if (fresh) { b.style.transition = 'none'; b.dataset.placed = '1'; requestAnimationFrame(() => { b.style.transition = ''; }); }
      b.style.translate = `${Math.round(r.left - pad)}px ${Math.round(r.top - pad)}px`;
      b.style.width = `${Math.round(r.width + 2 * pad)}px`; b.style.height = `${Math.round(r.height + 2 * pad)}px`;
      b.style.opacity = r.width || r.height ? '' : '0';
    });
  }

  #pointAt(clientX) {
    let best = -1, gap = Infinity;
    for (const t of this.#strip.querySelectorAll('.tt-tick[data-i]')) { const r = t.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - clientX); if (d < gap) { gap = d; best = +t.dataset.i; } }
    if (best >= 0 && best !== this.#at) { this.#warn = null; this.#point(best); }
  }

  #key(e) {
    if (!e.target.closest?.('.tt-track') && !['Backspace', 'Delete'].includes(e.key)) return;
    const n = this.#flat.length, c = this.#flat[this.#at];
    let next = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      if (!e.shiftKey) next = this.#at + dir;
      else { const s = this.#steps.indexOf(c?.step) + dir, step = this.#steps[Math.max(0, Math.min(this.#steps.length - 1, s))]; next = this.#flat.findIndex((f) => f.id === (dir < 0 ? step.changes[0] : step.changes.at(-1)).id); }
    } else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Enter' && this.#past) { e.preventDefault(); e.stopPropagation(); this.#goBack(); return; }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); this.#undo(e.shiftKey ? 'step' : 'change'); return; }
    else return;
    e.preventDefault(); e.stopPropagation();
    this.#warn = null;
    this.#point(next);
  }

  async #undo(kind) {
    const c = this.#flat[this.#at];
    if (!c || this.#busy) return;
    if (kind === 'change' && !live(c)) return this.#refuse(c, reasonOf(c), 'warn');
    if (kind === 'step' && !c.step.changes.some(live)) return this.#refuse(c, reasonOf(c), 'warn');
    const targets = kind === 'change' ? [c] : c.step.changes.filter(live);
    this.#show(-1);
    this.#busy = true;
    for (const t of targets) this.#strip.querySelector(`.tt-tick[data-id="${CSS.escape(t.id)}"]`)?.classList.add('busy');
    this.#point(this.#at);
    this.#host.announce?.(T.undoing);
    this.#remember();
    try {
      const done = kind === 'change' ? await post('undo-change', { id: c.id }) : await post('undo-group', { group: c.group });
      const said = kind === 'change' ? T.undone(c.from.trim() || '∅', c.to.trim() || '∅') : T.undoneStep(done?.undone?.length ?? targets.length);
      this.#remember(said);
      this.#host.announce?.(said);
      this.#at = Infinity;
      this.#busy = false;
      await this.#load();
      this.#host.changed?.();
    } catch (error) {
      this.#busy = false;
      const message = error?.message ?? '';
      this.#refuse(c, whyNot(error), 'warn');
    }
  }

  #remember(said = null) { try { sessionStorage.setItem(RESUME_TT, JSON.stringify({ at: Date.now(), said })); } catch {} }

  // Go back to here: every live change right of the playhead, undone in one write, all or nothing
  async #goBack() {
    if (!this.#past || this.#busy) return;
    const ahead = this.#flat.slice(this.#at + 1).filter(live), c = this.#flat[this.#at];
    if (!ahead.length) return;
    this.#show(-1);
    this.#busy = true;
    for (const t of ahead) this.#strip.querySelector(`.tt-tick[data-id="${CSS.escape(t.id)}"]`)?.classList.add('busy');
    this.#host.announce?.(T.undoing);
    this.#remember();
    try {
      const done = await post('undo-changes', { ids: ahead.map((t) => t.id) });
      const said = T.undoneStep(done?.undone?.length ?? ahead.length);
      this.#remember(said);
      this.#host.announce?.(said);
      this.#at = Infinity;
      this.#busy = false;
      await this.#load();
      this.#host.changed?.();
    } catch (error) {
      this.#busy = false;
      const message = error?.message ?? '';
      this.#refuse(c, whyNot(error), 'warn');
    }
  }

  // What each class sets, from the project's own Tailwind: one POST try for every class the trace names
  async #learn() {
    const tokens = [...new Set(this.#flat.filter(live).flatMap((c) => `${c.from} ${c.to}`.split(/\s+/)).filter((t) => t && /^[^\s"'`<>{}]+$/.test(t) && !this.#decl.has(t)))];
    if (!tokens.length) return;
    try {
      const said = await post('try', { code: `<div className="${tokens.join(' ')}" />`, lang: 'tsx' });
      for (const t of tokens) this.#decl.set(t, []);
      for (const d of said?.declarations ?? []) {
        const token = d.site?.text, plain = (d.when ?? []).every((w) => w.kind === 'selector');
        if (token && plain && this.#decl.has(token) && d.prop && d.value != null) this.#decl.get(token).push([d.prop, String(d.value)]);
      }
    } catch { /* no preview of classes; the timeline still works */ }
  }

  // Show the page as it was after change `at` (-1: as it is): restore what was shown, then undo every live change to
  // the right on its elements, newest first. Reads (the elements) before writes; nothing is written to source.
  #show(at, index) {
    for (const undo of this.#shown.reverse()) undo();
    this.#shown = [];
    this.#pastStyles.clear(); // the styles an earlier state had: the page's own come back (claims.js)
    const last = this.#flat.length - 1, past = at >= 0 && at < last && this.#status === 'ready';
    if (past !== this.#past) { this.#past = past; this.#strip.toggleAttribute('data-past', past); if (past) this.#host.announce?.(T.past(this.#flat.slice(at + 1).filter(live).length)); }
    if (!past) return;
    performance.mark('plumb:tt-preview-start');
    index ??= pageIndex();
    const ahead = this.#flat.slice(at + 1).filter(live).reverse().map((c) => [c, elementsOf(c, index)]);
    for (const [c, els] of ahead) for (const el of els) this.#unshow(c, el);
    performance.measure('plumb:tt-preview', 'plumb:tt-preview-start');
  }
  // one change, undone on one element, with what puts it back
  #unshow(c, el) {
    const words = (v) => String(v ?? '').split(/\s+/).filter(Boolean);
    const added = words(c.to), taken = words(c.from);
    const isClass = added.length ? added.every((t) => el.classList.contains(t)) : taken.length && taken.every((t) => this.#decl.get(t)?.length);
    if (isClass) {
      const off = added.filter((t) => el.classList.contains(t));
      el.classList.remove(...off);
      for (const t of taken) for (const [prop, value] of this.#decl.get(t) ?? []) this.#pastStyles.set(el, prop, value);
      this.#shown.push(() => el.classList.add(...off));
      return;
    }
    // words: the text node that holds what the change wrote gets back what it said before
    if (!c.to) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.includes(c.to)) continue;
      const before = n.nodeValue;
      n.nodeValue = before.replace(c.to, c.from);
      this.#shown.push(() => { n.nodeValue = before; });
      return;
    }
  }

  // a change that can't be taken back: the tick shakes, the pill says why and what to do instead
  #refuse(c, text, kind) {
    this.#warn = { id: c.id, text, kind };
    for (const t of this.#strip.querySelectorAll('.tt-tick.busy')) t.classList.remove('busy');
    this.#point(this.#at);
    const tick = this.#strip.querySelector(`.tt-tick[data-id="${CSS.escape(c.id)}"]`);
    tick?.classList.remove('shake'); void tick?.offsetWidth; tick?.classList.add('shake');
    this.#host.announce?.(text);
  }

  #say(text, undo = false, kind = '') {
    // the toast before this one: its time and its leaving end here, so neither can hide this one
    this.#toastScope?.end();
    const toast = (this.#toastScope = this.#life.child());
    this.#toast.dataset.kind = kind;
    this.#toast.innerHTML = `<span class="what">${esc(text)}</span>${undo ? '<button type="button" class="undo">Undo</button>' : ''}`;
    this.#toast.hidden = false;
    // the timeline open in the same corner: the toast sits above it, never under it
    this.#toast.style.insetBlockEnd = this.open ? `${innerHeight - this.#strip.getBoundingClientRect().top + 8}px` : '';
    toast.frame(() => this.#toast.setAttribute('data-on', ''));
    toast.timeout(() => {
      this.#toast.removeAttribute('data-on');
      toast.timeout(() => { this.#toast.hidden = true; toast.end(); }, 160);
      try { sessionStorage.removeItem(RESUME); } catch {}
    }, HOLD);
  }

  // this page came back from a reload with something History heard before it and says again now
  #resumed = false;
  get resumed() { return this.#resumed; }

  #resume() {
    let open;
    try { open = JSON.parse(sessionStorage.getItem(RESUME_TT) ?? 'null'); } catch {}
    if (open && Date.now() - open.at < 15000) setTimeout(() => {
      if (this.open) return;
      this.#button.setAttribute('aria-pressed', 'true');
      this.#strip.hidden = false; this.#seen.clear(); this.#at = -1; this.#status = 'loading';
      this.#render(); this.#load(20);
      if (open.said) this.#host.announce?.(open.said);
    }, 150);
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    this.#resumed = true;
    this.#last = { handle: saved.handle ?? null, group: saved.group ?? null };
    setTimeout(() => this.#say(saved.text, true), 150);
  }
}

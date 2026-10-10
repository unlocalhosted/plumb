/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD · Plumb overlay
 *
 *  idle        nothing listens but the Alt key
 *  Alt down    armed: the pointer reads the page; the reticle settles on the element under it
 *    90ms      the element is read; its tag hangs below it: "div · SyncRow · 6 off"
 *  click       pinned: the tag becomes the reading's header in place, the body fades up 4px into it
 *   120ms      the first mark's place lights on the real element
 *  pick a row  the element changes on the page at once (a preview), the mark turns on-system
 *  Write       edits go to source; the preview is lifted as the dev server reloads the real classes
 *  Esc         the reading closes; any unwritten preview is lifted
 *  starting    while Plumb reads the project for the first time, the tag and reading say so and ask again each second
 *  reduced motion: every step is instant (durations come from tokens that collapse to 0)
 * ───────────────────────────────────────────────────────── */
const TIMING = { hoverRead: 90, light: 120, swap: 140, reread: [250, 600, 1200, 2400], starting: 1000, maxDrawing: 160 };

import { locate } from './locate.js';
import { request, post } from './api.js';
import { reading, offCount } from './model.js';
import { regionFor, outlineOf, childrenOf, hostIsDark, hostGround } from './geometry.js';
import { GLYPH_CSS, glyph } from './glyphs.js';

const tokensCss = await (await fetch(new URL('./tokens.css', import.meta.url))).text();
const RESUME = 'plumb:resume';

// Why an element has no source line, in the person's terms. Plumb never guesses one.
function unplaced(found) {
  const detail = found?.detail ?? {}, response = String(detail.response ?? '');
  if (found?.reason === 'resolve-refusal' && /not a tracked project source/.test(response)) {
    let file = String(detail.file ?? detail.source ?? '');
    if (!detail.file) try { file = decodeURIComponent(new URL(file, location.href).pathname).replace(/^\/@fs/, ''); } catch {}
    return { short: `not checked: ${file}`, message: `This element is written in \`${file}\`, which Plumb doesn’t check. Add it to \`source\` in your Plumb config to read it here.` };
  }
  if (found?.reason === 'no-fiber') return { short: 'not from React', message: 'This element wasn’t rendered by React (HTML written at runtime, or outside your app), so it has no line in your source.' };
  if (found?.reason === 'runtime-only-frames' || found?.reason === 'owner-unproven')
    return { short: 'library only', message: 'A library rendered this element, and Plumb can’t prove which line of your code used it. Point at the component that wraps it instead.' };
  if (found?.reason === 'map') return { short: 'no source map', message: 'The dev server’s source map for this element doesn’t lead back to your source, so Plumb won’t guess a line.' };
  return { short: 'not placed', message: 'Plumb can’t tie this element to a line in your source, so it won’t guess one.' };
}
// A structural path survives a reload of the same app state; ids and classes may not (the write changes classes).
const pathTo = element => {
  const parts = [];
  for (let n = element; n && n !== document.documentElement; n = n.parentElement) parts.unshift(`${n.localName}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
  return ['html', ...parts].join(' > ');
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const code = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const css = `
  :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: var(--pl-z); font: var(--pl-text-row); color: var(--pl-ink); }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  code { font: var(--pl-text-reading); }

  /* the reticle: four corner arms that travel to the element under the pointer */
  .tick { position: fixed; left: 0; top: 0; width: var(--pl-tick); height: var(--pl-tick); transition: transform var(--pl-dur-travel) var(--pl-spring); }
  .tick::before, .tick::after { content: ""; position: absolute; background: var(--pl-instrument); box-shadow: 0 0 0 1px var(--pl-halo); }
  .tick::before { width: var(--pl-tick); height: 1px; } .tick::after { width: 1px; height: var(--pl-tick); }

  /* the hover tag: what the pointer is on, before anything is pinned */
  .tag { position: fixed; left: 0; top: 0; height: var(--pl-tag-h); display: flex; align-items: center; gap: 6px; padding-inline: 8px; white-space: nowrap;
         background: var(--pl-paper); border-radius: var(--pl-radius-tag); box-shadow: var(--pl-shadow-tag); font: var(--pl-text-label);
         transition: transform var(--pl-dur-travel) var(--pl-spring), opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .tag .el, .top .el { font-weight: 600; color: var(--pl-ink); }
  .tag .who, .top .who { color: var(--pl-ink-2); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tag .n, .top .n, .top .el, .top .zoom, .top .close { flex: none; }
  .tag .n, .top .n { font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-off); }
  .n.ok { color: var(--pl-on); } .n.quiet { color: var(--pl-ink-2); }

  /* the lit place on the real element: hatching over exactly the region the active mark is about */
  .lit { position: fixed; left: 0; top: 0; border-radius: 2px; opacity: 0; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out);
         background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--pl-off) 55%, transparent) 0 1px, transparent 1px 4px); box-shadow: inset 0 0 0 1px var(--pl-off); }
  .lit.soft { background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--pl-soft) 55%, transparent) 0 1px, transparent 1px 4px); box-shadow: inset 0 0 0 1px var(--pl-soft); }
  .lit.ok { background: none; box-shadow: inset 0 0 0 1px var(--pl-on); }
  .lit.on { opacity: 1; }
  .lit.frame { background: none; }
  .lit.ring { background: none; border-radius: 50%; }

  /* the reading: one card, positioned by transform; the inner card carries the open motion */
  .w { position: fixed; left: 0; top: 0; pointer-events: auto; }
  .card { background: var(--pl-paper); color: var(--pl-ink); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); overflow: clip;
          transform-origin: 24px 0; transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); }
  .w[data-state="opening"] .card { opacity: 0; transform: translateY(-4px); }
  .card:focus { outline: none; } /* the dialog takes focus so keys reach it; its controls show focus, the card does not */

  .top { height: var(--pl-tag-h); display: flex; align-items: center; gap: 6px; padding-inline: 8px; font: var(--pl-text-label); white-space: nowrap; background: var(--pl-paper); }
  .top .file { all: unset; flex: 0 1 auto; min-width: 0; font: var(--pl-text-reading); color: var(--pl-ink-2); margin-inline-start: auto; padding-inline-start: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .top .file:hover { color: var(--pl-ink); } }
  .top .zoom { display: flex; gap: 1px; margin-inline-start: 6px; }
  .top button.z, .top .close { all: unset; font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-ink-2); padding: 0 4px; height: 16px; line-height: 16px; border-radius: 2px; cursor: pointer; }
  .top button.z[aria-pressed="true"] { color: var(--pl-instrument); background: var(--pl-paper-2); }
  .top button.z:disabled { color: var(--pl-ink-3); cursor: default; }
  .top .close { display: grid; place-items: center; width: 16px; padding: 0; margin-inline-start: 2px; }
  .top .close svg { width: 10px; height: 10px; }
  .top button:focus-visible, .top .file:focus-visible { outline: 1px solid var(--pl-instrument); }

  /* the skeleton: the element at its real proportions, marks set into its outline */
  .diagram { position: relative; margin: 10px 12px 0; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .diagram.swapping { opacity: 0; }
  .d-child { position: absolute; box-shadow: inset 0 0 0 1px var(--pl-ink-3); }
  .d-child.text { box-shadow: none; }
  .d-child b { position: absolute; border-radius: 2px; background: var(--pl-ink-3); opacity: 0.7; }
  .outline { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
  .outline path { fill: none; stroke: var(--pl-ink-3); stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .outline .reg { fill: transparent; transition: fill var(--pl-dur-feedback) var(--pl-ease-out); }
  .outline .reg[data-active] { fill: color-mix(in oklab, var(--pl-off) 20%, transparent); }
  .outline .reg.soft[data-active] { fill: color-mix(in oklab, var(--pl-soft) 22%, transparent); }
  .outline .reg.ok[data-active] { fill: color-mix(in oklab, var(--pl-on) 18%, transparent); }
  .pin { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border: 0; padding: 0; cursor: pointer; background: transparent; color: var(--pl-ink-2);
         display: grid; place-items: center; border-radius: 3px; transition: color var(--pl-dur-feedback) var(--pl-ease-out); }
  .pin .g { width: 13px; height: 13px; transform: var(--orient, none); }
  .pin.on-arc { background: var(--pl-paper); border-radius: 50%; }
  .pin.quiet { color: var(--pl-ink-3); }
  .pin[aria-current="true"] { color: var(--pl-off); }
  .pin.soft[aria-current="true"] { color: var(--pl-soft); }
  .pin.ok, .pin.ok[aria-current="true"] { color: var(--pl-on); }
  .pin:focus-visible { outline: 1px solid var(--pl-instrument); outline-offset: 1px; }
  @media (hover: hover) and (pointer: fine) { .pin:not([aria-current="true"]):hover { color: var(--pl-ink); } }

  /* the one reading line */
  .read { margin: 6px 12px 0; padding-block: 10px 12px; display: grid; gap: 10px; min-height: 120px; align-content: start; }
  .read > * { transition: opacity var(--pl-dur-feedback) var(--pl-ease-out); }
  .read.swapping > * { opacity: 0; }
  .read .t { display: flex; align-items: flex-start; gap: 8px; font: var(--pl-text-title); font-weight: 500; text-wrap: balance; }
  .read .t .g { width: 14px; height: 14px; margin-top: 2px; color: var(--pl-off); }
  .read .t .g.soft { color: var(--pl-soft); } .read .t .g.ok { color: var(--pl-on); } .read .t .g.quiet { color: var(--pl-ink-2); }
  .read .because { font: var(--pl-text-row); color: var(--pl-ink-2); margin-top: -6px; }
  .read .empty { margin: 0; font: var(--pl-text-row); color: var(--pl-ink-2); }
  .read.short { min-height: 0; }

  /* comparisons: tokens and yours side by side, each family in its own material; token rows are the choice */
  .cmp { display: grid; gap: 2px; }
  .opt { all: unset; box-sizing: border-box; display: grid; align-items: center; gap: 10px; min-height: 22px; padding: 2px 6px; margin-inline: -6px; border-radius: var(--pl-radius-tag); cursor: pointer; }
  .opt.you { cursor: default; }
  .opt[aria-pressed="true"] { background: var(--pl-paper-2); }
  @media (hover: hover) and (pointer: fine) { .opt:not(.you):hover { background: var(--pl-paper-2); } }
  .opt:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 1px; }
  .v { font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-ink-2); text-align: end; white-space: nowrap; }
  .opt.you .v { color: var(--pl-off); font-weight: 600; }
  .who { display: flex; align-items: baseline; gap: 6px; font: var(--pl-text-reading); white-space: nowrap; min-width: 0; }
  .who b { font-weight: 500; color: var(--pl-ink); }
  .who small { font: var(--pl-text-label); color: var(--pl-ink-2); overflow: hidden; text-overflow: ellipsis; }
  .who.you { color: var(--pl-off); font: var(--pl-text-label); font-weight: 600; letter-spacing: var(--pl-tracking-label); }
  .opt[aria-pressed="true"] .who b::after { content: "use"; margin-inline-start: 6px; font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-paper); background: var(--pl-ink); padding: 0 4px; border-radius: var(--pl-radius-mark); }

  .spacing .opt { grid-template-columns: 34px var(--bars, 160px) minmax(0, 1fr); }
  .spacing .bar { display: flex; align-items: center; height: 10px; }
  .spacing .bar i { height: 8px; border-radius: 1px; background: color-mix(in oklab, var(--pl-ink-3) 55%, transparent); box-shadow: inset 0 0 0 1px var(--pl-ink-3); }
  .spacing .opt[aria-pressed="true"] .bar i { background: var(--pl-ink); box-shadow: none; }
  .spacing .opt.you .bar i { background: repeating-linear-gradient(-45deg, var(--pl-off) 0 1.5px, transparent 1.5px 4px); box-shadow: inset 0 0 0 1px var(--pl-off); }

  .radius { grid-template-columns: max-content 1fr; align-items: center; gap: 14px; }
  .radius svg path { fill: none; stroke: var(--pl-ink-3); stroke-width: 1; }
  .radius svg path.pick { stroke: var(--pl-ink); stroke-width: 1.5; }
  .radius svg path.you { stroke: var(--pl-off); stroke-width: 1.5; stroke-dasharray: 3 2; }
  .radius .list { display: grid; gap: 2px; }
  .radius .opt { grid-template-columns: 34px 1fr; }

  .type .opt { grid-template-columns: 1fr 40px minmax(130px, auto); align-items: baseline; }
  .type .spec { font-family: var(--spec-font, system-ui, sans-serif); font-weight: var(--spec-weight, 500); color: var(--pl-ink); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .type .opt.you .spec { color: var(--pl-off); }

  .plates { grid-auto-flow: column; justify-content: start; gap: 8px; padding: 10px; border-radius: 4px; background: var(--ground); box-shadow: inset 0 0 0 1px var(--pl-rule); overflow-x: auto; }
  .plates .opt { grid-template-columns: auto; justify-items: center; gap: 8px; margin: 0; padding: 6px 8px; }
  .plates .plate { width: 56px; height: 32px; border-radius: 7px; }
  .plates .who small { display: none; }
  .plates .opt[aria-pressed="true"] { background: color-mix(in oklab, var(--pl-paper) 70%, transparent); }

  .chips { grid-auto-flow: column; justify-content: start; align-items: center; gap: 8px; overflow-x: auto; }
  .chips .opt { grid-template-columns: auto auto; gap: 6px; margin: 0; }
  .chips .chip { width: 22px; height: 22px; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--pl-rule); }

  .list .opt { grid-template-columns: minmax(0, 1fr) auto; }

  .read .edit { display: flex; align-items: center; gap: 8px; font: var(--pl-text-reading); flex-wrap: wrap; }
  .read .edit s { color: var(--pl-ink-2); text-decoration-color: var(--pl-off); }
  .read .edit b { font-weight: 600; }
  .read .edit .hint { font: var(--pl-text-row); color: var(--pl-ink-2); }
  .read .edit .ledger { margin-inline-start: auto; font: var(--pl-text-label); color: var(--pl-ink-2); }
  .read .edit .ledger.new { color: var(--pl-ink); }

  .notes { margin: 0 12px 10px; display: grid; gap: 4px; }
  .notes p { margin: 0; font: var(--pl-text-label); color: var(--pl-ink-2); display: flex; gap: 6px; align-items: baseline; }
  .notes p::before { content: ""; flex: none; width: 4px; height: 4px; border-radius: 50%; background: var(--pl-ink-3); transform: translateY(-2px); }

  .foot, .synced { display: flex; align-items: center; gap: 4px; padding: 8px 8px 8px 12px; box-shadow: 0 -1px 0 var(--pl-rule); }
  .foot .count { font: var(--pl-text-reading); font-variant-numeric: tabular-nums; color: var(--pl-ink-2); margin-inline-end: auto; }
  .nav { width: 26px; height: 26px; border: 0; border-radius: var(--pl-radius-tag); background: transparent; color: var(--pl-ink-2); cursor: pointer; display: grid; place-items: center; }
  .nav svg { width: 12px; height: 12px; }
  .nav:disabled { color: var(--pl-ink-3); cursor: default; }
  @media (hover: hover) and (pointer: fine) { .nav:not(:disabled):hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .btn { height: 26px; padding-inline: 10px; border: 0; border-radius: var(--pl-radius-tag); background: transparent; color: var(--pl-ink-2); font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); cursor: pointer; white-space: nowrap; }
  .btn.sync { color: var(--pl-instrument); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-instrument) 45%, var(--pl-paper)); }
  @media (hover: hover) and (pointer: fine) { .btn.sync:not(:disabled):hover { background: color-mix(in oklab, var(--pl-instrument) 10%, var(--pl-paper)); } .btn.plain:not(:disabled):hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .btn.solid { background: var(--pl-ink); color: var(--pl-paper); margin-inline-start: 4px; }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn[aria-pressed="true"] { background: var(--pl-paper-2); color: var(--pl-ink); }
  .btn[aria-busy="true"] { cursor: progress; }
  .btn:focus-visible, .nav:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
  .synced .state { font: var(--pl-text-label); color: var(--pl-on); margin-inline-end: auto; display: flex; align-items: center; gap: 6px; min-width: 0; }
  .synced .state::before { content: ""; flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .synced .state.warn { color: var(--pl-soft); } .synced .state.err { color: var(--pl-off); } .synced .state.quiet { color: var(--pl-ink-2); }
  .w[data-synced] .foot { display: none; }
`;

const ICON = {
  prev: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  next: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
};

class PlumbOverlay extends HTMLElement {
  #root; #cache = new WeakMap(); #armed = false; #hover = null; #hoverTimer = 0; #pinned = null; #frame = 0; #focusBack = null;

  connectedCallback() {
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = `<style>${tokensCss}${GLYPH_CSS}${css}</style>
      <i class="tick" data-c="tl" hidden></i><i class="tick" data-c="tr" hidden></i><i class="tick" data-c="bl" hidden></i><i class="tick" data-c="br" hidden></i>
      <div class="tag" hidden aria-hidden="true"></div>
      <i class="lit"></i>
      <section class="w" hidden></section>`;
    addEventListener('keydown', this.#onKeyDown, true);
    addEventListener('keyup', this.#onKeyUp, true);
    addEventListener('blur', this.#disarm);
    this.#resume();
  }

  // A write can make the dev server reload the whole page (no fast refresh). The reading picks up where it was: the
  // same element, found by its place in the document and confirmed by its source file, with the write reported.
  async #resume() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); sessionStorage.removeItem(RESUME); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    await new Promise(r => setTimeout(r, 120)); // let the app render first
    const element = document.querySelector(saved.path);
    if (!element) return;
    const location = await locate(element);
    if (location?.file !== saved.file || location.tag !== saved.tag) return;
    await this.pin(element);
    if (this.#pinned?.element === element && this.#pinned.state.status === 'ready') { this.#pinned.status = { kind: 'written', text: saved.text }; this.#updateSync(); }
  }

  disconnectedCallback() {
    this.close(); this.#disarm();
    removeEventListener('keydown', this.#onKeyDown, true);
    removeEventListener('keyup', this.#onKeyUp, true);
    removeEventListener('blur', this.#disarm);
  }

  // ── reading an element ────────────────────────────────────
  // One read per element until something is written; the hover tag and the pinned reading share it.
  read(element, fresh = false) {
    if (!fresh && this.#cache.has(element)) return this.#cache.get(element);
    const promise = (async () => {
      const found = await locate(element, { explain: true });
      if (!found?.file) return { status: 'unplaced', tag: element.localName, ...unplaced(found) };
      const location = found;
      const params = { file: location.file, line: location.line, column: location.column };
      const [site, edits] = await Promise.all([request('site', params), request('edits', params)]);
      if (!site) return { status: 'error', tag: location.tag, location, message: "Plumb couldn't read this element." };
      return { status: 'ready', ...reading(location, site, edits) };
    })().catch(error => error?.starting
      ? { status: 'starting', tag: element.localName, message: 'Plumb is still reading your project…' }
      : error?.failed ? { status: 'error', tag: element.localName, short: 'Plumb couldn’t start', message: `Plumb couldn’t start: ${error.message}` }
      : { status: 'error', tag: element.localName, message: error?.message ?? "Plumb isn't answering." });
    this.#cache.set(element, promise);
    // A first read still in progress is not an answer; ask again next time.
    promise.then(state => { if (state.status === 'starting' && this.#cache.get(element) === promise) this.#cache.delete(element); });
    return promise;
  }

  // ── armed: Alt held ──────────────────────────────────────
  #onKeyDown = event => {
    if (event.key === 'Alt' && !event.repeat) this.#arm();
    else if (event.key === 'Escape' && this.#pinned) { event.preventDefault(); event.stopPropagation(); this.close(); }
  };
  #onKeyUp = event => { if (event.key === 'Alt') this.#disarm(); };

  #arm() {
    if (this.#armed) return;
    this.#armed = true;
    addEventListener('pointermove', this.#onMove, true);
    addEventListener('click', this.#onClick, true);
    addEventListener('pointerdown', this.#swallow, true);
    document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
  }
  #disarm = () => {
    if (!this.#armed) return;
    this.#armed = false; clearTimeout(this.#hoverTimer);
    removeEventListener('pointermove', this.#onMove, true);
    removeEventListener('click', this.#onClick, true);
    removeEventListener('pointerdown', this.#swallow, true);
    document.documentElement.style.removeProperty('cursor');
    this.#hover = null;
    this.#showReticle(this.#pinned?.element ?? null);
    this.#$('.tag').hidden = true;
    this.#follow();
  };
  #swallow = event => { if (this.#armed && !this.#ours(event)) { event.preventDefault(); event.stopPropagation(); } };
  #ours = event => event.composedPath().includes(this);

  #onMove = event => {
    if (this.#ours(event)) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element === this.#hover?.element || element === document.documentElement || element === document.body) return;
    this.#hover = { element, state: null };
    this.#showReticle(element);
    this.#renderTag(element, null);
    clearTimeout(this.#hoverTimer);
    this.#hoverTimer = setTimeout(async () => {
      const state = await this.read(element);
      if (this.#hover?.element === element) { this.#hover.state = state; this.#renderTag(element, state); }
    }, TIMING.hoverRead);
    this.#follow();
  };

  #onClick = event => {
    if (this.#ours(event)) return;
    event.preventDefault(); event.stopPropagation();
    // The click's own point decides, not the last hover: a pointer can arrive without moving first.
    const element = document.elementFromPoint(event.clientX, event.clientY) ?? this.#hover?.element;
    if (element && element !== document.documentElement && element !== document.body) this.pin(element);
  };

  #renderTag(element, state) {
    const tag = this.#$('.tag');
    this.dataset.scheme = hostIsDark(element) ? 'dark' : 'light';
    tag.innerHTML = this.#label(element, state);
    tag.hidden = false;
    this.#placeTag(element);
  }

  #label(element, state) {
    const name = `<span class="el">${esc(state?.tag ?? element.localName)}</span>`;
    const who = state?.component ? `<span class="who" title="${state.via === 'owner' ? 'Rendered by a library inside this component' : ''}">${esc(state.component)}</span>` : '';
    if (!state) return `${name}${who}<span class="n quiet">reading…</span>`;
    if (state.status === 'unplaced') return `${name}<span class="n quiet">${esc(state.short)}</span>`;
    if (state.status === 'starting') return `${name}<span class="n quiet">${esc(state.message)}</span>`;
    if (state.status === 'error') return `${name}${who}<span class="n">${esc(state.short ?? state.message)}</span>`;
    const off = offCount(state);
    if (!state.marks.length && !state.declared) return `${name}${who}<span class="n quiet">computed here</span>`;
    return `${name}${who}<span class="n ${off ? '' : 'ok'}">${off ? `${off} off` : 'on system'}</span>`;
  }

  // ── geometry that follows the page ───────────────────────
  #showReticle(element) {
    const ticks = this.#root.querySelectorAll('.tick');
    if (!element) { ticks.forEach(t => t.hidden = true); return; }
    const b = element.getBoundingClientRect(), s = 8;
    const at = { tl: [b.left, b.top, 1, 1], tr: [b.right - s, b.top, -1, 1], bl: [b.left, b.bottom - s, 1, -1], br: [b.right - s, b.bottom - s, -1, -1] };
    ticks.forEach(t => { const [x, y, a, d] = at[t.dataset.c]; t.hidden = false; t.style.transform = `translate(${x}px, ${y}px) scale(${a}, ${d})`; });
  }

  #placeTag(element) {
    const tag = this.#$('.tag'), b = element.getBoundingClientRect(), w = tag.offsetWidth, h = tag.offsetHeight;
    const below = b.bottom + 6 + h < innerHeight;
    const x = Math.min(Math.max(8, b.left), innerWidth - w - 8), y = below ? b.bottom + 6 : Math.max(8, b.top - h - 6);
    tag.style.transform = `translate(${x}px, ${y}px)`;
  }

  #placeWidget() {
    const p = this.#pinned; if (!p) return;
    const w = this.#$('.w'), b = p.element.getBoundingClientRect(), width = w.offsetWidth, height = w.offsetHeight;
    let y = b.bottom + 8;
    if (y + height > innerHeight - 8) y = b.top - height - 8 >= 8 ? b.top - height - 8 : Math.max(8, innerHeight - height - 8);
    const x = Math.min(Math.max(8, b.left), Math.max(8, innerWidth - width - 8));
    w.style.transform = `translate(${x}px, ${y}px)`;
    this.#light();
  }

  // Scroll and resize move the page under the overlay; follow it for as long as something is shown, then stop.
  #follow() {
    const visible = this.#armed || this.#pinned;
    if (visible && !this.#frame) {
      this.#frame = -1;
      const tick = () => {
        if (!(this.#armed || this.#pinned)) { this.#frame = 0; return; }
        if (this.#hover?.element && this.#armed) { this.#showReticle(this.#hover.element); if (!this.#$('.tag').hidden) this.#placeTag(this.#hover.element); }
        else if (this.#pinned) this.#showReticle(this.#pinned.element);
        if (this.#pinned) this.#placeWidget();
        this.#frame = requestAnimationFrame(tick);
      };
      this.#frame = requestAnimationFrame(tick);
    }
  }

  // ── pinned ───────────────────────────────────────────────
  async pin(element) {
    if (this.#pinned?.element === element) return;
    this.close();
    this.#focusBack = document.activeElement;
    this.#$('.tag').hidden = true;
    // 1:1 by default; a tiny element opens magnified so its marks have room to sit apart.
    const { width, height } = element.getBoundingClientRect();
    const fit = Math.min((Math.min(480, Math.max(360, width + 24)) - 24) / Math.max(1, width), TIMING.maxDrawing / Math.max(1, height));
    const steps = [1, 2, 4].filter(z => z === 1 || z <= fit);
    const zoom = steps.find(z => width * z >= 160) ?? steps.at(-1);
    const p = this.#pinned = { element, state: null, active: 0, zoom, original: new Map(), styleAttr: element.getAttribute('style'), before: false, status: null };
    this.dataset.scheme = hostIsDark(element) ? 'dark' : 'light';
    this.#showReticle(element);
    // Picks and previews belong to this pin; the cached reading stays as the server said it.
    p.state = structuredClone(await this.read(element));
    if (this.#pinned !== p) return;
    this.#renderWidget(true);
    this.#follow();
    // Pinned during Plumb's first read: say so, and fill the reading in as soon as the project is read.
    while (this.#pinned === p && p.state.status === 'starting') {
      await new Promise(r => setTimeout(r, TIMING.starting));
      if (this.#pinned !== p) return;
      const next = await this.read(element, true);
      if (this.#pinned !== p || next.status === 'starting') continue;
      p.state = structuredClone(next);
      this.#renderWidget();
    }
  }

  close() {
    const p = this.#pinned; if (!p) return;
    this.#restore(p);
    this.#pinned = null;
    this.#$('.w').hidden = true;
    this.#$('.lit').classList.remove('on');
    if (!this.#armed) this.#showReticle(null);
    if (this.#focusBack?.isConnected) this.#focusBack.focus?.({ preventScroll: true });
  }

  #renderWidget(opening = false) {
    const p = this.#pinned, s = p.state, w = this.#$('.w');
    const b = p.element.getBoundingClientRect();
    const width = Math.round(Math.min(480, Math.max(360, b.width + 24)));
    const label = s.status === 'ready' ? `${s.tag}${s.component ? ' in ' + s.component : ''}` : p.element.localName;
    w.hidden = false;
    w.style.width = width + 'px';
    w.innerHTML = `<div class="card" tabindex="-1" role="dialog" aria-label="Plumb reading for ${esc(label)}">
      <div class="top">${this.#label(p.element, s)}
        ${s.status === 'ready' ? `<button class="file" title="${esc(s.file)}:${s.line}:${s.column} · click to copy">${esc(s.file.split('/').pop())}:${s.line}</button>` : ''}
        ${s.status === 'ready' ? `<span class="zoom" role="group" aria-label="Drawing scale">${[1, 2, 4].map(z => `<button class="z" data-z="${z}" aria-pressed="${z === p.zoom}">${z}×</button>`).join('')}</span>` : ''}
        <button class="close" aria-label="Close the reading">${ICON.close}</button></div>
      ${s.status === 'ready' ? `<div class="diagram"></div><div class="read" aria-live="polite"></div>${this.#notes(s)}
        <div class="foot"><span class="count"></span>
          <button class="nav prev" aria-label="Previous mark">${ICON.prev}</button><button class="nav next" aria-label="Next mark">${ICON.next}</button>
          <button class="btn sync">Sync to system</button><button class="btn solid copy">Copy for agent</button></div>
        <div class="synced" hidden><span class="state"></span>
          <button class="btn plain flip" aria-pressed="false">Before</button><button class="btn plain undo">Undo</button><button class="btn solid write">Write edits</button></div>`
        : `<div class="read short"><p class="empty">${s.status === 'unplaced' ? code(s.message) : esc(s.message)}</p></div>`}
    </div>`;
    if (opening) { w.dataset.state = 'opening'; requestAnimationFrame(() => requestAnimationFrame(() => { w.dataset.state = 'open'; })); }
    this.#bindWidget();
    if (s.status === 'ready') { this.#drawDiagram(); this.#render(); this.#updateSync(); }
    this.#placeWidget();
    if (opening) { w.querySelector('.card').focus({ preventScroll: true }); setTimeout(() => this.#light(), TIMING.light); }
  }

  #notes(s) {
    if (!s.notes.length) return '';
    return `<div class="notes">${s.notes.map(n => `<p title="${esc(n.because)}">${code(n.title)}</p>`).join('')}</div>`;
  }

  #bindWidget() {
    const w = this.#$('.w'), on = (sel, fn) => w.querySelector(sel)?.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    on('.close', () => this.close());
    on('.prev', () => this.#go(this.#pinned.active - 1));
    on('.next', () => this.#go(this.#pinned.active + 1));
    on('.sync', () => this.#sync());
    on('.flip', e => this.#flip(e.currentTarget));
    on('.undo', () => this.#undo());
    on('.write', () => this.#write());
    on('.copy', e => this.#copy(e.currentTarget));
    on('.file', e => this.#copyText(e.currentTarget, `${this.#pinned.state.file}:${this.#pinned.state.line}:${this.#pinned.state.column}`));
    w.querySelectorAll('.z').forEach(z => z.addEventListener('click', e => { e.stopPropagation(); this.#zoom(Number(z.dataset.z)); }));
    w.querySelector('.card').addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (!e.target.closest('.opt')) { e.preventDefault(); this.#go(this.#pinned.active + 1); } }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (!e.target.closest('.opt')) { e.preventDefault(); this.#go(this.#pinned.active - 1); } }
    });
  }

  // ── the skeleton ─────────────────────────────────────────
  // The element drawn at 1:1 (or magnified), its children as boxes and text rules, and every mark set into a break in
  // the outline nearest the place it is about, as a technical drawing prints a measurement in the line it measures.
  #drawDiagram() {
    const p = this.#pinned, s = p.state, el = p.element, diagram = this.#$('.diagram');
    const o = outlineOf(el), width = this.#$('.w').offsetWidth || 360;
    // Fit the drawing to the card's width and to a drawing height, so a page-sized element stays a glance.
    const fit = Math.min((width - 24) / Math.max(1, o.w), TIMING.maxDrawing / Math.max(1, o.h));
    const k = Math.min(fit, p.zoom), pad = 12;
    this.#root.querySelectorAll('.z').forEach(z => { const n = Number(z.dataset.z); z.disabled = n > 1 && n > fit; });
    const toD = r => ({ x: (r.x - o.x) * k, y: (r.y - o.y) * k + pad, w: r.w * k, h: r.h * k });
    const H = o.h * k, W = o.w * k;
    diagram.style.height = pad + H + 22 + 'px';
    const shapes = childrenOf(el).map(c => {
      const d = toD(c);
      const lines = c.lines.map(l => { const ld = toD(l); return `<b style="left:${ld.x - d.x}px;top:${ld.y - d.y + ld.h * 0.3}px;width:${Math.min(ld.w, d.w) * 0.7}px;height:${Math.max(3, ld.h * 0.4)}px"></b>`; }).join('');
      return `<i class="d-child${c.text ? ' text' : ''}" style="left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px;border-radius:${c.round === 'full' ? '50%' : c.round * k + 'px'}">${lines}</i>`;
    }).join('');
    const R = { tl: Math.min(o.radius.tl * k, H / 2, W / 2), tr: Math.min(o.radius.tr * k, H / 2, W / 2), bl: Math.min(o.radius.bl * k, H / 2, W / 2), br: Math.min(o.radius.br * k, H / 2, W / 2) };
    const top = pad, bot = pad + H, GAPW = 9, MIN = 22;
    p.regions = s.marks.map(m => regionFor(el, m.props));
    const marks = s.marks.map((m, i) => {
      const reg = p.regions[i], r = toD(reg.rects[0]);
      const edge = reg.kind === 'pad' && reg.axis === 'x' ? reg.edge : reg.edge;
      const along = edge === 'left' || edge === 'right' ? r.y + r.h / 2 : r.x + r.w / 2;
      return { i, edge, along, kind: reg.kind, corner: reg.corner };
    });
    for (const edge of ['top', 'bottom', 'left', 'right']) {
      const row = marks.filter(m => m.edge === edge && m.kind !== 'corner').sort((a, c) => a.along - c.along);
      const vertical = edge === 'left' || edge === 'right';
      const lo = vertical ? top + Math.max(R.tl, R.bl) : Math.max(R.tl, R.bl), hi = vertical ? bot - Math.max(R.tr, R.br) : W - Math.max(R.tr, R.br);
      let last = -Infinity;
      for (const m of row) { m.along = Math.min(hi - GAPW, Math.max(lo + GAPW, m.along, last + MIN)); last = m.along; }
    }
    const gapsOn = edge => marks.filter(m => m.edge === edge && !['corner', 'shadow'].includes(m.kind)).map(m => [m.along - GAPW, m.along + GAPW]);
    const cut = (a, c, gaps) => { let segs = [[a, c]]; for (const [g0, g1] of gaps) segs = segs.flatMap(([u, v]) => g1 <= u || g0 >= v ? [[u, v]] : [[u, g0], [g1, v]].filter(([x0, x1]) => x1 - x0 > 0.5)); return segs; };
    const h = v => Math.round(v) + 0.5;
    const outline = [
      ...cut(R.tl, W - R.tr, gapsOn('top')).map(([a, c]) => `M${a} ${h(top)}H${c}`),
      ...cut(R.bl, W - R.br, gapsOn('bottom')).map(([a, c]) => `M${a} ${h(bot)}H${c}`),
      ...cut(top + R.tl, bot - R.bl, gapsOn('left')).map(([a, c]) => `M0.5 ${a}V${c}`),
      ...cut(top + R.tr, bot - R.br, gapsOn('right')).map(([a, c]) => `M${W - 0.5} ${a}V${c}`),
      `M0.5 ${top + R.tl}A${R.tl} ${R.tl} 0 0 1 ${R.tl} ${h(top)}M${W - R.tr} ${h(top)}A${R.tr} ${R.tr} 0 0 1 ${W - 0.5} ${top + R.tr}`,
      `M0.5 ${bot - R.bl}A${R.bl} ${R.bl} 0 0 0 ${R.bl} ${h(bot)}M${W - R.br} ${h(bot)}A${R.br} ${R.br} 0 0 0 ${W - 0.5} ${bot - R.br}`,
    ].join('');
    // Glyphs read their context: a radius arc faces its corner and sits on that corner's arc; a spacing mark turns to the
    // axis it measures; a shadow sits below the outline, where the shadow falls.
    const markXY = m => {
      if (m.kind === 'corner') {
        const c = m.corner, r = R[c] || 6, cx = c[1] === 'r' ? W - r : r, cy = c[0] === 't' ? top + r : bot - r, d = r * Math.SQRT1_2;
        return [cx + (c[1] === 'r' ? d : -d), cy + (c[0] === 't' ? -d : d)];
      }
      if (m.kind === 'shadow') return [m.along, bot + 10];
      return m.edge === 'top' ? [m.along, top] : m.edge === 'bottom' ? [m.along, bot] : m.edge === 'left' ? [0, m.along] : [W, m.along];
    };
    const orient = (mark, m) => {
      const reg = p.regions[m.i];
      if (mark.glyph === 'spacing' && reg.axis === 'y') return 'rotate(90deg)';
      if (mark.glyph === 'radius' && reg.corner) return `scale(${reg.corner[1] === 'r' ? -1 : 1}, ${reg.corner[0] === 'b' ? -1 : 1})`;
      return 'none';
    };
    const regionsSvg = s.marks.map((mark, i) => p.regions[i].rects.map(rect => { const r = toD(rect);
      return `<rect class="reg ${this.#tone(mark)}" data-i="${i}" x="${r.x}" y="${r.y}" width="${Math.max(0, r.w)}" height="${Math.max(0, r.h)}" rx="${p.regions[i].kind === 'corner' ? r.w / 4 : 1}"/>`; }).join('')).join('');
    diagram.innerHTML = `<svg class="outline" width="${W}" height="${pad + H + 22}" aria-hidden="true">${regionsSvg}<path d="${outline}"/></svg>${shapes}` +
      marks.map(m => { const mark = s.marks[m.i], [mx, my] = markXY(m);
        return `<button class="pin ${this.#tone(mark)} ${m.kind === 'corner' ? 'on-arc' : ''}" style="left:${mx}px;top:${my}px;--orient:${orient(mark, m)}" data-i="${m.i}" aria-label="${esc(mark.title.replace(/`/g, ''))}">${glyph(mark.glyph)}</button>`; }).join('');
    diagram.querySelectorAll('.pin').forEach(pin => {
      pin.addEventListener('click', e => { e.stopPropagation(); this.#go(Number(pin.dataset.i)); });
      pin.addEventListener('pointerenter', () => this.#light(Number(pin.dataset.i)));
      pin.addEventListener('pointerleave', () => this.#light());
    });
    this.#markCurrent();
  }

  // Off, soft (legal but reached the wrong way), quiet (known debt or an accepted exception), ok (previewed on the system).
  #tone(mark) {
    if (mark.synced && !this.#pinned?.before) return 'ok';
    if (mark.ledger !== 'new') return 'quiet';
    return mark.soft ? 'soft' : '';
  }

  #markCurrent() {
    const p = this.#pinned, i = p.active;
    this.#root.querySelectorAll('.pin').forEach(n => n.setAttribute('aria-current', String(Number(n.dataset.i) === i)));
    this.#root.querySelectorAll('.outline .reg').forEach(n => n.toggleAttribute('data-active', Number(n.dataset.i) === i));
  }

  #light(i = this.#pinned?.active) {
    const p = this.#pinned, lit = this.#$('.lit');
    const mark = p?.state?.marks?.[i];
    if (!mark || !p.regions?.[i]) { lit.classList.remove('on'); return; }
    const reg = regionFor(p.element, mark.props), r = reg.rects[0];
    // A region that is most of the screen is outlined, not hatched: the page stays readable under the reading.
    const large = reg.kind === 'box' || r.w * r.h > innerWidth * innerHeight / 3;
    lit.className = `lit on ${reg.kind === 'corner' ? 'ring' : ''} ${large ? 'frame' : ''} ${this.#tone(mark)}`;
    lit.style.width = Math.max(2, r.w) + 'px'; lit.style.height = Math.max(2, r.h) + 'px';
    lit.style.transform = `translate(${r.x}px, ${r.y}px)`;
  }

  #go(i) {
    const p = this.#pinned, n = p.state.marks.length; if (!n) return;
    p.active = (i + n) % n;
    const read = this.#$('.read');
    read.classList.add('swapping');
    setTimeout(() => { if (this.#pinned !== p) return; this.#render(); read.classList.remove('swapping'); }, TIMING.swap / 2);
    this.#markCurrent(); this.#light();
  }

  #zoom(z) {
    const p = this.#pinned; p.zoom = z;
    this.#root.querySelectorAll('.z').forEach(o => o.setAttribute('aria-pressed', String(Number(o.dataset.z) === z)));
    const d = this.#$('.diagram'); d.classList.add('swapping');
    setTimeout(() => { if (this.#pinned !== p) return; this.#drawDiagram(); d.classList.remove('swapping'); }, TIMING.swap / 2);
  }

  // ── the reading line ─────────────────────────────────────
  #render() {
    const p = this.#pinned, s = p.state, read = this.#$('.read');
    const nav = this.#root.querySelectorAll('.nav');
    if (!s.marks.length && !s.declared) {
      read.innerHTML = `<div class="t">${glyph('existence', 'quiet')}<span>Nothing is written literally at this line.</span></div>
        <div class="because">The classes here are built in code (a variable, a function or a template), so Plumb reads them where they are written as text. Open ${esc(s.file)} to see those places.</div>`;
      this.#$('.count').textContent = 'computed'; nav.forEach(b => b.disabled = true);
      this.#$('.sync').disabled = true;
      return;
    }
    if (!s.marks.length) {
      read.innerHTML = `<div class="t">${glyph('habit', 'ok')}<span>Everything this element sets uses your tokens.</span></div>`;
      this.#$('.count').textContent = 'on system'; nav.forEach(b => b.disabled = true);
      this.#$('.sync').disabled = true;
      return;
    }
    const m = s.marks[p.active];
    nav.forEach(b => b.disabled = s.marks.length < 2);
    read.innerHTML = `<div class="t">${glyph(m.glyph, this.#tone(m) || 'off')}<span>${code(m.title)}</span></div>
      <div class="because">${esc(m.because)}</div>
      ${this.#compare(m)}
      <div class="edit">${this.#editLine(m)}<span class="ledger ${m.ledger}">${{ new: 'new', debt: 'known debt', exception: 'accepted' }[m.ledger] ?? m.ledger}</span></div>`;
    read.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.#pick(m, Number(b.dataset.pick)); }));
    this.#$('.count').textContent = `${p.active + 1} of ${s.marks.length}`;
  }

  #editLine(m) {
    // Value families can be fixed with a token; every other rule (a dead or runtime-built class, an override) says its own fix.
    const valued = ['spacing', 'radius', 'type', 'color', 'shadow', 'z', 'motion'].includes(m.glyph);
    if (!m.choices.length && !valued) return `<span class="hint">${code(m.action ?? '')}${m.accept ? ` If it is intended: <code>${esc(m.accept)}</code>` : ''}</span>`;
    if (!m.choices.length) return `<span class="hint">No token is close. Add one to your theme, or accept it: <code>${esc(m.accept ?? '')}</code></span>`;
    if (m.pick === null) return `<span class="hint">${m.choices.length} tokens fit. Pick the one whose reason matches.</span>`;
    const c = m.choices[m.pick];
    if (!c.edit) return `<span class="hint">Uses ${esc(c.label)}. Plumb has no exact edit for this syntax; Copy for agent hands it over.</span>`;
    return `<s>${esc(c.edit.from)}</s>→<b>${esc(c.edit.to)}</b>`;
  }

  // Each family is compared in its own material: spacing as bars, corners as arcs, type as type, shadows on the
  // element's own fill, colours as chips. A token row is the choice: picking one previews it on the page.
  #compare(m) {
    if (!m.choices.length) return '';
    const el = this.#pinned.element;
    const rows = [...m.choices.map((c, j) => ({ ...c, j })), { value: m.value, n: m.n, you: true }];
    if (rows.every(r => r.n !== undefined)) rows.sort((a, b) => a.n - b.n);
    const who = r => r.you ? `<span class="who you">yours</span>` : `<span class="who"><b>${esc(r.label)}</b>${r.why ? `<small>${esc(r.why)}</small>` : ''}</span>`;
    const attrs = r => r.you ? 'class="opt you" disabled' : `class="opt" data-pick="${r.j}" aria-pressed="${r.j === m.pick}" title="${esc(r.why ?? '')}"`;
    const v = r => `<span class="v">${esc(r.n !== undefined ? r.n : r.value)}</span>`;
    if (m.glyph === 'spacing' && rows.every(r => r.n !== undefined)) {
      const max = Math.max(...rows.map(r => r.n), 1), k = Math.min(8, 160 / max);
      return `<div class="cmp spacing" style="--bars:${Math.ceil(max * k) + 8}px">${rows.map(r => `<button ${attrs(r)}>${v(r)}<span class="bar"><i style="width:${Math.max(1, r.n * k)}px"></i></span>${who(r)}</button>`).join('')}</div>`;
    }
    if (m.glyph === 'radius' && rows.every(r => r.n !== undefined)) {
      const max = Math.max(...rows.map(r => r.n), 1), k = Math.min(3, 60 / max), size = max * k + 8;
      return `<div class="cmp radius"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${rows.map(r => { const rr = r.n * k;
        return `<path class="${r.you ? 'you' : r.j === m.pick ? 'pick' : ''}" d="M 0.5 ${size - 0.5} V ${rr + 0.5} A ${rr} ${rr} 0 0 1 ${rr + 0.5} 0.5 H ${size - 0.5}"/>`; }).join('')}</svg>
        <div class="list">${rows.map(r => `<button ${attrs(r)}>${v(r)}${who(r)}</button>`).join('')}</div></div>`;
    }
    if (m.glyph === 'type' && rows.every(r => r.n !== undefined)) {
      const cs = getComputedStyle(el), sample = (el.textContent.trim() || 'Aa').slice(0, 28);
      return `<div class="cmp type" style="--spec-font:${esc(cs.fontFamily)};--spec-weight:${esc(cs.fontWeight)}">${rows.map(r => `<button ${attrs(r)}><span class="spec" style="font-size:${r.n}px">${esc(sample)}</span>${v(r)}${who(r)}</button>`).join('')}</div>`;
    }
    if (m.glyph === 'shadow') {
      const fill = getComputedStyle(el).backgroundColor;
      return `<div class="cmp plates" style="--ground:${esc(hostGround(el))}">${rows.map(r => `<button ${attrs(r)}><span class="plate" style="background:${esc(fill)};box-shadow:${esc(r.value)}"></span>${who(r)}</button>`).join('')}</div>`;
    }
    if (m.glyph === 'color') return `<div class="cmp chips">${rows.map(r => `<button ${attrs(r)}><span class="chip" style="background:${esc(r.value)}"></span>${who(r)}</button>`).join('')}</div>`;
    return `<div class="cmp list">${rows.map(r => `<button ${attrs(r)}>${who(r)}${v(r)}</button>`).join('')}</div>`;
  }

  // ── preview: the page itself changes ─────────────────────
  // A preview is inline styles on the real element, remembered so they can be lifted exactly. Nothing is written until
  // Write; nothing ever touches the theme, the config or the ledger.
  #preview(m) {
    const p = this.#pinned, c = m.choices[m.pick]; if (!c) return false;
    for (const prop of m.props) {
      if (!p.original.has(prop)) p.original.set(prop, [p.element.style.getPropertyValue(prop), p.element.style.getPropertyPriority(prop)]);
      p.element.style.setProperty(prop, c.value, 'important');
    }
    m.synced = true;
    return true;
  }

  #restore(p = this.#pinned) {
    if (!p) return;
    for (const [prop, [value, priority]] of p.original) value ? p.element.style.setProperty(prop, value, priority) : p.element.style.removeProperty(prop);
    // Leave no residue: an element that had no style attribute gets none back.
    // Chromium writes inline style back to the attribute lazily; read it first so the removal is the last write.
    if (p.styleAttr === null && !p.element.style.length) { p.element.getAttribute('style'); p.element.removeAttribute('style'); }
  }

  #reapply() { const p = this.#pinned; for (const m of p.state.marks) if (m.synced) this.#preview(m); }

  #pick(m, j) {
    const p = this.#pinned;
    m.pick = j;
    if (p.status?.kind !== 'writing') p.status = null;
    if (p.before) this.#flip(this.#$('.flip'), false);
    this.#preview(m);
    this.#refresh();
  }

  #sync() {
    const p = this.#pinned;
    if (p.status?.kind !== 'writing') p.status = null;
    for (const m of p.state.marks) if (m.ledger === 'new' && m.pick !== null) this.#preview(m);
    this.#refresh();
  }

  #flip(button, before = button.getAttribute('aria-pressed') !== 'true') {
    const p = this.#pinned; p.before = before;
    button.setAttribute('aria-pressed', String(before));
    before ? this.#restore() : this.#reapply();
    this.#refresh();
  }

  #undo() {
    const p = this.#pinned;
    this.#restore(); p.original.clear(); p.before = false; p.status = null;
    for (const m of p.state.marks) delete m.synced;
    this.#$('.flip').setAttribute('aria-pressed', 'false');
    this.#refresh();
  }

  #refresh() {
    const p = this.#pinned;
    requestAnimationFrame(() => { if (this.#pinned !== p) return; this.#drawDiagram(); this.#render(); this.#updateSync(); this.#light(); });
  }

  #writable() { return this.#pinned.state.marks.filter(m => m.synced && m.choices[m.pick]?.edit); }

  #updateSync() {
    const p = this.#pinned, s = p.state, w = this.#$('.w');
    const previewed = s.marks.filter(m => m.synced), waiting = s.marks.filter(m => m.ledger === 'new' && !m.synced && m.choices.length > 1 && m.pick === null);
    const stuck = s.marks.filter(m => m.ledger === 'new' && !m.choices.length), writable = this.#writable();
    const top = this.#root.querySelector('.top .n'), off = offCount(s);
    if (top) { top.textContent = off ? `${off} off` : 'on system'; top.className = `n ${off ? '' : 'ok'}`; }
    const ready = s.marks.filter(m => m.ledger === 'new' && m.pick !== null && !m.synced).length;
    const sync = this.#$('.sync'); sync.disabled = !ready && !previewed.length; sync.textContent = ready ? `Sync ${ready} to system` : 'Sync to system';
    const strip = this.#$('.synced');
    const showing = previewed.length || p.status;
    w.toggleAttribute('data-synced', !!showing); strip.hidden = !showing;
    if (!showing) return;
    const state = strip.querySelector('.state'), write = strip.querySelector('.write');
    if (p.status?.kind === 'writing') { state.className = 'state quiet'; state.textContent = 'Writing to source…'; }
    else if (p.status?.kind === 'written') { state.className = 'state'; state.textContent = p.status.text; }
    else if (p.status?.kind === 'error') { state.className = 'state err'; state.textContent = p.status.text; }
    else {
      const rest = [waiting.length && `${waiting.length} to pick`, stuck.length && `${stuck.length} without a token`].filter(Boolean).join(' · ');
      state.className = `state ${rest ? 'warn' : ''}`;
      state.textContent = `Preview: ${previewed.length} on system${rest ? ' · ' + rest : ''}`;
    }
    write.textContent = p.status?.kind === 'error' && p.status.stale ? 'Read again' : `Write ${writable.length} edit${writable.length === 1 ? '' : 's'}`;
    write.disabled = p.status?.kind === 'writing' || (!writable.length && !(p.status?.kind === 'error' && p.status.stale));
    write.setAttribute('aria-busy', String(p.status?.kind === 'writing'));
    strip.querySelector('.flip').disabled = !previewed.length || p.status?.kind === 'writing';
    strip.querySelector('.undo').disabled = !previewed.length || p.status?.kind === 'writing';
    // After a write with nothing new previewed, the strip only reports what happened.
    const reportOnly = p.status?.kind === 'written' && !previewed.length;
    for (const b of strip.querySelectorAll('button')) b.hidden = reportOnly;
  }

  // ── write: the same edits, in source ─────────────────────
  async #write() {
    const p = this.#pinned, s = p.state;
    if (p.status?.kind === 'error' && p.status.stale) return this.#reread(p);
    const ids = this.#writable().map(m => ({ id: m.choices[m.pick].edit.id }));
    if (!ids.length) return;
    p.status = { kind: 'writing' }; this.#updateSync();
    const classes = p.element.getAttribute('class');
    const text = `Wrote ${ids.length} edit${ids.length === 1 ? '' : 's'} to ${s.file}`;
    try { sessionStorage.setItem(RESUME, JSON.stringify({ path: pathTo(p.element), file: s.file, tag: s.tag, text, at: Date.now() })); } catch {}
    try {
      await post('apply', { file: s.file, hash: s.hash, edits: ids });
      await this.#reread(p, classes, text);
    } catch (error) {
      try { sessionStorage.removeItem(RESUME); } catch {}
      const stale = /changed since/i.test(error.message);
      p.status = { kind: 'error', stale, text: stale ? 'The file changed since Plumb read it.' : error.message };
      this.#updateSync();
    }
  }

  // After a write the dev server reloads the element with its new classes. Lift the preview once the page carries the
  // change itself, then read the element again so the reading reflects source, not the preview.
  async #reread(p, classesBefore, wrote) {
    const afterWrite = classesBefore !== undefined;
    this.#cache = new WeakMap();
    for (const [n, wait] of (afterWrite ? TIMING.reread : [0]).entries()) {
      await new Promise(r => setTimeout(r, wait));
      if (this.#pinned !== p) return;
      // Until the page carries the new classes, the preview is the only thing showing the change.
      const reloaded = p.element.getAttribute('class') !== classesBefore || n === TIMING.reread.length - 1;
      if (afterWrite && !reloaded) continue;
      const next = await this.read(p.element, true);
      if (next.status !== 'ready') continue;
      if (afterWrite && next.hash === p.state.hash) continue;
      this.#restore(p); p.original.clear(); p.before = false;
      p.state = structuredClone(next); p.active = 0; p.status = afterWrite ? { kind: 'written', text: wrote } : null;
      this.#renderWidget();
      return;
    }
    // Source has the edit but the page never reloaded it: keep the preview so the page still shows it, and say so.
    if (afterWrite && this.#pinned === p) { p.status = { kind: 'written', text: `${wrote}. Reload to see it from source.` }; this.#updateSync(); }
  }

  // ── hand-over ────────────────────────────────────────────
  #copy(button) {
    const s = this.#pinned.state;
    const lines = s.marks.filter(m => m.ledger === 'new').map(m => {
      const where = `${s.file}:${m.line}:${m.column}`, c = m.pick !== null ? m.choices[m.pick] : null;
      if (c?.edit) return `- ${where}: replace \`${c.edit.from}\` with \`${c.edit.to}\` (${c.label}${c.why ? ': ' + c.why : ''}).`;
      if (m.choices.length) return `- ${where}: ${m.title.replace(/`/g, '')}. Choose a token by its reason: ${m.choices.map(c => `${c.label}${c.why ? ' (' + c.why + ')' : ''}`).join(', ')}.`;
      return `- ${where}: ${m.title.replace(/`/g, '')}. No token is close: stop and report NEEDS-DECISION with the value you wanted.`;
    });
    const text = [`Plumb found ${lines.length} thing${lines.length === 1 ? '' : 's'} on <${s.tag}>${s.component ? ' in ' + s.component : ''} (${s.file}:${s.line}).`, ...lines, '',
      'Do not edit the Plumb config, .plumb/ledger.jsonl or the theme to make these pass. Run `plumb check --changed --agent` after editing.'].join('\n');
    this.#copyText(button, text);
  }

  async #copyText(button, text) {
    const label = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
    catch { button.textContent = 'Copy failed'; }
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1200);
  }

  #$(selector) { return this.#root.querySelector(selector); }
}

customElements.define('plumb-overlay', PlumbOverlay);

export function mountOverlay() {
  const existing = document.querySelector('plumb-overlay');
  if (existing) return existing;
  const overlay = document.createElement('plumb-overlay');
  document.documentElement.append(overlay);
  return overlay;
}

/* ─────────────────────────────────────────────────────────
 * READINESS · React Plumber overlay
 *
 * What this project's setup costs the person, said where they work (docs/briefs/readiness.md). The engine checks
 * each requirement (GET readiness); this lists the causes, lets the person tick what to fix, and either writes the
 * fixes Plumber can write (POST readiness/fix, only on Apply) or copies one instruction for an agent or a teammate.
 *
 *  nothing   every capability is full, the server is still starting, or it has no readiness route: nothing shown
 *  note      something is missing: a small button in the dock names the biggest loss ("Writes reload the page")
 *  panel     above the dock, where the punch list opens. One row per cause: a checkbox, a chip with its state and
 *            the capability it hits ("Off · Write in place", on a tinted ground), what it costs, what else it
 *            limits, where it's set (file:line) and its fix. Checks that can't tell yet sit last, without a box.
 *            Opens only from the note or the callout, never by itself: it would cover the page being worked on
 *  callout   the first time anything is missing in a project: one line beside the dock ("2 setup gaps · Writes
 *            reload the page…", the whole sentence on hover) with Review and ✕. It never takes focus and covers no more
 *            than the dock's corner; a click or Alt anywhere else, blueprint or a pin puts it away. Once per project
 *  row fix   diff: Show change → the diff · step: the instruction and the command, with Copy → Copied
 *  row state applying → applied (the dev server restarts; the list reads again) · refused → why, Read again
 *  footer    "n selected" · Copy for agent (every ticked cause, diffs and steps, plain enough for a person, exact
 *            enough for an agent) · Apply k (only the ticked causes Plumber can write; disabled when none)
 * ───────────────────────────────────────────────────────── */

import { request, post } from './api.js';

// Which loss the dock names first: the one a visual-editor user feels most.
const ORDER = ['write', 'locate', 'blueprint', 'preview', 'fast', 'remember', 'read', 'system'];
const HIDDEN = new Set(['system']); // not offered in the overlay yet
const SEEN = 'plumb-readiness-seen';
const COPIED_MS = 1400;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = (file) => String(file ?? '').split('/').pop();
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const READY_CSS = `
  .dock .ready { all: unset; display: inline-flex; align-items: center; gap: 6px; height: 18px; max-width: 200px; padding: 0 8px 0 6px; border-radius: var(--pl-radius-tag);
    font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-ink); background: var(--pl-soft-bg); cursor: pointer; white-space: nowrap; }
  .dock .ready[data-level="off"] { background: var(--pl-off-bg); }
  .dock .ready .dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--pl-soft); }
  .dock .ready[data-level="off"] .dot { background: var(--pl-off); }
  .dock .ready .text { overflow: hidden; text-overflow: ellipsis; }
  .dock .ready:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 1px; }
  .dock .ready[aria-expanded="true"] { box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .dock[data-fold] .ready { padding: 0 6px; }
  .dock[data-fold] .ready .text { display: none; }
  @media (hover: hover) and (pointer: fine) { .dock[data-fold]:hover .ready .text { display: inline; } .dock[data-fold]:hover .ready { padding: 0 8px 0 6px; } }

  .rd { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4)); width: 380px; max-width: calc(100vw - 2 * var(--pl-space-6)); pointer-events: auto; }
  .rd .card { display: flex; flex-direction: column; max-height: min(72vh, 600px); padding: 0; overflow: hidden; transform-origin: 100% 100%;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); color: var(--pl-ink);
    transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); }
  .rd[data-enter] .card { opacity: 0; transform: translateY(6px) scale(.985); }
  .rd .top { display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-6) var(--pl-space-6) var(--pl-space-2); border: 0; background: none; }
  .rd .top .title { flex: 1; font: var(--pl-card-title); }
  .rd .top .close { all: unset; display: grid; place-items: center; width: 24px; height: 24px; margin: -4px -6px -4px 0; border-radius: var(--pl-radius-tag); color: var(--pl-ink-2); cursor: pointer; }
  .rd .top .close:focus-visible { outline: 2px solid var(--pl-accent); }
  @media (hover: hover) and (pointer: fine) { .rd .top .close:hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .rd .lead { margin: 0; padding: 0 var(--pl-space-6) var(--pl-space-5); font: var(--pl-card-body); color: var(--pl-ink-2); text-wrap: pretty; }
  .rd .body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--pl-space-6) var(--pl-space-6); display: flex; flex-direction: column; gap: var(--pl-space-4); }
  .rd .req { display: grid; grid-template-columns: 16px minmax(0, 1fr); column-gap: var(--pl-space-4); row-gap: var(--pl-space-2); padding: var(--pl-space-5); border-radius: var(--pl-radius-row); box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .rd .req > :not(.box) { grid-column: 2; }
  .rd .req .box { grid-row: 1; grid-column: 1; width: 14px; height: 14px; margin: 3px 0 0; accent-color: var(--pl-accent); cursor: pointer; }
  .rd .req .box:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 2px; }
  .rd .req[data-status="unknown"] { grid-template-columns: minmax(0, 1fr); box-shadow: none; background: var(--pl-paper-2); }
  .rd .req[data-status="unknown"] > * { grid-column: 1; }
  .rd .req[data-done] { box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-on) 40%, var(--pl-rule)); }
  .rd .req .what { font: 600 13px/19px var(--pl-sans); color: var(--pl-ink); text-wrap: pretty; }
  .rd .chip { justify-self: start; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: var(--pl-radius-tag); font: var(--pl-text-label); letter-spacing: var(--pl-tracking-caps); text-transform: uppercase; }
  .rd .chip[data-tone="off"] { color: var(--pl-off); background: var(--pl-off-bg); }
  .rd .chip[data-tone="soft"] { color: var(--pl-soft); background: var(--pl-soft-bg); }
  .rd .chip[data-tone="unknown"] { color: var(--pl-unknown); background: var(--pl-paper); }
  .rd .chip[data-tone="on"] { color: var(--pl-on); background: var(--pl-on-bg); }
  .rd .req .loses { font: var(--pl-card-body); color: var(--pl-ink-2); text-wrap: pretty; }
  .rd .req .also { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .rd .req .where { font: var(--pl-card-meta); color: var(--pl-ink-2); overflow-wrap: anywhere; }
  .rd .req .where code { font: var(--pl-card-code); color: var(--pl-ink); }
  .rd .fix { display: flex; flex-direction: column; gap: var(--pl-space-4); margin-top: var(--pl-space-2); }
  .rd .fix .row { display: flex; align-items: center; gap: var(--pl-space-4); flex-wrap: wrap; }
  .rd .fix .msg { font: var(--pl-card-meta); color: var(--pl-ink-2); text-wrap: pretty; }
  .rd .fix .msg[data-tone="off"] { color: var(--pl-off); }
  .rd .fix .msg[data-tone="on"] { color: var(--pl-on); }
  .rd .link { all: unset; font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-accent); cursor: pointer; }
  .rd .link:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 2px; border-radius: 2px; }
  @media (hover: hover) and (pointer: fine) { .rd .link:hover { text-decoration: underline; text-underline-offset: 2px; } }
  .rd pre { margin: 0; max-height: 180px; overflow: auto; padding: var(--pl-space-4); border-radius: var(--pl-radius-tag); background: var(--pl-paper-2); font: 400 11.5px/17px var(--pl-mono); color: var(--pl-ink-2); white-space: pre; }
  .rd pre .add { color: var(--pl-on); }
  .rd pre .del { color: var(--pl-off); }
  .rd .cmd { display: flex; align-items: center; gap: var(--pl-space-2); padding: 2px 2px 2px var(--pl-space-4); border-radius: var(--pl-radius-tag); background: var(--pl-paper-2); }
  .rd .cmd code { flex: 1; min-width: 0; font: var(--pl-card-code); color: var(--pl-ink); overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
  .rd .btn { all: unset; display: inline-flex; align-items: center; justify-content: center; height: 26px; padding: 0 var(--pl-space-5); border-radius: var(--pl-radius-tag); font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-ink); background: var(--pl-paper); box-shadow: inset 0 0 0 1px var(--pl-rule); cursor: pointer; white-space: nowrap; }
  .rd .btn.small { height: 22px; padding: 0 var(--pl-space-4); }
  .rd .btn.primary { color: var(--pl-on-action); background: var(--pl-action-soft); box-shadow: none; }
  .rd .btn:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 2px; }
  .rd .btn:disabled { opacity: .5; cursor: default; }
  .rd .btn[aria-busy="true"]::before { content: ""; width: 9px; height: 9px; margin-inline-end: 6px; border-radius: 50%; border: 1.5px solid currentColor; border-right-color: transparent; animation: pl-spin .7s linear infinite; }
  @media (hover: hover) and (pointer: fine) { .rd .btn:not(:disabled):not(.primary):hover { background: var(--pl-paper-2); } .rd .btn.primary:not(:disabled):hover { background: color-mix(in oklab, var(--pl-action-soft) 85%, var(--pl-action)); } }
  .rd .foot { display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-5) var(--pl-space-6); border-top: 1px solid var(--pl-rule); background: var(--pl-paper-2); }
  .rd .foot .count { margin-inline-end: auto; font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .rd .foot .count[data-tone="on"] { color: var(--pl-on); }
  .rd-callout { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4)); max-width: min(380px, calc(100vw - 2 * var(--pl-space-6)));
    display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-4) var(--pl-space-4) var(--pl-space-4) var(--pl-space-5); pointer-events: auto;
    background: var(--pl-paper); color: var(--pl-ink); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card);
    opacity: 0; transform: translateY(4px); transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); }
  .rd-callout[data-in] { opacity: 1; transform: none; }
  /* a write's toast (history.js) sits where the callout sits: the callout steps up above it while it shows */
  .wt[data-on] ~ .rd-callout, .rd-callout:has(~ .wt[data-on]) { inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4) + 48px); }
  .rd-callout .text { flex: 1; min-width: 0; font: var(--pl-card-meta); color: var(--pl-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rd-callout .text b { font-weight: 600; color: var(--pl-ink); }
  .rd-callout .btn { all: unset; display: inline-flex; align-items: center; height: 24px; padding: 0 var(--pl-space-4); border-radius: var(--pl-radius-tag); font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-on-accent); background: var(--pl-accent); cursor: pointer; white-space: nowrap; }
  .rd-callout .btn:focus-visible, .rd-callout .x:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 2px; }
  .rd-callout .x { all: unset; display: grid; place-items: center; width: 22px; height: 22px; border-radius: var(--pl-radius-tag); color: var(--pl-ink-2); cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .rd-callout .x:hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  @media (prefers-reduced-motion: reduce) { .rd .card, .rd-callout { transition: none; } .rd .btn[aria-busy="true"]::before { animation: none; } }
`;

const DOT = '<span class="dot" aria-hidden="true"></span>';
const CLOSE = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.3"/></svg>';

export class Readiness {
  #root; #dock; #onOpen;
  #report = null;            // the engine's ReadinessReport, or null before it's read / when there's no route
  #open = false;
  #ticked = new Set();       // requirement ids the person wants fixed
  #known = new Set();        // requirement ids seen before: a new cause starts ticked, an unticked one stays unticked
  #row = new Map();          // requirement id → { shown, busy, done, error, copied }
  #copied = false;           // the footer's Copy for agent just copied
  #panel = null;
  #note = null;
  #loading = false;

  constructor(root, { dock, onOpen }) {
    this.#root = root;
    this.#dock = dock;
    this.#onOpen = onOpen;
  }

  get open() { return this.#open; }
  rect() { return (this.#panel?.querySelector('.card') ?? this.#callout)?.getBoundingClientRect() ?? null; }

  // Read (or re-read) the engine's account. Called when the server becomes ready and after a fix lands.
  async read() {
    if (this.#loading) return;
    this.#loading = true;
    try { this.#report = await request('readiness', {}); }
    catch { this.#report = null; }
    finally { this.#loading = false; }
    if (this.#report && !Array.isArray(this.#report.capabilities)) this.#report = null;
    const missing = this.#missing(), ids = new Set(missing.map((q) => q.id));
    for (const id of ids) if (!this.#known.has(id)) { this.#known.add(id); this.#ticked.add(id); }
    for (const id of this.#ticked) if (!ids.has(id)) this.#ticked.delete(id);
    this.#render();
    if (missing.length && !this.#open && !this.#seen()) { this.#markSeen(); this.#showCallout(); }
  }

  toggle(force, { focus = true } = {}) {
    const next = force ?? !this.#open;
    if (next === this.#open) return;
    this.#hideCallout();
    this.#open = next;
    if (next) this.#onOpen?.();
    this.#render();
    if (next) requestAnimationFrame(() => requestAnimationFrame(() => this.#panel?.removeAttribute('data-enter')));
    if (next) this.#panel?.querySelector('.close')?.focus({ preventScroll: true });
    else if (focus) this.#note?.focus({ preventScroll: true });
  }

  close() { if (this.#open) this.toggle(false); }
  // Step aside for other work: close without moving focus anywhere, and put the callout away.
  dismiss() { this.#hideCallout(); if (this.#open) this.toggle(false, { focus: false }); }
  destroy() { this.dismiss(); this.#panel?.remove(); this.#note?.remove(); this.#panel = this.#note = null; }

  // ── the first-time callout ───────────────────────────────

  #callout = null;
  #showCallout() {
    const missing = this.#missing();
    if (!missing.length || !this.#note) return;
    this.#callout = document.createElement('div');
    this.#callout.className = 'rd-callout';
    this.#callout.setAttribute('role', 'status');
    const n = missing.length;
    this.#callout.innerHTML = `<span class="text" title="${plural(n, 'thing')} in this project limit${n === 1 ? 's' : ''} React Plumber: ${esc(missing[0].loses)}"><b>${plural(n, 'setup gap')}</b> · ${esc(missing[0].loses)}</span>
      <button class="btn small primary" type="button" data-act="review">Review</button>
      <button class="x" type="button" aria-label="Not now">${CLOSE}</button>`;
    this.#callout.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="review"]')) this.toggle(true);
      else if (e.target.closest('.x')) this.#hideCallout();
    });
    this.#root.append(this.#callout);
    requestAnimationFrame(() => requestAnimationFrame(() => this.#callout?.setAttribute('data-in', '')));
    addEventListener('pointerdown', this.#aside, true);
    addEventListener('keydown', this.#aside, true);
  }
  #hideCallout() {
    removeEventListener('pointerdown', this.#aside, true);
    removeEventListener('keydown', this.#aside, true);
    this.#callout?.remove();
    this.#callout = null;
  }
  // Work starting elsewhere puts the callout away; the note stays as the way back.
  #aside = (e) => {
    if (e.type === 'keydown' && e.key !== 'Alt') return;
    const path = e.composedPath();
    if (this.#callout && path.includes(this.#callout) || this.#note && path.includes(this.#note)) return;
    this.#hideCallout();
  };

  // ── state ────────────────────────────────────────────────

  // A cause is a requirement that isn't met for its own reason. 'write.locate' (Write needs Locate) is not a cause:
  // it repeats 'locate.plugin', so it only adds Write to what that cause limits.
  #causes() {
    const r = this.#report;
    if (!r) return [];
    const caps = new Map(r.capabilities.filter((c) => !HIDDEN.has(c.id) && c.available !== false).map((c) => [c.id, c]));
    const derived = (q) => q.derived === true || r.capabilities.some((c) => c.id === q.id.split('.').slice(1).join('.'));
    const limits = (capId, seen = new Set()) => {
      if (seen.has(capId)) return seen;
      seen.add(capId);
      for (const c of caps.values()) if (c.requirements.includes(`${c.id}.${capId}`)) limits(c.id, seen);
      return seen;
    };
    return r.requirements
      .filter((q) => q.status !== 'ok' && !derived(q) && caps.has(q.capability))
      .map((q) => {
        const hit = [...limits(q.capability)].filter((id) => caps.has(id)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map((id) => caps.get(id));
        return { ...q, hit, off: hit.some((c) => c.status === 'off') };
      })
      .sort((a, b) => (a.status === 'unknown') - (b.status === 'unknown') || b.off - a.off || b.hit.length - a.hit.length || ORDER.indexOf(a.capability) - ORDER.indexOf(b.capability));
  }
  #missing() { return this.#causes().filter((q) => q.status === 'missing'); }
  #req(id) { return this.#causes().find((q) => q.id === id); }
  #seen() { try { return localStorage.getItem(`${SEEN}:${location.origin}`) === '1'; } catch { return true; } }
  #markSeen() { try { localStorage.setItem(`${SEEN}:${location.origin}`, '1'); } catch {} }

  // ── drawing ──────────────────────────────────────────────

  #render() {
    const causes = this.#causes(), missing = causes.filter((q) => q.status === 'missing');
    this.#renderNote(missing);
    this.#renderPanel(causes, missing);
  }

  #renderNote(missing) {
    const open = missing.filter((q) => !this.#row.get(q.id)?.done);
    if (!open.length) { this.#note?.remove(); this.#note = null; if (!missing.length) this.#open = false; return; }
    if (!this.#note) {
      this.#note = document.createElement('button');
      this.#note.type = 'button';
      this.#note.className = 'ready';
      this.#note.setAttribute('aria-haspopup', 'dialog');
      this.#note.addEventListener('click', () => this.toggle());
      this.#dock.insertBefore(this.#note, this.#dock.querySelector('.bp-toggle'));
    }
    const first = open[0];
    this.#note.dataset.level = open.some((q) => q.off) ? 'off' : 'soft';
    this.#note.setAttribute('aria-expanded', String(this.#open));
    this.#note.title = `${first.loses}${open.length > 1 ? ` (and ${open.length - 1} more)` : ''}. Open to see why and fix it.`;
    this.#note.innerHTML = `${DOT}<span class="text">${esc(first.loses)}</span>`;
  }

  #renderPanel(causes, missing) {
    if (!this.#open || !missing.length) { this.#panel?.remove(); this.#panel = null; return; }
    if (!this.#panel) {
      this.#panel = document.createElement('div');
      this.#panel.className = 'rd';
      this.#panel.setAttribute('data-enter', '');
      this.#panel.addEventListener('click', (e) => this.#onClick(e));
      this.#panel.addEventListener('change', (e) => this.#onTick(e));
      this.#panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.toggle(false); } });
      this.#root.append(this.#panel);
    }
    const n = missing.length, scroll = this.#panel.querySelector('.body')?.scrollTop ?? 0, focus = this.#focusKey();
    this.#panel.innerHTML = `<div class="card" role="dialog" aria-label="Your setup">
      <div class="top"><span class="title">Your setup</span><button class="close" type="button" aria-label="Close">${CLOSE}</button></div>
      <p class="lead">${plural(n, 'thing')} limit${n === 1 ? 's' : ''} what React Plumber can do here. Tick what to fix.</p>
      <div class="body">${causes.map((q) => this.#reqHtml(q)).join('')}</div>
      ${this.#footHtml(missing)}
    </div>`;
    this.#panel.querySelector('.body').scrollTop = scroll;
    this.#restoreFocus(focus);
  }

  #chip(q) {
    if (q.status === 'unknown') return `<span class="chip" data-tone="unknown">Can't tell yet</span>`;
    const lead = q.hit[0]?.label ?? q.capability;
    return `<span class="chip" data-tone="${q.off ? 'off' : 'soft'}">${q.off ? 'Off' : 'Limited'} · ${esc(lead)}</span>`;
  }

  #reqHtml(q) {
    const s = this.#row.get(q.id) ?? {};
    const where = q.evidence?.length ? `<div class="where">${q.evidence.map((e) => `<code>${esc(short(e.file))}:${e.line}</code> ${esc(e.text)}`).join(' · ')}</div>` : '';
    const also = q.hit.length > 1 ? `<div class="also">Also limits ${q.hit.slice(1).map((c) => esc(c.label)).join(' · ')}</div>` : '';
    if (q.status === 'unknown') return `<div class="req" data-status="unknown">${this.#chip(q)}<div class="what">${esc(q.title)}</div><div class="loses">${esc(q.loses)}</div>${where}</div>`;
    const tick = s.done ? '<span class="box" aria-hidden="true"></span>' : `<input class="box" type="checkbox" data-id="${esc(q.id)}" aria-label="Fix: ${esc(q.title)}" ${this.#ticked.has(q.id) ? 'checked' : ''}>`;
    return `<div class="req" data-status="missing" data-id="${esc(q.id)}"${s.done ? ' data-done' : ''}>
      ${tick}<div class="what">${esc(q.title)}</div>
      ${s.done ? '<span class="chip" data-tone="on">Fixed</span>' : this.#chip(q)}
      <div class="loses">${esc(q.loses)}</div>${also}${where}
      ${this.#fixHtml(q, s)}
    </div>`;
  }

  #fixHtml(q, s) {
    const f = q.fix;
    if (!f) return '';
    if (s.done) return `<div class="fix"><div class="msg" data-tone="on">Written to ${esc(short(s.done))}. Your dev server restarts with it, and this list reads again.</div></div>`;
    if (f.kind === 'step') return `<div class="fix"><div class="msg">${esc(f.instruction)}</div>
      <div class="cmd"><code>${esc(f.command)}</code><button class="btn small" type="button" data-act="copy" data-id="${esc(q.id)}">${s.copied ? 'Copied' : 'Copy'}</button></div></div>`;
    const diff = s.shown ? `<pre aria-label="Change to ${esc(short(f.file))}">${f.diff.split('\n').map((l) => `<span class="${l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'del' : ''}">${esc(l)}</span>`).join('\n')}</pre>` : '';
    const dirty = f.dirty && !s.error ? `<div class="msg" data-tone="off">${esc(short(f.file))} has changes you haven't committed. Apply writes over the file as it is now.</div>` : '';
    const state = s.busy ? `<div class="msg">Writing ${esc(short(f.file))}…</div>`
      : s.error ? `<div class="msg" data-tone="off">${esc(s.error)}</div><div class="row"><button class="link" type="button" data-act="reread" data-id="${esc(q.id)}">Read again</button></div>`
      : `<div class="row"><button class="link" type="button" data-act="${s.shown ? 'hide' : 'show'}" data-id="${esc(q.id)}" aria-expanded="${!!s.shown}">${s.shown ? 'Hide change' : `Show change to ${esc(short(f.file))}`}</button></div>`;
    return `<div class="fix">${diff}${dirty}${state}</div>`;
  }

  #footHtml(missing) {
    const ticked = missing.filter((q) => this.#ticked.has(q.id) && !this.#row.get(q.id)?.done);
    const writable = ticked.filter((q) => q.fix?.kind === 'diff');
    const busy = missing.some((q) => this.#row.get(q.id)?.busy);
    const fixed = missing.filter((q) => this.#row.get(q.id)?.done).length;
    const count = fixed && !ticked.length ? `<span class="count" data-tone="on">${plural(fixed, 'fix', 'fixes')} written</span>` : `<span class="count">${ticked.length ? `${ticked.length} selected` : 'Nothing selected'}</span>`;
    return `<div class="foot">${count}
      <button class="btn" type="button" data-act="copy-all" ${ticked.length ? '' : 'disabled'}>${this.#copied ? 'Copied' : 'Copy for agent'}</button>
      <button class="btn primary" type="button" data-act="apply" ${writable.length && !busy ? '' : 'disabled'} ${busy ? 'aria-busy="true"' : ''}
        title="${writable.length ? 'Writes these changes to your config' : 'Nothing ticked is a change Plumber can write: copy the steps instead'}">${busy ? 'Applying' : `Apply ${writable.length || ''}`.trim()}</button>
    </div>`;
  }

  // ── focus survives a redraw ──────────────────────────────

  #focusKey() {
    const a = this.#root.activeElement;
    if (!a || !this.#panel?.contains(a)) return null;
    if (a.dataset.act) return `[data-act="${a.dataset.act}"]${a.dataset.id ? `[data-id="${CSS.escape(a.dataset.id)}"]` : ''}`;
    if (a.classList.contains('box')) return `.box[data-id="${CSS.escape(a.dataset.id)}"]`;
    return a.classList.contains('close') ? '.close' : null;
  }
  #restoreFocus(key) { if (key) this.#panel.querySelector(key)?.focus({ preventScroll: true }); }

  // ── actions ──────────────────────────────────────────────

  #onTick(e) {
    const box = e.target.closest('input.box');
    if (!box) return;
    box.checked ? this.#ticked.add(box.dataset.id) : this.#ticked.delete(box.dataset.id);
    this.#render();
  }

  async #onClick(e) {
    if (e.target.closest('.close')) return this.toggle(false);
    const b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    const id = b.dataset.id, q = id ? this.#req(id) : null, s = { ...(this.#row.get(id) ?? {}) };
    const set = (next) => { this.#row.set(id, next); this.#render(); };
    switch (b.dataset.act) {
      case 'show': return set({ ...s, shown: true });
      case 'hide': return set({ ...s, shown: false });
      case 'reread': this.#row.delete(id); return this.read();
      case 'copy':
        if (await this.#copy(q.fix.command, b)) { set({ ...s, copied: true }); setTimeout(() => set({ ...(this.#row.get(id) ?? {}), copied: false }), COPIED_MS); }
        return;
      case 'copy-all': {
        const ticked = this.#missing().filter((m) => this.#ticked.has(m.id) && !this.#row.get(m.id)?.done);
        if (await this.#copy(this.#instructions(ticked), b)) { this.#copied = true; this.#render(); setTimeout(() => { this.#copied = false; this.#render(); }, COPIED_MS); }
        return;
      }
      case 'apply': return this.#applyTicked();
    }
  }

  async #copy(text, button) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      // No clipboard: select the text where it's shown, so the person can copy it themselves.
      const code = button.parentElement.querySelector('code');
      if (code) { const r = document.createRange(); r.selectNodeContents(code); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); }
      return false;
    }
  }

  // One fix at a time, in order: each write is checked against the file as it is now, so a later fix to the same
  // config sees the earlier one (the engine refuses a stale hash; that row says so and offers Read again).
  async #applyTicked() {
    const todo = this.#missing().filter((q) => this.#ticked.has(q.id) && q.fix?.kind === 'diff' && !this.#row.get(q.id)?.done);
    let wrote = false;
    for (const q of todo) {
      const fresh = this.#req(q.id) ?? q;
      this.#row.set(q.id, { ...(this.#row.get(q.id) ?? {}), busy: true, error: null });
      this.#render();
      try {
        await post('readiness/fix', { id: q.id, hash: fresh.fix.hash, confirm: true, ...(fresh.fix.dirty ? { allowDirty: true } : {}) });
        this.#row.set(q.id, { done: fresh.fix.file });
        wrote = true;
        await this.#refresh(); // the next fix may edit the same file: its hash must be current
      } catch (error) { this.#row.set(q.id, { error: error.message || 'React Plumber refused the change.' }); }
      this.#render();
    }
    // A config change restarts the dev server; read once more when it answers so the list reflects it.
    if (wrote) setTimeout(() => this.read(), 1500);
  }
  async #refresh() { try { const r = await request('readiness', {}); if (r && Array.isArray(r.capabilities)) this.#report = r; } catch {} }

  // Everything ticked, for an agent or a person: what's wrong, where, the exact change or command, then how to check.
  #instructions(items) {
    const lines = [`React Plumber found ${plural(items.length, 'setup problem')} in this project (seen on ${location.host}). Fix each one, then check.`, ''];
    items.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.title} (${q.off ? 'off' : 'limited'}: ${q.hit.map((c) => c.label).join(', ')})`);
      lines.push(`   Why: ${q.loses}`);
      if (q.evidence?.length) lines.push(`   Where: ${q.evidence.map((e) => `${e.file}:${e.line} (${e.text})`).join('; ')}`);
      if (q.fix?.kind === 'diff') {
        lines.push(`   Change ${q.fix.file}:`, '   ```diff', ...q.fix.diff.split('\n').map((l) => `   ${l}`), '   ```');
        if (q.fix.dirty) lines.push(`   Note: ${q.fix.file} has uncommitted changes; apply the change to the file as it is now.`);
      } else if (q.fix?.kind === 'step') lines.push(`   Do: ${q.fix.instruction}`, `   Run: ${q.fix.command}`);
      lines.push('');
    });
    lines.push('Check: run `npx plumber doctor`. Each item above should be gone. Restart the dev server if a config changed.');
    return lines.join('\n');
  }
}

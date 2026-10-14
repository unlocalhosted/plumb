/* ─────────────────────────────────────────────────────────
 * BLUEPRINT FIXES · Plumb overlay
 *
 * Fixing from the blueprint: click a mark, choose the token from its category, see the page take it, write. The marks
 * are the list; picks are previews that stay until Write puts them in source, one apply per file.
 *
 *  chooser    a small card beside the mark: the finding, the change line, the family's form (choices.js, the same
 *             ladder as the reading card), the reason line, and a foot with the file, the reading link, prev/next
 *             and Write. Opens from a click or Enter on a mark, follows the mark as the page scrolls
 *  preview    pointing at a step shows it on the real element (inline !important styles, lifted exactly); clicking
 *             picks it. The mark turns mint and its label says what it becomes
 *  queue      every pick in view, grouped by file at Write: one apply with the picked edit ids and the file's hash.
 *             A written pick keeps its preview until the dev server reloads the element's classes, then lifts
 *  stale      a file that changed since it was read is refused; Read again re-reads those elements and keeps the
 *             picks whose edits still exist
 *  list       the punch list: every drift in view as rows grouped by file, from the dock's list button or L.
 *             Arrows move, Enter opens that drift's chooser, Backspace unpicks, the foot holds Before, Undo, Write.
 *             It is the same queue the marks show, in rows; nothing lives only in the list
 *  before     the page as source has it while on; picks stay queued and their marks stay mint
 *  leave      leaving blueprint lifts every preview and drops the queue: nothing is left on the page
 * ───────────────────────────────────────────────────────── */
import { post } from './api.js';
import { choicesHtml, bindChoices, toPx, fmtPx, esc, code, VALUED } from './choices.js';
import { glyph } from './glyphs.js';

const LIFT = [250, 600, 1200, 2400]; // ms to wait for the dev server to reload a written element's classes
const HOLD = 6000; // ms a "wrote" line stays on the dock

export const LIST_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 3h9M1.5 6h9M1.5 9h6" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';

export const FIX_CSS = `
  /* the chooser: the reading card's vocabulary at the mark, without the drawing */
  .ch { position: fixed; left: 0; top: 0; width: 352px; pointer-events: auto; }
  .ch .card { transform-origin: 16px 0; }
  .ch[data-state="opening"] .card { opacity: 0; transform: translateY(4px); }
  .ch[data-state="moving"] { transition: transform var(--pl-dur-travel) var(--pl-spring); }
  .ch .top .title { flex: 1; min-width: 0; font: 600 12.5px/18px var(--pl-sans); color: var(--pl-ink); white-space: normal; text-wrap: pretty; }
  .ch .top { height: auto; min-height: 32px; padding-block: 7px; align-items: flex-start; }
  .ch .top > .g { flex: none; width: 14px; height: 14px; margin-top: 2px; color: var(--pl-off); }
  .ch .top > .g.quiet { color: var(--pl-ink-2); } .ch .top > .g.ok { color: var(--pl-on); } .ch .top > .g.soft { color: var(--pl-soft); }
  .ch .top .ledger { margin-top: 2px; }
  .ch .top .close { margin-top: -3px; }
  .ch .read { padding: 10px 12px 12px; }
  .ch .read .because { font: 400 12px/17px var(--pl-sans); color: var(--pl-ink-2); }
  .ch .read .empty { margin: 0; font: var(--pl-card-body); color: var(--pl-ink-2); }
  .ch .foot { border-top: 1px solid var(--pl-rule); gap: 6px; }
  .ch .foot .file { all: unset; flex: 0 1 auto; font: var(--pl-card-meta); color: var(--pl-ink-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; padding: 0 2px; border-radius: 3px; }
  @media (hover: hover) and (pointer: fine) { .ch .foot .file:hover { color: var(--pl-ink); } }
  .ch .foot .file:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
  .ch .foot .nav { flex: none; display: inline-flex; align-items: center; gap: 2px; margin-inline-start: auto; font: var(--pl-text-reading); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ch .foot .nav button { all: unset; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 4px; color: var(--pl-ink-2); cursor: pointer; }
  .ch .foot .nav button svg { width: 10px; height: 10px; }
  .ch .foot .nav button:disabled { color: var(--pl-ink-3); cursor: default; }
  @media (hover: hover) and (pointer: fine) { .ch .foot .nav button:not(:disabled):hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .ch .foot .nav button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -1px; }
  .ch .foot .btn.write, .ch .foot .btn.reading { flex: none; }
  .ch .keys { display: flex; gap: 10px; padding: 0 12px 8px; font: var(--pl-text-label); color: var(--pl-ink-3); }
  .ch .keys kbd { font: 500 10px/13px var(--pl-mono); color: var(--pl-ink-2); }
  .ch[data-before] .keys .b { color: var(--pl-instrument); } .ch[data-before] .keys .b kbd { color: var(--pl-instrument); }

  /* the punch list: above the dock, every drift in view in rows */
  .pl { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + 8px); width: 360px; pointer-events: auto; }
  .pl .card { display: flex; flex-direction: column; max-height: min(60vh, 520px); transform-origin: 100% 100%; }
  .pl[data-state="opening"] .card { opacity: 0; transform: translateY(4px); }
  .pl .top { flex: none; }
  .pl .top .title { flex: 1; font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); color: var(--pl-ink-2); }
  .pl .top .title b { color: var(--pl-ink); font-weight: 600; }
  .pl .rows { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 6px 6px; }
  .pl .file { padding: 8px 6px 2px; font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .pl .row { all: unset; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; height: 28px; padding: 0 6px; border-radius: 5px; cursor: pointer; color: var(--pl-ink); }
  .pl .row .g { flex: none; width: 13px; height: 13px; color: var(--pl-off); }
  .pl .row .g.ok { color: var(--pl-on); } .pl .row .g.quiet { color: var(--pl-ink-2); } .pl .row .g.soft { color: var(--pl-soft); }
  .pl .row code { font: var(--pl-card-meta); color: var(--pl-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pl .row .arrow { color: var(--pl-ink-3); }
  .pl .row code.to { color: var(--pl-on); }
  .pl .row .ask { font: var(--pl-text-label); color: var(--pl-ink-2); }
  .pl .row .ask.none { color: var(--pl-ink-3); }
  .pl .row .el { margin-inline-start: auto; flex: none; font: var(--pl-text-label); color: var(--pl-ink-2); }
  .pl .row[aria-current="true"] { box-shadow: inset 0 0 0 1px var(--pl-instrument); }
  @media (hover: hover) and (pointer: fine) { .pl .row:hover { background: var(--pl-paper-2); } }
  .pl .row:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -2px; }
  .pl .empty { margin: 0; padding: 14px 12px; font: var(--pl-card-body); color: var(--pl-ink-2); }
  .pl .foot { flex: none; border-top: 1px solid var(--pl-rule); }
  .pl .foot .btn.write { margin-inline-start: auto; }
`;

const ICON = {
  prev: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  next: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6 4.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
};
const LEDGER = { new: 'new', debt: 'known debt', exception: 'accepted' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export class Fixer {
  #host; #root; #marks; #invalidate; #scale; #el; #list; #listOpen = false;
  #byEl = new WeakMap(); // Element → Map<mark.key, pick>
  #picks = new Set(); // pick: { el, key, file, hash, mark, j, choice, state: 'picked' | 'written' | 'stale' }
  #previews = new Map(); // Element → { styleAttr, original: Map<prop, [value, priority]> }
  #open = null; // { el, id, key, mark (from the blueprint's reading), full (the mark with edits), hash, file, retry }
  #status = null; // { kind: 'writing' | 'wrote' | 'refused' | 'error', text, title }
  #before = false; #frame = 0; #hold = 0; #last = null;

  // host: read(el, fresh), pin(el), close(), announce(text), changed(), forget(); marks: the MarkLayer;
  // invalidate({ file }): the reader re-reads a written file; scale(family): the theme's steps for the ladder
  constructor(host, root, { marks, invalidate, scale }) {
    this.#host = host;
    this.#root = root;
    this.#marks = marks;
    this.#invalidate = invalidate;
    this.#scale = scale;
    this.#el = Object.assign(document.createElement('section'), { className: 'ch', hidden: true });
    this.#list = Object.assign(document.createElement('section'), { className: 'pl', hidden: true });
    root.append(this.#el, this.#list);
  }

  // ── what the marks and the dock ask ──────────────────────
  state(el, mark) {
    const pick = this.#byEl.get(el)?.get(mark.key);
    if (pick) return { kind: pick.state === 'written' ? 'written' : 'picked', to: pick.choice.edit?.to ?? pick.choice.label };
    if (this.#open && this.#open.el === el && this.#open.key === mark.key) return { kind: 'current' };
    return null;
  }
  get isOpen() { return !!this.#open; }
  get listOpen() { return this.#listOpen; }
  get before() { return this.#before; }
  get status() { return this.#status; }
  get stale() { return [...this.#picks].some(p => p.state === 'stale'); }
  // picks that Write would send
  writable() { return [...this.#picks].filter(p => p.state === 'picked' && p.choice.edit); }
  get count() { return [...this.#picks].filter(p => p.state !== 'written').length; }
  occluders() { return [this.#el, this.#list].filter(e => !e.hidden).map(e => e.getBoundingClientRect()); }

  // ── the chooser ──────────────────────────────────────────
  async open(el, mark, id) {
    this.#host.close();
    if (this.#open && this.#open.el === el && this.#open.key === mark.key) return;
    const from = this.#open ? this.#el.getBoundingClientRect() : null;
    this.#open = { el, id, key: mark.key, mark, full: null, hash: null, file: null };
    this.#marks.invalidate();
    this.#render(from ? 'moving' : 'opening');
    this.#follow();
    const full = await this.#host.read(el);
    if (!this.#open || this.#open.el !== el || this.#open.key !== mark.key) return;
    if (full.status === 'starting') { this.#open.message = full.message; this.#render(); setTimeout(() => this.#open?.el === el && this.#open.key === mark.key && this.#reload(), 1000); return; }
    if (full.status !== 'ready') { this.#open.message = full.message; this.#render(); return; }
    const m = full.marks.find(x => x.key === mark.key);
    if (!m) { this.#open.message = 'This mark is no longer in the source. The view is read again.'; this.#render(); return; }
    this.#open.full = structuredClone(m);
    this.#open.hash = full.hash;
    this.#open.file = full.file;
    this.#open.line = full.line;
    // pressed means queued: a single fitting token is offered, not taken, until it is picked
    const pick = this.#byEl.get(el)?.get(mark.key);
    this.#open.full.pick = pick ? pick.j : null;
    this.#render();
  }
  // The theme's scale arrived: the ladder fills in.
  refresh() {
    if (this.#open?.full) this.#render();
  }
  async #reload() {
    const o = this.#open; if (!o) return;
    this.#host.forget();
    await this.open(o.el, o.mark, o.id).catch(() => {});
  }

  close({ focus = true } = {}) {
    const o = this.#open; if (!o) return;
    this.unpeek();
    this.#open = null;
    this.#el.hidden = true;
    this.#el.innerHTML = '';
    cancelAnimationFrame(this.#frame); this.#frame = 0;
    this.#marks.invalidate();
    this.#host.changed();
    if (focus) this.#marks.focus(o.id);
  }

  // The next or previous drift in view, in document order.
  step(dir) {
    const o = this.#open; if (!o) return;
    const order = this.#marks.order();
    const at = order.findIndex(x => x.id === o.id);
    const to = order[at + dir];
    if (to) this.open(to.el, to.mark, to.id);
  }

  #render(state) {
    const o = this.#open; if (!o) return;
    const el = this.#el, m = o.full;
    const order = this.#marks.order(), at = order.findIndex(x => x.id === o.id), n = order.length;
    const writable = this.writable().length;
    const title = (m ?? o.mark).title;
    // focus stays with the chooser across its renders: on the card while reading, then on a step
    const held = state || el.contains(this.#root.activeElement) || !this.#root.activeElement;
    const tone = m ? (this.#byEl.get(o.el)?.get(o.key) ? 'ok' : m.ledger !== 'new' ? 'quiet' : m.soft ? 'soft' : '') : '';
    el.innerHTML = `<div class="card" tabindex="-1" role="dialog" aria-label="Choose a token for ${esc(title.replace(/`/g, ''))}">
      <div class="top">${glyph((m ?? o.mark).glyph, tone || 'off')}<span class="title">${code(title)}</span>
        <span class="ledger ${esc((m ?? o.mark).ledger)}">${LEDGER[(m ?? o.mark).ledger] ?? esc((m ?? o.mark).ledger)}</span>
        <button class="close" aria-label="Close the chooser">${ICON.close}</button></div>
      <div class="read">${m ? `${this.#change(m, o.el)}<div class="edit">${this.#hint(m)}</div>${choicesHtml(m, { el: o.el, scale: this.#scale })}${m.because ? `<div class="because">${esc(m.because)}</div>` : ''}`
        : `<p class="empty">${esc(o.message ?? 'Reading…')}</p>`}</div>
      <div class="foot">
        ${o.file ? `<button class="file" title="${esc(o.file)}:${o.line}">${esc(o.file.split('/').pop())}:${o.line}</button>` : ''}
        <button class="btn plain reading" title="Open the full reading: the drawing, the chain, the words">Reading</button>
        <span class="nav" aria-label="Drift in view"><button class="prev" aria-label="Previous drift ([)" ${at <= 0 ? 'disabled' : ''}>${ICON.prev}</button><span>${at + 1} of ${n}</span><button class="next" aria-label="Next drift (])" ${at >= n - 1 ? 'disabled' : ''}>${ICON.next}</button></span>
        <button class="btn primary write" ${writable ? '' : 'disabled'}>${writable ? `Write ${plural(writable, 'edit')}` : 'Write'}</button>
      </div>
      <div class="keys" aria-hidden="true"><span><kbd>1–9</kbd> pick</span><span><kbd>⌫</kbd> unpick</span><span><kbd>[ ]</kbd> drift</span><span class="b"><kbd>B</kbd> before</span><span><kbd>Esc</kbd> close</span></div>
    </div>`;
    el.hidden = false;
    el.toggleAttribute('data-before', this.#before);
    if (state === 'opening') { el.dataset.state = 'opening'; requestAnimationFrame(() => requestAnimationFrame(() => { el.dataset.state = 'open'; })); }
    else if (state === 'moving') { el.dataset.state = 'moving'; setTimeout(() => { if (el.dataset.state === 'moving') el.dataset.state = 'open'; }, 260); }
    else if (!el.dataset.state) el.dataset.state = 'open';
    this.#bind();
    this.#place();
    if (held) {
      const first = el.querySelector('.cmp .opt[aria-pressed="true"]') ?? el.querySelector('.cmp .opt') ?? el.querySelector('.card');
      first?.focus({ preventScroll: true });
    }
    this.#host.changed();
  }

  #change(m, el) {
    const c = m.pick !== null ? m.choices[m.pick] : null;
    const from = c?.edit?.from ?? m.text;
    const to = c ? `<code class="to">${esc(c.edit?.to ?? c.label)}</code>` : m.choices.length ? '<code class="to waiting">choose below</code>' : '';
    const a = toPx(m.value, el, m.props[0]), z = c ? toPx(c.value, el, m.props[0]) : undefined;
    const show = (v, n) => n !== undefined ? fmtPx(n) : esc(v ?? '');
    const delta = c ? `${show(m.value, a)} → ${show(c.value, z)}` : show(m.value, a);
    return `<div class="change"><code class="from ${m.soft ? 'soft' : ''}">${esc(from)}</code>${to ? `<span class="arrow" aria-hidden="true">→</span>${to}` : ''}<span class="delta">${delta}</span></div>`;
  }
  #hint(m) {
    if (!m.choices.length && !VALUED.includes(m.glyph)) return `<span class="hint">How to fix it</span>`;
    if (!m.choices.length) return `<span class="hint">No token is close</span>`;
    if (m.pick === null) return `<span class="hint">${m.choices.length === 1 ? 'One token fits. Take it with 1, or Enter.' : `${m.choices.length} tokens fit. Pick the one whose reason matches.`}</span>`;
    const c = m.choices[m.pick];
    if (!c.edit) return `<span class="hint">${esc(c.label)} fits, but React Plumber has no exact edit for this syntax. Open the reading and copy for an agent.</span>`;
    return '';
  }

  #bind() {
    const el = this.#el, o = this.#open, m = o.full;
    const on = (sel, fn) => el.querySelector(sel)?.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    on('.close', () => this.close());
    on('.reading', () => { const target = o.el; this.close({ focus: false }); this.#host.pin(target); });
    on('.prev', () => this.step(-1));
    on('.next', () => this.step(1));
    on('.write', () => this.write());
    on('.file', e => this.#copy(e.currentTarget, `${o.file}:${o.line}`));
    if (m) bindChoices(el, m, {
      pick: j => (m.pick === j ? this.unpick() : this.pick(j)),
      peek: j => this.peek(j),
      unpeek: () => this.unpeek(),
    });
    el.querySelector('.card').addEventListener('keydown', e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const onButton = e.target.closest('button');
      if (/^[1-9]$/.test(e.key)) { const opt = el.querySelectorAll('.cmp .opt')[Number(e.key) - 1]; if (opt) { e.preventDefault(); opt.click(); } }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); this.unpick(); }
      else if (e.key === ']' || e.key === 'n' || e.key === 'N') { e.preventDefault(); this.step(1); }
      else if (e.key === '[' || e.key === 'p' || e.key === 'P') { e.preventDefault(); this.step(-1); }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); this.flip(); }
      // Enter means go: on a pressed step (already picked) or off the buttons it writes the queue; a lone fitting
      // token is taken first. Enter on an unpressed step picks it, as a button does; Space toggles either way.
      else if (e.key === 'Enter' && (!onButton || e.target.closest('.opt')?.getAttribute('aria-pressed') === 'true')) { e.preventDefault(); if (m && m.pick === null && m.choices.length === 1) this.pick(0); else this.write(); }
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('.cmp .opt')) {
        // the steps are one row: arrows walk it
        const opts = [...el.querySelectorAll('.cmp .opt')], i = opts.indexOf(e.target.closest('.opt'));
        const next = opts[i + (e.key === 'ArrowRight' ? 1 : -1)];
        if (next) { e.preventDefault(); next.focus(); }
      }
    });
  }

  async #copy(button, text) {
    const label = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied ✓'; } catch { button.textContent = 'Copy failed'; }
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1200);
  }

  // Beside the element it previews, never over it: to its right, else its left, else under or over it; and never
  // under the dock. The mark's own box is the fallback when the element fills the view. Follows the mark while open.
  #place() {
    const o = this.#open; if (!o) return;
    const box = this.#marks.boxOf(o.id) ?? this.#last;
    if (!box) return;
    this.#last = box;
    const el = this.#el, w = el.offsetWidth, h = el.offsetHeight, pad = 8, gap = 12;
    const dock = this.#root.querySelector('.dock')?.getBoundingClientRect();
    const avoid = o.el.getBoundingClientRect();
    const clampY = y => Math.min(Math.max(pad, y), Math.max(pad, innerHeight - h - pad));
    const underDock = (x, y) => dock && x < dock.right + pad && x + w > dock.left - pad && y + h > dock.top - pad;
    const fits = (x, y) => x >= pad && x + w <= innerWidth - pad && y >= pad && y + h <= innerHeight - pad && !underDock(x, y);
    const near = clampY(box.top - 8);
    const tries = [
      [avoid.right + gap, near], [avoid.left - w - gap, near],
      [Math.min(Math.max(pad, box.left), innerWidth - w - pad), avoid.bottom + gap], [Math.min(Math.max(pad, box.left), innerWidth - w - pad), avoid.top - h - gap],
    ];
    let [x, y] = tries.find(([tx, ty]) => fits(tx, ty)) ?? [];
    if (x === undefined) {
      x = Math.min(Math.max(pad, box.left), Math.max(pad, innerWidth - w - pad));
      const floor = dock && x + w > dock.left - pad ? Math.min(innerHeight, dock.top) - pad : innerHeight - pad;
      y = box.bottom + pad;
      if (y + h > floor) y = box.top - h - pad >= pad ? box.top - h - pad : Math.max(pad, floor - h);
    }
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }
  #follow() {
    if (this.#frame) return;
    const tick = () => { if (!this.#open) { this.#frame = 0; return; } this.#place(); this.#frame = requestAnimationFrame(tick); };
    this.#frame = requestAnimationFrame(tick);
  }

  // ── previews ─────────────────────────────────────────────
  #set(el, props, value) {
    let p = this.#previews.get(el);
    if (!p) this.#previews.set(el, (p = { styleAttr: el.getAttribute('style'), original: new Map() }));
    for (const prop of props) {
      if (!p.original.has(prop)) p.original.set(prop, [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop, value, 'important');
    }
  }
  #lift(el) {
    const p = this.#previews.get(el); if (!p) return;
    for (const [prop, [value, priority]] of p.original) value ? el.style.setProperty(prop, value, priority) : el.style.removeProperty(prop);
    // Leave no residue: an element that had no style attribute gets none back (read first, so the removal is last).
    if (p.styleAttr === null && !el.style.length) { el.getAttribute('style'); el.removeAttribute('style'); }
    this.#previews.delete(el);
  }
  // The element as its picks say, from a clean slate (so an unpick on a shared property reads right).
  #repaint(el) {
    this.#lift(el);
    if (this.#before) return;
    for (const pick of this.#byEl.get(el)?.values() ?? []) this.#set(el, pick.mark.props, pick.choice.value);
  }

  // The whole view as designed, held: every new drift in view takes its nearest token at once (a pick keeps its
  // pick), so the page re-lays out the way it would after the fixes. Release puts it back.
  #peeked = null;
  peekAll(items) {
    if (this.#before || this.#peeked) return;
    this.#peeked = new Set();
    for (const { el, marks } of items) for (const m of marks) {
      if (m.ledger !== 'new' || this.#byEl.get(el)?.get(m.key)) continue;
      const fit = (m.choices ?? []).filter(c => c.n !== undefined);
      const c = m.pick !== null && m.pick !== undefined ? m.choices[m.pick] : m.n !== undefined && fit.length ? fit.reduce((best, x) => Math.abs(x.n - m.n) < Math.abs(best.n - m.n) ? x : best) : undefined;
      if (!c) continue;
      this.#set(el, m.props, c.value);
      this.#peeked.add(el);
    }
  }
  unpeekAll() {
    for (const el of this.#peeked ?? []) this.#repaint(el);
    this.#peeked = null;
  }

  peek(j) {
    const o = this.#open; if (!o?.full || this.#before) return;
    const c = o.full.choices[j]; if (!c) return;
    this.#set(o.el, o.full.props, c.value);
    o.peeking = true;
  }
  unpeek() {
    const o = this.#open; if (!o?.peeking) return;
    o.peeking = false;
    this.#repaint(o.el);
  }

  pick(j) {
    const o = this.#open; if (!o?.full) return;
    const c = o.full.choices[j]; if (!c) return;
    o.peeking = false;
    o.full.pick = j;
    let byKey = this.#byEl.get(o.el);
    if (!byKey) this.#byEl.set(o.el, (byKey = new Map()));
    const prior = byKey.get(o.key);
    if (prior) this.#picks.delete(prior);
    const pick = { el: o.el, key: o.key, file: o.file, hash: o.hash, mark: o.full, j, choice: c, state: 'picked' };
    byKey.set(o.key, pick);
    this.#picks.add(pick);
    if (this.#status?.kind !== 'writing') this.#status = null;
    this.#repaint(o.el);
    this.#host.announce(`Picked ${c.edit?.to ?? c.label} for ${o.full.text}`);
    this.#sync();
  }
  // After the queue changes: the marks redraw, the dock recounts, the chooser and the list follow.
  #sync() {
    this.#marks.invalidate();
    if (this.#open) this.#render();
    this.#renderList();
    this.#host.changed();
  }
  #drop(pick) {
    this.#picks.delete(pick);
    this.#byEl.get(pick.el)?.delete(pick.key);
    this.#repaint(pick.el);
  }
  unpick() {
    const o = this.#open; if (!o) return;
    const byKey = this.#byEl.get(o.el), pick = byKey?.get(o.key);
    if (!pick || pick.state === 'written') return;
    this.#drop(pick);
    if (o.full) o.full.pick = null;
    o.peeking = false;
    this.#host.announce(`Unpicked ${o.full?.text ?? ''}`);
    this.#sync();
  }
  // Unpick from the list: by the element and the mark.
  unpickAt(el, key) {
    const pick = this.#byEl.get(el)?.get(key);
    if (!pick || pick.state === 'written') return;
    if (this.#open && this.#open.el === el && this.#open.key === key) return this.unpick();
    this.#drop(pick);
    this.#host.announce(`Unpicked ${pick.mark.text}`);
    this.#sync();
  }

  // Every unwritten pick in view lifted; the queue is empty again.
  undo() {
    this.unpeek();
    for (const pick of [...this.#picks]) if (pick.state !== 'written') this.#drop(pick);
    if (this.#open?.full) this.#open.full.pick = null;
    if (this.#status?.kind !== 'writing') this.#status = null;
    this.#host.announce('Every pick lifted');
    this.#sync();
  }

  // Before: the page as source has it; the queue stays.
  flip(on = !this.#before) {
    if (this.#status?.kind === 'writing') return;
    this.unpeek();
    this.#before = on;
    for (const el of new Set([...this.#picks].map(p => p.el))) this.#repaint(el);
    this.#el.toggleAttribute('data-before', on);
    this.#list.querySelector('.flip')?.setAttribute('aria-pressed', String(on));
    this.#host.changed();
  }

  // ── write ────────────────────────────────────────────────
  async write() {
    if (this.#status?.kind === 'writing') return;
    if (this.stale) return this.reread();
    const picks = this.writable();
    if (!picks.length) return;
    this.unpeek();
    if (this.#before) this.flip(false);
    const byFile = new Map();
    for (const p of picks) (byFile.get(p.file) ?? byFile.set(p.file, []).get(p.file)).push(p);
    const n = picks.length;
    this.#status = { kind: 'writing', text: `Writing ${plural(n, 'edit')}…` };
    this.#host.changed(); this.#render(); this.#renderList();
    const wrote = [], refused = [];
    this.#host.remember(`Wrote ${plural(n, 'edit')} to ${[...byFile.keys()].map(f => f.split('/').pop()).join(', ')}`);
    for (const [file, group] of byFile) {
      // the newest reading of the file decides the hash; the server refuses anything older
      const hash = group.map(p => p.hash).at(-1);
      try {
        await post('apply', { file, hash, edits: group.map(p => ({ id: p.choice.edit.id })) });
        for (const p of group) p.state = 'written';
        wrote.push({ file, n: group.length });
        this.#host.forget();
        this.#invalidate({ file });
        this.#liftWhenReloaded(group);
      } catch (error) {
        const stale = /changed since/i.test(error?.message ?? '');
        for (const p of group) p.state = stale ? 'stale' : 'picked';
        refused.push({ file, stale, message: error?.message ?? 'React Plumber refused the write.' });
      }
    }
    const short = f => f.split('/').pop();
    const said = wrote.map(w => `Wrote ${plural(w.n, 'edit')} to ${short(w.file)}`).join(' · ');
    if (!wrote.length) this.#host.forgetResume();
    if (!refused.length) {
      this.#status = { kind: 'wrote', text: said };
      clearTimeout(this.#hold); this.#hold = setTimeout(() => { if (this.#status?.kind === 'wrote') { this.#status = null; this.#host.changed(); } }, HOLD);
    } else {
      const bad = refused.map(r => r.stale ? `${short(r.file)} changed since React Plumber read it` : `${short(r.file)} refused: ${r.message}`).join(' · ');
      this.#status = { kind: 'refused', text: said ? `${said} · ${bad}` : bad, title: refused.map(r => r.message).join('\n'), stale: refused.some(r => r.stale) };
    }
    this.#host.announce(this.#status.text);
    this.#sync();
  }

  // A written pick keeps its preview until the page carries the change itself (the element's classes change), or
  // for a while if the server never reloads it; then it lifts and leaves the queue.
  async #liftWhenReloaded(group) {
    const before = new Map(group.map(p => [p.el, p.el.getAttribute('class')]));
    for (const [i, wait] of LIFT.entries()) {
      await new Promise(r => setTimeout(r, wait));
      for (const p of [...group]) {
        const el = p.el;
        if (!this.#picks.has(p)) { group.splice(group.indexOf(p), 1); continue; }
        if (!el.isConnected || el.getAttribute('class') !== before.get(el) || i === LIFT.length - 1) {
          if (this.#open && this.#open.el === el && this.#open.key === p.key) this.close({ focus: false });
          this.#drop(p);
          group.splice(group.indexOf(p), 1);
        }
      }
      if (!group.length) break;
    }
    this.#sync();
  }

  // The file changed under a pick: read those elements again and keep the picks whose edits still exist.
  async reread() {
    const stale = [...this.#picks].filter(p => p.state === 'stale');
    if (!stale.length) return;
    this.#status = { kind: 'writing', text: 'Reading again…' };
    this.#host.changed();
    this.#host.forget();
    let kept = 0, dropped = 0;
    for (const p of stale) {
      const full = await this.#host.read(p.el, true).catch(() => null);
      const m = full?.status === 'ready' ? full.marks.find(x => x.key === p.key) : null;
      const j = m ? m.choices.findIndex(c => c.name === p.choice.name) : -1;
      if (m && j >= 0 && m.choices[j].edit) {
        p.mark = structuredClone(m); p.mark.pick = j; p.j = j; p.choice = p.mark.choices[j]; p.hash = full.hash; p.state = 'picked';
        kept++;
      } else {
        this.#drop(p);
        dropped++;
      }
    }
    this.#status = dropped ? { kind: 'error', text: `Read again: ${plural(kept, 'pick')} kept, ${dropped} no longer in the source` } : null;
    if (this.#open) await this.#reload();
    this.#host.announce(this.#status?.text ?? `Read again: ${plural(kept, 'pick')} kept`);
    this.#sync();
  }

  // ── the punch list ───────────────────────────────────────
  toggleList() {
    this.#listOpen ? this.closeList() : this.openList();
  }
  openList() {
    if (this.#listOpen) return;
    this.#listOpen = true;
    this.#list.dataset.state = 'opening';
    this.#renderList();
    requestAnimationFrame(() => requestAnimationFrame(() => { this.#list.dataset.state = 'open'; }));
    const current = this.#list.querySelector('.row[aria-current="true"]') ?? this.#list.querySelector('.row') ?? this.#list.querySelector('.card');
    current?.focus({ preventScroll: true });
    this.#host.changed();
  }
  closeList({ focus = true } = {}) {
    if (!this.#listOpen) return;
    this.#listOpen = false;
    this.#list.hidden = true;
    this.#list.innerHTML = '';
    this.#host.changed();
    if (focus) this.#root.querySelector('.dock .list')?.focus({ preventScroll: true });
  }
  // The drawn set changed (scroll, a reading arrived, a write landed): the rows follow, and the chooser keeps its
  // mark by element and key when the re-read gave it a new id, or closes when the mark is gone from an element
  // still in view (its drift was written, or the source changed).
  ordered() {
    const o = this.#open;
    if (o && !this.#marks.order().some(x => x.id === o.id)) {
      const id = this.#marks.idOf(o.el, o.mark);
      if (id) o.id = id;
      else if (o.el.isConnected && this.#inView(o.el)) this.close({ focus: false });
    }
    if (this.#listOpen) this.#renderList();
    else if (this.#open) this.#render();
  }
  #inView(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  #renderList() {
    if (!this.#listOpen) return;
    const list = this.#list, order = this.#marks.order();
    const had = list.contains(this.#root.activeElement) ? this.#root.activeElement?.dataset.id : null;
    const picked = this.count, off = order.filter(o => o.mark.ledger === 'new').length;
    const writable = this.writable().length, writing = this.#status?.kind === 'writing';
    const byFile = new Map();
    for (const o of order) (byFile.get(o.file ?? '') ?? byFile.set(o.file ?? '', []).get(o.file ?? '')).push(o);
    const row = o => {
      const fix = this.state(o.el, o.mark), current = this.#open?.id === o.id;
      const tone = fix?.kind === 'picked' || fix?.kind === 'written' ? 'ok' : o.mark.ledger !== 'new' ? 'quiet' : o.mark.soft ? 'soft' : 'off';
      const to = fix?.to ? `<span class="arrow" aria-hidden="true">→</span><code class="to">${esc(fix.to)}</code>`
        : o.mark.choices.length ? `<span class="arrow" aria-hidden="true">→</span><span class="ask">pick</span>` : `<span class="ask none">no token</span>`;
      return `<button class="row" role="option" data-id="${esc(o.id)}" tabindex="-1" aria-selected="${!!fix}" aria-current="${current}" aria-label="${esc(o.mark.title.replace(/`/g, ''))}${fix?.to ? `, picked ${esc(fix.to)}` : ''}">${glyph(o.mark.glyph, tone)}<code>${esc(o.mark.text)}</code>${to}<span class="el">${esc(o.el.localName)}</span></button>`;
    };
    list.innerHTML = `<div class="card" tabindex="-1" role="dialog" aria-label="Drift in view">
      <div class="top"><span class="title">In view · <b>${off} off</b>${picked ? ` · <b>${picked} picked</b>` : ''}</span><button class="close" aria-label="Close the list">${ICON.close}</button></div>
      ${order.length ? `<div class="rows" role="listbox" aria-label="Drift in view">${[...byFile].map(([file, rows]) => `<div class="file">${esc(file.split('/').pop() || 'unplaced')}</div>${rows.map(row).join('')}`).join('')}</div>`
        : `<p class="empty">${this.#status ? esc(this.#status.text) : 'Nothing is off in view.'}</p>`}
      <div class="foot">
        <button class="btn plain flip" aria-pressed="${this.#before}" title="The page as source has it (B)" ${picked ? '' : 'disabled'}>Before</button>
        <button class="btn plain undo" title="Lift every pick" ${picked && !writing ? '' : 'disabled'}>Undo</button>
        <button class="btn primary write" ${writable && !writing ? '' : 'disabled'} aria-busy="${writing}">${writing ? 'Writing…' : this.stale ? 'Read again' : `Write ${plural(writable, 'edit')}`}</button>
      </div></div>`;
    list.hidden = false;
    if (!list.dataset.state) list.dataset.state = 'open';
    const on = (sel, fn) => list.querySelector(sel)?.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    on('.close', () => this.closeList());
    on('.flip', () => this.flip());
    on('.undo', () => this.undo());
    on('.write', () => this.write());
    const rows = [...list.querySelectorAll('.row')];
    const at = id => order.find(o => o.id === id);
    rows.forEach((r, i) => {
      r.addEventListener('click', e => { e.stopPropagation(); const o = at(r.dataset.id); if (o) { this.closeList({ focus: false }); this.open(o.el, o.mark, o.id); } });
      r.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); rows[(i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus(); }
        else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); const o = at(r.dataset.id); if (o) this.unpickAt(o.el, o.mark.key); }
      });
    });
    list.querySelector('.card').addEventListener('keydown', e => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); this.flip(); }
      else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); this.write(); }
    });
    // focus stays on the row it was on, across renders
    const back = had ? list.querySelector(`.row[data-id="${CSS.escape(had)}"]`) : null;
    if (back) back.focus({ preventScroll: true });
    else if (had !== null && this.#root.activeElement && !list.contains(this.#root.activeElement)) rows[0]?.focus({ preventScroll: true });
    rows.forEach(r => r.tabIndex = -1);
    (back ?? rows[0])?.setAttribute('tabindex', '0');
  }

  // The page reloaded after a write (a dev server without fast refresh): say what was written.
  resumed(text) {
    this.#status = { kind: 'wrote', text };
    clearTimeout(this.#hold); this.#hold = setTimeout(() => { if (this.#status?.kind === 'wrote') { this.#status = null; this.#host.changed(); } }, HOLD);
    this.#host.changed();
  }

  // Leaving blueprint: nothing stays on the page, nothing stays queued.
  leave() {
    this.close({ focus: false });
    this.closeList({ focus: false });
    for (const el of [...this.#previews.keys()]) this.#lift(el);
    for (const pick of this.#picks) this.#byEl.get(pick.el)?.delete(pick.key);
    this.#picks.clear();
    this.#before = false;
    this.#status = null;
    clearTimeout(this.#hold);
  }
}

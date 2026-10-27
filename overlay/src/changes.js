/* ─────────────────────────────────────────────────────────
 * CHANGES · React Plumber overlay
 *
 * What you have changed on the page, collected per element, in a bar docked on the right: you keep editing (drag a
 * margin, step a gap) and the bar keeps the list; you step through it, drop what you don't want, and accept the rest
 * into source in one go.
 *
 *  row       one per element: its name, and each property changed on it (the block's icon, from → to, as steps)
 *  select    J/K or ↑↓ (or a click) moves between elements; the page scrolls to the selected one and outlines it
 *  discard   × on a row puts that element back as it was (every property) and drops the row; Discard all, all of them
 *  accept    Accept writes every change through onAccept, element by element; a row that is refused stays, with why
 *  states    hidden when nothing is changed; writing (Accept busy, rows quiet); refused (the row's reason in coral)
 *  preview   the changes live on the page as inline styles the overlay owns until they are written or dropped
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { BLOCK_ICONS } from './boxmodel.js';

// a property as a person says it: padding-right → right padding
const said = (prop) => { const [k, side] = prop.split('-'); return side && !/gap/.test(prop) ? `${side} ${k}` : prop.replace('-', ' '); };

export const CHANGES_CSS = `
  .cg { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-start: var(--pl-space-6); width: 300px; max-width: calc(100vw - 2 * var(--pl-space-6));
    max-height: calc(100vh - 2 * var(--pl-space-6) - var(--pl-tag-h) - 18px); display: flex; flex-direction: column; box-sizing: border-box; pointer-events: auto;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); color: var(--pl-ink);
    animation: pl-pop 260ms var(--pl-spring-pop) both; }
  .cg[hidden] { display: none; }
  .cg .top { display: flex; align-items: baseline; gap: var(--pl-space-3); padding: var(--pl-space-5) var(--pl-space-5) var(--pl-space-3); }
  .cg .top b { font: var(--pl-card-title); }
  .cg .top span { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .cg .rows { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 var(--pl-space-3) var(--pl-space-3); }
  .cg .el { position: relative; padding: var(--pl-space-3) var(--pl-space-4); border-radius: var(--pl-radius-row); cursor: pointer; }
  .cg .el + .el { margin-top: 2px; }
  @media (hover: hover) and (pointer: fine) { .cg .el:hover { background: var(--pl-paper-2); } }
  .cg .el[aria-current="true"] { background: var(--pl-paper-2); box-shadow: inset 2px 0 0 var(--pl-sky); }
  .cg .el:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: -2px; }
  .cg .el .name { display: flex; align-items: center; gap: var(--pl-space-3); }
  .cg .el .x { all: unset; margin-inline-start: auto; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; color: var(--pl-ink-2); cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .cg .el .x:hover { background: var(--pl-coral-soft); color: var(--pl-coral-ink); } }
  .cg .el .x:focus-visible { outline: 2px solid var(--pl-sky); }
  .cg .chg { display: flex; align-items: center; gap: var(--pl-space-3); margin-top: var(--pl-space-2); font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .cg .chg i { width: 13px; height: 13px; color: var(--pl-sky); flex: none; }
  .cg .chg i svg { display: block; width: 100%; height: 100%; }
  .cg .chg .from { font: var(--pl-card-code); color: var(--pl-ink-2); text-decoration: line-through; text-decoration-color: color-mix(in oklab, var(--pl-ink-2) 60%, transparent); }
  .cg .chg .to { font: var(--pl-card-code); color: var(--pl-ink); }
  .cg .chg .prop { min-width: 92px; }
  .cg .el .why { margin-top: var(--pl-space-2); font: var(--pl-card-meta); color: var(--pl-coral); }
  .cg .foot { display: flex; align-items: center; gap: var(--pl-space-3); padding: var(--pl-space-4) var(--pl-space-5); border-top: 1px solid var(--pl-rule); }
  .cg .foot button { all: unset; cursor: pointer; padding: 5px 10px; border-radius: 7px; font: var(--pl-text-label); }
  .cg .foot .all { color: var(--pl-ink-2); }
  @media (hover: hover) and (pointer: fine) { .cg .foot .all:hover { background: var(--pl-paper-2); color: var(--pl-ink); } }
  .cg .foot .ok { margin-inline-start: auto; background: var(--pl-action-soft); color: var(--pl-on-action); }
  .cg .foot button:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 1px; }
  .cg .foot button:disabled { opacity: 0.5; cursor: default; }
  .cg[aria-busy="true"] .rows { opacity: 0.6; }
  .cg .keys { font: var(--pl-card-meta); color: var(--pl-ink-3); }
  @media (prefers-reduced-motion: reduce) { .cg { animation: none; } }
`;

const KIND = (prop) => (/^margin/.test(prop) ? 'm' : /^padding/.test(prop) ? 'p' : /gap$/.test(prop) ? 'g' : /radius/.test(prop) ? 'r' : /border/.test(prop) ? 'b' : 'c');
const X = '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

export class Changes {
  #el; #items = new Map(); // element → { name, props: Map<prop, { from, to, original: [value, priority] }>, why }
  #at = null; #busy = false; #onAccept; #onSelect;

  // onAccept([{ el, name, props: [{ prop, from, to }] }]) → Promise<[{ el, ok, why? }]>; onSelect(el) lights it
  constructor(root, { onAccept, onSelect } = {}) {
    this.#onAccept = onAccept;
    this.#onSelect = onSelect;
    this.#el = Object.assign(document.createElement('aside'), { className: 'cg', hidden: true });
    this.#el.setAttribute('aria-label', 'Changes on this page');
    root.append(this.#el);
    this.#el.addEventListener('click', (e) => {
      const row = e.target.closest('.el');
      if (e.target.closest('.x') && row) return this.discard(this.#byIndex(+row.dataset.i));
      if (row) return this.select(this.#byIndex(+row.dataset.i));
      if (e.target.closest('.all')) return this.discardAll();
      if (e.target.closest('.ok')) return this.accept();
    });
  }

  has(el) { return this.#items.has(el); }
  get count() { return [...this.#items.values()].reduce((n, i) => n + i.props.size + i.swaps.size, 0); }
  get rect() { return this.#el.hidden ? null : this.#el.getBoundingClientRect(); }
  #byIndex(i) { return [...this.#items.keys()][i]; }

  #item(el, name) {
    let item = this.#items.get(el);
    // the classes as written, before any preview: every change on the element is written against them
    if (!item) this.#items.set(el, (item = { name, props: new Map(), swaps: new Map(), classes: (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean), why: null }));
    return item;
  }
  // A class edit taken from a problem's fix (a craft fix, a theme token): { label, from, to, write: { from, to }, undo }
  put(el, name, key, change) {
    const item = this.#item(el, name);
    item.swaps.get(key)?.undo?.();
    item.swaps.set(key, change);
    this.render();
    this.#at = el;
    this.render();
  }
  // A property of an element took a new step (from a drag). Back at where it started, the change is dropped.
  set(el, name, prop, from, to, original) {
    const item = this.#item(el, name);
    const had = item.props.get(prop);
    if (had && had.from.token === to.token) item.props.delete(prop);
    else item.props.set(prop, { from: had?.from ?? from, to, original: had?.original ?? original });
    if (!item.props.size && !item.swaps.size) this.#items.delete(el);
    this.#at = this.#items.has(el) ? el : this.#at;
    this.render();
  }

  select(el) {
    if (!this.#items.has(el)) return;
    this.#at = el;
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    this.#onSelect?.(el);
    this.render();
  }
  move(dir) {
    const els = [...this.#items.keys()];
    if (!els.length) return false;
    const i = els.indexOf(this.#at);
    this.select(els[Math.max(0, Math.min(els.length - 1, (i < 0 ? 0 : i + dir)))]);
    return true;
  }

  // An element back as it was: every property it changed, its inline styles as they were.
  discard(el) {
    const item = this.#items.get(el);
    if (!item) return;
    for (const [prop, c] of item.props) { const [v, p] = c.original ?? ['', '']; if (v) el.style.setProperty(prop, v, p); else el.style.removeProperty(prop); }
    for (const c of item.swaps.values()) c.undo?.();
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    this.#items.delete(el);
    if (this.#at === el) this.#at = [...this.#items.keys()][0] ?? null;
    this.render();
  }
  discardAll() { for (const el of [...this.#items.keys()]) this.discard(el); }

  async accept() {
    if (this.#busy || !this.#items.size) return;
    this.#busy = true; this.render();
    const batch = [...this.#items].map(([el, i]) => ({ el, name: i.name, classes: i.classes, props: [...i.props].map(([prop, c]) => ({ prop, from: c.from, to: c.to })), writes: [...i.swaps.values()].map((c) => c.write) }));
    const results = (await this.#onAccept?.(batch).catch((error) => batch.map((b) => ({ el: b.el, ok: false, why: error?.message })))) ?? [];
    for (const r of results) {
      const item = this.#items.get(r.el);
      if (!item) continue;
      if (r.ok) this.#items.delete(r.el); else item.why = r.why ?? 'Couldn’t apply.';
    }
    this.#busy = false;
    if (!this.#items.has(this.#at)) this.#at = [...this.#items.keys()][0] ?? null;
    this.render();
  }

  render() {
    const n = this.count;
    this.#el.hidden = !n;
    if (!n) return;
    this.#el.setAttribute('aria-busy', String(this.#busy));
    const els = [...this.#items];
    this.#el.innerHTML = `<div class="top"><b>Changes</b><span>${els.length} element${els.length === 1 ? '' : 's'} · ${n} change${n === 1 ? '' : 's'}</span></div>
      <div class="rows" role="list">${els.map(([el, i], k) => `<div class="el" role="listitem" tabindex="0" data-i="${k}"${el === this.#at ? ' aria-current="true"' : ''}>
        <div class="name"><span class="pl-tag">${esc(i.name)}</span><button type="button" class="x" aria-label="Discard the changes to ${esc(i.name)}" title="Discard">${X}</button></div>
        ${[...i.swaps.values()].map((c) => `<div class="chg"><i></i><span class="prop">${esc(c.label)}</span><span class="from">${esc(c.from)}</span>→<span class="to">${esc(c.to)}</span></div>`).join('')}
        ${[...i.props].map(([prop, c]) => `<div class="chg"><i>${BLOCK_ICONS[KIND(prop)] ?? ''}</i><span class="prop">${esc(said(prop))}</span><span class="from">${esc(Math.round(c.from.n))}</span>→<span class="to">${esc(`${Math.round(c.to.n)}${c.to.token ? ` (${c.to.token})` : ''}`)}</span></div>`).join('')}
        ${i.why ? `<div class="why">${esc(i.why)}</div>` : ''}</div>`).join('')}</div>
      <div class="foot"><span class="keys">J K step</span><button type="button" class="all">Discard all</button><button type="button" class="ok"${this.#busy ? ' disabled' : ''}>${this.#busy ? 'Applying…' : `Apply ${n} change${n === 1 ? '' : 's'}`}</button></div>`;
  }
}

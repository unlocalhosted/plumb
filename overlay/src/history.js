/* ─────────────────────────────────────────────────────────
 * WRITE HISTORY · React Plumber overlay
 *
 * Every write can be taken back (docs/briefs/editor-roadmap.md). The server keeps the last twenty writes and returns
 * an undo handle with each one (POST /undo restores the file while nothing has touched it since).
 *
 *  toast    after any write (words, a blueprint fix, a card's Write): what was written and where, with Undo, for a
 *           few seconds by the dock. A dev server that reloads the page after the write brings the toast back
 *  list     the dock's history button: the recent writes, newest first, each with Undo. A write that something newer
 *           changed since says so instead of undoing it
 *  undo     restores the file; the page follows through the dev server. A refusal says why, in the toast
 * ───────────────────────────────────────────────────────── */
import { request, post } from './api.js';
import { esc } from './choices.js';

export const HISTORY_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 4.2A4.25 4.25 0 1 1 1.75 6.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M1.6 1.8v2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3.75V6l1.6 1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

const HOLD = 6000;
const RESUME = 'plumb:wrote';
const short = (file) => String(file ?? '').split('/').pop();
const ago = (at) => { const s = Math.round((Date.now() - Date.parse(at)) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; };

export const HISTORY_CSS = `
  .wt { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4));
    display: flex; align-items: center; gap: var(--pl-space-4); max-width: min(440px, calc(100vw - 2 * var(--pl-space-6))); box-sizing: border-box;
    padding: var(--pl-space-3) var(--pl-space-3) var(--pl-space-3) var(--pl-space-5); pointer-events: auto;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); font: var(--pl-card-meta); color: var(--pl-ink);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .wt[data-on] { opacity: 1; translate: 0 0; }
  .wt .what { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wt .what code, .hl code { font: var(--pl-card-code); }
  .wt[data-kind="error"] .what { color: var(--pl-off); white-space: normal; }
  :is(.wt, .hl) button { all: unset; cursor: pointer; padding: 3px var(--pl-space-4); border-radius: var(--pl-radius-tag); font: var(--pl-text-label); color: var(--pl-accent); white-space: nowrap; }
  :is(.wt, .hl) button:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 1px; }
  :is(.wt, .hl) button:disabled { color: var(--pl-ink-3); cursor: default; }
  @media (hover: hover) and (pointer: fine) { :is(.wt, .hl) button:not(:disabled):hover { background: var(--pl-paper-2); } }
  .hl { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4)); width: 360px;
    max-width: calc(100vw - 2 * var(--pl-space-6)); max-height: min(60vh, 460px); overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; pointer-events: auto;
    padding: var(--pl-space-4) var(--pl-space-3) var(--pl-space-3); background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); color: var(--pl-ink);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .hl[data-on] { opacity: 1; translate: 0 0; }
  .hl .title { font: var(--pl-card-title); padding: 0 var(--pl-space-3) var(--pl-space-3); }
  .hl .row { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: var(--pl-space-4); padding: var(--pl-space-3); border-radius: var(--pl-radius-row); }
  .hl .row + .row { border-top: 1px solid var(--pl-rule); }
  .hl .row .label { font: var(--pl-card-body); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hl .row .where { grid-column: 1; font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .hl .row button { grid-row: 1 / span 2; grid-column: 2; }
  .hl .empty { padding: var(--pl-space-3); font: var(--pl-card-body); color: var(--pl-ink-2); }
  @media (prefers-reduced-motion: reduce) { .wt, .hl { transition: none; translate: 0 0; } }
`;

export class History {
  #toast; #list; #button; #host; #timer = 0; #last = null;

  // button: the dock's history button; host: announce(text), changed()
  constructor(root, { button, host }) {
    this.#button = button;
    this.#host = host;
    this.#toast = Object.assign(document.createElement('div'), { className: 'wt', hidden: true });
    this.#toast.setAttribute('role', 'status');
    this.#list = Object.assign(document.createElement('section'), { className: 'hl', hidden: true });
    this.#list.setAttribute('role', 'dialog');
    this.#list.setAttribute('aria-label', 'Recent writes');
    this.#list.tabIndex = -1;
    root.append(this.#toast, this.#list);
    button.addEventListener('click', () => this.toggle());
    this.#toast.addEventListener('click', (e) => { if (e.target.closest('.undo') && this.#last) this.undo(this.#last); });
    this.#list.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) this.undo({ id: b.dataset.id, file: b.dataset.file, label: b.dataset.label }); });
    this.#resume();
  }

  get open() { return !this.#list.hidden; }
  occluders() { return [this.#toast, this.#list].filter((e) => !e.hidden).map((e) => e.getBoundingClientRect()); }

  // A write landed: say it, with Undo. `result` is the server's answer (it carries `undo`); `text` says it in words.
  wrote(result, text) {
    const handle = result?.undo;
    if (!handle) return this.#say(text ?? `Wrote ${short(result?.file)}`);
    this.#last = handle;
    const said = text ?? `Wrote ${handle.label} in ${short(handle.file)}`;
    // a dev server may reload the page after the write: the toast comes back after it
    try { sessionStorage.setItem(RESUME, JSON.stringify({ handle, text: said, at: Date.now() })); } catch {}
    this.#say(said, true);
    if (this.open) this.#render();
  }

  async undo(handle) {
    try { sessionStorage.removeItem(RESUME); } catch {}
    try {
      await post('undo', { id: handle.id });
      if (this.#last?.id === handle.id) this.#last = null;
      this.#say(`Undid ${handle.label ?? 'the write'} in ${short(handle.file)}`);
      this.#host.announce?.(`Undid the write in ${short(handle.file)}`);
    } catch (error) {
      this.#say(/changed since/i.test(error?.message ?? '') ? `${short(handle.file)} changed since that write: undo the newer ones first.` : `Couldn’t undo: ${error?.message ?? 'refused'}`, false, 'error');
    }
    if (this.open) this.#render();
    this.#host.changed?.();
  }

  toggle(on = !this.open) {
    this.#button.setAttribute('aria-pressed', String(on));
    if (!on) { this.#list.removeAttribute('data-on'); this.#list.hidden = true; return; }
    this.#list.hidden = false;
    this.#render();
    requestAnimationFrame(() => this.#list.setAttribute('data-on', ''));
    this.#list.focus({ preventScroll: true });
  }
  escape() { if (this.open) return this.toggle(false), true; return false; }

  async #render() {
    const said = await request('history', {}).catch(() => null);
    const writes = said?.writes ?? [];
    this.#list.innerHTML = `<div class="title">Recent writes</div>${writes.length ? writes.map((w) => `<div class="row"><span class="label">${esc(w.label)}</span><span class="where"><code>${esc(short(w.file))}:${w.line}</code> · ${esc(ago(w.at))}</span><button type="button" data-id="${esc(w.id)}" data-file="${esc(w.file)}" data-label="${esc(w.label)}">Undo</button></div>`).join('')
      : '<div class="empty">Nothing written yet in this session.</div>'}`;
  }

  #say(text, undo = false, kind = '') {
    clearTimeout(this.#timer);
    this.#toast.dataset.kind = kind;
    this.#toast.innerHTML = `<span class="what">${esc(text)}</span>${undo ? '<button type="button" class="undo">Undo</button>' : ''}`;
    this.#toast.hidden = false;
    requestAnimationFrame(() => this.#toast.setAttribute('data-on', ''));
    this.#timer = setTimeout(() => {
      this.#toast.removeAttribute('data-on');
      setTimeout(() => { this.#toast.hidden = true; }, 160);
      try { sessionStorage.removeItem(RESUME); } catch {}
    }, HOLD);
  }

  #resume() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    this.#last = saved.handle;
    setTimeout(() => this.#say(saved.text, true), 150);
  }
}

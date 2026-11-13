/* ─────────────────────────────────────────────────────────
 * TEXT EDITING · React Plumber overlay
 *
 * Words on the page edited like a CMS: double-click them, type, done (docs/briefs/text-editing.md, layer 2).
 *
 *  start      a double-click on words anywhere on the page, with nothing pinned first. Inputs, textareas and the
 *             page's own editable regions are left alone. In blueprint the glass lets the edit through
 *  resolve    the words are looked up in source: the string that renders them, wherever it is written (text-at). A
 *             server without text-at falls back to the element's own JSX text (the text route). The words keep the
 *             page's own double-click (a word selected) until they are known to be editable
 *  edit       a leaf (the words are the element's only child) becomes contenteditable="plaintext-only" for the edit:
 *             the browser's own caret, selection and wrapping, in the page's font. Words mixed with other elements
 *             get a textarea laid over their line boxes, its own glyphs transparent, so the page re-flows as you type
 *  look       a 1.5px accent ring around the words and a tag under them: where they are written, ↵ apply · Esc
 *  save       Enter, or clicking away, writes the words to source at once; Esc puts them back. Newlines are not text a
 *             JSX run keeps, so Shift+Enter does nothing
 *  after      the write history's toast (history.js) says what was written, with Undo; a dev server without fast
 *             refresh reloads the page after a write, and blueprint, if it was on, comes back with it
 *  refused    words that can't be edited say why, beside the words, and where to change them by hand
 * ───────────────────────────────────────────────────────── */
import { errorIs, request, post } from './api.js';
import { locate } from './locate.js';
import { esc } from './choices.js';
import { Scope } from './scope.js';

const RESUME = 'plumb:text-resume';

// What an edit changed, in words: only the words that differ, with none of the sentence around them
// ("and" → "then" in a long caption reads as Changed “and” to “then”)
function changed(from, to) {
  const a = from.split(/(\s+)/), b = to.split(/(\s+)/);
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const was = a.slice(i, a.length - j).join('').trim(), now = b.slice(i, b.length - j).join('').trim();
  const cut = (w) => (w.length > 40 ? `${w.slice(0, 39)}…` : w);
  return !was ? `Added “${cut(now)}”` : !now ? `Removed “${cut(was)}”` : `Changed “${cut(was)}” to “${cut(now)}”`;
}
export const TEXT_EDIT_CSS = `
  .tx-ring { position: fixed; pointer-events: none; border-radius: 3px; box-shadow: 0 0 0 1.5px var(--pl-instrument), 0 0 0 3.5px var(--pl-halo); }
  .tx-tag { position: fixed; pointer-events: none; display: flex; align-items: center; gap: var(--pl-space-3); height: var(--pl-tag-h); padding: 0 var(--pl-space-4);
    border-radius: var(--pl-radius-tag); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-tag); font: var(--pl-card-meta); color: var(--pl-text-secondary); white-space: nowrap; }
  .tx-tag code { font: var(--pl-card-code); color: var(--pl-text-primary); }
  .tx-tag kbd { font: 500 10px/13px var(--pl-mono); color: var(--pl-text-secondary); }
  .tx-tag[data-kind="saving"] { color: var(--pl-instrument); }
  .tx-tag[data-kind="refused"] { color: var(--pl-text-primary); max-width: min(420px, calc(100vw - 32px)); height: auto; min-height: var(--pl-tag-h); padding-block: var(--pl-space-3); white-space: normal; }
  .tx-tag[data-kind="error"] { color: var(--pl-off); }
  .tx-area { position: fixed; margin: 0; padding: 0; border: 0; outline: none; resize: none; overflow: hidden; background: transparent;
    color: transparent; caret-color: var(--pl-instrument); pointer-events: auto; }
  .tx-area::selection { background: color-mix(in oklab, var(--pl-instrument) 28%, transparent); color: transparent; }
`;

const norm = (v) => v.replace(/\s+/g, ' ').trim();
const short = (file) => String(file ?? '').split('/').pop();
// Something on the page that already takes typing: its own double-click is its own
const ownEditing = (el) => !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');

// The text node and offset under a point, through the overlay.
function caretAt(x, y) {
  const pos = document.caretPositionFromPoint?.(x, y);
  if (pos) return { node: pos.offsetNode, offset: pos.offset };
  const range = document.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

// One phase (docs/state-machines/text-edit-spec.md, read by `sm`: docs/briefs/state-oracle-spec.md): idle → resolving →
// editing → saving → idle, or → error → idle. Only `editing` owns the keys; saving and error are said beside the words
// while the page's keys work as ever. `cancel` is Esc, and Enter with the words unchanged; `unmount` is the overlay
// going (destroy), which also lets go of a lookup or a write still out (its token).
/** @machine */
export const TEXT_EDIT = {
  id: 'text-edit',
  owner: 'TextEditor',
  field: '#phase',
  token: '#flight',
  initial: 'idle',
  cancel: ['cancel', 'unmount'],
  states: {
    idle:      { on: { start: 'resolving' }, ignores: ['cancel', 'unmount'] },
    resolving: { flight: 'resolve', on: { edit: 'editing', refused: 'idle', gone: 'idle', unmount: 'idle' }, ignores: ['cancel'] }, // a second double-click is the first's
    editing:   { on: { save: 'saving', cancel: 'idle', unmount: 'idle' } },
    saving:    { flight: 'write', on: { saved: 'idle', failed: 'error', unmount: 'idle' }, ignores: ['cancel'] }, // the keys are the page's: Esc is not the edit's
    error:     { on: { dismiss: 'idle', expired: 'idle', unmount: 'idle' }, ignores: ['cancel'] },
  },
  flights: {
    resolve: { ifLeft: 'drop' },
    write: { ifLeft: 'handOff' }, // destroyed while it was written: History still says it
  },
};

export class TextEditor {
  #root; #host; #ring; #tag; #edit = null;
  #phase = TEXT_EDIT.initial;
  #flight = null; // the lookup or the write out: {} per run; destroy() lets it go
  // What the phase started (its listeners, its timer) ends when the phase is left (scope.js). An edit on screen has its
  // own scope, across editing, saving and error; the note beside words that can't be edited has one too.
  #scope = new Scope();
  #notice = null;
  #send(event) {
    const next = TEXT_EDIT.states[this.#phase]?.on?.[event];
    if (next) { this.#phase = next; this.#scope.end(); this.#scope = new Scope(); }
    return !!next;
  }

  // host: editing(on, rect) lets the edit through blueprint's glass; announce(text); changed(); inBlueprint() and
  // blueprint() say whether blueprint is on and turn it back on after a reload
  constructor(root, host) {
    this.#root = root;
    this.#host = host;
    this.#ring = Object.assign(document.createElement('div'), { className: 'tx-ring', hidden: true });
    this.#tag = Object.assign(document.createElement('div'), { className: 'tx-tag', hidden: true });
    this.#tag.setAttribute('role', 'status');
    root.append(this.#ring, this.#tag);
    this.#resume();
  }

  // After a write that reloaded the page: blueprint, if it was on, comes back with it. And when the reload came before
  // the server's answer did, History never heard what was written: the words are said here, with the Undo of the write
  // the server made to that file since.
  #resume() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); sessionStorage.removeItem(RESUME); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    if (saved.blueprint) this.#host.blueprint?.();
    if (!saved.said || this.#host.heard?.()) return;
    request('history', {}).then((h) => {
      const made = (h?.writes ?? []).find((w) => Date.parse(w.at) >= saved.at - 250 && !w.stale && (!saved.file || w.file === saved.file));
      if (made) this.#host.wrote?.({ undo: { id: made.id, file: made.file, label: made.label } }, saved.said);
    }, () => {});
  }

  get editing() { return this.#phase === 'editing'; }
  get phase() { return this.#phase; }

  // A double-click at a point on the page. True when it was taken (the words are being edited or explained).
  async dblclick(event) {
    if (this.#phase !== 'idle' && this.#phase !== 'error') return false;
    const hit = caretAt(event.clientX, event.clientY);
    const node = hit?.node;
    if (node?.nodeType !== Node.TEXT_NODE || !norm(node.data)) return false;
    const el = node.parentElement;
    if (!el || el.closest('plumb-overlay') || ownEditing(el)) return false;
    return this.start(node, hit.offset);
  }

  // Edit one text node: resolve it, then make it editable where it is.
  async start(node, offset = null) {
    // one edit at a time: a second double-click while the first is read is the first's. A failed save's message gives
    // way to the next try
    if (this.#phase === 'error') { this.#send('dismiss'); this.#end(); }
    if (!this.#send('start')) return false;
    this.#notice?.end(); // a note about other words must not hide this edit's tag when its time is up
    const flight = (this.#flight = {});
    const el = node.parentElement, words = norm(node.data);
    const target = await this.#resolve(el, words).catch((error) => ({ editable: false, reason: error?.message ?? "React Plumber couldn't read this text." }));
    if (this.#flight !== flight) return false; // let go meanwhile (destroyed)
    this.#flight = null;
    if (!node.isConnected) { this.#send('gone'); return false; }
    if (!target.editable) { this.#send('refused'); this.#refusal(node, target); return true; }
    this.#begin(node, target, offset);
    return true;
  }

  // The string in source that renders these words.
  async #resolve(el, words) {
    const found = await locate(el);
    if (!found?.file) return { editable: false, reason: 'Can’t find this text in your code.' };
    const at = { file: found.file, line: found.line, column: found.column };
    const owners = (found.chain ?? []).filter((c) => c?.file).map((c) => `${c.file}:${c.line}:${c.column}`).join(',');
    try {
      const r = await request('text-at', { ...at, text: words, owners }, { throws: true });
      if (r) return r.editable ? { ...r, via: 'text-at' } : r;
    } catch (error) {
      if (!errorIs(error, 'not-found')) throw error;
    }
    // an older server: the element's own JSX text
    const t = await request('text', at);
    if (!t?.editable) return { editable: false, reason: t?.reason ?? 'This text is built by code, so it can’t be edited here.', where: at };
    const run = t.runs.find((r) => norm(r.text) === words);
    if (!run) return { editable: false, reason: 'This text is written in another component, not here.', where: at };
    return { editable: true, via: 'text', file: at.file, line: at.line, hash: t.hash, id: run.id, from: run.text };
  }

  #begin(node, target, offset) {
    const el = node.parentElement;
    const leaf = [...el.childNodes].every((n) => n === node || (n.nodeType === Node.TEXT_NODE && !n.data.trim()));
    const lead = node.data.match(/^\s*/)[0], trail = node.data.match(/\s*$/)[0];
    const ed = { node, el, target, leaf, lead, trail, before: node.data, area: null, done: false, prior: el.getAttribute('contenteditable'), kids: [...el.childNodes], scope: new Scope() };
    this.#edit = ed;
    this.#send('edit');
    this.#host.editing?.(true, () => this.#rect());
    if (leaf) {
      el.setAttribute('contenteditable', 'plaintext-only');
      this.#scope.listen(el, 'keydown', this.#key);
      this.#scope.listen(el, 'blur', this.#blur);
      this.#scope.listen(el, 'input', this.#input);
      el.focus({ preventScroll: true });
      // the word that was double-clicked stays selected, the way the page's own double-click selects it
      const sel = getSelection(), range = document.createRange();
      const text = node.data, at = Math.max(0, Math.min(text.length, offset ?? text.length));
      let a = at, b = at;
      while (a > 0 && /\S/.test(text[a - 1])) a--;
      while (b < text.length && /\S/.test(text[b])) b++;
      if (a === b) (a = lead.length), (b = text.length - trail.length);
      range.setStart(node, a); range.setEnd(node, b);
      sel.removeAllRanges(); sel.addRange(range);
    } else {
      const cs = getComputedStyle(el);
      const area = document.createElement('textarea');
      area.className = 'tx-area';
      area.value = node.data.trim();
      area.spellcheck = false;
      area.setAttribute('aria-label', `Edit “${norm(node.data)}”`);
      for (const k of ['font', 'letterSpacing', 'textTransform', 'wordSpacing', 'lineHeight', 'textAlign']) area.style[k] = cs[k];
      this.#root.append(area);
      ed.area = area;
      this.#scope.listen(area, 'keydown', this.#key);
      this.#scope.listen(area, 'blur', this.#blur);
      this.#scope.listen(area, 'input', () => { node.data = lead + area.value + trail; });
      area.focus({ preventScroll: true });
      area.select();
    }
    this.#say('edit');
    this.#follow();
    ed.scope.frames(this.#follow);
  }

  // The words' box on the page.
  #rect() {
    const ed = this.#edit;
    if (!ed?.node.isConnected) return null;
    if (ed.leaf) return ed.el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(ed.node);
    return range.getBoundingClientRect();
  }

  // Ring, tag and textarea follow the words while the page scrolls or re-flows: every frame of the edit's scope.
  #follow = () => {
    const ed = this.#edit;
    if (!ed) return;
    const r = this.#rect();
    if (r) {
      Object.assign(this.#ring.style, { left: `${r.left - 3}px`, top: `${r.top - 2}px`, width: `${r.width + 6}px`, height: `${r.height + 4}px` });
      this.#ring.hidden = false;
      const tagTop = r.bottom + 8 + 22 > innerHeight ? r.top - 8 - 22 : r.bottom + 8;
      Object.assign(this.#tag.style, { left: `${Math.max(8, Math.min(innerWidth - this.#tag.offsetWidth - 8, r.left))}px`, top: `${tagTop}px` });
      if (ed.area) Object.assign(ed.area.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${Math.max(24, r.width + 2)}px`, height: `${r.height}px` });
    }
  };

  #say(kind, text) {
    const ed = this.#edit, t = this.#tag;
    t.dataset.kind = kind;
    const where = ed ? `<code>${esc(short(ed.target.file))}:${ed.target.line}</code>` : '';
    t.innerHTML = kind === 'edit' ? `${where}<span><kbd>↵</kbd> apply · <kbd>Esc</kbd> cancel</span>`
      : kind === 'saving' ? `${where}<span>Applying…</span>` : esc(text ?? '');
    t.hidden = false;
  }

  #input = () => {
    // plaintext-only keeps it to text, but a paste can still carry line breaks: words are one line in JSX
    const ed = this.#edit;
    if (ed?.leaf && /\n/.test(ed.el.textContent)) ed.el.textContent = ed.el.textContent.replace(/\s*\n\s*/g, ' ');
  };

  #key = (e) => {
    e.stopPropagation();
    // in a button or a link, Space presses it rather than typing: the space is put in by hand
    if (e.key === ' ' && this.#edit?.leaf && !e.metaKey && !e.ctrlKey) { e.preventDefault(); document.execCommand('insertText', false, ' '); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (!e.shiftKey) this.#finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); this.#finish(false); }
  };
  #blur = () => { if (this.#edit && !this.#edit.done) this.#finish(true); };

  // Save or cancel. Saving writes at once; the words stay as typed while the write runs and come back if it is refused.
  async #finish(save) {
    const ed = this.#edit;
    if (!ed || ed.done || this.#phase !== 'editing') return;
    ed.done = true;
    const typed = norm(ed.leaf ? ed.el.textContent : ed.area.value);
    // put the element back the way it was, then show the words that stand
    if (ed.leaf) {
      if (ed.prior === null) ed.el.removeAttribute('contenteditable'); else ed.el.setAttribute('contenteditable', ed.prior);
      // the browser may have split or replaced the text node while editing: the element's own nodes go back, every one
      // of them (React owns the whitespace beside the words too: a node it no longer finds breaks its next update), and
      // the original node carries the words again
      const kids = [...ed.el.childNodes];
      if (kids.length !== ed.kids.length || kids.some((n, i) => n !== ed.kids[i])) ed.el.replaceChildren(...ed.kids);
    } else ed.area.remove();
    getSelection()?.removeAllRanges();
    const keep = save && typed && typed !== norm(ed.target.from);
    ed.node.data = keep ? ed.lead + typed + ed.trail : ed.before;
    if (!keep) { this.#send('cancel'); return this.#end(); }
    // saving: the keys are the page's again (Esc, Alt+B); the words stay as typed until the write answers
    this.#send('save');
    const flight = (this.#flight = {});
    this.#host.editing?.(false);
    this.#say('saving');
    const said = `${changed(norm(ed.target.from), typed)} in ${short(ed.target.file)}`;
    const resume = { at: Date.now(), blueprint: !!this.#host.inBlueprint?.() };
    // what to say is kept with it until the answer is in: a dev server that reloads the page first must not lose it
    try { sessionStorage.setItem(RESUME, JSON.stringify({ ...resume, said, file: ed.target.file })); } catch {}
    const answered = () => { try { if (sessionStorage.getItem(RESUME)) sessionStorage.setItem(RESUME, JSON.stringify(resume)); } catch {} };
    try {
      const result = await this.#write(ed.target, ed.target.from, typed);
      // destroyed while it was written: the write landed all the same, so History says it
      if (this.#flight !== flight) { this.#host.wrote?.(result, said); answered(); return; }
      this.#flight = null;
      this.#send('saved');
      this.#end();
      this.#host.wrote?.(result, said);
      answered();
      this.#host.announce?.(`Applied in ${short(ed.target.file)}`);
    } catch (error) {
      if (this.#flight !== flight) return; // destroyed while it was written: nothing to show it on
      this.#flight = null;
      try { sessionStorage.removeItem(RESUME); } catch {}
      ed.node.data = ed.before;
      const stale = errorIs(error, 'stale-file');
      this.#send('failed');
      this.#say('error', stale ? 'This file changed after we checked it. Double-click to try again.' : (error?.message ?? 'Couldn’t apply the edit.'));
      // the error phase's own timer: gone with the phase when the message is dismissed first
      this.#scope.timeout(() => { this.#send('expired'); this.#end(); }, 2400);
    }
  }

  #write(target, from, to) {
    return target.via === 'text-at'
      ? post('apply-text-at', { file: target.file, hash: target.hash, id: target.id, from, to })
      : post('apply-text', { file: target.file, hash: target.hash, run: target.id, from, to });
  }

  // the edit is over (the phase has moved to idle): nothing on screen, the host told
  #end() {
    this.#edit?.scope.end();
    this.#edit = null;
    this.#ring.hidden = true;
    this.#tag.hidden = true;
    this.#host.editing?.(false);
    this.#host.changed?.();
  }

  // Words that can't be edited: why, and where to change them, beside the words for a moment.
  #refusal(node, target) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    const where = target.where?.file ? ` <code>${esc(short(target.where.file))}:${target.where.line}</code>` : '';
    this.#tag.dataset.kind = 'refused';
    this.#tag.innerHTML = `<span>${esc(target.reason ?? 'This text can’t be edited here.')}${where}</span>`;
    this.#tag.hidden = false;
    Object.assign(this.#tag.style, { left: `${Math.max(8, Math.min(innerWidth - 428, r.left))}px`, top: `${r.bottom + 8 + 60 > innerHeight ? r.top - 60 : r.bottom + 8}px` });
    this.#notice?.end();
    const notice = (this.#notice = new Scope());
    const hide = () => { this.#tag.hidden = true; notice.end(); };
    // after this click has gone by: the next press anywhere puts the note away, or its time does
    notice.timeout(() => notice.listen(window, 'pointerdown', hide, true), 0);
    notice.timeout(hide, 4000);
  }

  destroy() {
    if (this.#phase === 'editing') this.#finish(false);
    this.#send('unmount');
    this.#flight = null; // a lookup or a write still out lands on no one
    this.#scope.end(); this.#edit?.scope.end(); this.#notice?.end();
  }
}

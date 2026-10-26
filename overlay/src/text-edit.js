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
 *  look       a 1.5px accent ring around the words and a tag under them: where they are written, ↵ save · Esc
 *  save       Enter, or clicking away, writes the words to source at once; Esc puts them back. Newlines are not text a
 *             JSX run keeps, so Shift+Enter does nothing
 *  after      a toast by the dock says what was written, with Undo, which writes the old words back. A dev server
 *             without fast refresh reloads the page after a write: the toast and its Undo come back after the reload
 *             (sessionStorage), on the same words
 *  refused    words that can't be edited say why, beside the words, and where to change them by hand
 * ───────────────────────────────────────────────────────── */
import { request, post } from './api.js';
import { locate } from './locate.js';
import { esc } from './choices.js';

const HOLD = 6000; // ms the toast stays
const RESUME = 'plumb:text-resume';
const pathTo = (element) => {
  const parts = [];
  for (let n = element; n && n !== document.documentElement; n = n.parentElement) parts.unshift(`${n.localName}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
  return ['html', ...parts].join(' > ');
};

export const TEXT_EDIT_CSS = `
  .tx-ring { position: fixed; pointer-events: none; border-radius: 3px; box-shadow: 0 0 0 1.5px var(--pl-accent), 0 0 0 3.5px var(--pl-halo); }
  .tx-tag { position: fixed; pointer-events: none; display: flex; align-items: center; gap: var(--pl-space-3); height: var(--pl-tag-h); padding: 0 var(--pl-space-4);
    border-radius: var(--pl-radius-tag); background: var(--pl-paper); box-shadow: var(--pl-shadow-tag); font: var(--pl-card-meta); color: var(--pl-ink-2); white-space: nowrap; }
  .tx-tag code { font: var(--pl-card-code); color: var(--pl-ink); }
  .tx-tag kbd { font: 500 10px/13px var(--pl-mono); color: var(--pl-ink-2); }
  .tx-tag[data-kind="saving"] { color: var(--pl-accent); }
  .tx-tag[data-kind="refused"] { color: var(--pl-ink); max-width: min(420px, calc(100vw - 32px)); height: auto; min-height: var(--pl-tag-h); padding-block: var(--pl-space-3); white-space: normal; }
  .tx-tag[data-kind="error"] { color: var(--pl-off); }
  .tx-area { position: fixed; margin: 0; padding: 0; border: 0; outline: none; resize: none; overflow: hidden; background: transparent;
    color: transparent; caret-color: var(--pl-accent); pointer-events: auto; }
  .tx-area::selection { background: color-mix(in oklab, var(--pl-accent) 28%, transparent); color: transparent; }
  .tx-toast { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-end: calc(var(--pl-space-6) + var(--pl-tag-h) + var(--pl-space-4));
    display: flex; align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-3) var(--pl-space-3) var(--pl-space-3) var(--pl-space-5); pointer-events: auto;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); font: var(--pl-card-meta); color: var(--pl-ink);
    opacity: 0; translate: 0 4px; transition: opacity var(--pl-dur-feedback) var(--pl-ease-out), translate var(--pl-dur-feedback) var(--pl-ease-out); }
  .tx-toast[data-on] { opacity: 1; translate: 0 0; }
  .tx-toast[hidden] { display: none; }
  .tx-toast button { all: unset; cursor: pointer; padding: 3px var(--pl-space-4); border-radius: var(--pl-radius-tag); font: var(--pl-text-label); color: var(--pl-accent); }
  .tx-toast button:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: 1px; }
  @media (hover: hover) and (pointer: fine) { .tx-toast button:hover { background: var(--pl-paper-2); } }
  @media (prefers-reduced-motion: reduce) { .tx-toast { transition: none; translate: 0 0; } }
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

export class TextEditor {
  #root; #host; #ring; #tag; #toast; #edit = null; #toastTimer = 0; #undo = null;

  // host: editing(on, rect) lets the edit through blueprint's glass; announce(text); changed(); inBlueprint() and
  // blueprint() say whether blueprint is on and turn it back on after a reload
  constructor(root, host) {
    this.#root = root;
    this.#host = host;
    this.#ring = Object.assign(document.createElement('div'), { className: 'tx-ring', hidden: true });
    this.#tag = Object.assign(document.createElement('div'), { className: 'tx-tag', hidden: true });
    this.#tag.setAttribute('role', 'status');
    this.#toast = Object.assign(document.createElement('div'), { className: 'tx-toast', hidden: true });
    this.#toast.setAttribute('role', 'status');
    root.append(this.#ring, this.#tag, this.#toast);
    this.#toast.addEventListener('click', (e) => { if (e.target.closest('.undo')) this.undo(); });
    this.#resume();
  }

  // After a write that reloaded the page: the toast again, with Undo on the same words, once they have rendered.
  async #resume() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(RESUME) ?? 'null'); sessionStorage.removeItem(RESUME); } catch { return; }
    if (!saved || Date.now() - saved.at > 15000) return;
    if (saved.blueprint) this.#host.blueprint?.(); // the mode the person was in comes back with the page
    for (let i = 0; i < 40; i++) {
      const el = document.querySelector(saved.path);
      const node = el && [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && norm(n.data) === saved.from);
      if (node) {
        this.#undo = { node, from: saved.from, to: saved.to, lead: node.data.match(/^\s*/)[0], trail: node.data.match(/\s*$/)[0], file: saved.file, path: saved.path, blueprint: saved.blueprint };
        // an Undo that the reload cut short is finished now
        if (saved.undo) return this.undo();
        return this.#toastSay(`Wrote “${saved.from}” to ${short(saved.file)}`, true);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  get editing() { return !!this.#edit; }

  // A double-click at a point on the page. True when it was taken (the words are being edited or explained).
  async dblclick(event) {
    if (this.#edit) return false;
    const hit = caretAt(event.clientX, event.clientY);
    const node = hit?.node;
    if (node?.nodeType !== Node.TEXT_NODE || !norm(node.data)) return false;
    const el = node.parentElement;
    if (!el || el.closest('plumb-overlay') || ownEditing(el)) return false;
    return this.start(node, hit.offset);
  }

  // Edit one text node: resolve it, then make it editable where it is.
  async start(node, offset = null) {
    const el = node.parentElement, words = norm(node.data);
    const target = await this.#resolve(el, words).catch((error) => ({ editable: false, reason: error?.message ?? "React Plumber couldn't read this text." }));
    if (!node.isConnected) return false;
    if (!target.editable) { this.#refusal(node, target); return true; }
    this.#begin(node, target, offset);
    return true;
  }

  // The string in source that renders these words.
  async #resolve(el, words) {
    const found = await locate(el);
    if (!found?.file) return { editable: false, reason: 'React Plumber can’t tie these words to a line in your source.' };
    const at = { file: found.file, line: found.line, column: found.column };
    const owners = (found.chain ?? []).filter((c) => c?.file).map((c) => `${c.file}:${c.line}:${c.column}`).join(',');
    try {
      const r = await request('text-at', { ...at, text: words, owners });
      if (r) return r.editable ? { ...r, via: 'text-at' } : r;
    } catch (error) {
      if (error?.status !== 404 && !/unknown|not found|404/i.test(error?.message ?? '')) throw error;
    }
    // an older server: the element's own JSX text
    const t = await request('text', at);
    if (!t?.editable) return { editable: false, reason: t?.reason ?? 'This element has no static text to edit.', where: at };
    const run = t.runs.find((r) => norm(r.text) === words);
    if (!run) return { editable: false, reason: 'These words are not written in this element’s own JSX.', where: at };
    return { editable: true, via: 'text', file: at.file, line: at.line, hash: t.hash, id: run.id, from: run.text };
  }

  #begin(node, target, offset) {
    const el = node.parentElement;
    const leaf = [...el.childNodes].every((n) => n === node || (n.nodeType === Node.TEXT_NODE && !n.data.trim()));
    const lead = node.data.match(/^\s*/)[0], trail = node.data.match(/\s*$/)[0];
    const ed = { node, el, target, leaf, lead, trail, before: node.data, area: null, done: false, prior: el.getAttribute('contenteditable') };
    this.#edit = ed;
    this.#host.editing?.(true, () => this.#rect());
    if (leaf) {
      el.setAttribute('contenteditable', 'plaintext-only');
      el.addEventListener('keydown', this.#key);
      el.addEventListener('blur', this.#blur);
      el.addEventListener('input', this.#input);
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
      area.setAttribute('aria-label', `Edit the words “${norm(node.data)}”`);
      for (const k of ['font', 'letterSpacing', 'textTransform', 'wordSpacing', 'lineHeight', 'textAlign']) area.style[k] = cs[k];
      this.#root.append(area);
      ed.area = area;
      area.addEventListener('keydown', this.#key);
      area.addEventListener('blur', this.#blur);
      area.addEventListener('input', () => { node.data = lead + area.value + trail; });
      area.focus({ preventScroll: true });
      area.select();
    }
    this.#say('edit');
    this.#follow();
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

  // Ring, tag and textarea follow the words while the page scrolls or re-flows.
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
    requestAnimationFrame(this.#follow);
  };

  #say(kind, text) {
    const ed = this.#edit, t = this.#tag;
    t.dataset.kind = kind;
    const where = ed ? `<code>${esc(short(ed.target.file))}:${ed.target.line}</code>` : '';
    t.innerHTML = kind === 'edit' ? `${where}<span><kbd>↵</kbd> save · <kbd>Esc</kbd> cancel</span>`
      : kind === 'saving' ? `${where}<span>Saving…</span>` : esc(text ?? '');
    t.hidden = false;
  }

  #input = () => {
    // plaintext-only keeps it to text, but a paste can still carry line breaks: words are one line in JSX
    const ed = this.#edit;
    if (ed?.leaf && /\n/.test(ed.el.textContent)) ed.el.textContent = ed.el.textContent.replace(/\s*\n\s*/g, ' ');
  };

  #key = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); if (!e.shiftKey) this.#finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); this.#finish(false); }
  };
  #blur = () => { if (this.#edit && !this.#edit.done) this.#finish(true); };

  // Save or cancel. Saving writes at once; the words stay as typed while the write runs and come back if it is refused.
  async #finish(save) {
    const ed = this.#edit;
    if (!ed || ed.done) return;
    ed.done = true;
    const typed = norm(ed.leaf ? ed.el.textContent : ed.area.value);
    // put the element back the way it was, then show the words that stand
    if (ed.leaf) {
      ed.el.removeEventListener('keydown', this.#key); ed.el.removeEventListener('blur', this.#blur); ed.el.removeEventListener('input', this.#input);
      if (ed.prior === null) ed.el.removeAttribute('contenteditable'); else ed.el.setAttribute('contenteditable', ed.prior);
      // the browser may have split or replaced the text node while editing: the original node carries the words again
      if (!ed.node.isConnected || ed.el.childNodes.length !== 1 || ed.el.firstChild !== ed.node) ed.el.replaceChildren(ed.node);
    } else ed.area.remove();
    getSelection()?.removeAllRanges();
    const keep = save && typed && typed !== norm(ed.target.from);
    ed.node.data = keep ? ed.lead + typed + ed.trail : ed.before;
    if (!keep) return this.#end();
    this.#say('saving');
    try { sessionStorage.setItem(RESUME, JSON.stringify({ path: pathTo(ed.el), from: typed, to: ed.target.from, file: ed.target.file, at: Date.now(), blueprint: !!this.#host.inBlueprint?.() })); } catch {}
    try {
      await this.#write(ed.target, ed.target.from, typed);
      this.#end();
      this.#undo = { node: ed.node, from: typed, to: ed.target.from, lead: ed.lead, trail: ed.trail, file: ed.target.file, path: pathTo(ed.el), blueprint: !!this.#host.inBlueprint?.() };
      this.#toastSay(`Wrote “${typed}” to ${short(ed.target.file)}`, true);
      this.#host.announce?.(`Wrote the words to ${short(ed.target.file)}`);
    } catch (error) {
      try { sessionStorage.removeItem(RESUME); } catch {}
      ed.node.data = ed.before;
      const stale = /changed since/i.test(error?.message ?? '');
      this.#say('error', stale ? 'The file changed since React Plumber read it. Double-click to try again.' : (error?.message ?? 'React Plumber refused the write.'));
      setTimeout(() => this.#end(), 2400);
    }
  }

  #write(target, from, to) {
    return target.via === 'text-at'
      ? post('apply-text-at', { file: target.file, hash: target.hash, id: target.id, from, to })
      : post('apply-text', { file: target.file, hash: target.hash, run: target.id, from, to });
  }

  #end() {
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
    this.#tag.innerHTML = `<span>${esc(target.reason ?? 'These words can’t be edited here.')}${where}</span>`;
    this.#tag.hidden = false;
    Object.assign(this.#tag.style, { left: `${Math.max(8, Math.min(innerWidth - 428, r.left))}px`, top: `${r.bottom + 8 + 60 > innerHeight ? r.top - 60 : r.bottom + 8}px` });
    clearTimeout(this.#toastTimer);
    const hide = () => { this.#tag.hidden = true; removeEventListener('pointerdown', hide, true); };
    setTimeout(() => addEventListener('pointerdown', hide, true), 0);
    setTimeout(hide, 4000);
  }

  #toastSay(text, undo) {
    clearTimeout(this.#toastTimer);
    this.#toast.innerHTML = `<span>${esc(text)}</span>${undo ? '<button class="undo" type="button">Undo</button>' : ''}`;
    this.#toast.hidden = false;
    requestAnimationFrame(() => this.#toast.setAttribute('data-on', ''));
    this.#toastTimer = setTimeout(() => { this.#toast.removeAttribute('data-on'); setTimeout(() => { this.#toast.hidden = true; }, 160); this.#undo = null; }, HOLD);
  }

  // The last write, written back: the old words, against the file as it is now.
  async undo() {
    const u = this.#undo;
    if (!u) return;
    this.#undo = null;
    // if the dev server reloads the page in the middle, the undo is finished after the reload
    try { sessionStorage.setItem(RESUME, JSON.stringify({ path: u.path, from: u.from, to: u.to, file: u.file, at: Date.now(), blueprint: u.blueprint, undo: true })); } catch {}
    try {
      const el = u.node.isConnected ? u.node.parentElement : null;
      if (!el) throw new Error('The words are no longer on the page.');
      const target = await this.#resolve(el, norm(u.node.data));
      if (!target.editable) throw new Error(target.reason);
      await this.#write(target, target.from, u.to);
      try { sessionStorage.removeItem(RESUME); } catch {}
      u.node.data = u.lead + u.to + u.trail;
      this.#toastSay(`Put back “${u.to}” in ${short(u.file)}`, false);
    } catch (error) {
      try { sessionStorage.removeItem(RESUME); } catch {}
      this.#toastSay(`Couldn’t undo: ${error?.message ?? 'the write was refused'}`, false);
    }
  }

  destroy() {
    if (this.#edit) this.#finish(false);
    clearTimeout(this.#toastTimer);
  }
}

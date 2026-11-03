/* ─────────────────────────────────────────────────────────
 * CLEAN UP THIS PAGE · React Plumber overlay (docs/briefs/page-cleanup.md, mock: docs/briefs/page-cleanup/mock.html)
 *
 * The page worked through in passes (text, spacing, colour, icons), each read, previewed, then applied as one step
 * that History can undo whole. It lives in the fix panel: the panel's body is handed to it while a clean-up runs.
 *
 *  stepper   the four passes along the top, each with this page's count; the one in hand, the ones done (✓), the
 *            ones skipped (struck through); passes not built yet say so and are skipped
 *  text      the project's text styles (POST system, scope "project": one ladder from every page, `plumber census`),
 *            this page's places in each, the ones that change and by how much; distinct sizes before → after, on
 *            this page and on the site; Apply writes the theme's styles once and swaps only this page's places
 *  preview   the panel shrinks to one line, the page is drawn in the styles (typesystem.js StylePreview), held Space
 *            shows it as it was; Esc cancels and puts it back
 *  written   one step, tagged { step: "Text", laws } so History shows it as one step; the saved line keeps Undo
 *  no census the site hasn't been read yet: the panel says how, with the command to copy
 *  done      what changed, measured: distinct sizes before → after; then Next pass
 *  spacing   the second pass (spacing-pass.js): this page's stacks refined inside the app's own scale, the same show,
 *            written as class swaps, one step tagged { step: "Spacing" }
 *
 * Keys while it runs (from the fix panel): Enter apply · P preview · → skip the pass · Esc cancel the preview, then close;
 * held Space compares while previewing (its own listener, only then: Blueprint's keys never carry keyup)
 * ───────────────────────────────────────────────────────── */
import { answered, post, request } from './api.js';
import { esc } from './choices.js';
import { glide } from './inplace.js';
import { namesOf, rolesInOrder, StylePreview } from './typesystem.js';
import { SHOW_CSS, chipsHtml, Marks, play, ease } from './show.js';
import { SpacingPass } from './spacing-pass.js';
import { CLEANUP as W } from './words.js';

const LAWS = [{ id: 'similarity', name: 'Law of similarity' }, { id: 'cognitive-load', name: 'Cognitive load' }];
const SPACING_LAWS = [{ id: 'proximity', name: 'Law of proximity' }, { id: 'common-region', name: 'Law of common region' }];
const PASSES = ['text', 'spacing', 'colour', 'icons'];
// where a clean-up is, kept in the tab: a write (or its undo) can reload the page, and the clean-up comes back to it
const KEPT = 'plumb:cleanup', FRESH = 60000;
const keep = (v) => { try { v ? sessionStorage.setItem(KEPT, JSON.stringify({ ...v, at: Date.now(), path: location.pathname })) : sessionStorage.removeItem(KEPT); } catch {} };
const kept = () => { try { const v = JSON.parse(sessionStorage.getItem(KEPT) ?? 'null'); return v && Date.now() - v.at < FRESH && v.path === location.pathname ? v : null; } catch { return null; } };

export const CLEANUP_CSS = `
  .cu { display: grid; }
  .cu .steps { display: flex; gap: 2px; padding: 10px 10px 0; }
  .cu .pass { flex: 1; display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; font: 600 11px/14px var(--pl-sans, system-ui); color: #b3ad9f; min-width: 0; }
  .cu .pass i { flex: none; width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px currentColor; display: grid; place-items: center; font: 700 9px/1 var(--pl-sans, system-ui); font-style: normal; }
  .cu .pass span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cu .pass .n { margin-left: auto; font-weight: 500; }
  .cu .pass.now { color: #1c1b19; background: #f4f3ef; }
  .cu .pass.now i { box-shadow: inset 0 0 0 1.5px #1c1b19; background: radial-gradient(circle, #1c1b19 0 3px, transparent 3.5px); }
  .cu .pass.done { color: #1f9e64; } .cu .pass.done i { background: #1f9e64; box-shadow: none; color: #fff; }
  .cu .pass.skipped span { text-decoration: line-through; }
  .cu .saved { display: flex; align-items: center; gap: 8px; padding: 8px 10px 0 16px; color: #6b665c; font-size: 12px; }
  .cu .saved b { color: #1f9e64; font-weight: 600; }
  .cu .saved button { margin-left: auto; }
  .cu .body { padding: 12px 16px 4px; display: grid; gap: 4px; }
  .cu .head { font-weight: 600; font-size: 14px; line-height: 1.35; text-wrap: balance; }
  .cu .sub { color: #6b665c; font-size: 12px; }
  .cu .law { color: #7a5cf0; font-size: 12px; }
  .cu .ladder { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 1px; max-height: min(40vh, 330px); overflow-y: auto; overscroll-behavior: contain; }
  .cu .ladder li { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 10px; min-height: 34px; padding: 2px 8px 2px 4px; border-radius: 9px; }
  .cu .ladder li.moves { background: rgb(255 31 143 / .05); }
  .cu .ladder .ag { text-align: center; line-height: 1; color: #1c1b19; }
  .cu .ladder .nm { font-weight: 550; } .cu .ladder .nm small { display: block; color: #6b665c; font-weight: 400; font-size: 12px; }
  .cu .ladder .here { font-size: 12px; color: #6b665c; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cu .ladder .here b { color: #ff1f8f; font-weight: 600; }
  .cu .measure { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 10px 0 2px; font-variant-numeric: tabular-nums; }
  .cu .measure b { font-size: 18px; font-weight: 600; } .cu .measure .to { color: #b3ad9f; margin: 0 4px; }
  .cu .measure small { display: block; color: #6b665c; font-size: 11px; }
  .cu .cmd { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px 10px; border-radius: 9px; background: #f4f3ef; font: 500 12px/1.4 var(--pl-mono, ui-monospace, monospace); }
  .cu .cmd code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cu .acts { display: flex; align-items: center; gap: 4px; padding: 10px; border-top: 1px solid #ecebe6; margin-top: 12px; }
  .cu .acts .grow { flex: 1; }
  .cu button.cu-btn { all: unset; cursor: pointer; font: 600 13px/18px var(--pl-sans, system-ui); padding: 7px 12px; border-radius: 9px; color: #1c1b19; white-space: nowrap; }
  .cu button.cu-btn:hover { background: #f4f3ef; }
  .cu button.cu-btn:focus-visible { outline: 2px solid #2a7fd0; outline-offset: 1px; }
  .cu button.cu-btn:disabled { color: #b3ad9f; cursor: default; background: none; }
  .cu button.cu-btn kbd { font: 500 10px/1 var(--pl-mono, ui-monospace, monospace); color: #b3ad9f; margin-left: 6px; }
  .cu button.cu-btn.primary { background: #1c1b19; color: #fff; } .cu button.cu-btn.primary kbd { color: #9d9a92; }
  .cu button.cu-btn.quiet { font-weight: 500; color: #6b665c; }
  .cu .bar { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 16px; }
  .cu .bar .live { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #2a7fd0; animation: cu-live 1.6s ease-out infinite; }
  .cu .bar .msg { font-weight: 600; white-space: nowrap; }
  .cu .bar .hint { flex: none; color: #6b665c; font-size: 12px; white-space: nowrap; }
  .cu .bar .hint kbd { font: 500 11px/1 var(--pl-mono, ui-monospace, monospace); padding: 2px 5px; border-radius: 5px; background: #f4f3ef; color: #1c1b19; }
  .cu .bar .grow { flex: 1; }
  @media (max-width: 560px) { .cu .bar .hint { display: none; } .cu .pass .n { display: none; } }
  .cu .error { color: #e5503f; font-size: 12px; padding: 0 16px; }
  @keyframes cu-live { 0% { box-shadow: 0 0 0 0 rgb(42 127 208 / .4); } 70% { box-shadow: 0 0 0 6px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  @media (prefers-reduced-motion: reduce) { .cu .bar .live { animation: none; } }
  .cu .roles { padding: 12px 14px 0; }
  .cu .ladder .sp-ic { display: inline-grid; place-items: center; width: 16px; height: 16px; color: #6b665c; } .cu .ladder .sp-ic svg { width: 16px; height: 16px; display: block; }
${SHOW_CSS}
`;

// the page's text, as Blueprint reads it (blueprint.js #system): every stamped element with words of its own
function pageCensus() {
  return [...document.body.querySelectorAll('[data-plumb-source]')].filter((el) => !el.closest('plumb-overlay') && [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue))).map((el) => {
    const cs = getComputedStyle(el);
    return { stamp: el.getAttribute('data-plumb-source'), tag: el.localName, list: !!el.closest('li, ul, ol, dl'), computed: { size: parseFloat(cs.fontSize), lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), weight: parseInt(cs.fontWeight, 10), transform: cs.textTransform } };
  });
}
const sizeOf = (b) => (Number.isFinite(b?.size) ? b.size : null);
// a style's size at this width: its number, or its fluid clamp(min, preferred, max) worked out for this viewport
function fluidPx(b) {
  if (Number.isFinite(b?.size)) return b.size;
  const m = /clamp\(\s*([\d.]+)(rem|px)\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)(rem|px)\s*\)/.exec(b?.sizeText ?? '');
  if (!m) return null;
  const u = (n, unit) => Number(n) * (unit === 'rem' ? 16 : 1);
  return Math.round(Math.min(u(m[4], m[5]), Math.max(u(m[1], m[2]), (Number(m[3]) * innerWidth) / 100)) * 10) / 10;
}
const shown = (n) => `${+Number(n).toFixed(1)}px`;
// a style's numbers as a person reads them
function nums(b) {
  const m = /clamp\(\s*([\d.]+)(rem|px)[^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(b.sizeText ?? '');
  const size = m ? `${Math.round(m[1] * (m[2] === 'rem' ? 16 : 1))}–${Math.round(m[3] * (m[4] === 'rem' ? 16 : 1))}px, fluid` : shown(b.size);
  return `${size}${Number(b.lineHeight) > 0 ? ` · ${+Number(b.lineHeight).toFixed(2)} line height` : ''}${b.weight && b.weight !== 400 ? ` · weight ${b.weight}` : ''}`;
}

export class Cleanup {
  #show = null; #marks = null; // the show playing: its stop, and the marks it draws on the page
  #host; #el = null; #pass = 0; #done = new Map(); #state = 'idle'; #p = null; #page = null; #err = null; #preview = new StylePreview(); #held = false; #saved = null; #spacing = new SpacingPass();

  // host: { render(), announce(text), write(write, said, meta) → { ok, undo, group, why }, undo(group), wrote(result, text), close(), url() }
  constructor(host) { this.#host = host; }
  get running() { return this.#state !== 'idle'; }
  get previewing() { return this.#state === 'preview'; }

  async start() {
    this.#pass = 0; this.#done.clear(); this.#saved = null;
    await this.#read();
  }
  stop() { this.#settle(); keep(null); this.#listen(false); this.#held = false; this.#preview.clear((el, f) => f()); this.#spacing.clear(); this.#state = 'idle'; this.#p = null; this.#host.render(); }

  // back after a reload its own write or undo caused: the step written (with its Undo), or the page read again
  async resume() {
    let v = kept();
    if (!v || this.running) return;
    const pass = v.pass ?? 0;
    // the page went while its write was saving: the server's trace says whether the step landed (it may still be
    // finishing, so it is asked a few times); landed, it comes back done with its Undo, else the page is read again
    if (v.state === 'writing' && v.group) {
      this.#page = v.page; if (pass === 1) this.#spacing.page = v.spacing; this.#done = new Map(Object.entries(v.done ?? {}));
      this.#state = 'writing'; this.#pass = pass; this.#host.render();
      let changes = [];
      for (let i = 0; i < 6 && !changes.length; i++) {
        if (i) await new Promise((r) => setTimeout(r, 1000));
        changes = ((await request('trace', { group: v.group }).catch(() => null))?.changes ?? []).filter((c) => c.state === 'live');
      }
      if (changes.length) {
        const done = { ...(v.done ?? {}), [PASSES[pass]]: 'done' };
        const said = v.said;
        v = { state: 'done', pass, saved: v.saved, page: v.page, spacing: v.spacing, done };
        keep(v);
        this.#host.wrote?.({ undo: changes.map(({ id, file, label }) => ({ change: id, file, label })), trace: { group: v.saved.group } }, said);
      } else { this.#state = 'idle'; v = { ...v, state: 'read', said: W.reloaded }; }
    }
    if (v.state === 'done') { this.#saved = v.saved; this.#page = v.page; this.#done = new Map(Object.entries(v.done ?? {})); this.#pass = pass; if (pass === 1) this.#spacing.page = v.spacing; this.#state = 'done'; this.#host.render(); this.#host.announce?.(`${W.pass[PASSES[pass]]}: ${this.#savedLine(v.saved)}`); }
    else if (pass === 1) { this.#done = new Map(Object.entries(v.done ?? {})); this.#pass = 1; this.#readSpacing().then(() => v.said && this.#host.announce?.(v.said)); }
    else { this.start().then(() => v.said && this.#host.announce?.(v.said)); }
  }

  // the text pass: the project's ladder, this page's places in it
  async #read() {
    this.#state = 'reading'; this.#err = null; this.#host.render();
    const census = pageCensus(), stamps = new Set(census.map((c) => c.stamp));
    try {
      const said = await post('system', { census, scope: 'project', route: location.pathname });
      this.#p = said?.proposal ?? null;
      const roles = rolesInOrder(this.#p ?? { roles: [] }).map((r) => {
        const here = (r.members ?? []).filter((m) => m.stamp && stamps.has(m.stamp));
        const moves = here.filter((m) => Math.abs(m.delta?.size ?? 0) >= 0.5);
        return { role: r, here, moves };
      });
      const sizes = (list) => new Set(list.map((x) => x).filter((x) => x != null)).size;
      const before = sizes(census.map((c) => c.computed.size));
      const after = sizes(roles.filter((x) => x.here.length).map((x) => sizeOf(x.role.bundle) ?? x.role.bundle.sizeText));
      this.#page = { census, roles, before, after, moves: roles.reduce((n, x) => n + x.moves.length, 0), places: roles.reduce((n, x) => n + x.here.length, 0) };
      this.#state = this.#page.moves ? 'ready' : 'nothing';
    } catch (error) {
      this.#state = /no census/i.test(error?.message ?? '') ? 'no-census' : 'error';
      this.#err = error?.message ?? null;
    }
    this.#host.render();
  }

  // the spacing pass: this page's stacks against the site's, refined inside the app's scale
  async #readSpacing() {
    this.#pass = 1; this.#saved = null; this.#state = 'reading'; this.#err = null; this.#host.render();
    try {
      const page = await this.#spacing.read();
      this.#state = page.places ? 'ready' : 'nothing';
    } catch (error) {
      this.#state = /no census/i.test(error?.message ?? '') ? 'no-census' : 'error';
      this.#err = error?.message ?? null;
    }
    this.#host.render();
  }
  // on to the next pass; the one in hand is skipped unless it was written
  #next() {
    const k = PASSES[this.#pass];
    if (!this.#done.has(k)) this.#done.set(k, 'skipped');
    if (this.#pass === 0) return this.#readSpacing();
    this.#state = 'done'; this.#host.render();
  }
  #savedLine(saved) { return saved?.pass === 1 ? W.spacing.saved(saved.places, saved.files) : W.saved(saved.places, saved.files); }
  #moves() { return this.#pass === 1 ? this.#spacing.page?.places ?? 0 : this.#page?.moves ?? 0; }

  html() {
    if (this.#state === 'preview') {
      return `<div class="cu"><div class="roles">${chipsHtml(this.#steps().map((x) => x.chip))}</div><div class="bar"><span class="live" aria-hidden="true"></span><span class="hint">${W.holdSpace}</span><span class="grow"></span>`
        + `<button type="button" class="cu-btn quiet" data-cu="cancel">${esc(W.cancel)}<kbd>esc</kbd></button><button type="button" class="cu-btn primary" data-cu="apply">${esc(W.apply)}<kbd>↵</kbd></button></div></div>`;
    }
    const steps = PASSES.map((k, i) => {
      const st = this.#done.get(k), now = i === this.#pass && !st;
      const n = k === 'text' && this.#page ? this.#page.moves : k === 'spacing' && this.#spacing.page ? this.#spacing.page.places : null;
      return `<span class="pass ${st ?? (now ? 'now' : '')}"><i>${st === 'done' ? '✓' : ''}</i><span>${esc(W.pass[k])}</span>${n != null ? `<span class="n">${n}</span>` : ''}</span>`;
    }).join('');
    const saved = this.#saved ? `<div class="saved" role="status"><b>${esc(W.pass[PASSES[this.#saved.pass ?? 0]])}</b>${esc(this.#savedLine(this.#saved))}<button type="button" class="cu-btn quiet" data-cu="undo">${esc(W.undo)}</button></div>` : '';
    return `<div class="cu">${`<div class="steps" aria-label="${esc(W.passes)}">${steps}</div>`}${saved}${this.#bodyHtml()}</div>`;
  }

  #bodyHtml() {
    const s = this.#state, acts = (inner) => `<div class="acts">${inner}</div>`;
    const close = `<button type="button" class="cu-btn quiet" data-cu="close">${esc(W.close)}<kbd>esc</kbd></button>`;
    if (s === 'reading') return `<div class="body"><div class="sub" role="status">${esc(this.#pass === 1 ? W.spacing.reading : W.reading)}</div></div>`;
    if (s === 'no-census') return `<div class="body"><div class="head">${esc(W.noCensus)}</div><div class="sub">${esc(W.noCensusWhy)}</div>`
      + `<div class="cmd"><code>plumber census --url ${esc(this.#host.url?.() ?? location.origin + '/')}</code><button type="button" class="cu-btn quiet" data-cu="copy">${esc(W.copy)}</button></div></div>${acts(`<button type="button" class="cu-btn" data-cu="retry">${esc(W.retry)}</button><span class="grow"></span>${close}`)}`;
    if (s === 'error') return `<div class="body"><div class="head">${esc(this.#pass === 1 ? W.spacing.couldNot : W.couldNot)}</div><div class="error">${esc(this.#err ?? '')}</div></div>${acts(`<button type="button" class="cu-btn" data-cu="retry">${esc(W.retry)}</button><span class="grow"></span>${close}`)}`;
    if (s === 'writing') return `<div class="body"><div class="sub" role="status">${esc(W.writing(this.#moves()))}</div></div>`;
    if (s === 'done' && this.#pass === 0) {
      const p = this.#page, text = this.#done.get('text') === 'done';
      return `<div class="body"><div class="head">${esc(text ? W.doneHead : W.doneSkipped)}</div><div class="sub">${esc(W.nextSpacing)}</div>`
        + (text ? `<div class="measure"><div><b>${p.before}</b><span class="to">→</span><b>${p.after}</b><small>${esc(W.sizesPage)}</small></div></div>` : '') + `</div>`
        + acts(`<button type="button" class="cu-btn primary" data-cu="next">${esc(W.next)}<kbd>→</kbd></button><span class="grow"></span>${close}`);
    }
    if (this.#pass === 1) return this.#spacingHtml(acts, close);
    const p = this.#page, names = namesOf(this.#p.roles);
    if (s === 'nothing') return `<div class="body"><div class="head">${esc(W.nothing(this.#p.roles.length))}</div><div class="sub">${esc(W.nothingWhy)}</div></div>${acts(`<span class="grow"></span><button type="button" class="cu-btn primary" data-cu="skip">${esc(W.next)}<kbd>→</kbd></button>`)}`;
    const rows = p.roles.filter((x) => x.here.length).map(({ role, here, moves }) => {
      const b = role.bundle, sz = Math.min(26, sizeOf(b) ?? 26), caps = b.transform === 'uppercase';
      const from = moves.length ? moves.map((m) => m.current?.size).filter(Number.isFinite).sort((a, b2) => moves.filter((m) => m.current?.size === b2).length - moves.filter((m) => m.current?.size === a).length)[0] : null;
      const to = sizeOf(b);
      return `<li class="${moves.length ? 'moves' : ''}"><span class="ag" aria-hidden="true" style="font-size:${sz}px;font-weight:${b.weight ?? 400};text-transform:${caps ? 'uppercase' : 'none'}">${caps ? 'AG' : 'Ag'}</span>`
        + `<span class="nm">${esc(names.get(role.name))}<small>${esc(nums(b))}</small></span>`
        + `<span class="here">${esc(W.onPage(here.length))}${from != null && to != null ? ` · <b>${esc(`${shown(from)} → ${shown(to)}`)}</b>` : ''}</span></li>`;
    }).join('');
    const site = this.#p.cost ?? {};
    return `<div class="body"><div class="head">${esc(W.head(site.sizesBefore ?? p.before, this.#p.roles.length))}</div><div class="sub">${esc(W.why)}</div><div class="law">${esc(W.law)}</div>`
      + `<ol class="ladder" aria-label="${esc(W.ladder)}">${rows}</ol>`
      + `<div class="measure"><div><b>${p.before}</b><span class="to">→</span><b>${p.after}</b><small>${esc(W.sizesPage)}</small></div>`
      + `<div><b>${site.sizesBefore ?? '–'}</b><span class="to">→</span><b>${this.#p.roles.length}</b><small>${esc(W.sizesSite)}</small></div><div><b>${p.moves}</b><small>${esc(W.changes)}</small></div></div></div>`
      + acts(`<button type="button" class="cu-btn primary" data-cu="apply">${esc(W.apply)}<kbd>↵</kbd></button><button type="button" class="cu-btn" data-cu="preview">${esc(W.preview)}<kbd>P</kbd></button><span class="grow"></span><button type="button" class="cu-btn quiet" data-cu="skip">${esc(W.skip(W.pass.text.toLowerCase()))}<kbd>→</kbd></button>`);
  }

  #spacingHtml(acts, close) {
    const S = W.spacing, s = this.#state, p = this.#spacing.page;
    if (s === 'done') {
      const did = this.#done.get('spacing') === 'done';
      return `<div class="body"><div class="head">${esc(did ? S.doneHead : S.doneSkipped)}</div><div class="sub">${esc(S.notYet)}</div>`
        + (did && p ? `<div class="measure"><div><b>${p.before}</b><span class="to">→</span><b>${p.after}</b><small>${esc(S.sizesPage)}</small></div></div>` : '')
        + (this.#saved?.refused ? `<div class="sub">${esc(S.refused(this.#saved.refused))}</div>` : '') + `</div>`
        + acts(`<span class="grow"></span><button type="button" class="cu-btn primary" data-cu="close">${esc(W.done)}<kbd>esc</kbd></button>`);
    }
    if (s === 'nothing') return `<div class="body"><div class="head">${esc(S.nothing)}</div><div class="sub">${esc(S.scale(p?.scale))}</div></div>${acts(`<button type="button" class="cu-btn primary" data-cu="next">${esc(W.done)}<kbd>→</kbd></button><span class="grow"></span>${close}`)}`;
    const rows = this.#spacing.steps().map((x) => `<li class="moves"><span class="ag" aria-hidden="true"><i class="sp-ic">${x.chip.icon}</i></span><span class="nm">${esc(`${x.chip.from}px → ${x.to}px`)}</span><span class="here">${esc(S.row(x.bands().length))}</span></li>`).join('');
    return `<div class="body"><div class="head">${esc(S.head(p.before, p.after))}</div><div class="sub">${esc(S.scale(p.scale))}</div><div class="law">${esc(S.law)}</div>`
      + `<ol class="ladder" aria-label="${esc(S.list)}">${rows}</ol>`
      + `<div class="measure"><div><b>${p.before}</b><span class="to">→</span><b>${p.after}</b><small>${esc(S.sizesPage)}</small></div><div><b>${p.places}</b><small>${esc(S.changes)}</small></div></div></div>`
      + acts(`<button type="button" class="cu-btn primary" data-cu="apply">${esc(W.apply)}<kbd>↵</kbd></button><button type="button" class="cu-btn" data-cu="preview">${esc(W.preview)}<kbd>P</kbd></button><span class="grow"></span><button type="button" class="cu-btn quiet" data-cu="skip">${esc(W.skip(W.pass.spacing.toLowerCase()))}<kbd>→</kbd></button>`);
  }

  // a click inside the panel's body; true when it was ours
  click(target) {
    const act = target.closest?.('[data-cu]')?.dataset.cu;
    if (!act) return false;
    if (act === 'apply') this.#apply();
    else if (act === 'preview') this.#togglePreview(true);
    else if (act === 'cancel') this.#togglePreview(false);
    else if (act === 'skip' || act === 'next') this.#next();
    else if (act === 'undo') this.#undo();
    else if (act === 'retry') { if (this.#pass === 1) this.#readSpacing(); else this.#read(); }
    else if (act === 'copy') { const t = this.#el?.querySelector?.('.cmd code')?.textContent ?? ''; navigator.clipboard?.writeText(t).catch(() => {}); this.#host.announce?.(W.copied); }
    else if (act === 'close') this.#host.close();
    return true;
  }
  mount(el) { this.#el = el; }

  // this page's styles as the show's roles, largest first: each one's chip (its value: the size most of its places have
  // now, rolling to the style's), its places' line boxes, and setting it
  #steps() {
    if (this.#pass === 1) return this.#spacing.steps();
    const names = namesOf(this.#p.roles);
    // a size as the page draws it: the most common computed size among the places (a fluid style at this width)
    const drawn = (els) => { const n = els.map((el) => parseFloat(getComputedStyle(el).fontSize)).filter(Number.isFinite); return n.sort((a, b) => n.filter((v) => v === b).length - n.filter((v) => v === a).length)[0] ?? null; };
    return this.#page.roles.filter((x) => x.here.length).map(({ role, here }) => {
      const els = () => here.flatMap((m) => [...document.querySelectorAll(`[data-plumb-source="${CSS.escape(m.stamp)}"]`)]);
      const from = drawn(els()), to = fluidPx(role.bundle) ?? from;
      return {
        // its icon: "Ag" in the style's own weight, sized by its rank (every text role is one property, so the drawing is the style)
        role, chip: { label: `${names.get(role.name)}: ${shown(from)} to ${shown(to)}`, icon: `<span class="ag" style="font-size:${Math.max(9, Math.min(15, 6 + (to ?? 14) / 4))}px;font-weight:${role.bundle.weight ?? 400};text-transform:${role.bundle.transform === 'uppercase' ? 'uppercase' : 'none'}">${role.bundle.transform === 'uppercase' ? 'AG' : 'Ag'}</span>`, from },
        to,
        bands: () => els().map((el) => ({ rect: () => el.getBoundingClientRect(), kind: 'line' })),
        morph: (animate) => this.#preview.setRole(role, animate ? (el, set) => ease(el, set, { blur: true }) : null),
      };
    });
  }
  // the show: the roles one at a time, marked, rolled and eased; resolves when every role is set
  async #play() {
    this.#show?.abort();
    const stop = (this.#show = new AbortController());
    this.#marks ??= new Marks(this.#el.getRootNode());
    const chips = [...this.#el.querySelectorAll('.sh-chip')];
    const steps = this.#steps().map((x, i) => ({ ...x, chip: chips[i] }));
    await play(steps, { marks: this.#marks, signal: stop.signal });
    if (this.#show === stop) this.#show = null;
  }
  #settle() { this.#show?.abort(); this.#show = null; this.#marks?.clear(); }
  #togglePreview(on) {
    if (on && this.#state === 'ready') {
      this.#state = 'preview'; this.#listen(true); this.#host.render(); this.#host.announce?.(W.previewing(this.#moves()));
      return this.#play();
    }
    if (!on && this.#state === 'preview') { this.#settle(); if (this.#pass === 1) this.#spacing.clear(); else this.#preview.clear(glide); this.#state = 'ready'; this.#listen(false); this.#held = false; }
    this.#host.render();
  }

  // the styles written once (the theme's tokens and utilities), and only this page's places swapped, as one step
  async #apply() {
    if (!['ready', 'preview'].includes(this.#state)) return;
    if (this.#pass === 1) return this.#applySpacing();
    const w = this.#p.write ?? {}, sites = new Set(this.#page.roles.flatMap((x) => x.here).map((m) => `${m.site.file}:${m.site.line}:${m.site.column}`));
    const swaps = (w.swaps ?? []).map((f) => ({ ...f, edits: (f.edits ?? []).filter((e) => sites.has(`${f.file}:${e.line}:${e.column}`)) })).filter((f) => f.edits.length);
    if (this.#state === 'ready') await this.#togglePreview(true); // Apply plays the show too
    this.#settle(); this.#listen(false);
    if (this.#held) { this.#held = false; this.#preview.show(this.#p, null); }
    this.#state = 'writing'; this.#host.render();
    const group = `cleanup-text-${Date.now().toString(36)}`;
    const files = new Set(swaps.map((f) => f.file)).size, places = swaps.reduce((n, f) => n + f.edits.length, 0), said = W.saved(places, files);
    const landed = (undo = []) => {
      this.#saved = { group, places, files };
      this.#done.set('text', 'done'); this.#state = 'done';
      keep({ state: 'done', pass: 0, saved: this.#saved, page: kept_, done: Object.fromEntries(this.#done) });
      this.#host.wrote?.({ undo, trace: { group } }, said);
    };
    const { census: _c, roles: _r, ...kept_ } = this.#page;
    // the page hears the whole result before the reload the write may cause (hosts/vite.ts): kept, so it comes back done
    const heard = (e) => { const r = e.detail?.results; if (r && ![...(r.tokens ?? []), ...(r.css ?? []), ...(r.swaps ?? [])].some((x) => !x.ok || x.refused?.length)) landed(e.detail.undo); };
    // a reload before the answer (the dev server's, or the person's) comes back to this record: the trace says if it landed
    keep({ state: 'writing', pass: 0, group, said, saved: { group, places, files }, page: kept_, done: Object.fromEntries(this.#done) });
    addEventListener('plumb:applied', heard, { once: true });
    try {
      // answered: a dev server that restarts mid-write never answers; the change log says whether it landed
      const r = await answered(this.#host.write({ tokens: w.tokens ?? [], css: w.css ?? [], swaps }, said, { step: W.pass.text, laws: LAWS, group }), group);
      if (r?.lost && !r.landed) throw new Error(W.lost);
      if (!r?.lost && !r?.ok) throw new Error(r?.why ?? W.couldNot);
      landed(r.undo);
      // the page now draws the styles from its own classes: the preview's inline values (the same) are let go
      requestAnimationFrame(() => this.#preview.clear((el, f) => f()));
      this.#host.announce?.(`${W.pass.text}: ${said}`);
    } catch (error) { keep(null); this.#preview.clear(glide); this.#state = 'error'; this.#err = error?.message ?? W.couldNot; }
    finally { removeEventListener('plumb:applied', heard); }
    this.#host.render();
  }
  // the spacing pass written: one class swap per write, through each class's site, as one step
  async #applySpacing() {
    if (this.#state === 'ready') await this.#togglePreview(true); // Apply plays the show too
    this.#settle(); this.#listen(false);
    if (this.#held) { this.#held = false; this.#spacing.show(); }
    this.#state = 'writing'; this.#host.render();
    const group = `cleanup-spacing-${Date.now().toString(36)}`;
    try {
      const { swaps, refused } = await this.#spacing.edits();
      if (!swaps.length) throw new Error(refused[0]?.why ?? W.spacing.couldNot);
      const files = swaps.length, places = this.#spacing.page.places, said = W.spacing.saved(places, files);
      const landed = (undo = []) => {
        this.#saved = { group, places, files, pass: 1, refused: refused.length };
        this.#done.set('spacing', 'done'); this.#state = 'done';
        keep({ state: 'done', pass: 1, saved: this.#saved, page: this.#page && (({ census: _c, roles: _r, ...page }) => page)(this.#page), spacing: this.#spacing.page, done: Object.fromEntries(this.#done) });
        this.#host.wrote?.({ undo, trace: { group } }, said);
      };
      keep({ state: 'writing', pass: 1, group, said, saved: { group, places, files, pass: 1, refused: refused.length }, page: this.#page && (({ census: _c, roles: _r, ...page }) => page)(this.#page), spacing: this.#spacing.page, done: Object.fromEntries(this.#done) });
      const r = await answered(this.#host.write({ tokens: [], css: [], swaps }, said, { step: W.pass.spacing, laws: SPACING_LAWS, group }), group);
      if (r?.lost && !r.landed) throw new Error(W.lost);
      if (!r?.lost && !r?.ok) throw new Error(r?.why ?? W.spacing.couldNot);
      landed(r.undo);
      // the page now draws the spaces from its own classes: the preview's inline sizes (the same) are let go
      requestAnimationFrame(() => this.#spacing.clear());
      this.#host.announce?.(`${W.pass.spacing}: ${said}`);
    } catch (error) { keep(null); this.#spacing.clear(); this.#state = 'error'; this.#err = error?.message ?? W.spacing.couldNot; }
    this.#host.render();
  }
  async #undo() {
    if (!this.#saved) return;
    const spacing = this.#saved.pass === 1, said = spacing ? W.spacing.undone : W.undone;
    keep({ state: 'read', pass: spacing ? 1 : 0, said, done: Object.fromEntries(this.#done) });
    try {
      await this.#host.undo(this.#saved.group); this.#saved = null;
      if (spacing) { this.#done.delete('spacing'); await this.#readSpacing(); } else { this.#done.delete('text'); this.#pass = 0; await this.#read(); }
      this.#host.announce?.(said);
    }
    catch (error) { keep(null); this.#err = error?.message ?? W.couldNot; this.#state = 'error'; this.#host.render(); }
  }

  // keys while a clean-up runs (the fix panel passes the key's name): true when handled
  key(k) {
    if (this.#state === 'idle') return false;
    if (k === 'Enter' && ['ready', 'preview'].includes(this.#state)) { this.#apply(); return true; }
    if ((k === 'p' || k === 'P') && this.#state === 'ready') { this.#togglePreview(true); return true; }
    if (k === 'ArrowRight' && (['ready', 'nothing'].includes(this.#state) || (this.#state === 'done' && this.#pass === 0))) { this.#next(); return true; }
    // Space is Blueprint's (hold to use the page) except while previewing, where held Space compares (#space)
    if (k === ' ') return this.#state === 'preview';
    return k !== 'Escape' && this.running; // nothing else reaches the fixes underneath while a clean-up runs
  }
  // held Space while previewing: the page as it was, back on release. Listened for only while previewing
  #space = (e) => {
    if (e.key !== ' ' || this.#state !== 'preview') return;
    const spacing = this.#pass === 1;
    if (e.type === 'keydown' && !this.#held) { this.#settle(); this.#held = true; if (spacing) this.#spacing.clear(); else this.#preview.clear((el, f) => f()); }
    if (e.type === 'keyup' && this.#held) { this.#held = false; if (spacing) this.#spacing.show(); else this.#preview.show(this.#p, null); }
  };
  #listen(on) { for (const t of ['keydown', 'keyup']) (on ? addEventListener : removeEventListener)(t, this.#space, true); }
  // Esc: the preview first, then the clean-up
  escape() {
    if (this.#state === 'preview') { this.#togglePreview(false); return true; }
    if (this.#state !== 'idle') { this.#host.close(); return true; }
    return false;
  }
}

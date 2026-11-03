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
 *  done      what changed, measured: distinct sizes before → after
 *
 * Keys while it runs (from the fix panel): Enter apply · P preview · → skip the pass · Esc cancel the preview, then close;
 * held Space compares while previewing (its own listener, only then: Blueprint's keys never carry keyup)
 * ───────────────────────────────────────────────────────── */
import { post } from './api.js';
import { esc } from './choices.js';
import { glide } from './inplace.js';
import { namesOf, rolesInOrder, StylePreview } from './typesystem.js';
import { CLEANUP as W } from './words.js';

const LAWS = [{ id: 'similarity', name: 'Law of similarity' }, { id: 'cognitive-load', name: 'Cognitive load' }];
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
`;

// the page's text, as Blueprint reads it (blueprint.js #system): every stamped element with words of its own
function pageCensus() {
  return [...document.body.querySelectorAll('[data-plumb-source]')].filter((el) => !el.closest('plumb-overlay') && [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue))).map((el) => {
    const cs = getComputedStyle(el);
    return { stamp: el.getAttribute('data-plumb-source'), tag: el.localName, list: !!el.closest('li, ul, ol, dl'), computed: { size: parseFloat(cs.fontSize), lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), weight: parseInt(cs.fontWeight, 10), transform: cs.textTransform } };
  });
}
const sizeOf = (b) => (Number.isFinite(b?.size) ? b.size : null);
const shown = (n) => `${+Number(n).toFixed(1)}px`;
// a style's numbers as a person reads them
function nums(b) {
  const m = /clamp\(\s*([\d.]+)(rem|px)[^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(b.sizeText ?? '');
  const size = m ? `${Math.round(m[1] * (m[2] === 'rem' ? 16 : 1))}–${Math.round(m[3] * (m[4] === 'rem' ? 16 : 1))}px, fluid` : shown(b.size);
  return `${size}${Number(b.lineHeight) > 0 ? ` · ${+Number(b.lineHeight).toFixed(2)} line height` : ''}${b.weight && b.weight !== 400 ? ` · weight ${b.weight}` : ''}`;
}

export class Cleanup {
  #host; #el = null; #pass = 0; #done = new Map(); #state = 'idle'; #p = null; #page = null; #err = null; #preview = new StylePreview(); #held = false; #saved = null;

  // host: { render(), announce(text), write(write, said, meta) → { ok, undo, group, why }, undo(group), wrote(result, text), close(), url() }
  constructor(host) { this.#host = host; }
  get running() { return this.#state !== 'idle'; }
  get previewing() { return this.#state === 'preview'; }

  async start() {
    this.#pass = 0; this.#done.clear(); this.#saved = null;
    await this.#read();
  }
  stop() { keep(null); this.#listen(false); this.#held = false; this.#preview.clear((el, f) => f()); this.#state = 'idle'; this.#p = null; this.#host.render(); }

  // back after a reload its own write or undo caused: the step written (with its Undo), or the page read again
  resume() {
    const v = kept();
    if (!v || this.running) return;
    if (v.state === 'done') { this.#saved = v.saved; this.#page = v.page; this.#done = new Map(Object.entries(v.done ?? {})); this.#pass = 1; this.#state = 'done'; this.#host.render(); this.#host.announce?.(`${W.pass.text}: ${W.saved(v.saved.places, v.saved.files)}`); }
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

  html() {
    if (this.#state === 'preview') {
      return `<div class="cu"><div class="bar"><span class="live" aria-hidden="true"></span><span class="msg">${esc(W.previewing(this.#page.moves))}</span><span class="hint">${W.holdSpace}</span><span class="grow"></span>`
        + `<button type="button" class="cu-btn quiet" data-cu="cancel">${esc(W.cancel)}<kbd>esc</kbd></button><button type="button" class="cu-btn primary" data-cu="apply">${esc(W.apply)}<kbd>↵</kbd></button></div></div>`;
    }
    const steps = PASSES.map((k, i) => {
      const st = this.#done.get(k), now = i === this.#pass && this.#state !== 'done';
      const n = k === 'text' && this.#page ? this.#page.moves : null;
      return `<span class="pass ${st ?? (now ? 'now' : '')}"><i>${st === 'done' ? '✓' : ''}</i><span>${esc(W.pass[k])}</span>${n != null ? `<span class="n">${n}</span>` : ''}</span>`;
    }).join('');
    const saved = this.#saved ? `<div class="saved" role="status"><b>${esc(W.pass.text)}</b>${esc(W.saved(this.#saved.places, this.#saved.files))}<button type="button" class="cu-btn quiet" data-cu="undo">${esc(W.undo)}</button></div>` : '';
    return `<div class="cu">${`<div class="steps" aria-label="${esc(W.passes)}">${steps}</div>`}${saved}${this.#bodyHtml()}</div>`;
  }

  #bodyHtml() {
    const s = this.#state, acts = (inner) => `<div class="acts">${inner}</div>`;
    const close = `<button type="button" class="cu-btn quiet" data-cu="close">${esc(W.close)}<kbd>esc</kbd></button>`;
    if (s === 'reading') return `<div class="body"><div class="sub" role="status">${esc(W.reading)}</div></div>`;
    if (s === 'no-census') return `<div class="body"><div class="head">${esc(W.noCensus)}</div><div class="sub">${esc(W.noCensusWhy)}</div>`
      + `<div class="cmd"><code>plumber census --url ${esc(this.#host.url?.() ?? location.origin + '/')}</code><button type="button" class="cu-btn quiet" data-cu="copy">${esc(W.copy)}</button></div></div>${acts(`<button type="button" class="cu-btn" data-cu="retry">${esc(W.retry)}</button><span class="grow"></span>${close}`)}`;
    if (s === 'error') return `<div class="body"><div class="head">${esc(W.couldNot)}</div><div class="error">${esc(this.#err ?? '')}</div></div>${acts(`<button type="button" class="cu-btn" data-cu="retry">${esc(W.retry)}</button><span class="grow"></span>${close}`)}`;
    if (s === 'writing') return `<div class="body"><div class="sub" role="status">${esc(W.writing(this.#page.moves))}</div></div>`;
    if (s === 'done' || this.#pass > 0) {
      const p = this.#page, text = this.#done.get('text') === 'done';
      return `<div class="body"><div class="head">${esc(text ? W.doneHead : W.doneSkipped)}</div><div class="sub">${esc(W.notYet)}</div>`
        + (text ? `<div class="measure"><div><b>${p.before}</b><span class="to">→</span><b>${p.after}</b><small>${esc(W.sizesPage)}</small></div></div>` : '') + `</div>`
        + acts(`<span class="grow"></span><button type="button" class="cu-btn primary" data-cu="close">${esc(W.done)}<kbd>esc</kbd></button>`);
    }
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

  // a click inside the panel's body; true when it was ours
  click(target) {
    const act = target.closest?.('[data-cu]')?.dataset.cu;
    if (!act) return false;
    if (act === 'apply') this.#apply();
    else if (act === 'preview') this.#togglePreview(true);
    else if (act === 'cancel') this.#togglePreview(false);
    else if (act === 'skip') { this.#done.set('text', 'skipped'); this.#pass = 1; this.#state = 'done'; this.#host.render(); }
    else if (act === 'undo') this.#undo();
    else if (act === 'retry') this.#read();
    else if (act === 'copy') { const t = this.#el?.querySelector?.('.cmd code')?.textContent ?? ''; navigator.clipboard?.writeText(t).catch(() => {}); this.#host.announce?.(W.copied); }
    else if (act === 'close') this.#host.close();
    return true;
  }
  mount(el) { this.#el = el; }

  #togglePreview(on) {
    if (on && this.#state === 'ready') { this.#preview.show(this.#p, glide); this.#state = 'preview'; this.#listen(true); this.#host.announce?.(W.previewing(this.#page.moves)); }
    else if (!on && this.#state === 'preview') { this.#preview.clear(glide); this.#state = 'ready'; this.#listen(false); this.#held = false; }
    this.#host.render();
  }

  // the styles written once (the theme's tokens and utilities), and only this page's places swapped, as one step
  async #apply() {
    if (!['ready', 'preview'].includes(this.#state)) return;
    const w = this.#p.write ?? {}, sites = new Set(this.#page.roles.flatMap((x) => x.here).map((m) => `${m.site.file}:${m.site.line}:${m.site.column}`));
    const swaps = (w.swaps ?? []).map((f) => ({ ...f, edits: (f.edits ?? []).filter((e) => sites.has(`${f.file}:${e.line}:${e.column}`)) })).filter((f) => f.edits.length);
    this.#preview.clear((el, f) => f()); this.#listen(false); this.#held = false;
    this.#state = 'writing'; this.#host.render();
    const group = `cleanup-text-${Date.now().toString(36)}`;
    const files = new Set(swaps.map((f) => f.file)).size, places = swaps.reduce((n, f) => n + f.edits.length, 0), said = W.saved(places, files);
    const landed = (undo = []) => {
      this.#saved = { group, places, files };
      this.#done.set('text', 'done'); this.#pass = 1; this.#state = 'done';
      const { census: _c, roles: _r, ...page } = this.#page;
      keep({ state: 'done', saved: this.#saved, page, done: Object.fromEntries(this.#done) });
      this.#host.wrote?.({ undo, trace: { group } }, said);
    };
    // the page hears the whole result before the reload the write may cause (hosts/vite.ts): kept, so it comes back done
    const heard = (e) => { const r = e.detail?.results; if (r && ![...(r.tokens ?? []), ...(r.css ?? []), ...(r.swaps ?? [])].some((x) => !x.ok || x.refused?.length)) landed(e.detail.undo); };
    keep({ state: 'writing' });
    addEventListener('plumb:applied', heard, { once: true });
    try {
      const r = await this.#host.write({ tokens: w.tokens ?? [], css: w.css ?? [], swaps }, said, { step: W.pass.text, laws: LAWS, group });
      if (!r?.ok) throw new Error(r?.why ?? W.couldNot);
      landed(r.undo);
      this.#host.announce?.(`${W.pass.text}: ${said}`);
    } catch (error) { keep(null); this.#state = 'error'; this.#err = error?.message ?? W.couldNot; }
    finally { removeEventListener('plumb:applied', heard); }
    this.#host.render();
  }
  async #undo() {
    if (!this.#saved) return;
    keep({ state: 'read', said: W.undone });
    try { await this.#host.undo(this.#saved.group); this.#saved = null; this.#done.delete('text'); this.#pass = 0; await this.#read(); this.#host.announce?.(W.undone); }
    catch (error) { keep(null); this.#err = error?.message ?? W.couldNot; this.#state = 'error'; this.#host.render(); }
  }

  // keys while a clean-up runs (the fix panel passes the key's name): true when handled
  key(k) {
    if (this.#state === 'idle') return false;
    if (k === 'Enter' && ['ready', 'preview'].includes(this.#state)) { this.#apply(); return true; }
    if ((k === 'p' || k === 'P') && this.#state === 'ready') { this.#togglePreview(true); return true; }
    if (k === 'ArrowRight' && ['ready', 'nothing'].includes(this.#state)) { this.#done.set('text', 'skipped'); this.#pass = 1; this.#state = 'done'; this.#host.render(); return true; }
    // Space is Blueprint's (hold to use the page) except while previewing, where held Space compares (#space)
    if (k === ' ') return this.#state === 'preview';
    return k !== 'Escape' && this.running; // nothing else reaches the fixes underneath while a clean-up runs
  }
  // held Space while previewing: the page as it was, back on release. Listened for only while previewing
  #space = (e) => {
    if (e.key !== ' ' || this.#state !== 'preview') return;
    if (e.type === 'keydown' && !this.#held) { this.#held = true; this.#preview.clear((el, f) => f()); }
    if (e.type === 'keyup' && this.#held) { this.#held = false; this.#preview.show(this.#p, (el, f) => f()); }
  };
  #listen(on) { for (const t of ['keydown', 'keyup']) (on ? addEventListener : removeEventListener)(t, this.#space, true); }
  // Esc: the preview first, then the clean-up
  escape() {
    if (this.#state === 'preview') { this.#togglePreview(false); return true; }
    if (this.#state !== 'idle') { this.#host.close(); return true; }
    return false;
  }
}

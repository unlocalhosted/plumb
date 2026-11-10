/* ─────────────────────────────────────────────────────────
 * BLUEPRINT MODE · React Plumber overlay
 *
 * The page as it is, held under the instrument: dimmed and without its colour, so the only colour left is drift.
 * Every drifted element in view is cut out of the dim and outlined where it lives, with one short label; nothing
 * else is drawn (docs/briefs/blueprint-v2.md, layer 2). Instead of Alt-hovering one element at a time, you see the
 * whole view's drift at once and act on any of it.
 *
 *  off → entering → on → leaving → off      Alt+B or the dock's button toggles; Esc leaves
 *
 *  one element  Alt+click reads only the element clicked and what's inside it (Reader scope), never the whole page:
 *            the page's code and the text styles are not asked, and a fix says which other places on the page the
 *            same line of code draws. A click outside it leaves; Alt+click elsewhere reads that element; Alt+B widens
 *
 *  entering  the dim fades in (--pl-dur-dim); the page goes inert under the glass (blueprint-glass.js) and the
 *            Reader starts reading what's in view; elements light up as their readings arrive
 *  on        the MarkLayer cuts each drifted element out of the dim, outlines it in its ink and labels it; a mark
 *            puts its cause in hand in the fix panel (fixpanel.js), the one place you act: it holds a cause at every
 *            place, tries its options, takes one, and applies them all
 *  leaving   the page is usable again at once; the dim fades out (--pl-dur-undim)
 *  reduced motion: no fade
 *
 * Host-page footprint: none. No stylesheet, attribute or inline style is written to the host page; everything is
 * drawn in the overlay's shadow root, so leaving has nothing to restore.
 * ───────────────────────────────────────────────────────── */
import { Reader } from './blueprint-reader.js';
import { MarkLayer, MARKS_CSS } from './blueprint-marks.js';
import { Glass, GLASS_CSS } from './blueprint-glass.js';
import { PANEL_CSS } from './blueprint-panel.js';
import { Craft, spec } from './craft.js'; // craft: the mentor's rules, read on the page and joined to the reader's items
import { Selection, SELECT_CSS } from './select.js'; // the element is the target: a click anywhere on it selects it
import { Changes, CHANGES_CSS } from './changes.js'; // what was changed on the page, per element, until it is applied
import { elementEdit, planOf, swapPlanOf } from './inplace.js';
import { Walkthrough, WALK_CSS } from './walkthrough.js'; // the first time: one proven fix, walked find → quiet
import { FixPanel, FIX_CSS } from './fixpanel.js'; // the one place you act: a cause in hand, its options, Take, Apply
import { FIX } from './words.js';
import { hasText } from './texteditor.js';
import { errorIs, post, request } from './api.js';
import { locate } from './locate.js';

const FADE_IN = 160, FADE_OUT = 120; // ms, the same as --pl-dur-dim and --pl-dur-undim

// Each part of the layer fades on its own, never the layer: an ancestor below full opacity would cut the dim's
// backdrop-filter off from the page, and the grey would arrive only when the fade ended.
const LAYER_CSS = `
  .bp > :is(.labels, svg) { opacity: 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out); }
  .bp[data-on] > :is(.labels, svg) { opacity: 1; transition-duration: var(--pl-dur-dim); }
  @media (prefers-reduced-motion: reduce) { .bp > :is(.labels, svg) { transition: none; } }
`;
// the server answered no (post() gives it a status); anything else is a request the page cut off (a reload it caused)
const answeredNo = (error) => Number.isInteger(error?.status);
// One person's action, one step of the timeline (docs/qa/timeline-crafting-ui.md, issue 3): every request a write makes
// carries the same group, with the step's name and the laws it serves, so History names the step and its Undo takes back
// exactly what the action wrote (POST undo-group)
const traceOf = ({ step = FIX.card.steps.edit, laws = [], group = null } = {}) => ({
  group: group ?? `${String(step).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'edit'}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  meta: { step, laws: [...new Map((laws ?? []).filter((l) => l?.id || typeof l === 'string').map((l) => (typeof l === 'string' ? [l, { id: l, name: l }] : [l.id, { id: l.id, name: l.name }]))).values()] },
});

export const BLUEPRINT_CSS = GLASS_CSS + MARKS_CSS + LAYER_CSS + PANEL_CSS + SELECT_CSS + CHANGES_CSS + WALK_CSS + FIX_CSS;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Blueprint {
  #host; #layer; #marks; #reader; #glass; #onState; #onProgress;
  #state = 'off';
  #timer = 0;
  #craft; #items = []; #selection; #changes; #walk;
  #scope = null; // an Alt+click: the element read, with what's inside it; null is the whole page (Alt+B)

  // host: the overlay element (readMarks, pin, pinnedElement, occluders); root: its shadow root;
  // theme: { decisions() } for the craft engine's scales (craft.js)
  constructor(host, root, { onState, onProgress, theme } = {}) {
    this.#host = host;
    this.#onState = onState;
    this.#onProgress = onProgress;
    this.#craft = new Craft({ theme, again: () => this.#reader?.refresh() });
    this.#craft.onFacts = () => { if (this.active) this.#reader.refresh(); }; // an icon's ink landed
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    root.appendChild(this.#layer);
    this.#glass = new Glass(root, host);
    this.#walk = new Walkthrough(root);
    this.#changes = new Changes(root, { onAccept: (batch) => this.#apply(batch), onSelect: (el) => this.#selection.select(el, this.#itemOf(el)), onShow: () => queueMicrotask(() => this.#focus()), onDiscard: (el) => this.#selection.discarded(el), onPut: (el) => this.#walk.taken(el) });
    this.#selection = new Selection(root, { onFrame: () => this.#marks.invalidate(), tokenOf: (family, n) => this.#craft.theme.nearest(family, n, 0.5)?.short ?? null, health: () => host.health, onChange: (el) => { this.#marks.select(el); this.#walk.selected(el); this.#focus(); },
      onDraw: () => this.#fix?.render(), changes: this.#changes, read: (el) => host.read(el), site: (el) => this.#siteOf(el), steps: (family) => this.#craft.theme.scale(family).filter((x) => Number.isFinite(x.px)).map((x) => ({ token: x.short, n: x.px })).sort((a, b) => a.n - b.n) });
    this.#glass.onPress = (e) => this.#selection.press(e);
    this.#glass.onClick = this.#click;
    this.#marks = new MarkLayer(this.#layer, { onPick: (el, mark, id) => host.choose(el, mark, id), occluders: () => host.occluders?.() ?? [], state: (el, mark) => host.fixState?.(el, mark) ?? null, onOrder: () => { host.ordered?.(); this.#focus(); } });
    // the fix panel drives the selection without drawing it: a cause in hand is its first place selected with every
    // other place as its group; the panel reads the plan, picks, takes, and applies through Changes' guarded writes
    this.#fix = new FixPanel(root, {
      hold: (g, lead) => { const on = g.members.filter((m) => m.el), first = on.find((m) => m.el === lead) ?? on[0], rest = on.filter((m) => m !== first); if (!first) return; this.#selection.select(first.el, this.#itemOf(first.el), { key: first.mark.key, rule: first.mark.rule, mark: first.mark, group: rest.filter((m) => m.el !== first.el).map((m) => ({ el: m.el, item: this.#itemOf(m.el), key: m.mark.key })) }); },
      release: () => this.#selection.clear(),
      // the bar's tools and setup notice are the widget's (docs/design/one-bar.md)
      tool: (name) => this.#host.tool?.(name), setupLeft: () => this.#host.setupLeft?.() ?? 0, openSetup: () => this.#host.openSetup?.(),
      // the last write, still undoable when Blueprint closes: History's toast keeps its Undo once the bar is gone
      handOff: (result, text) => this.#host.wrote?.(result, text),
      view: () => this.#selection.view,
      pick: (i) => this.#selection.pick(i),
      take: () => this.#selection.accept(),
      spotlight: (ids, lead) => this.#marks.spotlight(ids, lead),
      announce: (text) => this.#host.announce?.(text),
      applyAll: (tokens, keeps, total, swaps, said, at) => this.#applyAll(tokens, keeps, total, swaps, said, at),
      // an undo may reload the page as its write did: Blueprint comes back after it, saying it was undone
      // (a request cut off by the reload it caused is not a refusal: what was remembered stays for the page that comes back)
      undo: async (handle) => { this.#host.remember?.(FIX.undone); try { await post('undo', { id: handle.id }); } catch (error) { if (answeredNo(error)) this.#host.forgetResume?.(); throw error; } this.invalidate({ file: handle.file }); },
      tokens: () => spec.value?.tokens ?? null,
      fromCode: (mark, places) => this.#fromCode(mark, places),
      applyStyles: (write, said, meta) => this.#applyStyles(write, said, meta),
      scope: () => this.#scope,
      set: (at, key, token, said) => this.#setProp(at, key, token, said),
      recipe: (at, body, said, meta) => this.#applyRecipe(at, body, said, meta),
      swaps: (writes, said, meta) => this.#swapsWrite(writes, said, meta),
      batch: (steps, said, meta) => this.#batchWrite(steps, said, meta),
      // a step's undo is History's to say (its toast carries the Undo). The sentence is still remembered for the page
      // that comes back, marked as History's: the panel says it only if the reload came before History heard the
      // answer (an undo across two files reloads at the first), and stays quiet when History has it
      undoGroup: async (group) => { this.#host.remember?.(FIX.undone, undefined, null, null, { history: true }); try { return await this.#undoGroup(group); } catch (error) { if (answeredNo(error)) this.#host.forgetResume?.(); throw error; } },
      unwant: () => { this.#want = null; },
      climb: (el) => this.climbTo(el),
      // why an element can't be placed in the source, as the panel says it
      why: async (el) => { const state = await this.#host.readMarks?.(el); return state?.status === 'unplaced' ? (state.outsideSource && state.file ? FIX.outside(state.file) : FIX.unreachable) : null; },
    });
    // the fix panel counts every place in the code the page renders, on the page or not; what is drawn, listed and
    // selected is what the page shows
    this.#reader = new Reader(host, { unrendered: true, onChange: (all) => { const items = all.filter((i) => i.el); this.#items = items; this.#marks.set(items); this.#fix.set(all); this.#selection.refresh(this.#itemOf(this.#selection.el)); this.#offerWalk(); if (this.#want) this.#holdWanted(this.#settled); }, onProgress: (p) => { this.#fix.progress(p); this.#onProgress?.(p); this.#clearAfterWrite(p); this.#settled = p.done ?? (!!p.total && p.read === p.total); if (this.#want && this.#settled) { const want = this.#want; setTimeout(() => { if (this.#want === want) this.#holdWanted(true); }, 300); } }, enrich: (items) => this.#craft.enrich(items) });
  }

  // A key while blueprint is on (the widget asks only when nothing is pinned or being typed): true when used.
  key(key) {
    if (!this.active) return false;
    if (this.#fix.key(key)) return true;
    if (this.#selection.key(key)) return true;
    // with an element selected, . and , step through its problems
    if (this.#selection.el && (key === '.' || key === ',')) return this.#selection.step(key === '.' ? 1 : -1) || true;
    // the old side panel is retired (the fix bar is the one panel): it takes no keys, so nothing hidden moves the page
    return false;
  }
  // The queue changed (the old side panel said what each cause becomes; the fix panel reads it when it draws)
  refresh() {}
  // Through the glass, for a hit test; and the glass's part while words are edited in place.
  through(fn) {
    return this.#glass.through(() => this.#marks.through(fn));
  }
  editing(on, rect) {
    if (this.active) this.#glass.editing(on, rect);
  }
  yieldInput(on) {
    this.#glass.yieldTo(on);
  }
  get state() {
    return this.#state;
  }
  get marks() {
    return this.#marks;
  }
  get active() {
    return this.#state === 'entering' || this.#state === 'on';
  }

  toggle(options) {
    this.active ? this.leave(options) : this.enter(options);
  }

  enter({ instant = false, scope = null, card = false, box = false } = {}) {
    if (this.active) return;
    if (this.#host.health === 'failed') return this.#set('refused');
    clearTimeout(this.#timer);
    // turned on again mid-fade for something else (one element, or the whole page): read afresh
    if (this.#state === 'leaving' && scope !== this.#scope) { this.#teardown(); this.#set('off'); }
    this.#scope = scope;
    if (this.#state === 'off') {
      const t0 = performance.now();
      this.#layer.hidden = false;
      this.#reader.start(scope);
      performance.measure('plumb:reader-start', { start: t0 });
      addEventListener('scroll', this.#invalidate, { passive: true, capture: true });
      addEventListener('resize', this.#invalidate);
      addEventListener('resize', this.#remeasure); // craft: a new layout is measured again
      addEventListener('pointermove', this.#point, { passive: true });
      document.addEventListener('pointerleave', this.#unpoint);
    } else this.#reader.refresh(); // turned back on while fading out: draw what's already read
    this.#glass.on();
    this.#fix.show(true);
    if (scope && hasText(scope) && !box) this.#fix.edit(scope);
    else if (scope && card) this.#fix.card(scope);
    this.#set('entering');
    if (instant || still()) return this.#on();
    // one frame at opacity 0 before the fade, so the transition has somewhere to start
    this.#marks.dim('shown');
    requestAnimationFrame(() => { if (this.#state === 'entering') this.#layer.setAttribute('data-on', ''), this.#marks.dim('on'); });
    this.#timer = setTimeout(() => this.#on(), FADE_IN);
  }

  leave({ instant = false } = {}) {
    if (!this.active) return;
    this.#want = null;
    clearTimeout(this.#timer);
    this.#glass.off(); // the page is usable again the moment blueprint is let go, not after the fade
    this.#selection.clear();
    this.#changes.discardAll(); // nothing previewed is left on the page
    this.#walk.end();
    this.#layer.removeAttribute('data-on');
    this.#marks.dim('shown');
    this.#marks.clear();
    this.#fix.show(false);
    this.#set('leaving');
    if (instant || still()) return this.#off();
    this.#timer = setTimeout(() => this.#off(), FADE_OUT);
  }

  // Remove everything at once, from any state (the overlay is going away).
  destroy() {
    clearTimeout(this.#timer);
    this.#teardown();
    this.#set('off');
  }

  invalidate(change) {
    this.#craft.invalidate(); // craft: a written file changes what the page measures
    if (this.active) this.#reader.invalidate(change), this.#fix.changed();
  }

  // craft: measured again on the next hand-off (a resize moved everything)
  #remeasure = () => this.#craft.invalidate();
  // craft: the theme's decisions arrived (or changed): suggestions name its tokens, so everything is judged again
  themeChanged() {
    this.#craft.invalidate();
    if (this.active) this.#reader.refresh();
  }
  get craft() {
    return this.#craft;
  }
  // everything read on the page, with its craft marks, and whether the reader has nothing left to read (the headless run)
  get items() {
    return this.#items;
  }
  get settled() {
    return this.active && this.#reader.settled;
  }

  healthChanged(status) {
    if (this.active) this.#reader.healthChanged(status);
  }

  #invalidate = () => { this.#marks.invalidate(); this.#selection.draw(); this.#walk.draw(); this.#focus(); };
  // what the person is working on (the selection, else the walkthrough's element): the chrome keeps clear of it
  #focus() {
    const el = this.#selection.el ?? (this.#walk.active ? this.#walk.element : null);
    const r = el?.isConnected ? el.getBoundingClientRect() : null;
    if (r) this.#changes.avoid(r);
  }
  // the walkthrough's first element: one whose first problem has a fix the verdict proved (or a theme choice)
  #offerWalk() {
    return; // the fix panel walks you through causes itself (Enter on Fix); the old walkthrough named the ring and Changes
    if (this.#state !== 'on' || this.#walk.active) return;
    const steps = this.#craft.theme.scale('spacing').filter((x) => Number.isFinite(x.px)).map((x) => ({ token: x.short, n: x.px })).sort((a, b) => a.n - b.n);
    this.#walk.offer(this.#items, (i) => {
      const m = i.marks.find((x) => x.family === 'craft' || x.ledger === 'new');
      if (!m || m.family !== 'craft' || m.craft?.suggest?.kind !== 'class') return false;
      return !!(planOf(m, i.el, steps, (n) => this.#craft.theme.nearest('spacing', n, 0.5)?.short ?? null) ?? swapPlanOf(m));
    });
    this.#focus();
  }
  // the page element under the pointer, looking through the glass and the overlay's own marks
  #under = (x, y) => document.elementsFromPoint(x, y).find((el) => !el.closest('plumb-overlay')) ?? null;
  #point = (e) => { this.#marks.point(this.#under(e.clientX, e.clientY)); this.#marks.near(e.clientX, e.clientY); this.#selection.point(e.clientX, e.clientY); this.#glass.cursor(this.#selection.cursor(e.clientX, e.clientY)); };
  // the reader's reading of an element, or of the nearest ancestor it read
  #itemOf(el) { return el ? this.#items.find((i) => i.el === el) ?? null : null; }
  // A click on the page: the innermost element under it that the reader read (else the element itself) is selected;
  // a click on nothing lets go.
  #click = (e) => {
    // magnetism: a pointer near a zone takes that zone's element
    const near = this.#marks.magnet;
    if (near && this.#fix.holdEl(near)) return;
    const hit = this.#under(e.clientX, e.clientY);
    // one element is read: a click outside it is done with it (Alt+click reads the element clicked instead)
    if (this.#scope && !(hit && this.#scope.contains(hit))) { e.altKey && hit && hit !== document.body && hit !== document.documentElement ? this.enterAt(hit) : this.leave(); return; }
    // Alt+click inside the element being read opens that element's card again (after Esc closed it), as it does anywhere
    if (e.altKey && this.#scope && hit) { this.enterAt(hit, { card: true }); return; }
    if (!hit || hit === document.body || hit === document.documentElement) { this.#fix.release(); this.#selection.clear(); return; }
    let el = hit;
    while (el && el !== document.body && !this.#itemOf(el)) el = el.parentElement;
    if (!el || el === document.body) {
      // nothing read up the chain: a quiet element is selected as it is, but a wrapper holding read elements (the app's
      // root, a page section) is the page's background, and a click there lets go
      if (this.#items.some((i) => hit.contains(i.el))) { this.#fix.release(); this.#selection.clear(); return; }
      el = hit;
    }
    // the fix panel: a click on an element with a problem puts its cause in hand; on anything else, lets go
    if (!this.#fix.holdEl(el)) this.#fix.release();
  };
  // Where an element is written: its line and its file's hash now.
  async #siteOf(el) {
    const at = await locate(el);
    if (!at?.file) return null;
    const props = await request('props', { file: at.file, line: at.line, column: at.column });
    return props?.hash ? { file: at.file, line: props.line ?? at.line, column: props.column ?? at.column, hash: props.hash } : null;
  }
  // Apply in the Changes sidebar: every element's changes as one class edit on its own line, all of one file's in one
  // write (POST swaps) with the hash read when the first change was taken; the page reloads and is read again
  // The all-clear: problems were left before a write, and once the page is read again none are. The count before the
  // write is kept in the session, so a write that reloads the page still ends in its all-clear.
  #fix;
  #undos = []; #saying = null; #at = null; #trace = null; // the write in progress: its undo handles, and what it changed in words
  #lastDrift = 0;
  #clearAfterWrite(p) {
    if (p.read === p.total) {
      let wrote = null;
      try { wrote = JSON.parse(sessionStorage.getItem('plumb:wrote') ?? 'null'); } catch {}
      if (wrote && p.drift === 0 && wrote.drift > 0 && Date.now() - wrote.t < 20000) {
        try { sessionStorage.removeItem('plumb:wrote'); } catch {}
        this.#fix.celebrate();
      }
    }
    if (p.read === p.total) this.#lastDrift = p.drift;
  }
  // The text styles written (POST apply-all with the proposal's own write: the theme's tokens, one class per style,
  // every place swapped, each file guarded by its hash). A theme write may reload the page: it comes back saying so.
  async #applyStyles(write, said, meta = { step: FIX.card.steps.styles }) {
    const trace = traceOf(meta);
    this.#host.remember?.(said, undefined, null, trace.group);
    const heard = (e) => this.#host.remember?.(said, e.detail?.undo ?? [], null, trace.group);
    addEventListener('plumb:applied', heard, { once: true });
    try {
      const answer = await post('apply-all', { tokens: write.tokens ?? [], css: write.css ?? [], swaps: write.swaps ?? [], trace });
      const results = answer?.results ?? {}, undo = answer?.undo ?? [];
      const failed = [...(results.tokens ?? []), ...(results.css ?? []), ...(results.swaps ?? [])].filter((x) => !x.ok || x.refused?.length);
      for (const f of new Set([...(write.tokens ?? []), ...(write.css ?? []), ...(write.swaps ?? [])].map((x) => x.file))) this.invalidate({ file: f });
      // a write that partly lands is a step all the same: what it changed is kept, with its Undo, and what it left as it is
      // is said. Forgetting it would leave changed files behind a reload with no word and no Undo (found on crafting-ui:
      // one swap of seventeen refused, classes split across a template string)
      const wrote = [...(results.tokens ?? []), ...(results.css ?? []), ...(results.swaps ?? [])].some((x) => x.ok && (!Array.isArray(x.applied) || x.applied.length));
      const why = failed.length ? (errorIs(failed[0], 'stale-file') ? FIX.changedSince : failed[0].error ?? failed[0].refused?.[0]?.reason ?? FIX.couldNot) : null;
      if (failed.length && !wrote) { this.#host.forgetResume?.(); return { ok: false, undo, group: trace.group, why }; }
      this.#host.remember?.(said, undo, null, trace.group);
      const left = failed.flatMap((f) => (f.refused?.length ? f.refused.map((r) => ({ file: f.file, ...r })) : [{ file: f.file, reason: f.error ?? why }]));
      return { ok: true, undo, group: trace.group, refused: left };
    } catch (error) { this.#host.forgetResume?.(); return { ok: false, why: errorIs(error, 'stale-file') ? FIX.changedSince : error?.message ?? FIX.couldNot }; }
    finally { removeEventListener('plumb:applied', heard); }
  }
  // A cause no element renders right now: its theme choices, each with its exact edit at every place, read from the
  // code (GET edits per place). The plan is the one a drawn element gets (swapPlanOf); writes[i] is choice i's edits.
  async #fromCode(mark, places) {
    const read = await Promise.all(places.map((p) => request('edits', { file: p.file, line: p.line, column: p.column }, { throws: true }).then((r) => ({ ...p, hash: r.hash, edits: r.edits ?? [] }))));
    const here = (p, name) => p.edits.find((e) => e.token === name && e.line === p.line && e.column === p.column);
    const plan = swapPlanOf({ ...mark, choices: mark.choices.map((c) => ({ ...c, edit: here(read[0], c.name) ?? null })) });
    if (!plan) return null;
    const writes = mark.choices.map((c) => read.flatMap((p) => { const e = here(p, c.name); return e ? [{ file: p.file, hash: p.hash, id: e.id }] : []; }));
    return { plan, writes };
  }
  // Apply from the fix panel: each new token is written to the theme with its class swap (POST token), then every
  // class change Changes holds goes out in one guarded write per file
  // Apply: every token first (the theme), then each token's class at every place of its cause, one guarded write per
  // file; then the causes kept as intended into the ledger; then the panel's swaps (Changes). What did not land is said.
  // `said`: what the fix changed, in words, kept for a reload the write causes; every write's undo handle comes back
  // `at`: the fix's place in the panel's list, so a reload the write causes comes back on the fix after it
  async #applyAll(tokens, keeps = [], total = tokens.length + keeps.length, swaps = [], said = FIX.applied(total), at = null) {
    const undo = (this.#undos = []);
    // one fix, one step: the panel's swaps, the edits by id and the theme's write all carry its group
    const trace = this.#trace = traceOf(at?.meta ?? { step: FIX.card.steps.fix });
    this.#saying = said; this.#at = at;
    this.#host.remember?.(said, undefined, at, trace.group); // pending: a reload before the answer finds its undo in the server's history
    // the panel's swaps first (Changes: source files, which hot-update without a reload)
    if (this.#changes.count) await this.#changes.accept();
    // then the causes taken from the code alone: their edits by id, per file (POST apply: the server derives each edit
    // again from the source as it is, and a file changed since it was read writes nothing)
    const refused = [];
    let why = null;
    const byFile = new Map(); // file → { hash, edits: [{ id }], of: [swap] }
    for (const s of swaps) for (const w of s.writes) {
      const f = byFile.get(w.file) ?? byFile.set(w.file, { hash: w.hash, edits: [], of: [] }).get(w.file);
      if (!f.edits.some((e) => e.id === w.id)) f.edits.push({ id: w.id });
      if (!f.of.includes(s)) f.of.push(s);
    }
    for (const [file, f] of byFile) {
      try {
        const result = await post('apply', { file, hash: f.hash, edits: f.edits, trace });
        if (result?.undo) undo.push(result.undo);
        this.invalidate({ file });
      } catch (error) {
        this.#host.forgetResume?.();
        for (const s of f.of) if (!refused.includes(s)) refused.push(s);
        why ??= errorIs(error, 'stale-file') ? FIX.changedSince : error?.message ?? FIX.couldNot;
      }
    }
    // then the rest in one request the server runs to the end (POST apply-all): new tokens' classes at every place,
    // the theme, the ledger. A reload the theme write causes can't cut it short.
    // a new step's class goes in only once the theme has it (the server's `then`), so a step the theme refuses never
    // leaves a class that means something else: at every place of its cause in the source, or, for a step a craft
    // check suggested (no source rule), at the places the panel holds
    const then = new Map();
    for (const t of tokens) {
      const s = t.suggest, rule = t.marks?.[0]?.rule;
      if (!s.then?.to) continue;
      if (s.then.from && rule) { then.set(t, { cause: { rule, text: s.then.from, choice: s.name } }); continue; }
      const files = new Map();
      for (const el of t.els) {
        const site = await this.#siteOf(el).catch(() => null);
        if (!site) continue;
        const f = files.get(site.file) ?? files.set(site.file, { file: site.file, hash: site.hash, edits: [] }).get(site.file);
        if (!f.edits.some((e) => e.line === site.line && e.column === site.column)) f.edits.push({ line: site.line, column: site.column, from: s.then.from ?? '', to: s.then.to });
      }
      if (files.size) then.set(t, { swaps: [...files.values()] });
    }
    if (tokens.length || keeps.length) {
      // what landed, from the server's results: the response, or the dev server's word before the reload it causes
      const outcome = (results) => {
        const refused = [];
        let said = null;
        const miss = (item, error) => { if (item && !refused.includes(item)) refused.push(item); said ??= errorIs(error ?? '', 'stale-file') ? FIX.changedSince : error ?? FIX.couldNot; };
        results.tokens.forEach((r, i) => { if (!r.ok) miss(tokens[i], r.error); });
        for (const r of results.swaps) if (!r.ok || r.refused?.length) miss(tokens.find((t) => t.suggest.name === r.token), r.error ?? r.refused?.[0]?.reason);
        results.accepts.forEach((r, i) => { if (!r.ok) miss(keeps[i], r.error); });
        return { refused, said };
      };
      // Vite tells the page the whole result before the reload that would cut the response short: the bar says
      // after it what did not land, not a count that was only hoped for
      // (with every undo handle, so Undo still works after it)
      const heard = (e) => { const o = e.detail?.results && outcome(e.detail.results); this.#host.remember?.(o?.refused.length ? FIX.appliedSome(total - o.refused.length, total, o.said) : said, [...undo, ...(e.detail?.undo ?? [])], at, trace.group); };
      addEventListener('plumb:applied', heard, { once: true });
      try {
        const { results, undo: handles } = await post('apply-all', {
          tokens: tokens.map((t) => ({ file: t.suggest.file, hash: t.suggest.hash, name: t.suggest.name, value: t.suggest.value, ...(t.suggest.why ? { why: t.suggest.why } : {}), ...(then.has(t) ? { then: then.get(t) } : {}) })),
          accepts: keeps.map((k) => ({ rule: k.rule, sites: k.sites, why: k.why })),
          trace,
        });
        const o = outcome(results);
        undo.push(...(handles ?? []));
        refused.push(...o.refused); why = o.said ?? why;
        for (const f of new Set([...tokens.map((t) => t.suggest.file), ...results.swaps.map((r) => r.file).filter(Boolean), ...keeps.flatMap((k) => k.sites.map((x) => x.file))])) this.invalidate({ file: f });
      } catch (error) { refused.push(...tokens, ...keeps); why = error?.message ?? FIX.couldNot; this.#host.forgetResume?.(); }
      finally { removeEventListener('plumb:applied', heard); }
    }
    // what did not land (a token, a swap or a keep refused, or a class change Changes couldn't write): say so. One fix
    // is written at a time, so a class change that didn't land is put back on the page, never left waiting
    const left = this.#changes.count, leftWhy = this.#changes.why;
    if (left) this.#changes.discardAll();
    this.#saying = null; this.#trace = null;
    if (!left && !refused.length && undo.length) this.#host.remember?.(said, undo, at, trace.group);
    return { count: left + refused.length, why: leftWhy ?? why, refused, undo, group: trace.group };
  }
  async #apply(batch) {
    // Changes accepted as part of a fix are that fix's step; accepted on their own, one step of their own
    const trace = this.#trace ?? traceOf({ step: FIX.card.steps.fix });
    try { sessionStorage.setItem('plumb:wrote', JSON.stringify({ t: Date.now(), drift: this.#lastDrift })); } catch {}
    const out = [], files = new Map(); // file → { hash, edits: [{ line, column, from, to }], els: [] }
    for (const b of batch) {
      // every change on the element as one class edit against its classes as written
      const edit = elementEdit(b.classes, b.writes ?? [], b.props);
      if (!edit) { out.push({ el: b.el, ok: false, why: 'This change can’t be written as classes here.' }); continue; }
      const site = b.site ?? await this.#siteOf(b.el).catch(() => null);
      if (!site) { out.push({ el: b.el, ok: false, why: 'Can’t reach this in your code.' }); continue; }
      const f = files.get(site.file) ?? files.set(site.file, { hash: site.hash, edits: [], els: [] }).get(site.file);
      f.edits.push({ line: site.line, column: site.column, from: edit.from, to: edit.to });
      f.els.push(b.el);
    }
    for (const [file, f] of files) {
      try {
        // the write reloads the page when the dev server can't hot-swap it: blueprint comes back on after it
        this.#host.remember?.(this.#saying ?? `Applied ${f.edits.length === 1 ? f.edits[0].to : `${f.edits.length} changes`} in ${file.split('/').pop()}`, [], this.#at, trace.group);
        const result = await post('swaps', { file, hash: f.hash, edits: f.edits, trace });
        // the fix panel says what was written, with Undo (not a second toast)
        if (result?.undo) this.#undos.push(result.undo);
        this.invalidate({ file });
        for (const el of f.els) out.push({ el, ok: true });
        if (f.els.includes(this.#walk.element)) this.#walk.applied(true);
      } catch (error) {
        this.#host.forgetResume?.();
        const why = errorIs(error, 'stale-file') ? FIX.changedSince : error?.message ?? 'Couldn’t apply.';
        for (const el of f.els) out.push({ el, ok: false, why });
      }
    }
    return out;
  }
  // A pin, a label or a panel row chose a problem: its element is selected with that problem current, and the other
  // places of its cause go with it (a fix taken there is taken at every place that offers the same one).
  choose(el, mark, group) {
    if (this.#fix.holdMark(el, mark)) return;
    this.#selection.select(el, this.#itemOf(el), { key: mark?.key, rule: mark?.rule, group: (group ?? []).filter((g) => g.el !== el).map((g) => ({ el: g.el, item: this.#itemOf(g.el), key: g.mark?.key })) });
  }
  // Alt+click: blueprint opens on that element, and its own cause is put in hand as soon as one is read (not an
  // ancestor's: the page's wrappers are often read first). An element is read before its marks are settled, so only
  // a finished reading says it has nothing off; then it is selected as it is. The reader reports progress before it
  // hands on the items of the same wave, so the items decide, with the progress they came with.
  #want = null;
  // the page came back after a write reloaded it: the fix bar says what was applied
  resumed(text, undo, at, group = null) { this.#fix.resumed(text, undo, at, group); }
  // Alt+click: that element and what's inside it are read, never the whole page (Alt+B is the whole page). Another
  // element outside the one being read is read in its place.
  // `card`: an Alt+click, which opens anything that isn't words in its own card (elementcard.js) beside it. The card
  // owns the screen: no cause is put in hand while it is open (the panel is its one line; '.' hands over to the fixes).
  // Without a card (a script's pin, a pick from a list) the element's own cause is put in hand once it is read
  // `box`: the element as a box even when it holds words (a level climbed or walked up to); `trail`: a climb, which keeps
  // the way back down
  enterAt(el, { card = false, box = false, trail = false } = {}) {
    if (!trail) this.#trail = [];
    if (this.active && this.#scope && !this.#scope.contains(el)) this.leave({ instant: true });
    // words: their own values open in the fix panel (texteditor.js), problem or not
    if (hasText(el) && !box) { this.#want = null; return this.active ? this.#fix.edit(el) : this.enter({ scope: el }); }
    this.#want = card ? null : el;
    if (this.active) { if (card) this.#fix.card(el); else this.#holdWanted(this.#settled); } else this.enter({ scope: el, card, box });
  }
  // ⌥↑ ⌥↓ and the card's levels (docs/briefs/qa-fixes.md, cause 4): up from words is the element that holds them, up
  // from an element its parent (never <body>); down retraces the way up, one level at a time
  #trail = []; // [{ el, words }]: where each climb up started
  climb(dir) {
    const now = this.#fix.editing; if (!now) return;
    if (dir > 0) {
      const words = this.#fix.texting, up = words ? now : now.parentElement;
      if (!up || up === document.body || up === document.documentElement) return;
      this.#trail.push({ el: now, words });
      return this.enterAt(up, { card: true, box: true, trail: true });
    }
    let back = this.#trail.pop();
    while (back && !back.el.isConnected) back = this.#trail.pop();
    if (!back) return;
    if (back.words) this.enterAt(back.el, { trail: true }); else this.enterAt(back.el, { card: true, box: true, trail: true });
  }
  // a level named in the card's header: up to it, every level passed kept for the way back
  climbTo(el) {
    const now = this.#fix.editing; if (!now || !el?.contains(now) || el === now) return;
    this.#trail.push({ el: now, words: this.#fix.texting });
    for (let p = now.parentElement; p && p !== el; p = p.parentElement) this.#trail.push({ el: p, words: false });
    this.enterAt(el, { card: true, box: true, trail: true });
  }
  // One value of one element, set on its line of code (the text editor's pick): remembered first, as every write is,
  // so a page the write reloads comes back to the same element with the write said and its Undo. Every write below is
  // one step (traceOf): its requests share a group, and the answer carries it for the panel's Undo (POST undo-group)
  async #setProp(at, key, token, said, meta = { step: FIX.card.steps.text(key) }) {
    const trace = traceOf(meta);
    this.#host.remember?.(said, undefined, null, trace.group);
    let result;
    try { result = await post('set', { file: at.file, hash: at.hash, line: at.line, column: at.column, key, token, ...(at.at ? { at: at.at } : {}), trace }); }
    catch (error) { if (answeredNo(error)) this.#host.forgetResume?.(); throw error; }
    this.#host.remember?.(said, result?.undo ? [result.undo] : [], null, trace.group);
    this.invalidate({ file: at.file });
    return { ...result, group: trace.group };
  }
  // A recipe (a shadow, a motion) written for one element through the recipe engine: remembered first, as every write is;
  // every file it wrote is read again
  async #applyRecipe(at, body, said, meta) {
    const trace = traceOf(meta);
    this.#host.remember?.(said, undefined, null, trace.group);
    let result;
    try { result = await post('recipes/apply', { file: at.file, hash: at.hash, line: at.line, column: at.column, ...body, trace }); }
    catch (error) { if (answeredNo(error)) this.#host.forgetResume?.(); throw error; }
    this.#host.remember?.(said, result?.undo ?? [], null, trace.group);
    const files = new Set([at.file, ...(result?.undo ?? []).map((h) => h.file).filter(Boolean)]);
    for (const file of files) this.invalidate({ file });
    return { ...result, group: trace.group };
  }
  // A batch of class edits in several places (the element card's Tidy, layout and spacing): swaps on a line and string
  // props at a usage, each file's hash carried from one write to the next; all or nothing (what was written is taken
  // back if one fails); one said line, one step (every request in one group)
  async #batchWrite(steps, said, meta) {
    const trace = traceOf(meta);
    this.#host.remember?.(said, undefined, null, trace.group);
    const undo = [], hash = new Map(), files = new Set();
    const swaps = new Map(); // file → one swaps call for all of its lines
    for (const st of steps) if (st.kind === 'swap') { if (!swaps.has(st.file)) swaps.set(st.file, []); swaps.get(st.file).push({ line: st.line, column: st.column, from: st.from, to: st.to, ...(st.at ? { at: st.at } : {}) }); }
    try {
      const done = new Set();
      for (const st of steps) {
        const h = hash.get(st.file) ?? st.hash;
        let r;
        if (st.kind === 'swap') { if (done.has(st.file)) continue; done.add(st.file); r = await post('swaps', { file: st.file, hash: h, edits: swaps.get(st.file), trace }); if (r?.refused?.length) throw Object.assign(new Error(r.refused.map((x) => x.reason).join(' ')), { status: 400, partial: r }); }
        else r = await post('prop', { file: st.file, hash: h, line: st.line, column: st.column, name: st.name, value: st.value, trace });
        if (r?.undo) undo.push(r.undo);
        if (r?.hash) hash.set(st.file, r.hash);
        files.add(st.file);
      }
    } catch (error) {
      if (error?.partial?.undo) undo.push(error.partial.undo);
      // the step is taken back whole: what it wrote before the refusal, never a file's other changes
      if (undo.length) await post('undo-group', { group: trace.group }).catch(async () => { for (const h of [...undo].reverse()) await post('undo', { id: h.id }).catch(() => {}); });
      if (answeredNo(error)) this.#host.forgetResume?.();
      for (const f of files) this.invalidate({ file: f });
      throw error;
    }
    this.#host.remember?.(said, undo, null, trace.group);
    for (const f of files) this.invalidate({ file: f });
    return { undo, group: trace.group };
  }
  // Class swaps on one or more lines: one POST swaps per file, remembered first as every write is; each file's undo
  // handle goes with the said line. A place the server refuses is said in its words.
  async #swapsWrite(writes, said, meta) {
    const trace = traceOf(meta);
    this.#host.remember?.(said, undefined, null, trace.group);
    const undo = [], refused = [];
    try {
      for (const w of writes) {
        const r = await post('swaps', { file: w.file, hash: w.hash, edits: w.edits, trace });
        if (r?.undo) undo.push(r.undo);
        refused.push(...(r?.refused ?? []).map((x) => x.reason));
      }
    } catch (error) { if (answeredNo(error)) { if (undo.length) this.#host.remember?.(said, undo, null, trace.group); else this.#host.forgetResume?.(); } if (!undo.length) throw error; refused.push(error?.message ?? String(error)); }
    this.#host.remember?.(said, undo, null, trace.group);
    for (const w of writes) this.invalidate({ file: w.file });
    return { undo, refused, group: trace.group };
  }
  // The panel's Undo for a step: every change the step wrote, taken back where each is now (POST undo-group), never a
  // whole file put back; the answer goes to History, which says it with its own Undo (a step back again)
  async #undoGroup(group, said = FIX.undone) {
    const result = await post('undo-group', { group });
    for (const file of Object.keys(result?.files ?? {})) this.invalidate({ file });
    this.#host.wrote?.(result, said);
    return result;
  }
  // an element card is open (it comes back open after a reload a write causes)
  get carding() { return this.#fix.carding; }
  // a card (an element's, or words') is open: it owns the screen (not `editing`: that is the glass's hole for words
  // edited in place, a method above)
  get cardOpen() { return !!this.#fix.editing; }
  // the element being read (an Alt+click), or null for the whole page
  get scope() { return this.#scope; }
  // from one element to the whole page (Alt+B while one element is read)
  widen() {
    if (!this.#scope) return;
    this.leave({ instant: true });
    this.enter();
  }
  #settled = false;
  #holdWanted(done = false) {
    const want = this.#want;
    if (!want?.isConnected) return void (this.#want = null);
    if (this.#fix.holdEl(want, 'uncover')) return void (this.#want = null);
    if (done) {
      this.#want = null;
      // one element read: nothing of its own, but something inside it has a problem, so that fix is put in hand
      if (this.#scope) { this.#fix.hold(0); if (this.#fix.holding) return; }
      this.#selection.select(want, this.#itemOf(want));
      // nothing to put in hand: the bar says why, so a pick never ends in silence (the element's own reading says
      // whether it could be checked at all)
      Promise.resolve(this.#host.readMarks?.(want)).catch(() => null).then((state) => {
        this.#fix.notice(state?.status === 'unplaced' ? (state.outsideSource && state.file ? FIX.outside(state.file) : FIX.unreachable) : FIX.elementClear);
      });
    }
  }
    // Esc lets go of the selection before it leaves blueprint; true when there was one
  deselect() { return this.#selection.clear(); }
  get selected() { return this.#selection.el; }
  #unpoint = () => this.#marks.point(null);

  #on() {
    if (this.#state !== 'entering') return;
    this.#layer.setAttribute('data-on', '');
    this.#marks.dim('on');
    this.#set('on');
    this.#marks.invalidate();
    this.#offerWalk();
  }

  #off() {
    if (this.#state !== 'leaving') return;
    this.#teardown();
    this.#set('off');
  }

  // The fix panel's box, for marks that must not sit under it.
  panelRect() {
    return this.active ? this.#fix.rect : null;
  }

  #set(state) {
    if (state !== 'refused') this.#state = state;
    this.#onState?.(state);
  }

  #teardown() {
    this.#selection.clear();
    this.#glass.off();
    this.#reader.stop();
    this.#marks.clear();
    removeEventListener('scroll', this.#invalidate, { capture: true });
    removeEventListener('resize', this.#invalidate);
    removeEventListener('resize', this.#remeasure);
    this.#craft.invalidate();
    removeEventListener('pointermove', this.#point);
    document.removeEventListener('pointerleave', this.#unpoint);
    this.#layer.removeAttribute('data-on');
    this.#marks.dim('off');
    this.#layer.hidden = true;
    this.#scope = null;
  }
}

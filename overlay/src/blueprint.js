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
import { post, request } from './api.js';
import { locate } from './locate.js';

const FADE_IN = 160, FADE_OUT = 120; // ms, the same as --pl-dur-dim and --pl-dur-undim

// Each part of the layer fades on its own, never the layer: an ancestor below full opacity would cut the dim's
// backdrop-filter off from the page, and the grey would arrive only when the fade ended.
const LAYER_CSS = `
  .bp > :is(.labels, svg) { opacity: 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out); }
  .bp[data-on] > :is(.labels, svg) { opacity: 1; transition-duration: var(--pl-dur-dim); }
  @media (prefers-reduced-motion: reduce) { .bp > :is(.labels, svg) { transition: none; } }
`;
export const BLUEPRINT_CSS = GLASS_CSS + MARKS_CSS + LAYER_CSS + PANEL_CSS + SELECT_CSS + CHANGES_CSS + WALK_CSS + FIX_CSS;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Blueprint {
  #host; #layer; #marks; #reader; #glass; #onState; #onProgress;
  #state = 'off';
  #timer = 0;
  #craft; #items = []; #selection; #changes; #walk;

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
      view: () => this.#selection.view,
      pick: (i) => this.#selection.pick(i),
      take: () => this.#selection.accept(),
      spotlight: (els) => this.#marks.spotlight(els),
      announce: (text) => this.#host.announce?.(text),
      applyAll: (tokens, keeps, total, swaps) => this.#applyAll(tokens, keeps, total, swaps),
      tokens: () => spec.value?.tokens ?? null,
      fromCode: (mark, places) => this.#fromCode(mark, places),
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

  enter({ instant = false } = {}) {
    if (this.active) return;
    if (this.#host.health === 'failed') return this.#set('refused');
    clearTimeout(this.#timer);
    if (this.#state === 'off') {
      const t0 = performance.now();
      this.#layer.hidden = false;
      this.#reader.start();
      performance.measure('plumb:reader-start', { start: t0 });
      addEventListener('scroll', this.#invalidate, { passive: true, capture: true });
      addEventListener('resize', this.#invalidate);
      addEventListener('resize', this.#remeasure); // craft: a new layout is measured again
      addEventListener('pointermove', this.#point, { passive: true });
      document.addEventListener('pointerleave', this.#unpoint);
    } else this.#reader.refresh(); // turned back on while fading out: draw what's already read
    this.#glass.on();
    this.#fix.show(true);
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
    if (this.active) this.#reader.invalidate(change);
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
  // A cause no element renders right now: its theme choices, each with its exact edit at every place, read from the
  // code (GET edits per place). The plan is the one a drawn element gets (swapPlanOf); writes[i] is choice i's edits.
  async #fromCode(mark, places) {
    const read = await Promise.all(places.map((p) => request('edits', { file: p.file, line: p.line, column: p.column }).then((r) => ({ ...p, hash: r.hash, edits: r.edits ?? [] }))));
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
  async #applyAll(tokens, keeps = [], total = tokens.length + keeps.length, swaps = []) {
    // the panel's swaps first (Changes: source files, which hot-update without a reload)
    if (this.#changes.count) await this.#changes.accept();
    // then the causes taken from the code alone: their edits by id, per file (POST apply: the server derives each edit
    // again from the source as it is, and a file changed since it was read writes nothing)
    const refused = [];
    let said = null;
    const byFile = new Map(); // file → { hash, edits: [{ id }], of: [swap] }
    for (const s of swaps) for (const w of s.writes) {
      const f = byFile.get(w.file) ?? byFile.set(w.file, { hash: w.hash, edits: [], of: [] }).get(w.file);
      if (!f.edits.some((e) => e.id === w.id)) f.edits.push({ id: w.id });
      if (!f.of.includes(s)) f.of.push(s);
    }
    if (byFile.size) this.#host.remember?.(FIX.applied(total));
    for (const [file, f] of byFile) {
      try {
        await post('apply', { file, hash: f.hash, edits: f.edits });
        this.invalidate({ file });
      } catch (error) {
        this.#host.forgetResume?.();
        for (const s of f.of) if (!refused.includes(s)) refused.push(s);
        said ??= /changed since/i.test(error?.message ?? '') ? FIX.changedSince : error?.message ?? FIX.couldNot;
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
      // said now: if the theme write reloads the page, the bar says it when the page comes back
      this.#host.remember?.(FIX.applied(total));
      // what landed, from the server's results: the response, or the dev server's word before the reload it causes
      const outcome = (results) => {
        const refused = [];
        let said = null;
        const miss = (item, error) => { if (item && !refused.includes(item)) refused.push(item); said ??= /changed since/i.test(error ?? '') ? FIX.changedSince : error ?? FIX.couldNot; };
        results.tokens.forEach((r, i) => { if (!r.ok) miss(tokens[i], r.error); });
        for (const r of results.swaps) if (!r.ok || r.refused?.length) miss(tokens.find((t) => t.suggest.name === r.token), r.error ?? r.refused?.[0]?.reason);
        results.accepts.forEach((r, i) => { if (!r.ok) miss(keeps[i], r.error); });
        return { refused, said };
      };
      // Vite tells the page the whole result before the reload that would cut the response short: the bar says
      // after it what did not land, not a count that was only hoped for
      const heard = (e) => { const o = e.detail?.results && outcome(e.detail.results); if (o?.refused.length) this.#host.remember?.(FIX.appliedSome(total - o.refused.length, total, o.said)); };
      addEventListener('plumb:applied', heard, { once: true });
      try {
        const { results } = await post('apply-all', {
          tokens: tokens.map((t) => ({ file: t.suggest.file, hash: t.suggest.hash, name: t.suggest.name, value: t.suggest.value, ...(t.suggest.why ? { why: t.suggest.why } : {}), ...(then.has(t) ? { then: then.get(t) } : {}) })),
          accepts: keeps.map((k) => ({ rule: k.rule, sites: k.sites, why: k.why })),
        });
        const o = outcome(results);
        refused.push(...o.refused); said = o.said ?? said;
        for (const f of new Set([...tokens.map((t) => t.suggest.file), ...results.swaps.map((r) => r.file).filter(Boolean), ...keeps.flatMap((k) => k.sites.map((x) => x.file))])) this.invalidate({ file: f });
      } catch (error) { refused.push(...tokens, ...keeps); said = error?.message ?? FIX.couldNot; this.#host.forgetResume?.(); }
      finally { removeEventListener('plumb:applied', heard); }
    }
    // what did not land (a token, a swap or a keep refused, or a class change still in Changes): say so
    return { count: this.#changes.count + refused.length, why: this.#changes.why ?? said, refused };
  }
  async #apply(batch) {
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
        this.#host.remember?.(`Applied ${f.edits.length === 1 ? f.edits[0].to : `${f.edits.length} changes`} in ${file.split('/').pop()}`);
        const result = await post('swaps', { file, hash: f.hash, edits: f.edits });
        this.#host.wrote?.(result, `Applied ${f.els.length === 1 ? f.edits[0].to : `${f.els.length} changes`} in ${file.split('/').pop()}`);
        this.invalidate({ file });
        for (const el of f.els) out.push({ el, ok: true });
        if (f.els.includes(this.#walk.element)) this.#walk.applied(true);
      } catch (error) {
        this.#host.forgetResume?.();
        const why = /changed since/i.test(error?.message ?? '') ? FIX.changedSince : error?.message ?? 'Couldn’t apply.';
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
  resumed(text) { this.#fix.resumed(text); }
  enterAt(el) {
    this.#want = el;
    this.active ? this.#holdWanted(this.#settled) : this.enter();
  }
  #settled = false;
  #holdWanted(done = false) {
    const want = this.#want;
    if (!want?.isConnected) return void (this.#want = null);
    if (this.#fix.holdEl(want, 'uncover')) return void (this.#want = null);
    if (done) {
      this.#want = null;
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
  }
}

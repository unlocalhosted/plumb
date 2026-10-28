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
 *  on        the MarkLayer cuts each drifted element out of the dim, outlines it in its ink and labels it; its breaks
 *            open the chooser (blueprint-fix.js), which picks, previews and writes. The panel on the right
 *            (blueprint-panel.js) holds the same drift grouped by cause: J/K move between causes, Enter fixes one
 *            everywhere it appears
 *  leaving   the page is usable again at once; the dim fades out (--pl-dur-undim)
 *  reduced motion: no fade
 *
 * Host-page footprint: none. No stylesheet, attribute or inline style is written to the host page; everything is
 * drawn in the overlay's shadow root, so leaving has nothing to restore.
 * ───────────────────────────────────────────────────────── */
import { Reader } from './blueprint-reader.js';
import { MarkLayer, MARKS_CSS } from './blueprint-marks.js';
import { Glass, GLASS_CSS } from './blueprint-glass.js';
import { Panel, PANEL_CSS } from './blueprint-panel.js';
import { Craft } from './craft.js'; // craft: the mentor's rules, read on the page and joined to the reader's items
import { Selection, SELECT_CSS } from './select.js'; // the element is the target: a click anywhere on it selects it
import { Changes, CHANGES_CSS } from './changes.js'; // what was changed on the page, per element, until it is applied
import { elementEdit, planOf, swapPlanOf } from './inplace.js';
import { Walkthrough, WALK_CSS } from './walkthrough.js'; // the first time: one proven fix, walked find → quiet
import { FixPanel, FIX_CSS } from './fixpanel.js'; // the one place you act: a cause in hand, its options, Take, Apply
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
  #panel; #craft; #items = []; #selection; #changes; #walk;

  // host: the overlay element (readMarks, pin, pinnedElement, occluders); root: its shadow root;
  // theme: { decisions() } for the craft engine's scales (craft.js)
  constructor(host, root, { onState, onProgress, theme } = {}) {
    this.#host = host;
    this.#onState = onState;
    this.#onProgress = onProgress;
    this.#craft = new Craft({ theme });
    this.#craft.onFacts = () => { if (this.active) this.#reader.refresh(); }; // an icon's ink landed
    this.#layer = Object.assign(document.createElement('div'), { className: 'bp', hidden: true });
    root.appendChild(this.#layer);
    this.#glass = new Glass(root, host);
    this.#walk = new Walkthrough(root);
    this.#changes = new Changes(root, { onAccept: (batch) => this.#apply(batch), onSelect: (el) => this.#selection.select(el, this.#itemOf(el)), onShow: (shown) => { if (shown) this.#panel.open(false); queueMicrotask(() => this.#focus()); }, onDiscard: (el) => this.#selection.discarded(el), onPut: (el) => this.#walk.taken(el) });
    this.#selection = new Selection(root, { onFrame: () => this.#marks.invalidate(), tokenOf: (family, n) => this.#craft.theme.nearest(family, n, 0.5)?.short ?? null, health: () => host.health, onChange: (el) => { this.#marks.select(el); this.#walk.selected(el); this.#focus(); },
      onDraw: () => this.#fix?.render(), changes: this.#changes, read: (el) => host.read(el), site: (el) => this.#siteOf(el), steps: (family) => this.#craft.theme.scale(family).filter((x) => Number.isFinite(x.px)).map((x) => ({ token: x.short, n: x.px })).sort((a, b) => a.n - b.n) });
    this.#glass.onPress = (e) => this.#selection.press(e);
    this.#glass.onClick = this.#click;
    this.#marks = new MarkLayer(this.#layer, { onPick: (el, mark, id) => host.choose(el, mark, id), occluders: () => host.occluders?.() ?? [], state: (el, mark) => host.fixState?.(el, mark) ?? null, onOrder: () => { host.ordered?.(); this.#focus(); } });
    this.#panel = new Panel(root, { host, marks: this.#marks });
    // the fix panel drives the selection without drawing it: a cause in hand is its first place selected with every
    // other place as its group; the panel reads the plan, picks, takes, and applies through Changes' guarded writes
    this.#fix = new FixPanel(root, {
      hold: (g) => { const [first, ...rest] = g.members; this.#selection.select(first.el, this.#itemOf(first.el), { key: first.mark.key, rule: first.mark.rule, group: rest.filter((m) => m.el !== first.el).map((m) => ({ el: m.el, item: this.#itemOf(m.el), key: m.mark.key })) }); },
      release: () => this.#selection.clear(),
      view: () => this.#selection.view,
      pick: (i) => this.#selection.pick(i),
      take: () => this.#selection.accept(),
      spotlight: (els) => this.#marks.spotlight(els),
      applyAll: (tokens) => this.#applyAll(tokens),
    });
    this.#reader = new Reader(host, { onChange: (items) => { this.#items = items; this.#marks.set(items); this.#panel.set(items); this.#fix.set(items); this.#selection.refresh(this.#itemOf(this.#selection.el)); this.#offerWalk(); }, onProgress: (p) => { this.#panel.progress(p); this.#fix.progress(p); this.#onProgress?.(p); this.#clearAfterWrite(p); }, enrich: (items) => this.#craft.enrich(items) });
  }

  // A key while blueprint is on (the widget asks only when nothing is pinned or being typed): true when used.
  key(key) {
    if (!this.active) return false;
    if (this.#fix.key(key)) return true;
    if (this.#selection.key(key)) return true;
    // with an element selected, . and , step through its problems
    if (this.#selection.el && (key === '.' || key === ',')) return this.#selection.step(key === '.' ? 1 : -1) || true;
    return this.#panel.key(key);
  }
  // The queue changed: the panel says what each cause becomes.
  refresh() {
    if (this.active) this.#panel.render();
  }
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
    this.#panel.show(true);
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
    clearTimeout(this.#timer);
    this.#glass.off(); // the page is usable again the moment blueprint is let go, not after the fade
    this.#selection.clear();
    this.#changes.discardAll(); // nothing previewed is left on the page
    this.#walk.end();
    this.#layer.removeAttribute('data-on');
    this.#marks.dim('shown');
    this.#marks.clear();
    this.#panel.show(false);
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
    this.#panel.avoid(r, [this.#changes.rect], r ? [] : this.#marks.zones());
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
  #point = (e) => { this.#panel.fold(); this.#marks.point(this.#under(e.clientX, e.clientY)); this.#marks.near(e.clientX, e.clientY); this.#selection.point(e.clientX, e.clientY); this.#glass.cursor(this.#selection.cursor(e.clientX, e.clientY)); };
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
  // Apply from the fix panel: each new token is written to the theme with its class swap (POST token), then every
  // class change Changes holds goes out in one guarded write per file
  async #applyAll(tokens) {
    const refused = [];
    let said = null;
    for (const t of tokens) {
      const s = t.suggest, el = t.els[0], site = el ? await this.#siteOf(el).catch(() => null) : null;
      // a token not written (its place unread, or the server refused it) is said, not folded away as done
      if (!site) { refused.push(t); said ??= 'Couldn’t find where this is written.'; continue; }
      await post('token', { file: s.file, hash: s.hash, name: s.name, value: s.value, why: s.why, then: { file: site.file, hash: site.hash, line: site.line, column: site.column, from: s.then?.from ?? '', to: s.then?.to } })
        .catch((error) => { refused.push(t); said ??= /changed since/i.test(error?.message ?? '') ? 'This file changed after we checked it. Check again.' : error?.message ?? 'Couldn’t add the token.'; });
    }
    if (this.#changes.count) await this.#changes.accept();
    else if (tokens.length > refused.length) this.#host.remember?.();
    // what did not land (a token refused, or a class change still in Changes: stale, or failed): say so
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
        const why = /changed since/i.test(error?.message ?? '') ? 'This file changed after we checked it. Check again.' : error?.message ?? 'Couldn’t apply.';
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

  // The panel's box, for marks that must not sit under it.
  panelRect() {
    return this.active ? this.#panel.rect : null;
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
    this.#panel.show(false);
    this.#layer.hidden = true;
  }
}

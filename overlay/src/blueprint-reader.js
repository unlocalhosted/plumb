/* ─────────────────────────────────────────────────────────
 * BLUEPRINT READER · Plumb overlay
 *
 * What Plumb says about the page's code, computed from source, once, the same way every time
 * (docs/briefs/deterministic-detection.md, docs/briefs/count-from-code.md). The unit is a place in the source (a
 * class site, file:line:column:text), not an element: a component rendered forty times is one place with forty
 * elements, which is what one Apply fixes. The page only says where each place shows.
 *
 *  code       the page's code is the files the page renders: every file a stamp on the page names, and the files
 *             pass-through components' classes are written in (their callers' readings). Every finding at the places
 *             in those files counts, rendered or not (host.readCode). No import walk: a file that appears later (a
 *             section in its own file mounting on scroll, a lazy chunk) joins the count when it appears, and a file
 *             that leaves (a route change) drops out. Where there is no server for it (the docs replay), the places
 *             are those of the rendered elements alone
 *  pool       every element under <body>, from one querySelectorAll in document order: inside an <svg> only what
 *             is stamped (authored JSX: a <text> with a type class; a library's paths are drawing), never the overlay.
 *             No IntersectionObserver, no visibility check, no cap: a hidden tab reads the same page as a shown one
 *  page       stamped elements go to the server as one whole-page request (host.readPage, POST page): where each
 *             stamp resolves and the reading there, cached by file content. Elements that share a stamp and classes
 *             share one answer
 *  element    what the page answer cannot settle is read per element, the way the Alt card reads it (host.readMarks):
 *             elements with no stamp (shared source, located through the owner stack) and pass-through components
 *             whose classes are passed in by the code that uses them (the caller's reading). Every such element is
 *             read, in document order, WAVE at a time; never only those in view
 *  starting   a server still reading the project parks the whole read; it goes again when the server says ready
 *  changes    a class change or new elements, outside the overlay and not on the pinned element (whose inline
 *             previews are the card's own), re-read what changed; a write re-reads every element from that file and
 *             the places of the page's code again; a file that appears on the page joins the code's places
 *  progress   whole-page: { read, total, drift, on, checked, notChecked, outsideSource, notes, places, unrendered,
 *             done }. `total` is the pool, `read` what has landed, `places` the places with something to show,
 *             `drift` the distinct (place, cause) pairs with a new problem (one per place and cause, however many
 *             elements render it; in-code notes and craft notes excluded), `unrendered` the
 *             places no element renders right now, `notes` what the craft rules measured on the page (computed style,
 *             contrast, census: per element, never counted as problems), `done` once the code and every element have
 *             their answer, nothing is in flight, and the page has stopped changing: no rescan pending and no relevant
 *             mutation for QUIET ms (FIRST ms after the reader starts: an app mounting right after a reload must not
 *             be counted as an empty page). Reported only when it changes
 *  order      the items handed on (onChange) are every element with something to show, in document order; a place no
 *             element renders is handed on as { el: null, site, marks } only when the reader was made with
 *             { unrendered: true } (the panel must know how to hold one). Where a mark is drawn is the layer's business
 * ───────────────────────────────────────────────────────── */

import { inCode, isNote } from './blueprint-panel.js';

const WAVE = 128; // per-element readings in flight at once (each is batched by api.js into one round trip per tick)
const PAGE = 1024; // stamped elements per page request; every chunk is sent at once
const THROTTLE = 150;
const RETRY = 5000; // a server that answered starting is asked again at most this often, if it never says ready
const QUIET = 300; // the page must have stopped changing for this long before it is done
const FIRST = 1000; // and for this long after the reader starts (the app may still be mounting)

export class Reader {
  #host; #onChange; #onProgress; #unrendered;
  #items = new Map(); // id → { id, el, stamp, tag, classes, sig, state, marks, dims, file, checked, outsideSource }
  #ids = new WeakMap(); // element → id
  #next = 1;
  #mo = null; #throttle = 0; #retry = 0; #progress = '';
  #running = false;
  #inflight = 0; // readings in flight: page requests and per-element readings alike
  #pending = false; // the server was still starting: the read goes again when it is ready
  #noPage = false; // a server without POST page (older, or the docs' replay): every element is read on its own
  #startedAt = 0; #changedAt = 0; #quiet = 0; // when the reader started, the last relevant mutation, the timer for the quiet window
  // the page's code: the files it renders (their key), and each file's marks
  #codeKey = ''; #codeInflight = 0; #noCode = false; #code = new Map(); // file → { hash, marks }

  // craft: enrich(items) → items, appends each read element's craft findings (craft.js) before the hand-off
  #enrich;
  constructor(host, { onChange, onProgress, enrich, unrendered = false }) {
    this.#host = host;
    this.#onChange = onChange;
    this.#onProgress = onProgress;
    this.#enrich = enrich ?? null;
    this.#unrendered = unrendered;
  }

  start() {
    this.#running = true;
    this.#mo = new MutationObserver((records) => {
      const pinned = this.#host.pinnedElement;
      const relevant = records.some((r) => !r.target.closest?.('plumb-overlay') && r.target !== pinned && (r.type === 'childList' || r.attributeName === 'class' || r.attributeName === 'data-plumb-source'));
      if (relevant) { this.#changed(); this.#throttled(() => this.#scan(true)); }
    });
    this.#mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'open', 'hidden', 'data-plumb-source'] });
    this.#startedAt = performance.now();
    this.#changed();
    this.#scan(false);
  }

  // The page changed: done waits for the quiet window, then reports again.
  #changed() {
    this.#changedAt = performance.now();
    clearTimeout(this.#quiet);
    this.#quiet = setTimeout(() => { this.#quiet = 0; this.#report(); }, Math.max(1, this.#quietUntil() - performance.now() + 1));
  }
  #quietUntil() { return Math.max(this.#startedAt + FIRST, this.#changedAt + QUIET); }

  stop() {
    this.#running = false;
    this.#mo?.disconnect();
    clearTimeout(this.#throttle); this.#throttle = 0;
    clearTimeout(this.#retry); this.#retry = 0;
    clearTimeout(this.#quiet); this.#quiet = 0;
    this.#items.clear();
    this.#ids = new WeakMap(); // the next start registers every element again
    this.#progress = '';
    this.#inflight = 0;
    this.#pending = false;
    this.#codeKey = ''; this.#codeInflight = 0; this.#code.clear();
  }

  // Nothing left to read: the code and every element answered, nothing in flight, nothing parked behind a starting
  // server, and the page quiet (the headless run asks; the readers on screen never need to)
  get settled() {
    if (this.#inflight || this.#codeInflight || !this.#running || this.#pending || this.#throttle) return false;
    if (performance.now() < this.#quietUntil()) return false;
    for (const item of this.#items.values()) if (item.state !== 'ready') return false;
    return true;
  }

  // Draw again from what's already read (the mode turned back on mid-sweep).
  refresh() {
    this.#progress = '';
    this.#report();
  }

  // A write changed a file: everything read from it is read again, fresh, and the code's places with it.
  invalidate({ file }) {
    for (const item of this.#items.values()) if (item.file === file) (item.state = 'queued'), (item.fresh = true);
    this.#codeKey = '';
    this.#read();
  }

  // The server became ready: the read that was parked goes again.
  healthChanged(status) {
    if (status !== 'ready' || !this.#pending) return;
    this.#pending = false;
    clearTimeout(this.#retry); this.#retry = 0;
    this.#codeKey = '';
    this.#read();
  }

  #throttled(fn) {
    if (this.#throttle) return;
    fn();
    this.#throttle = setTimeout(() => {
      this.#throttle = 0;
      fn();
    }, THROTTLE);
  }

  // The pool: every element on the page, in document order; the ones that left the document are forgotten.
  #scan(changed) {
    if (!this.#running) return;
    const t0 = performance.now();
    try { this.#scan_(changed); } finally { performance.measure('plumb:reader-scan', { start: t0 }); }
  }
  #scan_(changed) {
    const pool = document.body.querySelectorAll('*');
    for (const el of pool) {
      // inside an <svg>, only authored JSX (stamped) is read: a <text> with a type class is a decision, a library's paths are drawing
      const stamp = el.getAttribute('data-plumb-source') ?? null;
      if ((el.ownerSVGElement && !stamp) || el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
      const classes = el.getAttribute('class')?.trim() ?? '';
      const sig = `${stamp}|${classes}`;
      let id = this.#ids.get(el);
      if (!id) {
        id = this.#next++;
        this.#ids.set(el, id);
        this.#items.set(id, { id, el, stamp, tag: el.localName, classes, sig, state: 'queued', marks: [], dims: [], file: null, checked: false, outsideSource: false, fresh: false });
      } else if (changed) {
        const item = this.#items.get(id);
        if (item && item.sig !== sig) Object.assign(item, { stamp, classes, sig, state: 'queued', fresh: true });
      }
    }
    for (const [id, item] of this.#items) if (!item.el.isConnected) this.#items.delete(id);
    this.#read();
  }

  // One read of everything queued: the page's code, the stamped elements as whole-page requests, the rest per element.
  #read() {
    if (!this.#running || this.#pending) return;
    this.#readCode();
    this.#readElements();
  }
  #readElements() {
    const queued = [...this.#items.values()].filter((item) => item.state === 'queued');
    if (!queued.length) { this.#report(); return; }
    const t0 = performance.now();
    const paged = this.#noPage ? [] : queued.filter((item) => item.stamp && !item.caller);
    for (const item of queued) item.state = 'reading';
    for (let at = 0; at < paged.length; at += PAGE) this.#page(paged.slice(at, at + PAGE));
    this.#elements(queued.filter((item) => !paged.includes(item)));
    performance.measure('plumb:reader-read', { start: t0 });
  }

  // The files the page renders: every file a stamp names, and every file an element's reading landed in (a
  // pass-through component's caller). Relative to the project, as stamps and readings spell them.
  #files() {
    const files = new Set();
    for (const item of this.#items.values()) {
      const named = item.stamp && /^(.+):\d+:\d+#[a-f0-9]{12}$/.exec(item.stamp)?.[1];
      if (named) files.add(named);
      if (item.state === 'ready' && item.checked && item.file) files.add(item.file);
    }
    return [...files].sort();
  }

  // The page's code, asked once per set of rendered files: every finding at the places in them.
  #readCode() {
    if (this.#noCode) return;
    const files = this.#files(), key = files.join('\n');
    if (key === this.#codeKey) return;
    this.#codeKey = key;
    this.#codeInflight++;
    this.#host.readCode(files)
      .then((answer) => {
        if (!this.#running || key !== this.#codeKey) return;
        if (answer === null) { this.#noCode = true; return; }
        this.#code = new Map(answer.map((file) => [file.file, file]));
      })
      .catch((error) => { if (this.#running && key === this.#codeKey) { this.#codeKey = ''; this.#parked([], error); } })
      .finally(() => { this.#codeInflight--; this.#settle(); });
  }

  // A whole-page request: one answer per (stamp, tag, classes), handed to every element that carries them.
  #page(items) {
    this.#inflight++;
    this.#host.readPage(items.map((item) => ({ el: item.el, stamp: item.stamp, tag: item.tag, classes: item.classes })))
      .then((states) => {
        if (!this.#running) return;
        items.forEach((item, i) => this.#landed(item, states[i]));
      })
      .catch((error) => {
        if (!this.#running) return;
        // no whole-page answer here: each of these elements is read on its own, now and from here on
        if (error?.status === 404) { this.#noPage = true; for (const item of items) if (item.state === 'reading') item.state = 'queued'; this.#elements(items.filter((item) => item.state === 'queued')); return; }
        this.#parked(items, error);
      })
      .finally(() => { this.#inflight--; this.#settle(); });
  }

  // Per-element readings, WAVE in flight at once, in document order; a wave that lands starts the next.
  #elements(items) {
    const queue = [...items];
    const pump = () => {
      while (this.#running && queue.length && this.#inflight < WAVE) {
        const item = queue.shift();
        const fresh = item.fresh; item.fresh = false;
        item.state = 'reading';
        this.#inflight++;
        this.#host.readMarks(item.el, fresh || item.caller === true, { computed: true })
          .then((state) => { if (this.#running) this.#landed(item, state); })
          .catch((error) => { if (this.#running) this.#parked([item], error); })
          .finally(() => { this.#inflight--; pump(); this.#settle(); });
      }
    };
    pump();
  }

  #landed(item, state) {
    if (!this.#items.has(item.id) || item.state !== 'reading') return;
    if (state?.status === 'caller') {
      // a pass-through component: its classes are passed in by the code that uses it; that code is read per element
      item.caller = true; item.state = 'queued';
      this.#elements([item]);
    } else if (state?.status === 'ready') {
      item.state = 'ready';
      item.checked = true; item.outsideSource = false;
      item.file = state.file;
      if (item.file && !this.#code.has(item.file) && !this.#noCode) this.#readCode();
      item.marks = state.marks.filter((m) => m.ledger !== 'exception');
      item.dims = state.dims ?? [];
    } else if (state?.status === 'unplaced') {
      item.state = 'ready'; // nothing to draw, and nothing to retry: Plumb can't place this element
      item.checked = false; item.outsideSource = state.outsideSource === true; item.file = state.file ?? null;
      item.marks = []; item.dims = [];
    } else if (state?.status === 'pending') {
      // a trace still being read by the server: asked again with the next read
      item.state = 'queued';
      clearTimeout(this.#retry);
      this.#retry = setTimeout(() => { this.#retry = 0; this.#read(); }, 250);
    } else this.#parked([item], state);
  }

  // The server is not answering yet (starting) or failed: the read waits for it to say ready, and asks again on its
  // own at most every RETRY ms. Nothing is counted meanwhile.
  #parked(items, why) {
    for (const item of items) if (item.state === 'reading') item.state = 'queued';
    this.#pending = true;
    if (!this.#retry) this.#retry = setTimeout(() => { this.#retry = 0; this.#pending = false; this.#read(); }, RETRY);
    void why;
  }

  // Everything in flight has landed: report once for the whole page (not once per wave).
  #settle() {
    if (this.#inflight || this.#codeInflight) return;
    this.#report();
  }

  // The places: one per class site, from the page's code and from the rendered elements, each with the elements that
  // render it. A place from the code and the same place rendered are one place.
  #places(enriched) {
    const places = new Map();
    // a mark's key is its line and column within its file: the place is the file and that key, so two files' marks
    // at the same line and column are two places, each joined to its own elements
    const add = (mark, file) => {
      const at = mark.file ?? file, id = `${at}|${mark.key}`;
      let place = places.get(id);
      if (!place) places.set(id, (place = { key: mark.key, file: at, site: { file: at, line: mark.line, column: mark.column, text: mark.text }, mark, elements: [] }));
      return place;
    };
    for (const file of this.#code.values()) for (const mark of file.marks) add(mark, file.file);
    for (const item of enriched) for (const mark of item.marks) if (mark.family !== 'craft') add(mark, item.file).elements.push(item.el);
    return places;
  }

  #report() {
    if (!this.#running) return;
    const t0 = performance.now();
    // craft: every read element goes through the craft engine first, so the counts below and the items handed on
    // agree on what is drawn (its marks are appended to the element's own), once over the whole page
    const all = [...this.#items.values()];
    const ready = all.filter((i) => i.state === 'ready').map(({ id, el, marks, dims, file, checked }) => ({ id, el, marks, dims, file, checked }));
    const enriched = this.#enrich ? this.#enrich(ready) : ready;
    const read = ready.length;
    const checked = all.filter((i) => i.state === 'ready' && i.checked).length;
    const notChecked = read - checked;
    const outsideSource = all.filter((i) => i.state === 'ready' && i.outsideSource).length;
    // problems are places in the code, one each however many elements render it; what the craft rules measured on
    // the page are notes, per element, never problems
    const places = this.#places(enriched);
    // drift: distinct (place, cause) pairs, place = file:line:column and cause = rule + class text (what the fix panel
    // groups by), over new marks that are not in-code notes, so the dock and the panel's "N problems" agree
    // (inCode and isNote are the fix panel's own, so its line and the dock say one number)
    const problems = new Set();
    let unrendered = 0, notes = 0;
    const count = (m, file) => { if (m.ledger === 'new' && !inCode(m) && !isNote(m)) problems.add(`${m.file ?? file}:${m.line}:${m.column}|${m.rule}|${m.text}`); };
    for (const file of this.#code.values()) for (const m of file.marks) count(m, file.file);
    for (const i of enriched) for (const m of i.marks) { if (isNote(m)) notes++; else count(m, i.file); }
    for (const place of places.values()) if (!place.elements.length) unrendered++;
    const drift = problems.size;
    const on = all.reduce((n, i) => n + i.dims.length, 0);
    // the places themselves, for whoever asks the host (the headless run, a test): one row per place
    this.#host.placesRead?.([...places.values()].map((p) => ({ key: p.key, file: p.file, line: p.mark.line, column: p.mark.column, text: p.mark.text, rule: p.mark.rule, ledger: p.mark.ledger, elements: p.elements.length })));
    const done = this.settled;
    const key = `${read}/${all.length}/${drift}/${on}/${notChecked}/${outsideSource}/${notes}/${places.size}/${unrendered}/${done}`;
    if (key !== this.#progress) {
      this.#progress = key;
      this.#onProgress?.({ read, total: all.length, drift, on, checked, notChecked, outsideSource, notes, places: places.size, unrendered, done });
    }
    // what to hand on: every element with something to show, in document order; then, when the panel can hold them,
    // the places no element renders, in source order
    const shown = enriched.filter((i) => i.marks.length || i.dims.length).sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (this.#unrendered) {
      const absent = [...places.values()].filter((p) => !p.elements.length).sort((a, b) => a.file.localeCompare(b.file) || a.mark.line - b.mark.line || a.mark.column - b.mark.column);
      for (const p of absent) shown.push({ id: `place:${p.key}`, el: null, site: p.site, file: p.file, marks: [p.mark], dims: [], checked: true });
    }
    this.#onChange?.(shown);
    performance.measure('plumb:reader-report', { start: t0 });
  }
}

/* ─────────────────────────────────────────────────────────
 * BLUEPRINT READER · Plumb overlay
 *
 * What Plumb says about every element on the page, computed from source, once, the same way every time
 * (docs/briefs/deterministic-detection.md). The page only says where each problem shows: the count and the fix list
 * never depend on what was in view, on the window's size, or on the moment they were read.
 *
 *  pool       every element under <body>, from one querySelectorAll in document order: never anything inside an
 *             <svg> (an icon's paths are drawing, not design decisions; the <svg> itself is read), never the overlay.
 *             No IntersectionObserver, no visibility check, no cap: a hidden tab reads the same page as a shown one
 *  page       stamped elements (data-plumb-source) go to the server as one whole-page request (host.readPage, POST
 *             page): where each stamp resolves and the reading there, cached by file content, so a second opening
 *             costs no analysis. Elements that share a stamp and classes share one answer
 *  element    what the page answer cannot settle is read per element, the way the Alt card reads it (host.readMarks):
 *             elements with no stamp (shared source, located through the owner stack) and pass-through components
 *             whose classes are passed in by the code that uses them (the caller's reading). Every such element is
 *             read, in document order, WAVE at a time; never only those in view
 *  starting   a server still reading the project parks the whole read; it goes again when the server says ready
 *  changes    a class change or new elements, outside the overlay and not on the pinned element (whose inline
 *             previews are the card's own), re-read what changed; a write re-reads every element from that file
 *  progress   whole-page: { read, total, drift, on, checked, notChecked, outsideSource, notes, done }. `total` is the
 *             pool, `read` what has landed, `drift` the problems from source, `notes` what the craft rules measured
 *             on the page (computed style, contrast, census: never counted as problems), `done` once every element
 *             has its answer, nothing is in flight, and the page has stopped changing: no rescan pending and no
 *             relevant mutation for QUIET ms (FIRST ms after the reader starts: an app mounting right after a reload
 *             must not be counted as an empty page). Reported only when it changes
 *  order      the items handed on (onChange) are every element with something to show, in document order; where a
 *             mark is drawn is the layer's business, nearest the view first
 * ───────────────────────────────────────────────────────── */

const WAVE = 128; // per-element readings in flight at once (each is batched by api.js into one round trip per tick)
const PAGE = 1024; // stamped elements per page request; every chunk is sent at once
const THROTTLE = 150;
const RETRY = 5000; // a server that answered starting is asked again at most this often, if it never says ready
const QUIET = 300; // the page must have stopped changing for this long before it is done
const FIRST = 1000; // and for this long after the reader starts (the app may still be mounting)

export class Reader {
  #host; #onChange; #onProgress;
  #items = new Map(); // id → { id, el, stamp, tag, classes, sig, state, marks, dims, file, checked, outsideSource }
  #ids = new WeakMap(); // element → id
  #next = 1;
  #mo = null; #throttle = 0; #retry = 0; #progress = '';
  #running = false;
  #inflight = 0; // readings in flight: page requests and per-element readings alike
  #pending = false; // the server was still starting: the read goes again when it is ready
  #startedAt = 0; #changedAt = 0; #quiet = 0; // when the reader started, the last relevant mutation, the timer for the quiet window
  #noPage = false; // a server without POST page (older, or the docs' replay): every element is read on its own

  // craft: enrich(items) → items, appends each read element's craft findings (craft.js) before the hand-off
  #enrich;
  constructor(host, { onChange, onProgress, enrich }) {
    this.#host = host;
    this.#onChange = onChange;
    this.#onProgress = onProgress;
    this.#enrich = enrich ?? null;
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
  }

  // Nothing left to read: nothing in flight, nothing queued, nothing parked behind a starting server
  // (the headless run asks; the readers on screen never need to)
  get settled() {
    if (this.#inflight || !this.#running || this.#pending || this.#throttle) return false;
    if (performance.now() < this.#quietUntil()) return false;
    for (const item of this.#items.values()) if (item.state !== 'ready') return false;
    return true;
  }

  // Draw again from what's already read (the mode turned back on mid-sweep).
  refresh() {
    this.#progress = '';
    this.#report();
  }

  // A write changed a file: everything read from it is read again, fresh.
  invalidate({ file }) {
    for (const item of this.#items.values()) if (item.file === file) (item.state = 'queued'), (item.fresh = true);
    this.#read();
  }

  // The server became ready: the read that was parked goes again.
  healthChanged(status) {
    if (status !== 'ready' || !this.#pending) return;
    this.#pending = false;
    clearTimeout(this.#retry); this.#retry = 0;
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
      if (el.ownerSVGElement || el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
      const stamp = el.getAttribute('data-plumb-source') ?? null;
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

  // One read of everything queued: the stamped elements as whole-page requests, the rest per element.
  #read() {
    if (!this.#running || this.#pending) return;
    const queued = [...this.#items.values()].filter((item) => item.state === 'queued');
    if (!queued.length) { this.#report(); return; }
    const t0 = performance.now();
    const paged = this.#noPage ? [] : queued.filter((item) => item.stamp && !item.caller);
    for (const item of queued) item.state = 'reading';
    for (let at = 0; at < paged.length; at += PAGE) this.#page(paged.slice(at, at + PAGE));
    this.#elements(queued.filter((item) => !paged.includes(item)));
    performance.measure('plumb:reader-read', { start: t0 });
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
    if (this.#inflight) return;
    this.#report();
  }

  #report() {
    if (!this.#running) return;
    const t0 = performance.now();
    // craft: every read element goes through the craft engine first, so the counts below and the items handed on
    // agree on what is drawn (its marks are appended to the element's own), once over the whole page
    const all = [...this.#items.values()];
    const ready = all.filter((i) => i.state === 'ready').map(({ id, el, marks, dims, file, checked }) => ({ id, el, marks, dims, file, checked }));
    const enriched = this.#enrich ? this.#enrich(ready) : ready;
    const marksOf = new Map(enriched.map((i) => [i.id, i.marks]));
    const read = ready.length;
    const checked = all.filter((i) => i.state === 'ready' && i.checked).length;
    const notChecked = read - checked;
    const outsideSource = all.filter((i) => i.state === 'ready' && i.outsideSource).length;
    // problems come from source; what the craft rules measured on the page are notes, never problems
    let drift = 0, notes = 0;
    for (const i of all) for (const m of marksOf.get(i.id) ?? i.marks) {
      if (m.family === 'craft') notes++;
      else if (m.ledger === 'new') drift++;
    }
    const on = all.reduce((n, i) => n + i.dims.length, 0);
    const done = this.settled;
    const key = `${read}/${all.length}/${drift}/${on}/${notChecked}/${outsideSource}/${notes}/${done}`;
    if (key !== this.#progress) {
      this.#progress = key;
      this.#onProgress?.({ read, total: all.length, drift, on, checked, notChecked, outsideSource, notes, done });
    }
    // what to hand on: every element with something to show, in document order
    const shown = enriched.filter((i) => i.marks.length || i.dims.length).sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    this.#onChange?.(shown);
    performance.measure('plumb:reader-report', { start: t0 });
  }
}

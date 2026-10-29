/* ─────────────────────────────────────────────────────────
 * BLUEPRINT READER · Plumb overlay
 *
 * Which elements are on screen, and what Plumb says about each. Every reading is the engine's (host.readMarks: the
 * same findings as the Alt card, without the edits and text the card fetches when it opens).
 *
 *  pool       every element, including unstamped shared source beside stamped app source, never anything inside an
 *             <svg> (an icon's paths are drawing, not design decisions; the <svg> itself is read); watched by one
 *             IntersectionObserver, so only what is in (or near) view is read, nearest the middle first, CAP at most
 *  dedupe     elements that share a stamp (a list's rows) share one reading
 *  waves      readings are started in waves of WAVE, a new wave only once the last has landed, so each wave is one
 *             batched request for its resolves and one for its sites, not a trickle of single questions
 *  retry      a reading that comes back starting or failed is tried again when the server is ready, and after a
 *             backoff (2s, 4s, 8s)
 *  changes    a class change or new elements, outside the overlay and not on the pinned element (whose inline
 *             previews are the card's own), re-read what changed; a write re-reads every element from that file
 *  page       once what is in view has landed and nothing is in flight, the rest of the page is read in the same
 *             waves, off-screen: every element that is rendered (not display:none, not visibility:hidden), PAGE at
 *             most, so a cause counts every place it has on the page, not only those in view. Marks are still drawn
 *             only where they can be seen; scrolling brings the view's elements back to the front of the queue
 *  progress   { read, total, drift, on } for what is in view, reported only when it changes; `on` counts the gaps on
 *             the system, `drift` the new findings. The items handed on (onChange) are everything read, page-wide
 * ───────────────────────────────────────────────────────── */

const WAVE = 128; // readings go to the server in waves: one batched request for the resolves, one for the sites
const CAP = 260;
const PAGE = 2000; // elements read off-screen at most, after the view
const BACKOFF = [2000, 4000, 8000];
const THROTTLE = 150;

export class Reader {
  #host; #onChange; #onProgress;
  #items = new Map(); // id → { id, el, stamp, sig, state, marks, dims, file, tries }
  #ids = new WeakMap(); // element → id
  #byStamp = new Map(); // stamp → Promise<reading>
  #visible = new Set();
  #queue = [];
  #inflight = 0;
  #next = 1;
  #io = null; #mo = null; #throttle = 0; #retry = 0; #progress = '';
  #running = false;
  #offscreen = 0; // elements read off-screen so far

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
    this.#io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = this.#ids.get(e.target);
        if (!id) continue;
        if (e.isIntersecting) this.#visible.add(id);
        else this.#visible.delete(id);
      }
      this.#schedule();
    }, { rootMargin: '80px' });
    this.#mo = new MutationObserver((records) => {
      const pinned = this.#host.pinnedElement;
      const relevant = records.some((r) => !r.target.closest?.('plumb-overlay') && r.target !== pinned && (r.type === 'childList' || r.attributeName === 'class'));
      if (relevant) this.#throttled(() => this.#scan(true));
    });
    this.#mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'open', 'hidden'] });
    this.#scan(false);
  }

  stop() {
    this.#running = false;
    this.#io?.disconnect();
    this.#mo?.disconnect();
    clearTimeout(this.#throttle);
    clearTimeout(this.#retry);
    clearTimeout(this.#settle); this.#settle = 0;
    this.#items.clear();
    this.#ids = new WeakMap(); // the next start registers every element again
    this.#byStamp.clear();
    this.#visible.clear();
    this.#queue = [];
    this.#progress = '';
    this.#offscreen = 0;
  }

  // Nothing left to read: no wave in flight, none about to start, and nothing queued that a wave would still take
  // (the headless run asks; the readers on screen never need to)
  get settled() {
    if (this.#settle || this.#inflight || !this.#running) return false;
    let off = this.#offscreen;
    for (const item of this.#items.values()) {
      if (item.state === 'queued') {
        if (this.#visible.has(item.id)) return false;
        const shown = item.el.isConnected && (item.el.checkVisibility ? item.el.checkVisibility({ visibilityProperty: true }) : true);
        if (shown && off < PAGE) return false;
      } else if (item.state === 'pending' && item.tries < BACKOFF.length) return false;
    }
    return true;
  }

  // Draw again from what's already read (the mode turned back on mid-sweep).
  refresh() {
    this.#progress = '';
    this.#schedule();
  }

  // A write changed a file: everything read from it is read again, fresh.
  invalidate({ file }) {
    for (const [stamp, p] of this.#byStamp) p.then((r) => r?.file === file && this.#byStamp.delete(stamp));
    for (const item of this.#items.values()) if (item.file === file) (item.state = 'queued'), (item.fresh = true);
    this.#schedule();
  }

  // The server became ready: try again everything that came back starting or failed.
  healthChanged(status) {
    if (status !== 'ready') return;
    for (const item of this.#items.values()) if (item.state === 'pending') (item.state = 'queued'), (item.tries = 0);
    this.#schedule();
  }

  #throttled(fn) {
    if (this.#throttle) return;
    fn();
    this.#throttle = setTimeout(() => {
      this.#throttle = 0;
      fn();
    }, THROTTLE);
  }

  // Register the pool's elements with the IntersectionObserver; forget the ones that left the document.
  #scan(changed) {
    if (!this.#running) return;
    const t0 = performance.now();
    try { this.#scan_(changed); } finally { performance.measure('plumb:reader-scan', { start: t0 }); }
  }
  #scan_(changed) {
    const pool = document.body.querySelectorAll('*');
    for (const el of pool) {
      if (el.ownerSVGElement || el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
      const stamp = el.getAttribute('data-plumb-source')?.split('#')[0] ?? null;
      const sig = `${stamp}|${el.getAttribute('class') ?? ''}`;
      let id = this.#ids.get(el);
      if (!id) {
        id = this.#next++;
        this.#ids.set(el, id);
        this.#items.set(id, { id, el, stamp, sig, state: 'queued', marks: [], dims: [], file: null, tries: 0 });
        this.#io.observe(el);
      } else if (changed) {
        const item = this.#items.get(id);
        if (item && item.sig !== sig) (item.sig = sig), (item.state = 'queued'), (item.fresh = true), stamp && this.#byStamp.delete(stamp);
      }
    }
    for (const [id, item] of this.#items) if (!item.el.isConnected) this.#io.unobserve(item.el), this.#items.delete(id), this.#visible.delete(id);
    this.#schedule();
  }

  // Visibility arrives in chunks; a wave starts once they have settled, so one wave holds the whole view.
  #settle = 0;
  #schedule() {
    if (!this.#running) return;
    if (this.#settle) return;
    this.#settle = setTimeout(() => { this.#settle = 0; if (!this.#running) return; const t0 = performance.now(); try { this.#schedule_(); } finally { performance.measure('plumb:reader-schedule', { start: t0 }); } }, 40);
  }
  #schedule_() {
    // what's in view, nearest the middle first, CAP at most
    const mid = innerHeight / 2;
    const order = [...this.#visible]
      .map((id) => this.#items.get(id))
      .filter(Boolean)
      .map((item) => ({ item, d: Math.abs(item.el.getBoundingClientRect().top - mid) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, CAP)
      .map((x) => x.item);
    this.#queue = order.filter((item) => item.state === 'queued');
    // the view is read: the rest of the page, off-screen, in the same waves
    if (!this.#queue.length && !this.#inflight) this.#queue = this.#rest();
    this.#pump();
    this.#report(order);
  }

  // The next wave of the page beyond the view: rendered elements not yet read, in document order.
  #rest() {
    const out = [];
    for (const item of this.#items.values()) {
      if (out.length >= WAVE || this.#offscreen >= PAGE) break;
      if (item.state !== 'queued' || this.#visible.has(item.id)) continue;
      const shown = item.el.isConnected && (item.el.checkVisibility ? item.el.checkVisibility({ visibilityProperty: true }) : true);
      if (!shown) continue;
      out.push(item);
      this.#offscreen++;
    }
    return out;
  }

  #waveAt = 0;
  #pump() {
    // the wave in flight lands first; a wave that never lands (a reading that hangs) does not hold the page hostage
    if (this.#inflight && performance.now() - this.#waveAt < 1500) return;
    if (this.#queue.length) this.#waveAt = performance.now();
    while (this.#running && this.#inflight < WAVE && this.#queue.length) {
      const item = this.#queue.shift();
      if (item.state !== 'queued') continue;
      item.state = 'reading';
      this.#inflight++;
      const fresh = item.fresh;
      item.fresh = false;
      // classes built in code (a cn() helper) are traced in a second pass, so the first count never waits on them
      const computed = item.computed === true;
      let reading = item.stamp && !fresh && !computed ? this.#byStamp.get(item.stamp) : null;
      if (!reading) {
        reading = this.#host.readMarks(item.el, fresh, { computed });
        if (item.stamp && !computed) this.#byStamp.set(item.stamp, reading);
      }
      reading
        .then((state) => {
          if (!this.#running || !this.#items.has(item.id)) return;
          if (state?.status === 'ready' && state.computed && !computed) {
            item.state = 'queued'; item.computed = true; // read again, with its classes traced
          } else if (state?.status === 'ready') {
            item.state = 'ready';
            item.checked = true; item.outsideSource = false;
            item.file = state.file;
            item.marks = state.marks.filter((m) => m.ledger !== 'exception');
            item.dims = state.dims ?? [];
          } else if (state?.status === 'unplaced') {
            item.state = 'ready'; // nothing to draw, and nothing to retry: Plumb can't place this element
            item.checked = false; item.outsideSource = state.outsideSource === true; item.file = state.file;
            item.marks = [];
            item.dims = [];
          } else {
            item.state = 'pending';
            item.marks = [];
            item.dims = [];
            if (item.stamp) this.#byStamp.delete(item.stamp);
            if (item.tries < BACKOFF.length) {
              const wait = BACKOFF[item.tries++];
              clearTimeout(this.#retry);
              this.#retry = setTimeout(() => {
                for (const it of this.#items.values()) if (it.state === 'pending') it.state = 'queued';
                this.#schedule();
              }, wait);
            }
          }
        })
        .catch(() => (item.state = 'pending'))
        .finally(() => {
          this.#inflight--;
          this.#schedule();
        });
    }
  }

  #report(order) {
    // craft: every read element goes through the craft engine first, so the counts below and the items handed on
    // agree on what is drawn (its marks are appended to the element's own)
    const ready = [...this.#items.values()].filter((i) => i.state === 'ready').map(({ id, el, marks, dims, file, checked }) => ({ id, el, marks, dims, file, checked }));
    const enriched = this.#enrich ? this.#enrich(ready) : ready;
    const marksOf = new Map(enriched.map((i) => [i.id, i.marks]));
    const read = order.filter((i) => i.state === 'ready').length;
    const checked = order.filter((i) => i.state === 'ready' && i.checked).length;
    const notChecked = read - checked;
    const outsideSource = order.filter((i) => i.state === 'ready' && i.outsideSource).length;
    // an advisory mark (soft) is shown, but the count is of problems
    const drift = order.reduce((n, i) => n + (marksOf.get(i.id) ?? i.marks).filter((m) => m.ledger === 'new' && !(m.soft && m.family === 'craft')).length, 0);
    const on = order.reduce((n, i) => n + i.dims.length, 0);
    // read/total are the view; done is the whole page: nothing in flight, nothing left that a wave would still take
    const done = this.settled;
    const key = `${read}/${order.length}/${drift}/${on}/${notChecked}/${outsideSource}/${done}`;
    if (key !== this.#progress) {
      this.#progress = key;
      this.#onProgress?.({ read, total: order.length, drift, on, checked, notChecked, outsideSource, done });
    }
    // what to hand on: everything read on the page (the marks draw what is in view; the panel counts it all), in
    // document order
    const shown = enriched.filter((i) => i.marks.length || i.dims.length).sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    this.#onChange?.(shown);
  }
}

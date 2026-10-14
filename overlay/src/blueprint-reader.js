/* ─────────────────────────────────────────────────────────
 * BLUEPRINT READER · Plumb overlay
 *
 * Which elements are on screen, and what Plumb says about each. Every reading is the engine's (host.readMarks: the
 * same findings as the Alt card, without the edits and text the card fetches when it opens).
 *
 *  pool       elements stamped with their source by the dev plugin, else every element; watched by one
 *             IntersectionObserver, so only what is in (or near) view is read, nearest the middle first, CAP at most
 *  dedupe     elements that share a stamp (a list's rows) share one reading
 *  retry      a reading that comes back starting or failed is tried again when the server is ready, and after a
 *             backoff (2s, 4s, 8s)
 *  changes    a class change or new elements, outside the overlay and not on the pinned element (whose inline
 *             previews are the card's own), re-read what changed; a write re-reads every element from that file
 *  progress   { read, total, drift } for what is in view, reported only when it changes
 * ───────────────────────────────────────────────────────── */

const CONCURRENT = 6;
const CAP = 260;
const BACKOFF = [2000, 4000, 8000];
const THROTTLE = 150;

export class Reader {
  #host; #onChange; #onProgress;
  #items = new Map(); // id → { id, el, stamp, sig, state, marks, file, tries }
  #ids = new WeakMap(); // element → id
  #byStamp = new Map(); // stamp → Promise<reading>
  #visible = new Set();
  #queue = [];
  #inflight = 0;
  #next = 1;
  #io = null; #mo = null; #throttle = 0; #retry = 0; #progress = '';
  #running = false;

  constructor(host, { onChange, onProgress }) {
    this.#host = host;
    this.#onChange = onChange;
    this.#onProgress = onProgress;
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
    this.#mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    this.#scan(false);
  }

  stop() {
    this.#running = false;
    this.#io?.disconnect();
    this.#mo?.disconnect();
    clearTimeout(this.#throttle);
    clearTimeout(this.#retry);
    this.#items.clear();
    this.#byStamp.clear();
    this.#visible.clear();
    this.#queue = [];
    this.#progress = '';
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
    const stamped = document.querySelectorAll('[data-plumb-source]');
    const pool = stamped.length ? stamped : document.body.querySelectorAll('*');
    for (const el of pool) {
      if (el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
      const stamp = el.getAttribute('data-plumb-source')?.split('#')[0] ?? null;
      const sig = `${stamp}|${el.getAttribute('class') ?? ''}`;
      let id = this.#ids.get(el);
      if (!id) {
        id = this.#next++;
        this.#ids.set(el, id);
        this.#items.set(id, { id, el, stamp, sig, state: 'queued', marks: [], file: null, tries: 0 });
        this.#io.observe(el);
      } else if (changed) {
        const item = this.#items.get(id);
        if (item && item.sig !== sig) (item.sig = sig), (item.state = 'queued'), (item.fresh = true), stamp && this.#byStamp.delete(stamp);
      }
    }
    for (const [id, item] of this.#items) if (!item.el.isConnected) this.#io.unobserve(item.el), this.#items.delete(id), this.#visible.delete(id);
    this.#schedule();
  }

  #schedule() {
    if (!this.#running) return;
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
    this.#pump();
    this.#report(order);
  }

  #pump() {
    while (this.#running && this.#inflight < CONCURRENT && this.#queue.length) {
      const item = this.#queue.shift();
      if (item.state !== 'queued') continue;
      item.state = 'reading';
      this.#inflight++;
      const fresh = item.fresh;
      item.fresh = false;
      let reading = item.stamp && !fresh ? this.#byStamp.get(item.stamp) : null;
      if (!reading) {
        reading = this.#host.readMarks(item.el, fresh);
        if (item.stamp) this.#byStamp.set(item.stamp, reading);
      }
      reading
        .then((state) => {
          if (!this.#running || !this.#items.has(item.id)) return;
          if (state?.status === 'ready') {
            item.state = 'ready';
            item.file = state.file;
            item.marks = state.marks.filter((m) => m.ledger !== 'exception');
          } else if (state?.status === 'unplaced') {
            item.state = 'ready'; // nothing to draw, and nothing to retry: Plumb can't place this element
            item.marks = [];
          } else {
            item.state = 'pending';
            item.marks = [];
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
    const read = order.filter((i) => i.state === 'ready').length;
    const drift = order.reduce((n, i) => n + i.marks.filter((m) => m.ledger === 'new').length, 0);
    const key = `${read}/${order.length}/${drift}`;
    if (key !== this.#progress) {
      this.#progress = key;
      this.#onProgress?.({ read, total: order.length, drift });
    }
    // what to draw: everything read, in document order
    const shown = order.filter((i) => i.marks.length).sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    this.#onChange?.(shown.map(({ id, el, marks, file }) => ({ id, el, marks, file })));
  }
}

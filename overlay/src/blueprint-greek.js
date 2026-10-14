/* ─────────────────────────────────────────────────────────
 * BLUEPRINT GREEK · Plumb overlay
 *
 * Words become bars. The page's text stays where it is for layout but is painted transparent by the blueprint's host
 * stylesheet; this layer draws a bar for every line of it, so the drawing shows structure and rhythm, not copy.
 *
 *  bars      one rect per line box of every text node in view, as the browser lays it out: the bar is the line's
 *            width, about half its font size tall, centred on the line
 *  weight    a heading's bar is solid white, body text half white, small text fainter: hierarchy without reading
 *  measure   text is measured once per change of the page (a MutationObserver) and at most every 1.5s otherwise, in
 *            document space; frames read it back through the scroll position
 *  footprint none on the host: the bars live in the overlay's shadow root
 * ───────────────────────────────────────────────────────── */

const CAP = 4000;
const STALE = 1500;
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'PLUMB-OVERLAY', 'TEXTAREA', 'OPTION']);

export const GREEK_CSS = `
  .bp svg.greek { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
  .bp svg.greek rect { fill: #fff; }
`;

const NS = 'http://www.w3.org/2000/svg';

export class Greek {
  #svg; #lines = null; #at = 0; #raf = 0; #mo = null; #running = false; #markup = '';

  constructor(layer) {
    this.#svg = document.createElementNS(NS, 'svg');
    this.#svg.setAttribute('class', 'greek');
    this.#svg.setAttribute('aria-hidden', 'true');
    // over the wash, under the marks
    const wash = layer.querySelector('svg.wash');
    if (wash) wash.after(this.#svg); else layer.prepend(this.#svg);
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#mo = new MutationObserver(() => { this.#lines = null; this.invalidate(); });
    // inline style changes (the chooser's previews) are frequent and caught by the staleness re-measure instead
    this.#mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    addEventListener('scroll', this.invalidate, { passive: true, capture: true });
    addEventListener('resize', this.#resized);
    this.invalidate();
  }

  stop() {
    this.#running = false;
    this.#mo?.disconnect();
    this.#mo = null;
    removeEventListener('scroll', this.invalidate, { capture: true });
    removeEventListener('resize', this.#resized);
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#lines = null;
    this.#svg.innerHTML = '';
    this.#markup = '';
  }

  // How many bars are drawn (the tests read it).
  get count() {
    return this.#svg.childElementCount;
  }

  invalidate = () => {
    if (!this.#running || this.#raf) return;
    this.#raf = requestAnimationFrame(() => { this.#raf = 0; this.#render(); });
  };

  #resized = () => { this.#lines = null; this.invalidate(); };

  #measure() {
    const lines = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.textContent.trim() && n.parentElement && !SKIP.has(n.parentElement.tagName) && !n.parentElement.closest('plumb-overlay') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const range = document.createRange();
    for (let n = walker.nextNode(); n && lines.length < CAP; n = walker.nextNode()) {
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const size = parseFloat(cs.fontSize) || 14, weight = parseInt(cs.fontWeight, 10) || 400;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        lines.push({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, size, weight, el });
      }
    }
    return lines;
  }

  #render() {
    if (!this.#running) return;
    if (!this.#lines || performance.now() - this.#at > STALE) (this.#lines = this.#measure()), (this.#at = performance.now());
    const w = innerWidth, h = innerHeight, sx = scrollX, sy = scrollY;
    let markup = '';
    for (const line of this.#lines) {
      const x = line.x - sx, y = line.y - sy;
      if (y + line.h < 0 || y > h || x + line.w < 0 || x > w) continue;
      const bar = Math.min(14, Math.max(3, Math.round(line.size * 0.5)));
      const opacity = (line.weight >= 600 ? 1 : line.weight >= 500 ? 0.8 : 0.55) * (line.size <= 12 ? 0.8 : 1);
      markup += `<rect x="${x.toFixed(1)}" y="${(y + (line.h - bar) / 2).toFixed(1)}" width="${line.w.toFixed(1)}" height="${bar}" rx="${Math.min(2, bar / 2)}" fill-opacity="${opacity}"/>`;
    }
    if (markup !== this.#markup) (this.#svg.innerHTML = markup), (this.#markup = markup);
  }
}

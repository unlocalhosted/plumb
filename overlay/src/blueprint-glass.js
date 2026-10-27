/* ─────────────────────────────────────────────────────────
 * BLUEPRINT GLASS · React Plumber overlay
 *
 * While blueprint is on, the page is something to read, not to use: a stray click must never press a button behind
 * the marks (docs/briefs/blueprint-v2.md, layer 1). A sheet of glass across the viewport, under everything the overlay draws, takes
 * every pointer event, so nothing on the page is pressed or hovered.
 *
 *  scroll    the wheel and trackpad still scroll: the glass hands each wheel to the nearest scrollable element under
 *            the pointer (a board column, a table), or the page; ctrl+wheel stays the browser's zoom
 *  keys      what had focus on the page loses it on the way in, and keys aimed at the page are held back; the
 *            overlay's own keys (Esc, Alt+B, the chooser's) are untouched because they're handled before this
 *  space     holding Space lets the page through for as long as it's held, like a hand tool; the cursor says so
 *  editing   while words are edited in place (text-edit.js) the keys reach them, and the glass has a hole over the words
 *            so a click there moves the caret; a click anywhere else lands on the glass and ends the edit, never on
 *            the page
 *  leaving   every listener and attribute goes with it
 * ───────────────────────────────────────────────────────── */

export const GLASS_CSS = `
  /* the first thing in the shadow root, so the dock, the chooser and the marks all paint above it */
  .glass { position: fixed; inset: 0; pointer-events: auto; cursor: default; }
  .glass[hidden] { display: none; }
  .glass[data-pass], .glass[data-yield] { pointer-events: none; }
`;

const LINE = 16;
const scrollable = (el) => {
  const s = getComputedStyle(el);
  const y = /(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight;
  const x = /(auto|scroll|overlay)/.test(s.overflowX) && el.scrollWidth > el.clientWidth;
  return { x, y };
};

export class Glass {
  #el; #host; #on = false; #passing = false; #cursor = ''; #editing = null;

  constructor(root, host) {
    this.#host = host;
    this.#el = Object.assign(document.createElement('div'), { className: 'glass', hidden: true });
    this.#el.setAttribute('aria-hidden', 'true');
    root.prepend(this.#el); // under everything the overlay draws
    this.#el.addEventListener('wheel', this.#wheel, { passive: false });
    // a click on the glass is a click on the page under it: the blueprint selects what is there (select.js)
    this.#el.addEventListener('click', (e) => { if (this.#pressed) { this.#pressed = false; return; } this.onClick?.(e); });
    // a press the blueprint takes (a drag on a band) is not also a click
    this.#el.addEventListener('pointerdown', (e) => { this.#pressed = !!this.onPress?.(e); });
  }
  onClick = null; onPress = null; #pressed = false;
  // the cursor over the glass: what a press there would do ('' for the default)
  cursor(c) { if (this.#el.style.cursor !== c) this.#el.style.cursor = c; }

  get passing() { return this.#passing; }

  // Run fn with the glass out of the way of hit tests (a caret looked up under a double-click).
  through(fn) {
    if (!this.#on) return fn();
    const prior = this.#el.style.pointerEvents;
    this.#el.style.pointerEvents = 'none';
    try { return fn(); } finally { this.#el.style.pointerEvents = prior; }
  }

  // Words are being edited: rect() gives their box each frame, or null when the edit ends.
  editing(on, rect) {
    if (!on) { this.#editing = null; this.#el.style.removeProperty('clip-path'); return; }
    const hole = () => {
      if (this.#editing !== hole) return;
      const r = rect?.();
      if (r) this.#el.style.setProperty('clip-path', `path(evenodd, "M0 0H${innerWidth}V${innerHeight}H0Z M${r.left - 2} ${r.top - 2}H${r.right + 2}V${r.bottom + 2}H${r.left - 2}Z")`);
      requestAnimationFrame(hole);
    };
    this.#editing = hole;
    hole();
  }

  // Alt-select owns input while it's armed (it swallows the page's clicks itself and reads what's under the
  // pointer), so the glass steps aside for it
  yieldTo(on) { this.#el.toggleAttribute('data-yield', !!on); }

  on() {
    if (this.#on) return;
    this.#on = true;
    this.#el.hidden = false;
    // the page keeps nothing it was focused on: typing can't land in a field behind the marks
    const active = document.activeElement;
    if (active && active !== document.body && !active.closest?.('plumb-overlay')) active.blur();
    addEventListener('keydown', this.#key, true);
    addEventListener('keyup', this.#keyUp, true);
    addEventListener('blur', this.#release);
  }

  off() {
    if (!this.#on) return;
    this.#on = false;
    this.editing(false);
    this.#pass(false);
    this.#el.hidden = true;
    removeEventListener('keydown', this.#key, true);
    removeEventListener('keyup', this.#keyUp, true);
    removeEventListener('blur', this.#release);
  }

  #pass(on) {
    if (on === this.#passing) return;
    this.#passing = on;
    this.#el.toggleAttribute('data-pass', on);
    // the cursor tells the person the page is live while Space is held; nothing is left on <html> afterwards
    const html = document.documentElement;
    if (on) { this.#cursor = html.style.getPropertyValue('cursor'); html.style.setProperty('cursor', 'pointer', 'important'); }
    else { if (this.#cursor) html.style.setProperty('cursor', this.#cursor); else html.style.removeProperty('cursor'); if (!html.style.length) html.removeAttribute('style'); }
    this.#host.toggleAttribute('data-bp-pass', on);
  }

  #release = () => this.#pass(false);

  #ours = (e) => e.composedPath().some((n) => n?.localName === 'plumb-overlay');

  #key = (e) => {
    if (e.defaultPrevented || this.#editing) return;
    if (e.code === 'Space' && !this.#ours(e)) {
      e.preventDefault(); e.stopImmediatePropagation(); // no page scroll, no button press from the space bar
      if (!e.repeat) this.#pass(true);
      return;
    }
    if (this.#passing || this.#ours(e)) return;
    // modifier chords stay with the browser and the overlay (Alt+B is handled before this; ⌘R, ⌘L, ⌘T stay the
    // browser's); plain keys aimed at the page are held back
    if (e.metaKey || e.ctrlKey || e.altKey || ['Escape', 'Tab', 'Shift', 'Meta', 'Control', 'Alt'].includes(e.key)) return;
    e.stopImmediatePropagation();
  };

  #keyUp = (e) => {
    if (this.#editing) return;
    if (e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); this.#pass(false); }
  };

  // Hand the wheel to whatever would have scrolled without the glass: the nearest scrollable element under the
  // pointer in the scroll's direction, else the page.
  #wheel = (e) => {
    if (e.ctrlKey) return; // pinch / ctrl+wheel zoom stays the browser's
    e.preventDefault();
    const scale = e.deltaMode === 1 ? LINE : e.deltaMode === 2 ? innerHeight : 1;
    const dx = e.deltaX * scale, dy = e.deltaY * scale;
    const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => !el.closest('plumb-overlay'));
    for (let el = under; el && el !== document.documentElement && el !== document.body; el = el.parentElement) {
      const can = scrollable(el);
      const wantsY = can.y && dy && (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight);
      const wantsX = can.x && dx && (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth);
      if (wantsX || wantsY) { el.scrollBy({ left: wantsX ? dx : 0, top: wantsY ? dy : 0, behavior: 'instant' }); return; }
    }
    (document.scrollingElement ?? document.documentElement).scrollBy({ left: dx, top: dy, behavior: 'instant' });
  };
}

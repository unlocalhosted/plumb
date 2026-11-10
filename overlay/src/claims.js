/* CLAIMS · many parts preview on one page; what the page shows never depends on the order they started or stopped.
 *
 * A part of the overlay that previews a style on a page element does not write the style and does not remember what
 * was there. It makes a claim at its level: "while I hold this, the element's padding shows 12px". For each element
 * and property there is one row of slots, one per level. The page shows the highest filled slot; when the last claim
 * goes, it shows its own value again, which is remembered once, here, when the first claim arrived.
 *
 *   const claims = new Claims(LEVEL.cleanup);
 *   claims.set(el, 'padding-top', '12px');     // shown now, unless a higher level holds this property
 *   claims.clear(el);                          // this part's claims on el end; whatever is below shows
 *   claims.clear();                            // all of this part's claims end
 *
 * Levels, most direct last (the one the person is acting through wins):
 *   past     the History view of an earlier state
 *   cleanup  a clean-up pass shown on the whole page
 *   fix      a change taken and waiting for Apply, and a new token tried at its places
 *   trial    the fix being tried on the selected element right now
 *   card     an open card's preview
 *   peek     an option pointed at
 *   drag     a value being dragged
 *
 * If the page itself writes the property while it is claimed (a re-render), that becomes the page's own value: the
 * claim still shows, and the page's new value is what comes back when the claims end.
 */
export const LEVEL = { past: 0, cleanup: 1, fix: 2, trial: 3, card: 4, peek: 5, drag: 6 };
const LEVELS = Object.keys(LEVEL).length;

// el → Map<prop, { base: [value, priority], slots: (string|undefined)[], shown: string|null }>
const table = new WeakMap();

function entryOf(el, prop, make) {
  let props = table.get(el);
  if (!props) { if (!make) return null; table.set(el, (props = new Map())); }
  let entry = props.get(prop);
  if (!entry && make) props.set(prop, (entry = { base: [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)], slots: new Array(LEVELS), shown: null }));
  return entry ?? null;
}
// Write what the slots say: the highest filled one, or the page's own value when none is.
function show(el, prop, entry) {
  const now = el.style.getPropertyValue(prop);
  // the page wrote it since we did: that is the page's own value now
  if (entry.shown !== null && now !== entry.shown) entry.base = [now, el.style.getPropertyPriority(prop)];
  let top;
  for (let level = LEVELS - 1; level >= 0 && top === undefined; level--) top = entry.slots[level];
  if (top !== undefined) {
    if (now !== top || el.style.getPropertyPriority(prop) !== 'important') el.style.setProperty(prop, top, 'important');
    entry.shown = el.style.getPropertyValue(prop); // as the browser spells it, so the page's own writes can be told apart
    return;
  }
  const [value, priority] = entry.base;
  if (value) el.style.setProperty(prop, value, priority); else el.style.removeProperty(prop);
  table.get(el).delete(prop);
  if (!table.get(el).size) table.delete(el);
  if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
}

/** One part's claims, all at its level. */
export class Claims {
  #level; #held = new Map(); // el → Set<prop>
  constructor(level) { this.#level = level; }
  get size() { return this.#held.size; }
  has(el) { return this.#held.has(el); }
  elements() { return [...this.#held.keys()]; }
  set(el, prop, value) {
    const entry = entryOf(el, prop, true);
    entry.slots[this.#level] = String(value);
    if (!this.#held.has(el)) this.#held.set(el, new Set());
    this.#held.get(el).add(prop);
    show(el, prop, entry);
  }
  /** End this part's claim on one property of one element. */
  unset(el, prop) {
    const props = this.#held.get(el), entry = props?.has(prop) ? entryOf(el, prop, false) : null;
    if (!entry) return;
    entry.slots[this.#level] = undefined;
    show(el, prop, entry);
    props.delete(prop);
    if (!props.size) this.#held.delete(el);
  }
  /** End this part's claims on one element, or on all of them. */
  clear(el) {
    for (const [held, props] of el ? [[el, this.#held.get(el) ?? []]] : this.#held) {
      for (const prop of props) {
        const entry = entryOf(held, prop, false);
        if (!entry) continue;
        entry.slots[this.#level] = undefined;
        show(held, prop, entry);
      }
      this.#held.delete(held);
    }
  }
}

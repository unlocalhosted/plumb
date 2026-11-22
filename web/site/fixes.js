/* The fixes a visitor has made, for their visit. Each is one Plumber found on this page and confirmed by reading the
 * page again with it made (scripts/findings.mjs → findings.json). They are CSS rules in one stylesheet, not inline
 * styles, so a part that draws again (a replay, a carousel, coming back to the page) is still fixed. The few that
 * are attributes are put back on whatever is drawn. Nothing is written anywhere but this tab. */
import record from './findings.json';

const AT = `plumber:fixed:${record.recorded}`;
export const ITEMS = record.items;
export const TOTAL = record.total;

// a fix this browser can't draw isn't offered, and isn't counted as made (a squircle needs corner-shape)
const draws = ({ make }) => Object.entries(make.css ?? {}).every(([k, v]) => !k.startsWith('corner-') || CSS.supports(k, v));

export class Fixes {
  #made = new Map(); #style; #seen; #frame = 0; #able;

  constructor() {
    this.#able = ITEMS.map(draws);
    try { for (const [i, was] of JSON.parse(sessionStorage.getItem(AT)) ?? []) if (this.#able[i]) this.#made.set(i, was); } catch {}
    this.#style = Object.assign(document.createElement('style'), { id: 'plumber-fixes' });
    document.head.append(this.#style);
    this.#seen = new MutationObserver(() => {
      if (!this.#made.size || this.#frame) return;
      this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#attrs(); });
    });
    this.#seen.observe(document.body, { childList: true, subtree: true });
    this.#write();
  }

  has(i) { return this.#made.has(i); }
  get left() { return TOTAL - this.#made.size; }
  /** What can still be fixed here: all, or one toy's. */
  open(toy) { return ITEMS.map((item, i) => i).filter((i) => this.#able[i] && !this.#made.has(i) && (!toy || ITEMS[i].toy === toy)); }
  /** How many of a toy's are here at all. */
  of(toy) { return ITEMS.filter((item, i) => this.#able[i] && item.toy === toy).length; }

  make(list) {
    for (const i of list) {
      if (this.#made.has(i)) continue;
      const { sel, make } = ITEMS[i];
      // a fix said as "take 7px off" keeps the number it took it off
      const el = make.was ? document.querySelector(sel[0]) : null;
      this.#made.set(i, el ? parseFloat(getComputedStyle(el).getPropertyValue(make.was)) : 0);
    }
    this.#write();
    try { sessionStorage.setItem(AT, JSON.stringify([...this.#made])); } catch {}
  }

  #write() {
    const rules = [];
    for (const [i, was] of this.#made) {
      const { sel, make } = ITEMS[i];
      if (!make.css || (make.was && !was)) continue;
      const body = Object.entries(make.css).map(([k, v]) => `${k}: ${v.replace('var(--was)', `${was}px`)} !important`).join('; ');
      for (const s of sel) rules.push(`${make.inside ? `${s} ${make.inside}` : s} { ${body} }`);
    }
    this.#style.textContent = rules.join('\n');
    this.#attrs();
  }

  #attrs() {
    for (const i of this.#made.keys()) {
      const { sel, make } = ITEMS[i];
      if (!make.attr) continue;
      for (const s of sel) {
        const host = document.querySelector(s);
        if (!host) continue;
        for (const el of make.inside ? host.querySelectorAll(make.inside) : [host]) {
          for (const [k, v] of Object.entries(make.attr)) {
            const words = el.textContent.trim(), now = el.getAttribute(k) ?? '';
            const next = v.includes(`{${k}}`) && now.startsWith(words) ? now : v.replace('{text}', words).replace(`{${k}}`, now);
            if (now !== next) el.setAttribute(k, next);
          }
        }
      }
    }
  }

  destroy() { this.#seen.disconnect(); cancelAnimationFrame(this.#frame); this.#style.remove(); }
}

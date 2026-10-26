/* ─────────────────────────────────────────────────────────
 * BLUEPRINT PANEL · React Plumber overlay
 *
 * The drift in view, grouped by cause, in a panel docked on the right (docs/briefs/blueprint-v2.md, layer 3).
 * Clicking mark by mark doesn't scale; twenty cards with the same p-[10px] are one decision, so they are one row.
 *
 *  group      one row per cause: the same class under the same rule (p-[10px] off the spacing scale). The row says
 *             the class, what is wrong with it in words, how many places carry it and from how many source lines.
 *             Rows run by places, most first: the first row is the decision that closes the most
 *  page       a cause counts its places on the whole page, read beyond the view (blueprint-reader.js), not only
 *             those in view; the dock still says what is off in view
 *  select     J/K or the arrows move between rows (or a click). The selected row's places are outlined on the page,
 *             and when none of them can be seen (off the view, or behind the panel) the page scrolls the first into
 *             the middle of the free area left of the panel, through whichever scroll containers hold it (a board's
 *             horizontal scroller, the page). N walks to the next place the same way and Shift+N back,
 *             with the row saying which place of how many (3 of 20)
 *  fix        Enter (or Fix all) opens the chooser for the whole group at its first place in view: one pick is made
 *             at every place, and Write sends each source line's edit once, one apply per file (blueprint-fix.js)
 *  picked     a row whose places are all picked says what they become; written rows leave with their marks
 *  pointed    pointing at a row outlines its places, the way selecting does, until the pointer leaves
 *  fold       at rest the panel is one line in the top-right corner (71 off · 6 causes), so the page stays in view.
 *             It opens to the list, only as tall as its rows, on J/K, a key below, pointing at it or a click, and
 *             folds back when the pointer goes back to the page, on Esc, or on a second click
 *  in code    drift the overlay can't fix here (an inline style, a value from config) is one quiet count at the foot
 *  states     reading (the header counts the readings), empty (no drift in view: everything uses the system),
 *             and the rows as they arrive. Nothing here writes to the page; the panel is the overlay's own card
 *
 * Keys arrive through the widget, only while blueprint is on, nothing is pinned and nothing is being typed:
 *   J ↓  next   K ↑  previous   N  next place   Enter  fix the group
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';

export const PANEL_CSS = `
  .bpp { position: fixed; inset-inline-end: var(--pl-space-6); inset-block-start: var(--pl-space-6); max-height: calc(100vh - 2 * var(--pl-space-6) - var(--pl-tag-h) - 18px);
    width: 300px; max-width: calc(100vw - 2 * var(--pl-space-6)); display: flex; flex-direction: column; box-sizing: border-box; pointer-events: auto;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); color: var(--pl-ink);
    opacity: 0; translate: 8px 0; transition: opacity var(--pl-dur-undim) var(--pl-ease-out), translate var(--pl-dur-undim) var(--pl-ease-out); }
  .bpp[hidden] { display: none; }
  .bpp[data-on] { opacity: 1; translate: 0 0; transition-duration: var(--pl-dur-card); }
  @media (prefers-reduced-motion: reduce) { .bpp { transition: none; translate: 0 0; } }
  .bpp .head { all: unset; flex: none; display: flex; align-items: center; gap: var(--pl-space-4); box-sizing: border-box; padding: var(--pl-space-4) var(--pl-space-5); cursor: pointer; border-radius: var(--pl-radius-card); }
  .bpp .head:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: -2px; }
  .bpp .head .title { font: var(--pl-card-title); }
  .bpp .head .meta { font: var(--pl-card-meta); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bpp .head .chev { margin-inline-start: auto; width: 10px; height: 10px; color: var(--pl-ink-2); transition: rotate var(--pl-dur-feedback) var(--pl-ease-out); }
  /* folded: one line, as wide as its words */
  .bpp:not([data-open]) { width: auto; }
  .bpp:not([data-open]) :is(.rows, .foot, .head .title, .head .more) { display: none; }
  .bpp[data-open] .head { flex-wrap: wrap; row-gap: var(--pl-space-1); border-bottom: 1px solid var(--pl-rule); border-radius: var(--pl-radius-card) var(--pl-radius-card) 0 0; }
  .bpp[data-open] .head .title { flex: 1 0 auto; }
  .bpp[data-open] .head .meta { order: 3; flex-basis: 100%; }
  .bpp[data-open] .head .chev { rotate: 180deg; }
  @media (hover: hover) and (pointer: fine) { .bpp:not([data-open]) .head:hover { background: var(--pl-paper-2); } }
  .bpp .head .meta .off { color: var(--pl-off); font-weight: 600; }
  .bpp .rows { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--pl-space-2); margin: 0; list-style: none; }
  .bpp .row { all: unset; display: grid; grid-template-columns: 8px 1fr auto; column-gap: var(--pl-space-4); row-gap: 1px; align-items: baseline;
    width: 100%; box-sizing: border-box; padding: var(--pl-space-3) var(--pl-space-4); border-radius: var(--pl-radius-row); cursor: pointer; }
  .bpp .row .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pl-off); align-self: center; }
  .bpp .row .dot.soft { background: var(--pl-soft); } .bpp .row .dot.picked { background: var(--pl-on); }
  .bpp .row code { font: var(--pl-card-code); color: var(--pl-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .bpp .row code .to { color: var(--pl-on); }
  .bpp .row .n { font: var(--pl-card-code); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; }
  .bpp .row .what { grid-column: 2 / -1; font: var(--pl-card-meta); color: var(--pl-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (hover: hover) and (pointer: fine) { .bpp .row:hover { background: var(--pl-paper-2); } }
  .bpp .row:focus-visible { outline: 2px solid var(--pl-accent); outline-offset: -2px; }
  .bpp .row:active { background: var(--pl-paper-2); }
  .bpp .row[aria-current="true"] { background: var(--pl-paper-2); box-shadow: inset 2px 0 0 var(--pl-accent); }
  .bpp .row .acts { grid-column: 2 / -1; display: none; gap: var(--pl-space-3); margin-top: var(--pl-space-3); }
  .bpp .row[aria-current="true"] .acts { display: flex; }
  .bpp .row .acts span { font: var(--pl-text-label); letter-spacing: var(--pl-tracking-label); padding: 3px var(--pl-space-4); border-radius: var(--pl-radius-tag); }
  .bpp .row .acts .fix { background: var(--pl-action-soft); color: var(--pl-on-action); }
  .bpp .row .acts .next { color: var(--pl-ink-2); box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .bpp .empty { padding: var(--pl-space-6) var(--pl-space-5); font: var(--pl-card-body); color: var(--pl-ink-2); }
  .bpp .empty b { display: block; font: var(--pl-card-title); color: var(--pl-ink); margin-bottom: var(--pl-space-1); }
  .bpp .foot { flex: none; display: flex; align-items: center; gap: var(--pl-space-5); padding: var(--pl-space-4) var(--pl-space-5); border-top: 1px solid var(--pl-rule); font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .bpp .foot .code { margin-inline-end: auto; }
  .bpp .foot .code[hidden] + .keys { margin-inline-start: auto; }
  .bpp .foot kbd { font: 500 10px/13px var(--pl-mono); color: var(--pl-ink-2); }
`;

// What is wrong with a class, in words: the kind of finding in its family.
const NOUN = { spacing: 'spacing off the scale', radius: 'corner off the scale', type: 'text size or weight off the scale', color: 'raw colour', elevation: 'hand-written shadow', shadow: 'hand-written shadow', z: 'z-index off the scale', motion: 'timing off the scale' };
const whatOf = (mark) => mark.family === 'craft' ? (mark.what ?? 'craft') /* craft: the rule's own noun (craft.js) */ : /framework/.test(mark.rule) ? 'Tailwind default, not your theme' : /tier/.test(mark.rule) ? 'raw token where a named one is wanted'
  : /by-value|matches/.test(mark.rule) ? 'matches a token without using it' : /existence/.test(mark.rule) ? 'undefined variable' : (NOUN[mark.family] ?? `${mark.family} off the scale`);
const soft = (mark) => /framework|tier|by-value|matches/.test(mark.rule);
const inCode = (mark) => /opaque-inline|^config\//.test(mark.rule);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Whether some container (or the page) could scroll an element into the free area: a fixed header's avatar can't.
function movable(el, free) {
  const r = el.getBoundingClientRect();
  const dx = r.left + r.width / 2 - (free.left + free.right) / 2, dy = r.top + r.height / 2 - (free.top + free.bottom) / 2;
  const page = document.scrollingElement ?? document.documentElement;
  let x = Math.abs(dx) < 1 || (r.left > free.left && r.right < free.right), y = Math.abs(dy) < 1 || (r.top > free.top && r.bottom < free.bottom);
  for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement && !(x && y); a = a.parentElement) {
    if (getComputedStyle(a).position === 'fixed') return x && y;
    x ||= scrolls(a, 'x'); y ||= scrolls(a, 'y');
  }
  return (x || page.scrollWidth > page.clientWidth) && (y || page.scrollHeight > page.clientHeight);
}
// The place to show for a cause: one already seen, else one that can be scrolled into view, else the first.
const placeOf = (members, free) => members.find((m) => inFree(m.el, free)) ?? members.find((m) => movable(m.el, free)) ?? members[0];

// The part of the view the page can be seen in: left of the panel.
const freeOf = (panel) => ({ left: 0, top: 0, right: panel ? panel.left - 8 : innerWidth, bottom: innerHeight });
const inFree = (el, free) => { const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return r.width > 0 && cx > free.left && cx < free.right && cy > free.top && cy < free.bottom; };
const scrolls = (el, axis) => { const s = getComputedStyle(el); const o = axis === 'x' ? s.overflowX : s.overflowY; return /(auto|scroll|overlay)/.test(o) && (axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight); };

// The drift in items grouped by cause: [{ key, text, what, soft, members: [{ el, mark, id, item }], lines }], most
// places first, and how many are set in code.
export function groupsOf(items) {
  const groups = new Map();
  let code = 0;
  for (const item of items) item.marks.forEach((mark, k) => {
    if (mark.ledger !== 'new') return;
    if (inCode(mark)) { code++; return; }
    const text = mark.text ?? mark.props?.join(' ') ?? mark.rule;
    const key = `${mark.rule}|${text}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, text, what: whatOf(mark), soft: soft(mark), members: [], stamps: new Set() }));
    g.members.push({ el: item.el, mark, id: `${item.id}:${k}:${mark.key}`, item });
    g.stamps.add(item.el.getAttribute('data-plumb-source')?.split('#')[0] ?? `${item.id}`);
  });
  const list = [...groups.values()].sort((a, b) => b.members.length - a.members.length || a.text.localeCompare(b.text));
  for (const g of list) g.lines = g.stamps.size;
  return { groups: list, code };
}

export class Panel {
  #el; #host; #marks; #open = false; #openedAt = 0; #groups = []; #code = 0; #progress = null; #at = null; #place = 0; #pointed = null; #on = false;

  // host: choose(el, mark, id, { group }), fixState(el, mark); marks: the MarkLayer (spotlight)
  constructor(root, { host, marks }) {
    this.#host = host;
    this.#marks = marks;
    this.#el = Object.assign(document.createElement('aside'), { className: 'bpp', hidden: true });
    this.#el.setAttribute('aria-label', 'Drift in view, by cause');
    this.#el.innerHTML = '<button class="head" type="button" aria-expanded="false"><span class="title">Drift in view</span><span class="meta" role="status"></span><svg class="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button><ul class="rows" role="list"></ul><div class="foot"><span class="code" hidden></span><span class="keys" aria-hidden="true"><kbd>J</kbd> <kbd>K</kbd> move · <kbd>↵</kbd> fix · <kbd>N</kbd> next place</span></div>';
    root.append(this.#el);
    const rows = this.#el.querySelector('.rows');
    rows.addEventListener('click', (e) => {
      const row = e.target.closest?.('.row');
      if (!row) return;
      const act = e.target.closest?.('[data-act]')?.dataset.act;
      this.select(row.dataset.key);
      if (act === 'fix') this.fix();
      else if (act === 'next') this.next();
    });
    rows.addEventListener('pointerover', (e) => { const row = e.target.closest?.('.row'); if (row && row.dataset.key !== this.#pointed) (this.#pointed = row.dataset.key), this.#light(); });
    rows.addEventListener('pointerleave', () => { this.#pointed = null; this.#light(); });
    // pointing opens the list, so the click that follows must not fold it again: a click folds only a list that was
    // already open
    this.#el.querySelector('.head').addEventListener('click', () => this.open(!this.#open || performance.now() - this.#openedAt < 400));
    this.#el.addEventListener('pointerenter', () => this.open(true));
  }

  get rect() { return this.#on ? this.#el.getBoundingClientRect() : null; }

  // Unfolded to the list, or folded to its one line.
  open(on) {
    if (on === this.#open || !this.#on) return;
    this.#open = on;
    if (on) this.#openedAt = performance.now();
    this.#el.toggleAttribute('data-open', on);
    this.#el.querySelector('.head').setAttribute('aria-expanded', String(on));
  }
  // The pointer went back to the page: the list folds.
  fold() {
    if (this.#open && !this.#el.matches(':hover')) this.open(false);
  }

  show(on) {
    this.#on = on;
    if (on) { this.#el.hidden = false; requestAnimationFrame(() => this.#on && this.#el.setAttribute('data-on', '')); }
    else { this.open(false); this.#el.removeAttribute('data-on'); this.#el.hidden = true; this.#at = null; this.#pointed = null; this.#groups = []; this.#progress = null; this.#marks.spotlight([]); }
  }

  // The reader's items changed, or the queue did: regroup and redraw, keeping the selection by its cause.
  set(items) {
    ({ groups: this.#groups, code: this.#code } = groupsOf(items));
    if (this.#at && !this.#groups.some((g) => g.key === this.#at)) this.#at = null;
    this.render();
  }
  progress(p) {
    this.#progress = p;
    this.render();
  }

  // Keys from the widget; true when the panel used it.
  key(key) {
    if (!this.#on) return false;
    if (key === 'Escape' && this.#open) return this.open(false), true;
    if (!this.#groups.length) return false;
    if (/^[jJkKnN]$|^Arrow(Up|Down)$|^Enter$/.test(key)) this.open(true);
    if (key === 'j' || key === 'J' || key === 'ArrowDown') return this.move(1), true;
    if (key === 'k' || key === 'K' || key === 'ArrowUp') return this.move(-1), true;
    if (key === 'n' && this.#at) return this.next(1), true;
    if (key === 'N' && this.#at) return this.next(-1), true; // Shift+N: back
    if (key === 'Enter' && this.#at) return this.fix(), true;
    return false;
  }

  move(dir) {
    const at = this.#groups.findIndex((g) => g.key === this.#at);
    const to = this.#groups[at < 0 ? (dir > 0 ? 0 : this.#groups.length - 1) : Math.min(this.#groups.length - 1, Math.max(0, at + dir))];
    if (to) this.select(to.key);
  }

  select(key) {
    const g = this.#groups.find((x) => x.key === key);
    if (!g) return;
    if (this.#at !== key) this.#place = 0;
    this.#at = key;
    this.render();
    this.#el.querySelector(`.row[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest' });
    // the page goes to the cause when none of it is in view
    const free = freeOf(this.rect);
    const at = placeOf(g.members, free);
    if (!inFree(at.el, free)) this.#reveal(at.el);
  }

  // The next (or, with -1, the previous) place of the selected cause, anywhere on the page, brought to the middle
  // of the free area; the row says which one of how many.
  next(dir = 1) {
    const g = this.#group();
    if (!g) return;
    const n = g.members.length;
    this.#place = (this.#place + dir + n) % n;
    this.#reveal(g.members[this.#place].el);
    this.render();
  }

  // The chooser for the whole cause, at its first place in view.
  fix() {
    const g = this.#group();
    if (!g) return;
    const free = freeOf(this.rect);
    const at = placeOf(g.members, free);
    if (!inFree(at.el, free)) this.#reveal(at.el);
    this.#host.choose(at.el, at.mark, at.id, { group: g.members.map(({ el, mark, id }) => ({ el, mark, id })) });
  }

  #group() { return this.#groups.find((g) => g.key === this.#at) ?? null; }
  // Bring an element to the middle of the free area: the nearest container that scrolls each way takes that way's
  // distance, else the page does.
  #reveal(el) {
    const free = freeOf(this.rect), r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (free.left + free.right) / 2, dy = r.top + r.height / 2 - (free.top + free.bottom) / 2;
    const behavior = still() ? 'instant' : 'smooth';
    let sx = null, sy = null;
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (!sx && Math.abs(dx) > 1 && scrolls(a, 'x')) sx = a;
      if (!sy && Math.abs(dy) > 1 && scrolls(a, 'y')) sy = a;
    }
    const page = document.scrollingElement ?? document.documentElement;
    if (sx === sy && sx) sx.scrollBy({ left: dx, top: dy, behavior });
    else {
      (sx ?? page).scrollBy({ left: dx, top: 0, behavior });
      (sy ?? page).scrollBy({ left: 0, top: dy, behavior });
    }
  }
  #light() {
    const g = this.#groups.find((x) => x.key === (this.#pointed ?? this.#at));
    this.#marks.spotlight(g ? [...new Set(g.members.map((m) => m.el))] : []);
  }

  render() {
    if (!this.#on) return;
    const p = this.#progress, off = this.#groups.reduce((n, g) => n + g.members.length, 0);
    // never "all on the system" while some of the view could not be checked
    const unchecked = p?.notChecked ? `${p.notChecked} not checked${p.outsideSource ? ' · outside source' : ''}` : '';
    const meta = !p || !p.total ? 'Reading…' : p.read < p.total ? `Reading ${p.read} of ${p.total}…`
      : off + this.#code ? `<span class="off">${off + this.#code} off<span class="more"> on this page</span></span> · ${plural(this.#groups.length, 'cause')}<span class="more">${this.#code ? ` · ${this.#code} set in code` : ''}${unchecked ? ` · ${unchecked}` : ''}</span>`
      : unchecked || 'All on the system';
    const metaEl = this.#el.querySelector('.meta');
    if (metaEl.innerHTML !== meta) metaEl.innerHTML = meta;
    const rows = this.#groups.map((g) => {
      const states = g.members.map((m) => this.#host.fixState(m.el, m.mark));
      const to = states.every((s) => s?.kind === 'picked' || s?.kind === 'written') ? states[0]?.to : null;
      const current = g.key === this.#at;
      const where = `${plural(g.members.length, 'place')}${g.lines < g.members.length ? ` · ${plural(g.lines, 'line')}` : ''}`;
      return `<li><button class="row" type="button" data-key="${esc(g.key)}"${current ? ' aria-current="true"' : ''} aria-label="${esc(`${g.text}: ${g.what}, ${where}${to ? `, picked ${to}` : ''}`)}">`
        + `<span class="dot${to ? ' picked' : g.soft ? ' soft' : ''}"></span><code>${esc(g.text)}${to ? ` <span class="to">→ ${esc(to)}</span>` : ''}</code><span class="n">${g.members.length}</span>`
        + `<span class="what">${esc(g.what)} · ${esc(where)}</span>`
        + `<span class="acts"><span class="fix" data-act="fix">Fix ${g.members.length === 1 ? '' : 'all '}↵</span>${g.members.length > 1 ? `<span class="next" data-act="next">${current ? `${this.#place + 1} of ${g.members.length} · ` : ''}Next N</span>` : ''}</span></button></li>`;
    }).join('');
    const empty = !(p?.total && p.read === p.total) ? '' : p.notChecked
      ? `<li class="empty"><b>No drift found</b>${plural(p.notChecked, 'element')} could not be checked${p.outsideSource ? ': their source is outside this project' : ''}.</li>`
      : '<li class="empty"><b>No drift in view</b>Everything here uses your system.</li>';
    const list = this.#el.querySelector('.rows');
    const html = rows || empty;
    if (list.innerHTML !== html) {
      const focused = list.contains(this.#el.getRootNode().activeElement) ? this.#el.getRootNode().activeElement?.dataset.key : null;
      list.innerHTML = html;
      if (focused) list.querySelector(`.row[data-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    }
    const code = this.#el.querySelector('.foot .code');
    code.hidden = !this.#code;
    code.textContent = this.#code ? `Set in code · ${this.#code}` : '';
    code.title = 'Drift written as an inline style or in config: fix it in the source';
    this.#light();
  }
}

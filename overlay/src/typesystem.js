/* ─────────────────────────────────────────────────────────
 * TEXT STYLES · React Plumber overlay (docs/design/system-proposal.md)
 *
 * The type proposal in the fix panel: the handful of text styles the code is reaching for (server: POST system, a
 * `system/type-roles` proposal), drawn as a ladder, with what moving to them costs and one action. People see "text
 * styles", named in plain words; the code names (type-body-large) appear only where code is shown.
 *
 *  line     at rest, before the fixes: "Your text uses 34 sizes. 8 styles would cover it.   Review ↵"
 *  ladder   one row per style, largest first: "Ag" drawn as the style, its name, its numbers, its places, and a thin
 *           bar of what moving costs (unchanged / 1px or less / more)
 *  cost     one sentence under the ladder
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { FIX } from './words.js';

export const TYPE_CSS = `
  .fx .styles { padding: 12px 8px 4px 14px; }
  .fx .styles .head { display: flex; align-items: baseline; gap: 8px; padding-right: 6px; }
  .fx .styles .head b { font-weight: 600; }
  .fx .styles .head span { color: #8b8a85; }
  .fx .ladder { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 1px; max-height: min(46vh, 360px); overflow-y: auto; overscroll-behavior: contain; }
  .fx .ladder li { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; min-height: 40px; padding: 4px 8px 4px 4px; border-radius: 10px; cursor: default; }
  .fx .ladder li[aria-selected="true"] { background: rgb(0 0 0 / .045); }
  .fx .ladder .ag { font-family: inherit; line-height: 1; color: #1c1b19; text-align: center; white-space: nowrap; overflow: hidden; }
  .fx .ladder .name { font-weight: 550; }
  .fx .ladder .nums { display: block; color: #8b8a85; font-size: 12px; font-variant-numeric: tabular-nums; }
  .fx .ladder .n { color: #55544f; font-variant-numeric: tabular-nums; text-align: right; }
  .fx .ladder .bar { display: flex; width: 64px; height: 4px; margin-top: 5px; border-radius: 2px; overflow: hidden; background: rgb(0 0 0 / .06); }
  .fx .ladder .bar i { display: block; height: 100%; }
  .fx .ladder .bar .same { background: #c9c7c0; } .fx .ladder .bar .small { background: #8b8a85; } .fx .ladder .bar .more { background: #ff1f8f; }
  .fx .styles .cost { margin: 10px 6px 4px 4px; color: #55544f; max-width: 56ch; }
  .fx .styles + .where { margin: 0 14px 6px 18px; color: #8b8a85; font-size: 12px; }
  .fx .styles .outside { margin: 2px 6px 6px 4px; color: #8b8a85; font-size: 12px; }
    .fx[data-scheme="dark"] .ladder .ag { color: #f1f0ec; } .fx[data-scheme="dark"] .ladder li[aria-selected="true"] { background: rgb(255 255 255 / .07); }
`;

// a style's name in plain words, from its role (display/headline/title/body/label × large/medium/small): the largest
// of its group present is the group's own name, the next ones "small"
const GROUP = { display: 'Display', headline: 'Headline', title: 'Title', body: 'Body', label: 'Label' };
export function namesOf(roles) {
  const names = new Map(), byGroup = new Map();
  for (const r of roles) { const g = r.name.split('-')[0]; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(r); }
  for (const [g, list] of byGroup) list.sort((a, b) => px(b.bundle) - px(a.bundle)).forEach((r, i) => names.set(r.name, `${GROUP[g] ?? g}${i ? ' small' : ''}${i > 1 ? 'er' : ''}`));
  return names;
}
// the size in px: a number, or a fluid clamp(min, preferred, max) read at its largest
function px(bundle) {
  if (Number.isFinite(bundle?.size)) return bundle.size;
  const m = /clamp\(\s*([\d.]+)(rem|px)[^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(bundle?.sizeText ?? '');
  return m ? Number(m[3]) * (m[4] === 'rem' ? 16 : 1) : 16;
}
// a style's numbers, as a person reads them: "16px · 1.6 line height", a fluid size as its range
function numsOf(bundle) {
  const m = /clamp\(\s*([\d.]+)(rem|px)[^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(bundle.sizeText ?? '');
  const size = m ? `${Math.round(Number(m[1]) * (m[2] === 'rem' ? 16 : 1))}–${Math.round(Number(m[3]) * (m[4] === 'rem' ? 16 : 1))}px` : `${+Number(bundle.size).toFixed(2)}px`;
  const lh = Number(bundle.lineHeight) > 0 ? ` · ${+Number(bundle.lineHeight).toFixed(3)} line height` : ''; // none set: it keeps what it inherits
  return `${size}${lh}${bundle.weight && bundle.weight !== 400 ? ` · weight ${bundle.weight}` : ''}`;
}
// what moving to a style costs, per place: unchanged, 1px or less, more (by size)
function costOf(role) {
  let same = 0, small = 0, more = 0;
  for (const m of role.members ?? []) { const d = Math.abs(m.delta?.size ?? 0); if (d < 0.5) same++; else if (d <= 1) small++; else more++; }
  return { same, small, more };
}

// worth offering: fewer sizes after, or classes typed by hand that one style class would replace
export const worth = (p) => !!p?.roles?.length && ((p.cost?.sizesBefore ?? 0) > p.roles.length || (p.cost?.classesRemoved ?? 0) > 0);
export const lineOf = (p) => FIX.styles.line(p.cost.sizesBefore, p.roles.length, p.cost.places);
// how many places move more than 1px, over every style (the ones to look at first)
export const moreOf = (p) => p.roles.reduce((n, r) => n + costOf(r).more, 0);

// The ladder card: `at` is the row pointed at
export function ladderHtml(p, at) {
  const names = namesOf(p.roles), roles = [...p.roles].sort((a, b) => px(b.bundle) - px(a.bundle));
  const rows = roles.map((r, i) => {
    const b = r.bundle, c = costOf(r), n = c.same + c.small + c.more || 1, caps = b.transform === 'uppercase';
    const ag = `<span class="ag" aria-hidden="true" style="font-size:${Math.min(28, px(b))}px;font-weight:${b.weight ?? 400};letter-spacing:${b.letterSpacing ?? 0}em;text-transform:${caps ? 'uppercase' : 'none'}">${caps ? 'AG' : 'Ag'}</span>`;
    const bar = `<span class="bar" aria-hidden="true"><i class="same" style="width:${(100 * c.same) / n}%"></i><i class="small" style="width:${(100 * c.small) / n}%"></i><i class="more" style="width:${(100 * c.more) / n}%"></i></span>`;
    const label = FIX.styles.row(names.get(r.name), numsOf(b), r.places, c.same);
    return `<li role="option" data-role="${esc(r.name)}" aria-selected="${i === at}" aria-label="${esc(label)}">${ag}<span><span class="name">${esc(names.get(r.name))}</span><span class="nums">${esc(numsOf(b))}</span></span><span class="n">${esc(FIX.places(r.places))}${bar}</span></li>`;
  }).join('');
  const all = roles.map(costOf).reduce((s, c) => ({ same: s.same + c.same, small: s.small + c.small, more: s.more + c.more }), { same: 0, small: 0, more: 0 });
  const outside = p.outside?.length ? `<div class="outside">${esc(FIX.styles.outside(p.outside.length))}</div>` : '';
  return `<div class="styles"><div class="head"><b>${esc(FIX.styles.title(p.roles.length))}</b><span>${esc(FIX.styles.from(p.cost.sizesBefore))}</span></div>`
    + `<ul class="ladder" role="listbox" aria-label="${esc(FIX.styles.title(p.roles.length))}">${rows}</ul>`
    + `<div class="cost" aria-live="polite">${esc(FIX.styles.cost(all.same, all.small, all.more))}</div>${outside}</div>`;
}
export const rolesInOrder = (p) => [...p.roles].sort((a, b) => px(b.bundle) - px(a.bundle));

// ── on the page: where a style lives, and the page as it would be ──────────

// a style's elements on the page, by the stamps of its places
export const elementsOf = (role) => (role?.members ?? []).flatMap((m) => (m.stamp ? [...document.querySelectorAll(`[data-plumb-source="${CSS.escape(m.stamp)}"]`)] : []));
const inView = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };

// The places of the style pointed at, ringed on the page (only what is in view is drawn; the rest is counted)
export class StyleLight {
  #layer; #els = []; #frame = 0;
  constructor(root) {
    this.#layer = Object.assign(document.createElement('div'), { className: 'ts-light' });
    this.#layer.setAttribute('aria-hidden', 'true');
    root.append(this.#layer);
  }
  show(els) {
    this.#els = els;
    if (!this.#frame) { addEventListener('scroll', this.#soon, { capture: true, passive: true }); addEventListener('resize', this.#soon); }
    this.#draw();
  }
  clear() {
    this.#els = []; this.#layer.replaceChildren();
    removeEventListener('scroll', this.#soon, { capture: true }); removeEventListener('resize', this.#soon);
    cancelAnimationFrame(this.#frame); this.#frame = 0;
  }
  // how many are in view, how many further on the page
  get counts() { const v = this.#els.filter(inView).length; return { inView: v, beyond: this.#els.length - v }; }
  #soon = () => { cancelAnimationFrame(this.#frame); this.#frame = requestAnimationFrame(() => this.#draw()); };
  #draw() {
    this.#frame = this.#frame || -1;
    const boxes = this.#els.filter(inView).slice(0, 400).map((el) => { const r = el.getBoundingClientRect(); const b = document.createElement('i'); b.style.cssText = `left:${r.left - 3}px;top:${r.top - 2}px;width:${r.width + 6}px;height:${r.height + 4}px`; return b; });
    this.#layer.replaceChildren(...boxes);
  }
}
export const LIGHT_CSS = `
  .ts-light { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
  .ts-light i { position: fixed; border-radius: 5px; box-shadow: 0 0 0 1.5px rgb(255 31 143 / .7), 0 0 0 5px rgb(255 31 143 / .12); transition: opacity 160ms; }
  @media (prefers-reduced-motion: reduce) { .ts-light i { transition: none; } }
`;

// The page as it would be: every place of every style takes its style's values, as inline styles the overlay owns;
// put back exactly as they were. What is in view glides there (inplace.js); the rest changes at once.
export class StylePreview {
  #had = new Map(); // el → [[prop, value, priority]]
  get on() { return this.#had.size > 0; }
  show(proposal, glide) {
    if (this.on) return;
    for (const role of proposal.roles) {
      const b = role.bundle;
      for (const m of role.members ?? []) {
        if (!m.stamp) continue;
        const lh = m.variant === 'compact' ? role.variants?.compact?.lineHeight : b.lineHeight;
        const sets = { 'font-size': b.sizeText ?? `${b.size}px`, 'letter-spacing': `${b.letterSpacing ?? 0}em`, 'font-weight': String(b.weight ?? 400), 'text-transform': b.transform ?? 'none', ...(Number(lh) > 0 ? { 'line-height': String(lh) } : {}) };
        for (const el of document.querySelectorAll(`[data-plumb-source="${CSS.escape(m.stamp)}"]`)) {
          if (this.#had.has(el)) continue;
          this.#had.set(el, Object.keys(sets).map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]));
          const set = () => { for (const [p, v] of Object.entries(sets)) el.style.setProperty(p, v, 'important'); };
          if (inView(el)) glide(el, set); else set();
        }
      }
    }
  }
  clear(glide) {
    for (const [el, had] of this.#had) {
      const put = () => { for (const [p, v, pr] of had) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); } if (!el.getAttribute('style')?.trim()) el.removeAttribute('style'); };
      if (el.isConnected && inView(el)) glide(el, put); else put();
    }
    this.#had.clear();
  }
}

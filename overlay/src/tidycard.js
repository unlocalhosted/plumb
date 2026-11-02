/* ─────────────────────────────────────────────────────────
 * TIDY THIS CARD · the element card's third layer (elementcard.js)
 *
 * One button un-sloppifies a card (docs/research/hierarchy.md, "un-sloppify"): hierarchy.js tidy(scope, scale) with the
 * theme's own scales finds what breaks the card's order; every change shows on the card at once (hold Space to see it
 * as it was); the changes are listed in plain words (what, from → to, the rule as a sentence); one Write it writes them
 * all, one Undo takes them all back.
 *
 * tidy() never moves the title's bundle, anything outside the card, a runtime value (var(--z), calc), a drawing or a
 * colour, and never changes a layout's mode; this layer adds: a change is written only where its class is written. On
 * the element's own line when its className is a plain string (a class swap), else at the place that passes the class
 * in (a component's usage: that prop's string, edited). A change with no such place is listed as left alone, and why.
 * ───────────────────────────────────────────────────────── */
import { request } from './api.js';
import { locate } from './locate.js';
import { esc } from './choices.js';
import { FIX } from './words.js';
import { tidy, levelsOf } from './hierarchy.js';

const W = FIX.card.tidy;
const WEIGHT = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };
const pxOf = (v) => { const m = /^(-?[\d.]+)(px|rem)?$/.exec(String(v ?? '').trim()); return m ? +m[1] * (m[2] === 'rem' ? (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) : 1) : NaN; };
const near = (a, b) => Math.abs(a - b) < 0.5;
// the class families a change replaces
const FAMILY = {
  'font-size': (c, sizes) => /^text-\[[\d.]+(?:px|rem)\]$/.test(c) || /^text-(?:xs|sm|base|lg|xl|\dxl)$/.test(c) || sizes.some((s) => c === `text-${s.token}`),
  'font-weight': (c) => /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/.test(c),
  gap: (c) => /^gap-(?!x-|y-)/.test(c),
  padding: (c) => /^p[xytrblse]?-/.test(c),
  radius: (c) => /^rounded(?:-(?!(?:[trblse]|tl|tr|bl|br|ss|se|es|ee)(?:-|$))[\w[\].]+)?$/.test(c),
};
const PREVIEW = { 'font-size': (v) => ({ 'font-size': `${v}px` }), 'font-weight': (v) => ({ 'font-weight': String(v) }), gap: (v) => ({ gap: `${v}px` }),
  padding: (v, c) => (c?.sides ? Object.fromEntries(Object.entries(c.sides).map(([k, n]) => [`padding-${k}`, `${n}px`])) : { padding: `${v}px` }), radius: (v) => ({ 'border-radius': `${v}px` }) };
// the sides a padding class sets (ps/pe as left/right: the pages read here run left to right)
const SIDES = { p: ['top', 'right', 'bottom', 'left'], px: ['left', 'right'], py: ['top', 'bottom'], pt: ['top'], pr: ['right'], pb: ['bottom'], pl: ['left'], ps: ['left'], pe: ['right'] };
const sidesOf = (c) => SIDES[/^(p[xytrblse]?)-/.exec(c)?.[1]] ?? [];
// a class written on a step: never an arbitrary value (a change Tidy can't name on the theme's scale isn't proposed)
const stepped = (cls) => !!cls && !/\[/.test(cls);

// an element's own words, short, to name it in a list
const named = (el) => { const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim(); return t ? `“${t.length > 28 ? `${t.slice(0, 27)}…` : t}”` : null; };

// host: { target(), props() → the element's props (its steps), name(el) }
export class Tidy {
  #host; #changes = []; #shown = new Map(); #before = false;
  constructor(host) { this.#host = host; }
  // a card with text levels in it: something tidy can read
  static offered(el) { try { return levelsOf(el).length >= 2; } catch { return false; } }
  get changes() { return this.#changes; }
  get before() { return this.#before; }

  // the theme's own scales, in px, from the element's props
  #scale() {
    const steps = (k) => this.#host.props()?.props?.find((p) => p.key === k)?.steps ?? [];
    const px = (k) => steps(k).map((s) => ({ px: k === 'font-weight' ? +s.value : pxOf(s.value), token: s.token })).filter((s) => Number.isFinite(s.px));
    const spacing = [...px('gap'), ...px('padding')];
    return { sizes: px('font-size'), weights: px('font-weight'), radii: px('radius'), spacing };
  }
  // the class a value is written as: the theme's step when it is one, else Tailwind's spacing number, else arbitrary
  #classFor(prop, v, sc) {
    // the project's own name for a step (s3) over Tailwind's multiplier for the same px (3)
    const step = (list) => { const all = list.filter((s) => near(s.px, v)); return (all.find((s) => !/^[\d.]+$/.test(s.token)) ?? all[0])?.token; };
    if (prop === 'font-weight') return WEIGHT[v] ? `font-${WEIGHT[v]}` : `font-[${v}]`;
    if (prop === 'font-size') { const t = step(sc.sizes); return t ? `text-${t}` : `text-[${v}px]`; }
    if (prop === 'radius') { const t = step(sc.radii); return t ? `rounded-${t}` : v === 0 ? 'rounded-none' : `rounded-[${v}px]`; }
    const pre = prop === 'gap' ? 'gap' : prop === 'padding' ? 'p' : prop, t = step(sc.spacing);
    if (t) return `${pre}-${t}`;
    const base = pxOf(getComputedStyle(document.documentElement).getPropertyValue('--spacing').trim());
    return base > 0 && Number.isInteger(Math.round((v / base) * 100) / 100 * 4) ? `${pre}-${Math.round((v / base) * 100) / 100}` : `${pre}-[${v}px]`;
  }

  open() {
    const t = this.#host.target(), sc = this.#scale();
    const raw = tidy(t, { sizes: sc.sizes.map((s) => s.px), weights: sc.weights.map((s) => s.px), spacing: sc.spacing.length ? [0, ...sc.spacing.map((s) => s.px)] : undefined, radii: sc.radii.length ? [0, ...sc.radii.map((s) => s.px)] : undefined });
    this.#changes = raw.filter((c) => PREVIEW[c.prop] && Number.isFinite(+c.to) && t.contains(c.el)).map((c) => {
      const classes = [...c.el.classList].filter((x) => !x.includes(':'));
      const from = classes.filter((x) => FAMILY[c.prop](x, sc.sizes));
      const to = this.#classFor(c.prop, +c.to, sc);
      if (c.prop === 'padding' && c.sides) return { ...c, ...this.#padding(c, from, sc), step: to };
      return { ...c, fromClass: from.join(' '), toClass: to, step: to };
    }).filter((c) => c.fromClass !== c.toClass && stepped(c.step));
    this.#before = false;
    this.#show();
    return this.#changes;
  }
  // a padding raised on some sides: only the classes that set those sides are replaced; the sides they also set and that
  // don't change are written again as they were (p-[10px] raised to 12 on top and bottom: py-s3 px-2.5)
  #padding(c, from, sc) {
    const now = { top: NaN, right: NaN, bottom: NaN, left: NaN };
    const cs = getComputedStyle(c.el);
    for (const k of Object.keys(now)) now[k] = Math.round(parseFloat(cs.getPropertyValue(`padding-${k}`)) * 100) / 100;
    const changed = Object.keys(now).filter((k) => !near(now[k], c.sides[k] ?? now[k]));
    const replaced = from.filter((x) => sidesOf(x).some((k) => changed.includes(k)));
    const emit = [...new Set(replaced.flatMap(sidesOf))], v = (k) => c.sides[k] ?? now[k], cls = (pre, n) => this.#classFor(pre, n, sc);
    const out = [];
    if (emit.length === 4 && emit.every((k) => near(v(k), v('top')))) out.push(cls('padding', v('top')));
    else {
      const left = new Set(emit);
      for (const [pre, [a, b]] of [['py', ['top', 'bottom']], ['px', ['left', 'right']]]) if (left.has(a) && left.has(b) && near(v(a), v(b))) { out.push(cls(pre, v(a))); left.delete(a); left.delete(b); }
      for (const k of ['top', 'right', 'bottom', 'left']) if (left.has(k)) out.push(cls(`p${k[0]}`, v(k)));
    }
    return { fromClass: replaced.join(' '), toClass: out.join(' ') };
  }
  close() { this.#unshow(); this.#changes = []; this.#before = false; }
  // every change on the card at once; held Space shows the card as it was
  #show() {
    this.#unshow();
    if (this.#before) return;
    for (const c of this.#changes) for (const [p, v] of Object.entries(PREVIEW[c.prop](+c.to, c))) {
      const k = c.el; let m = this.#shown.get(k); if (!m) this.#shown.set(k, (m = new Map()));
      if (!m.has(p)) m.set(p, [k.style.getPropertyValue(p), k.style.getPropertyPriority(p)]);
      k.style.setProperty(p, v, 'important');
    }
  }
  #unshow() {
    for (const [el, m] of this.#shown) for (const [p, [v, pr]] of m) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); }
    this.#shown.clear();
  }
  hold(on) { if (on === this.#before) return; this.#before = on; this.#show(); }
  lift() { this.#unshow(); }

  html() {
    if (!this.#changes.length) return `<div class="sec"><div class="note" role="status">${esc(W.none)}</div></div>`;
    const t = this.#host.target();
    const rows = this.#changes.map((c) => {
      const who = c.el === t ? W.theCard : named(c.el) ?? this.#host.name(c.el);
      return `<li class="tidy-row"><span class="what"><b>${esc(W.props[c.prop])}</b> ${esc(W.of(who))}</span><span class="ft">${esc(W.value(c.prop, c.from))} <i>→</i> ${esc(W.value(c.prop, c.to))}</span><small>${esc(W.rules[c.rule] ?? '')}</small></li>`;
    }).join('');
    return `<div class="sec"><div class="lab">${esc(W.count(this.#changes.length))}<span>${this.#before ? `<b class="was">${esc(W.asItWas)}</b>` : esc(W.holdSpace)}</span></div><ul class="tidy-list">${rows}</ul></div>`;
  }

  // where each change is written: the element's own line when its className is a plain string with the class in it,
  // else the nearest place up the component chain that passes the class in as a prop's string
  async writes() {
    const steps = [], left = [];
    const at = new Map(); // a usage's prop value as it is being edited (two changes in one prop)
    for (const c of this.#changes) {
      const loc = await locate(c.el, { chain: true });
      if (!loc?.file) { left.push(W.noPlace(W.props[c.prop])); continue; }
      const own = await request('structure', { file: loc.file, line: loc.line, column: loc.column }).catch(() => null);
      const cls = own?.props?.className;
      const fromOne = c.fromClass.split(' ').filter(Boolean);
      if (typeof cls === 'string' && fromOne.every((x) => cls.split(/\s+/).includes(x))) {
        steps.push({ kind: 'swap', file: own.file, hash: own.hash, line: own.line, column: own.column, from: c.fromClass, to: c.toClass });
        continue;
      }
      let done = false;
      for (const up of (loc.chain ?? []).slice(1, 6)) {
        if (!up?.file) continue;
        const s = await request('structure', { file: up.file, line: up.line, column: up.column }).catch(() => null);
        for (const [name, value] of Object.entries(s?.props ?? {})) {
          const key = `${s.file}:${s.line}:${s.column}:${name}`, now = at.get(key) ?? value;
          if (typeof now !== 'string' || !fromOne.length || !fromOne.every((x) => now.split(/\s+/).includes(x))) continue;
          const next = now.split(/\s+/).filter((x) => !fromOne.includes(x)).concat(c.toClass).join(' ');
          at.set(key, next);
          const prior = steps.find((p) => p.kind === 'prop' && p.key === key);
          if (prior) prior.value = next; else steps.push({ kind: 'prop', key, file: s.file, hash: s.hash, line: s.line, column: s.column, name, value: next });
          done = true; break;
        }
        if (done) break;
      }
      if (!done) left.push(W.noPlace(W.props[c.prop]));
    }
    return { steps, left };
  }
}

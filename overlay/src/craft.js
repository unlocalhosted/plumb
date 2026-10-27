/* ─────────────────────────────────────────────────────────
 * CRAFT ENGINE · React Plumber overlay
 *
 * The mentor's rules (docs/craft/rules.md) read on the rendered page (docs/briefs/craft-engine.md). Drift says a value
 * is off the scale; craft says a value on the scale is still wrong here, because a rule of good making relates it to
 * its neighbours. The engine measures, compares, and speaks only when the evidence is plain.
 *
 *  rules      plain objects (craft-rules.js): { id, family: 'craft', reads, threshold, check(facts, theme) → findings }.
 *             A rule never touches the DOM; it reads facts and returns findings with evidence, confidence, a why and
 *             a suggestion (a class change, or advice when no safe edit exists)
 *  facts      one measuring pass per run, reads only, memoised per element (rect, style, kids, text) and reachable
 *             for an element's relatives through the same accessors, so nothing is measured twice in a pass
 *  theme      the overlay's decisions: scale(family) → [{ name, short, px }], colors() → [{ name, short, rgb }];
 *             colours are measured once per decisions load with a probe, before any element is read
 *  marks      a finding becomes a mark the overlay already draws and groups: ledger 'new', glyph 'craft', props for
 *             its place, `rule|text` for its cause row, choices [] (writing a suggestion is the next layer)
 *  noise      a confidence floor (FLOOR), per-rule thresholds on the rule, and a finding dropped when an ancestor
 *             carries the same one with the same text (one row of a nested list is enough)
 *  cache      an element's findings are kept by its signature (its class and its parent's) until invalidate()
 * ───────────────────────────────────────────────────────── */
import { RULES } from './craft-rules.js';
import { verdicts } from './verdict.js';
import { rgb, VIRTUAL } from './craft-read.js';
import { TIER } from './craft-facets.js';

const FLOOR = 0.8; // findings under this confidence are never shown

const px = (v) => parseFloat(v) || 0;
const letters = (s) => /\S/.test(s);

// The measuring layer: every read the rules make, memoised for one pass. Reads only.
export class Facts {
  #rects = new Map(); #styles = new Map(); #kids = new Map(); #text = new Map();
  rect(el) { let v = this.#rects.get(el); if (!v) this.#rects.set(el, (v = el.getBoundingClientRect())); return v; }
  style(el) { let v = this.#styles.get(el); if (!v) this.#styles.set(el, (v = getComputedStyle(el))); return v; }
  // children with a box, in order
  kids(el) {
    let v = this.#kids.get(el);
    if (!v) this.#kids.set(el, (v = [...el.children].filter((c) => !c.closest('plumb-overlay') && c.localName !== 'script' && c.localName !== 'style' && (({ width, height }) => width > 0 && height > 0)(this.rect(c)))));
    return v;
  }
  // the element owns a text node with letters (not only its descendants)
  text(el) {
    let v = this.#text.get(el);
    if (v === undefined) this.#text.set(el, (v = [...el.childNodes].some((n) => n.nodeType === 3 && letters(n.nodeValue))));
    return v;
  }
  // the four paddings and borders of an element, in px
  box(el) {
    const s = this.style(el);
    return { pt: px(s.paddingTop), pr: px(s.paddingRight), pb: px(s.paddingBottom), pl: px(s.paddingLeft), bt: px(s.borderTopWidth), br: px(s.borderRightWidth), bb: px(s.borderBottomWidth), bl: px(s.borderLeftWidth) };
  }
  // The same page with one element as a suggestion would leave it: `sets` its style values (camelCase → px) and
  // `classes` its class list. Run `fn(facts)` on it; nothing on the page changes.
  with(el, { sets = {}, classes } = {}, fn) {
    const base = this;
    const real = base.style(el);
    const over = new Proxy(real, { get: (t, k) => (k in sets ? (typeof sets[k] === 'number' ? `${sets[k]}px` : sets[k]) : Reflect.get(t, k, t)) });
    // every read delegates to this pass's memo (its private fields stay its own); only the element's style is new
    const virtual = { rect: (x) => base.rect(x), kids: (x) => base.kids(x), text: (x) => base.text(x), ground: (x) => base.ground(x), style: (x) => (x === el ? over : base.style(x)) };
    virtual.box = Facts.prototype.box.bind(virtual);
    virtual.with = Facts.prototype.with.bind(virtual);
    if (classes !== undefined) VIRTUAL.set(el, classes);
    try { return fn(virtual); } finally { VIRTUAL.delete(el); }
  }
  // the ground an element's text sits on: the nearest painted background up the tree, else the page's
  ground(el) {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = rgb(this.style(n).backgroundColor);
      if (c && c[3] > 0.5) return c;
    }
    return rgb(this.style(document.body).backgroundColor) ?? [255, 255, 255, 1];
  }
}

export { rgb, utility, classesOf } from './craft-read.js';

// The theme as the rules see it: the overlay's decisions, each measured on the page once (a token written as
// calc(var(--spacing) * 3) is known in px, a colour written as oklch() in rgb). The probe is the one write the engine
// makes to the page, and it runs before any element is read in a pass.
const MEASURE = { radius: { prop: 'border-top-left-radius', keep: /^--radius-/ }, spacing: { prop: 'padding-left', keep: /^--spacing-/ }, color: { prop: 'color', keep: /^--color-/ } };
export class Theme {
  #decisions; #measured = null; #seen = null;
  // decisions() → the decisions array (the widget's, from the server), or null while it loads
  constructor({ decisions } = {}) { this.#decisions = decisions ?? (() => null); }
  // [{ name, short, px }] for radius and spacing; [{ name, short, rgb }] for color; [] while the decisions load
  scale(family) { return this.#measure()[family] ?? []; }
  // whether a font family has an optical-size axis: two hidden spans set at opsz 8 and opsz 144 measure differently
  // (the theme's probe is the one write the engine makes, before any element is read); memoised per family
  #axes = new Map();
  hasOpsz(family) {
    if (this.#axes.has(family)) return this.#axes.get(family);
    const span = (o) => { const e = document.createElement('span'); e.textContent = 'Hamburgefonstiv 0123'; e.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${family};font-size:40px;font-variation-settings:"opsz" ${o}`; document.body.append(e); const w = e.getBoundingClientRect().width; e.remove(); return w; };
    const has = Math.abs(span(8) - span(144)) > 0.5;
    this.#axes.set(family, has);
    return has;
  }
  // whether the project's own theme names a token (a framework default is not the project's): --tracking-wide
  has(name) { const d = this.#decisions(); return Array.isArray(d) && d.some((x) => x.name === name && x.origin !== 'framework'); }
  // whether the decisions are in at all (before they load, nothing can be judged against them)
  get loaded() { return Array.isArray(this.#decisions()); }
  // one step of Tailwind's numeric scale (--spacing) in px, or null when the project has none: `pl-5` means 5 of
  // these, so a numeric class is offered only when the project defines the unit
  #unit;
  unit() {
    if (this.#unit !== undefined) return this.#unit;
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-left:calc(var(--spacing) * 1);';
    document.body.append(probe);
    const n = parseFloat(getComputedStyle(probe).paddingLeft);
    probe.remove();
    return (this.#unit = n > 0 ? n : null);
  }
  colors() { return this.scale('color'); }
  #measure() {
    const d = this.#decisions();
    if (!Array.isArray(d)) return {};
    if (this.#measured && this.#seen === d) return this.#measured;
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    document.body.append(probe);
    const out = { radius: [], spacing: [], color: [] };
    for (const dec of d) {
      const m = MEASURE[dec.family];
      if (!m || !m.keep.test(dec.name)) continue;
      // the token's own definition first, else the variable (an inline theme defines no variable per step)
      probe.style.removeProperty(m.prop);
      probe.style.setProperty(m.prop, dec.value);
      if (!probe.style.getPropertyValue(m.prop)) probe.style.setProperty(m.prop, `var(${dec.name})`);
      const got = getComputedStyle(probe).getPropertyValue(m.prop);
      const short = dec.name.replace(m.keep, '');
      if (dec.family === 'color') { const c = rgb(got); if (c && c[3] > 0.99) out.color.push({ name: dec.name, short, rgb: c.slice(0, 3) }); }
      else { const n = parseFloat(got); if (Number.isFinite(n)) out[dec.family].push({ name: dec.name, short, px: n }); }
    }
    probe.remove();
    this.#seen = d;
    return (this.#measured = out);
  }
  // the nearest step of a scale to a value, within `within` px; null when none is that close
  nearest(family, value, within = 2) {
    let best = null;
    for (const s of this.scale(family)) if (Number.isFinite(s.px) && Math.abs(s.px - value) <= within && (!best || Math.abs(s.px - value) < Math.abs(best.px - value))) best = s;
    return best;
  }
  // the largest step at or under a value (the step to come down to); null when the scale has none
  floor(family, value) {
    let best = null;
    for (const s of this.scale(family)) if (Number.isFinite(s.px) && s.px <= value + 0.01 && (!best || s.px > best.px)) best = s;
    return best;
  }
  // the colour token nearest to an rgb, within a distance (0–441 in sRGB); null when none is that close
  nearestColor(target, within = 32) {
    let best = null, bd = Infinity;
    for (const c of this.colors()) {
      const d = Math.hypot(c.rgb[0] - target[0], c.rgb[1] - target[1], c.rgb[2] - target[2]);
      if (d <= within && d < bd) (bd = d), (best = { ...c, distance: d });
    }
    return best;
  }
}

// An important class stays important: `!px-s3` becomes `!pl-5 !pr-s6`, in the same spelling (leading or trailing).
function important(suggest) {
  if (suggest?.kind !== 'class') return suggest;
  const from = String(suggest.from ?? '').split(/\s+/).filter(Boolean);
  if (!from.length || !from.every((c) => /^!|!$/.test(c))) return suggest;
  const lead = from[0].startsWith('!');
  const to = String(suggest.to).split(/\s+/).filter(Boolean).map((c) => (/^!|!$/.test(c) ? c : lead ? `!${c}` : `${c}!`)).join(' ');
  return { ...suggest, to };
}

// A finding, as a mark the overlay draws and groups like any other.
function markOf(f) {
  const suggest = f.suggest ?? null;
  const action = suggest?.kind === 'class' ? `Change \`${suggest.from}\` to \`${suggest.to}\`${suggest.why ? `: ${suggest.why}` : ''}.` : suggest?.text ?? '';
  return {
    key: f.key ?? f.rule, rule: f.rule, family: 'craft', glyph: 'craft', ledger: 'new', soft: f.tier === TIER.advisory,
    ...(f.tier !== undefined ? { tier: f.tier } : {}),
    text: f.text, props: f.props ?? [], value: f.value, n: f.n,
    title: f.title, because: f.because, action, what: f.what,
    choices: [], pick: null,
    craft: { evidence: f.evidence ?? {}, confidence: f.confidence, suggest },
  };
}

export class Craft {
  #rules; #theme; #cache = new WeakMap(); // el → { sig, marks }
  constructor({ rules = RULES, theme } = {}) {
    this.#rules = rules;
    this.#theme = theme instanceof Theme ? theme : new Theme(theme ?? {});
  }
  get rules() { return this.#rules; }
  get theme() { return this.#theme; }

  // Everything measured is measured again on the next run (a resize, a write, the page changed under us).
  invalidate() { this.#cache = new WeakMap(); }

  // items: [{ id, el, marks, dims, file }]. Returns the same items with each element's craft marks appended. One
  // measuring pass; no write to the page except the theme's colour probe, which runs first.
  enrich(items) {
    const t0 = performance.now();
    try {
      this.#theme.colors();
      const facts = new Facts();
      // the rules, then the hierarchy: one verdict per element: a kept mark per facet, its fix tried before it is offered (verdict.js)
      // craft judges what it can reach: an element outside the project's source has no line to fix, so it is left be
      const out = verdicts(items.map((item) => ({ ...item, marks: [...item.marks, ...(item.checked === false ? [] : this.#marksFor(item.el, facts))] })), { facts, theme: this.#theme, rules: this.#rules });
      // dedupe: a finding an ancestor already carries, with the same text, is one decision, not two
      const carried = new Map(out.map((i) => [i.el, new Set(i.marks.filter((m) => m.family === 'craft').map((m) => `${m.rule}|${m.text}`))]));
      for (const item of out) {
        if (!item.marks.some((m) => m.family === 'craft')) continue;
        item.marks = item.marks.filter((m) => {
          if (m.family !== 'craft') return true;
          for (let a = item.el.parentElement; a; a = a.parentElement) if (carried.get(a)?.has(`${m.rule}|${m.text}`)) return false;
          return true;
        });
      }
      return out;
    } finally { performance.measure('plumb:craft', { start: t0 }); }
  }

  // The craft findings of one element, run fresh or from the cache by signature.
  #marksFor(el, facts) {
    if (!el.isConnected || el.closest('plumb-overlay')) return [];
    // what a finding depends on: the element's and its parent's classes, its own inline style, its words
    const sig = `${el.getAttribute('class') ?? ''}|${el.parentElement?.getAttribute('class') ?? ''}|${el.getAttribute('style') ?? ''}|${el.textContent?.length ?? 0}`;
    const hit = this.#cache.get(el);
    if (hit && hit.sig === sig) return hit.marks;
    const marks = [];
    // a special case that covers this element is its authority, firing or not: the general rules it refines don't run
    const quiet = new Set();
    for (const rule of this.#rules) if (rule.scope && rule.refines) { try { if (rule.scope({ el, facts })) for (const r of rule.refines) quiet.add(r); } catch {} }
    for (const rule of this.#rules) {
      if (quiet.has(rule.id)) continue;
      let found = [];
      try { found = rule.check({ el, facts }, this.#theme) ?? []; } catch { found = []; } // a rule's error is its own, never the page's
      for (const f of found) if ((f.confidence ?? 0) >= FLOOR) marks.push(markOf({ ...f, rule: rule.id, key: f.key ?? rule.id, suggest: important(f.suggest) }));
    }
    this.#cache.set(el, { sig, marks });
    return marks;
  }
}

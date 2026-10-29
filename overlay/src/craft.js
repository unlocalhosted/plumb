/* ─────────────────────────────────────────────────────────
 * CRAFT ENGINE · React Plumber overlay
 *
 * The mentor's rules (docs/craft/rules.md) read on the rendered page (docs/briefs/craft-engine.md). Drift says a value
 * is off the scale; craft says a value on the scale is still wrong here, because a rule of good making relates it to
 * its neighbours. The engine measures, compares, and speaks only when the evidence is plain.
 *
 *  rules      plain objects (craft-rules.js): { id, family: 'craft', owns, reads, check(facts, theme) → findings }.
 *             A rule never touches the DOM; it reads facts, compares them against the spec (theme.spec(id): the
 *             standard as this project's config tunes it, craft-spec.js) and returns findings with evidence,
 *             confidence, a why and a suggestion (a class change, or advice when no safe edit exists)
 *  facts      one measuring pass per run, reads only, memoised per element (rect, style, kids, text) and reachable
 *             for an element's relatives through the same accessors, so nothing is measured twice in a pass
 *  theme      the overlay's decisions: scale(family) → [{ name, short, px }], colors() → [{ name, short, rgb }];
 *             colours are measured once per decisions load with a probe, before any element is read
 *  marks      a finding becomes a mark the overlay already draws and groups: ledger 'new', glyph 'craft', props for
 *             its place, `rule|text` for its cause row, choices [] (writing a suggestion is the next layer)
 *  noise      a confidence floor (FLOOR), per-rule thresholds in the spec, a rule the spec turns off never run, and a
 *             finding dropped when an ancestor carries the same one with the same text (one row of a nested list is enough)
 *  cache      an element's findings are kept by its signature (its class and its parent's) until invalidate()
 * ───────────────────────────────────────────────────────── */
import { RULES } from './craft-rules.js';
import { verdicts } from './verdict.js';
import { rgb, VIRTUAL, SPEC } from './craft-read.js';
import { TIER } from './craft-facets.js';
import { HEADLESS } from './craft-headless.js';
import { request } from './api.js';

const FLOOR = 0.8; // findings under this confidence are never shown

const px = (v) => parseFloat(v) || 0;
const letters = (s) => /\S/.test(s);

// Ink (docs/briefs/craft-hard-rules.md, ink): what an inline icon actually draws, from its pixels. An off-DOM clone
// with its computed paint inlined is rasterised at 4× in idle time; the result is kept by what it draws (one icon used
// forty times is rasterised once). Until it lands a rule reads null and says nothing; when it lands, every Craft that
// asked is told, and judges the page again.
const INK_SCALE = 4;
const INK = { done: new Map(), queue: new Map(), timer: 0, crafts: new Set() };
const PAINT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'display', 'visibility'];
function inkMarkup(svg, r) {
  const clone = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll('*')], to = [clone, ...clone.querySelectorAll('*')];
  from.forEach((n, i) => {
    const cs = getComputedStyle(n), d = to[i];
    d.removeAttribute('class');
    for (const p of PAINT) d.style.setProperty(p, cs.getPropertyValue(p));
  });
  const W = Math.round(r.width * INK_SCALE), H = Math.round(r.height * INK_SCALE);
  if (!svg.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  clone.style.width = `${W}px`; clone.style.height = `${H}px`; clone.style.color = '#000'; clone.style.translate = 'none'; clone.style.transform = 'none';
  return { markup: new XMLSerializer().serializeToString(clone), W, H };
}
async function inkOf({ markup, W, H }) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  await img.decode();
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1, a = 0, cx = 0, cy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = d[(y * W + x) * 4 + 3] / 255;
    if (v <= 0.1) continue;
    a += v; cx += v * (x + 0.5); cy += v * (y + 0.5);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { bbox: null, centroid: null, area: 0, fill: 0 };
  const k = INK_SCALE, bbox = { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
  return { bbox, centroid: { x: cx / a / k, y: cy / a / k }, area: a / (k * k), fill: a / (k * k) / (bbox.w * bbox.h) };
}
function inkFlush() {
  INK.timer = 0;
  const batch = [...INK.queue]; INK.queue.clear();
  Promise.all(batch.map(([key, job]) => inkOf(job).then((v) => INK.done.set(key, v), () => INK.done.set(key, false))))
    .then(() => { for (const c of INK.crafts) c.inked(); });
}
function inkWant(key, job) {
  if (INK.queue.has(key)) return;
  INK.queue.set(key, job);
  INK.timer ||= (typeof requestIdleCallback === 'function' ? requestIdleCallback(inkFlush, { timeout: 300 }) : setTimeout(inkFlush, 50));
}

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
    const virtual = { rect: (x) => base.rect(x), kids: (x) => base.kids(x), text: (x) => base.text(x), ground: (x) => base.ground(x), metrics: (x) => base.metrics(x), census: (n) => base.census(n), ink: (x) => base.ink(x), stroke: (x) => base.stroke(x), other: (c) => base.other(c), probe: (x, g) => base.probe(x, g), source: (x) => base.source(x), style: (x) => (x === el ? over : base.style(x)) };
    virtual.box = Facts.prototype.box.bind(virtual);
    virtual.with = Facts.prototype.with.bind(virtual);
    if (classes !== undefined) VIRTUAL.set(el, classes);
    try { return fn(virtual); } finally { VIRTUAL.delete(el); }
  }
  // The page's habits (docs/briefs/craft-hard-rules.md, census): one count over every element the reader handed on,
  // clustered, so a rule can judge an element against this app's own majority rather than a universal number.
  //   weights     the font weights of text-owning elements (to the hundred)
  //   textColors  their text colours, composited on their ground, neutral ones only (chroma < 0.04)
  //   gaps        the gaps of column stacks with three or more children
  // → { sample, clusters: [{ value, count, members }] (most first), share(value) }
  items = [];
  #census = new Map();
  census(name) {
    let c = this.#census.get(name);
    if (c) return c;
    const clusters = [];
    const add = (value, el, near) => { const k = clusters.find((x) => near(x.value, value)); if (k) { k.count++; k.members.push(el); } else clusters.push({ value, count: 1, members: [el] }); };
    for (const el of this.items) {
      if (!el.isConnected) continue;
      const st = this.style(el);
      if (name === 'weights' && this.text(el)) add(Math.round((parseInt(st.fontWeight, 10) || 400) / 100) * 100, el, (a, b) => a === b);
      else if (name === 'textColors' && this.text(el)) {
        const c0 = rgb(st.color);
        if (!c0) continue;
        const g = this.ground(el), o = c0[3] ?? 1;
        // the page's greys are the words on its own surfaces: words on a coloured fill or an inverted one (a dark button
        // on a light page) belong to that fill
        const G = labOf(g);
        this.pageL ??= labOf(this.ground(document.body))[0];
        if (Math.hypot(G[1], G[2]) >= 0.04 || Math.abs(G[0] - this.pageL) > 0.25) continue;
        const mixed = [0, 1, 2].map((i) => c0[i] * o + g[i] * (1 - o));
        const L = labOf(mixed);
        if (Math.hypot(L[1], L[2]) >= 0.04) continue; // a semantic colour (a link, an accent) is not a level of grey
        add(mixed, el, (a, b) => { const x = labOf(a), y = labOf(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100 <= 4; });
      } else if (name === 'gaps' && /flex/.test(st.display) && /column/.test(st.flexDirection) && this.kids(el).length >= 3) {
        const g = px(st.rowGap === 'normal' ? 0 : st.rowGap);
        if (g >= 8) add(g, el, (a, b) => Math.abs(a - b) <= 1);
      }
    }
    clusters.sort((a, b) => b.count - a.count);
    const sample = clusters.reduce((n, k) => n + k.count, 0);
    c = { sample, clusters, share: (value) => (clusters.find((k) => k.value === value)?.count ?? 0) / Math.max(1, sample) };
    this.#census.set(name, c);
    return c;
  }
  // An element's font metrics (docs/briefs/craft-hard-rules.md, metrics): cap height, x-height, the font's ascent and
  // descent, half-leading, and its first line's baseline. Measured on a canvas, memoised per font for the pass; null
  // when the page's font isn't loaded yet (a fallback's metrics are not the page's). Reads only.
  #metrics = new Map(); #ctx = null;
  metrics(el) {
    const s = this.style(el), font = s.font || `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    try { if (document.fonts && !document.fonts.check(font)) return null; } catch { return null; }
    let m = this.#metrics.get(font);
    if (!m) {
      this.#ctx ??= document.createElement('canvas').getContext('2d');
      const ctx = this.#ctx; ctx.font = font;
      const H = ctx.measureText('H'), x = ctx.measureText('x');
      m = { capHeight: H.actualBoundingBoxAscent, xHeight: x.actualBoundingBoxAscent, ascent: H.fontBoundingBoxAscent, descent: H.fontBoundingBoxDescent };
      this.#metrics.set(font, m);
    }
    const fs = px(s.fontSize), lh = s.lineHeight === 'normal' ? fs * 1.2 : px(s.lineHeight);
    const halfLeading = (lh - (m.ascent + m.descent)) / 2;
    // the first line's baseline: the top of its words' box plus the font's ascent
    let baseline = null;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !letters(n.nodeValue)) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const q = r.getClientRects()[0];
      if (q) { baseline = q.top + (q.height - (m.ascent + m.descent)) / 2 + m.ascent; break; }
    }
    return { ...m, halfLeading, lineHeight: lh, baseline };
  }
  // An inline icon's ink, in px of its own box: { bbox, centroid, area, fill } (fill = area / bbox area); null while it is
  // rasterised (it lands in idle time and the page is judged again), for anything that isn't a small inline svg, and
  // when it could not be read.
  #ink = new Map();
  ink(svg) {
    if (svg?.localName !== 'svg') return null;
    if (this.#ink.has(svg)) return this.#ink.get(svg);
    const r = this.rect(svg);
    let v = null;
    if (r.width >= 4 && r.height >= 4 && r.width <= 64 && r.height <= 64) {
      const job = inkMarkup(svg, r), key = `${job.W}x${job.H}|${job.markup}`;
      const hit = INK.done.get(key);
      if (hit === undefined) inkWant(key, job); else v = hit || null;
    }
    this.#ink.set(svg, v);
    return v;
  }
  // An icon's stroke as drawn, in px: the first stroked shape's width, scaled from its viewBox; null for a filled icon.
  stroke(svg) {
    if (svg?.localName !== 'svg') return null;
    const r = this.rect(svg), vb = svg.viewBox?.baseVal;
    const scale = vb && vb.width > 0 ? r.width / vb.width : 1;
    for (const n of [svg, ...svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')]) {
      const cs = getComputedStyle(n);
      if (n === svg && n.children.length) continue; // the root only sets what its shapes inherit
      if (cs.stroke === 'none' || cs.display === 'none' || !(px(cs.strokeWidth) > 0)) continue;
      return cs.vectorEffect === 'non-scaling-stroke' ? px(cs.strokeWidth) : px(cs.strokeWidth) * scale;
    }
    return null;
  }
  // The headless facts (craft-headless.js): another condition's page, a gesture's timeline, the element's source.
  // Null in the live overlay, so the rules that need them stay quiet there.
  other(condition) { return HEADLESS.other(condition, this); }
  probe(el, gesture) { return HEADLESS.probe(el, gesture); }
  source(el) { return HEADLESS.source(el); }
  // the ground an element's text sits on: the nearest painted background up the tree, else the page's
  ground(el) {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = rgb(this.style(n).backgroundColor);
      if (c && c[3] > 0.5) return c;
    }
    // nothing painted up the tree: the page's own background (the root's paints the whole canvas), else the browser's white.
    // A transparent body is not black ground: it parses to [0, 0, 0, 0].
    for (const n of [document.body, document.documentElement]) {
      const c = rgb(this.style(n).backgroundColor);
      if (c && c[3] > 0.5) return c;
    }
    return [255, 255, 255, 1];
  }
}

export { rgb, utility, classesOf } from './craft-read.js';

// sRGB → OKLab, for the census's colour clusters
function labOf([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}

// The spec (docs/briefs/craft-spec.md) is asked of the server once per page (`spec`); until it lands the standard
// judges (craft-read.js SPEC); when it lands every Craft is told, and judges the page again.
const LOAD = { loading: null, crafts: new Set() };
function loadSpec() {
  if (SPEC.loaded || LOAD.loading) return;
  LOAD.loading = request('spec', {}).then((s) => {
    if (!s?.principles) { LOAD.loading = null; return; } // the server is still reading: asked again on the next pass
    SPEC.value = s; SPEC.loaded = true;
    for (const c of LOAD.crafts) c.specChanged();
  }).catch(() => { LOAD.loading = null; });
}
export const spec = { get loaded() { return SPEC.loaded; }, get value() { return SPEC.value; }, load: loadSpec };

// The theme as the rules see it: the overlay's decisions, each measured on the page once (a token written as
// calc(var(--spacing) * 3) is known in px, a colour written as oklch() in rgb). The probe is the one write the engine
// makes to the page, and it runs before any element is read in a pass.
// type steps are measured at 100px, so a relative value reads back as its em (0.05em → 5px → 0.05) and a unitless line
// height as its ratio; `own` says whether the project's theme names the step (a framework default is not the project's)
const MEASURE = {
  radius: { prop: 'border-top-left-radius', keep: /^--radius-/ }, spacing: { prop: 'padding-left', keep: /^--spacing-/ }, color: { prop: 'color', keep: /^--color-/ },
  tracking: { prop: 'letter-spacing', keep: /^--tracking-[a-z0-9-]+$/, family: 'type', font: 100 },
  leading: { prop: 'line-height', keep: /^--leading-[a-z0-9-]+$/, family: 'type', font: 100 },
  text: { prop: 'font-size', keep: /^--text-[a-z0-9]+$/, family: 'type' },
  weight: { prop: 'font-weight', keep: /^--font-weight-[a-z0-9-]+$/, family: 'type' },
};
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
  // the spec's entry for a rule: { enabled, tier, ...thresholds, want } (the standard until the project's own arrives)
  spec(id) { return SPEC.rule(id); }
  // the token policy and target: { create, name, file, shape, hash }
  tokens() { return SPEC.value.tokens; }
  get specLoaded() { return SPEC.loaded; }
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
    const out = Object.fromEntries(Object.keys(MEASURE).map((k) => [k, []]));
    for (const dec of d) {
      for (const [key, m] of Object.entries(MEASURE)) {
        if ((m.family ?? key) !== dec.family || !m.keep.test(dec.name)) continue;
        // the token's own definition first, else the variable (an inline theme defines no variable per step)
        probe.style.fontSize = m.font ? `${m.font}px` : '';
        probe.style.removeProperty(m.prop);
        probe.style.setProperty(m.prop, dec.value);
        if (!probe.style.getPropertyValue(m.prop)) probe.style.setProperty(m.prop, `var(${dec.name})`);
        const got = getComputedStyle(probe).getPropertyValue(m.prop);
        const short = dec.name.replace(/^--(?:radius|spacing|color|tracking|leading|text|font-weight)-/, ''), own = dec.origin !== 'framework';
        if (key === 'color') { const c = rgb(got); if (c && c[3] > 0.99) out.color.push({ name: dec.name, short, rgb: c.slice(0, 3), own }); }
        else if (key === 'weight') { const n = parseInt(got, 10); if (Number.isFinite(n)) out.weight.push({ name: dec.name, short, n, own }); }
        else { const n = parseFloat(got); if (Number.isFinite(n)) out[key].push({ name: dec.name, short, px: n, own, ...(m.font ? { em: n / m.font, unitless: !/px|r?em|%|calc/.test(String(dec.value)) } : {}) }); }
      }
    }
    probe.style.fontSize = '';
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
  #again = null; #waiting = false;
  #rules; #theme; #cache = new WeakMap(); // el → { sig, marks }
  // told when a late fact (an icon's ink) lands: judge the page again
  onFacts = null;
  // again: asked when elements left unjudged because they were moving have come to rest (the reader reports again)
  constructor({ rules = RULES, theme, again } = {}) {
    this.#again = again ?? null;
    INK.crafts.add(this);
    LOAD.crafts.add(this);
    this.#rules = rules;
    this.#theme = theme instanceof Theme ? theme : new Theme(theme ?? {});
    loadSpec();
  }
  // the rules as the spec has them: a rule the spec turns off is not run at all; a tier the spec sets is the rule's
  #spec = null; #active = null;
  get rules() {
    if (this.#active && this.#spec === SPEC.value) return this.#active;
    this.#spec = SPEC.value;
    return (this.#active = this.#rules.flatMap((r) => {
      const s = this.#theme.spec(r.id);
      return s.enabled === false ? [] : [Object.assign(Object.create(r), { tier: typeof s.tier === 'number' ? s.tier : r.tier ?? TIER.craft })];
    }));
  }
  get theme() { return this.#theme; }

  // Everything measured is measured again on the next run (a resize, a write, the page changed under us).
  invalidate() { this.#cache = new WeakMap(); }
  inked() { this.invalidate(); this.onFacts?.(); }
  specChanged() { this.invalidate(); this.onFacts?.(); }

  // items: [{ id, el, marks, dims, file }]. Returns the same items with each element's craft marks appended. One
  // measuring pass; no write to the page except the theme's colour probe, which runs first.
  enrich(items) {
    const t0 = performance.now();
    if (!SPEC.loaded) loadSpec();
    try {
      this.#theme.colors();
      const facts = new Facts();
      facts.items = items.filter((i) => i.checked !== false).map((i) => i.el);
      // the rules, then the hierarchy: one verdict per element: a kept mark per facet, its fix tried before it is offered (verdict.js)
      // craft judges what it can reach: an element outside the project's source has no line to fix, so it is left be
      // an element mid-animation (an entrance, a stroke drawing in) is judged at rest, not mid-flight: its craft waits
      // for this pass, and the page is judged again once what moves has stopped
      const anims = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target);
      const moving = (el) => anims.some((a) => el === a.effect.target || el.contains(a.effect.target));
      // a loop (a spinner, a marquee) never comes to rest: what it moves is never judged, and nothing waits on it
      const ending = anims.filter((a) => a.effect.getComputedTiming?.().iterations !== Infinity);
      if (ending.length && this.#again && !this.#waiting) {
        this.#waiting = true;
        Promise.allSettled(ending.map((a) => a.finished)).then(() => { this.#waiting = false; this.#again?.(); });
      }
      const out = verdicts(items.map((item) => ({ ...item, marks: [...item.marks, ...(item.checked === false || moving(item.el) ? [] : this.#marksFor(item.el, facts))] })), { facts, theme: this.#theme, rules: this.rules });
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
    const rules = this.rules;
    for (const rule of rules) if (rule.scope && rule.refines) { try { if (rule.scope({ el, facts })) for (const r of rule.refines) quiet.add(r); } catch {} }
    for (const rule of rules) {
      if (quiet.has(rule.id)) continue;
      let found = [];
      try { found = rule.check({ el, facts }, this.#theme) ?? []; } catch { found = []; } // a rule's error is its own, never the page's
      for (const f of found) if ((f.confidence ?? 0) >= FLOOR) marks.push(markOf({ tier: rule.tier, ...f, rule: rule.id, key: f.key ?? rule.id, suggest: important(f.suggest) }));
    }
    this.#cache.set(el, { sig, marks });
    return marks;
  }
}

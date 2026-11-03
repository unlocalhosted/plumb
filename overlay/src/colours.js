/* ─────────────────────────────────────────────────────────
 * COLOURS · React Plumber overlay (docs/briefs/pass-colour.md, layer 1: read and propose, at scope keep)
 *
 * The colour pass's reading, one family over from stacks.js. One reader for the page and the census
 * (src/census.ts loads this module in the page), so the site's palette and this page's places are measured the same way.
 *
 *  read     readColours() → [{ el, colours: { text?, bg?, border? } }]; each colour is { cls, css, oklab, rgb, under, ... }:
 *           `cls` the class at the usage that sets it (or null), `css` the computed colour, `oklab` that colour
 *           composited over the element's painted ground (what is seen), `why` set when it can't be rewritten
 *           (an inline style, a stylesheet, a variable the app computes, a gradient). The array carries `content`
 *           (places skipped as content: svg, canvas, images, excluded paths)
 *  palette  paletteOf() → the theme's colour tokens [{ name, short, role, css, rgb, oklab, utility: { text, bg, border } }],
 *           role by name first, value second. Read from the page; loadPalette() adds the server's decisions (an
 *           `@theme inline` theme leaves no variable per token on the page, so unused tokens are only in the decisions)
 *  propose  proposeColours(places, palette, { scope: 'keep' }) → { moves, kept, refused, content, measure }
 *    keep   a class whose composited colour is within ΔE_ok 0.03 of a token of the right role family folds into it;
 *           a fourth grey level goes to the nearest of the page's three; text faded by opacity goes to the grey that
 *           matches; pure black and white go to the off-black and off-white token. Every move passes the contrast
 *           guard (APCA, craft/contrast's floor). No new values: a hue no token is near is kept and said
 *  never    content colours, anything without a locatable class, gradients
 * ───────────────────────────────────────────────────────── */
import { oklab, toRgb } from './craft-headless.js';
import { apca, colourClass } from './craft-rules.js';
import { SPEC, utility } from './craft-read.js';

const DE_OK = 0.03;      // keep: indistinguishable in UI (pass-colour.md step 4)
const GREY_CLUSTER = 0.04; // two text colours this close are one grey level (craft.js census 'textColors')
const GREY_REACH = 0.12; // a fourth grey goes to the nearest level only when one is this near
const PURE_REACH = 0.2;  // pure black or white goes to the off-black/off-white token only when one is this near
const MERGE = 0.01;      // distinct colours in the measure: closer than this is one
const CONTENT = 'plumb-overlay, svg, canvas, img, video, picture';
const PROPS = ['text', 'bg', 'border'];
const FOR = { text: ['text', 'accent', 'status'], bg: ['surface', 'accent', 'status'], border: ['line', 'accent', 'status'] };
const PRIMARY = { text: 'text', bg: 'surface', border: 'line' };
const CSS_PROP = { text: 'color', bg: 'background-color', border: 'border-color' };

const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const chroma = (l) => Math.hypot(l[1], l[2]);
const over = (f, g) => [0, 1, 2].map((i) => f[i] * f[3] + g[i] * (1 - f[3]));
const round3 = (l) => l.map((v) => Math.round(v * 1000) / 1000);
const hex = (c) => '#' + [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(c[i]))).toString(16).padStart(2, '0')).join('');
const near = (a, b) => a && b && Math.abs(a[0] - b[0]) <= 1.5 && Math.abs(a[1] - b[1]) <= 1.5 && Math.abs(a[2] - b[2]) <= 1.5 && Math.abs((a[3] ?? 1) - (b[3] ?? 1)) <= 0.02;

// ── the theme's colour tokens ───────────────────────────────

// default-palette names are Tailwind's, not the project's (craft-rules.js PALETTE)
const DEFAULT = /^(?:black|white|transparent|current|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})$/;

// the role of a token: by name first (fg, muted, surface, line, accent, success …), by value second (L, chroma and alpha)
export function roleOf(short, lab, alpha) {
  const n = short.toLowerCase();
  if (/(^|-)(success|warning|danger|error|destructive|negative|positive|caution)(-|$)/.test(n)) return 'status';
  if (/(^|-)info(-|$)/.test(n)) return 'status';
  if (/(^|-)(line|border|divider|rule|outline|separator|hairline|stroke)(-|$)/.test(n)) return 'line';
  if (/(^|-)on(-|$)/.test(n)) return 'text'; // on-accent: the words on the accent
  if (/(^|-)(accent|primary|brand|draw|link|highlight|ink)(-|$)/.test(n)) return 'accent';
  if (/(^|-)(bg|background|surface|sunken|canvas|paper|card|panel|page|hover|pressed|elevated|popover|overlay)(-|$)/.test(n)) return 'surface';
  if (/(^|-)(fg|foreground|text|muted|faint|subtle|body|heading|on)(-|$)/.test(n)) return 'text';
  if (/(^|-)(scrim|shadow|grid|ring|focus|selection)(-|$)/.test(n)) return 'other';
  if (chroma(lab) > 0.06) return 'accent';
  if (alpha < 1 && lab[0] < 0.3) return 'line';
  return lab[0] > 0.9 ? 'surface' : 'text';
}

let decisions = null; // the server's decisions, once loadPalette has them
let known = null;     // the last palette read, for readColours when none is given

const probeBox = () => { const b = document.createElement('div'); b.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;contain:strict;'; return b; };

// the names of `--color-*` variables and of colour utilities (`.bg-surface`) written in the page's stylesheets
function scanSheets() {
  const vars = new Set(), classes = new Map();
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) { try { walk(rule.cssRules); } catch { /* cross-origin */ } }
      const st = rule.style; if (!st) continue;
      for (let i = 0; i < st.length; i++) if (st[i].startsWith('--color-')) vars.add(st[i]);
      const m = /^\.((?:bg|text|border)-[a-z][a-z0-9-]*)$/.exec(rule.selectorText ?? '');
      if (m) {
        const [prefix] = m[1].split('-');
        if (prefix === 'text' ? st.getPropertyValue('color') : prefix === 'bg' ? st.getPropertyValue('background-color') : st.getPropertyValue('border-color')) classes.set(m[1], prefix);
      }
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
  return { vars, classes };
}

/** The theme's colour tokens, as the page paints them. */
export function paletteOf() {
  const { vars, classes } = scanSheets();
  const found = new Map(); // short → { name, expression }
  for (const d of decisions ?? []) if (d.family === 'color' && /^--color-/.test(d.name) && d.origin !== 'framework') found.set(d.name.slice(8), { name: d.name, expr: d.resolved || d.value });
  for (const v of vars) { const s = v.slice(8); if (!found.has(s)) found.set(s, { name: v, expr: `var(${v})` }); }
  for (const [cls] of classes) { const s = cls.replace(/^(?:bg|text|border)-/, ''); if (!found.has(s)) found.set(s, { name: `--color-${s}`, expr: null, cls }); }
  found.delete('transparent'); found.delete('current'); found.delete('inherit');
  for (const [s, t] of [...found]) if ((DEFAULT.test(s) || /^(?:transparent|current|inherit)$/.test(s)) && !decisions?.some((d) => d.name === t.name && d.origin !== 'framework')) found.delete(s);
  const box = probeBox(), probes = [];
  for (const [short, t] of found) {
    const i = document.createElement('i');
    if (t.expr) i.style.color = t.expr; else i.className = t.cls;
    box.append(i); probes.push([short, t, i]);
  }
  document.body.append(box);
  const tokens = [];
  for (const [short, t, i] of probes) {
    const css = getComputedStyle(i).color, rgb = toRgb(css);
    if (!rgb || (!t.expr && !t.cls)) continue;
    // `color` always has a value; a variable that is not defined falls back to the inherited colour, so check the definition
    if (t.expr?.startsWith('var(') && !getComputedStyle(document.documentElement).getPropertyValue(t.name).trim() && !decisions?.some((d) => d.name === t.name)) continue;
    const lab = oklab(over(rgb, [255, 255, 255]));
    tokens.push({ name: t.name, short, role: roleOf(short, lab, rgb[3]), css, rgb, oklab: lab, utility: { text: `text-${short}`, bg: `bg-${short}`, border: `border-${short}` } });
  }
  box.remove();
  return (known = tokens);
}

/** The palette with the server's decisions in: awaits them once. A page with a theme written as `@theme inline` needs them. */
export async function loadPalette() {
  if (!decisions) {
    try { const { request } = await import('./api.js'); const d = await request('decisions', {}); if (Array.isArray(d)) decisions = d; } catch { /* the page's own variables are what is left */ }
  }
  return paletteOf();
}
if (typeof document !== 'undefined' && document.querySelector('script[data-plumb-token]')) loadPalette().catch(() => {});

// ── reading the page ────────────────────────────────────────

// what an element draws, as computed: { text, bg, border } raw, plus whether a gradient or image sits behind
function drawn(el, cs) {
  const out = {};
  if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) return out;
  const words = [...el.childNodes].some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue ?? '')) || /^(input|textarea|select)$/.test(el.localName);
  if (words) { const c = toRgb(cs.color); if (c && c[3] > 0) out.text = c; }
  const bg = toRgb(cs.backgroundColor);
  if (cs.backgroundImage && cs.backgroundImage !== 'none') out.image = cs.backgroundImage;
  else if (bg && bg[3] > 0) out.bg = bg;
  const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs[`border${s}Width`]) > 0 && !/^(none|hidden)$/.test(cs[`border${s}Style`]));
  if (sides.length) {
    const colours = sides.map((s) => cs[`border${s}Color`]), c = toRgb(colours[0]);
    if (c && c[3] > 0) out.border = { rgb: c, css: colours[0], mixed: colours.some((x) => x !== colours[0]) };
  }
  return out;
}

// the painted ground an element sits on, with its own background in (memoised for the read)
function fullGround(el, memo) {
  if (memo.has(el)) return memo.get(el);
  const parent = el.parentElement, below = parent ? fullGround(parent, memo) : { rgb: [255, 255, 255], fuzzy: false, el: null };
  const cs = getComputedStyle(el), bg = toRgb(cs.backgroundColor), image = cs.backgroundImage && cs.backgroundImage !== 'none';
  const out = bg && bg[3] > 0 ? { rgb: over(bg, below.rgb), fuzzy: below.fuzzy || image, el: bg[3] >= 0.99 ? el : below.el } : { rgb: below.rgb, fuzzy: below.fuzzy || image, el: image ? el : below.el };
  memo.set(el, out);
  return out;
}

const inline = (el, re) => re.test(el.getAttribute('style') ?? '');
const VAR = /\[[^\]]*var\(/;

/** Every in-system place's colours: text (only where words are drawn), background, border (only where one is drawn). */
export function readColours(root = document.body, { exclude = [], palette = paletteOf() } = {}) {
  const theme = { colors: () => palette.map((t) => ({ short: t.short, rgb: t.rgb })) };
  const memo = new Map(), places = new Map(), keep = [];
  places.content = 0;
  const cut = exclude.length ? exclude.join(',') : null;
  const pageL = oklab(fullGround(document.body, memo).rgb)[0];
  const place = (el) => { let p = places.get(el); if (!p) places.set(el, (p = { el, colours: {} })); return p; };
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay')) continue;
    const cs = getComputedStyle(el), d = drawn(el, cs);
    const content = el.closest(CONTENT) || (cut && el.closest(cut));
    if (content) { places.content += ['text', 'bg', 'border', 'image'].filter((k) => d[k]).length; continue; }
    if (d.text) {
      // the element that sets the colour: this one, or the nearest above it that does (text inherits its colour)
      let owner = el, ocs = cs, base = false;
      for (;;) {
        if (colourClass(owner, 'text', theme) || inline(owner, /(^|[;\s])color\s*:/)) break;
        const p = owner.parentElement;
        if (!p || p === document.documentElement) { base = true; break; }
        const pcs = getComputedStyle(p);
        if (pcs.color !== ocs.color) break;
        owner = p; ocs = pcs;
      }
      if (!owner.hasAttribute('data-plumb-source')) { owner = el; ocs = cs; }
      // a fade at rest is the text's colour; none at all (waiting to be revealed) or a fade still running is not
      const op = parseFloat(ocs.opacity), moving = owner.getAnimations?.().length > 0 || el.getAnimations?.().length > 0;
      if (op < 0.05) { /* not shown: nothing to read */ }
      else {
      const target = place(owner);
      if (target.colours.text) target.colours.text.uses++;
      else {
        const g = fullGround(el, memo), faded = !moving && op < 1 && utility(owner, 'opacity');
        const a = d.text[3] * (moving ? 1 : op || 1), cls = base ? null : colourClass(owner, 'text', theme);
        const rgb = [d.text[0], d.text[1], d.text[2], a], comp = over(rgb, g.rgb), lab = oklab(comp);
        const e = { prop: 'text', cls, css: cs.color, rgb, alpha: d.text[3], under: g.rgb, comp, oklab: lab, groundEl: g.el, fuzzy: g.fuzzy, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400, uses: 1, drop: faded || null,
          level: chroma(lab) < 0.04 && chroma(oklab(g.rgb)) < 0.04 && Math.abs(oklab(g.rgb)[0] - pageL) <= 0.25 };
        if (cls && VAR.test(cls)) { e.why = 'a colour the app computes (a variable)'; e.data = true; }
        else if (!cls && inline(owner, /(^|[;\s])color\s*:/)) e.why = 'set by an inline style', e.data = true;
        else if (!cls && !base) e.why = 'set by a stylesheet, not a class here';
        else if (!cls) e.inherited = true;
        target.colours.text = e; keep.push(e);
      }
      }
    }
    if (d.image) {
      const e = { prop: 'bg', cls: colourClass(el, 'bg', theme), css: d.image.length > 60 ? d.image.slice(0, 57) + '…' : d.image, why: /gradient\(/.test(d.image) ? 'a gradient' : 'a background image' };
      place(el).colours.bg = e;
    } else if (d.bg) {
      const below = el.parentElement ? fullGround(el.parentElement, memo) : { rgb: [255, 255, 255], fuzzy: false }, comp = over(d.bg, below.rgb);
      const cls = colourClass(el, 'bg', theme);
      const e = { prop: 'bg', cls, css: cs.backgroundColor, rgb: d.bg, under: below.rgb, comp, oklab: oklab(comp), fuzzy: below.fuzzy };
      if (cls && VAR.test(cls)) { e.why = 'a colour the app computes (a variable)'; e.data = true; }
      else if (inline(el, /background(-color)?\s*:/)) { e.why = 'set by an inline style'; e.cls = null; e.data = true; }
      else if (!cls) e.why = 'set by a stylesheet, not a class here';
      place(el).colours.bg = e; keep.push(e);
    }
    if (d.border) {
      const g = fullGround(el, memo), cls = colourClass(el, 'border', theme), comp = over(d.border.rgb, g.rgb);
      const e = { prop: 'border', cls, css: d.border.css, rgb: d.border.rgb, under: g.rgb, comp, oklab: oklab(comp), fuzzy: g.fuzzy };
      if (d.border.mixed) e.why = 'the sides are different colours';
      else if (cls && VAR.test(cls)) { e.why = 'a colour the app computes (a variable)'; e.data = true; }
      else if (inline(el, /border[a-z-]*\s*:/)) { e.why = 'set by an inline style'; e.cls = null; e.data = true; }
      else if (!cls && d.border.css === cs.color) e.inherited = true; // the border follows the text colour (currentColor)
      else if (!cls) e.why = 'set by a stylesheet, not a class here';
      place(el).colours.border = e; keep.push(e);
    }
  }
  // a class counts only when it is what paints the colour: a fresh element with only that class must paint the same
  const box = probeBox(), probes = new Map();
  box.style.color = 'rgb(1, 2, 3)'; // a class that does not exist paints this (or currentColor of it), never the page's colour
  for (const e of keep) {
    if (e.cls && !e.why && /^(?:bg|text|border)-current(?:\/|$)/.test(e.cls)) { e.why = 'it follows the text colour (currentColor)'; e.set = e.cls; e.cls = null; }
    if (!e.cls || e.why) continue;
    const k = `${e.prop}|${e.cls}`;
    if (probes.has(k)) continue;
    const i = document.createElement('i'); i.className = e.cls;
    if (e.prop === 'border') i.style.cssText = 'border-style:solid;border-width:1px;';
    box.append(i); probes.set(k, i);
  }
  document.body.append(box);
  const painted = new Map();
  for (const [k, i] of probes) { const s = getComputedStyle(i), prop = k.split('|')[0]; painted.set(k, toRgb(prop === 'text' ? s.color : prop === 'bg' ? s.backgroundColor : s.borderTopColor)); }
  box.remove();
  for (const e of keep) {
    if (!e.cls || e.why) continue;
    const p = painted.get(`${e.prop}|${e.cls}`);
    if (!near(p, e.rgb) && !(e.drop && p && near(p, [e.rgb[0], e.rgb[1], e.rgb[2], p[3]]))) { e.why = 'the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet)'; e.set = e.cls; e.cls = null; }
  }
  const out = [...places.values()];
  out.content = places.content;
  return out;
}

/** The places as rows the census keeps: { stamp, prop, oklab, cls }, with `data: true` where an inline style or a variable the app computes sets it (content, not the pass's own). */
export function colourRows(places) {
  const rows = [];
  for (const pl of places) {
    const stamp = pl.el.getAttribute('data-plumb-source');
    for (const [prop, c] of Object.entries(pl.colours)) if (c.oklab) rows.push({ stamp, prop, oklab: round3(c.oklab), cls: c.cls ?? null, ...(c.data ? { data: true } : {}) });
  }
  return rows;
}

// ── proposing ───────────────────────────────────────────────

const lcOf = (text, ground) => Math.abs(apca(text, ground));
function need(size, weight) {
  const T = { small: 60, bold: 50, large: 45, largeAt: 24, boldLargeAt: 18, boldAt: 14, boldWeight: 600, ...SPEC.rule('craft/contrast') };
  const large = size >= T.largeAt || (size >= T.boldLargeAt && weight >= T.boldWeight);
  return large ? T.large : size >= T.boldAt && weight >= T.boldWeight ? T.bold : T.small;
}
// a colour as the token would paint it over the same ground
const asToken = (t, under) => over(t.rgb, under);

// distinct colours, closer than MERGE counted as one
function distinct(labs) {
  const seen = [];
  for (const l of labs) if (!seen.some((s) => dE(s, l) <= MERGE)) seen.push(l);
  return seen.length;
}

export function proposeColours(places, palette = known ?? paletteOf(), { scope = 'keep' } = {}) {
  const moves = [], refused = [], examples = new Map(), hues = new Map();
  let onToken = 0, inherited = 0;
  const after = new Map(); // entry → oklab after
  const tokens = palette.filter((t) => t.role !== 'other');
  const named = new Map();
  for (const t of tokens) for (const p of PROPS) named.set(t.utility[p], t);

  // the grey levels: clusters of the neutral text colours the page's own surfaces carry (craft.js census 'textColors')
  const T17 = { sample: 20, minority: 0.1, ...SPEC.rule('craft/grey-levels') };
  const levels = [];
  const texts = places.map((p) => p.colours.text).filter((e) => e?.level && e.oklab);
  for (const e of texts) { const k = levels.find((x) => dE(x.lab, e.oklab) <= GREY_CLUSTER); if (k) k.members.push(e); else levels.push({ lab: e.oklab, members: [e] }); }
  levels.sort((a, b) => b.members.length - a.members.length);
  const top = levels.slice(0, 3), sampleN = texts.length;
  const greyActive = sampleN >= T17.sample && levels.length > 3;
  // the theme's own grey text tokens are the levels when it has them (fg, muted, faint): the clean-up knows the roles,
  // so a grey of the page's own needs no page statistics to be told from them, however few its words
  const textGreys = tokens.filter((t) => t.role === 'text' && chroma(t.oklab) < 0.03).length >= 2;

  // the text that sits on each background, so a surface move is judged by the words on it
  const on = new Map();
  for (const e of places.map((p) => p.colours.text)) if (e?.groundEl) { if (!on.has(e.groundEl)) on.set(e.groundEl, []); on.get(e.groundEl).push(e); }

  // the closest token of the right family to a colour over its ground
  const nearest = (e, prop, roles = FOR[prop], { anyAlpha = false } = {}) => {
    let best = null;
    for (const t of tokens) {
      if (!roles.includes(t.role)) continue;
      // a translucent colour shows what is behind it, and an opaque one does not: they trade places only for faded text
      if (!anyAlpha && (t.rgb[3] < 1) !== ((e.alpha ?? e.rgb?.[3] ?? 1) < 1)) continue;
      // a grey does not become a tint, nor a tint a grey, whatever the distance on this ground
      if (e.rgb && (chroma(oklab(e.rgb)) < 0.03) !== (chroma(oklab(t.rgb)) < 0.03)) continue;
      const de = dE(e.oklab, oklab(asToken(t, e.under))), score = de + (t.role === PRIMARY[prop] ? 0 : 0.0005);
      if (!best || score < best.score) best = { t, de, score };
    }
    return best;
  };

  // the contrast guard: null when the move is fine, else why it is refused
  const guard = (pl, e, prop, t, rule) => {
    const to = asToken(t, e.under);
    if (e.fuzzy && (rule !== 'arbitrary-fold' || e.rgb[3] < 1 || t.rgb[3] < 1)) return 'it sits on a gradient or an image, so its contrast cannot be measured';
    if (prop === 'text') {
      const before = lcOf(e.comp, e.under), now = lcOf(to, e.under), floor = need(e.size, e.weight);
      if (now < floor && now < before - 0.5) return `contrast would fall from Lc ${Math.round(before)} to ${Math.round(now)} (it needs ${floor})`;
    } else if (prop === 'bg') {
      for (const x of on.get(pl.el) ?? []) {
        const textNow = over(x.rgb, to), textWas = x.comp, floor = need(x.size, x.weight);
        const before = lcOf(textWas, x.under), now = lcOf(textNow, to);
        if (now < floor && now < before - 0.5) return `the words on it would fall from Lc ${Math.round(before)} to ${Math.round(now)} (they need ${floor})`;
      }
    }
    return null;
  };

  const consider = (pl, prop, e, t, de, rule, extra = {}) => {
    const why = guard(pl, e, prop, t, rule);
    if (why) { refused.push({ el: pl.el, prop, why, css: e.css }); return true; }
    moves.push({ el: pl.el, prop, from: { cls: e.cls, css: e.css }, to: { token: t.short, cls: t.utility[prop], css: t.css }, de: Math.round(de * 1000) / 1000, rule, ...extra });
    after.set(e, oklab(asToken(t, e.under)));
    return true;
  };

  for (const pl of places) for (const prop of PROPS) {
    const e = pl.colours[prop];
    if (!e) continue;
    if (e.why) { refused.push({ el: pl.el, prop, why: e.why, css: e.css }); continue; }
    if (e.inherited) { inherited++; continue; }
    // text faded by opacity: the grey that matches what is seen. The colour class stays, the opacity goes, so this is a
    // move the writer makes in two classes: no from.cls for a plain swap, and `set` and `drop` say the two
    if (prop === 'text' && e.drop) {
      const best = nearest(e, 'text', FOR.text, { anyAlpha: true });
      if (best && best.de <= DE_OK) { consider(pl, prop, { ...e, cls: null }, best.t, best.de, 'text-opacity', { set: e.cls, drop: e.drop }); continue; }
    }
    const tok = e.cls && named.get(e.cls);
    if (tok) {
      onToken++;
      const k = `${prop}|${e.cls}`; examples.set(k, (examples.get(k) ?? 0) + 1);
      continue;
    }
    const best = nearest(e, prop);
    if (best && best.de <= DE_OK) { consider(pl, prop, e, best.t, best.de, 'arbitrary-fold'); continue; }
    // pure black and white: the off-black and off-white token the theme has
    const pure = e.rgb[3] >= 1 && ((e.rgb[0] === 0 && e.rgb[1] === 0 && e.rgb[2] === 0) || (e.rgb[0] === 255 && e.rgb[1] === 255 && e.rgb[2] === 255));
    if (pure) {
      let p = null;
      for (const t of tokens) {
        if (![...FOR[prop], 'text'].includes(t.role) || chroma(t.oklab) > 0.03 || t.rgb[3] < 1) continue;
        const de = dE(e.oklab, oklab(asToken(t, e.under)));
        if (de <= PURE_REACH && (!p || de < p.de)) p = { t, de };
      }
      if (p) { consider(pl, prop, e, p.t, p.de, 'pure-black-white'); continue; }
    }
    // a fourth grey: the nearest of the page's three levels, as a token
    if (prop === 'text' && textGreys && e.level && e.cls && chroma(e.oklab) < 0.03) {
      const level = nearest(e, 'text', ['text'], { anyAlpha: true });
      if (level && level.de <= GREY_REACH) { consider(pl, prop, e, level.t, level.de, 'grey-levels'); continue; }
    }
    else if (prop === 'text' && greyActive && e.level && e.cls) {
      // within a grey level's width (the census merges text colours this close) of one of your text tokens: the same grey
      const same = nearest(e, 'text', ['text'], { anyAlpha: true });
      if (same && same.de <= GREY_CLUSTER) { consider(pl, prop, e, same.t, same.de, 'grey-levels'); continue; }
      const k = levels.find((x) => x.members.includes(e));
      if (k && !top.includes(k) && k.members.length / sampleN <= T17.minority) {
        const level = top.slice().sort((a, b) => dE(a.lab, e.oklab) - dE(b.lab, e.oklab))[0];
        const target = level && dE(level.lab, e.oklab) <= GREY_REACH ? nearest({ oklab: level.lab, under: e.under, alpha: 1 }, 'text', ['text'], { anyAlpha: true }) : null;
        if (target && target.de <= DE_OK) { consider(pl, prop, e, target.t, dE(e.oklab, oklab(asToken(target.t, e.under))), 'grey-levels'); continue; }
      }
    }
    // no token is near: kept, and said
    const key = `${prop}|${hex(e.comp)}`, h = hues.get(key);
    if (h) h.count++;
    else hues.set(key, { prop, css: hex(e.comp), cls: e.cls, count: 1, nearest: (() => { const n = nearest(e, prop, FOR[prop], { anyAlpha: true }); return n ? { token: n.t.short, de: Math.round(n.de * 1000) / 1000 } : null; })(), why: 'no colour of yours is near it' });
  }

  const measure = {};
  for (const prop of PROPS) {
    const es = places.map((p) => p.colours[prop]).filter((e) => e?.oklab && !e.data);
    measure[prop] = [distinct(es.map((e) => e.oklab)), distinct(es.map((e) => after.get(e) ?? e.oklab))];
  }
  const kept = {
    count: onToken + inherited,
    onToken, inherited,
    examples: [...examples].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => ({ prop: k.split('|')[0], cls: k.split('|')[1], count: n })),
    hues: [...hues.values()].sort((a, b) => b.count - a.count),
  };
  return { moves, kept, refused, content: places.content ?? 0, measure };
}

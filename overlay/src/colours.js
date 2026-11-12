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
 *  roles    a token's `kind` is its role (docs/research/colour-system.md §2.2: ground, surface, sunken, fg, muted, faint,
 *           on-accent, line, line-strong, accent, accent-hover, accent-soft, ink2*, success, warning, danger, info), read by name
 *           first, value second (§4.1, §4.2). readRoles() reads each place into its role by usage: property, element, painted
 *           area (§4.3). Role wins over distance (§9.1): a colour folds to a token of ITS role, not to the nearest value
 *  propose  proposeColours(places, palette, { scope: 'keep' | 'refine' }) → { moves, kept, refused, content, measure }
 *           each move: { el, prop, from, to, de, rule, law, role }, `rule` the §5 row id, `law` its law column
 *    keep   a class within our visibility threshold (ΔE_ok 0.03) of a token of its role folds into it; a fourth grey goes to
 *           the nearest of the three text levels; text faded by opacity goes to the level it composites to; pure black and
 *           white go to the off-black and off-white token; status colours snap only to their own status token. Every move
 *           passes the contrast guard (APCA, craft/contrast's floor). No new values: a hue no token is near is kept and said
 *    refine the same rows at their wider reach (0.05, 0.18), plus the rows keep only lists: a control fill becomes the accent
 *           (by role), a stray hue near the accent folds in, meaningless coloured text goes neutral, a control edge under
 *           WCAG 3:1 is raised to line-strong, a gradient that is a surface becomes the surface token
 *  never    content colours, anything without a locatable class, gradients (at keep)
 * ───────────────────────────────────────────────────────── */
import { oklab, toRgb } from './craft-headless.js';
import { apca, colourClass } from './craft-rules.js';
import { SPEC, utility } from './craft-read.js';

const DE_OK = 0.03;      // keep: indistinguishable in UI (pass-colour.md step 4), our visibility threshold (§1.1)
const GREY_CLUSTER = 0.04; // two text colours this close are one grey level (craft.js census 'textColors')
const PURE_REACH = 0.2;  // pure black or white goes to the off-black/off-white token only when one is this near (§5)
const MERGE = 0.01;      // distinct colours in the measure: closer than this is one
const CONTENT = 'plumb-overlay, svg, canvas, img, video, picture';
const PROPS = ['text', 'bg', 'border'];
const CSS_PROP = { text: 'color', bg: 'background-color', border: 'border-color' };
// §5: the reach of each row at each scope (keep never adds values; refine may merge toward the system)
const REACH = {
  keep: { fold: 0.03, grey: 0.12, status: 0.03, stray: 0 },
  refine: { fold: 0.05, grey: 0.18, status: 0.12, stray: 40 },
};
const FADED = 0.03;      // §5 faded text: both scopes
// §5 "Law" column, per row id
const LAW = {
  'near-copy': 'similarity',
  'extra-grey': 'similarity, cognitive load',
  'faded-text': 'similarity',
  'pure-black-white': 'aesthetic-usability',
  'stray-hue': 'Von Restorff',
  'tinted-surface': 'Von Restorff, preattentive',
  'second-accent': 'Von Restorff',
  'no-meaning-text': 'cognitive load',
  'status-hue': 'colour carries meaning',
  'line-too-faint': 'contrast',
};
// §4.2 hue bands (OKLab hue, degrees) that can be a status, only when usage agrees
const BANDS = [['danger', 20, 40], ['warning', 60, 100], ['success', 130, 165], ['info', 230, 265]];

const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const chroma = (l) => Math.hypot(l[1], l[2]);
const hue = (l) => (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360;
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const over = (f, g) => [0, 1, 2].map((i) => f[i] * f[3] + g[i] * (1 - f[3]));
const round3 = (l) => l.map((v) => Math.round(v * 1000) / 1000);
const hex = (c) => '#' + [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(c[i]))).toString(16).padStart(2, '0')).join('');
const near = (a, b) => a && b && Math.abs(a[0] - b[0]) <= 1.5 && Math.abs(a[1] - b[1]) <= 1.5 && Math.abs(a[2] - b[2]) <= 1.5 && Math.abs((a[3] ?? 1) - (b[3] ?? 1)) <= 0.02;

// ── the theme's colour tokens ───────────────────────────────

// default-palette names are Tailwind's, not the project's (craft-rules.js PALETTE)
const DEFAULT = /^(?:black|white|transparent|current|inherit|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})$/;

// a token named as a path, category first (docs/design/token-spec.md §3): `text-secondary`, `background-primary-hover`,
// `border-focus-ring`, `accent-600`, `state-success-text`. The category decides the family, so `primary` in
// `text-primary` is the first grey, not the accent. Null when the name is not a path; the word match below reads it.
const STATUS = { success: 'success', positive: 'success', warning: 'warning', caution: 'warning', error: 'danger', danger: 'danger', destructive: 'danger', negative: 'danger', info: 'info' };
const statusIn = (parts) => { for (const w of parts) if (STATUS[w]) return STATUS[w]; return null; };
const GREY = (parts) => parts.some((w) => /^(secondary)$/.test(w)) ? 'muted' : parts.some((w) => /^(tertiary|quaternary|placeholder|disabled)$/.test(w)) ? 'faint' : 'fg';
export function pathOf(short) {
  const [cat, ...rest] = short.toLowerCase().split('-');
  if (cat === 'text' || cat === 'foreground') {
    const st = statusIn(rest); if (st) return { role: 'status', kind: st };
    if (rest.some((w) => w === 'white' || w === 'on')) return { role: 'text', kind: 'on-accent' };
    return { role: 'text', kind: GREY(rest) };
  }
  if (cat === 'background') {
    const st = statusIn(rest); if (st) return { role: 'status', kind: st };
    if (!rest.length || rest[0] === 'full') return { role: 'surface', kind: 'ground' }; // `background` alone is the page (shadcn)
    const state = rest.at(-1);
    if (state === 'hover') return { role: 'surface', kind: 'hover' };
    if (state === 'active' || state === 'pressed') return { role: 'surface', kind: 'pressed' };
    if (state === 'disabled') return { role: 'other', kind: 'other' };
    return { role: 'surface', kind: /^(secondary|tertiary|quaternary)$/.test(rest[0] ?? '') ? 'sunken' : 'surface' };
  }
  if (cat === 'border' || cat === 'separator') {
    if (rest.some((w) => w === 'focus' || w === 'ring')) return { role: 'other', kind: 'other' };
    const st = statusIn(rest); if (st) return { role: 'status', kind: st };
    return { role: 'line', kind: rest.some((w) => /^(strong|heavy|bold)$/.test(w)) ? 'line-strong' : 'line' };
  }
  if (cat === 'accent' && /^\d{2,3}$/.test(rest[0] ?? '')) {
    // the ramp: 500 rests, 600 is its hover, 50/100 its tint; the other stops are not roles of their own
    const stop = Number(rest[0]);
    return stop === 500 ? { role: 'accent', kind: 'accent' } : stop === 600 ? { role: 'accent', kind: 'accent-hover' } : stop <= 100 ? { role: 'accent', kind: 'accent-soft' } : { role: 'other', kind: 'other' };
  }
  if (cat === 'ink2') {
    // plumber's own name for a second ink (token-spec §3.3): its default, hover and soft, like the accent's
    const state = rest.at(-1);
    return { role: 'accent', kind: state === 'hover' ? 'ink2-hover' : state === 'soft' || state === 'tint' ? 'ink2-soft' : 'ink2' };
  }
  if (cat === 'state') { const st = statusIn(rest); return st ? { role: 'status', kind: st } : { role: 'other', kind: 'other' }; }
  if (cat === 'status' || cat === 'chart') return { role: 'other', kind: 'other' }; // categories and data: content, not UI roles
  return null;
}

// the role of a token: a path name first, then by name (fg, muted, surface, line, accent, success …), then by value
export function roleOf(short, lab, alpha) {
  const path = pathOf(short); if (path) return path.role;
  const n = short.toLowerCase();
  if (/(^|-)(success|warning|danger|error|destructive|negative|positive|caution)(-|$)/.test(n)) return 'status';
  if (/(^|-)info(-|$)/.test(n)) return 'status';
  if (/(^|-)(line|border|divider|rule|outline|separator|hairline|stroke)(-|$)/.test(n)) return 'line';
  if (/(^|-)on(-|$)/.test(n)) return 'text'; // on-accent: the words on the accent
  if (/(^|-)(accent|primary|brand|draw|link|highlight|ink)(-|$)/.test(n)) return 'accent';
  if (/(^|-)(bg|background|surface|sunken|canvas|paper|card|panel|page|ground|well|inset|raised|hover|pressed|elevated|popover|overlay)(-|$)/.test(n)) return 'surface';
  if (/(^|-)(fg|foreground|text|muted|faint|subtle|secondary|tertiary|placeholder|disabled|body|heading|on)(-|$)/.test(n)) return 'text';
  if (/(^|-)(scrim|shadow|grid|ring|focus|selection)(-|$)/.test(n)) return 'other';
  if (chroma(lab) > 0.06) return 'accent';
  if (alpha < 1 && lab[0] < 0.3) return 'line';
  return lab[0] > 0.9 ? 'surface' : 'text';
}

// the spec role of a token (§2.2): by name first (§4.1), value second (§4.2). `role` above is the coarse family
export function kindOf(short, role) {
  const path = pathOf(short); if (path && path.role === role) return path.kind;
  const n = short.toLowerCase(), has = (re) => re.test(n);
  if (role === 'status') return has(/info/) ? 'info' : has(/success|positive/) ? 'success' : has(/warning|caution/) ? 'warning' : 'danger';
  if (role === 'line') return has(/(^|-)(strong|heavy|bold)(-|$)/) ? 'line-strong' : 'line';
  if (role === 'accent') return has(/(^|-)disabled(-|$)/) ? 'other' : has(/(^|-)hover(-|$)/) ? 'accent-hover' : has(/(^|-)(active|pressed)(-|$)/) ? 'accent-active' : has(/(^|-)(soft|tint)(-|$)/) ? 'accent-soft' : 'accent';
  if (role === 'text') return has(/(^|-)on(-|$)/) ? 'on-accent' : has(/(^|-)(muted|subtle|secondary)(-|$)/) ? 'muted' : has(/(^|-)(faint|tertiary|placeholder|disabled)(-|$)/) ? 'faint' : 'fg';
  if (role === 'surface') return has(/(^|-)disabled(-|$)/) ? 'other' : has(/(^|-)hover(-|$)/) ? 'hover' : has(/(^|-)(active|pressed)(-|$)/) ? 'pressed' : has(/(^|-)(sunken|well|inset)(-|$)/) ? 'sunken' : has(/(^|-)(bg|background|canvas|paper|page|ground)(-|$)/) ? 'ground' : 'surface';
  return 'other';
}

// §2.3 / §9.2: one accent; a second hued family the theme names (draw beside accent) is a second ink, a role of its own
const baseOf = (short) => short.toLowerCase().replace(/-(default|hover|pressed|active|soft|tint|subtle|strong)$/, '');
function assignInks(tokens) {
  const bases = [];
  for (const t of tokens) if (t.role === 'accent' && !bases.includes(baseOf(t.short))) bases.push(baseOf(t.short));
  const opaque = (b) => tokens.some((t) => baseOf(t.short) === b && t.role === 'accent' && t.rgb[3] >= 1 && chroma(t.oklab) > 0.06);
  const primary = bases.find((b) => /^(accent|primary|brand)$/.test(b) && opaque(b)) ?? bases.find((b) => !/^ink2/.test(b) && opaque(b)) ?? bases.find(opaque);
  for (const t of tokens) {
    if (t.role !== 'accent' || baseOf(t.short) === primary || !bases.some(opaque)) continue;
    if (opaque(baseOf(t.short))) { t.kind = t.kind.replace('accent', 'ink2'); t.ink = 'ink2'; }
  }
}

let decisions = null; // the server's decisions, once loadPalette has them
/** The colour tokens the project's theme declares (short names), from the server; null before loadPalette has them. Leftover
 * utility classes in a dev stylesheet (a name the build saw before an undo) are not tokens. */
export const declaredColours = () => decisions ? new Set(decisions.filter((d) => d.family === 'color' && /^--color-/.test(d.name) && d.origin !== 'framework').map((d) => d.name.slice(8))) : null;
let known = null;     // the last palette read, for readColours when none is given

const probeBox = () => { const b = document.createElement('div'); b.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;contain:strict;'; return b; };

// the names of `--color-*` variables and of colour utilities (`.bg-surface`) written in the page's stylesheets, and the
// states each token is used in (token-spec §3.3: a state is read from where the colour is set, never from its name alone)
function scanSheets() {
  const vars = new Set(), classes = new Map(), states = new Map();
  const saw = (short, state) => { if (!states.has(short)) states.set(short, new Set()); states.get(short).add(state); };
  const walk = (rules, outer = '') => {
    for (const rule of rules) {
      const sel = rule.selectorText ? `${outer} ${rule.selectorText}` : outer;
      if (rule.cssRules) { try { walk(rule.cssRules, sel); } catch { /* cross-origin */ } }
      const st = rule.style; if (!st) continue;
      for (let i = 0; i < st.length; i++) if (st[i].startsWith('--color-')) vars.add(st[i]);
      const m = /^\.((?:bg|text|border)-[a-z][a-z0-9-]*)$/.exec(rule.selectorText ?? '');
      if (m) {
        const [prefix] = m[1].split('-');
        if (prefix === 'text' ? st.getPropertyValue('color') : prefix === 'bg' ? st.getPropertyValue('background-color') : st.getPropertyValue('border-color')) classes.set(m[1], prefix);
      }
      if (!sel) continue;
      // a Tailwind utility names its variants and its token in the class (`.hover\:bg-accent`, even under `@theme inline`)
      const tw = /^\s*\.((?:\\.|[\w-])+)/.exec(sel);
      if (tw) {
        const parts = tw[1].replace(/\\(.)/g, '$1').split(':'), util = /^(bg|text|border)-([a-z][a-z0-9-]*?)(?:\/[\d.]+)?$/.exec(parts.pop());
        if (util && parts.length < 4) { saw(util[2], `${util[1]}:${stateOf(parts.join(' '))}`); continue; }
      }
      // plain CSS: the selector's state, the variables its declarations paint with
      for (let i = 0; i < st.length; i++) {
        const prop = st[i] === 'color' ? 'text' : /^background/.test(st[i]) ? 'bg' : /^border/.test(st[i]) ? 'border' : null;
        if (!prop) continue;
        for (const v of st.getPropertyValue(st[i]).matchAll(/var\(--color-([a-z][a-z0-9-]*)/g)) saw(v[1], `${prop}:${stateOf(sel)}`);
      }
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
  return { vars, classes, states };
}

// the state a selector (or a Tailwind variant chain) paints in: hover (pointer, keyboard focus or an open menu: the same
// highlight), active (pressed), disabled, else rest. Dark mode and breakpoints are not states.
function stateOf(sel) {
  if (/disabled/.test(sel)) return 'disabled';
  if (/(^|[\s:&])active(?![-\w])|:active/.test(sel)) return 'active';
  if (/hover|focus|highlighted|state=open|aria-expanded/.test(sel)) return 'hover';
  return 'rest';
}

// a fill darker than the page is set into it (a well, a field, a tab track: sunken); one as light as the page or lighter
// sits on it (surface). Decided on the theme's values as written (the light ones, even with the page in dark mode: the
// decisions resolve to them), so a dark theme where every fill is lighter than the page keeps its light answer. Only a
// fill whose name says neither is moved.
function byDepth(tokens) {
  const ground = tokens.find((t) => t.kind === 'ground' && t.rgb[3] >= 1);
  if (!ground) return;
  for (const t of tokens) {
    if (t.kind !== 'surface' || t.rgb[3] < 1 || !(t.usage ?? []).some((u) => u.startsWith('bg:'))) continue;
    if (/(^|-)(surface|card|panel|popover|raised|elevated|overlay)(-|$)/.test(t.short)) continue;
    if (t.oklab[0] < ground.oklab[0] - 0.01) { t.byName ??= t.kind; t.kind = 'sunken'; }
  }
}

// a token the code uses only for words is text, one it only fills with is a surface, whatever its name says (shadcn's
// `primary-foreground` is the words on the brand, `secondary` a button's fill). Words named after an accent token
// (`primary-foreground` beside `primary`) are the words on it; other words are the main text. Status words are left alone.
function byFamily(tokens) {
  const of = (t) => new Set((t.usage ?? []).map((u) => u.split(':')[0]));
  for (const t of tokens) {
    const props = of(t);
    if (props.size !== 1 || t.role === 'status' || t.role === 'other') continue;
    const was = t.kind;
    const base = tokens.find((b) => b !== t && t.short === `${b.short}-foreground`);
    if (props.has('text') && (t.role !== 'text' || base)) {
      // words on a fill: on-accent on the brand, else the main text unless the fill's own name is a quieter level
      const quiet = base && /(^|-)(muted|subtle|faint|placeholder)(-|$)/.exec(base.short);
      t.role = 'text';
      t.kind = base?.role === 'accent' && !of(base).has('text') ? 'on-accent' : quiet ? (quiet[2] === 'faint' || quiet[2] === 'placeholder' ? 'faint' : 'muted') : 'fg';
    } else if (props.has('bg') && t.role === 'text') {
      t.role = 'surface'; t.kind = kindOf(t.short, 'surface');
    }
    if (t.kind !== was) t.byName ??= was;
  }
}

// §3.3: a surface or accent token the code fills with only in one state takes that state, whatever its name (shadcn's
// `accent` is only ever `hover:bg-accent`: a hover surface, not the brand). A token also filled at rest, never seen as a
// fill, or used for text (`hover:text-accent-foreground` is words), keeps its name. `usage` is each `prop:state` seen.
function byUsage(t, seen) {
  if (!seen?.size) return;
  const fills = new Set([...seen].filter((u) => u.startsWith('bg:')).map((u) => u.slice(3)));
  if (fills.size !== 1 || fills.has('rest') || [...seen].some((u) => u.startsWith('text:')) || !['surface', 'accent'].includes(t.role)) return;
  const [state] = fills;
  if (state === 'disabled') return;
  const hued = chroma(t.oklab) > 0.06;
  const kind = state === 'hover' ? (hued ? 'accent-hover' : 'hover') : (hued ? 'accent-active' : 'pressed');
  if (kind !== t.kind) { t.byName = t.kind; t.role = hued ? 'accent' : 'surface'; t.kind = kind; }
}

/** The theme's colour tokens, as the page paints them. */
export function paletteOf() {
  const { vars, classes, states } = scanSheets();
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
    const role = roleOf(short, lab, rgb[3]);
    const token = { name: t.name, short, role, kind: kindOf(short, role), css, rgb, oklab: lab, utility: { text: `text-${short}`, bg: `bg-${short}`, border: `border-${short}` } };
    token.usage = states.get(short) ? [...states.get(short)].sort() : undefined;
    tokens.push(token);
  }
  box.remove();
  for (const t of tokens) byUsage(t, states.get(t.short)); // states first: words on a hover surface are not words on the brand
  byFamily(tokens);
  byDepth(tokens);
  assignInks(tokens);
  return (known = tokens);
}

/** The palette with the server's decisions in: awaits them once. A page with a theme written as `@theme inline` needs them. */
export async function loadPalette(fresh = false) {
  if (!decisions || fresh) {
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

// §4.3 usage evidence for one element: a control or link (the accent's places), a status hint (a message, a badge, an alert)
const CONTROL = 'button, a[href], [role=button], [role=link], [role=tab], [role=menuitem], input, select, textarea, summary';
const FIELD = 'input, select, textarea';
const STATUS_HINT = '[role=alert], [role=status], [class*=error i], [class*=danger i], [class*=success i], [class*=warning i], [class*=alert i], [class*=toast i], [class*=badge i], [class*=banner i], [class*=notice i], [class*=invalid i]';
function ctxOf(el) {
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ');
  return { tag: el.localName, control: !!el.closest(CONTROL), field: !!el.closest(FIELD), link: !!el.closest('a[href]'), heading: !!el.closest('h1,h2,h3,h4,h5,h6'),
    statusHint: !!el.closest(STATUS_HINT) || /\b(error|failed|invalid|saved|success|warning|danger)\b/i.test(own.slice(0, 120)) };
}
// §4.3 painted area of a background, and whether it sits straight on the page (nothing painted between it and the body)
function areaOf(el, below) {
  const r = el.getBoundingClientRect();
  return { area: r.width * r.height, top: !below.el || below.el === document.body || below.el === document.documentElement };
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
        const e = { prop: 'text', cls, css: cs.color, rgb, alpha: d.text[3], under: g.rgb, comp, oklab: lab, groundEl: g.el, fuzzy: g.fuzzy, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400, uses: 1, drop: faded || null, ctx: ctxOf(el),
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
      // the stops, for refine's tinted-surface row (§5): each over the ground the gradient sits on
      const gb = el.parentElement ? fullGround(el.parentElement, memo) : { rgb: [255, 255, 255] };
      const stops = (d.image.match(/(?:rgba?|oklab|oklch|color|hsla?|lab|lch)\([^)]*\)/g) ?? []).map((c) => toRgb(c)).filter(Boolean).map((c) => over(c, gb.rgb));
      const e = { prop: 'bg', cls: colourClass(el, 'bg', theme), css: d.image.length > 60 ? d.image.slice(0, 57) + '…' : d.image, why: /gradient\(/.test(d.image) ? 'a gradient' : 'a background image', under: gb.rgb, stops: stops.map((c) => oklab(c)), ctx: ctxOf(el) };
      place(el).colours.bg = e;
    } else if (d.bg) {
      const below = el.parentElement ? fullGround(el.parentElement, memo) : { rgb: [255, 255, 255], fuzzy: false }, comp = over(d.bg, below.rgb);
      const cls = colourClass(el, 'bg', theme);
      const e = { prop: 'bg', cls, css: cs.backgroundColor, rgb: d.bg, under: below.rgb, comp, oklab: oklab(comp), fuzzy: below.fuzzy, ctx: ctxOf(el), ...areaOf(el, below, memo) };
      if (cls && VAR.test(cls)) { e.why = 'a colour the app computes (a variable)'; e.data = true; }
      else if (inline(el, /background(-color)?\s*:/)) { e.why = 'set by an inline style'; e.cls = null; e.data = true; }
      else if (!cls) e.why = 'set by a stylesheet, not a class here';
      place(el).colours.bg = e; keep.push(e);
    }
    if (d.border) {
      const g = fullGround(el, memo), cls = colourClass(el, 'border', theme), comp = over(d.border.rgb, g.rgb);
      const e = { prop: 'border', cls, css: d.border.css, rgb: d.border.rgb, under: g.rgb, comp, oklab: oklab(comp), fuzzy: g.fuzzy, ctx: ctxOf(el) };
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
  out.docArea = Math.max(1, document.documentElement.scrollWidth * document.documentElement.scrollHeight);
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

// ── reading places into roles (§4.3: usage) ─────────────────

const bandOf = (lab) => { const h = hue(lab); return BANDS.find(([, lo, hi]) => h >= lo && h <= hi)?.[0] ?? null; };
const wcag = (a, b) => {
  const y = (c) => { const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * l(c[0]) + 0.7152 * l(c[1]) + 0.0722 * l(c[2]); };
  const [hi, lo] = [y(a), y(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Each place's colour read into its role by usage (§4.3), after the token's name and value gave the palette its roles.
 * → Map(entry → { role, kinds, band, hued, control }): `role` the usage role, `kinds` the token kinds it may fold to.
 */
export function readRoles(places) {
  const out = new Map();
  // §4.3 first row: the largest-area neutral background that sits on the page is the ground
  let ground = null;
  for (const pl of places) {
    const e = pl.colours.bg;
    if (e?.oklab && e.top && !e.why && e.rgb[3] >= 1 && chroma(e.oklab) < 0.06 && e.area >= 0.5 * (places.docArea ?? Infinity) && (!ground || e.area > ground.area)) ground = e;
  }
  for (const pl of places) for (const prop of PROPS) {
    const e = pl.colours[prop];
    if (!e) continue;
    const ctx = e.ctx ?? {}, lab = e.oklab, hued = !!lab && chroma(lab) > 0.06;
    const r = { role: 'decoration', kinds: [], band: null, hued, control: !!ctx.control };
    // §4.2: a status hue only when usage agrees; a hue is never a status by value alone
    if (hued && ctx.statusHint && bandOf(lab)) { r.role = 'status'; r.band = bandOf(lab); r.kinds = [r.band]; }
    else if (!lab) { r.role = prop === 'bg' ? 'decoration' : 'other'; }
    else if (prop === 'text') {
      if (hued) { r.role = ctx.control || ctx.link ? 'accent' : 'decoration'; r.kinds = ['accent', 'accent-hover', 'ink2', 'ink2-hover']; }
      else { r.role = 'text'; r.kinds = ['fg', 'muted', 'faint']; if (e.under && chroma(oklab(e.under)) > 0.06) r.kinds.push('on-accent'); } // §2.2 on-accent: the words on the accent
    } else if (prop === 'bg') {
      if (hued) {
        if (ctx.control) { r.role = 'accent'; r.kinds = ['accent', 'accent-hover', 'ink2', 'ink2-hover']; }  // §4.3: a chromatic fill on a control is the accent
        else { r.role = 'decoration'; r.kinds = ['surface', 'sunken', 'accent-soft', 'ink2-soft']; }          // §4.3: chromatic on a card, no control role: decoration
      } else if (e.rgb[3] < 1) { r.role = 'surface'; r.kinds = ['surface', 'sunken', 'hover', 'pressed']; }
      else if (e === ground) { r.role = 'ground'; r.kinds = ['ground']; }                                    // §4.3 largest-area neutral on the page
      else if (ctx.field || /^(pre|code)$/.test(ctx.tag)) { r.role = 'sunken'; r.kinds = ['sunken']; }       // §4.3 inset: inputs, code
      else { const down = lab[0] < oklab(e.under)[0] - 0.004; r.role = down ? 'sunken' : 'surface'; r.kinds = [r.role]; } // §4.3 a step darker is inset, else raised
    } else {
      if (hued) { r.role = ctx.control ? 'accent' : 'decoration'; r.kinds = ['accent', 'ink2', 'accent-soft', 'ink2-soft', 'line']; }
      else { r.role = ctx.field || ctx.tag === 'button' ? 'line-strong' : 'line'; r.kinds = r.role === 'line-strong' ? ['line-strong', 'line'] : ['line']; } // §4.3 control borders are line-strong
    }
    out.set(e, r);
  }
  return out;
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
  const R = REACH[scope] ?? REACH.keep, refine = scope === 'refine';
  const moves = [], refused = [], examples = new Map(), hues = new Map();
  let onToken = 0, inherited = 0;
  const after = new Map(); // entry → oklab after
  const tokens = palette.filter((t) => t.role !== 'other');
  const named = new Map();
  for (const t of tokens) for (const p of PROPS) named.set(t.utility[p], t);
  const roles = readRoles(places);

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
  // §9.2 hue budget: the primary accent, and a second ink only when the theme names one
  const accentTok = tokens.find((t) => t.kind === 'accent' && t.rgb[3] >= 1);
  const inkUsedOnControls = places.some((p) => { const c = p.colours.bg; return c?.cls && c.ctx?.control && named.get(c.cls)?.kind === 'ink2'; });

  // the text that sits on each background, so a surface move is judged by the words on it
  const on = new Map();
  for (const e of places.map((p) => p.colours.text)) if (e?.groundEl) { if (!on.has(e.groundEl)) on.set(e.groundEl, []); on.get(e.groundEl).push(e); }

  // §5 step 3: the closest token among those of the colour's own role (never the nearest of any role)
  const nearest = (e, kinds, { anyAlpha = false } = {}) => {
    let best = null;
    for (const t of tokens) {
      const idx = kinds.indexOf(t.kind);
      if (idx < 0) continue;
      // a translucent colour shows what is behind it, and an opaque one does not: they trade places only for faded text
      if (!anyAlpha && (t.rgb[3] < 1) !== ((e.alpha ?? e.rgb?.[3] ?? 1) < 1)) continue;
      // a grey does not become a tint, nor a tint a grey, whatever the distance on this ground
      if (e.rgb && (chroma(oklab(e.rgb)) < 0.03) !== (chroma(oklab(t.rgb)) < 0.03)) continue;
      const de = dE(e.oklab, oklab(asToken(t, e.under))), score = de + idx * 0.0005;
      if (!best || score < best.score) best = { t, de, score };
    }
    return best;
  };

  // Order among words that sit together (docs/PRINCIPLES.md; the spacing pass's own rule, "snapping it would flatten the
  // page's hierarchy", said for colour): a row's title is drawn stronger than its description so the eye takes it first.
  // Folding a grey onto a level must not erase that. `mates` are the other grey words in the smallest part of the page
  // that holds this one and at least one other; `settled` is where a mate will sit once it is folded too.
  const LEVELS = ['fg', 'muted', 'faint'];
  const inside = new Map(); // element → the grey text entries drawn inside it
  for (const pl of places) { const e = pl.colours.text; if (!e?.level || !e.oklab) continue; for (let a = pl.el.parentElement, d = 0; a && d < 40; a = a.parentElement, d++) { const l = inside.get(a); if (l) l.push(e); else inside.set(a, [e]); } }
  const matesOf = (pl, e) => { for (let a = pl.el.parentElement; a; a = a.parentElement) { const l = inside.get(a); if (l && l.length >= 2) return l.filter((x) => x !== e); } return []; };
  const strength = (lab, under) => Math.abs(lab[0] - oklab(under)[0]); // how far the words stand off their ground
  const levelsFor = (e) => tokens.filter((t) => LEVELS.includes(t.kind) && (chroma(oklab(e.rgb)) < 0.03) === (chroma(oklab(t.rgb)) < 0.03))
    .map((t) => ({ t, de: dE(e.oklab, oklab(asToken(t, e.under))) })).sort((x, y) => x.de - y.de);
  const settled = (x, reach) => { if (x.cls && named.get(x.cls)) return x.oklab; const l = x.cls ? levelsFor(x)[0] : null; return l && l.de <= reach ? oklab(asToken(l.t, x.under)) : x.oklab; };
  const keepsOrder = (pl, e, t, reach) => {
    const now = strength(e.oklab, e.under), then = strength(oklab(asToken(t, e.under)), e.under);
    // only words doing another job: a title and its description differ in size or weight, and the colour between them is
    // part of that order. Two texts drawn the same size and weight do the same job; a grey apart from its twin is the
    // drift this pass exists to fold, not a hierarchy to keep
    const other = (x) => Math.round(x.size ?? 0) !== Math.round(e.size ?? 0) || Math.abs((x.weight ?? 400) - (e.weight ?? 400)) >= 100;
    return matesOf(pl, e).filter(other).every((x) => { const was = now - strength(x.oklab, x.under), will = then - strength(settled(x, reach), x.under);
      return Math.abs(was) <= DE_OK || (Math.sign(will) === Math.sign(was) && Math.abs(will) > DE_OK); });
  };
  // the level a spare grey folds to: the nearest in reach that keeps its order with the words beside it; null (and said) when none does
  const levelFor = (pl, e, reach) => {
    const fits = levelsFor(e).filter((l) => l.de <= reach);
    if (!fits.length) return undefined;
    const ok = fits.find((l) => keepsOrder(pl, e, l.t, reach));
    if (ok) return ok;
    refused.push({ el: pl.el, prop: 'text', why: `as ${fits[0].t.short} it would read the same as the words beside it, which it stands apart from now`, css: e.css, rule: 'extra-grey', law: LAW['extra-grey'] });
    return null;
  };

  // the contrast guard: null when the move is fine, else why it is refused (§5 Guard)
  const guard = (pl, e, prop, t, rule) => {
    const to = asToken(t, e.under);
    if (e.fuzzy && (rule !== 'near-copy' || e.rgb[3] < 1 || t.rgb[3] < 1)) return 'it sits on a gradient or an image, so its contrast cannot be measured';
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
    if (why) { refused.push({ el: pl.el, prop, why, css: e.css, rule, law: LAW[rule] }); return true; }
    moves.push({ el: pl.el, prop, from: { cls: e.cls, css: e.css }, to: { token: t.short, cls: t.utility[prop], css: t.css }, de: Math.round(de * 1000) / 1000, rule, law: LAW[rule], role: t.kind, ...extra });
    after.set(e, oklab(asToken(t, e.under)));
    return true;
  };

  // what keep lists for a colour no token of its role is near: the §5 row that names it
  const rowFor = (prop, e, use) => {
    if (use.role === 'accent') return prop === 'bg' ? 'second-accent' : 'stray-hue';
    if (use.hued) return prop === 'text' ? 'no-meaning-text' : prop === 'bg' ? 'tinted-surface' : 'stray-hue';
    return 'near-copy';
  };

  for (const pl of places) for (const prop of PROPS) {
    const e = pl.colours[prop];
    if (!e) continue;
    const use = roles.get(e) ?? { role: 'decoration', kinds: [] };
    if (e.why) {
      const gradient = e.why === 'a gradient';
      // §5 tinted or gradient surface: keep lists it; refine folds it only when both stops sit within 0.10 of one surface-role token
      if (gradient && refine && e.stops?.length && e.under) {
        const cand = tokens.filter((t) => ['surface', 'sunken', 'ground', 'accent-soft', 'ink2-soft'].includes(t.kind));
        const fit = cand.map((t) => ({ t, de: Math.max(...e.stops.map((l) => dE(l, oklab(asToken(t, e.under))))) })).filter((x) => x.de <= 0.1).sort((a, b) => a.de - b.de)[0];
        if (fit) { consider(pl, prop, { ...e, fuzzy: false }, fit.t, fit.de, 'tinted-surface', { gradient: true }); continue; }
      }
      refused.push({ el: pl.el, prop, why: e.why, css: e.css, ...(gradient ? { rule: 'tinted-surface', law: LAW['tinted-surface'], role: 'decoration' } : {}) });
      continue;
    }
    if (e.inherited) { inherited++; continue; }
    // text faded by opacity: the level it composites to (§5 faded text). The colour class stays, the opacity goes, so this is a
    // move the writer makes in two classes: no from.cls for a plain swap, and `set` and `drop` say the two
    if (prop === 'text' && e.drop && use.role === 'text') {
      const best = nearest(e, use.kinds, { anyAlpha: true });
      if (best && best.de <= FADED) { consider(pl, prop, { ...e, cls: null }, best.t, best.de, 'faded-text', { set: e.cls, drop: e.drop }); continue; }
    }
    const tok = e.cls && named.get(e.cls);
    if (tok) {
      onToken++;
      const k = `${prop}|${e.cls}`; examples.set(k, (examples.get(k) ?? 0) + 1);
      continue;
    }
    // §5 status hue: never changed in hue, folded only to the status token of its own hue band, never to the accent
    if (use.role === 'status') {
      const best = nearest(e, use.kinds);
      if (best && best.de <= R.status) { consider(pl, prop, e, best.t, best.de, 'status-hue'); continue; }
    } else {
      // §5 near-copy, step 3: among tokens of its role, one within the fold distance
      const best = use.kinds.length ? nearest(e, use.kinds) : null;
      if (best && best.de <= R.fold) { consider(pl, prop, e, best.t, best.de, 'near-copy'); continue; }
      // §5 pure black or white: the off-black and off-white token the theme has
      const pure = e.rgb[3] >= 1 && ((e.rgb[0] === 0 && e.rgb[1] === 0 && e.rgb[2] === 0) || (e.rgb[0] === 255 && e.rgb[1] === 255 && e.rgb[2] === 255));
      if (pure) {
        let p = null;
        for (const t of tokens) {
          if (!use.kinds.includes(t.kind) || chroma(t.oklab) > 0.03 || t.rgb[3] < 1) continue;
          const de = dE(e.oklab, oklab(asToken(t, e.under)));
          if (de <= PURE_REACH && (!p || de < p.de)) p = { t, de };
        }
        if (p) { consider(pl, prop, e, p.t, p.de, 'pure-black-white'); continue; }
      }
      // §5 extra grey level: the nearest of the three text levels, and the APCA guard keeps it in its band
      if (prop === 'text' && use.role === 'text' && textGreys && e.level && e.cls && chroma(e.oklab) < 0.03) {
        const level = levelFor(pl, e, R.grey);
        if (level) { consider(pl, prop, e, level.t, level.de, 'extra-grey'); continue; }
        if (level === null) continue;
      }
      else if (prop === 'text' && use.role === 'text' && greyActive && e.level && e.cls) {
        // within a grey level's width (the census merges text colours this close) of one of your text tokens: the same grey
        const same = nearest(e, ['fg', 'muted', 'faint'], { anyAlpha: true });
        if (same && same.de <= GREY_CLUSTER) { consider(pl, prop, e, same.t, same.de, 'extra-grey'); continue; }
        const k = levels.find((x) => x.members.includes(e));
        if (k && !top.includes(k) && k.members.length / sampleN <= T17.minority) {
          const level = top.slice().sort((a, b) => dE(a.lab, e.oklab) - dE(b.lab, e.oklab))[0];
          const target = level && dE(level.lab, e.oklab) <= R.grey ? nearest({ oklab: level.lab, under: e.under, alpha: 1 }, ['fg', 'muted', 'faint'], { anyAlpha: true }) : null;
          if (target && target.de <= DE_OK) { consider(pl, prop, e, target.t, dE(e.oklab, oklab(asToken(target.t, e.under))), 'extra-grey'); continue; }
        }
      }
      // ── refine only: the rows keep lists (§5) ──
      if (refine && use.hued) {
        const inks = tokens.filter((t) => ['accent', 'ink2'].includes(t.kind) && t.rgb[3] >= 1);
        // second accent: a control fill becomes the accent by ROLE, not by distance (budget 1; the second ink only where the app already uses it on buttons)
        if (prop === 'bg' && use.role === 'accent') {
          const target = (inkUsedOnControls && tokens.find((t) => t.kind === 'ink2' && t.rgb[3] >= 1)) || accentTok;
          if (target) { consider(pl, prop, e, target, dE(e.oklab, oklab(asToken(target, e.under))), 'second-accent'); continue; }
        }
        // stray hue: used on a control or link and within 40 degrees of an accent hue, it joins the accent
        if (use.role === 'accent') {
          const h = hue(e.oklab), t = inks.map((x) => ({ x, g: hueGap(h, hue(x.oklab)) })).sort((a, b) => a.g - b.g)[0];
          if (t && t.g <= R.stray) { consider(pl, prop, e, t.x, dE(e.oklab, oklab(asToken(t.x, e.under))), 'stray-hue'); continue; }
        }
        // coloured text with no meaning: fg for a heading, else muted (cognitive load)
        if (prop === 'text' && use.role === 'decoration') {
          const t = tokens.find((x) => x.kind === (e.ctx?.heading ? 'fg' : 'muted'));
          if (t) { consider(pl, prop, e, t, dE(e.oklab, oklab(asToken(t, e.under))), 'no-meaning-text'); continue; }
        }
        // no meaning on a surface or a line: the nearest neutral of its family
        if (prop !== 'text' && use.role === 'decoration') {
          const t = nearest({ ...e, rgb: undefined }, prop === 'bg' ? ['surface', 'sunken'] : ['line'], { anyAlpha: true });
          if (t) { consider(pl, prop, e, t.t, t.de, 'stray-hue'); continue; }
        }
      }
      // §5 line too faint: a control edge under WCAG 3:1 is raised to line-strong at refine, only reported at keep
      if (prop === 'border' && use.role === 'line-strong' && e.comp && wcag(e.comp, e.under) < 3) {
        const strong = refine && nearest({ ...e, rgb: undefined, oklab: e.oklab }, ['line-strong'], { anyAlpha: true });
        if (strong) { consider(pl, prop, e, strong.t, strong.de, 'line-too-faint'); continue; }
        refused.push({ el: pl.el, prop, why: `a control edge at ${(Math.round(wcag(e.comp, e.under) * 10) / 10).toFixed(1)}:1; WCAG 3:1 asks for 3:1`, css: e.css, rule: 'line-too-faint', law: LAW['line-too-faint'], role: 'line-strong' });
        continue;
      }
    }
    // no token of its role is near: kept, and said (keep never invents a value; §4.4)
    const key = `${prop}|${hex(e.comp)}`, h = hues.get(key);
    const rule = use.role === 'status' ? 'status-hue' : rowFor(prop, e, use);
    if (h) h.count++;
    else hues.set(key, { prop, css: hex(e.comp), cls: e.cls, count: 1, role: use.role, rule, law: LAW[rule],
      nearest: (() => { const n = nearest(e, use.kinds.length ? use.kinds : ['accent', 'ink2', 'fg'], { anyAlpha: true }) ?? nearest(e, tokens.map((t) => t.kind), { anyAlpha: true }); return n ? { token: n.t.short, de: Math.round(n.de * 1000) / 1000 } : null; })(),
      why: use.role === 'status' ? 'no status token of yours matches it' : 'no colour of yours is near it' });
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

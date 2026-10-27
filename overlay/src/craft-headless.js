/* ─────────────────────────────────────────────────────────
 * CRAFT HEADLESS · React Plumber overlay
 *
 * The facts only a headless run can gather (docs/briefs/craft-hard-rules.md, layers 4–7), and the rules that read
 * them. The live overlay loads this module too: with nothing handed in, every reader answers null and every rule here
 * stays quiet, so a rule is never judged on facts it does not have.
 *
 *  HEADLESS.other(condition, facts)  a view of the same route under `dark` | `touch` | `held` | `scrolled`, keyed by
 *                                    the element's place in the page; null when that pair was not taken
 *  HEADLESS.probe(el, gesture)       the recorded timeline of one gesture on one element; null when not probed
 *  HEADLESS.source(el)               { component, library, role, props, handlers } from the server's index; null before
 *  RUN_RULES                         rules that read the above (appended to RULES in craft-rules.js)
 *
 * The runner (src/craft-run.ts) fills the stores through craft-run.js: `snapshot` in a page rendered under a
 * condition, `pair(condition, data)` in the page that is read. A rule that names `pairs: [condition]` is the reason
 * the runner takes that pair at all.
 *
 * Deviation from the design (key): a pair is keyed by the element's place in the page (tags and sibling indices
 * from body), not by its source site. A condition changes styles, not the tree, so the place is the same in both
 * pages, costs no source lookup per element, and tells the rows of a list apart. An element the other page lacks has
 * no record, and every rule stays quiet on it.
 * ───────────────────────────────────────────────────────── */
import { rgb, classesOf, utility } from './craft-read.js';
import { TIER } from './craft-facets.js';
import { say } from './words.js';

const px = (v) => parseFloat(v) || 0;
const round1 = (n) => Math.round(n * 10) / 10;

// ── the element's place ─────────────────────────────────────

let keys = new WeakMap();
export function resetKeys() { keys = new WeakMap(); }
// "main:1>div:2>p:1": keep in step with the key in craft-record.js
export function pathKey(el) {
  let k = keys.get(el);
  if (k !== undefined) return k;
  const out = [];
  for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    let i = 1;
    for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === n.localName) i++;
    out.push(`${n.localName}:${i}`);
  }
  keys.set(el, (k = out.reverse().join('>')));
  return k;
}
export function fromKey(key) {
  let n = document.body;
  for (const step of key ? key.split('>') : []) {
    const [tag, i] = step.split(':');
    let seen = 0, hit = null;
    for (const c of n.children) if (c.localName === tag && ++seen === Number(i)) { hit = c; break; }
    if (!hit) return null;
    n = hit;
  }
  return n;
}

// ── colour and shadow, from computed strings ────────────────

function oklab([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), q = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}
// Any CSS colour as [r, g, b, a] in sRGB. A computed colour keeps the function it was written in (oklch for most of
// Tailwind's palette), so it is painted on a canvas pixel and read back.
let pixel = null; const painted = new Map();
export function toRgb(value) {
  const direct = rgb(value);
  if (direct) return direct;
  if (!value || value === 'none') return null;
  let c = painted.get(value);
  if (c !== undefined) return c;
  pixel ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = '#000';
  pixel.fillStyle = value;
  pixel.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
  painted.set(value, (c = [r, g, b, Math.round((a / 255) * 100) / 100]));
  return c;
}
// a computed box-shadow as layers: { x, y, blur, inset, rgb }
const COLOUR = /(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)/;
function layersOf(value) {
  if (!value || value === 'none') return [];
  return value.split(/,(?![^(]*\))/).map((layer) => {
    const colour = toRgb(layer.match(COLOUR)?.[0]);
    const nums = layer.replace(new RegExp(COLOUR, 'g'), '').match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return { x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, inset: /\binset\b/.test(layer), rgb: colour };
  });
}
// the nearest painted ground up the tree from a start, as Facts.ground reads it
function groundFrom(el) {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const c = toRgb(getComputedStyle(n).backgroundColor);
    if (c && c[3] > 0.5) return c;
  }
  return toRgb(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1];
}

// ── the stores the runner fills ─────────────────────────────

const pairs = new Map(); // condition → view
export function pairIn(condition, data) {
  pairs.set(condition, VIEWS[condition]?.(data) ?? null);
  resetKeys();
}
export function pairsReset() { pairs.clear(); resetKeys(); }

const VIEWS = {
  // dark: a record per element (doc order): style the dark page painted, and the ground under it
  dark(records) {
    const by = new Map(records.map((r) => [r.k, r]));
    const bodyBg = records.find((r) => r.k === '')?.bg ?? [255, 255, 255, 1];
    const claimed = new Map();
    return {
      get: (el) => by.get(pathKey(el)) ?? null,
      bodyL: oklab(bodyBg)[0],
      // the first element (in page order) that a page-wide finding is drawn on
      first(name, el, test) {
        if (!claimed.has(name)) claimed.set(name, records.find((r) => test(r))?.k ?? null);
        return claimed.get(name) === pathKey(el);
      },
    };
  },
  // scrolled: for each scroll container, whether anything at its edges changes with the scroll position
  scrolled(list) {
    const by = new Map(list.map((r) => [r.k, r]));
    return { cue: (el) => by.get(pathKey(el))?.cue ?? null };
  },
  // held: the page while its responses were held and after they landed
  held(data) {
    const skeletons = new Map(data.skeletons.map((r) => [r.at, r])), spinners = new Map(data.spinners.map((r) => [r.at, r]));
    return { skeleton: (el) => skeletons.get(pathKey(el)) ?? null, spinner: (el) => spinners.get(pathKey(el)) ?? null };
  },
};

// A page rendered under a condition, as one record per element with a box. Runs in the pair page.
export function snapshot() {
  const out = [];
  const body = document.body;
  const record = (el, k) => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    out.push({
      k, t: el.localName, x: round1(r.x), y: round1(r.y), w: round1(r.width), h: round1(r.height),
      sh: s.boxShadow, bg: toRgb(s.backgroundColor), fg: toRgb(s.color), fw: s.fontWeight, fs: s.fontSize, ls: s.letterSpacing,
      sm: s.getPropertyValue('-webkit-font-smoothing'), pos: s.position, gp: groundFrom(el.parentElement), own: [...el.childNodes].some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue)),
    });
  };
  record(body, '');
  for (const el of body.querySelectorAll('*')) {
    if (el.closest('plumb-overlay') || (el.closest('svg') && el.localName !== 'svg') || ['script', 'style', 'noscript', 'template'].includes(el.localName)) continue;
    if (!el.getClientRects().length) continue;
    record(el, pathKey(el));
  }
  return out;
}

// Whether the stylesheets answer to the dark scheme at all (a page that doesn't has nothing to compare)
export function hasDarkStyles() {
  const walk = (rules) => { for (const r of rules) { if (r.media && /prefers-color-scheme:\s*dark/.test(r.media.mediaText)) return true; if (r.cssRules && walk(r.cssRules)) return true; } return false; };
  for (const sheet of document.styleSheets) { try { if (walk(sheet.cssRules)) return true; } catch {} }
  return false;
}

// Scroll containers a person scrolls with a finger: their own box scrolls, and its scrollbar takes no room
export function scrollers() {
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('plumb-overlay') || el === document.body) continue;
    const s = getComputedStyle(el);
    if (!/(auto|scroll)/.test(s.overflowY) || el.scrollHeight <= el.clientHeight + 4 || el.clientHeight < 48) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 80 || !el.getClientRects().length) continue;
    const mask = s.maskImage || s.webkitMaskImage || 'none';
    out.push({ k: pathKey(el), hasMask: mask !== 'none' });
  }
  return out;
}

// What the skeletons were while the page waited: each skeleton's container, its height and its rows
const SKELETON = '.animate-pulse, [data-skeleton], [class*="skeleton" i], [aria-busy="true"]';
const SPINNER = '[role="status"], .animate-spin, [data-spinner]';
export function skeletons() {
  const found = [...document.body.querySelectorAll(SKELETON)].filter((e) => !e.closest('plumb-overlay') && !e.matches(SPINNER) && e.getClientRects().length);
  const top = found.filter((e) => !found.some((o) => o !== e && o.contains(e)));
  const out = new Map();
  for (const e of top) {
    const host = e.matches('[aria-busy="true"]') ? e : e.parentElement;
    if (!host || host === document.body) continue;
    const k = pathKey(host);
    if (out.has(k)) continue;
    out.set(k, { at: k, h: round1(host.getBoundingClientRect().height), n: [...host.children].filter((c) => c.getClientRects().length).length });
  }
  return [...out.values()];
}
export function heightsAt(keysIn) {
  return keysIn.map((k) => { const el = fromKey(k); return { at: k, h: el ? round1(el.getBoundingClientRect().height) : null, n: el ? [...el.children].filter((c) => c.getClientRects().length).length : null }; });
}

// ── rules ───────────────────────────────────────────────────

const isHighlight = (l) => l.inset && l.y >= 1 && l.rgb && oklab(l.rgb)[0] > 0.7 && l.rgb[3] <= 0.15;

// #54. In the dark scheme a shadow doesn't lift a surface: it needs a lighter surface or a light edge.
export const darkElevation = {
  id: 'craft/dark-elevation', family: 'craft', number: [54], tier: TIER.craft, owns: ['background', 'shadow'], once: 'ancestor', reads: ['style', 'other:dark'], pairs: ['dark'],
  threshold: { blur: 4, alpha: 0.05, lift: 0.03, ground: 0.3 },
  check({ el, facts }) {
    const dark = facts.other('dark');
    const d = dark?.get(el);
    if (!d || dark.bodyL >= this.threshold.ground || d.pos === 'fixed') return [];
    const layers = layersOf(d.sh);
    const lifts = layers.filter((l) => !l.inset && l.blur >= this.threshold.blur && (l.rgb?.[3] ?? 1) >= this.threshold.alpha);
    const bg = d.bg;
    if (!lifts.length || !bg || bg[3] < 0.95 || layers.some(isHighlight)) return [];
    const lift = oklab(bg)[0] - oklab(d.gp)[0];
    if (lift > this.threshold.lift || /dark:inset-shadow/.test(classesOf(el))) return [];
    const blur = Math.max(...lifts.map((l) => l.blur));
    return [{
      ...say(this.id, { blur }),
      key: this.id, text: utility(el, 'shadow') ?? 'box-shadow', props: ['box-shadow', 'background-color'], value: d.sh, n: blur,
      evidence: { blur, lift: Math.round(lift * 1000) / 1000, surface: `rgb(${d.bg.slice(0, 3).join(', ')})`, ground: `rgb(${d.gp.slice(0, 3).join(', ')})` }, confidence: 0.86,
      suggest: { kind: 'class', from: '', to: 'dark:inset-shadow-xs dark:inset-shadow-white/10', why: 'a light top edge, since a shadow can’t show on dark' },
    }];
  },
};

// #44. Light text on a dark ground looks heavier than it is: the page takes the weight back, once.
export const darkWeight = {
  id: 'craft/dark-weight', family: 'craft', number: [44], tier: TIER.advisory, owns: ['font-weight'], once: 'ancestor', reads: ['style', 'text', 'other:dark'], pairs: ['dark'],
  threshold: { weight: 500, size: 20, ink: 0.8, ground: 0.3 },
  check({ el, facts }) {
    const dark = facts.other('dark');
    const d = dark?.get(el);
    if (!d || !facts.text(el)) return [];
    const test = (r) => {
      const fg = r.fg, ground = r.bg?.[3] > 0.5 ? r.bg : r.gp;
      return r.own && fg && oklab(fg)[0] > this.threshold.ink && oklab(ground)[0] < this.threshold.ground && (parseInt(r.fw, 10) || 400) >= this.threshold.weight
        && px(r.fs) < this.threshold.size && r.sm !== 'antialiased';
    };
    if (!test(d) || !dark.first(this.id, el, test)) return [];
    const s = facts.style(el);
    // the same weight and spacing in the light page: the dark scheme left the type alone
    if (s.fontWeight !== d.fw || s.letterSpacing !== d.ls || /dark:antialiased|dark:font-/.test(classesOf(el))) return [];
    return [{
      ...say(this.id, { weight: parseInt(d.fw, 10) || 400, size: px(d.fs) }),
      key: this.id, tier: TIER.advisory, text: utility(el, 'font') ?? 'font-weight', props: ['font-weight'], value: d.fw, n: parseInt(d.fw, 10) || 400,
      evidence: { weight: d.fw, size: d.fs, ink: `rgb(${d.fg.slice(0, 3).join(', ')})` }, confidence: 0.82,
      suggest: { kind: 'advice', text: 'Add dark:antialiased to the page’s root, so light text keeps the weight you chose.' },
    }];
  },
};

// #77. A skeleton is the shape of what will land: the same height, the same number of rows.
export const skeletonMatch = {
  id: 'craft/skeleton-match', family: 'craft', number: [77], tier: TIER.legibility, owns: ['size'], once: 'ancestor', reads: ['rect', 'other:held'], pairs: ['held'],
  threshold: { height: 4 },
  check({ el, facts }) {
    const rec = facts.other('held')?.skeleton(el);
    if (!rec || rec.after.h === null) return [];
    const delta = rec.after.h - rec.before.h;
    // the container's own growth. A layout shift inside it can come from anything above it, so it is only evidence
    if (Math.abs(delta) <= this.threshold.height) return [];
    return [{
      ...say(this.id, { was: rec.before.h, now: rec.after.h, rows: rec.before.n, rowsNow: rec.after.n }),
      key: this.id, text: 'skeleton', props: ['height'], value: `${rec.before.h}px`, n: Math.abs(delta),
      evidence: { skeleton: rec.before.h, loaded: rec.after.h, rows: rec.before.n, rowsLoaded: rec.after.n, shift: Math.round(rec.shift * 1000) / 1000 }, confidence: 0.88,
      suggest: { kind: 'advice', text: `Make the skeleton ${Math.round(rec.after.h)}px tall${rec.after.n !== rec.before.n ? `, with ${rec.after.n} rows` : ''}, the size of what lands.` },
    }];
  },
};

// #75, the half that looks. A scroll container whose edges look the same however far it is scrolled has no cue that
// more is there. The still half (craft/scroll-cue in craft-rules.js) can ask `facts.other('scrolled').cue(el)`:
// true clears it, false confirms it. This rule speaks by itself only when the pair saw no cue.
export const scrollCueSeen = {
  id: 'craft/scroll-cue', family: 'craft', number: [75], tier: TIER.legibility, owns: ['scroll'], once: 'ancestor', reads: ['style', 'other:scrolled'], pairs: ['scrolled'],
  check({ el, facts }) {
    if (facts.other('scrolled')?.cue(el) !== false) return [];
    return [{
      ...say('craft/scroll-cue-seen', {}),
      key: this.id, text: utility(el, 'overflow-y') ?? 'overflow', props: ['overflow'], value: facts.style(el).overflowY, n: 1,
      evidence: { seen: 'edges identical at the top and at the end' }, confidence: 0.9,
      suggest: { kind: 'advice', text: 'Fade the edge that has more behind it: a mask on the container, or background-attachment: local shadows.' },
    }];
  },
};

// #66, the half that waits. A spinner that shows for a blink on a fast reply is worse than none.
export const spinnerTiming = {
  id: 'craft/spinner-timing', family: 'craft', number: [66], tier: TIER.craft, owns: ['motion'], once: 'ancestor', reads: ['other:held', 'probe:press'], pairs: ['held'],
  threshold: { flash: 200, slow: 1000 },
  check({ el, facts }) {
    const rec = facts.other('held')?.spinner(el);
    if (!rec || rec.fast === null || rec.slow === null || rec.fast >= this.threshold.flash || rec.slow < this.threshold.slow) return [];
    return [{
      ...say(this.id, { ms: Math.round(rec.fast), flash: true }),
      key: `${this.id}@flash`, text: 'spinner', props: ['animation'], value: `${Math.round(rec.fast)}ms`, n: rec.fast,
      evidence: { shownMs: Math.round(rec.fast), slowMs: Math.round(rec.slow) }, confidence: 0.86,
      suggest: { kind: 'advice', text: 'Show it after 200ms, then keep it for at least 500ms (spin-delay: delay 200, minDuration 500).' },
    }];
  },
};

export const HEADLESS = {
  other: (condition) => pairs.get(condition) ?? null,
  probe: () => null,
  source: () => null,
};

export const RUN_RULES = [darkElevation, darkWeight, skeletonMatch, scrollCueSeen, spinnerTiming];

// the pairs the loaded rules ask for
export const PAIRS = [...new Set(RUN_RULES.flatMap((r) => r.pairs ?? []))];

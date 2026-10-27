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

// ── probes: what a gesture did ──────────────────────────────

// The elements a gesture may be tried on, by key. A control inside a form, a submit button, a link and a disabled
// control are never in the list: a probe presses buttons, it never submits, follows or sends anything.
export function candidates() {
  const seen = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('plumb-overlay, [inert], [hidden]'); };
  const safe = (el) => !el.closest('form') && !el.form && !el.closest('a[href]') && el.getAttribute('type') !== 'submit' && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
  const all = [...document.body.querySelectorAll('button, [role="button"]')].filter((e) => seen(e) && safe(e));
  const keysOf = (list) => list.map(pathKey);
  return {
    presses: keysOf(all.filter((e) => !e.matches('[aria-pressed], [aria-expanded], [aria-haspopup], [role="tab"]'))),
    toggles: keysOf(all.filter((e) => e.matches('[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded], [aria-controls]'))),
    menus: keysOf(all.filter((e) => e.matches('[aria-haspopup="menu"], [aria-haspopup="true"]'))),
    tooltips: keysOf(all.filter((e) => e.matches('[data-state="closed"], [aria-describedby], [data-tooltip]') && !e.matches('[aria-haspopup], [aria-expanded]'))),
    // things that follow a finger: touch-action taken off the browser. A drawer from a library that ships its own give (Vaul) is not tried.
    drags: [...document.body.querySelectorAll('*')].filter((e) => seen(e) && !e.closest('[data-vaul-drawer], [data-vaul-handle]') && !e.matches('input, textarea, select, [role="slider"]') && /^(none|pan-x|pan-y)$/.test(getComputedStyle(e).touchAction)).map(pathKey),
  };
}

// gesture|place → what the gesture did there. A record may be put under two places (a surface and its trigger); the
// rule that reads it speaks on one of them.
const probes = new Map();
const tooltipKind = (r) => (r.t1 !== null && r.t1 < 200 ? 'quick' : r.t1 !== null && r.t1 > 1000 ? 'slow' : r.t2 !== null && r.t2 > 150 ? 'skip' : r.t3 !== null && r.t3 > 150 ? 'cool' : null);
export function probesIn(list) {
  probes.clear();
  const led = new Set();
  for (const { gesture, k, rec } of list) {
    // a delay is the provider's, not one trigger's: the first trigger with each kind of trouble speaks for them all
    if (gesture === 'tooltip') { const kind = tooltipKind(rec); if (kind && !led.has(kind)) { led.add(kind); rec.lead = kind; } }
    probes.set(`${gesture}|${k}`, rec);
  }
  resetKeys();
}
// the element a toggle's finding is drawn on: its surface when that is on the page at rest, else its trigger
const placed = (el, p) => pathKey(el) === (p.surface && fromKey(p.surface) ? p.surface : p.trigger);
const STEPS = [75, 100, 150, 200, 300, 500, 700, 1000];

// ── source: what the code says an element is ──────────────

// facts.source(el) → { component, library, role, props, handlers, provider? } from the server's structure index
// (`structure` in the session API), once craft-run.js has asked for it; null before, and in the live overlay until the
// reading brings it. Only the elements a rule would ask about are prepared: custom controls and tooltip triggers.
const sources = new Map(), known = new WeakMap();
export function sourcesIn(list) { sources.clear(); for (const { k, s } of list) sources.set(k, s); }
// the live overlay hands in what the server said about an element as its reading arrives (the Craft cache wants invalidating after)
export function setSource(el, s) { known.set(el, s); }
const NATIVE = 'button, a[href], input, select, textarea, summary, label, option, svg, img';
export function wantedSources() {
  const els = new Set();
  for (const [id] of probes) if (id.startsWith('tooltip|')) { const e = fromKey(id.slice(8)); if (e) els.add(e); }
  for (const e of document.body.querySelectorAll('*')) {
    if (els.size >= 80) break;
    if (e.closest('plumb-overlay') || e.matches(NATIVE) || !e.getClientRects().length || e.closest('svg')) continue;
    const s = getComputedStyle(e);
    const custom = e.getAttribute('role') === 'button' || (s.cursor === 'pointer' && e.parentElement && getComputedStyle(e.parentElement).cursor !== 'pointer') || /^(none|pan-x|pan-y)$/.test(s.touchAction);
    if (custom) els.add(e);
  }
  return [...els];
}

// ── rules ───────────────────────────────────────────────────

const isHighlight = (l) => l.inset && l.y >= 1 && l.rgb && oklab(l.rgb)[0] > 0.7 && l.rgb[3] <= 0.15;

// #54. In the dark scheme a shadow doesn't lift a surface: it needs a lighter surface or a light edge.
export const darkElevation = {
  id: 'craft/dark-elevation', family: 'craft', number: [54], owns: ['background', 'shadow'], once: 'ancestor', reads: ['style', 'other:dark'], pairs: ['dark'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const dark = facts.other('dark');
    const d = dark?.get(el);
    if (!d || dark.bodyL >= T.ground || d.pos === 'fixed') return [];
    const layers = layersOf(d.sh);
    const lifts = layers.filter((l) => !l.inset && l.blur >= T.blur && (l.rgb?.[3] ?? 1) >= T.alpha);
    const bg = d.bg;
    if (!lifts.length || !bg || bg[3] < 0.95 || layers.some(isHighlight)) return [];
    const lift = oklab(bg)[0] - oklab(d.gp)[0];
    if (lift > T.lift || /dark:inset-shadow/.test(classesOf(el))) return [];
    const blur = Math.max(...lifts.map((l) => l.blur));
    return [{
      ...say(this.id, { blur }),
      key: this.id, text: utility(el, 'shadow') ?? 'box-shadow', props: ['box-shadow', 'background-color'], value: d.sh, n: blur,
      evidence: { blur, lift: Math.round(lift * 1000) / 1000, surface: `rgb(${d.bg.slice(0, 3).join(', ')})`, ground: `rgb(${d.gp.slice(0, 3).join(', ')})` }, confidence: 0.86,
      suggest: { kind: 'class', from: '', to: 'dark:inset-shadow-xs dark:inset-shadow-white/10', why: 'a light top edge, since a shadow can’t show on dark' },
    }];
  },
};

// #44. Light text on a dark ground looks heavier than it is: the page takes the weight back, once. Medium and bold small
// text is measured and speaks as a note. Regular small text is the grey band: it may glow too, or may not (an eye
// decides, when asked: `judge`), so it is held below the floor and shown only if the judge said yes.
export const darkWeight = {
  id: 'craft/dark-weight', family: 'craft', number: [44], owns: ['font-weight'], once: 'ancestor', reads: ['style', 'text', 'other:dark'], pairs: ['dark'], judge: true,
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const dark = facts.other('dark');
    const d = dark?.get(el);
    if (!d || !facts.text(el)) return [];
    const test = (r, heavy) => {
      const fg = r.fg, ground = r.bg?.[3] > 0.5 ? r.bg : r.gp, w = parseInt(r.fw, 10) || 400;
      return r.own && fg && oklab(fg)[0] > T.ink && oklab(ground)[0] < T.ground && r.sm !== 'antialiased'
        && (heavy ? w >= T.weight && px(r.fs) < T.size : w < T.weight && px(r.fs) <= T.grey);
    };
    const heavy = test(d, true), grey = !heavy && test(d, false);
    if ((!heavy || !dark.first(this.id, el, (r) => test(r, true))) && !grey) return [];
    const s = facts.style(el);
    // the same weight and spacing in the light page: the dark scheme left the type alone
    if (s.fontWeight !== d.fw || s.letterSpacing !== d.ls || /dark:antialiased|dark:font-/.test(classesOf(el))) return [];
    return [{
      ...say(this.id, { weight: parseInt(d.fw, 10) || 400, size: px(d.fs) }),
      key: this.id, tier: T.tier, text: utility(el, 'font') ?? 'font-weight', props: ['font-weight'], value: d.fw, n: parseInt(d.fw, 10) || 400,
      evidence: { weight: d.fw, size: d.fs, ink: `rgb(${d.fg.slice(0, 3).join(', ')})`, words: (el.textContent ?? '').trim().slice(0, 40) }, confidence: heavy ? 0.82 : 0.7,
      suggest: { kind: 'advice', text: 'Add dark:antialiased to the page’s root, so light text keeps the weight you chose.' },
    }];
  },
};

// #77. A skeleton is the shape of what will land: the same height, the same number of rows.
export const skeletonMatch = {
  id: 'craft/skeleton-match', family: 'craft', number: [77], owns: ['size'], once: 'ancestor', reads: ['rect', 'other:held'], pairs: ['held'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const rec = facts.other('held')?.skeleton(el);
    if (!rec || rec.after.h === null) return [];
    const delta = rec.after.h - rec.before.h;
    // the container's own growth. A layout shift inside it can come from anything above it, so it is only evidence
    if (Math.abs(delta) <= T.height) return [];
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
  id: 'craft/scroll-cue', family: 'craft', number: [75], owns: ['scroll'], once: 'ancestor', reads: ['style', 'other:scrolled'], pairs: ['scrolled'],
  check({ el, facts }, theme) {
    if (facts.other('scrolled')?.cue(el) !== false) return [];
    return [{
      ...say('craft/scroll-cue-seen', {}),
      key: this.id, text: utility(el, 'overflow-y') ?? 'overflow', props: ['overflow'], value: facts.style(el).overflowY, n: 1,
      evidence: { seen: 'edges identical at the top and at the end' }, confidence: 0.9,
      suggest: { kind: 'advice', text: 'Fade the edge that has more behind it: a mask on the container, or background-attachment: local shadows.' },
    }];
  },
};

// #68, measured. Open it and close it and read the animations: the exit is no quicker than the entrance. The same rule
// as the still half in craft-rules.js (the same facet): when both speak, the measured one is kept.
export const exitFasterProbe = {
  id: 'craft/exit-faster', family: 'craft', number: [68], owns: ['motion'], once: 'ancestor', reads: ['probe:toggle'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const p = facts.probe(el, 'toggle');
    if (!p || p.exit === null || p.enter < T.instant || !placed(el, p) || p.exit / p.enter <= T.measuredRatio) return [];
    const under = STEPS.filter((n) => n <= p.enter * T.ratio);
    const step = under.sort((a, b) => Math.abs(a - p.enter * T.want.ratio) - Math.abs(b - p.enter * T.want.ratio))[0];
    const to = step ? `data-[state=closed]:duration-${step}` : null;
    return [{
      ...say(this.id, { enter: Math.round(p.enter), exit: step ?? Math.round(p.enter * T.want.ratio) }),
      key: this.id, text: to ?? 'transition-duration', props: ['transition-duration'], value: `${Math.round(p.enter)}ms`, n: p.enter,
      evidence: { enter: Math.round(p.enter), exit: Math.round(p.exit), measured: true }, confidence: 0.92,
      suggest: to && p.surface && fromKey(p.surface) ? { kind: 'class', from: '', to, why: 'leaving is quicker than arriving' }
        : { kind: 'advice', text: `Close it in about ${Math.round(p.enter * T.want.ratio)}ms: a shorter duration on the closed state.` },
    }];
  },
};

// #64, measured. Close it 40% into its entrance: the motion must carry on from where it is. Keyframes cannot: the exit
// is a new animation that begins at its own first frame (a frame-to-frame jump can't tell that from a fast transition).
export const interruptibleProbe = {
  id: 'craft/interruptible', family: 'craft', number: [64], owns: ['motion'], once: 'ancestor', reads: ['probe:toggle'],
  check({ el, facts }, theme) {
    const p = facts.probe(el, 'toggle');
    if (!p?.restart || !placed(el, p)) return [];
    return [{
      ...say('craft/interruptible-probe', {}),
      key: this.id, text: 'animation', props: ['animation'], value: 'keyframes', n: 1,
      evidence: { restarted: true, opacityStep: Math.round(p.jump.opacity * 100) / 100, measured: true }, confidence: 0.92,
      suggest: { kind: 'advice', text: 'Drive open and closed with a transition on the state, so a close midway reverses from where it is.' },
    }];
  },
};

// #31, measured. Press it and read its style every frame: something changes within 100ms, or the press says nothing.
// Judged against the app, as its still half is: it speaks when the app's other controls do answer a press (two or more
// use an active: style), and says that style. A page that never answers a press is a page finding, not one button's.
export const pressFeedbackProbe = {
  id: 'craft/press-feedback', family: 'craft', number: [31], owns: ['motion'], once: 'ancestor', reads: ['probe:press'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const p = facts.probe(el, 'press');
    if (!p || (p.first !== null && p.first <= T.within)) return [];
    const counts = new Map();
    for (const e of facts.items ?? []) if (e.isConnected && e.matches('button, [role="button"]')) for (const c of classesOf(e).split(/\s+/)) if (c.startsWith('active:')) counts.set(c, (counts.get(c) ?? 0) + 1);
    const [idiom, uses] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!idiom || uses < T.idiom) return [];
    return [{
      ...say('craft/press-feedback-probe', { first: p.first === null ? null : Math.round(p.first) }),
      key: this.id, text: idiom, props: ['transform'], value: 'none', n: p.first ?? 0,
      evidence: { firstChangeMs: p.first === null ? null : Math.round(p.first), idiom, uses, measured: true }, confidence: 0.92,
      suggest: { kind: 'class', from: '', to: idiom, why: 'the press the rest of the app uses' },
    }];
  },
};

// #61. A menu opens on the press, not after the button comes back up.
export const menuPointerdown = {
  id: 'craft/menu-pointerdown', family: 'craft', number: [61], owns: ['interaction'], once: 'ancestor', reads: ['probe:menu-down'],
  check({ el, facts }, theme) {
    const p = facts.probe(el, 'menu-down');
    if (!p || p.down) return [];
    return [{
      ...say(this.id, {}),
      key: this.id, text: 'menu', props: ['touch-action'], value: 'click', n: 0,
      evidence: { openedOnPress: false, measured: true }, confidence: 0.88,
      suggest: { kind: 'advice', text: 'Open it on pointerdown, as Radix’s DropdownMenu and Base UI’s Menu do, so a press-drag-release can pick an item.' },
    }];
  },
};

// #60. Tooltips wait a beat for the first, then none for the next.
export const tooltipDelay = {
  id: 'craft/tooltip-delay', family: 'craft', number: [60], owns: ['motion'], once: 'ancestor', reads: ['probe:tooltip', 'source'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const p = facts.probe(el, 'tooltip');
    if (!p?.lead) return [];
    const ms = { quick: p.t1, slow: p.t1, skip: p.t2, cool: p.t3 }[p.lead];
    // the provider's own prop is the fix, when the code says where the provider is
    const provider = facts.source(el)?.provider;
    const first = p.lead === 'quick' || p.lead === 'slow';
    const name = provider?.library === 'base-ui' ? (first ? 'delay' : null) : first ? 'delayDuration' : 'skipDelayDuration';
    const to = first ? T.want.first : T.want.skip;
    const from = name ? provider?.props?.[name] ?? null : null;
    const suggest = provider && name && from !== to
      ? { kind: 'prop', component: provider.component, name, from, to, why: first ? 'about half a second for the first' : 'no wait for the next, for a moment',
        text: `Set ${name}={${to}} on <${provider.component}>${from === null ? '' : ` (now ${from})`}.`, site: { file: provider.file, line: provider.line, column: provider.column, hash: provider.hash } }
      : { kind: 'advice', text: `On the tooltip provider: delayDuration={${T.want.first}} skipDelayDuration={${T.want.skip}}.` };
    return [{
      ...say(this.id, { kind: p.lead, ms: Math.round(ms) }),
      key: `${this.id}@${p.lead}`, text: 'tooltip', props: ['transition-delay'], value: `${Math.round(ms)}ms`, n: ms,
      evidence: { first: p.t1 === null ? null : Math.round(p.t1), next: p.t2 === null ? null : Math.round(p.t2), back: p.t3 === null ? null : Math.round(p.t3), measured: true }, confidence: 0.88,
      suggest,
    }];
  },
};

// #62. What a keyboard shortcut opens is there at once: no entrance on something used a hundred times a day.
export const paletteMotion = {
  id: 'craft/palette-motion', family: 'craft', number: [62], owns: ['motion'], once: 'ancestor', reads: ['probe:keys'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const p = facts.probe(el, 'keys');
    if (!p || p.enter < T.enter) return [];
    return [{
      ...say(this.id, { enter: Math.round(p.enter), combo: p.combo }),
      key: this.id, text: 'animate-in', props: ['animation'], value: `${Math.round(p.enter)}ms`, n: p.enter,
      // the surface is not on the page at rest: the probe read where its code lives while it was open
      evidence: { combo: p.combo, enter: Math.round(p.enter), measured: true, ...(p.site ? { at: p.site } : {}) }, confidence: 0.88,
      suggest: { kind: 'advice', text: 'Open it with no entrance, or a fade under 80ms. Take animate-in off it.' },
    }];
  },
};

// #59. A submenu stays open while the pointer crosses the next item on its way to it.
export const submenuPath = {
  id: 'craft/submenu-path', family: 'craft', number: [59], owns: ['interaction'], once: 'ancestor', reads: ['probe:submenu'],
  check({ el, facts }, theme) {
    const p = facts.probe(el, 'submenu');
    if (!p?.lost) return [];
    return [{
      ...say(this.id, { crossed: p.crossed }),
      key: this.id, text: 'submenu', props: ['pointer-events'], value: 'closes', n: p.crossed,
      evidence: { crossed: p.crossed, lostAtStep: p.step, measured: true }, confidence: 0.88,
      suggest: { kind: 'advice', text: 'Use a menu with a safe triangle (Radix or Base UI), or give the submenu 300ms of grace before it closes.' },
    }];
  },
};

// #65. Dragged past its end, something gives: it moves less than the pointer and springs back, or it stops dead.
export const overdrag = {
  id: 'craft/overdrag', family: 'craft', number: [65], owns: ['transform'], once: 'ancestor', reads: ['probe:drag'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    const p = facts.probe(el, 'drag');
    if (!p || (p.kind !== 'dead' && p.kind !== 'free')) return [];
    return [{
      ...say(this.id, { kind: p.kind }),
      key: this.id, tier: T.tier, text: 'touch-action', props: ['touch-action'], value: p.kind, n: p.past,
      evidence: { kind: p.kind, moved: p.moved, measured: true }, confidence: 0.82,
      suggest: { kind: 'advice', text: 'Past its limit, move it by a third of the pointer’s travel (x = limit + over × 0.3). Vaul and Motion’s dragElastic do this for you.' },
    }];
  },
};

// Whether the page says anything about the tap highlight where this element is (it is inherited): an inline style, or a
// rule of a style sheet whose selector reaches the element or one above it. A browser's own default can't be read
// (desktop Chromium reports transparent), so what is read is whether the page took the decision.
let TAP = null;
const tapRules = () => {
  if (TAP?.n === document.styleSheets.length) return TAP.list;
  const list = [];
  const walk = (rules) => { for (const r of rules) { if (r.style?.getPropertyValue('-webkit-tap-highlight-color')) list.push(r.selectorText); else if (r.cssRules) walk(r.cssRules); } };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch {} }
  TAP = { n: document.styleSheets.length, list };
  return list;
};
const tapDecided = (el) => !!el.closest('[style*="tap-highlight"]') || tapRules().some((sel) => { try { return !!el.closest(sel); } catch { return false; } });

// #71. A control built from a div: phones flash it grey on a tap, and a drag on it also scrolls the page.
export const touchManipulation = {
  id: 'craft/touch-manipulation', family: 'craft', number: [71], owns: ['interaction'], once: 'ancestor', reads: ['style', 'source'],
  check({ el, facts }, theme) {
    if (el.matches(NATIVE)) return [];
    const source = facts.source(el);
    if (!source) return [];
    const s = facts.style(el);
    const press = el.getAttribute('role') === 'button' || source.handlers.some((h) => /^on(?:Click|PointerDown|PointerUp|MouseDown|MouseUp|TouchStart|TouchEnd)$/.test(h));
    const drag = source.handlers.some((h) => /^on(?:PointerMove|TouchMove|MouseMove|Drag)/.test(h)) && press;
    const clear = tapDecided(el);
    const loose = /^(?:auto|manipulation)$/.test(s.touchAction);
    if (!press || (clear && !(drag && loose))) return [];
    const missing = [];
    if (drag && loose) missing.push('touch-none');
    else if (!drag && s.touchAction === 'auto') missing.push('touch-manipulation');
    if (!clear) missing.push('[-webkit-tap-highlight-color:transparent]');
    return [{
      ...say(this.id, { drag: drag && loose }),
      key: this.id, text: utility(el, 'touch') ?? 'tap highlight', props: ['touch-action', '-webkit-tap-highlight-color'], value: s.touchAction, n: 1,
      evidence: { handlers: source.handlers, touchAction: s.touchAction, tapHighlight: clear ? 'decided' : 'left to the browser' }, confidence: 0.84,
      suggest: { kind: 'class', from: '', to: missing.join(' '), why: drag && loose ? 'the drag keeps the touch' : 'no grey flash, no tap delay' },
    }];
  },
};

// #66, the half that waits. A spinner that shows for a blink on a fast reply is worse than none.
export const spinnerTiming = {
  id: 'craft/spinner-timing', family: 'craft', number: [66], owns: ['motion'], once: 'ancestor', reads: ['other:held', 'probe:press'], pairs: ['held'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);
    // a press that starts a request: the spinner shows on the press itself, so it would flash on a fast reply
    const press = facts.probe(el, 'spinner-press');
    if (press && press.delay < T.press) return [{
      ...say(this.id, { ms: Math.round(press.delay), press: true }),
      key: `${this.id}@press`, text: 'spinner', props: ['animation'], value: `${Math.round(press.delay)}ms`, n: press.delay,
      evidence: { afterPressMs: Math.round(press.delay), measured: true }, confidence: 0.88,
      suggest: { kind: 'advice', text: 'Show it after 200ms, then keep it for at least 500ms (spin-delay: delay 200, minDuration 500).' },
    }];
    const rec = facts.other('held')?.spinner(el);
    if (!rec || rec.fast === null || rec.slow === null || rec.fast >= T.flash || rec.slow < T.slow) return [];
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
  probe: (el, gesture) => (probes.size ? probes.get(`${gesture}|${pathKey(el)}`) ?? null : null),
  source: (el) => known.get(el) ?? (sources.size ? sources.get(pathKey(el)) ?? null : null),
};

export const RUN_RULES = [darkElevation, darkWeight, skeletonMatch, scrollCueSeen, spinnerTiming, exitFasterProbe, interruptibleProbe, pressFeedbackProbe, menuPointerdown, tooltipDelay, paletteMotion, submenuPath, overdrag, touchManipulation];

// the pairs the loaded rules ask for
export const PAIRS = [...new Set(RUN_RULES.flatMap((r) => r.pairs ?? []))];

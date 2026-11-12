/* ─────────────────────────────────────────────────────────
 * STACKS · React Plumber overlay (docs/briefs/pass-spacing.md)
 *
 * The spacing pass's reading: every vertical stack on the page (block, flex column, single-column grid) with the
 * distance between each pair of children, what makes it (the container's gap, a child's top or bottom margin) and the
 * class at the element that sets it. One reader for the page and the census (src/census.ts loads this module in the
 * page), so the site's rhythm and this page's places are measured the same way.
 *
 *  read     readStacks() → [{ stamp, el, display, gaps: [{ d, by, el, cls, why, above, below }] }]; `by` is 'gap' | 'mt' | 'mb' or
 *           null with `why` (a refusal: margins on both sides, space-y, inline style, arbitrary/cqw/var values)
 *  rhythm   rhythmOf(distances) → the steps that together cover most of the distances (craft/rhythm's method)
 *  propose  proposeSpacing(stacks, rhythm, { scope }) → { moves, grouped, kept, refused }
 *    keep   (the default) a stack whose distances form two levels (the larger between runs of ≥ 2 children) is grouped
 *           and kept; a distance off the app's scale (scale.js) goes to the nearest common value on it; in an uneven
 *           stack the few go to the most common value. Nothing on the scale moves
 *    refine the page's relations made fewer and kept in order (docs/research/video-rules.md): each gap measured in em
 *           of the larger text beside it; the page's ratios clustered into levels; levels closer than FLOOR merged
 *           into the one with more places (S5); each gap set to its level's ratio × its own text, nudged by density,
 *           snapped to the app's own scale (scale.js: a 4px grid stays a 4px grid, a ratio stays that ratio),
 *           never reversing the order of two gaps in one stack; a heading kept nearer what it
 *           introduces than what came before (S6). A comparison of the page with itself, never a table of sizes
 *  never    section breaks, refusals, and drawings scaled away from their classes (a demo inside a zoomed frame)
 * ───────────────────────────────────────────────────────── */
import { utility } from './craft-read.js';
import { detectScale, scaleOf } from './scale.js';

const TOL = 1;   // distances within 1px are one level
const NEAR = 0.5; // a distance within half a pixel of a step is on it
const NEAR_SHARE = 0.25; // a step further than a quarter of the distance away is another level, not a correction
const LANDMARK = /^(section|article|header|footer|nav|aside|main)$/, HEADING = /^h[1-6]$/;
const FLOOR = 1.25;  // relation levels closer than this are one level to the eye (S5; scales.md 4.2: a floor, whatever the scale)
const LEAD = 1.25;   // a heading's space above is at least this × its space below (S6)
const DENSITY = 1.44; // one density step is this ratio (two half steps of ~1.2, scales.md 4.3), snapped to the scale
// the spacing unit (`p-4` = 4 × --spacing): what a numeric class should measure
export function unit() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--spacing').trim(), root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const m = /^([\d.]+)(rem|px)$/.exec(v);
  return m ? Number(m[1]) * (m[2] === 'rem' ? root : 1) : 4;
}
// what a spacing class should measure in px, or null when it can't be read off the class (a named token)
function expected(cls, step) {
  const m = /-(\d+(?:\.\d+)?)$/.exec(cls) ?? null, a = /-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(cls);
  if (a) return Number(a[1]) * (a[2] === 'rem' ? 16 : 1);
  return m ? Number(m[1]) * step : null;
}
// the size of the text at an edge of a child: its first or last words (a gap is read against the text it separates)
function edgeSize(el, end) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\S/.test(n.nodeValue ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  let node = walk.nextNode(), last = node;
  if (end === 'last') while (node) { last = node; node = walk.nextNode(); }
  const at = (end === 'last' ? last : node)?.parentElement ?? el;
  return parseFloat(getComputedStyle(at).fontSize) || null;
}
const px = (v) => (v === 'normal' || v == null ? 0 : parseFloat(v) || 0);
const round = (n) => Math.round(n * 10) / 10;

// A child that takes part in the stack's flow: rendered, in flow, with a box
function flows(el) {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.display === 'contents' || s.position === 'absolute' || s.position === 'fixed' || s.float !== 'none') return false;
  const r = el.getBoundingClientRect();
  return r.height > 0 || r.width > 0;
}

// What sets a margin or gap, and whether it can be rewritten: the class, or why not
function setter(el, prefix, value, step) {
  const inline = el.style?.getPropertyValue(prefix === 'gap' ? 'row-gap' : prefix === 'mt' ? 'margin-top' : 'margin-bottom') || (prefix === 'gap' && el.style?.getPropertyValue('gap'));
  if (inline) return { why: 'set by an inline style' };
  const cls = prefix === 'gap' ? (utility(el, 'gap-y') ?? utility(el, 'gap', { not: /^x(?:-|$)/ })) : (utility(el, prefix) ?? utility(el, 'my') ?? utility(el, 'm', { not: /^[xytrblse](?:-|$)/ }));
  if (!cls) return { why: value ? 'set by a stylesheet, not a class here' : null };
  if (/\[(?:[^\]]*(?:cqw|cqh|vw|vh|var\(|calc\(|clamp\())/.test(cls)) return { cls, why: 'a size that follows the screen or a variable' };
  if (/\[[\d.]+(?:em|%|lh|ch|ex)\]$/.test(cls)) return { cls, why: 'a size that follows its text' };
  if (/^-/.test(cls)) return { cls, why: 'a negative margin' };
  const want = expected(cls, step);
  if (want != null && Math.abs(want - value) > 1) return { cls, why: 'drawn at another scale than its class (a zoomed drawing)' };
  return { cls };
}

export function readStacks(root = document.body) {
  const out = [], step = unit();
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay, svg')) continue;
    const s = getComputedStyle(el);
    const flex = /flex/.test(s.display), grid = /grid/.test(s.display);
    if (flex && !/column/.test(s.flexDirection)) continue;
    if (!flex && !grid && !/^(block|flow-root|list-item)$/.test(s.display)) continue;
    const kids = [...el.children].filter(flows);
    if (kids.length < 2) continue;
    const rects = kids.map((k) => k.getBoundingClientRect());
    // vertical only: each child starts below the one before (a grid with columns, a wrapped row, is not a stack)
    if (rects.some((r, i) => i && r.top < rects[i - 1].bottom - 1)) continue;
    const gap = flex || grid ? px(s.rowGap) : 0;
    const gaps = [];
    for (let i = 1; i < kids.length; i++) {
      const d = round(rects[i].top - rects[i - 1].bottom);
      const mt = px(getComputedStyle(kids[i]).marginTop), mb = px(getComputedStyle(kids[i - 1]).marginBottom);
      let by = null, at = null, why = null, set = null;
      if (utility(el, 'space-y')) why = 'set for every child at once (space-y)';
      else if (gap && !mt && !mb) { by = 'gap'; at = el; set = setter(el, 'gap', gap, step); }
      else if (!gap && mt && !mb) { by = 'mt'; at = kids[i]; set = setter(kids[i], 'mt', mt, step); }
      else if (!gap && mb && !mt) { by = 'mb'; at = kids[i - 1]; set = setter(kids[i - 1], 'mb', mb, step); }
      else if (!gap && !mt && !mb) why = d > 0.5 ? 'made by padding or line height, not a gap' : null;
      else why = 'made by more than one margin or gap';
      // the class must make the whole distance: a grid's content-between, or a margin that collapses, draws more
      if (set && !set.why && Math.abs(d - (by === 'gap' ? gap : by === 'mt' ? mt : mb)) > 1) set.why = 'made by more than its class (the layout spreads it)';
      if (set) { why = set.why ?? null; if (why) by = null; }
      // section level: between landmarks, or the page's own main column. Deliberate breaks, moved only at scope
      // refine/new (pass-spacing.md), never evened out with the rows inside them
      const section = el.localName === 'main' || el.localName === 'body' || [kids[i - 1], kids[i]].some((k) => LANDMARK.test(k.localName));
      // the text it separates (a gap is read in em of the larger: S4), and whether a heading starts below it (S6)
      const em = Math.max(edgeSize(kids[i - 1], 'last') ?? 0, edgeSize(kids[i], 'first') ?? 0) || null;
      // S6 applies where a heading follows body content: not under its own label (an eyebrow is the heading's), and not
      // between cards that each start with a heading (a row of same-shaped things keeps one gap: S2)
      const headed = (k) => HEADING.test(k.localName) || HEADING.test(k.firstElementChild?.localName ?? '');
      const body = (k) => { const r = k.getBoundingClientRect(), lh = parseFloat(getComputedStyle(k).lineHeight) || (parseFloat(getComputedStyle(k).fontSize) || 16) * 1.4; return !HEADING.test(k.localName) && r.height > lh * 1.8; };
      const heads = headed(kids[i]) && !headed(kids[i - 1]) && body(kids[i - 1]);
      gaps.push({ d, by, el: at, cls: set?.cls ?? null, why, after: i - 1, above: kids[i - 1], below: kids[i], section, em, heads });
    }
    out.push({ stamp: el.getAttribute('data-plumb-source'), el, display: s.display, gaps });
  }
  return out;
}

// The rhythm: distance clusters, largest first, until they cover most of the distances
export function rhythmOf(distances, { majority = 0.9, min = 2 } = {}) {
  const ds = distances.filter((d) => d >= min && Math.abs(d - Math.round(d)) < 0.1).sort((a, b) => a - b);
  const clusters = [];
  for (const d of ds) { const c = clusters.find((k) => Math.abs(k.value - d) <= TOL); if (c) c.count++; else clusters.push({ value: d, count: 1 }); }
  clusters.sort((a, b) => b.count - a.count);
  const steps = []; let covered = 0;
  for (const c of clusters) { if (covered / (ds.length || 1) >= majority) break; steps.push(c.value); covered += c.count; }
  return steps.sort((a, b) => a - b);
}

// Two levels where each larger distance has a run of two or more children on one side of it: deliberate grouping
// (the aside's eyebrow, title and summary 8px apart, its nav 20px below: a header group, then the nav)
function grouped(gaps) {
  const values = [];
  for (const d of gaps.map((g) => g.d).sort((a, b) => a - b)) if (!values.some((v) => Math.abs(v - d) <= TOL)) values.push(d);
  if (values.length !== 2) return false;
  const big = gaps.map((g) => Math.abs(g.d - values[1]) <= TOL), runs = [];
  let run = 1;
  for (const b of big) { if (b) { runs.push(run); run = 1; } else run++; }
  runs.push(run);
  return runs.slice(1).every((n, i) => n >= 2 || runs[i] >= 2);
}

// The spacing steps the project's own theme names (--spacing-s3: 12px), from the server's decisions: the design system
// as it was decided (docs/VISION.md: "The design system leads. Values snap to the project's decisions"). When a theme
// names its steps they are the scale; only without them is a scale read off what the code happens to use.
let STEPS = [];
export async function loadSteps(fresh = false) {
  if (STEPS.length && !fresh) return STEPS;
  try {
    const { request } = await import('./api.js'), d = await request('decisions', {});
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    if (Array.isArray(d)) STEPS = d.filter((x) => x.family === 'spacing' && /^--spacing-[a-z0-9-]+$/i.test(x.name) && x.origin !== 'framework')
      .map((x) => { const m = /^(-?[\d.]+)(px|rem)$/.exec(String(x.resolved ?? x.value).trim()); return m ? { name: x.name, short: x.name.slice(10), px: Number(m[1]) * (m[2] === 'rem' ? root : 1) } : null; })
      .filter((x) => x && x.px > 0).sort((a, b) => a.px - b.px);
  } catch { /* no server: the scale is read off the code, as before */ }
  return STEPS;
}
export const themeSteps = () => STEPS;
// Whether the named steps are a spacing scale at all: Tailwind keeps named sizes in the same family (--spacing-sidebar:
// 280px, --spacing-header: 64px), and two layout sizes are not a scale to snap a gap to. The steps are the scale only
// when they themselves follow a grid or a ratio, by the same detector that reads a scale off the code (scale.js)
const isScale = (steps) => steps.length > 1 && detectScale(steps.map((x) => ({ v: x.px }))).kind !== 'none';
// its positions are the theme's own, nothing between them
function themeScale(steps) {
  const positions = [...new Set(steps.map((x) => Math.round(x.px)))].sort((a, b) => a - b);
  const near = (v) => positions.reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a), positions[0]);
  return { kind: 'theme', score: 1, unit: unit(), ratio: null, positions, halves: [], near, atLeast: (v) => positions.find((x) => x >= v - 0.5) ?? positions.at(-1) };
}

export function proposeSpacing(stacks, rhythm, { scope = 'keep', density = 0, site = null, steps = STEPS } = {}) {
  if (scope === 'refine') return refine(stacks, rhythm, density, site, steps);
  const moves = [], kept = [], refused = [], groupedStacks = [];
  // the app's scale, from the site's gaps (this page's without a census): a space off it goes to the nearest value on it
  const scale = isScale(steps) ? themeScale(steps) : scaleFrom(site?.length ? site.map((x) => x.d) : stacks.flatMap((s) => s.gaps.filter((g) => g.d > 0.5 && !g.section).map((g) => g.d)));
  const on = (d) => Math.abs(d - Math.round(d)) <= NEAR && (scale.positions.includes(Math.round(d)) || scale.halves.includes(Math.round(d)));
  const nearest = (d) => scale.near(d);
  for (const s of stacks) {
    const live = s.gaps.filter((g) => g.d > 0.5 && !g.section);
    // a space between landmarks is a level of its own (never evened out), but one off the scale still goes onto it
    for (const g of s.gaps) if (g.section && g.d > 0.5) {
      const near = g.by && !on(g.d) ? nearest(g.d) : null;
      if (near != null && Math.abs(near - g.d) <= g.d * NEAR_SHARE && Math.abs(near - g.d) > NEAR) moves.push({ stack: s, gap: g, from: g.d, to: near, rule: 'craft/rhythm' });
      else kept.push({ stack: s, gap: g, section: true });
    }
    for (const g of live) if (!g.by && g.why) refused.push({ stack: s, gap: g });
    // grouped: its two levels are kept (no S2 evening-out), but a level off the scale still goes onto it, as long as the
    // two levels stay two (an inside 7 and a between 18 become 8 and 20, never both 8)
    const isGrouped = grouped(live);
    if (isGrouped) {
      groupedStacks.push(s);
      const levels = [...new Set(live.map((g) => Math.round(g.d)))].map((d) => (on(d) ? d : nearest(d)));
      if (new Set(levels).size < 2) continue;
    }
    // uneven: siblings of one kind (rows of a list, cards: one tag) the same distance apart, most at one value, a few
    // not: the few go to it. A stack of different things (an eyebrow, a title, its rule, a figure) is a hierarchy, not a
    // row: its distances differ on purpose (S2 is similarity, and they aren't similar)
    const to = new Map(), counts = new Map();
    const alike = new Set(live.flatMap((g) => [g.above?.localName, g.below?.localName])).size === 1;
    for (const g of live) { const k = [...counts.keys()].find((v) => Math.abs(v - g.d) <= TOL) ?? g.d; counts.set(k, (counts.get(k) ?? 0) + 1); }
    const mode = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (!isGrouped && alike && live.length >= 3 && mode && mode[1] > live.length / 2) for (const g of live) if (Math.abs(g.d - mode[0]) > TOL) to.set(g, { d: mode[0], rule: 'hierarchy/S2' });
    for (const g of live) {
      if (!g.by) continue;
      // off the scale: only to a value close to it. A distance with none within a quarter of it is a level of its own:
      // snapping it would flatten the page's hierarchy
      const near = !on(g.d) ? nearest(g.d) : null;
      const want = to.get(g) ?? (near != null && Math.abs(near - g.d) <= g.d * NEAR_SHARE ? { d: near, rule: 'craft/rhythm' } : null);
      if (want && Math.abs(want.d - g.d) > NEAR) moves.push({ stack: s, gap: g, from: g.d, to: want.d, rule: want.rule });
      else kept.push({ stack: s, gap: g });
    }
  }
  return { moves, grouped: groupedStacks, kept, refused, scale: { kind: scale.kind, score: scale.score, unit: scale.unit, ratio: scale.ratio, positions: scale.positions, halves: scale.halves } };
}
// the scale a list of distances follows (scale.js), counted by whole pixel
function scaleFrom(distances) {
  const uses = new Map(); for (const d of distances) if (Math.abs(d - Math.round(d)) < 0.1) uses.set(Math.round(d), (uses.get(Math.round(d)) ?? 0) + 1);
  return scaleOf([...uses].map(([v, n]) => ({ v, n })), { grid: unit() });
}

// Refine (see the header): the page's own relations, fewer and in order. density −1 airy … +1 compact scales them
// `site`: every row-level gap the census read on every route ({ d, em }), so a shared component gets one answer on
// every page; without it, this page's own gaps stand in
function refine(stacks, rhythm, density = 0, site = null, steps = STEPS) {
  const moves = [], kept = [], refused = [], factor = DENSITY ** -density;
  const rows = [];
  for (const s of stacks) for (const g of s.gaps) {
    if (g.d <= 0.5) continue;
    if (g.section) { kept.push({ stack: s, gap: g, section: true }); continue; }
    if (!g.by || !g.em) { if (g.why) refused.push({ stack: s, gap: g }); continue; }
    rows.push({ s, g, r: g.d / g.em });
  }
  // the site's relation levels (this page's, without a census): ratios within 15% are one, then levels closer than
  // RATIO merge into the larger crowd
  const levels = [], basis = site?.length ? site.filter((x) => x.em && x.d > 0.5).map((x) => ({ d: x.d, r: x.d / x.em })) : rows.map((x) => ({ d: x.g.d, r: x.r }));
  // the scale the app's gaps follow: every target lands on one of its positions
  const scale = isScale(steps) ? themeScale(steps) : scaleFrom(basis.map((x) => x.d)), snap = (v, from) => scale.near(v, from);
  for (const row of [...basis].sort((a, b) => a.r - b.r)) {
    const last = levels[levels.length - 1];
    if (last && row.r <= last.from * 1.15) last.rows.push(row); else levels.push({ from: row.r, rows: [row] });
  }
  for (const l of levels) { const rs = l.rows.map((x) => x.r).sort((a, b) => a - b); l.r = rs[Math.floor(rs.length / 2)]; }
  for (let i = 1; i < levels.length; i++) {
    const a = levels[i - 1], b = levels[i];
    if (b.r < a.r * FLOOR) { const keep = a.rows.length >= b.rows.length ? a : b; keep.rows = [...a.rows, ...b.rows]; levels.splice(i - 1, 2, keep); i--; }
  }
  // each gap to the level its ratio falls in (the nearest level, on a log scale)
  const levelOf = (r) => levels.reduce((a, b) => (Math.abs(Math.log(b.r / r)) < Math.abs(Math.log(a.r / r)) ? b : a), levels[0]);
  const to = new Map();
  for (const row of rows) to.set(row.g, snap(levelOf(row.r).r * row.g.em * factor, Math.round(row.g.d)));
  // one class, one write: every gap one class makes (a container's gap, a stamp's margin drawn many times) moves together,
  // to the target most of them want (a tie: the one nearest what it is now)
  const writeOf = (g) => `${g.by === 'gap' ? g.el?.getAttribute('data-plumb-source') ?? '' : (g.el?.getAttribute('data-plumb-source') ?? '').split('#')[0]}|${g.by}|${g.cls}`;
  const writes = new Map();
  for (const g of to.keys()) { const k = writeOf(g); if (!writes.has(k)) writes.set(k, []); writes.get(k).push(g); }
  for (const gs of writes.values()) {
    if (gs.length < 2) continue;
    const votes = new Map(); for (const g of gs) votes.set(to.get(g), (votes.get(to.get(g)) ?? 0) + 1);
    const d = gs[0].d, win = [...votes].sort((a, b) => b[1] - a[1] || Math.abs(a[0] - d) - Math.abs(b[0] - d))[0][0];
    for (const g of gs) to.set(g, win);
  }
  const stay = (g) => { for (const x of writes.get(writeOf(g)) ?? [g]) to.set(x, x.d); };
  for (const s of stacks) {
    const live = s.gaps.filter((g) => to.has(g));
    // never reverse two gaps of one stack: a gap that was clearly smaller stays smaller (else both stay as they are)
    for (const a of live) for (const b of live) if (a.d < b.d - TOL && to.get(a) > to.get(b)) { stay(a); stay(b); }
    // S6: a heading sits nearer what it introduces than what came before it
    live.forEach((g, k) => {
      const below = s.gaps[s.gaps.indexOf(g) + 1];
      if (!g.heads || !below || below.d <= 0.5) return;
      const under = to.get(below) ?? below.d, over = to.get(g);
      // (only a gap with a write of its own: raising a shared class would move every gap it makes)
      if (over < under * LEAD && (writes.get(writeOf(g))?.length ?? 1) === 1) to.set(g, scale.atLeast(under * LEAD));
    });
    for (const g of live) {
      const want = to.get(g);
      if (Math.abs(want - g.d) > NEAR) moves.push({ stack: s, gap: g, from: g.d, to: want, rule: g.heads && want > g.d ? 'hierarchy/S6' : 'hierarchy/S5', em: +(g.d / g.em).toFixed(2) });
      else kept.push({ stack: s, gap: g });
    }
  }
  return { moves, grouped: [], kept, refused, levels: levels.map((l) => ({ em: +l.r.toFixed(2), places: l.rows.length })), scale: { kind: scale.kind, score: scale.score, unit: scale.unit, ratio: scale.ratio, positions: scale.positions, halves: scale.halves } };
}

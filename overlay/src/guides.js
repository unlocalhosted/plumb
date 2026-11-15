/* ─────────────────────────────────────────────────────────
 * GUIDES · React Plumber overlay (layer 1: read and draw; no judgement yet)
 *
 * The lines a designer draws down a screen to see what lines up (docs/research/alignment-discourse.md; the three
 * 2026-11-15 screenshots in docs/references.md). The unit is the screen, not a component: a guide runs across
 * separate bars and panels, because that is where alignment is lost.
 *
 *  thing    something the eye sees an edge of: a run of words (measured as the words, not their box), a picture or
 *           icon, a filled or outlined box, a form control. Only what is in view and not covered by display rules
 *  edge     each thing gives its left edge and its right edge; an icon or picture also gives its centre (things of
 *           different sizes share a slot by their centres). Wrapped text gives no right edge: a ragged side is not
 *           an edge
 *  guide    edges of one kind within NEAR px of each other, on at least two things. It runs from its topmost
 *           thing to its lowest. { x, kind, things, top, bottom }
 *  loose    an edge that no other thing shares. Counted, not drawn: on a real page there are hundreds
 *  draw     not here: roast.js says what the guides found, one note at a time, and draws only the line a note needs
 *  judge    layer 2, one judgement: every thing has one anchor. "Either be left-right positioning, or centering"
 *           (Karri Saarinen, 2026-11-08, docs/references.md): a thing sits on a guide by its left edge, its right
 *           edge or its centre. A thing with an anchor is left alone, whatever its other edges do (words anchored
 *           on the left end wherever they end). A thing with none is measured against the nearest guide that runs
 *           past it, on the edge that is closest:
 *             near     off the guide by less than one unit of the app's spacing grid. The grid has no step that
 *                      small, so the offset cannot have been chosen; it reads as a miss
 *           held     first, which line is it on? If the nearest things above and below it in its column (looking
 *                    past up to WALK things, so a stray beside a stray still finds the line) sit on one line, the
 *                    thing belongs to that line, and an offset under HELD_STEPS grid steps is a slip, not an indent:
 *                    an indent says "child of the thing above", and a child its siblings resume after, a step or
 *                    two in, reads as a mistake. The column's line outranks a line the thing touches by chance
 *                    (a ragged right edge that happens to match another word's), never another line of its own
 *                    kind. Words that follow words on their row (a count after a heading) start no column. A nested group that means it shares its own line and is never
 *                    judged here. GUESS, not yet sourced: the 2 steps; Linear's nested rows sit about 20px in
 *           a thing not held is judged against the nearest line that runs past it, "just off" under one step only.
 *           an offset of a unit or more is left alone for now: it may be an indent. (Tried 2026-11-15: "further
 *           than a unit and not a whole number of units". On the messy tracker 8 of its 9 were toolbar buttons
 *           measured against a guide far away, so "the nearest guide that runs past it" is not yet a good enough
 *           test of which guide a thing belongs to. The miss this left, a label 4px off its line between two on it, is what "held" catches.)
 *           unit: the theme's --spacing (Tailwind v4's base unit) when the page declares it, else 4px (Tailwind's
 *           default, and the small step of Material's 4dp/8dp grid)
 * Nothing here writes. NEAR is the measuring tolerance (sub-pixel layout), not a judgement of "close enough".
 * ───────────────────────────────────────────────────────── */

const WALK = 3;         // things to look past, up or down, for a neighbour on a line (a stray beside a stray)
const HELD_STEPS = 2;   // a thing held between two neighbours on one line is a slip up to this many grid steps off
const NEAR = 0.5;        // px: two edges this close are one line (sub-pixel rounding), never "nearly aligned"
const MIN_SIDE = 4;      // px: smaller than this is a hairline or a dot, not a thing with edges
const MEDIA = 'svg, img, canvas, video, picture';
const CONTROL = 'input, textarea, select, button';
const OURS = 'plumb-overlay, [data-plumb-layer]';

const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[,/]/); return p.length > 3 ? parseFloat(p[3]) : 1; };
const wordsRect = (el) => {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity; const tops = new Set();
  for (const n of el.childNodes) {
    if (n.nodeType !== 3 || !n.data.trim()) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) { if (!q.width || !q.height) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); tops.add(Math.round(q.top)); }
  }
  return tops.size ? { left: l, top: t, right: r, bottom: b, lines: tops.size } : null;
};

/** Every thing in view under `root`, with the edges it gives. Reads only. */
export function readThings(root = document.body) {
  const vw = innerWidth, vh = innerHeight, things = [];
  const walk = (el) => {
    if (el.matches(OURS)) return;
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility !== 'visible' || parseFloat(cs.opacity) === 0) return;
    // text for screen readers only (sr-only: a 1px clipped box) is not seen, so it has no edge to line up
    if ((r.width <= 1 || r.height <= 1) && cs.overflow !== 'visible' || /^rect\(0(px)?,?\s*0/.test(cs.clip) || /inset\(50%\)/.test(cs.clipPath)) return;
    const add = (kind, b, lines = 1) => {
      if (b.right - b.left < MIN_SIDE || b.bottom - b.top < MIN_SIDE) return;
      if (b.bottom <= 0 || b.top >= vh || b.right <= 0 || b.left >= vw) return;
      things.push({ el, kind, left: b.left, right: b.right, top: b.top, bottom: b.bottom, lines });
    };
    if (el.matches(MEDIA)) { if (inView) add('picture', r); return; } // an icon's inner shapes are not things
    if (inView && el !== root) {
      const filled = alpha(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none';
      const outlined = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && alpha(cs[`border${s}Color`]) > 0.02);
      if (el.matches(CONTROL) || filled || outlined || cs.boxShadow !== 'none') add('box', r);
    }
    const words = wordsRect(el);
    if (words) add('words', words, words.lines);
    for (const c of el.children) walk(c);
  };
  walk(root);
  return things;
}

/** Things → guides: edges of one kind that at least two things share. */
export function readGuides(root = document.body) {
  const things = readThings(root);
  const edges = [];
  for (const t of things) {
    edges.push({ kind: 'left', x: t.left, t });
    if (t.lines === 1) edges.push({ kind: 'right', x: t.right, t });
    if (t.kind === 'picture') edges.push({ kind: 'centre', x: (t.left + t.right) / 2, t });
  }
  const guides = []; let loose = 0;
  for (const kind of ['left', 'right', 'centre']) {
    const run = edges.filter((e) => e.kind === kind).sort((a, b) => a.x - b.x);
    for (let i = 0; i < run.length;) {
      let j = i + 1;
      while (j < run.length && run[j].x - run[j - 1].x <= NEAR) j++;
      const group = run.slice(i, j);
      // a box and the words that fill it edge to edge are one thing seen twice: count places, not elements
      const places = new Set(group.map((e) => `${Math.round(e.t.top)}:${Math.round(e.t.bottom)}`));
      if (places.size >= 2) guides.push({
        kind, x: group.reduce((s, e) => s + e.x, 0) / group.length, things: group.map((e) => e.t),
        top: Math.min(...group.map((e) => e.t.top)), bottom: Math.max(...group.map((e) => e.t.bottom)), count: places.size,
      });
      else loose++;
      i = j;
    }
  }
  return { guides, loose, things: things.length, all: things, strays: judge(things, guides) };
}

const gridUnit = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--spacing').trim();
  const n = parseFloat(v); if (!n) return 4;
  return /rem$/.test(v) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
};

/** Things with no anchor, each against the nearest guide that runs past it. → [{ thing, kind, guide, by, verdict }] */
function judge(things, guides) {
  const unit = gridUnit(), anchored = new Map();          // thing → the guides it sits on
  for (const g of guides) for (const t of g.things) anchored.set(t, [...(anchored.get(t) ?? []), g]);
  const edgeOf = (t, kind) => (kind === 'left' ? t.left : kind === 'right' ? t.right : (t.left + t.right) / 2);
  const column = (t) => things.filter((o) => o !== t && o.kind === t.kind && o.left < t.right && o.right > t.left);
  // the nearest thing above (dir -1) or below (dir 1) in t's column that sits on a line of this kind, within WALK things
  const neighbour = (t, dir, kind) => {
    const side = column(t).filter((o) => (dir < 0 ? o.bottom <= t.top + NEAR : o.top >= t.bottom - NEAR))
      .sort((a, b) => (dir < 0 ? b.bottom - a.bottom : a.top - b.top)).slice(0, WALK);
    for (const o of side) {
      const on = anchored.get(o) ?? [];
      // left-aligned words end where their words end: a right line they touch is chance, not their line
      if (kind === 'right' && o.kind === 'words' && on.some((h) => h.kind === 'left')) continue;
      const g = on.find((h) => h.kind === kind); if (g) return g;
    }
    return null;
  };
  const strays = [], seen = new Set();
  // words that follow other words on their row (a count after a heading) are mid-row: they start no column
  const midRow = (t) => things.some((o) => o !== t && o.kind === 'words' && o.right <= t.left + NEAR && t.left - o.right < 24
    && o.top < t.bottom && o.bottom > t.top && o.el.parentElement === t.el.parentElement);
  for (const t of things) {
    const on = anchored.get(t) ?? [];
    const mine = ['left']; if (t.lines === 1) mine.push('right'); if (t.kind === 'picture') mine.push('centre');
    let best = null;
    // 1. held between neighbours: the things above and below it in its column sit on one line, so it belongs there.
    //    The column's line outranks a line it touches by chance (a ragged right edge that matches another word's),
    //    but not another line of the same kind: on a different left line, it is somewhere else on purpose
    if (!midRow(t)) for (const kind of mine) {
      if (on.some((h) => h.kind === kind)) continue;
      if (kind === 'right' && t.kind === 'words' && getComputedStyle(t.el).textAlign.match(/^(start|left|justify)$/)) continue;
      const g = neighbour(t, -1, kind);
      if (!g || g !== neighbour(t, 1, kind)) continue;
      const by = edgeOf(t, kind) - g.x;
      if (!best || Math.abs(by) < Math.abs(best.by)) best = { thing: t, kind, guide: g, by, x: edgeOf(t, kind), held: true };
    }
    // 2. else, if it sits on no line at all, the nearest line that runs past it
    if (!best && !on.length) for (const kind of mine) for (const g of guides) {
      if (g.kind !== kind || t.bottom <= g.top || t.top >= g.bottom) continue;
      const by = edgeOf(t, kind) - g.x;
      if (!best || Math.abs(by) < Math.abs(best.by)) best = { thing: t, kind, guide: g, by, x: edgeOf(t, kind) };
    }
    if (!best) continue;
    // inside a framed thing on the same line, by exactly its border: it sits on the frame's inner edge, as it must
    const side = best.kind === 'right' ? 'Right' : 'Left';
    if (best.guide.things.some((o) => o.el !== t.el && o.el.contains(t.el) && Math.abs(Math.abs(best.by) - parseFloat(getComputedStyle(o.el)[`border${side}Width`])) <= NEAR)) continue;
    const d = Math.abs(best.by);
    if (d <= NEAR || d >= (best.held ? HELD_STEPS : 1) * unit) continue;
    const place = `${best.kind}:${Math.round(best.x)}:${Math.round(t.top)}:${Math.round(t.bottom)}`; // a box and its words: once
    if (seen.has(place)) continue; seen.add(place);
    strays.push({ ...best, verdict: 'near', unit });
  }
  return strays;
}

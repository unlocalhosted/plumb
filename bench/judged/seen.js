// The seen picture (docs/briefs/shape-engine.md, sections 12, 13 and 15): what a page looks like it says, before a
// word is read. Pure: it takes plain rows and gives back a tree. It never touches the page.
//
//   grow(units)  units: [{ parent, kind, x, y, w, h }], where parent is the row number of the drawn box a unit lies
//                in (or -1) and kind is 'text' | 'picture' | 'box' | 'line'
//                → a tree of nodes: { type, unit?, children?, axis?, ratio?, gap? }
//                  'unit'    one drawn area with nothing inside it
//                  'box'     a drawn box (enclosure: yes or no). Its children are the parts its content splits
//                            into, and `how` says how: the type, axis, ratio or gap of that split
//                  'groups'  things set apart from each other by a gap at least 1.5 times the gaps inside them
//                            (`ratio` is how many times)
//                  'run'     things in a row or a column with even gaps (`gap` is the usual one)
//                  'pile'    things that overlap, so no gap separates them
//
// Nearness is read as a ratio of gaps and never as a distance: the pure distance law (Kubovy and Wagemans 1995, as
// reported in Wagemans and others 2012), measured on dots, where a ratio past about 1.5 read one way. Lines (a rule
// between two things) are left out of the grouping: a divider is a cue of its own, for a later layer.

export const RATIO = 1.5; // where a gap starts to read as "between groups". Published, on dots.
const TOUCH = 0.5;        // gaps under half a pixel are no gap

const far = (axis) => (axis === 'y' ? (u) => [u.y, u.y + u.h] : (u) => [u.x, u.x + u.w]);

// what is drawn under a node, as one box
export function boxOf(node) {
  if (node.bounds) return node.bounds;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (r) => { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); };
  if (node.rect) take(node.rect);
  else for (const c of node.children) take(boxOf(c));
  return (node.bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
}

// the things in a row along one axis, cut wherever nothing is drawn: bands, and the gap before each band but the first
function bands(nodes, axis) {
  const span = far(axis), sorted = [...nodes].sort((a, b) => span(boxOf(a))[0] - span(boxOf(b))[0]);
  const out = [[sorted[0]]], gaps = [];
  let end = span(boxOf(sorted[0]))[1];
  for (const n of sorted.slice(1)) {
    const [from, to] = span(boxOf(n));
    if (from - end > TOUCH) { gaps.push(from - end); out.push([n]); } else out.at(-1).push(n);
    end = Math.max(end, to);
  }
  return { axis, bands: out, gaps, widest: gaps.length ? Math.max(...gaps) : 0 };
}

function cut(nodes, depth = 0) {
  if (nodes.length === 1) return nodes[0];
  const tries = depth > 24 ? [] : [bands(nodes, 'y'), bands(nodes, 'x')].filter((t) => t.gaps.length);
  if (!tries.length) return { type: 'pile', children: nodes };
  // the direction with the widest empty strip is the one the eye cuts along first
  const t = tries.sort((a, b) => b.widest - a.widest)[0];
  const sizes = [...new Set(t.gaps.map((g) => Math.max(1, Math.round(g))))].sort((a, b) => a - b);
  let at = -1, ratio = 0;
  for (let j = 0; j < sizes.length - 1; j++) { const r = sizes[j + 1] / sizes[j]; if (r >= RATIO && r > ratio) { ratio = r; at = j; } }
  if (at < 0) {
    const mid = [...t.gaps].sort((a, b) => a - b)[Math.floor(t.gaps.length / 2)];
    return { type: 'run', axis: t.axis, gap: Math.round(mid), children: t.bands.map((b) => cut(b, depth + 1)) };
  }
  const big = sizes[at + 1] - 0.5, clusters = [[...t.bands[0]]];
  t.gaps.forEach((g, k) => { if (g >= big) clusters.push([...t.bands[k + 1]]); else clusters.at(-1).push(...t.bands[k + 1]); });
  return { type: 'groups', axis: t.axis, ratio: Math.round(ratio * 10) / 10, children: clusters.map((c) => cut(c, depth + 1)) };
}

// What lies on a drawn box is in it, however the page is built. A shape set behind a row of links is their box
// though the page's code makes it their neighbour, and read as a neighbour it overlaps them all and makes a pile.
// Gives new rows, with each one's parent moved to the smallest box beside it that it lies wholly on.
export function settle(units) {
  const out = units.map((u) => ({ ...u })), beside = new Map();
  out.forEach((u, i) => (beside.get(u.parent) ?? beside.set(u.parent, []).get(u.parent)).push(i));
  const area = (u) => u.w * u.h, on = (b, u) => u.x >= b.x - 1 && u.y >= b.y - 1 && u.x + u.w <= b.x + b.w + 1 && u.y + u.h <= b.y + b.h + 1;
  for (const all of beside.values()) {
    const boxes = all.filter((i) => units[i].kind === 'box');
    for (const i of all) {
      let best = -1;
      for (const b of boxes) if (b !== i && area(units[b]) > area(units[i]) && on(units[b], units[i]) && (best < 0 || area(units[b]) < area(units[best]))) best = b;
      if (best >= 0) out[i].parent = best;
    }
  }
  return out;
}

export function grow(units) {
  const kids = new Map();
  units.forEach((u, i) => { if (u.kind !== 'line') (kids.get(u.parent) ?? kids.set(u.parent, []).get(u.parent)).push(i); });
  const node = (i) => {
    const u = units[i], rect = { x: u.x, y: u.y, w: u.w, h: u.h }, inside = (kids.get(i) ?? []).map(node);
    if (u.kind !== 'box' || !inside.length) return { type: 'unit', unit: i, rect };
    // a box holds the parts its content splits into, and says how it splits
    const inner = cut(inside);
    if (inner.type === 'unit' || inner.type === 'box') return { type: 'box', unit: i, rect, children: [inner] };
    return { type: 'box', unit: i, rect, how: { type: inner.type, axis: inner.axis, ratio: inner.ratio, gap: inner.gap }, children: inner.children };
  };
  const top = (kids.get(-1) ?? []).map(node);
  return top.length ? cut(top) : { type: 'pile', children: [] };
}

// where each single thing and each drawn box sits, for a layer that must only compare things that sit alike:
//   scope  'ground' when no drawn box is round it, else 'in:' and the row number of whatever holds its box (so the
//          things inside the cards of one grid share a scope, and differ from the things on the page itself)
//   row    a number when the first split above it is a row (things side by side), the same number for everything
//          in that row; -1 when it stands in a column, in a pile or alone
//   group  the same, for a row or a column: the number of the first split above it, or -1 in a pile or alone
export function places(tree, units) {
  const out = new Map(); let id = 0;
  const put = (i, split) => { const b = units[i].parent; out.set(i, { scope: b < 0 ? 'ground' : `in:${units[b].parent}`, row: split?.axis === 'x' ? split.id : -1, group: split?.axis ? split.id : -1 }); };
  const walk = (n, split) => {
    if (n.type === 'unit') return put(n.unit, split);
    // a drawn box has a place of its own, as well as the things inside it
    if (n.type === 'box') put(n.unit, split);
    const next = n.type !== 'box' ? { id: id++, axis: n.axis } : n.how ? { id: id++, axis: n.how.axis } : split;
    for (const c of n.children ?? []) walk(c, next);
  };
  walk(tree, null);
  return out;
}

// every node with its level: 1 for the parts the page first splits into, 2 for what each part splits into, and so
// on. A part may be a single unit.
export function levels(tree) {
  const out = [];
  const walk = (n, level) => { out.push({ node: n, level }); for (const c of n.children ?? []) walk(c, level + 1); };
  // the root is the page itself, and so is a box that holds everything on it: their parts are level 1
  let page = tree;
  while (page.type === 'box' && !page.how && page.children[0].type === 'box') page = page.children[0];
  if (page.type === 'unit' || (page.type === 'box' && !page.how)) walk(page, 1); else for (const c of page.children) walk(c, 1);
  return out;
}

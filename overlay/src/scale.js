/* ─────────────────────────────────────────────────────────
 * SCALE · React Plumber overlay (docs/research/scales.md)
 *
 * Which scale an app's values follow, read off the values it uses: a linear grid (4, 8, 12 …), a ratio (16 × 1.25ⁿ),
 * a grid that turns into a ratio above some size, or none (hand-picked). Read-only: a pass refines inside the app's own
 * scale and never moves it to another one.
 *
 *  detect   detectScale(items) → { kind, linear, geometric, hybrid, shares, ladder }; items [{ v: px, n: uses }]
 *  ladder   rankFit(sizes) → the one ratio that best explains a short ladder with no missing steps (type sizes)
 *  snap     scaleOf(items) → { kind, score, unit, ratio, positions, near(v, from), atLeast(v) }: where a pass may go
 *
 * How detection scores (scales.md 3.2): each model is a list of positions; a value fits a position within its rounding
 * noise plus 2%; what values spread at random would also fit is subtracted, and so is what the same search reaches on
 * random values (a fine ratio fits anything, so it can't win by being fine). Strong ≥ 0.7, weak 0.5–0.7, else none.
 * ───────────────────────────────────────────────────────── */

export const NAMED = { 'minor second': 1.067, 'major second': 1.125, 'minor third': 1.2, 'major third': 1.25, 'perfect fourth': 1.333, 'augmented fourth': 1.414, 'perfect fifth': 1.5, golden: 1.618, 'major sixth': 1.667, octave: 2 };
const UNITS = [2, 3, 4, 5, 6, 8, 10, 12, 16];
const NEAR_SHARE = 0.25; // a used position within a quarter of the value is preferred to a new one
const HALVES = 4; // half steps stop below four units, as Tailwind's do (0.5 … 3.5): an 18 on a 4px grid is drift
const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function detectScale(items, { snap = 1, relTol = 0.02, trials = 8 } = {}) {
  const total = items.reduce((a, b) => a + (b.n ?? 1), 0), counted = items.some((i) => (i.n ?? 1) !== 1);
  let pts = items.filter((i) => i.v > 0).map((i) => ({ v: i.v, n: i.n ?? 1 })).sort((a, b) => a.v - b.v);
  if (pts.length < 2) return { kind: 'none', distinct: pts.length, dropped: [], linear: { unit: null, score: 0 }, geometric: { ratio: null, score: 0 }, shares: {}, ladder: null, hybrid: null };
  let dropped = [];
  if (counted && pts.length > 8) { // outliers: under 0.5% of uses (and used < 2 times), only if enough remain
    const keep = pts.filter((p) => p.n >= 2 && p.n >= 0.005 * total);
    if (keep.length >= 6) { dropped = pts.filter((p) => !keep.includes(p)).map((p) => p.v); pts = keep; }
  }
  const tol = (s) => snap / 2 + relTol * s;
  const wt = (p) => (counted ? Math.log(1 + p.n) : 1);
  const linN = (u) => (v) => { const i = Math.max(1, Math.round(v / u)); return [i, i * u, true]; };
  const geoN = (r, ph) => { const lr = Math.log(r); return (v) => { const i = Math.round(Math.log(v) / lr - ph); const s = Math.exp((i + ph) * lr); return [i, s, s * (r - 1) >= snap + 2 * relTol * s]; }; };
  // coverage of a point set by a model: share of weight that sits on a step (one value per step), minus what chance gives
  function fit(nearest, set) {
    const best = new Map(); let W = 0, used = 0;
    for (const p of set) {
      const [i, s, ok] = nearest(p.v), d = Math.abs(p.v - s);
      if (!ok) continue; // steps closer together than the snapping noise cannot be told apart
      W += wt(p); used++;
      if (d <= tol(s) && (!best.has(i) || d < best.get(i).d)) best.set(i, { d, p, s });
    }
    let hit = 0; for (const { d, p, s } of best.values()) hit += wt(p) * (1 - d / tol(s)); // closer to a step counts more
    const lo = set[0].v, hi = set.at(-1).v; let c = 0, n = 0;
    for (let k = 0; k < 60; k++) { const x = lo * (hi / lo) ** ((k + 0.5) / 60), [, s, ok] = nearest(x); if (ok) { n++; const d = Math.abs(x - s); if (d <= tol(s)) c += 1 - d / tol(s); } }
    const cov = W ? hit / W : 0, base = n ? c / n : 1;
    return { cov, base, raw: used < 5 || base > 0.75 ? 0 : Math.max(0, (cov - base) / (1 - base)) };
  }
  // how many of the multiples of u up to the median value are really used ("all even numbers" is not a 2px grid)
  const occupancy = (set, u) => { const med = set[set.length >> 1].v, m = Math.max(1, Math.round(med / u));
    const used = new Set(set.filter((p) => p.v <= med + 1e-9).map((p) => Math.round(p.v / u))); return Math.min(1, used.size / m); };
  const bestLinear = (set) => { const all = UNITS.map((u) => { const f = fit(linN(u), set); return { u, ...f, raw: occupancy(set, u) < 0.6 ? 0 : f.raw }; }); const m = Math.max(...all.map((a) => a.raw));
    return all.filter((a) => a.raw >= m - 0.05).sort((a, b) => b.u - a.u)[0]; }; // the coarsest unit that is nearly as good
  const bestGeo = (set, dr = 0.005, dph = 0.02) => { const all = [];
    for (let r = 1.1; r <= 2.101; r += dr) for (let ph = 0; ph < 1; ph += dph) all.push({ r, ph, ...fit(geoN(r, ph), set) });
    const m = Math.max(...all.map((a) => a.raw));
    const near = all.filter((a) => a.raw >= m - 0.03).sort((a, b) => b.r - a.r)[0]; // the coarsest ratio that is nearly as good
    const ok = all.filter((a) => a.raw >= m - 0.1).map((a) => a.r); return { ...near, range: [Math.min(...ok), Math.max(...ok)] }; };
  const bestHybrid = (set) => { let top = null;
    for (let k = 3; k <= set.length - 3; k++) { const lo = set.slice(0, k), hi = set.slice(k);
      const L = bestLinear(lo), G = bestGeo(hi, 0.01, 0.05), sc = Math.min(L.raw, G.raw);
      if (!top || sc > top.raw) top = { raw: sc, breakAt: lo.at(-1).v, u: L.u, r: G.r, ph: G.ph, lowRaw: L.raw, hiRaw: G.raw }; }
    return top; };
  // search penalty: the same searches on random values of the same count, span and weights; what they reach is subtracted
  const R = rng(7), nul = { L: 0, G: 0 }, lo = pts[0].v, hi = pts.at(-1).v;
  for (let t = 0; t < trials; t++) {
    const fake = pts.map((p) => ({ v: Math.max(1, Math.round((lo * (hi / lo) ** R()) / snap) * snap), n: p.n })).sort((a, b) => a.v - b.v);
    nul.L += bestLinear(fake).raw / trials; nul.G += bestGeo(fake, 0.01, 0.05).raw / trials;
  }
  const adj = (x, n) => Math.max(0, (x - n) / (1 - n));
  const L = bestLinear(pts), G = bestGeo(pts), H = pts.length >= 7 ? bestHybrid(pts) : null;
  const sL = adj(L.raw, nul.L), sG = adj(G.raw, nul.G);
  const strong = (x) => x >= 0.7;
  let kind;
  if (strong(sL) && strong(sG)) kind = Math.abs(sL - sG) < 0.1 ? 'ambiguous' : sL > sG ? 'linear' : 'geometric';
  else if (strong(sL)) kind = 'linear';
  else if (strong(sG)) kind = 'geometric';
  else if (H && H.lowRaw >= 0.7 && H.hiRaw >= 0.7) kind = 'hybrid';
  else kind = Math.max(sL, sG) < 0.5 ? 'none' : `weak ${sL >= sG ? 'linear' : 'geometric'}`;
  const anchorOf = (r, ph) => { const top = pts.reduce((a, b) => (b.n > a.n ? b : a)), [, s] = geoN(r, ph)(top.v); return +s.toFixed(1); };
  const f = (x) => +x.toFixed(2), named = (r) => Object.entries({ ...NAMED, 'sqrt(golden)': 1.272 }).sort((a, b) => Math.abs(Math.log(a[1] / r)) - Math.abs(Math.log(b[1] / r)))[0][0];
  const share = (u) => f(pts.reduce((a, p) => a + (Math.abs(p.v / u - Math.round(p.v / u)) * u < 0.05 ? wt(p) : 0), 0) / pts.reduce((a, p) => a + wt(p), 0));
  return { kind, distinct: pts.length, dropped,
    linear: { unit: L.u, onGrid: f(L.cov), score: f(sL) },
    geometric: { ratio: +G.r.toFixed(3), range: G.range.map((x) => +x.toFixed(2)), anchor: anchorOf(G.r, G.ph), nearest: named(G.r), covers: f(G.cov), score: f(sG) },
    shares: { 2: share(2), 4: share(4), 8: share(8) },
    ladder: rankFit(pts.map((p) => p.v)),
    hybrid: H && { breakAt: H.breakAt, unit: H.u, ratio: +H.r.toFixed(2), anchor: anchorOf(H.r, H.ph), lowFit: f(H.lowRaw), highFit: f(H.hiRaw) },
    nullScores: { L: f(nul.L), G: f(nul.G) } };
}

// For a short ladder of sizes (type): fit ln(size) = a + b × rank, no missing steps assumed. A ladder when rmse ≤ 3%
// and the consecutive ratios spread ≤ 0.12
export function rankFit(vs) {
  const n = vs.length;
  if (n < 2) return null;
  const y = vs.map(Math.log), mx = (n - 1) / 2, my = y.reduce((a, b) => a + b) / n;
  const b = y.reduce((a, yi, i) => a + (i - mx) * (yi - my), 0) / vs.reduce((a, _, i) => a + (i - mx) ** 2, 0);
  const rmse = Math.sqrt(y.reduce((a, yi, i) => a + (yi - (my + b * (i - mx))) ** 2, 0) / n);
  const steps = vs.slice(1).map((v, i) => +(v / vs[i]).toFixed(3));
  return { ratio: +Math.exp(b).toFixed(3), rmsePct: +(rmse * 100).toFixed(1), steps, spread: +(Math.max(...steps) - Math.min(...steps)).toFixed(2) };
}

// The positions a pass may propose, from the app's own values (scales.md 4.1): on a linear scale its grid (a 2px grid
// whose uses sit mostly on 4px is a 4px grid with half steps); on a ratio, the ratio's steps; with no clear scale, the
// app's own spacing unit. Half steps the app uses are kept where they are, never a
// target: a gap at 10 whose level wants 10 stays, a gap at 8 never moves to 10. A value the app already uses wins over
// one it doesn't, when it is within a quarter (40 stays 40 rather than becoming a new 36).
// `near(v, from)`: that position for v (`from` counts when it is a used half step); `atLeast(v)`: the smallest
// position ≥ v
export function scaleOf(items, { grid = 4 } = {}) {
  const d = detectScale(items), whole = items.filter((i) => i.v > 0 && Math.abs(i.v - Math.round(i.v)) < 0.1);
  const counted = items.some((i) => (i.n ?? 1) !== 1); // a list without counts (a token scale) is all in use
  const used = (keep) => [...new Set(whole.filter((i) => (!counted || i.n >= 2) && !d.dropped.includes(i.v) && keep(i.v)).map((i) => Math.round(i.v)))]; // the detector's outliers are drift, not positions
  const top = Math.max(...whole.map((i) => i.v), grid);
  const ladder = (anchor, r, from, to) => { const out = []; for (let k = -40; k <= 40; k++) { const s = Math.round(anchor * r ** k); if (s >= from && s <= to) out.push(s); } return out; };
  let kind = d.kind.replace(/^weak /, ''), score, unit = null, ratio = null, positions, halves = [];
  if (d.kind === 'linear' || d.kind === 'ambiguous') {
    kind = 'linear'; score = d.linear.score; unit = d.linear.unit;
    const core = unit === 2 && d.shares[4] >= 0.6 ? 4 : unit;
    positions = Array.from({ length: Math.ceil(top / core) + 1 }, (_, i) => (i + 1) * core);
    halves = used((v) => v % unit === 0 && v % core !== 0 && v < HALVES * core);
    unit = core;
  } else if (d.kind === 'geometric') {
    score = d.geometric.score; ratio = d.geometric.ratio;
    positions = ladder(d.geometric.anchor, ratio, 1, top * 2);
  } else if (d.kind === 'hybrid') {
    score = Math.min(d.hybrid.lowFit, d.hybrid.highFit); unit = d.hybrid.unit; ratio = d.hybrid.ratio;
    positions = [...Array.from({ length: Math.floor(d.hybrid.breakAt / unit) }, (_, i) => (i + 1) * unit), ...ladder(d.hybrid.anchor, ratio, d.hybrid.breakAt + 1, top * 2)];
  } else {
    // no clear scale (often: too few values to tell): the app's own spacing unit, and the half steps it uses on it.
    // A used value off the unit (an mt-[7px]) is not a position: it is what the pass is for
    kind = 'none'; score = Math.max(d.linear.score, d.geometric.score); unit = grid;
    positions = Array.from({ length: Math.ceil(top / grid) + 1 }, (_, i) => (i + 1) * grid);
    halves = used((v) => v % (grid / 2) === 0 && v % grid !== 0 && v < HALVES * grid);
  }
  positions = [...new Set(positions)].filter((v) => v > 0).sort((a, b) => a - b);
  const inUse = new Set(used(() => true)), nearest = (v, set) => set.reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a), set[0]);
  const near = (v, from) => {
    const known = [...positions.filter((p) => inUse.has(p)), ...(halves.includes(from) ? [from] : [])], k = known.length ? nearest(v, known) : null;
    return k != null && Math.abs(k - v) <= v * NEAR_SHARE ? k : nearest(v, positions);
  };
  const atLeast = (v) => positions.find((p) => p >= v - 0.5) ?? Math.ceil(v);
  return { kind, score, unit, ratio, positions, halves, near, atLeast, detected: d };
}

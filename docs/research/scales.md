# Scales: ratio-based vs linear spacing and type, and how Plumber should detect which one an app uses

Research note, 2026-11-03. Input to the spacing pass, `hierarchy/S5` and the density table (`direction.md` 2.1).
Everything in section 3 was run (Node, the code in 3.4); the numbers are real output, not estimates. Sources are
marked **[fetched]** (page read this session), **[search]** (search summary only) or **[recalled]** (from memory, not
checked this session). Treat [recalled] items as unverified.

Plain-word glossary used below:
- **Linear scale (arithmetic):** every step adds the same amount (4, 8, 12, 16 ...). The "unit" is that amount.
- **Geometric scale (ratio / modular scale):** every step multiplies by the same number, the **ratio** (16, 24, 36, 54 for 1.5).
- **Step:** one move along the scale. **Base:** the value the steps are counted from (usually body text, 16px).
- **Snapping:** rounding a designed value to a grid (a 6.5px result becomes 8px). It adds noise to a measured scale.

---

## 1. The named ratios

A modular scale is `base x ratio^n`. Tim Brown's article that popularised the idea says ratios can come from geometry,
music, nature and history, and he builds his own example on the golden ratio; he also describes "double-stranded"
scales (two bases, interleaved) that fill each other's gaps. He does not list the musical intervals himself
(<https://alistapart.com/article/more-meaningful-typography>, [fetched]). The interval names are the standard
Western music ones (the ratio of two string lengths / frequencies); modularscale.com offers them as presets
(<https://www.modularscale.com>, [recalled], not fetched).

| ratio | name | value | 7 steps from 16px (rounded) | typical use |
| --- | --- | --- | --- | --- |
| 1.067 | minor second | 16:15 | 16 17 18 19 20 22 23 | Far too fine for a UI type ladder; fine for micro-adjustments (letter-spacing, optical size). Steps under 1px at small sizes |
| 1.125 | major second | 9:8 | 16 18 20 23 26 29 32 | Dense apps and dashboards: many sizes close together, quiet hierarchy. Tailwind's `text-sm..2xl` run is roughly this |
| 1.2 | minor third | 6:5 | 16 19 23 28 33 40 48 | The common "UI default": Utopia's default example uses it at small screens [search]. Clear but calm |
| 1.25 | major third | 5:4 | 16 20 25 31 39 49 61 | Marketing pages and docs; the most-used general ratio. Also the ratio of 4:5 and of two adjacent 4px steps at 16px (16 to 20) |
| 1.333 | perfect fourth | 4:3 | 16 21 28 38 50 67 90 | Bolder hierarchy; the usual "large screen" end of fluid scales |
| 1.414 | augmented fourth (square root of 2) | sqrt 2 | 16 23 32 45 64 90 128 | Two steps double the size: handy for spacing (8, 11, 16, 23, 32) and paper sizes. Very strong contrast in type |
| 1.5 | perfect fifth | 3:2 | 16 24 36 54 81 122 182 | Spacing and display type, not body text. Every Layout uses 1.5 in its modular-scale demo [fetched: <https://every-layout.dev/rudiments/modular-scale/>] |
| 1.618 | golden ratio (phi) | (1+sqrt 5)/2 | 16 26 42 68 110 178 288 | Poster-like hierarchy; LiftKit scales everything (space, corner radius, type) by phi [search: <https://chainlift.io/liftkitdocs/scaling>]. Steps grow so fast you need many half steps |
| 1.667 | major sixth | 5:3 | 16 27 44 74 123 206 343 | Rare. Display-only |
| 2 | octave | 2:1 | 16 32 64 128 | Not a scale; used as the "every second step" skeleton (4 8 16 32 64) |

Half and quarter steps: `sqrt(r)` and `r^(1/4)` give 2 or 4 steps per ratio. Examples: sqrt(2) = 1.414 is the half
step of the octave; sqrt(1.618) = 1.272 is the half step of the golden ratio (4, 5.1, 6.5, 8.3, 10.6, 13.5 ...), and
it lands near the major third (1.25), so "golden with half steps" and "major third" are almost the same scale for
the first 5 steps. In a finer scale each step is smaller, so more of the list is usable at small sizes; this is the
usual fix for "the golden ratio gives only 3 sizes between 10 and 40px".

Two facts that matter for detection:
1. Ratios in a family overlap. `1.25^2 = 1.5625 ~ 1.5`, `1.2^2 = 1.44 ~ 1.414`, `1.125^3 = 1.42`. A scale with ratio
   1.2 that skips every other step looks like 1.44. Detection can only say "ratio about r, nearest named ratio N"
   with a plausible range, not a single truth.
2. At whole pixels, fine ratios cannot be told apart at small sizes. Two neighbouring steps of 1.125 at 11px differ by
   1.4px, close to the rounding noise. (The detector below refuses to count such steps.)

---

## 2. Linear, geometric, hybrid: who uses what and why

### 2.1 What the real systems do

| system | spacing | type | kind | source |
| --- | --- | --- | --- | --- |
| Tailwind v4 | one variable, `--spacing: 0.25rem` (4px); every number class is a multiple (`px-4` is 4 x 0.25rem = 1rem) | 13 hand-picked sizes: 12 14 16 18 20 24 30 36 48 60 72 96 128px (ratios per step 1.11 to 1.33, no constant ratio) | linear spacing, hand-picked type | <https://tailwindcss.com/docs/theme> [fetched] |
| Material 3 / 2 | 4dp baseline, 8dp layout grid | irregular named roles (display, headline, title, body, label) | linear | [recalled]; the m2/m3 pages did not load text in this session |
| IBM Carbon | 2 4 8 12 16 24 32 40 48 64 80 96 160 (13 tokens) "multiples of 2, 4, 8" with small steps for detail and large steps for density | productive type set is hand-picked plus a fluid set | hybrid in practice: 2px steps at the bottom, 4px up to 16, 8px up to 48, then jumps | <https://carbondesignsystem.com/elements/spacing/overview/> [fetched] |
| Radix Themes | 4 8 12 16 24 32 40 48 64 (nine steps); a single `scaling` factor, 90 to 110%, multiplies space, font size and line height together | hand-picked 12 to 60 | linear up to 16 (4px), then 8px steps, then a jump; ratio between steps falls from 2.0 to 1.2 then rises to 1.33 | <https://www.radix-ui.com/themes/docs/theme/spacing> [fetched] |
| Utopia (Clearleft) | space tokens are multiples of the step-0 body size (0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6 x), each step is its own ratio rather than one constant | modular scale with a ratio at the smallest viewport and another at the largest (default example 1.2 small, bigger large); sizes interpolate smoothly between the two | geometric for type, hand-ratio for space; fluid | <https://utopia.fyi/blog/designing-a-utopian-layout-grid/> [fetched], <https://smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/> [search] |
| Every Layout | `--s0` = 1rem, each step is the previous times a ratio (demo: 1.5) used for both space and type | same scale | geometric | <https://every-layout.dev/rudiments/modular-scale/> [fetched] |
| Chainlift LiftKit | everything derived from phi (1.618) and one `--scaleFactor`: a larger factor gives looser spacing, rounder corners and more type contrast | same | geometric (golden) | <https://chainlift.io/liftkitdocs/scaling> [search; the page itself was not readable; the repo page did not state the numbers, so the "LiftKit-style" scale below is phi^n times 1rem, not LiftKit's published tokens] |
| Tim Brown / modularscale.com | calculator for any ratio and one or two bases | same | geometric | <https://alistapart.com/article/more-meaningful-typography> [fetched] |

### 2.2 Why each choice

- **Linear grids** (4 or 8px): easy to align (everything lands on the same pixel grid, boxes of different content line
  up), easy to code (`n x unit`), and every designer can do the sums. Cost: they have no built-in hierarchy. Going from
  4 to 8 doubles the gap; from 24 to 28 changes it by 17%. Adjacent steps get relatively closer as values grow
  (ratio 2, 1.5, 1.33, 1.25, 1.2 ... for 4, 8, 12, 16, 20, 24), so at the large end "one step up" is not visible.
- **Geometric scales:** the contrast between levels is constant at every size (Weber's law in plain words: people notice
  proportional, not absolute, differences). At the large end steps are far apart, which is what you want for
  headings and sections. Cost: at the small end the steps are too fine (1.2 from 10px gives 10, 12, 14.4, 17.3: a
  14.4px result is not a pixel grid value), and values are not whole pixels, so alignment and snapping need work.
  Golden ratio steps are so big that half steps are needed in the 8 to 40px range.
- **Hybrids** (nearly every large system in practice): linear where the pixels matter (0 to ~16/24px: borders,
  icon gaps, control padding) and geometric or hand-picked jumps where hierarchy matters (section gaps, display
  type). Carbon and Radix are exactly this shape: a 4px ladder with a widening tail. Fluid systems (Utopia) put
  the geometric rule in the type and use hand-picked multipliers in space.

Consequence for a detector: a linear 4px grid and a coarse geometric scale give almost identical lists at the large end
(Radix's 16, 24, 32, 48, 64 is 1.5, 1.33, 1.5, 1.33), so the method must test the **small end** and the **density**
of the list, not only the ratio between neighbours.

---

## 3. Detecting the scale of an existing design

### 3.1 What goes in and what comes out

Input: distinct values with use counts, `[{v: px, n: uses}]` (type sizes have no counts: use `n = 1`). Option:
`snap` = the rounding noise in px (1 for whole-pixel CSS; the app's grid if it snaps to one).

Output: `kind` = `linear | geometric | hybrid | ambiguous | weak linear/geometric | none`, with
- linear: `unit` (the finest step), `shares` (how much of the use sits on multiples of 2, 4, 8 px), `score`.
- geometric: `ratio`, `range` (all ratios that fit nearly as well), `anchor` (the scale value at the most-used
  size), `nearest` (named ratio), `score`.
- hybrid: `breakAt`, `unit`, `ratio`.
- `ladder`: a second reading for short, gap-free lists (type): the one ratio that best explains consecutive sizes.

### 3.2 How it works (plain words)

1. **Clean.** Drop values used fewer than 2 times or under 0.5% of all uses, but only when at least 6 values remain.
   Weight each value by `ln(1 + uses)`: heavily used values count more, but one value used 900 times cannot
   decide alone.
2. **A model is a list of positions** (`u, 2u, 3u ...` for linear; `anchor x r^i` for geometric, with `anchor` free).
   A value **fits** a position if it is within `snap/2 + 2%` of it. Credit is partial: exact = 1, at the edge = 0
   (this is what separates "a 4px grid" from "a ratio that happens to be close to 4, 8, 12 ...").
   Only one value per position counts; a second value on the same position is a miss (this is the "too fine"
   penalty).
3. **Resolvability.** A geometric step is only counted where neighbouring positions are further apart than the
   noise (`s(r-1) >= snap + 4% of s`). At 11px a 1.125 scale has 1.4px steps: below the noise, so skipped.
   With fewer than 5 countable values the model scores 0.
4. **Chance correction.** For every candidate, find the credit that values spread evenly on a log axis would get
   from the same positions (`base`), and score `(coverage - base) / (1 - base)`. A fine ratio gets a high `base`, so
   it cannot win by being fine.
5. **Search penalty.** Searching hundreds of ratios and anchors will fit noise. So the same search is run on 8 sets
   of random values with the same count, span and weights; the average best score of those is subtracted
   (`nullScores`). The result is the `score` reported.
6. **Prefer the simpler/coarser answer.** Among linear units within 0.05 of the best, take the largest unit; among
   ratios within 0.03 of the best, the largest ratio. (A 4px grid also fits 2px; report 4 if it is nearly as good,
   but note the 2px half steps through `shares`.) A linear unit also needs its multiples to be actually
   *used* up to the median value (60% occupancy), otherwise "all even numbers" would pass as a 2px grid.
7. **Hybrid.** Try every break point; fit the part below as linear and the part above as geometric; report the best
   split only if both sides fit at 0.7 or more and neither pure model reaches 0.7.
8. **Ladder reading** (type): `ln(size)` against rank, a straight-line fit. Reports ratio, rmse in % and the spread
   of consecutive ratios. Valid only when no step is missing (a type ladder).

### 3.3 Thresholds

| quantity | value | meaning |
| --- | --- | --- |
| tolerance | `snap/2 + 2% of value` | rounding noise plus a little slop |
| strong fit | score >= 0.7 | accept as a scale |
| weak | 0.5 to 0.7 | report "weak", do not drive rules from it |
| none | both < 0.5 and no hybrid | no scale: the app is hand-picked |
| ambiguous | both strong and within 0.1 | e.g. 4,8,12,16,24,32 can be read either way; prefer linear (simpler, and its unit is a real grid) |
| type ladder | rmse <= 3% and consecutive-ratio spread <= 0.12 | accept as a geometric ladder with that ratio |
| outlier | < 2 uses or < 0.5% of uses | ignored for fitting, kept for reporting |

Confidence statement for the UI: score >= 0.9 "clear", 0.7 to 0.9 "good", 0.5 to 0.7 "weak", below "none".

### 3.4 The code (about 80 lines)

Reference implementation, run to produce the numbers in 3.5. Tested with Node 20+. It is kept here; it is not in the
repo's source. (Scratch copy: the Plumber session scratchpad `detect.mjs`.)

```js
// detectScale(items, opts): items [{v: px, n: uses}] -> { kind, linear, geometric, hybrid, ... }
export const NAMED = { 'minor second': 1.067, 'major second': 1.125, 'minor third': 1.2, 'major third': 1.25, 'perfect fourth': 1.333, 'augmented fourth': 1.414, 'perfect fifth': 1.5, golden: 1.618, 'major sixth': 1.667, octave: 2 };
const UNITS = [2, 3, 4, 5, 6, 8, 10, 12, 16];
const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export function detectScale(items, { snap = 1, relTol = 0.02, trials = 8 } = {}) {
  const total = items.reduce((a, b) => a + (b.n ?? 1), 0), counted = items.some(i => (i.n ?? 1) !== 1);
  let pts = items.filter(i => i.v > 0).map(i => ({ v: i.v, n: i.n ?? 1 })).sort((a, b) => a.v - b.v);
  let dropped = [];
  if (counted && pts.length > 8) { // outliers: under 0.5% of uses (and used < 2 times), only if enough remain
    const keep = pts.filter(p => p.n >= 2 && p.n >= 0.005 * total);
    if (keep.length >= 6) { dropped = pts.filter(p => !keep.includes(p)).map(p => p.v); pts = keep; }
  }
  const tol = s => snap / 2 + relTol * s;
  const wt = p => (counted ? Math.log(1 + p.n) : 1);
  const linN = u => v => { const i = Math.max(1, Math.round(v / u)); return [i, i * u, true]; };
  const geoN = (r, ph) => { const lr = Math.log(r); return v => { const i = Math.round(Math.log(v) / lr - ph); const s = Math.exp((i + ph) * lr); return [i, s, s * (r - 1) >= snap + 2 * relTol * s]; }; };
  // coverage of a point set by a model: share of weight that sits on a step (one value per step), minus what chance gives
  function fit(nearest, set) {
    const best = new Map(); let W = 0;
    let used = 0;
    for (const p of set) { const [i, s, ok] = nearest(p.v), d = Math.abs(p.v - s);
      if (!ok) continue;                       // steps closer together than the snapping noise cannot be told apart
      W += wt(p); used++;
      if (d <= tol(s) && (!best.has(i) || d < best.get(i).d)) best.set(i, { d, p, s }); }
    let hit = 0; for (const { d, p, s } of best.values()) hit += wt(p) * (1 - d / tol(s)); // closer to a step counts more
    const lo = set[0].v, hi = set.at(-1).v; let c = 0, n = 0;
    for (let k = 0; k < 60; k++) { const x = lo * (hi / lo) ** ((k + .5) / 60), [, s, ok] = nearest(x); if (ok) { n++; const d = Math.abs(x - s); if (d <= tol(s)) c += 1 - d / tol(s); } }
    const cov = W ? hit / W : 0, base = n ? c / n : 1;
    return { cov, base, raw: used < 5 || base > .75 ? 0 : Math.max(0, (cov - base) / (1 - base)) };
  }
  const occupancy = (set, u) => { const med = set[set.length >> 1].v, m = Math.max(1, Math.round(med / u)); // how many of the multiples of u up to the median value are really used
    const used = new Set(set.filter(p => p.v <= med + 1e-9).map(p => Math.round(p.v / u))); return Math.min(1, used.size / m); };
  const bestLinear = set => { const all = UNITS.map(u => { const f = fit(linN(u), set); return { u, ...f, raw: occupancy(set, u) < .6 ? 0 : f.raw }; }); const m = Math.max(...all.map(a => a.raw));
    return all.filter(a => a.raw >= m - .05).sort((a, b) => b.u - a.u)[0]; };           // coarsest unit that is nearly as good
  const bestGeo = (set, dr = .005, dph = .02) => { let all = [];
    for (let r = 1.1; r <= 2.101; r += dr) for (let ph = 0; ph < 1; ph += dph) all.push({ r, ph, ...fit(geoN(r, ph), set) });
    const m = Math.max(...all.map(a => a.raw));
    const near = all.filter(a => a.raw >= m - .03).sort((a, b) => b.r - a.r)[0];       // coarsest ratio that is nearly as good
    const ok = all.filter(a => a.raw >= m - .1).map(a => a.r); return { ...near, range: [Math.min(...ok), Math.max(...ok)] }; };
  const bestHybrid = set => { let top = null;
    for (let k = 3; k <= set.length - 3; k++) { const lo = set.slice(0, k), hi = set.slice(k);
      const L = bestLinear(lo), G = bestGeo(hi, .01, .05), sc = Math.min(L.raw, G.raw);
      if (!top || sc > top.raw) top = { raw: sc, breakAt: lo.at(-1).v, u: L.u, r: G.r, lowRaw: L.raw, hiRaw: G.raw }; }
    return top; };
  // search penalty: run the same searches on random values of the same count, span and weights; subtract what they reach
  const R = rng(7), nul = { L: 0, G: 0 }, lo = pts[0].v, hi = pts.at(-1).v;
  for (let t = 0; t < trials; t++) {
    const fake = pts.map(p => ({ v: Math.max(1, Math.round(lo * (hi / lo) ** R() / snap) * snap), n: p.n })).sort((a, b) => a.v - b.v);
    nul.L += bestLinear(fake).raw / trials; nul.G += bestGeo(fake, .01, .05).raw / trials;
  }
  const adj = (x, n) => Math.max(0, (x - n) / (1 - n));
  const L = bestLinear(pts), G = bestGeo(pts), H = pts.length >= 7 ? bestHybrid(pts) : null;
  const sL = adj(L.raw, nul.L), sG = adj(G.raw, nul.G);
  let kind;
  const strong = x => x >= .7;
  if (strong(sL) && strong(sG)) kind = Math.abs(sL - sG) < .1 ? 'ambiguous' : sL > sG ? 'linear' : 'geometric';
  else if (strong(sL)) kind = 'linear';
  else if (strong(sG)) kind = 'geometric';
  else if (H && H.lowRaw >= .7 && H.hiRaw >= .7) kind = 'hybrid';
  else kind = Math.max(sL, sG) < .5 ? 'none' : 'weak ' + (sL >= sG ? 'linear' : 'geometric');
  const anchorOf = g => { const top = pts.reduce((a, b) => b.n > a.n ? b : a), [, s] = geoN(g.r, g.ph)(top.v); return +s.toFixed(1); };
  const f = x => +x.toFixed(2), named = r => Object.entries({ ...NAMED, 'sqrt(golden)': 1.272, 'sqrt(octave)': 1.414 }).sort((a, b) => Math.abs(Math.log(a[1] / r)) - Math.abs(Math.log(b[1] / r)))[0].join(' ');
  return { kind, distinct: pts.length, dropped,
    linear: { unit: L.u, onGrid: f(L.cov), score: f(sL) },
    geometric: { ratio: +G.r.toFixed(3), range: G.range.map(x => +x.toFixed(2)), anchor: anchorOf(G), nearest: named(G.r), covers: f(G.cov), score: f(sG) },
    shares: Object.fromEntries([2, 4, 8].map(u => [u, f(pts.reduce((a, p) => a + (Math.abs(p.v / u - Math.round(p.v / u)) * u < .05 ? wt(p) : 0), 0) / pts.reduce((a, p) => a + wt(p), 0))])),
    ladder: rankFit(pts.map(p => p.v)),
    hybrid: H && { breakAt: H.breakAt, unit: H.u, ratio: +H.r.toFixed(2), lowFit: f(H.lowRaw), highFit: f(H.hiRaw) }, nullScores: { L: f(nul.L), G: f(nul.G) } };
}

// For a short ladder of sizes (type): fit ln(size) = a + b*rank, no missing steps assumed.
export function rankFit(vs) {
  const n = vs.length, x = vs.map((_, i) => i), y = vs.map(Math.log), mx = (n - 1) / 2, my = y.reduce((a, b) => a + b) / n;
  const b = x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0) / x.reduce((a, xi) => a + (xi - mx) ** 2, 0);
  const rmse = Math.sqrt(y.reduce((a, yi, i) => a + (yi - (my + b * (x[i] - mx))) ** 2, 0) / n);
  const steps = vs.slice(1).map((v, i) => +(v / vs[i]).toFixed(3));
  return { ratio: +Math.exp(b).toFixed(3), rmsePct: +(rmse * 100).toFixed(1), steps, spread: +(Math.max(...steps) - Math.min(...steps)).toFixed(2) };
}
```

### 3.5 Results (real output)

crafting-ui, spacing. Values are the probe data from the brief (`gaps`: 1,863 uses; `padding sides`: 4,411 uses).

| input | verdict | linear | geometric (best) | detail |
| --- | --- | --- | --- | --- |
| gaps | **linear**, score **1.00** | unit 2 (the 4px core carries 83% of raw uses, 79% of weighted; 6, 10, 14 are the 2px half steps; 99.7% of uses are even) | score 0.34 (ratio 1.10 to 1.26, nothing stable) | six rare values dropped as outliers: 1, 2, 14, 48, 64, 80. A hybrid split was not needed |
| padding sides | **linear**, score **0.81** | unit 2 (96.5% of raw uses even; only 69% are multiples of 4; odd values 3 and 5 are 3.5% of uses) | score 0.34 | the weaker score is real: 5px (115 uses), 3px (38), 18, 22, 28 are off the 4px grid |
| gaps + padding together | **linear**, score **0.82** | unit 2, 4px core 64% | score 0.29 | |
| type ladder 11,12,14,16,17,19,22 | **geometric ladder**, ratio **1.121** (a major second, 1.125), rmse **2.1%**, spread of consecutive ratios 0.10 | none | general fit says "none" (score 0.30): 7 whole-pixel sizes between 11 and 22 are too few and too close to prove a ratio; the ladder reading is the right one here | consecutive ratios: 1.091 1.167 1.143 1.063 1.118 1.158 (all within 0.06 of 1.12) |
| ladder + display 32, 40, 48 | **none** as one scale (ladder rmse 10%) | none | none | 22 to 32 is 1.45, 32 to 40 1.25, 40 to 48 1.2. Reads as two speeds: a quiet ~1.12 UI ladder and a coarser display set. 32 sits on the 1.12 ladder (22 x 1.121^3 = 31.6); 40 and 48 do not |

What this says about crafting-ui, plainly:
- **Spacing is a linear 4px grid with 2px half steps.** Not a ratio scale. Forcing a ratio on it would move most of its
  values (4, 8, 12, 16, 20, 24 are all exact on the 4px grid) for no gain. 6, 10 and 14 are intentional half steps (6 is
  219 gap uses, 10 is 391 padding uses); only the odd values (3, 5) and the 18, 22, 28 padding values look like drift.
- **Type is a quiet geometric ladder about x1.12**, then a separate display range. In the density/contrast table this is
  the "Quiet" row (1.125).

Other systems, same method, whole-pixel noise (`snap = 1`):

| input | verdict | linear | geometric | note |
| --- | --- | --- | --- | --- |
| Tailwind spacing (1 2 4 6 8 10 12 14 16 20 24 28 32 36 40 44 48 56 64 72 80 96) | **linear**, **0.91** | unit 2, 95% on the 2px grid, 77% on 4px | 0.23 | correct: it is `n x 4px` plus half steps at the bottom. The 8px steps after 48 do not break it |
| Radix space (4 8 12 16 24 32 40 48 64) | **linear**, **1.00** | unit 4, 100% on 4 and 2px, 78% on 8 | 0.45 (ratio 1.1 to 1.15) | the tail looks geometric by eye (ratios 1.5, 1.33, 1.25, 1.2, 1.33) but a 4px grid explains it fully. Consecutive-ratio listing (`ladder.steps`) shows the "widening tail" |
| Carbon spacing (2 4 8 12 16 24 32 40 48 64 80 96 160) | **linear**, **0.87** | unit 4, 92% of values on 4px, 77% on 8px | 0.42 | the method calls it linear: all values are multiples of 4 (2 is the exception). It does not call it a hybrid because the geometric tail is not strong enough to separate from a sparse grid. The honest description is "4px grid, 8px above 24, sparse above 48" |
| Tailwind text sizes (12 14 16 18 20 24 30 36 48 60 72 96 128) | **weak linear** (0.60, unit 6) | not meaningful | 0.30 | hand-picked: consecutive ratios 1.11 to 1.33, rmse 10%. The detector should (and does) not claim a scale. Correct answer: "no clear scale" |
| golden, `16 x phi^n` for n -4..4 (2.3 3.8 6.1 9.9 16 25.9 41.9 67.8 109.7) | **geometric**, **0.90**, ratio **1.62** (golden) | none | ladder reading: 1.619, rmse 0.5% | the LiftKit-style case |
| golden rounded to the 4px grid (4 4 8 8 16 24 40 68 108), `snap = 4` | **none** (geometric 0.16, nearest golden 1.605) | none | ladder 1.54, rmse 17% | this is the known weakness: once the values are snapped to 4px and several collapse onto one number, 9 values can no longer prove the ratio. The hint (nearest 1.605, golden) is correct but the evidence is too thin to claim |
| major second 1.125 from 16 | **geometric**, **0.95** | none | ladder 1.125, rmse 0.2% | |
| perfect fifth 1.5 from 16 (4.7 7.1 10.7 16 24 36 54 81) | **geometric**, **0.94**, ratio 1.5 | none | ladder 1.501 | |
| synthetic hybrid: 4 to 24 by 4, then x1.5 (36 54 81 122 182) | **hybrid**, break at 20, unit 4, ratio **1.5**, fits 1.00 / 0.84 | 0.53 | 0.63 | |

Known limits (say these in the UI, do not hide them):
- Fewer than about 8 values: the general fit is weak by construction. Use the ladder reading (type) or report "too few to say".
- Heavy snapping to a coarse grid destroys ratio evidence (golden at 4px above). With `snap = 4` it needs ~12+ values.
- Hybrids are only reported when clean. Carbon- and Radix-shaped systems are reported as linear with a "sparse tail" note
  derived from `ladder.steps`: if the ratio between consecutive values falls to 1.2 and then rises again, say so.
- The search penalty uses 8 random trials with a fixed seed so the result is stable; scores are accurate to about +-0.05.
- Cost: with default settings about 0.3s per input in Node (200 ratios x 50 anchors x a few hundred points). Run once per
  page analysis, not per element.

---

## 4. Recommendations for Plumber

### 4.1 How the spacing pass should use a detected scale

1. **Keep the app's own scale.** If the detector says `linear` (score >= 0.7) or `geometric` (>= 0.7), the spacing pass's
   vocabulary is that scale's positions. A pass never proposes a number off the app's scale. For crafting-ui that is
   multiples of 2 with a 4px core: 2 4 6 8 10 12 14 16 20 24 28 32 40 48 64.
2. **Refine within it.** Values that are off the scale (crafting-ui: 3, 5, 18, 22, 28 padding; 1, 14 gaps) move to the nearest scale
   position by log distance (5 to 4 or 6, 18 to 16 or 20, 22 to 20 or 24), only when the value has few uses relative to
   its neighbour and the move is at most one half step. The 2px half steps (6, 10, 14) are not drift: they have heavy use and
   the unit-2 fit explains them. Offer them as "keep".
3. **Hierarchy rides on the scale.** S1 and S5 pick the *levels* (inside, between, around, section) from the scale's
   positions, not from a formula (see 4.2).
4. **When to suggest another ratio** (never automatic; it changes everything):
   - Verdict is `none` or `weak`, and more than ~25% of uses are off the best-fitting grid; then offer the nearest
     named ratio from the detection ("your values drift toward x1.25") as a scope-"new" choice, not a fix.
   - Linear, but levels cannot be separated: adjacent used values at the large end are closer than 1.25
     (e.g. a project that uses 16, 20 and 24 for three different levels). Suggest dropping a level or adding
     the next 8px step; do not change the unit.
   - Geometric scale with a ratio under about 1.15 in spacing: levels collapse. Suggest the square (every second step).
   - Hybrid: keep both parts; the break is where the rules change (below it, snap to unit; above it, snap to ratio).
5. **Type** works the other way round: detect a ladder first (`rankFit`); if it is a clean ladder (rmse <= 3%, spread
   <= 0.12) keep it and report the ratio and its named neighbour; if not, it is hand-picked: keep every size, and only
   flag pairs closer than 1.1 (visually the same).
6. Say the score. "Your spacing is a 4px grid (2px half steps), fit 0.81" is more useful and more honest than a
   verdict word alone, and below 0.5 the UI should say "no clear scale" and the pass should work from the sizes the
   app already uses most.

### 4.2 S5 ("levels are a ratio apart"): make the ratio come from the scale

Today: `between / inside >= 1.5`, constant. The question was whether RATIO should be the detected ratio or its square.

Finding: **the threshold should not be the scale's ratio, but the step the fix picks should come from the scale.** Why:
people judge "different level" by proportion (a fixed, taste-based minimum, about 1.4 to 1.5), whatever scale the app
uses. A fine scale (1.125) with the rule "one step apart" would give levels nobody can tell apart; a coarse one (1.618)
already satisfies 1.5 in one step. So:

```
floor      = 1.25     // below this two gaps are the same to the eye: always flag
target     = 1.4      // "clearly different"; was 1.5 (a rounded golden ratio); the choice between them is taste
levelStep  = linear   -> the nearest used value >= target x inside  (today's fix, unchanged)
             geometric r -> r^k with k = smallest whole number such that r^k >= target
                            (1.125 -> cube 1.42, 1.2 -> square 1.44, 1.25 -> square 1.56, 1.333 -> square 1.78,
                             1.414 / 1.5 / 1.618 -> single step)
             none     -> the nearest used value >= 1.5 x inside   (no scale to borrow from)
```

- So for a geometric app, "RATIO" is the scale's own ratio when r >= 1.4, otherwise its square or cube. It is **not** a
  constant, and it is not r itself for fine scales.
- Report between 1.25 and the target as an informational "close levels", not a failure; report below 1.25 as the flag.
  This also removes the current mismatch: the density table has `between -> around` at 1.2 to 1.5 and S1 allows
  `between <= around`, so S5 should keep applying to inside vs between only (as proposed in video-rules.md).
- The 4px-linear case is unchanged in outcome: 4 to 8 passes (2.0), 8 to 12 passes (1.5), 12 to 16 (1.33) is info,
  16 to 20 (1.25) sits on the floor. Going from target 1.5 to 1.4 changes nothing on a 4px grid (no pair lies between 1.4
  and 1.5 below 28); it matters only for geometric apps.
- Confidence of S5 follows the detection: geometric with score >= 0.7 means "the author already uses ratios": high.
  Linear: medium (the ratio is a design opinion, as video-rules.md says). None: low; show as a suggestion only.

### 4.3 The density table (`direction.md` 2.1)

What the table implies, measured: inside to between is 2 to 3 times; between to around is only 1.2 to 1.5 times; around to
section is 1.5 to 2 times. Across the dial, "between" goes 24, 20, 16, 12, 8: constant 4px steps, which is a ratio of
1.2 at the airy end and 1.5 at the compact end. So the dial moves a lot at the compact end and little at the airy
end. Changes:

1. **Make density a multiplier, not a 4px offset.** One ratio per half step (about 1.2, the minor third; two half
   steps = 1.44 per full step), applied to the 0 row and snapped to the app's own scale. Airy -1 then reads
   16 x 1.44 = 23 (snap to 24) and Compact +1 reads 16 / 1.44 = 11 (snap to 12, or 10 if the app has it). The current
   table is more extreme at Compact (8). Keep the current rows as the "snapped to a 4px linear app" result, and write the
   rule above as the real definition, so a geometric or fine-grained app gets the same feel. This is also how Radix's
   `scaling` (90 to 110% on everything) works.
2. **Add a column "ratio to the level inside"** and make it the S5 test. The checker then needs no second table.
3. **Express the table in scale steps when a scale is detected.** "between = inside + 2 steps" is true for a 4px linear
   app (8 to 16) and a 1.414 app (8 to 16, two steps). Store steps; show px.
4. The contrast table (2.2) already uses named ratios (1.125 to 1.414). Use the detected type ratio as the app's current
   contrast: crafting-ui's measured 1.121 is the Quiet (-1) row. The type pass moves the two ends toward the row it is
   asked for, as the table says.
5. Do not change `--spacing`. The detector confirms crafting-ui's own unit is real (a 4px grid, fit 1.00 for gaps).

### 4.4 Top recommendations (short)

1. Ship the detector as a read-only analysis step: output `kind`, `unit/ratio`, `shares`, and a score with the 4 bands
   (clear, good, weak, none). For crafting-ui it should say: spacing linear, 4px core with 2px half steps (gaps 1.00,
   padding 0.81); type a quiet geometric ladder about x1.12 plus a separate display range.
2. Keep the app's scale and refine inside it. Never propose a ratio move automatically; only offer it when the verdict is
   none/weak with lots of drift, or when levels collapse.
3. Replace the constant RATIO in S5 with: floor 1.25 (flag), target about 1.4 to 1.5 (info below it), and the fix picks the
   smallest whole number of the detected scale's steps that reaches the target (the scale's ratio for r >= 1.4, its
   square for 1.2 to 1.4, its cube for ~1.125). Make the density table a multiplier (about 1.2 per half step) snapped
   to the app's scale.

---

## 5. What was not verified

- Material's 4dp/8dp rule, modularscale.com's preset list, and LiftKit's exact token values were not read this session.
- Utopia's space multipliers were read from calculator links on its layout-grid article, not from a spec page.
- Musical-interval ratios are the standard just-intonation values (augmented fourth shown as sqrt 2, the equal-tempered
  value; just intonation gives 1.406 or 1.4142 depending on tuning).
- The detector was validated on the 14 inputs above; it has not been run on a real page's live data, only on the probe numbers in the brief.
- The Tailwind, Radix and Carbon lists in 3.5 are the published token lists, not usage counts; so they are unweighted.

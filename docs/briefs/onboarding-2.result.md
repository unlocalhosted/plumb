# Onboarding layer 2: harvest, cluster, ladder, names (result)

Built against `docs/briefs/onboarding.md` section 2.3 and section 7.2 row 2. Main checkout, small commits, nothing pushed.

## What was built

- `src/onboarding/harvest.ts`: one pass over `report.declarations`, sorted by (file, line, column, prop, value) first. Per measure
  (spacing, radius, type size, line height, letter spacing, duration, easing, colour, elevation, z-index) it keeps the places, files,
  props, three examples, the spelling used most, and the Tailwind key a value came from. Skips what provenance skips (`0`, `auto`, `%`,
  `transparent`, `currentColor`), anything that names a project variable, and anything under a dark condition (counted, never invented).
  Opaque declarations are counted per family as "set in code". It returns a 12-character hash of the values and places.
- `src/onboarding/cluster.ts`: single linkage in the brief's tolerances (scalar, OKLab for colour, same layer count for shadows, exact for
  easing and z-index). The representative is the mode, ties to the smaller value, then the first path. "Near" pairs are listed, never merged.
- `src/onboarding/ladder.ts`: fits clusters to a ladder and names the steps. Candidates: `tailwind-numeric` (spacing, when Tailwind's
  `--spacing` is in force), `grid-4`, `grid-8` (spacing, radius), `tailwind-type` (type size), `framework` (the Tailwind keys in use, when they
  are at least half the places), and `as-found`. A step is kept when it absorbs `min(2% of places, 3)`; the rest are listed off the scale.
- `src/onboarding/names.ts`: t-shirt names centred on the mode (type: `base` is the body size), duration names around the mode, shadows by
  blur rank, `--color-<hue>-<rank>` from twelve OKLCH hue names, and drafted whys ("Used by padding and gap at 14 places in 5 files (drafted)").
- `src/onboarding/propose.ts` and `plumber propose [--family <name>] [--json]`. The proposal carries state, shape (`theme`, `shadcn`, `root`),
  target file, per-family scales with steps, what each absorbs, what is off the scale, merges, near pairs, the tokens `--write` will put in the
  theme, notes (conflicting variables and which one the cascade ends on, set-in-code counts, dark colours), and the hash.
  Families that already have your tokens are skipped with a sentence. A Tailwind 3 or empty project returns the state's sentence and next step.

## Tests

`e2e/onboarding-propose.test.mjs` (14 tests, through `dist/cli.js`), expectations in `e2e/fixtures/onboarding-propose.json`
(regenerate with `UPDATE_EXPECTATIONS=1`):

- `propose --json` equals the committed proposal for bare, framework, partial, chaos, clean and v3; run again with a warm cache and with no cache, equal.
- Same project copied elsewhere, files written in reverse order with scrambled times: equal.
- `propose` writes nothing into the project.
- bare: near values merge (`13px` into `12px`, `#676767` into `#666`), steps named `--spacing-xs..xl`, body size in the middle of the type scale.
- framework: the keys in use are adopted with their own names (`--text-sm`, `--radius-lg`, `--color-blue-600`, `--shadow-sm`), one `--spacing` base, `p-[13px]` listed under `--spacing-3`.
- chaos: merges and near pairs reported; the note names both `--radius` definitions and the one the cascade ends on.
- `--family`, usage errors, plain words (no "cluster", "provenance", "rung").

## Deviations and decisions

1. **Ladder choice.** The brief says the smallest weighted snap distance wins, but "as found" always has distance zero. Rule used: the best
   grid ladder wins if its mean snap distance is within 1px (spacing, radius) or 0.5px (type); otherwise `as-found`. With Tailwind's numeric
   spacing in force, `tailwind-numeric` is the ladder and does not fall back.
2. **Tailwind's numeric scale writes one token.** The steps (`--spacing-3`) are shown with `written: false`; the token is the project-authored
   `--spacing: 0.25rem`. Writing `--spacing-3` etc. would replace the numeric ruler (`numericSpacing.replaced`), which the brief wants left open.
3. **Single linkage chains.** `10, 11, 12, 13, 14px` is one cluster, so `14px` is merged into `12px`. That is the brief's rule; the table says so.
4. **Tokened families are skipped**, including the Tailwind keys still used inside them (`text-gray-500` beside shadcn colour). That absorb map belongs to the later morph.
5. **Cascade "later".** Imports come before the importing file's own rules, so in `onboard-chaos` the cascade ends on `--radius: 6px` in `index.css`
   (the file that imports `legacy.css`). The note says which value wins and where each is set.
6. **Skips beyond the brief:** durations under 20ms (resets), shadow layers that still hold a `var()` (Tailwind's ring layers), colours inside
   `box-shadow` (they belong to the shadow), line height and tracking that arrive with a Tailwind type key (they come with the size).
7. **Shuffled read order** is tested by copying the project in reverse order with scrambled mtimes to another path, not by renaming files
   (a rename changes the paths in the output). The harvest sorts its own input, so this is a check of the whole pipeline, not of the sort alone.
8. Unnamed values next to Tailwind keys are named by value (`--radius-7`, `--shadow-1`), so they never collide with `--radius-lg`.

## Read-only run on AlgoRecall

`PLUMBER_CACHE_DIR=/tmp/pc-algo node dist/cli.js propose --root ../algorecall` (43s cold). Nothing was written in `../algorecall`
(its `.plumber/cache` still has the same five files). Two runs gave byte-equal JSON.

- R3 preset. Spacing, colour, radius, type and z-index already have tokens, so they are skipped.
- Motion: 33 durations in use snap to 5 steps (`--duration-200` takes 150, 160, 80, 250, 100ms and more; 300, 400, 500, 700); 7 set in code.
- Shadows: 73 in use, 12 steps (Tailwind's `--shadow-sm/md/lg/2xl` adopted, the rest `--shadow-1..n`); 1,828 set in code.
- Two bugs found by this run and fixed: shadow layers holding Tailwind's `--tw-ring-*` variables, and sub-20ms reset durations.

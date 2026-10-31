# What plumber flags in crafting-ui, by kind of value, and the engine that should judge it

Analysis only (2026-10-31). No engine code changed. Every count below comes from one run of today's `plumber`
over the whole of crafting-ui and one classification script; the commands and raw totals are in the appendix.

## Why

The panel offered to add `--text-display: calc(var(--z) * 14px)` to the theme for `text-[length:calc(var(--z)*14px)]`
(blueprint.tsx / video-app.tsx / two demos). `--z` is the drawing's zoom; 14px is the real choice and it is already
`--text-sm` (0.875rem). The honest fix is `calc(var(--z) * var(--text-sm))`. The name "display" is a guess. Today's
server has one rule for anything written by hand: a step is close → offer it, nothing close → offer a new token
under the family's namespace, with no idea what kind of value it is or whether it repeats.

## The data

`plumber check --json` over crafting-ui (fresh cache): 3118 provenance places (sites of `provenance/*` findings,
exceptions excluded), of which 776 are runtime values (`opaque-inline`) and 292 Tailwind defaults (`framework`).
`POST /__plumb/places` is a per-file projection of the same report (checked on `src/motion/Timeline.tsx`: CLI
`arbitrary 13, spacing 1, opaque-inline 2` = places `arbitrary 13, spacing 1, opaque-inline 2`; the CLI's
`config/no-tokens 5` are project-level, not places).

**Today's new-token suggestions: 878 places, 315 distinct values; 223 of those values occur once, 92 in two or more
places.** Followed as offered, crafting-ui would gain about 315 tokens, 223 of them used once. By kind: em
letter-spacing 210, "other" (font-family stacks, multi-value shorthands) 132, font-weight numbers 99, colour literals
80, geometry units 74, `var × N` formulas 59, fluid 56, shadows 42, unitless line-height 38, far-from-scale literals
35, geometry formulas 16, colour inside a gradient 16, other calc 12, colour via variable 5, color-mix 2, alpha 1.

### The taxonomy (places · distinct values · files; what plumber says today; what it should say)

| # | Kind | Places | Distinct (repeat) | Files | Today | Should | Problem? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Runtime value (opaque inline, `top: g.left`) | 776 | 40 (33) | 71 | action text ("pass the number through a CSS variable…") | unchanged: a note, not a problem; never a token | note |
| 2 | Plain literal **near** a step (`ml-[3px]`, `text-[0.9375rem]`, `duration-[200ms]`) | 547 | 194 (62) | 106 | swap to the nearest step (`ml-0.5`, `text-md`) | swap, as today; **but** `text-[0.9375rem]` ×61 in 23 files, `1.0625rem` ×43, `13px` ×34, `10px` ×29, `10.5px` ×18 are not "near" one place: they are a scale the theme lacks (see §Q1) | yes |
| 3 | Colour literal (`bg-[#1C1C1E]`, `#E9E9E9` ×15) | 423 | 197 (64) | 93 | 342 swap to the nearest colour within ΔE .15, 80 new token | swap when close; a new token only when the colour repeats (2+ places); a one-off far colour: Keep as is | yes |
| 4 | Tailwind default (`font-medium` ×122, `leading-snug` ×63, `font-semibold` ×52) | 292 | 8 (7) | 62 | adopt `--font-weight-medium: 500` etc. | unchanged (one write, 122 places) | yes, cheap |
| 5 | em letter-spacing (`tracking-[0.1em]` ×70 in 26 files, `-0.01em` ×32, `0.06em` ×22) | 210 | 21 (14) | 57 | new token `--tracking-?` for every value, 210 times | the theme has no `--tracking-*` scale, only `--text-*--letter-spacing` pairs. Propose **one scale** from the data (0.1em ×70, 0.06em ×22, 0.04em ×9, -0.01em ×32, -0.012em ×19, -0.02em ×14, -0.025em ×15), named by position (`--tracking-tight`, `-snug`, `-wide`, `-wider`…), not 21 tokens | yes: a missing scale |
| 6 | font-family stacks (`'Source Sans 3 Variable', …` ×67, system stacks) and other strings | 125 of 152 | — | — | new token `--font-?` per stack | **these are not drift**: they are the demo pages' deliberate imitation of other products (Google Sans, SF Pro, Myriad). Judge only when the stack is not one of the theme's `--font-*` *and* the page is not a harness; otherwise a note. Never a new token per stack | mostly no |
| 7 | Copy of a token's value (`bg-[#ffffff]` → `bg-on-accent`, `150ms` ×26) | 114 | 28 (10) | 47 | swap to the token whose value it copies | unchanged | yes |
| 8 | Font-weight number in CSS (`font-weight: 500` ×24, 600 ×24, 400 ×23, 700 ×17) | 99 | 8 (6) | 33 | new token `--font-weight-?` per value | the theme defines no `--font-weight-*`; these are Tailwind's own steps (400/500/600/700). Same answer as #4: **adopt** `--font-weight-medium: 500` and swap `font-weight: 500` → `var(--font-weight-medium)`; `250`, `300`, `800`, `900` (11 places) are real decisions to keep or name | yes |
| 9 | Geometry unit (`bottom-[1.2cqw]`, `border-radius: 50%`, `font-size: 1.9cqw`) | 75 | 59 (11) | 15 | new token (74) | **layout, not drift**: `%`, `vw`, `cqw` scale with a container; `border-radius: 50%` is "a circle". No finding (a note at most). | no |
| 10 | Shadow (`shadow-[0_10px_30px_-18px_rgb(0_0_0/0.35)]`, `0 12px 30px -14px rgba(23,23,40,0.35)` ×10) | 66 | 40 (12) | 21 | 42 new token, 24 "the colour is part of this shadow" | a shadow that repeats (×10 in one file, ×6) earns a `--shadow-*` token named by its elevation step; a one-off: nearest `--shadow-1…4` by blur/offset, else Keep. Never a colour choice (fixed) | yes |
| 11 | Formula with a runtime variable (`calc(var(--z) * 13px)` ×11, `* 12px` ×8, `* 14px` ×3, `* 1.25rem` ×3) | 62 | 34 (9) | 13 | new token for the whole formula (59) | **never tokenize the formula**. Judge the literal factor: 14px = `--text-sm` → `calc(var(--z) * var(--text-sm))`; 13px/12px are off the type scale → the same answer as #2 for 13px (×34 plain + ×11 here) | yes, but the edit is inside the formula |
| 12 | Fluid (`clamp(1rem, 4vw, 2.5rem)` ×23 in 22 files, `clamp(2rem, 3.6vw, 3rem)` ×8) | 56 | 19 (5) | 27 | new token for the clamp (56) | the data argues **for** a token here: one `clamp(1rem, 4vw, 2.5rem)` gutter in 22 files is a decision the theme lacks (`--spacing-gutter`). The three font clamps (×8, ×7, ×2) likewise (`--text-hero`…). A one-off clamp: judge its min and max against the scale (1rem ✓, 2.5rem = `--spacing` × 10 ✓) and say so, no token | yes when repeated |
| 13 | Colour with alpha (`#ffffffcc`, `rgba(255,255,255,0.2)` ×3) | 44 | 37 (6) | 21 | swap to the nearest opaque colour (`text-[#ffffffcc]` → `text-on-accent`) | **wrong today**: dropping the alpha changes the design. Offer `text-on-accent/80` (Tailwind's opacity modifier) when the base colour is a token and alpha is a step; else Keep | yes, and today's edit is destructive |
| 14 | Unitless line-height (`leading-[1.25]` ×16 in 13 files, `1.05` ×10, `1.3`, `1.2`) | 38 | 13 (8) | 25 | new token `--leading-?` per value (38) | the theme pairs line-heights with sizes (`--text-sm--line-height: 1.5`). `1.25` ×16 is a missing step: one `--leading-tight: 1.25`. `1.02`, `1.05`, `1.06`, `1.12` (display headings) are one scale, not six tokens | yes |
| 15 | Plain literal **far** from the scale (`rounded-[14px]` ×5, `font-size: 300px` ×4, `120px` ×4, `mt-[0.8em]` ×2) | 36 | 24 (5) | 13 | new token (35) | `300px`/`120px` are poster sizes (two pages): Keep as is. `14px` radius ×5 against a 1–6px radius scale is a decision: one token (`--radius-2xl`), not "radius-?". `0.8em` margins are type-relative spacing: a note | mostly no |
| 16 | Animation shorthand (`animate-[redline-in_420ms_var(--ease-out)_both]` → `animate-(--dur-slow)`) | 31 | 14 (6) | 15 | 26 swap the **whole class** for a duration class | **destructive today**: `animate-(--dur-slow)` drops the keyframe name. Edit the duration inside: `animate-[redline-in_var(--dur-slow)_var(--ease-out)_both]` | yes, wrong edit |
| 17 | Transition shorthand (`transition: opacity 420ms var(--ease-out)` → `transition: var(--dur-slow)`) | 21 | 11 (7) | 7 | 20 swap the whole value | **destructive today**: replace the 420ms inside: `transition: opacity var(--dur-slow) var(--ease-out)` | yes, wrong edit |
| 18 | Colour inside a gradient/shorthand (`radial-gradient(… #2A2A2E, #121214)` ×2, `background: rgba(249,24,128,.1)`) | 30 | 28 (2) | 18 | 12 swap the whole value, 16 new token for the first colour | never replace the whole gradient; swap each colour stop that matches a token, inside the value; else a note | yes, wrong edit |
| 19 | Multi-value spacing shorthand (`padding: '32px 40px'` → `padding: "calc(var(--spacing) * 8)"`) | 6 | 6 | 3 | swap the whole value for one side's step | **destructive today**: `32px 40px` becomes one value. Edit each side: `calc(var(--spacing) * 8) calc(var(--spacing) * 10)`, or `p-8 px-10` | yes, wrong edit |
| 20 | Other calc (`-left-[3px]` → `-left-0.5` ✓, `calc(var(--z, 1) * 0.5rem)`) | 19 | 15 (3) | 5 | 7 swap, 12 new token | the sign-only calc is handled; `var(--z, 1) *` is #11 with a fallback | as #11 |
| 21 | Geometry formula (`bottom-[calc(100%+7px)]`, `top-[calc(30px+10%)]`) | 16 | 15 (1) | 8 | new token for the formula | layout: `100% + N` positions a popover; judge only the N (7px is off the 4px grid → `calc(100% + var(--spacing) * 2)`? no: 7px here is optical, Keep) → a note, never a token | no |
| 22 | Colour via another variable (`text-[var(--ink)]`) | 5 | 3 | 2 | new token `--color-?: var(--ink)` | a harness's own variable: not drift (`owned`-style note) | no |

Kinds the brief listed that the data does not show as separate: "tokens used raw" (`/tier`) — zero places, crafting-ui
has no caller policy configured; "unitless number" other than line-height/weight — none.

### Where the data argues with the principles

- (a) *never tokenize a whole formula; swap the number inside* — confirmed by #11, #16, #17, #18, #19: 140 places where
  today's edit replaces a composite value with a single token and would break the design. One exception: **fluid
  values (#12)**: `clamp(1rem, 4vw, 2.5rem)` in 22 files *is* one decision (the page gutter) and should be one token.
  The rule is "a formula is tokenized only when it repeats, and then whole".
- (b) *geometry and runtime maths is layout* — confirmed (#9, #21, #1: 867 places, none a token). But `var(--z) * N`
  (#11) is not pure layout: the N is a type-scale/spacing decision, so judge N and keep the multiplier.
- (c) *a new token must earn its place by repeating, named by its place in the scale* — confirmed at the top
  (tracking 0.1em ×70/26 files, clamp ×23/22, leading 1.25 ×16/13, shadow ×10) and at the bottom (223 of 315
  suggested values occur once). The data adds: **name by scale position, and propose the scale, not a token**: 21
  letter-spacings are one `--tracking-*` ladder; 13 line-heights one `--leading-*` ladder.
- (d) *a one-off with no close step: nearest step or Keep, never a token* — confirmed, with one nuance: "close" must be
  family-aware (a colour within ΔE .15; a length within half a step), and a nearest step that changes the design
  (alpha dropped, #13) is not an offer.
- Not in the principles, shown by the data: **the biggest counts are missing scales, not misuses**. `text-[0.9375rem]`
  ×61, `1.0625rem` ×43, `13px` ×34 and `10px` ×29 (type sizes between the theme's minor-third steps) are 167 places
  that `text-md`/`text-sm` swaps would *change*; they want a decision (Q1), not 167 edits.

## The engine

### Parse → classify → recommend

1. **Parse** the authored value (the declaration's `value`, or the arbitrary class's bracket text) into a small AST:
   `Number { n, unit }`, `Var { name, fallback? }`, `Call { name: calc|clamp|min|max|rgb|oklch|color-mix|…, args }`,
   `Op { +,-,*,/ }`, `Word` (keywords, idents), `List` (space- and comma-separated parts). One parser for CSS and for
   Tailwind's `_`-spaced arbitrary values (reuse `tokens()` in `src/rules/families.ts` for splitting, then a tiny
   expression parser for `calc`).
2. **Classify** by shape and property, in this order, to one `kind`:
   `runtime` (opaque) · `default` (framework var) · `copy` (equals a token) · `fluid` (clamp/min/max at the root) ·
   `formula` (calc with a Var factor and one literal) · `geometry` (% / vw / vh / cqw units, or `100% ± N`) ·
   `composite` (List of 2+ parts for shadow/transition/animation/padding/margin/inset/border/gradient) ·
   `colour` (with `alpha` when the colour has one) · `string` (font-family) · `unitless` (line-height, weight) ·
   `literal` (one Number with a length/time unit) · `em` (em/ex relative lengths) · `variable` (a bare Var).
3. **Recommend per kind**, each a pure function of (kind, the theme's scales, the value's repeat count):
   - `literal`, `unitless`, `em`: nearest step within the family's tolerance → `swap`; none → `repeat >= T` →
     `scale` proposal (the ladder the repeats form, named by position) else `keep`.
   - `formula`: judge the literal factor as a `literal`; the edit replaces the factor inside the formula
     (`calc(var(--z) * var(--text-sm))`); never a token for the formula.
   - `fluid`: `repeat >= T` → one token for the whole value (`--spacing-gutter`); else judge min and max as literals,
     report as a note.
   - `composite`: judge each part by its own property (shadow: offsets and blur as spacing, colour as colour; transition:
     duration as motion); edits replace the part inside the value (`opacity var(--dur-slow) var(--ease-out)`),
     and a whole-value token only when the composite repeats (`--shadow-card` for the ×10 shadow).
   - `colour`: nearest within ΔE → `swap`; with alpha → `swap` only as `token/alpha` (Tailwind modifier or
     `color-mix`); far and `repeat >= T` → token; far and once → `keep`.
   - `geometry`, `runtime`, `variable`, `string` (a known stack): `note`, never a token.
   - `default`: `adopt`, as today.
4. **Deterministic**: the parser and classifier are pure over the authored text; repeat counts come from the same
   report (`sites` grouped by family + property + normalized AST), so two runs on the same source give the same kinds,
   counts and edits; cached with the report.

### Where it lives

- `src/rules/provenance.ts`: today's `parts` loop judges each whitespace part of a value with one `closest()`; the
  parser replaces `parts`, the classifier sets `kind`, and the per-kind recommender replaces the `alternatives` /
  `newTokenFor` / `noFit` block. `adopt` stays. `partOfValue` (the shadow-colour guard) becomes the `composite` rule.
- `src/surfaces/edits.ts` `replacement()` and `src/messages.ts` `classEdit`/`sourceEdit`: an edit gains a span
  *inside* the value: `{ from: site.text, to, inner?: { from: '14px', to: 'var(--text-sm)' } }` so the arbitrary
  class `text-[length:calc(var(--z)*14px)]` becomes `text-[length:calc(var(--z)*var(--text-sm))]` and the stylesheet
  `transition: opacity 420ms …` becomes `transition: opacity var(--dur-slow) …`. `structuredEdits` writes the whole
  `from → to` as today; the inner span is for the panel's words and for highlighting.
- Finding shape (what the panel reads): `kind: 'literal' | 'formula' | 'fluid' | 'composite' | 'colour' | 'geometry'
  | 'runtime' | 'default' | 'copy' | 'string' | 'unitless' | 'em' | 'variable'`, `repeat: { places, files }`,
  `recommendation: 'swap' | 'adopt' | 'token' | 'scale' | 'note' | 'keep'`, `scale?: { namespace, steps: [{ name,
  value, places }] }` for a proposed ladder, and `edits[].inner`. `newToken` stays for `token`; `choices` for `swap`;
  `action` for `note`/`keep`.
- `src/onboarding/propose.ts` already builds scales from values (`plumber propose --family`); the `scale`
  recommendation reuses it so the panel's "add the scale" and the CLI's proposal agree.
- Panel words (yours): one line per recommendation kind; a `note` is not a problem and not a fix.

### What changes in the counts (if the owner takes the recommendations)

Of 3118 places: 776 runtime + 75 geometry units + 16 geometry formulas + 125 font-family + 5 variable → **997 become
notes** (not problems). 292 defaults → 7 adopts. 547 near-step literals keep their swaps, minus the ~167 that are a
missing type scale (Q1). 878 new-token offers → about **8–12 scale proposals** (tracking, leading, two font clamps,
one gutter, one card shadow, `--radius-2xl`, `--font-weight-*` via adopt) plus swaps inside formulas; about 220
one-offs become `keep`.

## Open questions for the owner

- **Q1. The type scale.** 0.9375rem (15px) ×61, 1.0625rem (17px) ×43, 13px ×34, 10px ×29, 10.5px ×18 sit between the
  theme's minor-third steps and say "nothing under 12px". Swap them to the nearest step (changes 185 places' sizes),
  add steps (`--text-xs+`?), or keep as exceptions? The engine should propose, not decide.
- **Q2. The repeat threshold T** for a new token: 2+ places, 2+ files, or both? The data: 92 values repeat in 2+
  places; requiring 2+ files drops same-file repeats like the ×10 shadow in one file (which still deserves a token).
  Suggested: 2+ places, and a file count shown in the words.
- **Q3. Harness and imitation pages** (`src/motion/harness`, demos imitating Google Sans / SF Pro / Myriad): judge them
  at all? Today they are 125 font-family and many colour findings. A `source` exclusion or an `imitation` mark.
- **Q4. Alpha colours** (#13): offer `token/NN` (Tailwind opacity modifier) or `color-mix(in oklch, var(--token) NN%,
  transparent)`? The first is shorter; the second works in CSS files.
- **Q5. Geometry as notes** (#9, #21): show them at all in Blueprint, or only in the CLI with `--verbose`?
- **Q6. Naming of proposed steps**: by position (`--tracking-wide`) needs a vocabulary per family; by value
  (`--tracking-10`) is honest but ugly. Position names from `propose.ts`'s ladders, with the value shown beside?

## E2E test plan (feature-level, real Vite + Chromium; no unit tests)

1. **Formula**: a fixture with `text-[length:calc(var(--z)*14px)]` and `--text-sm: 0.875rem` in the theme. The
   finding has `kind: 'formula'`, one choice `--text-sm`, and `edits[0]` from `text-[length:calc(var(--z)*14px)]` to
   `text-[length:calc(var(--z)*var(--text-sm))]`; `apply` writes it; `newToken` is absent. The page's rendered size
   is unchanged at `--z: 1`.
2. **Composite edits inside the value**: `transition: opacity 420ms var(--ease-out)` → `transition: opacity
   var(--dur-slow) var(--ease-out)`; `animate-[spin-in_420ms_var(--ease-out)_both]` keeps its keyframe name;
   `padding: '32px 40px'` → both sides. Assert the written text and that the page still animates/pads the same.
3. **Scale, not tokens**: 21 `tracking-[…]` values across 5 files: one finding per value still, but `recommendation:
   'scale'` with one `scale.steps` ladder shared by all, and `plumber propose --family type --write` writes exactly
   that ladder; after the write, `tracking-[0.1em]` is `copy` of the new step with a swap.
4. **Repeat threshold**: a shadow written in 3 places → `token`; the same shadow in 1 place → `keep` with the nearest
   `--shadow-*` named in `action`; never a colour choice at a shadow site (exists).
5. **Geometry and runtime are notes**: `bottom-[calc(100%+7px)]`, `w-[50%]`, `gap-[1cqw]`, `top: g.left` → `kind`
   geometry/runtime, `recommendation: 'note'`, not in Blueprint's problem count (progress `drift` unchanged when they
   are added to the page).
6. **Alpha**: `text-[#ffffffcc]` with `--color-on-accent: #ffffff` → edit to `text-on-accent/80`, never
   `text-on-accent`.
7. **Determinism**: the whole fixture's `kind`/`recommendation`/`edits` are identical across two cold runs and a warm
   one (the classes-determinism rule), and `POST places` equals the CLI per file.

## Appendix: commands and raw output

```
cd /Users/vijaysingh/unlocalhosted/crafting-ui
PLUMBER_CACHE_DIR=<fresh> node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --json > crafting.json   # 12.5 MB
# sites per rule
{"existence/dead-class":46,"existence/dynamic-class":4,"provenance/arbitrary":850,"provenance/spacing":120,"provenance/color":464,
 "provenance/color/by-value":77,"provenance/radius":22,"provenance/type/framework":291,"provenance/type":387,"provenance/motion":80,
 "provenance/motion/framework":1,"provenance/motion/by-value":37,"provenance/elevation":13,"config/no-tokens":59,
 "provenance/opaque-inline":776,"dead/color":4,"dead/motion":4,"dead/size":3,"dead/type":6,"ownership/Lettering":4,"ownership/Plane":8}
decisions 164  families: color,elevation,motion,radius,size,type
```
Classification script (`taxonomy.mjs`, kept with this session's scratch; regex kinds listed in §taxonomy): per
provenance site, the declaration at the site (`occurrences`), its `prop`/`value`/`resolved`, the finding's `choices`,
`edits` at that site, `newToken`, `adopt`, `action`; repeats = sites sharing family + property + judged amount.
```
# totals: 3118 provenance places
# new-token suggestions: 878 places, 315 distinct values; once-only: 223; repeating 2+: 655 places (92 values); in 2+ files: 566
new tokens by kind {"fluid":56,"geometry formula":16,"var × N":59,"geometry unit":74,"far literal":35,"other calc":12,
 "variable":1,"colour literal":80,"colour via variable":5,"color-mix":2,"colour inside a shorthand":16,"alpha":1,
 "em letter-spacing":210,"unitless line-height":38,"font weight number":99,"other (font-family, shorthands)":132,"shadow":42}
POST /__plumb/places src/motion/Timeline.tsx vs CLI, sites per rule:
CLI    {"provenance/arbitrary":13,"provenance/spacing":1,"config/no-tokens":5,"provenance/opaque-inline":2}
places {"provenance/arbitrary":13,"provenance/spacing":1,"provenance/opaque-inline":2}
```
Real examples behind the table (file:line, today's recommendation, repeats):
```
src/craft-rules/video-app.tsx:32  text-[length:calc(var(--z)*14px)] → font-size: calc(var(--z) * 14px) | new token --text calc(var(--z) * 14px) | ×3/3f
src/motion/examples/player.tsx:384 text-[0.9375rem] → font-size: 0.9375rem | Replace `text-[0.9375rem]` with `text-md`. | ×61/23f
src/motion/Timeline.tsx:373 tracking-[0.1em] → letter-spacing: 0.1em | new token --tracking 0.1em | ×70/26f
src/components/SiteHeader.tsx:81 px-[clamp(1rem,4vw,2.5rem)] → padding-inline: clamp(1rem, 4vw, 2.5rem) | new token --spacing clamp(1rem, 4vw, 2.5rem) | ×23/22f
src/craft-rules/MenuFromButton.tsx:189 leading-[1.25] → line-height: 1.25 | new token --leading 1.25 | ×16/13f
src/styles/craft.css:154 font-weight: 500 | new token --font-weight 500 | ×146/61f (with the font-medium defaults)
src/index.css:302 transition: opacity 420ms var(--ease-out) | Replace … with `transition: var(--dur-slow)`. | ×1/1f   (destructive)
src/components/annotations.tsx:100 animate-[redline-in_420ms_var(--ease-out)_both] | Replace … with `animate-(--dur-slow)`. | ×6/3f   (destructive)
src/pages/IconConceptsPage.tsx:44 padding: '32px 40px' | Replace … with `padding: "calc(var(--spacing) * 8)"`. | ×1/1f   (destructive)
src/motion/examples/BurstExample.tsx:52 text-[#ffffffcc] | Replace `text-[#ffffffcc]` with `text-on-accent`. | ×1/1f   (alpha dropped)
src/components/blueprint.tsx:40 bottom-[calc(100%+7px)] | new token --spacing calc(100% + 7px) | ×1/1f   (geometry)
src/motion/examples/ContinuousExample.tsx:166 bottom-[1.2cqw] | new token --spacing 1.2cqw | ×1/1f   (geometry)
src/craft-rules/MenuFromButton.tsx:121 leading-6 → line-height: calc(var(--spacing) * 6) | No class sets `line-height: var(--text-xl)` … | ×3/1f   (a line-height judged against a text-size token: a cross-family match to fix)
```
crafting-ui's theme (src/index.css): `--text-*` minor third from 16px (2xs 0.6875rem … 5xl 3.5rem) with paired
`--line-height`/`--letter-spacing`; `--spacing: 0.25rem`; `--radius-xs…xl` 1–6px; `--ease-*`; `--shadow-1…4`; no
`--tracking-*`, `--leading-*` or `--font-weight-*` of its own.

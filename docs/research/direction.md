# Direction: where the app is going before anything is cleaned up

Research and a model (2026-11-03). Nothing here is built. The owner's decision of 2026-11-03: "unslop" must not flatten
every app into one neutral palette, one ladder and one icon set. Before the passes run, the user and Plumber set a
**direction** for the app, and every pass moves the app toward *that*, starting from what the app already is.

Proof conventions: `file:line` is a line in this repo or in crafting-ui; a command with its raw output is a measurement
made for this document (the probe is `scratchpad/measure/probe.mjs`, one headless Chrome over 12 of crafting-ui's 54
routes, 1280×800, reduced motion; numbers quoted from its `raw.json`). The web research with its URLs is summarised in
§1 and kept whole in the session scratchpad (`research/existing-tools.md`); claims marked [K] there were not verified
against a source and are not relied on below.

## 0. The model in one paragraph

A direction is **a scope, a position, and a few choices**. The *scope dial* says how much may change (keep my look,
refine it, find a new one). The *position* is a point on a 2D pad, Airy↔Compact × Quiet↔Bold, read from the app first
and moved by the user. The *choices* are one accent, one neutral family, one motion feel, one type pairing, one icon
style, each defaulting to what the app already has. Everything a pass writes derives from those by the tables in §3:
the direction compiles to `@theme` values and to the *targets* each pass snaps to. The user never tunes a token; they
move a dot, pick from a board, and watch their own components change.

## 1. What exists, and what each gets right and wrong for us

| Tool | What it is | Right for us | Wrong for us |
| --- | --- | --- | --- |
| Graphical (graphicalui.com) | Theme builder: 5 style presets (only "Felt" is named publicly), a character pad Airy/Compact × Quiet/Bold, motion ("Snappy"), colour, neutrals ("Mono"), primary action style, typography, a board of Base UI components restyled live; exports theme files and agent context | The pad is the right user-facing abstraction: two continuous axes beat twelve sliders. Presets as starting points. A live board of real components, not swatches | Starts from a blank preset, never from the app. The pad→token map is a black box; no numbers are published, so ours is defined here from scratch. No notion of drift or of a scope |
| Realtime Colors | Five roles (text, background, primary, secondary, accent) previewed on a landing page, contrast badges | Judge colour on a real page; roles as the unit; contrast live | 60-30-10 is decoration there, not a measured budget. We use it as a *measure* (area share of neutral / secondary / accent), not an input |
| Radix Themes | 5 props: accent, gray, radius (none/small/medium/large/full = factor 0/0.75/1/1.5/1.5 over 3,4,6,8,12,16px), scaling 90–110% over space (4,8,12,16,24,32,40,48,64) and type (12/16 … 60/60), panel background. Gray paired to accent hue: mauve←red/pink/purple, slate←blue/indigo/cyan, sage←green/teal, olive←grass/lime, sand←yellow/orange/brown. 12 steps with fixed roles: 1–2 backgrounds, 3–5 interactive, 6–8 borders, 9–10 solid, 11–12 text | The best "few knobs, everything derives" model. One radius factor and one scaling factor move the whole system. Gray tinted by the accent's hue family is the rule we adopt for neutral temperature | Five stops are coarse. One global scale cannot say "tight lists, airy hero". Assumes its own components |
| shadcn/ui, tweakcn | A flat CSS-variable block in oklch (`--primary`, `--muted`…), `--radius: .625rem` with sm .6×, md .8×, lg 1×, xl 1.4×, 2xl 1.8×; base neutrals Neutral/Stone/Zinc/Mauve/Olive/Taupe | The de facto Tailwind v4 contract: a theme is a diffable variable block. One radius variable drives a ladder | Roles are component-shaped (card, popover, sidebar). No spacing, type or motion contract. A preset is "paste a block": no distance from the current app |
| Material 3 dynamic colour (HCT) | One source colour → tonal palettes; roles at fixed tones (primary 40/80 light/dark, container 90/30, surface 98/6, outline 50/60…); *schemes* are chroma budgets per palette: tonal spot P36 S16 T24 N6 NV8, vibrant P200 S24 T32 N10 NV12, expressive P40 S24 T32 N8 NV12, neutral P12 S8 T16 N2 NV2, monochrome all 0, fidelity/content keep the source's chroma | The reference for "character as a chroma budget": one set of numbers is quiet vs bold. Neutrals tinted by the source hue at chroma 2–12. Fixed tones guarantee contrast pairs by construction. Fidelity/content = start from what the app is | HCT maths is not CSS; oklch is the practical stand-in. Roles are Android-shaped. Nothing about density, radius, type |
| Adobe Leonardo | Colour scales generated from target contrast ratios against the background (3, 4.5, 7…), any interpolation space | Contrast as the parameter the drift check can verify; one ratio list gives a light and a dark theme | Colour only; WCAG 2 ratios ignore polarity and size (the craft contrast rule already uses APCA) |
| Huemint | ML palettes conditioned on a template's contrast matrix; a creativity/temperature dial; lock a swatch and regenerate | Lock-and-regenerate is "keep what the app has, vary the rest"; one dial for how far to depart | Black box, not reproducible; no roles; ΔE is not accessibility contrast |
| Utopia | Fluid type and space between two viewports; `clamp(min, intercept + slope·100vw, max)`, slope = (max−min)/(maxW−minW); space = type base × {.25,.5,.75,1,1.5,2,3,4,6} | Type and space share one base, so one dial moves both; the formula is exact and cheap | Assumes fluid authoring; an existing app uses px/rem classes (crafting-ui has 23 `px-[clamp(1rem,4vw,2.5rem)]` and otherwise numeric classes) |
| Modular scale, Every Layout | Named ratios (minor second 1.067, major second 1.125, minor third 1.2, major third 1.25, perfect fourth 1.333, augmented fourth 1.414, perfect fifth 1.5, golden 1.618); `--ratio` + `--s0` as custom properties | A ratio is one number for type contrast (quiet = low, bold = high) | Pure geometric ladders give 12.8/14.4 at the small end; real ladders are hand-tuned (crafting-ui's is 11, 12, 14, 16, 17, 19, 24, 44: docs/research/type-roles.md §3), so a ratio is a *fit*, not a rule |
| Apple HIG, SF Symbols | Named text styles with size, leading and weight as one role (Large Title 34/41 … Caption 2 11/13); icon weight follows the adjacent text's weight (9 weights), 3 scales to cap height | A text style is size + leading + weight + tracking, one name (what type-roles already does). **Icon weight is typography**: it follows text weight | Fixed, irregular steps; one platform |
| Linear, Vercel Geist | Linear cut its theme to three inputs: base colour, accent, contrast (in LCH); reduced the accent's influence on neutrals. Geist: steps 100–1000 with roles (100–300 backgrounds, 400–600 borders, 700–800 solid, 900–1000 text), gray by default, one border drawn once, translucent shadows | The sharpest proof that a direction is very few inputs. Step roles mirror Radix | No density or motion numbers published; a single brand, not a chooser |
| Tailwind v4 `@theme` | Namespaces `--color-*`, `--font-*`, `--text-*` (+ `--text-*--line-height`, `--letter-spacing`, `--font-weight`), `--tracking-*`, `--leading-*`, `--spacing` (one value: `p-4` = 4 × `--spacing`), `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`; `@theme inline` when a value is itself a `var()`; `--color-*: initial` replaces a namespace; default transition 150ms | The target format. A direction *is* a set of `@theme` values. `--spacing` is a one-token density dial; utilities compile to `var()` references, so overriding the variables on the live page previews a direction without a recompile | No single radius factor (shadcn adds one); no semantic roles; no duration namespace |
| Icon sets | Lucide 24-grid, stroke 2, `absoluteStrokeWidth`; Heroicons outline 1.5 / solid 24, 20, 16; Phosphor six weights; Tabler stroke 1–2; Radix 15-grid; Material Symbols axes FILL, wght 100–700, GRAD, opsz 20–48 | Only Material Symbols, SF Symbols and Phosphor have a weight axis; elsewhere stroke is a number we set. A direction can state "stroke = f(text weight, size)" | No set publishes a stroke↔font-weight rule; grids differ (15/16/20/24) |
| Motion tables | M3: 16 durations 50–1000ms, emphasized `(.2,0,0,1)`, decelerate `(.05,.7,.1,1)`. Carbon: 70/110/150/240/400/700ms; *productive* `(.2,0,.38,.9)` vs *expressive* `(.4,.14,.3,1)` | Carbon's productive↔expressive split is a Quiet↔Bold axis for motion with six durations | 16 steps is too many for a chooser; none ties duration to travel |
| Open Props, Panda presets, Mantine, DTCG | Role aliases over primitives switched per mode; preset merge order (user config last wins); ~10 typed theme keys; a portable token file format | Alias-over-primitive layering; "direction under the app's overrides" merge semantics; a portable export | Config-only, build-time, or draft |

**The gap every one of them shares: none reads the existing app first.** Each starts from a blank preset or a source
colour. Plumber's position is the opposite: measure the app, place it on the pad, then move it. That is the whole
difference between a theme builder and a direction.

## 2. The parameters of a direction

```
direction: {
  scope:     'keep' | 'refine' | 'new',                       // §4
  density:   -1 … +1,   // Airy (−1) ↔ Compact (+1)            // the pad, x
  contrast:  -1 … +1,   // Quiet (−1) ↔ Bold (+1)              // the pad, y
  motion:    'calm' | 'snappy' | 'lively',
  colour:    { accent: 'oklch(L C H)', neutral: 'mono' | 'cool' | 'warm' | 'tinted', budget: 1 | 2 | 3 },
  type:      { body: '<family>', display: '<family> | same', numerals: 'tabular' | 'proportional' },
  icons:     { style: 'line' | 'solid' | 'duotone', set?: '<package>' },
  preset?:   '<name>',  // §6: the preset the user started from; the fields above are its values, edited
}
```

Eight things. Everything else derives. The derivations below are **the contract between the direction and the passes**:
a pass never invents a number; it reads a target from here.

### 2.1 The pad, x: density (Airy −1 … Compact +1)

Density is three things that must move together: how far apart things sit, how tall lines are, how much air a control
has. It is **not** the spacing unit: `--spacing` stays what the app has (crafting-ui: `--spacing: 0.25rem`,
`src/index.css:118`), because every numeric class in the codebase is a multiple of it, and changing it moves everything
at once including what was deliberate. Density moves the *levels* (hierarchy.md S1: inside < between ≤ around), which
is what the spacing pass snaps to.

| density | inside (a thing and its qualifier) | between (rows, cards) | around (padding of a group) | section | body line-height | list line-height | control padding (y/x) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| −1 Airy | 8 | 24 | 32 | 64 | 1.7 | 1.5 | 12 / 20 |
| −0.5 | 8 | 20 | 24 | 48 | 1.65 | 1.45 | 10 / 16 |
| 0 | 4–8 | 16 | 20–24 | 40 | 1.6 | 1.4 | 8 / 14 |
| +0.5 | 4 | 12 | 16 | 32 | 1.5 | 1.35 | 6 / 12 |
| +1 Compact | 4 | 8 | 12 | 24 | 1.45 | 1.3 | 4 / 10 |

Values are in px for a 4px base; for another base, the same multiples (2, 4, 6, 8 … of the base). Between any two
rows of the table, interpolate and snap to the app's own rhythm (the gaps it keeps to: craft/rhythm,
`overlay/src/craft-rules.js:1393`). The rule the table encodes: **each level is at least one step above the one
inside it** (owner's decision Q2 in hierarchy.md), and density changes the size of that step.

Tokens written (scope ≥ refine): `--text-*--line-height` for the body and list roles (type-roles.md §6 already writes
`--text-<role>--line-height`); the level targets themselves are not tokens, they are the spacing pass's input. At
scope "new" a project without its own `--spacing` may also take `--spacing: 0.225rem` (+1) … `0.275rem` (−1), Radix's
scaling model (90–110%); never when `--spacing` is the project's own (src/decisions/spacing.ts:65–66 decides that).

### 2.2 The pad, y: contrast (Quiet −1 … Bold +1)

Contrast is how much the loud things differ from the quiet ones: the type ladder's ratio, the weight spread, how
round and how lifted surfaces are, how saturated the accent is.

| contrast | ladder ratio (display : body) | display weight | label weight | radius factor (× app's steps) | shadow alpha factor | accent chroma factor | neutral chroma (oklch C) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| −1 Quiet | 1.125 (≈ 2.0×) | 400 | 400 | 0.75 | 0.5 | 0.6 | 0 |
| −0.5 | 1.2 (≈ 2.5×) | 500 | 400 | 0.9 | 0.75 | 0.8 | 0.004 |
| 0 | 1.25 (≈ 3×) | 500–600 | 500 | 1 | 1 | 1 | 0.008 |
| +0.5 | 1.333 (≈ 4×) | 600 | 500 | 1.25 | 1.3 | 1.25 | 0.012 |
| +1 Bold | 1.414 (≈ 5×) | 700 | 600 | 1.5 | 1.6 | 1.5 | 0.016 |

- *Ladder ratio* is a fit, not a generator: the type pass keeps the project's own ladder (type-roles.md) and moves
  only its two ends toward the ratio (display up or down, labels up or down), one theme step at a time, so the ladder
  stays whole pixels. "≈ N×" is display ÷ label-small across eight roles (1.125⁷ ≈ 2.3, 1.2⁷ ≈ 3.6, 1.25⁷ ≈ 4.8; the
  column rounds to what crafting-ui's own ladder shows: 44 ÷ 11 = 4.0 at ratio ≈ 1.22 median step, see §5).
- *Radius factor* multiplies the app's own radius steps (crafting-ui: 1, 2, 3, 4, 6px, `src/index.css:122–126`),
  shadcn-style, and is written as new `--radius-*` values at scope ≥ refine. At scope "keep" radius is not touched.
- *Accent chroma factor* multiplies the accent's oklch C, capped at 0.32 (beyond sRGB for most hues). Crafting-ui's
  draw blue is `oklch(50.6% 0.289 264.8)` (`src/index.css:33`): already at +1; "quiet" would bring it to 0.17.
- *Neutral chroma* is the tint of the grey family at the accent's hue (Radix's gray pairing; Linear's "reduced accent
  influence on neutrals"). 0 is Mono. Written as the `--color-bg/surface/line/fg-*` values at scope ≥ refine.

### 2.3 Motion

| motion | fast | base | slow | spatial | easing (enter / exit) | springs |
| --- | --- | --- | --- | --- | --- | --- |
| calm | 120 | 200 | 320 | 480 | standard `(.2,0,.38,.9)` / `(.2,0,1,.9)` (Carbon productive) | none |
| snappy | 80 | 140 | 220 | 360 | out `(.22,1,.36,1)` / in `(.55,0,1,.45)` | gentle (170/26) |
| lively | 100 | 180 | 280 | 420 | expressive `(.4,.14,.3,1)` / `(.4,.14,1,1)` | bouncy (260/18) allowed on enter |

Snappy is crafting-ui's own row: `duration-instant 80 / fast 140 / base 220 / slow 360`, `--ease-out: cubic-bezier(0.22,
1, 0.36, 1)`, springs "gentle ≈ 170/26, bouncy ≈ 260/18" (`src/index.css:130–153`). Written as `--ease-*`,
`--default-transition-duration` and `@utility duration-*` at scope ≥ refine. Exits never slower than enters
(craft/exit-faster). No pass in this document writes motion; the direction records it so the craft motion rules
(press-feedback, exit-faster, interruptible) judge against the chosen row, and for the board.

### 2.4 Colour

- **Accent**: one `oklch(L C H)`. Default: the app's most used hued text/background colour that is not a status
  colour (crafting-ui: `--draw` blue, 343 text uses and 116 `text-draw` class uses, see pass-colour.md).
- **Neutral family**: `mono` (C 0), `cool` (hue 250–270), `warm` (hue 60–90), `tinted` (the accent's own hue). Chroma
  from the contrast row. Written as the neutral tokens' values.
- **Budget**: how many hued roles may carry colour besides status (success/warning/danger): 1 (the accent only),
  2 (accent + a second ink, crafting-ui's draw blue + redline red), 3. The colour pass refuses to introduce a hue
  beyond the budget and proposes folding extra hues into the nearest allowed one.
- **Derived**: text levels at three greys (fg, muted, faint: crafting-ui `oklch(13% 0 0)`, `/ 0.62`, `/ 0.42`), the
  on-accent colour by APCA against the accent, hover/pressed as L ± 4–6, soft as the accent at alpha 0.1.

### 2.5 Type

The families only: body and display (same, or a pairing), numerals tabular or not. The ladder is the project's
(type-roles), moved by the contrast row. Presets in §6 name pairings; the default is the app's own `--font-sans` /
`--font-display`.

### 2.6 Icons

`style` line | solid | duotone; `set` the package the app already imports (none on crafting-ui: no icon dependency in
`package.json`, 159 inline `<svg>` in 103 files, `src/language/Icon.tsx` is its own renderer, see pass-icons.md).
The derived rule, from HIG's "icon weight follows text weight", written as the pass's target table:

| text weight beside the icon | stroke at 16px | at 20px | at 24px |
| --- | --- | --- | --- |
| 400 | 1.5 | 1.5 | 1.75 |
| 500 | 1.75 | 1.75 | 2 |
| 600+ | 2 | 2 | 2 |

with contrast −1 taking 0.25 off every cell and +1 adding 0.25. Icon size per text role: label 14–16, body 16–20,
title 20–24. Set weights (Phosphor regular/bold, Material wght 400/600) map to the same cells.

## 3. How a direction becomes tokens and targets

```
direction ──► targets  (per pass: level sizes, grey levels, stroke table, ladder ends)   ── every scope
          └─► @theme   (--text-*--line-height, --radius-*, --color-*, --ease-*, duration utilities)   ── scope ≥ refine
```

Tokens are written through the existing `token` write (`src/session/methods.ts:51`, traced) into the theme stylesheet
(`src/recipes/stylesheet.ts` finds `@theme` blocks; crafting-ui keeps raw values in `:root` and aliases them in
`@theme inline`, so the write goes to `:root`'s declaration, never the alias). One write per pass, tagged
`trace: { group: 'direction-<n>', meta: { step: 'Direction', laws: [] } }` so History shows one "Direction" segment.

**Live preview without a recompile.** Tailwind v4 utilities compile to `var()` references (`p-4` →
`calc(var(--spacing) * 4)`, `bg-surface` → `var(--color-surface)`, `rounded-md` → `var(--radius-md)`). Setting those
properties as inline styles on `<html>` restyles the whole page at once, at the cost of one style recalc, with
nothing written. What does *not* follow is exactly the slop the passes then find: on crafting-ui, `bg-[#ffffff]` ×18,
`text-[#ffffff]` ×15, `bg-[#000000]` ×9, `bg-white` ×14, `border-white` ×7 (`grep -rhoE "\b(text|bg|border)-\[(#|oklch|rgb)…"
src`), `pt-[5px]` ×8, `pt-[3px]` ×7. The board shows them as "won't follow: 63 places" and the passes list them.

## 4. The scope dial

Three named levels. The copy is the user's: verb-first, says what it keeps.

| Level | Copy | What it may change | What it may not | How the passes behave |
| --- | --- | --- | --- | --- |
| **keep** | *Keep my look.* Fix what drifted from it. | Classes at places: off-scale values to the app's own steps, odd colours to the app's own tokens, odd strokes to the app's usual one. The pad is read-only (shows where the app is) | Any token value. Any new value: a pass that adds a distinct value is not offered. Radius, motion, families, icon set | Every target is the app's own: its rhythm, its tokens, its usual stroke. "Before → after" counts distinct values on the page and the project; after ≤ before always |
| **refine** | *Refine my look.* Keep what it is, tune how it feels. | Everything in keep, plus token *values* (line-heights, radii, neutral tint, accent chroma, durations) moved by the pad within ±0.5 of where the app sits; the two ends of the type ladder; icon stroke table | New roles, new families, a new accent hue, a new icon set, a new neutral family (tinted stays tinted; mono may become tinted at low chroma) | Targets come from the direction's rows; a pass may move a token *and* the places that drift from it, as two writes in one step (token first, then classes) |
| **new** | *Find a new look.* Start from what you have and go somewhere. | Everything, by preset: accent hue, neutral family, type pairing, icon set and style, radius factor, motion row; new roles (a headline-medium, a readout role) | Content (drawings, specimens, `config.system.exclude` paths), layout mode, element structure. Anything that cannot be located exactly | Targets come from the preset's rows; passes may introduce values that exist nowhere in the app yet, so the measure is "distinct values after ≤ the direction's count", never "≤ before" |

A project with no census and no theme (day one) starts at **new** with the board; a project with a theme and a census
starts at **keep**, the dot placed where the app is. Mid-project, the level is remembered in the config and the runner
says which it is on every pass: "Keeping your look: 14 gaps move to your scale."

## 5. From the app's DNA: reading the position

The app is placed on the pad and matched to a preset before the user touches anything. Every reading below has a
source Plumber already has or the census v2 (pass-spacing.md, pass-colour.md, pass-icons.md add `boxes`, `colours`,
`icons` to the project census the same way `entries` holds text: `src/census.ts:30–41`).

| Signal | Source | → axis | Rule |
| --- | --- | --- | --- |
| Type ladder: median ratio between adjacent role sizes | type-roles proposal `ladder[].ratio` (`src/rules/type-roles.ts:40`) | contrast | ratio ≤ 1.15 → −1; 1.2 → −0.33; 1.25 → 0; 1.333 → +0.5; ≥ 1.414 → +1 (linear between) |
| Weight spread: display weight − label weight | census `computed.weight` by role | contrast | 0 → −1 (all one weight); 100 → −0.5; 200 → 0; ≥ 300 → +1; averaged with the ladder reading |
| Radius: median of the theme's `--radius-*` ÷ 6px | theme tokens (`decisions`, family radius) | contrast | ≤ 0.5 → −0.5 (crisp); 1 → 0; ≥ 2 → +0.5; blended at ¼ weight |
| Accent chroma: C of the most used hued token | colour census | contrast | C ≤ 0.1 → −1; 0.18 → 0; ≥ 0.26 → +1; blended at ¼ weight |
| Body line-height, list line-height | census `computed.lineHeight / size` by role | density | 1.7 → −1; 1.6 → 0; 1.45 → +1 |
| Between-level gap: the modal gap between same-kind siblings; around: modal padding of containers | boxes census | density | between 24 → −1; 16 → 0; 8 → +1; blended equally with line-height |
| Neutral chroma: C of `--color-bg/surface/line` | theme tokens | colour.neutral | C = 0 → mono; hue within 20° of accent → tinted; 250–270 → cool; 60–90 → warm |
| Hued roles in use beyond status | colour census | colour.budget | count of distinct hues (±15°) among token colours carrying ≥ 2% of text/bg uses |
| `--default-transition-duration`, `--ease-*`, `duration-*` utilities | theme tokens + source class counts | motion | base ≤ 150 and an ease-out curve → snappy; ≥ 200 and standard → calm; springs/bounce in ≥ 10% of eases → lively |
| Icon stroke mode and its pairing with text weight | icons census (`facts.strokes`, craft/stroke-weight learns it already: `craft-rules.js:1520–1522`) | icons | the table cell nearest the mode |

**Worked on crafting-ui** (proof in the pass documents and `src/index.css`):

- Ladder 11, 12, 14, 16, 17, 19, 24, 44 (type-roles.md §3): adjacent ratios 1.09, 1.17, 1.14, 1.06, 1.12, 1.26, 1.83;
  median 1.14 → contrast −0.7. Weights 400 ×3335, 500 ×865, 600 ×148 of 4372 text uses (probe `weights`); display is
  500, labels 400: spread 100 → −0.5. Radii 1–6px → crisp, −0.5. Accent chroma 0.289 → +1 at quarter weight.
  **Contrast ≈ −0.45: quiet type, one loud ink.** That matches the file's own words: "black type for words, one blue ink
  for every drawing … one red-pencil mark" (`src/index.css:4–7`).
- Body 16/1.65 (`type-body`, ×31 places), lists 15/1.375 (type-roles.md §2): line-height reads −0.2 / +0.2. Gaps over 12
  routes: 12px ×380, 4 ×354, 20 ×318, 8 ×317 (probe `gaps`, 20 distinct over 2,142 uses); the between-row gap on
  `/motion` is `py-4` → 32px row to row, columns `gap-x-6` 24 (hierarchy.md S1). Padding mode 4 ×899, 8 ×660, 16 ×561.
  **Density ≈ −0.1: medium, a touch airy in prose, tight in lists.**
- Neutrals: `--bg: oklch(98.7% 0 0)`, `--fg: oklch(13% 0 0)`, `--line: oklch(0% 0 0 / 0.12)`: C = 0 → **mono**. Hued
  tokens: draw blue (264.8°) and accent red (28°), success/warning rarely: **budget 2**.
- Motion: 140ms default, ease-out, `ease-out` ×111 and `duration-fast` ×61 in source vs `ease-bounce` ×10 → **snappy**.
- Icons: the renderer sets stroke 1.5 on every `Icon` (`src/language/Icon.tsx:67`, 280 of 356 measured shape strokes
  outside the gallery); hosts are weight 400 → cell (400, 20px) = 1.5: **line, already on the table**.

The readout the user sees: *"Your app today: quiet type, one strong blue, plain greys, square corners, snappy motion.
Closest style: Drafting."* The dot sits at (−0.1, −0.45). Nothing about tokens.

## 6. Presets

Eight of our own. Each is a full direction (every field set) with a reason to exist; each is a *starting dot and
choices*, then the pad moves it. Names are things, not adjectives, so they can be said in a sentence ("move it toward
Ledger").

| Preset | density, contrast | motion | colour | type | icons | Character, and who it is for |
| --- | --- | --- | --- | --- | --- | --- |
| **Ledger** | +0.7, −0.6 | calm | mono neutrals, one accent (budget 1), tabular numerals everywhere | one family, body 13–14, labels 11 caps tracked, display 500 | line 1.5, 16px | Rows and numbers first; nothing competes with the figures. Finance, admin, data tables |
| **Drafting** | −0.1, −0.45 | snappy | mono paper, one drawing ink + one redline (budget 2) | sans body, mono display and labels in caps | line 1.5, square ends | The reference manual: crafting-ui's own DNA, named so it can be chosen on purpose. Docs, tooling, technical products |
| **Paper** | −0.8, +0.2 | calm | warm neutrals (hue 75, C 0.01), accent at 0.8 chroma, budget 1 | serif display 400 over sans body, 1.7 leading, ratio 1.333 | line 1.25, sparse | Reading. Editorial sites, long-form, writing tools |
| **Instrument** | +0.4, −0.2 | snappy | cool neutrals (slate, C 0.006), accent at 1.0, budget 1, hairline borders over shadows | one family, 500 titles, 1.2 ratio | line 1.5 with 1.75 beside 500 | Dense, calm, fast: the productivity-app register (Linear's "condensed"). Work tools, dashboards with many controls |
| **Clay** | −0.4, +0.6 | lively | tinted neutrals (accent hue, C 0.014), accent 1.25, budget 2, radius ×1.5 (12–20px), layered soft shadows | rounded sans, 600 titles, 1.25 ratio | solid or duotone, 20–24px | Soft, friendly, tactile. Consumer apps, onboarding-heavy products |
| **Signal** | +0.2, +0.9 | snappy | dark-first: near-black surfaces (L 13–22%), neutrals mono, one neon accent at full chroma, budget 1, status hues allowed | mono numerals tabular, display 600 at 1.333 | line 1.75, coloured dots for categories | Monitoring. The video's end state belongs here: one accent, coloured dots, light display numbers |
| **Poster** | −0.6, +1 | lively | neutrals mono, accent ×1.5 on large areas, budget 3 | display 700–800 at 1.414+, body 400 | solid, large | Marketing pages and launch surfaces. Loud on purpose, so the pass that quiets things is told not to |
| **Hush** | 0, −1 | calm | mono, accent at 0.6 on the primary action only, budget 1, no shadows, radius ×0.75 | one family, one weight step (400/500), 1.125 ratio | line 1.25 | The quiet default: when the user says "just make it calm". Settings, forms, legal |

Why not copy Graphical's: its presets are published without their values, and the owner asked for variety with
character, which comes from the *pairing* of fields (Drafting's mono caps + square corners + snappy; Paper's serif +
warm + calm), not from any one knob.

## 7. The collaboration flow

### 7.1 Where it starts

| Entry | When | What happens first |
| --- | --- | --- |
| `plumber direction --url <dev server>` | start of a project, or any time from a terminal | Takes the census if there is none (`plumber census` is already the reader), reads the theme, prints the readout of §5 and the closest preset, then serves the board (a page on the session server, opened in the browser) |
| Dock → **Set a direction** (overlay) | mid-project, on the live app | The same readout in the panel; the board opens *over the app*: candidate directions applied live to the page by variable override (§3) |
| The clean-up runner's first screen | the first time "Clean up this page" is chosen with no direction saved | One line: "Keeping your look. Change the direction?" → the board; else the passes run at scope keep |

### 7.2 The steps (both surfaces, same order)

1. **Where you are.** The readout and the dot on the pad. The user does nothing yet.
2. **How far to go.** Three buttons: Keep my look · Refine my look · Find a new look. The default is keep when there
   is a theme and a census; new when there is neither.
3. **The board.** Three candidates side by side (§8): *as you are*, *the closest preset*, *one step bolder or quieter*
   (whichever the readout is nearer the middle of). At scope new the row is the eight presets, scrolling. Pick one.
4. **Tune.** The pad (drag the dot), motion (three words), accent (a picker seeded with the app's hues), neutrals
   (Mono · Cool · Warm · Tinted), type pairing, icon style. Each change re-renders the board. At scope refine the dot
   is held within ±0.5 of where the app sits, with the ring drawn.
5. **Save.** "Save this direction" writes `direction` to `plumber.config.mjs` (one traced write, one History step) and,
   at scope ≥ refine, the `@theme`/`:root` values (a second write in the same step). The runner then starts at the
   type pass.
6. **Revise.** The same entry points reopen the board with the saved direction loaded; "Back to how it was" restores
   the readout's direction (the app's DNA at the time it was first read, kept in the config as `direction.from`).

### 7.3 Where it is saved

```js
// plumber.config.mjs
export default {
  direction: {
    scope: 'refine', preset: 'drafting',
    density: -0.1, contrast: -0.3, motion: 'snappy',
    colour: { accent: 'oklch(50.6% 0.289 264.8)', neutral: 'mono', budget: 2 },
    type: { body: 'Geist', display: 'Geist Mono', numerals: 'tabular' },
    icons: { style: 'line' },
    from: { density: -0.1, contrast: -0.45, read: '2026-11-03T12:00:00Z' },   // the app's DNA when first read
  },
}
```

`PlumbConfig` (`src/config.ts:38–60`) grows one key; `system` stays as the type-role decisions. The config is already
the one place the owner's decisions live (`crafting-ui/plumber.config.mjs` holds `system.type.roles`), so a direction
is read by the CLI and the session alike and is reviewed in a diff like any decision.

### 7.4 Start of a project vs mid-project

| | Start (no census, thin theme) | Mid-project |
| --- | --- | --- |
| Readout | "Not much to read yet: 3 colours, 2 text sizes." | Full §5 readout |
| Default scope | new | keep |
| Board specimens | generic only | the app's own components first (§8) |
| What writes | the `@theme` block (creating the roles the passes will later snap to) | targets first; tokens only at refine/new |
| Later | the census grows; the readout is re-read on request, `direction.from` is kept as it was | the dot moves as passes land; "where you are" is re-read after each run |

## 8. The specimen board

### 8.1 Generic specimens (rendered inside the overlay or the board page, from the direction's tokens alone)

Six, chosen so that each exercises one derivation and together they cover all eight fields:

| Specimen | Shows |
| --- | --- |
| A figure card: label, big number, delta, a small line chart | display weight and ratio, tabular numerals, accent on one line, the card's padding level, radius, shadow |
| A list of three rows: icon, title, meta, count | inside/between/around levels, icon stroke beside 400/500 text, grey levels (title/meta) |
| A form field with a primary and a secondary button | control padding, the primary action style, focus ring, motion (press feedback plays on hover) |
| A type specimen: Aa 123 #&! plus the role ladder as lines | families, the ladder's ends, label caps and tracking |
| A side nav: section label, five items, one selected | selected-state colour (accent soft), density of a vertical list, icon + text pairing |
| A notice (success, warning) | the status hues against the neutral family, budget |

Each is one HTML fragment styled only with the direction's variables (`--color-*`, `--spacing`, `--text-*`,
`--radius-*`, `--ease-*`); rendering three candidates is three copies with three variable sets. Cost: a few hundred
nodes; nothing reads the app.

### 8.2 The app's own components as specimens

Picked from the census by *reach*: the stamps rendered on the most routes and with the most elements. On crafting-ui
that is the site header (`src/components/SiteHeader.tsx:49:13` is on all 54 routes: first entry of
`.plumber/cache/census.json`), the lesson rows (`src/pages/MotionIndexPage.tsx:78` with four levels, hierarchy.md T1),
`StandardEntry` (rendered 18× on `/motion/standards`, docs/qa/timeline-crafting-ui.md). Three to five of them.

Rendering them in a candidate direction is the live page with variables overridden (§3): the overlay scrolls each
specimen into view in turn, or clips the page to the specimen's rect for a side-by-side strip. Two candidates side by
side on the same page is not possible without a second document; so on the live app the comparison is **A/B by
holding Space** (the runner's own convention, docs/briefs/page-cleanup/mock.html frame 3) with the candidate
applied, and the generic strip gives the side-by-side. The board page (CLI entry) can embed the dev server route in
two iframes with different overrides when the laptop has the memory; the default is one.

### 8.3 What is cheap enough to render live

| Change | Cost on the live page | Live? |
| --- | --- | --- |
| Colour, radius, shadow, ease tokens | one style recalc, no layout | yes |
| Line-height tokens, `--spacing` | one layout | yes, debounced to the pad's release |
| Type family | font load, then layout | yes, after the font is loaded off-screen |
| Icon stroke | per-svg `stroke-width` on the renderer's variable, or a class on each svg | yes when the app routes stroke through one variable or prop (crafting-ui does: `Icon.tsx:67`); otherwise the generic strip only |
| Icon set swap, emoji → icon | a DOM swap per icon | no: shown in the generic strip, done by the pass |
| Spacing *levels* (the targets) | writes classes | no: the spacing pass previews them, place by place |

Measured with `performance.measure('plumb:direction-*')` on the board's first paint and on each pad move; the budget
is the Doherty threshold (laws.js `doherty`: 400ms) for a pad move on the live app.

## 9. Copy inventory (plain language, verb-first, no internal names)

| Where | Text |
| --- | --- |
| Readout | Your app today: quiet type, one strong blue, plain greys, square corners, snappy motion. Closest style: Drafting. |
| Thin readout | Not much to read yet: 3 colours, 2 text sizes. Pick a style to start from. |
| Scope | Keep my look · Refine my look · Find a new look |
| Scope hint (keep) | Fixes what drifted from the look you have. Nothing new is added. |
| Scope hint (refine) | Keeps what your app is and tunes how it feels. |
| Scope hint (new) | Starts from what you have and goes somewhere. You see it before anything is saved. |
| Pad labels | Airy · Compact · Quiet · Bold |
| Board | As you are · Closest: Drafting · A step bolder |
| Won't follow | 63 places use fixed colours and sizes, so they won't follow. The clean-up moves them. |
| Save | Save this direction · Not now |
| Saved | Saved. Every clean-up moves your app toward it. Change it any time from the dock. |
| Revise | Back to how it was |
| Runner, first line | Keeping your look: 14 gaps move to your scale. |

## 10. Open decisions for the owner

1. **Scope names**: keep / refine / new as above, or two levels only (keep, change) with the pad doing the rest.
2. **Density and `--spacing`**: never touch the unit (as proposed), or allow it at scope new when the project defines
   it (Radix's 90–110% model). The former keeps every deliberate value; the latter is one write for the whole app.
3. **Presets**: the eight above, or fewer (Drafting, Instrument, Paper, Clay, Signal as the five with the most distance
   between them).
4. **The board on the live app**: A/B by Space only (one document), or two iframes of the route when memory allows.
5. **Where the DNA is kept**: `direction.from` in the config (reviewable in a diff) or in the cache (regenerated).
6. **Motion in the passes**: a fourth pass later, or motion stays a direction field that only the craft rules judge.

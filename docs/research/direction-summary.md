# Direction, in one page

Summary of docs/research/direction.md and the three pass LLDs (docs/briefs/pass-spacing.md, pass-colour.md,
pass-icons.md), 2026-11-03. Nothing is built; no source code was written for this.

## The recommended model

A direction is **a scope, a position, and a few choices**, read from the app first, saved in `plumber.config.mjs` as
`direction`, and compiled into the targets every pass snaps to (all scopes) and into `@theme`/`:root` token values
(scope ≥ refine).

- **Position**: the 2D pad. *Density* (Airy −1 … Compact +1) moves the spacing *levels* (inside < between ≤ around:
  8/24/32 airy, 4–8/16/20–24 middle, 4/8/12 compact) and line-heights (1.7 → 1.45), never the `--spacing` unit.
  *Contrast* (Quiet −1 … Bold +1) moves the ladder ratio (1.125 → 1.414), weight spread (400/400 → 700/600), radius
  factor (×0.75 → ×1.5), shadow and accent chroma factors (×0.5 → ×1.6, ×0.6 → ×1.5), neutral tint (C 0 → 0.016).
- **Choices**: motion (calm / snappy / lively: three duration rows and two easing families), one accent, a neutral
  family (mono / cool / warm / tinted, Radix's gray pairing), a hue budget (1–3 inks beyond status), a type pairing,
  an icon style; each defaults to what the app has.
- **From the DNA**: the type ladder's median ratio, the weight spread, radii, accent chroma → contrast; line-heights
  and the modal between/around distances → density; token chroma → neutral family; `--default-transition-duration`
  and ease usage → motion; the learnt stroke↔weight pairing → icons. Crafting-ui reads as (−0.1, −0.45): quiet type,
  one strong blue, mono greys, square corners, snappy. Closest preset: Drafting.
- **Presets** (eight of ours): Ledger, Drafting, Paper, Instrument, Clay, Signal, Poster, Hush. Each is a full
  direction whose character comes from the pairing of fields, not one knob.
- **Live preview without a recompile**: Tailwind v4 utilities compile to `var()` references, so a candidate direction
  is a set of custom properties on `<html>`. What does not follow (`bg-[#ffffff]` ×18, `text-[#ffffff]` ×15,
  `pt-[5px]` ×8 … on crafting-ui) is exactly what the passes then move.

## The scope dial

| Level | Copy | May change | May not |
| --- | --- | --- | --- |
| keep | Keep my look. | classes at places, to the app's own steps, tokens and strokes; the pad is read-only | any token value; any new value (a pass that adds one is not offered) |
| refine | Refine my look. | token *values* within ±0.5 of where the app sits; the ladder's two ends; the stroke table | new roles, families, accent hue, icon set, neutral family |
| new | Find a new look. | everything, by preset | content, layout mode, structure, anything not locatable |

Default: keep when there is a theme and a census; new on day one.

## The flow

1. Where you are (readout + dot) → 2. How far to go (three buttons) → 3. The board: *as you are · closest preset · a
step bolder/quieter* (at new: the eight presets), generic specimens side by side, the app's own components (picked by
reach from the census: the site header, the lesson rows, `StandardEntry`) live on the page with Space to compare →
4. Tune (pad, motion, accent, neutrals, type, icons) → 5. Save (one traced "Direction" step: config, plus tokens at
≥ refine) → 6. Revise from the dock any time; "Back to how it was" restores `direction.from`.
Entry from the CLI (`plumber direction --url …` serves the board) and from the overlay (dock → Set a direction, and
the runner's first screen).

## Each pass's pragmatic cut

| Pass | Measured on crafting-ui (12 routes, read-only) | Cut (build first) | Deferred |
| --- | --- | --- | --- |
| Spacing | 20 distinct gaps over 2,142 uses, 97% on the 4/8/12/20 (+6, 10) rhythm; 11 gaps and 12 paddings on `/motion/standards`; only 7 gap uses off the scale; `pt-[5px]` ×8 / `pt-[3px]` ×7 are baseline nudges; the real failure is margin stacks evened out (QA 8/8/20) and `gap` on block | Gaps and margins in vertical stacks and lists at keep, with grouping detection (two clusters separating runs of ≥ 2 → two levels, kept) and a write locator that writes `gap` only on flex/grid, else the child's margin class | Padding levels (S3), section targets, horizontal row gaps, `space-*`, `--spacing` at new |
| Colour | 19 text colours over 4,372 uses (9 tokens, 2 content, 8 arbitrary); 92 backgrounds (58 are `/stickers` palettes = content); 15 borders; 0 gradients on UI routes (133 in the icon gallery); the tail in source: `bg-[#ffffff]` ×18, `text-[#ffffff]` ×15, `bg-white` ×14, `bg-[#000000]` ×9; one second blue (`#2F64F0` ×255) 0.07 ΔE off `draw` | Fold arbitrary and default-palette classes into the nearest role token within ΔE_ok 0.03 (keep) / 0.08 (refine), grey levels, text opacity, pure black/white, with an APCA guard; then one token write for neutral tint and accent chroma by the pad (refine) | Gradient-on-surface folding (new only), dark mode's second value set, status retuning, budgets on backgrounds (coloured dots stay) |
| Icons | No icon package; one renderer (`src/language/Icon.tsx`) at stroke 1.5 on 81/81 instances, 20px grid; 196 icons outside the gallery, strokes 1.5 ×280 shapes, 1.6 ×70 (stickers: content), 1.3 ×12; hosts all weight 400; 1 emoji on `/`; ten `strokeWidth` literals in source, nearly all in drawings | Stroke and size at keep (the app's own pairing; `[stroke-width:n]` class only when paths inherit), and emoji → icon + coloured dot at new through an explicit mapping table (60 common UI emoji for Lucide/Heroicons), only when the set is installed | Prop edits (`strokeWidth={…}`, `absoluteStrokeWidth`) until the write path locates props; set-to-set conversion; duotone and variable axes |

Each pass: one `write` tagged with its step and laws, previewed with Space to compare, measured as distinct values
before → after on the page and the site, offered only when after ≤ before (keep) or ≤ the direction's count (new).
On crafting-ui's UI routes the honest answer for colour and icons is "nothing to do", and the panel must say so; the
e2e fixtures plant the video's cases (a gradient panel, an emoji nav, an 8/8/20 aside, a stray `strokeWidth={2}`).

## Open decisions for the owner

1. Scope names: keep / refine / new, or two levels (keep, change) with the pad doing the rest.
2. Density and `--spacing`: never touch the unit (proposed), or allow it at new when the project defines it (Radix's
   90–110% model).
3. Presets: eight, or the five with the most distance between them (Drafting, Instrument, Paper, Clay, Signal).
4. The board on the live app: A/B by Space only, or two iframes of the route when memory allows.
5. Where the DNA reading is kept: `direction.from` in the config (reviewable) or in the cache (regenerated).
6. Motion: a fourth pass later, or a direction field the craft motion rules judge against only.
7. Spacing: is a 1–5px one-sided padding beside larger text always "optical" (kept), or only when craft/baseline-align
   agrees it lines up the baselines.
8. Colour: should the second blue (`#2F64F0`, stickers' ink) fold into `draw` at refine, or is a lesson's own ink a
   content colour by rule (then `src/motion/stickers.tsx` joins `config.system.exclude`).
9. Icons: whether Plumber may edit a renderer's constant (`stroke.icon` in `Icon.tsx`) as a "token" write, or only
   advise.

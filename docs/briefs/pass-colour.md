# Pass: colour

LLD for the clean-up runner's third pass, parameterized by the direction (docs/research/direction.md §2.2, §2.4, §4).
Nothing here is built. Numbers from crafting-ui: `scratchpad/measure/probe.mjs` (12 routes, read-only) and greps of
its source, quoted with each.

## What it does, in one sentence

Brings every colour on the page onto the app's colour roles (text greys, surfaces, lines, one accent, status), at the
chroma and neutral tint the direction says, draining what the video drains (gradients on surfaces, many hues, faded
text) without touching content colours.

## Lessons it carries

| Lesson | Applied |
| --- | --- |
| Project-wide, not per page | The role mapping (which computed colour is which role) is learnt from the project census (`colours` list, census v2), so `bg-[#ffffff]` maps to `surface` on every page, not to `bg` on one and `surface` on another |
| Refuse, don't guess | A colour is moved only when a token role is within tolerance (below) *and* the class that sets it is found at the usage; a colour from a stylesheet, an inline style, a `var()` the app computes, or a gradient is listed, not written |
| Content is not UI | Colours inside `<svg>`, `<canvas>`, images, and under `config.system.exclude` are content (crafting-ui's sticker palettes are 58 of `/stickers`' 92 backgrounds and 481 uses of `rgb(31,58,95)` from `src/stickers/palette.ts:13`); never proposed |
| Imitation is deliberate | A place whose fingerprint matches `config.imitation` (a demo of another product) keeps its colours (type-roles.md §5 does the same for families) |
| No new values at scope keep | Targets are the app's own tokens; a hue that no token has is refused at keep, folded at refine, replaced at new |
| One step, laws tagged | One `write`, `trace.meta.laws: ['similarity', 'von-restorff']` |

## Inputs

### Page

For every stamped element in the system: computed `color` (text elements), `background-color`, `background-image`
(gradients), `border-*-color` (where a border is drawn), `fill`/`stroke` on svgs that are icons (pass-icons.md decides
which svgs are icons; this pass reads their colour), opacity < 1 on text (craft/text-opacity), the class at the usage
that sets each (`colourClass(el, 'text'|'bg'|'border', theme)` in craft-rules.js, `text-[#…]` arbitrary forms).

### Project (census v2 `colours`)

Per stamp and property: the computed colour in oklch, the class, the route, and the painted **area** (rect area for
backgrounds, text length × size for text) so the 60-30-10 measure can be computed.

### Theme

The colour tokens and their values (`decisions`, family colour: crafting-ui `--color-*` aliases to `:root` values,
`src/index.css:19–72`), their roles inferred by name and value: text (fg/muted/faint), surface (bg/surface/sunken/
hover/pressed), line (line/line-strong), accent (+hover/soft/on), status (success/warning/danger/info), and any
second ink (crafting-ui `draw`). Role inference: name first (`fg`, `muted`, `surface`, `line`, `accent`, `primary`,
`border`, `text-*`), value second (L and alpha band).

### Direction

`contrast` → accent chroma factor, neutral chroma; `colour.accent`, `colour.neutral`, `colour.budget`; `scope`.

## Measured on crafting-ui (12 routes, in-system elements)

```
== text colours: 19 distinct over 4372 uses
  oklch(0 0 0 / 0.42) 1064 · oklch(0.13 0 0) 778 · oklch(0 0 0 / 0.62) 620 · rgb(31,58,95) 481 · oklch(0.506 0.289 264.8) 343
  oklch(0.987 0 0) 299 · rgb(47,100,240) 255 · rgb(62,62,72) 226 · oklab(0.13 0 0 / 0.75) 181 · rgb(207,63,117) 25 · rgb(43,43,51) 24 …
== backgrounds: 92 distinct over 852 uses     (58 of them on /stickers alone)
== border colours: 15 distinct over 867 uses
  oklch(0 0 0 / 0.12) 507 · oklch(0.506 0.289 264.8 / 0.55) 94 · oklch(0.13 0 0) 73 · oklch(0 0 0 / 0.32) 58 · oklch(0.506 0.289 264.8) 44 · rgb(47,100,240) 25 …
gradients: 136 (133 on /icons: the frosted-glass icon gallery; 3 on /motion/moments/apple-intention; 0 on every other route)
/motion/standards: 7 text colours, 7 backgrounds, 4 borders, 0 gradients, all token values
/motion:           7 text colours, 3 backgrounds, 4 borders
```

Source (`grep -rhoE "\b(text|bg|border|fill|stroke)-(\[[^]]+\]|[a-z]+(-[a-z0-9]+)*)" src --include='*.tsx'`):
`text-fg` ×199, `text-faint` ×167, `text-muted` ×148, `text-draw` ×116, `border-line` ×104, `fill-surface` ×90,
`border-line-strong` ×77, `bg-surface` ×65 … and the off-token tail: `bg-[#ffffff]` ×18, `text-[#ffffff]` ×15,
`bg-white` ×14, `bg-[#000000]` ×9, `border-white` ×7, `text-[#ffffffb2]` ×2, `text-[#55555C]` ×2,
`border-[rgba(0,0,0,0.08)]` ×2, `bg-[#F4F4F6]` ×2, `bg-[#0B0B0C]` ×2, 11 more singletons.

What that says: crafting-ui's UI colour is **already a role system** (three greys, one blue ink, one red, status),
and the drift is a tail of ~75 arbitrary whites/blacks/greys, most inside demo and specimen components. `rgb(47,100,
240)` ×255 is `src/motion/stickers.tsx:14` (`ink: '#2F64F0'`), a *second* blue 10° and 0.07 C off the draw blue: the
one real in-system hue question on this app (fold into `draw` at refine, keep at keep, since no token matches within
tolerance). The video's purple-gradient case does not occur here (0 gradients on UI routes); the e2e test for it
plants one in the fixture.

Distinct text colours on `/motion/standards`: **7**, all tokens. On the site: **19**, of which 9 are tokens, 2 are
content (sticker palettes), 8 are the arbitrary tail. The honest "before → after" on the site is 19 → 11 at keep
(the tail folds into tokens where within tolerance), 19 → 9 at refine (the second blue folds).

## The proposal algorithm

1. **Collect** the page's colours with their property, class and element; drop content (svg, canvas, images,
   excluded paths, imitation fingerprints).
2. **Convert** every colour to oklch over its ground (alpha composited against the element's painted ground, which
   craft-read's `ground` facts give) so `oklch(0 0 0 / 0.42)` on white and `#999` compare as what is seen.
3. **Role each token** (Theme above) and **each colour**: by property (text → text roles; background → surface roles
   unless the element is a control or badge, then accent/status; border → line roles), then by nearest token in
   oklch distance ΔE_ok = √(ΔL² + Δa² + Δb²).
4. **Tolerance** by scope: keep **0.03** (indistinguishable in UI: `#ffffff` → `oklch(100% 0 0)` is 0; `#F4F4F6` →
   `--bg-sunken oklch(97% 0 0)` is 0.012 → folds), refine **0.08** (the second blue: ΔE_ok ≈ 0.07 → folds into
   `draw`), new **any**, by role.
5. **Propose**, per place:
   - an arbitrary or default-palette class whose colour is within tolerance of a token → the token's utility
     (`bg-[#ffffff]` → `bg-surface`, `text-[#55555C]` → `text-muted` when the composited value is within tolerance);
   - a text colour at a fourth grey level (craft/grey-levels already finds it, `craft-rules.js:1372`) → the nearest
     of the three levels;
   - text faded by opacity → the grey level that matches (craft/text-opacity);
   - a hue beyond the budget (refine/new) → the nearest allowed ink, or `fg` if it is text carrying no meaning (not a
     link, not a status, not inside an accent control);
   - a gradient on a *surface* (a card, a panel, a page background: not a decorative figure) → the surface token
     (new; at refine only when the gradient's two stops are within tolerance of one token);
   - pure black or white on a page whose tokens are off-black/off-white (craft/pure-black-white) → the token.
6. **Tokens** (refine/new), before the class swaps: the neutral family's values at the direction's chroma and hue
   (bg, surface, sunken, line, line-strong, fg, muted, faint, each keeping its L and alpha, taking the hue and C of
   the row); the accent's C × factor; derived hover/pressed/soft. Written to the `:root` declarations crafting-ui's
   `@theme inline` aliases (`src/index.css:19–47`), one `token` write per value, in the same trace group.
7. **Contrast guard**: every text proposal is checked with APCA against its ground (craft/contrast's spec); a proposal
   that lowers contrast below the rule's threshold is replaced by the next darker/lighter level, or refused.
8. **Measure**: distinct text, background and border colours (composited, rounded to ΔE 0.01) on the page and the
   site, before → after; and the **area share** of neutral / accent / other hues (the 60-30-10 reading, shown as a
   bar, not a rule).

## What is written

- Class swaps at places (one `write`, group `cleanup-colour-<n>`, `step: 'Colour'`, laws `similarity`,
  `von-restorff`), and at refine/new the token values first (same group).
- Never: content colours, imitation places, anything without a locatable class, gradients at keep.

## Preview

Token changes preview as variables on `<html>` (direction.md §3): one recalc, the whole page. Class swaps preview as
inline `color`/`background-color` on the touched elements. The pink outline marks moved elements; the pointer shows
`#55555C → muted`.

## Laws

`similarity` (text that does the same job is the same grey; one accent means one meaning), `von-restorff` (the one
accent is noticed because nothing else is coloured), `cognitive-load` for the grey levels (laws.js maps
`craft/grey-levels` to similarity today; this pass adds `cleanup/colour` → `['similarity', 'von-restorff']`).

## The measure the panel shows

"**7 → 7** text colours on this page · **19 → 11** on the site · accent covers **4%** of the page". On crafting-ui the
page number barely moves; the site number does. That is the honest story and the panel should tell it, not hide the
page row.

## Pragmatic cut

**Build first:** steps 1–5 and 8 at scope keep: the arbitrary-class fold (`bg-[#ffffff]` → `bg-surface` and kin),
grey levels, text opacity, pure black/white. On an AI-made dashboard this is the pass that reads as "drained": purple
gradients and seven greys become three greys and one accent, and on crafting-ui it is the 75-place tail. Then step 6
(the neutral tint and accent chroma by the pad) at refine, which is one token write and the biggest *visible* move
for the least code.

**Deferred:** gradient folding on surfaces at refine (needs a "decorative vs surface" judgement; new only), dark
mode (`isDark` blocks in stylesheet.ts exist, the second value set per token is a second write), status hue
retuning, budget enforcement on *backgrounds* (badges and tags carry category hues on purpose; the video keeps its
coloured dots).

## E2E tests (each from crafting-ui's code, through the real CLI and Chromium)

| Test | Fixture | Asserts |
| --- | --- | --- |
| Arbitrary white folds to the surface token | a card with `bg-[#ffffff]` beside `bg-surface` cards, theme as `src/index.css` | `bg-[#ffffff] → bg-surface`; computed background unchanged (ΔE 0); distinct backgrounds 2 → 1 |
| A fourth grey folds | four text greys: fg, muted, faint and `text-[#55555C]` | the fourth → `text-muted`; APCA not lower than before |
| A second blue is kept at keep, folded at refine | `text-[#2F64F0]` (stickers.tsx's ink) beside `text-draw` | keep: listed "no colour of yours is near it"; refine: → `text-draw` |
| Content is left alone | the sticker palette swatches (`rgb(31,58,95)` on 481 elements inside svg) | 0 proposals; the measure excludes them |
| Gradient on a surface (the video's case) | a `bg-gradient-to-b from-purple-600 to-violet-900` panel in the fixture | keep: listed, not written; new: → `bg-surface`; History shows one "Colour" step |
| Tokens tint by the pad | direction refine, contrast −0.5, neutral tinted | the `:root` `--bg/--surface/--line` values gain the accent's hue at C 0.004; `@theme inline` untouched; Undo step restores all |
| Nothing to do says so | `/motion/standards` as is | "Your colours are already your own: nothing to do." and no Apply button |

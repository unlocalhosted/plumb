# Video rules: what two spacing videos teach that Plumber does not check yet

Status: proposals for the owner's review (2026-11-03). Nothing here is built. Source: the auto-generated English captions
of both videos (downloaded with yt-dlp; the picture was not available, see "What could not be verified").

Both videos are by the same creator, about one system (LiftKit, a spacing framework). Neither covers colour, icons
(beyond one button detail), motion or type scale. Everything below is spacing, with a little type-and-radius.

## The videos

### 1. The Secret Science of Perfect Spacing
Channel: Chainlift. URL: https://youtu.be/9ElrcTtAxzA (9:39).

- Space between a heading and its text has a comfort zone; too far and they stop reading as connected.
- Three laws: every element is related to every other; the stronger the relation, the closer they sit; the strength of
  relations is where information hierarchy comes from.
- What a relation is depends on content, not styling: a weather icon belongs with the temperature, the subheading
  (the city) is the weaker tie. Change the content and the layout of the card should change.
- Do not eyeball gaps; pick them from a preset scale. The method: label each neighbouring pair of elements by how
  strongly they relate, give the strongest pair the smallest preset, the next pair a bigger one, a new section the
  biggest. Order must be: tight pair < looser pair < new section.
- The margin is always taken from the larger of the two text elements and put on that element.
- On an exponential scale you rarely need to skip a level; skipping helps only at the small end (extra small, small).
- Equal padding is not optically equal: a card with the same pixels top and left shows extra air on top, because the
  line box is taller than the letters. Subtract that difference from the top padding.
- Quote: "always apply the margin to the bigger one".

### 2. LiftKit Spacing Explained (In Detail)
Channel: Chainlift. URL: https://www.youtube.com/watch?v=r1DANFZYJDw (10:30). Its description says the maths may be
outdated ("a living system"), so treat the numbers as one snapshot.

- Space should be relative (em/rem), not fixed pixels, so a layout keeps its proportions when someone raises the
  browser's default font size (the video shows the pixel version losing its proportions).
- The base unit is the root font size; all spacing is a multiple of it, even for image grids with no text.
- For text pairs, spacing is relative to the larger text's own font size (em), so one named step ("extra small")
  works for every title-plus-paragraph pair, instead of remembering a value for every combination of styles.
- Seven presets: medium = 1, each step up or down multiplies or divides by 1.618 (the golden ratio). Half and quarter
  steps (square root, fourth root of 1.618) fill gaps in the big end of the scale.
- Card padding recipe: let X be the largest font size in the card and H its line-height ratio. Left, right and bottom
  padding = X; top padding = X / H; the card's corner radius = the top padding.
- Buttons: an inline icon button should have the same visible space on all sides of its icon; iOS 17 and Material 3
  leave a little extra on the trailing end, and the creator corrects it (formulas shown on screen only).
- List items: margins in the same terms (top extra small, bottom small on the larger text); a one-text item uses extra
  small both sides.

## Teaching points and status

"Covered" names the rule and file:line; line numbers are in this worktree.

| # | Teaching point | Status | Where / what is missing |
| --- | --- | --- | --- |
| A1 | Stronger relation, closer together; inside < between | **Covered** | `hierarchy/S1` (docs/research/hierarchy.md:100); law of proximity (overlay/src/laws.js:22); `craft/inner-outer-spacing` (overlay/src/craft-rules.js:138) |
| A2 | Pick gaps from the scale, do not eyeball; half/quarter steps for in-between | **Covered** | `hierarchy/S3` (hierarchy.md:141); `craft/rhythm` (craft-rules.js:1395); the spacing pass snaps to the project's own steps (docs/briefs/pass-spacing.md) |
| A3 | Tab-link and table-cell padding belongs on the scale too | **Covered** | `hierarchy/S3`; `craft/button-padding` (craft-rules.js:507) |
| A4 | The subtitle sits nearer the title than the paragraph (order of pairs inside one card) | **Partly** | S1 compares group gaps by container; it does not compare the gaps between the text roles of one card (title/subtitle vs subtitle/body). Roles exist (T2, hierarchy.md:64). Missing: ordered check by role pair. See `hierarchy/S4` |
| A5 | Heading after a paragraph: space above > space below | **Partly** | S1 covers "between > inside" for containers, not a single heading's two sides. See `hierarchy/S6` |
| A6 | Heading-to-text has an upper limit; too far reads as unrelated | **New** | S1 only checks the order, never "too far". See `hierarchy/S4` |
| A7 | Margin is taken from the larger text of the pair, and sits on it | **New** | Nothing measures a gap against font size. Pass-spacing writes whichever property makes the distance (pass-spacing.md:33–36) but not "the larger element's". See `hierarchy/S4` |
| A8 | Same relation = same step regardless of text size (one value per relation, not per style pair) | **New** | S2 (hierarchy.md:128) compares px between siblings; two cards with different type sizes and the same px gap pass. See `hierarchy/S4` |
| A9 | Relation scale is a ratio (about 1.6x per step); levels sit a ratio apart | **New** (tension) | S1 asks "at least one step apart" on a linear 4px scale. See `hierarchy/S5` and the contradictions section |
| A10 | Relations depend on meaning (icon with value, not with label) | **New, not proposed** | Needs content meaning. Cannot be measured from styles and rects; at most a judged advisory (`judge: true` exists, craft-rules.js:1434) |
| A11 | Spacing in em/rem, not px, so it follows the user's font size | **New** | No rule reads px against rem. See `craft/relative-spacing` |
| A12 | Optical correction of top padding (line box is taller than the letters) | **Partly** | `craft/trim-leading` (craft-rules.js:1320) does it for one line of words with a background or border; it returns early when the element has children (line 1323), so a card with a title, body and image is never checked. See `craft/card-optical-padding` |
| A13 | Card padding recipe: sides and bottom = largest font size X; top = X / H | **Partly** | Same gap as A12; the X-sized padding is one creator's taste (see confidence) |
| A14 | Card radius = top padding | **New** | `craft/concentric-radius` (craft-rules.js:80) handles inner vs outer only. Low confidence; folded into `craft/card-optical-padding` as an advisory |
| A15 | Inline icon button: equal visible space on all sides; trailing extra space corrected | **Partly** | `craft/icon-side` (craft-rules.js:534) and `craft/optical-centre` (craft-rules.js:1432) cover side padding and icon weight. The video's formulas were on screen only, so no new rule is proposed |

Count: 15 points. **Covered 3** (A1–A3). **Partly covered 5** (A4, A5, A12, A13, A15). **New 7** (A6–A11, A14); of the
new, one (A10) cannot be measured and is not proposed.

## Rule proposals

Notation: "larger text" = the text element with the bigger computed `font-size` of two adjacent text blocks (leaf
elements whose own text node is rendered, from the existing `facts.text`). "Gap" = `b.top − a.bottom` of the two
rects (horizontal: `left − right`). Em ratio `r` = gap / larger text's `font-size`.

### hierarchy/S4. A pair of texts is spaced in em of the larger one
Covers A4, A6, A7, A8.

- **Checks.** Two stacked text elements in one container: the gap, measured in the larger text's font size, falls in a
  band for how strongly they relate, and the bands go up as the relation weakens. Same relation, same ratio, whatever
  the text size.
- **Measure.** For each adjacent text pair in DOM order inside one container (roles from T2): `r = gap /
  max(fontSize)`. The scale the video uses (medium = 1em, steps of 1.618; the table was on screen, I derived the
  values from the stated rule) gives: tight pair 0.236 to 0.5em (extra-small is 0.382); looser pair 0.5 to 1em
  (small 0.618, medium 1); new section 1.618em and up. Flags:
  1. Order broken: `r(title, subtitle) ≥ r(subtitle, body)` (tolerance 0.1em).
  2. Too far: any pair inside one card with `r > 1.0` (heading detached from its text).
  3. Too tight: a title/body pair with `r < 0.15`.
  4. Inconsistent: across cousins (same role pair in sibling cards) `r` differs by more than 0.15em even though the px
     gap is equal (the sizes differ, so the px hide it).
- **Fix.** Name the nearest project spacing step to `r × larger font-size` and put it on the larger element as a
  margin (class where the usage has one). The spacing pass already refuses places without a class
  (pass-spacing.md:33–36), so the same refusal applies. The px step wins over writing em unless the project already uses em.
- **Law.** Proximity (existing). Flag 4 also similarity (existing). Add to `RULE_LAWS` in laws.js:
  `'hierarchy/S4': ['proximity', 'similarity']`.
- **Pass.** Spacing (needs the type pass's roles first).
- **Confidence.** The direction (stronger relation, closer) is a widely held principle. The exact bands are one
  creator's scale; the density table already lands inside them (see "Checked against the density table"). Use the
  bands as warnings, not as a target; flags 1 and 2 are the strong ones.

### hierarchy/S5. Levels are a ratio apart, not one fixed step apart
Covers A9.

- **Checks.** Inside gap vs between gap: the larger is at least 1.5 times the smaller (a rounded golden ratio). Between
  and around may stay equal (Q2 in hierarchy.md:241 keeps "≤").
- **Measure.** From S1's already computed levels: `between / inside ≥ 1.5`. For 4px steps, 4 → 8 passes, 12 → 16 does
  not (1.33).
- **Fix.** Move the between gap up to the nearest step at or above `1.5 × inside` or the inside down; the smaller change
  wins (same rule as S1 step 4 of un-sloppify).
- **Law.** Proximity.
- **Pass.** Spacing.
- **Confidence.** Medium. A ratio between levels is common practice (modular scales); 1.5 vs 1.618 is taste. The
  video's own reason (steps grow, so adjacent steps are enough at large sizes) is why the flag is only on inside vs
  between, where a 4px step is a big jump.

### hierarchy/S6. A heading sits nearer what it introduces
Covers A5.

- **Checks.** For a heading (T2 role title or headline) that has text before and after it in the same container:
  space above > space below.
- **Measure.** `above = heading.top − previous.bottom`, `below = next.top − heading.bottom`; flag `above ≤ below × 1.25`
  (needs at least 1.25 times). If the heading is first in its container, skip.
- **Fix.** Raise the margin above or lower the margin below to the nearest step; the heading's own margin-bottom
  usually carries it.
- **Law.** Proximity, common region.
- **Pass.** Spacing.
- **Confidence.** High. A near-universal typographic rule (a heading belongs to what follows); the 1.25 threshold is
  mine.

### craft/relative-spacing. Spacing follows the user's font size
Covers A11.

> **Not built (2026-11-03).** Built, then removed: every arbitrary `[…px]` spacing class is already Blueprint's drift
> finding, whose fix (the theme's step, in rem) also makes the space grow with the text, so the rule gave the same
> class a second verdict. A rule here would only add something for inline-style px, which nothing writes.

- **Checks.** Padding, margin and gap written in fixed pixels do not grow when the person raises the browser's default
  font size, so the layout loses its proportions while the text grows.
- **Measure.** Computed styles are always px, so compare: with the root `font-size` raised from 16 to 24 in a
  scratch measure (set `document.documentElement.style.fontSize`, re-read a container's paddings and gaps, put it
  back), a rem/em value scales by 1.5 and a px value does not. Flag containers that hold text whose paddings or gaps
  stay put (±0.5px) while their text grew. Cheaper alternative with no reflow: `utility()` already finds the class
  (craft-read.js); flag arbitrary `[…px]` spacing and inline `style` px on spacing properties.
- **Fix.** Use the project's scale class (Tailwind's spacing classes are rem-based) or the same value in rem
  (`px / 16`).
- **Law.** None in laws.js (it is accessibility, like the contrast rules, which map to `[]`). Keep `[]`.
- **Pass.** Spacing (writes rem for the px values it replaces).
- **Confidence.** High that people raise font size (WCAG 1.4.4 resizing text, and the browser setting); low urgency for
  tools already on Tailwind's rem scale. Risky side: a design that deliberately fixes some spacing in px (hairlines,
  icon padding) must be excluded; limit to padding, gap and margin of containers that hold text.

### craft/card-optical-padding. A card's padding is measured from the letters
Covers A12, A13, A14.

- **Checks.** In a card (container with padding plus a radius or border or background) whose first child is text, the
  space from the card's top edge to the top of the first line's capital letters is about the same as the space from
  the left edge to the first letter. The line box is taller than the letters, so equal padding shows extra air on top.
  Extends `craft/trim-leading` to multi-line and multi-child cards.
- **Measure.** Use `facts.metrics` (halfLeading, ascent, capHeight, as `craft/trim-leading` does at craft-rules.js:1331).
  `visualTop = paddingTop + halfLeading + (ascent − capHeight)` of the first text; `visualLeft = paddingLeft`. Flag
  when `visualTop − visualLeft ≥ 3px` and `≥ 15%` of the left padding. Advisory second check (A14): card radius vs top
  padding; show only, never flag (video: radius = top padding).
- **Fix.** Lower `padding-top` by the difference (nearest step down) or `text-box: trim-both cap alphabetic` on the
  first text (what trim-leading already suggests).
- **Law.** None (optical craft, like `craft/trim-leading` mapped to `[]`); alternatively aesthetic-usability, but
  naming it would stretch it.
- **Pass.** Spacing.
- **Confidence.** Optical correction: widely held among designers; measurement is sound. The X and X/H recipe and
  radius = top padding: one creator's taste; do not enforce, and do not write the recipe's numbers.

## Checked against the density table

Direction §2.1 (docs/research/direction.md:64). At density 0 the table gives inside 4–8, between 16, around 20–24,
section 40 (px, 16px body text). In ems of a 16px body: 0.25–0.5, 1, 1.25–1.5, 2.5. These sit inside the video's bands
(extra small 0.38, medium 1, large 1.6). So the table and the video agree.

## Contradictions and tensions (flagged)

1. **Linear px steps vs a ratio scale.** The density table and S1 use multiples of a 4px base ("at least one step
   apart"). The video uses an exponential scale. At density 0 the table's between → around step is 16 → 20 (1.25x), at
   −0.5 it is 20 → 24 (1.2x), at +0.5 it is 12 → 16 (1.33x), at −1 and +1 it is 24 → 32 (1.33x) and 8 → 12 (1.5x). By
   a 1.5x rule these are too close. Not a contradiction in the table, because S1 allows `between ≤ around`; but
   S5 as proposed applies only to inside vs between (where the table has 2x or better in every row), to avoid it.
2. **px values vs relative units.** The density table says "values are in px for a 4px base" while the video says px
   spacing is wrong. They agree if the px are written as the project's rem-based steps (crafting-ui uses
   `--spacing: 0.25rem`). Nothing to change; but the spacing pass must never write a literal px (see
   `craft/relative-spacing`).
3. **Same px for different text sizes.** Pass-spacing treats a distance as a rhythm step regardless of the text next
   to it (pass-spacing.md:13–20 (lessons table)). The video says the right gap for a pair grows with its larger text. S4 flag 4 can fire
   on places the spacing pass would call consistent. Resolution: S4 reports; the pass keeps its px step unless the
   owner decides em wins.
4. **Exponential scale vs "no skipping".** The video says skip a level at the small end; Plumber's un-sloppify moves "the
   smaller change" and never skips. No conflict for checks, only a note for the preset picker.

## What could not be verified

- Captions are auto-generated English (`en`, `en-orig`); every number above comes from them. They are garbled in one
  place: the half-step and quarter-step factors ("five a half step…"). I took them as the square root and the fourth
  root of 1.618 (1.272, 1.128), which matches the caption's "1.128".
- The seven-preset table (medium = 1, ÷/× 1.618) was shown on screen; I derived its values from the narration, not from the picture.
- The button formulas and the list-item formulas were shown as CSS on screen; the narration does not give them. No frames
  were read: the video download returned HTTP 403, so A15 has no numbers and no rule is proposed for it.
- The "comfort zone" gap between a heading and its text is given in the captions only loosely ("about 1 to 1.25 times
  the heading height", garbled); S4's 1.0em upper bound is my reading of it.
- No rule here has been run against crafting-ui or any page. The thresholds are starting values to tune against the fixtures.

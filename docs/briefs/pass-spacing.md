# Pass: spacing

LLD for the clean-up runner's second pass (docs/briefs/page-cleanup.md: type, spacing, colour, icons), parameterized
by the direction (docs/research/direction.md §2.1, §4). Nothing here is built. Every number from crafting-ui was
measured read-only with `scratchpad/measure/probe.mjs` (one headless Chrome, 12 routes, 1280×800) or grepped from its
source; the command is quoted with each.

## What it does, in one sentence

Puts every gap, padding and stack on this page onto the app's rhythm at the level the direction says (inside < between
≤ around), without evening out deliberate grouping, writing only where a class actually sets the distance.

## Lessons it carries (from docs/qa/timeline-crafting-ui.md and page-cleanup.md)

| Lesson | Where it came from | What this pass does about it |
| --- | --- | --- |
| A page must not propose its own system | `/stickers` vs `/motion/standards` ladders (page-cleanup.md problem 1) | The rhythm (the steps the app keeps to) comes from the project census, not this page; the page only says which of its places move |
| Tidy evened out deliberate grouping | QA issue 7: `aside` 8/8/20 → 8 | A stack whose distances form two clusters, where the larger sits between runs of ≥ 2 children, is **grouped**; its two values are two levels (inside, between) and are kept |
| A write that lands nowhere | QA issue 8: `gap-2` on a `display: block` aside | `gap` is written only on a flex/grid container; a margin-driven distance is written as the child's own margin class; a distance from a stylesheet, `var(--z)` or `clamp()` is refused |
| Refuse, don't guess | QA issue 12, changes.ts `locate` | A place is written only when the class that sets the distance is found at the stamp's usage (`utility(el, 'gap')` in craft-read.js); otherwise listed as "left as is" with the reason |
| A pass that adds values is not offered | page-cleanup.md "Measure each layer" | At scope keep, every target is a value the app already keeps to; distinct values after ≤ before, or the pass is skipped |
| Optical nudges are not drift | `label pt-[5px]` on `/motion/standards` (QA "Go back to here" row), `pt-[5px]` ×8 and `pt-[3px]` ×7 in source | A padding of 1–5px on one side of a text element whose siblings are larger text is a baseline nudge (craft/baseline-align's domain): kept, counted as "optical" |

## Inputs

### Page (read in one pass, the runner's census for this layer)

For every stamped element not inside `plumb-overlay` and not under `config.system.exclude`:

- `display`, `flex-direction`, `row-gap`, `column-gap`, the four paddings, the four margins (computed).
- Its children's rects (position: absolute excluded) → the child-to-child distances along the container's axis
  (`rect.top − previous.bottom`, or left − right), for flex, grid **and block** containers (the aside in QA 7 was
  block: its distances came from the children's margins).
- For each distance, which property makes it: the container's gap (flex/grid with gap ≥ the distance), the next
  child's `margin-top`/`margin-left`, the previous child's bottom/right margin, or none found (then: refused).
- The class at the usage that sets that property, through `utility(el, prefix)` (craft-read.js), or none.
- The container's role in the hierarchy vocabulary (hierarchy.md): list item, card (padding + radius/border/bg),
  section, flow box; its depth.

### Project (census v2)

`src/census.ts` gains a `boxes` list beside `entries`: per stamped container, `{ stamp, display, gap, padding: [t,r,b,l],
inside: [distances], kids, route }`. Read on every route the way `entries` is, kept under the cache, stale by file
hash like `entries` (`src/census.ts:78–94`). From it the engine derives the **rhythm**: the clusters of distances that
together cover the project (craft/rhythm's own method, `craft-rules.js:1405–1410`, moved from page to project).

### Theme

The spacing base and whether the project owns it (`src/decisions/spacing.ts` `numericSpacing`: `own`, `reset`, `unit`),
named spacing tokens if any.

### Direction

`density` → the level table (direction.md §2.1): target sizes for inside, between, around, section. `scope` → which
targets are allowed (keep: the app's rhythm only; refine/new: the table's values, snapped to the base).

## Measured on crafting-ui (12 routes)

```
cd scratchpad/measure && PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node probe.mjs
# then python3 -I summarise (see raw.json)
== gaps: 20 distinct over 2142 uses
  12 380 · 4 354 · 20 318 · 8 317 · 0 272 · 6 219 · 16 87 · 10 80 · 24 54 · 32 16 · 40 12 · 2 6 · 64 5 · 14 5 · 1 5 · 48 4 · 14.4 3 · 4.8 3 · 7.6 1 · 80 1
== padding sides: 28 distinct over 4440 uses
  4 899 · 8 660 · 16 561 · 12 443 · 2 407 · 10 391 · 6 327 · 20 153 · 28 126 · 5 115 · 32 97 · 18 46 · 24 38 · 3 38 · 64 33 · 40 29 · 14 24 · 22 24 …
/motion/standards: gaps {0:54, 6:16, 8:62, 10:8, 12:35, 14:4, 16:5, 20:8, 24:19, 32:3, 80:1}   11 distinct
                   pads {2:50, 3:18, 4:146, 5:91, 6:50, 8:152, 10:40, 12:120, 28:1, 32:16, 40:2, 64:19}   12 distinct
/stickers:         gaps {0:1, 8:92, 12:75, 16:3, 20:2, 24:1, 32:1, 40:8}   8 distinct
/motion:           gaps {4:103, 20:96, 12:20, 24:7, 8:5, 6:4, 40:4, 64:2, …}   13 distinct
```

Reading it against Tailwind's numeric scale (whole steps 4n, and the half steps 2, 6, 10, 14):

- **On the rhythm**: 12, 4, 20, 8, 6, 16, 10, 24, 32, 40 cover 2,081 of 2,142 gap uses (97%). The app's rhythm is
  4/8/12/20 with 6 and 10 as half steps (source: `gap-2` ×121, `gap-3` ×112, `gap-4` ×62, `gap-1.5` ×56, `gap-1` ×55,
  `gap-6` ×54, `gap-5` ×43, `gap-2.5` ×24: `grep -rhoE "\b(gap|gap-x|gap-y|space-y|space-x)-[0-9a-z.]+" src --include='*.tsx'`).
- **Off the scale, gaps**: 14.4 ×3, 4.8 ×3, 7.6 ×1, 1 ×5 (all on `/`: `gap-[1cqw]` ×2, `gap-[6px]` ×2 in source; the
  cqw ones are container-query sizes, refused). **7 uses out of 2,142.** The gap problem on crafting-ui is not
  off-scale values; it is *levels*: 11 distinct gaps on one page.
- **Off the scale, padding**: 5 ×115, 18 ×46, 3 ×38, 22 ×24, and 14.4/4.8-class values from `--z` drawings. Of these,
  `pt-[5px]` ×8 and `pt-[3px]` ×7 at `MotionStandardsPage.tsx:79, 82, 94, 109, 126` are label baseline nudges beside
  17–19px text (kept as optical); `18`/`22` are `ScoreReader.tsx:207:13` (`py-[18px]` ×1 in source, a drawing); 236
  uses of 10 at `VocabularyPage.tsx:147:38` are `p-2.5`, on the scale.
- **Margin-driven stacks** were not read by this probe (flex/grid only), which is why it found 0 uneven stacks; the QA's
  `aside` (eyebrow, h2 `mt-2`, p `mt-2`, nav `mt-5`: 8/8/20) is the real case and the fixture below reproduces it.
- Levels on `/motion` are right where the code is deliberate: rows `gap-y-1` (4) inside, `py-4` (32 row to row)
  between, `gap-10` (40) around (hierarchy.md S1 example). The pass's job on such a page is zero changes, and it must
  say so.

So on crafting-ui the honest numbers for the runner's "before" are: **11 gap sizes and 12 padding sizes on
`/motion/standards`**, of which the pass at scope keep can move the ones at the wrong level, not the ones off a grid.

## The proposal algorithm

1. **Collect** the page's distances as above; drop containers under `config.system.exclude`, inside `<svg>`, with a
   running animation, or scaled by `var(--z)` (hierarchy.md "never touch").
2. **Classify** each distance by structure, the hierarchy vocabulary:
   - *inside*: between an element and its qualifier (title → subtitle, label → value, icon → text): the children are
     different levels (T1) or the container is a leaf row.
   - *between*: between same-kind siblings (rows of a list, cards of a grid, paragraphs): cousins share bundles (T3).
   - *around*: the container's padding, and its distance to its own siblings.
   - *section*: the distance between landmarks (`section`, `article`, `nav`, `header` children of `main`).
3. **Group the equal**: distances from one stamp across its instances must agree (they do, by construction, unless a
   `className` prop varies); cousins at the same index across sibling containers are one group.
4. **Detect deliberate grouping** before anything else: in a stack with ≥ 3 distances, cluster them (1px tolerance).
   Two clusters where every larger distance separates runs of ≥ 2 children → *grouped*: the small cluster is
   `inside`, the large is `between`. Three or more clusters, or a large distance that separates single children
   unevenly → *uneven* (S2 applies to the small cluster only).
5. **Targets** per level from the direction (density row), snapped to the rhythm: at scope keep, the nearest rhythm
   step in the level's band (inside: steps ≤ the between step; between: steps between inside and around); at
   refine/new, the table's value snapped to the base.
6. **Propose**, in order, the smaller change first (hierarchy.md "Un-sloppify" step 4):
   - a distance off the rhythm (not within 0.5px of any rhythm step) → the nearest rhythm step at its level;
   - inside ≥ between in one container → lower the inside to the next step down (never raise between: the row's
     rhythm is the anchor);
   - between ≥ around → raise the around (padding) to between's step, or lower between, whichever moves fewer places;
   - S2 uneven: the minority distances in the small cluster → the cluster's modal step;
   - `section` distances off the section target by more than one step → the target (refine/new only).
   Each proposal names its rule (`hierarchy/S1`, `S2`, `S3`, `craft/rhythm`) and law.
7. **Locate the write** for each proposal: the class that sets the property at the stamp's usage, resolved through
   fibers for a class passed as a prop (QA fix 2). Gap → `gap-*`/`gap-x-*`/`gap-y-*` on the container (flex/grid
   only); margin → `mt-*`/`ml-*`… on the child whose margin makes the distance; padding → `p*-*` on the container.
   Space-between utilities (`space-y-*`) are treated as the container's margin rule. No class found, or the value
   comes from a stylesheet, an inline style, `clamp()`, `cqw`, or `var(--z)` → **refused**, listed with the reason.
8. **Measure**: distinct gap values, distinct padding values, on the page and in the project (census v2), before →
   after. At scope keep, after > before anywhere → the pass is not offered ("Your spacing is already on your scale:
   nothing to do.").
9. **Optical**: a 1–5px padding on one side of a text element among larger text is listed under "kept: optical
   alignment", never proposed.

## What is written

- Class swaps at places, one `write` POST, tagged `trace: { group: 'cleanup-spacing-<n>', meta: { step: 'Spacing',
  laws: ['proximity', 'common-region', 'similarity'] } }` (page-cleanup.md "The runner").
- At scope ≥ refine, before the swaps: the body/list line-height tokens if density changed them
  (`--text-body-large--line-height` etc., the type pass's own tokens, so this pass writes them only when the type
  pass was skipped). Never `--spacing` (direction.md §2.1; open decision 2).
- Nothing on elements the hierarchy says never to touch; nothing added or removed.

## Preview

The runner's convention: the panel shrinks to one line, "Previewing 14 changes · Hold Space to compare", each moved
distance drawn as a pink hairline between the two edges with its value only at the pointer (memory: visual, not
labels). Preview applies inline `gap`/`margin`/`padding` to the touched elements only, batched in one frame, reads
before writes.

## Laws

`proximity` (inside < between), `common-region` (padding ≥ between keeps the group inside its boundary), `similarity`
(S2: same-kind siblings the same distance apart). laws.js already maps `hierarchy/S1`, `S2`, `S3` and `craft/rhythm`.

## The measure the panel shows

"**11 → 7** gap sizes on this page · **20 → 14** on the site · **14** gaps move". Numbers count distinct computed values
among the pass's own population (gaps and paddings of containers in the system), the same population before and after.

## Pragmatic cut

**Build first (the video's return):** steps 1–8 for *gaps and margins in vertical stacks and lists* at scope keep,
with grouping detection and the write locator. That is the part Tidy got wrong and the part that reads as "rhythm" in
the video's second row (the measured 26/44/46/30/38px rail collapsing to 16/24/36/18/32). Padding levels (S3) and the
section target come second: on crafting-ui padding is 12 distinct on a page but almost all on the scale, so the
visible return is smaller.

**Deferred:** horizontal distances in rows (icon–text gaps are the icon pass's business), `space-*` utilities,
`--spacing` at scope new, the density row's control padding (a component-level change), and anything in
`config.system.exclude`.

## E2E tests (each a real crafting-ui case, run through the real CLI and Chromium like e2e/census.test.mjs)

| Test | Fixture (from crafting-ui's code) | Asserts |
| --- | --- | --- |
| Grouping is kept | the `aside` from `MotionStandardsPage.tsx`: eyebrow, `h2 mt-2`, `p mt-2`, `nav mt-5` (8/8/20) | the proposal lists 0 changes for the aside and names it "grouped: 2 levels"; the file is unchanged after Apply |
| A write lands where the distance is | the same aside (block) with the `p` at `mt-[7px]` | the write is `mt-[7px] → mt-2` on the `p`, never `gap-*` on the aside; computed distance after = 8px |
| One rhythm for the site | the census fixture (`fixtures/crafting-ui-standards` + a second page with `gap-[18px]` lists) | both pages are proposed the same step (16 or 20, the site's rhythm), not each its own |
| Refuse, don't guess | a row whose gap is `gap-[1cqw]` (from `/`) and one from a stylesheet | both listed under "left as is" with the reason; nothing written |
| Optical nudge kept | `dt.label pt-[5px]` beside 17px text (`MotionStandardsPage.tsx:79`) | not proposed; listed as "kept: lines up the label" |
| No pass that adds a value | a page already on its rhythm (`/motion`'s lesson rows) | the pass says there is nothing to do; distinct counts equal before and after |
| One step, undoable | three gap swaps on one page | History shows one "Spacing" segment, three ticks, law of proximity on the pill; Undo step restores the file byte for byte |

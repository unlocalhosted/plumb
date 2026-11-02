# Hierarchy: the rules an editor marks and un-sloppify applies

Status: rules for the owner's review (2026-11-02), before `overlay/src/hierarchy.js` is built. Hierarchy shows as
marks on the scale (the step that fits the context; steps that would break the order dimmed; never enforced).
Un-sloppify previews every change on a card and one Use writes all, with one Undo.

Every example below was measured on crafting-ui (localhost:5180, read-only) with one Playwright probe over `/motion`
and `/`: for every `li / article / section / aside / header / [class*=rounded]` container with 2–12 text
descendants, the container's display, radius, padding and gap, its children's gaps, left edges and radii, the gaps
between the container and its siblings, the parent's display and grid tracks, and each text's computed size,
line-height, letter-spacing, weight, case, colour and y. Raw output: 271 lines, in the appendix.

## Vocabulary

- **Container**: the nearest ancestor that groups its children: a list item, article, section, a card (padding and a
  radius or a border), or a flex/grid box. Containers nest; **depth** is how many enclose an element.
- **Group**: the children of one container. **Peers** of an element: its siblings and its cousins (the children of
  sibling containers at the same depth, e.g. the other lesson rows' spans).
- **Level**: a rung of a scale (type roles: display > headline > title > body > label; spacing: the theme's steps).
- **Fits**: the step the context calls for. **Breaks the order**: a step that would invert or flatten a level
  relation that the group currently keeps.

## TYPE

### T1. Reading order within a container

**Rule.** Within a container, the text elements fall into levels by role — title > subtitle > body > meta/label —
and the levels are strictly ordered in size, or at equal size in weight, by at least one step of the theme's scale.
Elements at the same level share the same bundle (size, weight, leading, tracking, case).

**Reason.** The reader scans a card top-down and left-right; the eye lands on the largest and heaviest text first
and reads the rest as its qualifiers. Two levels one pixel apart read as a mistake, not a hierarchy; equal levels
with different bundles read as two kinds of thing.

**Measurement.** For each container: the text descendants in DOM order with computed `font-size`, `font-weight`,
`line-height`, `letter-spacing`, `text-transform`, `color`; role per element from the role inference (type roles,
layer 2: size band + weight + caps) confirmed by its peers (see T2). Levels present = distinct roles. For each pair
of adjacent levels: `size(upper) ≥ size(lower) + one step` on the project's type scale, or `size equal and
weight(upper) ≥ weight(lower) + 100`. For each level: all members' bundles equal.

**Example (keeps the order).** `/motion`, lesson row `src/pages/MotionIndexPage.tsx:78:13` (`<li>`):
```
<span> :80:17  17/23.38/-0.17/600  oklch(0.13 0 0)        “Saar Oz”                  title       (title-medium)
<span> :82:19  17/23.38/0/500      oklch(0.13 0 0)        “Nobody Tells This To …”   subtitle    (same size, one weight step down)
<span> :83:19  15/24.38/0/400      oklch(0 0 0 / 0.62)    “Make the meaning into …”  body        (two sizes down, muted)
<span> :85:17  11/16.5/0.88/400 CAPS oklch(0.506 0.289 264.8) “sequence · 1:45 →”  meta/label  (label-small, caps, accent)
```
Four levels, each at least a step apart (17/600 → 17/500 → 15/400 → 11/400 caps), identical across the four rows
(`Apple`, `OpenAI`, `Webflow` rows read the same bundles). The principle rows (`:100:13`) keep three of the same
levels (title 17/600, body 15/400, label 11 caps).

**Example (breaks it, measured).** `/motion`, the site header `src/components/SiteHeader.tsx:81:5`: the four
section links are `11/400 caps` (`:49:13`) while the sub-navigation beside them (`router.tsx:43:5`, "Lessons",
"Principles"…) and the current section name (`:94:29`) are `12/400 caps`. Two label levels one pixel apart in one
row: the probe flags "later text larger than the first: 12/400 ×6". Either both are one label level (same size),
or the current section is a step up (label-medium vs label-small is 11 → 12, which *is* one theme step: this case
is the boundary the owner must rule on, see Q1).

**What fits / breaks (for the editor's marks).** For a text element at level L in a container whose other levels
are known: the step that fits is its level's bundle (what its peers at L use); steps that break the order are any
size ≥ the next level up's size, any size ≤ the next level down's size, and at equal size any weight that crosses
a neighbour's weight. Dim those; mark the fit.

### T2. Role from peers, not from tag

**Rule.** An element's role is inferred from its peers and position, not from its tag alone: the first text of a
card at the largest/heaviest bundle is the title; a sibling at the same size and lighter is the subtitle; longer
text at a smaller size is body; small caps or small muted text is meta. A `<span>` can be a title; an `<h2>` that
is the smallest text in its card is not one.

**Reason.** crafting-ui's cards are spans and links (`MotionIndexPage.tsx:80–85` are four `<span>`s inside a
`<Link>`); tags carry no hierarchy there. The reader does not see tags.

**Measurement.** Within the container: DOM order, size, weight, colour (muted = alpha < 0.7 or a `text-muted`/
`text-faint` token), case, length (sentence vs phrase vs number), and the cousins' bundles at the same DOM index in
sibling containers (a row's third span is body in every row). Role = the type-roles band of the bundle, moved up or
down one level when the peers at that index disagree with the band (e.g. a 17/500 subtitle is in title-medium's
band by size but sits second to a 17/600 in every row: subtitle).

**Example.** The four `/motion` lesson rows: index 0 = 17/600 in all four → title; index 1 = 17/500 in all four →
subtitle (not a second title); index 2 = 15/400 muted → body; index 3 = 11 caps accent → label. The `<h2>
Principles` at `:95:11` (24/500) is the section's headline above the rows, a level above every row title.

### T3. Same level, same values across peers

**Rule.** Elements at the same level across sibling containers (every row's title, every card's meta) share one
bundle exactly.

**Reason.** A row whose title is 16 px among rows at 17 px reads as a different kind of row.

**Measurement.** Group cousins by (container index, role); compare bundles; any member off the group's modal bundle
is the sloppy one.

**Example.** The principle rows: `:102:17` 17/600, `:103:17` 15/400, `:104:17` 11 caps — identical across the three
rows. (No violation found on `/motion`; the fixture for the engine's test will plant one: a third card whose title is
`text-[1rem]` among `text-[1.0625rem]` titles.)

## SPACE

### S1. Proximity: inside < between < around

**Rule.** The space inside a group (between an element and its own qualifiers: title to subtitle, label to value)
is smaller than the space between groups (row to row, card to card), which is smaller than or equal to the
container's padding (the space around the group). Each is a step of the spacing scale, and the three are at least
one step apart.

**Reason.** Proximity is how people read grouping (Gestalt): what is closer belongs together. If the gap inside a
row equals the gap between rows, the rows dissolve into one list of lines. (The owner may prefer the inverse
reading — padding ≤ between — for dense tables; see Q2.)

**Measurement.** For a container: `gap` / child-to-child distances (`rect.top − previous.bottom`, horizontally
`left − previous.right`) inside; the container's own `padding`; the distances between the container and its
siblings (between). Map each to the nearest spacing step (`--spacing` × n on crafting-ui: 4 px base). Check
`inside < between ≤ around`, each a step apart.

**Example.** `/motion` lesson rows: inside the row, `gap-y-1` (4 px) between name and subtitle, `gap-x-6` (24 px)
between the three columns; between rows, `py-4` on each Link makes 32 px row to row (the `<li>`s touch: the probe
measured `between [0,0,0]` on the `<li>` and the spacing lives on the Link's padding); around, the section's
`gap-10` (40 px) to the next block and the page's `px-[clamp(1rem,4vw,2.5rem)]`. 4 < 24 < 32 < 40: four levels,
each a step up. The SwipeToDismiss demo card (`src/demos/SwipeToDismissDemo.tsx:519:17`) has padding 28.8 and
`gap 28.8px` inside: inside = around, which the rule marks (it is a drawing scaled by `--z`, so it is outside the
system, see "never touch").

**What fits / breaks.** For a gap inside a group, the fit is the step the group's other inside gaps use (modal
step); steps ≥ the between-level break; for a between gap, steps ≤ the inside level or > the around level break;
for padding, steps < the between level break.

### S2. Consistent gaps within a group

**Rule.** Children of one container that are the same kind (rows, cards, columns) are the same distance apart.

**Reason.** An uneven list looks edited by hand; the reader hunts for a meaning in the difference that is not there.

**Measurement.** Child-to-child distances along the container's axis; a group with ≥ 3 children whose distances
are not one value (within 1 px) is uneven; the fit is the modal distance's step.

**Example.** No uneven list among `/motion`'s cards (the lesson and principle rows are `gap-x-6 gap-y-1` grids).
The probe's "gaps differ: −39, −25, −12" on `SwipeToDismissDemo.tsx:505:17` is a stack of overlapping cards (an
animation), not a list: negative distances are overlap and are excluded from S2.

### S3. Padding and gap sit on the scale, at levels

**Rule.** A container's padding and gap are steps of the spacing scale, and padding is at or above the gap's level
(S1). A value between steps is drift (the provenance rule already says so); a value on the scale but at the wrong
level is a hierarchy mark (new here).

**Measurement.** Padding and gap → nearest step; the level relation from S1.

**Example.** `MotionIndexPage.tsx:38` `pt-7 pb-16` (28 / 64 px), `:41` `gap-10` (40), `:42` `gap-6` (24), `:79`
`py-4` (16) with `gap-x-6 gap-y-1`: all on the 4 px scale; levels 4 (inside) < 16 (row) < 24 (column) < 40
(section).

## LAYOUT

### L1. Nesting depth and containers

**Rule.** The depth of nesting is itself a level: a card inside a section inside the page. Each enclosing container
adds one level of space (its padding) and may add one level of type (its own title). More than three levels of
titled containers under a page title is a sign the structure, not the values, is sloppy.

**Measurement.** Walk ancestors; count those that are containers (padding + border/radius/background, or list
item/article/section); record each one's title (its largest text) and padding step.

**Example.** `/motion`: page `<main>` (`px-[clamp…] pt-7 pb-16`) → section `:93:7` (headline 24/500) → row `<li>`
(title 17/600). Three levels, each with its own space and type level.

### L2. Concentric radius

**Rule.** An element inside a rounded container, inset by the container's padding, has `inner radius = outer radius
− padding` (clamped at 0); a nested element at the container's edge shares its radius. (This is the existing craft
rule `concentric corners` in `overlay/src/craft*.js`; hierarchy reuses it, it does not restate it.)

**Reason.** Concentric curves share a centre; otherwise the inner corner looks thicker on one side.

**Measurement.** Container radius and padding (computed), the inner element's radius and its inset from the
container edge.

**Example.** `src/demos/SwipeToDismissDemo.tsx:519:17`: outer radius 48, padding 28.8, inner badge radius 24.
Concentric would be 48 − 28.8 ≈ 19 (the nearest radius step). Measured 24: a mark (inside a drawing scaled by
`--z`, so excluded from un-sloppify; a fixture card will carry the same shape at theme sizes).

**What fits / breaks.** The fit is the step nearest `outer − padding`; steps above the outer radius break.

### L3. Alignment within a group

**Rule.** Children of a group share edges: left edges in a column, baselines in a row (text), top edges for
mixed content; the number of distinct left edges in a group should be 1 (or the number of columns in its grid).

**Measurement.** Distinct rounded `rect.left` (and baseline y for text) among the children; compare with the
container's grid tracks.

**Example.** The lesson rows are `grid sm:grid-cols-[10rem_1fr_auto]`: three left edges, one per track (the probe
reports `lefts 1` per `<li>` because each has one child, the Link; inside the Link, three). The section header
`:72` uses `items-baseline`: the headline and its count share a baseline.

### L4. Grid versus flex

**Rule.** A group whose children repeat on equal tracks (same width, wrapping into rows, aligned columns) is a
grid; a group that lays out one row or column of differently sized children is flex. A flex group whose children
all have the same measured width and wrap into aligned columns should be a grid (the editor offers Flex | Grid, and
Subgrid when the parent is a grid, per the owner's decision for the layout card).

**Measurement.** `display`, children's widths (equal within 1 px → tracks), whether wrapping produces aligned
columns (children's lefts repeat), parent's `grid-template-columns`.

**Example.** `MotionIndexPage.tsx:41` `grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]` is a grid of two
unequal tracks (correct: a grid for alignment across rows); `:72` `flex flex-wrap items-baseline` holds a headline
and a count (correct: flex). The rows at `:79` are grids with explicit tracks (10rem / 1fr / auto), which keeps the
three columns aligned across rows — a flex row would let the names' widths push the columns.

## Un-sloppify: what one Use changes on a card

Ordered, each step a rule application, previewed on the card before Use:

1. **T3** Bring each level's members to the level's bundle (the modal bundle among peers): size, weight, leading,
   tracking, case. Writes the role class where the project has roles (`type-<role>`), else the step classes.
2. **T1** Where two levels are less than a step apart (or inverted), move the lower level down one step (never the
   upper level up: the title is the anchor the designer chose).
3. **S2** Make the gaps inside the group one step (the modal step).
4. **S1/S3** Put padding, inside gap and between gap on their levels: raise padding to at least the between level,
   or lower the inside gap below it (the smaller change wins; never both).
5. **L2** Make inner radii concentric (`outer − padding`, nearest step).
6. **L3** Align edges that are within one step of each other to the common edge (a margin or padding tweak, one
   step at most).

It must never touch: anything outside the card's own container (the card's siblings, the page); the title's
bundle (the anchor); any value the page computes (`var(--z)`, runtime styles, `opaque-inline`); drawings (SVG
text, elements inside excluded paths from `config.system.exclude`); colours (hierarchy reads colour, it does not
write it); layout mode (flex ↔ grid is a mode change the person makes, L4 only reports); anything the ledger has
accepted as an exception; and it never adds or removes elements.

## What the editor marks

For the element in hand, `contextOf(el)` gives, per property: `fits.step` (the step the context calls for, by the
rules above), `fits.reason` (which rule and which peers), and `fits.breaks` (the steps that would invert or flatten
a kept order). The scale shows the fit marked, the breaking steps dimmed, the rest plain. Nothing is enforced.

## Decisions (owner, 2026-11-02)

- **Q1 One theme step** between type levels, not a ratio (11 → 12 counts; 16 → 17 counts).
- **Q2 Proximity direction**: `inside < between ≤ around`, as written.
- **Q3 A weight step at equal size is a new level** (17/600 → 17/500 is title → subtitle).
- **Q4 Un-sloppify's anchor**: the title's bundle stays; lower levels move.
- **Q5 L3 alignment**: not ruled on; kept as written (may move padding or margin by one step at most).

## Engine (step 2, after review): `overlay/src/hierarchy.js`

Pure: DOM + computed style + the theme's scales (from GET props steps and the type roles) in, data out, no
drawing. `contextOf(el)` → `{ role, container, peers, levels, fits: { [prop]: { step, reason, breaks: [steps…] } } }`;
`tidy(scope)` → `[{ el, prop, from, to, rule, reason }]` in the order above. Registered in `src/hosts/client.ts`
`overlayModules`. Tested through the browser on a fixture of sloppy cards: one card whose subtitle is heavier than
its title, one whose inside gap equals the gap between cards, one whose inner image radius is not concentric, one
with a 16 px title among 17 px titles; assertions on `contextOf` marks and on `tidy`'s ordered list and the page
after one Use and one Undo. One browser test file at a time.

## Appendix: the probe

`PLUMBER_CHROMIUM=… node e2e/.hierarchy-probe.mjs` (a scratch script, not kept) over `/motion` (40 containers
reported) and `/` (11): per container `tag stamp display r<radius> p[padding] gap kids kidGaps lefts inner between
parent …`, then each text as `<tag> stamp size/lh/ls/weight[ CAPS] color y “text”`, with `!` lines for a later text
larger than the first and for differing child gaps. 271 lines; 28 `!` lines, all in the site header (12 vs 11 caps,
×6 occurrences across pages) and the SwipeToDismiss stacks (overlap, excluded). Excerpts quoted above verbatim.

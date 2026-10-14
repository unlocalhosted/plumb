# Blueprint: structure first, drift as breaks

Written with the code, 2026-10-14. Blueprint mode (`Alt+B`) re-inks the page as white line on blue and draws every drift
where it lives. Until now that was all it drew, so a busy view read as a punch list wearing a wireframe's clothes: low
fidelity in look, every finding in content. A wireframe answers structure and rhythm; this layer makes the blueprint
answer the same, and lets drift show as a break in that picture rather than a sticker on top of it.

## What is drawn now

**Dimensions.** Every gap on the system in view is a quiet dimension line: faint white (`rgb(255 255 255 / 0.55)`),
1px, ticks at both ends, lettered with its token (`s3`), never a pixel number. One per element, the first gap
declaration (`gap`, `column-gap`, `row-gap`) whose refs name a `--spacing-*` token and which has no finding at its
site. Padding is not dimensioned: it is inside the outline the blueprint already draws. A gap narrower than its label
is lettered above on a short leader, the way a mark is.

**Drift as the only colour.** Marks are unchanged: amber, heavier, clickable. Dimensions are placed after every mark
has its place and yield to any label already there, to the chooser, the card, the dock and the title block. They
paint under the marks (`<g class="structure">` first in the SVG). They have no hit box and are not in the dock's count:
there is nothing to do about a gap that is right.

**The title block.** A drawing's corner stamp, bottom-left, in the blueprint's ink on its own field: `SHEET` the route,
`VIEW` the viewport and its Tailwind breakpoint (`1200 × 800 · lg`), `TALLY` what is in view (`12 on system · 3 off`: every gap on the system whether or not it could be lettered, every new finding,
or `all true`; `reading 4 of 40…` while the reader works). It fades in with the marks once the sweep lands and is gone
the moment the mode leaves. It is an occluder: no mark is clickable under it.

## Layers, after the first review

The first cut lettered every finding at its mark. On a busy view that read as a punch list wearing a wireframe's
clothes, and no placement rule could save it. The blueprint is now built in layers, each answering one question, each
verified on the demo and in the suite before the next:

| layer | question | what is drawn | status |
| --- | --- | --- | --- |
| 0 greek | what is structure | words painted transparent on the host; a bar per line of text in the overlay, solid for headings, half for body, fainter for small text (`blueprint-greek.js`) | in |
| 1 breaks | where is it off | each finding as a break in the drawing in amber: a dimension across a gap or band, an arc on a corner, a bracket at text, a dot or dashed box for the rest; no words; one badge per element counting its breaks, astride the corner of a short element, inside the corner of a tall one, stepping left when badges would touch | in |
| 2 ghosts | how far off | the nearest token drawn in mint, dashed, beside each numeric break: the corner at the token's radius, the bracket at the token's width, the text bracket scaled to the token's size; the pick when one is picked, else the closest choice; none for a non-numeric value or once the mark is picked | in |
| 3 wash | which parts are rough | a red tint (`#ff4a5c`, never the marks' amber) per element from the sum of its drift: a numeric drift by its distance as a fraction of the nearest token, a raw colour or shadow as 1, a Tailwind default as 0.5, a near-miss as 0.25, an info note as 0; three stops (0.12 up to 0.5, 0.26 up to 1.5, 0.42 beyond); painted under the bars; an element inside a washed one is washed only when warmer; the pointed element and its ancestors lift | in |
| 4 tag | what is it, in words | one note beside the break under the pointer or with focus: the finding in words, up to three nearest tokens with their sizes, and what a click does (fix, change a pick, accept or add a token); to the break's right, else left, else under; gone when the pointer leaves, focus moves, or the chooser opens | in |
| 5 sheet | what one decision fixes most | under the tally, the drift in view grouped by what would fix it (a kind of finding: Tailwind defaults, raw tokens, near misses, undefined variables, or off-scale values by family), most first, four lines then `n more kinds`, each with up to three of the classes written; pointing at a line outlines every element it touches in amber | in |
| 6 peek | what it would look like fixed | D held: every new drift in view takes its nearest token at once through the fixer's previews (a pick keeps its pick, a value with no numeric token stays), the page re-lays out, outlines and bars turn mint, the breaks, badges and wash hide, the tally says `as designed · release D`; release, blur or leaving puts it back with no residue | in |
| 7 rails | does the page keep one rhythm | every vertical gap in view (on the system from the dimensions, off it from the marks for gap, padding and margin) as a tick pair on a rail down the left edge, every horizontal one on a rail along the top; a token in white, an off-scale number in amber; the same span in several rows is one tick; labels step along the rail when they would touch; the left rail stops above the sheet | in |

Rules that hold across layers: no words at rest except token names on dimensions and counts on badges; amber is the
only colour that asks for attention; nothing is written on the host but the attributes the mode already uses, and
everything is removed on leave. Hover never reveals words: the drawing is the drawing.

## Performance, measured on algorecall's /problems (15,929 elements, 396 svgs, 213 drifts in view)

Every phase of the mode carries a `performance.measure` (`plumb:enter-ink`, `plumb:sweep-cols`, `plumb:marks`
and its read, write, occluder and order parts, `plumb:greek`, `plumb:greek-measure`, `plumb:reader-scan`,
`plumb:reader-schedule`, `plumb:ink-more`), so the numbers below can be read back from any page.

| what | before | after | why |
| --- | --- | --- | --- |
| frozen frame on entry | 1.7 s | ~0.2 s | the host stylesheet changed `color` through `body *`; `color` inherits, so one change on the root box restyled all 16k elements, three times. The ink is now two attributes per element: paint properties that do not inherit on every element in or near view, text properties only on elements that hold words. Inking 10 elements cost 741 ms before and 26 ms after |
| the sweep | a style write on `<html>` per frame, each a full restyle | one clip-path transition on the field's pseudo-element, column delays written once | a custom property changed on `<html>` restyles every descendant |
| sweep column pass | 774 ms | 0 | measured before the ink goes on, with the entry's own read pass |
| greek measure | 746 ms in the frame | 5 ms, in idle time | a frame never measures text; a MutationObserver asks for a re-measure in `requestIdleCallback` |
| marks frame | reads and writes interleaved | every read, then every write | one layout per frame however many marks |
| hold D | ~700 ms each way | ~50 ms | the peek rules reach `[data-plumb-ink]` elements, never `*` |
| svg internals | read, marked, badged | skipped; the `<svg>` is a hatched plate | an icon's paths are drawing, not decisions |
| server reads | 261 requests, one per element, six in flight, each paying the engine's per-cohort reconciliation | a handful of batched POSTs (`batch`: resolve and site calls answered in one read cohort by `Session.many`), from the blueprint's reader only; the Alt card's single reading goes on its own as before | in one cohort 40 site calls cost 18 ms; one at a time 21 ms each |
| readings | started as visibility arrived, one at a time | in waves, after visibility settles, classes built in code traced in a second pass | a wave is one batch of resolves and one of sites; a 3 s trace no longer holds the count |
| entry to count, algorecall | 8.4 s | 4.0 s | the rest is per-element owner-chain resolves, which are sequential by nature, and ~7 ms per `site` on a report this size |
| entry to count, docs site (490 elements) | 1.5 s, 131 requests | 0.9 s, 4 requests, no long frame | |

Still open: the engine's per-`site` cost on a very large report (~7 ms, from scoping the report by file each call); a client-side cache of readings across reloads; a lighter sweep above a threshold of elements.

## Reader

Leaving blueprint cleared the reader's items but kept its element-to-id map, so the next entry saw every element as
already registered, watched nothing, and the dock said `reading…` forever. The map is reset on stop. Readings are
cached per element in the widget, so re-entering draws from memory: on the demo, the count is up within one frame.

## Shape

- `model.js` `reading()` returns `dims: [{ key, props, token, value, n }]` beside `marks`.
- `blueprint-reader.js` keeps `item.dims`; progress reports `{ read, total, drift, on }`.
- `blueprint-marks.js` draws dimensions in `#render` after the marks, keyed `${item.id}:${dim.key}`, with `drawDim`.
- `blueprint.js` owns the sheet (`.bp .sheet`), stamps it on progress, resize and scroll, and exposes `sheetRect()`
  for the widget's occluders.

## States

| part | rest | entering | reading | leaving | reduced motion |
| --- | --- | --- | --- | --- | --- |
| dimension | faint white, token label | fades in 240ms when first drawn | hidden where a mark's label sits | removed at once with the marks | no fade |
| sheet | field box, white rule, amber `off` | opacity 0 → 1 over 240ms when the sweep lands | tally reads `reading n of m…` dimmed | opacity 1 → 0 at once on leave | no fade |

## Not in this layer

Sheets (structure / spacing / type / colour as toggled layers), hold-to-peek, neighbour measuring on hover, one
callout for repeated drift, hatching by role. Each is its own layer after this one is reviewed.

## Proof

`e2e/blueprint.test.mjs`: "Gaps on the system are drawn as quiet dimensions named by their token, under the marks; the
sheet names the view". Real Vite, real React, real Chromium.

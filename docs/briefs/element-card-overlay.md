# Brief: the element card in the real overlay — effects, layout, spacing grammar, un-sloppify

The owner approved these in prototypes and asked to "finish everything". Build them into the overlay, one layer at a
time, each tested before the next. The text card is already built and committed (overlay/src/texteditor.js, e2e/
text-editor.test.mjs, e2e/hierarchy-marks.test.mjs): follow its patterns exactly (placement beside the element with a
caret and a ring, `host.set`-style writes through Blueprint, the said line with Undo in the fix panel, keys routed
through FixPanel.key, words in overlay/src/words.js).

## The approved designs (read these first; they are the spec)
- docs/design/prototypes/element-cards.html — tabs Card (Shadow › and Motion › drill-ins), Layout (Flex | Grid,
  subgrid switch, tracks, gap bands and column lines on the element, the spacing grammar), Button (Motion ›).
  Search it for `── effects`, `── the views`, `── layout`, `── the measuring layer` — those blocks are the approved
  interaction, motion and words. Port the behaviour and look; replace its sample data (PROJECT, PACK_*, L0) with the
  real engine and the real element.
- docs/design/prototypes/text-card.html (D) — the value field and the spring drag (already ported in texteditor.js).
- docs/design/text-editor.md, docs/research/hierarchy.md (the rules; overlay/src/hierarchy.js exports contextOf, tidy).
- The recipe engine (committed 3ade9d8): GET /__plumb/recipes?file&line&column, POST /__plumb/recipes/preview,
  POST /__plumb/recipes/apply — shapes in src/recipes/service.ts and e2e/recipes.test.mjs.

## Owner decisions to keep
- Alt+click opens the element's own card; words → the text card (done); other elements → this element card.
- Effects: the project's own shadows/motions first ("Yours"), pack recipes lined up against them (same/close/new);
  options shown as live copies of the element at real size on its own ground, in a strip beside the card (motion
  copies play their trigger with a cursor); tuning by physical handles (light pad: sun angle = direction, reach =
  height, halo = softness; motion: curve handles with overshoot past the top, a duration timeline, a travel ghost);
  "Writes" shows the exact edit (engine preview) before writing; reuse before adding; refusals in plain words.
- Layout: Flex | Grid; in Grid, tracks as chips and column lines dragged on the element; "Rows follow these columns"
  = subgrid on the children; a strip of the element laid out each way.
- Spacing grammar on the element (any element card): point near an edge → that side's padding (green, inside) or
  margin (amber, outside); between children → the gap (violet). Scroll: one wheel notch = one scale step (trackpad
  ~40px per step), detent, never between steps; drag: a step per 10px. ⇧ = the pair, ⌘ = all of that kind on the
  element; the bands that will change light up while the key is held. The value and its step name float by the
  pointer ("12 · s3", coral if off the scale) with the scale around it marking the hierarchy (inside < between ≤
  around) and the rule in plain words. Writes when you stop or Enter; Esc puts back. Edit-through: pointing at a child
  shows the child's bands.
- Un-sloppify (cards): one button on the card ("Tidy this card"): runs hierarchy.tidy(scope) → previews every change
  on the element at once with a before/after (hold Space for before), lists the changes in plain words, one Use writes
  them all (one batch, one Undo), never touches the title's bundle or anything the rules say it must not.
- Copy: plain words, no internal names (no "token", "prop", "subgrid" except as the small tag the prototype uses).
- Motion: same spring constants and easing as texteditor.js / the prototypes; reduced motion = positions only.

## Layers (stop after each; run its tests; report)
1. Element card shell for non-text elements (overlay/src/elementcard.js): placement/caret/ring like the text card,
   Shadow › and Motion › drill-ins on the recipe engine (GET/preview/apply), strip of live copies, light pad, curve/
   timeline/travel, Writes from preview, Use → apply with undo handles into the panel's said line.
2. Layout section + the spacing grammar (scroll/drag/keys/bubble/hierarchy) on the element; writes through the
   existing set/swap write path (or a new server method if needed — server work is allowed but keep it small and
   tested).
3. Un-sloppify for cards.
Register every new module in src/hosts/client.ts overlayModules (the host serves only listed files; a missing entry
breaks the whole overlay — and a long-running dev server must be restarted to see a new entry).

## Proof
e2e tests through the browser on fixtures (integration/e2e only, never unit tests): open the card on an element,
preview, write, undo restores the file exactly; scroll a padding band with ⌘ and see all sides change in the file;
subgrid toggle writes `grid-cols-subgrid` on the child's line; tidy writes its batch and one undo restores. Also
re-run e2e/text-editor.test.mjs and e2e/element-only.test.mjs after each layer.

## Rules
Main checkout, no worktree. Don't touch site/src/hero/Hero.jsx or docs/briefs/ci-green.md/readiness-1d.result.md.
Don't commit — the lead reviews and commits each layer. The machine swaps: one browser test file at a time, never the
full suite, `npm run build` only when no `node --test` is running. Report per layer: files, the commands and raw
results, what you couldn't verify.

# Page clean-up: the runner and its first layer (type)

Step 4 of the clean-up from the heydamir video (memory: page-cleanup-direction). Done before it: every change is
traced and undoable alone (3f527c7 and before), every rule names its laws (3413d6f), the timeline shows and undoes
steps (layers 1–4). This brief is the runner and the type layer. Nothing here is built.

## What exists, read on crafting-ui (2026-11-03)

- **Type**: the fix panel's *text styles* proposal (typesystem.js, engine `system`): "Your text uses 11 sizes. 8
  styles would cover it." On `/motion/standards`: Display 32–44, Headline 24, Title 19, Title small 17, Body 16, Body
  small 13, Label 12, Label small 11; 29 places stay, 9 move by 1px or less.
- **Spacing**: Tidy this card (hierarchy.js), one card at a time; craft's spacing rules (inner-outer-spacing ×78 on
  two routes).
- **Colour, icons**: craft rules only (gradient-space, stroke-weight ×72, media-size); no proposal.

## Problems the runner has to solve (found, not assumed)

1. **A page proposes its own type system.** `/stickers` proposes Title 21px and Body small 14px where
   `/motion/standards` proposes 19px and 13px. Run per page, the clean-up would give one site two type systems.
   The type layer must propose against the project's roles (one ladder for the codebase), and the page only says
   which of its places move.
2. **Tidy works against grouping and can write nothing** (QA issues 7, 8: 8/8/20 → 8; `gap-2` on a block). The
   spacing layer can't run Tidy page-wide until those are fixed. Handed to the session that owns Tidy.
3. **Panel writes carry no step or laws** (QA issue 3). The runner tags every write it makes itself, so its steps
   read "Type · Law of similarity" in the timeline whatever the panels do.
4. **Two undo surfaces** (QA issue 4). The runner's steps are undone from the timeline only.

## The runner

- **Entry**: Blueprint's panel, one line under the findings: "Clean up this page: type, spacing, colour, icons."
  One surface: the panel becomes the runner; the timeline strip is its history.
- **A layer** = read (the project's proposal for this family, scoped to this page's places) → preview on the page
  (hold Space: as it was) → *Write it* (one POST, tagged `trace: { group: "cleanup-type-<n>", meta: { step: "Type",
  laws } }`) or *Skip*. The next layer reads the page as it now is.
- **Order**: type, spacing, colour, icons (type first: the owner's 2026-10-31 decision; spacing after Tidy is fixed).
- **Measure each layer**: distinct values before → after (sizes, gaps…); a layer that adds values is not offered.
- **Performance**: one census per layer (the page's text and boxes, read in one pass), preview through the
  non-inherited properties the blueprint rules allow, `performance.measure('plumb:cleanup-*')` on algorecall.

## Layer 1: type

- Proposal: the project's text roles (engine `system` over the project's census, not this page's), each place on
  this page mapped to its role, with what moves and by how much.
- Preview: each place drawn in its role on the page; places that move more than 1px marked to look at first.
- Write: role classes at each place, in one write; the theme's role utilities first if the project has none.
- Laws: similarity (one level, one look), cognitive load (fewer distinct sizes).
- Proof: on crafting-ui, `/motion/standards` then `/stickers` end with the same ladder; distinct sizes before/after;
  timeline shows one "Type" step per page with its laws; Undo step restores both files.

## Decided (owner, 2026-11-03)

- **History reset by hand**: each run of steps edited outside Plumber collapses into one hatched tick.
- **Project ladder**: measured once over every route headless (as `plumber craft` reads them), cached, refreshed
  when sources change.

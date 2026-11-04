# The homepage's story

Agreed with the owner on 2026-11-04, revised the same day.

## The lead: Plumber knows the patterns design engineers know

What makes Plumber worth installing is not that values snap to a theme (any linter can claim that). It's that it
catches the design-engineering patterns experienced people know and most UIs miss: an icon centred by its box instead
of its weight, a grey shadow on a warm surface, an inner radius equal to the outer one, figures that wobble, a heading
that leaves one word alone, a popover that grows from nothing. 77 principles in 7 families (docs/craft/rules.md), 48 of
them insights worth showing (overlay/showcase), and spacing on your theme is one family among them.

Every section proves something on a real screen, in the homepage's own foundations (`src/foundations/foundations.css`).
The insight examples are borrowed from the showcase (overlay/showcase/src/principles/examples.jsx) and redrawn in the
homepage's style, never captured or embedded.

## The page

| # | Section | Sells | Proof |
|---|---|---|---|
| 0 | Hero | it reviews your UI like a design engineer, and writes the fix | a design review on one screen: five mistakes pinned by name, each zoomed, measured and fixed in turn (Review.jsx) |
| 1 | The insights | 77 patterns: the ones you'd only notice once shown | a gallery of real scenes, each flipping broken ↔ fixed, named with its principle and why |
| 2 | Keep AI slop out | agents ship these mistakes too; Plumber catches them after every edit | the agent session, catching craft mistakes (a grey shadow, a box-centred icon) as well as made-up values |
| 3 | Live editing | change it on the page, it lands in the exact line | a real recording of the overlay |
| 4 | Save tokens on iteration | a nudge costs no prompt and no model | the two-routes illustration |
| 5 | Install | – | three commands, then hold Alt |

Claims stay checkable: show the difference, never say no other tool exists; no invented numbers (npm and GitHub are
too early to show).

Process per section: comps, the owner picks, then build with motion, phone and both schemes.

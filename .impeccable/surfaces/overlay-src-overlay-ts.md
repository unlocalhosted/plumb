---
version: 1
slug: "overlay-src-overlay-ts"
primary_target: "overlay/src/overlay.ts"
related_targets: []
---

## Scope

The Plumb browser overlay: a dev-only inspector that runs inside the project's own dev server (Vite plugin, no Plumb server), drawn in a closed shadow root on top of any app. Visitor mode: Operate. Primary user: the product engineer looking at their running app. Job: see whether an element's styles use the team's tokens and get the exact edit or the agent handoff in seconds. Constraints: no web fonts or remote assets, legible over any host page in light or dark, never resizes or restyles the host, reduced motion respected, keyboard reachable, z-index above everything.

## Direction contract

THESIS: The overlay is a surveying instrument held over the page. Corner reticle ticks square the element, a plumb line drops to a tag that states the reading, and a field-book card lists every value against its token. It refuses the docked DevTools side panel and any tint over the host page.

OWN-WORLD: Neutral field-book card (warm-grey paper in light, blackened graphite in dark) with ruled rows and fixed columns; ink text in a system UI face, readings in tabular figures; one instrument brass for the reticle and plumb line; verdict marks are the only other colour: green on a token, red off the scale, amber for a Tailwind default, wrong tier or a matching value, graphite for unknown. All lines are one device pixel, at 0 or 90 degrees, bending only at right angles.

STORY: The engineer holds Alt and hovers; the reticle snaps to the element and the tag reads "div · Row · 2 off". Click pins the card: each value's reading, verdict and token, ownership overrides and ledger status; Copy for agent hands over the exact edits. They change the code and the reading updates in place.

FIRST VIEWPORT: The page itself, untouched. On Alt+hover: four L-shaped corner ticks (8px arms) on the element's box, a brass plumb line from the bottom edge's centre down 16px to a 22px tag (tag, component, count off). Click: a 320px card pins 12px beside the element on the side with room, rows 28px, Copy for agent as the card's single primary action at its foot.

FORM: Plumb and reticle, position 6 on the ordered list (assigned by the roll), seed key e7754e06. Raises: colour quarantine (lexicon), right-angle line discipline (transit), fixed severity ramp with one ringed object (atlas), live in-place readout (specimen), fixed furniture per row (catalog), device-pixel snapping (bitmap). Interface-craft review added: when an exact edit exists, the row's last column reads as a one-line change, gap-10 → gap-mu-space-12.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction

The reticle travels to the next element on a spring (transform only, no overshoot past 2px), the plumb line extends from the box to the tag as the reading arrives, and the bob settles. Reduced motion: the reticle and tag appear in place, no travel.

## Unresolved

Next.js/webpack integration path; how stale readings show while HMR re-judges a file.

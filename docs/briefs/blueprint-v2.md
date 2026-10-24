# Blueprint v2: a quiet work surface that owns input, with findings grouped by cause

Status: design, 2026-10-24. Owner feedback and decisions; replaces the 2026-10-14 blueprint direction.

## What's wrong, and the system behind it
| Owner's words | The system that produced it | What replaces it |
| --- | --- | --- |
| "I'm still able to interact with the page behind, which causes accidental clicks" | Blueprint is a drawing over a live page; nothing owns input while it's on | A mode that owns input: the page is inert, scroll still works, hold Space to use the page |
| "The blue colour with grids is too high fidelity… stealing my attention" | Blueprint as an aesthetic world: blue field, grid, wireframe, red wash; every element equally loud | A quiet work surface: your real page, dimmed and desaturated; only drift outlined and labelled |
| "Clicking around isn't scalable; group similar issues, apply common fixes" | The unit is one mark on one element; 20 cards with the same p-[10px] are 20 things | The unit is a group by cause (same value + same rule), fixed once for every site, in a docked side panel |

## Layers (each verified on Relay and the overlay demo before the next; e2e only)
1. **Input ownership.** While blueprint is on: pointer and keyboard events don't reach the page (scroll and wheel do);
   holding Space passes input through to the page for as long as it's held (the cursor says so); Esc leaves.
   Proof: clicks on the page do nothing in blueprint, scroll works, Space+click reaches the page, nothing is left
   behind after leaving.
2. **The quiet look.** No blue field, no grid, no wireframe, no greeking, no red wash. The page stays as it is,
   dimmed and desaturated by a single overlay layer; drifted elements are lifted out of the dim and outlined; labels
   are short and only on drift. Proof: computed styles of the host page are unchanged after leaving; marks stay
   readable on light and dark pages.
3. **Findings grouped by cause, in a docked side panel.** Groups (rule + value + suggested fix), sorted by sites;
   J/K or arrows move between groups, the page scrolls to and lights the group's sites; Enter opens the fix chooser for
   the whole group; Write applies one choice to every site, one apply per file, reviewed per file; groups that can't
   be fixed here (set in code) are one quiet count at the bottom. Proof: Relay's board shows p-[10px] as one group of
   20 sites; one Write fixes all 20 in one file write.

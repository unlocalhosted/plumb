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

## Layer 2 in detail: the quiet look

**What goes.** The blue field and grid (`html::before`), the re-inking of the page (`data-plumb-ink`, `data-plumb-text`,
`data-plumb-drawn`, `data-plumb-col`, the host stylesheet), the scan line and sweep, greeked text bars, the red wash,
mint ghosts, the margin rails, on-system gap dimensions, the count badges and hold-D peek. Blueprint then writes
**nothing** to the host page: no stylesheet, no attribute, no inline style. Everything is drawn in the overlay's shadow
root.

**Primitives** (in `tokens.css`, so they're shared with the rest of the overlay):
| Token | Value | Why |
| --- | --- | --- |
| `--pl-scrim` | `rgb(20 20 22 / 0.46)` | One dim over any page; the page stays recognisable, light or dark |
| `--pl-dim-filter` | `grayscale(1)` | Colour is reserved for drift, so the page gives its colour up |
| `--pl-dur-dim` | `160ms`, `--pl-ease-out` | Fade in; leaving takes 120ms; reduced motion is instant |
| drift ink | `--pl-off` | New drift, the same red the card uses for off the scale |
| soft ink | `--pl-soft` | Tailwind defaults and the wrong tier, as in the card |
| debt ink | `--pl-ink-3`, dashed | Recorded debt: present, quiet |
| chosen / picked | `--pl-accent` / `--pl-on` | Same meaning as in the chooser |
| halo | `--pl-halo`, 2px wider | Every line reads on any page |
| label | `--pl-tag-h`, `--pl-radius-tag`, `--pl-card-code` | The overlay's tag, not a new shape |

**The one component: a drifted element.**
- **Rest:** cut out of the dim (full colour, full brightness), outlined 1.5px in its ink on a halo, at its own corner
  radius. One label above its top-left corner: the first drift's class (`p-[10px]`) and `+n` for the rest. Breaks
  (dimension lines, arcs, brackets) are drawn in the same ink, with no ghosts.
- **Nesting:** only the outermost drifted element cuts the dim; a drifted child is already lit and gets only its
  outline and label.
- **Hover a break:** the note beside it (unchanged content) on the overlay's card surface.
- **Focus a break (Tab):** a 2px accent ring on its hit area.
- **Chosen:** its breaks turn accent. **Picked:** its breaks turn `--pl-on`; the label shows `→ token`.
- **Written:** it fades out as the re-read drops it.
- **Spotlit** (a cause is pointed at in the sheet): a 2px accent outline.
- **Crowded labels:** a label that would cover another steps below it; a label with no room above sits inside the top.
- **Empty:** a view with no drift: no cutouts, the dim alone, the dock says "all true".
- **Loading:** the dim goes on at once; elements light up as their readings arrive.

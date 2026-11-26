# Pratik's UI tips, sorted against plumber's checks

2026-11-26. Source: posts by Pratik ([@maybepratikk](https://x.com/maybepratikk)), a product designer. The harvest
reached 442 of his posts back to 2024-06-30; 338 had enough text to read. Most are about his studio and clients. The
tips below are his "small UI thing" posts from November 2026. Three videos were watched frame by frame and deleted.
Each tip is in our words; the link is the source.

## The tips

| Tip | Posted | Read from | Sorted as |
|---|---|---|---|
| [A menu's hover flickers between rows](https://x.com/maybepratikk/status/2122963896042713492): margin between rows leaves pixels that belong to no row, so nothing is hovered there. Make each row full height and inset only the hover fill | 11-18 | text and video (a 4px dead zone marked between two rows, "nothing hovered") | **New check, readable today** |
| [A tooltip opens above even when there is no room](https://x.com/maybepratikk/status/2124777974235033684): anchor it with CSS and let the browser flip it below (`position-try-fallbacks: flip-block`) | 11-23 | text and video (a tooltip 13px outside the viewport, then flipped below and whole) | **New check, needs a look at what the tooltip probe reports** |
| [A menu or list at its end scrolls the page behind](https://x.com/maybepratikk/status/2125500083814928878): `overscroll-behavior: contain` on the list | 11-25 | text | **Checked in part**: built today as `craft/scroll-chain`, which speaks only for an area fixed or stuck in place. A menu in a popover is positioned another way and is missed |
| [Inner radius = outer − padding breaks in four places](https://x.com/maybepratikk/status/2118614980635603062): subtract the border too; a pill's radius is half its height; a focus ring adds its gap; padding bigger than the radius needs a floor | 11-06 | text and video (each case before and after, with the sums drawn) | **Checked** for three: `craft/concentric-radius` measures the inset including the border, reads a pill as half its height, and never goes below zero. **Not read**: a focus ring drawn as a pseudo-element |
| [Icons carry empty space in their box](https://x.com/maybepratikk/status/2123689131024994435): take it off the padding on the icon's side | 11-20 | text | **Checked**: `craft/icon-side` |
| [Bold on hover makes tabs jump](https://x.com/maybepratikk/status/2121151672756138484): reserve the bold width with a hidden copy | 11-13 | text | **Checked**: `craft/bold-hover` |
| [A submenu needs a safe triangle](https://x.com/maybepratikk/status/2122239986926027042): the pointer can cut across other rows without closing it | 11-16 | text | **Checked**: `craft/submenu-path` |
| [Tabular numbers in tables and live data](https://x.com/maybepratikk/status/2117890135945822554) | 11-04 | text | **Checked**: `craft/tabular-nums` |
| [Primary button breakdown](https://x.com/maybepratikk/status/2117621821034185116): the recipe for one button (fill, a thin see-through stroke in a darker shade of the fill, two small drop shadows and two inner shadows, all in the fill's hue), and a sheet of every button kind at rest, hovered, focused and disabled, in light and dark | 11-03 | two pictures, opened | **Checked**, as far as it is a rule: `craft/border-on-shadow` (a see-through border on a raised surface), `craft/tinted-shadow` (shadows in the surface's hue), `craft/layered-shadow`, `craft/hairline`. The rest is a worked example, with no fault in it |

## Counts

9 tips sorted: 6 checked, 1 checked in part, 2 new.

## The next rules

1. **Dead zones between menu rows.** A list of rows that each answer the pointer, with a gap of a few pixels between
   them where nothing is hovered. Measured from the boxes of neighbouring rows. The fix changes the structure (rows
   edge to edge, the fill inset), so it is a brief, with the conditions a good answer must meet.
2. **A tooltip or popover cut off by the edge of the screen.** Seen by opening it, which plumber's tooltip and toggle
   probes already do. Whether they report where the opened thing landed has not been read. The fix is advice: CSS
   anchor positioning is not in every browser.
3. **The panel check, widened to menus and lists in popovers.** Today's `craft/scroll-chain` misses them.

## Built (2026-11-26)

All three, on their test page (`scripts/proof/pages/menu-batch.jsx`):

| Check | Speaks on its fault | Quiet on | Other checks changed | Threw | Fix | Docs demo through its check |
|---|---|---|---|---|---|---|
| `craft/row-dead-zone` | yes, once | rows that touch; three buttons set 16px apart | none | no | written: each row's hit area reaches into the gap. Cleared, nothing moved, undone exactly | holds |
| `craft/tooltip-cut` | yes, once | a tooltip in the same bar that opens below | none | no | advice | can't be run in a still grid: it needs the hover. Its test page is the proof |
| `craft/scroll-chain`, widened | yes, once on a list positioned out of flow | the same list keeping its scroll | none | no | written: `overscroll-contain`. Cleared, undone exactly | holds |

One finding of the tooltip-delay check came and went between two runs of the same page. It is a timing reading and
not caused by these checks.

Not shown: any real app; a tooltip on a trigger the probe can bring to the middle of the screen (it sees the ones
that stay near an edge); the brief as its own kind of fix (the engine has advice only, so the brief's conditions are
written into the advice sentence); the numbers for a dead strip (1 to 8px, rows up to 56px tall) are untuned.

## What the engine can't read yet

- **Pseudo-elements.** A focus ring or a hover fill drawn with `::before` is not an element, so no check reads its
  radius or its box. Needed by the focus-ring half of the radius tip, and it would let the dead-zone check see a fill
  that is already inset the right way.

## Not reached

- The pictures in his other posts (288 posts carry one) were not opened, so a tip that lives only in a picture is
  missed. The button post's two were.
- Posts before 2024-06-30, and anything the searches did not return.

# gokhan's 25 CSS tips sorted against plumber's checks

2026-11-26. Source: the "CSS tip" posts by gokhan ([@gkurttech](https://x.com/gkurttech), a staff engineer who builds
browser tooling), 2025-06-11 to 2026-11-25. Collected by searching his posts for "css" and reading all 41 results;
25 are tips, the rest are replies and other posts. A tip whose text never says "CSS" would have been missed.

**How far the grounds were checked.** Only the tip posts were read. The CSS behaviour each proposed check rests on is
named below from memory; its documentation was *not* opened today. Each is to be read and linked when its check is built, the same
way as [defensive-tips.md](defensive-tips.md).

## Count

| | Tips |
|---|---|
| Plumber already checks it | 3 |
| Plumber checks part of it | 2 |
| Can become a new check | 5 |
| Not a check (a way to build an effect, nothing wrong to see) | 15 |

## Already checked (3)

| Tip | Posted | Plumber's check |
|---|---|---|
| `text-wrap: balance` on headings, `pretty` on paragraphs | 2026-11-01 | craft #48 (text-wrap by role) and #18 (no widows in headings) |
| `in oklch` on gradients so they don't pass through grey | 2026-11-06 | craft #55 (gradient-space) |
| `scrollbar-gutter` so a scrollbar's arrival moves nothing | 2026-11-11 | craft #36 (scrollbar-gutter) |

## Partly checked (2)

| Tip | Posted | What plumber has | What is missing |
|---|---|---|---|
| `scroll-padding` / `scroll-margin` so things land clear of the edge and of a sticky header | 2026-11-13 | craft #73: a link target clears the sticky header | The same fault in a snapping row or page: a snapped item lands under the header, or flush against the edge |
| Fade the edges of a scroll area only where there is more to scroll | 2026-11-22 | `scroll-no-hint`: a sideways scroll area with no sign of more | A list that scrolls down is not judged. On a Mac the scrollbar hides, so a list cut cleanly at its bottom edge looks finished |

## Can become checks: 6 checks from 5 tips

All six need the drawn page (computed style, sizes, what scrolls), so a linter cannot make them.

| Tip | Posted | What the expert sees | What plumber would read | Suggestion |
|---|---|---|---|---|
| `scroll-snap-type` and `scroll-snap-align` | 2026-11-12 | A carousel that comes to rest with one card cut in half | A sideways scroll area of like children, each at least half its width, with no snapping set | `scroll-snap-type: x mandatory` on the row, `scroll-snap-align` on the children |
| `mandatory` or `proximity` | 2026-11-14 | A long section you can't stop in the middle of: the page pulls you to its top or to the next one | `mandatory` snapping where a snapped child is taller (or wider) than the scroll area | `proximity` |
| `scroll-snap-stop` | 2026-11-15 | One flick throws you past three slides | Snapping slides as wide as the scroll area that don't set `scroll-snap-stop: always` | `scroll-snap-stop: always`. The weakest of the six: skipping slides is sometimes meant |
| `overscroll-behavior` | 2026-11-25 | You reach the end of a side panel, menu or chat list and the page behind starts to move | A scroll area inside a page that also scrolls, with `overscroll-behavior` left at `auto` | `overscroll-behavior: contain` |
| same tip, the case he shows | 2026-11-25 | An app with a fixed header rubber-bands when pulled past its edge | A page with a fixed header whose root keeps `overscroll-behavior: auto` | `none` on `html`, back to `auto` for coarse pointers so pull-to-refresh still works (his own caveat) |
| `accent-color` and `scrollbar-color` | 2026-11-10 | A checkbox, radio, slider or progress bar in the browser's blue on a page whose colour is something else. A white scrollbar on a dark panel | A native control still drawn by the browser (`appearance` not `none`, `accent-color: auto`) on a page whose controls use another hue. A scroll area on a dark ground with a light colour scheme | `accent-color` set to the project's own token. `color-scheme: dark` or `scrollbar-color` |

Plumber's dialog check already asks for `overscroll-behavior: contain` on a dialog. The new check is the same idea
for every scroll area inside a scrolling page.

## Not checks (15)

These show how to build an effect. A page that doesn't use them has nothing wrong on it, so there is nothing to find.

| Tip | Posted | Why not |
|---|---|---|
| `:nth-child(2 of .card)` | 2026-10-31 | A selector written in source; the drawn page can't show which one was meant |
| Motion paths (`offset-path`) | 2026-11-02 | An effect |
| Stagger with `sibling-index()` | 2026-11-03 | An effect |
| Springs and bounces with `linear()` | 2026-11-04 | An effect. Useful later as the way a fix writes a spring; easing is still undecided in plumber |
| Radial menu from the three above | 2026-11-05 | An effect |
| Shades and tints with `color-mix()` | 2026-11-07 | A way to write colours. Related: craft #57 already suggests `color-mix` for muted text |
| Relative colour syntax | 2026-11-08 | A way to write colours |
| `contrast-color()` for a button's text | 2026-11-09 | The fault it prevents (words that fail on their ground) is craft #24. It could be the fix once plumber knows which browsers a project supports |
| `scroll()` animation timeline | 2026-11-16 | An effect |
| `view()` animation timeline | 2026-11-17 | An effect |
| `animation-range` | 2026-11-18 | An effect |
| Parallax with `view()` | 2026-11-21 | An effect |
| Parallax with `perspective` and `translateZ` | 2026-04-29 | An effect |
| `line-height: round(up, 1.32em, 12px)` | 2025-06-11 | One person's number with no ground given. Craft #14 judges line height already |
| The `lh` unit for padding and gaps | 2026-03-29 (a reply) | A way to write sizes |

One thing these raise that was not looked into: plumber's reduced-motion check reads looping animations. Whether it
also catches a scroll-driven animation or a parallax that ignores the setting is not known.

# The scroll and native-control batch: the case for each check

2026-11-26. The checks come from gokhan's tips ([gkurt-css-tips.md](gkurt-css-tips.md)). Each row follows the
contract in [new-check.md](../briefs/new-check.md). The grounds below were opened and read today on MDN; the CSS
specifications they cite were not opened. Nothing here is built.

The batch is not ready to build: it has seven checks and the contract asks for ten or more, and a second harvest
(@maybepratikk) is running. More rows are expected from it.

## What the grounds changed

Reading the pages moved three things from where the tips had left them.

- **Strict snapping has a firmer ground than the tip gave.** MDN's guide to scroll snap says never to use
  `mandatory` when a child's content overflows the container, because that content can't be scrolled into view. It
  also names a second fault the tip did not: with `mandatory`, a child that sets no `scroll-snap-align` can't be
  scrolled into view either. That is a new check (row 3).
- **Two fixes can't be written yet.** MDN marks `overscroll-behavior` and `accent-color` as limited availability,
  not Baseline. By the contract a fix that needs a newer feature is offered only when the project's browser list
  has it, and plumber can't read that list. Until it can, these two checks give advice. This is the same missing
  sense the backlog already names ("a suggestion that uses a modern CSS feature never checks whether the project's
  browsers have it").
- **Skipping slides has no ground.** The `scroll-snap-stop` page says what `always` does and gives no advice on when
  to use it. A tip is a lead and this one leads nowhere firmer, so the check is held back (row 7).

## The rows

| # | The fault, as a person meets it | Principle | Ground (read 2026-11-26) | What plumber reads | Judges | Near misses to stay quiet on | Fix | Owns, and who else owns it |
|---|---|---|---|---|---|---|---|---|
| 1 | A carousel comes to rest with one card cut in half | A row that is paged should rest on a page | [Basic concepts of scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap/Basic_concepts): snapping is opted into on the scroll container, and each child names where it snaps | A sideways scroll area of like children, each at least half its width, with `scroll-snap-type: none` | Measured | A row of small chips or tags (free scrolling is right); a row driven by buttons with scrolling locked; a row already snapping | Written: `snap-x snap-mandatory` on the row and `snap-start` on the children. Two elements, so the fix reaches the children through the row | The scroll. Shares it with the scrollbar-room, scrollbar-on-demand and scroll-sign checks. It is about where the row rests and they are about the bar and the edges, so it should run after them and stack |
| 2 | A long section you can't stop in the middle of | Strict snapping is only safe when every stop fits the view | Same guide: `mandatory` is for when you know how much content is on screen, and is never to be used when a child's content overflows the container | `scroll-snap-type` with `mandatory`, and a snapping child taller (or wider) than the scroll area's own box | Measured | A child one or two pixels over (rounding); a child that is itself a scroll area; `proximity` | Written: `snap-mandatory` → `snap-proximity` | The scroll, as row 1. If both fire on one element this one wins: content that can't be reached is worse than a card cut in half |
| 3 | Part of the content can never be scrolled to | The same | Same guide: with `mandatory`, a child with no `scroll-snap-align` can't be scrolled into view | `mandatory` on the container, and a child with `scroll-snap-align: none` that is not the first in view | Measured | A child that is decoration (zero size, hidden, or positioned out of flow) | Written: `snap-start` on the child | The scroll. Folds under row 2 when both fire |
| 4 | A snapped card lands under the sticky header, or hard against the edge | Something brought into view should land where it can be seen whole | [scroll-padding](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-padding): it makes room for fixed toolbars and sidebars that would cover content | A snapping scroll area with a sticky or fixed bar over its start edge and `scroll-padding` of `auto` or less than the bar | Measured | A bar that is hidden while scrolling; children that already carry `scroll-margin` | Written: `scroll-pt-*` at the bar's height, on the project's spacing steps | The scroll. An extension of the existing check for link targets under a sticky header (craft #73), which does the same for anchors |
| 5 | You reach the end of a side panel, menu or chat list and the page behind starts to move | A scroll should stay in the thing you are scrolling | [overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior): names this scroll chaining, and says it is sometimes not wanted | A scroll area that overflows, inside a page that also scrolls, drawn over the page (fixed, sticky, or a dialog) or filling a side of it, with `overscroll-behavior` at `auto` | Measured | A scroll area in the page's own flow, such as a code block or a wide table (chaining there is what people expect); a dialog that locks the page another way | Advice for now (not Baseline, and plumber can't read the browser list). Written once it can: `overscroll-contain` | The scroll. The existing dialog check asks for the same on a dialog; this one must stay quiet where that one speaks |
| 6 | A checkbox, radio, slider or progress bar in the browser's blue on a page whose colour is something else | A control should look like it belongs to the product | [accent-color](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/accent-color): applies to checkboxes, radios, range inputs and progress bars; `auto` is the browser's choice | One of those four elements, still drawn by the browser (`appearance` not `none`), `accent-color: auto`, on a page whose own controls use a hue that is not the browser's | Measured, with the page's habits (its usual control colour) | A page with no brand colour of its own; a control restyled another way; `forced-colors` | Advice for now (not Baseline). Written once the browser list can be read: `accent-*` on the project's own colour token | Colour of a control. Any check that judges a control's colour against the theme; to be listed when built |
| 7 | One flick throws you past several slides | (none found) | [scroll-snap-stop](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-stop) says what `always` does. It gives no advice on when | | | | Held back: no ground | |

A white scrollbar on a dark panel was part of the tip behind row 6. Its ground is the
[color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) page, which lists
the default colours of scrollbars and form controls among what the property changes. It is a separate check (a dark
ground with a light scheme) and gets its own row when the batch is filled.

## Not known

- Whether headless Chromium draws classic or overlay scrollbars on the server that runs the real-app checks. Rows 4
  and 5 depend on what is drawn.
- Whether plumber's probes can scroll an inner area to its end and see the page move. If they can, row 5 becomes a
  thing plumber has seen happen as well as read from styles.
- The demos and test pages for these rows are not drawn.

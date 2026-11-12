# The 16 defensive CSS tips plumber had no check for: which hold up

2026-11-12. Source: [defensivecss.dev/tips](https://defensivecss.dev/tips/) by Ahmad Shadeed (a practising front-end
developer, author of *Debugging CSS*). Each tip was read on its own page and walked through the chain in
[PRINCIPLES.md](../PRINCIPLES.md): what an expert sees, the principle, the ground, what plumber can read, the suggestion.

**How far the grounds were checked.** The tip pages were read today. The CSS behaviour each one rests on (a flex row
does not wrap by default, a grid item stretches by default, and so on) is long-standing documented behaviour; those
pages were *not* re-read today. Each is to be read and linked when its check is built.

## Verdict

| Tip | Verdict | Becomes |
|---|---|---|
| Position sticky with CSS grid | Holds | **A sticky thing that can never stick** |
| Fixed sizes | Holds | **A fixed height on a box that holds text** |
| Vertical media queries | Its case holds, the tip does not | folded into the fixed-height check (`h-screen`) |
| Component spacing | Holds | **Space that is left over, not declared** |
| Using space-between | Holds | same check, second form |
| Flexbox wrapping | Holds | **A row of like things that cannot wrap** |
| CSS grid fixed values | Holds | **A fixed column with no narrow form** |
| Minimum content size in CSS grid | Holds | the existing "text in a row may shrink" check, extended to grid |
| Scrollbars on demand | Holds | **A scrollbar that shows when nothing scrolls** |
| Background repeat | Holds | **A background photo that tiles** |
| Default flexbox stretching | Holds, narrow | **A picture stretched by its row** (beside the picture checks) |
| Button minimum width | Open question | needs a number with a ground |
| Auto-fit vs auto-fill | Does not hold | a design choice, not a mistake |
| CSS variable fallback | Does not hold | against token practice |
| Grouping vendor selectors | Does not hold | a stylesheet lint, nothing to see |
| Image maximum width | Does not hold | Tailwind's reset already does it |

Eleven tips hold and become nine checks; four do not hold; one waits on a decision.

## The ones that hold

### A sticky thing that can never stick (built 2026-11-12)
- **What the expert sees:** a side column marked to stay in view that scrolls away with the page.
- **Principle:** a sticky element moves only inside its parent's box. Stretched to the full height of its row, it has
  no room to move, so the instruction does nothing.
- **Ground:** the tip, and its author's longer article on the same bug. A grid or flex item stretches to its row by default.
- **Signals:** `position: sticky`; the parent is a grid or a flex row; nothing sets its alignment or height; its box is
  taller than its own content (the row made it so).
- **Suggestion:** `self-start`. One class, exact.
- **Mechanism numbers:** none. "Taller than its content" is measured, with one pixel for rounding.

### A fixed height on a box that holds text (built 2026-11-12)
- **What the expert sees:** a hero or card with a set height, and text that will spill out of it once it is longer or
  the screen is narrower.
- **Principle:** a box that holds text sets its least height, never its exact height, in the direction text grows.
- **Ground:** the tip. Fixed heights on controls (a button, an input) are a different thing and are right.
- **Signals:** a height class on an element that holds text that may wrap, with nothing said about overflow; not a
  control, a picture, or a scroll area. `h-screen` holding content is the same case.
- **Suggestion:** `h-X` becomes `min-h-X`. One class swapped.
- **Ground re-read when built:** the tip's own page ("we need to use min-height instead of height. That way, if the
  content gets larger, the layout won’t break") and MDN's min-height page.
- **How "holds text that may wrap" is read:** a line of words inside already runs to a second line. Measured, with
  no threshold; a box whose text is one line (a bar, a chip, a control) is left alone.

### Space that is left over, not declared (built 2026-11-12, first form only)
- **What the expert sees:** a title and a button kept apart only by the empty space between them; a row of items
  spread by `justify-between`.
- **Principle:** the distance between neighbours is a decision. Left to whatever space remains, it closes to nothing
  with a longer title and opens too wide when there are fewer items.
- **Ground:** the two tips. Design-system practice: spacing is a token.
- **Signals:** a row whose children are separated by `justify-between` or an `ml-auto`, with no gap and no margin; for
  the second form, three or more like items spread by `justify-between`.
- **Suggestion:** a gap from the project's own scale (the step its sibling rows use). This is a single decision, taken
  from the project's system.
- **As built:** a flex row with no column gap whose parts are spread by `justify-between` (or pushed with an auto
  margin), none of them holding a margin of its own, at least one holding words, and not inside a drawing hidden from
  readers. The distance is measured between what each part draws (its words and leaf boxes), not its wrapper's box.
- **The gap, as built:** at least the gap used inside its own parts (outer at least inner, plumber's inner-outer
  principle); else the gap of the layout around it; else half the row's text size (an invented fallback, tuned once on
  crafting-ui: a full em pushed a narrow row's count off its card). On the theme's spacing scale, else Tailwind's 4px steps.
- **Second form not built:** three or more like items spread by `justify-between`.

### A row of like things that cannot wrap
- **What the expert sees:** tags, chips or options in one row that will run off a narrow screen.
- **Principle:** a list of unknown length needs somewhere to go when the row is full.
- **Ground:** the tip. A flex row does not wrap by default.
- **Signals:** a non-wrapping row of several like children (same element, same classes), not set to scroll, not a
  fixed set (a toolbar, tabs).
- **Suggestion:** `flex-wrap`, with the row's gap applied down as well as across.
- **Open in the mechanism:** telling a list from a fixed set is a judgement; to be tuned on real apps.

### A fixed column with no narrow form
- **What the expert sees:** a sidebar layout that keeps both columns on a phone and scrolls sideways.
- **Principle:** a layout with a fixed track needs a one-column form for the width where the track no longer fits.
- **Ground:** the tip. Responsive practice.
- **Signals:** an unprefixed grid class with a fixed-width track and no breakpoint variant beside it.
- **Suggestion:** move the columns behind the project's breakpoint (`md:grid-cols-[…]`).

### Text in a grid cell may shrink (built 2026-11-12)
- Same principle and suggestion as the existing flex check (`min-w-0`); a grid item has the same floor. An extension,
  not a new check.
- What holds a cell open is anything inside meant to give way: a line set to cut off, or a part set to scroll sideways.
- A column written to go down to nothing (`minmax(0, …)`, which is what Tailwind's `grid-cols-2` means) already lets
  its cell shrink, so plumber says nothing there until the cell really runs past its column.

### A scrollbar that shows when nothing scrolls (built 2026-11-12)
- **What the expert sees:** an empty scrollbar track beside short content (on Windows, or macOS set to always show).
- **Principle:** a scrollbar says "there is more". Shown when there is not, it misleads.
- **Ground:** the tip.
- **Signals:** `overflow: scroll` on an axis.
- **Suggestion:** `overflow-y-scroll` becomes `overflow-y-auto`. Where the scrollbar's arrival would move the layout,
  plumber's existing scrollbar-gutter check already asks for the room.
- **Ground re-read when built:** MDN's overflow page: with `scroll` the box is "always a scroll container displaying
  scroll bars", "whether overflowing or not"; with `auto`, only "when overflowing".
- **Left alone:** the page itself (`html`, `body`), where `overflow-y: scroll` is an old way to stop the layout moving
  when a scrollbar arrives.

### A background photo that tiles
- **What the expert sees:** a hero photo repeated at the edge of a wide monitor.
- **Principle:** a photo is one picture; repeated, it reads as a fault.
- **Ground:** the tip. Backgrounds repeat by default.
- **Signals:** a background image that is a photo (not a small pattern), set to repeat, not sized to cover.
- **Suggestion:** `bg-no-repeat` (and `bg-cover` where the box can outgrow the photo).

### A picture stretched by its row
- **What the expert sees:** an avatar pulled tall when the text beside it wraps to more lines.
- **Principle:** a picture keeps its own shape; its row's height is not its height.
- **Ground:** the tip. Flex items stretch by default.
- **Signals:** a picture with a width and no height in a stretching row.
- **Suggestion:** `self-start` on the picture.

## The ones that do not hold

- **Auto-fit vs auto-fill.** Whether a lone card should fill the row is a design choice. An expert would ask, not correct.
- **CSS variable fallback.** In a design system a token is always defined; a fallback beside every `var()` hides a
  missing token instead of fixing it. It is a caution for values fed in by script, which plumber cannot see on a page.
- **Grouping vendor selectors.** A stylesheet-authoring rule with nothing to look at. A CSS linter's job.
- **Image maximum width.** Tailwind's base styles already give every image `max-width: 100%`.

## Open question

- **Button minimum width.** The tip is right that a two-letter label makes a button too small. But the least width is
  a number, and it needs a ground: the project's own buttons, or a published one (Material's earlier buttons used 64).
  Plumber's 24px hit-target check already catches the worst case.

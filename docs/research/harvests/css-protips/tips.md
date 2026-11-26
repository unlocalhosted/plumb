# CSS Protips, sorted against plumber's checks

2026-11-26. Source: [allthingssmitty/css-protips](https://github.com/allthingssmitty/css-protips) by Matt Smith, a
list of 34 CSS tips (CC0, about 30,000 stars, last changed 2026-09-23). The whole list was read. Each tip was asked
the same question: what fault does it prevent on a page, and can plumber see that fault? The tips are leads; the
ground for each new check is named where known and has not been opened yet.

## Counts

| | Tips |
|---|---|
| Plumber already checks the fault | 9 |
| Plumber's check disagrees with the tip | 2 |
| A new check, readable today | 9 |
| A new check that needs something plumber can't read yet | 2 |
| Not for plumber | 12 |

## The next rules, in rank order

Ranked by how often the fault shows up on real apps and how little a linter can see of it.

| # | From the tip | The fault, as a person meets it | What plumber would read | Fix |
|---|---|---|---|---|
| 1 | Style broken images | A picture that did not load: an empty box, or the browser's broken-image mark | An `img` with a source that finished loading with no picture | Advice: the address is wrong, and only the project knows the right one |
| 2 | Use `:empty` to hide empty elements | An empty badge, error line or list that still draws its padding, border or background, or still holds its place in a row | An element with no content that draws something or takes a gap | Written: `empty:hidden` |
| 3 | Style "default" links | A link in a sentence that looks like the words around it, or differs only by colour | A link inside running text with no underline and the same weight as the text | Written: `underline` |
| 4 | `:not(:last-child)` for borders | A divider under the last row, doubling the box's own edge or dangling at the end | Sibling rows that each carry the same divider, the last one included | Written, once on the list: the last row loses it |
| 5 | Use a CSS reset, inherit `box-sizing` | A full-width box that sticks out of its parent by its own padding | An element sized by its content box, set to fill its parent, with padding or a border, wider than the parent | Written: `box-border` |
| 6 | Use SVG for icons | An icon that is soft on a sharp screen | A small bitmap `img` drawn larger than its own pixels allow on a 2× screen | Advice: an SVG, or a file twice the size |
| 7 | Comma-separated lists, empty links | Words that can't be selected, copied, searched or translated, because they are drawn by CSS | A `::before` or `::after` whose content is words | Advice |
| 8 | Use `:root` for flexible type | Text that does not get bigger when the person zooms, because its size follows the window alone | In source: a font size made only of viewport units | Advice: add a part that follows the person's text size |
| 9 | Line breaks used as spacing | Gaps made of blank lines, which a screen reader announces and no spacing step controls | Two or more `<br>` in a row | Advice |

## Built (2026-11-26)

All nine, as `craft/image-broken`, `empty-box`, `link-in-text`, `last-divider`, `box-overflow`, `icon-soft`,
`css-words`, `type-viewport` and `br-spacing`. On their test page (`scripts/proof/pages/protips-batch.jsx`, each fault
once with its near misses beside it):

- Each speaks once and stays quiet on its near misses.
- With the nine switched off, no other check's findings changed, and nothing threw.
- The four written fixes (`empty-box`, `link-in-text`, `last-divider`, `box-overflow`) cleared their findings, raised
  nothing and were undone exactly. Two of them move what follows by design: hiding an empty box, and dropping a line.
- All nine docs demos are real markup and pass through their own checks.

The first run showed two things that were then mended. The words check never spoke, because Tailwind writes
`content` as a variable; it now reads what the pseudo-element draws. And the last-divider check hid the existing
`tells/divider` finding on the same list, because both claimed the dividers; it now claims only the end of the run,
and both are said.

Grounds read the same day: WCAG failure F73 (a link in text needs a mark other than colour, or 3:1 of lightness
against its sentence; the check now stays quiet at 3:1); WCAG 1.4.4 (text resizes to 200%; the page read does not
name viewport units, so that part rests on how zoom works); MDN `box-sizing`; MDN `content` (generated content is
not in the DOM and may not be announced); MDN `naturalWidth` (0 when the image data is not there).

Not shown: any real app; the five advice checks have no fix to take; `type-viewport` can't see a size set on the
page's root element if that element is not judged; `css-words` can't read a stylesheet from another origin.

Grounds to open before building (kept from the first sort): the HTML standard on an image's broken state (1); WCAG 1.4.1 and its failure F73
for links told apart by colour alone (3); WCAG 1.4.4 for text that can't be resized (8); MDN `box-sizing` (5); MDN
`content` and its accessibility note (7). Rows 2, 4, 6 and 9 have no ground named yet.

## Already checked (9)

| Tip | Plumber's check |
|---|---|
| Set `:focus` for form elements | `habits/focus-outline` |
| Use `unset` to reset a button (the risk: the focus outline goes too) | `habits/focus-outline` |
| Add `line-height` to `body` | `craft/leading` |
| Use `aspect-ratio`, with `object-fit` | `html/img-size`, `craft/image-stretch`, `craft/image-fit` |
| The lobotomized owl (one space between things in a flow) | `craft/rhythm` |
| Empty links | `a11y/control-name` |
| `font-size` on form elements, for phones | `craft/input-zoom` |
| Hide autoplay videos that aren't muted | `html/autoplay-sound` |
| `margin-inline` | `habits/logical-inline` |

## Where plumber disagrees with the tip (2)

- **`space-between` for gutters.** The tip spaces a row of columns by the space left over. That is the fault
  `craft/declared-gap` finds: with fewer items on the last line, they are flung to the edges.
- **Disabled as `opacity: 0.5` and `pointer-events: none`.** `craft/disabled-contrast` finds the first half: a faded
  coloured control loses its words. The second half hides the reason a control is disabled from the pointer.

## Needs something plumber can't read yet (2)

- **`rem` for global sizes, `em` for local.** The fault is text that ignores the person's own text-size setting.
  Plumber would have to open the page with a larger default text size and see what did not grow.
- **Equal-width table cells.** The fault is columns that change width as the data changes. Plumber would have to see
  the table with other data.

## Not for plumber (12)

Ways to write CSS with no fault on the page to find: negative `nth-child`, `:is()`, the `max-height` slider, centring
(two tips' worth), intrinsic ratio boxes by padding (the same result as `aspect-ratio`), `local()` fonts (a loading
cost, another tool's job), the `:not()` nav example beyond row 4, and the remaining selector tips.

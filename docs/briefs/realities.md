# Realities: plumber opens the page many ways

2026-11-26. A proposal, not signed off. One reality is built since the same day: larger text (see "Built").

The owner, on two faults plumber could not see (text that ignores the person's text-size setting; table columns that
change width with the data): "we should bring these kind of capabilities to plumber and it should do more time of
experiments, imagine how doctor strange went in 14 million realities plumber should try simulating the page in
various ways as well."

## The idea

A page is drawn once on the developer's screen and then lived in under conditions nobody looked at. A **reality** is
the same page opened under one changed condition. Plumber reads the page in each, compares it with the plain
reading, and says what did not hold up: what failed to adapt, what broke, and what only goes wrong there.

## What plumber already opens

The page check already reads the page more than once. It reopens it at other widths, in the dark scheme, scrolled,
and with things held under the pointer. It tries gestures: a press, a toggle, a drag, the keyboard, a tooltip, a
submenu. In the overlay, Break it stretches props, lists and data. Each of these is a reality with its own code.
None of them is named as one, and adding another means writing another path through the runner.

## Realities worth adding

| Reality | What is changed | What it shows | How it could be opened |
|---|---|---|---|
| Larger text | The person's default text size, up from 16px | Text that did not grow; boxes that clip or overlap when it does | A browser setting for the run. Which one works in headless Chromium is not known |
| Zoomed to 200% | Half the width, twice the pixel density | Text sized by the window alone; a layout with no narrow form | A viewport of half the width at twice the scale |
| Other data | Longer names, bigger numbers, more and fewer rows | Columns that jump, rows that wrap, cells that clip, empty states | Break it's stretching, run from the page check |
| A longer language | Every string about a third longer | Buttons and labels with no room to grow | Stretching text nodes in place |
| Right to left | The page's direction | Padding, icons and alignment written for one direction | `dir="rtl"` on the page |
| Reduced motion | The person's motion setting | Motion that plays anyway; a state that only an animation showed | An emulated setting |
| Forced colours and more contrast | The person's colour settings | Things drawn only by a background or a shadow, gone | Emulated settings |
| Pictures that fail | Image requests refused | Layout that collapses; controls that were only a picture | Refusing the requests |
| A slow network | Requests held back | Loading states that are missing, or that jump when content lands | Delaying the requests |
| Touch | A touch screen, no hover | Things that only appear on hover; targets too small to hit | An emulated device |
| Print | The print stylesheet | A page that prints its navigation and cuts its content | An emulated medium |
| Keyboard only | No pointer at all | Things that can't be reached or can't be seen when focused | The keyboard probe, taken across the page |

## How a reality is judged

1. **Read the plain page.** That is the base.
2. **Open the reality** and read again.
3. **Compare.** Three kinds of finding come out:
   - something that should have changed and did not (the text is the same size under larger text)
   - something that broke (a box now clips, two things now overlap, the page now scrolls sideways)
   - a finding from an existing check that only appears here
4. **Say where.** A finding carries its reality, the way a finding today says which width showed it.

## How a person sees them

The owner: "for reality how do we showcase the different versions to user ? we need to come up with some way like
state of pages saved but user can cycle through them ?"

A direction, not a design. The component has not been through the look and interaction documents or the owner.

- **A dial, cycled.** The realities are stops on one control in the overlay's bottom bar, stepped through with the
  arrow keys. Each stop shows its name and how many things did not hold up there, so the trouble is visible before
  the person goes to it.
- **The live page changes where it can.** The overlay is on the running app, so most realities need no saved copy:
  larger text, zoom, right to left, a longer language, other data and failed pictures can each be put on the real
  page and taken off again. The findings for that reality are drawn on the elements as findings are today.
- **A saved picture where it can't.** Reduced motion, forced colours, print and a slow network can't be forced from
  inside a page. The page check saves a picture of each element that broke there, as it already does before and
  after a fix, and that stop shows the picture beside the live element.
- **A finding leads to its reality.** A finding that exists in one reality says so on the element ("only at larger
  text"), and choosing it turns the dial there.
- **Everything is put back.** Leaving a stop restores the page exactly, the way Break it does.

### The design page (2026-11-26)

Three prototypes, live on the same invoices screen, on the design site: `/design/realities`
(`web/design/parts/realities.js`), drawn with the overlay's own tokens, cards, toy buttons and toys. They differ in
kind, as the interaction principles ask:

- **A. A dial in the bar.** The bar's second state. Five stops (as it is, larger text, other data, right to left,
  pictures fail), each its toy and a count. ← and → step, a press picks, Esc goes back. The page changes in place and
  what did not hold up is ringed in coral; pressing a ringed thing says what is wrong with it in the bar.
- **B. A sheet of small pages.** Every reality drawn at once, small; picking one makes it the big one.
- **C. On the element.** No dial. A thing that breaks somewhere carries the toy of that reality; hold it and the
  page becomes that reality for as long as it is held.

Picked, for the owner to confirm: **A, with C's way in** (a finding that belongs to a reality says so on its
element, and choosing it turns the dial there). B opens a large thing over the page and hides small faults at a
third of their size. C only works once you know which element to ask.

The checklist, answered for A:

| Question | Answer |
|---|---|
| The one question | Where does this page break, and what breaks there? Nothing on the dial is about anything else |
| On real UI, with options to compare | An invoices screen; three options live on one page. One case only so far: not one page per reality |
| The problem in plain words | "Larger text: 2 things don't hold up", then "This line stays at 13px. Everything around it grew." |
| Each fact once, one loud thing | The count is on the stop and in the headline (twice; to settle). Coral is only on the page |
| The choice on the element | The broken things are marked on the page, and pressed there. The dial never covers the page |
| Small, nothing big opens | One row in the bar. B is the option that breaks this |
| Click, arrows, Enter, Esc | Click, ← →, Esc work on one model. No drag (the stops have no order to drag through). Enter does nothing yet |
| Feedback before the click | Each stop shows its count before you go to it |
| One body, scaled, interruptible, reduced motion | The page's text size moves as one over 320ms and can be interrupted; reduced motion switches at once. The other realities cut, with no transition yet |

Not done: the light scheme was not looked at; a phone width was not looked at; a fix taken while in a reality is
not drawn; the count is said twice.

Not known: whether a reality applied live reads the same as the headless one (larger text set from inside the page
is a change to the root size, which is not the browser's own setting); how the dial sits with Break it, which is
already one of these; what the dial looks like.

### In the overlay (2026-11-26)

The owner picked A. It is built as Break it's bar, which already put the live page into seven of these states: the
toys are now stops on a dial (the page as it is, then one per toy), each with its count once tried. ← → walk the
stops, ↑ ↓ the breaks, a ring is pressed on its edge, Esc goes back. Counts land on the stops before a visit, from a hidden copy of the page taken through them when the bar opens. Open:
a count ahead that differs from the live visit, the stops that act on the page, and C's way in from an element.

## What it costs

Each reality is at least one more load of the page. Twelve realities on every page is twelve times the wait. So a
reality is opened only for a page that has something it can break: the data reality where there is a table or a
list drawn from data, the larger-text reality where there is text, print where there is a print stylesheet. The
index that already says which elements a check is about can say which realities a page needs.

## Where to start

The two faults that prompted this: **larger text** and **other data**. Both have a tip waiting on them
(`docs/research/harvests/css-protips/tips.md`), and "other data" has most of its machinery in Break it already.

## Built

**Larger text (2026-11-26).** The page check opens the page once more with the browser's default text size at 24px,
through the debugging protocol's own setting for it (`Page.setFontSizes`). A probe sized `medium` confirms it took;
if not, the checks that read it stay quiet. It rides on the mechanism the dark, scrolled and held readings already
use: a second reading keyed by each element's place, asked for only because a check names it. Two checks read it:

- `craft/text-fixed`: a line of text that did not grow. Its fix rewrites a pixel size as the same size in rem.
- `craft/text-clips`: a box that shows all its words today and cuts them off at the larger size.

On its test page (`scripts/proof/pages/larger-text.jsx`): the two pixel-sized lines were found and the rem one was
not; the pixel-sized box that cuts its words was found and the growing one was not; no other check changed; the
written fix cleared its finding, moved nothing and was undone exactly.

Not shown: a real app; a page whose text is all in pixels, where every line would be said one by one (it should be
said once for the page); what the extra load costs on a large page.

## Not known

- Whether realities should share one runner, with the existing widths, dark, scrolled and held readings moved onto
  it, or sit beside them. One runner is the better system and the larger piece of work.
- How many realities a page check may open before the wait is too long, and whether the rest run only when asked.
- How a finding that exists only in a reality is drawn on the page in the overlay.

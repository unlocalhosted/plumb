# Fixing from the blueprint

Written before the code. Blueprint mode (`Alt+B`) already shows every drift in view at once, drawn where it lives: a
dimension across a gap, an arc on a corner, a bracket at the words. Fixing should follow from that picture. No hunting
with Alt held: click any mark, choose the right token from its category, see the page take it, and write. Several
drifts are picked the same way and written together, one apply per file. This brief is the flow from the person's side,
each decision with its reason, then the states, the motion, the keyboard, and what goes.

## 1. One drift

```
 blueprint on      every drift drawn in amber where it lives; the dock counts them: "6 off in view"
 click a mark      the mark becomes current (white, a touch heavier); the chooser opens beside it:
                   the finding in words, the change line, the category's chooser, the reason line
 point at a step   the page previews it at once (inline styles on the real element) and the mark's label
                   reads the live value: "gap 13 → 8"; the reason line says why that step is on the scale
 click a step      picked. The mark resolves: mint ink, label "gap 13 → s2". The chooser stays open
                   so a second look is one glance; the dock now says "6 off · 1 picked" and shows Write
 Write             one apply with the picked edit ids for that file; the dev server reloads the class;
                   the mark folds into its token and fades; the dock says "Wrote 1 edit to Hero.jsx"
```

**Click, not hover, opens.** The blueprint already shows everything; the pointer has nothing to discover. A click is a
decision ("this one") and the keyboard can make it (every mark is a button in document order).

**The chooser is the card's ladder, moved to the mark.** The reading card's ladder is the right language: the theme's
whole scale in order, the fitting steps live, yours notched between, each step drawn the way the family is seen (a
corner at its radius, a gap at its width, "Ag" at its size, a swatch for colour, a plate with its shadow). The chooser
reuses that one form, so the person learns one instrument. What it leaves out is everything the blueprint now draws for
it: the skeleton diagram (the real element is right there, marked), the chain row, the text row, Copy for agent. The
chooser is a chooser.

**Preview on point, pick on click.** Same as the card: pointing is free and reversible, clicking commits a pick. The
pick is a preview that stays, nothing is written. The mark says what it will become, so the picture is the queue.

**Picked is not written.** Mint ink (`#a8f0c6`, 9.6:1 on the paper) and an arrow in the label: on the system, pending
your Write. Amber remains "off". White remains "current". Debt stays dashed white. Three inks, each with a shape.

## 2. Many drifts

**The marks are the list.** Picking the second drift is clicking its mark; the first stays mint. `N` and `P` (or `]`
and `[`) step the chooser to the next or previous drift in view in document order without leaving the keyboard. The
dock keeps the tally: `6 off · 3 picked`.

**One Write for all of it.** Picks are grouped by file; each file gets one `apply` with every picked edit id and the
file's hash. Files are written in sequence so a refusal names its file and the rest still land. The dock's Write
button (also the chooser's) says how many edits.

**A punch list when the view is long.** Clicking the dock's count opens a list of every drift in view, grouped by file,
one row each: family glyph, `gap-[13px] → s2` (or `→ pick`), the element. Arrow keys move, Enter opens that drift's
chooser (the page scrolls it into view), Backspace unpicks. The foot has Before, Undo all, Write n. This is the same
queue the marks show, in rows: nothing lives only in the list. It is the second layer, built after the chooser works.

## 3. The chooser, per category

The reading card's forms carry over unchanged in meaning:

| family | form | step glyph | notes |
| --- | --- | --- | --- |
| spacing | ladder: the theme's spacing scale in order, a window of seven around yours | two bars at the step's gap | yours as a dashed amber notch between steps |
| radius | ladder | a corner at the radius | `full` reads "pill" |
| type | ladder | "Ag" at the size | |
| colour | swatches: yours first, then each fitting token's chip | the colour | |
| elevation | swatches: a plate on the element's own ground with the shadow | the shadow | |
| z, motion | the ruler (steps as ticks, yours between) | | until they get their own form |

Under every form, one line: the pointed-at step's reason from the design system ("compact related controls"), else
the picked step's, else "Point at a step to see why it is on your scale". The line always holds its height so the
chooser never resizes under the pointer.

## 4. What becomes of the reading card

It stays, demoted. Alt-hover and Select still work on any page, in or out of blueprint, and open the card as before:
it is the detail view, with the skeleton, the chain (`Alt+↑/↓`), text edits and Copy for agent. In blueprint mode a
mark never opens it; the chooser's header has a small "reading" link for the cases that need the detail (a run of text
to change, a class passed in from the parent). Nothing is removed that a test or a person depends on; the main path
no longer goes through it.

## 5. Ledger states

- **new** (amber, solid): the chooser as above.
- **debt** (dashed white): the same chooser, badge "known debt". Fixing debt is fine; the ledger entry becomes stale and
  `plumb check` says so.
- **exception**: not drawn. The person accepted it with a reason.
- **accept as an exception**: there is no server endpoint for it (by design: acceptance needs a reason and a commit),
  so the chooser's overflow offers "Copy accept command", the `plumb accept --site … --why "…"` line the engine already
  writes for the finding. The dock does not count exceptions.
- **no token is close**: the chooser says so, offers Copy for agent (hand-over), and the mark stays amber.

## 6. Undo and Before

- A pressed step clicked again unpicks it; so does Backspace in the chooser. The preview lifts, the mark returns to
  amber.
- Dock: **Undo** lifts every pick in view. It is a plain button next to Write; Write is the primary.
- **Before** (in the punch list foot, and `B` in the chooser): shows the page as source has it while held, every pick
  lifted; release, and the picks return. Marks keep their mint while Before is held so the queue is still visible.

## 7. The dock

```
 starting   ● Reading your project…                      (breathing, counts seconds after 3s)
 failed     ● Plumb couldn't start                       (red; blueprint refused with a word in the live region)
 bp on      ⌖ Blueprint · reading 12 of 84…              (aria-live off while readings trickle in)
 read       ⌖ Blueprint · 6 off in view · Alt+B
 picked     ⌖ Blueprint · 6 off · 2 picked   [Undo] [Write 2]
 writing    ⌖ Writing 2 edits…               [Write 2, busy]
 wrote      ⌖ Wrote 2 edits to Hero.jsx      (then back to the count as the re-read lands)
 refused    ⌖ Hero.jsx changed since Plumb read it   [Read again]
 mixed      ⌖ Wrote 2 to Hero.jsx · Card.jsx refused: …   (title holds the reason)
 empty      ⌖ Blueprint · all true in view
```

Write and Undo are in the dock because the dock is the one place that is always on screen and the queue spans the
view. The chooser repeats Write so the single-drift path is click, pick, Write without travelling to a corner.

## 8. Writes, re-reads, stale files

Each pick holds the element, the mark key, the chosen edit `{id, from, to}` and the file hash from the full reading
(`edits` endpoint, fetched when the chooser opens; the blueprint's own sweep fetches `site` only). Write posts `apply`
per file. On success the pick is **written**: its preview stays until the element's class changes (the dev server
reloaded it) or 2.4 s pass, then lifts, as the card does. The reader re-reads the file's elements; the written mark's
node leaves with the resolve motion. A refusal (`The file changed since the overlay read it`) marks every pick in that
file **stale**; the dock offers Read again, which re-fetches the full reading for those elements, re-matches each pick
by mark key and `from` text, and keeps the ones that still exist. Other errors say the server's message, verbatim.

## 9. Motion

| moment | what moves | how |
| --- | --- | --- |
| chooser opens | fades up 4 px from the mark | `--pl-dur-card` 180 ms, `--pl-ease-out` |
| point at a step | the page itself changes (no overlay motion) | none; the mark's label text swaps |
| pick | the mark's ink crosses amber → mint, ticks solid | `--pl-dur-feedback` 120 ms on `stroke`/`fill` |
| write lands | the mark's dimension line shortens into its label, the label fades | 240 ms, ease-out, then the node leaves |
| chooser steps N/P | the chooser travels to the next mark | `--pl-dur-travel` 220 ms, `--pl-spring` (same as the reticle) |
| reduced motion | every duration above collapses to 0 (tokens already do); the resolve is a fade only | |

No springs on the ladder; it is a ruler.

## 10. Accessibility

- Every mark: `role=button`, `tabindex=0`, name "Drift: `gap-[13px]` hardcodes 13px. Choose a token." Enter or Space
  opens the chooser; focus moves into it (first live step). Esc closes it and returns focus to the mark.
- The chooser: `role=dialog`, labelled by its title. Steps are buttons with `aria-pressed`; `1`–`9` pick the live steps
  in order (the ladder prints the digit). Tab moves through steps, the reading link, Write.
- Announcements (one live region, polite): "Picked s2 for gap-[13px]", "Wrote 2 edits to Hero.jsx", "Hero.jsx changed
  since Plumb read it". Counts stay visual while readings trickle in.
- Contrast on the paper `#1f3fa6`: white 9.1:1, amber `#ffb347` 5.1:1, mint `#a8f0c6` 9.6:1. Labels 11 px mono with
  the paper-coloured halo stroke.

## 11. Components, in build order

1. `choices.js`: the chooser forms (ladder, swatches, ruler, why-line) and their CSS, extracted from the card so both
   draw one ladder.
2. `blueprint-chooser.js`: the chooser (open at a mark, preview, pick, unpick, keyboard, next/prev, follow on scroll).
3. the queue in the widget: picks, previews, Write per file, stale handling, re-read, dock states.
4. mark inks for current/picked and the resolve motion in `blueprint-marks.js`.
5. the punch list.
6. e2e: click → chooser → pick → preview → write → disk → mark gone; two picks written together; undo; a refused write;
   keyboard only.

## 12. As built (commits 0a0a808 … on `homepage-react-plumber`)

Everything in §1–§11 is in, with these decisions made while building:

- **Pressed means queued.** The card pre-presses a lone fitting token and asks for Preview; the chooser offers it
  ("One token fits. Take it with 1, or Enter") and presses it only once picked, so a pressed step is always in the
  queue and clicking it again unpicks. Enter on a pressed step, or off the buttons, writes the queue.
- **Clicks go to the smallest hit box under the pointer.** Tab order has to follow the document, so overlapping
  hit rects are not reordered; a click resolves to the smallest box containing the point, the one the eye aimed at.
- **Labels step their own way first, then the other, never out of the view.** A picked label grows ("gap 13 →
  gap-3"); it climbs over empty space before it would drop into the element.
- **Full reloads.** A dev server without fast refresh reloads the page on a write; the fixer saves the resume record
  before writing, so blueprint comes back on, instantly, with "Wrote n edits to …" on the dock.
- **The chooser closes when its written mark leaves** (the element reloaded, or the re-read no longer finds the
  mark on an element still in view); scrolling its mark out of view does not close it.
- **Picks preview on the clicked element only.** Elements that share a stamp (a list's rows) share a reading and a
  mark state, but the inline preview is on the one that was clicked. The write fixes all of them.
- **The reading card** stays as the detail view (Alt-hover, Select, the chooser's "Reading" link). Its ladder is
  now `choices.js`, shared with the chooser. While the blueprint is on, the overlay's cards take the dark scheme.
- **Not built:** "Copy accept command" in the chooser (the accept line is still in the card's note), and a resolve
  motion beyond the fade (the dimension line folding into its label).

# Backlog

What React Plumber does not do yet, and the questions that are waiting for a decision. One list, kept up to date in
the same turn something is found, finished or decided. The story of how each was found is in
[journey.md](journey.md); this page is only where things stand.

- **Doesn't do yet:** said the way a person would meet it. When it is done, the line is deleted (the journey keeps
  the record).
- **Open questions:** a choice only the owner can make, with what each answer would mean. When answered, the line
  moves to the journey as a decision.

Last gone through: 2026-11-12.

---

## Open questions

### How plumber decides

1. **A row's title in a softened colour: leave it, or lift it to the full text colour?** crafting-ui has 105 list
   titles at 75% of the text colour. Plumber now leaves them alone (it used to fold them onto the grey of their own
   description). Lifting them is a bigger jump than a fold may make today.
2. **A small heading in capitals ("Part 01", 12px): heading or label?** The tag says heading, the look says label.
   Today the look wins. Six of them on crafting-ui.
3. **Should unsure text places go to a model's eye?** Plumber already asks a vision model about unsure craft findings
   in the command-line run. Text roles have no such step.
4. **When does a repeated value become a new token?** crafting-ui writes `tracking-[0.1em]` on 35 labels. Plumber
   has no principle for what to say about that. Counting the places alone was rejected (docs/PRINCIPLES.md).
5. **A theme that names its spacing steps while the pages use the plain numeric scale.** With five or more named
   steps, they are the scale, so a 20px space in a theme of 4/8/12/16/24 moves to 24. Right, or too eager?
6. **A theme with only a few named spacing steps** (fewer than about five) is not taken as the scale. Should it be?
7. **Corners in a theme named by size** (sm, md, lg): the corners pass proposes nothing, because the names say no
   job. Should plumber offer to name them by job, or map sizes to jobs itself?
8. **Controls in one row at different heights, none on the spacing unit:** plumber says the row is uneven and
   proposes nothing. Should it pick one anyway?

### Scope and order

11. **Which missing primitive next?** Proposed order: padding and gaps in rows, shadows, borders, motion, opacity
    and states. The order is a judgement, not measured.
12. **The nine test files still failing:** fix, or remove like the others? (List under Tests below.)
13. **A fairer messy page.** The only one (bench/messy) was written by Claude, who knows plumber's rules. Bring in
    pages from other models, or a real generated app?

---

## Doesn't do yet

### Clean-up: text

- Not looked at in the running clean-up panel since the job split; the before and after is from measured data.
- Text inside buttons is not its own job: label styles force capitals, so a plain button label goes by size.
- A hero title written to grow with the screen stays in the ordinary display style (its drawn size is not read).
- The job is read only from the tag and "is it a sentence". What it sits inside, and its size against its
  neighbours, are not read. Only crafting-ui has been measured.
- 20 one-off sizes (28–33px, 22px) would move more than 2px and are marked low confidence.
- Writing from source without a site reading gets inherited capitals wrong; it should refuse to write, or read the
  parents.
- The text step's "no site reading yet" screen has no skip; the pass names along the top are not clickable.

### Clean-up: spacing

- Only the space between stacked things is read. Padding and gaps inside rows are never seen (bench/messy has
  `p-[18px]`, `px-3.5`, `gap-[10px]`).

### Clean-up: colour

- Surface levels (a card on a panel) are not read from nesting; no project at hand has two nested surface colours.
- In a shadcn rename plan, `input` takes the `surface` name over `popover` only because its name is shorter; the
  colour used most as a raised fill should win.
- crafting-ui's wide-gamut blue loses a little chroma in the ramp (0.289 → 0.278).

### Clean-up: icons

- A stroke passed as a prop goes through the same path as a size, untried. A size passed through more layers of
  components is untried.
- The step's count adds sizes and strokes together, so fixing one icon's size can read "10 → 10".

### Clean-up: corners

- Themes that name radii by size get no answer (see question 7).
- Undo of the corners write was not tried.

### Clean-up: control sizes

- A reading and a decision only: not a pass in the panel, writes nothing.
- A wrapped button label is read as a tall control; wrapped controls should be left out.
- A theme's own control-size names are not read.
- The "one row, one height" rule found nothing on the messy page, so it is unproven.

### Primitives with no clean-up pass

- Padding and gaps in rows (spacing the pass cannot see), shadows, borders and lines, motion, opacity and states,
  layer order, breakpoints and container widths.

### Craft suggestions

- A suggested step is chosen by nearness to the standard's number, and a colour by nearness of value. The role of
  the element and where it sits are not read (docs/research/suggestion-sources.md).
- The suggestion engine's ranking and the standard's numbers name no source where they are defined
  (docs/PRINCIPLES.md, known debt).
- A suggestion's other answers are computed and never shown; today they are only the same advice in words.
- A class fix is offered on an element whose classes are built in code, then refused at write. It should say so
  first.
- A finding on a wrapped element is reported at the component's line, not where it is used; the fix card says
  "Changed X to Y" when Y was added beside X.

### Defensive checks

- Seen catching slips only on pages we wrote; no real app with the mistakes has been read.
- One check's fix can raise another check's finding on the same element (a background makes a box count as a card).
- Tips with no check yet: flex rows that should wrap, scrollbars shown when nothing scrolls, hover styles on touch
  screens, repeated backgrounds, fixed heights on text, sticky items in a grid, and the source-only ones.

### Writes and speed

- One edited file still marks 1,225 files as changed (about 100 ms per write).
- Several writes in quick succession sometimes reload the showcase page.
- Undo of a 101-file rename takes 7–13 s; where the time goes is not measured.
- A read taken in a window with no size gives wrong findings without saying so.
- A full read is about 2 s on a 1,400-element page (busy laptop, single runs); a fixed 0.6 s wait remains at the end.
- Two neighbours of the repaired fix-card write were not driven by hand: a fix taken on the element itself, and the
  class written after a new theme token.
- The tailwind-merge case is untested (crafting-ui does not use it). Code samples shown as text on crafting-ui may
  have been renamed with the tokens; not checked.

### The command line

- At 80 columns the report breaks a rule's name across two lines (`[habits/` / `focus-outline]`).

### Tests

The whole suite on vm-agent (2026-11-12): 944 passed, 11 failed in 9 files.

- The same page gives different problems at different window sizes (blueprint-determinism).
- The one bar does not fit with its tools out at 1440 wide (one-bar).
- A finding on the demo that the noise check does not expect, "baseline-align" (craft).
- A new-token test loses the page to a reload (craft-token).
- A Next performance wait times out (blueprint-next-performance).
- The timeline undo check is flaky: it passed and failed on the same commit (qa-fixes-2-overlay).
- A frozen-server test fails only when run beside other tests (verify-frozen).
- readiness-panel and text-edit (4 tests): another session has uncommitted changes to these files.
- The new messy-page test was never run against the old code to see it fail there.
- Today's new behaviour without a test: control sizes; the corners pass's Undo; a theme named by size.

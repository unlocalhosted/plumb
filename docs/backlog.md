# Backlog

What React Plumber does not do yet, and the questions that are waiting for a decision. One list, kept up to date in
the same turn something is found, finished or decided. The story of how each was found is in
[journey.md](journey.md); this page is only where things stand.

- **Doesn't do yet:** said the way a person would meet it. When it is done, the line is deleted (the journey keeps
  the record).
- **Decided by Claude:** design and engineering calls made on the owner's behalf, each with its reason, so the owner
  can overturn one.
- **Open questions:** only what is destructive, outward-facing, costs money, or is taste the owner has reserved.

Last gone through: 2026-11-12.

---

## Decided by Claude

The owner, 2026-11-12: "don't ask me for everything, take an educated opinion and intuition on what a principal design
engineer would do." These calls were open questions until then. Each is decided with its reason, and can be overturned.

| Call | Decision | Why |
|---|---|---|
| A row's title in a softened colour | Leave it | It is a deliberate fourth level; lifting it is a redesign, not a tidy-up |
| A small heading in capitals ("Part 01") | A label | What the eye reads is an eyebrow; the tag is for structure, the style for the look |
| Unsure text places to a model's eye | Not yet | More signals first; a model is the last resort, not the first |
| A value hardcoded in many places for one job | It is a missing token: propose one and use it everywhere it is written | A token is a decision named once; the same decision made by hand 35 times is the drift. The job comes first, the count is only how it is found. Not built |
| Named spacing steps are the scale | Keep | The design system leads |
| A theme with only a few named spacing steps | Not a scale | Two or three names are sizes of things, not a rhythm |
| Corners in a theme named by size | Propose nothing | A size name says no job; naming by job belongs with creating a design system |
| Controls in one row, none on the unit | Say it, don't pick | No ground to choose one |
| Next primitive | Padding and gaps in rows | The largest hole in what the eye sees |
| The failing tests | Fix the two real bugs, update the noise check after a look, leave the flakes | A test is kept for what it protects |
| A fairer messy page | Use a real generated app when one is at hand | bench/messy was written knowing the rules |
| The four "proposed to drop" lines | Dropped | Not observed problems |

## Open questions

- **Button minimum width.** A two-letter label makes a button too small (defensivecss.dev). The least width is a
  number and needs a ground: the project's own buttons, or a published one (Material's earlier buttons used 64). Say
  which, or leave it to the 24px hit-target check.

None. (A call is brought here only when it is destructive, outward-facing, costs money, or is taste the owner has
reserved.)

---

## Doesn't do yet

**The order** (decided 2026-11-12):

- **Now:** a class fix offered and then refused · a read in a window with no size.
- **Next:** padding and gaps in rows · control sizes as a pass · text inside buttons and "what it sits inside" · craft
  suggestions read the role · the two failing tests that are real bugs · tests for control sizes and a theme named by size.
- **Later:** shadows, borders, motion, opacity and states · surface levels · shadcn's foreground colours · growing hero
  titles · the speed items · the remaining defensive tips · the 80-column report · the flaky tests.

### Clean-up: text

- Figures have one step: numbers drawn at different sizes fold into one figure style (on crafting-ui a 31px "9:41"
  would go to 22px). A figure of 60px or more that is not a heading is still left out as a drawing (the messy page's "78%").
- Text inside buttons is not its own job: label styles force capitals, so a plain button label goes by size.
- A hero title written to grow with the screen stays in the ordinary display style (its drawn size is not read).
- The job is read only from the tag and "is it a sentence". What it sits inside, and its size against its
  neighbours, are not read. Only crafting-ui has been measured.
- Writing from source without a site reading gets inherited capitals wrong; it should refuse to write, or read the
  parents.
- The text step's "no site reading yet" screen has no skip; the pass names along the top are not clickable.

### Clean-up: spacing

- Only the space between stacked things is read. Padding and gaps inside rows are never seen (bench/messy has
  `p-[18px]`, `px-3.5`, `gap-[10px]`).

### Clean-up: colour

- Surface levels (a card on a panel) are not read from nesting; no project at hand has two nested surface colours.
- A fill is called sunken when it is darker than the page. With shadcn's page switched to dark, the plan came out the
  same as in light; not checked whether the dark values were read, or the light ones kept.

### Clean-up: icons

- A stroke passed as a prop goes through the same path as a size, untried. A size passed through more layers of
  components is untried.
- The step's count adds sizes and strokes together, so fixing one icon's size can read "10 → 10".

### Clean-up: corners

- Themes that name radii by size get no answer (decided: nothing is proposed).

### Clean-up: control sizes

- A reading and a decision only: not a pass in the panel, writes nothing.
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
- A class fix is offered on an element whose classes are built in code, then refused at write. It should say so
  first.
- A finding on a wrapped element is reported at the component's line, not where it is used; the fix card says
  "Changed X to Y" when Y was added beside X.

### Defensive checks

- Seen catching slips only on pages we wrote; no real app with the mistakes has been read.
- One check's fix can raise another check's finding on the same element (a background makes a box count as a card).
- Of the 25 defensivecss.dev tips, 10 have a check. The other 15 are sorted in docs/research/defensive-tips.md:
  - Still to build, each from its written principle (8 checks for 10 tips): a fixed height on a box that holds text;
    space that is left over, not declared; a row of like things that cannot wrap; a fixed column with no narrow form;
    text in a grid cell may shrink; a scrollbar that shows when nothing scrolls; a background photo that tiles; a
    picture stretched by its row.
  - Will not be checks (4): auto-fit vs auto-fill, CSS variable fallback, grouping vendor selectors, image maximum width.
  - The CSS behaviour each check rests on is to be re-read and linked when the check is built; only the tip pages were read.
- The sticky check has been seen working only on a page we wrote. crafting-ui has two sticky side columns that look
  like real cases; they could not be read because the overlay does not load there (see Writes and speed).

### Writes and speed

- The overlay does not load on crafting-ui's running dev server: it was started before another module was added to
  the overlay, and it refuses a file it does not know. Restarting that server fixes it.

- One edited file still marks 1,225 files as changed (about 100 ms per write).
- Several writes in quick succession sometimes reload the showcase page.
- Undo of a 101-file rename takes 7–13 s; where the time goes is not measured.
- A read taken in a window with no size gives wrong findings without saying so.
- A full read is about 2 s on a 1,400-element page (busy laptop, single runs); a fixed 0.6 s wait remains at the end.
- Two neighbours of the repaired fix-card write were not driven by hand: a fix taken on the element itself, and the
  class written after a new theme token.

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

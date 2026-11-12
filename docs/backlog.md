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
| Two texts that touch, in one parent | A collision only when placed by hand (absolute) | The layout keeps flowed pieces apart on purpose (the parts of one number); nothing keeps placed ones apart |
| Which widths to read a page at | 1280, 1024, 768, 390 | Desktop, small laptop, tablet upright, phone: the sizes people use; the project's own breakpoints later |
| Which checks run in every state | Words meeting words only, for now | A full read per state takes minutes; this is the check that changes most with width and hover |
| What gets the pointer | Things with a React pointer handler or a Tailwind `group`, six per width | They say they answer the pointer; a hover presses nothing |
| A row of links with one painted | All of them are controls (a tab bar) | WAI-ARIA tabs: one is active, the rest are the same kind |
| A painted link holding lines of words | A card you can open, not a button | A button is one label on one line |
| When two durations are the same speed | Within a fifth of each other | People cannot tell them apart closer than that (Weber fraction for time, 5–20%) |
| One disabled opacity when the theme names none | Material's 38%, as `opacity-40` | A published system's value, on the step every Tailwind version has |
| The most impactful next piece | One shared reading of what each element is, used by every pass and craft rule | Seven places decide "is this a control" today; on four crafting-ui pages they disagree on 137 of 174 elements, 134 of them links |
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

- **Now:** nothing of this session's. (A class fix offered and then refused is in the fix card, which another
  session has been changing today; left to it.)
- **Next:** padding read by job · a test for a theme whose radii or shadows are named by size · the Next
  performance test · the tests that fail only under the full run's load.
- **Decided 2026-11-12:** shadows went ahead of padding-by-job. After padding is snapped to the scale, sibling cards on
  the messy page already agree, so reading padding by job has little to show yet; shadows were a missing primitive.
- **Done since:** the shared role layer · borders (the colour pass already decides them) · timings · the disabled look.
- **Decided 2026-11-12, layer order:** not built yet. A z-index move changes what covers what, so a pass may only
  rename a value that already equals its job's layer. crafting-ui names its layers by number (no job); algorecall
  names them by job but is not running here. Build it when an app with job-named layers is at hand.
- **Later:** hover and pressed states · surface levels · shadcn's foreground colours · growing hero
  titles · the speed items · the remaining defensive tips · the 80-column report · the flaky tests.

### Clean-up: text

- Figures have one step: numbers drawn at different sizes fold into one figure style (on crafting-ui a 31px "9:41"
  would go to 22px). A figure of 60px or more that is not a heading is still left out as a drawing (the messy page's "78%").
- A control's label takes its line height from the most common one among buttons, often 1; a button with a roomier
  line would be tightened (three more low-confidence places on crafting-ui).
- Links in a nav are not read as control labels; only buttons, tabs, menu items, summaries and form labels are.
- A hero title written to grow with the screen stays in the ordinary display style (its drawn size is not read).
- The job is read only from the tag and "is it a sentence". What it sits inside, and its size against its
  neighbours, are not read. Only crafting-ui has been measured.
- Writing from source without a site reading gets inherited capitals wrong; it should refuse to write, or read the
  parents.
- The text step's "no site reading yet" screen has no skip; the pass names along the top are not clickable.

### Clean-up: spacing

- A size halfway between two steps goes to the wider one (20px → 24px in a theme of 16 and 24): the rule is "nearest by
  ratio". Not judged on a real app.
- Padding is not read by job (a card's padding, a control's sides): every padding is snapped to the scale alone.
- Padding and row gaps under a variant (`md:px-6`, `hover:`) are not read.
- A padding on one side alone (`pt-[5px]`) is treated as an adjustment and never judged, even when it is plain drift.
- With no scale named in the theme, only hand-written sizes (`p-[18px]`) are judged; a framework step that is rare in
  the app (`px-3.5`) is taken as fine.

### Clean-up: text (trial on crafting-ui branch plumber-text-roles)

- When a style's places share no size, the tie goes to the theme's own step nearest the middle: on crafting-ui a 28px
  struck-out price grows to 33px (still under the $99 beside it) and a 30px lesson title grows to 33px.
- The trial is not on crafting-ui's master: the owner decides.

### Clean-up: colour

- Surface levels (a card on a panel) are not read from nesting; no project at hand has two nested surface colours.
- On a page shown in dark mode the colour pass proposes nothing (the palette holds the light values): safe, but it
  does not tidy dark colours. Tidying a dark page would need the palette read in dark.

### Clean-up: icons

- A stroke passed as a prop goes through the same path as a size, untried. A size passed through more layers of
  components is untried.
- The step's count adds sizes and strokes together, so fixing one icon's size can read "10 → 10".

### Clean-up: corners

- Themes that name radii by size get no answer (decided: nothing is proposed).

### Clean-up: control sizes

- A theme's own control-size names are not read.
- The "one row, one height" rule has never fired on a real page (crafting-ui's one uneven row is a set of sizes
  shown on purpose), so it is unproven.
- A control whose classes are built in code cannot take a height class; it is listed as left.

### Clean-up: shadows

- A card that casts no shadow is never given one, and a bordered card beside shadowed ones is not flagged: mixing
  the two is left alone.
- Themes that name shadows by size (sm, md, lg) get no answer, as with corners.
- Nothing that floats (a menu, a dialog) was on the page it was proven on; that half is untried.

### Clean-up: timings

- A theme speed used nowhere is read from the stylesheet source on Vite (it serves files raw). On Next and other
  hosts only the speeds the page uses are seen.
- Easing, delays, staggers and keyframe animations are not decided; easing has craft rules only.
- A theme that names a speed twice (a class and a variable at two values) is said, not settled.

### Clean-up: the disabled look

- Hover and pressed looks are not decided (Material's state layers); only the disabled opacity.
- A disabled look drawn with muted colours instead of opacity is not read.

### Primitives with no clean-up pass

- Hover and pressed states, layer order, breakpoints and container widths.

### What an element is (the shared role layer)

- Done: the role file (overlay/src/roles.js) decides what an element is and what a theme's token is for; every
  pass, both text readers, the craft rules and the craft suggestion engine read from it.
- Borders: no pass of their own is needed; the colour pass decides a border's colour by job. A border's width is
  judged only by the hairline craft rule.
- Headings, figures and labels (the text jobs) are still decided by the text reader, from the role file's "is this a
  control's words".
- Later: unsure roles handed to a model.

### Craft suggestions

- A step suggestion prefers the theme step named for the job only by the words in its name (caps, label, display,
  body, button…). A theme that names its steps another way gets the step nearest the standard's number, as before.
- The craft rules about buttons and targets take the element's role from the role file; rules about type still
  name their own job (small capitals, big text).
- The same page gives different craft findings on a Mac and on Linux (two of them depend on the fonts' measurements).
- The suggestion engine's ranking and the standard's numbers name no source where they are defined
  (docs/PRINCIPLES.md, known debt).
- A class fix is offered on an element whose classes are built in code, then refused at write. It should say so
  first.
- A finding on a wrapped element is reported at the component's line, not where it is used; the fix card says
  "Changed X to Y" when Y was added beside X.

### Defensive checks

- Seen catching slips only on pages we wrote; no real app with the mistakes has been read.
- One check's fix can raise another check's finding on the same element (a background makes a box count as a card).
- Of the 25 defensivecss.dev tips, 16 have a check (one of them in its first form only). The other 15 are sorted in docs/research/defensive-tips.md:
  - Still to build, each from its written principle (3 checks for 3 tips, plus the second form of the left-over-space
    check: three or more like items spread by justify-between): a fixed column with no narrow form; a background photo that tiles; a
    picture stretched by its row.
  - Will not be checks (4): auto-fit vs auto-fill, CSS variable fallback, grouping vendor selectors, image maximum width.
  - The CSS behaviour each check rests on is to be re-read and linked when the check is built; only the tip pages were read.
- The list-wrap check finds one place on crafting-ui: the three figures on the templates page (styles, skills,
  scripts), mapped over a list written in the code. It fits at phone width; it is a fixed set the check cannot yet tell
  from a list. Its first version flagged 16 places, all wrong (see the journey).
- The left-over-space check fires on 5 places on crafting-ui (pattern pages' figure switch and hand-test header, the
  sheet demo's header, the swipe demo's header, the home page's slider end labels). In the sheet demo at phone width the
  title and the count touch; plumber's gap separated them by 16 px but pushed the count off the card, because that
  mock-up is 106 px wide there. The gap is right; the narrow mock-up is a second problem plumber does not name.
- The scrollbar check has never fired on a real app either: no app here writes `overflow-scroll` (searched crafting-ui,
  algorecall, glyphschool, the site, the relay example). When a box always scrolls and already overflows, the existing
  scroll-cue finding outranks it on that element.
- The fixed-height check has never fired on a real app: crafting-ui (7 pages, 619 height classes) and algorecall's
  home at two widths have no such box. Its only proof is a page we wrote. algorecall's other pages could not be read:
  the full read stalls there while the browser pane is hidden.
- The grid form of the shrink check flags one more place on crafting-ui's pattern pages (a collapsible section
  holding a part that scrolls sideways) that looks right today; not judged yet.
- crafting-ui holds three changes made at the owner's word, not committed there: the skill pages' side column
  (`self-start`), the markdown list item (`min-w-0`), and the vocabulary page mounting each live example only near the
  screen. The vocabulary page's placeholder is one height (52rem) while examples run 369 to 884 px.

- Other states (four window widths, the pointer over things) are read by the command line only, and only for
  words meeting words. Not yet: the same in the overlay in the browser; other checks that change with width
  (overflow, clipped text, tap targets); focus and open states; a test of its own; widths taken from the project's
  own breakpoints rather than four fixed ones.
- Which state an overlap is first seen in can differ between runs when the page animates on load (the hero's labels
  were once seen "with the pointer over it", once without).
- Two phone-width findings on crafting-ui are not checked by eye yet: the motion page's timeline label over
  "Cards · 4 f apart", and the swipe demo's text over "9:41". Both sit in animated demos, so they may be a moment
  mid-animation rather than a resting overlap. If so, words that are moving should be skipped.
- Words meeting words is advice only: it names the two texts, it does not offer a class to fix them.

### Writes and speed


- One edited file still marks 1,225 files as changed (about 100 ms per write).
- Several writes in quick succession sometimes reload the showcase page.
- Undo of a 101-file rename takes 7–13 s; where the time goes is not measured.
- A full read is about 2 s on a 1,400-element page (busy laptop, single runs); a fixed 0.6 s wait remains at the end.
- Two neighbours of the repaired fix-card write were not driven by hand: a fix taken on the element itself, and the
  class written after a new theme token.

### The command line

- At 80 columns the report breaks a rule's name across two lines (`[habits/` / `focus-outline]`).

### Tests

The whole suite on vm-agent (2026-11-12): 939 passed, 16 failed in 14 files. Since then the determinism, noise,
one-bar and new-token tests are fixed and pass there on their own; the steady list is what is below.

- Five files fail only inside the full run, under load, and pass alone: apply-all-hot, colour-names, colour-read,
  served-root (timed out at 6 minutes), session-burst. The side-by-side run is too heavy for them, or they race.

- A Next performance wait times out (blueprint-next-performance).
- The timeline undo check is flaky: it passed and failed on the same commit (qa-fixes-2-overlay).
- A frozen-server test fails only when run beside other tests (verify-frozen).
- readiness-panel and text-edit (4 tests): another session has uncommitted changes to these files.
- The new messy-page test was never run against the old code to see it fail there.
- New behaviour without a test: a theme whose radii are named by size.

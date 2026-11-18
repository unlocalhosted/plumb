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
| Warm start: the check's kept result or the server's own | The server's own reading table and receipt | The check's has the ledger applied and is one 230 MB report; the server is asked per place (docs/briefs/server-warm-start.md, not signed off) |
| Warm start: trust it at once or watch it first | Check-only for days, then answer from it | A wrong finding shown confidently is worse than a 41 s wait |
| Where plumber's judging runs as it grows into an editor | In a worker, on a plain-data snapshot of the page; the main thread only reads, draws and answers the hand | An editor needs plumber's cost on the app's main thread near zero, and making that work merely quicker has a floor (docs/briefs/engine-foundations.md, not signed off) |
| Chrome's guidance: before or after packs | After | It adds a rule family; before packs exist every page would pay for it |
| Chrome's Modern Web Guidance: copy it or call it | Call their scanner and keep only a small index of their guides | Four browser teams update it weekly; a copy is stale the day it lands (docs/briefs/platform-guidance-lld.md, not signed off) |
| Which of its guides plumber uses | The 8 UI categories only | Plumber judges what is seen and touched; performance, security and the rest are another tool's job |
| Who replaces a hand-built widget with the browser's own | The coding agent, from a brief; plumber writes only one-class or one-attribute swaps | Plumber writes classes and proves them by re-reading; it does not rewrite event handlers |

## Open questions

- **Button minimum width.** A two-letter label makes a button too small (defensivecss.dev). The least width is a
  number and needs a ground: the project's own buttons, or a published one (Material's earlier buttons used 64). Say
  which, or leave it to the 24px hit-target check.

None. (A call is brought here only when it is destructive, outward-facing, costs money, or is taste the owner has
reserved.)

---

## Doesn't do yet

- **36 test files already failed before 2026-11-17 (2026-11-18).** The full suite on vm-agent (215 files) after the
  memory and speed work: 178 pass, 37 fail. Rerun on the build from before that work (c2eac78c), 36 of the 37 fail there
  too, so they predate it; the 37th (reading-cache) was a regression of the day, fixed. Mostly overlay browser tests
  timing out, a few assertions; one-owner fails because its locator matches both of the fix panel's elements, which
  the overlay has made since before then. Files: blueprint, class-site, cleanup, cleanup-colour, cleanup-colour-cases, cleanup-icons, cleanup-icons-cases, cleanup-messy, cleanup-site, cleanup-spacing, cleanup-spacing-proofs, cleanup-spacing-stage, cli-findings, colour-names, craft, craft-hierarchy, craft-wave7, dock, element-only, element-site, fixpanel, inplace, locate-bench, motion-layout, one-bar, one-owner, overlay, qa-fixes-2-overlay, reach, recipes, rule-docs-link, select, text-card-qa, units, verdict, walk.
- **Component root ranges depend on build order (2026-11-17).** A component's root class ranges reach the session's
  cache only from a build that keeps the component in its graph; a component first found while building another file
  is missing them in every later graph. Which ones depends on file order. Recording them at discovery changed 77
  ownership findings on algorecall; the right answer needs a decision on what ownership should see, then that change
  with its own proof. See docs/briefs/analysis-memory.md, "Component discovery, first pass".
- **A large app's analysis holds 811 MB live (2026-11-17).** Measured after a forced collection. What is left is mostly the rows themselves, shared by the report, indexes and judgement; open-page-first layer 1 is built (556 MB released). Next: skip whole-app judging at start-up (peak and start time), then layer 2 (collect on demand). Provenance judges each input once (8.6 s to 7.0 s; the rest is per-row string keys). Next: number sites and contexts instead of string keys; expansion and existence once per class; component discovery (13.4 s) needs its own reading. Step 1 of `docs/briefs/analysis-memory.md` took the analysis worker's
  heap from 2.17 GB to 1.26 GB; the process rests at 2.46 GB. Step 2 lowered the heap it needs to start from 1.6–1.8 GB to 1.25–1.4 GB. Step 3 was measured and dropped (tens of MB). One copy of each text was tried and undone (texts are held once, at two bytes a character, kept alive by pieces of them in the results; up to about 125 MB if results held their own strings). Results now own their strings (worker at rest 1.24 GB, starts under 1.25 GB). Open: open-page-first analysis, which waits for the owner because the project-wide list would fill in later. Earlier note: On algorecall (3,662 source files) plumber now starts at node's
  default heap limit (it failed 3 of 3 before the module cache was capped) and rests at about 2.7 GB. The engine
  keeps syntax trees, string-keyed maps and per-file sets where small per-file facts would do. Memory also crept
  0.8 GB over 12 changes. The design is proposed in `docs/briefs/analysis-memory.md` (keep per-file facts, not
  trees; files as numbers; links in flat arrays; open page first), waiting for the owner's sign-off.

**Change the class in force (2026-11-13).** One rule (`overlay/src/variants.js`) for every class writer: breakpoints, dark and held states; the box edit, the layout card, Tidy and the shared reader use it. Still to do: a way for Plumber to hold hover/focus, the branch of a condition that is active, the text editor's text-size write, and a check on a running app with responsive classes. The plan is `docs/briefs/xray-propagation.md`.

**The X-ray is Alt+B (2026-11-13).** Blueprint without heat, with the X-ray showing the element under the pointer and the one the list puts in hand. Still to check: the full suite on it (about 40 test files open blueprint; the X-ray's card now appears in them). Earlier note, kept for what must carry over: **The X-ray isn't in Plumber yet (2026-11-13).** The X-ray of the element under the pointer is a working prototype on the design site, and it should replace Alt+B's heat. What must carry over as it is: point at a part and drag it where it is (no mode, nothing drawn on top of the element); the token picker row in the card, where two fingers choose which sides or the value (the direction locks to the swipe, and the thumb resists and then snaps); changes collect for one Sync, and Esc puts them back; Enter opens a note for your agent with the file and line. **A repeated part changes everywhere by default** (every element the same line of code draws, found by its stamp: `peersOf` in `overlay/src/xray.js`), with the other places outlined and "×N places" in the card; Alt as a change starts changes only the one. Sync must write the class at that one line, not once per place.

- **Resizing to a size that isn't one of yours.** A size drag always lands on the nearest step of your theme. Keeping an exact size (say 312px) as a new token through the naming flow isn't built yet; the likely gesture is holding ⌥ while dragging to turn snapping off, then naming the size on the element when you let go. (2026-11-13)
**The order** (decided 2026-11-12):

- **Now:** nothing of this session's.
- **Next:** the Next performance test · the tests that fail only under the full run's load.
- **Decided 2026-11-12:** shadows went ahead of padding-by-job. After padding is snapped to the scale, sibling cards on
  the messy page already agree, so reading padding by job has little to show yet; shadows were a missing primitive.
- **Done since:** a test for themes whose corners and shadows are named by size · the shared role layer · borders (the colour pass already decides them) · timings · the disabled look.
- **Decided 2026-11-12, padding by job:** not built. With no padding named for a job in the theme (a card's inset),
  the only way to pick a card's padding is to count what most cards use, and a count is not a reason
  (docs/PRINCIPLES.md). Padding stays snapped to the scale. Build it for a theme that names insets by job.
- **Decided 2026-11-12, layer order:** not built yet. A z-index move changes what covers what, so a pass may only
  rename a value that already equals its job's layer. crafting-ui names its layers by number (no job); algorecall
  names them by job but is not running here. Build it when an app with job-named layers is at hand.
- **Later:** hover and pressed states · surface levels · shadcn's foreground colours · growing hero
  titles · the speed items · the remaining defensive tips · the 80-column report · the flaky tests.

### Blueprint

- A section that lives in its own file is not counted until it mounts: its problems join the count only once it is
  scrolled into view. (A test used to pin this as expected; it was removed on 2026-11-12 so fixing it fails nothing.)

### Behaviour with no test since 2026-11-12

Tests that only checked plumber's internal functions were removed. These behaviours now have no test of their own, and
should get one through the page (the clean-up's Preview and Apply) or the CLI when tests are next written. The colour
and icon passes' cases, and the palette after a write, were tested again through the page the same day:

- A theme whose corners and shadows are named by size gets no moves and is told why.
- One brand colour building the whole colour system, light and dark.
- Reads staying cheap: no full re-listing of the project on each read (only speed under load is still tested).

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
- A finding on a wrapped element is reported at the component's line, not where it is used; the fix card says
  "Changed X to Y" when Y was added beside X.

### Foundations for the editor, the layout generator and more scan modes

Design signed off 2026-11-13; only the first measurement is done: docs/briefs/engine-foundations.md.

- plumber thinks on the app's main thread: one read of a big page still blocks it for 4.7–7.4 s in total.
- Measured 2026-11-13: at rest plumber costs the app nothing measurable. Open, it took most of the frames; fixed the same day for scroll and pointer (crafting-ui 7 → 46 and 15 → 59 frames a second). Reading no longer freezes the page (judging in 8 ms slices; longest block 0.09 s on crafting-ui, 0.33 s on algorecall). (The 0.8 s and 2.5 s blocks once listed here were algorecall mounting itself, not plumber.) Not fixed: a 0.4 s frame on crafting-ui when scrolled mid-read; judging is still on the app's main thread (the snapshot and worker are not built). On a page with many marked elements in view, a covered element can keep a hit area for a moment after the page moves (a page with a few is exact in its first frame). Tested 2026-11-13 (e2e/page-drawn, e2e/blueprint-responsive); the full suite has not been run since.
- The measuring script is not in the repo yet; it joins it with the budget guard.
- The engine can only judge the live page, not a candidate layout.
- Every rule family is loaded whether or not it is on; there is no notion of a mode that runs on the server only.

### Speed as rules grow

Design written 2026-11-13, nothing built or measured: docs/briefs/engine-scaling.md.

- Every rule is called on every element; a new rule costs the whole page even where it could never apply.
- Any write or late fact re-judges the whole page.
- The command line loads a route once per width, view, hover and gesture, whether or not a rule will read it.
- Fixed 2026-11-13: a late fact judged the whole page again (four to six times a read); now only the elements that asked. Left: page-wide rules still run 2–3 times per element on a big page; the page is still handed over four to six times; no test covers any of it.
- A per-rule timer exists (off unless a page asks); nothing yet refuses a slow rule.
- Algorecall's full read took 30–52 s; now 15–17 s on a warm server (2026-11-13: 811 MB → 52 MB, 889 requests → 26 batches, 18 redraws → 3). Then 6–9 s once the server's 4-a-second file check was paced by its cost (2026-11-13). Not fixed: after a dev server restart plumber's server takes about 41 s to read algorecall before it answers. Cause found 2026-11-13: the server never reads the result `plumber check` keeps on disk (43 s first run, 6.8 s second), so every start redoes the analysis. Design signed off 2026-11-13 (docs/briefs/server-warm-start.md); measured: 0.9 s to check the receipt and 0.7 s to load on algorecall; two cold starts give byte-identical tables on crafting-ui and on algorecall (the latter on vm-agent). Layer 1 built 2026-11-13: the server keeps the table and a receipt after an analysis; nothing reads it back. Second pass the same day: 20.9 MB on algorecall (was 116), built in 30 ms slices (longest hold 0.07 s, was 5.7 s). Layer 2 built the same day: every start checks the kept table's receipt and compares the fresh table with it, answering nothing from it; matched on both apps once the comparison was made of content rather than bytes. Open before the answering layer: the check must run through days of ordinary work first (warm.jsonl beside the table); `plumber doctor --verbose` reports it since 2026-11-13 (starts checked, compared, differed); answers during the build took a median 0.30 s on algorecall with no baseline taken; the ledger regroups findings when it answers (60 vs 29 on one stylesheet), so answering from the table needs that step; the receipt records what every import resolved to since 2026-11-13 and the check re-asks each (algorecall: 60,989 imports, check 0.47–0.49 s, matched twice; its receipt is 15.5 MB of repeated full paths and should become tables before the answering layer reads it); the kept table and its check are tested since 2026-11-13 (e2e/kept-check.test.mjs, six tests). while it is starting the overlay asks for everything several times over; covered by e2e/page-drawn since. The 46 MB left was looked into the same day: one 42 MB answer of class traces, cut; the page is now sent 12 MB, half of it the same reading repeated (tables next).
- The engine fix's saving depends on how often the page is handed over: 2.1–3.1 s with 9–10 hand-overs, 7.5 s with 26.

### What the browser does now (platform guidance)

Design written 2026-11-13, not signed off, nothing built: docs/briefs/platform-guidance-lld.md.

- plumber never says "you built by hand what the browser gives you" (a div modal, a script-positioned tooltip, a max-height accordion).
- A suggestion that uses a modern CSS feature never checks whether the project's browsers have it.
- Read 2026-11-13 (docs/briefs/rule-packs.md §3): modern-web-guidance 1.0.0 has 208 guides; its index carries no triage or rubric as data; its scanner reaches 33 guides. Running the scanner needs the owner's permission (blocked in-session as downloaded code).
- The file lock can let two writers in (specs/lock/, 2026-11-14): needs two deaths and two racing waiters; found by model, never seen. Fixed on main (2e509d9d), model passes 5 processes / 3 deaths. Open: the progress-bar check in e2e/cli-progress.test.mjs ("analysis errors erase…") failed twice in about 20 runs: init reads the project twice and the second read restarts the stylesheet count, drawn only when a frame lands then (frames are 70 ms apart). Fixed 2026-11-14: a restarted count is shown as the step name alone until it passes what was shown; no test forces the timing; the sync form is still taken over while it works past the stale time (by design, said in the code); next models: two Applies at once, the kept analysis and its start-up check.
- Correctness of the checks and the engine (2026-11-14). Done: asked-by-kind equals asked-everywhere on nine real pages; plumber's lines right on one page; a near miss for every check (e2e/packs.test.mjs, 13 tests). "Taking the advice works" is done by hand-applied pages (e2e/packs.test.mjs, 18 tests); open there: advice is applied by my reading, not mechanically, and craft's own rules are not in it. Open, in order: (2) the kind index as a property on generated small pages, not nine real ones; (3) tla-ts (docs/references.md) for the server's state: ledger written by two processes, two Applies at once, kept analysis and its check; (4) a wider set of real apps, with every finding judged and the judgement kept.
- Experience pack (docs/briefs/rule-packs.md §4g): 17 page rules for what only the drawn page shows. Open: a control revealed only on hover is not built (the page cannot show that it also appears on focus without reading the stylesheet for it). The engine change (a loop keeps only what it moves from being judged) has been through the full suite (2026-11-14).
- `components/spinner-silent` now speaks (the engine judges what holds a loop); the older note below about it is out of date.
- Packs on algorecall (2026-11-14): 19 pages judged as a visitor, the inner ones with the copy's loading gate switched off. The cost seen there (296 ms on 15,951 elements) was every rule asked about every element; rules now say what they are about and the engine indexes them (overlay/src/kinds.js): 108 ms to 31 ms on 10,827 elements in a plain browser. Open: not measured inside plumber's own pass or on algorecall again; eleven pack rules are still asked about everything; craft's own rules could say their kind too. A member's own pages (data, onboarding) are not judged. The run used a plain browser with the rule files injected, not `plumber craft`, because the server copy had main's build of plumber.
- Pack tests (e2e/packs.test.mjs, now 7 tests, 128 of 135 checks proven at their line). Open: `components/spinner-silent` cannot speak: the engine skips every element that contains a looping animation (overlay/src/craft.js, `moving`), so neither the spinner nor any parent is judged; that rule of the engine also means one spinner on a page stops craft judging everything around it, which wants a look of its own. `html/hero-priority` and `html/img-oversized` need a real large image in a fixture. Running `node scripts/test.mjs e2e/packs.test.mjs` started the whole suite on the laptop (a file the runner does not know yet?); run it with `node --test` until that is understood.
- HTML pack (docs/briefs/rule-packs.md §4f): 34 page rules from Chrome's html guide. Open: no tests; 7 unproven because the test page cannot be that page (page-lang, viewport-meta, zoom-disabled, quirks-mode, lazy-above-fold, hero-priority, img-oversized); page-wide findings are said on the first judged element, which is an arbitrary place to draw them; the four packs together cost 113 ms on a 10,827-element page, not yet looked at for speed.
- Components pack (docs/briefs/rule-packs.md §4e): 37 page rules from Chrome's ui-components guides. Open: no tests; the spinner check never speaks through the engine (cause not found; it is said on the spinner's parent because animating elements are not judged); two dialog checks (aria-modal on a real modal, page locked with overflow hidden) need an opened modal and are unproven; toasts, hovercards, tours, drawers and the dark-mode toggle have no checks (their advice is behaviour over time, not a drawn state).
- Forms pack (docs/briefs/rule-packs.md §4d): 33 page rules from Chrome's forms guide. Open: no tests; never run on an app with real forms (algorecall's sign-in is the first to try); the 2 source items (paste blocked, Enter during composition) are not built because a pack is either page or source today; page language (`<html lang>`) belongs in the accessibility pack and is not built.
- Packs (docs/briefs/rule-packs.md §4b, §4c): 31 rules built from Chrome's guides, 24 accessibility (page) and 7 security (source). Open: no tests of any of them; source findings are not drawn on the page; the overlay shows accessibility findings as craft ones; on by default (owner's call whether new warnings may fail an existing project's check); about 80 accessibility items left that need source, a gesture or the document; next guides to sort: forms (129 items), ui-components (212), performance (109).
- Rules now come from these guides as packs (docs/briefs/rule-packs.md). Built: the pack seam, and an accessibility pack with one rule (`a11y/control-name`, from the accessibility guide §3). Open: the guide's other ~106 accessibility items; the overlay does not yet show packs apart; the CLI cannot run one pack alone; nothing tested.
- Method worth borrowing for our own rules: sort each by "can it be seen" and "how big is the change"; score a check on apps it was not written against.

### Defensive checks

- Seen catching slips only on pages we wrote; no real app with the mistakes has been read.
- One check's fix can raise another check's finding on the same element (a background makes a box count as a card).
- Of the 25 defensivecss.dev tips, 20 have a check; every check on the list is built. The rest are sorted in docs/research/defensive-tips.md:
  - The left-over-space check's second form (a wrapping list spread by justify-between, 2026-11-13) has never fired on
    a real app: crafting-ui's spread rows all hold a title and its controls, not a list. Proven on a list of tags put on
    a page by hand.
  - Open question: a button's least width (needs a number with a ground).
  - Will not be checks (4): auto-fit vs auto-fill, CSS variable fallback, grouping vendor selectors, image maximum width.
  - The CSS behaviour each check rests on is to be re-read and linked when the check is built; only the tip pages were read.
- The list-wrap check finds one place on crafting-ui: the three figures on the templates page (styles, skills,
  scripts), mapped over a list written in the code. It fits at phone width; it is a fixed set the check cannot yet tell
  from a list. Its first version flagged 16 places, all wrong (see the journey).
- The left-over-space check fires on 5 places on crafting-ui (pattern pages' figure switch and hand-test header, the
  sheet demo's header, the swipe demo's header, the home page's slider end labels). In the sheet demo at phone width the
  title and the count touch; plumber's gap separated them by 16 px but pushed the count off the card, because that
  mock-up is 106 px wide there. The gap is right; the narrow mock-up is a second problem plumber does not name.
- The stretched-picture, tiling-photo and fixed-column checks (2026-11-13) have never fired on a real app: crafting-ui's
  11 main pages are quiet (it writes every fixed column behind a breakpoint, and has no background photos). Their only
  proof is three cases put on a live page by hand, read through plumber's full read, fixed, and read again clean.
- The fixed-column check's line, fixed widths taking half of a 360 px phone, is invented and not yet tuned on a real app.
  Its fix goes behind the smallest Tailwind breakpoint where they take at most half the screen, not the project's own
  breakpoints.
- The read keeps an element's result until its own or its parent's classes, or its own words, change. A check that
  depends on a neighbour (a picture stretched because the words beside it grew; a sticky column) is not judged again
  when only the neighbour changes. Seen while testing the stretched picture.
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

### Seeing a screen whole: guides, and what lintapple does that plumber does not (2026-11-15)

Direction under discussion with the owner, nothing built. Sources: docs/research/alignment-discourse.md and the four
2026-11-15 entries in docs/references.md.

- **Guides.** Read every drawn left edge, centre and right edge across a whole screen, group them into guides, draw
  them on the page, and judge from the guides (how many, how many things on each, how close two are). Open: when two
  regions should share a line; the numbers for "near miss" and "strong guide" need a source or measurements.
- **Open question for the owner:** is the overview (one verdict and the top few notes per screen) the product, or do
  these feed the findings list? How far beyond visual judgement should it go (wording, structure, flow)?

From reading lintapple's source (read, not run; plumber's side only skimmed, so each line is "likely missing"):

- **Say what was not measured, everywhere.** Three answers per check (passed, failed, could not tell), a count of how
  many things of each kind were actually checked so an empty pass shows as empty, and exceptions that need a reason
  and are listed in the report.
- **Measure what is painted, not the box.** The part of an element left after its ancestors clip it; boxes under a
  scale or flip; text that lives in ::before and ::after; text cut off by a clip as a finding of its own.
- **Refuse a contrast verdict when it cannot be trusted** (opacity, filters, blend modes, shadows in the way), and
  cover placeholder text and text inside SVG.
- **Screens reached by acting.** A written plan (click, type, press, then wait for a named thing) so an open dialog,
  an error state or an open tooltip is checked like any page, and tooltips opened by themselves and re-checked at each
  window width.
- **Keyboard behaviour.** Tab reaches the control, a focus ring appears (found by comparing styles before and after
  focus), nothing covers the focused control, a dialog holds focus and gives it back, tabs and menus answer the arrow
  keys. A different product area; parked here.
- **One problem, reported once,** with every size, theme and state it was seen in.
- **A contract for coding agents:** run on every changed screen; never loosen the settings, add an exception or remove
  a mark to pass.
- **Small checks:** numbers in table cells right-aligned with equal-width digits; a font file that failed to load;
  the page scrolling sideways; phrases the project bans.

### The design site against the product (checked 2026-11-15)

Owner: "check if something is still not aligned from design to here". Each design part (web/design/parts) against
what the overlay draws, by the modules each imports and by eye in the browser.

- **Fix bar: not in the product.** The design's one-line bar (headline, detail, "3 of 60", Clean up all) with the
  choice made on the element is a comp; the overlay still ships the old card (the design page says so itself). The
  on-element picker for the fix is also still to be ported.
- **Buttons: not in the product's fix flow.** The designed soft block (kit.js `button()`: lit top, side lip, key cap,
  press and spring) is used only by the text editor; the fix card and the bar draw their own flat `primary`/`ghost`
  buttons and `.pl-act` pills.
- **Soft blocks (Identity): used nowhere in the product.** soft.js is imported by no product surface.
- **The round face: not in the product's cards** (the Type page says so itself); `--pl-round` is in the token file only.
- **Aligned:** the X-ray inspector (xray-live.js is shared by the design page and the product), pills and the box-model
  icons (boxmodel.js), the clean-up's chips (show.js), the fields (field.js), the burst (burst.js), the name tag (nametag.js).
- **Not sure:** the inspector card was dark on a light page in the product (it may follow the system's dark setting,
  not the page's ground, as the roast bar did before it read the ground); its header says "Point at a part or a
  number" where the design shows the control row and the component's name (a plain button has no component name).
### Breaking a screen on purpose (2026-11-15)
Asked by the owner after a post listing three ways to break a screen before users do: double every label, turn the
system text size all the way up, make the main action fail. Plumber judges the screen as it is drawn; none of the
three is a state the page reaches by itself. - **Built (layer 1):** Alt+S opens "Break it" with one toy, Longer words, which stretches only words that can change
  (passed into reusable parts, list items fed from elsewhere, data). See the journey entries "Breaking the screen on
  purpose: longer words" and "Break it stretches only words that can change".
- **Owner's direction (2026-11-15):** stress what can change and what people interact with. Fixed copy in a one-off
  component is stressed by the space around it (narrow widths, text at 200%), never by its words. Chosen for the
  first version: extreme content in data slots and props, typing into fields, lists at 0, 1 and 100, and a failing
  or slow main action.
- **One "Break it" switch on the live page,** three toggles that change the page in place (longer words, bigger
  text, the main action's request answered with an error), the page left usable, and off puts everything back.
- **What it marks:** text cut off, pushed out or overlapping; text that stays the same size when the reader's size
  goes up (set in px); after a failed action, whether anything told the person, whether the button came back, and
  whether a spinner never stops.
- **The same three in the headless run,** as more passes beside widths and dark, for the agent contract.
- **Narrower and Bigger text, built; open:** Plumber's own overlay loads inside the narrow copy. The sideways scroll under bigger text does not name its cause.
- **Longer words, not yet:** button values and aria-labels are not stretched; a same-file prop is told apart from fixed copy only by which line it sits nearer; nothing groups one cause seen in many places.
- **More toys asked for (owner, 2026-11-15: "stress testing of various different component and interaction"):**
  - *Empty and huge data:* every list shows none, one, and a hundred items; a name 60 letters long; a number with
    nine digits; a missing picture.
  - *Slow:* every request takes four seconds, to see whether loading is shown, whether layout jumps when it lands,
    and whether a second click sends the action twice.
  - *Double click and fast hands:* the main action clicked twice quickly, a dialog closed while it opens, typing
    before the page is ready.
  - *Narrow and touch:* the screen at 320px wide, every target checked against a finger's size, hover-only things
    found (nothing on a touch screen can hover).
  - *Keyboard only:* the mouse taken away; Tab walks the screen and plumber marks what it cannot reach or where the
    focus ring disappears.
  - *Right to left:* the page flipped to Arabic or Hebrew direction; icons that should mirror, and margins set on
    one side only.
  - *No motion and high contrast:* reduced motion and forced colours on, to see what loses its meaning.
- **Lists, built; open:** a list drawn from a value computed inside its part (a filter, a memo) is not reached; when
  a crash takes the page down, the lists after it are not tried.
- **Break it, fixes:** F previews a fix on the page for text sizes, growing fields and lists; words that run out of
  their box, a failed action and a crash have no fix to show, and none is written to source; Narrower does not see text cut off by a box that clips it (the crafting-ui hero at 320px).
- **Open:** which control is "the main action" when a screen has several (hierarchy already ranks emphasis); and how
  to fail a request when the app uses something other than fetch.

### Writes and speed


- One edited file still marks 1,225 files as changed (about 100 ms per write).
- Several writes in quick succession sometimes reload the showcase page.
- Undo of a 101-file rename takes 7–13 s; where the time goes is not measured.
- A full read is about 2 s on a 1,400-element page (busy laptop, single runs); a fixed 0.6 s wait remains at the end.
- Two neighbours of the repaired fix-card write were not driven by hand: a fix taken on the element itself, and the
  class written after a new theme token.
- The whole-app report now builds in the background (journey, 2026-11-18). On algorecall its first build pauses at
  least every 0.3 s. After an edit, the restarted build still runs 1.3 s in one piece: every file's classes are
  gathered again into one list (about 0.7 s), and the garbage collection that follows takes about 0.6 s.
- Nothing on screen says the whole-app list is still building. The worker reports it (`wholeApp` in health:
  building, ready, or when asked); the overlay doesn't show it yet.

### Plumber on its own design pages (found 2026-11-14)

The owner asked why Plumber did not flag, live, the values typed by hand on the design site's Messages and Surfaces
pages (73 spacings, 22 type styles, a dozen corners and timings, all beside tokens that exist). Tried: `plumber check`
in `web/` read 19 JSX files and 2 stylesheets, reported 22 findings (13 dead variables, 6 "no tokens", 3 dead classes),
and none in `web/design/parts`.

- **Styles written as text inside a JavaScript file are not read.** The design pages (`web/design/parts/*.js`) and the
  overlay itself write CSS in template strings; the check counts those files as "other" and skips them. The overlay on
  the page can't point into them either: they are drawn inside a shadow root from a string, with no place in the code
  stamped on each element.
- **Tokens that are CSS variables, not a Tailwind theme, are not a scale to Plumber.** The system's tokens live in
  `overlay/src/tokens.css` as `--pl-*`. The check answered "no tokens" six times for the site, so even a stylesheet it
  does read has nothing to be compared against.
- **Open question for the owner:** move the design pages to JSX with classes on a theme Plumber can read (it would then
  check its own site, live), or teach Plumber to read plain CSS and CSS in strings against variable tokens (useful to
  every project that isn't all Tailwind, and much more work). Not decided.
- **Probe, same day: plain CSS already works on the command line.** A four-file React project with `.css` files and
  `:root` variable tokens got four right findings with fixes (`padding: 18px` → `var(--spacing-4)` or `-6`, a 9px
  corner, a 15px size, `margin: 0 0 7px`). Two limits: tokens named `--space-*` were not seen as spacing until renamed
  `--spacing-*` (the config's `decisions.<family>.from` may cover it; not tried), and the live overlay can't write a
  fix into a `.css` file (journey: the homepage's cards "can't take a size class"). CSS in template strings is still
  unread apart from a literal `<style>`.
- **On the site's homepage, same day.** The check read all nine of the homepage's plain stylesheets, and every one of its
  22 findings came from one blind spot: the site puts the overlay's token file on the page at runtime, read as text
  (`web/site/tokens.js`), so no `--pl-*` token exists for Plumber. 13 findings say a token is "never defined" (false);
  6 say "no tokens", hiding 157 values (66 spacing, 34 colour, 44 type, 10 radius, 2 motion, 1 layer). With the token
  file imported for one run: the 13 false findings went, colours were read (34 unchecked → 4), but spacing (65), type
  (45) and radius (10) stayed unchecked, and the run said it skipped the token file as outside the project. Causes, as
  far as read: tokens put on a page by script are never seen; a token file outside the project's folder is skipped;
  and token names with a prefix (`--pl-space-*`, `--pl-radius-*`) are not taken as spacing or radius, as `--space-*`
  was not in the probe.
- **Proposed, same day (owner: "a smart parser where we can parse the tokens from various files, as it's hard to
  always get a pre-defined shape"):** today a token's kind is decided by its name alone, nine Tailwind prefixes
  (`familyFor`, src/decisions/index.ts: `--spacing-*`, `--radius-*`, `--text-*`…). Proposed: decide it from several
  signals, deterministically, and say which ones decided: how the variable is used (`padding: var(--x)`), what its
  value is (a colour, a duration, a shadow, a length), the words in its name after any prefix (`--pl-space-4`,
  `--acme-radius-card`), and whether it belongs to a scale (siblings with one stem and ordered values). Separately,
  read tokens wherever they live: any stylesheet, a file loaded by a script, `:host` blocks, a JS theme object, a
  DTCG file. Config still wins over a guess. Not started; waiting on the owner.
  Owner, same day: "generate one config file where the user can see visually how his design system is being
  interpreted by plumber". Two pieces exist to build on: `plumber init` already writes each family's token sources
  into the config, marked `inferred: true` (src/adoption/init.ts), and the project page already draws each scale's
  steps with how many places use them (src/project-page/system.ts: text size, weight, radius, colour; not spacing or
  motion). Missing: the config saying why each token was taken as what it is, and the page showing it, so a wrong
  reading is seen and corrected in one place.
  **Slice 1 built (journey 34):** a token's kind from value, use and name (`src/decisions/infer.ts`), and `:host`
  as root. Since: token files a script reads by path, and `:host()` selectors read without a crash. Since: whole text styles count by their parts; each token's reading is printed by `plumber decisions` and written into the config by `plumber init`. The project page walks it in four steps (found, fit, decide, your system). Since: the page writes the chosen system (aliases, no renames or deletes, one Undo); the lesson's Set it up writes the config and records today's state (Undo covers the tokens, not the config). Left: removing the aliases once nothing uses the old names; a written system isn't recorded in the config yet; colour: roles that hold a raw colour the palette doesn't have (nearest instead of equal), and roles missing for a job; declarations in stylesheets outside the project's folder aren't counted (the site's ~30 uses of `--t-*` styles live in ../homepage), so the page says its 18 text sizes are unused; motion tokens resolve to their reduced-motion value; a line can only be moved in the config, not on the page; the reason for each reading written to the config and shown.

### The command line

- At 80 columns the report breaks a rule's name across two lines (`[habits/` / `focus-outline]`).

### Tests

- Failing before 2026-11-14's token work and still failing (vm-agent, each file alone): select (1 test), element-site (2), locate-bench (1), cli-findings' 80/140-column report (1), page-drawn (2). timeline and apply-all-hot fail only in a crowded full run.

- After an undo that reloads the page, closing the timeline with Esc does not always hand focus back to the history
  button (timeline test, fails side by side on vm-agent, passes alone). Possibly the button is not focusable on the
  reloaded page at that moment. Not looked into further; found while preparing 0.5.0.


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
- A cached run on a slow machine (about 350 ms on the test server) can flash the progress bar: the delay is 300 ms. The test no longer depends on machine speed (2026-11-15); the product behaviour is unchanged.
- On pages past React's 10,000 recorded creations (development), a part a library draws is not placed, so its findings drop from that run (two on algorecall's problems page, 2026-11-15). Could be placed another way (the owner's file and the component's name, when only one usage matches); not built.
- A page-wide finding on algorecall's showcase names its sticky header (line 58), not the root `<div>` on line 57: the root is probably not among the judged elements while its children animate in. Right file; not checked further.
- `cleanup-spacing-proofs` "one rhythm for the site" is a race on main too (2026-11-15: main failed 2 of 3 runs alone on the test server, this branch 1 of 3): page two's reload is aborted, likely by the dev server reloading it after page one's write at the same moment. Not looked at.

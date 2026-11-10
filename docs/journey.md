# React Plumber: the journey

How the work went, as it happened. Newest chapter last. Shipped work is listed by week at the end; what is still open
is in **Open gaps**.

## Chapter 1 · Alt+click has to find the line (0.4.0, 2026-11-05 → 11-07)

**The itch.** 0.3.0 was tagged but never published, and on Next.js the overlay often could not say where an element
was written. The owner: "this is unacceptable … how can we say we can edit code if we cant find the line". And on the
first measurements: "this is not real testing".

**How we found it.** A locate bench (`bench/locate`, the tool that clicks every sampled element through the overlay's
own `locate` and checks the answer against the exact position written into the build) ran first on our 40 showcase
screens, then on three real open-source Next apps: tailwindcss.com, magicui and shadcn/ui.

**The system behind it.** Only Vite wrote each element's source position into the page at build time ("stamps").
Next.js never did, so every answer there was a guess from React's debug stacks: server components were never found
(0 %), and on magicui a quarter of the guesses pointed at the wrong file. Stamping was optional and failed silently.

**What we tried, what we chose and why.**
- Considered forking bippy (the library that reads React's internals). Research showed its active branches were an
  unrelated package; the one useful change was on its main branch. Not forked (`docs/research/bippy-branches.md`).
- Chose: stamping is mandatory on every host, and every element gets one of three answers: your JSX line, the line
  where you used a library, or "not in your code" with the reason, never a guess shown as fact
  (`docs/briefs/stamping-everywhere.md`, signed off by the owner).
- Patterns borrowed from debuggers and devtools: a line table built at compile time, identity by content hash,
  refusing instead of sliding to the nearest line (`docs/research/meta-tool-patterns.md`).
- Dead ends: full stamping crashed Headless UI's `Menu` (a stamp is a prop, and the menu rejects props), so only DOM
  tags are stamped; a bench comparison that read one file under two spellings first reported 100 % wrong answers;
  a 250 ms delay first blamed on the bench turned out to be Next itself (~230 ms per route-handler call on a large
  app, same as the app's own `/robots.txt`).

**The fix and the proof.**
- Next stamps through `withPlumb`, on webpack and Turbopack; Vite stops with the line to move when stamping is off;
  the overlay says "Source stamping isn't running" instead of guessing; `plumber doctor` exits 1.
- Library-drawn elements (icons, portals, `next/link`) answer with your usage line, accepted only on an exact JSX
  opening the build recorded.
- Writes are safe under hot reload (temp file + rename, hash checks, retry keys, answers re-asked after an update).
- A small local server beside Next's route makes a click on a large app 13 ms instead of 255 ms, with tested
  fallbacks (HTTPS, strict CSP, unreachable port, two apps, restart).
- Real apps (`README.md`, "Compatibility and performance"): tailwindcss.com found 40.2 % → 99.3 %, 842 of 842 exact,
  server components 0 % → 98.9 %; magicui 42.9 % → 97.8 % (Turbopack) and 17.2 % → 90.8 % (webpack), 0 wrong files.

**Media hooks.** A before/after table per app (the README numbers); a screen recording of Alt+click on a
tailwindcss.com server component, 0.3.0 vs 0.4.0; the magicui click timing, 255 ms → 13 ms.

## Chapter 2 · The tests could not tell a bug from a tired laptop (2026-11-10 →)

**The itch.** Releasing 0.4.0, every answer to "will fixing these bugs make the suite green?" got worse: 8 failures,
then 15, then 50, while one run was still going. The owner: "tests are just thrown as second order effect and we
really haven't spent much time thinking about how to put them properly for maximum iteration speed", and
"playwright test keep hoggin all the memory and keep being a bottleneck".

**How we found it.** By sorting the 50 failures in the release log by kind instead of by subsystem. 41 were
time-outs (24 child processes that never came back, 13 tests past their limit, 4 browser waits); about 9 were real
assertions. The laptop had 2.1 GB of swap in use. One test "ran" for 65 minutes.

**The system behind it.** 195 test files, each written alone with its own copy of the setup: `fixture()` in 39
files, `browser()` in 37. A fresh Chromium and a cold dev server per test. One runner command, everything, one file
at a time. Nothing killed what a timed-out test left running, so each failure made the next more likely. Full
numbers: `docs/briefs/test-system.md`.

**What we tried, what we chose.** The owner asked whether Bun would be faster. Not tried: Node starts in 0.17 s, and
the time is in browsers, dev servers and installs. Chosen: five layers, the runner first because it needs no change
to any test file. Files get a cost tier read from their source, run side by side inside a slot budget, and each
runs in a process group that is killed when it ends.

**The fix and the proof.** Layer 1 is built (`scripts/test.mjs`). So far proven only in the small: three files side
by side in 18 s on the laptop, with the two census failures from the release log reproduced by name in 8.6 s.
The full comparison (one at a time against side by side, on vm-agent, same commit) is running; its numbers go here.

**Media hooks.** A bar of the 50 failures split by kind (41 time-outs, 9 assertions); the wall-time before/after
once the vm-agent runs finish; the memory sampler's line (`mem.log`) for both runs.

## Chapter 3 · A stamp was a habit, not a thing (2026-11-10)

**The itch.** The project's type ladder came out different depending on which page asked. Three tests in the
release run said so (`census.test.mjs` twice, "one site, one ladder" in `cleanup-site.test.mjs`).

**How we found it.** The new runner reproduced the census failures in 8.6 seconds, which made them cheap to chase.
One assertion said 55 kept readings were stale when none should be: every reading, not some.

**The system behind it.** A stamp is the string `file:line:col#hash` on each element. A commit in 0.4.0 made its
path count from the repository root. The census still counted from the project root, so in any project that is
not the repository root no file was found and every reading was dropped. Nothing failed to compile, because a
stamp is parsed by hand in 23 files; it is a habit, not a type.

**The fix and the proof.** One line in `src/census.ts` (788a11d): look the file up from the repository root.
`e2e/census.test.mjs` went from 2 failed to 2 passed, and "one site, one ladder" passes. Not fixed: the habit.
`docs/briefs/engine-architecture-review.md` proposes making `Stamp` one module, first of eight steps.

**Then the habit itself.** The owner chose the stamp as the first engine step. One module on each side now owns
it (`src/stamp.ts`, `overlay/src/stamp.js`), and a guard test fails when a stamp is taken apart anywhere else.
Moving 19 overlay files onto it showed a second bug of the same family: three callers compared a stamp's file with
the server's in three ways, and the fix panel's never matched below a repository's root, so "N copies" came out NaN.
One comparison (`stampNames`) fixed it; `F8-05` in `e2e/qa-fixes-2-overlay.test.mjs` passes. A dead end on the way:
the new overlay file was a 404 and the whole overlay went blank, because the files a host serves are a hand-kept
list. Found in one failing 3-second test.

**And the sentences.** The overlay decided what to do by matching the server's error sentences in 14 places
(`/changed since/`, `/already undone/`). A refusal now carries a code from a closed list, across threads and HTTP,
and the overlay reads the code. Proof: the codes asserted through HTTP in three test files.

**Media hooks.** The before/after of the census test (8 seconds each); the count "23 files parse a stamp by hand";
the fix panel's "NaN copies" against the right number.

## Open gaps

- Engine architecture: eight proposed steps in `docs/briefs/engine-architecture-review.md`, none built, waiting on
  the owner's order.
- Still failing and not diagnosed: `decisions-spacing` (spacing policies).
- **Nothing says when a write's reload is over.** The dock says `ready` on a reloaded page before what was open
  (Blueprint, a card, the History strip) is back. The "history cluster" was three faces of this: the panel saying
  Undone twice (fixed, 2026-11-10), a test pressing Esc in the gap (fixed in the test), and `timeline`'s first test,
  still flaky. "Execution context was destroyed" in other browser tests is the same thing. The fix is one signal
  the page gives when it has settled after a write, used by the test harness and open to agents: it is where the
  test system's harness layer and the overlay's mode machine meet. Not built.
- `e2e/site-text` cannot start anywhere: `site/` has its own dependencies and no step installs them.
- About 420 engine errors still carry no code.
- Test system, layers 2–5 (shared harness with one browser per file, run-what-changed, time budgets that fail, one
  command for the full run on vm-agent) are specified in `docs/briefs/test-system.md` and not built.
- The side-by-side runner is not yet proven against the one-at-a-time run on the full suite.
- A first click during React hydration on Next webpack answers from React's stacks about 1 time in 6; an unproven
  fix is kept at `docs/briefs/hydration-first-click.patch`.
- Library-drawn elements inside server components, and lines inside MDX pages, are not answered yet.
- On webpack, fewer library elements map back to your usage line than on Turbopack (magicui: 92 against 228).
- CSS Modules, PostCSS output, Tailwind v3 and CSS-in-JS are found by line but not yet judged or fixed in full.
- shadcn/ui was left out of the runs: its dev server alone used about 10 GB.
- The homepage's recorded demo (`site/src/hero/replay.js`) still answers the retired reading card; it needs
  re-recording before the site is deployed again.

## Shipped · 2026-W45

- *(0.4.0, pending publish)* Alt+click finds the exact line on Next.js, server components included, and never
  guesses for your code — see Chapter 1.

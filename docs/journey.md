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

## Chapter 2 · The app's hidden rules (2026-11-07)

Told in the order it happened, each step starting from the owner's own prompt.

### 1. "find all of the implicit state machines in my app"
**The itch.** Nothing visible was broken. The worry was the kind of bug that only shows up when a person does two
things at once: presses Esc mid-write, presses Enter twice, closes a panel while something is still loading.

**How we found it.** A read-only audit, split by area across two background agents: the browser overlay and the Node
engine. The worst claims were checked against the code before they were reported. Result: 27 machines in the overlay
and 21 in the engine. Almost all are a handful of booleans or a mode string changed from many places, with no single
state and no list of allowed moves. `docs/state-machines/overlay.md`, `docs/state-machines/engine.md`.

**The system behind it.** Modes kept as loose flags. "Is a write running?" and "what is the panel showing?" were one
fact, so closing the panel mid-write made the write's result land nowhere.

### 2. "Yes, start there": the Fix panel and Esc
**What we chose.** Write a short spec first, then give the panel one phase with a table of allowed moves, plus a
separate "flight" for the write in progress (`docs/state-machines/fixpanel-spec.md`).

**A dead end that told the truth.** The first reproduction of "Esc while a fix is written" didn't fail where the audit
said it would. The write landed and History even showed its Undo. The real bug was the reload the write caused: a
resume record that always said "Blueprint on" brought Blueprint back with the next fix in hand, overriding the
person's Esc. The fix makes that record follow what the person actually did.

**The decision.** Esc mid-write leaves Blueprint (the write still lands safely) rather than being ignored until the
write finishes.

**Proof** (`190efd1`). The e2e test "Esc while a fix is being written…" fails on the old code and passes now.

### 3. "where is memory going?" / "continue fixing will run the test later on vm-agent"
**The constraint.** The 16 GB laptop was swapping. About 2.9 GB was Claude sessions (two running over a day), 2 GB was
a glyphwrite ML job, and 0.8 GB was Cloudflare WARP. Local browser test runs were stopped, and the owner moved the full
suite to vm-agent. From here each fix was checked with targeted tests only, one at a time.

**What shipped in this stretch.**
- The words editor (`78bee38`): keys work again while words are being saved.
- Clean-up (`2d49db8`): one run at a time, so Esc during the show writes nothing and Enter twice writes once.
- The page reader (`630d16f`): an old request can no longer stall a new reading.
- Drags (`87fb314`): every drag has a cancel path.

A separate session fixed four engine bugs in parallel: a crashed worker is replaced, the census crawl exits when a page
fails, undo grouping is kept per call, and a dead branch was removed.

### 4. "find every invariant my app relies on but doesn't explicitly enforce"
**How we found it.** Three agents (overlay, engine, boundaries) found 62 assumptions nothing checks. 21 are in the
overlay, 20 in the engine, and 21 where data crosses a boundary: browser to server, process to process, disk to memory.
The worst ones were checked against the code before they were reported. `docs/invariants/{overlay,engine,boundaries}.md`
(in the main checkout).

**The system behind it.** The same habit as step 1, in three more forms:
- **Every writer guards itself.** Some read files as UTF-8 without checking, some wrote in place where a crash could
  leave half a file, and rollbacks swallowed their failures.
- **Boundaries trust their input.** No request was checked. Errors were English sentences the browser matched with
  regexes, and any refusal came back as `null`.
- **Records assumed one process.** Change ids came from an in-memory counter, so two dev processes on one project
  handed out the same ids. The ledger had no version and no lock.

### 5. "please fix the result of the above"
**What we chose.** Fix the four habits, not the 62 sightings, worst first, running independent work in parallel:
- **One write path** (Fable, `fcb6bee`…`d03077e`). Every write to the user's files goes through
  `src/write/source-file.ts`. It decodes strictly, keeps line endings and the BOM, publishes by temp file + fsync +
  rename, verifies by re-reading, and names any rollback that failed. Proof: 6 e2e tests; for example, a Latin-1 file is
  refused and left byte for byte as it was, and a CRLF file stays CRLF.
- **The overlay's own invariants** (`c8ad64c`, `d3ff27c`, `0a0eccb`). A change being written can't be discarded, the
  words editor keeps React's text nodes, plan indexes stay in range, findings get unique keys, and the overlay survives
  being moved.
- **Boundaries** (Fable, `37e6744`…`2a9d210`; overlay `b43a458`, `28b68f3`). A request schema per endpoint, stable
  error codes, versioned and locked records, and `apply-all` writing only CSS the server proposed. The browser reads
  errors by code and falls back to the old English for an older server, so a tab left open across an upgrade keeps
  working. Proof: two engines on one project no longer collide on ids, and `body{display:none}` sent from a tab is
  refused.

### 6. "Yes, merge it" / "run it" / "Yes, merge it"
The engine-fixes branch was merged in (`0d6e39f`). Six conflicts each kept both fixes, and 10 targeted test files
passed. A sibling session had meanwhile turned the three fixed overlay machines into declared `@machine` tables checked
by a tool. On "run it": the checker reported 0 findings on all three files, and the three browser tests passed. The two
that had never run were proved to fail on the old code. Then that branch was fast-forwarded in (`645a294`).

### 7. "all these bugs fixes merged ?" / "After vm-agent passes"
Not yet. Everything sits on `explicit-machines`, which contains all of origin/main, so merging will be a
fast-forward. It merges only after the full suite passes on vm-agent. The one known failing test (the concurrent-save
race, built for the old in-place write) was rewritten for the new write path (`e76f069`); `edits.test.mjs` passes
24/24.

### Media hooks
- A before/after clip: Esc mid-write. Before, Blueprint reappears after the page reloads; after, it stays off and the
  History toast offers Undo.
- A side by side of a CRLF stylesheet in a hex view, before (mixed line endings) and after (all CRLF).
- A chart: 48 state machines and 62 invariants found → fixed, by area. The numbers are in the audit docs.
- The memory breakdown from step 3, as the reason the tests moved to vm-agent.

## Chapter 3 · The tests could not tell a bug from a tired laptop (2026-11-10 →)

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

## Chapter 4 · A stamp was a habit, not a thing (2026-11-10)

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

**And a dead end of my own.** I then gave refusals a code so the overlay would stop matching the server's sentences,
and built it against the release branch. `main` already had it, done three days earlier and further (a closed list
on every error, an API contract, `errorIs` in the overlay), along with the single write path and the request schemas
my review had proposed as next steps. I had reviewed and built without looking at `main`. The duplicate was reverted
(c6aa036) when the branches were joined; main's is the one system.

**Media hooks.** The before/after of the census test (8 seconds each); the count "23 files parse a stamp by hand";
the fix panel's "NaN copies" against the right number.

## Chapter 5 · Every Apply reloaded the page, and it was us (2026-11-10)

**The itch.** The owner: "even in vite, during apply changes the whole app reloads, this is not the experience i
like to have".

**How we found it.** A throwaway script: a page with a clicked counter and a typed input, a write, then count the
page's `load` events and read the hot-update socket. A plain class change hot-swapped in an app with Fast Refresh.
An Apply with a theme token did not: the socket showed `full-reload`, sent by our own Vite plugin. Logging what the
plugin held showed the file behind it: `.plumber/cache/changes.jsonl`.

**The system behind it.** Three things, one of them ours and silly. Our plugin reloaded the page for any written
file that no module reads, and our own change log is such a file, written by every traced Apply. It also reloaded
for theme stylesheets on a guess that measuring disproved. And the demo and 85 test fixtures run with no Fast
Refresh at all, so we built and tested the overlay on a page that always reloads, and grew a whole "put back what
was open after the reload" machinery around it, which is where the flaky history tests came from (chapter 4's
last gap).

**What we tried, what we chose.** First try: stop forcing a reload for theme stylesheets. The measurement script
went green, the real test did not; the change log was still forcing it. Second: only the page's own HTML forces a
reload. That broke the "exactly one reload" promise for apps without Fast Refresh (Vite reloaded once per module),
so the plugin now checks, as Vite does, whether something accepts each held module, and sends one reload when
something does not. Considered and not chosen: patching the DOM ourselves when nothing accepts the update; it would
hide a page that disagrees with its file.

**The fix and the proof.** `src/hosts/vite.ts` (d379af4). `e2e/apply-all-hot.test.mjs`: with Fast Refresh, an Apply
that adds a token and changes two files causes no reload, the counter still says "clicked 1" and the typed words
are still there; without it, one reload as before. The plan for the rest: `docs/briefs/no-reload-writes.md`.

**Next, measured.** The owner asked for Next first. `bench/hot-writes/next.mjs` ran on vm-agent: eight writes
(a class in a client component, in a server component, an Apply across both, an Apply with a new theme token; on
webpack and on Turbopack). Zero reloads, state kept every time, the new class on the page in 0.6 to 1.5 seconds.
Next was never the problem; the reload was Vite-only and ours.

**Media hooks.** A screen recording: type in a field, press Apply, the words stay (before: the page blinks and the
field is empty). The table of five writes, before and after. The Next table: eight rows of zero.

## Open gaps

- Writes without a reload: the demo is on Fast Refresh now; the 85 test fixtures are not, and no readiness row says
  "Fast Refresh is off". Next 15, the pages router and layout writes are not measured. See
  `docs/briefs/no-reload-writes.md`.
- Engine architecture: `docs/briefs/engine-architecture-review.md` was written against the release branch; `main`
  had already built its error codes, single write path, schemas and several machines. What is still new in it: the
  Stamp module (built), one value resolver, the snapshot split.
- Still failing and not diagnosed: `decisions-spacing` (spacing policies).
- **Nothing says when a write's reload is over.** The dock says `ready` on a reloaded page before what was open
  (Blueprint, a card, the History strip) is back. The "history cluster" was three faces of this: the panel saying
  Undone twice (fixed, 2026-11-10), a test pressing Esc in the gap (fixed in the test), and `timeline`'s first test,
  still flaky. "Execution context was destroyed" in other browser tests is the same thing. The fix is one signal
  the page gives when it has settled after a write, used by the test harness and open to agents: it is where the
  test system's harness layer and the overlay's mode machine meet. Not built.
- `e2e/site-text` cannot start anywhere: `site/` has its own dependencies and no step installs them.
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
  re-recording before the site is deployed again. Its two tests (`e2e/site-replay`, `e2e/site-text`) are skipped for 0.4.0 with
  a note, by the owner's decision on 2026-11-10; they come back on when the demo is recorded again.
- The full test suite hasn't run on `explicit-machines`; this blocks the merge.
- 22 overlay and 17 engine state machines are still implicit. The biggest is Esc and key routing, which is still a
  chain of `if`s in `widget.js`.
- Overlay invariants 2, 3, 4, 8 and 9 are design questions, and 11–21 haven't been looked at. Engine invariants 11–20
  are open. Of the boundary invariants, the 28 callers that still get `null` (B8), stamp paths with spaces (B10), the
  census going stale on theme change (B11), a corrupt `serve.json` blocking `serve` (B17) and a shared cache directory
  (B4) are open.
- 7 overlay fixes (reader runs, drags, Changes while writing, React's nodes, plan index, mark keys, reconnect) have no
  test yet.
- Lock risks: two processes taking over an abandoned lock at the same moment can both hold it, and the synchronous
  wait can pause the dev server for up to 5 s.

## Shipped · 2026-W45

- *(0.4.0, pending publish)* Alt+click finds the exact line on Next.js, server components included, and never
  guesses for your code — see Chapter 1.
Not merged yet, so nothing is shipped this week. When `explicit-machines` lands:
- Pressing Esc while a fix is being written now leaves Blueprint for good, and the change still lands with its Undo in
  History. [Chapter 2](#chapter-2--the-apps-hidden-rules-2026-11-07)
- React Plumber refuses to touch a file that isn't UTF-8, keeps CRLF files CRLF, and never leaves a half-written file.
  [Chapter 2](#chapter-2--the-apps-hidden-rules-2026-11-07)
- Two dev processes on one project no longer mix up each other's undo history.
  [Chapter 2](#chapter-2--the-apps-hidden-rules-2026-11-07)

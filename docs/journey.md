# React Plumber: the journey

A running log, written as the work happens. Each chapter says what was wrong, how we found it, the system behind it,
what we chose and why, and the proof. Open gaps and the week's shipped list are at the end.

## Chapter 1 · The app's hidden rules (2026-11-07)

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

## Chapter 2 · State that can't go wrong by design (2026-11-10)

### 1. "find all implicit state machine in the code and in the engine", again
- **The itch:** three days after the first audit, the owner asked the same question. The first list was 48; how many
  are there now, and did the fixes hold?
- **How we found it:** the state oracle (`sm check`) on `main`, a sweep of every file for mutable fields, timers,
  listeners and run tokens, then reading every file the first audit skipped.
- **The system behind it:** the oracle's rule for spotting undeclared machines (`sm/mode-flags`) gave no advice on
  any file, so nothing finds a new implicit machine when it is written. The list only grows by hand.
- **What we found:** 21 more (13 overlay, 8 engine); 60 live and implicit. 6 are declared. The three declared overlay
  machines still carry 12 of the oracle's 20 findings, all dropped timer handles: a table names the states, it doesn't
  own what a state started. Full list: `docs/state-machines/addendum-2026-11-10.md`.
- **What we chose:** not 60 local fixes and not a rewrite. Fix the three that can corrupt data, delete the dead
  machines, then build small primitives (a scope that owns a state's listeners, timers and awaits; state as a tagged
  union; one lease per shared resource) and convert one owner at a time.

### 2. The record-file lock let two processes in
- **The itch:** the ledger and the change log are shared by every plumber process on a project. The lock that guards
  them could be held by two at once. Chapter 1 left this in Open gaps.
- **How we found it:** reading `src/write/lock.ts` in the sweep, then `e2e/record-lock.test.mjs` with real processes.
  On the old lock: `in a, in b, out b, out a` (work longer than the stale time was taken over while it ran);
  `in a, in b, out a, in c, out c, out b` (the first holder's release removed the second holder's lock); and once in
  three runs `in d, in b, out d, out b` (two waiters both took over one dead lock).
- **The system behind it:** the lock was "a file exists", with no owner in it. Staleness was the file's age, which a
  working holder never refreshed, and anyone could remove the file.
- **The fix and the proof:** the lock file holds its owner's token. A working holder touches it; a stale one is
  removed under a second exclusive file where it is looked at again; a holder removes the lock only while it still
  holds its token. The three tests pass five runs in a row, and the 13 tests of its callers pass
  (`change-trace`, `trace-concurrent`, `baseline-guard`, `write-path`).
- **Media hooks:** the two event logs side by side: `in a, in b, out b, out a` before, `in a, out a, in b, out b`
  after.

### 3. Two Applies at once ended each other's hold
- **The itch:** while Apply writes, the dev server holds hot updates so the page reloads once, at the end. Two Applies
  running together shared one on/off flag: the first to finish switched the second one's hold off mid-write.
- **How we found it:** the first audit (engine row 4), then `e2e/apply-all-overlap.test.mjs` on the engine itself. The
  events before: `start progress start progress progress end end`.
- **The system behind it:** "an Apply is running" was one boolean, and nothing stopped a second Apply from starting.
- **What we chose:** one Apply at a time; a second one waits for the first to end. Counting open Applies was the other
  option, but the host's hold is one-at-a-time too, and the items take the write lock one by one anyway.
- **The fix and the proof:** the test passes, the events read start … end, start … end, and the 16 apply-all tests
  pass. The declared table (`engine-transaction`) loses its `applying → applying` row.

### 4. A crashed Session stayed dead until the dev server was killed
- **The itch:** the dev server keeps one Session for its whole life. If the Session's background thread crashed once,
  every request after it failed, and the overlay said "Couldn't start" until the dev server was restarted.
- **How we found it:** the first audit (engine row 3), then `e2e/session-crash.test.mjs`: end the thread, ask again.
  Before: `Error: Session worker exited with code 1.` on every later call, and health never left `failed`.
- **The system behind it:** the Session kept a `worker` field that was always there, alive or not, next to a `failure`
  field that nothing ever cleared. "Dead with no way back" was a state nobody had written down.
- **What we chose:** the thread's life is one value with four shapes: starting, ready, lost, closed. There is a worker
  to post to only in the first two, so posting to a dead thread no longer type-checks. `lost` has a way out: the next
  call starts a new thread, and so does the next health question, because the overlay stops sending anything else
  once it hears "failed". A thread that never got ready is retried at most once a second.
- **The fix and the proof:** four tests pass: a read after the crash answers, health alone brings it back, a call in
  flight is rejected and events still arrive after the restart, and a closed Session stays closed.
- **Not done:** the state oracle doesn't read this shape yet (it knows string phases), so this machine is checked by
  the type checker only.

### 5. Three machines nothing could reach
- **The itch:** the audits kept listing machines that no code path starts. They cost reading time on every sweep and
  still shipped to the browser.
- **How we found it:** grep for who imports or constructs them: nothing imported `blueprint-fix.js` (the old chooser,
  759 lines), nothing called `new Panel(` (the old docked panel, 197 lines), and the walkthrough's only starter
  returned on its first line.
- **The fix and the proof:** all three are deleted, with the walkthrough's words and its calls in `blueprint.js`.
  `e2e/blueprint.test.mjs` and `e2e/select.test.mjs`: 19 pass and the same 6 fail before and after the removal (the 6
  fail on `main` on this laptop too; three are time-outs).
- **Not done:** the fourth, the old pinned reading card inside `widget.js` (about 600 lines and a dozen
  always-false guards), is still there; it needs its own pass with `e2e/walk.test.mjs`. `PANEL_CSS` was not pruned.

### 6. A scope: what a state started ends when the state is left
- **The itch:** the three owners that had declared their machine still held 12 of the oracle's 20 findings, every
  one a timer or frame whose handle was dropped. Declaring the states had not made their timers anyone's.
- **The system behind it:** a table says which states exist. It doesn't own what a state starts, so each timer and
  listener was cleared by hand, in whichever exits someone remembered.
- **What we chose:** `overlay/src/scope.js`. A `Scope` hands out listeners, timeouts, frames and awaited answers, and
  ends all of them together. The owner's `#send` ends the old state's scope and opens the next one in the same line
  as the transition, so there is no exit to forget. The oracle's rule for `#send` had to allow that line (`sm` 0.3.1,
  pushed 2026-11-10).
- **First owner, the words editor (`text-edit.js`):** the phase has a scope (the keys while editing, the 2.4 s timer
  of a failed save), the edit on screen has one (the frame loop that keeps the ring on the words), and the note
  beside words that can't be edited has one.
- **A bug it turned up:** that note's 4 s timer was never cancelled by a new edit. Double-click words that can't be
  edited, then edit other words within 4 s: the edit's tag (the file, Enter, Esc) vanished mid-edit. The new test in
  `e2e/text-edit.test.mjs` fails on the old editor with "the edit still says where it writes and how to leave" and
  passes now.
- **The proof:** `sm check` baseline 20 → 18 (both words-editor findings gone, none new). `e2e/text-edit.test.mjs`:
  7 of 8 pass; the 8th (History in the dock) times out on `main` too.
- **Media hooks:** a clip of the tag vanishing mid-edit before, and staying after.
- **Then the clean-up and the fix panel:** the clean-up's two let-go frames and the fix panel's eight timers and
  frames are on scopes. The reveal of a cause in hand is holding's own (put the cause down and it doesn't run); a
  height put back and the ✓'s burst are the panel's own. Baseline 18 → 8. `cleanup` and `cleanup-colour` tests 7 of
  7; `fixpanel` tests 8 pass and the same 4 fail before and after.

## Open gaps
- `e2e/text-edit.test.mjs` "every write is in the dock's history" times out on `main` on the laptop; not looked at.
- 8 oracle findings are left, all in owners with no declared machine (history, element card, scrub, gravity plot,
  the headless recorder). Nothing bans a bare `setTimeout` or `addEventListener` in a new owner yet.
- 4 tests of `e2e/fixpanel.test.mjs` fail on `main` on the laptop, the same four with and without the scope; not
  looked at.
- 6 tests of `e2e/blueprint.test.mjs` fail on `main` on the laptop (three time-outs, three assertions); not looked at.
- `e2e/hosts.test.mjs` "install --overlay detects hosts" expects the folder to be named `plumb`, so it fails in every
  worktree.
- The full test suite hasn't run on `explicit-machines`; this blocks the merge.
- 22 overlay and 17 engine state machines are still implicit. The biggest is Esc and key routing, which is still a
  chain of `if`s in `widget.js`.
- Overlay invariants 2, 3, 4, 8 and 9 are design questions, and 11–21 haven't been looked at. Engine invariants 11–20
  are open. Of the boundary invariants, the 28 callers that still get `null` (B8), stamp paths with spaces (B10), the
  census going stale on theme change (B11), a corrupt `serve.json` blocking `serve` (B17) and a shared cache directory
  (B4) are open.
- 7 overlay fixes (reader runs, drags, Changes while writing, React's nodes, plan index, mark keys, reconnect) have no
  test yet.
- Lock: the synchronous wait can pause the dev server for up to 5 s. A synchronous holder that blocks longer than
  10 s can still be taken over while it works (it can't touch its lock); it no longer removes the new holder's lock.
- 60 state machines are implicit (33 overlay, 27 engine); the list is `docs/state-machines/addendum-2026-11-10.md`.
  Nothing finds a new one when it is written.

## Shipped · 2026-W45
Not merged yet, so nothing is shipped this week. When `explicit-machines` lands:
- Pressing Esc while a fix is being written now leaves Blueprint for good, and the change still lands with its Undo in
  History. [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)
- React Plumber refuses to touch a file that isn't UTF-8, keeps CRLF files CRLF, and never leaves a half-written file.
  [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)
- Two dev processes on one project no longer mix up each other's undo history.
  [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)

## Shipped · 2026-W46
On branch `state-by-design`, not merged yet:
- Two plumber processes on one project can no longer write the ledger or the change log at the same time, even when
  one of them is slow or has died. [Chapter 2](#chapter-2--state-that-cant-go-wrong-by-design-2026-11-10)
- Two Applies sent at the same moment no longer reload the page in the middle of a write; the second waits for the
  first. [Chapter 2](#chapter-2--state-that-cant-go-wrong-by-design-2026-11-10)
- If React Plumber's background thread crashes, the next request starts it again; you no longer have to restart
  your dev server. [Chapter 2](#chapter-2--state-that-cant-go-wrong-by-design-2026-11-10)
- Editing words right after a "this can't be edited here" note no longer loses the tag that says where the edit is
  written. [Chapter 2](#chapter-2--state-that-cant-go-wrong-by-design-2026-11-10)

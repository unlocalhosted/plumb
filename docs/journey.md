# React Plumber: the journey

A running log, written as the work happens. Each chapter says what was wrong, how we found it, the system behind it,
what we chose and why, and the proof. Open gaps and the week's shipped list are at the end.

## Chapter 1 · The app's hidden rules (2026-11-07)

### The itch
The owner asked two questions: "find all of the implicit state machines in my app", then "find every invariant my app
relies on but doesn't explicitly enforce", and then "fix the result". Nothing visible was broken. The worry was the
kind of bug that only shows up when a person does two things at once: presses Esc mid-write, presses Enter twice,
closes a panel while something is still loading.

### How we found it
Two read-only audits, each split across background agents by area, with every claim checked against the code before
it was reported:
- **State machines**: 27 in the browser overlay and 21 in the Node engine. Almost all are a handful of booleans or a
  mode string changed from many places, with no single state and no list of allowed moves.
  `docs/state-machines/overlay.md`, `docs/state-machines/engine.md`.
- **Unenforced invariants**: 62 assumptions nothing checks. 21 in the overlay, 20 in the engine, 21 where data crosses a
  boundary (browser to server, process to process, disk to memory). `docs/invariants/{overlay,engine,boundaries}.md`
  (in the main checkout).

### The system behind it
One habit, four forms:
1. **Modes as loose flags.** "Is a write running?" and "what is the panel showing?" were one fact, so closing the panel
   mid-write made the write's result land nowhere.
2. **Every writer guards itself.** The engine's main write path was careful, but each writer did it its own way. Some
   read files as UTF-8 without checking, some wrote in place where a crash could leave half a file, and rollbacks
   swallowed their failures.
3. **Boundaries trust their input.** No request was checked. Errors were English sentences the browser matched with
   regexes, and any refusal came back as `null`.
4. **Records assumed one process.** Change ids came from an in-memory counter, so two dev processes on one project
   handed out the same ids. The ledger had no version and no lock.

### What we tried, what we chose
- **Fix systems, not symptoms.** Each fix replaces the habit rather than patching one sighting: one phase per machine
  with a table of allowed moves; one module every source write goes through; one request schema and one error-code list
  at the router; ids unique across processes, with appends under a lock.
- **A dead end.** The first reproduction of "Esc while a fix is written" didn't fail where the audit said it would. The
  write landed and History even showed its Undo. The real bug was the reload the write caused: a resume record that
  always said "Blueprint on" brought Blueprint back with the next fix in hand, overriding the person's Esc.
- **Version skew is a feature.** The browser now reads errors by code, and falls back to the old English when the server
  is older. A tab left open across an upgrade keeps working.
- **One decision left to people.** Esc mid-write leaves Blueprint (the write still lands safely) rather than being
  ignored until the write finishes.
- A sibling session later turned the three fixed overlay machines into declared `@machine` tables checked by a tool
  (`npm run sm -- check`, which reports 0 findings on all three).

### The fix and the proof
All on branch `explicit-machines`, waiting on the full suite (vm-agent) before it merges.
- **Fix panel** (`190efd1`): one phase plus a "flight" for the write in progress. Proof: the e2e test "Esc while a fix
  is being written…" fails on the old code (Blueprint came back after the reload) and passes now.
- **Words editor** (`78bee38`): keys work again while words are being saved. Proof: an e2e test (Alt+B during
  "Applying…") fails on the old code and passes now.
- **Clean-up** (`2d49db8`): one run at a time. Proof: an e2e test counts writes: 0 after Esc during the show, then 1
  after Enter, Enter. It fails on the old code and passes now.
- **Write path** (`fcb6bee`…`d03077e`): every write to the user's files goes through `src/write/source-file.ts`. It
  decodes strictly, keeps line endings and the BOM, publishes by temp file + fsync + rename, verifies by re-reading, and
  names any rollback that failed. Proof: 6 e2e tests in `e2e/write-path.test.mjs`. Examples: a Latin-1 file is refused
  and left byte for byte as it was; a CRLF file stays CRLF.
- **Boundaries** (`37e6744`…`2a9d210`): a request schema per endpoint, stable error codes, versioned and locked records,
  and `apply-all` writing only CSS the server proposed. Proof: new e2e tests. Two engines on one project no longer
  collide on ids, and `body{display:none}` sent from a tab is refused.
- **Engine lifecycles** (merged `0d6e39f`): a crashed worker is replaced, the census crawl exits when a page fails, and
  undo grouping is kept per call.

### Media hooks
- A before/after clip: Esc mid-write. Before, Blueprint reappears after the page reloads; after, it stays off and the
  History toast offers Undo.
- A side by side of a CRLF stylesheet in a hex view, before (mixed line endings) and after (all CRLF).
- A chart: 48 state machines and 62 invariants found → fixed, by area. The numbers are in the audit docs.

## Open gaps
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
Not merged yet, so nothing is shipped this week. When `explicit-machines` lands:
- Pressing Esc while a fix is being written now leaves Blueprint for good, and the change still lands with its Undo in
  History. [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)
- React Plumber refuses to touch a file that isn't UTF-8, keeps CRLF files CRLF, and never leaves a half-written file.
  [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)
- Two dev processes on one project no longer mix up each other's undo history.
  [Chapter 1](#chapter-1--the-apps-hidden-rules-2026-11-07)

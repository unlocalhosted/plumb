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

### 7. One batch: the leftovers of the oracle's list, and four stale-answer bugs
- **The itch:** the owner: "do a meaningful chunk of work and then run the tests"; testing after every small change had
  turned each step into an hour.
- **What changed, in one batch, tested once:**
  - History: only the newest read of the timeline is drawn (overlapping reads used to be last-arrival-wins); a toast
    can no longer be hidden by the previous toast's leave timer; its scroll and resize listeners are its scope's.
  - Element card and words card: closing the card drops a read still out, so it can't draw on a closed card.
  - Scrub: a pointer the browser takes away, or the window losing focus, puts the value back like Esc.
  - API: a host that refused a batch is asked one question at a time for 30 s, then batches are tried again (it used
    to be one question at a time for the rest of the page's life).
  - Gravity plot: its observers, listeners and frame loop end with `destroy()`.
- **The proof:** oracle baseline 8 → 2 (both in the headless recorder, which lives as long as its page). One run of
  the six test files of these owners: 18 pass, 3 fail, and the 3 are the `select` tests that fail on `main` too.
- **Not done:** none of these fixes has a test of its own yet. The old pinned card in `widget.js` is still there: its
  only safety net is the Blueprint tests, which are red on `main`, so it waits for them.

## Chapter 3 · One look, written down before it is built (2026-11-10)

### 1. "this looks really ugly": the fix card
- **The itch:** the card that offers a fix. The owner: "why these cards and not using our updated design system? we
  have cool icons for all these things this looks really ugly", then "the ux sucks, the styling sucks, the buttons
  sucks".
- **The system behind it:** the fix card was its own island. It drew its own pictures and buttons and used none of the
  shared icons or controls, because it was built to make the flow work and never went through a design pass.
- **What we chose:** not to patch the card. The owner picked a slim bar: the cause in hand is one line at the bottom,
  and the choice is made on the element itself. Drawn first as a comp (`overlay/demo/fix-bar.html`), the first state
  live.

### 2. "you gave me this boring gray": the icons
- **The itch:** asked for icons for properties and common elements, I drew 31 neutral line icons to match the existing
  grey set. The owner: "none of them are good at all... i wanted whimsy joyful delightful you gave me this boring gray".
- **How we found the right direction:** the owner pointed at the pieces that fly out when a fix lands: solid, in colour,
  padding hatched, margin dotted, a gap striped.
- **Dead end worth keeping:** I then misread three screenshots (a smiley avatar, a toast with a face, a speech-bubble
  tooltip) as the ones they liked. They were the ones that missed: stock faces and stand-ins read as cheap. The rule
  that came out of it: no stock faces, the wit comes from the thing itself.
- **The fix:** a toy set of 76 (27 properties, 49 elements and patterns) in one shared file, `overlay/demo/toys.js`,
  and the language written down in `docs/design/visual-language.md`.
- **Media hooks:** the grey sheet beside the toy sheet; the avatar before (a smiley) and after (a person with an
  online dot).

### 3. "i want an overhaul of the design system before i jump into some work"
- **The itch:** with a new look agreed, anything built next in the old look would drift.
- **What we chose:** a kit (`overlay/demo/kit.html`): one page per part, each showing every state, signed off one at a
  time. Buttons first (a toy key: a solid top on a darker base). Parts are shared modules, so a page can't redraw
  its own: the moment the buttons page showed a bare class name where an icon belonged was the proof that was needed.
- **Borrowed:** the owner shared BoardUI's colour and typography pages as the way to write a spec
  (`docs/references.md`). Colour and type are now written that way, with every table read from the token file.
- **Not done:** nothing of the new look is in the product. Nine parts are listed and not drawn.

### 4. "it has this muddy feeling": butter
- **The itch:** with the site drawn as solid boxes, the owner pointed at the yellow one: "this color across the app
  isn't cutting it... it has this muddy feeling which makes it feel dull and the excitement isn't there".
- **The system behind it:** the hues had been tuned as thin marks on white paper, where a yellow has to be darkened to
  an ochre to be seen at all. The toy language turned hues into big solid bodies, and an ochre as a large fill is mud.
- **The fix:** hues are bodies first. Butter is a true yellow (`#ffc21f`) lettered in its own ink; thin butter marks
  on paper got their own token (`--pl-butter-line`). Pink and sky were lifted a little (`#f24a9f`, `#3391ee`).
- **The cost, measured:** white on the new pink is 3.36:1 and on sky 3.27:1 (mint 3.85, lilac 4.55): fine for bold
  words, below the 4.5 asked of small regular text. Butter's ink on butter is 6.3:1.
- **Media hooks:** the Icons box before (ochre) and after (yellow).

### 5. One site, on Next.js
- **The itch:** the owner: "lets use next.js for this site and move the product homepage, this and documentation with
  demo on there i think we never decided for this part", and "i want the design system to be the reflection of the
  site itself".
- **What we chose:** one Next.js app in `web/` with its own dependencies: `/` (homepage), `/docs`, `/demo`, `/design`
  (also `design.react-plumber.com`). The site puts the overlay's token file on its own root and draws with the
  overlay's source, so the site is the design system in use.
- **What is in:** the design section (colour, type, icons, buttons, fix bar) and the docs: all 15 pages, with a rail,
  toy-styled prose, code blocks, tables, callouts and family marks.
- **What is not:** the docs' 5 figures, 4 reference tables and the live overlay are placeholders that say so; the
  homepage and the demo have not moved; the docs' pages are a copy of `site/src/docs/pages` until the old site is
  removed.
- **A bill avoided:** Next.js 16.4.0 reported a known security vulnerability on start. `web/` is on 16.4.6
  (`npm audit`: 0 vulnerabilities). The repository's own dev dependency is still 16.4.0.

### 6. "dont we have accessibility guideline to detect such issues": no, and now yes
- **The itch:** in the dark scheme the colour page showed white words on a pale green chip, and a white chip with
  nothing readable on it. The owner: "dont we have accessibility guideline to detect such issues".
- **The system behind it:** we had rules in words and nothing that checked them. Parts typed `#fff` on a hue, which
  holds in the light scheme and fails at night, where the hues are pastels.
- **The fix:** what goes on a hue has a name (`--pl-<hue>-on`, and `--pl-cut` for a hole), valued per scheme. The
  allowed pairings are a list (`overlay/src/pairs.js`) and a script checks them (`npm run contrast`).
- **The proof:** first run: 57 of 58 ok, 1 fail (marks on butter at night, 1.44 : 1). After drawing marks in the
  `-on` colour: 56 of 56 ok in both schemes. The closest calls are five dark pill pairings at 4.50 to 4.56 against
  4.5, and the thin butter line on white at 3.03 against 3.
- **Media hooks:** the dark colour page before (white on pale green) and after; the table of pairs.

### 7. "the whole system should feel whole as one": the soft block's press

- **The itch:** the owner, pressing a soft block (the raised, pale-topped card and button on the design site's
  identity page): "it releases in stages, first the effect is felt on card then the wrapper of this svg and then
  finally in svg... the whole system should feel whole as one, not layers getting animated in sequence." And: "the
  current bounce looks good on big card but it looks a bit much on small button, the physics there doesn't feel the
  same."
- **How we found it:** the owner pressing it by hand, with the page's timeline slowing the motion down.
- **The system behind it:** each layer (the top, the white plate, the toy on it) had its own hand-written motion,
  started 30 and 60ms after the one under it and peaking at a different moment. Delay was standing in for
  looseness. And the button had its own, separately typed, numbers (11% squash, 9% stretch, a 4px overshoot on a
  4px lift), so nothing tied a small block's bounce to a big one's.
- **What we chose:** one motion per block, a single number for "how stretched am I", on the same hand-written beats
  the owner liked. Every layer reads it at the same moment; the toy is loose by going *further* on the beat, never
  later. The amounts come from the block's height: a smaller block travels fewer pixels and is back sooner. Dead
  end on the way: a simulated spring matched the timing but not the feel of the quick launch, so the beats stayed.
- **The fix and the proof:** read off the running page. Card: top and plate peak in the same frame (152ms), the toy
  one frame later; the card's amounts are what they were (held 1.024 × 0.96, peak 3.5% tall, toy jumps 7px). The
  35px button: squash 5.2% (was 11%), stretch 4.5% (was 9%), overshoot 2.3px (was 4px), 506ms (was 520).
- **Media hooks:** the identity page's timeline at ¼×, card and button side by side, before and after.

### 8. Soft blocks, everywhere you can press

- **The itch:** soft blocks (the pale, lit, raised card and button the owner chose over the flat two-tone key)
  lived on one page. The owner, after pressing the one-body version: "Yes, roll it out."
- **The system behind it:** the site had three separate raised things, each with its own styles and its own press:
  the site's key, the site's box, and the kit's toy button. Three copies would have drifted again.
- **What we chose:** one piece (`overlay/src/soft.js`: the look and the press) that works on a plain page and
  inside a shadow root. The site's boxes, bar, docs links, and the kit's toy button all take it.
- **The fix and the proof:** looked at running: the design shelf, the bar, the docs page and the buttons page, light
  and dark. A box on the shelf held down reads 1.024 x 0.96 and returns to rest; a place in the bar gives 5%.
- **Ready and not yet:** with a pale top, a drawn box and one not drawn yet looked alike. Two live rows were put
  side by side (ready pale and the rest grey and small; or ready in the strong colour). The owner picked the first:
  a box that isn't drawn yet is flat, small and grey.
- **A bug found on the way:** a held block showed a strip of its dark side *above* its top (the side was painted
  under the whole block, and the pressed, squashed top no longer covered the upper edge). Seen on the Buttons page's
  "Pressed" sample. The side is now painted only under the lower half, so a pressed top just sinks.
- **The Buttons page** now describes the soft block in its own words (the lit top, the side, the sized press).
- **Left open:** the product itself still uses its old buttons.

### 9. "look like just every other playful product": the face

- **The itch:** the owner, on raised buttons with rounded lettering: "isn't these like overused to hell... we don't
  have any unique identity here similar to what we have in terms of our icons."
- **How we found it:** three candidates for one headline on the identity page (Fredoka with Nunito; Bricolage
  Grotesque with Instrument Sans; Instrument Sans alone). A headline in a card couldn't settle it, so the second
  pair was put on the whole site.
- **What we tried:** at the weight that suited Fredoka, Bricolage looked thin and ordinary on real pages; its
  character only shows heavy. The title face got one weight setting, raised to 750 on the site.
- **What we chose and why:** Bricolage Grotesque, heavy, for titles, names and buttons; Instrument Sans for
  sentences. The toys and the soft blocks are the round things; the lettering has its own hand instead of being
  round too. See [references](references.md).
- **Proof:** the owner, after looking at the site in it: "Keep Bricolage."
- **Media hooks:** the design shelf before (Fredoka) and after, same crop.

### 10. "random things thrown together": the fix bar

- **The itch:** the owner, on the bar that shows one fix: "it just feeds random things thrown together... no
  cohesion, no system on how we are presenting the information... no good way to understand where to focus." Then:
  "I want to see what exactly the issue is." And on the first wording: "This corner is not one of your steps...
  does not make any sense."
- **The system behind it:** the bar was built one widget per fact the engine knows (class, property, element kind,
  old value, new value, step name, places, position, three buttons), all equally loud in six colours, and it
  repeated the choice that is also made on the element. Its words were the engine's words ("steps", "scale").
- **What we tried:** three bars that only say what is wrong (one sentence; a picture of the scale; a headline and a
  detail). The owner picked the headline and detail.
- **What we chose:** the bar has one job at a time. With one place in hand: a headline saying what was done by hand,
  ("16 tags have a hard-coded corner"; the owner rejected "typed by hand" for "hard-coded" and "tokens"), and a
  detail with the value and the tokens it should be;
  the choice is made on the element. "Clean up all" turns the same bar into the whole-page clean-up: the pass in
  hand as the headline, the four passes as toys along the right, Apply per pass, then one line of what changed and
  Undo all.
- **Proof:** the design site's fix bar page, live; walked through all four passes and back.
- **Open:** the clean-up's page changes in the prototype are stand-ins, not the real show; the product's bar is
  unchanged.

### 11. "we have not given much thought": the picker on the element

- **The itch:** the owner, on the control that pops out of the element (three corner glyphs, a dashed "5", Use 6px,
  Keep 5px): "need to improve this bar as well... we have not given much thought."
- **The system behind it:** it was the engine's step control with buttons bolted on. The options were unlabelled
  grey glyphs (their token names hidden in a hover title), the hard-coded value was a cryptic dashed notch, picking
  and pressing Use did the same thing twice, the big pink button outshone the choice, and it sat over the next row.
- **What we're trying:** it answers one question, "which of your tokens should this be?" Every option is a token
  with its name and value, drawn as the element at that radius; the hard-coded value is the first option, in coral,
  so keeping it is just picking it; picking previews on the page; one button writes it, its label saying what will
  be written. Two prototypes: swatches, and a ruler of tokens.
- **Proof:** the design site's fix bar page, both live (click, arrow keys, Enter).
- **The owner's verdict:** neither. "the scale approach just felt unnatural, it should feel more like a visual
  editor, control panel sort of thing, which should be semantic to the type of property we are changing", and "too
  much UI". And: show it on its own page, one real piece of UI per property, not on one property only. The bar was
  locked in at the same time.
- **The new direction:** each property gets the control a visual editor gives it, made small, snapping to your
  tokens. Border radius first, on a pricing card's "Popular" badge: a handle on the badge's corner, a one-line row
  beside the card (the radius icon you can drag to scrub, the value as a token name you can open as a list, a tick
  to write it). On the design site's new Token pickers page.
- **Drag mode (after the owner's reference clip, see references):** the value is a reel of the options in order of
  size, your hard-coded 5px among them. A click opens the list; press and drag (anywhere on screen) and the reel
  opens, the options roll past in the field, neighbours fade above and below, a small bump on each new option, a
  blur at speed, a little give past either end, and it settles on the nearest option when let go. The corner dot
  and the icon drag the same reel.
- **Rejected:** "this is tasteless... no huge rectangle should show up". Opening the reel put a tall panel of
  options over the page. What the owner wanted: one value in the field; going up, the new one comes in from below
  and the old one leaves over the top, the reverse going down. Now: nothing opens, the field rolls one value at a
  time (in 260ms, out 200ms, a 16px travel and a little blur), and past either end the value leans and springs back.
- **"there is no slider kind of bar, it should add more personality":** a thin track along the field's bottom edge
  (never across the words), a dot per option with the hard-coded one in coral, a fill and a knob. While dragging the
  knob follows the pointer, swells and the track thickens; past either end it stretches; on release it springs
  onto the option. Tried two ways: a soft fill inside the field with a grip at its end, and a thin track with a knob
  under the value. The owner chose the fill inside the field ("the previous one was better... filling the space
  inside").

### 12. Spacing: the gap is the handle

- **What:** the second property on the Token pickers page, run through the new principles checklist. A dialog's
  footer whose Cancel and Publish buttons sit 13px apart, hard-coded. The gap itself is drawn in its pattern (lilac
  stripes), with a coral dashed outline while hard-coded, blue on a token, green once written; drag it wider or
  narrower and the buttons move. The same row as border radius beside it: the gap icon, the value that rolls, drag
  mode, the tick that turns green on a token, the list (each option drawn as two bars that far apart).
- **The system:** the picker is now one piece. Each property brings its options, its icon, its list mark, what an
  option does to the element, where the row sits, and its element's own handle; the row, list, drag mode, rolling
  value and tick are shared, so every property behaves the same.
- **Proof:** on the running page, dragging the gap 15px to the right moved it from 13px to xl (24px) and the buttons
  followed; border radius still works through the same piece.
- **Padding, the same way:** an alert ("Payment failed") with a hard-coded 14px. All four sides of its padding are
  drawn in padding's pattern (mint hatch); drag any side inward to make all four bigger, outward to make them
  smaller. Coral dashed outline while hard-coded, blue on a token, green once written. On the running page, dragging
  the left side 18px inward took it from 14px to xl (24px).
- **Font size:** an article card whose title is a hard-coded 19px. The text itself is the handle: press on the
  title and drag up for bigger, down for smaller. Two type lines, at the top of its capitals and at its baseline,
  say it is type and carry the state colour (coral dashed, blue, green). The list draws each option as "Aa" at a
  relative size. On the running page, dragging the title up 40px took it from 19px to 3xl (30px).
- **"with font it should also allow us to edit it":** a double-click on the title edits its words in place, the same
  gesture and look as the product's text editing (a ring around the words, a tag under them, Enter or clicking away
  keeps, Esc puts back); a press and drag still resizes. Tried with a real mouse and keyboard: typed " fast", Enter
  kept it, the size stayed 19px. Added to the principles as one gesture grammar on the element.
- **Open:** margin; one value per side (padding-x vs padding-y) is not handled; the type lines are placed from an
  estimate of the face's cap height, not measured; drag sensitivity untested by hand.

### 13. "Yes, merge them": the editor is pickers in a card

- **The itch:** the token pickers and the product's text card (Alt+click on words: style, size, leading, tracking,
  weight, case, colour) were two designs of the same control, already drifting apart.
- **What we chose:** the picker is the building block; an editor is a card of pickers. The picker moved into the
  product's code (`overlay/src/picker.js`, with its styles), and the design site's Token pickers page now uses that
  file. A new scene, "Put together: the text card": a hero heading with two hard-coded values (font size 34px, line
  height 1.2) and two on tokens (letter spacing, weight), edited from a card of four picker rows beside it. Hard-coded
  rows read in coral among the others; a row already on a token keeps its tick quiet until it changes.
- **A bug on the way:** with four rows in one card, one arrow key moved all four; each row now hears its own keys.
- **Proof:** on the running page, dragging the line-height value moved it to tight and the heading's line height
  followed; ↑ on the weight row moved only the weight, to bold.
- **Owner's bug report, a screenshot:** three rows' lists open at once, stacked over each other; and "the icons are
  not correct, everything looks blue". Fixed: one list open at a time on a stage (opening one closes the others; a
  press elsewhere or Esc closes it); three new toys drawn for the properties themselves (line height lilac, letter
  spacing butter, font weight mint), the header's duplicate icon removed.
- **Then, twice more:** "if i put them in a guardrail everything would be different aligned" (each icon was built
  differently: some a tile, some loose bars), and "are these aligned with our color philosophy?" They weren't:
  butter and mint mean margin and padding. Now all four are type, so all four are sky, built one way (the same
  tile, one live area, the same strokes) and told apart only by their marks; a space is drawn as the thing plus a
  large arrow beside it (the first arrows, squeezed into a 4 unit gap, read as blobs). Checked at 150, 24 and 16 on
  a keyline grid. The visual language now says an editor card keeps the hue table.
- **Still not right, three more rounds:** "2 icons are ass, also no hovered state"; then "all of them are ass, A and B
  don't make sense, the middle 2 look congested and have no meaning". Asked what they should be; the owner chose
  "show the effect". Letter blocks were tried (they read as signal bars, a menu, a pause button). Then the owner
  named the cause: "our hairline is too thick to be put in icons, we need thinner hairlines inside icons", and
  pointed at what Figma does. Now: real letters in hairlines (1.4 on the 24 grid), drawn as visual editors draw
  them: a small A and a big one (font size), an A between rules above and below (line height), an A between rules
  either side (letter spacing), a thin A beside a heavy one (weight). The hairline rule is in the visual language.
  The row icons also got a hover state: they tip and grow, say their name above, squash when pressed.
- **"still not up to the mark":** stopped drawing and asked what the cause was. Hand-coded letter strokes on a blue
  tile, with no reference, came out wobbly. The owner chose: set the letters in a real font, and drop the tile. The
  four are now glyphs in the product's hairline family (`overlay/src/glyphs.js`, the 1px drafting pen): ink, A's
  typeset in Bricolage, the pen's rules around them. The font-size toy on the shelf is back as it was.
- **Open:** the product's own text card (`overlay/src/texteditor.js`) is not yet rebuilt from the picker; style,
  case and colour rows are not drawn yet (colour needs its own picker).

## Open gaps
- The contrast check knows colours, not sizes or weights, and is not run by CI yet.
- `web/docs/pages` is a copy of `site/src/docs/pages`; two copies until the old Vite site is removed.
- The repository root still installs Next.js 16.4.0 (used by the Next host's tests); `web/` is on 16.4.6.
- The new look (toys, the fix bar, the toy button) exists only as kit pages; the product still ships the old one.
- `e2e/text-edit.test.mjs` "every write is in the dock's history" times out on `main` on the laptop; not looked at.
- 2 oracle findings are left, both in the headless recorder. Nothing bans a bare `setTimeout` or `addEventListener`
  in a new owner yet.
- The batch of 2026-11-10 (history, the two cards, scrub, the API batcher, the gravity plot) has no tests of its own.
- The full suite on vm-agent was killed ten minutes in (exit 137) on a busy box; it has not run to the end.
- The Blueprint tests are red on `main` on both machines (8 of 8 in `blueprint-corners`, 3 in `blueprint`, 3 in
  `select`, 4 in `fixpanel`): they wait for dock words or a button the page doesn't show. Not looked into.
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

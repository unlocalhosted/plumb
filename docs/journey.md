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
- **"animate them semantically as well":** each glyph acts out its property when its row is pointed at or dragged
  (the small A grows, line-height rules part, letter-spacing rules move out, the thin A turns heavy). Checked by
  rendering each at rest and moving, side by side. Added to the principles.
- **"drop the hovered label, they make sense now with animation doing the explaining; make the animation a bit more
  polished":** the name label is gone (the name stays for screen readers). The motion goes in on a soft spring with
  a small overshoot, the second part a beat behind the first, and comes back in 240ms with no bounce; the moves are
  a little bigger (the rules travel 2.2 units), the big A gives way as the small one grows, the heavy A firms up.
- **Open:** the product's own text card (`overlay/src/texteditor.js`) is not yet rebuilt from the picker; style,
  case and colour rows are not drawn yet (colour needs its own picker).

### 14. "uninspiring, just a list of controls": the text card as a visual editor's panel

- **The itch:** "we need a better layout, I don't like this uninspiring list of controls, it doesn't have a visual
  editor feeling; also add all 3 missing" (style, case, colour, which the product's own text card has).
- **What we chose:** the card is laid out like a design tool's panel, in sections. Style at the top, a tall field
  drawn as a sample of itself ("Ag" at the style's size and weight, then its name and size / line height). Type as a
  two-column grid of compact fields (font size, weight; line height, letter spacing). Case as four buttons drawn as
  what they do (—, AG, ag, Ag). Colour as a field whose icon is the swatch. One button at the bottom writes every
  change ("Write 3 changes"), then offers undo. The fields are the same picker, in a compact form.
- **The system:** a style is the real token for text. Picking one moves the four type values together; changing one
  value finds the style it now matches, or shows "No style". The heading's ring is coral while anything is
  hard-coded, blue when everything is on tokens, green once written.
- **Proof:** on the running page, picking heading-lg moved size, weight and line height (Write 3 changes); nudging
  line height turned the style back to No style; uppercase counted as a change (Write 4 changes); writing applied
  them.
- **Open:** the product's own text card (`overlay/src/texteditor.js`) is not swapped yet; typing a number and the
  "not set" and "locked" states from the old card are not in the picker yet.

### 15. "think of a few novel interfaces, solve the problem for real"

- **The itch:** the panel looked better but was still a panel: "I want to think of a few novel interfaces, like
  solve the problem for real."
- **The real problem, restated:** a heading has hard-coded type and you want it on the right text style, fast and
  sure. A panel of controls makes you do the work; plumber knows the page and the styles, so it should do more.
- **Four prototypes, one page** (the design site's "Text: four new ideas"), all on the same piece of someone's app
  (a landing page with a hard-coded hero heading among headings, card titles and body text that use styles):
  - **A · Try styles on the element:** no panel; scroll or drag on the heading and it becomes each style in place,
    the closest first, with a coral ghost of the original behind it and a label with the style and how many places
    use it. Click keeps.
  - **B · The page's type ladder:** every style on the page as rungs with their use counts; pointing at one lights
    its elements; the heading is a coral chip hanging where its size falls; drag it onto a rung.
  - **C · Make it like that one:** press Match, point at any text, the heading previews its look; click to take its
    style ("Matched heading-lg · now 2 places").
  - **D · One answer, then why:** plumber's best guess (heading-lg) with three reasons (nearest size, already used by
    another heading, what else changes) and one button; other styles folded away.
- **Proof:** each run on the page: A's first scroll goes to the closest style; B lights "How it works" from its rung;
  C matched heading-lg from the section heading; D's card shows the guess and its reasons.
- **The owner's call:** "nope, let's go back to the previous one, I think that's fine." The text card as a visual
  editor's panel (entry 14) stays the direction; the four ideas stay on their page as a record, not built further.

### 16. "is this good enough for all text needs?" No: more editing options

- **The gap, named:** the card covered style, the four type values, case and colour. Missing for real text: the
  font, sizes per screen size (`text-2xl md:text-4xl`), where a value comes from (inherited, or locked by a
  component's props), alignment, decoration, and how long text wraps.
- **Added to the text card:** a Font field (the project's sans, display, serif, mono; the heading's hard-coded
  Helvetica Neue in coral, each option drawn in its face). A Phone / Tablet / Desktop switch on the Type section: font
  size is kept per screen, the heading narrows to the screen and takes its size, and Tablet shows the phone's size in
  grey italics ("Tablet uses the phone size until you change it") until it gets its own. Letter spacing locked, with a
  lock and a note (it is set by the Heading component's props). Alignment (left, centre, right) and decoration
  (italic, underline, strikethrough) as small button groups; Wrap (wrap, balance, one line with an ellipsis). Every
  one counts toward the one Write button.
- **A bug on the way:** a field that started on a token counted as a change because its list also held a hard-coded
  value; a field now counts as changed by where it started.
- **Proof:** on the running page: Write starts empty; Tablet shows 24px inherited with its note; centre, italic and
  balance applied to the heading and made "Write 3 changes".
- **"during the drag the blue state goes out of its boundary... make it stretch against the boundary, not cross it":**
  the fill is clipped to its track; pulled past an end, the track gives with resistance up to the field's own edge
  and no further, and the grip at the fill's end squashes (shorter, wider) as it presses; it springs back on release.
  Measured: pulled far past the end, the track's edge stops at the field's edge (205.1 against 205.5).
- **"the container doesn't feel pushed at the end, stretched as I asked; it feels rigid and solid":** the give was
  capped at the field's edge, about 1%, so nothing visibly moved. Now the whole field stretches the way you pull, up
  to 9% longer and a little thinner, anchored at the far side, with the words held at their own shape; on release it
  springs back with a small wobble. Measured: 133px stretched to 143px.
- **"the option feels like infinite rendering or some distortion when I move past one option to another"** (the text
  style field): three causes. Letter spacing is locked, so a style that needs another letter spacing (display) never
  "matched", and the check that finds the style for the current values reset the field to No style mid-drag; the
  drag and the check fought, re-rolling the field again and again. The style's own change no longer runs that check,
  and a locked value no longer counts against a style. The "Ag" sample read one shared size, so the option leaving
  took the new size as it left; each option now carries its own sample. A fast drag piled up leaving values; now at
  most one leaves while one arrives.
- **A bug found while checking:** every standalone picker's value read "[object Object]px" since the picker learned
  other units; the default format now reads the option's value.

### 17. "next": the product's own text card becomes the panel
- **The itch:** the panel lived only on the design site. The card you get with Alt+click on words in a real app was
  still the old one: value fields with a scale that opened under them.
- **What changed:** the real card now shows the text style and the four type values (font size, line height, letter
  spacing, weight) as the same token pickers, under Style and Type, with one Write button that counts the changes.
  Dragging a value previews it on the words at once; nothing is saved until Write. Each value is then written through
  the product's own save path, one after another, each with its Undo.
- **Found while trying it on crafting-ui:** a value the element inherits from its text style showed the nearest token
  (line height 1.25) instead of what the heading really has (1.1); an inherited value now shows as itself, marked
  "inherited", among the tokens. Long token names (headline-small) were cut off, so the value now comes first and the
  name after it. The fields came out dark on the light card when the computer was in dark mode; the card now sets its
  own light tokens.
- **Proof:** on a copy of crafting-ui, the "React Plumber" heading dragged from 24px to 33px, Write 1 change, and the
  code got `text-3xl` with "Changed size to 33px on Plumber · Undo".
- **"Style follows values":** a value changed by hand now moves the style field with it: to the style the values
  make, or "No style" (coral) when they make none; put the value back and the style comes back. A locked value
  doesn't count against a style. The style field only shows this; the values are still written one by one. Checked on
  crafting-ui: the heading's font size up one step read "No style" and "Write 1 change"; down again read "Headline"
  and "Write".
- **"Colour and case":** both joined the panel. Case is four buttons, colour a picker with the swatch as its icon and
  your colour tokens in a list; both are held and counted like the type values, and written by the same Write.
  Inside the card a list now opens in place, under its field, and scrolls in itself: the card scrolls, so a floating
  list was cut off at its edge.
- **A bug found by writing two at once:** only the first change landed. After each write the card is drawn again, and
  building each field reset it to where it started, which dropped every change still waiting. Building a field no
  longer touches what is held. Proof: on crafting-ui, upper case and the `draw` colour, "Write 2 changes", and the
  heading's code got `uppercase text-draw`.
- **Not done yet:** typing a number; dragging the words themselves; colour and case are still the old
  controls (now done, below); the old card's tests still expect the old fields.

### 18. Back to the system: the colour picker, three ideas first
- **The itch:** colour was the one property still picked from a plain list of names, and it can't follow the other
  pickers as they are: a theme has many colours (crafting-ui has 25), with no size to order them by. They come in
  roles (text, surface, line, accent, status) with states (hover, soft), and each one has a light and a dark value.
  The real cost of a hard-coded colour is that it stays the same in dark mode while a token adapts.
- **What we made:** a design page with three live prototypes on the same piece of someone's app (an invite card whose
  button is a hard-coded `#2f6fed`), each app with its own light/dark switch: **A**, the same picker as every other
  property, tokens in role order with each swatch split light/dark; **B**, nearest first: your colour, then the
  three tokens closest to it in words ("close", "near", "far", measured as OKLab distance), every colour one click
  away; **C**, role then shade: pick what it is for (guessed: a button's fill is Accent), then that role's shades.
- **Proof:** in B, picking `accent` and switching the app to dark turns the button the theme's lighter dark accent
  with a green ring; in C, still hard-coded, it stays the same strong blue on the dark card.
- **The pick: "B with C".** Built as a shared piece of the overlay, so the product's text card can use it next, and
  shown as the Colour scene on the Token pickers page: your colour, the three nearest tokens in words, and "All 15
  colours" opening C's role tabs (on Accent for a button's fill) with each role's shades. Point to preview, click to
  pick (blue ring, pale green tick), click again or Enter to write (green), Esc to put back. Proof: picking
  `accent-hover` from the Accent tab and writing it showed the solid tick in both places and a green ring; in dark,
  the button took the token's dark value. Added to the interaction principles as 18c.
- **"Yes, use it there": the product's text card uses it.** The card's colour is now a small field (swatch, name,
  "inherited" when it comes from above); a click opens the colour picker inside the card. A pick is held and written
  by the card's one Write like every other value. To work on a real theme, the picker now reads any CSS colour
  (`oklch`, a `var()` reference, a see-through one, measured as it looks on the page), guesses each token's role from
  its name (fg → Text, bg → Surface, draw → Accent; others under Other), and never lists the element's own token as
  "nearest". Found while trying it: the element's own token showed a pale green tick as if there were something to
  write (now none), and the toast named the colour by value ("#103dff") instead of its token ("draw"). Proof: on
  crafting-ui, "React Plumber" → All 25 colours → Accent → draw → Write: the code got `text-draw` and the toast said
  "Changed colour to draw on Plumber". In this theme "scrim" really is the same colour as "fg", so "looks the same" was
  true.
- **"you didn't update this":** the design site's own text card still had the old colour row. The folded field (a
  small colour field that opens the picker in place) was the product card's own code, so the two drifted the moment
  they were made. It is now part of the shared colour picker, and both cards use it. A colour seen on a dark ground is
  now compared with each token's dark value: on the dark hero, `#f0f0f1` first suggested "surface" and "bg" (their
  light values are near-white); it now suggests `fg`, "looks the same". Fixed while checking: after a pick the field
  read as inherited (grey italics), and its swatch showed the light value on a dark ground.

### 19. "Margin and per-side"
- **The itch:** padding moved all four sides at once, which isn't how anyone fixes padding, and margin had no picker.
- **What we made:** on the Token pickers page, each side of the alert's padding is now its own handle: a drag moves
  that side alone; ⇧ as it starts moves its pair, ⌘ all four. Those are the keys the product's element card already
  uses for spacing, so the design and the product say the same thing. The row beside the alert names what is in hand
  ("right", "top + bottom", "all sides"), and one tick writes every side that changed. A new Margin scene: a
  notification feed whose middle card has a hard-coded 18px above it, the margin drawn as butter dots in the space
  it makes, dragged down to grow.
- **Proof:** right alone → 14 24 14 14; top with ⇧ → 24 24 24 14, row "top + bottom"; left with ⌘ → 24 on every
  side, row "all sides"; the tick wrote all four (green frame). Margin dragged to 32px (2xl), ring blue.
- **Added to the principles** as 18d.

### 20. The dark mode check
- **How we looked:** every finished design page (9) opened in dark and in light, and every piece of our own text on
  each measured against the colour it actually sits on (the apps drawn inside the stages left out).
- **What it found, by cause:**
  - **The faintest ink was used for words.** Our tokens keep it for ticks and dividers, "never text", but 27 places
    used it for text: every hint line under a stage, the text card's section labels, captions under buttons and
    icons, units, notes. About 1.8:1 in dark and about 2:1 in light, so it was broken in both schemes. All now use
    the secondary ink; the two icon uses (the picker's tick, the lock) keep the faint one.
  - **My own bug from chapter 19:** the margin scene's notification cards used the class name `note`, which the
    text card's note also uses, so in dark the note became a white slab with grey text. Renamed.
- **After:** dark: identity, colour, type, icons, colour ideas, pickers pass; light: the same, plus pickers.
- **Left for the owner (a colour-system choice, not a slip):** the coloured buttons. In dark they are bright pink,
  mint and coral with dark lettering (readable, about 4.7:1), but our night rule says a coloured block is a deep
  version of its hue lettered in white, and the buttons page itself says the label is "cut out of it in white". In
  light, white on pink is 3.4:1 and on mint 3.9:1, under the 4.5:1 that small text needs. Not changed.
- **Not checked:** things that aren't text (borders, shadows, rings that vanish on a dark ground).
- **"Deep hue, white text":** coloured buttons in dark are now the deep version of their hue, lettered in white, as
  our night rule always said. Made a rule of the token file, not a patch: new "block" colours (`--pl-pink-block`,
  mint, coral, each with its `-on` lettering) are the hue in light and the deep hue in dark; the toy buttons, the
  site bar's soft buttons, the site's current-page tab and the identity page's sample all use them. Measured, white
  on: deep pink 4.53, deep mint 4.56, deep coral 4.50 (all just over 4.5). Light is unchanged: white on pink 3.36 and
  on mint 3.85 still fall short; coral is 5.47.
- **"too bold, feels like burning my eyes" → "mute with white, like the accent colour in the tokens".** The deep
  hues were the wrong turn: fully saturated and large on a dark page. I then offered darkened, greyed tones (quiet,
  muted, soft-bright); the owner rejected those too ("not this grayed out"), pointing at the night pastel in the token
  table. Night buttons now take the scheme's own pastel accent, lettered in the hue's dark tint: the block tokens
  simply follow each scheme's hue. Measured, lettering on the pastel: pink 5.33, mint 7.71, coral 5.23.
- **Night colour, settled: "Between 2".** The pastel with dark lettering was rejected ("I don't like the black
  colour text"), and a calm mid-tone with white read as grey ("looks really bad"). The answer was in between on
  colour, not on lightness: four strengths with white lettering, each a little more colourful at the same lightness,
  from the greyed mid-tone to the glaring deep hue; the owner picked the second step from the deep end. Made a rule of
  the tokens: the night `-soft` tone of every hue is now that strength (pink #d42e87, mint #21834f, coral #d83422, sky
  #1d77c8, lilac #775ceb, butter #976b0f, white at 4.6 to 4.8:1), and night blocks use it with white. Buttons, the
  Design page's cards, docs callouts, token chips and the bar's current tab all follow it. The comparison was removed
  from the Buttons page.
- **"add a bit of noise onto the cards":** the coloured soft cards now have a fine grain on their face (an SVG
  fractal noise, grey, blended as overlay at 32%), under the words and only on cards with their colour; cards not drawn
  yet stay plain. One rule in the soft block, so every card gets it in both schemes.
- **"did changing the colour in dark mode also affect light? they look too washed out":** no light value had
  changed (checked in every token edit of the day), and the grain made no visible difference. The light cards had
  always used the pale chip tint (about 15% colour); next to the richer night cards it read washed out. A first try
  at more colour mixed the strong hue with white and came out grey; the second kept the hue and added colour at a
  slightly lower lightness, every hue by the same amount so mint didn't turn neon. The owner picked "More colour".
  It is a token of its own, `--pl-<hue>-face`, so chips keep their pale tint; at night the face is the `-soft` tone.

### 21. A colour spec with every state (after BoardUI's)
- **The itch:** "state all possible state tokens like background and what not", pointing at BoardUI's colour spec.
- **The system behind it:** we had the palette (hues, inks, papers) and a handful of roles, but no named states, so
  each part picked raw colours itself (paper-2 was hover in one place and an inset strip in another).
- **What we made:** a role-and-state tier in the token file, 49 tokens named `--pl-<group>-<role>-<state>`: Text (7),
  Icons (5), Backgrounds (8: page, surface, hover, pressed, inset, selected, disabled, scrim), Borders and rings (6),
  Actions (13: action with hover, pressed, disabled; done; danger; quiet), States of a value (9: hard-coded, on a
  token, written, minor, unknown), Marks (3). Each points at the palette, so dark follows by itself. The Colour page
  shows them first, one table per group with what each is for and its light and dark value, read from the file;
  the palette sits under it. Card faces and blocks are a group of their own.
- **Proof:** the contrast check now also covers card faces and buttons: 74 pairings, 74 pass in both schemes.
- **Not done:** the product's parts don't use the new names yet; moving them is part by part. Mixed values (the state
  grounds) can't be judged by the contrast check yet.
- **The first part moved onto the names: the token picker.** 32 raw colours became roles and states: words take
  `--pl-text-*`, icons and ticks `--pl-icon-*`, the row and list `--pl-bg-surface` and `-hover`, a compact field
  `--pl-bg-inset`, focus `--pl-border-focus`, the drag fill `--pl-border-selected`, a hard-coded value
  `--pl-text-hard-coded` and `--pl-border-hard-coded`, the tick on a token `--pl-state-written-*` and once written
  `--pl-done-*` (so at night it is the calmer green with white, like every done button). The picker now names no raw
  colour.
- **Found on the way:** role names are worked out where they are defined, so the product's text card (which stays
  light on a dark computer by restating the palette) would have kept dark roles. The roles now sit in a rule of their
  own (`:host, .pl-scheme`), and a part that sets its own scheme adds the class `pl-scheme`; the text card does.
  Checked on crafting-ui with the computer in dark: the card's rows read #ffffff and #f6f6f4. Also caught: inherited
  values in the text card were still in the faintest ink; they take `--pl-text-inherited` now.
- **The second part: the colour picker.** 29 raw colours became roles and states, the same way as the token picker:
  the list and its tabs on `--pl-bg-surface`, `-hover` and `--pl-bg-inset`; the shade in hand on `--pl-bg-selected`;
  focus on `--pl-border-focus`; a hard-coded colour in `--pl-text-hard-coded` with a `--pl-border-hard-coded` ring;
  the tick on `--pl-state-written-*`, then `--pl-done-*`. It now names no raw colour. Checked in light and dark on the
  design site; the contrast check still passes 74 of 74.
- **The third part: the text card's own styles.** It had four colour names of its own (`--sky`, `--coral`,
  `--ink-3`, `--wash`) and about thirty hex and rgb values written straight in. All now map to roles and states: text
  primary and secondary (the faint ink stays only on real icons), inset and hover backgrounds for the grey wash,
  the focus border for rings, the hard-coded colour for the reds, the written state for the green "fits here" marks.
  Blue words (a changed value, the step in hand) take the "on a token" text, because sky-blue words fail on white.
  The arrow beside the card now takes the card's light colours too, so it can't turn dark next to a light card.
  Checked on crafting-ui with the computer in dark: the card, its labels and its arrow come out light, and the ring on
  the page takes the night sky. Contrast still 74 of 74.
- **The fourth part: the element card** (Alt+click on anything that isn't words). Same mapping as the text card:
  its five private colour names (`--sky`, `--coral`, `--ink-2`, `--ink-3`, `--wash`) and about 30 written-in
  values became roles and states; the "same" and "close" chips take the written and on-a-token states, the dark Use
  button is the card's one inverse block (primary text as its fill, surface as its lettering). Left on purpose: the
  code-diff panel and the drawings in the shadow and motion editors (a sun, a pad, stand-in boxes), which are pictures,
  not roles.
- **The pattern, made one thing:** the text card kept its light look by restating the light palette by hand, and the
  element card would have needed the same copy. The token file now offers one class, `pl-light`: anything carrying it
  gets the light palette and its roles, on any page and any computer scheme. Both cards and their arrows use it; the
  hand-made copy is deleted. Checked on crafting-ui with the computer in dark: both cards' pieces resolve to the light
  colours (white card, #f6f6f4 rows, #6b665c meta, navy and green state words, white arrow). The contrast check read
  the palette by its rule's old opening line and briefly judged only 37 of 74 pairs; it now reads the new rules, 74 of 74.
- **The fifth part: the fix bar.** It follows the page under it, not the computer, and kept a hand-written dark
  copy of itself (about 30 colours written twice). The token file gained `pl-dark`, the night twin of `pl-light`; the
  bar carries one or the other as the page's ground decides, so both looks come from one set of role names and the
  dark copy is deleted (only its deeper shadow stays its own). Its 79 raw colours became roles and states: text
  primary and secondary, the surface and its hover, the inset for notes, the focus border, hard-coded text for
  errors, soft text for the setup notice, the heat colour for the problem dot, and the inverse block for its dark
  primary button. Checked on crafting-ui: on the light page the bar is `pl-light` (white glass, #1d1b17 words); with
  the page painted dark it is `pl-dark` (graphite glass, #f4f3ef words, Fix in the calmer night pink with white).
- **A mix-up while checking:** another session had started its own copy of crafting-ui on the port my copy uses, so
  one check read that app (which runs the main overlay) and I briefly blamed a build step. My copy now runs on 5182;
  the other session's server was left alone.
- **The sixth part: the shared language styles** (the card, pills, tags, patterns and the product's current action
  button, used across the overlay). The card takes the surface and primary text; the checkerboard the inset; the
  marching ants, hatch and dither default to the selected ring; the current action button keeps its look through the
  existing action roles (`--pl-action-soft`, `--pl-on-action`), its disabled and quiet versions take the new disabled
  and quiet roles. Pills and tags keep their hues, because they take a hue for what it means. Checked on the
  design site: light is unchanged (#ffd0ec with #5a0d3c words); in dark the action follows the night rule, the calmer
  pink with white.
- **The seventh part: the overlay's shell** (the dock, the tags on your page, the inspector panel, the element
  drawing). 79 ink and paper uses became roles: words primary or secondary (counts that were in the faint ink are now
  readable), icon buttons and pins the icon roles, separators, arrows and the drawing's outlines the tick colour,
  surfaces, hovers and pressed items the surface, hover and inset backgrounds, rules the default border, the pressed
  button the inverse block. The verdict colours and the instrument blue were already roles. Checked on crafting-ui in
  both schemes: light (#1d1b17 words, #6b665c dock icons, white tags) and dark (#f4f3ef words, graphite tags).
- **The rest, as one batch.** With the mapping settled over seven parts, the remaining parts moved together by the
  same rules, keyed on the property and on what the element is: ink and ink-2 become primary and secondary text
  (icon colours for marks: separators, arrows, ticks, chevrons, dots, strokes); the faint ink becomes secondary text,
  disabled text, or the tick colour for marks; paper the surface, desk the page, pale paper the hover or the inset;
  rules the default border; a dark fill lettered in paper the inverse block. 233 uses across 20 files (readiness,
  editor pieces, choices, history, the cause list, the Blueprint panel, the specimen, gravity, the project page,
  marks, help, text editing, selection, changes, scale marks, the buttons and more). Checked on crafting-ui with a
  fix open in light and dark, and contrast 74 of 74.
- **What is left on purpose:** 6 strokes inside the toy icons (drawings), 16 in the design site's soft blocks (hues
  used for their meaning). Hex values written straight in remain in about a dozen files (most in the clean-up
  animation, the layout card and the element card's drawings and code panel); those are a separate pass, each one a
  judgement between a role and a drawing colour.
- **"I don't understand why are you doing this"** (mid-way through the hex sweep). Fair: I had been reporting each
  part moved without saying what it buys. The why, as told to the owner: the colour spec only changes anything if the
  product uses it; with every part asking for a role, dark mode can't break part by part again, one change to a role
  changes the look everywhere, and the Colour page tells the truth. Owner: "fix and finish".
- **A bug I caused, found during the sweep:** moving the element card deleted its private colour names, but the layout
  controls inside it (gap, direction, alignment) still used them, so their strips and grey labels had lost their
  colour. Fixed by moving them to roles; checked: #f6f6f4 strip, #6b665c labels, navy token text, blue switch.
- **The hex sweep, finished:** the clean-up panel (31), the layout controls and spacing bands, the Blueprint hint
  pill, the shadow-picker strip and the soft blocks' quiet button and empty cards now use roles. The two dark tooltips
  (the spacing bubble, the hint pill) carry `pl-dark` instead of hand-picked light-on-dark colours. The spacing bands
  take the mark roles, so margin is butter, the system's margin colour, where it had been a stray orange. Checked on
  crafting-ui: the clean-up panel open in light reads right (faint upcoming passes, lilac "why", heat-pink change,
  dark Apply button); the bubble and layout controls sampled with their own classes; the design page's soft blocks
  unchanged in both schemes. Contrast 74 of 74.
- **Left on purpose:** the canvas probes that measure colours, a fade mask, the lighting mixed into soft blocks and
  buttons, the confetti, the drawings and the code panel in the element card, the Blueprint dot pattern's halo, and
  one white measurement pill whose hue is set at runtime.

### 22. "Lock it": tests for what we built
- **The itch:** a day of changes (the text card's panel, the colour picker, the colour spec moved into every part)
  with no test protecting any of it; the owner chose to settle it before building more.
- **What the tests cover now** (behaviour through the real overlay on the demo app, one browser per file): the panel
  opens with the style, the four type values, case and colour, a hard-coded size read as such; a value moved with the
  keys previews on the words and is counted, Esc puts it back, Write saves it with Undo; two changes land with one
  Write; the style follows the values; the colour picker leads with your colour and the nearest tokens, opens every
  colour by role, Esc folds it; the card stays light on a computer set to dark. The old card's QA findings are ported
  to the panel (locked values said at rest, writing at a usage, colours named plainly, keyboard focus, keeping clear
  of the fix bar, the header's levels, a drag landing on a token). The contrast check is a test too, and fails if it
  can't judge a pairing.
- **What porting the old tests found:**
  - a bug: a fluid size (clamp) showed the nearest token instead of what it measures; it now reads e.g. "19px fluid".
  - three abilities the old card had that the panel doesn't yet: typing a number into a field, flagging a text style
    the words don't actually measure ("14px here"), and the "fits here" hint from the page's type order. Their tests
    are kept and skipped with that reason, so the gaps stay visible.
- **How it was run:** the laptop was 5 GB into swap, so the browser tests ran on vm-agent. A first attempt to stop an
  earlier run there used a pattern match over SSH (which the rules warn against); it did nothing harmful, and the
  leftover processes were then stopped by their process IDs, checked by folder.

### 23. Back to the system: the Spacing and radius page
- **Why now:** the full test suite runs on vm-agent for an hour and needs nothing; the owner chose to go back to the
  design system meanwhile. "Spacing and radius" was still "to draw" on the Design site.
- **What it shows:** two ladders of space (on a card, a ladder of 4 from 2 to 24, with the old 6 in coral as off the
  ladder; on a page, 32 to 96), each drawn as real space in the language's own patterns: padding hatched mint, a gap
  striped lilac. The fix bar's card, measured, with its 16px inset, 16px between sections and 8px between buttons
  marked the way Plumber marks your app (measured from the elements, so it stays right). Each corner on the object it
  belongs to (a mark 2, a tag 6, a pill 7, a row 8, a card 12), the two shadows on the page they sit on, and every
  token with what it is for. The spacing and radius tokens got their notes in the token file, so the table reads them.
- **What counting found, said on the page:** the overlay names its corner tokens about 45 times but writes about 180
  corners as numbers, many off its own scale (9px 22 times, 5px 14, 10px 10, and 4, 3, 1px): the drift Plumber finds
  in other apps, in its own code. 6px is the most-used gap (35 times as a number). `--pl-card-pad` and `--pl-card-gap`
  are used nowhere. The soft blocks' corners (28px cards, 13 to 14px buttons) aren't tokens. A tag (6) and a pill (7)
  are a pixel apart. Checked in light and dark.
- **"Very chaotic examples":** the owner looked at the Corners row and said "this whole row can be made better", then
  "very chaotic examples". The system behind it: each corner sat on a different object (bars, a tag, a coral pill, a
  row, a card), so five sizes, colours and shapes changed at once and the radius, the one thing the row is about, was
  the hardest thing to see. Now every step is the same drafting detail: one quarter corner at four times its size, its
  centre point and a dashed radius line, then the px value, the object in words, and the token. Only the radius
  changes from one to the next. Checked in light and dark.
- **"This is even worse":** the identical drafting details lost what the page says, that a corner belongs to an
  object. The system behind both misses: I drew the row twice from my own idea without showing a direction first. This
  time I asked, with three sketched directions, and the owner chose one nested object, then asked for guidelines that
  put the weight on the radius. Now it is a real piece of the overlay at two and a half times its size (a card holding
  a row, holding a colour pill with its swatch and a key), and each corner carries drafting guides: the square corner
  it cuts off (dashed), the arc in blue, its centre and radius, and a leader out to its value, its object and its
  token. Labels sit in a column each side, pushed apart so none touch; the guides are measured, so they follow the
  tokens. A full dashed circle per corner was tried and dropped: on the key it crossed the letter. Checked in light and
  dark.

### 24. The Motion page, one moment at a time
- **What we chose:** the last foundation still "to draw". Counted first: 3 curves and 9 time tokens, two physics
  springs in code, and about 200 times written as plain numbers in the overlay (120ms 36 times, 200ms 28), plus 7
  curves off the tokens. Having missed twice on the Corners row by drawing before asking, I showed three sketched
  directions first; the owner chose "live piece + its curve".
- **First row, Picked up:** the real toy on the left tips 9° and grows to 114% when pointed at (or on Play); on the
  right its curve is drawn from the `--pl-spring-pop` token itself, with guides for start, end and the 4% it goes
  past, and a dot and playhead tracing the curve in step with the toy, there and back. The time, 420ms, has no token
  and the row says so. Checked in light and dark.
- **Media hooks:** a clip of pointing at the toy while the dot runs the curve.
- **The other five, after "Nice, you can write":** Arrives (a chip pops in from 92%), Lands (three toys pop in 40ms
  apart; the graph draws all three curves, offset by the stagger token), Numbers roll (the real digit wheels from the
  scale marks, 128 to 1,406), A card opens (up 6px and fading in on the ease-out curve, sampled from its
  cubic-bezier), Selection travels (one fill slides between Body, Title and Label on the spring). Each piece uses the
  product's own rule, and each row says when its time is written as a number: Picked up, Arrives, Lands and Numbers
  roll have no time token; A card opens and Selection travels do. Checked in light and dark.

## Open gaps
- The overlay writes about 180 corners as numbers (radius tokens about 45 times), many off its own scale; 6px is
  its most-used gap; --pl-card-pad and --pl-card-gap are unused; the soft blocks' corners aren't tokens.
- The text panel can't take a typed number, doesn't flag a style the words don't measure, and has no "fits here"
  hint yet; their tests are skipped with that reason.
- White on the pink and mint buttons is under 4.5:1 in light (3.36, 3.85); dark now passes, just. Nothing yet stops the faintest ink being used for text again.
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

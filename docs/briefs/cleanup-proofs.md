# Brief: the clean-up's missing proofs (text and spacing passes)

The text and spacing passes of "Clean up this page" are built (overlay/src/cleanup.js, spacing-pass.js, stacks.js,
scale.js). Their briefs (docs/briefs/page-cleanup.md "Layer 1: type" proof, docs/briefs/pass-spacing.md "E2E tests")
promise proofs that don't exist yet. This brief is those tests. **Tests only: never edit overlay/ or src/.** If a test
fails because the product is wrong, stop on that test, keep it failing, and report: the failing assertion, the raw
output, and the file/line you believe causes it. The owner fixes product code.

## Rules (the owner's, binding)

- End-to-end only: the real CLI (`dist/cli.js`), real Vite + React + Tailwind, real Chromium through Playwright, the
  overlay driven by keys and clicks like a person. Assert what a person or the files can observe: the panel's words,
  computed sizes on the page, file contents. Never import overlay modules, never assert on internal state.
- Follow the existing tests' setup exactly: `e2e/cleanup.test.mjs` (text pass) and `e2e/cleanup-spacing.test.mjs`
  (spacing pass). Copy their fixture helper pattern (mkdtemp under `fixtures/.<name>-`, `t.after` cleanup,
  `plumber census` first, `PLUMBER_CHROMIUM` env).
- Fixture code comes from crafting-ui's own code (`fixtures/crafting-ui-standards`, or
  `~/unlocalhosted/crafting-ui/src` read-only). Don't invent markup when a real one exists; quote its source line in a
  comment.
- Run one test file at a time: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test e2e/<file>`.
  Check `top -l 1 -o mem -n 5` first; don't run two Chromium suites at once. Never start a dev server outside a test.
- Only create the two new files below. Don't edit any other file (another person is editing cleanup.js and
  e2e/cleanup.test.mjs right now).
- Don't commit.

## File 1: `e2e/cleanup-site.test.mjs` (text pass)

1. **One site, one ladder.** Two routes from crafting-ui with different local type (`/motion/standards` and
   `/stickers` proposed different ladders before the ladder was project-wide: page-cleanup.md problem 1). Fixture: the
   standards page plus a second page at another route with the stickers page's text classes (read
   `~/unlocalhosted/crafting-ui/src` for it; a small router in App.jsx by `location.pathname` is fine). Census, then
   open the text pass on each route: the ladder rows the panel lists (names and sizes) are identical on both.
2. **The pass never adds a size.** On the standards page: distinct computed font sizes among stamped elements before
   Apply ≥ after Apply (read after the write lands).
3. **One step in the history.** After Apply, the timeline/history shows exactly one step for the write, labelled with
   the pass name, and its law ("similarity" in the words the UI uses; find them in overlay/src/words.js and laws.js).
   Undo from that step restores every file byte for byte (the `snapshot` helper in cleanup.test.mjs).

## File 2: `e2e/cleanup-spacing-proofs.test.mjs` (spacing pass)

Each from pass-spacing.md's table, pass at its default (keep):

4. **Grouping is kept.** The aside from `MotionStandardsPage.tsx` (eyebrow, `h2 mt-2`, `p mt-2`, `nav mt-5`: 8/8/20).
   The pass proposes nothing for it, and Apply (if offered at all) leaves that file's aside unchanged.
5. **One rhythm for the site.** Two pages with the same off-scale drift (e.g. a `mt-[7px]` stack on each): both are
   moved to the same value.
6. **Refuse, don't guess.** A stack whose distance comes from `gap-[1cqw]` (crafting-ui's `/`) and one whose margin
   comes from a stylesheet rule: nothing is written for either; the files are unchanged after Apply/the pass's end.
7. **Nothing to do is said.** A page already on its scale: the panel says so (words.js `nothing:` line), Apply is not
   offered, and no file changes.
8. **One step in the history.** Like 3, for the spacing pass: one step, law of proximity on it, Undo byte for byte.

## Report

Write `docs/briefs/cleanup-proofs.result.md`: per test, passed/failed, the command, and the raw tail of its output.
For a failure, what the page/panel showed vs expected. Keep it short.

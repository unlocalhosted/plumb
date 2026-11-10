# CI failures on main: classification and fixes

Runs: 42000734669 (46 failing of 1006) and 41825536774 (48; adds 3 more, one of which is flaky). Every test below was run alone
(`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test --test-name-pattern="^<name>$" e2e/<file>`)
on `release-0.4.0` after `npm run build`, before any change. Raw first-run output is kept in the session scratchpad; the quoted errors
below are copied from it (local) or from `gh run view <id> --log-failed` (CI).

Classes: (a) stale expectation, (b) real product bug, (c) environment or flake. Counts (the 46 of run 42000734669 plus the 3 only in the
other run = 49 tests):

| class | tests | state |
|---|---|---|
| (a) stale expectation | 37 | 35 fixed and committed; 2 left (retired flow, needs a rewrite) |
| (b) product bug | 2 | left as is |
| (c) environment or flake | 10 | left as is |

(One of the fixed (a) tests, `blueprint-next-performance`, is fixed only as far as the sandbox lets it run: see its entry.)

Local-environment caveat that matters for re-running: this worktree lives under `.claude/worktrees/`. With a dot directory in the project
path, the overlay reads every place of a fixture twice (`fixtures/.x/src/App.jsx` and `src/App.jsx`), so counts double
(`blueprint-determinism`, `fixpanel` count tests fail locally for that reason alone and pass in CI). Those were verified in a copy of the
tree at a path with no dot directory. That doubling is itself worth a look (a project inside a dot directory would be counted twice), but it
is not what failed in CI.

## (a) Stale expectations, fixed

| test | file | what changed in the overlay or CLI | commit |
|---|---|---|---|
| words, plates, hidden and empty, nesting and density, position and clipping, runtime values, the page changes while on, budgets and the way back (8) | e2e/blueprint-corners.test.mjs | The test waited for `.dock .say` to match `/problems? in view\|nothing to fix/`. The count now lives in the Blueprint bar, and the dock keeps only `data-in-view` for scripts. `nesting`: `readsFor` is no longer fed (the reader asks the server once per (stamp, tag, classes) through `POST /__plumb/page`), so the test now counts the page request items for the row site. `runtime values`: the label now reads `marginLeft: k * 13. This works out to 13px.` | 8c79d98 (count moved), 26f7c80 (bar), ebc7814 and 82796c6 (whole-page read), 6e3712a (label) |
| resolve validates tracked source identity... | e2e/locate.test.mjs | HMR hook is now `const hot = createHotContext(...); hot.on('vite:afterUpdate', ...)` | dddfa8d |
| Alt+B registers the page..., Only drift is drawn..., With motion... (3) | e2e/blueprint.test.mjs | The dock hides while Blueprint is on, so `getByRole('button', {name:'Blueprint'})` finds nothing (state read from `.dock .bp-toggle` instead); the bar's line says `N problems`, the causes are in its `.readout` | 26f7c80 |
| At rest one line..., A glow clicked..., Links from one component..., Add to theme, Make it yours and Keep it (4) | e2e/fixpanel.test.mjs | Same count split (`2 problems` in the line, `1 fix` in the readout). `Add to theme...`: after Keep on `p-[13px]`, the same class is still offered by `craft/content-align` ("Text off the column"), so the end state is two causes, not one | 26f7c80; cd066ff (rule text) |
| A quiet element..., An element with two problems..., No step the theme has... (3) | e2e/select.test.mjs | New rule `craft/card-optical-padding` (f6a0bd2) fires on the fixture card (`p-s4`), so the "quiet" page was not quiet and the status label's click landed on the card's cause: the card now uses `pt-s3 pb-s4`. The tracking-token note is no longer the first `.note` (a Tailwind default's cause says "Add it to your theme and it's yours"), so the walk goes on to the token cause | f6a0bd2, 8c79d98 |
| packed release rebuilds stale dist... | e2e/packaging.test.mjs | `dist/recipes/packs/first.json` ships beside the compiled modules; allowed when a same-path source exists | 3ade9d8 |
| two-host-configs... | e2e/project-layouts.test.mjs | doctor says `the running app is checked in the browser` instead of `runtime not observed` | 32b8079 |
| ledger default shows only new sites... | e2e/report.test.mjs | the fixture's `--json` report is 1.19 MB, over `spawnSync`'s 1 MiB default (ENOBUFS); buffer raised | (report growth) |
| habit detail rows keep reason columns populated... | e2e/report-nits.test.mjs | the reason column folds under the location column, so its words are interleaved in flattened text; the test now reads the column by offsets | f83a5e5 |
| new/legacy x ts/mts/js/mjs config keeps baseline... (8) | e2e/rename.test.mjs | `accept-decisions --why` now stamps only decisions it adds or changes; baseline already accepted today's, so the test adds a theme step first | cf589a6 |
| your setup: the note..., your setup: Apply writes... (2) | e2e/readiness-panel.test.mjs | the dock's tools are folded to zero width at rest; the test hovers the dock first | 26f7c80 |
| every write is in the dock's history... | e2e/text-edit.test.mjs | History is a timeline strip (slider + ticks), not a list of rows with Undo buttons; the test reads the slider's `aria-valuetext` and undoes with Backspace / Shift+Backspace. Title changed from "newest first" to "which opens at the newest" | 728179c, 26f7c80 |
| Next unstamped 216-card blueprint... | e2e/blueprint-next-performance.test.mjs | `drift` counts places (the 216 cards are one inline-style site, plus the header = 2), heat is per element (217 hits). Fixed for the Vite stage. The Next stage cannot run in this worktree: Turbopack exits with `Symlink node_modules could not be resolved: the symlink target leaves the filesystem root` (the worktree's `node_modules` is a symlink to the main checkout). Not verified past that point | cb6db38, 82796c6 |

## (a) Stale, not fixed (the flow was retired; the test needs a rewrite, not new words)

| test | file | evidence |
|---|---|---|
| homepage guards dev writes and replays static overlay fixes in any order | e2e/site-replay.test.mjs | waits for `getByRole('dialog')` after `pin(element)`, then clicks an option and `Apply 1 change`. `pin()` now opens Blueprint with the element's cause in hand and never opens the reading card (`overlay/src/widget.js`: "The old reading card is retired and never opens"; commit 069f6f5). The same flow in the homepage's static replay is the product under test, so the rewrite needs the owner's call on the new interaction. |
| frozen overlay Write proves exact source... | e2e/verify-writes.test.mjs | same cause; the failing step is `pick` in `bench/apps/write.mjs:118` (`dialog.waitFor`), which is outside `e2e/`. |

## (b) Product bugs, left as is

1. **cli: tailwind-min emits the schema with no failing findings** (e2e/cli.test.mjs).
   `AssertionError: $.numericSpacing.reset: unexpected property`. `NumericSpacing` in `src/decisions/spacing.ts:8` has `reset: boolean`
   and `own: boolean` (added in 31fb116 and 3d05c20), `schema/report.schema.json` (`numericSpacing`, lines 52-56) allows only `unit` and
   `replaced` with `additionalProperties: false`. The public JSON schema and the CLI output disagree.
2. **blueprint-determinism** (e2e/blueprint-determinism.test.mjs:131). CI: `problems` 151, `places` 150; the test asserts
   `places >= problems`. The extra problem is `craft/tabular-nums` on the "Row" elements: a craft finding that suggests an edit is counted as
   a problem (`isNote` is false) with no line or column, so it adds one `file:undefined:undefined|rule|text` key to `drift`
   (`overlay/src/blueprint-reader.js` `#report`) while `#places` skips every craft mark (`mark.family !== 'craft'`). Dump of the marks:
   `["row-px-[9px] mt-[11px]-10","craft/tabular-nums","font-variant-numeric","src/Tall.jsx",null,null,...]`. The doc comment of `progress`
   says problems are places in the code; this one has no place. Either the count or the assertion has to change; that is a product call.

## (c) Environment or flake, left as is

| test | evidence |
|---|---|
| one bar at 1440 wide | passes locally. CI: `the bar still fits with its tools out ... + 'bar-close'` (run 41825536774: `'close'`): the Close button spills out of the bar by CI's font metrics. Possibly a real layout fragility at Linux fonts; not reproducible here. |
| Apply is one step in the history... (cleanup-site) | passes locally. CI: `waiting for locator('.fx .bar .more') to be visible` timed out at 30 s. |
| Noise: a well-built page yields no craft finding... | passes locally. CI: an extra `baseline-align` finding ("baselines are 1.8px apart"), a font-metrics result. |
| timeline 3 + 4... (qa-fixes-2-overlay) | passes locally. CI: `History says it, with its Undo; the panel says nothing more  1 !== 0`. |
| a double-click edits the words in place... (text-edit) | passes locally. CI: `.wt` "Changed tiny to small in App.jsx" never shown in 30 s. |
| A rem type scale reads in whole px... (units) | passes locally. CI: `16 !== 18`. |
| a theme without a tracking step is offered one... (craft-token) | failed once locally (`page.evaluate: Execution context was destroyed ... navigation` at the `token` write, same as CI) then passed 2 of 2 on rerun: the write makes Vite reload the page while `page.evaluate` is awaiting its answer. A race in the test, not a wrong expectation. |
| author wins only its opening (stamp), Motion › hover and press (element-card), Alt+click on words (text-editor) | only in run 41825536774. CI: a 503 console error, and `Cannot read properties of null (reading 'shadowRoot')` (the overlay not mounted yet). All three pass locally. |

## Re-runs of the fixed tests

Each fixed test passed twice in a row, run alone, after its last edit:

- blueprint-corners (8), blueprint (3), select (3): in this worktree, 2 of 2.
- rename (8), report-nits, readiness-panel (2), text-edit history, locate, packaging, project-layouts, report: in this worktree, 2 of 2.
- fixpanel (4): 2 of 2, in a copy of the tree at a path without a dot directory (see the caveat at the top; in the worktree itself the
  counts double).
- blueprint-next-performance: the Vite stage passes its assertions; the Next stage did not start (Turbopack symlink error above), so
  this one is not shown green end to end.
- site-replay and verify-writes: not changed, still red.

Commits (all on `release-0.4.0`, not pushed): one `fix(e2e): ...` per test file, 13 files, plus this brief.

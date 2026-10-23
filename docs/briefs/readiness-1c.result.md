# Readiness 1c result

Implemented the requested engine fixes and diagnosed the React 18 flake.
Focused checks and 20 final cold sequences passed. The required single full
run was not green: concurrent builds invalidated CLI checks, and a homepage
click failed. Isolated follow-ups passed; details and failed attempts follow.

## Readiness fixes

`src/readiness/config.ts` follows the imported `plumb` binding, including renamed
bindings, independently of its import specifier. Local build paths and package
aliases now establish plugin presence and JSX-relative order. Plumber before
Tailwind with Vite's built-in JSX transform reports `locate.order: ok`; an actual
React transformer before Plumber still reports missing and offers reordering.
The same binding supplies the insertion position for the installed Fast Refresh
plugin, so path/alias imports receive the import-and-call diff immediately after
Plumber. Existing collision-safe import naming remains intact.

Property removal consumes its separator and adjacent whitespace, or its complete
line when appropriate. Integration coverage applies the consented HMR fix and
compares the entire resulting config: inline first/middle/last/only properties,
trailing commas, multiline first/middle/last/only properties, and CRLF. The
original panel Apply test passes with its exact unchanged-config assertion.

Path/alias tests create `fixtures/.apply-live-style-*` projects containing the
overlay demo's actual `src/`, `index.html`, and adjacent `vite.config.mjs`. They
exercise readiness, consented application, subsequent readiness, and compilation
and live readiness through Vite loading the written config.

## React 18 cause

The failing navigation was **not an optimizer reload**. Captured failures show
a filesystem update of the fixture's freshly written `index.html` after Vite
installs its watcher, before the browser connects. Vite's HTML HMR path sends
`{ type: 'full-reload', path: '/index.html' }` even without a loaded module.
Vite buffers that message while there are no WebSocket clients, then delivers
it on the first connection. The first page immediately reloads, giving either
two navigations or an execution-context-destroyed error during locate.

The captured server stack is `onFileChange -> onHMRUpdate -> handleHMRUpdate ->
hmr -> environment.hot.send`. It never enters the optimizer's reload path.
`DEBUG=vite:deps` records just the initial explicit dependency bundle. There is
no late dependency discovery, overlay graph reoptimization, or source-map worker
request responsible for the reload. This is delayed native FSEvents delivery
from fixture construction, not a React 18 location failure.

For example, `bundled/run-5.log` records the HTML reload at 12:48:49.072 UTC,
the initial dependency bundle finishing at 12:48:49.094, the first document
request at 12:48:49.521, the queued reload reaching the socket at 12:48:49.638,
and the second main-frame navigation at 12:48:49.686. The reload decision
predates every browser request.

The React 18 locator fixture now selects native `fs.watch` (`useFsEvents: false`)
so it observes saves from subscription onward, without FSEvents replaying its
construction writes. HMR remains enabled. The React 19 native-FSEvents and
polling cases, and all optimizer settings, stay intact. This fixes the test's
watcher lifecycle rather than changing the production optimizer or locator.
The original one-navigation assertion remains unchanged. An additional React 18
browser slice intentionally edits HTML after locate, requires a real native
watcher reload, waits for the updated document, and then performs the original
source-write slice. No retries or increased timeouts.

## Verification

- Removal checks: 13 passed, including the original panel Apply click and 11
  complete-file removal comparisons. Receipt: `/tmp/plumb-1c-removal-green.log`.
- Binding/order/Refresh checks: 14 passed. Receipt:
  `/tmp/plumb-1c-import-green.log`.
- Cold diagnostic runs use fresh fixture roots and fresh `.vite-cache` directories
  on every run, with `DEBUG=vite:deps`, browser requests, WebSocket frames, and
  server reload stacks captured under `/tmp/plumb-readiness-1c/`.
- Installed Chrome 155: 20 isolated React 18 cold runs and 20 sequences containing
  native React 19, polling React 19, then React 18 passed. Receipts: `before/`
  and `sequence/` in that directory. These clean runs did not establish a fix.
- Historical bundled Chromium 153: 20 unchanged cold sequences reproduced seven
  failures, runs **5, 8, 10, 15, 16, 18, 20**. All seven received the queued
  `/index.html` reload. Receipts: `bundled/run-{1..20}.log`.
- An atomic-HTML-publication probe passed 20/20 sequences (`atomic-probe/`), but
  a subsequent 20-sequence check with the explicit HTML-save regression failed
  at startup in runs 11, 13, 14, 18 (`final/`). These failures had the same
  queued `/index.html` reload. Atomic rename was therefore rejected and removed;
  the clean first comparison was insufficient evidence. Temporary comparison
  harness and tracing are removed before full verification.
- Final native-`fs.watch` check on Chromium 153: **20/20 cold sequences passed**,
  60 browser tests with no failures or skips. Every React 18 case retained the
  one-document locate assertion, then required a second navigation after the
  intentional HTML save. Receipts: `fswatch/run-{1..20}.log` and
  `fswatch/summary.txt`.
- Installed Chrome 155 after removing all tracing: 3/3 Vite cases passed,
  including native and polling React 19 and the React 18 save/reload slice.
  Receipt: `/tmp/plumb-readiness-1c/chrome-final.log`.
- Required full-suite command (one run):

  ```sh
  PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
  ```

  **Exited 1:** the main group recorded **433 passed, 66 failed, 1 skipped**,
  500 total, in 1044.54 seconds. Receipt: `/tmp/plumb-readiness-1c/full.log`.
  All readiness regressions, the original panel Apply check, React 18 locate,
  and both Next.js locator cases passed in this run.

  Concurrent builds cleaned and replaced the shared `dist` directory. The 65
  CLI failures explicitly report missing `dist/cli.js`, `dist/config.js`, or
  other built modules: four findings tests, seven progress tests, nine setup
  tests, and 45 CLI tests. The other failure was homepage replay: the header
  and overlay intercepted its visible nut-button click. Its cause is not
  established by this run. No second full-suite run.

The runner stopped after the failing main group. Supplemental checks used a
detached checkout at `ff95c34` with its own build, root dependencies and the
site's installed dependencies linked in. They exclude concurrent overlay/site
edits and do not erase the failed full run:

| Supplemental check | Passed | Failed | Skipped | Receipt under `/tmp/plumb-readiness-1c/` |
| --- | ---: | ---: | ---: | --- |
| Four affected CLI files, first isolated run | 63 | 2 | 0 | `isolated-cli.log` |
| Site PTY after linking site dependencies | 1 | 0 | 0 | `isolated-site.log` |
| Progress plus homepage replay after the full run | 2 | 0 | 0 | `isolated-final-checks.log` |
| Bounded burst, original 8 MiB semispace cap | 4 | 0 | 0 | `isolated-burst.log` |
| Forced polling | 25 | 0 | 1 | `isolated-polling.log` |
| Watching disabled | 23 | 0 | 3 | `isolated-watch-disabled.log` |

Supplemental skips are the runner's existing watcher-mode guards.

The first isolated site's missing dependencies caused token/ledger diagnostics;
linking its installed packages restored that check. The other initial isolated
failure was the untouched progress test: it rejected
`########################  100%  Done | 3s` because its assertion expects no
elapsed suffix. The same assertion passed in the post-full-run check. Neither
assertion was relaxed. Every affected CLI check and homepage replay therefore
has passing isolated coverage. The homepage check also logged one development
font request outside Vite's allow list because dependencies are linked from the
original checkout; that warning remains a limit of the isolated environment.

This task adds no unit tests and changes no files in `overlay/src` or `site/src`.
Nothing pushed. Existing `site/src/hero/Hero.jsx` work and unrelated untracked
files are preserved. A concurrent naming edit to `overlay/src/widget.js`
appeared during the full run (mtime 2026-10-23 18:32:03 IST); it is also
preserved outside these commits, along with matching edits to
`e2e/overlay.test.mjs` and `e2e/walk.test.mjs`. Full-run results describe the
shared worktree, including those concurrent edits, rather than an isolated
checkout of task commits.

## Commits

- `5bc0e3a` — clean property removal and integration coverage.
- `05e484d` — import-independent binding recognition, order, and Refresh coverage.
- `ff95c34` — native React 18 watcher startup and real HTML-save reload coverage.
- Final result document is committed after recording the full-suite outcome.

Each task commit ends with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

# Three loose ends — result

## Changes

- `3cc2240` — Move wrapped location continuations after the fix line. Wrapped findings now read subject, reasons, `→` fix, then location/sites. Existing inline columns stay intact. The layer-3 real-PTY e2e checks exact output and explicitly verifies site ordering for single-site and multi-site findings at 80 and 100 columns. The updated expectation failed against the old renderer before the fix; all four CLI finding e2e tests pass afterward.
- `f6861a3` — Pre-bundle `react`, both JSX runtimes, `react-dom`, and `react-dom/client` together in the Vite locate fixture. `optimizeDeps.noDiscovery` prevents late dependency discovery from regenerating shared chunks and reloading the page during asynchronous locate assertions. A main-frame navigation count now asserts that the entire initial locate slice uses one document. Source-edit/HMR checks remain enabled afterward. No retry or timeout increase.
- `3b88c88` — Wait for a connected, currently rendered Greek bar whose computed fill is mint. D-held preview changes host layout; Greek measures in idle time and replaces its SVG rects on a later animation frame. Playwright can resolve a rect before replacement and evaluate it afterward, when it is detached. A temporary browser probe captured `{"detached":true,"oldFill":"","liveFill":"rgb(168, 240, 198)"}` during the actual preview flow. This is a stale-node test read, not a visible product defect. The final test queries and reads the live bar together inside `page.waitForFunction`; the probe was removed. No edits to `overlay/src`.

## Focused verification

- Build and `node --test e2e/cli-findings.test.mjs`: 4 passed, 0 failed, 0 skipped.
- `node --test --test-name-pattern='Vite React 18:' e2e/locate.test.mjs`: 5 consecutive passes. Deleted `fixtures/react18/node_modules/.vite` before **each** run. Each test also creates its own temporary fixture and `.vite-cache`. Every run exercised real React 18 fibers, exact JSX locations, and a source write; the new no-reload assertion passed. Logs: `/tmp/plumb-loose-ends-react18-{1..5}.log`.
- `node --test --test-name-pattern='Gaps on the system' e2e/blueprint.test.mjs`: 10 consecutive passes, including D-held preview, mint ink, release restoration, viewport changes, and cleanup. Logs: `/tmp/plumb-loose-ends-blueprint-{1..10}.log`.
- All browser checks use `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

## Full verification

Required command:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Two consecutive complete runs exited 0 with the same counts in each:

| Phase | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Main/native | 441 | 0 | 1 |
| Forced polling | 25 | 0 | 1 |
| Watching disabled | 23 | 0 | 3 |
| Total | 489 | 0 | 5 |

Logs: `/tmp/plumb-loose-ends-full-2.log` and `/tmp/plumb-loose-ends-full-3.log`. Both runs include the main suite, forced polling, and watching disabled. No changes were made to the tested implementation or harnesses between these two runs. The five skips per run are the existing watcher-mode-specific skips.

An earlier attempt stopped after the main/native phase: 440 passed, 1 failed, 1 skipped. The unrelated chooser-write test timed out waiting for the dock's `Wrote 1 edit to App.jsx` message (`e2e/blueprint.test.mjs`, line 333). Log: `/tmp/plumb-loose-ends-full-1.log`. A focused baseline and five consecutive instrumented reproductions passed; apply responses were HTTP 200, including runs with a Vite document reload. No cause was established and no speculative change was made. Temporary probes were removed before restarting full verification. Probe logs: `/tmp/plumb-loose-ends-chooser-probe-{1..5}.log`.

## Scope

Only the renderer, its PTY e2e, the two browser harnesses, and this result file were changed by this task. Existing `site/src/hero/Hero.jsx` work and other unrelated work were left untouched. Every task commit ends with the requested co-author trailer. Nothing pushed.

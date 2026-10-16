# Brief: the last CI failure — health blocked 569 ms on GitHub (session-burst)

CI run 38897046712 (Node 24, ubuntu-latest, 2 vCPU): `e2e/session-burst.test.mjs:49` failed
`health blocked 569.46ms` (budget 50 ms). The same test failed on 2026-10-14 CI with 332 ms. Locally it's ~40 ms.
The test runs Session in-process: 300 overlapping reads right after an unrelated save, then fetches /__plumb/health
three times and requires each answer within 50 ms.

Find out which of these it is, with measurement, before changing anything:
- **Main-thread blocking in the product**: some step (reconciliation after the save, a synchronous parse/read, JSON
  serialisation of large results, a sync fs call) holds the event loop for hundreds of ms on a slow CPU. Measure with
  `perf_hooks.monitorEventLoopDelay` / `PerformanceObserver` long tasks and `--cpu-prof` while reproducing under CPU
  contention locally (e.g. run the test with `taskpolicy -c background` or alongside a CPU hog pinned to the cores,
  or limit worker threads to 2 to mimic the runner). If a step blocks the loop for more than ~50 ms on a 2-core
  machine, that's a product bug: the overlay polls health and would stall. Fix it by chunking/yielding or moving the
  work to a worker, and keep the 50 ms budget.
- **CPU saturation only**: the loop is free but the process can't get scheduled because 300 reads plus workers
  saturate 2 vCPUs. Then measure what the test means to protect (the event loop is not blocked) directly with
  monitorEventLoopDelay, keep a strict budget on that, and keep a looser wall-clock sanity bound. Explain the numbers.
Also look at e2e/session-burst.test.mjs:129 (100 ms HTTP budget) for the same risk.

No budget is loosened without the measurement that justifies it in the result. Full suite once at the end:
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Atomic commits ending
with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src, site/src, or the unstaged
site/src/hero/Hero.jsx. Don't push. Write docs/briefs/ci-health-budget.result.md and commit it.

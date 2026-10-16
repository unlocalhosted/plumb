# CI health budget result

The reproduced stall comes from synchronous assertions in the test's HTTP-host process, amplified by CPU contention. It is not evidence of a synchronous reconciliation or parse in the product. Moved the 300 deep comparisons outside the measured interval; retained every comparison and both existing HTTP budgets. No product code changed.

## Measurement before the change

Used Node **24.21.0**, macOS arm64, an eight-logical-CPU Apple machine. Ran the actual 1,000-file/300-read integration workload with `--cpu-prof`, a 1 ms `monitorEventLoopDelay` sampler, event-loop utilization, and host-thread CPU accounting (`process.threadCpuUsage`). Worker CPU is excluded from that accounting. Measurements began after fixture creation, initial reads and health warmup.

The original three health probes can all finish before the response/verification wave. Under 16 competing CPU workers, they passed at **16.18 / 8.31 / 1.31 ms**, although the full-burst loop maximum was **963.12 ms**. Continuing probes until the burst settled reproduced **940.94 ms** health latency and **923.80 ms** loop delay. The largest adjacent timer gap was **923.20 ms wall / 308.07 ms host CPU**. That is substantial host execution as well as lost scheduling time, not a free event loop suffering only scheduler starvation.

The CPU profile between the start/stop marker subtrees attributed **576.62 ms of self-sampled duration** to Node's deep-comparison functions (`keyCheck`, `objEquiv`, `innerDeepEqual`, `objectComparisonStart`, etc.). These durations include scheduling delays and must not be read as CPU time. Deferring only the comparisons removed all comparison samples from that measured window; all 300 comparisons still ran afterwards. The tests' response graphs are cloned onto the host by design for the public programmatic API, but the expensive assertions are test work, not an overlay operation. Parsing/reconciliation continue in the existing workers.

A second matched run used six competing CPU workers and `UV_THREADPOOL_SIZE=2`:

| Measurement | Original assertions during burst | Comparisons after measurement |
| --- | ---: | ---: |
| In-process maximum health latency | 337.98 ms | 11.02 ms |
| In-process maximum loop delay | 282.07 ms | 17.43 ms |
| In-process p99 loop delay | 81.26 ms | 7.55 ms |
| In-process host CPU over measured interval | 596.10 ms | 573.36 ms |
| Health probes through the burst | 48 | 126 |
| Separate HTTP host maximum loop delay | 28.74 ms | 13.48 ms |
| Separate HTTP health probes | 49.31 / 10.35 / 4.20 ms | 21.37 / 6.00 / 2.56 ms |

These are individual local reproductions under contention, not measurements from a controlled two-vCPU runner or a new GitHub CI result. More health probes and profiling instrumentation contribute to the host CPU totals; this is not a throughput comparison. The original failure mode reproduced at both six and sixteen competing workers.

The earlier HTTP test has a separate client process, so its response-byte comparisons do not block its HTTP host. Its dominant named host profile frame remained socket writing (`writevGeneric`), with no deep-comparison samples. Each site response was **521,820 bytes**, each edits response **102,175 bytes**; all 300 responses retained exact Node/Web/programmatic JSON parity. No justification to widen its **100 ms** budget was found.

## Change and regression coverage

- Defer deep equality checks until after the programmatic burst and event-loop measurement finish. No result validation removed.
- Probe in-process health throughout the burst, retaining the **50 ms** wall-clock limit and **5 s** burst bound. Capture throughput before post-workload comparisons.
- Measure the entire burst with `monitorEventLoopDelay` in each actual HTTP host. Require nonempty sampling and **maximum loop delay below 50 ms**, including the separate HTTP host. This catches stalls after the three early HTTP probes.
- Retain the existing **100 ms** HTTP probe limit, overlap checks, admission/deadline checks, reconciliation bound and unrelated-save correctness checks.
- Keep timing diagnostics compact. No unit tests added. No changes to `src`, `overlay/src` or `site/src`.

This resolves a third cause omitted from the brief's initial alternatives: test-originated main-thread blocking, magnified by scheduling pressure. Moving product work to another worker would not remove `assert.deepEqual` callbacks executed by this test on its host thread.

## Reproduction and evidence

[Committed measurements](ci-health-budget.measurements.json) retain sampler readings, host-thread CPU gaps, response timings and CPU-profile summaries/hashes. Raw logs/profiles from this run are under `/tmp/plumb-ci-health`; regenerate them with the committed harness:

```sh
npm run build
UV_THREADPOOL_SIZE=2 node bench/session-health/measure.mjs \
  --ref 687256b --hogs 6 --output /tmp/plumb-health-before
UV_THREADPOOL_SIZE=2 node bench/session-health/measure.mjs \
  --hogs 6 --output /tmp/plumb-health-after
```

Use Node 24. The first command is expected to fail the unchanged 50 ms health limit. The harness reads historical test/host sources with `git show` while using the current, unchanged product build; it adds temporary full-burst probes and measurement in scratch copies. The second uses current tests. Each invocation writes `--cpu-prof` profiles for the test host, HTTP host and their workers, plus environment metadata. CPU hogs are stopped on completion; a 90 s deadline terminates the profiling process group.

Limits observed rather than hidden: an exploratory sixteen-hog deferred-comparison run still had a **51.09 ms** timer maximum; its two largest gaps used only **2.54 ms** and **1.25 ms** host CPU, indicating scheduling pressure. The new strict 50 ms loop check would reject that run; no allowance or percentile substitution was added. A `taskpolicy -c background` attempt produced no workload measurement before being stopped. One six-hog after run hung during HTTP-host startup; a native sample showed Node/OpenSSL `crypto::Hash::GetHashes` waiting in a pthread write lock before Session readiness. It was terminated, excluded from HTTP comparisons, and the complete matched retry above passed. Its completed first-test measurement is retained in the JSON.

## Validation

- Focused Node 24 integration: **4 passed**, including busy admission and configuration reload recovery. In-process loop maximum **9.57 ms**; separate HTTP host **46.24 ms**.
- Contended profiled integration: original **1 failed / 1 passed**; fixed complete retry **2 passed**, without relaxing budgets.
- Required full suite ran **once**, on Node 24, with `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` (selected Node with `fnm exec --using=24`): **exit 0**. Build passed; main suite **451 passed / 1 skipped** (771.17 s), polling **25 passed / 1 skipped** (40.93 s), watch-disabled **23 passed / 3 skipped** (38.67 s). Total **499 passed / 5 skipped / 0 failed** across 504 test executions.
- In that full run, programmatic health max was **8.20 ms** across **77 probes**, with **10.31 ms** maximum host-loop delay. HTTP health was **44.31 / 0.60 / 1.14 ms**, with **7.38 ms** maximum host-loop delay. All byte-parity, busy/deadline and save/reconciliation checks passed.
- `git diff --check` passed. Existing unstaged `site/src/hero/Hero.jsx` work and unrelated untracked files were preserved. No push performed.

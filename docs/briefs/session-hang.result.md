# Session hang result — 2026-10-10

Implemented without committing. MetalUI tracked files were left untouched; Vite configs, compiler caches and CPU profiles were placed under `/private/tmp/plumb-hang-profile`. Port 4320 was already occupied, so the investigation used 4327 and 4328.

## CPU evidence

Captured the host Vite process through the Node inspector's `Profiler.start` / `Profiler.stop` commands. This profiles the host thread, independently of the existing analysis worker.

The baseline profiles put Plumb filesystem reconciliation on the host thread: `scan`, its per-file callback, `scanDirectory`, and `node:internal/fs/promises.lstat`. In the longer baseline burst, 906 of 1,954 non-idle samples were in the native/JS `lstat` frames; another 393 were in the reconciliation frames. The short original reproduction took 1.93 seconds and held health behind reads for 1.81 seconds. It included a malformed resolve position; the later benchmark uses verified JSX positions and validates all responses.

There were two queues to fix: every read performed its own reconciliation, and the 250 ms polling timer appended another scan even when its predecessor was still running. Health was serialized behind both and performed another full reconciliation itself. JSX ownership parsing/classification also lived in the host Session; that work now lives in the coordinator worker even though it was not the dominant profile frame.

The contended post-change profile had 1,808 idle samples out of 1,920 (94.2%). No Plumb `scan`, `scanDirectory`, or filesystem `lstat` frames appeared on the host thread. Remaining host frames were worker messaging, HTTP response handling, and GC. This removes the identified blocking path; it does not promise an OS scheduling bound during unrelated system load.

Raw profiles and receipts:

- `/private/tmp/plumb-hang-profile/startup.cpuprofile`: original host reconciliation.
- `/private/tmp/plumb-hang-profile/before.cpuprofile`: initial burst.
- `/private/tmp/plumb-hang-profile/final-before.cpuprofile` and `final-before.json`: 300 valid baseline reads under concurrent test load.
- `/private/tmp/plumb-hang-profile/final-after.cpuprofile` and `final-after.json`: same valid burst under concurrent test load.
- Final quiet-run receipts are recorded below.

## Behavior

`src/session/index.ts` is now a small host facade. A coordinator worker owns the old Session engine, filesystem inventory, source snapshots, source classification, JSX parsing, watches, reconciliation, and mutation guards. The existing analysis worker remains behind it. Host admission, pending-response bookkeeping, and cached health are bounded; filesystem work never executes there.

The coordinator collects adjacent reads, validates their file paths before scanning, and reconciles the union of their dependencies once. Reads arriving during that reconciliation reuse the same result when their paths are covered. Apply, try, and explicit refresh remain ordered barriers. Cohorts and worker queues each have a 512-entry limit, and the host accepts at most 512 pending calls. Background polling and watcher callbacks share one in-flight refresh instead of appending scans.

Read queue wait defaults to 5,000 ms, configurable via `SessionOptions.readQueueMs`. Deadlines are checked before execution, and host timers enforce expiry even while a worker is busy. Node and Web handlers return `503 { "status": "busy" }` with `Retry-After: 1`. Admitted execution finishes normally; writes are not abandoned midway.

Health returns the last worker snapshot immediately, with no filesystem scan or worker request. Watch clients now explicitly call the authenticated `refresh` endpoint before reading health, preserving `check --watch` when native watching and polling are disabled. Startup status, revision, diagnostics and cache counters remain available. `health.work.reconciliations` exposes the number of reconciliation passes for integration verification.

## Integration checks

`e2e/session-burst.test.mjs` covers the public worker-backed Session and both HTTP adapters:

- A fixture with 1,000 generated source files serves 300 overlapping site, resolve and edits reads within 5 seconds; every result equals its sequential reference.
- HTTP health completes within 50 ms during the burst.
- The burst uses at most two reconciliation cohorts, rather than 300 reconciliations.
- Zero-budget reads return the exact busy response through Node and Web handlers, while health still returns 200.
- A positive 50 ms budget expires during a real 300 ms configuration-module reload; health remains immediate, and reads recover afterward.

Existing filesystem/race-injection integration tests import the worker engine at their original OS-hook seam. Public API, host, CLI and HTTP integration tests continue using the facade. No unit tests added.

Validation status and final MetalUI timings will be filled after the final runs complete.

## Reproduce

Build with `npm run build`. Copy `bench/metalui/overlay.vite.config.mjs` outside MetalUI, replace its relative Plumb/config imports with absolute paths, and choose a free port. Start MetalUI's Vite binary from its repository with `--inspect=127.0.0.1:0` and `PLUMB_CACHE_DIR` outside the project. The debugger prints its WebSocket address.

Run:

```sh
node bench/metalui/session-hang.mjs http://127.0.0.1:4327 ws://127.0.0.1:INSPECTOR/ID /private/tmp/plumb-hang-profile/burst.cpuprofile
```

The harness finds the current authored `<BaseButton>` position, obtains sequential references, sends 300 concurrent site/resolve/edits requests, probes health during the burst, checks response parity, and writes the host CPU profile. Baseline isolation used `pollInterval: 60000` to keep the existing 250 ms timer queue leak from swallowing the measurement; the fixed host is also verified with its default 250 ms interval. No tracked MetalUI edits are needed.

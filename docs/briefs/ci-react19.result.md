# React 19 CI locate result

React 19's lost-save mechanism was reproduced and fixed locally. Validation is **not fully green**: one of the five locate runs hit a React 18 navigation flake, and the full suite failed on an npm install timeout in packed setup. Native Linux/hosted CI verification remains unavailable.

## Diagnosis

The failure is a lost consecutive-save event in the locate fixture's Vite watcher. The supplied CI log points to `hmrAssertions` line **223**, which waits for **Again**, not the first **Updated** render described in the brief. The first save and HMR update succeeded. Run [38879950257](https://github.com/unlocalhosted/plumb/actions/runs/38879950257) tested `391f2c23c4605d92d749d713373189ab62955f0c`; its source confirms that line mapping.

Vite 8.3.4 bundles Chokidar 3.6.0. Its `_emit` path suppresses another `change` for the same file within **50ms**, with no trailing delivery. Fast Linux notifications can therefore lose the second save after the first React update. macOS fsevents batching masks this timing; even forcing the Node `fs.watch` backend on macOS produced later notifications that rescued the update.

The optimizer fix from `f6861a3` already applies to both React versions through the shared Vite configuration. Both retain explicit runtime includes and `noDiscovery: true`. This fixture uses manual `import.meta.hot.accept` and `root.render`, without the React Fast Refresh plugin. The successful first update also rules out an initially unready watcher or disconnected HMR client as the explanation for this failure.

References: [Vite watcher configuration](https://vite.dev/config/server-options#server-watch), [Chokidar 3.6.0 change throttling and write-stability implementation](https://github.com/paulmillr/chokidar/blob/3.6.0/index.js). The installed Vite bundle contains the same 50ms throttle and the `awaitWriteFinish` branch before it.

## Reproduction and limitation

No Linux kernel run was available: this host is macOS arm64; Docker, act, Colima, Podman, Lima and QEMU are absent, and there is no Docker socket. No hosted CI run was triggered and nothing was pushed.

Instead, the real browser/Vite/React locate test was run with Chokidar's fast polling backend (`useFsEvents: false`, `usePolling: true`, `interval: 1`) to reproduce rapid notification delivery without macOS batching. The first-update DOM wait also polls at 1ms for Vite, so the next save is not incidentally paced by animation frames. All original stale-source, source-map invalidation and exact-location checks remained in the full reproduction.

Before the fix, the full test failed at the same second-save wait, line 223, with `page.waitForFunction: Timeout 30000ms exceeded`. Temporary watcher instrumentation recorded:

```text
change accepted: 1534.148ms
second change suppressed: 1560.149ms
```

That is a **26ms** gap, inside the 50ms throttle. A minimized reproduction that removed the intermediate source-map/location checks also failed: saves were 11ms apart and the second event was suppressed. The ordinary macOS case passed before the fix. These are local reproductions of the event-loss mechanism, not a claim of native Linux execution; the diagnosis of the hosted failure follows from its exact failing phase and the reproduced shared watcher behavior.

Receipts: `/tmp/plumb-ci-react19-full-repro-before.log`, `/tmp/plumb-ci-react19-poll-before.log`, `/tmp/plumb-ci-react19-write-before.log` (macOS Node watcher recovery). Temporary probes and private watcher instrumentation were removed from the committed test.

## Change

Only the locate E2E fixture changes:

- Configure React 19's watcher with `awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 }`. Chokidar observes the completed write before emitting, including the truncate/write sequence, and uses its write-stability emission path instead of dropping consecutive changes through its 50ms throttle. There is no fixed test sleep, forced watcher event, retry or increased timeout. React 18 keeps its existing watcher configuration.
- Retain the ordinary React 19 and React 18 cases; add a React 19 rapid-watcher case exercising the entire locate/HMR/edit feature slice. It retains the prebundled runtime configuration.
- Assert that source HMR leaves the document at one navigation, alongside the existing optimization navigation guard.

Both ordinary and rapid React 19 cases passed immediately after the fix (2/2, no skips). No unit tests were added. No production host, overlay or site source was changed.

## Validation

Executed on 2026-10-16, macOS arm64, Node **v25.9.0**, using installed Google Chrome. `npm run build` passed before the repeat runs, and the required full command rebuilt successfully too.

Five complete locate runs used:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PLUMBER_WATCH=1 PLUMBER_POLLING=0 \
node --test --test-concurrency=1 e2e/locate.test.mjs
```

| Run | Tests | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| 1 | 11 | 11 | 0 | 0 |
| 2 | 11 | 11 | 0 | 0 |
| 3 | 11 | 10 | 1 | 0 |
| 4 | 11 | 11 | 0 | 0 |
| 5 | 11 | 11 | 0 | 0 |
| Total | **55** | **54** | **1** | **0** |

Both React 19 cases passed in all five runs. Run 3 failed React 18's existing navigation guard (`2 !== 1`), during initial locate, before any authored edit. Its cause remains unconfirmed; this report does not claim five clean runs or a fix for that observation. Receipts: `/tmp/plumb-ci-react19-final-locate-{1,2,3,4,5}.log`.

The required full command was run **once**:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

It exited **1**: **447 tests, 445 passed, 1 failed, 1 skipped, 0 cancelled**. The entire locate file passed, including ordinary and rapid React 19, React 18, Next webpack and Turbopack. The failure was `packed setup: advisory drift, init baseline, install, stamped Alt-hover and a written token fix`: `spawnSync npm ETIMEDOUT` at `e2e/setup.test.mjs:236`, while installing the packed package. The skip was the existing forced-polling guard in native watch mode. Because `npm test` chains stages with `&&`, the subsequent polling and watch-off serve invocations did not run after this failure. No test was retried to conceal the result. Receipt: `/tmp/plumb-ci-react19-full.log`.

An earlier validation batch passed three complete locate runs, then exposed one React 18 `Execution context was destroyed, most likely because of a navigation` failure during initial location assertions. Both React 19 cases passed in that run. Six isolated React 18 runs and six complete Vite sequences with Vite, WebSocket and watcher tracing passed without reproducing the navigation. The final change limits the new watcher configuration to React 19. Earlier receipts: `/tmp/plumb-ci-react19-locate-{1,2,3,4}.log`, `/tmp/plumb-ci-react19-react18-{1,2,3,4,5,6}.log` and `/tmp/plumb-ci-react19-vite-trace-{1,2,3,4,5,6}.log`.

`git diff --check` passed. The protected overlay/site diff matches the starting diff byte-for-byte, including the unstaged `site/src/hero/Hero.jsx`. Other WIP was preserved. The supplied `docs/briefs/ci-react19.log` is removed in the final commit as requested. Nothing was pushed.

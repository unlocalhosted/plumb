# Node 22 CI result

The cache failure was a test setup error, not a Linux cache-key or publication bug. The watcher case now exercises a documented 100ms polling configuration instead of the 1ms stress setting. Native Linux verification remains outstanding; this host is macOS arm64.

## Cache diagnosis and regression

`fixture()` in `e2e/cli-progress.test.mjs` writes an executable config containing a top-level 180ms delay and `export default {}`. `CheckCache.create()` deliberately admits only literal `export default { css: '...' }` configs. Consequently, the two check runs in the failing test never created a whole-report cache key or receipt. There was no differing inode, mtime, realpath, hash, or Node-version key to compare. This also explains why the preceding literal-config cache test passed in the supplied Node 22 Linux log.

The old assertion inspected the terminal's sampled progress frames. A warm analysis can finish its inner phases between display samples, making the test pass without a whole-report cache hit. The original test passed in the initial local Node 22 run; adding an unsampled progress-event assertion to the unchanged executable-config scenario failed deterministically with `whole-report cache hit`. This reproduces the incorrect cache expectation independently of terminal timing. The Linux log's visible `Checking tokens` frame exposed work that macOS and Node 24 could simply fail to sample.

The report-cache portion now writes a literal CSS config and passes its path explicitly. A real CLI preload records every progress event outside the project, in the isolated cache directory. The warm run must report `phase:config` with `cached: true`, emit no inner phase events, preserve the cold run's stdout apart from existing timing normalization, and return the same exit status. Existing terminal-bar assertions remain. The earlier cold-notice/decisions checks retain their executable-config setup.

Publication is already awaited: `check()` awaits `cache.save()`, and the PTY helper waits for the CLI process to exit before returning. The warm process therefore starts after publication, where caching is eligible. No product cache logic was changed and no unit tests were added.

Receipts:

- `/tmp/plumb-ci-node22-progress-before.log`: original sampled assertion passed, 1/1.
- `/tmp/plumb-ci-node22-progress-red.log`: raw-event assertion with the original executable config failed, 0/1, before the fixture correction.
- `/tmp/plumb-ci-node22-cache-final.log`: corrected progress E2Es and cache integration tests passed, **15/15**, no skips. These include source edits, membership, theme/ledger, imported bytes with preserved mtime/size, changed resolution, package metadata, executable configs, and presets.

## Watcher decision and user configuration

Polling is a real user scenario: Vite documents it for WSL2 and Docker with a WSL2 backend. Keep polling coverage. Replace only the artificial **1ms** setting with Chokidar's default **100ms** interval, retaining `awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 }`. The case is named `Vite React 19 (polling watcher)`.

The installed Vite 8.3.4 watcher has two distinct throttles: a 5ms incoming file-handler throttle and a 50ms emitted-change throttle. Write stabilization bypasses the latter, as the previous fix established; it does not bypass the former. Polling every millisecond samples below that input throttle and can observe intermediate write states. Temporary tracing locally observed two notifications 1.7ms apart with the second rejected by the 5ms throttle, followed by successful stabilized delivery. That observation is **not proof of the Linux timeout's exact cause**. The initial two React 19 cases and eight instrumented 1ms runs all passed locally, so the specific hosted failure could not be reproduced here. The trace demonstrates why 1ms polling is an unsuitable stand-in for normal Linux notifications; it does not establish that every rejected notification loses a save.

The retained native and polling cases still execute the complete owner-stack locate/HMR/edit slice: exact JSX attribution, stale-source refusal, map invalidation, two consecutive saves, refreshed attribution, no document reload, and an authored token edit. No timeout, assertion, or save was removed; no fixed sleep, retry, forced watcher event, or private watcher patch remains.

README's **Development overlay hosts** section now gives this opt-in Vite configuration:

```ts
server: {
  watch: {
    usePolling: true,
    interval: 100,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
  },
}
```

For environment overrides, use `CHOKIDAR_USEPOLLING=1 CHOKIDAR_INTERVAL=100` while retaining write stabilization in Vite's config. `PLUMBER_POLLING` controls the separate analysis watcher, not Vite's HMR watcher. Overlay-host documentation should explain this; general CLI output need not prescribe polling to users whose native notifications work. The adapter does not silently change host watcher defaults. This configuration passed locally; its Ubuntu result is not yet verified.

Primary references: [Vite watcher guidance](https://vite.dev/config/server-options#server-watch), [Chokidar 3.6.0 defaults, environment overrides and emission path](https://github.com/paulmillr/chokidar/blob/3.6.0/index.js), [incoming file-handler throttle](https://github.com/paulmillr/chokidar/blob/3.6.0/lib/nodefs-handler.js). The installed Vite bundle was also inspected directly.

## Validation

All new validation uses **Node v22.23.3**, obtained with `npx -y -p node@22`, on macOS arm64 with installed Google Chrome. Three sequential focused Vite runs passed **9/9**, zero skips or failures: native React 19, polling React 19, and React 18 in each run. Receipts: `/tmp/plumb-ci-node22-locate-final-{1,2,3}.log`.

The required full suite ran **once**, with the downloaded Node 22 binary first on `PATH`, and exited **0**. Build passed:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

| Stage | Tests | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Main suite, native watch | 447 | 446 | 0 | 1 |
| Forced polling, serve suite | 26 | 25 | 0 | 1 |
| Watching disabled, serve suite | 26 | 23 | 0 | 3 |
| Total | **499** | **494** | **0** | **5** |

All browser cases ran. Skips are existing mode guards: polling-only in native mode, native-only in polling mode, and three watcher-mode exclusions with watching disabled. Both React 19 locate variants, React 18, both Next bundlers, both report-cache progress cases, and packed setup/install passed. No full-suite rerun was performed. Receipt: `/tmp/plumb-ci-node22-full.log`.

Docker, Podman, Colima, Lima and QEMU are unavailable locally. No hosted run was started, nothing was pushed, and no Linux success is claimed.

`git diff --check` passed. The protected `overlay/src` and `site/src` diff matches the starting patch byte-for-byte, including the unstaged `site/src/hero/Hero.jsx`. Other WIP was preserved. Implementation/test commits are `4d6d766` and `be73012`; this report and removal of the supplied `docs/briefs/ci-node22.log` form the final documentation commit. Each commit has the requested co-author trailer.

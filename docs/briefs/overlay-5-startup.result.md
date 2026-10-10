# Overlay 5 result

Vite now mounts Plumb immediately and starts its Session in the background. Next's development handler likewise returns without awaiting Session creation. The shared Node/Web transport serves client modules during startup, returns `503 { "status": "starting" }` with `Retry-After: 1` for API requests, and returns `200 { "status": "starting" }` for health. Failed startup serves `{ "status": "failed", "diagnostic": "…" }` through the same routes instead of rejecting the host's startup.

Authentication, trusted origins, method validation and public-module handling retain their existing contracts. Vite's process registry still shares equivalent resolved options, retains pending and ready Sessions across restarts, and disposes after the last owner closes. Failed entries leave the registry so a corrected configuration can start on the next restart. Next retains its process token and handler across hot reloads; production exclusion remains unchanged.

## Regression boundary

First bad commit: **`3f83816`**, `feat: every finding says what is wrong, why it matters and what to do`. Its parent is fast. The regression predates edits (`a274654`), hosts (`21c194d`) and locate (`ab53b7e`); those layers retain it.

Each revision was archived and compiled under Plumb's ignored benchmark directory, with a separate compiler cache. Every revision analyzed the same pinned MetalUI **`faa2036e4634e4f6c8d49feaa2dac87a77559501`** snapshot with the same historical all-rule configuration from `d91c102`. The historical configuration avoids the newer `suggest` key, which `d91c102` cannot parse. The warm run is a second fresh process after populating that revision's cache. Full measurements: [overlay-5-bisect.json](../../bench/metalui/overlay-5-bisect.json).

| Revision | Warm report | Warm process |
| --- | ---: | ---: |
| `d91c102` | 1092.8 ms | 1174.8 ms |
| `3f83816^` | 1803.9 ms | 1930.9 ms |
| `3f83816` | 1375.0 ms | 8041.6 ms |
| `a274654` | 1302.6 ms | 6411.7 ms |
| `21c194d` | 1275.4 ms | 6425.9 ms |
| `ab53b7e` | 1209.6 ms | 6206.2 ms |

The first parent/child measurements had concurrent test/build load; their process/report gap still isolates the added formatting cost. Compiler warm runs have 1302 hits, zero misses; module graph warm runs have 1303 hits, zero misses. Collection restores evidence without parsing. Cache format, AST ownership tables, reverse-import indexing and stat reconciliation are not the cause.

Two repeated operations caused the regression:

- `finishMessages` computed `relative(root, file)` for every known file, for every text field, even when that file did not occur in the message. It also runs after ledger classification, outside the reported analysis timing. Paths and normalized strings are now cached within each normalization pass; absent replacements skip `replaceAll`. Replacement ordering and text remain unchanged.
- `familyProvenance` ran Node's glob parser against a long allowlist of literal suggestion names. That policy was also introduced in `3f83816`; the historical configuration above omits it. Exact plain names now use a Set, and suggestion eligibility is memoized per name within the family pass. Names/patterns containing path or glob syntax still use the original `matchesGlob`, preserving its semantics. No cache survives into the next analysis/configuration.

The unchanged HEAD run with the **current** all-rule configuration measured a **13,499.4 ms** warm process median and **8416.7 ms** warm report median. The reported ~27 s live-check latency was not reproduced on this pinned snapshot; the substantial warm regression was reproduced and profiled. CPU samples were dominated by Node's glob parsing and path normalization. Receipt: [final-overlay-5-head.json](../../bench/metalui/final-overlay-5-head.json).

## Fixed measurements and correctness

| Measurement | Unchanged HEAD | Fixed |
| --- | ---: | ---: |
| Warm process median | 13,499.4 ms | 1316.8 ms |
| Warm report median | 8416.7 ms | 1090.6 ms |
| Warm text CLI | 13,936.3 ms | 1163.7 ms |
| Warm JSON CLI | Not separately measured | 1261.4 ms |
| Cold process | Not separately measured | 4805.7 ms |

All three fixed warm processes finish below **2 seconds**. `final-pass.mjs` now records explicit warm report/process medians and text/JSON CLI wall times, and fails if any warm process or either actual CLI exceeds 2000 ms. A named comparison argument supports comparison against this task's unchanged HEAD report rather than historical reports from earlier rule layers. Receipt: [final-overlay-5-verified.json](../../bench/metalui/final-overlay-5-verified.json).

The harness deeply compares **findings, coverage, declarations, decisions, ledger keys and ledger summary** against unchanged HEAD, preserving site/choice/edit ordering, text, acceptance and source evidence. Cold and warm fixed outputs match across those fields. The actual JSON CLI findings also match the API report. Source-content checks, fresh import resolution and stat reconciliation remain in place.

All MetalUI reads use the pinned archive and existing dependency links. All generated source/config/ledger/compiler/profile/report files stay in Plumb's benchmark directories. No installation, live MetalUI write or commit occurred. Existing `overlay/src/api.js`, `locate.js` and `widget.js` edits were preserved.

## Validation and reproduction

Integration coverage holds configuration loading behind a filesystem gate: Vite listens and serves `/` before the gate opens; all API routes report startup, client modules remain available, and site becomes 200 after release. The same slice covers pending restart ownership, failed startup diagnostics, recovery after correcting configuration, and final registry disposal. Isolated Next processes cover immediate client/API/health responses, token enforcement, pending hot reload ownership and ready/failed outcomes. Suggestion-policy integration checks cover exact names, wildcard/extglob patterns, empty allowlists, repeated declarations, changed configuration and cold/warm equality.

Existing host/locate integrations now wait for health readiness where their assertions require completed analysis. Real Vite HTTP, Next Request/Response, Next dev serving, production builds and static export remain covered.

```sh
npm test
npm run typecheck
node bench/metalui/final-pass.mjs setup
node bench/metalui/overlay-5-bisect.mjs
node bench/metalui/final-pass.mjs overlay-5-verified overlay-5-head
```

The final comparison command requires the retained ignored `overlay-5-head.report.json`; for a fresh checkout, run `node bench/metalui/final-pass.mjs after` after first capturing `before`. Setup refreshes only the temporary snapshot's baseline with `--force`, so stale debt from earlier benchmark configurations does not block setup.

`npm test`, `npm run typecheck` and `git diff --check` pass. Native/default runs: 256 passed, 8 skipped; polling: 25 passed, 1 mode skip; watch disabled: 23 passed, 3 mode skips. Total: **304 passed, zero failures, 12 skips**. Browser coverage remains limited in this environment: the default Playwright Chromium revision is missing; an explicit installed-Chrome attempt aborted under the sandbox (`SIGABRT`, `kill EPERM`). No browser pass is claimed. Native recursive watching also reports the existing `EMFILE` skip; polling and watch-disabled modes are checked separately.

**No commits made**, as requested by the brief.

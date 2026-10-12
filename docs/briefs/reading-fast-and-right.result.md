# Reading fast and right: result

Completed part 1's edit regression first, then the reading cache. No commits, pushes, worktrees, installs or writes to the four app repositories. Benchmark output and caches stayed inside Plumb. Protected files were left untouched; pre-existing changes remain in the working tree.

## Numeric spacing and actionable edits

Retained the numeric-scale implementation described in `docs/layers/3-decisions-spacing.md`. A positive, resolved effective `--spacing` supplies numeric spacing unless a project theme reset or three distinct small primitive spacing lengths replace it. Semantic aliases, large dimensions and layout roles do not establish a ladder. Replacement projects keep their named-token policy.

Fixed the regression in the shared replacement path. Numeric choices are synthetic records, so requiring their names or `--spacing` in the declared decision inventory silently removed structured edits. Their validated numeric expression now supplies the utility directly. CSS and inline edits write `calc(var(--spacing) * n)` rather than a nonexistent synthetic variable. Variant, importance and negative utility spelling remain intact.

Updated computed-fixture expectations from `s2` to numeric `10`, preserving the existing attribution, exact-range, stale-hash and actual-apply checks. The DTCG invalidation fixture now supplies a three-step ladder, keeping its named-choice assertion meaningful under the new policy. Added an integration slice applying numeric choices to variant/negative classes, inline padding and plain CSS.

AlgoRecall, same root/config and CLI counting method:

| Measurement | Before numeric policy | Final |
| --- | ---: | ---: |
| Failing/warning spacing declarations (`coverage.spacing.findings`) | 38,058 | 1,024 |
| Accepted spacing declarations | 2,145 | 39,179 |
| Judged spacing declarations | 40,203 | 40,203 |
| Physical spacing finding sites, including dead findings | 41,044 | 4,019 |
| Grouped spacing findings, including dead findings | 368 | 337 |

Baseline: `bench/reading/before.counts.json`; final: `bench/reading/after-cache.counts.json`. The 38,058-to-1,024 comparison counts failing declarations, not every physical site in every spacing rule.

MetalUI: ran `node bench/metalui/measure.mjs reading-final`, read-only, against the existing saved `reading-before` and `reading-after` measurements. Final cold/warm results preserve **all findings, decisions, coverage and declarations exactly** against both saved baselines. Current comparable artifacts contain 463 grouped findings overall, 111 spacing groups / 1,459 spacing sites, 380 `provenance/spacing*` sites, 811 `dead/spacing` sites, and spacing coverage **1,607 accepted / 2,176 judged / 569 failing**. These artifact counts differ from the resume notes' older 1,383 / 522 / 616 / 2,204-of-2,932 snapshot; no new benchmark change was inferred from that unmatched snapshot. The actual retained before/after reports and fresh run agree exactly.

## Reading cache and profile

Profiled real HTTP `site` plus `edits` calls after the spacing fix, before changing the worker. Warm file analysis itself took effectively zero time. Repeated `site` calls instead deep-cloned large global finding evidence, scanned unrelated declarations, reapplied ledger classification and rebuilt message paths. Warm ledger work alone took roughly 256–566ms; worker `site` calls took 426–2,079ms across the measured warm samples.

The worker now indexes declarations by file once per immutable report and caches file projections, bounded to 64 files per report. `site` and element-scoped `edits` share the projection; changed-file reads share the existing full-file local analysis. Cached projections preserve file-local ledger status/severity and accept commands, without changing the global report. Raw/changed-scope report options retain ordinary ledger presentation for `site`, as before.

Existing reconciliation still checks source and dependency revisions. Source changes discard affected local reports; shared theme/config/token changes rebuild the shared report; ledger changes discard classified reports. Weakly keyed projections cannot survive a different report identity. An empty imported helper slice falls back to its consumer evidence instead of caching empty declarations. Same-length source saves with restored mtime, helper saves, theme edits, ledger allowances, and other elements in the same file are covered by the HTTP integration fixture.

Measured with `node bench/reading/measure.mjs before-cache` and `node bench/reading/measure.mjs after-cache`: identical read-only AlgoRecall root/config, `watch: false`, real loopback HTTP, same JSX `Link` at `src/pages/problems/ProblemList.tsx:238:7`, concurrent `site`/`edits`, one first query plus ten warm samples. Session startup is excluded; “first” means a file's first HTTP reading after session initialization.

| HTTP measurement | Before cache | After cache |
| --- | ---: | ---: |
| First `site` + `edits` | 1,201.6ms | 57.1ms |
| Warm median | 652.0ms | 24.2ms |
| Warm minimum–maximum | 465.7–2,182.3ms | 19.8–32.2ms |
| `classes` | 2,110.5ms | 407.1ms |

Both requested reading targets pass: under 100ms warm and under 300ms first query. After-cache worker `site` takes roughly 0.3–0.7ms warm and `edits` roughly 0.2–0.8ms. The recorded first-query HTTP response bodies in `before-cache.bodies.json` and `after-cache.bodies.json` compare exactly equal. No repeated full report/index builds occurred (`fullReports: 1`, `fullIndexes: 1`). `classes` improved but remains above 100ms; it is outside the requested combined-reading threshold.

## Checks

- `npm run build` and `npm run typecheck`: passed.
- `PLUMB_WATCH=1 PLUMB_POLLING=0 node --test --test-concurrency=1 e2e/numeric-spacing.test.mjs e2e/computed.test.mjs e2e/locate.test.mjs e2e/decisions-spacing.test.mjs e2e/families.test.mjs e2e/serve.test.mjs e2e/reading-cache.test.mjs e2e/session-burst.test.mjs`: **75 passed, 0 failed, 6 skipped**. Five browser cases skipped because Playwright Chromium is absent; one polling-only case skipped in native-watch mode. No browser installation attempted.
- Final focused cache/burst rerun: **5 passed, 0 failed/skipped**. Covers file-local ledger presentation and raw-report inspection, alongside invalidation, byte-identical Node/Web transports, busy responses and deadlines. Health probes peaked at 43.9ms. See `bench/reading/final-cache-checks.log`.
- HTTP burst carries 521,564-byte site and 102,175-byte edits responses across 300 overlapping reads. Requested batch health probes peaked at **46.6ms**, below the unchanged 100ms assertion; programmatic burst also passed its 50ms assertion.
- `git diff --check`: passed. Full suite was not run.

Timing/profile artifacts: `bench/reading/before-cache.http.json`, `bench/reading/after-cache.http.json`. MetalUI reports: `bench/metalui/reading-final.cold.json`, `bench/metalui/reading-final.warm.json`, `bench/metalui/reading-final.run.json`.

## Follow-up: one named step replaces the numeric scale (2026-10-12)

The owner changed the replacement rule after this result was written: a theme replaces Tailwind's numeric scale as soon as the project declares **one** qualifying named spacing step, not three (`src/decisions/spacing.ts`, `docs/layers/3-decisions-spacing.md`). Under the three-step rule, a theme with two named steps (the `ledger` fixture's 8px and 12px) let `gap-10` pass, which broke 16 ledger, SARIF, GitHub and agent-loop tests. With the new rule those pass unchanged. The `computed` fixture declares two named steps too, so its expectations are back to HEAD's (`--spacing-s2`, `px-s2` at 8px); the edits above that moved them to numeric `10` no longer apply. AlgoRecall has no qualifying named steps and MetalUI has twelve, so neither app's numbers depend on the threshold.

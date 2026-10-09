# Item 8: reviewer notices, trend reports and token parity

Implemented ROADMAP sections 2.1, 2.4, 4 and item 8 against DESIGN sections 3.4, 4.7, 5 and 6, MESSAGES.md and the existing layer contracts. No packages installed, worktree commits made or MetalUI files written. Only disposable Git fixtures and the benchmark copy create commits.

## Reviewer annotations

`plumb check --base <ref> --format github` and `--changed --format github` annotate added or replaced lines, including staged edits and untracked files. New errors keep error annotations. Existing informational and warning findings keep their severities. Debt is a notice with its authored ledger key. Exceptions are notices with the saved reason and key. Untouched lines in a changed file are excluded from annotations while their findings remain in JSON.

The summary includes separate New, Debt touched and Exception touched counts. The existing Action runner forwards all three command levels and puts those summary lines in the sticky comment and job summary. Reasons, titles and filenames use GitHub workflow escaping. `action.yml` now describes this behavior. No hosted GitHub run or remote comment was made.

Git line scope stays in `src/surfaces/changed-lines.ts`. It does not change the ledger's file scope, acceptance rules or exit policy. Programmatic callers can pass `await changedLines(root, ref)` as the second argument to `githubCommands` and the third argument to `githubSummary`.

## Reports

```sh
plumb report
plumb report --markdown
plumb report --since v1.4 --markdown
plumb report --since <recorded-sha> --json
```

`report` analyzes the project, replaces `plumb/report.json` and appends a snapshot to the JSON array in `plumb/trend.json`. `--markdown` also prints the complete recorded trend table. Report commands exit 0 when recording succeeds, even when the inspected project has drift. Use `check` to enforce findings.

Each snapshot has schemaVersion 1, commit SHA (null outside Git), UTC ISO date, working-tree state, coverage per judged family, finding group/site counts per rule, ledger counts and authored identity counts. Coverage stores accepted declarations, total, failing declarations, governance and percentage. No tokens and no declarations have null percentages. The ledger records entry and accepted-token counts plus new, debt, exception, stale, growth and out-of-scope counts.

`changes.new` and `changes.fixed` compare authored identity counts with the previous snapshot. The first snapshot uses the current uncovered finding count as new. Debt and exceptions retain the current ledger counts. Moving line numbers does not create fixes. Coverage deltas are percentage points against the preceding row. Repeated runs at the same commit append separate measurements; edits are labeled working tree. Reports and compiler caches do not themselves mark the measured source dirty.

`--since` includes the recorded baseline row and later records. It reads saved history without analyzing source/config/ledger, archiving revisions, checking anything out or writing report files. SHA prefixes resolve from the saved records. Named refs use read-only `git rev-parse` to identify a recorded commit. Missing or ambiguous baselines fail with exit 2. Invalid history is refused before replacing either output. Both output files are prepared then individually replaced by atomic renames; this is not a transaction across both files. Concurrent report writers for the same project are not supported.

## Token parity

```sh
plumb parity export.tokens.json
plumb parity export.tokens.json --format dtcg --strict --json
```

The comparison uses adopted project records and project theme inventory, including tokens outside configured caller ladders. Tailwind defaults are excluded. DTCG names match exact record names or CSS variable references, then flattened names: `color.text` matches `--color-text`. No fuzzy name or value-based identity matching. Ambiguous references or multiple export names mapping to one theme token fail with exit 2.

Findings have `parity/missing`, `parity/extra`, `parity/mismatch` or `parity/unresolved` rule IDs, titles under 80 characters, because/action wording and compatible why/fix fields. Text leads with the token and difference; paths are project-relative. Ledger allowances do not excuse parity differences. Default exit is 0; `--strict` exits 1 for differences. Invalid input/flags exit 2.

Aliases resolve through the existing guarded resolver. Absolute lengths compare in pixels; rem uses the existing static 16px convention. Durations compare in milliseconds. Colours use the existing OKLab converter, Euclidean distance at most 0.01, and separate alpha difference at most 0.001. Alpha differences cannot pass merely because their colour distance is zero. DTCG colour objects use their CSS colour-space syntax, including OKLab/OKLCH and HSL/HWB. HSL/HWB components use percentages from 0 to 100 per the [DTCG Color Module](https://www.designtokens.org/tr/2025.10/color/). Remaining scalar/composite records use normalized resolved text; arbitrary composites are not translated into equivalent CSS shorthands.

Supported export types are the existing reader's color, dimension, fontFamily, fontWeight, typography, duration, cubicBezier, shadow and number. Explicit or inherited group `$type` is required. Root tokens, group extensions and JSON Pointer groups are refused; export resolved groups with explicit names instead. Cycles, missing aliases and conditional theme values become unresolved findings when a matching token exists. This checks token files, not rendered design parity.

## Validation

`e2e/review.test.mjs` runs the compiled CLI through node:test. Eight feature slices cover the three PR annotation kinds, untouched-line exclusion, staged changes, escaped reasons, two-commit trend/coverage/fixed counts, SHA/tag history reads with broken current config, malformed-history preservation, dirty measurements, the missing/extra/mismatch DTCG fixture, aliases/units/alpha/cycles, inventory outside selected ladders, supported colour spaces and ambiguous identity refusal. No unit tests.

The existing GitHub integration assertion now expects the touched debt notice. Existing Action e2e still verifies sticky comment updates and ledger approval against a local REST fixture.

Final `npm test`: 146 passed, zero failures, skips or cancellations. `npm run typecheck` and `git diff --check` pass. Final diffs confirm both protected formatter files and all rule message generation remain unchanged.

## MetalUI copy benchmark

```sh
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/8-review node bench/metalui/review.mjs
```

The script archives MetalUI commit `e0a0b31349a371e48ad38f0cc8099be5fc1b2be5` into this item's dedicated cache. Installed dependencies are linked for reads. The inherited preset inputs are byte-checked against the archive before and after the run; MetalUI HEAD is checked again afterward. All source edits, ledger/report/export writes and fixture Git commits stay in the copy.

[Receipt](../../bench/metalui/8-review.run.json): first report after baseline 2530.8 ms, repeated report 2428.1 ms, report after fix 2766.9 ms, saved-history Markdown 126.3 ms, parity against an empty export 1264.9 ms. Baseline primes compiler caches, so these report measurements are not cold. Measurements ran alongside the test suite and are individual timings, not latency guarantees.

Copied spacing coverage changed from 1601/2169 (73.8%) to 1602/2169 (73.9%), with exactly one fixed authored key and zero introduced keys. Repeated snapshots retain equal coverage, per-rule findings, ledger counts and identities. The empty-export parity check lists all 1946 project tokens as extra and exits 1 under strict mode. The three-difference export and three-annotation PR acceptance are verified separately with focused fixtures.

## Shared integration

`cli.ts` adds command/flag routing and supplies line scope to GitHub formatting. `index.ts` exports the line-scope helper/types only. The DTCG reader optionally reads all supported families in one pass and serializes structured perceptual colours correctly. Theme inventory now carries static resolved values outside selected ladders.

No config or report schema change. `src/report.ts`, `src/surfaces/agent.ts` and rule message strings are untouched. Existing message-pass fields are accepted by the GitHub formatter when present. New functionality lives in separate parity, trend and line-scope modules.

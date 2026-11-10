# Readiness 1d result

Readiness and check now share the definition of project token availability.
An active Tailwind numeric `--spacing` base counts as a spacing decision.
Framework-only tokens no longer make a used family appear ready.

## Change

`src/decisions/availability.ts` extracts `projectDecision` from the checker's
`findingsForFamily` setup-gap predicate in `src/rules/provenance.ts`.
Both checker and readiness use it: a non-framework decision in the family,
or, for spacing, the numeric base already validated by
`src/decisions/spacing.ts`, provided its numeric scale has not been replaced.
The checker retains its existing guard against treating framework-only spacing
uses as numeric project decisions. No spacing discovery rule is duplicated.

Reports carry optional `numericSpacing` metadata from the existing decision
record. This preserves base evidence through CLI caches and session reports
without adding the base to the named-token list. Readiness cites the selected
project decision's source, including `--spacing` itself. The strict report JSON
schema describes the optional numeric metadata using its existing decision
definition plus the `replaced` boolean.

All seven `read.tokens.*` families were audited: spacing, color, radius, type,
motion, elevation and z. Their previous presence test counted framework
decisions, while the checker requires non-framework decisions. All now use the
shared selector. Existing no-values and unknown-analysis states remain intact.

## Integration proof

Three feature slices in `e2e/readiness.test.mjs` exercise real CLI commands and
authenticated `GET /__plumb/readiness` through the web handler and Session:

- A theme declaring only `--spacing: 4px`, used by `p-4 gap-2`, reports spacing
  `ok` in doctor and GET. Check has nonzero spacing coverage, every value on
  decisions, zero spacing findings, and no named spacing decisions. GET cites
  `src/styles.css:3 --spacing` with no fix.
- A Tailwind import with no project tokens and a disabled numeric base keeps
  every used family missing in doctor and GET. Check reports `config/no-tokens`
  for each family and zero coverage from decisions.
- Explicit project tokens for every family make doctor and GET ready, with
  complete coverage from decisions and evidence in the project stylesheet.

Before the fix, the numeric-base regression failed with `missing !== ok`;
the framework-only regression failed with `ok !== missing` for color.
Receipts: `/tmp/plumb-readiness-1d-red.log` and
`/tmp/plumb-readiness-1d-framework-red.log`.

Focused validation passed: **64 tests, 0 failures, 0 skips**:

```sh
npm run build
node --test --test-concurrency=1 e2e/readiness.test.mjs e2e/numeric-spacing.test.mjs e2e/decisions-spacing.test.mjs
```

Receipts: `/tmp/plumb-readiness-1d-build.log` and
`/tmp/plumb-readiness-1d-focused.log`.

Relay was checked without writing into examples, using
`PLUMBER_CACHE_DIR=/tmp/plumb-readiness-1d-relay-cache`. Check exited 0 with
spacing **29/29 (100%)**, zero spacing findings. Doctor reports
`ok spacing tokens are ready [read.tokens.spacing]`, citing
`src/styles.css:130 --spacing`. Doctor's overall exit 1 comes from the existing
missing ledger baseline; spacing is ready. Receipts:
`/tmp/plumb-readiness-1d-relay-check.json` and
`/tmp/plumb-readiness-1d-relay-doctor.log`.

## Full suite

The required command ran exactly once:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

**Exited 1:** 503 tests, **501 passed, 1 failed, 1 skipped**, in 1694.41 seconds.
All three new integration cases passed inside this run. Receipt:
`/tmp/plumb-readiness-1d-full.log`.

The run caught one omission in this patch: the strict report schema initially
rejected the newly serialized base with `$.numericSpacing: unexpected property`.
The schema was corrected without rebuilding or restarting the running suite.
The affected existing CLI integration test was reproduced red, then passed:

```sh
node --test --test-name-pattern='^tailwind-min emits the schema' e2e/cli.test.mjs
```

Receipts: `/tmp/plumb-readiness-1d-schema-red.log` and
`/tmp/plumb-readiness-1d-schema-green.log`. This focused correction does not erase
the full run's earlier failure. No second full-suite run.

The runner stops after a failing main group. Its remaining burst, forced-polling
and watch-disabled groups ran separately once with the same flags and
environment as `scripts/test.mjs`, without repeating the main group:

| Group | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Burst, 8 MiB semispace | 3 | 1 | 0 |
| Forced polling | 25 | 0 | 1 |
| Watching disabled | 23 | 0 | 3 |

Receipt: `/tmp/plumb-readiness-1d-remaining.log`. Skips are existing watcher-mode
guards. The burst failure was the 1000-file Session event-loop gate:
**77.20ms maximum**, above its unchanged **50ms** limit. Health remained below
the limit at 30.67ms. One targeted rerun of the failing case, without code or
threshold changes, passed with **14.10ms** loop maximum and **9.94ms** health
maximum:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" PLUMBER_WATCH=1 PLUMBER_POLLING=0 node --max-semi-space-size=8 --test --test-concurrency=1 --test-name-pattern="^1000-file Session:" e2e/session-burst.test.mjs
```

Receipt: `/tmp/plumb-readiness-1d-burst-rerun.log`. This repeat does not establish
the latency spike's cause or erase the initial failure. No performance code or
test thresholds were changed. The single full command therefore remains a
failed run, with its schema failure corrected and verified separately.

## Scope and commits

- `9b386c0` — shared project-decision selector, report/schema evidence, readiness fix
  and integration coverage.
- This result document is committed separately after full-suite verification.

No unit tests added. No task edits in `overlay/src`, `site/src` or `examples`.
The existing unstaged `site/src/hero/Hero.jsx` edit and unrelated untracked files
are preserved. Nothing pushed. Both task commits end with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

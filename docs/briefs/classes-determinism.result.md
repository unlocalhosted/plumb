# Computed classes determinism result

Reviewed and completed the interrupted changes in the collector, Session worker,
public result type, and computed integration tests.

## Behavior

- Parsing and lexical indexing finish completely and do not consume evaluation
  steps. Module caches contain complete indexes on cold and warm reads.
- Tracing completes in the existing worker without a wall-clock deadline. It
  retains deterministic hard limits: 20,000 operations, expression depth 16,
  the existing function-call depth guard, and six project import hops. No pending
  response is needed for this implementation.
- The internal trace reports `limited: true` and named `limits` when a hard limit
  stops it. The public classes response uses `limited: string[]` for rendered
  tokens and `limits` for reasons (`operations`, `depth`, `function-depth`,
  `import-hops`). An interrupted trace conservatively places all requested
  tokens in `limited`, with empty `classes` and `unattributed`; partial evidence
  cannot establish a complete candidate set or prove absence.
- Completed traces preserve direct attribution, ambiguous literal candidates,
  and fallback within the project module graph. Authored-site checks rebuild a
  complete module index when it is absent from the bounded module cache.
- Classes candidate sites and tracked-file edits carry SHA-256 hashes from the
  retained source snapshot or the source text read for that response. Existing
  snapshot comparisons and stale-edit rejection remain enforced.
- Advanced the collection cache version so prior receipts containing truncated
  computed evidence cannot survive the collector change.

## Integration coverage

`e2e/computed.test.mjs` verifies a cold Session followed by ten HTTP Fetch-adapter
classes reads through three imported modules containing 6,000 unused declarations
each. Every response is identical, including one uniquely attributed token, one
ambiguous token with two literal sites, and one unattributed external token.
It also checks the first HTTP edits response hash, imported candidate hashes,
empty-edit hashes, and applying an edit to the exact imported literal.

Recursive-helper and excessive-import regressions now verify the explicit
limited bucket, named reasons, and repeated-read equality. The operation-limit
fixture was corrected from 11,000 to 21,000 array entries to exceed the actual
20,000-step cap after parsing was removed from that count. A literal before the
cutoff and one after it both remain limited; neither partial attribution nor
fallback escapes the limit. No unit tests were added.

## Validation

- Focused computed integration tests: 20 tests, 19 passed, one skipped,
  zero failures. The skipped browser check requires an unavailable Playwright
  Chromium executable.
- `npm run typecheck`: passed.
- `npm test`: passed, exit 0. Across the main, polling, and no-watch runs:
  374 test executions, 348 passed, 26 skipped, zero failures. The main run had
  300 passed / 22 skipped; polling had 25 / 1; no-watch had 23 / 3.
  Skips reflect missing Playwright Chromium, unavailable native recursive
  `fs.watch` (`EMFILE`), and watcher-mode exclusions.
- `git diff --check`: passed.

No commits were created. Existing changes in `overlay/src` and
`bench/apps/verify.mjs` were preserved without modification. `../plumb-perf`
was not accessed or changed.

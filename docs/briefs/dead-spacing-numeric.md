# Brief: numeric spacing utilities count as using a configured ladder step

## Bug
`node dist/cli.js check --root site` reports `dead/spacing: 16 spacing tokens are never used in your source`.
site/plumb.config.mjs declares the ladder via `decisions.spacing.from` returning `--spacing-<step>` decisions with value
`calc(var(--spacing) * <step>)`. The site uses them through Tailwind numeric utilities (gap-3, p-6, px-4 ...), which compile to
`calc(var(--spacing) * 3)`, not `var(--spacing-3)`. The same check reports "spacing 301 of 320 use your tokens", so provenance
matching already recognises the steps — but the dead-token rule (src/rules/dead.ts, possibly helpers in src/decisions) doesn't count them as used.

## Task
1. Find where the dead rule decides a decision is "used". Make a numeric spacing utility (or the compiled `calc(var(--spacing) * N)`)
   that resolves to a configured ladder step count as a use of that step's decision. Reuse the existing provenance/matching logic
   that produces "301 of 320 use your tokens" rather than inventing a parallel matcher. Keep the change small and atomic.
2. Add ONE end-to-end test in e2e/ (e.g. e2e/dead-spacing-ladder.test.mjs) following the style of e2e/numeric-spacing.test.mjs,
   e2e/decisions-spacing.test.mjs and e2e/dead-try.test.mjs and helpers in e2e/helpers. It must run the real CLI (`dist/cli.js check`)
   against a fixture project whose plumb.config.mjs defines a spacing ladder via decisions.spacing.from, with source using some
   steps through numeric Tailwind utilities. Assert: a used step is NOT reported dead; an unused step IS still reported dead.
   No unit tests. Test observable CLI output only.
3. Rebuild dist, run the new test and the existing e2e suite (see package.json scripts), and run
   `node dist/cli.js check --root site` to confirm dead/spacing no longer lists steps the site uses.

## Constraints
- Do NOT modify anything under site/. Do not touch bench/ or other unrelated uncommitted files. Do not commit.
- Write a result report to docs/briefs/dead-spacing-numeric.result.md: files changed and why, test commands and their output
  (pass/fail counts), and the before/after dead/spacing line for the site.

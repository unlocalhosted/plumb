# CLI experience layer 2 — result

Implemented on main in this checkout. No overlay/src or site/src edits; the pre-existing Hero.jsx change and unrelated WIP remain unstaged.

## Behavior and choices

- Default human checks show the compact project/Tailwind/theme/file/time header, coverage ascending, Fix first, first-run guidance or new-site detail with known-debt counts, and the More footer. Lowest coverage comes first to expose the biggest token-adoption gaps; ties keep the existing family order.
- Coverage uses bars only when stdout is a terminal and NO_COLOR is absent. Pipes and NO_COLOR have numbers only, with no escapes. Seconds have one decimal; --verbose retains file-kind counts and analysis diagnostics.
- Broken/setup/ownership/off-token rows link to exact CLI selectors. The top four class/value counts count distinct authored sites across rules, so text-xs does not double-count font-size and line-height at the same site.
- --all, --broken, --family, --file (relative/absolute path or quoted glob), --rule, --new and --debt are registered, documented in help and exercised by the flag-dispatch e2e. Selectors combine at the site level, including mixed new/debt groups. Machine formats ignore human selectors.
- Filtered detail ordering: broken, setup, new drift, overrides, remaining debt; descending site count within each section. Existing finding blocks remain. Reasons appear once per rule in a closing Why block; one final accept command uses an actual displayed site. The ledger default caps detail at 20 groups, then points to --new. Runtime/unused-token information stays quiet in the daily view; explicit detail selectors expose it.
- Brief requirements conflict for --all: exact pre-change output versus ordering/why-once everywhere. The explicit snapshot/equality requirement takes precedence for --all alone, which preserves the old output byte-for-byte, including ordering, repeated wording, quiet categories and CLI closing context. --all --verbose preserves the former verbose view; --all combined with a selector uses the new detail behavior. Footer line counts refer to actual legacy --all stdout.
- Exit behavior unchanged: no-config/no-ledger checks remain advisory; configured checks still fail on errors before baseline. No analyzer, ledger, agent, JSON, SARIF or GitHub data contract changed.

## Verification

- Focused feature and existing CLI/adoption/ledger/message/reference checks: 100 passed before final quiet-information regression coverage; final full-suite result below.
- Frozen pre-change response captured at 5f09cdd before source edits. CLI integration replay asserts exact --all stdout and SHA-256 byte identity for JSON, agent, SARIF and GitHub output. Comparisons do not remove timing or normalize output; all volatile data is frozen in the analyzer input. The same checks prove human selectors leave machine bytes and exit codes unchanged.
- Generated AlgoRecall-shaped project: 32 page files plus component and theme; seven judged families, broken classes/variables, setup gaps, ownership overrides, runtime information and many off-token groups. Default fits <=40 wrapped lines at 100 columns. Every Fix first command is executed and matched to its exact finding subset. Coverage ordering, top-level ordering, once-only wording, relative/glob filters, TTY bars and piped/NO_COLOR behavior are exercised.
- Baseline plus added code: only new sites appear, mixed groups project correctly, debt is counted and selectable, quiet information stays out of daily detail, 20-group cap points to --new, and combined new/debt selectors intersect.
- Action inspected: scripts/action/run.mjs runs --format github and --json, parses annotations and JSON, and reads GITHUB_STEP_SUMMARY. It does not parse human reports; no Action changes needed.
- Full required command completed with exit 0: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Build passed. Main native run: 437 passed, 1 skipped (438 tests); forced polling: 25 passed, 1 skipped (26 tests); watch disabled: 23 passed, 3 skipped (26 tests). No failures in any mode. Full log: /tmp/plumber-cli-dx-2-full-test.log. The flag-dispatch proof invoked 159 flags across 20 commands.

## Read-only AlgoRecall run

Ran node dist/cli.js --root ../algorecall with PLUMBER_CACHE_DIR redirected to /tmp/plumber-report-algorecall.U6XQP3. Exit 1 (existing config with errors); stderr empty. Git porcelain status before and after was byte-identical. Output: 23 logical lines, 23 lines when wrapped at 100 columns; legacy --all has 9,210 lines. Captured cold timing includes analysis and cache work; no performance claim.

```text
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 16.6s

On your tokens
  motion      4%  1,719 off
  z           8%  320 off
  type       29%  54,489 off
  elevation  51%  2,664 off
  color      64%  21,130 off
  radius     97%  196 off
  spacing    97%  1,072 off

Fix first
  ✗ 36 broken styles  plumber check --broken
  ! 4 setup gaps  plumber check --rule config
  · 367 component overrides  plumber check --rule ownership
  · 769 values off your tokens  plumber check --rule provenance
    font-mono 9,273 · text-xs 5,246 · leading-relaxed 4,489 · text-sm 4,333

This is your first run, so all of this counts as new.
  plumber baseline      record today's drift as debt; from then on only new drift fails
  Alt+B in dev          see every drift on the page and fix it there

More: --all (every finding, 9,210 lines) · --family <name> · --file <path> · --json
```

## Deferred docs refresh (site/src untouched)

- site/src/docs/pages/adopting.mdx: old coverage rows; --verbose debt-list instructions should point to --debt.
- site/src/docs/pages/findings.mdx and site/src/docs/figures/FindingAnatomy.jsx: per-finding because/accept anatomy, default detail claims and --verbose debt-list instructions.
- site/src/docs/pages/quick-start.mdx: first-run “reports every value” should describe summary and detail commands.
- site/src/docs/pages/habits.mdx: sample repeats because/accept inside each finding.
- site/src/docs/pages/cli.mdx, site/src/docs/recordings/reference/cli.json and docs/reference-data/ref-cli.json: generated flag list lacks the new selectors. The reference generator reads src/cli-flags.ts; flag e2e now also reads the current registry without requiring a forbidden site rewrite.
- site/src/docs/pages/the-ledger.mdx, site/src/docs/figures/LedgerSteps.jsx and site/src/docs/recordings/ledger.json: refresh the recorded human transcript and debt/new summary presentation.
- site/src/docs/recordings/finding.json: its terminalText and per-line anatomy still describe the old per-finding because/accept layout. The judged.json JSON recording, report schema/reference and agent/GitHub formats are unchanged.

README and docs/MESSAGES.md updated now. Site read-only check with a separate /tmp cache: ledger exists, 11 actionable new groups, 82 logical lines, all six DriftedCard hero findings visible in detail. Current checkout also has five other new actionable groups outside that hero; the brief's six are not the entire current project drift. Runtime notes and unused-token groups remain available through explicit selectors and do not bury the hero. Exit 1; stderr empty. No site source changes made.

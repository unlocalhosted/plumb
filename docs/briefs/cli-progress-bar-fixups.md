# Brief: two fixes to the CLI progress bar

Read docs/briefs/cli-progress-bar.result.md (its recorded cold AlgoRecall transcript). Two problems a user sees:

1. **"Reading styles: 0 of 3,527 files" runs twice** (19% → 27% restarts the count). Two different passes share one
   label. Give each pass its own honest label (e.g. the second is tracing classes built in code: "Tracing computed
   classes: 448 of 3,527 files"), or fold both passes into one count of 2 × files if they are the same kind of work.
   A label's count must never restart.
2. **The bar sits at 99% for ~7 s** ("Checking ledger · 17s" then "Done · 24s"). Find what runs between the ledger
   step and completion on a cold AlgoRecall run (PLUMBER_PROFILE=1 and the observer from the result), report it as a
   step with a real label and weight it from measurement. No step may hold the bar still for more than ~2 s on cold
   AlgoRecall without a moving count or a label change.

Proof: extend the existing PTY e2e so a label's count never decreases, and re-record the cold AlgoRecall transcript in
docs/briefs/cli-progress-bar-fixups.result.md showing both fixed (percent, label, seconds per change).
You may only change src/cli-progress.ts, src/profile.ts, the profileProgress call sites, e2e/cli-progress*.test.mjs,
docs/MESSAGES.md. Another job is working in the worktree ../.plumb-cli-dx on branch cli-dx-1 (setup errors): don't
touch it. Don't touch overlay/src, site/src, or the unstaged site/src/hero/Hero.jsx. Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Run the progress e2e and the CLI suites; full npm test at the end.

# Onboarding layer 3: write, and the new init order (result)

Built against `docs/briefs/onboarding.md` section 2.3 ("Reviewable", "Adopt without a flood"), section 5.2 and section 7.2 row 3.
Main checkout, small commits, nothing pushed. Part of `src/cli.ts` (the propose `--write` / `--decline` and init `--yes` / `--preset` / `--family`
usage and flag parsing) landed early in the main session's commit 6e48850; the rest of layer 3 is in the layer 3 commit.

## What was built

- `src/onboarding/write.ts`: theme writers. Shape `theme` puts an `@theme` block in the Tailwind entry (extending one that is there),
  `root` creates `theme.css` next to the project's main stylesheet with a `:root` block and adds `@import "./theme.css";` to that
  stylesheet, `shadcn` extends the existing `@theme inline` block in place (colour values go to the existing `:root`, with an `@theme inline`
  bridge `--color-x: var(--x)`; every other token sits in the same block). Every token carries a `/* why: … (drafted) */` line and the block
  carries `/* React Plumber proposal <hash> */`. Tokens already declared in the file are skipped. Writes are atomic and undone on failure.
- `plumber propose --write [--family f]`: prints the added lines as a diff, writes, says what it wrote and the next step.
  `propose --decline <scale>=<value>` records a `declined` ledger line.
- `src/onboarding/ask.ts` and `init` reordered: state sentence, then propose, then one question per step (shadcn as your system when
  `components.json` exists, then one per proposed family), then write the theme, then check again, then config, ledger baseline. Enter keeps,
  `s` shows the steps, `n` skips. `--yes`, no terminal, or `--json` take every default and print the question with the answer. Flags answer
  one question: `--family type=skip|keep`, `--preset shadcn|none`.
- `config/no-tokens` is never baselined (`init` and `baseline`); a skipped family stays a `read.tokens.<family>` gap in `doctor`.
- `declined` ledger kind: parsed, kept by `--prune` and `--rebase`, read by `propose` so a declined value (any spelling) is never offered again.
  A ledger holding only declined lines does not count as a baseline (`exists` is false), so `init` and `check` treat the project as new.
- The old `init` inference (a literal used at three places became an `inferred:` token in config) is gone: tokens now come from the theme.

## Tests

`e2e/onboarding-write.test.mjs` (8 tests, through `dist/cli.js`; a pty helper `e2e/helpers/cli-pty-input.py` for the terminal questions):
`init --yes` on bare writes `src/theme.css` equal to `e2e/fixtures/onboarding-theme-bare.css` with zero `no-tokens` ledger lines, `check` green,
`decisions --json` lists the proposed tokens with drafted whys and the ledger marks them `inferred`; `--family type=skip` leaves the
`read.tokens.type` gap in `doctor`; Enter / `s` / `n` in a terminal; flag errors; partial extended in place with every original line intact;
framework adopted in `@theme`; `baseline` records no setup gaps; decline survives `init` and `ledger --prune`.

## Deviations

1. `adoption.test.mjs` "tokenless repeated values become inferred proposals…" tested the behaviour this layer replaces; it is rewritten to the new one.
2. Non-interactive `init` takes defaults rather than reading stdin, so a background run never waits on a pipe.
3. "Listed as `inferred`": the proposed tokens are project tokens in `decisions --json` (origin `project`); what marks them inferred is the
   ledger (`inferred: true`) and the `(drafted)` reason.
4. The seam question of section 5.2 is layer 4 and is not asked.
5. `readLedger().exists` is false for a declined-only ledger (above).
6. Other e2e files updated because setup gaps are no longer baselined or counted as new: `readiness` ("framework-only tokens" now skips every family on `init`),
   `report` ("ledger default" gives z-index a token first). `check` still shows a missing family as a setup gap.
7. Run: `onboarding-propose` 14, `onboarding-write` 8, `onboarding-state` 15, adoption 19, ledger 17, readiness 52, cli-findings, noise, report, report-nits,
   messages, review, surfaces, rename, dead-try, imitation, check-cache, cli-progress, cli-setup all green. `setup` fails only at its Playwright step (Chromium not installed here), after `init` succeeded.

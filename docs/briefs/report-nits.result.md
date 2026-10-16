# Report nits result

Implemented all four items in separate fix commits:

- `38f5663` — keep Fix first reasons whole.
- `0188ca6` — distinguish top-value counts with `×`.
- `7ca322c` — sort displayed sites by file, then numeric line and column.
- `1ea8296` — show complete habit declarations.

Each commit ends with the requested co-author trailer. Nothing was pushed.

`cf0f259` updates two existing e2e expectations for the new site order and shorter reason phrase.

## Reproduction and result

Reproduced on a temporary copy of `fixtures/adoption`, with `plumber.config.ts` and `.plumber` removed, using `check` with `COLUMNS=80` and piped stdout. Pipes retain the documented 100-column fallback. Also exercised real stdout PTYs at 80 columns and a narrow 60-column PTY.

The adoption summary now prints:

```text
  ! 1 setup gap                    tokens missing                   plumber check --rule config
  · 1 value off your tokens        most in spacing                  plumber check --rule provenance
    gap: 10px ×1 · margin-left: 10px ×1
```

Short reason forms are documented in `docs/MESSAGES.md`. If any reason cannot fit, the whole table drops its reason column. The narrow-terminal regression checks this fallback and intact commands. Class counts use the same marker and comma grouping; the generated-project regression checks `font-mono ×1,056` and deduplicated `text-xs ×1,056` counts.

On `fixtures/habits`, `check --rule habits` now includes:

```text
     styles.css:1 · styles.css:3 · styles.css:5 · styles.css:6 · +2
     → Use text-align: start
```

Sites sort before choosing the four shown locations. Sorting only changes the human projection, preserving analyzer site order and identities.

## Habit fix audit

- Logical properties retain their values. Alignment names `text-align`; float and clear use valid `inline-start`/`inline-end` values. Asymmetric four-side shorthands show all four logical declarations.
- Viewport alternatives name the full declaration, preserve expressions, and use the matching height or width units.
- Safe-area fallbacks name the full declaration and preserve surrounding expressions.
- Overflow and overscroll fixes use full CSS declarations at declaration sites, including the applicable axis. Class sites retain utility suggestions.
- Hover gating, focus restoration, transition-property selection and easing selection retain their structural or design advice because there is no universally correct replacement declaration. Custom messages remain author-defined.
- Habit suggestions wrap at word boundaries instead of truncating replacements.

All of these changes belong to human rendering. Analyzer action, fix and edit strings remain unchanged.

## Verification

`e2e/report-nits.test.mjs` contains four feature-level e2e tests, each checking piped stdout and a real stdout PTY. Coverage includes narrow reason omission, class/declaration counts, cross-file numeric site order, and complete CSS/inline habit fixes. Existing exact layout expectations were updated for sorted sites.

Focused validation passed: 16 tests across report nits, reports and habits; the existing CLI finding layout checks also passed.

The initial full run exposed two existing assertions that still required the old reason wording and site order. Their updated class/setup integration suites passed all 15 checks.

For both reproduction fixtures, captured the original analyzer response before rebuilding. Replayed each unchanged response through the real CLI with original renderer sources from `09602c2` and with the final renderers. Both complete, nonempty stdout buffers matched byte for byte for each format; timing and paths were frozen input, not normalized output:

| Fixture | Format | Bytes | Identical SHA-256 |
| --- | --- | ---: | --- |
| adoption | `--json` | 17,333 | `767909b092c1a9606667b2c15726241e71868a4106101736691af75f12e37c1c` |
| adoption | `--agent` | 2,538 | `ff9553f7195dafc98acc39e798127866061e3b0bd669d7c8a3ef7c634848bd13` |
| habits | `--json` | 113,003 | `776c27794b4a3002356f0dd98a5eed0bab5557cb9ba7edf4978438e19b9bc3bb` |
| habits | `--agent` | 18,892 | `64b90526a2e251e711701bfe7fae04a3c7145cd8bb95c7e191122f8bcbdd7710` |

The existing frozen-report e2e also passed its JSON, agent, SARIF and GitHub byte comparisons, including human detail filters.

Full validation passed with exit status 0:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

| Run | Passed | Failed | Mode-specific skips |
| --- | ---: | ---: | ---: |
| Full native suite | 445 | 0 | 1 |
| Polling server suite | 25 | 0 | 1 |
| No-watch server suite | 23 | 0 | 3 |
| Total | 493 | 0 | 5 |

The skips are the existing watcher/mode guards; all three script stages completed successfully.

`overlay/src`, `site/src` and the pre-existing unstaged `site/src/hero/Hero.jsx` change were left untouched. Unrelated untracked work was not staged.

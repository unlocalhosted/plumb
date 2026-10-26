# Onboarding layer 1: the state reader (result)

Built against `docs/briefs/onboarding.md` section 7.2 row 1. Main checkout, small commits, nothing pushed.

## What was built

- `src/onboarding/state.ts`: `readState({ root, config?, report? })` returns `{ rung, name, kind, flags, sentence, next, numbers, evidence }`.
  Pure over a `Report` plus a few static reads (package.json, the Tailwind entry text, `tailwind.config.*` as text, `*.tokens.json`).
  It writes nothing. Without a report it runs `check`; with one (the check header, readiness) it reads that.
  Same files, same bytes: nothing in the state depends on time, absolute paths or read order.
- `plumber state [--root] [--json] [--config]`: human output is the sentence, `R3 Partial · preset · flags`, one row per used family,
  the facts behind the flags, evidence files, `Next:`. JSON is the full state.
- The state sentence is the line under the check header, in the default view and in the `--rule/--family/--file` views. It never stops a check
  (any failure drops the line). `--json`, `--agent`, `--sarif` and `--format github` are unchanged.
- `system.state` in `readiness()`: title is the sentence, evidence is `R3 Partial · flags`. Status `ok` when the state was read, `unknown` otherwise.
  Readiness now has 25 requirements (was 24; `e2e/readiness.test.mjs` updated).
- `two-entries` and workspace roots: `state` reads them (a flag, not an error). `check` still exits 2 on both.
- Reuse: `tailwindEntryCandidates` (extracted from `entryCss`), `workspaceApps` (extracted from `cliProject`), `CheckOptions.entry`
  (judge against a chosen entry when the project has not; skips the whole-report cache; used by `state` only).
- Tests: `e2e/onboarding-state.test.mjs` (15 tests), expectations in `e2e/fixtures/onboarding-state.json`.

## The fixtures and their state

| Fixture | Rung | Kind | Flags | Sentence |
| --- | --- | --- | --- | --- |
| `onboard-clean` | R4 Clean | preset | none | A system, in use: every value family has your tokens and 98% of values use them. |
| `onboard-partial` | R3 Partial | preset | none | A system, half in use: shadcn's tokens are installed; 19% of colour still uses Tailwind's keys. |
| `onboard-framework` | R2 Framework | tailwind | none | Tailwind's scale, no decisions of your own: 3 type sizes, 5 spacing steps, 6 colours in use. |
| `onboard-bare` | R1 Bare | plain | noisy | No system yet: 37 values in 2 files, 13 of them near-duplicates, 100% of inline styles are literals. |
| `onboard-chaos` | R3 Partial | preset | conflicting, dark-split, dead, noisy, split | ...11% of colour still uses Tailwind's keys, 2 Tailwind entries, 1 token defined twice. |
| `onboard-v3` | R0 Blocked | v3 | none | Tailwind 3.4: Plumber judges Tailwind 4. Your 31 theme values come with the upgrade. |
| `onboard-monorepo` (root) | R0 Blocked | workspace | split | 3 apps: apps/admin, apps/web, packages/ui. Run in one: --root apps/admin. |
| `onboard-monorepo/apps/web` | R2 Framework | tailwind | tokens-from-package | ...3 type sizes, 4 spacing steps in use, tokens come from @fixtures/ui. |
| `onboard-monorepo/apps/admin` | R1 Bare | plain | none | No system yet: 13 values in 2 files, 3 of them near-duplicates. |
| `two-entries` | R0 Blocked | no-source | split | No React source under src/ or app/. Set source in plumber.config.ts. |

`onboard-chaos` has an `index.html` and `main.tsx` so `check` works on it (the app reaches `index.css`; `admin.css` is the second entry).
`onboard-v3` declares Tailwind `^3.4.17` and is not installed; `onboard-monorepo/apps/web` names the shared preset by path in its
config because the workspace is not installed in the fixture.

## Deviations from the brief, and why

1. **Numeric `--spacing` counts as a token only when the project wrote it.** The brief says it counts, and says R2 has "numeric `--spacing` base intact".
   Tailwind's own default `--spacing` makes every Tailwind project "tokened" in spacing, which would make R2 unreachable. So: project-authored `--spacing`
   (or any `--spacing-*` token) is a token; the default from `node_modules/tailwindcss` is not.
2. **R1 is "no Tailwind entry and no used family tokened"**, not "fewer than 3 `:root` custom properties". The count is recorded
   (`numbers.rootProperties`) but not a threshold; a plain-CSS project with five unnamed variables and no tokens is still Bare.
3. **R3 is the fallback** for a project with a tokened used family that fails the R4 test (rather than leaving a gap between the two predicates).
4. **Floors on tiny samples:** `noisy` by inline literals needs at least 5 style attributes; by near-values needs at least 10 distinct values.
   Without them a clean project with one `style={{ width: 10 }}` is "noisy".
5. **Near-values is a light pass**, not the layer 2 harvest: distinct literal values per measure (spacing, radius, font size, line-height,
   letter-spacing, duration, colour) merged within the brief's merge tolerances. Layer 2 will replace it; the numbers are `numbers.values`.
6. **Extra R0 kinds** the brief implies but does not name: `workspace`, `no-source`, `not-installed`, `unreadable`, `styled-in-js`. `v3` is a kind, not a flag.
7. **The sentence carries at most two flag clauses** (priority: split, conflicting, unreadable, dead, dark-split, noisy, tokens-from-package, prefixed, styled-in-js, dtcg).
   All flags are in `flags` and `evidence`. Five clauses were not a short sentence.
8. **`tokens-from-package` on `apps/web`** coexists with R2 because the package's tokens are in a family the app does not use (colour); the app uses type, spacing and radius.
9. **CSS-in-JS detection** is a dependency list or a parsed `styled`/`css`/`keyframes`/`createGlobalStyle` tagged template. A first regex matched prose
   in a comment on AlgoRecall; it now parses (and a test covers it).
10. `plumber state` on a project with an undecided Tailwind entry reads the first sorted candidate (flag `split`); it does not decide for `check`.

## Not verified

- `e2e/readiness-panel.test.mjs` (the overlay's readiness panel) is skipped here: Playwright Chromium is not installed. The overlay was not touched,
  but the new `system.state` requirement reaches that panel through the same `/readiness` route; it should be looked at when Chromium is available.

## Checks

`npm run build`, `npm run typecheck` pass. `e2e/onboarding-state.test.mjs` 15/15. Also green: readiness (52), cli (45), cli-findings, report, report-nits,
classes, adoption, noise, cli-setup, docs-cli, check-cache, cli-progress, messages, presets. Run one file at a time.

## Read-only run on AlgoRecall

`PLUMBER_CACHE_DIR=<scratch> node dist/cli.js state --root ../algorecall` (JSON identical in shape):

```
A system, half in use: shadcn's tokens are installed; 52% of type still uses Tailwind's keys, 1 file can't be read, 46% of inline styles are literals.
R3 Partial · preset · noisy, unreadable
  spacing   39,470 of 40,424 on tokens   98%  tokens
  colour    37,068 of 58,198 on tokens   64%  tokens
  radius     5,766 of  5,953 on tokens   97%  tokens
  type      22,250 of 76,739 on tokens   29%  tokens
  motion        76 of  1,795 on tokens    4%  no tokens
  elevation  2,809 of  5,473 on tokens   51%  no tokens
  z             29 of    349 on tokens    8%  tokens
  3% arbitrary utilities (4913 of 153080); 6850 of 14848 style attributes literal; 488 distinct values, 164 near another; 33 of 91 tokens unused
  can't be read: src/problems/content/course-schedule/phases/BuildDetectors.tsx
```

The state matches the brief's description of the AlgoRecall shape (shadcn installed, code drifts around it). The unreadable file is one Plumber's reader reported as unreadable (not investigated further). One slip: my first human-output run was not given a redirected cache and wrote ten cache files under
`../algorecall/.plumber/cache`; I deleted exactly those (five older files from other runs were left in place). Nothing else in that repo was touched.

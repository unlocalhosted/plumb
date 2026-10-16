# CLI experience, layer 3b — result

Implemented only the four human-report polish fixes in `c10b0be`.

- Coverage off-counts use the largest count's width, right-aligned with a two-space column gap after the percentage. AlgoRecall now shows `4%   1,719 off` and `29%  54,489 off`.
- Declaration subjects use CSS property names, strip enclosing source quotes, and collapse whitespace. Authored shorthands remain intact. Declaration sections give the subject 42% of the flexible budget, taking the extra space from the reason column. Values shorten only at the end; colliding shortened subjects also show their complete values below.
- Equivalent subjects merge within the existing rule-family boundary, unioning their physical sites. The fixture merges single/double-quoted inline `fontFamily` and the equivalent CSS declaration, and merges two differently spaced `font` shorthands. AlgoRecall's `var(--font-mono)`, `var(--font-mono, monospace)` and `var(--font-mono, ui-monospace)` remain separate because their authored fallback lists differ. Their displayed subjects are distinct. Component ownership contracts retain separate groups and their component-specific reasons.
- Single sites use basename:line, or the shortest unique tail on a basename clash, just like site rows. A location wider than its column moves intact below the subject. AlgoRecall's long source path now reads `EscapeAndOutsideClickPhase.tsx:1516`.
- Combined reasons use short phrases joined with ` · `, including `raw type · off your type scale`. A phrase that does not fit moves below the subject and wraps without dropping text. Suggestions retain their existing compact rendering.

## Verification

- Exact 80/100-column real-PTY e2e assertions cover declaration blocks, merged subjects, a two-reason group, a single site under a long parent path, and coverage spacing with and without colour. Additional collision checks preserve both complete values at both widths. Existing 80/140-column fixture/site checks still cover terminal bounds, alignment, colours, filters, and basename collisions.
- Focused CLI report checks: seven passed, zero failures. Frozen analyzer replay verifies exact SHA-256 byte identity for JSON, agent, SARIF and GitHub output, including human detail filters. No output bytes or timing fields are normalized.
- Full required command exited 0: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Main/native: 441 passed, one skipped. Forced polling: 25 passed, one skipped. Watching disabled: 23 passed, three skipped. Total: 489 passed, five intentional skips, zero failures. Full log: `/tmp/plumb-cli-3b-full-test.log`.
- AlgoRecall commands both exit 1 for existing configured findings, with empty stderr. The cache is redirected to `/tmp/plumb-cli-3b-cache`; AlgoRecall's Git porcelain status including untracked files is byte-identical before/after. Captures use a real stdout PTY set to 100 columns; ANSI colours are removed only for the excerpts below.
- No edits to `overlay/src` or `site/src`. The existing `site/src/hero/Hero.jsx` diff is byte-identical; unrelated work remains outside these commits.

## AlgoRecall default, 100 columns

Command: `node dist/cli.js --root ../algorecall` with the external cache above. First 30 lines (the entire default report is shorter):

```text
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 6.7s

On your tokens
  motion     █░░░░░░░░░░░░░░░░░░░    4%   1,719 off
  z          ██░░░░░░░░░░░░░░░░░░    8%     320 off
  type       ██████░░░░░░░░░░░░░░   29%  54,489 off
  elevation  ██████████░░░░░░░░░░   51%   2,664 off
  color      █████████████░░░░░░░   64%  21,130 off
  radius     ███████████████████░   97%     196 off
  spacing    ███████████████████░   97%   1,072 off

Fix first
  ✗ 36 broken styles               the browser drops them           plumber check --broken
  ! 4 setup gaps                   type roles aren't configured     plumber check --rule config
  · 367 component overrides        callers restyle your components  plumber check --rule ownership
  · 769 values off your tokens     most in type                     plumber check --rule provenance
    font-mono 9,273 · text-xs 5,246 · leading-relaxed 4,489 · text-sm 4,333

This is your first run, so all of this counts as new.
  plumber baseline      record today's drift as debt; from then on only new drift fails
  Alt+B in dev          see every drift on the page and fix it there

More: --all (every finding, 5,681 lines) · --family <name> · --file <path> · --json
```

## AlgoRecall type, 100 columns

Command: `node dist/cli.js --root ../algorecall check --family type` with the same external cache. First 30 lines:

```text
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 6.2s

  !  font-mono                               raw type                    9,273 sites in 1,667 files
     → font-numeric ('JetBrains Mono Variable', ui-monospace, monospace)
     js-core.tsx:492 · js-core.tsx:502 · mini-system.tsx:204 · CommitPhase.tsx:576 · +9,269

  !  [&_code]:font-mono                      raw type                    2 sites in 2 files
     → [&_code]:font-numeric ('JetBrains Mono Variable', ui-monospace, monospace)
     mdx-components.tsx:29 · LessonScreen.tsx:114

  !  font-family: var(--font-mono)           raw type                    3 sites in 2 files
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)
     composition.tsx:674 · composition.tsx:678 · sc-b/InlineVisuals.tsx:634

  !  font: 8px var(--font-mono, monospace)                               2 sites in 1 file
     raw type · off your type scale
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace) · var(--text-2xs) (…
     EscapeAndOutsideClickPhase.tsx:1154 · EscapeAndOutsideClickPhase.tsx:1164

  !  font: 7px var(--font-mono, monospace)
     raw type · off your type scale
     EscapeAndOutsideClickPhase.tsx:1516
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace) · var(--text-2xs) (…

  !  font-family: var(--font-mono, monospa…  raw type                    68 sites in 15 files
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)
     ModularDial.tsx:159 · ModularDial.tsx:200 · BuildTheRho.tsx:496 · BuildTheRho.tsx:509 · +64

  !  font-family: var(--font-mono, ui-mono…  raw type                    networks.tsx:544
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)
```

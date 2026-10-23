# Relay findings 2 result

Implemented compiled-CSS habit checks and visible detail reasons. No changes to `examples/`, `overlay/src`, or `site/src`; pre-existing site WIP preserved. Nothing pushed.

## Changes

- Hover gating accepts a compiled `(hover: hover)` requirement, with or without `(pointer: fine)`. Pointer-only, negated hover, disjunctive alternatives and legacy ungated CSS still report. Hover-oracle cache revision updated.
- Focus suppression accepts visible `:focus`, `:focus-visible` and `:focus-within` outlines, shadows/rings and borders on the same target. Border replacements require nonzero width and visible style/color. Branch, media, pseudo-element and neighboring-element gaps remain findings.
- Habit detail rows retain their reason column. Long reasons also appear in full on continuation lines; 80/100-column terminal coverage verifies width and content.
- Relay's planted `ease-in` also required recognizing its resolved Tailwind curve, `cubic-bezier(0.4, 0, 1, 1)`. The check uses the resolved CSS value, so overriding that theme token with an ease-out curve passes.

## Verification

Local component snapshots live in `fixtures/relay-habits`. Tests never import from `examples/`. Focused CLI/E2E coverage checks cold/warm reports, Tailwind custom variants/plugins, focus visibility and missing replacements, all three planted habits, theme overrides, and terminal reasons.

Focused commands passed:

```sh
node --test --test-concurrency=1 e2e/relay-habits.test.mjs e2e/noise.test.mjs e2e/habits.test.mjs
node --test --test-name-pattern='reason columns' e2e/report-nits.test.mjs
node --test --test-concurrency=1 e2e/relay-habits.test.mjs e2e/habits.test.mjs
```

The focused files passed across the feature checks; the full run below also passed every file together after the final source changes.

Full suite invoked once, exit 0:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

- Main run: 509 passed, 1 mode-specific skip, 0 failures.
- Session burst: 4 passed, 0 failures.
- Polling: 25 passed, 1 mode-specific skip, 0 failures.
- Watch disabled: 23 passed, 3 mode-specific skips, 0 failures.

561 passes across runner invocations, 5 mode-specific skips, no failures. Build/typecheck and `git diff --check` passed. Skips are the runner's conditional watcher tests, exercised in their applicable modes.

## Relay report

`node dist/cli.js check --root examples/relay --rule habits` exits 1, as expected for retained drift. Four human groups, nine source sites: three planted habits and six additional unpaired outline removals. No hover findings remain.

The brief's expected three planted groups alone does not match the current Relay source. These six additional sites remove outlines without a compiled focus/focus-visible replacement:

- `src/app/CommandPalette.jsx:14` and `:40`
- `src/components/ui/dialog.jsx:12`
- `src/components/ui/dropdown-menu.jsx:16`
- `src/components/ui/sheet.jsx:12`
- `src/components/ui/tabs.jsx:12` (TabsContent; TabsTrigger has a valid ring)

Command/menu data-state highlights are not proof of a focus replacement. These findings are retained rather than exempting component names or editing the demo.

```text
React Plumber  relay · Tailwind 4.1 · theme src/styles.css · 31 files · 0.3s

  !  outline-none          removes the focus outline on Command.Item […  6 sites in 5 files
     removes the focus outline on Command.Item [habits/focus-outline]
     → Restore an outline on :focus-visible
     CommandPalette.jsx:14 · CommandPalette.jsx:40 · dialog.jsx:12 · dropdown-menu.jsx:16 · +2

  !  focus:outline-none    removes the focus outline on input [habits/…  Settings.jsx:83
     removes the focus outline on input [habits/focus-outline]
     → Restore an outline on :focus-visible

  !  ease-in               starts feedback slowly with ease-in [habits…  Settings.jsx:77
     starts feedback slowly with ease-in [habits/no-ease-in]
     → Use the project’s responsive easing decision instead of ease-in

  !  transition-all        transitions every property [habits/transiti…  Settings.jsx:33
     transitions every property [habits/transition-named]
     → Replace all with the specific properties that should transition

Why
  habits/focus-outline: Keyboard users lose track of focus, and forced-colors mode shows nothing.
  habits/no-ease-in: Feedback to a person’s hand should begin immediately, without a slow start.
  habits/transition-named: Name the properties that transition so an unrelated change does not start
  animating.

Intended?  plumber accept --rule habits/focus-outline --site "src/app/CommandPalette.jsx:14" --why \
  "…"
```

## Commits

- `3b2239b` — honor hover capability gates.
- `bacd0a7` — accept visible focus replacements.
- `213f478` — populate habit reason columns.
- `7cbb741` — detect compiled ease-in curves.

Every commit ends with the requested co-author trailer.

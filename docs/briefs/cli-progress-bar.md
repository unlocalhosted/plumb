# Brief: a determinate progress bar (layer 2 on top of docs/briefs/cli-progress.md)

Start only after layer 1 (the status line) is committed and green. Same rules as layer 1: stderr, TTY only, never with
`--json`, `--agent`, `CI`, or piped stderr; nothing for runs under 300 ms; erased before the report; Ctrl+C erases it.

## What to build
Turn the status line into a bar plus the step label:
```
━━━━━━━━━━━━━━━━━━━━━━──────────────  58%  Checking values against your tokens · 9s
```
- Bar width: 24–36 cells depending on terminal width; the label truncates first, the bar never wraps.
- `NO_COLOR` or a non-UTF-8 locale: use `#` and `-` instead of the box-drawing glyphs.

## Weights, measured (cold AlgoRecall run, PLUMBER_PROFILE=1, 2026-10-15)
phase:collect 4,741 ms · phase:provenance 2,808 · phase:stylesheets 2,280 · phase:ownership 1,960 ·
phase:components 1,864 · phase:inline 1,119 · rule:provenance/type 838 · rule:provenance/color 822 · phase:ledger 757 ·
phase:parse 747 · phase:compile 705 · rule:existence/dead-var 339 · phase:config 320 · rule:dead 268 · …
Some phases nest (check which in src/index.ts). Derive non-overlapping step weights from the real nesting:
roughly reading source ~30%, stylesheets + inline ~20%, checking values ~25%, components + ownership ~20%, rest ~5%.
Re-measure on MetalUI (bench/metalui) and a small fixture; pick weights that keep the bar's pace even on all three and
record the table in the result.

## Movement
- Within a step, move by a real count where one exists: files read of total, stylesheets of total, rule families
  finished of total, components matched of total. A step without a count moves to its end when it finishes.
- Monotonic: the bar never goes backwards, and reaches 100% only when the run is done.
- Warm/cached runs skip steps: a skipped step's weight is granted at once, so a warm run doesn't stall at a fixed %.
- Redraw at most ~15 times a second.

## Proof (integration/e2e only)
Under a pseudo-terminal on a fixture (test-only threshold knob from layer 1): the percentages read off stderr are
non-decreasing, end at 100, the bar never wraps at an 80-column terminal, the final screen has no leftover bar, stdout
equals the non-TTY run. NO_COLOR shows the ASCII form. Full `npm test` passes.

Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src, site/src,
or the uncommitted site/src/hero/Hero.jsx. Write docs/briefs/cli-progress-bar.result.md with a recorded transcript.

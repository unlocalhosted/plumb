# Brief: fix round 2 — the retest's open findings and the timeline QA's overlay issues

Sources: docs/qa/element-card-retest.md (8 still failing: F3-04, F3-05, F3-06, F5-01, F5-03, F6-01, F6-05, F8-05; 13
new: N-01 … N-13) and docs/qa/timeline-crafting-ui.md (issues 3, 4, 7, 8, 10 — handed over by the history-timeline
session). Fix by cause, test first (a failing e2e/integration test that reproduces each finding, then the fix).

## Owners (three agents in parallel; never edit another owner's files)
- **Server (Sonnet):** src/ only.
  - One class-site method (engine review item 1, docs/research/engine-review.md): `GET /__plumb/class-site?file&line&column[&classes]`
    → where each class of the element is written: { file, line, column, kind: 'own' | 'usage-prop', prop, string span,
    branch?: { condition, which } } — following the component chain and plain strings inside ternaries and templates
    (N-04: a className that is a plain string under a ternary/template is writable at that string; N-02: a class is
    changed in the branch it is written in — `px-2.5` where it is, never added into the other branch; N-03: the line
    reported is the line written). Refuse in plain words only when no plain string holds the class.
  - Recipes mapping: N-01 (two shadows that differ only in colour token are not "the same"; the pick is written as
    picked), N-13 (a timing equal to a project token reuses it: `duration-fast`, not `duration-150`), N-12 (no duplicate
    options in a strip's list).
- **Overlay, element card + panel (Opus A):** overlay/src/{elementcard,layoutcard,locate,fixpanel,blueprint,widget,
  tidycard,hierarchy,geometry,help}.js and words.js (own sections).
  - Surfaces: F3-04 (no spacing bubble while pointing at the fix bar), F3-05 (820px: the bar never covers the Alt
    tip), F3-06 (in Blueprint one Esc closes the card, the next leaves — never three), N-11 (the fix pill never under
    the card or bubble), timeline 10 (after Alt+click on words, one owner: no hint over the bar, no fix bar expanded).
  - Counts: F8-05 and N-08 (one number per thing; "here" for the element read; never 60 vs 3 for the same scope).
  - Tidy: N-07 (no duplicate rows or POSTs; no change for labels already at the value), timeline 7 (S2 never evens out
    a separated group: proximity wins), timeline 8 (S2 writes gap only when the container lays out with gap; else the
    children's margins, or nothing).
  - Timeline integration: timeline 3 (every card/panel/tidy write sends `trace: { group, meta: { step, laws } }`, one
    group per user action across all its requests; tidy's laws from hierarchy.js), timeline 4 (the panel's Undo for
    such a write calls POST undo-group {group} and hands the result to widget.wrote() for the History toast; never a
    whole-file restore).
  - N-05 (a locked card takes no wheel and writes nothing).
  - After the server's class-site method lands: switch classSiteOf and tidycard to it (one resolver), and verify
    N-02, N-03, N-04 end to end.
- **Overlay, text card (Opus B):** overlay/src/texteditor.js and words.js (text section) only.
  - F5-01 (weight never truncated), F5-03 (colours said as the project's token or a plain hex/rgb, never raw oklab),
    F6-01 (colour menu: every swatch reachable, a grid not a stacked 26px column), F6-05 (typed digits preview the
    nearest step), N-06 (a clamp/calc/var size is locked and said; Enter never writes a fixed size over it), N-10 (no
    27.06px: sizes read on the scale or rounded; no blank colour field), N-09 (⌥↑ and the level buttons agree).

## Rules
Main checkout, no worktree. Another session (history/timeline: overlay/src/history.js, e2e/timeline.test.mjs, src/
session trace/undo-group) works in this checkout too — don't touch its files; read docs/qa/timeline-crafting-ui.md for
its API (POST undo-group, trace meta). Don't commit — the lead reviews and commits each owner's work. Memory is tight:
before any browser test wait until `pgrep -f "node --test"` and `pgrep -f "npm run build"` show nothing; one file at a
time; headless shell `$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/
chrome-headless-shell`. Only the server owner runs `npm run build`. crafting-ui: docs/qa/element-card-plan.md safety
rules exactly. Report: each finding id fixed (with its test) or left (why), files, commands and raw results.

# Brief: four report nits (seen while refreshing the docs)

Reproduce on a copy of fixtures/adoption with its config and ledger removed (`check`, COLUMNS=80, piped) and on
fixtures/habits (`check --rule habits`).

1. **"Fix first" reason cut mid-word at 80 columns**: `tokens are missing or unreadab…`. Reasons are never cut
   mid-word: use a shorter phrase that fits (write the short forms in docs/MESSAGES.md) and, if still too long, drop
   the reason column at that width rather than truncate it.
2. **Top-values line reads as part of the value**: `gap: 10px 1 · margin-left: 10px 1`. Show counts so they can't be
   read as part of the value: `gap: 10px ×1 · margin-left: 10px ×1` (and `font-mono ×9,273` for classes, consistently).
3. **Site rows unsorted**: `styles.css:5 · styles.css:10 · styles.css:3 · styles.css:8`. Sort sites by file, then line,
   numerically.
4. **Fix text for `text-align: left`** reads `→ Use start`. Fix suggestions name the whole declaration:
   `→ Use text-align: start`. Audit the other habit fixes for the same problem.

PTY/piped e2e assertions for each. Full `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`
passes. `--json`/`--agent` byte-identical. Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Don't touch overlay/src, site/src, or the unstaged site/src/hero/Hero.jsx. Don't push. Write docs/briefs/report-nits.result.md.

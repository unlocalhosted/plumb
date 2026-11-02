# Brief: fixing the element-card QA findings, by cause

Source of truth: docs/qa/element-card-results.md (40 findings, ids F1-xx … F8-xx, each with steps, expected, actual
and evidence) and docs/qa/element-card-plan.md (the safety rules for crafting-ui). Fix by cause, as a system — never
one symptom at a time. Every fix gets an e2e test that reproduces the finding first (integration/e2e only).

## Causes and the system that replaces each
1. **Where it writes (F1-xx).** Replace "the element's own stamp line" with one resolver, `classSiteOf(el)`: the place
   the element's class list is actually written — its own line when the className there is a string, else up the
   locate chain (via `structure`) to the first usage that passes it as a string prop (Tidy already does this:
   overlay/src/tidycard.js). The card's header (name · file:line), the "N like it" count (count by class site, not
   by stamp), and every writer (spacing, layout, shadow via the recipe engine's file/line, the text card) use it.
   A component whose class list is nowhere a string → one plain refusal, shown at rest (locked), never a failing write.
2. **Spacing scale (F2-01, blocker).** Server (src/session/props.ts): when a project defines Tailwind v4's `--spacing`
   multiplier (any form, including calc/var), the spacing steps are the multiples the codebase uses (scan classes:
   p-4 → 4 × base) merged with Tailwind's default multiplier ladder, each with its px value at the resolved base;
   a `calc(... * var(--z))` base is read at --z = 1 and said so. Tests on a fixture with only `--spacing`.
3. **Surfaces fight (F3-xx).** One owner of the screen: when an element card or text card is open, the fix panel puts
   down any held cause and shows only its one-line status (the old tests that expect a held cause with the card are
   updated to the new rule, written down in the brief); cards, bubbles and strips never overlap each other or the
   fix bar (a single placement function that knows every rect); strips scroll (both axes as needed) with every
   option reachable by pointer and keys.
4. **Reaching (F4-xx).** Arm on any pointer event that carries altKey (not only after an Alt keydown); in Blueprint,
   Alt+click on words opens the text card (not the cause); Alt+scroll walks the tree in Blueprint too; the card's
   header shows the parent chain (two or three levels) and a click or ⌥↑ moves the card to the parent.
5. **Text card (F6-xx).** Fix value reading (computed vs written, clamp()/var() values said plainly), swatch size,
   locking for className built in code, and the rest of F6.
6. **Tidy (F7-xx).** `rounded-full` and other keyword/huge values are never "fixed"; controls' corners are never
   flattened to 0; only changes with a clear step on the theme's scale are proposed.
7. **Motion, layout, performance (F8-xx).** The dragged curve is what Writes says; large elements: cap/virtualise
   strip copies (time to open < 300ms on `main`), and the rest of F8.

## Rules
Main checkout, no worktree. Don't touch site/src/hero/Hero.jsx or the other session's docs/briefs/ci-green.md,
readiness-1d.result.md. Don't commit — the lead reviews and commits per layer. The machine is swapping: one browser
test file at a time, headless shell (`$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-
shell-mac-arm64/chrome-headless-shell`), never the full suite. crafting-ui: follow docs/qa/element-card-plan.md safety
rules exactly (backup tar before any write, Undo after, final `diff -r` empty). New overlay modules must be listed in
src/hosts/client.ts overlayModules. Report per layer: files, commands and raw results, which F-ids are fixed (with the
test that proves each), what's left.

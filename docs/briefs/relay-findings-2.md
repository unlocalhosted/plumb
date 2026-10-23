# Brief: habit false alarms on a shadcn/Tailwind 4 app (found by the Relay demo)

examples/relay enables the four default habits (plumber.config.ts). `node dist/cli.js check --root examples/relay
--rule habits` reports 21 groups; almost all are false alarms that every shadcn app on Tailwind v4 would get:

1. **hover-gate on Tailwind v4 utilities.** Every `hover:` class (shadcn's Button variants, the table row, sidebar
   items…) is reported "also applies on touch screens". Tailwind v4 compiles `hover:` as
   `@media (hover: hover) { &:hover { … } }`, so it is already gated. Judge the compiled CSS (the engine has it), not
   the class name: a hover rule inside a `(hover: hover)` media query (alone or combined with `(pointer: fine)`) is
   gated. Hover styles written in plain CSS without the query, or Tailwind v3-style output, still fire.
2. **focus-outline on `outline-none` paired with a visible focus style.** shadcn's Input, Tabs and Switch use
   `outline-none` together with `focus-visible:ring-*` (or `focus-visible:border-*`); focus is visible, so this isn't
   the habit's problem. Relay's planted `focus:outline-none` input in src/screens/Settings.jsx (no replacement) must
   still be caught. Decide from the element's compiled rules: an outline removed with a focus or focus-visible
   box-shadow/ring/border/outline in its place is fine.
3. **Habit groups print no reason in the detail view.** In `check --rule habits` the reason column is blank for every
   habit group (the summary and `--all` show "also applies on touch screens" etc.). Show the reason.

E2E on fixtures copied from Relay's components (don't import from examples/). After the fixes, the habits report on
examples/relay should list only the planted habit drift in src/drift.js (transition-all, focus:outline-none, ease-in)
plus anything genuinely ungated; paste it in the result. Don't modify examples/, overlay/src or site/src. Focused tests,
then the full suite once: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`.
Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write
docs/briefs/relay-findings-2.result.md.

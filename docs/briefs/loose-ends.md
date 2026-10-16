# Brief: three loose ends before pushing

1. **Single-site finding order.** In the detail view, when a single-site finding's reasons wrap to their own line, its
   location prints above the `→` fix line, while multi-site findings print sites below the fix. Make the order the
   same for every finding: subject line, (reasons line if wrapped), `→` fix, then location/sites. Extend the layer-3
   PTY e2e to assert the order for both shapes. Seen on AlgoRecall `check --family type` (`font: 7px var(--font-mono…`).
2. **Flaky: e2e/locate.test.mjs "Vite React 18: real fibers locate exact JSX sites"** failed once in a full run with
   `page.evaluate: Execution context was destroyed, most likely because of a navigation` (Vite optimising React 18 deps
   on a cold start and reloading the page mid-test). Fix the cause in the test harness (e.g. pre-bundle the fixture's
   deps with `optimizeDeps` settings / warm the dep optimiser before navigation, or wait for Vite's reload to settle
   before evaluating) — not by retries or longer timeouts alone. Prove with a cold cache (delete the fixture's
   node_modules/.vite first) run 5 times in a row.
3. **Flaky: e2e/blueprint.test.mjs:261** (the D-held "as designed" preview) once read an empty SVG fill instead of mint.
   Find why the read can happen before the fill is set (a race with a frame or a transition) and make the test wait for
   the real condition. Don't change overlay/src unless the race is a real product bug a user could see; if it is, fix
   it and say so. Prove with 10 consecutive runs of that test.

Then run `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` in full twice; both
must pass. Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch site/src
(another job is editing docs pages there) or the unstaged site/src/hero/Hero.jsx. Write docs/briefs/loose-ends.result.md
and commit it. Don't push.

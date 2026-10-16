# Brief: the React 19 locate test fails on GitHub CI every time

CI run 38879950257 (Node 22, ubuntu-latest), and run 38634804393 on 2026-10-14 (Node 24): `e2e/locate.test.mjs`
"Vite React 19: real fibers locate exact JSX sites" (line 244) fails with `page.waitForFunction: Timeout 30000ms exceeded`
in `hmrAssertions` at line 223: after the test writes src/App.jsx, `#nested` never shows 'Updated'. It passes locally on
macOS. The React 18 twin was fixed today by prebundling its fixture deps (commit f6861a3) and passes on CI.
Failed log excerpt: docs/briefs/ci-react19.log (delete it in your final commit).

Find the real cause on Linux. Candidates to check, not conclusions: the React 19 fixture's deps aren't prebundled, so
Vite's optimiser reloads mid-test (apply the React 18 fix if so); Vite's file watcher on Linux misses or debounces the
write (inotify, atomic rename, a write before the watcher is ready: wait for the watcher, not a sleep); the HMR
update is applied but React 19 Fast Refresh rejects the boundary on that fixture; anything the CI log shows.
Reproduce on Linux if you can (Docker with the Playwright image `mcr.microsoft.com/playwright`, or `act`); if you can't,
say so and explain why the fix follows from the evidence. No retries-only or longer-timeout-only fixes.
Then run the whole locate suite locally 5 times and the full suite once:
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`.

Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src, site/src,
or the unstaged site/src/hero/Hero.jsx. Don't push. Write docs/briefs/ci-react19.result.md and commit it.

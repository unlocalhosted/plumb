# Brief: Node 24 CI failures on 47a9c44 (run 38892444012)

Log excerpts: docs/briefs/ci-node24.log (delete it in your final commit).

1. **Real bug: serve.json is read half-written.** `e2e/rename.test.mjs:91` failed with `SyntaxError: Unexpected end of
   JSON input`. `src/session/server.ts` creates the discovery file with `writeFile(path, …, { flag: 'wx' })`, which
   creates it empty and then writes; a reader (src/session/client.ts:16 for every CLI command that reuses a running
   daemon, src/adoption/install.ts:137, the test) can read it in between. Fix: write to a temp file in the same
   directory, then publish atomically while keeping "never overwrite a live daemon's file" (e.g. `link` temp → path,
   which fails if path exists, then unlink temp; or an equivalent exclusive atomic publish). Readers treat an
   unparsable or partial discovery file as "no daemon yet" (and the client falls back to a cold run as it does with no
   file), never crash. Audit every other state file React Plumber writes that something else reads concurrently
   (ledger, caches, receipts, cache publication) for the same non-atomic pattern and fix the same way. E2E that would
   have caught it: start serve and hammer the discovery read from a second process during startup; assert no reader
   ever errors.
2. **`e2e/blueprint.test.mjs:376` "Undo lifts every pick…"** timed out at line 391 (`page.waitForFunction`, 5000 ms)
   on Linux. Find the race (a frame, transition, or a read before the overlay updates) and make the test wait for the
   real condition. If the overlay itself can show a user a wrong state there, say so in the result and stop before
   changing overlay/src (that's Claude's to fix); otherwise fix the test only. Prove with 10 consecutive runs.

Full suite once at the end: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`
(on Node 22 via `npx -y -p node@22` too if quick). Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src, site/src, or the unstaged
site/src/hero/Hero.jsx. Don't push. Write docs/briefs/ci-node24.result.md and commit it.

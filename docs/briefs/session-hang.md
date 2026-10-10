# Plumb blocks the host dev server's main thread on MetalUI

Reproduce: `cd /Users/vijaysingh/unlocalhosted/metalui && node node_modules/vite/bin/vite.js --config <this worktree>/bench/metalui/overlay.vite.config.mjs`
(port 4320; change the port in a copy if it is taken; MetalUI is read-only: never write tracked files there; the cache
under its node_modules/.cache is acceptable, or set PLUMB_CACHE_DIR outside it). After the first read is ready, a page
that issues a few hundred overlay reads (`/__plumb/resolve`, `/__plumb/site`, `/__plumb/edits` for elements on
/components/button) leaves the Vite process at ~117% CPU for minutes; even `GET /__plumb/health` times out (20 s), so
the whole dev server is frozen. `sample` shows the main thread in JS (NumberToString, StringIndexOf) with uv_fs_lstat.

Find it with a CPU profile (`--cpu-prof` or the inspector), not guesses. Likely suspects: per-request stat/directory
reconciliation (layer 2 regression fixes) doing O(files) or O(directories) work per request, or re-listing a directory
whose stamp churns (Vite/Plumb caches inside the root); `resolve` classification work per request; unbounded request
queue in `serialize` so a burst of reads is processed one by one with full reconciliation each time.

Required outcome, as general rules:
1. Plumb's work never runs on the host's main thread for longer than a few ms per request: anything heavy happens in
   the worker; the main-thread side is bounded.
2. A burst of N identical-or-overlapping reads costs about one reconciliation, not N (coalesce reconciliations that
   start while one is running; reuse its result for queued reads).
3. `health` answers immediately, always (never queued behind reads).
4. Reads queued longer than a budget answer `503 { status: 'busy' }` instead of piling up.
Add integration tests: 300 concurrent site/resolve reads against a Session on a fixture with ~1,000 files complete within
a time budget, `health` answers within 50 ms during the burst, and results stay identical to sequential reads. Record the
profile findings and before/after numbers on MetalUI in docs/briefs/session-hang.result.md. No unit tests. npm test and
typecheck pass. Do not commit.

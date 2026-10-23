# Relay findings 5 result: blueprint on Next.js, 17.8 s → 0.28 s

Codex implemented the fix in 0131993 (perf(locate): share versioned owner-stack maps) and was killed mid-way through
its full suite by another session's `pkill -f "codex exec"` (the kamui session), so it never wrote this report.
Claude finished the verification.

## Change
overlay/src/locate.js, sourcemap.js, sourcemap-worker.js and api.js only (no visual or CSS changes):
- chunks and source maps are fetched once per URL and version and shared across elements and reader waves;
- owner-stack resolution is batched per wave like stamped `resolve` calls;
- Next's module-version query invalidates exactly the hot-updated module.
New e2e: e2e/blueprint-next-performance.test.mjs (an unstamped Next list: first-pass budget, one map fetch per chunk,
identical readings before and after, a hot update re-reads only the changed module).

## Numbers
From Codex's last output, under the full suite's performance gate: first blueprint pass **Next 0.283 s, Vite 0.175 s**
(findings-4 measured Next 17.77 s, Vite 0.67 s); four batches; one chunk/map fetch; both HMR edits isolated.
The measurement script is scripts/measure-relay-blueprint.mjs (run against Relay's ready Vite and Next hosts).

## Verification (Claude, after the kill)
Full suite on main at 0131993, `PLUMBER_CHROMIUM=… npm test`, exit 0: main 524 passed / 1 skip; burst 4 passed;
polling 25 passed / 1 skip; watch off 23 passed / 3 skips. Zero failures.

# Overlay 5: never block the host's dev server; find the warm-run regression

Found while running MetalUI's docs site with the overlay (`bench/metalui/overlay.vite.config.mjs`):

1. **The Vite plugin blocks Vite startup.** `configureServer` awaits `Session.create`, so the dev server does not
   listen until Plumb has read the whole project (45 s cold on MetalUI). A dev server must never wait on Plumb.
   Start the Session in the background; mount the handler at once; while the Session is starting, every `/__plumb/*`
   API route except the client modules answers `503 { "status": "starting" }` with `Retry-After: 1`, and `health`
   answers 200 `{ status: "starting" }`. A failed start answers `{ status: "failed", diagnostic }` instead of crashing
   Vite. The same for the Next route (`next-dev.ts`). Keep the registry/ownership semantics from layer 2.
   Test (integration): a Vite server whose Session start is slow (e.g. a config that awaits a delay) listens and serves
   `/` before the Session is ready; `/__plumb/site` is 503 starting, then 200 once ready.
2. **Warm `plumb check` on MetalUI regressed from ~1.0 s (commit d91c102, BENCHMARK.md, bench/metalui/final-pass.mjs) to
   ~27 s now** (`node dist/cli.js check --root /Users/vijaysingh/unlocalhosted/metalui --config $PWD/bench/metalui/plumb.config.ts --json`,
   second run). MetalUI is read-only: never write inside it; use the pinned-snapshot approach the bench scripts use
   (copy at a commit), and PLUMB_CACHE_DIR outside it if needed. Re-run final-pass.mjs at HEAD, bisect the commits since
   d91c102 (layers: a274654 edits, 21c194d hosts, ab53b7e locate) to find which change made warm runs slow (cache misses
   from a changed cache key or format, per-run AST ownership tables, reverse import index, stat reconciliation, …), and
   fix it without losing correctness. Add the warm timing to the bench output and a gate in the bench script that fails
   above 2 s warm on the snapshot.

No unit tests. `npm test` and `npm run typecheck` must pass. Do not commit. Summary with the bisect result to
`docs/briefs/overlay-5-startup.result.md`.

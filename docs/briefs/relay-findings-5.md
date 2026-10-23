# Brief: blueprint on Next.js reads 26× slower than on Vite (found by Relay)

From docs/briefs/relay-findings-4.result.md: the first blueprint pass over Relay's board (260 elements, 79 drift) takes
**17.77 s on Next 16 (Turbopack, no source stamps) vs 0.67 s on Vite**. Source-location resolution dominates: 423
chunk/script reads, 243 source-map reads and 948 Plumber batches on Next, vs 167, 38 and 37 on Vite. Next requests the
same compiled chunks and maps repeatedly; the slowest chunk request took 9.61 s. Drawing marks took 0.19 s.

Goal: blueprint's first pass on Relay/Next within 2× of Vite's at the same viewport, with identical readings (260 read,
79 drift, the same labels). Find why the same chunks/maps are fetched repeatedly (cache keyed per element or per
request instead of per chunk URL + content version? cache invalidated by Next's module version query? sourcemap-worker
not reused? batches not coalesced for owner-stack resolution?) and fix at the cause:
- one fetch per chunk/map per version, shared across elements and across the reader's waves;
- owner-stack resolution batched like stamped `resolve` calls (one round trip per wave, not per element);
- correct invalidation when Next hot-updates a module (its module-version query), so a changed file is re-read once.

You may change overlay/src/locate.js, overlay/src/sourcemap.js, overlay/src/sourcemap-worker.js, overlay/src/api.js and
the server/session code; no visual or CSS changes anywhere in overlay/src (Claude owns the overlay's UI). Prove with an
e2e on a Next fixture with an unstamped list of 200+ elements (copy shapes from Relay): first-pass time within budget,
request counts bounded (assert one map fetch per chunk), readings identical before/after, and a hot update re-reads
only the changed module. Re-measure Relay on both hosts the same way as findings-4 and put the table in the result.
Focused tests, then the full suite once: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google
Chrome" npm test`. Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.
Write docs/briefs/relay-findings-5.result.md.

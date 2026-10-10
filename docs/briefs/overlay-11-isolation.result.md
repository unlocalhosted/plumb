# Overlay 11 result

The shared transport core now adds `Cross-Origin-Resource-Policy: same-origin` to JSON responses, including authentication refusals and startup responses. Every enabled overlay module route also sends `Cross-Origin-Embedder-Policy: require-corp`. Both Node middleware (Vite/standalone) and the Fetch adapter (Next) use these headers, including the dedicated worker and its imports.

Source-map workers are optional. Missing Worker support, constructor exceptions (including CSP restrictions), startup/runtime errors, unreadable messages, posting failures and a five-second startup timeout switch the page permanently to the shared main-thread decoder. Pending requests are retried there without invalidating valid source evidence. Indexed sections stay lazy; row checkpoints and requested-row decoding yield in approximately four-millisecond slices, including runs of empty rows. `explain` results include one stable `detail.fallback` diagnostic; successful ordinary locate results retain their existing shape. Hash validation and HMR invalidation remain active in fallback mode.

Concurrent frames no longer supersede each other. Identical in-flight frame requests share one result, while each caller's AbortSignal settles only that caller. The worker request is cancelled only after all its callers abort. Cached fetch/index work belongs to the source-map generation, preventing one caller's cancellation from poisoning another's cache. The shared decoder serializes row/checkpoint work while allowing fetches to overlap. HMR invalidation still invalidates all outstanding evidence deliberately.

Locate forwards its caller's signal through map lookup and checks cancellation around source resolution. The widget changes are limited to hover cancellation: moving to another element or disarming aborts the hover's controller. Signalled hover readings do not populate or inherit the pinned-reading promise cache, so a pin remains independent of an abandoned hover. Existing overlay-10 ownership and authored-name changes were preserved.

Added `e2e/isolation.test.mjs` with real Vite HTTP integration for both isolation policies, every overlay module through both transports, concurrent shared map decoding, individual aborts, lazy indexed sections and invalidation. Browser cases use Chromium through `PLUMB_CHROMIUM`, await `window.__plumb.ready()`, and apply edits only from Node. They cover credentialless/require-corp isolated pages, actual `worker-src 'none'` CSP, a worker runtime exception, a constructor exception, missing Worker support, concurrent locates and yielding fallback decoding. No unit tests added.

Validation:

- `PLUMB_CHROMIUM= PLAYWRIGHT_BROWSERS_PATH=/private/tmp/plumb-overlay-11-no-browsers npm test`: passed. Main phase: 266 passed, 21 skipped; polling: 25 passed, 1 skipped; watch-disabled: 23 passed, 3 skipped. Zero failures in every phase.
- Browser checks were skipped with an intentionally missing browser directory; no Chromium process launched. Cross-origin isolation, CSP and browser interaction remain unverified in this sandbox. Other skips include existing mode checks and native recursive watching unavailable with `EMFILE`.
- Existing `e2e/owner-locate.test.mjs` and `e2e/served-root.test.mjs` HTTP integration passed, preserving the overlay-10 work. Their browser cases remain deferred to Chromium.
- `npm run typecheck`, JavaScript syntax checks and `git diff --check`: passed.
- An initial new HTTP assertion ran before Session startup completed. The test now explicitly waits for ready health; its focused rerun and the complete suite passed.

No commit created. Unrelated pre-existing work was preserved.

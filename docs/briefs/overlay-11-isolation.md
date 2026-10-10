# Overlay 11: the overlay works on cross-origin-isolated pages

Found on Crafting Attention (`craftingattention/app`, Vite 8). Its dev server sends `Cross-Origin-Embedder-Policy:
credentialless` and `Cross-Origin-Opener-Policy: same-origin` (cross-origin isolation, for SharedArrayBuffer/wasm). Under
COEP a dedicated worker only starts if the worker script's response is itself COEP-compatible; Plumb serves
`/__plumb/src/sourcemap-worker.js` without those headers, so `new Worker(..., { type: 'module' })` fires `error`, every
locate ends with `reason: 'map', step: 'worker-error'`, and 199 of 200 elements on the home page say "no source map".

1. Serve every overlay module (the `client: true` routes in the shared transport core) with
   `Cross-Origin-Resource-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (valid under both
   `require-corp` and `credentialless` parents). API JSON responses get `Cross-Origin-Resource-Policy: same-origin`.
2. The worker is an optimisation, never a dependency: if the worker cannot start or errors, `sourcemap.js` decodes on
   the main thread for that page (bounded: lazy per section/row, yield between chunks), and records the fallback once in
   `explain` detail. A CSP that forbids workers must also fall back.
Tests (browser e2e, real Chromium via PLUMB_CHROMIUM; wait on `window.__plumb.ready()`; never call apply in-page): a Vite
fixture whose server sets COEP credentialless + COOP same-origin locates an element; the same fixture with COEP
require-corp; a page whose CSP has `worker-src 'none'` locates via the main-thread fallback. No unit tests. `npm test`
and typecheck pass. Do not commit. Summary to `docs/briefs/overlay-11-isolation.result.md`.

## Also: concurrent locates must not cancel each other

`overlay/src/sourcemap.js` `mapFrame` resolves every pending request with `{ step: 'superseded' }` whenever a new one
starts. Two locates at once (the overlay reading a hovered element while a pinned reading refreshes, or
`Promise.all` in `e2e/owner-locate.test.mjs`, which now fails with `#base … reason: map, step: superseded`) make each other
return null, and the overlay then shows "library only" on an element that locates fine on its own (seen on MetalUI's
"Copy page" button). Cancellation belongs to the caller: `mapFrame(url, line, column, { signal })` aborts only that
request; identical in-flight requests share one result; nothing is cancelled globally. The overlay's hover path passes a
signal and aborts it when the pointer moves to another element. The uncommitted overlay-10 work in this checkout
(innerHTML ownership, names from source) must end up passing too: `e2e/owner-locate.test.mjs` and
`e2e/served-root.test.mjs`. Do not edit `overlay/src/widget.js` beyond adding the hover signal.

# Overlay 10 result

Fiberless descendants now belong to their nearest React host ancestor only when its committed `memoizedProps.dangerouslySetInnerHTML` proves injection. Lookup delegates to that ancestor's existing locate flow, including explicit metadata, direct JSX, owner walking, source-map/hash validation and refusals. Successful results retain the clicked tag in `tag` and `rendered`, with `via: 'inner-html'`. Ordinary imperative children still return null; lookup cannot skip a nearer React host to borrow an outer injector.

Owner `resolve` responses now include `component` from the validated JSX opening element. The overlay uses that authored name, preserving aliases and member expressions such as `Btn`, `MetalButton`, `Popover.Trigger` and `Primitive.button` instead of runtime function names. Direct host and snapshot response shapes remain unchanged.

Extended browser e2e coverage in `e2e/owner-locate.test.mjs` for React 19 with plugin-react and oxc, plus React 18 with oxc. A runtime icon exported as `Icon` from function `Icon2` injects SVG markup; its fiberless `g`, `path` and `circle` locate to the app's `<Icon>` with authored component naming and isolated declarations. Direct authored SVG injection is also covered, including React 18, while unproven React 18 library owners remain refused. Tests await `window.__plumb.ready()`, retain imperative-child/portal/owner refusal coverage, and perform edits/apply in Node so HMR cannot interrupt writes.

The browser-independent HTTP integration checks authored alias/member names, exact site isolation and source writes for `<MetalButton>`, `<Btn>`, `<Icon>` and the direct injected SVG, plus stale-hash refusal. Linked-library resolve expectations were updated for the new owner component field. No unit tests added.

Validation:

- `PLUMB_CHROMIUM= PLAYWRIGHT_BROWSERS_PATH=/private/tmp/plumb-overlay-10-no-browsers npm test`: passed, exit 0. Main phase: 263 passed, 15 skipped; polling: 25 passed, 1 skipped; watch-disabled: 23 passed, 3 skipped. Zero failures in every phase.
- Browser checks were intentionally skipped using a missing Playwright browser directory; no Chromium process launched. Browser behavior remains unverified in this sandbox. Other skips include existing mode checks and native recursive watching unavailable with `EMFILE`.
- Focused owner/linked integration run: 3 passed, 5 browser checks skipped, zero failures.
- `npm run typecheck`, JavaScript syntax checks and `git diff --check`: passed.

`overlay/src/widget.js` was not touched. No commit created.

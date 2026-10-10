# Overlay 8 result

`resolve` now classifies source ownership on the server. Only tracked JavaScript/JSX source inside Plumb's root, with its exact real-path identity, returns an authored file/location. Outside-root sources, node_modules, build/dist files, unsupported sources and symlink aliases return `{ library: true }`. Untracked in-root source returns `{ library: true, untracked: '<repository-relative file>' }`. Classification precedes source reconciliation and hash reads for external/aliased paths. Served-root precedence and missing-file fallback remain unchanged.

The overlay skips library classifications and continues through creation frames and React owners. It classifies mapped sources before requiring sourcesContent/hash evidence, so library-only maps need no authored snapshot. Tracked source hash and JSX mismatches still stop the walk. If an untracked candidate has no provable tracked owner, locate preserves `resolve-refusal` with the first untracked file; the overlay shows `not checked: <file>` and the existing source-configuration explanation. Owner boundaries, depth limits and React 18 proof requirements remain intact.

`fixtures/linked-package` provides an app with a `file:../library` dependency and a sibling Base UI button library. Tests copy the fixture, establish npm's local symlink layout, and build the library with development JSX and maps to its own source. A second configuration tracks that same library inside a workspace Plumb root.

`e2e/linked-locate.test.mjs` checks real Vite build maps, library/untracked/symlink classification, tracked hash/opening-tag refusals, and exact Node-side edits/apply with the other package untouched. Browser cases verify the linked button reaches the app's `<LibButton className="gap-[13px]">` with `via: 'owner'`, while the tracked workspace reaches the library JSX. They also cover an untracked wrapper with a tracked owner and an untracked-only target's refusal/visible explanation. Browser cases await `window.__plumb.ready()`; edits/apply execute from Node so reloads cannot abort writes. Existing locate/served-root integration expectations now assert library classification instead of boundary refusals. No unit tests added.

Validation:

- `npm test`: passed, exit 0. Main phase: 263 passed, 15 skipped; polling: 25 passed, 1 skipped; watch-disabled: 23 passed, 3 skipped. Zero failures in every phase. Skips include missing Chromium and existing environment/mode checks; native recursive watching reported `EMFILE` and skipped.
- `npm run typecheck`: passed, exit 0.
- Focused `node --test e2e/linked-locate.test.mjs`: 2 passed, 2 skipped, zero failures. Real build-map, classification and source-write HTTP slices passed. Browser cases remain unverified here because Playwright Chromium is unavailable in this sandbox.
- JavaScript syntax checks and `git diff --check`: passed.

No commit created. Concurrent startup-error handling and benchmark changes preserved.

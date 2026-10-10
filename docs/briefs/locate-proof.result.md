# Locate proof reconciliation

Implemented the proof boundary in `overlay/src/locate.js` and updated the browser assertions without relaxing JSX positions:

- Every selected location and chain entry comes from the server's tracked-file JSX resolver. An authored `not-jsx` response now terminates with `no-jsx`; transport refusals and untracked project files cannot borrow an ancestor's JSX.
- Creation-map evidence stays with React's `_debugStack` Error, including its sourcesContent hash. Retained stacks are not remapped after invalidation. Hash-bound resolution also closes the gap between snapshot comparison and JSX confirmation. Unmapped authored creation frames refuse; known library frames can continue.
- DOM keys can point at React's old alternate after an update. Locate now follows the committed root's child lists to select the current fiber. The two hashes in the Vite failure are the exact SHA-256 hashes of the original fixture and its `Updated` version: `585cc3fd...` and `4ab5b7e8...`. No line-ending, BOM or transformed-content normalization was needed.
- New committed creation stacks refresh stable Next chunk evidence; bippy owner frames are cached per creation Error. Synthetic component-definition frames are excluded when raw creation records exist. Webpack stack parsing accepts parentheses in layer names.
- Webpack source-path normalization strips the leading slash before `(layer)`, accepting both `webpack-internal:///(layer)/src/App.jsx` and `.../(layer)/./src/App.jsx`. HTTP integration covers both spellings at the repository root and the served app root.
- React 18 expectations include verified `_debugSource` usage sites and their entry-point chain. Authored factories now join non-JSX refusal coverage; legacy refusal/manual-location escape clauses were removed.

The sparse-destructuring edit was missing because cold computed collection can exhaust its 50 ms wall-time budget when a worker is descheduled. The warm classes tracer then finds the literal, but the report has no collected declaration to attach. Collection now retains the operation/depth/import bounds without the wall-time deadline; interactive lookups retain their deadline. A diagnostic cold read delayed by 75 ms reproduced the missing literal with the old deadline and retained `px-[10px]` at `Nullable.tsx:7:63` with the collection budget. The existing feature test passes, including the exact edit and apply flow.

Validation:

- `npm run typecheck`: passed.
- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/plumb-no-browser npm test`: exit 0. Main pass: 298 passed, 22 skipped. Polling: 25 passed, 1 skipped. No-watch: 23 passed, 3 skipped. Zero failures across all three passes.
- Focused locate/owner/served-root HTTP integration: 11 passed, 9 browser cases skipped.
- JavaScript syntax checks and `git diff --check`: passed.

Browser execution remains unverified, as instructed by the brief. Browser skips use an empty Playwright browser directory; the native watcher also reports the sandbox's `EMFILE` limitation. Browser assertions still cover exact JSX positions, owner chains, stale refusal, fresh HMR attribution, declarations and source writes.

No commit made. `bench/apps/verify.mjs` was not read or edited.

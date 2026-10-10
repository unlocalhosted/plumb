# Locate: one definition of proof

overlay/src/locate.js now follows react-grab: bippy owner stacks, falling back per fiber to Plumb's own source-map
reader (overlay/src/sourcemap.js mapFrame, via creationFrame) for webpack eval modules and owners bippy has no raw stack
for, and to React 17/18 `_debugSource`. The browser e2e tests encode an older, stricter design; 9 fail
(docs/briefs/locate-proof.failures.log). Reconcile code and tests to these rules, which are the product decision:

1. A location is proven only when the server confirms an authored JSX opening element at that exact position in a
   tracked file, and, when the element's own frame came through a source map with sourcesContent, that content's hash
   equals the current file's hash (otherwise refuse `source-mismatch`). Never return an unconfirmed position.
2. Never walk past an authored frame that is not JSX: an element created with createElement (or any non-JSX call) in
   project code returns null with reason `no-jsx`. Owner walking may only continue past frames that are library code
   (outside the root, node_modules, deps, dist) or past fibers with no frames at all.
3. Walking up through library code, memo/forwardRef owners and React 17/18 `_debugSource` owners is allowed: those
   positions are React's own records. Update the React 18 owner tests to expect the server-verified usage site (e.g.
   `<MetalButton>` at src/App.jsx:19) with its chain, instead of `owner-unproven`.
4. Stale fibers after an edit: when the element's own frame maps through a map whose content no longer matches the file,
   refuse `source-mismatch`; never re-map an old stack through a new map. Fix the false `source-mismatch` the Vite React
   19 test hits on a fresh element (map hash 585c… vs current 4ab5…): find why a fresh map's sourcesContent hash differs
   from the server's file hash (line endings, BOM, plugin transforms, hashing the transformed code instead of
   sourcesContent) and compare like with like.
5. Next webpack: the server's resolve must accept `webpack-internal:///(app-pages-browser)/src/App.jsx` and
   `webpack-internal:///(app-pages-browser)/./src/App.jsx` (any `(layer)` segment) against the served root; RSC frames
   `about://React/Server/...` are never client sources (locate already skips them).
6. computed.test 'real sparse destructuring…' now misses the edit for `px-[10px]` at Nullable.tsx:7:63 (site has no
   declarations/findings): find whether the merge of overlay-12 into the coordinator worker dropped declaration lookup
   for that site and fix the code, not the test.
Keep every exact-position assertion. Browser tests cannot run in your sandbox: reason from the code and the failure log.
`npm run typecheck` and the non-browser `npm test` must pass. Do not commit.

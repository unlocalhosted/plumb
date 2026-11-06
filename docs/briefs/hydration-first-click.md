# Brief: a click during hydration reads the element's own stamp (deferred from 0.4.0)

On Next webpack, a first click can land while React is still hydrating: the element already carries
`data-plumb-source` in the DOM but has no fiber yet, so `hostOf` reaches a parent's fiber without a stamp and locate
falls back to the owner stack (e2e/hydration.test.mjs, about 1 run in 6; the client bundle is stamped, no mismatch).

`hydration-first-click.patch` (not applied) reads the stamp from the element's own fiber, then `pendingProps`, then
its DOM attribute, never a parent's; waits up to 5 s for a library host's own fiber before reading its usage; and
guards a null fiber. Still to do before it can land:
- make the Next-chunk `snapshot()` in the source-map path return null, not a `resolve-refusal`, when a library frame
  maps outside node_modules (seen on `next/link`: `src/client/app-dir/link.tsx`, "not a tracked project source");
- hydration.test.mjs 5 runs green on webpack and Turbopack, then usage and stamp suites.
Measured with the patch: 5 of 7 runs green; the failures were the snapshot refusal and one install timeout.

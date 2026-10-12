# Brief: slice 0a, dev source stamping for Vite

Read [docs/briefs/live-editor-lld.review.md](live-editor-lld.review.md) first. It overrides the LLD wherever they differ. This slice is its "build first" verdict: a pure Vite pre-transform, the stamp read from the fiber in `locate`, and an exact-opening check in `resolveSource`. No birth helper, no manifest, no generations.

## Build

1. **Transform** (new module under `src/`, used by `src/hosts/vite.ts`): a `serve`-only plugin. Plumb's plugin must run before `@vitejs/plugin-react`, which is itself `enforce: 'pre'`; ensure and check that order. Skip Vitest, builds, `node_modules`, virtual modules and files outside the project's tracked sources. Parse with oxc. For each `JSXOpeningElement`, except `<>` and named `Fragment` / `React.Fragment`, insert ` data-plumb-source="<path>:<line>:<col>#<hash>"` immediately before `>` or `/>`, after every authored attribute and spread:
   - **path:** project-relative, with delimiters percent-encoded;
   - **line:col:** the original 1-based position of the `<`;
   - **hash:** a short, stable prefix of the file's content hash. Use the same hash the server already uses (`sourceHash`), so the overlay can compare it.

   If an element already has an authored `data-plumb-source` (the existing fixture at `e2e/locate.test.mjs:32`), the author's wins for that element: don't add a second one. Return a source map that keeps every authored position mapped. Disk stays untouched.
2. **Server:** the stamp must be confirmed by `resolveSource`. The position equals the exact JSX opening start (not canonicalised from inside it), the tag matches, and the hash matches the file on disk. A mismatch refuses with `source-mismatch`.
3. **Overlay** (`overlay/src/locate.js`): before the owner chain, read the stamp from the selected host fiber's `memoizedProps['data-plumb-source']`. Not from the DOM attribute: a DOM-only attribute proves nothing. Confirm it through resolve. A stamp on a library host that came through a component's forwarded props is a **usage** link: mark it as such, and the default selection stays the same as today. Keep the chain for Alt+↑/↓ from the owner stack as now. When there's no stamp, or it's refused, fall back to the current owner-chain locate unchanged.

## Sanity checks (the owner asked for quick checks, not the full suite)

- `npm run build` and `npm run typecheck`.
- One new e2e file, `e2e/stamp.test.mjs`, on a small Vite fixture. It covers: host JSX gets an exact location from its stamp; component JSX forwarded to a library host gives a usage link; a stale hash after an edit refuses; an authored `data-plumb-source` wins; fragments are untouched; a production build has no stamps.
- Run that file plus `e2e/locate.test.mjs` and `e2e/owner-locate.test.mjs`, to confirm the fallback is unchanged.
- No full `npm test`, no `bench/apps/verify.mjs`.

Write a short result to `docs/briefs/slice-0a-stamping.result.md`: what changed, the checks you ran with their output counts, and anything you refused or deferred.

## Limits

- Only modify files inside `/Users/vijaysingh/unlocalhosted/plumb`. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.
- Another Codex job is editing `bench/apps/verify.mjs` and writing `docs/briefs/verify-frozen.*`. Don't touch those files.
- No commits, pushes, worktrees or global installs.

# Overlay 7: browser paths resolve against the host's served root, not Plumb's root

Found on MetalUI (Vite root `apps/docs`, Plumb root the repo, `plumb({ root })` from commit 584e4d9). A literal
`<button className="… px-15">` in `apps/docs/src/pages/foundations/Motion.tsx` is refused: the browser's source-map
source is `http://localhost:4320/src/pages/foundations/Motion.tsx` (served relative to Vite's root), and `resolve`
reads `/src/...` against Plumb's root, looking for `<repo>/src/pages/...`.

Fix: the transport core takes an optional `servedRoot` (absolute path the host serves `/` from). Vite passes
`server.config.root`; Next passes its project dir (`process.cwd()` of the app, which can differ from Plumb's root in a
monorepo); `serve --overlay` takes `--served-root`. `resolve` maps root-relative browser paths (`/src/x`, `src/x`,
`http://host/src/x`) against `servedRoot` first, then against Plumb's root; `/@fs/<abs>` and `file://` stay absolute; the
result is still validated as a tracked source inside Plumb's root, and returned relative to Plumb's root. Webpack
`webpack://_N_E/./x` and Turbopack `[project]/x` are relative to the Next app dir, so they use `servedRoot` too.

Tests (integration + the existing browser e2e style): a Vite monorepo fixture with Vite root `apps/web` and Plumb root
the repo; an element in `apps/web/src/App.jsx` locates to `apps/web/src/App.jsx:L:C`; a same-named file at
`<repo>/src/App.jsx` is never chosen instead; a Next fixture in `apps/site` with Plumb root the repo. No unit tests.
`npm test` and `npm run typecheck` must pass. Do not commit. Summary to `docs/briefs/overlay-7-served-root.result.md`.

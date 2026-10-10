# Overlay 7 result

Browser source paths now resolve using the host's served root before Plumb's project root. `HandlerOptions.servedRoot` passes through the shared Node/Web transport dispatch to `Session.resolveSource`; it stays local to each handler rather than becoming shared Session state or a request-controlled parameter.

Vite supplies `server.config.root` while keeping explicit Plumb root/config resolution and Session registry identity unchanged. Next's development handler supplies the app's `process.cwd()`, independently of `createPlumbRoute({ root })`. `serve --overlay` accepts `--served-root <dir>`; relative CLI paths resolve from the current working directory. The CLI rejects empty paths, use without `--overlay`, stdio combinations and unrelated commands. README documents the monorepo and separate-server wiring.

Root-relative paths and HTTP source URLs, webpack/webpack-internal sources and Turbopack `[project]` sources prefer the served directory. `/@fs/`, `file://` and explicit absolute project paths retain their exact file identity. Repository-relative returned locations remain usable by site/edits/apply. Resolution falls back to the repository only when the served candidate is absent: an existing untracked file, symlink, stale hash or incorrect JSX position cannot adopt a repository namesake. Existing source membership, project boundary, node_modules, real-path, hash and JSX validation remain in force.

`e2e/served-root.test.mjs` adds disposable monorepo fixtures with Vite root `apps/web` and an installed Next App Router app at `apps/site`, both using the repository as Plumb root. Identical repository/served `src/App.jsx` files expose wrong selection even when hashes and JSX coordinates match. Real HTTP integration slices verify path spellings, exact file/line/column, missing-file fallback, generic root-relative paths, source/symlink/traversal refusals, stale evidence, edit choices and exact writes with the repository namesake untouched. Another Vite slice verifies two handlers sharing one repository Session retain distinct served roots. A CLI subprocess slice verifies relative `--served-root` and authenticated edits/apply over HTTP.

Two browser cases verify actual Vite/Next fibers locate `apps/web/src/App.jsx:4:10` and `apps/site/src/App.jsx:4:10`, respectively, with isolated authored declarations. Both await `window.__plumb.ready()`. Edits and apply run from Node with Origin headers so a write-triggered reload cannot abort the request. The existing locate browser helper now uses that same Node-side flow. No unit tests added.

Validation:

- `npm test`: **passed, exit 0**. Main: **261 passed**; polling: **25 passed**; watch-disabled: **23 passed**. Zero failures in every phase. Skips cover missing Chromium and existing native-watch/environment/mode checks; native recursive watching reported `EMFILE` and skipped.
- `npm run typecheck`: passed.
- Focused `node --test e2e/served-root.test.mjs`: **4 passed, 2 skipped, 0 failed**. Chromium cases skip because the default Playwright executable is missing; exact browser assertions remain unverified in this sandbox. Real Vite, installed Next webpack, shared-Session and CLI HTTP slices passed.
- Browser-test syntax and `git diff --check`: passed.

No commit created. Original brief and concurrent widget/overlay-test changes preserved.

# Review brief: overlay layer 3 locate (DOM element to JSX source site)

You are Astra, reviewing an uncommitted change. Read `docs/briefs/overlay-3-locate.md` (the brief) and the working-tree diff
(`git diff` plus untracked `overlay/src/*.js`, `src/session/source-location.ts`, `e2e/locate.test.mjs`, `fixtures/react18`). Judge three things, by default, not as options:

1. **Correct.** Edits land on exactly the authored text; ids are stable; stale/unknown/overlapping refusals are airtight;
   apply can only write the named tracked source (no config, `.plumb/**`, theme stylesheet, symlink, hard link, traversal);
   the session sees its own write (no race with the watcher, no double rebuild, revision/hash consistent); the token-less
   handler cannot be driven cross-origin (DNS rebinding via Host, missing Origin on POST, `Sec-Fetch-Site`, CORS preflight).
   Multi-byte text, CRLF, JSX attribute variants (`className={"..."}`, `cn(...)`, template literals), CSS files.
2. **Performant.** No full rescans or worker restarts on apply when an incremental refresh works; `edits` reuses the warm
   report; no O(files) work per request; apply of N edits writes once.
3. **Extendable.** The edit model should take new families/rules and new syntaxes (CSS declarations, inline styles, `@apply`)
   without changing transports; `createHandler` must be mountable by Vite middleware and a Next App Router route (Web
   Request/Response) without duplicating dispatch. Name the seams that are missing.

Do not edit source. Write findings to `docs/briefs/overlay-3-review.result.md`, ranked most severe first, each with: file:line,
the concrete failing input or scenario, and the smallest fix. Verify each claim by reading code or running a quick script or
the existing tests (`npm run build && node --test e2e/locate.test.mjs`); mark unverified ones PLAUSIBLE. End with a verdict:
ship / ship after fixes / rework.

Layer-specific checks: wrong-element risk is the worst failure (a confident wrong file:line is worse than null), so probe
components that render another component's JSX, HOCs, memo/forwardRef, portals, Suspense/lazy, server components in Next
(no client fiber), React Compiler output, StrictMode double render, and elements whose className comes from props. Source
maps: Vite pre-bundled deps, CSS-in-JS, eval-source-map vs source-map, Turbopack section maps, stale map after HMR. Cost of
locate on a large Next page (map fetch and decode size, caching, main-thread time). resolve route cannot be used to probe
files outside the root (timing or error-message differences). Browser tests can run here with:
executablePath '/Users/vijaysingh/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'
(use a temp copy of the test; do not change the committed test to point at it).

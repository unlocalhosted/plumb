# Overlay layer 3: from a DOM element to its source line

Layers 1–2 (commits a274654, 21c194d) give the page `/__plumb/site`, `/__plumb/edits` and `/__plumb/apply` in every host. The
overlay needs one more thing before its UI: given an element the user points at, the authored JSX site that rendered it.
No overlay UI in this layer. Browser code is plain ES modules, no dependencies, no build step beyond what the package has.

## What to build

1. `overlay/src/locate.js` exporting `locate(element): Promise<Location | null>` where
   `Location = { file, line, column, component, tag, via }`, and `file` is project-relative.
   Strategies, first that works wins, `via` names which:
   - **`data-plumb-source="file:line:column"`** on the element (for hosts that add it at build time; nothing adds it yet).
   - **React 19 (dev):** find the element's fiber (`__reactFiber$…` key), read `_debugStack` (an `Error` captured at the
     JSX call), take the first frame that is not React/runtime/node_modules, and map that bundled URL:line:column back
     through the script's source map. Walk to the nearest host fiber when the element itself has none; `component` is the
     nearest function component name (`_debugOwner`).
   - **React 17/18 (dev):** `fiber._debugSource` `{ fileName, lineNumber, columnNumber }`.
   - Otherwise `null` (the overlay will say it cannot place this element; never guess).
2. Source maps: fetch the script, read `sourceMappingURL` (inline `data:` or relative URL), fetch and decode with a small
   VLQ decoder in `overlay/src/sourcemap.js`, cache per script URL. Handle index maps (`sections`) as webpack/Turbopack emit.
3. Path normalisation: map source-map `sources` (`webpack://_N_E/./src/App.tsx`, `/@fs/…`, `file://…`, `/src/App.tsx`,
   `sourceRoot`) to a project path. The server is the authority: add a `resolve` route (GET `?source=`) to the shared handler
   core that returns `{ file }` only for a tracked source inside the root, else refuses. The client never sends absolute
   paths it invented to `site`.
4. The JSX column must be the element's opening `<`, matching how Plumb's collector anchors sites, so `site(file, line,
   column)` returns exactly that element's declarations. If the mapped column points at `jsxDEV(` instead, correct for it
   on the server in `resolve`/`site`, not by string-hunting in the browser.
5. Expose on the dev client stub for tests: `window.__plumb = { locate, site(el) }` where `site(el)` = locate + fetch site.

## Tests (integration/e2e, `e2e/locate.test.mjs`)

Add `playwright` (chromium only) as a devDependency. Real browsers against real dev servers on temp fixture copies:
- Vite + React 19: elements at known JSX lines (nested components, a `.map()` list, a fragment child, a component that
  forwards `className`) locate to the right file:line:column and `site(el)` returns that element's findings.
- Next 16 dev (webpack and Turbopack): same assertions through `withPlumb` + `route.plumb.ts`.
- React 18 (Vite) via `_debugSource`.
- An element with no fiber (plain HTML inserted by script) returns `null`.
- `resolve` refuses a source outside the root, `node_modules`, and an untracked file.

No unit tests. `npm test` and `npm run typecheck` must pass (skip browser tests with a clear message only when Playwright's
browser is missing, and say how to install it). Do not commit. Summary to `docs/briefs/overlay-3-locate.result.md`.

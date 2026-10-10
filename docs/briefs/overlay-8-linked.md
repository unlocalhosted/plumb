# Overlay 8: a linked or workspace package is a library to the app that uses it

Found on Kamui's web app (`kamui/web/apps/kamui`, Plumb root = the app). Kamui depends on MetalUI through a linked
package that resolves to `/Users/vijaysingh/unlocalhosted/metalui/packages/metalui/dist/chunk-*.js`. The "seed a sample
day" button is rendered by Base UI inside MetalUI's Button, which Kamui uses. Owner walking passes Base UI (runtime by
package path), then maps MetalUI's frame to `/@fs/…/metalui/packages/metalui/dist/chunk-OQAFUMSD.js`; that path is not
under `node_modules`, so it is classified as authored, `resolve` refuses it ("Source must be inside the project root,
outside node_modules") and locate stops with `resolve-refusal`.

Rule: a frame is authored only when its mapped source is a tracked source inside Plumb's root. Anything else (outside the
root, under node_modules, a linked/workspace package's dist, a symlink whose realpath leaves the root, an untracked file)
is library code for this purpose, and owner walking continues to the next owner. Decide this on the server, which owns
the root and the tracked set: give `resolve` a classification answer (`{ file }` for authored, `{ library: true }` for
library) instead of a refusal for those cases, and have locate continue on `library`. Keep refusing (and stopping) for a
source that is inside the root and tracked but whose hash or opening tag does not match: that is a real mismatch.

The overlay must still say "not checked: <file>" when the first authored candidate is inside the root but untracked and
no tracked owner exists further up (keep `resolve-refusal` with that detail for that case).

Tests (browser e2e, Node-side edits/apply, `window.__plumb.ready()`): a fixture app whose component library is a sibling
package outside the app root, linked via `file:` (built with source maps to its own src), rendering through Base UI; the
app's `<LibButton className="gap-[13px]">` locates to the app's JSX with `via: 'owner'`; the library's own internals are
never returned. A workspace monorepo where the library is inside Plumb's root and tracked still returns the library's JSX
(today's behaviour). No unit tests. `npm test` and typecheck pass. Do not commit. Summary to
`docs/briefs/overlay-8-linked.result.md`.

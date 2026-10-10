# Overlay 6: elements a library renders are located at the JSX that used the library

Found on MetalUI's docs site (`bench/metalui/overlay.vite.config.mjs`, @vitejs/plugin-react, React 19): every element
says "not from your source". Example: the "Copy page" button. `locate(el, { explain: true })` returns
`runtime-only-frames`; its `_debugStack` is entirely library frames:

    at exports.createElement (/node_modules/.vite/deps/react.js)
    at renderTag (/node_modules/.vite/deps/useRenderElement-*.js)      (Base UI)
    at useRenderElement (...)
    at Button (/node_modules/.vite/deps/@base-ui_react_button.js)
    at react_stack_bottom_frame (react-dom_client.js)

The DOM element is created inside Base UI, but the person authored `<Button className=…>` (or `<MetalButton …>`) in
their own file. React records that: walk `_debugOwner` from the host fiber; each owner fiber has its own `_debugStack`
captured at *its* JSX call. Locate the first owner whose creation stack has an authored frame (same frame and
source-map rules as today: runtime classification by real package/module path, first authored frame wins, hash check,
server `resolve` anchors the opening tag). Return it with `via: 'owner'`, `component` = the owner's component name and
`rendered` = the host tag. The same for React 17/18 via the owner's `_debugSource`. Stop at a depth limit (say 12) and
return null rather than guess.

Correctness rules, because a confident wrong line is worse than null:
- An element with its own authored JSX keeps today's answer (never prefer an owner over a direct authored site).
- Owner walking must not cross a portal boundary into an unrelated tree, or skip past an authored component that renders
  library JSX itself (its own JSX is the answer).
- `site()` at the owner's JSX returns the declarations authored there (the `className` passed to the library component),
  which is what the overlay must show and edit.

Tests (e2e, real Chromium via `PLUMB_CHROMIUM` like the others; Vite + React 19 with **@vitejs/plugin-react** as well as
plain oxc JSX): fixtures using Base UI (`@base-ui-components/react` or the package MetalUI uses) and Radix Slot/Primitive
(asChild): a library Button with className, a library Popover trigger, a wrapper component that forwards to the library,
nested library components. Each locates to the authored JSX file:line:column with `via: 'owner'`; `site(el)` returns the
authored className declarations; an element with no authored owner returns null. Add the libraries as devDependencies.

No unit tests. `npm test` and `npm run typecheck` must pass (browser tests skip only when Chromium is missing). Do not
commit. Summary to `docs/briefs/overlay-6-owner.result.md`.

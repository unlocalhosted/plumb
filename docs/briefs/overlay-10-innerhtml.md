# Overlay 10: injected HTML belongs to the element that injected it; names come from source

Found on Kamui's web app (Kamui uses MetalUI's icons). 72 of 164 elements say "not from React": they are the `g`,
`path` and `circle` inside `svg.mu-icon`, inserted with `dangerouslySetInnerHTML` (MetalUI's icon runtime). And owner
results name the component after the bundler (`Button2`) instead of what the person wrote (`<Button>`).

1. **dangerouslySetInnerHTML.** An element without a fiber, whose nearest ancestor with a fiber has
   `memoizedProps.dangerouslySetInnerHTML` set, belongs to that ancestor: locate the ancestor (with all of today's rules,
   including the owner walk) and return `via: 'inner-html'`, `rendered` = the clicked tag. This is proven by the prop, so
   it is not a guess. Every other fiberless element (appended imperatively, or a portal/third-party DOM) still returns
   null, exactly as today; keep the existing "imperative child cannot borrow parent fiber" test passing.
2. **Names from source.** When `resolve` anchors an owner at a JSX opening element, return the element's name as written
   (`Button`, `Popover.Trigger`, `MetalButton`) and use it as `component` instead of the runtime function name.

Tests (browser e2e like `e2e/owner-locate.test.mjs`: `window.__plumb.ready()`, Node-side edits/apply): an icon component
that sets `dangerouslySetInnerHTML` with an svg; clicking a `path` inside it locates to the JSX that rendered the icon;
an imperatively appended child still returns null; an aliased import (`import { Button as Btn }`) is named `Btn`. No unit
tests. `npm test` and typecheck pass. Do not commit. Summary to `docs/briefs/overlay-10-innerhtml.result.md`.

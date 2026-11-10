# Spec: the page as a graph Plumber can see (scene graph)

Status: DRAFT for owner sign-off, 2026-11-05. No code until signed off. Ecosystem claims marked HYPOTHESIS stay so until
`docs/research/scene-graph-spikes.md` (Sonnet spike, running) proves them with raw output.

## The problem

Plumber sees a flat DOM plus one stamp (file:line:col). Humans see cards, regions, components, lists, variants, states.
Every rule that wants "the pricing card" or "all instances of this button" has to reconstruct that from geometry and
guesses. Edits land on the instance because the instance is all that is known. Nothing outside one rendered page,
one state and one viewport can be checked.

## The system

The page is a **graph of levels**. Every DOM element has an identity, and every identity links upward:

```
instance  →  template (.map / conditional branch)  →  component  →  variant/props  →  token  →  role
```

Everything in this document is a view of that graph, an edit at one of its levels, or a proof attached to it.
Three layers of fact, never mixed:

| Layer | Facts | Produced by |
|---|---|---|
| Stamped (build) | component identity, owner chain, slot, `.map` site, conditional branch, prop/variant → class links, server vs client boundary, MDX position | host plugin (Babel / SWC / Turbopack loader / Vite) |
| Observed (runtime) | geometry, computed style, real content, state, a11y tree, timing, fiber data when React exposes it | overlay |
| Inferred (rules) | role (card, region, primary action, list item, field), blast radius, drift, missing states | craft rules, each a claim with a confidence |

Shape: one short id on DOM tags only (a stamp on a component crashes libraries that reject props, see
stamping-everywhere.md); rich facts live in a sidecar manifest keyed by id. The manifest, not the DOM and not React, is
the contract, so server components, MDX, SSG output and other frameworks all fit.

## Headline demos (dev time, on localhost; production is out of scope)

1. **Figma mode on the running app.** A key turns the page into a canvas: select, drag to reorder, drag across containers, resize, auto-layout panel, group/ungroup, edit text in place. Every move writes the real source. Drag runs on a shadow layer at 60fps; the source write happens on drop.
2. **The whole app as a canvas.** Every route an artboard, every component in every state below it, all generated from the code, all editable with the tools of demo 1.
3. **Make this a component.** Select N copy-pasted blocks; plumber diffs them, infers the props, extracts one component and replaces every usage.
4. **Variants by editing.** Style one instance differently, press "make variant", it becomes a prop.
5. **Re-skin the whole app live.** Swap a token set and every role morphs at once.
6. **Agent at the canvas.** An agent cursor edits with the same typed actions as the human tools; the human can grab the mouse at any time.

## Moving things: data-flow facts and the plumbing ladder

A drag moves a JSX subtree to a new parent. What breaks is not the JSX but the **free variables** of the subtree: what
it reads from scope (props, state, context, loop variables, handlers, refs, imports). The manifest therefore also stores
a data-flow graph: for every JSX attribute and child expression, its source kind and location, and for every subtree
its free-variable table. Babel scope analysis gives the table; the TypeScript checker gives the types that let us prove a
rewrite complete.

Each free variable has a **source kind**, and each kind has a mobility:

| Source kind | Mobility | Move needs |
|---|---|---|
| import, module constant, literal | free | nothing |
| store selector (zustand, jotai, redux), query hook (useQuery, SWR, tRPC), URL/search params, RSC fetch under `cache()` | free: location-independent, the moved subtree reads it again | nothing |
| context consumer | free under the same provider | nothing, or move the provider |
| prop of the old parent | mechanical | thread props down from the nearest ancestor that has it |
| `useState`/`useReducer` in the old parent | mechanical | lift to the lowest common ancestor and thread, or move the hook into the subtree if only it uses it |
| derived from cheap props | mechanical | recompute at the new place |
| loop variable (`.map` item) | semantic | reorder the array, or promote the item to its own render; the choice is shown, never silent |
| spread props, HOC, render props, cloneElement, dynamic component tables, refs, effect order | unprovable | agent tier |

**The plumbing ladder**, cheapest first, each rung used only when its conditions are proven:

1. Pure move.
2. Re-read from a store or query cache that already exists (zero plumbing).
3. Thread props, at most two hops, completeness proven by the typechecker.
4. Lift state to the lowest common ancestor.
5. Use the project's own pattern: if it already has a context or store for this kind of data, follow it. A new context is the last mechanical rung, scoped as narrowly as possible.
6. Extract the subtree to a component with an explicit props contract first (demo 3); a contract makes "what must the new place provide" exact.
7. **Agent tier.** Where analysis cannot prove safety, plumber writes a plumbing plan (free-variable table, candidate routes, the chosen route, conventions found in the repo, constraints) and hands it to an agent. The agent writes the change; **plumber does not trust it**. Acceptance is checked by the graph: typecheck and build pass, the render matrix before and after differs only by the moved subtree's position, and no other node changed.
8. Visual-only fallback: place the element by CSS (`order`, grid area) or a portal, flagged because reading order and DOM order now disagree.

**Drop zones show the price.** While dragging, valid drop targets light up: green = free (rungs 1–2), amber = mechanical (the hops are shown), red = agent tier or refused with the reason. This is the demo moment.

**Design continues while code catches up.** An amber or red drop applies instantly on the shadow layer and queues a plumbing task in its own worktree, verified as above. The canvas shows a badge ("plumbing 3/5 ✓"). Ten drags produce a branch, not ten interruptions.

### The move planner: nothing is "can't", only a price

A move is a **graph rewrite with obligations**. Crossing a boundary does not forbid the move; it creates an obligation,
and each obligation has discharge strategies. A discharge can create a new obligation one step further out, which is
discharged the same way. The planner is a work-list solver: take an open obligation, apply the cheapest discharge,
add whatever it creates, repeat. It always terminates, because every discharge moves outward in the DAG and the root is
a universal fallback (wrap or lift at the app root). So the answer is never "no", it is a **cost** (distance and
invasiveness), and the cost is what the drop zones show. The planner searches for the cheapest plan (A* over rewrites);
the plan is a sequence of codemods; the graph then verifies it (typecheck, effect check, render matrix).

Each former "limit" as an obligation and its chain. All of these are PROPOSALS until spiked.

**1. Compound components (Radix `Root`/`Trigger`/`Content`).** Obligation: the part needs an ancestor providing context C.
- Discover the contract instead of tabulating it: walk the library's own module graph once per package version, find each
  `createContext` and which components `useContext` it. That gives a DAG "part → required provider". Where static reading
  fails, **learn by experiment**: render the part alone in the sandbox and catch the "must be used within" error.
- Discharges: move into a different root of the same kind (legal); move the whole root; or **lift the provider** to
  the lowest ancestor of both places, which is the same lifting rule as state, applied to a context.
- Next obligation: lifting the root may change what else it wraps. Check by the same solver.
- Many parts (Content in a Portal) draw elsewhere than they sit. Then a drag of the DOM output means nothing; map it to
  the prop that does mean it (`side`, `align`, `sideOffset`) on the anchor.

**2. Suspense and error boundaries.** Treat them as **effect handlers** (an algebraic-effects view): a subtree has an effect
signature (`suspends` via `use()`, `lazy`, suspense queries, async RSC; `throws`), and the nearest boundary above it
handles it. A move is type-correct when the new nearest handler is equivalent to the old.
- Discharge: **carry the handler with the subtree**: wrap the moved subtree in a copy of the old boundary and fallback. Behaviour is preserved by construction.
- Next obligation: a new boundary changes streaming and waterfalls; the effect check reports the change and the
  matrix confirms the fallback still renders.
- Libraries whose hooks suspend without saying so are learned by probing in the sandbox (force the suspend handler; the spike showed this works in dev).

**3. `'use client'` boundaries.** Model server/client as a **colouring** of the tree, like async-function colouring.
A server component cannot sit under a client component as an import, but it can arrive as a prop or `children`.
- Discharge: **slot conversion** (the "donut pattern", automated): hoist the server element to the nearest server ancestor and thread it down as a `ReactNode` prop through the client parents. Elements are values in the data-flow ladder, so this is rung 3 applied to JSX.
- Next obligation: props crossing the boundary must be serialisable, so a function prop is illegal. Discharge: turn the handler into a server action, or move the handler into a client wrapper; each creates its own obligation, solved the same way.
- Server boundaries are known from stamps (server components have no fibers; spike).

**4. State resets when a subtree moves.** React keys state by position and type, so a new parent remounts it.
- Discharge: **state transplant**. Before the write, read the subtree's hook state from the fiber; after HMR remounts it, restore by hook index (the component code is unchanged, so hook order is identical). `overrideHookState` exists in dev and was shown to work (spike).
- Next obligation: non-serialisable state (refs, DOM nodes, closures) is not carried; those are listed. Compiler cache slots are skipped and recompute. Stale fibers must be resolved from the commit root first (spike, finding 3b).
- For the live preview, a portal keeps the React position and moves only the DOM, so state survives with no transplant at all.

**5. Reading order and DOM order disagree (the CSS `order` or portal fallback).** The fallback is **preview only**,
never shipped. It automatically queues the real move on the ladder; the debt converts to a plumbing task. If someone
keeps a visual-only result, a graph invariant (visual order = DOM order, per WCAG 1.3.2 and 2.4.3) flags it.

**6. API data cannot be reordered in source.** A permutation of runtime data means nothing in source, so recover the
**intent behind the drag** instead (programming by demonstration):
- Read the runtime item fields (fiber props; the spike showed props are visible), then **synthesise the simplest comparator** that reproduces the order you dragged (`price desc`, `featured first`).
- Drag a card out of a list: synthesise the **predicate** that separates dragged items from the rest (a small decision
  tree over the fields) and split the list into two renders.
- Next obligation: the rule must hold for future data. Show the examples it satisfies and counterexamples; when two
  rules fit equally, ask by showing what each does to the other items (active learning, no wording).
- Place the comparator at the natural seam: the query's `orderBy` if the API takes one, the `select` option of the query hook, or the `.map` site. If no field explains the order, fall back to a pinned-ids list in source.

**7. Per-element identity.** The spike found a stamp is per JSX site, so three `li` from one `.map` share an id. Obligation:
instance identity. Discharge: add an instance part at runtime from the `key`. Next obligation: unkeyed lists, which
the planner flags with the exact line.

Always shown, never hidden: JavaScript-only repos have weaker proofs than TypeScript ones; each plan states which
checks passed (types, effects, matrix) and which were not run.

## Constraints from the ecosystem

| Area | What it forces | Status |
|---|---|---|
Results from `docs/research/scene-graph-spikes.md` (a Sonnet spike; PASS means it ran and showed the result; not re-run by me, spot-checked only):

| Area | Result | Status |
|---|---|---|
| Stamp survival | a constant `data-*` on DOM JSX survives to server HTML, SSG and export HTML, live DOM and prod bundles in every cell run (Next webpack and Turbopack, dev and prod; Pages SSR/SSG; static export; Vite dev and build). No hydration warnings seen, but the detector was never checked against a deliberately mismatching page | PASS, absence of warnings UNVERIFIED |
| React Compiler | stamping before the compiler works; after it also works in Babel. The compiler caches stamped JSX but the stamp stays a constant prop. Next's `reactCompiler` compiles only the browser bundle. Babel 8 + `babel-plugin-react-compiler` 1.0.0 silently skips components with default-valued destructured props (the path `@vitejs/plugin-react` 6 pulls in); Vite's native oxc compiler handled it | PASS; React 18 UNVERIFIED |
| Toolchain hook points | one loader file stamped before SWC under both webpack rules and `turbopack.rules`. The repo's Next host stamps nothing today (`src/hosts/next-config.ts`); the Vite plugin exists (`src/hosts/source-stamping.ts`). SWC-plugin route not built | PASS for loaders, SWC plugin UNVERIFIED |
| Ids per element | a stamp is per JSX site, so three `li` from one `.map` share one id; per-element ids need an instance part added at runtime | design consequence |
| Id stability | `hash(path, enclosing function, tag, ordinal)` is best: identical across builds; a comment above, a class edit or a different-tag insert changed 0 ids; a same-tag insert changed 1. Hashing content or position changed 7–8 of 8 ids per file. Vite HMR kept ids and state | PASS; Next HMR UNVERIFIED |
| RSC | server components have no fiber; only `_debugOwner` and `_debugInfo` records (`{name, env:'Server', props, stack}`) are visible. Next App Router runs a vendored canary react-dom and two renderers register on one page. Facts must come from stamps and HTML | PASS (as limit) |
| MDX | a rehype plugin gives `.mdx` line:col in both `@next/mdx` bundlers and `@mdx-js/rollup`, but must also handle `mdxJsx` nodes. Components mapped through MDX drop the stamp from the DOM unless they spread props; the fiber's `memoizedProps` keeps it | PASS |
| Runtime control | in dev the hook exposes `overrideProps`, `overrideHookState`, `setSuspenseHandler`, `setErrorHandler`, `scheduleUpdate`; a Suspense fallback, an error boundary and hook state were forced on mounted components, with and without the compiler. Production react-dom has none of them | PASS, dev only |
| Limits on forcing | `overrideProps` has no effect under Suspense; patching the Suspense fiber's children works in Vite but throws in RSC pages (lazy node); error forcing works only on class components; a stale fiber (non-current alternate) made one hook-state call a no-op 3 of 3 times, so resolve the current fiber from the commit root before each call | PASS as limits; cause of the stale case UNVERIFIED |
| Monorepos, compiled packages | identity must follow the "yours" rule in stamping-everywhere.md | settled there |

Principle: the manifest + DOM work everywhere; fibers are an accelerator where present, never required.

## Appendix: wider capability catalogue

Secondary to the headline demos. Several items (anything about production, field data, session replay, RUM) are out of
scope for now: the owner uses this at development time on localhost. Performance and accessibility items are real but
not the story.

### Understand: the page explains itself
- Point at anything: role, component, template, siblings, how many instances, which routes, which states exist.
- "Why is this here?": the conditional branch and data that produced it. Needs: branch, owner chain.
- Data lineage: which fetch, query or CMS field fed this text, including server-component fetches. Needs: build facts + server-side stamp.
- Ownership: CODEOWNERS mapped to the element; the right team for the right issue.
- Page tour for a new engineer: regions, components, where each is defined.

### Edit: lands at the right level
- One edit, level chosen by blast radius: instance, variant, component, token, role. Live shadow preview, then source.
- Edit at the data level: CMS-bound nodes open the record, not the JSX.
- Intent edits ("denser", "quieter") translated to token/variant changes.
- Figma ↔ code: node mapped to a Figma component, drift flagged both ways, tokens imported.

### Matrix: all states at once
- Every component × state (loading, empty, error, disabled, long, short, RTL, pseudo-locale +40%) × viewport × theme.
- Rules run on the matrix: undesigned states surface. Needs: branch facts, captured props, force controls.
- State coverage: components with no empty or error branch; states never exercised by any test or session.
- Responsive: layout breaks per component at container sizes, not only page widths.
- i18n: string provenance, hardcoded-string finder, expansion and RTL checks per component.
- Motion inventory: which components animate, reduced-motion coverage, jank attributed to a node.

### Cascade: one touch fixes everything
- Fix at the definition, with before/after proof across all instances and routes.
- Design-system synthesis: cluster arbitrary values into the implicit scale, propose tokens, codemod with per-node proof.
- Migrations (Tailwind major, MUI → shadcn, pages → app router) as graph rewrites with a visual+semantic diff per node.
- Dead things: variants, props, components and classes never rendered across the matrix and all routes. Duplicate components found by structural identity.
- Narrow an API: which props are used across all usages, which never.

### Engineering: performance, correctness, health
- Why did this re-render: component, trigger, and the compiler's dependency view. Compiler bailouts shown as risk.
- LCP, CLS and INP element → component and line. Layout-shift attribution.
- Hydration mismatch pinpointed to node and line.
- Cost per component: bundle bytes, RSC payload bytes, hydration time. Suggest moving stateless clients to the server (RSC boundary advisor).
- Error attribution: which boundary, which component, which props at the time.
- Accessibility: accessible-name provenance (which line supplies the label), landmark and heading outline per component, focus order, contrast per role pair across states, fixes at component level.
- Security surface: every `dangerouslySetInnerHTML`, third-party iframe or script, with its origin.

### Test and review
- Integration tests from recorded sessions bound to ids, not brittle selectors; selector healing when code moves.
- Coverage by component and state, not by line.
- Semantic regression: "Card title shrank 2px in 3 instances" instead of pixel noise.
- PR comment: "this diff changes 14 instances on 6 routes" with per-component before/after; a drift budget as a CI gate.
- Living component docs from real usage: prop histograms, state screenshots, where used. A Storybook nobody had to write.

### Production and observability
- RUM mapped to ids: CLS, errors, rage clicks → component and source line.
- Semantic session replay ("clicked the pricing CTA") instead of pixels.
- Experiments and flags as graph levels: which flag gates which node, which variant a user saw.

### Agents
- Typed tool API over the graph: `get_region`, `force_state`, `render_matrix`, `apply_edit(level)`, `prove(edit)`.
- Plumber as the judge and fixer for AI-written UI; compact scene graph as LLM context instead of DOM dumps or screenshots.

## Build order (one layer, finished and verified, before the next)

0. **Shadow layer.** instant preview of a move or resize that is not yet in source, with write-on-drop. Every headline demo needs it.
1. **Identity, manifest and data-flow facts.** id scheme, schema, level links, free-variable tables, source kinds. Proof: locate bench on Next (Webpack and Turbopack), Vite, with the compiler on and off; ids identical across rebuilds and server/client.
2. **Read-only fiber bridge.** Observation and prop capture; says plainly when absent (server components).
3. **Force.** props, state, Suspense, error. Proof: toggle a real loading state on a real app.
4. **Isolated render and matrix.** fixture pool captured from real renders; the state × viewport × theme grid.
5. **Counterfactual edits.** shadow layer, blast radius, proof, write-back at the chosen level.
6. **Agent API and CI surfaces.**

Each layer: feature-slice integration tests only, through the real boundary.

## Open questions for the owner

- Which of the catalogue is the first public moment? Recommendation: "page explains itself" (needs only layer 1) then "all states at once" (layers 2–4).
- Roles: inferred with confidence, or also author-declared (`data-plumb-role`) as an override?
- Production ids: ship a stripped id for RUM mapping, or dev only for now?

## Not in scope

A custom renderer or forked React. Plumber is a control plane beside React.

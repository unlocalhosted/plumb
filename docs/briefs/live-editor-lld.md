# Brief: low-level design for the live editor

Write a low-level design (LLD) for turning Plumb's overlay into a live editor for any React project, as described in [docs/VISION.md](../VISION.md). Write it to `docs/briefs/live-editor-lld.result.md`. Design only; change no other file.

The vision's "What does not change" section is binding. Every mechanism you propose must keep these invariants: exact positions only, source as the truth, preview before write, the design system leading, dev only. Wherever an idea would bend one of them, say so and either reject the idea or show how it keeps the invariant.

## Ground it in what exists

Read the code before designing, and cite files and functions.

- **Locate and identity:** `overlay/src/locate.js`, `overlay/src/sourcemap.js`, `src/session/source-location.ts`, plus the identity design in `docs/briefs/locate-anchoring-lld.result.md`. The owner chose dev source stamping as the single exact approach: `data-plumb-source="file:line:col#hash"`, added by a `pre` Vite transform to host and component JSX in tracked files, Plumb's attribute last on each tag, skipped under Vitest and in production, with the owner chain only as fallback. Treat stamping as layer 0 and design it fully: the transform, the hash, HMR, Next (webpack and Turbopack), and SSR.
- **Reading and writing today:** `overlay/src/widget.js` (pin, reading, preview, Before, Undo, Write), `overlay/src/model.js`, and the edit engine, `src/session/engine.ts` `edits` and `apply` plus the code they call, along with how edits are proven exact today.
- **Session architecture:** `src/session/index.ts` (host), `coordinator.ts`, `worker.ts`, `server.ts` (HTTP), and the health and busy rules (`docs/briefs/health-burst.result.md`).
- **The interaction model to bring over:** MetalUI's editing layer, `/Users/vijaysingh/unlocalhosted/metalui/docs/EDITING_LAYER.md` and `apps/docs/src/ui/edit`, read-only. No sliders, handle the real component, steps snap, highlight only what's pointed at.
- **Prior art to learn from, never copy:** Bret Victor's *Inventing on Principle* and *Learnable Programming*; React DevTools (how it reads props, state and hooks); Storybook (states and controls); Onlook, Builder.io, Plasmic and Webflow (visual editing of code), and where they break the "source is the truth" rule; and Figma's direct manipulation. Use the web. Cite sources. Say what each does well and where it fails our invariants.

## Be ambitious: time, motion and the talk's demos

The owner wants the ambitious parts designed seriously, not deferred with one line. Design these as real mechanisms, with the same rigour as layers 0–3, and say plainly what is sound now and what is research:

- **Time travel across state.** In *Inventing on Principle*, Victor scrubs back and forth through a game's timeline and edits code while the result updates at every moment. Design the React equivalent. Record a session's state transitions: props, state, hooks and context per commit, read through React's internals as DevTools does or through an instrumented store. Scrub a timeline of commits and see the UI at each one. Edit a value at commit *n* and see every later commit replayed. Fork the timeline. Cover what makes replay deterministic (effects, timers, network, randomness, dates), what has to be stubbed or recorded, and where determinism can't be guaranteed and Plumb must say so.
- **Seeing every frame at once.** Victor shows a trajectory of all positions over time, not one frame. Design onion-skinning and trails for a component's motion: every frame of a transition laid out at once, so the shape of the motion shows. Also show a component's states as a strip you can scrub.
- **Motion editing.** Scrub an animation's progress. Edit spring parameters (stiffness, damping, mass) or durations and see the change while scrubbing. Show the curve and where the current frame sits on it. Write the change to source as the project's own motion tokens. Cover CSS transitions and animations, the Web Animations API, View Transitions, and libraries such as Motion (framer-motion), which Crafting Attention and AlgoRecall use. Cover reduced motion.
- **Live values in code.** Victor's other demo: every number in the code is directly draggable, and the effect shows immediately. Design the link from a literal in source, shown in the overlay or in the editor, to its live effect on the page, in both directions: point at the page and get the value; drag the value and the page follows.
- **Causality.** Click a pixel and see the chain of code and state that drew it: JSX, props, the state that fed them, the event that changed that state.

For each, give the data model, the instrumentation it needs, the cost, the fixed rules it touches (preview before write, source as truth), and a smallest first slice that proves it on a real app.

## What the LLD must contain

For layers 0–3 in full detail, and 4–7 in enough depth to show the architecture holds:

1. **The data model:** what an editable thing is (an authored literal, a class token, a prop, a text node, a JSX node), how it is identified (stamp plus AST path plus hash), and how it is versioned as the file changes.
2. **Edit semantics:** which edits are exact by construction, which need a choice, and which Plumb refuses, with the rules for each. Cover how edits compose: several pending changes in one file, across files, undo and redo, conflicts with edits the person makes in their own editor at the same time.
3. **The preview pipeline:** how a pending change shows on the live page before Write (inline styles today; what works for structure, props and text?), how it stays correct across HMR and re-renders, and how Before and Undo restore exactly.
4. **The write path:** the minimal-diff writer (formatting, comments, surrounding expressions), its verification against the file hash, and its interaction with the dev server's reload.
5. **Direct manipulation (layer 3):** each handle (spacing, size, radius, type, colour, layout), its gesture, what it edits in source, how it snaps to the project's decisions, how it shows off-scale values, and its motion: springs from the project and Plumb's own tokens. Cover keyboard and accessibility.
6. **States and time (layers 5–6):** how to force a state or a variant without corrupting the app's own state, how to render a component's states side by side, and where state history comes from (React internals, as DevTools reads them, or a recorded session). Say which is sound.
7. **Prototyping (layer 7):** variations, sample data and branches of changes kept or discarded as a whole, all expressed as source edits.
8. **Performance budgets** for each interaction (a handle drag must preview within one frame), and how they fit the session's main-thread and health rules.
9. **Extensibility:** how a design system or a project plugs in its own handles, value scales and edit rules. Presets already exist in `src/presets/`.
10. **Atomic build order:** layer by layer, each with its acceptance as e2e feature slices through the real browser and HTTP boundary (no unit tests), its fixtures, and a check on at least one of the four real apps.
11. **Risks, open questions, and what to cut.** Say plainly which parts of the vision are hard, which are research, and which should wait.

Make it exceptional: concrete, grounded and decisive. Prefer one exact mechanism over stacked heuristics, the rule the owner set for identity. Where you recommend, say why, and name the alternative you rejected.

## Limits

- Design only. Write only the result file.
- Do not run the browser suite, `bench/apps/verify.mjs` or any app's dev server: a timing run is in progress on this machine. Reading code, web research and small read-only Node scripts are fine.
- Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.

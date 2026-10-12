# Vision: any React project as a live editor

Owner's direction, 2026-10-12. Plumb's overlay grows from a design-drift judge into a live editor for any React project, and then into a prototyping tool. The model is Bret Victor's *Inventing on Principle*: whoever is making something needs an immediate connection to it. You change a value and see the result while you change it. You point at a pixel and reach the code that drew it.

This supersedes the line in [ROADMAP.md](ROADMAP.md) §3.1 that the overlay "is not a style editor". The rest of the roadmap stands. The judge, the ledger and design-system decisions become what the editor snaps to.

## What does not change

- **Exactness.** Plumb writes only to a position it has proven, and refuses otherwise. A live editor that writes to the wrong line once loses trust for good, so no layer below relaxes this.
- **Source is the truth.** Every change is a minimal edit to the authored file, applied through the dev server's normal reload. Plumb keeps no hidden layer of overrides or second copy of the UI.
- **Preview before write.** Every change shows on the live page first, can be reverted with Before and Undo, and reaches disk only on Write.
- **The design system leads.** Values snap to the project's decisions (tokens, scales, variants). A value off the scale is allowed, but marked as off the scale and recorded in the ledger, never silently accepted.
- **Dev only.** Nothing ships to production. Nothing is written into source except the edits a person asks for.

## Layers

Each layer depends on the ones above it. Build them one at a time, each finished and verified before the next starts, with e2e feature slices on fixtures and on the four real apps (MetalUI, Kamui, Crafting Attention, AlgoRecall).

| # | Layer | What a person can do | Depends on | Status |
| --- | --- | --- | --- | --- |
| 0 | **Identity** | Point at any element and get the exact JSX that made it, whatever the toolchain does. | — | Owner-stack locate proven on four apps (20/20 exact each). Dev source stamping (`data-plumb-source`, hash-checked) is next. |
| 1 | **Reading** | See what the element is made of: classes resolved to tokens, computed classes traced to their literals, the component chain, the cascade. | 0 | Built. |
| 2 | **Writing** | Change any authored value (class, prop, inline style, text) and see it live; write the exact diff. | 0, 1 | Partial: token edits preview and write today. |
| 3 | **Direct manipulation** | Handle the thing instead of typing: drag a gap, scrub a number, pull a radius, pick a colour. Every handle steps through the system's values. | 2 | Interaction model exists in MetalUI's editing layer (`docs/EDITING_LAYER.md` there). |
| 4 | **Structure** | Reorder, wrap, remove or insert elements and design-system components, as edits to the JSX tree. | 0, 2 | Not started. |
| 5 | **States** | See a component in every state side by side (rest, hover, focus, pressed, disabled, loading, error, empty) and in every variant, with prop controls inferred from its types. | 0, 1 | Not started. |
| 6 | **Time** | Scrub motion and transitions; step through state changes and see the UI at each one. | 5 | Not started. |
| 7 | **Prototyping** | Try variations side by side, feed components sample data, and keep or discard a branch of changes as a whole. | 2–6 | Not started. |

## What each layer has to answer before it starts

- **2. Writing:** which edits are exact by construction, such as replacing a literal or adding an attribute, and which need a decision, such as a value computed in code or a class built from a variable. The rule from today's token edits carries over: write when exactly one edit fits; otherwise show the choices.
- **3. Direct manipulation:** handles follow the editing-layer principles. No sliders standing in for the real thing; steps snap; only what's pointed at is highlighted. Motion uses the project's own springs.
- **4. Structure:** a JSX tree edit has to preserve comments, formatting and the expressions around it. The test is that a person reading the diff sees exactly the change they made.
- **5. States:** forcing a state (`:hover`, `:focus-visible`, a `loading` prop) has to leave the app's own state untouched, and every forced state has to be visibly labelled as forced.
- **6–7:** these need a model of application state. Decide whether that comes from React's own data, as DevTools reads it, or from a recorded session, before building either.

## Immediate order

1. Finish layer 0: dev source stamping for Vite, then Next (webpack and Turbopack), hash-checked, with the owner chain as fallback.
2. Generalise layer 2 from token edits to any authored literal, starting with class tokens and numeric props.
3. Bring MetalUI's handles to the overlay for spacing, radius and type (layer 3).

Layers 4–7 get their own briefs when layer 3 is in use on a real project.

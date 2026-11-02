# Brief: the recipe engine — any source in, the project's own idiom out

Owner feedback (2026-11-02): the first recipe implementation (docs/research/packs/first.json run by per-recipe
formulas and fixed CSS/Tailwind templates) is "very naive and very rigid": a recipe only works the way its author
wrote it, dials exist only where someone wrote formulas, and nothing knows about the project it lands in. Recipes must
"integrate and ingest into any system".

Owner decisions:
- The project's own shadows and easings come first, as its recipes, with dials; pack recipes are mapped onto them
  ("close to your shadow-md"): use theirs, move theirs toward the recipe, or add it under their naming.
- Writers first: Tailwind v4 `@theme`, plain CSS custom properties, motion/react (when installed).
- Licences: MIT/Apache-2.0 sources only, a one-line credit with URL in a comment. Names: plain role names
  (`--shadow-raised`), never pack prefixes. Recipes needing a library are shown, marked, never half-written. Exits
  without data-state or a library: entrance only, said.

## The system to build (server side, TypeScript, in src/recipes/)

1. **One model per kind** (not CSS templates):
   - Shadow: `{ layers: [{ x, y, blur, spread, color: { r, g, b, a } | token, inset }], light?: deg, height?: n }`;
     derived properties (height, softness, light direction) computed from the layers.
   - Motion: `{ trigger: 'hover' | 'press' | 'focus' | 'enter' | 'exit' | 'layout', changes: [{ property, from, to }],
     timing: { type: 'spring', stiffness, damping, mass } | { type: 'spring', duration, bounce } | { type: 'curve',
     duration, easing: [x1, y1, x2, y2] | 'linear(...)' }, requires: 'none' | 'data-state' | 'motion' }`.
2. **Generic dials on the model** (work for ANY recipe, imported or not): shadow height (scales offsets/blur/alpha
   together, physically), softness (blur vs offset), light direction (rotates every layer's offset around one light),
   tint (colour from the surface below); motion speed (duration / spring stiffness), bounce (overshoot), distance
   (translate amounts), start scale. Pure functions, round-trippable.
3. **Readers (ingest)** → the model: the project's own theme (Tailwind v4 `@theme` `--shadow-*`, `--ease-*`,
   `--animate-*`, `--default-transition-*`; plain CSS custom properties that hold a box-shadow or a timing value;
   classes already used on elements: `shadow-md`, `transition`, `duration-200`, `ease-out`, `hover:-translate-y-0.5`);
   a pasted `box-shadow` string; Open Props / Tailwind default themes; motion/react `transition`/variants objects;
   W3C design-token JSON (`$type: shadow | cubicBezier | duration`); the existing pack format
   (docs/research/recipe-pack.md) as one more reader, not the core.
4. **Mapping**: for a pack recipe, the nearest of the project's own (a distance over the model: per-layer offsets,
   blur, alpha; per timing: duration, curve shape) with a plain verdict: same / close to yours (what differs) / new.
5. **Detection**: which idioms the project uses (Tailwind v4 with its CSS entry; plain CSS variables in which file;
   motion/react installed and how it's imported; Radix/Base UI data-state on the element) from the session's
   project knowledge (src/session, plumber.config), not guesses.
6. **Writers (emit)** in the project's idiom, as reviewed edits through the existing write path (hash-checked,
   undo handles like POST set/apply-all): add/update a theme token under the project's naming pattern (detect
   `--shadow-*` vs `--elevation-*` etc.), use it on the element's line (class swap through the existing swap
   machinery, or a motion/react prop edit), with the credit comment. Never write half a recipe.
7. **HTTP**: `GET /__plumb/recipes?file&line&column` → `{ idioms, yours: [recipe], packs: [{ recipe, nearest, verdict
   }], element: { shadow, motion } }`; `POST /__plumb/recipes/preview` (model + dials → CSS values the overlay can
   apply inline, no write); `POST /__plumb/recipes/apply` → the edits + undo handles.

## Proof
Integration/e2e tests only, over real HTTP on fixtures: a Tailwind v4 fixture with its own `--shadow-*` and
`--ease-*` (yours listed first, a pack recipe mapped "close to your shadow-md", applying writes `@theme` + the class
swap, undo restores); a plain-CSS-variables fixture; a motion/react fixture (writes a `transition` prop). Readers
round-trip: a pasted box-shadow → model → the same string. Dials: height on an imported 3-layer shadow scales
all layers.

## Rules
Main checkout, no worktree. Don't touch overlay/src (the UI is Claude's), site/src/hero/Hero.jsx, or other uncommitted
overlay changes; don't commit or push. The machine is swapping: one test file at a time, no full suites. Report
briefly with commands and raw results, and the exact JSON shape of GET /__plumb/recipes.

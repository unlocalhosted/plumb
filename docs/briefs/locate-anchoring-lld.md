# Brief: low-level design for locating JSX when the source map is wrong

Output a low-level design (LLD), not code. Write it to `docs/briefs/locate-anchoring-lld.result.md`. Read the code to ground every claim. Do not change any source file.

## The goal

Plumb's overlay answers one question: which authored JSX tag made this DOM element? Plumb writes edits to that position, so a wrong answer is worse than none. The rule, from `docs/briefs/locate-proof.md`, is that a position counts only when the server confirms an authored JSX opening there.

We want Plumb to place more elements on projects whose source maps are imperfect, without ever giving a wrong position.

## What exists

- `overlay/src/locate.js` reads React's owner stack through bippy (`getOwnerStack`, `getRawOwnerStack`) and Plumb's own map reader (`overlay/src/sourcemap.js` `mapFrame`, the element's own creation frame). It then asks the server (`/__plumb/resolve`) to confirm each position. It walks owners innermost first, through library, memo and forwardRef owners, and builds a chain.
- `src/session/source-location.ts` parses each file with oxc and holds every JSX opening (`anchors`: line, column, tag, span) and every call (`calls`). `jsxLocation` confirms a position. `positionKind` classifies a non-JSX position as `outside`, `hook`, `call` or `other`.
- New in `ec17b7e`: a non-JSX frame is skipped as a harmless caller only when it's a `call`. Positions that are `outside`, `hook` or `other` count as proof that the module's map is wrong, and Plumb refuses with reason `map`.
- `bench/apps/verify.mjs` checks Plumb against react-grab and checks exactness on four real apps. Its reports are in `docs/verification/` (these are large).

## The evidence

AlgoRecall (`/Users/vijaysingh/unlocalhosted/algorecall`, read-only) compiles every component with the React Compiler (`babel({ presets: [reactCompilerPreset()] })` after `@vitejs/plugin-react` in its `vite.config.ts`). In its last check run:

- 93 elements matched react-grab, 47 were placed by react-grab only (Plumb refused), 0 disagreements, and 20 of 20 placed positions exact.
- A read-only probe transformed `src/platform/ui/BrandMark.tsx` (95 lines) through the app's own Vite. The second `<rect>`, written at line 71, has **no mapping** for its `jsxDEV` call. The first `<rect>` maps to line 70 correctly. Moving the compiler plugin first doesn't change that; removing the compiler fixes it. So no configuration fixes it.
- In the browser, Plumb mapped those `<rect>`s to line 140 of the 95-line file. The reader took the nearest earlier mapping, which belongs to compiler-generated code. react-grab said line 53, a data object.
- Before `ec17b7e`, one `<a>` was placed at `HomePage.tsx:42` (`<Hero />`), the owner's usage site rather than where the `<a>` is written. That came from skipping a frame that mapped onto `useEffect(...)`.

## What we've considered (evaluate these, add better ones, rank them)

1. **Content anchoring.** The map still names the right file, and React knows the owner component. Search the JSX openings inside that owner's function body for one whose tag and literal attributes match the live element: `className` literal, attributes with literal values, `key`, and text children. Answer only when exactly one candidate matches. Define the proof precisely. What exactly counts as a match? How do props spread from variables, dynamic `className` values and `.map()` siblings with identical literals stay sound, refusing rather than guessing? How is the owner's function body found: the fiber's type name, the binding in the file, or the owner's own frame?
2. **Strict map reading.** A generated position without its own mapping is unmapped. Don't borrow the nearest earlier segment, or bound how far it may borrow. Measure what this would cost on correctly mapped projects: MetalUI, Kamui and Crafting Attention all currently place every sample exactly.
3. **Install-time map probe.** `plumb init` (see `src/adoption/`) transforms a sample of the project's JSX through its own Vite and reports what share of JSX calls map exactly. It names the cause (the React Compiler, for example) and what Plumb will do about it. Define the sampling, the time budget and the output. Say whether the result should change Plumb's behaviour at run time, and how.
4. **Opt-in source stamping.** A `pre` Vite transform writes `data-plumb-source="file:line:col"` onto host JSX elements from the untouched source. Cover the trade-offs: hydration and SSR, snapshot tests, attributes reaching the DOM through components that spread props, and whether component tags can be covered at all.

5. **Reverse engineering from the code that ran.** Work backwards from what the browser executed instead of trusting the map. The frame's URL and line:column point into the served module. Fetch that module text (what Vite served, after every transform). Parse the call at that position and recover what the compiler kept:
   - In development the JSX transform usually passes a source literal as the fifth `jsxDEV` argument, `{ fileName, lineNumber, columnNumber }`. React 19 ignores it at runtime, but it's in the served text. Establish for each pipeline whether it's present: Vite with plugin-react (oxc and Babel), plugin-react-swc, the React Compiler (does it keep the argument when it memoises?), Next with webpack and Turbopack, and MDX. Use the fixtures and the four apps (read-only) as evidence.
   - Failing that, recover the call's literal arguments (tag, prop literals, `key`) and feed them to content anchoring.
   - Learn generally from the compiled shapes: React Compiler cache slots (`$[n]`), hoisted constants, Refresh wrappers. Recognise how each tool rewrites JSX, so Plumb can undo it deliberately rather than read it through a lossy map.
   Cover how the served text is obtained (the same URL as the frame; Next's eval and HMR modules; Turbopack's inline-map modules that can't be fetched), and how a recovered `lineNumber` is still proven by the server's JSX check.

## What the LLD must contain

- For each approach: the data it needs, where each piece comes from (exact functions, files and fields), the algorithm step by step, the proof that it can never return a wrong position, the cases where it refuses, complexity and cost per locate, and how it fits the existing chain or index model.
- The recommended order of work, as atomic layers. For each layer: the integration or e2e tests that prove it, as feature slices through the real HTTP and browser boundary, never unit tests. Name the fixtures, including a React Compiler fixture that reproduces the missing `jsxDEV` mapping.
- What would raise AlgoRecall's placement without lowering exactness anywhere. Set a numeric target from the evidence.
- Risks and open questions.

## Limits

- Read only. No edits to source, tests or config; write only the result file.
- Do not run the browser suite, `bench/apps/verify.mjs` or any app's dev server: a timing run is in progress on this machine. Reading code and running small read-only Node scripts is fine.
- Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.

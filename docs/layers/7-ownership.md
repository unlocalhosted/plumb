# Layer 7: ownership

Built ownership only against DESIGN 2.3, 4.4 and row 7. No installation, commit, ledger change or MetalUI write. Protected `formatText`, `formatFinding` and `brief` remain byte-for-byte unchanged. All project-specific contracts and reconciliation live in `bench/metalui/`, not `src/`.

## Discovery and identity

`src/ownership/components.ts` discovers components in the required order: configured package/import prefix/directory; otherwise `components.json` aliases; otherwise `src/components/ui`; otherwise exported React components under `src/components`. `from` is optional so contracts can refine inferred discovery. Explicit forms are `package:name`, `import:prefix` and `directory:path`; existing paths are directories and other bare strings are import prefixes. Shadcn aliases resolve through the consumer's tsconfig even when callers import relatively.

Oxc resolves the consumer's actual imports and extension aliases. Named/default exports, export stars, renamed imports/exports, namespace imports/re-exports, object namespaces, and `Object.assign(Root, { Root, Screen })` keep source identity. Named default-only exports retain their real name. `memo`/`forwardRef` component factories and referenced render functions remain components. Cycles stop through seen sets. Type-only imports and lexical parameter/block shadows do not create runtime component identities. External component files are read for identity/variants, never appended to the caller declaration set.

A local function rendering a discovered component and forwarding its parameter's className/class (including renamed destructuring or a props/rest spread) retains that component's identity, across multiple files. A local component merely containing a literal-styled Button does not become Button. Design-system components selected by discovery retain their own identities rather than being replaced by the primitive they compose.

Source positions bind declarations to JSX class/className/style attributes. Class constant definition sites outside those attributes are not additional callers; their lowered use sites are authoritative. Declarations in the identified component's own source file are excluded. Shared declarations already enforce source globs, so dependency sources and outside-glob callers cannot add ownership findings.

## Contracts and judgement

`src/ownership/judge.ts` judges every lowered caller property, including compiler-defined/static named utilities, recipes, arbitrary candidates and dynamic inline values with a known property. It does not use provenance's authored-value filter: even a named paint recipe overwrites component paint. Unknown whole spreads/objects have no fabricated property.

Default ownership is paint (color-bearing properties/background/image, border/outline color and their shorthands, fill/stroke, foreground and text shadow), type (font family/size/weight, leading and tracking), radius, elevation and padding. Everything else is allowed, including margin, width/height and min/max constraints, flex/grid/alignment, positioning/insets, order/grid-area, visibility and display:none. Background positioning and text alignment also remain outside those owned families.

Global `components.own` or per-component `own` replaces the owned set. `allow` removes a family/property; new additive `deny` adds one. Compound-part contracts refine the base component's contract. Within one contract deny wins; a more specific part may refine the base. `color` is the single CSS property; `paint` is the ownership family. Other core family names such as spacing/motion/z are also accepted. No class allowlists or project names appear in the core.

Padding physical/logical shorthands expand to longhands for single-property contracts. Expansion keeps source position, branch conditions, dynamic metadata, and !important. Each finding groups equal resolved component source/name, property, compiled value and severity kind, deduplicating physical sites. Source paths are relative when hashing keys, so worktree location does not change ownership keys.

Findings use `ownership/<canonical Component>` and include property, owned family, real source file/line, structured `component` metadata and a fix listing actual variant axes/values. Source readers follow cva/tv configuration dependencies, helper aliases, component prop string unions and direct imported union aliases. Published JS can supply unions in its adjacent `.d.ts`; consumer tsconfig paths prefer actual TS source when configured. No possible variant is invented when static metadata is absent.

## Render props and stylesheets

Design-system `render` props lend ownership to their rendered element, including callback returns. A design-system render target also lends identity upward to the primitive host whose props land on it. Unrelated child elements and non-render slots keep their own identities.

Simple stylesheet classes explicitly supplied by callers are direct ownership evidence, including static recipe properties; findings point to the authored CSS declaration. Descendant selectors match the root's tags/classes and caller class hooks against observed JSX ancestry. These always warn and explicitly say heuristic. Root hooks come from returned roots and their class dependencies, with literal compiled React/Base UI host-tag support; descendant child classes are not root hooks. Selector owners are indexed once per selector shape, preventing a repeated declaration-by-component ancestry search.

Functional pseudos (`:is`, `:not`, `:has`, etc.), sibling combinators, IDs, dynamic ancestor classes and cross-file runtime ancestry remain unknown. This conservative boundary prevents `.pair > div` from warning against every div-rooted component in the project. There is no computed cascade, dynamic component identity, runtime branch evaluation or proof of CSS reachability. Attribute/state selectors are potential matches and retain warn severity.

## Shared-file integration

- `config.ts`: optional discovery source and additive validated `deny` field.
- `index.ts`: one ownership pass, findings/coverage attachment, one timing phase; CLI unchanged.
- `report.ts`: optional structured finding component, ownership coverage and phase types only. No text-view changes.
- Schema: corresponding optional fields and metadata definitions; existing required fields preserved.

JSON ownership coverage contains `callerDeclarations`, direct failing contexts, separate heuristic contexts and per-family `{ total, allowed, findings }`. Counts are lowered property contexts (padding expanded), not class names or rendered instance counts. Allowed + findings equals total. Definitions and caller class CSS can share a source site; each relevant canonical component/property context is still counted once by the pass.

## Validation and benchmark

`fixtures/ownership` and ten integration tests execute the real compiled CLI through `node:test`. Feature slices cover all acceptance examples plus contracts on mixed/static/arbitrary/inline properties, source and own-source boundaries, type-only/shadowed imports, cyclic barrels, shadcn paths, named/default/namespace re-exports, compound package parts, compiled JS declaration metadata and both render transfer directions. No unit tests were written.

Final `npm test`: **75 passed, zero failures/skips**. `npm run typecheck` and `git diff --check`: green. Cold/warm complete reports have identical findings, decisions, declarations and coverage.

MetalUI commit **faa2036e4634e4f6c8d49feaa2dac87a77559501**, immutable source archive under the layer's cache; dependency installation is linked read only. This avoids another live run's concurrent Dial edits/commit. Preset source inputs are byte-checked against the archive. `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer7` for every benchmark CLI run.

Benchmark: **39 ownership groups / 50 property-site rows**, **45 direct failing contexts + 5 heuristic contexts**. Every row has a recorded verdict in the appended BENCHMARK section and reconciliation artifacts. Button.tsx:209 catches both `bg-s!` background-color and `shadow-none!` box-shadow, with cap/size/state axes and actual component source. Intentional x-ray/negative-example/state specimens stay emitted; no exception was silently accepted or written to a ledger.

Contracts are source-grounded: Surface/Well delegate host content padding, typography and foreground; Surface delegates host focus; GlassFace owns its bezel padding while Screen delegates content padding and its own documented fill; SlidingIndicator explicitly delegates material and shape. **215 pure layout caller property contexts, zero findings**. `sr-only` emits real zero padding as well as allowed layout properties; the Label contract gap is explicitly reviewed instead of hiding those declarations.

Cold full process/report: **4787.0 / 4542.8 ms**. Warm full process/report: **2187.1 / 2012.1 ms**; ownership **681.8 ms** warm. Warm compiler 1302/0 and module 1303/0 hits/misses. These are one process pair, not latency guarantees. No claimed two-second process target: full warm CLI is slightly above it.

Reproduce after build: `node bench/metalui/measure-layer7.mjs`, then `node bench/metalui/reconcile-layer7.mjs`. The inherited lowerer's opaque whole style objects and template holes remain explicit limits, including Button.tsx:533's unlowered `PRESSED[cap]` template branch; the literal held recipe in availability-picker is caught. Ownership cannot judge properties that earlier layers never lowered.

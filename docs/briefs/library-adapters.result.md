# Library adapters: result

Status: in progress, 2026-10-29. One section per layer; each has the commit, what changed, the commands run and
their raw output, and what is unverified. Owner's goal: full support for Base UI, Radix and shadcn/ui through one
`LibraryAdapter` contract (`src/project-facts/libraries/adapter.ts`), support derived from the capabilities an
adapter implements and that ran, never written by hand.

## Layer 1: adapter contract, derived support, real usage map

Commit: 2cfc382 (99d10cb amended to carry this hash)

What changed
- `src/project-facts/libraries/adapter.ts`: the `LibraryAdapter` contract (`family`, `capabilities`, `owns`,
  `meaning`), the capability vocabulary (`usage`, `states`, `structure`, `owned`, `system`), `collectUsage` (walks
  the JSX of every source file that imports the library; a file that will not parse is named as evidence and the
  capability is `unknown`; never throws) and `describeUsage` (the doctor line).
- `src/project-facts/libraries/base-ui.ts`, `radix.ts`, `shadcn.ts`: one adapter each, `capabilities: ['usage']`.
  Base UI: subpath and root imports, parts as members. Radix: namespace (`Popover.Content`), named part (`Trigger`),
  prefixed (`DialogContent`), bare name = `Root`, single-element packages (`Slot`) have no part; the unified
  `radix-ui` package and `@radix-ui/themes` are owned too. shadcn: `components.json` aliases (`ui`, else
  `<components>/ui`, else `@/components/ui`) say where the generated files live; `DialogContent` from `dialog` is
  `Dialog.Content`.
- `src/project-facts/libraries/index.ts`: families now declare only how their elements take style (`classes` or
  `own`) and whether they are a class helper; the hand-written `components()` sentence is gone. The detector runs
  each adapter capability and records how it ran (`capabilities: { usage: 'judged' | 'unknown' }`).
- `src/project-facts/support.ts`: `derivedSupport(family, adapter, ran)`. With an adapter: `supported` when every
  needed capability ran, else `partial` naming what is judged, what is not judged yet and what could not be read
  here. Without one: `partial` "found, not understood yet: your classes on its elements are judged like plain
  elements; its states, portals and own variables are not" (classes-styled), or `unsupported` (self-styled: MUI,
  Chakra, Mantine). `Detected` gains `usage` and `capabilities`.
- `src/project-facts/index.ts`: doctor's Libraries row shows the usage line when there is one; adapters, config
  reader and words exported. `src/adoption/doctor.ts`: the Support table prints `judged; skipped` (the skipped
  sentence carries its own "are not").
- Tests: `e2e/library-adapters.test.mjs` (new, 5 tests), `e2e/styling-detection.test.mjs` (shadcn is `partial`
  until the system layer; helpers moved to `e2e/helpers/layouts.mjs`), `e2e/fixtures/onboarding-state.json`
  (three expectations regenerated: only `facts.libraries` changed, verified by diffing the rest).

Commands and raw output
```
$ cd ../crafting-ui && node ../plumb/dist/cli.js doctor | grep -E "^Libraries|^partial|^supported"
Libraries:       Base UI              Base UI: 9 files · Checkbox 3, Slider 3, Popover 2, Switch 1,…
supported   Tailwind 4:        package.json:24   judged
partial     Base UI:           src/comp…nt.tsx:5 usage (every primitive, part and site); states, st…
$ node ../plumb/dist/cli.js --json 2>&1 >/dev/null | head -1
! Partly judged: Base UI (src/components/blueprint.tsx:5): usage (every primitive, part and site); states, structure (portals, slots, render props), owned values are not judged yet
$ node ../plumb/dist/cli.js state --json | (facts.libraries.value[0]: id, support, capabilities, usage.files, usage.components; then every site)
base-ui-react partial {"usage":"judged"} 9 {"Checkbox":3,"Slider":3,"Popover":2,"Switch":1,"Tabs":1}
  src/components/blueprint.tsx:56 Switch.Root
  src/components/blueprint.tsx:61 Switch.Thumb
  src/motion/notes/NotePlayer.tsx:59 Slider.Root
  src/motion/notes/NotePlayer.tsx:60 Slider.Control
  src/motion/notes/NotePlayer.tsx:61 Slider.Track
  src/motion/notes/NotePlayer.tsx:62 Slider.Indicator
  src/motion/notes/NotePlayer.tsx:63 Slider.Thumb
  src/motion/source/FilmVolume.tsx:34 Slider.Root
  src/motion/source/FilmVolume.tsx:35 Slider.Control
  src/motion/source/FilmVolume.tsx:36 Slider.Track
  src/motion/source/FilmVolume.tsx:37 Slider.Indicator
  src/motion/source/FilmVolume.tsx:38 Slider.Thumb
  src/pages/MomentPage.tsx:524 Checkbox.Root
  src/pages/MomentPage.tsx:525 Checkbox.Indicator
  src/pages/MotionEntryPage.tsx:532 Checkbox.Root
  src/pages/MotionEntryPage.tsx:533 Checkbox.Indicator
  src/pages/MultiplaneBuilder.tsx:312 Popover.Root
  src/pages/MultiplaneBuilder.tsx:313 Popover.Trigger
  src/pages/MultiplaneBuilder.tsx:324 Popover.Portal
  src/pages/MultiplaneBuilder.tsx:325 Popover.Positioner
  src/pages/MultiplaneBuilder.tsx:326 Popover.Popup
  src/pages/MultiplaneBuilder.tsx:327 Popover.Title
  src/pages/MultiplaneBuilder.tsx:484 Popover.Root
  src/pages/MultiplaneBuilder.tsx:485 Popover.Trigger
  src/pages/MultiplaneBuilder.tsx:499 Popover.Portal
  src/pages/MultiplaneBuilder.tsx:500 Popover.Positioner
  src/pages/MultiplaneBuilder.tsx:501 Popover.Popup
  src/pages/MultiplaneBuilder.tsx:502 Popover.Title
  src/pages/PatternPage.tsx:600 Checkbox.Root
  src/pages/PatternPage.tsx:606 Checkbox.Indicator
  src/pages/StandardsPage.tsx:453 Slider.Root
  src/pages/StandardsPage.tsx:454 Slider.Control
  src/pages/StandardsPage.tsx:455 Slider.Track
  src/pages/StandardsPage.tsx:456 Slider.Indicator
  src/pages/StandardsPage.tsx:457 Slider.Thumb
  src/specimen/CraftSpecimen.tsx:94 Popover.Root
  src/specimen/CraftSpecimen.tsx:95 Popover.Trigger
  src/specimen/CraftSpecimen.tsx:96 Popover.Portal
  src/specimen/CraftSpecimen.tsx:97 Popover.Positioner
  src/specimen/CraftSpecimen.tsx:98 Popover.Popup
  src/specimen/CraftSpecimen.tsx:108 Tabs.Root
  src/specimen/CraftSpecimen.tsx:109 Tabs.List
  src/specimen/CraftSpecimen.tsx:111 Tabs.Tab
  src/specimen/CraftSpecimen.tsx:115 Tabs.Indicator
```
(9 files, 5 primitives, 44 sites; matches the owner's hand count: Slider x3, Checkbox x3, Popover x2, Tabs, Switch.
The doctor table truncates the Libraries cell at its column width; `state --json` carries the full list.)

```
$ node --test --test-concurrency=1 e2e/library-adapters.test.mjs e2e/styling-detection.test.mjs
ℹ tests 25  ℹ pass 25  ℹ fail 0
$ node --test --test-concurrency=1 e2e/release-guards.test.mjs e2e/project-layouts.test.mjs e2e/readiness.test.mjs e2e/onboarding-state.test.mjs e2e/check-cache.test.mjs e2e/cli-setup.test.mjs
ℹ tests 103  ℹ pass 99  ℹ fail 4
  (3 onboarding-state expectations: regenerated, see above; 1 release-guards browser test: Playwright 1248 binary
  not installed, the R6 guard "no file-presence decision ... outside src/project-facts/" passed)
$ node --test e2e/onboarding-state.test.mjs   (after regenerating)
ℹ pass 15  ℹ fail 0
```

Unverified: the full `npm test`; the release-guards browser test (needs PLUMBER_CHROMIUM to a 1243 binary; the
guard this layer cares about, R6, passed).

## Layer 2: Base UI states

Commit: 9f1ee76

What changed
- Contract: `LibraryAdapter.state(attribute, value)` names the state an attribute of the library stands for
  (`data-checked` → `checked`, `data-orientation="horizontal"` → `orientation=horizontal`); a className/style
  function's `state.<key>` asks with `data-<key>`. `base-ui.ts` declares the vocabulary and `capabilities:
  ['usage', 'states']`. The detector records every non-usage capability as `judged` (it runs in analysis).
- `Condition.kind` gains `'state'` (`src/report.ts`, `schema/report.schema.json`); the branch or selector that
  carries it stays beside it, so habits and dedupe keys are unchanged.
- `src/collect/states.ts`: `selectorStates` (attribute selectors in compiled variants and stylesheet rules, through
  the detected adapters), `stateParam`/`branchState` (`(state) => state.checked ? … : …`, `({ disabled }) =>
  disabled && …`, `=== true/false`, `=== 'value'`, `!`), `returns` (expression bodies, and block bodies with `if`
  guarded returns).
- `src/collect/classes.ts`: a className function on a library element is read, every return under the tests above
  it, the parameter shadowed; on a plain element it stays opaque as before. `src/collect/inline.ts`: the same for
  `style={(state) => ({ … })}`. `src/index.ts`: after the declarations are assembled, the selector states of the
  detected libraries are named on each one.

Commands and raw output
```
$ cd ../crafting-ui && node ../plumb/dist/cli.js --json | (declarations in findings with a state condition)
21 declarations with a named state in findings
src/pages/MultiplaneBuilder.tsx:182 color: var(--mpo-ink) → popup-open
src/pages/MomentPage.tsx:524 data-checked:animate-[pass-pop_520ms_var(--ease-bounce)] → checked
src/pages/MotionEntryPage.tsx:508 data-checked:animate-[pass-pop_520ms_var(--ease-bounce)] → checked
src/pages/PatternPage.tsx:604 data-checked:animate-[pass-pop_520ms_var(--ease-bounce)] → checked
src/pages/MultiplaneBuilder.tsx:290 data-[ending-style]:delay-[320ms] → ending-style
src/pages/MultiplaneBuilder.tsx:378 group-data-[ending-style]/pop:[transition-timing-function:cubic-bezier(.5,0,.9,.4)] → ending-style
$ node ../plumb/dist/cli.js explain src/pages/MomentPage.tsx | grep -B4 "state: checked" | head
src/pages/MomentPage.tsx:524:299  data-checked:border-draw  <Checkbox.Root>
  class  border-color: var(--draw)
    selector: .data-checked\:border-draw[data-checked]
    state: checked
$ node ../plumb/dist/cli.js --json 2>&1 >/dev/null | head -1
! Partly judged: Base UI (src/components/blueprint.tsx:5): usage (every primitive, part and site), states; structure (portals, slots, render props), owned values are not judged yet
```
crafting-ui has no `className={(state) => …}` function on a Base UI element (grep `className={(` over its Base UI
files: none), so the function path is proved by the e2e fixture only (`e2e/library-adapters.test.mjs`, "Base UI
states": ternary, destructured `&&`, `=== true`, block body with a guarded return, and a `style` function; plus the
variant, the valued variant and a stylesheet rule).

```
$ node --test e2e/library-adapters.test.mjs
ℹ pass 6  ℹ fail 0
$ node --test --test-concurrency=1 e2e/classes.test.mjs e2e/inline-values.test.mjs e2e/stylesheets-inline.test.mjs e2e/habits.test.mjs e2e/styling-detection.test.mjs e2e/report.test.mjs e2e/cli.test.mjs e2e/onboarding-state.test.mjs e2e/check-cache.test.mjs
ℹ tests 119  ℹ pass 119  ℹ fail 0
```
Unverified: the human one-line finding does not print the state (it prints the class or `prop: value`); the state
is in `--json` (`when`), `--agent`, and `explain`. The browser suites (serve, overlay) were not run for this layer.

## Layer 3: Base UI structure (portals, render prop) in locate

Commit: f3fdcfb

What was found first: locate already lands on the user's JSX for Base UI, both through the stamp (plumb() before
react(): Base UI spreads `data-plumb-source` onto the element it renders, through the portal) and through the owner
stack (unstamped). The probe below ran against the owner's running crafting-ui dev server (pid 64847, :5180, started
before this work; overlay/src/locate.js is unchanged by this layer). So the layer's work is the contract and the proof,
not a locate change.

What changed
- Contract: `LibraryAdapter.structure = { portal, render, role }`: the parts rendered elsewhere in the DOM, the props
  whose element or function replaces the library's element, and what a component is for the craft rules. Base UI:
  `Portal`, `render`, the tooltip/menu/dialog/popover roles that lived in `src/structure/library.ts`.
- `src/structure/library.ts`: `libraryOf` asks the adapters first (through `owns`/`meaning`/`structure.role`); the
  hand-written Base UI entry is deleted. The table stays for libraries without an adapter.
- `UsageSite.structure`: `portal` for a portal part, `render` for an element with a render prop, in `state --json`.
- Support words: `not judged yet: owned values` (the missing list reads the same in every surface).
- Tests: `e2e/library-structure.test.mjs` (new): a real Vite dev server, real `@base-ui/react` popover rendered under
  body, a real headless browser; stamped and owner-stack; `Popover.Popup`, `Popover.Positioner`, `Popover.Trigger`,
  `render={<a …/>}`, `render={(props, state) => <b …/>}` each locate to the user's `src/App.jsx` line:column, and
  `site()` reads the user's classes on each. `e2e/library-adapters.test.mjs` pins the capability and the portal mark.

Commands and raw output
```
$ PLUMBER_CHROMIUM=… node scratchpad/probe-popover.mjs http://localhost:5180   (crafting-ui /primitives, click "Open popover", locate the popup)
[console] [plumb] overlay connected {status: ready, root: /Users/vijaysingh/unlocalhosted/crafting-ui, …}
popup: tag div, stamp src/specimen/CraftSpecimen.tsx:98:15#14a659d7aff7, attrs data-open data-side data-align data-base-ui-focusable data-plumb-source
  locate → { file: src/specimen/CraftSpecimen.tsx, line: 98, column: 15, component: Popover.Popup, via: owner-stack,
             chain: [CraftSpecimen.tsx:98:15 Popover.Popup (usage), Primitives.tsx:180:9 CraftSpecimen, App.tsx:34:38 Primitives], index: 0 }
positioner: stamp src/specimen/CraftSpecimen.tsx:97:13 → locate { file: src/specimen/CraftSpecimen.tsx, line: 97, column: 13, component: Popover.Positioner }
trigger: stamp src/specimen/CraftSpecimen.tsx:95:11, attrs data-base-ui-click-trigger data-plumb-source data-popup-open data-pressed → locate { line: 95, column: 11 }
```
(CraftSpecimen.tsx:98 is `<Popover.Popup className="surface-motion material-raised w-60 …">`, the JSX the user wrote.)

```
$ PLUMBER_CHROMIUM=… node --test --test-concurrency=1 e2e/library-structure.test.mjs e2e/craft-structure.test.mjs e2e/styling-detection.test.mjs e2e/onboarding-state.test.mjs
✔ Base UI stamped: a popup through a portal, a positioner, and render-prop elements locate to the JSX the user wrote
✔ Base UI owner stack: … locate to the JSX the user wrote
✔ structure: the server says what each element is (library, role, literal props, handlers) for Radix, Headless UI, Base UI and shadcn by file name
(craft-structure 3/3, styling-detection 19/19; onboarding-state 3 expectations regenerated for the wording, only facts.libraries differed, then 15/15)
$ node --test e2e/library-adapters.test.mjs
ℹ pass 6  ℹ fail 0
```
Unverified: Next.js hosts for the portal case (the structure test runs Vite only; locate.test.mjs covers Next for plain
elements); `render` as a function that returns a fragment or a component (not an element) is not in the fixture.

## Layer 4: Base UI owned values and providers

Commit: (next layer records it)

What changed
- Contract: `LibraryAdapter.owned = { variables, providers }`: the CSS variables the library sets at runtime and the
  components/parts that configure it. Base UI: `--anchor-width/height`, `--available-width/height`,
  `--transform-origin`, `--popup-width/height`, `--positioner-width/height`, `--active-tab-*`,
  `--collapsible-panel-*`, `--accordion-panel-*`, `--nested-dialogs`, `--input-container-width`, `--slider-*`,
  `--toast-*`, `--scroll-area-*`; providers `*.Provider`, `DirectionProvider`. Capabilities: all four; Base UI is
  now `supported` and prints no notice.
- `src/index.ts`: every `var()` of a detected library's variable is defined (never `existence/dead-var`); a value
  that is exactly that variable gets `Declaration.owned = 'Base UI'` and `isJudged` (`src/rules/families.ts`) skips
  it, so it is never off a scale. `calc(var(--popup-height) + 13px)` keeps its 13px judged. `owned` is in the report
  schema. Providers are marked `structure: 'provider'` in the usage map.

Commands and raw output (crafting-ui, before → after this layer)
```
$ node ../plumb/dist/cli.js --json | dead-var findings            (before)
src/styles/craft.css:274 `var(--active-tab-left)` is never defined
src/styles/craft.css:275 `var(--active-tab-top)` is never defined
$ … findings on craft.css:274/275                                  (before)
provenance/spacing error left var(--active-tab-left) isn't on your spacing scale
provenance/spacing error top var(--active-tab-top) isn't on your spacing scale
$ node ../plumb/dist/cli.js --json | dead-var findings            (after)
dead-var findings: 0
$ … findings on craft.css:274/275                                  (after)
(none)
$ node ../plumb/dist/cli.js doctor | grep -E "^Libraries|^supported|^partial"
Libraries:       Base UI              Base UI: 9 files · Checkbox 3, Slider 3, Popover 2, Switch 1,…
supported   Tailwind 4:        package.json:24   judged
supported   Base UI:           src/comp…nt.tsx:5 usage (every primitive, part and site), states, st…
$ node ../plumb/dist/cli.js 2>&1 >/dev/null | head -1
(no "Partly judged" line any more)
$ state --json → facts.libraries.value[0]
supported {"usage":"judged","states":"judged","structure":"judged","owned":"judged"}
src/pages/MultiplaneBuilder.tsx:324 Popover.Portal portal · src/pages/MultiplaneBuilder.tsx:499 Popover.Portal portal · src/specimen/CraftSpecimen.tsx:96 Popover.Portal portal
```
Two false findings on the owner's own app are gone (`--active-tab-left/top`, which Base UI's Tabs.Indicator sets).

```
$ node --test e2e/library-adapters.test.mjs
ℹ pass 7  ℹ fail 0
$ node --test --test-concurrency=1 e2e/onboarding-state.test.mjs e2e/styling-detection.test.mjs e2e/families.test.mjs e2e/report.test.mjs e2e/classes.test.mjs
ℹ tests 51  ℹ pass 51  ℹ fail 0   (after regenerating the three state expectations, facts.libraries only, and pinning Base UI as supported in styling-detection)
```
Unverified: Base UI prop defaults (`sideOffset` and the like) are props, not CSS; plumb judges CSS, so nothing is
flagged there and nothing was added. The variable list is from Base UI's docs as remembered, not generated from the
installed package; an undocumented `--*` the library sets would still read as the author's.

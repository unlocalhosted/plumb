# Library adapters: result

Status: in progress, 2026-10-29. One section per layer; each has the commit, what changed, the commands run and
their raw output, and what is unverified. Owner's goal: full support for Base UI, Radix and shadcn/ui through one
`LibraryAdapter` contract (`src/project-facts/libraries/adapter.ts`), support derived from the capabilities an
adapter implements and that ran, never written by hand.

## Layer 1: adapter contract, derived support, real usage map

Commit: 99d10cb

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

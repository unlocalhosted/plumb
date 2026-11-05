# Changelog

## 0.4.0 · 2026-11-06

Everything since 0.3.0, as a person using it sees it.

- **Alt+click finds the line on Next.js.** `withPlumb` now stamps every DOM tag of your JSX with its file, line and column in development, on webpack and Turbopack, server components included. On tailwindcss.com the share of elements found went from 15–40 % to 89–98 %, and server components from none to 97 %.
- **Stamping is no longer optional.** On Vite, `plumb()` after the plugin that compiles JSX stops the dev server and names the line to move. On Next, a config that keeps the loader out stops at config load with the fix. A page whose elements carry no stamp says so in the overlay ("Source stamping isn't running") and Plumber refuses rather than guesses. `plumber doctor` exits 1 until it is fixed.
- **Stamps never break a library.** Only DOM tags get the attribute; component tags get nothing, so a component that rejects extra props (Headless UI's `Menu`) renders as it does without Plumber. The page with stamps is the page without them, apart from the attribute.
- **Elements a library drew answer with your usage.** An icon's `<svg>` and every `<path>` in it, a dialog in a portal, `next/link`'s `<a>`: the answer is the line where you used the component, with the props you can change there (`className`, `tone`, `variant`). It is accepted only on an exact JSX opening of that file version, never a nearby line; otherwise Plumber says the element is not in your code and which library drew it.
- **Your code, in any repository shape.** One rule decides what is yours: inside the repository and neither installed nor generated. Workspace packages linked through `node_modules`, tsconfig path aliases, `file:` and `link:` packages, vendored folders and a `src/features/build` folder are yours; installed packages, the pnpm store and Yarn's cache are not. Stamps name files from the repository root, so two apps sharing one `packages/ui` file write to one place.
- **A click right after load answers.** The overlay is ready only once React has hydrated the page (and Next has synced), and a click before that waits, then answers; a page that never hydrates says "Still loading". A stamp that can't be resolved is said as a refusal, never replaced by a guess.
- **Next 15 and monorepos.** Plumber's routes answer on Next 15 with webpack, including a `next.config` that exports a function. With no `source` configured, everything the rule calls yours is tracked, so a `components/` folder at the app root (as in many Next apps) is read and editable; `plumber init` no longer writes `source`.
- **Writes are safe under hot reload.** A write replaces the file whole through a temporary file, so a watcher never reads half of it; every write and undo checks the file first and refuses if your editor or formatter changed it; a retry after a dropped response returns the first result instead of writing twice; a question asked before a hot update is asked again after it, on Vite and Next; a dev server restart is a named failure, not a hang; Vite hears each write at once.
- **The page about your project** leads with what to stop first: the three biggest causes in the terminal's own words, with their places; the Specimen shows every size of your theme with the sizes typed by hand that should become it.
- **Craft.** `plumber craft --scope <selector>` reads one element the way Alt+click does. Optical centre, overshoot and icon-on-capitals give fixes you can take; colours in oklch, oklab and `color(srgb)` are read; fixes to concentric corners, card padding, trim leading, hairlines and the elevation ladder.
- **Compatibility and performance** are in the README, as the locate bench measured them.

### Upgrading from 0.3.0

- Remove `stamp: false` from `plumb()` and the second argument from `withPlumb()`; both are gone. Stamping is always on in development and never in production builds.
- On Vite, put `plumb()` before `react()` in `plugins` (`plumber install --overlay --write` does it).
- On Next, if your `next.config` sets `webpack`, it must be a function that returns the config it is given.

## 0.3.0 · 2026-11-04

Everything since 0.2.0, as a person using it sees it.

- **Alt+click opens the element's card.** It reads only that element. Words open a value card with a spring drag and the hierarchy marked on the scale; layout and spacing are edited on the element itself; Shadow and Motion are shown as the element itself and tuned by handles. A fix is written the moment it is taken, with its own Undo, and only the fix in hand is lit. **Tidy this card** previews a card's hierarchy fixes at once and writes them in one go with one Undo.
- **Clean up this page.** Four passes in the panel: text, spacing, colour and icons. Each works inside the app's own scale and keeps what is already on it; refining the scale is opt-in. A write that partly lands is a step, kept with its Undo across its reload.
- **History is a timeline.** A tick per change and a segment per step; pointing at a change outlines its elements on the page; **Go back to here** undoes the rest in one write. Every change a write makes is traced, so any one change, or a group, can be undone on its own.
- **One bar for Blueprint**, each key on the action it presses; the dock at rest is its mark. Blueprint counts every place in the files the page renders, shown or not, reading the page from source once.
- **Causes.** Findings are grouped by what the author meant, across rules, in `check --json` and on the server. Every cause ends in an action: accept, adopt a default, or name the token that gives a value a class; `POST /__plumb/apply-all` takes a whole cause, written per file.
- **Recipes.** Shadow and motion values are read from any source into one model, mapped onto the project's own, and written in its idiom. A pick can add its class at a component usage that forwards `className`.
- **The type system a codebase reaches for.** Text is measured on every route; `POST /__plumb/system` proposes roles, bundles, cost and the write, and Blueprint offers the text styles the page reaches for. Colour is resolved by role on the signed-off colour system.
- **Libraries.** Base UI, Radix and shadcn adapters: their own variables are never dead or drift, portals, `asChild`, Slot and render props are followed, and declarations name the state they apply in. Detectors for Nx, Lerna, Deno, Turborepo, clsx, tailwind-merge, Ark UI and React Aria. styled-components, Emotion, StyleX and Linaria are named as unsupported; a mixed app still has its Tailwind judged.
- **Craft rules.** Every rule names the laws of UX it measures. New: an elevation ladder (a shadow a hair off a level the page uses more takes that level) and four spacing rules (heading lead, pair spacing, card optical padding).
- **CLI.** `npx plumber` opens a page about your project; with no browser it names the 3 biggest causes and one next step. `npx plumber --yes` sets up with no page and no question. A problem is one line for what is wrong and one for the fix; `plumber doctor` is three lines (`--verbose` keeps the detail). A finding line names the state it applies in.
- **Writes go where the classes are written**, never the shared component's line; a usage reaches its component through the project's own module resolution (barrels, aliases, re-exports). A Tailwind v4 `--spacing` multiplier gives the spacing scale its steps only when the project defines `--spacing` itself.

## 0.2.0 · 2026-10-28

Everything since 0.1.0, as a person using it sees it.

- **The fix panel.** Blueprint (Alt+B) now shows only heat on the page; the panel docked at the bottom holds one cause at a time (a class under a rule, every place it is used) with its options drawn as what they are. ↑ ↓ try an option on every place at once, Enter takes it, A applies what was taken in one guarded write per file, Esc puts it down. The selection ring, the chooser card, the Changes sidebar and the first-use walkthrough are gone.
- **The craft engine.** Seventy-odd rules a good designer would check, measured on the running page: button sides, concentric corners, inner and outer spacing, opacity-faded text, APCA contrast, line length, tabular numbers, widows, hit targets, half pixels, hairlines, shadows, z-index, motion, and the page's own habits (weights, greys, rhythm). Each finding has a fix the engine has already tried on the page, or says why there is none. Advisory rules are notes, never failures.
- **Pairs, probes, structure, the judge.** The page is also read in dark mode, on touch, hovered, pressed, with a toggle flipped, a menu open, a tooltip shown, the keyboard used, a spinner running (`--no-pairs`, `--no-probe`, `--probe drag`, `--probe-budget`). The source index names each element's component, library and role, so a fix can be a prop (`delayDuration={500}`). `--judge` asks a vision model about findings a rule would not stand behind, and keeps every answer under `.plumber/judge`.
- **`plumber craft`.** The craft engine headless, over a dev server's routes: text, `--json`, `--sarif`, exit 1 on findings; for CI.
- **The craft spec and `plumber spec`.** Every rule reads its numbers from one standard. The `craft` config key sets a preset (strict, balanced, relaxed), values per principle and rule, rules on or off and their tier, and the token policy. `plumber spec` prints what is in effect and where each value came from.
- **New tokens from the page.** When the theme has no step that settles a rule, the fix is a new token named and valued from the spec; taking it writes the token into the theme (in its own shape: `@theme`, `@theme inline`, `:root`) and swaps the class, with two undo handles. `POST /__plumb/token`.
- **Onboarding.** `plumber state` names a project's starting point from evidence. `plumber propose` harvests the values in use, clusters them into scales, names the steps and shows what each takes over; `propose --write` writes them to the theme and imports a new file. `plumber init` asks one question per family, writes the theme first, then the config, then the baseline. `plumber propose --decline` keeps a value out of the proposal.
- **Reading and editing.** Alt+click reads an element; Alt+two-finger scroll walks the tree; double-click edits words in place and writes the string that renders them (`text-at`); inline style values get token edits; every write returns an undo handle, undone from the dock (`GET /history`, `POST /undo`); the element props API (`GET /props`, `POST /set`); one apply per element and per file (`POST /swaps`).
- **The look.** Registration: heat where the page is off, fixes that glide and snap, all-clear, magnetism; the pastel visual language with one meaning per colour and one pattern per building block; the chrome keeps clear of what you work on.
- **Hosts and performance.** The blueprint reads a view as one batch (`POST /batch`); the Next.js host keeps up on large pages; the demo site has `/?craft`, `/?rules`, `/?team` and the fix-in-place states sheet.
- **Guards.** A token value is one CSS value: nothing that could end the declaration, open a comment or leave a string open is written to a theme file.
- **Package.** `CHANGELOG.md` ships; `sideEffects: false`; `next`, `tailwindcss` and `playwright` are declared optional peers.

## 0.1.0 · 2026-10-14

First public release.

- **CLI.** `plumber` reports drift from a React and Tailwind v4 (or plain CSS) design system across spacing, colour, radius, type, motion, elevation and z-index, plus habits, ownership and imitation; `init`, `doctor`, `baseline`, `accept` and the ledger make CI fail only on new drift.
- **Symbolic inline reading.** Inline style values written in code are read, not just matched: constants fold across imports, finite outcomes are judged one by one, a token beside a runtime number is judged by the token, and a constant times a runtime number is judged by its step.
- **Overlay.** Hold Alt over any element of your running app for its reading; pick a token, preview it, and write it to source. Vite plugin, Next.js loader, and `plumber serve` for anything else.
- **Blueprint mode.** Alt+B turns the view into a wireframe of the running page: greeked words, token-named dimensions and rails, amber breaks with the nearest token ghosted beside them, a count per element, a red wash by distance from the system, a note on point, hold D for the view as designed, and a title block with the causes of the drift by count.
- **GitHub Action**, SARIF, agent surfaces and the packed walkthrough.

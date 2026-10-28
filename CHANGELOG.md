# Changelog

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

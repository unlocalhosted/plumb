# React Plumber: product facts for a homepage

Collected 2026-11-03 from the repo at /Users/vijaysingh/unlocalhosted/plumb (branch main). Nothing under `site/` or `docs/homepage-skill/` was read. Source format is `path:line` or the command run. "(inferred)" marks anything I concluded rather than read. All paths are relative to the repo root.

## 0. Naming (read this first)

- The product is "React Plumber". The npm package is `@unlocalhosted/react-plumber` (`package.json:2`), version 0.2.0 (`package.json:3`). The brief called it `@unlocalhosted/plumb`; that is not the current package name.
- The only binary is `plumber` (`package.json:19-21`). The repo/GitHub name is still `unlocalhosted/plumb` (`package.json:104-106`; `git remote -v` -> https://github.com/unlocalhosted/plumb.git).
- Legacy names remain on purpose: Vite export `plumb()`, Next exports `withPlumb` / `createPlumbRoute` / `PlumbOverlay`, overlay routes `/__plumb/*`, GitHub Action `unlocalhosted/plumb@<sha>`, comment marker `<!-- plumb-summary -->` (`README.md:345-347`). Config is `plumber.config.ts`, state dir `.plumber/` (`README.md:338-345`).
- Shell/CLI version string: `node dist/cli.js --version` -> `0.2.0`.

## 1. What it is

In one paragraph: React Plumber finds where a React + Tailwind UI has drifted from its own design system, then lets you fix it on the running page. It compiles every styling choice (utility classes, arbitrary values, stylesheet rules, `@apply`, inline `style` objects) to the CSS it produces, using the project's own Tailwind, and judges those declarations against the project's tokens, component contracts and written habits (`docs/DESIGN.md:7`, `README.md:29,41`). It also measures the rendered page for craft problems a designer would check (button sides, nested corners, faded text, line length, tap targets) (`README.md:29`). It has four surfaces: a CLI (`plumber`), a dev-only in-browser overlay (Alt+B "Blueprint" fix panel that writes the class edit into your JSX), a CI mode (`plumber check`, `plumber craft`, a GitHub Action, SARIF) and instruction files for coding agents (`README.md:31-34`).

Words the docs use for the category / what it is:
- Tagline: "Find where your React + Tailwind UI drifts from its design system, and fix it on the running page." (`README.md:3`)
- package.json description: "Find design drift: judge every styling choice by the CSS it compiles to, against your team's own decisions." (`package.json:4`)
- Keywords: tailwind, design-system, design-tokens, lint, css, react, drift, ai-agents, tailwind-v4, vite-plugin, nextjs, design-drift, craft, overlay, ui-audit (`package.json:108-123`)
- Help banner: "design decisions, habits and ledger" (`src/cli.ts:39`)
- The design doc calls it "a standalone CLI for Tailwind v4, CSS and React projects" that "checks that UI code uses the design decisions a team has made" (`docs/DESIGN.md:3,7`).
- Vision doc frames the overlay as a "live editor for any React project" and later "a prototyping tool" (`docs/VISION.md:1,3`).
- ROADMAP self-description: "a judge with no courtroom" (before the overlay existed) (`docs/ROADMAP.md:7`).
- Internal vocabulary that the copy guide says must NOT reach users: drift, cause, finding, verdict, site, craft rule, tier (`docs/copy/voice.md`, rule 7 table). Preferred user words: "not on your scale / not in your theme", "one fix (that covers N places)", "problem", "apply", "where it is in your code". (Note the README itself leads with "drift"; see section 12.)
- Name origin: "the builder's line that shows whether a wall is vertical" (`docs/DESIGN.md:3`).

## 2. Who it is for

- Front-end teams with a Tailwind v4 design system: "Design systems drift one `p-[13px]` at a time." (`README.md:29`)
- The ROADMAP names five people: design-system owner, product engineer, designer, PR reviewer, AI agent; "The agent is the main author of UI code now, and it is the user React Plumber was designed for." (`docs/ROADMAP.md:45-147`, quote at ~129). This is an internal planning doc, not marketing.
- Designer use is via the browser overlay: "The designer does not run CLIs and should not have to." (`docs/ROADMAP.md:95`)
- CI/approval role: ledger growth needs a listed reviewer (design owner) to approve (`README.md:330`; `docs/ROADMAP.md:51-62`).
- Teams without a system yet: `plumber state` / `propose` / `init` start from "bare, half a system, a system" (`README.md:52-54`).
- Requirements implying audience: React 18.2 or 19, Node >= 22.18 (`package.json:57-58,78`).

## 3. The problem and what people do today

As the docs state it:
- Problem: drift accumulates one arbitrary value at a time (`p-[13px]`) (`README.md:29`).
- "Linters see strings; React Plumber sees the page." (`README.md:29`) The design doc compares to `@shadcn/lint` and Orbit: judging the compiled declaration instead of the class spelling puts plain CSS, `@apply`, named utilities and inline styles under one set of rules (`docs/DESIGN.md:9`). A raw `@shadcn/lint` run over MetalUI gave "4,218 findings, roughly 95% noise" (`docs/DESIGN.md:5`; this is a one-run internal probe, `docs/research/shadcn-lint-probe.md`, not read in full).
- What people do today (stated in ROADMAP section 2): design-system owner reads a 400-line diff hunting for `--spacing-13`; designer asks via Slack for a new spacing step and audits "by eye"; nobody notices drift in a terminal, only in the running browser (`docs/ROADMAP.md:9-20,51,113,117`). Agents invent tokens, guess spacing steps and loop without terminating (`docs/ROADMAP.md:147`).
- Existing tools it positions against: react-grab (hover + Cmd+C copies element + source), react.doctor (0-100 score, remote); ROADMAP lists what NOT to copy: "the remote score, inline suppressions, the 870-rule sprawl, the source-available licence" (`docs/ROADMAP.md:11-43`). (Their facts come from the ROADMAP's own research, not verified by me.)
- Legacy-codebase problem: adopting a linter means paying all old debt first. The ledger answers it: "CI fails only on new drift" (`README.md:33`; `docs/ROADMAP.md:32`).

## 4. Commands and flags

Declared in `src/cli.ts:39-87` (help text) and `src/cli-flags.ts:1-31` (accepted flags per command; "New flags must be opted into here; none inherit a universal fallback"). Exit codes: 0 ok, 1 failing findings, 2 usage/config error (`src/cli.ts:86`). Global: `--root <dir>` (default cwd), `--config <path>`, `--json`, `--verbose`, `--help`, `--version` (`src/cli-flags.ts:4-6`). Typo suggestions ("Did you mean ...?") come from `closeName` (`src/cli-flags.ts:34-52`).

"Writes?" is what I verified in code unless noted.

| Command | What it does | Writes files? |
|---|---|---|
| `plumber` / `plumber check` | Report drift. Flags: `--base <ref>`, `--changed`, `--agent`, `--sarif`, `--format github`, `--strict-ledger`, `--watch`, `--all`, `--broken`, `--family <name>`, `--file <glob>`, `--rule <id or category>`, `--new`, `--debt` (`src/cli-flags.ts:8`; `README.md:175-186`) | No project files. Writes only a git-ignored cache in `.plumber/cache/` (self-written `.gitignore` containing `*`) (`src/paths.ts:20-26`; verified: first run on a copied fixture created only `.plumber/cache/**`, see section 6). |
| `plumber state` | Names where a project starts: bare, half a system, a system (`README.md:52,59`) | No (read-only; `mutating` list excludes it, `src/cli.ts:130`) |
| `plumber propose [--family X] [--write] [--decline scale=value] [--yes]` | Harvest spacing/colour/radius/type values in use, cluster into a scale, name the steps, show what each would take over (`README.md:53,59`) | Only with `--write`: writes tokens into your theme in its existing shape (`@theme`, shadcn `@theme inline`, or `:root`) and imports a new file from your stylesheet (`README.md:59`; `src/cli-flags.ts:11`) |
| `plumber init [--yes] [--family fam=keep\|skip] [--preset name\|none] [--force]` | Asks one question per family; writes theme first, then `plumber.config.ts`, then baseline; turns on four habits (hover-gate, focus-outline, transition-named, no-ease-in) (`README.md:54,59,188`; `src/adoption/init.ts:30`). Refuses an existing config without `--force`, which prints the replacement diff first (`README.md:188`). Without a terminal and without `--yes` it never writes into the theme unasked (comment `src/cli.ts` init block, ~L319-330) | Yes: theme, `plumber.config.ts`, `.plumber/ledger.jsonl` |
| `plumber baseline [--force]` | Record today's findings as debt so only new drift fails (`README.md:55,186`) | Yes: `.plumber/ledger.jsonl` (`src/ledger/store.ts:8`; in `mutating`, `src/cli.ts:130`) |
| `plumber accept <key> --why "..."` / `accept --rule R --site file:line --why "..."` | Record a reasoned exception (`src/cli.ts:~60-61`) | Yes: ledger |
| `plumber accept-decisions [--why]` | Accept new/changed tokens as decisions | Yes: ledger |
| `plumber ledger [--ratchet] [--prune] [--rebase]` | Maintain the ledger (ratchet down fixed debt, prune stale, rebase) | Yes: ledger |
| `plumber show <key\|rule>` / `plumber why <file:line>` / `plumber explain <file>` | Explain which rule/token/ledger entry applies; list every class/rule/inline style in a file and the CSS it compiles to (`skills/plumber/SKILL.md:46-50`) | No |
| `plumber try [--lang tsx\|css] [--as path] [--agent]` < snippet | Judge a snippet from stdin before writing it. "It writes nothing. Exit 0 means the snippet uses the system." (`skills/plumber/SKILL.md:17-21`) | No |
| `plumber decisions [--family X]` | List the tokens (decisions) with reasons | No |
| `plumber habits`, `plumber presets`, `plumber imitation --suggest` | List habits (7 shown on a fixture: hover-gate, focus-outline, transition-named, no-ease-in, logical-inline, viewport-dynamic, safe-area-fallback; `node dist/cli.js habits --root fixtures/tailwind-min`); presets; hand-built copies of components | No |
| `plumber spec [--rule id]` | Print the craft spec in effect and where each value came from (`README.md:114`) | No |
| `plumber craft --url <dev server> [--routes ...] [--json] [--sarif file] [--timeout ms] [--no-pairs] [--no-probe] [--probe drag] [--probe-budget n] [--judge]` | Opens each route in headless Chromium (Playwright, installed separately), reads every element like the overlay, reports craft problems with the same words and fix; tries dark mode, touch, hover/press, toggle, menu, tooltip, keyboard, spinner. Advisory findings never fail; others exit 1. `--sarif` writes SARIF 2.1.0 (`README.md:120`) | Only `--sarif <file>` and, with `--judge`, answers cached under `.plumber/judge` (`README.md:120`). `--judge` calls Anthropic's API with `ANTHROPIC_API_KEY` and is never run when `CI` is set (`README.md:120`; `src/craft-judge.ts:8`) |
| `plumber census --url ... [--routes] [--max n]` | Read a running app's pages (help line `src/cli.ts:~72`). Undocumented in README (inferred: diagnostic/count tool) | Not verified |
| `plumber install [--agent name ...] [--list] [--ci] [--hooks]` | Writes the packaged skill into every detected coding agent's format; `--ci` adds the GitHub workflow if absent; `--hooks` only the post-edit hooks; `--list` previews (`README.md:192-216`; `src/adoption/install.ts:158-212`) | Yes (agent files, hooks, workflow). Prints every write; idempotent ("Kept <file>" when unchanged) (`src/adoption/install.ts:201-204`) |
| `plumber install --overlay` | Prints the Vite/Next wiring detected from package.json. Default writes nothing (`src/adoption/install.ts:120-122,154`). Cannot be combined with `--hooks/--ci/--agent` (`src/cli.ts:162`) | No |
| `plumber install --overlay --write` | Edits `vite.config.*` (adds `plumb()`), or for Next: `next.config.*` (`withPlumb`), root layout (`<PlumbOverlay />`), and creates `app/%5F_plumb/[...path]/route.plumb.ts`. Plans and validates all files before writing; refuses symlinks escaping the root, unparseable files, or an existing differing route file; prints a minimal diff per file (`src/adoption/overlay.ts:~245-302`). Other hosts: "--write supports Vite and Next.js App Router projects" (`src/adoption/overlay.ts` writeOverlay) | Yes (those files only) |
| `plumber doctor` | Checks Node (>= 22.18), config, Tailwind, CSS entry, ledger, cache; each line carries a fix (`src/adoption/doctor.ts:31-45`; `README.md:59`) | No |
| `plumber fix <id> [--yes]` | Apply one of doctor's diffs after confirmation (`[y/N]` prompt) (`src/cli.ts:~295-314`) | Yes, after confirm |
| `plumber agent-docs` | Writes `PLUMBER.md` (project token reference + habits) and prints a block to paste into AGENTS.md/CLAUDE.md (`README.md:212,297`; `src/cli.ts:454`) | Yes: `PLUMBER.md` |
| `plumber report [--markdown] [--since ref]` | Trend report. Without `--since` it "Wrote plumb/report.json and appended to plumb/trend.json" (`src/cli.ts:~437-441`) | Yes (`plumb/` dir); with `--since` prints only (`src/cli.ts:340-344`) |
| `plumber parity <tokens.json> [--format dtcg] [--strict]` | Compare design-token JSON (DTCG) with the CSS theme | No |
| `plumber serve [--port n \| --stdio] [--overlay --origin url [--served-root dir]]` | Warm daemon; with `--overlay` serves the overlay for hosts other than Vite/Next. Existing CLI commands use a running one automatically (`skills/plumber/SKILL.md:55`) | Writes discovery file `.plumber/serve.json` (port + token) (`src/cli.ts:~390`; `README.md:281`) |

Important flag semantics (README + code):
- `check` default report: token coverage lowest first, then commands; with a ledger it lists only new sites (up to 20 finding groups) plus a known-debt count (`README.md:173`).
- With no config and no ledger a check exits 0 and suggests `plumber baseline` (`README.md:186`; verified by running).
- `--changed` = tracked files changed vs HEAD (incl. staged) plus untracked; `--base` compares against a ref; both still analyse the whole project (`README.md:293`).
- `--agent` prints fix instructions; loop ends at `0 new`; unresolved choices are `NEEDS-DECISION` (`README.md:297`).
- `--strict-ledger` treats ledger/config growth in the working tree as failure (`docs/DESIGN.md:~1.5`; `README.md:299`).
- Machine output (`--json`, `--agent`, `--sarif`, `--format github`) ignores human detail filters; formats are mutually exclusive (`README.md:186,293`).
- Env: `PLUMBER_*` vars, with `PLUMB_*` fallback (`src/paths.ts:19`); `PLUMBER_CHROMIUM` = Chrome path for craft (`README.md:120`); `PLUMBER_POLLING` for the analysis watcher (`README.md:247`); `PLUMBER_CACHE_DIR` (`src/paths.ts:20`); `NO_COLOR` respected (`README.md:184`).

## 5. What it supports

Requirements
- Node >= 22.18 (`package.json:78`; doctor enforces it, `src/adoption/doctor.ts:38`).
- React `^18.2.0 || ^19.0.0` (peer, optional) (`package.json:~82`). A React 18 fixture exists (`package.json` devDeps `plumb-react18-fixture`).
- Tailwind `^4.0.0` peer, optional (`package.json:~85`). **Tailwind 3 is not judged**: code marks it `unsupported` ("plumb judges Tailwind 4", next step `npx @tailwindcss/upgrade`) and a declared-but-not-installed Tailwind is refused ("Tailwind is not installed. -> npm install"; reproduced) (`src/project-facts/styling/tailwind.ts:24-27,46-48`). The installed version wins over the declared range (same file, L25).
- Playwright >= 1.40 (optional peer), only for `plumber craft` (`package.json:~84`; `README.md:120`).

Hosts (for the overlay)
- Vite `^6 || ^7 || ^8` via `plumb()` from `@unlocalhosted/react-plumber/vite`; must be listed before `react()` (`package.json:~86`; `README.md:68-75`).
- Next.js `>=15`, App Router, via `withPlumb`, a `route.plumb.ts` route and `<PlumbOverlay />`; webpack and Turbopack both addressed in tests/diag logs (`docs/VISION.md:21`; `docs/verification/turbo-*` file names; `README.md:249-268`).
- Anything else (any dev server): `plumber serve --overlay --origin <url>` and a printed `<script>` tag with a per-run token (`README.md:272-281`).
- Docker/WSL: polling config for Vite's watcher documented (`README.md:232-247`).
- Monorepos: Vite uses its dev-server root, Next the app cwd; edits stay relative to Plumber's root (`README.md:270`).

CSS systems (from detectors in `src/project-facts/styling/`)
- Tailwind 4: supported (tailwind.ts above). `@theme`, shadcn `@theme inline`, `:root` custom properties, DTCG `*.tokens.json` as token sources (`docs/DESIGN.md` section 2.2; `README.md:59`).
- Plain CSS: supported (`plain-css.ts:15`, `support: 'supported'`).
- PostCSS: partial (stylesheets as authored) (`postcss.ts:6`).
- CSS Modules: partial (declarations in `*.module.css` read as stylesheets; class names via the styles object not traced to elements) (`css-modules.ts:6`).
- Not judged ("unsupported", found and skipped, with a "nothing to do" note): Emotion, styled-components, Sass/SCSS, Less, vanilla-extract, StyleX, Panda CSS, UnoCSS, Linaria (the respective `support:` lines in `src/project-facts/styling/*.ts`). Sass and Less: it still reads the `.css` files it finds.
- Class helpers read through: clsx/classnames, cva, tailwind-variants, tailwind-merge (`src/project-facts/libraries/index.ts:35-42`); config key `classHelpers` for custom ones (`README.md:169`).
- Component libraries detected: Radix, Base UI, Headless UI, React Aria, Ark UI, shadcn/ui, daisyUI (classes-styled, judged); MUI, Chakra, Mantine ("own" styles, not judged) (`src/project-facts/libraries/index.ts:28-40`). Per-library depth varies (`derivedSupport`, `support.ts:~37-52`): a library is "supported" only if every capability ran, else "partial".
- Judged value families: spacing, colour, radius, type, motion, elevation, z-index; also "size" and "opacity" decisions are inspectable but not judged (`README.md:41`; `BENCHMARK.md:1214`).
- Judges more than values: team habits, component overrides (ownership), hand-built copies of components (imitation) (`README.md:41`), dead classes/variables, existence (classes that compile to nothing) (`BENCHMARK.md:1228-1229`).

## 6. Safety facts (each with proof)

1. First run is read-only for your source and exits 0.
   - README: "`npx plumber` report drift; exits 0 with no config" (`README.md:51`); "With no config and no ledger, a check exits 0 and suggests `plumber baseline`" (`README.md:186`).
   - Proof I ran: copied `fixtures/tailwind-min` to the scratchpad, symlinked node_modules, ran `node dist/cli.js --root .` -> output "This is your first run, so all of this counts as new...", `exit=0`, 0.2s (0.43s wall with cache redirected). Diffing the file list before and after with `PLUMBER_CACHE_DIR` redirected: no new files in the project. Without the redirect it created only `.plumber/cache/**` (12 files incl. `.plumber/cache/.gitignore` = `*`). So: nothing in `src/`, no config, no ledger written, but a git-ignored cache folder appears in the repo.
   - Caveat: in a project with no Tailwind installed, `plumber` exits 2 ("Tailwind is not installed.") rather than 0 (reproduced on an un-installed fixture copy).
2. Baseline: only new drift fails.
   - `README.md:33,55`; `plumber baseline` writes `.plumber/ledger.jsonl` (`src/ledger/store.ts:8`). Verified benchmark: MetalUI default ledger "5743 entries, 3910 debt obligations, 0 new" and "baseline and check both exit 0" (`BENCHMARK.md:1216,1129`).
   - Exceptions need a reason: `plumber accept ... --why`; CI blocks ledger growth until a listed reviewer approves, via GitHub Action `ledger-approvers` (`README.md:330`). Fork PRs and `pull_request_target` caveats documented (`README.md:332`).
   - No inline suppression syntax by design: "Exceptions live in one file that CI treats as a decision change" (`docs/DESIGN.md:1.5`).
3. Overlay is dev-only; production carries no bytes.
   - "The overlay lives only in development: production builds carry no script, no stamps and no server routes." (`README.md:77`)
   - Code: Vite plugin is `apply: 'serve'` unless the explicit `demo` option is set (`src/hosts/vite.ts:100`); source stamping only in dev; Next: production and `output: 'export'` builds never discover `route.plumb.ts` and `<PlumbOverlay />` renders nothing and imports no Session code (`README.md:268`).
   - Exception: an undocumented-in-README `demo` option on the Vite plugin stamps production JSX and mounts the overlay for a static demo; "Ordinary production builds still contain no React Plumber client or stamps" (`src/hosts/vite.ts:32-34,169`). Do not claim "impossible to ship"; claim "off unless you opt in to a demo build" (inferred wording).
   - Overlay API needs a per-process token (`x-plumb-token`); the public client module contains no token; CORS only for the configured origin (`README.md:268,281`). Server listens on 127.0.0.1 (`src/cli.ts:~390` message "listening on http://127.0.0.1:...").
4. What it changes in your repo (complete list I found).
   - Always: `.plumber/cache/` (ignored by its own `.gitignore`).
   - On request: `.plumber/ledger.jsonl` (baseline/accept/ledger/init), `plumber.config.ts` (init), theme CSS (init/propose --write, fix panel "new token"), `PLUMBER.md` (agent-docs), agent instruction files and hooks (install), `.github/workflows/plumb.yml` (install --ci), vite/next config + layout + route (install --overlay --write), `plumb/report.json` + `plumb/trend.json` (report), `.plumber/judge` (craft --judge), `.plumber/serve.json` (serve).
   - From the page, only the class/JSX/string edit you take, nothing else.
5. Writes from the overlay are guarded.
   - "Every write is checked against the file on disk: the file's hash, that it still parses, that the class is still there as written. A stale file is refused with 'This file changed after we checked it', never overwritten." (`README.md:105`)
   - "React Plumber writes only to a position it has proven... When it can't prove a position, it says why instead of guessing." (`README.md:109`); same principle: "Exactness" (`docs/VISION.md:9`).
   - Each write returns an undo handle; "one guarded write per file, undoable from the dock" (`README.md:99,105`).
   - A theme-token value cannot contain anything that could end the declaration, open a comment or leave a string open (`CHANGELOG.md:17`).
   - Edits land in place, so HMR picks them up (`README.md:105`). Under Vite one Apply holds hot updates and reloads once; Next reloads per file (`README.md:268`; `src/hosts/vite.ts:~44-52`).
6. Agent guard rails: the shipped skill tells agents never to edit config/ledger/theme to pass, never to run accept/baseline unless asked, never to invent `p-[13px]` (`skills/plumber/SKILL.md:40-44`). The hook flags ledger growth (`--strict-ledger`) (`README.md:299`). Hooks only report; "they do not undo edits" (`README.md:299`).
7. The vision model in `craft --judge` is opt-in, only gets crops of findings a rule would not stand behind, and never runs when `CI` is set (`README.md:120`; `src/craft-judge.ts:8`).
8. No telemetry statement: not found in the docs (I did not audit the code for network calls other than `--judge`). Do not claim "no telemetry".
9. Frozen-source proofs: `bench/apps/readonly.mjs` blocks writes to original app repos during overlay verification; `docs/verification/verify-frozen.proof.json` and `verify-writes.*.log` exist (files seen, contents partially read).

## 7. What the overlay does on the page (user's point of view)

Setup: `npx plumber install --overlay --write` (or add `plumb()` to Vite config before `react()`), start the dev server as usual (`README.md:63-77`). A dock sits bottom right with a mark and one line saying what it is doing, plus a `?` button (`overlay/src/widget.js:13`; `overlay/src/help.js:12-14`).

Reading (hold Alt) (`README.md:79-86`; `overlay/src/help.js:23-30`)
1. Hold **Alt**: the element under the pointer is outlined, with its component name and how many values are off the scale.
2. **Alt + click**: pins a reading: the exact JSX that made the element, each off-scale value with fitting tokens, and craft problems on it.
3. **Alt + two-finger scroll**: up to parent, down to child.
4. **Double-click** words: edit in place; **Enter** or click away writes the string into source; **Esc** reverts. **Alt + double-click** reaches text inside a button, card or link.

Blueprint (Alt+B) (`README.md:88-109`; `overlay/src/help.js:31-38`)
1. Press **Alt+B**. The page dims; heat glows where the page is off: an amber break on the geometry of each drift with the nearest token ghosted beside it, plus craft problems measured on the page. The page is inert.
2. The **fix panel** docks at the bottom. Its unit is a "cause": one class under one rule, with every place it is used. One decision moves every place.
3. **Click** anything (or Enter): the first cause is held with the class, what is off in words, its places, and options drawn as what they are (padding as green hatch, margin as orange dots, gap as purple stripes, type as "Ag", colour as swatch). The current value is struck through.
4. **Up/Down** (or point at an option): tries it live, every place glides to the option and its heat shrinks.
5. **Enter** takes the option. **Right arrow or Tab** skips the cause; **Left** goes back. **Esc** leaves blueprint and the page is put back exactly.
6. When the theme has no step that settles the rule, the option is a new token named and valued from the craft spec (e.g. `--tracking-caps: 0.06em`); taking it adds the token to the theme and swaps the class together (`README.md:103`).
7. Apply everything taken: "one guarded write per file, undoable from the dock" (`README.md:99`).
8. Hold **Space** to use the page underneath (scroll, open a menu) without leaving blueprint (`README.md:100`; `overlay/src/blueprint-glass.js:119`).
9. When nothing can be written as classes, the panel says so and offers Skip (`README.md:103`).

Keyboard shortcut summary, with code check:
- Verified in code: Alt (hold), Alt+click, Alt+two-finger scroll, double-click text, Alt+double-click, Enter/click-away, Esc, Alt+B (`overlay/src/widget.js:818`), `?` opens shortcut sheet (`overlay/src/widget.js:802`), Up/Down try option (`overlay/src/fixpanel.js:696`), Enter take (:697), **K = keep as intended** (asks a one-line why, recorded on Apply) (:698, :553), Right/Tab skip (:699), Left back (:700), Esc release (:701), Space hold to use page (`blueprint-glass.js:119`), `C` starts a clean-up (`fixpanel.js:693`), `.`/`,` step through an element's problems (`blueprint.js:130`), `1`-`9` pick option, `N`/`]` and `P`/`[` step, `B` flip (before/after) in the older step card (`blueprint-fix.js:289-294`).
- README-only and NOT matched in current code: **J/K move between causes**, **L lists every drift**, **A applies** (see section 12). The in-overlay help sheet (`overlay/src/help.js:31-38`) lists: Alt+B, Enter ("Start, then fix it in your code"), Left/Right previous/next fix, Up/Down try another option, K "Keep as is", Space hold to use the page.
- First-use hints, shown once per browser (localStorage): blueprint "Click anything to fix it · ← → next fix · hold Space to use the page"; inspect "Click to show its problems · two-finger scroll walks up and down · double-click text to edit it"; words "↵ or click away to apply · Esc to undo" (`overlay/src/help.js:43-47`).
- Respects `prefers-reduced-motion` (`overlay/src/help.js` CSS).

Overlay words (voice): sentences come from one file, `overlay/src/words.js` (785 lines; `CRAFT` object has 65 rule entries, counted by importing the module). Examples: "Corner doesn't match its parent", "Group falls apart", "Faded with opacity", "Blurry text", "Line too heavy", "Grows from nothing", "z-index too high" with lines like "This 14px corner sits 8px inside a 24px corner. Use 16px." (shape, `words.js:17-21`; numbers illustrative in my paraphrase, lines come from template strings).

Source identification: dev stamping puts file/line/column of each JSX tag on the served code only; position is re-confirmed against the file on disk before editing; fallback through React's owner chain if `stamp: false` (`README.md:107-109`).

## 8. Agent integration

`plumber install` renders one packaged instruction file (`skills/plumber/SKILL.md`) into each detected agent's format; resolved from the installed package, independent of cwd (`README.md:192`; `src/adoption/install.ts:166-170`).

| Agent | Detection markers | What is written | Source |
|---|---|---|---|
| Claude Code (`claude`) | `.claude/` or `CLAUDE.md` | `.claude/skills/plumber/SKILL.md` (with frontmatter) + PostToolUse hook in `.claude/settings.json` matching `Edit\|Write\|MultiEdit` | `README.md:204,299`; `install.ts:12,185` |
| Cursor (`cursor`) | `.cursor/` | `.cursor/rules/plumber.mdc` (description, globs `**/*.tsx,**/*.jsx,**/*.ts,**/*.js,**/*.css`, `alwaysApply: false`) + `afterFileEdit` hook in `.cursor/hooks.json` | `install.ts:13,186-187` |
| Codex (`codex`) | `AGENTS.md` or `.codex/` | marked block in `AGENTS.md` | `README.md:205` |
| GitHub Copilot (`copilot`) | `.github/copilot-instructions.md` | marked block in that file | `README.md:207` |
| Gemini CLI (`gemini`) | `GEMINI.md` or `.gemini/` | marked block in `GEMINI.md` | `README.md:208` |
| Windsurf (`windsurf`) | `.windsurf/` | `.windsurf/rules/plumber.md` with `trigger: always_on` | `README.md:209` |
| generic | explicit or fallback when none detected | marked block in `AGENTS.md` | `README.md:210` |

Total: 7 targets (`install.ts:11`, `agentNames`). Markdown targets get the body between `<!-- plumb:start -->` and `<!-- plumb:end -->`; only that block is replaced, other bytes survive, malformed/duplicate markers fail before writing (`README.md:212`; `install.ts:14,16-22`). Existing `CLAUDE.md` and `PLUMBER.md` are left alone (`README.md:212`). `--agent <name>` forces targets; `--list` previews.

What the skill tells an agent (`skills/plumber/SKILL.md`): read `PLUMBER.md`; check a snippet with `echo '<div className="gap-10 text-gray-500" />' | npx plumber try --agent`; list tokens with `plumber decisions --family spacing`; after editing run `npx plumber check --changed --agent` until it prints `0 new`; four result types: Edit, Choose a token using its reason, NEEDS-DECISION ("This is a valid result"), Fix (lines 12-38). Never edit config/ledger/theme, never run accept/baseline unasked, never invent a value (lines 40-44).

Other: `plumber agent-docs` writes `PLUMBER.md` from the same decision records (tokens with whys, per-component what callers may set, habits) so docs and enforcement "cannot disagree" (`README.md:297`; `docs/DESIGN.md` 1.5). Overlay has "Copy for agent" hand-off (`docs/ROADMAP.md:2` says it "hands over text the agent acts on with the same CLI"; whether it ships as that exact label was not verified in code).
Owner decision: no MCP server; "Agents use the CLI directly" (`docs/ROADMAP.md:2`, 2026-10-10). Do not claim MCP support.
Agent behaviour inside editors is unverified: "Agent application behavior remains unverified in the editors" (`README.md:214`).

## 9. Real numbers (measured only)

All below are from the repo's own records; hardware is the owner's laptop (macOS, darwin 25.6.0 for my own runs); no third-party hardware stated.

Performance on a large real design system (MetalUI, pinned archive faa2036e4634e4f6c8d49feaa2dac87a77559501; owner's own project), `BENCHMARK.md:1125-1170`
- Warm report median: 997.0 ms (was 2184.5 ms before the optimisation pass). Warm text CLI: 1138.2 ms. Warm range 977.6-1008.1 ms. Cold report/process: 4210.2 / 4368.9 ms ("Cold means an empty Plumb cache"). 3 fresh processes per warm measurement. Caveat in source: "local measurements, not a latency guarantee under arbitrary machine load." (`BENCHMARK.md:1135-1140`)
- That benchmark's size: 1072 finding groups / 3890 grouped site rows; ledger 5743 entries, 3910 debt obligations, 0 new (`BENCHMARK.md:1216`). Compiler cache: 1302 misses cold, 1302 hits warm (`BENCHMARK.md:1259`).
- Noise pass 2026-10-10: "1,050 -> 856 groups (-194, -18.5%)" on the same sources (`BENCHMARK.md:1278`). The original under-400 target "is not met" (same line).

Small demo run (mine): `plumber` on `fixtures/tailwind-min` (4 files): "0.2s" in the report header; wall 0.43s total with cold cache redirected (`/usr/bin/time` on `node dist/cli.js --root .`, 2026-11-03).

Reading-path bench (overlay reads), `bench/reading/after.counts.json`: 337 grouped findings, 4019 sites, 39179 of 40203 values from decisions, 1024 findings (JSON, no prose; app not named in the file; `bench/reading/measure.mjs` exists). Treat as internal.

Overlay verified on four real apps (the owner's own: MetalUI, Kamui, Crafting Attention, AlgoRecall), run 2026-10-13, `docs/verification/overlay-e2e.md` table: all four "passed"; JSX identified exactly 20/20 on each; locate p95 86.6 / 751.1 / 97.16 / 117.3 ms; server health max under 5 ms; element samples 450 / 113 / 150 / 150; page-ready 14289 / 6391 / 13325 / 28376 ms (gated, "not an ungated startup benchmark"); write proven on 2 of 4 (the others show "info"). Methodology note: samples compared against react-grab as oracle (columns "Grab only" = 0, "Disagree" = 0). Source mentions "Oracle library" column; I did not decode it further.

Rule counts (measured by running `node dist/cli.js spec --root fixtures/tailwind-min`, 2026-11-03): 77 spec rules = 62 `craft/*` + 15 `habits/*`, in 11 principles (access, legibility, theme, rhythm, shape, depth, colour, hierarchy, alignment, motion, taste). CHANGELOG says "Seventy-odd rules" (`CHANGELOG.md:8`). The overlay's word table has 65 craft entries (`overlay/src/words.js`). Built-in CLI habits: 7 on `plumber habits` (above) plus `z-named`/`motion-tokens` accepted in config (`src/habits/index.ts:48`); BENCHMARK lists 9 habits incl. overscroll-contain and overflow-clip (`BENCHMARK.md:1231-1239`); `docs/craft/rules.md` is a catalogue of about 91 table rows ("Status: catalogue, 2026-10-27"), many not implemented ("Detect: x = taste, taught, not checked", `docs/craft/rules.md:6-9`). Do not equate catalogue count with shipped rules.

Tests: `e2e/` holds 142 files; `grep -E "^\s*test\(" e2e/*.test.mjs | wc -l` = 776 `test(` calls on 2026-11-03 (counted, NOT run by me). `package.json` `npm test` = build + `scripts/test.mjs`, which runs the e2e files serially plus a burst test and two serve modes (`scripts/test.mjs:7-13`). Policy: integration/e2e only, zero unit tests (`BENCHMARK.md:1214`). Older recorded counts: 137 (2026-10-10, `BENCHMARK.md:1214`), 186 (`BENCHMARK.md:1278`). CI: Node 22 and 24 matrix on ubuntu (`.github/workflows/ci.yml`).

Commits: 571 commits, first 2026-10-09, latest 2026-11-03 (`git log`). Active days Oct 26 -> Nov 3 show 5-80 commits/day.

No benchmark of overlay frame rate or of bundle size was found in the docs I read (memory file mentions performance rules but no published figure). Not found: bundle size, npm install size.

## 10. Evidence inventory

- Licence: MIT, "Copyright (c) 2026 Vijay Singh" (`LICENSE:1-3`; `package.json:6`).
- Repo URL: https://github.com/unlocalhosted/plumb (`package.json:104-106`; `git remote -v`). Homepage field points to the repo README (`package.json:108`).
- npm package: `@unlocalhosted/react-plumber`, `publishConfig.access: public` (`package.json`). README badges (npm version, downloads, GitHub release, licence) exist (`README.md:6-9`) but I did not query the registry, so the published version and download count are NOT VERIFIED. Local version 0.2.0.
- Release dates: v0.1.0 tag, "First public release", 2026-10-14 (`CHANGELOG.md:20-22`; tag commit 96a5acc dated 2026-10-14). v0.2.0 dated 2026-10-28 in `CHANGELOG.md:3`; tag v0.2.0 points at commit 09e4514 dated 2026-10-28. `git tag` lists only v0.1.0, v0.2.0. Whether either was actually published to npm: not verified.
- GitHub stars, forks, issues: not found (no network lookup done).
- Users, customers, testimonials, quotes from third parties, logos, case studies: not found anywhere in README/docs/CHANGELOG. The only "users" are the owner's own four apps used for verification (MetalUI, Kamui, Crafting Attention, AlgoRecall) (`docs/VISION.md:17`; `docs/verification/overlay-e2e.md`).
- Media in repo: `docs/media/blueprint.gif` (referenced `README.md:21`), demo site pages `/?craft`, `/?rules`, `/?team` (`CHANGELOG.md:16`; site/ not opened).
- Third-party notices file ships (`THIRD_PARTY_NOTICES` in `package.json` files; generated by `npm run notices`).
- Provenance/limits docs: `docs/layers/0..10-*.md`, `docs/roadmap/*.md`, `docs/verification/*`.
- GitHub Action: root `action.yml` exists (listed in `package.json` files); README says the runner and approval script are tested over disposable fixture PRs and a local REST server, and "it is not a hosted GitHub run" (`README.md:334`). So: no proof of a live GitHub-hosted run.
- Typographic/voice standard: `docs/copy/voice.md` (Paul Graham / Dan Abramov plain-words rule) governs overlay words and findings; CLI/docs "follow later" (voice.md intro).

## 11. Vision and "why now" statements (short quotes)

- "Design systems drift one `p-[13px]` at a time. Linters see strings; React Plumber sees the page." (`README.md:29`)
- "The agent is the main author of UI code now, and it is the user React Plumber was designed for." (`docs/ROADMAP.md:129`)
- "React Plumber is a judge with no courtroom." (`docs/ROADMAP.md:7`) (diagnosis that led to the overlay)
- "nobody notices drift in a terminal" (paraphrase; the doc says the browser is where noticing happens) (`docs/ROADMAP.md:17`)
- "whoever is making something needs an immediate connection to it" (Bret Victor, *Inventing on Principle*, as the model) (`docs/VISION.md:3`)
- "You point at a pixel and reach the code that drew it." (`docs/VISION.md:3`)
- "A live editor that writes to the wrong line once loses trust for good" (`docs/VISION.md:9`)
- "Source is the truth." / "Preview before write." / "The design system leads." / "Dev only." (bold lead-ins of the four invariants, `docs/VISION.md:10-13`)
- "Quiet by default." and "The loop must terminate: `0 new` or `NEEDS-DECISION`." (`docs/ROADMAP.md:38,41`)
- "Nobody is forced to pay old debt to adopt it." (about graduated enforcement, `docs/ROADMAP.md:31`)
- "Every finding ... has to say what is wrong with this code, why that matters, and exactly what to do." (`docs/MESSAGES.md:3`, shortened)
- Voice rule: "Every word on the page competes with the page." (`docs/copy/voice.md:3`)
- Layers planned beyond today: reading, writing, direct manipulation, structure, states, time, prototyping; layers 4-7 "Not started" (`docs/VISION.md:19-28`). Do not promise those on a homepage.

## 12. Contradictions and stale claims noticed

1. **Package name.** Task brief and `docs/DESIGN.md` era say "plumb"; current package is `@unlocalhosted/react-plumber` with bin `plumber` (`package.json:2,19`). The GitHub repo and Action are still `unlocalhosted/plumb`. Pick one install line: `npm install -D @unlocalhosted/react-plumber` (`README.md:24`).
2. **README overlay keys vs code.** README says "J K move between causes; N walks places; A applies; L lists every drift" (`README.md:98-101`). Code: J/K are not bound in the live fix panel; K means "keep as intended" (`overlay/src/fixpanel.js:698`; help sheet "K Keep as is", `overlay/src/help.js:36`); the old list/panel is retired with the comment "L (the old list) is retired: the fix bar is the one panel" (`overlay/src/widget.js:~825`) and `overlay/src/blueprint.js:~134` ("the old side panel is retired"). I found no key handler for `A`. Apply is via the panel's Apply control (inferred). Treat README's key table as partly stale; the in-overlay help sheet is the better source.
3. **Blueprint description.** CHANGELOG 0.1.0 describes Blueprint as "a wireframe of the running page: greeked words..." (`CHANGELOG.md:27`), but memory notes and CHANGELOG 0.2.0 say the page is dimmed with heat annotations, and the wireframe look is retired ("The selection ring, the chooser card, the Changes sidebar and the first-use walkthrough are gone", `CHANGELOG.md:7`). The README gif alt text matches the new design.
4. **CHANGELOG 0.2.0 vs package.json.** CHANGELOG: "`sideEffects: false`" (`CHANGELOG.md:18`); `package.json:9-11` now has `sideEffects: ["./overlay/client.js"]`.
5. **`docs/DESIGN.md` is a 2026-10-09 design doc saying "No code exists"** (`docs/DESIGN.md:3`) and uses illustrative numbers ("invented to show the shape", `docs/DESIGN.md:~16`). It also names `plumber 0.1`, `plumb.config.ts` and `.plumb/` (old names). Do not lift its sample output as real.
6. **`docs/ROADMAP.md` is also dated 2026-10-10** and its mock outputs (e.g. `plumb.try` as MCP, `plumber report --since` table, editor squiggles) are proposals; the file itself drops MCP (`docs/ROADMAP.md:2`) and says "v1 ships no editor plugin" in DESIGN (`docs/DESIGN.md:1.4`). Nothing in package.json suggests an editor plugin exists.
7. **Test counts differ by document:** 137 (`BENCHMARK.md:1214`), 186 (`BENCHMARK.md:1278`), my grep count 776 `test(` calls. Only the grep count is current, and it is unrun. README does not state a test count.
8. **"Seventy-odd rules" (`CHANGELOG.md:8`) vs measured 77 in `plumber spec` (62 craft + 15 habits),** and `docs/craft/rules.md` catalogues about 91 rows, many "taste, not checked". Say "about 60 craft checks plus 15 habits" or quote `plumber spec`.
9. **`docs/VISION.md` line 3 says it supersedes ROADMAP 3.1 "the overlay is not a style editor"**; ROADMAP line 181 notes the supersession. The overlay now does edit source, so ROADMAP section 3 language ("It is not a visual-regression tool... shows the judgement") is partly stale.
10. **Copy rule vs README wording.** `docs/copy/voice.md` bans "drift", "cause", "finding", "site" on screen, yet README headline and CLI use "drift"/"cause" heavily. The README text is not governed by the guide yet ("The CLI and docs follow later", voice.md intro).
11. **Tailwind support claim.** README says "Tailwind v4 or plain CSS" (`README.md:36`), consistent with code. The package keywords include "tailwind" generically and v3 projects get a refusal, not a partial run (`tailwind.ts:46`).
12. **Next.js scope.** README documents App Router only (`README.md:249`, `src/adoption/overlay.ts` refuses otherwise: "--write supports Vite and Next.js App Router projects"); `package.json` peer is `next >=15.0.0` with no Pages Router mention. Pages Router: not found (treat as unsupported via `serve --overlay`; inferred).
13. **Action pin.** README example uses `unlocalhosted/plumb@<reviewed-commit-sha>` (`README.md:323`); `install --ci` pins to the local git HEAD or `v<version>` if no commit is found, and warns "This release tag must exist" (`src/adoption/install.ts:~84-95,101`). v0.2.0 tag exists locally; whether pushed: not verified.
14. **Overlay "production bytes: none"** is true for the default plugin but the plugin has a documented-in-code-only `demo` mode that does ship the overlay in a build (`src/hosts/vite.ts:32-34`).
15. **README Layer headings** ("Layer 9 surfaces", "Layer 10") expose internal build-phase numbering to users (`README.md:283`); a homepage should not reuse them.
16. **Dated Apple-ish claims about "four real apps"** in VISION ("20/20 exact each") are from the 2026-10-12/13 run on the owner's own apps (`docs/VISION.md:21`; `docs/verification/overlay-e2e.md`); they are not independent users.

## Appendix: one-line facts a homepage can safely use (all sourced above)

- Install: `npm install -D @unlocalhosted/react-plumber`; first command `npx plumber` (`README.md:24,51`).
- Works with Vite 6-8 and Next.js 15+ (App Router), Tailwind v4 or plain CSS, React 18.2/19, Node 22.18+ (`package.json`).
- First run exits 0 and writes nothing but an ignored cache (section 6, proof run).
- `plumber check` after `init` or `baseline` fails only on new drift (`README.md:33,55`).
- Alt+B on a running page shows what's off; click, try options with arrows, Enter to take, one guarded undoable write per file (`README.md:88-105`).
- 7 agent targets: Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf, generic AGENTS.md (`src/adoption/install.ts:11`).
- MIT licence; v0.1.0 2026-10-14, v0.2.0 2026-10-28 (`CHANGELOG.md`).
- MetalUI warm check about 1.0 s, cold about 4.2 s on the owner's laptop (`BENCHMARK.md:1135-1140`).

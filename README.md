<h1 align="center">React Plumber</h1>

<p align="center"><strong>Find where your React + Tailwind UI drifts from its design system, and fix it on the running page.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@unlocalhosted/react-plumber"><img src="https://img.shields.io/npm/v/@unlocalhosted/react-plumber?label=npm&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@unlocalhosted/react-plumber"><img src="https://img.shields.io/npm/dm/@unlocalhosted/react-plumber?color=cb3837" alt="npm downloads"></a>
  <a href="https://github.com/unlocalhosted/plumb/releases"><img src="https://img.shields.io/github/v/release/unlocalhosted/plumb?label=release" alt="latest release"></a>
  <a href="https://github.com/unlocalhosted/plumb/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@unlocalhosted/react-plumber" alt="license"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@unlocalhosted/react-plumber">npm</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#blueprint-fixing">Fixing from the page</a> ·
  <a href="#3-craft-in-ci">CI</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/unlocalhosted/plumb/main/docs/media/blueprint.gif" width="760" alt="Blueprint mode on a demo page: heat glows where the page is off its system; the fix panel holds gap-[10px] with 8px, 10px (now) and 12px drawn as specimens; the rows glide as each is tried; Take and Apply write gap-s2 into App.jsx"></p>

```sh
npm install -D @unlocalhosted/react-plumber
```

## Why

Design systems drift one `p-[13px]` at a time. Linters see strings; React Plumber sees the page. It compiles your classes with your own Tailwind, measures the rendered result against your tokens, and checks the craft a good designer would: button sides, nested corners, faded text, line length, tap targets.

- **On the page.** Press **Alt+B**: heat glows only where the page is off. One panel holds one cause at a time, with its options drawn as what they are. Try them live, take one, and apply: one guarded write to the source.
- **In the source.** Every fix is the exact class edit in the exact JSX that made the element, checked against the file's hash so it never writes over your work.
- **In CI.** `plumber check` fails only on new drift; a ledger keeps accepted debt and reasoned exceptions. `plumber craft` reads your routes headlessly and emits text, JSON or SARIF.
- **Yours to tune.** One spec sets what "good" means: presets (strict, balanced, relaxed), per-rule values, and how new tokens are named.

Works with Vite and Next.js, Tailwind v4 or plain CSS. Node 22.18+. The command is `plumber`.

<details>
<summary><strong>What it reads, in detail</strong></summary>

It compiles classes, stylesheets, `@apply` and inline styles with the project's own Tailwind, then judges every value against the project's tokens and written rules. Inline values written in code are read symbolically: constants fold, a ternary or a typed prop is read as every outcome, a token beside a runtime number is judged by the token, and `k * STAGGER` is judged by its step. The families are spacing, colour, radius, type, motion, elevation and z-index, plus team habits, component overrides and hand-built copies of components. A ledger records accepted debt and reasoned exceptions, so CI fails only on new drift. Node 22.18 or newer is required.

</details>

## Quick start

### 1. Find the drift

```sh
npm install -D @unlocalhosted/react-plumber
npx plumber                 # report drift; exits 0 with no config
npx plumber state           # where the project starts: bare, half a system, a system
npx plumber propose         # tokens drafted from the values the code already uses
npx plumber init            # ask, write the theme, write plumber.config.ts, baseline today's findings
npx plumber check           # green: only new drift fails from here
npx plumber install --ci    # add the GitHub Action
```

`state` names the starting point from evidence. `propose` harvests the spacing, colour, radius and type values in use, clusters them into a scale, names the steps and shows what each would take over; `propose --write` puts them in your theme, in the shape your theme already has (`@theme`, shadcn's `@theme inline`, or `:root`), and imports a new file from your stylesheet. `init` asks the same questions one at a time (`--yes` takes every default, `--family spacing=keep` answers one), infers the token sources, turns on four habits, lists the rest with their counts, and records the baseline. `plumber doctor` checks Node, Tailwind, the CSS entry, config, ledger and cache, with a fix on each line; `plumber fix <id>` applies one of its diffs after you confirm it.

### 2. Fix it from the page

```sh
npx plumber install --overlay           # print the wiring for Vite or Next.js
npx plumber install --overlay --write   # make the change, and show the diff
```

For Vite, the overlay is one plugin, listed **before** `react()`:

```ts
import { plumb } from '@unlocalhosted/react-plumber/vite'
import react from '@vitejs/plugin-react'

export default { plugins: [plumb(), react()] }
```

Start your dev server as usual. The overlay lives only in development: production builds carry no script, no stamps and no server routes.

#### Reading

| Gesture | What happens |
| --- | --- |
| Hold **Alt** | The element under the pointer is outlined, with its component and how many values are off the scale. |
| **Alt + click** | Pins a reading: the exact JSX that made the element, each off-scale value with the tokens that fit, and the craft problems on it. |
| **Alt + two-finger scroll** | Up to the parent, down to the child. |
| **Double-click** words | Edit them in place; **Enter** or clicking away writes them to the source string, **Esc** puts them back. **Alt + double-click** reaches words in a button, card or link. |

#### Blueprint: fixing

Press **Alt+B**. The page dims and heat shows where it is off: an amber break on the geometry of every drift, with the nearest token ghosted beside it, and the craft problems the page has, measured on the page. The **fix panel**, docked at the bottom, is the one place you act. Its unit is a cause: one class under one rule, every place it is used. One decision, and every place moves.

| Gesture | What happens |
| --- | --- |
| **Alt+B** | Blueprint on or off. **Esc** also leaves, and the page is put back exactly. |
| **Click** anything, or **Enter** | Puts the first cause in hand: the class, what is off in words, its places, and its options drawn as what they are (padding as green hatch, margin as orange dots, gap as purple stripes, type as "Ag", colour as a swatch). The value it has now is struck through. |
| **↑ ↓**, or point at an option | Tries it: every place of the cause glides to it on the live page, and its heat shrinks with it. |
| **Enter** | Takes the option. **→** or **Tab** skips the cause, **←** goes back. |
| **J K** | Moves between causes; **N** walks the places of one. |
| **A** | Applies everything taken: one guarded write per file, undoable from the dock. |
| Hold **Space** | Use the page underneath (scroll, open a menu) without leaving blueprint. |
| **L** | Every drift in view as a list. |

When the theme has no step that would settle a rule, the option is a new token, named and valued from the craft spec (`--tracking-caps: 0.06em`); taking it adds the token to your theme file and swaps the class in the same breath. When nothing can be written as classes, the panel says so and offers Skip.

Every write is checked against the file on disk: the file's hash, that it still parses, that the class is still there as written. A stale file is refused with "This file changed after we checked it", never overwritten. Writes land in place, so the dev server's hot reload picks them up, and each one returns an undo handle.

If your app hydrates HTML that was prerendered outside the dev server (a build script that bakes pages into `index.html`), that HTML has no stamps, and React reports a hydration mismatch in dev and renders the page again. Use `plumb({ stamp: false })` there; React Plumber then finds positions through React's owner chain instead.

React Plumber writes only to a position it has proven. In development, `plumb()` stamps each JSX tag in your tracked sources with its file, line and column, in the served code only; your files are untouched and production builds carry nothing. React Plumber then confirms the position against the file on disk before it edits. When it can't prove a position, it says why instead of guessing.

### 3. Craft in CI

```sh
npx plumber spec                                      # the craft spec in effect, and where each value came from
npx plumber craft --url http://localhost:5173/        # the page's craft problems, headless
npx plumber craft --url http://localhost:5173/ --routes / /settings --json
npx plumber craft --url http://localhost:5173/ --sarif craft.sarif
```

`craft` opens each route in headless Chromium (Playwright, installed separately: `npm i -D playwright && npx playwright install chromium`, or set `PLUMBER_CHROMIUM` to a Chrome you have), reads every element the way the overlay does, and reports what is off with the same words and the same fix. It also tries the states a person reaches: dark mode, touch, hover and press, a toggle, a menu, a tooltip, the keyboard, a spinner. `--no-pairs` and `--no-probe` leave those out; `--probe drag` adds the one gesture that can move things; `--probe-budget` caps how many elements each gesture tries. `--judge` asks a vision model (Anthropic's API, with `ANTHROPIC_API_KEY`; never when `CI` is set) about the findings a rule measured but would not stand behind, sending it a crop of each; every answer is kept under `.plumber/judge` to commit with the project, so a run without the flag reuses them. Advisory findings (matters of taste) are notes and never fail the run; every other finding exits 1. `--json` prints the spec, each route and the findings; `--sarif` writes SARIF 2.1.0 for code scanning.

The spec is the standard every rule reads its numbers from. `plumber spec` prints it; the `craft` key in your config changes it:

```ts
import { defineConfig } from '@unlocalhosted/react-plumber'

export default defineConfig({
  css: 'src/styles.css',
  craft: {
    preset: 'balanced',                        // strict | balanced | relaxed
    values: {                                  // per principle, per rule: the numbers, merged over the preset
      legibility: { measure: { max: 70 } },
      access: { 'hit-target': { min: 44 } },
    },
    rules: {                                   // per rule: off, or its tier and severity
      'craft/hairline': false,
      'craft/continuous-corners': { tier: 'craft' },
      'habits/real-quotes': { severity: 'info' },
    },
    tokens: {                                  // new tokens the fix panel may add
      create: true,
      name: '{family}-{job}',
      file: 'src/styles.css',
    },
  },
})
```

### From a checkout

```sh
npm install
npm run build
node dist/cli.js --root ./fixtures/tailwind-min
npm test
```

## Configuration

The package is named `@unlocalhosted/react-plumber` and exposes the `plumber` binary when installed. Config is optional. Place `plumber.config.ts`, `.mts`, `.mjs` or `.js` in the project root, or pass `--config <path>`. Relative config and CSS paths resolve from `--root`; the default root is the current directory.

```ts
import { defineConfig } from '@unlocalhosted/react-plumber'

export default defineConfig({
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,jsx,ts,js,css}'],
  markers: ['js-*'],
  classHelpers: ['joinStyles'],
})
```

The default report starts with token coverage (lowest first), then commands for broken styles, setup gaps, component overrides and off-token values. Before a baseline, it shows counts and the four most common classes/values. With a ledger, it shows only new sites in detail (up to 20 finding groups), followed by the known debt count.

```sh
plumber check --all                         # full human report
plumber check --broken                      # styles the browser cannot apply
plumber check --family color --file 'src/pages/**'
plumber check --rule ownership              # component overrides
plumber check --new                         # all new sites, without the default cap
plumber check --debt                        # recorded debt sites
```

Detail flags combine and filter sites within each group. `--rule` accepts an exact rule id or a category (`existence`, `config`, `ownership`, `provenance`); `provenance` shows off-token values, while `--rule provenance/opaque-inline` shows runtime values that cannot be checked. Reasons appear once per rule in a closing Why block, with one accept command for a real site. `--all` keeps its previous selection and order, with compact finding lines, merged subjects and once-only wording; `--all --verbose` also lists known findings and internal notes. `--verbose` includes the file breakdown and analysis notes. Findings use at most three lines, with aligned locations and compact suggestions. All human tables use terminal width (100 columns in pipes), shortening long cells; off-counts align on the right. Broken styles are red, drift amber and secondary text dim only in a terminal without `NO_COLOR`. Coverage bars follow the same terminal rule.

Use `plumber --help` for flags. JSON reports follow [report.schema.json](https://github.com/unlocalhosted/plumb/blob/main/schema/report.schema.json). Machine output (`--json`, `--agent`, `--sarif`, `--format github`) is unchanged and ignores human detail filters. With no config and no ledger, a check exits 0 and suggests `plumber baseline` to record today's debt; `plumber init` also sets up token sources and habits. With config or a ledger, error findings exit 1. Usage or config errors exit 2.

Init enables the `hover-gate`, `focus-outline`, `transition-named` and `no-ease-in` habits and records accepted tokens with the baseline. It refuses an existing config unless `--force` is supplied, which prints the replacement diff first.

## Agent installation

`plumber install` renders the unchanged instructions shipped in `skills/plumber/SKILL.md` into every detected agent's format. The skill resolves from the installed package, independent of the current directory. Preview without writes using `plumber install --list`. Repeat `--agent <name>` to add targets even when not detected:

```sh
plumber install --list
plumber install --agent codex --agent cursor
plumber install --ci
```

Detection checks the project root, then its Git repository root. Instructions are written at the project root; Claude and Cursor hooks use the detected settings scope, with `--root` for nested projects. Forced agents with no marker get hooks at the project root.

| Agent name | Detection markers | Instructions written |
| --- | --- | --- |
| `claude` | `.claude/` or `CLAUDE.md` | `.claude/skills/plumber/SKILL.md`, including skill frontmatter, plus PostToolUse hook |
| `codex` | `AGENTS.md` or `.codex/` | Marked block in `AGENTS.md` |
| `cursor` | `.cursor/` | `.cursor/rules/plumber.mdc`, plus afterFileEdit hook |
| `copilot` | `.github/copilot-instructions.md` | Marked block in that file |
| `gemini` | `GEMINI.md` or `.gemini/` | Marked block in `GEMINI.md` |
| `windsurf` | `.windsurf/` | `.windsurf/rules/plumber.md` |
| `generic` | Explicit `--agent generic`, or fallback when no agents are detected | Marked block in `AGENTS.md` |

Plain Markdown targets receive the skill body without frontmatter between `<!-- plumb:start -->` and `<!-- plumb:end -->`. Only that block is replaced; surrounding bytes survive. Missing blocks are appended. Malformed or duplicate markers fail before install writes. Dedicated React Plumber skill/rule files are rewritten only when content differs; unrelated rules and hook settings survive. Every write is printed. Reinstallation preserves bytes. No agent detected creates only `AGENTS.md`; other agent selections don't create it unless Codex or generic is selected. Existing `CLAUDE.md` and `PLUMBER.md` are left alone; use `plumber agent-docs` to generate the optional project token reference.

Cursor rules use `description`, comma-separated `globs` for tsx/jsx/ts/js/css, and `alwaysApply: false`, as documented in [Cursor Rules](https://cursor.com/docs/rules). Windsurf rules use Markdown with `trigger: always_on` frontmatter, documented in [Cascade Rules](https://docs.windsurf.com/windsurf/cascade/memories). Agent application behavior remains unverified in the editors; [adoption notes](https://github.com/unlocalhosted/plumb/blob/main/docs/roadmap/1-adoption.md#agent-format-notes) record format verification and limits.

`--ci` additionally writes the existing GitHub Action workflow when absent. `install --hooks` keeps its explicit hooks-only behavior for Claude and Cursor; `install --hooks --list` previews those hooks.

## Development overlay hosts

`plumber install --overlay` reads `package.json` and prints the host wiring without changing files; `--write` makes the change and prints the diff. Vite and React are optional peers, loaded only through their adapter subpaths.

For Vite, add the plugin to your existing configuration:

```ts
import { plumb } from '@unlocalhosted/react-plumber/vite'

export default { plugins: [plumb()] }
```

The plugin shares Vite's development server, analyzes its configured root, serves `/__plumb/*`, and injects the module script into HTML. Vite builds omit the plugin and overlay script. A process registry keyed by root and Session options keeps the worker and revision warm across Vite restarts, including plugin reloads. Final server shutdown releases the Session, including middleware mode; concurrent hosts with identical options share ownership.

If source saves do not reach Vite in Docker or WSL, configure its host watcher:

```ts
export default {
  plugins: [plumb()],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
      awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
    },
  },
}
```

Polling checks files every 100ms; write stabilization waits for completed saves before HMR. Avoid 1ms polling: Chokidar also throttles incoming file notifications for 5ms. When using environment overrides, use `CHOKIDAR_USEPOLLING=1 CHOKIDAR_INTERVAL=100` and retain `awaitWriteFinish` in Vite's config. These settings control Vite's HMR watcher; `PLUMBER_POLLING` controls React Plumber's separate analysis watcher. Enable host polling only where needed because it increases CPU use. See [Vite's watcher guidance](https://vite.dev/config/server-options#server-watch).

For Next.js App Router, wrap your existing `next.config.mjs` export:

```ts
import { withPlumb } from '@unlocalhosted/react-plumber/next/config'

export default withPlumb(nextConfig)
```

In development, this preserves your [page extensions](https://nextjs.org/docs/app/api-reference/config/next-config-js/pageExtensions), adds `plumb.ts` and `plumb.tsx`, and [externalizes React Plumber's Node implementation](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) alongside your existing `serverExternalPackages`. Production configuration receives neither addition.

Add `app/%5F_plumb/[...path]/route.plumb.ts` (or the equivalent under `src/app`):

```ts
import { createPlumbRoute } from '@unlocalhosted/react-plumber/next'

export const runtime = 'nodejs'
export const { GET, POST } = createPlumbRoute()
```

The encoded folder serves `/__plumb/*`; [Next.js treats literal underscore-prefixed folders as private](https://nextjs.org/docs/app/getting-started/project-structure#private-folders). Import `PlumbOverlay` from `@unlocalhosted/react-plumber/next/overlay` and render `<PlumbOverlay />` inside your root layout's `<body>`. This entry imports only React and shared token state; it server-renders the process token, and the client sends it as `x-plumb-token`. Routes reuse one Session across hot reloads. `withPlumb` keeps the server implementation outside both bundlers even for linked (`file:` / `npm link`) installs. Production and `output: 'export'` builds never discover `route.plumb.ts`; the component renders nothing and imports no Session implementation. Keep the `.plumb.ts` suffix: renaming it to `route.ts` defeats build exclusion. `createPlumbRoute` accepts Session options, including `root` and `config`; the first active route initializes the process Session. The older `PlumbOverlay` export from `/next` remains compatible.

In monorepos, Vite uses its dev-server root and Next uses the app's current working directory to resolve browser source paths, even when React Plumber's `root` is the repository. Returned locations and edits remain relative to React Plumber's root; only tracked sources inside it are accepted.

For other hosts, start a separate local server with your page's exact development origin:

```sh
plumber serve --overlay --origin http://localhost:5555
plumber install --overlay
```

When the host serves a subdirectory, add `--served-root apps/web` (relative to the current directory, or absolute) to `serve --overlay`, and use `--root` for the repository containing the React Plumber config and sources.

The second command prints one script tag with the running server's port and token. Paste it into development pages only; rerun after restarting React Plumber, because the token changes. Without a running overlay server, install prints a startup command and a script template. CORS permits only the configured origin, including preflight for `x-plumb-token` and JSON requests. API routes still require the process token; the public client module contains no token. Existing `plumber serve` and stdio behavior are unchanged.

## Layer 9 surfaces

```sh
plumber check --sarif > plumb.sarif
plumber check --base origin/main --format github
plumber check --changed --agent
plumber agent-docs
plumber install --hooks
```

SARIF 2.1.0 retains every finding site, including debt and exceptions, with ledger fingerprints and `new`/`unchanged` baseline state. Scoped GitHub annotations show new drift, touched debt with its key, and touched exceptions with their reasons on changed lines. Agent instructions include only new sites within the requested file scope. `--changed` means tracked files changed versus HEAD, including staged edits, plus untracked files; `--base` compares against the supplied ref. Both still analyze the whole project so imports and decisions resolve correctly. Formats are mutually exclusive.

GitHub output includes a plain Markdown summary and appends it to `GITHUB_STEP_SUMMARY` when set. Coverage delta and fixed counts with `--base` come from analyzing an isolated copy of the base sources with existing dependencies linked for reads. The programmatic API exports `githubSummary(report, baseReport?)`, returning `{ title, lines }` sections, and `renderSummary(sections)` for the default Markdown. No score is computed.

`--agent` groups fixes by finding, lists only new sites, includes compiled declarations and decision reasons, and gives exact edits when one candidate and the authored syntax make the edit unambiguous. Multiple candidates require a choice. The loop stops on `0 new`; unresolved choices are `NEEDS-DECISION`. Do not change config, ledger or theme to pass. `agent-docs` writes `PLUMBER.md` from the same decision records and enabled habit configuration, and prints a short block to paste into AGENTS.md or CLAUDE.md. Optional ownership records are included when available; missing ownership or habit reasons are stated explicitly.

Hook installation merges `.claude/settings.json` `PostToolUse` (`Edit|Write|MultiEdit`) and `.cursor/hooks.json` version 1 `afterFileEdit`, preserving other settings and hooks. It prints the before/after diff and is idempotent. Both run `plumber check --changed --agent --strict-ledger`; install React Plumber on PATH first. These post-edit hooks provide feedback after a write; they do not undo edits. Supported formats: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Cursor hooks](https://cursor.com/docs/hooks).

## GitHub Action

The repository-root `action.yml` installs this Action checkout's locked dependencies, builds React Plumber, runs `plumber check --base <PR base> --format github`, writes the job summary, and creates or updates one `<!-- plumb-summary -->` PR comment. The checked project must already have its dependencies installed. The runner also reads a JSON report for the ledger approval gate. It uses GitHub REST, paginates reviews/comments, and only updates marker comments authored by `github-actions[bot]`.

```yaml
name: Design decisions
on:
  pull_request:
  pull_request_review:
    types: [submitted, dismissed]
permissions:
  contents: read
  pull-requests: write
jobs:
  plumb:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - run: npm ci
      - uses: unlocalhosted/plumb@<reviewed-commit-sha>
        with:
          ledger-approvers: designer, maintainer
          # working-directory: apps/docs
          # base: origin/main
```

Inputs: `base` defaults to the PR base SHA; `working-directory` defaults to `.`; `token` defaults to `github.token`; `ledger-approvers` accepts comma/space separated GitHub logins with optional `@`. When the ledger grows, a listed reviewer must have an effective approval, or the PR author must be listed. A later dismissal or request for changes cancels that reviewer's approval; comments alone do not. An empty approver list fails on growth with instructions to configure it. Existing CLI failures still fail even after approval. No growth needs no approval.

Fetch the base history (`fetch-depth: 0`). Review events rerun the gate after approval or dismissal. Fork PRs have read-only default tokens, so posting comments requires a separately designed trusted workflow; this example needs a writable token. Use a reviewed Action SHA. Avoid running this dependency/compiler pipeline with privileged tokens on untrusted code through `pull_request_target`. Non-PR runs need an explicit `base` and produce annotations/summary without a PR comment.

Verification and limits: [Layer 9 notes](https://github.com/unlocalhosted/plumb/blob/main/docs/layers/9-surfaces.md). The Action runner and approval script are tested over disposable fixture PRs and GitHub API response fixtures, with a local REST server. This verifies create/update, approval failure/success and CLI execution; it is not a hosted GitHub run.

### Migrating older projects

Rename `plumb.config.ts` to `plumber.config.ts` (the same applies to `.mts`, `.js`, and `.mjs`) and move `.plumb` to `.plumber`:

```bash
mv plumb.config.ts plumber.config.ts
mv .plumb .plumber
```

React Plumber reads legacy names when the new names are absent, prints one migration notice on stderr, and keeps writing into the legacy config and state directory until you move them. When both exist, the new names take precedence. New projects write `plumber.config.ts` and `.plumber/`, including ledger, daemon discovery, and caches. `PLUMBER_*` environment variables take precedence over the corresponding `PLUMB_*` fallback.

The npm package is `@unlocalhosted/react-plumber`; its only binary is `plumber`. Vite's `plumb()` function, Next.js exports, and the overlay's internal protocol identifiers remain unchanged. GitHub Actions still use `unlocalhosted/plumb@<revision>`.

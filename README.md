# React Plumber

[![npm](https://img.shields.io/npm/v/@unlocalhosted/react-plumber?label=npm)](https://www.npmjs.com/package/@unlocalhosted/react-plumber) [![release](https://img.shields.io/github/v/release/unlocalhosted/plumb?label=release)](https://github.com/unlocalhosted/plumb/releases) [![license](https://img.shields.io/npm/l/@unlocalhosted/react-plumber)](LICENSE)

```sh
npm install -D @unlocalhosted/react-plumber
```

Published as [`@unlocalhosted/react-plumber`](https://www.npmjs.com/package/@unlocalhosted/react-plumber); the command it installs is `plumber`. Source and releases live at [unlocalhosted/plumb](https://github.com/unlocalhosted/plumb).

React Plumber finds where a React and Tailwind v4 (or plain CSS) project drifts from its design system. In the browser, it lets you fix a drift by pointing at it and writes the fix to the source file.

<p align="center"><img src="https://raw.githubusercontent.com/unlocalhosted/plumb/main/docs/media/blueprint.gif" width="960" alt="Blueprint mode: the running page as a wireframe, every drift as an amber break with the nearest token ghosted beside it, held as designed, and the causes listed by count"></p>

It compiles classes, stylesheets, `@apply` and inline styles with the project's own Tailwind, then judges every value against the project's tokens and written rules. Inline values written in code are read symbolically: constants fold, a ternary or a typed prop is read as every outcome, a token beside a runtime number is judged by the token, and `k * STAGGER` is judged by its step. The families are spacing, colour, radius, type, motion, elevation and z-index, plus team habits, component overrides and hand-built copies of components. A ledger records accepted debt and reasoned exceptions, so CI fails only on new drift. Node 22.18 or newer is required.

### Why "plumb"

A plumb line is the builder's oldest instrument: a weight on a string that shows whether a wall is true. That is what this tool does for an interface, so the project and its repository are called **plumb**, and the tagline on the site is "every pixel has a plumb line". The package and the CLI are **React Plumber** and `plumber` because the tool reads React source, and because `plumber` on npm belongs to an abandoned package; publishing under the `@unlocalhosted` scope keeps the command `plumber` either way. The names mean one thing: Plumb the idea, React Plumber the thing you install.

## Quick start

### 1. Find the drift

```sh
npm install -D @unlocalhosted/react-plumber
npx plumber                 # report drift; exits 0 with no config
npx plumber init            # write plumber.config.ts and a baseline of today's findings
npx plumber check           # green: only new drift fails from here
npx plumber install --ci    # add the GitHub Action
```

`init` infers the token sources, turns on four habits, lists the rest with their counts, and records the baseline. `plumber doctor` checks Node, Tailwind, the CSS entry, config, ledger and cache, with a fix on each line.

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

Start your dev server as usual. Then:

| Gesture | What happens |
| --- | --- |
| Hold **Alt** and hover | The element under the pointer is outlined, with its component and how many values are off the scale. |
| **Click** while holding Alt | Pins a reading: the exact JSX that made the element, and each off-scale value with the tokens that fit. |
| **Alt+↑ / Alt+↓** | Steps between the element's JSX and the components above it. |
| Pick a token | Previews it on the live page. **Before** shows the source version, **Undo** lifts every preview. |
| **Write** | Writes exactly the previewed edit to the source file. The dev server reloads and the reading updates. |

#### Blueprint mode

Press **Alt+B** and the whole view becomes its own blueprint, a wireframe of the running page with every drift drawn where it lives. Words become bars. Gaps on your scale are faint dimensions named by their token; rails on the left and top margins read the page's rhythm. Anything off the scale is an amber break on its own geometry, with the nearest token ghosted in mint beside it at its own size. Each element carries a count, a red wash says how far it sits from the system, and the title block lists the causes of the drift by count, the first line being the decision that closes the most. Nothing else is lettered at rest.

| Gesture | What happens |
| --- | --- |
| **Alt+B** | Blueprint on or off. **Esc** also leaves, and the page is put back exactly. |
| **Point** at a break, or **Tab** to it | One note in words: what is off, the nearest tokens, what a click does. |
| **Click** a break, or **Enter** | Opens its chooser. Pointing at a step previews it; clicking picks it. Several picks go in one **Write**. |
| **Hold D** | The view as designed: every drift takes its nearest token at once and the ink turns mint. Release puts it back. |
| **L** | The punch list: every drift in view in rows. |
| Point at a cause in the title block | Outlines every element it touches. |

If your app hydrates HTML that was prerendered outside the dev server (a build script that bakes pages into `index.html`), that HTML has no stamps, and React reports a hydration mismatch in dev and renders the page again. Use `plumb({ stamp: false })` there; React Plumber then finds positions through React's owner chain instead.

React Plumber writes only to a position it has proven. In development, `plumb()` stamps each JSX tag in your tracked sources with its file, line and column, in the served code only; your files are untouched and production builds carry nothing. React Plumber then confirms the position against the file on disk before it edits. When it can't prove a position, it says why instead of guessing.

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

Use `--verbose` to include internal lowering/CSS notes in text output; JSON retains notes by default. Use `plumber --help` for flags. JSON reports follow [report.schema.json](https://github.com/unlocalhosted/plumb/blob/main/schema/report.schema.json). With no config and no ledger, a check exits 0 and prints findings plus instructions to run `plumber init`. With config or a ledger, error findings exit 1. Usage or config errors exit 2.

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

The encoded folder serves `/__plumb/*`; [Next.js treats literal underscore-prefixed folders as private](https://nextjs.org/docs/app/getting-started/project-structure#private-folders). Import `PlumbOverlay` from `@unlocalhosted/react-plumber/next` and render `<PlumbOverlay />` inside your root layout's `<body>`. The component server-renders the process token, and the client sends it as `x-plumb-token`. Routes reuse one Session across hot reloads. Production and `output: 'export'` builds never discover `route.plumb.ts`; the component renders nothing and imports no Session implementation. Keep the `.plumb.ts` suffix: renaming it to `route.ts` defeats build exclusion. `createPlumbRoute` accepts Session options, including `root` and `config`; the first active route initializes the process Session.

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

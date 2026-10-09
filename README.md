# Plumb

Plumb is a CLI for Tailwind v4, CSS and React projects. Its planned checks compare the CSS declarations produced by UI code with a team's tokens, component contracts and written styling rules. The [design](docs/DESIGN.md) describes those checks and their build layers.

Status: **all ten layers built, not yet published (0.0.0)**. Plumb lowers classes, stylesheets, `@apply` and inline styles to the CSS they produce with the project's own Tailwind v4, and judges them for dead classes and variables, provenance in seven families (spacing, colour, radius, type, motion, elevation, z-index), team habits, component ownership and hand-built copies of components. A ledger records accepted debt and reasoned exceptions so CI fails only on new drift. Output comes as text, JSON, SARIF, GitHub annotations and per-site agent instructions. Layer notes are in [docs/layers](docs/layers) and measurements against MetalUI in the [benchmark](BENCHMARK.md). Node 22.18 or newer is required.

From this checkout, install dependencies and run:

```sh
npm install
npm run build
node dist/cli.js --root ./fixtures/tailwind-min
node dist/cli.js check --json --root ./fixtures/plain-css
node dist/cli.js explain src/Button.tsx --root ./fixtures/tailwind-min --json
node dist/cli.js explain src/page.css --root ./fixtures/stylesheets-inline --json
npm test
```

The package is named `@unlocalhosted/plumb` and exposes the `plumb` binary when installed. Config is optional. Place `plumb.config.ts`, `.mts`, `.mjs` or `.js` in the project root, or pass `--config <path>`. Relative config and CSS paths resolve from `--root`; the default root is the current directory.

```ts
import { defineConfig } from '@unlocalhosted/plumb'

export default defineConfig({
  css: 'src/styles.css',
  source: ['src/**/*.{tsx,jsx,ts,js,css}'],
  markers: ['js-*'],
  classHelpers: ['joinStyles'],
})
```

Use `--verbose` to include internal lowering/CSS notes in text output; JSON retains notes by default. Use `plumb --help` for flags. JSON reports follow [report.schema.json](schema/report.schema.json). Exit codes are 0 for success, 1 for error findings (including the first run), and 2 for usage or config errors.

## Layer 9 surfaces

```sh
plumb check --sarif > plumb.sarif
plumb check --base origin/main --format github
plumb check --changed --agent
plumb agent-docs
plumb install --hooks
```

SARIF 2.1.0 retains every finding site, including debt and exceptions, with ledger fingerprints and `new`/`unchanged` baseline state. Scoped GitHub annotations show new drift, touched debt with its key, and touched exceptions with their reasons on changed lines. Agent instructions include only new sites within the requested file scope. `--changed` means tracked files changed versus HEAD, including staged edits, plus untracked files; `--base` compares against the supplied ref. Both still analyze the whole project so imports and decisions resolve correctly. Formats are mutually exclusive.

GitHub output includes a plain Markdown summary and appends it to `GITHUB_STEP_SUMMARY` when set. Coverage delta and fixed counts with `--base` come from analyzing an isolated copy of the base sources with existing dependencies linked for reads. The programmatic API exports `githubSummary(report, baseReport?)`, returning `{ title, lines }` sections, and `renderSummary(sections)` for the default Markdown. No score is computed.

`--agent` groups fixes by finding, lists only new sites, includes compiled declarations and decision reasons, and gives exact edits when one candidate and the authored syntax make the edit unambiguous. Multiple candidates require a choice. The loop stops on `0 new`; unresolved choices are `NEEDS-DECISION`. Do not change config, ledger or theme to pass. `agent-docs` writes `PLUMB.md` from the same decision records and enabled habit configuration, and prints a short block to paste into AGENTS.md or CLAUDE.md. Optional ownership records are included when available; missing ownership or habit reasons are stated explicitly.

Hook installation merges `.claude/settings.json` `PostToolUse` (`Edit|Write|MultiEdit`) and `.cursor/hooks.json` version 1 `afterFileEdit`, preserving other settings and hooks. It prints the before/after diff and is idempotent. Both run `plumb check --changed --agent --strict-ledger`; install Plumb on PATH first. These post-edit hooks provide feedback after a write; they do not undo edits. Supported formats: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [Cursor hooks](https://cursor.com/docs/hooks).

## GitHub Action

The repository-root `action.yml` installs this Action checkout's locked dependencies, builds Plumb, runs `plumb check --base <PR base> --format github`, writes the job summary, and creates or updates one `<!-- plumb-summary -->` PR comment. The checked project must already have its dependencies installed. The runner also reads a JSON report for the ledger approval gate. It uses GitHub REST, paginates reviews/comments, and only updates marker comments authored by `github-actions[bot]`.

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

Verification and limits: [Layer 9 notes](docs/layers/9-surfaces.md). The Action runner and approval script are tested over disposable fixture PRs and GitHub API response fixtures, with a local REST server. This verifies create/update, approval failure/success and CLI execution; it is not a hosted GitHub run.

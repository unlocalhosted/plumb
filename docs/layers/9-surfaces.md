# Layer 9: surfaces

Built only the output and agent/CI integration layer over the existing compiler, decision record and ledger. No packages installed or worktree commits made. No MetalUI writes. `formatText`, `formatFinding` and `brief` remain byte-for-byte unchanged; the report change is an optional per-site Git scope flag. No project-specific mapping enters `src/`.

## Output

- `--sarif` emits SARIF 2.1.0 with a driver name/version, rule IDs and indexes, descriptions and help from each rule's finding why/fix, messages, relative encoded file URIs, positive source regions and UTF-16 column semantics. Every `finding.sites` entry becomes one result. Debt and exceptions have `baselineState: unchanged`; new sites have `new`. SHA-256 partial fingerprints derive from the authored ledger key, also retained in result properties. Scope remains separate from acceptance; SARIF retains out-of-scope sites as data.
- `--format github` emits escaped error/warning/notice workflow commands for new in-scope sites only. Percent signs, newlines, commas and colons cannot break command syntax. A plain Markdown summary is printed and appended to `GITHUB_STEP_SUMMARY` when supplied.
- `githubSummary(report, base?)` returns `{ title, lines }` sections; `renderSummary` is their default Markdown rendering. The summary has family coverage, percentage-point delta against base, new/fixed/debt/exception counts and every ledger growth line. Families without project decisions say `no decisions`. Fixed counts compare authored ledger identities and counts, so moving lines does not invent fixes.
- Base coverage comes from the same CLI analyzing an isolated `git archive` of the supplied ref. Existing dependencies are linked for reads; base cache writes go to a temporary directory, or the explicitly supplied `PLUMB_CACHE_DIR`. Archives are capped at 256 MiB and analysis has a 60-second timeout. Missing/incompatible base configuration is an explicit usage error, rather than a fabricated delta. An external explicit preset is reused; its own sources must support both revisions. Installed dependency versions are those of the current checkout, not reconstructed historic installations.

## Agent loop and docs

`--agent` groups new sites by finding and lists every location, exact compiled declaration, candidate value/use/reason, and the fix text. It reuses provenance's `useFor` to adapt a single candidate to each actual property. An exact replacement is emitted only when a candidate has a compiler-backed utility or an unambiguous CSS/inline variable reference. Variants and importance survive class edits. Multiple candidates remain a decision for the agent; no closest-value guess is made. Shared rules prohibit config/ledger/theme edits, require another check, allow NEEDS-DECISION with sites and wanted value, and stop on `0 new`. Global ledger/decision errors count in the agent's terminal count, so a failing strict check cannot announce `0 new`.

`agent-docs` writes PLUMB.md from the enforced decision records and policy configuration: ladders, values, refs, origins, tiers, identity, caller tiers, source reasons, enabled habits and the same loop. Changing a source why changes PLUMB.md. The command prints a short AGENTS.md/CLAUDE.md block but does not modify those files. Optional ownership records are reproduced as recorded data so no unavailable Layer 7 contract is invented. Missing ownership and missing built-in habit reasons are explicit; custom habit messages come directly from config. This layer does not implement or invent habit enforcement.

`--changed` scopes new sites to tracked files changed versus HEAD plus untracked files, using the ledger's existing Git helper. Staged and unstaged changes are included. The engine still analyzes the complete project for decision/import context. `--changed` and `--base` are mutually exclusive; strict ledger/config comparison remains global.

## Hooks

`install --hooks` validates both existing files before writing, merges Claude Code `.claude/settings.json` `PostToolUse` on `Edit|Write|MultiEdit` and Cursor `.cursor/hooks.json` version 1 `afterFileEdit`, preserves unrelated keys/events/hooks, writes each settings file through a temporary rename, and prints a before/after diff. Reinstallation is byte-preserving when the hook is already present. Invalid JSON, nonobject settings/hooks, nonarray event records and unsupported Cursor versions refuse before either settings file changes. This is per-file atomicity, not a cross-file filesystem transaction.

Both run `plumb check --changed --agent --strict-ledger`; Plumb must be on PATH. Formats checked 2026-10-09 against [Claude Code's hook reference](https://code.claude.com/docs/en/hooks) and [Cursor's hook reference](https://cursor.com/docs/hooks). Cursor has a documented equivalent, so it is installed rather than skipped. These post-edit hooks provide feedback; they do not roll back writes or intercept arbitrary shell edits.

## Composite Action

Root `action.yml` installs this Action checkout's locked dependencies, builds the CLI and runs `plumb check --base <PR base> --format github` against the caller's project. Project dependencies and Git base history must already be present. The runner transfers annotations and summary, reads JSON for ledger growth, paginates REST reviews/comments, and creates or updates one `<!-- plumb-summary -->` comment belonging to `github-actions[bot]`. A contributor's spoofed marker comment is ignored. Summaries exceeding the comment limit are truncated with a pointer to the full job summary.

`ledger-approvers` accepts comma/space-separated case-insensitive usernames, with optional @. Growth requires an effective APPROVED review from a listed user. Later CHANGES_REQUESTED or DISMISSED states revoke it; COMMENTED does not. Listed PR authors are exempt. Empty lists fail on growth with a clear configuration message. Approval does not excuse CLI errors. Review events should rerun the workflow. The README documents inputs, permissions, checkout history, trusted Action pinning and fork-token limits.

Approval code runs as a standalone script over committed GitHub API JSON response fixtures. The Action runner e2e runs the real CLI against a disposable fixture PR and a local REST server, verifies a denied ledger growth, then approval and sticky PATCH rather than a second POST. No remote GitHub comment was sent. A hosted GitHub run is not claimed.

## Verification

All tests are node:test integration/e2e over the compiled CLI, fixture projects or the executable Action approval/runner scripts; no unit tests added. Acceptance covers required SARIF fields and baseline fingerprints, mixed debt/new annotations, untracked scope, source-based coverage and fixed delta, filename/message escaping, grouped agent instructions, scripted exact gap-10 edit reaching `0 new` with unchanged ledger, strict failures preventing that terminal state, decision-derived docs and idempotent hook merging/refusal.

`npm test`: **96 passed, zero failures/skips**. `npm run typecheck` and `git diff --check` pass. Protected text functions were compared against HEAD and are unchanged. The read-only benchmark is `bench/metalui/surfaces.mjs`, with `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer9`. Measurements and MetalUI HEAD are in `bench/metalui/layer9.run.json` and the appended BENCHMARK section. No deployment, package publication or hosted PR Action execution occurred.

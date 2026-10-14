# React Plumber rename result

Implemented the rename. Build, migration, package-install, and site checks pass. Acceptance remains incomplete: this environment cannot launch the requested Chrome, and repository permissions prevent commits and `git mv`.

## Changes

- Package: `@unlocalhosted/react-plumber`; sole binary: `plumber`. Export shape remains `.`, `/vite`, `/next`, `/next/config`.
- CLI/help/diagnostics, report metadata/schema titles, action text, README, root Markdown docs, and packaged agent instructions use React Plumber and `plumber` commands. The Action still targets `unlocalhosted/plumb`.
- Shared path resolution discovers `plumber.config.{ts,mts,mjs,js}` before legacy names, and uses `.plumber/` for ledger, daemon discovery, and caches.
- Existing legacy config files remain the write destination during `init --force`. Existing `.plumb/` remains the destination for all state reads/writes when `.plumber/` does not exist. When both state directories exist, `.plumber/` wins. No state is copied or merged automatically.
- One migration notice goes to stderr per CLI/host process; analysis workers do not repeat it. JSON remains on stdout.
- `PLUMBER_*` takes precedence over corresponding `PLUMB_*` fallbacks, including cache, watch/polling, profiling, Tailwind, Next adapter, Chromium harness, and Action settings.
- Ledger Git comparisons recognize pre-migration history. Config renames preserve baseline comparisons. New-config sessions avoid probing unused legacy candidates on each targeted request.
- Skill moved to `skills/plumber/`; installation targets `.claude/skills/plumber/SKILL.md` and corresponding plumber rule files. Generated token-reference docs use `PLUMBER.md`.
- Fixture and benchmark config names/references updated. Site config moved to `site/plumber.config.mjs`, state to `site/.plumber/`; Vite config points to the new name. Site ledger bytes are identical to the original.
- All five recording/generation scripts ran against the built CLI. Changes under `site/src/` are confined to `site/src/docs/recordings/`. The reference generator also rewrites older evidence/report files; those out-of-scope changes were restored.
- No overlay source/UI wording changed. Existing `plumb()`/Next exports, custom elements, attributes, routes, token header, CSS variables, DOM events, sessionStorage, process registry symbols, and preset metadata identifiers remain unchanged.

## Compatibility: actual command output

Commands ran in a disposable copy of `fixtures/adoption`; output paths below are relative to that fixture.

```text
$ plumber init
exit: 0
Wrote plumber.config.ts with inferred token sources.
Components: 2 found from directory:src/components/ui.
Baseline: 9 debt entries (9 locations) in .plumber/ledger.jsonl.
Accepted 3 tokens as inferred.
Next steps: run plumber install --ci.
new config: true; new ledger: true
```

After moving that config/state back to legacy names, `plumber init --force` exited 0, printed exactly one migration notice and a config diff, and wrote the legacy config/state again. Its baseline output named `.plumb/ledger.jsonl`.

```text
$ plumber accept-decisions --why migration proof
exit: 0
stderr: React Plumber: legacy names in use; migrate with mv plumb.config.ts plumber.config.ts; mv .plumb .plumber.
Accepted 3 current decisions.
$ plumber check --json
exit: 0
stderr: React Plumber: legacy names in use; migrate with mv plumb.config.ts plumber.config.ts; mv .plumb .plumber.
{"config":"<fixture>/plumb.config.ts","new":0}
legacy ledger: true; new directory: false
```

The JSON line above projects the real report to its config path and new-site count. Migration e2e coverage additionally proves all four config extensions, new-name precedence, daemon discovery/client reuse and cleanup, both environment-variable paths, and Git comparisons across migration.

## Verification

- `npm run build`: passed.
- Required full command ran: `PLUMB_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`.
- Its primary serial run reported **391 tests: 345 passed, 44 failed, 2 skipped**. It exited 1 before npm's chained polling/no-watch runs.
- 36 failures in that run were Chrome launch failures. Chrome exited `SIGABRT`; Playwright reported `browserType.launch: Target page, context or browser has been closed` and process-control `kill EPERM`. Browser behavior therefore remains unverified.
- Other failures found stale rename expectations/bin invocations, internal-symbol expectations, additional config-probe overhead, and a frozen-input copy racing concurrent temporary verification fixtures. Those source/test issues were corrected; the frozen test passed when rerun in isolation.
- Final focused CLI/adoption/try/migration/ledger/cache run: **110/110 passed**.
- Final host-restart/startup and bounded-request regression checks: **3/3 passed**.
- Generated-docs/theme follow-up: **12/12 passed**.
- Frozen-input test follow-up: **1/1 passed**.
- Additional real packed-install e2e: **1/1 passed**. It installs the tarball, verifies only `node_modules/.bin/plumber` exists, executes its real check command, imports the package and Vite adapter, and resolves both Next exports. The migration file now contains 15 integration tests.
- Polling mode run explicitly: **26 tests, 25 passed, 0 failed, 1 skipped**.
- No-watch mode run explicitly: **26 tests, 23 passed, 0 failed, 3 skipped**.
- Final serial non-browser sweep: **361 reported tests, 359 passed, 0 failed, 2 skipped; exit 0**. It explicitly excluded 37 Chrome-dependent case names via `--test-skip-pattern`, including the packed browser walkthrough. These are the runner's reported counts (fully excluded files can appear as file-level results); they are not a green full-browser suite. The remaining two reported skips are the OS native-watch probe (`EMFILE`) and the polling-only case in native mode.

`node dist/cli.js check --root site` still exits 1 for exactly the hero's six deliberate visible findings:

```text
React Plumber 0.1.0  <repo>/site  tailwind 4.3.3  theme src/styles.css
...
6 findings: 6 values off your tokens
```

The six are `p-[21px]`, `gap-[13px]`, `px-[15px]`, `rounded-[10px]`, `rounded-[3px]`, and `text-[15px]`, all in `site/src/hero/DriftedCard.jsx`. The report loads `site/plumber.config.mjs`; ledger allowances come from `site/.plumber/ledger.jsonl`. JSON also retains informational/known findings, as before.

`npm_config_cache=/tmp/plumber-npm-cache npm pack --dry-run --json` passed. The temporary cache avoids the environment's unwritable default npm cache.

```json
{
  "name": "@unlocalhosted/react-plumber",
  "filename": "unlocalhosted-react-plumber-0.1.0.tgz",
  "entryCount": 209,
  "bin": { "plumber": "./dist/cli.js" }
}
```

The archive includes `skills/plumber/SKILL.md`; the real packed-install e2e separately verifies executable behavior and exports.

## Commits and remaining blockers

No commits or push were made. The attempted first commit failed before staging:

```text
fatal: Unable to create '/Users/vijaysingh/unlocalhosted/plumb/.git/index.lock': Operation not permitted
```

This session has read-only access to `.git` and cannot request escalation. Thus the required atomic commits and `git mv` could not be performed. Filesystem renames were made; Git shows old paths deleted and corresponding new paths untracked until staged. Unrelated pre-existing work was preserved.

Intended commit layers:

1. `feat!: rename package and CLI to React Plumber` — package/bin, imports, CLI/schema/Action surfaces and matching integration expectations.
2. `feat: migrate config and state with fallback` — path/environment resolution, config/state renames, migration integration coverage, watcher/cache behavior.
3. `docs: adopt React Plumber naming` — README/docs, packaged skill/install paths, generated token-doc naming.
4. `docs: regenerate React Plumber recordings` — recorder changes, regenerated recordings and this report.

Each commit must end with:

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Full acceptance still requires the requested unfiltered `npm test` in an environment that can launch Chrome, plus the four commits with writable Git metadata. No browser failure was converted to a pass or silently skipped in the required full run.

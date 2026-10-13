# Recordings sanitization result

Completed using existing `dist/`. No build, staging, or commit.

All recorders now share `scripts/docs/recording.mjs`: recursive path normalization covers nested finding objects and captured stdout/stderr, and serialization rejects remaining local absolute paths/home directories. Fixture paths become fixture-relative; other repository paths become repo-relative. Recorded CLI commands use `plumb <args>` with the fixture-root `--root` omitted. Arguments requiring shell quoting retain it. No `invocation` field was needed or added.

## Regeneration

All five commands succeeded:

```sh
node scripts/docs/record-decisions.mjs
node scripts/docs/record-judged.mjs
node scripts/docs/record-finding.mjs
node scripts/docs/record-ledger.mjs
node scripts/docs/gen-reference.mjs
```

Regenerated all eight recordings: `decisions.json`, `judged.json`, `finding.json`, `ledger.json`, `ref-cli.json`, `ref-config.json`, `ref-rules.json`, and `ref-report.json`. Results include 176 decisions, five judged cases, 20 CLI help captures, and seven ledger CLI steps plus two file edits. Decisions were refreshed against current site tokens, including updated source lines and token records.

## Field changes

- `ledger.steps[].change` replaced by `edit: { file, before, after }` for `add-new-drift` and `fix-old-drift`. `before`/`after` contain the actual complete file contents. Those edit steps no longer contain `command` or `exitCode`; writes happen directly in the disposable fixture copy.
- `git-init` and `git-author` removed from `ledger.steps`; Git initialization and the fixed recording author remain described in `setup` prose.
- `ledger.root` now contains `fixtures/docs-judged/`; step `cwd` is `.`. Captured terminal headers also use `.` instead of the temporary fixture directory.
- CLI `command` values and reference `examples` now use public `plumb` commands. Finding object paths are fixture-relative; reference example paths remain repo-relative.
- `judged.regenerate` no longer includes a build. No other fields renamed; schema versions unchanged.

## Verification

```sh
grep -rnE "/Users/|/var/folders|/private/|\\\\Users" site/src/docs/recordings
```

Printed nothing; exit status 1 (no matches).

Additional artifact checks passed: all eight JSON files parse; all 31 `command` fields use `plumb` without fixture-root flags; all 724 file/entry/cwd/root fields are relative. No current username, home directory, system temporary directory, or generated recorder temporary-directory name remains. Finding terminal lines reconstruct `terminalText` exactly, and its sanitized finding matches the judged recording's arbitrary-class finding.

Ledger checks passed: the first edit starts from the fixture's actual source, the second starts from the first edit's result, check preserves stored debt, ratchet shrinks debt, and acceptance ends with one exception and exit 0. The recorder also checks every actual CLI exit code.

`git diff --check` passed. `dist/`, HEAD, and the staged diff match the pre-run snapshot. This task wrote no `site/src` files outside recordings. A whole-site hash comparison detected concurrent unrelated edits in docs pages, `manifest.js`, `reference.jsx`, and `figures/LedgerSteps.jsx`; these were preserved. The reference generator's existing `reference-gen.result.md` was restored after regeneration so the requested report is the only report changed by this task.

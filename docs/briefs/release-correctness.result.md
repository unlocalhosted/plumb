# Release correctness result

Implements `docs/briefs/release-correctness.md` in order, with one atomic commit per item. Every commit ends with the requested co-author trailer. No unit tests added. `overlay/src`, site UI code and `../algorecall` were not changed; unrelated existing work was preserved.

## Changes and commits

| Item | Commit | Change and user-facing proof |
| --- | --- | --- |
| G2 | `e8a1401` | Normalize installer containment paths like the session engine. Audit all `src` parent-traversal and root-prefix checks; repair snippet containment, external decision-source classification, Git cross-drive rejection, base-config containment and slash-joined CODEOWNERS ledger paths. Existing native-separator and already-normalized guards remain valid. |
| D3 | `be3ebb7` | Share complete per-command flag acceptance between CLI validation and reference generator through `src/cli-flags.ts`, with no universal restriction fallback. Regenerate CLI display data and cited reference artifacts. E2E invokes all **152 listed flags across 20 commands** using the real CLI, with required values/companion flags and real server/watch startup. Family is limited to decisions; doctor/install/serve exclude JSON, and serve excludes verbose. |
| D1 | `6eeb5d5` | README lists `hover-gate`, `focus-outline`, `transition-named`, `no-ease-in`. Adoption E2E compares the README list directly with the config written by real `plumber init`. |
| D2 | `7379b31` | Change documented token-reason maximum from 100 to **72 characters**, matching code. |
| G4 | `7b12a3d` | Missing Tailwind and v3 fail before compiler loading with the same Tailwind 4 fix used by doctor. Overlay install explains missing React before wiring, including `--write`, and states that plain CSS checks work without React. Scratch-fixture E2Es verify exact messages, no require/compiler stacks, and unchanged exit codes. Message drafts are recorded in `docs/MESSAGES.md`. |

G2 proof runs the real CLI installer and real filesystem I/O with `node:path.relative` adapted at the OS boundary to call `path.win32.relative`. A receipt proves the installer encountered `..\\` paths. Valid Vite installation succeeds; escaped config symlinks and Next route ancestors refuse before any planned file is written. This is a Windows-semantics integration test, not a predicate-only test or a claim of a native Windows run. No Windows CI job was added.

G4 exit codes remain: missing Tailwind/v3 checks **2**; doctor reports **1** for those incomplete setups; no-React advisory overlay install **0**; no-React Vite `--write` **0** with guidance; unsupported-host `--write` **2**. React guidance does not block existing explicit host wiring.

## Validation

Focused checks, before the final suite:

- Build passed.
- G2 installer checks: **2 passed**; adoption/preset/snippet feature suites: **36 passed**.
- D3 CLI/reference feature suites: **46 passed**, including all 152 reference flag invocations.
- D1 real init transcript: **1 passed**.
- G4 unsupported-setup checks: **4 passed**; installer regression checks: **2 passed**.
- `git diff --check` passed.

Required final command:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

**Passed in full, exit 0**, including the build and all three test stages:

| Stage | Tests | Passed | Failed | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Serial full E2E, native watch | 405 | 404 | 0 | 1 | 597.52 s |
| Serve E2E, polling | 26 | 25 | 0 | 1 | 41.32 s |
| Serve E2E, watch disabled | 26 | 23 | 0 | 3 | 38.59 s |
| Total test executions | **457** | **452** | **0** | **5** | **677.43 s** |

No cancelled tests. Skips are intentional mode-specific scenarios: polling-only test in native mode; native-only test in polling mode; native-only, polling-only and native-hint recovery tests with watching disabled. Browser scenarios ran with the requested Chrome executable.

Five new top-level E2Es were added (one Windows installer boundary, one complete CLI-reference flag matrix, three unsupported-setup scenarios); the existing adoption transcript was extended for README defaults. Focused-run counts above overlap with the full suite and are not additional unique tests.

Full local transcript: `/tmp/plumber-release-correctness-full.log`. Final `git diff --check` passed; all five implementation commits carry the exact requested trailer.

This result is committed separately as `docs: record release correctness results` after final validation.

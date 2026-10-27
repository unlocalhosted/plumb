# Release audit: React Plumber, main after the fix panel (2026-10-28)

The package `@unlocalhosted/react-plumber` as it stands on `main` (97 unpushed commits since `origin/main`, from the
craft engine through the fix panel), read for correctness and safety first, then prepared for `npm publish`. Nothing was
pushed, tagged or published; the owner does that from the checklist at the end.

Scope rule honoured: the e2e migration to the fix panel was running at the same time, so `e2e/**` (existing files) and the
overlay UI modules (`fixpanel.js`, `blueprint*.js`, `select.js`, `inplace.js`, `changes.js`, `widget.js`,
`walkthrough.js`, `help.js`, `readiness.js`, `scrub.js`, `overlay/demo/**`) were not edited. Problems there are reported
with file and line.

## 1. Findings, ranked

No critical finding, and no high finding in the code that ships; the one high (H1) is a test that keeps CI red. The write paths are careful to a degree that is rare: every write re-reads the file
under an `O_NOFOLLOW` handle, compares the hash the client saw, refuses hard links and symlinks, re-derives the edit
from the current source (never from client text), parses the result (`parsesAsBefore`), reconciles, and records an undo.

### High

| # | What | Where | Evidence | State |
| --- | --- | --- | --- | --- |
| H1 | **CI is red** and has been since the spec layer (196a88b): `dist/habits/index.js` imports `../overlay/src/craft-spec.js`, and the packaging simulation in `e2e/adoption.test.mjs:278` copies `dist` without `overlay/`, so the shipped CLI it runs cannot start. The real tarball is unaffected (`overlay/src/*.js` ships), but `npm test`, and so `prepublishOnly`, fails on every machine. | `e2e/adoption.test.mjs:278`; `src/config.ts:14`, `src/craft-spec.ts:6` | Fails in the real repo on its own (`node --test --test-name-pattern "enclosing consumer" e2e/adoption.test.mjs`): `ERR_MODULE_NOT_FOUND …/overlay/src/craft-spec.js`. | Reported (e2e not edited): add `'overlay'` to the copied paths in the test, or move the standard's data from `overlay/src/craft-spec.js` into `src/` so `dist` stands alone. Must be fixed before `npm publish`, which runs the suite. |

### Medium

| # | What | Where | Evidence | State |
| --- | --- | --- | --- | --- |
| M1 | A token value could be written as a dead declaration. `0.06em */` and `1 "` passed the value regex; neither changes the top-level block count `topBlocks` guards, but the CSS parser drops the declaration, so the overlay believes a token exists that the theme does not have. | `src/session/engine.ts` `Session#token` | Reproduced through the dev server and Chromium with `POST /__plumb/token` (new test `e2e/release-guards.test.mjs`). | **Fixed** (d067af4): a value may not contain `; { } < > \` newline`, `/*` or `*/`, or an unbalanced quote. Balanced quotes (`"Inter", sans-serif`) still go in. |
| M2 | A refused token write is silent in the overlay. `#applyAll` posts each new token with `.catch(() => null)`; when the server refuses (stale theme hash, config forbids tokens, name taken) the panel still folds as if done, and the class swap that depended on it never happens. | `overlay/src/blueprint.js:276` | Code read; the server's refusal reasons are all `UsageError`s with a sentence to show. | Reported. Suggested: collect the error like `#apply` does (`out.push({ el, ok: false, why })`) and let the panel show "Couldn't add --x: …" on the cause. |
| M3 | `--judge` sends page crops to an external vision model (Anthropic's API) when `ANTHROPIC_API_KEY` is set. Opt-in and documented in the code, but the README said nothing about it. | `src/craft-judge.ts:28` | Code read. | **Fixed in docs** (52a2c25): the README names the service, the key and that answers are kept under `.plumber/judge`; never when `CI` is set. |
| M4 | The Vite plugin's API trusts only `localhost`, `127.0.0.1` and `[::1]` as the Host. A dev server reached as `app.localhost:5173`, through a Codespaces or Tailscale forward, or with `server.allowedHosts`, gets 403 on every `/__plumb/*` request (the overlay stays silent; `plumber doctor` cannot see why). `allowedHosts` exists on `createHandler` but `plumb()` does not expose it. | `src/session/server.ts:213`, `src/hosts/vite.ts:92` | Code read. | Reported. Safe by construction (this is what stops DNS rebinding); the gap is reachability, not safety. Suggested: `plumb({ allowedHosts })` passed through, or read Vite's `server.allowedHosts`. |

### Low

| # | What | Where | State |
| --- | --- | --- | --- |
| L1 | In-place writes are not crash-atomic: `handle.writeFile` then `truncate` on the held descriptor. A process kill between the two leaves a mix of old and new bytes. The inode is held on purpose (symlink and hard-link guards), so a temp-and-rename would need a different guard design. The window is microseconds and the undo copy is in memory only. | `src/session/engine.ts` `writeText`, `apply`, `undo`, `token` | Reported. |
| L2 | `token` with `then`: when the swap is refused the theme write is undone, but a failing undo is swallowed (`.catch(() => {})`) and only the swap's error reaches the client. | `src/session/engine.ts:714` | Reported. |
| L3 | Windows paths are handled at the boundary (`sourcePath` interprets `\`), but `tracked(relative(root, file))` in `inventory()` and `retainedFiles()` is tested on native separators while its regex expects `/`; `node_modules` and friends are also excluded by the glob, so the effect is only a few extra stats. CI runs Ubuntu only; Windows is unverified. | `src/session/engine.ts:149,207` | Reported. |
| L4 | `console.debug('[plumb] overlay connected', health)` on every page load in dev. | `overlay/client.js:29` | Reported (deliberate dev signal; keep or drop). |
| L5 | Retired modules still ship and are still imported: `blueprint-fix.js` (760 lines, `Fixer` imported by `widget.js:29`), `walkthrough.js` (imported by `blueprint.js:31`; `offerWalk` returns early), the `.bpp, .cg, .sel { display: none }` rule in `fixpanel.js` that hides the old chrome instead of not mounting it. | `overlay/src/widget.js:29`, `overlay/src/blueprint.js:31,212`, `overlay/src/fixpanel.js:32` | Reported for the migration: remove the imports, delete the two files and their entries in `src/hosts/client.ts` `overlayModules`, then `npm run notices`. |
| L6 | 27 exports in `src/` have no importer outside their file (heuristic scan): `cli-report.ts formatAll`, `craft-spec.ts tokenTarget`, `hosts/source-stamping.ts stampJSX`, `onboarding/state.ts rungNames/hasStyledTemplate/themeValues/nearValues`, `report.ts formatFinding`, `rules/provenance.ts isJudgedSpacing/spacingProvenance`, `session/client.ts clientReport`, `setup-messages.ts reactOverlayFix`, `surfaces/agent.ts loopRules`, and others. None is in the public `exports` map. | `src/**` | Reported; dropping them is a separate cleanup. |
| L7 | `docs/media/blueprint.gif` (linked from the README) shows the chooser-era blueprint, not the fix panel. | `docs/media/blueprint.gif` | Reported: re-record after the migration lands. |
| L8 | `e2e/packaging.test.mjs:118` pins `metadata.version === '0.1.0'`; the version bump must update that line (and the `uses: unlocalhosted/plumb@v<version>` expectation beside it) in the same commit. | `e2e/packaging.test.mjs:118-119` | Reported (e2e not edited). |

### Verified and found sound

**Write paths.** `swap`, `swaps`, `set`, `prop`, `apply`, `apply-text`, `apply-text-at`, `token`, `undo`
(`src/session/engine.ts`): stale-file hash checked three times (before open, on the held handle, after reconcile);
`parsesAsBefore` on every JS/TS write and a block-count guard on CSS; the edit re-derived from the file as it is;
`editableFile` refuses config and `.plumber/` files, symlinks (`realpath` must equal `resolve(root, inside)`), hard links
(`nlink !== 1`), and paths outside the workspace boundary; writes serialised through one promise queue per Session, so
two tabs cannot interleave, and a second tab's write fails on the hash. Two-file atomicity in `token` + `then`: the
theme goes back when the swap is refused. `swaps` refuses overlapping ranges. Class strings are edited token by token
inside the string as written; `quoted()` flips a quote that would end the string and refuses `\`, `${` in a template and
newlines. `plumber propose --write` / `init` (`src/onboarding/write.ts`): planned fully before any write, `atomicWrite`
(temp + rename) per file, every written file restored in reverse on a failure, a new theme file imported from the main
stylesheet (verified on a plain-CSS project). `plumber fix` (`src/readiness/index.ts applyReadinessFix`): the patch is
regenerated from the current config, never taken from the client; dirty files need `allowDirty`. `install --overlay
--write` (`src/adoption/overlay.ts`): all edits validated and contained before the first write.

**Server.** Standalone `plumber serve`: a 32-byte random token in `.plumber/serve.json` (mode 0600, directory 0700,
exclusive create), compared with `timingSafeEqual`; bound to 127.0.0.1; `--overlay` needs an exact `--origin`, CORS
answers only that origin and only `Content-Type` + `x-plumb-token`. Vite and Next hosts: loopback peer + Host in
{localhost, 127.0.0.1, [::1]} + `Origin` equal to the Host authority on every POST and on any request that carries
one + `Sec-Fetch-Site` not cross-site/same-site. So from another site in the browser: `fetch` with credentials is
refused by Origin, `no-cors` and `<img>`/`<script>` loads by `Sec-Fetch-Site`, DNS rebinding by Host. Readable through
the API: only tracked project sources (`Session#file` + `readableSource`), never config, never `.plumber`, never through
a symlink. Bodies capped at 1 MiB; `classes` at 64 KiB; batches at 256 calls; `requestTimeout` 10 s. The public overlay
modules are served without a token and contain none. `serveStdio` has no auth by design (it is the caller's own
process).

**Production builds.** Vite: `apply` returns true only for `serve` (or the explicit `demo` opt-in), so a build never
loads the plugin, injects no script and stamps nothing; the `site/` replay is that explicit opt-in. Next: `withPlumb`
is a no-op outside `development`; `createPlumbRoute` returns 404 in production and never imports the Session graph
(`webpackIgnore`/`turbopackIgnore`); `PlumbOverlay` renders `null`. `npm run build` and `tsc --noEmit` are clean.

**CLI.** Exit codes: 0 clean or no config and no ledger; 1 error findings (`check`, `craft`, `doctor`); 2 usage and
config errors. `--json` shapes carry `schemaVersion` (`check`, `craft`) and are stable across the run. Messages follow
`docs/copy/voice.md` (`✗ what happened` then `→ what to do`). Verified by hand on an empty folder, a folder with a
broken `plumber.config.mjs`, and a plain-CSS project without Tailwind: every command answers in one sentence with the
next step, and `craft` without Playwright's browser says how to install it or to set `PLUMBER_CHROMIUM`.

**Robustness.** React 18 and 19 are both in the suite (`fixtures/react18`, root on 19); Tailwind v4 is loaded from the
project's own `node_modules` with `@tailwindcss/node` when it matches; Next.js runs through `examples/relay` and
`e2e/blueprint-next-performance.test.mjs`; the blueprint reads a view as one `POST /batch` cohort (one lock, one
reconciliation, one round trip) and the performance rules in memory (batch reads per wave, no inherited restyles) are
upheld by the next-performance test.

## 2. What changed

| Commit | Change |
| --- | --- |
| d067af4 | `fix(session)`: the token value guard (M1), with `e2e/release-guards.test.mjs` proving it through the real dev server and Chromium. |
| 767f92b | `chore(release)`: `CHANGELOG.md` added to `files`; `sideEffects: false`; `next`, `tailwindcss`, `playwright` declared as optional peers (the Next adapter, the project's Tailwind, and `plumber craft` all load them from the project); keywords. |
| 52a2c25 | `docs`: README rewritten for what ships (reading, blueprint and the fix panel, `state`/`propose`/`init`, `spec`/`craft`, the `craft` config key, craft in CI, the judge's external call); the changelog entry below. |
| (this file) | `docs`: the audit. |

Not changed: the version (see §4), `e2e/**` (except the new file), overlay UI modules, CI workflow.

## 3. The package

`npm pack --dry-run` after the changes: **306 files, 629 KB packed, 2.26 MB unpacked** (plus CHANGELOG.md, ~6 KB).
Contents: `dist/` (1.36 MB, JS + .d.ts only, every file has a source), `overlay/client.js`, `overlay/src/*.js` and
`tokens.css` (0.83 MB; exactly the modules `src/hosts/client.ts overlayModules` serves, plus `craft-record.js` which
the headless run loads by path), `schema/` (3 JSON schemas), `skills/plumber/SKILL.md`, `action.yml`, `LICENSE`,
`THIRD_PARTY_NOTICES`, `README.md`, `CHANGELOG.md`, `package.json`. Not in the tarball: tests, fixtures, bench, docs,
demo, site, `.claude`, `overlay/dist`. The packaging test (`e2e/packaging.test.mjs`) installs the tarball into a fresh
project and runs the shipped CLI and overlay daemon; it is part of the suite below.

Licences: the only vendored code is bippy (MIT) and its embedded `@jridgewell/sourcemap-codec` (MIT); both notices are
generated into `THIRD_PARTY_NOTICES` by `npm run notices` and served as a banner on the vendor modules; the release gate
(`scripts/third-party-notices.mjs --check`) fails on a missing copyright line. Runtime dependencies: bippy (MIT),
lightningcss (MPL-2.0, used as a library, unmodified), magic-string (MIT), oxc-parser and oxc-resolver (MIT), picomatch
(MIT), tinyglobby (MIT). All compatible with the package's MIT licence.

`exports`: `.`, `./vite`, `./next`, `./next/config`, `./next/overlay`, each with `types`. `bin`: `plumber`. `engines`:
node >= 22.18. Peers: react, vite, next, tailwindcss, playwright, all optional.

CI (`.github/workflows/ci.yml`): Node 22 and 24, `npm ci` for the repo and `site/`, `playwright install --with-deps
chromium`, typecheck, `npm test` (build, notices, the whole e2e suite in four passes: native watch, the burst with a
bounded nursery, serve with polling, serve without watching). Everything in the suite runs in CI; `--judge` is never
exercised (it needs a key and is disabled when `CI` is set).

## 4. Version and changelog

Proposed: **0.2.0**. Since 0.1.0 the overlay's whole fixing surface changed (the chooser, the selection ring, the
Changes sidebar and the walkthrough are gone; the fix panel replaces them), new commands exist (`spec`, `craft`,
`propose`, `state`, `fix`) and new server routes (`token`, `swaps`, `prop`, `structure`, `spec`, `batch`), so this is a
minor bump, not a patch. Pre-1.0, a minor is the right signal for a changed UI. Not set here because
`e2e/packaging.test.mjs:118` pins `0.1.0` and that file belongs to the running migration: bump both in one commit
(`npm version minor --no-git-tag-version`, then the two literals in the test, then retitle the `Unreleased` heading in
`CHANGELOG.md` to `0.2.0 · <date>`).

The changelog entry is in `CHANGELOG.md` under "Unreleased (proposed 0.2.0)".

## 5. The final run

Full suite on a frozen copy of the tree (rsync without `node_modules`, `.git`, `dist`, `fixtures/.*`; `node_modules`
symlinked; built there; `node --test --test-concurrency=1 e2e/*.test.mjs` with
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`), after commit 52a2c25, with the
working tree's uncommitted `e2e/blueprint.test.mjs` and `overlay/demo` edits from the migration included as they stood:

### Run 1: the whole suite on a frozen copy of 52a2c25 (before the migration's later commits)

97 files, **666 tests: 626 pass, 39 fail, 1 cancelled** (72 minutes, machine at 15 GB used and load 13 throughout).
Every failure was rerun on its own, with clean fixtures, to find its cause:

| Cause | Files | Count | Verdict |
| --- | --- | --- | --- |
| **Retired UI still driven by the test** (`.sel .ring`, `.bpp .row`, `.cg`, the Alt card's `Write 1 edit`; the fix panel hides those with `display: none`) | craft, craft-hierarchy, verdict, blueprint, site-replay | 13 | Migration backlog. craft, craft-hierarchy, verdict and blueprint were migrated while this audit ran (af39056, 38beb01, a93e84e, 809e714); site-replay (`e2e/site-replay.test.mjs:77`) is not yet. |
| **Dirty demo fixture** (an earlier run had written `--tracking-caps` into `overlay/demo/src/styles.css` and `tracking-caps` into `Team.jsx`; the tests copy the demo as their app) | craft-spec, craft-token, craft-wave6, select (1), inplace (1) | 8 | Fixture. Restored with `git checkout`; craft-spec 4/4, craft-token 2/2, craft-wave6 2/2 pass on rerun. Rule from memory upheld: reset demo files after a run. |
| **Frozen-copy artifacts** (symlinked `node_modules` resolves outside the copy, so Next's dev server and Vite's `fs.allow` refuse; `bench/` was left out of the rsync; one commit of history, so `HEAD^` is missing; a 120-character scratch path pushes a JSON report past `spawnSync`'s 1 MB buffer) | next-install (3), shared-source next (2), presets, report (2), site-text, verify-frozen, verify-writes | 11 | Environment. Rerun in the real repo: next-install 6/6, presets 10/10, report 3/3, site-text 1/1, verify-frozen 1/1 pass. |
| **Real, at HEAD** | see below | 7 | Listed as findings R1–R6. |

### Real failures at HEAD (5550d91), each reproduced on its own in the real repo

| # | Test | What fails | Where it belongs |
| --- | --- | --- | --- |
| R1 | `adoption.test.mjs` "packaged CLI never uses its enclosing consumer repository HEAD as a React Plumber action pin" | `dist/habits/index.js` imports `../overlay/src/craft-spec.js` (the spec's data lives in the overlay since 196a88b), and the test's package copy at `e2e/adoption.test.mjs:278` copies `dist`, `package.json`, `skills`, `action.yml` but not `overlay/`. **CI has been red since the spec layer.** The published tarball is fine (it ships `overlay/src/*.js`). | e2e: add `'overlay'` to the copied paths (one word), or move the standard's data into `src/` so `dist` stands alone. |
| R2 | `shared-source.test.mjs` "shared source never borrows ancestor location" (vite and next) | The fix panel's rest line says "Everything matches your system" when elements could not be checked (shared source outside the root). The migrated test (5550d91) expects the panel to say they were not checked. | `overlay/src/fixpanel.js` (rest line): the migration's next step. |
| R3 | `select.test.mjs` "The cause in hand stays the cause in hand while the reader looks at the page again" and "A click on the empty page lets go of the cause in hand" | After a re-read the cause in hand changed from `items-center` (1 of 5) to `font-semibold` (1 of 4); a click on the empty page leaves the panel holding the cause. | `overlay/src/fixpanel.js` / `blueprint.js`: hold the cause by its key across reads; release on an empty-page click. |
| R4 | `inplace.test.mjs` "Two problems in two families on one label" | `text-[11px] was not reached`: the second cause on the label is not reached with → after the first is taken. | `overlay/src/fixpanel.js` (→ after Take). |
| R5 | `text-edit.test.mjs` "an expression says why it can't be" | A grid cell renders `{i + 1}`; `text-at` finds no owner string and falls back to the project-wide literal search, which now matches the demo's `Rules.jsx:13` (`n: '1'`, added in c90a311), so it answers "2 strings in source say these words" instead of "an expression". The blueprint case in the same file ("a double-click edits words through the glass") times out at 10 s. | `src/session/text-at.ts`: say "expression" when the element's own JSX child is one before searching the project, and never search the project for a one-character word. The glass case: overlay (`blueprint-glass.js`). |
| R6 | `blueprint-next-performance.test.mjs` | `progress.drift` is 434 on both hosts where the test expects 217: since 0131993 the craft engine lands one more mark on every one of the 216 cards. Either the expectation is stale or a craft rule fires on a plain card grid. `verify-writes.test.mjs` times out at 90 s twice (frozen and real) on a loaded machine; not classified. | Look at which rule marks every card (`plumber craft --url` on the test's fixture app); re-time verify-writes on an idle machine. |

### Run 2: the final run, at HEAD 5550d91

A fresh `git clone --shared` of HEAD 5550d91 (full history this time, `bench/` included, the demo fixture clean by
construction), built there, `node --test --test-concurrency=1` over 93 files, leaving out the five files that cannot run
truthfully from a copy with a symlinked `node_modules` (next-install, blueprint-next-performance, shared-source,
site-replay, site-text); those five ran in the real repo instead (results above and below).

**Frozen copy: 655 tests, 642 pass, 11 fail, 1 cancelled.** The eleven:

| Test | Cause |
| --- | --- |
| adoption: packaged CLI never uses its enclosing consumer repository HEAD… | **H1 / R1** (real, CI red). |
| blueprint: Enter on the Apply button that has focus writes the taken causes | **R7** (real, new): the panel's own Enter handler takes the key, so a focused Apply button writes nothing. `overlay/src/fixpanel.js`. |
| blueprint: Enter on a glow that has focus puts that glow's cause in hand | **R7**: Enter on a focused glow holds the first cause, not the glow's own. `overlay/src/fixpanel.js` / `blueprint-marks.js`. |
| select ×2 | **R3** (real, consistent across three runs). |
| text-edit ×2 | **R5** (real, consistent across three runs). |
| verify-writes: frozen overlay Write… | 90 s timeout, three times (frozen and real) on a machine at load 13; **not classified**, re-time idle. |
| report ×2 | Scratch-path ENOBUFS; 3/3 in the real repo. |
| locate: Next 16 turbopack… | Symlinked `node_modules`; 11/11 in the real repo. |
| craft-wave6: Wave six | Flaky under load: 1 failure in 3 runs; passes alone in the real repo. |

**Real repo, the five host-bound files at 5550d91:** next-install 6/6, site-text 1/1, locate 11/11, report 3/3,
verify-frozen 1/1, presets 10/10 pass; shared-source 3/5 (**R2**); blueprint-next-performance 0/1 (**R6**);
site-replay 0/1 (retired Alt card, migration backlog); verify-writes 0/1 (timeout, above).

**Net, at HEAD:** of 666 tests, everything passes except the twelve cases in H1 and R2–R7 (seven of them in the fix
panel the migration is finishing, one in the e2e packaging simulation, one in `text-at`, one in a stale or noisy count
on the 216-card page, one still-unmigrated site test), plus one timeout to re-time. Nothing fails in the write paths,
the server, the CLI, the hosts' production behaviour or the packaging test.

## 6. Before you publish

```sh
# 0. land the e2e migration (test(e2e): … commits), then
git status                                   # clean except site/src/hero/Hero.jsx, .claude/, bench/, fixtures/.*
npm run typecheck && npm run build

# 1. the version, in one commit
npm version minor --no-git-tag-version       # 0.1.0 → 0.2.0
#    edit e2e/packaging.test.mjs:118-119 ('0.1.0' → '0.2.0') and CHANGELOG.md ("Unreleased (proposed 0.2.0)" → "0.2.0 · 2026-10-28")
git add package.json package-lock.json e2e/packaging.test.mjs CHANGELOG.md
git commit -m "chore(release): 0.2.0"

# 2. the suite, once, green
npm test

# 3. the tarball, once more by eye
npm pack --dry-run

# 4. push, tag, publish (the tag is what action.yml consumers pin: unlocalhosted/plumb@v0.2.0)
git push origin main
git tag v0.2.0 && git push origin v0.2.0
npm publish --access public                  # runs prepublishOnly: build + test
gh release create v0.2.0 --notes-file <(sed -n '/^## 0.2.0/,/^## 0.1.0/p' CHANGELOG.md | sed '$d')
```

Blocking before publish: **H1** (one word in `e2e/adoption.test.mjs:278`; until then `npm test`, and so
`prepublishOnly`, fails) and the fix-panel cases the migration is finishing (R2, R3, R4, R7: all in `overlay/src/fixpanel.js`,
all with a test already written). Worth doing before the tag: R5 in `text-at`, M2 (the silent token refusal), L5 (delete
`blueprint-fix.js` and `walkthrough.js`, ~900 lines of dead UI in the tarball), and a look at R6's 434.

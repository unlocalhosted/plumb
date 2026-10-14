# Release packaging result

Scope: `docs/briefs/release-packaging.md`, against candidate `6021ec5` on `release-packaging`. The five implementation commits are ordered P1, P2, C2, L1, then the message nit; this report is a separate commit. Every commit carries the requested co-author trailer.

## Changes and artifact evidence

| Item | Commit | Change and proof |
| --- | --- | --- |
| P1 | `aec4ac7` | Build removes `dist` before TypeScript compilation; `prepack` runs the build. The packaging e2e seeds obsolete Next loader/source-attribute outputs and a broken CLI, runs real `npm pack` with lifecycle scripts, lists the tarball with `tar -tzf`, verifies every compiled file has a current source counterpart, installs the artifact and runs its CLI. |
| P2 | `670ff25` | All three repository-relative README links use `https://github.com/unlocalhosted/plumb/blob/main/...`, including the schema link. The e2e reads the installed README and rejects relative repository links, checking tarball membership for any relative target. |
| C2 | `bcc9514` | Installed packages without a known commit generate `unlocalhosted/plumb@v0.1.0`, derived from package metadata. The e2e installs into a consumer Git repository, proves the release-tag fallback and absence of `@main`, then supplies a known `gitHead` and proves the exact commit is retained. Existing adoption coverage still proves checkout HEAD pinning. The composite Action's setup-node step uses exact `v4.4.0`; the packed Action is checked for exact version/SHA pins. |
| L1 | `82a69cf` | Build regenerates packaged `THIRD_PARTY_NOTICES`; `npm run notices` regenerates it independently after compilation. The generator audits served module imports and bippy's published source graph, excluding type-only imports. Notices contain full MIT texts for bippy/Aiden Bai, embedded `@jridgewell/sourcemap-codec`/Justin Ridgewell, and React/Meta upstream code adapted by bippy. Node dependencies remain external imports with their installed package licenses. Stale `overlay/dist` output is excluded and cannot override the audited client. |
| Message nit | `6021ec5` | Audited count-bearing messages throughout `src/`: findings, normal/verbose reports, ledger diagnostics and commands, setup/init/doctor, preset inventory, parity and GitHub summaries. Shared `count`/`plural` helpers handle nouns, verbs and pronouns. CLI message e2es exercise zero, one and two, including `1 colour value can't be checked`, unused tokens, runtime styles, classes, literal attributes, decisions, exceptions and parity. Existing GitHub annotation and Action fixture expectations now require singular wording. |

The L1 packed-install e2e checks full license texts, regenerates notices deterministically, and deliberately removes the Aiden Bai and Justin Ridgewell copyrights in turn to prove the release gate fails. It starts the installed CLI's real overlay daemon, fetches `/__plumb/THIRD_PARTY_NOTICES` as `text/plain`, fetches every vendor module, verifies all full legal texts appear in a `/*! ... */` banner, and proves the original upstream module bodies and headers remain intact. TypeScript explicitly preserves comments. The embedded codec's actual upstream build version is not assumed: the notices identify which installed version supplies its license text.

The Action's exact setup-node release was verified against [the upstream v4.4.0 release](https://github.com/actions/setup-node/releases/tag/v4.4.0).

## Release prerequisite and site follow-up

**`v0.1.0` must exist in `unlocalhosted/plumb` at release.** Publish step C1 creates that tag. This brief does not publish the package or create the release tag.

The site's own bundle is out of scope. Before deploying it, derive its complete third-party inventory from the production bundler's module/chunk graph, including embedded dependencies; collect full license/copyright notices, preserve legal headers or emitted legal-comment artifacts through minification, ship the notices with the deployed site, and gate every emitted chunk against that inventory. The overlay notices here do not certify the site's separate bundle.

Existing installed-package host fixtures now copy the notices file alongside dist/overlay/package metadata. No unit tests were added. `overlay/src`, `site/src` and `../algorecall` were not edited. Unrelated working-tree files were preserved.

## Validation

Final verification uses isolated worktree `/Users/vijaysingh/unlocalhosted/.plumb-release-packaging` with local dependency files. A shared-checkout attempt was invalidated by concurrent collector edits, builds deleting/replacing dist, and fixture changes; it is not acceptance evidence.

Runtime: Node `v25.9.0`, npm `11.12.1`, macOS; Chrome selected through the brief's exact environment variable.

- P1 packaging e2e: 1 passed.
- P2 packaging e2e: 1 passed.
- C2 packaging/adoption e2es: 20 passed.
- Final L1 packaging e2e: 1 passed, including actual installed daemon delivery and missing-license refusals.
- Message/adoption/ledger/preset checks: unchanged cases passed; focused final message/review/GitHub suite: 35 passed, 0 failed.

Required full command completed with exit 0:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

| Phase | Tests | Passed | Failed | Expected skips |
| --- | ---: | ---: | ---: | ---: |
| Native watch, complete feature suite | 407 | 406 | 0 | 1 |
| Forced polling, serve suite | 26 | 25 | 0 | 1 |
| Watch disabled, serve suite | 26 | 23 | 0 | 3 |
| Total executions | 459 | 454 | 0 | 5 |

Skips are the native/polling assertions for the other watch mode and the native-watcher-only recovery assertion when watching is disabled. All browser tests ran using Chrome. Full local transcript: `/tmp/plumber-release-packaging-isolated-full-test.log`. The notice freshness check also passed.

## npm pack --dry-run

Run after the successful full suite in the same isolated candidate; exit 0. Complete stdout/stderr follows. The tarball includes `THIRD_PARTY_NOTICES`, current dist and all public entrypoints, and excludes stale `overlay/dist` and the obsolete compiled hosts. README links are absolute repository URLs. No tarball is written by this dry run.

```text

> @unlocalhosted/react-plumber@0.1.0 prepack
> npm run build


> @unlocalhosted/react-plumber@0.1.0 build
> node scripts/clean-dist.mjs && tsc -p tsconfig.json && npm run notices


> @unlocalhosted/react-plumber@0.1.0 notices
> node scripts/third-party-notices.mjs

npm notice
npm notice 📦  @unlocalhosted/react-plumber@0.1.0
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 16.8kB README.md
npm notice 3.7kB THIRD_PARTY_NOTICES
npm notice 1.3kB action.yml
npm notice 116B dist/adoption/doctor.d.ts
npm notice 4.9kB dist/adoption/doctor.js
npm notice 250B dist/adoption/init.d.ts
npm notice 9.6kB dist/adoption/init.js
npm notice 616B dist/adoption/install.d.ts
npm notice 13.9kB dist/adoption/install.js
npm notice 203B dist/adoption/overlay.d.ts
npm notice 16.7kB dist/adoption/overlay.js
npm notice 604B dist/check-cache.d.ts
npm notice 13.4kB dist/check-cache.js
npm notice 70B dist/cli-flags.d.ts
npm notice 1.1kB dist/cli-flags.js
npm notice 31B dist/cli.d.ts
npm notice 25.3kB dist/cli.js
npm notice 896B dist/collect/cache.d.ts
npm notice 2.9kB dist/collect/cache.js
npm notice 899B dist/collect/class-helpers.d.ts
npm notice 955B dist/collect/class-helpers.js
npm notice 1.4kB dist/collect/classes.d.ts
npm notice 29.3kB dist/collect/classes.js
npm notice 1.4kB dist/collect/computed.d.ts
npm notice 23.0kB dist/collect/computed.js
npm notice 281B dist/collect/entries.d.ts
npm notice 10.4kB dist/collect/entries.js
npm notice 979B dist/collect/inline.d.ts
npm notice 12.8kB dist/collect/inline.js
npm notice 673B dist/collect/modules.d.ts
npm notice 7.4kB dist/collect/modules.js
npm notice 162B dist/collect/pattern.d.ts
npm notice 613B dist/collect/pattern.js
npm notice 909B dist/collect/source.d.ts
npm notice 4.5kB dist/collect/source.js
npm notice 1.2kB dist/collect/stylesheets.d.ts
npm notice 7.7kB dist/collect/stylesheets.js
npm notice 2.0kB dist/config.d.ts
npm notice 8.3kB dist/config.js
npm notice 327B dist/decisions/callers.d.ts
npm notice 1.6kB dist/decisions/callers.js
npm notice 643B dist/decisions/css.d.ts
npm notice 6.0kB dist/decisions/css.js
npm notice 157B dist/decisions/dtcg.d.ts
npm notice 4.8kB dist/decisions/dtcg.js
npm notice 1.1kB dist/decisions/index.d.ts
npm notice 11.8kB dist/decisions/index.js
npm notice 221B dist/decisions/motion.d.ts
npm notice 1.5kB dist/decisions/motion.js
npm notice 335B dist/decisions/record.d.ts
npm notice 719B dist/decisions/record.js
npm notice 351B dist/decisions/resolve.d.ts
npm notice 6.2kB dist/decisions/resolve.js
npm notice 625B dist/decisions/spacing.d.ts
npm notice 2.1kB dist/decisions/spacing.js
npm notice 291B dist/decisions/theme-sources.d.ts
npm notice 1.5kB dist/decisions/theme-sources.js
npm notice 452B dist/diagnostics.d.ts
npm notice 1.0kB dist/diagnostics.js
npm notice 387B dist/errors.d.ts
npm notice 592B dist/errors.js
npm notice 651B dist/habits/css.d.ts
npm notice 2.9kB dist/habits/css.js
npm notice 3.2kB dist/habits/index.d.ts
npm notice 20.1kB dist/habits/index.js
npm notice 914B dist/habits/predicates.d.ts
npm notice 4.6kB dist/habits/predicates.js
npm notice 191B dist/hosts/client.d.ts
npm notice 1.8kB dist/hosts/client.js
npm notice 206B dist/hosts/next-config.d.ts
npm notice 694B dist/hosts/next-config.js
npm notice 260B dist/hosts/next-dev.d.ts
npm notice 341B dist/hosts/next-dev.js
npm notice 532B dist/hosts/next.d.ts
npm notice 1.8kB dist/hosts/next.js
npm notice 505B dist/hosts/source-stamping.d.ts
npm notice 4.3kB dist/hosts/source-stamping.js
npm notice 981B dist/hosts/vite.d.ts
npm notice 5.6kB dist/hosts/vite.js
npm notice 707B dist/imitation/index.d.ts
npm notice 11.7kB dist/imitation/index.js
npm notice 3.3kB dist/index.d.ts
npm notice 19.0kB dist/index.js
npm notice 437B dist/ledger/check.d.ts
npm notice 10.7kB dist/ledger/check.js
npm notice 1.9kB dist/ledger/commands.d.ts
npm notice 12.3kB dist/ledger/commands.js
npm notice 517B dist/ledger/git.d.ts
npm notice 3.5kB dist/ledger/git.js
npm notice 582B dist/ledger/keys.d.ts
npm notice 4.5kB dist/ledger/keys.js
npm notice 454B dist/ledger/store.d.ts
npm notice 2.6kB dist/ledger/store.js
npm notice 976B dist/ledger/types.d.ts
npm notice 11B dist/ledger/types.js
npm notice 1.1kB dist/lower/css.d.ts
npm notice 11.3kB dist/lower/css.js
npm notice 980B dist/lower/stylesheets.d.ts
npm notice 24.7kB dist/lower/stylesheets.js
npm notice 2.1kB dist/lower/tailwind.d.ts
npm notice 21.4kB dist/lower/tailwind.js
npm notice 1.2kB dist/messages.d.ts
npm notice 6.8kB dist/messages.js
npm notice 772B dist/ownership/cache.d.ts
npm notice 6.3kB dist/ownership/cache.js
npm notice 2.9kB dist/ownership/components.d.ts
npm notice 43.7kB dist/ownership/components.js
npm notice 638B dist/ownership/judge.d.ts
npm notice 12.2kB dist/ownership/judge.js
npm notice 845B dist/parity.d.ts
npm notice 8.4kB dist/parity.js
npm notice 886B dist/paths.d.ts
npm notice 2.2kB dist/paths.js
npm notice 2.0kB dist/presets/index.d.ts
npm notice 19.9kB dist/presets/index.js
npm notice 198B dist/profile.d.ts
npm notice 365B dist/profile.js
npm notice 901B dist/project.d.ts
npm notice 5.3kB dist/project.js
npm notice 6.7kB dist/report.d.ts
npm notice 10.9kB dist/report.js
npm notice 1.0kB dist/rules/attribution.d.ts
npm notice 7.2kB dist/rules/attribution.js
npm notice 739B dist/rules/dead.d.ts
npm notice 4.6kB dist/rules/dead.js
npm notice 837B dist/rules/existence.d.ts
npm notice 10.7kB dist/rules/existence.js
npm notice 1.4kB dist/rules/families.d.ts
npm notice 13.0kB dist/rules/families.js
npm notice 3.3kB dist/rules/provenance.d.ts
npm notice 34.1kB dist/rules/provenance.js
npm notice 454B dist/rules/suggestions.d.ts
npm notice 1.4kB dist/rules/suggestions.js
npm notice 758B dist/session/client.d.ts
npm notice 4.9kB dist/session/client.js
npm notice 1.3kB dist/session/collection.d.ts
npm notice 8.5kB dist/session/collection.js
npm notice 11B dist/session/coordinator.d.ts
npm notice 5.0kB dist/session/coordinator.js
npm notice 6.0kB dist/session/engine.d.ts
npm notice 43.0kB dist/session/engine.js
npm notice 680B dist/session/focus.d.ts
npm notice 3.5kB dist/session/focus.js
npm notice 4.1kB dist/session/index.d.ts
npm notice 7.4kB dist/session/index.js
npm notice 1.8kB dist/session/judgement.d.ts
npm notice 15.2kB dist/session/judgement.js
npm notice 487B dist/session/ranking.d.ts
npm notice 2.5kB dist/session/ranking.js
npm notice 328B dist/session/runtime.d.ts
npm notice 11B dist/session/runtime.js
npm notice 2.3kB dist/session/server.d.ts
npm notice 22.0kB dist/session/server.js
npm notice 1.7kB dist/session/source-location.d.ts
npm notice 9.8kB dist/session/source-location.js
npm notice 2.6kB dist/session/state.d.ts
npm notice 24.7kB dist/session/state.js
npm notice 767B dist/session/text-encoding.d.ts
npm notice 1.2kB dist/session/text-encoding.js
npm notice 68B dist/session/text-entities.d.ts
npm notice 4.1kB dist/session/text-entities.js
npm notice 1.2kB dist/session/text.d.ts
npm notice 6.6kB dist/session/text.js
npm notice 11B dist/session/worker.d.ts
npm notice 24.6kB dist/session/worker.js
npm notice 320B dist/setup-messages.d.ts
npm notice 628B dist/setup-messages.js
npm notice 194B dist/surfaces/agent.d.ts
npm notice 4.2kB dist/surfaces/agent.js
npm notice 306B dist/surfaces/base.d.ts
npm notice 3.5kB dist/surfaces/base.js
npm notice 376B dist/surfaces/changed-lines.d.ts
npm notice 1.9kB dist/surfaces/changed-lines.js
npm notice 353B dist/surfaces/docs.d.ts
npm notice 3.2kB dist/surfaces/docs.js
npm notice 925B dist/surfaces/edits.d.ts
npm notice 5.1kB dist/surfaces/edits.js
npm notice 525B dist/surfaces/github.d.ts
npm notice 4.9kB dist/surfaces/github.js
npm notice 426B dist/surfaces/hooks.d.ts
npm notice 3.7kB dist/surfaces/hooks.js
npm notice 1.6kB dist/surfaces/sarif.d.ts
npm notice 2.0kB dist/surfaces/sarif.js
npm notice 279B dist/surfaces/sites.d.ts
npm notice 638B dist/surfaces/sites.js
npm notice 1.3kB dist/surfaces/trend.d.ts
npm notice 8.6kB dist/surfaces/trend.js
npm notice 435B dist/try.d.ts
npm notice 1.9kB dist/try.js
npm notice 1.0kB overlay/client.js
npm notice 2.1kB overlay/src/api.js
npm notice 37.3kB overlay/src/blueprint-fix.js
npm notice 13.9kB overlay/src/blueprint-marks.js
npm notice 8.2kB overlay/src/blueprint-reader.js
npm notice 11.4kB overlay/src/blueprint.js
npm notice 17.4kB overlay/src/choices.js
npm notice 12.6kB overlay/src/geometry.js
npm notice 3.5kB overlay/src/glyphs.js
npm notice 24.2kB overlay/src/locate.js
npm notice 5.7kB overlay/src/model.js
npm notice 689B overlay/src/sourcemap-worker.js
npm notice 17.5kB overlay/src/sourcemap.js
npm notice 5.8kB overlay/src/tokens.css
npm notice 97.4kB overlay/src/widget.js
npm notice 3.1kB package.json
npm notice 8.6kB schema/config.schema.json
npm notice 896B schema/ledger.schema.json
npm notice 18.7kB schema/report.schema.json
npm notice 3.0kB skills/plumber/SKILL.md
npm notice Tarball Details
npm notice name: @unlocalhosted/react-plumber
npm notice version: 0.1.0
npm notice filename: unlocalhosted-react-plumber-0.1.0.tgz
npm notice package size: 321.7 kB
npm notice unpacked size: 1.2 MB
npm notice shasum: 7b85ebf43bf687a87152160623ec39897beb1247
npm notice integrity: sha512-lSgZsB92lHMwA[...]veRVzOXJRG3FQ==
npm notice total files: 210
npm notice
unlocalhosted-react-plumber-0.1.0.tgz
```

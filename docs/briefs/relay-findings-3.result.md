# Relay findings 3 result

Implemented the three scoped fixes. No changes made to `examples/`, `overlay/src`, or `site/src`; existing site and other unrelated WIP preserved. Nothing pushed.

## Next.js packaging

- Added `@unlocalhosted/react-plumber/next/overlay`. Its runtime imports are React and the shared token-state module, with no Node APIs or Session/server imports. New installer wiring uses this entry. The existing `/next` overlay export and previously installed layouts remain compatible and idempotent.
- The component still server-renders the process token into the script tag. Public client modules never contain that token, and unauthenticated health requests still return 401.
- `withPlumb` supplies the installed server implementation's real file URL. The route uses native dynamic import with both bundlers' ignore directives, keeping Session and its native dependencies outside the bundle even when the package resolves outside `node_modules`. Package-name `serverExternalPackages` remains in place for ordinary installs. No consumer webpack callback is replaced.
- The config also supplies Next 16's development chunk directory to the overlay without importing filesystem code into the overlay entry.
- `e2e/next-install.test.mjs` performs actual npm `file:` symlink and tarball installs, runs the installer, and verifies page rendering, browser overlay startup, authenticated health and unauthenticated rejection on Turbopack and webpack.
- Before the fix, the linked matrix returned HTTP 500 on both bundlers with native-binding import traces through `next-dev.js`. All four install/bundler combinations passed after the fix.
- Existing host coverage passed, including token/session reuse, development edits, production and static-export exclusion. Existing packed setup coverage also passed.

## Executable CLI

- The build applies mode `0755` to the newly compiled `dist/cli.js`, preserving its shebang.
- `e2e/linked-bin.test.mjs` executes a linked `node_modules/.bin/plumber` directly. It reproduced `EACCES` immediately after the old build, then passed after the build fix.

## Focus-outline follow-up

- Compiled background, text-color and visible-border highlights on `data-highlighted`, `data-selected=true`, `aria-selected=true` and `data-state=open|active` qualify as replacements on the same target.
- Transparent or unchanged colors, nonvisible borders, mismatched states, conditional branches, hover/media gaps, pseudo-elements, descendants, ancestors and neighboring targets do not certify a replacement.
- Script-only DOM containers with negative tabindex, actual imported Radix dialog Content primitives, and autofocus cmdk inputs carry narrow managed-focus evidence. Native controls, keyboard-tabbed containers, non-autofocus fields and unrelated components remain checked. Imported aliases are recognized; local shadowing does not inherit an exemption.
- The source-collection cache revision changes with this evidence. Incremental Session judgement also retains it across warm reports and source changes.
- Exact copies of Relay's `dropdown-menu.jsx`, `dialog.jsx`, `sheet.jsx` and `CommandPalette.jsx` live under `fixtures/relay-habits/src/reference/`. CLI coverage checks them cold and warm, alongside positive and negative attribute/focus cases. The planted `focus:outline-none` input remains caught.
- A live read-only Relay check, with cache redirected outside `examples/`, clears the five sites in those four component files. Two focus sites remain: the planted input at `src/screens/Settings.jsx:83`, and `TabsContent` at `src/components/ui/tabs.jsx:12`. The installed Radix tabs implementation explicitly uses `tabIndex: 0`, so this panel is keyboard-focusable and does not meet the brief's script-only-container exemption. No blanket Radix/component-name exemption was added.

## Verification

Focused checks passed:

- Rebuild followed by direct linked-bin execution.
- Next linked/packed browser matrix: 6 tests, including four bundler subtests.
- Existing host and setup integration files: 13 tests.
- Installer compatibility/idempotence check after adding legacy-layout coverage.
- Relay habits, general habits and noise integration files: 19 tests.

Full suite command, invoked once:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Full run exited 0:

- Main invocation: 517 passed, 1 mode-specific skip.
- Session burst: 4 passed.
- Polling: 25 passed, 1 mode-specific skip.
- Watch disabled: 23 passed, 3 mode-specific skips.

Total: **569 passes, 5 mode-specific skips, zero failures**. Conditional watcher tests run in their applicable modes.

Review while that run was active found the incremental Session judgement path dropping the new managed-focus evidence. A new integration test reproduced the failure after an unrelated save. The forwarding/cache-key correction was made in source while waiting; `dist/` was not rebuilt during the full run. After the runner finished, the final source was rebuilt and checked with:

```sh
node --test --test-concurrency=1 e2e/managed-focus-session.test.mjs e2e/relay-habits.test.mjs e2e/linked-bin.test.mjs
```

All **6 final focused tests passed**, including cold/warm CLI reports, local Session reads, unrelated saves, changing targets into keyboard-focusable controls, restoring managed focus, and the executable bin. The full suite was not repeated. Final read-only Relay assertions confirmed exactly the two retained focus sites described above. Build/typecheck and `git diff --check` passed.

## Commits

- `464bd70` — keep linked CLI executable after builds.
- `1aa3686` — isolate overlay entry and native server loading for linked Next installs.
- `a5bfc0e` — accept compiled attribute highlights and managed-focus patterns.
- `b758083` — retain managed-focus evidence in incremental Sessions, with live API regression coverage.

All commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

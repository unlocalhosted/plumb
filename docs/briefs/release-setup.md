# Brief: a complete setup, from install to a written fix

The 0.1.0 release has to let a person set up both halves of Plumb on their own project without help: **drift detection** (CLI and CI) and **UI-to-source writes** (the browser overlay). Two pieces are missing.

## 1. `plumb install --overlay --write`

Today `plumb install --overlay` prints the host wiring and never edits files (`src/adoption/`; check `src/cli.ts` for the command). Keep that as the default. Add `--write`, which makes the change and prints the diff it made:

- **Vite:** find the project's Vite config (`vite.config.{ts,mts,js,mjs}`). Add `import { plumb } from '@unlocalhosted/plumb/vite'` and insert `plumb()` as the **first** entry in `plugins`, before `react()`. Source stamping must see JSX before React's transform; `src/hosts/source-stamping.ts` warns and turns stamping off otherwise. If `plumb()` is already present but after React, move it. Preserve formatting and comments: edit with oxc positions and `magic-string`, as stamping does, never by regenerating the file.
- **Next.js App Router:** wrap the `next.config.*` export in `withPlumb` from `@unlocalhosted/plumb/next/config`. Create `app/%5F_plumb/[...path]/route.plumb.ts`, with the content the README describes. Render `<PlumbOverlay />` inside the root layout's `<body>`. Respect `src/app` when it's used.
- **Refuse rather than guess** when the config isn't a plain object literal, spread from elsewhere, or a function returning a config. In that case, print the exact lines to add and exit non-zero, with a clear message.
- **Idempotent:** a second `--write` changes nothing and says it's already set up.
- Never touch a file outside the project root; never install packages.

## 2. A setup walkthrough, as an e2e test

`e2e/setup.test.mjs` proves the path a new user takes, on a fixture that has never seen Plumb. A small Vite + React + Tailwind v4 app with a theme and a few literal values off the scale is enough; make it look like a real project.

1. `npm pack` Plumb and install the tarball into the fixture, as a user would.
2. `npx plumb` exits 0 and reports drift, without a config.
3. `npx plumb init` writes a config and baseline; `npx plumb check` is green.
4. `npx plumb install --overlay --write` edits `vite.config` as above, and a second run is a no-op.
5. Start the fixture's own dev server. In Chromium, Alt+hover an off-scale element and see its tag; click to pin; see the reading. Pick a token, which previews it; Write. Then:
   - the source file on disk has exactly that edit;
   - `npx plumb check` no longer reports that site.
6. Stamping is on: `data-plumb-source` is in the page, and the pinned element's location came from its stamp.

Keep it to one test file. It may take a few minutes; that's fine.

## Checks

The owner asked for quick checks, not the full suite: `npm run build`, `npm run typecheck`, `e2e/setup.test.mjs`, plus `e2e/adoption.test.mjs` (the existing install and init tests). Write a short result to `docs/briefs/release-setup.result.md`, with what changed and the checks you ran.

## Limits

- Only modify files inside `/Users/vijaysingh/unlocalhosted/plumb`. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.
- Another Codex job is editing `bench/apps/verify.mjs`, `bench/apps/frozen*.mjs` and `docs/briefs/verify-frozen.*`. Don't touch those. The README is being edited separately, so don't edit it.
- No commits, pushes, worktrees or global installs.

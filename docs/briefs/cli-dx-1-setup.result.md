# CLI experience, layer 1 — result

Implemented section 5 and layer 1 only. Captured with the built CLI on scratch projects; `npx plumber` below names the equivalent installed command. `<scratch>` replaces the temporary parent path. Reports below are the existing report layout; timings are real capture values.

Each case snapshots project files and directories before/after and asserts no project writes. Successful checks use an external scratch cache; setup failures create no cache. Integration coverage: `e2e/cli-setup.test.mjs` also covers home boundaries, JSON/agent runs, npm/pnpm workspaces, implicit workspaces, chosen apps, distant typos, malformed config/package files, and root/subfolder report equality.

## No project here

```text
$ npx plumber     (in <scratch>/empty)
✗ No project here. React Plumber reads a React app: a folder with package.json.
  → cd into your app, or: npx plumber --root path/to/app
exit 2
```

## Subfolder discovery

```text
$ npx plumber     (in <scratch>/site/src/hero)
Using the project at ../.. (site, package.json).
[stdout]
React Plumber 0.1.0  <scratch>/site  plain CSS
files 0 tsx, 1 jsx, 0 css, 0 other  19.2ms

no findings

classes     0 classes read, 0 do nothing
inline      0 of 0 style attributes have literal values

Next: run plumber init to write your token sources and record today's findings as debt, so CI only fails on new ones.
exit 0
```

## Workspace choice

```text
$ npx plumber     (in <scratch>/workspace)
This is a workspace with 3 apps. Pick one:
  npx plumber --root apps/docs    Vite · Tailwind 4
  npx plumber --root apps/web    Next.js · Tailwind 4
  npx plumber --root packages/ui    library · Tailwind 4
exit 2
```

## No source files read

```text
$ npx plumber     (in <scratch>/no-sources)
✗ Found no .tsx, .jsx or .css files under src/. Is this the right folder?
  Looked in: src/** (from plumber.config.ts `source`)
  → change `source`, or run in your app's folder
exit 2
```

## Tailwind declared but missing (npm, package-lock.json)

```text
$ npx plumber     (in <scratch>/missing-package-lock-json)
✗ Tailwind 4 is in package.json but not installed.
  → npm install
exit 2
```

## Tailwind declared but missing (pnpm, pnpm-lock.yaml)

```text
$ npx plumber     (in <scratch>/missing-pnpm-lock-yaml)
✗ Tailwind 4 is in package.json but not installed.
  → pnpm install
exit 2
```

## Tailwind declared but missing (yarn, yarn.lock)

```text
$ npx plumber     (in <scratch>/missing-yarn-lock)
✗ Tailwind 4 is in package.json but not installed.
  → yarn install
exit 2
```

## Tailwind declared but missing (bun, bun.lock)

```text
$ npx plumber     (in <scratch>/missing-bun-lock)
✗ Tailwind 4 is in package.json but not installed.
  → bun install
exit 2
```

## Tailwind declared but missing (bun, bun.lockb)

```text
$ npx plumber     (in <scratch>/missing-bun-lockb)
✗ Tailwind 4 is in package.json but not installed.
  → bun install
exit 2
```

## Tailwind 3

```text
$ npx plumber     (in <scratch>/tailwind-3)
✗ React Plumber needs Tailwind 4; this project has 3.4.17.
  → upgrade: npx @tailwindcss/upgrade   (https://tailwindcss.com/docs/upgrade-guide)
exit 2
```

## React without Tailwind; plain CSS still checked

```text
$ npx plumber     (in <scratch>/plain-react)
! These classes look like Tailwind, but Tailwind isn't set up: p-[13px], flex, gap-4 (+41 more).
  → npm install tailwindcss @tailwindcss/vite, then @import "tailwindcss"; in your CSS entry
  Checking plain CSS only for now.
[stdout]
React Plumber 0.1.0  <scratch>/plain-react  plain CSS
files 0 tsx, 1 jsx, 1 css, 0 other  29.7ms

`var(--missing)` is never defined  1 site
  The browser drops a declaration whose variable is undefined, so this color is not applied.
  Define --missing, or use a token instead.
  src/styles.css:1:7  color:var(--missing)
  intended?  plumber accept --rule existence/dead-var --site src/styles.css:1 --why "…"

Your theme has no colour tokens, so 1 colour value can't be checked  1 site
  React Plumber judges values against the tokens your theme declares.
  Add colour tokens to your theme, or point `decisions.color.from` in plumber.config.ts at where they live.
  src/styles.css:1:7  color:var(--missing)

classes     44 classes read, 0 do nothing, 1 undefined variable
color       0 of 1 use your tokens (0%)   1 doesn't
inline      0 of 0 style attributes have literal values
2 findings: 1 broken style, 1 config gap

Next: run plumber init to write your token sources and record today's findings as debt, so CI only fails on new ones.
exit 0
```

## Unknown command

```text
$ npx plumber chek    (in <scratch>/site)
✗ Unknown command chek. Did you mean check?
exit 2
```

## Unknown flag

```text
$ npx plumber check --jsno    (in <scratch>/site)
✗ Unknown option --jsno. Did you mean --json?
exit 2
```

## Missing --root folder

```text
$ npx plumber check --root does-not-exist    (in <scratch>/site)
✗ --root does-not-exist: no such folder (from <scratch>/site).
exit 2
```

## Scope and verification

- Report formatter unchanged. A comparison against a build of baseline `fd16f58` confirmed plain-css and tailwind-min text/agent output unchanged, and JSON unchanged after removing timing and cache counters.
- Existing CLI errors use stderr and leave stdout empty, including `--json`; this checkout has no CLI JSON error envelope. Kept that transport behavior. HTTP/JSON-RPC error envelopes and agent/report shapes remain unchanged.
- `src/index.ts`: one import and the existence-check input filter for React apps without Tailwind. `src/cli-progress.ts` and `src/profile.ts` untouched.
- Existing fixtures gained package.json boundaries where missing, so upward discovery cannot analyze the enclosing repository. No overlay/src or site/src edits.
- Full validation passed (exit 0): `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Main suite: 433 passed, 1 intentional skip; polling: 25 passed, 1 intentional skip; disabled watching: 23 passed, 3 intentional skips. `npm run typecheck` and `git diff --check` also passed.
- The worktree initially lacked the React 18 fixture dependencies. Installed them only under `fixtures/react18/node_modules` with no lockfile/package changes; the React 18 browser integration passed in the final run.

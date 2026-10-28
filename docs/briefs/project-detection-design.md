# Project detection: one pass, one set of facts

Status: design, 2026-10-29. No code. Written against `main` at 6bf8b0d after reading `src/cli-project.ts`,
`src/source-boundary.ts`, `src/setup-messages.ts`, `src/project.ts`, `src/readiness/*`, `src/adoption/*`,
`src/onboarding/state.ts`, `src/hosts/*`, `src/session/*`, `src/collect/entries.ts`, `e2e/cli-setup.test.mjs`,
`e2e/hosts.test.mjs`, `e2e/readiness.test.mjs` and `e2e/onboarding-state.test.mjs`.

Trigger: pnpm 11 wrote a settings-only `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`, no
`packages:`) into a single Vite app. Every CLI command then died with `This is a workspace with 0 apps. Pick one:`
and `--root .` could not escape. The patch landed on `main` as 0cada15: `pnpmDeclaresPackages()` in
`src/source-boundary.ts:7`, used by `src/source-boundary.ts:11` and `src/cli-project.ts:30`.

Second trigger, found right after: `plumber state` on the same single app listed **five** Tailwind entries:
`src/index.css` plus four copies under `.claude/worktrees/agent-*/src/index.css`. Those are nested git worktrees of
the same repo (each folder has a `.git` *file*). Detection walked into them. This brief is about the system that
made both bugs inevitable and what replaces it.

## 1. The current system

Plumb has no notion of "the project". It has nine files that each look at the disk and decide one of five things
(root, workspace, package manager, host, styling), using different files, different precedence and different
failure modes. Below is every independent decision I found.

### Root (where the project starts)

| Where | Rule |
| --- | --- |
| `src/cli-project.ts:63-71` | walk up from `--root`/cwd until a `package.json`; stop at home or `/Users/x`, `/home/x`; throw "No project here" |
| `src/cli.ts:170` | `craft` bypasses the walk entirely and takes `--root` literally |
| `src/hosts/vite.ts:62` | Vite's `config.root`, optionally joined with `plumb({ root })`; no walk, no workspace check |
| `src/hosts/next-dev.ts:8-9` | `process.cwd()`; no walk, no workspace check |
| `src/session/index.ts:25` | `resolve(options.root ?? process.cwd())`; no walk |
| `src/adoption/install.ts:69,151` | a *different* root ("repo") = `git rev-parse --show-toplevel`, used for CI and CODEOWNERS |

So the same folder yields a different root depending on whether you came in through the CLI, a host plugin or
`serve`. The CLI walks; the hosts do not. The CLI refuses workspaces; the hosts never heard of them.

### Workspace (is this a root that holds several apps?)

| Where | Rule |
| --- | --- |
| `src/cli-project.ts:16-51` `workspaceApps` | `package.json#workspaces` **or `existsSync('pnpm-workspace.yaml')`** (line 34, `explicit`) makes a workspace. With patterns: glob `<pattern>/package.json`. With a bare file: glob `**/package.json`. Apps = manifests that depend on `react` or `next`. `workspace = explicit \|\| apps.length > 1` (line 50): two sibling React apps with no declaration also count. |
| `src/cli-project.ts:72-78` | a workspace root is a *refusal* unless the command is `state` |
| `src/source-boundary.ts:7-14` `sourceBoundary` | nearest ancestor with `pnpm-workspace.yaml` **or** `workspaces` **or** `.git` bounds where source globs may reach. Same file names, different meaning (a fence, not a refusal), different walk (up from root, not at root). |
| `src/onboarding/state.ts:253-258` | re-calls `workspaceApps` and turns the refusal into rung R0 `workspace` |

Two definitions of "workspace file" exist, in two files, and they disagree about what the file *means*. Before
0cada15 neither read what pnpm itself reads: pnpm treats `pnpm-workspace.yaml` without `packages:` as a single
project. 0cada15 fixes that in both places with one shared predicate, which is the right instinct and still leaves
two callers. Note also that `--root apps/web` works, but `--root .` from the single app does not, because the walk
lands on the same folder and `workspaceApps` is consulted again.

### Membership (which files below the root belong to this project)

| Where | Rule |
| --- | --- |
| `src/project.ts:14` `ignore` | a fixed list: `node_modules`, `dist`, `build`, `.next`, `**/.git/**`, plumb caches. `**/.git/**` skips the *contents of a `.git` directory*; it says nothing about a folder that has a `.git` **file** (a worktree or submodule) |
| `src/project.ts:36-38` `tailwindEntryCandidates` | globs `**/*.css` with `dot: true` under the root, so `.claude/worktrees/*/src/index.css` is a candidate |
| `src/project.ts:102-105` `projectSourceFiles` | the configured `source` globs (`src/**`, `app/**` by default) under the same `ignore` |
| `src/source-boundary.ts:9-14` `sourceBoundary` | walks *up* for a `.git` entry (file or directory) as the outer fence; never looks *down* |
| `src/cli-project.ts:37` `workspaceApps` | `**/package.json` under the same `ignore` when a workspace declares no patterns |

"Belongs to this project" is answered by a static ignore list, written once for `node_modules`. A nested checkout
(worktree under `.claude/worktrees/`, a submodule, a vendored clone, `git clone` into `tmp/`) is a *different
project that happens to sit inside the folder*, and nothing in the list can say so. The boundary module knows how
to recognise a checkout when walking up, and that knowledge is not applied when walking down. The five-entries
result is the same design fault as the pnpm one: a signal (`.git`) is interpreted in one module and ignored in
another.

### Package manager

| Where | Rule |
| --- | --- |
| `src/setup-messages.ts:37-46` `packageManager` | walk up to home; first of `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`; default npm |
| `src/adoption/install.ts:82-85` | at the git top level only; `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`; **no bun**; default `npm install` |

Two copies; they disagree on bun and on where they look. Neither reads `package.json#packageManager` (corepack),
which is the one declared signal.

### Host (which dev server runs this app)

| Where | Rule |
| --- | --- |
| `src/cli-project.ts:48` | deps: `next` → Next.js, `vite` → Vite, else `library` |
| `src/adoption/install.ts:104-106` | deps: `next` else `vite` else undefined (no `library`) |
| `src/adoption/overlay.ts:244-250` | the config file: `vite.config.{ts,mts,js,mjs}` / `next.config.{…,cjs}` |
| `src/readiness/config.ts:88-95` `hostConfig` | both config families; **exactly one** file or the host is undefined |
| `src/readiness/index.ts:149-155` | regex over `package.json#scripts` for `vite`/`next`, then `react-scripts`/`parcel`/`astro` as "missing" |
| `src/collect/entries.ts:57` | `vite`/`rollup`/`webpack` config files, to find the CSS entry |
| `src/hosts/vite.ts:93-99`, `src/hosts/next-dev.ts:10` | the only *observed* facts (runtime), passed as `Runtime` to readiness |

Six static ways to answer "what host", with four different vocabularies (`'Next.js'`, `'next'`, `'next-webpack'`,
`'vite:react'`). Adding Astro today means editing at least five of them and the `Runtime['host']` union.

### Styling (Tailwind or plain CSS, which major, which entry)

| Where | Rule |
| --- | --- |
| `src/setup-messages.ts:26-35` `resolvedTailwind(root)` | `require.resolve('tailwindcss/package.json')` from the root |
| `src/project.ts:70-85` `tailwindVersion(entry)` | the same resolve, from the CSS entry's folder; a different error message for the same bad `package.json` |
| `src/cli-project.ts:46-48` | installed major, else declared major from the dependency range |
| `src/onboarding/state.ts:265-268` | **declared** major first, else installed. The opposite precedence from the line above. |
| `src/setup-messages.ts:47-55` `tailwindSetupProblem` | declared-but-not-installed and v3 refusals; resolves a third time |
| `src/setup-messages.ts:58-63` `checkingPlainCss` | react/next dep present and no tailwind dep |

### React present

`src/cli-project.ts:43` (deps), `src/setup-messages.ts:76-81` (resolve), `src/readiness/index.ts:176` (resolve
again). Three answers to one question.

### Why the pnpm bug was inevitable

1. **Presence is treated as meaning.** Every site above asks "does file X exist" and reads a semantic fact off it.
   `pnpm-workspace.yaml` is a settings file that *may* declare packages; plumb read "declares packages" from its
   presence. Any tool that writes a file plumb pattern-matches will break plumb the same way. pnpm just got there
   first; `bunfig.toml`, `.yarnrc.yml` with `workspaces`-like keys, `nx.json`, `turbo.json` are next.
2. **A weak signal escalates straight to a refusal.** `explicit` (line 34) turns one `existsSync` into "glob the
   whole tree, then refuse whatever you find, even zero". There is no `unknown`, no confidence, no "a workspace
   file with nothing in it is not a workspace".
3. **The override does not win.** `--root` is an input to the walk, not an override of the verdict, so
   `--root .` is re-judged and refused. The user had no door out.
4. **The decision is duplicated and the copies disagree, so the test that would have caught it lived elsewhere.**
   `sourceBoundary` already treated the same file as harmless. `e2e/cli-setup.test.mjs:73` covers a pnpm file
   *with* `packages:`; nothing covers one without, because nothing in the design says what the file means.
5. **No consumer can explain itself.** The refusal prints a verdict and no evidence. `doctor` cannot show "root
   chosen because …". A system that cannot show its evidence cannot be debugged by the person it just refused.

6. **"Inside" is decided by a list, not by evidence.** `ignore` (`project.ts:14`) is the only notion of membership,
   and it cannot express "a folder that is its own checkout". So every `**/` glob in the codebase descends into
   worktrees and submodules, and `state`, the CSS entry chooser, workspace app listing and `locate.source` all see
   files that are not this project's.

0cada15 fixes (1) for one file and leaves (2)–(6) in place.

## 2. The proposed system

One detection pass produces one typed, evidence-carrying object, `ProjectFacts`. Every entry point (CLI, Vite and
Next hosts, `serve`, readiness, doctor, state, install) consumes that object and nothing else reads the disk to
decide root, workspace, package manager, host or styling.

### Primitives

```ts
// src/project-facts.ts
type Source = 'override' | 'declared' | 'observed' | 'inferred' | 'unknown';
interface Evidence { file: string; line: number; text: string }   // same shape as src/readiness/index.ts:29

interface Fact<T> {
  value: T | null;          // null only when source === 'unknown'
  source: Source;           // how we know
  evidence: Evidence[];     // where we read it; never empty unless unknown
  conflicts?: Claim<T>[];   // lower-precedence claims that disagreed; kept, never thrown
}
interface Claim<T> { value: T; source: Exclude<Source, 'override' | 'unknown'>; evidence: Evidence[]; detector: string }

interface ProjectFacts {
  root: Fact<string>;                                   // the app folder analysis runs in
  boundary: Fact<string>;                               // outermost folder source may reach (replaces sourceBoundary)
  workspace: Fact<{ tool: string; patterns: string[] } | null>;   // null = single project
  apps: Fact<{ path: string; host: string | null; styling: string | null }[]>;  // only when workspace
  packageManager: Fact<'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno'>;
  host: Fact<{ id: string; configFile: string | null }>;          // 'vite' | 'next' | … | 'none'
  styling: Fact<{ kind: 'tailwind'; major: number; installed: string | null; entry: string | null } | { kind: 'plain-css' }>;
  react: Fact<boolean>;
  checkouts: Fact<string[]>;   // folders under root that are their own checkout (worktree, submodule, vendored clone); excluded from membership
}
```

A **Detector** is a pure function over a small read-only context:

```ts
interface Detector {
  id: string;                                 // 'workspace.pnpm', 'host.vite', 'pm.lockfile', 'styling.tailwind'
  reads: string[];                            // files it may open, relative to a folder; declared for the cache and for doctor
  detect(ctx: { folder: string; read(file: string): Promise<string | undefined>; manifest(): Promise<PackageJson | undefined> }): Promise<Partial<Record<keyof ProjectFacts, Claim<unknown>>>>;
}
```

A **Registry** is an ordered array of detectors. The pass runs every detector once per folder it visits and feeds
all claims to the **Resolver**.

### Rules that connect them

- **R1. Presence is never a fact.** A detector may only claim from a *parsed* key or an *observed* runtime. A file
  that exists but declares nothing contributes evidence (`text: 'pnpm-workspace.yaml: settings only'`) and no
  claim.
- **R2. Unparsable is unknown, not an error.** YAML or JSON that will not parse yields a claim-less result with
  evidence `text: 'could not parse: …'`. The fact becomes `unknown`. Only consumers decide whether unknown blocks
  them.
- **R3. Precedence is fixed and total:** `override > observed > declared > inferred`. Within one source, the first
  detector in the registry wins and the rest become `conflicts`. (Observed beats declared because a running Vite
  server is the truth about the host even if `package.json` says `next`.)
- **R4. An override short-circuits.** `--root`, `plumb({ root })`, `plumber.config` keys, or `PLUMBER_*` env set a
  fact with `source: 'override'`; no detector runs for that fact, and no consumer may refuse on it.
- **R5. One pass, one object.** `projectFacts(start, overrides)` is memoised per `(realpath(start), overrides)` for
  the process lifetime and invalidated by the same watcher that invalidates `CheckCache`. CLI, `Session.create`,
  both hosts, readiness, doctor, state and install receive the same object.
- **R6. Consumers read `value`; detectors read disk.** No `existsSync` for these five questions outside
  `src/project-facts/`. This is the rule that keeps the next pnpm from happening; a grep enforces it in
  `e2e/release-guards.test.mjs`.
- **R7. Refusal is a consumer policy with evidence attached.** The only refusal left in `cliProject` is: `workspace`
  is declared, `apps.value.length >= 1`, and no `--root` override. Zero apps is a notice, not a refusal (section 3).
- **R8. Facts are serialisable and public.** `plumber state --json` gains `facts`; `/__plumb/readiness` gains a
  `project` block; `doctor` prints a `Project` table with one row per fact: value, source, first evidence line.
- **R9. A nested checkout is a boundary in both directions.** Walking *up*, the nearest `.git` (file or directory)
  fences `boundary`, as today. Walking *down*, any folder under `root` that holds a `.git` entry is another
  checkout: it goes into `checkouts` and out of membership. The same signal means the same thing wherever it is
  met. `.gitmodules` at the root adds its `path` entries to `checkouts` (declared) even before they are checked out.
- **R10. Membership is derived from facts, not from a list.** `ignore` becomes `facts.ignore()`: the static
  build/dependency folders plus `checkouts.value` as `<path>/**`, plus the plumb state directory. Every glob in
  `project.ts`, `cli-project.ts` and `collect/entries.ts` takes it from the facts object. No glob with `**` runs
  without it.

### The walk, in facts

`root` is found as today (`cli-project.ts:65-71`) but recorded as a fact with evidence (`package.json:1`,
`source: 'inferred'` when walked up, `'override'` when `--root` names a folder that has one). `boundary` is the
first ancestor (inclusive) with a `declared` workspace claim, else the `.git` folder (`observed`), else `root`.
`workspace` is read *at the root only*, from declared claims. `apps` is computed only when `workspace.value` is
non-null, from `patterns`, never from `**/package.json`.

### The initial registry (small on purpose)

| Detector | Claims | From |
| --- | --- | --- |
| `workspace.manifest` | workspace | `package.json#workspaces` (array or `{packages}`); covers npm, yarn classic and berry, bun |
| `workspace.pnpm` | workspace | `pnpm-workspace.yaml#packages` only; a settings-only file is evidence, not a claim |
| `pm.manifest` | packageManager | `package.json#packageManager` (declared) |
| `pm.lockfile` | packageManager | nearest lockfile up to `boundary` (inferred); bun and deno included |
| `host.config` | host | `vite.config.*`, `next.config.*` (declared). Two families present → first in registry wins, other in `conflicts` |
| `host.manifest` | host | deps `next`/`vite` then scripts (inferred); `react-scripts`/`astro`/`remix` claim `host: <id>` so the message can name them |
| `host.runtime` | host | the running plugin's `Runtime` (observed); only hosts register it |
| `styling.tailwind` | styling | one `require.resolve` from `root` (declared install), `@import "tailwindcss"` entries (declared), the dependency range (inferred) |
| `styling.plain` | styling | react/next present and no tailwind claim (inferred) |
| `react.resolve` | react | one resolve from `root` |
| `checkouts.git` | checkouts | one bounded walk of the tree under `root` (skipping the static ignore folders) for `.git` entries (observed); plus `.gitmodules#path` (declared). The walk is the same `readdir` pass `apps` already needs, so it costs nothing extra on a single app and is cached with the facts. |

Eleven detectors replace the nine files in section 1. Nx, Turborepo, Lerna, Rush, Moon, Remix, Astro, Rsbuild,
Expo, Storybook are each one more row (section 4), not edits to five files.

## 3. Failure behaviour

| Situation | Facts | What the person sees |
| --- | --- | --- |
| Unknown file plumb has never heard of (`bunfig.toml`, `moon.yml`) | no detector reads it; nothing changes | nothing. Adaptable means ignoring what you do not understand. |
| **Settings-only `pnpm-workspace.yaml`** (the trigger) | `workspace: { value: null, source: 'declared', evidence: [pnpm-workspace.yaml:1 'no packages: key'] }` | single project; `npx plumber` runs. `doctor` shows the evidence row so a person can see plumb read the file. |
| Declared workspace, 0 apps found | `workspace` declared, `apps: []` | notice on stderr: `Workspace (pnpm, apps/*, packages/*) with no React app under those patterns. Run in an app: npx plumber --root path/to/app`, **exit 2 with the evidence line**, never "0 apps. Pick one:". |
| Declared workspace, ≥1 app, no `--root` | as today | the table of apps (`cli-setup.test.mjs:73` output, unchanged) |
| `--root .` or `--root apps/web` | `root.source = 'override'`; workspace is still *detected* at that folder for `boundary`, but R4 forbids refusing on it | runs. If the folder has no `package.json`: `--root .: no package.json here` (today's message, `cli-project.ts:68`), because an override names a folder, not a verdict. |
| `plumb({ root })` in Vite, `withPlumb({ root })` in Next | same override, same rule | the host never refuses; readiness shows `project.root.source: override` |
| Two host configs (`vite.config.ts` and `next.config.js`) | `host` = first by registry order, `conflicts` holds the other | `doctor`: `Host: vite (vite.config.ts:1; also next.config.js, ignored)`; readiness `locate.host` stays `ok` with that evidence instead of today's silent `undefined` from `hostConfig` (`readiness/config.ts:95`). |
| Lockfile says pnpm, `packageManager` says yarn | declared yarn wins (R3); pnpm in `conflicts` | install messages say `yarn add`; doctor shows both lines |
| Unparsable `package.json` at root | `root` known, every manifest-derived fact `unknown` | `Could not read package.json at …` as today (`setup-messages.ts:23`), once, from one place; `doctor` still prints the rest of the table |
| Unparsable `pnpm-workspace.yaml` | `workspace: unknown`, evidence `could not parse` | single-project behaviour plus one dim notice; today it throws `UsageError` (`cli-project.ts:32`) |
| Two sibling React apps, nothing declared | `workspace: null` (inferred multi-app is gone; it was `cli-project.ts:50`) | runs in the folder you are in. The R0 `workspace` rung in `state` keys off declared only. |
| **Nested worktrees** (`.claude/worktrees/agent-*/`, each with a `.git` file) (the second trigger) | `checkouts: ['.claude/worktrees/agent-a', …]`, `source: 'observed'`, evidence `.claude/worktrees/agent-a/.git:1 'gitdir: …'` | `state` lists one Tailwind entry; `doctor` row `Checkouts: 4 nested (.claude/worktrees/agent-a/.git …), excluded`. Run *inside* a worktree, its own `.git` file is the up-walk fence and the parent is never consulted. |
| Git submodule (checked out) | same as a worktree: `.git` file inside the submodule folder; also declared by `.gitmodules` | excluded from membership; `doctor` names it `submodule` from the `.gitmodules` evidence |
| Submodule declared in `.gitmodules` but not initialised (empty folder) | `checkouts` from the declared `path`; folder is empty anyway | excluded; nothing to see |
| Vendored clone (`tmp/other-repo/.git` directory) | `.git` directory below root → checkout | excluded, same row in `doctor` |
| Symlinked package inside the tree | `ownSourcePath` (`source-boundary.ts:38`) keeps refusing symlink escapes; globs run with `followSymbolicLinks: false` as today | unchanged |
| A checkout that is *also* an app of a declared workspace (a submodule under `apps/`) | `apps` lists it (the pattern matched); `checkouts` lists it too | the table shows it; `--root apps/vendored` runs in it with its own `boundary`. Membership of the *parent* excludes it; running in it includes it. Two roots, two fact objects, no conflict. |
| Nested app inside an app (`apps/web/examples/demo`) | `apps` already drops it (`cli-project.ts:45`); kept as a rule in `apps` computation | unchanged |

The invariant: detection never throws. Only `cliProject` (R7) and config/Tailwind *setup* checks that already exist
may exit 2, and when they do, the message carries the evidence line that produced the verdict.

## 4. Adding a tool: Nx, end to end

Nx is the hard case: an Nx repo may have `package.json#workspaces` (then `workspace.manifest` already covers it),
or only `nx.json` plus a `project.json` in each app, with no workspaces key at all.

1. **Detector** `src/project-facts/detectors/workspace-nx.ts`:
   ```ts
   export const workspaceNx: Detector = {
     id: 'workspace.nx', reads: ['nx.json'],
     async detect({ read }) {
       const text = await read('nx.json'); if (text === undefined) return {};
       let parsed; try { parsed = JSON.parse(text); } catch (error) { return { workspace: unknownClaim('nx.json', `could not parse: ${userMessage(error)}`) }; }
       // nx.json declares a workspace. Its apps are folders with project.json; the patterns are the Nx defaults.
       const patterns = Array.isArray(parsed.workspaceLayout?.appsDir) ? [] : [parsed.workspaceLayout?.appsDir ?? 'apps', parsed.workspaceLayout?.libsDir ?? 'libs'].map(dir => `${dir}/*`);
       return { workspace: claim({ tool: 'nx', patterns }, 'declared', [{ file: 'nx.json', line: 1, text: 'nx.json' }], 'workspace.nx') };
     },
   };
   ```
   Register it after `workspace.manifest` and `workspace.pnpm` so a repo that has both keeps the package
   manager's declaration and shows `nx` in `conflicts`.
2. **Apps** need nothing new: `apps` is computed from `patterns` + `package.json` dependencies, as today. If an Nx
   app has `project.json` but no `package.json`, it is not a React app plumb can read, and the notice says so with
   the pattern it searched.
3. **Hosts** need nothing: an Nx-managed Vite app is still a Vite app; `host.config` finds `vite.config.ts` in the
   chosen app.
4. **Fixture** `fixtures/layouts/nx-no-workspaces/` with `nx.json`, `apps/web/{package.json,project.json,vite.config.ts,src/App.tsx}`, `libs/ui/package.json`.
5. **e2e rows** in `e2e/project-layouts.test.mjs` (section 5): at the root, `npx plumber` prints the app table with
   `apps/web  Vite · Tailwind 4`; `--root apps/web --json` exits 0; `doctor` has a `Workspace: nx (nx.json:1)` row;
   `state --json` has `facts.workspace.value.tool === 'nx'`.
6. **Docs**: one line in the README's "Workspaces" list.

Six steps, one new file, no edits to `cli-project.ts`, `source-boundary.ts`, `readiness`, `state` or `install`.
Bun workspaces is step 4–6 only, since Bun uses `package.json#workspaces`. Remix/React Router, Astro, Rsbuild,
Storybook are a `host.*` detector plus a `Runtime` registration when a plugin exists; until one exists they are
`host: { id: 'astro' }` with `locate.host` missing and a message that names Astro, which is what
`readiness/index.ts:153` tries to do by regex today.

## 5. Testing: a fixture matrix through the real CLI and hosts

Owner's rule: no unit tests, nothing that tests the implementation. Every assertion below is on what a person sees
from a real entry point: CLI stdout/stderr/exit code, `state --json`, `doctor`, and `/__plumb/readiness` from a
real Vite or Next dev server.

`fixtures/layouts/<name>/` (committed, real-looking, tiny) and one test file `e2e/project-layouts.test.mjs` that
loops over a matrix:

| Layout | Entry points | Assert |
| --- | --- | --- |
| `single-vite-pnpm-settings` (the trigger: `pnpm-workspace.yaml` without `packages:`, `pnpm-lock.yaml`) | `npx plumber`, `--root .`, `doctor`, Vite dev server | exit 0; stderr empty; `doctor` row `Workspace: none (pnpm-workspace.yaml:1, settings only)`; `Package manager: pnpm`; readiness `project.workspace.value === null` |
| `single-vite-npm` | all | exit 0, `Package manager: npm (package-lock.json)` |
| `single-next-yarn-berry` (`.yarnrc.yml`, `yarn.lock`, `packageManager: yarn@4`) | CLI, Next dev server | `Package manager: yarn (package.json#packageManager)`; readiness `locate.host` ok with `next-webpack` |
| `single-vite-bun` (`bun.lock`) | CLI | install hint says `bun add` |
| `workspace-npm` (today's `cli-setup.test.mjs:73` shape) | CLI root, `--root apps/docs` | the existing table text byte-for-byte; chosen app exit 0 |
| `workspace-pnpm-declared` | CLI root | table; `Workspace: pnpm (pnpm-workspace.yaml:1)` |
| `workspace-pnpm-empty` (declared `packages: [apps/*]`, no app matches) | CLI root | exit 2, the "no React app under those patterns" notice with the pattern list; never "0 apps. Pick one:" |
| `workspace-pnpm-unparsable` | CLI root | exit 0 as single project; one dim notice naming the parse error |
| `workspace-nx-no-workspaces` | CLI root, `--root apps/web` | section 4 |
| `workspace-turbo` (`turbo.json` + npm workspaces) | CLI root | table; `Workspace: npm (package.json:3; also turbo.json)` |
| `two-host-configs` | `doctor`, Vite dev server | `Host: vite … also next.config.js, ignored`; readiness `locate.host` ok |
| `lockfile-vs-packageManager` | `doctor` | declared wins, lockfile in the evidence |
| `override-wins` (workspace root; run with `--root .` and with `plumb({ root: '.' })` from Vite) | CLI, Vite | both run; readiness `project.root.source === 'override'` |
| `nested-app` (`apps/web/examples/demo`) | CLI root | table lists `apps/web` once |
| `nested-worktrees` (the second trigger: a single app with `.claude/worktrees/{a,b}/` built by real `git worktree add`, each a full copy with `src/index.css`) | `state`, `state --json`, `doctor`, Vite dev server | `state` names **one** Tailwind entry and no `split` flag; `facts.checkouts.value` has two paths with `.git` file evidence; `doctor` `Checkouts: 2 nested, excluded`; readiness `locate.source` lists nothing from the worktrees. Then run with `--root .claude/worktrees/a`: exit 0, one entry, `boundary` is that worktree. |
| `submodule-app` (real `git submodule add` of a tiny app under `vendor/ui`, plus `.gitmodules`) | CLI at root, CLI in `vendor/ui` | root: `vendor/ui/src/**` absent from `state --json` file counts; `doctor` names it `submodule (.gitmodules:2)`. In the submodule: `boundary` is `vendor/ui`; `e2e/shared-source.test.mjs:19` still passes. |
| `submodule-uninitialised` (`.gitmodules` entry, empty folder) | `doctor` | row shows the declared path, excluded, no error |
| `vendored-clone` (`tmp/other/.git` directory, with its own `src/index.css`) | `state` | one entry; `tmp/other` in `checkouts` |
| `checkout-as-app` (declared workspace, `apps/vendored` is a submodule with a React app) | CLI root, `--root apps/vendored` | table lists it; chosen app runs with its own boundary |
| `plain-css-react` | CLI | `Styling: plain CSS`; today's advisory text unchanged (`cli-setup.test.mjs:128`) |
| `tailwind-declared-not-installed` | CLI, `state` | one message, from one place; `state` rung `not-installed` |

Cross-cutting assertions, run for every row: (a) `state --json`'s `facts` deep-equal the `project` block of
`/__plumb/readiness` when a host is in the row ("same answer from every entry point"); (b) every non-unknown fact
has at least one evidence line and that file exists; (c) `snapshot(root)` before and after is identical (reuse
`cli-setup.test.mjs:23-30`); (d) a `grep -rn existsSync src --exclude-dir=project-facts` finds no hit on
`pnpm-workspace`, `workspaces`, lockfile names or `*.config.*` names (R6, in `e2e/release-guards.test.mjs`).

Existing tests that pin today's text (`cli-setup.test.mjs:73`, `onboarding-state.test.mjs:78`,
`hosts.test.mjs:248`, `readiness.test.mjs:297`) stay green through every layer; where a message changes (the
0-apps case) the test changes in the same commit as the layer.

## 6. Migration in atomic layers

Each layer is one commit, finishes on its own, and is verified by the matrix rows named. Smallest first.

- **L0 (landed, 0cada15): `pnpm-workspace.yaml` without `packages:` is not a workspace.** `pnpmDeclaresPackages`
  (`source-boundary.ts:7`) called from `source-boundary.ts:11` and `cli-project.ts:30`, plus a `cli-setup.test.mjs`
  case. **Subsumed by L1**: the predicate becomes the body of the `workspace.pnpm` detector and the two call sites
  go away with `workspaceApps`' own parsing.
- **L0b (smallest next step, ships alone): nested checkouts leave membership.** A `checkouts` scan and
  `ignore` derived from it, wired into `matchProjectFiles` (`project.ts:20,26,32`) and `workspaceApps`
  (`cli-project.ts:37`) through one new function, before `ProjectFacts` exists. This is the second trigger's fix
  and is worth shipping on its own because every `plumber state` run in a repo with agent worktrees is wrong today.
  Verify: `nested-worktrees`, `submodule-app`, `vendored-clone` rows. **Subsumed by L1**, which moves the scan into
  the `checkouts.git` detector and makes `ignore` a method on the facts (R10).
- **L1: `ProjectFacts` with `root`, `boundary`, `workspace`, `apps`, `packageManager`, `checkouts` only.** New
  `src/project-facts/` with the primitives, the resolver and the workspace/pm/checkouts detectors from section 2.
  `cliProject`, `sourceBoundary`, `readState`, `install.ts` (CI lockfile), `matchProjectFiles` and `Session.create`
  read facts; `workspaceApps`, `packageManager()` and `ignore` become thin wrappers over `facts.*` so no caller text
  changes. Behaviour identical to L0+L0b except the 0-apps message. Verify: whole existing e2e suite plus the first
  eight matrix rows and the checkout rows.
- **L2: failure behaviour and overrides.** Unknown state for unparsable files, `conflicts`, `--root` and
  `plumb({ root })` as `override` (R4), the zero-apps notice (R7). Verify: rows `workspace-pnpm-empty`,
  `workspace-pnpm-unparsable`, `override-wins`, `lockfile-vs-packageManager`, `checkout-as-app`.
- **L3: `host` fact.** Fold `hostConfig`'s file discovery (`readiness/config.ts:88-95`), `declaredHost`
  (`readiness/index.ts:149-155`), `install.ts:104-106`, `overlay.ts:244-250` and `cli-project.ts:48` into
  `host.config`, `host.manifest`, `host.runtime`. `hostConfig` keeps parsing the chosen file for plugin order; it
  no longer chooses the file. Verify: `two-host-configs`, `hosts.test.mjs:248`, `readiness.test.mjs:297`.
- **L4: `styling` and `react` facts.** One `require.resolve` for Tailwind and one for React; `resolvedTailwind`,
  `tailwindVersion`, `overlaySetupNotice` and `readiness/index.ts:176` read the fact. One precedence rule for the
  major: installed beats declared (today `state.ts:266` says the opposite; the owner picks, section 7). Verify:
  `plain-css-react`, `tailwind-declared-not-installed`, `onboarding-state.test.mjs` fixtures.
- **L5: facts are public.** `doctor` `Project` table, `state --json#facts`, readiness `project` block, and the
  cross-cutting assertion (a). Verify: every row. This is the layer that makes the system *reliable* in the owner's
  sense: explainable with evidence.
- **L6: new detectors, one per commit.** Nx (section 4), Turborepo (evidence only), Lerna (`lerna.json#packages`),
  Rush (`rush.json#projects`), Moon (`.moon/workspace.yml#projects`), Bun (fixture only), Deno
  (`deno.json#workspace`), then hosts as plugins exist. Each is a detector file, a fixture folder and a matrix row.

L0b is the layer to start now; L1 follows and is a move, not a change, and the existing suite proves it.

## 7. Open questions for the owner

1. **Tailwind major precedence.** `cli-project.ts:46-48` prefers installed, `state.ts:265-268` prefers declared.
   The brief proposes installed-beats-declared (what actually runs). Confirm.
2. **Inferred multi-app roots.** Today two sibling React apps with no `workspaces` key count as a workspace
   (`cli-project.ts:50`). The brief drops that (R1: presence is not a declaration). Is anyone relying on it?
3. **Zero-apps exit code.** Exit 2 with a notice, or exit 0 and run in the root folder as a single project? The
   brief says exit 2 because the root of a declared workspace rarely has source to judge, but running is friendlier.
4. **Observed beats declared (R3).** A running Vite server with `package.json` saying `next`: trust the server?
   The brief says yes.
5. **Where does `repo` (git top level, `install.ts:69`) live?** As `facts.boundary`, or a separate `facts.repo`
   fact? The brief folds it into `boundary` only when no workspace is declared; CI `working-directory` may want the
   git root regardless.
6. **Public shape stability.** `state --json#facts` and readiness `project` become part of the agent-facing
   surface. Version them under `schemaVersion` with the rest, or mark experimental for one release?
7. **Scope of R6.** Should the no-`existsSync` grep guard also cover `src/collect/entries.ts:57` (bundler configs
   used to find the CSS entry), or is that a different question (entry discovery, not project identity)?
8. **Checkout scan depth.** `checkouts.git` must look below `root` for `.git` entries. Bounded how: skip the
   static ignore folders and stop at, say, depth 6? Or only scan folders that the source globs and `**/*.css` would
   otherwise enter (cheaper, but then membership depends on config)? The brief prefers the fixed bound.
9. **A checkout the user wants in.** Someone may deliberately keep a worktree of a shared `packages/ui` inside the
   app and expect it judged. Should `source` globs in `plumber.config` be allowed to re-include a path under
   `checkouts` (explicit beats observed, consistent with R3), or is a checkout always out?

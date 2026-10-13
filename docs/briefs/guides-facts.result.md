# Guides facts

Scope: four guides, facts only, per `docs/briefs/guides-facts.md:1-13`. Commands below invoke the existing `dist/cli.js`, the package's CLI entry (`package.json:7-9`). All displayed output is captured from real runs; copied source and generated files are identified separately. No rebuild required. No build, UI edits, or commits in the shared checkout. Scratch Git history was created only for base/HEAD comparisons; no GitHub messages were sent. CI runner evidence uses a local mock GitHub API, not a hosted Actions run (see `docs/briefs/guides-facts.result.md:402`).

## 1. The overlay in your app

**Install and host wiring.** `plumb install --overlay` prints wiring by default; `--write` opts into source edits. Detection checks package dependencies/devDependencies, preferring Next.js over Vite. Vite wiring places `plumb()` before `react()`; Next wiring uses the config wrapper, encoded App Router folder, and root-layout component. (`src/adoption/install.ts:93-128`, `src/cli.ts:144-151`.)

### Vite: exact install output

Implementation: `src/adoption/install.ts:122-128`. Evidence: `docs/briefs/guides-facts.result.md:14`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/vite
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js install --overlay
exit: 0
stdout:
Add to vite.config.ts:
import { plumb } from '@unlocalhosted/plumb/vite';
// Put first in your existing plugins array, before react():
plumb()
stderr:
(empty)
```

### Next.js: exact install output

Implementation: `src/adoption/install.ts:104-121`. Evidence: `docs/briefs/guides-facts.result.md:31`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/next
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js install --overlay
exit: 0
stdout:
Wrap your existing next.config.mjs export:
import { withPlumb } from '@unlocalhosted/plumb/next/config';
export default withPlumb(nextConfig);
// Keeps existing pageExtensions and serverExternalPackages; adds Plumb only in development.

Add to app/%5F_plumb/[...path]/route.plumb.ts (or src/app/%5F_plumb/[...path]/route.plumb.ts):
// Serves /__plumb/*; a literal app/__plumb/ folder is private in Next.js.
import { createPlumbRoute } from '@unlocalhosted/plumb/next';
export const runtime = 'nodejs';
export const { GET, POST } = createPlumbRoute();

Add to your root layout:
import { PlumbOverlay } from '@unlocalhosted/plumb/next';
// Inside <body>:
<PlumbOverlay />
stderr:
(empty)
```

**Vite host.** The plugin creates/reuses a Session, mounts `/__plumb/*` middleware on the existing dev server, and injects the client. Normal builds do not apply the plugin; explicit `demo` opt-in changes that. Source stamping is a pre-transform, checks configured source files, and warns/disables stamping if a React transform precedes it. `stamp: false` is available for HTML prerendered without stamps. (`src/hosts/vite.ts:23-44`, `src/hosts/vite.ts:61-98`, `src/hosts/source-stamping.ts:39-70`.)

### Vite: exact plugin application guard

Implementation: `src/hosts/source-stamping.ts:44-49` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:61`.

```ts
  return {
    name: 'plumb',
    enforce: 'pre',
    apply(userConfig, environment) {
      return (environment.command === 'serve' || production) && !process.env.VITEST && !(userConfig as { test?: unknown }).test;
    },
```

### Vite: exact middleware and client injection

Implementation: `src/hosts/vite.ts:91-99` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:74`.

```ts
      server.httpServer?.once('close', () => { if (!owned.restarting) void relinquish(); });
      server.middlewares.use(createHandler(owned.session, { client: true, servedRoot: server.config.root }));
    },
    transformIndexHtml: { order: 'pre', handler() {
      if (demo && (production || demo.guard)) return [{ tag: 'script', attrs: { type: 'module' }, children: `import 'virtual:plumb-demo';`, injectTo: 'head' }];
      return [{ tag: 'script', attrs: { type: 'module', src: '/__plumb/client.js' }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'module' }, children: `import { invalidateSourceMaps } from '/__plumb/src/sourcemap.js';
if (import.meta.hot) import.meta.hot.on('vite:afterUpdate', invalidateSourceMaps);`, injectTo: 'head' }];
    } },
```

**Next.js guards.** `withPlumb` changes config only when `NODE_ENV === 'development'`, retaining existing page extensions and external packages. `createPlumbRoute` returns 404 in production and dynamically loads the Node implementation otherwise; `PlumbOverlay` returns null in production. The process token is server-rendered in the development script tag. This integration is for App Router; automatic `--write` wiring for other Next layouts is **not supported**. (`src/hosts/next-config.ts:3-11`, `src/hosts/next.ts:17-39`, `src/adoption/overlay.ts:242-254`.)

### Next.js: exact config wrapper

Implementation: `src/hosts/next-config.ts:4-11` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:92`.

```ts
export function withPlumb(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;
  // The overlay asks Next to trace browser frames the way Next's own overlay does, by their file in this directory.
  process.env.PLUMB_NEXT_DIST_DIR = nextConfig.distDir ?? '.next';
  return { ...nextConfig,
    pageExtensions: [...new Set([...(nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js']), 'plumb.ts', 'plumb.tsx'])],
    serverExternalPackages: [...new Set([...(nextConfig.serverExternalPackages ?? []), '@unlocalhosted/plumb'])],
  };
```

### Next.js: exact route implementation

Implementation: `src/hosts/next.ts:17-28` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:107`.

```ts
export function createPlumbRoute(options: SessionOptions = {}): { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> } {
  // A build-time branch keeps bundlers from even resolving the development import.
  const handle = process.env.NODE_ENV === 'production' ? async (): Promise<Response> => new Response(null, { status: 404 }) : async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
    const shared = state();
    shared.handler ??= import('./next-dev.js').then(({ handler }) => handler(options, shared.token)).catch(error => {
      delete shared.handler; throw error;
    });
    return (await shared.handler)(request);
  };
  return { GET: handle, POST: handle };
}
```

### Next.js: exact overlay component

Implementation: `src/hosts/next.ts:37-40` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:126`.

```ts
export function PlumbOverlay(): ReactElement | null {
  if (process.env.NODE_ENV === 'production') return null;
  return createElement('script', { type: 'module', src: '/__plumb/client.js', 'data-plumb-token': state().token, 'data-plumb-next-dist': distDir() });
}
```

**Other hosts.** Manual development-page integration is supported via `plumb serve --overlay --port 7331 --origin <page-origin>`. Without an active server, install prints the placeholder below; with matching `.plumb/serve.json`, it prints the live port/token. Automatic source wiring for generic hosts is **not supported**. (`src/adoption/install.ts:129-139`, `src/adoption/overlay.ts:254`, `src/session/server.ts:229-258`.)

### Generic host: exact install output

Implementation: `src/adoption/install.ts:129-139`. Evidence: `docs/briefs/guides-facts.result.md:139`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/generic
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js install --overlay
exit: 0
stdout:
Start your overlay server (replace the origin with your development page origin):
plumb serve --overlay --port 7331 --origin http://localhost:5555
Run plumb install --overlay again for the exact port and process token, or replace TOKEN_FROM_SERVE_JSON with .plumb/serve.json token.

Paste into your development page only:
<script type="module" src="http://127.0.0.1:7331/__plumb/client.js" data-plumb-token="TOKEN_FROM_SERVE_JSON"></script>
stderr:
(empty)
```

**Inspect and read.** Hold Alt (Option on a Mac) to arm inspection, move over an element, then click to pin its reading; releasing Alt ends hover inspection. Select in the dock arms a sticky picker without Alt. Esc closes the reading; Alt+Up/Down steps through the authored owner chain. (`overlay/src/widget.js:4-17`, `overlay/src/widget.js:370`, `overlay/src/widget.js:526-549`, `overlay/src/widget.js:587-596`.)

The reading shows tag/component, file and source position, status such as off/on-system/previewing, owner navigation, a drawing with zoom controls, findings and ledger status (new/known debt/accepted), exact replacement when available, token choices with values/reasons, and direct text runs. Before, Undo, Copy for agent, and the context-sensitive Preview/Write control operate on that reading. (`overlay/src/widget.js:717-767`, `overlay/src/widget.js:910-939`, `overlay/src/widget.js:942-961`, `overlay/src/widget.js:1060-1076`, `overlay/src/widget.js:1164-1234`.)

**Preview and Write.** Choosing a token previews it through inline styles on the selected element; nothing is persisted until Write. Write sends offered edit IDs, file and source hash; text writes re-read current runs after class writes, then send run ID, old/new text and the current hash. The overlay re-reads after writes and lifts previews once the app reflects source. A dev host must reload/HMR the edited source; if it does not, the card says to reload. (`overlay/src/widget.js:1079-1089`, `overlay/src/widget.js:1313-1371`.)

Class edits are exact authored replacements, preserving variants, negative signs and important markers when supported. CSS and inline-style replacements are also supported by the shared edit engine where it can derive an exact replacement; this is not a general arbitrary code editor. Explicit person writes may pay down baseline debt; accepted exceptions are excluded. (`src/surfaces/edits.ts:24-46`, `src/surfaces/edits.ts:49-86`.)

Static direct JSX text, string literals and template literals without expressions can be edited. Nested markup is left intact; ordinary labels remain JSX text, syntax/whitespace-sensitive replacements use a string literal, and existing literal quote style is preserved. (`src/session/text.ts:55-108`, `src/session/engine.ts:498-508`, `src/session/text-encoding.ts:1-14`.)

### Write: exact requests used by the overlay

Implementation: `overlay/src/widget.js:1327-1340` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:168`.

```js
    try {
      if (ids.length) await post('apply', { file: s.file, hash: s.hash, edits: ids });
      // Each text change is written against the file as it is now: read the runs again, find the one that still says
      // what the person started from, and write only that. The server refuses if it no longer does.
      for (const t of texts) {
        const now = await request('text', { file: s.file, line: s.line, column: s.column });
        const run = now?.editable ? now.runs.find(r => r.text === t.from) : null;
        if (!run) throw new Error(`The text "${t.from}" changed since Plumb read it.`);
        // Lift the preview first: the write is checked against the page as source made it, then the page shows the
        // written words (a dev server's reload, or the homepage's replay). If the write is refused, the preview returns.
        if (t.node.isConnected) t.node.data = t.lead + t.from + t.trail;
        try { await post('apply-text', { file: s.file, hash: now.hash, run: run.id, from: t.from, to: t.to }); }
        catch (error) { if (t.node.isConnected) t.node.data = t.lead + t.to + t.trail; throw error; }
      }
```

**Refusals and their reasons.**

- No fitting token, multiple unchosen tokens, or no exact edit for a syntax cannot be auto-written. The card asks for a choice, reports no nearby token, or offers Copy for agent. Ambiguous computed-class origins are counted without choosing a source; helper-depth limits and classes authored elsewhere are disclosed. (`overlay/src/widget.js:484-510`, `overlay/src/widget.js:958-972`, `overlay/src/widget.js:1164-1211`.)
- Dynamic expressions, props, externally supplied children, and translations are not editable text runs; edit their real source. Static siblings may still have editable runs. `Trans` ancestry suppresses runs. (`src/session/text.ts:10-16`, `src/session/text.ts:63-92`.)
- Empty/whitespace-only replacements and text longer than 500 characters are refused. Unknown run IDs and mismatched old text require a re-read, protecting source from stale client instructions. (`src/session/engine.ts:474-502`, `src/session/text-encoding.ts:16-22`.)
- Changed file hash, unknown edit IDs, and overlapping replacements are refused. The server re-derives edits from current source/decisions; a client cannot supply arbitrary replacement ranges. (`src/session/engine.ts:517-549`, `src/session/server.ts:68-71`.)
- Config, `.plumb` files, symbolic links, paths outside the project, hard-linked/non-regular files, and file identity changes are refused. These checks keep writes on the intended source file and prevent policy changes through Apply. (`src/session/engine.ts:579-599`.)

**Token header and origins.** Authenticated requests use `x-plumb-token`; the client reads the token from `data-plumb-token` on its module script. Client modules themselves carry no secrets. Next uses a process token; standalone serve generates a random token and records discovery details. Vite's mounted handler does not set a token: it checks loopback peer/Host and same-origin browser writes instead. For token-backed standalone overlay routes, the configured page origin is enforced when supplied and controls CORS; a missing/invalid token is 401. The module-script route bypasses token authentication because script loads cannot set custom headers. (`overlay/src/api.js:1-9`, `overlay/src/api.js:28-33`, `src/hosts/vite.ts:92`, `src/hosts/next.ts:12-14`, `src/hosts/next.ts:37-39`, `src/session/server.ts:27`, `src/session/server.ts:126-161`, `src/session/server.ts:248-258`.)

### Token header: exact POST transport

Implementation: `overlay/src/api.js:28-33` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:199`.

```js
// Writes go through the same token and origin policy as reads; the server re-derives every edit from current source.
export async function post(method, body) {
  const response = await fetch(new URL(method, base), { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-plumb-token': token } : {}) }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error ?? `Plumb refused ${method}.`), { status: response.status });
  return result;
```

**Deployed/static behavior.** Ordinary Vite production builds omit client/stamps; Next production renders no overlay and refuses its route. Homepage replay is an explicit exception, not automatic deployed-site inspection. (`src/hosts/source-stamping.ts:47-49`, `src/hosts/vite.ts:23-30`, `src/hosts/next.ts:19-20`, `src/hosts/next.ts:37-39`, `site/REPLAY.md:25`.)

### Static replay: exact opt-in documented for the site

Implementation: `site/REPLAY.md:19-22` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:214`.

```js
plumb({
  config: 'plumb.config.mjs',
  demo: { replay: 'src/hero/replay.js', guard: true },
})
```

Replay loads its transport before the real client. Reads come from recorded `/__plumb/*` answers; class writes validate recorded IDs/hash, change matching stamped DOM elements, advance in-memory source/hash/revision and emit `plumb:demo-applied`. Text writes validate the recorded run and update direct DOM text nodes, refusing missing/ambiguous/externally changed runs. Reload resets both edit kinds. No visitor write touches source or needs a backend. Unrelated fetches pass through; unrecorded elements receive refusals. A general offline server or writable arbitrary deployed site is **not supported**. The finite recorded hero is the writable scope, with less owner detail under production React. (`site/REPLAY.md:25-35`.)

Current site config opts out of replay only in `record-replay` mode and sets `guard: true` otherwise; dev guard uses replay for recorded hero and real server for other sources. Re-record after hero/owners, theme/config or engine changes. No recording or browser validation was performed for this facts-only task; historical verification described in REPLAY is documentation, not fresh proof. (`site/vite.config.mjs:8-14`, `site/REPLAY.md:14`, `site/REPLAY.md:25-31`, `docs/briefs/guides-facts.md:1-7`.)

## 2. CI and pull requests

**Action contract.** All four inputs are optional: `base` defaults to the event PR base SHA through the runner (empty action default), `working-directory` defaults to `.`, `ledger-approvers` defaults to empty, and `token` defaults to `github.token`. Comma/space-separated individual logins are accepted. Declared Action outputs are **not supported**: there is no `outputs:` contract. Results are workflow annotations, step summary, PR comment, and status. The composite action installs its own dependencies with scripts disabled and builds its own checkout; those action commands below were copied, not run in the shared workspace. (`action.yml:3-38`, `scripts/action/run.mjs:13-31`, `scripts/action/run.mjs:51-66`.)

### Action: exact action.yml

Implementation: `action.yml:1-38` (verbatim source excerpt). Evidence: `docs/briefs/guides-facts.result.md:233`.

```yaml
name: Plumb
description: Check design drift, annotate new drift, touched debt and exceptions, and review ledger growth.
inputs:
  base:
    description: PR base commit or Git ref (defaults to the PR base SHA).
    required: false
    default: ''
  working-directory:
    description: Project directory containing the Plumb config.
    required: false
    default: '.'
  ledger-approvers:
    description: Comma or space separated GitHub logins allowed to approve ledger growth. Approver authors are exempt.
    required: false
    default: ''
  token:
    description: GitHub token with pull-requests write permission.
    required: false
    default: ${{ github.token }}
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: '22.18.0'
    - name: Install Plumb
      shell: bash
      run: |
        npm ci --ignore-scripts --prefix "$GITHUB_ACTION_PATH"
        npm run build --prefix "$GITHUB_ACTION_PATH"
    - name: Check design decisions
      shell: bash
      env:
        GITHUB_TOKEN: ${{ inputs.token }}
        PLUMB_BASE: ${{ inputs.base }}
        PLUMB_WORKING_DIRECTORY: ${{ inputs.working-directory }}
        PLUMB_LEDGER_APPROVERS: ${{ inputs.ledger-approvers }}
      run: node "$GITHUB_ACTION_PATH/scripts/action/run.mjs"
```

**Base comparison.** The runner requires `PLUMB_BASE` or PR base SHA and runs `check --root <working-directory> --base <ref>` in GitHub and JSON formats. Base history must be fetched. Findings in changed files can fail; out-of-scope new sites remain visible as data. Annotation scope is narrower: added/replaced lines, including untracked lines. The base is a specified commit/ref, not an implicit merge-base calculation. Base coverage is analyzed from a temporary Git archive with read-only links to installed dependencies. (`scripts/action/run.mjs:13-31`, `src/ledger/git.ts:15-34`, `src/ledger/check.ts:29-30`, `src/ledger/check.ts:93-98`, `src/surfaces/changed-lines.ts:11-35`, `src/surfaces/base.ts:11-42`.)

**Approval gate.** Growth means a new/kind-changed entry, increased debt count, or changed canonical decision/exception record. Under `--base`, debt growth is an error; decision/exception growth is info pending the Action review gate. No growth passes the gate; an approver author is exempt. Otherwise at least one configured approver's latest substantive review must be APPROVED. Comments do not cancel approval; later CHANGES_REQUESTED or DISMISSED do. Empty approvers cannot approve another author's growth. This gate checks current review state, not whether approval's commit ID equals the latest head. Team handles are **not supported** as approvers; installer warns to list individual members. (`src/ledger/check.ts:17-21`, `src/ledger/check.ts:109-118`, `scripts/action/approval.mjs:5-15`, `scripts/action/run.mjs:51-55`, `src/adoption/install.ts:82-84`.)

**Exit codes.** CLI check: 0 if no error-level findings; 1 if error findings remain; 2 for invalid input/config/runtime failures. With neither config nor ledger, the initial check is advisory and exits 0. Stale debt/vanished tokens are warnings, not automatic failures. Action status is 0 only if check and approval gate pass; check failure, missing approval, or runner errors exit 1. Approval never overrides a failing check. (`src/cli.ts:171-184`, `src/cli.ts:309-313`, `src/ledger/check.ts:33-52`, `scripts/action/run.mjs:23`, `scripts/action/run.mjs:62-66`.)

**Minimal workflow.** The file below is the installer-generated workflow for the plain-CSS fixture, with ledger owner inferred from `/.plumb/ledger.jsonl @ledger-owner` in CODEOWNERS. It checks out PR head with full history, handles review submission/dismissal, requests comment permission, and pins the action to this checkout's revision. For a project with dependencies, installer adds the detected package-manager install step; install the app's dependencies before analysis. Existing workflows are kept. Hosted execution of this exact pin was not verified; the runner/approval path was exercised locally below. (`src/adoption/install.ts:42-90`, `src/adoption/install.ts:176-179`, `docs/briefs/guides-facts.result.md:286`, `docs/briefs/guides-facts.result.md:402`.)

### Minimal workflow: exact generated .github/workflows/plumb.yml

Implementation: `src/adoption/install.ts:66-90`. Evidence: `docs/briefs/guides-facts.result.md:286`.

```yaml
name: Plumb
on:
  pull_request:
  pull_request_review:
    types: [submitted, dismissed]
permissions:
  contents: read
  pull-requests: write
jobs:
  plumb:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '22.18.0'
      - uses: unlocalhosted/plumb@8b90b9d323326ede3435ea435332d21996a52b54
        with:
          base: ${{ github.event.pull_request.base.sha }}
          working-directory: "."
          ledger-approvers: "@ledger-owner"
```

**PR comments and annotations are supported.** Annotations are GitHub workflow commands with file, line, column, title and message; accepted debt/exception notices require a touched line. Summary counts include new/fixed/debt/exceptions, coverage delta versus base, ledger growth and annotation totals. A sticky issue comment starts with `<!-- plumb-summary -->`; the runner patches an existing matching github-actions[bot] comment or creates one, appending the approval message. These are workflow annotations and a summary comment, not inline PR review comments. Inline review-comment posting is **not supported** by this runner. (`src/surfaces/github.ts:18-44`, `src/surfaces/github.ts:48-68`, `scripts/action/run.mjs:26-31`, `scripts/action/run.mjs:56-60`.)

### New drift: real annotation and summary

Implementation: `src/cli.ts:174-180`, `src/surfaces/github.ts:18-68`. Evidence: `docs/briefs/guides-facts.result.md:319`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --base HEAD --format github
exit: 1
stdout:
::error file=src/new.css,line=1,col=8,title=gap 13px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related gap: var(--spacing-related) "Related items use eight pixels."; 16px --spacing-group gap: var(--spacing-group)
## Plumb

1 new, 2 fixed, 7 debt, 0 exceptions.

## Coverage

spacing: 1/3 (33.3%); +33.3 pp vs base.

color: 2/2 (100%); +0 pp vs base.

radius: no decisions.

type: no decisions.

motion: no decisions.

elevation: no decisions.

z: no decisions.

## Ledger

0 growth lines.

## Review annotations

New: 1.

Debt touched: 0.

Exception touched: 0.
stderr:
(empty)
```

### Touched debt and exception: real annotations

Implementation: `src/surfaces/github.ts:48-68`. Evidence: `docs/briefs/guides-facts.result.md:364`.

```text
cwd: /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --base HEAD --format github
exit: 0
stdout (annotation lines only; unmodified excerpts):
::notice file=src/new.css,line=1,col=8,title=gap 13px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related gap: var(--spacing-related) "Related items use eight pixels."; 16px --spacing-group gap: var(--spacing-group) Exception touched: This changed line has an accepted exception. Reason: Fixture exception for review gate Key: provenance/spacing:.new:gap:gap: 13px@src/new.css#.new.
::notice file=src/styles.css,line=12,col=13,title=margin-left 10px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related margin-left: var(--spacing-related) "Related items use eight pixels." Debt touched: This changed line contains existing debt. Key: provenance/spacing:.physical:margin-left:margin-left: 10px@src/styles.css#.physical.
stderr:
(empty)
```

**Local runner exercise.** A scratch PR adds one reasoned exception after paying down debt. Local API fixture returns contributor as PR author, no existing bot comments, and either no reviews or an APPROVED review by ledger-owner. Both invocations use the same current source and base; only review state changes. The captured posted body below came from the actual runner's HTTP POST to that local API. It is not a GitHub-hosted comment or screenshot. (`docs/briefs/guides-facts.result.md:381`, `docs/briefs/guides-facts.result.md:402`, `docs/briefs/guides-facts.result.md:423`; runner API/gate implementation: `scripts/action/run.mjs:32-60`.)

### Action runner: growth without approval

Implementation: `scripts/action/run.mjs:19-66`, `scripts/action/approval.mjs:5-15`. Evidence: `docs/briefs/guides-facts.result.md:381`.

```text
cwd: /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
GITHUB_EVENT_PATH="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/event.json"
GITHUB_TOKEN="local-fixture-token"
GITHUB_API_URL="http://127.0.0.1:51872"
PLUMB_WORKING_DIRECTORY="/private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption"
PLUMB_LEDGER_APPROVERS="@ledger-owner"
GITHUB_STEP_SUMMARY="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/summary-false.md"
$ node /Users/vijaysingh/unlocalhosted/plumb/scripts/action/run.mjs
exit: 1
stdout:
::notice file=src/new.css,line=1,col=8,title=gap 13px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related gap: var(--spacing-related) "Related items use eight pixels."; 16px --spacing-group gap: var(--spacing-group) Exception touched: This changed line has an accepted exception. Reason: Fixture exception for review gate Key: provenance/spacing:.new:gap:gap: 13px@src/new.css#.new.
::notice file=src/styles.css,line=12,col=13,title=margin-left 10px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related margin-left: var(--spacing-related) "Related items use eight pixels." Debt touched: This changed line contains existing debt. Key: provenance/spacing:.physical:margin-left:margin-left: 10px@src/styles.css#.physical.
stderr:
plumb: Ledger grew (1 lines). Approval required from @ledger-owner.
```

### Action runner: same growth with approval

Implementation: `scripts/action/run.mjs:19-66`, `scripts/action/approval.mjs:5-15`. Evidence: `docs/briefs/guides-facts.result.md:402`.

```text
cwd: /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
GITHUB_EVENT_PATH="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/event.json"
GITHUB_TOKEN="local-fixture-token"
GITHUB_API_URL="http://127.0.0.1:51872"
PLUMB_WORKING_DIRECTORY="/private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption"
PLUMB_LEDGER_APPROVERS="@ledger-owner"
GITHUB_STEP_SUMMARY="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/summary-true.md"
$ node /Users/vijaysingh/unlocalhosted/plumb/scripts/action/run.mjs
exit: 0
stdout:
::notice file=src/new.css,line=1,col=8,title=gap 13px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related gap: var(--spacing-related) "Related items use eight pixels."; 16px --spacing-group gap: var(--spacing-group) Exception touched: This changed line has an accepted exception. Reason: Fixture exception for review gate Key: provenance/spacing:.new:gap:gap: 13px@src/new.css#.new.
::notice file=src/styles.css,line=12,col=13,title=margin-left 10px isn't on your spacing scale::Off-scale spacing makes layouts drift apart and can't be changed from the theme. 8px --spacing-related margin-left: var(--spacing-related) "Related items use eight pixels." Debt touched: This changed line contains existing debt. Key: provenance/spacing:.physical:margin-left:margin-left: 10px@src/styles.css#.physical.
stderr:
(empty)
```

### PR comment: exact body captured from local API POST

Implementation: `scripts/action/run.mjs:56-60`. Evidence: `docs/briefs/guides-facts.result.md:423`.

```markdown
<!-- plumb-summary -->
## Plumb

0 new, 2 fixed, 7 debt, 1 exceptions.

## Coverage

spacing: 1/3 (33.3%); +33.3 pp vs base.

color: 2/2 (100%); +0 pp vs base.

radius: no decisions.

type: no decisions.

motion: no decisions.

elevation: no decisions.

z: no decisions.

## Ledger

1 growth lines.

This change adds 1 ledger entries

## Review annotations

New: 0.

Debt touched: 1.

Exception touched: 1.

Ledger growth approved.
```

**Observed local path limitation.** Passing the macOS `/var/folders/...` alias as `PLUMB_WORKING_DIRECTORY` failed before API posting because Git resolved the repository as `/private/var/folders/...`. Re-running with the canonical real path produced the approval evidence above. Avoid claiming alias-normalization works in this runner: **not supported** in this observed invocation. (`docs/briefs/guides-facts.result.md:468`; lexical path check: `src/ledger/git.ts:20-24`; runner root: `scripts/action/run.mjs:13`.)

### Action runner: initial alias-path refusal

Implementation: `scripts/action/run.mjs:13`, `src/ledger/git.ts:20-24`. Evidence: `docs/briefs/guides-facts.result.md:468`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
GITHUB_EVENT_PATH="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/event.json"
GITHUB_TOKEN="local-fixture-token"
GITHUB_API_URL="http://127.0.0.1:51776"
PLUMB_WORKING_DIRECTORY="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption"
PLUMB_LEDGER_APPROVERS="@ledger-owner"
GITHUB_STEP_SUMMARY="/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/summary-false.md"
$ node /Users/vijaysingh/unlocalhosted/plumb/scripts/action/run.mjs
exit: 1
stdout:
(empty)
stderr:
plumb action: plumb: Git comparison file is outside the repository: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.plumb/ledger.jsonl.
```

## 3. Agents

**What install writes for Claude Code.** On a fresh project, `plumb install --agent claude` writes `.claude/skills/plumb/SKILL.md` (the packaged skill, verbatim) and `.claude/settings.json` with a PostToolUse hook for `Edit|Write|MultiEdit`. The hook runs `plumb check --changed --agent --strict-ledger`. It preserves unrelated settings/hooks and avoids duplicating equivalent entries. `--ci` additionally writes the Git-root workflow if absent. Auto-detection recognizes `.claude` or `CLAUDE.md`; detected agents remain selected alongside explicit ones. (`src/adoption/install.ts:16-19`, `src/adoption/install.ts:143-154`, `src/adoption/install.ts:167-202`, `src/surfaces/hooks.ts:5-35`.)

Install does not create or update `CLAUDE.md`, `PLUMB.md`, or standalone `.claude/commands/*` files: those install artifacts are **not supported** by its plan. The installed skill contains CLI guidance, not separate generated slash-command definitions. `plumb agent-docs` is the separate command that writes `PLUMB.md` and prints a block to add to AGENTS.md/CLAUDE.md. (`src/adoption/install.ts:160-185`, `src/surfaces/docs.ts:37-41`, `src/cli.ts:269`.)

### Claude Code + CI: exact fresh install output

Implementation: `src/adoption/install.ts:186-202`, `src/surfaces/hooks.ts:37-48`. Evidence: `docs/briefs/guides-facts.result.md:494`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js install --agent claude --ci
exit: 0
stdout:
Agents: none detected.
Selected: Claude Code.
--- /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.claude/settings.json
+++ /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.claude/settings.json
@@ settings before / after @@

+{
+  "hooks": {
+    "PostToolUse": [
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "plumb check --changed --agent --strict-ledger"
+          }
+        ]
+      }
+    ]
+  }
+}
Wrote .claude/skills/plumb/SKILL.md.
Wrote .github/workflows/plumb.yml.
CI approvers: none. Set ledger-approvers in .github/workflows/plumb.yml before approving new tokens or exceptions.
stderr:
(empty)
```

### Claude Code: exact installed settings

Implementation: `src/surfaces/hooks.ts:5-35`. Evidence: `docs/briefs/guides-facts.result.md:531`.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "plumb check --changed --agent --strict-ledger"
          }
        ]
      }
    ]
  }
}
```

### Claude Code: exact installed skill

Implementation: `skills/plumb/SKILL.md:1-55`, `src/adoption/install.ts:154-168`. Evidence: `docs/briefs/guides-facts.result.md:553`.

````markdown
---
name: plumb
description: Keep UI code on the project's design system with the Plumb CLI (works with any coding agent or by hand). Use before and after writing or changing styles in a project that has plumb.config.ts, .plumb/ledger.jsonl or @unlocalhosted/plumb installed: Tailwind classes, cn/cva maps, CSS, @apply, inline style objects, or a design-system component's props. Also use when asked why a style is flagged, which token to use, or whether a value is on the scale.
---

# Plumb

These instructions are for any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Windsurf) and for people. They only use the `plumb` CLI.

Plumb judges every styling choice by the CSS it compiles to, against the project's own tokens, component contracts and habits. Run it; don't guess the tokens.

## Before you write styles

1. Read `PLUMB.md` at the project root if it exists: the project's tokens with their reasons, what callers may set on each component, and the habits in force.
2. To check a snippet before writing it:

   ```bash
   echo '<div className="gap-10 text-gray-500" />' | npx plumb try --agent
   ```

   `--lang css` for CSS. It writes nothing. Exit 0 means the snippet uses the system.

3. To pick a token: `npx plumb decisions --family spacing` (also `color`, `radius`, `type`, `motion`, `elevation`, `z`).

## After you edit

```bash
npx plumb check --changed --agent
```

It lists only new problems in the files you changed, one instruction per site:

- **Edit:** one token fits. Make exactly that edit.
- **Choose a token using its reason:** several fit. Pick by the reasons shown and what the element is for, then make that edit.
- **NEEDS-DECISION:** no token fits. Stop and tell the user the sites and the value you wanted. This is a valid result.
- **Fix:** a habit, ownership, imitation or existence finding. Follow it (for a component override, use one of the variants it names).

Run it again until it prints `0 new`.

## Never

- Edit `plumb.config.ts`, `.plumb/ledger.jsonl` or the theme to make a finding pass. Adding a token or an exception is a design decision for the user.
- Run `plumb accept`, `plumb accept-decisions` or `plumb baseline` unless the user asks you to. If something should be an exception, say so and give the `plumb accept … --why` line from the output for the user to run.
- Invent a value or the nearest arbitrary class (`p-[13px]`, `p-3.25`) to get around a finding.

## When asked about a finding

- `npx plumb why <file>:<line>`: which rule, token and ledger entry apply at a line.
- `npx plumb explain <file>`: every class, rule and inline style in a file with the CSS it compiles to.
- `npx plumb show <rule>`: every site of one kind of finding.

## Notes

- A first run with no ledger always exits 0; it reports and suggests `plumb init`. Setting the project up is the user's call.
- A warm `plumb serve` makes these commands answer faster; they use it automatically when it runs.
````

### Optional agent docs: exact separate command output

Implementation: `src/surfaces/docs.ts:37-41`. Evidence: `docs/briefs/guides-facts.result.md:615`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js agent-docs
exit: 0
stdout:
Wrote PLUMB.md. Add this block to AGENTS.md or CLAUDE.md:

Read PLUMB.md for design decisions and reasons.
Run `plumb check --changed --agent` after edits; stop on "0 new".
Never edit config, ledger, or theme to pass. If no decision fits, report NEEDS-DECISION.
stderr:
(empty)
```

Generated PLUMB.md outlines tokens with value/resolution, origin/tier, references and reasons, family identity/caller policy, restricted aliases, component ownership/caller permissions, enabled habits/reasons, and the agent loop. It should be regenerated when sources change. (`src/surfaces/docs.ts:9-35`.)

**Expected agent loop.** Read PLUMB.md when present; inspect decisions rather than guess; try a snippet before writing styles; run `check --changed --agent` after edits until `0 new`. One fitting token yields an exact Edit; several yield a reasoned choice; no fitting token yields NEEDS-DECISION; other findings give Fix instructions. Do not change config, ledger or theme to pass, invent arbitrary escape-hatch values, or accept/baseline without explicit user instruction. (`skills/plumb/SKILL.md:10-44`, `src/surfaces/agent.ts:5-49`.)

The skill's `npx plumb` commands are copied above exactly. Local transcripts use `node <repo>/dist/cli.js` to invoke the same package bin without downloading another package. (`package.json:7-9`, `docs/briefs/guides-facts.result.md:639`.)

### Agent loop: real successful check

Implementation: `src/surfaces/agent.ts:5-49`. Evidence: `docs/briefs/guides-facts.result.md:639`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --agent
exit: 0
stdout:
0 new

## Rules for this loop

- Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.
- Reporting NEEDS-DECISION is fine. Never add a token.
stderr:
(empty)
```

### Agent loop: real reasoned token-choice output

Implementation: `src/surfaces/agent.ts:14-49`. Evidence: `docs/briefs/guides-facts.result.md:660`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --changed --agent
exit: 1
stdout:
1 new

## 1 of 1  gap 13px isn't on your spacing scale
Rule: provenance/spacing
Why: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
Tokens:
- 8px: use gap: var(--spacing-related); why: Related items use eight pixels.
- 16px: use gap: var(--spacing-group); why: (no reason recorded)
Sites: src/new.css:1:8
- src/new.css:1:8  `gap: 13px`
  Compiles to: gap: 13px (via stylesheet)
  Choose a token using its reason, then edit at src/new.css:1:8:
    replace `gap: 13px` with `gap: var(--spacing-related)`  (8px)
    replace `gap: 13px` with `gap: var(--spacing-group)`  (16px)

## Rules for this loop

- Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.
- Reporting NEEDS-DECISION is fine. Never add a token.
stderr:
(empty)
```

**Other supported agents.**

- Cursor: `.cursor/rules/plumb.mdc` with description, style-source globs and `alwaysApply: false`; `.cursor/hooks.json` version 1 with `afterFileEdit` running the strict changed-agent check. (`src/adoption/install.ts:14`, `src/adoption/install.ts:169`, `src/surfaces/hooks.ts:15`, `src/surfaces/hooks.ts:25-34`.)
- Codex and generic: Plumb-marked block in `AGENTS.md`; both share that file. Copilot: marked block in `.github/copilot-instructions.md`. Gemini CLI: marked block in `GEMINI.md`. Windsurf: `.windsurf/rules/plumb.md` with `trigger: always_on`. (`src/adoption/install.ts:11-19`, `src/adoption/install.ts:24-30`, `src/adoption/install.ts:167-174`.)
- Hooks for Codex, Copilot, Gemini or Windsurf are **not supported** by this installer; hook planning selects only Claude/Cursor. Nested projects can place hooks at detected repo-root scope with `--root '<relative-project>'`. (`src/adoption/install.ts:181-185`, `src/surfaces/hooks.ts:29-35`.)
- `install --list` is a read-only plan; `install --hooks` installs Claude/Cursor hooks only. An automatically generated agent MCP configuration is **not supported** by install. `plumb serve --stdio` separately exposes JSON-RPC requests when a caller supplies its own integration. (`src/adoption/install.ts:189-191`, `src/cli.ts:153`, `src/cli.ts:196-201`, `src/session/server.ts:271-290`.)

### Other agents: exact multi-target install output

Implementation: `src/adoption/install.ts:143-202`, `src/surfaces/hooks.ts:29-48`. Evidence: `docs/briefs/guides-facts.result.md:701`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js install --agent cursor --agent codex --agent copilot --agent gemini --agent windsurf --agent generic
exit: 0
stdout:
Agents: Claude Code.
Selected: Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf, generic.
/private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.claude/settings.json: unchanged.

--- /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.cursor/hooks.json
+++ /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption/.cursor/hooks.json
@@ settings before / after @@

+{
+  "version": 1,
+  "hooks": {
+    "afterFileEdit": [
+      {
+        "command": "plumb check --changed --agent --strict-ledger"
+      }
+    ]
+  }
+}
Kept .claude/skills/plumb/SKILL.md.
Wrote .cursor/rules/plumb.mdc.
Wrote AGENTS.md.
Wrote .github/copilot-instructions.md.
Wrote GEMINI.md.
Wrote .windsurf/rules/plumb.md.
stderr:
(empty)
```

## 4. Adopting on a big repo

**Recommended order, derived from current behavior.**

1. Take the first look with `plumb check`, then use `plumb init` if no config exists. Init infers live token sources, proposes repeated literals only after at least three locations, discovers components, enables four default habits, writes config, baselines existing debt, and accepts current tokens as inferred. Review this proposal with the design owner; inference does not write new theme tokens. Existing config is refused unless `--force`; existing-ledger debt growth is refused even during forced init. (`src/cli.ts:181-184`, `src/adoption/init.ts:18-60`, `src/adoption/init.ts:68-129`.)
2. With an existing reviewed config, `plumb baseline` records current findings as debt. After init this step is already done; the run below demonstrates the command, not a required duplicate setup step. A later baseline refuses new/increased debt unless `--force` is explicitly used after review. (`src/adoption/init.ts:108-129`, `src/ledger/commands.ts:80-88`.)
3. Review sources, token reasons and policy, then `plumb accept-decisions --why "…"` records the current decisions. Unchanged entries preserve attribution/reasons when no new why is supplied. Install agents/CI after adoption; docs are optional via agent-docs. Token changes not accepted in the ledger become errors. (`src/ledger/commands.ts:22-32`, `src/ledger/commands.ts:89-91`, `src/adoption/init.ts:129`, `src/ledger/check.ts:43-52`.)
4. Fix source debt in small reviewed slices. Ordinary check gates new sites, while accepted debt/exception findings become info. `--agent` is new-only and can print `0 new` while known debt remains; use full check/why/explain or the overlay to inspect existing debt. In the capture, gap changes from 10px to var(--spacing-related), and debt plus unused-token findings shrink. (`src/ledger/check.ts:54-99`, `src/surfaces/agent.ts:14-15`, `skills/plumb/SKILL.md:46-50`, `src/surfaces/edits.ts:57-59`, `docs/briefs/guides-facts.result.md:881`, `docs/briefs/guides-facts.result.md:319`.)
5. Run `plumb ledger --ratchet` after fixes to reduce debt counts to min(recorded,current) and remove zero-count debt. Run `plumb ledger --prune` to remove vanished decisions and absent debt/exception keys. Both flags can be combined. Prune alone does not lower counts on a retained key; ratchet affects only debt and does not shrink accepted exception counts. Stale debt is a warning until cleaned up. (`src/ledger/commands.ts:129-140`, `src/ledger/check.ts:35-39`.)
6. Use `plumb check --changed --agent --strict-ledger` in agent hooks to stop policy growth relative to HEAD. It fails for any new/changed decision or exception, debt count growth, and added/replaced nonblank config lines. It permits debt reduction/removal; it does not require zero known debt. Base CI treats debt growth as an error even with reviewer approval; reviewed decisions/exceptions go through the Action approval gate. (`src/ledger/check.ts:17-21`, `src/ledger/check.ts:109-128`, `src/ledger/git.ts:36-53`, `src/surfaces/hooks.ts:5`, `scripts/action/run.mjs:63`.)

Strict ledger is a check flag, not a persistent auto-ratchet or separate `plumb ratchet` command. Automatically fixing every debt finding, or preventing someone from manually running acceptance commands, is **not supported**; behavior is checking/reporting plus explicitly invoked ledger mutations. (`src/cli.ts:40-52`, `src/ledger/commands.ts:67-140`, `src/ledger/check.ts:119-125`.)

**Documentation drift to avoid.** Current default habits are `hover-gate`, `focus-outline`, `transition-named`, and `no-ease-in`; generated config below confirms them. README and the adoption roadmap still name `viewport-dynamic`/`overscroll-contain` as defaults, and the older ledger-layer document describes init asking for a separate baseline. Those statements conflict with current implementation and captured init output; use the current behavior above. (`src/adoption/init.ts:18`, `src/adoption/init.ts:108-129`, `docs/briefs/guides-facts.result.md:808`, `docs/briefs/guides-facts.result.md:790`, `README.md:77`, `docs/roadmap/1-adoption.md:8`, `docs/layers/6-ledger.md:16`.)

### First look: exact advisory check

Implementation: `src/cli.ts:181-184`. Evidence: `docs/briefs/guides-facts.result.md:753`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check
exit: 0
stdout:
plumb 0.1.0  /private/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption  plain CSS
files 2 tsx, 0 jsx, 1 css, 0 other  40.4ms

10px isn't on your spacing scale  2 sites
  Off-scale spacing makes layouts drift apart and can't be changed from the theme.
  use  8px  var(--spacing-related)  Related items use eight pixels
  src/styles.css:7:8    gap: 10px
  src/styles.css:12:13  margin-left: 10px
  intended?  plumb accept --rule provenance/spacing --site <file:line> --why "…"

Your theme has no motion tokens, so 1 motion values can't be checked  1 site
  Plumb judges values against the tokens your theme declares.
  Add motion tokens to your theme, or point `decisions.motion.from` in plumb.config.ts at where they live.
  src/styles.css:13:11  transition: all 200ms ease-in

classes     6 classes read, 0 do nothing
spacing     0 of 2 use your tokens (0%)   2 don't
color       2 of 2 use your tokens (100%) 0 don't
motion      0 of 1 use your tokens (0%)   1 don't
inline      0 of 0 style attributes have literal values
unused      2 spacing tokens are never used in your source; if other apps use them, set decisions.<family>.exported
2 findings: 1 value off your tokens, 1 config gap

Next: run plumb init to write your token sources and record today's findings as debt, so CI only fails on new ones.
stderr:
(empty)
```

### Init: exact summary

Implementation: `src/adoption/init.ts:129`. Evidence: `docs/briefs/guides-facts.result.md:790`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js init
exit: 0
stdout:
Wrote plumb.config.ts with inferred token sources.
Components: 2 found from directory:src/components/ui.
Baseline: 9 debt entries (9 locations) in .plumb/ledger.jsonl.
Accepted 3 tokens as inferred.
Next steps: run plumb install --ci.
stderr:
(empty)
```

### Init: exact generated config

Implementation: `src/adoption/init.ts:84-103`. Evidence: `docs/briefs/guides-facts.result.md:808`.

```ts
// Inferred by Plumb. Review token sources and habits with the design owner.
// Components: 2 found from directory:src/components/ui.
// Button: src/components/ui/Button.tsx:1
// Unused: src/components/ui/Button.tsx:2
export default {
  "source": [
    "src/**/*.{tsx,jsx,ts,js,css}",
    "app/**/*.{tsx,jsx,ts,js,css}"
  ],
  "decisions": {
    "color": {
      "inferred": true,
      "from": [
        "css:src/styles.css#--color-*"
      ]
    },
    "spacing": {
      "inferred": true,
      "from": [
        "css:src/styles.css#--spacing-*"
      ]
    }
  },
  "components": {
    "from": "directory:src/components/ui"
  },
  "habits": [
    "hover-gate", // 1 breaks
    "focus-outline", // 1 breaks
    "transition-named", // 1 breaks
    "no-ease-in", // 1 breaks
    // "logical-inline", // 1 breaks
    // "viewport-dynamic", // 1 breaks
    // "safe-area-fallback", // 0 breaks
    // "overflow-clip", // 0 breaks
    // "overscroll-contain", // 1 breaks
  ]
};
```

### Baseline: exact summary

Implementation: `src/ledger/commands.ts:80-88`. Evidence: `docs/briefs/guides-facts.result.md:853`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js baseline
exit: 0
stdout:
Baseline recorded 9 debt entries (9 sites).
stderr:
(empty)
```

### Accept decisions: exact summary

Implementation: `src/ledger/commands.ts:89-91`. Evidence: `docs/briefs/guides-facts.result.md:867`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js accept-decisions --why 'Reviewed fixture token sources'
exit: 0
stdout:
Accepted 3 current decisions.
stderr:
(empty)
```

### After fixing existing debt: exact agent summary

Implementation: `src/ledger/check.ts:35-39`, `src/surfaces/agent.ts:14-49`. Evidence: `docs/briefs/guides-facts.result.md:881`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --agent
exit: 0
stdout:
0 new

## Rules for this loop

- Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.
- Reporting NEEDS-DECISION is fine. Never add a token.
stderr:
(empty)
```

### Ratchet: exact summary

Implementation: `src/ledger/commands.ts:129-136`. Evidence: `docs/briefs/guides-facts.result.md:902`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js ledger --ratchet
exit: 0
stdout:
Ledger has 10 entries.
stderr:
(empty)
```

### Prune: exact summary

Implementation: `src/ledger/commands.ts:135-136`. Evidence: `docs/briefs/guides-facts.result.md:916`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js ledger --prune
exit: 0
stdout:
Ledger has 10 entries.
stderr:
(empty)
```

### Strict ledger after shrinking debt: exact output

Implementation: `src/ledger/check.ts:109-125`. Evidence: `docs/briefs/guides-facts.result.md:930`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --strict-ledger --agent
exit: 0
stdout:
0 new

## Rules for this loop

- Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.
- Reporting NEEDS-DECISION is fine. Never add a token.
stderr:
(empty)
```

### Baseline after introducing new debt: exact refusal

Implementation: `src/ledger/commands.ts:80-85`. Evidence: `docs/briefs/guides-facts.result.md:951`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js baseline
exit: 2
stdout:
(empty)
stderr:
plumb: Baseline refuses debt growth (1 keys); fix new findings or use plumb baseline --force after review.
```

### Explicit reasoned exception: exact summary

Implementation: `src/ledger/commands.ts:92-102`. Evidence: `docs/briefs/guides-facts.result.md:965`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js accept --rule provenance/spacing --site src/new.css:1 --why 'Fixture exception for review gate'
exit: 0
stdout:
Accepted 1 exception entries: provenance/spacing:.new:gap:gap: 13px@src/new.css#.new.
stderr:
(empty)
```

### Strict ledger after adding that exception: exact failure

Implementation: `src/ledger/check.ts:109-125`, `src/surfaces/agent.ts:28-32`. Evidence: `docs/briefs/guides-facts.result.md:979`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --changed --agent --strict-ledger
exit: 1
stdout:
1 new

## 1 of 1  This change adds 1 ledger entries
Rule: ledger/grew
Why: New exceptions and tokens are design decisions and need review.
Sites: .plumb/ledger.jsonl:10:1
- .plumb/ledger.jsonl:10:1  `{"key":"provenance/spacing:.new:gap:gap: 13px@src/new.css#.new","kind":"exception","rule":"provenance/spacing","family":"spacing","owner":".new","prop":"gap","authored":"gap: 13px","path":"src/new.css","anchor":".new","resolved":"13px","count":1,"on":"2026-10-13","by":"Guides Facts","why":"Fixture exception for review gate"}`
  Compiles to: ledger: {"key":"provenance/spacing:.new:gap:gap: 13px@src/new.css#.new","kind":"exception","rule":"provenance/spacing","family":"spacing","owner":".new","prop":"gap","authored":"gap: 13px","path":"src/new.css","anchor":".new","resolved":"13px","count":1,"on":"2026-10-13","by":"Guides Facts","why":"Fixture exception for review gate"} (via stylesheet)
  Edit: NEEDS-DECISION: report this change for review. Do not change config, ledger, or theme to pass.

## Rules for this loop

- Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.
- Reporting NEEDS-DECISION is fine. Never add a token.
stderr:
(empty)
```

### Invalid invocation: exact exit-2 evidence

Implementation: `src/cli.ts:309-313`. Evidence: `docs/briefs/guides-facts.result.md:1008`.

```text
cwd: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-guides-facts-fFatYf/adoption
$ node /Users/vijaysingh/unlocalhosted/plumb/dist/cli.js check --not-a-real-option
exit: 2
stdout:
(empty)
stderr:
plumb: Unknown option '--not-a-real-option'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- "--not-a-real-option"; run plumb --help for supported flags.
```


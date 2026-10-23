# Readiness layer 1 result

Implementation and scoped verification are complete. The full-suite gate is
not yet green; current limits and failed attempts are recorded below.

Scope: section 4, row 1 of `readiness.md`. No dock, blueprint-label changes,
system-panel UI, init/install offers, or Next.js end-to-end feature proof.
No changes to `overlay/src`, `site/src`, or the owner's `Hero.jsx` work.

## Engine and CLI

`src/readiness/index.ts` produces one shared model for doctor and both HTTP
transports. `src/readiness/config.ts` reads host config ASTs without executing
them and plans edits using the conservative config editor already used by overlay
installation. Checks cover every capability and every requirement established by
project files or trusted host observations. Ambiguous facts remain `unknown`.

`plumber doctor` prints a summary, all eight capabilities, then each requirement
with evidence, consequence and a command. Existing independent diagnostics remain
under `Diagnostics`; their ledger repair advice is retained. Exit 1 means at least
one requirement is missing or a legacy diagnostic failed. Unknown alone does not
fail doctor. `docs/MESSAGES.md` records the wording contract.

| Requirement id | Capability | Evidence and limits |
| --- | --- | --- |
| `read.styles` | Read | Readable CSS entry and resolvable Tailwind 4, or plain CSS without Tailwind |
| `read.tokens.spacing` | Read | Analyzer token inventory and judged spacing values |
| `read.tokens.color` | Read | Analyzer token inventory and judged colour values |
| `read.tokens.radius` | Read | Analyzer token inventory and judged radius values |
| `read.tokens.type` | Read | Analyzer token inventory and judged type values |
| `read.tokens.motion` | Read | Analyzer token inventory and judged motion values |
| `read.tokens.elevation` | Read | Analyzer token inventory and judged shadow values |
| `read.tokens.z` | Read | Analyzer token inventory and judged z-index values |
| `remember.baseline` | Remember | Parsed ledger baseline; missing baseline offers `plumber baseline` |
| `fast.config` | Fast | The actual whole-report cache admission check |
| `locate.host` | Locate | Trusted running Vite/Next host, canonical host config, or package script; explicitly unsupported scripts are missing |
| `locate.plugin` | Locate | `plumb()`/`withPlumb()` or trusted mounted host integration |
| `locate.order` | Locate | Authored plugin order; composed/ambiguous plugin arrays stay unknown |
| `locate.react-dev` | Locate | React resolves and the trusted running host is in development; static doctor cannot establish the development build |
| `preview.locate` | Preview | All Locate requirements |
| `write.locate` | Write in place | All Locate requirements |
| `write.refresh` | Write in place | Official React plugin in Vite config, resolved Vite refresh plugin, or Next development host's built-in refresh |
| `write.hmr` | Write in place | Explicit/default Vite HMR setting; resolved running setting takes precedence |
| `write.watcher` | Write in place | Disabled watching is missing; WSL/Docker/network hints require polling; ordinary native saves need real verification |
| `blueprint.locate` | Blueprint | All Locate requirements |
| `blueprint.host` | Blueprint | Same supported-host check |
| `system.blueprint` | System panel | All Blueprint requirements |
| `system.preset` | System panel | A loaded preset, including a detected preset |

Token families with no judged values and no configured gap pass without inventing
a token requirement. Existing framework tokens count exactly as the analyzer
counts them. Evidence uses analyzer token source lines, AST setting lines, or
line 1 of a missing file/manifest. Config exports and preset selections use their
actual authored lines.

Polling detection reads `WSL_DISTRO_NAME`, `WSL_INTEROP`, or `/.dockerenv`.
`PLUMBER_WATCH_ENV=wsl|docker|network|native` is an explicit host hint and enables
portable integration fixtures; network mounts are not guessed. `PLUMBER_POLLING`
controls Plumber's own watcher and does not certify the app's watcher.

A development server plus installed React establishes the server-side development
requirement; the endpoint does not inspect browser fibers. It does not certify
that every rendered element is locatable. Next webpack/Turbopack are recognized,
but the packed Next interaction proof remains layer 4. Native watcher delivery,
opaque config expressions and unobserved runtime state remain unknown.

## Exact GET JSON contract

`GET /__plumb/readiness` returns HTTP 200 with the following exact shape. Every
listed field is present; there is no `root`, timestamp, finding report or token in
the response. `requirements` contains all 23 ids above, in that order. `capabilities`
contains all eight ids in the order below. The model is independent of legacy
command `--json`/`--agent` output.

```ts
type Capability =
  | 'read' | 'remember' | 'fast' | 'locate'
  | 'preview' | 'write' | 'blueprint' | 'system';

type Fix =
  | {
      kind: 'diff';
      file: string;        // Project-relative host config path.
      hash: string;        // SHA-256 of the exact current UTF-8 file bytes.
      diff: string;        // Unified diff; usable with git apply -p0.
      dirty: boolean;      // Uncommitted/untracked, or no clean Git proof.
    }
  | {
      kind: 'step';
      instruction: string;
      command: string;     // Copyable; never executed by readiness.
    };

type ReadinessResponse = {
  schemaVersion: 1;
  capabilities: Array<{
    id: Capability;
    label: string;
    status: 'full' | 'degraded' | 'off';
    requirements: string[]; // Requirement ids which gate this capability.
  }>;
  requirements: Array<{
    id: string;            // One of the 23 ids listed above.
    capability: Capability;
    status: 'ok' | 'missing' | 'unknown';
    title: string;
    evidence: Array<{
      file: string;        // Project-relative; may traverse to dependency evidence.
      line: number;        // Positive, one-based.
      text: string;
    }>;
    loses: string;         // What the user loses without this requirement.
    fix: Fix | null;      // null exactly when status is ok.
  }>;
};
```

Capability labels are exactly `Read`, `Remember`, `Fast`, `Locate`, `Preview`,
`Write in place`, `Blueprint`, `System panel`. `full` means every requirement is
`ok`; unknown or a missing nonessential requirement means `degraded`. Missing
Read/Locate requirements, a missing Locate/Blueprint dependency, or a missing
system preset make that capability `off`. Dependency checks propagate missing
before unknown. Requirement statuses and fixes are the actionable truth; do not
infer a writable fix from capability status.

GET never edits config, creates a baseline, installs dependencies or runs a fix.
Analysis may maintain Plumber's normal cache. Vite and Next supply trusted
runtime facts server-side; query parameters cannot supply those facts. During
session startup the normal 503/`Retry-After: 1` response remains possible. A host
with failed analysis startup can still return readiness from its known project
root, so unsupported Tailwind or bad analysis setup can be diagnosed.

## Consent and exact POST contract

`plumber fix <id>` prints the diff, then asks. `--yes` still prints the diff and
any dirty-file notice, and supplies consent. A negative/empty/EOF answer leaves
files unchanged. Step fixes print their instruction and command. Baseline stays
a manual command because readiness writes only host config files.

`POST /__plumb/readiness/fix` accepts one requirement id, never a path, diff or
arbitrary replacement. The UI must show `fix.diff` before submitting:

```json
{
  "id": "write.hmr",
  "hash": "<fix.hash from the GET response>",
  "confirm": true,
  "allowDirty": false
}
```

`id` and `hash` must be nonempty strings; `confirm` must be exactly `true`.
`allowDirty` is optional, defaults to false, and must be boolean if supplied.
When `fix.dirty` is true, explicit dirty-file confirmation must precede sending
`allowDirty: true`. HTTP does not treat `confirm: true` as dirty-file consent.
CLI `--yes`, or answering yes to the explicit dirty-file prompt, confirms both.

Successful HTTP 200 response, with exactly these fields:

```json
{
  "id": "write.hmr",
  "file": "vite.config.mjs",
  "diff": "<the applied unified diff from GET>",
  "hash": "<SHA-256 of the resulting UTF-8 file bytes>"
}
```

The engine regenerates the patch from current source, checks its hash, checks
Git dirtiness and real paths, rechecks source bytes before atomic publication,
and applies one diff. Requests in the same process serialize admission per
project; a concurrent fix is refused. Stale patches are refused. Read readiness
again after a write; running host settings may remain stale until that host
restarts.

Writable edits are: add/move `plumb()` first; add the installed official React
Fast Refresh plugin after it; remove `server.hmr: false`; add polling with
`awaitWriteFinish`. Missing packages produce installation steps, never package
manager execution. Unsafe/composed configs produce manual steps. Only canonical
project-root `vite.config.*`/`next.config.*` files can be targets; symlinks,
external configs, layouts, source files and package manifests cannot be written.
No Next config diff is currently planned by readiness; Next wiring is a step.

Both routes are exact allow-list entries in the shared Node/Fetch route core.
They inherit existing apply authentication: token-configured handlers require
`x-plumb-token`; Vite's tokenless handler requires trusted loopback host/origin
proof, including Origin on POST. Next remains token-authenticated. GET is GET
only; fix is POST only. Both inherit CORS and the 1 MiB POST body limit.

Refusals use the existing JSON shape `{"error":"<explanation>"}`: 400 for missing
consent, dirty/stale/non-applicable patches or invalid input; 401 for a missing
or invalid configured token; 403 for untrusted origin/host; 404 for unknown route;
405 with `Allow` for a wrong method. Normal transport startup/busy states can
return 503. Failed non-readiness routes keep their existing diagnostics.

## Whole-report cache

`src/data-config.ts` parses plain default-exported data without executing it:
nested objects/arrays, strings, booleans, numeric literals and null, with
comments, string-only templates and TypeScript data wrappers. Imports, calls, identifiers, functions,
methods, getters, spreads and computed keys do not pass admission. This admits
`plumber init` output, including inferred decisions, component contracts, source
selectors and habits. Config discovery also works without explicit `--config`.

Existing independent safety gates remain: git-scoped/special analysis options,
executable presets and CSS `@plugin`/`@config` modules bypass whole-report reuse.
A data config referencing an executable module does not make that module's
runtime inputs cacheable. Pure inline data presets are accepted. Receipts still
validate source bytes, membership, helper resolution, theme graph, ledger and
compiler metadata. Configured source/token inputs outside the root also validate
membership and bytes; non-source data inputs are hashed when selected, not every
asset in the project. Plain CSS can cache without a Tailwind entry.

## Verification

Only integration/e2e tests were added. `e2e/readiness.test.mjs` exercises complete
CLI/API flows and live Vite servers; it covers met/unmet checks, manual and diff
fixes, prompt decline/yes/--yes, clean/dirty configs, token/origin/method/path
checks, stale hashes, symlink refusal, unsupported Tailwind, absent React,
unsupported hosts, presets, WSL polling, failed session startup, safe React
import naming, default Plumber imports, ignored untracked configs and applicable
diffs without trailing newlines.
`e2e/check-cache.test.mjs` runs actual init/check flows and proves an init-written
config hits the whole-report cache, retains report evidence and invalidates
selected token files, edited source selectors and dependency token data with a
non-source extension. Existing doctor e2e assertions now address its retained
Diagnostics block below the new readiness summary.

Validation before the final full run:

- 20 cache/readiness integration tests passed.
- 27 existing host, locator and served-root tests passed, including real Next
  webpack/Turbopack, browser fibers and production/static-export exclusion.
- Six pre-change/current command comparisons against `7fbffa4` passed:
  `check --json`, `check --agent`, `decisions --json`, `habits --json`,
  `presets --json`, and `explain src/App.tsx --json`. Agent stdout was compared
  byte-for-byte. JSON was compared after normalizing only timing/cache telemetry,
  which varies between ordinary runs; report evidence and field order matched.
  Existing serializers were not changed.

A preliminary full run completed with 462 passing, one failing and one existing
skip: the 300-read Session burst exceeded its 50 ms event-loop limit (180.9 ms).
An isolated rerun passed at 12.7 ms, so that full-run timing failure was not
reproduced in isolation. Review also found the new static readiness import loaded
analysis modules into the legacy Session host. Readiness is now lazy-loaded only
on its routes: measured server-import RSS overhead fell from 43.4 to 21.3 MiB.
All 15 readiness/burst checks then passed, with 9.3 ms maximum loop delay and
5.9 ms maximum health latency in the direct burst. Thresholds were not changed;
the timing failure's exact cause is not claimed as proven.

A subsequent full run passed the burst budget (8.9 ms loop maximum, 5.5 ms health
maximum) but reported one existing React 18 locator navigation-count assertion:
two navigations instead of one. That case then passed five isolated diagnostic
runs and all three React 19/React 18 warmup sequences; recorded navigation/reload
messages showed no repeat of the failure. No locator behavior, navigation
assertion or timing limit was changed to hide it. Temporary diagnostics were
removed. Its intermittent cause remains unconfirmed.

Matching npm's watcher flags and test-runner concurrency reproduced a burst
failure in the short diagnostic loop. GC instrumentation recorded a 71.9 ms
minor-collection pause alongside a 75.6 ms loop maximum; the fixture retains
about 100 MiB of results across 300 overlapping reads. The npm test runner now
pins V8's young-generation semispace to 8 MiB (`--max-semi-space-size=8`) only for
`session-burst.test.mjs` in a dedicated process. This bounds allocator variance without changing the
300-read workload, health assertions or 50 ms loop limit. All 20 existing
burst/HTTP checks passed across five capped runs (worst direct-loop maximum
19.3 ms). Browser/build test processes, production and CLI Node settings are unchanged.
`scripts/test.mjs` discovers every e2e test, runs the normal native group, the
bounded burst file, then the existing polling and watch-disabled serve groups.
It exits on failure and does not retry or omit tests. A global nursery cap was
tried and removed after unrelated served-root timeouts. Diagnostic clones and
logs were removed from the repository.

Full Chromium suite gate: not yet green. The latest run uses the final scoped
runner and has reported an intermittent dynamic-DOM blueprint assertion before
reaching the burst group. No overlay/site source changes or assertion weakening
were made to hide browser failures. The current log is
`/tmp/plumber-readiness-full-test-final-proof.log`. Earlier full-run logs are
`/tmp/plumber-readiness-full-test-final.log`,
`/tmp/plumber-readiness-full-test-verified.log`,
`/tmp/plumber-readiness-full-test-accepted.log`, and
`/tmp/plumber-readiness-full-test-bounded.log`. Polling and no-watch groups run
only after the native group succeeds, as before. No push was performed.

Preliminary broad runs were stopped for compatibility/config-edge review before
the final full run. Legacy unknown-route startup responses were preserved; new
readiness paths retain exact allow-list behavior.
Disposable Next fixtures disable `experimental.agentUpgrade` because Next 16.4
otherwise exits to show an interactive agent-upgrade prompt under this runner.
This fixture-only change leaves production configuration and dependencies alone.

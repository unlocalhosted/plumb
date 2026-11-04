# Result: one path, plain terminal (onboarding layer 2)

Brief: docs/briefs/one-path.md. Spec: docs/design/onboarding.md. Six commits on branch `worktree-agent-a1551d5c2d7213b14`, nothing pushed, nothing in overlay/.

## What changed

| Step | Commit message (first line) | What a user now sees |
| --- | --- | --- |
| 1 | the session serves your project page: GET / is the page, GET /__plumb/system its numbers | the page shell and its numbers on the session's port |
| 2 | npx plumber opens a page about your project | short terminal, browser opens, Ctrl+C, `No changes made.` |
| 3 | with no browser to open, plumber says the 3 biggest causes and one next step | the plain version in CI, a pipe, `--no-open` |
| 4 | npx plumber stops with one line for what's wrong and one for the fix | three gates, exit 2, nothing written |
| 5 | npx plumber --yes sets up here with no page and no question | dev config + today's state, theme untouched, idempotent |
| 6 | plumber doctor is three lines; the old detail is doctor --verbose | three rows, exit 1 only for a cross on the first two |

New source: `src/project-page/system.ts` (the port), `src/project-page/shell.ts`, `src/onboarding/path.ts` (page, plain version, `--yes`), `src/onboarding/gates.ts`, `doctor` in `src/adoption/doctor.ts`. Touched: `src/cli.ts`, `src/cli-flags.ts`, `src/session/{server,index,methods}.ts`, `src/hosts/client.ts`, `src/readiness/index.ts` (one option, `noReport`).

## Decisions where the brief left a choice

1. **`GET /__plumb/system` shares a name with the engine's `POST /__plumb/system`** (the overlay's proposal). The page's fetch is fixed, so the route answers GET with the page data (internally the row `system-page`) and keeps POST for the proposal. e2e/engine-review-server.test.mjs (D6, "every endpoint answers only its own verb") now says `system` is the one name with both verbs.
2. **Bare plumber with any flag other than `--root`, `--config`, `--no-open`, `--yes` stays a report.** The brief lists `--json`, `--agent`, `--sarif`, `--format` as cases for the plain version; I kept them on today's `check` output, because scripts call `plumber --json` and the spec's "What stays" keeps those formats. So `--all`, `--family`, `--verbose` and the rest also still print the report. No terminal and no flags, CI, and `--no-open` get the plain version.
3. **What counts as "set up" in the plain version:** a config *and* a ledger. A config alone leaves every problem new. "New problems since you set up" is the ledger's own `new` count (what would fail a pull request), not every off-theme value, which only warns.
4. **`--root <folder with package.json>` is the person's choice** (the existing R4 rule), so the "Found 3 apps" gate fires when the command runs from the workspace folder itself, not for `--root <workspace>`.
5. **Gate for uncommitted dev config** fires only when the run would set up (the page, `--yes`), only when the dev config is the one Plumber would edit (the readiness row `locate.plugin` offers a diff and says dirty), and only inside a Git repo (readiness calls a file outside Git dirty too, which isn't "uncommitted"). The plain version only reads, so it isn't stopped.
6. **"No React here"** fires when React is neither installed nor declared. A declared but uninstalled React is left to the existing setup rows. A declared workspace with no React app keeps its evidence-bearing notice (never "0 apps").
7. **`doctor`'s second line can be a dash** (can't tell from a composed dev config) and then doesn't fail; the brief's "exit 1 only when the first two aren't ✓" and the spec's "✓, ✗ or –" disagree on that case. A project with no dev server found at all is a cross. `--verbose` keeps its old exit status.
8. **Exit code of a gate is 2** (the CLI's usage-error code), not 1.
9. **The second-run "You fixed 2 causes this week" variant (spec §5) is not built**: the session's write history isn't persisted between runs, so there is nothing to read it from.
10. **`No changes made.`** is printed when the session wrote nothing. Setup through the page isn't built yet (layer 5), so today it is always printed.

## Auth

The server binds 127.0.0.1 and was already token-protected: every `/__plumb/*` API call needs the `x-plumb-token` header, the modules (`/__plumb/src/*.js`, `tokens.css`) are public as they always were. I kept that model and added one thing for the shell:

- `GET /` is the only unauthenticated route that carries the token. The server answers it only to the person's own tab: loopback peer, a `Host` of `localhost`/`127.0.0.1`/`[::1]` with a port (stops a rebound DNS name), no `Origin`, and `Sec-Fetch-Site` of `none` or `same-origin`. Anything else gets 403.
- The token is written into the shell's HTML body, never into a URL. The shell's inline module sends it as the header, so `mountProjectPage` needs no change. Another site can't read the response (no CORS headers, and the `Sec-Fetch-Site` check), and can't call `/__plumb/system` without the token.
- `page` mode writes no `.plumber/serve.json` (so nothing is left in the project, and it doesn't collide with `plumber serve`).

Tests: e2e/project-page-data.test.mjs ("the numbers are the person's own": no token 401, wrong token 401, cross-site 403, foreign `Origin` 403, rebound `Host` 403).

## The opener stub (tests)

`PLUMBER_OPENER=<command>` runs that command with the address instead of `open`/`xdg-open`/`start` (tests point it at a script that records the address; nothing opens). `PLUMBER_TERMINAL=1` says "act as if stdout is a terminal" so a test can run the page without a pty. One test (bare-page, "on a real terminal") uses a real pty (e2e/helpers/cli-pty.py, which gained `interruptOnStdout`) and no `PLUMBER_TERMINAL`.

## CI and docs that call bare `plumber` (brief step 2)

I searched action.yml, scripts/action/run.mjs, .github/workflows, skills/, README.md and docs/:

- `action.yml` runs `scripts/action/run.mjs`, which runs `dist/cli.js check --root … --base …`. Unaffected.
- `.github/workflows/ci.yml` doesn't call plumber.
- `skills/plumber/SKILL.md` uses `try`, `decisions`, `install` only. Unaffected.
- README.md line 51 said `npx plumber  # report drift`. Changed to say it opens the page and `npx plumber check` prints the report.
- docs/DESIGN.md and docs/ROADMAP.md show `npx plumber` in historical design text; left as they are.
- Existing tests that read the report through bare plumber (adoption, classes, cli, cli-findings, cli-progress, cli-setup, ledger, onboarding-state, project-layouts via helpers/layouts.mjs, readiness, report, setup) now say `check`. Tests that read old `doctor` output now say `doctor --verbose`.

## Proof

Build: `npm run build` exited 0 before every test run (checked with `echo EXIT $?`). All runs used `PLUMBER_WATCH=1 PLUMBER_POLLING=0 node --test --test-concurrency=1 <files>`.

### Step 1: data and endpoint

Contract 1, on a scratch copy of crafting-ui (`rsync` of the app, node_modules linked, nothing written into the real one). The report is `plumber check --json`; the python script is docs/design/prototypes/data/extract-system.py; the TS side is `systemOf(report)` from `dist/project-page/system.js`:

```
$ node dist/cli.js check --json > report.json          # in the crafting-ui copy
$ python3 -I docs/design/prototypes/data/extract-system.py report.json py-system.json
{"project": "", "files": "", "size": 48, "radius": 22, "weight": "", "colour": 229, "dead": ""}
$ node ts-system.mjs                                    # JSON.stringify(systemOf(report)) -> ts-system.json
$ python3 -I compare.py                                 # json.load both, drop `causes` from the TS side, compare
equal apart from causes: True
causes: 3 [('value:type:font-weight:500', 180), ('value:type:font-weight:600', 101), ('value:type:font-size:15px', 94)]
{'project': 'crafting-ui', 'files': 439, 'size': 48, 'radius': 22, 'weight': 1, 'colour': 229, 'dead': 22}
```

(`project` is the package name; the python script hardcodes `crafting-ui`.) Endpoint and modules: e2e/project-page-data.test.mjs 4/4, with causes-session, causes and causes-model 16/16 together. The served page was also loaded against the real overlay/src/project-page.js (merged from main at ff4c7c2) in the browser pane on crafting-ui: it mounted with the numbers (687 places type a text size by hand, 60 use the scale) and no console errors.

### Step 2: bare plumber opens the page

e2e/bare-page.test.mjs 4/4 (terminal output and the served page and numbers, 7331 or the next free port, a real pty with no CI, `check` and machine formats unchanged). Crafting-ui copy, `PLUMBER_TERMINAL=1`, stopped with Ctrl+C:

```
Plumber · reading your app…
  ✓ Vite 8, React 19, Tailwind 4 (theme in src/index.css)
  ✓ 439 files in 7.2s

Opened your project in the browser: http://localhost:7331
Press Ctrl+C here when you're done.

No changes made.
```

### Step 3: the plain version

e2e/bare-plain.test.mjs 3/3. Crafting-ui copy, not set up, piped:

```
Plumber · 441 files in 3.3s
  You set text weight 500 3 ways, in 186 places.
  You set text size 15px 3 ways, in 93 places. The closest in your type scale is md (16px).
  You wrote white 4 ways, in 92 places. Your theme calls it on-accent. 24 render nothing.

Next: run npx plumber in a terminal to see this in your browser, or npx plumber --yes to set it up here.
```

Set up (after `--yes`):

```
Plumber · 441 files in 1.1s
  Nothing new since you set up. 464 causes are still open, the biggest:
  You set text weight 500 3 ways, in 186 places.
  You set text size 15px 3 ways, in 93 places. The closest in your type scale is md (16px).
  You wrote white 4 ways, in 92 places. Your theme calls it on-accent. 24 render nothing.

Next: press Alt+B on your page to fix it there.
```


### Step 4: gates (exit 2, nothing written)

e2e/bare-gates.test.mjs 4/4. Crafting-ui copy and synthetic folders:

```
$ node dist/cli.js            # cwd with a package.json and no React
✗ No React here. Plumber reads React apps.
  → Run it from your app's folder, or pass --root apps/web.
exit 2

$ node dist/cli.js            # cwd = a workspace with apps/web, apps/admin, apps/docs
✗ Found 3 apps: apps/admin, apps/docs, apps/web.
  → Run npx plumber --root apps/admin (or the one you mean).
exit 2

$ PLUMBER_TERMINAL=1 node dist/cli.js     # crafting-ui copy, plumb() removed from vite.config.ts, then edited, not committed
✗ vite.config.ts has changes you haven't committed.
  → Commit or stash them, then run npx plumber again.
exit 2
```

The same dirty-config gate stops `--yes`. Crafting-ui already has `plumb()` in its dev config, so the unedited copy goes straight to the page (the gate is about not mixing our lines with theirs).

### Step 5: `--yes`

e2e/bare-yes.test.mjs 4/4 (writes only vite.config.ts, plumber.config.ts and .plumber/ledger.jsonl; theme byte-identical; second run changes nothing; the same gates; a dev config Plumber can't edit says so and writes nothing). Crafting-ui copy (plugin already in its dev config):

```
$ node dist/cli.js --yes
Plumber · set up
  ✓ Saved today's state (3,332 places), so only new problems fail from now on
  Your theme is untouched.

Next: start your app (pnpm dev) and press Alt+B on your page.
exit 0
$ node dist/cli.js --yes
Plumber is already set up here.

Next: press Alt+B on your page to fix it there.
exit 0
```

### Step 6: three-line doctor

e2e/doctor-three-lines.test.mjs 3/3. Crafting-ui copy:

```
Plumber
  ✓ Reads your code       Vite 8, React 19, Tailwind 4
  ✓ Shows on your page    Plumber is in vite.config.ts
  – Guards new code       not set up → plumber install --ci
exit 0
```

On an app without the plugin: `✗ Shows on your page    Plumber isn't in vite.config.ts → plumber install --overlay --write`, exit 1 (tested). `doctor --verbose` is today's output; `doctor --json` is still refused.

### Neighbouring suites

Run after the change: project-page-data, bare-* (4 files), doctor-three-lines, project-layouts, adoption, cli-setup, docs-cli, readiness, readiness-panel, messages, onboarding-write, styling-detection, library-adapters, surfaces, serve, engine-review-server, causes*, served-root, session-burst, state-publication, hosts, cli, cli-findings, cli-progress, classes, check-cache, ledger, report, setup. Failures that are not from this work (each fails for a reason outside the code I changed):

- `cli.test.mjs` "tailwind-min emits the schema": `numericSpacing.reset: unexpected property` (schema vs report drift).
- `report.test.mjs` ×2: `spawnSync … ENOBUFS` (the replay fixture's output exceeds the buffer on this Node).
- `cli-findings.test.mjs` "site read-only human reports…": a ledger decision that vanished from its source in the fixture.
- `onboarding-state.test.mjs` ×9 (state-of-fixture) and `hosts.test.mjs` "install --overlay detects hosts": the expectation has the main checkout's depth/folder name (`../../node_modules`, `plumb`) and this is a worktree.
- `project-layouts.test.mjs` "two-host-configs": it expects the row text "vite config found; runtime not observed", which the row doesn't say any more.
- `packaging.test.mjs` "packed release…": needs `npm pack` and a network install.
- blueprint-corners fails on main, as the brief says.

## Not done / doesn't match the brief

- The spec's second-run variant after a fix ("You fixed 2 causes this week…", then the `install --ci` offer) and "value before CI" gating (layer 6) are not built.
- `--json`, `--agent`, `--sarif`, `--format` on bare plumber keep the report rather than the plain version (decision 2).
- The page's own "set it up" button has no endpoint yet; `--yes` is the CLI side of it.
- Step 1's D6 test change and the README line are in the commits for steps 6 and 2 respectively, not step 1 (found later).
- No dev server was left running; the scratch crafting-ui copies are in the session's scratchpad only.

## Review (Claude, 2026-11-04)

Checked on a fresh crafting-ui copy and fixed on the branch before the merge:

- **Cause order.** Causes were sorted by count, so the terminal led with font weight 500 (162 of 186 places are
  Tailwind's own `font-medium`; no step to become, no fix). `causesOf` now ranks what renders nothing first, then
  what your theme has a step for, then the rest, biggest first within each (0c19edb). crafting-ui now leads with
  "You wrote white 4 ways, in 92 places. Your theme calls it on-accent. 24 render nothing."
- **Set-up loop.** `--yes` said "already set up" (a config existed) while the plain version said "run npx plumber
  --yes" (no state saved). One `setupGaps` now answers both: dev config, config, today's state; `--yes` saves
  today's state against an existing config (5a374c5).
- **Copy.** "font weight", not "text weight"; colour suggestions don't print an oklch() value.
- **Tests.** The plain set-up test sets up with `--yes` in a committed Vite app; cli.test's broken-config cases
  run `check` (b9be4e1).

Suites the brief named, branch against main: the same 16 fail on both (pre-existing). Two runs took 50–60 minutes
and failed; each passes in under 2s alone, with swap at 14 of 15 GB, so they were memory stalls.

# Test system: a failing test costs minutes, not an hour

Status: layer 1 (the runner) built on branch `test-system`; later layers are listed, not built.

## The itch

The owner, 2026-11-10: "tests are just thrown as second order effect and we really haven't spent much time thinking
about how to put them properly for maximum iteration speed", and "playwright test keep hoggin all the memory and
keep being a bottleneck".

## What was measured (release-0.4.0, b744b75)

| Fact | Number | Source |
|---|---|---|
| Test files | 195, in one flat folder | `ls e2e/*.test.mjs` |
| How they run | one after another, `--test-concurrency=1`, four passes | `scripts/test.mjs` |
| Files with no browser and no install | 102 | import scan |
| Files that launch Chromium | 88 files, 91 launch sites | `grep chromium.launch` |
| A browser is launched | per test, not per file | `browser(t)` + `t.after(close)` in each test |
| A Vite server is started | per test, with a cold cache folder of its own | `cacheDir: join(root, '.vite-cache')` |
| Shared harness | none: `fixture` is defined in 39 files, `browser` in 37, `run` in 34, `project` in 34, `open` in 30 | `grep "^function"` |
| Laptop run | 757 pass, 50 fail; 41 of the 50 are timeouts; 2.1 GB swap in use | `/tmp/release-22.log` |
| Laptop time | 768 minutes of test time summed; 37 tests over a minute hold 720 of them; 650 tests under 5 s hold 15 | same log |
| CLI cold start | 0.17 s | `time node dist/cli.js --version` on vm-agent |
| Chromium launch | 0.10–0.21 s; a fresh page in a running browser 0.045 s | timed on the laptop, 3 and 5 times |
| One test's setup (copy fixture, start Vite, page ready) | 0.65 s; the same with a shared warm cache (0.62 s) | timed on the laptop, 3 times each |
| Memory the test process keeps per dev server it starts | about 80 MB, never given back: 432 → 810 MB over six servers | `process.memoryUsage().rss` after each |
| A browser file's Node process on vm-agent | 0.65–1.3 GB | `ps`, per process tree |
| One file's cost | CLI 1.7 cores, 0.25 GB; browser 1.2 cores, 1.3 GB; host 1.5 cores, 1.2 GB | process trees and load on vm-agent |

## The system behind it

Every test file was written alone, by whoever needed it, with its own copy of the setup. Nothing owns the cost of a
test. So:

1. **No budget.** Nothing knows a file is cheap (a CLI call) or dear (Chromium, a dev server, an `npm install`), so
   all 195 wait in one line, and the only safe speed is one at a time.
2. **No shared setup, and a dev server per test that is never let go.** Launching Chromium per test costs little
   (0.1–0.2 s). The memory goes to the test's own Node process: every dev server a test starts leaves about 80 MB
   behind, so a file with a dozen tests holds over a gigabyte. What looked like "Playwright eating memory" is this.
   (First guess, wrong: a cold dependency cache per test. Measured, a shared warm cache changes nothing.)
3. **No clean-up owner.** A test that times out leaves its browser and server running; the next test starts on a
   machine with less memory, times out too, and the failure count grows while the suite runs.
4. **No small run.** The only command is "everything", so a one-line fix waits an hour to be proven.
5. **The wrong machine.** A 16 GB laptop running other sessions cannot tell a bug from starvation.

## The system that replaces it

Five layers. Each is finished and proven before the next starts.

1. **Runner (this branch).** `scripts/test.mjs` gives every file a cost tier read from its own source (`cli`,
   `browser`, `host`, `alone`), runs files side by side inside a slot budget sized from the machine, runs each file in
   its own process group and kills the whole group when the file ends or times out, and prints which files failed,
   which were slowest, and the wall time. It takes a tier or file names, so a small run exists.
   Proof: the same pass/fail set as the one-at-a-time run on vm-agent, in less wall time.
2. **Shared harness.** One `e2e/harness/` module: one dev server per file where tests can share it, and one that is
   really freed where they cannot (find what keeps the 80 MB: the plugin's session, Tailwind, or Vite); one
   Chromium per file with a fresh context per test; one fixture copier. Files move to it tier by tier.
   Proof: the test process's memory after N tests, before and after, and the number of browser files vm-agent can
   run at once.
3. **Run what changed.** A map from source areas to test files, so `node scripts/test.mjs --changed` runs the files a
   diff can break.
4. **Budgets that fail.** Each file's time is recorded; a file that grows past its budget fails the run.
5. **One command for the full run on vm-agent**, with the baseline for `main` kept per commit, so the answer is
   "which failures does this branch add".

## Tiers

| Tier | Meaning | Slots | How it is found |
|---|---|---|---|
| `cli` | Node only: the CLI, the engine, files on disk | 1 | default |
| `browser` | launches Chromium | 2 | imports `playwright` |
| `host` | Next, webpack, Turbopack, `npm install` | 3 | names `next` binaries, Turbopack or `npm` |
| `alone` | rebuilds `dist`, packs the package, holds a fixed port, or gates on latency | whole machine | named in the runner, or a `// @tier alone` line |

A `// @tier <name>` comment in a file overrides what the scan finds.

## Not another browser

Asked by the owner: is there something better than Playwright with Chromium? Not for these tests, and it is not
where the cost is (see the table: 0.1–0.2 s a launch, 0.045 s a page).

- jsdom and happy-dom have no layout and no real CSS. 59 test files read computed styles and 62 read boxes; the
  product is an overlay that measures a rendered page. They would test nothing.
- Vitest's browser mode, Puppeteer and raw CDP drive the same Chromium.
- Browsers without rendering (Lightpanda and the like) have no boxes to measure.
- WebKit or Firefox through Playwright are not lighter, and are not what most users of the overlay run.
- vm-agent already uses Chromium's headless shell, the light build.

## Not Bun

Asked by the owner. Not measured under Bun; argued from the numbers above. The time is in Chromium, dev servers and
installs, which are the same under either runtime. Node's own start is 0.17 s. The package ships a Node CLI
(`engines: >=22.18`), uses `node:test`, and plugs into Vite and Next as they run under Node, so a Bun run would test
something users do not run.

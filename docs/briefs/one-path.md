# Brief: one path, plain terminal (onboarding layer 2)

Spec: docs/design/onboarding.md, sections "The system that replaces it", "The path" (1–3, 5, 6), "Words" and
layer 2 under "Layers". Read them first; this brief only adds the interface and the order.

Layer 1 (causes) is on main: `causesOf(report)` in src/causes.ts, `causes` in `check --json`, GET /__plumb/causes.

## Split

- **You (CLI and server):** everything in src/, the e2e tests, docs/briefs/one-path.result.md.
- **Claude (the page):** `overlay/src/project-page.js`, built at the same time on its own branch. Don't create or
  edit anything in overlay/. The contract between us is below; build against it.

## The contract

1. **Page data.** `systemOf(report)` in `src/project-page/system.ts`, a TypeScript port of
   docs/design/prototypes/data/extract-system.py. Same output shape as
   docs/design/prototypes/data/crafting-ui.json (`project`, `files`, `size`, `radius`, `weight`, `colour`, `dead`),
   plus `causes`: the first 3 of `causesOf(report)`, biggest first. Proof: on crafting-ui, your output equals the
   python script's output over the same `check --json`, apart from `causes` (diff it, put the command and result in
   the result doc).
2. **Endpoint.** The session server answers the page data at `GET /__plumb/system` (one row in
   src/session/methods.ts, like `causes`).
3. **Modules.** Add `src/project-page.js`, `src/gravity.js` and `src/scale-marks.js` to `overlayModules` in
   src/hosts/client.ts, so they're served like the other overlay modules.
4. **The page shell.** The server answers `GET /` with this HTML (adapt the auth to the server's model, see below):
   ```html
   <!doctype html><html lang="en"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1"><title>{project} · React Plumber</title>
   </head><body><div id="page"></div><script type="module">
     import { mountProjectPage } from '/__plumb/src/project-page.js';
     const [data, tokens] = await Promise.all([fetch('/__plumb/system').then(r => r.json()),
       fetch('/__plumb/src/tokens.css').then(r => r.text())]);
     mountProjectPage(document.getElementById('page'), data, tokens);
   </script></body></html>
   ```
   Until Claude's module lands, test against a stub `project-page.js` in a scratch copy only; never commit one.

**Auth and safety.** The server binds 127.0.0.1 and nothing leaves the machine. The data endpoint carries the
project's code facts, so another site open in the browser must not be able to read it. Use the server's existing
token model (src/session/server.ts) and decide how the shell gets its credential (for example injected into the
served HTML, never in a URL query). Say what you chose and why in the result doc.

## The CLI, in this order (one commit each, each with its own proof)

1. **Data and endpoint** (contract 1–3).
2. **Bare `npx plumber` opens the page.** With no command, on a terminal, and none of `--json`, `--agent`,
   `--sarif`, `--format`, `--no-open`, `CI`: the gates (step 4), then the short terminal from spec §1 (stack line,
   files and time), serve, open the browser (`open` / `xdg-open` / `start`), wait for Ctrl+C, then
   `No changes made.` if setup didn't happen. Port: 7331, or the next free one. `plumber check` keeps today's
   behaviour exactly; check that CI (action.yml, skills/, docs) never calls bare `plumber` expecting a report, and
   list what you found.
3. **The plain version.** Every case from step 2's exceptions: the 3 causes, one sentence each, in the spec's voice
   and Words table, then exactly one `Next:` line (spec §1, §5). Copy rules: docs/copy/voice.md.
4. **Gates** (spec §3): no React here, uncommitted dev config, several apps. One line for what's wrong, one for the
   fix, exit non-zero. Reuse the doctor rows as the source of truth; don't duplicate their checks.
5. **`--yes`**: set up with no page and no question: `install --overlay --write` plus the config with today's state
   (what `init` writes, without the theme proposals). Never writes into the theme.
6. **Three-line `doctor`** (spec §6). Today's output moves to `doctor --verbose`; `--json` unchanged. Exit 1 only
   when the first two lines aren't ✓.

## Tests

Integration and e2e only, through the real CLI (`node dist/cli.js`) on fixture copies; no unit tests, no tests of
internals. Each test reproduces something a user would see. Cover: the page served and its data answered (fetch
`/` and `/__plumb/system` from the running command), the plain version, each gate, `--yes` writes and its idempotence,
the three-line doctor, `plumber check` unchanged. Don't actually open a browser in tests (give yourself an
env var or flag to stub the opener; say which).

Run: `npm run build`, then `PLUMBER_WATCH=1 PLUMBER_POLLING=0 node --test --test-concurrency=1 <files>`. Build
must exit 0 before you trust any test result. Run only the suites you touch plus src/session and causes suites;
the laptop has 16 GB, so one heavy job at a time. blueprint-corners already fails 8/8 on main; ignore it.

## Done means

- Six commits on your branch, in the order above, each message saying what a user now sees.
- docs/briefs/one-path.result.md: what changed, the proof per step (command and raw output), the crafting-ui
  terminal transcripts for the page case, the plain case and each gate, what you chose for auth, and what's not done.
- Nothing pushed. Nothing in overlay/. No dev servers left running.

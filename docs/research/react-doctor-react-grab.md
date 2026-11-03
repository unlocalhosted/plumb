# How react-doctor and react-grab onboard (research, 2026-11-03)

Sources. WEB = fetched page. SRC = npm tarball files read (never run), unpacked in
`/private/tmp/claude-501/-Users-vijaysingh--claude-spares-spare-vzhCpS/f8e9839e-2f17-48c8-a49a-ffeae6eeae2f/scratchpad/research/`:
`rd/package` = react-doctor@0.9.22, `rgcli/package` = @react-grab/cli@0.2.0 (the `grab` package just calls it), `rg/g/package` = grab@0.2.0.
Page-fetch summaries came from a small model, so quotes from WEB are paraphrase-grade. SRC quotes are exact.
I did not run either tool and did not see either UI live. Anything about visuals not in code is UNVERIFIED.

## 1. react-doctor (react.doctor, millionco)

### Install / first run
- `npx react-doctor@latest` from the project root (WEB: github.com/millionco/react-doctor, react.doctor). No install step, no dev server. Hosts: Next.js, Vite, Astro, TanStack, React Native, Expo (README). It is a static scanner.
- Non-interactive: `-y/--yes` skips prompts; `--score` prints only the number; `--json`; `--scope changed` (only issues vs base branch) (SRC `rd/package/dist/cli.js:3570`).
- Writes nothing for the scan itself, except a "full diagnostics" dump to a temp folder (`--output-dir`), path printed in gray `Full diagnostics written to <dir>` (SRC `resolve-scan-exit-code-*.js:880`).
- Separate opt-in steps, each a single command: `install` (alias `setup`, installs skill + optional git hook), `ci install` (GitHub workflow), `scan <url>` (Chrome runtime trace), `rules ...`, `why <file:line>`, `design` (focused UI design audit) (SRC `cli.js:3579-3647`).
- `install` writes: agent skill, and for Claude Code `.claude/settings.json` + `.claude/hooks/react-doctor.mjs` (Stop / PostToolBatch hook that returns `decision: block` with the message); for Cursor `.cursor/hooks.json` + `.cursor/hooks/react-doctor.mjs`; pre-commit hook into husky / simple-git-hooks / pre-commit (SRC `install-react-doctor-*.js:120-340, 495-754`). Remembers chosen agents as a preference.
- Config is `doctor.config.ts`, created only if the user wants rules changed (README).

### What the user sees first
- Code path for a normal scan prints (SRC `resolve-scan-exit-code-*.js:915-945`):
  `✔ Scanned N files in 1.4s` / blank / bold `React Doctor — <project>` / `Score: 62 / 100 <label>` / bold `N issues` / one line per category `Performance: 2 errors, 5 warnings` / then rule groups, each `✖ <title> ×N` (red) or `⚠ ...` (yellow) with the rule key in gray beneath. Default shows only the top 3 rules; `--verbose` shows every rule and file:line (CLI help text `cli.js:3570`).
- Ends with a divider and footer links including a share URL built from the score, project name and counts: `SHARE_BASE_URL?p=<project>&s=<score>&e=&w=&f=` (SRC `print-footer`, `resolve-scan-exit-code-*.js:888-905`).
- Header on every command is one line: bold `React Doctor` + dim `vX.Y.Z` (SRC `print-branded-header-*.js`).
- There is also a hidden, experimental Ink TUI: boxed ASCII face (`◠ ◠ / ▽` at score >= 75, `• • / ─` >= 50, `x x` below), a score bar `█▓░` with an animated ease-out-cubic count-up, and a "projected score" segment showing the gain if issues are fixed (SRC `run-scan-app-*.js:1417-1600`). Not the default path, but it shows where they are heading: score as a character plus a visible reward for fixing.
- Impressive factors (inference from code): one number, 3 issues only, a score that is network-computed (`react.doctor/api/score`) and shareable.

### Vocabulary
- "issues", "errors", "warnings", categories: State and effects, Performance, Architecture, Security, Accessibility, Maintainability (README). "diagnostics" appears in flags, JSON and file names. "rule" ids are shown in gray under each issue, so the lint-rule concept is exposed but demoted. The word "doctor" is the metaphor (score = health). The CLI also uses "fixGroupId": findings with one root cause are "one fix, N sites" (SRC `resolve-scan-exit-code-*.js:2597`).

### Next-step design
- Interactive TTY with issues: after the report, one `prompts` select, "What would you like to do next?" (SRC `inspect-D4QLdCtm.js:166`). Choices are the coding agents it finds on the machine ("Open claude here with the top issues as a prompt"), "Copy prompt to clipboard — Paste into any agent or chat", "Skip". Last choice is remembered as the default next time (`readHandoffTarget`).
- Before that, once per repo, it offers "Add to GitHub Actions" (declined/accepted remembered per project: `hasHandledCiPrompt`).
- Picking an agent installs the `/react-doctor` skill for it, then launches the agent CLI in the project with the prompt (SRC `inspect-*.js:196-222`).
- The handoff prompt (SRC `resolve-scan-exit-code-*.js:2590-2615`): "Review and fix the top N React Doctor findings in <project>. Leave the rest for a follow-up." Numbered, `ERROR/WARN <category>: <title> (one fix · 4 sites | ×7)`, message, fix-recipe line, up to 3 `path:line` per rule, link to the full dump, "fix the root cause, don't suppress", "Stop after this pass."

### Agent / AI integration
- Skill `react-doctor` (SKILL.md: run `npx react-doctor@latest --verbose --scope changed` after React edits and make sure score did not regress; `/doctor` fetches a playbook from `react.doctor/prompts/react-doctor-agent.md`) (SRC `dist/skills/react-doctor/SKILL.md`). Also skills improve-react, performance, improve-threejs. Agents: Claude Code, Cursor, Codex, OpenCode (README). Hooks for Claude Code and Cursor (above). No MCP found (README; absence not proven in code). The `-y` flag is documented for agents (WEB react.doctor).

### Health / status
- "Doctor" is the whole product. No separate setup-check command. `version` prints Node and platform info; failures print "Score unavailable" with a reason (offline, lint failed, disabled) instead of erroring (SRC `resolve-scan-exit-code-*.js:809-815`). Telemetry opt-out via `--no-telemetry` (README).

### Deliberate wow moves
- Score 0-100 plus a face; shareable score URL; launch your own agent already holding a prepared prompt; remembered choices; "one fix, N sites" grouping; `scan <url>` flashes purple component-name outlines in a real Chrome during a trace (SKILL.md) (UNVERIFIED visually).

## 2. react-grab (react-grab.com, aidenybai)

### Install / first run
- `npx grab@latest init` at project root; `-y` for non-interactive (WEB react-grab.com, README of `grab`).
- Sequence from code (SRC `rgcli/package/dist/cli.js:937-1210`): spinner "Preflight checks." then "Verifying framework." then "Detecting router type. Found App Router." then "Detecting package manager. Found pnpm." Shows the proposed file diff, asks "Apply these changes?" (skipped with `-y`), installs `react-grab` as a dev dependency, edits the entry file, and prints `Success! React Grab has been installed.` / `You may now start your development server.` End. If it cannot detect: "<Framework> is not yet supported by automatic setup. Visit <docs> for manual setup", and in a monorepo lists projects with a ready-made `npx grab@latest init -c <path>` line.
- Hosts: "Next.js, Vite, TanStack Start, and Webpack" (SRC line 928). Next App router edits `app/layout.tsx` with a dev-only `<Script src="//unpkg.com/grab/dist/index.global.js">`; Pages router `pages/_document.tsx`; Vite a dev-only `import("react-grab")` in the entry (README). Everything is guarded to development.
- Needs a dev server only afterwards, to use it. Also prompts "Install the React Grab skill (this project)?" with detected-agent multiselect (SRC `cli.js:84-126`, called during init as `didInstallSkill`).
- Other commands: `configure` (wizard: shortcut, `toggle` or `hold` mode, hold duration, allow in inputs, context lines, CDN), `upgrade`, `remove`, `add` (skill), `pull`/`watch`/`stop` (agent loop).

### What the user sees first
- In the CLI: a 4-spinner preflight, a diff, one confirm, two lines of success. Short.
- In the browser (WEB README/site; no live run, visuals UNVERIFIED): no UI at rest. The user hovers any element, a highlight appears, presses Cmd+C (Ctrl+C on Windows/Linux), and the clipboard gets the element plus its component stack with source location:
  `[<a class="ml-auto inline-block text-sm" href="#">Forgot your password?</a> in LoginForm (at components/login-form.tsx:46:19)]`
- Bundle contains a Toolbar and a "prompt mode" where the user types a comment on a grabbed element (SRC `rg/g/package/dist/renderer-*.js`, skill text mentions `prompt`). Details UNVERIFIED.
- Impressive because: the first interaction is on the user's own page, uses an existing muscle-memory key (copy), and the payoff is a real file:line from their own source.

### Vocabulary
- "grab", "element", "context", "component stack", "source". No internal concepts. Marketing claim: agents are "2x faster" (README, benchmark page; not verified).

### Next-step design
- CLI ends with one sentence ("start your development server"). The product's loop is: hover, copy, paste into the agent. The README's three steps are the whole tutorial.
- Advanced loop for agents: `npx react-grab@latest pull --max-age 0` blocks until the user grabs something, prints JSON `{content, prompt}` per grab; the agent acts and calls `pull` again; a new grab supersedes the current task (SRC `rgcli/package/skills/react-grab/SKILL.md`).

### Agent / AI integration
- Skill installed at init; `pull` watcher; clipboard text for any agent. No MCP in README (UNVERIFIED in code). `react-grab/primitives` API for custom pickers (README).

### Health / status
- No doctor/status command. `init` detects an existing install ("React Grab is already installed", `--force` re-runs checks) and `configure` errors with "Run react-grab init first" (SRC lines 955-961, 631). Error output: "Something went wrong... open an issue" plus message.

### Deliberate wow moves
- Zero chrome at rest, then hover highlight; copy key reused; output is shaped for agents (path:line), not for humans; configurable activation (toggle/hold); the grab-to-agent live loop.

## 3. Lessons for Plumber

1. One command from nothing to result, no flags, no prior config. Both are `npx <pkg>@latest` at the project root. Our `init`, `doctor`, `install --overlay --write` is three decisions before value. Make bare `plumber` detect the host, show the diff, ask one confirm, then run (grab: preflight spinners, diff, "Apply these changes?"; SRC `cli.js:1104-1210`).
2. Fold doctor into the flow as silent preflight lines, not a dump. grab shows four one-line spinners ("Detecting router type. Found App Router."); react-doctor turns failures into one reason line ("Score unavailable (could not reach the score API)"). Only print detail when something is wrong, and say what to do.
3. Land the wow on the user's own page, after the CLI. grab's whole payoff is hover on your own UI; the CLI ends with "You may now start your development server." For us: end `init` by opening or telling them the dev URL, and on first overlay load show the drifted elements on their page with no words at rest (matches our blueprint direction). Do not make a backend dev read a report before seeing the page.
4. Cap the first view at 3. react-doctor defaults to the top 3 rules and puts the rest behind `--verbose` and a temp-dir dump, with `×N` counts and "one fix, N sites" grouping. Group our findings by root cause and show the biggest few first.
5. Give the user one number or one claim to react to. A 0-100 score with a face, a count-up, and a projected gain is their strongest motivator (SRC `run-scan-app-*.js:1417-1600`). We do not need a score, but need an equivalent: "14 spots on this page drift from your own scale, 9 fixes".
6. End every output with one chosen next action, remembered. react-doctor's single select ("What would you like to do next?") defaults to the last choice, and "Copy prompt" is always offered. Ours should end with exactly one command or one hotkey.
7. Agent handoff as a prepared prompt, not a link. The prompt is short, numbered, has file:line, forbids suppressing, and says "Stop after this pass." (SRC `resolve-scan-exit-code-*.js:2590-2615`). Offer "Copy for agent" on each element in the overlay and one for the page, in the same shape; grab's `path:line` format is the model for what agents need.
8. Detect, do not ask. react-doctor lists only agents it finds on the machine; grab only runs for supported frameworks and prints a manual-setup link otherwise. Do the same for Vite/Next/CRA, and print the exact paste-in snippet when unsupported.
9. Make every setup step idempotent and reversible: grab has `--force`, `remove`, `upgrade`; react-doctor's installer strips and rewrites its own managed hooks. Our `install --overlay --write` should print only changed lines (already done) and have a matching removal.
10. Keep plumbing vocab out of the first run. Both say issues / errors / warnings (doctor) and grab / element / source (grab). Rule ids exist but sit in gray under the human title. Never show internal names ("overlay", "blueprint", "wave") before the user asks.

### Do not copy
- Telemetry on by default with only an opt-out flag (both: `--no-telemetry`, `reportToCli`). Ask or default off for a tool that edits source.
- react-doctor's stacked questions at the end (CI prompt, then agent prompt). It works only because each is remembered; for a first run, one question.
- A score that needs a network call to compute (`react.doctor/api/score`); ours should work offline and fast.
- grab adding an unpkg CDN script tag as the default Next path (third-party script in the dev page). Prefer a local import.
- react-doctor installing hooks into `.claude/settings.json` and git hooks without the user having seen value yet; do it after the first win.
- The hidden/experimental TUI and 150KB bundled CLI (`cli.js` 144 KB) are not a model for speed; startup cost matters for `npx`.

### UNVERIFIED
- Actual terminal colours, spacing and total length of the default react-doctor report in a real run; the exact score label strings (code shows `Score: N / 100 <label>`, label comes from the API).
- grab's on-page visuals (highlight style, toast, toolbar) and prompt-mode UX; whether either has an MCP server; the 2x benchmark claim; react.doctor docs pages other than the landing page.

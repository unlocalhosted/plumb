# Brief: say what the CLI is doing while it works

Repo: this one (React Plumber, CLI `plumber`). Problem from the owner: while `npx plumber` runs, nothing is printed until
the report appears. A cold run on AlgoRecall (1,748 files, 292k declarations) is ~17 s of silence; people think it hung.

## What to build
A single live status line on **stderr** while analysis runs, for every command that analyses the project (`check` /
bare `plumber`, `init`, `baseline`, `doctor`, `decisions`, `habits`, `imitation`, `ledger`, anything else that reaches
the same pipeline). Drive it from the phases the pipeline already marks with `profileDuration` (src/index.ts,
src/profile.ts) rather than inventing new ones; add a tiny progress emitter beside the profiler, not a dependency.

Wording (product voice, docs/MESSAGES.md; record these in MESSAGES.md):
```
Reading your project: 1,748 files…
Compiling Tailwind from src/index.css…
Reading styles: 812 of 1,748 files…        (a moving count when the phase can report one)
Checking 292,104 values against your tokens…
Matching components…
```
- After 3 s in one run, append the elapsed seconds: `Checking 292,104 values against your tokens… 6s` (updates once a second).
- When the cache is cold and the run passes 5 s, add once, on its own line, kept after the run:
  `First run builds a cache in .plumber/cache; later runs are faster.` (use the real cache path in use).
- The status line is erased before the report prints, so stdout and the final terminal look exactly as today.
- Ctrl+C erases it too.

When it appears, and when it must not:
- Only when stderr is a TTY. Never with `--json`, `--agent`, when `CI` is set, or when stderr is piped. Those outputs
  must stay byte-identical to today.
- Not at all for runs that finish within 300 ms (no flicker on warm, small runs): start the line after 300 ms.
- No colour when `NO_COLOR` is set; otherwise dim text is fine. No spinner glyphs; the ellipsis and the moving count
  are the signal.
- Single line, rewritten in place (`\r` + clear-line), truncated to the terminal width so it never wraps.
- The daemon/serve/watch paths keep their own output; don't add the line there unless it's the same initial read,
  and then it follows the same rules.

## Proof (integration/e2e only, never unit tests)
- Run the real CLI under a pseudo-terminal (e.g. `script` on macOS/Linux or node-pty if already available; pick what
  works in CI too) on a fixture large enough to pass 300 ms (or a test-only env knob that lowers the threshold,
  documented as test-only): assert the phase lines appear on stderr in order, the final screen has no leftover status
  text, and stdout equals the non-TTY run's stdout.
- Assert nothing extra on stderr for: piped stderr, `--json`, `--agent`, `CI=1`.
- Assert the first-run cache line appears once on a cold cache past the (lowered) threshold and not on a warm run.
- `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passes in full.

Note for the result: `npx` itself is silent while it downloads the package on first use; that's npm's, not ours.
Say whether anything can be done about it (I don't expect so).

Rules: atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src,
site/src, or the uncommitted change in site/src/hero/Hero.jsx (it isn't yours; leave it unstaged). Don't touch
../algorecall except read-only with PLUMBER_CACHE_DIR redirected. Work in this checkout on `main`; other sessions may be
active, so if the full suite hits concurrent edits, verify in a separate worktree and remove it afterwards.
Write docs/briefs/cli-progress.result.md (with a recorded terminal transcript of a cold AlgoRecall run) and commit it.

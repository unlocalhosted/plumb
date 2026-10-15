# Brief: CLI experience, layer 2 — the summary-first report

Design: docs/briefs/cli-dx.md, sections 1–3, principle list, layer 2 of section 6, and the owner decisions at the end.
Layer 1 (setup and errors) is merged. Layer 3 (the one-line finding format, width-aware columns) comes next: in this
layer keep today's per-finding block format for the detail views, only change WHAT is shown by default and the
summary around it.

## Build
1. **Default human report = one screen.** For a project of any size, the default `plumber` / `plumber check` output is:
   - the header line: `React Plumber  <project name> · Tailwind <major.minor> · theme <path> · <n> files · <s>s`
     (one decimal for seconds, no ms, no "0 tsx, 0 jsx…" breakdown; that moves to `--verbose`);
   - **On your tokens**: one row per judged family, sorted by coverage ascending or as in the mockup (pick and say
     why), with a bar in a TTY (owner decision 3: numbers only when piped or `NO_COLOR`), the percentage, and the
     count off;
   - **Fix first**: in this order, only rows that are non-zero: broken styles (`✗`), setup gaps (`!`), component
     overrides, values off your tokens with the top 4 classes/values by sites; each row ends with the exact command that
     shows its detail;
   - **First run** (no ledger): the two-line "This is your first run…" block with `plumber baseline` and Alt+B.
     **With a ledger**: new findings in detail (today's block format), capped at 20 groups with a "+n more: plumber
     check --new" line; then `Known debt: n findings, unchanged (plumber check --debt)`; then the accept example once.
   - the **More:** footer naming `--all` with today's line count, `--family <name>`, `--file <path>`, `--json`.
   Target: ≤ 40 lines at 100 columns on AlgoRecall; this repo's site stays readable (its 6 hero findings are new
   drift without a ledger? check: the site has a ledger, so the 6 show in detail).
2. **Detail flags** (stdout, today's block format, which layer 3 will restyle): `--all` (exactly today's full output,
   so nothing is lost), `--broken`, `--family <name>`, `--file <path or glob>`, `--rule <id>`, `--new`, `--debt`.
   They combine (`--family color --file src/pages/**`). Add them to src/cli-flags.ts so the reference and the flag
   e2e pick them up; `--help` lists them.
3. **Order everywhere**: broken → setup gaps → new drift → overrides → off-token debt. Within a section, by sites.
4. **Say it once**: in detail views the per-rule why-sentence prints once per rule in a closing "Why" block, and the
   `intended? plumber accept …` line prints once at the end with a real example site, instead of per group.
5. Exit codes unchanged. `--json`, `--agent`, `--github`/annotation and any machine output: **byte-identical** to
   today (assert it). The CI Action's summary is out of scope unless it parses the human report (check).
6. Record new wording in docs/MESSAGES.md; update README and site/src/docs pages that show report output? No: don't
   touch site/src; list the docs that now show stale output in the result for a later pass.

## Proof (integration/e2e only)
- An AlgoRecall-shaped fixture (generate one with enough families, broken styles, overrides and debt; or reuse
  bench/apps tooling) : default output ≤ 40 lines at 100 columns, sections in order, every "Fix first" command, when
  run, prints exactly that subset.
- `--all` equals the pre-change default output (snapshot taken before your change).
- With a ledger: only new findings in detail, debt as a count.
- `--json`/`--agent` byte-identical to before.
- Piped/NO_COLOR: no bars, no escapes.
- Read-only run on ../algorecall (PLUMBER_CACHE_DIR redirected): paste the default output into the result.
- `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passes in full.

Rules: atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src,
site/src, or the unstaged site/src/hero/Hero.jsx. Work on main in this checkout. Write
docs/briefs/cli-dx-2-report.result.md and commit it.

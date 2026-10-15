# Brief: CLI experience, layer 3 — the finding line, alignment and colour

Design: docs/briefs/cli-dx.md, section 4, principles 4 and 7, layer 3 of section 6. Layers 1 (setup/errors) and 2
(summary-first report, detail flags, why-once, accept-once) are merged; read their results first. This layer changes
how each finding and every table is drawn; it does not change what is shown or the order.

## Build
1. **One finding, one line where possible, never more than three** (mockups in section 4):
   - line 1: subject (the class or value, in a fixed column), the short reason (one phrase, no full sentences: "off your
     spacing scale", "raw colour", "never defined"), and the location (one site: `file:line`; many: `9,350 sites in
     312 files`);
   - line 2 (only when there is a fix): `→` and the suggestions, compact: `p-5 (20px) · p-6 (24px, card padding)`;
     named tokens as the class/var a person would type, the value in parentheses, the why only when it is short;
   - line 3 (only for many sites): a compact row of sites `js-core.tsx:492 · js-core.tsx:502 · … · +9,346`, file
     basenames unless two share a basename (then the shortest unique tail of the path).
   - Broken styles start with `✗` and say what the browser does; never print a source expression over one line:
     collapse whitespace and truncate with `…` to the terminal width.
2. **Merge groups on the same subject**: `text-xs` today appears as two groups (size and line-height). One group per
   subject per rule family, both reasons in its phrase (`off your type scale (size and line-height)`), sites unioned.
   `--json` keeps its current shape (separate findings): this is presentation only.
3. **Width-aware, aligned tables everywhere** (findings, the coverage table, the "Fix first" list, the workspace list
   from layer 1, `decisions`, `habits`, `ledger`, `doctor`): column widths come from the terminal width (fallback 100
   when piped), not from the widest cell; a cell that doesn't fit is shortened (paths in the middle with `…`, text at
   the end) so columns never break; no line wraps at 80 columns. One shared table helper in src/, used by all of them.
4. **Colour**: red for broken (`✗`), amber for off-token/new drift, dim for secondary text (locations, counts, the
   `→` suggestions' values), default for the subject. Only in a TTY; none when piped, `NO_COLOR`, `--json`, `--agent`.
5. **Jargon pass** over every human-facing string the report prints: say "raw colour" not "raw colour token tier",
   "your type scale" not "type/framework", "setup gap" not "config gap"; rule ids appear only in `--verbose`,
   `--rule`, and the accept example. Keep docs/MESSAGES.md as the source of the wording and update it.

## Proof (integration/e2e only)
- PTY e2e at 80 and 140 columns on the layer-2 fixture and on the site: no line longer than the width, columns aligned
  (the location column starts at the same offset on every finding line of a section), no multi-line source text,
  `text-xs`-style subjects appear once.
- `NO_COLOR` and piped: no escape bytes. `--json`/`--agent` byte-identical to before this layer.
- The workspace list from layer 1 aligns.
- Read-only run on ../algorecall (cache redirected): paste `--family type` and the default output at 100 columns into
  the result.
- Full `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passes.

Rules: atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src,
site/src, or the unstaged site/src/hero/Hero.jsx. Work on main. Write docs/briefs/cli-dx-3-findings.result.md and commit it.

## Also (seen in layer 2's AlgoRecall output)
- "Fix first" rows: three aligned columns, `count + what` · a short reason (`the browser drops them`, `type roles
  aren't configured`, `callers restyle your components`, `most in type`) · the command. Today the commands are ragged.
- "On your tokens": the off-counts right-aligned with thousands separators in one column.

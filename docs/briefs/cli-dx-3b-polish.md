# Brief: CLI experience, layer 3 polish (four fixes seen on AlgoRecall)

Layer 3 is committed (eee9b3f). Run `COLUMNS=100 script -q /dev/null node dist/cli.js --root ../algorecall` and
`… check --family type` (PLUMBER_CACHE_DIR redirected; AlgoRecall read-only) to see each problem. Fix only these:

1. **Coverage table gap.** `motion  █░░…░   4%          1,719 off`: the off-count column sits far right of the
   percentage. Size it to its content: right-align counts within the width of the largest count, two spaces after
   the percentage: `4%   1,719 off` / `29%  54,489 off`.
2. **Inline-style subjects.** `fontFamily: 'var(--…` cuts off the part that identifies the finding, and different
   groups render identically. For style-object and CSS-declaration subjects show the property in CSS form and the
   value, quotes stripped, whitespace collapsed: `font-family: var(--font-mono)`, `font: 8px var(--font-mono)`.
   Truncate the value from the end only if it still doesn't fit (give the subject column more room when the section's
   subjects are declarations; take it from the reason column). If two groups in one section would still render the
   same subject text, show enough of the value to tell them apart, or explain in the result why they're separate groups
   and merge them if they're the same subject.
3. **Single-site location** uses the same form as site rows (basename:line, longer unique tail only on a basename
   clash), never middle-truncated paths like `src/advanced-…hase.tsx:1516`.
4. **Reasons don't run on.** When a group has two reasons, show them as one short phrase joined with ` · `
   (`raw type · off your type scale`), each reason in its shortest form; never truncate a reason mid-word. If the
   column can't fit it, the phrase moves to its own line under the subject rather than being cut.

Proof: extend the layer-3 PTY e2e with a fixture that has an inline `fontFamily: 'var(--x)'` and a `font: '8px var(--x)'`
group, a two-reason group, and a single-site finding in a long path: assert the exact rendered lines at 80 and 100
columns, and the coverage table's spacing. Paste the AlgoRecall default and `--family type` (first 30 lines) at 100
columns into docs/briefs/cli-dx-3b-polish.result.md. Full `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passes.
`--json`/`--agent` byte-identical. Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Don't touch overlay/src, site/src, or the unstaged site/src/hero/Hero.jsx.

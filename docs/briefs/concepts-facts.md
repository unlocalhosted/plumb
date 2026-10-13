# Brief: facts + recordings for Concepts pages: Findings, The ledger, Habits (no UI)
Do not run npm run build (dist/ is current; two other jobs share this repo); if you truly need a rebuild, say so in your result instead. Do not edit anything under site/src except the recording files named. Commit nothing. Cite file:line for every factual claim; write "not supported" when something is not. Use real CLI runs for any output; never hand-write output.
Results → docs/briefs/concepts-facts.result.md, one section per page.
## Findings
The parts of a finding as the CLI prints it (title, because/why, fix choices, edits, the "intended? plumb accept …" line),
the JSON fields behind each, severities and what each does to exit codes, grouping by value, --verbose, statuses.
Recording → site/src/docs/recordings/finding.json: run the real CLI text output AND --json on fixtures/docs-judged; store the exact terminal text
of ONE finding (the provenance/arbitrary gap-[13px] one), plus a map from each printed line to its part
(title|because|fix|edit|accept|site) and the JSON finding object. Strip ANSI but keep the text byte-exact otherwise.
## The ledger
What .plumb/ledger.jsonl holds (entry kinds: debt/baseline, exception, decision), keys, how baseline/init records existing
drift, how check classifies new vs known vs debt, the ratchet (debt can only fall), accept (--rule --site --why), ledger
--prune, stale entries, --base and --strict-ledger, and CI growth gating. Recording → site/src/docs/recordings/ledger.json: a real sequence on a
COPY of fixtures/docs-judged in a temp dir (git init it): init/baseline → add one new drift → check (fails) → fix an old
drift → check (debt falls) → accept one with --why → check. For each step store the command, exit code, the summary line(s)
and the ledger entry counts by kind. Script at scripts/docs/record-ledger.mjs.
## Habits
What habits are (rules about how styles are written, not values): every habit rule id that exists, its config, defaults,
messages (docs/MESSAGES.md), and one real example finding per habit if a fixture can show it cheaply.

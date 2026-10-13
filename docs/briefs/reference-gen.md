# Brief: generate the four Reference pages' data from the real sources (script work, no UI)
Do not run npm run build (dist/ is current; two other jobs share this repo); if you truly need a rebuild, say so in your result instead. Do not edit anything under site/src except the recording files named. Commit nothing. Cite file:line for every factual claim; write "not supported" when something is not. Use real CLI runs for any output; never hand-write output.
Write scripts/docs/gen-reference.mjs (run: node scripts/docs/gen-reference.mjs) producing:
- site/src/docs/recordings/ref-cli.json: every command and flag from src/cli.ts (name, summary, usage, flags with type/default/description,
  examples), plus the real --help text per command captured by running the built CLI.
- site/src/docs/recordings/ref-config.json: every option from schema/config.schema.json flattened to dotted paths (path, type, default, enum,
  description, example).
- site/src/docs/recordings/ref-rules.json: every rule id the code can emit (scan the rule registry/sources, not just docs) with family,
  default severity, title/because/fix templates from docs/MESSAGES.md or src/messages.ts, and how to accept it.
- site/src/docs/recordings/ref-report.json: schema/report.schema.json flattened (path, type, required, description), plus one real --json report
  from fixtures/docs-judged trimmed to one finding as an example.
Make the script deterministic (sorted, no timestamps). Report counts and anything the sources disagree on in
docs/briefs/reference-gen.result.md.

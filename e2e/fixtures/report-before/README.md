Captured before layer-2 edits at commit `5f09cdd`, after `npm run build`, with the real analyzer on `fixtures/ledger` and `{ ledger: true }`.

- `input.json`: frozen analyzer response, with the fixture root replaced by `/project`. Timing is frozen input; output bytes are never normalized.
- `all.txt`: pre-change default CLI human rendering, including the CLI's closing ledger context.
- `sha256.json`: SHA-256 of pre-change JSON (with its trailing newline), agent, SARIF and GitHub stdout, rendered from exactly that input.
- `replay.mjs`: integration harness replaces the analyzer response and disables the JSON cache shortcut through Node module hooks. Project discovery, option parsing, output dispatch, formatter imports, stdout and exit handling are the real CLI.

The replay runs every format through the actual CLI and compares complete stdout (or its hash). Real generated-project tests separately cover analyzer-to-report behavior, ledger mutation and combined selectors. No clocks, cache counters or output text are stripped during byte comparisons.

When capturing analyzer evidence, redirect `PLUMBER_CACHE_DIR` to a fresh scratch directory. Shared source fixtures must stay free of generated state: migration tests deliberately copy them verbatim.

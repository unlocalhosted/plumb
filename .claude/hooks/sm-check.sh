#!/bin/sh
# Claude Code PostToolUse hook (see .claude/settings.json): runs the state oracle on the file that was just edited.
# The oracle is its own project beside plumb's main checkout (../oracle); a linked worktree finds it through git's
# common dir. Exit 2 with findings on stderr: Claude reads them. Exit 0: nothing to say. Exit 1: a non-blocking notice
# that carries the first line of stderr (docs: code.claude.com/docs/en/hooks, "Exit codes").
root="${CLAUDE_PROJECT_DIR:-$PWD}"
common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
for oracle in "$common/../../oracle" "$root/../oracle"; do
  # --root: the checked files are this project's (a worktree's own), whatever directory the session sits in.
  if [ -f "$oracle/src/bin.mjs" ]; then exec node "$oracle/src/bin.mjs" check --hook --root "$root"; fi
done
echo '{"error":{"code":"no-oracle","message":"The state oracle was not found beside plumb (../oracle), so sm check --hook did not run."},"schema":1}' >&2
exit 1

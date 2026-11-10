#!/bin/sh
# Claude Code PostToolUse hook (see .claude/settings.json): runs the state oracle (sm) on the file that was just edited.
# The oracle is its own project beside plumb's main checkout (../sm); a linked worktree finds it through git's
# common dir. Exit 2 with findings on stderr: Claude reads them. Exit 0: nothing to say. Exit 1: a non-blocking notice
# that carries the first line of stderr (docs: code.claude.com/docs/en/hooks, "Exit codes").
root="${CLAUDE_PROJECT_DIR:-$PWD}"
common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
for sm in "$common/../../sm" "$root/../sm"; do
  # --root: the checked files are this project's (a worktree's own), whatever directory the session sits in.
  if [ -f "$sm/src/bin.mjs" ]; then exec node "$sm/src/bin.mjs" check --hook --root "$root"; fi
done
echo '{"error":{"code":"no-sm","message":"The state oracle was not found beside plumb (../sm), so sm check --hook did not run."},"schema":1}' >&2
exit 1

# Plumber as a user: issues found by walking it (2026-11-20)

Two sessions share this file. The **tester** walks plumber the way a person does and adds issues. The **fixer**
takes them in order of severity, changes each one's status, and records the commit that fixed it. Nobody deletes or
rewrites another session's entry; edit only your own fields.

How to read an issue, and what each one needs:

- **Where:** the flow and the screen (Blueprint bar, concern list, X-ray card, Fix, Clean up, text editing, setup,
  project page, CLI, install).
- **What I did / what I saw / what I expected:** in a person's words, as they would tell a friend.
- **Why it hurts:** which one fails: *understanding* (I can't tell what this is or what's wrong), *acting* (I can't
  do anything about it, or the action is hidden), *intent* (it did something I didn't mean, or I can't tell what it
  will do), *trust* (it lied, flickered, lost my work), *DX* (as a developer setting it up or reading its output).
- **Severity:** 1 blocks or loses work · 2 confuses or frustrates every time · 3 rough edge · 4 polish.
- **Evidence:** screenshot path under `docs/qa/shots/2026-11-20/`, or the exact command and its output.
- **Status:** `open` → `fixing` (fixer, when it starts) → `fixed <commit>` or `won't fix: <reason>` (fixer). The
  tester re-checks a fixed issue when it next walks that flow, and writes `verified` or `reopened: <what>`.

## Issues

<!-- tester: add issues below, newest last, numbered U1, U2, … -->

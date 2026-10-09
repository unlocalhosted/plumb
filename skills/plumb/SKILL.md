---
name: plumb
description: Keep UI code on the project's design system with the Plumb CLI (works with any coding agent or by hand). Use before and after writing or changing styles in a project that has plumb.config.ts, .plumb/ledger.jsonl or @unlocalhosted/plumb installed: Tailwind classes, cn/cva maps, CSS, @apply, inline style objects, or a design-system component's props. Also use when asked why a style is flagged, which token to use, or whether a value is on the scale.
---

# Plumb

These instructions are for any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Windsurf) and for people. They only use the `plumb` CLI.

Plumb judges every styling choice by the CSS it compiles to, against the project's own tokens, component contracts and habits. Run it; don't guess the tokens.

## Before you write styles

1. Read `PLUMB.md` at the project root if it exists: the project's tokens with their reasons, what callers may set on each component, and the habits in force.
2. To check a snippet before writing it:

   ```bash
   echo '<div className="gap-10 text-gray-500" />' | npx plumb try --agent
   ```

   `--lang css` for CSS. It writes nothing. Exit 0 means the snippet uses the system.

3. To pick a token: `npx plumb decisions --family spacing` (also `color`, `radius`, `type`, `motion`, `elevation`, `z`).

## After you edit

```bash
npx plumb check --changed --agent
```

It lists only new problems in the files you changed, one instruction per site:

- **Edit:** one token fits. Make exactly that edit.
- **Choose a token using its reason:** several fit. Pick by the reasons shown and what the element is for, then make that edit.
- **NEEDS-DECISION:** no token fits. Stop and tell the user the sites and the value you wanted. This is a valid result.
- **Fix:** a habit, ownership, imitation or existence finding. Follow it (for a component override, use one of the variants it names).

Run it again until it prints `0 new`.

## Never

- Edit `plumb.config.ts`, `.plumb/ledger.jsonl` or the theme to make a finding pass. Adding a token or an exception is a design decision for the user.
- Run `plumb accept`, `plumb accept-decisions` or `plumb baseline` unless the user asks you to. If something should be an exception, say so and give the `plumb accept … --why` line from the output for the user to run.
- Invent a value or the nearest arbitrary class (`p-[13px]`, `p-3.25`) to get around a finding.

## When asked about a finding

- `npx plumb why <file>:<line>`: which rule, token and ledger entry apply at a line.
- `npx plumb explain <file>`: every class, rule and inline style in a file with the CSS it compiles to.
- `npx plumb show <rule>`: every site of one kind of finding.

## Notes

- A first run with no ledger always exits 0; it reports and suggests `plumb init`. Setting the project up is the user's call.
- A warm `plumb serve` makes these commands answer faster; they use it automatically when it runs.

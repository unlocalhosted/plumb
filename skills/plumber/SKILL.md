---
name: plumber
description: Keep UI code on the project's design system with the React Plumber CLI (works with any coding agent or by hand). Use before and after writing or changing styles in a React app: Tailwind classes, cn/cva maps, CSS, @apply, inline style objects, or a design-system component's props. It needs no setup; it reads the project's own theme. Also use when asked why a style is flagged, which token to use, or whether a value is on the scale.
---

# React Plumber

These instructions are for any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Windsurf) and for people. They only use the `plumber` CLI.

React Plumber judges every styling choice by the CSS it compiles to, against the project's own tokens, component contracts and habits. Run it; don't guess the tokens.

## Running it

It works in any React app with nothing set up: it reads the theme the project already has. Setup (`plumber.config.ts`,
`.plumber/ledger.jsonl`) only records the person's own choices, and it is theirs to do.

- If `@unlocalhosted/react-plumber` is in the project's dependencies, run `npx plumber …` (`pnpm exec plumber …`,
  `yarn plumber …`).
- If it isn't, run `npx -p @unlocalhosted/react-plumber plumber …`. Never plain `npx plumber` there: that downloads
  a different npm package named "plumber".

The commands below are written `plumber …`; put the right start in front. Plumber's own output prints them with it.

## Notes from the person

The person can point at an element on their page and write a note for you about it. Run `plumber notes` at the start
of a task, and whenever the agent list says a note is waiting. Each note names the element's file and line and says
what they want. Do it there, then run `plumber notes --done <id>`. If a note is unclear, ask them.

## Before you write styles

1. Read `PLUMBER.md` at the project root if it exists: the project's tokens with their reasons, what callers may set on each component, and the habits in force.
2. To check a snippet before writing it:

   ```bash
   echo '<div className="gap-10 text-gray-500" />' | plumber try --agent
   ```

   `--lang css` for CSS. It writes nothing. Exit 0 means the snippet uses the system.

3. To pick a token: `plumber decisions --family spacing` (also `color`, `radius`, `type`, `motion`, `elevation`, `z`).

## After you edit

```bash
plumber check --changed --agent
```

It lists only new problems in the files you changed, one instruction per site:

- **Apply:** plumber can write this whole group itself. Run the line it shows (`plumber apply <key>`, or with
  `--token <name>` after you choose). It writes every place the way the person's fix bar would, and
  `plumber undo` takes it back while nothing has changed those files since. Prefer it to editing by hand.
- **Edit:** one token fits. Make exactly that edit (or use the group's Apply line).
- **Choose a token using its reason:** several fit. Pick by the reasons shown and what the element is for, then make that edit, or apply with `--token`.
- **NEEDS-DECISION:** no token fits. Stop and tell the user the sites and the value you wanted. This is a valid result.
- **Fix:** a habit, ownership, imitation or existence finding. Follow it (for a component override, use one of the variants it names).

It shows the ten most urgent problems first (what draws nothing, then what one edit settles), and says how many are
left. Fix those and run it again: the next ones come up. Stop when it prints `0 new`.

## Never

- Edit `plumber.config.ts`, `.plumber/ledger.jsonl` or the theme to make a finding pass. Adding a token or an exception is a design decision for the user.
- Run `plumber accept`, `plumber accept-decisions` or `plumber baseline` unless the user asks you to. If something should be an exception, say so and give the `plumber accept … --why` line from the output for the user to run.
- Invent a value or the nearest arbitrary class (`p-[13px]`, `p-3.25`) to get around a finding.

## Checking the page itself

With the app's dev server running, `plumber craft` reads the drawn page: spacing that only looks right by accident,
weights, contrast, touch targets, motion. It finds the dev server started in the project by itself (`--url` names
another), and needs no setup: where plumber isn't wired into the dev server, it brings its own copy into its own
browser and leaves the app alone. It needs Playwright's Chromium (`npx playwright install chromium`). While you fix, add `--no-probe`: it skips trying hover, press, menus and the keyboard, which takes most of the
time (14 s instead of 44 s on a small page). Run it once without `--no-probe` when you're done.

Where it can write the fix itself, a problem ends with `Apply: plumber apply p…`. Run that line: it prints a picture
of the element before and after (`Before:` and `After:` files). Open them to see what changed. `plumber undo` takes
it back. Fix the rest by hand from the `→` line. Page fixes come from the last page check, so run it again after you
change the page.

## When asked about a finding

- `plumber why <file>:<line>`: which rule, token and ledger entry apply at a line.
- `plumber explain <file>`: every class, rule and inline style in a file with the CSS it compiles to.
- `plumber show <rule>`: every site of one kind of finding.

## Notes

- With no setup, a first `plumber check` lists everything already off the theme. Work with `--changed`, so you fix
  what you touched, and tell the user plumber can be set up (`plumber init`) if they want their own rules.
- Don't run `plumber init` or install the package for the user unless they ask: both change their project.
- A warm `plumber serve` makes these commands answer faster; they use it automatically when it runs.

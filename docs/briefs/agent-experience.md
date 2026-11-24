# Plumber for agents: no setup, real edits, one loop (2026-11-24)

The owner: "what if people dont want to do the whole setup and how can we make the plumber more friendly for agents
setup, work, fix and everything".

## Plumber tried as an agent, with no setup

Tried as an agent would, on a copy of the ledger example with no plumber setup, and on the running ledger page.

1. **The instructions assume setup.** The agent skill says to use plumber "in a project that has plumber.config.ts,
   .plumber/ledger.jsonl or @unlocalhosted/react-plumber installed", and that setting up is the user's call. In a repo
   without them, an agent never reaches for plumber. Plain `plumber` ends with "run npx plumber init and answer a few
   questions", an interview an agent can't answer for the person.
2. **It works without setup, but says too much.** `check --agent` with no config judges against the theme it finds
   and returns 437 new problems in 130 groups, in file order. Nothing says which ten matter most, so an agent either
   churns through all of them or stops at random.
3. **A wrong edit was offered.** A missing `data-[state=closed]:animate-out` was told to become
   `data-[state=closed]:data-[state=closed]:animate-pulse`: a pulsing animation in place of an exit, with its variant
   written twice. Fixed on 2026-11-24 (journey 131). The better answer for `animate-in`/`animate-out` is still missing:
   they come from an animation plugin that isn't installed, and plumber says "define it in a stylesheet".
4. **An error can exit 0.** With Tailwind's package missing, `check --agent` printed "Tailwind is not installed" and
   exited 0, which an agent reads as clean.
5. **The page checks give words, not edits.** `craft --url` found 72 problems on the ledger page, all with a sentence
   ("Add aria-hidden="true"…") and none with the edit as data, although plumber writes 59 kinds of page fix itself from
   the overlay's fix bar. An agent must turn each sentence into an edit by hand.
6. **The page checks are slow and need a URL.** One page took 44 seconds, and the agent has to know the dev server's
   address and that one is running.
7. **No tool server.** `plumber serve --stdio` speaks JSON-RPC but not MCP, so Claude Code, Cursor and others can't
   add plumber as tools. Agents only read CLI text.
8. **The person's notes don't reach the agent.** The X-ray's ↵ opens "a note for your agent" with the file and line;
   where it goes and how an agent picks it up isn't part of any agent instruction.

## The system behind it

Plumber's agent surface grew as text output for a CI-like loop (check, edit, check again) on a project that already
chose its rules. The writers, the page judgement and the person's choices all live in the overlay and the dev server,
and the agent can't reach them. An agent without setup is not a case the instructions cover.

## Six layers

1. **Output an agent can trust.** Errors exit non-zero. Findings come ranked by what they cost a person (broken
   before inconsistent, many places before one), with a limit (`--top 10`) and a line saying how many are left. Dead
   plugin classes name the plugin.
2. **No setup needed.** The skill says plumber works in any React app with no setup, and that setup only records the
   person's choices. `npx @unlocalhosted/react-plumber check --agent` works without installing. A one-line
   `plumber install --agent` path works without `init`.
3. **Edits, not sentences.** Every finding plumber can write carries the edit as data (file, line, before, after) in
   `--json` and `--agent`, and `plumber apply <key>` writes it with the writer the fix bar uses, with undo.
4. **An MCP server.** `plumber mcp` with a handful of tools: check, try, why, craft a page, apply, undo. One line to
   add it to Claude Code or Cursor.
5. **Page checks an agent can use.** Find the running dev server, reuse the warm server for speed, and return a
   before and after screenshot so the agent can see what changed.
6. **The person's notes reach the agent.** The ↵ note lands where the agent reads (a notes file, and the MCP server),
   with the element's file and line.

## Open choices for the owner

- Should an agent write fixes through plumber (`apply`, same writer and undo as the fix bar), or only be told the
  edit to make by hand? Recommended: through plumber, so a fix is written the same way whoever takes it.
- With no setup, should an agent see only the top 10 by default? Recommended: yes, with the count of the rest.
- MCP server before or after the edits-as-data layer? Recommended: after, since the tools would hand out the same
  edits.

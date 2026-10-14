# Plumb docs: design doc

Revision 1, 2026-10-13. Status: approved 2026-10-13; building layer 1.

## 1. What the docs have to do

People arrive with one of four questions. Each page answers one of them, fast, and lets them **poke the real thing** instead of reading about it.

| Arriving with | Needs | Lands on |
|---|---|---|
| "What does this do to my repo?" | to run it safely in two minutes | Quick start |
| "Why did it flag this?" | the reason, and what to do | the rule's page (linked from every finding) |
| "How do I make it ours?" | decisions, config, the ledger | Concepts, Configuration |
| "How do I wire it in?" | overlay, CI, agents | Guides |

**How it should feel:** the homepage made you fix a card yourself. The docs keep that promise: every concept has a figure you can operate, and every example output is real.

**Three rules for truth:**
1. **Every command output is recorded from the real CLI** on a fixture project, at build time. Nothing is hand-typed. If the CLI changes, the docs re-record and the diff shows it.
2. **Plumb's real overlay runs on the docs**, the same way it does on the homepage hero. Alt-click any example element and the real reading opens. On the deployed site it replays.
3. **Every rule has a page**, generated from the rule's real message (docs/MESSAGES.md), so a finding in your terminal always has somewhere to go.

## 2. Information architecture

```
Start
  Quick start              three commands, each with its recorded output
  What Plumb is            one figure: class → compiled CSS → your decision → verdict
Concepts
  Decisions                where your scale comes from: theme, config, reasons
  How a value is judged    the pipeline, step by step (interactive)
  Findings                 the four parts of a finding (interactive anatomy)
  The ledger               baseline, exceptions, new drift (interactive timeline)
  Habits                   rules about how styles are written, not values
Guides
  The overlay in your app  Vite and Next wiring; Alt-click; Write
  CI and pull requests     the GitHub Action, baselines, the ratchet
  Agents                   what `plumb install` writes for Claude Code
  Adopting on a big repo   baseline, accept-decisions, prune, ratchet
Reference
  CLI                      every command and flag, searchable, with recorded output
  Configuration            every option, from schema/config.schema.json
  Rules                    one page per rule id
  Report format            the JSON report, from schema/report.schema.json
```

## 3. Shared systems (built first, reviewed before any page)

Reuse the homepage's tokens, type scale, plates, the blue stage and field, and the wrench. New, docs-only:

### 3.1 The shell
- **Left:** section nav (Start, Concepts, Guides, Reference), the current page marked; collapses to a sheet on phones.
- **Centre:** the page, a 68ch reading measure.
- **Right:** "On this page" outline that tracks scroll.
- **Top:** the title strip from the homepage, plus **⌘K search** over page titles, headings, CLI flags and rule ids.

### 3.2 Prose primitives
Headings with anchor links, paragraphs at text-base (17/27), inline code, lists, tables, and callouts in three kinds: *note*, *careful* (something that writes to disk), *why* (the reasoning behind a design choice). Each is one component with every state designed.

### 3.3 The command block
A terminal-styled block: the command with Copy (the same flip as the homepage install cards), and below it **the recorded output**, collapsible, with a badge "recorded from plumb 0.1.0 on fixtures/<name>". Findings in the output link to their rule pages.

### 3.4 The figure stage
Interactive figures sit on the blue stage with the field, like the homepage. One integer `stage` per figure, a storyboard comment, springs from the shared grammar. Each figure has a reduced-motion final state and keyboard controls.

## 4. The interactive figures (one each, built one at a time)

1. **The pipeline** (How a value is judged): pick a class (`gap-[13px]`, `p-6`, `@apply …`, an inline style). Watch it step through *authored → compiled CSS → resolved px → nearest decisions → verdict*. Same answer for all three ways of writing it.
2. **Finding anatomy** (Findings): a real finding from the CLI, its four parts (what, why it matters, what to do, how to accept) labelled; hover a part and it lights in the raw terminal output beside it.
3. **The ledger timeline** (The ledger): a repo's history on a scrubber. Init records a baseline; a PR adds drift (blocked); another fixes old drift (debt falls); an exception is accepted with a reason. The same conveyor language as the homepage's CI section.
4. **Decision sources** (Decisions): a theme file and a config side by side; edit a token or its `/* why: */` and watch the ladder and the reasons update (computed in the page, from the real resolver's recorded output).
5. **The overlay, live** (The overlay guide): a small sample component with drift, and the real overlay on it. The same replayed reading as the homepage hero.

## 5. Content pipeline

- **Authoring:** MDX, so prose stays prose and figures are components. One file per page under `site/docs/`.
- **Recordings:** a script runs the real CLI against fixture projects and writes JSON that pages import. It runs in CI; a docs build fails if a recording is stale. *(Script work: delegated to Codex per the working rules; the UI on top is mine.)*
- **Generated reference:** CLI, configuration, rules and report pages are generated from `src/cli.ts` help, the JSON schemas and `docs/MESSAGES.md`, so they cannot drift from the code.
- **Routing:** real paths under `/docs/...` (shareable links, rule pages linkable from terminal output), with a static fallback for hosting.

## 6. Build plan, one layer at a time

1. Shell and prose primitives on a single sample page. **Review.**
2. The command block, with one real recording (Quick start). **Review.**
3. Recording and reference-generation scripts (Codex), then the Reference pages.
4. Concepts pages, each with its figure, one figure at a time. **Review each.**
5. Guides.
6. Search.

## 7. Decisions

1. **Authoring:** MDX (`@mdx-js/rollup`).
2. **Recordings:** from fixture projects in `fixtures/`, committed, re-recorded in CI.
3. **Location:** the same site, under `/docs`, with real paths.

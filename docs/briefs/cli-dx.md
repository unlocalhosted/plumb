# CLI experience: setup that guides, a report you can read

Status: design for review, 2026-10-15. Nothing built yet. Evidence is real output from `dist/cli.js` today, captured
on AlgoRecall (3,534 files), this repo's site, and scratch folders for each wrong setup.

## 1. Problems

### The report is a blob
- AlgoRecall prints **9,210 lines**: 1,174 finding groups, each with a header, a why-sentence, suggestions, five sites,
  an "… more sites" line and an `intended? plumber accept …` line.
- **The summary is last.** Coverage per family, totals, setup gaps and the next step are the final 15 lines.
- **Boilerplate repeats per group.** "Your theme defines its own type scale; Tailwind's defaults sit outside it." and
  the accept line appear hundreds of times.
- **Ordered by site count, not by what to fix first.** 36 broken styles (declarations the browser drops) are at the
  very end, after 9,000 lines of type-scale debt.
- **One class, several groups.** `text-xs` appears as two groups (size and line-height), `text-sm` likewise.
- **Code dumps.** A site whose text is a multi-line ternary prints all seven lines inside the site list.
- **The gaps.** Columns are padded to the widest cell in each group; a long path then overflows, so the next rows
  misalign and leave wide holes (`use  'JetBrains Mono Variable', ui-monospace, monospace  numeric  var(--font-numeric)`).
- **Jargon.** "raw type token", "tier", `provenance/type/framework`, `existence/dead-var`, "config gaps",
  `decisions.<family>.exported`, "6752.9ms", "920 other".

### Wrong paths look like success
| Situation | Today | Exit |
| --- | --- | --- |
| Empty folder, or no `package.json` | `no findings` + "Next: run plumber init" | 0 |
| A subfolder of a project (`site/src/hero`) | `files 0 tsx, 0 jsx, 0 css` · `no findings` | 0 |
| React app without Tailwind, Tailwind-looking classes | `p-[13px] does nothing: no CSS is generated for it` | 0 |
| Tailwind in package.json, not installed | `Tailwind is not installed. Use Tailwind 4 in the project containing the CSS entry.` | 2 |
| `--root does-not-exist` | `…: ENOENT: no such file or directory, stat '/Users/…/does-not-exist'` | 2 |
| `plumber chek` | `Unknown command "chek"; use plumber check or plumber explain <file>` | 2 |
| `plumber check --jsno` | Node's own parseArgs text about positional arguments starting with `-` | 2 |

## 2. Principles

1. **Summary first, detail on request.** The default report fits on one screen for any project size. Detail is one
   flag away and the summary says which flag.
2. **Order by what to do.** Broken first, then setup gaps, then new drift, then debt.
3. **Say a thing once.** A rule's why is printed once per run (or per family), never per group. The accept command
   is shown once, in the footer, with a real example.
4. **One finding, one line where possible;** never more than three.
5. **Never report success when nothing was read.** Zero files read is a setup problem, not "no findings".
6. **Every error has three parts:** what happened, why (only if not obvious), what to do as a command to copy.
   No stack traces, no raw `ENOENT`, no Node internals.
7. **Width-aware, aligned, quiet.** Columns are sized to the terminal, not the data; long paths are shortened
   in the middle; colour carries severity (red broken, amber off-token, dim secondary) and `NO_COLOR` is honoured.
   Piped output and `--json`/`--agent` are untouched.

## 3. The default report (mockup, AlgoRecall, no ledger yet)

```
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 6.8s

On your tokens
  spacing    ███████████████████▍  97%     1,072 off
  radius     ███████████████████▍  97%       196 off
  color      ████████████▊         64%    21,130 off
  elevation  ██████████▏           51%     2,664 off
  type       █████▊                29%    54,489 off
  z          █▋                     8%       320 off
  motion     ▊                      4%     1,719 off

Fix first
  ✗ 36 broken styles      the browser drops them        plumber check --broken
  ! 1 setup gap           type roles aren't configured  plumber decisions --family type
  · 367 component overrides                             plumber check --rule ownership
  · 769 values off your tokens, most in type            plumber check --family type
      font-mono 9,350 · text-xs 5,436 · leading-relaxed 4,492 · text-sm 4,347

This is your first run, so all of this counts as new.
  plumber baseline      record today's drift as debt; from then on only new drift fails
  Alt+B in dev          see every drift on the page and fix it there

More: --all (every finding, 9,210 lines) · --family <name> · --file <path> · --json
```

With a ledger, the default shows **new drift in detail** (the thing a PR author must act on), debt as counts:

```
React Plumber  algorecall · 3 files changed · 1.2s

2 new since main
  ✗ src/pages/Pricing.tsx:48   bg-[#2563eb]   raw colour        → bg-primary
  · src/pages/Pricing.tsx:61   p-[13px]       off your spacing  → p-3 (12px) · p-4 (16px)

Known debt: 1,172 findings, unchanged (plumber check --debt)
Intended?  plumber accept --site src/pages/Pricing.tsx:61 --why "…"
```

## 4. A finding group (detail view: `--family`, `--file`, `--all`, `--broken`)

One finding, one line; the fix on the same line when it fits, under it when it doesn't:
```
  p-[21px]        off your spacing scale        src/hero/DriftedCard.jsx:24
                  → p-5 (20px) · p-6 (24px, card padding)
```
Many sites, one group, sites in a compact row:
```
  font-mono       raw font, not a named role    9,350 sites in 312 files
                  → font-numeric
                  js-core.tsx:492 · js-core.tsx:502 · mini-system.tsx:204 · CommitPhase.tsx:576 · +9,346
```
A broken style says what the browser does, and never prints the expression body:
```
  ✗ var(--color-success-bg)   never defined; the background falls back to rgba(34,197,94,0.1)
                  did you mean --color-success?           WallPhase.tsx:160
```
- One `text-xs` group, not two: size and line-height findings on the same class merge, with both reasons.
- Why-sentences per rule print once, in a "Why" block at the end of a detail view.
- Code at a site is shown as one line, truncated with `…` to the terminal width.

## 5. Setup that guides (mockups)

```
$ npx plumber                                   (in an empty folder, or no package.json here or above)
✗ No project here. React Plumber reads a React app: a folder with package.json.
  → cd into your app, or: npx plumber --root path/to/app
exit 2
```
```
$ npx plumber                                   (in site/src/hero)
Using the project at ../.. (site, package.json).
…report…
```
(walk up to the nearest package.json, the way npm does, and say so in one line)
```
$ npx plumber                                   (workspace root with several apps)
This is a workspace with 3 apps. Pick one:
  npx plumber --root apps/web       Next.js · Tailwind 4
  npx plumber --root apps/docs      Vite · Tailwind 4
  npx plumber --root packages/ui    library · Tailwind 4
exit 2
```
```
$ npx plumber                                   (read 0 source files)
✗ Found no .tsx, .jsx or .css files under src/. Is this the right folder?
  Looked in: src/** (from plumber.config.ts `source`)  → change `source`, or run in your app's folder
exit 2
```
```
$ npx plumber                                   (Tailwind in package.json, node_modules missing)
✗ Tailwind 4 is in package.json but not installed.
  → npm install       (from package-lock.json; pnpm/yarn/bun detected the same way)
exit 2
```
```
$ npx plumber                                   (Tailwind 3)
✗ React Plumber needs Tailwind 4; this project has 3.4.17.
  → upgrade: npx @tailwindcss/upgrade   (https://tailwindcss.com/docs/upgrade-guide)
exit 2
```
```
$ npx plumber                                   (React, no Tailwind, classes that look like Tailwind)
! These classes look like Tailwind, but Tailwind isn't set up: p-[13px], flex, gap-4 (+41 more).
  → npm install tailwindcss @tailwindcss/vite, then @import "tailwindcss"; in your CSS entry
  Checking plain CSS only for now.
```
```
$ plumber chek
✗ Unknown command chek. Did you mean check?
$ plumber check --jsno
✗ Unknown option --jsno. Did you mean --json?
$ plumber check --root does-not-exist
✗ --root does-not-exist: no such folder (from /Users/…/plumb).
```

## 6. Layers (each finished and verified before the next; e2e only)

| # | Layer | Proof |
| --- | --- | --- |
| 1 | **Wrong paths and errors.** Project discovery (walk up, workspaces, zero files read), install/version problems with the right package manager, did-you-mean for commands and flags, clean `--root` errors, the three-part error format. Exit codes as in the mockups. | One e2e per row of section 5 on scratch fixtures: exact stderr, exit code, nothing written. |
| 2 | **The summary-first default report.** Header, coverage bars, "Fix first", first-run vs ledger view, the "More:" footer, `--all`/`--family`/`--file`/`--broken`/`--debt` detail flags. | AlgoRecall-shaped fixture: default output ≤ 40 lines at 100 columns; `--all` equals today's content; `--json`/`--agent` byte-identical to today. |
| 3 | **The finding line.** One-line findings, merged class groups, compact site rows, why-once, one-line code, width-aware columns, middle-shortened paths, colour and `NO_COLOR`. | PTY e2e at 80 and 140 columns: no line wraps, columns align, no multi-line code, `NO_COLOR` has no escapes. |

Open questions for the owner:
1. Walk up to the nearest `package.json` automatically (and say so), or stop and ask? (recommended: walk up)
2. First run with no ledger: keep exit 0 (advisory) as today? (recommended: yes)
3. Bars in the coverage table, or numbers only? (recommended: bars when the terminal supports it, numbers when piped)

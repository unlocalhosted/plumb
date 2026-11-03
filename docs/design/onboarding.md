# Onboarding: one command to your own page

Status: spec for review, 2026-11-03. Nothing here is built yet.

Owner decisions (2026-11-03):
- the moment lands **on the page**: the CLI's job is to get you to Alt+B on your own app, fast;
- the user is **anyone who touches frontend**, a backend developer handed a UI task included. Plumber acts like a
  senior design engineer with taste who sees through the slop and stops it right there;
- `plumber doctor` **folds into the flow**: each step checks what it needs and says the one fix where it's needed;
- the delight lives in **a page about your project that the command opens**: graphical, charts, animation,
  microinteractions, and really well made. The terminal stays plain and short. Confirmed shape:
  - it opens on the first `npx plumber`, **before setup** (reading the code needs no dev server), and offers the
    setup itself;
  - it's **an overview**: each cause has a way to jump to your app with Alt+B on, where you fix it;
  - its centrepiece is **your system, drawn**: your scales as a specimen, with the stray values piled beside the
    step they should snap to;
  - it's **local only**: served from localhost, and nothing leaves the machine.

Evidence: two onboarding rounds on crafting-ui (`88f9672`, `bc01704`), and how react-doctor and react-grab do it
(docs/research/react-doctor-react-grab.md, quotes checked against their npm source).

## What's wrong today

The CLI shows how Plumber works inside, not what you get. Each problem below comes from a fresh crafting-ui run.

1. **Three choices before any value.** `plumber`, then `init`, then `install --overlay --write`, with `doctor`
   on the side. react-grab: one command, a diff, "Apply these changes?", done. react-doctor: one command, a score.
2. **The first screen is a wall of numbers.** "On your tokens: z 3% 67 off · elevation 23% 85 off · type 42%
   1,254 off …", then "740 values off your tokens". It sounds like being told off, and it means nothing to someone
   who doesn't think in tokens.
3. **`doctor` prints our model.** It's about 110 lines: 7 capabilities (Read, Remember, Fast, Locate, Preview,
   Write in place, Blueprint), about 25 requirements with ids like `[locate.react-dev]`, then Project, Support and
   Diagnostics tables.
4. **Findings are grouped by our rules, not by your mistake.** White appears as three findings under three rules:
   - `bg-white` ×6 does nothing (broken);
   - `bg-[#ffffff]` ×18 is a copy of a theme value;
   - `text-[#ffffff]` ×15 is the same copy again.

   The broken one even suggests `bg-warning`. A reviewer would say it once: "You wrote white 3 ways in 39 places.
   Your theme calls it on-accent, and 6 of them render nothing."
5. **Internal words come first:** tokens, drift, debt, ledger, baseline, decisions, "accepted as inferred",
   setup gap, capability.
6. **Setup for agents and CI happens before you've seen anything.** `install --ci` writes a hook, a skill and a
   workflow in one go.

## The system that replaces it

Five rules, each one a test the transcripts below must pass.

1. **One path that ends on your page.** `npx plumber` is the only thing a newcomer types. On a project that isn't
   set up, it opens a page about your project, which offers the setup in one click, then sends you to your own
   app. Every other command stays for people who want it, but nobody needs to learn them first.
2. **Causes, not rules.** A cause is one decision you made (or skipped) that shows up in many places: white
   written 3 ways, 15px text where the scale has 16, a button height nobody chose. The terminal shows at most 3
   causes, the biggest first. Rules, counts per family and coverage % move behind `--all`.
3. **The voice of a senior design engineer.** It talks about your UI, in your words: "your buttons", "your
   type scale", "white", "15px". It's warm, direct and short. It never names our parts: no tokens, drift, ledger,
   debt, capability or rule ids in the default output. Those stay in `--all`, `--json`, CI and agent output, where
   readers know them.
4. **Every output ends with exactly one next step**: one command or one key. Never a menu of four.
5. **Checks are gates, not a report.** A step checks only what it needs. When it can go on, the check is one
   line ("Found Vite 8 and React 19."). When it can't, it says what's wrong and the one command that fixes it,
   right there. `doctor` stays as a three-line status.

Plus one ordering rule: **value before anything we install for agents or CI.** Those are offered after your
first fix lands, never during setup.

## The path

The numbers below come from the 2026-11-03 crafting-ui run, so the transcripts show real scale. The exact
wording gets reviewed with this doc.

### 1. First run: `npx plumber` on a project that isn't set up

Before (today, abridged): the full report above, then

```
This is your first run, so all of this counts as new.
  plumber init          set up, and record today's drift as debt; then only new drift fails
  Alt+B in dev          see every drift on the page and fix it there
```

After, in the terminal (plain, short, done in a few seconds):

```
Plumber · reading your app…
  ✓ Vite 8, React 19, Tailwind 4 (theme in src/index.css)
  ✓ 417 files in 3.0s

Opened your project in the browser: http://localhost:7331
Press Ctrl+C here when you're done.
```

Then the page (next section) does the rest: the reveal, the setup question with its diff, and the way to your
own app. The terminal never asks the setup question when the page is open.

With no browser to open (no terminal, CI, `--json`, `--agent`, or `--no-open`), the terminal gives the plain
version instead: the 3 causes in one sentence each, then `Next: run npx plumber in a terminal to see this in your
browser, or npx plumber --yes to set it up here.` `--yes` sets up with no page and no question.

What setup does, wherever it's confirmed: adds Plumber to the dev config (the changed lines only, already built in
`install --overlay`) and writes plumber.config.ts with today's state, so only new problems fail later. Setup
never writes into your theme. Theme proposals (like the 10 z-index steps `init` offers today) are fixes you take
later.

### 2. Declined

Closing the page without setting up changes nothing. The terminal says `No changes made.` when you press Ctrl+C.

### 3. When a check can't pass

One line for what's wrong, one for the fix, then stop. No report. Examples:

```
✗ No React here. Plumber reads React apps. Run it from your app's folder, or pass --root apps/web.
✗ vite.config.ts has changes you haven't committed. Commit or stash them, then run npx plumber again.
✗ Found 3 apps: apps/web, apps/admin, apps/docs. Run npx plumber --root apps/web (or the one you mean).
```

Today these exist as `doctor` rows. The rows stay as the source of truth; this step says the one that blocks,
in one sentence.

### 4. On the page: the moment

This is out of scope for the CLI work and listed only so the path is complete. Alt+B is Blueprint as it stands
(the 2026-10-24 direction: your page dimmed, drift drawn where it lives, causes grouped in the side panel,
click anything to fix it). What the onboarding needs from it:
- **The first open shows the same 3 causes as the terminal, in the same words**, so the terminal's promise is
  kept on the page. This needs one cause model shared by CLI and overlay (layer 2).
- **The first-run tip** ("Click anything to fix it · ← → next fix · hold Space to use the page") stays.

### 5. Second run: `npx plumber` on a project that's set up

It opens the page again, which now leads with what changed since last time. In the plain version:

```
Plumber · 417 files in 0.4s
  Nothing new since you set up. 3 causes still open, the biggest:
  You wrote white 3 ways, in 39 places. Your theme calls it on-accent.

Next: press Alt+B on your page to fix it there.
```

After a fix has landed (the session's write history has one):

```
Plumber · 417 files in 0.4s
  You fixed 2 causes this week: 45 places. Nothing new.

Keep it that way: plumber install --ci adds a check to pull requests and a hook for your coding agent.
```

That's where agents and CI are offered: after a win, as one line.

### 6. `plumber doctor`

Before: about 110 lines. After:

```
Plumber
  ✓ Reads your code         Vite 8, React 19, Tailwind 4
  ✗ Shows on your page      Plumber isn't in vite.config.ts → plumber install --overlay --write
  – Guards new code         not set up → plumber install --ci
```

Three outcomes, in this order. Each is ✓, ✗ (with the one command) or – (optional, with the command). Exit 1
only when the first two aren't ✓. The current detail is `plumber doctor --verbose`; `--json` is unchanged.

## The page

This is the centre of the onboarding, and the next design job. These are its requirements, not its design; the
design gets prototyped and reviewed (layers 3–5).

**Chosen direction (2026-11-03):** three were prototyped on crafting-ui's real numbers
(docs/design/prototypes/system-drawn.html: Ruler, Specimen, Gravity). The owner chose **Gravity as the hero**:
every place that types a size by hand is a dot near the step it's closest to, and "Snap to your scale" pulls them
in while the count climbs (crafting-ui: 45 → 621). The **Specimen** sits below it for the detail. Built one
component at a time: Gravity first (docs/design/prototypes/project-page.html).

**What it says, top to bottom:**
1. **Your system, drawn.** Your type scale, colours and spacing, read from your theme and laid out as a specimen.
   Beside each step sit the stray values that should snap to it, sized by how many places use them: 15px text
   piled next to 16px, three whites next to on-accent, weight 500 with nowhere to go. You see the shape of the
   problem before reading a word.
2. **What I'd stop first.** The same 3 causes as everywhere else, in the same words, each with its places and the
   step it should become.
3. **Set it up** (until it's set up): the changed lines of the dev config, one button, and what it writes.
   Afterwards, this becomes **Show me on my page**: each cause links to a screen of your app that has it, with
   Alt+B on and that cause selected. If your dev server isn't running, it says the one command to start it and
   lights up when it is.

**The delight it needs**, all in the GUI:
- The specimen builds in: steps first, then the stray values arriving and settling beside them.
- Hovering a cause highlights its strays in the specimen, and the reverse.
- When you come back after fixing something, the values you fixed animate into their step, and the count drops.
  Clearing a whole cause gets a small celebration.
- Charts where they earn it: how your theme is actually used (which steps carry the app, which are unused), and
  progress over time once there's history.
- Every motion follows the animation rules: quick, interruptible, reduced to fades under reduced motion.

**What it's built on:** the same causes model as the CLI and the overlay (layer 2), served by the CLI's local
server. Nothing leaves the machine.

## Words

| Say | Not |
| --- | --- |
| your theme, your type scale, your colours | tokens, decisions, token family |
| places | sites, locations, findings |
| a cause, what I'd stop first | rule, provenance, ownership, finding |
| renders nothing | broken style, dead class, no CSS |
| today's state, what was already there | baseline, debt, ledger |
| new problems | new drift, new findings |
| on your page, press Alt+B | overlay, Blueprint, Locate, capability |
| set it up | init, install, wire |

## What stays

- Every command and flag. `init`, `install --overlay`, `install --ci`, `check`, `doctor --verbose`, `--all`,
  `--json`, `--agent` and `--sarif` keep working, for scripts, CI and people who know the tool.
- The CI and agent output keeps its precise words (rules, keys, ledger). Its readers need them.

## Layers, each with its own proof

Each layer is finished and checked on a fresh crafting-ui copy before the next one starts. Per the build rules:
primitives first, then one component at a time.

1. **Causes.** One model that groups findings by what you meant (a resolved value, a component or a scale step),
   across rules, shared by the CLI, the page and the overlay. Proof: on crafting-ui, white comes out as one cause
   (39 places, 6 rendering nothing), not 3 findings, and its suggestion is `on-accent`, never `bg-warning`. This is
   engine work and everything else stands on it.
2. **One path, plain terminal.** Bare `npx plumber` reads the code, serves the page on localhost and opens it. It
   also has the plain version for no-browser cases, `--yes`, gates, and the three-line `doctor`. Proof: a fresh copy
   goes from nothing to the page with one command; each blocked case is reproduced; e2e tests drive both versions.
3. **The page's primitives.** Colour, type, spacing, radius, elevation and motion tokens for the page, plus the
   rules connecting them, reviewed before any component. Proof: a primitives sheet in docs/design/prototypes.
4. **The centrepiece: your system, drawn.** Prototyped in a few directions on crafting-ui's real data, one chosen,
   then built with every state and motion. Proof: the prototype, then the built page on crafting-ui.
5. **The rest of the page, one component at a time:** causes, set up, show me on my page, progress. Proof: each
   component on crafting-ui, then setup through the page, then the jump to the app with the cause selected.
6. **Value before CI.** `install --ci` is offered only after the first fix, on the page and in the second run.
   Proof: on a copy, the offer is absent before a fix and present after.

## Open questions for the owner

1. **Agent handoff.** react-doctor ends by offering to open your coding agent with a prepared prompt (file:line,
   "fix the root cause", "stop after this pass"). Do we want "copy for your agent" as the second-run next step for
   people who don't want to fix on the page, or keep the page as the only path for now?
2. **Names on the page.** Should the dock keep the word "Blueprint", or follow the Words table there too
   ("press Alt+B")?

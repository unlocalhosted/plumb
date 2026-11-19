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

### U1 · "Heading lines uneven" on headings that sit on one line
- **Where:** Blueprint, Craft and polish, the three feature cards on the Ledger screen (1280×800).
- **What I did:** opened Blueprint (Alt+B), picked Craft and polish.
- **What I saw:** pink pins "Heading lines uneven" on "Smart sync NEW" and "✨ AI receipts AI". The note behind
  them says "This heading breaks into 2 uneven lines. Use text-balance." Both headings are one line: each box is
  28px tall with a 28px line height. The small badge (NEW, AI) sits a few pixels higher than the words, and that
  seems to be read as a second line. "Card controls", with no badge, gets no pin.
- **What I expected:** no note. A heading with a badge on one line is fine.
- **Why it hurts:** trust. A wrong note on the first screen teaches a person to ignore the pins.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u02-craft-pins.jpg`; in the page, `h3` "Smart sync NEW" has height 28,
  line-height 28px.
- **Status:** open

### U2 · Pins sit on top of the words they are about
- **Where:** Blueprint, pinned notes (Craft and polish).
- **What I did:** picked Craft and polish and looked at the page.
- **What I saw:** the "Heading lines uneven" pins cover the small "FEATURE" label above cards 1 and 2, so those two
  cards read "01 //", pin, heading, while card 3 still shows "FEATURE". "Padding looks bigger than it is" covers the
  top edge of the Get started button. "Only left-over space between" sits over the "Ledger" logo and is cut off by
  the top of the window.
- **What I expected:** a pin that marks a thing without hiding it or the thing next to it, and never clipped by the
  window edge.
- **Why it hurts:** understanding. I can't see the part of the page the note is about, or a neighbour goes missing
  and looks like part of the problem.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u02-craft-pins.jpg`
- **Status:** open

### U3 · "Only left-over space between" doesn't say between what
- **Where:** Blueprint, Craft and polish, the pin at the top left of the Ledger screen.
- **What I saw:** the pin reads "Only left-over space between". The full note is "These parts are 963px apart only
  because that much space is left over. A longer title closes it." Neither says which two parts, and the pin hangs
  off the logo, not the gap.
- **What I expected:** the pin on the gap, and words that name the two things ("the logo and the status line").
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u02-craft-pins.jpg`
- **Status:** open

### U4 · Most notes on the page are not problems
- **Where:** Blueprint, All concerns and Design system check (Ledger screen).
- **What I saw:** All concerns says 200, and 125 of them are Design system check. Reading them, many are facts, not
  problems: "mt-8. This works out to 2rem.", "py-24. This works out to 6rem.", and for nearly every Tailwind class
  "font-bold. font-bold is 700, from Tailwind's defaults. Your theme doesn't set it." Nothing says why that matters or
  what I should do.
- **What I expected:** a count I can work through. If "your theme doesn't set it" is the problem, one note for the
  page ("this page uses Tailwind's default type scale, not yours") with the list inside, not 125 notes.
- **Why it hurts:** understanding and acting. 200 is a number nobody starts on; the real ones (an em dash, "Click
  the button above") drown.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u03-concern-list.jpg`; the notes' words come from the labels on the
  page's note shapes inside the overlay.
- **Status:** open

### U5 · The Blueprint bar covers the page's main heading
- **Where:** Blueprint bar at rest, 1280×800.
- **What I saw:** the bar sits over "Discover Untamed Wilderness", the biggest heading on screen. Scrolling moves it out,
  but the first view of the page always has something big under the bar.
- **What I expected:** the bar keeps clear of what I'm reading, or is small enough not to hide a heading.
- **Why it hurts:** understanding (the page I'm judging is partly hidden).
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u01-bar-at-rest.jpg`
- **Status:** open

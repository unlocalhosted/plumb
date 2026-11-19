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
- **Status:** fixed 159aedb7

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
- **Status:** fixing

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

### U6 · The card shows another element's note
- **Where:** Blueprint, All concerns, the X-ray card on the "Get started" button.
- **What I did:** pointed at the "AI receipts" heading, then at the page's top, then at the "Get started" button,
  and waited two seconds.
- **What I saw:** the card is on the button (it says `a`, 150 × 48), but its pink face reads "Heading level skipped.
  Make it an h2, and style it as you like." with Edit the words, Ask your agent, Keep as is. That note belongs to the
  heading I pointed at before. At the same moment the small pill by the button reads "mt-8 → s6", a third note.
- **What I expected:** the button's own note, or no pink face if I haven't reached one of its notes.
- **Why it hurts:** trust and intent. "Edit the words" or "Ask your agent" here would act on the button with advice
  meant for a heading; the agent would be told to make a link an h2.
- **Severity:** 1
- **Evidence:** `docs/qa/shots/2026-11-20/u06-button-shows-heading-note.jpg`
- **Status:** open

### U7 · With one concern picked, pointing at a pinned element shows no note
- **Where:** Blueprint, Craft and polish, the "Get started" button with its pin "Padding looks bigger than it is".
- **What I did:** picked Craft and polish, pointed at the button and waited two seconds.
- **What I saw:** the X-ray card grows with sizes and type, but no pink note. The pin's own note never shows. Under
  the pointer, the topmost note shapes are Design system ones ("text-white …", "bg-indigo-600 …"), which the picker
  has hidden; the Craft note is fourth in the stack.
- **What I expected:** with Craft and polish picked, pointing at the button shows its Craft note.
- **Why it hurts:** acting. The pins tell me there is a problem, but I can't open it from the element.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u07-craft-button-no-note.jpg`
- **Status:** open

### U8 · Pins can't be pointed at; the pointer goes through to whatever is under them
- **Where:** Blueprint, Craft and polish, the "Heading lines uneven" pin on card 2.
- **What I did:** pointed at the pink pin itself.
- **What I saw:** the card opened on the "FEATURE" label under the pin (`p`, 395 × 16, "text size small 12px"), not
  on the heading the pin is about. The pins ignore the pointer.
- **What I expected:** a pin is the most obvious thing to point at; pointing at it opens its note on its element.
- **Why it hurts:** intent. I aim at the note and get a different element.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u08-pin-points-through.jpg`
- **Status:** open

### U9 · The X-ray card covers the Blueprint bar
- **Where:** Blueprint, X-ray card on an element in the right half of the page (the "Get started" button).
- **What I saw:** the card runs down over the bar and hides Fix, ··· and Close. With a pink note on top it is tall
  enough to hide them every time on a 800px-high window.
- **What I expected:** the card stays above the bar, or the bar stays on top.
- **Why it hurts:** acting. The way out (Close) and the main action (Fix) are hidden while a card is open.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u06-button-shows-heading-note.jpg`
- **Status:** open

### U10 · The padding and margin numbers in the card read as pairs of random numbers
- **Where:** X-ray card, the box drawing (Margin, Padding).
- **What I saw:** on the hero section the sides read "96 24" and "24 6"; on the button "12 3" and "24 6". It seems
  to be pixels and then the Tailwind step (py-24 is 96px), but nothing says so.
- **What I expected:** one number per side, or "96px · 24" with the step set apart, the way the card already does
  for "text size base 16px".
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u10-section-card.jpg`
- **Status:** open

### U11 · The padding stripes cover the button's words
- **Where:** X-ray card on the "Get started" button.
- **What I saw:** blue and yellow stripes are painted over the whole button, so "Get started" and the pin above it
  ("Padding looks bigger than it is") are hard to read.
- **What I expected:** the box drawing keeps the element's words readable.
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u07-craft-button-no-note.jpg`
- **Status:** open

### U12 · The card jumps up as I reach for its buttons, so my click lands on something else
- **Where:** Blueprint, X-ray card on the "Get started" button, with the pink note on top.
- **What I did:** moved from the button into the card and rested on "Ask your agent", then clicked without moving.
- **What I saw:** between resting and clicking, the card moved up about 45px (its top went from 252px to 180px on
  the page) and the row under the hand changed from "text size" to "right 0px". The click landed on the margin row,
  not on Ask your agent. Nothing I expected happened.
- **What I expected:** once the hand is on the card, the card stays where it is.
- **Why it hurts:** intent. A button moves away as I click it, and I hit whatever slid under the pointer.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u12-card-before-reach.jpg` (before),
  `docs/qa/shots/2026-11-20/u12-card-after-click.jpg` (after the click)
- **Status:** open

### U13 · One Escape closes the agent note and all of Blueprint
- **Where:** Blueprint, "Note for your agent" box (from Ask your agent).
- **What I did:** opened the note, copied it with ⌘↵ ("Copied with its place"), pressed Escape once. The box shows
  an "Esc" key on its corner, so I read it as "Esc closes this box".
- **What I saw:** the note closed and Blueprint closed with it: no bar, no pins, back to the plain page.
- **What I expected:** Escape closes the innermost thing, the note; a second Escape closes Blueprint.
- **Why it hurts:** intent. I lose my place (the open card, the element I was on) for pressing the key the box told
  me to press.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u13-agent-note.jpg` (the box with its Esc key); after one Escape the bar
  is gone.
- **Status:** open

### U14 · The agent note cuts off the line number
- **Where:** "Note for your agent" box.
- **What I saw:** the place reads "a · fixtures/.tells-app/src/App.jsx:…", so I can't see which line the note is
  about. The path is the long part; the line is the part I need.
- **What I expected:** the file name and line kept whole ("App.jsx:23"), the folders shortened if something must go.
- **Why it hurts:** understanding.
- **Severity:** 4
- **Evidence:** `docs/qa/shots/2026-11-20/u13-agent-note.jpg`
- **Status:** open

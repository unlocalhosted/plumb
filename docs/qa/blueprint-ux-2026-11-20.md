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
- **Status:** fixed 159aedb7 · verified (tester, 04:55): no pins on the badge headings; "Card controls" none either.

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
- **Status:** fixed 7856b3c4 · verified (tester, 04:55): pins sit above their element, FEATURE labels show, the top pin is no longer clipped. `docs/qa/shots/2026-11-20/u02-verified.jpg`

### U3 · "Only left-over space between" doesn't say between what
- **Where:** Blueprint, Craft and polish, the pin at the top left of the Ledger screen.
- **What I saw:** the pin reads "Only left-over space between". The full note is "These parts are 963px apart only
  because that much space is left over. A longer title closes it." Neither says which two parts, and the pin hangs
  off the logo, not the gap.
- **What I expected:** the pin on the gap, and words that name the two things ("the logo and the status line").
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u02-craft-pins.jpg`
- **Status:** fixed c34d3c05: the note reads "“Ledger” and “Live · v2.4…” are 963px apart only because…", the pin "Gap set by left-over space". The pin still sits at the row's corner, not on the gap · verified (tester, 05:52): the pin reads "Gap set by left-over space" and the note names "Ledger" and "Live · v2.4…". `docs/qa/shots/2026-11-20/u03-verified.jpg`

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
- **Status:** partly fixed 20b7a36e (each design-system note now says what is wrong: "isn't one of your tokens", "won't change when your theme does"). needs owner: what the concern count counts. Today it counts places (Design system 125) while Fix steps through fixes ("1 of 49"); a code comment records places as a deliberate choice. Options: (a) count fixes, so the picker's number is the list you work through and matches "1 of 49"; costs: a page with one fix at 60 places reads as "1", and the number drops a lot from what you have seen. (b) keep places but show both ("125 places · 31 fixes"); costs: two numbers in a small control. (c) keep as is and fold every Tailwind default into one page note ("this page uses Tailwind's default type scale"); costs: a new kind of note, and those places leave the fix list. I'd pick (a). · tester (05:01): the new words are in (e.g. "mt-8. This works out to 2rem, which isn't one of your tokens."); the count is still 197 with 125 design-system notes, so the rest waits on the owner.

### U5 · The Blueprint bar covers the page's main heading
- **Where:** Blueprint bar at rest, 1280×800.
- **What I saw:** the bar sits over "Discover Untamed Wilderness", the biggest heading on screen. Scrolling moves it out,
  but the first view of the page always has something big under the bar.
- **What I expected:** the bar keeps clear of what I'm reading, or is small enough not to hide a heading.
- **Why it hurts:** understanding (the page I'm judging is partly hidden).
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u01-bar-at-rest.jpg`
- **Status:** needs owner: the bar is 54px at the bottom centre; the only ways to keep it off a heading change the person's page or the bar. Options: (a) add room under the page while Blueprint is open (a spacer as tall as the bar), so anything can be scrolled out from under it; costs: Blueprint changes the page it judges, by one block at the very end. (b) the bar shrinks to a small pill when the pointer is far from it, growing back on approach; costs: one more motion, and the count is out of sight at rest. (c) leave it; the page scrolls. I'd pick (a), drawn as the margin pattern so it reads as plumber's, not the page's

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
- **Status:** fixed d0794c0c · verified (tester, 04:56): heading then button gives "Emoji as decoration" on the heading, then the button's own "Padding looks bigger than it is".

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
- **Status:** fixed d0794c0c (same cause as U6) · verified (tester, 04:56): with Craft and polish picked, the button's card shows its Craft note.

### U8 · Pins can't be pointed at; the pointer goes through to whatever is under them
- **Where:** Blueprint, Craft and polish, the "Heading lines uneven" pin on card 2.
- **What I did:** pointed at the pink pin itself.
- **What I saw:** the card opened on the "FEATURE" label under the pin (`p`, 395 × 16, "text size small 12px"), not
  on the heading the pin is about. The pins ignore the pointer.
- **What I expected:** a pin is the most obvious thing to point at; pointing at it opens its note on its element.
- **Why it hurts:** intent. I aim at the note and get a different element.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u08-pin-points-through.jpg`
- **Status:** fixed 9986555c · reopened (tester, 04:58): with Craft and polish picked, resting on either pin ("Padding looks bigger than it is", "Only left-over space between") for two seconds opens nothing at all. The pins now take the pointer, but a Design system note shape for the hero section ("py-24. This works out to 6rem.") lies on top of them: in the overlay, elementFromPoint at both pins returns that `path.hit`. Same cause as U7's first report: notes of a hidden concern still catch the pointer. `docs/qa/shots/2026-11-20/u08-reopened.jpg` · fixed again 5068ff8a: the pins' layer now stands above the zones as a whole (it lost to them while it was its own stacking context); resting on either pin opens its element's card with its note. · verified (tester, 05:36): with Craft and polish picked, resting on "Padding looks bigger than it is" opens the button's card with that note, and "Only left-over space between" opens the header's card with its note. `docs/qa/shots/2026-11-20/u08-verified.jpg`

### U9 · The X-ray card covers the Blueprint bar
- **Where:** Blueprint, X-ray card on an element in the right half of the page (the "Get started" button).
- **What I saw:** the card runs down over the bar and hides Fix, ··· and Close. With a pink note on top it is tall
  enough to hide them every time on a 800px-high window.
- **What I expected:** the card stays above the bar, or the bar stays on top.
- **Why it hurts:** acting. The way out (Close) and the main action (Fix) are hidden while a card is open.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u06-button-shows-heading-note.jpg`
- **Status:** fixed fa900ba3 · verified (tester, 05:10): the card on "Get started" ends above the bar; Fix and Close stay in view. `docs/qa/shots/2026-11-20/u09-verified.jpg`

### U10 · The padding and margin numbers in the card read as pairs of random numbers
- **Where:** X-ray card, the box drawing (Margin, Padding).
- **What I saw:** on the hero section the sides read "96 24" and "24 6"; on the button "12 3" and "24 6". It seems
  to be pixels and then the Tailwind step (py-24 is 96px), but nothing says so.
- **What I expected:** one number per side, or "96px · 24" with the step set apart, the way the card already does
  for "text size base 16px".
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u10-section-card.jpg`
- **Status:** fixed 838eb9f2: each side shows its px (12, 24); the token's name is on hover ("12px · 3")

### U11 · The padding stripes cover the button's words
- **Where:** X-ray card on the "Get started" button.
- **What I saw:** blue and yellow stripes are painted over the whole button, so "Get started" and the pin above it
  ("Padding looks bigger than it is") are hard to read.
- **What I expected:** the box drawing keeps the element's words readable.
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u07-craft-button-no-note.jpg`
- **Status:** fixed 16f6103a: the "blue stripes" over the words were the text-size highlight, a tinted box over the label; it is an outline now. The padding hatch stays on the padding bands only

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
- **Status:** fixed fa900ba3 (same cause as U9: the card was placed at a guessed height, then grew) · verified (tester, 05:10): moving from the button to "Ask your agent" in four steps, the card and its buttons stay at the same place.

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
- **Status:** fixed 5fad8eb4 · verified (tester, 05:11): Escape in the agent note closes the note only; the card and Blueprint stay.

### U14 · The agent note cuts off the line number
- **Where:** "Note for your agent" box.
- **What I saw:** the place reads "a · fixtures/.tells-app/src/App.jsx:…", so I can't see which line the note is
  about. The path is the long part; the line is the part I need.
- **What I expected:** the file name and line kept whole ("App.jsx:23"), the folders shortened if something must go.
- **Why it hurts:** understanding.
- **Severity:** 4
- **Evidence:** `docs/qa/shots/2026-11-20/u13-agent-note.jpg`
- **Status:** fixed 116fe677: the place reads "a · App.jsx:23", the full path on hover · verified (tester, 05:53): the agent note reads "header · App.jsx:12". `docs/qa/shots/2026-11-20/u14-verified.png`

### U15 · The first fix says text-sm isn't one of my sizes, then lists the size it is
- **Where:** Fix, first fix on the Ledger screen (the line "Click the button above to create your free account").
- **What I saw:** "11 places use Tailwind's default font size. `text-sm` isn't one of your font size tokens: 12px and
  14px." `text-sm` is 14px, and the line is 14px on screen. The fix, "Use text-body", is also 14px. So the change
  swaps a name and nothing on screen moves, but the words read as if the size were wrong.
- **What I expected:** "`text-sm` is 14px, the same as your `text-body`. Use the name so it follows your theme." Then
  I know nothing will look different and why it's still worth taking.
- **Why it hurts:** understanding. I look for a size problem that isn't there.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u15-fix-first.jpg`; in the page the line has class
  `mt-2 text-sm text-slate-500`, font size 14px, and `--text-body` is 14px.
- **Status:** fixed 3ba15fd8 · verified (tester, 05:02): fix 1 reads "11 places use text-sm, Tailwind's default font size · text-sm is 14px, the same as your text-body. Use your name for it, so it changes when your theme does."

### U16 · Two fixes in a row have the same title with different counts
- **Where:** Fix, fixes 1 and 2 of 50.
- **What I saw:** fix 1 is "11 places use Tailwind's default font size", fix 2 is "19 places use Tailwind's default
  font size". Only the small grey line under each says it's `text-sm` and then `text-xs`.
- **What I expected:** the class in the title ("19 places use text-xs, Tailwind's default"), so I can tell the two
  apart and see I moved on.
- **Why it hurts:** understanding. After Skip it looks like the same fix came back with a different number.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u15-fix-first.jpg`, `docs/qa/shots/2026-11-20/u16-fix-second.jpg`
- **Status:** fixed 3ba15fd8 (same change as U15: the headline names the class) · verified (tester, 05:03): fix 2 reads "19 places use text-xs, Tailwind's default font size"; the two titles differ.

### U17 · Escape in the "Why keep it?" box leaves Fix altogether
- **Where:** Fix, Keep as is on fix 2.
- **What I did:** pressed Keep as is. A box asked "Why keep it?" with "Keep 19 places" and "Cancel Esc". I pressed
  Escape to cancel.
- **What I saw:** the reason box closed and so did Fix: the bar went back to "All concerns" and I lost my place at
  2 of 50.
- **What I expected:** "Cancel" takes me back to the same fix with its choice row, as the label says.
- **Why it hurts:** intent. Cancel did more than cancel; to get back to fix 2 I have to start Fix again.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u17-keep-reason.jpg`
- **Status:** fixed 5fad8eb4 · verified (tester, 05:09): Keep as is, then Escape, comes back to fix 1 of 49 with its choice row.

### U18 · The note counts change when I haven't changed anything
- **Where:** Blueprint bar and the concern list, Ledger screen.
- **What I did:** opened Blueprint (200 notes), stepped through two fixes without taking or keeping any, scrolled
  down and back up. Then reloaded the page and opened Blueprint again.
- **What I saw:** first load: 200 (Design system 125, Craft 21, Accessible 12, Anti-slop 42). After scrolling: 182
  (125, 20, 11, 26). After reloading: 197 (125, 18, 12, 42). No file in the test copy changed in that time.
- **What I expected:** the same page gives the same counts.
- **Why it hurts:** trust. If the number moves on its own, I can't tell whether my fixes did anything.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u03-concern-list.jpg` (200), `docs/qa/shots/2026-11-20/u18-counts-182.png`,
  `docs/qa/shots/2026-11-20/u18-counts-197.png`; `fixtures/.tells-app/src` files were last written 04:29, before
  the walk.
- **Status:** open, not yet traced: while checking it the page reloaded on its own (writes to the shared test copy reload it), which may be part of it. To check next: the same page, no writes, counts at open, after a scroll, after a reload; notes that depend on what is on screen (pairs, words that run into each other) would explain a scroll changing the count

### U19 · The Blueprint bar covers the bottom of the setup panel
- **Where:** ··· → Setup steps, 1280×800.
- **What I saw:** the panel runs from 178px to 754px down the page; the bar starts at 730px. The footer line "5
  selected · run them in your terminal, or copy them for your agent" is cut through by the bar, and "Copy for agent"
  sits right against it.
- **What I expected:** the panel ends above the bar.
- **Why it hurts:** understanding. The line that says what the ticks are for is the one hidden.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u19-setup-panel.jpg`
- **Status:** fixed 19a65b6d (same cause as U27: panels placed for the dock, not the bar) · verified (tester, 05:20): the setup panel ends above the bar; its footer and Copy for agent are clear. `docs/qa/shots/2026-11-20/u19-verified.jpg`

### U20 · Two setup steps are the same command
- **Where:** Setup steps, "Choose your rules" and "Start from today's problems".
- **What I saw:** both say to run `npx plumber init`, each with its own Copy button, and the header counts them as two
  of "5 setup steps left".
- **What I expected:** one step ("Run plumber init: it asks about your rules, then records today's problems"), or
  the second step to say it's done by the first.
- **Why it hurts:** understanding and DX. I run init twice, or wonder what the second one does differently.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u19-setup-panel.jpg`; panel text read from the page.
- **Status:** fixed cc44f3ec: with no config, one step ("Choose your rules"), which says it records today's problems too (seen in `plumber doctor --verbose`; the test server on 4340 shows it after a restart)

### U21 · Setup steps point at package.json line 1 for things that aren't in package.json
- **Where:** Setup steps, "Turn on React Fast Refresh", "Plugin order needs a check", "Check that saving updates the
  page".
- **What I saw:** each names `package.json:1` as the place. Fast Refresh is added in the Vite config (the step itself
  says "right after plumb()", which is in the config, not package.json). The last one reads "package.json:1
  server.watch.usePolling: false; environment: native", which is a setting dump, not a place.
- **What I expected:** the file where I make the change (the Vite config), or no place at all when there is none.
- **Why it hurts:** DX. I open package.json and find nothing to change.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u19-setup-panel.jpg`; panel text read from the page.
- **Status:** fixed 5bf095fd: with no dev server config found, those steps carry no place and say "your dev server config" (seen in `plumber doctor`; the running test server still shows package.json:1 until it restarts)

### U22 · "Plugin order needs a check" gives me nothing to do
- **Where:** Setup steps, under NOT CONFIRMED YET.
- **What I saw:** "Plugin order needs a check. Places in your code may point at transformed code instead of what you
  wrote." No command, no Copy, no tick box, no hint how to check it.
- **What I expected:** what to check and how ("plumb() must come before react() in your Vite plugins; run plumber
  doctor to confirm"), or leave it out until plumber can tell.
- **Why it hurts:** acting. A worry with no way to act on it.
- **Severity:** 3
- **Evidence:** panel text read from the page (see U19 shot).
- **Status:** fixed 1c0a5221: an unconfirmed step shows its instruction and command with Copy ("Move plumb() before the plugins that transform JSX or TSX…")

### U23 · The C key on "Clean up page" is squashed
- **Where:** ··· list.
- **What I saw:** the key cap after "Clean up page" is 6px wide, a sliver of a "C" at the menu's right edge, while
  the "5" badge on Setup steps above it is full size.
- **What I expected:** the same key cap the bar uses for Esc.
- **Why it hurts:** understanding (the shortcut can't be read).
- **Severity:** 4
- **Evidence:** `docs/qa/shots/2026-11-20/u24-more-menu.png`; the `kbd` in the Clean up row measures 6px wide.
- **Status:** fixed 116fe677: the C is an 18px key cap · verified (tester, 05:51): the C key cap is full size. `docs/qa/shots/2026-11-20/u23-verified.png`

### U24 · Clean up stops at a command with no way to run or copy it, and every other step is locked
- **Where:** ··· → Clean up page (or the C key), on the Ledger screen with no site read yet.
- **What I did:** opened Clean up, pressed Try again, then clicked the Colour step.
- **What I saw:** "Plumber hasn't read your whole site yet. Text styles are worked out from every page, so each page
  ends up the same. Run this one again." and the command `plumber census --url http://127.0.0.1:4340/`. There is no
  Copy button and nothing says where to run it (which folder). Try again shows the same panel. Spacing, Colour,
  Icons, Corners, Contrast and the last step are greyed and don't answer a click, so Clean up does nothing on a
  first visit.
- **What I expected:** a Copy button and the folder to run it in, or Clean up runs the read itself. The steps that
  don't need the whole site (colour, corners on this page) should still open.
- **Why it hurts:** acting. The headline feature in the ··· list is a dead end until I leave the page for the
  terminal, and the panel doesn't help me get there.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u24-cleanup-full.jpg`, `docs/qa/shots/2026-11-20/u24-cleanup-census.png`
- **Status:** partly fixed 0117b87a: the command's Copy button was there but laid out past the panel's edge (U25); it shows now. Still open: where to run the command (which folder), and whether the passes that don't need the whole site should open before the census · tester (05:48): the Copy button now shows beside the command; the steps after Text are still locked until the site is read, as the fixer notes.

### U25 · Clean up's words and step names are cut off on the right
- **Where:** Clean up panel.
- **What I saw:** the panel is 520px wide but its body is laid out 718px wide, so the text runs under the right
  edge: "Run this one again" shows as "Run this on… again". The step names along the top are cut to "Spac…",
  "Corn…", "Cont…" and the last one to "Sh".
- **What I expected:** the words wrap inside the panel, and the step names fit or turn into icons with names on
  hover.
- **Why it hurts:** understanding.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u24-cleanup-census.png`; in the overlay, `.cu` is 520px wide and its
  `.body` 718px.
- **Status:** fixed 0117b87a · verified (tester, 05:48): the words wrap inside the panel ("Run this once in your project, then try again."); the 8 steps are circles with their names on hover, all inside the panel. `docs/qa/shots/2026-11-20/u25-verified-cleanup.jpg`

### U26 · While Clean up is open the Blueprint bar is gone, and the only visible button is Try again
- **Where:** Clean up panel.
- **What I saw:** the bar (with Close) disappears. The panel has no close or back button. Escape does take me back
  to the bar, but nothing on screen says so.
- **What I expected:** a visible way back (a Back or Done button, or the Esc key cap the other panels show).
- **Why it hurts:** acting. A person who doesn't think of Escape is stuck in front of a panel that does nothing.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u24-cleanup-full.jpg`
- **Status:** fixed 0117b87a (same cause as U25: Close was laid out past the panel's right edge; it shows now with its Esc key) · verified (tester, 05:48): "Close esc" shows at the panel's bottom right. `docs/qa/shots/2026-11-20/u25-verified-cleanup.jpg`

### U27 · History opens underneath the Blueprint bar
- **Where:** ··· → History.
- **What I saw:** History is a dark strip along the bottom, 504px to 1264px across, the same height as the bar,
  which covers its left two thirds. All I can see is "Undo change ⌫", "Undo step ⇧⌫" (both grey) and an ×. The
  strip's own words, "Edited outside · Now · A change edited outside React Plumber since. Undo it in your editor.",
  are behind the bar; I only read them in a tooltip that came up on its own.
- **What I expected:** History above the bar, or in place of it, with its words in view.
- **Why it hurts:** understanding and acting. I can't see what History holds, and the two buttons I can see are
  disabled with no reason in view.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u27-history-under-bar.jpg`
- **Status:** fixed 19a65b6d · verified (tester, 05:19): History opens above the bar with its timeline in view. `docs/qa/shots/2026-11-20/u27-verified-u54-history.jpg` (its words are U54)

### U28 · History's one entry doesn't read as a sentence
- **Where:** History strip, the only entry.
- **What I saw:** "Edited outside · Now · A change edited outside React Plumber since. Undo it in your editor." I
  hadn't changed anything in this walk; the test copy's files were last written about 20 minutes before, yet the
  entry says "Now".
- **What I expected:** "A file changed outside Plumber after this change (App.jsx, 04:29). Undo it in your
  editor." with the real time.
- **Why it hurts:** understanding and trust ("Now" for something old).
- **Severity:** 3
- **Evidence:** strip text read from the page; `fixtures/.tells-app/src/*.jsx` modified at 04:29, History opened
  about 04:51.
- **Status:** partly fixed 9669774c: the entry reads "A file was changed outside React Plumber after this, in your editor or by git. Undo it there." Still open: no file name or real time ("Now" for an old change)

### U29 · Help: the last shortcut is under the bar, and one row's keys run into its words
- **Where:** ··· → Help (Keyboard shortcuts).
- **What I saw:** the panel ends at 754px and the bar starts at 730px, so the last row, "Space · Hold to use the
  page", has its key hidden behind Close. "Alt + two-finger scroll" runs into its own description "Up to the parent,
  down to the child". Same cause as U19: panels from ··· are sized as if the bar weren't there.
- **What I expected:** every row readable, the panel above the bar.
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u28-help.jpg`
- **Status:** fixed 19a65b6d (the panel above the bar) and 5e3aae8e (the long key wraps) · verified (tester, 05:19): Help sits above the bar; "Alt + two-finger scroll" wraps and the Space row shows. `docs/qa/shots/2026-11-20/u29-verified.jpg`

### U30 · "Edit the words" is the main button on notes that aren't about words
- **Where:** X-ray card, pink note "Padding looks bigger than it is" on the "Get started" button.
- **What I saw:** the note says "12px of padding looks like 18.7px. The line adds its own space." The dark, main
  button under it is "Edit the words". The padding problem has nothing to do with the words; editing them won't fix
  it. The same note doesn't say what to change (lower the padding? tighten the line height?).
- **What I expected:** the main action matches the note: for a spacing note, "Ask your agent" or a fix I can take;
  "Edit the words" only for notes about the words (an em dash, a stock word, an emoji).
- **Why it hurts:** intent. The loudest button leads me away from the problem.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u30-padding-note-edit-words.jpg`
- **Status:** fixed 3290204d (the main action; the padding note still doesn't say what to change, which is the check's own wording) · verified (tester, 05:10): the padding note leads with "Ask your agent"; "Edit the words" is gone from it.

### U31 · Alt+click says "Nothing to fix on this page" on a page with about 200 notes
- **Where:** outside Blueprint, Alt+click on the paragraph under "Card controls".
- **What I did:** closed Blueprint, Alt+clicked the paragraph "This section explains how card controls work".
- **What I saw:** an editor card for the paragraph (Type, Case, Colour, Write ↵) and, at the bottom, a bar that says
  "Nothing to fix on this page." with Close. A minute earlier Blueprint counted 197 notes on this same page.
- **What I expected:** if the bar is about the paragraph, "Nothing to fix here"; if it's about the page, the real
  count.
- **Why it hurts:** trust. One of the two numbers is wrong, and I can't tell which.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u31-alt-click.jpg`
- **Status:** fixed 5068ff8a: after an Alt+click the bar says "Nothing to fix on this element." (the words are in b882ad19, swept into another session's commit) · verified (tester, 05:37): Alt+click on the paragraph now says "Nothing to fix on this element." `docs/qa/shots/2026-11-20/u31-verified.jpg`

### U32 · Alt+click doesn't do what Help says it does
- **Where:** Alt+click outside Blueprint; ··· → Help.
- **What I saw:** Help lists "Alt + click · Show its problems in Blueprint". Alt+click opened a style editor for the
  element (font size, line height, case, colour, a Write button) and no problems.
- **What I expected:** Help and the product to agree: either Alt+click shows the element's notes, or Help says
  "Alt + click · Edit its type and colour".
- **Why it hurts:** intent. I expect to read problems and get a panel that can write to my code with Enter.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u31-alt-click.jpg`, `docs/qa/shots/2026-11-20/u28-help.jpg`
- **Status:** fixed fafa775d: Help reads "Alt + click · Open its editor, with its notes in the bar". The README line is U37

### U33 · Every "Read more" link in the CLI goes to a site that doesn't exist
- **Where:** `plumber craft` text output.
- **What I did:** ran `node dist/cli.js craft --url http://127.0.0.1:4340/ --no-probe --no-pairs --root
  fixtures/.tells-app` and followed a "Read more" link.
- **What I saw:** findings end with "Read more: https://plumber.unlocalhosted.dev/docs/rules#craft-…". The host
  doesn't resolve: `curl https://plumber.unlocalhosted.dev/docs/rules` exits 6 (could not resolve host), and
  `dig +short plumber.unlocalhosted.dev` and `dig +short unlocalhosted.dev` print nothing. The same machine reaches
  npmjs.com.
- **What I expected:** a link that opens, or no link until the page exists.
- **Why it hurts:** DX and trust. The first link a developer clicks is dead.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u33-craft-output.txt` (the run's text output); the curl and dig results
  above.
- **Status:** fixed 74694792 (no link until the docs site has an address; PLUMBER_DOCS_ORIGIN sets one) · verified (tester, 05:21): `plumber craft` on the same page prints no "Read more" lines (0 of 70 findings).

### U34 · The weight note tells me to use an existing weight, then to add a new one
- **Where:** `plumber craft`, rule craft/weight-levels (8 findings on this page).
- **What I saw:** "Weight 600 appears here, but the page mostly uses 400, 500, 700. Use one of those." followed by
  the action "→ Your theme has no weight step for this. Add one, then use it here."
- **What I expected:** one direction: pick 500 or 700 (and say which), or add a step, not both.
- **Why it hurts:** acting. The two lines contradict each other, so the developer has to make the call the tool was
  asked to make.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u33-craft-output.txt`, the finding at `src/App.jsx:156:9`.
- **Status:** fixed cfa7cb6e: `plumber craft` now says "→ Change `font-semibold` to `font-medium`: 500, one the page already uses." under the weight note

### U35 · The page and the CLI count the same page differently
- **Where:** Blueprint on the Ledger screen vs `plumber craft` on the same URL.
- **What I saw:** the CLI: "1 route, 108 elements read, 70 findings". Blueprint: 197 notes (Craft 18, Accessible 12,
  Anti-slop 42, Design system 125). Without design system that is 72, not 70, and the CLI never says it leaves the
  design system out.
- **What I expected:** the CLI's first line to say what it counted ("70 craft, accessibility and anti-slop
  findings; design system: run plumber check"), and the two tools to agree on the rest.
- **Why it hurts:** trust and DX. A developer who checks one against the other finds two numbers and no reason.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u33-craft-output.txt` (first line), `docs/qa/shots/2026-11-20/u18-counts-197.png`.
- **Status:** partly fixed c6e79518: the first line reads "70 findings from the craft, accessibility and generated-look checks. For your tokens, run npx plumber check." Still open: 70 here against 72 in Blueprint without the design system (the two read the page differently)

### U36 · The JSON output says everything twice
- **Where:** `plumber craft --json`.
- **What I saw:** each finding carries `because` and `why` with the same text, and `action` and `fix` with the same
  text. The 70 findings also appear twice, at the top level and under `routes[0].findings`. The file is 261 KB for
  one page.
- **What I expected:** one field per meaning, findings listed once (or the route list pointing at them by key).
- **Why it hurts:** DX. A developer writing a script against it has to guess which field is the real one.
- **Severity:** 4
- **Evidence:** `node dist/cli.js craft --url http://127.0.0.1:4340/ --json --no-probe --no-pairs --root
  fixtures/.tells-app` → keys `schemaVersion, tool, root, spec, routes, findings`; first finding has
  `"because"` = `"why"` and `"action"` = `"fix"`.
- **Status:** needs owner: dropping the repeated fields (because/why, action/fix) and the second copy of the findings changes `--json`'s published shape (schemaVersion 1) for anyone reading it. Options: (a) keep both until a schemaVersion 2 and mark the old names deprecated in the docs; costs nothing now, the file stays big. (b) drop them now; costs a break for any script reading why/fix or routes[].findings. I'd pick (a)

### U37 · The README describes a Blueprint bar that has changed
- **Where:** README, "Blueprint: fixing" and "Inspect".
- **What I saw:** "A bar says how many problems the page has, with **Fix** and **Clean up**." Clean up is now under
  ···, and the bar leads with the concern picker, which the README doesn't mention. "Alt + click · Shows that
  element's problems in Blueprint" doesn't match what Alt+click does (U32). The GIF's description talks about "heat"
  and a "fix panel" with "Take and Apply", which the bar no longer has.
- **What I expected:** the README to match the bar a new user will see.
- **Why it hurts:** DX. The first thing a developer reads doesn't match the first thing they see.
- **Severity:** 3
- **Evidence:** `README.md` lines 21, 82, 88.
- **Status:** partly fixed 29df4492: the Blueprint paragraph and the Alt+click row now describe the concern picker, the ··· menu and the editor. Still open: the GIF at the top (and its alt text) shows the old heat and fix panel; it needs a new recording

### U38 · On the dev server, /__plumb/system is raw JSON, and nothing in the overlay leads to the project page
- **Where:** `http://127.0.0.1:4340/__plumb/system`, and the overlay's ··· list.
- **What I saw:** the address prints a wall of JSON (steps, strays, places). The project page (how Plumber read my
  design system) is only served by running `npx plumber` in a terminal; the overlay has no link to it.
- **What I expected:** a way from the overlay to the project page, or the dev server serving the page itself at a
  readable address.
- **Why it hurts:** acting and DX. From the app I can't reach the page that explains my own tokens.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u38-system-json.jpg`; `overlay/src/project-page.js` header says "The CLI
  serves it".
- **Status:** needs owner: a new way in, not a fix. Options: (a) a "Your design system" row in ··· that opens the project page, with the dev server serving it at /__plumb/; costs: the page is built for `npx plumber` and would need the overlay's server to serve it. (b) /__plumb/system answers a browser with a short page that says what it is and the command that opens the project page; costs little, still a terminal step. I'd pick (b) now and (a) when the project page is ready to ship in the overlay

### U39 · On crafting-ui, picking "Design system check" pins nothing
- **Where:** Blueprint on the owner's crafting-ui home page (localhost:5180), 1280×800.
- **What I did:** opened Blueprint (51 notes), picked Design system check (10), looked at the page and scrolled
  down a screen.
- **What I saw:** no pins anywhere, at the top or after scrolling. In the overlay there are no pin elements at all
  for this concern, while Craft and polish on the same page draws 6.
- **What I expected:** 10 pins, or a line in the bar saying where the 10 are ("all 10 are further down" or "these
  are about your theme file, not one element").
- **Why it hurts:** understanding. The list says there are 10 problems and the page shows none.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u39-crafting-ds-no-pins.jpg`
- **Status:** fixed d3928478: every picked concern gets pins (they were craft only); on crafting-ui the one design-system note in view is named "Spacing not in your theme" · verified (tester, 05:49): on crafting-ui, Design system check pins "Spacing not in your theme ×11". `docs/qa/shots/2026-11-20/u39-verified.jpg`

### U40 · Three identical "Line too heavy" pins in a row, with no way to tell which line
- **Where:** Blueprint, Craft and polish, crafting-ui home page after scrolling one screen.
- **What I saw:** three "Line too heavy" pins side by side at the top edge of the grid drawing, partly under the
  page's sticky header, and a fourth further down. 21 notes, 6 pins. I can't tell which lines are too heavy or why
  three pins share one spot.
- **What I expected:** one pin per thing, on the line it is about, and pins kept below a sticky header.
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u40-crafting-craft-pins.jpg`
- **Status:** partly fixed 5068ff8a: pins keep below a sticky header. Still open: identical pins in a row (three "Line too heavy", five "Only left-over space between") with no way to tell them apart · the rest fixed d3928478: one pin per kind of note on screen, with how many (×3), at the topmost of its elements · verified for the repeats (tester, 05:50): the identical pins are one pin, "Line too heavy ×7". It sits at the page's top-left corner above the CONTENTS tab, not on any of the seven lines, so it still doesn't show which lines. `docs/qa/shots/2026-11-20/u40-verified.jpg`

### U41 · The fix in hand is under the app's sticky header, and its choice row covers the header
- **Where:** Fix, crafting-ui home page, fix 1 of 10 "2 places: line too heavy".
- **What I did:** scrolled one screen down, picked Craft and polish, pressed Fix.
- **What I saw:** the page scrolled so the line in question (the cap-height guide over "The little details") sits
  at the very top, under crafting-ui's sticky header. The pink corner marks peek out above and below the header.
  The choice row ("h-[0.5px]", "Use h-[0.5px]", "Keep as is", "Skip") is laid on top of the header, over the
  CONTENTS tab and the heading.
- **What I expected:** Fix scrolls the element into view below a sticky header, so I can see the line and the
  choice next to it.
- **Why it hurts:** understanding. I'm asked to choose a fix for a thing I can't see.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u41-crafting-fix-under-header.jpg`
- **Status:** fixed 3d132589 (the element comes in below the sticky header; the choice row weighs what it would hide and now sits beside the line, clear of the header and the heading) · verified (tester, 05:40): on crafting-ui, fix 1 of 11 brings the cap-height line in below the sticky header, with the corner marks and the choice row beside it, clear of the header. `docs/qa/shots/2026-11-20/u41-verified.jpg`

### U42 · The fix for a heavy line is a hard-coded value
- **Where:** same fix, "2 places: line too heavy. This 1px line is 2 pixels thick on a 2× screen."
- **What I saw:** the only option is `h-[0.5px]`, "Use h-[0.5px]". The Design system check on the same bar counts
  hard-coded values like `[0.5px]` as problems.
- **What I expected:** a token or a named hairline (or the option to add one), so taking a Craft fix doesn't create
  a Design system note.
- **Why it hurts:** trust. One concern's fix is another concern's problem.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u41-crafting-fix-under-header.jpg`
- **Status:** needs owner: the heavy-line check's fix is h-[0.5px], which the design-system check then calls hard-coded. Options: (a) offer a named hairline (add `--spacing-hairline: 0.5px` to the theme, then h-hairline), through the same "add to theme" flow; costs: one more token in the person's theme. (b) the design-system check leaves values under 1px alone (a device pixel is not a step of a scale, as the verdict already does); costs: hard-coded half pixels never get a note. I'd pick (b): it matches how the verdict already treats them

### U43 · The site's first sentence has two grammar slips
- **Where:** the plumber site's home page (localhost:4330), under "A design engineer on every screen."
- **What I saw:** "Plumber acts as your own design engineer, it finds whenever your frontend drift away from your
  actual system and writes the fix into your JSX." Two sentences joined by a comma, and "frontend drift" where it
  should be "drifts".
- **What I expected:** "Plumber acts as your own design engineer. It finds where your frontend drifts from your
  system and writes the fix into your JSX."
- **Why it hurts:** trust. A tool that judges craft has a slip in its first line.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u43-site-hero.jpg`
- **Status:** needs owner: the sentence is in an uncommitted edit to `homepage/src/hero/Hero.jsx` (not in any commit), likely the owner's own words, so the fixer left it. Suggested: "Plumber acts as your own design engineer. It finds where your frontend drifts from your system and writes the fix into your JSX." Taking it costs nothing; leaving it keeps the comma splice and "frontend drift".

### U44 · At 700px wide the Fix bar cuts off both its lines
- **Where:** Fix, fix 1 of 49, window 700px wide.
- **What I saw:** "11 places use text-sm, Tailwind's default font si…" and "`text-sm` is 14px, the same as your text-body.
  Use yo…". The part that says what to do is the part cut off. The bar is 760px of screen with room to grow
  taller.
- **What I expected:** the two lines wrap; the bar can be taller on a narrow window.
- **Why it hurts:** understanding. The new, clearer words (from the U15 change) can't be read on a narrow window.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u44-fix-bar-700.jpg`
- **Status:** fixed b784f053 · verified (tester, 05:18): at 700px both lines wrap in full. `docs/qa/shots/2026-11-20/u44-verified-700.jpg`

### U45 · In the card, the blue highlight in the "text size" row sits under the label, not the value
- **Where:** X-ray card, top row ("text size base 16px"), on the "Get started" button, after the card fixes.
- **What I saw:** the blue pill that marks the value now covers "text size base", and "16px" with its ⌄ sits outside
  it on the dark card. It stays that way after two seconds, so it isn't mid-animation. Before the fixes the pill
  wrapped "base 16px ⌄".
- **What I expected:** the pill around the value I can change.
- **Why it hurts:** understanding. It reads as if the label were the control.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u45-text-size-row.png`; compare `docs/qa/shots/2026-11-20/u06-button-shows-heading-note.jpg`.
- **Status:** fixed f4a811da · verified (tester, 05:01): the blue highlight wraps "base 16px ⌄" again.

### U46 · The ‹ › arrows in the Fix bar are too small to hit
- **Where:** Fix bar, the arrows either side of "1 of 49".
- **What I did:** clicked just right of "1 of 49" to go to the next fix.
- **What I saw:** nothing happened. The arrows are 22 × 22px, set close to the count, and my click landed on the
  gap between them. The second try, aimed at the arrow's centre, worked.
- **What I expected:** arrows at least 32px across, or the whole "‹ 1 of 49 ›" group as two halves I can't miss.
- **Why it hurts:** acting. The main way to move between fixes by mouse takes aim.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u46-fix-arrows.jpg`; in the overlay the buttons "Previous fix" and
  "Next fix" measure 22 × 22px.
- **Status:** fixed 116fe677: the arrows are 28px · verified (tester, 05:51): both arrows are 28 × 28px; ‹ is disabled on the first fix.

### U47 · ← on the first fix jumps to "Note 31 of 31" at the bottom of the page
- **Where:** Fix, fix 1 of 49, pressing ←.
- **What I saw:** the bar changed to "1 paragraph: hard to read · Note 31 of 31" and the page scrolled down to the
  Deployments section. The counter changed from fixes to notes without saying so. 49 fixes and 31 notes make 80,
  while the bar said 197 before I pressed Fix.
- **What I expected:** ← on the first fix stays (or says "this is the first"), and one counter that matches the bar.
  If notes come after fixes, a line where the list moves from one to the other ("Fixes done; 31 notes to read").
- **Why it hurts:** understanding. I lose my place and can't tell how much is left.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u47-note-31-of-31.jpg`
- **Status:** partly fixed c2ba8519: ← on the first fix stays, and ‹ is off there. Still open: the counter changes from fixes to notes ("Note 1 of 31") with no line saying so, and fixes + notes (79) differ from the bar's count (197, places), which is the counting choice in U4 · tester (05:51): ← on fix 1 of 49 now stays, with ‹ faded. `docs/qa/shots/2026-11-20/u47-verified-first-fix.jpg`

### U48 · "Contrast 45 at 12px. Small text needs 60." gives a number with no scale
- **Where:** Fix, Note 31 of 31, "1 paragraph: hard to read".
- **What I saw:** "Contrast 45 at 12px. Small text needs 60." The choice row says "Darken the text, or make it
  bigger or bolder." 45 of what? Most people know contrast as a ratio like 4.5:1.
- **What I expected:** the scale named once ("45 on the APCA scale; small text needs 60"), or the ratio people
  know.
- **Why it hurts:** understanding.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u47-note-31-of-31.jpg`
- **Status:** fixed f37902a7: "Contrast is 45 on the APCA scale at 12px. Small text needs 60." (checked from the words file; not walked to Note 31 in Fix)

### U49 · Closing Blueprint leaves the page where Fix scrolled it
- **Where:** Fix, then Escape twice to leave Fix and Blueprint.
- **What I saw:** I opened Blueprint at the top of the page; Fix scrolled down to the Deployments section. After
  closing, the page stayed down there. The README says "Esc also leaves, and the page is put back exactly."
- **What I expected:** the page back where I was when I opened Blueprint.
- **Why it hurts:** intent. I was reading the top of my page and closing a tool moved me.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u49-scroll-after-close.jpg`; README line 92.
- **Status:** fixed 29fffc4f: Fix scrolled to 80px, Escape brought the page back to 0

### U50 · After Alt+click, "All concerns" means only that element, and one card gets three counts
- **Where:** outside Blueprint, Alt+click on a card, then ··· → Inspect an element on the "Active users" card.
- **What I saw:** after Alt+click on the Churn card and closing its editor, the bar still read "All concerns 7"
  (Design system 4, Craft 1, Anti-slop 2): the counts for that one card, under a label that says "All". Then for
  the "Active users" card: the hover label said "Card div 2 problems", the editor said "7 problems here", and the
  bar said "All concerns 11".
- **What I expected:** one count per element everywhere, and a bar that says it is showing one element ("This
  card · 7") with a way back to the whole page.
- **Why it hurts:** trust. Three numbers for one card, and a page-wide label on an element's count. Same family as
  U31.
- **Severity:** 2
- **Evidence:** `docs/qa/shots/2026-11-20/u50-scoped-all-concerns-7.jpg`,
  `docs/qa/shots/2026-11-20/u50-hover-2-problems.jpg`, `docs/qa/shots/2026-11-20/u50-editor-7-bar-11.jpg`
- **Status:** partly fixed 5068ff8a: after an Alt+click the picker's first row says "This element", not "All concerns". Still open: the hover label, the editor and the bar count one element three ways (own notes, notes inside it, places), and there is no way back to the whole page but Esc then Alt+B · partly (tester, 05:38): the list now says "This element 11" (Design system 7, Craft 1, Anti-slop 3), so the label is right. Two parts remain: (1) Inspect's hover label on the same "Active users" card still says "Card div 2 problems"; (2) after picking the card, the bar opens on "Craft and polish 1" rather than the element's 11, so the bar's number is the smallest of the three. `docs/qa/shots/2026-11-20/u50-this-element-11.jpg`, `docs/qa/shots/2026-11-20/u50-hover-still-2.png`

### U51 · "Inspect an element" gives no sign that anything started
- **Where:** ··· → Inspect an element.
- **What I saw:** the list closed and the page looked exactly as before. Only when I moved over a card did an
  outline appear. Nothing said "pick an element" or how to stop.
- **What I expected:** a line in the bar ("Click an element to inspect it · Esc to stop") and a different pointer.
- **Why it hurts:** understanding. I can't tell whether my click on the menu did anything.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u51-inspect-no-sign.jpg`
- **Status:** fixed 30490ea6: the bar says "Click an element to inspect it. Esc stops." (for 4 seconds; the pointer is unchanged)

### U52 · After Undo, the message offers "Undo" again
- **Where:** element editor, after resizing the Churn card by its right edge (it wrote `w-xs` to 3 places) and
  pressing Undo.
- **What I saw:** a dark message "Undone. Your code is back as it was." with a button "Undo". Pressing it would
  presumably put `w-xs` back, which is a redo. The resize itself worked: snapped to w-xs (320px), wrote one line,
  said "3 places, one line of code", and Undo restored the file (the change log shows the write and its undo).
- **What I expected:** "Redo" on that button, or no button.
- **Why it hurts:** intent. "Undo" on an undone change reads as "undo more", not "put it back".
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u52-resize-written.jpg` (after the write),
  `docs/qa/shots/2026-11-20/u52-undone-undo.jpg` (after Undo).
- **Status:** fixed 61ef203e, not walked by the fixer in the element editor (cause: an undo was remembered with its undo handles left to find after a reload, and the newest write found was the undo itself). Tester: please re-check the resize-then-Undo path · reopened (tester, 05:55): resized the Churn card (wrote w-xs to 3 places), pressed Undo, no reload: the message still reads "Undone. Your code is back as it was." with a button "Undo". The fix covers the message shown after a reload; the one shown right after Undo still offers Undo. The test copy was restored (no w-xs in App.jsx). `docs/qa/shots/2026-11-20/u52-reopened.jpg`

### U53 · Holding Space shows nothing, so nobody finds it
- **Where:** Blueprint at rest, holding Space.
- **What I saw:** while Space is held the note shapes let the pointer through (a click reaches the page's link), but
  the screen doesn't change at all: same bar, same pins, no word. The only place it is mentioned is Help.
- **What I expected:** a sign while held (the bar says "Using the page"), and a hint at rest that the page is
  covered ("Hold Space to use the page").
- **Why it hurts:** understanding. People who try to click their page in Blueprint hit the notes and don't know the
  way through. (I held Space by sending the key events from the page, since the browser pane can't hold a key; a
  real hold may differ.)
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u53-space-held.jpg` (taken while held); in the overlay the host gets
  `data-bp-pass` and `path.hit` turns `pointer-events: none`.
- **Status:** partly fixed 30490ea6: while Space is held the bar says "Using the page" and the marks and pins fade to 20%. Still open: no hint at rest that Space exists

### U54 · History's timeline doesn't say what its parts or buttons do
- **Where:** ··· → History, after one resize and its undo.
- **What I saw:** a timeline with the headings "Changed since", "Size", "Undo" and "Now", a tooltip "Undo w-xs → ø",
  and two buttons "Undo change ⌫" and "Undo step ⇧⌫". Opening it also scrolled the page down to the three cards
  and outlined them. I can't tell what "Changed since" means, what ø stands for, how a change differs from a step,
  or what "Undo change" does when the last entry is already an undo.
- **What I expected:** each entry in plain words ("Card width set to w-xs, 3 places · undone"), and button names
  that say the result ("Put w-xs back").
- **Why it hurts:** understanding and intent. History is where I go to get out of trouble, and I can't predict what
  its buttons will do to my code.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u27-verified-u54-history.jpg`
- **Status:** partly fixed 9669774c: "Changed in your editor", "Changed again later", buttons "Undo this change" and "Undo its whole step", "nothing" for an empty value. Still open: a change's tooltip prints a whole chunk of JSX as its "from", and opening History scrolls the page

### U55 · A selected card's outline and grips are drawn over the concern list
- **Where:** element editor with the "Active users" card selected, then the concern list opened from the bar.
- **What I saw:** the card's blue selection outline and its white grips run across the open list, through the
  "Design system check" and "Craft and polish" rows. The list is below the selection, not above it.
- **What I expected:** the open list above everything on the page, the selection included.
- **Why it hurts:** understanding. Lines cross the words I'm trying to read and pick from.
- **Severity:** 3
- **Evidence:** `docs/qa/shots/2026-11-20/u50-this-element-11.jpg`
- **Status:** fixed 6fbec11d: the open list stands above the X-ray layer; with the Active users card selected, every row is the topmost thing under its centre

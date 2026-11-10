# Building the showcase screens from their comps (2026-11-05)

The owner approved the single-component comps in docs/design/prototypes/comps/NN-*-card.html (renders:
docs/design/comps/card-NN.png, critiques: docs/design/comps/cards-A…F.md). Each screen is now built from its comp as
real code. Read .claude/skills/craft-rule/SKILL.md first, all of it: it is how a screen is made and proved.

## Where the code goes
- One file per screen: `overlay/showcase/src/principles/screens/NN-slug.jsx` (read screens/kit.jsx). It exports
  `export const n = NN`, the component as `export default`, with the statics the stage reads (`.names`, `.lesson`
  `{ why, habit }`, `.measure`, `.stage` where the old one had them), and `export const handsOn = true` for screens
  whose old component lives in hands-on.jsx. The stage (Principle.jsx) picks the file up by its number and it replaces
  the old example. The approved #16 (`Timesheet` in examples.jsx) is the reference for structure and quality.
- Port the old component's behaviour, statics and measure (examples.jsx / hands-on.jsx / ProbeStage-related code),
  adapted to the new markup. Read the old one fully before writing.
- Only write: your screen files, new media files, and your batch's notes. Never edit examples.jsx, hands-on.jsx,
  Principle.jsx, ProbeStage.jsx, screens/kit.jsx, theme.css, media/CREDITS.md or any overlay/src file; other builders
  run at the same time. If you need a shared helper, copy it into your file. If a screen truly can't be done without
  a shared change, stop that screen and say why in your report.
- Media: vendor every photo and logo into the repo (no hotlinks). New photos go in `overlay/showcase/src/media/` named
  `sNN-what.jpg` (resized to at most 1600px on the long side, quality ~80); logos in `media/logos/<slug>.svg`
  (simple-icons 13.21.0; skip if the file already exists). Put each credit (author, source URL, licence) under a
  "## Credits" heading appended to your batch's cards-X.md; the lead merges them into CREDITS.md.
- No lake, valley or mountain-lake photo (lake.jpg, valley.jpg, peak.jpg, fig-thumb.jpg) anywhere: they repeat
  across screens. Every screen's photos are its own.

## The owner's rules for these builds
1. **One rule, planted everywhere it would really recur** (owner, 2026-11-05): every row, every icon beside text,
   every number column, at least three instances spread across the card, so taking plumber's fix visibly changes the
   whole card, not one pixel in one corner. Rules that are a pixel by nature (#2, #37, #38, #39) repeat the same way;
   the stage's camera zooms into one instance.
2. **Nothing else for plumber to find.** Scoped to the example, plumber finds only the screen's own rule, before the
   fix; and nothing after it.
3. **No plumber marks painted into the component.** Some comps drew red pills or hatching ("−8px · all slid"): those
   are plumber's overlay, drawn by the stage from `.measure`; leave them out of the markup.
4. Use the showcase's tokens and pieces only (theme.css; hairlines are `border-*-hairline`, `hairline-none`,
   `w-hairline`/`h-hairline`). Product names and colours as drawn in the comp (approved).
5. Copy follows plain words (no internal names); the lesson's habit is one sentence a designer would say.

## Prove each screen
The showcase dev server is already running at http://127.0.0.1:4312. Never start or stop a server.
From overlay/showcase:
- `node scripts/screen.mjs NN` and `DPR=2 node scripts/screen.mjs NN`: only the screen's rule, with ×3 or more.
  (Hands-on screens print "plumber never answered" on a static read; that's expected. Their proof is the record.)
- `node scripts/screen.mjs NN --record <dir in your scratchpad>`: must print "Asked again, plumber finds nothing."
  Look at the contact sheet it writes.
- Look at a 2× screenshot of the built screen next to its comp; fix what falls short.
Memory is tight (16 GB, several builders): one browser at a time, close it after, no parallel checks.

## Report
Don't commit. Final report under 200 words: per screen, the file, the instance count plumber found, the
asked-again result, and anything not done or unsure. Mark anything you didn't run as not run.

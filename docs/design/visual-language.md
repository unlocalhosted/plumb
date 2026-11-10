# The visual language: toys

Status: proposed, 2026-11-10. The living system is the site's design section (`web/`, run `npx next dev web`, open `/design`), which is drawn with it.
How things behave, speak and are laid out is in `interaction-principles.md`, beside this page.
This page is the source for anything drawn in React Plumber: icons, marks on the page, controls, bars, empty states,
illustrations. If a new piece can't be explained by this page, the page is changed first, then the piece is drawn.

## The idea

React Plumber looks like a box of well-made toys. Each piece is a solid thing in a clear colour that you could pick up.
It is cheerful without being silly, and every part of it means something.

The owner's words for the bar: "whimsy, joyful, delightful", "every icon should be a piece of craft, no cheapness and
shortcut", "think about what every single thing represents". What it is not: "boring gray".

Where it came from: the pieces that fly out when a fix lands (a hatched green square for padding, purple stripes for a
gap, an orange dotted circle for margin). Those were the first toys. This page makes the rest of the product match
them.

## The seven rules

1. **One body, one hue.** A piece is one solid shape you could cut out of card. A second hue appears only when it is a
   second thing: the sun in an image, the knob on a slider, the online dot on an avatar.
2. **Details are cut out or drawn on.** A hole in the body shows the ground (`--pl-cut`). A mark on it is the hue's
   `-on` colour. Never a pale fill with an outline around it: that is a wireframe, not a toy.
3. **It says what the thing does, not what it looks like in a wireframe.** A switch is on. A tag has a hole for its
   string. An input has a caret waiting. A toast is already timing out. A tooltip points at the thing it is about.
4. **It reads at 16.** Drawn on a 24 grid; nothing finer than 1.5 for a body or a line on paper; four parts at most.
   Icons inside an editor are glyphs, drawn with a 1px pen (see Colour, below).
   not finished.
5. **A pattern only ever means space.** Hatched is padding. Dotted is margin. Striped is a gap. Nothing else gets a
   pattern, so the three are never diluted.
6. **No stock faces, no stand-ins.** A smiley, a generic speech bubble, a literal pun: these are shortcuts. The wit, when
   there is any, comes from the thing itself (the key is pressed down, the fourth block has wrapped below).
7. **Pale is for what is not there.** The unfilled part of a progress ring, the tabs behind the front one, a cast
   shadow, a skeleton. A thing that is there is solid.

## Colour

The hues are the overlay's own (`overlay/src/tokens.css`). Each has three values: the hue, its soft (pale), its ink
(dark).

| Hue | Token | It is for |
|---|---|---|
| Mint | `--pl-mint` | padding; things that are on, done, saved, on your scale |
| Butter | `--pl-butter` | margin; warm objects (cards, keys, alerts, stars); a value typed by hand |
| Lilac | `--pl-lilac` | gap; names, text, navigation, menus |
| Pink | `--pl-pink` | actions: what you press, what is in front, what is current |
| Sky | `--pl-sky` | measurements and type; containers you type into or look into |
| Coral | `--pl-coral` | only "this is wrong": off your scale, an error |

- **Hues are bodies first.** Each is tuned to be as clear and bright as it can be as a big solid shape. A hue that
  looks muddy as a large fill is wrong, whatever it does as a thin line (the first butter was an ochre chosen for
  hairlines; the owner: "muddy... dull... the excitement isn't there").
- **Butter is a true yellow, lettered in its own ink.** White vanishes on it, so on butter small marks are drawn in
  `--pl-butter-ink`; only a large shape (a card's picture) may be white. As a thin mark on paper, where the yellow
  itself would vanish, use `--pl-butter-line`.
- **White lettering on pink, sky and mint is bold.** They hold white at a little over 3:1, enough for bold words at
  14 and up, not for small regular text. Small regular text goes on paper, in ink.
- White (`#fff`) is the cut-out colour on a solid. On paper, a cut-out is the paper's own colour.
- Ink text (`--pl-ink`) may be used for plain words inside a piece (the lines of a list), never for a body.
- No greys in a piece. If something needs to be quiet, it is the hue's soft, and rule 7 says when that is allowed.
- **An editor card's rows use glyphs, not toys.** Inside an editor (the text card, a picker row) the property icons
  are the hairline glyphs (`overlay/src/glyphs.js`): ink, the pen's 1px line, no coloured tile, and letters typeset
  in the face rather than drawn as strokes. Font size: a small A and a big one. Line height: an A between rules above
  and below. Letter spacing: an A between rules either side. Weight: the same A thin and heavy. Toys stay for the
  page, the bar and the shelf, where a thing has to be seen. (Five rounds of tiles were rejected: distinct hues broke
  the hue table, all-sky tiles with hand-drawn letters looked crude and congested. The owner chose "set letters in a
  real font" and "drop the blue tile".)
- A piece takes its hue from what it is, by the table above, so the same thing is the same colour everywhere: padding
  is mint in an icon, in the box model, in a chip and in the burst.

## What may go on what (the check)

Colour pairings are not left to the eye. They are a list, and the list is checked.

- **The list:** `overlay/src/pairs.js`. Every pairing a part may use: what is on top, what is underneath, and what it
  is used for (any words, bold words, a shape). If a pairing isn't in the list, a part may not use it.
- **The check:** `npm run contrast` (`scripts/contrast.mjs`). It reads the token file, works out WCAG 2 contrast for
  every pair in the light and the dark scheme, and exits 1 if one falls short: 4.5 : 1 for any words, 3 : 1 for bold
  words (14px and up) and for a shape that carries meaning. The design site's colour page shows the same table.
- **Never write a colour on a hue by hand.** Words and marks on a hue use its `--pl-<hue>-on`. A hole in a body uses
  `--pl-cut`. Both change with the scheme: at night the bodies are pastels, so what goes on them is deep, not white.
  (This is what was missing when the colour page showed white words on a pale green chip in the dark scheme: white
  had been typed in, and nothing was there to object.)
- **What it can't see:** sizes and weights. It knows bold words on pink are fine and small regular ones are not; it
  doesn't know which a part set. A person still looks.

## Form

- **Grid:** 24 by 24. Bodies sit inside a 2 unit margin (so 20 by 20 at most), on whole or half units.
- **Corners:** soft. A full tile is 19 by 19 with a 5.5 radius. A pill has fully round ends. An inner block has a
  radius about a quarter of its short side. Nothing has a sharp corner unless sharpness is the point (the cursor, the
  error triangle).
- **Weight:** drawn-on lines are 1.8 to 2.6 with round ends and joins. A line thinner than 1.5 is not allowed.
- **Balance:** a piece fills its square by eye, not by number. Wide pieces (a button, a row) are 20.4 wide and about 11
  tall; tall pieces mirror that; round pieces have a 9.6 radius.
- **The tile:** when the subject is a letter or a symbol (type, heading, code, scroll), it is cut in white out of a
  solid tile of the right hue.
- **Depth:** a second body offset down and right, in ink at about 30%, and only where depth is the meaning (shadow, a
  pressed key).

## Type

Two faces, each with one job.

- **The toy face** (`--pl-round`): for what a toy would have printed on it: a title, a name, a button, a number.
  Never for a paragraph. The site ships Bricolage Grotesque for it, set heavy (`--pl-round-w`, 750 on the site): a
  face with its own hand, a little crooked. It is deliberately not a rounded face. Rounded and raised together is
  what every playful product looks like; here the toys and the soft blocks are the round things, and the lettering
  has character instead. The overlay, which may not fetch a font inside someone else's app, names the system's
  faces and keeps the default weight.
- **The reading face** (`--pl-sans`): for sentences. The site ships Instrument Sans: plain and exact.
- **Mono** is only for real code.
- Titles are big and few. A page has one headline (54), sections are 28, a name on a box is 24. A size that is only
  a point or two from its neighbour is not a step; remove one.
- Words on a solid hue are white, except on butter, which takes its own ink.

## A page

A page is a shelf of toys, not a document with boxes drawn around things.

- **White ground.** Nothing is cream. A part is told apart by being a solid thing, not by an outline.
- **No outlined cards.** A pale fill with a hairline around it is a wireframe (rule 2). A section is a heading and
  what is under it, with room around it. Where a ground is needed (a row of tiles, a table), it is the one inset
  tone, with no edge.
- **Things you can go to are boxes you can pick up:** solid in their hue, on a base, with their toy on a white
  plate and their name in the toy face. They rise when pointed at and go down when pressed, like a button.
- **What isn't there yet is pale and flat** (rule 7), with its toy faded. It doesn't pretend to be pressable.
- **The current place is pink**, because pink is "what is current". Other places are plain words until pointed at.
- **Every page opens the same way:** its toy, large, beside its name; one or two sentences under it.
- **Room.** 52 or more between sections; 16 to 18 between boxes. Crowding reads as cheap.

## The three patterns

| Space | Pattern | Hue | How it is drawn |
|---|---|---|---|
| Padding | diagonal hatch, 45° | mint | bars 2.1 wide every 4.6, clipped to the body, with a solid 2 edge |
| Margin | dots | butter | 1.25 radius dots placed one by one in a ring around the block, none behind it |
| Gap | stripes | lilac | four short rounded bars between the two blocks |

The same three, in the same hues, are used when the page itself is drawn on (Blueprint's bands, the clean-up marks).

## Sizes

Every piece is checked at three sizes before it is accepted: 44 (a hero, an empty state), 24 (a bar, a row), 16 (a
chip, inline with text). The sheet shows all three side by side.

## Motion

Pieces behave like objects with a little weight.

- **Picked up:** pointed at, a piece tips a few degrees and grows about 14%, on the pop spring (`--pl-spring-pop`).
  Small copies lean the other way.
- **Arrives:** it pops in from 92% (`.pl-pop`).
- **Lands:** when something is written, pieces click in one after another, not all at once.
- **Numbers roll**, they don't swap.
- Under reduced motion nothing moves; states change at once.

## Words with pictures

Pictures are learnt, so the words are always one hover away.

- Pointing at a piece gives its **name** (one or two words) on a small dark label above it.
- Pointing at a bar or a row gives the **sentence and the place** under it: what is wrong, in plain words, and where
  ("This dialog's shadow isn't one of your theme's shadows. Dialog.jsx:17 · 1 place").
- The same words show on keyboard focus.
- At rest there are no labels. A picture that needs a permanent label is not finished.

## How other parts inherit this

| Part | What it takes |
|---|---|
| Icons | everything above |
| Pills, tags, chips | the hue table; a chip's icon is the property's toy |
| Buttons | pink is the action; a key cap sits on the button; a soft block (`overlay/src/soft.js`): it squashes onto its side and springs back as one body, by an amount sized to it |
| The fix bar | one job at a time. One place: the property's toy, a headline saying what is hard-coded in plain words ("16 tags have a hard-coded border radius"), a detail with the value (coral, the only colour) and the tokens it should be; where you are in the list; Clean up all. The choice is made on the element, never in the bar. Clean up: the pass in hand as the headline, the four passes as toys (done ticked, coming grey), Apply and Stop; then one line of what changed and Undo all |
| Marks on the page | the three patterns in their hues; coral only for "off your scale" |
| Step controls | each step drawn as what it makes; the current value as a notch between steps |
| Empty, loading, error states | a 44 toy and one sentence |
| Surfaces | paper for cards and bars; the dark scheme is warm graphite, not black |

## Adding a piece: the checklist

1. Say in one sentence what the thing does. That sentence is its caption, and the drawing has to show it.
2. Pick its hue from the table by what it is, not by what looks nice next to its neighbours.
3. Draw one body. Add at most three details, cut out or drawn on.
4. Look at it at 16. If two parts merge, remove one.
5. Put it beside the others on the sheet. If it looks like a neighbour, change the silhouette, not the colour.
6. Check it in the dark scheme.
7. Ask: is any part a shortcut (a face, a stand-in, a pale outline)? If yes, start again from step 1.

## What is still open

- The set lives on the review sheet only. The overlay still uses the grey line icons (`BLOCK_ICONS`, the family glyphs,
  the words card's and the editor's private sets).
- Breadcrumb, pagination, skeleton and label are the weakest on the sheet.
- The overlay's own cards still set their titles in the plain face. `--pl-round` is in the token file and used by the
  site and the toy button only.

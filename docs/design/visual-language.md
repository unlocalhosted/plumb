# The visual language: toys

Status: proposed, 2026-11-10. The living sheet is `overlay/demo/icons.html` (run the overlay demo, open `/icons.html`).
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
2. **Details are cut out or drawn on.** White for a hole in the body. The hue's own ink (its dark shade) for a mark on
   it. Never a pale fill with an outline around it: that is a wireframe, not a toy.
3. **It says what the thing does, not what it looks like in a wireframe.** A switch is on. A tag has a hole for its
   string. An input has a caret waiting. A toast is already timing out. A tooltip points at the thing it is about.
4. **It reads at 16.** Drawn on a 24 grid; nothing finer than 1.5; four parts at most. If it only works large, it is
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

- White (`#fff`) is the cut-out colour on a solid. On paper, a cut-out is the paper's own colour.
- Ink text (`--pl-ink`) may be used for plain words inside a piece (the lines of a list), never for a body.
- No greys in a piece. If something needs to be quiet, it is the hue's soft, and rule 7 says when that is allowed.
- A piece takes its hue from what it is, by the table above, so the same thing is the same colour everywhere: padding
  is mint in an icon, in the box model, in a chip and in the burst.

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
| Buttons | pink is the action; a key cap sits on the button; pressed scales to 97% |
| The fix bar | the property's toy, the class, "on a", the element's toy; words on hover |
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
- The dark scheme's lifted surfaces are a trial in the comps, not yet in `tokens.css`.

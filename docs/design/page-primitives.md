# The project page's primitives (onboarding layer 3)

Status: approved by the owner, 2026-11-04 ("Approve all"), and in tokens.css, motion.js, scale-marks.js and the design
system's Foundations pages. The review sheet is overlay/demo/page-primitives.html (its "Today" column is the day
colours before the re-step).

The page is what `npx plumber` opens (docs/design/onboarding.md, "The page"). You read it once, closely, and come back
after fixing things. It's numbers and drawings more than prose, and every colour on it means something about your code.
Its parts so far are the page frame (overlay/src/project-page.js) and Gravity. Next come the causes, set up, show me
on my page, and progress with charts. This layer settles what all of them stand on, so none of them invents its own.

## What the page already has

Most foundations are shared with the overlay and stay as they are (overlay/demo/system.html, Foundations):
- **Surfaces:** desk (`--pl-desk`) under paper (`--pl-paper`) under inset (`--pl-paper-2`); ink in three steps.
- **Type:** six page steps: display 40/46, title 20/28, body 16/26, small 14/22, meta 13/20, figure 32/36.
- **Space:** the 4-based ladder, plus four page steps (32, 48, 64, 96) and the 24px card inset.
- **Shape and depth:** the card radius (12px) and card shadow; nothing else lifts.
- **Meaning colours:** mint on your scale, butter your size typed by hand, coral not on your scale, sky what you
  point at, pink what you can do, lilac names.

## Problems

1. **Two meaning colours can't be told apart.** By day, butter and coral are ΔE 3.4 apart for deuteranopes (the
   target is 8) and 14.5 with full colour vision (the floor is 15). Gravity's dots are mostly those two colours, so the
   page's hero drawing loses its main distinction for about 1 in 16 men. Night separates fine (8.7).
   Proof: `node validate_palette.js "#1f9e64,#bd8500,#e5503f" --mode light --surface "#fdfcf8" --pairs all`
   (the dataviz skill's validator).
2. **Motion lives inside Gravity.** Its two springs (settle k 300 c 30; detent k 600 c 35), the 40ms stagger, the
   380ms step fade and the 600ms arrival are constants in gravity.js. The next parts need the same moments (the
   causes building in, a count dropping, a cause clearing) and would each pick their own numbers.
3. **The page's width and breakpoint are repeated literals.** 1120px and 720px are written in project-page.js and
   gravity.js, and the narrow headline (30/36) is a literal.
4. **Nothing for charts.** The spec asks for charts (how your theme is used, progress over time). There are no rules
   for bars, values, gridlines or legends, and the dataviz rule that text never wears a data colour isn't written
   down. The headline already breaks it (the two big numbers in coral and mint).
5. **No celebration rule.** The spec wants clearing a cause to be celebrated. Without a rule, it gets confetti.

## The system

### Colour: meaning needs two cues
- Every meaning on the page is carried by colour **and** a second cue: a shape, a word, or a place. Never colour alone.
- On drawings, the three code meanings get shapes: on your scale is a filled disc, your size typed by hand is a ring,
  not on your scale is a filled square.
- **Decision for the owner:** re-step the three day colours (proposal: mint `#1a9460`, butter `#d19a00`, coral
  `#bf3a1e`; worst pair ΔE 7.7 for deuteranopes, legal with the shapes as the second cue, and 21.4 with full colour
  vision). This changes them everywhere the overlay uses them. The cost is butter at 2.45:1 on paper, which the
  shapes and the table view cover. Night stays as it is: it separates, and
  its only miss is the validator's lightness band, which no yellow can meet without turning brown.
- Text never wears a data colour, with one exception: the headline's two big numbers, at display size, and only
  where they pass 3:1 on the desk. Today mint doesn't (2.87:1); the proposed `#1a9460` does (3.23:1), and coral goes
  from 3.17 to 4.59. Everywhere else a coloured mark sits beside text in ink.

### Layout
- `--pl-page-max: 1120px`: the page's width. Prose inside it keeps to 60ch.
- One breakpoint, 720px (CSS can't read a variable in a media query, so it's written once per stylesheet, as this
  number). Below it: gutters drop from 32 to 16, every page space drops one step, and the headline takes
  `--pl-page-display-narrow: 600 30px/36px`.

### Depth
- Two levels: the desk and a card on it. The sticky top bar isn't lifted: it's the paper at 88% with a blur and a
  hairline rule. Hovering never lifts a card.

### Motion
New tokens:
- `--pl-stagger: 40ms`: the gap between things arriving in sequence. A sequence never runs past 400ms, so long
  lists share the time instead.
- `--pl-dur-build: 380ms`: one part fading in as the page builds.
- `--pl-dur-arrive: 600ms`: a drawing's arrival, once per visit.

Shared from one module (`overlay/src/motion.js`, to be written):
- The two physics springs, settle (k 300, c 30) and detent (k 600, c 35). Physics springs are only for marks you can
  pull or that fall into place; everything else uses the CSS springs already in tokens.css.

Rules:
- A changing number always rolls (scale-marks.js `rollCount`), never jumps.
- **Clearing a cause:** its count rolls to 0, its mark springs once (`--pl-spring-pop`) and turns mint, and the
  page's total rolls down. That's all: under 600ms, once, no confetti, no sound.
- **Reduced motion:** no drift, no fall, no stagger, no springs; fades of 120ms or less stay; numbers change at once.

### Charts
- One question per chart, and the title is the answer ("Three sizes carry your app"), like the headline.
- Bars are 12px thick (`--pl-chart-bar`), square at the baseline with `--pl-radius-mark` at the value end, from a zero
  baseline. Values sit at the bar's end, in ink, tabular.
- Gridlines only when values aren't labelled: `--pl-line` in `--pl-rule`, solid, at most 4.
- One series has no legend; two or more always have one. Labels are `--pl-page-meta` in `--pl-ink-2`.
- Colour by meaning only (mint on your scale, butter typed by hand, coral not on your scale, `--pl-ink-3` outline for
  a step nobody uses). No decorative series colours. A fourth meaning gets a new shape and word, not a new hue.
- Every chart has a hover readout (the same as Gravity's) and a table for screen readers.
- Log scale only for sizes in pixels, as Gravity does; counts are linear.

## What review settles

1. The day mint, butter and coral (the decision above).
2. The shapes for the three code meanings.
3. The new tokens: `--pl-page-max`, `--pl-page-display-narrow`, `--pl-stagger`, `--pl-dur-build`, `--pl-dur-arrive`,
   `--pl-chart-bar`, and motion.js for the two springs.

After approval: the tokens go into tokens.css, project-page.js and gravity.js switch to them, the design system's
Foundations pages gain the page rules, and layer 4 starts.

---
name: craft-film
description: Make the film for the next craft lesson (overlay/showcase /film/N), from picking the rule to the finished 1080p video on the owner's Desktop. Covers the script the owner reads before any code, the one-property change card, the demo-left layout, the three type levels, the motion on the words and the brand, the closing line, and what must never be taken off screen. Use whenever a craft rule gets a film, a film's words or layout change, or the owner says "do one more".
---

# Making a lesson film

A lesson film is a 30 to 40 second React Plumber marketing piece about one craft rule: a real component goes wrong,
plumber shows why, plumber fixes it with one property, and the film closes on React Plumber's line. Films 3
(optical overshoot) and 37 (never land on half pixels) are the current bar: docs/media/film-03-optical-overshoot.mp4
and docs/media/film-37-never-land-on-half-pixels.mp4.

This skill is the order of work and the owner's taste for films. Two other skills hold the rest, and are not repeated
here:

- **craft-rule** §3½ and §3⅝: the stage, the four acts (fault, measure, how the fix works, payoff) and plumber's marks.
- **film-story-review** and **film-camera-review**: the two reviews every draft passes before the final render.

## The order of work

1. **Pick the rule.** One the owner would not call generic: a hidden gem a senior would tell a junior (craft-rule §0),
   whose screen already exists and passes (one finding, nothing after the fix).
2. **Write the script and show it to the owner. No code before their OK.** One line per moment, in the words you would
   say out loud to a friend. Show it as plain text in the chat, all lines in order. See "The words" below.
3. **Write the change card's one idea:** the single property at fault and the single property that fixes it.
4. **Put both in the screen's film spec**, in `overlay/showcase/src/principles/screens/<NN>-*.jsx`:
   ```js
   Example.film = {
     ...,
     // the words on screen, approved by the owner <date>
     teach: { fault: 'translate: 0 -50%', fix: 'margin-block: auto' },
     script: [
       { at: 'rest', text: 'These words are *blurry*. The numbers above are sharp.' },
       { at: 'measure', text: '…' }, { at: 'dive', text: '…' }, { at: 'smear', text: '…' },
       { at: 'fix', text: '…' }, { at: 'payoff', text: '…' }, { at: 'end', text: '…' },
     ],
   };
   ```
   `at` is one of rest, measure, dive, smear, fix, payoff, end (Film.jsx fires each at its beat). `*word*` gets the
   underline: coral before the fix, mint from the fix on. A moment with no line is left out.
5. **Look at it running:** http://localhost:4313/film/N (the showcase server; start it with `~/.claude/bin/dev-server`,
   never by hand). Check a few stills against the rules below.
6. **Draft and the two reviews:** `node overlay/showcase/scripts/film-draft.mjs <N>`, then film-story-review and
   film-camera-review on docs/films/<NN>-draft/. Findings go in docs/films/<NN>-review.md.
7. **Render:** `node overlay/showcase/scripts/film-render.mjs <N> docs/media/film-<NN>-<slug>.mp4` (1920 × 1080,
   60 fps, a few minutes; run it in the background). Check the closing frame and one frame per act.
8. **Deliver:** copy the mp4 to ~/Desktop, send it with SendUserFile, commit the film files only (another session
   commits in the same worktree), and add the film to docs/journey.md.

## Rules from the owner's feedback

Each rule has its why: the owner's reason in their words, or *inferred* where they gave none. The comment under each
holds the date and what they said.

### The words

- **The script is written for a person, never from plumber's readings.** No raw numbers or class names as the story
  ("fills 70.8% of its box", "↕ -23.19"). A number appears only when a person can feel it ("Here that's 23.19 pixels.
  A screen only draws whole pixels.").
  Why: "fills 70.8% wtf does this mean to a normal person looking at the video? The idea was to show a problem and
  then show a solution."
  <!-- 2026-11-14: "before you write any code i want you to tell me what you are going to write" -->
- **The opening line says what a person sees, and the next ones say when it happens in real products.** Film 3 opens
  on perception ("These two shapes are the same size. But people see the circle as smaller."); film 37 says where the
  blur comes from ("Tooltips and dialogs are often centred by moving up half their height.").
  Why: the owner asked for exactly this on both scripts. *Inferred:* a lesson lands when the viewer recognises it from
  their own screens.
  <!-- 2026-11-14: "first script say that human dont percieve them same; in the second tell why things might get blurry and in what scenario" -->
- **About six lines, each one sentence of ten words or fewer; about 50 words in the whole film.**
  Why: "too much text, balance it out, make it half of it." *Inferred:* the viewer reads and watches at once, and the
  demo is the lesson, so the words must be short enough to leave the eyes on it.
  <!-- 2026-11-15: "too much text balance it out make it half of it" -->
- **The change card teaches one property: one fault, one fix** (`translate: 0 -50%` → `margin-block: auto`), never a
  block of CSS or a list of classes.
  Why: "writing this whole css isn't landing the point … there is no atomic teaching here."
  <!-- 2026-11-15: "the css fixes can be one sort of property or methodology" -->
- **The film closes on the owner's line**, centred, held about 5 seconds, then the logo: "React Plumber is a smart design
  engineer in your app, looking for 100+ design issues." (`CLOSING` in FilmPage.jsx). Never reword it beyond
  capitals and punctuation.
  Why: the owner wrote it.
  <!-- 2026-11-15: in the end say "react plumber is a smart design engineer in your app looking for 100+ design issues" -->

### The frame

- **Demo on the left, as tall as the stage; words, change card and switch in one column on the right, in that order,
  with the switch at the bottom.** Nothing in the column overlaps anything else.
  Why: the owner picked "Demo left, words right" from prototypes, and asked for the switch at the bottom when the card
  overlapped the demo.
  <!-- 2026-11-15: "Demo left, words right"; "this css is overlapping … also move the toggle to bottom" -->
- **The demo is the biggest thing in the frame. To give it emphasis, scale the whole demo up; never enlarge the type
  or marks inside it.**
  Why: "the demo should take emphasis"; "the container is still small, now you just increased the things inside."
  <!-- 2026-11-15: two messages, 06:00 and 06:02 -->
- **Words never share a row with the switch, and have room around them.**
  Why: "the text is cramped and fighting with the toggle."
  <!-- 2026-11-15 -->
- **Layout choices are shown as prototypes side by side before one is built.**
  Why: the owner answered a written layout question with "show me prototype"; they judge layout by seeing it.
  <!-- 2026-11-15: "show me prototype" -->

### Type

- **Three levels and no more:** the story line (30 px, regular weight, in the 1600 × 900 stage); the signature
  ("CRAFT № N" 15 px uppercase over the rule's name at 24 px); and chrome (the switch about 18 px, the brand 20 px
  with a 32 px mark). plumber's marks (pills, the change card) sit a step under the story line (`MARKS = 1.4`),
  never louder than it.
  Why: "the typography hierarchy in the frames, they are all over the place"; "isn't the descriptive text way too bold
  and large?"; "why is css typography and all so huge."
  <!-- 2026-11-15: three corrections, 05:1x to 05:56; settled on these values -->

### Motion

- **Each line's words arrive one by one** (a 5 px blur and a small rise, 460 ms each, 55 ms apart), and **the React
  Plumber mark nods once when the fix's burst lands.** Nothing else on the words or the brand moves.
  Why: the owner asked for "some micro interaction on text and react plumber" and said "nice" to this.
  <!-- 2026-11-15 -->

### Never take away

- **A change to the words or layout never removes plumber's marks:** the guardrail and measure animation, the pills,
  the change card with its check and burst, the switch. Change only what the owner named; anything else that would go
  away is asked first.
  Why: "why have you removed the guardrail animation, css property and all the existing thing, who asked you to do
  that." This rule existed as a memory and was still broken once; it is here so the next film reads it before
  touching Film.jsx.
  <!-- 2026-11-15 -->

## Feedback this skill came from (add to it every time)

- 2026-11-14 · "fills 70.8% wtf does this mean to a normal person" → the script comes first, in a person's words.
- 2026-11-14 · "first script say that humans don't perceive them the same; in the second tell why things blur and in
  what scenario" → open on perception, then the real-world case.
- 2026-11-15 · "make it half" → about six short lines.
- 2026-11-15 · typography "all over the place", "too bold and large", "so huge" → three type levels, marks under the
  story line.
- 2026-11-15 · "cramped and fighting with the toggle" → words get their own room.
- 2026-11-15 · "micro interaction on text and react plumber" → word-by-word arrival, one nod on the burst.
- 2026-11-15 · "who asked you to do that" (marks removed) → never take away.
- 2026-11-15 · "the demo should take emphasis", "the container is still small" → scale the demo, not its insides.
- 2026-11-15 · "Demo left, words right"; "css is overlapping … move the toggle to bottom" → the column layout.
- 2026-11-15 · "no atomic teaching here" → one property in the change card.
- 2026-11-15 · the closing line, in the owner's words.

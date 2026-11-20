# Effects as primitives

Written 2026-11-20, after the owner shared libraries.dev ([references](../references.md)): "applied and composed in
variety of ways and can also be used individually but again the taste lies where you put it with what motion and all".

## The idea

Each effect is a primitive with one job in an interaction and one thing it tells a person. A suggestion is a
composition of primitives, at most one per job, and the taste is in three choices: which job the effect does, what it
means at this moment, and the motion it moves with. The effects come from the npm packages behind libraries.dev (all
MIT): `metal-fx`, `border-beam`, `liquid-gooey`, `distortion-waves`, `thinking-orbs`, `img-fx`. Our own builds (the
pour, the arrow that leads, the rolling words, the sheen) sit in the same slots.

## The five jobs

| Job | What it is | From libraries.dev | Ours already |
|---|---|---|---|
| **Material** | what the thing is made of, at rest | metal (chromatic, silver, gold) | the product's flat fill |
| **Edge** | what lives on its border | border beam (rotate, pulse) | — |
| **Response** | how it answers the hand | metal's cursor bend; goo's morph and bend | the pour; the sink onto the lip |
| **Hand-off** | how the press carries into what comes next | distortion wave from the touched button | — |
| **Wait** | what shows work between press and result | thinking orbs; image mosaic | the arrow that leads; the rolling words |

Magnetic UI is an input (a phone's magnetometer), not something drawn, so it is out of scope for a web button. Its
web cousin, a button that leans toward the pointer, is a response.

## Meaning and fit of each effect

- **Metal** says *precious, made with care*. It belongs on one rare, valuable action (a lifetime purchase, an upgrade,
  a send button in a dark tool) and never on a row of buttons. It costs a WebGL canvas per element.
- **Border beam** says *alive right now*. It belongs on a state: an AI working, a field listening, a plan just
  recommended, and only while that state lasts. As permanent decoration on a buy button it reads as an ad.
- **Goo** says *these pieces are one substance*. It belongs where pieces split and join: a button opening into its
  actions, segments of a toggle, chips. A lone button has nothing to merge with.
- **Distortion wave** says *done, and here is the result*. It belongs at the end of a commitment that turns the
  screen into its result: confirm turning into the receipt.
- **Orbs** say *thinking, for an unknown time*. They belong on an AI wait. A known, short wait is better told in
  words.
- **Image mosaic** belongs only where an image is being made.

## Where the taste lives: the rules

1. **Meaning first.** An effect is used only when what it says is true of the moment.
2. **One loud thing per view.** At most one effect that moves on its own is visible at once. A response or a
   hand-off only moves because someone acted.
3. **Tied to an event.** Effects start from something (coming into view, a point, a press, a wait) and end. Nothing
   loops at rest.
4. **The product's motion.** Duration grows with size; the ease is the product's own; a hand-off is the one place a
   longer, larger motion belongs.
5. **The product's colour.** Metal is tinted toward the brand or left neutral, and a beam uses the brand's hues, not
   the rainbow, unless the brand is the rainbow.
6. **A still twin.** With reduced motion every effect has a still version that says the same thing.
7. **The surface.** The libraries.dev effects are tuned for dark surfaces (they are sold as effects for AI
   interfaces). On a light page against a saturated fill they vanish or go muddy: tried on crafting attention's buy
   button on 2026-11-20, the silver ring barely showed and the library stripped the button's lip to make room for it,
   and the beam was a faint smudge. They belong on dark, tool-like surfaces unless retuned.
8. **Cost.** At most one WebGL effect per view, with a flat fallback when it can't run.

## First builds: crafting attention's buy button

The moment: a first-time visitor buys lifetime access, once; the press opens checkout.

- **Lifetime in metal.** The material that says *precious* on the one rare purchase, tinted to the brand's purple or
  left silver, with the cursor bend as its response.
- **The press becomes checkout.** The distortion wave as the hand-off: the card pulls toward the button, then the wave
  carries it into "Opening checkout".
- **A beam while checkout opens.** The edge as the wait. It pulses only between the press and the next screen.

Each is judged like the four before it (pressed, abandoned, keyboard only, reduced motion, plumber reading the words)
and joins the recommendations page only if it passes.

## What happened when we built them (2026-11-20)

None of the three passed the look check on crafting attention's light pricing page, so none was shown. The wave also
belongs to the card, not the button: at button size its picture of the markup came out mangled, and its job is carrying
a whole view into the next. The builds are kept in `generator/playground/atoms/native/` (metal.jsx, beam.jsx,
wave.jsx) for a dark surface or a card-level hand-off.

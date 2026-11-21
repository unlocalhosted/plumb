# Procedural style for suggestions

Written 2026-11-21. The owner: "you just force the behaviour side and make … choice to other aspects", and the method:
"first identify conceptual gaps, then see how you can model those things via tooling, then solve this layer by layer."

## The root cause

The suggestions were built behaviour first. The pour, the wait and the glow were designed; the fill, the words, the
edge and the shadow were then filled in one at a time, by hand, with whatever made the behaviour visible: "the fill
mixed with 34% black", a black face so chrome would show, a library palette that drifted to orange, a lip shadow the
library stripped. None of those values came from a model of the product's style, and none was chosen together with the
others. A designer does the opposite: the states of a control are a set of pairings decided together, from the
product's own system, and motion only moves between them.

## The conceptual gaps

1. **No model of the product's style.** We read one element's paint (its fill, ink and lip), not the system behind it:
   which hue families the product has, how each one steps from light to dark, which ink it puts on which surface, how
   its shadows are built, its corner and type scales.
2. **No colour science for new shades.** A new shade was a mix with black, which muddies a colour: in a perceptual space,
   chroma has to fall as lightness moves toward the ends, the hue drifts in the darks and lights of real palettes, and a
   shade can fall out of the screen's gamut.
3. **No grammar of roles and states.** There was no shared idea of "the surface, the ink on it, its container, its
   edge" and of how a state changes them (pointed at, pressed, working, done). Material 3 and Radix both have one:
   Material's roles with their on-colours and state layers (a tint of the ink over the surface, at fixed opacities), and
   Radix's twelve steps per hue, each with a job (backgrounds, component states, borders, solids, text).
4. **No model of elevation.** A shadow was copied or dropped. Real shadows have a light direction, layers (a tight key
   shadow and a wide ambient one) and a tint taken from the surface they fall on; a pressed control loses height, so its
   shadow shrinks.
5. **No link from effects to the palette.** A glow, a beam or a metal ring took its colours from its own library, not
   from the product's families.
6. **No solver.** Nothing chose the set for a state against constraints (the words read, the states are told apart, the
   colours are one family) and ranked the options by how close they sit to the product's own pairings.
7. **No look at the set as a whole.** Contrast was checked; harmony, weight and the "one bright thing on the card" were
   judged after the behaviour was built, by eye, when they failed.

## A tool for each gap

| Gap | Tool (deterministic) | Built on |
|---|---|---|
| 1 Style model | **Style reader**: reads the product's tokens and rules into a model: hue families with their lightness steps, the ink-on-surface pairs it uses, its shadows parsed into light, layers and tint, its radius and type scales | the running page (computed styles), `culori` for colour (MIT) |
| 2 Colour science | **Shade engine**: a new shade for a family at a lightness, keeping the family's own chroma curve and hue drift, mapped into gamut | `culori` (OKLCH, gamut mapping), `@material/material-color-utilities` (HCT tonal palettes, Apache-2.0) |
| 3 Roles and states | **Role grammar**: surface, on-surface, container, edge, solid, glow; states as Material-style layers (the ink over the surface at set strengths), checked against the product's own hover and pressed if it has them | Material 3 roles and state layers; Radix's twelve-step jobs |
| 4 Elevation | **Shadow engine**: the product's own shadow recipe, re-drawn for any surface and height, tinted by the surface's hue | the style reader's parsed shadows |
| 5 Effects | **Effect palette**: an effect's colours drawn from the product's families (a beam from the brand family's light steps, a metal tinted toward it) | the shade engine |
| 6 Solver | **Pairing solver**: for each state of a suggestion, every candidate set from the model, kept if it passes (APCA contrast for the words' size and weight, 3:1 between states that must be told apart, one family), ranked by closeness to the product's own pairs; each choice carries its reason | the tools above; APCA for contrast |
| 7 The whole | **State sheet**: every state of a suggestion side by side, each value named with where it came from, then plumber judging each state | plumber's engine |

## Layers and their proofs

1. **The style model.** The style reader on crafting attention, in light and dark. Proof: a sheet of its families,
   steps, pairs and shadows that matches what a designer would say the product is.
2. **The shade engine and the role grammar.** Proof: for each family, the full set of roles and state layers, every
   one either a product token or a derived shade marked as such, and the derived ones sitting on the family's own curve.
3. **The shadow engine.** Proof: the product's shadow re-drawn at rest, pointed at and pressed, next to its own.
4. **The pairing solver and the state sheet.** Proof: the sheet for the shipped buy button reproduces what it ships;
   then sheets for the existing suggestions, with each of last time's hand choices replaced by the solver's, and the
   reason for each.
5. **Behaviour on approved sheets.** The pour, the arrow, the words, the sheen, metal and the beam are rebuilt to move
   only between the sheet's states; effects take their colours from the effect palette.
6. **The same on algorecall, crafting-ui and plumber.** This tests that the tools are general.

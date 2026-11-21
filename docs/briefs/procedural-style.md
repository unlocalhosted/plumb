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

## The colour techniques we adopt, from the tools designers use

The owner, 2026-11-21: use "the existing design tools like color pairing tools for oklch and complementary color tools …
and those techniques which designers already use". Each part of the colour work takes its method from one of them,
run as code, so a suggestion's colours come out the same way a designer would get them from the tool.

| Need | Tool designers use | Its technique, which we run |
|---|---|---|
| A full ramp from one brand colour, each step with a job | **Radix Colors custom palette** ([radix-ui.com/colors/custom](https://www.radix-ui.com/colors/custom), MIT source `generate-radix-colors.tsx`) | Match the brand colour to Radix's hand-tuned scales in OKLCH, transpose the nearest scale onto it, keep the brand colour as the solid step (9), derive its hover (10), limit the chroma of the text steps (11–12), and give each of the twelve steps its job: app backgrounds, component rest, hover and pressed, borders, the solid and its hover, low- and high-contrast text |
| Steps placed by contrast against the page | **Leonardo** (Adobe, [leonardocolor.io](https://leonardocolor.io), Apache-2.0 `@adobe/leonardo-contrast-colors`) | Ask for a colour of a hue at a target contrast ratio against the background (3:1 for a state that must be told apart, 4.5:1 for words) |
| Words that read on a surface | **APCA** (the contrast model behind WCAG 3 drafts, used by Huetone) | Lc targets by text size and weight; the readable ink is chosen, not assumed |
| A shade that stays on screen | **oklch.com** (Evil Martians) | Work in OKLCH, show what falls outside sRGB, and map it back by reducing chroma, the CSS Color 4 method (culori's `toGamut`) |
| Tones for states and roles | **Material Theme Builder** (`@material/material-color-utilities`) | HCT tonal palettes and the state layers: the ink laid over the surface at 8% when pointed at and 10% when pressed |
| A second colour that goes with the brand | **Adobe Color** harmony rules ([color.adobe.com](https://color.adobe.com)) | Analogous, complementary, split complementary and triad, taken on the artist's wheel (red, yellow, blue), which is what Adobe Color uses; OKLCH keeps the lightness and chroma so the pair carries equal weight |

The same holds beyond colour (the owner: "there are so many cool design tools already made by designers which solve so
many concerns, use those kind of approaches … for tackling various aspects"):

| Aspect | Tool designers use | Its technique |
|---|---|---|
| Shadows | **Josh W. Comeau's shadow palette generator** and **smoothshadows.com** | Layered shadows whose offsets and blurs grow together with height, one light direction for the whole page, the shadow tinted with the hue of the surface it falls on (never grey on colour) |
| Type scale | **typescale.com** and **Utopia** (utopia.fyi) | A modular ratio between sizes; fluid steps between a small and a large screen |
| Spacing | **Utopia** space scale | Space steps tied to the type scale, so space grows with the words |
| Easing | **cubic-bezier.com** and **easings.net** | Named curves with known character: ease-out for things arriving, ease-in for leaving, ease-in-out for moving across |
| Springs | **Apple's spring parameters** (response and damping, as in SwiftUI) and Motion's spring tool | A spring described by how long it takes and how much it bounces, not by stiffness numbers |
| Corners | the concentric-radius rule (Apple's design guidance) | An inner corner is the outer corner less the gap between them |

The product's own tokens come first: when a step the technique asks for already exists in the product (the reader finds
it within a just-noticeable difference), the token is used and named; otherwise the derived value is used and marked.

## Layers and their proofs

1. **The style model.** The style reader on crafting attention, in light and dark. Proof: a sheet of its families,
   steps, pairs and shadows that matches what a designer would say the product is.
2. **The shade engine and the role grammar**, on the techniques above. Proof: for the brand colour, its twelve steps
   and their jobs, its state layers and its harmony partners, every one either a product token or a derived value
   marked as such, beside the product's own ramp.
3. **The shadow engine.** Proof: the product's shadow re-drawn at rest, pointed at and pressed, next to its own.
4. **The pairing solver and the state sheet.** Proof: the sheet for the shipped buy button reproduces what it ships;
   then sheets for the existing suggestions, with each of last time's hand choices replaced by the solver's, and the
   reason for each.
5. **Behaviour on approved sheets.** The pour, the arrow, the words, the sheen, metal and the beam are rebuilt to move
   only between the sheet's states; effects take their colours from the effect palette.
6. **The same on algorecall, crafting-ui and plumber.** This tests that the tools are general.

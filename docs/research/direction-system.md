# The thinking behind a direction system, and how Plumber does it better

Written after driving Graphical's builder (docs/research/graphical-study.md) and the owner's reading of it
(2026-11-03): its styles map to *categories of product*. Jelly is learning and play (Duolingo, Brilliant), Paper is
reading (Medium), Canvas is developer tooling, Base is the neutral duotone default, and Alloy is a *material*
(glass, skeuomorphism). We don't copy their components or styles. We take the thinking and build something more
empowering and more adaptable.

## The underlying thinking

1. **A visual language follows from the product's job.** A learning app has to reward and invite (round, bright,
   pressable, bouncy). A reading app has to disappear behind the words (serif text, a 65-character measure, warm
   paper, quiet chrome). A developer tool has to be dense and exact (mono data, sharp corners, one signal colour on
   dark). The look isn't decoration; it's the category's job made visible.
2. **So a style is a bundle of decisions made together.** Typeface voice, colour personality, density, shape,
   material, motion and where colour is spent are chosen as one, which is why every Graphical style looks finished.
3. **Choices are offered only inside the bundle's taste.** The colour strip only holds hues in the style's band;
   the menus are short lists of good options. You can't make it ugly.
4. **Material is its own axis.** How surfaces and controls are *made* (flat, glass, tactile bevel, paper, outline)
   is separate from the category: Alloy is a material on a commerce app.

## Where Graphical stops, and where Plumber goes further

| Graphical | Plumber |
|---|---|
| You pick a style by how it looks | **Plumber reads what your product is first**: its routes, copy and components (charts and tables, long text, streaks and progress, carts and orders) and says which categories it is, with the evidence |
| One style at a time | **Categories blend**: a reading app with a tool inside it sits between Reading and Tool, and gets a coherent mix, not a switch |
| A style is one bundle | **Each bundle is open**: category sets the defaults for separate dimensions (voice, colour personality, density, shape, material, motion, colour spend, icons); you can change or *lock* any one ("keep my typeface") and the rest stays in taste |
| One look for the whole product | **Zones**: marketing pages, the app shell and the docs can each have their own direction, related by one palette and voice |
| A new theme | **From your DNA, at the scope you choose**: Keep (only consistency), Refine (move within reach of where you are), Redirect (a new category or material) |
| Taste is implicit | **Taste is explained**: every default names why ("Reading: 65-character measure and serif text: cognitive load"; "Play: big tap targets: Fitts"), using the laws table |
| Exports a theme | **Writes it into your code**: tokens plus one utility per role (primary action, surface, chip, field, nav item), traced as one step, undoable alone; then the passes move every place toward it |

## The model

- **Categories (ours)**: Tool, Reading, Learn & play, Commerce, Ledger (money and data, exact), Studio (expressive,
  creative), Base (neutral default). Each is a point in a space; a product is a blend of a few.
- **Dimensions each category sets**, each a short list of curated options, all lockable:
  voice (type pairing from free faces, plus the app's own), colour personality (a chroma and lightness band and a
  harmony rule; your hue generates the family inside it), neutrals (temperature), density, shape (sharp → pill),
  colour spend (where the brand colour goes: actions only → surfaces), material (flat, paper, glass, tactile, outline),
  motion (calm, snappy, bouncy), icons (style and weight).
- **Material reaches the code as role utilities**: `@utility action-primary { … }`, `surface`, `chip`, `field`,
  `nav-item`, written from the material × colour spend × shape, so a change of material rewrites the utilities, not
  every call site.
- **Typefaces**: a short, pre-tuned list of strong free faces per voice (rounded sans, text serif, grotesk, mono …)
  plus whatever the app already loads.

## What the builder must make you feel

You see your own product in a few candidate languages that fit what it is, each with its reasons; you blend and
steer them with a handful of controls that can't go wrong; and you leave with a direction that is written into your
code and that every later fix follows.

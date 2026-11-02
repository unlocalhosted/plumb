# Brief: shadow and motion recipes, sourced and packaged

Owner request (2026-11-02): React Plumber's element card (Alt+click → a card beside the element, values at rest, an
editor per value; see docs/design/prototypes/text-card.html "D" and element-cards.html) gets a Shadow ▸ and a
Motion ▸ field that drill into a dedicated editor: recipes at the top, a few physical dials below (shadow:
elevation, softness, light direction; motion: spring bounce/speed or easing/duration). The owner wants the recipes
to be good pre-baked ones brought in from existing libraries (they pointed at https://libraries.dev, "a really
great set of libraries"), and "a way to package these recipes so that we can find a suitable interface to bring
them in".

Decisions already made: recipes are named and live in the user's theme (CSS custom properties written once, used by
name); motion covers interaction states (hover/press/focus), enter/exit, and layout/morph; editors drill in from the
card's fields; tuning is by a few physical dials.

## What to deliver (files in this repo; no UI, no overlay code)

1. `docs/research/recipes.md`
   - What libraries.dev is and which of the libraries it lists (and other well-regarded sources) publish shadow or
     motion recipes worth bringing in. For each source: what it offers (with concrete values), its licence, and
     whether we may copy the values into a user's theme with attribution. Cover at least: libraries.dev's own
     listings, Josh W. Comeau's shadow palette approach (layered, light-source-consistent shadows), Material 3
     elevation and motion tokens (easing/duration), Apple HIG motion guidance, Open Props (shadows, easings), Radix
     Themes / Radix Colors shadows, Tailwind's shadow scale, Framer Motion / Motion spring presets, react-spring
     presets, GSAP eases, animations.dev / Emil Kowalski's curves (Vaul, Sonner), and anything better you find.
   - Which recipes are worth a first pack: about 6–8 shadows (an elevation ladder plus a few special ones: inset,
     focus ring glow, colored), and motion recipes per kind: interaction states (hover lift, press, focus), enter and
     exit (fade-rise, pop from 0.95, origin-aware popover, toast), layout/morph (height, reorder, shared element),
     plus the easing curves and spring configs they use. Every value concrete, every one with its source and licence.
   - How each kind is applied in a React + Tailwind v4 codebase without a motion library (CSS transitions,
     @keyframes, @starting-style, view transitions) and with one (motion/react props), and which need a library.
2. `docs/research/recipe-pack.schema.json` and `docs/research/recipe-pack.md`: a package format for recipes that
   any source can be converted into. Per recipe: id, name (plain words), kind (shadow | motion.state |
   motion.enter-exit | motion.layout), source { library, url, licence, attribution }, the theme tokens it writes
   (name → value, light and dark where they differ), how it is applied (CSS class / CSS rule / motion props),
   requirements (none | motion library), its dials (name, range, default, and how each dial maps onto the tokens,
   as formulas), and a short preview description. Include how a pack declares its own version and licence, and how
   two packs' token names avoid colliding.
3. `docs/research/packs/first.json`: the first pack in that format with the recipes chosen in (1), validated against
   the schema (show the validation command and its output).

## Rules
- Facts with sources: every value and every licence claim has a URL. Mark anything not verified.
- Plain words in names (people see "Raised", "Pop in", not internal names).
- Don't modify overlay/, src/, e2e/, site/. Don't commit. Write only the files above.
- Finish with a short summary of what you found and the decisions the owner must make.

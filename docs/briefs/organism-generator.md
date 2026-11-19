# Brief: an organism generator that learns from other people's taste and draws in ours

Status: DRAFT for owner sign-off, 2026-11-20. Nothing is built, and no code is written until it is signed off.
It builds on [engine-foundations.md](engine-foundations.md), which plans the layout generator (F7, "the engine is a
function you can call on a candidate", layer 6). That brief leaves open how candidates are made. This one answers it.

## The ask

The owner, 2026-11-20:

- "imagine we have a organism for a certain use case and we want to kind of have a procedural / organism generator
  kind of approach where i can see a certain card and something rendered in different approaches and ways obviously
  with certain way of thinking behind it ? like how in games they create procedural stages like dead cells"
- "go through a long list of component libraries capture their tasteful component and like encode them somehow
  through which we can apply our component * (encoded representation) => new component. this * function would find
  the similar components designs"
- "make sure the taste is captured and it belongs to our design system and doesn't generate like something from
  material ui"

Pick one card (an organism) in your app. Plumber shows it built several different ways. Each variant is drawn with
your own system, each says why it is built the way it is, and none of them looks like a stock component library.

## The idea in one paragraph

Dead Cells doesn't make levels out of noise. People design the rooms and a graph of what a level must contain, and
the generator only arranges the rooms to fill the graph, under rules, from a seed. We do the same. The "rooms" are
design decisions captured from good components across many products, stored as **grammar**, which describes how a
component is organised and never what it looks like. The generator matches your card to similar grammars, maps your
content onto them, and translates every decision into **our dialect**: the toy language, our tokens, our pairings.
Then the judge throws out anything that breaks our rules or looks generic. What you see is a small grid of
variants, each labelled with its recipe.

## Terminology

Use these words in code, docs and the UI, with these meanings only.

| Word | What it means |
|---|---|
| **Organism** | A finished component made of smaller parts, with one purpose: a pricing card, a settings row, an empty state. The generator works on one organism at a time. |
| **Job** | One thing the organism has to do for the person: say what it is (*identity*), say what it costs (*price*), make the case (*proof*), get the click (*action*), say how things stand (*status*), show where you are (*position*). Jobs come from a fixed list (below). |
| **Job graph** | An organism's jobs and the order the person needs them in. Two organisms with the same job graph are the same kind of thing, however different they look. |
| **Slot** | The place in a layout where one job is done. Your plan name fills the identity slot. |
| **Molecule** | One authored way to do a job in a slot: a price as a big number, a price with a strikethrough, proof as a checklist, proof as one quote. |
| **Grammar** | How an organism is organised, written without any look: structure, hierarchy, emphasis, rhythm, grouping, density, and its move. Grammar is portable between design systems. |
| **Move** | The one deliberate decision that makes a reference good, in a sentence a designer would say: "recommended is shown by making it the one solid card, not by adding a badge". Every specimen has exactly one. |
| **Specimen** | One captured reference: its job graph, grammar, move, a screenshot, where it came from, and why it was kept. |
| **Shelf** | All the specimens. Our own organisms are on it too, marked *house*. |
| **Dialect** | How our system says things: the toy visual language, `--pl-*` tokens, `pairs.js`, the type steps, the spacing scale. Every look in a variant comes from the dialect. |
| **Translation table** | The written list that turns each grammar decision ("emphasise by lifting", "group with a border") into the way our dialect expresses it. A decision with no row cannot be used. |
| **Axes** | The knobs a variant is placed on: *lead* (which job comes first), *density*, *shape* (stacked, split, row), *voice* (quiet, or one loud hue). |
| **Recipe** | What made a variant: seed, specimens, axis values, and the translations used. Printed under the variant and replayable. |
| **Seed** | A number. The same seed with the same shelf and the same card always gives the same variants. |
| **Tell** | A mark of a stock or generated look (an elevation shadow on every card, uppercase buttons, a divider under every row). The existing `tells` pack holds 17 of these for generated screens; the generator adds the stock-library ones. |
| **Generic pile** | Plain renders of stock libraries (MUI, Bootstrap, default shadcn, Chakra), kept only to measure how far a variant is from them. |
| **Round trip** | Encode a specimen, then rebuild it from its grammar with its own original look. If the rebuild doesn't read as the original, the grammar lost something. |

### The fixed job list

`identity, price, proof, action, secondary-action, status, position, value, media, meta, input, navigation, help,
dismiss`. A new job is added only with a sentence on what the person needs it for and two specimens that have it.
The list stays short on purpose. Matching depends on everyone tagging the same thing the same way.

## The specimen format

All values are relative, so a specimen never carries pixels, hex codes or font names.

```
specimen: pricing-card/stripe-2026-11
jobs:       identity, price, proof, action, status
order:      status → identity → price → proof → action
structure:  stack[ status, identity, price, divider, proof(list), action ]
hierarchy:  price 1, identity 2, action 3, proof 4          (loudest first)
emphasis:   price  = type +3 steps, weight heavy
            action = filled, the only hue in the organism
            proof  = quieter, type −1 step
rhythm:     inside a group 1×, between groups 2.5×           (ratios of the base gap)
grouping:   by space, one divider
container:  surface, no edge, radius medium
density:    airy
move:       "recommended is shown by lifting this card, not by colouring it"
kept because: the price is the first thing read, and the list never competes with it   (owner, 2026-11-xx)
source:     stripe.com/pricing, captured 2026-11-xx, screenshot specimens/pricing-card/stripe.png
```

What each field is allowed to hold:

- **Sizes** as steps on a scale (+3, −1), never pixels.
- **Spacing** as ratios of the organism's base gap, never pixels.
- **Colour** as roles (*the action*, *quieter*, *the only hue*), never values.
- **Shape** as a few named words (*none, small, medium, round*), never a radius.
- **Type** as *display / reading / mono* and a weight word, never a font name.

## The generator: `card * shelf → variants`

1. **Read the card.** Take the picked organism from the live page (the scene graph's instance level), label its
   jobs, and write its own grammar the same way a specimen is written. That gives the job graph to match against.
2. **Find.** Rank specimens by job match first (does it do the same jobs?), then by structure distance, then by
   embedding similarity of screenshot and move. Keep the top dozen. House specimens get a fixed bonus.
3. **Map.** Pair your slots with each specimen's slots by job. Your extra jobs are placed by the rules for that job.
   A specimen job you don't have is dropped. If fewer than half of your jobs map, drop the specimen.
4. **Mix.** Each variant takes one specimen's structure. It may take emphasis or rhythm from a second one, and it
   is placed on the axes by the seed. At most two specimens per variant.
5. **Translate.** Run every decision through the translation table into our dialect. Snap steps and ratios to our
   scales. A decision with no row ends the variant.
6. **Build off screen** with your app's own components and styles (the open problem in engine-foundations §6).
7. **Judge.** Run `judge(snapshot, packs)` with the house rules, the craft rules, the tells, and the generic
   distance. Anything that fails is dropped, not shown with a warning.
8. **Show** the best three to six, each with its recipe in plain words: "Price first, compact, split. Structure from
   Stripe's pricing card, emphasis from Linear's plan card. Recommended is the one solid card."

Your picks feed back in. *Keep* raises a specimen's weight for this kind of organism, and *never* lowers it.

## The translation table (first rows)

The table comes from [visual-language.md](../design/visual-language.md). A row changes only when that page changes
first.

| Grammar decision | How stock libraries draw it | How we draw it |
|---|---|---|
| this one is recommended / chosen | shadow, lifted, "Popular" badge | it is the one solid block in its hue (`--pl-<hue>-block`); the others stay on paper |
| group these | outlined card, border | a shared surface with no edge, or space alone |
| separate these rows | a divider under every row | space; one divider at most, only between groups |
| quieter / secondary | grey text | the hue's soft or ink at a lower step; never grey in a piece |
| the action | filled primary button, often blue | pink, the soft block button, squashes when pressed |
| title, name, number | bold sans | the toy face (`--pl-round`), heavy |
| sentence | body text | the reading face (`--pl-sans`) |
| status: wrong | red | coral, used only for this |
| status: done / on | green | mint |
| depth | elevation scale | none, unless depth is the meaning (a pressed key) |
| decorative icon | icon in a tinted square | the job's toy, or nothing |
| space as decoration | patterned backgrounds | never; a pattern only means padding, margin or gap |

## Heuristics: what keeps it scalable

1. **Match on jobs, never on looks.** The shelf is indexed by job graph. A new organism kind needs no new code, only
   specimens with that job graph. A pricing card and a plan picker with the same jobs are the same problem.
2. **Grammar is relative, the dialect is absolute.** Specimens hold steps, ratios and roles. Only the translation
   step knows our values. So the same shelf works for any project's design system. Each project brings its own
   dialect, and the shelf is shared.
3. **One move per specimen.** A specimen with no nameable move is not kept. One with three moves becomes three
   specimens. This keeps the shelf about taste and stops it filling up with averages.
4. **Specimens are data, the generator is small.** Adding taste means adding rows, not code. The generator stays
   a few hundred lines that find, map, mix, translate and judge.
5. **The judge is the engine's judge.** No second set of rules for candidates (engine-foundations: "no second engine
   for the generator"). If the generator's taste and the page's rules ever disagree, the page's rules win.
6. **Seeded and replayable.** Every variant can be rebuilt from its recipe. A bad variant is a bug you can reopen,
   not a fluke.
7. **Grow by kind.** Each organism kind gets about 20 specimens before it is offered. Thin kinds are hidden, not
   shown half-working.

## Heuristics: what makes it fool-proof

1. **No absolute value is ever stored.** Capture throws away every absolute value before a specimen is saved. A specimen
   holding a pixel, a hex code or a font name fails validation. This rule is what keeps MUI out of our cards.
2. **No row, no decision.** If the translation table has no way to say something, the decision is dropped. To keep
   it, change the visual language first, then add the row. Nothing falls through to a default.
3. **The round trip gates every specimen.** Encode it, rebuild it with its own look, and compare with the original
   (embedding distance plus one person's look while the shelf is small). If it fails, the specimen doesn't go on the
   shelf, because the grammar is missing something.
4. **Closer to ours than to the generic pile.** Embed every variant. If it is nearer the generic pile than the house
   specimens, it is dropped.
5. **No tells.** The stock-library tells (elevation on every card, uppercase buttons, a divider under every row, a
   small uniform radius with a shadow, one blue primary, an icon in a tinted square) reject a variant outright.
6. **House rules are hard limits.** One primary action. Coral only for wrong. Every pairing from `pairs.js`
   (contrast is checked, not eyed). Type steps that are real steps. A variant that breaks one never reaches the grid.
7. **Taste is curated by a person.** A specimen enters only with the owner's (or a project owner's) *keep* and one
   line of why. Crawling fills the candidates, and a person fills the shelf.
8. **The blind mix.** Before a kind ships, shuffle generated variants in with hand-made house organisms. If the owner
   can pick out the generated ones, the kind isn't ready.
9. **Copy nothing.** A specimen holds decisions and a screenshot for our own comparison. No markup, no assets, no
   text from the source. Paid kits are checked for terms before anything is captured from them.

## Where specimens come from

- **Real products first** (Stripe, Linear, Vercel, Raycast and the like), because that's where taste is. Component
  libraries like shadcn and Radix are mostly neutral basics and go to the generic pile, not the shelf.
- **Capture:** render the page in a browser, take the organism's computed layout and styles, convert them to steps,
  ratios and roles (the same role reading plumber already does for clean-up), have a model label the jobs and draft
  the move, then a person keeps it or not.
- **Our own organisms** are captured the same way and marked *house*.

## Order

One layer at a time, each seen working before the next.

| # | Layer | What can be seen |
|---|---|---|
| 0 | Sign-off on this brief: words, job list, translation table | This page, agreed |
| 1 | The specimen format and its validator; 5 pricing cards written by hand | Five specimens that pass validation |
| 2 | The round trip on those 5 | Each rebuild beside its original; at least 4 of 5 read as the original |
| 3 | Capture from a live page to a draft specimen | 20 pricing-card specimens, each kept by the owner |
| 4 | Find and map for one card in a real app | For a crafting-ui card: the top specimens and how its slots map |
| 5 | Translate and build off screen | 6 variants of that card, drawn in our dialect |
| 6 | Judge and the generic distance | Before and after the filter: what was dropped and why |
| 7 | The grid with recipes, keep and never | The owner picks from it |

Layer 5 needs the off-screen build (engine-foundations layer 6). Layers 1–4 don't, and can start first.

## Decided here, and why (change any at sign-off)

- **Arrange authored taste rather than generate from nothing.** Generating from nothing comes out average, which is
  the stock look we are trying to avoid. Arranging authored pieces is why Dead Cells levels feel designed.
- **One move per specimen.** It forces each specimen to say why it is good, which is the part worth keeping.
- **Drop, don't warn.** The grid is for choosing, not for reviewing. A variant that breaks a rule wastes a look.
- **At most two specimens per variant.** More than two blends towards the average again.
- **Pricing cards first.** The jobs are clear, there are many good public examples, and the result is easy to judge.

## Not known

- Whether relative grammar keeps enough of the taste. The round trip (layer 2) is the test; the brief stands or
  falls on it.
- How far apart "generic" and "ours" are in embedding space, and whether a screenshot embedding (CLIP or similar)
  separates them better than the text model already on vm-agent. Neither is measured yet.
- How reliably a model labels jobs and drafts a move. Also unmeasured.
- How a candidate is built off screen faithfully with the app's own components and data (open in
  engine-foundations §6).
- Whether 20 specimens per kind is enough. A guess.

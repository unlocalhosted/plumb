# Brief: an organism generator that learns from other people's taste and draws in ours

Status: DRAFT for owner sign-off, 2026-11-20, second version after a review the same day (see **What the review
changed**). Nothing is built, and no code is written until it is signed off.
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
the generator only arranges the rooms to fill the graph, under rules, from a seed. Here the **rooms are our own
molecules**: authored in-house, in final form, in our look. What we learn from other products is **grammar**: how a
good organism is organised (which job leads, how parts group, size and space ratios) and its **move**, the one
deliberate decision that makes it good, stored as a named decision with several ways our system can say it. The
generator matches your card to similar grammars, fills their slots with our molecules, and expresses each move in
our dialect. Then the judge throws out anything that breaks our rules or is generic in its structure. What you see is a
small grid of variants, each labelled with its recipe.

## Terminology

Use these words in code, docs and the UI, with these meanings only.

| Word | What it means |
|---|---|
| **Organism** | A finished component made of smaller parts, with one purpose: a pricing card, a settings row, an empty state. The unit the generator works on. |
| **Siblings** | Other instances of the same organism shown beside it (the three plans in a pricing row). Some moves are about siblings; see *scope*. |
| **Job** | One thing the organism has to do for the person: say what it is (*identity*), say what it costs (*price*), make the case (*proof*), get the click (*action*). Jobs come from a fixed list (below). |
| **Job tree** | An organism's jobs, nested and counted: `card[ status?, identity, price, proof×3–6, action, secondary-action? ]`. Two organisms with overlapping job trees are the same problem, however different they look. |
| **Kind** | A human name for a family of job trees ("pricing card"), used to report coverage. Matching never uses kinds; it uses job overlap. |
| **Slot** | The place in a layout where one job is done. Your plan name fills the identity slot. |
| **Molecule** | One house-authored way to do a job, in final form: a price as a big number, proof as a checklist, proof as one quote. Molecules exist only in our dialect. They are the rooms. |
| **Grammar** | How an organism is organised, written without any look: job tree, order, nesting, hierarchy, size and space ratios, grouping, cardinality. Portable between design systems. |
| **Move** | The deliberate decision that makes a reference good, stored as a **move type** from a fixed vocabulary plus its arguments: `single-out(among: siblings, which: recommended)`, `lead-with(job: price)`, `prove-with(form: one-quote)`. Each specimen has one move and a sentence saying it in words. |
| **Scope** | Where a move applies: *organism* (inside the card) or *siblings* (the card among its siblings). A siblings move is used only when the picked card has siblings on the page. |
| **Expression** | One way our dialect can say a move type. A move type has several expressions, so twenty specimens with the same move type don't all come out the same. |
| **Specimen** | One captured reference: its grammar, move, a screenshot, a source sidecar, where it came from, and why it was kept. |
| **Source sidecar** | The specimen's original absolute values (sizes, colours, fonts), kept apart and read only by the round trip. The generator never reads it. |
| **Shelf** | All the specimens. Our own organisms are on it too, marked *house*. |
| **Dialect** | How a project's system says things. It has two layers: **house expressions**, written in roles ("the one solid block in the action hue", "space only, no edge"), and the **role map**, which turns roles into the project's tokens. Plumber's toy language is the first dialect. |
| **Translation table** | Rows from grammar decisions and move types to house expressions. Shared across projects, because it is written in roles. |
| **Descriptors** | Lead, density, shape, voice: values read off each candidate after it is built, used to choose a spread of variants. Nothing sets them. |
| **Recipe** | Everything that made a variant: seed, specimens, expressions chosen, and the pinned versions (see heuristic S6). Printed under the variant and replayable. |
| **Seed** | A number that picks among expressions and breaks ties. Same seed plus same pinned versions gives the same variants. |
| **Tell** | A mark of a stock or generated look (an elevation shadow on every card, uppercase buttons, a divider under every row). The existing `tells` pack holds 17 for generated screens; the generator adds the stock-library ones. |
| **Generic pile** | Plain stock-library organisms (MUI, Bootstrap, default shadcn, Chakra), captured as grammar like any specimen and used only to measure structural distance. |
| **Round trip** | Rebuild a specimen from its grammar plus its own source sidecar and compare with the original, slot by slot. Proves capture loses nothing. |
| **Dialect trip** | Build a specimen from its grammar plus our dialect, by hand or by the generator, and judge it. Proves the thing production does. |
| **Funnel** | The count of candidates at every step of a run and why each one left. Logged every run. |

### The fixed job list

`identity, price, proof, action, secondary-action, status, position, value, media, meta, input, navigation, help,
dismiss`. A new job is added only with a sentence on what the person needs it for and two specimens that have it.

Every job carries a **placement rule**, used when your card has a job the specimen doesn't:

| Job | Placed |
|---|---|
| status | first, beside or above identity |
| identity | before every job but status and media |
| media | first, or beside identity in a row shape |
| price, value | right after identity |
| proof, meta | after price or value, before actions |
| help | after the slot it explains |
| action, secondary-action | last, secondary after primary |
| dismiss | the top-trailing corner |
| position, navigation, input | where the job tree nests them; no default |

A job with no default whose specimen has no slot for it rules out that specimen.

## The specimen format

Sizes and spaces are ratios, never steps. A step count depends on a scale you can't read off one card ("+3 steps" is
a different hierarchy on a 1.125 scale and on a 1.25 one). Ratios are snapped to the project's steps only at
translation.

```
specimen:   stripe-pricing-card-2026-11
jobs:       card[ status?, identity, price, proof×4–8, action ]
order:      status → identity → price → proof → action
nesting:    stack[ status, identity, price, divider, list(proof), action ]
hierarchy:  price 1, identity 2, action 3, proof 4                 (loudest first)
size:       price ÷ body 2.6, identity ÷ body 1.3, proof ÷ body 0.9
space:      inside a group 1, between groups 2.5                   (÷ smallest gap)
grouping:   by space, one divider
container:  surface, no edge
density:    airy
fit:        identity up to 2 words, proof 4–8 items of up to 6 words, width 260–340 at body 16
move:       single-out(among: siblings, which: recommended)        scope: siblings
            "recommended is shown by lifting this card, not by colouring it"
kept:       the price is read first and the list never competes with it   (owner, 2026-11-xx)
source:     stripe.com/pricing, captured 2026-11-xx, screenshot and sidecar beside it
```

What each field may hold:

- **Sizes** as ratios to the organism's body text size.
- **Spaces** as ratios to its smallest gap.
- **Colour** as roles (*the action*, *quieter*, *the only hue*), never values.
- **Shape** as a few named words (*none, small, medium, round*), never a radius.
- **Type** as *display / reading / mono* and a weight word, never a font name.
- **Fit** as the ranges the reference was designed for: items per list, words per slot, the width it lives at.

Anything absolute goes in the source sidecar, never in the specimen. Validation fails a specimen that holds a pixel,
a hex code or a font name.

## The generator: `card * shelf → variants`

1. **Read the card.** Take the picked organism from the live page (the scene graph's instance level), label its jobs,
   and write its grammar the way a specimen is written, including fit (its real item counts and text lengths) and
   whether it has siblings. The card's grammar is cached with the recipe so replay doesn't relabel it.
2. **Find.** Score every specimen. At tens to hundreds of specimens there is no index and no embedding: rank by job
   overlap, then by structure distance (order, nesting, hierarchy, ratios). A specimen is kept only if your card can
   fill its top-hierarchy job and every job its move names.
3. **Map.** Pair your slots with the specimen's by job. Your extra jobs go where their placement rules say. Specimen
   jobs you don't have are dropped. Check fit: if your counts or text lengths fall outside the specimen's ranges,
   the variant is built anyway and marked for the stress check in step 7.
4. **Check the grammar (cheap).** Before anything is built, run the static house rules on the mapped grammar: one
   primary action, coral only for wrong, no divider under every row, ratios that snap to distinct steps. Most drops
   happen here, for free.
5. **Translate.** Snap ratios to the project's steps. Express the move: pick one of its move type's expressions (the
   seed picks among the ones that fit). Choose a molecule for each slot from the house molecules for that job. A
   grammar decision with no row in the table is left out of the variant and recorded in the funnel; the variant
   continues with the rest.
6. **Build off screen** with your app's own components and styles (the open problem in engine-foundations §6).
7. **Judge.** Run `judge(snapshot, packs)` with the house rules, craft rules and tells, plus stress (Break it) on any
   variant marked in step 3. Then the generic check, in grammar space: a variant whose grammar is nearer a
   generic-pile specimen than any kept specimen is dropped.
8. **Choose a spread.** Read the descriptors off the survivors. Pick three to six that differ most in lead, shape and
   density, and keep one slot for a specimen the owner has seen least (the exploratory slot). Show each with its
   recipe in plain words: "Price first, split. Structure from Stripe's pricing card. Recommended is the one solid
   card in the row."
9. **Log the funnel.** How many specimens were found, mapped, passed the cheap check, translated, built, judged and
   shown, and why each one left. An empty grid shows the funnel instead.

### Feedback

On any variant: *keep* or *drop*, and optionally which part was wrong (the structure, the move's expression, or a
molecule). Without a reason, a drop lowers the specimen and the expression a little each. Weights are capped (no
specimen is more than three times as likely as the average) and decay, so the same few don't win forever, and the
exploratory slot keeps new ones visible.

## The translation table (first rows)

Rows are written in roles, so every project shares them. The role map turns roles into a project's tokens: for
plumber, from [visual-language.md](../design/visual-language.md), which changes first if a row needs a new role.

### Move types

| Move type | Stock libraries say it with | House expressions (the seed picks among those that fit) |
|---|---|---|
| `single-out(among: siblings)` | shadow and lift, a "Popular" badge, a coloured border | the chosen card is the one solid block in the action hue, the others on paper · the chosen card is taller and its siblings sit on a shared inset ground · the chosen card's identity carries a status toy, nothing else changes |
| `lead-with(job)` | bigger and bolder | the job is set in the display face at the top step · the job sits alone in its own group with the largest space after it |
| `prove-with(form: list)` | checkmarks in a column | a list in the reading face with the proof toy at the first item only · items grouped by space in two columns at wide fit |
| `prove-with(form: one-quote)` | quote card with avatar | the quote in the reading face with the name in the display face, no card |
| `quiet(job)` | grey text | the hue's soft or ink at a lower step; never grey in a piece |

### Grammar decisions

| Decision | Stock libraries | House expression |
|---|---|---|
| group these | outlined card | a shared surface with no edge, or space alone |
| separate rows | a divider under every row | space; one divider at most, only between groups |
| the action | filled primary button, often blue | the action hue's soft block button, squashing when pressed |
| title, name, number | bold sans | the display face, heavy |
| sentence | body text | the reading face |
| status: wrong / done | red / green | the wrong role (coral) / the done role (mint) |
| depth | elevation scale | none, unless depth is the meaning (a pressed key) |
| decorative icon | icon in a tinted square | the job's toy, or nothing |

## Heuristics: what keeps it scalable

- **S1. Match on jobs, never on looks or kinds.** The shelf is scored by job overlap and structure. A new organism
  needs only specimens whose jobs overlap it, not a new kind.
- **S2. Grammar holds ratios, the dialect holds values.** Only translation knows a project's numbers.
- **S3. A second project writes a role map, not a table.** The translation table and molecules' structure are
  shared, written in roles. A project brings its tokens, and plumber's role layer (the one clean-up already uses)
  proposes the role map from them for the owner to confirm. Its house molecules are its own components, captured.
- **S4. Taste is data.** Adding taste means adding specimens, expressions or molecules, not generator code.
- **S5. One judge.** Candidates are judged by the engine's judge (engine-foundations: "no second engine for the
  generator"). Where the generator's taste and the page's rules disagree, the rules win.
- **S6. Replay is pinned.** A recipe records the seed, a hash of the shelf, the weights snapshot, the table version,
  the molecule set version, the job-labelling model and its version, and the cached card grammar. Replay uses
  those, not today's.
- **S7. Cheap checks first.** Everything that can be decided on grammar is decided before a build. Builds are the
  cost; the funnel shows where they go.
- **S8. Coverage is reported, not assumed.** For the picked card, the funnel says how many specimens overlap its
  jobs. Below six, the grid says it is thin.

## Heuristics: what makes it fool-proof

- **F1. No absolute value enters a specimen.** Capture writes values to the sidecar and grammar to the specimen;
  validation fails a specimen holding a pixel, hex code or font name. This rule keeps stock looks out.
- **F2. No row, left out.** A decision the table can't express is dropped from the variant and logged. To keep it,
  add a role to the visual language first, then the row.
- **F3. The round trip gates capture.** Grammar plus the specimen's own sidecar is rebuilt, and compared with the
  original deterministically: each slot's box position and size ratios, order and grouping, from computed layout on
  both sides. A screenshot is not the measure, because shared fonts and colours make any rebuild look close.
- **F4. The dialect trip gates the thesis.** Specimens are built in our dialect (by hand first, layer 2) and judged
  by the owner. The round trip proves capture; only this proves the product.
- **F5. Generic is judged on structure.** The generic pile is captured as grammar. A variant whose grammar is nearer
  a generic specimen than a kept one is dropped. Looks can't be the measure, because every variant wears our look.
- **F6. No tells.** The stock-library tells reject a variant outright.
- **F7. House rules are hard limits.** One primary action, coral only for wrong, every pairing from `pairs.js`,
  ratios that snap to distinct steps.
- **F8. Fit is stressed.** A variant whose real content falls outside its specimen's fit ranges goes through Break
  it before it is shown.
- **F9. A person curates.** A specimen enters only with the owner's keep and one line of why.
- **F10. The blind mix.** Before a kind is offered, generated variants are shuffled in with hand-made house
  organisms. If the owner can pick out the generated ones, it isn't ready.
- **F11. Copy nothing.** Specimens hold decisions; sidecars and screenshots stay local for comparison. No markup,
  assets or text from the source. Paid kits are checked for terms first.

## Where specimens come from

- Real products (Stripe, Linear, Vercel, Raycast and the like) for the shelf. Component libraries like shadcn and
  Radix go to the generic pile.
- Capture renders the page in a browser, reads the organism's computed layout and styles, writes values to the
  sidecar and ratios and roles to the specimen (the same role reading plumber already does for clean-up), has a model
  label jobs and propose a move type, and a person keeps it or not.
- Our own organisms are captured the same way and marked *house*. Their parts become the house molecules.

## Order

One layer at a time, each seen working before the next.

| # | Layer | What can be seen |
|---|---|---|
| 0 | Sign-off on this brief | This page, agreed |
| 1 | The specimen format and validator; 5 pricing cards written by hand, with sidecars | Five specimens that pass validation |
| 2 | **The dialect trip by hand:** those 5 built in our dialect as static HTML, no generator, no off-screen build | Five cards in toys, side by side. If they aren't distinct and good, the thesis fails here, in a day |
| 3 | The round trip on the 5 | Per-slot diffs within tolerance for at least 4 of 5 |
| 4 | Capture from a live page; 20 pricing specimens and 5 generic ones | 20 kept by the owner, with the generic distance of each |
| 5 | Read, find, map and the cheap check for one crafting-ui card | The funnel up to translation |
| 6 | Translate and build off screen | 6 variants of that card in our dialect |
| 7 | Judge, stress and spread | Before and after the filter, with the funnel |
| 8 | The grid with recipes, keep and drop | The owner picks from it |

Layer 6 needs the off-screen build (engine-foundations layer 6). Layers 1–5 don't.

## Decided here, and why (change any at sign-off)

- **The move is kept, as a structured decision with several house expressions.** The review's other option, keeping
  structure only, throws away the decision that makes a reference worth having. A move type with several expressions
  keeps the decision and still lets twenty specimens come out differently.
- **The unit is the organism; siblings moves have a scope.** Pricing cards are the first kind and their best moves
  are about siblings, so a move can say so, and is used only where the page has siblings. Generating whole tier
  groups waits until single cards work.
- **Molecules are ours, authored in final form.** They are the rooms. References give arrangement and moves, never
  parts.
- **Descriptors, not knobs.** Lead, shape and density are read off candidates to pick a spread. Setting them would
  mean rearranging a specimen by rule, which is generating from nothing again.
- **Left out, not ended.** A decision with no row drops that decision; the rest of the variant goes on.
- **No embeddings in Find for now.** Scoring every specimen is cheap at this size and embeddings would only break
  ties. They come back if the shelf reaches thousands.
- **Pricing cards first.** Clear jobs, many good public examples, easy to judge.

## What the review changed (2026-11-20)

A review of the first version found that several checks didn't test what they claimed. This version:

- Turned the move into a typed decision with several expressions, so translation doesn't make every specimen look
  the same.
- Split the round trip (capture is faithful, via a sidecar and per-slot diffs) from the dialect trip (the product
  works), and moved a hand-built dialect trip to layer 2.
- Moved the generic check from screenshots to grammar, since every variant wears our look.
- Stored ratios instead of steps.
- Made axes into descriptors used to pick a spread.
- Put molecules into Translate and wrote the placement rules per job.
- Added scope for moves about siblings, fit ranges and stress, the funnel, a cheap grammar check before builds,
  capped and decaying weights with an exploratory slot, pinned replay, a nested job tree with counts, and the
  rule that a specimen must fill your top job and its move's jobs.
- Said what a second project brings (a role map) and that matching never uses kinds.
- Dropped the claim that the generator would be a few hundred lines; its size is unknown.

## Not known

- Whether a hand-built dialect trip comes out distinct and good. Layer 2 answers it, and the brief stands or falls
  on it.
- How a structure distance should weigh order, nesting, hierarchy and ratios. A first weighting is a guess until
  layer 5 shows rankings to the owner.
- How reliably a model labels jobs and proposes a move type. Unmeasured.
- How a candidate is built off screen faithfully with the app's own components and data (open in
  engine-foundations §6).
- Whether 20 specimens for the first kind is enough. A guess.

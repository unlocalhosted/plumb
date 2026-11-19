# Brief: an organism generator that learns from other people's taste and draws in ours

Status: DRAFT for owner sign-off, 2026-11-20, fourth version after three reviews the same day (see **What the reviews
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
molecules**: authored in-house, in final form, in our look, each doing one job. What we learn from other products is
**grammar**: what happens *between* the parts of a good organism (their order, grouping, spacing and which one is
loudest) and its **move**, a deliberate decision that neither the grammar nor a molecule can say. The generator
matches your card to similar grammars, fills their slots with our molecules, and draws the move in our look. Then
the judge throws out anything that breaks our rules, and a taste ladder of cards the owner has ranked decides which
of the rest are good enough to show. Generic structure is kept off the shelf at curation. What you
see is a small grid of variants, each labelled with its recipe.

## Terminology

Use these words in code, docs and the UI, with these meanings only.

| Word | What it means |
|---|---|
| **Organism** | A finished component made of smaller parts, with one purpose: a pricing card, a settings row, an empty state. The unit the generator builds. It never changes anything outside the organism. |
| **Siblings** | Other instances of the same organism beside it (the three plans in a pricing row). The generator reads whether they exist; it never changes them. |
| **Job** | One thing the organism has to do for the person: say what it is (*identity*), say what it costs (*price*), make the case (*proof*), get the click (*action*). Jobs come from a fixed list (below). |
| **Job tree** | An organism's jobs, nested and counted: `card[ status?, identity, price, proof×3–6, action, secondary-action? ]`. |
| **Kind** | A human name for a family of job trees ("pricing card"), used to report coverage. Matching never uses kinds; it uses job overlap. |
| **Slot** | The place in a layout where one job is done. Your plan name fills the identity slot. |
| **Grammar** | What happens between slots: job tree, order, nesting, grouping, space between slots, each slot's hierarchy rank, how strongly the top rank leads, and fit. Never what is inside a slot. |
| **Molecule** | One house-authored way to do one job, in final form: a price as a big number, proof as a checklist, proof as one quote. It owns everything inside its slot (size, weight, form) and takes only a rank, a lead strength and a density as input. Molecules exist only in our look. They are the rooms. |
| **Lead strength** | How far the rank-1 slot stands above rank 2: *flat*, *clear* or *strong*. Grammar sets it; the molecule turns it into a size step. |
| **Move** | A deliberate decision that the grammar fields and the molecule choice can't express, from a fixed vocabulary of **move types** with arguments: `single-out(which: recommended)`, `bind(price, action)`, `set-apart(group)`. A specimen has at most one, with a sentence saying it in words. |
| **Expression** | One way our look can draw a move type. A move type has several. Each expression lists its **conditions** (jobs it needs, roles it needs, whether the card must be the chosen sibling); an expression *fits* when every condition holds. |
| **Specimen** | One captured reference: its grammar, move, a screenshot, a source sidecar, where it came from, and why it was kept. |
| **Source sidecar** | The specimen's original absolute values (sizes, colours, fonts, weights), kept apart and read only by the round trip. |
| **Shelf** | All the kept specimens. Our own organisms are on it too, marked *house*. |
| **Dialect** | How a project's system draws things: house expressions, molecules, and the tokens behind them. Plumber's toy language is the first and, for now, only dialect. |
| **Translation table** | Rows from move types and grammar decisions to house expressions in plumber's dialect. |
| **Density** | The specimen's spacing band (*airy, balanced, compact*), an input the molecules take. *Measured density* is a separate descriptor. |
| **Descriptors** | Lead, shape and measured density: values read off each candidate after it is built, used to choose a spread. Nothing sets them. |
| **Visual weight** | How strongly a slot draws the eye, computed from its styles by a fixed rule (see the specimen format). Ranks and lead strength come from it. |
| **Content record** | A slot's content as named fields from its job's schema: a price is `amount, period?, was?`; proof is `items[]`. Molecules declare which fields they require. |
| **Taste ladder** | A fixed set of anchor cards the owner has placed on five rungs, from broken to reference-grade. Every variant is placed on it by comparison, and only the top rungs are shown. |
| **Drift** | How far mapping pushed a variant from its specimen: specimen jobs dropped, and your jobs placed by a default rule instead of a specimen slot. |
| **Recipe** | Everything that made a variant: seed, specimen, molecules, expression, and the pinned versions (S6). Printed under the variant and replayable. |
| **Seed** | A number that picks among fitting expressions and molecules and breaks ties. |
| **Tell** | A mark of a stock or generated look (elevation on every card, uppercase buttons, a divider under every row). The `tells` pack holds 17 for generated screens; the generator adds stock-library ones. |
| **Generic pile** | Plain stock-library organisms (MUI, Bootstrap, default shadcn, Chakra), captured as grammar and used at curation to keep generic structures off the shelf. |
| **Round trip** | Rebuild a specimen from its grammar plus its own sidecar and compare with the original, slot by slot. Proves the layout, order, grouping and per-slot emphasis survive capture. |
| **Dialect trip** | Build a specimen from its grammar plus our molecules and table. Proves what production does. |
| **Funnel** | The count of candidates at every step of a run and why each one left, plus coverage: specimens overlapping the card, and molecules available per job. Logged every run. |

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

All sizes and spaces are ratios to the organism's body text size. It is the one unit every card has, and it
isn't thrown off by a 2px nudge the way a smallest gap is. Ratios are snapped to the project's steps only at
translation.

```
specimen:   stripe-pricing-card-2026-11
jobs:       card[ status?, identity, price, proof×4–8, action ]
order:      status → identity → price → proof → action
nesting:    stack[ status, identity, price, divider, list(proof), action ]
hierarchy:  price 1, identity 2, action 3, proof 4      lead: strong
colour:     price ink, identity ink, proof quieter, action the-action filled, status done
space:      inside a group 0.5, between groups 1.5        (÷ body size)
grouping:   by space, one divider
container:  surface, no edge
density:    airy
fit:        identity ≤ 2 words, proof 4–8 items of ≤ 6 words, width 16–21 × body
move:       single-out(which: recommended)
            "the recommended plan stands out from its row"      (the source's wording stays in the sidecar)
kept:       the price is read first and the list never competes with it   (owner, 2026-11-xx)
generic:    distance 0.41 to the nearest generic specimen (shadcn pricing)
source:     stripe.com/pricing, captured 2026-11-xx, screenshot and sidecar beside it
```

What each field may hold:

- **Spaces and widths** as ratios to body size.
- **Hierarchy** as ranks and a lead strength. Never a size: the molecule owns its size.
- **Colour** as one role per slot (*ink, quieter, the-action, done, wrong*), never values.
- **Shape** as a few named words (*none, small, medium, round*), never a radius.
- **Fit** as the ranges the reference was designed for: items per list, words per slot, width ÷ body.

Validation fails a specimen holding a pixel, a hex code, a font name or a size inside a slot. Those belong in the
sidecar or in a molecule.

**How ranks are captured.** Each slot's visual weight is
`(size ÷ body) × √(weight ÷ 400) × √(contrast ÷ body text contrast)`, where a filled control counts its fill's
contrast against the ground. Slots are sorted by it; two within 10% share a rank. Lead strength is rank 1's weight
over rank 2's: under 1.25 is *flat*, 1.25 to 2 is *clear*, over 2 is *strong*. These are starting numbers. Layer 4
captures each specimen twice (two widths, two scroll positions) and the ranks must agree; if they don't, the rule
changes before any shelf is built on it.

## Molecules

- **Molecules are real components in the app's codebase**, the house's own parts (for plumber, components in
  `web/`). The off-screen build in step 7 renders those components, so a variant is made of code the app already
  ships, not of generated markup.
- Each molecule does one job, takes **rank, lead strength and density** as input, and returns its final form in our
  look. It never reads a specimen.
- **Content reaches a molecule as a content record.** Each job has a small schema of named fields (price:
  `amount, period?, was?`; proof: `items[]`; action: `label, href`). Reading the card fills a record per slot from
  the page. A molecule declares the fields it requires and the optional ones it uses; it fits only if every required
  field is present. A strikethrough price requires `was`, so a card without an old price never gets one.
- A molecule declares what it fits: item counts, text lengths, and the descriptors it adds to a variant (a big
  number pushes the variant towards price-led).
- When a job has several molecules, the seed picks among those that fit the content and the rank, with the spread
  step (below) preferring variants whose molecules differ.
- Molecules are authored by hand, from our own components where they exist. The first kind needs at least three
  price, three proof, two identity, two action and two status molecules before the generator is worth running
  (layer 2). With one price molecule every variant shows the same price, so the funnel reports molecules per job
  beside specimen coverage.

## The generator: `card * shelf → variants`

1. **Read the card.** Take the picked organism from the live page (the scene graph's instance level), label its jobs,
   fill a content record per slot, write its grammar (with fit: its real counts and text lengths) and note whether it
   has siblings and whether it is the chosen one among them. The card's grammar and records are cached with the
   recipe.
2. **Find.** Score every specimen: job overlap first, then structure distance (order, nesting, ranks, space ratios).
   A specimen is kept only if your card can fill its rank-1 job and every job its move names.
3. **Map.** Pair your slots with the specimen's by job. Your extra jobs go where their placement rules say; specimen
   jobs you don't have are dropped. Measure drift. Above the drift limit (a starting guess: more than one job
   dropped, or more than one placed by rule), the variant ends: it would no longer be that specimen's structure.
4. **Grammar check, before Translate.** Rules that need no look: one primary action, no divider under every row,
   fit within the specimen's ranges or marked for stress.
5. **Translate.** Snap space ratios to the project's steps. Pick a molecule for each slot (see Molecules). Draw the
   move with a fitting expression, picked by the seed. If no expression fits, the variant goes on as **structure
   only**, says so in its recipe, and ranks after variants that carry a move.
6. **Dialect check, before Build.** Rules that need the look but not a render: coral only for wrong, every pairing
   from `pairs.js`, ranks that snap to distinct steps.
7. **Build off screen:** render the chosen molecule components with their content records, in the arrangement the
   grammar gives, with the app's styles (the open problem in engine-foundations §6).
8. **Judge.** Run `judge(snapshot, packs)` with the house rules, craft rules and tells, plus stress (Break it) on any
   variant marked in step 4. Then place each survivor on the taste ladder (below); anything under rung 4 is dropped.
9. **Choose a spread.** Read the descriptors off the survivors. Pick three to six that differ most in lead, shape,
   density and molecules, and keep one slot for a specimen the owner has seen least. Show each with its recipe in
   plain words: "Price first, split. Structure from Stripe's pricing card. This plan stands out as the one solid
   card."
10. **Log the funnel.** Every step's count, why each candidate left, and coverage. An empty grid shows the funnel.

### Sibling moves stay on the picked card

The generator builds one organism and never changes its siblings. So a move about siblings is drawn only with
expressions that change the picked card itself. If the picked card isn't the chosen one, `single-out` doesn't apply
and the variant is structure only. Building a whole row of siblings waits until single cards work.

### Feedback

On any variant: *keep* or *drop*, and optionally which part was wrong (the structure, the move's expression, or a
molecule). Without a reason, a drop lowers the specimen, the expression and the molecules a little each. Weights are
capped (nothing is more than three times as likely as the average) and decay. The exploratory slot keeps unseen
specimens visible.

## The taste ladder

Everything else in this brief keeps out what is bad: rules, tells, drift, curation. None of it says how good a
variant is. The ladder does.

**Why comparison, not a score.** People can't reliably give a card "7 out of 10", but they are consistent about
"this one is better than that one". So taste is stored as comparisons against fixed anchors, the way a chess rating
is built from games rather than from a judge's opinion of a player.

**The anchors.** About 15 cards of the kind, placed by the owner on five rungs:

| Rung | What it means | Example anchors |
|---|---|---|
| 1 | Broken | overlapping text, no clear action |
| 2 | Stock | a default MUI or shadcn pricing card |
| 3 | Fine | a competent card nobody would remember |
| 4 | Good | one of our house cards; a well-made product card |
| 5 | Reference-grade | the best kept specimens built in our look |

Anchors are rendered in our look where they can be (rungs 3–5), so the comparison is about arrangement and
decisions, not about which one wears our colours.

**Placing a variant.** It is compared with one anchor from rung 3, then from rung 4, then rung 5, and placed under
the first anchor it loses to; two anchors per rung, and a split result places it on the lower rung. Only rungs 4
and 5 are shown, and each variant says where it landed and which anchors it beat.

**Who compares.** The owner at first, during layers 3 and 8. A model judge (a vision model given the anchors and the
principles in [PRINCIPLES.md](../PRINCIPLES.md)) takes over only after it agrees with the owner on at least 80% of
40 held-out pairs. The agreement is rechecked every 50 owner picks; below 80% the judge stops and the owner
compares again.

**Reasons, not just a rung.** Each comparison names its deciding principles from a short list (one focal point; the
eye reads the jobs in order; one rhythm of space; parts line up; nothing competes with the action). The craft rules
check some of these directly; the rest are the judge's reasons. The rung is the result, and the reasons are the
explanation shown in the recipe.

**The ladder grows.** Every keep and drop in the grid is also a comparison, so the owner's picks keep adding
evidence. A variant the owner keeps that sits on rung 4 can become a new anchor once it has won enough comparisons.

## The translation table (first rows, plumber's dialect)

### Move types

| Move type | Stock libraries say it with | House expressions (conditions in brackets) |
|---|---|---|
| `single-out(which)` | shadow and lift, a "Popular" badge, a coloured border | this card is a solid block in the action hue (card is the chosen one) · this card's identity carries a status toy (card is the chosen one; a status molecule exists) · this card's action is the only filled one in its row (card is the chosen one; siblings use the outline action) |
| `bind(a, b)` | none common | `a` and `b` share one row with no space between groups (both jobs present) · `b` sits on `a`'s ground (both jobs present; a ground role exists) |
| `set-apart(group)` | a bordered inner box | the group sits on the inset ground, no edge (the group has 2+ slots) · the group is the only one with the largest space before it (any) |

### Grammar decisions

| Decision | Stock libraries | House expression |
|---|---|---|
| group these | outlined card | a shared surface with no edge, or space alone |
| separate rows | a divider under every row | space; one divider at most, only between groups |
| quieter | grey text | the hue's soft or ink at a lower step; never grey in a piece |
| status: wrong / done | red / green | coral / mint |
| depth | elevation scale | none, unless depth is the meaning (a pressed key) |
| decorative icon | icon in a tinted square | the job's toy, or nothing |

## Heuristics: what keeps it scalable

- **S1. Match on jobs, never on looks or kinds.** A new organism needs only specimens whose jobs overlap it.
- **S2. Grammar holds ratios and ranks; molecules hold looks.** Only translation and molecules know a project's
  numbers.
- **S3. One dialect for now.** The table, expressions and molecules are plumber's. Writing them in roles so another
  project could reuse them is possible in principle and untested, and no part of this brief depends on it.
- **S4. Taste is data.** Adding taste means adding specimens, expressions or molecules, not generator code.
- **S5. One judge.** Candidates are judged by the engine's judge (engine-foundations: "no second engine for the
  generator"). Where the generator's taste and the page's rules disagree, the rules win.
- **S6. Replay is pinned.** A recipe records the seed, a hash of the shelf, the weights snapshot, the owner's seen
  history (the exploratory slot reads it), the table version, the molecule set version, the job-labelling model and
  its version, and the cached card grammar.
- **S7. Cheap checks first.** Grammar check before Translate, dialect check before Build. Builds are the cost.
- **S8. Coverage is reported.** The funnel says how many specimens overlap the card and how many molecules each job
  has. Below six specimens or two molecules for any job, the grid says it is thin.

## Heuristics: what makes it fool-proof

- **F1. No absolute value enters a specimen.** Values go to the sidecar, sizes inside a slot to molecules.
  Validation fails anything else.
- **F2. An undrawable move is labelled.** A grammar decision with no row is left out and logged. A move with no
  fitting expression makes the variant structure only, labelled.
- **F3. The round trip gates capture.** Grammar plus the sidecar is rebuilt and compared deterministically from
  computed layout on both sides: each slot's box, order, grouping, and each slot's weight and colour role. It proves
  those survive. It doesn't prove anything about details inside a slot, which molecules replace anyway.
- **F4. The dialect trip gates the thesis.** Specimens built by hand in our look (layer 3) are judged by the owner.
  The round trip proves capture; only this proves the product.
- **F5. Generic structure is kept off the shelf.** At curation a specimen needs a minimum grammar distance from the
  nearest generic specimen (the threshold is set at layer 5 from real distances). At run time a variant inherits its
  specimen's structure, so the run-time guard is drift (step 3), not distance.
- **F6. No tells.** Stock-library tells reject a variant outright.
- **F7. House rules are hard limits.** One primary action, coral only for wrong, every pairing from `pairs.js`,
  ranks that snap to distinct steps.
- **F8. Fit is stressed.** A variant whose real content falls outside its specimen's or its molecules' fit goes
  through Break it before it is shown.
- **F9. A person curates.** A specimen enters only with the owner's keep and one line of why.
- **F10. The blind mix.** Before a kind is offered: 20 cards, 10 generated and 10 house cards made fresh for the
  test, so nobody recognises them from memory, shuffled. A judge who hasn't seen any of them says which is which. It
  passes if the judge is right on 12 or fewer (10 is chance; someone who spots 4 of the 10 generated cards gets 14
  and fails).
- **F11. The taste ladder gates the grid.** Nothing under rung 4 is shown.
- **F12. Copy nothing.** Specimens hold decisions; sidecars and screenshots stay local for comparison. No markup,
  assets or text from the source. Paid kits are checked for terms first.

## Where specimens come from

- Real products (Stripe, Linear, Vercel, Raycast and the like) for the shelf. Component libraries like shadcn and
  Radix go to the generic pile.
- Capture renders the page in a browser, reads the organism's computed layout and styles, writes values to the
  sidecar and ratios, ranks and roles to the specimen (the same role reading plumber already does for clean-up), has
  a model label jobs and propose a move type, measures the generic distance, and a person keeps it or not.
- Our own organisms are captured the same way and marked *house*. Their parts seed the molecules.

## Order

One layer at a time, each seen working before the next.

| # | Layer | What can be seen |
|---|---|---|
| 0 | Sign-off on this brief | This page, agreed |
| 1 | The specimen format and validator; 5 pricing cards written by hand, with sidecars, chosen to differ in structure (not five stacks) | Five specimens that pass validation, with their structure distances to each other |
| 2 | Molecules for the pricing jobs, by hand (3 price, 3 proof, 2 identity, 2 action, 2 status) | The molecules on one sheet at each rank and density |
| 3 | **The dialect trip by hand, with a control:** the 5 built strictly from specimen, molecules and table as static HTML, no generator, no off-screen build. Every decision none of them supplied is written down. A sixth card, the **control**, uses the same molecules with only the placement rules and no specimen. The first taste ladder is set up and all six are placed on it | Six cards in toys side by side, unlabelled, and the list of missing decisions. If the owner can't tell the specimen cards from the control, or the control ranks as high, the shelf isn't earning its cost and the product is a molecule combinator: layers 4–5 are dropped or rethought. If the five aren't distinct and good, the thesis fails here |
| 4 | The round trip on the 5, each captured twice | Per-slot diffs within tolerance for at least 4 of 5, and the same ranks from both captures |
| 5 | Capture from a live page; 20 pricing specimens and 5 generic ones | The 20 and the 5 plotted by grammar distance. If the generic ones sit inside the cloud of kept ones, structure doesn't carry taste and F5 has to change before going on |
| 6 | Read, find, map, both cheap checks for one crafting-ui card | The funnel up to Build |
| 7 | Build off screen, judge, stress, spread | 3–6 variants of that card in our look, with the funnel |
| 8 | The grid with recipes, keep and drop | The owner picks from it |

Layer 7 needs the off-screen build (engine-foundations layer 6). Layers 1–6 don't.

## Decided here, and why (change any at sign-off)

- **Grammar owns between slots, molecules own inside them.** Both claimed sizes before. Now a specimen gives ranks
  and a lead strength, and the molecule turns them into sizes in our look.
- **Moves are only what grammar and molecules can't say.** "Lead with price" is the hierarchy field and "prove with a quote" is
  a molecule choice, so neither is a move.
- **The generator never touches siblings.** Sibling moves use expressions on the picked card only. Rows of cards
  wait.
- **Structure only, labelled, rather than ended.** A variant whose move can't be drawn can still be a good structure;
  it says so and ranks lower.
- **Generic is a curation check, drift is the run-time check.** A variant inherits its specimen's structure, so its
  distance to generic is decided when the specimen is kept.
- **Molecules are the app's real components.** A variant is made of code the app already ships, and content binds
  to them through content records, so a molecule never shows a field the card doesn't have.
- **Taste is a ladder of comparisons, not a score.** Comparisons against fixed anchors are what people are
  consistent at, and a model judge is used only while it agrees with the owner.
- **A control card in layer 3.** It is the cheapest way to learn whether references add anything over our own
  parts and placement rules.
- **Body size is the unit.** Every card has one, and it doesn't move when an icon is nudged.
- **No embeddings in Find for now.** Scoring every specimen is cheap at this size.
- **Pricing cards first.** Clear jobs, many good public examples, easy to judge.

## What the reviews changed (2026-11-20)

**First review.** Translation drew every move the same way; the round trip needed values capture had thrown away;
screenshot embeddings would call anything in our look "ours". The second version made moves typed with several
expressions, added the sidecar and per-slot diffs, compared structure instead of screenshots, stored ratios, turned
axes into descriptors, and added the funnel, fit, pinned replay and a hand-built check before any generator.

**Second review.** The generic check passed by construction (a variant is its specimen's structure); grammar and
molecules both claimed sizes; sibling moves changed cards the generator doesn't build. This version moves the
generic check to curation and adds drift; splits grammar from molecules and drops the moves that repeated them;
keeps sibling moves on the picked card; adds a molecule layer and molecule coverage; runs the look-dependent checks
after Translate; uses body size for every ratio; labels structure-only variants; defines when an expression fits;
narrows the round trip's claim; pins the seen history; gives the blind mix a count and a bar; and asks layer 3 for
the list of decisions the spec didn't supply.

**Third review**, which recommended sign-off after two additions. This version adds a control card to layer 3, makes
molecules the app's real components with content records for binding, gives a capture rule for ranks and lead
strength, makes the blind mix use fresh cards, an unfamiliar judge and a stricter bar, splits input density from
measured density, adds a colour field, and shows the house sentence for the example move. The owner's question the
same day ("how are we making sure that there is a certain level of taste scale against which we compare our
generations") added the taste ladder.

## Not known

- Whether a hand-built dialect trip comes out distinct and good (layer 3). The brief stands or falls on it.
- Whether generic and kept specimens separate in grammar space at all (layer 5). The Stripe example's structure is
  close to a stock pricing card's; if taste lives mostly in what this format doesn't store, the format has to grow.
- Whether specimens beat the control (layer 3), which decides whether the shelf is worth building.
- Whether a model judge can reach 80% agreement with the owner on the ladder. If it can't, the owner stays the judge
  and the generator is limited by how many comparisons they are willing to make.
- Whether the visual-weight rule gives stable ranks across captures (layer 4).
- How structure distance should weigh order, nesting, ranks and space. A guess until layer 6 shows rankings.
- The drift limit and the generic threshold. Both are set from real numbers at layers 5 and 6.
- How reliably a model labels jobs and proposes a move type. Unmeasured.
- How a candidate is built off screen faithfully with the app's own components and data (engine-foundations §6).
- Whether 20 specimens for the first kind is enough. A guess.

# Brief: how the organism generator feels to use and learns your taste

Status: PARKED DRAFT, 2026-11-20. It goes to sign-off only once layer 3 of [organism-generator.md](organism-generator.md)
has a result: if references can't beat a plain card made from our own parts, this half changes. Split out of that
brief after its fourth review, which found the engine (its layers 0–7) ready and this half not.

## The ask

The owner, 2026-11-20:

- "no man keep it generator, a lot of time i can't exactly say what i want the system should be intuitive and
  delighful enough to attune to my liking"
- "a lot of time its a salesman job to find what would suit the best for me"
- "i want the references which we make use of to be conveyed to user hey lets do this because for all the reasons
  given our context this seems to be the most suitable choice"
- "new could be a reference, it could be something tasteful for me new doesn't mean invent everytime"

A good salesman doesn't wait for you to describe the jacket. They bring the one they think suits you and two that
are different, watch how you react, and the next three are closer. The generator does the same: it leads with a
guess, and learns from what you do. Words are optional.

## Using it

1. **Generate.** Pick a card and press Generate. No question first.
2. **The pool is made once.** The engine generates and judges the full pool of candidates for this card in the
   background (layers 5–7 of the engine brief), and caches it. Everything after this re-ranks the cache, so Shuffle
   feels instant. Only steps (below) need new builds.
3. **A rack.** One **lead pick**, the top score, shown first and largest; two or three **alternatives**, the most
   different from it among the top-scoring; and one **wildcard**, a random candidate not yet shown.
4. **A pitch per option, from facts only.** A pitch is built from three sources and nothing else: facts read off the
   page ("3 plans side by side", "the price is the second thing on your card today"), measured taste features ("one
   alignment edge, a clear lead"), and the specimen's `kept` line, which is the owner's own reason for keeping the
   reference ("the price is read first and the list never competes with it"). A model may phrase it but may not add
   a claim. It is phrased the way a designer explains a decision to a client: what we did, and what it does for the
   people using it (the engine brief, **The case for a change**). "People scan for the number" is not allowed unless a measured fact says so.
5. **You react** by doing what you'd do anyway: apply, keep, tweak, undo, shuffle, compare.
6. **It mentions what it has noticed** only after the same pattern shows in at least five signals across two
   sessions ("You've undone every card with a big price; showing quieter ones"). One line, dismissable.
7. **Apply writes code** (see **Applying a card**).

## Signals, first version

| Signal | Counts as | Strength |
|---|---|---|
| Apply, then keep | the applied option beat every other option on its rack | strong |
| Apply, then tweak by hand | the option was close; the tweak gives a direction | strong |
| Apply, then undo | the option lost to the card as it was | strong |
| Open two to compare | both are in the running against the rest | medium |
| Shuffle | the shown options lose a little to unseen ones | weak; it often means "show me more", not "all wrong" |

- **Keep** means the applied card is still in the code at the next session, or one day later, whichever comes first.
- **Undo** counts within ten minutes of applying, or before the next Generate, whichever comes first. Later than
  that it is an edit, read as a tweak.
- **Tweak to direction:** after a hand edit, plumber re-reads the card, writes its grammar, and diffs it with the
  applied variant's grammar. The differences (space ratios, lead strength, density band, a swapped molecule) are the
  direction.
- **Left out for now:** lingering and skipping. How long you look at something follows its position and size more
  than your taste, so it would teach the model about the layout of the rack.

## The taste model, first version

- **One linear pairwise model.** Every signal is a comparison "A beat B". The model scores a candidate as a weighted
  sum over which specimen, expression and molecules it uses, and over its taste features; it is fitted on the
  differences between winners and losers. A session gives perhaps five to ten comparisons, so this is as much
  model as the data can carry.
- **Starts warm.** Before the first signal, its weights come from the offline ladder calibration (the engine
  brief's taste ladder) and the owner's kept specimens.
- **Explore later, if the logs say so.** No Thompson sampling at first. Each logged rack records what was shown and
  why, so a better choosing rule can be replayed over the logs and adopted only if it would have chosen better.
- **It never touches the gate.** Signals train this model only. They never add anchors to the ladder or change
  what passes the engine's checks. Anchors change only when the owner deliberately places a card on a rung.
- **Pinned for replay.** A recipe records the model's snapshot, and the wildcard's random draw comes from the seed.

## Steps: moving an option you leaned towards

A step changes only what the engine lets a grammar's values change: space ratios, lead strength and density band,
or it swaps one molecule. With three bands each, the neighbours of an option are a small grid that can be listed
in full, built and judged like any candidate. Structure (number of groups, nesting) never changes in a step; a
different structure comes from a different specimen. Sizes and hues belong to molecules, so they change only by
swapping one.

## Applying a card

Not designed here; it needs its own spec before layer 8. What it must do: find the card's source through plumber's
stamping, emit the variant as the app's own molecule components with the card's content records as props, write it
through the same no-reload write path plumber's fixes use, and undo in one step.

## References teach the system

The source is the engine's funnel log of what was left out. When kept specimens keep using a decision the table has
no row for, plumber reports it: "Seven kept specimens single out a card by depth; your system has no way to draw
that." It proposes the addition to the visual language with those specimens as the reason. Nothing outside the
system is drawn until the owner accepts.

## How we'll know it learns

The lead pick is first and largest, so it would be applied more whatever the model knows. So on one rack in five,
the model's top choice is put in a random non-lead position and a random survivor takes the lead. Comparing how
often the model's top choice is applied in each position, and how often a random lead is applied, separates the
model from the layout of the rack.

## Order (after the engine's layer 7)

| # | Layer | What can be seen |
|---|---|---|
| 8 | Generate, the cached pool, a rack with lead pick and factual pitches, Shuffle; apply specified and built | A session on one crafting-ui card ending in a card the owner keeps, in the code |
| 9 | Signals and the linear model, with the position swap | After a few sessions, the model's top choice is applied more than a random lead, in the same position |
| 10 | Steps and the noticed line | A tweak turns into a step the owner agrees moved the right way |
| 11 | References teach the system | A proposal built from the left-out log |
| Later | Motion and micro-interactions | Their own brief |

## Not known

- Whether a few sessions give enough comparisons for the model to beat a random lead.
- Whether hand tweaks diff cleanly into directions, or mostly change things a step can't express.
- What "keep" should mean for someone who applies and then moves on to other work for days.

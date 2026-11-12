# Principles: where a suggestion comes from

Owner's direction, 2026-11-12. Read this before writing or changing anything that decides what React Plumber says or
suggests: a rule, a threshold, a ranking, a tie-break, a default, a fix.

> "Don't create these rules out of your ass. There has to be some sort of industry practice and some sort of data by
> real engineers working on design systems and how frontend processes work. This has to be the driving force."
>
> "We don't just say 'do this because so many instances'. There has to be a principle behind the suggestion, some way
> of perceiving things, some concept which leads to a suggestion."

## The rule

**Every suggestion follows from a principle, and every principle has a source.** A suggestion with no principle behind
it is not made. A number, an order or a tie-break with no source is not written into the product.

## The chain every suggestion walks

1. **A way of seeing.** What a skilled person notices here that others miss. ("The eye lines up letters, not boxes.")
2. **The principle.** The concept that makes it matter, said in a sentence, with a name where it has one.
3. **The source.** Where the principle and its numbers come from (see below). Written next to the principle.
4. **The measure.** How the tool reads it on the page or in the code.
5. **The suggestion.** What the principle asks for here, said in the project's own system.
6. **The proof.** The suggestion tried before it is offered.

If a step is missing, the work stops at that step. It does not skip ahead to code.

## What counts as a source

The owner's words: "it can be pragmatic". Any of these, named so someone can check it:

- **Code evidence.** What real codebases and real design systems do, read and counted.
- **A talk.** An engineer or designer who does this work, explaining how and why.
- **Documentation.** A design system's or a platform's own written guidance, or a spec.
- **Industry practice.** How teams that run design systems and frontend at scale do it, including what their own
  tooling checks and suggests.

## What never counts

- **A count on its own.** "Forty places do this" is not a reason. A count can be *evidence for* a principle (it shows
  what the project decided), never the principle.
- **My own judgement, filled in while coding.** If a design line is vague, the gap is closed by finding a source or
  by asking the owner, not by picking a number that seems sensible.
- **A plausible-sounding default.** "Two or more", "more than half", "nearest wins" are decisions. Each needs a
  source like any other.

## How to work

- **Source before code.** The principle and its source go in the spec or brief first. Research goes in
  `docs/research/`; references found or shared go in `docs/references.md`.
- **Every number names its source** where it is defined, in a few words.
- **No source found:** say so. It is then a guess: marked as one, kept out of the default behaviour, and raised with
  the owner. It is never dressed as a rule.
- **Reviewing a change:** for each new threshold, order or default, ask "what principle is this, and where does it come
  from?" No answer means it does not go in.

## The three things React Plumber does

The same chain runs under each. (The one-line readings below are Claude's, to be corrected by the owner.)

- **Design drift and fix.** Finds where the code leaves the project's design system, builds a system when there is
  none, and keeps the two in sync. *Reading:* the project's own decisions are the allowed answers.
- **Craft rules.** The tacit knowledge of design engineering, as checks. *Reading:* each rule is something a senior
  would teach, with the reason they would give (`docs/craft/rules.md`).
- **Visual editor.** Change the running React app by hand and have the source follow. *Reading:* an immediate
  connection to what you are making, and the source is the truth (`docs/VISION.md`).

## Known debt (2026-11-12)

- The design for how a suggestion is chosen (`docs/briefs/craft-spec.md` §4: theme step, numeric scale, new token,
  advice, and how each is ranked) cites no source.
- The standard's numbers (`overlay/src/craft-spec.js`) cite no source where they are defined. Some have one in
  `docs/craft/rules.md` or `docs/craft/verification.md`; which ones is not checked.
- Each craft rule is tied to a law of UX (`overlay/src/laws.js`). That says why the rule exists, not where its
  numbers or its suggestion come from.

## Where this came from

On 2026-11-12 Claude added two behaviours to the suggestion engine in one sitting: use the value "the page already
uses" once two places share it, and name a class once more than half of them write it. Every number and tie-break in
them was made up on the spot. Both were taken out the same day.

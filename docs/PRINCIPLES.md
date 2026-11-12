# Principles: what React Plumber is, and where a suggestion comes from

Owner's direction, 2026-11-12. Read this before writing or changing anything that decides what React Plumber says,
suggests or applies: a rule, a threshold, a ranking, a default, a fix.

## What plumber is

> "I'm just trying to create a tool which has the heuristic of a human expert baked into it. I'm not creating a
> linter. This would be suggestive, this would be opinionated."

- **The setting.** A design system is defined. LLMs write the UI, and each time they drift a little from it. Plumber
  keeps it in check: "every time it drifts apart it will tighten the things up, and tidy up."
- **The aim.** "A lot of people are writing vibe slop code." If plumber makes that output more tasteful, more
  aesthetic and more consistent, by some real degree, it has done its job.
- **Not a linter.** Old tools "were dumb and they don't know how to handle the case where things do not line up
  exactly". They stop and ask. Plumber judges. "This probabilistic nature is a feature, not a bug."
- **Free in its means.** "I might need to invent novel algorithms, I might need to invent probabilistic nature, I
  might exploit LLMs, as much as I can."

So never measure plumber by what a linter may or may not do. Measure it by what an experienced person would do.

## Two ways plumber looks

### 1. Single decisions, taken with confidence

Font size, corner radius, a colour, a gap. "These are very atomic things. This is one decision only. Every time, one
decision."

- **The move is compression onto the system.** If the spec has 9 text styles and the LLM produced 20, the 20 fold
  into the 9.
- **The decision is made from many signals at once:** the role of the thing, where it sits, the nearest token value,
  and whatever else tells you what it is. "This one decision can be taken confidently if I take a lot of signals into
  account."
- **Plumber then applies it.** It does not hand back a list because two steps were close. More and better signals
  are how it earns the right to decide.

### 2. Craft rules: an expert's eye

"If I show my design to a design engineer who is very experienced, he will just look at it and give me 10–15
suggestions: the icons are not aligned, the content is not aligned." Craft rules are that look, baked in. Each one is
a specialised way of seeing, not a single value snapped to a scale.

**Laws of UX** sit beside them: they are universal, so each one that can be recognised on a page is worth baking in
too.

## Where a suggestion comes from

> "We don't just say 'do this because so many instances'. There has to be a principle behind the suggestion, some way
> of perceiving things, some concept which leads to a suggestion."
>
> "There has to be some sort of industry practice and some sort of data by real engineers working on design systems
> and how frontend processes work. This has to be the driving force."

Every suggestion walks this chain:

1. **A way of seeing.** What the expert notices here.
2. **The principle.** The concept that makes it matter, in a sentence.
3. **The ground it stands on.** "It can be pragmatic: based on code evidence, based on some talk, based on
   documentation, based on industry practice."
4. **The signals.** What plumber reads to recognise it and to decide.
5. **The suggestion.** What the principle asks for here, in the project's own system.
6. **The proof.** Seen working on a real app.

What never stands in for a principle:

- **A count on its own.** "Forty places do this" is a signal at most.
- **A number picked while coding** because it looked sensible.
- **Another tool's caution.** A rule that exists because a tool cannot judge is not a rule for plumber.

*(Claude's reading, to be corrected: the principle must be real and grounded; the mechanism that carries it out may
be invented. An invented mechanism's numbers are tuned on real apps and say so.)*

## How to work

- Start from the expert: what would they see, and why would they say it? Write that first.
- Use practice and evidence to find **which signals make a decision right**, not to decide whether plumber may decide.
- When a decision is weak, the answer is more signals, not a hedge.
- Research goes in `docs/research/`; references in `docs/references.md`.

## Where this came from

On 2026-11-12 Claude made two mistakes in a row. First it added suggestion logic built on made-up counts ("two places
or more", "more than half"), with no principle behind it. Then, asked for principles and sources, it judged plumber
against linters and concluded plumber should stop choosing when several answers fit, which is the opposite of what
plumber is for. Both came from not holding the picture above.

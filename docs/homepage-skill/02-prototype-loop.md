# Homepage craft: the prototype loop

The second layer of the homepage skill. **The skill answers the questions itself, then builds the page one part at a
time on the project's own design system. Each part has to pass a written taste review against the project's own
quality bar, then the owner's review, before the next part starts.** The owner shapes a real page; nobody signs a
document describing a page they can't see.

This works the way Plumber does: the tool carries the judgement and gives a verdict; the person accepts or rejects it.

Status: draft, revised 2026-11-03 after round 1 was rejected. Not reviewed.

---

## 0. Why round 1 failed, and what replaced it

Round 1 (`trial/`) was rejected by the owner: no token came from the project, the interactions and UX were poor,
and the page had no taste. Two causes produced it, and the rules below exist to stop them happening again:

| Cause | What happened | Replaced by |
|---|---|---|
| **It ignored the project's system and world** | The facts step was told not to read the site. The skill invented its own primitives (a font, an off-white, stock shadows) and dropped the project's brand world (the wrench, the stages, the overlay's look). | §2: the project's system is the first input. The page may only use it; new tokens are proposed and reviewed. |
| **It went wide with no taste gate** | Six sections, a demo and a picker built in one pass. The only checks were mechanical (overlap, contrast, a build). Nothing asked "is this good?", and nothing stopped for the owner. | §4–§5: one part at a time, each finished to the bar, critiqued in writing, and reviewed by the owner before the next. |

**Mechanical checks are necessary and never enough.** A part that doesn't overlap, passes contrast and builds can
still be bad. Only the taste gate (§5) decides whether a part is good.

## 1. The order

1. **Read the project** (§2): its system, its world, its quality bar, and the product facts.
2. **Answer the questionnaire** (§6), each answer with a source and a confidence.
3. **Skeleton**: every section as real words in the project's own primitives, with no motion or interaction. This
   checks the argument and the order. The owner reviews the skeleton.
4. **One part at a time, to the bar** (§4), each through the taste gate (§5), starting with the hero's signature
   moment.
5. **Whole page**: rhythm, performance, accessibility, and the measured rules.

## 2. Read the project first

Before any answer or any pixel, the skill writes `system.md`: an inventory of what the page must be built from.
Every entry has a source.

| Read | Where (look for all of these) | Becomes |
|---|---|---|
| **Tokens** | The theme (`@theme`, `:root`, tokens JSON), the site's stylesheet, the design-system docs | The only colours, type, spacing, radius, elevation and motion values the page may use |
| **Components** | The site's and product's components, the overlay's surfaces | The parts the page reuses or extends before making new ones |
| **The world** | Brand docs, the existing site, mascots, illustrations, logo files, the product's own visual language | The images, metaphors and characters the page keeps |
| **The quality bar** | Written bars in design docs (for Plumber: the overlay's reading card); the project's best existing surface | What every part is judged against (§5) |
| **Motion grammar** | Named springs and timings already in the project | The only springs and durations the page may use |
| **Product facts** | README, docs, code, changelog, benchmarks | The questionnaire's sources |

**Decided by the owner, 2026-11-03:**
- The skill makes a **new** homepage.
- The old homepage is **knowledge to learn from** (its patterns, interactions, taste and the judgement in HOMEPAGE.md). It's read, and never edited.
- The new page's primitives are **the product's own design system**. For Plumber, that's the overlay's tokens and drawing language: `overlay/src/tokens.css`, `overlay/src/language.js`, the glyphs, and the gallery at `overlay/demo/primitives.html` (at the "Calm 20%" strength, light and dark).

| # | Rule | Why |
|---|---|---|
| 1 | **The project's system first, always.** Read the site, the theme and the brand docs before anything else. Never exclude them, even to run a "blind" trial. | Taste lives in the project's system and its world. A page built without them can only be generic. |
| 2 | **Use only the project's tokens.** A value the system doesn't have is proposed as a new token, with its reason, and reviewed by the owner before it's used. | That's the rule Plumber enforces on everyone else. A homepage that breaks it is the product failing its own test. |
| 3 | **Keep the world.** Mascots, metaphors and visual language the project already has are kept unless the owner retires them. | The world is what makes the page recognisably this product. |
| 4 | **Name the bar in writing** before building, with the surface it comes from. | You can't review against a bar nobody wrote down. |

## 3. Answers come from the reading

The skill fills the questionnaire (§6) from `system.md` and the product facts. Each answer has the answer itself, a
source, and a confidence: *sure* (the project says it), *likely* (strong inference) or *guess* (judgement). Guesses
are asked first in review.

| # | Rule | Why |
|---|---|---|
| 5 | **Specific, even if wrong.** | A specific wrong answer is corrected in one line; a vague one stays vague. |
| 6 | **Never invent evidence.** No quotes, users, logos or numbers that don't exist; no block for missing proof. | The page is only as honest as its evidence. |
| 7 | **Ask for the second strength too** (Q11b). | Round 1 picked one best claim and lost a real strength ("one fix, every site") that deserved its own section. |

## 4. One part at a time, to the bar

A part is one thing: the hero's demo, a section's interaction, the copy button. Each is finished before the next
starts.

For each part, before writing code, the skill writes a **part brief** (Interface Craft's concept packet):
- what the visitor does with it and what they should understand afterwards;
- the verb, the object, and before → transition → after;
- every state: rest, hover, focus, pressed, disabled, loading, error, empty, selected, and the transitions between
  them;
- motion: each movement named (animation-vocabulary), its trigger, its spring from the project's grammar, and why
  it moves (it shows a change, explains something, or rewards an action);
- the tokens and components it uses from `system.md`;
- reduced motion, keyboard, screen reader, touch and phone;
- the nearest generic version it must not look like.

| # | Rule | Why |
|---|---|---|
| 8 | **Depth first.** Never start a second part while the first is unfinished or unreviewed. | Round 1 went wide, and every part came out half-thought. Quality lives in the last 20% of each part. |
| 9 | **Brief before code.** If the skill can't say why a shape exists or why something moves, it doesn't build it yet. | Motion without a reason is decoration; the brief finds that before it's built. |
| 10 | **Reuse before inventing.** A part starts from the project's own components and extends them. | The project's components already carry its taste. |
| 11 | **Forks as variants, in place.** Where a part's answer is a guess, build 2–3 variants that differ on one axis, behind the picker. | The owner compares real options instead of imagining them. |

## 5. The taste gate

Every part passes three checks in order. A failure at any one sends the part back; the next part doesn't start.

1. **Mechanical** (necessary, never enough): no overlap or overflow, contrast, keyboard path, reduced motion,
   phone, no console errors, the measured rules in `01-knowledge`.
2. **Written critique against the bar.** The skill screenshots the part at rest and in each state, puts each next
   to the bar's surface (§2), and writes a critique with Interface Craft's design-critique: hierarchy, type, spacing,
   colour, motion feel, detail where the eye lands, and how it compares to the bar. Each problem gets a fix, and the
   fix is applied and re-screenshotted. The critique is shown to the owner with the screenshots.
3. **Owner review.** The owner judges the part on the page. Only the owner can say a part is good.

| # | Rule | Why |
|---|---|---|
| 12 | **The skill never claims a part looks good.** It reports what it checked, the critique, and what it couldn't judge. | Aesthetic approval is the owner's. Self-approval is how round 1 shipped work nobody had judged. |
| 13 | **Critique against the project's bar, not against "works".** | "It works" was the only test round 1 passed. |
| 14 | **Show the evidence.** Every critique comes with the screenshots it was made from, in each state. | The owner can check the critique, not just trust it. |

## 6. The questionnaire

*Fork* marks questions whose answer changes the page's shape: when the skill's answer is a guess, it builds
variants for them.

| # | Question | Fork | Changes on the page |
|---|---|---|---|
| Q1 | Who is the one person this page is for, in a situation? | | Hero subhead, examples, the proof chosen |
| Q2 | Where do most of them arrive from? | | How much the hero explains |
| Q3 | How much do they know when they land? | fork | What the page opens with: the problem, the product, or the proof |
| Q4 | Who decides to adopt it? | | Whether buyer proof gets a section |
| Q5 | What are they trying to get done, as an outcome? | | Subhead; section headings as outcomes |
| Q6 | What do they do about it today? | | What the page argues against |
| Q7 | What doubt would stop them trying it? | fork | Which section answers it, and how high it sits |
| Q8 | What one action counts as success? | | Every primary button |
| Q9 | How cheap can the first step be, and what removes its risk? | | The line under the button |
| Q10 | What would the visitor call it, in words they'd search? | | Category words in the hero, title and meta |
| Q11 | What is it best at? | fork | The headline, and which section comes first |
| Q11b | What else does it do that nothing else does? Does that deserve its own section? | | The sections after the hero |
| Q12 | Why now? | | One line of context, or none |
| Q13 | What will they mistake it for? | | A "not a ___" line, if needed |
| Q14 | What proof exists today? | | Which proof blocks exist at all |
| Q15 | What should a visitor tell a friend about this page? | fork | The hero's signature moment |
| Q16 | What's the quality bar, and which pages set it? | | What the taste gate judges against (§5) |
| Q17 | How does the page sound? | | Copy throughout |
| Q18 | What does the project's system and world already have? (from `system.md`) | | The only primitives, components and characters the page uses |
| Q19 | How long is the page? | | The number of sections |

## 7. In the repo

The page lives in the project's existing site, on its own stylesheet and components, never in a separate project
with its own primitives.

```
<site folder>/
  src/sections/<Name>.jsx    one file per section
  src/variants/              variants behind the picker; removed once one is chosen
  system.md                  what the page is built from, with sources (§2)
  DECISIONS.md               the answers, with source and confidence; updated by every review
  CRITIQUE.md                each part's written critique and screenshots (§5)
```

The picker is dev-only. One dev server, stopped when the session ends.

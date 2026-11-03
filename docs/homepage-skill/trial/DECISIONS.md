> **Rejected by the owner, 2026-11-03.** No token came from the project; the interactions, UX and taste were poor. Causes and the process that replaces this one: `../02-prototype-loop.md` §0. Kept only as the record of what went wrong; the page in `prototypes/homepage-trial` is not a starting point.

# React Plumber homepage: decisions (round 1, answered by the skill)

Every answer was filled by the skill from `facts.md` (sources there) and the rules in `../01-knowledge.md`.
Confidence: **sure** (the product's own docs or code say it) · **likely** (strong inference) · **guess** (judgement,
little evidence). Round 2 asks about guesses first.

**Disclosure:** the skill had read the existing homepage's design doc (`site/HOMEPAGE.md`) earlier in this session,
before this trial began. Answers are sourced from the product, not from that page, but the trial isn't blind.

---

## Visitor

- **Q1 · Who:** a front-end engineer on a React + Tailwind v4 team that has a theme. Their UI keeps collecting
  one-off values (`p-[13px]`, `text-[#5f6368]`), more and more of them written by a coding agent. The design-system
  owner is the second reader.
  Source: README:29; ROADMAP:45-147, 129 · **likely**
- **Q2 · Arrives from:** the GitHub README, a launch post on X or Hacker News, and agent-tooling threads.
  Source: judgement (open-source dev tool, keywords include ai-agents) · **guess**
- **Q3 · Knows:** they know what a linter is and what a design system is. They haven't seen a tool that judges the
  compiled CSS and fixes it on the page. → **open with the product, not the problem.**
  Source: R3; the category is new but its parts are familiar · **likely**
- **Q4 · Decides:** the engineer tries it alone, with no signup. The design-system owner approves exceptions in CI.
  No buyer section.
  Source: MIT, free (LICENSE); `ledger-approvers` (README:330) · **sure**

## Job and doubt

- **Q5 · Job:** they want the UI to stay on the system without checking every pull request by eye, so the product
  keeps looking like one product, whoever (or whatever) wrote the code.
  Source: ROADMAP:9-20 · **likely**
- **Q6 · Today:** review comments and eyeballing, a string-based lint that floods them (a raw run over a real system
  gave 4,218 findings, about 95% noise), or nothing.
  Source: ROADMAP:9-20; DESIGN:5 · **likely**
- **Q7 · Biggest doubt:** "It'll flag a thousand things on our existing app, and we'll turn it off." → answered by the
  third section, high on the page.
  Source: ROADMAP:31 ("Nobody is forced to pay old debt to adopt it"); DESIGN:5 · **likely**

## Action

- **Q8 · Success is:** install it and run `npx plumber` on their own app.
  Primary action everywhere: copy `npm install -D @unlocalhosted/react-plumber`.
  Source: README:24, 51 · **sure**
- **Q9 · First step:** the first run only reads. It exits 0 and writes nothing to your code; it keeps a cache in a
  git-ignored folder. Line under the button: "The first run only reads. Nothing in your code changes."
  Source: facts §6.1 (run on a fixture copy) · **sure**

## Positioning

- **Q10 · Shelf:** "a design-system linter for React and Tailwind". The page says "linter" once, then shows why
  it's more than one.
  Source: package.json keywords (lint, design-system, tailwind) · **likely**
- **Q11 · Best at:** you see what's off on the running page, pick a value from your own theme, and it writes the class
  into your JSX. → **fork: three heroes behind the picker.**
  - **A (recommended):** "See what's off your design system. Fix it on the page." (the overlay)
  - **B:** "Your agent writes the UI. Plumber keeps it on your system." (the agent loop)
  - **C:** "Checks the CSS, not the class names." (the compiled-CSS judgement)
  Source: VISION:3 ("You point at a pixel and reach the code that drew it"); ROADMAP:129; README:29 · **guess**
  between the three
- **Q12 · Why now:** coding agents write most new UI, and they invent values faster than anyone can review them. One
  line in the agent section, not in the hero.
  Source: ROADMAP:129, 147 · **sure**
- **Q13 · Mistaken for:** a class-sorting or class-name lint. → the second section shows four spellings of one
  value (a class, an arbitrary value, `@apply`, an inline style) getting one answer.
  Source: DESIGN:9; README:29 · **likely**

## Evidence (usable today)

- The product's real behaviour, shown in a working demo in the hero, labelled as a demo · usable
- First run reads only, exits 0 · facts §6.1 · usable
- The baseline: on a large real design system, 5,743 recorded entries and "0 new"; check exits 0 · BENCHMARK:1216 ·
  usable, labelled as the maintainer's own project
- About 1 second for a warm check on that system, about 4 seconds cold, on a laptop · BENCHMARK:1135-1140 · usable,
  with the caveat
- 77 checks: 62 craft checks and 15 habits · `plumber spec` · usable
- 7 agent targets: Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf, and AGENTS.md · install.ts:11 · usable
- Dev only: production builds carry no Plumber code by default · README:77; vite.ts:100 · usable (say "by default")
- Guarded writes: checked against the file on disk, one undoable write per file · README:99-105 · usable
- MIT, v0.2.0 (2026-10-28) · usable
- **Missing:** named users, quotes, logos, stars and downloads (not checked), a hosted CI run, bundle size, a
  no-telemetry statement. → **no testimonial, logo or stats-wall blocks.**

## Taste

- **Q15 · The memorable move:** "I pressed one key, the page showed me what was off, and when I picked a value, the
  class changed in my file." → the hero is a working demo of exactly that.
  Source: README:88-105 · **likely** (the form of the demo is a fork for round 2: simulated vs the real overlay)
- **Q16 · References:** Linear (restraint; the product is the hero), Stripe's docs (code shown precisely), Raycast
  (a dev tool with personality and no marketing voice).
  Source: judgement · **guess**
- **Q17 · Voice:** plain and precise. Short sentences, "you", no internal words: not "drift", "cause", "finding",
  "site", "verdict" on screen; "off your scale" and "not in your theme" instead.
  Source: docs/copy/voice.md (rule 7); better-writing · **sure**
  *Note:* "drift" is the README's headline word and the word people search for. The page uses it once, in the page
  title and meta description, and never in body copy. · **likely**
- **Q18 · Keep:** the name React Plumber and `plumber`; the builder's line ("whether a wall is vertical") as the one
  image; the overlay's own visual language (off = amber heat, padding = green hatch, margin = orange dots, gap =
  purple stripes), so the page teaches the product's look.
  Source: DESIGN:3; README:88-103 · **likely**
- **Q19 · Length:** medium. Six sections and a footer.
  Source: R20 (aware visitors, free, one-command first step) · **likely**
- **Q20 · Visual direction:** → **fork: two directions behind the picker**, as token sets on one page.
  - **Paper (recommended):** warm off-white, ink, one plumb-line red for action. Calm, like a well-made manual;
    the amber and the encodings stand out because nothing else is coloured.
  - **Night:** near-black, the same roles. Closer to the editor the visitor lives in; the heat glows.
  Source: judgement · **guess**

## Structure

The visitor's questions, in order, one claim per section:

| # | Heading (a claim) | Answers | Interaction |
|---|---|---|---|
| 1 | Hero: Q11's headline | What is it? Does it work? | Fix a drifted card: show what's off, pick a value, see the line in the file change |
| 2 | One answer, however you wrote it | Is it another class-name lint? (Q13) | Switch between four spellings of 13px; the answer stays the same |
| 3 | Starts quiet on an old app | Will it flood us? (Q7) | Run it, record what's already there, then add one change: only that one fails |
| 4 | Your agent checks its own work | Why now? Does it work with my agent? (Q12) | A short agent loop that ends at "0 new"; the seven agents |
| 5 | Things you can check | Why believe it? (Q14) | None: four facts, each with where it's from |
| 6 | Try it on your app | What now? (Q8, Q9) | Three commands to copy |
| — | Footer | Where's everything else? | Links |

Read as a story: *you can see and fix what's off → it understands any way you wrote it → it won't flood you → your
agent can use it too → here's proof → try it.* Answers agree: visitor (Q1) → doubt (Q7, section 3) → claim (Q11,
hero) → proof (Q14, section 5) → action (Q8, everywhere).

## Open for round 2 (guesses first, biggest effect first)

1. Q11: which hero claim (A, B or C)
2. Q20: Paper or Night
3. Q15: the hero demo, simulated (built) or the real overlay running in demo mode
4. Q2: where visitors come from (changes how much the hero explains)
5. Q16: the reference pages

---

## Round 1 result (2026-11-03)

Built in `prototypes/homepage-trial` (run: `npx vite` there, port 4341). Dev-only picker: hero claim A/B/C, look
Paper/Night. Production build excludes the picker.

**Checked in the browser:**
- The hero demo end to end (show, try, take, write), including fast keyboard use.
- Every section in both looks.
- 375px phone: no page-level horizontal scroll, and the demo card stays in its frame.
- Text contrast: every content colour is ≥ 4.6:1; line numbers are decorative.

**Not checked:** reduced motion in a browser (code paths only), screen-reader pass, performance (JS is 119 kB gzip,
mostly motion).

**Bugs found and fixed while building:**
- The fix panel covered the card it was fixing.
- A dark-mode visitor saw the light page flash first.
- Taking values quickly left the panel stuck on the first value (AnimatePresence `wait`).
- The demo card overflowed its frame on phones.

**Against the existing homepage (the answer key):**
- *Same conclusions:*
  - the hero is "fix it yourself on the page, then see the file change";
  - the baseline answers the biggest doubt;
  - proof is checkable facts with no testimonials;
  - install is a few commands with what each one changes.
- *Trial adds:*
  - "One answer, however you wrote it" (compiled CSS);
  - a dedicated agents section.
- *Trial missed:*
  - **"One fix, every site"**: one decision moves every place the value is used. The questionnaire chose one best
    claim (Q11) and nothing asked for the *second* strength worth a section. → Add Q11b: "What else does it do that
    nothing else does, and does it deserve its own section?"
  - **The brand world** (the wrench mascot, stickers, the blue stages). The facts step deliberately skipped `site/`,
    and the mascot appears in no product doc. → The facts step must read existing brand assets (site, logo files,
    design docs), not just product docs.

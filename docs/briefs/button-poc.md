# Button proof of concept: from every public button to one you'd ship

Plan for the proof of concept. Written 2026-11-20, after the owner asked for an end-to-end plan from the person driving it.

## The goal

Crafting attention's buy button, "Get Lifetime Access", gets four or five alternatives. Each one:

- is grounded in real, well-built buttons from public libraries, not invented;
- is rebuilt in crafting attention's own code: its tokens, its button, its pixel arrow, its motion;
- passes the quality bar in every state;
- comes with one line on why a designer would pick it for this moment.

**The proof is the owner's verdict.** The proof of concept works if the owner would ship at least one of the five, and can say what's wrong with the others. Two secondary numbers: how many of the five pass the bar first time, and how long one variant takes to make.

The scope is fixed: one atom (the button), one product (crafting attention), one moment (buying lifetime access). Other atoms, products and automation come after the verdict.

## The stages

Each stage ends with a check that says it's done. Only three points stop for the owner (marked **Owner**); the rest I run and report.

### 1. Clean data (in progress)

- Done:
  - every healthy registry harvested (3,379 unique parts from 312 registries);
  - fields read from source, with the line each value came from;
  - kinds separated: a button, a group, contains a button, not a button, an example;
  - accuracy measured on a held-out sample: driver, commit rule and reduced motion right on 6 of 6; kind 9 of 10; words and tricks 3 of 5;
  - near-duplicate families folded in.
- Doing: GitHub stars for each library, as a quality weight (the owner's call).
- Left:
  - mark words and tricks as low-confidence;
  - write the datasheet (`generator/data/BUTTONS.md`): sources, method, accuracy per field, known bias.
- **Done when** the datasheet exists and every field has an accuracy figure or a "low confidence" mark.

### 2. A quality weight for every part

The data mostly lets you rank parts, not filter them. Each part gets one weight, so the best examples of each idea come first. The weight is made of:

- its library's GitHub stars (log scale, so 10k stars doesn't drown out 1k);
- its registry's health score;
- whether it handles reduced motion and the keyboard;
- in stage 3, whether it renders and passes the bar.

**Done when** the top 20 by weight look like what a designer would call well built. I check that by eye and say so.

### 3. Render and record the best few hundred (on vm-agent)

- The top 300 buttons and groups by weight, one per family, are rendered in the neutral sandbox: shadcn's standard tokens and the common packages, with imports rewritten.
- Each is driven through its gesture and recorded frame by frame, then judged by the quality bar on its own neutral skin.
- This runs on vm-agent, not the laptop.
- **Done when** I know the render rate (how many of the 300 render at all), and every rendered part has measured motion numbers and a bar result. Parts that don't render are kept, marked "not rendered".

### 4. From parts to ideas

- The rendered parts are grouped into button ideas by what they do: driver, commit rule, what the words do, and the trick. For example: "hold, with a fill that grows, words that flip at its edge".
- I expect 15 to 25 ideas.
- Each idea gets:
  - its best three examples by weight;
  - its typical numbers, measured, not read from code: how long it takes, how bouncy it is, how long it settles;
  - its feel;
  - where it fits and where it doesn't.

  This extends the recipe format we already have.
- **Owner:** review the catalogue of ideas, the first taste checkpoint. I need to hear which ideas look wrong or cheap, and which you'd never use.

### 5. Match ideas to the moment

- The moment, written as data:
  - a one-time payment (high stakes, can't be undone);
  - a first-time visitor browsing a marketing page;
  - on any device.
- Crafting attention's character, also as data:
  - crafted but calm;
  - motion that doesn't bounce;
  - pixel and dither materials;
  - one violet action colour.
- The ideas are ranked against both, with a reason for each.
- **Owner:** approve the shortlist of four or five, the second checkpoint.

### 6. Build each variant natively

- I write each shortlisted idea as a real component in crafting attention's code. That means its tokens, its button classes, its pixel arrow, and its motion habits: no bounce, its own eases.
- I read the idea's two or three best real examples first, as reference.
- For the proof of concept, I write them myself, so no paid API is needed. Automating this step with the API is a decision for after the verdict.
- Each variant goes on the atoms page, beside the shipped button.
- **Done when** all five render on crafting attention's atoms page.

### 7. Judge and fix

- Each variant goes through:
  - the quality bar (says what it does, progress shows, nothing leaks, fits, keeps its weight);
  - plumber's design checks;
  - a recording compared with its idea's typical numbers.
- What fails gets fixed and judged again.
- **Done when** every variant passes, or I say plainly why one can't.

### 8. The verdict

- **Owner:** pick, reject, and say why. Each answer is saved as a label: the context, the idea, keep or drop, and the reason. That's the first real training data.
- I write the journey entry, with before and after shown.
- I then recommend whether to scale and in what order: more atoms, the other three products, or automating stage 6 with the API.

## Risks

- **The render rate in stage 3 is unknown.** Parts import pieces the sandbox may not have. If fewer than about half render, the ideas in stage 4 rest on read data alone, and I'll say so.
- **The data is one ecosystem.** shadcn libraries share a look. Ideas outside it (native app patterns, games) are missing.
- **Feel and fit are one rater's judgement (mine)** until the owner's verdicts exist.
- **Stars are a rough proxy.** A homepage can link the wrong repository, and a famous library can ship a weak part. Stars are a weight, never a filter.
- **Words and tricks are only about 60% accurate.** Ideas that depend on them are checked against the rendered recording, not the read field.

## Not in this proof of concept

- No training. A ranking model waits until enough of the owner's verdicts exist to learn from.
- No paid API runs. The owner approves that spend after the verdict.
- No other atoms or products.

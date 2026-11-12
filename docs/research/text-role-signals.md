# What a text place's role is read from

2026-11-12. Written before any code, as `docs/PRINCIPLES.md` asks. It answers one question: when plumber folds an
app's text onto its text styles, what should it read to decide which style a place is? Today it reads the size and
whether the text is capitals, and nothing else (`src/rules/type-roles.ts`, `roleFor`).

Nothing here sets a number or a weight. Where something is my own reading, it says so.

## 1. The way of seeing

Show a screen to an experienced designer and ask "what is this piece of text?". They do not answer "17 pixels". They
answer "the card's title", "a button label", "the intro paragraph", "a caption". They read the job first. The size is
how the job was dressed, and it is the part an LLM gets wrong.

## 2. The principle

**A text style names a job. The size belongs to the job, not the other way round.**

Ground:

- **Material's type scale is built on this.** Its styles "are organized into roles that describe their purpose."
  ([material-web, typography](https://github.com/material-components/material-web/blob/main/docs/theming/typography.md),
  read first-hand.) The role names plumber already uses (display, headline, title, body, label) are these.
- **Material defines each role by use, not by size.** Display is "reserved for short, important text or numerals";
  labels are "smaller, utilitarian styles, used for things like the text inside components … Buttons, for example, use
  the label large style." *Second-hand:* these are quoted in search results from Angular Material's guide and a Stack
  Overflow answer; Material's own page (m3.material.io) would not load, so I have not read them at the source.
- **HTML says the job in the tag.** `h1`–`h6` "represent six levels of section headings"; `p` "represents a
  paragraph"; `label` is "a caption for an item in a user interface"; `figcaption` is "a caption or legend";
  `th` is "the header of a group of table cells"; `small` is "side-comments and small print … independent of its
  styled presentation". ([MDN, HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements))
- **Plumber's own design already says it.** `docs/design/token-spec.md` §2.1: "every text element is read with its
  context (tag, landmark, content shape, how often it repeats)". The engine that was built reads none of the four.

## 3. What size alone gets wrong: crafting-ui, measured

Data: the measurement from 2026-10-31 (`bench/type-roles/`, 550 text places inside the system, read in a real
browser with each place's tag, what it sits inside, the shape of its words and its line count). I ran today's
size-and-capitals rule over those places and compared it with what each place says about itself.

| What the place is, by its own account | Places | What size alone calls them |
|---|---|---|
| A paragraph (`<p>`) | 106 | body 68 · **a heading kind 37** · label 1 |
| A heading (`<h1>`–`<h6>`) | 66 | a heading kind 58 · **label 6 · body 2** |
| A control or caption by tag (button, label, link, summary, `th`, `dt`, `kbd`, figcaption, or inside a button) | 80 | label 51 · **body 23 · a heading kind 6** |
| Words that are a sentence | 157 | body 112 · **a heading kind 43** · label 2 |
| Text that runs three lines or more | 110 | body 67 · **a heading kind 28 · label 15** |

("A heading kind" is display, headline or title.)

What that looks like:

- **A paragraph named a title.** "A dark shape behind a sheet of frosted glass, acting out wha…": a `<p>` in a page
  header, three lines, 19px. Size calls it *title-large*. It is the page's intro paragraph.
- **One size, four jobs.** At 17px: a card's name in a link ("Saar Oz", semibold), a section heading (`<h2>` "The
  reference"), a two-line paragraph, and an eight-line paragraph in a header. Size gives all four one role.
- **Where the signals disagree with each other.** `<h3>Part 01</h3>`, 12px, capitals. The tag says heading; the look
  says label. A person would call it an eyebrow. This is a judgement, and it is the owner's.

Command, for the record:
`node bench/type-roles/signals.mjs bench/type-roles/measurements.roles.json` (the script reimplements `roleFor` and
tallies by tag, surroundings, word shape and lines).

**A correction to the earlier research.** `docs/research/type-roles.md` §2 says its roles were "clustered on the
bundle *and* its context". Its script (`bench/type-roles/roles.mjs`, `assign`) assigns by size, weight and capitals;
context was only printed beside each role. So context has never driven the decision, in the research or the engine.

## 4. The signals

Each is something an experienced person reads, with what it stands on and what the data showed.

| Signal | What it tells you | Ground | In crafting-ui's data | Does plumber have it? |
|---|---|---|---|---|
| **What the author called it**: the tag | The job, stated outright, when the author bothered | HTML's definitions (above) | Headings and paragraphs are clear; but 295 of 550 places are a plain `<span>`, which says nothing | Collected per place; unused |
| **What it sits inside**: a button, a link, a list row, a table, a figure, a page header | Text inside a component is that component's label | Material's label role (second-hand quote); HTML | 80 places are a control or caption by tag; size sends 29 of them elsewhere | "In a list" is collected, unused; the rest is not collected by the engine (the 10-31 measurement has it) |
| **What the words are**: a sentence, a phrase, a number; how many lines | Reading text is sentences and runs on; a title or label is a short phrase | Material: display is "short, important text or numerals" (second-hand); the split in the data | 43 of 157 sentences, and 28 of 110 long runs, are called headings by size | Not collected by the engine |
| **Size against its neighbours** | A heading is the larger thing above smaller things; hierarchy is relative | No source read yet | Measured on 10-31 (ratio to parent and to siblings); not analysed here | Not collected by the engine |
| **Size, weight, capitals, letter spacing** | How the job was dressed | It is what Material's scale sets per role | What is used today | Yes |
| **How often it repeats** | A row of a list, not a one-off | Plumber's own design (§2.1) | Not analysed here | Elements per place is collected |

## 5. What follows, and what does not

**Follows from the principle (my reading):** the role names already have two parts, a kind and a step: *title* +
*medium*, *label* + *small*. The kind is the job; the step is the size within that job. So the job signals (tag,
what it sits inside, what the words are) should decide the kind, and size should only choose the step inside it.
Today size decides both.

**Does not follow from anything read so far, and is not decided here:**

- How to settle it when signals disagree (the 12px capital `<h3>`). The owner's call, or a rule that needs its own
  ground.
- Any numbers: how many lines make reading text, how much larger than its neighbours makes a heading.
- Whether the unsure ones go to a model's eye (plumber already has one for craft's unsure findings).

## 6. What this does not yet know

- **One app, and a hand-written one.** crafting-ui is the owner's own careful code. LLM-written UI probably uses
  fewer real headings and more `<div>` and `<span>`, which would make the tag weaker and the other signals matter
  more. Not measured.
- **Material's own wording** was read second-hand. Apple's text styles page would not load either.
- **Size against neighbours** has data on disk and was not analysed.

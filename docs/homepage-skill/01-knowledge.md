# Homepage craft: the knowledge a good homepage takes

What an experienced product designer, marketer and front-end engineer carry in their heads when they make a homepage.
Written from memory, with no research, as the first layer of a homepage skill. It mirrors `docs/craft/rules.md`: each
rule says what to do, why, and how it can be checked.

**Check:** ✓ measurable on the rendered page or in source · ~ read by a model against the rule (a judgement with a
rubric) · ? asked of the owner in the interview, because only they know · ✗ pure taste, taught by example.

Status: draft, 2026-11-03. Not reviewed.

---

## 0. The kinds of knowledge

A good homepage needs eight kinds of knowledge. Most bad homepages are missing one kind entirely, and that missing kind
explains most of what is wrong with them.

| Kind | What it is | Where it lives | How the skill uses it |
|---|---|---|---|
| **1. Situation** | Who lands, from where, knowing what, wanting what | The owner's head; analytics | Interview questions (?) |
| **2. Positioning** | What the thing is, against what, for whom, and why now | The owner's head, usually unclear even to them | Interview, then a one-paragraph positioning statement both sides sign |
| **3. Argument** | The order of the visitor's questions, and one answer per section | Pattern knowledge | Structure proposal; section order rules (~) |
| **4. Genre** | What this kind of product's audience expects (dev tool, B2B SaaS, consumer app, studio, personal) | Pattern knowledge | Picks the default blocks and the tone |
| **5. Copy** | Words: specific, plain, in the visitor's language | Craft | Copy rules (~), banned-word lint (✓) |
| **6. Proof** | Why the visitor should believe any claim | Craft plus the owner's real evidence | Interview for evidence (?), placement rules (~) |
| **7. Visual and motion craft** | Hierarchy, type, rhythm, imagery, interaction | Craft; the existing Plumber rules | Plumber lints (✓), visual rules (~) |
| **8. Technical quality** | Speed, accessibility, responsive, sharing and search metadata | Engineering | Measured (✓) |

Above these sits **taste** (section 9): the judgement of when a rule applies, which convention to break, and where
the one memorable move goes. Taste can't be linted, but it can be made into questions and calibrated with examples.

---

## 1. Situation: who is landing, and why

| # | Rule | Why | Check |
|---|---|---|---|
| 1 | **Name the visitor before anything else.** One primary visitor, written as a person in a situation ("a front-end lead whose design system drifts after every sprint"), not a demographic. | A page for everyone is specific to no one. Every later decision (words, proof, CTA) is settled by asking what this person needs. | ? |
| 2 | **Know where they come from.** Search, a tweet, Hacker News, a colleague's link, a conference talk, an ad. | Each source arrives with different context. A Hacker News reader arrives sceptical and wants the mechanism; a search visitor arrives with a problem and wants to know if this solves it. | ? |
| 3 | **Know how aware they are.** Unaware of the problem → aware of the problem → aware of solutions → aware of this product → ready to act. | The less aware the visitor, the more the page must open with the problem; the more aware, the faster it should get to the product and the action. Most homepages pitch at the wrong level. | ? |
| 4 | **Separate the user from the buyer.** The engineer who installs it may not be the manager who approves it. | They need different proof: the user wants "it works and it's pleasant"; the buyer wants "it's safe, it pays, others use it". Decide which one the page serves first. | ? |
| 5 | **Name the job, not the feature.** What is the visitor trying to get done when they reach for something like this? | People don't want a linter; they want reviews that stop arguing about 13px. Features are evidence the job gets done. | ? then ~ |
| 6 | **Know the one action that counts as success.** Install, sign up, book a call, star, subscribe, buy. | The page is built backwards from that action. Two equal goals make two half pages. | ? |
| 7 | **Know the visitor's biggest doubt.** "Will it work on my messy repo?", "Is it another tool to maintain?", "Is it priced for us?" | The strongest pages put their best answer to that doubt high on the page. | ? |

## 2. Positioning: what this is, against what

| # | Rule | Why | Check |
|---|---|---|---|
| 8 | **Say what category it is in, in the visitor's words.** "A linter for your design system" beats "an AI-native consistency platform". | People file new things under something they know. If the page doesn't name the shelf, the visitor guesses, often wrong. | ~ |
| 9 | **Know the real alternative.** Usually not a competitor: it's doing nothing, a spreadsheet, a code-review comment, an intern. | The page must beat what they do today. Comparing against a competitor they've never heard of wastes the space. | ? |
| 10 | **One thing it's best at.** Pick the one claim the product wins outright, and lead with it. | Five equal claims read as none. A visitor remembers one thing from a homepage. | ? then ~ |
| 11 | **The swap test.** Put a competitor's name on your headline. If it still reads true, it says nothing. | Generic claims ("fast, simple, powerful") are true of everything and believed of nothing. | ~ |
| 12 | **Why now.** What changed (AI agents, Tailwind v4, a new regulation) that makes this matter today? | A reason for now is what turns "interesting" into "I'll try it this week". | ? |
| 13 | **Say what it isn't.** One line ruling out the wrong reading ("not a design tool, it works on your code"). | It removes the most likely misunderstanding faster than more explaining would. | ~ |

## 3. Argument: the order of the visitor's questions

A homepage is an argument the visitor reads in their own order. Each section answers one question, in the order the
questions arise.

The default order of questions:
1. What is this? Is it for me? *(hero)*
2. Does it really work? Show me. *(product shown, demo)*
3. How does it work? Is it hard? *(how it works, in 3 steps or fewer)*
4. What will it do for me in particular? *(the main benefits, as outcomes)*
5. Why should I believe you? *(proof)*
6. What will it cost me: money, time, risk, lock-in? *(pricing, setup, safety)*
7. What do I do now? *(final CTA)*

| # | Rule | Why | Check |
|---|---|---|---|
| 14 | **One idea per section.** A section has one claim, said in its heading; everything in it supports that claim. | Two ideas in a section blur into neither. The heading list becomes the page's outline. | ~ |
| 15 | **Headings are claims, not labels.** "One fix, every site" beats "Features"; "CI keeps it true" beats "Integrations". | A label tells you what kind of content is coming; a claim tells you what to think. Scanners read only headings. | ~ (labels list: Features, Benefits, Why us, How it works) |
| 16 | **The headings alone tell the story.** Read only the section headings, top to bottom: the argument should survive. | Most visitors scan headings and look at pictures. The heading list is the page for them. | ~ |
| 17 | **Order follows doubt, not the org chart.** Sections come in the order the visitor's questions arise, not in the order the team built features. | Product teams order by what they're proud of; visitors read by what they're worried about. | ~ |
| 18 | **Every section earns its place.** Ask of each: if it were gone, would the visitor miss an answer? If not, cut it. | Each extra section dilutes the ones that matter, and makes the page feel like a brochure. | ~ |
| 19 | **Show before tell.** The product appears before any paragraph explaining it. | Seeing is quicker to understand and harder to doubt. A paragraph about a product nobody has seen is abstract. | ~ |
| 20 | **Length follows awareness and price.** A free dev tool for aware visitors can be short; an expensive product for unaware buyers needs a long page. | Long pages aren't bad; unanswered doubts are. The page needs exactly as many sections as there are real doubts. | ? |
| 21 | **The end repeats the action.** The last section restates the promise in one line and offers the same primary action. | Visitors who read to the end are the most convinced; don't make them scroll back up. | ✓ (final section contains the primary CTA) |

### 3.1 The block catalogue

Blocks a homepage is built from, what question each answers, and when it's worth including.

| Block | Answers | Include when | Common failure |
|---|---|---|---|
| Announcement bar | What's new? | There is real news (a launch, a version) | Permanent, stale, or a discount nobody asked for |
| Navigation | Where can I go? | Always | Too many items; no primary action in it |
| Hero | What is it, is it for me, what do I do? | Always | Vague headline; abstract art instead of the product |
| Logo strip | Who else uses it? | The logos are recognisable *to this visitor* | Unknown logos, or logos without permission |
| Problem | Do you understand my pain? | The visitor is problem-aware but not solution-aware | Exaggerated pain; too long |
| Product shown / demo | Does it really work? | Almost always | A video nobody plays; a fake UI |
| How it works | Is it hard? | Setup is a real doubt | More than 3–4 steps; steps that are features |
| Benefits / feature sections | What will it do for me? | Always, one per main benefit | A grid of 9 equal icons with 2-line blurbs |
| Use cases / personas | Is it for someone like me? | Several distinct audiences | Personas the product doesn't really serve |
| Comparison | Why this and not X? | The visitor is actively choosing | Unfair tables; comparing to the wrong alternative |
| Integrations | Does it fit my stack? | Fit is a real doubt | A wall of logos without saying how deep each goes |
| Testimonials / case study | Do people like me succeed with it? | There are real, specific ones | Vague praise; no name, face or role |
| Numbers | Is it big / fast / proven? | The numbers are real and meaningful | Vanity metrics; unverifiable figures |
| Security / compliance | Is it safe to adopt? | B2B, data-handling, or dev tools in CI | A badge wall with no explanation |
| Pricing teaser | What does it cost? | Price is a deciding doubt | Hiding price when everyone will ask |
| FAQ | What about…? | There are recurring objections | A dumping ground for things that belong in sections |
| Final CTA | What now? | Always | A different action from the hero's |
| Footer | Where's everything else? | Always | Links to pages that don't exist |

## 4. Genre: what each kind of audience expects

| # | Genre | Expects | Distrusts |
|---|---|---|---|
| 22 | **Developer tool** | Install command or code in the first viewport; real output; docs, GitHub and pricing one click away; plain, technical words; a free first step with no signup | Marketing adjectives, "book a demo" as the only action, gated docs, stock photos, hidden pricing |
| 23 | **B2B SaaS** | The outcome in business terms; logos and case studies; security and SSO; a demo or a trial; pricing tiers | No price at all, no named customers, unclear who it's for |
| 24 | **Consumer app** | Emotion and a vivid picture of the better life; the app shown on a phone; ratings; store badges | Jargon, walls of text, anything that feels like work |
| 25 | **Open-source library** | What it does in one line, a code sample, install, licence, maintenance signals (recent release, stars, contributors) | No code above the fold, abandoned-looking repos |
| 26 | **Studio / agency / portfolio** | The work itself, big; who they've worked with; a clear way to start a conversation | Talking about process before showing work |
| 27 | **Infrastructure / API** | Latency, uptime, limits, pricing per unit, code in several languages, status page | Vague "scalable", no numbers |

| # | Rule | Why | Check |
|---|---|---|---|
| 28 | **Meet the genre, then exceed it in one place.** Satisfy the expectations above; surprise in one deliberate spot. | Missing an expected element reads as hiding something; a page that's all surprise is hard to read. | ~ |

## 5. Copy

| # | Rule | Why | Check |
|---|---|---|---|
| 29 | **The headline says what it is or what changes.** Clever lines need a plain subhead that says what the product does. | A visitor gives the hero a few seconds. If it's a riddle, they leave before the answer. | ~ |
| 30 | **The five-second test.** After five seconds on the first viewport, the visitor can say what it is, who it's for, and what to do next. | That's the whole job of the hero. | ~ (and with real people) |
| 31 | **Specific beats impressive.** "Finds 13px where your scale says 12" beats "powerful drift detection". Numbers with units, names of real things. | Specific claims are believable and memorable; adjectives are neither. | ~ |
| 32 | **Banned words.** seamless, powerful, robust, cutting-edge, revolutionary, next-generation, best-in-class, leverage, unlock, empower, supercharge, effortless, all-in-one, game-changer. | They're filler that signals marketing, and the reader's eye skips them. | ✓ |
| 33 | **The visitor's words, not the team's.** Use what visitors call the problem, not internal names (no "readings", "blueprint", "surfaces" unless the visitor knows them). | Internal names are meaningless outside the team, and the visitor won't ask. | ~ (against a glossary of internal names) |
| 34 | **Benefit, then feature, then proof.** "Reviews stop arguing about pixels (benefit). Plumber reads your scale (feature). It found 41 drifts in our own site (proof)." | Features alone make the visitor do the translation; benefits alone sound like hype. | ~ |
| 35 | **Short sentences, active voice, second person.** "You fix it from the page", not "Fixes can be applied directly". | Easier to read, and it puts the visitor in the scene. | ~ |
| 36 | **One voice across the page.** Same register, same person, same words for the same thing. | Changes of voice read as several authors and no owner. | ~ |
| 37 | **Read it aloud.** If a sentence is awkward to say, it's awkward to read. | The ear catches what the eye forgives. | ✗ |
| 38 | **Lead with the noun the visitor searches for.** The page title, the H1 or subhead, and the meta description contain the words people type to find this. | It's how search engines and share previews understand the page. | ✓ (terms present) |
| 39 | **No hedging, no overclaiming.** "Catches drift" not "helps you potentially catch some drift"; and never claim what the product doesn't do. | Hedges sound unsure; overclaims are found out on the first try, and trust doesn't come back. | ~ |
| 40 | **Microcopy counts.** Button labels, captions, empty states, error text: the same care as headlines. | The small words are where visitors act, so they're read most carefully. | ~ |

## 6. Proof

| # | Rule | Why | Check |
|---|---|---|---|
| 41 | **Every claim gets proof, or it gets cut.** For each claim: a demo, a number, a quote, or a fact the visitor can check. | Unproven claims are read as marketing, and discount the proven ones near them. | ~ (claim → proof map) |
| 42 | **Proof sits next to its claim.** Not in a separate "testimonials" block far away. | Proof that's three screens away from the claim doesn't get connected to it. | ~ |
| 43 | **Showing the real product is the strongest proof.** A live demo beats a screenshot, which beats a video, which beats an illustration. | Visitors trust what they can poke. | ~ |
| 44 | **Testimonials are specific and named.** A real name, face, role and company, saying something concrete that happened. | "Great tool!" from "J.D." is worse than nothing; it looks invented. | ~ |
| 45 | **Numbers are real and checkable.** Each figure has a source, a date, or a method; illustrative numbers are labelled as such. | One unbelievable number makes every number suspect. | ? then ~ |
| 46 | **Risk reversal.** Say what makes trying it safe: free, no card, no changes to your repo, uninstall in one command, works on a messy codebase. | The visitor's last doubt is usually "what if it goes wrong". Answering it costs one line. | ~ |
| 47 | **Signs of life.** A recent date, a version number, a changelog link, a recent release. | An undated page looks abandoned, especially for tools. | ✓ (dates, versions present and recent) |

## 7. Action (CTA)

| # | Rule | Why | Check |
|---|---|---|---|
| 48 | **One primary action, everywhere the same.** Same label, same destination, same visual weight, in the hero, the nav and the end. | Several primary actions split attention, and the visitor stalls choosing. | ✓ (primary buttons share label and href) |
| 49 | **A secondary action for those not ready.** Lower commitment: docs, a demo, GitHub. Visibly less prominent. | Many visitors aren't ready to commit; give them a next step that keeps them. | ✓ (at most one secondary beside the primary, visibly lighter) |
| 50 | **Label = verb + what they get.** "Install Plumber", "Start free trial", not "Submit", "Learn more", "Get started". | The label is the last promise before the click; vague labels raise doubt. | ✓ (vague-label list) |
| 51 | **Lower the cost of the first step.** A command they can paste, a demo without signup, a trial without a card. | The bigger the first step, the fewer take it. | ? |
| 52 | **Say what happens after the click.** "No signup", "Takes 30 seconds", "Changes nothing in your repo". | It answers the doubt that stops the click. | ~ |
| 53 | **The action is always within reach.** In the nav, and repeated after each major argument, without being on every screen. | Readers convinced mid-page shouldn't hunt for it. | ✓ (distance between CTAs in viewports) |

## 8. Visual and motion craft

The existing Plumber rules (`docs/craft/rules.md`) cover the component level. These are the page level.

| # | Rule | Why | Check |
|---|---|---|---|
| 54 | **One focal point per viewport.** At any scroll position, one thing is clearly most important. | Two focal points fight; the eye bounces and settles on neither. | ~ (screenshot per viewport) |
| 55 | **The hero shows the product.** Real UI, real output, or the real thing in use, not abstract shapes or a gradient blob. | The product is the most convincing image you have. | ~ |
| 56 | **Rhythm: vary density and background.** Alternate dense and calm sections; change background to mark a new idea. Not every section is a card grid. | A page of identical sections reads as one long wall, and the visitor loses their place. | ✓ (consecutive sections with the same layout shape) |
| 57 | **Section spacing is larger than anything inside a section.** | It's proximity at page scale: big gaps mark new ideas. | ✓ (rule 7 at page scale) |
| 58 | **Readable line length.** Body text 45–75 characters per line. | Long lines lose the eye at line breaks; short ones chop the reading. | ✓ |
| 59 | **A clear type scale with few steps.** Hero, section heading, sub-heading, body, small. Heading sizes jump clearly (≥1.25×). | Close sizes look like mistakes; a few clear sizes look intentional. | ✓ |
| 60 | **One display typeface at most, plus one text face.** | More faces need a strong reason; usually they just add noise. | ✓ |
| 61 | **Colour has jobs.** One accent for action, colours for status, neutrals for everything else. The accent isn't used decoratively. | If the action colour is everywhere, the action is nowhere. | ✓ (accent use outside interactive elements) |
| 62 | **Images are real and consistent.** One illustration style, one screenshot treatment, one icon set. No stock photos of people pointing at screens. | Mixed styles look assembled; stock photos look like nobody built anything. | ~ |
| 63 | **Craft where the eye lands.** The hero, the demo, and the CTA get the most detail; footers can be plain. | Visitors judge quality by the parts they look at longest. | ✗ |
| 64 | **Motion explains or rewards; it never decorates.** Animate to show what changed, how something works, or the result of an action. | Decorative motion slows the page and the reader, and tires them by the third section. | ~ |
| 65 | **The page works without interaction.** An interactive demo's resting state already tells its story; most visitors won't click. | If the point only appears after interaction, most people never see it. | ~ (screenshot of resting state) |
| 66 | **Scroll-triggered motion plays once, quickly, and never hides content.** Content is readable even if the animation never runs. | Content that waits to fade in reads as slow, and fails for screenshots, print, search and reduced motion. | ✓ (content visible with JS/animation off) |
| 67 | **Mobile is its own composition, not a squeezed desktop.** The hero, the demo and the tables are redesigned for a phone. | A large share of first visits are on phones, often from a social link. | ✓ (390px: no horizontal scroll, tap targets ≥ 44px) ~ (composition) |
| 68 | **Dark and light both look designed**, if both are offered. | A theme that's an inverted afterthought shows. | ✓ (contrast in both) |

## 9. Technical quality

| # | Rule | Why | Check |
|---|---|---|---|
| 69 | **Fast first view.** LCP under 2.5s on a mid phone; the hero text doesn't wait for fonts, JS or animation. | A slow page loses visitors before it says anything, and suggests a slow product. | ✓ |
| 70 | **Nothing jumps.** CLS near 0: reserved space for images, demos, fonts. | Jumping content makes visitors misclick and lose their place. | ✓ |
| 71 | **Light pages.** Heavy demos, shaders and videos load after the first view, and pause off-screen. | The first view pays for everything loaded with it. | ✓ |
| 72 | **Accessible.** Contrast AA, keyboard reachable demos, visible focus, alt text that says what an image shows, headings in order, reduced motion respected. | It's the law in places, it's more people, and it's a quality signal to careful buyers. | ✓ |
| 73 | **Shares well.** A real title, meta description, and a designed share image (the share card is the page's first impression for most social visitors). | The link preview decides whether the click happens at all. | ✓ |
| 74 | **Links all go somewhere real.** No `#`, no pages that don't exist yet. | A dead link on a homepage says the product is unfinished. | ✓ |

---

## 10. Taste: the judgement above the rules

Taste is knowing which rule applies, which convention to break, and where to spend effort. It can't be linted, but it
can be named, asked about, and calibrated against examples.

| # | Trait | What it means in practice | How the skill can use it |
|---|---|---|---|
| 75 | **Restraint** | Fewer sections, fewer words, fewer colours, fewer effects. The good version usually has less. | After each section: "what can we remove without losing an answer?" |
| 76 | **One memorable move** | One signature moment the visitor will describe to someone else (our hero: you fix the drift yourself). Everything else is calm so it stands out. | Interview: "what should a visitor tell a friend about this page?" |
| 77 | **Coherence** | Every choice comes from one idea (our plumbing world: drift is a leak, a fix tightens the joint). Type, motion, copy and mascot all say the same thing. | Write the idea down in one sentence; check each section against it. |
| 78 | **Honesty** | No fake numbers, no fake UI, no fake urgency, no claims the product can't back. Careful visitors notice, and they're the ones who matter. | Proof map: every claim → real evidence. |
| 79 | **Confidence** | Say it plainly, once. No hedging, no over-explaining, no shouting. | Copy pass for hedges and superlatives. |
| 80 | **Specificity** | Real names, real numbers, real screenshots, the visitor's real situation. The generic version of anything is worse. | The swap test on every heading. |
| 81 | **Pace** | The page speeds up and slows down: quick confident hero, a slow moment to play, quick proof, a calm close. | Read the heading list aloud as a story. |
| 82 | **Trend vs taste** | Bento grids, glass, glowing gradients and noise textures date quickly; clear hierarchy and real product don't. Use a trend only when it serves the idea. | Ask of each effect: "would this still look right in three years?" |
| 83 | **Knowing the reference set** | Taste is calibrated by examples: knowing what the best pages in this genre do, so you can match the bar and then differ on purpose. | Interview: three pages the owner admires and why; three they dislike and why. |
| 84 | **Breaking convention on purpose** | Every rule here can be broken, if you know why it exists and the break serves the visitor better. | Record each deliberate break with its reason, so a reviewer doesn't "fix" it. |

---

## 11. Process: how good teams make a homepage

The tacit knowledge of order. Most bad homepages come from doing these out of order.

| # | Rule | Why |
|---|---|---|
| 85 | **Positioning before structure, structure before copy, copy before design.** | Design on unclear positioning gets redone. Words decide layout far more than layout decides words. |
| 86 | **Wireframe with real words.** No lorem ipsum, even in the first sketch. | Placeholder text hides the hardest problem: what to say, and how long it is. |
| 87 | **Write the heading list first and agree on it.** It's the page's outline and argument. | Changing a heading list costs minutes; changing a built section costs days. |
| 88 | **Gather the real evidence early.** Screenshots, quotes, numbers, logos and their permissions. | Proof decides structure; discovering there are no testimonials after designing a testimonial block wastes it. |
| 89 | **One section at a time, each one finished.** Every state, phone, dark, reduced motion, before the next. | Half-finished sections pile up, and the last 20% of each is where quality lives. |
| 90 | **Test with someone who hasn't seen it.** The five-second test, then "what would you do next?" | The team can't unknow what the product is; only a fresh visitor shows what the page actually says. |
| 91 | **The page is never done.** Revisit when the product, audience or evidence changes. | A homepage describing last year's product is a quiet lie. |

---

## 12. What this means for the skill

The rules fall into three groups, and each group becomes a different part of the skill:

1. **Asked (?)**: the questionnaire (`02-prototype-loop.md`). Rules 1–7, 9, 10, 12, 20, 45, 51, 76, 83. The skill
   answers them itself first, with a source and a confidence for each, and builds the page from its answers. The
   owner corrects the guesses on the running page.
2. **Read (~)**: the review. A model reads the brief, the heading list and the copy, and checks each against these
   rules with a pass/fail and a reason. This is where structure and copy alignment is checked.
3. **Measured (✓)**: the lint. Plumber and a page audit check what's measurable on the rendered page: CTA consistency,
   banned words, line length, type scale, rhythm, speed, accessibility, metadata, dead links.

The checklist the owner asked for is these three groups applied to the page: no guesses left above the footer, the
read rules reviewed, and the measured rules passing.

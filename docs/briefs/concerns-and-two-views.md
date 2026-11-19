# Two views, six concerns

Status: a proposal from 2026-11-19, with nothing built; the owner shapes it before any code.

## What is wrong today

Plumber grew a way to look and a group of checks at a time. There are five ways to look at a page (Alt+click, X-ray,
Blueprint, Clean up and Break it, the project page) and eight groups of checks (design drift, craft, accessibility,
HTML, forms, components, experience, security, and now the generated-look tells). Blueprint shows every group's
notes in one list. On the tells test screens that list said "134 problems", led by font-size drift, with the 46
generated-look notes buried. The notes are filed by which group of checks wrote them, and a person thinks about what
is wrong: "it's off my system", "a screen reader can't use it", "it looks generated".

The owner: "ways to look is also too much i only want like 2 ways through overlay alt click and blueprint, x-ray
should be how alt-click should work".

## Two views

**Alt+click: one element.** It works the way X-ray does now: holding Alt draws the element under the pointer (its
box, its spacing, its tokens) and a click pins its card. The card lists what plumber says about that element,
grouped by concern, and offers what can be done with it: fix a note, show its states, ask for a review. X-ray stops
being a mode of its own.

**Blueprint: the whole page.** It opens on the concerns, each with its count. Picking a concern dims everything on
the page that isn't about it. Clean up becomes the "fix all" of one concern, not a separate mode. Setup steps
(Fast Refresh, your rules) leave Blueprint for the project page: they are about the project, not the page.

The project page and the command line stay, outside the overlay.

## Six concerns

Every check belongs to one concern. The names say what is wrong, in the reader's words.

| Concern | What it means | Checks in it today |
|---|---|---|
| **Design system check** | A value isn't one of your tokens: a spacing, colour, size or corner set by hand | design drift |
| **Craft and polish** | It is on your system but made carelessly: alignment, rhythm, weights, motion | craft |
| **Accessible and correct** | Someone can't use it, or the markup is wrong | accessibility, HTML, forms, security |
| **Anti-slop check** | It looks generated: labels over headings, flavour badges, stock words, glow | tells |
| **Words and clarity** | A person can't tell what it means or what to do next | (new; see below) |
| **States and behaviour** | It works only in the happy case: empty, loading, error, long content, a press with no answer | experience, components, Break it |

Words get a concern of their own because they're the place a model helps most, and "unclear" is a different
complaint from "generated". A slogan is anti-slop; an error that doesn't say what to do is words and clarity.

## Three kinds of judge

Each note also says what decided it (`by` on every finding since 2026-11-19), shown as a small mark, never as a
seventh concern:

- **Rule:** read off the page or the source. Instant and free. No mark.
- **Quick read ✦:** a fast model (Jev) answers a yes-or-no question with a probability. One call per page, cents.
  Shown as a suggestion with its confidence. A toggle hides all of them.
- **Review ✦✦:** a large language model's opinion, slow and paid. Only on request (a button on the card or on a
  concern), never on every read.

A check declares three things, and that is how new ones slot in: its **concern**, its **judge**, and what it
**needs** (the drawn page, the source, the element's states, a screenshot). What it needs decides when it runs.

## States: the component in every case

The owner's idea: show a component the way it looks when empty, loading, failed, overloaded. It lives in
**States and behaviour**, reached from an element's card ("Show states"), not as a third view.

- What exists: Break it already stretches props, lists fed from elsewhere, data and inputs (memory "stress what can
  change"), and the session knows a component's props.
- New: a strip of the same component rendered side by side in each state: empty, loading, error, one item, many
  items, very long text, no permission, offline. Each frame is judged like any page: a rule finds a blank box where
  the empty state should be, a quick read asks "does this empty state say what to do next?"
- A review can write the realistic content for each state (a real error message, a plausible long name) instead of
  "Lorem ipsum".
- The hard part, not solved yet: putting a component in a state needs its data. Props are reachable; data fetched
  inside the component (a hook, a query) is not, without mocking the fetch.

## What a quick read (Jev) can do

Jev takes words and a question and answers yes-or-no, a choice, or a score, with a probability. It is fast and
cheap enough to ask about every element on a page. Candidates:

- **Anti-slop:** a field label said again by its placeholder or helper text; a number said twice (the card's figure
  and its caption); a heading that is a slogan, not a name.
- **Words and clarity:** an error message that doesn't say what to do; a button whose label doesn't name the action
  ("OK" on a delete); "click here" and "learn more" links; alt text that is a file name or "image"; an empty state
  that offers no next step; a tone that doesn't match the rest of the app.
- **Accessible and correct:** an icon's name in the code that contradicts its label (`TrashIcon` on "Archive").
- **Design system check:** what role an element plays (card, nav item, page title, caption), so a value is judged
  against its role's tokens and not the page's average (the "roles, not values" direction from 2026-10-31).
- **Ranking:** which of a page's notes matter most for what the page is for.

## What a review (LLM) can do

Slower, paid, and on request:

- **Write the fix for words:** rewrite the subtitle, the error, the button label, in the app's voice.
- **Fill the states:** realistic content for each state.
- **Look at the screen:** read a screenshot for hierarchy and the main action ("two buttons compete for first").
- **Find the cause:** turn twelve notes into one ("these all come from the card component's padding").
- **Propose the system:** suggest the roles and tokens a page is reaching for, from what it uses.
- **Hand it to an agent:** write the prompt that fixes a concern in the code.

## Open questions for the owner

1. The six names, above all "Craft and polish" and "States and behaviour".
2. Whether model notes are shown by default or start hidden behind the toggle.
3. Which first: the concerns in Blueprint (the organisation, all rule-based, no new checks), or Alt+click taking over
   X-ray.

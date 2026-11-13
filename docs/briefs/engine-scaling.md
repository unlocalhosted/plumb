# Staying fast as rules and options grow

Status: design, 2026-11-13. Nothing built, **nothing measured for this document**. Every cost below is read from the
code (`overlay/src/craft.js`, `src/craft-run.ts`), not timed. Layer 1 is the timing.
Companion to [platform-guidance-lld.md](platform-guidance-lld.md), which adds a whole rule family.

## 1. The problem, stated as growth

Plumber's cost is a product, and every term in it is about to grow.

| Where | Cost today, from the code | What grows it |
|---|---|---|
| **On the page** (the overlay) | every enabled rule's `check` is called on every element read: elements × rules. 69 rule objects today. A rule that does not apply exits early, but it is still called, and it has usually read a style first | each new rule adds one call per element, whether or not it could ever apply |
| **After a change** | a resize, a write, a late fact (an icon's pixels, the spec landing) throws the whole cache away; the page is judged again from nothing | more rules make each full re-judge slower, and more late facts trigger more of them |
| **Page-wide rules** | a rule that reads the page's census (the usual stroke, the usual gap) is never cached: judged on every element on every pass | each new page-wide rule is paid in full, always |
| **The command line** | each route is loaded many times: the desktop read, the other views (dark, touch, held, scrolled), three more widths, hover on up to a budget of elements, recorded gestures (24 a page) | each new option or kind of state multiplies page loads, not adds to them |
| **What ships into the user's page** | one 2,700-line rules file, loaded whole | every rule ever written, whether the project turned it on or not |
| **Source scan** (new, platform) | a second pass over the project's files | file count |

The first and fourth are the cliffs. One is *elements × rules*, the other *routes × states*. A design that stays
fast has to break both products, not shave them.

## 2. The principle

**A rule pays only where it could speak.** Cost should follow the number of places a rule applies, not the number
of rules that exist. Adding the 200th rule should cost what its own subject costs: a rule about dialogs costs
something on a page with a dialog and nothing on a page without one.

Everything below is that one idea applied at each level: element, fact, time, page load, bundle.

## 3. The design

### 3.1 Dispatch: an element meets only the rules that could apply to it

Today each rule decides for itself, inside `check`, that an element is not its business. Move that decision out, to
where it is made once.

- Each rule declares **`on`**: the kinds of element it can speak about. A small fixed vocabulary, each one cheap to
  know: tag (`img`, `svg`, `input`, `textarea`), role from the shared role layer (`button`, `card`, `dialog`),
  layout (`flex`, `grid`, `positioned`, `scrolls`), content (`has-text`, `has-shadow`, `has-radius`, `has-transition`).
- The engine computes one **kind mask** per element, once per pass, from facts it reads anyway.
- Rules are indexed by kind at load. Per element: look up the rules whose `on` meets the mask, run those.
- `refines` and `scope` (one rule quieting another) go through the same index instead of a loop over every rule.
- **A rule with no `on` is refused at load.** That is the guard that keeps this true in a year: nobody can add a
  rule that silently runs on everything.

Expected effect (a guess until layer 1): most elements are plain boxes and text; they meet a handful of rules, not
all of them. Rule count stops multiplying the page.

### 3.2 Facts have a price class, and the class sets when they may be read

Rules already read only through facts, and facts are memoised. What is missing is that all facts look equally
cheap. They are not.

| Class | Examples | When it may be read |
|---|---|---|
| free | tag, attribute, class list | always |
| style | computed style | always; one object per element per pass |
| layout | rects, line boxes | in the read phase only, never after a write in the same frame (the measured rule from the blueprint work) |
| paint | an icon's pixels, a rendered glyph | idle time only; the rule is quiet until it lands (as ink does today) |
| time | a recorded gesture, another view of the page | the command line only; in the overlay, only when asked for one element |

A rule's `reads` already names its facts. The engine sums the classes: a rule that needs `paint` or `time` is never
on the path that draws the first marks. New fact kinds must name their class; that is the second guard.

### 3.3 Judge in slices, nearest first

The page is never judged in one block.

- Order: what is on screen, then near it, then the rest. Within that: tiers `access` and `legibility` first.
- Work in slices of a few milliseconds, yielding between them; marks appear as they are found.
- Total work can grow with the rule set. The time to the first useful mark, and the longest pause, do not.

### 3.4 Throw away less

- **A write** changes one element. Its signature (own classes, parent's classes, inline style, text length) already
  says what depends on it. Re-judge it, its parent and its children; keep everything else. Today the cache is
  wiped.
- **A late fact** (ink for one icon) re-judges the elements that asked for that fact, not the page.
- **A resize** still re-judges everything laid out: that is honest. It is debounced to when the window stops.
- **Page-wide rules:** the census becomes a fact with a version. A rule's result is kept against the census values
  it actually read, rounded. It runs again when "the app's usual gap" changes, not on every pass.

### 3.5 The command line: a state is rendered only when something will read it

This is the larger cliff, and the rule is already half there: the code comment says a rule that names a view "is
the reason the runner takes that pair at all". Make that the law for every state.

- **Demand, twice.** A width, a view, a hover or a gesture is taken only when (a) an enabled rule asks for it and
  (b) the desktop read found an element of a kind that rule is `on`. No tooltip-like element on the route: no hover
  pass for tooltip rules. This is dispatch (3.1) applied to page loads.
- **Record once, read many.** A gesture on an element is recorded once and every rule that wants it reads the same
  recording. Rules never start their own. The per-page budget is shared and spent by tier.
- **Skip what has not changed.** A route's result is kept against: the built CSS, the source files that route
  renders (the server already knows them from stamping), the rule set's version and the resolved spec. Same key,
  same answer, no browser. On a second run after a one-file change, most routes are skipped.
- **Side by side inside the machine's budget**, as the test runner does: pages run in parallel up to free cores and
  memory, never one at a time, never all at once.

### 3.6 Ship only the rules in play

- Rules are split by family into modules (`craft`, `defensive`, `platform`, each pass). The overlay loads a family
  when the spec has it on. A rule the project turned off is not downloaded.
- A family whose kinds are absent from the page (no form controls: no form rules) can wait until one appears.
- The spec for a rule is resolved once when the rule set is built, not looked up inside each `check` call.

### 3.7 The source scan stays off the page's path

- Runs on the server, cached per file by content, behind a cheap text pre-filter (their scanner has one).
- Never blocks the first marks. Its candidates join the page when they arrive, like ink.

### 3.8 The standing guard: a budget and a readout

Optimising once does not keep anything fast. What keeps it fast is that a slow rule is visible the day it is added.

- **Per-rule timing**, always collected in a debug mode: calls, hits, milliseconds. Read on the two reference
  pages: algorecall's problems list (about 16,000 elements, measured 2026-10-14) and crafting-ui's vocabulary page.
- **A budget per rule and per pass**, written in the spec beside the rule's thresholds. Over budget is a failure in
  the one place rules are checked before a merge, not a surprise on a user's page.
- **One readout** (`plumber doctor`, a perf line): the five slowest rules, the number of page loads per route, the
  share of routes skipped.
- A new rule's brief states three things: what it is `on`, which fact classes it reads, which states it asks the
  command line for. A rule that cannot state them is not ready.

## 4. Order

Each is seen before the next. Nothing here needs the platform work; the platform work should not land before 1–2.

| # | Layer | What can be seen |
|---|---|---|
| 1 | Per-rule timing on the two reference pages | A table: for each rule, calls, hits, time. Says whether dispatch is the win this document predicts, and which five rules matter |
| 2 | Dispatch (`on`, kind mask, index, refusal) | The same table: calls per rule fall to about its hits; the full read of the 16,000-element page gets faster by a measured amount |
| 3 | Throw away less (writes and late facts) | Applying one fix on the big page re-judges tens of elements, not thousands |
| 4 | Slices, nearest first | First marks appear in the same time on the big page as on a small one |
| 5 | Command line: demand, record once, skip unchanged | Page loads per route before and after; a second run after a one-file change |
| 6 | Families as modules | Bytes loaded into the page with one family off |
| 7 | Budgets and the readout | A deliberately slow rule is refused |

## 5. Not known

- **What a rule costs today.** Not measured. If most of the time is in a few heavy rules (text measuring, canvas)
  rather than in the many cheap early exits, layer 2 matters less and those rules' fact classes (3.2) matter more.
  Layer 1 decides the order of 2–4.
- Whether a kind mask can be computed without reads that are themselves the cost (a role lookup per element).
- How often a route's key really stays the same between runs in a Tailwind project, where one class change
  rebuilds the stylesheet. The key may need to be the route's *used* declarations, not the whole file.
- Whether partial re-judging after a write is safe for rules that look further than parent and children
  (a list's rows compared with each other). They may need a wider dependency declared, like `on`.

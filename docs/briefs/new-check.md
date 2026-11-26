# The requirements for adding a check

2026-11-26. Draft, not signed off. Asked for by the owner: "we should add a spec for adding a new check, i want a
demo for it to be added on what we check in docs wherever it lies appropriately along with deterministic fix or we
can use embed type check with jev type model and so on."

This is the contract for adding a check to plumber. It covers checks with no number: the ones that come from guides
and tip lists, in batches. A numbered craft rule (a senior's tacit knowledge, with its own screen and film) follows
the craft-rule skill as well.

## 1. Why a spec

Checks have been added by habit, and the habit has gaps. Counted today from the docs' own list of checks:

- 281 checks. 266 are judged on the page, and each of those has an example in the docs.
- 74 of the 281 play a fix that moves a value. The rest show a before and an after.
- 59 of the 258 page checks counted on 2026-11-22 can write their fix (the backlog's count). The others give advice.
- One check asks a model what words mean (the line under a heading that repeats the heading).

Every page check has an example already, so that part is a habit to keep. Most checks stop short of writing their fix, and no document says when a check may ask a model. This spec covers both.

## 2. The seven things a check comes with

A check is not added until it has all seven.

| | What | Where it lives |
|---|---|---|
| 1 | **The case**: what an expert sees, the principle, the ground | the batch's research file in `docs/research/` |
| 2 | **How it judges**: measured, meaning, or source (section 3) | the rule, in its pack's rules file |
| 3 | **The fix**: written, words, advice, or a brief (section 4) | the rule's `suggest`, and its words |
| 4 | **The words**: its name, and the reason in a designer's voice | `overlay/src/words.js` or the pack's words |
| 5 | **The demo** in the docs, under the concern it belongs to (section 5) | `overlay/src/checks/<concern>.js` |
| 6 | **The proof**: it speaks on the fault, stays quiet on a near miss, and was seen on a real app | the batch's result, then tests when the owner asks |
| 7 | **No side effects, shown**: it changes no other check, its fix breaks nothing, and it has an answer for every tree case and corner case (section 6) | the batch's result |

The case follows the chain in `docs/PRINCIPLES.md`. Its ground is a page someone can open, read on the day the
check is built and linked from the research file. A tip post is a lead, and the CSS specification or MDN page behind
it is the ground.

## 3. How a check judges

Each check is one of three kinds, and says which.

**Measured.** It reads the drawn page: computed style, boxes, what scrolls, what is on top. The same page gives the
same answer every time. This is the default, and most checks are this kind.

**Meaning.** The fault is in what the words say, and no measurement can decide it. The page finds the candidates and
asks the dev server, which asks a model. Two models are wired today:

- Jev (typesafe.ai), when its key is set: each candidate is one yes/no question, answered with a probability.
- The sentence-embedding service (MiniLM), when its address is set: judged by how close two lines sit.

A meaning check keeps these rules:

- It is used only when a measured signal can't decide. "Is this label a sentence" is measured. "Does this line say
  anything the heading does not" is meaning.
- The page narrows first. A model is asked about the few pairs that pass every measured test, never about every
  element.
- With no model set, or none reachable, the check says nothing. Plumber does not guess at meaning.
- Its threshold is tuned on real apps, and the research file says which apps and what the misses were.
- The finding says a model judged it and which one, so a person can weigh it.

**Source.** It reads the code on the server, for things the drawn page can't show.

## 4. The fix

Each check declares one of four. A written fix is preferred wherever one exists. A check with no written fix is
still worth adding when it finds a real problem: finding it is the value, and the person fixes it by hand or with
their agent.

**Written.** The check carries the edit itself: a class or a CSS declaration, in the project's own tokens where one
fits. It must be deterministic:

- The same finding gives the same edit every time. No model writes a fix.
- Applying it clears the finding.
- Applying it raises no new finding on that element or its neighbours.
- It changes one thing. A fix that needs two edits in two places is advice until both can be written together.

**Words.** The fault is the wording. The fix is an edit in place, or a note to the agent. A meaning check usually
ends here.

**Advice.** The fix is a change of structure plumber can't write: a div that should be a button, a missing state.
The check says in one line why it can't be written.

**A brief.** The problem can be found for certain, and the right answer is a matter of judgement: which of two
headings should lead, how a crowded toolbar should be thinned, what an empty screen should say. No single edit is
correct, so plumber writes none and no model writes one inside the check. The finding carries what a person or
their agent needs to fix it well:

- **The problem,** as the person meets it, and the principle behind it.
- **The place:** the element, and the file and line it comes from.
- **What a good answer must do,** as two or three conditions someone can test.
- **The usual ways out,** each in a line, with what it costs. They are options, and none is marked as the answer.
- **What must not change:** the neighbours, the tokens in use, the other widths and states.
- **How it will be judged:** the check is run again and goes quiet, and nothing new is found around it.

The same brief goes to the person on the page and to an agent through the command line, in the same words. The
detecting stays deterministic. Only the answer is left open.

A brief is not a way to skip the work of a written fix. A check may use one only when its research file shows two
right answers to the same fault that differ in more than a value.

A batch reports how many of its checks are written, words, advice and briefs.

## 5. The demo

Every check gets one example in the docs, on the "What Plumber checks" page, under its concern (the design system,
craft and polish, words, states, access, generated-screen marks). The concern is the one the engine already gives
the check. A new concern is a design decision of its own and is not made inside a batch.

The demo is an entry in that concern's examples file:

- **One realistic case.** A piece of real-looking software with one thing wrong, built well everywhere else.
- **The line of code** before and after.
- **Two sentences.** One says what is wrong as the person meets it, the other what the fix gives them.
- **A scene with a Broken / Fixed switch.** Where the fix moves a value, the change plays with the shared guides
  (mark, move, land, go). Where the fix is words, the words change. Where it is advice, the two states are shown side
  by side in time, with no pretend motion. Where it is a brief, the fixed state is labelled as one way to fix it.
- **A meaning check's demo** shows the two lines, the model's verdict as a person would read it, and the rewritten
  line.
- **Plumber's own pieces.** The scene uses plumber's tokens, guides and pills, and redraws none of them.

A demo is held to its own check in two ways:

- The broken state is a page the real check speaks on, and the fixed state is one it stays quiet on. A demo is run
  through its own check before it ships (`scripts/proof/demo-check.mjs`). Some demos are pictures of code: the
  markup shown as text, or what a screen reader says. The check can't read a picture, so for those the same before
  and after markup goes on the check's test page, and the test page is what is run.
- The fix shown is the fix the check writes. If the check gives advice, the demo does not show a one-click fix.

After the entry is added, the docs' list is rebuilt from the rule sources so the count and the page follow.

## 6. Side effects, and the proof that there are none

A check that works alone can still do harm: it can silence another check, change another check's suggestion, or
write a fix that breaks the page next to it. So "it fires on the fault" does not make a check valid. Each claim below
has to be shown, and the output is kept in the batch's result. A check with a claim not shown stays switched off.

### 6a. Effects on other checks

How one check reaches another in the engine today, and so what has to be ruled out:

- **A shared facet.** Each check says what it owns (a gap, a colour, the scroll). Two findings that own the same
  thing on one element are merged into one verdict, and one of them is folded under the other.
- **Quieting.** A check can name the general checks it refines, and they then don't run where it applies.
- **Rank.** Checks are ranked by tier, then by confidence. A new check can take the top place from an old one.
- **A swallowed error.** When a check throws, the engine drops its findings and carries on. A check that throws
  looks the same as a check with nothing to say.
- **The kept answer.** An element's findings are kept until its own classes or its parent's change. A check that
  reads anything else (an attribute, an inline style, the text, how far something has scrolled, a relative further
  away) can give a stale answer.
- **Time.** Every check asked about every element slows all of them.

The proof, run once for the batch:

| Claim | How it is shown |
|---|---|
| No other finding appears, goes, folds or changes its suggestion | The same real pages are checked with the batch on and off. The only difference allowed is the batch's own findings. Every other difference is explained or the check is changed |
| Its facet is deliberate | The check lists every existing check that owns the same thing, and for each says which should win when both fire on one element, with a page that shows it |
| What it quiets, it should quiet | For each check it refines: a page where the quieted check would have been right, showing the new check says the better thing there |
| Its answer does not depend on order | The findings are the same with the check first and last in the list |
| It never throws | Thrown errors are counted on the real pages and on its test page. The count is zero |
| It reads nothing behind the kept answer's back | The check lists what it reads beyond an element's own classes and its parent's, and shows the finding update when that thing changes |
| A check written as two parts agrees with itself | Some checks are two rules with one id: one reads the still page, one reads what a gesture showed. Both parts say the same about everything except what they read (what they own, their rank, what they quiet, what they come after), and every step of the engine that asks the check asks both |
| It keeps nothing between elements | It reads facts and returns findings. It never touches the page, and anything it remembers is cleared each pass |
| It does not slow the page | It says which elements it is about. Its time on the largest real page is recorded beside the batch's total |

### 6b. Effects of the fix

The engine already tries a fix before offering it: the check must have nothing left to say, and no check of a
higher rank may start firing. That is not enough for a new check. A written fix also has to pass these. A check that gives advice or a brief has
no fix to try in advance, so the same claims are checked on whatever the person or their agent changed: plumber
checks again after the edit and reports anything new that fires and anything that moved.

| Claim | How it is shown |
|---|---|
| No check of any rank starts firing | After the fix, the element, its parent, its children and its siblings are checked again. Nothing new is found |
| Nothing else moves | Boxes outside the fixed element are measured before and after. Only what the fix is meant to move has moved, and the page has not grown a scrollbar |
| It lands | The computed style after the fix is the value the fix asked for. A fix that loses to an inline style, an `!important` or a later rule is withdrawn |
| Twice is the same as once | Applying it again changes nothing |
| Fixes do not chase each other | Every fix on a page is taken, the page is checked again, and this repeats until nothing changes. It ends within a few rounds and no two checks undo each other |
| It can be taken back | Undo returns the file exactly as it was |
| It says how far it reaches | A fix written into a shared class or component changes every place that uses it. The check counts those places and judges each one. If any of them was right as it stood, the fix is written on the one element or becomes advice |
| It holds in every state | The fix is written for the width, colour scheme and state in which the fault was seen, and the other widths and states are checked for change |
| The project's browsers have it | A fix that needs a newer CSS feature is offered only when the project's browser list has it. Until plumber can read that list, such a fix is advice |

**Undo across time.** A fix can be taken back from history, later and out of order, so taking it back has to be
shown at each of these points and not only straight after the fix:

| When the fix is taken back | What has to hold |
|---|---|
| Straight away | The file is exactly as it was, and the finding is back with the same suggestion |
| After newer fixes in other files | The same. The newer fixes stay |
| After a newer fix in the same file | Either both come out right, or the undo is refused whole and says which to take back first. A file is never left half restored |
| After the person or their agent edited the file by hand | Refused whole, with nothing written and the reason said |
| As one of a group applied together | The group goes back whole or not at all |
| One by one, newest first, through every fix taken on a page | The files end exactly as they began, and the findings are the starting set |
| After the page reloaded or the dev server restarted | History is still there and the undo still works |
| Past the end of what history keeps | It says so, and changes nothing |
| From the page and from the command line | Both give the same result |
| Then the same fix is taken again | It writes the same edit as the first time |

### 6c. Parents and children

Most surprises come from parents and children. For each case below the check says what it does, with a small page
that shows it, or says why the case cannot arise.

| Case | What has to be decided |
|---|---|
| The same fault on a parent and its child (a scroll area in a scroll area, a card in a card) | Which one speaks. Usually the outer one, once |
| The cause is on an ancestor and the fault shows on a descendant | The finding goes where the fix is written, and points at where it is seen |
| An inherited value (a colour, a font, a line height) set once and read by every descendant | One finding at the source, never one per descendant |
| Forty rows drawn by one component | One finding with a count |
| One component used in two places, right in one and wrong in the other | The fix must not change the place that was right (6b, reach) |
| A fix on the parent changes its children, or a fix on a child changes its parent's size | Both are checked again after the fix |
| What draws inside another element is not its child in the page's tree (a dialog or menu moved to the end of the page, `display: contents`, a slot, a shadow root, a frame) | The check says whether it reads the tree or what is drawn, and is tried on a moved dialog |
| The nearest scroll area, positioned ancestor or stacking layer is not the parent | The check finds the real one and does not assume the parent |
| The page itself (`html`, `body`) | Named as included or left out, with the reason |
| An element from a library the project does not own | The finding says it is not yours and offers no written fix |

### 6d. Corner cases

Each has an answer in the check's row of the batch table: speaks, stays quiet, or cannot arise.

- **Not drawn:** `display: none`, hidden, fully transparent, zero size, off screen, clipped away by a parent.
- **Not ready:** an image or font still loading, a skeleton, content that arrives later.
- **Moving:** an element in an animation or transition. The engine waits for it to rest. A looping animation
  never rests, and today it stops the engine judging what is around it.
- **Amounts:** no children, one child, thousands. No text, one word, a very long word, a long translated string.
- **Direction:** right-to-left text, and vertical writing where it matters to the check.
- **The person's settings:** text size raised, the page zoomed to 200%, dark scheme, forced colours, reduced motion.
- **The device:** a phone width, touch against a pointer, a scrollbar that is always drawn (Windows) against one
  that hides (a Mac).
- **The browser:** a property this browser does not have reads as undefined. The check stays quiet and does not throw.
- **The edge of its number:** a value exactly on the threshold, and one a fraction of a pixel either side.
- **Already solved another way:** the fault has more than one right answer. The check knows them all, and each is a
  near miss on its test page.
- **Meant to be so:** an exception the project has recorded is left alone.
- **Plumber's own parts:** the overlay is never judged.
- **Gone:** the element leaves the page between being measured and being reported.

### 6e. The evidence kept

- **One test page per check.** It holds the fault, each near miss, and each tree case from 6c, with the findings
  expected on it written beside it.
- **One on-and-off run for the batch** on a fixed set of real pages. Its output is the differences in findings.
- **One fix run for the batch:** every fix taken, checked again until nothing changes, with the rounds, what was
  left over, and what moved.
- **One table** in the batch's result: a row per check, a column per claim, each cell a result or "cannot arise"
  with the reason.

These run once per batch, not once per check, and they are run on the laptop only for the test pages. The real-page
runs go on the server kept for heavy runs.

## 7. Batches

Checks from a guide or a list are sorted first and built together, ten or more at a time.

1. Collect the items and log the source in `docs/references.md`.
2. Sort each: already checked, checked in part, a new check, or not a check. Keep what a linter can't see and what
   people often get wrong.
3. Read the ground for each new check and fill the seven fields in a table.
4. Build every check, its words, its fix and its demo.
5. Run the proofs of section 6 once for the batch. Show the findings before and after the fixes are taken.
6. Record it: the batch in `docs/briefs/rule-packs.md`, what is open in the backlog, the story in the journey.

## 8. Checklist

- [ ] The ground was read on the build day and is linked.
- [ ] The kind is stated: measured, meaning or source.
- [ ] The fix is stated: written, words, advice or a brief, with the reason when it is not written.
- [ ] A brief names the conditions a good answer must meet, and they can be tested.
- [ ] A written fix clears its finding and raises no other.
- [ ] The name and reason read like a designer talking to a client.
- [ ] The demo is on the docs page under its concern, and passes through its own check both ways.
- [ ] The check says what kind of element it is about, so it isn't asked about every element on the page.
- [ ] It spoke on the fault and stayed quiet on a near miss.
- [ ] It was seen on a real app, or the result says it never fired on one.
- [ ] With the batch on and off, no other check's findings changed.
- [ ] It never threw.
- [ ] Its fix raised no finding of any rank, moved nothing it wasn't meant to, landed, and can be taken back.
- [ ] Taking every fix on a page came to rest.
- [ ] Its fix was taken back at each point in the undo table, and the files and findings matched.
- [ ] Every tree case and corner case in section 6 has an answer.

## 9. Not known

- Run 2026-11-26 (`scripts/proof/demo-check.mjs`, all 266 demos, 5,138 elements): 26 hold, meaning the check speaks
  on the broken scene and is quiet on the fixed one. On 10 the check still speaks on the fixed scene. On 230 the
  check is silent on its own broken scene: 18 read the whole page's habits and 14 need a gesture or a model, which a
  grid of still scenes can't show; 9 are code checks with no page rule; 189 are still-page checks. Two of the 189
  were read and are pictures, not pages (amounts in plain divs where the check reads table cells; a form shown as
  text). The other 187 were not read one by one, so how many are pictures and how many are real misses is not known.
  In 92 fixed scenes some other check speaks.
- Built 2026-11-26: the on-and-off run (`scripts/proof/on-off.mjs`). It judges the same pages with the named checks
  on and off, prints every other check's finding that came, went or changed, and counts the errors checks threw.
  Tried on one control page, where switching off the faded-button check brought back the general contrast finding it
  quiets. Not yet run on a real app, and not yet run with hover, width and gesture states.
- Built 2026-11-26: the fix and undo run (`scripts/proof/fix-undo.mjs`), through the same commands an agent uses.
  For each fix: cleared, what it raised, whether it landed, what moved, twice is once, undo straight away, and taken
  again. Then: rest, the oldest taken back under newer ones, undo after a hand edit, and everything taken back.
  Tried on one control page with five fixes in one file. Every undo claim held there. One fix raised another
  finding (see the backlog). Open: it cannot tell a finding a fix caused from one that was folded under the fixed
  finding; it runs only on a throwaway page, since it writes to source; a long style value is not judged for
  landing; it does not cover undo after a restart, past the end of history, or from the page.
- Which of the other proofs in section 6 plumber can already run. The engine tries a fix against its own check and against
  higher-ranked checks. I have not found a run that compares findings with a check on and off, one that takes every
  fix until the page rests, or one that measures what moved. Those are likely new tools, and they come before the
  first batch built to this spec.
- How the page's own history takes a change back. The command line's undo was read: it keeps a limited number of
  applies, takes each back once, and refuses when a file has changed since. The page's history was not read, so
  whether the two agree is not known.
- Whether a new check is on by default. A new warning can fail the check of a project that passed yesterday. That is
  the owner's call, already open in the backlog.
- How a finding judged by a model should look different on the page and in the report.
- Whether a meaning check may run in `plumber check` on CI, where a model's answer could change between runs.
- Whether plumber can check again after an agent's edit and report what changed around it, as a brief needs. The
  command line can apply and take back plumber's own fixes; a re-check after someone else's edit was not read.
- What share of a batch may be advice and briefs. No number is set. The share is in the batch's own table.
- The older checks are not brought up to this spec here. How many fall short is the count in section 1, and
  closing it is its own piece of work.

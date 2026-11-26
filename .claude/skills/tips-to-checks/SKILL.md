---
name: tips-to-checks
description: Use when turning collected tips, guide advice or a harvest (docs/research/harvests/, docs/research/*-tips.md) into checks for plumber's engine, or when adding any new check that has no craft number. Follows the contract in docs/briefs/new-check.md: the case and its source, how the check judges, its fix, its words, its demo in the docs, and proof that it has no side effects, using the proof runs in scripts/proof/. Also covers what to do when a tip needs something the engine can't read yet. Use it before writing the first line of a new check.
---

# Turning tips into checks

A harvest says what could be checked. This skill is how each of those becomes a check that is valid by the contract
in `docs/briefs/new-check.md`. Read that file first; this skill is the order of work, and the contract is the bar.

The owner's standing instruction (2026-11-26): "see if our current tooling is enough, do we need more capabilities
in our engine, be ambitious, correct and adaptable by default."

- **Ambitious.** When a tip needs a sense the engine lacks, the answer is a proposal for that sense, not a dropped
  tip. When a problem can be found and has no single right fix, it is still added, with a brief (the contract,
  section 4).
- **Correct.** No check without a principle and a source read on the day it is built. No check called valid
  without its proofs. A claim that was not run is reported as not run.
- **Adaptable.** When the contract or the tools get in the way of a good check, change them in the same piece of
  work and say so. Add what a batch taught to the last section of this file.

The main session writes all the code. No subagent edits the engine: two writers in one checkout is how work was
lost before.

## 1. Start from the harvest

Read `tips.md` and `capabilities.md` in the harvest's folder. If there is no harvest, run the `harvest-tips` skill
first, or sort the advice by hand into the same groups.

Take three lists from it:

1. **New checks the engine can make today.**
2. **Better fixes for checks plumber has.**
3. **Checks that need a new sense.**

Work in batches of ten or more checks, built together and proved once. Never one check per turn.

## 2. For each new check, before any code

Fill one row of the batch table in a research file (`docs/research/<source>-batch.md`):

| Field | What goes in it |
|---|---|
| The fault | What a person meets on the page, in a sentence a designer would say |
| The principle | Why it matters |
| The ground | The specification, MDN page, guide or study behind it, opened today, with the link. The tip is a lead |
| What plumber reads | The signals, and why they are enough to be sure |
| How it judges | Measured, meaning (a model), or source |
| The near misses | Every other right way to solve the same thing, so the check stays quiet on them |
| The fix | Written, words, advice, or a brief, and why |
| What it owns | The one thing on the element it is about, and every existing check that owns the same thing, with which should win |
| Its place | The concern it sits under in the docs |

If a row can't be filled, the check is not ready. Say which field is empty.

A check that shares what it owns with an existing check needs a decision before code: fold under it, quiet it, or
come after it so one fix answers both. A finding hidden under another and handed to the person after the first fix
is the fault this was written to stop (journey 140, the scroll area).

## 3. Build the batch

For each check, in its pack's rules file:

- the rule, saying what kind of element it is about so it is not asked about every element
- its fix, saying what it sets, so the engine can try it and stack another fix on it
- its words, in the project's voice (`better-writing`; no internal names)
- its numbers in the spec, each with its source
- its demo in the docs' examples file for its concern, with a Broken / Fixed switch, showing the fix the check
  really writes
- its test page in `scripts/proof/pages/<check>.jsx`: the fault, each near miss, and each parent-and-child case
  from the contract's section 6c that can arise

A check written as two rules with one id keeps every field the same in both, except what they read.

Then rebuild the docs' list: `node web/scripts/checks.mjs`.

## 4. Prove the batch, once

Build first (`npm run build`), then:

```bash
node scripts/proof/on-off.mjs --rules <the batch's ids> --page scripts/proof/pages/<check>.jsx
```

It judges the page with the batch on and off. The only difference allowed is the batch's own findings. It also
counts errors a check throws. A check that never spoke on the page proves nothing; the run says so.

```bash
node scripts/proof/fix-undo.mjs --page scripts/proof/pages/<check>.jsx
```

It takes every fix through the commands an agent uses, and for each says whether the finding cleared, what
appeared, whether the style landed, what moved outside the element, and whether undo put the file back exactly. Then
it takes fixes back out of order, after a hand edit, and all at once.

- Test pages run on the laptop, one at a time. Real apps run on vm-agent, and the fix run writes to source, so it
  is pointed only at a throwaway copy.
- When a run prints something to look at, find the cause before touching the check. The cause is often in the
  engine.
- What the tools do not cover yet is listed at the end of the contract. Report those claims as not shown.

Fill the batch's result table: a row per check, a column per claim, each cell a result or "cannot arise" with the
reason. A check with an empty cell ships switched off.

## 5. When the engine can't read what a tip needs

Do not drop the tip, and do not fake the signal.

1. Write the sense down in `docs/briefs/` as a short proposal: what it lets plumber see, every tip and existing
   backlog item that needs it, how it could be read (a probe, a browser setting for the run, the stylesheet, the
   source), what it costs in time per page, and what could go wrong.
2. Count what it unlocks. A sense that serves one tip waits. A sense that serves many is worth more than the batch.
3. A small one (a new setting for the headless run, a new fact read from computed style) is built inside the batch.
   A large one (a new probe, a new pass over the page, anything that changes how long a page takes) goes to the
   owner as its own piece, with the count, before it is built.
4. The tips that wait on it stay in the backlog under that sense's name, so they are found again when it lands.

Check whether today's tooling was enough for the batch itself, and say so in the report: what the proof runs could
not show, what had to be checked by hand, and what tool would have caught it.

## 6. Record it

- The batch in `docs/briefs/rule-packs.md`: the checks, their source, what is open.
- The backlog: what is not built, not proven, or waiting on a sense.
- The journey: the itch, how it was found, what was chosen, the proof.
- The reference, if it is new.
- Show the owner real findings before and after on a real app. Say first when nothing changed.

## What past batches taught

- **2026-11-26, the proof tools' first run.** On a control page the fix run showed a second finding appearing after
  a fix. The on-and-off run showed it had been there all along, hidden under the first. Two causes, both in how
  fixes are stacked: the first fix did not say what it sets, and the engine asked only one half of a two-part
  check. So: every written fix says what it sets, and when a finding appears after a fix, run on-and-off before
  blaming the fix.

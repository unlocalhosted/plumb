# The button data: datasheet

`generator/data/buttons.json`: every button-like part in shadcn's public component registries, read from its
source into fixed fields. Stage 1 of the button proof of concept (`docs/briefs/button-poc.md`).

## What it is

- **3,379 parts from 312 registries**, read on 2026-11-20.
- **What each part is:**

  | Kind | Parts |
  |---|---|
  | A button | 1,637 |
  | A group of buttons | 348 |
  | Contains a button | 540 |
  | Not a button | 796 |
  | An example of another part | 58 |

  Work on buttons uses the first two kinds.
- **Families:** near-copies within one registry are grouped, and one representative is marked per family. 32 families
  have two or more members.
- **Source code isn't in this file.** It stays in the local cache (`generator/library/cache/harvest/`, gitignored),
  rebuilt by `node generator/library/harvest.mjs button`.

## How it was made

1. `library/harvest.mjs`:
   - reads the directory at ui.shadcn.com/r/registries.json (593 registries);
   - fetches the index of each healthy or degraded one (517 read);
   - keeps parts whose name, title or description describe a button;
   - downloads each one's item JSON with its source.
2. `data/extract.mjs` reads each part's code, with comments removed, into the fields below. Each value keeps the line
   it was read from (`evidence`). It folds in duplicates published by more than one registry (972), and sets aside
   example files (403).
3. `data/families.py` groups near-copies within a registry: Jaccard similarity of 6-token shingles of each part's main
   file, at 0.8 or above.
4. `library/stars.mjs` finds each registry's GitHub repository from its homepage and asks GitHub for its stars.
   `data/weight.py` turns stars, registry health, reduced motion and keyboard handling into one weight for ranking.

## The fields, and how far to trust them

Accuracy is measured against Claude's hand labels on 16 parts the extractor was tuned on (`labels.json`) and 10 it
never saw (`holdout-labels.json`). The held-out figures are the honest ones, and the sample is small.

| Field | What it says | Trust |
|---|---|---|
| `kind` | button, group, contains, not, example | high: 9 of 10 held out |
| `driver` | what moves it: a press, a state, a drag, a held time, the pointer's distance | high: 6 of 6 |
| `commitRule` | press, confirm, held-time, threshold (slide), countdown | high: 6 of 6 |
| `secondsToCommit` | for holds, the default length; unknown stays empty | high: 6 of 6 tuned; holds only |
| `reducedMotion` | it says what happens under reduced motion | high: 6 of 6 |
| `wordsDuringAction` | kept, fade, replaced, roll | **low: 3 of 5** |
| `tricks` | glow, blur, icon reshape, liquid, shimmer, ripple, moving border, particles, grain, tilt, text scramble | **low: 3 of 5** |
| `springs` | stiffness, damping, mass, worked out into damping ratio, overshoot and settle time | exact, as written in code |
| `hardcodedColours`, `keyboard` | colours written by hand; keyboard handlers | not measured |
| `feel` | five scales from −2 to 2 | estimated by rules, not a rating |
| `stars`, `weight`, `renderRank` | the library's GitHub stars (found for 233 of 312 libraries); the ranking weight; the order stage 3 renders in (at most 12 per library) | stars depend on the homepage linking the right repository (agents-ui resolved to LiveKit's main repository) |

## Known bias and gaps

- **One ecosystem.** shadcn registries share a look (Tailwind, Radix or Base UI, Motion). Native app patterns and other
  stacks are missing.
- **Read, not watched.** Timings come from code. Stage 3 records the best few hundred in a browser.
- **One rater.** The labels and the feel are Claude's until the owner's verdicts exist.
- **Prolific registries.** `@registrydirectory` mirrors others, and its copies are folded in. `@ndeko` (134 parts) and
  others still weigh more than one-off libraries; use families and weights, not raw counts.

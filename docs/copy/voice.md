# How React Plumber talks

Every word on the page competes with the page. So we write the way Paul Graham writes essays and Dan Abramov writes
docs: plain words, short sentences, the actual thing, no ceremony. If a sentence can lose a word, it loses it. If a
label can be a number, it's a number.

This guide governs the words on the page (pills, tags, rows), the findings (what's wrong, why, what to do), and the
overlay's chrome (dock, panel, toasts, errors). The CLI and docs follow later.

## The rules

1. **Say what's wrong, in words a person would say out loud.** "The sides are too tight", not "square padding on a
   text button". Read it aloud; if you wouldn't say it to a colleague, rewrite it.
2. **Lead with the thing they can see.** The element, the number, the edge. Theory goes last, and only if it earns
   its place.
3. **One idea per sentence. Two sentences at most.** What's wrong. What to do. A reason only when the fix looks
   arbitrary without one.
4. **Use real numbers.** "16px apart inside, 8px between groups" beats "the inner gap is wider than the outer gap".
5. **Name the property the way CSS does, then the token in brackets.** `right padding 12 (s3)`. Not `pr · s3 · 12`.
6. **Talk to the person, about their code.** "your scale", "your theme", "this button". Never talk about ourselves:
   no "React Plumber can't…", no "the blueprint", no "Plumber refused".
7. **No internal words.** These never reach the screen:

   | We say inside | They see |
   | --- | --- |
   | drift, off the scale | not on your scale / not in your theme |
   | cause | one fix (that covers N places) |
   | finding, mark, claim, verdict | problem (or nothing: the drawing says it) |
   | facet | the property's name: right padding, corners, text size |
   | craft rule, tier, confidence | nothing |
   | write, save | apply |
   | refused | couldn't apply |
   | read again, reading | checking |
   | locate, site, source line | where it is in your code |

8. **Errors say what happened and what to do next.** "This file changed after we checked it. Check again." Never a
   bare "refused".
9. **No colons chaining clauses, no "·"-separated sentences, no em dashes as glue.** A middle dot only separates
   values in a pill (`text 14 (sm) · line 20`).
10. **Sentence case. No ending period on labels and pills; periods on sentences.**
11. **Counts read as English.** "3 problems", "1 problem", "Nothing to fix on this screen".
12. **Length budgets.** Pill ≤ 28 characters. Row label ≤ 32. A finding's first line ≤ 72. Its reason ≤ 90. Toasts
    ≤ 48. Enforced by a test that renders every string.

## Before and after

### On-page pills and tags (tokens, but obvious)

| Before | After |
| --- | --- |
| `pr · s3 · 12` | `right padding 12 (s3)` |
| `pr · s6 · 24` (the target) | `right padding 24 (s6)` |
| `Aa sm · 14/20 · 500` | `text 14 (sm) · line 20 · weight 500` |
| `W Fill 500 · H Hug 64` | `width fills 500 · height fits 64` |
| `border 1 · r 12` | `border 1 · corners 12 (card)` |
| `gap · s2 · 8` | `gap 8 (s2)` |
| Changes row `Button pr s3 → s6` | `Button  right padding  12 → 24 (s6)` |
| `still py` | `top and bottom padding still off` |
| `changed since read` | `file changed, check again` |
| `×12` on a tag | `12 places` |

### Findings: the short label, the line, the reason

The short label is what a panel row says. The line is what `i` shows. The reason appears only on a second `i`.

| Rule | Before | After |
| --- | --- | --- |
| Button padding | label: square padding on a text button. title: `px-s3` pads this button 12px across and 12px down: words want about twice as much across. because: Words are wide and short; the same padding all round looks cramped at the sides. Text buttons take about 2:1, icon buttons stay square. | label: **Sides too tight**. line: **12px on every side. Text buttons need about twice as much on the sides.** reason: Words are wide, so equal padding looks cramped left and right. |
| Icon side | label: icon side padded like the text side | label: **Too much space by the icon**. line: **The icon side has the same 16px as the text side. Take 4px off it.** reason: Icons carry their own space inside them. |
| Concentric corners | `rounded-card` is not concentric: 4px inside a 12px corner wants 8px, not 12px | label: **Corner doesn't match its parent**. line: **This 12px corner sits 4px inside a 12px corner. Use 8px.** reason: Inner radius = outer radius minus the padding. Then the curves line up. |
| Inner vs outer spacing | inner gap wider than outer. Proximity is how people read grouping: the gap inside a group must be smaller than the gap between groups, or the groups dissolve. | label: **Group falls apart**. line: **Items here are 16px apart, but the groups are only 8px apart.** reason: People see things that are close as one group. |
| Faded text | text faded by opacity | label: **Faded with opacity**. line: **This text uses opacity 0.65. Use ink-muted, the colour it shows as.** reason: Opacity changes with whatever is behind it. |
| Contrast | 14px text at APCA Lc 51 on its ground: 60 is the floor for small text | label: **Hard to read**. line: **Contrast 51 at 14px. Small text needs 60.** |
| Line length | About 140 characters a line: past 75, the eye loses the start of the next line | label: **Lines too long**. line: **About 140 characters a line. Readers lose their place after 75.** |
| Tabular numbers | Numbers in this column use proportional figures, so they don't line up | label: **Numbers don't line up**. line: **Each digit here is a different width. Use tabular-nums.** |
| Heading widow | This heading ends with "cccc" alone on its last line | label: **One word on the last line**. line: **"cccc" sits alone on the last line. Use text-balance.** |
| Hit target | This control is 16×16px to hit: under 24px, people miss it | label: **Too small to tap**. line: **16×16. People miss anything under 24×24.** |
| Half pixel | `-translate-x-1/2` lands on a half pixel: shifted -16.5px, 0px, so its text blurs | label: **Blurry text**. line: **Moved by -16.5px, so the text lands between pixels. Make it 34px wide.** |
| Drift (spacing) | gap-[13px] … off the scale | label: **Not on your scale**. line: **13px isn't one of your spacing steps. Closest: 12 (s3).** |

### Overlay chrome

| Before | After |
| --- | --- |
| `61 off · 43 causes` | `61 problems · 43 fixes` |
| Drift in view, by cause | What's off on this screen |
| Nothing is off in view. | Nothing to fix on this screen. |
| All on the system | Everything matches your system. |
| Blueprint · J K move between causes · ↵ fixes one everywhere · hold Space to use the page | `J` `K` next problem · `Enter` fix everywhere · hold `Space` to use the page |
| Blueprint on. Reading this view. | Checking this screen… |
| Reading 120 of 400… | Checking 120 of 400 |
| One token fits. Take it with 1, or Enter. | *(gone with the card)* |
| Write 3 edits | Apply 3 changes |
| Wrote px-s4 to App.jsx | Applied px-s4 in App.jsx |
| Writing to source… | Applying… |
| React Plumber refused the write. | Couldn't apply. *(then the reason)* |
| The file changed since React Plumber read it. | This file changed after we checked it. Check again. |
| React Plumber can't tie this element to a line in your source, so it won't guess one. | Can't reach this in your code, so nothing here can be applied. |
| This element wasn't rendered by React (HTML written at runtime, or outside your app), so it has no line in your source. | Not drawn by React, so it isn't in your code. |
| The dev server's source map for this element doesn't lead back to your source, so React Plumber won't guess a line. | Your dev server's source map doesn't point back to your code for this. |
| Set in code · `gap={size}` | Set by code: `gap={size}` |
| Tailwind default, not your theme | Tailwind's default, not yours |
| Rendered by a library inside this component | Drawn by a library inside this component |
| Every write reloads the whole … | Applying reloads the whole page. Turn on hot reload to keep your place. |
| Undid px-s4 in App.jsx | Undone in App.jsx |
| React Plumber · Alt to inspect | Hold `Alt` to inspect |

## Decided

1. The button is **Apply changes** ("Apply 3 changes"); the toast says **Applied**. (Owner, 2026-10-27.)
2. **Problems**, not issues.
3. **Blueprint** stays as the mode's name (Alt+B); no sentence starts with it.
4. When an element can't be tied to the code: **"Can't reach this in your code"**. (Owner.)
5. Every string is checked against the better-writing skill (jakub.kr/skills#better-writing; source:
   github.com/jakubkrehel/skills, `skills/better-writing/`) before it ships, as a first-time reader. (Owner, 2026-10-29.)
6. The fix panel's words live in `overlay/src/words.js` (`FIX`), never inline and never server prose shown raw. Its
   vocabulary: a **fix** covers N **places**; buttons are verb-first: **Use md**, **Add to theme**, **Keep as is**,
   **Skip**, **Apply changes**; status is parallel: **Applying 3 changes…** → **3 changes applied**; checking is
   **Checking this screen…**; all clear is **Nothing to fix on this screen.**; a placeholder shows an example.

## How it's built

All overlay strings move into one module, `overlay/src/words.js`, grouped as `pill`, `label`, `line`, `reason`,
`chrome`. Rules return numbers and a key, not sentences. `words.js` turns them into text, so the voice lives in one
file and one test checks every string against the budgets above.

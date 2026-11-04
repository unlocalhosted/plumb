# Craft rules: verification, 2026-11-04

What was checked: every one of the 77 rules in docs/craft/rules.md, against the code that claims it. Five reviewers
(Fable), one per catalogue section, read the code, ran pure functions in node, and named the e2e case that proves each
rule. A sixth reviewed the two commits of the day. No reviewer edited anything. Claims marked **(confirmed)** were
re-read or re-run by the main session; the rest are reviewer reports, not yet confirmed.

## The finding behind the findings

"Encoded" was counted as "some rule carries the number". That says nothing about whether the rule checks what its row
says, or whether a test would fail if it broke. Measured that way, all 77 were encoded. Measured as **registered +
faithful to the row + proved by a bad case that must be marked and a good case that must not**, it is:

| status | rules |
|---|---|
| full and proved | 6, 7, 8, 10, 23, 24, 28, 34, 36, 40, 47, 54, 70, 73, 76 |
| partial (checks part of the row) and proved | 1, 2, 3, 4, 5, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 29, 30, 31, 32, 33, 35, 37, 38, 39, 41, 42, 43, 44, 45, 46, 48, 50, 51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 71, 72, 74, 75, 77 |
| not checked at all | 53 **(confirmed: layered-shadow carries the number, its check reads no offset)** |
| claimed by a check that does something else | 69 (a `vh`/`env()` lint, not dynamic viewport units) |
| not proved (its test passes with the rule deleted) | 49 **(confirmed: e2e/craft-wave4.test.mjs:77 skips it whenever it has no mark)** |

The wave tests prove "a mark of rule X lands on `X-bad`, none on `X-good`". They don't fail on a stray mark elsewhere,
and they don't read the numbers or the suggestion. A rule can mark half the page and pass. Elevation-ladder now fails on
a stray mark (proved by breaking it); the other wave tests don't yet.

## Fixed today

- **Colours in oklch, oklab and color(srgb) were invisible (confirmed in Chromium).** getComputedStyle keeps the space a
  colour is written in, and Tailwind v4's palette is oklch. The one colour reader (overlay/src/craft-read.js `rgb`)
  read rgb() only, so contrast, grey levels, disabled contrast, text opacity, tinted shadows and the shadow census were
  silent on the default palette. It now converts all of them. e2e/craft-oklch.test.mjs fails on the old reader and
  passes on the new one.
- Tinted shadow skipped Tailwind's own shadow-sm…xl (exactly 10% black, compared with `>`); it now counts them.
- Eased scrim now reads `from-black/60` stops (oklab).
- Elevation ladder: offered a colour class as the level (`shadow-black/5`); counted see-through layers; its test passed
  with the rule marking the ladder's own levels.
- Tooltip probe: timed the pointer's absence in Node, so a loaded machine read the page as wrong. Now timed on the
  page's clock, from leaving the trigger to coming back.

## Open, most severe first

Each is a reviewer's finding with its file and scenario. The fix for most is a decision about what the rule should do,
not a typo.

1. **#68 exit-faster assumes 150ms it never read (confirmed, craft-rules.js:1756).** An element with `data-[state=open]:`
   and `data-[state=closed]:` utilities and no `duration-*` (a chevron rotate, any shadcn Popover) is told "opens and
   closes in 150ms". A closed duration longer than open is accepted.
2. **#12 rhythm marks the page's one section stack.** It compares each column stack to the page's majority gap, so the
   single outer `<main class="flex flex-col gap-12">` is the minority and marked. The row asks for section gaps down
   the page. The wave-six demo's `<main>` is marked today and the test can't see it.
3. **#15 tracking is half a rule (confirmed, craft-rules.js:628).** Large type is flagged only when its tracking is
   already positive; a 48px heading at 0 (the usual case) never.
4. **#14 leading skips `line-height: normal`** (px() of `normal` is 0): the commonest cramped case is never judged.
5. **#69 viewport-dynamic flags the fallback pair (confirmed, src/habits/index.ts:229).** `height: 100vh; height: 100dvh`
   is marked; safe-area-fallback flags `max(1rem, env(safe-area-inset-left))` while a fixed bottom bar with no inset is
   silent.
6. **#38 hairline on a 2× screen marks every 1px single-side border.** No well-built page is tested at 2×.
7. **#1 content-align reads only `flex-col` parents**: a block `<ul>` nav, the commonest sidebar, is never judged.
8. **#2 optical centre drops nudges under 1.4px** (grey confidence under the floor); the wave-seven bad case is 1.5px.
9. **#3 overshoot reads filled glyphs only**: outline sets (Lucide) never fire.
10. **#5 trim-leading** fires on every `text-sm/6 py-2` button (half-leading 3.5px), and its preview sets a different
    text-box than its class.
11. **#71 touch-manipulation is never suggested under Tailwind v4**, whose preflight clears the tap highlight; the
    structure test asserts that silence.
12. **#72 overscroll-contain flags every scroller**, a code block included; the row is about overlays.
13. **#11 the spacing family checks "on the scale", not "few values".**
14. **#59, #61 probes have the tooltip probe's flaw**: wall-clock waits (a 10-step path to a submenu; one 200ms window
    after pointerdown) that a loaded machine turns into findings.
15. **#31 press feedback counts a `focus:` style or a running hover transition as the press's answer.**
16. **#64 interruptible's measured half is structural**: Motion's WAAPI animations reverse yet read as restarting.
17. **#65 overdrag "free"** marks carousels and free cards; its `mouse.up` is a real drop.
18. **#48 text-wrap-role** counts a nested list's lines as its own (`li` with a nested `ul`).
19. **#26 a disabled control with unreadable own colours has no judge**: disabled-contrast speaks only under opacity,
    and its scope silences contrast.
20. **#75 the two halves disagree** on what a cue is; the measured half clears a rounded filled scroller.
21. Smaller, each in one rule: #19 quotes `rock 'n' roll` wrongly; #43 any `size-adjust` clears every font; #46 never
    checks the font has `case` and overwrites `font-feature-settings`; #51 tells a coloured glow to go black; #57 misses
    `opacity-60` on a container; #35 calls a Radix-tooltipped label "no hover value"; #39 an image judged before it
    loads stays quiet; #74 suggests `z-10` on a portalled popover; #77 is quiet when rows differ at the same height; #17
    calls one `font-black` hero "a weight too many".

## The system to replace

A rule is done when its row, its check and its test agree: the check reads what the row says, the test has a bad case
that must be marked, a good case that must not, and nothing else on the page may be marked. The wave tests should
assert that last part for every rule, as wave six now does for elevation-ladder; each rule above then fails until it is
fixed or its row is narrowed to what it checks.

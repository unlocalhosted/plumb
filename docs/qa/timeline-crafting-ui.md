# QA: change trace, laws and the timeline on crafting-ui (2026-11-03)

Real app: crafting-ui (Vite 8, React 19, Tailwind 4.3, Base UI, 226 components), its own dev server on
`localhost:5180` restarted on plumb `d32cef0`. Routes: `/motion/standards` (406 elements: `StandardEntry` rendered
18×, lists in lists, `lg:` and `group-hover/toc:` variants, `!text-fg`, clamp() values, a `Lettering` component
taking `className` at its usage) and `/stickers` (786 elements). Every write went to a clean file and was reset with
`git checkout -- src/pages/MotionStandardsPage.tsx`; the other session's four dirty files were never touched.
Scripts: the session scratchpad `qa/qa-s1.mjs` … `qa-s4.mjs`, Chrome via `PLUMBER_CHROMIUM`.

## What held

| Scenario | Proof (raw) |
|---|---|
| Craft laws on real findings | `plumber craft --routes /motion/standards /stickers --json`: 1,192 elements read, 39 records over 10 rules, `null laws: []`. hit-target ×230 → Fitts; inner-outer-spacing ×78 → proximity, common region; stroke-weight ×72 → similarity; contrast, caps-case, leading, tracking, icon-side, truncate-intent, text-wrap-role → `[]` |
| A four-change step | `write {"status":200,"applied":4,"refused":[],"group":"qa-spacing"}`; timeline `Spacing: live live live live` |
| Outlines on repeated components | the `dt` in `StandardEntry`: `marks: 18`; the `h2` in the discipline map: `marks: 2`; first outline sits on `dt.label.pt-1` |
| Preview on real classes | scrubbed to the h2: `h3mt 8px, dtpt 5px` (before values), `h3style: "margin-top: calc(var(--spacing) * 2) !important;"`; back at Now: `h3mt 12px, dtpt 4px, h3style: null` |
| Go back to here | file after: `mt-2 …`, `mt-2 …`, `label pt-[5px]`, `… leading-tight` (exactly the three right of the playhead undone); the write fully reloaded the page and the timeline came back at Now (`pointed 6`) |
| Text edits | pill `Drafting → Motion`; scrubbed one back: h1 `Drafting standards.`; at Now: `Motion standards.` |
| No page errors | `page errors []` in every scenario |

## Issues

| # | Severity | What happens | Proof | Where |
|---|---|---|---|---|
| 1 | High | **The strip waits for `try` before drawing any tick.** On crafting-ui `try` takes ~1s (`try 0.988998s`, trace `0.05s`); the strip showed ghost ticks 1.5s and 2.5s after opening | `open {"steps":[" : ? ? ? ? ? ?"]}`; `timeline after write [" :      "]` | history.js `#load` awaits `#learn` |
| 2 | High | **A class written at a component's usage is matched to the wrong element**, and scrubbing past it changes nothing on the page | `<Lettering className="enter mt-6">` renders `p.measure … enter mt-6`; outlined `p.enter max-w-[34em] …` (the paragraph before it); scrubbed one back: still `mt: 24px` | history.js `elementsOf` reads DOM stamps only; a usage's stamp is on the component's fiber |
| 3 | Medium | **Panel writes carry no step name and no laws**, so steps are named after the file (`MotionStandardsPage.tsx` twice in one strip) and the pill has no law | trace `c8 g2 live -> gap-2 40 null` (meta null); step names `["Spacing","Undo","MotionStandardsPage.tsx","Usage","MotionStandardsPage.tsx"]` | every panel's write path; nothing tags a request with its action |
| 4 | Medium | **Two Undo surfaces for one write.** Tidy's write shows its own `Tidied MotionStandardsPage: 1 change · Undo` (file restore) and no History toast; the timeline's step Undo is not what panels use | `surfaces after write {"toast":[],"fixSaid":["Tidied MotionStandardsPage: 1 changeUndo"]}` | fixpanel / tidycard (other session's files) |
| 5 | Medium | **History hand-reset by git stays forever as hatched ticks**, mixed with live ones, no way to clear | after resets: `10 records {"changed":4,"live":3,"undone":3}` | changes.ts keeps 2,000 records; the strip shows them all |
| 6 | Low | **Insertions keep their leading space**: pill `∅ →  mt-6`, trace `to: " gap-2"` | `pill ∅ →  mt-6` | changes.ts hunks (display only: the record must stay exact for undo) |
| 7 | High (for the page clean-up) | **Tidy evens out intentional grouping.** On the `aside` (eyebrow, h2 `mt-2`, p `mt-2`, nav `mt-5`) it proposed `8/8/20px → 8px: the gaps inside are even`: the nav's 20px is a separate group, so this works against the law of proximity it serves | `tidy rows ["Space inside of the card 8/8/20px → 8px The gaps inside are even."]` | hierarchy.js S2 |
| 8 | High (for the page clean-up) | **Tidy writes `gap-2` on a block element**, whose gaps came from margins: the write changes nothing on the page | diff `<aside className="lg:sticky lg:top-8 lg:self-start gap-2">` (aside is `display: block`) | hierarchy.js S2 writes `gap` without checking the container lays out with gap |
| 9 | Medium | **Plumber's cache folder isn't ignored in user projects**: `?? .plumber/` in crafting-ui (sources, modules, rankings, stylesheets, components, and now changes.jsonl) | `git status --short .plumber` → `?? .plumber/` | cache directory creation; should write `.plumber/cache/.gitignore` with `*` |
| 10 | Medium | **Four overlay surfaces at once** after an Alt+click: text card, fix bar (`1 problem · Fix`), a hint (`…two-finger scroll… Got it`) overlapping the fix bar, the dock | screenshot `qa/s2-afterclick.png` | the parked one-surface work (widget.js, other session) |
| 11 | Low | `plumber craft --url http://127.0.0.1:5180/` says to start the dev server when it is running on `localhost` (::1 only) | `net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5180/…` while `lsof` shows `localhost:5180 (LISTEN)` | craft-run error message: try `localhost` before telling the user it isn't running |

## Found while re-checking the fixes

| # | Severity | What happens | Proof | Where |
|---|---|---|---|---|
| 12 | High | **An old record matched the next element down.** After an undo (h2 `mt-3 → mt-2`) and the same change written again, the undo's record read as *live*: its 8-character context `className="mt-2 font-re` also fits the `<p>` on the next line, so Go back to here would have written to that `<p>` (a 400 refusal stopped it by chance) | trace before the fix: `c5 g1 live 42 "mt-3" -> "mt-2" undoes c2,c3` while line 42 read `mt-3` | changes.ts `locate` accepted one-sided and narrow matches anywhere |

## Fixed (re-run on crafting-ui, plumb working tree after d32cef0)

| # | Fix | Proof on crafting-ui | Regression test (from crafting-ui's code) |
|---|---|---|---|
| 1 | Ticks drawn from the trace; classes learnt after, the past filled in when they land | scenario 1 `open` lists all steps at 1.5s (was ghosts) | timeline-real: compile held 3s, ticks in under 2s; old code: `ticks after 3346ms` |
| 2 | Changes matched to component usages through fibers; one read of the page per playhead move | outline `[40,364,1200,18]` = Lettering's `<p>` `[40,364,1200,18]`; scrubbed back: `mt 0px` | timeline-real: old code outlined `[40,142,646,114]` |
| 6 | Labels trim the space a written class carries | pill `∅ → mt-6` | timeline-real |
| 9 | `.plumber/cache/.gitignore` (`*`) written when a session or a check makes the cache | `git status --short .plumber` → nothing | timeline-real |
| 11 | `plumber craft` tries 127.0.0.1, localhost, [::1] before giving up | `--url http://127.0.0.1:5180/` → `findings 26 read 406` | craft-run: a server on ::1 only, asked for at 127.0.0.1 |
| 12 | `locate`: only the full context may match anywhere; narrower matches only on the change's own line; otherwise refused | — | change-trace: old code read the undo as `live` |

Still open: 3, 4, 7, 8, 10 (panel write paths, Tidy's rules and the one-surface work, in files another session is
editing) and 5 (what the timeline does with history reset by hand: a decision).

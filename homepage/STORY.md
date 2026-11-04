# The homepage's story

Agreed with the owner on 2026-11-04. The page sells three things, in this order, and every section proves one of them on
real product UI, in the homepage's own foundations (`src/foundations/foundations.css`, bar: Linear).

| # | Section | Sells | Proof (true today, checked against the code) |
|---|---|---|---|
| 0 | Hero | all three, in one line | – |
| 1 | Keep AI slop out of your app | agents write arbitrary values; Plumber catches each one and names the fix from your theme | the agent hook runs `plumber check --changed --agent` after every edit; findings say "`gap-[13px]` hardcodes 13px" with exact replacements; CI fails only new findings (`baseline`) |
| 2 | Live editing | change it on the running page and the exact class lands in the exact JSX line | one guarded write per file, checked against the file's hash, undoable; text edits in place |
| 3 | Save tokens on iteration | a tweak costs no prompt and no model call | edits from the page call no model (only `craft --judge` does, and it's opt-in); `--agent` hands agents exact edits, so they don't read and guess |
| 4 | Install | – | `npm install -D @unlocalhosted/react-plumber` |

"Every fix uses your theme" and "Start on the repo you have" are proof inside section 1, not sections of their own.

Claims stay checkable: show the difference (no model call, an exact edit, a guarded write); never say no other tool
exists.

Process per section: three static comps (`section-*-comps.html`), the owner picks, then build with motion, phone and
both schemes.

# Film № 3, Optical overshoot: review of the draft

Draft: one run, 30.6 s, 16 beats (`node overlay/showcase/scripts/film-draft.mjs 3`, docs/films/03-draft/, not kept in
git). Read from its beats and keyframes; nobody watched it.

## Story (film-story-review)

**The question:** "why does the circle look smaller than the square?" Planted only at 6.7 s, when the circle turns
coral. Answered at 12.4 s ("fills 78.5% of the same box"). Before 6.7 s nothing on screen asks it.

| at | beat | the viewer knows by its end | verdict |
|---|---|---|---|
| 0.0 | title on the empty desk | the rule's name | fix: nothing to look at in a feed's first seconds |
| 1.6 | the board rises in | a whiteboard app | shorten |
| 3.6 | it happens | nothing new: the difference can't be seen at this size | fix |
| 5.3 | camera in | the shapes picker matters | keep |
| 6.7 | measure | the circle is the suspect | keep |
| 8.3 | the cause, the class | one box for every shape | keep |
| 10.8 | the dive | the square and circle, up close | keep |
| 12.4 | up close | the circle leaves its corners empty: 78.5% against 99.8% | keep, the best beat |
| 15.9 | the fix up close | the circle now passes the line | fix: only the pill says so |
| 18.7 | back out | — | keep, short |
| 20.0 | payoff | every row fixed | fix: invisible at this size |
| 23.4 | check and burst | it's done | keep |
| 26.6 | closing | React Plumber | keep |

- Problem 12.3 s against fix 7.5 s: 1.6×, in line with the references. Passes.
- Cringe check: passes. No hype, no repeats; the burst plays once.

**The three fixes that would most help someone stay to the end:**
1. **Open on the problem (0–5 s).** The first 3.6 s are a title on an empty desk, then a board too small to show
   anything. Start on the Basic row's square and circle, large, with the title over them, so the question ("isn't that
   circle smaller?") is asked in the first frame.
2. **Make the fix visible without the pill (15.9 s).** Keep the old circle as a dashed coral ghost inside the new one,
   so the growth is seen, not read.
3. **Make the payoff visible (20 s).** At card size a 4% change is invisible. Pay off up close instead: all three rows'
   circles, side by side with their squares, ghost and new, at the dive's zoom.

**Verdict:** fix, then run the draft again.

## Camera (film-camera-review)

- **Act 1 (3.6 s):** the subject (a circle beside a square) is about 10 px in a 1600 px frame, among photos, notes and
  cursors that out-shout it. The frame doesn't serve it.
- **Act 2 (6.7–8.3 s):** a good frame. The coral circle is the most contrasted thing. Its pills are tiny (see below).
- **The dive (12.4 s):** the best frames. Fills the card, one subject, the hatched corners read at once. But the
  example's own labels "Basic" and "Flowchart", blown up to 6×, are the largest things in the frame and compete.
- **Act 3 and 4:** the fixed frame looks almost the same as the broken one (the story's fixes 2 and 3).

**The three worst problems:**
1. **Nothing is readable on a phone.** Plumber's pills are 11 px in a 1600 px stage, so about 2 px across an upright
   phone. The change card's classes, the signature ("Craft № 3") and the closing line are the same. This fails every
   film, not only № 3: the film's marks need a film size, about 2.5× today's.
2. **Act 1 is a wide shot of nothing.** The card sits small in a large empty desk (keyframe 03). Frame it to fill the
   stage, or go straight to the picker.
3. **The dive competes with the example's words.** Dim everything under the drawing (plumber's own blueprint shade)
   so the square and circle are the only bright things.

- **Legibility at phone size:** fails (pills, change card, signature, closing line).
- **Frame rate:** the recorder captures at 25 fps, and the finals were re-timed to 30 fps, so camera moves can judder.
  The finals need a frame-exact capture at 60 fps, as the logo film has (one clock, every frame drawn).
- **Cringe check:** passes.

**Verdict:** fix, then run the draft again.

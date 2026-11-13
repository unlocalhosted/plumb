# The stage: motion and look brief (for sign-off)

Benchmark: `~/Downloads/twitter_media_harvest/maybepratikk-2117890135945822554-01.mp4`, measured at 10 fps
(contact sheets in the session scratchpad). Every number below comes from those frames, not from taste.

## What the benchmark actually does (measured)

| t (s) | What happens |
| --- | --- |
| 0.0 – 3.0 | Figures tick fast: most cells change every frame (~10 changes a second). Proportional, so the columns shimmer. |
| 3.0 – 3.3 | The ticking **decelerates and lands**: values stop on round, final numbers. Nothing else moves. |
| 3.4 – 4.4 | **Camera eases in** (~1.0 s, slow start, slow finish) to ~2.2×, panning so the four number columns plus their totals fill the frame. The crop is the frame's edge: nothing fades, nothing is masked. |
| 4.4 – 4.6 | Marks fade in **after** the camera lands (~200 ms): hairline stripes on every glyph edge, a very faint fill, and one small pill per column on the line between the totals and the rows. |
| 4.6 – 5.9 | **Hold on red** (~1.3 s). Figures stay frozen. The cursor travels to "Tabular". |
| 5.9 | Click "Tabular". |
| 6.0 – 6.4 | **The fix as one move** (~400 ms): glyphs glide into place, the stripes converge, and each pill's number **counts down** (2.6 → 2.4 → 0.9 → 0.3) while its colour runs pink → violet → blue, ending as a check. |
| 6.4 – 7.8 | Hold on blue (~1.4 s). |
| 7.9 – 8.1 | Marks fade out (~300 ms), checks first. |
| 8.2 – 9.0 | **Camera eases out** (~0.9 s) to rest. |
| 9.0 → | Ticking resumes, now tabular: the same churn, no shimmer. |
| ~10.5 | Back to "Proportional": **no camera**, the shimmer simply returns. |

## What I built, against it

- **The ticking never stops,** so the marks jitter and the measurement is never readable. The benchmark freezes the
  world for the whole moment.
- **Wrong order.** I zoomed and drew marks at the same instant, then fixed 1.3 s later on a timer. The benchmark goes:
  settle, then camera, then marks, then hold, then the fix on the person's own click, then hold, then marks out, then
  camera out, then life again.
- **The camera was weak.** It went to 1.2–1.4× with a fixed 900 ms curve, and the frame was so narrow it sliced the
  card. The feathered mask I added is a patch on that, not a fix.
- **Pills jumped** from red to blue with a check. The benchmark's pills count the drift down to zero as the fix lands:
  the number is the motion.
- **The marks were heavy:** 35% red lines and a 6% band. The benchmark's are thinner and lighter, and its pills are
  brighter.
- **The component was too heavy:** a big window shadow plus a ring, initials for avatars, text-lg semibold totals. The
  benchmark is a hairline border with no shadow, photo thumbnails, medium-weight totals, small grey labels and
  small tags.
- **The lesson below** reads like documentation: a heading, a rule and four labelled blocks.
- **The motion wasn't authored.** Timings were scattered `sleep`s. It needs one storyboard with named timing.

## The storyboard to build (interface-craft storyboard pattern)

```
   0ms   click the other side of the switch
   0ms   figures decelerate and land                      (settle 400ms)
 400ms   camera eases in to the measured columns, ~2.2×   (spring, ~1000ms visual)
1400ms   marks fade in: stripes, then pills               (200ms, pills 40ms after stripes)
1600ms   hold on what's wrong                             (1200ms)
2800ms   plumber's fix glides in; pills count to 0,
         red → blue, then ✓; stripes converge             (400ms, plumber's GLIDE)
3200ms   hold on right                                    (1300ms)
4500ms   marks fade out, checks first                     (300ms)
4800ms   camera eases out to rest                         (spring, ~900ms visual)
5700ms   figures start ticking again; plumber asked again at rest
back     to the mistake: no camera, the glide reverses and the shimmer returns
```

The benchmark's fix comes from a second click while zoomed. I propose **one click**, because the stage is a demo of
plumber: the inspection and the fix run as one authored moment. That's open question 1.

## Look: qualities, never the benchmark's design

The benchmark gives qualities; our components are designed from our own domain (Quarry, the invoicing product the
showcase lives in), with their own layout, words and data. Nothing is reused from the video: no figures, strings,
column sets or structure. Every example is checked against it for copying before it is shown.

The qualities:
- **Presentation scale.** A component meant to be looked at: generous room, larger type than an admin screen.
- **One hero.** The thing the principle is about is the largest, calmest element; everything else steps back.
- **Few, deliberate type styles.** One ramp, two greys, weight only where it carries meaning.
- **Real words.** Labels a product team would ship: specific, short, no placeholders.
- **Restraint.** No borders where space separates; one surface; depth from a soft shadow, not outlines.

### #16, concept

- **Outcome:** someone tracking billable time sees the running timer and today's entries.
- **Why figures change here:** a running timer ticks every second and its billable amount climbs with it. Proportional
  digits make a ticking clock wobble and leave stacked durations ragged. That's the most recognisable place this
  principle bites.
- **Layout:**
  - The running timer is the hero: its project and client, the time at display size, what it has earned, and a stop
    button.
  - Below it, today's finished entries: task, client and duration, with the amount under the duration.
  - Then a total that climbs with the timer.
- **What doesn't change:** one surface, one hero, durations stacked right so their places line up once tabular.
- **Rejected:** analytics tables with summary headers and metric columns (the benchmark's shape).

## Decisions

Settled then, **superseded 2026-11-13**: one click runs the whole moment (it started the lesson at "show me fixed" and dropped the act where the fault simply happens; see storyboard v2 and the skill's §3⅝); the lesson is quiet and always there, below the fold.

---

## Storyboard v2: show the problem, show how the fix works, then pay it off (2026-11-13)

**The itch (owner, 2026-11-12 and 13):** "our showcase is being rushed … we don't show the problem very well, we rush the
fix and don't have good payoff."

**The reference:** maybepratikk's bold-on-hover tabs (~/Downloads/twitter_media_harvest/maybepratikk-2121151672756138484-01.mp4,
22.8 s, read at 2 and 6 frames a second). Qualities taken, never its component, words or numbers.

### What it does, measured

| Time | Act | What happens |
|---|---|---|
| 0 – 4.5 s | **It happens** | At real size, nothing drawn. The pointer runs over each tab in turn, and the row jitters each time. You feel the fault before anyone names it. |
| 4.5 – 5.5 s | camera in | Eases in to about 1.7×. |
| 5.5 – 10.5 s | **Measure it** | Each tab's own box becomes a dashed guide. Hovering one tab: a red pill over it (its width, before → after) and a red "+2px" at every neighbour's edge that moved, with a hairline down that edge. The gesture is **repeated three times**; the marks come and go with it, so the number is tied to the motion. Then the **cause, in words**: "Bold is 2px wider". About 5 s in all. |
| 11 – 11.5 s | the switch | The red marks fade, then the switch is pressed (Shifts → Stable). |
| 12 – 14.5 s | **How the fix works** | The guides turn red → blue. The fix's hidden part is drawn: a faint bold copy of every label drops in under it (the space it reserves), with a blue pill counting "reserves 111px → 112px". It holds about 2 s, then folds back up out of sight. |
| 15 – 19 s | **Payoff** | The same gesture as before, on every tab, one after another (~0.7 s each): a blue "124px → 124px" over it and "+0px" at every neighbour. Same ruler, same places, now zero. |
| 19.5 – 22.8 s | out | Camera out; rest; the row is calm under the pointer. |

**The proportions, measured** (pink and blue pill pixels counted in every frame at 10 fps): red marks on 5.7–6.9 s and
7.7–10.8 s; blue on 13.4–15.5 s (the reserved copy) and 16.2–19.4 s (the payoff).

| | Problem (incl. its live act) | Fix (working + payoff) | Problem ÷ fix |
|---|---|---|---|
| Bold-hover tabs (this reference) | 10.8 s | 6.7 s | 1.6× |
| The ledger (first reference) | 5.9 s | 1.8 s | 3.3× |
| Our stage | 1.4 s of marks, no live act | 1.7 s (0.4 s glide + 1.3 s hold) | 0.8× |

### Why ours is rushed (the system, not the timings)

1. **The problem is never seen happening.** Our moment starts from the switch, so the first thing anyone sees is
   marks. The fault has to happen first, live and unannotated.
2. **The number isn't tied to anything.** Our pills appear once and sit there. In the reference, the measure comes and
   goes with the gesture, and the cause is said in words after the number.
3. **The fix is a glide, not an explanation.** We morph to the fixed state. The reference draws *why* it works (the
   reserved bold copy) before showing that it does.
4. **There is no payoff.** We hold on the fixed state. The reference repeats the exact gesture with the exact ruler on
   every instance, and the numbers read zero.

### The storyboard to build (one stage, named timing)

```
ACT 1  IT HAPPENS                                   (~3–4.5 s)
   0ms   the broken side at rest size, nothing drawn
         live rules: a drawn pointer plays the gesture over each instance
         still rules: the eye is led over each instance by a soft spotlight, one by one
ACT 2  MEASURE IT                                   (~5 s)
  4000   camera eases in (1000ms, our in-curve)
  5000   guides grow from each instance's own geometry (coral, dashed, 1px with halo)
  5300   the gesture (or spotlight) again; coral pills count up as it lands; gone as it leaves   × 2–3
  8500   the cause in words, one pill under the subject ("Bold is 2px wider")
 10000   coral marks fade (300ms)
ACT 3  HOW THE FIX WORKS                            (~3 s)
 10300   the switch presses itself (its own spring), labelled with the technique
 10600   guides turn coral → mint; the fix's working is drawn (Example.mechanism):
         what the fix adds, made visible for a moment, with a mint pill counting to its value
 12600   the mechanism folds away; the fix stays
ACT 4  PAYOFF                                        (~4 s)
 13000   the same gesture / spotlight, on every instance, ~700ms each:
         the same pill in mint, reading the fixed number (+0px, ✓)
 17000   marks out, camera out (900ms)
 18000   rest; the viewer's switch now flips it by hand (acts 3–4 only, no camera)
```

**What each screen has to supply** (new): `Example.gesture` (the instances, in order, and what the act does at each)
and `Example.mechanism` (a drawing of what the fix adds: a reserved copy, a trimmed line box, a hanging quote's
margin). Without a mechanism, act 3 is only the colour change.

**Decided by Claude:** the pointer in act 1 is a drawn cursor, part of the film. The viewer's own input is never
synthesized (§3¾); the film plays, then the switch is theirs. **Open for the owner:** the film plays by itself on
arrival (the reference) or on a Play press (calmer on a page of 40 screens).

**First screen:** #42 (tabs whose bold hover moves the row), since it is the reference's own principle. Then #16, the bar.

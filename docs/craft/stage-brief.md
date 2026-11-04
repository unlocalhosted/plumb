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

Settled: one click runs the whole moment; the lesson is quiet and always there, below the fold.

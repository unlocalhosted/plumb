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

## Look

- **Component:** hairline border (`ring-1 ring-line`), radius 12, no window shadow (the benchmark has none; the board
  carries depth), photo thumbnails (36px, radius 6), totals in medium weight, labels xs grey, tags xs with a 1px
  tinted ring. Numbers stay right-aligned: they are figures in a ledger.
- **Marks:** stripes 1px at ~22% of the mark colour, fill ~4%; pills 16px tall, sans 10px medium, full radius,
  the brighter magenta-red (`--color-magenta`) for wrong and the accent for right, colour interpolated through the
  count-down.
- **Camera:** the stage frame is the whole stage column, edge to edge, no mask. Zoom chosen so the subject fills
  ~90% of the frame's width, up to 2.4×.
- **Switch:** as the benchmark: a sunken track, a white thumb with a 1px shadow, 13px labels, and the thumb slides
  (a spring) between sides instead of jumping.

## Open questions for you

1. **One click or two?** One click runs the whole moment. Two clicks (the benchmark) means: hover or focus on
   "Tabular" settles the figures and zooms in on what's wrong, and the click takes the fix.
2. **The lesson below:** quieter but always there (one line of plumber's finding, then why/habit/fix as plain
   paragraphs, no labels), or collapsed behind "Why this matters"?
3. **Photos:** may I generate or source real thumbnails (client logos, project photos) for the ledger, or keep
   drawn marks?

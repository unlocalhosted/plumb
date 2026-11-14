---
name: film-camera-review
description: Review a React Plumber film's cinematography before it is rendered (its camera plan, then its draft keyframes): composition, where the eye goes, camera moves, legibility at phone size, colour, motion quality and ugly in-between frames, so every frame is beautiful and calm. Use before the final render of any film (overlay/showcase /film/N, the logo film, any marketing explainer), and whenever a film looks cramped, busy, cheap, hard to read or jumpy.
---

# The camera review

The question this review answers: **is every frame beautiful, legible on a phone, and calm, and does the eye always
know where to look?** Taste is the judge, but the taste is written down, so it can be checked and argued with.

It runs at the same two gates as the story review (film-story-review), before anything expensive:

1. **Storyboard gate** (nothing rendered): the camera plan: each beat's framing (whole card, one element, one detail),
   each move's start, end and length, and what is drawn on screen at each beat.
2. **Draft gate** (one cheap run): `node overlay/showcase/scripts/film-draft.mjs <N>` writes `docs/films/<N>-draft/`.
   Open every keyframe at full size (each one is 900 ms into its beat, when the beat should look its best) and the
   one-frame-a-second sheet for rhythm. Nobody watches the draft.

The final render (1920 × 1080, and any other format) happens only after both reviews pass.

## What it checks, and why each holds

1. **One subject per frame, and it is the most contrasted thing.** The eye goes to the highest contrast and to motion
   first. In each keyframe, name the subject; if the brightest, most saturated or moving thing is something else (a
   loud photo, a pill that out-shouts the fault), the frame is fighting itself.
   *Source: how visual attention works (contrast and motion pull the eye first).*
2. **The eye lands where it already was.** Across a camera move or a change of view, the subject should end near where
   the viewer was looking, so they never hunt for it.
   *Source: Walter Murch, "In the Blink of an Eye" (1995): eye-trace, one of his rule of six for a cut.*
3. **Framing: nothing that matters touches an edge.** The subject and its marks sit inside the frame with room round
   them; nothing is cut by the frame edge (film 3's first dive cut the circle in half). Mind the platform's own
   interface: on tall formats, keep text and the subject out of roughly the top sixth and bottom quarter, where the
   feed draws its buttons and captions; check the platform's current guide.
4. **A move is motivated, single, and finished before anything is read.** The camera moves toward what the viewer must
   see next, one move at a time, with an ease in and out. Marks and words arrive after it stops, never during.
   *Source: craft-rule §3½ and §6 (the stage's own motion rules).*
5. **Each level of zoom shows something new.** Card → element → detail: if a deeper view shows the same thing bigger,
   it is a zoom for its own sake. The dive is earned when the detail can only be seen there (pixels, a construction).
6. **Readable on a phone.** The film is watched on a phone more than anywhere. A 1920 × 1080 frame shown across a
   phone held upright is roughly a fifth of its size, so on-screen text needs to be about 28 px tall in the frame to
   read, and pills and labels the same. Small mono text inside the example (a class name in the change card) counts
   too. If it can only be read at full size, it is decoration.
   *Source: arithmetic on the output size; check it by viewing the keyframe at 400 px wide.*
7. **Colour means one thing each.** Sky measures, coral is broken, mint is fixed (plumber's own primitives,
   overlay/src/tokens.css). No other accent competes, and the example's own colours don't borrow those meanings.
8. **Motion is calm.** Unrelated things never move at once. Big moves don't overshoot; springs are for small things
   (a pill popping in). UI marks take 200 to 500 ms, camera moves about 0.8 to 1.5 s.
   *Source: the Animations on the Web course's durations (the animate skill).*
9. **No ugly frame in between.** Check the frames between keyframes on the sheet: a double image while one view fades
   over another (film 37's first rise), something popping in at full size, a pill landing on the example's words, a
   flash of an empty or unstyled frame.
10. **The frames are clean enough to keep.** The final is rendered at 30 to 60 fps, never at the draft recorder's 25;
    a slow pan at a low frame rate judders. Text and fine lines stay sharp (no blurry upscale of a small capture).

### The cringe zone: never

- Camera shake, a zoom punch on every beat, whip pans, a Ken Burns drift on still UI.
- Glows, lens flares, gradient text, heavy drop shadows, a fake 3D tilt on a flat UI.
- Confetti or a burst that isn't earned (ours plays once, from the fix that holds, and nowhere else).
- Filling every corner: the frame needs room to breathe. Empty space is part of the composition.

## What it writes

Into `docs/films/<N>-review.md`, under a "Camera" heading, short:

- **Per act, one line:** the subject, and whether the frame serves it.
- **The three worst frames,** each with its keyframe file or second, what is wrong, and the fix (usually a framing, a
  zoom depth, a TIMING value, a pill size or a colour).
- **Legibility at phone size:** pass, or the text that fails, with its size in the frame.
- **The cringe check:** pass, or each item found with its timecode.
- **Verdict:** render it, or fix and run the draft again.

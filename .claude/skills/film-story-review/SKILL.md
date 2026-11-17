---
name: film-story-review
description: Review a React Plumber film's story before it is rendered (its storyboard, then its draft beats) so a stranger scrolling with the sound off stops, understands, and watches to the end, without any cringe. Use before building a film's beats, before the final render of any film (overlay/showcase /film/N, the logo film, any marketing explainer), and whenever a film feels rushed, long, flat or try-hard.
---

# The story review

The question this review answers: **would a stranger, scrolling a feed with the sound off, stop on this, understand it
without help, and stay to the end?** And would a senior designer watching it feel respected, not sold to?

It runs **before anything expensive**, at two gates, so a weak story is caught when it costs a paragraph, not a render:

1. **Storyboard gate** (nothing rendered): read the film's beats as written: the screen's `film` spec, the TIMING table
   in overlay/showcase/src/principles/Film.jsx and FilmPage.jsx, and the craft-rule skill's four acts (§3⅝).
2. **Draft gate** (one cheap run): `node overlay/showcase/scripts/film-draft.mjs <N>` writes `docs/films/<N>-draft/`:
   `beats.md` (every beat with its timecode), a keyframe per beat, and `sheet.png` (one frame a second). Read beats.md
   and the keyframes; never ask anyone to watch the draft. Only after this review passes is the film rendered at
   1920 × 1080 and published.

The camera review (film-camera-review) runs beside this one, on the same inputs. This one judges what the viewer
*knows and feels* beat by beat; that one judges what they *see*.

## What it checks, and why each holds

Each check names its source. A check without one is taste and says so.

1. **The first two seconds show the problem, not a title.** In a feed the film autoplays muted and is judged on its
   first frames; a title on an empty desk gives nothing to look at. The broken thing should be on screen, already
   wrong, within the first beat, with the title over it or after it.
   *Source: the owner's reference films (craft-rule §3½) open on the live, broken component; how feeds autoplay.*
2. **One question, planted early, answered late.** Name the question the film makes the viewer ask ("why do those
   letters look soft?") and the timecode where it is answered. If you cannot name it, the film has no pull. If it is
   answered in the first third, the rest is coasting.
   *Source: Andrew Stanton, "The clues to a great story" (TED 2012): make a promise early, make the audience work for
   it ("the unifying theory of 2 + 2").*
3. **The problem gets more time than the fix.** A payoff is a difference, and a difference needs a "before" the viewer
   remembers. Measured in the owner's references: 3.3× and 1.6× more problem than fix.
   *Source: craft-rule §3⅝, measured frame by frame.*
4. **Every beat changes what the viewer knows.** For each beat, write in eight words or fewer what the viewer knows at
   its end that they did not at its start. A beat that only repeats, waits or decorates is cut or shortened.
5. **It escalates, and never steps back before the payoff.** Card → element → detail → fix → everywhere. Each step is
   closer or deeper; a beat that returns to a wider view before the fix lands lets the tension out.
6. **The payoff can be seen without reading.** Cover the pills: is the fixed side visibly different from the broken
   side? If only the numbers say so, the payoff is weak, and the fix needs its working drawn (§3⅝ act 3) or a closer
   view where the difference is large.
7. **Feel it, then measure it, then name it.** The viewer sees the harm, then how much, then the cause in plain words;
   the class name comes last. A class on screen before the viewer cares reads as jargon.
   *Source: craft-rule §3⅝, "the cause is a sentence, after the numbers".*
8. **Every word on screen can be read in the time it is held.** Allow 3 words a second plus half a second to find it,
   and longer for mono text and numbers.
   *Source: BBC subtitle guidelines, 160–180 words a minute.*
9. **It ends when the story ends.** After the payoff the brand lands within about two seconds and holds just long
   enough to read. A closing that outstays its line drains the feeling the payoff made.
10. **Length earns itself.** Count the seconds that carry no new knowledge (check 4). Under 30 s total is the aim for a
    feed. A longer film must still pass check 4 for every beat.

### The cringe zone: never

Any of these fails the review outright, however the rest scores. Our voice is a senior design engineer showing a
colleague something true, not an ad.

- **Hype words:** "insane", "game-changer", "you won't believe", "🔥", and exclamation marks.
- **Fake drama:** a "Did you know?" opener, fake urgency, a mystery that turns out to be nothing.
- **Explaining what the picture already shows.** Text that narrates the image ("look, it moved!").
- **Over-signposting:** arrows at everything, a zoom punch on every beat, the burst more than once.
- **The brand louder than the lesson:** a logo that interrupts, a closing longer than the payoff.
- **Claims the film did not prove.** Every number on screen is measured from the real example (craft-rule §2).

## What it writes

Into `docs/films/<N>-review.md`, under a "Story" heading, short:

- **The question** the film plants, and the timecodes where it is planted and answered.
- **A table of beats:** timecode · what the viewer knows by its end (≤ 8 words) · keep / shorten / cut / fix.
- **The three fixes that would most help someone stay to the end,** ranked, each with the beat it touches and what to
  change. Never more than three: the rest is noise until these land.
- **The cringe check:** pass, or each item found with its timecode.
- **Verdict:** render it, or fix and run the draft again.

Then make the fixes (they are usually TIMING values, a beat's order, a pill's words or a screen's `film` spec), run the
draft again, and review only what changed.

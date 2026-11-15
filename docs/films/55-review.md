# Film № 55, Gradients mix in OKLCH: review of the draft

Draft: docs/films/55-draft/ (`node overlay/showcase/scripts/film-draft.mjs 55`, not kept in git), about 36 s. Read
from its beats and keyframes; nobody watched it, and both reviews were done by the same agent that built the film.

## Story (film-story-review)

- **The question:** "why do the bars go grey in the middle?" Planted at 4.9 s (the first line names it), answered at
  14 s ("that mix lands on grey").
- **Problem against fix:** about 16 s of problem (rest, measure, dive) against about 8 s of fix and payoff: 2×.
- **The payoff can be seen without reading:** all ten bars go from a muddy middle to a green one at card size.
- **Cringe check:** passes. No hype; the burst plays once, from the check on the change card.
- **Verdict:** render it.

## Camera (film-camera-review)

- **Measure:** the Monday bar outlined coral, "goes grey" above and "32% colour" below. The upper pill sits on the
  edge of Sunday's bar; nothing it covers is read at that moment.
- **The dive:** one bar, close, with nine swatches of its own colour under it; in sRGB the middle three are hatched
  coral, in OKLCH they're green. The rest of the card is dimmed to 90%.
- **Change card:** a gradient is too long to fit fault and fix side by side in the column, so the fix opens under
  the fault (Film.jsx `Change`, when the two together pass 40 characters). Films 3 and 37 keep their single row.
- **Legibility:** pills and the change card at the film's marks size, as in 3 and 37.
- **Cringe check:** passes.
- **Verdict:** render it.

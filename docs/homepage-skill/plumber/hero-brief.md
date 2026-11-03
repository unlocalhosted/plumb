# New homepage · the hero: part brief

> **Revised 2026-11-03 after review.** The first build below (one card, three marks, the real overlay on click) was
> replaced, on the owner's direction, by:
> - one quiet column of words: the name, claim A ("Click a pixel. Plumber edits the file."), a paragraph and the
>   install command;
> - a carousel of three app screens of our own (an issue tracker, an assistant chat, a social feed), each cleaned
>   up by Plumber's real clean-up passes: Text, Spacing, Colour and Icons;
> - marks drawn in the overlay's box-model language, a scale ruler, and a segment timeline.
>
> The sections below record the first brief, as it was.

Part 1 of the new homepage (`homepage/`). Built on the overlay's design system (`overlay/src/tokens.css`,
`language.js`). It learns from the old hero (`site/src/hero/Hero.jsx`, HOMEPAGE.md §4.1) and copies none of it.

## What the visitor does, and what they leave knowing
They read one claim, see a small real UI with three values off its theme, and click one. **Plumber's real reading
card opens on it** (the product itself, not a picture of it). They pick a value from the theme and press Apply. The
part changes on the page, and the mark turns from off to on. They leave knowing: *it reads my theme, shows me what's
off on the page, and fixes the code.*

Learned from the old hero: the signature is fixing it yourself with the real overlay, the count read from the page
itself, and a fix that's visible in the code. Left behind: the blue shader stage, stickers, the nut marks and the
wrench. That world belongs to the old page; this one speaks the overlay's own language.

## Verb, object, before → after
*Fix* a value: `p-[10px]` (coral pill: off your scale) → pick `p-5 · 12px` in the real card → Apply → `p-5` (mint pill:
on your scale), the padding visibly changes, and the count steps down.

## Parts and states
| Part | States |
|---|---|
| Headline + lead | rest (variants A / B / C behind the dev picker) |
| Install command | rest, hover, focus, pressed, copied, couldn't copy |
| The page under the instrument | a paper-2 inset holding the demo UI; rest, and "reading" (the read part lifts 2px while the real card is open) |
| Value pill (one per off value) | off (coral pill, hatch on the part it marks), hover (part outlined in sky, the instrument's colour), focus, pressed, reading (sky ring), on (mint pill, the token's name) |
| Count | "3 values aren't on this page's scale" → "2 …" → "Every value is on your scale" (mint) |

## Motion (named, from the overlay's grammar only)
- **Pop** (`--pl-spring-pop`, 260ms from 0.92): the pills appear once the demo has arrived, 60ms apart; a fixed pill
  pops in its new mint form. *Reason: a mark appearing is the overlay's own grammar.*
- **Crossfade** (`--pl-dur-feedback`, 120ms): the count's words. *Reason: it shows the change.*
- **Lift** (`--pl-dur-travel`, 220ms, `--pl-ease-out`): the part being read rises 2px. *Reason: it says "this one".*
- No entrance choreography beyond one rise for the demo. No shader, no scroll effects.
- Reduced motion: no pop and no lift; the states still change.

## Tokens
- Every colour, radius, shadow and the small type and spacing come from the overlay's tokens.
- **New, proposed for review** (the overlay has no page-scale values):
  - display, title, lead and body type;
  - page spacing: 32, 48, 64 and 96px;
  - the page width.

  They're marked *new* in `homepage/src/theme.css`.

## Accessibility, touch, phone
- Pills are buttons with their value as the accessible name ("Padding 10px, not on your scale. Fix it").
- The count is a live region.
- Keyboard: Tab reaches each pill; Enter opens the real reading.
- Touch: tap a pill.
- Phone: the demo goes below the words, with full-width pills under the card.

## Must not look like
- A generic SaaS hero: a gradient blob, a fake browser frame with dots, a stock card.
- The old page: a blue stage with stickers.
- The rejected trial: an invented palette and a made-up fix panel.

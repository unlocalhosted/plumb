# New homepage · "It reads your theme": part brief

Part 2 of the new homepage. Answers the question the hero leaves: *whose scale? Mine, or Plumber's?*

## What the visitor does, and what they leave knowing
They see a short theme file next to Plumber's reading of it. They change a value or a reason in the file, and the
reading redraws. They change the stray value in a component line, and its notch moves between their steps. They leave
knowing: *Plumber has no scale of its own; it uses mine, with my reasons, and tells me where a value falls on it.*

Learned from the old page's "It reads your system" (the ruler, the reasons on each step). Not copied: no magnet
handle, no Tailwind-defaults toggle. Drawn with the overlay's own ladder, notch and why-line (`overlay/src/choices.js`).

## Parts and states
| Part | States |
|---|---|
| Theme file (left) | each step's value and reason is an editable field drawn as code: rest, hover (rule underline), focus (sky ring), invalid value (coral, the reading keeps the last good one) |
| Component line (left, under the theme) | `gap-[13px]`, its number editable the same way |
| Ladder (right) | one rung per step, in value order, each with its gap specimen drawn at its size, name and px; rest, pointed (paper-2, the why-line reads its reason), the closest step (sky, as the overlay picks it) |
| Notch | the stray value as a dashed coral line between its two steps, labelled with its value; on a step, it turns mint and says so |
| Why-line | the reading in Plumber's voice: "13px isn't on your scale. Closest: control (12px), a control's padding." |

## Motion
- Rungs glide to their new order when a value changes (left, `--pl-spring`, 520ms). *Reason: object permanence; the
  same step moved.*
- The notch glides with its value (same spring). *Reason: it shows where the value now falls.*
- The why-line crossfades (`--pl-dur-feedback`). Nothing plays by itself.
- Reduced motion: no glide; everything updates in place.

## Accessibility
Fields are real inputs with labels ("Value of --spacing-card"). The why-line is a live region. Rungs are buttons:
focus reads the step's reason.

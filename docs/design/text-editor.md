# The text editor

Status: built, 2026-11-02 (overlay/src/texteditor.js, e2e/text-editor.test.mjs). **Superseded in its look by
direction D** (docs/design/prototypes/text-card.html, tab "D · Editor"), which the owner chose after three rounds:
- not rows in the fix panel ("a bunch of properties to choose from"): a card inline beside the element, its caret on
  it, the element ringed;
- an editor, not a catalogue: at rest only what the text is now (Style ▾, size, leading, tracking, weight, case,
  colour ▾); the scale appears under the fields only while a value changes;
- a value changes by a drag on the whole field (the thumb follows the hand on the scale, one spring with a smooth
  detent at each step, a rubber band at the ends, a small settle on release), by ← → or by typing; every change
  snaps to a step; Enter or letting go writes it with Undo; Esc puts it back.
The sections below are the first design and keep the parts D did not change: the problem, the states, the writes.

Original status: design for review, 2026-11-02. Owner decisions: Alt+click opens the element's own properties, with
drift shown inside them; the editor lives in the fix panel; text comes first. The server layer under it (GET props,
POST set) is Fable's (docs/briefs/element-editors.md layer 1, with the text additions in this doc's last section).

## The problem it answers

Alt+click only reached problems. An element with nothing wrong said "Nothing to fix on this element" and offered
nothing, though the server could edit any of its values. The overlay's unit was the problem; it is now the element.
A problem is one state of a property: the value sits off the scale.

## Where it lives

The same fix panel, docked at the bottom centre. Alt+click reads the element and what's inside it (element-only
reading). Then:

- **The clicked element has its own text** (a p, h1–h6, li, label, or a span with words): the panel opens on its
  editor.
- **It has none** (a card, a list): the panel holds the first problem inside it, as it does now. Editors for cards
  and layout come later, one at a time.

## The editor (one component, every state)

    ● Lettering · p                                            blueprint.tsx:221
    Style    [ Display  Headline  Title  Title s  (Body)  Body s  Label  Label s ]
    ─────────────────────────────────────────────────────────────────────────
    Size     ▏11 ▕ ▌12▐ ▏13 ▕ ▏14 ▕ ▏16 ▕               ‹ ›
    Weight   400  500  (600)  700
    Leading  1.2  1.4  1.6
    Tracking  0  ┆0.08em┆  0.1em
    Case     [ As written | UPPER | lower | Title ]
    Colour   ● ● ● ◉ ● ●
                                                   Undo  ·  Esc

1. **Head.** The element's name (its component, else its tag) and where it's written. One line.
2. **Style.** The text styles (Body, Title small and the rest) as the first row: one pick sets size, leading,
   weight, tracking and case together. Each option shows "Ag" at its own size, capped at 20px. The element's
   current style is filled. If it uses none, nothing is filled, and the row says what it's closest to:
   "Closest: Label small".
3. **Details.** Size, weight, leading, tracking, case and colour. Each row uses the existing primitives: the
   stepper for the numbers, segments for case, swatches for colour. Each control has one tab stop and is moved
   with the arrow keys.
   - **Set by a style:** a value that comes from the style shows quiet, with "from Body". Changing it there sets
     the value on this element only, and the row says "Not Body any more", because that is a choice.
   - **Drift:** a value off the scale is the coral notch between the steps it falls between. The row's note says
     what's wrong in plain words: "12px isn't in your scale. Nearest: 11 or 13."
   - **Set in code** (from a variable or a prop): the steps are quiet and the note says why, for example
     "Set by the size prop in Lettering". Nothing can be pressed.
   - **Not set:** the page's value shows, quiet, for example "400 from the page". Picking a step adds a class.

### States

| state | what shows |
|---|---|
| loading | the head at once, and the rows as quiet placeholder steps with no hover (the primitives' loading state); never a spinner |
| ready | as above |
| hover a step | the page previews it on the element, gliding (the inplace preview); the panel doesn't move |
| focus | a 2px accent ring on the step, from the keyboard only |
| pressed | the step scales to 0.96 |
| written | the pick is written at once (write-at-once). The panel's said line reads "Changed size to 13 on Lettering", with Undo. The fill slides to the new step on the spring |
| error | the row's note says why in --pl-off, for example "The file changed. Pick again.". The pick stays so you can retry |
| empty | the theme has no steps for that row, for example "Your theme has no letter spacing steps". The value is still shown |
| server down | every row is quiet, with one line: "React Plumber isn't running, so nothing can be written." |

### Keys

- **↑ ↓** move between rows.
- **← →** move the step on a row and preview it.
- **Enter** writes the step. **Esc** lifts the preview, a second Esc closes.
- **Tab** moves out of the panel.
- **.** and **,** step through the problems inside the element, as they do now.

### Motion

Rows appear together with no stagger, because the panel is one surface. The fill travels on --pl-spring
(--pl-dur-travel), and a preview glides on the page with the inplace GLIDE. Under reduced motion nothing travels.

### Accessibility

The panel is a region named for the element, for example "Edit Lettering". Each row is a radiogroup labelled by
its name, with the current value in its accessible name. Every write is announced in the said line.

## Writes

- **One pick is one write**, to the element's line of code, with Undo. A line drawn in more places on the page says
  so in the note: "The same code draws 3 other places on this page." (element-only reading).
- **A style pick** writes the role class and removes the classes it replaces, in one write.

## What the server must give (Fable)

- **`kind: 'text'`** for any element with its own text, even when it uses flex.
- **Letter spacing and case** among the props.
- **Unset properties can be added** when the className is static.
- **A `style` property:** the text styles as steps, plus the one the element uses.
- **A value for unset properties,** or a way to say the client should send the computed value.

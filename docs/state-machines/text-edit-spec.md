# Words editor (double-click to edit text): the explicit machine

`overlay/src/text-edit.js`. Before: one field, `#edit`, meant "an edit exists". The widget read it as "the words own
the keys". From Enter until the write answered, and for 2.4 s after a refused write, `#edit` was still set but the
element's key listener was already gone, so every key went nowhere: Esc, Alt+B and `?` did nothing.

## Phases

`idle → resolving → editing → saving → idle`, and `saving → error → idle`.

| phase | what is on screen | who owns the keys |
|---|---|---|
| idle | nothing | the page and overlay |
| resolving | nothing yet (the source is being found) | the page and overlay; a second double-click is ignored |
| editing | the words are editable, with a ring and a tag | the words: Enter saves, Esc cancels |
| saving | "Applying…" beside the words | the page and overlay (Esc, Alt+B work) |
| error | why it failed, for 2.4 s | the page and overlay; a double-click starts the next try at once |

## Rules

1. `editing` (the getter the widget reads) is true only in the `editing` phase.
2. `start()` runs only from `idle`, or from `error` (the message gives way). Two double-clicks while the first is
   resolving start one edit, not two.
3. `#finish()` runs only from `editing`.
4. The error's 2.4 s timer is tracked. It ends only the edit it belongs to, so a new edit started meanwhile isn't
   closed by the old timer.

## Proof

`e2e/text-edit.test.mjs`, "while the words are being saved the keys are the page's again". It holds the write and
presses Alt+B while "Applying…" shows. Blueprint must come on, and the write must still land. Written to fail on the
old code (Alt+B was swallowed). Not run locally (the laptop was out of memory); run on vm-agent.

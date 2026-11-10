# React Plumber

## State

State: every phase field has a `/** @machine */` table in its file; change it only through `#send(event)`; before
writing async code or a test, ask `npm run sm -- on|paths|gaps <machine> …`; `sm check` runs on every edit and its
JSON is the fix list.
What a state starts (a listener, a timer, a frame, an awaited answer) goes through its `Scope` (`overlay/src/scope.js`),
never a bare `setTimeout`, `requestAnimationFrame` or `addEventListener`; `#send` ends the old state's scope and opens
the next one right after the assignment.

## Look

Anything drawn (an icon, a mark, a control, a state) follows `docs/design/visual-language.md`: solid toys in the
overlay's hues, details cut out or drawn on, patterns only for space, words on hover. The sheet is
`overlay/demo/icons.html`. If a piece can't be explained by that page, change the page first.

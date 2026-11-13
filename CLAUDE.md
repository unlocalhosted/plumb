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
overlay's hues, details cut out or drawn on, patterns only for space, words on hover, the toy face for titles and
names, no outlined cards. The living system is the site's design section (`web/`, `/design`), drawn with it. If a piece can't be explained by that page, change the page first.
How anything behaves, speaks and is laid out (one job at a time, the problem first in plain words, "hard-coded" and
"your tokens", real CSS names, the choice on the element, semantic small controls, drag mode, feedback before the
click, one-body motion scaled to size) follows `docs/design/interaction-principles.md`. Read both, and run its
checklist, before designing a component.
Never write a colour on a hue by hand: words and marks on a hue use `--pl-<hue>-on`, a hole uses `--pl-cut`, and every
pairing is in `overlay/src/pairs.js`. After touching a colour token or adding a pairing, run `npm run contrast`.

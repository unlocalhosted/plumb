# Fix panel: the explicit machine

Replaces six booleans in `overlay/src/fixpanel.js` (`#on #holding #keeping #writing #undoing`, with `#done` kept
apart as a timed banner) with one phase and one flight.

## Two facts, kept apart

- **phase**: what the panel shows and which keys it takes. One value.
- **flight**: a write or an undo that is running against the server. `null | { kind: 'writing' | 'undoing', back }`.

The old bug came from treating these as one fact. Closing the panel mid-write made the panel's state say "not writing"
while the write was still running, so its result landed on a hidden panel. The flight now outlives the phase.

## Phases and the moves between them

| from \ to | closed | resting | holding | keeping | writing | undoing |
|---|---|---|---|---|---|---|
| closed   |   | show(true) |   |   | show(true) with a write in flight | show(true) with an undo in flight |
| resting  | show(false) |   | hold |   |   | undo |
| holding  | show(false) | release, letGo | hold, skip | keep |  take | undo |
| keeping  | show(false) | release | closeKeep, hold |   | keepIt | undo |
| writing  | show(false) | landed, nothing left |  landed, next cause |   |   |   |
| undoing  | show(false) | landed (back) | landed (back) | landed (back) |   |   |

Any move not in the table is refused and logged as a warning (`plumb: fix panel …`), never thrown.

## Rules

1. **A flight that lands checks the phase.** If the phase is still its own (`writing`/`undoing`), it moves the panel on as
   before. If the panel was closed while it ran, the result goes to History (`host.handOff`): the change is said with
   its Undo, and nothing is put in hand.
2. **Opening during a flight shows the flight.** `show(true)` with a flight in the air enters `writing`/`undoing`, never
   `resting`. A second write can't start over the first.
3. **Keys while busy.** In `writing`/`undoing` the panel holds every key except Esc, so Enter or the arrows can't act on a
   list that is about to change. Esc passes through and leaves Blueprint (rule 1 keeps the write safe).
4. **Leaving is remembered across a reload.** A write can make the dev server reload the page. The resume record
   (`plumb:resume`, widget.js) is a snapshot of where the person was, so leaving Blueprint sets its `blueprint` to false.
   A reload then brings back History's toast with the Undo, not Blueprint.
5. **The done banner** (celebration) is a timed overlay, not a phase. Its fold timer is tracked, so a second
   celebration restarts it rather than being cut short by the first.

## Proof

`e2e/blueprint.test.mjs`, "Esc while a fix is being written leaves Blueprint …". It holds the write in flight, presses
Esc, then checks: Blueprint is off, the file is written, History's toast carries Undo, Blueprint stays off after the
reload, and a later Alt+B shows the panel at rest.

Before this change the test failed. The write reloaded the page and the resume record brought Blueprint back on with
the next cause in hand, against the Esc.

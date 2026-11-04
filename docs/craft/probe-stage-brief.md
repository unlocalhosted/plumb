# The probe stage: brief (for sign-off)

The live stage (docs/craft/stage-brief.md) shows a mistake that exists **at rest**: the page holds still, the camera
goes in, plumber's marks land, the fix glides in. Fourteen insight principles can't work that way, because their
mistake only exists **while something happens**: a pointer crossing a menu, a tooltip's wait, a reply that's slow, the
page turned dark. Today their screen is a sentence ("plumber craft finds it by using the page"). This brief is how
they get a stage of their own, built on the one that works, not beside it.

## What plumber already knows about each one (read from the code, not assumed)

Plumber's probes are real gestures, done by Playwright in a headless page (src/craft-probe.ts), recorded in the page
(overlay/src/craft-record.js), and judged by the rules in overlay/src/craft-headless.js.

| № | Principle | What plumber does | What it records | Its fix today |
| --- | --- | --- | --- | --- |
| 59 | Safe triangle | opens a submenu, moves from the item to the submenu's far corner in 11 steps | the path, items crossed, the step it closed at | advice: a menu with a safe triangle |
| 60 | Tooltip warm-up | hovers a trigger, leaves for 100ms, comes back, moves to the next | waits: first, back, next (ms) | **a prop** on the provider (takeable) |
| 61 | Menus on pointerdown | presses a menu trigger and holds | whether it opened on the press | advice |
| 62 | No motion on shortcuts | opens the palette with its shortcut | its entrance (ms) | advice (take animate-in off) |
| 64 | Interruptible motion | opens, then closes midway | whether the close restarts from its first frame | advice |
| 65 | Rubber-band | drags past the end | dead stop, or free | advice |
| 66 | Spinner timing | holds the reply (slow network) | when the spinner showed, how long it stayed | advice |
| 77 | Skeletons match | holds the reply, then lets it land | the skeleton's box against what landed | advice (the size) |
| 44 | Light text on dark | reads the page under `dark` | the weight as it renders | advice |
| 54 | Dark elevation | reads the page under `dark` | surface lightness, shadows | **a class** (takeable) |
| 19, 43, 69 | Quotes, font metrics, dvh | read the source | the line | text, CSS, class |

Two facts shape everything below: **plumber records numbers, not pictures** (no frames of what it did), and **most of
these fixes are a change of component**, not a class you can take.

## The approaches

**A. Replay the gesture in the showcase page** (synthetic pointer and key events from the stage). Instant and live.
But synthetic events don't trigger `:hover`, pointer capture or real focus, so the page can behave differently from
what plumber measured: the picture could contradict plumber's own numbers. Ruled out on honesty.

**B. Draw it from plumber's numbers only** (a diagram: the path, the moment it closed, a timeline). Honest, but it's an
illustration of the mistake, not the mistake: the person never sees the submenu vanish under their cursor. This is
the "explained, not shown" stage the owner rejected for #16.

**C. Plumber does it, the stage plays it back** (recommended). The showcase asks plumber to run the real probe on the
example, and plumber records what it did as frames while it does it. The stage plays those frames: real pixels of the
real page, the real gesture, slowed down, with plumber's own marks drawn over them from the timeline it recorded.
"Asked again" is a real second probe. Nothing on the screen is a guess.

Cost: a probe takes seconds, so the first view of a screen waits once. The result is cached on disk by the example's
source, so every later view (and the recorded showcase) is instant, and an edit to the example re-probes it.

## What C needs (layers, each with its own proof)

1. **Plumber records frames (non-UI, a Sonnet agent).** During a probe, take a screencast of the scoped element
   (Playwright's CDP screencast, about 30 fps), each frame stamped on the same clock as the recorded events, plus the
   pointer's position per frame. Opt-in (`--record-probe DIR`), so `plumber craft` is unchanged otherwise. Proof: an
   e2e test that probes a menu fixture and gets frames whose timestamps bracket the moment the submenu closed.
2. **The showcase asks for it (non-UI, the same agent).** A dev-server route, `/__showcase/probe/:n?state=broken|fixed`,
   runs the probe on `/rule/:n` scoped to `[data-example]`, and returns frames, events and findings, cached by a hash of
   the example's source. Proof: two calls, the second served from the cache, and a source edit invalidates it.
3. **The stage plays it (UI, me).** One new stage mode beside the live one, the same frame, camera and marks, with time
   as the new axis:
   - **The frames replace the page** inside the card while the moment plays: the person sees the real thing happen.
   - **The pointer** is drawn as plumber's own cursor glyph, its path as a line that writes itself behind it.
   - **Marks pin to moments, not places**: when the submenu closes, the frame holds, coral, with a pill on what it
     crossed ("crossed 1 item"). For waits, a pill counts the milliseconds live as the frames play (the #16 count-down,
     run forward), and stops where the tooltip appears.
   - **A time ruler** under the card (plumber's hairline and tick primitives), the frames' playhead on it, each recorded
     event a tick. It's the one new primitive, and it's the measurement for time, the way the pill is for distance.
   - **Slowed playback** (0.5× for gestures under a second), said once on the ruler ("½ speed"), never hidden.
4. **The fix, honestly labelled.** Where plumber's fix is takeable (#60's prop, #54's class) it's taken, as now. Where
   it's a change of component (#59: a menu with a safe triangle), the example is authored twice, and the switch says
   what changed ("Radix menu" vs "hand-rolled menu"), not "Fixed". Either way the second side is probed for real and
   plays back too: the same path, the submenu stays.
5. **Habits (19, 43, 69) come last**, and differently: their evidence is a line of source, so their stage is the page
   with the source line beside it (plumber's mark on the characters), not a replay. Built after the probe stage works.

## The storyboard for the first screen: #59, the safe triangle

A design tool's layer menu, right-click on a layer: Arrange ▸ opens a submenu to the right. The hand-rolled menu
closes a submenu when the pointer enters another item.

| t (ms) | What happens |
| --- | --- |
| 0 | Rest: the live example, the menu open, Arrange highlighted. |
| 400 | Camera in on the menu and its submenu (as now). |
| 1400 | The frames take over the card. The ruler draws in below it. Plumber's cursor sits on Arrange. |
| 1600 – 3200 | Playback at ½ speed: the cursor heads diagonally for "Bring to front". The path writes itself behind it. |
| ≈2400 | The cursor crosses "Duplicate": the submenu vanishes in the frames. Hold: the frame freezes, coral, a hatch on the item it crossed, the pill "crossed 1 item", a tick on the ruler at the moment it closed. |
| 3800 | The switch flips to "Radix menu". The frames of the second probe play: the same path, the submenu stays, the path reaches it. Mint, a check on the ruler. |
| 5800 | Marks out, camera out, the live example back (unchanged: the replay never wrote to it). |

## Decisions for the owner

1. **Recorded frames (C) over a live replay (A) or a diagram (B).** Recommended: C, the only one where everything on
   screen is what plumber actually did.
2. **Component-change fixes get an authored second example**, labelled by what changed. Recommended: yes. The
   alternative is no switch at all on those screens, which leaves the lesson without its proof.
3. **One new primitive, the time ruler**, in plumber's hairline and tick language. Recommended: yes, designed alone first
   (every state: playing, held, scrubbed, at ½ speed) before any screen uses it.
4. **Order:** frames in plumber (agent) → showcase route (agent) → the ruler → #59 end to end → the other probes, one at
   a time → habits. Recommended as written.

# Tactile demos: which principles the viewer should do, not watch

The reference is the live section of `docs/design/prototypes/probe-marks.html` (#59, the safe triangle; owner:
"feels right"). Its qualities, which every candidate below is held to:

- **The viewer's own input is the probe.** Their pointer leaves the trail; nothing moves unless they move it.
- **The mistake is the component's real behaviour**, not a picture of it. The hand-rolled menu really closes.
- **The marks are what plumber's probe records**, drawn as it happens: sky measures, coral is broken, mint is fixed,
  hatch where something was lost, a dashed ghost for what went, a pill for the number, a time ruler.
- **The switch names the technique** ("Hand-rolled / Safe triangle"), and the same input on the other side shows the fix.

A demo is **honest** only when the desktop browser does the real thing. A simulated phone, a faked network that
isn't labelled, a synthetic event standing in for the viewer's own: all out.

Research and design only. Nothing here changes a rule or the showcase.

## What each probe records (read from the code)

| № | Probe (`src/craft-probe.ts`) | Record | Rule's line (`overlay/src/craft-headless.js`, thresholds in `craft-spec.js`) |
| --- | --- | --- | --- |
| 60 | `tooltips`: hover, leave, come back within 100ms, move to the next | `t1` first wait, `t2` next, `t3` back | `quick` t1 < 200 · `slow` t1 > 1000 · `skip` t2 > 150 · `cool` t3 > 150; wants 500 / 300 |
| 61 | `menuDown`: press and hold 200ms | `down`: open on the press alone | open on pointerdown |
| 62 | `keys`: ⌘K, Ctrl+K, /, ?, ⌘/ | `enter` ms of what opened | entrance ≥ 100ms |
| 64 | `toggle`: open, then Escape at 40% of the entrance | `restart` (keyframes on both sides), `jump` (biggest frame step) | flags `restart` |
| 65 | `drag` (opt-in): drag 40, 80, 120px | `moved` at each, `kind` dead / elastic / free | flags `dead` (moved < 3px past 40) |
| 66 | `spinners`: press with the reply held 2s | `delay` press → spinner | shown < 150ms after the press |
| 68 | `toggle` | `enter`, `exit` ms | exit / enter > 0.9; wants 0.7 |
| 77 | held replies | skeleton box vs landed box, rows | height off by > 4px |
| 44, 54 | the page rendered dark | weight, surface lightness | no gesture at all |

## Ranked

| Rank | № | Principle | Verdict |
| --- | --- | --- | --- |
| 1 | 60 | Tooltip warm-up and cool-down | **Build.** Sketch: `tooltip-warmup.html` |
| 2 | 64 | Interruptible motion | **Build.** Sketch: `interrupt-marks.html` |
| 3 | 65 | Rubber-band at the limits | **Build.** Sketch: `rubber-band.html` |
| 4 | 42 | Bold on hover must not shift layout | Make the existing screen hoverable; no new stage |
| 5 | 61 | Menus on pointerdown | Good, but only half of it is probed |
| 6 | 77 | Skeletons match the final layout | Good if the shift lands under the pointer; needs a labelled held reply |
| 7 | 66 | Spinner timing | Honest with a labelled reply-speed dial, but the viewer only clicks |
| 8 | 62 | No motion on shortcuts | Honest, felt only faintly at one press |
| 9 | 68 | Exits faster than entrances | A slowed playback serves it better |
| 10 | 75 | Scroll shadows | The lesson is at rest; scrolling adds little |
| 11 | 73 | Anchor jump | The existing still screen already works |
| 12 | 63 | Scale from 0 | A look, not a gesture: slowed playback |
| — | 37, 70, 44, 54 | Half pixel, input zoom, dark weight, dark elevation | Out: can't be honest or has no gesture |

The top three share what made #59 work: **the mistake exists only while the viewer is doing something**, it's
**felt in time or position** (a wait, a jump, a wall), and plumber's probe **records exactly the quantity the marks
draw**, so the demo is the probe with a person's hand on it.

## Each candidate

### 1 · #60 Tooltip warm-up and cool-down

- **Does:** sweeps the pointer along an editor toolbar, stopping on one button and then the next, the way you
  explore an unfamiliar toolbar. Leaves and comes back.
- **Feels:** two real mistakes, each its own side of the switch.
  *Instant* (no delay; shadcn's per-tooltip provider with `delayDuration={0}`): crossing the toolbar on the way to the
  text flashes a tooltip on every button passed. *Each waits* (one delay, no skip): every next button makes you wait
  the full half second again, so exploring is a stutter.
- **Marks, live:** the wait filling under the button you're on (no trail: the route isn't the lesson). On the ruler,
  one segment per button from entry to shown. Coral when it's wrong for that moment: a first tooltip shown under 200ms (`quick`), a
  next one that waited over 150ms (`skip`). In the scene, each tooltip that only flashed (shown under 150ms, then
  gone) leaves a hatched dashed ghost: the flicker made visible. A pill names the count or the wait.
- **Fixed (Warm-up, 500 / 300):** the first waits 500ms, drawn in sky (the wait is intended); neighbours open at 0ms
  in mint; away for more than 300ms and the next one waits again, in sky. Crossing quickly flashes nothing.
- **Honest on desktop:** fully. Hover and timers are the real thing; the sketch uses real pointer events and real
  timeouts. The two broken sides are configurations people ship.
- **Why first:** you feel a wait in your own hand better than any diagram of one, it has no screen today, its
  fix is a prop plumber can hand over (`delayDuration`, `skipDelayDuration`), and the probe's `t1 / t2 / t3` are
  exactly the ruler's segments.

### 2 · #64 Interruptible motion

- **Does:** opens a side panel (a Details pane in a file list) and changes their mind: clicks again, or presses
  the key, while it's still sliding in.
- **Feels:** with keyframes (`data-[state=open]:animate-in` / `animate-out`, what tailwindcss-animate gives shadcn),
  the close starts from its own first frame, fully open: the half-open panel snaps out to full width, then slides
  away. A hiccup you caused.
- **Marks, live:** the panel's real position, sampled every frame, drawn as a trace on a strip below (time across,
  how open up). The click is a blue contact ring on the button and a mark on the strip. Broken: the trace has a
  vertical cliff, coral with a halo, and a pill "jumped 41% → 100%"; in the scene, a dashed coral ghost where the
  panel's edge was when you clicked, the hatch between it and where it snapped to.
- **Fixed (Transition):** the same click turns it around where it is: the trace bends, with a mint turning point,
  and the pill reads "turned back at 41%".
- **Honest on desktop:** fully. Real CSS animations and transitions on a real element; the trace is
  `getBoundingClientRect` per frame, which is what the probe samples. A speed switch (1× / ¼×) lengthens both sides'
  durations equally and says so, as the reference's ruler says "½ speed".
- **Why second:** the viewer chooses the moment of interruption, so the mistake is theirs. The probe (`restart`,
  `jump`) records the same thing the trace shows. Weakness: at 1× a 300ms panel is hard to catch; the ¼× switch is
  part of the demo, not a convenience.

### 3 · #65 Rubber-band at the limits

- **Does:** grabs a bottom sheet's handle and pulls it up, past fully open.
- **Feels:** *Clamped*: the sheet stops dead at its limit while the hand keeps going, a wall. *Rubber-band*: it
  keeps coming, less and less (Vaul's damping), and springs back when let go.
- **Marks, live:** the blue contact ring where you pressed and a dot where your hand is now (no trail); the limit as
  a sky dashed line. Past the limit, the gap between where your pointer is and where the sheet's edge is: broken, the whole gap
  hatched coral with a pill "stopped dead · 0 of 96px"; fixed, the part the sheet gave in mint, the pill "gave 22 of
  96px". On release (fixed) the spring back plays and the ruler shows it settling.
- **Honest on desktop:** yes. Pointer-event dragging is how such sheets work with a mouse too (Vaul supports it),
  and on a touch screen the same code takes a finger. Nothing is simulated.
- **Why third:** the most physical of all, and the probe's record (`moved` at 40 / 80 / 120px, `dead` or
  `elastic`) is the pill. Weakness: the probe is opt-in (`drag`), and plumber's fix is advice (a component change),
  not a class; the demo has to say so in its teaching.

### 4 · #42 Bold on hover must not shift layout

- **Does:** runs the pointer along a row of tabs.
- **Feels:** the tabs to the right slide each time a tab turns semibold; at the edge of a tab the row twitches.
- **Marks:** the rest position of each later tab as a dashed ghost, the shift hatched, a pill "+3.4px". Fixed (the
  hidden bold copy in `::after`): it darkens and nothing moves, mint.
- **Honest:** fully, it's plain CSS. **Why not top three:** it doesn't need a new kind of demo. It's a live rule
  whose screen already exists; the critique asks for the hover to play. Letting the viewer hover the real tabs in
  the existing stage is the whole fix, cheaper than a sketch.

### 5 · #61 Menus open on pointerdown

- **Does:** presses a View menu and, without letting go, drags to an item and releases.
- **Feels:** on click (release) nothing happens while held; the drag selects nothing. On pointerdown, one gesture
  opens and chooses, like a desktop menu bar.
- **Marks:** contact ring at the press, the ruler from press to open (coral "opened 180ms later, on release"), mint
  on the press.
- **Honest:** yes. **Held back because** the probe records only whether the press opened it (`down`); the
  press-drag-release half, the part you feel most, isn't measured, so its marks would claim more than plumber
  knows. Worth building once the probe also releases over an item.

### 6 · #77 Skeletons match the final layout

- **Does:** presses Refresh on a list, then reaches for a button below it.
- **Feels:** the content lands taller than its skeleton and the button moves out from under the pointer.
- **Marks:** the skeleton's box as a dashed ghost, the jump hatched, the pointer's ring where you aimed and where the
  button went; mint when the skeleton has the landed rows and height.
- **Honest:** only with the held reply labelled as such (plumber holds replies too). Ranked lower because the
  viewer has to be told to aim at the right place at the right moment; it risks feeling staged.

### 7 · #66 Spinner timing

- **Does:** presses Save, with a labelled reply-speed dial (fast 120ms / slow 1.4s).
- **Feels:** on a fast reply the spinner blinks for a fraction of a second.
- **Marks:** ruler with press, spinner on, reply; coral "spinner flashed 110ms"; fixed (spin-delay 200 / 500): no
  spinner on the fast reply, mint; on the slow one it waits 200 and holds 500.
- **Honest:** yes with the dial labelled. Lower because the viewer's own hand doesn't make the mistake, the dial
  does; the timeline carries it.

### 8 · #62 No motion on shortcuts

- **Does:** presses ⌘K a few times and starts typing.
- **Feels:** a 200ms scale-in every time; faint at one press, felt by the tenth.
- **Marks:** the key as a pill, the entrance on the ruler in coral; fixed: there at once (and still animated when
  opened by click).
- **Honest:** yes (the page can take ⌘K in Chromium and Safari). Lower: the harm is cumulative, one demo press
  doesn't carry it.

### 9 · #68 Exits faster than entrances

- **Does:** opens an event preview and dismisses it.
- **Feels:** the preview lingers after you've moved on. Only subtly, at real speed.
- **Better as:** slowed playback of both closes side by side (the critique's ask). A live demo adds a click, not
  a feeling.

### 10 · #75 Scroll shadows

- **Does:** scrolls a list with the wheel.
- **Feels:** little: the harm is at rest, before you scroll (nothing says there's more).
- **Marks:** hidden content above and below as hatched bands outside the box; the shadow appearing in mint.
- **Verdict:** honest, but the still screen with the critique's fix (end the hatch when the fix lands) teaches it better.

### 11 · #73 Anchor jump

- **Does:** clicks a contents link. **Feels:** the heading lands under the sticky header.
- **Verdict:** honest, and the existing screen already shows exactly this with a hatch. A live click adds realism,
  not understanding.

### 12 · #63 Scale from 0

- **Does:** clicks +. **Feels:** at real speed, almost nothing; the harm is how it looks.
- **Verdict:** slowed playback from 0 and from 95%, side by side (the critique's ask). Not a gesture.

### Out

- **#37 Half pixels:** the blur depends on the screen's pixel ratio, and a page can't show a magnified loupe of its
  own real pixels without screen capture. A live drag at 1:1 is too faint to see; anything larger re-rasterises.
- **#70 Input zoom:** only iOS Safari zooms on focus; desktop can't do it, and imitating the zoom would misrepresent it.
- **#44, #54 (dark weight, dark elevation):** no gesture; switching the scheme is a toggle, not a hand on the mistake.

## The sketches

Three throwaway pages beside `probe-marks.html`, each its live section only, built the same way: the frame on the
board, a segmented switch naming the technique, plumber's marks drawn from the viewer's own input, the time ruler,
a hint that says what to try and what just happened.

- `docs/design/prototypes/tooltip-warmup.html`: #60, *Instant / Each waits / Warm-up*.
- `docs/design/prototypes/interrupt-marks.html`: #64, *Keyframes / Transition*, with a 1× / ¼× speed switch.
- `docs/design/prototypes/rubber-band.html`: #65, *Clamped / Rubber-band*.

Their glyphs are type or simple SVG, not dither icons, and they carry no photos: sketches of the marks and the
feel, not screens. A screen built from one uses Slate, dither icons and real media like the rest.

## Built into the showcase (2026-11-04)

The owner asked for the next four as real rule screens, not sketches. They're components in
`overlay/showcase/src/principles/hands-on.jsx` (`HANDS_ON`). Each takes `side` ('broken' | 'fixed', as the probe
stage's examples do), draws plumber's marks live in a shadow root with plumber's tokens (plumber's scan of
`[data-example]` never reads them), and says what just happened through `onStatus`. `/hands-on/:n` shows one alone with
its switch. They're wired into `/rule/:n` now (Principle.jsx picks `HANDS_ON[n]` over a staged example), and the builder
route is gone.

| № | Screen | Switch | Marks (only the number the rule measures) | plumber's proof |
| --- | --- | --- | --- | --- |
| 42 | A project's tabs, Spring launch | Bold on hover / Darker on hover | resting edges, the hatch the tabs slid across, the tab that grew, "+1.8px · 3 slid" | in-page scan: exactly `craft/bold-hover` on broken, nothing on fixed |
| 61 | A shared folder's View menu | Opens on click / Opens on press | where you pressed; the ruler from press to open ("13ms · on release" / "0ms · on the press"); a missed release's dashed ghost | probe only (`menuDown`); its drag-release half isn't probed, so it gets words, no mark |
| 77 | Quarry's activity feed, Refresh | A generic skeleton / The rows' own shape | the skeleton's box (read while the reply is held), the growth hatched, "+72px · 3 → 3 rows", the link's old place with your pointer | held-reply pair only (`skeletonMatch`) |
| 60 | A writing app's formatting toolbar | At once / Warm-up | the wait filling under the button, a dashed ghost where a tooltip only flashed (under 250ms), one tag with the last wait ("1ms · no warm-up" / "2ms · warm ✓") | probe only (`tooltips`) |
| 64 | A shared folder's Details panel | Keyframes / Transition | the edge where you changed your mind, the hatched snap, the openness over time as a trace (a snap is a cliff), "jumped 46% → 100%" / "turned back at 46% ✓"; ¼ speed by default | probe only (`toggle`) |
| 65 | A maps app's place sheet | Clamped / Rubber-band | the limit, where you pressed, a coral wall where the hand went and the sheet didn't, or a mint bracket for what it gave ("gave 39 of 90px") | probe only (`drag`, opt-in) |
| 66 | A bank feed's Sync now | Spinner at once / After 200ms, for 500ms | the reply and the spinner on two lanes of the ruler, the rule's 200ms line, "flashed 129ms" / "no spinner · 124ms ✓" | probe and held pair only (`spinnerTiming`) |

Real requests only: #77 and #66 call the showcase's own `/api`; a held reply is held on the client and says so ("reply
held 0.9s", "held 1.4s"), as plumber holds a page's replies.

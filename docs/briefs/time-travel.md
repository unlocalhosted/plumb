# Time travel: the trace as a timeline you can scrub and undo from

Step 3 of the page clean-up (memory: page-cleanup-direction). Server side is done: every change a write makes is a
record with a group, meta, and a state; `GET trace`, `POST undo-change`, `POST undo-group` (src/session/changes.ts).
This brief is the overlay side. Mock: `docs/briefs/time-travel/mock.html`.

## Problems (each one kind of thing)

1. **The unit is wrong.** History lists file-level writes ("Applied p-4 → p-3 in App.tsx"). A layer that changes 40
   things is one row; one of them can't be taken back alone.
2. **Order traps you.** A write under a newer one says "changed since, undo it in your editor". The server no longer
   has that limit; the UI still does.
3. **It's words.** Each row is a sentence plus `file:line · 3m ago`. You read a list; you don't see what happened to
   the page.
4. **You can't see the past.** There is no way to look at the page as it was three changes ago before deciding to go
   back there.
5. **A second surface.** The history list is its own card in the dock's corner, with its own toast stacked on it. The
   overlay's rule is one surface at a time.

## Approach

The trace becomes a **timeline strip**: the dock bar grows into it (one surface morphing, not a card appearing).
Time runs left to right; **Now** is the right end.

- **A tick is one change.** A **segment is one step** (one group: a layer, a card tidy, a single fix). The segment's
  name is the only word at rest.
- **The playhead** sits at Now. Move it left (drag, ←/→) and the page shows itself as it was at that point: every
  change right of the playhead is previewed undone, on the page. Nothing is written by scrubbing.
- **The change under the playhead is pointed at:** its element is outlined on the page and one pill says
  `from → to` and the law, if it has one. That's the only value on screen.
- **Undo is a verb on what's pointed at:** *Undo change* (⌫), *Undo step* (⇧⌫), or, when the playhead is in the past,
  *Go back to here* (↵), which undoes everything to its right. An undo is itself a tick, so it can be undone too:
  no confirm dialogs.

## The component: timeline strip

### Anatomy
`[history glyph] [segments: name above, ticks below] [playhead + knob] [Now] [actions] [close]`

- Tick: 2×14px bar, 6px apart; segments 16px apart; a 1px baseline under each segment.
- Playhead: 1px sky line the strip's height, 8px knob on top, halo like every instrument line.
- Pill: above the playhead, `--pl-card-code` for `from → to`, law name in lilac (names), `--pl-shadow-tag`.

### States (strip)
| State | Looks | Says |
|---|---|---|
| rest | the dock bar; history glyph | nothing |
| opening | dock grows left into the strip (spring), ticks stagger in 12ms each | — |
| loading | 6 ghost ticks pulse in `--pl-paper-2` | — |
| empty | baseline only, Now at the right | "Nothing changed yet. What you write shows up here." |
| at Now | playhead on the last tick; last tick pointed | pill for the last change |
| scrubbing | playhead follows the pointer 1:1, no easing; ticks right of it turn hollow sky (previewed undone); the page follows | pill for the tick under it |
| in the past | released: playhead springs to the nearest tick; strip edge tinted sky so you know the page isn't current | *Go back to here* becomes the primary action |
| undoing | the target ticks pulse; actions disabled | live region: "Undoing…" |
| undone | target ticks go hollow; a new undo tick slides in at Now; playhead returns to Now | "Undone: p-3 → p-[13px]" |
| refused | the tick shakes 2px ×2, turns butter; pill says why and what to do | "Changed after by another change: undo that one first." |
| error | strip stays; a coral dot on the glyph; pill says it | "Couldn't read the history. Check the dev server, then reopen this." |
| closing | Esc or ×: playhead returns to Now (page restores) before the strip shrinks back into the dock | — |

### States (tick)
| Tick | Fill | Meaning |
|---|---|---|
| live | ink | in the code now |
| pointed | sky, 18px tall | under the playhead |
| previewed undone | hollow sky | right of the playhead while scrubbing |
| undone | hollow ink-3 | taken back; its undo tick links to it on hover |
| changed since | butter, hatched | edited after (by hand or a later change); can't be undone alone |
| undo | ink, a small return notch on top | an undo, itself undoable |
| hover | 1px taller, ink-2 halo | — |
| focus | 2px sky ring (`:focus-visible`) | — |

### Motion
- Dock → strip: width and height on `--pl-spring` (≈2% overshoot), content fades in after 60ms.
- Playhead travel by key: `--pl-dur-travel` on `--pl-ease-out`. While dragging: no easing, follows the pointer.
- Release snaps to the nearest tick on `--pl-spring`.
- New tick: scales from 0.6 (never 0) with `--pl-spring-pop`. Refused: 2px shake, 160ms.
- Reduced motion: no morph (crossfade 120ms), no shake (butter fill only), playhead moves instantly.

### Keyboard and accessibility
- Playhead is a `role="slider"`: ←/→ one change, ⇧←/⇧→ one step, Home/End first/Now.
  `aria-valuetext`: "Change 4 of 12, Spacing: padding from p-[13px] to p-3, Law of proximity".
- ⌫ undo change, ⇧⌫ undo step, ↵ go back to here, Esc back to Now then close. Focus returns to the history glyph.
- Results go to the overlay's live region. Colour never carries a state alone: hollow vs filled, hatch, height.

### Performance
- One `GET trace` on open; refetched on a write event, never polled.
- Preview applies inline styles only to the elements a previewed change touched, batched in one frame per playhead
  move; reads before writes (memory: blueprint-performance-rules). Measured with `performance.measure('plumb:tt-*')`.

## Layers (one at a time, each with its e2e and a look before the next)

| Layer | Answers | Proof |
|---|---|---|
| 1. Strip | Can I see every change as a tick in its step, point at one, and undo a change or a step? | e2e: three swaps under one tag → one segment, three ticks; ⌫ on the middle → file has only it reverted, tick hollow, undo tick at Now |
| 2. Points at the page | Which element is this change? | e2e: pointing a tick outlines the element at its file:line |
| 3. Shows the past | What did the page look like back there? | e2e: playhead two back → the two elements' computed styles are their before values; Now → after values; nothing written |
| 4. One surface | Does anything else still show history? | e2e: write toast's Undo undoes the step; the old history card is gone |

Layer 3 needs one server read: the CSS a `from` class compiles to (the session already compiles classes with the
project's Tailwind). Text changes preview by swapping the text node.

## Copy (inventory, better-writing)
| Where | Text |
|---|---|
| empty | Nothing changed yet. What you write shows up here. |
| actions | Undo change · Undo step · Go back to here |
| undone | Undone: `{from} → {to}` · Undid {n} changes |
| refused (later change) | Changed after by another change: undo that one first. |
| refused (by hand) | Edited outside React Plumber, so it can't be undone here. Undo it in your editor. |
| error | Couldn't read the history. Check the dev server, then reopen this. |
| in the past (sr) | Showing the page {n} changes ago. Nothing is written until you choose. |

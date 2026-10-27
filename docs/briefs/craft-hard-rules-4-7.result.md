# Craft hard rules, layers 4 to 7: result

Built headless, on `main`, one commit per layer. Design: docs/briefs/craft-hard-rules.md. Everything is proved through the
real CLI (`node dist/cli.js craft --url … --json`) against a Vite dev server with the plugin and real Chromium; there are
no unit tests. Every rule has an element that breaks it, one beside it that stays quiet, and the run is checked for noise.

Nothing in craft.js, craft-rules.js, blueprint*.js, select.js, inplace.js, changes.js, widget.js, walkthrough.js or
verdict.js was touched. Words are only between the `headless rules` markers in words.js.

## What the machine does now

`plumber craft` loads each route with motion on (it was `reduce`, which hid every animation from every rule), then, for
what the page gives a reason to take:

1. **pairs** (layer 4): the route again under `dark`, `touch` (scroll edges), and with its fetches held. Skipped when the
   page has no dark styles, no scroll container, no fetch. `--no-pairs` turns them off.
2. **probes** (layer 5): gestures in pages of their own, one family at a time. `--no-probe` turns them off,
   `--probe-budget <n>` caps the elements tried per family (default 24), `--probe drag` adds drags (never on by default).
3. **sources** (layer 6): the page asks the server what the code says about the few elements a rule will ask about.
4. **grey band** (layer 7): only with `--judge`, or when `.plumber/judge` already holds answers.

What a probe will not do: press a button inside a form, a `type=submit` button, a link, or a disabled control (the page
lists its own candidates); click after a press (the button is let go of away from the control); navigate (main-frame
navigations are aborted); send a request that is not a GET (aborted, it never reaches the server); keep a dialog or a
popup. The probes test submits a form, follows a link and posts, and asserts all three counters at 0.

## Layer 4: pairs (bc3f4eb)

Rules: `craft/dark-elevation` (54), `craft/dark-weight` (44, advisory), `craft/skeleton-match` (77),
`craft/scroll-cue` (75, raster half, same id as the still half), `craft/spinner-timing` (66, network half).
Code: overlay/src/craft-headless.js (stores, `pairIn`, `snapshot`, rules), overlay/src/craft-record.js (a plain script the
runner adds before the app's scripts: spinner and layout-shift recorder), overlay/src/craft-run.js (`op` questions),
src/craft-run.ts. Test: e2e/craft-pairs.test.mjs.

Deviations:
- **Pairs are keyed by the element's place in the page** (`main:1>div:2>p:1`), not by source site. A condition changes
  styles, not the tree, so the place is the same in both pages, it costs no source lookup per element, and it tells the
  rows of a list apart. An element the other page lacks has no record and every rule stays quiet on it.
- Computed colours come back as `oklch(…)` for most of Tailwind's palette, which `rgb()` cannot read. Snapshot colours go
  through a one-pixel canvas (`toRgb`).
- **77**: the shift score is evidence only. A layout shift inside the container can come from anything above it (the
  fixture's good skeleton shifted because the bad one above it grew), so the rule fires on the container's own height
  change (> 4px) and says the heights and row counts.
- **66, network half**: only "flashes on a fast load" (visible < 200ms with the reply at 50ms, and still visible >= 1s with
  the reply at 2s, so it is the loading indicator and not decoration). The "held too short" half in the design (a spinner
  gone in < 400ms with the reply held 2s) cannot happen for a loading spinner; dropped.
- **75 raster**: the design compares the edge bands at the top and at the end, but content moves, so the bands always
  differ. The runner hides the container's descendants (`visibility:hidden`), then compares the top, bottom and middle
  bands at scrollTop 0 and at the end, in a touch page (overlay scrollbars). A mask is a cue without a picture. All
  identical means no cue (0.9). Same id as the still half; since a clear cannot be sent from a rule with the same id,
  the still half should ask the pair (see "Wire in the live overlay").
- 44 is first-in-page-order only (a page-wide finding, drawn once), and carries `tier: advisory` on the finding, which is
  what makes it a note (`soft` is set from the finding's own tier in markOf).
- Dark pairs read the dark style from the dark page and compare to the light page's style for the same place.

## Layer 5: probes (70c1001)

Rules: `craft/exit-faster` (68), `craft/interruptible` (64), `craft/press-feedback` (31), all three **with the same id as
the still halves** at confidence 0.92 (theirs 0.8), the same `owns`, so the verdict keeps the measured one per element and
facet. New ids: `craft/menu-pointerdown` (61), `craft/tooltip-delay` (60), `craft/palette-motion` (62),
`craft/submenu-path` (59), `craft/overdrag` (65, advisory, `--probe drag`), and the press half of
`craft/spinner-timing` (66). Code: src/craft-probe.ts (the gestures), src/craft-page.ts (page helpers), the recorder
(events, animations seen, a frame sampler, tooltip clock), `candidates` and the rules in craft-headless.js. Test:
e2e/craft-probes.test.mjs (5 tests). Dev dependencies added for the fixtures: `@radix-ui/react-tooltip`,
`@radix-ui/react-dropdown-menu`, `@headlessui/react`.

Deviations:
- **64**: the design measures a frame-to-frame jump (opacity > 0.15). A 100ms ease fade moves 0.28 a frame by itself, so
  the jump cannot tell a restart from a fast transition. Measured instead: close it 40% into the entrance and read what
  starts. An exit that is a keyframe animation, started while the entrance is a keyframe animation, begins at its own
  first frame (restart). A transition reverses. The frame step is kept as evidence.
- **61**: Headless UI 2.2 opens its menu on the press, like Radix. So the fixture's click-opening menu is a hand-made one.
  The probe is right for both libraries and flags only the one that waits for the click.
- **60**: candidates are controls with `data-state="closed"`, `aria-describedby` or `data-tooltip` (and no popup role); a
  trigger is a tooltip if `[role=tooltip]` shows within 2s. The clock starts when the pointer enters the trigger. Skip
  (t2) and cool-down (t3) are measured on the first pair of triggers only. The first trigger with each kind of trouble
  speaks for the page (a delay is the provider's). Leaving is a run of small moves (Radix keeps a tooltip open until
  the pointer has clearly gone).
- **62**: a palette is absent when the page is at rest, so there is no element to draw on. The finding is carried by
  `main` and names where the surface's code lives (`evidence.at`, read by `locate` while the surface was open);
  craft-run.js uses that site when a mark has one.
- **31**: spoken only when the app's other controls do answer a press (two or more use an `active:` style), and says that
  style: the same judging-against-the-app rule the still half uses, and what keeps a plain page quiet (the clean-page
  test in craft-run.test.mjs failed without it). A page that never answers a press is a page finding; not done.
- 59: crossing is checked by sampling the path against the sibling items, and a steeper aim is tried once; a path over
  no item is not a test.
- 65: a "dead stop" and an "unbounded follow" are flagged as notes; a drag that gives is quiet. Vaul's drawers are not
  tried (they ship their own give).
- 66 timing half: the press that starts a request with the reply held 2s; the spinner must show later than 150ms.
- The library-quiet paths for 59, 61, 65 (skip the probe when structure says the library is right) are not done: the
  probe is cheap and measures the same answer. The structure index could skip them later.

## Layer 6: structure (212d489)

Server: `src/structure/index.ts` (oxc walk: for each JSX element its component, import source, library and role, literal
props with their spans, `on*` handlers, parent), `src/structure/library.ts` (the table: Radix, Base UI, Headless UI,
shadcn by file name `components/ui/<name>`, Vaul, cmdk, Floating UI, lucide, heroicons, react-icons, Motion). Session API:
- `GET structure?file&line&column` -> `{ file, line, column, hash, component, source, library, role, props, handlers,
  provider? }`. `provider` is given for a tooltip, or anything inside one: the nearest `tooltip-provider` above it in
  its file, else the project's only one, as `{ file, line, column, hash, component, library, props }`.
- `POST prop { file, hash, line, column, name, value }` -> the same `ApplyResult` as `swap` (`applied: ['prop:<name>']`,
  `undo`, `remaining`). Same guards as `swaps`: stale hash refused, `parsesAsBefore`, one serialized guarded write, one
  undo. `value` is a string, number or boolean; the prop must be a plain literal or absent (a computed one is
  refused, and a file that spreads props is refused for an added prop).
Page: `facts.source(el)` is filled by `prepareSources()` in craft-run.js for the elements a rule will ask about (tooltip
triggers from the probes; custom controls: `role=button`, pointer cursor on a non-native element, `touch-action` taken
off the browser).
Rules: `craft/touch-manipulation` (71). `craft/tooltip-delay` now suggests
`{ kind: 'prop', component, name, from, to, why, text, site: { file, line, column, hash } }`, e.g. `delayDuration` 0 to 500
on `Tooltip.Provider` (and `skipDelayDuration` 300; Base UI's provider has `delay` only). Test: e2e/craft-structure.test.mjs
(3 tests): Write, then the source reads `delayDuration={500}` and the page comes back quiet; a stale hash is refused.

Deviations:
- **71 and the tap highlight**: desktop Chromium reports `-webkit-tap-highlight-color` as transparent, in mobile
  emulation too, so the browser's default cannot be read. What is read is whether the page decided: an inline style or a
  rule in a style sheet whose selector reaches the element or one above (it is inherited). Tailwind's preflight sets it
  on `html`, so in a Tailwind app every control is decided and only the drag half fires (a control with pointer-move
  handlers and `touch-action` left to the browser: "the page scrolls under the drag"; fix `touch-none`). The missing
  viewport meta (300ms) half is not done (every browser dropped it).
- Handlers come from named `on*` props; a spread (`{...handlers}`) is invisible to the index.
- Not done: the keyboard-combo reading from effects, the upgrades of 50 (strokeWidth) / 62 / 66 / 77 from advice to
  edits (their marks are drawn on an element other than the one the edit would land on), and the library-quiet paths.

## Layer 7: judge (4088bc6)

`plumber craft --judge` and `.plumber/judge/<sha256 of rule + evidence + crop>.json`. Code: src/craft-judge.ts, the grey
pass in craft-run.js (rules marked `judge: true` whose finding has confidence from 0.6 up to the 0.8 floor, which the
engine drops). Test: e2e/craft-judge.test.mjs, against a local server that stands where the model's API does.
- Without `--judge` and without answers kept the grey pass does not run: the output is byte-identical (the test runs it
  twice and compares). With answers kept, they are used with no flag and no model.
- `--judge` crops the element plus 24px on each side at 2x through CDP, sends the crop, the finding's words and its
  evidence to `https://api.anthropic.com/v1/messages` (`PLUMBER_JUDGE_URL`, `PLUMBER_JUDGE_MODEL`, `ANTHROPIC_API_KEY`),
  keeps `{ verdict, sentence }`. A yes lifts the finding to 0.8 as a note (`soft`, `judged`, `because` = the sentence); a
  no or no answer is silence. With no key it says what to do (exit 2). With `CI` set a model is never asked.
- Today only `craft/dark-weight` is marked `judge`: regular small light-on-dark text is its grey band (0.7). The harness
  picks up any rule that sets `judge: true` and returns a finding in the band; 2, 3, 21/52, 25, 40 and 56 are in
  craft-rules.js, so marking them is theirs (below).
- Deviations: the rule's words in the prompt are the finding's own title and reason (docs/craft/rules.md is not in the
  published package). The cache key includes the crop's pixels, as designed, so an answer kept on one platform may miss
  on another (silence, never a wrong finding). The grey pass looks at every element with a box, because the reader keeps
  only the elements it has something to say about.

## Wire in the live overlay (the UI session)

1. **`facts.source(el)`**: `craft-headless.js` exports `setSource(el, s)`. After `locate(el)`, ask
   `request('structure', { file, line, column })` (GET `/__plumb/structure`) and hand the answer in; the response is the
   `StructureResult` above. The Craft cache is keyed by class signature, so call `craft.invalidate()` when one arrives.
   Until it does `facts.source` is null and 71 and the prop edits stay quiet.
2. **`prop` suggestions** reach `markOf` as `suggest.kind === 'prop'` with `text` already the exact sentence, so today they
   show as advice. To write: `post('prop', { file: s.site.file, hash: s.site.hash, line: s.site.line, column: s.site.column,
   name: s.name, value: s.to })` (api.js `post`), the result is an `ApplyResult` like `swap`'s.
3. **`craft/scroll-cue` (75)**: the pair can clear the still half. In its `check`, add
   `if (facts.other('scrolled')?.cue(el) === true) return [];` (null in the live overlay, so nothing changes there). In a
   headless run the raster rule (same id, 0.9) speaks when the pair saw no cue.
4. **`soft`** is set from the finding's own `tier`. `craft/interruptible`'s still half has the rule tier advisory but no
   `tier` on its finding, so it is not drawn soft; set `tier: TIER.advisory` on the finding.
5. Rules for the judge: set `judge: true` on 2, 3, 21/52, 25, 40, 56 and return their sub-floor evidence as findings with
   `confidence` 0.6 to 0.8 (the engine drops them, the headless judge reads them).

## Tests

10 new end-to-end tests, all through the real CLI: pairs 1 (layer 4), probes 5 (layer 5), structure 3 (layer 6), judge 1
(layer 7). Run together with e2e/craft-run.test.mjs (3), e2e/craft.test.mjs (7, its Noise test is the noise gate),
craft-hierarchy, craft-wave2 to 7 and noise: 42 tests, 42 pass (`node --test --test-concurrency=1`, Chrome via
`PLUMBER_CHROMIUM`). `npm run typecheck` is clean. Also green: props, packaging, hosts, docs-cli, cli.

Files: e2e/craft-pairs.test.mjs, e2e/craft-probes.test.mjs, e2e/craft-structure.test.mjs, e2e/craft-judge.test.mjs; shared
fixtures in e2e/helpers/craft-headless.mjs, pairs-app.mjs, probes-apps.mjs, structure-apps.mjs.

Cost: a route with a fetch, a scroll area and dark styles opens five extra pages for pairs; probes open one page to list
candidates and one per family that has any. A plain page opens two. `--no-pairs --no-probe` is the old speed.

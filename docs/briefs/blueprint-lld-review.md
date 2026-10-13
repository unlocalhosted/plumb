# Blueprint mode: low-level design review

Reviewed: commit `c590a8a` (`overlay/src/blueprint.js`, `overlay/src/widget.js`, `src/hosts/client.ts`). No code was changed by this review. Line numbers refer to the working tree at that commit.

## 1. The design as built

**Data flow.** `widget.js:377` constructs one `Blueprint(host, root, onCount)`; the widget is the host (`read(el, fresh)`, `pin(el)`), the shadow root receives a `div.bp` holding one `<svg>` and the scan line `<i class="scan">` (`blueprint.js:152-156`). Alt+B (`widget.js:547`) or the dock button (`widget.js:378`) calls `#toggleBlueprint()` → `Blueprint.toggle()`.

`#enter()` (`blueprint.js:174-194`):
1. appends a `<style data-plumb="blueprint">` with `HOST_CSS` to `document.head` (once, never removed),
2. walks `body *`, stamps `data-plumb-drawn` on every element with a fill/border/shadow,
3. `#sweep(true)`: walks `body *` again, writes `--plumb-develop` inline on every visible element, sets `data-plumb-developing`, `data-plumb-field`, `data-plumb-blueprint` on `<html>`, then animates `--plumb-field-r` and `.scan { left }` over 700 ms,
4. `#discover()`: pool = `[data-plumb-source]` stamps (else `body *`), the first 260 visible are entered into `#items` keyed by element with a `sig` (class + style minus `--plumb-develop`) and queued; `#pump()` keeps 6 `host.read()` calls in flight, each result's `state.marks` (minus `exception` ledger) stored on the item,
5. a `MutationObserver` on `body` (childList, class/style attrs) and capture-phase `scroll`/`resize` listeners debounce into `#discover()`,
6. `#loop()` runs every animation frame: for every item with marks and in view, `geometryOf()` measures the element and each mark is turned into an SVG string by `drawMark()`; the concatenation is assigned to `svg.innerHTML` if it differs; `onCount(newDriftCount)` is called every frame.

`#leave()` (`blueprint.js:196-210`) disconnects, cancels the frame, clears the SVG and items, runs `#sweep(false)`, and in its completion callback removes `data-plumb-drawn` and hides the layer.

**Ownership of host-page changes.** Blueprint writes to the host page: the `<style>` in `<head>`, three attributes on `<html>` plus the inline `--plumb-field-r`, `data-plumb-drawn` on N elements, and inline `--plumb-develop` on every visible element (removed at sweep end, but see F2). The widget separately writes inline `!important` previews on the pinned element (`widget.js:1100`), which win over Blueprint's stylesheet `!important` (inline-important beats author-important), so previews stay visible in blueprint mode.

**Rendering.** The SVG is in the overlay's shadow root inside `:host { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647 }`; only `.hit` rects take pointer events. Marks therefore sit above everything, including the dock and the reading card.

## 2. Findings

Severity: **blocker** = ships a visible bug or breaks the "page exactly as it was" promise; **major** = wrong behaviour in a common path or a real performance problem; **minor** = polish.

### Host-page safety

**F1 · blocker · `blueprint.js:174-180, 196-210` · The `<style>` is never removed and `#leave` leaves `data-plumb-field`/`html` inline style timing-dependent.**
`#style` is created once and never removed; after the first use every page carries a Plumb stylesheet in `<head>` until reload. Scenario: a host app's own e2e snapshot of `document.head`, or an `html` with `data-plumb-field` still set because the leave sweep was cancelled (F6), keeps the `html::before` blue field painted under the page. Fix: remove the `<style>` and all three `html` attributes in the leave completion, and make leave idempotent (F6).

**F2 · blocker · `blueprint.js:224, 235` · `style=""` residue on every visible element that had no inline style.**
`el.style.setProperty('--plumb-develop', …)` creates a `style` attribute; `removeProperty` leaves `style=""`. The widget already knows this and guards against it (`widget.js:1128-1130`: "Leave no residue: an element that had no style attribute gets none back"). Blueprint does not. Scenario: `e2e/overlay.test.mjs:85` asserts `getAttribute('style') === null` on `#sync-row` after a write; enter and leave blueprint first and that assertion fails. Also every element's `style` attribute is mutated hundreds of times, which triggers React dev warnings in some setups and breaks any host `MutationObserver` on `style`. Fix: do not write inline styles at all (see F4 for the alternative); failing that, record which elements had no `style` attribute and `removeAttribute('style')` for them as the widget does.

**F3 · blocker · `blueprint.js:30-38` · The blue field is hidden on any page whose `<body>` paints its own background while `<html>` also has one.**
`html::before { z-index: -1 }` paints after the canvas background but before in-flow descendants' backgrounds. `HOST_CSS` clears backgrounds on `body *` only. When `html` has no background, body's background propagates to the canvas and the field shows; when `html` has its own background (every `dark:` setup that puts `bg-…` on `html`, every `html { color-scheme: dark; background: … }` reset, Next.js templates with `className` on `<html>`), body's background no longer propagates, paints above the `::before`, and the field is invisible: white page, white text, white lines. Fix: `html[data-plumb-blueprint] body { background: transparent none !important }` (html's own background sits under the `::before` and does not need clearing). Add an e2e case with a background on both `html` and `body` (T6).

**F4 · major · `blueprint.js:41-43, 227-232` · Elements in the right third snap instead of transitioning; the sweep's transitions override the host's.**
Delay is `at × 700 ms`, duration 240 ms, but `finish()` removes `data-plumb-developing` at 700 ms. Removing `transition` mid-flight cancels the transition and jumps to the end value, so every element whose centre is right of ~66 % of the viewport snaps. Also `transition: … !important` replaces the host's own transitions on every element for the sweep's duration, so a host element mid-transition (a drawer opening) snaps too. Fix: `finish` at `SWEEP + 240 ms`; set `--plumb-develop`-equivalent delays as `at × (SWEEP − 240)`; and prefer a scheme that avoids inline style writes: bucket elements into 24 columns via `data-plumb-col="k"` with 24 rules `[data-plumb-col="k"] { transition-delay: k·(SWEEP−240)/24 ms }`. Attributes other than class/style are outside the observer filter (F11), nothing is left in `style`, and one attribute per element is cheaper than a style serialisation.

**F5 · major · `blueprint.js:182, 219-224` · Interleaved read/write over `body *` on enter forces O(n) style recalcs and layouts.**
Line 182: `getComputedStyle(el)` then `setAttribute('data-plumb-drawn')` per element, with the injected stylesheet (which has a `[data-plumb-drawn]` rule) already in the document, so every write invalidates style and the next read recomputes. Lines 221-224: `getBoundingClientRect` then `style.setProperty` per element, same pattern with layout. On a 5-10k element page this is seconds of jank before the sweep starts. Fix: collect all reads into arrays first, then do all writes (two passes); append the stylesheet after stamping.

**F6 · blocker · `blueprint.js:170-172, 214-251` · No re-entrancy guard: Alt+B during a sweep runs two sweeps at once and the first one's `finish` corrupts the second.**
Press Alt+B twice within 700 ms: `#enter`'s `step` loop and `#leave`'s `step` loop both drive `--plumb-field-r` and `.scan.left` every frame (visible flicker); the enter sweep's `finish` removes `data-plumb-developing` so the leave becomes instant, removes `--plumb-develop` from its `touched` list (clearing the delays the leave sweep just set), then leave's `finish` removes `data-plumb-field`. Reverse order (leave then enter quickly): leave's completion runs after enter has started and (a) strips `data-plumb-drawn` that enter just set and (b) sets `this.#layer.hidden = true` while `#active` is true, so the mode is on with no marks visible until the next toggle. Fix: an explicit state machine (§3) with a sweep token; a toggle during `entering` reverses the same animation from its current `t` (one rAF loop, one `touched` list, one `finish`), never two.

**F7 · major · `widget.js:403-409` · `disconnectedCallback` never leaves blueprint.**
Removing the overlay element (HMR of the client, host test teardown) leaves the stylesheet, the html attributes, the MutationObserver, the scroll/resize listeners and the rAF loop running with `#active = true`. Fix: `Blueprint.destroy()` (immediate, no sweep) called from `disconnectedCallback`.

**F8 · minor · `blueprint.js:35-40`.** Pseudo-elements (`before:bg-…` decorations) and elements inside host shadow roots are not re-inked; `<option>`, `::placeholder`, `<input type=range/checkbox>` keep UA colours; SVG `fill="#…"` literals stay coloured while `currentColor` icons go white. Acceptable for a dev tool; document it. Elements inside host shadow roots are also never discovered (`querySelectorAll` does not pierce) so they show no marks: say so in the dock when `document.querySelectorAll('*')` finds open shadow roots, or walk them.

**F9 · minor · `blueprint.js:35`.** `:not(plumb-overlay)` and `el.closest('plumb-overlay')` are dead guards: `mountOverlay` appends the overlay to `documentElement`, not body (`widget.js:1416`). Harmless, but the comment at line 27 implies the overlay could be in body; keep one guard (`closest`) for hosts that move it.

### Sweep correctness and reduced motion

**F10 · minor · `blueprint.js:57, 223, 243`.** The scan line is eased (`ease-in-out`), element delays are linear in x, so elements re-ink ahead of the line in the first half and behind it in the second. Fix: linear line, or delay = `easeInverse(at) × span`.

Reduced motion (`blueprint.js:216-238`) is correct: no delays, no field animation, no scan line, attributes set at once. Keep it; the e2e tests should run under `reducedMotion: 'reduce'` for determinism (T1-T5) and one test with motion for the residue check (T7).

### Reading pipeline

**F11 · major · `blueprint.js:186-190, 253-256, 270` · The MutationObserver reacts to Plumb's own writes and shares one debounce timer with scroll.**
(a) `finish()` removes `--plumb-develop` from every touched element while the observer is connected → N records → `#discover(true)`. For elements that already had inline styles, the pre-removal serialisation is `"color: red; "` (trailing space after the regex strip) and the post-removal one `"color: red;"`, so `sig` differs and every such element is re-read with `fresh = true`, bypassing the widget cache: a round of server requests for nothing, 300 ms after every sweep. (b) Every widget preview or peek (`widget.js:1100, 1112`) writes the pinned element's `style` → `discover(true)` → a fresh read of the pinned element per hover over a token row. (c) `#onScroll` and the observer share `#dirty`; a host with a continuously animating inline style (Framer Motion, a marquee, a progress bar) resets the timer forever, so scrolling never discovers new elements. Fix: separate timers; throttle (leading + trailing, 200 ms) instead of debounce; ignore records whose target is the pinned element or whose attribute is `style` and whose only difference is a `--plumb-*` property; compute `sig` from `className` plus a normalised style (strip `--plumb-*` and trim) or, better, from `data-plumb-source` + `class` only, since source declarations do not depend on inline style.

**F12 · major · `blueprint.js:285-287` · A read that returns `starting`, `error` or `unplaced` is never retried.**
`item.marks = []` and the item keeps its `sig`, so it is never queued again. Enter blueprint while the dock says "Reading your project…" and the view stays empty forever, even after the server is ready; the dock then says "all true in view" (F13). Fix: on a non-`ready` state, mark the item `pending` and re-queue it when the widget's health transitions to `ready` (the widget already polls; expose `onHealth(ready)` to the blueprint) with a backoff; refuse to enter when health is `failed` (say why in the dock).

**F13 · major · `blueprint.js:299-315`, `widget.js:440` · The dock says "all true in view" before anything has been read.**
`onCount(0)` runs on the first frame, so `#drifts` goes `null → 0` immediately and the "reading…" state never shows. Fix: report `{ read, total, drift }` and show "reading 12 of 84…" until `read === total`, then the count. Only call `onCount` when the tuple changes, from the pump, not every frame.

**F14 · major · the written element after Write, and full reloads.**
After a Write the widget clears its cache (`widget.js:1368`) and the element's class changes on HMR, which the observer sees → `sig` changes → fresh read. That path works. Two gaps: (a) other elements in the same file keep stale readings with a stale `hash` in `#items` until their class changes; a click re-reads via `pin` so it is only visually stale, but the count is wrong; clear all items of that `file` when the widget re-reads after a write (expose `invalidate(file)`). (b) A dev server that does a full reload (no fast refresh) loses blueprint mode entirely; the widget's `RESUME` only resumes the pin (`widget.js:390-401`). Persist `{ blueprint: true }` in the same sessionStorage record and re-enter (instantly, no sweep) on resume.

**F15 · major · `widget.js:456-470` + `blueprint.js:279-295` · Cost per element.**
Each `read` is `locate` + three requests (`site`, `edits`, `text`); the blueprint needs only `site` (marks + ledger). 260 elements ⇒ ~780 requests on entry. Fix: `read(el, { fresh, want: 'marks' })` that skips `text` (and `edits` until pinned), or a `sites` batch endpoint taking an array of `{file,line,column}`; de-duplicate by stamp (`data-plumb-source` value) so repeated components (list rows) are read once and the marks reused.

**F16 · minor · `blueprint.js:261-275`.** The pool loop measures every element in the document on every discover to find 260 visible ones. Use an `IntersectionObserver` over the pool to maintain the visible set, and `ResizeObserver` for geometry (see §3). `visible()` has an 80 px vertical margin and none horizontally; use one `rootMargin`.

### Geometry (`geometryOf`, `blueprint.js:60-97`) versus what the engine emits

`model.js:59-60` gives `mark.props` as the lowered CSS property names of the declarations at the authored site, so for Tailwind v4 utilities the real names are: `gap`, `column-gap`, `row-gap`; `padding`, `padding-inline`, `padding-block`, `padding-top/right/bottom/left`, `padding-inline-start/end`; `margin*` likewise, including `margin-inline-start/end` from `space-x-*`; `border-radius` plus the per-corner forms (`rounded-r-*` → `border-top-right-radius` + `border-bottom-right-radius`); `font-size` with a second `line-height` for `text-sm`; `width` + `height` for `size-*`; `box-shadow`; `inset*`, `top/left…`. `geometry.js:regionFor` already handles these with a per-prop band model, corner choice, geometric gap-axis detection and a Range over the whole element for text. `geometryOf` is a second, weaker implementation of the same thing:

**F17 · major · `blueprint.js:65-73` · gap axis is wrong for grid, reversed and RTL flex, and wrapping rows.**
Axis comes from `flexDirection.startsWith('column')`; `display: grid` reports `flexDirection: row`, so a one-column grid draws a horizontal dimension from `a.right` to `b.left` with negative length and the label at a nonsense x. `row-reverse` and `dir="rtl"` give `b.left < a.right` too. `regionFor` decides by `c.left >= a.right - 0.5` (`geometry.js:25`). Fix: reuse `regionFor`.

**F18 · major · `blueprint.js:75-82` · `padding` and `margin` shorthands, logical and RTL.**
`padding` (from `p-*`) falls to the left-band branch; `regionFor` draws top + bottom bands. `padding-inline-start`/`margin-inline-start` resolve to the left edge regardless of `direction`. `padding-y` (line 76) is not a CSS property. Fix: reuse `regionFor`; map its `rects` to dimension lines (a band's thin side is the dimension).

**F19 · major · `blueprint.js:83` · radius always draws the top-left corner with `borderTopLeftRadius`.**
`rounded-r-[14px]` marks the wrong corner with the wrong value (0). `parseFloat('50%')` gives 50 px for percentage radii. `regionFor` picks the corner from the prop (`geometry.js:53`). Fix: reuse.

**F20 · minor · `blueprint.js:84-92`.** Type bracket uses only the first text node's first client rect; `<h1><span>Title</span></h1>` has no direct text node, so `font-size` falls through to `tag`. Multi-line text brackets only the first line. `regionFor` uses `Range.selectNodeContents(element)` (`geometry.js:64`); use it, and bracket the union of client rects' height.

**F21 · minor.** Only `props[0]` is used (`line 63`); for `size-8` (`width`,`height`) or `text-sm` (`font-size`,`line-height`) the second property is silently dropped; `labelOf` then says `text 13.5` for a line-height finding. Transforms: `getBoundingClientRect` is post-transform but `paddingTop` etc. are not, so a scaled element's dimension line is the wrong length (accept, or multiply by `r.width / el.offsetWidth`). Margin collapsing: the top margin band is drawn at its full computed value above the box even when collapsed into the parent, so it can overlap the previous sibling's mark; `regionFor` has the same simplification, so document it.

### Rendering performance

**F22 · major · `blueprint.js:298-317` · Per-frame rebuild.**
Every frame, for every item with marks: `getBoundingClientRect` + `getComputedStyle` + child rects + a `Range` (`geometryOf`), string building, a full `innerHTML` comparison (tens of KB) and, on any sub-pixel change (smooth scroll), a full SVG re-parse. With 100 marks this is roughly 300+ layout reads per frame plus DOM churn; on scroll it also destroys the hovered `<title>` tooltip and any focused rect. `onCount` is called every frame too (the widget filters, but `#dock()` still allocates). Fix (§3): retained SVG nodes keyed by a stable mark id, geometry recomputed only when invalidated (scroll/resize/mutation/ResizeObserver), scroll handled by translating one `<g>` by the scroll delta for non-fixed elements and re-measuring fixed ones only, all measurements batched in one `requestAnimationFrame` after the invalidation.

### Click, hit-testing, keyboard

**F23 · major · `blueprint.js:157-163, 308` · `data-i` is a Map iteration index, not a stable id.**
`#discover` deletes disconnected items (line 275) and the click resolves `[...items.values()][i]` at click time; a removal between the frame that rendered the rect and the click pins the wrong element. With retained nodes (F22) the window grows to the next invalidation. Fix: give each item a monotonic `id`, store `items` as `Map<id, item>` plus `Map<Element, id>`, put `data-id` on the rect.

**F24 · major · accessibility of marks.** The SVG is `aria-hidden` and rects have no `tabindex`/`role`, so marks are mouse-only; the only keyboard path is Alt-hover (which also needs a mouse). Fix: `<rect class="hit" tabindex="0" role="button" aria-label="{title}">`, Enter/Space → pin, `:focus-visible` ring (`stroke: #fff; stroke-width: 2`), and keep rects in DOM order by document position so Tab order follows the page. Drop `aria-hidden` from the svg, keep decoration `<g>` `aria-hidden`.

**F25 · minor.** Hit rects (`pointer-events: auto`) sit above the reading card and dock (same shadow root, later in DOM, `z-index` max); a mark whose hit box overlaps the card steals the click. Give `.bp` `z-index: 0` and the card/dock a higher one inside the host, or hide marks under the card's rect.

### Accessibility and colour

**F26 · major · `widget.js:440` · Announcements.** Entering is announced through the dock's `role=status` as "Blueprint · all true in view" (F13 makes it wrong at first) and then re-announced on every count change as readings trickle in (one per frame batch): chatty. Announce once on enter ("Blueprint on, reading 84 elements"), once when reading finishes ("12 off in view"), and on leave ("Blueprint off"); keep the live count visual only (`aria-live` on a separate span set to `off` while reading).

**F27 · major · `blueprint.js:25, 51`.** Drift ink `#ffe1db` on `#2f5be0` measures 4.6:1, which passes AA for normal text only; the labels are 10 px mono, below any sensible minimum, and the drift ink is almost indistinguishable from the white line ink (1.3:1 against `#fff`), so "drift" and "line" read the same. Debt ink `rgb(255 255 255 / .55)` composites to about `#a1b5f1`, 2.8:1 — fails. The 3 px blue text stroke (paint-order) rescues legibility over white lines but not the semantics. Fix: 11-12 px labels; drift in a hue that reads as such on blue (an amber/salmon ≥ 4.5:1 against `#2f5be0` and ≥ 3:1 against white: e.g. `#ffc9a3` ≈ 5.0:1 / 1.6:1 is still weak against white, so also use shape: solid vs dashed is already used for debt; give drift a filled arrow head or a 2 px stroke). Debt at ≥ 3:1 (`rgb(255 255 255 / .75)` ≈ `#cbd6f7`, 3.9:1). Verify with the `dataviz` palette validator or an APCA check before shipping.

### Integration with widget.js

**F28 · minor · `widget.js:547-548`.** Alt keydown arms Select first (`#arm()` adds capture `pointerdown` swallow and the crosshair) and B then disarms; with a slow `#dock()` this flashes "Pick an element". Handle `KeyB` before arming by checking `event.altKey && code === 'KeyB'` first (it already is) and skip the arm when `event.code` is not `Alt`… the real issue is the previous `Alt` keydown already armed. Acceptable; alternatively arm on Alt keyup-less hold after 60 ms.

**F29 · minor.** Escape does not leave blueprint (`widget.js:549-550` only handles Select and pinned). Suggest Esc leaves blueprint when nothing is pinned or armed. Alt+B inside a text field inserts nothing (prevented) but on macOS Firefox Alt+B is a menu accelerator; keep `preventDefault`.

**F30 · minor · `widget.js:412-416`.** `aria-pressed` is set synchronously from `active`, correct. But the dock's `data-fold` is only suppressed while active; after leave the fold timer has long expired so the dock folds instantly; call `#dock()` after the leave sweep completes (needs an `onState` callback, §3).

**F31 · minor · `src/hosts/client.ts:9`.** Allow-list updated correctly. Next.js host (`src/hosts/next*.ts`) serves the same list; confirmed shared.

## 3. LLD for the corrected implementation

### Modules

- `overlay/src/blueprint.js`: `Blueprint` (lifecycle + state machine + host-page ink) and nothing else.
- `overlay/src/blueprint-marks.js`: `MarkLayer` (retained SVG, geometry via `regionFor`, hit/focus handling). Pure rendering, no knowledge of the server.
- `overlay/src/blueprint-reader.js`: `Reader` (visible set, queue, concurrency, invalidation, health gating). Depends only on `host.read` and the element pool.
- `overlay/src/geometry.js`: add `dimensionsFor(element, props)` that maps a `regionFor` result to `{kind:'h'|'v'|'arc'|'type'|'box'|'tag', …}` so the Alt card and the blueprint share one geometry.
- `src/hosts/client.ts`: add the two new modules to `overlayModules`.

### State machine (Blueprint)

```
off ──toggle()──▶ entering ──sweep done──▶ on ──toggle()──▶ leaving ──sweep done──▶ off
   ◀──────────── (toggle during entering: reverse from current t) ◀────────────────────
```

- One `#sweep` object at a time: `{ token, direction, t0, t }`. `toggle()` in `entering`/`leaving` flips `direction`, recomputes `t0` so `t` is continuous, keeps the same `touched`/column attributes, and the single rAF loop finishes once. `finish` checks `token` before touching the DOM.
- `destroy()`: from any state, remove everything immediately (no sweep), used by `disconnectedCallback`.
- Transitions emit `onState(state)` to the widget (dock text, `aria-pressed`, fold, announcements).
- `enter` is refused when `health !== 'ready'` (widget passes health in; on `starting` the dock says "Blueprint waits for the first read", and the pending request enters automatically when health turns ready, if the person has not toggled since).

### Host-page ink (in `Blueprint`)

- One `<style data-plumb="blueprint">` appended on enter and removed on the leave `finish`.
- `html` attributes: `data-plumb-blueprint` (ink), `data-plumb-field` (field), `data-plumb-developing` (transition enabled), set/removed exactly as now but inside the token-checked `finish`. Field progress stays as `--plumb-field-r` on `html` because one inline property on `html` is harmless; remove it on finish.
- Per-element sweep delay: `data-plumb-col="0..23"` (bucketed by horizontal centre), removed on finish; no inline `style` writes. Rule: `html[data-plumb-developing] body [data-plumb-col="k"] { transition-delay: calc(k * var(--plumb-col-step)) }` with `--plumb-col-step` on `html`. On leave, set `--plumb-col-step` negative-ordered by writing `data-plumb-col` as `23 − k` once at leave start (one pass).
- Add `html[data-plumb-blueprint] body { background: transparent none !important }` (F3).
- `finish` at `SWEEP + DEVELOP` (700 + 240 ms); delay span = `SWEEP − DEVELOP`.
- All `body *` passes: read phase into arrays, then write phase (F5). The `drawn` test and the column bucket are computed in the same read pass (one `getComputedStyle` + one `getBoundingClientRect` per element).

### Reader

Data:

```
items: Map<id, { id, el, stamp, sig, file, state: 'queued'|'reading'|'ready'|'pending', marks: Mark[] }>
byEl:  WeakMap<Element, id>
visible: Set<id>                      // maintained by IntersectionObserver (rootMargin 80px)
queue:  id[]; inflight: number (≤ 6)
```

- Pool: `[data-plumb-source]` if any, else `body *` minus script/style/overlay. Observed by one `IntersectionObserver`; `visible` changes enqueue unread or `pending` items (CAP 260 on the visible set, nearest-to-viewport-centre first so the fold reads first).
- `sig` = `stamp + '|' + className` (inline style is irrelevant to source declarations). Items with the same `stamp` share one read (`Map<stamp, Promise>`), so a list of 40 identical rows costs one read.
- `read` uses `host.read(el, { fresh, want: 'marks' })`: `locate` + `site` only; `edits`/`text` are fetched by `pin`. Non-`ready` results set `state = 'pending'` and are retried on `health → ready` or after 2 s backoff (max 3).
- Invalidation inputs: `MutationObserver` (childList; attributes `class` only; records whose target is `host.pinned` or inside the overlay are dropped), `host.onWrote(file)` → every item with that `file` becomes `queued` with `fresh: true`, `host.onHealth('ready')` → every `pending` item re-queued. Throttle: leading + trailing, 150 ms, separate from scroll.
- Progress: `onProgress({ read, total, drift })` emitted from the pump only when it changes.
- Resume: the widget writes `{ blueprint: true }` into the `RESUME` record before a write; `#resume` re-enters with `instant: true`.

### MarkLayer (render scheduling)

- Retained nodes: one `<g data-id="{id}:{k}">` per mark, created when an item's marks arrive, removed when the item leaves `visible` or is invalidated. Attribute updates only (`setAttribute` on existing `<line>/<path>/<text>/<rect>`), never `innerHTML`.
- Geometry source: `dimensionsFor(el, mark.props)` built on `regionFor` (F17-F20), computed in a `measure()` pass.
- Scheduling: a single `scheduled` flag; `invalidate(reason)` requests one rAF. In that frame: all measurements first (`getBoundingClientRect`, `getComputedStyle`, Range), then all attribute writes. Triggers: `visible` change, marks arrival, `ResizeObserver` on each visible item's element, `resize`, host `transitionend`/`animationend` (capture) and the reader's invalidations. Scroll: in the scroll handler record `dx, dy` and set `transform="translate(…)"` on the root `<g>` for non-fixed items (`items` whose `position` chain is not fixed/sticky; detected once at measure); fixed/sticky items are re-measured in a rAF. A full re-measure is scheduled 120 ms after scrolling stops.
- Label font 11 px; drift/debt inks per F27; drift marks get `stroke-width: 1.5` and solid ticks; debt dashed at `.75` white.
- Hit rects: `tabindex="0" role="button" aria-label="{title}"`, `data-id`, `click`/`keydown(Enter|Space)` → `host.pin(el)`; document-order insertion for Tab order; `.hit:focus-visible` ring. Rect under the reading card or dock is hidden (compare with their `getBoundingClientRect`, measured once per frame).

### Public API between widget.js and blueprint.js

```js
// blueprint.js
new Blueprint(host, root, { onState, onProgress })
  host.read(el, { fresh?: boolean, want?: 'marks' | 'full' })   // widget.read, extended
  host.pin(el)
  host.health      // 'starting' | 'ready' | 'lost' | 'failed'
  host.pinned      // Element | null (for observer filtering and hit occlusion)
blueprint.toggle({ instant?: boolean })
blueprint.enter({ instant }) / blueprint.leave({ instant })
blueprint.destroy()
blueprint.state    // 'off' | 'entering' | 'on' | 'leaving'
blueprint.invalidate({ file?: string, element?: Element })      // widget calls after a write / reread
blueprint.healthChanged(status)                                 // widget's #poll forwards
// callbacks
onState(state)                                                  // dock text, aria-pressed, fold, announce
onProgress({ read, total, drift })                              // dock count
```

Widget changes: `disconnectedCallback` → `destroy()`; `#reread` → `invalidate({ file })`; `#poll` → `healthChanged`; `#resume` reads `blueprint` from the record; `#dock` renders `reading n of m…` until `read === total`; the `.say` announcement is made on `onState` only.

## 4. End-to-end test plan

Harness: Playwright + real Vite + the demo app, as in `e2e/overlay.test.mjs` and `e2e/dock.test.mjs` (`demo(t)` helper, `window.__plumb.ready()`), `node --test`. All tests assert through the real boundary: keyboard, the dock's toolbar, the host DOM, the overlay's shadow DOM, and the file on disk. Default context `reducedMotion: 'reduce'` for determinism; T7 runs with motion. Suggested file: `e2e/blueprint.test.mjs`. Helpers: `shadow = () => document.querySelector('plumb-overlay').shadowRoot`, `hits = () => shadow().querySelectorAll('.bp .hit')`, `hostSnapshot = () => { const c = document.documentElement.cloneNode(true); c.querySelector('plumb-overlay')?.remove(); return c.outerHTML; }`.

**T1 · Enter draws Plumb's findings where they live; the dock counts them.**
Setup: demo app, ready. Action: `page.keyboard.press('Alt+B')`. Assert: `html` has `data-plumb-blueprint` and `data-plumb-field`; `head > style[data-plumb=blueprint]` exists; `#sync-row` computed `background-color` is `rgba(0, 0, 0, 0)` and `color` is `rgb(255, 255, 255)`; wait until the dock's `.say` matches `/\d+ off in view · Alt\+B/`; the set of `.hit > title` texts includes the `gap-[10px]`, `py-[10px]`, `px-[14px]`, `rounded-[14px]`, `text-[13.5px]` titles for `#sync-row` and its children, and the `#beta-chip` ones; no title mentions an `exception` ledger; the count equals the number of distinct `new` marks across those titles. Geometry: the hit rect whose title mentions `gap-[10px]` lies between the avatar `span.size-8`'s right edge and the text column's left edge (compare `getBoundingClientRect` of the rect in the shadow to the children's rects), within 2 px; the `rounded-[14px]` rect touches the row's top-left corner. `aria-pressed` on "Blueprint mode" is `true`; the dock does not fold after 5 s.

**T2 · Leave restores the page exactly.**
Setup: `before = hostSnapshot()` taken after ready, before entering. Action: Alt+B, wait for count, Alt+B again, wait for `html` to lose `data-plumb-field`. Assert: `hostSnapshot() === before` (covers `style=""` residue, `data-plumb-drawn`, `data-plumb-col`, html attributes); `head` has no `style[data-plumb]`; `#sync-row.getAttribute('style') === null`; `hits().length === 0`; `.bp` is hidden; dock says `Plumb · Alt to inspect`; `aria-pressed="false"`; no `pageerror`. Then scroll the page and assert `hits().length` stays 0 (listeners gone).

**T3 · A mark pins its reading; Write works from it; the written element is read again.**
Action: Alt+B; click the hit rect whose title matches `gap-[10px]`. Assert: dialog "Plumb reading for div in SyncRow" opens; pick the `compact related items` token; `Write 1 edit`; wait for "Wrote 1 edit to src/App.jsx"; file on disk contains `gap-s2`; wait until no hit title matches `gap-[10px]` and the count has dropped by one; the `py-[10px]` mark is still present (other marks survive). Escape closes the dialog; blueprint stays on (`data-plumb-blueprint` still set).

**T4 · Keyboard: Tab reaches a mark and Enter pins it.**
Action: Alt+B; `page.keyboard.press('Tab')` until `shadow().activeElement?.classList.contains('hit')` (bounded loop); read its `aria-label`; press Enter. Assert: the dialog opens for the element named by that label; focus moves into the card (`.card` is `shadow().activeElement`). Also assert each `.hit` has `role="button"` and a non-empty `aria-label`.

**T5 · Blueprint while the server is starting draws once it is ready; refused when failed.**
Setup: route `**/__plumb/health` and `**/__plumb/site` to answer 503 `{status:'starting'}` for the first 3 s (pattern from `e2e/verify-writes.test.mjs:53-60`), then fall back. Action: Alt+B immediately after `window.__plumb.overlay` exists. Assert: dock says `Blueprint · reading…` (or the "waits for the first read" wording), `hits().length === 0`; after routes clear, count appears and `hits().length > 0` without any further keypress. Second case: health answers `{status:'failed', diagnostic:'x'}`; Alt+B leaves `html` without `data-plumb-blueprint` and the dock stays on "Plumb couldn't start".

**T6 · The field shows on a page that paints both html and body.**
Setup: demo with `index.html` adding `<style>html{background:#111}body{background:#fff}</style>`. Action: Alt+B. Assert via `page.screenshot` sampling: the pixel at an empty area of the page (e.g. 10 px from the right edge mid-height, outside `main`) is blue (`r<80, g<120, b>180`). Also assert `getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)'` while on, and the original `rgb(255, 255, 255)` after leaving.

**T7 · With motion: the sweep completes, nothing is left mid-transition, re-entrancy is safe.**
Context `reducedMotion: 'no-preference'`. Action: Alt+B; at 200 ms press Alt+B again (reverse mid-sweep); wait 1.5 s. Assert: `html` has none of the three attributes, no element has `data-plumb-col`/`data-plumb-drawn`, `hostSnapshot()` equals the pre-enter snapshot, `.bp` hidden. Then Alt+B, wait 1.2 s: every visible element's computed `color` is white and `getAnimations()` on `document` reports no running transitions from Plumb (`document.getAnimations().filter(a => a.transitionProperty && a.playState === 'running').length === 0`); the scan line is hidden.

**T8 · Geometry follows scroll without rebuilding marks; new elements scrolled into view are read.**
Setup: demo with 60 `SyncRow`s (write a taller `App.jsx` into the temp root). Action: Alt+B; wait for count; record `node = hits()[0]` and its rect; `page.mouse.wheel(0, 400)`; wait one frame. Assert: `hits()[0] === node` (retained node, same identity), its rect moved up by 400 ± 1 px; after 500 ms the count grew (rows below the fold were read) and `hits().length` increased; hit titles for rows above the fold are gone (not drawn out of view).

**T9 · A host that animates inline styles continuously does not stop discovery.**
Setup: inject `setInterval(() => el.style.opacity = Math.random(), 16)` on one element before Alt+B. Action: Alt+B; scroll. Assert: as T8, rows scrolled into view are read within 1 s.

**T10 · Removing the overlay leaves nothing behind.**
Action: Alt+B; wait for count; `document.querySelector('plumb-overlay').remove()`. Assert: `html` attributes gone, `head` style gone, `hostSnapshot()` equals the pre-enter snapshot, and a subsequent scroll causes no console errors.

**T11 · Dark-mode host and `html` stacking context.**
Setup: `index.html` with `<html class="dark" style="position:relative; z-index:0; background:#0b0b0f">`, `body { background:#0b0b0f; color:#eee }`. Action: Alt+B. Assert as T6 (field visible, text white) and after leave the computed `html`/`body` backgrounds are the originals.

Run order and budget: each test under 60 s on the demo app; T8/T9 under 90 s. All must pass with `PLUMB_CHROMIUM` set as the existing suite expects.

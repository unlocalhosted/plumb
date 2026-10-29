# Blueprint detection must be deterministic

## The problem, measured

crafting-ui `/motion`, no code change, Blueprint opened five times: **656, 691, 641, 642, 530** problems. The count is
"what the reader has reached so far", not "what the page has". Three systems feed that:

1. **The reader reads the view first and the page after, under caps.** `overlay/src/blueprint-reader.js` registers every
   element with an IntersectionObserver, reads what is in view (nearest the middle first, `CAP = 260`), then the rest
   of the page off-screen up to `PAGE = 2000`, skipping anything `checkVisibility()` says is hidden. Scroll position,
   window size and the moment the count is read all change what has been read, so the number is a function of the
   viewport and the clock, not of the source.
2. **The observer only fires when the page paints.** In a hidden tab it fired 0 callbacks for 931 observed elements;
   `settled` was still true and progress said `done: true, total: 0`. Reproduce: keep the tab hidden, Alt+B, read
   `window.__plumb.overlay.progress`.
3. **Every change restarts reads.** An HMR update, an animation's class change or a mutation re-queues elements; a
   reading shared by stamp was once wrong for pass-through components (`#byStamp`, fixed with `perElement`), and the
   census craft rules judged half a page (fixed in d0e1bac). Each fix was a patch on the same system: the answer is
   assembled from the page, element by element, in whatever order the page shows them.

Smaller contributors found while reading the code: a reading that comes back `starting` is retried on a 2/4/8 s
backoff per element, so a cold server leaves elements unread until the backoff lands (and the count moves when it
does); `#rest()` takes `WAVE` elements per schedule, so the off-screen sweep's extent depends on how many schedules
ran before the count was read; `drift` is counted over `order` (the view), not the page.

## The system to replace it

What is wrong is computed from source, once, the same way every time. The page only says where each problem shows.

### Layer 1: the server answers the whole page in one go (`POST /__plumb/page`)

Request: the stamped elements of the page, as the overlay collects them with one `querySelectorAll` and no visibility
gating, deduplicated by stamp and rendered classes:

```
{ items: [{ stamp: 'src/App.tsx:12:9#1a2b3c4d5e6f', classes?: 'px-4 py-2' }] }
```

Response, one entry per item, in the same order:

```
{ hash: '<revision>', items: [{ stamp, classes?,
    status: 'ready' | 'unplaced',
    file?, line?, column?, component?, usage?,      // where the stamp resolved (resolveSource, stamped)
    outsideSource?: true,                            // unplaced: a tracked file outside `source`
    site?: { declarations, findings },               // the reading at that JSX (the same answer GET site gives)
    traced?: ClassesResult }] }                      // only when the JSX declares nothing and the element carries classes: the trace of those classes (the same answer GET classes gives), so a pass-through component's caller-level reading can be resolved by the overlay for every element, not on view
```

- Computed the way the CLI does: the same report view, the same `site` and `classes` answers, so the Alt card, the CLI
  and Blueprint agree.
- Cached per item by the content hash of the file the stamp names (and of the trace's files): a second request for the
  same page costs no analysis. The cache is dropped for a file when its hash changes (a write, an editor save, an HMR
  update all reconcile the file), so an answer is never stale.
- One cohort: the whole request is one serialized read (as `batch` is), so every item sees one revision.
- `starting` is a 503 for the whole request, as today; the overlay asks again when the server says ready, nothing is
  counted meanwhile.

### Layer 2: the reader counts from the whole-page answer

`overlay/src/blueprint-reader.js` (and the resolve/trace paths in `widget.js` it uses):

- **Pool**: every element under `document.body` (not inside `<svg>`, not the overlay), from one `querySelectorAll`,
  in document order. No IntersectionObserver, no `checkVisibility`, no `CAP`, no `PAGE`.
- **One answer**: stamped elements go to `POST page` as one request (chunked only by size, every chunk sent at
  once); unstamped elements (shared source located through the owner stack) and pass-through components (the trace
  says the classes are passed in) take the existing per-element path, batched over every such element, not over the
  view. The reading of an element is a pure function of (stamp, rendered classes, source revision).
- **Viewport order decides only what is drawn or measured first.** Marks are drawn where they can be seen; the
  count and the fix list are of the whole page.
- **`done`** means the whole-page answer and every per-element fallback have landed, and nothing is queued. Progress
  is whole-page: `{ read, total, drift, on, checked, notChecked, outsideSource, notes, done }` with `total` the
  pool's size, `read` what has landed, `drift` the problems from source, `notes` the runtime observations (below).
- **Changes**: a DOM change re-scans the pool (new elements are read, gone ones dropped, a changed class re-reads
  that element); a write or HMR update drops the readings of that file and reads them again, all of them, before
  `done` is true again. No per-element backoff: a `starting` answer parks the whole read until the server is ready.

### Layer 3: runtime-only rules are notes

Craft rules that read computed style, contrast or the page's census cannot come from source. They stay, run once over
the whole stamped set per DOM change (the `enrich` pass already runs over every read element), and are counted as
`notes`, apart from the problems and fixes, so they never move those counts. If a rule's answer depends on layout
timing (fonts loading, an animation mid-flight), it is reported here rather than hidden.

## Done means

One headless e2e test on a fixture page taller than the viewport asserting identical problem/fix/note counts and an
identical fix list across: the first opening; reopening; scrolling to the bottom and then opening; opening at 400 px
versus 1200 px; opening with the page hidden (no frames); and after an HMR edit that is reverted. Plus, on crafting-ui
`/motion`: five openings with the same numbers, and the time to the first count before and after (about 4.5 s cold,
0.5–1 s reopen today; not to regress badly).

## Layers, each with its own proof and commit

1. Server: `POST /__plumb/page`, with its e2e (same answer as `site`/`classes` per item; a second call served from the
   cache; a write invalidates it).
2. Reader: whole-page reads, viewport only for drawing order, `done` whole-page; the determinism e2e above.
3. Notes: runtime craft rules counted apart (progress `notes`), census once per DOM change.

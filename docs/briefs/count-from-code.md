# Count from the code the page loaded, not from the elements it rendered

## The problem, measured

With the reader a pure function of the DOM (docs/briefs/deterministic-detection.md), crafting-ui `/motion` still
moves: loaded at the top it rendered **947** elements on one load (636 problems) and **931** on another (624); loaded
at the bottom, 931 (624). Its sections mount on scroll and intersection, so the DOM, and the count with it, depends
on the page's own lazy rendering. A count of element instances also disagrees with what Apply writes: a component
rendered 40 times is 40 problems on the page and one edit in the source.

## The system

**The unit is a place in the source**: a class site, `file:line:column:text`. A component rendered 40 times is one
place with 40 elements. "N problems" becomes "N places in your code", which is what one Apply fixes.

**The set of files is the files this page renders** (the owner's choice, after the import closure was tried: see
"Why not the import closure" below): every file a `data-plumb-source` stamp on the page names, plus the files
pass-through components' classes are written in (their callers' readings). No module-graph walk. A file that appears
later (a section in its own file mounting on scroll, a lazy chunk) joins the count when it appears; a file that
leaves (a route change) drops out. That is the known gap, measured below.

**Every finding at those places is counted, rendered or not.** Each place lists the elements that render it (zero or
more), which the reader knows from stamps and per-element readings. Pass-through components (a `<Link>` whose
classes are passed in) count at the caller's site, where the report already puts them.

**`done`** means the closure is known, every file in it is answered, every element is answered, and the page is quiet
(the 300 ms / 1 s window stays). Progress gains `places` (places with a problem or a gap on the system) and
`unrendered` (places with no element on the page right now).

**Runtime craft notes stay per element**, as now: they measure the page and cannot come from source.

### Why not the import closure

The first cut counted the static import closure of the modules the browser loaded (Vite's module graph). On
crafting-ui `/motion` that was 2579 places with 73 rendered: `src/lib/router.tsx` imports every route statically, so
the closure was the whole app. Measured on `/motion`, scrolled top to bottom, the page renders from the same 12
source files the whole time (MotionIndexPage, SiteHeader, router, Icon, marks, blueprint, Stage, OffsetAndDelayClip,
draw, drawing, Timeline, PartIcon) and scrolling adds none: the movement came from elements inside those files
mounting and unmounting. So the files the page renders are the unit; the closure endpoint was removed.

### Hosts

| Host | Files | Count |
| --- | --- | --- |
| Vite | from the stamps on the page (`data-plumb-source`) and the readings | places in those files, rendered or not |
| Next.js | the same: its stamping writes the same stamps; `POST places` is a session read the Next route serves too | the same |
| Docs replay | no server: `places` is absent (404) | the rendered elements' places alone |

## Endpoint

- `POST /__plumb/places { files: [relative…] }` → `{ revision, files: [{ file, hash, findings, declarations }] }`:
  the report's findings whose sites are in that file (sites filtered to it) and its declarations, from the same
  ledgered view GET site reads.

## Data shape for the panel

An item the reader hands on for a place with no element: `{ id, el: null, site: { file, line, column, text }, file,
marks: [mark], dims: [], checked: true }`, one per unrendered place, with the mark built the way element marks are
(model.js `reading`). Behind the reader option `unrendered: true` until the panel can hold them; the counts in
progress include them regardless.

## Done means

- `e2e/blueprint-determinism.test.mjs` gains a section that mounts only on IntersectionObserver (in the same file as
  the rendered content, as on crafting-ui) and a component rendered many times; identical counts whether the section
  has mounted or not, across every existing case. A second case documents the gap: a section in its own file is not
  counted until it mounts, and counted once it has.
- crafting-ui `/motion`: identical numbers loaded at the top, at the bottom, in a hidden tab, and after scrolling.
- Before and after on crafting-ui `/motion`: elements 947/931 → 636/624 problems (by element); the place count is
  recorded in the result section below once measured.

## Result (crafting-ui `/motion`, files this page renders, dev server restarted on this build)

| Opening | problems | places | unrendered | notes | elements | first count | done |
| --- | --- | --- | --- | --- | --- | --- | --- |
| loaded at the top, cold | 111 | 113 | 40 | 38 | 947/947 | 709 ms | 1206 ms |
| loaded at the top, reopened | 111 | 113 | 40 | 38 | 947/947 | 240 ms | 1027 ms |
| after scrolling through | 111 | 113 | 40 | 38 | 947/947 | 242 ms | 1032 ms |
| loaded at the bottom | 111 | 113 | 40 | 38 | 947/947 | 523 ms | 1026 ms |
| hidden tab (320×120, document.hidden) | 111 | 113 | 40 | 43 | 947/947 | 44 ms | 1168 ms |

The fix list (every (place, cause) with a new problem) is identical across the five openings. `problems` counts
distinct (place, cause) pairs, place = file:line:column, cause = rule + class text, over new marks that are not
in-code notes; `places` counts class sites with any mark. Of the 113 places, 40 are in no rendered element right
now (sections of the same files that mount on scroll or state). Places by file: pages/MotionIndexPage.tsx 64,
components/blueprint.tsx 30, motion/Timeline.tsx 15, components/SiteHeader.tsx 4; `src/lib/router.tsx` has 0 (it
renders no class of its own). Before, by element: 636 (947 elements) or 624 (931 elements), and 2579 with the import
closure. Notes stay per element (38; 43 with the page hidden at 320×120: the craft rules measure the page).

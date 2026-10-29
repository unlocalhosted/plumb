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

**The set of files is the page's code**: the static import closure of the modules the page has loaded, from Vite's
module graph on the server, starting from every module the browser fetched (`performance` resource entries for this
origin: the entry, every `/src/...` module, a lazy chunk once it loaded). Static imports are followed
(`staticImportedUrls`); a dynamic `import()` is a boundary unless its chunk has loaded, in which case it is a root of
its own. Files outside the project root, in `node_modules`, or not `.js/.jsx/.ts/.tsx` are not places.

**Every finding at those places is counted, rendered or not.** Each place lists the elements that render it (zero or
more), which the reader knows from stamps and per-element readings. Pass-through components (a `<Link>` whose
classes are passed in) count at the caller's site, where the report already puts them.

**`done`** means the closure is known, every file in it is answered, every element is answered, and the page is quiet
(the 300 ms / 1 s window stays). Progress gains `places` (places with a problem or a gap on the system) and
`unrendered` (places with no element on the page right now).

**Runtime craft notes stay per element**, as now: they measure the page and cannot come from source.

### Where there is no module graph

| Host | Closure | Count |
| --- | --- | --- |
| Vite | `POST /__plumb/closure` from the plugin, module graph | places in the closure, rendered or not |
| React.lazy / dynamic routes under Vite | a chunk joins the closure once the browser has fetched it; the reader asks again when the set of loaded modules changes | the loaded routes' places |
| Next.js (webpack) | no graph: `closure` answers 404 | today's DOM path: the places of the rendered elements |
| Docs replay | no server: 404 | DOM path |

The DOM path is the fallback everywhere: places are the union of the rendered elements' marks. The closure only adds
the places the page has not rendered.

## Endpoints

- `POST /__plumb/closure { modules: [url…] }` → `{ files: [relative…], unresolved: [url…] }` (Vite plugin middleware,
  before the session handler; 404 elsewhere).
- `POST /__plumb/places { files: [relative…] }` → `{ revision, files: [{ file, hash, findings, declarations }] }`:
  the report's findings whose sites are in that file (sites filtered to it) and its declarations, from the same
  ledgered view GET site reads.

## Data shape for the panel

An item the reader hands on for a place with no element: `{ id, el: null, site: { file, line, column, text }, file,
marks: [mark], dims: [], checked: true }`, one per unrendered place, with the mark built the way element marks are
(model.js `reading`). Behind the reader option `unrendered: true` until the panel can hold them; the counts in
progress include them regardless.

## Done means

- `e2e/blueprint-determinism.test.mjs` gains a section that mounts only on IntersectionObserver and a component
  rendered many times; identical counts whether the section has mounted or not, across every existing case.
- crafting-ui `/motion`: identical numbers loaded at the top, at the bottom, in a hidden tab, and after scrolling.
- Before and after on crafting-ui `/motion`: elements 947/931 → 636/624 problems (by element); the place count is
  recorded in the result section below once measured.

## Result (crafting-ui `/motion`, dev server restarted on `8539589`+reader)

| Opening | problems (places) | places | unrendered | notes | elements | first count | done |
| --- | --- | --- | --- | --- | --- | --- | --- |
| loaded at the top, cold | 2579 | 2579 | 2506 | 38 | 947/947 | 918 ms | 1419 ms |
| loaded at the top, reopened | 2579 | 2579 | 2506 | 38 | 947/947 | 780 ms | 1024 ms |
| after scrolling through | 2579 | 2579 | 2506 | 38 | 947/947 | 725 ms | 1029 ms |
| loaded at the bottom | 2579 | 2579 | 2506 | 38 | 947/947 | 565 ms | 1079 ms |
| hidden tab (320×120, document.hidden) | 2579 | 2579 | 2506 | 43 | 947/947 | 692 ms | 1823 ms |

The fix list (every place with a new problem, by key) is identical across the five openings. Before, by element:
636 (947 elements) or 624 (931 elements) depending on what the page had rendered.

What the number means now: crafting-ui's entry imports every route statically (no `React.lazy`), so the page's code
is the whole app's code: 2579 places, of which 73 are rendered on `/motion` and 2506 are not. "N problems" is "N
places in your code", not "N on this screen". Notes stay per element (38 shown, 43 with the page hidden: the craft
rules measure the page, and a hidden 320×120 page measures differently). A route split with `React.lazy` would narrow
the closure to the loaded routes.

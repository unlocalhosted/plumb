# Craft engine: the mentor's rules, read on the rendered page

Status: design and foundation, 2026-10-27. Source: docs/craft/rules.md (77 rules, each with Why, Detect, How).
Drift says "this value is off your scale"; craft says "this value is on the scale and still wrong here", because a
rule of good making relates it to its neighbours: a child's radius to its parent's radius and padding, an inner gap to
the gap around it, a text colour to what lies behind it, a transform to the device pixel grid. The engine that finds
these is a *heuristic* engine: it measures, it compares, and it speaks only when the evidence is plain.

## Where each kind of rule runs

| Needs | Where | Rules (by number) |
|---|---|---|
| rendered geometry and computed style (rects, paddings, radii, gaps, opacity, transforms, line boxes) | **the browser**, in blueprint's reader pass | 1, 4–10, 12–18, 20–27, 33–42, 51–57, 70–77 |
| font metrics or rasterised glyphs (cap height, mass centroid) | the browser, with a canvas or `OffscreenCanvas` | 2, 3, 4, 50 |
| behaviour over time (hover styles, transitions, menus, tooltips, spinners) | the browser, with a scripted gesture or by reading the stylesheets' rules for `:hover`, `transition`, `@keyframes` | 28–32, 42, 59–68 |
| only the source text or compiled CSS (curly quotes, `100vh`, `letter-spacing` in `px`, `color-scheme`, `scrollbar-gutter`) | **the server / CLI**, as ordinary rules in `src/rules` beside the drift rules, reported through `site` like any finding | 19, 43, 46, 47, 49, 55, 58, 69, 71–74 |

A browser rule may still *use* the server: the element's reading (its classes, declarations, file and position) gives
the finding its source text and, later, its edit. A source rule may still *use* the page: it is drawn where the element
is, like every other mark. The split is about what the check **reads**, nothing else.

## The rule API

A rule is a plain object; the registry is an array. Rules never touch the DOM themselves: they read **facts** the
measuring layer hands them and return **findings**.

```js
export const concentricRadius = {
  id: 'craft/concentric-radius',   // stable; the panel groups by it; ledger entries will name it
  family: 'craft',
  number: [8, 41],                 // docs/craft/rules.md
  reads: ['rect', 'style', 'parent'],  // which facts it needs: the measuring layer collects only these
  threshold: { tolerance: 1.5, minParentRadius: 4 }, // per-rule noise control, in one place
  // Pure over facts: no DOM, no network. facts: this element's measured facts and accessors for its relatives;
  // theme: { scale(family) → [{ name, short, px }], colors() → [{ name, short, rgb }] }. Returns [] or findings.
  check(facts, theme) { … },
};
```

A **finding** carries evidence, a confidence, a one-line why, and a suggestion:

```js
{
  rule: 'craft/concentric-radius',
  key: 'craft/concentric-radius',   // one per element and rule (a part suffix when a rule can fire twice: '@tl')
  what: 'corners not concentric',   // the panel's noun for this cause
  text: 'rounded-card',             // the class that causes it (the panel's row and the mark's label); a prop name when none
  props: ['border-radius'],         // where it is drawn (geometry.js knows every property's place)
  value: '12px', n: 12,             // what is set, so labels read `r 12`
  title: '`rounded-card` is not concentric with its parent’s corner: 12px padding inside a 12px corner wants 0px, not 12px',
  because: 'A nested radius is the outer radius minus the padding; otherwise the two curves have different centres and the corner looks pinched.',
  evidence: { parentRadius: 12, inset: 4, radius: 12, wanted: 8 },
  confidence: 0.92,                 // 0–1; the engine drops anything under its floor (0.8)
  suggest: { kind: 'class', from: 'rounded-card', to: 'rounded-control', why: 'control is 8px, the concentric radius here' },
  // or { kind: 'advice', text: 'No radius token is 8px. Add one, or pad by 4px less so card stays concentric.' }
}
```

The engine turns a finding into a **mark** the overlay already knows how to draw and group, adding `ledger: 'new'`,
`glyph: 'craft'`, `choices: []`, `pick: null`, `action` (the suggestion in words) and `craft` (the evidence, confidence
and suggestion kept whole). Nothing downstream learns a new shape: the mark layer draws it from `props`, the panel groups
it by `rule|text`, the chooser shows its words.

### Suggestions: an edit or an instruction
- **`class`**: a concrete class change on this element (`rounded-card → rounded-control`). It is the shape the server's
  `set` endpoint writes (`POST set { file, hash, line, column, key: 'radius', token: 'control' }`, src/session/props.ts),
  and the shape `edits`/`apply` write when the engine knows the exact text. The foundation shows it; wiring the write is
  the next layer (below).
- **`advice`**: when no safe edit exists (the fix is a size change, a `color-mix()`, a different structure), one
  sentence that says exactly what to do, with the numbers.
A rule prefers the edit, and falls back to advice only when it cannot name one.

## The measuring layer (facts)

One pass per run, reads only, never a write between reads (memory: blueprint-performance-rules). `Facts` memoises per
pass: `rect(el)`, `style(el)`, `kids(el)` (children with a box), `text(el)` (owns a text node with letters), `parent(el)`
(the same accessors for its ancestors). Rules ask for facts through accessors, so an element measured for one rule is not
measured again for the next, and nothing is measured that no rule asked for. The theme's scales come from the overlay's
decisions, measured once with the probe the chooser already uses; colours are measured once per decisions load.
The one write the engine ever makes to the page is that probe, and it happens before any element is read.

Cost is bounded by the reader: craft runs only over elements the reader has read (CAP in view + PAGE off-screen), and
each element's findings are cached by its signature (its class attribute and its parent's), recomputed only when the
signature changes or the engine is invalidated (resize, a write, a mutation).

## Joining the blueprint

The reader hands items `{ id, el, marks, dims, file }` to the drawing and the panel. Craft joins in the reader's
hand-off: before the items go out, `enrich(items)` appends each element's craft marks to its `marks`, and an element with
no drift but a craft finding is handed on too. From there nothing is special: the mark layer cuts and outlines the
element and draws the break at `props`' place, the hint says the title and the suggestion, the panel's row reads
`rounded-card · corners not concentric · 2 places`, `Enter` opens the chooser, which shows the why and the advice.
A craft mark's `key` is stable per element and rule, so retained nodes and picks keep working. The dock's "N off in
view" counts craft marks with drift marks, so the count and the marks drawn stay equal.

Touch points in existing files, each one line or a short guarded branch, commented `craft`:
blueprint-reader.js (the `enrich` hook), blueprint.js (makes the engine, passes it to the reader, invalidates it on
resize), widget.js (hands the theme accessors to Blueprint), blueprint-panel.js (the craft noun in `whatOf`),
blueprint-marks.js (the craft hint says the suggestion), blueprint-fix.js (a craft mark opens its chooser from the mark
itself, not a server reading), glyphs.js (a `craft` glyph), src/hosts/client.ts (the two modules served).

## Severity and noise

- **Confidence floor.** Every finding carries a confidence; the engine drops anything under 0.8. A rule raises
  confidence with evidence (both insets equal, the parent's curve actually reaches the child's corner) and lowers it when
  the situation is ambiguous (unequal insets, an animation running, a disabled control).
- **Per-rule thresholds** live on the rule (`threshold`), not in the engine: concentric corners tolerate 1.5px;
  inner/outer spacing wants a real difference (> 0.5px) along the same axis; text opacity ignores disabled controls and
  animated elements; half pixels only speak for pure translations, where the author's own number put the text off the
  grid, never for the browser's own layout fractions.
- **Dedupe.** A list's rows come from one JSX line and share a stamp; they share a cause row in the panel by `rule|text`
  already. The engine also drops a finding on an element whose ancestor carries the same finding with the same text
  (one row of a nested list is enough).
- **Says nothing on a good page.** The proof is a test: a well-built page yields no craft finding.

## Headless later (design only)

The browser rules are plain modules over facts; nothing in them knows the overlay. A CLI run (`plumber craft <url>`)
would launch Chromium with Playwright, load the page with the overlay, and call `window.__plumb.craft()` which runs the
same engine over every rendered element and returns the findings as JSON (rule, file:line from the reader, evidence,
suggestion). The CI action would then report them beside drift, with the same ledger (`.plumber/ledger.jsonl`) to accept
a finding with a reason. Rules that need gestures (hover, menus) would get a `drive` phase in the same run.

## Tests

Owner's rule: no unit tests. Each rule is proved through the real boundary: a Vite dev server with the plugin on a
fixture page copied from overlay/demo with its own App, real Chromium, blueprint on, and what a person sees:
the mark (its aria-label names the rule's title) and the panel row for the element that breaks the rule, none for the
element beside it that follows it, and the suggestion's words right. One test per rule, one for noise.
e2e/craft.test.mjs.

## Layers (what is built, in order)

1. **Foundation** (this brief's result): the engine, the facts layer, the mark shape, four rules, the hand-off into the
   blueprint, the tests.
2. **Writing a `class` suggestion**: the chooser offers the suggested class as its one choice and Write sends `set`
   (file, hash, line, column from the element's reading) instead of `apply`; the pick previews with the same inline
   style the drift chooser uses.
3. **Rules wave two**: 1 content alignment, 38 hairlines, 39 image outlines, 51/53 shadows, 63 scale-from-0, 74 z-index.
4. **Source rules** on the server (19, 47, 69, 58) through the existing rule machinery.
5. **Headless run** for CI.

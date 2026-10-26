# Craft engine: foundation · result

Brief: docs/briefs/craft-engine.md. Built 2026-10-27 on main.

## What was built
- **The engine** (`overlay/src/craft.js`): `Craft` (registry, cache by element signature, `enrich(items)`), `Facts`
  (one measuring pass: rect, style, kids, text, box, ground, memoised), `Theme` (the overlay's decisions measured once
  with a probe into radius/spacing px and colour rgb; `nearest`, `floor`, `nearestColor`), `markOf` (a finding → a mark
  the overlay already draws and groups), and the helpers `rgb()` and `utility()` (the class on an element that sets a
  property, variants and side forms excluded).
- **Four rules** (`overlay/src/craft-rules.js`): `craft/concentric-radius` (#8/#41), `craft/inner-outer-spacing` (#7),
  `craft/text-opacity` (#57), `craft/half-pixel` (#37). Each a plain object over facts, with its thresholds on it.
- **Joined to the blueprint**: the reader hands every read element through `enrich` before the hand-off, so the dock's
  count, the marks and the panel all see craft marks; the panel's row says the rule's own noun; the mark's note says the
  suggestion; the chooser opens from the mark itself (no server reading) and shows why and what to do; a `craft` glyph.
- **Served**: `src/craft.js` and `src/craft-rules.js` in `overlayModules` (src/hosts/client.ts), flat under
  `overlay/src/` like the other overlay modules (the package ships `overlay/src/*.js`).

## The rule API, with a full rule

```js
export const innerOuterSpacing = {
  id: 'craft/inner-outer-spacing', family: 'craft', number: [7], reads: ['style', 'kids', 'parent'],
  threshold: { min: 0.5 },
  check({ el, facts }, theme) {
    const s = facts.style(el);
    const axis = flowAxis(s);                          // 'x' | 'y' | 'both' (grid) | null
    if (!axis) return [];
    const g = gapOf(s, axis);
    if (g <= 0 || facts.kids(el).length < 2) return [];
    const parent = el.parentElement;
    if (!parent || parent === document.body) return [];
    const ps = facts.style(parent), paxis = flowAxis(ps);
    if (!paxis) return [];
    if (paxis !== 'both' && axis !== 'both' && paxis !== axis) return []; // a row's gap is not the gap between rows
    const G = gapOf(ps, paxis);
    if (G <= 0 || facts.kids(parent).length < 2) return [];
    if (g <= G + this.threshold.min) return [];
    const cls = utility(el, 'gap', { not: /^[xy](?:-|$)/ });
    const step = theme.floor('spacing', G);           // the largest token at or under the outer gap
    const text = cls ?? 'gap';
    const suggest = step && cls
      ? { kind: 'class', from: cls, to: `gap-${step.short}`, why: `${step.short} is ${fmt(step.px)}, no wider than the ${fmt(G)} between groups` }
      : { kind: 'advice', text: step ? `Bring the gap down to ${fmt(step.px)} (gap-${step.short}) or less, under the ${fmt(G)} between groups.` : `Bring the gap under ${fmt(G)}, the space between groups, or widen that space.` };
    return [{
      key: this.id, what: 'inner gap wider than outer', text, props: ['gap'], value: `${g}px`, n: g,
      title: `\`${text}\` is wider than the space around its group: ${fmt(g)} inside, ${fmt(G)} between groups`,
      because: 'Proximity is how people read grouping: the gap inside a group must be smaller than the gap between groups, or the groups dissolve.',
      evidence: { inner: g, outer: G, axis }, confidence: 0.9, suggest,
    }];
  },
};
```

`check(facts, theme)` reads only through `facts` (never the DOM) and `theme` (`scale(family)`, `colors()`,
`nearest`, `floor`, `nearestColor`), and returns findings. The engine drops findings under confidence 0.8, caches
them per element by signature, and drops one an ancestor already carries with the same text.

## The finding shape → the mark shape
A finding: `{ key, what, text, props, value, n, title, because, evidence, confidence, suggest }` where `suggest` is
`{ kind: 'class', from, to, why }` or `{ kind: 'advice', text }`. The engine adds `rule`, `family: 'craft'`,
`glyph: 'craft'`, `ledger: 'new'`, `soft: false`, `choices: []`, `pick: null`, `action` (the suggestion in words,
shown by the chooser) and `craft: { evidence, confidence, suggest }`. Everything downstream (marks, panel, chooser,
dock count) treats it as a mark.

## Files touched
New: `overlay/src/craft.js`, `overlay/src/craft-rules.js`, `e2e/craft.test.mjs`, `docs/briefs/craft-engine.md`,
this file.
Edited, each a commented `craft` touch point: `overlay/src/blueprint-reader.js` (the `enrich` hook; counts over
enriched items), `overlay/src/blueprint.js` (makes the engine, passes `enrich`, invalidates on resize, write and theme
load; `themeChanged()`), `overlay/src/widget.js` (hands `theme.decisions()` to Blueprint; calls `themeChanged()` when
decisions arrive), `overlay/src/blueprint-panel.js` (`whatOf` uses the craft noun), `overlay/src/blueprint-marks.js`
(`hintOf` says the suggestion), `overlay/src/blueprint-fix.js` (a craft mark opens from itself), `overlay/src/glyphs.js`
(the `craft` glyph), `src/hosts/client.ts` (the two modules served). Not touched: boxmodel, scrub, changes,
editor-primitives, language, tokens.css, history, text-edit, help, the primitives demo, any UI style.

## Tests
`e2e/craft.test.mjs`, 5 tests, all through a real Vite dev server with the plugin on a fixture page (the demo's theme
with a page per rule), real Chromium: for each rule the breaking element is marked at the right place with the right
title, its panel row names the class and the noun, pointing at the row lights that element and not the one beside it
that follows the rule, and the chooser says the suggestion and the why; plus noise: a well-built page and the demo
with `?corners` yield no craft mark and no craft row. 5 pass.

Swap was at 13.3 of 14.3 GB, so the full suite was not launched in one go (owner's rule); the groups the change can
affect were run one file at a time instead, all green: isolation 9/9 (the served modules), blueprint 17/17,
blueprint-corners 8/8, overlay 2/2, dock 5/5, readiness-panel 2/2, blueprint-next-performance 1/1. The rest of the
suite (CLI, hosts, locate, packaging, …) does not load the overlay's blueprint path and was not run this time.

## Found along the way
- Tailwind v4 writes `-translate-x-1/2` as the `translate` property, not `transform`; the half-pixel rule resolves both
  (percentages against the element's own box).
- The widget's spacing ladder (`#scaleOf`) keeps only numeric spacing tokens, so the engine measures its own scales
  from the decisions (named tokens like `s3` are what the demo and most themes use).
- A craft finding whose theme had not loaded yet would cache an advice-only suggestion; the engine is invalidated when
  the decisions arrive and the reader re-reports.

## Next, in order
1. **Write a `class` suggestion**: the chooser offers the suggested class as its one choice; Write sends the server's
   `set` (file, hash, line, column from the element's reading) — the apply path already exists in src/session/props.ts.
2. **#38 hairlines** (1px lines at DPR ≥ 2: suggest 0.5px) and **#39 image outlines** (img without an inset ring, by
   edge luminance vs ground), both cheap on the facts layer.
3. **#51/#53 shadows** (single large blur; offset ÷ blur across the page's shadows) and **#20 one light source**.
4. **#1 content alignment** (first text/icon rect per child vs the column's shared edge; suggest the bleed pair).
5. **#63 scale-from-0** and **#74 z-index wars** (needs stylesheet reading for keyframes; z-index from computed style).
6. Source rules on the server (#19 quotes, #47 tracking units, #69 `100vh`, #58 `color-scheme`).
7. The headless run (`plumber craft <url>`) as designed in the brief.

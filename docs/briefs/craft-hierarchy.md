# Craft hierarchy: rules that compose instead of colliding

Status: design, 2026-10-27. Builds on docs/briefs/craft-engine.md (the engine, facts, the rule API) and its result.
Code it concerns: overlay/src/craft.js (`Craft.enrich`, `Facts`, `Theme`, `markOf`), overlay/src/craft-rules.js (32 rules),
overlay/src/model.js (server findings → marks), src/habits/index.ts (source rules), src/rules/provenance.ts (drift),
overlay/src/blueprint-panel.js (`groupsOf`), overlay/src/blueprint-fix.js (the chooser), overlay/src/blueprint-marks.js.

## The problem, and the system behind it

Rules speak one at a time about one element, and the engine keeps everything each of them says. So two rules that
look at the same thing produce two marks, two rows, and two edits that undo each other. What is in the code today:

1. `craft/button-padding` (#9) suggests `px-s4`; `craft/icon-side` (#10) suggests `pl-s3 pr-s4` on the same button.
   Both swap the same `px-s3`. Writing one makes the other's `from` false.
2. `craft/contrast` (#24), `craft/text-opacity` (#57) and `craft/disabled-contrast` (#26) all speak about the colour
   of one text. Each steps aside by hand: contrast returns `[]` when `opacity < 1` ("#57's"), text-opacity returns `[]`
   on a disabled control ("#26's territory").
3. `craft/truncate-intent` (#35) and `craft/middle-truncate` (#76): the second is a special case of the first, kept
   apart by `pathLike(words(el))` written into both.
4. `craft/input-zoom` (#70) suggests `text-base md:text-sm`. `text-base` is Tailwind's 16px, not the project's type
   token, so the type-provenance rule would mark the fix the moment it is written.
5. `craft/content-align` (#1) adds `-mx-s3` (margins the spacing drift rule judges); `craft/concentric-radius` (#8)
   wants the token nearest `R − p`, the radius drift rule wants the token nearest the current value: two tokens for one
   corner.
6. `craft/leading` (#14) says `leading-tight` while the theme has its own `--leading-*` steps; `craft/tracking` (#15,
   browser) and `habits/tracking-em` (#47, server) land on one `letter-spacing` declaration from two surfaces.
7. `craft/hit-target` (#27) grows a button's padding that `craft/button-padding` is reshaping; `craft/measure` (#13)
   sets `max-w-prose` on a paragraph whose width a layout decision may own.
8. The one dedupe there is (`rule|text` up the ancestor chain in `Craft.enrich`) knows nothing of lists, pages or
   two rules with one cause.

Every one of these is the same gap: **the engine does not know what a finding is about**. A finding has `props`
(where to draw) but no notion of the *facet* of the element it claims, no *rank* against another claim on that facet,
and no way to try its own suggestion. Without those three, the only remedy is a guard inside rule A naming rule B, and
that grows as the square of the rule count (77 rules → thousands of pairs) while staying wrong whenever a third rule
arrives. The hand guards in #2 and #3 are that pattern already. The fix is structural: give every finding a facet, a
tier and a testable suggestion, and let one arbitration stage resolve all claims on an element the same way.

## The hierarchy

Four tiers, in order. A higher tier never loses a facet to a lower one, and a lower tier's fix must pass the tiers
above it. Tier is about *how much it matters*; confidence is about *whether it is true*. They are orthogonal:
confidence is gated once at `FLOOR` (0.8), and among true findings tier orders, then confidence.

| Tier | Name | What it protects | Rules |
|---|---|---|---|
| 0 | **access** | people can use it at all: read it, hit it, not be zoomed, not be stranded by motion or focus | craft: contrast #24, disabled-contrast #26, hit-target #27, input-zoom #70. habits: hover-gate, focus-outline, reduced-motion-fade, viewport-dynamic, safe-area-fallback, logical-inline |
| 1 | **legibility** | the words read comfortably and completely | craft: measure #13, leading #14, tracking #15, tabular-nums #16, heading-widow #18, truncate-intent #35, middle-truncate #76, scrollbar-gutter #36, anchor-offset #73, bold-hover #42. habits: font-metrics, real-quotes, transition-named, no-ease-in, composited-motion |
| 2 | **theme** | the owner's recorded decisions: values on the scale, through the right tier of token | every provenance/drift rule (`spacing/*`, `radius/*`, `color/*`, `type/*`, `elevation/*`, `z/*`, `motion/*`), plus habits that are theme-shaped: tracking-em #47 (the unit), color-scheme #58, overscroll-contain, overflow-clip |
| 3 | **craft** | relations between neighbours that make a correct, on-scale page feel made | concentric-radius #8, inner-outer-spacing #7, button-padding #9, icon-side #10, content-align #1, text-opacity #57, half-pixel #37, hairline #38, image-outline #39, layered-shadow #51, one-light #20, border-on-shadow #23, scale-from-zero #63, z-index-war #74, media-size #34, hanging-quote #45, caps-case #46, gradient-space #55 |

Why the theme sits above craft, and below access and legibility:

- **The theme is the owner's decision, craft is the mentor's heuristic.** Drift reports a fact ("12px is not a token
  of yours"); craft reports a judgement with a confidence. When they disagree about a value, the recorded decision
  wins the *set of allowed answers*, and craft picks *within* that set. Concentric corners (#5 above) is the clean
  example: drift's choices are the radius tokens; craft chooses `rounded-control` among them because it is the
  concentric one. The theme decides the step, craft decides the direction.
- **Access and legibility sit above the theme because a scale is in service of people, not the reverse.** If no type
  token is 16px or larger, input-zoom still stands (the page zooms on every phone); what changes is the *suggestion*:
  the smallest token at or above 16px, or, if there is none, advice to add one. A tier-0 finding is never silenced by
  the theme; its fix is shaped by it.
- The same principle gives one sentence for every pair in the list: **the highest tier on a facet decides that it
  changes and in which direction; the theme decides which step; the lower tiers refine within what is left.**

## Rule metadata

Five fields on a rule (browser) or in a table (server rules, until they carry the fields themselves). Rules never name
each other except through `refines`, which only ever points *up* the generality ladder (the special case names the
general one, never the reverse).

```js
export const iconSide = {
  id: 'craft/icon-side', family: 'craft', number: [10],
  tier: 3,                              // 0 access · 1 legibility · 2 theme · 3 craft
  owns: ['padding-x'],                  // the facets this finding claims on the element (see the vocabulary)
  once: 'element',                      // 'element' | 'ancestor' | 'group' | 'page' — how many places share one finding
  refines: [],                          // rules this one is a special case of: when it fires, they fold under it
  after: ['craft/button-padding'],      // rules whose suggestion changes this rule's input: re-run me on their result
  reads, threshold, check(...) { … },   // as today
};
```

- **`owns`** names *facets*, not CSS properties. A facet is the thing a person would say is being changed:
  `padding-x` covers `padding-left`, `padding-right`, `padding-inline`, and the utilities `px-*`, `pl-*`, `pr-*`,
  `p-*`. Two findings on one element conflict exactly when their `owns` intersect. `props` stays for drawing.
- **`refines`** replaces hand guards. `middle-truncate.refines = ['craft/truncate-intent']`; `disabled-contrast.refines
  = ['craft/contrast', 'craft/text-opacity']`. When the special case fires on an element, the general ones on the same
  facet fold under it, and their own `check` no longer needs to know (`pathLike` leaves truncate-intent; the opacity and
  disabled guards leave contrast and text-opacity).
- **`after`** declares a dependency of input, not of importance: icon-side's answer depends on the padding
  button-padding will set. The arbitration re-runs `after` rules on virtual facts (below) so their suggestion is
  computed from the page as it will be, not as it is.
- **`once`** generalises the ancestor dedupe: `ancestor` is today's behaviour (one row of a nested list); `group` is
  one finding per group the rule names in `evidence.group` (media-size: the list; one-light: the page's shadows);
  `page` is one per page (the server's font-metrics and color-scheme already behave so).
- **Confidence** stays on the finding. Combination: sort by `(tier asc, confidence desc)`; a 0.82 access finding
  outranks a 0.92 craft finding, because being less sure that people cannot read it still matters more than being
  very sure the corner is not concentric.

Server findings get the same fields from one table in the overlay (`TIERS` keyed by rule prefix and habit id) until
`src/habits/index.ts` and `src/rules/provenance.ts` write `tier`/`owns` into `Finding` themselves (that is a later
layer; the overlay never waits for the server to be right).

### The facet vocabulary (the primitive)

One small module, `overlay/src/craft-facets.js`, that both the rules and the arbitration import. It is the first
thing to build and review, because every later layer stands on it:

```
facet            props                                                    utilities (base, variants stripped)
padding-x        padding-left, padding-right, padding-inline              p, px, pl, pr, ps, pe
padding-y        padding-top, padding-bottom, padding-block                p, py, pt, pb
margin-x         margin-left, margin-right, margin-inline                  m, mx, ml, mr, ms, me
margin-y         …                                                         m, my, mt, mb
gap              gap, row-gap, column-gap                                  gap, gap-x, gap-y
radius           border-*-radius                                           rounded, rounded-*
size             width, height, min-/max-width, min-/max-height             w, h, size, min-w, max-w, …
color            color, opacity (as it affects text)                       text-<colour>, opacity
background       background-color, background-image                        bg
border           border-*-color, border-*-width, outline                   border, outline, ring
shadow           box-shadow                                                shadow
font-size        font-size                                                 text-<size>
line-height      line-height                                               leading
letter-spacing   letter-spacing                                            tracking
font-features    font-variant-numeric, font-feature-settings                tabular-nums, [font-feature-settings:…]
text-flow        text-overflow, text-wrap, text-indent, white-space         truncate, text-balance, text-pretty
transform        transform, translate, scale, rotate, animation             translate, scale, rotate, animate
stacking         z-index, isolation                                        z, isolate
scroll           overflow, scrollbar-gutter, scroll-margin, overscroll      overflow, scroll-mt, overscroll
```

`facetOf(prop)` and `facetOfClass(cls)` are the two functions. `color` deliberately includes `opacity`: that is the
whole of case #2, named once instead of guarded thrice.

## Suggestion composition

A finding's `suggest` stays `{ kind: 'class', from, to, why }` or `{ kind: 'advice', text }`. The arbitration adds one
ability the engine lacks: **trying a suggestion**. Rules are pure over `facts`, so a suggestion can be tried by running
rules over facts that answer as if the classes were applied.

- **Virtual facts.** `facts.with(el, overrides)` returns a `Facts` view whose `style(el)` and `box(el)` answer with the
  overrides for that element and fall through to the real pass for everything else. No write to the page.
- **A class in px.** `theme.styleOf('px-s4 text-base')` → `{ paddingLeft: 16, paddingRight: 16, fontSize: 16 }`.
  Two sources, in order: the theme probe `Theme` already owns (set the class on the probe and read computed style; works
  when Tailwind generated that class for this project), then the scale tables (`px-s4` → spacing step `s4`; `text-base`
  → Tailwind's default when the project allows framework steps). A class neither can read is **untriable**, and an
  untriable suggestion is offered as advice, never as an edit.

With that, composition on one element and one facet is three steps:

1. **Fold.** Apply `refines`: a firing special case folds its generals (they are kept on the mark as `also`, for the
   chooser's words, and nothing else). Then sort what remains by `(tier, confidence)`; the first is the **kept**
   finding, the rest fold under it as `also`.
2. **Compose the edit.** Collect the class suggestions of the kept finding and of the folded ones in rank order.
   - *Disjoint classes* (different `from`, different facets touched by the same mark, e.g. content-align's `-mx-s3`
     added beside an existing `px-s3`): merge into one `to`.
   - *Same `from`* (button-padding and icon-side both on `px-s3`): the kept one's `to` stands; each folded rule with
     `after` naming the kept rule is **re-run on virtual facts** of the kept suggestion. Its new answer, if any, replaces
     the kept `to` when it still satisfies the kept rule (checked by re-running the kept rule on it). For #1: kept is
     button-padding → `px-s4`; icon-side re-runs on padding 16/16 → `pl-s3 pr-s4`; button-padding on 12/16 is quiet
     (its guard `|pl − pr| > 0.5` returns `[]`, and that guard is right: the shape is now a decision). One edit:
     `px-s3 → pl-s3 pr-s4`. Its `why` joins both reasons.
   - *A lower tier within the higher's choices* (concentric vs radius drift): drift's `choices` are the allowed set;
     if a folded craft `to` is in that set, it becomes the kept mark's `pick` and carries craft's `why`. The theme
     decided the set, craft chose within it.
3. **Fix-of-fix.** The composed `to` is tried before it is offered, against the two things that would flag it:
   - *the theme*: every token in `to` must be on `theme.scale` for its facet, or a step the project's provenance policy
     allows (the overlay has the decisions; the identity rule per family lives in provenance.ts and is mirrored for this
     check). Off-scale → rewrite to the nearest allowed step *in the kept rule's direction* (input-zoom needs ≥ 16px:
     `ceil`; inner-outer needs ≤ the outer gap: `floor`; concentric wants nearest), and re-check the kept rule on the
     rewritten value. No step passes → advice with the number ("No type token is 16px or more. Add one; 16px is the
     floor under which iOS zooms").
   - *higher tiers*: run every rule with `tier ≤ kept.tier` over virtual facts of the rewritten `to`. One fires → the
     edit is demoted to advice that says why ("`text-sm` would drop the words under Lc 60"). Nothing is ever offered
     that the next pass would mark.

Case by case, this is what the owner sees:

| case | kept | folded | edit offered |
|---|---|---|---|
| 1 button-padding + icon-side | button-padding (3, .86) | icon-side, re-run after | `px-s3 → pl-s3 pr-s4` |
| 2 contrast + text-opacity (+ disabled) | disabled-contrast refines both when disabled; else contrast (0) | text-opacity | text-opacity's token `text-<muted>` if, tried, it reaches Lc 60; else contrast's advice, with opacity named in the chooser |
| 3 truncate-intent + middle-truncate | middle-truncate (refines) | truncate-intent | middle-truncate's advice |
| 4 input-zoom off the type scale | input-zoom (0) | type drift would have fired on the fix | smallest type token ≥ 16px, `md:` keeping the current one; none → advice |
| 5 content-align's `-mx-s3`; concentric vs radius drift | content-align's token is on scale (it already uses `theme.nearest`), tried, passes; radius: drift (2) | concentric (3) | `rounded-control`, picked among drift's choices, with concentric's why |
| 6 leading vs `--leading-*`; tracking vs tracking-em | leading (1), to rewritten onto the theme's leading steps ≤ 1.25; letter-spacing: tracking (1) over tracking-em (2) | the server habit | one edit `tracking-[2px] → tracking-wider`: em, on scale, the right amount |
| 7 hit-target + button-padding; measure vs width | hit-target (0); button-padding re-runs after. measure (1) stands; `max-w-prose` is tried against the spacing/size policy | | one padding edit that reaches 24px and keeps 2:1 |

## One cause, one finding across surfaces

A server finding reaches the overlay as marks on `item.marks` (`model.js reading()`) before `enrich` runs; a craft
finding is appended by `enrich`. Today they never meet. In the arbitration they are the same thing: a mark with
`tier`, `owns`, `once`, `confidence` (server marks: 1), `suggest` (server marks: `{ kind: 'advice', text: action }`,
or `{ kind: 'class', from: text, to }` when the habit's `edits[].text` names classes, as hover-gate's and tracking-em's
can), and `site` (line, column, hash: what the server knows and the browser does not). The kept mark takes the
`site` from whichever member has one, so a composed edit on a server+browser pair writes through `swap` at the
authored class exactly as a pure craft edit does.

`model.js` already arbitrates by accident: "one mark per authored site even when several rules speak about it", first
in server order wins. That line is replaced by the same ranking, so the server side and the browser side resolve by
one law.

## Dedupe generalised

`once` on the rule, applied after folding, before drawing:

- `element`: nothing to do.
- `ancestor` (today's rule, moved from the engine to metadata): drop a mark whose ancestor carries a kept mark with the
  same `rule|text`.
- `group`: the finding names its group element in `evidence.group` (media-size: the list; inner-outer-spacing: the
  parent). One kept mark per `rule|group`, drawn on the first member, the others listed as places (the panel's
  `members`, exactly as a cause's places are today).
- `page`: one kept mark per rule on the page (one-light, when it becomes a page-wide "two lights" finding; the
  server's font-metrics and color-scheme already arrive that way).

The panel's `groupsOf` keeps grouping by `rule|text`; since a facet now has one kept mark, a cause row never doubles.

## Where it lives

```js
// craft.js
enrich(items) {
  theme.colors();
  const facts = new Facts();
  const found = items.map(item => ({ ...item, marks: [...item.marks, ...this.#marksFor(item.el, facts)] })); // as today
  return arbitrate(found, { facts, theme, rules: this.#rules });                                               // new
}
```

`arbitrate(items, { facts, theme, rules })` lives in a new `overlay/src/craft-arbitrate.js` and is pure over marks and
facts; it does, in order: annotate (tier, facets, once for every mark, server ones from `TIERS`), fold (refines, rank),
compose (merge, `after` re-runs on `facts.with`), fix-of-fix (theme, higher tiers), dedupe (`once`), and returns items
whose marks are the kept ones. A kept mark gains:

```js
{
  …mark,                                // the kept finding's own fields: rule, text, props, title, because, glyph
  facet: 'padding-x',
  tier: 3,
  also: [{ rule: 'craft/icon-side', what: 'icon side padded like the text side', title, because }],
  craft: { …, suggest: { kind: 'class', from: 'px-s3', to: 'pl-s3 pr-s4', why: '…; …' , composed: ['craft/icon-side'] },
           tried: { theme: 'on scale', above: 'clear' } | { theme: 'off: text-base', rewritten: 'text-md' } | { above: 'craft/contrast' } },
}
```

Nothing downstream learns a new shape: the mark layer draws one break at `props`; `markOf` is unchanged; the chooser
reads `craft.suggest` as it does. The cache in `#marksFor` stays per element; arbitration runs over the enriched set
each pass (it is a sort and a few re-runs over memoised facts, so it is bounded by the number of conflicting elements,
not by the page), and `performance.measure('plumb:craft')` keeps covering it.

### What the person sees (visual, not labels)

- **At rest:** one mark on the element, drawn at the kept finding's `props`, in the kept finding's ink (an access
  finding is never softened to craft's). No badge, no count, no second glyph.
- **Pointed at:** the hint says the kept title and the one composed edit (`px-s3 → pl-s3 pr-s4`), as `hintOf` does.
- **Opened:** the chooser's title is the kept finding's; its one choice is the composed edit; under `because`, one
  quiet line per folded finding in the same type as `because` ("also: the icon side is padded like the text side"),
  and, when the edit was rewritten or demoted, one line saying what was tried ("`text-base` is not on your type scale;
  `text-md` is the step at or above 16px"). Words appear only in the card, where the person has asked for them.
- **Panel:** one cause row (the kept `rule|text`); the folded causes make no row. The dock's count equals the marks.

## Proof: through the real boundary only

Owner's rule: no unit tests. Everything is proved as the craft rules are now (e2e/craft.test.mjs: a Vite dev server
with the plugin on a fixture copied from overlay/demo, real Chromium, blueprint on): the marks drawn (`craftMarks`),
the panel's rows (`craftRows`), the chooser's words, and the source after Write. One fixture page per conflict, with
the conflicting pair on one element and the expected single outcome, plus a control element beside it.

`e2e/craft-hierarchy.test.mjs`, one test per row:

| fixture | elements | expected |
|---|---|---|
| padding pair | `<button class="px-s3 py-s3"><svg/>Save</button>`; beside it a correct `pl-s3 pr-s4 py-s3` button | one craft mark on the first, none on the second; one row; the chooser offers `pl-s3 pr-s4`; Write → the source line reads `pl-s3 pr-s4 py-s3`; after reload no craft mark on it |
| colour trio | faded text on a tinted ground (`text-ink opacity-60`) that fails Lc 60; the same disabled | one mark each, rule `craft/contrast` on the first, `craft/disabled-contrast` on the second; the first chooser's `also` names opacity; the offered token, written, leaves no contrast mark |
| truncation pair | a truncated path and a truncated sentence | one mark each: middle-truncate on the path, truncate-intent on the sentence; no element has two |
| fix that would drift | an input `text-sm` in a theme whose type scale has `md` 17px and no 16px | input-zoom's edit is `text-md md:text-sm`; Write → the element has no drift mark and no craft mark |
| fix that no token allows | the same input in a theme whose largest type step is 15px | the chooser shows advice naming 16px; no edit is offered |
| theme decides the set | a 12px child in 4px padding of a 12px corner, `rounded-[12px]` (off scale) | one mark; rule is the radius drift; its pick is `rounded-control` with the concentric why; Write → one class change |
| two surfaces, one cause | `tracking-[2px] uppercase text-xs` label | one mark on letter-spacing; the chooser offers `tracking-wider`; the panel has one row, not a habit row and a craft row |
| access over polish | a 20px-tall `px-s2 py-0.5` text button | one mark, rule hit-target; its edit grows the padding to reach 24px and the result is quiet for button-padding on reload |
| once: group and ancestor | a list of five avatars with one `size-9` among `size-8`; a nested list each level breaking inner-outer | one media-size row with five places; one inner-outer row |
| noise | the well-built page from craft.test.mjs, and the demo | no craft mark, no change from today's counts |

Each test also asserts the thing the framework promises: **after Write and reload, the element the edit touched
carries no new mark of any family**. That one assertion is the fix-of-fix rule stated as behaviour.

## Layers, in order (one agent each, verified before the next)

1. **Facets and tiers (the primitive).** `overlay/src/craft-facets.js`: the facet table, `facetOf(prop)`,
   `facetOfClass(cls)`, `TIERS` for server rules; `tier`, `owns`, `once`, `refines` on all 32 rules (no `after` yet).
   `arbitrate()` does only *annotate + fold*: one kept mark per element and facet by `(refines, tier, confidence)`,
   folded ones as `also`. The hand guards leave contrast, text-opacity and truncate-intent. Proof: the colour trio and
   the truncation pair fixtures, the chooser's `also` lines, and craft.test.mjs unchanged.
2. **Virtual facts and composition.** `Facts.with(el, overrides)`, `Theme.styleOf(classes)`, `after` on icon-side
   (and later rules), merge of disjoint `to`s, re-run of `after` rules on the kept suggestion. Proof: the padding pair
   and access-over-polish fixtures, including Write.
3. **Fix-of-fix.** On-scale check and directional rewrite against the theme; higher-tier re-run; demotion to advice
   with the reason; the `tried` line in the chooser. Proof: fix-that-would-drift, fix-that-no-token-allows, the
   theme-decides-the-set fixture, and the "no new mark after Write" assertion added to every hierarchy test.
4. **Two surfaces.** Server marks annotated and ranked in the same `arbitrate`; `model.js` first-wins replaced; a
   habit's class edit surfaced as `suggest.kind: 'class'` where the fix text names classes; `site` carried onto the
   kept mark. Proof: the two-surfaces fixture, through `swap`.
5. **`once` generalised.** `group` and `page` scopes, `evidence.group` on media-size and inner-outer-spacing, the
   ancestor rule moved from the engine into metadata. Proof: the once fixture and the noise fixture.
6. **The server writes its own tiers.** `tier`/`owns` on `Finding` in src/habits and src/rules, `TIERS` in the overlay
   shrinks to a fallback. Proof: the CLI report orders findings by tier; the overlay's behaviour unchanged.

## In short

**Hierarchy:** access (0) > legibility (1) > theme (2) > craft (3). The highest tier on a facet decides *that* it
changes and in which direction; the theme decides *which step*; lower tiers refine within what is left. Confidence
gates truth once (0.8); tier orders importance.

**Metadata:** `tier`, `owns` (facets, from one shared vocabulary), `once` (element · ancestor · group · page),
`refines` (special case names its general), `after` (whose result I should be re-run on). Rules never name a peer
otherwise.

**Mechanism:** one `arbitrate` stage after the rules: fold → compose (virtual facts, `after` re-runs, choose within the
theme's set) → fix-of-fix (on scale, in direction, no higher tier fires) → dedupe by `once`. One mark per element and
facet, folded causes as words in the chooser only.

**First layer:** `craft-facets.js` (the facet table and tiers) plus annotate-and-fold in `arbitrate`, proved by the
colour trio and truncation pair fixtures, with the three hand guards removed.

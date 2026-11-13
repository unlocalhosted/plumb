# Rule packs: a new kind of rule without touching the engine

Status: design, 2026-11-13, decided by Claude on the owner's direction ("lets work on extendability / architecture
and bring other kind of rules into the app"). It is the concrete form of F6 in
[engine-foundations.md](engine-foundations.md) (signed off), built ahead of that document's layers 3 and 4: see
"Order" below for why.

## 1. What is in the way today

Plumber has three rule systems, each closed:

| System | Where it runs | What it reads | How a rule is known |
|---|---|---|---|
| Drift (`src/rules/*.ts`) | server | source and the theme | called by name from the analysis |
| Habits (`src/habits/`) | server | source | a list in `craft-spec.js` (`HABITS`) |
| Craft (`overlay/src/craft-rules.js`, `craft-headless.js`) | the page | measured facts | one array, `RULES` |

A page rule is spread over four places that all assume its id starts with `craft/`:

1. its object, in `RULES`;
2. its words, in `words.js` (`CRAFT[short]`, found by stripping `craft/`);
3. its numbers and principle, in `craft-spec.js` (`STANDARD[principle][short]`, id rebuilt by `ruleId(short)` as
   `craft/<short>` or `habits/<short>`);
4. its grounding, in `laws.js` (`RULE_LAWS[id]`).

So an accessibility rule, a performance rule or Chrome's platform guidance would each have to be written into the
craft files, and be on or off with craft. Nothing says which rules belong together or what grounds them.

## 2. The decision

**A pack is the unit of a kind of rule.** It carries everything about its rules in one place, and the engine knows
packs, not rules.

```js
definePack({
  id: 'a11y',                       // rule ids are 'a11y/<name>'; the config key and the CLI name
  title: 'Accessibility',           // what a person reads
  ground: 'WCAG 2.2',               // where every rule's principle comes from (docs/PRINCIPLES.md, step 3)
  runs: 'page',                     // 'page' now; 'source' (server) for security, vulnerabilities, Chrome's scan
  on: true,                         // on unless the config turns it off
  rules: [controlName, …],          // the same rule object craft uses: check({ el, facts }, theme)
  words: { 'control-name': (n) => ({ label, line, reason }) },
  spec: { access: { 'control-name': { …numbers } } },   // principle → short name → numbers, as STANDARD has them
  laws: { 'control-name': ['wcag-4.1.2'] },
});
```

- **Ids are `<pack>/<name>`.** Craft keeps `craft/` and habits keep `habits/`, so nothing written today changes.
- **One registry** (`overlay/src/packs.js`): the engine's default rules are the rules of the packs that are on. The
  spec, the words and the laws read packs for any id that is not craft's.
- **The config turns a pack on or off:** `craft.packs: { a11y: false }`. A rule inside it is still turned on or off
  by its own id, as today.
- **A pack's finding is drawn as craft's are.** On the page every judged finding becomes a mark with
  `family: 'craft'`, which the overlay uses to mean "judged on the page" in about fifteen places. That stays; the
  mark gains `pack: '<id>'`. Teaching the overlay to show packs apart (a mode switch, a glyph per pack) is a design
  step with its own sign-off, not part of this layer.
- **One verdict per element** still holds across packs: `owns` is compared across all rules that are on, whatever
  their pack.

What a pack is not, yet: loaded on demand, budgeted, or run in a worker. Those need the snapshot and the worker
(foundations layers 3 and 4). The manifest leaves room for them (`runs`, and later `budget`).

## 3. Where the rules come from

The owner, 2026-11-13: rules come from Chrome's Modern Web Guidance
([GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src)). A pack's rule is
one piece of a guide's advice made into something plumber can see on the page. It names the guide, the section and,
where the guide gives one, the WCAG criterion. Nothing of the guide's text is copied; an agent retrieves it.

What the published package holds (modern-web-guidance 1.0.0, read file by file on 2026-11-13, nothing run):

- **208 guides in 17 categories.** UI ones: ui-behaviors 40, visual-design 22, ui-components 22, forms 19, css 18,
  ui-atoms 13, html 8, accessibility 4, user-experience 3. Others: performance 26, security 17, js 5, built-in-ai 5,
  webmcp 3, pwa 2, privacy 1, wasm 1.
- **The index** (`gen/guides.json`) has id, description, category, features used and size. It does **not** carry the
  triage (how detectable, how big a change) or the false-hit rubric as data; the platform design assumed it might.
- **The scanner** (`legacy-scan.mjs`, 5 MB bundled, with ts-morph) covers 33 guides, with 36 keep/drop rubrics.
  Running it was blocked in this session as downloaded code; it needs the owner's permission.
- **The accessibility guide** is 107 dos and don'ts, most tied to a WCAG criterion: 1.3.1 (17), 4.1.2 (13), 1.1.1
  (8), 2.4.3 (6), 2.4.2 (5), 3.3.2 (3), the rest one to three each. These are the accessibility pack's backlog.

So the scanner reaches 33 guides at most; the other 175 are advice only an agent reads today. Plumber's page rules
are how that advice gets checked.

## 4. The first new pack: accessibility

Its rules come from the guide `accessibility` (section by section) and name the WCAG criterion beside it.

What plumber already says that is about access stays where it is (contrast, hit-target, input-zoom and
disabled-contrast in craft; focus-outline and hover-gate as habits; an unlabelled icon in the icon pass). The pack
starts with what none of them say:

| Rule | What the page shows | Ground |
|---|---|---|
| `a11y/control-name` | a button, link or form control with no accessible name, or one named only by its `title` or `placeholder` (the guide: "Don't use `title`" or "`placeholder` as a naming mechanism") | accessibility §3 Accessible Names; WCAG 4.1.2, 3.3.2 |

**Seen on real apps (2026-11-13).** crafting-ui: 56 controls, all named (43 by their words, 13 by `aria-label`),
nothing said. glyphschool: 23 controls, nothing said. The glyphwrite workbench: 5 range sliders found with no name.
Each sits in a `<label>` with its value in an `<output>`, and a label names the first labelable element inside it,
which is the `<output>`. Chrome's own accessibility tree agrees: role slider, name empty. A reading of the source
would call these labelled.

Not said when: the control is hidden from assistive tech (`aria-hidden`, `inert`), not drawn, or disabled. The icon
clean-up pass also lists an unlabelled icon; that is a pass a person runs, not a finding, so both may say it.

Next candidates from the same guide, one at a time, each seen on a real app before the next: image with no `alt`
(1.1.1), an `aria-label` on an element that cannot be named (1.3.1), heading levels skipped (1.3.1), focus indicator
removed with nothing in its place (2.4.7, on the page rather than in source), the same name on controls that do
different things (4.1.2).

## 5. Order, and why not the signed-off one

The foundations put packs at layer 5, after the snapshot (3) and pure rules in a worker (4), so that a new page pack
never makes the app slower. Building the manifest now, for page rules that run as craft does today, costs that
guarantee nothing: an accessibility rule asked only of controls is no dearer than hit-target, which already runs. What
it buys is a seam tested by a real second family now rather than months from now. When the snapshot and worker land,
packs move into the worker together; their manifest does not change.

| # | Layer | What can be seen |
|---|---|---|
| 1 | The registry; craft registered as a pack; `a11y` with `control-name` | an unnamed button on crafting-ui marked by plumber with its WCAG ground; the same pass with `a11y` off says nothing |
| 2 | `plumber craft` lists findings by pack, and `--pack a11y` runs one | the CLI output on crafting-ui, grouped |
| 3 | The overlay shows packs apart | a design step first, with sign-off |
| 4 | Source packs on the server (habits registered as one; then security) | a source rule in its own pack |
| 5 | Chrome's platform guidance as a pack (its own design, waiting for sign-off) | |

## 6. Not known

- Whether `control-name` is quiet enough on real apps. Component libraries often name controls through
  `aria-labelledby` pointing at an element rendered later, or through a visually hidden span; both are handled, but
  only a real app shows what else there is.
- Whether the CLI's headless run sees the same names as the overlay (a name set by script after load).

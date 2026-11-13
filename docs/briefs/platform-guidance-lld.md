# Platform guidance in plumber: "the browser does this now"

Status: design, 2026-11-13. Nothing is built. Waiting for the owner's sign-off before any code.
Source read: [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src) at `main`
on 2026-11-13 (Apache-2.0, last pushed the same day). Read first-hand: the README, `guides/README.md`,
`guides/CONTRIBUTING.md` (parts), `src/analyzing/README.md`, `src/analyzing/schema.ts`, one analyzer rule, one guide
with its `expectations.md`, `src/core/baseline.ts` (head), `src/rag/README.md` (head), the file tree.
**Not read:** the published npm package `modern-web-guidance` (what it ships and exports). Layer 0 reads it; three
choices below depend on it and say so.

## 1. What we are doing, in one paragraph

Plumber gets a third way of looking, beside drift ("off your scale") and craft ("on the scale and still wrong here"):
**platform** ("this works, but you built by hand what the browser now gives you"). A hand-positioned tooltip, a modal
made of divs, a `max-height` trick to animate an accordion, a script that grows a textarea. The Chrome repo holds the
knowledge of *what the modern answer is* and *whether browsers have it*. Plumber holds what that repo cannot have:
the running page, the element, its role, its recorded behaviour, and the project's own system. We join the two. We do
not copy their guides, their search, or their test rig.

## 2. What is in their repo

| Piece | What it is | Size (counted from the file tree) |
|---|---|---|
| Guides | One folder per use case: `guide.md` (front matter: `name`, `description`, `web-feature-ids`), `demo.html`, often `negative-demo.html`, `expectations.md` (testable bullet list), `grader.ts` (Playwright) | 16 categories; about 170 guides in the 8 UI categories (css, visual-design, ui-atoms, ui-components, ui-behaviors, forms, accessibility, user-experience) |
| Legacy scan | A static scanner over source files: CSS, DOM/JSX, JS (ts-morph), `package.json`. Each rule has a cheap token pre-filter, a matcher, and a **rubric** (`keepWhen` / `dropWhen`) that an LLM or the coding agent uses to throw out false hits. Output: human text or `--json` with `guideId`, `file`, `line`, `message`, rubric | 37 rules |
| Guide triage | Every guide classified on two axes. **Detection:** `direct-token`, `structural-ast`, `needs-verifier`, `no-legacy-pattern`. **Update scope:** `local-swap`, `cross-layer-refactor`, `widget-recipe` | in `schema.ts` |
| Baseline | `web-features` + MDN browser-compat-data → each feature is Widely available, Newly available or Limited. Guides target Widely; anything newer must carry a fallback. Features in one engine only are gated for 3 months | `src/core/baseline.ts`, `features/` |
| Search and retrieve | `npx modern-web-guidance search "…"` / `retrieve <id>`: a local hybrid search that prints a guide into an agent's context | `src/rag` |
| Eval rig | Tasks, graders, agent patches, a dashboard; they prune guide text a model already knows | `src/harness`, `src/grading`, `src/dashboard` |

Their README states the stewards: the Chrome, Edge, Firefox and MDN teams. That is the ground a platform suggestion
stands on (PRINCIPLES.md, step 3).

## 3. What we take, what we leave

**Take, as data and as a called tool:**

1. **The Baseline gate.** The most valuable single piece, and it improves plumber *today*: existing craft suggestions
   already lean on modern CSS (`text-wrap: balance`, `oklch` gradients, `scrollbar-gutter`, `0.5px` hairlines) and
   never ask whether the project's browsers have it.
2. **The guide index** (id, description, feature ids, triage, rubric), as the *ground* and the *how* of a platform
   finding. The guide body is never stored in plumber; a finding carries the guide's id and the agent retrieves it.
3. **The legacy scan's findings**, by calling their scanner, not by porting its 37 matchers.
4. **The rubric**, turned from a question an LLM answers by reading code into **signals plumber reads on the page**.
   This is where plumber is better than their pipeline: "the input is disabled or hidden" is a guess from source and
   a fact on the page.

**Take, as method (no code, one line each, into the backlog):**

- The two-axis triage is a good way to sort *our* craft rules: can it be seen, and how big is the change.
- A rule is written against one set of repos and scored on another it has never seen. Our checks are proven mostly
  on pages we wrote (a known gap in the backlog).
- Every guide has a `negative-demo.html`. Same idea as our Broken/Fixed switch; confirms it.

**Leave:**

- Their search (plumber already knows the element and its role; it does not need to search).
- Their eval rig, graders, dashboard, skills installer.
- The non-UI categories: performance, security, pwa, wasm, privacy, built-in-ai, webmcp, js. Plumber is about what a
  person sees and touches. One line in the backlog; revisit only if asked.
- Guide text, demos. Nothing of theirs is copied into the repo except the small index (attributed in
  `THIRD_PARTY_NOTICES`, Apache-2.0).

## 4. How it fits what plumber is

The chain from PRINCIPLES.md, for the whole family:

1. **Way of seeing.** A senior looks at a hand-built popover and says: "delete this, the browser does it."
2. **Principle.** Behaviour you own drifts: focus, Escape, stacking, screen readers each get re-solved and each get
   it slightly wrong. Behaviour the platform owns cannot drift. Less owned code, fewer ways to be off.
3. **Ground.** The guide, stewarded by the browser vendors; Baseline for whether it is safe.
4. **Signals.** Source shape (their scan) + role + rendered style + recorded gesture + the project's browser targets.
5. **Suggestion.** In the project's own system: its component, its class, its token.
6. **Proof.** Seen on a real app (crafting-ui, algorecall), before and after.

Platform checks are **not** craft rules: no number in `docs/craft/rules.md`, no showcase screen (same standing as the
defensive checks). They are their own family, `platform/*`, default tier `advisory`, raised to `access` where the
hand-built version breaks keyboard or screen-reader use (a div modal with no focus trap).

Not a linter: a static hit alone is never said. A platform finding is spoken only when the page agrees with it.

## 5. Architecture

```
                    build time                              run time
  modern-web-guidance (pinned) ──► platform-guides.json ─┐
  web-features (pinned)        ──► platform-features.json┤
                                                         ▼
  source files ──► [A] source scan (their CLI, --json) ──► candidates {guide, file, line, rubric}
                                                         │
                         server source index (stamping) ─┤ [B] join: candidate → element(s) on the page
                                                         ▼
  rendered page ──► facts, roles, probes ──► [C] page rules  platform/*
                                              · confirmers: candidate + page signals → keep or drop
                                              · seers: no candidate; found from behaviour alone
                                                         │
                         project targets ──► [D] Baseline gate: use · use with fallback · hold
                                                         ▼
                                   [E] one verdict per element (owns / refines / supersedes)
                                                         ▼
                 [F] suggestion: class or declaration (plumber writes) · guide (agent does, plumber proves)
```

### [D] Baseline gate — `src/platform/features.ts`, `overlay/src/platform-features.js` (generated)

Built first because everything else, and today's craft rules, stand on it.

- **Data.** A script (`scripts/platform-sync.mjs`) reads the pinned `web-features` package and writes only the
  features plumber names: `{ id: { level: 'widely' | 'newly' | 'limited', since, support: { chrome, edge, firefox, safari, … } } }`.
  Generated file, committed, a few KB. No runtime dependency, works in the overlay and the CLI.
- **Targets.** The project's `browserslist` when it has one; otherwise "Baseline Widely available". Override in
  config: `platform.target: 'widely' | 'newly' | 'limited' | <browserslist query>`.
- **API.**
  ```ts
  featureStatus(id): { level, since } | null
  gate(ids: string[], targets): 'use' | 'fallback' | 'hold'   // the weakest feature decides
  ```
  `use`: say it. `fallback`: say it with the fallback the guide names (usually "old browsers keep the plain
  version"). `hold`: say nothing on the page; listed once on the project page as "available when you drop <browser>".
- **Existing rules.** A craft or defensive rule that suggests a modern feature declares it:
  `features: ['text-wrap-balance']` beside `owns` and `reads`. The engine runs the gate before a suggestion is
  offered. A rule with no `features` is untouched. First pass: tag the rules that need it (heading-widow,
  gradient-space, scrollbar-gutter, hairline, caps-case, hanging-quote, text-wrap-role; the full list is made by
  reading each rule's suggestion, not from memory).

### Guide index — `src/platform/guides.ts`, `platform-guides.json` (generated)

```ts
interface PlatformGuide {
  id: string; category: string; description: string;
  features: string[];                       // web-feature-ids from the guide's front matter
  detection: 'direct-token' | 'structural-ast' | 'needs-verifier' | 'no-legacy-pattern';
  scope: 'local-swap' | 'cross-layer-refactor' | 'widget-recipe' | 'n/a';
  rubric?: { keepWhen: string[]; dropWhen: string[] };
  version: string;                          // the pinned package version it was read from
}
```

Only the 8 UI categories. *Depends on layer 0:* if the published package does not carry triage and rubric as data,
the rubric arrives with each scan finding instead (their `--json` output includes it), and `detection` / `scope` are
filled by hand for the guides we write page rules for.

### [A] Source scan — `src/platform/scan.ts`

- Runs their scanner as a child process: `modern-web-guidance legacy-scan <root> --json`. The JSON shape is
  documented in their README; it is the only contract we hold. No import of their internals, no ts-morph in plumber.
- **Never fetched silently.** It runs only when the package is installed in the project or as plumber's optional
  dependency. Absent: platform seers still work, confirmers are quiet, and `plumber doctor` says so in one line.
- Cached with the existing check cache, keyed on the scanned files' hashes and the package version.
- Output: `PlatformCandidate { guide, file, line, message, subPattern?, rubric }`.

### [B] Join — in the server's source index

A candidate is a file and a line. A mark needs an element.

| Candidate from | Joined by |
|---|---|
| JSX / HTML element | stamping: the element's exact source line (the same lookup every drift finding uses) |
| CSS rule | the rule's selector, matched in the page; Tailwind classes through the class → declaration reading |
| JS (a listener, a library call) | the component whose file holds it → that component's instances on the page |
| `package.json` dependency | no element: a project-level finding on the project page |

A candidate that joins to nothing on the current route is kept for the route where it does; it is not drawn.

### [C] Page rules — `overlay/src/platform-rules.js`

Same rule object as craft (`id`, `family`, `owns`, `once`, `reads`, `check({ el, facts }, theme)`), plus:

```js
{ id: 'platform/dialog', family: 'platform',
  guide: 'dialog', features: ['dialog'],            // ground and gate
  scope: 'widget-recipe',
  supersedes: ['craft/z-index-war'],                // see [E]
  reads: ['style', 'rect', 'role', 'source', 'probe'],
  check({ el, facts, candidate }, theme) { … } }
```

Two kinds:

- **Confirmer.** Has a candidate from the scan. Reads the rubric's conditions as page facts and keeps or drops.
  Example, `platform/autofill-sign-in`: keep when the input is visible, enabled and inside a form with a submit
  control; drop when hidden, disabled, read-only, or `autocomplete` is already present in the rendered DOM (a
  component may add it where the source line does not show it).
- **Seer.** No candidate needed. Finds the hand-built thing from role, style and a recorded gesture. These are the
  guides their triage marks `needs-verifier`: source that "looks identical to normal code", where a static matcher
  misfires more than half the time. The page does not have that problem.

First seers, in order. One at a time, each seen on a real app before the next:

| Rule | What plumber sees on the page | Guide |
|---|---|---|
| `platform/dialog` | a fixed, viewport-covering layer with a dimmed ground and a centred panel, `role="dialog"` or `aria-modal`, not a `<dialog>`; probe: opens on a click, Escape or outside click closes it | dialog, light-dismiss-a-dialog, prevent-page-scroll-under-modal-dialog |
| `platform/field-sizing` | a textarea whose inline `height` changes while typing in the probe | form-fields-automatically-fit-contents |
| `platform/anchored` | a floating element (tooltip, menu, hovercard by role) whose inline `top`/`left`/`transform` is rewritten when its trigger moves or the window resizes | position-aware-tooltips, viewport-aware-dropdowns |
| `platform/intrinsic-size` | an open/close transition on `max-height` to a number larger than the content's height (the tell: the easing visibly stalls) | animate-to-intrinsic-sizes |
| `platform/stuck-state` | a sticky header whose class list changes at the scroll offset where it sticks | state-aware-sticky-headers |
| `platform/scrollbar` | `::-webkit-scrollbar` rules on an element that scrolls (a confirmer; the scan finds it, the page says whether it scrolls) | customize-scrollbar-color-and-thickness |

The numbers inside these (how much taller than content, how many rewrites) are an invented mechanism: tuned on real
apps, kept in the spec (`craft-spec.js`), and said to be tuned. The principle is the guide's.

### [E] One verdict per element

- `owns` works as it does today: two rules that own the same thing on one element give one verdict.
- New: **`supersedes`**. A platform finding of scope `widget-recipe` or `cross-layer-refactor` means the element
  will be rebuilt. Craft findings that the rebuild removes (a z-index fight on a hand-built popover; the top layer
  ends it) fold into the platform finding instead of standing beside it. Declared per rule, never inferred.
- A platform finding never outranks tiers `access` or `legibility` on the same element unless it is itself `access`.

### [F] Suggestion

The guide's update scope decides who does the work.

| Scope | Suggestion | Who applies | Proof |
|---|---|---|---|
| `local-swap` | `{ kind: 'class' }` or `{ kind: 'declaration' }`, the shapes plumber already writes (add `autocomplete`, `field-sizing-content`, `scrollbar-color`) | plumber, as any fix | the finding is gone after the hot update |
| `cross-layer-refactor`, `widget-recipe` | new: `{ kind: 'guide', guide, retrieve, scope, features, baseline, removes }` | the coding agent; plumber never rewrites behaviour | the finding is gone **and** the same gesture's recorded timeline still ends in the same states |

- `retrieve` is the command that prints the guide (`npx modern-web-guidance retrieve <id>`); `removes` lists what
  the change should delete (the listener's component and file, the dependency), from the join.
- `plumber craft --json` and the report carry the `guide` suggestion as it is.
- On the page: shown on the element like any verdict, with the name of what the browser gives and one action that
  copies a brief for the agent. No card. How it is drawn is a design step with its own sign-off, not part of this
  document.
- **Behaviour parity** is plumber's own proof and the reason to do this in plumber at all. Before: record the
  gesture (open, Escape, outside click, Tab order). After the agent's change: record again. Same end states, fewer
  owned lines. Their `expectations.md` is a good checklist of which states to record for each guide.

### The other direction: at write time — `skills/plumber/SKILL.md`

The guides exist to steer an agent *before* it writes the legacy pattern. Plumber knows the project's roles and
components, so its skill can say: "about to build a tooltip, menu, dialog, select or accordion here? This project has
none in its library; retrieve `<guide>` first" or "this project has one, use it". One section in the skill, driven by
the guide index and the role layer. Last layer, because it prevents findings rather than making them and needs the
rest to exist.

## 6. Layers, in build order

Each is seen working before the next starts. No tests until the owner says the behaviour has settled.

| # | Layer | What a person can see when it is done |
|---|---|---|
| 0 | Read the published package | A half-page note: what it exports, whether triage and rubric come as data, the scan's real JSON on crafting-ui and algorecall, how long it takes. Decides the three "depends" points above |
| 1 | Baseline gate + tag existing rules | An existing suggestion on crafting-ui that uses a modern feature now says since when it is safe, or holds because the project targets an older browser |
| 2 | Source scan in the CLI | `plumber craft` lists platform candidates by file and line on a real app |
| 3 | Join to the page | The same candidates drawn on their elements in the overlay |
| 4 | Confirmers | False candidates gone; a before/after count on a real app, with the dropped ones named |
| 5 | Seers, one at a time | `platform/dialog` first: a div modal on a real app is found with no source hit |
| 6 | The guide suggestion and parity proof | One hand-built widget replaced by an agent from the brief; the gesture recording matches before and after |
| 7 | Write-time section in the skill | An agent asked for a tooltip in crafting-ui retrieves the guide or uses the project's component |

Layers 1 and 2 do not depend on each other. Layer 1 is worth shipping even if everything after it is dropped.

## 7. Decided here, and why (change any of these at sign-off)

- **Call their scanner, do not port it.** 37 matchers with a test each, updated weekly by four browser teams; a port
  is stale the day it lands. Cost: an optional dependency and a child process. If layer 0 shows the scan is too slow
  or too noisy on a real React app, the fallback is to port only the matchers behind the confirmers we keep.
- **Snapshot the data, do not depend on it at run time.** The overlay runs in the user's page; two generated JSON
  files are free, a data package is not.
- **UI categories only.** Plumber judges what is seen and touched.
- **Plumber applies local swaps; an agent does the rebuilds.** Plumber writes classes and declarations and proves
  them by re-reading. It has no business rewriting event handlers.
- **Advisory by default.** A working hand-built tooltip is not drift from the design system. It is said once, low,
  and never blocks a clean-up.
- **Dialog first among the seers.** `<dialog>` has been in every engine for years, so the gate says `use` for
  almost every project and the first proof is not muddied by fallbacks. *(From memory, not looked up; layer 1's data
  settles it.)*

## 8. What is not known

- What the published package exposes (layer 0).
- How the scan behaves on Tailwind and component-library code: its CSS matchers read stylesheets, and a Tailwind
  project has few hand-written ones. Seers may carry most of the value there. A guess until layer 2.
- Whether a recorded gesture is stable enough across a rebuild to compare (ids and structure change; states should
  not). The comparison is on end states, not on the tree.
- Baseline levels of the individual features named in the seer table. Not looked up; the generated file is the
  source, not this document.

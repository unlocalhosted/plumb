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
- **The scanner** (`legacy-scan.mjs`, 5 MB bundled, with ts-morph) covers 33 guides with 35 rules, each with a
  keep/drop rubric for a reader to throw out false hits. Run with the owner's permission on 2026-11-13:

  | App | Time | Findings |
  |---|---|---|
  | crafting-ui (`src`) | 2.2 s | 0 |
  | glyphschool | 1.6 s | 0 |
  | glyphwrite | 2.1 s | 2: Enter submits without checking for an input method mid-word (ime-safe-enter-submit) |
  | algorecall | 25.8 s | 35: ime-safe-enter-submit 25, dark-mode-toggle 6, sign-up password autofill 2, sign-in password autofill 1, a textarea resized by script 1 |

  Each finding comes with the guide to retrieve and the rubric, but needs reading before it is believed. None of
  these were checked against the page yet.
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

## 4b. The security pack: advice into checks, one at a time

The owner, 2026-11-13: "i wanted you to turn the advice into the automated checks … lets pick one topic like
security and then turn it into rules as part of the engine".

Security rules read source, not the page, so the pack has `runs: 'source'` and its rules run on the server
(`src/packs/source.ts`, the runner; `src/packs/security.ts`, the rules). They are part of the same analysis as
drift and habits: `plumber check`, the report, the ledger and the server all see them, under the rule id
`security/<name>` and a new principle, `safety`. The runner parses a file once for all rules, hands each rule only
the kinds of syntax it is about, and never parses a file none of the active rules could speak about.

**The guide, sorted.** Chrome's `security` guide has about 70 dos and don'ts. Most are about what a server sends,
which a front-end project's source does not show:

| What the guide covers | Can plumber check it | |
|---|---|---|
| §1.2 Dangerous DOM sinks (`innerHTML`, `outerHTML`, `document.write`, `eval`, string timers) | yes, in source | **built: `security/dom-sink`** |
| §1.5 `postMessage` sent to `*`; a `message` listener that never checks `event.origin` | yes, in source | next |
| §3.3 A Trusted Types policy that passes its input straight through | yes, in source | after |
| §1.3 Cookies written from script (`document.cookie`) without `Secure` / `SameSite` | yes, in source | after |
| Subresource Integrity: a third-party script or stylesheet with no `integrity` | yes, in `index.html` and on the page | after |
| §1.1 A resource fetched over `http://` | yes, in source and on the page | after |
| CSP, HSTS, frame-ancestors, COOP/CORP, nosniff, Referrer-Policy, Permissions-Policy, CORS, Fetch Metadata, Clear-Site-Data | no: response headers set where the app is deployed; a dev server does not send them | not rules |
| Passkeys, encryption, signatures, email verification (11 guides) | no: how to build a feature, nothing to find in existing code | not rules |

**`security/dom-sink`** (guide: security §1.2; fix: `sanitize-untrusted-html`). Says: this place runs what it is
given as markup or code, and what it is given is not fixed text. It follows a value back through the file: a
string, a template or join of fixed parts, one of the file's own constants, a property of fixed data, a number,
and what the plain list and string methods make of those are all fixed, and nothing is said. A call whose name
says it sanitises or escapes is taken at its word. A parameter, a prop, anything fetched or read from the page is
not fixed. It cannot know whether such a value is trusted, so it is a warning that names the place, never "this
is a hole".

**Seen on real apps (2026-11-13),** app source only:

| App | Files | Time | Found |
|---|---|---|---|
| crafting-ui | 600 | 0.2 s | 0 |
| glyphschool | 51 | 0.1 s | 5: `innerHTML` given category names, prompt text and a colour swatch built from lesson data |
| glyphwrite workbench | | 0.2 s | 5: the same recorder code |
| algorecall | 3,797 (whole repo) | 2.7 s | 5 in `src`: highlighted code through `dangerouslySetInnerHTML`; `new Function` in its code-running worker (3), which is the feature |

The first version said 11 on glyphwrite; three were `innerHTML = MARKUP` where `MARKUP` is a constant in the same
file. Following constants removed those and nothing real. `plumber check` on glyphschool now lists "5 security
findings" under Fix first, and `plumber check --rule security` shows each with its line and the guide to retrieve.

Not done: the overlay does not draw these on the page (a finding is about a line of code; where it belongs to an
element, it could be); no tests; on by default as warnings, and whether a new warning should fail an existing
project's `check` is the owner's call.

## 4c. The batch of 2026-11-13: 23 accessibility checks and 6 security checks at once

The owner: "this is very slow aim for bigger patch per iteration otherwise it will take a month just to add these
rules". From here a guide is sorted once and every item the page or the source shows is written in one patch,
then run once on the real apps.

**Security, from the `security` guide (source, in `plumber check`).** With `dom-sink` that is every item of the
guide a front-end project's code shows:

| Rule | Says | Guide |
|---|---|---|
| `security/postmessage-target` | `postMessage(data, '*')` sends to any origin | §1.5 |
| `security/message-origin` | a `message` listener on the window that never reads the event's origin | §1.5 |
| `security/trusted-types-pass-through` | a policy whose `createHTML` returns its input | §3.3 |
| `security/cookie-flags` | `document.cookie = …` without `Secure` or `SameSite` (a deletion is left be) | §1.3 |
| `security/subresource-integrity` | a `<script>` or stylesheet `<link>` from another site with no `integrity` (font services aside) | Subresource Integrity |
| `security/insecure-resource` | `fetch`, `WebSocket`, `<img>`, `<script>`, `<form action>` … on `http://` or `ws://` (a link a person follows, and local addresses, are left be) | §1.1 |

**Accessibility, from the `accessibility` guide (the page).** `control-name` plus:

| Rule | Says | Guide section, criterion |
|---|---|---|
| `image-alt` | an `<img>` with no `alt` | 6 Images, 1.1.1 |
| `alt-cliche` (advisory) | alt starts "Image of…" | 6 Images |
| `svg-name` | an `svg role="img"` with no description; an icon beside a control's words that is not hidden | 6 Inline SVGs, 1.1.1, 4.1.2 |
| `tabindex-positive` | `tabindex` above 0 | 5 Tab order, 2.4.3 |
| `tabindex-redundant` (advisory) | `tabindex="0"` on what takes focus already (a roving tab stop aside) | 5 Tab order |
| `hidden-focusable` | something that takes focus inside `aria-hidden` | 2 ARIA, 4.1.2 |
| `role-presentation-control` | `role="presentation"` on a control | 2 ARIA, 4.1.2 |
| `label-on-generic` | `aria-label` on a plain `div` or `span` | 3 Naming, 1.3.1 |
| `label-in-name` | a control's `aria-label` shares no word with the words it shows | 3 Choosing the name, 2.5.3 |
| `role-in-label` (advisory) | "Save button", "Main navigation" | 3 Choosing the name |
| `link-name-reused` | the same link text going to different pages | 3 Choosing the name, 2.4.4 |
| `heading-skip` (advisory) | an h4 after an h1 | 1 Headings |
| `heading-h1-many` (advisory) | a second h1 outside a dialog | 1 Headings |
| `main-many` | a second `<main>` | 1 Landmarks, 1.3.1 |
| `nav-unnamed` | several navigations, this one unnamed or sharing a name | 1 Landmarks, 1.3.1 |
| `iframe-title`, `iframe-scroll` | a frame with no title; `scrolling="no"` | 4 Iframes, 4.1.2, 1.4.4 |
| `table-headers` | a table of rows with no header cells | 1 Tables, 1.3.1 |
| `heading-in-summary` (advisory) | a heading inside `<summary>` | 1 Headings |
| `redundant-role` (advisory) | `<nav role="navigation">`, `required` with `aria-required` | 2 Native HTML |
| `role-on-structure` | `<li role="button">` | 2 Native HTML, 4.1.2 |
| `native-over-role` (advisory) | `<div role="button">` | 2 Native HTML, 4.1.2 |
| `field-autocomplete` | an email, phone, password, name or address field with no `autocomplete` | 7 Input assistance, 1.3.5 |

**Proof.**
- A page with one of each accessibility problem, through the real CLI and engine: all 24 rules speak, each with the
  right sentence (29 findings).
- A source file with a good and a bad case of each security rule: the 12 bad lines are found, the 11 good ones
  (an origin check, a named target, `Secure; SameSite`, a deletion, localhost, a constant, an escaped piece,
  `integrity`, a font service, a plain link) are not.
- Real apps, accessibility: crafting-ui 2 (two links called "Primitives" going to different pages; nothing else);
  glyphwrite workbench 5 (the unnamed sliders); glyphschool 0. All 24 rules over crafting-ui's 1,169 elements
  take 7 ms.
- Real apps, security: nothing beyond `dom-sink` (crafting-ui 0, glyphwrite 5, glyphschool 5, algorecall 4). None
  of these apps sends window messages, writes cookies from script or loads third-party scripts in JSX.
- False hits found in this run and removed: `tabindex="0"` on a tab (a roving tab stop); a row link whose
  `aria-label` says its pieces at more length (13 on glyphschool); `${esc(name)}` inside markup (9 on plumber's
  own overlay).
- Five nearby test files pass (34 tests). No tests of the new rules.

**Left in the accessibility guide** (about 80 items): what needs the source or a gesture (keyboard handlers on
custom controls, focus moved into dialogs, live regions), what is about the document (language, title), what is
about media (captions, transcripts), and what is judgement (is this alt text informative).

## 4d. The batch of 2026-11-14: 33 forms checks

Source: `modern-web-guidance` 1.0.0, guide `forms` (92 dos and don'ts, eleven sections). Pack `forms`, page rules, files `overlay/src/pack-forms.js` (words, grounding) and `overlay/src/forms-rules.js`.

| Section of the guide | Rules |
|---|---|
| 1. Structure | nested-form, button-type, submit-missing, fieldset-legend, field-name, password-no-form, search-landmark, form-unnamed, get-sensitive, textarea-resize, submit-wording, radio-group, input-type, visual-order |
| 2. Labels and state | label-unbound, label-proximity, invalid-undescribed, required-unmarked (doubt), required-unsaid, label-overridden, describedby-missing, placeholder-instruction |
| 3. Autofill and hints | autocomplete-off, numeric-keyboard, number-for-code, split-code, identifier-correction |
| 4. Validation | invalid-on-load, submit-disabled |
| 6. Styling | control-hidden |
| 8. Identity and security | inline-handler |
| 9. Addresses | name-split (doubt), latin-only |

Not built, and why: paste blocked and Enter during composition (source only; a pack runs on the page or on source, not both yet); CSRF, HTTPS, server fallback (server); sections 10 and 11 (testing, analytics, wizard state: a person's work); font size, tap target and focus outline (craft already says them).

Run (2026-11-14): broken page, 30 of 33 speak. crafting-ui /icons: 1 true finding (search-landmark). glyphschool, glyphwrite: 0. One false hit fixed (a `<kbd>` hint inside a label). 33 rules, 10,827 elements, 30 ms. These apps hold 2 to 29 form parts a page, so this run is thin evidence.

## 4e. The batch of 2026-11-14: 37 component checks

Source: `modern-web-guidance` 1.0.0, the 22 `ui-components` guides. Pack `components`, page rules, files `overlay/src/pack-components.js` (one table: guide, spec entry, words, grounding per rule) and `overlay/src/components-rules.js`.

| Guide | Rules |
|---|---|
| breadcrumbs | breadcrumb-list, breadcrumb-current, breadcrumb-separator |
| card | link-nested-control |
| carousel | carousel-name |
| dialog (and prevent-page-scroll-under-modal-dialog) | dialog-name, dialog-native, dialog-aria-extras, dialog-fake-modal, dialog-close, dialog-scroll-lock, dialog-display |
| menu, app-menus | menu-structure, popup-expanded, checked-missing, expanded-out-of-sync, menubar-name |
| navbar | nav-as-menu, nav-current, nav-details, current-many, expanded-on-generic |
| tabs | tablist-name, tab-selected, tabpanel-name, tabs-as-nav, tab-shift, tabs-wrap, tab-structure, tabpanel-many, tab-stops |
| toolbar | toolbar-name, pressed-on-action |
| progress, spinner | progress-name, progress-tabindex, progress-native, spinner-silent |

Not built, and why: most of these guides say how to build with popover, anchor positioning, invoker commands and focusgroup; a page that does it another way is not wrong. Toasts, hovercards, tours, drawers, scrollspy, the dark-mode toggle and stack drill-down are about behaviour over time.

Run (2026-11-14): broken page, 34 of 37 speak (two need a real opened modal; spinner-silent does not speak, cause not found). crafting-ui: breadcrumb-list on every page and tab-stops on /icons, both true; pressed-on-action gave 3 false hits (selectable icons named Copy, Close, Download), fixed. glyphschool, glyphwrite: 0. Forms and components together, 70 rules over 10,827 elements: 60 ms.

## 4f. The batch of 2026-11-14: 34 HTML checks

Source: `modern-web-guidance` 1.0.0, guide `html` (82 dos and don'ts, nine sections). Pack `html`, page rules, files `overlay/src/pack-html.js` (one table) and `overlay/src/html-rules.js`.

| Section | Rules |
|---|---|
| 1. Semantics | page-lang, viewport-meta, zoom-disabled, quirks-mode, landmark-main, banner-many, h1-missing, list-fake, list-structure, pointer-generic, link-as-button, boolean-value |
| 2. Grouping | figure-caption, pre-no-code, pre-scroll-keyboard, pre-scroll-region |
| 3. Priority | img-size, lazy-above-fold, eager-below-fold, fetchpriority-overused, hero-priority, img-oversized, picture-img |
| 5. Disclosures | summary-first, summary-nested-control, summary-no-cue, title-tooltip |
| 8. Media | video-size, video-poster, video-captions, background-video, autoplay-sound, iframe-hidden |
| 9. Interactivity | inline-handler |

Not built, and why: what the other packs say already (§1 names, heading order, roles; §4 dialogs; §6 tabindex and order; §7 autocomplete); blockquote, cite and code semantics (meaning, not markup); focus management (behaviour over time); inline styles (every React app has them for good reason).

A page-wide rule is said on the first element the engine judges (it judges only what comes from the project's source), remembered across passes.

Run (2026-11-14): broken page, 27 of 34 speak; 7 need a different page and are unproven. Real pages: 16 findings, all true (13 title tooltips on glyphwrite; img-size, eager-below-fold and figure-caption on crafting-ui). Four packs, 104 rules, 10,827 elements: 113 ms.

## 4g. The batch of 2026-11-14: 17 checks a linter cannot see

The brief, in the owner's words: "triage and prioritise which often gets ignore and non obvious to linters". The test for an item: its evidence is not in the source. Pack `experience`, files `overlay/src/pack-experience.js` and `overlay/src/experience-rules.js`.

| What it reads | Rules (guide) |
|---|---|
| Computed text style and laid-out text | nowrap-sentence (respect-os-text-scale), justify-rivers, caps-long (typography) |
| The laid-out page | page-overflow-x (responsive-design), skip-link (accessibility), color-scheme-missing (dark-mode) |
| What is running or loaded | motion-no-opt-out (motion), font-display (visually-stable-font-fallbacks), preconnect-missing, script-blocking (performance), page-title (accessibility) |
| Two places compared | button-name-reused, link-target-renamed, state-in-label (accessibility §3) |
| Scroll boxes and what is on top | scroll-no-hint (scrollability-affordance-hints), scroll-keyboard (accessibility), control-covered (card; asked with elementsFromPoint) |

Triage left out: what craft already says (measure, truncate-intent, anchor-offset, fixed-height); a control shown only on hover (needs the stylesheet read for a matching focus rule); long tasks and layout shift (need an observer running before the page loads); px font sizes and vw-only type (the computed style does not keep the unit).

Engine change with this batch: a looping animation keeps only its own element and what is inside it from being judged, not what holds it (overlay/src/craft.js). Before, one spinner stopped craft for every ancestor, the page's root included.

Run (2026-11-14): tests, 15 of 17 at their line plus spinner-silent. crafting-ui: state-in-label ×89, button-name-reused ("Replay" ×89), caps-long, link-target-renamed ×1. glyphschool: font-display. glyphwrite: skip-link. Three false hits fixed. Five page packs, 145 rules, 10,827 elements: 56 ms by kind.

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

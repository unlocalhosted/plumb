# The 17 new page checks on a real app (2026-11-26)

The 17 checks added on 2026-11-26 had only been run on test pages written for them. This file reports their first run
on a real app: what each one found, whether each finding is right, what they missed, and whether they change any
other check's findings.

**In short:** 33 findings on 84 pages, coming from 10 places in the source. One place is a real fault, seven are false
alarms and two are arguable. Three checks spoke, and each one was wrong at least once: `empty-box`, `native-accent`
and `row-dead-zone`. The other 13 checks stayed silent, mostly because the app has nothing for them to find (it
already does what they ask). No check threw. The new checks changed no other check's findings, apart from one
unexplained difference on an animated page.

## The run

- **App:** crafting-ui, branch `master`, commit `006e80b` (2026-11-26 03:44). The app's Vite dev server, with
  plumber's own plugin as the app wires it.
- **Plumber:** commit `615988a2`, built with `npm run build` from that commit.
- **Where:** vm-agent. Both repositories were sent there as git bundles, cloned into `~/projects/rar/`, and checked
  out at those commits. The server copy never changed during the run, so every page was judged by the same code. The
  main session fixed the `empty-box` false alarm on the copy chip in `eff41067` while this run was going. That fix is
  **not** in this run, so the copy-chip findings below come from the check as it stood at `615988a2`.
- **Pages covered:** 84 of the 174 routes in the app's route list (`src/seo/routes.ts`, plus the three `/sloppy/*`
  pages and `/icons/concepts`). Every route except the icon detail pages, plus 10 of the 100 icon detail pages
  (`/icons/stack` … `/icons/glitter`; they are one template).
- **Elements read:** 19,276 across those 84 pages.
- **Gestures:** on. Hover, press and the other probes ran with the CLI's defaults (budget 24 per kind, no drag), as
  `plumber craft` runs them.

### Commands

The full sweep, six routes per batch, three batches at a time (`run-batch.mjs`, in the scratch folder on vm-agent).
It calls the runner the same way `plumber craft --url … --routes … --json` does, with `proof: { without: [] }` added
so that errors thrown by checks are kept:

```
craftRun({ url: 'http://localhost:5471', routes, root: '<crafting-ui>', timeout: 120000,
           pairs: true, probe: true, probeBudget: 24, probeDrag: false, judge: false, proof: { without: [] } })
```

The CLI itself, as a smoke test before the sweep (two routes, same findings shape):

```
node ../plumb/dist/cli.js craft --url http://localhost:5471 --routes / /interfaces/craft --json --root . --timeout 120000
```

The on-and-off comparison, once per batch of six routes, with all 17 ids:

```
node scripts/proof/on-off.mjs --rules craft/snap-rest,craft/snap-strict,craft/snap-unreachable,craft/snap-offset,\
craft/scroll-chain,craft/native-accent,craft/row-dead-zone,craft/tooltip-cut,craft/image-broken,craft/empty-box,\
craft/link-in-text,craft/last-divider,craft/box-overflow,craft/icon-soft,craft/css-words,craft/type-viewport,\
craft/br-spacing --url http://localhost:5471 --routes <six routes> --root ../crafting-ui --json
```

`scripts/proof/fix-undo.mjs` was not run. No fix was applied.

## One row per check

"Places" means distinct places in the source. One component used on several pages is one place with several page
findings.

| Check | Page findings | Places | Right | Wrong | Arguable | Written fix the right edit? |
|---|---|---|---|---|---|---|
| `empty-box` | 17 | 3 | 0 | 2 | 1 | No, in all three places: on a screen-reader status line it would hide the line, and on the placeholder it collapses a row that is kept on purpose |
| `row-dead-zone` | 10 | 3 | 1 | 2 | 0 | Arguable where it was right: it works, but a developer would let the rows touch and move the space into their padding. Advice in one place |
| `native-accent` | 3 | 3 | 0 | 3 | 0 | No: it colours an input that is never drawn |
| `scroll-chain` | 1 | 1 | 0 | 0 | 1 | Yes, if the finding stands: `overscroll-contain` is the app's own habit on five other demo scroll areas |
| `snap-rest` | 0 | | | | | |
| `snap-strict` | 0 | | | | | |
| `snap-unreachable` | 0 | | | | | |
| `snap-offset` | 0 | | | | | |
| `tooltip-cut` | 0 | | | | | Not exercised: the app has no tooltips of its own |
| `image-broken` | 0 | | | | | |
| `link-in-text` | 0 | | | | | |
| `last-divider` | 0 | | | | | |
| `box-overflow` | 0 | | | | | |
| `icon-soft` | 0 | | | | | |
| `css-words` | 0 | | | | | |
| `type-viewport` | 0 | | | | | |
| `br-spacing` | 0 | | | | | |

Raw count from the sweep (`node sum2.js` over the batch results):
`{ pages: 84, read: 19276, thrown: 1 } { 'craft/empty-box': 17, 'craft/row-dead-zone': 10, 'craft/scroll-chain': 1, 'craft/native-accent': 3 }`.
The one throw is from `craft/declared-gap`, which is not one of the 17 (see the on-and-off section).

## Wrong and arguable findings

Ordered by how much harm each would do if someone trusted it.

### 1. `empty-box` on screen-reader status lines (wrong; 13 page findings, 2 places)

- **Where:** `src/components/blueprint.tsx:45` (the copy chip, on `/motion/standards`, `/motion/vocabulary`,
  `/standards`, `/primitives`, `/motion/skills`; up to 106 copies on one page) and `src/pages/TemplatePage.tsx:75`
  (the "Get the pack" link, on `/templates` and all seven template pages).
- **What is on the page:** `<span role="status" className="sr-only">{copied ? 'Copied …' : ''}</span>`. It is a live
  region. It is empty at rest, gets words when the person copies something, and the screen reader announces them. It
  is visually hidden, so nobody sees a box.
- **What the check read:** an element made to hold words (`[role="status"]` is in its list), empty, 1px tall, with
  margins (evidence `{"height":1,"margin":-2}`, the 1px box and −1px margins of Tailwind's `sr-only`). So it said
  "holds nothing, yet it still draws its box and keeps its space".
- **What it should have read:** a 1px clipped box draws nothing. An empty live region is empty by design.
- **Why it matters most:** the written fix is `empty:hidden`, which turns the region into `display: none` whenever it
  is empty. In my judgement (not checked with a screen reader here), that risks the announcement being lost: the
  region would appear at the same moment as its words, and live regions are meant to exist before their content
  changes. So taking the fix could break the one thing the element is for, on 13 pages, and nothing on screen would
  change for a sighted person.
- **Status:** fixed in the main checkout in `eff41067` during this run. This run used `615988a2` throughout, before that
  fix.

### 2. `native-accent` on Base UI's hidden inputs (wrong; 3 findings, 3 places, 1 page)

- **Where:** `/motion/moments/saar-nobody-tells-this-to-beginners`: the film volume slider
  (`src/motion/source/FilmVolume.tsx:18`, `Slider.Thumb`), the switch (`src/components/blueprint.tsx:54`,
  `Switch.Root`) and the checkboxes (`src/pages/MomentPage.tsx:520`, `Checkbox.Root`).
- **What is on the page:** Base UI controls. Each one draws its own track, thumb or box in the app's colours, and also
  renders a native `<input>` for forms that nobody sees. In Base UI's source (`switch/root/SwitchRoot.mjs:146-149`):
  `style: name ? visuallyHiddenInput : visuallyHidden, tabIndex: -1, type: 'checkbox', 'aria-hidden': true`. The
  slider thumb uses the same `visuallyHidden` style (`slider/thumb/SliderThumb.mjs:222,349`).
- **What the check read:** an `input[type=checkbox|range]` that is drawn (it has a client rect, the 1px hidden box),
  with `accent-color: auto` on a page whose buttons are `#dd7a00`. It said "drawn in the browser's own colour".
- **What it should have read:** the input is never drawn. It should skip inputs that are visually hidden: 1px or
  less, clipped, `opacity: 0`, or `aria-hidden` with `tabindex=-1`. Any headless library (Base UI, Radix, React Aria)
  that keeps a native input for forms will hit this.
- **The fix it wrote** (`accent-[#dd7a00]`) would change nothing a person sees.
- Not looked into: the same switch and checkbox components appear on the other three lesson pages, and the check
  spoke on only one of them.

### 3. `row-dead-zone` on a divider line read as a gap (wrong; 1 finding)

- **Where:** `src/pages/MomentPage.tsx:116`, the "Moves it uses" list on
  `/motion/moments/saar-nobody-tells-this-to-beginners`.
- **What is on the page:** each `<li>` has `border-t border-line` (except the first) and holds one link that fills
  it. The 1px between two links is the row's own divider rule.
- **What the check read:** four links with 1px between them, called a margin ("These 4 rows are 1px apart … a click
  there does nothing"; evidence `"by":"margin"`).
- **What it should have read:** the 1px belongs to the `<li>`'s border, which is drawn there on purpose. A person
  does not meet a 1px divider as a dead strip. The check measures between the links (`rowControl`) but should count
  the rows' own borders as part of the rows, or require a gap of at least 2px. Its `min` is 1 today.
- **The fix it wrote** puts an `::after` on every link to cover a 1px rule. It isn't needed.

### 4. `row-dead-zone` on a list of questions (wrong; 1 finding)

- **Where:** `src/pages/templates/QuestionList.tsx:12` on `/templates`.
- **What is on the page:** six frequently-asked questions, each a full-width button `py-3`, set `gap-2` (8px) apart.
  The component's own comment says the rows are "kept apart by space alone, no rules between them". There is no
  hover fill, only the question's colour.
- **What the check read:** six rows 8px apart, a menu with dead strips.
- **What it should have read:** separate questions. It is not a menu. The check's own rule is that "rows set well
  apart are separate things", and 8px is exactly its upper line (`max` 8). The line is too high for rows that are
  this tall (`py-3` around a 20px question, so roughly 50px; the check's `row` limit is 56). It could scale the allowed gap with the row height, or only
  count rows that draw a hover fill.
- It gave advice, not a written fix.

### 5. `empty-box` on an empty placeholder line (arguable; 4 page findings, 1 place)

- **Where:** `src/motion/notes/AltSwitch.tsx:16`, on four lesson pages (`/motion/moments/*`).
- **What is on the page:** `<p className="… flex h-9 …">{stop ? 'No other versions for this stop' : ''}</p>`. Before
  the film reaches its first stop, the paragraph is empty and 36px tall. That keeps room under the film, so the row
  of versions doesn't push the page down when it arrives.
- **What the check read:** an empty paragraph keeping 36px. That is true.
- **Why arguable:** the space is a deliberate reserve against layout shift. A person sees a blank 36px band under the
  film at the start. Some would call it a gap; the author kept it on purpose.
- **The fix is wrong either way:** `empty:hidden` removes the reserve and brings back the jump. A check that sees a
  fixed height (`h-9`, `min-h-*`) on an empty element should treat it as reserved space and stay quiet, or at most
  ask whether the reserve is needed.

### 6. `scroll-chain` on the editor inside the dialog demo (arguable; 1 finding)

- **Where:** `src/demos/DialogDemo.tsx:347` on `/patterns/modal-dialog`.
- **What is on the page:** a small drawn app inside a figure in the article. Its editor area is
  `absolute … overflow-y-auto` with 195px more to scroll, and has no `overscroll-behavior`.
- **What the check read:** a scroll area positioned out of flow, inside a page that scrolls, so it is "drawn over
  the page".
- **Why arguable:** `absolute` here places the area inside a figure that sits in the article's flow. It is not laid
  over the page the way a popover or side panel is. By the check's own principle, a scroll area in the page's flow
  may hand its scroll on. On the other hand, the app's own habit is to contain these: five other demo scroll areas
  carry `overscroll-contain` (`PopoverDemo.tsx:355`, `PullToRefreshDemo.tsx:438`, `SwipeToRevealDemo.tsx:728`,
  `DragToReorderDemo.tsx:469`, `ScoreReader.tsx:167`), and this one has none.
- **What to change in the check:** "positioned out of flow" should mean out of flow relative to the page. An absolute
  box whose containing block is an in-flow figure or card is still in the page's flow.
- **The written fix** (`overscroll-contain`) is the edit the author makes elsewhere.

### Fixed since the run

The owner asked for `native-accent` and `row-dead-zone` to be fixed. Both changes are in `overlay/src/craft-rules.js`:

- **`native-accent`** now skips a native input that nobody can see. That means 2px or less, see-through, clipped, or
  `aria-hidden` and out of the tab order, which is how Base UI, Radix and React Aria keep one for forms.
- **`row-dead-zone`** now judges only lists of choices: rows that are controls themselves, or items of a list, menu,
  nav or a role such as `menu`, `listbox` or `tablist`. That leaves out the questions, because each is a block
  holding a heading and a button. It also stays quiet when the rows touch and the space between their links is the
  rows' own drawn rule, as in the divider list.

Both near misses are now on the checks' proof pages: a hidden native checkbox behind a drawn switch on
`scripts/proof/pages/scroll-batch.jsx`, and a ruled list and a set of questions on `menu-batch.jsx`.

Proof, run on vm-agent at main `2bd87ad7` plus these edits:

- **Real pages** (`run-batch.mjs`, the sweep's runner): the lesson page went from 3 `native-accent` findings to 0.
  `/templates` lost the question-list finding and the lesson page lost the divider finding. The practice list (the
  right finding) is still found on `/patterns/modal-dialog` and `/patterns/command-palette`.
- **Proof pages** (`on-off.mjs --page`): `scroll-batch.jsx` gives
  `{"own":{"craft/native-accent":3},"leaked":0,"diff":[],"thrown":[]}`, which is the three browser-drawn controls
  and not the hidden one. `menu-batch.jsx` gives `{"own":{"craft/row-dead-zone":1},"leaked":0,"diff":[],"thrown":[]}`,
  the gapped menu only.

The owner then asked for the two arguable ones to be fixed too:

- **`empty-box`** now leaves alone an empty box whose own content area still has a height. That box was given its
  height on purpose (`h-9`, a min-height, an aspect ratio) to hold a place, and hiding it would bring back the jump
  it prevents. An empty box that keeps room only through its padding, like the proof page's empty error line, is
  still found.
- **`scroll-chain`** now counts an absolutely placed scroll area as "over the page" only when it is placed against
  the page itself, or reaches outside the box it is placed in (a popover hanging below its button). A pane that sits
  inside its card, like the editor inside the dialog demo, belongs to the card, which is in the page's flow.

Near misses added: an empty `h-9` line on `protips-batch.jsx`, and a scroll pane inside a card on
`scroll-batch.jsx`.

Proof, run on vm-agent at main `18475229` plus these edits:

- **Real pages:** `/patterns/modal-dialog` lost the `scroll-chain` finding and kept the right `row-dead-zone`
  finding. The two lesson pages read (`saar-nobody-tells-this-to-beginners`, `apple-intention`) lost the
  `empty-box` finding.
- **Proof pages** (`on-off.mjs --page --rules craft/empty-box,craft/scroll-chain`):
  `protips-batch {"own":{"craft/empty-box":1,"craft/scroll-chain":0},"leaked":0,"diff":[],"thrown":[]}`,
  `scroll-batch {"own":{"craft/empty-box":0,"craft/scroll-chain":1},…,"diff":[],"thrown":[]}` and
  `menu-batch {"own":{"craft/empty-box":0,"craft/scroll-chain":1},…,"diff":[],"thrown":[]}`. Each fault is still
  found once: the empty error line, the fixed panel, and the popover list.

All nine places that were wrong or arguable are now fixed. The two possible `scroll-chain` misses are still open.

## Right findings

`row-dead-zone`, `src/pages/PatternPage.tsx:502`, the practice list on eight pattern pages
(`/patterns/bottom-sheet-detents`, `pull-to-refresh`, `drag-to-reorder`, `long-press-peek`, `dismissible-toast`,
`anchored-popover`, `command-palette`, `modal-dialog`). It is five full-width buttons (`py-1`) in `grid gap-1`. Moving
the pointer down the list, the hovered text colour drops back to faint for 4px between rows, and a click in those 4px
does nothing. The fault is real and small: there is no hover fill, so it shows as a brief colour flicker.

The written fix is
`[&>li>button]:relative [&>li>button]:after:absolute [&>li>button]:after:inset-x-0 [&>li>button]:after:inset-y-[-2px]`.
It would work and moves nothing. A careful developer would more likely drop `gap-1` and give each button `py-1.5`:
same look, rows that touch, one class each. Arguable on the edit, right on the fault.

## Misses

The app was skimmed in its source for the places each check is about. Two possible misses, neither confirmed on the
drawn page:

- **`scroll-chain`, a side column that fills the screen.** `src/pages/MomentPage.tsx:301`: on every lesson page, the
  left column (film, drawing, knobs) is `overflow-y-auto` inside a section that is `100svh − 5.5rem` tall, and the
  page scrolls on below it. It has no `overscroll-behavior`. The case note (`scroll-batch.md`, row 5) names "filling a
  side of it" as a case to catch. The code only looks for a fixed, sticky or absolute ancestor within four levels, so
  it can't see this one. Not checked: whether the column overflows at the run's window size.
- **`scroll-chain`, the command palette's list.** `src/demos/CommandPaletteDemo.tsx:394`: `max-h-64 overflow-y-auto`,
  no `overscroll-behavior`, in a palette drawn over its demo. Silent on `/patterns/command-palette`. Not checked:
  whether the palette is open, and long enough to scroll, when the page is read.

Places where silence was right (the near misses held on a real app):

- **Snapping:** the one sideways carousel (`src/pages/home/Wall.tsx:137`) already has
  `snap-x snap-mandatory overscroll-x-contain` with `snap-start` 160px cards. All four snap checks stayed quiet. A
  chip row (`EdgeSwipeBackDemo.tsx:442`) and the code blocks (`overflow-x-auto` on a single `<pre>`) were left alone,
  as they should be.
- **`type-viewport`:** 34 font sizes in `src` use `vw`, and every one sits inside `clamp()` with `rem` ends (for
  example `src/index.css:255,262` and the page titles in `src/pages/*`). None flagged, which is correct.
- **`native-accent`:** the one native control the app draws itself (`standardChecks.tsx:154`, a range input) already
  has `accent-[var(--fg)]`. Quiet, correct.
- **`link-in-text`:** links in running text carry `underline` (50 lines in `src` use the class, not counting
  `no-underline` or a transparent decoration). A search for a link inside a sentence without it found none. The site's base rule sets only the
  offset and thickness (`src/index.css:322`). Quiet, correct.
- **`last-divider`:** the lists that rule every row are open lists with a matching top rule (`StandardsPage.tsx:46-48`,
  a `border-t` nav with `border-b` rows) or a cell grid (`StandardsPage.tsx:111`). Quiet, and I agree.
- **Nothing to find:** `box-overflow` (Tailwind's base styles make every box `border-box`), `css-words` and
  `br-spacing` (no CSS `content` with words and no double `<br>` in `src`), `icon-soft` (the icons are SVG).
- **`image-broken`:** silent. I did not check separately that every image loaded, so this is "no finding" more than
  "proven clean".
- **`tooltip-cut`:** not exercised. A search of `src` for `Tooltip` or `role="tooltip"` finds only content text, one
  figure and a stylesheet rule, so the hover probe had nothing of this kind to open.

## On-and-off comparison

The comparison ran over the same 84 pages in 14 batches. Per batch, every one of the 17 checks' own findings went
away when switched off (`leaked: 0` everywhere).

- **12 batches: no other check changed.**
- **`/motion/techniques/multiplane-occlusion/vocabulary`:** 16 findings of other checks (contrast, hit target, grey
  levels, stroke weight and others) show as "only with" in one run and "only without" in the other. Every pair has
  the same title, and the only difference is that one run has the source line and the other has `line: null`. The same
  findings were made in both runs, and only where they point changed. That is the source lookup, not the 17
  checks.
- **`/motion/techniques/annotation` and `/build-up`:** one contrast finding read 12 with the checks on and 55 with
  them off. Four image findings on `build-up` (missing alt, oversized image, at `src/scene/Build.tsx:199-200`) showed
  only with the checks off. Both pages animate, and both were read only partly in the sweep. The tool's own re-run
  put three other differences on this batch down to the page. These five it did not, so they are **not explained**.
  My guess is the animation, not the checks, but this run does not prove it.
- **Errors thrown:** none by the 17 checks. `craft/declared-gap` (an older check) threw on `/` in both the sweep and
  the comparison: `Cannot read properties of undefined (reading 'k')`.
- One batch stopped before comparing: `on-off.mjs` refuses a batch with a page that read nothing, and
  `/tooling/glyphwrite` read nothing (see below). That batch was re-run without it, on `/primitives`, `/stickers`,
  `/tooling`, `/icons` and `/patterns/bottom-sheet-detents`. Three other findings differed, all on `/icons`, all on
  the site header's links (`src/lib/router.tsx:5`): the hit-target finding counted 20 places with the checks on and
  25 with them off, the reused-link-name finding counted 6 and 7, and one caps-case finding appeared only with them
  off. `/icons` is one of the pages read only in part (1,414 elements this time, 1,429 in the sweep), so the two runs
  saw different numbers of links. My guess is that this explains it. It is not proven.

## Not covered

- **90 of the 100 icon detail pages.** They are one template with different icons. A batch of six pages took 10 to
  20 minutes on the shared server, so all 174 routes would have taken about 2.5 hours. The 10 that ran had no
  findings from the 17 checks.
- **`/tooling/glyphwrite`.** It read 0 elements. Its editor is imported from a sibling `glyphwrite` checkout
  (`vite.config.ts`, the `@glyphwrite/editor` alias), which the server copy does not have.
- **Six pages read only in part:** `/icons` (1,429 elements read), and five technique pages
  (`multiplane-occlusion`, `cinemagraph`, `depth-parallax`, `before-after`, `build-up`). The runner reported
  `complete: false`, so their lower parts may hold findings that this run never saw.
- **One width only:** the desktop window the runner uses. A phone width was not run.
- **Pages behind a state:** dialogs, palettes and menus that are closed when the page loads were judged as the probes
  left them, not opened one by one.
- **The server restarted at 04:00 UTC during the sweep.** It cut off one batch and the last rounds. Those batches were
  re-run on the same commits after the restart, and the result above combines both parts.

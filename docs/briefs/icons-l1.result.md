# Icon pass, layer 1: result

Branch `icon-pass`, worktree `plumb-icons`. Nothing committed. Spec: `docs/research/icon-system.md` (§9 binding).

## Files

| File | What |
| --- | --- |
| `overlay/src/icons.js` (new) | `readIcons`, `iconRows`, `familyOf`, `proposeIcons`, `iconSite`, `iconEdits`; the emoji table; origin signatures |
| `src/session/icon-sets.ts` (new) | `installedIconSets(root)`: icon packages in `package.json`, their version, and (lucide-react only) mark names from `node_modules/lucide-react/dist/esm/icons` |
| `src/census.ts` | `CensusIcon`, `icons` on `ProjectCensus`, `readIconRows` page script, `projectCensus` returns `icons` |
| `src/session/engine.ts`, `methods.ts`, `server.ts`, `index.ts` | the `icons` method (`GET /__plumb/icons`), beside `palette` |
| `src/hosts/client.ts` | `src/icons.js` in `overlayModules` |
| `e2e/icon-read.test.mjs` (new) | 9 end-to-end slices over a real Vite+Tailwind+Chromium app and the real `plumber census` |
| `docs/qa/icons-l1-crafting-ui.md` (new) | crafting-ui read and the §5 comparison |

`cleanup.js`, `show.js`, `colour-pass.js` untouched; no `icon-pass.js`.

## Each spec rule, where it lives (`overlay/src/icons.js`)

| Spec | Where |
| --- | --- |
| §1.1 family, ink, fill vs outline | `paint()` (style, caps, joins, baked colours), `originOf()` |
| §3 reading a system | `originOf` (a) renderer/component, (b) sprite, (c) signatures, `familyOf` (main family, 60% share, size per text size, stroke per weight band, gap per size, style share) |
| §3 emoji | `readEmoji()` (grapheme scan, own / leading / trailing / inside) |
| §4 refused categories | `readIcons()`: content (drawing, chart, excluded path, not in a control or row), illustration (> 48px, > 12 shapes), logo (named, or own colours), plus a 12px marker floor |
| I1 stray stroke, 0.25px (§9.3) | `proposeIcons` "I1": >= 8 samples, mode >= 60%; class on the svg only when shapes inherit, renderer advice, prop when the usage sets it |
| I2 stray size | "I2": peers >= 3, mode >= 50%, within `media-size.near` 12px, within one origin; writes the class the peers wear, or the `size` prop |
| I3 big icon stroke | "I3": >= 32px, > 2px, to the band's usual stroke |
| I4 alignment | "I4": > 1px from the cap middle (`craft/icon-cap`), one-line label, flex row; `items-center` if that lands within 1px (predicted), else plus `translate-y-[N]`; replaces an existing translate |
| I5 gap | "I5": >= 4 peers of one icon size, modal gap; row `gap-*` or the icon's margin; not on justify-between rows |
| I6 second library | "I6": other origin than the main family, every icon mapped by name, family share >= 60%, target mark must exist |
| I7 style mix | "I7": a solid among lines in a row of >= 3; Heroicons counterpart by path; selected state exempt; other sets listed |
| I8 emoji | "I8": table (§4.2, 154 keys, all checked against lucide-react 1.7.0), label overrides (📥 + "Archive" = archive), `family.markFor`, dot for colour circles; `aria-hidden` and the size class the app uses for that text size |
| I9 hit region | "I9": icon-only control < 24px, not in dense text; padding or `size-6`; unlabelled icon-only controls listed |
| §9.1 never invent a mark | `markFor()`: own renderer needs the name (or a synonym) seen in use; else `no mark yet` |
| §9.2 no new dependency | `markFor()`: package must be in `installedIconSets` with its names read; else "install lucide-react first" |
| §9.3 dot only for status/category | `proposeIcons` I8 and `readEmoji`: colour circles; other emoji get a dot only when `status` (a badge, chip, status class) |
| measure | `proposeIcons`: sizes, strokes, styles (origin + style), emoji, before to after |

## [K] claims: what was checked

Checked against the installed `lucide-react` 1.7.0 (`/Users/vijaysingh/unlocalhosted/algorecall/node_modules/lucide-react`): viewBox 24, stroke 2, round caps and joins
(`defaultAttributes.js`); svg classes `lucide lucide-<name>` (`createLucideIcon.js`); `absoluteStrokeWidth` (`Icon.js`); all 154 keys of the emoji table exist as
`dist/esm/icons/<name>.js`. One correction: the spec's `bar-chart-3` is not in 1.7.0 (renamed `chart-column`, which the table uses).
**Not checked** (no package installed here, no page fetched): Heroicons signature (`data-slot="icon"`, viewBox 24/20/16) and component names, the Heroicons-to-Lucide
alias list, Phosphor 256, Radix 15, Tabler and MUI class names, react-icons attributes, Material 3 and Apple HIG numbers. These only name an origin (and I6/I7 need the
target mark to exist in an installed package); no stroke or size number in code comes from them. The size ladder and gap ratios (§1.2, §1.6) are [D] and not used at keep.

## crafting-ui (details in `docs/qa/icons-l1-crafting-ui.md`)

Family `app:Icon`, 20 grid, 1.5px, square caps, miter joins, 20px beside 11px text, 8px gap, 0.15px from the cap middle; style read as duotone (line + 10% tint), not line.
Keep proposes nothing on `/`, `/motion/standards`, `/icons`, `/stickers`, `/sloppy/issues` (the last draws no svg). Refused: 162 over 48px, 196 over 12 shapes, 663 in their own colours (frosted gallery),
29 markers under 12px, 2 hero icons (I3, sized to 42px text). No emoji on any of the five routes. Disagreements with §5 (duotone, hero pair reason, count, emoji, label) explained in the QA file;
one needs an owner yes: the I3 narrowing for em-sized icons.

## Tests

```
$ npm run build            # exit 0
$ npm run typecheck        # exit 0
$ PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test e2e/icon-read.test.mjs
  ✔ a one icon at size-[18px] among size-5 becomes size-5, with the class its peers wear (483.83ms)
  ✔ b one inline svg at stroke 2 among 1.5 becomes the family stroke, as a class on the svg (472.27ms)
  ✔ c an icon+label row off the cap middle is aligned: the write is predicted, then applied, and the icon sits on the cap middle (497.37ms)
  ✔ d emoji with no matching mark are listed "no mark yet" and never swapped; one with a mark in the renderer is a swap (419.58ms)
  ✔ e a brand logo and an illustration are refused, with their reasons; the icons around them are not (347.05ms)
  ✔ f a page already on its system has nothing to do (354.88ms)
  ✔ g a stray gap goes to the app's gap, and an icon-only control under 24px gets padding (348.61ms)
  ✔ h Lucide as the family: a name in the installed package is an import, a name it lacks is listed, a second library maps by name (332.28ms)
  ✔ i the site's icons are served over HTTP from the census, every route, with the installed sets (374.55ms)
✔ icon read: ... (29756.48ms)
ℹ tests 10   ℹ pass 10   ℹ fail 0
$ node --test e2e/colour-read.test.mjs      # regression: ℹ tests 9  ℹ pass 9  ℹ fail 0
$ node --test e2e/census.test.mjs           # passed (in a batch with colour-read and packaging)
$ node --test e2e/packaging.test.mjs        # FAILS: 'dist/recipes/packs/first.json' does not match /(?:\.d\.ts|\.js)$/
```

The packaging failure is in the packed file list (a `.json` in `dist/recipes/packs`), nothing this layer touched; not re-run on a clean tree, so "pre-existing" is an inference.
(A test of mine proves each slice against the real boundary; I did not run the slices against the pre-change code, since there was none to run them against.)
Memory was checked before the Chromium suite (`top`), one suite at a time.

## What I could not build, and why

1. **Applying a swap into an own renderer.** The write is `{ component: 'Icon', prop: { name } }`; the mark's import (`marks.house`) is not resolved. The renderer's own mark list is not read, so "marks known" is names seen in use on the routes read.
2. **Packages other than lucide-react.** Their mark names are not read (`marks: null`), so I6/I8 into Heroicons, Phosphor and others answer "its names are not read by this pass yet". Needs those packages' layouts verified first.
3. **A leading-text emoji write** (`🏠 Home` in one text node) is detected and described (`form: 'leading'`, `remove`), but the text edit is the writer's, layer 2.
4. **Locating each write** (`iconSite`, `iconEdits`, through `locate.classSiteOf`/`classEditsOf`) exists but is not exercised end to end here: the tests prove the proposals, not the source edits. Layer 2 (the show and panel) owns that.
5. **Keylines, duotone vs line "mixed in a row" for two sets, `icons/unlabelled` as a real rule**: keylines are not readable from code (§1.1); unlabelled icon-only controls are only listed.
6. **Refine and new scopes**: `proposeIcons` takes `scope` but implements keep only.
7. **Heroicons counterpart (I7)** writes an import path from the variant string (`@heroicons/react/24/solid`); unverified, [K].
8. **Census on crafting-ui**: not run (it writes into the project's cache); the family was read from the five routes' rows in the page.

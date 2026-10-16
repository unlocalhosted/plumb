# CLI experience, layer 3 — result

Implemented on main after layer 2 (84e62a5), including both Also requirements.

## Drawing and wording

- Human-only finding projection merges each subject within a rule family, unions physical sites and combines reasons. Type size and line-height share one row. Other rule contracts remain distinct: the same class on two different components is not merged across their ownership rules. Mixed-syntax analyzer groups project into their authored subjects; matching-copy suggestions use the token applicable to each site. Original analyzer findings and ledger identities remain unchanged.
- Finding blocks have at most three physical lines: fixed-column subject/reason/location; optional compact suggestions; optional many-site row. A single location uses a relative file:line. Many-site counts include distinct files, with up to four fitting sites and the remaining count. Basename collisions use the shortest unique path tail.
- Broken markers/reasons are red; off-token drift amber; locations, counts, arrows and suggestion amounts dim. Subjects retain terminal default colour. Colour and coverage bars require a terminal and no NO_COLOR. Source expressions collapse whitespace and truncate; long paths shorten in the middle. Accept examples use shell continuations when needed, including inside long quoted paths.
- src/cli-table.ts supplies shared terminal geometry, display-cell widths, shortening, column budgets, colour and prose wrapping. Findings, coverage, Fix first, workspaces, decisions, habits, ledger moves and doctor all use it. Pipes use 100 columns. Cells shorten rather than changing column offsets; explanatory prose wraps intentionally.
- Fix first has three aligned columns: count/category, short reason, command. Command width preserves every selector at 80 columns. Most-in-family uses off-token coverage sites, not distinct groups: AlgoRecall correctly says most in type. Coverage off-counts are right-aligned and use thousands separators.
- docs/MESSAGES.md records the human wording and table contracts. Human phrases say raw colour, your type scale and setup gap. Rule ids appear only in verbose/explicit rule details and the final accept example. README and help describe the compact full report.
- --all retains layer 2's prior selection/order, with the new drawing, merged subjects, once-per-rule Why block and one accept example. The layer-2 byte-equality requirement for human --all is superseded by this layer's finding-line requirement. Human filters and analyzer ordering otherwise remain unchanged. Default new-detail cap applies to projected groups.

## Verification

Final required command completed with exit 0:

`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`

Build passed. Main/native: 440 passed, one skipped (441 tests). Forced polling: 25 passed, one skipped (26 tests). Watching disabled: 23 passed, three skipped (26 tests). No failures in any mode. Total: 488 passed, five intentional skips. Full log: /tmp/plumber-cli-dx-3-full-test.log. Flag-dispatch proof invoked all 159 listed flags across 20 commands.

One complete validation run reported 439 passed, one skipped and one browser failure at e2e/blueprint.test.mjs:261: the SVG fill read during the D-held preview returned an empty string rather than mint. That test passed in the preceding complete pass, its isolated rerun, and the final unchanged full run. Neither overlay source nor this browser test was edited.

- Integration/e2e coverage only. Real stdout PTYs at 80 and 140 columns exercise the layer-2 generated fixture and the site, including default, family detail and --all. Assertions cover physical line bounds, fixed location offsets, at most three lines per finding, one text-xs row, compact source expressions, colour and NO_COLOR.
- Additional PTY checks cover basename collisions, long token names, decisions/habits/doctor columns, ledger rebase columns, right-aligned coverage counts, copyable Fix first selectors, and broken-only summary colour. A long-path accept example is copied through /bin/sh and successfully records its exception. A fixture with more colour groups but more type sites guards the most-in-family reason.
- Piped human output has no escape bytes and uses the 100-column fallback even when COLUMNS=80. NO_COLOR PTYs contain no escape bytes. The frozen pre-layer-2 analyzer replay retains exact SHA-256 byte identity for JSON, agent, SARIF and GitHub, including runs with human selectors. No clocks or output bytes are normalized in those comparisons.
- Layer-1 workspace setup integration checks alignment at 80 and 140 columns. Existing CLI, adoption, ledger and message integration checks were updated only for the intended human presentation changes.
- Site PTY runs compare the site diff before/after. No overlay/src or site/src files were edited; the pre-existing Hero.jsx diff and unrelated untracked work remain outside these commits.

## Read-only AlgoRecall proof, 100 columns

Ran the built CLI against ../algorecall with PLUMBER_CACHE_DIR redirected outside the project. Both commands exit 1 (existing configured errors), with empty stderr. Git porcelain status including all untracked paths is byte-identical before/after. Final captures reuse the scratch cache; displayed analysis times are observations, not performance claims.

Default: 23 physical lines, maximum 99 columns. Type detail: 1,409 physical lines, maximum 100 columns. Type detail contains 392 projected groups, each at most three lines; every location starts at zero-based offset 73 (column 74), and exactly one provenance row names text-xs with the combined type-scale reason. Complete outputs follow, without omitted middle sections.

Capture directory: /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumber-cli-dx3-algorecall-rzemxa

### Default

```text
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 6.5s

On your tokens
  motion       4%          1,719 off
  z            8%            320 off
  type        29%         54,489 off
  elevation   51%          2,664 off
  color       64%         21,130 off
  radius      97%            196 off
  spacing     97%          1,072 off

Fix first
  ✗ 36 broken styles               the browser drops them           plumber check --broken
  ! 4 setup gaps                   type roles aren't configured     plumber check --rule config
  · 367 component overrides        callers restyle your components  plumber check --rule ownership
  · 769 values off your tokens     most in type                     plumber check --rule provenance
    font-mono 9,273 · text-xs 5,246 · leading-relaxed 4,489 · text-sm 4,333

This is your first run, so all of this counts as new.
  plumber baseline      record today's drift as debt; from then on only new drift fails
  Alt+B in dev          see every drift on the page and fix it there

More: --all (every finding, 5,126 lines) · --family <name> · --file <path> · --json
```

### --family type

```text
React Plumber  algorecall · Tailwind 4.2 · theme src/index.css · 3,534 files · 6.0s

  !  font-mono             raw type; use a named token                   9,273 sites in 1,667 files
     → font-numeric ('JetBrains Mono Variable', ui-monospace, monospace)
     js-core.tsx:492 · js-core.tsx:502 · mini-system.tsx:204 · CommitPhase.tsx:576 · +9,269

  !  [&_code]:font-mono    raw type; use a named token                   2 sites in 2 files
     → [&_code]:font-numeric ('JetBrains Mono Variable', ui-monospace, monospace)
     mdx-components.tsx:29 · LessonScreen.tsx:114

  !  fontFamily: 'var(--…  raw type; use a named token                   3 sites in 2 files
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)
     composition.tsx:674 · composition.tsx:678 · sc-b/InlineVisuals.tsx:634

  !  font: '8px var(--fo…  raw type; use a named token; off your type …  2 sites in 1 file
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace) · var(--text-2xs) (…
     EscapeAndOutsideClickPhase.tsx:1154 · EscapeAndOutsideClickPhase.tsx:1164

  !  font: '7px var(--fo…  raw type; use a named token; off your type …  src/advanced-…hase.tsx:1516
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace) · var(--text-2xs) (…

  !  fontFamily: 'var(--…  raw type; use a named token                   68 sites in 15 files
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)
     ModularDial.tsx:159 · ModularDial.tsx:200 · BuildTheRho.tsx:496 · BuildTheRho.tsx:509 · +64

  !  fontFamily: 'var(--…  raw type; use a named token                   src/platform/…works.tsx:544
     → var(--font-numeric) ('JetBrains Mono Variable', ui-monospace, monospace)

  !  text-xs               off your type scale (size and line-height)    5,246 sites in 1,417 files
     → text-xs-plus (0.7375rem) · text-sm-minus (0.8rem)
     CommitPhase.tsx:883 · DoubleBufferPhase.tsx:298 · DoubleBufferPhase.tsx:473 · +5,243

  !  text-2xl              off your type scale (size and line-height)    175 sites in 145 files
     → text-sm-minus (0.8rem)
     fiber-reconciler/phases/CompletionScreen.tsx:341 · hooks-are-arrays/FigureBlock.tsx:49 · +173

  !  sm:text-xs            off your type scale (size and line-height)    9 sites in 6 files
     → sm:text-xs-plus (0.7375rem) · sm:text-sm-minus (0.8rem)
     Sc4BothWays.tsx:569 · TrieBuilder.tsx:1904 · FreqMapTracker.tsx:1711 · +6

  !  md:text-xs            off your type scale (size and line-height)    src/pages/cur…ayout.tsx:238
     → md:text-xs-plus (0.7375rem) · md:text-sm-minus (0.8rem)

  !  md:text-2xl           off your type scale (size and line-height)    2 sites in 2 files
     → md:text-sm-minus (0.8rem)
     GraphLesson.tsx:109 · ChapterPrediction.tsx:68

  !  !text-xs              off your type scale (size and line-height)    src/pages/hom…round.tsx:408
     → !text-xs-plus (0.7375rem) · !text-sm-minus (0.8rem)

  !  [&_pre]:text-xs       off your type scale (size and line-height)    src/platform/…eBlock.tsx:46
     → [&_pre]:text-xs-plus (0.7375rem) · [&_pre]:text-sm-minus (0.8rem)

  !  xl:text-2xl           off your type scale (size and line-height)    src/problems/…space.tsx:289
     → xl:text-sm-minus (0.8rem)

  !  leading-relaxed       off your type scale                           4,489 sites in 1,004 files
     → No token is close to 1.625. Pick one with the design owner, or add one to the theme
     CommitPhase.tsx:504 · CommitPhase.tsx:509 · CommitPhase.tsx:883 · +4,486

  !  [&_p]:leading-relax…  off your type scale                           2 sites in 2 files
     → No token is close to 1.625. Pick one with the design owner, or add one to the theme
     PrivacyPage.tsx:18 · TermsPage.tsx:18

  !  [&_pre]:leading-rel…  off your type scale                           src/platform/…eBlock.tsx:46
     → No token is close to 1.625. Pick one with the design owner, or add one to the theme

  !  text-sm               off your type scale (size and line-height)    4,333 sites in 1,261 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     CommitPhase.tsx:905 · fiber-reconciler/phases/CompletionScreen.tsx:297 · +4,331

  !  md:text-sm            off your type scale (size and line-height)    8 sites in 8 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     SnapshotPhase.tsx:658 · ts-array-tuple-typefu/phases/CompletionScreen.tsx:339 · +6

  !  [&_code]:text-sm      off your type scale (size and line-height)    2 sites in 2 files
     → [&_code]:text-sm-minus (0.8rem) · [&_code]:text-xs-plus (0.7375rem)
     mdx-components.tsx:29 · LessonScreen.tsx:114

  !  sm:text-sm            off your type scale (size and line-height)    src/pages/hom…sonry.tsx:538
     → sm:text-sm-minus (0.8rem) · sm:text-xs-plus (0.7375rem)

  !  [&>span]:text-sm      off your type scale (size and line-height)    src/pages/pro…erBar.tsx:138
     → [&>span]:text-sm-minus (0.8rem) · [&>span]:text-xs-plus (0.7375rem)

  !  data-[variant=label…  off your type scale (size and line-height)    src/platform/…/field.tsx:31
     → data-[variant=label]:text-sm-minus (0.8rem) · data-[variant=label]:text-xs-plus (0.7375rem)

  !  file:text-sm          off your type scale (size and line-height)    src/platform/…/input.tsx:17
     → file:text-sm-minus (0.8rem) · file:text-xs-plus (0.7375rem)

  !  font-bold             off your type scale                           3,052 sites in 1,011 files
     → No token is close to 700. Pick one with the design owner, or add one to the theme
     phases/ShapePhase.tsx:722 · SwitchboardPhase.tsx:2171 · +3,050

  !  [&_h2]:font-bold      off your type scale                           2 sites in 2 files
     → No token is close to 700. Pick one with the design owner, or add one to the theme
     PrivacyPage.tsx:18 · TermsPage.tsx:18

  !  text-base             off your type scale (size and line-height)    2,973 sites in 775 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     CommitPhase.tsx:504 · CommitPhase.tsx:509 · +2,971

  !  md:text-base          off your type scale (size and line-height)    62 sites in 23 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     FiberStructPhase.tsx:510 · FiberStructPhase.tsx:599 · FiberStructPhase.tsx:774 · +59

  !  sm:text-base          off your type scale (size and line-height)    3 sites in 3 files
     → sm:text-sm-minus (0.8rem) · sm:text-xs-plus (0.7375rem)
     PatternItem.tsx:207 · LessonCaption.tsx:83 · PersonalizePhase.tsx:60

  !  data-[variant=legen…  off your type scale (size and line-height)    src/platform/…/field.tsx:31
     → data-[variant=legend]:text-sm-minus (0.8rem) · data-[variant=legend]:text-xs-plus (0.7375rem)

  !  leading-normal        off your type scale                           src/platform/…field.tsx:134
     → No token is close to 1.5. Pick one with the design owner, or add one to the theme

  !  font-semibold         off your type scale                           1,674 sites in 646 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme
     CommitPhase.tsx:643 · CommitPhase.tsx:905 · +1,672

  !  [&_strong]:font-sem…  off your type scale                           2 sites in 2 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme
     mdx-components.tsx:29 · LessonScreen.tsx:114

  !  **:[[cmdk-group-hea…  off your type scale                           src/platform/…mmand.tsx:125
     → No token is close to 600. Pick one with the design owner, or add one to the theme

  !  font-medium           off your type scale                           1,392 sites in 604 files
     → No token is close to 500. Pick one with the design owner, or add one to the theme
     WorkLoopPhase.tsx:410 · ChapterTwo.tsx:648 · instrument/parts.tsx:561 · +1,389

  !  [&_[class*=Instrume…  off your type scale                           3 sites in 1 file
     → No token is close to 500. Pick one with the design owner, or add one to the theme
     Proposals.tsx:362 · Proposals.tsx:795 · Proposals.tsx:796

  !  [&]:font-medium       off your type scale                           src/games/run…Button.tsx:56
     → No token is close to 500. Pick one with the design owner, or add one to the theme

  !  aria-[current=page]…  off your type scale                           9 sites in 1 file
     → No token is close to 500. Pick one with the design owner, or add one to the theme
     SiteHeader.tsx:100 · SiteHeader.tsx:358 · SiteHeader.tsx:368 · SiteHeader.tsx:382 · +5

  !  file:font-medium      off your type scale                           src/platform/…/input.tsx:17
     → No token is close to 500. Pick one with the design owner, or add one to the theme

  !  leading-[1.7]         off your type scale                           1,216 sites in 196 files
     → No token is close to 1.7. Pick one with the design owner, or add one to the theme
     FiberStructPhase.tsx:395 · FiberStructPhase.tsx:400 · FiberStructPhase.tsx:405 · +1,213

  !  tracking-[0.12em]     off your type scale                           1,171 sites in 401 files
     → No token is close to 0.12em. Pick one with the design owner, or add one to the theme
     CommitPhase.tsx:576 · CommitPhase.tsx:587 · CommitPhase.tsx:686 · CommitPhase.tsx:879 · +1,167

  !  tracking-wider        off your type scale                           1,147 sites in 487 files
     → No token is close to 0.05em. Pick one with the design owner, or add one to the theme
     ComponentClassPhase.tsx:724 · abstract-component/phases/EventDelegationPhase.tsx:826 · +1,145

  !  **:[[cmdk-group-hea…  off your type scale                           src/platform/…mmand.tsx:125
     → No token is close to 0.05em. Pick one with the design owner, or add one to the theme

  !  tracking-[0.14em]     off your type scale                           703 sites in 228 files
     → No token is close to 0.14em. Pick one with the design owner, or add one to the theme
     BatchPhase.tsx:176 · BatchPhase.tsx:185 · BatchPhase.tsx:211 · BatchPhase.tsx:260 · +699

  !  tracking-widest       off your type scale                           513 sites in 198 files
     → No token is close to 0.1em. Pick one with the design owner, or add one to the theme
     InstanceofAndArrayIsArrayPhase.tsx:984 · ThenReturnsPhase.tsx:529 · +511

  !  md:text-lg            off your type scale (size and line-height)    30 sites in 22 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     fiber-reconciler/phases/CompletionScreen.tsx:284 · +29

  !  text-lg               off your type scale (size and line-height)    420 sites in 312 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     hooks-are-arrays/FigureBlock.tsx:99 · ProfilePreview.tsx:53 · ChapterTwo.tsx:730 · +417

  !  sm:text-lg            off your type scale (size and line-height)    7 sites in 6 files
     → sm:text-sm-minus (0.8rem) · sm:text-xs-plus (0.7375rem)
     DesignSystemPage.tsx:244 · PatternItem.tsx:138 · hero-legacy/Hero.tsx:58 · +4

  !  [&_h2]:text-lg        off your type scale (size and line-height)    2 sites in 2 files
     → [&_h2]:text-sm-minus (0.8rem) · [&_h2]:text-xs-plus (0.7375rem)
     PrivacyPage.tsx:18 · TermsPage.tsx:18

  !  [&>p:first-child]:t…  off your type scale (size and line-height)    src/lld/primi…ection.tsx:48
     → [&>p:first-child]:text-sm-minus (0.8rem) · [&>p:first-child]:text-xs-plus (0.7375rem)

  !  font-[Instrument_Se…  off your type scale                           288 sites in 134 files
     → No token is close to Instrument Serif. Pick one with the design owner, or add one to the the…
     CompletionWorkshop.tsx:1039 · Sc1ParetoWall.tsx:559 · Sc1ParetoWall.tsx:637 · +285

  !  first-letter:font-[…  off your type scale                           src/pages/sho…Frame.tsx:105
     → No token is close to Instrument Serif. Pick one with the design owner, or add one to the the…

  !  tracking-wide         off your type scale                           251 sites in 73 files
     → No token is close to 0.025em. Pick one with the design owner, or add one to the theme
     SwitchboardPhase.tsx:2182 · HydrationPhase.tsx:706 · +249

  !  leading-snug          off your type scale                           206 sites in 146 files
     → No token is close to 1.375. Pick one with the design owner, or add one to the theme
     CommitPhase.tsx:599 · CommitPhase.tsx:700 · ProfilePreview.tsx:116 · ChapterOne.tsx:702 · +202

  !  [&>p:first-child]:l…  off your type scale                           src/lld/primi…ection.tsx:48
     → No token is close to 1.375. Pick one with the design owner, or add one to the theme

  !  leading-tight         off your type scale                           187 sites in 128 files
     → No token is close to 1.25. Pick one with the design owner, or add one to the theme
     ReconciliationPhase.tsx:671 · CompletionWorkshop.tsx:321 · CompletionWorkshop.tsx:502 · +184

  !  leading-[1.75]        off your type scale                           109 sites in 23 files
     → No token is close to 1.75. Pick one with the design owner, or add one to the theme
     SnapshotPhase.tsx:604 · SnapshotPhase.tsx:609 · SnapshotPhase.tsx:614 · +106

  !  text-xl               off your type scale (size and line-height)    86 sites in 75 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     hooks-are-arrays/FigureBlock.tsx:149 · Sc1ParetoWall.tsx:774 · TokensPhase.tsx:990 · +83

  !  md:text-xl            off your type scale (size and line-height)    9 sites in 8 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     BacktrackingLayout.tsx:432 · BfsDfsLayout.tsx:615 · DPTableLayout.tsx:313 · +6

  !  sm:text-xl            off your type scale (size and line-height)    src/pages/cur…aption.tsx:80
     → sm:text-sm-minus (0.8rem) · sm:text-xs-plus (0.7375rem)

  !  fontWeight: 600       off your type scale                           48 sites in 32 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme
     composition.tsx:674 · composition.tsx:678 · PauseResumePhase.tsx:1019 · +45

  !  fontWeight: active …  off your type scale                           2 sites in 2 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     deep-clone/phases/TypeDispatchPhase.tsx:1549 · Sc4RuntimeSwapUnderLoad.tsx:368

  !  fontWeight: active …  off your type scale                           6 sites in 5 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     AppendWallPhase.tsx:403 · OptimisticSendPhase.tsx:341 · StreamingChunksPhase.tsx:518 · +3

  !  fontWeight: leaf ? …  off your type scale                           src/advanced-…Phase.tsx:548
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isLeaf …  off your type scale                           2 sites in 2 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     DirtyPathRollupPhase.tsx:551 · LiveAggregationPhase.tsx:503

  !  fontWeight: row.isL…  off your type scale                           src/advanced-…Phase.tsx:427
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: remaini…  off your type scale                           src/lessons/c…tHook.tsx:199
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isTop &…  off your type scale                           src/lessons/p…ackViz.tsx:73
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: weight    off your type scale                           src/lld/modul…nDial.tsx:211
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: aWin ? …  off your type scale                           src/lld/modul…rface.tsx:439
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: bWin ? …  off your type scale                           src/lld/modul…rface.tsx:451
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: on ? 60…  off your type scale                           5 sites in 5 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     Sc4TheSimulation.tsx:166 · SpaceTimeNavigator.tsx:192 · laminate.tsx:193 · +2

  !  fontWeight: m.criti…  off your type scale                           src/lld/primi…anvas.tsx:328
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: correct…  off your type scale                           src/lld/primi…actor.tsx:455
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: method.…  off your type scale                           src/lld/primi…rator.tsx:202
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: picked …  off your type scale                           3 sites in 1 file
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     TradeoffComposer.tsx:310 · TradeoffComposer.tsx:362 · TradeoffComposer.tsx:518

  !  fontWeight: active …  off your type scale                           src/pages/cur…onCell.tsx:76
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: read ||…  off your type scale                           src/pages/cur…gator.tsx:220
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: dim ? 4…  off your type scale                           src/pages/hom…lates.tsx:126
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isMaxNo…  off your type scale                           src/problems/…Phase.tsx:757
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: mark.ac…  off your type scale                           src/problems/…Phase.tsx:345
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isDrag …  off your type scale                           src/problems/…Phase.tsx:356
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: idx ===…  off your type scale                           src/problems/…ence.tsx:2258
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === s…  off your type scale                           src/problems/…Phase.tsx:341
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isRevea…  off your type scale                           src/problems/…Phase.tsx:199
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isQuant…  off your type scale                           src/problems/…rnRow.tsx:157
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: reveale…  off your type scale                           src/problems/…parts.tsx:192
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: inRange…  off your type scale                           src/problems/…Phase.tsx:128
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === p…  off your type scale                           2 sites in 2 files
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…
     ClampingEdgePhase.tsx:389 · RangeDiscoveryPhase.tsx:409

  !  fontWeight: n >= lo…  off your type scale                           src/problems/…Phase.tsx:143
     → No token is close to 600. Pick one with the design owner, or add one to the theme. · No toke…

  !  tracking-[0.08em]     off your type scale                           86 sites in 26 files
     → No token is close to 0.08em. Pick one with the design owner, or add one to the theme
     ChapterOne.tsx:652 · instrument/parts.tsx:515 · +84

  !  tracking-tight        off your type scale                           85 sites in 73 files
     → No token is close to -0.025em. Pick one with the design owner, or add one to the theme
     ProfilePreview.tsx:53 · WalkerPhase.tsx:901 · es5-extends/phases/CompletionScreen.tsx:550 · +82

  !  font-normal           off your type scale                           78 sites in 40 files
     → No token is close to 400. Pick one with the design owner, or add one to the theme
     AriaProgressbarPhase.tsx:682 · AriaProgressbarPhase.tsx:683 · +76

  !  fontWeight: on ? 70…  off your type scale                           src/advanced-…hase.tsx:1278
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: 700       off your type scale                           51 sites in 22 files
     → No token is close to 700. Pick one with the design owner, or add one to the theme
     PointerSurgeon.tsx:2427 · PointerSurgeon.tsx:2491 · PointerSurgeon.tsx:2582 · +48

  !  fontWeight: i === l…  off your type scale                           src/lessons/c…suals.tsx:633
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: g === 0…  off your type scale                           src/lessons/c…Trial.tsx:205
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === c…  off your type scale                           src/lessons/c…ilder.tsx:601
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === a…  off your type scale                           src/lessons/c…suals.tsx:496
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isShare…  off your type scale                           src/lessons/c…suals.tsx:646
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isActiv…  off your type scale                           4 sites in 2 files
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…
     BracketValidator.tsx:297 · BinaryGroundingPhase.tsx:233 · BinaryGroundingPhase.tsx:258 · +1

  !  fontWeight: i === s…  off your type scale                           src/lessons/c…dator.tsx:780
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isMid ?…  off your type scale                           src/lessons/p…arch.tsx:2086
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === h…  off your type scale                           src/problems/…onary.tsx:184
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: st.best…  off your type scale                           src/problems/…irMap.tsx:114
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: char ==…  off your type scale                           src/problems/…code.tsx:1718
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: n.value…  off your type scale                           src/problems/…bber.tsx:1863
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === v…  off your type scale                           src/problems/…Phase.tsx:439
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isViola…  off your type scale                           src/problems/…Phase.tsx:201
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: isCurre…  off your type scale                           src/problems/…Phase.tsx:431
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  fontWeight: i === p…  off your type scale                           2 sites in 2 files
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…
     ClampingEdgePhase.tsx:296 · RangeDiscoveryPhase.tsx:316

  !  fontWeight: state.d…  off your type scale                           src/problems/…Phase.tsx:350
     → No token is close to 700. Pick one with the design owner, or add one to the theme. · No toke…

  !  text-[22px]           off your type scale                           61 sites in 31 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     accordion/phases/ProductionRecipePhase.tsx:1089 · CostClassifier.tsx:270 · +59

  !  md:text-[22px]        off your type scale                           src/coach/Coa…efing.tsx:383
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)

  !  leading-[22px]        off your type scale                           8 sites in 4 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     ModuleCSynthesis.tsx:279 · InlineCodeBridge.tsx:860 · InlineCodeBridge.tsx:925 · +5

  !  text-3xl              off your type scale (size and line-height)    59 sites in 53 files
     → No token is close to 1.2. Pick one with the design owner, or add one to the theme. · No toke…
     phases/Completion.tsx:81 · HalfStarsPhase.tsx:585 · HoverPreviewPhase.tsx:480 · +56

  !  md:text-3xl           off your type scale (size and line-height)    7 sites in 7 files
     → No token is close to 1.2. Pick one with the design owner, or add one to the theme. · No toke…
     CompletionWorkshop.tsx:1039 · Sc1ParetoWall.tsx:559 · Sc5PickYourWire.tsx:656 · +4

  !  sm:text-3xl           off your type scale (size and line-height)    4 sites in 4 files
     → No token is close to 1.2. Pick one with the design owner, or add one to the theme. · No toke…
     PatternItem.tsx:204 · Recall.tsx:314 · PersonalizePhase.tsx:57 · ShowcasePhase.tsx:148

  !  leading-[1.6]         off your type scale                           62 sites in 44 files
     → No token is close to 1.6. Pick one with the design owner, or add one to the theme
     TokensPhase.tsx:1296 · SingleVsMultiPhase.tsx:1129 · CycleTrapPhase.tsx:906 · +59

  !  tracking-[-0.01em]    off your type scale                           60 sites in 28 files
     → No token is close to -0.01em. Pick one with the design owner, or add one to the theme
     ChapterTwo.tsx:730 · instrument/parts.tsx:446 · instrument/parts.tsx:561 · +57

  !  fontWeight: 400       off your type scale                           2 sites in 2 files
     → No token is close to 400. Pick one with the design owner, or add one to the theme
     WorkbenchShell.tsx:869 · Stage.tsx:297

  !  sm:text-4xl           off your type scale (size and line-height)    4 sites in 4 files
     → No token is close to 1.11111111. Pick one with the design owner, or add one to the theme. · …
     phases/Completion.tsx:81 · GraphLesson.tsx:234 · AttractPhase.tsx:147 · LaunchPhase.tsx:151

  !  text-4xl              off your type scale (size and line-height)    50 sites in 46 files
     → No token is close to 1.11111111. Pick one with the design owner, or add one to the theme. · …
     star-rating/phases/CompletionScreen.tsx:114 · kit.tsx:57 · Motion.tsx:85 · +47

  !  md:text-4xl           off your type scale (size and line-height)    3 sites in 2 files
     → No token is close to 1.11111111. Pick one with the design owner, or add one to the theme. · …
     ChapterLesson.tsx:226 · ChapterLesson.tsx:296 · ExplainerShell.tsx:82

  !  tracking-[0.1em]      off your type scale                           42 sites in 27 files
     → No token is close to 0.1em. Pick one with the design owner, or add one to the theme
     ScopeWorld.tsx:190 · ChapterTwo.tsx:727 · instrument/parts.tsx:150 · +39

  !  tracking-[-0.02em]    off your type scale                           40 sites in 23 files
     → No token is close to -0.02em. Pick one with the design owner, or add one to the theme
     hooks-are-arrays/FigureBlock.tsx:149 · kit.tsx:70 · kit.tsx:124 · Principles.tsx:25 · +36

  !  text-[9px]            off your type scale                           38 sites in 23 files
     → text-2xs (0.625rem) · text-xxs (0.6875rem)
     es5-extends/phases/CompletionScreen.tsx:550 · ObjectCreateRescuePhase.tsx:1489 · +36

  !  leading-loose         off your type scale                           35 sites in 24 files
     → No token is close to 2. Pick one with the design owner, or add one to the theme
     sc-2/RefactorRatchet.tsx:460 · LevelOrderFill.tsx:185 · IterativeDFSFill.tsx:178 · +32

  !  text-[15px]           off your type scale                           32 sites in 17 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     SingleVsMultiPhase.tsx:521 · SingleVsMultiPhase.tsx:526 · SingleVsMultiPhase.tsx:557 · +29

  !  text-[7px]            off your type scale                           32 sites in 23 files
     → text-2xs (0.625rem) · text-xxs (0.6875rem)
     NaiveGrid.tsx:151 · ParallelTimelines.tsx:426 · ParallelTimelines.tsx:675 · +29

  !  md:text-[17px]        off your type scale                           14 sites in 7 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     SingleVsMultiPhase.tsx:455 · SingleVsMultiPhase.tsx:460 · PanelLifecyclePhase.tsx:447 · +11

  !  text-[17px]           off your type scale                           17 sites in 17 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     AbortableFetchPhase.tsx:1592 · markdown-editor/phases/ProductionRecipePhase.tsx:522 · +15

  !  text-5xl              off your type scale (size and line-height)    7 sites in 5 files
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …
     DesignSystemPage.tsx:241 · Typography.tsx:83 · Typography.tsx:93 · Typography.tsx:102 · +3

  !  sm:text-6xl           off your type scale (size and line-height)    3 sites in 3 files
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …
     DesignSystemPage.tsx:241 · hero-legacy/Hero.tsx:47 · hero/Hero.tsx:127

  !  sm:text-5xl           off your type scale (size and line-height)    10 sites in 9 files
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …
     kit.tsx:57 · Finale.tsx:138 · acts/NameIt.tsx:227 · OpenLibrary.tsx:84 · +6

  !  md:text-5xl           off your type scale (size and line-height)    3 sites in 3 files
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …
     CompletionScreenTemplate.tsx:285 · GameShowcase.tsx:124 · GraphLesson.tsx:234

  !  text-6xl              off your type scale (size and line-height)    src/lessons/p…plate.tsx:308
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …

  !  md:text-7xl           off your type scale (size and line-height)    src/lessons/p…plate.tsx:308
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …

  !  md:text-6xl           off your type scale (size and line-height)    src/pages/hom…ockCTA.tsx:81
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …

  !  lg:text-7xl           off your type scale (size and line-height)    src/pages/hom…ockCTA.tsx:81
     → No token is close to 1. Pick one with the design owner, or add one to the theme. · No token …

  !  fontSize: 8           off your type scale                           18 sites in 12 files
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     composition.tsx:674 · composition.tsx:678 · SwitchboardPhase.tsx:1768 · +15

  !  fontSize: n.label.l…  off your type scale                           src/lessons/c…ilder.tsx:258
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontSize: isMini ? …  off your type scale                           src/lessons/p…ttice.tsx:313
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontSize: '8px'       off your type scale                           4 sites in 2 files
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     BottleneckPatternPhase.tsx:214 · BottleneckPatternPhase.tsx:448 · +2

  !  tracking-[-0.035em]   off your type scale                           25 sites in 21 files
     → No token is close to -0.035em. Pick one with the design owner, or add one to the theme
     phases/Completion.tsx:81 · kit.tsx:57 · Colour.tsx:316 · Components.tsx:605 · +21

  !  fontSize: 7           off your type scale                           19 sites in 11 files
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     SwitchboardPhase.tsx:1546 · TransferChallenge.tsx:251 · EvenOddMidpointLab.tsx:192 · +16

  !  fontSize: n.label.l…  off your type scale                           src/lessons/c…lenge.tsx:235
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontSize: '7px'       off your type scale                           2 sites in 1 file
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     SkipAheadPhase.tsx:437 · SkipAheadPhase.tsx:739

  !  fontSize: 9           off your type scale                           22 sites in 16 files
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     PauseResumePhase.tsx:1023 · PauseResumePhase.tsx:1100 · MemoryPlate.tsx:141 · +19

  !  fontSize: Math.max(…  off your type scale                           src/lessons/c…ndbox.tsx:212
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontSize: '9px'       off your type scale                           src/problems/…Phase.tsx:528
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontFamily: 'ui-mon…  off your type scale                           19 sites in 6 files
     → No token is close to ui-monospace. Pick one with the design owner, or add one to the theme
     PauseResumePhase.tsx:1016 · PauseResumePhase.tsx:1019 · PauseResumePhase.tsx:1023 · +16

  !  tracking-normal       off your type scale                           17 sites in 13 files
     → No token is close to 0em. Pick one with the design owner, or add one to the theme
     debounce/phases/ThisAndArgsPhase.tsx:662 · ThenReturnsPhase.tsx:541 · +15

  !  text-[28px]           off your type scale                           15 sites in 12 files
     → No token is close to 28px. Pick one with the design owner, or add one to the theme
     CoachBriefing.tsx:413 · Proposals.tsx:620 · GameCompletionBanner.tsx:89 · +12

  !  md:text-[28px]        off your type scale                           src/pages/Cab…tPage.tsx:169
     → No token is close to 28px. Pick one with the design owner, or add one to the theme

  !  tracking-[0.16em]     off your type scale                           15 sites in 14 files
     → No token is close to 0.16em. Pick one with the design owner, or add one to the theme
     accordion/phases/CompletionScreen.tsx:207 · deep-clone/phases/CompletionScreen.tsx:267 · +13

  !  tracking-[-0.03em]    off your type scale                           15 sites in 12 files
     → No token is close to -0.03em. Pick one with the design owner, or add one to the theme
     hooks-are-arrays/FigureBlock.tsx:49 · DesignSystemPage.tsx:263 · Delight.tsx:349 · +12

  !  fontWeight: 800       off your type scale                           13 sites in 6 files
     → No token is close to 800. Pick one with the design owner, or add one to the theme
     BugParade.tsx:415 · BugParade.tsx:450 · BugParade.tsx:486 · EvenOddMidpointLab.tsx:193 · +9

  !  text-[48px]           off your type scale                           9 sites in 3 files
     → No token is close to 48px. Pick one with the design owner, or add one to the theme
     SweepLineBuilder.tsx:618 · SweepLineBuilder.tsx:666 · SweepLineBuilder.tsx:1119 · +6

  !  md:text-[48px]        off your type scale                           2 sites in 1 file
     → No token is close to 48px. Pick one with the design owner, or add one to the theme
     XORTrieGreedyRace.tsx:1677 · XORTrieGreedyRace.tsx:1685

  !  text-[40px]           off your type scale                           11 sites in 8 files
     → No token is close to 40px. Pick one with the design owner, or add one to the theme
     XORTrieGreedyRace.tsx:1677 · XORTrieGreedyRace.tsx:1685 · LinearSearchChallenge.tsx:395 · +8

  !  fontSize: 12          off your type scale                           10 sites in 10 files
     → var(--text-xs-plus) (0.7375rem) · var(--text-sm-minus) (0.8rem)
     SwitchboardPhase.tsx:1905 · UseHookPhase.tsx:145 · PointerSurgeon.tsx:2680 · +7

  !  fontSize              off your type scale                           2 sites in 2 files
     → var(--text-xs-plus) (0.7375rem) · var(--text-sm-minus) (0.8rem)
     BoundaryPilot.tsx:1362 · sc-a/InlineVisuals.tsx:596

  !  fontSize: 14          off your type scale                           5 sites in 2 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     SwitchboardPhase.tsx:1819 · PointerSurgeon.tsx:2426 · PointerSurgeon.tsx:2631 · +2

  !  fontSize: '14px'      off your type scale                           5 sites in 2 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     SynthesisProof.tsx:291 · ExistenceProofPhase.tsx:361 · ExistenceProofPhase.tsx:375 · +2

  !  fontFamily: 'ui-mon…  off your type scale                           11 sites in 2 files
     → No token is close to ui-monospace, SFMono-Regular, Menlo, monospace. Pick one with the desig…
     Sc1OnionOfStreams.tsx:518 · Sc1OnionOfStreams.tsx:534 · Sc1OnionOfStreams.tsx:585 · +8

  !  text-[18px]           off your type scale                           7 sites in 4 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     CoachBriefing.tsx:442 · LldHomePage.tsx:347 · LldHomePage.tsx:462 · +4

  !  md:text-[18px]        off your type scale                           3 sites in 3 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     ComponentMerger.tsx:851 · GameCompletionBanner.tsx:97 · PredictionGate.tsx:381

  !  tracking-[0.18em]     off your type scale                           10 sites in 8 files
     → No token is close to 0.18em. Pick one with the design owner, or add one to the theme
     StructuredCloneRevealPhase.tsx:757 · SymbolToStringTagPhase.tsx:597 · +8

  !  leading-[1.05]        off your type scale                           9 sites in 7 files
     → No token is close to 1.05. Pick one with the design owner, or add one to the theme
     CoachBriefing.tsx:181 · kit.tsx:57 · Typography.tsx:83 · Typography.tsx:93 · +5

  !  text-[0.92em]         off your type scale                           9 sites in 2 files
     → No token is close to 0.92em. Pick one with the design owner, or add one to the theme
     RichText.tsx:56 · RichText.tsx:306 · richtext-array.tsx:20 · richtext-array.tsx:62 · +5

  !  text-[8px]            off your type scale                           9 sites in 4 files
     → text-2xs (0.625rem) · text-xxs (0.6875rem)
     SpecimenCard.tsx:105 · SpecimenCard.tsx:113 · SpecimenCard.tsx:121 · SpecimenCard.tsx:129 · +5

  !  leading-[1.5]         off your type scale                           9 sites in 9 files
     → No token is close to 1.5. Pick one with the design owner, or add one to the theme
     AbortableFetchPhase.tsx:1592 · markdown-editor/phases/ProductionRecipePhase.tsx:522 · +7

  !  fontFamily: SERIF     off your type scale                           9 sites in 5 files
     → No token is close to 'Instrument Serif', serif. Pick one with the design owner, or add one t…
     hero-legacy/Hero.tsx:48 · hero-legacy/Hero.tsx:93 · GameShowcase.tsx:125 · +6

  !  fontFamily: 'ui-san…  off your type scale                           9 sites in 1 file
     → No token is close to ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI"…
     CollectorAlgorithmCardShowcase.tsx:212 · CollectorAlgorithmCardShowcase.tsx:240 · +7

  !  fontSize: 13          off your type scale                           5 sites in 5 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     LevelStepper.tsx:259 · ZigzagChallenge.tsx:229 · IterativeStepThrough.tsx:280 · +2

  !  fontSize: i === lin…  off your type scale                           src/lessons/c…suals.tsx:635
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontSize: SVG.node.…  off your type scale                           3 sites in 3 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     KahnsScrubber.tsx:244 · DFSFinishTimeScrubber.tsx:313 · LotRaceSimulator.tsx:477

  !  md:text-[72px]        off your type scale                           5 sites in 3 files
     → No token is close to 72px. Pick one with the design owner, or add one to the theme
     GameCompletionBanner.tsx:85 · PhaseCompleteScreen.tsx:116 · XORTrieGreedyRace.tsx:1138 · +2

  !  text-[72px]           off your type scale                           3 sites in 3 files
     → No token is close to 72px. Pick one with the design owner, or add one to the theme
     StatsPage.tsx:272 · number-of-1-bits/phases/CompletionPhase.tsx:119 · +1

  !  text-[32px]           off your type scale                           7 sites in 4 files
     → No token is close to 32px. Pick one with the design owner, or add one to the theme
     CoachBriefing.tsx:99 · LinearSearchChallenge.tsx:324 · LinearSearchChallenge.tsx:333 · +4

  !  md:text-[32px]        off your type scale                           src/problems/…nPhase.tsx:98
     → No token is close to 32px. Pick one with the design owner, or add one to the theme

  !  font-weight: 500      off your type scale                           2 sites in 1 file
     → No token is close to 500. Pick one with the design owner, or add one to the theme
     theme.css:50 · theme.css:598

  !  text-[20px]           off your type scale                           5 sites in 3 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     CoachBriefing.tsx:383 · CabinetPage.tsx:138 · StatsPage.tsx:275 · StatsPage.tsx:333 · +1

  !  leading-[20px]        off your type scale                           2 sites in 2 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     KahnCodeBridge.tsx:455 · QueueStarvation.tsx:348

  !  letterSpacing: '0.1…  off your type scale                           5 sites in 3 files
     → No token is close to 0.14em. Pick one with the design owner, or add one to the theme
     DualHeapVis.tsx:196 · DualHeapVis.tsx:206 · DualHeapVis.tsx:424 · +2

  !  letterSpacing: "0.1…  off your type scale                           2 sites in 1 file
     → No token is close to 0.14em. Pick one with the design owner, or add one to the theme
     CollectorAlgorithmCardShowcase.tsx:464 · CollectorAlgorithmCardShowcase.tsx:480

  !  text-[14px]           off your type scale                           6 sites in 5 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     debounce/phases/ThisAndArgsPhase.tsx:954 · PrototypeChainRevealPhase.tsx:707 · +4

  !  tracking-[0.06em]     off your type scale                           6 sites in 5 files
     → No token is close to 0.06em. Pick one with the design owner, or add one to the theme
     ChapterOne.tsx:704 · ChapterTwo.tsx:807 · instrument/parts.tsx:450 · +3

  !  fontFamily: '"Iowan…  off your type scale                           6 sites in 1 file
     → No token is close to "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif.…
     CollectorAlgorithmCardShowcase.tsx:758 · CollectorAlgorithmCardShowcase.tsx:771 · +4

  !  fontSize: 6.5         off your type scale                           6 sites in 5 files
     → var(--text-2xs) (0.625rem)
     first-slab.tsx:104 · lost.tsx:58 · lost.tsx:67 · mastered.tsx:90 · +2

  !  text-[13px]           off your type scale                           5 sites in 2 files
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)
     SpecimenCard.tsx:250 · CollectorAlgorithmCardShowcase.tsx:565 · +3

  !  leading-[1.55]        off your type scale                           5 sites in 5 files
     → No token is close to 1.55. Pick one with the design owner, or add one to the theme
     SlotSizingPhase.tsx:430 · PrototypeChainRevealPhase.tsx:680 · CoachBriefing.tsx:199 · +2

  !  text-[6px]            off your type scale                           5 sites in 3 files
     → text-2xs (0.625rem)
     backtracking/sc-1/SynthesisQuiz.tsx:83 · backtracking/sc-1/SynthesisQuiz.tsx:96 · +3

  !  leading-7             off your type scale                           5 sites in 2 files
     → No token is close to 1.75rem. Pick one with the design owner, or add one to the theme
     CollectorAlgorithmCardShowcase.tsx:794 · CollectorAlgorithmCardShowcase.tsx:807 · +3

  !  letterSpacing: 0.6    off your type scale                           5 sites in 3 files
     → No token is close to 0.6px. Pick one with the design owner, or add one to the theme
     PauseResumePhase.tsx:1016 · PauseResumePhase.tsx:1041 · PauseResumePhase.tsx:1092 · +2

  !  fontSize: 18          off your type scale                           2 sites in 2 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     PointerSurgeon.tsx:2583 · Sc3TwoClientsOneBucket.tsx:1110

  !  fontSize: '18px'      off your type scale                           src/lessons/c…Proof.tsx:291
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontSize: counterVa…  off your type scale                           src/lessons/c…tHook.tsx:390
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontFamily: 'ui-mon…  off your type scale                           5 sites in 3 files
     → No token is close to ui-monospace, monospace. Pick one with the design owner, or add one to …
     complexity-duel/ComplexityDuel.tsx:332 · complexity-duel/ComplexityDuel.tsx:348 · +3

  !  tracking-[-0.04em]    off your type scale                           4 sites in 4 files
     → No token is close to -0.04em. Pick one with the design owner, or add one to the theme
     DesignSystemPage.tsx:241 · Typography.tsx:83 · hero/Hero.tsx:127 · PaletteLab.tsx:122

  !  text-[16px]           off your type scale                           src/advanced-…hase.tsx:1965
     → text-sm-minus (0.8rem) · text-xs-plus (0.7375rem)

  !  md:text-[16px]        off your type scale                           2 sites in 2 files
     → md:text-sm-minus (0.8rem) · md:text-xs-plus (0.7375rem)
     GameCompletionBanner.tsx:101 · EditorialReveal.tsx:60

  !  leading-[16px]        off your type scale                           src/lessons/c…eCode.tsx:327
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  leading-[1.1]         off your type scale                           4 sites in 4 files
     → No token is close to 1.1. Pick one with the design owner, or add one to the theme
     SpecimenCard.tsx:219 · CompletionScreenTemplate.tsx:285 · AuthLayout.tsx:70 · Stage.tsx:294

  !  text-[56px]           off your type scale                           4 sites in 4 files
     → No token is close to 56px. Pick one with the design owner, or add one to the theme
     Proposals.tsx:619 · GameCompletionBanner.tsx:85 · PhaseCompleteScreen.tsx:116 · +1

  !  leading-[1.02]        off your type scale                           4 sites in 4 files
     → No token is close to 1.02. Pick one with the design owner, or add one to the theme
     DesignSystemPage.tsx:241 · hero/Hero.tsx:127 · PaletteLab.tsx:122 · PatternGlyph.tsx:341

  !  tracking-[0.15em]     off your type scale                           4 sites in 2 files
     → No token is close to 0.15em. Pick one with the design owner, or add one to the theme
     SkillTreePage.tsx:388 · SkillTreePage.tsx:409 · SkillTreePage.tsx:529 · GameShowcase.tsx:132

  !  text-[0.82em]         off your type scale                           4 sites in 1 file
     → No token is close to 0.82em. Pick one with the design owner, or add one to the theme
     RichText.tsx:54 · RichText.tsx:274 · RichText.tsx:275 · RichText.tsx:275

  !  lineHeight: 1         off your type scale                           4 sites in 4 files
     → No token is close to 1. Pick one with the design owner, or add one to the theme
     InDegreeSandbox.tsx:213 · GlowNode.tsx:147 · Sc2Multiplicity.tsx:1031 · AchievementCard.tsx:198

  !  letterSpacing: '0.0…  off your type scale                           4 sites in 3 files
     → No token is close to 0.08em. Pick one with the design owner, or add one to the theme
     HouseRobberII.tsx:2283 · HouseRobberII.tsx:2294 · AchievementCard.tsx:170 · +1

  !  font-weight: 300 700  off your type scale                           3 sites in 1 file
     → No token is close to 300. Pick one with the design owner, or add one to the theme
     theme.css:571 · theme.css:579 · theme.css:587

  !  fontWeight: 300       off your type scale                           src/skill-tre…tCard.tsx:196
     → No token is close to 300. Pick one with the design owner, or add one to the theme

  !  letter-spacing: -0.…  off your type scale                           src/theme.css:600
     → No token is close to -0.02em. Pick one with the design owner, or add one to the theme

  !  letterSpacing: coun…  off your type scale                           src/lessons/c…tHook.tsx:391
     → No token is close to -0.02em. Pick one with the design owner, or add one to the theme. · No …

  !  letterSpacing: '-0.…  off your type scale                           2 sites in 2 files
     → No token is close to -0.02em. Pick one with the design owner, or add one to the theme
     mastered.tsx:87 · CardRevealContent.tsx:546

  !  text-[36px]           off your type scale                           src/coach/Coa…efing.tsx:181
     → No token is close to 36px. Pick one with the design owner, or add one to the theme

  !  md:text-[36px]        off your type scale                           2 sites in 2 files
     → No token is close to 36px. Pick one with the design owner, or add one to the theme
     GameCompletionBanner.tsx:89 · PhaseCompleteScreen.tsx:120

  !  tracking-[-0.025em]   off your type scale                           3 sites in 3 files
     → No token is close to -0.025em. Pick one with the design owner, or add one to the theme
     ComingUp.tsx:72 · PractiseRows.tsx:100 · RecallCurve.tsx:287

  !  text-[24px]           off your type scale                           3 sites in 3 files
     → text-sm-minus (0.8rem)
     CoachBriefing.tsx:326 · LldHomePage.tsx:245 · EditorialMasthead.tsx:72

  !  leading-[1.85]        off your type scale                           3 sites in 3 files
     → No token is close to 1.85. Pick one with the design owner, or add one to the theme
     ChapterTwo.tsx:338 · instrument/parts.tsx:74 · timeline.tsx:106

  !  leading-[1.08]        off your type scale                           3 sites in 2 files
     → No token is close to 1.08. Pick one with the design owner, or add one to the theme
     HeroToybox.tsx:58 · HeroToybox.tsx:67 · UnlockCTA.tsx:81

  !  text-[26px]           off your type scale                           3 sites in 3 files
     → No token is close to 26px. Pick one with the design owner, or add one to the theme
     CabinetPage.tsx:169 · LldHomePage.tsx:254 · PacificAtlantic.tsx:1420

  !  tracking-[0.2em]      off your type scale                           3 sites in 3 files
     → No token is close to 0.2em. Pick one with the design owner, or add one to the theme
     SpecimenCard.tsx:201 · GraphLesson.tsx:103 · HeroToybox.tsx:48

  !  fontSize: 28          off your type scale                           src/skill-tre…ntent.tsx:543
     → No token is close to 28px. Pick one with the design owner, or add one to the theme

  !  font-family: 'Instr…  off your type scale                           3 sites in 1 file
     → No token is close to 'Instrument Serif'. Pick one with the design owner, or add one to the t…
     theme.css:568 · theme.css:576 · theme.css:584

  !  !leading-5            off your type scale                           src/pages/hom…round.tsx:408
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  leading-5             off your type scale                           2 sites in 1 file
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     PracticeWorkspace.tsx:302 · PracticeWorkspace.tsx:308

  !  letterSpacing: 0.5    off your type scale                           3 sites in 2 files
     → No token is close to 0.5px. Pick one with the design owner, or add one to the theme
     SwitchboardPhase.tsx:1529 · SwitchboardPhase.tsx:1546 · GodClassExtractor.tsx:491

  !  fontSize: 5           off your type scale                           3 sites in 1 file
     → No token is close to 5px. Pick one with the design owner, or add one to the theme
     sc-f/InlineVisuals.tsx:524 · sc-f/InlineVisuals.tsx:528 · sc-f/InlineVisuals.tsx:532

  !  fontSize: 22          off your type scale                           src/lessons/c…atomy.tsx:455
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  leading-4             off your type scale                           3 sites in 3 files
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     CourseIndex.tsx:280 · SpaceTimeNavigator.tsx:163 · BugHuntVignette.tsx:52

  !  fontSize: 6           off your type scale                           src/lessons/c…suals.tsx:518
     → var(--text-2xs) (0.625rem)

  !  fontFamily: 'monosp…  off your type scale                           3 sites in 3 files
     → No token is close to monospace. Pick one with the design owner, or add one to the theme
     PointerSurgeon.tsx:2491 · InlineCodeBridge.tsx:395 · ArcVisualizationPhase.tsx:273

  !  letterSpacing: '0.1…  off your type scale                           3 sites in 2 files
     → No token is close to 0.1em. Pick one with the design owner, or add one to the theme
     DualHeapVis.tsx:467 · AchievementCard.tsx:131 · AchievementCard.tsx:221

  !  letterSpacing: '0.1…  off your type scale                           3 sites in 2 files
     → No token is close to 0.12em. Pick one with the design owner, or add one to the theme
     Sc1SimuduckHitsTheWall.tsx:557 · CardRevealContent.tsx:422 · CardRevealContent.tsx:510

  !  font-light            off your type scale                           3 sites in 2 files
     → No token is close to 300. Pick one with the design owner, or add one to the theme
     TrieBuilder.tsx:1756 · TrieBuilder.tsx:1758 · Cover.tsx:47

  !  font-black            off your type scale                           3 sites in 3 files
     → No token is close to 900. Pick one with the design owner, or add one to the theme
     FindCostLab.tsx:814 · LinkedListLayout.tsx:169 · SessionSummary.tsx:109

  !  text-[0.85em]         off your type scale                           2 sites in 2 files
     → No token is close to 0.85em. Pick one with the design owner, or add one to the theme
     instrument/parts.tsx:569 · NotFoundPage.tsx:60

  !  text-[1.04em]         off your type scale                           2 sites in 1 file
     → No token is close to 1.04em. Pick one with the design owner, or add one to the theme
     RichText.tsx:49 · RichText.tsx:255

  !  text-[1.1em]          off your type scale                           2 sites in 1 file
     → No token is close to 1.1em. Pick one with the design owner, or add one to the theme
     RichText.tsx:57 · RichText.tsx:310

  !  text-[0.75em]         off your type scale                           2 sites in 1 file
     → No token is close to 0.75em. Pick one with the design owner, or add one to the theme
     richtext-array.tsx:25 · richtext-array.tsx:56

  !  md:text-[4.2rem]      off your type scale                           2 sites in 1 file
     → No token is close to 4.2rem. Pick one with the design owner, or add one to the theme
     HeroToybox.tsx:58 · HeroToybox.tsx:67

  !  text-[5px]            off your type scale                           2 sites in 2 files
     → No token is close to 5px. Pick one with the design owner, or add one to the theme
     StackTracer.tsx:290 · backtracking/sc-1/SynthesisQuiz.tsx:44

  !  text-[96px]           off your type scale                           src/pages/StatsPage.tsx:203
     → No token is close to 96px. Pick one with the design owner, or add one to the theme

  !  md:text-[96px]        off your type scale                           src/problems/…nPhase.tsx:70
     → No token is close to 96px. Pick one with the design owner, or add one to the theme

  !  text-[0.94em]         off your type scale                           2 sites in 1 file
     → No token is close to 0.94em. Pick one with the design owner, or add one to the theme
     RichText.tsx:46 · RichText.tsx:224

  !  leading-[0.88]        off your type scale                           2 sites in 2 files
     → No token is close to 0.88. Pick one with the design owner, or add one to the theme
     CollectorAlgorithmCardShowcase.tsx:770 · Cover.tsx:43

  !  sm:text-[3.5rem]      off your type scale                           2 sites in 1 file
     → No token is close to 3.5rem. Pick one with the design owner, or add one to the theme
     HeroToybox.tsx:58 · HeroToybox.tsx:67

  !  text-[2.6rem]         off your type scale                           2 sites in 1 file
     → No token is close to 2.6rem. Pick one with the design owner, or add one to the theme
     HeroToybox.tsx:58 · HeroToybox.tsx:67

  !  tracking-[0.28em]     off your type scale                           2 sites in 2 files
     → No token is close to 0.28em. Pick one with the design owner, or add one to the theme
     JsonFallbackPhase.tsx:623 · UndefinedFunctionDropPhase.tsx:724

  !  tracking-[0.36em]     off your type scale                           2 sites in 1 file
     → No token is close to 0.36em. Pick one with the design owner, or add one to the theme
     CollectorAlgorithmCardShowcase.tsx:565 · CollectorAlgorithmCardShowcase.tsx:597

  !  letterSpacing: 0.2    off your type scale                           2 sites in 2 files
     → No token is close to 0.2px. Pick one with the design owner, or add one to the theme
     ClassDiagramCanvas.tsx:271 · MethodMigrator.tsx:312

  !  leading-6             off your type scale                           2 sites in 2 files
     → var(--text-sm-minus) (0.8rem)
     CollectorAlgorithmCardShowcase.tsx:871 · PracticeWorkspace.tsx:230

  !  line-height: 1.75     off your type scale                           2 sites in 1 file
     → No token is close to 1.75. Pick one with the design owner, or add one to the theme
     theme.css:348 · theme.css:909

  !  fontFamily: INSTRUM…  off your type scale                           2 sites in 2 files
     → No token is close to 'Instrument Serif', 'PP Editorial Old', 'Cormorant Garamond', Georgia, …
     WorkbenchShell.tsx:868 · Stage.tsx:296

  !  fontSize: 9.5         off your type scale                           2 sites in 2 files
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)
     MemoryPlate.tsx:220 · PairMap.tsx:78

  !  letterSpacing: '-0.…  off your type scale                           2 sites in 2 files
     → No token is close to -0.01em. Pick one with the design owner, or add one to the theme
     AchievementCard.tsx:149 · SkillCard.tsx:205

  !  lineHeight: `${BOX_…  off your type scale                           2 sites in 1 file
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)
     ClassDiagramCanvas.tsx:293 · ClassDiagramCanvas.tsx:326

  !  lineHeight: 0         off your type scale                           2 sites in 2 files
     → No token is close to 0. Pick one with the design owner, or add one to the theme
     AfIcon.tsx:50 · ProblemIcon.tsx:56

  !  letterSpacing: 0.3    off your type scale                           2 sites in 2 files
     → No token is close to 0.3px. Pick one with the design owner, or add one to the theme
     SwitchboardPhase.tsx:1768 · MethodMigrator.tsx:369

  !  letterSpacing: 1      off your type scale                           2 sites in 1 file
     → No token is close to 1px. Pick one with the design owner, or add one to the theme
     PointerSurgeon.tsx:1366 · PointerSurgeon.tsx:1385

  !  fontSize: 'clamp(40…  off your type scale                           2 sites in 2 files
     → No token is close to clamp(40px, 6vw, 72px). Pick one with the design owner, or add one to t…
     ChapterFrame.tsx:96 · Colophon.tsx:53

  !  fontSize: 32          off your type scale                           2 sites in 2 files
     → No token is close to 32px. Pick one with the design owner, or add one to the theme
     PhaseGreedy.tsx:465 · AchievementCard.tsx:195

  !  tracking-[-0.005em]   off your type scale                           src/cabinet/S…nCard.tsx:219
     → No token is close to -0.005em. Pick one with the design owner, or add one to the theme

  !  leading-[1.06]        off your type scale                           src/pages/hom…y/Hero.tsx:47
     → No token is close to 1.06. Pick one with the design owner, or add one to the theme

  !  leading-[2]           off your type scale                           src/lessons/c…Bridge.tsx:69
     → No token is close to 2. Pick one with the design owner, or add one to the theme

  !  tracking-[0.10em]     off your type scale                           src/lessons/p…ridge.tsx:841
     → No token is close to 0.10em. Pick one with the design owner, or add one to the theme

  !  text-[64px]           off your type scale                           src/pages/Lld…ePage.tsx:391
     → No token is close to 64px. Pick one with the design owner, or add one to the theme

  !  md:text-[7rem]        off your type scale                           src/pages/hom…Lesson.tsx:84
     → No token is close to 7rem. Pick one with the design owner, or add one to the theme

  !  text-[2.75rem]        off your type scale                           src/pages/hom…/Hero.tsx:127
     → No token is close to 2.75rem. Pick one with the design owner, or add one to the theme

  !  text-[0.7rem]         off your type scale                           src/advanced-…Check.tsx:332
     → text-xxs (0.6875rem) · text-xs-plus (0.7375rem)

  !  first-letter:leadin…  off your type scale                           src/pages/sho…Frame.tsx:105
     → No token is close to 0.85. Pick one with the design owner, or add one to the theme

  !  tracking-[0.24em]     off your type scale                           src/pages/adm…wcase.tsx:575
     → No token is close to 0.24em. Pick one with the design owner, or add one to the theme

  !  text-[8rem]           off your type scale                           src/design-sy…graphy.tsx:59
     → No token is close to 8rem. Pick one with the design owner, or add one to the theme

  !  tracking-[0.52em]     off your type scale                           src/pages/adm…wcase.tsx:208
     → No token is close to 0.52em. Pick one with the design owner, or add one to the theme

  !  text-[5rem]           off your type scale                           src/pages/hom…Lesson.tsx:84
     → No token is close to 5rem. Pick one with the design owner, or add one to the theme

  !  md:text-[30px]        off your type scale                           src/coach/Coa…efing.tsx:326
     → No token is close to 30px. Pick one with the design owner, or add one to the theme

  !  tracking-[-0.015em]   off your type scale                           src/pages/pro…mList.tsx:140
     → No token is close to -0.015em. Pick one with the design owner, or add one to the theme

  !  leading-[0.8]         off your type scale                           src/design-sy…graphy.tsx:59
     → No token is close to 0.8. Pick one with the design owner, or add one to the theme

  !  tracking-[0.45em]     off your type scale                           src/pages/adm…wcase.tsx:879
     → No token is close to 0.45em. Pick one with the design owner, or add one to the theme

  !  first-letter:text-[…  off your type scale                           src/pages/sho…Frame.tsx:105
     → No token is close to 4.2em. Pick one with the design owner, or add one to the theme

  !  tracking-[0.34em]     off your type scale                           src/pages/adm…wcase.tsx:647
     → No token is close to 0.34em. Pick one with the design owner, or add one to the theme

  !  leading-[1.8]         off your type scale                           src/lessons/c…sson.tsx:1318
     → No token is close to 1.8. Pick one with the design owner, or add one to the theme

  !  lg:text-[4rem]        off your type scale                           src/pages/hom…/Hero.tsx:127
     → No token is close to 4rem. Pick one with the design owner, or add one to the theme

  !  tracking-[0.04em]     off your type scale                           src/platform/…hText.tsx:233
     → No token is close to 0.04em. Pick one with the design owner, or add one to the theme

  !  tracking-[-0.055em]   off your type scale                           src/pages/adm…wcase.tsx:770
     → No token is close to -0.055em. Pick one with the design owner, or add one to the theme

  !  text-[54px]           off your type scale                           src/coach/Coa…iefing.tsx:95
     → No token is close to 54px. Pick one with the design owner, or add one to the theme

  !  tracking-[-0.06em]    off your type scale                           src/design-sy…graphy.tsx:59
     → No token is close to -0.06em. Pick one with the design owner, or add one to the theme

  !  sm:text-[1.75rem]     off your type scale                           src/advanced-…eBlock.tsx:49
     → No token is close to 1.75rem. Pick one with the design owner, or add one to the theme

  !  text-[0.6rem]         off your type scale                           src/lessons/p…acker.tsx:243
     → text-2xs (0.625rem) · text-xxs (0.6875rem)

  !  lg:text-[2.25rem]     off your type scale                           src/pages/cur…nHero.tsx:126
     → No token is close to 2.25rem. Pick one with the design owner, or add one to the theme

  !  md:text-[44px]        off your type scale                           src/coach/Coa…efing.tsx:181
     → No token is close to 44px. Pick one with the design owner, or add one to the theme

  !  text-[34px]           off your type scale                           src/pages/adm…wcase.tsx:917
     → No token is close to 34px. Pick one with the design owner, or add one to the theme

  !  text-[0.9em]          off your type scale                           src/advanced-…Block.tsx:136
     → No token is close to 0.9em. Pick one with the design owner, or add one to the theme

  !  text-[0.55rem]        off your type scale                           src/lessons/p…acker.tsx:314
     → text-2xs (0.625rem) · text-xxs (0.6875rem)

  !  leading-[1.15]        off your type scale                           src/pages/cur…nHero.tsx:126
     → No token is close to 1.15. Pick one with the design owner, or add one to the theme

  !  leading-[1.65]        off your type scale                           src/advanced-…Phase.tsx:529
     → No token is close to 1.65. Pick one with the design owner, or add one to the theme

  ·  runtime styles        computed at runtime; cannot check             2 sites in 2 files
     → Pass the number through a CSS variable and set font-size from a class or stylesheet
     CompetencyRadar.tsx:257 · MemoryPlate.tsx:146

  !  fontSize: 'clamp(72…  off your type scale                           src/pages/sho…/Cover.tsx:44
     → No token is close to clamp(72px, 16vw, 220px). Pick one with the design owner, or add one to…

  !  font-size: 110%       off your type scale                           src/theme.css:340
     → No token is close to 110%. Pick one with the design owner, or add one to the theme

  !  fontSize: 8.5         off your type scale                           src/problems/…airMap.tsx:89
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  fontSize: theme.gho…  off your type scale                           src/pages/adm…wcase.tsx:758
     → No token is close to 220px. Pick one with the design owner, or add one to the theme. · No to…

  !  fontSize: '9.5cqw'    off your type scale                           src/platform/…Glyph.tsx:341
     → No token is close to 9.5cqw. Pick one with the design owner, or add one to the theme

  !  lineHeight: '16px'    off your type scale                           src/problems/…Graph.tsx:208
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontSize: theme.tit…  off your type scale                           src/pages/adm…wcase.tsx:775
     → No token is close to 84px. Pick one with the design owner, or add one to the theme. · No tok…

  !  fontSize: theme.tit…  off your type scale                           src/pages/adm…wcase.tsx:781
     → No token is close to 88px. Pick one with the design owner, or add one to the theme. · No tok…

  !  !leading-3.5          off your type scale                           src/pages/hom…gnette.tsx:59
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontSize: '0.6rem'    off your type scale                           src/advanced-…hase.tsx:1500
     → var(--text-2xs) (0.625rem) · var(--text-xxs) (0.6875rem)

  !  letterSpacing: 0.4    off your type scale                           src/advanced-…hase.tsx:1485
     → No token is close to 0.4px. Pick one with the design owner, or add one to the theme

  !  font-size: 0.875rem   off your type scale                           src/theme.css:500
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  letterSpacing: '-0.…  off your type scale                           src/platform/…Stage.tsx:299
     → No token is close to -0.012em. Pick one with the design owner, or add one to the theme

  !  letterSpacing: '-0.…  off your type scale                           src/platform/…Shell.tsx:871
     → No token is close to -0.015em. Pick one with the design owner, or add one to the theme

  !  fontSize: 2.3         off your type scale                           src/platform/…works.tsx:544
     → No token is close to 2.3px. Pick one with the design owner, or add one to the theme

  !  fontSize: 'clamp(10…  off your type scale                           src/problems/…sGrid.tsx:183
     → No token is close to clamp(10px, 2.5vw, 13px). Pick one with the design owner, or add one to…

  !  fontSize: '5.2cqw'    off your type scale                           src/platform/…Glyph.tsx:344
     → No token is close to 5.2cqw. Pick one with the design owner, or add one to the theme

  !  fontSize: '1.75rem'   off your type scale                           src/platform/…Stage.tsx:298
     → No token is close to 1.75rem. Pick one with the design owner, or add one to the theme

  !  fontFamily: 'Arial,…  off your type scale                           src/advanced-…Phase.tsx:861
     → No token is close to Arial, sans-serif. Pick one with the design owner, or add one to the th…

  !  font-family: 'JetBr…  off your type scale                           src/theme.css:499
     → No token is close to 'JetBrains Mono Variable', monospace. Pick one with the design owner, o…

  !  fontSize: '20px'      off your type scale                           src/cabinet/S…nCard.tsx:222
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  fontSize: '44px'      off your type scale                           src/cabinet/S…nCard.tsx:196
     → No token is close to 44px. Pick one with the design owner, or add one to the theme

  !  fontFamily: 'Instru…  off your type scale                           src/advanced-…hase.tsx:1819
     → No token is close to Instrument Serif. Pick one with the design owner, or add one to the the…

  !  letterSpacing: '0.2…  off your type scale                           src/pages/cur…nHero.tsx:116
     → No token is close to 0.2em. Pick one with the design owner, or add one to the theme

  !  fontSize: 16          off your type scale                           src/games/poi…geon.tsx:2810
     → var(--text-sm-minus) (0.8rem) · var(--text-xs-plus) (0.7375rem)

  !  line-height: 1.625    off your type scale                           src/theme.css:501
     → No token is close to 1.625. Pick one with the design owner, or add one to the theme

  !  fontWeight: tick.nu…  off your type scale                           src/problems/…Phase.tsx:258
     → No token is close to bold. Pick one with the design owner, or add one to the theme

  !  fontSize: 'clamp(12…  off your type scale                           src/pages/sho…rFrame.tsx:80
     → No token is close to clamp(120px, 16vw, 240px). Pick one with the design owner, or add one t…

  !  fontSize: '2rem'      off your type scale                           src/platform/…Shell.tsx:870
     → No token is close to 2rem. Pick one with the design owner, or add one to the theme

  !  lineHeight: 0.85      off your type scale                           src/pages/sho…rFrame.tsx:81
     → No token is close to 0.85. Pick one with the design owner, or add one to the theme

  !  letterSpacing: "0.0…  off your type scale                           src/pages/adm…wcase.tsx:412
     → No token is close to 0.02em. Pick one with the design owner, or add one to the theme

  !  font-extrabold        off your type scale                           src/lessons/p…ctive.tsx:826
     → No token is close to 800. Pick one with the design owner, or add one to the theme

  !  text-xs               changes MagicMoveBlock's line-height          2 sites in 1 file
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…
     TopDownBottomUpLesson.tsx:1402 · TopDownBottomUpLesson.tsx:1475

  !  sm:text-xs            changes MagicMoveBlock's line-height          3 sites in 3 files
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…
     FreqMapTracker.tsx:1711 · MonotonicDeque.tsx:2332 · WindowBudget.tsx:2205

  !  text-sm               changes ToggleGroupItem's line-height         5 sites in 3 files
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…
     DesignSystemPage.tsx:159 · Proposals.tsx:70 · Proposals.tsx:144 · Proposals.tsx:180 · +1

  !  text-xs               changes Button's line-height                  4 sites in 4 files
     → Use a variant: variant = default | outline | secondary | ghost | destructive | link; size = …
     CardsPage.tsx:515 · QueuePage.tsx:156 · DialAction.tsx:47 · Stage.tsx:486

  !  text-base             changes Input's line-height                   2 sites in 1 file
     → Input has no variant for this. Ask for one, or wrap it in an element you style. Defined in s…
     auth/parts.tsx:141 · auth/parts.tsx:162

  !  md:text-base          changes Input's line-height                   2 sites in 1 file
     → Input has no variant for this. Ask for one, or wrap it in an element you style. Defined in s…
     auth/parts.tsx:141 · auth/parts.tsx:162

  !  text-xs-plus          changes MagicMoveBlock's line-height          4 sites in 4 files
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…
     FreqMapTracker.tsx:1711 · MonotonicDeque.tsx:2332 · SignalSorter.tsx:1354 · +1

  !  text-xxs              changes Badge's line-height                   3 sites in 2 files
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…
     CardsPage.tsx:400 · CardsPage.tsx:475 · QueuePage.tsx:173

  !  tracking-[0.14em]     changes AccordionTrigger's letter-spacing     2 sites in 2 files
     → AccordionTrigger has no variant for this. Ask for one, or wrap it in an element you style. D…
     DialGroup.tsx:70 · DialsPanel.tsx:116

  !  text-[10px]           changes AccordionTrigger's font-size          2 sites in 2 files
     → AccordionTrigger has no variant for this. Ask for one, or wrap it in an element you style. D…
     DialGroup.tsx:70 · DialsPanel.tsx:116

  !  font-medium           changes AccordionTrigger's font-weight        2 sites in 2 files
     → AccordionTrigger has no variant for this. Ask for one, or wrap it in an element you style. D…
     DialGroup.tsx:70 · DialsPanel.tsx:116

  !  text-2xs              changes Badge's line-height                   2 sites in 2 files
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…
     StatusBadge.tsx:33 · PersonalizePhase.tsx:147

  !  text-base             changes Button's font-size                    2 sites in 1 file
     → Use a variant: variant = default | outline | secondary | ghost | destructive | link; size = …
     hero-legacy/Hero.tsx:69 · hero-legacy/Hero.tsx:79

  !  text-xxs              changes Button's line-height                  2 sites in 2 files
     → Use a variant: variant = default | outline | secondary | ghost | destructive | link; size = …
     CardsPage.tsx:360 · ComponentDissector.tsx:851

  !  text-sm               changes CardContent's line-height             2 sites in 2 files
     → CardContent has no variant for this. Ask for one, or wrap it in an element you style. Define…
     Components.tsx:271 · Proposals.tsx:829

  !  text-sm               changes ChoiceSlab's line-height              2 sites in 2 files
     → Use a variant: result = correct | wrong. Defined in src/platform/ui/buttons/ChoiceSlab.tsx:99
     CombPhases.tsx:96 · two-sum/parts.tsx:86

  !  text-xs               changes Input's font-size                     2 sites in 2 files
     → Input has no variant for this. Ask for one, or wrap it in an element you style. Defined in s…
     DialText.tsx:113 · Catalog.tsx:176

  !  text-xs               changes SelectTrigger's line-height           2 sites in 2 files
     → SelectTrigger has no variant for this. Ask for one, or wrap it in an element you style. Defi…
     DialSelect.tsx:76 · CompanyLens.tsx:30

  !  text-sm               changes TabsContent's line-height             2 sites in 2 files
     → TabsContent has no variant for this. Ask for one, or wrap it in an element you style. Define…
     Components.tsx:302 · dev-tokens.tsx:94

  !  text-sm               changes Textarea's line-height                2 sites in 2 files
     → Textarea has no variant for this. Ask for one, or wrap it in an element you style. Defined i…
     DifficultyTuner.tsx:126 · FeedbackPanel.tsx:73

  !  font-heading          changes AccordionTrigger's font-family        src/design-sy…olour.tsx:332
     → AccordionTrigger has no variant for this. Ask for one, or wrap it in an element you style. D…

  !  text-base             changes AccordionTrigger's font-size          src/design-sy…olour.tsx:332
     → AccordionTrigger has no variant for this. Ask for one, or wrap it in an element you style. D…

  !  font-bold             changes AlertTitle's font-weight              src/platform/…allout.tsx:15
     → AlertTitle has no variant for this. Ask for one, or wrap it in an element you style. Defined…

  !  font-bold             changes Badge's font-weight                   src/platform/…sBadge.tsx:33
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…

  !  leading-none          changes Badge's line-height                   src/platform/…sBadge.tsx:33
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…

  !  font-heading          changes Badge's font-family                   src/platform/…sBadge.tsx:33
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…

  !  tracking-widest       changes Badge's letter-spacing                src/platform/…sBadge.tsx:33
     → Use a variant: variant = default | secondary | destructive | outline | ghost | link. Defined…

  !  font-normal           changes Button's font-weight                  src/platform/…Action.tsx:47
     → Use a variant: variant = default | outline | secondary | ghost | destructive | link; size = …

  !  [&>span]:text-sm      changes Chip's line-height                    src/pages/pro…erBar.tsx:138
     → Chip has no variant for this. Ask for one, or wrap it in an element you style. Defined in sr…

  !  font-mono             changes ChoiceSlab's font-family              src/problems/…Phases.tsx:96
     → Use a variant: result = correct | wrong. Defined in src/platform/ui/buttons/ChoiceSlab.tsx:99

  !  text-xs               changes DialogDescription's font-size         src/problems/…ences.tsx:926
     → DialogDescription has no variant for this. Ask for one, or wrap it in an element you style. …

  !  text-base             changes DialogTitle's font-size               src/problems/…ences.tsx:921
     → DialogTitle has no variant for this. Ask for one, or wrap it in an element you style. Define…

  !  text-xxs              changes DropdownMenuItem's font-size          src/platform/…kDock.tsx:562
     → DropdownMenuItem has no variant for this. Ask for one, or wrap it in an element you style. D…

  !  font-medium           changes DropdownMenuItem's font-weight        src/platform/…kDock.tsx:562
     → DropdownMenuItem has no variant for this. Ask for one, or wrap it in an element you style. D…

  !  text-sm               changes DropdownMenuLabel's line-height       src/platform/…eader.tsx:313
     → DropdownMenuLabel has no variant for this. Ask for one, or wrap it in an element you style. …

  !  text-xs               changes DropdownMenuLabel's line-height       src/platform/…eader.tsx:315
     → DropdownMenuLabel has no variant for this. Ask for one, or wrap it in an element you style. …

  !  font-normal           changes DropdownMenuLabel's font-weight       src/platform/…eader.tsx:315
     → DropdownMenuLabel has no variant for this. Ask for one, or wrap it in an element you style. …

  !  font-medium           changes DropdownMenuLabel's font-weight       src/platform/…eader.tsx:313
     → DropdownMenuLabel has no variant for this. Ask for one, or wrap it in an element you style. …

  !  text-sm               changes DropdownMenuTrigger's line-height     src/platform/…eader.tsx:202
     → DropdownMenuTrigger has no variant for this. Ask for one, or wrap it in an element you style…

  !  font-mono             changes Input's font-family                   src/platform/…lText.tsx:113
     → Input has no variant for this. Ask for one, or wrap it in an element you style. Defined in s…

  !  md:text-sm            changes InputGroupInput's font-size           src/pages/pro…terBar.tsx:85
     → InputGroupInput has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  text-base             changes InputGroupInput's font-size           src/pages/pro…terBar.tsx:85
     → InputGroupInput has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  leading-snug          changes Label's line-height                   src/platform/…field.tsx:107
     → Label has no variant for this. Ask for one, or wrap it in an element you style. Defined in s…

  !  !leading-3.5          changes MagicMoveBlock's line-height          src/pages/hom…gnette.tsx:59
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…

  !  !text-xs              changes MagicMoveBlock's line-height          src/pages/hom…round.tsx:408
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…

  !  !text-2xs             changes MagicMoveBlock's line-height          src/pages/hom…gnette.tsx:59
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…

  !  !leading-5            changes MagicMoveBlock's line-height          src/pages/hom…round.tsx:408
     → MagicMoveBlock has no variant for this. Ask for one, or wrap it in an element you style. Def…

  !  font-mono             changes PaperButton's font-family             src/problems/…Phase.tsx:217
     → Use a variant: variant = paper | ghost | destructive; size = sm | md | lg; demoState = hover…

  !  text-4xl              changes RollingNumber's font-size             src/design-sy…Motion.tsx:85
     → RollingNumber has no variant for this. Ask for one, or wrap it in an element you style. Defi…

  !  font-mono             changes RollingNumber's font-family           src/design-sy…Motion.tsx:85
     → RollingNumber has no variant for this. Ask for one, or wrap it in an element you style. Defi…

  !  font-mono             changes Surface's font-family                 src/dev-primitives.tsx:98
     → Use a variant: variant = paper | row | sunken. Defined in src/platform/ui/Surface.tsx:88

  !  text-sm               changes Surface's font-size                   src/dev-primitives.tsx:98
     → Use a variant: variant = paper | row | sunken. Defined in src/platform/ui/Surface.tsx:88

  !  text-xs               changes Textarea's line-height                src/platform/…lText.tsx:104
     → Textarea has no variant for this. Ask for one, or wrap it in an element you style. Defined i…

  !  font-mono             changes Textarea's font-family                src/platform/…lText.tsx:104
     → Textarea has no variant for this. Ask for one, or wrap it in an element you style. Defined i…

  !  font-medium           changes ToggleGroupItem's font-weight         src/design-sy…mPage.tsx:159
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  text-xs               changes ToggleGroupItem's font-size           src/problems/…eDial.tsx:199
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  font-bold             changes ToggleGroupItem's font-weight         src/games/bit…inter.tsx:567
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  text-sm-minus         changes ToggleGroupItem's font-size           src/pages/hom…tudio.tsx:113
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  font-mono             changes ToggleGroupItem's font-family         src/problems/…eDial.tsx:199
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

  !  font-normal           changes ToggleGroupItem's font-weight         src/pages/hom…tudio.tsx:113
     → ToggleGroupItem has no variant for this. Ask for one, or wrap it in an element you style. De…

Why
  A named token says what a value is for, so it changes with the design; a raw one doesn't.
  Your theme defines its own type scale; Tailwind's defaults sit outside it.
  Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
  Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
  React Plumber reads source, not running values.
  MagicMoveBlock controls its type; outside overrides break when its design changes.
  ToggleGroupItem controls its type; outside overrides break when its design changes.
  Button controls its type; outside overrides break when its design changes.
  Input controls its type; outside overrides break when its design changes.
  Badge controls its type; outside overrides break when its design changes.
  AccordionTrigger controls its type; outside overrides break when its design changes.
  CardContent controls its type; outside overrides break when its design changes.
  ChoiceSlab controls its type; outside overrides break when its design changes.
  SelectTrigger controls its type; outside overrides break when its design changes.
  TabsContent controls its type; outside overrides break when its design changes.
  Textarea controls its type; outside overrides break when its design changes.
  AlertTitle controls its type; outside overrides break when its design changes.
  Chip controls its type; outside overrides break when its design changes.
  DialogDescription controls its type; outside overrides break when its design changes.
  DialogTitle controls its type; outside overrides break when its design changes.
  DropdownMenuItem controls its type; outside overrides break when its design changes.
  DropdownMenuLabel controls its type; outside overrides break when its design changes.
  DropdownMenuTrigger controls its type; outside overrides break when its design changes.
  InputGroupInput controls its type; outside overrides break when its design changes.
  Label controls its type; outside overrides break when its design changes.
  PaperButton controls its type; outside overrides break when its design changes.
  RollingNumber controls its type; outside overrides break when its design changes.
  Surface controls its type; outside overrides break when its design changes.

Intended?  plumber accept --rule provenance/type/tier --site \
  "src/advanced-frontend/icons/groups/js-core.tsx:492" --why "…"
```

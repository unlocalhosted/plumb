# Patterns from mature source-mapping and instrumenting tools, for Plumber's stamping and locate

Written 2026-11-05 for docs/briefs/stamping-everywhere.md. Read against overlay/src/locate.js and src/hosts/source-stamping.ts.

**How to read the citations.** No tool was cloned or run, and no page was fetched this session. Every URL and path below is
from memory of the public docs and source. Anything I am less sure of is marked UNVERIFIED. Treat a citation as "go look
here", not as a quote. The Plumber side (file names, line numbers, behaviour) was read in this session.

## 0. What Plumber has today, in one paragraph

`stampJSX` (source-stamping.ts:15) appends `data-plumb-source="path:line:col#hash12"` to every JSX opening, components
included. `locate()` (locate.js:197) reads that attribute off the fiber, asks the server to `resolve` it (which checks the
hash), and falls back to React's owner stack, symbolicated through source maps (`readCreationFrame`, `readFrames`). Frames
from libraries are filtered by a hand-written regex, `runtime()` (locate.js:62). A stack kept across an edit is
rejected by comparing hashes (`stackHashes`) and a source-map version (`sourceMapVersion()`). Results carry `via:
'stamp' | 'stamp-owner' | 'stamp-usage'` plus an optional `reason`. So the bones of several patterns below already exist;
the catalogue says which to finish and which to add.

## 1. What transfers from each tool (short)

| Tool | The one idea worth taking | Where to read it |
|---|---|---|
| gdb / lldb with DWARF | The line table is built by the compiler, not inferred; every row has `is_stmt`; unknown values print `<optimized out>` rather than a stale guess; debug info is matched to the binary by build-id/UUID and refused on mismatch | DWARF 5 spec section 6.2 (line number information) and 3.3.8 (inlined subroutines): https://dwarfstd.org/doc/DWARF5.pdf ; gdb manual, "Separate Debug Files" (build-id lookup) and "Optimized Code": https://sourceware.org/gdb/current/onlinedocs/gdb.html ; lldb UUID checks in `lldb/source/Symbol/ObjectFile.cpp`, `lldb/source/Core/Module.cpp` (UNVERIFIED which file prints the mismatch warning) |
| rr | Record only the non-deterministic inputs at the boundary, then replay offline | https://rr-project.org/ , "rr: Lightweight Recording & Deterministic Debugging" (USENIX ATC 2017) |
| Ghidra | Every fact has a `SourceType` (DEFAULT, ANALYSIS, IMPORTED, USER_DEFINED); lower ranks never overwrite higher; all changes in undoable transactions; analysers post Warning bookmarks rather than guess | `ghidra.program.model.symbol.SourceType` in Ghidra's Framework/SoftwareModeling; `Program.startTransaction/endTransaction`; `Analyzer` priorities and options (UNVERIFIED exact class paths) |
| IDA | Auto names vs user names are distinct flags; FLIRT recognises library functions by a masked byte signature, not by path | Hex-Rays docs, "FLIRT" and `set_name` flags (`SN_AUTO`, `SN_NOCHECK`) in the IDA SDK `name.hpp` (UNVERIFIED) |
| radare2 | Analysis is levels (`aa`, `aaa`, `aaaa`) with stated cost; annotations are flags/comments in named spaces; projects saved | https://book.rada.re/ (analysis and projects chapters) (UNVERIFIED chapter names) |
| Source Map v3 / ECMA-426 | Mappings are a sorted segment list per generated line; columns are 0-based UTF-16 units; `ignoreList` marks frames to skip; ECMA-426 adds a `debugId` | https://tc39.es/ecma426/ (the standardised Source Map spec); the older v3 doc https://sourcemaps.info/spec.html ; `ignoreList` in the same spec, originating as `x_google_ignoreList` (UNVERIFIED which edition made it normative) |
| `source-map` (Mozilla) | `originalPositionFor` takes a `bias` (GREATEST_LOWER_BOUND / LEAST_UPPER_BOUND) and returns nulls when nothing matches the line | https://github.com/mozilla/source-map , `lib/source-map-consumer.js` |
| Sentry | Matches an uploaded map to a running build by debug ID (a UUID in a `//# debugId=` comment and in the map), not by URL or release name | https://docs.sentry.io/platforms/javascript/sourcemaps/troubleshooting_js/debug-ids/ |
| Istanbul / babel-plugin-istanbul | Inserts counters as expressions that cannot change evaluation; the coverage object carries a content `hash` and the input source map is composed so lines stay authored lines | https://github.com/istanbuljs/istanbuljs , `packages/istanbul-lib-instrument/src/visitor.js`, `instrumenter.js` (UNVERIFIED file names) |
| V8 coverage / c8 | Asks the engine, injects nothing; `v8-to-istanbul` maps back through source maps | https://github.com/bcoe/c8 , https://github.com/istanbuljs/v8-to-istanbul , https://v8.dev/blog/javascript-code-coverage |
| React / DevTools | React 19 dropped `_debugSource` (JSX `source` argument) for owner stacks that run through source maps; `captureOwnerStack()` is the public API | react.dev reference for `captureOwnerStack`; the React repo's `packages/react/src/jsx/ReactJSXElement.js` (`_debugStack`) (UNVERIFIED PR number of the removal) |
| `@babel/plugin-transform-react-jsx-source` | Compile-time JSX position injected as an argument, now obsolete for React 19 | https://babeljs.io/docs/babel-plugin-transform-react-jsx-source |
| vite-plugin-vue-inspector, code-inspector-plugin, LocatorJS, click-to-component | Same shape as Plumber's stamps: an attribute (Vue inspector: `data-v-inspector="file:line:col"`, code-inspector: `data-insp-path`) or a side table (LocatorJS) | https://github.com/webfansplz/vite-plugin-vue-inspector , https://github.com/zh-lx/code-inspector , https://github.com/infi-pc/locatorjs , https://github.com/ericclemmons/click-to-component (attribute names from memory, UNVERIFIED) |
| Svelte dev mode | Puts the location on the DOM node as a JS property (`__svelte_meta.loc`), not as an HTML attribute | Svelte compiler dev output `add_location` / `add_locations` (UNVERIFIED version differences between 4 and 5) |
| Chrome DevTools | Ignore list from the map; "failed to load source map" is shown, not hidden | https://developer.chrome.com/docs/devtools/javascript/source-maps and the "Ignore List" docs |
| LSP / rust-analyzer | Versioned documents, negotiated position encoding, cancellation of stale work, two-phase resolve | https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/ (`positionEncoding`, `VersionedTextDocumentIdentifier`, `*/resolve`); https://github.com/rust-lang/rust-analyzer , `docs/dev/architecture.md` ("Cancellation"), `crates/ide-db` line index with wide-char handling |
| LLVM debug-info testing | `debugify` / `check-debugify` inject synthetic locations and fail if a pass loses them; `llvm-dwarfdump --verify`; Dexter (in `cross-project-tests/debuginfo-tests/dexter`) scores what a real debugger shows | https://llvm.org/docs/HowToUpdateDebugInfo.html , https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html (UNVERIFIED Dexter path, it has moved) |
| tc39 source-map-tests | Shared conformance cases for any source-map reader | https://github.com/tc39/source-map-tests (UNVERIFIED that it is still the canonical location) |

## 2. The catalogue

Each pattern: problem in Plumber's terms, how the source tool does it, how it would look in Plumber, the trap it avoids.

### P1. Identity by content, not by path

- **Problem.** A stamp says `src/Card.tsx:12:5`. After an edit, a rename, a monorepo link, or a stale cached page, that string
  can point at different code. Paths are names; they are not identity.
- **Source tool.**
  - DWARF 5 file entries can carry an MD5 of the source file (`DW_LNCT_MD5` in the line-table header, spec 6.2.4.1).
  - Debuggers load separate debug info only when the ELF build-id or Mach-O UUID matches, and say so when it does not
    (gdb "Separate Debug Files"; lldb refuses a dSYM with a different UUID and warns).
  - Sentry joins map to code on `debugId`, because URL and release matching failed in practice (CDNs, hashed filenames).
  - ECMA-426 standardises the `debugId` field.
- **In Plumber.** The `#hash12` in the stamp is already this idea. Finish it:
  1. Treat `path` as a display hint and `hash` as the key. The server's `resolve` should find the file by hash first (a file index
     `hash -> path` kept by the dev server), and use the path only to disambiguate two files with equal content.
  2. Give each transformed module a second ID, the hash of the *stamped output*, and put it in the module's source map as a
     `debugId`-style field. Then `mappedFrame()` for an owner-stack frame can check "this frame's module is the exact build the
     map was made for" instead of relying on `sourceMapVersion()` alone (locate.js:67-70).
  3. Every edit request carries the expected hash; the writer refuses on mismatch (see P7).
- **Trap avoided.** Editing the wrong line in a file that changed after the page rendered, or that has a twin at another path
  (a copied shadcn file, a vendored package). Also the "same path, different build" failure Sentry describes.

### P2. A line table made at compile time, with membership checks at run time

- **Problem.** Today the owner-stack path infers a position by mapping a stack frame, then snaps it. The spec's B1 adds a
  JSX index to make that safe. This is the right move; here is what the sources say about how to build it.
- **Source tool.**
  - DWARF `.debug_line` is a state machine the compiler emits: rows of (address, file, line, column, `is_stmt`,
    `basic_block`, `end_sequence`, `discriminator`). The debugger never invents rows. It looks up the greatest row at or
    before an address *within one sequence*, and `end_sequence` closes the range so addresses past it map to nothing.
  - `is_stmt` marks rows that are valid statement starts. Breakpoints and stepping use only those.
  - `discriminator` separates several blocks on the same line.
  - Istanbul emits `statementMap`, `fnMap`, `branchMap` at instrument time, keyed by start/end loc, and counters point at
    those ids. The run-time data is just ids and counts.
- **In Plumber.**
  - The JSX index is the `is_stmt` table: one row per `JSXOpeningElement` (tag, line, col, end, kind = dom | component | fragment),
    produced in the same `walk` as `stampJSX` so the two can never disagree. Serve it per file hash.
  - Column is the `discriminator`: two `<span>`s on one line are told apart by column, as the stamp already does.
  - An owner-stack frame is accepted only on an **exact** row match (same hash, same line and column). No "closest row".
    `locate.js:readCreationFrame` currently returns whatever the map says; add the membership check after mapping.
  - Rather than repeating the path in every attribute (`data-plumb-source="long/path.tsx:12:5#abc"`), a short file id into the
    served table is the `.debug_line` file-table trick. This is a size optimisation, not a correctness one; do it last.
- **Trap avoided.** Mapping to a neighbouring JSX element and calling it exact. Also the case where an owner-stack frame lands
  inside a template literal, a comment, or generated code that merely sits near a JSX opening.

### P3. Confidence levels, and refusing with a reason

- **Problem.** The spec says "exact or honest, never wrong". The code returns `via` values and sometimes a `reason`, but
  no single ordered scale, and several `catch {}` paths swallow errors (locate.js:206, 232, 245).
- **Source tool.**
  - gdb prints `<optimized out>` when a location list has no entry for the current PC; it does not fall back to a stale register.
    lldb prints `<variable not available>`. The refusal is a value in the output, not an exception.
  - gdb's "No line number information available for address ..." is an answer, with the address.
  - Ghidra analysers raise Warning/Error bookmarks with a category when they cannot decide.
  - radare2 makes the user pick an analysis level that states its cost and risk.
  - Chrome DevTools shows "failed to load source map" with the URL and reason.
  - The Mozilla library returns nulls rather than a guess when the line has no mapping.
- **In Plumber.**
  - One closed enum on every locate result, ordered:
    `stamp-confirmed` (hash matched, tag matched) > `usage-confirmed` (index row matched) > `owner-snapped` (stack + map + index)
    > `refused(reason)`. No fourth level called "best guess". Reasons are a closed set (`stamp-missing`, `hash-mismatch`,
    `tag-mismatch`, `frame-not-in-index`, `map-obsolete`, `generated-code`, `html-string`, `library-drawn`), each with the
    detail the UI needs. The existing `reason`/`detail` objects (`{ step: 'obsolete-stack' }`) are the start of this.
  - Replace the three swallowed `catch {}` blocks by returning `refused('resolve-failed', error)` unless it is the
    `starting/failed` case already rethrown.
  - The UI renders the level, and writers refuse to edit below `usage-confirmed` unless the user confirms.
- **Trap avoided.** A silent downgrade: the answer looks the same on screen whether it came from a verified stamp or a loose
  stack match. Also `bias`-style behaviour (see "Don't 1").

### P4. Instrumentation that cannot change behaviour

- **Problem.** The spec's crash (Headless UI `Menu` rendering a Fragment: "Passing props on Fragment") shows a stamp is code
  that runs. What is provably safe to inject?
- **Source tool.**
  - Istanbul inserts counters as `(cov.s[3]++, expr)` or `cov.s[3]++;` statements. A comma expression returns the last
    value, so evaluation order and the result are unchanged; it adds only a side effect on a private object. It
    has well-known holes it handles by special cases (arrow bodies, `&&` short circuits, ASI, directives like `'use strict'`,
    `super()` first-statement rules, generator `yield`), which are exactly the places where "just add a statement" changes
    behaviour (istanbul-lib-instrument `visitor.js`; UNVERIFIED which special cases are listed).
  - It composes the incoming source map (`inputSourceMap`) so positions stay authored positions, and it must run on the authored
    code, not after another transform (the same constraint Plumber has with `enforce: 'pre'`).
  - `/* istanbul ignore next */` is an escape hatch the *user* owns.
  - c8 / V8 coverage injects nothing at all: the engine counts, the mapper translates after the fact. The strongest guarantee.
  - babel-plugin-transform-react-jsx-source added a `__source` object per element; React 19 removed that because it cost
    allocations on every element and the owner stack already existed. A reminder that "harmless" injection has a runtime price.
- **In Plumber.**
  - Write the allowlist down as the contract: **a `data-*` attribute on a lowercase DOM tag and nothing else.** No props on
    components (the spec already says this), none on `Fragment`, no `key`, `ref`, `children` changes, no wrappers. `stampJSX`
    currently skips `Fragment` by name, not component tags in general; the spec's host-only change closes that.
  - Also refuse to stamp a tag that already has a spread that could carry `data-plumb-source` through to a component
    (`<div {...props}>` is fine; the attribute is appended after the spread, so it wins; keep that order and test it).
  - Hydration is the hidden behaviour change: server HTML and client DOM must carry the identical attribute. In Next, the RSC
    and client compilations are separate transforms; assert both produce the same stamp for the same file.
  - The "c8 option" for Plumber is the owner stack: it asks the runtime and injects nothing. Keep it as the second witness (P5).
  - Provide the user-owned escape hatch Istanbul has: a `// plumb-ignore` comment or config glob, and report ignored files in doctor.
- **Trap avoided.** Stamps that change what the app does (props on a component that rejects them, hydration mismatches,
  `:empty`/attribute-selector CSS, snapshot tests that include attributes, memoisation keyed on props).

### P5. Two independent witnesses that must agree

- **Problem.** Stamps can be stale or missing; owner stacks can be wrong or absent (server components). Which to trust?
- **Source tool.** Istanbul (instrument) and c8 (engine counters) answer the same question by different means; projects run
  both in CI and treat a difference as a bug in one of them. Debuggers cross-check DWARF line rows against the symbol table and
  `llvm-dwarfdump --verify` exists to check that the tables are self-consistent. Mozilla's and Chrome's mappers each validate
  a map against the source's line count when content is embedded (UNVERIFIED whether the check is in the library or only DevTools).
- **In Plumber.** `locate()` already computes both (`confirmed` and `owner`) in the non-chain path, then mostly lets the stamp win.
  Make agreement a first-class result: if both exist and name different JSX openings, return `refused('witness-disagree', {stamp, owner})`
  in development and log it into the bench as a failure with its two answers. In the bench, disagreement rate per corpus app
  is the cheapest measure of "wrong answers must be 0".
- **Trap avoided.** One source silently overriding the other, so a bug in either never shows.

### P6. Ignore lists and skip lists for library frames

- **Problem.** `runtime()` is a regex (locate.js:62) that includes `node_modules`, `dist`, Next chunk names, and Turbopack
  flattening quirks (the comment at locate.js:84 says so). It is maintained by hand and guessed per bundler.
- **Source tool.**
  - Source maps can carry `ignoreList` (indices into `sources`) written *by the bundler*, which knows what it bundled
    (Vite writes it for `node_modules`; webpack/Next has its own `ignoreList`/`devtool` handling, UNVERIFIED exact behaviour).
    DevTools uses it to hide frames and to skip them when stepping.
  - gdb `skip` (functions/files) and lldb `settings set target.process.thread.step-avoid-regexp` / `step-avoid-libraries`
    are explicit, user-extensible skip rules, separate from the symbol data.
  - DevTools additionally has an "automatically ignore known third-party scripts" heuristic (UNVERIFIED how it decides).
- **In Plumber.**
  - Order of evidence: (1) the map's `ignoreList` if present, (2) the project boundary the stamping already knows
    (`sourceBoundary(root)`, `containsPath`), (3) the regex as the last resort and counted as such in the result
    (`ignoredBy: 'map' | 'boundary' | 'pattern'`). Part of the spec's "workspace packages are yours" is exactly (2).
  - `readFrames` already copies `isIgnoreListed: at.ignored === true` from the mapper (locate.js:177); `readCreationFrame` does
    not use it. One classifier function, used by both.
  - Expose the skip rule to the user (config `ignore: [...]`), as gdb/lldb do, so a monorepo can fix a miss without a release.
- **Trap avoided.** A library frame taken as "your code" because its path happened to avoid the regex; a workspace package
  taken as a library because it sits under `node_modules` via a link.

### P7. Staleness: versions, preconditions and cancellation

- **Problem.** The page renders, the user edits a file (or HMR swaps a module), the overlay then asks to edit "that line".
- **Source tool.**
  - LSP: every document the server holds has a `version`; `WorkspaceEdit.documentChanges` uses
    `OptionalVersionedTextDocumentIdentifier` so an edit says which version it was computed against, and a mismatch means
    the edit must not apply (3.17 spec, "WorkspaceEdit").
  - rust-analyzer: queries run on a snapshot; when the input changes the in-flight work is cancelled (`Cancelled` unwinding in
    salsa) and results from an old revision are never published. See `docs/dev/architecture.md` and `docs/book` on "Cancellation".
  - LSP position encoding is negotiated (`positionEncoding`: utf-8, utf-16, utf-32), because columns in different units
    silently shift by emoji or CJK text. rust-analyzer converts through a `LineIndex` with wide-character tables.
  - Source Map columns are 0-based UTF-16 code units; DWARF columns are 1-based bytes (0 = unknown).
  - LSP `resolve` requests (completion, code action) are a two-phase fetch with an opaque `data` field: cheap list first,
    expensive detail on demand. Plumber's `resolve` request and `{ chain: true }` second read have the same shape.
- **In Plumber.**
  - Edit requests carry `{file, hash, line, column}`; the writer re-hashes the file and refuses with `refused('stale', {had, now})`.
    Do not "re-find" the element in the new text. (stackHashes in locate.js:60-61 does the read side of this already.)
  - Name the unit of every position at the boundary: a tiny `Pos` type `{line1, col1, unit:'utf16'}`. locate.js currently converts
    in many places (`Number(m[3]) + 1`, `columnNumber - 1`, `(source.columnNumber ?? 1) - 1`), each an off-by-one waiting
    to happen; the bippy comment at locate.js:154 already records one such confusion. Convert once, at the map/stamp edge.
  - HMR: bump a per-module generation on `import.meta.hot` accept; a located element whose module generation is older than
    current gets `refused('stale-module')` and the overlay re-locates, like rust-analyzer discarding old-revision results.
  - Abort in-flight locates on a new generation (`options.signal` is already threaded through; make HMR fire it).
- **Trap avoided.** Writing into a file that moved on; column drift on non-ASCII lines; results from before an edit shown
  after it.

### P8. Facts with provenance, and annotations that can be undone

- **Problem.** The result of `locate` is a bare location plus a `via` string. When the user confirms or corrects an answer, or
  two sources disagree, there is nowhere to keep who said what.
- **Source tool.**
  - Ghidra's program database stores each name/type/comment with a `SourceType`. USER_DEFINED beats IMPORTED beats ANALYSIS beats
    DEFAULT; re-running analysis never clobbers a user fact. Changes happen inside `startTransaction`/`endTransaction` and are
    undone as a unit.
  - IDA keeps auto-generated names distinct from user names with flags; a user rename sticks across re-analysis.
  - radare2 stores annotations as flags (in named flagspaces) and comments, saved in projects.
  - DWARF itself has no provenance, which is why debuggers warn when sources do not match (P1).
- **In Plumber.**
  - Make the locate result a `Fact`: `{ element, at:{file,hash,line,col}, level (P3), witnesses:[{kind:'stamp'|'owner'|'usage'|'index', ok, detail}],
    asOf:{moduleGeneration, mapVersion}, who:'plumb'|'user' }`. `chain` entries become facts too. The `via` string becomes derived.
  - A user-confirmed or user-corrected location is `who:'user'` and outranks any re-computation until the file hash changes.
  - Every write Plumber makes is one transaction (`{files, before-hash, after-hash, patch}`) so "undo" is a reverse patch that
    first checks the after-hash (P7). The Ghidra rule is the one to keep: undo is per transaction, never per edit.
- **Trap avoided.** A later automatic pass overwriting a human decision; an undo that reverts someone else's later edit.

### P9. Generated, inlined and wrapped code

- **Problem.** Rows 7-10, 13-16 of the spec: icon packages, SVGR, portals, MDX, HTML strings, build output.
- **Source tool.**
  - DWARF inlined code: `DW_TAG_inlined_subroutine` has `DW_AT_call_file`/`call_line`/`call_column` for the *call site* and the
    abstract origin for the *definition* (spec 3.3.8). Debuggers show an inline frame as a virtual frame; `up` goes to the call site.
    That is the library-drawn element: definition lives in the library, the call site is the answer.
  - `#line` directives and `//# sourceMappingURL` let generators (yacc, Cython, TypeScript, MDX) state what they came from.
  - The Source Map "scopes" proposal (ECMA-426 follow-up, UNVERIFIED status) adds original function names and inlined call sites.
  - Chrome DevTools can show both "authored" and "deployed" views, so generated code is visible but marked.
- **In Plumber.**
  - Model each library-drawn element as an inline frame: `{definition: library, callSite: your usage}`; the answer is the call
    site (level `usage-confirmed`), the inner nodes inherit it (the spec's inner-node rule), and `refused('library-drawn', {library, usedAt})`
    is the readable "why".
  - MDX and HTML strings: carry the generator's own positions in the stamp (MDX line/col from the rehype position) and add a
    `generatedBy` field, like `#line`. A stamp from a generator is a fact with `kind:'generated'`, never mixed with JSX.
  - Build output (`.next`, `dist`): the stamping exclusion list in `source-stamping.ts:~64` is the right call; add the
    reverse lookup "if the file path is in a generated folder, say which generator (from its map's `sources`)".
- **Trap avoided.** Offering an edit inside a library or generated file; presenting the library's definition as the user's code.

### P10. Compose maps and keep authored positions

- **Problem.** Plumber stamps before other transforms (`enforce: 'pre'`) and generates a map (`generateMap({hires:true, includeContent:true})`).
  Positions can drift if another plugin ignores the input map.
- **Source tool.** babel-plugin-istanbul takes `inputSourceMap`, composes it, and writes coverage in authored coordinates. nyc caches
  instrumented output by content hash. `v8-to-istanbul` loads maps and falls back to generated coordinates only with a clear flag.
- **In Plumber.** The stamp is computed from authored text, so it is authored by construction (good). The risk is the *map*
  the plugin returns: add an integration check that, for each stamped element, the generated position of the attribute maps
  back to the same JSX opening. This is a self-test of the stamper, run in the bench, not at runtime.
- **Trap avoided.** A drifting map that makes the owner-stack witness disagree with the stamp for reasons unrelated to the page.

### P11. Record the boundary inputs, replay offline (from rr)

- **Problem.** A wrong or refused locate on a user's page is hard to reproduce; the bench cannot see their app.
- **Source tool.** rr records only the non-deterministic inputs (syscall results, signals, timing of async events) and replays the
  rest deterministically, so one trace can be debugged repeatedly.
- **In Plumber.** `locate()` is a function of: the element's fiber props (stamp), its owner stack text, the map files it fetched,
  the server's `resolve` answers, and the hash table. Save exactly those as a "locate trace" JSON when a result is refused or
  the user reports it, and let `plumber doctor --replay trace.json` run `locate` against them with no browser. This is a
  small slice: serialisation of inputs the function already takes. It also gives the golden corpus (P12) a cheap way to grow.
- **Trap avoided.** Fixes tested only against the corpus the team happens to have.

### P12. Testing meta-tools: golden corpora, differential and metamorphic tests

(Written for integration/e2e only, per the global rule: all tests run the real boundary, a rendered page and the real
overlay or server.)

- **Source tool.**
  - LLVM `debugify`: add synthetic locations to everything, run the transform, then verify no location was lost; the same
    check run as a whole-pipeline mode (`check-debugify`) and an original-source variant that reports which pass dropped what
    (https://llvm.org/docs/HowToUpdateDebugInfo.html).
  - `llvm-dwarfdump --verify` checks the tables are internally consistent.
  - Dexter drives a real debugger over a program compiled at different optimisation levels and scores what the debugger shows
    against expectations (UNVERIFIED location; the idea matters, not the path).
  - tc39 `source-map-tests` are shared cases any reader must pass.
  - gdb's `gdb.dwarf2` tests use a DWARF assembler to construct odd tables on purpose.
  - Istanbul/nyc test by instrumenting a corpus and checking that outputs still run and coverage numbers match known truth.
- **In Plumber (each a slice through the real boundary).**
  1. **Golden corpus with known truth.** For each corpus app, the build gives truth for free: the JSX index. For every DOM element
     on the page, the expected answer is "the index row whose tag and position are in the stamp". Fixtures are generated, not
     hand-labelled; the bench reports found / exact / wrong per spec row (1-17).
  2. **Differential, two ways.**
     (a) Render each route with stamping on and off; strip `data-plumb-source` from the first; the HTML must be byte-identical
     (SSR) and the client DOM tree must be identical after hydration. This is the proof that P4 holds.
     (b) Stamp witness vs owner-stack witness (P5); every disagreement is a finding.
  3. **Metamorphic edits.** Insert N blank lines above a component, re-run: every line number shifts by N, hashes change, columns
     do not. Reformat the file (prettier): hashes change, element count equals. Rename the file: the hash-first lookup (P1)
     still resolves. Add a comment before the first JSX: columns unchanged on that line. Add non-ASCII text before an element
     on its line: the UTF-16 column (P7) is still right.
  4. **Fuzz the transform.** Generate random but valid JSX/TSX (nested fragments, spreads, conditional rendering, generics in TSX,
     arrow bodies, `satisfies`, comments in tag, attributes with `>` in strings, unicode identifiers). Check: stamping does not
     throw and does not change the parse tree except for added attributes; the stamped file compiles; the output with stamps
     stripped equals the input AST. Seed from real files from the corpus apps. (Tooling: any property-test library driving the
     real Vite/Next build; no unit test of `stampJSX` alone.)
  5. **Library-crash probes.** A short list of components known to reject unknown props (Headless UI Fragment `Menu`, a component
     that spreads onto `React.Fragment`, a strict-prop wrapper) rendered through the real app: must render, which is the spec's
     crash slice made permanent.
  6. **Refusal tests.** For rows 14-17 (createElement, HTML strings, generated, web components) the assertion is on the *reason*,
     not on a location: the golden file stores `refused(reason)` and a changed reason fails the test.
- **Trap avoided.** Tests that check Plumber against Plumber's own output; success measured as "found" without "wrong".

## 3. Where React and the Vue/Svelte tools sit

- React 19's move from `_debugSource` (compile-time, per element) to owner stacks (run-time, from the engine's stack + source maps)
  is the same choice as instrumenting (Istanbul) vs asking the engine (c8). It cost React nothing in precision where the stack
  exists, and gave up where it does not (server components, `createElement` in library code). Plumber keeps both on purpose (P5).
- `click-to-component` and LocatorJS in their older forms read `_debugSource`; they broke on React 19. A lesson in not building on a
  private field the framework is about to remove: Plumber's `readFrames` still has the 17/18 branch and the 19 branch; keep the
  17/18 one behind a clear "legacy" label and cover it in the bench or drop it.
- Vue's `data-v-inspector` and code-inspector's `data-insp-path` are attributes like Plumber's stamp, with the path, line, column in
  plain text and no hash; Svelte stores the location as a property on the node instead of an attribute (no HTML change, no
  hydration diff, invisible to CSS selectors and snapshot tests). **Idea to evaluate, not adopt blindly:** on client-rendered DOM
  Plumber could read the stamp from a side table keyed by the host's fiber rather than from a DOM attribute; but the attribute is
  what reaches server-rendered HTML and server components, which is why the spec needs it. UNVERIFIED how well a property survives
  Svelte hydration in each version.

## 4. The 5 patterns that would most change Plumber's stamping and locate work

1. **Content-hash identity with a precondition on every edit (P1 + P7).** Look the file up by hash first, carry the hash on every
   write, refuse on mismatch, and use one position type with a stated encoding. This closes wrong-line edits for good.
2. **The JSX index as a compile-time line table, with exact-match membership (P2).** Emitted in the same walk as the stamp, one row
   per opening with kind, and the only way an owner-stack frame is ever accepted. No nearest row.
3. **Two witnesses, a closed confidence ladder, typed refusals, results as facts with provenance (P3 + P5 + P8).** Stamp and owner stack
   cross-check each other; disagreement is a result, not a coin flip; every answer says who said it and how sure.
4. **A written injection allowlist proved by differential rendering (P4).** `data-*` on lowercase DOM tags only; proof is
   byte-identical SSR and identical hydrated DOM with stamps stripped, across both Next bundlers and Vite.
5. **A truth-by-construction test harness (P12, with P11).** The index gives expected answers for free; add metamorphic edits, a
   transform fuzzer and library-crash probes, plus saved locate traces so field failures become corpus entries.

## 5. Three things these tools do that Plumber should not copy

1. **Sliding to the nearest answer.** Debuggers move a breakpoint from a line with no code to the next line that has code, and
   `source-map`'s `GREATEST_LOWER_BOUND` bias returns the closest segment. Fine for stepping and stack traces; for "edit this
   line" it turns a miss into an edit of the wrong element. Plumber should require exact index rows and refuse otherwise.
2. **Rewriting or wrapping the user's code, and a persistent database of speculative facts.** Istanbul-style wrapping of expressions
   (and the old `__source`/`__self` arguments) and Ghidra/IDA/radare2-style saved projects full of auto-analysis results both go
   stale and carry risk. Keep injection to one attribute and keep facts derived per page and per file hash; persist only user
   decisions (and transactions for undo).
3. **Hand-maintained heuristics for what counts as a library.** Regex lists of vendor paths (ours in `runtime()`, DevTools'
   known-third-party list, the inspector plugins' path filters) rot with every bundler release. Prefer what the bundler states
   (`ignoreList`, the project boundary) and use a pattern list only as a counted last resort.

## 6. Open items to verify before relying on this

- UNVERIFIED: exact React PR/commit that removed `_debugSource` and the first React version with `captureOwnerStack` (check react.dev and the React changelog).
- UNVERIFIED: whether Next/Turbopack write `ignoreList` into dev source maps for `node_modules`, and for workspace packages (check on the corpus; this decides how much of P6 step 1 is usable).
- UNVERIFIED: attribute and property names in code-inspector-plugin, LocatorJS and Svelte 5 dev output; read their repos before borrowing any naming.
- UNVERIFIED: paths of Dexter, the Ghidra `SourceType` class and IDA name flags; the concepts are well documented, the paths are from memory.
- UNVERIFIED: whether the ECMA-426 `debugId` and `ignoreList` fields are in the edition currently published; check https://tc39.es/ecma426/.

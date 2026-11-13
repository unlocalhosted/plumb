# Spec: every element finds the line it came from, or Plumber says why

Status: signed off by the owner on 2026-11-05. Code by Fable, one layer at a time; proof by the locate bench.

## The problem, as measured

- Plumber promises to edit the line an element came from. On Next it guesses that line from React's debug stacks,
  because `withPlumb` never stamps. On tailwindcss.com today: 22–33 % of elements found, **0 % of server
  components** (docs/verification/locate-real-next.md). With host stamps: 85–92 %, server components 96 %.
- Stamping is optional and fails silently: on Vite a wrong plugin order logs a warning and turns it off
  (src/hosts/source-stamping.ts:59); on Next it never ran.
- Stamping can crash an app: a stamp is a prop, and a component that rejects props throws (Headless UI's `Menu`
  rendering a Fragment: "Passing props on Fragment", tailwindcss.com, both bundlers).
- Your own code outside the app folder is never stamped: the Vite pass drops any file whose real path differs
  (source-stamping.ts:73), so a monorepo's `packages/ui` linked through node_modules is treated as a library.
- Library-drawn elements (an icon's `<svg>`, a dialog's inner `<div>`) have no JSX in your code. Today their answer
  comes from a stamp *prop on the component usage* (locate.js:219–245), the same prop that crashes some libraries.

## The rule

Every element on the page gets one of three answers, never a guess presented as fact:

1. **Your JSX** — the exact file:line:column of the JSX opening that made it. From a stamp.
2. **Your usage of a library** — the exact file:line:column where you used the component that drew it, and which
   prop you can edit there (className, a variant prop). From a usage record, checked against the build's JSX index.
3. **Not in your code** — said plainly with the reason ("drawn by lucide-react's Search, used at Toolbar.tsx:12" or
   "HTML string set at Article.tsx:40"), never a refusal with no place.

Stamping is mandatory. If it is not running, Plumber stops with the fix (see "Enforcement").

## Where elements come from, and the answer for each

| # | Origin | Example | Answer | How |
|---|---|---|---|---|
| 1 | Your DOM JSX | `<div className="p-4">` | the opening | host stamp |
| 2 | Your inline SVG | `<svg><path d=…/></svg>` in a .tsx | each tag's opening | host stamp (SVG tags are DOM tags) |
| 3 | Your components | `<Card>` defined in src | Card's inner DOM JSX; its usage on Alt+↑ | host stamps inside Card; usage record for the chain |
| 4 | Copied-in libraries | shadcn `components/ui/button.tsx` | the copied file's line (it is yours to edit) | host stamp; it is project source |
| 5 | Workspace packages | `packages/ui` in the same repo, linked via node_modules | that package's file:line | host stamp: "yours" means inside the repo and not an installed package, decided by real path, not by the node_modules segment |
| 6 | Installed component libraries | Radix `Dialog.Content`, Headless UI `Menu`, MUI | your usage line + the prop to edit | usage record (no prop passed to the library) |
| 7 | Icon packages | lucide `<Search className="size-4"/>` → `<svg><path/>` | the usage line for the svg *and* its inner paths | usage record; inner nodes of one library element share its answer |
| 8 | SVG files as components | `import Logo from './logo.svg'` (SVGR, Next's svg loader) | the usage line; Alt+↓ the .svg file | usage record + the module id of the .svg |
| 9 | Framework components | `next/link` → `<a>`, `next/image` → `<img>` | the usage line | usage record (same as 6) |
| 10 | Portals | a menu or tooltip rendered into `<body>` | the usage of the content component | usage record; portals keep React's owner, not the DOM parent |
| 11 | Slot / asChild / render props / cloneElement | `<Dialog.Trigger asChild><button>` | your `<button>` opening | host stamp on your child survives merge (cloneElement keeps props) |
| 12 | Server components | any of the above in an RSC | same answers as client | host stamps render into HTML; usage records must survive the RSC payload (open question A) |
| 13 | MDX | docs pages written in .mdx | the .mdx line | MDX pass: a rehype/recma step stamps elements with their mdx position (Next's @next/mdx, Vite's @mdx-js/rollup) |
| 14 | `React.createElement` / `jsx()` calls in your code | generated tables, factories | the call's line | owner stack, snapped to a call the build saw; else answer 3 |
| 15 | HTML strings | `dangerouslySetInnerHTML`, CMS markdown | "HTML set at file:line" (the container's stamp) | host stamp of the container; children say why they have no line |
| 16 | Generated / build output | `.next`, codegen folders, `dist` | not editable; points at the generator if known | excluded from stamping |
| 17 | Web components, iframes, canvas | `<my-chart>`, embeds | the usage line of the host tag | host stamp on the tag; inside is out of reach, said so |

## Codebase shapes

"Your code" has to mean the same thing in a one-app repo, a company monorepo and an open-source project. One rule
decides it, everywhere:

> A file is **yours** when its real path is inside the repository (the git top level, or the configured root when
> there is no git) and it is neither an installed package nor generated. Installed means its real path is inside a
> package manager's store or an installed `node_modules` package that is not a workspace member. Generated means
> ignored by git, or under a known output folder. `source` in plumber config can add or remove paths; it never has to
> for the shapes below.

A stamp names a file by **its path from the repository root plus its content hash**, not by its path from the app
folder, so the same `packages/ui/button.tsx` used by two apps is one file with one identity, and a write goes to it.

| Shape | What it looks like | What must hold |
|---|---|---|
| Single app | `src/` under the repo root | the baseline |
| npm / yarn / pnpm workspaces | `apps/*`, `packages/*`, members linked through `node_modules` (pnpm: symlinks into `.pnpm`) | a workspace member's files are yours by real path; an installed copy in the pnpm store is not |
| Turborepo, Nx, Lerna, Rush | the above plus task runners; Nx often uses `tsconfig` path aliases instead of links | aliases (`@acme/ui` → `libs/ui/src`) resolve to yours; nothing depends on the task runner |
| Internal packages consumed from source ("just in time") | `exports` points at `src/*.tsx`; Next `transpilePackages` | stamped like app code |
| Internal packages consumed compiled | `exports` points at `dist/`, built by tsup/tsc in watch | dist has no JSX: answer comes from the package's source map to its `src`, verified against the JSX index of that file; `doctor` names the package and offers source consumption |
| Separate design-system repo | linked with `file:`, `link:`, `npm link`, or a git submodule | yours when inside this repo's real path (submodule, file: into the tree); outside it, answered as a library with its usage; config can name it as yours |
| Vendored code | `third_party/`, `vendor/` checked in | yours by default (it is in the repo and editable); config can mark it as a library |
| Open-source project | library + docs site + examples + playground in one repo (shadcn: app reads `registry/` through aliases) | each app sees the shared folders as yours |
| Yarn Plug'n'Play | no `node_modules`; packages in zip archives | installed = resolved by PnP into the cache; never stamped, answered by usage |
| Bazel, Buck, Pants | sandboxed builds, outputs under `bazel-out`, sources mapped by the build | stamp in the dev transform on the source path the build reports; outputs are generated; UNVERIFIED until a fixture runs |
| Storybook, Ladle | the same components rendered by another dev server | same stamps, same identities |
| Micro-frontends, module federation | a remote module from another app or repo at runtime | yours only if its source is in this repo; otherwise answered as a library with the remote's name |
| Generated source in `src/` | GraphQL/Prisma/protobuf codegen, route trees | generated when git-ignored or marked by the generator's header; answered as "generated by …" |
| Containers, remote dev, Windows | paths differ between the browser, the server and the editor; `\` separators; case-insensitive file systems | identities are repo-relative POSIX paths plus hash; never absolute paths across the boundary |
| Several React copies, several apps in one tab | duplicated `react` in a monorepo, iframes | each root located with its own React; a second copy is reported, not a crash |
| Git worktrees | several checkouts of one repo | the repo root is the worktree's top level |

The bench gains one small fixture per shape it can run locally (pnpm workspace with a source-consumed and a compiled
package, Nx-style aliases, Yarn PnP, a git submodule, vendored code, generated code), each with the stamped-truth
and measured runs.

## Mechanisms

**Host stamps (rows 1–5, 11, 13, 15, 17).** `data-plumb-source="path:line:col#hash"` on every DOM-tag JSX opening
in project source. A `data-*` attribute on a DOM tag is always valid HTML and React passes it through, so this
can never crash a component. Component tags get no prop (this is what removes the Headless UI crash).

**Usage records (rows 3, 6–10, 12).** The usage site of a library component must be known *without* passing it a
prop. Candidates, to be decided by measurement (open question B):
- *B1, owner stack, verified.* React 19 records where each element was created (`_debugStack`, owner stacks: the
  official replacement for `_debugSource`). The stamping pass also emits a **JSX index** per file: the position of
  every JSX opening, component tags included, with the file hash. The overlay maps the frame and accepts it only if it
  lands on an indexed opening of the same hash; otherwise it says answer 3. Exact or honest, never wrong.
- *B2, a prop only where safe.* Keep the usage prop for components known to forward unknown props to a DOM tag
  (`next/link`, `motion.*`, most icon packages), from a short list plus a check of the component's rendered output;
  never for the rest. Cheaper per click, but a list to maintain.
- Rejected: a static `key` (changes when React remounts state), wrapping elements in a context provider (adds fibers
  and breaks libraries that inspect `children` types), wrapper components (same).

**The inner-node rule (row 7).** Every host a library element drew, down to the last `<path>`, answers with that
element's usage. Alt+↓ is not offered inside it.

## Enforcement (stamping is mandatory)

- **Vite:** `plumb()` after a JSX transform is an error that stops the dev server, naming the line to move. The
  public `stamp: false` option is removed (the static demo keeps an internal switch).
- **Next:** `withPlumb` always stamps in development, webpack and Turbopack, merged with the app's own rules. If a
  custom compiler setup prevents the loader from running, it throws at config load with the fix.
- **Runtime:** if a page renders elements from project files and none carries a stamp, the overlay shows "Source
  stamping isn't running" with the fix, and does not guess for project code. It never crashes the app.
- **CLI:** `npx plumber`, `plumber install` and `plumber doctor` set stamping up and fail (exit 1) when a real page
  has no stamps.

## Patterns we hold to (from docs/research/meta-tool-patterns.md; its sources are from memory, details marked UNVERIFIED there)

- **Identity is content, not path** (DWARF MD5, lldb UUID, Sentry debug IDs, LSP versions): every stamp, index row
  and write carries the file's hash; a write whose hash no longer matches is refused, never retried at a nearby line.
- **A line table built at compile time** (DWARF `.debug_line`, Istanbul coverage maps): the stamping pass emits the
  JSX index in the same walk as the stamps. A runtime frame is accepted only when it matches an index row exactly.
- **Two witnesses and a closed confidence ladder** (c8 vs Istanbul, gdb `<optimized out>`, Ghidra source types):
  stamp and owner stack are checked against each other; every answer records who said it and how sure; refusals are
  a closed set of typed reasons.
- **An injection allowlist, proven** (Istanbul's semantics-preserving counters): the only thing we inject is a
  `data-*` attribute on a lowercase DOM tag. Proof is differential: the same page rendered with and without stamps
  gives the same server HTML and hydrated DOM, apart from the attribute.
- **Truth-built tests** (LLVM debugify, Dexter, tc39 source-map tests, rr): golden corpora, metamorphic edits (insert
  a line above, the answer moves by one), a transform fuzzer, library-crash probes, recorded locate traces replayed.

Not copied: sliding to the nearest answer (breakpoints that move, source-map greatest-lower-bound bias: for an edit
target that turns a miss into the wrong element); wrapping or rewriting user code, or storing guessed facts; hand-kept
lists of what a library is where the bundler states it (`ignoreList`, the project boundary). This settles B toward
**B1**: a usage prop on components is an injection outside the allowlist, kept only if the bench shows B1 cannot
reach 95 %.

## Open questions, settled by the bench before code is final

- **A. Server components and usage records.** Does React's RSC debug info carry the element-creation stack of a
  library component used in a server component, and does Next map it? Measure on tailwindcss.com and shadcn v4.
- **B. B1 vs B2** on the showcase, tailwindcss.com, magicui, shadcn v4: share of library-drawn elements answered
  exactly, wrong answers (must be 0), first-click and warm time.
- **C. Host-only loss.** Today's Vite stamps put usage props on components; the bench compares full and host-only
  stamping on the showcase to see what host-only gives up before usage records replace it.
- **D. MDX** on tailwindcss.com's docs: share of elements answered with an .mdx line.

## Proof (done when)

- On every corpus app and both Next bundlers: your-code elements (rows 1–5) found ≥ 99 %, exact ≥ 99 %, wrong 0 %;
  library elements (rows 6–10) answered with a usage ≥ 95 %, wrong 0 %; no route fails to render with stamping on.
- e2e slices through the real boundary, one per row group: Headless UI `Menu` renders stamped (the crash), a lucide
  icon's `<path>` answers its usage, a workspace package is stamped, a server component and an RSC-used `next/link`
  answer exactly, an .mdx heading answers its line, and each enforcement error fires with its fix.
- Integration and e2e only, never unit tests.

## Writes, hot reload and the network (owner, 2026-11-05)

A write changes the file under every stamp in it, and the host reloads while the overlay may still be asking about
the old code. Every one of these must end in the right file contents and an answer about the code on screen, or a
plain refusal; never a lost edit, a doubled edit, or an answer about code that is gone.

| Race | What must hold |
|---|---|
| Your editor saves while Plumber writes | every write and undo is compare-and-swap on the file's content hash; a mismatch refuses with "the file changed", nothing is overwritten |
| Formatter or linter rewrites the file after Plumber's write (format on save, a watcher) | the next write and the undo see the new hash and refuse or rebase; undo never restores over someone else's change |
| A partial file seen by the watcher | writes go to a temp file in the same folder and are renamed into place, so the host sees one complete change |
| Several writes in one action (Apply across files, Tidy) | serialized per file, ordered, one trace group; a failure part way leaves each file either written or untouched, with Undo for what landed |
| Locate or Alt+click during the reload a write caused | requests carry the module generation they were made against; answers for an older generation are dropped, and the overlay asks again once the host has applied the update |
| Stamps with the old hash after a write | resolve refuses a stale hash (no nearest line); the overlay re-reads the element after the update and gets the new stamp |
| Fast Refresh vs full reload vs dev server restart (config change, Next restarting) | the overlay reconnects, re-reads its token and state, and pending requests fail with a typed reason, not a hang |
| A network drop after the server applied a write | a write carries an idempotency key; a retry with the same key returns the first result and does not apply twice |
| In-flight requests when the page navigates or the element goes away | aborted with the page's signal; their answers are never shown |
| Two tabs or two overlays on one project | writes to one file are serialized on the server; each overlay learns of the other's write through the same update path |
| Undo after the host already reloaded | undo is a write like any other (hash-checked, idempotent), so it works across reloads and restarts |

Proof is e2e stress, through the real boundary: a concurrent writer racing Plumber's write; a formatter rewriting
right after it; rapid Apply across several files under Vite HMR and Next Fast Refresh; a request in flight during a
reload; a response dropped after apply and retried; a dev server restart mid-request; two pages writing one file.
First an audit: which of these are already handled (the write guards, undo handles and traces exist), each proven
by a test, before any new code.

## Order of work (one layer at a time, each committed with its proof)

1. Host-only stamps on every host (removes the crash) + the "yours" rule and repo-relative identities from
   "Codebase shapes", with the workspace, alias, PnP, submodule, vendored and generated fixtures. Bench rerun.
2. Enforcement: errors on Vite, Next, runtime and CLI.
3. Usage records (B1 or B2, from open question B), the inner-node rule, portals.
4. Server components (A) and MDX (D).

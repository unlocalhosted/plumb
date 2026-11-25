# Changelog

## 0.8.0 · 2026-11-24

Everything since 0.7.0, as a person using it sees it.

- **`plumber apply` and `plumber undo`.** An agent (or a person) takes a whole problem group from `check --agent` in
  one command; the list shows the line on every group plumber can write. It writes with the fix bar's writer and
  guards, asks for `--token` when several tokens fit, and refuses what needs a person. `plumber undo` puts the files
  back while nothing has changed them since. The page check (`craft --url`) does the same for the fixes it can
  write itself: each ends with an `Apply:` line, and `--json` carries the fix as `apply`.
- **Agents need no install.** In a project without plumber, every command it prints (and the agent loop's) starts
  with `npx -p @unlocalhosted/react-plumber plumber`, because plain `npx plumber` fetches an unrelated npm package.
  The agent instructions say plumber works in any React app with no setup. `install --agent` works without the
  package and skips the check after each edit until it's installed, saying why. `--changed` outside a git repository
  says so in plain words.
- **Fixes land on plain-CSS pages.** On a page styled with `.css` files, the fix bar used to add Tailwind classes
  that did nothing there. It now writes the fix into the stylesheet rule that styles the element (`column-gap: 8px`
  in `.row`), names the CSS it sets, and Undo takes it back out of the file. A fix that only gives advice, or changes
  structure, still can't be written into a stylesheet.
- **Fewer fixes that backfire.** A size fix no longer offers a class that doesn't exist (`text-2xl--line-height` for a 34px
  text size). A fix is tried against every check about what it changes, so plumber no longer offers "Use weight 800"
  and then flags the extra-heavy weight it wrote. Shadow levels a hair apart are told to take the page's most-used
  level at once, instead of one step at a time, each fix making the next finding. A page-wide warning (a font with no
  `font-display`, a page with no h1) no longer holds back an unrelated fix, and the fix bar no longer flashes "can't
  write this change" before offering a fix it can write.
- **A missing class is no longer swapped for an unrelated one.** `animate-out` was offered as `animate-pulse`, with its variant written twice. Only a typo or a step of the same scale is offered now.
- **Fewer wrong findings.** Words drawn in a gradient or a fill colour are judged in that ink, not read as grey or as
  zero contrast. White is fine where the theme's surface is white. A carousel's track inside a sideways scroller
  isn't told to wrap.
- **A number that ticks is flagged.** A running timer or a live counter whose digits jump as it changes is told to
  use tabular figures, as numbers in a table or a list already were.
- **The X-ray card keeps what you did.** Changes waiting for Sync (sizes, spacing, and a picked shadow, move or
  layout) survive a reload, a fix taken elsewhere, and closing Blueprint. A drag keeps its change when you let go. Sync writes a picked
  step by its own name (`rounded-card`), not Tailwind's class of the same size. The card no longer covers the element
  it describes, and its pills can be read in the dark scheme.
- **Keys do one thing at a time.** Enter takes the fix the bar shows, even while the X-ray card has a change waiting,
  and only the thing Enter will act on shows ↵. In the X-ray card, the first Esc puts your changes back and the
  second closes the card.
- **Next.js is fast again.** On Next 15, plumber hears your saves again. On Next 15 and 16 it is ready in under a
  second instead of 10, so `plumber craft` and checks no longer wait ten seconds per page.
- **Plain words.** Plumber says "hard-coded" and "off your tokens" everywhere it used to say "typed by hand" and "off
  the scale". After `plumber init` it names the one step left (adding it to your dev server), and `init` says plainly
  what `--force` replaces. Double-clicking a button's words says to hold Alt to edit them, instead of doing nothing.
- **Agents see what matters first.** `plumber check --agent` lists the ten most urgent problems first (what draws
  nothing, then what one edit settles) and how many are left; `--top <n>` or `--top all` shows more.
- **Plumber says when something is wrong, and recovers.** If its reading thread stops (say its files vanish during a
  reinstall), it tries again on its own, and the dock says "Plumber stopped." with the cause in plain words, a
  countdown to the next try, Try now, and "Back" when it is. It used to say "Checking your project…" forever. A failure
  in your code names the cause and waits for your fix. A long start says why it may take a while, and a lost dev
  server is named after 30 seconds.
- **An undo goes back whole.** An undo made while another write to the same files arrived could, on a busy machine,
  put one file back and stop with an error. It now goes back whole or not at all.
- **Re-reading after a big write is faster.** Mapping compiled CSS back to its source works each stylesheet out once
  instead of once per declaration.

## 0.7.0 · 2026-11-23

Everything since 0.6.1, as a person using it sees it. 0.6.1 was tagged on GitHub but never published to npm, so its
one fix ships here too.

- **The X-ray card is the one card for an element.** Alt+click an element and open Measurements to change it there:
  pick one of your shadow tokens, each drawn as it looks; pick a move that suits the element (a press on what can be
  pressed, a focus ring on what takes focus), each playing on the element as you point at it; or lay out its parts
  stacked, side by side, in two columns, lined up or as many as fit. On a grid, each column is a chip you can resize,
  + and − add and remove columns, and the column lines can be dragged on the page. Every change waits for Sync, which
  writes it where that element's classes are written, and Esc puts it back. The old element card is gone, and with it
  "Tidy this card" and its size handles.
- **Light and dark colours written twice become roles.** `plumber propose --family color` lists each pair written by
  hand with `dark:`, the role it would become and how many places it covers. `plumber propose --roles` writes each
  role into your theme with its dark value and moves every place onto it (`text-zinc-900 dark:text-zinc-100` becomes
  `text-fg`). Pairs that drifted a little apart fold into the one used most, and a fold that would make words harder
  to read is never made. Clean up's colour pass offers the same step: each role with its light and dark swatch, every
  file written at once, and one Undo for all of it. Renaming colour tokens by their job can be reached from that bar
  again.
- **Plumber stays out of your app's way.** A typo in `plumber.config` no longer breaks every file of a Vite app: the
  file is served as written and the terminal says why. On Next, an overlay that can't load is a console warning
  instead of an error in your app, and only one overlay loads. The overlay's requests no longer go through your
  page's `fetch`, so one that failed can't show in Next's error dialog when a browser extension wraps `fetch`, and
  server components no longer set off failed requests for files on disk (80 on one page before, none now).
- **Editing words is more exact.** Words beside other elements (a paragraph with a bold word in it) are edited on the
  page itself, so the caret sits where you click and Backspace takes the letter beside it. Text that can't be edited
  says why: it is outside your editable files, drawn by a library, still loading, or has no file to trace to, as with
  MDX.
- **A padding change made in the visual editor is written on Sync.** It used to be refused as if your code had a style
  attribute there.
- **A fix lands on the element it is about** (from 0.6.1). When one line of code draws several elements and a class
  is added only to some of them by a condition, the finding is shown, and its fix written, on the elements that carry
  the class.

## 0.6.1 · 2026-11-21

- **A fix lands on the element it is about.** When one line of code draws several elements and a class is added only
  to some of them by a condition (`status.id === 'review' && 'rounded-[10px]'`, a red date only on late cards), the
  finding was shown on the first element that line draws, and taking its fix was refused there ("This change can't
  be written as classes here"). It is now shown on the elements that carry the class, and the fix is written.

## 0.6.0 · 2026-11-20

Everything since 0.5.0, as a person using it sees it.

- **Plain CSS and Sass can be changed like utility classes.** When a value comes from a CSS rule (a `.card { padding: 12px }` in a stylesheet, a CSS module, a `.scss` file), the X-ray says which rule, which file and every element it reaches. A pick on the card, a drag on a spacing, size or layout handle, and Tidy all write that rule, with your token's variable and one Undo. A change inside a `@media` that is in force goes inside it. In Sass the change goes through your project's own `sass` and its source map, and a value that comes from a mixin is described but not written. It works on Vite and on Next (webpack and Turbopack). A Sync after the file changed underneath is refused instead of writing over it.
- **Rename any token by its variable name.** `--brand-500` becomes `--accent` across CSS, Sass and code in one step, with Undo.
- **Motion recipes on plain CSS.** A recipe writes a `transition` and a `:hover` rule, or `@keyframes` and an `animation`, into your stylesheet.
- **Clean up on pages without utility classes.** Text styles are written into each element's own rule. Apply all writes every kept step as one change (one list of edits per file) and says what it left. You can go on from a preview without writing it, and each pass plays its change on the page.
- **About 150 new checks from Chrome's web guides,** in packs: accessibility (29), forms (33), components (37), HTML (34), and 17 that need the drawn page and that a linter can't see. A security pack reads your source for unsafe writes into the page.
- **Anti-slop checks.** Eleven marks of a generated screen, read off the drawn page, such as a small coloured label in capitals over a heading twice its size. A subtitle that only repeats its heading is judged by a model: Jev, with your key in `PLUMBER_JEV_KEY`, or a sentence-embedding service you run, at `PLUMBER_MEANING_URL`. With neither, that check is off. Your key stays on the dev server. Every finding says whether a rule or a model decided it.
- **The X-ray card says what is wrong first.** It reads top to bottom: what the element is, what is wrong and what to do, then the part in hand. Many notes page sideways one at a time. Holding Alt shows the X-ray anywhere, and Alt+click pins it. The card grows out of the pill by the pointer and shrinks back into it.
- **Blueprint opens on concerns.** The bar lists each concern with its count. Picking one lights its marks on the page and pins its notes, and quiets the rest. While you fix, the element has a ring, the fix bar sits beside it, and you choose the fix on the element itself. The count is in fixes and rolls down as fixes land.
- **Break it (Alt+S).** Stretch what can change on the page (longer words, narrower widths, bigger text, lists at none, one and a hundred, a failing or slow action, typing into fields) and see what breaks. Press F on a note to see its fix on your page.
- **Classes are found in more places.** A class kept in a lookup table (in this file or imported), passed through a local function or wrapper, set as a prop's default, or built by a `cva` recipe is located and written where it lives.
- **A large app is ready sooner and stays answerable.** On a 3,600-file app Plumber is ready about 34 seconds after the dev server starts, against 44 before: classes are collected on several threads, and each imported file is read once instead of once per importer. The whole-app list of findings builds in the background after start-up and after each edit, so pages answer in about 30 ms while it builds, and the bar on your page says "Reading your whole app…" until it is done. The results stay ready at rest instead of being let go after a quiet minute. A change near the top of a large app no longer runs it out of memory.
- **A page's files are judged together.** Before the whole-app list is ready, a finding that spans the files on your page (one hard-coded value in two components) lists its places in every file on the page.
- **Each token's kind is worked out** from its value, its uses and its name, and `plumber decisions` and the config `init` writes say how each was read. Token files a script names by path are read.
- **The page `plumber` opens is held back in this release.** `plumber` with nothing after it prints your project in a few lines and the next step. The page that asked about your spacing, colours, text and corners is being rebuilt; `PLUMBER_ONBOARDING=1` turns it on. `plumber init` asks the same questions in the terminal.
- **Every command Plumber prints runs as printed.** Next steps, the setup panel's Copy and the report's fix table write the command the way your project runs it, from its lockfile (`pnpm exec plumber init`, `npx plumber check --broken`).
- **One way in.** With no config, the setup panel's first step is "Choose your rules", which runs `plumber init`. The README's quick start is that path: `plumber init`, then `install --overlay --write`.
- **Smaller fixes.** A text shadow is no longer taken for a text size. A token whose value can't be worked out no longer stops the whole-app list. The first run no longer offers a token far from the value as "the closest". `--help` says where to start. `doctor` names the step when it can't read your Vite config. The config `init` writes lists the components it found in one line. A click on a Next.js page right after load finds the element by its stamp. An add into a component's own string says it lands on every use. Edits made before the whole-app list was built are no longer refused. The colour row reads `oklch`, so its sample and contrast are right. A spacing or radius under a pixel is left alone. History says where each change came from and what each Undo undoes.

- **A large app is ready sooner and stays answerable.** On a 3,600-file app Plumber is ready about 34 seconds after the dev server starts, against 44 before: classes are collected on several threads, and each imported file is read once instead of once per importer. The whole-app list of findings builds in the background after start-up and after each edit, so pages answer in about 30 ms while it builds, and the bar on your page says "Reading your whole app…" until it is done. The results stay ready at rest instead of being let go after a quiet minute.
- **A page's files are judged together.** Before the whole-app list is ready, a finding that spans the files on your page (one hard-coded value in two components) lists its places in every file on the page.
- **The page `plumber` opens is held back in this release.** `plumber` with nothing after it prints your project in a few lines and the next step. The page that asked about your spacing, colours, text and corners is being rebuilt; `PLUMBER_ONBOARDING=1` turns it on. `plumber init` asks the same questions in the terminal.
- **Every command Plumber prints runs as printed.** Next steps, the setup panel's Copy and the report's fix table write the command the way your project runs it, from its lockfile (`pnpm exec plumber init`, `npx plumber check --broken`).
- **One way in.** With no config, the setup panel's first step is "Choose your rules", which runs `plumber init`. The README's quick start is that path: `plumber init`, then `install --overlay --write`.
- **Smaller fixes.** A text shadow is no longer taken for a text size. A token whose value can't be worked out no longer stops the whole-app list. The first run no longer offers a token far from the value as "the closest". `--help` says where to start. `doctor` names the step when it can't read your Vite config. The config `init` writes lists the components it found in one line. A click on a Next.js page right after load finds the element by its stamp. An add into a component's own string says it lands on every use. Edits made before the whole-app list was built are no longer refused.

## 0.5.0 · 2026-11-13

Everything since 0.4.0, as a person using it sees it.

- **Alt+B is the X-ray.** Point at anything and see it whole: its padding, margin, gap, corners, width and height drawn on it in one colour each, and a card beside it with its name, its file and line, its type and colour, and whether each value is one of your theme's. Hold Shift over a part and drag it, or scroll with two fingers, and it snaps to your scale; the card's row chooses which sides move (one, a pair, all four) and where the change goes (just this one, all the copies here, everywhere the component is used). Changes collect; Enter syncs them to your code with Undo, Esc puts them back, and the X-ray says what it wrote, where, even after the page reloads. Enter with nothing to sync opens a note for your agent; Cmd+Enter copies it with the file and line. The list of problems is still there, and the problem in hand is X-rayed.
- **A change to a repeated part changes every copy.** A list row or a card drawn many times by one line of your code is one change, written once on that line; the other copies are outlined while you work. Alt as you start changes just the one.
- **A change is made in the class that is showing, and only there.** Padding, margin, gaps, layout and sizes were written into the base class even when a breakpoint or dark class was the one on screen, so a change made at a wide window quietly changed small screens instead. Now the class in force is the one edited (`md:p-6`, `dark:gap-4`), and every other class (other breakpoints, `hover:`, `focus:`, `dark:`) is left exactly as written. `hover:` and `focus:` are only touched while Plumber holds that state.
- **Resize an element by its edges.** A selected element has grips on its edges and corners. Dragging one draws a ruler across the page with every size your theme names; the edge snaps to them, and letting go writes that class, with Undo.
- **Big pages stay smooth.** Judging the page runs in short slices between frames instead of one long block (the longest pause on a large page went from 1.8 s to 0.3 s), the page is measured again only when it moved, and a page is sent only what it draws (on a 16,000-element page, 811 MB of answers became 52 MB).
- **Clean up this page has nine passes.** To text, spacing, colour and icons it adds corners, control sizes, shadows, timings and the disabled look. Each takes the value your theme names for the job: a card's corner, a button's height on your spacing unit, the shadow for something that floats, the speed your theme calls `fast`, one opacity for every disabled control. A pass proposes nothing your theme has no name for, and says why.
- **Plumber reads what each element is, once.** One reading (a button, a field, a tab, a link in a sentence or standing alone, a tag, a card, something over the page) is shared by every pass and craft rule, so a card gets a card's corner, shadow and padding, a tab bar is read as controls, and a linked card stays a card. A theme's tokens are read for their job the same way, by name.
- **Text styles by job.** A heading, words you read, a figure and a control's label each have their own ladder, so a 48px hero title and a 48px number are no longer the same style. Hero titles, large figures, captions and button labels join the system; two styles that come out looking the same are one style.
- **Spacing on your theme's own steps.** When your theme names a spacing scale (`--spacing-s4`), the spacing pass uses it, and padding and gaps in rows are put on it too.
- **Colour by job.** A colour used only for words is text, one only filled with is a surface, a fill darker than the page is sunken, and hover and press colours are read from where the code uses them. **Rename my colours…** moves your colour tokens to job names across the project in one step, with Undo, and refuses a rename that would merge two colours. One brand colour can generate the whole colour system, light and dark.
- **New craft checks:** words that run into other words, a picture stretched instead of cropped, a picture pulled tall by its row, a background photo that tiles, text in a flex row that can't shrink, a grid cell held open, a set height on text that wraps, a scrollbar with nothing to scroll, a sticky column stretched to its row, a fixed column with no narrow form, a list row that can't wrap, parts kept apart only by left-over space, and words over a picture with nothing behind them. Every suggestion uses the value your page already uses for the same job.
- **`plumber craft` reads more than the page at rest.** It reads each page at four window widths and with the pointer over things, so an overlap that only shows on a tablet or on hover is found. A finding says when it is true ("Seen in a window 768px wide").
- **Each craft finding links to its rule.** An "i" beside it in the fix panel, and a docs link in the CLI and `--json`.
- **The overlay in a new visual language.** Every panel uses the product's own colour and state names. The text card's size, style, case and colour are token pickers, and colour opens a picker that lists the nearest colours first, then every colour by role.
- **Locating after an edit on Next.js.** Right after you edit a file, Alt+click on what changed could refuse with "source changed" on Next's webpack dev server; it now finds the line.
- **Writes.** A rename and any undo re-read your project once at the end (a rename's undo went from about 30 s to 7–13 s); a write answers in about 150 ms; two Applies never end each other's hold on hot updates; a file with many class swaps is no longer refused for its long history label.
- **A wrapping list spread by left-over space** is found, and offered `justify-start` with a gap.
- **Smaller fixes.** A finding comes back after you try its fix and put it back. An overlay file added after your dev server started is served, without a restart. `plumber` with nothing after it listens for Ctrl+C before telling you to press it. A craft fix on a list row says how many other places the same line draws.

## 0.4.0 · 2026-11-06

Everything since 0.3.0, as a person using it sees it.

- **Alt+click finds the line on Next.js.** `withPlumb` now stamps every DOM tag of your JSX with its file, line and column in development, on webpack and Turbopack, server components included. On tailwindcss.com, found went from 40 % to 99.3 % (every judged answer exact, none in a wrong file), and server components from none to 98.9 %; on magicui from 17–43 % to 91–98 %.
- **Fast on large Next apps.** Next spends about 230 ms invoking any route handler on a large app, so after the first request the overlay talks to a small server React Plumber opens beside the route, on 127.0.0.1, for the page's origin and with the same token; a click on magicui went from 255 ms to 13 ms. Where the browser can't reach it, the route still answers.
- **Stamping is no longer optional.** On Vite, `plumb()` after the plugin that compiles JSX stops the dev server and names the line to move. On Next, a config that keeps the loader out stops at config load with the fix. A page whose elements carry no stamp says so in the overlay ("Source stamping isn't running") and Plumber refuses rather than guesses. `plumber doctor` exits 1 until it is fixed.
- **Stamps never break a library.** Only DOM tags get the attribute; component tags get nothing, so a component that rejects extra props (Headless UI's `Menu`) renders as it does without Plumber. The page with stamps is the page without them, apart from the attribute.
- **Elements a library drew answer with your usage.** An icon's `<svg>` and every `<path>` in it, a dialog in a portal, `next/link`'s `<a>`: the answer is the line where you used the component, with the props you can change there (`className`, `tone`, `variant`). It is accepted only on an exact JSX opening of that file version, never a nearby line; otherwise Plumber says the element is not in your code and which library drew it.
- **Your code, in any repository shape.** One rule decides what is yours: inside the repository and neither installed nor generated. Workspace packages linked through `node_modules`, tsconfig path aliases, `file:` and `link:` packages, vendored folders and a `src/features/build` folder are yours; installed packages, the pnpm store and Yarn's cache are not. Stamps name files from the repository root, so two apps sharing one `packages/ui` file write to one place.
- **A click right after load answers.** The overlay is ready only once React has hydrated the page (and Next has synced), and a click before that waits, then answers; a page that never hydrates says "Still loading". A stamp that can't be resolved is said as a refusal, never replaced by a guess.
- **Next 15 and monorepos.** Plumber's routes answer on Next 15 with webpack, including a `next.config` that exports a function. With no `source` configured, everything the rule calls yours is tracked, so a `components/` folder at the app root (as in many Next apps) is read and editable; `plumber init` no longer writes `source`.
- **Applying fixes no longer reloads your page.** On Vite, every Apply reloaded the whole page, and what you were doing on it was lost; that was React Plumber's own doing (its change log, and a wrong guess about theme stylesheets). A fix now lands as a hot update on Vite with `react()` and on Next.js with webpack and Turbopack, server components included. On a Vite config with no React plugin there is nothing to take the update, so a fix reloads the page once; the overlay lists "Turn on React Fast Refresh" as a setup step with the change ready to apply.
- **The project's text styles are the same from every page.** In a project that is not at the top of its repository (a monorepo app, a folder in a repository), the styles kept from other pages were dropped and each page proposed its own ladder.
- **"N copies" counts are right in a monorepo.** A fix that changes a line drawn in several places counted its copies as NaN when the project sat below the repository's top.
- **Refusals carry a code.** Every refusal answers a stable `code` beside its sentence (`stale-file`, `already-undone`, `changed-later`, `changed-by-hand`, `not-utf8`, `bad-request` and the rest of the list in `docs/invariants/api-contract.md`), so a script or an agent knows what to do without parsing words.
- **Files are written more carefully.** A file that is not UTF-8 is refused instead of rewritten, CRLF files stay CRLF, a byte-order mark is kept, and two dev processes on one project no longer mix up each other's undo history.
- **Writes are safe under hot reload.** A write replaces the file whole through a temporary file, so a watcher never reads half of it; every write and undo checks the file first and refuses if your editor or formatter changed it; a retry after a dropped response returns the first result instead of writing twice; a question asked before a hot update is asked again after it, on Vite and Next; a dev server restart is a named failure, not a hang; Vite hears each write at once.
- **The page about your project** leads with what to stop first: the three biggest causes in the terminal's own words, with their places; the Specimen shows every size of your theme with the sizes typed by hand that should become it.
- **Craft.** `plumber craft --scope <selector>` reads one element the way Alt+click does. Optical centre, overshoot and icon-on-capitals give fixes you can take; colours in oklch, oklab and `color(srgb)` are read; fixes to concentric corners, card padding, trim leading, hairlines and the elevation ladder.
- **Compatibility and performance** are in the README, as the locate bench measured them.

### Upgrading from 0.3.0

- Remove `stamp: false` from `plumb()` and the second argument from `withPlumb()`; both are gone. Stamping is always on in development and never in production builds.
- On Vite, put `plumb()` before `react()` in `plugins` (`plumber install --overlay --write` does it).
- On Next, if your `next.config` sets `webpack`, it must be a function that returns the config it is given.

## 0.3.0 · 2026-11-04

Everything since 0.2.0, as a person using it sees it.

- **Alt+click opens the element's card.** It reads only that element. Words open a value card with a spring drag and the hierarchy marked on the scale; layout and spacing are edited on the element itself; Shadow and Motion are shown as the element itself and tuned by handles. A fix is written the moment it is taken, with its own Undo, and only the fix in hand is lit. **Tidy this card** previews a card's hierarchy fixes at once and writes them in one go with one Undo.
- **Clean up this page.** Four passes in the panel: text, spacing, colour and icons. Each works inside the app's own scale and keeps what is already on it; refining the scale is opt-in. A write that partly lands is a step, kept with its Undo across its reload.
- **History is a timeline.** A tick per change and a segment per step; pointing at a change outlines its elements on the page; **Go back to here** undoes the rest in one write. Every change a write makes is traced, so any one change, or a group, can be undone on its own.
- **One bar for Blueprint**, each key on the action it presses; the dock at rest is its mark. Blueprint counts every place in the files the page renders, shown or not, reading the page from source once.
- **Causes.** Findings are grouped by what the author meant, across rules, in `check --json` and on the server. Every cause ends in an action: accept, adopt a default, or name the token that gives a value a class; `POST /__plumb/apply-all` takes a whole cause, written per file.
- **Recipes.** Shadow and motion values are read from any source into one model, mapped onto the project's own, and written in its idiom. A pick can add its class at a component usage that forwards `className`.
- **The type system a codebase reaches for.** Text is measured on every route; `POST /__plumb/system` proposes roles, bundles, cost and the write, and Blueprint offers the text styles the page reaches for. Colour is resolved by role on the signed-off colour system.
- **Libraries.** Base UI, Radix and shadcn adapters: their own variables are never dead or drift, portals, `asChild`, Slot and render props are followed, and declarations name the state they apply in. Detectors for Nx, Lerna, Deno, Turborepo, clsx, tailwind-merge, Ark UI and React Aria. styled-components, Emotion, StyleX and Linaria are named as unsupported; a mixed app still has its Tailwind judged.
- **Craft rules.** Every rule names the laws of UX it measures. New: an elevation ladder (a shadow a hair off a level the page uses more takes that level) and four spacing rules (heading lead, pair spacing, card optical padding).
- **CLI.** `npx plumber` opens a page about your project; with no browser it names the 3 biggest causes and one next step. `npx plumber --yes` sets up with no page and no question. A problem is one line for what is wrong and one for the fix; `plumber doctor` is three lines (`--verbose` keeps the detail). A finding line names the state it applies in.
- **Writes go where the classes are written**, never the shared component's line; a usage reaches its component through the project's own module resolution (barrels, aliases, re-exports). A Tailwind v4 `--spacing` multiplier gives the spacing scale its steps only when the project defines `--spacing` itself.

## 0.2.0 · 2026-10-28

Everything since 0.1.0, as a person using it sees it.

- **The fix panel.** Blueprint (Alt+B) now shows only heat on the page; the panel docked at the bottom holds one cause at a time (a class under a rule, every place it is used) with its options drawn as what they are. ↑ ↓ try an option on every place at once, Enter takes it, A applies what was taken in one guarded write per file, Esc puts it down. The selection ring, the chooser card, the Changes sidebar and the first-use walkthrough are gone.
- **The craft engine.** Seventy-odd rules a good designer would check, measured on the running page: button sides, concentric corners, inner and outer spacing, opacity-faded text, APCA contrast, line length, tabular numbers, widows, hit targets, half pixels, hairlines, shadows, z-index, motion, and the page's own habits (weights, greys, rhythm). Each finding has a fix the engine has already tried on the page, or says why there is none. Advisory rules are notes, never failures.
- **Pairs, probes, structure, the judge.** The page is also read in dark mode, on touch, hovered, pressed, with a toggle flipped, a menu open, a tooltip shown, the keyboard used, a spinner running (`--no-pairs`, `--no-probe`, `--probe drag`, `--probe-budget`). The source index names each element's component, library and role, so a fix can be a prop (`delayDuration={500}`). `--judge` asks a vision model about findings a rule would not stand behind, and keeps every answer under `.plumber/judge`.
- **`plumber craft`.** The craft engine headless, over a dev server's routes: text, `--json`, `--sarif`, exit 1 on findings; for CI.
- **The craft spec and `plumber spec`.** Every rule reads its numbers from one standard. The `craft` config key sets a preset (strict, balanced, relaxed), values per principle and rule, rules on or off and their tier, and the token policy. `plumber spec` prints what is in effect and where each value came from.
- **New tokens from the page.** When the theme has no step that settles a rule, the fix is a new token named and valued from the spec; taking it writes the token into the theme (in its own shape: `@theme`, `@theme inline`, `:root`) and swaps the class, with two undo handles. `POST /__plumb/token`.
- **Onboarding.** `plumber state` names a project's starting point from evidence. `plumber propose` harvests the values in use, clusters them into scales, names the steps and shows what each takes over; `propose --write` writes them to the theme and imports a new file. `plumber init` asks one question per family, writes the theme first, then the config, then the baseline. `plumber propose --decline` keeps a value out of the proposal.
- **Reading and editing.** Alt+click reads an element; Alt+two-finger scroll walks the tree; double-click edits words in place and writes the string that renders them (`text-at`); inline style values get token edits; every write returns an undo handle, undone from the dock (`GET /history`, `POST /undo`); the element props API (`GET /props`, `POST /set`); one apply per element and per file (`POST /swaps`).
- **The look.** Registration: heat where the page is off, fixes that glide and snap, all-clear, magnetism; the pastel visual language with one meaning per colour and one pattern per building block; the chrome keeps clear of what you work on.
- **Hosts and performance.** The blueprint reads a view as one batch (`POST /batch`); the Next.js host keeps up on large pages; the demo site has `/?craft`, `/?rules`, `/?team` and the fix-in-place states sheet.
- **Guards.** A token value is one CSS value: nothing that could end the declaration, open a comment or leave a string open is written to a theme file.
- **Package.** `CHANGELOG.md` ships; `sideEffects: false`; `next`, `tailwindcss` and `playwright` are declared optional peers.

## 0.1.0 · 2026-10-14

First public release.

- **CLI.** `plumber` reports drift from a React and Tailwind v4 (or plain CSS) design system across spacing, colour, radius, type, motion, elevation and z-index, plus habits, ownership and imitation; `init`, `doctor`, `baseline`, `accept` and the ledger make CI fail only on new drift.
- **Symbolic inline reading.** Inline style values written in code are read, not just matched: constants fold across imports, finite outcomes are judged one by one, a token beside a runtime number is judged by the token, and a constant times a runtime number is judged by its step.
- **Overlay.** Hold Alt over any element of your running app for its reading; pick a token, preview it, and write it to source. Vite plugin, Next.js loader, and `plumber serve` for anything else.
- **Blueprint mode.** Alt+B turns the view into a wireframe of the running page: greeked words, token-named dimensions and rails, amber breaks with the nearest token ghosted beside them, a count per element, a red wash by distance from the system, a note on point, hold D for the view as designed, and a title block with the causes of the drift by count.
- **GitHub Action**, SARIF, agent surfaces and the packed walkthrough.

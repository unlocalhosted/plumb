# Plain CSS at parity with utility classes

The owner, 2026-11-20: "we have to make everything compatible full parit support". Everything plumber reads and
writes for a page styled with utility classes should work the same for a page styled with plain CSS rules, and the
way to get there should leave room for more ways of styling later (CSS modules, styled-components and emotion,
vanilla-extract, a design system's props).

Reviewed by Fable on 2026-11-20 at the owner's request, for correctness and adaptability. The review read the code; it
ran nothing. Its findings are folded in below. The ones that change the plan are marked *(review)*.

## Where it stands

| What the person does | Where it is written today | Plain CSS today |
|---|---|---|
| Change a value in the X-ray, Sync | style systems on the page (`overlay/src/style-systems.js`) | works for 11 properties, outside `@media` and `@layer` |
| Read an element's values in the card | `props`: inline style, then classes | shows nothing set |
| Pick a value in the card | `set`: replaces or adds a class | adds a class that does nothing |
| Tidy, layout and spacing on the element card | `swaps` and `prop`: class edits | adds classes that do nothing |
| Take a finding's fix, Clean up | `apply`, `apply-all` | the server already proposes stylesheet edits (`src/surfaces/edits.ts`); not checked from a page |
| Shadow recipe | `recipes/apply` | already writes the element's rule, found by its class names (`src/recipes/plan.ts`) *(review)* |
| Motion recipe | `recipes/apply` | not checked |
| Rename a token | `rename` | rewrites `--color-*` names wherever it looks; other names (`--ink-2`) are missed |

Words (text edits) are not style and are not part of this.

## What is wrong with what we have *(review)*

- **The fallback writes a dead class and says it worked.** On a page with no utility classes, anything no rule claims
  gets a class added, the class does nothing, and Sync reports success.
- **The page computes the cascade by hand, and gets it wrong.** It skips every rule inside `@media`, `@layer`,
  `@supports`, `@container` and nested rules. It assumes a utility class beats a rule, which is false for Tailwind v4
  (utilities sit in `@layer utilities`, so any unlayered rule wins). It ignores `!important` and inline style, and it
  miscounts `:where()`, `:is()` and escaped class names.
- **The server can edit a declaration that doesn't win.** In `.title { font-size: 40px; font: 600 48px/1 X }` it edits
  the `font-size`, which the later `font` overrides.
- **Three stylesheet readers.** `src/session/css-rules.ts` (new, the weakest: it reads nested rules as top-level),
  the recipes' `scanStylesheet`, and the engine's own lowering in `src/lower/stylesheets.ts`, which already resolves
  nesting, `&`, media and layers through Lightning CSS. One should remain.
- **The write guards are thinner for CSS than for tokens.** `set-rule` drops `!important`, lets an unbalanced `(`
  through, skips the parse check for `.css` files, writes any `.css` under the root (`node_modules` included), and
  reads the hash in the same breath as the write, so it protects nothing.
- **A rule is named by its selector string.** The browser's spelling (`.a > .b`, `::after`) can differ from the file's,
  and CSS modules break it outright (the page sees `._title_x1y2z`, the file says `.title`).
- **Only 11 properties route to a rule.** No colour, background, margin, shadow, letter spacing, border or alignment.
  The card edits 24. The page keeps its own small copies of the property table the server already has.
- **Tokens are found by Tailwind's names only** (`--text-*`, `--spacing-*`). On a project with its own names the rule
  system writes a raw pixel value: plumber adding the hard-coded values it exists to remove.
- **Shared, state and inherited values aren't said.** A pick on one heading changes every `.title` without a word. A
  card read while hovering reports the `:hover` rule as the source. Text that inherits its size from a parent shows
  no source at all.
- **Source maps are read narrowly.** Only a map with one section per file works (Next's Turbopack in development).
  A map with many sources (webpack) returns nothing, and the bundle text is cached for the page's life.

## The system

Every reader and writer asks one question: *where is this property of this element written, and how is a value
written there?*

**The page gathers evidence; it doesn't decide** *(review)*. The browser alone knows which declaration wins right now.
The page proves it by effect: it changes the candidate declaration for a moment, reads the element's computed value,
and puts it back. If the value didn't move, it isn't the winner. That one check covers layers, `!important`, inline
style, media, scope, and whatever a future system emits. The page sends what it found: the winning declaration, its
sheet's origin (Vite's file, a bundle and its map position, `data-styled` or `data-emotion`), the condition it holds
under (media, layer, state, importance), how many elements the rule matches, where an inherited value comes from, and
the computed value. The page knows nothing about systems.

**The systems live on the server**, one object each, where the source can be read:

```
{
  id, says,                                // "a class", "a CSS rule", "a styled component"
  detect(project)               → boolean  // is this system in the project at all
  locate(site, evidence, prop)  → Origin | null
  encode(token, prop)           → text     // how this system spells a token
  edit(origin, value)           → Edit[]   // pure: { file, start, end, replacement }
  add(site, prop, value)        → Edit[] | { refused }
}
Origin = { system, file, start, end, value, token?, hash, sharedBy,
           conditions: { media, layer, state, important }, inheritedFrom?, writable: true | reason }
```

- **A place is a range in a file**, produced by the system, never a selector the server has to find again. That is
  what lets CSS modules, `styled.h2` templates and `.css.ts` exports work.
- **A change is neutral**: `{ prop, value, token? }`, and each system spells the token its own way (a class, `var(--x)`,
  `theme.space[4]`, `vars.space.md`, `p={4}`).
- **Systems return edits; the engine commits them**, with one guard, one hash check per file and one undo group across
  systems. Today's `setProp` already works this way.
- **No fixed order for values that exist**: the cascade decides, and the winning declaration's origin names the
  system. Order only matters for adding a value nothing sets: never inline; then the project's own system; a utility
  class only when the project has utilities. Otherwise refuse, in words.
- **Inline style is a system** too: the server already reads and writes it.
- **One stylesheet reader**: the engine's lowering (`src/lower/stylesheets.ts`). `css-rules.ts` and the recipes'
  scanner fold into it.
- **One property table**: the server's (`src/session/props.ts`), sent to the page instead of copied.

## Layers

One at a time, each shown working before the next, on a real plain-CSS app as well as plumber's own homepage.

0. **The interface on the server**, in the shape above, with Sync moved onto it and behaving as it does now. Includes
   the neutral change, edits handed to the engine, and the one property table.
1. **A truthful winner.** Proof by effect; rules inside blocks walked; `@layer` writable; media, state, importance,
   how many elements share it, and inherited-from carried with the evidence.
2. **The card reads rules.** It shows the value and says where it comes from, how many elements share it, and under
   what condition.
3. **The writes are made safe.** The last declaration among a property and its shorthands; `!important` kept; values
   and the stylesheet checked before and after; only your own stylesheets; the hash from the read, not a fresh one.
   And what "add" means on a page with no utility classes.
4. **The card's picks write rules,** in the project's own token names.
5. **Tidy, layout and spacing,** with one undo (free from layer 0).
6. **Finding fixes and Clean up,** mostly proving what `src/surfaces/edits.ts` already does.
7. **Recipes and rename,** with the recipes' rule finder folded into the rule system.
8. **The edges:** writing inside `@media`, two sides at once (`padding-x`), bundlers beyond Turbopack.
9. **Sass** (the owner, 2026-11-20: "we should support sass syntax too"). A `.scss` file is its own system. The browser
   only sees the compiled CSS, so a rule's selector won't match the nested source; the place comes from the source
   map instead (Vite needs `css.devSourcemap`; Next maps `.scss` already, unverified). The value is edited where it is
   written, read with a Sass-aware parser, never Lightning CSS. A value that comes from a `$variable` offers the
   variable's definition as the place; one that comes from a mixin or `@extend` is said, not written. Less and
   PostCSS nesting stay out until someone asks.

## Progress

- **Layers 0 to 9 (2026-11-20):** built and shown end to end on the plumber site (Next, plain CSS) and the ledger
  (Vite, Tailwind); journey 65 to 68. Open: the element card's layout and spacing buttons, Clean up's system pass,
  recipes and rename on the shared rule system, and Sass run against a real `sass` install.

## Decisions still open

- **A colour pick on `.lead { color: var(--ink-2) }`**: change the rule to another token, or change the token's
  definition. The second changes every use of the token.
- **"Just this one" on a shared rule**: it needs a new rule or class, and somewhere to put it.
- **Out of scope for now, said plainly:** production builds, shadow DOM, adopted stylesheets.

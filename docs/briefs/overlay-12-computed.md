# Overlay 12: computed classes are read where they are written

Measured on MetalUI's docs (Components → Button page, `bench/metalui/overlay.vite.config.mjs`): of 299 elements that
locate, 218 (73%) have no declarations at their JSX because the class string is built in code: `className={own}` with
`own = \`mu-button … ${buttonClasses(cap, size)} …\``, recipe/variant helpers (cva, tailwind-variants), `cn(...)`
from shadcn, conditional joins. The overlay can only say "computed here", so nothing on those elements can be fixed.

The browser knows the element's rendered class list; Plumb's collector already records every literal class token in
every tracked file (strings, templates, cn/cva/tv arguments) with its site. Join them:

1. New Session method and route `classes` (GET, `file`, `line`, `column`, `classes` = the rendered class list): starting at
   the located JSX, find the authored literal sites of each rendered class: first in the expression that feeds that
   element's `className` (follow identifiers, template parts, helper calls and imported helpers through the module graph,
   static evaluation only, never executing code), then in that component's file, then in files it imports. Return, per
   rendered class: its authored site(s), the declarations and findings at each site, and the structured edits there
   (same edit model as `edits`, so `apply` works unchanged). Classes that Plumb cannot attribute are listed as
   `unattributed` (never guessed). A class token that appears at several candidate sites that cannot be told apart by
   the static path is returned with all candidates and `ambiguous: true`.
2. `site` and `edits` stay as they are; the overlay will call `classes` when a located element has rendered classes the
   site does not account for.

Constraints: static analysis only; bounded (depth limit on imports and helper calls; budget in ms); warm-cache lookups.
Tests (integration, plus one browser e2e using the existing patterns): a component with `own` template + helper function
(MetalUI's button shape), a cva/tv variant recipe, shadcn `cn()` with conditionals, an imported helper module; each
rendered class maps to its literal site and its edit applies from Node and changes only that literal; a class from a
runtime-computed string (`'is-' + phase`) is unattributed. No unit tests. `npm test` and typecheck pass. Do not commit.
Summary to `docs/briefs/overlay-12-computed.result.md`.

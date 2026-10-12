# Brief: read shadcn's theme shape correctly

`npx shadcn init` writes a Tailwind v4 theme in one shape: raw values on `:root` and `.dark`
(`--primary: #2c50e8`), mapped to utilities by `@theme inline { --color-primary: var(--primary); }`,
with namespaces reset (`--text-*: initial`) and redefined. `node dist/cli.js --root site` judges
`site/src/styles.css`, which has this shape, and gets three things wrong. Each is one layer. Do them in
order and finish (tests green) before the next.

Ground rules (owner's, non-negotiable):
- No unit tests. Only e2e tests that run the built CLI (`node dist/cli.js --root <fixture> --json`)
  and assert on what a user sees: findings, rules, sites, messages, coverage.
- Small, atomic changes. Touch only what the layer needs.
- Another session is fixing template-literal dynamic classes and `--tw-*` undefined-variable false
  positives in this same working tree. Don't touch that code. Don't revert or reformat uncommitted
  changes you didn't make. `git diff` before you edit a file, to see what's already in flight there.
- Uncommitted hunks in src/rules/provenance.ts that belong to others and must survive: colour's
  `decisionIndex` and `attribution(...)` also include project-origin elevation decisions ("Project
  shadows own their colour literals"); the `decision.family === family` guard in `wrongTier`; the
  numericSpacing/numericUse hunks. Also leave src/collect/classes.ts, src/collect/cache.ts,
  src/rules/existence.ts, fixtures/tailwind-false-positives/ and e2e/false-positives.test.mjs alone.
  e2e/false-positives.test.mjs must still pass.
- Read docs/DESIGN.md 2.3 to 2.6 and 3.4 first. Where a layer changes behaviour DESIGN.md describes,
  update DESIGN.md in the same layer. Keep its voice: plain, short sentences.
- `npm run build` and then the whole e2e suite (`npm test` or whatever package.json uses) must pass
  at the end of every layer. Report any test that was already failing before you started.

## Fixture (part of layer 1)

Create `fixtures/shadcn-theme/` mirroring shadcn init output: copy `site/components.json` and
`site/src/styles.css` (take a snapshot now, since site/ is being edited by other sessions), plus a
`package.json` and a few small JSX files that use the utilities (`bg-primary`, `text-muted-foreground`,
`text-xs`, `text-sm`, `text-lg`, `text-2xl`, `text-5xl`, `font-mono`, `font-serif`, `font-medium`,
an `@apply` in CSS, a `transition` using `var(--dur-explode)`). Copy the shape of an existing fixture
(e.g. `fixtures/shadcn-preset`, `fixtures/tailwind-min`) for how fixtures resolve `tailwindcss`,
`tw-animate-css`, `shadcn/tailwind.css` and the fontsource imports. If a package can't resolve in a
fixture, drop that import rather than vendoring it. Also add one deliberate true positive per family
(a raw `#ff0000` in JSX, `p-[13px]`, a `transition: 333ms`) so tests can prove real findings survive.
Tests go in `e2e/shadcn-theme.test.mjs`.

## Layer 1: source definitions are not uses

Today `:root { --primary: #2c50e8 }` is reported as `provenance/color/by-value` with the fix
`--primary: var(--color-primary)`. That fix is circular because `--color-primary` is `var(--primary)`.
`.dark { --secondary: #141c33 }` is reported as "raw colour, not one of your colour tokens".

Rule: a custom property that a theme token references (`@theme inline { --color-primary: var(--primary) }`,
also plain `@theme`) is that token's source definition. Its declarations are not judged as uses in any
scope: `:root`, `.dark` or any class scope, `[data-theme=…]`, `:root[...]`, `html.dark`, and inside
`@media (prefers-color-scheme: …)`, `@media (prefers-reduced-motion: …)`, `@supports`, `@layer`.
Resolution (DESIGN 3.4) already leaves multi-valued variables unresolved. Keep that, so a token with a
`.dark` value has no single `resolved`.

Separately, as a safety net in the fix generator: never suggest a replacement whose `var()` chain
resolves back to the variable being declared (no self-reference, direct or through aliases).

Tests (through the CLI, on the fixture):
- no finding has a site on a `:root`/`.dark`/`@media` source definition line of a theme-referenced var;
- no finding's suggested fix, for any rule, contains `var(--color-X)` on a declaration of `--X`
  (generalise: no fix references a token whose chain reaches the declared property);
- colour coverage counts `bg-primary` etc. as using decisions;
- the deliberate raw `#ff0000` is still a `provenance/color` finding;
- a custom property in `:root` that no theme token references and that holds a raw colour is still judged
  as before (don't turn this into "ignore :root").

## Layer 2: a theme key the project defined is not a raw tier

`text-xs`, `text-sm`, `text-lg`, `text-2xl`, `text-5xl`, `font-mono`, `font-serif`, `font-medium` are
reported `provenance/type/tier` "raw type token; use a named one … No token is close to 12px".

Cause (verified): DESIGN 2.6 flips a family's default callers to `['semantic']` as soon as the family
has any semantic decision (`src/rules/provenance.ts` ~line 103, `src/surfaces/docs.ts` line 16). This
theme has `--font-heading: var(--font-serif)` and `--font-sans: var(--font-serif)`, so the whole type
family flips and every literal-valued text/font key fails, even keys no semantic names. The message
"No token is close to 12px" shows the rule has nothing better to offer.

Decided change (update DESIGN 2.6 to say this):
1. Under the inferred default (no `callers` in config), a reference to a primitive is a `/tier` finding
   only when that primitive has at least one semantic decision of the same family whose value refers to
   it. Then the message can name them, as 2.6's example does. A primitive no semantic names is the only
   name for that value and passes. Explicit `callers: ['semantic']` in config keeps today's strict behaviour.
2. An alias into a framework slot is wiring, not intent: `--font-sans`, `--font-serif`, `--font-mono`,
   `--font-heading`, `--font-body`, `--default-*`. Tailwind's preflight and shadcn read these names. Such an
   alias doesn't make its target "a primitive with semantics". So `font-serif` passes here.
3. `plumb check --decisions` / docs surface: report caller tiers per the new rule (no family-wide flip
   message unless config sets it).

Existing tests that must keep passing unchanged: `e2e/families.test.mjs` "tier defaults flip…"
(`bg-brand` fails because `--color-text-muted` aliases it), `e2e/attribution.test.mjs` tier,
`e2e/decisions-spacing.test.mjs` "spacing policies enforce origin, tier…" (`gap-base` aliased by
`--spacing-related`). If one of them breaks, stop and report instead of editing the assertion.

Tests: on the fixture, none of the listed utilities produce any `provenance/type/*` finding, and type
coverage reports them as using decisions. In a temp copy, add `--text-caption: var(--text-xs)` and
`text-xs` becomes a `/tier` finding naming `--text-caption` with `use.class === 'text-caption'`.

## Layer 3: `:root` motion custom properties are motion decisions

`:root { --dur-explode: 620ms; /* a figure comes apart */ }`, used as
`transition: … var(--dur-explode) …`, is reported "transition-duration 620ms isn't one of your motion
tokens", at the `:root` line. `--dur-move: 240ms` gets "use 140ms var(--default-transition-duration)".

Decision (per DESIGN 2.3's sources table, `:root` custom properties are a decision source, and 2.4:
a missing why is a warning, never what makes something a decision): in a project-owned stylesheet in the
Tailwind entry graph (the file that holds `@theme`, and its project imports), a custom property declared
in `:root` (or a theme scope from layer 1) whose value is one motion value (a duration, or a timing
function: `cubic-bezier()`, `linear()`, `steps()`, keyword) is a project motion decision, tier inferred
as usual. Its why is the `why:` comment above it, or failing that a trailing same-line comment. Its own
declarations are definitions, not uses. Overrides in `@media (prefers-reduced-motion: reduce)` make it
multi-valued (unresolved), which is fine. A `var(--dur-explode)` use then passes as a reference.
Don't widen this to other families in this layer.

Tests: no motion finding on `--dur-*`/`--stagger` lines or on uses through `var(--dur-*)`; the decision
shows up in `--json` `decisions` with `family: 'motion'`, `origin: 'project'` and its trailing-comment
why; the deliberate `transition: 333ms` is still a `provenance/motion` finding; the literal `400ms` delay
pattern (`transition: 'opacity var(--dur-move) var(--ease-out) 400ms'`) is still a finding for 400ms.

## When done

Write `docs/briefs/shadcn-theme-shape.result.md`: per layer, the files changed, the rule as built, the
tests added, and before/after counts from `node dist/cli.js --root fixtures/shadcn-theme`. Don't commit.

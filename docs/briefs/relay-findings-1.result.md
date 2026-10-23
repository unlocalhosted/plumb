# Relay findings 1 — result

Implemented in the requested order: **3, then 1, then 2**.

## 3. Inline theme resolution

Commit: `6c82924` (`fix(theme): resolve inline root aliases`).

Tailwind 4.3 supplies a framework `--radius` default. The decision reader was overwriting Relay's authored `:root { --radius: 8px }` with that default, then marking the conflicting backing value dynamic. Authored root values now take precedence.

Inline theme decisions resolve against light root values, while retaining known `.dark` results in `resolvedModes.dark` and in text inspection. General declaration resolution still treats scoped overrides conservatively. Conditional sources, missing variables and cycles remain unresolved.

The existing resolver handles nested `var()` and `calc()` expressions. Mixed rem/px arithmetic now uses the same initial 16px root-size convention as existing length comparisons; this is static comparison, not computed browser layout.

Fixture `fixtures/relay-theme/src/styles.css` is a copy of Relay's stylesheet. CLI E2E coverage proves:

- Radius steps resolve to **4 / 6 / 8 / 12px**.
- Light primary resolves to `#12805c`; known dark primary is `#2fbf8d`.
- Inline aliases resolve across color, spacing, radius, type, motion, elevation, z, opacity and size.
- `rounded-[12px]` matches `--radius-xl`, and reference-identity findings offer `rounded-xl`.
- Warm edits, rem arithmetic, missing aliases, cycles and conditional sources keep the expected behavior.

**Policy detail:** spacing/radius use value identity by default. Consequently, live Relay's equal `rounded-[12px]` now passes its radius scale. The fixture explicitly selects radius reference identity to prove the requested by-value token recommendation. No identity-policy default changed.

## 1. Static shadcn recipes and imitation

Commit: `c6675d1` (`fix(imitation): read static shadcn recipes`).

Extended the existing class-helper contracts rather than executing helper implementations. The reader understands `cn()` literal inputs, helper/import aliases and configured helper names, plus both `cva(base, config)` and `cva({ base, variants, defaultVariants })`.

Default fingerprints contain base plus default variant classes. Separate recipes retain each variant combination; selector names and `defaultVariants` values are not treated as classes. Matching compound-variant class payloads are included. Expansion is bounded to 64 combinations and recursive reads are bounded; unsupported runtime calls are not executed or guessed.

Known local UI directories supply recipe identities even when imports use a bundler-only alias. The reader also follows local polymorphic host choices such as `asChild ? Slot : 'button'`. Component and collection cache identities were revised, including helper configuration.

Inferred recipe matching requires combined evidence: at least six root classes, at least half of the unconditional recipe classes, and at least half of each nonempty variant axis's class payload. Best matching recipe supplies the replacement props. Existing explicit fingerprint OR matching stays unchanged; `imitation --suggest` still writes no configuration.

Fixture `fixtures/relay-imitation` copies Relay's button, badge, card and stylesheet; it never imports `examples/`. CLI E2E coverage proves populated Button/Badge/Card fingerprints, separate default/destructive recipes, correct replacement props, warm-cache agreement, both cva signatures, configured helpers, unresolved bundler aliases, and no inferred finding for different buttons—including one with the same geometry but different paint.

Live Relay now reports `src/app/TopBar.jsx:33` as **`imitation/Button`**, with:

```text
Use <Button variant="default" size="default"> from src/components/ui/button.jsx.
```

Its hand-built search control at line 17 also matches Button's outline/default recipe.

## 2. Negative numeric spacing

Commit: `0a5182c` (`fix(spacing): accept nested negative steps`).

Sibling spacing compiles through nested `calc()` wrappers. The former single-expression matcher missed these expressions. Numeric spacing now recognizes homogeneous multiples through the existing bounded length resolver, independent of sign, without accepting additive raw offsets or arbitrary literals merely because they mention `--spacing`.

Fixture `fixtures/negative-spacing` exercises positive and negative 1.5 steps for every negative-capable spacing root exposed by the installed compiler: margins (including logical block sides), sibling space, insets (including logical sides), legacy start/end, physical positions and scroll margins. Negative 7px arbitrary values remain findings. Translate utilities compile and remain outside the existing spacing judge; this patch does not add a new judged family/property.

Live Relay's `-space-x-1.5` no longer produces a spacing finding.

## Validation and scope

Focused CLI/integration checks passed for theme resolution, helper collection, ownership, imitation and numeric spacing. Chrome-backed focused checks ran using the requested browser path. No unit tests added.

Full-suite command (run once):

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Full-suite result: **exit 0; 557 passed, 0 failed, 5 expected mode-specific skips** across 562 test invocations:

- Main/native: 505 passed, 1 skipped.
- Bounded-nursery burst: 4 passed, 0 skipped.
- Polling: 25 passed, 1 skipped.
- Watch disabled: 23 passed, 3 skipped.

The complete output is retained locally at `/tmp/plumb-relay-full-suite.log`.

Final live CLI assertions passed for Relay's radius steps, default Button imitation, negative sibling spacing, and populated Button/Badge/Card fingerprints.

No changes authored in `examples/`, `overlay/src` or `site/src`. Unrelated work preserved. Each task commit ends with the requested co-author trailer. Nothing pushed.

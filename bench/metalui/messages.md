# MetalUI message audit

Before: isolated Git working tree at initial HEAD (2a2e727), built with existing dependencies. Linked worktree creation was blocked by read-only Git metadata, so an independent shared clone provided the HEAD working tree. Both runs analyze the same live MetalUI sources with their own version of all.config.ts. No ledger, theme, or MetalUI source was changed.

After command:

```sh
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/messages node dist/cli.js --root /Users/vijaysingh/unlocalhosted/metalui --config $PWD/bench/metalui/all.config.ts --json > bench/metalui/.cache/messages/report.json
```

Reports are retained in ignored .cache/messages/{before,report}.json. Regenerate this audit with `node bench/metalui/messages-audit.mjs`. Findings remain findings: the MetalUI command exits 1 because this is an audit of existing drift.

## Groups per rule

| Rule | Before (HEAD) | After | Delta |
|---|---:|---:|---:|
| config/no-tokens | 0 | 0 | 0 |
| dead/color | 1 | 1 | 0 |
| dead/elevation | 1 | 1 | 0 |
| dead/motion | 1 | 1 | 0 |
| dead/radius | 1 | 1 | 0 |
| dead/size | 1 | 1 | 0 |
| dead/spacing | 1 | 1 | 0 |
| dead/type | 1 | 1 | 0 |
| dead/z | 1 | 1 | 0 |
| decisions/unaccepted | 0 | 0 | 0 |
| decisions/vanished | 0 | 0 | 0 |
| existence/dead-class | 40 | 40 | 0 |
| existence/dead-var | 2 | 2 | 0 |
| existence/dynamic-class | 3 | 3 | 0 |
| habits/focus-outline | 91 | 91 | 0 |
| habits/hover-gate | 121 | 121 | 0 |
| habits/logical-inline | 255 | 255 | 0 |
| habits/no-ease-in | 0 | 0 | 0 |
| habits/overflow-clip | 13 | 13 | 0 |
| habits/overscroll-contain | 15 | 15 | 0 |
| habits/safe-area-fallback | 0 | 0 | 0 |
| habits/transition-named | 0 | 0 | 0 |
| habits/viewport-dynamic | 7 | 7 | 0 |
| imitation/Field | 1 | 1 | 0 |
| imitation/Textarea | 2 | 2 | 0 |
| ledger/grew | 0 | 0 | 0 |
| ledger/no-why | 0 | 0 | 0 |
| ledger/stale | 0 | 0 | 0 |
| ownership/Avatar | 1 | 1 | 0 |
| ownership/Button | 14 | 14 | 0 |
| ownership/Field.Input | 1 | 1 | 0 |
| ownership/FormField.Label | 4 | 4 | 0 |
| ownership/Icon | 2 | 2 | 0 |
| ownership/IconButton | 1 | 1 | 0 |
| ownership/Kbd | 1 | 1 | 0 |
| ownership/Link | 1 | 1 | 0 |
| ownership/MarkLine | 3 | 3 | 0 |
| ownership/Row | 2 | 2 | 0 |
| ownership/Row.Text | 3 | 3 | 0 |
| ownership/ScrollArea | 4 | 4 | 0 |
| ownership/Skeleton.Text | 1 | 1 | 0 |
| ownership/Surface | 1 | 1 | 0 |
| provenance/arbitrary | 24 | 23 | -1 |
| provenance/color | 55 | 55 | 0 |
| provenance/color/by-value | 46 | 29 | -17 |
| provenance/color/framework | 2 | 2 | 0 |
| provenance/color/tier | 0 | 0 | 0 |
| provenance/elevation | 92 | 82 | -10 |
| provenance/elevation/by-value | 5 | 5 | 0 |
| provenance/elevation/framework | 0 | 0 | 0 |
| provenance/elevation/tier | 0 | 0 | 0 |
| provenance/motion | 11 | 11 | 0 |
| provenance/motion/by-value | 34 | 31 | -3 |
| provenance/motion/framework | 2 | 2 | 0 |
| provenance/motion/tier | 0 | 0 | 0 |
| provenance/opaque-inline | 7 | 65 | 58 |
| provenance/radius | 4 | 14 | 10 |
| provenance/radius/by-value | 0 | 0 | 0 |
| provenance/radius/framework | 1 | 1 | 0 |
| provenance/radius/tier | 0 | 0 | 0 |
| provenance/spacing | 111 | 55 | -56 |
| provenance/spacing/by-value | 0 | 0 | 0 |
| provenance/spacing/framework | 0 | 0 | 0 |
| provenance/spacing/tier | 0 | 0 | 0 |
| provenance/type | 62 | 59 | -3 |
| provenance/type/by-value | 0 | 0 | 0 |
| provenance/type/framework | 3 | 3 | 0 |
| provenance/type/tier | 0 | 0 | 0 |
| provenance/z | 12 | 15 | 3 |
| provenance/z/by-value | 4 | 1 | -3 |
| provenance/z/framework | 0 | 0 | 0 |
| provenance/z/tier | 0 | 0 | 0 |
| **Total** | **1072** | **1050** | **-22** |

## Recipe exclusions

Each family uses the same exact-name allowlist through `decisions.<family>.suggest`. It is derived from the loaded CSS registry, excluding `--mu-r-*` and recursively excluding aliases whose values reach a recipe token. The tokens remain valid references and remain in the token inventory. Their literal amounts cannot certify or replace unrelated authored values.

| Family | Excluded token names | Recipe-derived theme keys |
|---|---:|---|
| spacing | 0 | None in this family’s selected token set |
| color | 424 | `--color-avatar-ring-ink`, `--color-brush-edge-ink`, `--color-brush-eraser-ink`, `--color-brush-ring-ink`, `--color-button-destructive-ink`, `--color-button-graphite-ink`, `--color-button-link-ink`, `--color-button-primary-ink`, `--color-button-strip-danger-ink`, `--color-button-strip-ink`, `--color-button-strip-ink-hover`, `--color-checkbox-tick-color`, `--color-chip-glass-action-ink`, `--color-chip-glass-ink`, `--color-chip-suggestion-ink`, `--color-chip-tag-ink`, `--color-code-card-code-ink`, `--color-code-card-diff-add-bg`, `--color-code-card-diff-add-ink`, `--color-code-card-diff-remove-bg`, `--color-code-card-diff-remove-ink`, `--color-code-card-tint-comment`, `--color-code-card-tint-keyword`, `--color-code-card-tint-line`, `--color-code-card-tint-number`, `--color-code-card-tint-string`, `--color-code-card-tint-type`, `--color-connector-end-free-fill`, `--color-connector-end-ring-ink`, `--color-connector-halo-ink`, `--color-connector-handle-fill`, `--color-day-ink-date`, `--color-day-ink-hole`, `--color-day-ink-left`, `--color-day-ink-moon`, `--color-day-ink-off`, `--color-day-ink-saturday`, `--color-day-ink-sunday`, `--color-dial-fill-color`, `--color-dial-mark-color`, `--color-dial-tick-color`, `--color-dial-track-color`, `--color-dial-track-edge`, `--color-dialog-scrim-color`, `--color-dialog-scrim-opaque`, `--color-draw-ink-amber`, `--color-draw-ink-blue`, `--color-draw-ink-green`, `--color-draw-ink-ink`, `--color-draw-ink-on-dark`, `--color-draw-ink-red`, `--color-field-field-caret`, `--color-field-field-hint`, `--color-field-field-ink`, `--color-field-search-ink`, `--color-folder-card-background`, `--color-folder-card-border`, `--color-folder-card-line-blue`, `--color-folder-card-line-ink`, `--color-folder-card-line-lg-ink`, `--color-folder-count-background`, `--color-folder-flap-border`, `--color-folder-flap-lift`, `--color-folder-hue-amber-bottom`, `--color-folder-hue-amber-top`, `--color-folder-hue-blue-bottom`, `--color-folder-hue-blue-top`, `--color-folder-hue-green-bottom`, `--color-folder-hue-green-top`, `--color-folder-hue-neutral-bottom`, `--color-folder-hue-neutral-top`, `--color-folder-hue-red-bottom`, `--color-folder-hue-red-top`, `--color-folder-hue-violet-bottom`, `--color-folder-hue-violet-top`, `--color-folder-region-ring-amber`, `--color-folder-region-ring-blue`, `--color-folder-region-ring-green`, `--color-folder-region-ring-neutral`, `--color-folder-region-ring-red`, `--color-folder-region-ring-violet`, `--color-folder-region-wash-amber`, `--color-folder-region-wash-blue`, `--color-folder-region-wash-green`, `--color-folder-region-wash-neutral`, `--color-folder-region-wash-red`, `--color-folder-region-wash-violet`, `--color-folder-shade-ink`, `--color-folder-shape-edge`, `--color-folder-shape-light`, `--color-folder-wash-amber`, `--color-folder-wash-blue`, `--color-folder-wash-green`, `--color-folder-wash-neutral`, `--color-folder-wash-red`, `--color-folder-wash-violet`, `--color-form-field-error-ink`, `--color-glyph-ink-ink`, `--color-glyph-ink-ink2`, `--color-glyph-ink-ink3`, `--color-hover-engraving-emphasis-color`, `--color-icon-button-ghost-ink`, `--color-icon-button-ghost-ink-hover`, `--color-icon-button-mini-accept-ink`, `--color-icon-button-mini-ink`, `--color-icon-button-mini-ink-hover`, `--color-icon-button-tool-glint`, `--color-icon-button-tool-ink`, `--color-kbd-strip-ink`, `--color-kbd-sunk-ink`, `--color-label-accent-color`, `--color-label-cell-color`, `--color-label-count-color`, `--color-label-dark-color`, `--color-label-detail-color`, `--color-label-display-color`, `--color-label-display-quiet-color`, `--color-label-emphasis-color`, `--color-label-engraved-color`, `--color-label-heading-color`, `--color-label-name-color`, `--color-label-on-graphite-color`, `--color-label-placeholder-color`, `--color-label-query-color`, `--color-label-readout-color`, `--color-label-readout-dim-color`, `--color-label-title-color`, `--color-label-value-color`, `--color-label-value-small-color`, `--color-link-card-host-ink`, `--color-link-card-meta-ink`, `--color-link-card-path-ink`, `--color-link-card-screen-shade`, `--color-link-card-screen-tint`, `--color-link-card-title-ink`, `--color-link-underline-ink`, `--color-mark-match-underline`, `--color-radio-pip-color`, `--color-row-rail-color`, `--color-row-text-checked`, `--color-scroll-area-thumb-ink`, `--color-select-chevron-ink`, `--color-select-veil-hover`, `--color-silhouette-code-ink`, `--color-silhouette-region-ink`, `--color-silhouette-text-ink`, `--color-skeleton-sheen-ink`, `--color-slider-mark-color`, `--color-slider-tick-color`, `--color-sparkline-base-color`, `--color-sparkline-dot-fill`, `--color-sparkline-dot-last-fill`, `--color-sparkline-dot-last-ring`, `--color-sparkline-dot-ring`, `--color-sparkline-line-color`, `--color-status-ink-failed`, `--color-status-ink-link`, `--color-status-ink-live`, `--color-status-ink-off`, `--color-status-ink-waiting`, `--color-swatch-label-ink-dark`, `--color-swatch-label-ink-light`, `--color-switcher-option-ink`, `--color-switcher-option-ink-on`, `--color-table-select-tint`, `--color-toast-close-ink`, `--color-toast-ink`, `--color-toast-kbd-ink`, `--color-toast-sub-ink`, `--color-toolbar-kbd-ink`, `--color-toolbar-search-ink`, `--color-toolbar-tool-ink`, `--color-tooltip-ink`, `--color-tooltip-key-ink`, `--color-weather-ink-cloud`, `--color-weather-ink-cloud-dark`, `--color-weather-ink-hill`, `--color-weather-ink-hz`, `--color-weather-ink-moon`, `--color-weather-ink-off`, `--color-weather-ink-rain`, `--color-weather-ink-snow`, `--color-weather-ink-star`, `--color-weather-ink-sun` |
| radius | 77 | `--radius-accordion-trigger-radius`, `--radius-attachment-radius`, `--radius-attachment-type-radius`, `--radius-breadcrumbs-fold-radius`, `--radius-button-group-key-radius`, `--radius-button-strip-radius`, `--radius-calendar-day-radius`, `--radius-checkbox-doing-radius`, `--radius-checkbox-ghost-radius`, `--radius-checkbox-radius`, `--radius-checkbox-row-radius`, `--radius-chip-glass-radius`, `--radius-connector-label-radius`, `--radius-day-page-radius`, `--radius-day-page-tear-radius`, `--radius-drop-zone-radius`, `--radius-drop-zone-well-radius`, `--radius-empty-state-well-radius`, `--radius-field-compact-radius`, `--radius-field-field-radius`, `--radius-field-regular-radius`, `--radius-field-search-radius`, `--radius-folder-back-radius`, `--radius-folder-card-radius`, `--radius-folder-card-thumb-radius`, `--radius-folder-flap-radius`, `--radius-glass-face-radius`, `--radius-glass-face-screen-radius`, `--radius-icon-button-tool-radius`, `--radius-kbd-radius`, `--radius-kbd-small-radius`, `--radius-menu-radius`, `--radius-menu-row-radius`, `--radius-menubar-key-radius`, `--radius-meter-radius`, `--radius-navigation-menu-link-radius`, `--radius-popover-radius`, `--radius-preview-card-radius`, `--radius-row-list-radius`, `--radius-row-option-radius`, `--radius-row-panel-radius`, `--radius-row-rail-radius`, `--radius-select-compact-radius`, `--radius-select-regular-radius`, `--radius-sheet-radius`, `--radius-sidebar-item-radius`, `--radius-silhouette-code-radius`, `--radius-silhouette-file-radius`, `--radius-silhouette-image-radius`, `--radius-silhouette-link-radius`, `--radius-silhouette-region-radius`, `--radius-silhouette-swatch-radius`, `--radius-silhouette-text-radius`, `--radius-skeleton-radius`, `--radius-slider-mark-radius`, `--radius-surface-radius-card`, `--radius-surface-radius-hero`, `--radius-surface-radius-pill`, `--radius-surface-radius-plate`, `--radius-surface-radius-region`, `--radius-surface-radius-row`, `--radius-surface-radius-strip`, `--radius-surface-radius-tip`, `--radius-swatch-radius`, `--radius-textarea-radius`, `--radius-toolbar-radius`, `--radius-toolbar-search-radius`, `--radius-toolbar-tool-radius`, `--radius-tooltip-radius`, `--radius-weather-screen-radius`, `--radius-well-radius-field`, `--radius-well-radius-pill`, `--radius-well-radius-region`, `--radius-well-radius-row`, `--radius-well-radius-strip`, `--radius-well-region-dot-core-radius`, `--radius-well-region-dot-fade-radius` |
| type | 39 | `--tracking-button-compact-tracking`, `--tracking-button-graphite-tracking`, `--tracking-button-link-tracking`, `--tracking-button-strip-tracking`, `--tracking-chip-glass-tracking`, `--tracking-chip-suggestion-tracking`, `--tracking-chip-tag-tracking`, `--tracking-code-card-code-tracking`, `--tracking-field-field-tracking`, `--tracking-field-search-tracking`, `--tracking-hover-engraving-tag-tracking`, `--tracking-kbd-tracking`, `--tracking-label-cell-tracking`, `--tracking-label-count-tracking`, `--tracking-label-detail-tracking`, `--tracking-label-display-quiet-tracking`, `--tracking-label-display-tracking`, `--tracking-label-engraved-tracking`, `--tracking-label-heading-tracking`, `--tracking-label-name-tracking`, `--tracking-label-on-graphite-tracking`, `--tracking-label-query-tracking`, `--tracking-label-readout-tracking`, `--tracking-label-small-tracking`, `--tracking-label-title-tracking`, `--tracking-label-value-small-tracking`, `--tracking-label-value-tracking`, `--tracking-link-card-host-tracking`, `--tracking-link-card-path-tracking`, `--tracking-link-card-title-tracking`, `--tracking-mark-chip-tracking`, `--tracking-mark-inferred-tracking`, `--tracking-menu-row-tracking`, `--tracking-silhouette-region-tracking`, `--tracking-status-badge-tracking`, `--tracking-swatch-label-tracking`, `--tracking-switcher-option-tracking`, `--tracking-toast-tracking`, `--tracking-tooltip-tracking` |
| motion | 52 | None in this family’s selected token set |
| elevation | 59 | None in this family’s selected token set |
| z | 10 | None in this family’s selected token set |

Recipe tokens or direct recipe aliases in choices: **0**.

These values describe component recipes: field size radii, WELL/CAP shadow layers, and modal or control recipe measurements. Equal geometry does not make them general layout, radius, or shadow choices. Following aliases also catches indirect recipe-derived keys, without excluding foundation radii, shared spacing, colourway tokens, or shared motion tokens.

## Real examples

Up to three distinct real groups per rule follow. When fewer exist, every available group is shown; the count is explicit. Zero means this MetalUI run cannot supply an example (tier checks are permitted by this preset; custom habits and ledger diagnostics are not enabled/present). No synthetic examples are presented as MetalUI findings. An absent action means the choice list supplies the instruction.

### config/no-tokens

0 real groups; fewer than three are available.

### dead/color

1 real group; fewer than three are available.

Example 1 — tokens/tokens.json:1820:1 (497 sites)

```text
title: 497 colour tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.color.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/elevation

1 real group; fewer than three are available.

Example 1 — tokens/tokens.json:177:1 (70 sites)

```text
title: 70 shadow tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.elevation.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/motion

1 real group; fewer than three are available.

Example 1 — tokens/tokens.json:113:1 (36 sites)

```text
title: 36 motion tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.motion.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/radius

1 real group; fewer than three are available.

Example 1 — tokens/tokens.json:8222:1 (75 sites)

```text
title: 75 radius tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.radius.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/size

1 real group; fewer than three are available.

Example 1 — packages/metalui/src/components/theme.css:75:1 (2 sites)

```text
title: 2 size tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.size.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/spacing

1 real group; fewer than three are available.

Example 1 — packages/metalui/src/components/theme.css:496:1 (840 sites)

```text
title: 840 spacing tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.spacing.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/type

1 real group; fewer than three are available.

Example 1 — packages/metalui/src/components/theme.css:6:1 (82 sites)

```text
title: 82 type tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.type.exported: true. Otherwise remove them.
first choice: (none)
```

### dead/z

1 real group; fewer than three are available.

Example 1 — tokens/tokens.json:947:1 (10 sites)

```text
title: 10 z-index tokens are never used in your source
because: Unused tokens make the theme harder to choose from.
action: If other apps use them, mark them published: decisions.z.exported: true. Otherwise remove them.
first choice: (none)
```

### decisions/unaccepted

0 real groups; fewer than three are available.

### decisions/vanished

0 real groups; fewer than three are available.

### existence/dead-class

40 real groups.

Example 1 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:317:60 (1 sites)

```text
title: `block-ai-composer` does nothing: no CSS is generated for it
because: The style it was meant to apply is missing, and nothing warns you.
action: Remove it, or define `.block-ai-composer` in a stylesheet.
first choice: (none)
```

Example 2 — apps/docs/src/blocks/availability-picker/availability-picker.tsx:297:85 (1 sites)

```text
title: `block-availability-picker` does nothing: no CSS is generated for it
because: The style it was meant to apply is missing, and nothing warns you.
action: Remove it, or define `.block-availability-picker` in a stylesheet.
first choice: (none)
```

Example 3 — apps/docs/src/blocks/settings/settings.tsx:324:19 (1 sites)

```text
title: `block-settings` does nothing: no CSS is generated for it
because: The style it was meant to apply is missing, and nothing warns you.
action: Remove it, or define `.block-settings` in a stylesheet.
first choice: (none)
```

### existence/dead-var

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/kds.css:508:12 (2 sites)

```text
title: `var(--c)` is never defined
because: The browser drops a declaration whose variable is undefined, so this background is not applied.
action: Define --c, or use a token instead.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:509:65 (1 sites)

```text
title: `var(--c-g)` is never defined, so it always uses `var(--c)`
because: The browser drops a declaration whose variable is undefined, so this background is not applied.
action: Define --c-g, or use a token instead.
first choice: (none)
```

### existence/dynamic-class

3 real groups.

Example 1 — apps/docs/src/pages/foundations/Materials.tsx:66:33 (1 sites)

```text
title: `mu-frost-${f}` is assembled at runtime, so Tailwind never generates it
because: Tailwind only generates classes it can read as complete strings in your source.
action: Map each value to a complete class, e.g. { a: 'mu-frost-a', b: 'mu-frost-b' }.
first choice: (none)
```

Example 2 — apps/docs/src/demos/FeelingsComposer.tsx:72:37 (1 sites)

```text
title: `mu-tint-${tint}` is assembled at runtime, so Tailwind never generates it
because: Tailwind only generates classes it can read as complete strings in your source.
action: Map each value to a complete class, e.g. { a: 'mu-tint-a', b: 'mu-tint-b' }.
first choice: (none)
```

Example 3 — apps/docs/src/ui/doc.tsx:109:58 (1 sites)

```text
title: `on-${surface}` is assembled at runtime, so Tailwind never generates it
because: Tailwind only generates classes it can read as complete strings in your source.
action: Map each value to a complete class, e.g. { a: 'on-a', b: 'on-b' }.
first choice: (none)
```

### habits/focus-outline

91 real groups.

Example 1 — apps/docs/src/blocks/settings/settings.tsx:355:104 (5 sites)

```text
title: `outline-none` removes the focus outline on h3
because: Keyboard users lose track of focus, and forced-colors mode shows nothing.
action: Restore an outline on :focus-visible.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:100:10 (1 sites)

```text
title: `outline` removes the focus outline on :focus
because: Keyboard users lose track of focus, and forced-colors mode shows nothing.
action: Restore an outline on :focus-visible.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:382:54 (1 sites)

```text
title: `outline` removes the focus outline on .pal-field input
because: Keyboard users lose track of focus, and forced-colors mode shows nothing.
action: Restore an outline on :focus-visible.
first choice: (none)
```

### habits/hover-gate

121 real groups.

Example 1 — apps/docs/src/demos/MorphGlyphs.tsx:82:69 (19 sites)

```text
title: `hover:text-ink` also applies on touch screens
because: Touch can leave a hover style stuck after a tap.
action: Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)).
first choice: (none)
```

Example 2 — apps/docs/src/pages/Changelog.tsx:52:69 (4 sites)

```text
title: `hover:decoration-ink` also applies on touch screens
because: Touch can leave a hover style stuck after a tap.
action: Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)).
first choice: (none)
```

Example 3 — apps/docs/src/pages/Icons.tsx:80:137 (9 sites)

```text
title: `hover:material-well` also applies on touch screens
because: Touch can leave a hover style stuck after a tap.
action: Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)).
first choice: (none)
```

### habits/logical-inline

255 real groups.

Example 1 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:112:81 (1 sites)

```text
title: `pl-48` is a physical side
because: It doesn't mirror in right-to-left layouts.
action: Use `padding-inline-start`.
first choice: (none)
```

Example 2 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:112:87 (1 sites)

```text
title: `@max-md/block:pl-32` is a physical side
because: It doesn't mirror in right-to-left layouts.
action: Use `padding-inline-start`.
first choice: (none)
```

Example 3 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:174:53 (1 sites)

```text
title: `ml-2` is a physical side
because: It doesn't mirror in right-to-left layouts.
action: Use `margin-inline-start`.
first choice: (none)
```

### habits/no-ease-in

0 real groups; fewer than three are available.

### habits/overflow-clip

13 real groups.

Example 1 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:317:116 (9 sites)

```text
title: `overflow-hidden` on section creates a scroll container
because: It breaks position: sticky inside and still allows script scrolling.
action: Use overflow-clip if nothing scrolls it.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:333:233 (1 sites)

```text
title: `overflow-hidden` on .pair > div creates a scroll container
because: It breaks position: sticky inside and still allows script scrolling.
action: Use overflow-clip if nothing scrolls it.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:587:134 (1 sites)

```text
title: `overflow-hidden` on .xr-bench creates a scroll container
because: It breaks position: sticky inside and still allows script scrolling.
action: Use overflow-clip if nothing scrolls it.
first choice: (none)
```

### habits/overscroll-contain

15 real groups.

Example 1 — apps/docs/src/blocks/availability-picker/availability-picker.tsx:339:58 (1 sites)

```text
title: div scrolls, and its scroll leaks to the page
because: Reaching its edge scrolls the page behind it.
action: Add overscroll-contain.
first choice: (none)
```

Example 2 — apps/docs/src/blocks/studio-week/studio-week.tsx:375:66 (5 sites)

```text
title: div scrolls, and its scroll leaks to the page
because: Reaching its edge scrolls the page behind it.
action: Add overscroll-contain.
first choice: (none)
```

Example 3 — apps/docs/src/ui/doc.tsx:238:58 (1 sites)

```text
title: pre scrolls, and its scroll leaks to the page
because: Reaching its edge scrolls the page behind it.
action: Add overscroll-contain.
first choice: (none)
```

### habits/safe-area-fallback

0 real groups; fewer than three are available.

### habits/transition-named

0 real groups; fewer than three are available.

### habits/viewport-dynamic

7 real groups.

Example 1 — apps/docs/src/pages/NotFound.tsx:11:26 (1 sites)

```text
title: `60vh` uses vh, which jumps on mobile
because: Mobile toolbars change the viewport height.
action: Use dvh for a changing viewport, svh for the smallest, lvh for the largest.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:75:14 (1 sites)

```text
title: `100vh` uses vh, which jumps on mobile
because: Mobile toolbars change the viewport height.
action: Use dvh for a changing viewport, svh for the smallest, lvh for the largest.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:211:57 (1 sites)

```text
title: `calc(100vh - 64px)` uses vh, which jumps on mobile
because: Mobile toolbars change the viewport height.
action: Use dvh for a changing viewport, svh for the smallest, lvh for the largest.
first choice: (none)
```

### imitation/Field

1 real group; fewer than three are available.

Example 1 — apps/docs/src/pages/components/TagCue.tsx:27:7 (1 sites)

```text
title: This <input> rebuilds Field by hand (`material-well`)
because: A copy misses Field's states, focus ring and future fixes.
action: Use <Field> from @unlocalhosted/metalui.
first choice: (none)
```

### imitation/Textarea

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/pages/components/ColourCue.tsx:22:7 (8 sites)

```text
title: This <textarea> rebuilds Textarea by hand (`material-well`)
because: A copy misses Textarea's states, focus ring and future fixes.
action: Use <Textarea> from @unlocalhosted/metalui.
first choice: (none)
```

Example 2 — apps/docs/src/ui/cues/ProvenanceDocument.tsx:97:7 (1 sites)

```text
title: This <textarea> rebuilds Textarea by hand (`var(--mu-r-well-`)
because: A copy misses Textarea's states, focus ring and future fixes.
action: Use <Textarea> from @unlocalhosted/metalui.
first choice: (none)
```

### ledger/grew

0 real groups; fewer than three are available.

### ledger/no-why

0 real groups; fewer than three are available.

### ledger/stale

0 real groups; fewer than three are available.

### ownership/Avatar

1 real group; fewer than three are available.

Example 1 — apps/docs/src/pages/components/CueRecognition.tsx:37:111 (2 sites)

```text
title: `mark-person` changes Avatar's font
because: Avatar controls its type; outside overrides break when its design changes.
action: Use a variant: size = small | regular | large. Defined in packages/metalui/src/components/avatar/avatar.tsx:53.
first choice: (none)
```

### ownership/Button

14 real groups.

Example 1 — apps/docs/src/kds.css:666:3 (1 sites)

```text
title: `.landing-cta` sets Button's letter-spacing
because: Button controls its type; outside overrides break when its design changes.
action: Use a variant: cap = standard | primary | destructive | link | graphite | strip | strip-danger; size = default | compact; state = idle | waiting | done | error. Defined in packages/metalui/src/components/button/button.tsx:85.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/Button.tsx:262:51 (1 sites)

```text
title: `px-0!` changes Button's padding-inline-end
because: Button controls its padding; outside overrides break when its design changes.
action: Use a variant: cap = standard | primary | destructive | link | graphite | strip | strip-danger; size = default | compact; state = idle | waiting | done | error. Defined in packages/metalui/src/components/button/button.tsx:85.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:667:3 (1 sites)

```text
title: `.landing-cta` sets Button's text-shadow
because: Button controls its colour; outside overrides break when its design changes.
action: Use a variant: cap = standard | primary | destructive | link | graphite | strip | strip-danger; size = default | compact; state = idle | waiting | done | error. Defined in packages/metalui/src/components/button/button.tsx:85.
first choice: (none)
```

### ownership/Field.Input

1 real group; fewer than three are available.

Example 1 — apps/docs/src/blocks/share-panel/share-panel.tsx:373:167 (1 sites)

```text
title: `text-ink2` changes Field.Input's color
because: Field.Input controls its colour; outside overrides break when its design changes.
action: Field.Input has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/field/field.tsx:58.
first choice: (none)
```

### ownership/FormField.Label

4 real groups.

Example 1 — apps/docs/src/blocks/share-panel/share-panel.tsx:310:43 (1 sites)

```text
title: `sr-only` changes FormField.Label's padding-bottom
because: FormField.Label controls its padding; outside overrides break when its design changes.
action: FormField.Label has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/form-field/form-field.tsx:39.
first choice: (none)
```

Example 2 — apps/docs/src/blocks/share-panel/share-panel.tsx:310:43 (1 sites)

```text
title: `sr-only` changes FormField.Label's padding-left
because: FormField.Label controls its padding; outside overrides break when its design changes.
action: FormField.Label has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/form-field/form-field.tsx:39.
first choice: (none)
```

Example 3 — apps/docs/src/blocks/share-panel/share-panel.tsx:310:43 (1 sites)

```text
title: `sr-only` changes FormField.Label's padding-right
because: FormField.Label controls its padding; outside overrides break when its design changes.
action: FormField.Label has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/form-field/form-field.tsx:39.
first choice: (none)
```

### ownership/Icon

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/pages/library.css:16:34 (2 sites)

```text
title: `.section-entry svg` sets Icon's color (may apply)
because: Icon controls its colour; outside overrides break when its design changes.
action: Icon has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/icons/Icon.tsx:176.
first choice: (none)
```

Example 2 — apps/docs/src/pages/foundations/Sizing.tsx:63:77 (3 sites)

```text
title: `text-ink2` changes Icon's color
because: Icon controls its colour; outside overrides break when its design changes.
action: Icon has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/icons/Icon.tsx:176.
first choice: (none)
```

### ownership/IconButton

1 real group; fewer than three are available.

Example 1 — apps/docs/src/blocks/task-inbox/task-inbox.tsx:609:30 (1 sites)

```text
title: `aria-pressed:text-success` changes IconButton's color
because: IconButton controls its colour; outside overrides break when its design changes.
action: Use a variant: variant = tool | ghost | mini. Defined in packages/metalui/src/components/icon-button/icon-button.tsx:32.
first choice: (none)
```

### ownership/Kbd

1 real group; fewer than three are available.

Example 1 — apps/docs/src/ui/edit/edit.css:68:48 (1 sites)

```text
title: `.ed-tag-key[data-held] kbd` sets Kbd's box-shadow (may apply)
because: Kbd controls its shadow; outside overrides break when its design changes.
action: Use a variant: size = default | small; surface = default | strip | sunk | plain. Defined in packages/metalui/src/components/kbd/kbd.tsx:34.
first choice: (none)
```

### ownership/Link

1 real group; fewer than three are available.

Example 1 — apps/docs/src/pages/components/Link.tsx:20:280 (1 sites)

```text
title: `focus-ring` changes Link's outline
because: Link controls its colour; outside overrides break when its design changes.
action: Use a variant: kind = inline | quiet | standalone. Defined in packages/metalui/src/components/link/link.tsx:25.
first choice: (none)
```

### ownership/MarkLine

3 real groups.

Example 1 — apps/docs/src/pages/components/DateCue.tsx:28:26 (2 sites)

```text
title: `type-content` changes MarkLine's font
because: MarkLine controls its type; outside overrides break when its design changes.
action: Use a variant: presentation = semantic | reading. Defined in packages/metalui/src/components/mark/mark.tsx:78.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/DateCue.tsx:28:39 (3 sites)

```text
title: `text-ink` changes MarkLine's color
because: MarkLine controls its colour; outside overrides break when its design changes.
action: Use a variant: presentation = semantic | reading. Defined in packages/metalui/src/components/mark/mark.tsx:78.
first choice: (none)
```

Example 3 — apps/docs/src/pages/components/DateCue.tsx:28:26 (2 sites)

```text
title: `type-content` changes MarkLine's letter-spacing
because: MarkLine controls its type; outside overrides break when its design changes.
action: Use a variant: presentation = semantic | reading. Defined in packages/metalui/src/components/mark/mark.tsx:78.
first choice: (none)
```

### ownership/Row

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/pages/components/Spinner.tsx:98:39 (1 sites)

```text
title: `recipe-well-field` changes Row's background
because: Row controls its colour; outside overrides break when its design changes.
action: Use a variant: variant = list | panel | option. Defined in packages/metalui/src/components/row/row.tsx:36.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/Spinner.tsx:98:39 (1 sites)

```text
title: `recipe-well-field` changes Row's box-shadow
because: Row controls its shadow; outside overrides break when its design changes.
action: Use a variant: variant = list | panel | option. Defined in packages/metalui/src/components/row/row.tsx:36.
first choice: (none)
```

### ownership/Row.Text

3 real groups.

Example 1 — apps/docs/src/ui/edit/edit.css:148:36 (1 sites)

```text
title: `.ed-layer[data-off] .mu-row-text` sets Row.Text's color (may apply)
because: Row.Text controls its colour; outside overrides break when its design changes.
action: Row.Text has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/row/row.tsx:57.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/Spinner.tsx:99:102 (1 sites)

```text
title: `text-ink` changes Row.Text's color
because: Row.Text controls its colour; outside overrides break when its design changes.
action: Row.Text has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/row/row.tsx:57.
first choice: (none)
```

Example 3 — apps/docs/src/pages/components/Spinner.tsx:99:88 (1 sites)

```text
title: `text-ink2` changes Row.Text's color
because: Row.Text controls its colour; outside overrides break when its design changes.
action: Row.Text has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/row/row.tsx:57.
first choice: (none)
```

### ownership/ScrollArea

4 real groups.

Example 1 — apps/docs/src/pages/components/ScrollArea.tsx:23:91 (2 sites)

```text
title: `recipe-well-field` changes ScrollArea's background
because: ScrollArea controls its colour; outside overrides break when its design changes.
action: ScrollArea has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/scroll-area/scroll-area.tsx:34.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/ScrollArea.tsx:23:91 (2 sites)

```text
title: `recipe-well-field` changes ScrollArea's box-shadow
because: ScrollArea controls its shadow; outside overrides break when its design changes.
action: ScrollArea has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/scroll-area/scroll-area.tsx:34.
first choice: (none)
```

Example 3 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:324:90 (1 sites)

```text
title: `pt-mu-space-12` changes ScrollArea's padding-top
because: ScrollArea controls its padding; outside overrides break when its design changes.
action: ScrollArea has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/scroll-area/scroll-area.tsx:34.
first choice: (none)
```

### ownership/Skeleton.Text

1 real group; fewer than three are available.

Example 1 — apps/docs/src/pages/library.css:37:40 (1 sites)

```text
title: `.place-note > span` sets Skeleton.Text's color (may apply)
because: Skeleton.Text controls its colour; outside overrides break when its design changes.
action: Skeleton.Text has no variant for this. Ask for one, or wrap it in an element you style. Defined in packages/metalui/src/components/skeleton/skeleton.tsx:34.
first choice: (none)
```

### ownership/Surface

1 real group; fewer than three are available.

Example 1 — apps/docs/src/ui/LayerSorter.tsx:45:111 (1 sites)

```text
title: `border-radius` changes Surface's border-radius
because: Surface controls its corners; outside overrides break when its design changes.
action: Use a variant: material = raise | raise-lite | raise-sm | frost | plate | panel | pop | tip | lens | graphite | graphite-plain | graphite-strip | graphite-deep | graphite-glass; radius = pill | hero | card | plate | strip | region | tip | row. Defined in packages/metalui/src/components/surface/surface.tsx:52.
first choice: (none)
```

### provenance/arbitrary

23 real groups.

Example 1 — apps/docs/src/blocks/settings/settings.tsx:341:88 (1 sites)

```text
title: `pb-[5.5rem]` hardcodes 5.5rem
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 80px --spacing-mu-space-80 pb-mu-space-80 padding-bottom: var(--spacing-mu-space-80)
```

Example 2 — apps/docs/src/pages/components/CueFamily.tsx:67:48 (1 sites)

```text
title: `top-[2.5px]` hardcodes 2.5px
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 2px --spacing-mu-space-2 top-mu-space-2 top: var(--spacing-mu-space-2)
other choices: 4px --spacing-mu-space-4 top-mu-space-4
```

Example 3 — apps/docs/src/pages/components/CueFamily.tsx:86:73 (1 sites)

```text
title: `top-[3.5px]` hardcodes 3.5px
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 2px --spacing-mu-space-2 top-mu-space-2 top: var(--spacing-mu-space-2)
other choices: 4px --spacing-mu-space-4 top-mu-space-4
```

### provenance/color

55 real groups.

Example 1 — apps/docs/src/kds.css:96:15 (1 sites)

```text
title: `rgba(120,214,165,.32)` is a raw colour, not one of your colour tokens
because: A raw colour won't follow theme or colour-scheme changes.
action: (choice list)
first choice: #78D6A5 --color-green bg-green background: var(--color-green)
other choices: rgba(120,214,165,.16) --color-presence-collar bg-presence-collar
```

Example 2 — apps/docs/src/kds.css:129:118 (5 sites)

```text
title: `rgba(0,0,0,.25)` is a raw colour, not one of your colour tokens
because: A raw colour won't follow theme or colour-scheme changes.
action: (choice list)
first choice: rgba(0,0,0,.05) --color-menu-row-hover  box-shadow: var(--color-menu-row-hover)
other choices: rgba(0,0,0,.6) --color-pastbanner-engrave-lip
```

Example 3 — apps/docs/src/kds.css:132:42 (2 sites)

```text
title: `rgba(0,0,0,.3)` is a raw colour, not one of your colour tokens
because: A raw colour won't follow theme or colour-scheme changes.
action: (choice list)
first choice: rgba(0,0,0,.05) --color-menu-row-hover  box-shadow: var(--color-menu-row-hover)
other choices: rgba(0,0,0,.6) --color-pastbanner-engrave-lip
```

### provenance/color/by-value

29 real groups.

Example 1 — apps/docs/src/kds.css:102:104 (1 sites)

```text
title: rgba(120,214,165,.16) matches `--color-presence-collar` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--color-presence-collar)`.
first choice: rgba(120,214,165,.16) --color-presence-collar  box-shadow: var(--color-presence-collar)
```

Example 2 — apps/docs/src/kds.css:133:40 (1 sites)

```text
title: rgba(0,0,0,.35) matches `--color-toolstrip-active` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--color-toolstrip-active)`.
first choice: rgba(0,0,0,.35) --color-toolstrip-active  box-shadow: var(--color-toolstrip-active)
```

Example 3 — apps/docs/src/kds.css:143:12 (7 sites)

```text
title: #fff matches `--color-cue-tick` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `text-cue-tick` or `var(--color-cue-tick)`.
first choice: #FFFFFF --color-cue-tick text-cue-tick color: var(--color-cue-tick)
```

### provenance/color/framework

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/pages/foundations/Materials.tsx:17:64 (1 sites)

```text
title: `text-black` uses Tailwind's default palette (`--color-black`), not your theme
because: Your theme defines its own colour tokens; Tailwind's defaults sit outside it.
action: (choice list)
first choice: rgba(0,0,0,.05) --color-menu-row-hover text-menu-row-hover color: var(--color-menu-row-hover)
other choices: rgba(0,0,0,.6) --color-pastbanner-engrave-lip text-pastbanner-engrave-lip
```

Example 2 — apps/docs/src/pages/foundations/Spacing.tsx:99:91 (1 sites)

```text
title: `text-white` uses Tailwind's default palette (`--color-white`), not your theme
because: Your theme defines its own colour tokens; Tailwind's defaults sit outside it.
action: (choice list)
first choice: #FFFFFF --color-cue-tick text-cue-tick color: var(--color-cue-tick)
other choices: rgba(255,255,255,.09) --color-pastbanner-button-bg text-pastbanner-button-bg
```

### provenance/color/tier

0 real groups; fewer than three are available.

### provenance/elevation

82 real groups.

Example 1 — apps/docs/src/pages/components/IconButton.tsx:21:79 (5 sites)

```text
title: box-shadow var(--tw-ring-inset,) 0 0 0 calc(1px + 0) var(--tw-ring-color, currentcolor) isn't one of your shadow tokens
because: A hand-written shadow won't match the other surfaces or follow theme changes.
action: No token is close to var(--tw-ring-inset,) 0 0 0 calc(1px + 0) var(--tw-ring-color, currentcolor). Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:102:104 (1 sites)

```text
title: box-shadow 0 0 0 9.5px rgba(120,214,165,.16) isn't one of your shadow tokens
because: A hand-written shadow won't match the other surfaces or follow theme changes.
action: No token is close to 0 0 0 9.5px rgba(120,214,165,.16). Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:128:47 (3 sites)

```text
title: box-shadow 0 1px 0 rgba(255,255,255,.5) isn't one of your shadow tokens
because: A hand-written shadow won't match the other surfaces or follow theme changes.
action: No token is close to 0 1px 0 rgba(255,255,255,.5). Pick one with the design owner, or add one to the theme.
first choice: (none)
```

### provenance/elevation/by-value

5 real groups.

Example 1 — apps/docs/src/kds.css:129:118 (1 sites)

```text
title: 0 0 0 .5px rgba(0,0,0,.25) matches `--mu-led-ring` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-led-ring)`.
first choice: 0 0 0 .5px rgba(0,0,0,.25) --mu-led-ring  box-shadow: var(--mu-led-ring)
```

Example 2 — apps/docs/src/kds.css:130:40 (1 sites)

```text
title: 0 0 0 .5px rgba(0,0,0,.25) matches `--mu-led-ring` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-led-ring)`.
first choice: 0 0 0 .5px rgba(0,0,0,.25) --mu-led-ring  box-shadow: var(--mu-led-ring)
```

Example 3 — apps/docs/src/kds.css:131:44 (2 sites)

```text
title: 0 0 0 .5px rgba(0,0,0,.25) matches `--mu-led-ring` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-led-ring)`.
first choice: 0 0 0 .5px rgba(0,0,0,.25) --mu-led-ring  box-shadow: var(--mu-led-ring)
```

### provenance/elevation/framework

0 real groups; fewer than three are available.

### provenance/elevation/tier

0 real groups; fewer than three are available.

### provenance/motion

11 real groups.

Example 1 — apps/docs/src/kds.css:142:150 (1 sites)

```text
title: transition-timing-function linear isn't one of your motion tokens
because: A one-off duration or curve makes motion feel inconsistent and ignores the team's timing.
action: No token is close to linear. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:216:106 (3 sites)

```text
title: transition .15s isn't one of your motion tokens
because: A one-off duration or curve makes motion feel inconsistent and ignores the team's timing.
action: (choice list)
first choice: 160ms --mu-engraving-fade-ms  transition: var(--mu-engraving-fade-ms) — The hover engraving: a block's identity, shown on a dwell, never on a pass.
other choices: 126ms --mu-spring-hinge-half
```

Example 3 — apps/docs/src/kds.css:611:101 (1 sites)

```text
title: animation 1.6s isn't one of your motion tokens
because: A one-off duration or curve makes motion feel inconsistent and ignores the team's timing.
action: (choice list)
first choice: 1200ms --mu-led-rise-d  animation: var(--mu-led-rise-d)
other choices: 900ms --mu-presence-copied-ms
```

### provenance/motion/by-value

31 real groups.

Example 1 — apps/docs/src/pages/Icons.tsx:219:144 (3 sites)

```text
title: 200ms matches `--mu-engraving-move-ms` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-engraving-move-ms)`.
first choice: 200ms --mu-engraving-move-ms  transition-duration: var(--mu-engraving-move-ms) — The hover engraving: a block's identity, shown on a dwell, never on a pass.
```

Example 2 — apps/docs/src/kds.css:140:3 (1 sites)

```text
title: .18s matches `--mu-button-fade-ms` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-button-fade-ms)`.
first choice: 180ms --mu-button-fade-ms  transition: var(--mu-button-fade-ms) — Pressed sinks 1 into its well in 50 ms, linear, and returns on release; fills and shadows cross-fad…
```

Example 3 — apps/docs/src/kds.css:142:123 (3 sites)

```text
title: .05s matches `--mu-button-press-ms` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-button-press-ms)`.
first choice: 50ms --mu-button-press-ms  transition-duration: var(--mu-button-press-ms) — Pressed sinks 1 into its well in 50 ms, linear, and returns on release; fills and shadows cross-fad…
```

### provenance/motion/framework

2 real groups; fewer than three are available.

Example 1 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:342:25 (19 sites)

```text
title: `transition-[opacity,translate]` uses Tailwind's default timing (`--default-transition-timing-function`), not your theme
because: Your theme defines its own motion tokens; Tailwind's defaults sit outside it.
action: No token is close to cubic-bezier(0.4, 0, 0.2, 1). Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:342:25 (24 sites)

```text
title: `transition-[opacity,translate]` uses Tailwind's default timing (`--default-transition-duration`), not your theme
because: Your theme defines its own motion tokens; Tailwind's defaults sit outside it.
action: (choice list)
first choice: 160ms --mu-engraving-fade-ms  transition-duration: var(--mu-engraving-fade-ms) — The hover engraving: a block's identity, shown on a dwell, never on a pass.
other choices: 126ms --mu-spring-hinge-half
```

### provenance/motion/tier

0 real groups; fewer than three are available.

### provenance/opaque-inline

65 real groups.

Example 1 — apps/docs/src/blocks/studio-week/studio-week.tsx:267:24 (2 sites)

```text
title: This left is computed at runtime, so it can't be checked
because: Plumb reads source, not running values.
action: Pass the number through a CSS variable and set left from a class or stylesheet.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/Folder.tsx:142:39 (5 sites)

```text
title: This left is computed at runtime, so it can't be checked
because: Plumb reads source, not running values.
action: Pass the number through a CSS variable and set left from a class or stylesheet.
first choice: (none)
```

Example 3 — apps/docs/src/pages/components/Link.tsx:47:339 (1 sites)

```text
title: This top is computed at runtime, so it can't be checked
because: Plumb reads source, not running values.
action: Pass the number through a CSS variable and set top from a class or stylesheet.
first choice: (none)
```

### provenance/radius

14 real groups.

Example 1 — apps/docs/src/kds.css:172:42 (7 sites)

```text
title: border-radius 99px isn't on your radius scale
because: Off-scale corners make surfaces look unrelated and can't be changed from the theme.
action: No token is close to 99px. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/kds.css:279:54 (1 sites)

```text
title: border-radius 26px isn't on your radius scale
because: Off-scale corners make surfaces look unrelated and can't be changed from the theme.
action: (choice list)
first choice: 24px --radius-card rounded-card border-radius: var(--radius-card)
other choices: 30px --radius-hero rounded-hero
```

Example 3 — apps/docs/src/kds.css:281:76 (2 sites)

```text
title: border-radius 19px isn't on your radius scale
because: Off-scale corners make surfaces look unrelated and can't be changed from the theme.
action: (choice list)
first choice: 18px --radius-plate rounded-plate border-radius: var(--radius-plate)
other choices: 17px --radius-palette-field-radius rounded-palette-field-radius
```

### provenance/radius/by-value

0 real groups; fewer than three are available.

### provenance/radius/framework

1 real group; fewer than three are available.

Example 1 — apps/docs/src/pages/components/Status.tsx:50:56 (2 sites)

```text
title: `rounded-xl` uses Tailwind's default radius (`--radius-xl`), not your theme
because: Your theme defines its own radius scale; Tailwind's defaults sit outside it.
action: (choice list)
first choice: 12px --radius-row rounded-row border-radius: var(--radius-row)
other choices: 11px --radius-provenance-radius rounded-provenance-radius
```

### provenance/radius/tier

0 real groups; fewer than three are available.

### provenance/spacing

55 real groups.

Example 1 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:119:70 (49 sites)

```text
title: 14px isn't on your spacing scale
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 12px --spacing-mu-space-12 px-mu-space-12 padding-inline: var(--spacing-mu-space-12)
other choices: 16px --spacing-mu-space-16 px-mu-space-16
```

Example 2 — apps/docs/src/blocks/ai-composer/ai-composer.tsx:119:76 (81 sites)

```text
title: 10px isn't on your spacing scale
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 8px --spacing-mu-space-8 py-mu-space-8 padding-block: var(--spacing-mu-space-8)
other choices: 12px --spacing-mu-space-12 py-mu-space-12
```

Example 3 — apps/docs/src/blocks/settings/settings.tsx:72:85 (2 sites)

```text
title: -1px isn't on your spacing scale
because: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
action: (choice list)
first choice: 0px --spacing-mu-space-0 top-mu-space-0 top: var(--spacing-mu-space-0)
other choices: 2px --spacing-mu-space-2 top-mu-space-2
```

### provenance/spacing/by-value

0 real groups; fewer than three are available.

### provenance/spacing/framework

0 real groups; fewer than three are available.

### provenance/spacing/tier

0 real groups; fewer than three are available.

### provenance/type

59 real groups.

Example 1 — apps/docs/src/kds.css:76:3 (9 sites)

```text
title: font-size 15px isn't on your type scale
because: Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
action: (choice list)
first choice: 14px --mu-type-figure-line  font-size: var(--mu-type-figure-line)
other choices: 16px --mu-type-ui-line
```

Example 2 — apps/docs/src/kds.css:76:3 (26 sites)

```text
title: font-weight 400 isn't on your type scale
because: Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
action: No token is close to 400. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:76:36 (1 sites)

```text
title: letter-spacing -.011em isn't on your type scale
because: Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
action: No token is close to -.011em. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

### provenance/type/by-value

0 real groups; fewer than three are available.

### provenance/type/framework

3 real groups.

Example 1 — apps/docs/src/demos/FeelingsComposer.tsx:104:48 (2 sites)

```text
title: `font-semibold` uses Tailwind's default weight (`--font-weight-semibold`), not your theme
because: Your theme defines its own type scale; Tailwind's defaults sit outside it.
action: No token is close to 600. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/Led.tsx:52:91 (2 sites)

```text
title: `font-normal` uses Tailwind's default weight (`--font-weight-normal`), not your theme
because: Your theme defines its own type scale; Tailwind's defaults sit outside it.
action: No token is close to 400. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 3 — apps/docs/src/pages/foundations/Motion.tsx:120:29 (1 sites)

```text
title: `font-medium` uses Tailwind's default weight (`--font-weight-medium`), not your theme
because: Your theme defines its own type scale; Tailwind's defaults sit outside it.
action: No token is close to 500. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

### provenance/type/tier

0 real groups; fewer than three are available.

### provenance/z

15 real groups.

Example 1 — apps/docs/src/blocks/settings/settings.tsx:451:59 (4 sites)

```text
title: z-index 10 isn't one of your z-index layers
because: A raw z-index competes with every other layer; named layers keep stacking predictable.
action: No token is close to 10. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 2 — apps/docs/src/pages/components/SelectionFrame.tsx:85:59 (2 sites)

```text
title: z-index -10 isn't one of your z-index layers
because: A raw z-index competes with every other layer; named layers keep stacking predictable.
action: No token is close to -10. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

Example 3 — apps/docs/src/kds.css:104:53 (2 sites)

```text
title: z-index 100 isn't one of your z-index layers
because: A raw z-index competes with every other layer; named layers keep stacking predictable.
action: No token is close to 100. Pick one with the design owner, or add one to the theme.
first choice: (none)
```

### provenance/z/by-value

1 real group; fewer than three are available.

Example 1 — apps/docs/src/kds.css:187:39 (2 sites)

```text
title: 40 matches `--mu-palette-z` but doesn't use it
because: If the token changes, this copy stays behind.
action: Use `var(--mu-palette-z)`.
first choice: 40 --mu-palette-z  z-index: var(--mu-palette-z)
```

### provenance/z/framework

0 real groups; fewer than three are available.

### provenance/z/tier

0 real groups; fewer than three are available.

## Round 2 checks

Property-specific findings now keep distinct CSS properties separate, while spacing still combines matching amounts across properties. Choice lists select one token per amount before limiting suggestions, preferring a token with a usable utility. Five fixture e2e checks cover the updated titles, static dynamic-class examples, stylesheet ownership (including @apply and heuristic selectors), choices across all seven judged families, and dead-token titles across all nine families.

| Check | Violations |
|---|---:|
| Off-token titles missing their property | 0 |
| Token sets described as scales | 0 |
| Dynamic examples containing interpolation | 0 |
| Stylesheet ownership titles missing their selector | 0 |
| Choice lists with repeated resolved amounts | 0 |
| Dead-token titles exposing source globs | 0 |

## JSON grep proof

The title projection is written directly from `report.json`. Grepping the entire JSON would also match rule ids and absolute machine-readable source locations.

```sh
node bench/metalui/messages-audit.mjs
grep -nE '``|a elevation|/Users/|origin|provenance|requires a reference|callers may' bench/metalui/.cache/messages/titles.txt
# no output; exit 1 (no matches)
grep -n '/Users/' bench/metalui/.cache/messages/message-fields.txt
# no output; exit 1 (no matches)
```

| Title pattern | Matches |
|---|---:|
| `` | 0 |
| a elevation | 0 |
| /Users/ | 0 |
| origin | 0 |
| provenance | 0 |
| requires a reference | 0 |
| callers may | 0 |

Absolute paths across title/because/action/fix: **0**.

## Template length conflict

The contract requests titles under 80 characters and also exact templates with actual values. **78** real titles exceed 79 characters with those exact templates; shortening their fixed wording or token names would violate the exact-template instruction. The exact wording and actual values are retained. For example:

```text
`font-semibold` uses Tailwind's default weight (`--font-weight-semibold`), not your theme
```

## Verification

`npm test`: 151 tests passed. `npm run typecheck`: passed. Five additional fixture e2e checks cover this round; the eight first-round checks remain green. `formatText`, `formatFinding`, `brief`, and `formatAgent` are untouched. No commit or install was made.

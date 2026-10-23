# Relay: a demo surface for React Plumber

Status: plan, 2026-10-23. Owner's ask: a demo complex enough to show the variety of React Plumber's features, shaped
like a workflow tool; on Vite and Next.js; shadcn/ui plus hand-built components.

## Why the current demo isn't enough
`overlay/demo` is a two-row settings page made for automated tests. It can't show what a visual-editor user meets:
dense screens, lists that share one source line, library components, nested components, values computed in code,
modals and drawers, dark mode, or more than a handful of drift.

## The product
**Relay**, an issue tracker with automations (Linear crossed with Zapier). Believable enough that the drift looks
like real drift, not a test fixture.

| Screen | What it exercises in React Plumber |
| --- | --- |
| App shell: sidebar (workspaces, teams, views), top bar (search, ⌘K, avatars) | owned components, nested components, icons, the tree walk through deep layouts |
| Board (kanban) | a list of cards sharing one source line (one stamp, many elements), dense blueprint, drag affordances |
| Issues table | a data table: sortable headers, status/priority badges, avatars, tags; tabular numbers |
| Issue drawer | a library dialog (Radix via shadcn): portals, focus trap; properties, description, comments, activity |
| Automation builder | a node canvas: positions, colours and sizes computed in code (the "set in code, can't fix here" count), inline styles |
| Settings and billing | forms, switches, plan cards, a confirm dialog; type scale and spacing rhythm |
| ⌘K command palette | a popover over everything; keyboard-first UI |

## Components
- **shadcn/ui** for primitives (Button, Badge, Card, Dialog, Sheet, DropdownMenu, Tabs, Switch, Input, Avatar,
  Tooltip, Command), owned in `components/ui` the way shadcn installs them.
- **Hand-built** look-alikes and local overrides where real apps drift: a hand-rolled button beside the shadcn one,
  a Card restyled at the call site, a badge with its own colours.

## Planted drift, catalogued
Each screen plants drift the way real code collects it, and lists it in `src/drift.js` (screen, element, what's
wrong, which rule should catch it, which fix the overlay should offer). A "Planted drift" toggle in the app shows the
legend over the page, so anyone can check that React Plumber finds all of it and nothing else. Families: spacing,
colour, radius, type, elevation, motion, z-index; plus overrides, imitation, dead classes, undefined variables, habits.

## Hosts
One `src/` shared by two apps: `examples/relay/vite` (Vite + React 19 + Tailwind 4) and `examples/relay/next`
(Next.js 16, app router). Same screens, so every overlay feature is checked on both.

## Layers (each shown to the owner before the next)
1. **Relay's primitives**: its theme (shadcn's semantic tokens with Relay's values, Tailwind 4 `@theme`), type scale,
   spacing, radius, elevation; the shadcn primitives it needs. Shown as a small specimen.
2. **App shell** (sidebar, top bar) on Vite.
3. **Board.** 4. **Issues table.** 5. **Issue drawer.** 6. **Automation builder.** 7. **Settings and billing.**
8. **⌘K palette.** 9. **Planted-drift legend and catalogue** (planted drift is added screen by screen; the legend
   arrives here). 10. **The Next.js host.**

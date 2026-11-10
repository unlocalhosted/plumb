# Journey

## Token spec follows BoardUI (2026-11-10)
- **The itch:** the owner wanted to "overhaul how plumber suggests and looks for tokens"; the system it proposes today does not scale to large apps.
- **How we found it:** the owner shared BoardUI's typography and colour pages (docs/references.md).
- **The system behind it:** plumber names type roles Material-style with weight baked into each role, and colour roles as flat short names (`fg`, `muted`, `surface`) with no room for states, levels, charts or a rebrand-by-one-colour.
- **What we chose and why:** keep plumber's reading of a page into roles; change what it lands on. Type: 13 named steps × 4 weights, one class per pair, colour separate. Colour: primitives, semantic `--color-{category}-{role}-{state}`, optional component tokens, dark mode in one block, accent ramp from one colour. Our own rules stay (APCA guard, one accent, status keeps meaning).
- **The fix and the proof:** spec only so far: docs/design/token-spec.md. Nothing built.
- **Media hooks:** a before/after of crafting-ui's text sizes snapped onto the ladder, once layer 1 is built.

## Open gaps
- Token spec layers 1–6 (docs/design/token-spec.md §7) not built; four owner decisions open (§6).

## Shipped · 2026-W46
- (nothing shipped yet; the token spec is a plan)

# References

Everything shared or found that shaped the work: what it is, why, what it changed, and where it was used.

| Date | What | Shared by | Why | What it changed / where used |
|---|---|---|---|---|
| 2026-11-05 | [aidenybai/bippy](https://github.com/aidenybai/bippy/) — the library React Plumber uses to read React's internals | the owner | "check it out and see if i can fork and utilise anything which will make react-fork even more powerful" | Researched; not forked. Its main branch's path cleanup is the useful part (`docs/research/bippy-branches.md`); led to "find the line" being fixed in our own locator (Chapter 1) |
| 2026-11-05 | [tailwindlabs/tailwindcss.com](https://github.com/tailwindlabs/tailwindcss.com) @ 7f92c22 | found by us | a real, mostly server-component Next 16 + Tailwind v4 app (source licensed for education only; no code committed) | locate bench corpus; README numbers (Chapter 1) |
| 2026-11-05 | [magicuidesign/magicui](https://github.com/magicuidesign/magicui) `apps/www` @ 37ce829 | found by us | a real Next 15 monorepo app full of library-drawn animation components | locate bench corpus; found the monorepo `components/` miss and Next's per-route cost (Chapter 1) |
| 2026-11-05 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `apps/v4` @ 8a35366 | found by us | the largest real Next 16 UI surface | measured once on Turbopack; dropped after it used ~10 GB (Chapter 1) |
| 2026-11-05 | Debuggers and devtools (gdb/lldb line tables, Ghidra, source maps and Sentry debug IDs, Istanbul, React DevTools, LocatorJS) | found by us | patterns for mapping running code back to source | `docs/research/meta-tool-patterns.md`; the "Patterns we hold to" section of `docs/briefs/stamping-everywhere.md` |

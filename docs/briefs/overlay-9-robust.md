# Overlay 9: one bad class never stops Plumb; zero-config finds the app's Tailwind entry

Found running AlgoRecall (`/Users/vijaysingh/unlocalhosted/algorecall`, Vite 8, React 19, Tailwind 4, shadcn) with the
overlay. Read its files but never write inside it; copy what you need into a fixture.

1. **A single candidate fails the whole Session.** Startup fails with
   `Load project Tailwind from …/algorecall/src: Parse compiled candidate [&_.bg-error/5]:hidden: Unexpected token Delim('/')`.
   Tailwind compiled that candidate to CSS that lightningcss cannot parse. One unparseable candidate, stylesheet rule or
   source file must never fail a run: skip it, keep judging everything else, and report it once as a quiet diagnostic
   (rule `config/unreadable`, with the candidate or file and the parser message) so it is visible, not silent. Apply the
   same isolation to every per-item step in lowering/collection (candidate compile, CSS parse, per-file source parse).
   The CLI exit code must not change because of such a diagnostic.
2. **Zero-config refuses two Tailwind entries.** AlgoRecall has `src/index.css` (the app) and `src/home.css` (landing
   page, `source(none)`): `Multiple Tailwind entry files … set css in plumb.config.ts`. Without a config, choose the entry
   the app actually loads: walk from the HTML entry (index.html module scripts) or the bundler entry through the module
   graph to the CSS files it imports; if exactly one Tailwind entry is reached, use it; if several are reached, judge each
   source against the entry that reaches it (or, if that is too large a change now, pick the one reaching the most source
   files and report the choice in a diagnostic). Only ask for a config when the graph cannot decide.

Tests (integration, fixtures copied from the shapes above): a project with a candidate like `[&_.bg-error/5]:hidden`
checks everything else and reports one `config/unreadable` diagnostic; a project with two Tailwind entries and an
index.html that imports one runs zero-config against that one. No unit tests. `npm test` and `npm run typecheck` pass.
Do not commit. Summary to `docs/briefs/overlay-9-robust.result.md`.

# From linter-with-fixes to visual editor: the roadmap

Status: plan, 2026-10-27. Owner replies to the list of what's left (DX and the visual editor).

| Item | Owner's direction | System that replaces today's | Who |
| --- | --- | --- | --- |
| Edit any value, not just drift | "really good editor primitives … a dedicated popup for different style of thing like for text, image, cards" | An editor per kind of element (text, image, surface/card, layout, control), each built from shared primitives (scale stepper, swatch row, ruler, toggle), every state designed; drift is one state of the same editor, not a separate chooser | UI (Opus), after design questions |
| Groups only see what's in view | "a way to iterate on the dom to jump around, or something better" | A cause knows all its places: every DOM instance on the page (read off-screen too) and every source line; the panel walks them | design questions, then server (Sonnet) + UI |
| No undo after a token write | "nice to have" | One write history for text and style: every apply returns its inverse; the dock holds the last N writes, each undoable | server (Sonnet) + UI |
| Text built in code, translations, duplicates, rich runs, line breaks | later | — | parked |
| Set-in-code drift (inline `style={}`, config) | "an engine to parse and update these" | An engine that reads `style={{…}}` objects and config values as findings with edits, so they get choosers and fixes like class drift | server (Sonnet) |
| Apps without fast refresh reload on every write | "ask the user to enable hot reload … identify the gaps in our dx … as automated as possible" | A readiness check for fast refresh (and the other tooling that makes the editor smooth), with a consented, automated fix (`plumber doctor --fix` and the overlay's setup panel) | server (Sonnet) + existing setup panel |
| Shortcuts nobody can find | "do the dx things" | A `?` sheet from the dock listing every gesture, and a one-time hint the first time each mode is used | UI (Opus) |
| Docs behind | "do the dx things" | README and CLI help describe blueprint v2 and text editing | Sonnet, reviewed |
| Next.js unverified by hand | "do the dx things" | A pass on Relay's Next host for blueprint v2 and text editing | Opus |

Order: the Sonnet queue runs in one side worktree (fast refresh readiness → write history → inline-style engine →
docs); Opus builds the shortcuts sheet and hint, checks Next, then the editor primitives and the page walk once their
design questions are answered. Every layer is proven by integration tests through the real boundary, never unit tests.

# Text editing, layer 1 (Resolution): result

Server side of `docs/briefs/text-editing.md`. `GET /__plumb/text-at` and `POST /__plumb/apply-text-at` are registered next to
`text` / `apply-text` (route lists in `src/session/server.ts`, read/write split in `coordinator.ts` and `index.ts`, JSON-RPC allowlist too).

## What text-at returns

`GET /__plumb/text-at?file&line&column&text=<rendered words>&owners=<file:line:column,...>`. The words are compared with whitespace
collapsed. Resolution order, first level that has a match wins:

| Case | Example | Response |
| --- | --- | --- |
| JSX text (or a string-literal child) in the element at file:line:column | `<h1>Welcome back</h1>` | `{ editable: true, hash, file: 'src/App.tsx', line: 4, column: 16, kind: 'jsx', id, from: 'Welcome back' }` |
| A string attribute of the element, then of each use site in the owner chain (also JSX text at a use site, for `children`) | `<SyncRow title="Sync calendar" />` rendered by `<h3>{title}</h3>` in SyncRow.jsx | `kind: 'attribute'`, `file: 'src/App.tsx'`, `line: 5`, `from: 'Sync calendar'` |
| A string (or expression-free template) literal, first in the owner chain's files, then in the project's source files; exactly one | `title: 'Export all rows'` in `src/data.js` rendered by `{item.title}`; Relay's `Export board as CSV` | `kind: 'literal'`, `file: 'src/data.js'`, `line: 2` |
| Two or more strings say the words | two `'Twin words'` in data.js | `{ editable: false, reason: '2 strings in source say these words. Edit the one you mean by hand.', where: { file: 'src/data.js', line: 3 } }` |
| An expression it cannot trace | `<p>{name}</p>` | `{ editable: false, reason: 'The text comes from an expression. …', where: { file, line } }` |
| A translation (`t()` in the element or in a use-site attribute, `<Trans>`) | `<p>{t('welcome')}</p>` | `{ editable: false, reason: 'The text comes from a translation. …', where }` |

`file` is relative to the project root with forward slashes (`../src/…` for shared source), `hash` is the hash of the file named in
`file` (the one that would be written), `line`/`column` are where the string starts, `from` is the decoded source text.
Owners and project files that are not readable project source (outside the source boundary, untracked, symlinks leaving it) are skipped, never read.
Literals that are never words are ignored: import/export sources, property keys, directives, tagged templates, TypeScript types, and
`className`, `id`, `key`, `href`, `src`, `type`, `name`, `role`, `style` and similar attributes.

`POST /__plumb/apply-text-at { file, hash, id, from, to }` re-derives the string from the held file (never a client range), then writes it:
JSX text with JSX entities or `{"…"}` when needed; a string literal in its own quote style with the quote and backslashes escaped
(template literals too); a JSX attribute `name="…"` with the quote as `&quot;`/`&apos;` and entity-shaped `&` as `&amp;` (attributes hold one line). A stale hash or a `from` that no longer matches is refused with
"changed since" (HTTP 400). Empty text and text over 500 characters are refused as for `apply-text`; the write goes through the same file-identity-checked path as `apply-text` (shared `writeText` in `engine.ts`).

## Files changed

- `src/session/text-at.ts` (new): `textTargets` (every string in a file with an id), `resolveTextAt`.
- `src/session/engine.ts`: `textAt`, `applyTextAt`; `applyText` now shares a private `writeText`.
- `src/session/text-encoding.ts`: `encodeAttributeString`. `src/session/text.ts`: exports `decodeEntities`.
- `src/session/server.ts`, `index.ts`, `coordinator.ts`: routes, methods, read/write split.
- `e2e/text-at.test.mjs` (new). Overlay untouched; `examples/relay` unmodified (the Relay test is read only).

## Tests

`e2e/text-at.test.mjs`, 7 integration tests over the real HTTP routes of a real `serve()` on a fixture project: JSX text (and write), attribute at a
component use site, literal in a data module with quote style kept and a quote escaped (also an attribute with quotes), ambiguity with `where`,
expression and translation refusals, stale hash and moved `from`, and Relay's "Export board as CSV" resolving to `src/data.js`. Result: 7 pass, 0 fail.

Full suite (`scripts/test.mjs`): see the end of this file.

### Full suite

`node scripts/test.mjs`: 537 tests in the main group, 531 pass, 4 fail; the runner stops at a failed group, so the remaining groups were run by hand.
- Passing by hand: `session-burst` 4/4, `serve` 25/25 (watch + polling), `serve` 23/23 (no watch).
- `the page changes while on: a removed element takes its marks…` (blueprint-corners): flaky, passes 8/8 when its file is run alone.
- `homepage guards dev writes…` and `homepage text replay…`: environmental, this worktree has no `@mdx-js/rollup` / `remark-gfm` for `site/` (ERR_MODULE_NOT_FOUND).
- `site read-only human reports fit real 80/140-column PTYs`: environmental, the checkout's own `ledger.jsonl` has an accepted token (`--color-accent`) that vanished from source in this worktree.
None touch text routes.

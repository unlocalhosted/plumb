# API contract

What crosses the engine's boundaries, exactly: every endpoint's request shape, what it answers, the error envelope and its
codes, and the two record files other processes and other versions share. The engine refuses what does not fit before any
handler runs; the overlay branches on `code`, never on English. Written for `docs/invariants/boundaries.md` B1, B2, B3, B5,
B7, B12 and the endpoint table's unvalidated rows. Branch `explicit-machines`, 2026-11-07.

## 1. Transport

Router: `createRoute` in `src/session/server.ts`. Method table: `src/session/methods.ts` (verb, known endpoints). Request
shapes: `src/session/schema.ts` (one shape per endpoint, run by `dispatchRequest` before the handler, and by the hosts'
in-process `dispatch` the same way). JSON-RPC (`serveStdio`) runs the same dispatch.

- A GET's parameters are the query string: every value arrives as a string. An integer field accepts `/^[1-9]\d*$/`; a
  boolean field accepts `true` or `false`; a JSON field (`chain`, `computed`) accepts JSON text.
- A POST's parameters are the JSON body (at most 1 MiB, an object). An integer field accepts a safe integer, or the same
  digit string a query would carry. Every POST body may carry `trace: { group?, meta? }` (section 3).
- Unknown fields are kept and ignored, except where a row says the rest of the body is passed through.
- Nothing in a request is trusted after validation either: the engine re-checks files, positions and hashes itself.

### Error envelope

Every error answer is `{ "error": <one English sentence for people>, "code": <stable kebab-case code> }`. The HTTP status is
what it was before codes existed: 400 for a refused request, 401, 403, 404, 405, 500; `503 { "status": "busy", "code": "busy" }`
for a read that could not be admitted; `503 { "status": "starting" }` before the session exists (not an error envelope; `health`
answers it with 200). JSON-RPC errors carry the same code as `error.data.code`.

Per-item answers inside a 200 (`apply-all`'s `results.*[]`, `swaps`' `refused[]`) carry `error` and `code` the same way
when the item failed.

### Codes

Transport codes (set by the router before any handler runs):

| code | status | when |
|---|---|---|
| `bad-request` | 400 | the request does not fit its shape: a missing or mistyped field, an integer out of range, a list too long, a body that is not a JSON object or is over 1 MiB |
| `unauthorized` | 401 | the `x-plumb-token` header is missing or wrong |
| `forbidden` | 403 | the origin or host is not trusted (same-origin loopback rule), or a disallowed CORS header |
| `not-found` | 404 | no endpoint of that name |
| `method-not-allowed` | 405 | the other verb; `Allow` names the right one |
| `busy` | 503 | the read queue's deadline passed before the read ran |
| `internal` | 500 | anything the engine did not refuse on purpose |

Engine codes (every one is a 400 over HTTP, or an `ok: false` item inside a 200):

| code | when |
|---|---|
| `refused` | the default: a well-formed request the engine will not carry out, with the reason in `error` (a file outside the root or inside `.plumber`, a component tag, a change that would not parse, a token that clashes, a stylesheet block that is not one this server proposed, a lock held too long, …) |
| `stale-file` | the hash or identity sent is not the file's now: it changed since the overlay read it, since the write being undone, or while it was being written. Read it again. |
| `not-utf8` | the file is not UTF-8, so nothing was written |
| `nothing-in-group` | `undo-group`: no change of that group still stands |
| `no-census` | there is no census of the project, or it was taken before colours or icons were read: `plumber census --url …` |
| `rolled-back-partly` | a multi-file write failed and one or more files could not be put back; `error` names each file that still holds the change |
| `already-undone` | `undo-change`/`undo-changes`: the change was taken back already; `error` names the change that did it |
| `changed-later` | `undo-change`/`undo-changes`: later changes rewrote the place; `error` names them |
| `changed-by-hand` | `undo-change`/`undo-changes`: the place no longer holds what the change wrote and no later change explains it |
| `not-found` | an id the engine does not know: a change not in the trace, a write not in the history, an edit id not in the site's edits |

Codes are the whole protocol. The English next to them may be reworded at any time.

## 2. Endpoints

`int` is a positive safe integer (1-based lines and columns). `str` is a non-empty string unless marked `str*` (may be
empty). `?` marks optional. Lists carry their bounds. Response shapes name the exported types in `src/session/engine.ts`.

### Reads (GET)

| endpoint | query | answers |
|---|---|---|
| `health` | none | `{ status: 'ready' \| 'invalid', root, revision, pid, rss, caches, work, outsideSource?, diagnostic? }`; `{ status: 'starting' }` before the session exists |
| `readiness` | none | the readiness report (`src/readiness`) |
| `report` | `base?: str`, `changed?`, `strictLedger?`, `verbose?`, `ledger?`: boolean | `Report` |
| `causes` | none | the report's findings grouped by cause |
| `system` (GET) | none | the project page's data (`projectSystem`) |
| `site` | `file, line, column?` | `SiteResult` |
| `classes` | `file, line, column, classes: str*` (≤ 65536 chars) | `ClassesResult` |
| `resolve` | `source: str, line?, column?, tag?: str, hash?: str, component?, snapshot?, owner?, stamp?: '1'` (a flag is on only as the string `1`; absent or anything else is off) | `SourceResolution` |
| `edits` | `file, line, column?` | `EditsResult` |
| `text` | `file, line, column` | `TextResult` |
| `text-at` | `file, line, column, text: str (≤ 2000), owners?: str*` (`file:line:col` joined by `,`) | `TextAtResult` |
| `structure` | `file, line, column` | `StructureResult` |
| `class-site` | `file, line, column, classes?: str*, chain?: JSON [{ file, line, column }] (≤ 32)` | `ClassSiteResult` |
| `decisions` | none | `Report['decisions']` |
| `spec` | none | `ProjectSpec` |
| `why` | `file, line` | `inspectLedger` result |
| `recipes` | `file, line, column, chain?: JSON` | recipes view |
| `props` | `file, line, column, computed?: JSON object of str → str` | `PropsResult` |
| `history` | none | `{ writes: HistoryEntry[] }` (this process's last 20 writes) |
| `trace` | `group?: str` | `{ changes: TraceEntry[], skipped: int≥0 }` (section 3) |
| `rhythm` | none | `{ distances, gaps, routes }` or `no-census` |
| `palette` | none | `{ colours, routes }` or `no-census` |
| `icons` | none | `{ icons, routes, installed }` or `no-census` |
| `refresh` | none | the files the engine re-read |

### Writes and heavy reads (POST)

| endpoint | body | answers |
|---|---|---|
| `readiness/fix` | `{ id: str, hash: str, confirm: true, allowDirty?: boolean }` | the fix's result |
| `batch` | `{ calls: [{ method: 'site' \| 'resolve', params }] }` (1–256; each `params` is that endpoint's query shape) | `ManyResult[]`, one per call, in order; a call that is refused is `{ error, usage }` in its slot |
| `page` | `{ items: [{ stamp: str, tag: str, classes?: str* }] }` (≤ 8192) | `PageResult` |
| `places` | `{ files: [str] }` (≤ 4096) | `PlacesResult` |
| `system` | `{ files?: [str], census?: [{ stamp: str, tag: str, list?, elements?, computed? }] (≤ 20000), scope?: 'page' \| 'project', route?: str, exclude?: [str], roles?: object }` | `SystemResult`; `proposal.write.css[]` is what `apply-all` may send back (section 4) |
| `apply` | `{ file, hash, edits: [{ id: str }] }` (≥ 1) | `ApplyResult` |
| `apply-text` | `{ file, hash, run: str, from: str*, to: str* }` (the engine refuses a blank or over-500 `to` in its own words, `refused`) | `ApplyResult` |
| `apply-text-at` | `{ file, hash, id: str, from: str*, to: str* }` (same) | `ApplyResult` |
| `undo` | `{ id: str }` | `UndoResult` |
| `undo-change` | `{ id: str }` | `UndoChangesResult` |
| `undo-group` | `{ group: str }` | `UndoChangesResult` or `nothing-in-group` |
| `undo-changes` | `{ ids: [str] }` (1–500) | `UndoChangesResult` |
| `set` | `{ file, hash, line, column, key: str, token: str, at?: { line, column } }` | `ApplyResult` |
| `swap` | `{ file, hash, line, column, from?: str*, to: str, at?: { line, column }, of?: { file, line, column, chain?: [{ file, line, column }] } }` | `ApplyResult` |
| `swaps` | `{ file, hash, edits: [{ line, column, from?: str*, to: str, at?, of? }] }` (1–200) | `ApplyResult` with `refused: RefusedSwap[]` (each `{ line, column, from, to, reason, code }`) |
| `prop` | `{ file, hash, line, column, name: str, value: string \| number \| boolean }` | `ApplyResult` |
| `token` | `{ file, hash, name: str, value: str, why?: str, then?: { file, hash, line, column, from?: str*, to: str } }` | `TokenResult` |
| `accept` | `{ rule: str, why: str, sites: [{ file: str, line, column, text: str* }] }` (1–200) | `AcceptResult` |
| `apply-all` | `{ tokens?: [{ file, hash, name, value, why?, then?: { cause: { rule, text, choice }, file? } \| { swaps: [swaps body] } }], css?: [{ file, hash, css: str }], swaps?: [{ cause: { rule, text, choice }, file? } \| swaps body], accepts?: [accept body] }` (at least one list, ≤ 400 items in all) | `ApplyAllResult`: `results.tokens[]`, `results.css[]`, `results.swaps[]`, `results.accepts[]` each `{ …, ok, error?, code? }`; `undo: UndoHandle[]`; `labels` |
| `recipes/preview` | `{ file, line, column, chain?, …rest passed through }` | the preview |
| `recipes/apply` | same, plus `hash?: str, hashes?: { [file]: hash }` | the apply result |
| `try` | `{ code: str*, lang?: 'tsx' \| 'css', as?: str, verbose?: boolean }` | `Report` |

`file` and `hash` in a body are `str`. A traced write (`apply`, `apply-text`, `apply-text-at`, `undo-change`, `undo-group`,
`undo-changes`, `set`, `swap`, `swaps`, `prop`, `token`, `apply-all`, `recipes/apply`) answers with `trace: { group }` added.

## 3. Records other processes and versions share

### Ids

Every id the engine mints is unique across processes and restarts: a prefix, the minting time in base 36, and 6 hex
characters of randomness (`c` + 14 characters, for example `cm3f1x7k2a9f0b1`). The prefix is the only part a caller may
read: `c` a change, `g` a group, `w` a write (an undo handle). A caller-named group (`trace.group`) is kept as sent
(`/^[\w:.-]{1,64}$/`). No per-process counter exists, so two engines on one project never mint the same id, and a handle
from before a restart never names a later write.

### `.plumber/cache/changes.jsonl`

One JSON object per line, appended, never rewritten from memory:

```
{ "v": 1, "id": "c…", "at": ISO time, "group": "g…" | named, "write": "w…", "file": project path, "line": int, "column": int,
  "from": str*, "to": str*, "prefix": str*, "suffix": str*, "label": str, "meta"?: any, "undoes"?: ["c…"] }
```

- Read: the file is re-read whenever its size or mtime moved, so another process's appends are seen. A line that is not
  a record of this shape, or whose `v` is not 1 (a missing `v` is an old line, accepted), is skipped and counted; `trace`
  answers `skipped`. Nothing a bad line does can fail a read or a write.
- Write: an append under the lock. Dropping records (a file-level undo) and trimming to the last 2000 records re-read the
  file under the lock and rewrite only what was read then; skipped lines are kept verbatim, in place.
- Lock: `<file>.lock`, created `O_EXCL`, holding `pid time`; a lock older than 10 s is stale and taken over; a wait of
  more than 5 s refuses with `refused` (“another process holds the trace/ledger lock”).

### `.plumber/ledger.jsonl`

One JSON object per line, `parseLedger` shape plus `v: 1` on every line this build writes (`src/ledger/store.ts`).

- Read: a line that is not JSON, not an entry, of a `kind` this build does not know, a duplicate key (the first is kept),
  or `v` above 1 is skipped and counted. `readLedger` answers `{ exists, entries, skipped, hash }`; the report's ledger
  summary message and a report note say how many lines were skipped. A read never throws on a line.
- Write: every read-modify-write (`accept`, `accept-decisions`, `baseline`, `ledger`, `propose --decline`) runs under the
  lock as one `updateLedger(root, change)`: re-read under the lock, change, write. A writer that read the ledger earlier
  (`init`) passes the `hash` it read; a ledger changed since is refused (`refused`), never overwritten. Lines a read
  skipped are written back verbatim, first, so a newer build's entries and a merge conflict's markers survive this
  build's writes for a person to resolve.

## 4. `apply-all` stylesheet blocks (B5)

`system` (POST) answers `proposal.write.css[] = { file, hash, css }`. The engine keeps the text of the last 32 blocks it
proposed. `apply-all` writes a `css` item only when its `css`, trimmed, is one of them (`appendCss`); any other block is
`{ ok: false, written: false, code: 'refused', error }` and nothing is written. The set is per process: after a restart,
ask `system` again. Tokens and swaps keep their own guards (`checkToken`, the swap grammar); nothing else in `apply-all`
takes client text into the user's files.

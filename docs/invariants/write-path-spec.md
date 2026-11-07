# The write path: one module for every write to a user-owned file

Answers rows 1–6, 8, 9 and 10 of `docs/invariants/engine.md` (the audit of 2026-11-07). Every writer in `src/` that
puts bytes into a file the user owns (source, stylesheet, config, agent instructions, hook settings, PLUMBER.md) goes
through `src/write/source-file.ts`. Nothing else in `src/` calls `writeFile`, `handle.writeFile`, `truncate` or
`rename` on a user file. Cache, ledger and census writers keep `atomicWrite`: those files are ours.

## Contract

### `readSource(path, { root })` → `{ text, hash, eol, bom, identity, mode }`

- Reads the bytes, never a string. Decodes with `new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })`.
  A byte sequence that is not UTF-8 is refused with a `UsageError`: "`<file>` isn't UTF-8, so nothing was written."
  Nothing is ever decoded lossily (row 1).
- `text` is byte-faithful: a BOM stays in it as U+FEFF (`ignoreBOM: true` keeps it). The hash the overlay holds, the
  worker's positions and every other `readFile(path, 'utf8')` in the project are computed on that same text, so
  stripping the BOM here would make every hash check fail and every column shift by one. `bom: true` reports it; the
  writer keeps it (below).
- `hash` is `sourceHash(text)`, the hash every endpoint already exchanges. Because the decode is fatal, "hash matches"
  now means "the bytes round-trip".
- `eol` is `'crlf'` when the file has at least one `\r\n` and no lone `\n`; otherwise `'lf'`. A mixed file is `'lf'`:
  nothing outside the edit may change, so a mixed file is left mixed (row 9).
- `identity` is `{ dev, ino }` from `lstat`; `mode` is the file's permission bits.

### `writeSource(path, { root, expectHash, next })` → `{ text, hash, identity }`

- Containment (row 5): `path` is resolved against `root`; it must lie inside `root` lexically; its nearest existing
  ancestor's `realpath` must lie inside `realpath(root)`; and when the file exists, `realpath(path)` must equal
  `resolve(realpath(root), relative(root, path))`, so no symlink anywhere on the way. The engine's `editableFile` keeps
  its own policy on top (config and `.plumb` files are refused, `sourceFiles` membership), and so does `readiness`.
- The file must be a regular file with `nlink === 1` (row 6: a hard link would make the write land in a second name).
- `expectHash` is the hash the plan was built from. It is re-checked against the bytes on disk, read through an
  `O_NOFOLLOW` handle whose `fstat` matches the `lstat` identity, immediately before the write (row 4, row 10). A
  mismatch is `staleFile`, the message the overlay already knows. `expectHash: null` means "create": the file must not
  exist, and the parent is made.
- Line endings (row 9): when the file is `'crlf'`, every lone `\n` in `next` becomes `\r\n`. In a pure-CRLF file every
  lone `\n` in `next` was inserted by the writer, so this is exactly the inserted text and nothing else.
- BOM: when the file had one and `next` does not start with U+FEFF, it is put back.
- The write is a temp file in the same directory + `rename` (decision below). The temp file gets the original `mode`.
- After the rename the module re-reads the path through a fresh `O_NOFOLLOW` handle: its `ino` must be the temp file's
  (the path now names exactly the inode we wrote) and its bytes must hash to `hash`. Only then does it return.
- The returned `text` is what is on disk (after EOL and BOM handling); callers use it, not their own `next`, for
  anything positional they do after the write.

### `Transaction`

- `tx.write(path, options)` is `writeSource` plus a journal entry `{ path, created, before, hashAfter }`.
- `tx.rollback()` puts the files back newest first: a created file is removed; a replaced file is written back with
  `expectHash: hashAfter`, so a file someone else changed since is NOT overwritten (row 3's `applyTheme` case).
- The result is `{ restored: string[], failed: { file, error }[] }`. Nothing is swallowed. `tx.run(fn)` rolls back on
  a throw and rethrows the original error with the failures appended to its message (`withRollback(error, failed)`),
  so the overlay shows "…; src/a.css could not be put back: <reason>. It still holds the change."
- The engine's multi-file writes (`recipesApply`, `token` + `then`, `undoChanges`) roll back through `undo(id)`, because
  an undo must also drop the history entry and the trace records; they use the same `withRollback` to surface failures
  instead of `.catch(() => {})` (row 3).

### `applyEach`'s `hashFor` (row 8)

An apply-all item may send the hash the file had when the batch began, or the hash after the previous write to it.
The old rule rebased the former to the latter for every item. The new rule: an item with no positions (tokens, css:
their edits are found by content) is still rebased. An item with positions (`swaps` edits with `line`/`column`, and a
pinned `at`) sent with the batch-start hash of a file that has since been written is **re-derived**: the element is
located in the text the batch began with (the engine keeps it), its opening-tag source is found again in the current
text, nearest to its old offset, and the edit's position is moved there. An element that cannot be found again (the
earlier write changed that very tag, or the tag now appears nowhere) is refused with its reason: "This place was
written earlier in this apply; read it again." Nothing is applied against positions that were computed on other text.

## Rename, not in-place

The six engine sites did `handle.writeFile(next)` then `handle.truncate()` on an open `O_RDWR | O_NOFOLLOW` descriptor,
and compared `dev`/`ino` before and after. The in-place design existed to keep the identity check meaningful: a rename
changes the inode. The module replaces the whole sequence, and the identity check with it.

Chosen: **temp file in the same directory, `fsync`, `rename`.**

- Atomic for every reader (row 2): a watcher, the engine's own `reconcile`, Vite's HMR and a crash all see either the
  old bytes or the new bytes, never new text with the old tail. In-place can never give that; a shorter replacement
  always has a window between `writeFile` and `truncate`, and there is no verified re-read that can un-see it.
- The identity guard gets stronger, not weaker: before, "the inode is the one we checked" (and the bytes went into it
  through a descriptor); after, "the path names exactly the inode we created and filled", checked with `fstat` on a
  fresh `O_NOFOLLOW` open. A symlink or hard link swapped in between check and write never receives the bytes, because
  the bytes only ever go into our own `wx` temp file.
- What a rename costs, and why it is accepted: the inode changes (the engine's `stamps` carry `ino`, so the next
  `reconcile` re-reads and re-hashes the file, which it would have to do anyway; the engine's watcher is on the root
  directory, so it keeps seeing the path); the owner is not preserved (only root could; editors that save by rename
  have the same limit); macOS extended attributes on the file are not carried over; `mode` is preserved explicitly.
- The lost-update window (row 10) is the same order as before: between the last `lstat`/hash check and the `rename`,
  a concurrent save of the same path by another process would be replaced. Before, it was between the last read and
  `writeFile`. Both are microseconds and both are inside `serialize()` for the engine's own writes.

## Which invariant each rule enforces

| Row | Rule in the module |
|---|---|
| 1 | fatal decode; a non-UTF-8 file is refused and never written |
| 2 | temp + rename; post-write `ino` and hash check |
| 3 | `Transaction.rollback` returns `{ restored, failed }`; `withRollback` puts failures in the error; rollback writes are hash-guarded |
| 4 | `expectHash` re-checked on the bytes immediately before the rename; non-engine writers pass the hash of what they planned from |
| 5 | containment: lexical + realpath of nearest existing ancestor + no symlink on the path |
| 6 | `nlink === 1`; `mode` copied to the temp file; a symlink is refused rather than replaced |
| 8 | `hashFor`: content-addressed items rebase, positional items are re-derived or refused |
| 9 | `eol` detection; inserted `\n` → `\r\n` in a pure-CRLF file |
| 10 | hash + identity re-check inside the module, in the same call that writes |

## Writers moved

Engine: `rewrite`, `appendCss`, `tokens`, `writeText` (swaps, text-at, cause swaps), `apply`, `undoOne`.
Outside the engine: `onboarding/write.ts` `applyTheme` (now `planTheme` hashes what it read and `applyTheme` is a
transaction), `adoption/install.ts`, `adoption/overlay.ts`, `surfaces/hooks.ts`, `adoption/init.ts` (config write and its
rollback), `surfaces/docs.ts`.

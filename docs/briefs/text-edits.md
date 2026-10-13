# Brief: text edits from the overlay (server layer)

## Outcome

A person pins an element in Plumb's overlay, edits its visible text (a button label, a heading, a name), and
presses Write. Plumb edits the JSX text in the source file, with the same safety the class edits have. This brief is
the **server layer only**: the read and the write. The overlay UI is built separately on top of it; do not touch
`overlay/src/widget.js` or `overlay/src/tokens.css`.

## Existing pattern to follow

- Reads: `GET /__plumb/site?file&line&column` and `/edits` → `src/session/server.ts` → `Engine` in
  `src/session/engine.ts`. Writes: `POST /__plumb/apply {file, hash, edits:[{id}]}` → `Engine.apply` (line ~460).
  The server re-derives every edit from current source and refuses with "changed since" when the file hash moved.
- Methods are allow-listed in `src/session/server.ts` (lines ~122, ~184, ~283). POST-only methods are listed with
  `try`/`apply`.
- The overlay client calls `request(method, params)` (GET) and `post(method, body)` (POST) in `overlay/src/api.js`.

## What to build

1. **Read: `GET text?file&line&column`** for the JSX element whose opening tag is at that location. Returns:
   - `{ editable: true, hash, runs: [{ id, text, start, end }] }` when the element's children include one or more
     plain JSX text runs (static literal text between tags). `text` is the run as rendered (JSX whitespace rules:
     trimmed, internal newlines collapsed the way React renders them). `id` is stable for that hash.
   - `{ editable: false, hash, reason }` otherwise, with a plain-language reason:
     the text comes from an expression (`{name}`), a prop, a translation call (`t('…')`, `<Trans>`), a component's
     children passed in from elsewhere, or the element has no text.
   - A string literal child inside braces (`{'Send'}`, `{"Send"}`) counts as editable; template literals with
     `${}` do not.
2. **Write: `POST apply-text { file, hash, run, from, to }`**:
   - Refuse "changed since" if `hash` is not the current file hash, exactly like `apply`.
   - Refuse if the run's current text is not `from` (someone edited it).
   - Refuse empty `to`, and `to` longer than 500 characters.
   - Replace only that run's characters in source. Preserve the run's leading/trailing whitespace and indentation
     in the file. Escape for JSX: `{`, `}`, `<`, `>` in plain JSX text become `{'{'}` etc. (or switch the run to a
     string-literal child if that is cleaner; be consistent and document which). In a `{'…'}` literal, escape the
     quote character instead.
   - Return the same shape `apply` returns (new hash, file, what changed) so the overlay can reread.
3. Allow-list both methods in `server.ts`; `apply-text` is POST-only, `text` is GET.
4. **The homepage replay layer** (`site/`, see `site/REPLAY.md` and `src/hosts/vite.ts` demo mode): on the deployed
   site there is no server; class edits apply to the live page only. Make `text`/`apply-text` behave the same way
   there: the read works from the recorded replay, the write changes the live DOM text only. If the replay recorder
   (`site/scripts/record-replay.mjs`) needs to record text runs, extend it and re-record.

## Rules

- **Tests: integration / end-to-end only, never unit tests.** Test through the real boundary: the HTTP endpoints of
  a running session against a fixture app (follow `e2e/edits.test.mjs` and `e2e/verify-writes.test.mjs`). Cover:
  a plain label written byte-for-byte; whitespace and indentation preserved; `{}`/`<>` escaped; an expression child
  refused with its reason; `t('…')` refused; a stale hash refused; `from` mismatch refused; the file untouched on
  every refusal.
- Atomic changes, in layers: the read first (with its tests passing), then the write, then the replay layer.
- Do not change class-edit behaviour. Run the existing e2e suites that touch edits/apply before finishing.

## Report

Write `docs/briefs/text-edits.result.md`: what was built, the exact endpoint shapes (request and response JSON, every
refusal reason string), the escaping rule chosen, test results with commands, and anything left undone.

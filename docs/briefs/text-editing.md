# Editing text like a CMS: double-click, type, done

Status: design, 2026-10-26. Owner feedback and decisions.

## What's wrong, and the system behind it
| Owner's words | The system that produced it | What replaces it |
| --- | --- | --- |
| Too many steps to start | Text editing hangs off the pinned card: Alt, click to pin, then E or a double-click on the pinned element | A double-click on any words on the page starts editing them; nothing to pin |
| Two steps to save | Edits are previews queued in the card until Write | Enter or clicking away writes to source; Esc cancels; the dock says what was written and offers Undo |
| Typing feels off | A one-line `<input>` laid over the words | Editing in the words themselves: a real caret, selection and wrapping, in the page's own font |
| Text it won't edit | Only JSX text written directly inside the element counts; a prop, a data literal or a child's words are refused | The server finds the string that renders the words wherever it is written (JSX text, a string prop at the use site, a string literal in a data file) and edits that |

## Layers
1. **Resolution (server).** `GET /__plumb/text-at?file&line&column&text=<rendered words>&owners=<file:line:column,…>`: the
   element under the double-click by its stamped source position, the words as rendered, and the owner chain's source
   positions (innermost first). It returns the one source string that renders those words:
   - JSX text inside the element (today's runs), else
   - a string-literal attribute of the element or of a JSX use site in the owner chain whose value is the words
     (`<Button label="Save">`, `title="…"`, `placeholder="…"`), else
   - a string literal anywhere in the owner chain's files, then in project source, whose value is exactly the words,
     when exactly one such literal exists (Relay's card titles live in `data.js`).

   Response: `{ editable: true, hash, file, line, column, kind: 'jsx' | 'attribute' | 'literal', id, from }`, where
   `from` is the decoded source text; or `{ editable: false, reason, where?: { file, line } }`, where the reason says
   why (an expression, a translation, two or more literals with these words) and `where` is the best place to edit
   by hand. `POST /__plumb/apply-text-at { file, hash, id, from, to }` writes it, keeping the literal's quote style
   and escaping (JSX entities in JSX text, the quote and backslashes in a string literal). A stale hash or a `from`
   that no longer matches is refused with "changed since". Proof: e2e on a fixture with all three kinds plus an
   ambiguous one, and on Relay's card title from `data.js`.
2. **Editing in place (overlay).** A double-click on words, anywhere on the page (normal mode, and in blueprint, where
   the glass steps aside while editing), asks `text-at`. If editable, the words become editable where they are: a
   leaf element (the text is its only child) becomes `contenteditable="plaintext-only"` for the edit, so the caret,
   selection and wrapping are the browser's own; a run mixed with other elements gets a textarea laid exactly over its
   line boxes, in its font. Enter (Shift+Enter is a newline only where the source allows it) or clicking away writes
   through `apply-text-at`; Esc puts the words back. While editing, a thin accent outline marks the words and a small
   tag under them says `Board.jsx:42 · Enter to save · Esc`. After the write the dock says `Wrote text to Board.jsx ·
   Undo`, and Undo writes the old words back. A double-click on words that can't be edited shows the reason and
   `where` beside the words, and the page's own double-click (selecting a word) still happens. Inputs, textareas and
   contenteditable elements on the page are left alone. Proof: e2e, a double-click on a leaf's words, typing, Enter,
   and the source file changed; clicking away saves; Esc restores; Undo restores the file; a refused one explains.

## Clickable words (owner, 2026-10-26)
A plain double-click on words inside something clickable (a card, a button, a link, a tab) would press it on the first
click. So a plain double-click edits only where both clicks hit the same element and nothing clickable holds the words;
**Alt + double-click** edits any words: Alt already keeps clicks off the page, and the pin its first click makes is let
go. In blueprint the page is inert, so a plain double-click edits any words there. In a button, Space is typed by hand.

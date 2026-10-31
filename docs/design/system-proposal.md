# The type proposal in Blueprint

Status: design, 2026-10-31. The engine behind it is `system/type` (docs/research/type-roles.md). This doc is the view.

## The problem it answers

Fixing value by value never makes a system. crafting-ui has 61 text sizes in 550 places, and the fix panel offered
them one at a time, adding tokens as it went. The person needs to see the shape (the handful of text styles the code
is reaching for), decide once, and watch every place move.

## Words

People see "text styles", not "type roles". A style's name is its role in plain words: Display, Headline, Title,
Title small, Body, Body small, Label, Label small. The code names (`type-body-large`) appear only where code is
shown.

## Where it lives

The same fix panel, docked at the bottom centre. It is not a new surface. A system proposal comes before the
per-place fixes: when Blueprint opens with a proposal, the panel's resting line says it.

    ● Your text uses 61 sizes. 8 styles would cover it.        Review ↵

Enter opens the proposal. When there's no proposal (the text already fits), the resting line is the usual count of
fixes.

## The proposal (one component, every state)

**ready**: one card, three parts.

1. The ladder: one row per style, largest first. Each row has:
   - "Ag" drawn at the style's own size, weight and tracking (capped at 28px, with the true size in the row);
     labels show "AG", because a label is caps
   - the name
   - the bundle in plain numbers ("16px · 1.6 line height")
   - how many places use it
   - a thin bar of what moving costs: unchanged / ≤1px / more
2. The cost, in one sentence: "412 places stay as they are. 86 move by 1px or less. 18 move more: look at them
   first."
3. One action: **Use these styles ↵**, plus a quiet "Look at the 18" and Esc.

**pointing at a row** (hover, or ↑ ↓ through the ladder): only that style's places light on the page (the
fix-in-hand light: its zones lit, the first one in view strongest, the rest of the page quiet). The page scrolls
nothing. The row says where the lit places are ("12 in view, 55 further down").

**previewing** (the Preview toggle, P; Space already lets the page through in Blueprint): the whole page takes the
styles as inline styles the overlay owns. Text glides to its new size (inplace.js glide), only in view. The card
steps aside to one line ("Previewing your page in 8 text styles · Stop preview · Use these styles") so the page it
changes can be seen; P again and it glides back. This is where a person decides: they see the page as it would be.

**look first**: steps through the places that move more than 2px, one at a time, in the per-place panel (the
style's specimen next to what's there now). Each is "Use the style" or "Keep as is" (an exception, recorded).
Back returns to the ladder.

**writing**: "Writing 8 styles to your theme and 550 places…"; the card keeps its height.

**written**: the said line, as for a fix: "Added 8 text styles to index.css and used them at 550 places · Undo".
Undo takes back every file of the proposal. Then the resting line counts what's left (the per-place tail).

**refused**: a stale file. Nothing is written; the card says which file changed and offers Check again. A partial
refusal is said with how many landed.

**empty or outside**: a codebase whose text already fits says nothing about styles. Places outside the system
(drawings, demos, imitations) are counted in one quiet line under the cost, never as moves.

**loading**: the proposal needs the page measured. Until then the resting line says "Checking this page…".

## Motion

- Ladder rows arrive together; there's no stagger, since it's a list, not a show.
- Pointing at a row crossfades the page light (the marks' own transition).
- Preview glides only what's in view (the cost scales with the view, not with 550 places).
- Written: the existing celebration, as the panel already does.
- Reduced motion: no glide, an instant swap.

## Keys and a11y

The ladder is a listbox (↑ ↓ moves, aria-selected). Enter is the one action. P toggles the preview. Esc goes back,
then puts the panel down. Every row has a label: "Body, 16px, 1.6 line height, 67 places, 52 unchanged". The cost
sentence is a live region when it changes.

## Tests (e2e, Vite + Chromium)

1. A fixture with 3–4 styles: the resting line offers it; the ladder shows the styles with their places and cost.
2. Pointing at a row lights only that style's places.
3. P previews: sizes change on the page and the card steps aside; P again puts the page back.
4. Use these styles: the theme, the utilities and the swaps are written; the said line and Undo; Undo restores
   every file.
5. Look first: a >2px place kept as is is recorded, and not swapped.

# How an X-ray change becomes a code edit

*2026-11-13. The owner: "pick them up in terms of how fixes can be propagated properly"; and "our apply should never
cause loss of behaviour, it should be smart and should only change the behavior on which we are operating upon".*

The X-ray lets you change a part on the page (padding, margin, gap, a corner, a size, a text size) and collects the
changes until Sync. This is how each change is turned into an edit of your code, so that what you saw is what gets
written, and nothing else is changed.

## 1. What a change is

A change is **a property of a part, at a scope, set to a value**:

- **the part**: its place in your code (the element's stamp: file, line, column), and which copy it is when that line
  draws several (the nth element with that stamp). Never the element itself: a re-render replaces elements, and the
  change has to find the new one, show on it again, and still be written. (Built: the prototype keys changes this way.)
- **the property**: padding-left, margin-top, gap, border-radius, width, height, font-size.
- **the value**: one of your tokens, or a fill / fit / fixed size, or a value off your scale that you chose on purpose.
- **the scope**: just this one / all here / everywhere (below).

## 2. Where it is written: the scope decides the line

| Scope | Means | Written at |
| --- | --- | --- |
| **just this one** | the copy you pointed at | its call site, but only if that copy has a line of its own. When one line draws several copies (a `.map`), one copy can't be changed alone without a condition. Plumber says so ("these 3 share one line: change all 3, or ask your agent for a condition") and doesn't invent one. |
| **all here** | every place this line draws on the page | the call site: the line where the component is used (its `className` there) |
| **everywhere** | the component, in every place the app uses it | the component's own file, at the element that draws it. If the component is a library's (`node_modules`), its file isn't yours: written at the call site instead, and Sync says so. |

The card always says which: "×3 here", "everywhere · 31 uses", "just this one". The places a change will reach are
outlined before you change anything.

## 3. Which class: the one in force, and only that one

A value on the page comes from one class among several that could set it: the base (`p-4`), a breakpoint (`md:p-6`), a
state (`hover:`, `focus:`), a theme (`dark:`), or a branch of a condition (`cn(active && 'p-6')`). The edit changes
**the class that is in force now** and leaves every other one exactly as written.

- **Breakpoints** (built 2026-11-13 for padding and margin, in the engine's box edit): each side is changed in the
  widest breakpoint in force at the window's width that sets that side, else the base. `p-4 md:p-6` seen at a medium
  window → `md:p-6` changes; `p-4` and `hover:p-8` stay. Seen at a narrow window → `p-4` changes; `md:p-6` stays.
  Sides set in different places are changed where each is set (`p-4 md:px-6`: top in `p-4`, left in `md:px-6`).
  The card says which breakpoint it is changing ("md and up").
- **dark:, hover:, focus:** the same rule (built 2026-11-13, `overlay/src/variants.js`): in dark mode `dark:px-6` is the
  one in force; a state is in force only while held (the writers take a `held` list; Plumber has no hover-holding yet,
  so today hover: and focus: are always left alone). Mixed prefixes (`md:dark:p-6`) count when every part is in force;
  the most particular wins, in Tailwind's order (states, then dark, then breakpoints, the wider last).
- **A branch of a condition:** the branch active now is changed, and the card says so ("only when active"). Not built.
- **Every writer goes through the one rule** (built 2026-11-13): the box edit (padding and margin, from the fix bar and
  the card), the layout card's gap and spacing, Tidy, and the reader that finds "the class that sets this property"
  for the clean-up passes (corners, spacing, control sizes) and the craft rules, which now also judge the class showing
  rather than the base. Not yet checked: the text editor's text-size write.

## 4. How the value is written

- A token on your scale → its class (`pl-4`, `rounded-xl`, `gap-3`, `text-sm`).
- A size: **fixed** → `w-64` (or the nearest token); **fill** → `w-full`, or `flex-1` on the main axis of a flex row;
  **fit** → `w-fit`, or `flex-none` in a flex row.
- A value off your scale that you chose on purpose → an arbitrary class (`pl-[18px]`) only after the card offers the
  token instead; a new value that should be a token goes through the naming flow (the fix bar's "add to your theme").

## 5. Values that aren't plain pixels

The X-ray reads values from the page, in pixels. Some written values aren't pixels, and a drag must not quietly turn
them into one:

- **`auto` margins** (`mx-auto` centres a block): the page reads the left-over space as px (say 140px), but the code
  says "centre me". The card shows **auto**, not 140, and dragging it asks first: switch to a number, or keep centring.
- **Percentages and fractions** (`w-1/2`, `w-[40%]`): shown as written; a drag moves through fractions, not px.
- **`calc()` / `clamp()` / viewport units** (`w-[clamp(20rem,40vw,36rem)]`): fluid on purpose. The card shows the
  formula and the px it gives now; a drag would freeze it, so it isn't offered; you choose a token instead.
- **Negative margins** (`-mt-2`, used to pull things together): shown with their sign; the scale includes the negatives.
- **`rem` / `em`**: shown as the token they are; an `em` padding grows with the text, and the card says so.

Rule: the card shows **what is written**, and the px only as a hint. A change is offered only where the written form
can hold it.

## 6. Robustness

- Changes are kept by place and copy (section 1); after a re-render they are shown again on the new elements.
- A change whose element is no longer on the page is still written (the code doesn't depend on the page), and the
  card says "1 not on screen".
- Every write carries the file's hash as Plumber read it. If the file changed since (an agent edited it, you saved),
  the write is refused for that change, the file is read again, and the change is offered again on the new text.

## 7. What Sync says

One line per change: the class and where it was written (`pl-6 on Select ×3 · components/ui/select.tsx:31`), with
Undo. A change that couldn't be written says why in plain words (the server isn't answering; the file changed; the
line is in a library, so it was written where you use it) and stays pending, with Retry. Nothing is quiet: a half-done
Sync says "2 of 3 synced". (Built in the prototype, with a pretend server.)

## Status

- Built in the prototype (design site, X-ray page): scope, fill / fit / fixed, re-render-proof changes, per-change Sync
  results with Undo and Retry, library components written at the call site.
- Built in the engine: one rule for the class in force (`overlay/src/variants.js`), used by every class writer.
- Not built: holding hover/focus, conditional branches, the text editor's write, non-pixel values as written, "just
  this one" refusing a shared line, the X-ray inside Plumber itself.

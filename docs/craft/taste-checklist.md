# The showcase's taste checklist

Every showcase screen is a piece of real software that happens to carry one of plumber's lessons. Plumber-correctness
(exactly one finding, quiet after the fix) is necessary and not nearly enough: by that bar alone the screens came out
as high-fidelity wireframes, a white card of text rows on the dot board (owner, 2026-11-04). A screen is ready when it
passes this list as a designer would read it, in writing, before anyone else sees it.

The method is interface-craft's design critique (context, first impressions, visual, interface, consistency, the user):
specific, decisive, counted, every problem paired with a direction.

## 0. The product, before the screen
- **A named product with a point of view.** Not "a calendar": a calendar for a small studio that books client sessions.
  Its accent, its type voice and its density follow from who uses it.
- **A reference studied, not copied.** The best real products of the kind (docs/design/references/<screen>/QUALITIES.md),
  read for their qualities. Nothing of their layout, brand or art is reused.

## 1. The world
- **The screen sits in its app**: a window or device frame, the sidebar or toolbar that would be there, the content
  around the component the lesson lives in. A floating card is a spec, not software.
- **The lesson's component is the subject**, framed by its world, not drowned in it: the camera knows where to go.

## 2. Life
- **Something other than text on every screen**: real imagery (credited), avatars that are faces or marks, data drawn
  as data (a chart, a bar, a progress ring, a map), status as colour and shape.
- **Real, specific content**: names, numbers, dates and copy that belong to that product's day, with a little texture
  (an unread count, a typing indicator, a time that's just changed). No "Item 1", no symmetric rows of equal length.
- **A state that's alive**: something running, selected, hovered, half-done, new. A screen at rest still shows that
  someone is using it.

## 3. Visual design
- **Hierarchy you can see at a glance**: one thing is the most important, and it's obvious which (size, weight,
  colour, position). Count the levels; three or four, not one flat list.
- **Density that fits the domain**: an inbox is dense, a timer is calm. Neither is a uniform list of 40px rows.
- **Colour with a job**: the product's accent in a few places that matter; status colours for status; never colour
  as decoration, never every row the same grey.
- **Type with voice**: sizes and weights that pair (a display figure, a label, a body, a caption); tabular figures
  where numbers line up; tracking that fits the size.
- **Detail**: hairlines, corners that nest, shadows that sit, icons that match their text, states drawn (hover,
  selected, focus). Look at it at 2× before calling it done.

## 4. Delivery
- **The mistake reads in the product**, before any mark: someone using it would notice something feels off.
- **The marks draw only the number the lesson turns on**, on top of a screen that's worth looking at.
- **Motion is earned**: the moment plays what matters, at a pace a person can follow.

## 5. The check
Write the critique (sections 0–4, specific and counted) under the comp. Then compare the comp with #16, the owner's
bar, side by side: if it's flatter, emptier or more generic than #16, it isn't ready. Only a comp the owner signs off
is coded into the showcase, and plumber's mistake is planted after.

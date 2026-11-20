# Plain CSS at parity with utility classes

The owner, 2026-11-20: "we have to make everything compatible full parit support". Everything plumber reads and
writes for a page styled with utility classes should work the same for a page styled with plain CSS rules, and the
way to get there should leave room for more ways of styling later (CSS modules, CSS-in-JS, a design system's props).

## Where it stands

Only one writer handles plain CSS: the X-ray's Sync. It goes through the style-system interface
(`overlay/src/style-systems.js`): each system says whether it sets a property on an element now, and writes a change
there. A utility class wins, then a stylesheet rule (found by the browser, traced to its file through Vite's tag or
the bundler's source map), and adding a class is the fallback. It works on Vite and on Next (journey 62, 63).

Everything else assumes classes:

| What the person does | Where it is written today | Plain CSS today |
|---|---|---|
| Change a value in the X-ray, Sync | style systems (page) | works |
| Read an element's values in the card (text style, size, colour, spacing) | `props`: classes and inline style only | shows nothing set |
| Pick a value in the card (text style, size, colour…) | `set`: replaces or adds a class | adds a class that does nothing |
| Tidy, layout and spacing on the element card | `swaps` and `prop`: class edits | adds classes that do nothing |
| Take a finding's fix, Clean up | `apply`, `apply-all`: edits the server proposes | not checked on a page |
| Shadows and motion recipes | `recipes/apply`: classes and the theme | classes only |
| Rename a token | `rename`: class names in JSX | classes only |

Words (text edits) are not style and are not part of this.

## The system

The interface moves to where every writer can use it. Today it lives in the page and only Sync asks it; the card's
reads and the other writers each decide on their own that a change is a class. Parity means one question asked by
all of them: *where is this property of this element written, and how is a value written there?*

- The page answers the part only the browser knows: which rule wins for an element and property, and its file. It
  sends that claim with the element (the same claim Sync uses now).
- The server holds the systems' reads and writes: classes (today's code, unchanged) and rules (`rule`, `set-rule`).
  A read says where a value comes from; a write goes to the system that owns the property.
- The order stays the page's own: a class on the element, then a rule, then adding a class.

## Layers

One at a time, each shown working before the next.

1. **The card reads rules.** For an element styled by a rule, the card shows the value and says where it comes from
   (`.title` in `foundations.css`), instead of nothing.
2. **The card's picks write rules.** Picking a text style, size, colour or spacing step writes the rule's value
   (your token's variable) through the interface.
3. **Tidy, layout and spacing write rules,** as one step with one undo, across rules and classes when an element has
   both.
4. **Finding fixes and Clean up on rules.** Check what the server already proposes for a stylesheet value, and take it
   from the page.
5. **Recipes and rename on rules.**
6. **The edges:** rules inside `@media` (said, then written to the matching condition), two sides at once
   (`padding-x` → two declarations), a value checked against your scale before it is written, and a rule shared by
   many elements said as such ("changes 5 headings").

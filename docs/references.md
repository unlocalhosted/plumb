# References

Everything shared or found as a reference for React Plumber: what it is, why, what it changed, where it was used.

## 2026-11-10 · BoardUI's token spec pages · shared by the owner

- **What:** two documentation pages of the BoardUI component kit:
  [Color](https://www.boardui.com/components/color) and [Typography](https://www.boardui.com/components/typography).
- **Why they shared it:** "i like this kit part also please borrow this kind of spec". They wanted our design system
  written down the same way before any more work, so the language doesn't drift.
- **What the format is:** each page opens with "How the system works" (the layers, the naming rule, why parts only use
  the top layer), then a short card on theming with three numbered rules, then one section per role with a table of
  token, class, light value and dark value. Typography shows each style with its size and line height, what it is for,
  and a specimen per weight beside the class that sets it.
- **What it changed here:** the kit got spec pages in that shape, read from our own token file so they can't drift:
  `overlay/demo/kit-color.html` and `overlay/demo/kit-type.html`, with `overlay/demo/kit-tokens.js` doing the reading.
  Ours adds two things theirs doesn't have: what each hue *means* (the toy language's table) and a "what is still
  open" list at the end of each page.
- **Where it was used:** journey, Chapter 3.

## 2026-11-10 · The burst when a fix lands · found by us (the owner pointed at it)

- **What:** the pieces that fly out of the fix panel when a write lands (`overlay/src/fixpanel.js`, `#burst`): a hatched
  green square, purple stripes, an orange dotted circle.
- **Why:** the owner, on the first grey icon proposals: "i wanted colorfull you already created few good ones with
  different colors and solid like for marging padding spacing the ones which appears when we apply the fixes".
- **What it changed here:** it became the source of the visual language (`docs/design/visual-language.md`) and of the
  toy icon set (`overlay/demo/toys.js`).

## 2026-11-10 · Bricolage Grotesque and Instrument Sans · found by us

- **What:** two open typefaces from Google Fonts: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque)
  and [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans).
- **Why:** the owner, on the raised key with rounded lettering: "isn't these like overused to hell and like look like
  just every other playful product. we don't have any unique identity here similar to what we have in terms of our
  icons." Three candidates were put side by side on the design site's identity page.
- **What it changed here:** tried across the whole site, then made heavier, then kept ("Keep Bricolage"). Fredoka and
  Nunito are gone from the site.
- **Where it was used:** `web/app/layout.jsx`; journey, Chapter 3, entry 9.

## 2026-11-10 · A drag slider with a rolling number · shared by the owner

- **What:** a short clip of a pill slider ("2 days" … "7 days"): a dark fill stretches as you drag, the number in it
  rolls with a blur as it changes, the drag keeps working with the pointer well below the control, and the fill
  gives a little past the end. `~/Downloads/twitter_media_harvest/nitishkmrk-2119695845679665608-01.mp4`
  (https://x.com/nitishkmrk/status/2119695845679665608).
- **Why they shared it:** "the drag control should allow me to drag all over, and the drag should feel like an
  interface in itself, it should give me feedback and change values like a slider." Then: keep the dropdown, but
  dragging gets "a drag mode", "going across the value in a vertical manner... rolling updates in the field... going
  up and down across the options".
- **What it changed here:** the token picker's value became a reel: press and drag anywhere, the options roll past
  in the field with a blur at speed, neighbours open above and below, it gives past either end and settles on
  release. Journey, Chapter 3, entry 11.


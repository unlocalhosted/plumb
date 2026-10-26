# Element editors: edit any value, not only drift

Status: design, 2026-10-27. Owner decisions: a popover at the element (Alt+click), shaped for what it is; editors for
card/surface, layout, text and image/media; drift is one state of the same editor, not a separate chooser.

## Layers
1. **Server: the editable properties of an element.** `GET /__plumb/props?file&line&column` returns, for the JSX
   element at that position, every property family the editors need, whether set or not:
   `{ hash, kind: 'surface'|'layout'|'text'|'media'|'control', props: [{ key: 'padding', family: 'spacing', value: '12px',
   token: 's3' | null, source: 'class'|'inline'|'computed'|'none', class: 'p-3' | null, steps: [{ token, value, label }],
   dynamic?: reason }] }` (padding, padding-x/y, gap, flex-direction, align-items, justify-content, flex-wrap, radius,
   background, border-color, border-width, shadow, font-size, font-weight, line-height, color, width, height,
   object-fit, aspect-ratio). `POST /__plumb/set { file, hash, key, token }` writes it: replaces the class that sets it,
   or adds one to a static className (string literal, `cn(...)`/`cva` first string argument, template literal without
   expressions), refusing with a reason where the className is built dynamically. The response carries the same `undo`
   handle the write history gives every write. Proof: integration tests over real HTTP on a fixture (replace, add,
   refused dynamic, stale hash).
2. **Primitives (UI).** The controls every editor is built from, each with every state (rest, hover, focus, pressed,
   disabled, loading, error, picked) and keyboard: a scale stepper (spacing, size: the theme's steps as a ladder,
   arrows step), swatches (colour tokens), a radius ruler, a segmented toggle (direction, wrap, fit), an alignment grid
   (align × justify), a shadow ladder. Reviewed by the owner before any editor is built on them.
3. **Editors (UI), one at a time:** card/surface, then layout, then text, then media. Each opens from Alt+click as a
   popover beside the element, previews on the page as you hover a step, writes on pick (or batches until Write: to be
   decided with the owner at the primitives review), and shows drift as the property's off-scale state with its nearest
   steps.

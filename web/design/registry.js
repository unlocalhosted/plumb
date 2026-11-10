// The design system's pages: one entry per part. `hue` and `toy` are how the part looks on the shelf: its meaning's
// colour (docs/design/visual-language.md, the hue table) and the toy that stands for it. `ready` parts have a page (web/design/parts/<id>.js); the rest are
// listed so the whole system is in view and nothing is drawn without its turn. 
export const GROUPS = [
  ['Foundations', [
    { id: 'identity', hue: 'lilac', toy: 'ratio', name: 'Identity', says: 'What makes a raised thing a delight, taken apart: soft blocks, and the face.', ready: true,
      lede: 'The raised key and the rounded face are borrowed: a hundred playful products look like this. The icons are ours. Here is what replaced them: soft blocks, rebuilt from where the delight comes from, and a face with its own hand. Point at each and press.' },
    { id: 'color', hue: 'pink', toy: 'fill', name: 'Colour', says: 'Six hues with one meaning each, the neutrals, the roles. Tables read from the token file.', ready: true,
      lede: 'Six hues with one meaning each, a few neutrals, and the roles that parts ask for. Every table here is read from the token file itself, so it can’t disagree with the product.' },
    { id: 'type', hue: 'sky', toy: 'type', name: 'Type', says: 'Two faces and twelve styles, each one token. Every size drawn to scale.', ready: true,
      lede: 'A rounded face for what a toy has printed on it, a plain one for reading. Twelve styles, each a single token, read from the token file itself.' },
    { id: 'icons', hue: 'butter', toy: 'icon', name: 'Icons', says: '76 toys: 27 properties, 49 elements and patterns, and the rules they are drawn to.', ready: true,
      lede: 'Solid, in colour, each one drawn for what the thing does. Point at one.' },
    { id: 'space', hue: 'mint', toy: 'padding', name: 'Spacing and radius', says: 'The spacing, border radius and shadow tokens.' },
    { id: 'motion', hue: 'mint', toy: 'motion', name: 'Motion', says: 'Picked up, arrives, lands, rolls. The springs and the times.' },
  ]],
  ['Parts', [
    { id: 'buttons', hue: 'pink', toy: 'button', name: 'Buttons', says: 'What you press. Every kind, state and size, with keys and with pictures.', ready: true,
      lede: 'A button is a soft block, small: a lit top on a side of its own colour. It goes down under the finger, gives a little, and springs back. Everything here is live: point, press, tab.' },
    { id: 'fix-bar', hue: 'lilac', toy: 'corner', name: 'Fix bar', says: 'What is hard-coded, in one line; the whole-page clean-up in the same bar.', ready: true,
      lede: 'One line at the bottom says what is hard-coded, in plain words, and the same bar carries the whole-page clean-up. The choice itself is made on the element.' },
    { id: 'pills', hue: 'lilac', toy: 'tag', name: 'Pills, tags and chips', says: 'A value, a name, a property with its value rolling.' },
    { id: 'inputs', hue: 'sky', toy: 'input', name: 'Inputs', says: 'Naming a token, searching, typing a reason. Caret, focus, error, disabled.' },
    { id: 'text-ideas', hue: 'sky', toy: 'type', name: 'Text: four new ideas', says: 'Putting hard-coded text on a style without a panel. Four prototypes on one page.', ready: true,
      lede: 'A heading has hard-coded type and you want it on the right style, fast and sure. Four ways that let the page and plumber do the work instead of a panel of controls. Each runs on the same piece of someone’s app.' },
    { id: 'pickers', hue: 'mint', toy: 'slider', name: 'Token pickers', says: 'The control on an element that moves a hard-coded value onto your tokens. One per property.', ready: true,
      lede: 'When a value is hard-coded, the element gets the control a visual editor gives that property, made small, snapping to your tokens. One property at a time, each on a real piece of UI.' },
    { id: 'hover', hue: 'butter', toy: 'tooltip', name: 'Words on hover', says: 'The name label, the sentence note, the key hint.' },
    { id: 'messages', hue: 'mint', toy: 'toast', name: 'Messages', says: 'The toast after a write, Undo, the history strip, a refusal.' },
    { id: 'surfaces', hue: 'butter', toy: 'card', name: 'Surfaces', says: 'Paper, cards, bars, the dock. Light and dark.' },
    { id: 'marks', hue: 'lilac', toy: 'gap', name: 'Marks on the page', says: 'What Blueprint draws on your app: the three patterns, heat, a place in hand.' },
    { id: 'states', hue: 'lilac', toy: 'empty', name: 'States', says: 'Empty, loading, error, nothing to fix. A toy and one sentence.' },
  ]],
];
export const PARTS = GROUPS.flatMap(([, parts]) => parts);
export const partOf = (id) => PARTS.find((p) => p.id === id);

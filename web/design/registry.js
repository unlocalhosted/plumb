// The design system's pages: one entry per part. `hue` and `toy` are how the part looks on the shelf: its meaning's
// colour (docs/design/visual-language.md, the hue table) and the toy that stands for it. `ready` parts have a page (web/design/parts/<id>.js); the rest are
// listed so the whole system is in view and nothing is drawn without its turn. 
export const GROUPS = [
  ['Foundations', [
    { id: 'identity', hue: 'lilac', toy: 'ratio', name: 'Identity', says: 'Three ways the site could look like nobody else. A question, not an answer yet.', ready: true,
      lede: 'The raised key and the rounded face are borrowed: a hundred playful products look like this. The icons are ours. Here are three ways to make everything else ours too, side by side. Point at each and press.' },
    { id: 'color', hue: 'pink', toy: 'fill', name: 'Colour', says: 'Six hues with one meaning each, the neutrals, the roles. Tables read from the token file.', ready: true,
      lede: 'Six hues with one meaning each, a few neutrals, and the roles that parts ask for. Every table here is read from the token file itself, so it can’t disagree with the product.' },
    { id: 'type', hue: 'sky', toy: 'type', name: 'Type', says: 'Two faces and twelve styles, each one token. Every size drawn to scale.', ready: true,
      lede: 'A rounded face for what a toy has printed on it, a plain one for reading. Twelve styles, each a single token, read from the token file itself.' },
    { id: 'icons', hue: 'butter', toy: 'icon', name: 'Icons', says: '76 toys: 27 properties, 49 elements and patterns, and the rules they are drawn to.', ready: true,
      lede: 'Solid, in colour, each one drawn for what the thing does. Point at one.' },
    { id: 'space', hue: 'mint', toy: 'padding', name: 'Space and corners', says: 'The spacing ladder, the corner steps, the shadows.' },
    { id: 'motion', hue: 'mint', toy: 'motion', name: 'Motion', says: 'Picked up, arrives, lands, rolls. The springs and the times.' },
  ]],
  ['Parts', [
    { id: 'buttons', hue: 'pink', toy: 'button', name: 'Buttons', says: 'What you press. Every kind, state and size, with keys and with pictures.', ready: true,
      lede: 'A button is a toy key: a solid top on a darker base, and pressing it pushes the top down onto the base. Everything here is live: point, press, tab.' },
    { id: 'fix-bar', hue: 'lilac', toy: 'corner', name: 'Fix bar', says: 'The cause in hand as one line; the choice made on the element. Three states, the first one live.', ready: true,
      lede: 'The cause in hand is one line at the bottom; the choice is made on the element. The first one is live: click a step or press ↑ ↓, then Enter.' },
    { id: 'pills', hue: 'lilac', toy: 'tag', name: 'Pills, tags and chips', says: 'A value, a name, a property with its value rolling.' },
    { id: 'inputs', hue: 'sky', toy: 'input', name: 'Inputs', says: 'Naming a token, searching, typing a reason. Caret, focus, error, disabled.' },
    { id: 'steps', hue: 'mint', toy: 'slider', name: 'Step controls', says: 'Spacing stairs, corners, swatches, shadows. Each step drawn as what it makes.' },
    { id: 'hover', hue: 'butter', toy: 'tooltip', name: 'Words on hover', says: 'The name label, the sentence note, the key hint.' },
    { id: 'messages', hue: 'mint', toy: 'toast', name: 'Messages', says: 'The toast after a write, Undo, the history strip, a refusal.' },
    { id: 'surfaces', hue: 'butter', toy: 'card', name: 'Surfaces', says: 'Paper, cards, bars, the dock. Light and dark.' },
    { id: 'marks', hue: 'lilac', toy: 'gap', name: 'Marks on the page', says: 'What Blueprint draws on your app: the three patterns, heat, a place in hand.' },
    { id: 'states', hue: 'lilac', toy: 'empty', name: 'States', says: 'Empty, loading, error, nothing to fix. A toy and one sentence.' },
  ]],
];
export const PARTS = GROUPS.flatMap(([, parts]) => parts);
export const partOf = (id) => PARTS.find((p) => p.id === id);

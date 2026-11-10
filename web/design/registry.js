// The design system's pages: one entry per part. `ready` parts have a page (web/design/parts/<id>.js); the rest are
// listed so the whole system is in view and nothing is drawn without its turn. `own` pages carry their own heading.
export const GROUPS = [
  ['Foundations', [
    { id: 'color', name: 'Colour', says: 'Six hues with one meaning each, the neutrals, the roles. Tables read from the token file.', ready: true, own: true },
    { id: 'type', name: 'Type', says: 'Twelve styles in two families, each one token. Every size drawn to scale.', ready: true, own: true },
    { id: 'icons', name: 'Icons', says: '76 toys: 27 properties, 49 elements and patterns, and the rules they are drawn to.', ready: true,
      lede: 'Solid, in colour, each one drawn for what the thing does. Point at one.' },
    { id: 'space', name: 'Space and corners', says: 'The spacing ladder, the corner steps, the shadows.' },
    { id: 'motion', name: 'Motion', says: 'Picked up, arrives, lands, rolls. The springs and the times.' },
  ]],
  ['Parts', [
    { id: 'buttons', name: 'Buttons', says: 'What you press. Every kind, state and size, with keys and with pictures.', ready: true,
      lede: 'A button is a toy key: a solid top on a darker base, and pressing it pushes the top down onto the base. Everything here is live: point, press, tab.' },
    { id: 'fix-bar', name: 'Fix bar', says: 'The cause in hand as one line; the choice made on the element. Three states, the first one live.', ready: true,
      lede: 'The cause in hand is one line at the bottom; the choice is made on the element. The first one is live: click a step or press ↑ ↓, then Enter.' },
    { id: 'pills', name: 'Pills, tags and chips', says: 'A value, a name, a property with its value rolling.' },
    { id: 'inputs', name: 'Inputs', says: 'Naming a token, searching, typing a reason. Caret, focus, error, disabled.' },
    { id: 'steps', name: 'Step controls', says: 'Spacing stairs, corners, swatches, shadows. Each step drawn as what it makes.' },
    { id: 'hover', name: 'Words on hover', says: 'The name label, the sentence note, the key hint.' },
    { id: 'messages', name: 'Messages', says: 'The toast after a write, Undo, the history strip, a refusal.' },
    { id: 'surfaces', name: 'Surfaces', says: 'Paper, cards, bars, the dock. Light and dark.' },
    { id: 'marks', name: 'Marks on the page', says: 'What Blueprint draws on your app: the three patterns, heat, a place in hand.' },
    { id: 'states', name: 'States', says: 'Empty, loading, error, nothing to fix. A toy and one sentence.' },
  ]],
];
export const PARTS = GROUPS.flatMap(([, parts]) => parts);
export const partOf = (id) => PARTS.find((p) => p.id === id);

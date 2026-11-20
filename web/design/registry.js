// The design system's pages, by atomic level (foundations, atoms, molecules, organisms, templates). `hue` and `toy` are how the
// part looks on the shelf: its meaning's colour (docs/design/visual-language.md, the hue table) and the toy that stands for it.
// `ready` parts have a page (web/design/parts/<id>.js); the rest are listed so the whole system is in view and nothing is
// drawn without its turn. Each group is [title, parts, what the level is].
export const GROUPS = [
  ['Foundations', [
    { id: 'logo', hue: 'pink', toy: 'corner', name: 'Logo', says: 'A solid P inside a drawn R. How it is built, its rules, sizes, colours and surfaces.', ready: true,
      lede: 'The mark is a solid P with an R drawn around it in plumber’s own line. This is its sheet: how it is built, the four rules that keep it one mark, the drawing each size gets, and how it sits on real surfaces.' },
    { id: 'identity', hue: 'lilac', toy: 'ratio', name: 'Identity', says: 'What makes a raised thing a delight, taken apart: soft blocks, and the face.', ready: true,
      lede: 'The raised key and the rounded face are borrowed: a hundred playful products look like this. The icons are ours. Here is what replaced them: soft blocks, rebuilt from where the delight comes from, and a face with its own hand. Point at each and press.' },
    { id: 'color', hue: 'pink', toy: 'fill', name: 'Colour', says: 'Six hues with one meaning each, the neutrals, the roles. Tables read from the token file.', ready: true,
      lede: 'Six hues with one meaning each, a few neutrals, and the roles that parts ask for. Every table here is read from the token file itself, so it can’t disagree with the product.' },
    { id: 'type', hue: 'sky', toy: 'type', name: 'Type', says: 'Two faces and twelve styles, each one token. Every size drawn to scale.', ready: true,
      lede: 'A rounded face for what a toy has printed on it, a plain one for reading. Twelve styles, each a single token, read from the token file itself.' },
    { id: 'icons', hue: 'butter', toy: 'icon', name: 'Icons', says: '76 toys: 27 properties, 49 elements and patterns, and the rules they are drawn to.', ready: true,
      lede: 'Solid, in colour, each one drawn for what the thing does. Point at one.' },
    { id: 'space', hue: 'mint', toy: 'padding', name: 'Spacing and radius', says: 'Two ladders of space, a corner per object, two shadows. Drawn as real space.', ready: true,
      lede: 'Space on a card is a ladder of 4; on a page, four big steps. A corner belongs to an object, not a size. Only two things are lifted. Every step is drawn as real space, marked the way Plumber marks yours.' },
    { id: 'motion', hue: 'mint', toy: 'motion', name: 'Motion', says: 'Picked up, arrives, lands, rolls. Each one live, next to its curve.', ready: true,
      lede: 'Pieces behave like objects with a little weight. Each moment is the real piece doing it, beside its curve drawn from the token. Point at one.' },
    { id: 'surfaces', hue: 'butter', toy: 'card', name: 'Surfaces', says: 'Three heights: pressed in, flat, lifted. The same pieces by day and by night.', ready: true,
      lede: 'What things sit on, and how high. There are three heights and no others: pressed in, flat, lifted. Each is shown holding the product’s own pieces, by day and by night.' },
  ], 'The decisions everything else is made from: colour, type, space, motion, the mark.'],
  ['Atoms', [
    { id: 'buttons', hue: 'pink', toy: 'button', name: 'Buttons', says: 'What you press. Every kind, state and size, with keys and with pictures.', ready: true,
      lede: 'A button is a soft block, small: a lit top on a side of its own colour. It goes down under the finger, gives a little, and springs back. Everything here is live: point, press, tab.' },
    { id: 'pills', hue: 'lilac', toy: 'tag', name: 'Pills, tags and chips', says: 'A value, a name, a property with its value rolling.', ready: true,
      lede: 'Three small things that look alike and mean different things: a pill is a value, a tag is a name, a chip is a property and its value. Each drawn large, its space marked the way Plumber marks yours.' },
    { id: 'inputs', hue: 'sky', toy: 'input', name: 'Inputs', says: 'Naming a token and saying why you keep a value: the only two fields. Every state.', ready: true,
      lede: 'Plumber asks you to type only twice: a name for a new token, and a reason for keeping a value. Each is a sentence with one blank, live here with the fix bar’s own styles and words.' },
  ], 'The smallest pieces you can point at. Each is one thing with one job.'],
  ['Molecules', [
    { id: 'price', hue: 'butter', toy: 'card', name: 'Price', says: 'What a plan costs. Redrawn from real pricing sections once they are signed off; the first version was a grid of settings, not a design.',
      lede: 'The first of the parts the organism generator builds pricing cards from. A card says how loud its price should be; the price says it in our look, in one of three forms.' },
    { id: 'hover', hue: 'butter', toy: 'tooltip', name: 'Words on hover', says: 'The name tag, the hint, the key: what appears when you point, live on a real card.', ready: true,
      lede: 'Three kinds of words appear when you point: the name tag says what something is and whether it’s right, the hint says what it becomes, the key says what to press. Point at the card.' },
    { id: 'pickers', hue: 'mint', toy: 'slider', name: 'Token pickers', says: 'The control on an element that moves a hard-coded value onto your tokens. One per property.', ready: true,
      lede: 'When a value is hard-coded, the element gets the control a visual editor gives that property, made small, snapping to your tokens. One property at a time, each on a real piece of UI.' },
    { id: 'messages', hue: 'mint', toy: 'toast', name: 'Messages', says: 'The toast after a write, Undo, the history strip, a refusal.', ready: true,
      lede: 'Plumber speaks up only after it has written to your code: a toast by the dock that says what changed, with Undo, and a history where every change can be taken back on its own. Both are live here.' },
    { id: 'states', hue: 'lilac', toy: 'empty', name: 'States', says: 'Empty, loading, error, nothing to fix. A toy and one sentence.' },
  ], 'A few atoms doing one job together: a price, a name tag with its hint, a toast with its Undo.'],
  ['Organisms', [
    { id: 'fix-bar', hue: 'lilac', toy: 'corner', name: 'Fix bar', says: 'What is hard-coded, in one line; the whole-page clean-up in the same bar.', ready: true,
      lede: 'One line at the bottom says what is hard-coded, in plain words, and the same bar carries the whole-page clean-up. The choice itself is made on the element.' },
    { id: 'change-motion', hue: 'mint', toy: 'motion', name: 'How a change moves', says: 'Every kind of fix landing on the page: guides, the move, the number landing. One tile each.', ready: true,
      lede: 'When Clean up or a fix changes your page, the change is shown happening: what is measured, how it moves, where it lands. One tile for each kind of change, from text size to tap targets. Press Play.' },
    { id: 'xray', hue: 'sky', toy: 'size', name: 'X-ray', says: 'Point at anything and see what it is made of: its space, size, type, colour and source.', ready: true,
      lede: 'Point at any part of someone’s card. Its space is drawn on it in the patterns, mint on the scale and coral off it, and a card beside it says the numbers. Prototype.' },
    { id: 'marks', hue: 'lilac', toy: 'gap', name: 'Marks on the page', says: 'What Blueprint draws on your app: the three patterns, heat, a place in hand.' },
    { id: 'pricing-card', hue: 'butter', toy: 'card', name: 'Pricing card', says: 'One plan: its name, its price, what you get, the button. Built by the generator from the molecules.' },
  ], 'A whole part of a screen, made of molecules: the fix bar, x-ray, a pricing card.'],
  ['Templates', [
    { id: 'pricing-section', hue: 'butter', toy: 'card', name: 'Pricing section', says: 'Plans side by side, lined up part for part, the chosen one standing out.' },
  ], 'A layout organisms sit in, with real content: a row of plans, a page.'],
  ['Explorations', [
    { id: 'text-ideas', hue: 'sky', toy: 'type', name: 'Text: four new ideas', says: 'Putting hard-coded text on a style without a panel. Four prototypes on one page.', ready: true,
      lede: 'A heading has hard-coded type and you want it on the right style, fast and sure. Four ways that let the page and plumber do the work instead of a panel of controls. Each runs on the same piece of someone’s app.' },
    { id: 'colour-ideas', hue: 'pink', toy: 'fill', name: 'Colour picker: three ideas', says: 'Decided: nearest first, with every colour by role (B with C). Now on Token pickers. Kept as the record.', ready: true,
      lede: 'Colour isn’t like the other pickers: no size to order by, many tokens in roles, and a light and a dark value each. A hard-coded colour stays the same in dark mode; a token follows it. Three ways to pick, on the same piece of someone’s app.' },
    { id: 'in-use', hue: 'pink', toy: 'button', name: 'A button in use', says: 'Press plumber’s own buttons and see, frame by frame, what goes wrong and how to fix it.', ready: true,
      lede: 'A button is judged while it is used, not only at rest. Press one of plumber’s own buttons: when you let go, its filmstrip opens under it, with what went wrong and the fix.' },
  ], 'Ideas tried side by side before one was chosen, kept as the record.'],
];
export const PARTS = GROUPS.flatMap(([, parts]) => parts);
export const partOf = (id) => PARTS.find((p) => p.id === id);

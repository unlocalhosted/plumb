// Every pairing of colours the design system allows: what is drawn, on what, and how well it has to be seen.
// A part may only put one colour on another if the pair is in this list. scripts/contrast.mjs checks each pair in both
// schemes against WCAG 2 and fails when one can't be read; the design site's colour page shows the same table.
//
//   need   'text'  words at any size                      4.5 : 1
//          'bold'  words in bold at 14px or more, or 18+  3 : 1
//          'mark'  a shape that carries meaning           3 : 1
const HUES = ['mint', 'butter', 'lilac', 'pink', 'sky', 'coral'];

export const NEED = { text: 4.5, bold: 3, mark: 3 };

export const PAIRS = [
  // words on the ground
  { fg: 'ink', bg: 'paper', need: 'text', use: 'titles and values on a card' },
  { fg: 'ink', bg: 'paper-2', need: 'text', use: 'words on an inset' },
  { fg: 'ink-2', bg: 'paper', need: 'text', use: 'secondary words on a card' },
  { fg: 'ink-2', bg: 'paper-2', need: 'text', use: 'secondary words on an inset' },
  { fg: 'soft-text', bg: 'paper', need: 'text', use: 'a word in the butter tone' },
  // a hue as a solid body, lettered
  ...HUES.map((h) => ({ fg: `${h}-on`, bg: h, need: 'bold', use: `words on a ${h} body (a button, a box)` })),
  // a hole cut in a body (butter takes marks in its -on instead, checked above: white vanishes on yellow)
  ...HUES.filter((h) => h !== 'butter').map((h) => ({ fg: 'cut', bg: h, need: 'mark', use: `a cut-out in a ${h} toy` })),
  // a hue's pale, lettered in its ink (pills, callouts, what is not there)
  ...HUES.map((h) => ({ fg: `${h}-ink`, bg: `${h}-soft`, need: 'text', use: `words on ${h}'s pale (a pill, a callout)` })),
  // a hue as a shape on the ground
  ...HUES.filter((h) => h !== 'butter').map((h) => ({ fg: h, bg: 'paper', need: 'mark', use: `a ${h} toy or line on a card` })),
  { fg: 'butter-line', bg: 'paper', need: 'mark', use: 'a thin butter mark on a card' },
  // a card's face, lettered in the hue's ink (light: the richer face; night: the calmer tone in white)
  ...HUES.map((h) => ({ fg: `${h}-ink`, bg: `${h}-face`, need: 'text', use: `words on a ${h} card` })),
  // a block you press, lettered (the roles --pl-action-*, --pl-done-*, --pl-danger-* point here)
  ...['pink', 'mint', 'coral'].map((h) => ({ fg: `${h}-block-on`, bg: `${h}-block`, need: 'bold', use: `words on a ${h} button` })),
];

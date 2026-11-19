// What every molecule of the organism generator takes (docs/briefs/organism-generator.md, Molecules). A molecule does
// one job in its slot, in our look, and owns everything inside the slot. From the grammar it takes only:
//   rank      1 is the loudest slot on the card, 2 the next, 3 and on are quiet
//   lead      how far rank 1 stands above rank 2: 'flat' | 'clear' | 'strong'
//   density   the card's spacing band: 'airy' | 'balanced' | 'compact'
//   on        what it sits on: 'paper', or a hue whose block it sits on ('pink' when the card is the chosen one)
// and the slot's content record (named fields from its job's schema). It returns HTML; its CSS is exported beside it.
//
// Sizes come only from the site's steps (docs/design/visual-language.md, Type: 54 a headline, 28 a section, 24 a name
// on a box; the token file's page styles: 40 display, 32 figure, 20 title, 16 body, 14 small, 13 meta). A rank and a
// lead pick a step; nothing in between.

// the loudest thing on a card, by how far it leads: a strong lead is a headline, a clear one a display figure, a flat
// one the size of a name; second place is a name; the rest read at the size of supporting words
export const figureStep = ({ rank, lead }) => (rank === 1 ? { strong: 54, clear: 40, flat: 24 }[lead] ?? 40 : rank === 2 ? 24 : 16);
// space inside a slot (between its own parts), by density: a card's ladder of 4 (2, 4, 8)
export const innerGap = (density) => ({ airy: 8, balanced: 4, compact: 2 }[density] ?? 4);
// words and marks on a block use its -block-on colour and nothing else (pairs.js): there, quieter words are quieter by
// size and weight, never by a mixed-down colour; on paper, the two inks
export const inks = (on) => (on && on !== 'paper'
  ? { primary: `var(--pl-${on}-block-on)`, secondary: `var(--pl-${on}-block-on)` }
  : { primary: 'var(--pl-text-primary)', secondary: 'var(--pl-text-secondary)' });
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

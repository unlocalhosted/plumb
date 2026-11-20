/* ─────────────────────────────────────────────────────────
 * PACK · TELLS · React Plumber overlay
 *
 * The marks that make a screen read as generated: a label in capitals over every heading, "01 02 03" on cards that
 * have no order, a badge that says NEW whatever is new, an icon in a tinted square above each feature, a glow, a
 * gradient from one hue to another. Each is read off the drawn page, so it is found however the page was written
 * (a utility class, a stylesheet, CSS-in-JS).
 *
 * Where they come from: unslop-ui by Felipe Basurto (MIT, github.com/felipebasurto/unslop-ui), rules U1 to U20, and
 * the pstack unslop writing rules it carries (Lauren Tan, MIT). That skill counts these with patterns over source
 * text and leaves the rest to an agent's reading; here only the ones the drawn page settles are taken. Left out:
 * subtitles that repeat the heading, captions that narrate, slogans, a label said twice and a number said twice
 * (U3, U4 in part, U5, U7, U8, U14: they need reading); chart clutter and legends (U15, U16: most charts are a canvas);
 * off-scale spacing (U18: craft's rhythm and declared-gap judge it against the page's own steps). Nothing of the
 * skill's text is copied.
 * ───────────────────────────────────────────────────────── */

const U = (n, name) => ({ id: `unslop-ui-u${n}`, name: `unslop-ui U${n} ${name}` });
const UNSLOP = (n, name) => ({ id: `pstack-unslop-${n}`, name: `pstack unslop ${n} ${name}` });
const ADVISORY = { tier: 'advisory' };
// the owner's list of slop marks (2026-11-20, docs/references.md)
const OWN = (name) => ({ id: `owner-slop-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`, name: `Owner's slop list: ${name}` });

// rule short name → [the rule it comes from, its spec entry, its words]
const TABLE = {
  eyebrow: [U(1, 'Eyebrow labels'), {}, ({ text }) => ({ label: 'Label over a heading', line: `"${text}" sits in small capitals above the heading.`, reason: 'The heading already says what this part is. The label only repeats it, louder.' })],
  numbering: [U(2, 'Decorative numbering'), ADVISORY, ({ text }) => ({ label: 'Numbers with no order', line: `"${text}" numbers something that has no order.`, reason: 'Numbers tell people to go in sequence. If the parts can be read in any order, they are noise.' })],
  'status-chain': [U(6, 'Status strings'), ADVISORY, ({ count, text }) => ({ label: 'Too much in one line', line: text ? `"${text}" puts ${count} things in one line.` : `${count} things are put in one line, split by dots or bars.`, reason: 'Nobody reads a chain. Keep the one fact people act on and put the rest where it is needed.' })],
  'flavour-badge': [U(9, 'Badges and pills without real state'), ADVISORY, ({ text }) => ({ label: 'Badge for flavour', line: `"${text}" is set as a badge.`, reason: 'A badge should mean something the app tracks, like a stream that is live. Added for flavour, it teaches people to ignore badges.' })],
  'status-dot': [U(10, 'Status dots'), ADVISORY, ({ moving }) => ({ label: moving ? 'Pulsing dot' : 'Coloured dot', line: moving ? 'A small dot pulses next to these words.' : 'A small coloured dot sits next to these words.', reason: 'A dot says "this is live". If nothing real drives it, it claims something untrue.' })],
  emoji: [U(11, 'Decorative emojis and icons'), {}, ({ emoji }) => ({ label: 'Emoji as decoration', line: `${emoji} decorates these words.`, reason: 'It says nothing the words do not, and it changes look on every system.' })],
  'icon-tile': [U(11, 'Decorative emojis and icons'), {}, () => ({ label: 'Icon in a tinted square', line: 'An icon sits in a tinted square above the words.', reason: 'The tile repeats on every item and tells them apart by colour alone. The names already do that.' })],
  'chart-type-title': [U(12, 'Chart titles that name the chart type'), {}, ({ kind }) => ({ label: 'Title names the chart', line: `The title says it is a ${kind}.`, reason: 'People can see it is a chart. The title should say what it measures.' })],
  'reading-instructions': [U(13, 'Reading instructions'), {}, ({ phrase }) => ({ label: 'Explains how to read', line: `"${phrase}" tells people how to read what they can see.`, reason: 'If it needs instructions, change the thing. If it does not, cut them.' })],
  narrating: [U(4, 'Botsplaining'), ADVISORY, ({ phrase }) => ({ label: 'Narrates the screen', line: `"${phrase}" describes what is on the screen.`, reason: 'People can see it. Keep the words they need to act.' })],
  'subtitle-echo': [U(3, 'Subtitle reflex'), ADVISORY, ({ heading }) => ({ label: 'Subtitle says it again', line: `The line under "${heading}" says what the heading already says.`, reason: 'A second line that adds no fact is read for nothing. Keep it only if it says something the heading does not.' })],
  'em-dash': [UNSLOP(13, 'Em dashes'), ADVISORY, ({ count }) => ({ label: 'Em dash in copy', line: count > 1 ? `${count} em dashes in these words.` : 'An em dash in these words.', reason: 'Generated copy leans on the dash. A full stop or a comma reads as written by a person.' })],
  'stock-words': [UNSLOP(7, 'AI vocabulary'), ADVISORY, ({ word }) => ({ label: 'Stock word', line: `"${word}" is a stock word.`, reason: 'It could sit on any product\'s page. Say what this one does.' })],
  'hue-gradient': [U(17, 'Gradients and glows'), ADVISORY, ({ text }) => ({ label: text ? 'Rainbow text' : 'Gradient across hues', line: text ? 'These words are filled with a gradient from one hue to another.' : 'This surface fades from one hue to another.', reason: 'A two-hue gradient is the first thing generated pages reach for. A solid colour holds the brand better.' })],
  glow: [U(17, 'Gradients and glows'), ADVISORY, ({ px }) => ({ label: 'Coloured glow', line: `A ${px}px coloured glow surrounds this.`, reason: 'A glow lifts it with no light to explain it. A soft neutral shadow or a border does the job.' })],
  'transition-all': [U(20, 'Decorative motion'), ADVISORY, () => ({ label: 'Animates everything', line: 'Every property here animates when it changes.', reason: 'Size and layout changes slide when they should snap, and the browser does extra work. Name the properties that should move.' })],
  'hover-grow': [U(20, 'Decorative motion'), ADVISORY, ({ scale }) => ({ label: 'Card grows on hover', line: `This grows to ${scale}× when the pointer is over it.`, reason: 'A card that jumps at the pointer feels busy. A colour or shadow change is enough to say it can be clicked.' })],
  'heavy-weight': [U(19, 'Extra-heavy weights'), ADVISORY, ({ weight }) => ({ label: 'Extra-heavy weight', line: `Set at weight ${weight}.`, reason: 'Size and colour carry the order better. Weights of 800 and 900 shout.' })],
  'caps-subtitle': [OWN('All caps on subtitles'), {}, ({ text }) => ({ label: 'Subtitle in capitals', line: `"${text}" is set in capitals under the heading.`, reason: 'Capitals make the second line louder than the first. The heading should lead.' })],
  'italic-words': [OWN('Italicized words'), ADVISORY, ({ text, big }) => ({ label: big ? 'Italic accent in a heading' : 'Italic accent', line: `"${text}" is set in italics.`, reason: 'Slanting a word for flavour is a template habit. The words should carry the weight on their own.' })],
  'display-serif': [OWN('Instrument Serif'), ADVISORY, () => ({ label: 'Borrowed display serif', line: 'This is set in Instrument Serif.', reason: 'It is the face generated pages pick for a quick dose of taste, so it reads as a template.' })],
  'negative-tracking': [OWN('Negative kerning'), ADVISORY, ({ em }) => ({ label: 'Letters squeezed', line: `The letters are pulled ${Math.abs(em)}em closer together.`, reason: 'Squeezed headings are a template look. The type was spaced by the people who drew it.' })],
  divider: [OWN('Dividers'), ADVISORY, ({ count }) => ({ label: count > 1 ? 'Lines between rows' : 'Divider line', line: count > 1 ? `${count} rows are split by lines.` : 'A line splits these parts.', reason: 'Lines cut the page into strips. Space does the same job and keeps it calm.' })],
  'bordered-box': [OWN('Containers with borders'), ADVISORY, () => ({ label: 'Outlined box', line: 'A border runs round this box.', reason: 'Boxes inside boxes make every part shout "card". A quiet fill or space groups it.' })],
  'detailed-diagram': [OWN('Diagrams'), ADVISORY, ({ parts }) => ({ label: 'Busy diagram', line: `This drawing has ${parts} parts.`, reason: 'The more a diagram draws, the less anyone reads it. One idea needs few marks.' })],
  'code-breadcrumb': [OWN('Code breadcrumbs'), ADVISORY, ({ text }) => ({ label: 'Path as decoration', line: `"${text}" is set like code.`, reason: 'A file path on a page dresses it up as a terminal. People need the name of the thing, not where it lives.' })],
  'tag-row': [OWN('Tags'), ADVISORY, ({ count, text }) => ({ label: 'Row of tags', line: `${count} tags: ${text}.`, reason: 'Tags that do nothing when pressed are labels pretending to be data.' })],
  'busy-card': [OWN('Over-the-top detailed UI'), ADVISORY, ({ styles }) => ({ label: 'Too many voices', line: `This box uses ${styles} text styles.`, reason: 'Each style is another voice. Past three, nothing leads and the box reads as noise.' })],
  'many-shades': [OWN('Multiple colour shades and opacities'), ADVISORY, ({ shades, grey, opacities }) => ({ label: 'Too many shades', line: shades >= 7 ? `The page uses ${shades} shades of one ${grey ? 'grey' : 'colour'}${opacities >= 4 ? ` and ${opacities} opacities` : ''}.` : `The page fades things to ${opacities} different opacities.`, reason: 'Each near-same shade asks people to tell it apart. A few steps, used the same way everywhere, read as a system.' })],
};

export const TELLS = {
  id: 'tells',
  title: 'Tells',
  ground: 'unslop-ui (MIT): the marks of a generated screen that the drawn page shows',
  source: { package: 'unslop-ui', version: 'main 2026-11-19', guide: 'U1–U4, U6, U9–U13, U17, U19, U20; pstack unslop 7, 13; the owner\'s slop list (2026-11-20)' },
  runs: 'page',
  guides: Object.fromEntries(Object.entries(TABLE).map(([short, [law]]) => [short, law.id])),
  spec: { access: Object.fromEntries(Object.entries(TABLE).map(([short, [, entry]]) => [short, entry])) },
  words: Object.fromEntries(Object.entries(TABLE).map(([short, [, , words]]) => [short, words])),
  laws: Object.fromEntries(Object.entries(TABLE).map(([short, [law]]) => [short, [law]])),
};

// The real-state test (unslop-ui's, for U9 and U10): a badge or a dot that renders only under a condition
// (`{isLive && <Badge>…}`, `{n > 0 ? <i/> : null}`) is bound to something the app tracks, and is kept. The page cannot
// see that; the source can. Asked of the JSX at the finding's line and column: the nearest `{` that opens around it,
// read up to the element.
export const BOUND_RULES = new Set(['tells/flavour-badge', 'tells/status-dot']);
export function boundInSource(text, line, column = 1) {
  let at = 0;
  for (let l = 1; l < line && at !== -1; l++) at = text.indexOf('\n', at) + 1;
  if (at <= 0 && line > 1) return false;
  at += Math.max(0, column - 1);
  // walk back to the `{` that is still open here, skipping matched pairs; a JSX element ends the search when it is
  // the parent of the one asked about (a `>` closing an opening tag is fine: the condition sits before it)
  let depth = 0;
  for (let i = at - 1, stop = Math.max(0, at - 600); i >= stop; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) return /&&|\?(?!\.)|\|\|/.test(text.slice(i + 1, at));
      depth--;
    }
  }
  return false;
}

// The meaning test, for subtitle-echo (U3): whether the line under a heading says anything the heading does not. The
// page finds the pair; a sentence-embedding model (all-MiniLM-L6-v2, unit vectors, so similarity is a dot product)
// scores it, asked of the dev server (POST /__plumb/meaning, src/meaning.ts), so the overlay and `plumber craft`
// read it alike. A line with a specific in it (a number, a date, a price, a code in
// capitals) adds a fact and is kept without asking. Otherwise it is said when it is close to the heading, or loosely
// close and close to stock product copy. Set on 24 hand-labelled pairs and checked on 24 held out
// (docs/briefs/rule-packs.md §4h): 23 of 24 and 24 of 24, no false hits.
export const MEANING_CUTS = { echo: 0.45, near: 0.2, stock: 0.4 };
// close: the line's similarity to its heading; stocky: its highest similarity to a stock line
export const meaningSaid = (close, stocky) => close >= MEANING_CUTS.echo || (close >= MEANING_CUTS.near && stocky >= MEANING_CUTS.stock);
export const STOCK_LINES = ['Everything you need to stay organized.', 'Powerful tools to help you grow.', 'Track and manage your work with ease.', 'Stay connected with your team.', 'Simple, fast, and secure.', 'Get started in minutes.', 'Take control of your workflow.', 'Insights that help you make better decisions.', 'Collaborate with anyone, anywhere.', 'Keep everything in sync.', 'Your all-in-one workspace.', 'Built for teams of every size.', "Discover what's possible.", 'Make the most of your time.', 'Find what you need, fast.', 'The smarter way to work.'];
const MONTH = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
export const hasSpecific = (line) => /\d|[$€£%]/.test(line) || MONTH.test(line) || /\b[A-Z]{2,}\b/.test(line.replace(/^\S+/, ''));

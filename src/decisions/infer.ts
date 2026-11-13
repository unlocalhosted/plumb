import type { Family } from '../report.js';
import type { StylesheetGraph } from '../collect/stylesheets.js';
import { cssCode } from '../collect/stylesheets.js';

// What kind of token a variable is, when its name doesn't follow Tailwind's prefixes (`--space-4`, `--pl-radius-card`,
// `--acme-text-body`). Decided deterministically from three signals, each worth points, and the reason is kept:
//   value  what it holds once resolved: a colour, a duration or an easing, a shadow, a font shorthand. Decisive when
//          it says one thing (3 points); a bare length says nothing on its own
//   use    the properties that read it with var() in the project's stylesheets: padding is spacing, border-radius a
//          corner (1 point a use, at most 3)
//   name   a word in it, after any prefix: space, gap, radius, corner, text, font, ease, shadow… (2 points)
// The highest total wins; a tie, or nothing at all, is no answer: the variable stays out of the system rather than be
// guessed into the wrong scale.

export interface Inferred { family: Family; why: string }
export type Uses = Map<string, Map<string, number>>;

const WORDS: [Family, RegExp][] = [
  ['spacing', /^(?:space|spacing|spacer|gap|gutter|pad|padding|inset|margin|stack|indent)$/],
  ['radius', /^(?:radius|radii|round|rounded|rounding|corner|corners)$/],
  ['type', /^(?:text|font|fonts|type|typography|leading|tracking|letter|fs|lh|weight)$/],
  ['motion', /^(?:ease|easing|duration|dur|delay|spring|motion|transition|stagger|timing)$/],
  ['elevation', /^(?:shadow|shadows|elevation|depth)$/],
  ['z', /^(?:z|zindex|layer|layers)$/],
  ['opacity', /^(?:opacity|alpha)$/],
  ['color', /^(?:color|colour|colors|colours|bg|fg|ink|palette|tint|hue)$/],
  ['size', /^(?:size|sizes|width|height|w|h|container|breakpoint|bp)$/],
];

const USES: [Family, RegExp][] = [
  ['spacing', /^(?:padding|margin|gap|row-gap|column-gap|inset|scroll-margin|scroll-padding|padding-[a-z-]+|margin-[a-z-]+|inset-[a-z-]+|top|right|bottom|left)$/],
  ['radius', /^(?:border-radius|border-[a-z]+-[a-z]+-radius)$/],
  ['type', /^(?:font|font-size|font-weight|font-family|line-height|letter-spacing)$/],
  ['motion', /^(?:transition|transition-duration|transition-timing-function|transition-delay|animation|animation-duration|animation-timing-function|animation-delay)$/],
  ['elevation', /^(?:box-shadow|text-shadow|filter)$/],
  ['z', /^z-index$/],
  ['opacity', /^opacity$/],
  ['color', /^(?:color|background|background-color|border-color|border-[a-z]+-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color)$/],
  ['size', /^(?:width|height|min-width|min-height|max-width|max-height|inline-size|block-size|flex-basis)$/],
];

const COLOUR = /^(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(.*\)|transparent|currentcolor|white|black)$/i;
const TIME = /^-?[\d.]+m?s$/;
const EASING = /^(?:cubic-bezier|linear|steps)\(.*\)$|^(?:ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/;
const SHADOW = /(?:^|\s)inset(?:\s|$)|-?[\d.]+px\s+-?[\d.]+px\s+-?[\d.]+px.*(?:#|rgb|hsl|oklch|oklab|color-mix|transparent)/i;
const FONT = /^(?:(?:normal|italic|bold|[1-9]00)\s+)+[\d.]+(?:px|rem|em)(?:\/[\d.]+(?:px|rem|em)?)?\s+\S|^(?:[\w-]+|"[^"]+"|'[^']+')(?:\s*,\s*(?:[\w-]+|"[^"]+"|'[^']+'))+$/;

/** What a value is on its own, when it says so plainly: a colour, a time or easing, a shadow, a font. */
export function byValue(value: string | undefined): Family | undefined {
  if (!value) return;
  const v = value.trim();
  if (COLOUR.test(v)) return 'color';
  if (TIME.test(v) || EASING.test(v)) return 'motion';
  if (SHADOW.test(v)) return 'elevation';
  if (FONT.test(v)) return 'type';
}

function byName(name: string): Family | undefined {
  for (const word of name.replace(/^--/, '').toLowerCase().split(/[-_]/)) for (const [family, words] of WORDS) if (words.test(word)) return family;
}

function byUse(prop: string): Family | undefined {
  for (const [family, props] of USES) if (props.test(prop)) return family;
}

/** For each variable, the properties that read it in the project's stylesheets, counted. */
export function variableUses(graph: StylesheetGraph): Uses {
  const uses: Uses = new Map();
  for (const sheet of graph.files.values()) {
    if (sheet.sourceOrigin !== 'project') continue;
    for (const match of cssCode(sheet.css).matchAll(/(?:^|[;{\s])([a-z][a-z-]*)\s*:\s*([^;{}]*var\(\s*--[^;{}]*)/g)) {
      const prop = match[1]!;
      if (prop.startsWith('--')) continue;
      for (const ref of match[2]!.matchAll(/var\(\s*(--[\w-]+)/g)) {
        const counts = uses.get(ref[1]!) ?? new Map<string, number>();
        counts.set(prop, (counts.get(prop) ?? 0) + 1);
        uses.set(ref[1]!, counts);
      }
    }
  }
  return uses;
}

/** The kind of token a variable is, and why; undefined when the signals are silent or tied. */
export function inferFamily(name: string, resolved: string | undefined, uses: Uses): Inferred | undefined {
  const score = new Map<Family, number>(), why = new Map<Family, string[]>();
  const give = (family: Family, points: number, reason: string) => { score.set(family, (score.get(family) ?? 0) + points); why.set(family, [...why.get(family) ?? [], reason]); };
  const value = byValue(resolved);
  if (value) give(value, 3, `its value is ${value === 'color' ? 'a colour' : value === 'motion' ? 'a time or an easing' : value === 'elevation' ? 'a shadow' : 'a font'}`);
  const used = new Map<Family, number>();
  for (const [prop, n] of uses.get(name) ?? []) { const family = byUse(prop); if (family) used.set(family, (used.get(family) ?? 0) + n); }
  for (const [family, n] of used) give(family, Math.min(3, n), `used in ${[...uses.get(name)!].filter(([prop]) => byUse(prop) === family).map(([prop]) => prop).join(', ')} ${n === 1 ? 'once' : `${n} times`}`);
  const named = byName(name);
  if (named) give(named, 2, `its name says ${named}`);
  const ranked = [...score].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[1]?.[1] === ranked[0]![1]) return;
  const family = ranked[0]![0];
  return { family, why: why.get(family)!.join('; ') };
}

import { oklab } from '../rules/families.js';
import type { Lab } from '../rules/families.js';

/** docs/briefs/onboarding.md section 2.3, "Name". Names are deterministic and never clever. */

const shirtMedium = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
const shirtType = ['3xs', '2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
const timing = ['fastest', 'faster', 'fast', 'base', 'slow', 'slower', 'slowest'] as const;
const elevation: Record<number, readonly string[]> = {
  1: ['md'], 2: ['sm', 'lg'], 3: ['sm', 'md', 'lg'], 4: ['xs', 'sm', 'md', 'lg'], 5: ['xs', 'sm', 'md', 'lg', 'xl'], 6: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
};

/** A number as it reads in a name: no trailing zeros, no exponent. */
export const compact = (value: number): string => String(Number(value.toFixed(4)));

/**
 * Names for an ordered ladder, centred on the step at `centre`. Seven steps or fewer get t-shirt sizes (type: up to
 * ten, centred on `base`); otherwise, or when the centre leaves too few names on one side, every step is named by its
 * own value.
 */
export function ladderNames(prefix: string, amounts: number[], centre: number, kind: 'medium' | 'type' = 'medium'): string[] {
  const sizes = kind === 'type' ? shirtType : shirtMedium;
  const middle = kind === 'type' ? 4 : 4;
  const below = centre, above = amounts.length - 1 - centre;
  if (amounts.length <= (kind === 'type' ? 10 : 7) && below <= middle && above <= sizes.length - 1 - middle) {
    return amounts.map((_, index) => `${prefix}-${sizes[middle + index - centre]}`);
  }
  return amounts.map(amount => `${prefix}-${compact(amount)}`);
}

/** Durations: fast, base, slow around the most used one; by milliseconds when there are too many. */
export function durationNames(amounts: number[], centre: number): string[] {
  if (amounts.length <= 7 && centre <= 3 && amounts.length - 1 - centre <= 3) return amounts.map((_, index) => `--duration-${timing[3 + index - centre]}`);
  return amounts.map(amount => `--duration-${compact(amount)}`);
}

/** Shadows by blur rank: sm, md, lg. */
export function shadowNames(count: number): string[] {
  const sizes = elevation[count];
  return sizes ? sizes.map(size => `--shadow-${size}`) : Array.from({ length: count }, (_, index) => `--shadow-${index + 1}`);
}

/** Twelve hue names, centred where OKLCH puts them. Neutrals are gray. */
const hues: [string, number][] = [['red', 25], ['orange', 55], ['amber', 85], ['yellow', 105], ['lime', 130], ['green', 150], ['teal', 180], ['cyan', 210], ['blue', 255], ['indigo', 280], ['purple', 310], ['pink', 350]];
export function hueName(lab: Lab): string {
  const chroma = Math.hypot(lab[1], lab[2]);
  if (chroma < 0.025) return 'gray';
  const angle = (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360;
  let best = hues[0]![0], distance = Infinity;
  for (const [name, centre] of hues) {
    const gap = Math.min(Math.abs(angle - centre), 360 - Math.abs(angle - centre));
    if (gap < distance) { distance = gap; best = name; }
  }
  return best;
}
export const labOf = (value: string): Lab | undefined => oklab(value);

/** Plain labels for the properties a token is used by. */
const propLabels: [RegExp, string][] = [
  [/^(?:padding|scroll-padding)/, 'padding'], [/^(?:margin|scroll-margin)/, 'margin'], [/^(?:gap|row-gap|column-gap)$/, 'gap'],
  [/^(?:top|right|bottom|left|inset)/, 'position'], [/^font-size$/, 'text size'], [/^line-height$/, 'line height'], [/^letter-spacing$/, 'letter spacing'],
  [/^color$/, 'text colour'], [/^background/, 'background'], [/^(?:border|outline|column-rule)/, 'borders'], [/^(?:fill|stroke)$/, 'icons'],
  [/^(?:box|text)-shadow$/, 'shadows'], [/radius/, 'corners'], [/^z-index$/, 'stacking'], [/^transition|^animation/, 'motion'],
];
export function propLabel(prop: string): string {
  return propLabels.find(([pattern]) => pattern.test(prop))?.[1] ?? prop;
}

/** The factual sentence behind a token, from evidence, marked as drafted (decided 2026-10-14). */
export function draftedWhy(props: string[], sites: number, files: number, examples: string[] = []): string {
  const labels = [...new Set(props.map(propLabel))].slice(0, 2);
  const used = labels.length ? `Used by ${labels.join(' and ')} at ` : 'Used at ';
  // A few places read better as the places themselves; many read as a count.
  if (sites <= 3 && examples.length === sites) return `${used}${examples.join(sites === 2 ? ' and ' : ', ')} (drafted)`;
  return `${used}${sites} places in ${files} ${files === 1 ? 'file' : 'files'} (drafted)`;
}

import { colorDistance, oklab } from './families.js';
import type { Decision } from '../report.js';

const colorPrefixes = new Set(['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'outline', 'divide', 'accent', 'caret', 'decoration']);
const spacingPrefixes = new Set(['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'gap', 'gap-x', 'gap-y', 'space-x', 'space-y', 'w', 'h', 'size', 'inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'min-w', 'min-h', 'max-w', 'max-h']);
const split = (token: string): { variants: string; base: string } => {
  const at = token.includes('[') ? -1 : token.lastIndexOf(':');
  return { variants: token.slice(0, at + 1), base: token.slice(at + 1) };
};
const pixels = (value: string | undefined): number | undefined => {
  const match = value?.trim().match(/^(-?[\d.]+)(px|rem)$/);
  return match ? Number(match[1]) * (match[2] === 'rem' ? 16 : 1) : undefined;
};

/**
 * A dead utility whose intended value is knowable (`bg-white` is #fff, `p-4` is 16px on Tailwind's default
 * scale) is answered with the project's tokens nearest by VALUE in the same family, not by spelling.
 * Undefined when the value is unknowable or the project has nothing comparable: the caller falls back to names.
 */
export function valueSuggestions(token: string, decisions: readonly Decision[], theme: ReadonlySet<string>): string[] | undefined {
  const { variants, base: raw } = split(token);
  const important = raw.startsWith('!') ? '!' : '', stripped = raw.replace(/^!/, '');
  const [body = '', opacity] = stripped.split('/', 2) as [string, string | undefined];
  const cut = body.lastIndexOf('-');
  if (cut < 1) return;
  const prefix = body.slice(0, cut), name = body.slice(cut + 1);
  const own = (family: Decision['family'], namespace: string) => decisions.filter(item => item.family === family && item.origin !== 'framework' && item.name.startsWith(namespace) && theme.has(item.name));
  const ranked: { name: string; distance: number }[] = [];
  if (colorPrefixes.has(prefix) && /^[a-z]+$/.test(name)) {
    const wanted = oklab(name);
    if (!wanted || /^(?:currentcolor|transparent|inherit|initial|unset|none|revert)$/i.test(name)) return;
    for (const item of own('color', '--color-')) {
      const lab = oklab(item.resolved ?? item.value);
      if (lab) ranked.push({ name: `${prefix}-${item.name.slice('--color-'.length)}`, distance: colorDistance(wanted, lab) });
    }
  } else if (spacingPrefixes.has(prefix) && /^\d+(?:\.\d+)?$/.test(name)) {
    // Tailwind's default step is 0.25rem; this class is dead because the project dropped that scale.
    const wanted = Number(name) * 4;
    for (const item of own('spacing', '--spacing-')) {
      const px = pixels(item.resolved ?? item.value);
      if (px !== undefined) ranked.push({ name: `${prefix}-${item.name.slice('--spacing-'.length)}`, distance: Math.abs(px - wanted) });
    }
  } else return;
  const picked = [...new Map(ranked.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name)).map(item => [item.name, item])).keys()].slice(0, 2);
  return picked.length ? picked.map(item => `${variants}${important}${item}${opacity === undefined ? '' : `/${opacity}`}`) : undefined;
}

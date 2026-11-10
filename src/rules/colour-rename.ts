/**
 * Renaming a project's colour tokens (docs/design/token-spec.md §3.3): every use of an old name in one file's text
 * becomes the new name. Pure over the text and the map; same in → same out.
 *
 * Two shapes are renamed, and nothing else:
 *   a utility class   `text-fg`, `hover:bg-surface-hover`, `border-t-line/50`, `ring-accent` → its prefix and variants
 *                     kept, the token part renamed (`text-text-primary`, `hover:bg-background-primary-hover` …)
 *   the CSS variable  `--color-fg` (the theme's declaration, and any `var(--color-fg)`) → `--color-text-primary`
 * A name is matched whole: `line` never touches `line-strong` or `outline`, and a longer old name is tried first.
 */

/** the utility prefixes that take a colour token */
const PREFIX = '(?:text|bg|border(?:-[trblxyse])?|fill|stroke|ring|ring-offset|outline|divide|from|to|via|decoration|caret|placeholder|accent|shadow|inset-shadow|inset-ring)';
const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface RenameCount { uses: number; byName: Record<string, number> }

export function validRenameMap(map: unknown): string | null {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return 'A rename is a map of old names to new names.';
  const entries = Object.entries(map as Record<string, unknown>);
  if (!entries.length || entries.length > 200) return 'A rename has between one and two hundred names.';
  for (const [from, to] of entries) {
    if (!NAME.test(from) || typeof to !== 'string' || !NAME.test(to)) return `${from} → ${String(to)}: names are lowercase words joined by hyphens.`;
    if (from === to) return `${from} is renamed to itself.`;
  }
  const targets = entries.map(([, to]) => to as string);
  if (new Set(targets).size !== targets.length) return 'Two old names cannot take the same new name.';
  return null;
}

export function renameInText(text: string, map: Record<string, string>): { text: string; count: RenameCount } {
  const olds = Object.keys(map).sort((a, b) => b.length - a.length || a.localeCompare(b));
  const alt = olds.map(o => o.replace(/-/g, '\\-')).join('|');
  const byName: Record<string, number> = {};
  const hit = (old: string) => { byName[old] = (byName[old] ?? 0) + 1; };
  let next = text.replace(new RegExp(`(?<![\\w-])(${PREFIX})-(${alt})(?![\\w-])`, 'g'), (_m, pre: string, old: string) => { hit(old); return `${pre}-${map[old]}`; });
  next = next.replace(new RegExp(`--color-(${alt})(?![\\w-])`, 'g'), (_m, old: string) => { hit(old); return `--color-${map[old]}`; });
  return { text: next, count: { uses: Object.values(byName).reduce((n, v) => n + v, 0), byName } };
}

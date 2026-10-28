import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { packageManagerOf, reactOf, stylingOf, tailwindInstalled } from './project-facts/index.js';
import type { PackageManager } from './project-facts/index.js';
import { UsageError, userMessage } from './errors.js';
import type { ClassSite } from './collect/classes.js';

interface PackageMetadata {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: unknown;
}
export async function packageMetadata(root: string): Promise<PackageMetadata> {
  try {
    const metadata: unknown = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new SyntaxError('Expected an object');
    return metadata as PackageMetadata;
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new UsageError(`Could not read package.json at ${root}.\n  ${error instanceof SyntaxError ? 'The file is not valid JSON.' : userMessage(error)}\n  → plumber doctor --root ${JSON.stringify(root)}`);
  }
}
/** The installed Tailwind version at a folder, from the styling detector's one resolve. */
export async function resolvedTailwind(root: string): Promise<string | null> {
  const installed = tailwindInstalled(root);
  if (installed instanceof Error) throw (installed as NodeJS.ErrnoException).code ? installed : new UsageError(`${installed.message}\n  → ${packageManager(root)} install`);
  return installed;
}
/** The `packageManager` fact's value, for install hints. */
export const packageManager = (root: string): PackageManager => packageManagerOf(root).value!;
export async function tailwindSetupProblem(root: string, entry: string | null, version: string | null): Promise<string | null> {
  const metadata = await packageMetadata(root);
  const declared = metadata.dependencies?.tailwindcss ?? metadata.devDependencies?.tailwindcss ?? metadata.peerDependencies?.tailwindcss;
  if (!entry && !declared) return null;
  version ??= await resolvedTailwind(entry ? dirname(entry) : root);
  if (!version) return `${declared ? `Tailwind ${declared.match(/\d+/)?.[0] ?? '4'} is in package.json but not installed.` : 'Tailwind is not installed.'}\n  → ${packageManager(root)} install`;
  if (!version.startsWith('4.')) return `React Plumber needs Tailwind 4; this project has ${version}.\n  → upgrade: npx @tailwindcss/upgrade   (https://tailwindcss.com/docs/upgrade-guide)`;
  return null;
}

/** Recognise utility syntax only in React apps with no Tailwind declaration/entry: the `plain-css` styling entry. */
export async function checkingPlainCss(root: string, entry: string | null): Promise<boolean> {
  if (entry) return false;
  const styling = stylingOf(root).value;
  return !!styling?.systems.some(item => item.id === 'plain-css') && !styling.systems.some(item => item.id === 'tailwind');
}
export function looksLikeTailwind(token: string): boolean {
  const base = token.split(/:(?![^\[]*\])/).at(-1)!.replace(/^!|!$/g, '');
  return /^(?:flex|inline-flex|block|inline-block|inline|grid|inline-grid|hidden|contents|absolute|relative|fixed|sticky|static|truncate|antialiased|italic|not-italic|sr-only|not-sr-only)$/.test(base) ||
    /^-?(?:p[xysetrbl]?|m[xysetrbl]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|w|min-w|max-w|h|min-h|max-h|size|bg|text|font|leading|tracking|rounded(?:-[\w]+)?|border(?:-[xysetrbl])?|shadow|ring|outline|opacity|z|duration|delay|ease|transition|animate|translate-[xy]|rotate|scale|items|justify|content|self|place-items|overflow(?:-[xy])?|object|cursor|select|pointer-events|fill|stroke|col|row|grid-cols|grid-rows|flex|basis|grow|shrink)-.+$/.test(base) || /^\[[\w-]+:.+\]$/.test(base);
}
export function tailwindAdvisory(sites: readonly ClassSite[], manager: string): string {
  const classes = [...new Set(sites.filter(site => !site.opaque && looksLikeTailwind(site.token)).map(site => site.token))];
  if (!classes.length) return '';
  return `! These classes look like Tailwind, but Tailwind isn't set up: ${classes.slice(0, 3).join(', ')}${classes.length > 3 ? ` (+${classes.length - 3} more)` : ''}.\n` +
    `  → ${manager} ${manager === 'npm' ? 'install' : 'add'} tailwindcss @tailwindcss/vite, then @import "tailwindcss"; in your CSS entry\n  Checking plain CSS only for now.\n`;
}
export const reactOverlayFix = 'Add React to this development project to read and write source with the overlay. Plain CSS checks work without React.';
export function overlaySetupNotice(root: string): string {
  const react = reactOf(root);
  if (react.value?.installed) return '';
  if (react.evidence[0] && /^react: (?!.*not installed)/.test(react.evidence[0].text) && react.source === 'declared') throw new Error(react.evidence[0].text.replace(/^react: /, ''));
  return `React is not installed. ${reactOverlayFix}\n\n`;
}

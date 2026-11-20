/**
 * The project's style systems, asked in turn (systems.ts says what one is). The first that can place a property from
 * the page's evidence writes it. Today: utility classes and rules in plain stylesheets. Inline style, CSS modules, Sass
 * and the rest join as one object each.
 */
import { parseCss } from '../lower/css.js';
import { classes } from './classes.js';
import { PROPERTIES } from './properties.js';
import { rules } from './rules.js';
import { sass } from './sass.js';
import type { Evidence, Origin, StyleContext, StyleSystem } from './systems.js';

export type { Change, ClassPlace, Edit, Evidence, Origin, ReadFile, StyleContext, StyleSystem } from './systems.js';
export { PROPERTIES };

export const SYSTEMS: StyleSystem[] = [classes, rules, sass];

export async function locateStyle(evidence: Evidence, prop: string, ctx: StyleContext, systems = SYSTEMS): Promise<{ system: StyleSystem; origin: Origin } | null> {
  for (const system of systems) {
    const origin = await system.locate(evidence, prop, ctx);
    if (origin) return { system, origin };
  }
  return null;
}

/** A value that may stand in a declaration: no way out of it, nothing fetched, brackets balanced, one line. */
export function cssValueSafe(value: string): boolean {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[;{}<>"'`\\\n\r]|\/\*|\*\/|url\(|@import|expression\(|!important/i.test(value)) return false;
  let depth = 0;
  for (const c of value) { if (c === '(') depth++; else if (c === ')' && --depth < 0) return false; }
  return depth === 0;
}

/** How many problems Lightning CSS reports reading a stylesheet: a write may not add one. */
export function cssErrors(css: string, file: string): number {
  let count = 0;
  try { parseCss(css, file, () => { count++; }); } catch { return Number.MAX_SAFE_INTEGER; }
  return count;
}

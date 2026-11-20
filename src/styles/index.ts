/**
 * The project's style systems, asked in turn (systems.ts says what one is). The first that can place a property from
 * the page's evidence writes it. Today: rules in plain stylesheets. Classes, inline style, CSS modules and the rest join
 * as one object each.
 */
import { parseCss } from '../lower/css.js';
import { rules } from './rules.js';
import type { Evidence, Origin, ReadFile, StyleSystem } from './systems.js';

export type { Change, Edit, Evidence, Origin, ReadFile, StyleSystem } from './systems.js';

export const SYSTEMS: StyleSystem[] = [rules];

export async function locateStyle(evidence: Evidence, prop: string, read: ReadFile, systems = SYSTEMS): Promise<{ system: StyleSystem; origin: Origin } | null> {
  for (const system of systems) {
    const origin = await system.locate(evidence, prop, read);
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

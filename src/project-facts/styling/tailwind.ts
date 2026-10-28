import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Context, Detector } from '../detector.js';
import { lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Detected } from '../support.js';

const installs = new Map<string, { at: number; version: string | null | Error }>();
/** One `require.resolve('tailwindcss/package.json')` from a folder, memoised briefly: what actually runs there. */
export function tailwindInstalled(folder: string): string | null | Error {
  const entry = installs.get(folder);
  if (entry && Date.now() - entry.at < 2000) return entry.version;
  let version: string | null | Error;
  try {
    const file = createRequire(join(folder, 'package.json')).resolve('tailwindcss/package.json');
    const metadata = JSON.parse(readFileSync(file, 'utf8')) as { version?: unknown };
    version = typeof metadata.version === 'string' ? metadata.version : new Error(`Tailwind package.json has no version (${file}).`);
  } catch (error) {
    version = (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' ? null : error as Error;
  }
  installs.set(folder, { at: Date.now(), version });
  return version;
}

export const tailwindImport = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']/;

/**
 * Tailwind: the installed version (what runs) beats the declared range (owner decision 1). v4 is judged; v3 and a
 * declared-but-missing install are found and refused with the step out.
 */
export const stylingTailwind: Detector = {
  id: 'styling.tailwind', reads: ['package.json', 'node_modules/tailwindcss/package.json'],
  detect(ctx: Context) {
    const declared = ctx.dependencies().tailwindcss ?? null;
    const installed = tailwindInstalled(ctx.root);
    const entry = ctx.cssFiles?.find(file => { const text = ctx.read(file); return typeof text === 'string' && tailwindImport.test(text.replace(/\/\*[\s\S]*?\*\//g, '')); });
    if (declared === null && installed === null && !entry) return {};
    const evidence = [];
    if (declared !== null) evidence.push(ctx.evidence('package.json', lineOf(ctx.read('package.json') as string, /"tailwindcss"\s*:/), `tailwindcss: ${declared}`));
    if (entry) evidence.push(ctx.evidence(entry, lineOf(ctx.read(entry) as string, tailwindImport), '@import "tailwindcss"'));
    if (typeof installed === 'string') evidence.push(ctx.evidence('node_modules/tailwindcss/package.json', 1, `installed ${installed}`));
    if (installed instanceof Error) evidence.push(ctx.evidence('node_modules/tailwindcss/package.json', 1, installed.message));
    const major = typeof installed === 'string' ? Number(installed.split('.')[0]) : declared?.match(/\d+/) ? Number(declared.match(/\d+/)![0]) : null;
    const detail = { major, installed: typeof installed === 'string' ? installed : null, declared, entry: entry ?? null };
    const base = { id: 'tailwind', label: `Tailwind ${major ?? ''}`.trim(), source: typeof installed === 'string' ? 'observed' as const : 'declared' as const, evidence, detail };
    const item: Detected = installed === null && (declared !== null || entry)
      ? { ...base, support: 'unsupported', skipped: 'declared but not installed', next: 'install the project dependencies' }
      : major !== null && major < 4
        ? { ...base, support: 'unsupported', skipped: `Tailwind ${major}; plumb judges Tailwind 4`, next: 'npx @tailwindcss/upgrade' }
        : { ...base, support: 'supported' };
    return { styling: [claim<Detected>(item, item.source, evidence, this.id)] };
  },
};

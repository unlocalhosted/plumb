import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { appTailwindEntry } from './collect/entries.js';
import { unreadable } from './diagnostics.js';
import type { Finding } from './report.js';
import { matchesPath } from './collect/pattern.js';
import { glob } from 'tinyglobby';
import { errorMessage, UsageError } from './errors.js';
import type { PlumbConfig } from './config.js';
import type { FileCounts, Report } from './report.js';

export const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.git/**'];
export const defaultSource = ['src/**/*.{tsx,jsx,ts,js,css}', 'app/**/*.{tsx,jsx,ts,js,css}'];
const tailwindImport = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']/;

/** Warm hosts already own membership; filter their retained names instead of crawling again. */
export async function matchProjectFiles(root: string, patterns: string | string[], known?: readonly string[]): Promise<string[]> {
  if (!known) return glob(patterns, { cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false });
  const selectors = typeof patterns === 'string' ? [patterns] : patterns;
  const positive = selectors.filter(pattern => !pattern.startsWith('!')), negative = selectors.filter(pattern => pattern.startsWith('!')).map(pattern => pattern.slice(1));
  const matches = known.filter(file => {
    const path = relative(root, file);
    const matches = (pattern: string) => matchesPath(isAbsolute(pattern) ? file : path, pattern) || matchesPath(isAbsolute(pattern) ? file : path, pattern + '/**');
    return !ignore.some(pattern => matchesPath(path, pattern)) && positive.some(matches) && !negative.some(matches);
  });
  // A changed config can introduce an external source location before its
  // worker has published those locations to the Session. Discover that bounded
  // input once; never fall back to a whole-project source inventory.
  const external = selectors.filter(pattern => { const path = relative(root, resolve(root, pattern)); return path === '..' || path.startsWith('..' + sep) || isAbsolute(path); });
  if (external.length) matches.push(...await glob(external, { cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false }));
  return [...new Set(matches)];
}
async function entryCss(root: string, diagnostics: Finding[], inputs: string[], css?: string, known?: readonly string[]): Promise<string | null> {
  if (css !== undefined) {
    const path = resolve(root, css);
    try {
      if (extname(path) !== '.css' || !(await stat(path)).isFile()) {
        throw new Error('expected a .css file');
      }
      await readFile(path, 'utf8');
    } catch (error) {
      throw new UsageError(`Set css to a readable .css file in plumb.config.ts: ${path}: ${errorMessage(error)}`);
    }
    return path;
  }
  const candidates: string[] = [];
  const files = await matchProjectFiles(root, '**/*.css', known);
  for (const file of files.sort()) {
    try {
      const css = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
      if (tailwindImport.test(css)) candidates.push(file);
    } catch (error) { diagnostics.push(unreadable(file, file, error)); }
  }
  if (candidates.length > 1) {
    inputs.push(...candidates);
    const entry = await appTailwindEntry(root, candidates, diagnostics, inputs);
    if (entry) return entry;
    throw new UsageError(`Multiple Tailwind entry files: ${candidates.join(', ')}; set css in plumb.config.ts to one of them.`);
  }
  return candidates[0] ?? null;
}

async function tailwindVersion(entry: string | null): Promise<string | null> {
  if (entry === null) return null;
  const require = createRequire(resolve(dirname(entry), 'package.json'));
  let packagePath: string;
  try {
    packagePath = require.resolve('tailwindcss/package.json');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
  const metadata: unknown = JSON.parse(await readFile(packagePath, 'utf8'));
  if (metadata === null || typeof metadata !== 'object' || !('version' in metadata) || typeof metadata.version !== 'string') {
    throw new UsageError(`Fix tailwindcss/package.json at ${packagePath}: version must be a string.`);
  }
  return metadata.version;
}

export async function discoverProject(root: string, config: PlumbConfig, known?: readonly string[]): Promise<{
  diagnostics: Finding[]; inputs: string[]; tailwind: Report['tailwind']; files: FileCounts;
}> {
  const diagnostics: Finding[] = [], inputs: string[] = [];
  const entry = await entryCss(root, diagnostics, inputs, config.css, known);
  const files = await matchProjectFiles(root, config.source ?? defaultSource, known);
  const counts: FileCounts = { tsx: 0, jsx: 0, css: 0, other: 0 };
  for (const file of files) {
    const extension = extname(file).slice(1);
    if (extension === 'tsx' || extension === 'jsx' || extension === 'css') counts[extension]++;
    else counts.other++;
  }
  return { diagnostics, inputs: [...new Set(inputs)], tailwind: { entry, version: await tailwindVersion(entry) }, files: counts };
}

export async function projectSourceFiles(root: string, config: PlumbConfig, known?: readonly string[]): Promise<string[]> {
  return (await matchProjectFiles(root, config.source ?? defaultSource, known)).sort();
}

export async function sourceFiles(root: string, config: PlumbConfig): Promise<string[]> {
  return (await projectSourceFiles(root, config)).filter(file => /\.[jt]sx?$/.test(file));
}

import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { errorMessage, UsageError } from './errors.js';
import type { PlumbConfig } from './config.js';
import type { FileCounts, Report } from './report.js';

const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.git/**'];
const defaultSource = ['src/**/*.{tsx,jsx,ts,js,css}', 'app/**/*.{tsx,jsx,ts,js,css}'];
const tailwindImport = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']/;

async function entryCss(root: string, css?: string): Promise<string | null> {
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
  const files = await glob('**/*.css', { cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false });
  for (const file of files.sort()) {
    const css = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    if (tailwindImport.test(css)) candidates.push(file);
  }
  if (candidates.length > 1) {
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

export async function discoverProject(root: string, config: PlumbConfig): Promise<{
  tailwind: Report['tailwind']; files: FileCounts;
}> {
  const entry = await entryCss(root, config.css);
  const files = await glob(config.source ?? defaultSource, {
    cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false,
  });
  const counts: FileCounts = { tsx: 0, jsx: 0, css: 0, other: 0 };
  for (const file of files) {
    const extension = extname(file).slice(1);
    if (extension === 'tsx' || extension === 'jsx' || extension === 'css') counts[extension]++;
    else counts.other++;
  }
  return { tailwind: { entry, version: await tailwindVersion(entry) }, files: counts };
}

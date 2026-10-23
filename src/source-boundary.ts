import { existsSync, readFileSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import { UsageError } from './errors.js';

/** Nearest declared workspace wins; otherwise the Git checkout bounds shared source. */
export function sourceBoundary(root: string): string {
  for (let at = resolve(root);; at = dirname(at)) {
    if (existsSync(join(at, 'pnpm-workspace.yaml'))) return at;
    try { if (JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')).workspaces) return at; } catch {}
    if (existsSync(join(at, '.git'))) return at;
    if (dirname(at) === at) return resolve(root);
  }
}
export function containsPath(root: string, file: string): boolean {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path);
}
/** Interpret Windows separators before containment, including on a POSIX host. */
export function sourcePath(root: string, file: string): string {
  if (sep !== '\\' && (win32.isAbsolute(file) && !file.startsWith('/') || /^[a-z]:/i.test(file))) throw new UsageError('Source path must be inside the repository/workspace root.');
  return resolve(root, file.replaceAll('\\', '/'));
}
export function sourceSelectors(root: string, patterns: string[]): string[] {
  const boundary = sourceBoundary(root);
  return patterns.map(selector => {
    const negative = selector.startsWith('!'), pattern = (negative ? selector.slice(1) : selector).replaceAll('\\', '/');
    // Glob expansion can descend but may never climb back out of its static root.
    const segments = pattern.split('/'), magic = segments.findIndex(segment => /[*?{[(!]/.test(segment));
    const base = magic < 0 ? pattern : segments.slice(0, magic).join('/') || '.';
    if (magic >= 0 && segments.slice(magic).includes('..') || !containsPath(boundary, sourcePath(root, base))) {
      throw new UsageError(`Source glob ${selector} must stay inside the repository/workspace root (${boundary}).`);
    }
    return (negative ? '!' : '') + pattern;
  });
}
/** Lexical membership never grants access through a symlink. */
export async function ownSourcePath(root: string, file: string): Promise<boolean> {
  if (!containsPath(sourceBoundary(root), file)) return false;
  try { return await realpath(file) === resolve(await realpath(root), relative(root, file)); }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return false; throw error; }
}

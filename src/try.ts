import { isAbsolute, matchesGlob, relative, resolve } from 'node:path';
import { parseSync } from 'oxc-parser';
import type { PlumbConfig } from './config.js';
import { UsageError } from './errors.js';
import { defaultSource, ignore } from './project.js';

export interface TryOptions { root?: string; config?: string; as?: string; lang?: 'tsx' | 'css'; verbose?: boolean }
export interface Snippet { text: string; as?: string; lang?: 'tsx' | 'css' }

export function prepareSnippet(root: string, config: PlumbConfig, snippet: Snippet): { file: string; text: string; lang: 'tsx' | 'css' } {
  // Prefer actual TSX syntax over heuristics involving ':' or '{' (style objects).
  const lang = snippet.lang ?? (snippet.as?.endsWith('.css') ? 'css' : snippet.as && /\.[jt]sx?$/.test(snippet.as) ? 'tsx' :
    parseSync('__plumb_try__.tsx', snippet.text).errors.length ? 'css' : 'tsx');
  const file = resolve(root, snippet.as ?? 'src/__plumb_try__.tsx');
  const path = relative(root, file);
  const patterns = config.source ?? defaultSource;
  const matches = (pattern: string) => matchesGlob(isAbsolute(pattern) ? file : path, pattern);
  if (!path || path.startsWith('../') || isAbsolute(path) || ignore.some(pattern => matchesGlob(path, pattern)) ||
      !patterns.filter(pattern => !pattern.startsWith('!')).some(matches) || patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1)))) {
    throw new UsageError('--as must name a file inside the project source globs; set --as to a matching path.');
  }
  if (config.css && file === resolve(root, config.css)) throw new UsageError('--as must name a new source file, not the Tailwind entry.');
  // --lang controls parsing even when a CSS snippet uses the default .tsx identity.
  if (lang === 'tsx' && !/\.[jt]sx?$/.test(file)) throw new UsageError('TSX snippets need a .tsx/.jsx/.ts/.js --as path.');
  if (lang === 'tsx') {
    const parsed = parseSync(file, snippet.text);
    if (parsed.errors.length) throw new UsageError(`Fix source ${file}: ${parsed.errors[0]?.message}`);
  }
  return { file, text: snippet.text, lang };
}

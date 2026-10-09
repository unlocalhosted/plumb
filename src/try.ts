import { isAbsolute, matchesGlob, relative, resolve } from 'node:path';
import { parseSync } from 'oxc-parser';
import type { PlumbConfig } from './config.js';
import { UsageError } from './errors.js';
import { defaultSource, ignore } from './project.js';
import type { Report } from './report.js';

export interface TryOptions { root?: string; config?: string; as?: string; lang?: 'tsx' | 'css' }
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
  return { file, text: snippet.text, lang };
}

/** Small try-only surface; Layer 9 owns full-project agent reporting. */
export function formatTryAgent(report: Report): string {
  if (!report.findings.length) return '0 new\n';
  return report.findings.map((finding, index) => `## ${index + 1} of ${report.findings.length}  ${finding.rule}\n` +
    `Sites: ${finding.sites.map(site => `${relative(report.root, site.file)}:${site.line}:${site.column}`).join(', ')}\n` +
    `Compiles to: ${finding.declaration.prop}: ${finding.declaration.resolved ?? finding.declaration.value}\n` +
    `Decisions: ${finding.decisions.map(d => `${d.name} (${d.resolved ?? d.value})${d.why ? ` "${d.why}"` : ''}`).join(', ') || 'none'}\n` +
    `Why: ${finding.why}\nEdit: ${finding.fix}\n`).join('\n') +
    '\nRe-run plumb try after editing. If no decision fits, report NEEDS-DECISION; do not grow the config, theme or ledger.\n';
}

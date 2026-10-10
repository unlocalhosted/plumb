import { errorMessage } from './errors.js';
import { makeFinding } from './messages.js';
import type { Finding, Site } from './report.js';

/** Incomplete evidence is visible, but never changes the check's exit status. */
export function unreadable(file: string, item: string, error: unknown, line = 1, column = 1): Finding {
  return configDiagnostic('config/unreadable', { file, line, column, text: item },
    `Skipped ${item}`, errorMessage(error), 'Fix the unreadable item to include it in the next check.');
}

export function configDiagnostic(rule: string, site: Site, title: string, because: string, action: string): Finding {
  return makeFinding({ key: `${rule}:${site.file}:${site.text}`, rule, family: 'config', severity: 'info',
    title, because, action, sites: [site], decisions: [],
    declaration: { prop: 'config', value: site.text, refs: [], when: [], site,
      owner: { kind: 'element', name: 'config' }, origin: 'stylesheet' } });
}

export function uniqueDiagnostics(parts: Finding[][]): Finding[] {
  return [...new Map(parts.flat().map(finding => [finding.key, finding])).values()].sort((a, b) => a.key.localeCompare(b.key));
}

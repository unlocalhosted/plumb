import { relative } from 'node:path';
import type { Declaration, Finding, Report, Site } from '../report.js';

export const pathFor = (report: Report, file: string) => relative(report.root, file).replaceAll('\\', '/') || '.';
export function newSites(finding: Finding): Site[] {
  if (['ledger', 'decisions'].includes(finding.family) && finding.severity !== 'error') return [];
  return finding.sites.filter(site => (!site.ledger || site.ledger.status === 'new') && site.inScope !== false);
}
export function atSite(finding: Finding, site: Site): Declaration {
  return finding.occurrences?.find(d => d.site.file === site.file && d.site.line === site.line && d.site.column === site.column && d.site.text === site.text) ?? { ...finding.declaration, site };
}

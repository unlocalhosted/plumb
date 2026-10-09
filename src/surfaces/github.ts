import type { Report } from '../report.js';
import { newSites, pathFor } from './sites.js';

export interface SummarySection { title: string; lines: string[] }
const markdown = (s: string) => s.replace(/[\\`*_{}\[\]<>|]/g, '\\$&').replace(/[\r\n]/g, ' ');
const percent = (part: number, total: number) => total ? Math.round(part / total * 1000) / 10 : 0;
function siteCounts(report: Report): Map<string, number> {
  const counts = new Map<string, Set<string>>();
  for (const finding of report.findings.filter(f => !['ledger', 'decisions'].includes(f.family))) for (const site of finding.sites) {
    const key = site.ledger?.key ?? `${finding.rule}:${pathFor(report, site.file)}:${site.text}:${site.anchor ?? ''}`;
    const sites = counts.get(key) ?? new Set(); sites.add(`${site.line}:${site.column}:${site.text}`); counts.set(key, sites);
  }
  return new Map([...counts].map(([key, sites]) => [key, sites.size]));
}
/** Data first: callers can render the same sections in comments or step summaries. */
export function githubSummary(report: Report, base?: Report): SummarySection[] {
  const now = siteCounts(report);
  const fixed = base ? [...siteCounts(base)].reduce((n, [key, count]) => n + Math.max(0, count - (now.get(key) ?? 0)), 0) : report.ledger?.stale ?? 0;
  const sections: SummarySection[] = [{ title: 'Plumb', lines: [`${report.ledger?.new ?? report.findings.reduce((n, f) => n + newSites(f).length, 0)} new, ${fixed} fixed, ${report.ledger?.debt ?? 0} debt, ${report.ledger?.exceptions ?? 0} exceptions.`] }];
  const coverage: string[] = [];
  for (const [family, value] of Object.entries(report.coverage)) {
    if (!('fromDecisions' in value)) continue;
    const governed = report.decisions.some(d => d.family === family && d.origin !== 'framework');
    if (!governed) { coverage.push(`${family}: no decisions.`); continue; }
    const share = percent(value.fromDecisions, value.total);
    const old = base?.coverage[family as keyof typeof base.coverage];
    const delta = old && 'fromDecisions' in old ? share - percent(old.fromDecisions, old.total) : undefined;
    coverage.push(`${family}: ${value.fromDecisions}/${value.total} (${share}%)${delta === undefined ? '' : `; ${delta >= 0 ? '+' : ''}${Math.round(delta * 10) / 10} pp vs base`}.`);
  }
  sections.push({ title: 'Coverage', lines: coverage });
  const growth = report.findings.filter(f => f.rule === 'ledger/grew');
  sections.push({ title: 'Ledger', lines: [`${report.ledger?.growth ?? 0} growth lines.`, ...growth.map(f => markdown(f.why))] });
  return sections;
}
export function renderSummary(sections: SummarySection[]): string {
  return sections.map(section => `## ${section.title}\n\n${section.lines.join('\n\n')}`).join('\n\n') + '\n';
}
const escapeData = (s: string) => s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (s: string) => escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');
export function githubCommands(report: Report): string {
  return report.findings.flatMap(finding => newSites(finding).map(site =>
    `::${finding.severity === 'error' ? 'error' : finding.severity === 'warn' ? 'warning' : 'notice'} file=${escapeProperty(pathFor(report, site.file))},line=${site.line},col=${site.column},title=${escapeProperty(finding.rule)}::${escapeData([finding.why, finding.fix].filter(Boolean).join(' '))}`)).join('\n');
}

import { count } from '../messages.js';
import type { Report } from '../report.js';
import { newSites, pathFor } from './sites.js';
import { touchesLine } from './changed-lines.js';
import type { LineScope } from './changed-lines.js';

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
export function githubSummary(report: Report, base?: Report, scope?: LineScope): SummarySection[] {
  const now = siteCounts(report);
  const fixed = base ? [...siteCounts(base)].reduce((n, [key, count]) => n + Math.max(0, count - (now.get(key) ?? 0)), 0) : report.ledger?.stale ?? 0;
  const sections: SummarySection[] = [{ title: 'React Plumber', lines: [`${report.ledger?.new ?? report.findings.reduce((n, f) => n + newSites(f).length, 0)} new, ${fixed} fixed, ${report.ledger?.debt ?? 0} debt, ${count(report.ledger?.exceptions ?? 0, 'exception')}.`] }];
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
  sections.push({ title: 'Ledger', lines: [`${count(report.ledger?.growth ?? 0, 'growth line')}.`, ...growth.map(f => markdown(f.title))] });
  const annotations = reviewAnnotations(report, scope);
  sections.push({ title: 'Review annotations', lines: [
    `New: ${annotations.filter(a => a.kind === 'new').length}.`,
    `Debt touched: ${annotations.filter(a => a.kind === 'debt').length}.`,
    `Exception touched: ${annotations.filter(a => a.kind === 'exception').length}.`,
  ] });
  return sections;
}
export function renderSummary(sections: SummarySection[]): string {
  return sections.map(section => `## ${section.title}\n\n${section.lines.join('\n\n')}`).join('\n\n') + '\n';
}
const escapeData = (s: string) => s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (s: string) => escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');
function reviewAnnotations(report: Report, scope?: LineScope) {
  return report.findings.flatMap(finding => {
    const fresh = new Set(newSites(finding));
    return finding.sites.flatMap(site => {
      if (!touchesLine(scope, site) || site.inScope === false) return [];
      const kind = site.ledger?.status ?? 'new';
      if (kind === 'new' && !fresh.has(site)) return [];
      // Notices require evidence that the accepted line was touched.
      if (kind !== 'new' && scope === undefined) return [];
      const title = finding.title;
      const level = kind !== 'new' ? 'notice' : finding.severity === 'error' ? 'error' : finding.severity === 'warn' ? 'warning' : 'notice';
      const context = kind === 'debt' ? `Debt touched: This changed line contains existing debt. Key: ${site.ledger!.key}.` :
        kind === 'exception' ? `Exception touched: This changed line has an accepted exception. Reason: ${site.ledger?.why || 'No reason recorded.'} Key: ${site.ledger!.key}.` : '';
      const message = [finding.because, finding.action ?? finding.fix, context].filter(Boolean).join(' ');
      return [{ kind, site, level, title, message }];
    });
  });
}
export function githubCommands(report: Report, scope?: LineScope): string {
  return reviewAnnotations(report, scope).map(({ site, level, title, message }) =>
    `::${level} file=${escapeProperty(pathFor(report, site.file))},line=${site.line},col=${site.column},title=${escapeProperty(title)}::${escapeData(message)}`).join('\n');
}

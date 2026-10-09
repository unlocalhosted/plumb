import { createHash } from 'node:crypto';
import type { Report } from '../report.js';
import { pathFor } from './sites.js';

/** One result per finding's authored site; grouping never hides baseline status. */
export function sarif(report: Report) {
  const rules = [...new Set(report.findings.map(f => f.rule))].sort().map(id => {
    const findings = report.findings.filter(f => f.rule === id);
    return { id, shortDescription: { text: id }, fullDescription: { text: [...new Set(findings.map(f => f.why))].join('\n') },
      help: { text: [...new Set(findings.map(f => `${f.why}\n${f.fix}`))].join('\n\n') } };
  });
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json', version: '2.1.0',
    runs: [{ tool: { driver: { name: report.tool.name, version: report.tool.version, rules } },
      columnKind: 'utf16CodeUnits',
      results: report.findings.flatMap(finding => finding.sites.map(site => ({
        ruleId: finding.rule, ruleIndex: rules.findIndex(rule => rule.id === finding.rule),
        level: finding.severity === 'warn' ? 'warning' : finding.severity === 'info' ? 'note' : 'error',
        message: { text: [finding.why, finding.fix].filter(Boolean).join('\n') },
        locations: [{ physicalLocation: { artifactLocation: { uri: pathFor(report, site.file).split('/').map(encodeURIComponent).join('/') },
          region: { startLine: site.line, startColumn: site.column } } }],
        baselineState: site.ledger && site.ledger.status !== 'new' ? 'unchanged' : 'new',
        partialFingerprints: { 'plumb/ledgerKey/v1': createHash('sha256').update(site.ledger?.key ?? finding.key).digest('hex') },
        properties: { ledgerKey: site.ledger?.key ?? finding.key, ledgerStatus: site.ledger?.status ?? 'new', inScope: site.inScope !== false },
      }))) }],
  };
}

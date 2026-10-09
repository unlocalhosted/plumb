import type { Report, Site } from '../report.js';
import { atSite, newSites, pathFor } from './sites.js';
import { editChoices, replacement } from './edits.js';

export const loopRules = [
  'Do not edit plumb.config.ts (or another Plumb config), .plumb/ledger.jsonl, or the theme to make a finding pass.',
  'Run `plumb check --changed --agent` after editing; stop when it prints "0 new".',
  'If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.',
  'Reporting NEEDS-DECISION is fine. Never add a token.',
];
export const renderLoop = () => `## Rules for this loop\n\n${loopRules.map(rule => `- ${rule}`).join('\n')}\n`;
// An agent reads this to change code, so every site gets a concrete instruction: the exact edit when one decision
// fits, the edits to choose between (by their reasons) when several do, and NEEDS-DECISION when none is close.
export function formatAgent(report: Report): string {
  const findings = report.findings.map(finding => ({ finding, sites: newSites(finding) })).filter(f => f.sites.length);
  const where = (site: Site) => `${pathFor(report, site.file)}:${site.line}:${site.column}`;
  const sections = findings.map(({ finding, sites }, index) => {
    const candidates = editChoices(finding);
    const amount = finding.declaration.resolved ?? finding.declaration.value;
    const lines = [`## ${index + 1} of ${findings.length}  ${finding.title || `${finding.declaration.prop}: ${amount}`}`, `Rule: ${finding.rule}`, `Why: ${finding.because || finding.why}`];
    if (candidates.length) {
      lines.push('Tokens:', ...candidates.map(d => {
        const use = [d.use?.class, d.use?.css].filter(Boolean).join(' or ') || d.refs.join(', ');
        return `- ${d.resolved ?? d.value}: use ${use}; why: ${d.why || '(no reason recorded)'}`;
      }));
    }
    lines.push(`Sites: ${sites.map(where).join(', ')}`);
    const governed = ['ledger', 'decisions'].includes(finding.family);
    for (const site of sites) {
      const d = atSite(finding, site);
      lines.push(`- ${where(site)}  \`${site.text}\``, `  Compiles to: ${d.prop}: ${d.resolved ?? d.value} (via ${d.origin})`);
      if (governed) { lines.push('  Edit: NEEDS-DECISION: report this change for review. Do not change config, ledger, or theme to pass.'); continue; }
      const edits = candidates.map(decision => {
        const change = replacement(finding, site, decision, report);
        return { decision, edit: change ? `replace \`${change.from}\` with \`${change.to}\`` : undefined };
      });
      if (candidates.length === 1 && edits[0]!.edit) lines.push(`  Edit: ${edits[0]!.edit} at ${where(site)}.`);
      else if (candidates.length > 1 && edits.every(e => e.edit)) {
        lines.push(`  Choose a token using its reason, then edit at ${where(site)}:`, ...edits.map(e => `    ${e.edit}  (${e.decision.resolved ?? e.decision.value})`));
      } else if (candidates.length) lines.push(`  Choose a token using its reason; no exact edit is recorded for this syntax. ${finding.fix}`);
      else if (finding.family === finding.rule.split('/')[1] || finding.rule.startsWith('provenance/')) {
        lines.push(`  Edit: ${/^NEEDS-DECISION/.test(finding.fix) || !finding.fix ? `NEEDS-DECISION: no decision is close to ${amount}; stop and report this site and the value you wanted.` : finding.fix}`);
      } else lines.push(`  Fix: ${finding.fix || 'NEEDS-DECISION: no fix is recorded; report this site.'}`);
    }
    return lines.join('\n');
  });
  const diagnostics = findings.filter(f => ['ledger', 'decisions'].includes(f.finding.family)).reduce((n, f) => n + f.sites.length, 0);
  const drift = report.ledger?.new ?? findings.filter(f => !['ledger', 'decisions'].includes(f.finding.family)).reduce((n, f) => n + f.sites.length, 0);
  return `${drift + diagnostics} new\n\n${sections.join('\n\n')}${sections.length ? '\n\n' : ''}${renderLoop()}`;
}

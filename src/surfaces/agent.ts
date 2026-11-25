import type { Report, Site } from '../report.js';
import { atSite, newSites, pathFor } from './sites.js';
import { editChoices, replacement } from './edits.js';
import { classEdit } from '../messages.js';
import { quote } from '../cli-apply.js';

export const loopRules = [
  'Do not edit plumber.config.ts (or another React Plumber config), .plumber/ledger.jsonl, or the theme to make a finding pass.',
  'Use `plumber apply <key>` where a group shows one; edit by hand only where it does not.',
  'Run `plumber check --changed --agent` after editing; stop when it prints "0 new".',
  'If neither decision fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.',
  'Reporting NEEDS-DECISION is fine. Never add a token.',
];
export const renderLoop = () => `## Rules for this loop\n\n${loopRules.map(rule => `- ${rule}`).join('\n')}\n`;
// An agent reads this to change code, so every site gets a concrete instruction: the exact edit when one decision
// fits, the edits to choose between (by their reasons) when several do, and NEEDS-DECISION when none is close.
// The order is the cause list's (src/causes.ts), so an agent and a person see the same problem first: what draws
// nothing, then what one edit settles, then a choice between tokens, then what needs a person; the most places first
// within each. An agent works the top `top` groups, runs again, and the next ones come up.
export const AGENT_TOP = 10;
export function formatAgent(report: Report, top: number = AGENT_TOP): string {
  const urgency = (f: Report['findings'][number]) => f.rule.startsWith('existence/') ? 0
    : ['ledger', 'decisions'].includes(f.family) ? 3 : editChoices(f).length === 1 ? 1 : editChoices(f).length ? 2 : 3;
  const all = report.findings.map(finding => ({ finding, sites: newSites(finding), urgency: urgency(finding) })).filter(f => f.sites.length)
    .sort((a, b) => a.urgency - b.urgency || b.sites.length - a.sites.length);
  const findings = all.slice(0, top);
  const where = (site: Site) => `${pathFor(report, site.file)}:${site.line}:${site.column}`;
  const sections = findings.map(({ finding, sites }, index) => {
    const candidates = editChoices(finding);
    const amount = finding.declaration.resolved ?? finding.declaration.value;
    const lines = [`## ${index + 1} of ${all.length}  ${finding.title || `${finding.declaration.prop}: ${amount}`}`, `Rule: ${finding.rule}`, `Why: ${finding.because || finding.why}`];
    if (candidates.length) {
      lines.push('Tokens:', ...candidates.map(d => {
        // a class site is offered a class: the token's own utility, or the utility with the token as its value
        const use = [d.use?.class ?? (d.use && classEdit(finding.declaration, d.use)?.to), d.use?.css].filter(Boolean).join(' or ') || d.refs.join(', ');
        return `- ${d.resolved ?? d.value}: use ${use}; why: ${d.why || '(no reason recorded)'}`;
      }));
    }
    lines.push(`Sites: ${sites.map(where).join(', ')}`);
    const governed = ['ledger', 'decisions'].includes(finding.family);
    // the whole group in one command, written by the fix bar's writer, when plumber can write at least one place
    const writable = !governed && candidates.some(decision => sites.some(site => replacement(finding, site, decision, report)));
    if (writable) lines.push(candidates.length === 1 ? `Apply: plumber apply ${quote(finding.key)}  (writes every place below; plumber undo takes it back)`
      : `Apply: plumber apply ${quote(finding.key)} --token <${candidates.map(d => d.name).join('|')}>  (after you choose)`);
    for (const site of sites) {
      const d = atSite(finding, site);
      lines.push(`- ${where(site)}  \`${site.text}\`${site.defined ? `  (a variable defined at ${where({ ...site, ...site.defined })})` : ''}`, `  Compiles to: ${d.prop}: ${d.resolved ?? d.value} (via ${d.origin})`);
      const place = site.defined ? { ...site, ...site.defined } : site;
      if (governed) { lines.push('  Edit: NEEDS-DECISION: report this change for review. Do not change config, ledger, or theme to pass.'); continue; }
      const edits = candidates.map(decision => {
        const change = replacement(finding, site, decision, report);
        return { decision, edit: change ? `replace \`${change.from}\` with \`${change.to}\`` : undefined };
      });
      if (candidates.length === 1 && edits[0]!.edit) lines.push(`  Edit: ${edits[0]!.edit} at ${where(place)}.`);
      else if (candidates.length > 1 && edits.every(e => e.edit)) {
        lines.push(`  Choose a token using its reason, then edit at ${where(place)}:`, ...edits.map(e => `    ${e.edit}  (${e.decision.resolved ?? e.decision.value})`));
      } else if (candidates.length) lines.push(`  Choose a token using its reason; no exact edit is recorded for this syntax. ${finding.fix}`);
      else if (finding.family === finding.rule.split('/')[1] || finding.rule.startsWith('provenance/')) {
        lines.push(`  Edit: ${/^NEEDS-DECISION/.test(finding.fix) || !finding.fix ? `NEEDS-DECISION: no decision is close to ${amount}; stop and report this site and the value you wanted.` : finding.fix}`);
      } else lines.push(`  Fix: ${finding.fix || 'NEEDS-DECISION: no fix is recorded; report this site.'}`);
    }
    return lines.join('\n');
  });
  const diagnostics = all.filter(f => ['ledger', 'decisions'].includes(f.finding.family)).reduce((n, f) => n + f.sites.length, 0);
  const drift = report.ledger?.new ?? all.filter(f => !['ledger', 'decisions'].includes(f.finding.family)).reduce((n, f) => n + f.sites.length, 0);
  const left = all.length - findings.length;
  const more = left ? `## ${left} more\n\nThese are the first ${findings.length} of ${all.length}, the most urgent first. Fix them and run the same command again: the next ones come up. \`--top all\` lists every one.\n\n` : '';
  return `${drift + diagnostics} new\n\n${sections.join('\n\n')}${sections.length ? '\n\n' : ''}${more}${renderLoop()}`;
}

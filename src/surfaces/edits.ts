import type { Decision, Finding, Report, Site } from '../report.js';
import { sourceHash } from '../collect/cache.js';
import { lineStarts } from '../collect/source.js';
import { cssCode } from '../collect/stylesheets.js';
import { useFor } from '../rules/provenance.js';
import { numericUse } from '../decisions/spacing.js';
import { atSite, newSites, pathFor } from './sites.js';
import { classEdit } from '../messages.js';

export interface StructuredEdit {
  id: string;
  findingKey: string;
  rule: string;
  family: string;
  file: string;
  line: number;
  column: number;
  start: number;
  end: number;
  from: string;
  to: string;
  token: string;
}

/** Exact replacement spelling shared by the agent and source-edit transports. */
export function replacement(finding: Finding, site: Site, decision: Decision, report: Report, decisionNames?: Set<string>): Pick<StructuredEdit, 'from' | 'to' | 'token'> | undefined {
  const d = atSite(finding, site);
  // a dead class's suggestion is a class, not a token: it is used as the finding offers it
  const use = finding.rule.startsWith('existence/') && decision.use?.class ? decision.use : useFor(decision, d.prop, decisionNames ?? new Set(decision.use?.class ? [...report.decisions, ...report.decisionInventory ?? []].map(d => d.name) : []));
  const edit = classEdit({ ...d, site }, use);
  if (edit) return { from: site.text, to: edit.beside ? `${site.text} ${edit.to}` : edit.to, token: decision.name };
  if (['class', 'arbitrary', 'apply'].includes(d.origin)) return undefined;
  const colon = site.text.indexOf(':');
  if (colon < 0 || !use.css.startsWith(`${d.prop}: `)) return undefined;
  const property = site.text.slice(0, colon).trim().replace(/["']/g, '');
  if (property.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`) !== d.prop) return undefined;
  const value = use.css.slice(d.prop.length + 2);
  if (!value.startsWith('var(') && !numericUse(decision)) return undefined;
  // A stepped value keeps its runtime multiplier: the token becomes the step.
  const written = d.dynamic?.kind === 'step' ? (value.startsWith('var(') ? `\`calc(${value} * \${${d.dynamic.by}})\`` : undefined) : JSON.stringify(value);
  if (written === undefined) return undefined;
  const to = d.origin === 'inline' ? `${site.text.slice(0, colon)}: ${written}` : use.css;
  return { from: site.text, to, token: decision.name };
}

export const editChoices = (finding: Finding) => (finding.choices ?? finding.decisions).filter(d => !(finding.rule.endsWith('/framework') && d.origin === 'framework'));
const sameSite = (a: Site, b: Site) => a.file === b.file && a.line === b.line && a.column === b.column;
/** A copy of a token's value carries its matching token per site (edits), not a list of choices. */
const siteChoices = (finding: Finding, site: Site): Decision[] => finding.rule.endsWith('/by-value') && !finding.choices?.length
  ? finding.decisions.filter(d => finding.edits?.some(edit => edit.token === d.name && sameSite(edit.site, site)))
  : editChoices(finding);

/** Only offer replacements whose authored text exists at the reported UTF-16 location. */
export function structuredEdits(report: Report, sources: ReadonlyMap<string, string>, decisionNames?: Set<string>, includeDebt = false): StructuredEdit[] {
  const edits = new Map<string, StructuredEdit>();
  const starts = new Map([...sources].map(([file, text]) => [file, lineStarts(text)]));
  for (const finding of report.findings) {
    if (['ledger', 'decisions'].includes(finding.family)) continue;
    // A person's explicit source write can pay down baseline debt. Accepted
    // exceptions stay excluded; automatic agent suggestions remain new-only.
    const sites = includeDebt ? finding.sites.filter(site => site.inScope !== false && (!site.ledger || site.ledger.status === 'new' || site.ledger.status === 'debt')) : newSites(finding);
    for (const site of sites) {
      // a class read through a variable is edited at its literal, not at the usage on the element
      const at = site.defined && sources.has(site.defined.file) ? { ...site, ...site.defined } : site;
      const source = sources.get(at.file), line = starts.get(at.file)?.[at.line - 1];
      if (source === undefined || line === undefined) continue;
      for (const decision of siteChoices(finding, site)) {
        let change = replacement(finding, site, decision, report, decisionNames);
        if (!change) continue;
        let start = line + at.column - 1;
        if (atSite(finding, site).origin === 'stylesheet') {
          // Replace only the authored value; keep property spelling, comments and importance.
          const colon = site.text.indexOf(':');
          const value = site.text.slice(colon + 1);
          const code = cssCode(value).replace(/\s*!important\s*$/i, '');
          const leading = code.length - code.trimStart().length, end = code.trimEnd().length;
          if (colon < 0 || end <= leading) continue;
          start += colon + 1 + leading;
          change = { ...change, from: value.slice(leading, end), to: change.to.slice(change.to.indexOf(':') + 1).trim() };
        }
        const end = start + change.from.length;
        if (source.slice(start, end) !== change.from || change.from === change.to) continue;
        const id = sourceHash(JSON.stringify([at.file, start, end, change.from, change.to]));
        // A utility can compile to several declarations at the same authored site.
        if (!edits.has(id)) edits.set(id, { id, findingKey: finding.key, rule: finding.rule, family: finding.family,
          file: at.file, line: at.line, column: at.column, start, end, ...change });
      }
    }
  }
  return [...edits.values()];
}

export interface RefusedSite { rule: string; file: string; line: number; column: number; text: string; reason: string }
/**
 * Drift in this report which no edit can fix, each with the reason. These are the values the editor cannot write:
 * computed at runtime, written in a shared object elsewhere, or with no token close enough.
 */
export function refusedSites(report: Report, sources: ReadonlyMap<string, string>, edits: readonly StructuredEdit[]): RefusedSite[] {
  const starts = new Map([...sources].map(([file, text]) => [file, lineStarts(text)]));
  const edited = new Set(edits.map(edit => `${edit.file}:${edit.line}:${edit.column}`));
  const refused = new Map<string, RefusedSite>();
  for (const finding of report.findings) {
    if (!finding.rule.startsWith('provenance/')) continue;
    for (const site of finding.sites.filter(site => site.inScope !== false && (!site.ledger || site.ledger.status === 'new' || site.ledger.status === 'debt'))) {
      const source = sources.get(site.file), line = starts.get(site.file)?.[site.line - 1];
      const defined = site.defined;
      if (source === undefined || line === undefined || edited.has(`${site.file}:${site.line}:${site.column}`) || defined && edited.has(`${defined.file}:${defined.line}:${defined.column}`)) continue;
      const here = source.slice(line + site.column - 1, line + site.column - 1 + site.text.length) === site.text;
      const reason = finding.rule === 'provenance/opaque-inline' ? `Computed at runtime, so it cannot be edited here. ${finding.action ?? ''}`.trim()
        : !here && defined ? `Comes from a variable defined at ${pathFor(report, defined.file)}:${defined.line}:${defined.column}; change it there.`
        : !here ? 'Written in a shared style object or imported value, not at this element; change it where it is defined.'
        : !siteChoices(finding, site).length ? finding.action || 'No token is close enough. Pick one with the design owner, or add one to the theme.'
        : 'This spelling cannot be rewritten automatically; change it by hand.';
      refused.set(`${site.file}:${site.line}:${site.column}:${finding.rule}`, { rule: finding.rule, file: site.file, line: site.line, column: site.column, text: site.text, reason });
    }
  }
  return [...refused.values()];
}

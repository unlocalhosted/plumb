import type { Decision, Finding, Report, Site } from '../report.js';
import { sourceHash } from '../collect/cache.js';
import { lineStarts } from '../collect/source.js';
import { cssCode } from '../collect/stylesheets.js';
import { useFor } from '../rules/provenance.js';
import { numericUse } from '../decisions/spacing.js';
import { atSite, newSites } from './sites.js';

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
  const use = useFor(decision, d.prop, decisionNames ?? new Set(decision.use?.class ? [...report.decisions, ...report.decisionInventory ?? []].map(d => d.name) : []));
  if (['class', 'arbitrary', 'apply'].includes(d.origin) && use.class) {
    // Retain variants and importance, but never guess at arbitrary selectors or modifiers.
    const token = site.text;
    if (/[\s/]/.test(token)) return undefined;
    let depth = 0, colon = -1;
    for (let i = 0; i < token.length; i++) { if (token[i] === '[') depth++; if (token[i] === ']') depth--; if (token[i] === ':' && depth === 0) colon = i; }
    const variant = token.slice(0, colon + 1), utility = token.slice(colon + 1);
    const negative = utility.replace(/^!/, '').startsWith('-') ? '-' : '';
    const to = `${variant}${utility.startsWith('!') ? '!' : ''}${negative}${use.class}${utility.endsWith('!') ? '!' : ''}`;
    return { from: token, to, token: decision.name };
  }
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
      const source = sources.get(site.file), line = starts.get(site.file)?.[site.line - 1];
      if (source === undefined || line === undefined) continue;
      for (const decision of editChoices(finding)) {
        let change = replacement(finding, site, decision, report, decisionNames);
        if (!change) continue;
        let start = line + site.column - 1;
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
        const id = sourceHash(JSON.stringify([site.file, start, end, change.from, change.to]));
        // A utility can compile to several declarations at the same authored site.
        if (!edits.has(id)) edits.set(id, { id, findingKey: finding.key, rule: finding.rule, family: finding.family,
          file: site.file, line: site.line, column: site.column, start, end, ...change });
      }
    }
  }
  return [...edits.values()];
}

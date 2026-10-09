import { relative } from 'node:path';
import type { Decision, Declaration, Report } from '../report.js';
import type { FindingGroup, LedgerEntry } from './types.js';

export const normalizeAuthored = (text: string) => text.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
export const siteLocation = (site: Declaration['site']) => JSON.stringify([site.file, site.line, site.column, site.text]);
export const decisionKey = (decision: Pick<Decision, 'family' | 'name'>) => `decision:${decision.family}:${decision.name}`;
export function currentDecisions(report: Report): Decision[] {
  // Framework defaults are remembered for diagnostics, never implicitly accepted.
  return [...new Map([...report.decisionInventory ?? [], ...report.decisions].filter(decision => decision.origin !== 'framework').map(decision => [decisionKey(decision), decision])).values()];
}
export function decisionEntry(decision: Decision): LedgerEntry {
  return { key: decisionKey(decision), kind: 'decision', family: decision.family, value: decision.value,
    refs: decision.refs, origin: decision.origin, tier: decision.tier, ...(decision.resolved === undefined ? {} : { resolved: decision.resolved }) };
}
export function findingGroups(report: Report): Map<string, FindingGroup> {
  const groups = new Map<string, FindingGroup>();
  const groupLocations = new Map<string, Set<string>>();
  const locations = new Map<string, Declaration[]>();
  const location = siteLocation;
  for (const declaration of report.declarations) {
    const key = location(declaration.site);
    const list = locations.get(key) ?? [];
    list.push(declaration); locations.set(key, list);
  }
  for (const finding of report.findings) {
    // Finding sites may be distinct objects from their exact declarations. Keep
    // acceptance on the report site, without changing the fix group's key.
    finding.sites = finding.sites.map(({ ledger: _ledger, ...site }) => site);
    const sites = new Map<string, typeof finding.sites>();
    for (const site of finding.sites) {
      const key = location(site), copies = sites.get(key) ?? [];
      copies.push(site); sites.set(key, copies);
    }
    const occurrences = finding.occurrences ?? finding.sites.map(site => {
      const candidates = locations.get(location(site)) ?? [];
      return candidates.find(declaration => declaration.prop === finding.declaration.prop) ?? candidates[0] ?? { ...finding.declaration, site };
    });
    // A finding can retain a site without an occurrence (for example after
    // compiler fallback grouping). It still needs its own authored identity.
    const occurrenceLocations = new Set(occurrences.map(declaration => location(declaration.site)));
    const missing = finding.sites.filter(site => !occurrenceLocations.has(location(site)));
    const keys = new Set<string>();
    for (const declaration of [...occurrences, ...missing.map(site => ({ ...finding.declaration, site }))]) {
      const site = declaration.site;
      const path = relative(report.root, site.file).replaceAll('\\', '/');
      const anchor = site.anchor ?? '<module>';
      const owner = declaration.owner.name === site.file ? '<module>' : declaration.owner.name;
      const authored = normalizeAuthored(site.text);
      const key = `${finding.rule}:${owner}:${declaration.prop}:${authored}@${path}#${anchor}`;
      keys.add(key);
      for (const reportSite of sites.get(location(site)) ?? []) {
        if (!reportSite.ledger) reportSite.ledger = { key, status: 'new' };
      }
      let group = groups.get(key);
      if (!group) {
        group = { entry: { key, kind: 'debt', rule: finding.rule, family: finding.family, owner, prop: declaration.prop, authored, path, anchor,
          resolved: declaration.resolved ?? declaration.value, count: 0 }, finding, declarations: [], sites: [] };
        groups.set(key, group);
        groupLocations.set(key, new Set());
      }
      // Compiler fallbacks/conditions are not additional physical authored sites.
      const seen = groupLocations.get(key)!;
      if (seen.has(location(site))) continue;
      seen.add(location(site));
      group.sites.push(site); group.declarations.push(declaration); group.entry.count = group.sites.length;
    }
    finding.ledgerKeys = [...keys];
  }
  return groups;
}

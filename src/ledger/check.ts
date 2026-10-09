import { makeFinding } from '../messages.js';
import { performance } from 'node:perf_hooks';
import { profileDuration } from '../profile.js';
import type { Declaration, Finding, Report, Site } from '../report.js';
import { changedFiles, configGrowth, ledgerAt } from './git.js';
import { currentDecisions, decisionEntry, decisionKey, findingGroups, siteLocation } from './keys.js';
import { entryCount, ledgerPath, readLedger } from './store.js';
import type { LedgerEntry, LedgerOptions } from './types.js';

export function diagnostic(rule: string, severity: Finding['severity'], site: Site, why: string, fix: string, key = `${rule}:${site.text}`): Finding {
  const declaration: Declaration = { prop: 'ledger', value: site.text, refs: [], when: [], site, owner: { kind: 'element', name: 'ledger' }, origin: 'stylesheet' };
  const title = rule === 'ledger/no-why' ? `Exception \`${key}\` has no reason` : rule === 'decisions/unaccepted' ? `\`${site.text.split(':')[0]}\` is new in your theme and not yet accepted` : rule === 'ledger/grew' ? 'This change adds 1 ledger entries' : why.replace(/decision/g, 'token');
  const because = rule === 'ledger/no-why' ? 'Every exception needs a reason a reviewer can check.' : rule === 'decisions/unaccepted' ? 'New tokens change what everyone may use.' : rule === 'ledger/grew' ? 'New exceptions and tokens are design decisions and need review.' : rule === 'decisions/vanished' ? 'Accepted tokens should stay in sync with the theme.' : 'The ledger should record only remaining exceptions and debt.';
  const action = rule === 'ledger/no-why' ? `plumb accept ${key} --why "…"` : rule === 'decisions/unaccepted' ? 'plumb accept-decisions --why "…"' : fix;
  return makeFinding({ key, rule, severity, family: rule.startsWith('decisions/') ? 'decisions' : 'ledger', sites: [site], declaration, decisions: [], title, because, action });
}
function grew(entry: LedgerEntry, previous: LedgerEntry | undefined): boolean {
  if (!previous || entry.kind !== previous.kind) return true;
  if (entry.kind === 'debt') return entryCount(entry) > entryCount(previous);
  const canonical = (entry: LedgerEntry) => JSON.stringify(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
  return canonical(entry) !== canonical(previous);
}
export async function applyLedger(report: Report, options: LedgerOptions = {}, snapshot?: Awaited<ReturnType<typeof readLedger>>): Promise<Report> {
  const start = performance.now();
  const groups = findingGroups(report);
  const ledger = snapshot ?? await readLedger(report.root);
  const path = ledgerPath(report.root);
  const accepted = new Map(ledger.entries.map(entry => [entry.key, entry]));
  const changed = options.base === undefined && !options.changed ? undefined : changedFiles(report.root, options.base ?? 'HEAD');
  const summary = { exists: ledger.exists, path, entries: ledger.entries.length, new: 0, debt: 0, exceptions: 0, outOfScope: 0, stale: 0, growth: 0, message: '' };
  const diagnostics: Finding[] = [];
  const siteFor = (entry: LedgerEntry): Site => ({ file: path, line: ledger.entries.indexOf(entry) + 1, column: 1, text: JSON.stringify(entry) });
  for (const entry of ledger.entries) {
    if (entry.kind === 'exception' && !entry.why?.trim()) diagnostics.push(diagnostic('ledger/no-why', 'error', siteFor(entry), `Exception ${entry.key} has no why.`, 'Record a reason with plumb accept --why "…".', entry.key));
    if (entry.kind === 'debt') {
      const current = groups.get(entry.key)?.sites.length ?? 0;
      if (current < entryCount(entry)) {
        summary.stale += entryCount(entry) - current;
        diagnostics.push(diagnostic('ledger/stale', 'warn', siteFor(entry), `Debt ${entry.key} records ${entryCount(entry)} sites; ${current} remain.`, 'Run plumb ledger --ratchet to shrink debt, or --prune to drop stale entries.', entry.key));
      }
    }
  }
  if (ledger.exists) {
    const current = new Set<string>();
    for (const decision of currentDecisions(report)) {
      const key = decisionKey(decision); current.add(key);
      const entry = accepted.get(key);
      const snapshot = decisionEntry(decision);
      if (entry?.kind === 'decision' && entry.value === snapshot.value && entry.origin === snapshot.origin && entry.tier === snapshot.tier && JSON.stringify(entry.refs) === JSON.stringify(snapshot.refs)) continue;
      diagnostics.push(diagnostic('decisions/unaccepted', 'error', { ...decision.source, column: 1, text: `${decision.name}: ${decision.value}` }, `${decision.name} is a new or changed decision not accepted in the ledger.`, 'Run plumb accept-decisions --why "…" after reviewing the decision.', key));
    }
    for (const entry of ledger.entries) if (entry.kind === 'decision' && !current.has(entry.key)) diagnostics.push(diagnostic('decisions/vanished', 'warn', siteFor(entry), `Accepted decision ${entry.key} vanished from its source.`, 'Run plumb ledger --prune after reviewing the removal.', entry.key));
  }
  // Ledger allowances count authored sites; they never partition fix groups.
  const statuses = new Map<string, Map<string, NonNullable<Site['ledger']>>>();
  for (const group of groups.values()) {
    const entry = accepted.get(group.entry.key);
    const allowance = entry && entry.kind !== 'decision' ? Math.min(entryCount(entry), group.sites.length) : 0;
    const sites = new Map<string, NonNullable<Site['ledger']>>();
    group.sites.forEach((site, index) => {
      const status = index < allowance ? entry!.kind === 'exception' ? 'exception' : 'debt' : 'new';
      sites.set(siteLocation(site), { key: group.entry.key, status, ...(index < allowance && entry?.why !== undefined ? { why: entry.why } : {}) });
      if (status === 'debt') summary.debt++;
      else if (status === 'exception') summary.exceptions++;
      else if (changed && !changed.has(site.file)) summary.outOfScope++;
      else summary.new++;
    });
    statuses.set(group.entry.key, sites);
  }
  const unclassified = new Set<string>();
  for (const finding of report.findings) {
    for (const site of finding.sites) {
      const status = site.ledger && statuses.get(site.ledger.key)?.get(siteLocation(site));
      if (status) site.ledger = status;
      else {
        // Fail closed if a future rule supplies an incomplete ledger identity.
        // An unclassified site must never be silently accepted or crash check.
        site.ledger = { key: site.ledger?.key ?? `${finding.key}:${siteLocation(site)}`, status: 'new' };
        report.notes.push(`Ledger identity missing for ${finding.rule} at ${site.file}:${site.line}:${site.column}; treated as new.`);
        const counted = finding.ledgerKeys?.map(key => statuses.get(key)?.get(siteLocation(site))).find(Boolean);
        const identity = `${counted?.key ?? site.ledger.key}:${siteLocation(site)}`;
        if (!unclassified.has(identity)) {
          unclassified.add(identity);
          if (counted?.status === 'debt') summary.debt--;
          if (counted?.status === 'exception') summary.exceptions--;
          if (counted?.status !== 'new') {
            if (changed && !changed.has(site.file)) summary.outOfScope++;
            else summary.new++;
          }
        }
        if (!finding.ledgerKeys?.includes(site.ledger.key)) (finding.ledgerKeys ??= []).push(site.ledger.key);
      }
      if (changed) site.inScope = changed.has(site.file);
    }
    finding.status = finding.sites.some(site => site.ledger!.status === 'new') ? 'new'
      : finding.sites.some(site => site.ledger!.status === 'debt') ? 'debt' : 'exception';
    // A new site outside --base scope remains visible as data but cannot fail.
    if (!finding.sites.some(site => site.ledger!.status === 'new' && (!changed || changed.has(site.file)))) finding.severity = 'info';
  }
  if (ledger.exists) {
    for (const [family, coverage] of Object.entries(report.coverage)) {
      if (!('fromDecisions' in coverage)) continue;
      Object.assign(coverage, {
        debt: report.findings.filter(f => f.family === family).reduce((sum, finding) => sum + finding.sites.filter(site => site.ledger!.status === 'debt').length, 0),
        exceptions: report.findings.filter(f => f.family === family).reduce((sum, finding) => sum + finding.sites.filter(site => site.ledger!.status === 'exception').length, 0),
      });
    }
  }
  const compare = (previous: LedgerEntry[], strict: boolean) => {
    const old = new Map(previous.map(entry => [entry.key, entry]));
    for (const entry of ledger.entries) if (grew(entry, old.get(entry.key))) {
      summary.growth++;
      diagnostics.push(diagnostic('ledger/grew', strict || entry.kind === 'debt' ? 'error' : 'info', siteFor(entry),
        `${entry.kind} ledger line grew versus ${strict ? 'HEAD' : options.base}: ${entry.key}.`,
        strict ? 'Do not grow the ledger to pass an agent check; fix the sites or report NEEDS-DECISION.' : 'Review the added ledger line; debt may only shrink.', `${strict ? 'HEAD' : options.base}:${entry.key}`));
    }
  };
  if (options.base !== undefined) compare(ledgerAt(report.root, options.base), false);
  if (options.strictLedger) {
    compare(ledgerAt(report.root, 'HEAD'), true);
    for (const site of await configGrowth(report.root, report.config.path)) {
      summary.growth++;
      diagnostics.push(diagnostic('ledger/grew', 'error', { ...site, column: 1 }, 'Config grew in the working tree versus HEAD.', 'Do not grow config to pass an agent check; fix the sites or report NEEDS-DECISION.'));
    }
  }
  for (const finding of diagnostics) if (finding.rule === 'ledger/grew') finding.title = `This change adds ${summary.growth} ledger entries`;
  report.findings.push(...diagnostics);
  summary.message = ledger.exists ? `${summary.new} new, ${summary.debt} debt, ${summary.exceptions} exception sites; ${summary.stale} stale, ${summary.growth} ledger/config growth.` : 'No ledger. Run plumb baseline to record current debt and accept the current decisions.';
  report.ledger = summary;
  report.notes.push(summary.message);
  const elapsed = performance.now() - start;
  profileDuration('phase:ledger', elapsed);
  report.timing.totalMs += elapsed;
  return report;
}

import { readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { UsageError } from '../errors.js';
import { parseSync } from 'oxc-parser';
import { namedAnchors } from '../collect/source.js';
import { maskImports } from '../collect/stylesheets.js';
import { parseCss, selectorText } from '../lower/css.js';
import type { Rule } from 'lightningcss';
import { familiesFor } from '../rules/families.js';
import type { Report } from '../report.js';
import { defaultSource } from '../project.js';
import { author } from './git.js';
import { currentDecisions, decisionEntry, decisionKey, findingGroups } from './keys.js';
import { entryCount, ledgerPath, readLedger, writeLedger } from './store.js';
import type { LedgerEntry } from './types.js';

export interface CommandOptions { force?: boolean; why?: string; key?: string; rule?: string; site?: string; ratchet?: boolean; prune?: boolean; rebase?: boolean }
function stamp(root: string): Pick<LedgerEntry, 'on' | 'by'> {
  const by = author(root);
  return { on: new Date().toISOString().slice(0, 10), ...(by ? { by } : {}) };
}
function acceptSet(report: Report, entries: LedgerEntry[], why?: string, inferred = false): LedgerEntry[] {
  const attribution = stamp(report.root);
  const accepted = new Map(entries.map(entry => [entry.key, entry]));
  for (const decision of currentDecisions(report)) {
    const entry = decisionEntry(decision);
    const previous = accepted.get(entry.key);
    // Preserve attribution and reasons for unchanged accepted records.
    if (previous?.kind === 'decision' && previous.value === entry.value && previous.origin === entry.origin && previous.tier === entry.tier && JSON.stringify(previous.refs) === JSON.stringify(entry.refs) && why === undefined) continue;
    accepted.set(entry.key, { ...entry, ...attribution, why: why ?? decision.why, ...(inferred ? { inferred: true } : {}) });
  }
  return [...accepted.values()];
}
export function parseSite(root: string, input: string): { file: string; line: number } {
  const match = /^(.*):(\d+)$/.exec(input);
  if (!match?.[1] || Number(match[2]) < 1 || !Number.isSafeInteger(Number(match[2]))) throw new UsageError('Provide a site as file:line (one-based).');
  return { file: resolve(root, match[1]), line: Number(match[2]) };
}
async function anchorExists(root: string, entry: LedgerEntry): Promise<boolean> {
  if (!entry.path || !entry.anchor) return true;
  const file = resolve(root, entry.path);
  let text: string;
  try { text = await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  if (entry.anchor === '<module>') return true;
  if (/\.[jt]sx?$/.test(file)) {
    const parsed = parseSync(file, text);
    return parsed.errors.length > 0 || namedAnchors(parsed.program).some(anchor => anchor.name === entry.anchor);
  }
  if (!file.endsWith('.css')) return true;
  try {
    const anchors = new Set<string>();
    function walk(rules: Rule[], parent?: string): void {
      for (const rule of rules) {
        if (rule.type === 'style') for (const selector of rule.value.selectors) {
          const authored = selectorText(selector);
          const anchor = parent ? authored.includes('&') ? authored.replaceAll('&', parent) : `${parent} ${authored}` : authored;
          anchors.add(anchor); walk(rule.value.rules ?? [], anchor);
        }
        else if (rule.type === 'media' || rule.type === 'supports' || rule.type === 'container' || rule.type === 'layer-block') walk(rule.value.rules, parent);
      }
    }
    walk(parseCss(maskImports(text, true), file).rules);
    return anchors.has(entry.anchor);
  } catch { return true; } // An unreadable retained file is never automatic approval.
}
export async function ledgerCommand(command: string, report: Report, options: CommandOptions): Promise<{ message: string; entries: LedgerEntry[]; moves: { from: string; to: string }[] }> {
  const ledger = await readLedger(report.root);
  const groups = findingGroups(report);
  const current = new Map([...groups].map(([key, group]) => [key, group.entry]));
  let entries = [...ledger.entries];
  const moves: { from: string; to: string }[] = [];
  let message = '';
  const attribution = stamp(report.root);
  const pendingPath = resolve(report.root, '.plumb/.baseline-pending');
  if (command === 'baseline') {
    const old = new Map(entries.map(entry => [entry.key, entry]));
    const debt = [...current.values()].filter(entry => old.get(entry.key)?.kind !== 'exception');
    const growth = debt.filter(entry => old.get(entry.key)?.kind !== 'debt' || entryCount(entry) > entryCount(old.get(entry.key)!));
    const pending = await readFile(pendingPath, 'utf8').then(() => entries.every(entry => entry.kind === 'decision')).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; });
    if (ledger.exists && !pending && growth.length && !options.force) throw new UsageError(`Baseline refuses debt growth (${growth.length} keys); fix new findings or use plumb baseline --force after review.`);
    entries = [...entries.filter(entry => entry.kind !== 'debt'), ...debt.map(entry => ({ ...entry, ...(old.get(entry.key)?.kind === 'debt' ? old.get(entry.key)! : attribution), count: entry.count!, resolved: entry.resolved! }))];
    if (!ledger.exists) entries = acceptSet(report, entries, undefined, true);
    message = `Baseline recorded ${debt.length} debt entries (${debt.reduce((sum, entry) => sum + entryCount(entry), 0)} sites).`;
  } else if (command === 'accept-decisions') {
    entries = acceptSet(report, entries, options.why);
    message = `Accepted ${currentDecisions(report).length} current decisions.`;
  } else if (command === 'accept') {
    if (!options.why?.trim()) throw new UsageError('plumb accept requires --why "…"; exceptions need a written reason.');
    if (options.key && (options.rule || options.site) || !options.key && !(options.rule && options.site)) throw new UsageError('Use plumb accept <key> or plumb accept --rule <rule> --site <file:line>.');
    const site = options.site ? parseSite(report.root, options.site) : undefined;
    const selected = [...groups.values()].filter(group => options.key ? group.entry.key === options.key : group.finding.rule === options.rule && group.sites.some(s => s.file === site!.file && s.line === site!.line));
    if (!selected.length) throw new UsageError('No current finding matches the supplied key/rule/site.');
    const keys = new Set(selected.map(group => group.entry.key));
    entries = [...entries.filter(entry => !keys.has(entry.key)), ...selected.map(group => ({ ...group.entry, kind: 'exception' as const, ...attribution, why: options.why! }))];
    // An exception-only adoption still starts with a snapshot of current decisions.
    if (!ledger.exists) entries = acceptSet(report, entries, undefined, true);
    message = `Accepted ${selected.length} exception entries: ${[...keys].join(', ')}.`;
  } else if (command === 'init') {
    if (report.config.path) throw new UsageError(`Config already exists: ${report.config.path}; edit it, then run plumb accept-decisions.`);
    const decisions: Record<string, { from: string[]; inferred: boolean }> = {};
    for (const decision of currentDecisions(report)) {
      const source = decision.source.file.endsWith('.css') ? `css:${relative(report.root, decision.source.file).replaceAll('\\', '/')}` : `theme:${decision.name}`;
      const entry = decisions[decision.family] ??= { from: [], inferred: true };
      if (!entry.from.includes(source)) entry.from.push(source);
    }
    const config = { ...(report.tailwind.entry ? { css: relative(report.root, report.tailwind.entry) } : {}), source: defaultSource, decisions };
    const path = resolve(report.root, 'plumb.config.ts');
    await writeFile(path, `// Inferred by Plumb; review decision sources before adopting.\nexport default ${JSON.stringify(config, null, 2)};\n`, { flag: 'wx' });
    entries = acceptSet(report, entries, undefined, true);
    message = `Wrote inferred ${path} and accepted current decisions. Run plumb baseline to record current debt.`;
  } else if (command === 'ledger') {
    if (!ledger.exists) throw new UsageError('No ledger exists; run plumb baseline first.');
    if (options.rebase) {
      const occupied = new Set(entries.map(entry => entry.key));
      const identity = (entry: LedgerEntry) => JSON.stringify([entry.rule, entry.owner, entry.prop, entry.authored, entry.resolved, entryCount(entry)]);
      // Refuse ambiguous many-to-one moves. A site must retain every field
      // except path/anchor; changed source text needs an explicit acceptance.
      const missing = entries.filter(entry => entry.kind !== 'decision' && !current.has(entry.key));
      const vanished = await Promise.all(missing.map(async entry => !await anchorExists(report.root, entry)));
      const orphaned = missing.filter((_, index) => vanished[index]);
      for (const entry of orphaned) {
        if (!entry.rule || !entry.authored) continue;
        const identical = [...current.values()].filter(candidate => !occupied.has(candidate.key) && identity(candidate) === identity(entry));
        const anchored = identical.filter(candidate => candidate.anchor === entry.anchor);
        const inFile = identical.filter(candidate => candidate.path === entry.path);
        const candidates = anchored.length ? anchored : inFile.length ? inFile : identical;
        if (candidates.length !== 1) continue;
        const competing = orphaned.filter(other => other !== entry && !moves.some(move => move.from === other.key) && identity(other) === identity(entry) &&
          (anchored.length ? other.anchor === entry.anchor : inFile.length ? other.path === entry.path : true));
        if (competing.length) continue;
        const target = candidates[0]!;
        moves.push({ from: entry.key, to: target.key });
        occupied.add(target.key);
        Object.assign(entry, { key: target.key, path: target.path, anchor: target.anchor });
      }
    }
    const decisionKeys = new Set(currentDecisions(report).map(decisionKey));
    if (options.ratchet) entries = entries.flatMap(entry => {
      if (entry.kind !== 'debt') return [entry];
      const count = current.get(entry.key)?.count ?? 0;
      return count ? [{ ...entry, count: Math.min(entryCount(entry), count) }] : [];
    });
    if (options.prune) entries = entries.filter(entry => entry.kind === 'decision' ? decisionKeys.has(entry.key) : current.has(entry.key));
    message = moves.map(move => `Moved ${move.from} -> ${move.to}`).join('\n') || `Ledger has ${entries.length} entries.`;
  } else throw new UsageError(`Unknown ledger command: ${command}.`);
  await writeLedger(report.root, entries);
  if (command === 'init') await writeFile(pendingPath, 'Run plumb baseline to record current debt.\n');
  if (command === 'baseline') await rm(pendingPath, { force: true });
  return { message, entries, moves };
}
export async function inspectLedger(command: 'show' | 'why', input: string, report: Report) {
  const ledger = await readLedger(report.root);
  const groups = findingGroups(report);
  const site = command === 'why' ? parseSite(report.root, input) : undefined;
  const findings = [...groups.values()].filter(group => command === 'show' ? group.entry.key === input || group.finding.rule === input : group.sites.some(s => s.file === site!.file && s.line === site!.line));
  const keys = new Set(findings.map(group => group.entry.key));
  const entries = ledger.entries.filter(entry => keys.has(entry.key) || command === 'show' && (entry.key === input || entry.rule === input));
  const declarations = command === 'why' ? report.declarations.filter(d => d.site.file === site!.file && d.site.line === site!.line) : findings.flatMap(group => group.declarations);
  const decisions = report.decisions.filter(decision => declarations.some(d => d.refs.some(ref => decision.refs.includes(`var(${ref})`)) || familiesFor(d.prop).includes(decision.family as ReturnType<typeof familiesFor>[number]) && (d.resolved ?? d.value) === (decision.resolved ?? decision.value)) || findings.some(group => group.finding.decisions.some(d => decisionKey(d) === decisionKey(decision))));
  const decisionKeys = new Set(decisions.map(decisionKey));
  const lines = (await readFile(ledgerPath(report.root), 'utf8').catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw error; })).split(/\r?\n/);
  return { findings: findings.map(group => ({ ...group.finding, key: group.entry.key, declaration: group.declarations[0]!, sites: group.sites })), declarations, decisions,
    ledger: ledger.entries.filter(entry => entries.includes(entry) || decisionKeys.has(entry.key)).map(entry => ({ entry, file: ledgerPath(report.root), line: lines.findIndex(line => { try { return (JSON.parse(line) as LedgerEntry).key === entry.key; } catch { return false; } }) + 1 })) };
}

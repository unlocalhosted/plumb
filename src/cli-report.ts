import { basename, isAbsolute, relative } from 'node:path';
import picomatch from 'picomatch';
import { count } from './messages.js';
import { formatFinding, formatText, formatVerboseDetails } from './report.js';
import type { Finding, Report, Site } from './report.js';
import { formatDeadSummary } from './rules/dead.js';

export interface DetailFilters {
  all?: boolean;
  broken?: boolean;
  family?: string;
  file?: string;
  rule?: string;
  new?: boolean;
  debt?: boolean;
}

const families = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'] as const;
const broken = (finding: Finding) => finding.rule.startsWith('existence/');
const setup = (finding: Finding) => finding.rule.startsWith('config/');
const override = (finding: Finding) => finding.rule.startsWith('ownership/');
const offToken = (finding: Finding) => finding.rule.startsWith('provenance/') && finding.rule !== 'provenance/opaque-inline';
const quiet = (finding: Finding) => finding.rule === 'provenance/opaque-inline' || finding.rule.startsWith('dead/');
const fresh = (site: Site) => (!site.ledger || site.ledger.status === 'new') && site.inScope !== false;
const hasNew = (finding: Finding) => finding.sites.some(fresh);
const number = (value: number) => value.toLocaleString('en-US');

// --all is an explicit compatibility view, including the old closing context.
export function formatAll(report: Report, verbose = false): string {
  return formatText(report, verbose) + (verbose ? formatDeadSummary(report.deadDecisions) : '') +
    Object.entries(report.configHints ?? {}).map(([family, hint]) => `\nconfig  ${family}: ${hint}\n`).join('') +
    (!report.config.path && !report.ledger?.exists ? '\nNext: run plumber init to write your token sources and record today\'s findings as debt, so CI only fails on new ones.\n' : report.ledger ? `\nledger  ${report.ledger.message}\n` : '');
}

function priority(finding: Finding): number {
  return broken(finding) ? 0 : setup(finding) ? 1 : !override(finding) && hasNew(finding) ? 2 : override(finding) ? 3 : 4;
}

function ordered(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => priority(a) - priority(b) || b.sites.length - a.sites.length || a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key));
}

function select(report: Report, filters: DetailFilters): Finding[] {
  const file = filters.file === undefined ? undefined : isAbsolute(filters.file) ? relative(report.root, filters.file) : filters.file;
  const matchFile = file === undefined ? undefined : picomatch(file.replaceAll('\\', '/'), { dot: true });
  return ordered(report.findings.flatMap(finding => {
    if (filters.new && quiet(finding)) return [];
    if (filters.broken && !broken(finding) || filters.family !== undefined && finding.family !== filters.family ||
      filters.rule !== undefined && !(finding.rule === filters.rule || finding.rule.startsWith(filters.rule + '/')) ||
      filters.rule === 'provenance' && !offToken(finding)) return [];
    const sites = finding.sites.filter(site =>
      (!matchFile || matchFile(relative(report.root, site.file).replaceAll('\\', '/'))) &&
      (!filters.new || fresh(site)) && (!filters.debt || site.ledger?.status === 'debt'));
    return sites.length ? [{ ...finding, sites }] : [];
  }));
}

function acceptExample(report: Report, findings: Finding[]): string {
  const actionable = findings.filter(finding => finding.accept && !quiet(finding));
  const finding = actionable.find(finding => finding.sites.some(fresh)) ?? actionable[0];
  if (!finding) return '';
  const site = finding.sites.find(fresh) ?? finding.sites[0]!;
  const at = `${relative(report.root, site.file).replaceAll('\\', '/')}:${site.line}`;
  return `Intended?  plumber accept --rule ${finding.rule} --site ${JSON.stringify(at)} --why "…"`;
}

function detail(report: Report, findings: Finding[], verbose: boolean, accept = true): string {
  if (!findings.length) return 'no findings';
  const reasons = new Map<string, Set<string>>();
  for (const finding of findings) {
    if (!finding.because) continue;
    const why = reasons.get(finding.rule) ?? new Set<string>();
    why.add(finding.because); reasons.set(finding.rule, why);
  }
  return findings.map(finding => formatFinding(finding, file => relative(report.root, file) || '.', verbose, false)).join('\n\n') +
    (reasons.size ? '\n\nWhy\n' + [...reasons].map(([rule, why]) => `  ${rule}: ${[...why].join(' ')}`).join('\n') : '') +
    (accept && acceptExample(report, findings) ? '\n\n' + acceptExample(report, findings) : '');
}

function header(report: Report): string {
  const theme = report.tailwind.entry === null ? 'plain CSS' : `Tailwind ${report.tailwind.version?.split('.').slice(0, 2).join('.') ?? 'unknown'} · theme ${relative(report.root, report.tailwind.entry)}`;
  return `React Plumber  ${basename(report.root)} · ${theme} · ${number(Object.values(report.files).reduce((sum, n) => sum + n, 0))} files · ${(report.timing.totalMs / 1000).toFixed(1)}s`;
}

export function formatCheck(report: Report, filters: DetailFilters = {}, verbose = false): string {
  if (filters.all && Object.entries(filters).every(([key, value]) => key === 'all' || value === undefined || value === false)) return formatAll(report, verbose);
  if (Object.values(filters).some(value => value !== undefined && value !== false)) {
    const hints = filters.rule === 'config' && !filters.broken && !filters.file && !filters.new && !filters.debt
      ? Object.entries(report.configHints ?? {}).filter(([family]) => !filters.family || family === filters.family).map(([, hint]) => hint) : [];
    return header(report) + '\n\n' + detail(report, select(report, filters), verbose) +
      (hints.length ? '\n\nSetup\n' + hints.map(hint => `  ${hint}`).join('\n') : '') + '\n';
  }
  const lines = [header(report), '', 'On your tokens'];
  const judged = families.filter(family => report.coverage[family].total > 0)
    .sort((a, b) => report.coverage[a].fromDecisions / report.coverage[a].total - report.coverage[b].fromDecisions / report.coverage[b].total);
  for (const family of judged) {
    const coverage = report.coverage[family];
    const percent = Math.round(coverage.fromDecisions / coverage.total * 100);
    const fill = Math.round(percent / 5);
    const bar = process.stdout.isTTY && process.env.NO_COLOR === undefined ? `${'█'.repeat(fill)}${'░'.repeat(20 - fill)}  ` : '';
    lines.push(`  ${family.padEnd(9)} ${bar}${String(percent).padStart(3)}%  ${number(coverage.findings)} off`);
  }
  if (!judged.length) lines.push('  No token values to judge.');
  const fix: string[] = [];
  const findings = report.findings;
  const brokenCount = findings.filter(broken).length;
  const gapCount = findings.filter(setup).length + Object.keys(report.configHints ?? {}).length;
  const overrides = findings.filter(override).length;
  if (brokenCount) fix.push(`  ✗ ${count(brokenCount, 'broken style')}  plumber check --broken`);
  if (gapCount) fix.push(`  ! ${count(gapCount, 'setup gap')}  plumber check --rule config`);
  if (overrides) fix.push(`  · ${count(overrides, 'component override')}  plumber check --rule ownership`);
  const off = findings.filter(offToken);
  if (off.length) {
    // Class/value counts use distinct authored sites, so text-xs isn't counted twice for size and leading.
    const sites = new Map<string, Set<string>>();
    for (const finding of off) for (const site of finding.sites) {
      const text = site.text.replace(/\s+/g, ' ').trim();
      const entries = sites.get(text) ?? new Set<string>();
      entries.add(`${site.file}:${site.line}:${site.column}`); sites.set(text, entries);
    }
    fix.push(`  · ${count(off.length, 'value')} off your tokens  plumber check --rule provenance`);
    const top = [...sites].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 4);
    fix.push('    ' + top.map(([text, sites]) => `${text.length > 32 ? text.slice(0, 31) + '…' : text} ${number(sites.size)}`).join(' · '));
  }
  if (fix.length) lines.push('', 'Fix first', ...fix);
  if (!report.ledger?.exists) {
    lines.push('', 'This is your first run, so all of this counts as new.',
      '  plumber baseline      record today\'s drift as debt; from then on only new drift fails',
      '  Alt+B in dev          see every drift on the page and fix it there');
  } else {
    const newFindings = select(report, { new: true });
    const shown = newFindings.slice(0, 20);
    lines.push('', `${count(newFindings.length, 'new finding')}`, detail(report, shown, verbose, false));
    if (newFindings.length > shown.length) lines.push(`+${newFindings.length - shown.length} more: plumber check --new`);
    const debt = select(report, { debt: true }).length;
    lines.push('', `Known debt: ${count(debt, 'finding')}, unchanged (plumber check --debt)`);
    const example = acceptExample(report, shown);
    if (example) lines.push(example);
  }
  if (verbose) {
    lines.push('', `files ${Object.entries(report.files).map(([kind, n]) => `${n} ${kind}`).join(', ')}`);
    lines.push(formatVerboseDetails(report).trimEnd(), formatDeadSummary(report.deadDecisions).trimEnd());
  }
  const allLines = formatAll(report).trimEnd().split('\n').length;
  lines.push('', `More: --all (every finding, ${number(allLines)} lines) · --family <name> · --file <path> · --json`);
  return lines.join('\n') + '\n';
}

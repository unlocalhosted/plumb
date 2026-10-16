import { basename, isAbsolute, relative } from 'node:path';
import picomatch from 'picomatch';
import { count } from './messages.js';
import { formatText, formatVerboseDetails } from './report.js';
import { findingContext, findingLines, renderFindingLines } from './cli-findings.js';
import { shorten, table, visibleWidth, wrap } from './cli-table.js';
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

// Keep --all's selection and ordering; layer 3 changes its drawing too.
export function formatAll(report: Report, verbose = false): string {
  return wrap(formatText(report, verbose) + (verbose ? formatDeadSummary(report.deadDecisions) : '') +
    Object.entries(report.configHints ?? {}).map(([family, hint]) => `\nSetup  ${family}: ${hint}\n`).join('') +
    (!report.config.path && !report.ledger?.exists ? '\nNext: run plumber init to write your token sources and record today\'s findings as debt, so CI only fails on new ones.\n' : report.ledger ? `\nledger  ${report.ledger.message}\n` : ''));
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
  return findingContext(findings.filter(finding => !quiet(finding)).map(finding => ({ ...finding, because: '' })), file => relative(report.root, file)).trim();
}

function detail(report: Report, findings: Finding[], verbose: boolean, accept = true): string {
  if (!findings.length) return 'no findings';
  const path = (file: string) => relative(report.root, file) || '.';
  const context = findingContext(findings, path, verbose, accept);
  return renderFindingLines(findingLines(findings), path, verbose) + (context ? '\n\n' + context : '');
}

function header(report: Report): string {
  const theme = report.tailwind.entry === null ? 'plain CSS' : `Tailwind ${report.tailwind.version?.split('.').slice(0, 2).join('.') ?? 'unknown'} · theme ${relative(report.root, report.tailwind.entry)}`;
  return wrap(`React Plumber  ${basename(report.root)} · ${theme} · ${number(Object.values(report.files).reduce((sum, n) => sum + n, 0))} files · ${(report.timing.totalMs / 1000).toFixed(1)}s`);
}

export function formatCheck(report: Report, filters: DetailFilters = {}, verbose = false): string {
  if (filters.all && Object.entries(filters).every(([key, value]) => key === 'all' || value === undefined || value === false)) return formatAll(report, verbose);
  if (Object.values(filters).some(value => value !== undefined && value !== false)) {
    const hints = filters.rule === 'config' && !filters.broken && !filters.file && !filters.new && !filters.debt
      ? Object.entries(report.configHints ?? {}).filter(([family]) => !filters.family || family === filters.family).map(([, hint]) => hint) : [];
    return header(report) + '\n\n' + detail(report, select(report, filters), verbose || !!filters.rule) +
      (hints.length ? '\n\nSetup\n' + hints.map(hint => wrap(`  ${hint}`)).join('\n') : '') + '\n';
  }
  const lines = [header(report), '', 'On your tokens'];
  const judged = families.filter(family => report.coverage[family].total > 0)
    .sort((a, b) => report.coverage[a].fromDecisions / report.coverage[a].total - report.coverage[b].fromDecisions / report.coverage[b].total);
  const coverageRows = judged.map(family => {
    const coverage = report.coverage[family];
    const percent = Math.round(coverage.fromDecisions / coverage.total * 100);
    const fill = Math.round(percent / 5);
    const bar = process.stdout.isTTY && process.env.NO_COLOR === undefined ? `${'█'.repeat(fill)}${'░'.repeat(20 - fill)}  ` : '';
    return [family, bar.trimEnd(), `${percent}%`, `${number(coverage.findings)} off`];
  });
  const bars = process.stdout.isTTY && process.env.NO_COLOR === undefined;
  const offWidth = Math.max(1, ...coverageRows.map(row => visibleWidth(row[3]!)));
  lines.push(...table(coverageRows.map(row => bars ? row : [row[0]!, row[2]!, row[3]!]), bars
    ? [{ width: 9 }, { width: 20 }, { width: 4, align: 'right' }, { width: offWidth, align: 'right', ink: 'dim' }]
    : [{ width: 9 }, { width: 4, align: 'right' }, { width: offWidth, align: 'right', ink: 'dim' }],
  { width: 2 + 9 + 4 + offWidth + (bars ? 26 : 4) }));
  if (!judged.length) lines.push('  No token values to judge.');
  const fix: string[][] = [];
  const findings = report.findings;
  const brokenCount = findings.filter(broken).length;
  const gapCount = findings.filter(setup).length + Object.keys(report.configHints ?? {}).length;
  const overrides = findings.filter(override).length;
  if (brokenCount) fix.push([`✗ ${count(brokenCount, 'broken style')}`, 'the browser drops them', 'plumber check --broken']);
  if (gapCount) fix.push([`! ${count(gapCount, 'setup gap')}`, report.configHints?.type ? "type roles aren't configured" : 'tokens are missing or unreadable', 'plumber check --rule config']);
  if (overrides) fix.push([`· ${count(overrides, 'component override')}`, 'callers restyle your components', 'plumber check --rule ownership']);
  const off = findings.filter(offToken);
  if (off.length) {
    // Class/value counts use distinct authored sites, so text-xs isn't counted twice for size and leading.
    const sites = new Map<string, Set<string>>();
    for (const finding of off) for (const site of finding.sites) {
      const text = site.text.replace(/\s+/g, ' ').trim();
      const entries = sites.get(text) ?? new Set<string>();
      entries.add(`${site.file}:${site.line}:${site.column}`); sites.set(text, entries);
    }
    const most = families.reduce((best, family) => report.coverage[family].findings > report.coverage[best].findings ? family : best, families[0]);
    fix.push([`· ${count(off.length, 'value')} off your tokens`, `most in ${most}`, 'plumber check --rule provenance']);
    const top = [...sites].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 4);
    if (fix.length) lines.push('', 'Fix first', ...table(fix.map(row => row.map((text, i) => ({ text, ...(i === 0 ? { ink: row[0]!.startsWith('✗') ? 'red' as const : 'amber' as const } : {}) }))), [{ weight: 1 }, { weight: 1 }, { width: 32 }]));
    lines.push(...table([[top.map(([text, sites]) => `${shorten(text, 32)} ${number(sites.size)}`).join(' · ')]], [{ weight: 1, ink: 'dim' }], { indent: 4 }));
  }
  if (!off.length && fix.length) lines.push('', 'Fix first', ...table(fix.map(row => row.map((text, i) => ({ text, ...(i === 0 ? { ink: row[0]!.startsWith('✗') ? 'red' as const : 'amber' as const } : {}) }))), [{ weight: 1 }, { weight: 1 }, { width: 32 }]));
  if (!report.ledger?.exists) {
    lines.push('', 'This is your first run, so all of this counts as new.',
      '  plumber baseline      record today\'s drift as debt; from then on only new drift fails',
      '  Alt+B in dev          see every drift on the page and fix it there');
  } else {
    const newFindings = select(report, { new: true });
    const groups = findingLines(newFindings), shownGroups = groups.slice(0, 20);
    const shown = [...new Set(shownGroups.flatMap(group => group.findings.map(finding => ({ ...finding, sites: group.sites.filter(site => finding.sites.includes(site)) }))))];
    const path = (file: string) => relative(report.root, file) || '.';
    lines.push('', `${count(groups.length, 'new finding')}`, groups.length ? renderFindingLines(shownGroups, path, verbose) : 'no findings');
    const context = findingContext(shown, path, verbose, false);
    if (context) lines.push('', context);
    if (groups.length > shownGroups.length) lines.push(`+${groups.length - shownGroups.length} more: plumber check --new`);
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
  return wrap(lines.join('\n')) + '\n';
}

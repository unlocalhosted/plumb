import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { readLedger } from '../ledger/store.js';
import { judgedFamilies } from '../rules/families.js';
import type { Report } from '../report.js';
import { pathFor } from './sites.js';

export interface TrendCoverage {
  fromDecisions: number;
  total: number;
  findings: number;
  governed: boolean;
  percent: number | null;
}
export interface TrendRecord {
  schemaVersion: 1;
  commit: string | null;
  date: string;
  dirty: boolean;
  coverage: Record<string, TrendCoverage>;
  findings: Record<string, { groups: number; sites: number }>;
  ledger: { entries: number; decisions: number; new: number; debt: number; exceptions: number; stale: number; growth: number; outOfScope: number };
  changes: { new: number; fixed: number; debt: number; exceptions: number };
  /** Authored keys and physical counts allow deltas without historical checkouts. */
  identities: Record<string, number>;
}
const round = (n: number) => Math.round(n * 10) / 10;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;

function validateRecord(value: unknown): value is TrendRecord {
  if (!object(value) || value.schemaVersion !== 1 || !(value.commit === null || typeof value.commit === 'string' && /^[a-f0-9]{40,64}$/.test(value.commit)) ||
      typeof value.date !== 'string' || !Number.isFinite(Date.parse(value.date)) || typeof value.dirty !== 'boolean' ||
      !object(value.coverage) || !object(value.findings) || !object(value.identities) || !object(value.ledger) || !object(value.changes)) return false;
  if (!judgedFamilies.every(family => object(value.coverage) && object(value.coverage[family]))) return false;
  return Object.values(value.coverage).every(c => object(c) && ['fromDecisions', 'total', 'findings'].every(key => count(c[key])) &&
      typeof c.governed === 'boolean' && (c.percent === null || typeof c.percent === 'number' && Number.isFinite(c.percent) && c.percent >= 0 && c.percent <= 100)) &&
    Object.values(value.findings).every(f => object(f) && count(f.groups) && count(f.sites)) && Object.values(value.identities).every(count) &&
    ['entries', 'decisions', 'new', 'debt', 'exceptions', 'stale', 'growth', 'outOfScope'].every(key => object(value.ledger) && count(value.ledger[key])) &&
    ['new', 'fixed', 'debt', 'exceptions'].every(key => object(value.changes) && count(value.changes[key]));
}

export async function readTrend(root: string): Promise<TrendRecord[]> {
  const path = join(root, 'plumb/trend.json');
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new UsageError('plumb/trend.json contains invalid JSON. Restore the recorded reports before writing another report.'); }
  if (!Array.isArray(parsed) || !parsed.every(validateRecord)) throw new UsageError('plumb/trend.json contains invalid report records. Restore the recorded reports before writing another report.');
  return parsed;
}

function gitState(root: string): { commit: string | null; dirty: boolean } {
  const git = (args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    const commit = git(['rev-parse', '--verify', 'HEAD']);
    // Generated reports and compiler caches do not make the measured source dirty.
    const dirty = !!git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ':(exclude)plumb', ':(exclude).plumb-cache', ':(exclude)node_modules']);
    return { commit, dirty };
  } catch { return { commit: null, dirty: true }; }
}

export async function recordTrend(report: Report): Promise<{ record: TrendRecord; trend: TrendRecord[] }> {
  const trend = await readTrend(report.root);
  const previous = trend.at(-1);
  const rules = new Map<string, { groups: number; sites: number }>();
  const identities = new Map<string, Set<string>>();
  for (const finding of report.findings) {
    const physical = new Set(finding.sites.map(site => `${pathFor(report, site.file)}:${site.line}:${site.column}:${site.text}`));
    const counts = rules.get(finding.rule) ?? { groups: 0, sites: 0 };
    counts.groups++; counts.sites += physical.size; rules.set(finding.rule, counts);
    if (['ledger', 'decisions'].includes(finding.family)) continue;
    for (const site of finding.sites) {
      const key = site.ledger?.key ?? `${finding.rule}:${pathFor(report, site.file)}:${site.anchor ?? ''}:${site.text}`;
      const locations = identities.get(key) ?? new Set<string>();
      locations.add(`${site.line}:${site.column}:${site.text}`); identities.set(key, locations);
    }
  }
  const current = Object.fromEntries([...identities].map(([key, sites]) => [key, sites.size]));
  const entries = (await readLedger(report.root)).entries;
  const ledger = { entries: entries.length, decisions: entries.filter(entry => entry.kind === 'decision').length,
    new: report.ledger?.new ?? 0, debt: report.ledger?.debt ?? 0, exceptions: report.ledger?.exceptions ?? 0,
    stale: report.ledger?.stale ?? 0, growth: report.ledger?.growth ?? 0, outOfScope: report.ledger?.outOfScope ?? 0 };
  const coverage = Object.fromEntries(judgedFamilies.map(family => {
    const c = report.coverage[family];
    const governed = report.decisions.some(d => d.family === family && d.origin !== 'framework');
    return [family, { ...c, governed, percent: governed && c.total ? round(c.fromDecisions / c.total * 100) : null }];
  }));
  const record: TrendRecord = { schemaVersion: 1, ...gitState(report.root), date: new Date().toISOString(), coverage,
    findings: Object.fromEntries([...rules].sort(([a], [b]) => a.localeCompare(b))), ledger, identities: current,
    changes: { new: previous ? Object.entries(current).reduce((n, [key, count]) => n + Math.max(0, count - (previous.identities[key] ?? 0)), 0) : ledger.new,
      fixed: previous ? Object.entries(previous.identities).reduce((n, [key, count]) => n + Math.max(0, count - (current[key] ?? 0)), 0) : 0,
      debt: ledger.debt, exceptions: ledger.exceptions } };
  trend.push(record);
  const directory = join(report.root, 'plumb');
  await mkdir(directory, { recursive: true });
  // Prepare both complete files before replacing either. Each rename is atomic.
  const temporary = (name: string) => join(directory, `${name}.${process.pid}.tmp`);
  try {
    await writeFile(temporary('report.json'), JSON.stringify(record, null, 2) + '\n');
    await writeFile(temporary('trend.json'), JSON.stringify(trend, null, 2) + '\n');
    await rename(temporary('report.json'), join(directory, 'report.json'));
    await rename(temporary('trend.json'), join(directory, 'trend.json'));
  } finally {
    await rm(temporary('report.json'), { force: true });
    await rm(temporary('trend.json'), { force: true });
  }
  return { record, trend };
}

export function trendSince(root: string, trend: TrendRecord[], ref: string): TrendRecord[] {
  let commit = ref;
  if (!/^[a-f0-9]{7,64}$/.test(ref)) {
    try { commit = execFileSync('git', ['-C', root, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
    catch { throw new UsageError(`Cannot resolve --since ${ref}. Use a recorded commit SHA or a valid Git ref.`); }
  }
  const matches = [...new Set(trend.flatMap(record => record.commit?.startsWith(commit) ? [record.commit] : []))];
  if (matches.length !== 1) throw new UsageError(`--since ${ref} must identify one commit recorded in plumb/trend.json.`);
  return trend.slice(trend.findIndex(record => record.commit === matches[0]));
}

export function trendMarkdown(trend: TrendRecord[]): string {
  const families = judgedFamilies.filter(family => trend.some(record => record.coverage[family]?.governed));
  const header = ['Commit', 'Date', ...families.flatMap(family => [family, `${family} delta (pp)`]), 'New', 'Fixed', 'Debt', 'Exceptions'];
  const rows = trend.map((record, index) => {
    const coverage = families.flatMap(family => {
      const value = record.coverage[family], previous = trend[index - 1]?.coverage[family];
      const delta = value?.percent != null && previous?.percent != null ? round(value.percent - previous.percent) : null;
      return [!value?.governed ? 'no tokens' : value.percent === null ? 'no declarations' : `${value.percent}%`, delta === null ? '' : `${delta >= 0 ? '+' : ''}${delta}`];
    });
    return [record.commit ? `${record.commit.slice(0, 12)}${record.dirty ? ' (working tree)' : ''}` : 'no commit', record.date.slice(0, 10), ...coverage,
      record.changes.new, record.changes.fixed, record.changes.debt, record.changes.exceptions];
  });
  return '# Plumb trend\n\n' + (trend.length ? [header, header.map(() => '---'), ...rows].map(row => `| ${row.join(' | ')} |`).join('\n') : 'No reports recorded. Run plumb report to record coverage.') + '\n';
}

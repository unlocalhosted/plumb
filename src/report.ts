import { relative } from 'node:path';
import { readFileSync } from 'node:fs';

export const tool = {
  name: 'plumb' as const,
  version: (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version,
};

export type Family = 'spacing' | 'color' | 'radius' | 'type' | 'motion' | 'elevation' | 'size' | 'z' | 'opacity';
export type Origin = 'project' | 'framework' | 'inferred';
export type Tier = 'primitive' | 'semantic';

export interface Site {
  file: string;
  line: number;
  column: number;
  text: string;
}

export interface Condition {
  kind: 'media' | 'pseudo' | 'selector' | 'container' | 'supports' | 'branch';
  text: string;
}

export interface Declaration {
  prop: string;
  value: string;
  resolved?: string;
  refs: string[];
  when: Condition[];
  site: Site;
  owner: { kind: 'element' | 'component'; name: string };
  origin: 'class' | 'arbitrary' | 'stylesheet' | 'apply' | 'inline' | 'custom-property';
  opaque?: 'dynamic-value' | 'dynamic-class' | 'spread';
}

export interface Decision {
  family: Family;
  name: string;
  value: string;
  refs: string[];
  origin: Origin;
  tier: Tier;
  why: string;
  source: string;
}

export interface Finding {
  key: string;
  rule: string;
  family: string;
  severity: 'info' | 'warn' | 'error';
  sites: Site[];
  declaration: Declaration;
  decisions: Decision[];
  why: string;
  fix: string;
}

export interface FileCounts {
  tsx: number;
  jsx: number;
  css: number;
  other: number;
}

export interface FamilyCoverage {
  fromDecisions: number;
  total: number;
  findings: number;
  debt: number;
  exceptions: number;
}

export interface Report {
  schemaVersion: 1;
  tool: { name: 'plumb'; version: string };
  root: string;
  config: { path: string | null; inferred: boolean };
  tailwind: { entry: string | null; version: string | null };
  files: FileCounts;
  findings: Finding[];
  notes: string[];
  coverage: { existence: { total: number; dead: number } };
  classes: { unique: number; opaque: number };
  timing: { totalMs: number; phases: { discover: number; parse: number; collect: number; load: number; compile: number }; cacheHits: number; cacheMisses: number };
}

export function formatText(report: Report, verbose = false): string {
  const path = (file: string) => relative(report.root, file) || '.';
  const tailwind = report.tailwind.entry === null
    ? 'plain CSS'
    : `tailwind ${report.tailwind.version ?? 'not installed'}  theme ${path(report.tailwind.entry)}`;
  const { tsx, jsx, css, other } = report.files;
  const findings = report.findings.map(finding => `${finding.rule}  ${finding.declaration.value}\n  ${finding.fix}\n` +
    finding.sites.map(site => `  ${path(site.file)}:${site.line}:${site.column}  ${site.text}`).join('\n')).join('\n\n');
  return `plumb ${report.tool.version}  ${report.root}  ${tailwind}\n` +
    `files ${tsx} tsx, ${jsx} jsx, ${css} css, ${other} other  ${report.timing.totalMs.toFixed(1)}ms\n\n` +
    `${findings || 'no findings'}\n\n` +
    (verbose ? report.notes.map(note => `note: ${note}\n`).join('') : '') +
    `existence ${report.coverage.existence.total} class tokens, ${report.coverage.existence.dead} dead  ${report.findings.length} findings  ${report.classes.opaque} opaque\n` +
    `timing ${Object.entries(report.timing.phases).map(([phase, ms]) => `${phase} ${ms.toFixed(1)}ms`).join(', ')}  cache ${report.timing.cacheHits} hits, ${report.timing.cacheMisses} misses\n`;
}

import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadConfig } from './config.js';
import { errorMessage, UsageError } from './errors.js';
import { collectClasses } from './collect/classes.js';
import type { ClassSite } from './collect/classes.js';
import { lowerTailwind } from './lower/tailwind.js';
import { cssClasses, existence, location } from './rules/existence.js';
import { discoverProject, sourceFiles } from './project.js';
import { tool } from './report.js';
import type { Report } from './report.js';

export { defineConfig } from './config.js';
export type { PlumbConfig, DecisionSource, ComponentContract, CustomHabit } from './config.js';
export type { Report, Finding, Declaration, Decision, Site, Condition, Family, FamilyCoverage } from './report.js';

export interface CheckOptions {
  root?: string;
  config?: string;
}

async function analyze(options: CheckOptions): Promise<{ report: Report; sites: ExplainedClassSite[] }> {
  const start = performance.now();
  const root = resolve(options.root ?? process.cwd());
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('expected a directory');
  } catch (error) {
    throw new UsageError(`Set --root to an existing project directory: ${root}: ${errorMessage(error)}`);
  }
  const config = await loadConfig(root, options.config);
  const discoverStart = performance.now();
  let project: Awaited<ReturnType<typeof discoverProject>>;
  try {
    project = await discoverProject(root, config.value);
  } catch (error) {
    if (error instanceof UsageError) throw error;
    throw new UsageError(`Fix project files under ${root}: ${errorMessage(error)}`);
  }
  const discover = performance.now() - discoverStart;
  const collected = await collectClasses(await sourceFiles(root, config.value), config.value.classHelpers);
  const unique = [...new Set(collected.sites.filter(site => !site.opaque).map(site => site.token))].sort();
  const lowered = await lowerTailwind(root, project.tailwind.entry, project.tailwind.version, unique);
  const css = await cssClasses(root);
  const findings = existence(collected.sites, lowered.candidates, css.classes, config.value.markers ?? [], lowered.suggestions);
  const sites = collected.sites.map(site => {
    const candidate = lowered.candidates.get(site.token);
    return { ...site, declarations: (candidate?.declarations ?? []).map(declaration => ({
      ...declaration, when: [...site.conditions, ...declaration.when], refs: [...new Set([...declaration.value.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]!))],
      site: location(site), owner: site.owner, origin: 'class' as const,
    })), notes: candidate?.notes ?? [] };
  });
  const report: Report = {
    schemaVersion: 1,
    tool,
    root,
    config: { path: config.path, inferred: config.path === null },
    ...project,
    findings,
    notes: [...css.notes, ...[...lowered.candidates].flatMap(([token, result]) => result.notes.map(note => `${token}: ${note}`))],
    coverage: { existence: { total: collected.sites.filter(site => !site.opaque).length,
      dead: findings.filter(finding => finding.rule === 'existence/dead-class').reduce((count, finding) => count + finding.sites.length, 0) } },
    classes: { unique: unique.length, opaque: collected.opaque },
    timing: { totalMs: performance.now() - start, phases: { discover, parse: collected.parseMs, collect: collected.collectMs, load: lowered.loadMs, compile: lowered.compileMs }, cacheHits: lowered.cacheHits, cacheMisses: lowered.cacheMisses },
  };
  return { report, sites };
}

export interface ExplainedClassSite extends ClassSite { declarations: import('./report.js').Declaration[]; notes: string[] }
export async function check(options: CheckOptions = {}): Promise<Report> {
  return (await analyze(options)).report;
}
export async function explain(file: string, options: CheckOptions = {}): Promise<{ root: string; file: string; sites: ExplainedClassSite[]; opaque: number }> {
  const { report, sites } = await analyze(options);
  const absolute = resolve(report.root, file);
  return { root: report.root, file: absolute, sites: sites.filter(site => site.file === absolute), opaque: report.classes.opaque };
}

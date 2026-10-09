import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadConfig } from './config.js';
import { errorMessage, UsageError } from './errors.js';
import { collectClasses } from './collect/classes.js';
import type { ClassSite } from './collect/classes.js';
import { lowerTailwind } from './lower/tailwind.js';
import { existence, location, unreachableClasses, deadVariables } from './rules/existence.js';
import { cssCode, collectStylesheets } from './collect/stylesheets.js';
import { collectModules } from './collect/modules.js';
import { lowerStylesheets } from './lower/stylesheets.js';
import { references } from './collect/source.js';
import { discoverProject, projectSourceFiles } from './project.js';
import { readDecisions } from './decisions/index.js';
import { provenance } from './rules/provenance.js';
import { tool } from './report.js';
import type { Declaration, Report } from './report.js';
import { applyLedger } from './ledger/check.js';
import type { LedgerOptions } from './ledger/types.js';
export type { LedgerEntry, LedgerSummary } from './ledger/types.js';

export { defineDecisions } from './decisions/index.js';
export type { DecisionInput } from './decisions/index.js';
export { defineConfig } from './config.js';
export type { PlumbConfig, DecisionSource, ComponentContract, CustomHabit } from './config.js';
export type { Report, Finding, Declaration, Decision, Site, Condition, Family, FamilyCoverage, JudgedFamily, ProvenanceCoverage } from './report.js';

export interface CheckOptions extends LedgerOptions {
  root?: string;
  config?: string;
  /** Inspection/mutation commands need the full, unclassified rule output. */
  ledger?: boolean;
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
  const files = await projectSourceFiles(root, config.value);
  const collected = await collectClasses(files.filter(file => /\.[jt]sx?$/.test(file)), config.value.classHelpers);
  const unique = [...new Set(collected.sites.filter(site => !site.opaque).map(site => site.token))].sort();
  const lowered = await lowerTailwind(root, project.tailwind.entry, project.tailwind.version, unique);
  const stylesheetStart = performance.now();
  const modules = await collectModules(root, collected.modules);
  const graph = await collectStylesheets(project.tailwind.entry, files, modules.imports);
  const moduleCss = new Set<string>();
  function reachedCss(file: string): void {
    if (moduleCss.has(file)) return;
    moduleCss.add(file);
    for (const item of graph.files.get(file)?.imports ?? []) reachedCss(item.file);
  }
  for (const sheet of graph.files.values()) if (sheet.reached.some(reach => reach.kind === 'module')) reachedCss(sheet.file);
  modules.counts.cssFiles = moduleCss.size;
  const css = await lowerStylesheets(root, project.tailwind.entry, project.tailwind.version, graph, collected.styles.stylesheets);
  const stylesheetsMs = performance.now() - stylesheetStart;
  const findings = existence(collected.sites, lowered.candidates, new Set(css.classes), config.value.markers ?? [], lowered.suggestions);
  const unreachable = await unreachableClasses(root, new Set(graph.files.keys()), findings.filter(finding => finding.rule === 'existence/dead-class').map(finding => finding.declaration.value));
  for (const finding of findings) {
    const file = unreachable.get(finding.declaration.value);
    if (file) finding.fix = `${finding.declaration.value} is declared in ${file}, which nothing imports. Import that stylesheet or include it in source globs.`;
  }
  const sites = collected.sites.map(site => {
    const candidate = lowered.candidates.get(site.token);
    return { ...site, declarations: (candidate?.declarations ?? []).map(declaration => ({
      ...declaration, when: [...site.conditions, ...declaration.when], refs: references(declaration.value),
      site: location(site), owner: site.owner, origin: /(?:^|:)(?:-?[\w-]+-)?\[.+\](?:\/.+)?!?$/.test(site.token) ? 'arbitrary' as const : 'class' as const, sourceOrigin: 'project' as const,
      authoredValue: candidate?.authoredValue ?? false,
    })), notes: candidate?.notes ?? [] };
  });
  // Import-graph files outside source globs prove existence; only source sites
  // enter the shared declaration set for provenance and later judging rules.
  const sourceFiles = new Set(files);
  const declarations: Declaration[] = [...sites.flatMap(site => site.declarations), ...css.declarations, ...collected.styles.declarations]
    .filter(declaration => sourceFiles.has(declaration.site.file));
  const decisionsStart = performance.now();
  const record = await readDecisions(root, config.value, graph, lowered.theme);
  const decisionsMs = performance.now() - decisionsStart;
  const provenanceStart = performance.now();
  const defined = new Set([...record.defined, ...collected.styles.definedVariables,
    ...[...sites.flatMap(site => site.declarations), ...css.declarations, ...collected.styles.declarations].filter(d => d.prop.startsWith('--')).map(d => d.prop)]);
  for (const sheet of collected.styles.stylesheets) for (const match of cssCode(sheet.css).matchAll(/@property\s+(--[\w-]+)/g)) defined.add(match[1]!);
  for (const candidate of lowered.candidates.values()) for (const match of cssCode(candidate.css ?? '').matchAll(/(?:@property\s+|[;{]\s*)(--tw-[\w-]+)(?=\s*[:{])/g)) defined.add(match[1]!);
  findings.push(...deadVariables(declarations, defined, record.theme));
  const judged = provenance(declarations, record, config.value, sourceFiles);
  findings.push(...judged.findings);
  const provenanceMs = performance.now() - provenanceStart;
  const origins: Report['coverage']['declarations'] = { class: 0, arbitrary: 0, stylesheet: 0, apply: 0, inline: 0, 'custom-property': 0, keyframes: 0 };
  for (const declaration of declarations) origins[declaration.origin]++;
  const stylesheetCounts: Report['coverage']['stylesheets'] = { entry: 0, import: 0, reference: 0, 'side-effect': 0, module: 0, source: 0, 'jsx-style': 0 };
  const stylesheets: Report['stylesheets'] = [...graph.files.values()].map(sheet => ({ file: sheet.file, sourceOrigin: sheet.sourceOrigin, ...(sheet.package ? { package: sheet.package } : {}), reached: sheet.reached }));
  for (const sheet of collected.styles.stylesheets) stylesheets.push({ file: sheet.source.file, sourceOrigin: 'project', reached: [{ kind: 'jsx-style' }] });
  for (const sheet of stylesheets) for (const kind of new Set(sheet.reached.map(reach => reach.kind))) stylesheetCounts[kind]++;
  const report: Report = {
    schemaVersion: 1,
    tool,
    root,
    config: { path: config.path, inferred: config.path === null },
    ...project,
    findings,
    decisions: record.decisions,
    decisionInventory: record.inventory ?? [],
    declarations,
    stylesheets,
    moduleGraph: modules.counts,
    notes: [...modules.notes, ...css.notes, ...[...lowered.candidates].flatMap(([token, result]) => result.notes.map(note => `${token}: ${note}`))],
    coverage: { ...judged.coverage, existence: { total: collected.sites.filter(site => !site.opaque).length,
      deadVars: findings.filter(f => f.rule === 'existence/dead-var').reduce((n,f) => n + f.sites.length, 0),
      dead: findings.filter(finding => finding.rule === 'existence/dead-class').reduce((count, finding) => count + finding.sites.length, 0) }, declarations: origins, stylesheets: stylesheetCounts,
      inline: { sites: collected.styles.sites.length, literalSites: collected.styles.sites.filter(site => site.literal).length,
        opaque: collected.styles.declarations.filter(declaration => declaration.opaque).length,
        fullyOpaque: collected.styles.declarations.filter(declaration => declaration.prop === '*' && declaration.opaque).length,
        spreads: collected.styles.declarations.filter(declaration => declaration.opaque === 'spread').length } },
    classes: { unique: unique.length, opaque: collected.opaque },
    timing: { totalMs: performance.now() - start, phases: { discover, parse: collected.parseMs, collect: collected.collectMs, load: lowered.loadMs, compile: lowered.compileMs, stylesheets: stylesheetsMs, inline: collected.inlineMs, decisions: decisionsMs, provenance: provenanceMs }, cacheHits: lowered.cacheHits, cacheMisses: lowered.cacheMisses },
  };
  return { report, sites };
}

export interface ExplainedClassSite extends ClassSite { declarations: import('./report.js').Declaration[]; notes: string[] }
export async function check(options: CheckOptions = {}): Promise<Report> {
  const { report } = await analyze(options);
  return options.ledger === false ? report : applyLedger(report, options);
}
export async function explain(file: string, options: CheckOptions = {}): Promise<{ root: string; file: string; sites: ExplainedClassSite[]; declarations: Declaration[]; opaque: number }> {
  const { report, sites } = await analyze(options);
  const absolute = resolve(report.root, file);
  return { root: report.root, file: absolute, sites: sites.filter(site => site.file === absolute), declarations: report.declarations.filter(declaration => declaration.site.file === absolute), opaque: report.classes.opaque };
}

import type { AnalysisRuntime } from './session/runtime.js';
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
import type { SourceProgram } from './collect/source.js';
import { discoverProject, projectSourceFiles } from './project.js';
import { readDecisions } from './decisions/index.js';
import { provenance } from './rules/provenance.js';
import { cachedComponents, discoverComponents } from './ownership/components.js';
import { judgeOwnership } from './ownership/judge.js';
import { judgeHabits } from './habits/index.js';
import { judgeImitation, suggestImitation } from './imitation/index.js';
import { tool } from './report.js';
import type { Declaration, Report } from './report.js';
import { applyLedger } from './ledger/check.js';
import type { LedgerOptions } from './ledger/types.js';
import { deadDecisions } from './rules/dead.js';
import { prepareSnippet } from './try.js';
import type { TryOptions, Snippet } from './try.js';
import { profileDuration, profileProgress } from './profile.js';
import { suggestionCache } from './rules/suggestions.js';
import { uniqueDiagnostics } from './diagnostics.js';
import { CheckCache } from './check-cache.js';
import { finishMessages } from './messages.js';
import { checkingPlainCss, looksLikeTailwind } from './setup-messages.js';
export type { TryOptions } from './try.js';
export type { LedgerEntry, LedgerSummary } from './ledger/types.js';

export { defineDecisions } from './decisions/index.js';
export type { DecisionInput } from './decisions/index.js';
export { definePreset } from './presets/index.js';
export type { Preset, PresetSelection, PresetSummary } from './presets/index.js';
export { defineConfig } from './config.js';
export type { HabitPredicate, ConditionPredicates, HabitSeverity } from './habits/predicates.js';
export type { HabitSummary, BuiltinHabit } from './habits/index.js';
export type { PlumbConfig, DecisionSource, ComponentContract, CustomHabit, ClassHelper, ClassHelperInput } from './config.js';
export type { Report, Finding, Declaration, Decision, Site, Condition, Family, FamilyCoverage, JudgedFamily, ProvenanceCoverage } from './report.js';

export interface CheckOptions extends LedgerOptions {
  /** Expand equal-value token warnings to individual findings. */
  verbose?: boolean;
  root?: string;
  config?: string;
  /** Inspection/mutation commands need the full, unclassified rule output. */
  ledger?: boolean;
  /** Evaluate all built-ins for the habits inspection command. */
  listHabits?: boolean;
  /** Report candidate fingerprints without enabling or persisting them. */
  suggestImitation?: boolean;
}

export async function analyze(options: CheckOptions, snippet?: Snippet, runtime?: AnalysisRuntime): Promise<{ report: Report; sites: ExplainedClassSite[] }> {
  const phase = <T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T> => runtime ? runtime.phase(name, inputs, compute) : Promise.resolve(compute());
  const sync = <T>(name: string, inputs: unknown[], compute: () => T): T => runtime ? runtime.sync(name, inputs, compute) : compute();
  const start = performance.now();
  const root = resolve(options.root ?? process.cwd());
  profileProgress('phase:config');
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('expected a directory');
  } catch (error) {
    throw new UsageError(`Set --root to an existing project directory: ${root}: ${errorMessage(error)}`);
  }
  const config = await phase('config', [root, options.config], () => loadConfig(root, options.config));
  profileDuration('phase:config', performance.now() - start);
  const input = snippet ? prepareSnippet(root, config.value, snippet) : undefined;
  const discoverStart = performance.now();
  profileProgress('phase:discover');
  let project: Awaited<ReturnType<typeof discoverProject>>;
  try {
    project = await phase('project', [root, config.value], () => discoverProject(root, config.value, runtime?.inventory));
  } catch (error) {
    if (error instanceof UsageError) throw error;
    throw new UsageError(`Fix project files under ${root}: ${errorMessage(error)}`);
  }
  const discover = performance.now() - discoverStart;
  if (input?.file === project.tailwind.entry) throw new UsageError('--as must name a source file other than the Tailwind entry.');
  if (input) project.files = { tsx: input.lang === 'tsx' ? 1 : 0, jsx: 0, css: input.lang === 'css' ? 1 : 0, other: 0 };
  const filesStart = performance.now();
  profileProgress('phase:source-files', { files: Object.values(project.files).reduce((sum, count) => sum + count, 0) });
  const files = await phase('files', [root, config.value], () => projectSourceFiles(root, config.value, runtime?.inventory));
  profileDuration('phase:source-files', performance.now() - filesStart);
  if (input && !files.includes(input.file)) files.push(input.file);
  const componentCacheStart = performance.now();
  const previousComponents = input || runtime ? undefined : cachedComponents(root, files, config.value, !!options.suggestImitation);
  const componentCacheMs = performance.now() - componentCacheStart;
  const programs = previousComponents || runtime ? undefined : new Map<string, SourceProgram>();
  profileProgress('phase:parse');
  const collected = await phase('collect', [files, config.value.classHelpers, input], () => collectClasses(files.filter(file => input?.file === file ? input.lang === 'tsx' : /\.[jt]sx?$/.test(file)), config.value.classHelpers,
    input ? new Map([[input.file, input.text]]) : undefined, input?.file, programs, input || runtime ? undefined : root));
  if (input) {
    collected.sites = collected.sites.filter(site => site.file === input.file);
    collected.styles.sites = collected.styles.sites.filter(site => site.site.file === input.file);
  }
  const unique = [...new Set(collected.sites.filter(site => !site.opaque).map(site => site.token))].sort();
  profileProgress('phase:load', { entry: project.tailwind.entry });
  const lowered = await phase('tailwind', [root, project.tailwind.entry, project.tailwind.version, unique, options.listHabits === true || config.value.habits?.includes('hover-gate') === true], () => lowerTailwind(root, project.tailwind.entry, project.tailwind.version, unique, options.listHabits === true || config.value.habits?.includes('hover-gate') === true, !!input));
  const stylesheetStart = performance.now();
  profileProgress('phase:modules');
  const modules = await phase('modules', [root, collected.modules], () => collectModules(root, collected.modules, !!input || !!runtime));
  profileProgress('phase:stylesheet-graph');
  const graph = await phase('graph', [project.tailwind.entry, files, modules.imports, input], () => collectStylesheets(project.tailwind.entry, files, modules.imports,
    input?.lang === 'css' ? new Map([[input.file, input.text]]) : undefined));
  const moduleCss = new Set<string>();
  function reachedCss(file: string): void {
    if (moduleCss.has(file)) return;
    moduleCss.add(file);
    for (const item of graph.files.get(file)?.imports ?? []) reachedCss(item.file);
  }
  for (const sheet of graph.files.values()) if (sheet.reached.some(reach => reach.kind === 'module')) reachedCss(sheet.file);
  modules.counts.cssFiles = moduleCss.size;
  profileProgress('phase:stylesheets');
  const css = await phase('css', [root, project.tailwind.entry, project.tailwind.version, graph, collected.styles.stylesheets], () => lowerStylesheets(root, project.tailwind.entry, project.tailwind.version, graph, collected.styles.stylesheets, !!input || !!runtime));
  const stylesheetsMs = performance.now() - stylesheetStart;
  const existenceStart = performance.now();
  const ranking = await phase('ranking', [root, lowered.candidates, lowered.suggestions], () => suggestionCache(root, lowered.candidates, lowered.suggestions, !!input || !!runtime));
  const existenceSites = await checkingPlainCss(root, project.tailwind.entry) ? collected.sites.filter(site => !looksLikeTailwind(site.token)) : collected.sites;
  const findings = existence(existenceSites, lowered.candidates, new Set(css.classes), config.value.markers ?? [], lowered.suggestions, ranking.rankings);
  await ranking.save();
  const unreachable = await phase('unreachable', [root, graph, findings.filter(finding => finding.rule === 'existence/dead-class').map(finding => finding.declaration.value)], () => unreachableClasses(root, new Set(graph.files.keys()), findings.filter(finding => finding.rule === 'existence/dead-class').map(finding => finding.declaration.value), runtime?.inventory));
  for (const finding of findings) {
    const file = unreachable.get(finding.declaration.value);
    if (file) {
      finding.title = `\`${finding.declaration.value}\` is defined in ${file}, but nothing imports that file`;
      finding.action = `Import ${file} where \`${finding.declaration.value}\` is used, or move the rule.`;
    }
  }
  profileDuration('rule:existence/classes', performance.now() - existenceStart);
  const prepareStart = performance.now();
  profileProgress('phase:declarations');
  const sites = collected.sites.map(site => {
    const candidate = lowered.candidates.get(site.token);
    return sync('site', [site, candidate], () => ({ ...site, declarations: (candidate?.declarations ?? []).map(declaration => ({
      ...declaration, when: [...site.conditions, ...declaration.when], refs: references(declaration.value),
      site: location(site), owner: site.owner, origin: /(?:^|:)(?:-?[\w-]+-)?\[.+\](?:\/.+)?!?$/.test(site.token) ? 'arbitrary' as const : 'class' as const, sourceOrigin: 'project' as const,
      authoredValue: candidate?.authoredValue ?? false,
    })), notes: candidate?.notes ?? [] }));
  });
  // Imported helpers on a proven className path are authored styling inputs too.
  // Other import-graph files outside source globs still only prove existence.
  const sourceFiles = new Set(input ? [input.file] : [...files, ...collected.computedClassFiles ?? []]);
  const inlineDeclarations = collected.styles.declarations.filter(d => sourceFiles.has(d.site.file));
  const declarations: Declaration[] = [...sites.flatMap(site => site.declarations), ...css.declarations, ...collected.styles.declarations]
    .filter(declaration => sourceFiles.has(declaration.site.file));
  profileDuration('phase:declarations', performance.now() - prepareStart);
  const decisionsStart = performance.now();
  profileProgress('phase:decisions');
  const record = await phase('record', [root, config.value, graph, lowered.theme], () => readDecisions(root, config.value, graph, lowered.theme));
  const decisionsMs = performance.now() - decisionsStart;
  const provenanceStart = performance.now();
  profileProgress('phase:provenance', { declarations: declarations.length });
  const defined = new Set([...record.defined, ...collected.styles.definedVariables,
    ...[...sites.flatMap(site => site.declarations), ...css.declarations, ...collected.styles.declarations].filter(d => d.prop.startsWith('--')).map(d => d.prop)]);
  for (const sheet of collected.styles.stylesheets) for (const match of cssCode(sheet.css).matchAll(/@property\s+(--[\w-]+)/g)) defined.add(match[1]!);
  for (const candidate of lowered.candidates.values()) for (const match of cssCode(candidate.css ?? '').matchAll(/(?:@property\s+|[;{]\s*)(--tw-[\w-]+)(?=\s*[:{])/g)) defined.add(match[1]!);
  const variablesStart = performance.now();
  profileProgress('rule:existence/dead-var');
  findings.push(...sync('deadVariables', [declarations, defined, record.theme], () => deadVariables(declarations, defined, record.theme)));
  profileDuration('rule:existence/dead-var', performance.now() - variablesStart);
  profileProgress('rule:provenance');
  const judged = sync('provenance', [declarations, record, config.value, sourceFiles, options.verbose], () => provenance(declarations, record, config.value, sourceFiles, options.verbose));
  findings.push(...judged.findings);
  const deadStart = performance.now();
  profileProgress('rule:dead');
  const dead = input ? undefined : sync('deadDecisions', [declarations, record, config.value, judged.usedNumericSpacing], () => deadDecisions(root, declarations, record, config.value, judged.usedNumericSpacing));
  if (dead) findings.push(...dead.findings);
  profileDuration('rule:dead', performance.now() - deadStart);
  const provenanceMs = performance.now() - provenanceStart;
  const ownershipStart = performance.now();
  profileProgress('phase:components');
  const components = previousComponents ?? sync('components', [root, files, config.value, input], () => discoverComponents(root,
    files.filter(file => input?.file !== file || input.lang === 'tsx'), config.value,
    input?.lang === 'tsx' ? new Map([[input.file, input.text]]) : undefined, !!options.suggestImitation, programs, !!input || !!runtime));
  programs?.clear();
  profileDuration('phase:components', performance.now() - ownershipStart + componentCacheMs);
  const ownershipJudgeStart = performance.now();
  profileProgress('rule:ownership');
  const owned = sync('ownership', [declarations, components, config.value], () => judgeOwnership(declarations, components, config.value));
  profileDuration('rule:ownership', performance.now() - ownershipJudgeStart);
  findings.push(...owned.findings);
  const ownershipMs = performance.now() - ownershipStart + componentCacheMs;
  const habitsStart = performance.now();
  profileProgress('phase:habits');
  const contexts = new Map<Declaration, string>();
  for (const site of sites) for (const declaration of site.declarations) if (site.context) contexts.set(declaration, site.context);
  for (const inline of collected.styles.sites) for (const declaration of inline.declarations) contexts.set(declaration, `${inline.site.file}:${inline.site.line}:${inline.site.column}`);
  const habits = sync('habits', [declarations, config.value.habits ?? [], contexts, lowered.hoverVariants, options.listHabits], () => judgeHabits(declarations, config.value.habits ?? [], contexts, lowered.hoverVariants, options.listHabits));
  findings.push(...habits.findings);
  const habitsMs = performance.now() - habitsStart;
  const imitationStart = performance.now();
  findings.push(...sync('imitation', [components, collected.sites, declarations, config.value], () => judgeImitation(components, collected.sites, declarations, config.value)));
  profileDuration('rule:imitation', performance.now() - imitationStart);
  const origins: Report['coverage']['declarations'] = { class: 0, arbitrary: 0, stylesheet: 0, apply: 0, inline: 0, 'custom-property': 0, keyframes: 0 };
  for (const declaration of declarations) origins[declaration.origin]++;
  const stylesheetCounts: Report['coverage']['stylesheets'] = { entry: 0, import: 0, reference: 0, 'side-effect': 0, module: 0, source: 0, 'jsx-style': 0 };
  const stylesheets: Report['stylesheets'] = [...graph.files.values()].map(sheet => ({ file: sheet.file, sourceOrigin: sheet.sourceOrigin, ...(sheet.package ? { package: sheet.package } : {}), reached: sheet.reached }));
  for (const sheet of collected.styles.stylesheets) stylesheets.push({ file: sheet.source.file, sourceOrigin: 'project', reached: [{ kind: 'jsx-style' }] });
  for (const sheet of stylesheets) for (const kind of new Set(sheet.reached.map(reach => reach.kind))) stylesheetCounts[kind]++;
  const report: Report = {
    ...(judged.coverage.type.total && record.decisions.some(d => d.family === 'type' && d.origin !== 'framework') &&
      !record.decisions.some(d => d.family === 'type' && d.refs.some(ref => ref.startsWith('utility:type-'))) ? {
        configHints: { type: "Type roles aren't configured; type values are checked individually. Review decisions.type.from for your type tokens (for example, 'theme:--text-*')." },
      } : {}),
    schemaVersion: 1,
    tool,
    root,
    config: { path: config.path, inferred: config.path === null },
    tailwind: project.tailwind,
    files: project.files,
    findings: [...findings, ...uniqueDiagnostics([project.diagnostics, collected.diagnostics, modules.diagnostics, css.diagnostics, components.diagnostics,
      lowered.diagnostics.map(finding => {
        const site = collected.sites.find(site => site.token === finding.declaration.value);
        return site ? { ...finding, sites: [location(site)], declaration: { ...finding.declaration, site: location(site) } } : finding;
      })])],
    habits: habits.summaries,
    presets: config.presets ?? [],
    decisions: record.decisions,
    decisionInventory: record.inventory ?? [],
    ...(dead ? { deadDecisions: dead.counts } : {}),
    declarations,
    stylesheets,
    moduleGraph: modules.counts,
    notes: [...modules.notes, ...css.notes, ...[...lowered.candidates].flatMap(([token, result]) => result.notes.map(note => `${token}: ${note}`))],
    coverage: { ...judged.coverage, ownership: owned.coverage, existence: { total: collected.sites.filter(site => !site.opaque).length,
      deadVars: findings.filter(f => f.rule === 'existence/dead-var').reduce((n,f) => n + f.sites.length, 0),
      dead: findings.filter(finding => finding.rule === 'existence/dead-class').reduce((count, finding) => count + finding.sites.length, 0) }, declarations: origins, stylesheets: stylesheetCounts,
      inline: { sites: collected.styles.sites.length, literalSites: collected.styles.sites.filter(site => site.literal).length,
        opaque: inlineDeclarations.filter(declaration => declaration.opaque).length,
        fullyOpaque: inlineDeclarations.filter(declaration => declaration.prop === '*' && declaration.opaque).length,
        spreads: inlineDeclarations.filter(declaration => declaration.opaque === 'spread').length } },
    classes: { unique: unique.length, opaque: collected.opaque },
    timing: { totalMs: performance.now() - start, phases: { discover, parse: collected.parseMs, collect: collected.collectMs, load: lowered.loadMs, compile: lowered.compileMs, stylesheets: stylesheetsMs, inline: collected.inlineMs, decisions: decisionsMs, provenance: provenanceMs, habits: habitsMs, ownership: ownershipMs }, cacheHits: lowered.cacheHits, cacheMisses: lowered.cacheMisses },
  };
  if (options.suggestImitation) report.imitationSuggestions = await suggestImitation(components, collected.sites, report, config.value);
  report.timing.totalMs = performance.now() - start;
  for (const [phase, duration] of Object.entries(report.timing.phases)) profileDuration(`phase:${phase}`, duration);
  return { report: finishMessages(report), sites };
}

export interface ExplainedClassSite extends ClassSite { declarations: import('./report.js').Declaration[]; notes: string[] }
export async function check(options: CheckOptions = {}): Promise<Report> {
  profileProgress('phase:config');
  const start = performance.now(), cache = await CheckCache.create(options);
  if (cache && await cache.hit()) {
    profileProgress('phase:config', { cached: true });
    const report = await cache.report();
    report.timing = { ...report.timing, totalMs: performance.now() - start, phases: Object.fromEntries(Object.keys(report.timing.phases).map(name => [name, 0])) as Report['timing']['phases'], cacheHits: report.classes.unique, cacheMisses: 0 };
    report.moduleGraph = { ...report.moduleGraph, cacheHits: report.moduleGraph.followed, cacheMisses: 0, parseMs: 0, totalMs: 0 };
    return report;
  }
  const before = await cache?.snapshot();
  const { report } = await analyze(options);
  profileProgress('phase:ledger');
  const result = options.ledger === false ? report : finishMessages(await applyLedger(report, options));
  if (cache && before) await cache.save(result, before);
  return result;
}
/** Judge stdin as an in-memory source; bypass ledger allowances and whole-project dead checks. */
export async function trySnippet(text: string, options: TryOptions = {}): Promise<Report> {
  const { report } = await analyze({ ...options, ledger: false }, { text, ...options });
  report.notes.push('Dead decisions skipped: try judges a snippet, not whole-project usage. Ledger allowances are not applied.');
  return report;
}
export async function explain(file: string, options: CheckOptions = {}): Promise<{ root: string; file: string; sites: ExplainedClassSite[]; declarations: Declaration[]; opaque: number }> {
  const { report, sites } = await analyze(options);
  const absolute = resolve(report.root, file);
  return { root: report.root, file: absolute, sites: sites.filter(site => site.file === absolute), declarations: report.declarations.filter(declaration => declaration.site.file === absolute), opaque: report.classes.opaque };
}

export { sarif } from './surfaces/sarif.js';
export { githubSummary, renderSummary, githubCommands } from './surfaces/github.js';
export type { SummarySection } from './surfaces/github.js';
export { changedLines } from './surfaces/changed-lines.js';
export type { LineScope } from './surfaces/changed-lines.js';
export { formatAgent } from './surfaces/agent.js';
export type { StructuredEdit } from './surfaces/edits.js';
export { agentDocs } from './surfaces/docs.js';

export { Session, createSession } from './session/index.js';
export type { SessionOptions, SiteResult, EditsResult, ClassesResult, ApplyOptions, ApplyTextOptions, ApplyResult, TextRun, TextResult } from './session/index.js';
export { serve, serveStdio, createHandler, createWebHandler } from './session/server.js';
export type { HandlerOptions, WebHandlerOptions, ServeInfo } from './session/server.js';

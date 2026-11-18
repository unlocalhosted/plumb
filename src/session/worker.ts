import { isLedgerPath } from '../paths.js';
import { resolutions } from '../collect/resolved.js';
import { environment } from '../paths.js';
import { parentPort, workerData } from 'node:worker_threads';
import { analyze } from '../index.js';
import { projectSpec } from '../craft-spec.js';
import type { CheckOptions } from '../index.js';
import type { LoadedConfig } from '../config.js';
import type { Declaration, Report } from '../report.js';
import { drawn } from '../report.js';
import { ReadingPacker } from './kept.js';
import { atomicWrite } from '../atomic-write.js';
import { mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { finishMessages } from '../messages.js';
import { causesOf } from '../causes.js';
import { applyLedger } from '../ledger/check.js';
import { inspectLedger } from '../ledger/commands.js';
import { WarmState } from './state.js';
import { errorMessage, UsageError } from '../errors.js';
import { performance } from 'node:perf_hooks';
import { Focus } from './focus.js';
import { readLedger } from '../ledger/store.js';
import { profileDuration } from '../profile.js';
import { readFile } from 'node:fs/promises';
import { spacingUnit } from '../decisions/spacing.js';
import { structuredEdits, refusedSites } from '../surfaces/edits.js';
import { sourceHash } from '../collect/cache.js';
import { cssCode } from '../collect/stylesheets.js';
import { jsxSiteMatcher, jsxLocation } from './source-location.js';
import { ComputedClasses, classSiteKey } from '../collect/computed.js';
import type { ClassesResult } from './index.js';
import type { Site } from '../report.js';
import { readFileSync } from 'node:fs';
import { lineStarts } from '../collect/source.js';
import { isAbsolute, relative, sep } from 'node:path';

const options = workerData as CheckOptions;
const state = new WarmState(options.root!, workerData.inventory as string[] | undefined);
let raw: Report | undefined;
/** What the session keeps of the whole-app report once it has let go of its rows (`release`): decisions, spacing,
 * stylesheets and timing, with no declarations or findings, and the files those rows came from. */
let project: Report | undefined;
let released: { declarationFiles: string[]; customPropertyFiles: string[]; spacingUsed: number[] } | undefined;
const known = (): Report => (raw ?? project)!;
const declarationFiles = () => raw ? raw.declarations.map(d => d.site.file) : released?.declarationFiles ?? [];
const customPropertyFiles = () => raw ? raw.declarations.filter(d => d.prop.startsWith('--')).map(d => d.site.file) : released?.customPropertyFiles ?? [];
const spacingUses = (view: Report): number[] => {
  if (view === project && released) return released.spacingUsed;
  const used = new Set<number>();
  for (const d of view.declarations) if (d.origin === 'class' && d.sourceOrigin !== 'framework') { const m = /^calc\(var\(--spacing\) \* (\d*\.?\d+)\)$/.exec(d.value); if (m) used.add(Number(m[1])); }
  return [...used].sort((a, b) => a - b);
};
let classified: Report | undefined;
let revision = 0;
let dirty = false;
let sharedDirty = false;
const localReports = new Map<string, Report>();
let fullReports = 1, fullIndexes = 0, localAnalyses = 0;
let sharedInputs = new Set<string>();
let metadataDirty = false, metadataFull = false;
const computed = new ComputedClasses();
const classTables = new WeakMap<object, Map<string, Site[]>>();
function authoredClasses(file: string): Map<string, Site[]> {
  const collection = state.collection.slices.get(file)?.value;
  if (!collection) return new Map();
  const old = classTables.get(collection); if (old) return old;
  const sources = new Map<string, { text: string; starts: number[] }>();
  const sites = new Map<string, Site>();
  for (const site of collection.sites) {
    if (site.opaque) continue;
    let source = sources.get(site.file);
    if (!source) { const text = readFileSync(site.file, 'utf8'); source = { text, starts: lineStarts(text) }; sources.set(site.file, source); }
    const start = (source.starts[site.line - 1] ?? -Infinity) + site.column - 1;
    if (source.text.slice(start, start + site.token.length) === site.token && computed.authored(site)) sites.set(classSiteKey(site), { file: site.file, line: site.line, column: site.column, text: site.token });
  }
  const result = group([...sites.values()], site => site.text); classTables.set(collection, result); return result;
}
const queryChanges = new Set<string>();
function changedQueries(files: Iterable<string>): void {
  const changed = [...files];
  for (const file of changed) queryChanges.add(file);
  for (const dependency of state.queryDependenciesOf(changed)) queryChanges.add(dependency);
}
let ledger: Awaited<ReturnType<typeof readLedger>>;
const dependencies = () => [...new Set([...state.dependencies, ...state.collection.dependencies,
  ...declarationFiles(), ...known().stylesheets.map(s => s.file), ...known().decisions.map(d => d.source.file), ...(known().config.path ? [known().config.path!] : [])])];
async function update(paths: string[]): Promise<string[]> {
  let affected: string[] = [];
  if (paths.some(p => isLedgerPath(p))) ledger = await readLedger(options.root!);
  if (paths.some(p => !isLedgerPath(p))) {
    const signature = (file: string) => { const value = state.collection.slices.get(file)?.value; return JSON.stringify([value?.modules, state.embeddedShape(file), value?.styles.declarations.filter(d => d.prop.startsWith('--'))], (_, item) => item instanceof Map ? [...item] : item); };
    const candidates = new Set(paths);
    for (const path of paths) for (const file of state.collection.consumers.get(path) ?? []) candidates.add(file);
    changedQueries(candidates);
    const before = new Map([...candidates].map(file => [file, signature(file)]));
    sharedDirty ||= paths.some(file => sharedInputs.has(file));
    state.changed(paths);
    computed.invalidate();
    const start = performance.now(); affected = await state.prepare(paths); profileDuration('phase:refresh-collect', performance.now() - start); dirty = true;
    changedQueries([...paths, ...affected]); metadataDirty = true;
    const changedSharedStyles = await state.refreshStyles([...new Set([...paths, ...affected])]);
    sharedDirty ||= changedSharedStyles || affected.some(file => before.get(file) !== signature(file));
    affected.push(...paths.filter(file => file.endsWith('.css')));
    for (const file of affected) localReports.delete(file);
    if (sharedDirty || paths.some(file => file.endsWith('.css'))) localReports.clear();
  }
  if (paths.some(p => isLedgerPath(p))) localReports.clear();
  classified = undefined; revision++;
  return affected;
}
async function current(): Promise<Report> {
  releaseLater();
  await quiet();
  if (dirty || !raw) settle((await analyze({ ...options, ledger: false }, undefined, state)).report);
  return raw!;
}
function settle(view: Report): void {
  fullReports++; released = undefined; project = undefined; raw = view; dirty = false; sharedDirty = false; localReports.clear(); metadataDirty = true; metadataFull = true;
}
// The whole-app report is built in the background after start-up and after each edit (docs/briefs/analysis-memory.md,
// open page first). It works outside the request queue and pauses between files whenever a request is waiting, and
// otherwise every SLICE_MS, so a page is answered as fast as with nothing building. An edit makes it start over; a
// request that needs the report makes it run straight through and waits for it.
const SLICE_MS = 10;
class Stale extends Error {}
let waiting = 0;
let wakers: (() => void)[] = [];
function wake(): void { const list = wakers; wakers = []; for (const resolve of list) resolve(); }
let building: { revision: number; urgent: boolean; done: Promise<void> } | undefined;
/** Lets a background build finish now, with nothing paused, for a request that reads what it builds. */
async function quiet(): Promise<void> {
  const job = building;
  if (!job) return;
  job.urgent = true; wake();
  await job.done;
}
function buildLater(): void {
  if (building?.revision === revision || !dirty && raw) return;
  const job: NonNullable<typeof building> = { revision, urgent: false, done: Promise.resolve() };
  let sliceStart = 0;
  const check = () => { if (job.revision !== revision) throw new Stale(); };
  const resume = async () => {
    while (waiting > 0 && !job.urgent) await new Promise<void>(resolve => wakers.push(resolve));
    if (!job.urgent && waiting === 0) await new Promise<void>(resolve => setImmediate(resolve));
    check(); sliceStart = performance.now();
  };
  const pause = () => {
    check();
    if (job.urgent) return undefined;
    if (waiting === 0 && performance.now() - sliceStart < SLICE_MS) return undefined;
    return resume();
  };
  building = job;
  job.done = (async () => {
    await resume();
    state.pause = pause;
    try {
      const view = (await analyze({ ...options, ledger: false }, undefined, state)).report;
      // handed over between requests, never in the middle of one
      if (!job.urgent) await resume();
      check(); settle(view); releaseLater();
    } catch (error) {
      if (!(error instanceof Stale)) console.error(`[plumber] the whole-app report could not be built in the background: ${errorMessage(error)}`);
    } finally {
      if (state.pause === pause) state.pause = undefined;
      if (building === job) building = undefined;
    }
  })();
}
async function report(extra: CheckOptions = {}, ordinaryLedger = false): Promise<Report> {
  await current();
  const effective = { ...options, ...extra };
  if (ordinaryLedger) { delete effective.base; effective.ledger = true; effective.changed = false; effective.strictLedger = false; }
  if ((effective.verbose ?? false) !== (options.verbose ?? false)) {
    const view = (await analyze({ ...effective, ledger: false }, undefined, state)).report;
    return effective.ledger === false ? view : finishMessages(await applyLedger(view, effective, ledger));
  }
  const full = raw!;
  if (effective.ledger === false) return full;
  if (effective.base !== undefined || effective.changed || effective.strictLedger) return finishMessages(await applyLedger(ledgerView(full), effective, ledger));
  if (!classified) classified = finishMessages(await applyLedger(ledgerView(full), effective, ledger));
  return classified;
}
/** Ledger presentation writes findings, coverage, notes and timing. Authored
 * declarations and occurrence evidence stay shared with the immutable view. */
function ledgerView(report: Report): Report {
  return { ...report, findings: report.findings.map(finding => ({ ...finding,
    ...(finding.edits ? { edits: finding.edits.map(edit => ({ ...edit })) } : {}) })),
    coverage: structuredClone(report.coverage), notes: [...report.notes], timing: { ...report.timing } };
}
// Immutable report identity binds these projections to source/dependency evidence.
// Ledger refreshes discard classified reports, so allowances cannot outlive a save.
const fileDeclarations = new WeakMap<Report, Map<string, Report['declarations']>>();
const readingViews = new WeakMap<Report, Map<string, Report>>();
function declarationsFor(view: Report, file: string): Report['declarations'] {
  let files = fileDeclarations.get(view);
  if (!files) { files = group(view.declarations, d => d.site.file); fileDeclarations.set(view, files); }
  return files.get(file) ?? [];
}
function readingView(view: Report, file: string): Report {
  let files = readingViews.get(view);
  if (!files) { files = new Map(); readingViews.set(view, files); }
  let local = files.get(file);
  if (!local) {
    index(view, localReports.get(file) === view ? file : undefined);
    local = ledgerView({ ...view, declarations: declarationsFor(view, file), findings: fileFindings.get(file) ?? [] });
    for (const finding of local.findings) {
      if (finding.status === undefined) continue;
      finding.status = finding.sites.some(s => s.ledger?.status === 'new') ? 'new'
        : finding.sites.some(s => s.ledger?.status === 'debt') ? 'debt' : 'exception';
      if (finding.status !== 'new') finding.severity = 'info';
    }
    // Accept commands address the first site in this file, as before projection.
    if (files.size >= 64) files.delete(files.keys().next().value!);
    files.set(file, finishMessages(local));
  }
  return local;
}
function site(r: Report, file: string, line: number, column: number | undefined, text: string) {
  const matches = jsxSiteMatcher(file, text, line, column);
  return { file, line, ...(column === undefined ? {} : { column }),
    declarations: r.declarations.filter(d => matches(d.site)),
    findings: r.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })) };
}
// Rebuilt once per analyzed report; warm edit reads never walk unrelated findings or definitions.
let indexedReport: Report | undefined;
const indexedFiles = new Map<string, Report>();
let fileFindings = new Map<string, Report['findings']>();
let lineFindings = new Map<string, Map<number, Report['findings']>>();
let columnFindings = new Map<string, Map<number, Map<number, Report['findings']>>>();
let decisionNames = new Set<string>();
let editable = new Set<string>(), protectedFiles = new Set<string>();
const declarationTables = new WeakMap<Report, Map<string, Report['declarations']>>();
function classDeclarations(view: Report, site: Site): Report['declarations'] {
  let table = declarationTables.get(view);
  if (!table) { table = group(view.declarations, d => classSiteKey(d.site)); declarationTables.set(view, table); }
  return table.get(classSiteKey(site)) ?? [];
}
function group<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) { const value = key(item); let list = groups.get(value); if (!list) groups.set(value, list = []); list.push(item); }
  return groups;
}
function append<K>(map: Map<K, Report['findings']>, key: K, finding: Report['findings'][number]): void {
  let list = map.get(key); if (!list) map.set(key, list = []); list.push(finding);
}
function index(view: Report, only?: string): void {
  if (only ? indexedFiles.get(only) === view : indexedReport === view) return;
  if (only) { fileFindings.delete(only); lineFindings.delete(only); columnFindings.delete(only); indexedFiles.set(only, view); }
  else { fullIndexes++; indexedReport = view; indexedFiles.clear(); fileFindings = new Map(); lineFindings = new Map(); columnFindings = new Map();
    decisionNames = new Set([...view.decisions, ...view.decisionInventory ?? []].map(d => d.name));
    editable = new Set(state.collection.slices.keys());
    for (const slice of state.collection.slices.values()) for (const file of slice.value.computedClassFiles ?? []) {
      const path = relative(options.root!, file);
      if (path && path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path)) editable.add(file);
    }
    for (const sheet of view.stylesheets) if (sheet.reached.some(reach => reach.kind === 'source')) editable.add(sheet.file);
    protectedFiles = new Set([...view.decisions, ...view.decisionInventory ?? []].map(d => d.source.file));
    if (view.config.path) protectedFiles.add(view.config.path);
    if (view.tailwind.entry) protectedFiles.add(view.tailwind.entry);
  }
  declarationsFor(view, only ?? '');
  for (const finding of view.findings) {
    const occurrences = group(finding.occurrences ?? [], d => d.site.file);
    for (const [file, sites] of group(finding.sites, s => s.file)) {
      if (only && file !== only) continue;
      append(fileFindings, file, { ...finding, sites, ...(finding.occurrences ? { occurrences: occurrences.get(file) ?? [] } : {}) });
    }
  }
}
/** A file's findings by line and by column, built the first time that file is asked about at a line, not for every
 * file at every index: each view is a copy of the finding with its own site lists, and the whole app's line and
 * column copies were held for the few files a page shows (docs/briefs/analysis-memory.md). */
function lineViews(file: string): void {
  if (lineFindings.has(file)) return;
  const byLine = new Map<number, Report['findings']>(), columns = new Map<number, Map<number, Report['findings']>>();
  lineFindings.set(file, byLine); columnFindings.set(file, columns);
  for (const local of fileFindings.get(file) ?? []) {
    const lineOccurrences = group(local.occurrences ?? [], d => d.site.line);
    for (const [line, sites] of group(local.sites, s => s.line)) {
      const atLine = { ...local, sites, ...(local.occurrences ? { occurrences: lineOccurrences.get(line) ?? [] } : {}) };
      append(byLine, line, atLine);
      const columnOccurrences = group(atLine.occurrences ?? [], d => d.site.column);
      const byColumn = columns.get(line) ?? new Map(); columns.set(line, byColumn);
      for (const [column, sites] of group(atLine.sites, s => s.column))
        append(byColumn, column, { ...atLine, sites, ...(atLine.occurrences ? { occurrences: columnOccurrences.get(column) ?? [] } : {}) });
    }
  }
}
function scoped(view: Report, file: string, line?: number, column?: number, text?: string): Report {
  if (line !== undefined && column !== undefined && text !== undefined) return { ...view, ...site(readingView(view, file), file, line, column, text) };
  index(view, localReports.get(file) === view ? file : undefined);
  if (line !== undefined) lineViews(file);
  const findings = (line === undefined ? fileFindings.get(file) : column === undefined ? lineFindings.get(file)?.get(line) : columnFindings.get(file)?.get(line)?.get(column)) ?? [];
  return { ...view, findings };
}
/** Files with class sites in another file's collection (their literals lowered where they are used), per revision. */
let elsewhere: { revision: number; files: Set<string> } | undefined;
function sitesElsewhere(): Set<string> {
  if (elsewhere?.revision !== revision) {
    const files = new Set<string>();
    for (const [owner, slice] of state.collection.slices) for (const site of slice.value.sites) if (site.file !== owner) files.add(site.file);
    elsewhere = { revision, files };
  }
  return elsewhere.files;
}
async function localReport(file: string): Promise<Report> {
  // A stylesheet's variables and colours are judged against every file that uses them: with nothing changed it is read
  // from the whole-app report, built again if it was let go.
  if (!dirty && (raw || file.endsWith('.css')) || sharedDirty || !state.collection.slices.has(file) && !file.endsWith('.css')) return report();
  // Imported class literals can be lowered only in their consumer's JSX context, and a finding on one carries its
  // sites in those files too (`gap-[17px]` written in helper.ts, used in App.tsx; an MDX components map whose classes
  // are lowered where the map is used): judged alone, the sites in the importers' collections were lost
  // (e2e/reading-cache; src/lessons/mdx-components.tsx on algorecall, 7 of its 29 declarations). Such a file, 7 of
  // 3,649 on algorecall, reads the whole-app report.
  if (sitesElsewhere().has(file)) return report();
  let view = localReports.get(file);
  if (!view) {
    localAnalyses++;
    changedQueries([file]);
    const result = (await analyze({ ...options, ledger: false }, undefined, new Focus(state, file))).report;
    changedQueries([file]);
    // copies: a page's findings share objects with the whole-app report (the compile's notes), and the ledger writes
    // its status onto what it is given
    view = finishMessages(await applyLedger(ledgerView(result), options, ledger));
    if (localReports.size >= 256) localReports.delete(localReports.keys().next().value!);
    localReports.set(file, view); metadataDirty = true;
  }
  index(view, file);
  return view;
}
const sourceFiles = () => [...new Set([...state.collection.slices.keys(), ...known().stylesheets.filter(sheet => sheet.reached.some(reach => reach.kind === 'source')).map(sheet => sheet.file)])];
/** The files every query over `files` reads, as one set (state.queryDependenciesOf), never a list per file. */
function queryInputs(files: Iterable<string> = []) {
  return { inputPatterns: [...state.inputPatterns], inputs: [...new Set([...state.configurationFiles, ...state.compilerFiles, ...known().stylesheets.map(s => s.file), ...customPropertyFiles(), ...known().decisions.map(d => d.source.file), ...known().decisionInventory?.map(d => d.source.file) ?? []])],
    queryPaths: [...state.queryDependenciesOf(files)] };
}
const KEEP_SLICE = 30; // ms of building the reading table before the worker looks at its queue again
let keeping: { of: Report; packer: ReadingPacker; started: number; worked: number; longest: number; slices: number } | undefined;
/** What `release` keeps of a whole-app report, read instead from what start-up collected and compiled, before any report
 * exists: the files that declare styles, the files that define CSS variables, and the spacing steps classes use. */
function preparedSummary(): NonNullable<typeof released> {
  // the collected files themselves: collection's result is not kept under a phase name the way the compile is
  const slices = [...state.collection.slices.values()].map(slice => slice.value);
  const collected = { sites: slices.flatMap(v => v.sites), styles: { declarations: slices.flatMap(v => v.styles.declarations) } };
  const css = state.shared<{ declarations: Declaration[] }>('css');
  const lowered = state.shared<{ candidates: ReadonlyMap<string, { declarations: { prop: string; value: string }[] }> }>('tailwind');
  const declarationFiles = new Set<string>(), customPropertyFiles = new Set<string>(), spacing = new Set<number>();
  const arbitrary = /(?:^|:)(?:-?[\w-]+-)?\[.+\](?:\/.+)?!?$/;
  for (const d of [...collected?.styles.declarations ?? [], ...css?.declarations ?? []]) { declarationFiles.add(d.site.file); if (d.prop.startsWith('--')) customPropertyFiles.add(d.site.file); }
  for (const site of collected?.sites ?? []) {
    const ds = lowered?.candidates.get(site.token)?.declarations ?? [];
    if (!ds.length) continue;
    declarationFiles.add(site.file);
    for (const d of ds) {
      if (d.prop.startsWith('--')) customPropertyFiles.add(site.file);
      const step = !arbitrary.test(site.token) && /^calc\(var\(--spacing\) \* (\d*\.?\d+)\)$/.exec(d.value);
      if (step) spacing.add(Number(step[1]));
    }
  }
  return { declarationFiles: [...declarationFiles], customPropertyFiles: [...customPropertyFiles], spacingUsed: [...spacing].sort((a, b) => a - b) };
}
// Open page first, layer 1 (docs/briefs/analysis-memory.md): the whole-app report is let go after a quiet period, and
// pages are judged a file at a time against the app-wide products the session keeps. A project-wide read builds the
// report again and starts the quiet period over.
const QUIET_MS = Number(environment('RELEASE_MS') ?? 60_000);
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
function releaseLater(): void {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => { queue = queue.then(release, release); }, QUIET_MS); releaseTimer.unref();
}
function release(): void {
  if (!raw) return;
  if (keeping || building) { releaseLater(); return; }
  released = { declarationFiles: [...new Set(raw.declarations.map(d => d.site.file))], customPropertyFiles: [...new Set(raw.declarations.filter(d => d.prop.startsWith('--')).map(d => d.site.file))], spacingUsed: spacingUses(raw) };
  project = { ...raw, declarations: [], findings: [] };
  raw = undefined; classified = undefined; indexedReport = undefined; indexedFiles.clear();
  fileFindings = new Map(); lineFindings = new Map(); columnFindings = new Map(); localReports.clear();
  state.release();
}
async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  if (method === 'queryDependencies') return [...state.queryDependenciesOf(params.files as string[])];
  if (method === 'inventory') { state.inventory = params.files as string[]; return null; }
  if (method === 'refresh') {
    performance.clearMeasures();
    const affected = await update(params.paths as string[]);
    buildLater();
    return { revision, dependencyDelta: [...state.queryDependenciesOf(affected)],
      files: state.collection.parsedFiles, visited: state.collection.visitedFiles, judged: state.judgement.judgedFiles,
      timing: known().timing,
      ...(environment('PROFILE') === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) };
  }
  // A copy, so the shared report the other reads hand out never carries causes computed for another ledger view.
  if (method === 'report') { const view = await report(params as CheckOptions); return { ...view, causes: causesOf(view) }; }
  if (method === 'classes') {
    const file = params.file as string, line = params.line as number, column = params.column as number;
    if (!state.collection.slices.has(file)) throw new UsageError('Classes requires a tracked project source file.');
    const text = await readFile(file, 'utf8');
    const location = jsxLocation(file, text, line, column);
    if (!location) throw new UsageError('Source position does not identify an authored JSX element.');
    computed.configure(state.shared<LoadedConfig>('config')?.value.classHelpers);
    const trace = computed.trace(file, location.start);
    const tokens = [...new Set((params.classes as string).split(/\s+/).filter(Boolean))];
    const byToken = (sites: Site[]) => group(sites, s => s.text);
    const result: Omit<ClassesResult, 'revision'> = { file, line, column, classes: [], unattributed: [], limited: trace.limited ? tokens : [], limits: trace.limits };
    // Incomplete evidence cannot prove either attribution or absence. Keep all
    // affected rendered tokens in the explicit limited bucket, without fallback.
    if (trace.limited) return result;
    const direct = byToken(trace.sites);
    // Fallback uses collected class evidence, never arbitrary matching strings.
    const fallback = authoredClasses(file);
    for (const token of tokens) {
      let sites = direct.get(token) ?? [];
      if (!sites.length) sites = (fallback.get(token) ?? []).filter(site => site.file === file);
      if (!sites.length) {
        const imported = trace.imports.flatMap(path => authoredClasses(path).get(token) ?? []);
        sites = [...new Map([...fallback.get(token) ?? [], ...imported].filter(site => trace.imports.includes(site.file)).map(site => [classSiteKey(site), site])).values()];
      }
      if (!sites.length) { result.unattributed.push(token); continue; }
      const candidates: ClassesResult['classes'][number]['sites'] = [];
      for (const candidate of sites) {
        const view = await localReport(candidate.file);
        const source = await readFile(candidate.file, 'utf8');
        const hash = state.sourceHash(candidate.file) ?? sourceHash(source);
        if (!hash || sourceHash(source) !== hash) throw new UsageError('The file changed since the overlay read it. Read it again.');
        index(view, localReports.get(candidate.file) === view ? candidate.file : undefined);
        const at = { file: candidate.file, line: candidate.line, column: candidate.column,
          declarations: classDeclarations(view, candidate), findings: (lineViews(candidate.file), columnFindings.get(candidate.file)?.get(candidate.line)?.get(candidate.column)) ?? [] };
        const edits = editable.has(candidate.file) && !protectedFiles.has(candidate.file)
          ? structuredEdits({ ...view, ...at }, new Map([[candidate.file, source]]), decisionNames, true) : [];
        candidates.push({ ...at, column: candidate.column, hash, edits });
      }
      result.classes.push({ token, ambiguous: candidates.length > 1, sites: candidates });
    }
    return result;
  }
  if (method === 'edits') {
    const file = params.file as string, view = await localReport(file);
    index(view, localReports.get(file) === view ? file : undefined);
    if (!editable.has(file)) throw new Error('Apply requires a tracked project source file.');
    const text = await readFile(file, 'utf8'), hash = state.sourceHash(file) ?? sourceHash(text);
    if (sourceHash(text) !== hash) throw new Error('The file changed since the overlay read it. Read it again.');
    if (protectedFiles.has(file) || file.endsWith('.css') && /@theme\b/.test(cssCode(text))) throw new Error('Apply cannot edit config or a stylesheet that defines the theme.');
    const local = scoped(view, file, params.line as number | undefined, params.column as number | undefined, text), sources = new Map([[file, text]]);
    const edits = structuredEdits(local, sources, decisionNames, true);
    return { file, hash, edits, refused: refusedSites(local, sources, edits) };
  }
  if (method === 'remaining') {
    const sites = params.sites as { line: number }[], file = params.file as string, view = await localReport(file);
    const lines = new Set(sites.map(site => site.line));
    const local = scoped(view, file);
    const matches = (s: { line: number }) => lines.has(s.line);
    return { hash: state.sourceHash(file), remaining: local.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })) };
  }
  if (method === 'site') {
    const file = params.file as string, line = params.line as number;
    // Definition queries need all consumer counts. A source query can judge
    // its own declarations against the shared project record immediately.
    const definitions = state.collection.slices.get(file)?.value.styles.declarations.some(d => d.prop.startsWith('--')) || known().decisions.some(d => d.source.file === file);
    const start = performance.now();
    // With the whole-app report let go, a component that sets CSS variables inline is read on its own like any other
    // file (its findings judged alone equal the full report's); a stylesheet or a file that defines the theme's
    // decisions still is read from the whole-app report. Rebuilding that report for an inline `--face` cost 16 s.
    const themeDefinitions = file.endsWith('.css') || known().decisions.some(d => d.source.file === file);
    const localQuery = (dirty || !raw) && !sharedDirty && !(definitions && (raw || themeDefinitions));
    // Site has always applied the ordinary ledger, even when report()/edits()
    // were configured for raw or changed-scope inspection.
    const scopedOptions = options.ledger === false || options.base !== undefined || options.changed || options.strictLedger;
    const view = scopedOptions ? await report({}, true)
      : localQuery ? await localReport(file) : await report();
    profileDuration('phase:site-analysis', performance.now() - start);
    return site(readingView(view, file), file, line, params.column as number | undefined, await readFile(file, 'utf8'));
  }
  if (method === 'decisions') return (sharedDirty ? await current() : known()).decisions;
  // the spacing multiplier an element editor steps by: the theme's `--spacing`, kept beside any named steps (decisions/spacing.ts spacingUnit)
  if (method === 'spacingUnit') {
    const view = sharedDirty ? await current() : known(), base = spacingUnit(view.numericSpacing, view.spacingBase);
    if (!base) return null;
    return { px: base.px, text: base.text, ...(base.note ? { note: base.note } : {}), used: spacingUses(view) };
  }
  // the craft spec (docs/briefs/craft-spec.md): the standard as this project's config tunes it, and where a new token goes
  if (method === 'spec') return projectSpec(options.root!, state.settings, sharedDirty ? await current() : known());
  if (method === 'why') return inspectLedger('why', `${params.file}:${params.line}`, await report());
  // every finding at the places in these files, rendered on the page or not (docs/briefs/count-from-code.md)
  if (method === 'places') {
    // per file, as the page's own reads are: with the whole-app report let go, these files are judged alone
    const files = params.files as string[], views = new Map<string, Report>();
    for (const file of files) views.set(file, await localReport(file));
    return { revision: params.revision, files: files.map(file => ({ file, hash: state.sourceHash(file) ?? null, view: views.get(file)! })).map(({ file, hash, view }) => ({ file, hash,
      findings: view.findings.filter(f => !f.rule.startsWith('config/') && f.sites.some(s => s.file === file)).map(f => ({ ...drawn(f), sites: f.sites.filter(s => s.file === file), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => d.site.file === file) } : {}) })),
      declarations: view.declarations.filter(d => d.site.file === file) })) };
  }
  // the reading table, written to disk for the next start (session/kept.ts). Not read back yet. Built a slice at a
  // time: each call does a few milliseconds of it and returns, so a question asked meanwhile is answered between
  // slices; a report that changed under it starts it again.
  if (method === 'keep') {
    // the reading table describes the whole-app report; with that let go it is not rebuilt for this, it is written the
    // next time the report exists (at start-up, before release, or after a project-wide view)
    if (!raw || dirty) return { done: true, skipped: true };
    const view = raw;
    if (!keeping || keeping.of !== view) keeping = { of: view, packer: new ReadingPacker(view), started: performance.now(), worked: 0, longest: 0, slices: 0 };
    const job = keeping, start = performance.now();
    const complete = job.packer.step(KEEP_SLICE);
    let spent = performance.now() - start; job.worked += spent; job.longest = Math.max(job.longest, spent); job.slices++;
    if (!complete) return { done: false };
    const finish = performance.now();
    const { data, stats } = job.packer.finish();
    spent = performance.now() - finish; job.worked += spent; job.longest = Math.max(job.longest, spent);
    keeping = undefined;
    await mkdir(params.directory as string, { recursive: true });
    // the check found the same inputs and a different table: the old one is set aside to be looked at, not lost
    if (typeof params.previous === 'string' && params.previous !== stats.hash) await rename(join(params.directory as string, 'readings.v8'), join(params.directory as string, 'readings.mismatch.v8')).catch(() => {});
    await atomicWrite(join(params.directory as string, 'readings.v8'), data);
    // what every import resolved to goes with it, for the receipt
    return { done: true, ...stats, packMs: Math.round(job.worked), longestMs: Math.round(job.longest), slices: job.slices, ms: Math.round(performance.now() - job.started), resolutions: resolutions() };
  }
  if (method === 'health') return { status: 'ready', root: options.root, revision, pid: process.pid, rss: process.memoryUsage().rss, caches: state.caches, work: { fullReports, fullIndexes, localAnalyses }, wholeApp: raw && !dirty ? 'ready' : building ? 'building' : 'when asked', ...(environment('PROFILE') === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) };
  if (method === 'try') {
    await quiet();
    const result = (await analyze({ ...options, ...(params.verbose === undefined ? {} : { verbose: params.verbose as boolean }), ledger: false }, { text: params.code as string, ...(params.lang ? { lang: params.lang as 'tsx' | 'css' } : {}), ...(params.as ? { as: params.as as string } : {}) }, state)).report;
    result.notes.push('Dead decisions skipped: try judges a snippet, not whole-project usage. Ledger allowances are not applied.');
    return result;
  }
  throw new Error(`Unknown method: ${method}.`);
}
let queue = Promise.resolve();
parentPort!.on('message', ({ id, method, params }) => {
  waiting++;
  queue = queue.then(async () => {
    try {
      const start = performance.now();
      const result = await dispatch(method, params);
      profileDuration(`read:${method}`, performance.now() - start);
      const analysis = metadataDirty ? queryInputs(metadataFull ? undefined : queryChanges) : undefined;
      parentPort!.postMessage({ id, result, health: await dispatch('health', {}), judged: state.judgement.judgedFiles,
        ...(analysis ? { analysis: { inputPatterns: analysis.inputPatterns, inputs: analysis.inputs, dependencies: metadataFull ? dependencies() :
          [...new Set([...analysis.inputs, ...analysis.queryPaths])] } } : {}) });
      metadataDirty = false; metadataFull = false; queryChanges.clear();
    }
    catch (error) { parentPort!.postMessage({ id, error: errorMessage(error), errorStack: error instanceof Error ? error.stack : undefined, usageError: error instanceof UsageError, ...(error instanceof UsageError ? { errorCode: error.code } : {}) }); }
    finally { if (--waiting === 0) wake(); }
  });
});
try {
  ledger = await readLedger(options.root!);
  // Start-up reads what the whole app shares (collection, the compile, the graphs, the token record) and judges
  // nothing: pages are judged a file at a time, and the whole-app report is built the first time something asks for
  // it (docs/briefs/analysis-memory.md, open page first). The summary the session keeps comes from what was read.
  state.prepareOnly = true;
  try { project = (await analyze({ ...options, ledger: false }, undefined, state)).report; } finally { state.prepareOnly = false; }
  released = preparedSummary();
  sharedInputs = new Set([...state.configurationFiles, ...state.compilerFiles, ...project.decisions.map(d => d.source.file), ...project.decisionInventory?.map(d => d.source.file) ?? []]);
  buildLater();
  parentPort!.postMessage({ ready: true, health: await dispatch('health', {}), dependencies: dependencies(), patterns: [...state.patterns], files: sourceFiles(), configurationFiles: [...state.configurationFiles], entryGraph: [...state.entryGraph], ...queryInputs() });
} catch (error) { parentPort!.postMessage({ startupError: errorMessage(error), errorStack: error instanceof Error ? error.stack : undefined, usageError: error instanceof UsageError, ...(error instanceof UsageError ? { errorCode: error.code } : {}) }); }

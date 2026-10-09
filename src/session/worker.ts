import { parentPort, workerData } from 'node:worker_threads';
import { analyze } from '../index.js';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import { finishMessages } from '../messages.js';
import { applyLedger } from '../ledger/check.js';
import { inspectLedger } from '../ledger/commands.js';
import { WarmState } from './state.js';
import { errorMessage } from '../errors.js';
import { performance } from 'node:perf_hooks';
import { Focus } from './focus.js';
import { readLedger } from '../ledger/store.js';
import { profileDuration } from '../profile.js';
import { readFile } from 'node:fs/promises';
import { structuredEdits } from '../surfaces/edits.js';
import { sourceHash } from '../collect/cache.js';
import { cssCode } from '../collect/stylesheets.js';

const options = workerData as CheckOptions;
const state = new WarmState(options.root!);
let raw: Report;
let classified: Report | undefined;
let revision = 0;
let dirty = false;
let ledger: Awaited<ReturnType<typeof readLedger>>;
const dependencies = () => [...new Set([...state.dependencies, ...state.collection.dependencies,
  ...raw.declarations.map(d => d.site.file), ...raw.stylesheets.map(s => s.file), ...raw.decisions.map(d => d.source.file), ...(raw.config.path ? [raw.config.path] : [])])];
async function update(paths: string[]): Promise<void> {
  if (paths.some(p => p.endsWith('/.plumb/ledger.jsonl'))) ledger = await readLedger(options.root!);
  if (paths.some(p => !p.endsWith('/.plumb/ledger.jsonl'))) {
    state.changed(paths);
    const start = performance.now(); await state.prepare(); profileDuration('phase:refresh-collect', performance.now() - start); dirty = true;
  }
  classified = undefined; revision++;
}
async function current(): Promise<Report> {
  if (dirty) { raw = (await analyze({ ...options, ledger: false }, undefined, state)).report; dirty = false; }
  return raw;
}
async function report(extra: CheckOptions = {}): Promise<Report> {
  await current();
  const effective = { ...options, ...extra };
  if ((effective.verbose ?? false) !== (options.verbose ?? false)) {
    const view = (await analyze({ ...effective, ledger: false }, undefined, state)).report;
    return effective.ledger === false ? view : finishMessages(await applyLedger(view, effective, ledger));
  }
  if (effective.ledger === false) return raw;
  if (effective.base !== undefined || effective.changed || effective.strictLedger) return finishMessages(await applyLedger(structuredClone(raw), effective, ledger));
  if (!classified) classified = finishMessages(await applyLedger(structuredClone(raw), effective, ledger));
  return classified;
}
function site(r: Report, file: string, line: number, column?: number) {
  const matches = (s: { file: string; line: number; column: number }) => s.file === file && s.line === line && (column === undefined || s.column === column);
  return { file, line, ...(column === undefined ? {} : { column }),
    declarations: r.declarations.filter(d => matches(d.site)),
    findings: r.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })) };
}
// Rebuilt once per analyzed report; warm edit reads never walk unrelated findings or definitions.
let indexedReport: Report | undefined;
let fileFindings = new Map<string, Report['findings']>();
let lineFindings = new Map<string, Map<number, Report['findings']>>();
let columnFindings = new Map<string, Map<number, Map<number, Report['findings']>>>();
let decisionNames = new Set<string>();
let editable = new Set<string>(), protectedFiles = new Set<string>();
function group<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) { const value = key(item); let list = groups.get(value); if (!list) groups.set(value, list = []); list.push(item); }
  return groups;
}
function append<K>(map: Map<K, Report['findings']>, key: K, finding: Report['findings'][number]): void {
  let list = map.get(key); if (!list) map.set(key, list = []); list.push(finding);
}
function index(view: Report): void {
  if (indexedReport === view) return;
  indexedReport = view; fileFindings = new Map(); lineFindings = new Map(); columnFindings = new Map();
  decisionNames = new Set([...view.decisions, ...view.decisionInventory ?? []].map(d => d.name));
  editable = new Set(state.collection.slices.keys());
  for (const sheet of view.stylesheets) if (sheet.reached.some(reach => reach.kind === 'source')) editable.add(sheet.file);
  protectedFiles = new Set([...view.decisions, ...view.decisionInventory ?? []].map(d => d.source.file));
  if (view.config.path) protectedFiles.add(view.config.path);
  if (view.tailwind.entry) protectedFiles.add(view.tailwind.entry);
  for (const finding of view.findings) {
    const occurrences = group(finding.occurrences ?? [], d => d.site.file);
    for (const [file, sites] of group(finding.sites, s => s.file)) {
      const local = { ...finding, sites, ...(finding.occurrences ? { occurrences: occurrences.get(file) ?? [] } : {}) };
      append(fileFindings, file, local);
      const lineOccurrences = group(local.occurrences ?? [], d => d.site.line);
      const byLine = lineFindings.get(file) ?? new Map(); lineFindings.set(file, byLine);
      const columns = columnFindings.get(file) ?? new Map(); columnFindings.set(file, columns);
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
}
function scoped(view: Report, file: string, line?: number, column?: number): Report {
  index(view);
  const findings = (line === undefined ? fileFindings.get(file) : column === undefined ? lineFindings.get(file)?.get(line) : columnFindings.get(file)?.get(line)?.get(column)) ?? [];
  return { ...view, findings };
}
const sourceFiles = () => [...new Set([...state.collection.slices.keys(), ...raw.stylesheets.filter(sheet => sheet.reached.some(reach => reach.kind === 'source')).map(sheet => sheet.file)])];
function queryInputs() {
  return { inputs: [...new Set([...state.configurationFiles, ...state.compilerFiles, ...raw.decisions.map(d => d.source.file), ...raw.decisionInventory?.map(d => d.source.file) ?? []])],
    queryDependencies: [...state.collection.slices].map(([file, slice]) => [file, [...slice.dependencies.keys()]]) };
}
async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  if (method === 'refresh') { performance.clearMeasures(); await update(params.paths as string[]); return { revision, dependencies: dependencies(), files: state.collection.parsedFiles, judged: state.judgement.judgedFiles, timing: raw.timing, ...queryInputs(), ...(process.env.PLUMB_PROFILE === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) }; }
  if (method === 'report') return report(params as CheckOptions);
  if (method === 'edits') {
    const file = params.file as string, view = await report();
    index(view);
    if (!editable.has(file)) throw new Error('Apply requires a tracked project source file.');
    const text = await readFile(file, 'utf8'), hash = state.sourceHash(file);
    if (sourceHash(text) !== hash) throw new Error('The file changed since the overlay read it. Read it again.');
    if (protectedFiles.has(file) || file.endsWith('.css') && /@theme\b/.test(cssCode(text))) throw new Error('Apply cannot edit config or a stylesheet that defines the theme.');
    const edits = structuredEdits(scoped(view, file, params.line as number | undefined, params.column as number | undefined), new Map([[file, text]]), decisionNames);
    return { file, hash, edits };
  }
  if (method === 'remaining') {
    const sites = params.sites as { line: number }[], file = params.file as string, view = await report();
    const lines = new Set(sites.map(site => site.line));
    const local = scoped(view, file);
    const matches = (s: { line: number }) => lines.has(s.line);
    return { hash: state.sourceHash(file), remaining: local.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })) };
  }
  if (method === 'site') {
    const file = params.file as string, line = params.line as number;
    // Definition queries need all consumer counts. A source query can judge
    // its own declarations against the shared project record immediately.
    const definitions = state.collection.slices.get(file)?.value.styles.declarations.some(d => d.prop.startsWith('--')) || raw.decisions.some(d => d.source.file === file);
    const start = performance.now();
    const view = dirty && !definitions ? (await analyze({ ...options, ledger: false }, undefined, new Focus(state, file, line))).report : await current();
    profileDuration('phase:site-analysis', performance.now() - start);
    const local = { ...view, findings: structuredClone(view.findings.filter(f => f.sites.some(s => s.file === file && s.line === line))),
      declarations: structuredClone(view.declarations.filter(d => d.site.file === file)), coverage: structuredClone(view.coverage), timing: { ...view.timing }, notes: [...view.notes] };
    return site(finishMessages(await applyLedger(local, {}, ledger)), file, line, params.column as number | undefined);
  }
  if (method === 'decisions') return (await current()).decisions;
  if (method === 'why') return inspectLedger('why', `${params.file}:${params.line}`, await report());
  if (method === 'health') return { status: 'ready', root: options.root, revision, pid: process.pid, rss: process.memoryUsage().rss, caches: state.caches, ...(process.env.PLUMB_PROFILE === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) };
  if (method === 'try') {
    const result = (await analyze({ ...options, ...(params.verbose === undefined ? {} : { verbose: params.verbose as boolean }), ledger: false }, { text: params.code as string, ...(params.lang ? { lang: params.lang as 'tsx' | 'css' } : {}), ...(params.as ? { as: params.as as string } : {}) }, state)).report;
    result.notes.push('Dead decisions skipped: try judges a snippet, not whole-project usage. Ledger allowances are not applied.');
    return result;
  }
  throw new Error(`Unknown method: ${method}.`);
}
let queue = Promise.resolve();
parentPort!.on('message', ({ id, method, params }) => {
  queue = queue.then(async () => {
    try { parentPort!.postMessage({ id, result: await dispatch(method, params), judged: state.judgement.judgedFiles }); }
    catch (error) { parentPort!.postMessage({ id, error: errorMessage(error) }); }
  });
});
try {
  ledger = await readLedger(options.root!);
  raw = (await analyze({ ...options, ledger: false }, undefined, state)).report;
  parentPort!.postMessage({ ready: true, dependencies: dependencies(), patterns: [...state.patterns], files: sourceFiles(), configurationFiles: [...state.configurationFiles], ...queryInputs() });
} catch (error) { parentPort!.postMessage({ startupError: errorMessage(error) }); }

import { parentPort, workerData } from 'node:worker_threads';
import { analyze } from '../index.js';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import { applyLedger } from '../ledger/check.js';
import { inspectLedger } from '../ledger/commands.js';
import { WarmState } from './state.js';
import { errorMessage } from '../errors.js';
import { performance } from 'node:perf_hooks';
import { Focus } from './focus.js';
import { readLedger } from '../ledger/store.js';
import { profileDuration } from '../profile.js';

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
  if (extra.ledger === false) return raw;
  if (extra.base !== undefined || extra.changed || extra.strictLedger) return applyLedger(structuredClone(raw), extra, ledger);
  if (!classified) classified = await applyLedger(structuredClone(raw), {}, ledger);
  return classified;
}
function site(r: Report, file: string, line: number, column?: number) {
  const matches = (s: { file: string; line: number; column: number }) => s.file === file && s.line === line && (column === undefined || s.column === column);
  return { file, line, ...(column === undefined ? {} : { column }),
    declarations: r.declarations.filter(d => matches(d.site)),
    findings: r.findings.filter(f => f.sites.some(matches)).map(f => ({ ...f, sites: f.sites.filter(matches), ...(f.occurrences ? { occurrences: f.occurrences.filter(d => matches(d.site)) } : {}) })) };
}
async function dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
  if (method === 'refresh') { performance.clearMeasures(); await update(params.paths as string[]); return { revision, dependencies: dependencies(), files: state.collection.parsedFiles, judged: state.judgement.judgedFiles, timing: raw.timing, ...(process.env.PLUMB_PROFILE === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) }; }
  if (method === 'report') return report(params as CheckOptions);
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
    return site(await applyLedger(local, {}, ledger), file, line, params.column as number | undefined);
  }
  if (method === 'decisions') return (await current()).decisions;
  if (method === 'why') return inspectLedger('why', `${params.file}:${params.line}`, await report());
  if (method === 'health') return { status: 'ready', root: options.root, revision, pid: process.pid, rss: process.memoryUsage().rss, caches: state.caches, ...(process.env.PLUMB_PROFILE === '1' ? { profile: performance.getEntriesByType('measure').map(p => [p.name, p.duration]) } : {}) };
  if (method === 'try') {
    const result = (await analyze({ ...options, ledger: false }, { text: params.code as string, ...(params.lang ? { lang: params.lang as 'tsx' | 'css' } : {}), ...(params.as ? { as: params.as as string } : {}) }, state)).report;
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
  parentPort!.postMessage({ ready: true, dependencies: dependencies(), patterns: [...state.patterns], files: [...state.collection.slices.keys()] });
} catch (error) { parentPort!.postMessage({ startupError: errorMessage(error) }); }

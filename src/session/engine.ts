import { environment, stateDirectory, statePath, configurationNames, isLedgerPath } from '../paths.js';
import { constants, watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { stat, lstat, readdir, readFile, realpath, open } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { glob, isDynamicPattern } from 'tinyglobby';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import type { TryOptions } from '../try.js';
import { errorMessage, UsageError } from '../errors.js';
import { sourceHash } from '../collect/cache.js';
import { matchesPath } from '../collect/pattern.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import type { ClassTraceLimit } from '../collect/computed.js';
import type { StructuredEdit, RefusedSite } from '../surfaces/edits.js';
import { isComponentJSX, jsxLocation, jsxAuthoredOwner, positionKind, sourcePaths } from './source-location.js';
import type { PositionKind } from './source-location.js';
import { elementProps, setProp } from './props.js';
import type { Props } from './props.js';
import { readText, textSites } from './text.js';
import { resolveTextAt, textTargets } from './text-at.js';
import type { TextAtResult } from './text-at.js';
import { containsPath, ownSourcePath, sourceBoundary, sourcePath } from '../source-boundary.js';
import { encodeJSXText, encodeTextLiteral, textWriteErrors } from './text-encoding.js';
import type { TextResult } from './text.js';
export type { TextRun, TextResult } from './text.js';

export interface SessionOptions extends CheckOptions { watch?: boolean; pollInterval?: number; polling?: boolean;
  /** Maximum wait before read execution, in milliseconds (default 5000). */
  readQueueMs?: number
}
export interface SiteResult { file: string; line: number; column?: number; declarations: Report['declarations']; findings: Report['findings'] }
export type ManyCall = { method: 'resolveSource'; args: Parameters<Session['resolveSource']> } | { method: 'site'; args: Parameters<Session['site']> };
export type ManyResult = { value: unknown } | { error: string; usage: boolean };
export interface EditsResult { revision: number; file: string; hash: string; edits: StructuredEdit[]; refused: RefusedSite[] }
export interface ClassesResult {
  revision: number; file: string; line: number; column: number;
  classes: { token: string; ambiguous: boolean; sites: (SiteResult & { column: number; hash: string; edits: StructuredEdit[] })[] }[];
  unattributed: string[];
  /** Rendered tokens whose attribution is incomplete because a hard limit stopped tracing. */
  limited: string[];
  /** Hard limits encountered during this trace; never includes elapsed time. */
  limits: ClassTraceLimit[];
}
export interface ApplyTextOptions { file: string; hash: string; run: string; from: string; to: string }
export interface ApplyTextAtOptions { file: string; hash: string; id: string; from: string; to: string }
export interface ApplyOptions { file: string; hash: string; edits: { id: string }[] }
/** Names one recorded write so it can be undone after the fact. */
export interface UndoHandle { id: string; file: string; label: string }
export interface ApplyResult { revision: number; file: string; hash: string; applied: string[]; remaining: Report['findings']; undo: UndoHandle }
export interface PropsResult extends Props { file: string; line: number; column: number; hash: string }
export interface SetOptions { file: string; hash: string; line: number; column: number; key: string; token: string }
export interface UndoResult { revision: number; file: string; hash: string; undone: string; remaining: Report['findings'] }
export interface HistoryEntry { id: string; file: string; line: number; label: string; at: string }
interface Recorded extends HistoryEntry { path: string; before: string; hashAfter: string }
const historyLimit = 20;
const shorten = (text: string) => { const one = text.replace(/\s+/g, ' ').trim(); return one.length > 40 ? one.slice(0, 39) + '…' : one; };
export type SourceResolution = { file: string; line?: number; column?: number; hash?: string; component?: string; authoredOwner?: boolean; usage?: true } | { library: true; untracked?: string } | { refused: 'not-jsx'; at: PositionKind } | { refused: 'source-mismatch' };
const staleFile = 'The file changed since the overlay read it. Read it again.';
const ignored = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.cache/**', '**/.plumb-cache/**', '**/.plumber/cache/**', '**/.plumb/cache/**'];
const tracked = (file: string) => /\.(?:[cm]?[jt]sx?|css|json|jsonl)$/.test(file) && !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(file) && !/(?:^|\/)\.plumb(?:er)?\/serve\.json$/.test(file);
const ignoredDirectory = (file: string) => /(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(file);
const missing = (error: unknown) => ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '');

/** Owns one warm analysis worker and serializes changes with reads. */
export class Session extends EventEmitter {
  readonly root: string;
  private worker!: Worker;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private id = 0;
  private hashes = new Map<string, string>();
  private sourceTexts = new Map<string, string>();
  private dependencies = new Set<string>();
  private patterns: string[] = [];
  private sourceFiles = new Set<string>();
  private outsideSources = new Set<string>();
  private configurationFiles = new Set<string>();
  private inputs: string[] = [];
  private inputPatterns: string[] = [];
  private analysisInputs = new Set<string>();
  private queryDependencies = new Map<string, string[]>();
  private watchers: FSWatcher[] = [];
  private timer?: NodeJS.Timeout;
  private debounce?: NodeJS.Timeout;
  private closed = false;
  private refreshing: Promise<string[]> | undefined;
  private batchRead = false;
  private reconciliations = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private failure: Error | undefined;
  private failurePaths: string[] = [];
  private stamps = new Map<string, string>();
  private directories = new Map<string, string | undefined>();
  private directoryFiles = new Map<string, Set<string>>();
  private directoryChildren = new Map<string, Set<string>>();
  private patternRoots = new Map<string, number>();
  private patternsDirty = true;
  private lastStats: unknown;
  private revision = 0;
  private written: Recorded[] = [];
  private writes = 0;
  private native = false;
  private events = new Set<string>();
  private inventoryDirty = false;
  private patternFiles = new Set<string>();
  private constructor(private options: SessionOptions) { super(); this.root = resolve(options.root ?? process.cwd()); }
  static async create(options: SessionOptions = {}): Promise<Session> {
    if (options.watch === undefined && environment('WATCH') === '0') options = { ...options, watch: false };
    const session = new Session(options);
    try {
      await session.start(); await session.scan(true);
      await session.request('inventory', { files: session.retainedFiles() });
      if (options.watch !== false) session.observe();
      return session;
    } catch (error) { await session.close(); throw error; }
  }
  private retainedFiles(): string[] {
    const files = new Set(this.hashes.keys());
    for (const entries of this.directoryFiles.values()) for (const file of entries) {
      // A listing can precede a concurrent deletion. File stats are authoritative
      // for tracked entries; never reintroduce a path they have already removed.
      if (!tracked(relative(this.root, file)) && !this.patternMatch(file) && !this.dependencies.has(file)) files.add(file);
    }
    return [...files];
  }
  private async start(): Promise<void> {
    if (this.closed) throw new UsageError('Session is closed. Start a new session.');
    const inventory = this.directories.size ? this.retainedFiles() : undefined;
    const worker = this.worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: { ...this.options, root: this.root, inventory } });
    await new Promise<void>((resolveReady, rejectReady) => {
      this.worker.on('message', message => {
        if (message.health) this.healthSnapshot = message.health;
        if (message.ready) { this.dependencies.clear(); for (const file of message.dependencies) this.dependencies.add(file);
          this.patterns = message.patterns; this.patternsDirty = true; this.sourceFiles.clear(); for (const file of message.files) this.sourceFiles.add(file);
          this.configurationFiles.clear(); for (const file of message.configurationFiles) this.configurationFiles.add(file);
          this.inputs = message.inputs; this.inputPatterns = message.inputPatterns; this.selectAnalysisInputs(); this.queryDependencies.clear(); for (const [file, paths] of message.queryDependencies) this.queryDependencies.set(file, paths);
          resolveReady(); return; }
        const failure = (text: string): Error => {
          const error = message.usageError ? new UsageError(text) : new Error(text);
          if (message.errorStack) error.stack = message.errorStack;
          return error;
        };
        if (message.startupError) { rejectReady(failure(message.startupError)); return; }
        const pending = this.pending.get(message.id); if (!pending) return;
        this.pending.delete(message.id);
        if (message.analysis) {
          this.inputs = message.analysis.inputs;
          if (JSON.stringify(this.inputPatterns) !== JSON.stringify(message.analysis.inputPatterns)) {
            this.inputPatterns = message.analysis.inputPatterns; this.selectAnalysisInputs();
          }
          for (const path of message.analysis.dependencies) this.dependencies.add(path);
          for (const [file, paths] of message.analysis.queryDependencies) this.queryDependencies.set(file, paths);
        }
        if (message.judged) this.lastStats = { ...(this.lastStats as object ?? {}), judged: message.judged };
        if (message.error) pending.reject(failure(message.error)); else pending.resolve(message.result);
      });
      this.worker.on('error', error => { rejectReady(error); this.rejectPending(error); });
      worker.on('exit', code => { if (this.worker === worker && code !== 0) { const error = new Error(`Analysis worker exited with code ${code}.`); rejectReady(error); if (!this.closed) this.rejectPending(error); } });
    });
  }
  private rejectPending(error: Error): void { for (const p of this.pending.values()) p.reject(error); this.pending.clear(); }
  private request<T>(method: string, params: object = {}): Promise<T> {
    if (this.closed) return Promise.reject(new UsageError('Session is closed. Start a new session.'));
    const id = ++this.id;
    return new Promise<T>((resolveValue, reject) => { this.pending.set(id, { resolve: value => resolveValue(value as T), reject }); this.worker.postMessage({ id, method, params }); });
  }
  private serialize<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run); this.queue = next.catch(() => {}); return next;
  }
  private selectAnalysisInputs(): void {
    this.analysisInputs = new Set(this.inputPatterns.filter(pattern => !isDynamicPattern(pattern)));
    for (const file of this.patternFiles) if (this.inputPatterns.some(pattern => matchesPath(file, pattern))) this.analysisInputs.add(file);
  }
  private async inventory(): Promise<string[]> {
    const [sources, matches] = await Promise.all([
      glob('**/*.{tsx,jsx,ts,js,mjs,mts,cjs,cts,css,json,jsonl}', { cwd: this.root, absolute: true, dot: true, ignore: ignored, followSymbolicLinks: false }),
      this.patterns.length ? glob(this.patterns, { cwd: this.root, absolute: true, dot: true, followSymbolicLinks: false }) : [],
    ]);
    this.patternFiles.clear(); for (const file of matches) this.patternFiles.add(file);
    return [...new Set([...sources.filter(file => tracked(relative(this.root, file))), ...matches, ...this.dependencies])].sort();
  }
  private patternMatch(file: string): boolean {
    return this.patterns.some(pattern => matchesPath(file, pattern) || matchesPath(file, pattern + '/**'));
  }
  private recursiveDirectory(path: string): boolean {
    const inside = relative(this.root, path).replaceAll('\\', '/');
    if (!inside.startsWith('../') && inside !== '..' && !isAbsolute(inside) && !ignoredDirectory(inside)) return true;
    for (const [root, depth] of this.patternRoots) {
      const child = relative(root, path);
      if (child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child) && (!child || child.split(sep).length <= depth)) return true;
    }
    return false;
  }
  private async retainDirectory(path: string, paths: Set<string>): Promise<void> {
    if (this.directories.has(path)) return;
    this.directories.set(path, undefined);
    // Missing configured locations stay retained and are statted each read.
    await this.scanDirectory(path, paths);
  }
  private async scanDirectory(path: string, paths: Set<string>): Promise<void> {
    let info;
    try { info = await lstat(path); }
    catch (error) { if (!missing(error)) throw error; this.directories.set(path, undefined); this.directoryFiles.delete(path); this.directoryChildren.delete(path); return; }
    if (!info.isDirectory()) { this.directories.set(path, undefined); this.directoryFiles.delete(path); this.directoryChildren.delete(path); return; }
    const stamp = `${info.mtimeMs}:${info.ino}`;
    if (this.directories.get(path) === stamp) return;
    // Retain the stamp from BEFORE listing. A concurrent membership change
    // must leave a different stamp for the next read, never be acknowledged unseen.
    this.directories.set(path, stamp);
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { this.directories.set(path, undefined); if (!missing(error)) throw error; return; }
    let files = this.directoryFiles.get(path);
    if (!files) this.directoryFiles.set(path, files = new Set());
    files.clear();
    let children = this.directoryChildren.get(path);
    if (!children) this.directoryChildren.set(path, children = new Set());
    children.clear();
    for (const entry of entries) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) {
        children.add(file);
        if (this.recursiveDirectory(file)) await this.retainDirectory(file, paths);
      } else if (entry.isFile()) {
        files.add(file);
        const inside = relative(this.root, file).replaceAll('\\', '/');
        if (this.patternMatch(file)) { this.patternFiles.add(file); paths.add(file); }
        if (this.dependencies.has(file) || inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside) && tracked(inside)) paths.add(file);
      }
    }
  }
  private async retainLocations(paths: Set<string>): Promise<void> {
    if (this.patternsDirty) {
      this.patternRoots.clear();
      for (const pattern of this.patterns) {
        const parts = pattern.split(sep), dynamic = parts.findIndex(part => isDynamicPattern(part));
        const root = dynamic < 0 ? dirname(pattern) : parts.slice(0, dynamic).join(sep) || sep;
        const depth = dynamic < 0 ? 0 : parts.slice(dynamic).some(part => part.includes('**')) ? Infinity : parts.length - dynamic - 1;
        this.patternRoots.set(root, Math.max(this.patternRoots.get(root) ?? 0, depth));
        // Literal patterns can name a directory, including one not created yet.
        if (dynamic < 0) this.patternRoots.set(pattern, Infinity);
      }
    }
    const locations = new Set([this.root, stateDirectory(this.root), ...this.patternRoots.keys(),
      ...[...this.dependencies, ...this.inputs, ...(this.options.config ? [resolve(this.root, this.options.config)] : [])].map(dirname)]);
    for (const path of locations) {
      await this.retainDirectory(path, paths);
    }
    // New configuration can match already-listed files without changing their
    // directory stamp. Match the retained names, never re-glob those locations.
    if (this.patternsDirty) {
      for (const children of this.directoryChildren.values()) for (const child of children) {
        if (this.recursiveDirectory(child)) await this.retainDirectory(child, paths);
      }
      for (const files of this.directoryFiles.values()) for (const file of files) {
        if (this.patternMatch(file)) { this.patternFiles.add(file); paths.add(file); }
      }
      this.patternsDirty = false;
    }
  }
  private async scan(initial = false, query?: string[], full = false): Promise<string[]> {
    if (this.closed) return [];
    const local = query !== undefined && !initial && !full;
    // Dependency closures are query inputs, not startup inventory. Expanding
    // and transferring every file's closure duplicates large shared graphs.
    // Ask the analysis worker for only the paths this reconciliation needs.
    const queryPaths = local ? await this.request<string[]>('queryDependencies', { files: query }) : [];
    const paths = new Set(local ? [...query, ...this.inputs, ...(this.options.config ? [resolve(this.root, this.options.config)] :
      configurationNames(this.root).map(name => resolve(this.root, name))), statePath(this.root, 'ledger.jsonl'),
      ...this.analysisInputs, ...queryPaths] :
      [...this.events, ...query ?? [], ...this.hashes.keys(), ...this.dependencies, ...this.inputs, ...this.patternFiles]);
    if (!local) this.events.clear();
    if (initial || full || !local && this.inventoryDirty) {
      for (const path of await this.inventory()) paths.add(path);
      this.inventoryDirty = false;
    }
    if (local) {
      // Check only target membership. Do not acknowledge directory changes that
      // a later full report still needs to enumerate. Events are never evidence.
      for (const directory of new Set(query.map(dirname))) {
        try { await lstat(directory); } catch (error) { if (!missing(error)) throw error; }
      }
    } else {
      await this.retainLocations(paths);
      for (const path of this.directories.keys()) await this.scanDirectory(path, paths);
    }
    const changed: string[] = [];
    // Full reports reconcile the inventory; targeted reads always stat their
    // known analysis inputs, equally with native, polling or disabled watchers.
    await Promise.all([...paths].map(async path => {
      const old = this.hashes.get(path), previousStamp = this.stamps.get(path);
      let hash: string | undefined;
      try {
        // Event/query paths bypass Dirent classification. Match the startup
        // inventory's followSymbolicLinks:false rule for source membership;
        // explicitly discovered dependencies may still follow their targets.
        const identity = await lstat(path);
        const info = identity.isSymbolicLink() && (this.dependencies.has(path) || this.inputs.includes(path)) ? await stat(path) : identity;
        if (info.isFile()) {
          const stamp = `${info.mtimeMs}:${info.ctimeMs}:${info.ino}:${info.size}`;
          if (previousStamp === stamp && old !== undefined) hash = old;
          else { const text = await readFile(path, 'utf8'); hash = sourceHash(text); if (/\.[cm]?[jt]sx?$/.test(path)) this.sourceTexts.set(path, text); }
          this.stamps.set(path, stamp);
        } else this.stamps.delete(path);
      } catch (error) {
        // Keep unreadable files in the inventory so collection can diagnose
        // them without aborting the Session's reconciliation.
        if (!missing(error)) hash = `<unreadable:${errorMessage(error)}>`;
        this.stamps.delete(path);
      }
      if (hash === undefined) { this.hashes.delete(path); this.sourceTexts.delete(path); this.patternFiles.delete(path); } else this.hashes.set(path, hash);
      if (hash !== old) changed.push(path);
    }));
    if (!local) this.selectAnalysisInputs();
    if (initial) return [];
    if (!changed.length) { if (this.failure) throw this.failure; return []; }
    const broad = changed.some(path => !isLedgerPath(path) && (this.configurationFiles.has(path) || !/\.(?:[jt]sx?|css)$/.test(path) || !this.sourceFiles.has(path) && !this.dependencies.has(path) || !this.hashes.has(path)));
    try {
      if (broad || this.failure) { await this.worker.terminate(); this.rejectPending(new Error('Session inputs changed.')); await this.start(); }
      else {
        const result = await this.request<{ dependencyDelta: string[]; dependencyQueries: [string, string[]][]; queryDependencies: [string, string[]][] }>('refresh', { paths: changed });
        for (const path of result.dependencyDelta) this.dependencies.add(path);
        for (const [file, paths] of result.dependencyQueries) this.queryDependencies.set(file, paths);
        this.lastStats = result;
      }
      if (!local) await this.retainLocations(new Set());
      this.failure = undefined; this.failurePaths = [];
      this.revision++; this.emit('change', changed);
    } catch (error) { this.failure = error as Error; this.failurePaths = changed; throw error; }
    return changed;
  }
  private observe(): void {
    if (!(this.options.polling ?? environment('POLLING') === '1')) {
      try {
        this.watchers.push(watch(this.root, { recursive: true }, (_event, file) => {
          const name = file === null ? undefined : String(file).replaceAll('\\', '/');
          const path = name === undefined ? undefined : resolve(this.root, name);
          if (name === undefined || path !== undefined && this.dependencies.has(path) || !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache)(?:\/|$)/.test(name) && !/(?:^|\/)\.plumb(?:er)?\/serve\.json$/.test(name)) {
            if (path && (tracked(name!) || this.dependencies.has(path) || this.directories.has(path))) this.events.add(path);
            if (this.debounce) clearTimeout(this.debounce);
            this.debounce = setTimeout(() => { void this.refresh().catch(error => this.emit('diagnostic', error)); }, 5);
          }
        }));
        this.native = true;
        this.watchers[0]!.on('error', error => { this.native = false; this.inventoryDirty = true; this.watchers[0]?.close(); this.emit('diagnostic', error); });
      } catch { /* Polling below works on platforms without recursive fs.watch. */ }
    }
    this.timer = setInterval(() => { void this.refresh().catch(error => this.emit('diagnostic', error)); }, this.options.pollInterval ?? 250);
  }
  private async reconcile(query?: string[], full = false): Promise<string[]> {
    this.reconciliations++;
    const changed = new Set<string>();
    do {
      for (const path of await this.scan(false, query, full)) changed.add(path);
      full = false;
    } while (query === undefined && this.native && (this.inventoryDirty || this.events.size));
    return [...changed];
  }
  /** Reconcile retained stats; opt into a full inventory only for explicit recovery. */
  refresh(full = false): Promise<string[]> { if (!this.refreshing) this.refreshing = this.serialize(() => this.reconcile(undefined, full)).finally(() => { this.refreshing = undefined; }); return this.refreshing; }
  private serializeRead<T>(run: () => Promise<T>): Promise<T> { return this.batchRead ? run() : this.serialize(run); }
  /** Coordinator holds the write barrier while one reconciliation serves this read cohort. */
  batch<T>(query: string[] | undefined, run: () => Promise<T>): Promise<T> {
    return this.serialize(async () => {
      await this.reconcile(query);
      this.batchRead = true;
      try { return await run(); } finally { this.batchRead = false; }
    });
  }
  private read<T>(method: string, params: object = {}): Promise<T> { return this.serializeRead(() => this.settledRead<T>(method, params)); }
  private async settledRead<T>(method: string, params: object): Promise<T> {
    do {
      const local = method === 'site' || method === 'why' || method === 'edits' || method === 'classes';
      const query = local ? [(params as { file: string }).file] : undefined;
      if (query) await this.readableSource(query[0]!);
      try { if (!this.batchRead) await this.reconcile(query); }
      catch (error) {
        const as = (params as { as?: string }).as, target = resolve(this.root, as ?? 'src/__plumb_try__.tsx');
        if (method !== 'try' || !this.sourceFiles.has(target) || !this.failurePaths.length || this.failurePaths.some(file => file !== target)) throw error;
        // A valid overlay can repair the sole invalid source for this read.
        // Keep the on-disk diagnostic and the retained project report unchanged.
      }
      const result = await this.request<T>(method, params);
      // Events received while the worker was answering belong to this read too.
      if (this.batchRead || local || !this.native || !this.inventoryDirty && !this.events.size) return result;
    } while (true);
  }
  report(options: Pick<CheckOptions, 'ledger' | 'base' | 'changed' | 'strictLedger' | 'verbose'> = {}): Promise<Report> { return this.read('report', options); }
  private async resolveFile(source: string, servedRoot?: string, stamped = false): Promise<string | SourceResolution> {
    const candidates = sourcePaths(this.root, source, servedRoot, stamped);
    // Fall back only when the served file is absent. Invalid or untracked
    // served evidence must never adopt a same-named repository file.
    let file = candidates[0]!;
    if (candidates.length > 1) for (const candidate of candidates) {
      try { await lstat(candidate); file = candidate; break; }
      catch (error) { if (!missing(error)) throw error; }
    }
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (!inside || ignoredDirectory(inside) || !/\.[cm]?[jt]sx?$/.test(file)) return { library: true };
    // Authored shared code is a source boundary, never permission to use an
    // ancestor's JSX. Classification does not read bytes outside the project.
    if (!containsPath(this.root, file) && (!containsPath(sourceBoundary(this.root), file) || !this.sourceFiles.has(file))) return { library: true, untracked: inside };
    // Classify before reading source: linked packages and symlinked directories
    // must never introduce external snapshots into this project's Session.
    try {
      if (await realpath(file) !== resolve(await realpath(this.root), inside)) return { library: true };
    } catch (error) {
      if (!missing(error)) throw error;
      return { library: true, untracked: inside };
    }
    return file;
  }
  /** Validate before reconciliation; untrusted source spellings cannot add disk snapshots. */
  async readQuery(method: string, args: unknown[]): Promise<string[] | undefined> {
    if (method === 'many') {
      const paths = new Set<string>();
      for (const call of args[0] as ManyCall[]) {
        const query = await this.readQuery(call.method, call.args);
        if (query === undefined) return undefined;
        for (const path of query) paths.add(path);
      }
      return [...paths];
    }
    if (method === 'resolveSource') {
      const expected = args[3] as { servedRoot?: string; stamp?: boolean } | undefined;
      const file = await this.resolveFile(args[0] as string, expected?.servedRoot, expected?.stamp);
      return typeof file === 'string' ? [file] : [];
    }
    if (['site', 'edits', 'text', 'textAt', 'why', 'classes'].includes(method)) {
      const file = this.file(args[0] as string); this.position(args[1] as number);
      await this.readableSource(file);
      if (method === 'classes') this.validateClasses(args[3]);
      if (method === 'classes' || args[2] !== undefined) this.position(args[2] as number);
      return [file];
    }
    return undefined;
  }
  /** Several reads in one cohort: the overlay sends a view's worth of resolve and site questions as one request, so
   * the lock, the reconciliation and the round trip are paid once, not once per element. Each answer stands alone:
   * a refused question does not refuse the others. */
  many(calls: ManyCall[]): Promise<ManyResult[]> {
    return this.serializeRead(async () => {
      if (!this.batchRead) await this.reconcile(await this.readQuery('many', [calls]));
      const wasBatch = this.batchRead;
      this.batchRead = true;
      try {
        return await Promise.all(calls.map(async call => {
          try { return { value: await (this[call.method] as (...args: unknown[]) => Promise<unknown>)(...call.args) }; }
          catch (error) { return { error: errorMessage(error), usage: error instanceof UsageError }; }
        }));
      } finally { this.batchRead = wasBatch; }
    });
  }
  resolveSource(source: string, line?: number, column?: number, expected: { tag?: string; component?: boolean; hash?: string; snapshot?: boolean; owner?: boolean; servedRoot?: string; stamp?: boolean } = {}): Promise<SourceResolution> {
    return this.serializeRead(async () => {
      const classified = await this.resolveFile(source, expected.servedRoot, expected.stamp);
      if (typeof classified !== 'string') {
        if ('untracked' in classified && classified.untracked && this.outsideSources.size < 64) this.outsideSources.add(sourcePath(this.root, classified.untracked));
        return classified;
      }
      const file = classified, inside = relative(this.root, file).replaceAll('\\', '/');
      if (!this.batchRead) await this.reconcile([file]);
      if (!this.sourceFiles.has(file)) {
        if (this.outsideSources.size < 64) this.outsideSources.add(file);
        return { library: true, untracked: inside };
      }
      // Hash-bound browser evidence must compare with the file on disk, even
      // if a save races reconciliation or preserves the cached stat stamp.
      const text = expected.snapshot || expected.hash !== undefined ? await readFile(file, 'utf8') : this.sourceTexts.get(file) ?? await readFile(file, 'utf8');
      const hash = expected.snapshot || expected.hash !== undefined ? sourceHash(text) : this.hashes.get(file);
      if (expected.stamp) {
        const location = line === undefined || column === undefined ? undefined : jsxLocation(file, text, this.position(line), this.position(column), undefined, 'any');
        if (!location || location.line !== line || location.column !== column || !expected.tag ||
          !/^[a-f0-9]{12}$/.test(expected.hash ?? '') || !hash?.startsWith(expected.hash!) ||
          !isComponentJSX(location.tag) && location.tag !== expected.tag) return { refused: 'source-mismatch' };
        const usage = isComponentJSX(location.tag);
        if (location.tag === 'Fragment' || location.tag.endsWith('.Fragment')) return { refused: 'source-mismatch' };
        return { file: inside, line, column, hash, ...(usage ? { component: location.tag, usage: true as const } : {}) };
      }
      if (expected.hash !== undefined && expected.hash !== hash) throw new UsageError(staleFile);
      if (line === undefined && column === undefined) return { file: inside, ...(expected.snapshot ? { hash: hash! } : {}) };
      if (line === undefined || column === undefined) throw new UsageError('Source location requires both line and column.');
      const anyOpening = !expected.component && expected.tag === undefined;
      const location = jsxLocation(file, text, this.position(line), this.position(column), expected.tag, anyOpening ? 'any' : expected.component);
      if (!location) {
        if (anyOpening) return { refused: 'not-jsx', at: positionKind(file, text, this.position(line), this.position(column)) };
        throw new UsageError('Source position does not identify an authored JSX element.');
      }
      return { file: inside, line: location.line, column: location.column,
        ...(expected.owner ? { authoredOwner: jsxAuthoredOwner(file, text, location) } : {}),
        ...(expected.component || anyOpening && isComponentJSX(location.tag) ? { component: location.tag } : {}) };
    });
  }
  site(file: string, line: number, column?: number): Promise<SiteResult> {
    return this.read('site', { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) });
  }
  text(file: string, line: number, column: number): Promise<TextResult> {
    const path = this.file(file); this.position(line); this.position(column);
    return this.serializeRead(async () => {
      await this.readableSource(path);
      if (!this.batchRead) await this.reconcile([path]);
      if (!this.sourceFiles.has(path) || !/\.[cm]?[jt]sx?$/.test(path)) throw new UsageError('Text edits require a tracked JSX source file.');
      const source = await readFile(path, 'utf8');
      return readText(path, source, line, column);
    });
  }
  edits(file: string, line: number, column?: number): Promise<EditsResult> {
    const params = { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) };
    return this.serializeRead(async () => {
      const result = await this.settledRead<Omit<EditsResult, 'revision'>>('edits', params);
      if (result.hash !== this.hashes.get(params.file)) throw new UsageError(staleFile);
      return { revision: this.revision, ...result };
    });
  }
  private validateClasses(classes: unknown): void {
    if (typeof classes !== 'string' || classes.length > 65536) throw new UsageError('classes must be a string of at most 65536 characters.');
  }
  classes(file: string, line: number, column: number, classes: string): Promise<ClassesResult> {
    this.validateClasses(classes);
    const params = { file: this.file(file), line: this.position(line), column: this.position(column), classes };
    return this.serializeRead(async () => {
      const result = await this.settledRead<Omit<ClassesResult, 'revision'>>('classes', params);
      // Reconcile newly discovered helper paths too. Known cohort inputs were
      // already reconciled by batch, including their retained dependencies.
      const paths = [...new Set(result.classes.flatMap(item => item.sites.map(site => site.file)))].filter(path => !this.batchRead || !this.hashes.has(path));
      if (paths.length && (await this.reconcile(paths)).length) return { revision: this.revision, ...await this.settledRead<Omit<ClassesResult, 'revision'>>('classes', params) };
      return { revision: this.revision, ...result };
    });
  }
  applyText(options: ApplyTextOptions): Promise<ApplyResult> {
    const { file, hash, run: id, from, to } = options ?? {} as ApplyTextOptions;
    return this.writeText(file, hash, id, from, to, (_file, source) => {
      // Re-derive the run from the held file, never trust a client range or text.
      const site = textSites(_file, source).find(site => site.runs.some(run => run.id === id));
      const run = site?.runs.find(run => run.id === id);
      if (!site || !run) throw new UsageError(textWriteErrors.unknown);
      if (run.text !== from) throw new UsageError(textWriteErrors.mismatch);
      const start = run.literal?.start ?? run.start, end = run.literal?.end ?? run.end;
      return { start, end, at: site.element.openingElement.start,
        replacement: run.literal ? encodeTextLiteral(to, run.literal.quote) : encodeJSXText(source.slice(start, end), to) };
    });
  }
  /** Every property family an editor needs for the JSX element at this position, set or not. */
  async props(file: string, line: number, column: number): Promise<PropsResult> {
    const path = this.file(file); this.position(line); this.position(column);
    const { text, location, site, decisions } = await this.elementFacts(path, line, column);
    return { file: path, line: location.line, column: location.column, hash: sourceHash(text),
      ...elementProps(path, text, location.start, location.tag, decisions, site.declarations) };
  }
  private async elementFacts(path: string, line: number, column: number) {
    await this.readableSource(path);
    if (!/\.[cm]?[jt]sx$/.test(path) && !/\.[cm]?jsx?$/.test(path)) throw new UsageError('Properties need a JSX source file.');
    const text = await readFile(path, 'utf8');
    const location = jsxLocation(path, text, line, column, undefined, 'any');
    if (!location) throw new UsageError('Source position does not identify an authored JSX element.');
    const [site, decisions] = await Promise.all([this.site(path, location.line, location.column), this.decisions()]);
    if (sourceHash(await readFile(path, 'utf8')) !== sourceHash(text)) throw new UsageError(staleFile);
    return { text, location, site, decisions };
  }
  /** Set one property of an element to one of its steps: replace the class that sets it, or add one. */
  async set(options: SetOptions): Promise<ApplyResult> {
    const { file, hash, line, column, key, token } = options ?? {} as SetOptions;
    if (typeof file !== 'string' || !file.trim() || typeof hash !== 'string' || !hash.trim() || typeof key !== 'string' || !key.trim() || typeof token !== 'string' || !token.trim()) throw new UsageError('Set requires file, hash, line, column, key and token.');
    const path = this.file(file); this.position(line); this.position(column);
    const facts = await this.elementFacts(path, line, column);
    if (sourceHash(facts.text) !== hash) throw new UsageError(staleFile);
    const current = elementProps(path, facts.text, facts.location.start, facts.location.tag, facts.decisions, facts.site.declarations).props.find(item => item.key === key);
    const label = `${key}: ${current?.token ?? current?.value ?? 'unset'} → ${token}`;
    return this.writeText(path, hash, `set:${key}`, current?.class ?? key, token, (_file, source) => {
      if (sourceHash(source) !== hash) throw new UsageError(staleFile);
      const change = setProp(_file, source, facts.location.start, facts.location.tag, facts.decisions, facts.site.declarations, key, token);
      return { ...change, replacement: change.replacement };
    }, label);
  }
  /** The text-at write: one string (JSX text, an attribute or a literal) addressed by the id text-at returned. */
  applyTextAt(options: ApplyTextAtOptions): Promise<ApplyResult> {
    const { file, hash, id, from, to } = options ?? {} as ApplyTextAtOptions;
    return this.writeText(file, hash, id, from, to, (_file, source) => {
      const target = textTargets(_file, source).targets.find(target => target.id === id);
      if (!target) throw new UsageError(textWriteErrors.unknown);
      if (target.text !== from) throw new UsageError(textWriteErrors.mismatch);
      if (target.plain && /[\r\n]/.test(to)) throw new UsageError('An attribute holds one line of text.');
      return { start: target.start, end: target.end, replacement: target.replace(to), at: target.start };
    });
  }
  private async writeText(path: string, hash: string, id: string, from: string, to: string, find: (file: string, source: string) => { start: number; end: number; replacement: string; at: number }, label?: string): Promise<ApplyResult> {
    if (typeof path !== 'string' || !path.trim() || typeof hash !== 'string' || !hash.trim() ||
      typeof id !== 'string' || !id.trim() || typeof from !== 'string' || typeof to !== 'string') throw new UsageError(textWriteErrors.parameters);
    if (!to.trim()) throw new UsageError(textWriteErrors.empty);
    if (to.length > 500) throw new UsageError(textWriteErrors.length);
    const file = this.file(path);
    return this.serialize(async () => {
      await this.editableFile(file);
      if (sourceHash(await readFile(file, 'utf8')) !== hash) throw new UsageError(staleFile);
      await this.reconcile([file]);
      if (!this.sourceFiles.has(file) || !/\.[cm]?[jt]sx?$/.test(file)) throw new UsageError('Text edits require a tracked JSX source file.');
      const identity = await this.editableFile(file);
      const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string, siteLine: number, before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(file, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        const source = bytes.subarray(0, offset).toString('utf8');
        if (sourceHash(source) !== hash) throw new UsageError(staleFile);
        before = source;
        const { start, end, replacement, at } = find(file, source);
        next = source.slice(0, start) + replacement + source.slice(end);
        siteLine = sourceSite({ file, text: source, lineStarts: lineStarts(source) }, at, '').line;
        await this.sameFile(file, identity);
        await handle.writeFile(next, 'utf8'); await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(file, identity);
      } finally { await handle.close(); }
      await this.reconcile([file]);
      const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites: [{ line: siteLine }] });
      if (snapshot.hash !== sourceHash(next) || snapshot.hash !== this.hashes.get(file) || sourceHash(await readFile(file, 'utf8')) !== snapshot.hash) throw new UsageError(staleFile);
      const undo = this.record(file, before, snapshot.hash, siteLine, label ?? `“${shorten(from)}” → “${shorten(to)}”`);
      return { revision: this.revision, file, hash: snapshot.hash, applied: [id], remaining: snapshot.remaining, undo };
    });
  }
  async apply(options: ApplyOptions): Promise<ApplyResult> {
    if (!options || typeof options.file !== 'string' || !options.file.trim() || typeof options.hash !== 'string' || !options.hash.trim() ||
      !Array.isArray(options.edits) || !options.edits.length || options.edits.some(edit => !edit || typeof edit.id !== 'string' || !edit.id.trim())) {
      throw new UsageError('Apply requires a file, hash and a non-empty array of edit ids.');
    }
    const file = this.file(options.file), hash = options.hash, ids = options.edits.map(edit => edit.id);
    return this.serialize(async () => {
      await this.editableFile(file);
      if (sourceHash(await readFile(file, 'utf8')) !== hash) throw new UsageError(staleFile);
      await this.reconcile([file]);
      // Re-derive every choice from the current source and decisions, never from client text.
      const current = await this.request<Omit<EditsResult, 'revision'>>('edits', { file });
      if (current.hash !== hash || this.hashes.get(file) !== hash) throw new UsageError(staleFile);
      const known = new Map(current.edits.map(edit => [edit.id, edit]));
      const selected = ids.map(id => { const edit = known.get(id); if (!edit) throw new UsageError(`Unknown edit id: ${id}. Read the site's edits again.`); return edit; });
      const ordered = selected.toSorted((a, b) => a.start - b.start || a.end - b.end);
      for (let i = 1; i < ordered.length; i++) if (ordered[i]!.start < ordered[i - 1]!.end) throw new UsageError('Edits overlap. Choose one edit for each source range.');
      // Refuse aliases and hard links, and hold the source descriptor throughout the write.
      const identity = await this.editableFile(file);
      const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
      let next: string, before: string;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(file, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        const source = bytes.subarray(0, offset).toString('utf8');
        if (sourceHash(source) !== hash) throw new UsageError(staleFile);
        before = source;
        next = source;
        for (const edit of ordered.toReversed()) next = next.slice(0, edit.start) + edit.to + next.slice(edit.end);
        await this.sameFile(file, identity);
        await handle.writeFile(next, 'utf8');
        await handle.truncate(Buffer.byteLength(next));
        await this.sameFile(file, identity);
      } finally { await handle.close(); }
      await this.reconcile([file]);
      // Earlier replacements can shift later columns. Query the resulting authored sites.
      const starts = lineStarts(next);
      let delta = 0;
      const sites = ordered.map(edit => {
        const site = sourceSite({ file, text: next, lineStarts: starts }, edit.start + delta, edit.to);
        delta += edit.to.length - (edit.end - edit.start);
        return { line: site.line };
      });
      const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites });
      if (snapshot.hash !== sourceHash(next) || snapshot.hash !== this.hashes.get(file) || sourceHash(await readFile(file, 'utf8')) !== snapshot.hash) throw new UsageError(staleFile);
      const undo = this.record(file, before, snapshot.hash, sites[0]!.line, ordered.map(edit => `${shorten(edit.from)} → ${shorten(edit.to)}`).join(', '));
      return { revision: this.revision, file, hash: snapshot.hash, applied: ids, remaining: snapshot.remaining, undo };
    });
  }
  /** Remember the file as it was, so this write can be taken back while nothing has touched it since. */
  private record(path: string, before: string, hashAfter: string, line: number, label: string): UndoHandle {
    const file = relative(this.root, path).replaceAll('\\', '/');
    const id = `w${++this.writes}`;
    this.written.push({ id, file, line, label, at: new Date().toISOString(), path, before, hashAfter });
    if (this.written.length > historyLimit) this.written.splice(0, this.written.length - historyLimit);
    return { id, file, label };
  }
  /** Recent writes, newest first. */
  history(): Promise<{ writes: HistoryEntry[] }> {
    return Promise.resolve({ writes: this.written.toReversed().map(({ id, file, line, label, at }) => ({ id, file, line, label, at })) });
  }
  /** Restore the file as it was before a write, when nothing has changed it since. Goes through the same guards as a write. */
  undo(id: string): Promise<UndoResult> {
    if (typeof id !== 'string' || !id.trim()) throw new UsageError('Undo requires the id of a write.');
    return this.serialize(async () => {
      const entry = this.written.find(item => item.id === id);
      if (!entry) throw new UsageError('That write is not in the history; only the last 20 writes can be undone, and each only once.');
      const file = this.file(entry.path);
      await this.editableFile(file);
      if (sourceHash(await readFile(file, 'utf8')) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
      await this.reconcile([file]);
      if (this.hashes.get(file) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
      const identity = await this.editableFile(file);
      const handle = await open(file, constants.O_RDWR | constants.O_NOFOLLOW);
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
        if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
        await this.sameFile(file, identity);
        const bytes = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
        if (sourceHash(bytes.subarray(0, offset).toString('utf8')) !== entry.hashAfter) throw new UsageError('The file changed since this write. Undo the newer writes first, or edit it by hand.');
        await this.sameFile(file, identity);
        await handle.writeFile(entry.before, 'utf8'); await handle.truncate(Buffer.byteLength(entry.before));
        await this.sameFile(file, identity);
      } finally { await handle.close(); }
      this.written = this.written.filter(item => item.id !== id);
      await this.reconcile([file]);
      const snapshot = await this.request<{ hash: string; remaining: Report['findings'] }>('remaining', { file, sites: [{ line: entry.line }] });
      if (snapshot.hash !== sourceHash(entry.before) || snapshot.hash !== this.hashes.get(file)) throw new UsageError(staleFile);
      return { revision: this.revision, file, hash: snapshot.hash, undone: id, remaining: snapshot.remaining };
    });
  }
  decisions(): Promise<Report['decisions']> { return this.read('decisions'); }
  why(file: string, line: number): Promise<Awaited<ReturnType<typeof import('../ledger/commands.js').inspectLedger>>> { return this.read('why', { file: this.file(file), line: this.position(line) }); }
  try(code: string, options: Pick<TryOptions, 'lang' | 'as' | 'verbose'> = {}): Promise<Report> { return this.read('try', { code, ...options }); }
  private healthSnapshot: { caches: object; work?: object } = { caches: {} };
  /** Where these words are written: JSX text in the element, an attribute at it or a use site, or a literal in source. */
  textAt(file: string, line: number, column: number, words: string, owners?: string): Promise<TextAtResult> {
    const path = this.file(file); this.position(line); this.position(column);
    if (typeof words !== 'string' || words.length > 2000) throw new UsageError('text must be at most 2000 characters.');
    // Owners are untrusted: any that is not readable project source is skipped, never an error.
    const chain: { path: string; line: number; column: number }[] = [];
    for (const item of (owners ?? '').split(',').slice(0, 32)) {
      const match = /^(.+):(\d+):(\d+)$/.exec(item.trim());
      if (!match) continue;
      try { chain.push({ path: this.file(match[1]!), line: Number(match[2]), column: Number(match[3]) }); } catch { /* not project source */ }
    }
    return this.serializeRead(async () => {
      await this.readableSource(path);
      if (!this.batchRead) await this.reconcile([path]);
      if (!this.sourceFiles.has(path) || !/\.[cm]?[jt]sx?$/.test(path)) throw new UsageError('Text edits require a tracked JSX source file.');
      const read = async (target: string) => {
        if (!this.sourceFiles.has(target) || !/\.[cm]?[jt]sx?$/.test(target)) return undefined;
        try { await this.readableSource(target); return await readFile(target, 'utf8'); } catch { return undefined; }
      };
      return resolveTextAt({ line, column, words, owners: chain, read, relative: target => relative(this.root, target).replaceAll('\\', '/'),
        files: () => [...this.sourceFiles].filter(target => /\.[cm]?[jt]sx?$/.test(target) && containsPath(sourceBoundary(this.root), target)).sort() }, path);
    });
  }
  health() {
    return Promise.resolve({ ...this.healthSnapshot, work: { ...this.healthSnapshot.work, reconciliations: this.reconciliations }, status: this.failure ? 'invalid' : 'ready', root: this.root,
      ...(this.outsideSources.size ? { outsideSource: [...this.outsideSources].filter(file => !this.sourceFiles.has(file)) } : {}),
      revision: this.revision, pid: process.pid, rss: process.memoryUsage().rss,
      ...(this.failure ? { diagnostic: this.failure.message } : {}) });
  }
  get stats(): unknown { return this.lastStats; }
  private file(file: string): string {
    if (typeof file !== 'string' || !file.trim()) throw new UsageError('File must be a non-empty source path.');
    const path = sourcePath(this.root, file), inside = relative(this.root, path);
    if (!inside || !containsPath(sourceBoundary(this.root), path) || !containsPath(this.root, path) && !this.sourceFiles.has(path)) throw new UsageError('File must be inside the project root.');
    return path;
  }
  private async readableSource(file: string): Promise<void> {
    if (!containsPath(this.root, file) && !await ownSourcePath(this.root, file)) throw new UsageError('Shared source cannot read symbolic links or paths outside the repository/workspace root.');
  }
  private async editableFile(file: string): Promise<{ dev: number; ino: number }> {
    this.file(file);
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (/(?:^|\/)plumb(?:er)?\.config\.[^/]+$/.test(inside) || /(?:^|\/)\.plumb(?:er)?(?:\/|$)/.test(inside)) throw new UsageError('Apply cannot edit React Plumber config or .plumb files.');
    const identity = await lstat(file);
    const root = await realpath(this.root), path = await realpath(file);
    if (path !== resolve(root, inside)) throw new UsageError('Apply cannot edit symbolic links or paths outside the project root.');
    const current = await lstat(file);
    if (identity.dev !== current.dev || identity.ino !== current.ino) throw new UsageError(staleFile);
    if (!current.isFile() || current.nlink !== 1) throw new UsageError('Apply requires a regular source file without hard links.');
    return identity;
  }
  private async sameFile(file: string, identity: { dev: number; ino: number }): Promise<void> {
    const current = await this.editableFile(file);
    if (current.dev !== identity.dev || current.ino !== identity.ino) throw new UsageError(staleFile);
  }
  private position(value: number): number { if (!Number.isSafeInteger(value) || value < 1) throw new UsageError('Line and column must be positive integers.'); return value; }
  async close(): Promise<void> {
    if (this.closed) return; this.closed = true;
    if (this.timer) clearInterval(this.timer); if (this.debounce) clearTimeout(this.debounce);
    for (const watcher of this.watchers) watcher.close();
    this.rejectPending(new Error('Session is closed.')); if (this.worker) await this.worker.terminate(); this.removeAllListeners();
  }
}
export const createSession = Session.create;

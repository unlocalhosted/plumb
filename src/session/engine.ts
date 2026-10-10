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
import type { StructuredEdit } from '../surfaces/edits.js';
import { isComponentJSX, jsxLocation, jsxAuthoredOwner, sourcePaths } from './source-location.js';

export interface SessionOptions extends CheckOptions { watch?: boolean; pollInterval?: number; polling?: boolean;
  /** Maximum wait before read execution, in milliseconds (default 5000). */
  readQueueMs?: number
}
export interface SiteResult { file: string; line: number; column?: number; declarations: Report['declarations']; findings: Report['findings'] }
export interface EditsResult { revision: number; file: string; hash: string; edits: StructuredEdit[] }
export interface ClassesResult {
  revision: number; file: string; line: number; column: number;
  classes: { token: string; ambiguous: boolean; sites: (SiteResult & { column: number; hash: string; edits: StructuredEdit[] })[] }[];
  unattributed: string[];
  /** A safety limit stopped traversal; unproven tokens remain unattributed. */
  limited: boolean;
}
export interface ApplyOptions { file: string; hash: string; edits: { id: string }[] }
export interface ApplyResult { revision: number; file: string; hash: string; applied: string[]; remaining: Report['findings'] }
export type SourceResolution = { file: string; line?: number; column?: number; hash?: string; component?: string; authoredOwner?: boolean } | { library: true; untracked?: string } | { refused: 'not-jsx' };
const staleFile = 'The file changed since the overlay read it. Read it again.';
const ignored = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.cache/**', '**/.plumb-cache/**'];
const tracked = (file: string) => /\.(?:[cm]?[jt]sx?|css|json|jsonl)$/.test(file) && !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache)(?:\/|$)/.test(file) && !/(?:^|\/)\.plumb\/serve\.json$/.test(file);
const ignoredDirectory = (file: string) => /(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache)(?:\/|$)/.test(file);
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
  private native = false;
  private events = new Set<string>();
  private inventoryDirty = false;
  private patternFiles = new Set<string>();
  private constructor(private options: SessionOptions) { super(); this.root = resolve(options.root ?? process.cwd()); }
  static async create(options: SessionOptions = {}): Promise<Session> {
    if (options.watch === undefined && process.env.PLUMB_WATCH === '0') options = { ...options, watch: false };
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
    const locations = new Set([this.root, resolve(this.root, '.plumb'), ...this.patternRoots.keys(),
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
    const paths = new Set(local ? [...query, ...this.inputs, ...(this.options.config ? [resolve(this.root, this.options.config)] :
      ['plumb.config.ts', 'plumb.config.mts', 'plumb.config.mjs', 'plumb.config.js'].map(name => resolve(this.root, name))), resolve(this.root, '.plumb/ledger.jsonl'),
      ...this.analysisInputs, ...query.flatMap(file => this.queryDependencies.get(file) ?? [])] :
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
    const broad = changed.some(path => !path.endsWith('/.plumb/ledger.jsonl') && (this.configurationFiles.has(path) || !/\.(?:[jt]sx?|css)$/.test(path) || !this.sourceFiles.has(path) && !this.dependencies.has(path) || !this.hashes.has(path)));
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
    if (!(this.options.polling ?? process.env.PLUMB_POLLING === '1')) {
      try {
        this.watchers.push(watch(this.root, { recursive: true }, (_event, file) => {
          const name = file === null ? undefined : String(file).replaceAll('\\', '/');
          const path = name === undefined ? undefined : resolve(this.root, name);
          if (name === undefined || path !== undefined && this.dependencies.has(path) || !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache)(?:\/|$)/.test(name) && !/(?:^|\/)\.plumb\/serve\.json$/.test(name)) {
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
  private async resolveFile(source: string, servedRoot?: string): Promise<string | SourceResolution> {
    const candidates = sourcePaths(this.root, source, servedRoot);
    // Fall back only when the served file is absent. Invalid or untracked
    // served evidence must never adopt a same-named repository file.
    let file = candidates[0]!;
    if (candidates.length > 1) for (const candidate of candidates) {
      try { await lstat(candidate); file = candidate; break; }
      catch (error) { if (!missing(error)) throw error; }
    }
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (!inside || inside === '..' || inside.startsWith('../') || isAbsolute(inside) || ignoredDirectory(inside) || !/\.[cm]?[jt]sx?$/.test(file)) return { library: true };
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
    if (method === 'resolveSource') {
      const file = await this.resolveFile(args[0] as string, (args[3] as { servedRoot?: string } | undefined)?.servedRoot);
      return typeof file === 'string' ? [file] : [];
    }
    if (['site', 'edits', 'why', 'classes'].includes(method)) {
      const file = this.file(args[0] as string); this.position(args[1] as number);
      if (method === 'classes') this.validateClasses(args[3]);
      if (method === 'classes' || args[2] !== undefined) this.position(args[2] as number);
      return [file];
    }
    return undefined;
  }
  resolveSource(source: string, line?: number, column?: number, expected: { tag?: string; component?: boolean; hash?: string; snapshot?: boolean; owner?: boolean; servedRoot?: string } = {}): Promise<SourceResolution> {
    return this.serializeRead(async () => {
      const classified = await this.resolveFile(source, expected.servedRoot);
      if (typeof classified !== 'string') return classified;
      const file = classified, inside = relative(this.root, file).replaceAll('\\', '/');
      if (!this.batchRead) await this.reconcile([file]);
      if (!this.sourceFiles.has(file)) return { library: true, untracked: inside };
      // Hash-bound browser evidence must compare with the file on disk, even
      // if a save races reconciliation or preserves the cached stat stamp.
      const text = expected.snapshot || expected.hash !== undefined ? await readFile(file, 'utf8') : this.sourceTexts.get(file) ?? await readFile(file, 'utf8');
      const hash = expected.snapshot || expected.hash !== undefined ? sourceHash(text) : this.hashes.get(file);
      if (expected.hash !== undefined && expected.hash !== hash) throw new UsageError(staleFile);
      if (line === undefined && column === undefined) return { file: inside, ...(expected.snapshot ? { hash: hash! } : {}) };
      if (line === undefined || column === undefined) throw new UsageError('Source location requires both line and column.');
      const anyOpening = !expected.component && expected.tag === undefined;
      const location = jsxLocation(file, text, this.position(line), this.position(column), expected.tag, anyOpening ? 'any' : expected.component);
      if (!location) {
        if (anyOpening) return { refused: 'not-jsx' };
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
      let next: string;
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
      return { revision: this.revision, file, hash: snapshot.hash, applied: ids, remaining: snapshot.remaining };
    });
  }
  decisions(): Promise<Report['decisions']> { return this.read('decisions'); }
  why(file: string, line: number): Promise<Awaited<ReturnType<typeof import('../ledger/commands.js').inspectLedger>>> { return this.read('why', { file: this.file(file), line: this.position(line) }); }
  try(code: string, options: Pick<TryOptions, 'lang' | 'as' | 'verbose'> = {}): Promise<Report> { return this.read('try', { code, ...options }); }
  private healthSnapshot: { caches: object; work?: object } = { caches: {} };
  health() {
    return Promise.resolve({ ...this.healthSnapshot, work: { ...this.healthSnapshot.work, reconciliations: this.reconciliations }, status: this.failure ? 'invalid' : 'ready', root: this.root,
      revision: this.revision, pid: process.pid, rss: process.memoryUsage().rss,
      ...(this.failure ? { diagnostic: this.failure.message } : {}) });
  }
  get stats(): unknown { return this.lastStats; }
  private file(file: string): string {
    if (typeof file !== 'string' || !file.trim()) throw new UsageError('File must be a non-empty source path.');
    const path = resolve(this.root, file), inside = relative(this.root, path);
    if (!inside || inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside)) throw new UsageError('File must be inside the project root.');
    return path;
  }
  private async editableFile(file: string): Promise<{ dev: number; ino: number }> {
    this.file(file);
    const inside = relative(this.root, file).replaceAll('\\', '/');
    if (/(?:^|\/)plumb\.config\.[^/]+$/.test(inside) || /(?:^|\/)\.plumb(?:\/|$)/.test(inside)) throw new UsageError('Apply cannot edit Plumb config or .plumb files.');
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

import { constants, watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { stat, lstat, readFile, realpath, open } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { glob } from 'tinyglobby';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import type { TryOptions } from '../try.js';
import { UsageError } from '../errors.js';
import { sourceHash } from '../collect/cache.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import type { StructuredEdit } from '../surfaces/edits.js';

export interface SessionOptions extends CheckOptions { watch?: boolean; pollInterval?: number; polling?: boolean }
export interface SiteResult { file: string; line: number; column?: number; declarations: Report['declarations']; findings: Report['findings'] }
export interface EditsResult { revision: number; file: string; hash: string; edits: StructuredEdit[] }
export interface ApplyOptions { file: string; hash: string; edits: { id: string }[] }
export interface ApplyResult { revision: number; file: string; hash: string; applied: string[]; remaining: Report['findings'] }
const staleFile = 'The file changed since the overlay read it. Read it again.';
const ignored = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.cache/**', '**/.plumb-cache/**'];
const tracked = (file: string) => /\.(?:[cm]?[jt]sx?|css|json|jsonl)$/.test(file) && !/(?:^|\/)(?:node_modules|\.git|dist|build|\.next|\.cache|\.plumb-cache)(?:\/|$)/.test(file) && !/(?:^|\/)\.plumb\/serve\.json$/.test(file);

/** Owns one warm analysis worker and serializes changes with reads. */
export class Session extends EventEmitter {
  readonly root: string;
  private worker!: Worker;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private id = 0;
  private hashes = new Map<string, string>();
  private dependencies = new Set<string>();
  private patterns: string[] = [];
  private sourceFiles = new Set<string>();
  private configurationFiles = new Set<string>();
  private inputs: string[] = [];
  private queryDependencies = new Map<string, string[]>();
  private watchers: FSWatcher[] = [];
  private timer?: NodeJS.Timeout;
  private debounce?: NodeJS.Timeout;
  private closed = false;
  private refreshing: Promise<string[]> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private failure: Error | undefined;
  private failurePaths: string[] = [];
  private stamps = new Map<string, string>();
  private lastStats: unknown;
  private revision = 0;
  private native = false;
  private events = new Set<string>();
  private constructor(private options: SessionOptions) { super(); this.root = resolve(options.root ?? process.cwd()); }
  static async create(options: SessionOptions = {}): Promise<Session> {
    const session = new Session(options);
    try {
      await session.start(); await session.scan(true);
      if (options.watch !== false) session.observe();
      return session;
    } catch (error) { await session.close(); throw error; }
  }
  private async start(): Promise<void> {
    if (this.closed) throw new UsageError('Session is closed. Start a new session.');
    const worker = this.worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: { ...this.options, root: this.root } });
    await new Promise<void>((resolveReady, rejectReady) => {
      this.worker.on('message', message => {
        if (message.ready) { this.dependencies = new Set(message.dependencies); this.patterns = message.patterns; this.sourceFiles = new Set(message.files); this.configurationFiles = new Set(message.configurationFiles); this.inputs = message.inputs; this.queryDependencies = new Map(message.queryDependencies); resolveReady(); return; }
        if (message.startupError) { rejectReady(new UsageError(message.startupError)); return; }
        const pending = this.pending.get(message.id); if (!pending) return;
        this.pending.delete(message.id);
        if (message.judged) this.lastStats = { ...(this.lastStats as object ?? {}), judged: message.judged };
        if (message.error) pending.reject(new UsageError(message.error)); else pending.resolve(message.result);
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
  private async inventory(): Promise<string[]> {
    return [...new Set([...(await glob('**/*.{tsx,jsx,ts,js,mjs,mts,cjs,cts,css,json,jsonl}', { cwd: this.root, absolute: true, dot: true, ignore: ignored, followSymbolicLinks: false })).filter(file => tracked(relative(this.root, file))),
      ...(this.patterns.length ? await glob(this.patterns, { cwd: this.root, absolute: true, dot: true, followSymbolicLinks: false }) : []), ...this.dependencies])].sort();
  }
  private async scan(initial = false, query?: string[]): Promise<string[]> {
    if (this.closed) return [];
    const partial = !initial && query !== undefined;
    const paths = partial ? [...new Set([...query, ...query.flatMap(file => this.queryDependencies.get(file) ?? []), ...this.inputs, ...this.events])] : await this.inventory();
    for (const path of paths) this.events.delete(path);
    const next = partial ? this.hashes : new Map<string, string>();
    const stamps = partial ? this.stamps : new Map<string, string>();
    const changed: string[] = [];
    // Targeted scans mutate retained maps; never clone or enumerate the inventory.
    await Promise.all(paths.map(async path => {
      const old = this.hashes.get(path), previousStamp = this.stamps.get(path);
      let hash: string | undefined;
      try {
        const info = await stat(path);
        if (info.isFile()) {
          const stamp = `${info.mtimeMs}:${info.ctimeMs}:${info.ino}:${info.size}`;
          hash = previousStamp === stamp && old !== undefined ? old : sourceHash(await readFile(path, 'utf8'));
          stamps.set(path, stamp);
        } else stamps.delete(path);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; stamps.delete(path); }
      if (hash === undefined) next.delete(path); else next.set(path, hash);
      if (hash !== old) changed.push(path);
    }));
    if (!partial) for (const path of this.hashes.keys()) if (!next.has(path) && !changed.includes(path)) changed.push(path);
    this.stamps = stamps;
    if (initial) { this.hashes = next; return []; }
    if (!changed.length) { if (this.failure) throw this.failure; return []; }
    const broad = changed.some(path => !path.endsWith('/.plumb/ledger.jsonl') && (this.configurationFiles.has(path) || !/\.(?:[jt]sx?|css)$/.test(path) || !this.sourceFiles.has(path) && !this.dependencies.has(path) || !next.has(path)));
    try {
      if (broad || this.failure) { await this.worker.terminate(); this.rejectPending(new Error('Session inputs changed.')); await this.start(); }
      else {
        const result = await this.request<{ dependencies: string[]; inputs: string[]; queryDependencies: [string, string[]][] }>('refresh', { paths: changed });
        this.dependencies = new Set(result.dependencies); this.inputs = result.inputs; this.queryDependencies = new Map(result.queryDependencies); this.lastStats = result;
      }
      this.hashes = next; this.failure = undefined; this.failurePaths = [];
      this.revision++; this.emit('change', changed);
    } catch (error) { this.hashes = next; this.failure = error as Error; this.failurePaths = changed; throw error; }
    return changed;
  }
  private observe(): void {
    if (!this.options.polling) {
      try {
        this.watchers.push(watch(this.root, { recursive: true }, (_event, file) => {
          if (!file || tracked(String(file))) {
            if (file) this.events.add(resolve(this.root, String(file))); else this.native = false;
            if (this.debounce) clearTimeout(this.debounce);
            this.debounce = setTimeout(() => { void this.serialize(() => this.scan(false, [])).catch(error => this.emit('diagnostic', error)); }, 5);
          }
        }));
        this.native = true;
        this.watchers[0]!.on('error', error => { this.native = false; this.watchers[0]?.close(); this.emit('diagnostic', error); });
      } catch { /* Polling below works on platforms without recursive fs.watch. */ }
    }
    this.timer = setInterval(() => { void this.refresh().catch(error => this.emit('diagnostic', error)); }, this.options.pollInterval ?? 250);
  }
  refresh(): Promise<string[]> { if (!this.refreshing) this.refreshing = this.serialize(() => this.scan()).finally(() => { this.refreshing = undefined; }); return this.refreshing; }
  private read<T>(method: string, params: object = {}): Promise<T> { return this.serialize(async () => {
    try { await this.scan(false, method === 'site' ? [(params as { file: string }).file] : method === 'try' ? [] : undefined); }
    catch (error) {
      const as = (params as { as?: string }).as, target = resolve(this.root, as ?? 'src/__plumb_try__.tsx');
      if (method !== 'try' || !this.sourceFiles.has(target) || !this.failurePaths.length || this.failurePaths.some(file => file !== target)) throw error;
      // A valid overlay can repair the sole invalid source for this read.
      // Keep the on-disk diagnostic and the retained project report unchanged.
    }
    return this.request<T>(method, params);
  }); }
  report(options: Pick<CheckOptions, 'ledger' | 'base' | 'changed' | 'strictLedger' | 'verbose'> = {}): Promise<Report> { return this.read('report', options); }
  site(file: string, line: number, column?: number): Promise<SiteResult> {
    return this.read('site', { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) });
  }
  edits(file: string, line: number, column?: number): Promise<EditsResult> {
    const params = { file: this.file(file), line: this.position(line), ...(column === undefined ? {} : { column: this.position(column) }) };
    return this.serialize(async () => {
      await this.scan(false, [params.file]);
      const result = await this.request<Omit<EditsResult, 'revision'>>('edits', params);
      if (result.hash !== this.hashes.get(params.file)) throw new UsageError(staleFile);
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
      await this.scan(false, [file]);
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
      await this.scan(false, [file]);
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
  async health(): Promise<{ status: string; root: string; revision: number; pid: number; rss: number; caches: object; diagnostic?: string }> {
    const result = await this.request<{ status: string; root: string; revision: number; pid: number; rss: number; caches: object }>('health');
    return { ...result, status: this.failure ? 'invalid' : result.status, revision: this.revision, ...(this.failure ? { diagnostic: this.failure.message } : {}) };
  }
  get stats(): unknown { return this.lastStats; }
  private file(file: string): string {
    if (typeof file !== 'string' || !file.trim()) throw new UsageError('File must be a non-empty source path.');
    const path = resolve(this.root, file), inside = relative(this.root, path);
    if (!inside || inside.startsWith('../') || isAbsolute(inside)) throw new UsageError('File must be inside the project root.');
    return path;
  }
  private async editableFile(file: string): Promise<{ dev: number; ino: number }> {
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

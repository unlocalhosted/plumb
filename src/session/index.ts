import { migrationNotice } from '../paths.js';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { BusyError, UsageError } from '../errors.js';
import type { Session as Engine, SessionOptions } from './engine.js';
export type { SessionOptions, SiteResult, EditsResult, ClassesResult, ApplyOptions, ApplyTextOptions, ApplyResult, UndoHandle, UndoResult, HistoryEntry, TextRun, TextResult, SourceResolution } from './engine.js';

type Method = 'report' | 'resolveSource' | 'site' | 'edits' | 'text' | 'textAt' | 'classes' | 'apply' | 'applyText' | 'applyTextAt' | 'undo' | 'history' | 'decisions' | 'why' | 'try' | 'refresh' | 'many';
export type ReadMethod = Exclude<Method, 'apply' | 'applyText' | 'applyTextAt' | 'undo' | 'history' | 'try' | 'refresh'>;
export type ReadArgs<M extends ReadMethod> = Parameters<Engine[M]>;
interface Pending { resolve(value: unknown): void; reject(error: Error): void; timer: NodeJS.Timeout | undefined }
/** Host owns only bounded admission, worker messaging and the last health snapshot. */
export class Session extends EventEmitter {
  readonly root: string;
  readonly config?: string;
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private id = 0;
  private closed = false;
  private failure?: Error;
  private lastStats: unknown;
  private snapshot: Awaited<ReturnType<Engine['health']>>;
  private constructor(options: SessionOptions) {
    super(); if (options.config !== undefined) this.config = options.config; this.optionsBudget = options.readQueueMs; this.root = resolve(options.root ?? process.cwd());
    this.snapshot = { status: 'starting', root: this.root, revision: 0, pid: process.pid, rss: 0, caches: {}, work: { reconciliations: 0 } };
    this.worker = new Worker(new URL('./coordinator.js', import.meta.url), { workerData: { ...options, root: this.root } });
  }
  static async create(options: SessionOptions = {}): Promise<Session> {
    if (options.readQueueMs !== undefined && (!Number.isFinite(options.readQueueMs) || options.readQueueMs < 0)) throw new UsageError('readQueueMs must be a non-negative finite number.');
    migrationNotice(resolve(options.root ?? process.cwd()), options.config);
    const session = new Session(options);
    try {
      await new Promise<void>((ready, reject) => {
        session.worker.on('message', message => {
          if (message.health) session.snapshot = message.health;
          if (message.stats !== undefined) session.lastStats = message.stats;
          if (message.ready) { ready(); return; }
          const failure = (text: string): Error => {
            const error = message.usageError ? new UsageError(text) : new Error(text);
            if (message.errorStack) error.stack = message.errorStack;
            return error;
          };
          if (message.startupError) { reject(failure(message.startupError)); return; }
          if (message.event) { session.emit(message.event, message.value); return; }
          const pending = session.pending.get(message.id); if (!pending) return;
          if (message.started) { clearTimeout(pending.timer); return; }
          session.pending.delete(message.id); clearTimeout(pending.timer);
          if (message.busy) pending.reject(new BusyError());
          else if (message.error) pending.reject(failure(message.error));
          else pending.resolve(message.result);
        });
        session.worker.on('error', error => { session.fail(error); reject(error); });
        session.worker.on('exit', code => {
          if (!session.closed) { const error = new Error(`Session worker exited with code ${code}.`); session.fail(error); reject(error); }
        });
      });
      return session;
    } catch (error) { await session.close(); throw error; }
  }
  private fail(error: Error): void {
    this.failure = error;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
  private call<M extends Method>(method: M, args: Parameters<Engine[M]>): ReturnType<Engine[M]>;
  private call<M extends ReadMethod>(method: M, args: Parameters<Engine[M]>, json: true): Promise<string>;
  private call<M extends Method>(method: M, args: Parameters<Engine[M]>, json = false): Promise<unknown> {
    if (this.closed || this.failure) return Promise.reject(this.failure ?? new UsageError('Session is closed. Start a new session.'));
    // Bound both waiting time and retained host/worker queue memory.
    if (this.pending.size >= 512) return Promise.reject(new BusyError());
    const id = ++this.id, deadline = ['apply', 'applyText', 'applyTextAt', 'undo', 'refresh'].includes(method) ? Infinity : Date.now() + (this.optionsBudget ?? 5000);
    const promise = new Promise<unknown>((resolveValue, reject) => {
      const timer = Number.isFinite(deadline) ? setTimeout(() => { this.pending.delete(id); reject(new BusyError()); }, Math.max(0, deadline - Date.now())) : undefined;
      this.pending.set(id, { resolve: resolveValue, reject, timer });
      this.worker.postMessage({ id, method, args, deadline, json });
    });
    return promise;
  }
  /** HTTP bodies are serialized in the coordinator, never cloned as object graphs onto the host. */
  readJSON<M extends ReadMethod>(method: M, args: Parameters<Engine[M]>): Promise<string> {
    if (method === 'classes') this.validateClasses(args as Parameters<Engine['classes']>);
    return this.call(method, args, true);
  }
  private optionsBudget: number | undefined;
  report(...args: Parameters<Engine['report']>) { return this.call('report', args); }
  resolveSource(...args: Parameters<Engine['resolveSource']>) { return this.call('resolveSource', args); }
  site(...args: Parameters<Engine['site']>) { return this.call('site', args); }
  many(...args: Parameters<Engine['many']>) { return this.call('many', args); }
  text(...args: Parameters<Engine['text']>) { return this.call('text', args); }
  textAt(...args: Parameters<Engine['textAt']>) { return this.call('textAt', args); }
  edits(...args: Parameters<Engine['edits']>) { return this.call('edits', args); }
  private validateClasses(args: Parameters<Engine['classes']>): void {
    // Preserve synchronous argument errors without filesystem or analysis work.
    const [file, line, column, classes] = args;
    if (typeof classes !== 'string' || classes.length > 65536) throw new UsageError('classes must be a string of at most 65536 characters.');
    if (typeof file !== 'string' || !file.trim()) throw new UsageError('File must be a non-empty source path.');
    // Membership of shared source is checked in the coordinator with its
    // current config; this layer only validates argument shape synchronously.
    for (const value of [line, column]) if (!Number.isSafeInteger(value) || value < 1) throw new UsageError('Line and column must be positive integers.');
  }
  classes(...args: Parameters<Engine['classes']>) { this.validateClasses(args); return this.call('classes', args); }
  applyText(...args: Parameters<Engine['applyText']>) { return this.call('applyText', args); }
  applyTextAt(...args: Parameters<Engine['applyTextAt']>) { return this.call('applyTextAt', args); }
  apply(...args: Parameters<Engine['apply']>) { return this.call('apply', args); }
  undo(...args: Parameters<Engine['undo']>) { return this.call('undo', args); }
  history(...args: Parameters<Engine['history']>) { return this.call('history', args); }
  decisions(...args: Parameters<Engine['decisions']>) { return this.call('decisions', args); }
  why(...args: Parameters<Engine['why']>) { return this.call('why', args); }
  try(...args: Parameters<Engine['try']>) { return this.call('try', args); }
  refresh(...args: Parameters<Engine['refresh']>) { return this.call('refresh', args); }
  health() { if (this.closed) return Promise.reject(new UsageError('Session is closed. Start a new session.')); return Promise.resolve({ ...this.snapshot, status: this.failure ? 'failed' : this.snapshot.status,
    ...(this.failure ? { diagnostic: this.failure.message } : {}) }); }
  get stats(): unknown { return this.lastStats; }
  async close(): Promise<void> {
    if (this.closed) return; this.closed = true;
    this.fail(new UsageError('Session is closed. Start a new session.'));
    await this.worker.terminate(); this.removeAllListeners();
  }
}
export const createSession = Session.create;

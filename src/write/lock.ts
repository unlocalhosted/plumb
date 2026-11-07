/**
 * LOCK · one writer at a time on a record file other processes share (docs/invariants/api-contract.md §3).
 *
 * `<file>.lock` is created with O_EXCL and holds `pid time`; whoever creates it owns the file until it is removed. A
 * lock whose mtime is older than 10 s belongs to a process that died holding it and is taken over. A caller waits up to
 * 5 s, then is refused (code `refused`) rather than left hanging: a trace append or a ledger accept is never worth a hung
 * request. Sync and async forms, since the trace log is written synchronously inside a write that already landed.
 */
import { closeSync, mkdirSync, openSync, rmSync, statSync, writeSync } from 'node:fs';
import { mkdir, open, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { UsageError } from '../errors.js';

const STALE_MS = 10_000, WAIT_MS = 5_000, STEP_MS = 10;
const exists = (error: unknown) => (error as NodeJS.ErrnoException)?.code === 'EEXIST';
const taken = (lock: string) => new UsageError(`Another process is writing ${lock.replace(/\.lock$/, '')}; try again in a moment.`, 'refused');
const stamp = () => `${process.pid} ${Date.now()}\n`;
const stale = (mtimeMs: number) => Date.now() - mtimeMs > STALE_MS;
const pause = (ms: number) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

/** Run `work` holding the lock of `path`. */
export function lockSync<T>(path: string, work: () => T): T {
  const lock = `${path}.lock`, until = Date.now() + WAIT_MS;
  mkdirSync(dirname(path), { recursive: true });
  for (;;) {
    let fd: number;
    try { fd = openSync(lock, 'wx'); }
    catch (error) {
      if (!exists(error)) throw error;
      try { if (stale(statSync(lock).mtimeMs)) { rmSync(lock, { force: true }); continue; } } catch { continue; }
      if (Date.now() > until) throw taken(lock);
      pause(STEP_MS); continue;
    }
    try { writeSync(fd, stamp()); } finally { closeSync(fd); }
    try { return work(); } finally { rmSync(lock, { force: true }); }
  }
}
/** The same, for work that awaits. */
export async function lock<T>(path: string, work: () => Promise<T>): Promise<T> {
  const lock = `${path}.lock`, until = Date.now() + WAIT_MS;
  await mkdir(dirname(path), { recursive: true });
  for (;;) {
    let handle;
    try { handle = await open(lock, 'wx'); }
    catch (error) {
      if (!exists(error)) throw error;
      try { if (stale((await stat(lock)).mtimeMs)) { await rm(lock, { force: true }); continue; } } catch { continue; }
      if (Date.now() > until) throw taken(lock);
      await sleep(STEP_MS); continue;
    }
    try { await handle.writeFile(stamp()); } finally { await handle.close(); }
    try { return await work(); } finally { await rm(lock, { force: true }); }
  }
}

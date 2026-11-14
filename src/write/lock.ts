/**
 * LOCK · one writer at a time on a record file other processes share (docs/invariants/api-contract.md §3).
 *
 * `<file>.lock` is created with O_EXCL and holds its owner's token (`pid uuid`); whoever creates it owns the file until
 * it is removed. Three rules keep two processes from ever being inside together:
 *
 * - **A working holder is never stale.** The awaiting form touches its lock every quarter of the stale time, so a lock
 *   whose mtime is older than 10 s belongs to a process that died (or one whose event loop stopped for that long).
 * - **One waiter takes a stale lock over, and only that lock.** It first creates a guard named for the lock it saw,
 *   `<file>.lock.takeover.<token>.<level>` (O_EXCL too). Under the guard it removes the lock only if the file still
 *   holds that token and is still stale. A guard left by a taker that died is never removed by a waiter: the waiter
 *   goes up a level instead. So a file is never removed on the strength of a look at an earlier file of the same name
 *   (the model in specs/lock found that hole in the first design: two deaths and two waiters let two writers in).
 *   The guards of a lock are removed once that lock is gone.
 * - **A holder releases only its own lock.** It removes the file only while the file still holds its token, so a holder
 *   that was taken over (the sync form can't touch its lock while it works) leaves the new holder's lock alone.
 *
 * A caller waits up to 5 s, then is refused (code `refused`) rather than left hanging: a trace append or a ledger accept
 * is never worth a hung request. Sync and async forms, since the trace log is written synchronously inside a write that
 * already landed.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { UsageError } from '../errors.js';

const STALE_MS = 10_000, WAIT_MS = 5_000, STEP_MS = 10;
/** The times, for the lock's own tests: `stale` is how old an untouched lock is before it is taken over, `wait` how long a caller waits. */
export interface LockOptions { stale?: number; wait?: number }
const exists = (error: unknown) => (error as NodeJS.ErrnoException)?.code === 'EEXIST';
const taken = (lock: string) => new UsageError(`Another process is writing ${lock.replace(/\.lock$/, '')}; try again in a moment.`, 'refused');
const token = () => `${process.pid} ${randomUUID()}\n`;
const old = (mtimeMs: number, staleMs: number) => Date.now() - mtimeMs > staleMs;
const pause = (ms: number) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

// A guard is for one lock: its name carries that lock's token, so a guard for a lock that is gone guards nothing.
const LEVELS = 8; // takers that may die inside the few lines under a guard before a lock is left alone until its stale time passes again
const keyOf = (held: string) => held.trim().replace(/[^A-Za-z0-9-]/g, '_').slice(0, 80) || 'empty';
const guardOf = (lock: string, key: string, level: number) => `${lock}.takeover.${key}.${level}`;
const guardsOf = (lock: string, key: string) => `${basename(lock)}.takeover.${key}.`;

/** Remove the lock if it is stale. True when the caller should try to take the lock again at once. */
function takeOverSync(lock: string, staleMs: number): boolean {
  let key: string;
  try { if (!old(statSync(lock).mtimeMs, staleMs)) return false; key = keyOf(readFileSync(lock, 'utf8')); } catch { return true; }
  for (let level = 1; level <= LEVELS; level++) {
    const guard = guardOf(lock, key, level);
    try { writeFileSync(guard, '', { flag: 'wx' }); }
    catch (error) {
      if (!exists(error)) throw error;
      // a guard left by a taker that died under it is passed, never removed; a fresh one belongs to a taker at work
      try { if (old(statSync(guard).mtimeMs, staleMs)) continue; } catch { /* gone: its taker finished */ }
      return false;
    }
    let gone = false;
    try {
      // the lock this guard is for, and still stale: nothing else may be removed here
      if (keyOf(readFileSync(lock, 'utf8')) === key) { if (old(statSync(lock).mtimeMs, staleMs)) { rmSync(lock, { force: true }); gone = true; } }
      else gone = true;
    } catch { gone = true; }
    finally {
      // once that lock is gone its guards guard nothing (a taker still under one finds another lock and removes nothing)
      if (gone) { try { for (const name of readdirSync(dirname(lock))) if (name.startsWith(guardsOf(lock, key))) rmSync(join(dirname(lock), name), { force: true }); } catch { /* the folder went */ } }
      else rmSync(guard, { force: true });
    }
    return true;
  }
  return false;
}
async function takeOver(lock: string, staleMs: number): Promise<boolean> {
  let key: string;
  try { if (!old((await stat(lock)).mtimeMs, staleMs)) return false; key = keyOf(await readFile(lock, 'utf8')); } catch { return true; }
  for (let level = 1; level <= LEVELS; level++) {
    const guard = guardOf(lock, key, level);
    try { await writeFile(guard, '', { flag: 'wx' }); }
    catch (error) {
      if (!exists(error)) throw error;
      try { if (old((await stat(guard)).mtimeMs, staleMs)) continue; } catch { /* gone: its taker finished */ }
      return false;
    }
    let gone = false;
    try {
      if (keyOf(await readFile(lock, 'utf8')) === key) { if (old((await stat(lock)).mtimeMs, staleMs)) { await rm(lock, { force: true }); gone = true; } }
      else gone = true;
    } catch { gone = true; }
    finally {
      if (gone) { try { for (const name of await readdir(dirname(lock))) if (name.startsWith(guardsOf(lock, key))) await rm(join(dirname(lock), name), { force: true }); } catch { /* the folder went */ } }
      else await rm(guard, { force: true });
    }
    return true;
  }
  return false;
}

/** Run `work` holding the lock of `path`. */
export function lockSync<T>(path: string, work: () => T, options: LockOptions = {}): T {
  const lock = `${path}.lock`, staleMs = options.stale ?? STALE_MS, until = Date.now() + (options.wait ?? WAIT_MS), mine = token();
  mkdirSync(dirname(path), { recursive: true });
  for (;;) {
    try { writeFileSync(lock, mine, { flag: 'wx' }); }
    catch (error) {
      if (!exists(error)) throw error;
      if (takeOverSync(lock, staleMs)) continue;
      if (Date.now() > until) throw taken(lock);
      pause(STEP_MS); continue;
    }
    try { return work(); }
    finally { try { if (readFileSync(lock, 'utf8') === mine) rmSync(lock, { force: true }); } catch { /* gone, or another's now */ } }
  }
}
/** The same, for work that awaits. */
export async function lock<T>(path: string, work: () => Promise<T>, options: LockOptions = {}): Promise<T> {
  const lock = `${path}.lock`, staleMs = options.stale ?? STALE_MS, until = Date.now() + (options.wait ?? WAIT_MS), mine = token();
  await mkdir(dirname(path), { recursive: true });
  for (;;) {
    try { await writeFile(lock, mine, { flag: 'wx' }); }
    catch (error) {
      if (!exists(error)) throw error;
      if (await takeOver(lock, staleMs)) continue;
      if (Date.now() > until) throw taken(lock);
      await sleep(STEP_MS); continue;
    }
    const beat = setInterval(() => { const now = new Date(); utimes(lock, now, now).catch(() => { /* gone: the work's end removes nothing then */ }); }, Math.max(1, staleMs / 4));
    beat.unref();
    try { return await work(); }
    finally {
      clearInterval(beat);
      try { if (await readFile(lock, 'utf8') === mine) await rm(lock, { force: true }); } catch { /* gone, or another's now */ }
    }
  }
}

import { existsSync, readdirSync, writeSync } from 'node:fs';
import { relative } from 'node:path';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { cacheDirectory } from './paths.js';
import { count } from './messages.js';
import { onProgress } from './profile.js';
import type { Progress } from './profile.js';

interface DisplayOptions {
  root: string;
  columns: number;
  color: boolean;
  cold: boolean;
  cache: string;
  delay: number;
  cacheDelay: number;
  started: number;
  active: SharedArrayBuffer;
}

/** One CLI operation, including nested checks (init/doctor). Never changes stdout. */
export async function withCliProgress<T>(root: string, disabled: boolean, run: () => Promise<T>): Promise<T> {
  if (disabled || !process.stderr.isTTY || process.env.CI !== undefined) return run();
  const cache = cacheDirectory(root);
  let cold = false;
  try { cold = !existsSync(cache) || readdirSync(cache).length === 0; } catch { /* Unreadable cache is diagnosed by analysis. */ }
  // Test-only timing knobs; production always uses 300 ms and 5 s.
  const threshold = (name: string, fallback: number) => {
    const value = Number(process.env[name] ?? fallback);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const active = new Int32Array(new SharedArrayBuffer(4));
  Atomics.store(active, 0, 1);
  const display: DisplayOptions = { root, columns: process.stderr.columns || 80, color: process.env.NO_COLOR === undefined,
    cold, cache: relative(root, cache) || '.', delay: threshold('PLUMBER_TEST_PROGRESS_DELAY_MS', 300),
    cacheDelay: threshold('PLUMBER_TEST_CACHE_NOTICE_MS', 5_000), started: Date.now(), active: active.buffer as SharedArrayBuffer };
  // Analysis includes long synchronous phases. A worker writes directly to fd 2,
  // keeping the one-second clock alive even while the main thread is busy.
  let worker: Worker | undefined, exited: Promise<void> | undefined;
  const unsubscribe = onProgress(progress => {
    if (!worker) {
      worker = new Worker(new URL(import.meta.url), { workerData: display });
      worker.on('error', () => { /* Progress cannot fail analysis. */ });
      exited = new Promise<void>(done => worker!.once('exit', () => done()));
    }
    worker.postMessage(progress);
  });
  const resize = () => worker?.postMessage({ columns: process.stderr.columns || 80 });
  const interrupt = () => {
    // Synchronous erase also covers signals received during a CPU-heavy phase.
    Atomics.store(active, 0, 0);
    writeSync(2, '\r\x1b[2K');
    process.exit(130);
  };
  process.stderr.on('resize', resize);
  process.once('SIGINT', interrupt);
  try { return await run(); }
  finally {
    unsubscribe();
    // A worker that starts late must not flash queued phases for a short run.
    if (Date.now() - display.started < display.delay) Atomics.store(active, 0, 0);
    process.stderr.off('resize', resize);
    worker?.postMessage({ stop: true });
    await exited;
    Atomics.store(active, 0, 0);
    process.off('SIGINT', interrupt);
  }
}

if (!isMainThread) {
  const options = workerData as DisplayOptions;
  const active = new Int32Array(options.active);
  let text = 'Reading your project…', visible = false, noticed = false;
  let previous = '';
  const number = (value: number) => value.toLocaleString('en-US');
  const clean = (value: string) => value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  const truncate = (value: string) => {
    let result = '', width = 0;
    for (const character of clean(value)) {
      const code = character.codePointAt(0)!;
      const cells = /[\p{Mark}\p{Cf}]/u.test(character) ? 0 :
        /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6\p{Extended_Pictographic}]/u.test(character) || code >= 0x20000 && code <= 0x3fffd ? 2 : 1;
      if (width + cells >= options.columns) break;
      result += character; width += cells;
    }
    return result;
  };
  const clear = () => { if (visible) writeSync(2, '\r\x1b[2K'); visible = false; previous = ''; };
  const render = () => {
    if (!Atomics.load(active, 0)) return;
    const elapsed = Date.now() - options.started;
    if (elapsed < options.delay) return;
    if (options.cold && !noticed && elapsed >= options.cacheDelay) {
      clear();
      writeSync(2, `First run builds a cache in ${clean(options.cache)}; later runs are faster.\n`);
      noticed = true;
    }
    const suffix = elapsed >= 3_000 ? ` ${Math.floor(elapsed / 1_000)}s` : '';
    // Reserve the last column: terminals may wrap as soon as it is filled.
    const line = truncate(text + suffix);
    if (line === previous) return;
    writeSync(2, `\r\x1b[2K${options.color ? '\x1b[2m' : ''}${line}${options.color ? '\x1b[0m' : ''}`);
    visible = true; previous = line;
  };
  parentPort!.on('message', (message: Progress & { stop?: boolean; columns?: number }) => {
    if (message.stop) { clearInterval(timer); clear(); parentPort!.close(); return; }
    if (message.columns !== undefined) options.columns = message.columns;
    switch (message.phase) {
      case 'phase:config': case 'phase:discover': case 'phase:source-files':
        text = message.files === undefined ? 'Reading your project…' : `Reading your project: ${count(message.files, 'file')}…`; break;
      case 'phase:collect':
        text = message.current === undefined ? 'Reading styles…' : `Reading styles: ${number(message.current)} of ${count(message.files!, 'file')}…`; break;
      case 'phase:load': case 'phase:compile':
        text = message.entry ? `Compiling Tailwind from ${relative(options.root, message.entry)}…` : 'Reading styles…'; break;
      case 'phase:stylesheets': case 'phase:declarations': case 'phase:decisions':
        text = 'Reading styles…'; break;
      case 'phase:provenance':
        text = `Checking ${count(message.declarations!, 'value')} against your tokens…`; break;
      case 'phase:components': case 'rule:ownership':
        text = 'Matching components…'; break;
    }
    render();
  });
  const timer = setInterval(render, 100);
}

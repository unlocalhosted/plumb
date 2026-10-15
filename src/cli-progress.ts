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
  unicode: boolean;
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
  const color = process.env.NO_COLOR === undefined;
  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '';
  const display: DisplayOptions = { root, columns: process.stderr.columns || 80, color, unicode: color && /utf-?8/i.test(locale),
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
  let complete = false;
  try { const result = await run(); complete = true; return result; }
  finally {
    unsubscribe();
    // A worker that starts late must not flash queued phases for a short run.
    if (Date.now() - display.started < display.delay) Atomics.store(active, 0, 0);
    process.stderr.off('resize', resize);
    worker?.postMessage({ stop: true, complete });
    await exited;
    Atomics.store(active, 0, 0);
    process.off('SIGINT', interrupt);
  }
}

if (!isMainThread) {
  const options = workerData as DisplayOptions;
  const active = new Int32Array(options.active);
  let text = 'Reading your project', visible = false, noticed = false, percent = 0;
  let previous = '', lastDraw = -Infinity;
  let activePhase = '';
  // Non-overlapping execution steps; parse/inline are nested inside collection,
  // and provenance families/components are nested inside their parent timings.
  // Calibration and the cold-run measurements live in cli-progress-bar.result.md.
  const steps: Record<string, [number, number]> = {
    'phase:config': [0, 2], 'phase:discover': [0, 2], 'phase:source-files': [0, 2],
    'phase:parse': [2, 19], 'phase:collect': [19, 27],
    'phase:load': [27, 39], 'phase:compile': [27, 39],
    'phase:stylesheets': [39, 64], 'phase:declarations': [64, 65], 'phase:decisions': [64, 65],
    'phase:provenance': [65, 65], 'rule:existence/dead-var': [65, 67],
    'rule:provenance': [67, 81], 'rule:dead': [81, 83],
    'phase:components': [83, 93], 'rule:ownership': [93, 98],
    'phase:habits': [98, 99], 'phase:ledger': [99, 99],
  };
  const number = (value: number) => value.toLocaleString('en-US');
  const clean = (value: string) => value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  const truncate = (value: string, budget: number) => {
    let result = '', width = 0;
    for (const character of clean(value)) {
      const code = character.codePointAt(0)!;
      const cells = /[\p{Mark}\p{Cf}]/u.test(character) ? 0 :
        /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6\p{Extended_Pictographic}]/u.test(character) || code >= 0x20000 && code <= 0x3fffd ? 2 : 1;
      if (width + cells > budget) break;
      result += character; width += cells;
    }
    return result;
  };
  const clear = () => { if (visible) writeSync(2, '\r\x1b[2K'); visible = false; previous = ''; };
  const render = (force = false) => {
    if (!Atomics.load(active, 0)) return;
    const elapsed = Date.now() - options.started;
    if (elapsed < options.delay) return;
    if (!force && Date.now() - lastDraw < 70) return;
    if (options.cold && !noticed && elapsed >= options.cacheDelay) {
      clear();
      writeSync(2, `First run builds a cache in ${clean(options.cache)}; later runs are faster.\n`);
      noticed = true;
    }
    const suffix = elapsed >= 3_000 ? ` ${options.unicode ? '·' : '|'} ${Math.floor(elapsed / 1_000)}s` : '';
    // Reserve the last column: terminals may wrap as soon as it is filled.
    const budget = Math.max(0, options.columns - 1);
    const percentage = `${percent}%`.padStart(4);
    const barWidth = Math.min(36, Math.max(24, Math.floor(options.columns * .3)), Math.max(0, budget - 6));
    const filled = Math.floor(barWidth * percent / 100);
    const bar = (options.unicode ? '━' : '#').repeat(filled) + (options.unicode ? '─' : '-').repeat(barWidth - filled);
    const prefix = `${bar}  ${percentage}`;
    const label = truncate(text, Math.max(0, budget - prefix.length - suffix.length - 2));
    const line = truncate(prefix + (label ? `  ${label}${suffix}` : ''), budget);
    if (line === previous) return;
    writeSync(2, `\r\x1b[2K${options.color ? '\x1b[2m' : ''}${line}${options.color ? '\x1b[0m' : ''}`);
    visible = true; previous = line; lastDraw = Date.now();
  };
  parentPort!.on('message', (message: Progress & { stop?: boolean; complete?: boolean; columns?: number }) => {
    if (message.stop) {
      // Only a successful operation (including reports with findings) earns 100.
      // Short runs still respect the delay. Errors and Ctrl+C never claim success.
      clearInterval(timer);
      if (message.complete) { percent = 100; text = 'Done'; render(true); }
      clear(); parentPort!.close(); return;
    }
    if (message.columns !== undefined) options.columns = message.columns;
    // Config/preset loading can reuse collectors before analysis reaches them.
    // Only the pipeline's explicit step entry activates that step's counters.
    if (message.current !== undefined && message.phase !== activePhase) return;
    if (message.current === undefined && message.phase) activePhase = message.phase;
    const step = steps[message.phase];
    if (step) {
      const fraction = message.current === undefined || message.total === undefined ? 0 :
        message.total === 0 ? 1 : Math.min(1, Math.max(0, message.current / message.total));
      // Entering a later step grants every preceding (possibly cached) step.
      // Nested CLI checks may restart phases; the outer operation never regresses.
      percent = Math.max(percent, Math.min(99, Math.floor(step[0] + (step[1] - step[0]) * fraction)));
    }
    switch (message.phase) {
      case 'phase:config': case 'phase:discover': case 'phase:source-files':
        text = message.files === undefined ? 'Reading your project' : `Reading your project: ${count(message.files, 'file')}`;
        if (message.cached) { percent = Math.max(percent, 99); text = 'Reading cached report'; }
        break;
      case 'phase:parse': case 'phase:collect':
        text = message.current === undefined ? 'Reading styles' : `Reading styles: ${number(message.current)} of ${count(message.files!, 'file')}`; break;
      case 'phase:load': case 'phase:compile':
        text = message.entry ? `Compiling Tailwind from ${relative(options.root, message.entry)}` : 'Reading styles'; break;
      case 'phase:stylesheets':
        text = message.current === undefined ? 'Reading stylesheets' : `Reading stylesheets: ${number(message.current)} of ${count(message.total!, 'stylesheet')}`; break;
      case 'phase:declarations': case 'phase:decisions':
        text = 'Reading styles'; break;
      case 'phase:provenance':
        text = `Checking ${count(message.declarations!, 'value')} against your tokens`; break;
      case 'rule:provenance':
        text = message.current === undefined ? 'Checking values against your tokens' : `Checking tokens: ${message.current} of ${count(message.total!, 'rule family', 'rule families')}`; break;
      case 'phase:components':
        text = message.current === undefined ? 'Matching components' : `Matching components: ${number(message.current)} of ${count(message.total!, 'file')}`; break;
      case 'rule:ownership':
        text = message.current === undefined ? 'Checking component styles' : `Checking component styles: ${number(message.current)} of ${count(message.total!, 'value')}`; break;
      case 'rule:dead': text = 'Checking unused tokens'; break;
      case 'phase:habits': text = 'Checking habits and component copies'; break;
      case 'phase:ledger': text = 'Checking ledger'; break;
    }
    render();
  });
  const timer = setInterval(render, 70);
}

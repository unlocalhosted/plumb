// Shared plumbing for the locate bench: paths, child processes that die with their whole tree, and the numbers.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(here, '../..');
// Where the bench builds the projects it measures. It must be a folder React Plumber calls yours, or nothing in it is
// stamped or tracked and the bench judges nothing: inside the repository, not git-ignored, and not under a dotted
// folder of the project itself. bench/locate/.work was git-ignored, which 0.4.0's own rule reads as generated; the
// test fixtures' folder is where every other throwaway project already lives.
export const workRoot = join(repo, 'fixtures', '.bench-locate');

// The checkout that holds node_modules for this tree (a worktree links it from the main checkout).
export function nodeModulesHome() {
  return dirname(realpathSync(join(repo, 'node_modules')));
}
export const commonAncestor = (...paths) => {
  const parts = paths.map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
};
// The main checkout of a worktree, where uncommitted showcase screens may still live.
export function mainCheckout() {
  try {
    const common = execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
    return dirname(common);
  } catch { return repo; }
}
export const gitHead = () => {
  try { return execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; }
};

// The share of memory the system says is free. Swap used is no guide on macOS: pages swapped out hours ago stay
// counted long after memory frees up. Below 20% a host plus Chrome starts swapping.
export function freeMemoryPercent() {
  if (process.platform !== 'darwin') return 100;
  try {
    const text = execFileSync('memory_pressure', ['-Q'], { encoding: 'utf8' });
    const free = /free percentage: (\d+)%/.exec(text);
    return free ? Number(free[1]) : 100;
  } catch { return 100; }
}

export const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;

// Starts a host as its own process group on port 0 and returns { url, stop, logs }. stop() kills the whole tree.
// `ready(logs)` returns the origin once the host is up; a child may also send { type: 'listening', origin } over IPC.
export async function spawnHost({ file, args = [], execArgv = [], command, commandArgs, cwd, env = {}, ready, timeoutMs = 180_000, label }) {
  const merged = { ...process.env, ...env };
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key]; // undefined removes a variable
  const child = spawn(command ?? process.execPath, command ? commandArgs : [...execArgv, file, ...args], {
    cwd, env: merged, detached: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let logs = '';
  const exited = new Promise((done) => child.once('exit', (code, signal) => done({ code, signal })));
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { logs = (logs + chunk).slice(-32_000); });
  let ipcOrigin = null;
  child.on('message', (event) => {
    if (event?.type === 'listening') ipcOrigin = event.origin;
    if (event?.type === 'error') logs += '\n' + event.error;
  });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const group = (signal) => { try { process.kill(-child.pid, signal); } catch { /* already gone */ } };
    group('SIGTERM');
    await Promise.race([exited, delay(8_000)]);
    group('SIGKILL');
    await Promise.race([exited, delay(3_000)]);
  };
  const started = performance.now();
  try {
    for (;;) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label ?? 'host'} exited (${child.exitCode ?? child.signalCode}):\n${logs}`);
      const origin = ipcOrigin ?? ready?.(logs);
      if (origin) return { url: origin, child, stop, logs: () => logs, startMs: performance.now() - started };
      if (performance.now() - started > timeoutMs) throw new Error(`${label ?? 'host'} did not start in ${timeoutMs} ms:\n${logs}`);
      await delay(50);
    }
  } catch (error) { await stop(); throw error; }
}

export function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const at = (p) => (sorted.length ? Number(sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)].toFixed(1)) : null);
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: at(1) };
}
export const pct = (part, whole) => (whole ? Number(((100 * part) / whole).toFixed(1)) : null);
export const exists = existsSync;

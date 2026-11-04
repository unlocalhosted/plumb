// `plumber` with nothing after it, the way a newcomer runs it: a real CLI process whose browser opener is a script that
// records the address (nothing opens), and PLUMBER_TERMINAL=1 standing in for a terminal on stdout.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
export const cli = join(repo, 'dist/cli.js');
export const strip = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replaceAll('\r', '');

/** A scratch folder with an opener script in it; `opened()` says what address the command asked the browser to open. */
export async function opener(t) {
  const dir = await mkdtemp(join(tmpdir(), 'plumber-opener-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = join(dir, 'open.sh'), record = join(dir, 'opened.txt');
  await writeFile(script, `#!/bin/sh\necho "$1" > '${record}'\n`); await chmod(script, 0o755);
  // the script runs a moment after the command says it opened, so look for a short while
  const opened = async (wait = 3000) => { for (const end = Date.now() + wait; ; await new Promise(done => setTimeout(done, 50))) { const text = await readFile(record, 'utf8').then(x => x.trim(), () => null); if (text || Date.now() > end) return text; } };
  return { script, opened };
}

export function env(extra = {}) {
  // the test machine's own CI and colour settings are not the test's: only what the test names is set
  const base = { ...process.env };
  delete base.CI; delete base.NO_COLOR;
  return { ...base, ...extra };
}

/** Start `plumber <args>` and wait until its output says `ready`; `stop()` presses Ctrl+C and returns what it printed and its exit code. */
export async function start(t, args, extra = {}, ready = 'Press Ctrl+C') {
  const child = spawn(process.execPath, [cli, ...args], { env: env(extra), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
  const exited = new Promise(done => child.once('exit', code => done(code)));
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  const deadline = Date.now() + 90_000;
  while (!out.includes(ready) && child.exitCode === null && Date.now() < deadline) await new Promise(done => setTimeout(done, 100));
  assert.ok(out.includes(ready), `did not get to "${ready}":\n${out}\n${err}`);
  return { output: () => strip(out), errors: () => err, async stop() { child.kill('SIGINT'); const code = await exited; return { code, stdout: strip(out), stderr: err }; } };
}

/** A plain run to completion. */
export function run(args, extra = {}, input, cwd) {
  const result = spawnSync(process.execPath, [cli, ...args], { ...(cwd ? { cwd } : {}), encoding: 'utf8', env: env(extra), timeout: 90_000, maxBuffer: 64 * 1024 * 1024, ...(input === undefined ? {} : { input }) });
  return { code: result.status, stdout: strip(result.stdout), stderr: strip(result.stderr) };
}
